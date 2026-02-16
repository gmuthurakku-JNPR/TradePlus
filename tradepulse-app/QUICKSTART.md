# TradePulse Developer Quickstart

**Status:** Project skeleton ready for feature implementation  
**Last Updated:** February 16, 2026

---

## 🚀 5-Minute Setup

### Prerequisites
- Node.js 18+ (check: `node --version`)
- npm (comes with Node.js)
- VS Code with TypeScript extension (recommended)

### Setup Steps
```bash
# 1. Navigate to project
cd tradepulse-app

# 2. Install dependencies (if not done)
npm install

# 3. Start dev server
npm run dev

# 4. Open browser
# → http://localhost:3000
```

That's it! The app will auto-reload when you save files.

---

## 📁 Project Layout Quick Reference

**Where to find things:**

| What | Where |
|------|-------|
| Types/Interfaces | `src/types/index.ts` |
| Global Styles | `src/styles/global.css` |
| App Layout | `src/App.tsx` |
| Price Engine | `src/engines/PriceEngine/index.ts` |
| Trade Engine | `src/engines/TradeEngine/index.ts` |
| Order Engine | `src/engines/OrderEngine/index.ts` |
| UI Components | `src/components/` |
| Features | `src/features/` |
| State Store | `src/store/` |
| Utilities | `src/utils/` |

---

## 🔧 Import Paths (Using Aliases)

**Good:**
```typescript
import type { PriceData } from '@types';
import { PriceEngine } from '@engines/PriceEngine';
import { usePrice } from '@hooks';
```

**Bad (don't do this):**
```typescript
import type { PriceData } from '../../../types/index';
```

All 12 paths are aliased in `tsconfig.app.json` and `vite.config.ts`.

---

## 🎯 First Task: Implement PriceEngine

The PriceEngine is the data source for the entire application.

### Goal
Create realistic price data that subscribers can listen to.

### Key Functions to Implement

```typescript
// src/engines/PriceEngine/index.ts

/**
 * 1. Generate GBM (Geometric Brownian Motion) prices
 * 
 * For each symbol, simulate:
 * - Current price: affected by drift and volatility
 * - Bid/ask spread (2% of price)
 * - 52-week high/low
 * - Daily change %
 * 
 * Formula: P(t+1) = P(t) * exp((μ - σ²/2)Δt + σ√Δt * Z)
 * where Z = random normal(0,1)
 */
function _generatePriceUpdate(symbol: string): PriceData {
  // TODO: Implement GBM
}

/**
 * 2. Start price simulation
 * 
 * - Initialize prices for 500 symbols (AAPL, GOOGL, MSFT, etc.)
 * - Every 1 second, generate new prices
 * - Call subscribers with new PriceData
 * - Keep history in rolling 500-point window
 */
export const start = (): void => {
  // TODO: Set up interval, initialize prices
}

/**
 * 3. Stop price simulation
 * 
 * - Cancel the interval
 * - Stop notifying subscribers
 */
export const stop = (): void => {
  // TODO: Clear interval
}
```

### Example: Using Price Subscriptions
```typescript
// In a React component
import { PriceEngine } from '@engines/PriceEngine';

const handlePriceUpdate = (price: PriceData) => {
  console.log(`${price.symbol}: $${price.price}`);
};

// Subscribe to a symbol
const unsubscribe = PriceEngine.subscribe('AAPL', handlePriceUpdate);

// Unsubscribe when done
// unsubscribe();
```

---

## 🔄 Second Task: Implement TradeEngine

The TradeEngine executes trades with atomic updates.

### Goal
Execute buy/sell orders while maintaining portfolio consistency.

### Key Functions to Implement

```typescript
/**
 * 1. Validate trade request
 * 
 * Check:
 * - Quantity > 0
 * - Available cash >= (price * quantity * 1.02) [with slippage]
 * - Symbol exists
 */
function _validateTrade(request: TradeRequest): TradeValidation {
  // TODO: Implement validation
}

/**
 * 2. Execute trade with atomic updates
 * 
 * Steps (must be atomic):
 * 1. Check isExecuting flag (mutex pattern)
 * 2. Validate request
 * 3. Get current price from PriceEngine
 * 4. Calculate slippage (±1% for market order)
 * 5. Update cash in portfolio
 * 6. Update positions map
 * 7. Record trade in history
 * 8. Persist to localStorage
 * 9. Clear isExecuting flag
 */
export const executeTrade = (request: TradeRequest): TradeResult => {
  // TODO: Implement atomic execution
}

/**
 * 3. Track portfolio state
 * 
 * Maintain:
 * - cash: Available buying power
 * - positions: { symbol: { quantity, avgCost } }
 * - realizedPL: Profit/loss from closed positions
 */
interface Portfolio {
  cash: number;
  positions: Map<string, { quantity: number; avgCost: number }>;
  realizedPL: number;
}
```

### Example: Executing a Trade
```typescript
// In a React component
import { TradeEngine } from '@engines/TradeEngine';
import type { TradeRequest } from '@types';

const buyApple = () => {
  const request: TradeRequest = {
    symbol: 'AAPL',
    type: 'buy',
    orderType: 'market',
    quantity: 10,
  };

  const result = TradeEngine.executeTrade(request);
  
  if (result.success) {
    console.log(`Bought 10 AAPL at $${result.executedPrice}`);
  } else {
    console.error(`Trade failed: ${result.error}`);
  }
};
```

---

## 📊 Third Task: Implement OrderEngine

The OrderEngine manages limit orders and matches them against prices.

### Goal
Create limit orders that execute automatically when price matches.

### Key Functions to Implement

```typescript
/**
 * 1. Place a limit order
 * 
 * Store order with:
 * - id: Unique identifier
 * - symbol: Stock symbol
 * - type: 'buy' | 'sell'
 * - limitPrice: Price to execute at
 * - quantity: Share count
 * - status: 'open'
 * - createdAt: Timestamp
 */
export const placeOrder = (request: OrderRequest): LimitOrder => {
  // TODO: Create and store order
}

/**
 * 2. Watch for price triggers
 * 
 * Subscribe to PriceEngine
 * For each open order:
 * - If buy order: check if price <= limitPrice
 * - If sell order: check if price >= limitPrice
 * - If match: call TradeEngine.executeTrade()
 */
function _checkOrderMatches(price: PriceData): void {
  // TODO: Match orders against price updates
}

/**
 * 3. Cancel orders
 * 
 * Remove from openOrders, move to history
 */
export const cancelOrder = (orderId: string): boolean => {
  // TODO: Implement cancellation
}

/**
 * 4. Modify orders
 * 
 * Update limitPrice or quantity
 * Handle edge cases (price already triggered)
 */
export const modifyOrder = (
  orderId: string,
  updates: Partial<LimitOrder>
): LimitOrder => {
  // TODO: Implement modification
}
```

### Example: Placing a Limit Order
```typescript
import { OrderEngine } from '@engines/OrderEngine';
import type { OrderRequest } from '@types';

const placeBuyOrder = () => {
  const request: OrderRequest = {
    symbol: 'AAPL',
    type: 'buy',
    limitPrice: 150, // Buy if price drops to $150
    quantity: 5,
  };

  const order = OrderEngine.placeOrder(request);
  console.log(`Order placed: ${order.id}`);
  
  // When price hits $150, trade executes automatically!
};
```

---

## 🪝 Creating React Hooks

Once engines are implemented, create hooks to connect them to React:

```typescript
// src/hooks/usePrice.ts
import { useEffect, useState } from 'react';
import { PriceEngine } from '@engines/PriceEngine';
import type { PriceData } from '@types';

export const usePrice = (symbol: string) => {
  const [price, setPrice] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    // Subscribe to price updates
    const unsubscribe = PriceEngine.subscribe(symbol, (data) => {
      setPrice(data);
      setIsLoading(false);
    });

    // Cleanup on unmount
    return unsubscribe;
  }, [symbol]);

  return { price, isLoading };
};
```

Usage in a component:
```typescript
function PriceDisplay({ symbol }: { symbol: string }) {
  const { price, isLoading } = usePrice(symbol);

  if (isLoading) return <div>Loading price...</div>;
  
  return (
    <div>
      <h2>{symbol}</h2>
      <p>${price?.price.toFixed(2)}</p>
      <p>Change: {price?.changePercent.toFixed(2)}%</p>
    </div>
  );
}
```

---

## 📝 Common Patterns

### Pattern 1: Module-Level State
```typescript
// Module-level state (NOT exported)
let privateState = { /* data */ };

// Public getter
export const getState = () => {
  return privateState;
};

// Public setter
export const updateState = (updates) => {
  privateState = { ...privateState, ...updates };
};
```

### Pattern 2: Subscription Pattern
```typescript
// Module-level subscribers
const subscribers = new Map<string, Set<Callback>>();

// Add subscriber
export const subscribe = (key: string, callback: Callback) => {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key)!.add(callback);
  
  // Return unsubscribe function
  return () => {
    subscribers.get(key)?.delete(callback);
  };
};

// Notify all subscribers
const notifySubscribers = (key: string, data: any) => {
  subscribers.get(key)?.forEach((cb) => cb(data));
};
```

### Pattern 3: Mutex for Atomic Updates
```typescript
let isExecuting = false;

export const atomicUpdate = (data: any) => {
  if (isExecuting) {
    throw new Error('Operation in progress');
  }
  
  try {
    isExecuting = true;
    // Do work that must be atomic
    performUpdate(data);
  } finally {
    isExecuting = false;
  }
};
```

---

## 🧪 Testing Your Implementation

### Test if PriceEngine works:
```typescript
import { PriceEngine } from '@engines/PriceEngine';

// Subscribe to a price
PriceEngine.subscribe('AAPL', (price) => {
  console.log('Updated:', price);
});

// Start simulation
PriceEngine.start();

// You should see price updates every second
```

### Test if TradeEngine works:
```typescript
import { TradeEngine } from '@engines/TradeEngine';

const portfolio = TradeEngine.getPortfolio();
console.log('Cash:', portfolio.cash); // Should be 100,000

const result = TradeEngine.executeTrade({
  symbol: 'AAPL',
  type: 'buy',
  orderType: 'market',
  quantity: 10,
});

console.log('Trade result:', result); // Should have executedPrice

const newPortfolio = TradeEngine.getPortfolio();
console.log('Updated cash:', newPortfolio.cash); // Should be less
console.log('Positions:', newPortfolio.positions); // Should have AAPL
```

### Test if OrderEngine works:
```typescript
import { OrderEngine } from '@engines/OrderEngine';

const order = OrderEngine.placeOrder({
  symbol: 'AAPL',
  type: 'buy',
  limitPrice: 150,
  quantity: 5,
});

console.log('Order placed:', order.id);

const openOrders = OrderEngine.getOpenOrders();
console.log('Open orders:', openOrders);
```

---

## 🐛 Debugging Tips

### 1. Check Console for Errors
```bash
# In browser dev tools (F12) → Console tab
# Look for red errors
```

### 2. Use TypeScript Inspector
```bash
# In VS Code
# Right-click on a variable → "Go to Type Definition"
```

### 3. Add Debug Logs
```typescript
console.log('DEBUG:', {
  timestamp: new Date().toISOString(),
  event: 'trade_executed',
  data: result,
});
```

### 4. Verify Types
```typescript
// If you see type errors, check if import is correct
import type { PriceData } from '@types';

// Check: Do types exist in src/types/index.ts?
```

---

## 📚 Reference Files

**Required Reading:**
1. [ARCHITECTURE.md](../ARCHITECTURE.md) - System design and patterns
2. [PRD-TradePulse.md](../PRD-TradePulse.md) - Feature requirements
3. [src/types/index.ts](src/types/index.ts) - All type definitions

**Implementation Guide:**
1. Read the empty function skeletons in each engine
2. Look at the TODO comments for what needs implementing
3. Reference the type definitions for expected input/output shapes
4. Check the architecture docs for design patterns

---

## ⚡ Quick Commands

```bash
# Start dev server (watch mode)
npm run dev

# Type check
npm run type-check

# Linting
npm run lint

# Production build
npm run build

# Preview production build
npm run preview

# Clear cache and reinstall
npm install
```

---

## 🎓 Learning Resources

### File Structure References
- [SETUP.md](SETUP.md) - Setup guide with folder explanation
- [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md) - Why each folder exists

### Implementation Details
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Deep dive into design decisions
- [psd_answers.txt](../psd_answers.txt) - Q&A about technical decisions

### TypeScript
- [src/types/index.ts](src/types/index.ts) - All types in one place

---

## 🆘 Getting Help

### Common Issues

**Q: "Cannot find module '@types'"**
A: Make sure you're importing from `@types` not `@types/index`. The path alias is configured to resolve automatically.

**Q: "Price updates not firing"**
A: Make sure you called `PriceEngine.start()` before subscribing.

**Q: "Trade execution throwing error"**
A: Check if `TradeEngine.isThrottled()` - trades are limited to 1 per second.

**Q: "Order not executing when price matches"**
A: Make sure OrderEngine is subscribed to PriceEngine price updates.

---

## ✅ Implementation Checklist

Use this to track progress:

- [ ] **PriceEngine**
  - [ ] GBM price generation working
  - [ ] Price updates firing every 1 second
  - [ ] History window capped at 500 points
  - [ ] All 500 symbols initialized
  - [ ] Spread and bid/ask working

- [ ] **TradeEngine**
  - [ ] Validation logic working
  - [ ] Atomic execution with mutex
  - [ ] Portfolio state updating correctly
  - [ ] Trade history recording
  - [ ] persistence to localStorage
  - [ ] Throttle logic working (1/sec)

- [ ] **OrderEngine**
  - [ ] Order placement working
  - [ ] Open orders list maintained
  - [ ] Order matching against prices
  - [ ] Execution calling TradeEngine
  - [ ] Order cancellation working
  - [ ] Order modification working

- [ ] **React Integration**
  - [ ] usePrice hook working
  - [ ] useTrade hook working
  - [ ] useOrder hook working
  - [ ] usePortfolio hook working

---

**Now get started!** 🚀

Pick one engine, implement one function, test it in the console. Repeat. You've got this!
