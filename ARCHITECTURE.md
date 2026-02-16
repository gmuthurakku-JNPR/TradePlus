# ARCHITECTURE.md

**TradePulse Architecture Documentation**  
**Version:** 1.0  
**Date:** February 15, 2026  
**Status:** Implementation Ready

---

## 1. Layered Architecture Overview

TradePulse follows a **Clean Architecture** with strict separation of concerns across four layers:

### 1.1 Presentation Layer
- **Responsibility**: Render UI to users, handle user interactions, display real-time data.
- **Components**: React components, pages, charts, feature modules.
- **Technology**: React 18+, TypeScript, CSS Modules, SVG.
- **State**: Mostly local component state; subscription to engine state via custom hooks.
- **Constraints**: Must be stateless where possible; pull data from engines, not push.

### 1.2 Application Layer
- **Responsibility**: Orchestrate business flows, manage feature state, bridge presentation and domain.
- **Components**: Feature logic, state management (Context + useReducer), hooks.
- **Technology**: React Context, custom hooks, reducers.
- **State**: UI state (selected ticker, form inputs, visibility flags); persisted to localStorage.
- **Constraints**: Cannot directly access localStorage; must use persistence layer via engines.

### 1.3 Domain Layer (Engines)
- **Responsibility**: Implement business rules, price simulation, trade execution, order matching.
- **Components**: PriceEngine, TradeEngine, OrderEngine, validators, commands.
- **Technology**: Functional modules with closures; Geometric Brownian Motion for prices.
- **State**: Module-level variables (prices, portfolio, orders); single source of truth.
- **Constraints**: No React imports; pure business logic; synchronized execution.

### 1.4 Infrastructure Layer
- **Responsibility**: Persist data, handle migrations, provide external integrations.
- **Components**: StorageService, MigrationService, schema definitions.
- **Technology**: localStorage (fallback: IndexedDB), JSON serialization.
- **State**: Serialized data objects; never in memory unless loaded by engines.
- **Constraints**: Must handle quota exceeded, corruption, version mismatches gracefully.

---

## 2. Engine-Driven Architecture: Core Design

TradePulse is powered by three functional module engines that implement event-driven, callback-based communication without importing each other directly.

### 2.1 The Three Engines

**PriceEngine (Singleton Functional Module)**
- Simulates realistic price movements for multiple symbols using Geometric Brownian Motion (GBM).
- Maintains subscription map for real-time price distribution.
- Runs on a configurable interval (default 1 second).
- Module-level state: `prices` Map, `history` Map (windowed to 500 points per symbol), `subscribers` Map.
- All operations are synchronous; subscriptions are callbacks.
- **Guarantees**: Single source of truth for all price data; atomic updates; no race conditions.

**TradeEngine (Synchronous Functional Module)**
- Executes market and limit trades with validator chain and throttle protection.
- Updates portfolio (balance + positions) atomically in a single synchronous call.
- Enforces execution flag to prevent concurrent trades (mutex-like).
- Module-level state: `isExecuting` flag, throttle timestamps.
- **Guarantees**: All balance + position updates are atomic; throttle prevents rapid-fire trades.

**OrderEngine (Event-Driven Functional Module)**
- Manages limit orders and auto-executes when price triggers are met.
- Subscribes to PriceEngine for ticks; calls injected TradeEngine callback to execute.
- Maintains order queue (FIFO) and open order list.
- **Guarantees**: Limit orders execute atomically; no lost orders; deterministic matching.

### 2.2 Why Functional Modules, Not Classes?

| Aspect | Functional Module | Class |
|--------|-------------------|-------|
| Tree-shaking | ✅ Excellent | ❌ Classes included in bundle |
| React Hook Compatibility | ✅ Natural closures | ❌ `this` binding issues |
| Testing | ✅ Easy mocking | ❌ Requires mock classes |
| State Encapsulation | ✅ Closures capture state | ⚠️ `this` context confusion |
| Bundle Size | ✅ Smaller | ❌ Class boilerplate |

**Example Functional Module:**
```typescript
// engines/PriceEngine.ts
let subscribers: Map<string, Set<(price: PriceData) => void>> = new Map();
let prices: Map<string, PriceData> = new Map();
let history: Map<string, PricePoint[]> = new Map();
let updateInterval: NodeJS.Timer | null = null;

export const subscribe = (symbol: string, callback: (price: PriceData) => void): (() => void) => {
  if (!subscribers.has(symbol)) subscribers.set(symbol, new Set());
  subscribers.get(symbol)!.add(callback);
  
  return () => {
    subscribers.get(symbol)?.delete(callback);
    if (subscribers.get(symbol)?.size === 0) subscribers.delete(symbol);
  };
};

export const getPrice = (symbol: string): PriceData | undefined => prices.get(symbol);

export const start = (): void => {
  if (updateInterval) return;
  updateInterval = setInterval(() => {
    // Tick all prices
    for (const [symbol, price] of prices.entries()) {
      const newPrice = generateNextPrice(price);
      prices.set(symbol, newPrice);
      // Update history (window to 500 points)
      const hist = history.get(symbol) || [];
      hist.push({ price: newPrice.price, timestamp: Date.now() });
      if (hist.length > 500) hist.shift();
      history.set(symbol, hist);
    }
    notifyAll();
  }, 1000);
};

const notifyAll = (): void => {
  for (const [symbol, callbacks] of subscribers.entries()) {
    const price = prices.get(symbol);
    if (price) callbacks.forEach(cb => cb(price));
  }
};
```

### 2.3 Callback-Based Communication (NO Circular Dependencies)

```

  PriceEngine.ts (Module-level)
  ┌────────────────────────┐
  │ export subscribe()     │
  │ export getPrice()      │
  └────────┬───────────────┘
           │
           │ Callbacks (no imports!)
           │
    ┌──────┴──────────────┬──────────────┐
    │                     │              │
    ▼                     ▼              ▼
  OrderEngine          ChartHook      PriceContext
  (Subscriber)     (Subscriber)    (Subscriber)
    │                     │              │
    │ Has injected        └──────────────┴────────┐
    │ TradeEngine callback                        │
    │                                              │
    └──────────────────────────────────────────────┤
                                                   ▼
                                            TradeEngine.ts
                                            ┌──────────────┐
                                            │ export      │
                                            │ executeTrade│
                                            └──────────────┘

NO CIRCULAR DEPENDENCIES: Each engine exposes pure functions or subscriptions.
OrderEngine receives TradeEngine.executeTrade as a callback, not an import.

```

### 2.4 Subscription Cleanup & Memory Leak Prevention

```typescript
// Feature component subscribes via hook
const ChartComponent = () => {
  const [price, setPrice] = useState<PriceData | null>(null);
  
  useEffect(() => {
    // Subscribe to PriceEngine
    const unsubscribe = priceEngine.subscribe('BTC', (latestPrice) => {
      setPrice(latestPrice);
    });
    
    // Cleanup: called on unmount or ticker change
    return () => unsubscribe();
  }, ['BTC']); // Re-subscribe if ticker changes
  
  return <div>{price?.price}</div>;
};
```

**Guarantees**:
- React calls cleanup when component unmounts → unsubscribe called.
- React calls cleanup before re-subscribing if dependency changes → old subscription removed first.
- Zero memory leaks if cleanup is wired correctly.

---

## 3. Complete System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TRADEPULSE SYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                            PRESENTATION LAYER                                     │   │
│  │                          (React Components & Pages)                               │   │
│  │                                                                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │   │
│  │  │  Watchlist   │  │   Chart      │  │  Order Form  │  │  Portfolio   │         │   │
│  │  │  Component   │  │  Component   │  │  Component   │  │  Component   │         │   │
│  │  └────┬─────────┘  └────┬─────────┘  └────┬─────────┘  └────┬─────────┘         │   │
│  │       │                 │                 │                 │                    │   │
│  │       │ usePrice()      │ useChart()      │ useTrade()      │ usePortfolio()     │   │
│  │       │ hook            │ hook            │ hook            │ hook               │   │
│  │       │                 │                 │                 │                    │   │
│  └───────┼─────────────────┼─────────────────┼─────────────────┼────────────────────┘   │
│          │                 │                 │                 │                        │
└──────────┼─────────────────┼─────────────────┼─────────────────┼────────────────────────┘
           │                 │                 │                 │
           │ Subscribe       │ Subscribe       │ Dispatch        │ Subscribe
           │ to price        │ to chart data   │ trade action    │ to portfolio
           │                 │                 │                 │
┌──────────┼─────────────────┼─────────────────┼─────────────────┼────────────────────────┐
│          ▼                 ▼                 ▼                 ▼                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                        APPLICATION LAYER (React Context)                         │   │
│  │                       State Management & Feature Hooks                           │   │
│  │                                                                                   │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │   │
│  │  │ PriceContext     │  │ PortfolioContext │  │ OrderContext     │              │   │
│  │  │ (UI State)       │  │ (UI State)       │  │ (UI State)       │              │   │
│  │  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘              │   │
│  │           │                     │                     │                         │   │
│  │           │ dispatch()          │ dispatch()          │ dispatch()              │   │
│  │           │                     │                     │                         │   │
│  │  ┌────────┴─────────────────────┴─────────────────────┴───────────────────┐    │   │
│  │  │                                                                          │    │   │
│  │  │  Reducers (Feature-Specific Business Logic)                             │    │   │
│  │  │  • priceReducer: Handle price subscription updates                     │    │   │
│  │  │  • portfolioReducer: Calculate positions, P&L, balance updates         │    │   │
│  │  │  • orderReducer: Track open orders, order history                      │    │   │
│  │  │  • tradeReducer: Append executed trades, update history                │    │   │
│  │  │                                                                          │    │   │
│  │  └──────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                   │   │
│  └───────────────────────────────┬────────────────────────────────────────────────────┘   │
│                                  │                                                       │
└──────────────────────────────────┼───────────────────────────────────────────────────────┘
                                   │
                     Engines feed data via callbacks
                                   │
┌──────────────────────────────────┼───────────────────────────────────────────────────────┐
│                                  ▼                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                          DOMAIN LAYER (Engines)                                  │   │
│  │                    Business Logic & State Management                             │   │
│  │                                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │                          PRICE ENGINE                                   │    │   │
│  │  │                    (Singleton, Pub/Sub Model)                           │    │   │
│  │  │                                                                          │    │   │
│  │  │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐   │    │   │
│  │  │  │ GBM Simulator   │  │ History Manager  │  │ Subscription Map    │   │    │   │
│  │  │  │ (Per Symbol)    │  │ (500-point max)  │  │ (Callback Registry) │   │    │   │
│  │  │  └────────┬────────┘  └────────┬─────────┘  └────────┬────────────┘   │    │   │
│  │  │           │                    │                     │                │    │   │
│  │  │  State: prices Map ◄───────────┴─────────────────────┤                │    │   │
│  │  │           │                                          │                │    │   │
│  │  │  Every 1s: Tick → Update → Notify All Subscribers   │                │    │   │
│  │  │                                                      │                │    │   │
│  │  │  subscribe(symbol, callback) → returns unsubscribe  │                │    │   │
│  │  │                                                      │                │    │   │
│  │  └──────────────────────────────────────────────────────┼────────────────┘    │   │
│  │                                                          │                    │   │
│  │  ┌─────────────────────────────────────────────────────┴────────────────┐    │   │
│  │  │                      TRADE ENGINE                                    │    │   │
│  │  │            (Synchronous, Command Pattern)                           │    │   │
│  │  │                                                                      │    │   │
│  │  │  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐  │    │   │
│  │  │  │ Validator Chain │  │ Execution    │  │ Throttle Guard       │  │    │   │
│  │  │  │ (Funds/Shares)  │  │ Flag (Mutex) │  │ (1s between trades)  │  │    │   │
│  │  │  └────────┬────────┘  └──────┬───────┘  └──────────┬───────────┘  │    │   │
│  │  │           │                  │                     │               │    │   │
│  │  │  State: isExecuting flag, lastTradeTime           │               │    │   │
│  │  │           │                                        │               │    │   │
│  │  │  executeTrade(request) → {                        │               │    │   │
│  │  │    if (isExecuting) throw Error                   │               │    │   │
│  │  │    isExecuting = true                             │               │    │   │
│  │  │    Update balance atomically                      │               │    │   │
│  │  │    Update positions atomically                    │               │    │   │
│  │  │    Record trade (success or failed)               │               │    │   │
│  │  │    Persist to localStorage                        │               │    │   │
│  │  │    isExecuting = false                            │               │    │   │
│  │  │    Notify portfolio subscribers                   │               │    │   │
│  │  │  }                                                 │               │    │   │
│  │  │                                                    │               │    │   │
│  │  └────────────────────────────────────────────────────┼───────────────┘    │   │
│  │                                                       │                    │   │
│  │  ┌────────────────────────────────────────────────────┴─────────────────┐  │   │
│  │  │                     ORDER ENGINE                                     │  │   │
│  │  │          (Event-Driven, Pub/Sub to PriceEngine)                     │  │   │
│  │  │                                                                      │  │   │
│  │  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │  │   │
│  │  │  │ Order Queue      │  │ Price Watcher    │  │ Match Logic      │  │  │   │
│  │  │  │ (FIFO List)      │  │ (Subscribers)    │  │ (Trigger + Exec) │  │  │   │
│  │  │  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │  │   │
│  │  │           │                     │                     │            │  │   │
│  │  │  State: openOrders List                            │            │  │   │
│  │  │           │                                        │            │  │   │
│  │  │  Subscribe to PriceEngine for 'BTC', 'ETH', ...  │            │  │   │
│  │  │  On price tick: Check if any orders should exec  │            │  │   │
│  │  │  If match: Call injected tradeEngine.executeTrade │            │  │   │
│  │  │                                                    │            │  │   │
│  │  └────────────────────────────────────────────────────┼────────────┘  │   │
│  │                                                       │                │   │
│  └───────────────────────────────────────────────────────┼────────────────┘   │
│                                                          │                    │
└──────────────────────────────────────────────────────────┼────────────────────┘
                                                           │
                          Engines load/save via StorageService
                                                           │
┌──────────────────────────────────────────────────────────┼────────────────────┐
│                                                          ▼                    │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                      INFRASTRUCTURE LAYER                                 │ │
│  │                  (Persistence & Data Management)                          │ │
│  │                                                                            │ │
│  │  ┌────────────────────────┐  ┌────────────────────────┐                  │ │
│  │  │   StorageService       │  │   MigrationService     │                  │ │
│  │  │  ┌──────────────────┐  │  │  ┌──────────────────┐  │                  │ │
│  │  │  │ localStorage.get │  │  │  │ Validate schema  │  │                  │ │
│  │  │  │ localStorage.set │  │  │  │ Apply migrations │  │                  │ │
│  │  │  │ Try/catch errors │  │  │  │ Set defaults     │  │                  │ │
│  │  │  └──────────────────┘  │  │  └──────────────────┘  │                  │ │
│  │  │                        │  │                        │                  │ │
│  │  │  On write failure:     │  │  On load:              │                  │ │
│  │  │  • Log error           │  │  • Validate data      │                  │ │
│  │  │  • Show user toast     │  │  • Migrate if v < 1.0 │                  │ │
│  │  │  • Continue in memory  │  │  • Set defaults       │                  │ │
│  │  │                        │  │  • Notify engines     │                  │ │
│  │  └────────────────────────┘  └────────────────────────┘                  │ │
│  │                                                                            │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐  │ │
│  │  │                      StorageSchema                                 │  │ │
│  │  │  (localStorage keys & serialized data structure)                  │  │ │
│  │  │                                                                     │  │ │
│  │  │  tradepulse_version: "1.0.0"                                      │  │ │
│  │  │  tradepulse_portfolio: { cash: 100000, positions: [...] }         │  │ │
│  │  │  tradepulse_trades: [{ id, symbol, type, qty, price, ... }]       │  │ │
│  │  │  tradepulse_orders: [{ id, symbol, limit, qty, status }]          │  │ │
│  │  │  tradepulse_watchlist: ["BTC", "ETH", "SOL"]                      │  │ │
│  │  │  tradepulse_preferences: { theme: "dark", currency: "USD" }       │  │ │
│  │  │                                                                     │  │ │
│  │  └────────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘

KEY FLOWS:

1. PRICE UPDATE FLOW (Every 1 second)
   PriceEngine.tick() 
   → update prices Map 
   → notify all subscribers 
   → React hooks receive callback 
   → setPrice(latestPrice) 
   → component re-renders 
   → Chart updates

2. TRADE EXECUTION FLOW (User clicks "Buy BTC")
   User clicks button 
   → useTrade hook calls tradeEngine.executeTrade({ symbol: 'BTC', ... })
   → Validation chain checks balance + shares
   → Update balance: cash -= total
   → Update position: shares += qty, avgCost = WAC
   → Record trade to history
   → StorageService.persist()
   → Notify portfolioContext subscribers
   → React re-renders Portfolio component

3. LIMIT ORDER FILL FLOW (Limit order waiting to trigger)
   OrderEngine subscribes to PriceEngine for 'BTC'
   → On priceEngine.notify(): Check if any open orders match
   → If BTC price <= limit price:
     → Call injected tradeEngine.executeTrade()
     → Same as trade execution flow
     → Remove order from openOrders list
     → Emit order event

4. PERSISTENCE FLOW (On app boot)
   App mounts 
   → useEffect() calls initializeApp()
   → StorageService.load()
   → MigrationService.validate() + migrate()
   → TradeEngine loads portfolio state
   → OrderEngine loads open orders
   → PriceEngine initializes (no persistence needed)
   → React renders with hydrated data

```

---

## 4. Deep Chart Rendering Logic

### 4.1 Data Transformation Pipeline

```typescript
// Price data → Chart data transformation pipeline

// Raw price data from PriceEngine
interface PriceData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

// Step 1: Slice to rolling window (last 500 points)
const windowedData = priceHistory.slice(-500);

// Step 2: Aggregate to timeframe if needed (e.g., 1-minute candles)
// For now, we plot every tick (highest resolution)
const chartPoints = windowedData.map((p, i) => ({
  x: i,                          // Index (pixel mapping)
  price: p.price,                // Y-value
  timestamp: p.timestamp,        // For tooltip
  open: p.price,                 // For candlestick
  high: p.high,
  low: p.low,
  close: p.price,
  volume: 1,                     // Mock: 1 unit per tick
}));

// Step 3: Calculate domain (for scaling)
const minPrice = Math.min(...chartPoints.map(p => p.low));
const maxPrice = Math.max(...chartPoints.map(p => p.high));
const range = maxPrice - minPrice || 1;  // Prevent division by zero

// Step 4: Calculate scales
const xScale = (index: number) => (index / (chartPoints.length - 1)) * 800;  // 800px width
const yScale = (price: number) => 400 - ((price - minPrice) / range) * 400;  // 400px height, inverted
```

### 4.2 Scaling Math & Mapping Formulas

**Linear Scale Translation:**
$$x_{\text{pixel}} = \frac{\text{index}}{n-1} \times \text{chartWidth}$$

$$y_{\text{pixel}} = \text{chartHeight} - \left(\frac{\text{price} - \text{minPrice}}{\text{maxPrice} - \text{minPrice}}\right) \times \text{chartHeight}$$

**SVG Path Generation with array.join() optimization:**
```typescript
// ❌ SLOW: String concatenation (O(n²))
let pathD = '';
chartPoints.forEach((p, i) => {
  pathD += i === 0 ? `M ${xScale(i)} ${yScale(p.price)}` : ` L ${xScale(i)} ${yScale(p.price)}`;
});

// ✅ FAST: Array join (O(n))
const commands = chartPoints.map((p, i) => 
  `${i === 0 ? 'M' : 'L'} ${Math.round(xScale(i))} ${Math.round(yScale(p.price))}`
);
const pathD = commands.join(' ');
```

### 4.3 Fixed SVG ViewBox for Responsive Charts

```typescript
// src/features/chart/components/Chart.tsx

export const Chart: React.FC<ChartProps> = ({ symbol, priceHistory }) => {
  // Fixed viewBox (800x400) - consistent coordinate system
  // Chart scales responsively via CSS width/height
  
  const pathD = useMemo(() => {
    return generateSVGPath(priceHistory);
  }, [priceHistory]);
  
  return (
    <svg 
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Grid lines */}
      <line x1="0" y1="100" x2="800" y2="100" stroke="#ddd" strokeDasharray="5,5" />
      <line x1="0" y1="200" x2="800" y2="200" stroke="#ddd" strokeDasharray="5,5" />
      <line x1="0" y1="300" x2="800" y2="300" stroke="#ddd" strokeDasharray="5,5" />
      
      {/* Price line */}
      <path d={pathD} stroke="#2563eb" strokeWidth="2" fill="none" />
      
      {/* Interactive elements */}
      <Crosshair {...crosshairProps} />
      <PriceAxis minPrice={minPrice} maxPrice={maxPrice} />
      <TimeAxis timestamps={timeseries} />
    </svg>
  );
};

// CSS handles responsive scaling
// .chart-container { width: 100%; height: 400px; }
// SVG viewBox remains 800x400, but rendered at actual container size
```

### 4.4 Memoized Chart Rendering

```typescript
// Prevent unnecessary recalculations on unrelated re-renders

export const useChartData = (symbol: string, priceHistory: PriceData[]) => {
  return useMemo(() => {
    const windowed = priceHistory.slice(-500);
    const minPrice = Math.min(...windowed.map(p => p.low));
    const maxPrice = Math.max(...windowed.map(p => p.high));
    
    return {
      data: windowed,
      domain: { min: minPrice, max: maxPrice },
      count: windowed.length,
    };
  }, [symbol, priceHistory.length]); // Only recompute when data changes
};

export const Chart = ({ symbol, priceHistory }: ChartProps) => {
  const { data, domain } = useChartData(symbol, priceHistory);
  
  // pathD only recalculates when useChartData output changes
  const pathD = useMemo(() => {
    return generatePath(data, domain);
  }, [data, domain]);
  
  return <svg>{/* rendered path */}</svg>;
};
```

---

## 5. Incremental Rendering & Performance Optimizations

### 5.1 Rolling Window Strategy

```typescript
// Chart maintains only last 500 price points per symbol
// Older data is discarded to prevent memory bloat and slow renders

interface PriceEngine {
  private history: Map<string, PricePoint[]> = new Map(); // [price, timestamp]
  
  private tick(): void {
    // For each symbol, slide window
    for (const [symbol, hist] of this.history) {
      hist.push({ price: newPrice, timestamp: now });
      
      // Window constraint: Keep only last 500
      if (hist.length > 500) {
        hist.shift();  // Discard oldest
      }
    }
  }
}

// At 1 tick/second, 500 points = ~8 minutes of history
// Easy to sweep with useMemo, zero virtualization needed
```

### 5.2 No requestAnimationFrame at 1 Hz

```typescript
// requestAnimationFrame is for 60fps animations
// At 1Hz (1 price update/second), RAF adds unnecessary complexity

// ❌ Over-engineered
export const ChartWithRAF = () => {
  const [rafId, setRafId] = useState<number | null>(null);
  
  useEffect(() => {
    const animate = () => {
      setData(/* ... */);
      setRafId(requestAnimationFrame(animate));
    };
    setRafId(requestAnimationFrame(animate));
    return () => rafId && cancelAnimationFrame(rafId);
  }, []);
};

// ✅ Direct state updates (sufficient for 1 Hz)
export const Chart = ({ priceHistory }) => {
  const [pathD, setPathD] = useState('');
  
  useEffect(() => {
    // PriceEngine callback fires every 1s
    const unsubscribe = priceEngine.subscribe(symbol, (price) => {
      setPathD(generatePath([...priceHistory, price]));
    });
    return () => unsubscribe();
  }, []);
};
```

### 5.3 Memoization Strategy

```typescript
// useMemo prevents recalculation on unrelated re-renders

const Chart = ({ symbol, priceHistory, selectedTicker, theme }) => {
  // Recalculate ONLY when priceHistory or symbol changes
  // Ignore theme, selectedTicker changes
  const pathD = useMemo(() => {
    console.log('Recalculating SVG path...');
    return generateSVGPath(priceHistory);
  }, [priceHistory, symbol]); // Dependency array is critical
  
  // Effect: When theme changes, Chart re-renders BUT pathD not recalculated
  return <svg d={pathD} style={{ fill: theme === 'dark' ? '#fff' : '#000' }} />;
};
```

### 5.4 Component Isolation with React.memo

```typescript
// Watchlist renders many ticker rows; each should only re-render if ITS data changes

// ❌ Without memo: Parent renders → all rows re-render
const Watchlist = ({ tickers }) => {
  return (
    <div>
      {tickers.map(ticker => (
        <WatchlistItem key={ticker} symbol={ticker} />
      ))}
    </div>
  );
};

const WatchlistItem = ({ symbol }) => {
  console.log(`Rendering ${symbol}`);
  const price = usePrice(symbol);
  return <div>{symbol}: {price}</div>;
};
// Output when BTC price updates:
// Rendering BTC
// Rendering ETH (unnecessary!)
// Rendering SOL (unnecessary!)

// ✅ With memo: Only subscribed ticker re-renders
const WatchlistItem = React.memo(({ symbol }) => {
  const price = usePrice(symbol);
  return <div>{symbol}: {price}</div>;
});
// Output when BTC price updates:
// Rendering BTC (only this!)
```

---

## 6. State Management Architecture

### 6.1 Hybrid State Model

**Engine State (Module-Level, Source of Truth)**
```typescript
// engines/TradeEngine.ts
let portfolio: Portfolio = { cash: 100000, positions: {} };
let balance: number = 100000;
let isExecuting: boolean = false;

// UI never directly mutates this; only through executeTrade()
```

**React State (UI Derived, Ephemeral)**
```typescript
// features/portfolio/PortfolioProvider.tsx
const PortfolioProvider = ({ children }) => {
  const [uiPortfolio, dispatch] = useReducer(portfolioReducer, initialState);
  
  // Initialize from engine state
  useEffect(() => {
    const initialPortfolio = tradeEngine.getPortfolio();
    dispatch({ type: 'PORTFOLIO_LOAD', payload: initialPortfolio });
  }, []);
  
  // Sync: When engine state changes, update UI state
  useEffect(() => {
    const unsubscribe = tradeEngine.onPortfolioChange((newPortfolio) => {
      dispatch({ type: 'PORTFOLIO_UPDATED', payload: newPortfolio });
    });
    return () => unsubscribe();
  }, []);
  
  return (
    <PortfolioContext.Provider value={uiPortfolio}>
      {children}
    </PortfolioContext.Provider>
  );
};
```

### 6.2 State Synchronization Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STATE SYNCHRONIZATION FLOW                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Engine State (Source of Truth)                                    │
│  ├─ TradeEngine.portfolio: { cash, positions }                     │
│  ├─ PriceEngine.prices: Map<symbol, PriceData>                     │
│  └─ OrderEngine.openOrders: LimitOrder[]                           │
│                                                                     │
│         │                                                           │
│         │ Callback fired when engine state changes                 │
│         │                                                           │
│         ▼                                                           │
│  React Hook Receives Update                                        │
│  ├─ setSomething(newValue)                                         │
│  ├─ Updates React state                                            │
│  └─ Component re-renders with new data                             │
│                                                                     │
│         │                                                           │
│         │ React renders updated view                               │
│         │                                                           │
│         ▼                                                           │
│  UI Reflects Engine State                                          │
│  ├─ Watchlist shows latest prices                                  │
│  ├─ Portfolio shows up-to-date P&L                                 │
│  └─ Orders show status changes                                     │
│                                                                     │
│  IMPORTANT: React state is DERIVED and EPHEMERAL                   │
│  • React state is always a copy of engine state                    │
│  • Engine state is NEVER mutated from React; only via callbacks     │
│  • Refresh/reload: Engine loads from localStorage, syncs to React  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Custom Hooks Bridge Engine & React

```typescript
// hooks/usePrice.ts - Isolate component from engine
export const usePrice = (symbol: string): PriceData | null => {
  const [price, setPrice] = useState<PriceData | null>(null);
  
  useEffect(() => {
    // Subscribe to this symbol only
    const unsubscribe = priceEngine.subscribe(symbol, (newPrice) => {
      setPrice(newPrice);
    });
    return () => unsubscribe();
  }, [symbol]);
  
  return price;
};

// hooks/usePortfolio.ts - Subscribe to portfolio changes
export const usePortfolio = (): Portfolio => {
  const [portfolio, dispatch] = useReducer(portfolioReducer, initialPortfolioState);
  
  useEffect(() => {
    // Subscribe to trade engine changes
    return tradeEngine.onPortfolioChange((newPortfolio) => {
      dispatch({ type: 'PORTFOLIO_LOAD', payload: newPortfolio });
    });
  }, []);
  
  return portfolio;
};

// Component usage: Components know nothing about engines
const WatchlistItem = ({ symbol }) => {
  const price = usePrice(symbol); // Just use the hook
  return <div>{price?.price}</div>;
};
```

---

## 7. Trade Execution: Atomic Updates & Race Condition Prevention

### 7.1 Atomic Trade Execution

```typescript
// engines/TradeEngine.ts

let isExecuting: boolean = false;
let portfolio: Portfolio = { cash: 100000, positions: {} };

export const executeTrade = (request: TradeRequest): TradeResult => {
  // Mutex-like guard
  if (isExecuting) {
    throw new Error('Trade in progress. Try again in 1 second.');
  }
  
  try {
    isExecuting = true;  // ← Prevent concurrent execution
    
    // Atomic update: balance + position updated in same call
    const validation = validate(request, portfolio);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }
    
    const { type, symbol, quantity, price } = request;
    
    // ✅ ALL THESE HAPPEN TOGETHER: No partial updates
    const total = quantity * price;
    portfolio.cash -= total;                    // Update balance
    portfolio.positions[symbol] = {  // Update position
      shares: (portfolio.positions[symbol]?.shares || 0) + quantity,
      avgCost: calculateWAC(
        portfolio.positions[symbol]?.shares || 0,
        portfolio.positions[symbol]?.avgCost || price,
        quantity,
        price
      ),
    };
    
    // Record for history
    const trade: Trade = {
      id: crypto.randomUUID(),
      symbol,
      type,
      quantity,
      executedPrice: price,
      total,
      createdAt: Date.now(),
      executedAt: Date.now(),
      status: 'executed',
    };
    tradeHistory.push(trade);
    
    // Persist (with error handling)
    try {
      persistState();
    } catch (e) {
      console.error('Persistence failed, but trade executed in memory:', e);
      // Continue; next trade will retry persistence
    }
    
    // Notify subscribers
    notifyPortfolioSubscribers();
    
    return { success: true, trade };
    
  } finally {
    isExecuting = false;  // ← Always clear flag
  }
};
```

### 7.2 Throttle Prevention

```typescript
// Max 1 trade per second for user sanity

let lastTradeTime: number = 0;
const THROTTLE_MS = 1000;

export const canTrade = (): boolean => {
  return Date.now() - lastTradeTime >= THROTTLE_MS;
};

export const executeTrade = (request: TradeRequest): TradeResult => {
  if (!canTrade()) {
    const remaining = THROTTLE_MS - (Date.now() - lastTradeTime);
    return {
      success: false,
      error: `Trade throttled. Try again in ${remaining}ms.`,
    };
  }
  
  const result = /* ... execute ... */;
  if (result.success) {
    lastTradeTime = Date.now();
  }
  return result;
};
```

### 7.3 Limit Order Race Condition Prevention

```typescript
// OrderEngine checks prices against limits; must not conflict with manual trades

// The key insight: Everything is synchronous
// 1. Price update fires
// 2. OrderEngine checks limits (in OrderEngine's callback)
// 3. If match: calls executeTrade via injected callback
// 4. executeTrade acquires mutex (isExecuting = true)
// 5. Manual trade button click doesn't fire until mutex released
// 6. Result: NO race conditions

// orderEngine.ts
priceEngine.subscribe('BTC', (price) => {
  // This runs when BTC price updates
  openOrders.forEach((order) => {
    if (shouldExecute(order, price)) {
      // Call injected TradeEngine
      injectedTradeEngine.executeTrade({
        symbol: order.symbol,
        quantity: order.quantity,
        price: price.price,
        type: order.type,
      }); // ← Acquires mutex inside
    }
  });
});

// Meanwhile, user clicks "Buy BTC" button
// onClick handler calls useTrade hook → tradeEngine.executeTrade()
// But if OrderEngine execution is in progress, isExecuting = true
// So: throw "Trade in progress. Try again in 1 second."
```

---

## 8. Data Persistence & Error Handling

### 8.1 Graceful Persistence

```typescript
// services/StorageService.ts

export const persistState = (): void => {
  const state = {
    version: '1.0.0',
    portfolio: tradeEngine.getPortfolio(),
    trades: tradeEngine.getTradeHistory(),
    orders: orderEngine.getOpenOrders(),
    watchlist: watchlistManager.getSymbols(),
    preferences: preferencesManager.getPreferences(),
  };
  
  try {
    const serialized = JSON.stringify(state);
    
    // Check quota
    if (serialized.length > 5_000_000) {
      // 5MB limit; trim old trades if needed
      state.trades = state.trades.slice(-500); // Keep only 500 most recent
    }
    
    localStorage.setItem('tradepulse_state', serialized);
  } catch (e) {
    // Handle errors gracefully
    if (e instanceof Error) {
      if (e.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded');
        showToast(
          'Data could not be saved (storage full). Changes will be lost on refresh.',
          'warning'
        );
      } else {
        console.error('Persistence error:', e.message);
        showToast('Error saving data. Please try again.', 'error');
      }
    }
  }
};

export const loadState = (): StorageState | null => {
  try {
    const serialized = localStorage.getItem('tradepulse_state');
    if (!serialized) return null;
    
    const state = JSON.parse(serialized);
    
    // Validate schema
    if (!isValidSchema(state)) {
      console.warn('Invalid stored state shape; using defaults');
      return null;
    }
    
    // Migrate if version mismatch
    const migrated = MigrationService.migrate(state);
    return migrated;
    
  } catch (e) {
    console.error('Error loading state:', e);
    return null;
  }
};
```

### 8.2 Failed Trade Logging

```typescript
// trades/TradeEngine.ts

interface Trade {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  type: 'BUY' | 'SELL';
  status: 'executed' | 'failed';  // ← Track failures
  error?: string;                  // ← Optional error message
  timestamp: number;
}

export const executeTrade = (request: TradeRequest): TradeResult => {
  try {
    // ... validation ...
    
    if (!validation.isValid) {
      // Record failed trade
      const failedTrade: Trade = {
        id: crypto.randomUUID(),
        symbol: request.symbol,
        quantity: request.quantity,
        price: request.price,
        type: request.type,
        status: 'failed',
        error: validation.error,
        timestamp: Date.now(),
      };
      
      tradeHistory.push(failedTrade);
      persistState();  // Persist failure for audit
      
      console.error(`Trade failed for ${request.symbol}:`, validation.error);
      
      return {
        success: false,
        error: validation.error,
        trade: failedTrade,
      };
    }
    
    // ... execute successful trade ...
    
  } catch (e) {
    console.error('Unexpected error in trade execution:', e);
    return {
      success: false,
      error: 'Unexpected error. Please refresh and try again.',
    };
  }
};
```

---

## 9. Price Engine: Deep Dive

### 9.1 Geometric Brownian Motion Simulator

```typescript
// engines/PriceEngine/simulator.ts

// GBM formula: dS = μS·dt + σS·dW
// μ = drift (expected return)
// σ = volatility (standard deviation)
// dW = random shock (normal distribution)

export const generateNextPrice = (
  current: PriceData,
  config: SymbolConfig
): PriceData => {
  // Drift: expect ~0.01% daily return (micro return)
  const drift = 0.0001;
  
  // Volatility: configurable per symbol (e.g., BTC=high, bonds=low)
  const volatility = config.volatility || 0.02;
  
  // Generate random normal distribution shock (Box-Muller transform)
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  // Calculate percentage change
  let changePercent = drift + volatility * z;
  
  // Clamp to realistic bounds (max ±5% per tick)
  changePercent = clamp(changePercent, -0.05, 0.05);
  
  // Apply to current price
  let newPrice = current.price * (1 + changePercent);
  
  // Prevent unrealistic prices (must stay > 0.01, < 1M)
  newPrice = clamp(newPrice, 0.01, 1_000_000);
  newPrice = roundToTwoDecimals(newPrice);
  
  // Calculate bid/ask spread (realistic spread based on price)
  const spread = calculateRealisticSpread(newPrice, config.liquidity);
  const bid = roundToTwoDecimals(newPrice - spread / 2);
  const ask = roundToTwoDecimals(newPrice + spread / 2);
  
  // Track high/low for session
  const high = Math.max(current.high, newPrice);
  const low = Math.min(current.low, newPrice);
  
  // Calculate deltas from previous close
  const change = roundToTwoDecimals(newPrice - current.previousClose);
  const changePercent_final = (change / current.previousClose) * 100;
  
  return {
    symbol: current.symbol,
    price: newPrice,
    bid,
    ask,
    spread,
    high,
    low,
    change,
    changePercent: roundToTwoDecimals(changePercent_final),
    timestamp: Date.now(),
    previousClose: current.previousClose,  // Persistent
  };
};

// Symbol-specific configs
const SYMBOL_CONFIG: Record<string, SymbolConfig> = {
  BTC: { volatility: 0.035, liquidity: 0.001 },   // High vol, high liquidity
  ETH: { volatility: 0.04, liquidity: 0.0015 },
  SOL: { volatility: 0.06, liquidity: 0.003 },    // Very volatile
  AAPL: { volatility: 0.02, liquidity: 0.0005 },  // Low vol, very liquid
};
```

### 9.2 PriceEngine State & Lifecycle

```typescript
// engines/PriceEngine/PriceEngine.ts

let subscribers: Map<string, Set<(p: PriceData) => void>> = new Map();
let prices: Map<string, PriceData> = new Map();
let history: Map<string, PricePoint[]> = new Map();
let updateInterval: NodeJS.Timer | null = null;
let isRunning: boolean = false;

export const subscribe = (
  symbol: string,
  callback: (price: PriceData) => void
): (() => void) => {
  // Lazy-initialize set for symbol
  if (!subscribers.has(symbol)) {
    subscribers.set(symbol, new Set());
    // Initialize price if not set
    if (!prices.has(symbol)) {
      prices.set(symbol, initializePrice(symbol));
    }
  }
  
  subscribers.get(symbol)!.add(callback);
  
  // Return unsubscribe function
  return () => {
    const subs = subscribers.get(symbol);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        subscribers.delete(symbol);
        // Optional: cleanup price state if no subscribers
      }
    }
  };
};

export const start = (): void => {
  if (isRunning) return;
  isRunning = true;
  
  updateInterval = setInterval(() => {
    tick();
  }, 1000); // 1 second
};

export const stop = (): void => {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
    isRunning = false;
  }
};

export const tick = (): void => {
  // Update each subscribed symbol
  for (const symbol of subscribers.keys()) {
    const currentPrice = prices.get(symbol);
    if (!currentPrice) continue;
    
    // Generate next price using GBM
    const newPrice = generateNextPrice(currentPrice, SYMBOL_CONFIG[symbol]);
    prices.set(symbol, newPrice);
    
    // Update history (rolling 500-point window)
    let hist = history.get(symbol) || [];
    hist.push({ price: newPrice.price, timestamp: newPrice.timestamp });
    if (hist.length > 500) hist = hist.slice(-500);
    history.set(symbol, hist);
  }
  
  // Notify all subscribers
  notifyAll();
};

const notifyAll = (): void => {
  for (const [symbol, callbacks] of subscribers.entries()) {
    const price = prices.get(symbol);
    if (!price) continue;
    
    // Call all callbacks for this symbol
    callbacks.forEach((callback) => {
      try {
        callback(price);
      } catch (e) {
        console.error(`Error in price callback for ${symbol}:`, e);
        // Don't break; notify other subscribers
      }
    });
  }
};

export const getPrice = (symbol: string): PriceData | undefined => {
  return prices.get(symbol);
};

export const getAllPrices = (): ReadonlyMap<string, PriceData> => {
  return new Map(prices);
};

export const getHistory = (symbol: string): readonly PricePoint[] => {
  return Object.freeze(history.get(symbol) || []);
};
```

---

## 10. Scalability Architecture

### 10.1 Scaling to 10, 100, 1000+ Symbols

```
┌────────────────────────────────────────────────────────────────────────┐
│                     SCALABILITY PLANNING                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  10 SYMBOLS (Current Design, Optimal)                                 │
│  ├─ Direct subscriptions per ticker                                   │
│  ├─ 10 re-renders/second (1 per symbol)                               │
│  ├─ SVG chart with 500 points rendered                                │
│  ├─ Full trade history loaded in memory                               │
│  ├─ No special optimizations needed                                   │
│  └─ Bottleneck: None; DOM rendering is ample                          │
│                                                                        │
│  100 SYMBOLS (Optimized)                                              │
│  ├─ Batched price subscription                                        │
│  │  if (numSubscribers > 50) {                                        │
│  │    batch 5 tickers per callback -> 20 callbacks/sec -> 20 renders │
│  │  }                                                                 │
│  ├─ SVG chart with 500 points (still fast; DOM diffing overhead)      │
│  ├─ Trade history paginated (show 100 most recent; lazy load)         │
│  ├─ Watchlist virtualized (render only visible rows)                  │
│  └─ Bottleneck: Chart render (500 SVG path re-calcs)                  │
│                                                                        │
│  1000+ SYMBOLS (Advanced)                                             │
│  ├─ Feature flag to disable chart for inactive symbols                │
│  ├─ Chart rendered with Canvas (not SVG) for >1000 points             │
│  ├─ Line simplification (Douglas-Peucker algorithm)                   │
│  │  • Reduce 500 points to ~100 "significant" points                  │
│  │  • Visually identical, 80% faster to render                        │
│  ├─ Order book pagination (load top 100 bids/asks only)               │
│  ├─ Trade history indexed by symbol (faster queries)                  │
│  ├─ localStorage → IndexedDB (better quota, faster queries)           │
│  └─ Bottleneck: Memory usage; Chrome ~100MB for 1000 symbols          │
│                                                                        │
│  PERFORMANCE TARGETS:                                                 │
│  ├─ 10 symbols: <16ms per render (60fps achievable)                   │
│  ├─ 100 symbols: <50ms per render (20fps acceptable for tickers)      │
│  ├─ 1000+ symbols: <100ms per render (10fps acceptable)               │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Chart Optimization for Large Datasets

```typescript
// charts/renderer/SVGRenderer.ts

export const renderChart = (
  data: PricePoint[],
  options: RenderOptions
): string => {
  // For >1000 points, apply line simplification
  let renderData = data;
  
  if (data.length > 1000) {
    renderData = simplifyPath(data, 2.0);  // Tolerance: 2.0px
    console.log(`Simplified ${data.length} points to ${renderData.length}`);
  }
  
  // Generate SVG path
  const pathD = renderData.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');
  
  return pathD;
};

// Douglas-Peucker line simplification algorithm
const simplifyPath = (data: Point[], tolerance: number): Point[] => {
  const result: Point[] = [data[0]];
  
  let maxDist = 0;
  let maxIdx = 0;
  
  for (let i = 1; i < data.length - 1; i++) {
    const dist = perpDistanceToSegment(
      data[i],
      data[0],
      data[data.length - 1]
    );
    
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }
  
  if (maxDist > tolerance) {
    // Recursively simplify both segments
    const left = simplifyPath(data.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPath(data.slice(maxIdx), tolerance);
    
    result.push(...left.slice(1, -1), ...right);
  } else {
    result.push(data[data.length - 1]);
  }
  
  return result;
};
```

### 10.3 Virtualized Watchlist

```typescript
// features/watchlist/components/Watchlist.tsx

import { FixedSizeList } from 'react-window';

export const VirtualizedWatchlist = ({ symbols, onSelect }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <WatchlistItem
        symbol={symbols[index]}
        onSelect={onSelect}
      />
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={symbols.length}
      itemSize={35}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};

// React-window renders only visible rows (e.g., 20 rows visible but 1000 symbols)
// Massive memory/render improvement
```

---

## 11. Error Handling & Recovery

### 11.1 Comprehensive Error Scenarios

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ERROR HANDLING MATRIX                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Error Type          │ Root Cause      │ Handling                   │
│─────────────────────┼─────────────────┼────────────────────────────│
│ Insufficient funds  │ User action     │ Show tooltip in form       │
│ Insufficient shares │ User action     │ Show tooltip in form       │
│ Trade throttled     │ Rate limit      │ Show timer until available │
│ Order validation    │ Logic error     │ Log + show generic error   │
│ localStorage full   │ Browser quota   │ Trim history, warn user    │
│ localStorage corrupt│ Corruption      │ Use defaults, notify user  │
│ Migration failed    │ Version issue   │ Show recovery dialog       │
│ Subscription error  │ Engine bug      │ Log + fallback render      │
│ JSON.parse failed   │ Data valid      │ Reset to defaults          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 Error Boundaries

```typescript
// components/ErrorBoundary.tsx

export class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error);
    reportErrorToLogging(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Refresh App
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

## 12. Testing Strategy

### 12.1 Unit Test Example: TradeEngine

```typescript
// engines/TradeEngine.test.ts

describe('TradeEngine', () => {
  beforeEach(() => {
    tradeEngine.reset();  // reset state
  });
  
  it('should execute a buy trade atomically', () => {
    const initialCash = tradeEngine.getPortfolio().cash;
    const result = tradeEngine.executeTrade({
      symbol: 'BTC',
      quantity: 1,
      price: 50000,
      type: 'BUY',
    });
    
    expect(result.success).toBe(true);
    const portfolio = tradeEngine.getPortfolio();
    expect(portfolio.cash).toBe(initialCash - 50000);
    expect(portfolio.positions.BTC.shares).toBe(1);
  });
  
  it('should reject trade if insufficient funds', () => {
    const result = tradeEngine.executeTrade({
      symbol: 'BTC',
      quantity: 1000,
      price: 50000,
      type: 'BUY',
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient funds');
  });
  
  it('should prevent concurrent trades', () => {
    const result1 = tradeEngine.executeTrade(tradeRequest1);
    const result2 = tradeEngine.executeTrade(tradeRequest2); // ← Should fail
    
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(false);
    expect(result2.error).toContain('Trade in progress');
  });
  
  it('should persist trade to history on success', () => {
    tradeEngine.executeTrade(tradeRequest);
    const history = tradeEngine.getTradeHistory();
    
    expect(history.length).toBe(1);
    expect(history[0].status).toBe('executed');
  });
  
  it('should persist failed trade to history', () => {
    tradeEngine.executeTrade(invalidTradeRequest);
    const history = tradeEngine.getTradeHistory();
    
    expect(history.length).toBe(1);
    expect(history[0].status).toBe('failed');
    expect(history[0].error).toBeDefined();
  });
});
```

### 12.2 Integration Test Example: Order Fill

```typescript
// integration.test.ts

describe('Order Fill Integration', () => {
  beforeEach(() => {
    priceEngine.reset();
    orderEngine.reset();
    tradeEngine.reset();
  });
  
  it('should auto-execute limit order when price crosses', async () => {
    // Place limit order: Buy 1 BTC at 50000
    const order = orderEngine.placeOrder({
      symbol: 'BTC',
      type: 'BUY',
      limitPrice: 50000,
      quantity: 1,
    });
    expect(order).toBeDefined();
    
    // Start engines
    priceEngine.start();
    
    // Wait for price to drift down to 49500 (current: ~50200)
    await waitForCondition(
      () => priceEngine.getPrice('BTC')?.price! < 50000,
      5000 // max 5 seconds
    );
    
    // Order should be filled
    const openOrders = orderEngine.getOpenOrders();
    expect(openOrders.length).toBe(0); // Order executed and removed
    
    // Portfolio should reflect the position
    const portfolio = tradeEngine.getPortfolio();
    expect(portfolio.positions.BTC.shares).toBe(1);
    
    priceEngine.stop();
  });
});
```

---

## 13. Deployment & Monitoring

### 13.1 Build Output

```
dist/
├── index.html                    (6 KB)
├── assets/
│   ├── app-abc123.js            (150 KB, minified+gzipped)
│   ├── app-abc123.css           (40 KB)
│   └── vendor-xyz789.js         (200 KB, React+dependencies)
├── manifest.json
└── favicon.ico

Total bundle: ~400 KB gzipped
Load time (3G): ~2 seconds
```

### 13.2 Monitoring Checklist

- ✅ Error tracking (Sentry/LogRocket)
- ✅ Performance monitoring (Web Vitals)
- ✅ localStorage quota alerts
- ✅ Failed persistence detection
- ✅ Slow render detection (>100ms)
- ✅ Memory leak detection
- ✅ Unhandled promise rejections

---

**End of Architecture Documentation**

---

**End of Document**
