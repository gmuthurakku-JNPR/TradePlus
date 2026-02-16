# Product/System Design Document (PSD)
## TradePulse - Simulated Paper Trading Terminal

**Version:** 1.0  
**Date:** February 15, 2026  
**Author:** Frontend Architecture Team  
**Status:** Technical Design Complete  
**PRD Reference:** PRD-TradePulse v1.1  

---

## Table of Contents
1. [Technical Overview](#1-technical-overview)
2. [System Architecture](#2-system-architecture)
3. [Data Models](#3-data-models)
4. [Component Architecture](#4-component-architecture)
5. [State Management Design](#5-state-management-design)
6. [Engine Designs](#6-engine-designs)
7. [Data Flow](#7-data-flow)
8. [Performance Strategy](#8-performance-strategy)
9. [Persistence Design](#9-persistence-design)
10. [Error Handling Strategy](#10-error-handling-strategy)
11. [Testing Strategy](#11-testing-strategy)
12. [Folder Structure](#12-folder-structure)
13. [Technical Risks & Mitigations](#13-technical-risks--mitigations)

---

## 1. Technical Overview

### 1.1 Tech Stack Decision & Justification

| Technology | Choice | Justification | Alternatives Considered |
|------------|--------|---------------|------------------------|
| **Framework** | React 18+ | Component model fits trading UI; concurrent rendering for smooth updates; large ecosystem | Vue 3, Svelte, Solid.js |
| **Language** | TypeScript 5+ | Type safety critical for financial calculations; better DX; catch errors at compile time | Plain JavaScript |
| **Build Tool** | Vite | Fast HMR; optimized production builds; native ESM support | Webpack, Parcel, esbuild |
| **Styling** | CSS Modules + CSS Variables | Scoped styles; no runtime overhead; easy theming | Tailwind, styled-components |
| **Charting** | Native SVG | PRD requirement; full control; no bundle bloat | D3.js, Chart.js, Recharts |
| **State** | React Context + useReducer | Sufficient for app complexity; no external deps | Redux, Zustand, Jotai |
| **Persistence** | localStorage | PRD requirement; synchronous API; 5MB limit acceptable | IndexedDB |
| **Dates** | date-fns | Tree-shakeable; immutable; small footprint | dayjs, moment, luxon |
| **IDs** | crypto.randomUUID() | Native browser API; no dependency needed | uuid, nanoid |
| **Testing** | Vitest + React Testing Library | Fast; Vite-native; component testing best practices | Jest |

### 1.2 Architecture Pattern Selection

**Pattern:** **Feature-Sliced Design (FSD) + Clean Architecture Principles**

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
│    React Components (UI) + Hooks (View Logic)                  │
├─────────────────────────────────────────────────────────────────┤
│                      APPLICATION LAYER                          │
│    Engines (Business Logic) + State Management                  │
├─────────────────────────────────────────────────────────────────┤
│                        DOMAIN LAYER                             │
│    Models (Types) + Calculations + Validation Rules            │
├─────────────────────────────────────────────────────────────────┤
│                     INFRASTRUCTURE LAYER                        │
│    Persistence (localStorage) + Time Services                   │
└─────────────────────────────────────────────────────────────────┘
```

**Rationale:**
- Clear separation of concerns enables independent testing
- Engines encapsulate complex business logic (price simulation, trade execution)
- Domain layer ensures type safety and calculation accuracy
- Infrastructure layer abstracts storage implementation

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TRADEPULSE APP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌─────────────────────────────────────────────────┐   │
│  │   HEADER    │     │                   CONTEXT PROVIDERS              │   │
│  │  Component  │     │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │   │
│  └─────────────┘     │  │  Price   │ │Portfolio │ │   Preferences    │ │   │
│                      │  │ Context  │ │ Context  │ │    Context       │ │   │
│  ┌──────────────────┐│  └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │   │
│  │    WATCHLIST     ││       │            │                 │           │   │
│  │    Component     │◄───────┤            │                 │           │   │
│  │  ┌────────────┐  ││       │            │                 │           │   │
│  │  │ WatchItem  │  ││       │            │                 │           │   │
│  │  │ WatchItem  │  ││       │            │                 │           │   │
│  │  │ WatchItem  │  ││       │            │                 │           │   │
│  │  └────────────┘  ││       │            │                 │           │   │
│  └──────────────────┘│       │            │                 │           │   │
│                      │       ▼            │                 │           │   │
│  ┌──────────────────┐│  ┌─────────────────┴─────────────────┴───────┐   │   │
│  │      CHART       ││  │              ENGINE LAYER                  │   │   │
│  │    Component     │◄──┤  ┌─────────────┐  ┌─────────────────────┐ │   │   │
│  │  ┌────────────┐  ││  │  │   PRICE     │  │      TRADE          │ │   │   │
│  │  │ SVG Canvas │  ││  │  │   ENGINE    │  │      ENGINE         │ │   │   │
│  │  │ Crosshair  │  ││  │  │  (Singleton)│  │  (Command Pattern)  │ │   │   │
│  │  │ Indicators │  ││  │  └──────┬──────┘  └──────────┬──────────┘ │   │   │
│  │  └────────────┘  ││  │         │                    │            │   │   │
│  └──────────────────┘│  │         │    ┌───────────────┴──────┐     │   │   │
│                      │  │         │    │      ORDER           │     │   │   │
│  ┌──────────────────┐│  │         │    │      ENGINE          │     │   │   │
│  │   ORDER PANEL    ││  │         │    │   (Event-Driven)     │     │   │   │
│  │    Component     │├──┤         │    └───────────┬──────────┘     │   │   │
│  │  ┌────────────┐  ││  │         │                │                │   │   │
│  │  │ OrderForm  │  ││  └─────────┼────────────────┼────────────────┘   │   │
│  │  │ConfirmDlg  │  ││            │                │                    │   │
│  │  └────────────┘  ││            ▼                ▼                    │   │
│  └──────────────────┘│  ┌─────────────────────────────────────────────┐ │   │
│                      │  │           PERSISTENCE LAYER                  │ │   │
│  ┌──────────────────┐│  │  ┌─────────────────────────────────────────┐│ │   │
│  │    PORTFOLIO     ││  │  │              StorageService             ││ │   │
│  │    Component     │◄──┤  │   localStorage ←→ State Sync            ││ │   │
│  │  ┌────────────┐  ││  │  └─────────────────────────────────────────┘│ │   │
│  │  │PositionRow │  ││  └─────────────────────────────────────────────┘ │   │
│  │  │PositionRow │  ││                                                  │   │
│  │  │  Summary   │  ││                                                  │   │
│  │  └────────────┘  ││                                                  │   │
│  └──────────────────┘│                                                  │   │
│                      │                                                  │   │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

### 2.2 Module Breakdown

| Module | Responsibility | Dependencies | Exports |
|--------|---------------|--------------|---------|
| **PriceEngine** | Generate mock prices; notify subscribers | None | `PriceEngine` singleton, `usePrices` hook |
| **TradeEngine** | Execute market orders; validate trades | PriceEngine, PortfolioContext | `executeTrade()`, `TradeResult` |
| **OrderEngine** | Manage limit orders; auto-execute on match | PriceEngine, TradeEngine | `placeOrder()`, `cancelOrder()` |
| **Portfolio** | Track positions; calculate P&L | TradeEngine | `PortfolioContext`, `usePortfolio` |
| **Watchlist** | Manage watched symbols | PriceEngine, Persistence | `WatchlistContext`, `useWatchlist` |
| **Chart** | Render price visualization | PriceEngine | `Chart` component |
| **Persistence** | localStorage read/write; migrations | None | `StorageService` |
| **Preferences** | User settings management | Persistence | `PreferencesContext` |

### 2.3 Layer Separation

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│─────────────────────────────────────────────────────────────────│
│  Components:                                                    │
│    • App, Header, Layout                                        │
│    • Watchlist, WatchlistItem                                   │
│    • Chart, ChartCanvas, Crosshair, TimeframeSelector          │
│    • OrderPanel, OrderForm, ConfirmationDialog                  │
│    • Portfolio, PositionRow, PortfolioSummary                  │
│    • Settings, ToastNotification                                │
│                                                                 │
│  Hooks (View Logic):                                            │
│    • useChartData, useChartInteraction                          │
│    • useOrderForm, useTradeThrottle                             │
│    • useToast, useKeyboardShortcuts                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                           │
│─────────────────────────────────────────────────────────────────│
│  Context Providers:                                             │
│    • PriceProvider (real-time price state)                      │
│    • PortfolioProvider (positions, cash, P&L)                   │
│    • WatchlistProvider (watched symbols)                        │
│    • OrderProvider (open limit orders)                          │
│    • PreferencesProvider (user settings)                        │
│                                                                 │
│  Engines (Business Logic):                                      │
│    • PriceEngine (price generation, subscription)               │
│    • TradeEngine (order execution, validation)                  │
│    • OrderEngine (limit order management)                       │
│                                                                 │
│  Hooks (Application Logic):                                     │
│    • usePrices, usePortfolio, useWatchlist                      │
│    • useTrade, useOrders, usePreferences                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DOMAIN LAYER                              │
│─────────────────────────────────────────────────────────────────│
│  Types/Interfaces:                                              │
│    • PriceData, PriceHistory, Symbol                            │
│    • Trade, Order, OrderType, OrderStatus                       │
│    • Portfolio, Position                                        │
│    • Preferences, ChartConfig                                   │
│                                                                 │
│  Domain Logic (Pure Functions):                                 │
│    • calculateWAC, calculatePnL, calculatePortfolioValue        │
│    • validateOrder, validateFunds, validateShares               │
│    • applySlippage, calculateSpread                             │
│    • aggregateCandles, calculateSMA                             │
│                                                                 │
│  Constants:                                                     │
│    • SYMBOLS, DEFAULT_PREFERENCES, LIMITS                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                          │
│─────────────────────────────────────────────────────────────────│
│  Persistence:                                                   │
│    • StorageService (localStorage abstraction)                  │
│    • MigrationService (schema versioning)                       │
│    • StorageKeys, StorageSchema                                 │
│                                                                 │
│  Services:                                                      │
│    • TimeService (mockable clock for testing)                   │
│    • RandomService (seedable RNG for deterministic tests)       │
│    • IdService (UUID generation)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Models

### 3.1 Price Data Model

```typescript
// src/domain/models/price.ts

/**
 * Real-time price snapshot for a single symbol
 */
export interface PriceData {
  readonly symbol: string;
  readonly price: number;           // Current market price
  readonly previousClose: number;   // Yesterday's closing price
  readonly open: number;            // Session open price
  readonly high: number;            // Session high
  readonly low: number;             // Session low
  readonly bid: number;             // Best bid price
  readonly ask: number;             // Best ask price
  readonly spread: number;          // ask - bid
  readonly change: number;          // price - previousClose
  readonly changePercent: number;   // (change / previousClose) * 100
  readonly volume: number;          // Simulated volume
  readonly timestamp: number;       // Unix timestamp ms
}

/**
 * Historical price point for charting
 */
export interface PricePoint {
  readonly timestamp: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

/**
 * Price history for a symbol
 */
export interface PriceHistory {
  readonly symbol: string;
  readonly points: PricePoint[];    // Max 500 points retained
  readonly lastUpdated: number;
}

/**
 * Symbol metadata
 */
export interface SymbolInfo {
  readonly symbol: string;
  readonly name: string;
  readonly sector: string;
  readonly initialPrice: number;
  readonly volatility: number;      // 0.01 = 1% typical move
}

/**
 * Price engine configuration
 */
export interface PriceEngineConfig {
  readonly updateIntervalMs: number;   // 500-5000, default 1000
  readonly volatilityMultiplier: number; // 0.5-2.0, default 1.0
  readonly symbols: readonly SymbolInfo[];
}
```

### 3.2 Trade Model

```typescript
// src/domain/models/trade.ts

export type TradeType = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type TradeStatus = 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'REJECTED';

/**
 * Executed or pending trade record
 */
export interface Trade {
  readonly id: string;              // UUID
  readonly symbol: string;
  readonly type: TradeType;
  readonly orderType: OrderType;
  readonly quantity: number;        // Shares (positive)
  readonly requestedPrice: number;  // Limit price or market price at request
  readonly executedPrice: number | null;  // Actual execution price
  readonly total: number;           // quantity * executedPrice (or estimated)
  readonly status: TradeStatus;
  readonly createdAt: number;       // Unix timestamp ms
  readonly executedAt: number | null;
  readonly rejectionReason?: string;
}

/**
 * Trade execution request (before confirmation)
 */
export interface TradeRequest {
  readonly symbol: string;
  readonly type: TradeType;
  readonly orderType: OrderType;
  readonly quantity: number;
  readonly limitPrice?: number;     // Required for LIMIT orders
}

/**
 * Trade execution result
 */
export interface TradeResult {
  readonly success: boolean;
  readonly trade: Trade;
  readonly error?: string;
}

/**
 * Trade validation result
 */
export interface TradeValidation {
  readonly valid: boolean;
  readonly errors: TradeValidationError[];
  readonly estimatedTotal: number;
  readonly estimatedPrice: number;
}

export interface TradeValidationError {
  readonly field: 'quantity' | 'price' | 'funds' | 'shares' | 'symbol';
  readonly message: string;
}
```

### 3.3 Order Model

```typescript
// src/domain/models/order.ts

export type OrderStatus = 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED';

/**
 * Limit order (pending execution)
 */
export interface LimitOrder {
  readonly id: string;
  readonly symbol: string;
  readonly type: TradeType;         // BUY or SELL
  readonly quantity: number;        // Original quantity
  readonly filledQuantity: number;  // Filled so far (for partial fills)
  readonly limitPrice: number;      // Target price
  readonly status: OrderStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly fillHistory: OrderFill[];
}

/**
 * Record of order fill event
 */
export interface OrderFill {
  readonly quantity: number;
  readonly price: number;
  readonly timestamp: number;
  readonly tradeId: string;
}

/**
 * Order placement request
 */
export interface OrderRequest {
  readonly symbol: string;
  readonly type: TradeType;
  readonly quantity: number;
  readonly limitPrice: number;
}

/**
 * Order update request
 */
export interface OrderUpdate {
  readonly orderId: string;
  readonly quantity?: number;
  readonly limitPrice?: number;
}
```

### 3.4 Portfolio Model

```typescript
// src/domain/models/portfolio.ts

/**
 * Single stock position
 */
export interface Position {
  readonly symbol: string;
  readonly shares: number;          // Total shares held
  readonly avgCost: number;         // Weighted average cost per share
  readonly totalCost: number;       // shares * avgCost (cost basis)
  
  // Computed at render time (not stored)
  currentPrice?: number;
  marketValue?: number;             // shares * currentPrice
  unrealizedPL?: number;            // marketValue - totalCost
  unrealizedPLPercent?: number;     // (unrealizedPL / totalCost) * 100
}

/**
 * Complete portfolio state
 */
export interface Portfolio {
  readonly cash: number;            // Available cash balance
  readonly positions: Position[];   // All held positions
  readonly realizedPL: number;      // Cumulative realized P&L
  readonly initialCash: number;     // Starting balance (for % return calc)
  
  // Computed at render time
  totalValue?: number;              // cash + sum(position.marketValue)
  totalUnrealizedPL?: number;       // sum(position.unrealizedPL)
  totalReturn?: number;             // totalValue - initialCash
  totalReturnPercent?: number;      // (totalReturn / initialCash) * 100
}

/**
 * Portfolio snapshot for history tracking
 */
export interface PortfolioSnapshot {
  readonly timestamp: number;
  readonly totalValue: number;
  readonly cash: number;
  readonly positionCount: number;
}
```

### 3.5 Watchlist Model

```typescript
// src/domain/models/watchlist.ts

/**
 * Watchlist entry with display data
 */
export interface WatchlistItem {
  readonly symbol: string;
  readonly addedAt: number;
  readonly sortOrder: number;
  
  // Populated at render time from PriceContext
  priceData?: PriceData;
}

/**
 * Watchlist state
 */
export interface Watchlist {
  readonly items: WatchlistItem[];
  readonly maxItems: 20;            // Constant
}
```

### 3.6 Preferences Model

```typescript
// src/domain/models/preferences.ts

export type ChartType = 'line' | 'candlestick';
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';
export type Theme = 'light' | 'dark' | 'system';

/**
 * User preferences (persisted)
 */
export interface Preferences {
  // Display
  readonly theme: Theme;
  readonly chartType: ChartType;
  readonly defaultTimeframe: Timeframe;
  readonly showVolume: boolean;
  readonly showCrosshair: boolean;
  
  // Trading
  readonly initialCash: number;         // 1000 - 10000000
  readonly confirmTrades: boolean;      // Always true for MVP (PRD requirement)
  
  // Price Engine
  readonly priceUpdateIntervalMs: number; // 500 - 5000
  
  // Accessibility
  readonly reduceMotion: boolean;
  readonly highContrast: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  chartType: 'line',
  defaultTimeframe: '1m',
  showVolume: false,
  showCrosshair: true,
  initialCash: 100_000,
  confirmTrades: true,
  priceUpdateIntervalMs: 1000,
  reduceMotion: false,
  highContrast: false,
};
```

---

## 4. Component Architecture

### 4.1 Component Hierarchy Diagram

```
App
├── ErrorBoundary
│   └── Providers (nested context providers)
│       ├── PreferencesProvider
│       │   └── PriceProvider
│       │       └── PortfolioProvider
│       │           └── WatchlistProvider
│       │               └── OrderProvider
│       │                   └── ToastProvider
│       │                       └── Layout
│       │                           ├── Header
│       │                           │   ├── Logo
│       │                           │   ├── PortfolioQuickView
│       │                           │   │   ├── TotalValue
│       │                           │   │   ├── DayPL
│       │                           │   │   └── CashBalance
│       │                           │   ├── SimulatedBadge
│       │                           │   └── SettingsButton
│       │                           │
│       │                           ├── MainContent
│       │                           │   ├── LeftPanel
│       │                           │   │   ├── Watchlist
│       │                           │   │   │   ├── WatchlistHeader
│       │                           │   │   │   │   ├── Title
│       │                           │   │   │   │   └── AddSymbolButton
│       │                           │   │   │   ├── WatchlistItems
│       │                           │   │   │   │   └── WatchlistItem (×N)
│       │                           │   │   │   │       ├── SymbolTicker
│       │                           │   │   │   │       ├── PriceDisplay
│       │                           │   │   │   │       ├── ChangeIndicator
│       │                           │   │   │   │       └── QuickActions
│       │                           │   │   │   └── SymbolSearch (modal)
│       │                           │   │   │
│       │                           │   │   └── OrderPanel
│       │                           │   │       ├── SelectedSymbol
│       │                           │   │       ├── OrderTypeToggle
│       │                           │   │       ├── OrderForm
│       │                           │   │       │   ├── QuantityInput
│       │                           │   │       │   ├── LimitPriceInput
│       │                           │   │       │   └── OrderPreview
│       │                           │   │       ├── BuySellButtons
│       │                           │   │       └── ThrottleIndicator
│       │                           │   │
│       │                           │   └── RightPanel
│       │                           │       └── Chart
│       │                           │           ├── ChartHeader
│       │                           │           │   ├── SymbolInfo
│       │                           │           │   └── TimeframeSelector
│       │                           │           ├── ChartCanvas (SVG)
│       │                           │           │   ├── PriceLine / Candlesticks
│       │                           │           │   ├── VolumePanel
│       │                           │           │   ├── Crosshair
│       │                           │           │   ├── PriceAxis
│       │                           │           │   └── TimeAxis
│       │                           │           └── ChartControls
│       │                           │
│       │                           └── BottomPanel
│       │                               ├── TabBar [Positions | Orders | History]
│       │                               ├── PositionsTab
│       │                               │   ├── PositionsSummary
│       │                               │   └── PositionsTable
│       │                               │       └── PositionRow (×N)
│       │                               ├── OrdersTab
│       │                               │   └── OpenOrdersTable
│       │                               │       └── OrderRow (×N)
│       │                               └── HistoryTab
│       │                                   └── TradeHistoryTable
│       │                                       └── TradeRow (×N)
│       │
│       └── Modals
│           ├── ConfirmationDialog
│           ├── SettingsModal
│           └── ResetConfirmModal
│
└── ToastContainer
    └── Toast (×N)
```

### 4.2 Component Responsibilities

| Component | Responsibility | State Owned | Props Received |
|-----------|---------------|-------------|----------------|
| `App` | Bootstrap; Error boundary | None | None |
| `Providers` | Context nesting | All contexts | None |
| `Layout` | Grid layout structure | None | children |
| `Header` | App header; quick info | None | None (uses contexts) |
| `Watchlist` | Symbol list management | Local filter/sort | None |
| `WatchlistItem` | Single symbol display | Hover state | `symbol`, `onSelect` |
| `Chart` | Price visualization | Pan/zoom state | `symbol` |
| `ChartCanvas` | SVG rendering | None | `data`, `config` |
| `OrderPanel` | Trade input form | Form state | `symbol` |
| `OrderForm` | Input fields | Validation state | `onSubmit` |
| `ConfirmationDialog` | Trade confirmation | None | `trade`, `onConfirm`, `onCancel` |
| `PositionsTable` | Holdings display | Sort/filter | None |
| `PositionRow` | Single position | None | `position` |
| `OpenOrdersTable` | Pending orders | Sort | None |
| `TradeHistoryTable` | Past trades | Pagination | None |
| `SettingsModal` | User preferences | Form state | `onSave`, `onClose` |
| `Toast` | Notification display | Timer | `message`, `type`, `onDismiss` |

### 4.3 Props/State Design per Key Component

#### WatchlistItem

```typescript
interface WatchlistItemProps {
  symbol: string;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

// Internal state: hover, removing animation
// Consumes: PriceContext for real-time price
```

#### Chart

```typescript
interface ChartProps {
  symbol: string;
  className?: string;
}

interface ChartState {
  timeframe: Timeframe;
  chartType: ChartType;
  viewportStart: number;    // For pan
  viewportEnd: number;
  zoomLevel: number;
  crosshairPosition: { x: number; y: number } | null;
  hoveredPoint: PricePoint | null;
}

// Consumes: PriceContext for history
// Consumes: PreferencesContext for defaults
```

#### OrderPanel

```typescript
interface OrderPanelProps {
  initialSymbol?: string;
}

interface OrderFormState {
  symbol: string;
  orderType: OrderType;
  tradeType: TradeType;
  quantity: string;          // String for input handling
  limitPrice: string;
  errors: TradeValidationError[];
  isThrottled: boolean;
  throttleRemaining: number;  // ms
}

// Consumes: PriceContext, PortfolioContext
// Uses: useTradeThrottle hook
```

#### ConfirmationDialog

```typescript
interface ConfirmationDialogProps {
  isOpen: boolean;
  trade: TradeRequest;
  estimatedPrice: number;
  estimatedTotal: number;
  onConfirm: () => void;
  onCancel: () => void;
}

// Pure presentational - no internal state
// Shows: symbol, type, qty, price, total, warnings
```

---

## 5. State Management Design

### 5.1 State Structure

```typescript
// Global state distributed across contexts

interface AppState {
  // PriceContext
  prices: {
    current: Map<string, PriceData>;
    history: Map<string, PriceHistory>;
    engineStatus: 'running' | 'paused' | 'error';
    lastTick: number;
  };
  
  // PortfolioContext
  portfolio: {
    cash: number;
    positions: Position[];
    realizedPL: number;
    trades: Trade[];        // Last 1000
    initialCash: number;
  };
  
  // OrderContext
  orders: {
    open: LimitOrder[];
    recentFills: OrderFill[];  // For notifications
  };
  
  // WatchlistContext
  watchlist: {
    items: WatchlistItem[];
    selectedSymbol: string | null;
  };
  
  // PreferencesContext
  preferences: Preferences;
  
  // UIContext (local to components, not persisted)
  ui: {
    toasts: Toast[];
    modals: ModalState;
    isSettingsOpen: boolean;
  };
}
```

### 5.2 State Ownership

```
┌──────────────────────────────────────────────────────────────────┐
│                        STATE OWNERSHIP MAP                        │
├────────────────────┬─────────────────────┬───────────────────────┤
│      Domain        │       Owner         │      Persistence      │
├────────────────────┼─────────────────────┼───────────────────────┤
│ Price data         │ PriceContext        │ Session only (memory) │
│ Price history      │ PriceContext        │ Session only (memory) │
│ Portfolio/Cash     │ PortfolioContext    │ localStorage          │
│ Positions          │ PortfolioContext    │ localStorage          │
│ Trade history      │ PortfolioContext    │ localStorage (1000)   │
│ Open orders        │ OrderContext        │ localStorage          │
│ Watchlist          │ WatchlistContext    │ localStorage          │
│ Preferences        │ PreferencesContext  │ localStorage          │
│ Selected symbol    │ WatchlistContext    │ Session only          │
│ Toast queue        │ ToastContext        │ Session only          │
│ Modal state        │ Component local     │ None                  │
│ Form state         │ Component local     │ None                  │
│ Chart viewport     │ Chart component     │ None                  │
└────────────────────┴─────────────────────┴───────────────────────┘
```

### 5.3 State Flow Patterns

#### Pattern 1: Unidirectional Data Flow
```
User Action → Dispatch → Reducer → New State → Re-render
                           ↓
                    Side Effect (persist)
```

#### Pattern 2: Event-Driven Updates (Price Engine)
```
Timer Tick → Price Engine → Price Update Event → Subscribers → Re-render
                                    ↓
                            Order Engine (check limits)
```

#### Pattern 3: Command Pattern (Trade Execution)
```
User Submit → Validate → Create Command → Execute → Update Portfolio → Persist → Notify
                ↓                                        ↓
           Show Error                              Toast Success
```

### 5.4 Context Structure

```typescript
// src/contexts/PriceContext.tsx

interface PriceContextValue {
  // State
  prices: ReadonlyMap<string, PriceData>;
  history: ReadonlyMap<string, PriceHistory>;
  engineStatus: 'running' | 'paused' | 'error';
  
  // Actions
  subscribeToSymbol: (symbol: string) => void;
  unsubscribeFromSymbol: (symbol: string) => void;
  pauseEngine: () => void;
  resumeEngine: () => void;
  setUpdateInterval: (ms: number) => void;
  
  // Selectors
  getPrice: (symbol: string) => PriceData | undefined;
  getHistory: (symbol: string, timeframe: Timeframe) => PricePoint[];
}

// src/contexts/PortfolioContext.tsx

interface PortfolioContextValue {
  // State
  portfolio: Portfolio;
  trades: readonly Trade[];
  
  // Derived (computed)
  totalValue: number;
  totalUnrealizedPL: number;
  positionBySymbol: (symbol: string) => Position | undefined;
  
  // Actions
  executeTrade: (request: TradeRequest) => Promise<TradeResult>;
  resetPortfolio: () => void;
  setInitialCash: (amount: number) => void;
}

// src/contexts/OrderContext.tsx

interface OrderContextValue {
  // State
  openOrders: readonly LimitOrder[];
  
  // Actions
  placeOrder: (request: OrderRequest) => Promise<OrderResult>;
  cancelOrder: (orderId: string) => Promise<boolean>;
  modifyOrder: (update: OrderUpdate) => Promise<boolean>;
  
  // Selectors
  getOrdersForSymbol: (symbol: string) => LimitOrder[];
}
```

### 5.5 Subscription Model

```typescript
// Price Engine uses Observer pattern for efficient updates

interface PriceSubscriber {
  id: string;
  symbols: Set<string>;
  callback: (updates: Map<string, PriceData>) => void;
}

class PriceEngine {
  private subscribers: Map<string, PriceSubscriber> = new Map();
  private prices: Map<string, PriceData> = new Map();
  
  subscribe(symbols: string[], callback: (updates: Map<string, PriceData>) => void): string {
    const id = crypto.randomUUID();
    this.subscribers.set(id, {
      id,
      symbols: new Set(symbols),
      callback,
    });
    return id;
  }
  
  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }
  
  private notifySubscribers(updates: Map<string, PriceData>): void {
    for (const subscriber of this.subscribers.values()) {
      const relevantUpdates = new Map<string, PriceData>();
      for (const [symbol, data] of updates) {
        if (subscriber.symbols.has(symbol) || subscriber.symbols.has('*')) {
          relevantUpdates.set(symbol, data);
        }
      }
      if (relevantUpdates.size > 0) {
        subscriber.callback(relevantUpdates);
      }
    }
  }
}
```

---

## 6. Engine Designs

### 6.1 Price Engine (Singleton, Observer Pattern)

```typescript
// src/engines/PriceEngine.ts

import { SYMBOLS } from '@/domain/constants/symbols';

type PriceSubscriber = (prices: Map<string, PriceData>) => void;
type HistorySubscriber = (symbol: string, point: PricePoint) => void;

class PriceEngine {
  private static instance: PriceEngine | null = null;
  
  // State
  private prices: Map<string, PriceData> = new Map();
  private history: Map<string, PricePoint[]> = new Map();
  private intervalId: number | null = null;
  private config: PriceEngineConfig;
  
  // Subscribers
  private priceSubscribers: Set<PriceSubscriber> = new Set();
  private historySubscribers: Set<HistorySubscriber> = new Set();
  
  // Constants
  private static readonly MAX_HISTORY_POINTS = 500;
  private static readonly MIN_PRICE = 0.01;
  private static readonly MAX_PRICE = 999_999.99;
  private static readonly MAX_TICK_CHANGE = 0.05; // 5%
  
  private constructor(config: PriceEngineConfig) {
    this.config = config;
    this.initializePrices();
  }
  
  static getInstance(config?: PriceEngineConfig): PriceEngine {
    if (!PriceEngine.instance) {
      PriceEngine.instance = new PriceEngine(config ?? DEFAULT_CONFIG);
    }
    return PriceEngine.instance;
  }
  
  static resetInstance(): void {
    if (PriceEngine.instance) {
      PriceEngine.instance.stop();
      PriceEngine.instance = null;
    }
  }
  
  // Lifecycle
  start(): void {
    if (this.intervalId) return;
    this.intervalId = window.setInterval(
      () => this.tick(),
      this.config.updateIntervalMs
    );
  }
  
  stop(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  setUpdateInterval(ms: number): void {
    const clampedMs = Math.max(500, Math.min(5000, ms));
    this.config = { ...this.config, updateIntervalMs: clampedMs };
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }
  
  // Subscription
  subscribeToPrices(callback: PriceSubscriber): () => void {
    this.priceSubscribers.add(callback);
    // Immediately send current prices
    callback(new Map(this.prices));
    return () => this.priceSubscribers.delete(callback);
  }
  
  subscribeToHistory(callback: HistorySubscriber): () => void {
    this.historySubscribers.add(callback);
    return () => this.historySubscribers.delete(callback);
  }
  
  // Price access
  getPrice(symbol: string): PriceData | undefined {
    return this.prices.get(symbol);
  }
  
  getHistory(symbol: string): readonly PricePoint[] {
    return this.history.get(symbol) ?? [];
  }
  
  getAllPrices(): ReadonlyMap<string, PriceData> {
    return this.prices;
  }
  
  // Core simulation
  private tick(): void {
    const timestamp = Date.now();
    const updates = new Map<string, PriceData>();
    
    for (const symbolInfo of this.config.symbols) {
      const currentPrice = this.prices.get(symbolInfo.symbol);
      if (!currentPrice) continue;
      
      const newPrice = this.generateNextPrice(currentPrice, symbolInfo);
      this.prices.set(symbolInfo.symbol, newPrice);
      updates.set(symbolInfo.symbol, newPrice);
      
      // Update history
      const historyPoint = this.createHistoryPoint(newPrice, timestamp);
      this.addHistoryPoint(symbolInfo.symbol, historyPoint);
    }
    
    // Notify subscribers
    this.notifyPriceSubscribers(updates);
  }
  
  private generateNextPrice(current: PriceData, info: SymbolInfo): PriceData {
    const timestamp = Date.now();
    
    // Geometric Brownian Motion simulation
    const volatility = info.volatility * this.config.volatilityMultiplier;
    const drift = 0.0001; // Slight upward bias
    
    // Random component (Box-Muller transform)
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    // Calculate price change
    let changePercent = drift + volatility * z;
    
    // Clamp to max tick change
    changePercent = Math.max(-PriceEngine.MAX_TICK_CHANGE, 
                            Math.min(PriceEngine.MAX_TICK_CHANGE, changePercent));
    
    // Calculate new price
    let newPrice = current.price * (1 + changePercent);
    
    // Apply price bounds
    newPrice = Math.max(PriceEngine.MIN_PRICE, 
                       Math.min(PriceEngine.MAX_PRICE, newPrice));
    
    // Round to appropriate precision
    newPrice = this.roundPrice(newPrice);
    
    // Calculate bid/ask spread (0.01% - 0.05% based on price)
    const spreadPercent = 0.0001 + (0.0004 * Math.random());
    const halfSpread = newPrice * spreadPercent / 2;
    
    // Update session high/low
    const newHigh = Math.max(current.high, newPrice);
    const newLow = Math.min(current.low, newPrice);
    
    // Calculate volume (correlated with volatility)
    const baseVolume = 100000;
    const volumeMultiplier = 1 + Math.abs(changePercent) * 10;
    const volume = Math.floor(baseVolume * volumeMultiplier * (0.5 + Math.random()));
    
    return {
      symbol: current.symbol,
      price: newPrice,
      previousClose: current.previousClose,
      open: current.open,
      high: newHigh,
      low: newLow,
      bid: this.roundPrice(newPrice - halfSpread),
      ask: this.roundPrice(newPrice + halfSpread),
      spread: this.roundPrice(halfSpread * 2),
      change: this.roundPrice(newPrice - current.previousClose),
      changePercent: ((newPrice - current.previousClose) / current.previousClose) * 100,
      volume: current.volume + volume,
      timestamp,
    };
  }
  
  private roundPrice(price: number): number {
    if (price >= 1) {
      return Math.round(price * 100) / 100; // 2 decimal places
    }
    return Math.round(price * 10000) / 10000; // 4 decimal places for penny stocks
  }
  
  private initializePrices(): void {
    const timestamp = Date.now();
    
    for (const info of this.config.symbols) {
      const initialPrice: PriceData = {
        symbol: info.symbol,
        price: info.initialPrice,
        previousClose: info.initialPrice * (0.98 + Math.random() * 0.04),
        open: info.initialPrice,
        high: info.initialPrice,
        low: info.initialPrice,
        bid: info.initialPrice * 0.9999,
        ask: info.initialPrice * 1.0001,
        spread: info.initialPrice * 0.0002,
        change: 0,
        changePercent: 0,
        volume: 0,
        timestamp,
      };
      
      this.prices.set(info.symbol, initialPrice);
      this.history.set(info.symbol, []);
    }
  }
  
  private createHistoryPoint(price: PriceData, timestamp: number): PricePoint {
    return {
      timestamp,
      open: price.price, // Simplified; real OHLC would aggregate
      high: price.price,
      low: price.price,
      close: price.price,
      volume: price.volume,
    };
  }
  
  private addHistoryPoint(symbol: string, point: PricePoint): void {
    const history = this.history.get(symbol) ?? [];
    history.push(point);
    
    // Trim to max size
    if (history.length > PriceEngine.MAX_HISTORY_POINTS) {
      history.shift();
    }
    
    this.history.set(symbol, history);
    
    // Notify history subscribers
    for (const subscriber of this.historySubscribers) {
      subscriber(symbol, point);
    }
  }
  
  private notifyPriceSubscribers(updates: Map<string, PriceData>): void {
    for (const subscriber of this.priceSubscribers) {
      try {
        subscriber(updates);
      } catch (error) {
        console.error('Price subscriber error:', error);
      }
    }
  }
}

export { PriceEngine };
```

### 6.2 Trade Engine (Command Pattern)

```typescript
// src/engines/TradeEngine.ts

import type { Trade, TradeRequest, TradeResult, TradeValidation, Position, Portfolio } from '@/domain/models';
import { calculateWAC } from '@/domain/calculations/portfolio';
import { PriceEngine } from './PriceEngine';

interface TradeCommand {
  execute(): TradeResult;
  validate(): TradeValidation;
}

class MarketBuyCommand implements TradeCommand {
  constructor(
    private request: TradeRequest,
    private portfolio: Portfolio,
    private priceEngine: PriceEngine,
  ) {}
  
  validate(): TradeValidation {
    const errors: TradeValidationError[] = [];
    const price = this.priceEngine.getPrice(this.request.symbol);
    
    if (!price) {
      errors.push({ field: 'symbol', message: 'Symbol not found' });
      return { valid: false, errors, estimatedTotal: 0, estimatedPrice: 0 };
    }
    
    if (this.request.quantity <= 0) {
      errors.push({ field: 'quantity', message: 'Quantity must be positive' });
    }
    
    const estimatedPrice = price.ask; // Buy at ask
    const estimatedTotal = this.request.quantity * estimatedPrice;
    
    if (estimatedTotal > this.portfolio.cash) {
      errors.push({ 
        field: 'funds', 
        message: `Insufficient funds. Required: $${estimatedTotal.toFixed(2)}, Available: $${this.portfolio.cash.toFixed(2)}` 
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      estimatedTotal,
      estimatedPrice,
    };
  }
  
  execute(): TradeResult {
    const validation = this.validate();
    if (!validation.valid) {
      return {
        success: false,
        trade: this.createRejectedTrade(validation.errors[0]?.message ?? 'Validation failed'),
        error: validation.errors[0]?.message,
      };
    }
    
    const price = this.priceEngine.getPrice(this.request.symbol)!;
    const executionPrice = this.applySlippage(price.ask);
    const total = this.request.quantity * executionPrice;
    
    const trade: Trade = {
      id: crypto.randomUUID(),
      symbol: this.request.symbol,
      type: 'BUY',
      orderType: 'MARKET',
      quantity: this.request.quantity,
      requestedPrice: price.ask,
      executedPrice: executionPrice,
      total,
      status: 'EXECUTED',
      createdAt: Date.now(),
      executedAt: Date.now(),
    };
    
    return { success: true, trade };
  }
  
  private applySlippage(price: number): number {
    // ±0.1% slippage
    const slippage = (Math.random() - 0.5) * 0.002;
    return Math.round(price * (1 + slippage) * 100) / 100;
  }
  
  private createRejectedTrade(reason: string): Trade {
    return {
      id: crypto.randomUUID(),
      symbol: this.request.symbol,
      type: 'BUY',
      orderType: 'MARKET',
      quantity: this.request.quantity,
      requestedPrice: 0,
      executedPrice: null,
      total: 0,
      status: 'REJECTED',
      createdAt: Date.now(),
      executedAt: null,
      rejectionReason: reason,
    };
  }
}

class MarketSellCommand implements TradeCommand {
  constructor(
    private request: TradeRequest,
    private portfolio: Portfolio,
    private priceEngine: PriceEngine,
  ) {}
  
  validate(): TradeValidation {
    const errors: TradeValidationError[] = [];
    const price = this.priceEngine.getPrice(this.request.symbol);
    
    if (!price) {
      errors.push({ field: 'symbol', message: 'Symbol not found' });
      return { valid: false, errors, estimatedTotal: 0, estimatedPrice: 0 };
    }
    
    const position = this.portfolio.positions.find(p => p.symbol === this.request.symbol);
    const heldShares = position?.shares ?? 0;
    
    if (this.request.quantity <= 0) {
      errors.push({ field: 'quantity', message: 'Quantity must be positive' });
    }
    
    if (this.request.quantity > heldShares) {
      errors.push({
        field: 'shares',
        message: `Insufficient shares. You own ${heldShares}, attempted to sell ${this.request.quantity}`,
      });
    }
    
    const estimatedPrice = price.bid; // Sell at bid
    const estimatedTotal = this.request.quantity * estimatedPrice;
    
    return {
      valid: errors.length === 0,
      errors,
      estimatedTotal,
      estimatedPrice,
    };
  }
  
  execute(): TradeResult {
    const validation = this.validate();
    if (!validation.valid) {
      return {
        success: false,
        trade: this.createRejectedTrade(validation.errors[0]?.message ?? 'Validation failed'),
        error: validation.errors[0]?.message,
      };
    }
    
    const price = this.priceEngine.getPrice(this.request.symbol)!;
    const executionPrice = this.applySlippage(price.bid);
    const total = this.request.quantity * executionPrice;
    
    const trade: Trade = {
      id: crypto.randomUUID(),
      symbol: this.request.symbol,
      type: 'SELL',
      orderType: 'MARKET',
      quantity: this.request.quantity,
      requestedPrice: price.bid,
      executedPrice: executionPrice,
      total,
      status: 'EXECUTED',
      createdAt: Date.now(),
      executedAt: Date.now(),
    };
    
    return { success: true, trade };
  }
  
  // ... similar helper methods
}

// Trade Engine Facade
class TradeEngine {
  private lastTradeTime: number = 0;
  private static readonly THROTTLE_MS = 1000;
  
  constructor(
    private priceEngine: PriceEngine,
  ) {}
  
  validateTrade(request: TradeRequest, portfolio: Portfolio): TradeValidation {
    const command = this.createCommand(request, portfolio);
    return command.validate();
  }
  
  executeTrade(request: TradeRequest, portfolio: Portfolio): TradeResult {
    // Check throttle
    const now = Date.now();
    if (now - this.lastTradeTime < TradeEngine.THROTTLE_MS) {
      return {
        success: false,
        trade: this.createThrottledTrade(request),
        error: 'Please wait before executing another trade',
      };
    }
    
    const command = this.createCommand(request, portfolio);
    const result = command.execute();
    
    if (result.success) {
      this.lastTradeTime = now;
    }
    
    return result;
  }
  
  getThrottleRemaining(): number {
    const elapsed = Date.now() - this.lastTradeTime;
    return Math.max(0, TradeEngine.THROTTLE_MS - elapsed);
  }
  
  isThrottled(): boolean {
    return this.getThrottleRemaining() > 0;
  }
  
  private createCommand(request: TradeRequest, portfolio: Portfolio): TradeCommand {
    if (request.orderType === 'MARKET') {
      if (request.type === 'BUY') {
        return new MarketBuyCommand(request, portfolio, this.priceEngine);
      }
      return new MarketSellCommand(request, portfolio, this.priceEngine);
    }
    throw new Error('Limit orders should use OrderEngine');
  }
  
  private createThrottledTrade(request: TradeRequest): Trade {
    return {
      id: crypto.randomUUID(),
      symbol: request.symbol,
      type: request.type,
      orderType: request.orderType,
      quantity: request.quantity,
      requestedPrice: 0,
      executedPrice: null,
      total: 0,
      status: 'REJECTED',
      createdAt: Date.now(),
      executedAt: null,
      rejectionReason: 'Trade throttled - please wait 1 second between trades',
    };
  }
}

export { TradeEngine, MarketBuyCommand, MarketSellCommand };
```

### 6.3 Order Engine (Event-Driven)

```typescript
// src/engines/OrderEngine.ts

import type { LimitOrder, OrderRequest, TradeRequest, TradeResult } from '@/domain/models';
import { PriceEngine } from './PriceEngine';
import { TradeEngine } from './TradeEngine';

type OrderEventType = 'ORDER_PLACED' | 'ORDER_FILLED' | 'ORDER_CANCELLED' | 'ORDER_REJECTED';

interface OrderEvent {
  type: OrderEventType;
  order: LimitOrder;
  trade?: Trade;
}

type OrderEventListener = (event: OrderEvent) => void;

class OrderEngine {
  private orders: Map<string, LimitOrder> = new Map();
  private listeners: Set<OrderEventListener> = new Set();
  private unsubscribePrices: (() => void) | null = null;
  
  constructor(
    private priceEngine: PriceEngine,
    private tradeEngine: TradeEngine,
    private getPortfolio: () => Portfolio,
    private updatePortfolio: (updates: Partial<Portfolio>) => void,
  ) {}
  
  // Lifecycle
  start(): void {
    this.unsubscribePrices = this.priceEngine.subscribeToPrices(
      (prices) => this.checkOrders(prices)
    );
  }
  
  stop(): void {
    this.unsubscribePrices?.();
    this.unsubscribePrices = null;
  }
  
  // Event subscription
  addEventListener(listener: OrderEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  // Order management
  placeOrder(request: OrderRequest): LimitOrder | null {
    const portfolio = this.getPortfolio();
    
    // Validate order
    const validation = this.validateOrder(request, portfolio);
    if (!validation.valid) {
      console.error('Order validation failed:', validation.errors);
      return null;
    }
    
    const order: LimitOrder = {
      id: crypto.randomUUID(),
      symbol: request.symbol,
      type: request.type,
      quantity: request.quantity,
      filledQuantity: 0,
      limitPrice: request.limitPrice,
      status: 'OPEN',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fillHistory: [],
    };
    
    this.orders.set(order.id, order);
    this.emit({ type: 'ORDER_PLACED', order });
    
    return order;
  }
  
  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order || order.status !== 'OPEN') {
      return false;
    }
    
    const cancelledOrder: LimitOrder = {
      ...order,
      status: 'CANCELLED',
      updatedAt: Date.now(),
    };
    
    this.orders.set(orderId, cancelledOrder);
    this.emit({ type: 'ORDER_CANCELLED', order: cancelledOrder });
    
    return true;
  }
  
  modifyOrder(orderId: string, updates: { quantity?: number; limitPrice?: number }): boolean {
    const order = this.orders.get(orderId);
    if (!order || order.status !== 'OPEN') {
      return false;
    }
    
    const modifiedOrder: LimitOrder = {
      ...order,
      quantity: updates.quantity ?? order.quantity,
      limitPrice: updates.limitPrice ?? order.limitPrice,
      updatedAt: Date.now(),
    };
    
    this.orders.set(orderId, modifiedOrder);
    return true;
  }
  
  getOpenOrders(): LimitOrder[] {
    return Array.from(this.orders.values())
      .filter(o => o.status === 'OPEN')
      .sort((a, b) => a.createdAt - b.createdAt); // FIFO order
  }
  
  getOrdersForSymbol(symbol: string): LimitOrder[] {
    return this.getOpenOrders().filter(o => o.symbol === symbol);
  }
  
  // Price check (called on every price tick)
  private checkOrders(prices: Map<string, PriceData>): void {
    const openOrders = this.getOpenOrders();
    
    for (const order of openOrders) {
      const price = prices.get(order.symbol);
      if (!price) continue;
      
      if (this.shouldExecute(order, price)) {
        this.executeOrder(order, price);
      }
    }
  }
  
  private shouldExecute(order: LimitOrder, price: PriceData): boolean {
    if (order.type === 'BUY') {
      // Buy limit: execute when ask <= limit price
      return price.ask <= order.limitPrice;
    } else {
      // Sell limit: execute when bid >= limit price
      return price.bid >= order.limitPrice;
    }
  }
  
  private executeOrder(order: LimitOrder, price: PriceData): void {
    const portfolio = this.getPortfolio();
    const remainingQty = order.quantity - order.filledQuantity;
    
    // Create trade request
    const tradeRequest: TradeRequest = {
      symbol: order.symbol,
      type: order.type,
      orderType: 'LIMIT',
      quantity: remainingQty,
      limitPrice: order.limitPrice,
    };
    
    // Execute via trade engine (bypasses throttle for limit orders)
    const executionPrice = order.type === 'BUY' ? price.ask : price.bid;
    
    // Validate we still have funds/shares
    if (order.type === 'BUY') {
      const total = remainingQty * executionPrice;
      if (total > portfolio.cash) {
        // Insufficient funds - reject order
        this.rejectOrder(order, 'Insufficient funds for execution');
        return;
      }
    } else {
      const position = portfolio.positions.find(p => p.symbol === order.symbol);
      if (!position || position.shares < remainingQty) {
        this.rejectOrder(order, 'Insufficient shares for execution');
        return;
      }
    }
    
    // Execute trade
    const trade: Trade = {
      id: crypto.randomUUID(),
      symbol: order.symbol,
      type: order.type,
      orderType: 'LIMIT',
      quantity: remainingQty,
      requestedPrice: order.limitPrice,
      executedPrice: executionPrice,
      total: remainingQty * executionPrice,
      status: 'EXECUTED',
      createdAt: order.createdAt,
      executedAt: Date.now(),
    };
    
    // Update order
    const fill: OrderFill = {
      quantity: remainingQty,
      price: executionPrice,
      timestamp: Date.now(),
      tradeId: trade.id,
    };
    
    const filledOrder: LimitOrder = {
      ...order,
      filledQuantity: order.quantity,
      status: 'FILLED',
      updatedAt: Date.now(),
      fillHistory: [...order.fillHistory, fill],
    };
    
    this.orders.set(order.id, filledOrder);
    this.emit({ type: 'ORDER_FILLED', order: filledOrder, trade });
  }
  
  private rejectOrder(order: LimitOrder, reason: string): void {
    const rejectedOrder: LimitOrder = {
      ...order,
      status: 'CANCELLED',
      updatedAt: Date.now(),
    };
    
    this.orders.set(order.id, rejectedOrder);
    this.emit({ type: 'ORDER_REJECTED', order: rejectedOrder });
  }
  
  private validateOrder(request: OrderRequest, portfolio: Portfolio): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const price = this.priceEngine.getPrice(request.symbol);
    
    if (!price) {
      errors.push('Invalid symbol');
      return { valid: false, errors };
    }
    
    if (request.quantity <= 0) {
      errors.push('Quantity must be positive');
    }
    
    if (request.limitPrice <= 0) {
      errors.push('Limit price must be positive');
    }
    
    // Validate limit price makes sense
    if (request.type === 'BUY' && request.limitPrice > price.ask) {
      // Buy limit above market - warn but allow (will execute immediately)
    }
    
    if (request.type === 'SELL' && request.limitPrice < price.bid) {
      // Sell limit below market - warn but allow (will execute immediately)
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  private emit(event: OrderEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Order event listener error:', error);
      }
    }
  }
  
  // Persistence
  loadOrders(orders: LimitOrder[]): void {
    this.orders.clear();
    for (const order of orders) {
      if (order.status === 'OPEN') {
        this.orders.set(order.id, order);
      }
    }
  }
  
  serializeOrders(): LimitOrder[] {
    return Array.from(this.orders.values());
  }
}

export { OrderEngine };
export type { OrderEvent, OrderEventType, OrderEventListener };
```

---

## 7. Data Flow

### 7.1 Price Update Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PRICE UPDATE FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. Timer Tick
   │
   ▼
┌──────────────────┐
│   PriceEngine    │
│   tick()         │
│   - Generate new │
│     prices for   │
│     all symbols  │
│   - Update       │
│     history      │
└────────┬─────────┘
         │
         ▼
2. Notify Subscribers
   │
   ├────────────────────────┐
   │                        │
   ▼                        ▼
┌──────────────────┐  ┌──────────────────┐
│  PriceContext    │  │   OrderEngine    │
│  - Update state  │  │  - Check limits  │
│  - Trigger       │  │  - Auto-execute  │
│    re-render     │  │    if matched    │
└────────┬─────────┘  └──────────────────┘
         │
         ▼
3. React Re-renders
   │
   ├───────────────┬───────────────┬───────────────┐
   │               │               │               │
   ▼               ▼               ▼               ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐
│Watchlist│  │  Chart  │  │OrderForm│  │PositionRow  │
│ Items   │  │ Canvas  │  │ Preview │  │(with prices)│
└─────────┘  └─────────┘  └─────────┘  └─────────────┘

Performance Notes:
- PriceContext uses Map for O(1) lookups
- Components subscribe only to symbols they display
- Chart uses requestAnimationFrame for smooth updates
- Position values computed on-demand, not stored
```

### 7.2 Trade Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TRADE EXECUTION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

User Action
   │
   ▼
┌──────────────────┐
│   OrderPanel     │
│   handleSubmit() │
└────────┬─────────┘
         │
         ▼
1. Create TradeRequest
   │
   ▼
┌──────────────────┐       ┌──────────────────┐
│   TradeEngine    │◄──────│  Check Throttle  │
│   validateTrade()│       │  (1s cooldown)   │
└────────┬─────────┘       └──────────────────┘
         │
         ▼
2. Validation
   │
   ├──── INVALID ───► Show Error Toast / Highlight Fields
   │
   │ VALID
   ▼
┌──────────────────┐
│  Confirmation    │
│    Dialog        │
│   - Show details │
│   - Await user   │
└────────┬─────────┘
         │
         ├──── CANCEL ───► Close Dialog
         │
         │ CONFIRM
         ▼
┌──────────────────┐
│   TradeEngine    │
│   executeTrade() │
│   - Apply slip   │
│   - Create Trade │
└────────┬─────────┘
         │
         ▼
3. Update Portfolio
   │
   ▼
┌──────────────────┐
│PortfolioContext  │
│  dispatch({      │
│    type: 'TRADE',│
│    trade         │
│  })              │
└────────┬─────────┘
         │
         ├───────────────────────────────────┐
         │                                   │
         ▼                                   ▼
┌──────────────────┐               ┌──────────────────┐
│  Update State    │               │    Persist       │
│  - Adjust cash   │               │  - Save trades   │
│  - Update/create │               │  - Save portfolio│
│    position      │               │    to localStorage
│  - Calculate WAC │               └──────────────────┘
│  - Record trade  │
└────────┬─────────┘
         │
         ▼
4. Show Success Toast
```

### 7.3 Limit Order Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LIMIT ORDER FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

                     PLACEMENT                              EXECUTION

User submits order                              Price Engine ticks
       │                                                │
       ▼                                                ▼
┌──────────────────┐                        ┌──────────────────┐
│   OrderPanel     │                        │   OrderEngine    │
│   (LIMIT type)   │                        │   checkOrders()  │
└────────┬─────────┘                        └────────┬─────────┘
         │                                           │
         ▼                                           ▼
┌──────────────────┐                        ┌──────────────────┐
│   OrderEngine    │                        │ For each open    │
│   placeOrder()   │                        │ order, check if  │
│   - Validate     │                        │ price matches    │
│   - Create order │                        └────────┬─────────┘
│   - Store in Map │                                 │
└────────┬─────────┘                                 │
         │                                  ┌────────┴────────┐
         ▼                                  │                 │
┌──────────────────┐                 NO MATCH           MATCH
│   Emit event:    │                    │                 │
│   ORDER_PLACED   │                    │                 ▼
└────────┬─────────┘                    │        ┌───────────────────┐
         │                              │        │ Execute in FIFO   │
         ▼                              │        │ - Validate funds  │
┌──────────────────┐                    │        │ - Create trade    │
│   OrderContext   │                    │        │ - Update portfolio│
│   - Add to state │                    │        │ - Mark as FILLED  │
│   - Persist      │                    │        └─────────┬─────────┘
└──────────────────┘                    │                  │
                                        │                  ▼
                                        │        ┌──────────────────┐
                                  Continue       │   Emit event:    │
                                  waiting        │   ORDER_FILLED   │
                                                 └─────────┬────────┘
                                                           │
                                                           ▼
                                                 ┌──────────────────┐
                                                 │  ToastProvider   │
                                                 │  - Show fill     │
                                                 │    notification  │
                                                 └──────────────────┘
```

### 7.4 Persistence Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERSISTENCE FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                    SAVE                                    LOAD

State Change Event                              App Initialization
       │                                                │
       ▼                                                ▼
┌──────────────────┐                        ┌──────────────────┐
│ Context dispatch │                        │  App.tsx         │
│ (trade, order,   │                        │  useEffect([])   │
│  pref change)    │                        └────────┬─────────┘
└────────┬─────────┘                                 │
         │                                           ▼
         ▼                                  ┌──────────────────┐
┌──────────────────┐                        │ StorageService   │
│  useEffect in    │                        │   loadAll()      │
│  Provider        │                        │   - Read keys    │
│  - Debounce 500ms│                        │   - Parse JSON   │
│  - Serialize     │                        │   - Validate     │
└────────┬─────────┘                        │   - Migrate      │
         │                                  └────────┬─────────┘
         ▼                                           │
┌──────────────────┐                                 │
│ StorageService   │                        ┌────────┴────────┐
│   save(key, data)│                        │                 │
│   - Stringify    │                 SUCCESS             FAILURE
│   - Compress?    │                    │                    │
│   - Write        │                    │                    ▼
└────────┬─────────┘                    │         ┌──────────────────┐
         │                              │         │ Use defaults     │
         │                              │         │ Show warning     │
┌────────┴────────┐                     │         │ banner           │
│                 │                     │         └──────────────────┘
SUCCESS       QUOTA_ERROR               │
   │              │                     ▼
   │              ▼             ┌──────────────────┐
   │    ┌──────────────────┐    │ Initialize       │
   │    │ Trigger FIFO     │    │ Contexts with    │
   │    │ pruning on       │    │ loaded data      │
   │    │ trade history    │    └──────────────────┘
   │    │ (keep 1000)      │
   │    └──────────────────┘
   │
   ▼
  Done
```

---

## 8. Performance Strategy

### 8.1 Rendering Optimization

| Technique | Application | Expected Impact |
|-----------|-------------|-----------------|
| **React.memo** | WatchlistItem, PositionRow, CandleStick | Prevent re-render when props unchanged |
| **useMemo** | Portfolio calculations, chart data transforms | Avoid recalculation on every render |
| **useCallback** | Event handlers passed to children | Stable references for memo |
| **Virtual scrolling** | Trade history (1000 items) | Only render visible rows |
| **Subscription filtering** | PriceContext | Components only receive relevant symbol updates |
| **Debouncing** | Chart crosshair, localStorage saves | Reduce update frequency |
| **requestAnimationFrame** | Chart updates | Sync with browser paint cycle |

### 8.2 Chart Performance

```typescript
// Chart rendering optimizations

class ChartRenderer {
  private canvas: SVGSVGElement;
  private rafId: number | null = null;
  private pendingData: PricePoint[] | null = null;
  
  // Batch updates with rAF
  scheduleRender(data: PricePoint[]): void {
    this.pendingData = data;
    
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.render();
        this.rafId = null;
      });
    }
  }
  
  private render(): void {
    if (!this.pendingData) return;
    
    const data = this.pendingData;
    this.pendingData = null;
    
    // Only render last 200 points (rolling window)
    const visibleData = data.slice(-200);
    
    // Use document fragment for batch DOM updates
    const fragment = document.createDocumentFragment();
    
    // Generate path for line chart
    const pathD = this.generatePath(visibleData);
    
    // Update single path element (not individual points)
    this.updatePath(pathD);
  }
  
  // Efficient path generation
  private generatePath(data: PricePoint[]): string {
    if (data.length === 0) return '';
    
    const { xScale, yScale } = this.getScales(data);
    
    return data.reduce((path, point, i) => {
      const x = xScale(point.timestamp);
      const y = yScale(point.close);
      return path + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    }, '');
  }
}
```

### 8.3 Memory Management

```typescript
// Memory-conscious data structures

// Price history with automatic pruning
class BoundedArray<T> {
  private items: T[] = [];
  
  constructor(private maxSize: number) {}
  
  push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.maxSize) {
      this.items.shift(); // Remove oldest
    }
  }
  
  toArray(): readonly T[] {
    return this.items;
  }
  
  get length(): number {
    return this.items.length;
  }
}

// Trade history pruning
function pruneTradeHistory(trades: Trade[], maxSize = 1000): Trade[] {
  if (trades.length <= maxSize) return trades;
  
  // Sort by timestamp descending, keep newest
  return [...trades]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, maxSize);
}

// Cleanup on unmount
function usePriceSubscription(symbols: string[]) {
  const priceEngine = usePriceEngine();
  
  useEffect(() => {
    const unsubscribe = priceEngine.subscribe(symbols);
    return () => {
      unsubscribe(); // Cleanup subscription
    };
  }, [symbols.join(',')]);
}
```

### 8.4 Subscription Isolation

```typescript
// Selective subscription for minimal re-renders

// Bad: Every component gets all prices
const { prices } = usePriceContext(); // Triggers on ANY price change

// Good: Component only gets specific symbol
function useSymbolPrice(symbol: string): PriceData | undefined {
  const priceEngine = usePriceEngine();
  const [price, setPrice] = useState<PriceData | undefined>(
    () => priceEngine.getPrice(symbol)
  );
  
  useEffect(() => {
    const unsubscribe = priceEngine.subscribeToPrices((updates) => {
      const update = updates.get(symbol);
      if (update) {
        setPrice(update);
      }
    });
    return unsubscribe;
  }, [symbol, priceEngine]);
  
  return price;
}

// Usage in WatchlistItem
function WatchlistItem({ symbol }: { symbol: string }) {
  const price = useSymbolPrice(symbol); // Only re-renders for this symbol
  return <div>{price?.price}</div>;
}
```

---

## 9. Persistence Design

### 9.1 Storage Schema

```typescript
// src/infrastructure/storage/schema.ts

/**
 * Schema version for migrations
 * Increment on breaking changes
 */
export const STORAGE_SCHEMA_VERSION = '1.0.0';

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  VERSION: 'tradepulse_version',
  PORTFOLIO: 'tradepulse_portfolio',
  TRADES: 'tradepulse_trades',
  ORDERS: 'tradepulse_orders',
  WATCHLIST: 'tradepulse_watchlist',
  PREFERENCES: 'tradepulse_preferences',
  ANALYTICS: 'tradepulse_analytics', // Optional: usage tracking
} as const;

/**
 * Stored portfolio state
 */
interface StoredPortfolio {
  cash: number;
  positions: StoredPosition[];
  realizedPL: number;
  initialCash: number;
  lastUpdated: number;
}

interface StoredPosition {
  symbol: string;
  shares: number;
  avgCost: number;
}

/**
 * Stored trade record (trimmed for storage)
 */
interface StoredTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  executedPrice: number;
  total: number;
  createdAt: number;
  executedAt: number;
}

/**
 * Stored limit order
 */
interface StoredOrder {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  limitPrice: number;
  status: string;
  createdAt: number;
}

/**
 * Full storage schema
 */
interface StorageSchema {
  version: string;
  portfolio: StoredPortfolio;
  trades: StoredTrade[];
  orders: StoredOrder[];
  watchlist: string[];
  preferences: Preferences;
}
```

### 9.2 StorageService Implementation

```typescript
// src/infrastructure/storage/StorageService.ts

class StorageService {
  private static readonly MAX_TRADE_HISTORY = 1000;
  private isAvailable: boolean;
  
  constructor() {
    this.isAvailable = this.checkAvailability();
  }
  
  private checkAvailability(): boolean {
    try {
      const testKey = '__tradepulse_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
  
  isStorageAvailable(): boolean {
    return this.isAvailable;
  }
  
  // Save with error handling
  save<T>(key: string, data: T): StorageResult {
    if (!this.isAvailable) {
      return { success: false, error: 'localStorage not available' };
    }
    
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      return { success: true };
    } catch (error) {
      if (this.isQuotaError(error)) {
        return { success: false, error: 'QUOTA_EXCEEDED' };
      }
      return { success: false, error: String(error) };
    }
  }
  
  // Load with validation
  load<T>(key: string, validator?: (data: unknown) => data is T): T | null {
    if (!this.isAvailable) return null;
    
    try {
      const serialized = localStorage.getItem(key);
      if (!serialized) return null;
      
      const data = JSON.parse(serialized);
      
      if (validator && !validator(data)) {
        console.warn(`Invalid data for key ${key}, returning null`);
        return null;
      }
      
      return data as T;
    } catch (error) {
      console.error(`Failed to load ${key}:`, error);
      return null;
    }
  }
  
  // Save portfolio with trade pruning
  savePortfolioData(
    portfolio: StoredPortfolio,
    trades: StoredTrade[]
  ): StorageResult {
    // Prune trades if needed
    const prunedTrades = trades.length > StorageService.MAX_TRADE_HISTORY
      ? trades.slice(-StorageService.MAX_TRADE_HISTORY)
      : trades;
    
    const portfolioResult = this.save(STORAGE_KEYS.PORTFOLIO, portfolio);
    const tradesResult = this.save(STORAGE_KEYS.TRADES, prunedTrades);
    
    if (!portfolioResult.success || !tradesResult.success) {
      // Try to recover from quota error
      if (tradesResult.error === 'QUOTA_EXCEEDED') {
        const aggressivelyPruned = prunedTrades.slice(-500);
        return this.save(STORAGE_KEYS.TRADES, aggressivelyPruned);
      }
    }
    
    return portfolioResult;
  }
  
  // Clear all data
  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
  
  // Export all data
  exportAll(): StorageSchema | null {
    return {
      version: this.load(STORAGE_KEYS.VERSION) ?? STORAGE_SCHEMA_VERSION,
      portfolio: this.load(STORAGE_KEYS.PORTFOLIO) ?? DEFAULT_PORTFOLIO,
      trades: this.load(STORAGE_KEYS.TRADES) ?? [],
      orders: this.load(STORAGE_KEYS.ORDERS) ?? [],
      watchlist: this.load(STORAGE_KEYS.WATCHLIST) ?? [],
      preferences: this.load(STORAGE_KEYS.PREFERENCES) ?? DEFAULT_PREFERENCES,
    };
  }
  
  // Import data
  importAll(data: StorageSchema): StorageResult {
    try {
      this.save(STORAGE_KEYS.VERSION, data.version);
      this.save(STORAGE_KEYS.PORTFOLIO, data.portfolio);
      this.save(STORAGE_KEYS.TRADES, data.trades);
      this.save(STORAGE_KEYS.ORDERS, data.orders);
      this.save(STORAGE_KEYS.WATCHLIST, data.watchlist);
      this.save(STORAGE_KEYS.PREFERENCES, data.preferences);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
  
  private isQuotaError(error: unknown): boolean {
    return (
      error instanceof DOMException &&
      (error.code === 22 || // Legacy
        error.code === 1014 || // Firefox
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
  }
  
  // Get storage usage stats
  getUsageStats(): { used: number; available: number; percentUsed: number } {
    let used = 0;
    for (const key of Object.values(STORAGE_KEYS)) {
      const item = localStorage.getItem(key);
      if (item) {
        used += item.length * 2; // UTF-16 = 2 bytes per char
      }
    }
    
    const available = 5 * 1024 * 1024; // Assume 5MB limit
    return {
      used,
      available,
      percentUsed: (used / available) * 100,
    };
  }
}

interface StorageResult {
  success: boolean;
  error?: string;
}

export { StorageService, STORAGE_KEYS };
```

### 9.3 Data Migration Strategy

```typescript
// src/infrastructure/storage/migrations.ts

interface Migration {
  version: string;
  up: (data: unknown) => unknown;
  down: (data: unknown) => unknown;
}

const MIGRATIONS: Migration[] = [
  {
    version: '1.0.0',
    up: (data) => data, // Initial version, no migration
    down: (data) => data,
  },
  // Future migrations:
  // {
  //   version: '1.1.0',
  //   up: (data) => {
  //     // Add new field with default
  //     return { ...data, newField: 'default' };
  //   },
  //   down: (data) => {
  //     const { newField, ...rest } = data;
  //     return rest;
  //   },
  // },
];

class MigrationService {
  constructor(private storage: StorageService) {}
  
  migrate(): void {
    const storedVersion = this.storage.load<string>(STORAGE_KEYS.VERSION);
    const currentVersion = STORAGE_SCHEMA_VERSION;
    
    if (!storedVersion) {
      // Fresh install
      this.storage.save(STORAGE_KEYS.VERSION, currentVersion);
      return;
    }
    
    if (storedVersion === currentVersion) {
      return; // No migration needed
    }
    
    // Find applicable migrations
    const startIndex = MIGRATIONS.findIndex(m => m.version === storedVersion);
    const endIndex = MIGRATIONS.findIndex(m => m.version === currentVersion);
    
    if (startIndex === -1 || endIndex === -1) {
      console.warn('Unknown migration path, skipping');
      return;
    }
    
    // Apply migrations in order
    for (let i = startIndex + 1; i <= endIndex; i++) {
      const migration = MIGRATIONS[i];
      console.log(`Applying migration to ${migration.version}`);
      
      // Migrate each storage key
      this.migrateKey(STORAGE_KEYS.PORTFOLIO, migration);
      this.migrateKey(STORAGE_KEYS.TRADES, migration);
      this.migrateKey(STORAGE_KEYS.PREFERENCES, migration);
    }
    
    // Update version
    this.storage.save(STORAGE_KEYS.VERSION, currentVersion);
  }
  
  private migrateKey(key: string, migration: Migration): void {
    const data = this.storage.load(key);
    if (data) {
      const migrated = migration.up(data);
      this.storage.save(key, migrated);
    }
  }
}
```

---

## 10. Error Handling Strategy

### 10.1 Error Boundary Architecture

```typescript
// src/components/ErrorBoundary.tsx

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }
  
  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };
  
  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <ErrorFallback 
          error={this.state.error} 
          onReset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  return (
    <div className="error-fallback">
      <h2>Something went wrong</h2>
      <p>{error?.message ?? 'An unexpected error occurred'}</p>
      <button onClick={onReset}>Try Again</button>
      <button onClick={() => window.location.reload()}>Refresh Page</button>
    </div>
  );
}
```

### 10.2 Error Types and Handling

```typescript
// src/domain/errors.ts

// Custom error classes
class TradePulseError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true,
  ) {
    super(message);
    this.name = 'TradePulseError';
  }
}

class ValidationError extends TradePulseError {
  constructor(
    message: string,
    public field: string,
  ) {
    super(message, 'VALIDATION_ERROR', true);
    this.name = 'ValidationError';
  }
}

class InsufficientFundsError extends TradePulseError {
  constructor(required: number, available: number) {
    super(
      `Insufficient funds. Required: $${required.toFixed(2)}, Available: $${available.toFixed(2)}`,
      'INSUFFICIENT_FUNDS',
      true,
    );
    this.name = 'InsufficientFundsError';
  }
}

class InsufficientSharesError extends TradePulseError {
  constructor(symbol: string, required: number, available: number) {
    super(
      `Insufficient shares. You own ${available} ${symbol}, attempted to sell ${required}`,
      'INSUFFICIENT_SHARES',
      true,
    );
    this.name = 'InsufficientSharesError';
  }
}

class StorageError extends TradePulseError {
  constructor(operation: 'read' | 'write', key: string) {
    super(
      `Storage ${operation} failed for ${key}`,
      'STORAGE_ERROR',
      true,
    );
    this.name = 'StorageError';
  }
}

// Error handler hook
function useErrorHandler() {
  const { addToast } = useToast();
  
  const handleError = useCallback((error: unknown) => {
    if (error instanceof TradePulseError) {
      addToast({
        type: 'error',
        message: error.message,
        duration: error.recoverable ? 5000 : undefined, // Persistent if unrecoverable
      });
      
      // Log for debugging
      console.error(`[${error.code}]`, error.message);
    } else if (error instanceof Error) {
      addToast({
        type: 'error',
        message: 'An unexpected error occurred',
        duration: 5000,
      });
      console.error('Unexpected error:', error);
    }
  }, [addToast]);
  
  return { handleError };
}
```

### 10.3 Defensive Programming for Edge Cases

```typescript
// src/domain/calculations/portfolio.ts

/**
 * Safely calculate position value with defensive checks
 */
function calculatePositionValue(position: Position, price: number): number {
  // Validate inputs
  if (!Number.isFinite(position.shares) || position.shares < 0) {
    console.error('Invalid shares value:', position.shares);
    return 0;
  }
  
  if (!Number.isFinite(price) || price <= 0) {
    console.error('Invalid price:', price);
    return 0;
  }
  
  const value = position.shares * price;
  
  // Check for overflow
  if (!Number.isFinite(value)) {
    console.error('Value calculation overflow');
    return Number.MAX_SAFE_INTEGER;
  }
  
  return Math.round(value * 100) / 100;
}

/**
 * Safely update cash balance with negative protection
 */
function adjustCash(currentCash: number, adjustment: number): number {
  const newCash = currentCash + adjustment;
  
  // EC-003: Negative balance protection
  if (newCash < 0) {
    console.error('Cash would go negative, clamping to 0', {
      currentCash,
      adjustment,
      wouldBe: newCash,
    });
    return 0;
  }
  
  return Math.round(newCash * 100) / 100;
}

/**
 * Calculate WAC with edge case handling
 */
function calculateWAC(
  existingShares: number,
  existingAvgCost: number,
  newShares: number,
  newPrice: number,
): number {
  // Edge case: no existing position
  if (existingShares === 0) {
    return newPrice;
  }
  
  // Edge case: selling all shares (should not reach here)
  if (existingShares + newShares === 0) {
    return 0;
  }
  
  const totalCost = (existingShares * existingAvgCost) + (newShares * newPrice);
  const totalShares = existingShares + newShares;
  
  // Edge case: division safety
  if (totalShares <= 0) {
    console.error('Invalid total shares in WAC calculation');
    return existingAvgCost;
  }
  
  return Math.round((totalCost / totalShares) * 100) / 100;
}
```

---

## 11. Testing Strategy

### 11.1 Test Pyramid

```
                    ┌───────────────┐
                    │   E2E Tests   │  ← 10%
                    │  (Playwright) │
                    └───────────────┘
                   ┌─────────────────┐
                   │ Integration     │  ← 30%
                   │ Tests           │
                   │(Component+Hook) │
                   └─────────────────┘
                  ┌───────────────────┐
                  │    Unit Tests     │  ← 60%
                  │ (Domain/Engine)   │
                  └───────────────────┘
```

### 11.2 Unit Test Coverage

```typescript
// src/domain/calculations/__tests__/portfolio.test.ts

import { describe, it, expect } from 'vitest';
import { calculateWAC, calculatePositionPL, calculatePortfolioValue } from '../portfolio';

describe('calculateWAC', () => {
  it('should return new price for first purchase', () => {
    expect(calculateWAC(0, 0, 100, 50)).toBe(50);
  });
  
  it('should calculate weighted average correctly', () => {
    // 100 shares at $50, buying 50 more at $60
    // (100 * 50 + 50 * 60) / 150 = 53.33
    expect(calculateWAC(100, 50, 50, 60)).toBeCloseTo(53.33, 2);
  });
  
  it('should handle edge case of zero new shares', () => {
    expect(calculateWAC(100, 50, 0, 60)).toBe(50);
  });
});

// src/engines/__tests__/PriceEngine.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PriceEngine } from '../PriceEngine';

describe('PriceEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
    PriceEngine.resetInstance();
  });
  
  it('should be a singleton', () => {
    const engine1 = PriceEngine.getInstance();
    const engine2 = PriceEngine.getInstance();
    expect(engine1).toBe(engine2);
  });
  
  it('should generate prices for all symbols on tick', () => {
    const engine = PriceEngine.getInstance();
    const subscriber = vi.fn();
    
    engine.subscribeToPrices(subscriber);
    engine.start();
    
    // Initial call
    expect(subscriber).toHaveBeenCalledTimes(1);
    
    // Advance timer
    vi.advanceTimersByTime(1000);
    expect(subscriber).toHaveBeenCalledTimes(2);
  });
  
  it('should keep prices within bounds', () => {
    const engine = PriceEngine.getInstance();
    engine.start();
    
    // Run many ticks
    for (let i = 0; i < 1000; i++) {
      vi.advanceTimersByTime(1000);
    }
    
    const prices = engine.getAllPrices();
    for (const [, price] of prices) {
      expect(price.price).toBeGreaterThanOrEqual(0.01);
      expect(price.price).toBeLessThanOrEqual(999999.99);
    }
  });
});

// src/engines/__tests__/TradeEngine.test.ts

describe('TradeEngine', () => {
  it('should validate insufficient funds', () => {
    const portfolio = { cash: 100, positions: [], realizedPL: 0, initialCash: 100000 };
    const request = { symbol: 'ACME', type: 'BUY', orderType: 'MARKET', quantity: 10 };
    
    const engine = new TradeEngine(mockPriceEngine);
    const validation = engine.validateTrade(request, portfolio);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors[0].field).toBe('funds');
  });
  
  it('should throttle rapid trades', async () => {
    const engine = new TradeEngine(mockPriceEngine);
    
    // First trade succeeds
    const result1 = engine.executeTrade(validRequest, validPortfolio);
    expect(result1.success).toBe(true);
    
    // Immediate second trade is throttled
    const result2 = engine.executeTrade(validRequest, validPortfolio);
    expect(result2.success).toBe(false);
    expect(result2.error).toContain('throttle');
    
    // After 1 second, trade succeeds
    await new Promise(r => setTimeout(r, 1000));
    const result3 = engine.executeTrade(validRequest, validPortfolio);
    expect(result3.success).toBe(true);
  });
});
```

### 11.3 Component Testing

```typescript
// src/components/__tests__/OrderPanel.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderPanel } from '../OrderPanel';
import { TestProviders } from '@/test/TestProviders';

describe('OrderPanel', () => {
  it('should show confirmation dialog on submit', async () => {
    render(
      <TestProviders>
        <OrderPanel initialSymbol="ACME" />
      </TestProviders>
    );
    
    await userEvent.type(screen.getByLabelText('Quantity'), '10');
    await userEvent.click(screen.getByRole('button', { name: /buy/i }));
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/confirm/i)).toBeInTheDocument();
  });
  
  it('should disable execute during throttle', async () => {
    // Execute first trade
    render(<TestProviders><OrderPanel /></TestProviders>);
    
    await userEvent.type(screen.getByLabelText('Quantity'), '10');
    await userEvent.click(screen.getByRole('button', { name: /buy/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    
    // Button should be disabled
    const buyButton = screen.getByRole('button', { name: /buy/i });
    expect(buyButton).toBeDisabled();
  });
  
  it('should show validation errors for invalid quantity', async () => {
    render(<TestProviders><OrderPanel /></TestProviders>);
    
    await userEvent.type(screen.getByLabelText('Quantity'), '-5');
    await userEvent.click(screen.getByRole('button', { name: /buy/i }));
    
    expect(screen.getByText(/must be positive/i)).toBeInTheDocument();
  });
});
```

### 11.4 Integration Test Points

| Integration Point | Test Coverage |
|-------------------|---------------|
| Price Engine → Chart | Verify chart updates on price ticks |
| Trade Engine → Portfolio | Verify position/cash updates after trade |
| Order Engine → Trade Engine | Verify limit order execution triggers trade |
| Portfolio → localStorage | Verify persistence on changes |
| Settings → Price Engine | Verify interval changes take effect |
| Error Boundary → Toast | Verify errors show notifications |

---

## 12. Folder Structure

```
src/
├── main.tsx                          # Entry point
├── App.tsx                           # Root component with providers
├── vite-env.d.ts                     # Vite type declarations
│
├── components/                       # PRESENTATION LAYER
│   ├── common/                       # Shared/reusable components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css
│   │   │   └── index.ts
│   │   ├── Dialog/
│   │   ├── Input/
│   │   ├── Toast/
│   │   │   ├── Toast.tsx
│   │   │   ├── ToastContainer.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── layout/                       # Layout components
│   │   ├── Layout.tsx
│   │   ├── Header/
│   │   ├── MainContent/
│   │   └── index.ts
│   │
│   ├── watchlist/                    # Watchlist feature
│   │   ├── Watchlist.tsx
│   │   ├── WatchlistItem.tsx
│   │   ├── SymbolSearch.tsx
│   │   ├── Watchlist.module.css
│   │   └── index.ts
│   │
│   ├── chart/                        # Chart feature
│   │   ├── Chart.tsx
│   │   ├── ChartCanvas.tsx
│   │   ├── Crosshair.tsx
│   │   ├── TimeframeSelector.tsx
│   │   ├── PriceAxis.tsx
│   │   ├── TimeAxis.tsx
│   │   ├── hooks/
│   │   │   ├── useChartData.ts
│   │   │   ├── useChartScales.ts
│   │   │   └── useChartInteraction.ts
│   │   └── index.ts
│   │
│   ├── trading/                      # Trading feature
│   │   ├── OrderPanel.tsx
│   │   ├── OrderForm.tsx
│   │   ├── ConfirmationDialog.tsx
│   │   ├── ThrottleIndicator.tsx
│   │   ├── hooks/
│   │   │   ├── useOrderForm.ts
│   │   │   └── useTradeThrottle.ts
│   │   └── index.ts
│   │
│   ├── portfolio/                    # Portfolio feature
│   │   ├── Portfolio.tsx
│   │   ├── PositionsTable.tsx
│   │   ├── PositionRow.tsx
│   │   ├── PortfolioSummary.tsx
│   │   ├── AllocationChart.tsx
│   │   └── index.ts
│   │
│   ├── orders/                       # Orders feature
│   │   ├── OpenOrders.tsx
│   │   ├── OrderRow.tsx
│   │   └── index.ts
│   │
│   ├── history/                      # Trade history feature
│   │   ├── TradeHistory.tsx
│   │   ├── TradeRow.tsx
│   │   └── index.ts
│   │
│   └── settings/                     # Settings feature
│       ├── SettingsModal.tsx
│       ├── PreferencesForm.tsx
│       └── index.ts
│
├── contexts/                         # APPLICATION LAYER - State
│   ├── PriceContext.tsx
│   ├── PortfolioContext.tsx
│   ├── OrderContext.tsx
│   ├── WatchlistContext.tsx
│   ├── PreferencesContext.tsx
│   ├── ToastContext.tsx
│   └── index.ts
│
├── engines/                          # APPLICATION LAYER - Business Logic
│   ├── PriceEngine.ts
│   ├── TradeEngine.ts
│   ├── OrderEngine.ts
│   └── index.ts
│
├── domain/                           # DOMAIN LAYER
│   ├── models/                       # Type definitions
│   │   ├── price.ts
│   │   ├── trade.ts
│   │   ├── order.ts
│   │   ├── portfolio.ts
│   │   ├── watchlist.ts
│   │   ├── preferences.ts
│   │   └── index.ts
│   │
│   ├── calculations/                 # Pure calculation functions
│   │   ├── portfolio.ts              # WAC, P&L, etc.
│   │   ├── chart.ts                  # Aggregations, indicators
│   │   └── index.ts
│   │
│   ├── validation/                   # Validation logic
│   │   ├── trade.ts
│   │   ├── order.ts
│   │   └── index.ts
│   │
│   ├── constants/                    # App constants
│   │   ├── symbols.ts                # Stock symbols
│   │   ├── limits.ts                 # System limits
│   │   └── index.ts
│   │
│   └── errors.ts                     # Custom error classes
│
├── infrastructure/                   # INFRASTRUCTURE LAYER
│   ├── storage/
│   │   ├── StorageService.ts
│   │   ├── MigrationService.ts
│   │   ├── schema.ts
│   │   └── index.ts
│   │
│   └── services/
│       ├── TimeService.ts            # Mockable clock
│       └── IdService.ts              # UUID generation
│
├── hooks/                            # Shared hooks
│   ├── useKeyboardShortcuts.ts
│   ├── useMediaQuery.ts
│   ├── useDebounce.ts
│   └── index.ts
│
├── styles/                           # Global styles
│   ├── variables.css                 # CSS variables
│   ├── reset.css                     # CSS reset
│   ├── global.css                    # Global styles
│   └── themes/
│       ├── light.css
│       └── dark.css
│
├── utils/                            # Utility functions
│   ├── format.ts                     # Number/date formatting
│   ├── math.ts                       # Math helpers
│   └── index.ts
│
├── test/                             # Test utilities
│   ├── TestProviders.tsx             # Test context wrapper
│   ├── mocks/                        # Mock implementations
│   │   ├── mockPriceEngine.ts
│   │   └── mockStorage.ts
│   └── fixtures/                     # Test data
│       ├── prices.ts
│       ├── trades.ts
│       └── portfolio.ts
│
└── types/                            # Additional type declarations
    └── global.d.ts
```

---

## 13. Technical Risks & Mitigations

### 13.1 Risk Register

| ID | Risk | Probability | Impact | Severity | Mitigation Strategy |
|----|------|------------|--------|----------|---------------------|
| **TR-01** | SVG chart rendering degrades with large datasets | Medium | High | **High** | Rolling window (200 points); requestAnimationFrame; memo |
| **TR-02** | localStorage quota exceeded | Low | High | **Medium** | FIFO trade pruning; storage monitoring; graceful degradation |
| **TR-03** | Price engine creates unrealistic patterns | Medium | Medium | **Medium** | Geometric Brownian Motion algorithm; volatility bounds; mean reversion |
| **TR-04** | State synchronization bugs (race conditions) | Medium | High | **High** | Reducer pattern; atomic updates; validation pre/post |
| **TR-05** | Memory leaks from subscriptions | Medium | Medium | **Medium** | Cleanup in useEffect; subscription tracking; testing |
| **TR-06** | Calculation precision errors (floating point) | Low | High | **Medium** | Round to 2 decimals; use integers for cents internally |
| **TR-07** | Browser compatibility issues | Low | Medium | **Low** | Target modern browsers only; test matrix; feature detection |
| **TR-08** | Complex state leading to bugs | Medium | Medium | **Medium** | Clear ownership; comprehensive tests; TypeScript strict |

### 13.2 Mitigation Implementation Details

#### TR-01: Chart Performance

```typescript
// Mitigation: Rolling window + efficient rendering

const VISIBLE_POINTS = 200;

function useChartData(symbol: string, timeframe: Timeframe) {
  const history = usePriceHistory(symbol);
  
  // Memoize windowed data
  return useMemo(() => {
    const aggregated = aggregateToTimeframe(history, timeframe);
    return aggregated.slice(-VISIBLE_POINTS); // Rolling window
  }, [history, timeframe]);
}

// Ref for RAF scheduling
const rafRef = useRef<number>();

useEffect(() => {
  return () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  };
}, []);
```

#### TR-04: State Synchronization

```typescript
// Mitigation: Reducer pattern with atomic updates

type PortfolioAction =
  | { type: 'EXECUTE_TRADE'; trade: Trade }
  | { type: 'RESET' }
  | { type: 'SET_CASH'; amount: number };

function portfolioReducer(state: Portfolio, action: PortfolioAction): Portfolio {
  switch (action.type) {
    case 'EXECUTE_TRADE': {
      const { trade } = action;
      
      // Atomic update: cash and positions together
      const newCash = trade.type === 'BUY'
        ? state.cash - trade.total
        : state.cash + trade.total;
      
      // Validate before committing
      if (newCash < 0) {
        console.error('Trade would result in negative cash, rejecting');
        return state; // No change
      }
      
      const newPositions = updatePositions(state.positions, trade);
      
      return {
        ...state,
        cash: newCash,
        positions: newPositions,
        // Realized P&L updated atomically
        realizedPL: trade.type === 'SELL'
          ? state.realizedPL + calculateRealizedPL(state.positions, trade)
          : state.realizedPL,
      };
    }
    // ... other cases
  }
}
```

#### TR-06: Floating Point Precision

```typescript
// Mitigation: Use cents internally for calculations

function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function toDollars(cents: number): number {
  return cents / 100;
}

function calculateTotal(price: number, quantity: number): number {
  const priceCents = toCents(price);
  const totalCents = priceCents * quantity;
  return toDollars(totalCents);
}

// Display formatting always rounds
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
```

---

## Appendix

### A. Design Decision Log

| Date | Decision | Rationale | Alternatives |
|------|----------|-----------|--------------|
| 2026-02-15 | Use React Context over Redux | Simpler for app size; fewer dependencies | Redux, Zustand |
| 2026-02-15 | Native SVG over charting library | PRD requirement; bundle size; full control | D3, Recharts |
| 2026-02-15 | Singleton PriceEngine | Single source of truth; efficient subscription | Instance per component |
| 2026-02-15 | Command pattern for trades | Validation + execution encapsulation | Direct function calls |
| 2026-02-15 | Event-driven OrderEngine | Decoupled limit order monitoring | Polling approach |
| 2026-02-15 | CSS Modules over Tailwind | No runtime overhead; team familiarity | Tailwind, CSS-in-JS |

### B. API Quick Reference

```typescript
// Price Engine
const engine = PriceEngine.getInstance();
engine.start();
engine.stop();
engine.subscribeToPrices((prices) => {});
engine.getPrice('ACME');
engine.setUpdateInterval(1000);

// Trade Engine
const tradeEngine = new TradeEngine(priceEngine);
tradeEngine.validateTrade(request, portfolio);
tradeEngine.executeTrade(request, portfolio);
tradeEngine.isThrottled();

// Order Engine
const orderEngine = new OrderEngine(priceEngine, tradeEngine, getPortfolio, updatePortfolio);
orderEngine.placeOrder(request);
orderEngine.cancelOrder(orderId);
orderEngine.getOpenOrders();
orderEngine.addEventListener((event) => {});

// Storage Service
const storage = new StorageService();
storage.save('key', data);
storage.load<Type>('key');
storage.exportAll();
storage.clearAll();
```

### C. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-15 | Frontend Architecture | Initial design complete |

---

*Document End*

**Sign-off:**
- [ ] Frontend Architect
- [ ] Tech Lead
- [ ] Engineering Manager
