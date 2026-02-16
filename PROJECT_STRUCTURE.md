# PROJECT_STRUCTURE.md
## TradePulse - Production-Grade Project Structure

**Version:** 1.0  
**Date:** February 15, 2026  
**Author:** Frontend Architecture Team  
**Status:** Implementation Ready  
**Reference:** PSD-TradePulse v1.0  

---

## Table of Contents
1. [Root Folder Structure](#1-root-folder-structure)
2. [Folder Responsibility Explanation](#2-folder-responsibility-explanation)
3. [Feature-Based Modular Structure](#3-feature-based-modular-structure)
4. [Engine Layer Structure](#4-engine-layer-structure)
5. [State Management Structure](#5-state-management-structure)
6. [Chart System Structure](#6-chart-system-structure)
7. [Persistence Layer Structure](#7-persistence-layer-structure)
8. [Example File Responsibilities](#8-example-file-responsibilities)
9. [Dependency Direction Rules](#9-dependency-direction-rules)

---

## 1. Root Folder Structure

```
tradepulse/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .husky/
│   ├── pre-commit
│   └── pre-push
├── public/
│   ├── favicon.ico
│   ├── robots.txt
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── App.module.css
│   │   ├── main.tsx
│   │   ├── providers/
│   │   │   ├── index.ts
│   │   │   └── AppProviders.tsx
│   │   └── routes/
│   │       └── index.tsx
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.module.css
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Toast/
│   │   │   ├── Spinner/
│   │   │   ├── Badge/
│   │   │   ├── Tooltip/
│   │   │   └── ErrorBoundary/
│   │   ├── layout/
│   │   │   ├── Layout/
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   ├── MainContent/
│   │   │   └── BottomPanel/
│   │   └── feedback/
│   │       ├── ConfirmationDialog/
│   │       ├── ToastContainer/
│   │       └── AlertBanner/
│   │
│   ├── features/
│   │   ├── price/
│   │   │   ├── components/
│   │   │   │   ├── PriceDisplay/
│   │   │   │   └── PriceChange/
│   │   │   ├── hooks/
│   │   │   │   ├── usePrice.ts
│   │   │   │   ├── usePriceHistory.ts
│   │   │   │   └── usePriceSubscription.ts
│   │   │   ├── context/
│   │   │   │   ├── PriceContext.tsx
│   │   │   │   └── PriceProvider.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── chart/
│   │   │   ├── components/
│   │   │   │   ├── Chart/
│   │   │   │   │   ├── Chart.tsx
│   │   │   │   │   ├── Chart.module.css
│   │   │   │   │   └── index.ts
│   │   │   │   ├── ChartCanvas/
│   │   │   │   ├── ChartHeader/
│   │   │   │   ├── ChartControls/
│   │   │   │   ├── Crosshair/
│   │   │   │   ├── PriceAxis/
│   │   │   │   ├── TimeAxis/
│   │   │   │   ├── CandleStick/
│   │   │   │   ├── VolumeBar/
│   │   │   │   └── TimeframeSelector/
│   │   │   ├── hooks/
│   │   │   │   ├── useChartData.ts
│   │   │   │   ├── useChartDimensions.ts
│   │   │   │   ├── useChartInteraction.ts
│   │   │   │   ├── useChartScales.ts
│   │   │   │   └── useChartViewport.ts
│   │   │   ├── utils/
│   │   │   │   ├── chartMath.ts
│   │   │   │   ├── pathGenerator.ts
│   │   │   │   └── scaleCalculator.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── order/
│   │   │   ├── components/
│   │   │   │   ├── OrderPanel/
│   │   │   │   ├── OrderForm/
│   │   │   │   ├── OrderTypeToggle/
│   │   │   │   ├── OrderPreview/
│   │   │   │   ├── OrderRow/
│   │   │   │   ├── OpenOrdersTable/
│   │   │   │   └── ThrottleIndicator/
│   │   │   ├── hooks/
│   │   │   │   ├── useOrder.ts
│   │   │   │   ├── useOrderValidation.ts
│   │   │   │   └── useOrderBook.ts
│   │   │   ├── context/
│   │   │   │   ├── OrderContext.tsx
│   │   │   │   └── OrderProvider.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── trade/
│   │   │   ├── components/
│   │   │   │   ├── TradeConfirmation/
│   │   │   │   ├── TradeHistoryTable/
│   │   │   │   ├── TradeRow/
│   │   │   │   └── BuySellButtons/
│   │   │   ├── hooks/
│   │   │   │   ├── useTrade.ts
│   │   │   │   ├── useTradeValidation.ts
│   │   │   │   ├── useTradeThrottle.ts
│   │   │   │   └── useTradeHistory.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── portfolio/
│   │   │   ├── components/
│   │   │   │   ├── Portfolio/
│   │   │   │   ├── PositionRow/
│   │   │   │   ├── PositionsTable/
│   │   │   │   ├── PortfolioSummary/
│   │   │   │   ├── PortfolioQuickView/
│   │   │   │   └── CashBalance/
│   │   │   ├── hooks/
│   │   │   │   ├── usePortfolio.ts
│   │   │   │   ├── usePosition.ts
│   │   │   │   └── usePortfolioMetrics.ts
│   │   │   ├── context/
│   │   │   │   ├── PortfolioContext.tsx
│   │   │   │   └── PortfolioProvider.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── watchlist/
│   │   │   ├── components/
│   │   │   │   ├── Watchlist/
│   │   │   │   ├── WatchlistItem/
│   │   │   │   ├── WatchlistHeader/
│   │   │   │   ├── SymbolSearch/
│   │   │   │   └── AddSymbolButton/
│   │   │   ├── hooks/
│   │   │   │   ├── useWatchlist.ts
│   │   │   │   ├── useSymbolSearch.ts
│   │   │   │   └── useSelectedSymbol.ts
│   │   │   ├── context/
│   │   │   │   ├── WatchlistContext.tsx
│   │   │   │   └── WatchlistProvider.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── settings/
│   │       ├── components/
│   │       │   ├── SettingsModal/
│   │       │   ├── PreferenceSection/
│   │       │   ├── ThemeSelector/
│   │       │   └── ResetConfirmModal/
│   │       ├── hooks/
│   │       │   └── usePreferences.ts
│   │       ├── context/
│   │       │   ├── PreferencesContext.tsx
│   │       │   └── PreferencesProvider.tsx
│   │       └── index.ts
│   │
│   ├── engines/
│   │   ├── PriceEngine/
│   │   │   ├── PriceEngine.ts
│   │   │   ├── PriceEngine.test.ts
│   │   │   ├── priceSimulator.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── TradeEngine/
│   │   │   ├── TradeEngine.ts
│   │   │   ├── TradeEngine.test.ts
│   │   │   ├── commands/
│   │   │   │   ├── MarketBuyCommand.ts
│   │   │   │   ├── MarketSellCommand.ts
│   │   │   │   ├── LimitBuyCommand.ts
│   │   │   │   ├── LimitSellCommand.ts
│   │   │   │   └── index.ts
│   │   │   ├── validators/
│   │   │   │   ├── fundsValidator.ts
│   │   │   │   ├── sharesValidator.ts
│   │   │   │   └── index.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── OrderEngine/
│   │   │   ├── OrderEngine.ts
│   │   │   ├── OrderEngine.test.ts
│   │   │   ├── orderMatcher.ts
│   │   │   ├── orderQueue.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── services/
│   │   ├── storage/
│   │   │   ├── StorageService.ts
│   │   │   ├── StorageService.test.ts
│   │   │   └── index.ts
│   │   ├── time/
│   │   │   ├── TimeService.ts
│   │   │   └── index.ts
│   │   ├── random/
│   │   │   ├── RandomService.ts
│   │   │   └── index.ts
│   │   ├── id/
│   │   │   ├── IdService.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── store/
│   │   ├── priceStore/
│   │   │   ├── priceStore.ts
│   │   │   ├── priceActions.ts
│   │   │   ├── priceReducer.ts
│   │   │   ├── priceSelectors.ts
│   │   │   └── index.ts
│   │   ├── orderStore/
│   │   │   ├── orderStore.ts
│   │   │   ├── orderActions.ts
│   │   │   ├── orderReducer.ts
│   │   │   ├── orderSelectors.ts
│   │   │   └── index.ts
│   │   ├── tradeStore/
│   │   │   ├── tradeStore.ts
│   │   │   ├── tradeActions.ts
│   │   │   ├── tradeReducer.ts
│   │   │   ├── tradeSelectors.ts
│   │   │   └── index.ts
│   │   ├── portfolioStore/
│   │   │   ├── portfolioStore.ts
│   │   │   ├── portfolioActions.ts
│   │   │   ├── portfolioReducer.ts
│   │   │   ├── portfolioSelectors.ts
│   │   │   └── index.ts
│   │   ├── watchlistStore/
│   │   │   ├── watchlistStore.ts
│   │   │   ├── watchlistActions.ts
│   │   │   ├── watchlistReducer.ts
│   │   │   ├── watchlistSelectors.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useThrottle.ts
│   │   ├── useInterval.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── usePrevious.ts
│   │   ├── useAnimationFrame.ts
│   │   └── index.ts
│   │
│   ├── models/
│   │   ├── price/
│   │   │   ├── PriceData.ts
│   │   │   ├── PricePoint.ts
│   │   │   ├── PriceHistory.ts
│   │   │   ├── SymbolInfo.ts
│   │   │   └── index.ts
│   │   ├── trade/
│   │   │   ├── Trade.ts
│   │   │   ├── TradeRequest.ts
│   │   │   ├── TradeResult.ts
│   │   │   ├── TradeValidation.ts
│   │   │   └── index.ts
│   │   ├── order/
│   │   │   ├── LimitOrder.ts
│   │   │   ├── OrderRequest.ts
│   │   │   ├── OrderFill.ts
│   │   │   └── index.ts
│   │   ├── portfolio/
│   │   │   ├── Portfolio.ts
│   │   │   ├── Position.ts
│   │   │   ├── PortfolioSnapshot.ts
│   │   │   └── index.ts
│   │   ├── watchlist/
│   │   │   ├── WatchlistItem.ts
│   │   │   ├── Watchlist.ts
│   │   │   └── index.ts
│   │   ├── preferences/
│   │   │   ├── Preferences.ts
│   │   │   ├── ChartConfig.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── calculations/
│   │   │   ├── portfolio.ts
│   │   │   ├── price.ts
│   │   │   ├── wac.ts
│   │   │   └── index.ts
│   │   ├── formatters/
│   │   │   ├── currency.ts
│   │   │   ├── number.ts
│   │   │   ├── date.ts
│   │   │   ├── percentage.ts
│   │   │   └── index.ts
│   │   ├── validators/
│   │   │   ├── tradeValidator.ts
│   │   │   ├── orderValidator.ts
│   │   │   ├── inputValidator.ts
│   │   │   └── index.ts
│   │   ├── helpers/
│   │   │   ├── array.ts
│   │   │   ├── object.ts
│   │   │   ├── math.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── workers/
│   │   ├── priceWorker/
│   │   │   ├── priceWorker.ts
│   │   │   ├── priceWorker.types.ts
│   │   │   └── index.ts
│   │   ├── chartWorker/
│   │   │   ├── chartWorker.ts
│   │   │   ├── chartWorker.types.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── adapters/
│   │   ├── storage/
│   │   │   ├── LocalStorageAdapter.ts
│   │   │   ├── IndexedDBAdapter.ts
│   │   │   ├── StorageAdapter.interface.ts
│   │   │   └── index.ts
│   │   ├── chart/
│   │   │   ├── ChartDataAdapter.ts
│   │   │   ├── OHLCAdapter.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── persistence/
│   │   ├── schema/
│   │   │   ├── StorageSchema.ts
│   │   │   ├── SchemaVersion.ts
│   │   │   └── index.ts
│   │   ├── migrations/
│   │   │   ├── MigrationService.ts
│   │   │   ├── migrations/
│   │   │   │   ├── v1_0_0.ts
│   │   │   │   ├── v1_1_0.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── serializers/
│   │   │   ├── portfolioSerializer.ts
│   │   │   ├── tradeSerializer.ts
│   │   │   ├── orderSerializer.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── charts/
│   │   ├── core/
│   │   │   ├── ChartRenderer.ts
│   │   │   ├── CanvasManager.ts
│   │   │   └── index.ts
│   │   ├── layers/
│   │   │   ├── LineLayer.ts
│   │   │   ├── CandleLayer.ts
│   │   │   ├── VolumeLayer.ts
│   │   │   ├── CrosshairLayer.ts
│   │   │   ├── GridLayer.ts
│   │   │   └── index.ts
│   │   ├── scales/
│   │   │   ├── TimeScale.ts
│   │   │   ├── PriceScale.ts
│   │   │   ├── LinearScale.ts
│   │   │   └── index.ts
│   │   ├── interactions/
│   │   │   ├── PanHandler.ts
│   │   │   ├── ZoomHandler.ts
│   │   │   ├── CrosshairHandler.ts
│   │   │   └── index.ts
│   │   ├── renderers/
│   │   │   ├── SVGRenderer.ts
│   │   │   ├── CanvasRenderer.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── types/
│   │   ├── common.ts
│   │   ├── events.ts
│   │   ├── api.ts
│   │   ├── chart.ts
│   │   ├── engine.ts
│   │   └── index.ts
│   │
│   ├── config/
│   │   ├── constants/
│   │   │   ├── symbols.ts
│   │   │   ├── limits.ts
│   │   │   ├── defaults.ts
│   │   │   └── index.ts
│   │   ├── environment.ts
│   │   ├── theme.ts
│   │   └── index.ts
│   │
│   ├── styles/
│   │   ├── global.css
│   │   ├── variables.css
│   │   ├── reset.css
│   │   ├── typography.css
│   │   └── animations.css
│   │
│   └── test/
│       ├── setup.ts
│       ├── utils/
│       │   ├── renderWithProviders.tsx
│       │   ├── mockPriceEngine.ts
│       │   ├── mockStorage.ts
│       │   ├── createMockPortfolio.ts
│       │   ├── createMockTrade.ts
│       │   └── index.ts
│       ├── fixtures/
│       │   ├── prices.ts
│       │   ├── trades.ts
│       │   ├── orders.ts
│       │   ├── portfolio.ts
│       │   └── index.ts
│       ├── integration/
│       │   ├── tradeFlow.test.ts
│       │   ├── orderExecution.test.ts
│       │   ├── portfolioSync.test.ts
│       │   └── persistence.test.ts
│       └── e2e/
│           ├── trading.spec.ts
│           ├── watchlist.spec.ts
│           └── settings.spec.ts
│
├── .env.example
├── .eslintrc.cjs
├── .gitignore
├── .prettierrc
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
└── README.md
```

---

## 2. Folder Responsibility Explanation

### 2.1 Core Application Layer

| Folder | Responsibility | What Belongs | What Does NOT Belong |
|--------|---------------|--------------|---------------------|
| `app/` | Application bootstrap, root component, provider composition | App.tsx, main.tsx, AppProviders | Feature components, business logic |
| `app/providers/` | Context provider composition and ordering | AppProviders.tsx | Individual provider implementations |
| `app/routes/` | Route definitions (if routing is added) | Route config, lazy imports | Page components |

### 2.2 Component Layer

| Folder | Responsibility | What Belongs | What Does NOT Belong |
|--------|---------------|--------------|---------------------|
| `components/common/` | Reusable, feature-agnostic UI primitives | Button, Input, Modal, Toast, Spinner | Feature-specific components |
| `components/layout/` | Page structure and grid components | Header, Sidebar, Layout, Panel | Data-fetching components |
| `components/feedback/` | User feedback UI | Dialogs, Alerts, Toasts | Form components |

### 2.3 Feature Layer (Feature-Sliced Design)

| Folder | Responsibility | What Belongs | What Does NOT Belong |
|--------|---------------|--------------|---------------------|
| `features/{name}/` | Self-contained feature module | All feature-specific code | Cross-feature dependencies |
| `features/{name}/components/` | Feature-specific UI components | Feature UI, local state | Global state management |
| `features/{name}/hooks/` | Feature-specific React hooks | Data hooks, UI hooks | Generic utility hooks |
| `features/{name}/context/` | Feature state management | Context, Provider | Cross-feature state |

### 2.4 Engine Layer

| Folder | Responsibility | What Belongs | What Does NOT Belong |
|--------|---------------|--------------|---------------------|
| `engines/` | Core business logic orchestration | Engine classes, commands | React components, hooks |
| `engines/PriceEngine/` | Real-time price simulation | Simulator, subscriptions | UI rendering logic |
| `engines/TradeEngine/` | Trade execution logic | Commands, validators | Order management |
| `engines/OrderEngine/` | Limit order management | Order queue, matcher | Immediate execution |

### 2.5 Data Layer

| Folder | Responsibility | What Belongs | What Does NOT Belong |
|--------|---------------|--------------|---------------------|
| `store/` | State management (reducers, actions) | Stores, reducers, selectors | Business logic, side effects |
| `models/` | TypeScript interfaces and types | Type definitions, enums | Implementation logic |
| `persistence/` | Data persistence and migrations | Schema, migrations, serializers | Runtime state |

### 2.6 Infrastructure Layer

| Folder | Responsibility | What Belongs | What Does NOT Belong |
|--------|---------------|--------------|---------------------|
| `services/` | External service abstractions | StorageService, TimeService | Business logic |
| `adapters/` | Interface adapters for external systems | Storage adapters, data adapters | Domain logic |
| `workers/` | Web Worker implementations | Price worker, chart worker | Main thread code |

### 2.7 Utility Layer

| Folder | Responsibility | What Belongs | What Does NOT Belong |
|--------|---------------|--------------|---------------------|
| `utils/` | Pure utility functions | Formatters, validators, helpers | Stateful logic, hooks |
| `hooks/` | Generic reusable React hooks | useDebounce, useInterval | Feature-specific hooks |
| `types/` | Global type definitions | Shared types, type utilities | Feature-specific types |
| `config/` | Configuration and constants | Constants, defaults, env | Runtime configuration |

### 2.8 Chart System Layer

| Folder | Responsibility | What Belongs | What Does NOT Belong |
|--------|---------------|--------------|---------------------|
| `charts/core/` | Chart rendering orchestration | ChartRenderer, CanvasManager | React components |
| `charts/layers/` | Individual chart layers | Line, Candle, Volume layers | Rendering engines |
| `charts/scales/` | Axis scale calculations | TimeScale, PriceScale | Rendering logic |
| `charts/interactions/` | User interaction handlers | Pan, Zoom, Crosshair | State management |
| `charts/renderers/` | Rendering engine implementations | SVGRenderer, CanvasRenderer | Business logic |

---

## 3. Feature-Based Modular Structure

### 3.1 Feature Module Contract

Each feature follows a strict modular contract:

```
features/{feature}/
├── components/          # Feature UI components
│   └── {Component}/
│       ├── {Component}.tsx
│       ├── {Component}.module.css
│       ├── {Component}.test.tsx
│       └── index.ts
├── hooks/              # Feature-specific hooks
│   └── use{Feature}.ts
├── context/            # Feature state (if needed)
│   ├── {Feature}Context.tsx
│   └── {Feature}Provider.tsx
├── utils/              # Feature-specific utilities (optional)
│   └── {feature}Utils.ts
├── types/              # Feature-specific types (optional)
│   └── {feature}.types.ts
└── index.ts            # Public API barrel export
```

### 3.2 Feature: price

```
features/price/
├── components/
│   ├── PriceDisplay/
│   │   ├── PriceDisplay.tsx        # Renders current price with formatting
│   │   ├── PriceDisplay.module.css
│   │   └── index.ts
│   └── PriceChange/
│       ├── PriceChange.tsx         # Shows price change with color coding
│       ├── PriceChange.module.css
│       └── index.ts
├── hooks/
│   ├── usePrice.ts                 # Subscribe to single symbol price
│   ├── usePriceHistory.ts          # Get historical price points
│   └── usePriceSubscription.ts     # Low-level subscription hook
├── context/
│   ├── PriceContext.tsx            # Price state interface
│   └── PriceProvider.tsx           # Connects to PriceEngine
└── index.ts
```

**Exports:**
```typescript
// features/price/index.ts
export { PriceDisplay } from './components/PriceDisplay';
export { PriceChange } from './components/PriceChange';
export { usePrice, usePriceHistory } from './hooks';
export { PriceProvider, usePriceContext } from './context';
```

### 3.3 Feature: chart

```
features/chart/
├── components/
│   ├── Chart/
│   │   ├── Chart.tsx               # Main chart container
│   │   ├── Chart.module.css
│   │   └── index.ts
│   ├── ChartCanvas/
│   │   ├── ChartCanvas.tsx         # SVG/Canvas rendering surface
│   │   └── index.ts
│   ├── ChartHeader/
│   │   ├── ChartHeader.tsx         # Symbol info + controls
│   │   └── index.ts
│   ├── Crosshair/
│   │   ├── Crosshair.tsx           # Hover crosshair with tooltip
│   │   └── index.ts
│   ├── CandleStick/
│   │   ├── CandleStick.tsx         # Single candlestick
│   │   └── index.ts
│   ├── PriceAxis/
│   │   ├── PriceAxis.tsx           # Y-axis with price labels
│   │   └── index.ts
│   ├── TimeAxis/
│   │   ├── TimeAxis.tsx            # X-axis with time labels
│   │   └── index.ts
│   └── TimeframeSelector/
│       ├── TimeframeSelector.tsx   # 1m, 5m, 15m, 1h, 4h, 1D
│       └── index.ts
├── hooks/
│   ├── useChartData.ts             # Transform price data for rendering
│   ├── useChartDimensions.ts       # Responsive chart sizing
│   ├── useChartInteraction.ts      # Pan, zoom, hover handlers
│   ├── useChartScales.ts           # Time and price scale calculations
│   └── useChartViewport.ts         # Visible data window management
├── utils/
│   ├── chartMath.ts                # Coordinate calculations
│   ├── pathGenerator.ts            # SVG path generation
│   └── scaleCalculator.ts          # Scale domain/range calculations
└── index.ts
```

### 3.4 Feature: order

```
features/order/
├── components/
│   ├── OrderPanel/
│   │   ├── OrderPanel.tsx          # Complete order entry panel
│   │   └── index.ts
│   ├── OrderForm/
│   │   ├── OrderForm.tsx           # Input fields + validation
│   │   └── index.ts
│   ├── OrderTypeToggle/
│   │   ├── OrderTypeToggle.tsx     # MARKET / LIMIT toggle
│   │   └── index.ts
│   ├── OrderPreview/
│   │   ├── OrderPreview.tsx        # Estimated cost/proceeds
│   │   └── index.ts
│   ├── OpenOrdersTable/
│   │   ├── OpenOrdersTable.tsx     # Pending limit orders
│   │   └── index.ts
│   └── ThrottleIndicator/
│       ├── ThrottleIndicator.tsx   # 1s cooldown display
│       └── index.ts
├── hooks/
│   ├── useOrder.ts                 # Place/cancel order
│   ├── useOrderValidation.ts       # Real-time validation
│   └── useOrderBook.ts             # Open orders list
├── context/
│   ├── OrderContext.tsx
│   └── OrderProvider.tsx
└── index.ts
```

### 3.5 Feature: trade

```
features/trade/
├── components/
│   ├── TradeConfirmation/
│   │   ├── TradeConfirmation.tsx   # Blocking confirm dialog
│   │   └── index.ts
│   ├── TradeHistoryTable/
│   │   ├── TradeHistoryTable.tsx   # Past trades (max 1000)
│   │   └── index.ts
│   ├── TradeRow/
│   │   ├── TradeRow.tsx            # Single trade record
│   │   └── index.ts
│   └── BuySellButtons/
│       ├── BuySellButtons.tsx      # Buy/Sell action buttons
│       └── index.ts
├── hooks/
│   ├── useTrade.ts                 # Execute trade
│   ├── useTradeValidation.ts       # Pre-trade validation
│   ├── useTradeThrottle.ts         # 1s cooldown management
│   └── useTradeHistory.ts          # Historical trades
└── index.ts
```

### 3.6 Feature: portfolio

```
features/portfolio/
├── components/
│   ├── Portfolio/
│   │   ├── Portfolio.tsx           # Full portfolio view
│   │   └── index.ts
│   ├── PositionRow/
│   │   ├── PositionRow.tsx         # Single position with P&L
│   │   └── index.ts
│   ├── PositionsTable/
│   │   ├── PositionsTable.tsx      # All positions
│   │   └── index.ts
│   ├── PortfolioSummary/
│   │   ├── PortfolioSummary.tsx    # Total value, P&L summary
│   │   └── index.ts
│   ├── PortfolioQuickView/
│   │   ├── PortfolioQuickView.tsx  # Header compact view
│   │   └── index.ts
│   └── CashBalance/
│       ├── CashBalance.tsx         # Available cash display
│       └── index.ts
├── hooks/
│   ├── usePortfolio.ts             # Full portfolio state
│   ├── usePosition.ts              # Single position lookup
│   └── usePortfolioMetrics.ts      # Computed metrics
├── context/
│   ├── PortfolioContext.tsx
│   └── PortfolioProvider.tsx
└── index.ts
```

### 3.7 Feature: watchlist

```
features/watchlist/
├── components/
│   ├── Watchlist/
│   │   ├── Watchlist.tsx           # Full watchlist panel
│   │   └── index.ts
│   ├── WatchlistItem/
│   │   ├── WatchlistItem.tsx       # Single symbol row
│   │   └── index.ts
│   ├── WatchlistHeader/
│   │   ├── WatchlistHeader.tsx     # Title + add button
│   │   └── index.ts
│   ├── SymbolSearch/
│   │   ├── SymbolSearch.tsx        # Search modal
│   │   └── index.ts
│   └── AddSymbolButton/
│       ├── AddSymbolButton.tsx
│       └── index.ts
├── hooks/
│   ├── useWatchlist.ts             # Watchlist operations
│   ├── useSymbolSearch.ts          # Search/filter symbols
│   └── useSelectedSymbol.ts        # Currently selected
├── context/
│   ├── WatchlistContext.tsx
│   └── WatchlistProvider.tsx
└── index.ts
```

---

## 4. Engine Layer Structure

### 4.1 Engine Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENGINE ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         PriceEngine                                   │   │
│  │                        (Singleton)                                    │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐ │   │
│  │  │  Price Generator │  │  History Manager │  │  Subscription Bus   │ │   │
│  │  │  (GBM Simulator) │  │  (Rolling 500)   │  │  (Observer Pattern) │ │   │
│  │  └────────┬─────────┘  └────────┬─────────┘  └──────────┬──────────┘ │   │
│  │           └──────────────┬──────────────────────────────┘            │   │
│  │                          ▼                                            │   │
│  │                   Tick → Update → Notify                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                        ┌───────────┴───────────┐                            │
│                        ▼                       ▼                            │
│  ┌──────────────────────────┐    ┌──────────────────────────┐              │
│  │       OrderEngine        │    │       TradeEngine        │              │
│  │     (Event-Driven)       │    │    (Command Pattern)     │              │
│  │  ┌───────────────────┐   │    │  ┌───────────────────┐   │              │
│  │  │ Order Queue (FIFO)│   │    │  │ MarketBuyCommand  │   │              │
│  │  │ Price Watcher     │   │◄───┤  │ MarketSellCommand │   │              │
│  │  │ Auto-Executor     │   │    │  │ Validator Chain   │   │              │
│  │  └───────────────────┘   │    │  │ Throttle Guard    │   │              │
│  └──────────────────────────┘    │  └───────────────────┘   │              │
│           │                       └──────────────────────────┘              │
│           │                                  │                              │
│           └──────────────────┬───────────────┘                              │
│                              ▼                                              │
│                    ┌──────────────────────┐                                 │
│                    │  Portfolio Updates    │                                 │
│                    │  (Context Dispatch)   │                                 │
│                    └──────────────────────┘                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 PriceEngine Structure

```
engines/PriceEngine/
├── PriceEngine.ts           # Main singleton class
├── PriceEngine.test.ts      # Unit tests
├── priceSimulator.ts        # GBM price generation algorithm
├── types.ts                 # Engine-specific types
└── index.ts                 # Public exports

// PriceEngine.ts - Singleton + Observer
class PriceEngine {
  private static instance: PriceEngine | null;
  private subscribers: Map<string, Set<Callback>>;
  private prices: Map<string, PriceData>;
  private history: Map<string, PricePoint[]>;
  
  static getInstance(): PriceEngine;
  static resetInstance(): void;
  
  // Lifecycle
  start(): void;
  stop(): void;
  setUpdateInterval(ms: number): void;
  
  // Subscription
  subscribeToPrices(callback: PriceSubscriber): Unsubscribe;
  subscribeToHistory(callback: HistorySubscriber): Unsubscribe;
  
  // Access
  getPrice(symbol: string): PriceData | undefined;
  getHistory(symbol: string): readonly PricePoint[];
  getAllPrices(): ReadonlyMap<string, PriceData>;
  
  // Internal
  private tick(): void;
  private generateNextPrice(): PriceData;
  private notifySubscribers(): void;
}
```

### 4.3 TradeEngine Structure

```
engines/TradeEngine/
├── TradeEngine.ts           # Trade execution facade
├── TradeEngine.test.ts      # Unit tests
├── commands/                # Command pattern implementations
│   ├── MarketBuyCommand.ts
│   ├── MarketSellCommand.ts
│   ├── LimitBuyCommand.ts
│   ├── LimitSellCommand.ts
│   └── index.ts
├── validators/              # Validation chain
│   ├── fundsValidator.ts
│   ├── sharesValidator.ts
│   └── index.ts
├── types.ts
└── index.ts

// TradeEngine.ts - Command Pattern
class TradeEngine {
  constructor(priceEngine: PriceEngine);
  
  // Validation
  validateTrade(request: TradeRequest, portfolio: Portfolio): TradeValidation;
  
  // Execution
  executeTrade(request: TradeRequest, portfolio: Portfolio): TradeResult;
  
  // Throttling
  isThrottled(): boolean;
  getThrottleRemaining(): number;
  
  // Internal
  private createCommand(request: TradeRequest): TradeCommand;
  private applySlippage(price: number): number;
}

// Command interface
interface TradeCommand {
  validate(): TradeValidation;
  execute(): TradeResult;
}
```

### 4.4 OrderEngine Structure

```
engines/OrderEngine/
├── OrderEngine.ts           # Order management and auto-execution
├── OrderEngine.test.ts      # Unit tests
├── orderMatcher.ts          # Price matching logic
├── orderQueue.ts            # FIFO order queue
├── types.ts
└── index.ts

// OrderEngine.ts - Event-Driven
class OrderEngine {
  constructor(
    priceEngine: PriceEngine,
    tradeEngine: TradeEngine,
    getPortfolio: () => Portfolio,
    updatePortfolio: (updates: Partial<Portfolio>) => void
  );
  
  // Lifecycle
  start(): void;
  stop(): void;
  
  // Event subscription
  addEventListener(listener: OrderEventListener): Unsubscribe;
  
  // Order management
  placeOrder(request: OrderRequest): LimitOrder | null;
  cancelOrder(orderId: string): boolean;
  modifyOrder(orderId: string, updates: OrderUpdate): boolean;
  
  // Queries
  getOpenOrders(): LimitOrder[];
  getOrdersForSymbol(symbol: string): LimitOrder[];
  
  // Persistence
  loadOrders(orders: LimitOrder[]): void;
  serializeOrders(): LimitOrder[];
  
  // Internal
  private checkOrders(prices: Map<string, PriceData>): void;
  private shouldExecute(order: LimitOrder, price: PriceData): boolean;
  private executeOrder(order: LimitOrder, price: PriceData): void;
  private emit(event: OrderEvent): void;
}
```

### 4.5 Engine Communication Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ENGINE COMMUNICATION MODEL                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ┌─────────────┐                                 │
│                              │ PriceEngine │                                 │
│                              │ (Publisher) │                                 │
│                              └──────┬──────┘                                 │
│                                     │                                        │
│                   ┌─────────────────┼─────────────────┐                     │
│                   │ Price Updates   │                 │                     │
│                   ▼                 ▼                 ▼                     │
│            ┌──────────┐      ┌─────────────┐   ┌───────────────┐           │
│            │ UI Layer │      │ OrderEngine │   │ ChartRenderer │           │
│            │(Contexts)│      │(Subscriber) │   │ (Subscriber)  │           │
│            └────┬─────┘      └──────┬──────┘   └───────────────┘           │
│                 │                   │                                       │
│    ┌────────────┴────────────┐      │ Price Match                          │
│    │ User Trade Request      │      │ Detected                              │
│    ▼                         │      ▼                                       │
│  ┌───────────────┐           │  ┌──────────────────┐                        │
│  │  TradeEngine  │◄──────────┴──│ Auto-Execute     │                        │
│  │ (Synchronous) │              │ (Limit Orders)   │                        │
│  └───────┬───────┘              └──────────────────┘                        │
│          │                                                                   │
│          │ TradeResult                                                       │
│          ▼                                                                   │
│  ┌──────────────────┐                                                        │
│  │PortfolioContext  │                                                        │
│  │ dispatch()       │                                                        │
│  └──────────────────┘                                                        │
│                                                                              │
│  COMMUNICATION PATTERNS:                                                     │
│  • PriceEngine → * : Pub/Sub (async, batched)                               │
│  • User → TradeEngine : Direct call (sync)                                  │
│  • OrderEngine → TradeEngine : Direct call (sync, bypasses throttle)        │
│  • TradeEngine → PortfolioContext : Dispatch (unidirectional)               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. State Management Structure

### 5.1 Store Organization

```
store/
├── priceStore/
│   ├── priceStore.ts           # Store definition and initial state
│   ├── priceActions.ts         # Action type definitions
│   ├── priceReducer.ts         # State transitions
│   ├── priceSelectors.ts       # Memoized selectors
│   └── index.ts
├── orderStore/
│   ├── orderStore.ts
│   ├── orderActions.ts
│   ├── orderReducer.ts
│   ├── orderSelectors.ts
│   └── index.ts
├── tradeStore/
│   ├── tradeStore.ts
│   ├── tradeActions.ts
│   ├── tradeReducer.ts
│   ├── tradeSelectors.ts
│   └── index.ts
├── portfolioStore/
│   ├── portfolioStore.ts
│   ├── portfolioActions.ts
│   ├── portfolioReducer.ts
│   ├── portfolioSelectors.ts
│   └── index.ts
├── watchlistStore/
│   ├── watchlistStore.ts
│   ├── watchlistActions.ts
│   ├── watchlistReducer.ts
│   ├── watchlistSelectors.ts
│   └── index.ts
└── index.ts
```

### 5.2 Store Pattern

```typescript
// store/portfolioStore/portfolioStore.ts

export interface PortfolioState {
  cash: number;
  positions: Position[];
  realizedPL: number;
  initialCash: number;
  isLoading: boolean;
  error: string | null;
}

export const initialPortfolioState: PortfolioState = {
  cash: 100_000,
  positions: [],
  realizedPL: 0,
  initialCash: 100_000,
  isLoading: false,
  error: null,
};

// store/portfolioStore/portfolioActions.ts

export type PortfolioAction =
  | { type: 'PORTFOLIO_LOAD'; payload: Partial<PortfolioState> }
  | { type: 'PORTFOLIO_RESET' }
  | { type: 'TRADE_EXECUTED'; payload: { trade: Trade } }
  | { type: 'POSITION_UPDATED'; payload: { position: Position } }
  | { type: 'CASH_ADJUSTED'; payload: { amount: number } }
  | { type: 'SET_INITIAL_CASH'; payload: { amount: number } }
  | { type: 'SET_ERROR'; payload: { error: string } }
  | { type: 'CLEAR_ERROR' };

// store/portfolioStore/portfolioReducer.ts

export function portfolioReducer(
  state: PortfolioState,
  action: PortfolioAction
): PortfolioState {
  switch (action.type) {
    case 'TRADE_EXECUTED':
      return handleTradeExecuted(state, action.payload.trade);
    case 'PORTFOLIO_RESET':
      return { ...initialPortfolioState, initialCash: state.initialCash };
    // ... other cases
    default:
      return state;
  }
}

// store/portfolioStore/portfolioSelectors.ts

export const selectPositionBySymbol = (
  state: PortfolioState,
  symbol: string
): Position | undefined => 
  state.positions.find(p => p.symbol === symbol);

export const selectTotalValue = (
  state: PortfolioState,
  prices: Map<string, PriceData>
): number => {
  const positionsValue = state.positions.reduce((sum, pos) => {
    const price = prices.get(pos.symbol)?.price ?? 0;
    return sum + pos.shares * price;
  }, 0);
  return state.cash + positionsValue;
};
```

### 5.3 Store Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          STORE RELATIONSHIPS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐                                                          │
│   │  priceStore  │                                                          │
│   │ (Memory only)│◄────── PriceEngine (source of truth)                     │
│   └──────┬───────┘                                                          │
│          │                                                                   │
│          │ Prices flow to dependent stores for computed values              │
│          │                                                                   │
│   ┌──────┴───────────────┬─────────────────────────────────┐               │
│   ▼                      ▼                                 ▼               │
│ ┌────────────┐    ┌─────────────┐    ┌───────────────────────┐            │
│ │orderStore  │    │portfolioStore│   │   watchlistStore      │            │
│ │(Persisted) │    │ (Persisted)  │   │    (Persisted)        │            │
│ └─────┬──────┘    └──────┬───────┘   └───────────────────────┘            │
│       │                  │                                                  │
│       │                  │                                                  │
│       │   Order fill     │                                                  │
│       └──────────────────► Trade updates position + cash                   │
│                          │                                                  │
│                          ▼                                                  │
│                   ┌─────────────┐                                           │
│                   │ tradeStore  │                                           │
│                   │ (Persisted) │◄─── Append-only history (max 1000)       │
│                   └─────────────┘                                           │
│                                                                              │
│   PERSISTENCE RULES:                                                         │
│   • priceStore: Never persisted (regenerated on each session)              │
│   • orderStore: Persisted (open orders survive refresh)                    │
│   • portfolioStore: Persisted (positions, cash, realized P&L)              │
│   • tradeStore: Persisted (1000 trade history with FIFO pruning)          │
│   • watchlistStore: Persisted (user's symbol list)                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Chart System Structure

### 6.1 Chart Architecture

```
charts/
├── core/
│   ├── ChartRenderer.ts        # Orchestrates rendering pipeline
│   ├── CanvasManager.ts        # Manages canvas/SVG lifecycle
│   └── index.ts
├── layers/
│   ├── LineLayer.ts            # Line chart rendering
│   ├── CandleLayer.ts          # Candlestick rendering
│   ├── VolumeLayer.ts          # Volume bars
│   ├── CrosshairLayer.ts       # Interactive crosshair
│   ├── GridLayer.ts            # Background grid
│   └── index.ts
├── scales/
│   ├── TimeScale.ts            # X-axis time calculations
│   ├── PriceScale.ts           # Y-axis price calculations
│   ├── LinearScale.ts          # Generic linear scale
│   └── index.ts
├── interactions/
│   ├── PanHandler.ts           # Chart panning
│   ├── ZoomHandler.ts          # Chart zooming
│   ├── CrosshairHandler.ts     # Crosshair positioning
│   └── index.ts
├── renderers/
│   ├── SVGRenderer.ts          # SVG-based rendering
│   ├── CanvasRenderer.ts       # Canvas-based rendering
│   └── index.ts
└── index.ts
```

### 6.2 Layer Separation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHART LAYER STACK                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     React Component Layer                            │    │
│  │  Chart.tsx → ChartCanvas.tsx → ChartControls.tsx                    │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   │                                          │
│                                   │ props: { data, config, viewport }        │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Chart Renderer (Orchestrator)                    │    │
│  │  - Coordinates rendering layers                                      │    │
│  │  - Manages render queue                                              │    │
│  │  - Batches updates with rAF                                          │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   │                                          │
│                ┌──────────────────┼──────────────────┐                      │
│                ▼                  ▼                  ▼                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   Scale Layer   │  │   Render Layer  │  │ Interaction     │             │
│  │                 │  │                 │  │ Layer           │             │
│  │  • TimeScale    │  │  • GridLayer    │  │  • PanHandler   │             │
│  │  • PriceScale   │  │  • LineLayer    │  │  • ZoomHandler  │             │
│  │                 │  │  • CandleLayer  │  │  • Crosshair    │             │
│  │                 │  │  • VolumeLayer  │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       SVG Renderer                                   │    │
│  │  - Path generation                                                   │    │
│  │  - DOM updates                                                       │    │
│  │  - Event binding                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Chart Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHART DATA FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PriceEngine                                                                 │
│       │                                                                      │
│       │ Raw price data                                                       │
│       ▼                                                                      │
│  ┌──────────────────┐                                                        │
│  │ ChartDataAdapter │ ← Transforms: [PricePoint] → [ChartPoint]             │
│  │                  │   - Aggregates to timeframe (1m, 5m, etc.)            │
│  │                  │   - Builds OHLC from tick data                        │
│  └────────┬─────────┘                                                        │
│           │                                                                  │
│           │ Normalized data                                                  │
│           ▼                                                                  │
│  ┌──────────────────┐                                                        │
│  │  useChartData()  │ ← Memoized data preparation                           │
│  │                  │   - Slices to visible window (200 points)             │
│  │                  │   - Calculates domain (min/max price/time)            │
│  └────────┬─────────┘                                                        │
│           │                                                                  │
│           │ { data, domain, viewport }                                       │
│           ▼                                                                  │
│  ┌──────────────────┐                                                        │
│  │ useChartScales() │ ← Scale calculations                                  │
│  │                  │   - x: time → pixels                                  │
│  │                  │   - y: price → pixels (inverted)                      │
│  └────────┬─────────┘                                                        │
│           │                                                                  │
│           │ { xScale, yScale }                                               │
│           ▼                                                                  │
│  ┌──────────────────┐                                                        │
│  │ ChartCanvas.tsx  │ ← Renders with scales                                 │
│  │                  │   - Maps data points to coordinates                   │
│  │                  │   - Generates SVG paths                               │
│  └──────────────────┘                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Chart Component Files

```typescript
// charts/core/ChartRenderer.ts
export class ChartRenderer {
  private layers: Layer[] = [];
  private rafId: number | null = null;
  
  addLayer(layer: Layer): void;
  removeLayer(layerId: string): void;
  
  scheduleRender(): void;
  render(): void;
  
  setViewport(viewport: Viewport): void;
  setData(data: ChartPoint[]): void;
}

// charts/scales/PriceScale.ts
export class PriceScale {
  constructor(domain: [number, number], range: [number, number]);
  
  scale(price: number): number;
  invert(pixel: number): number;
  
  ticks(count: number): number[];
  format(price: number): string;
}

// charts/layers/LineLayer.ts
export class LineLayer implements Layer {
  readonly id = 'line-layer';
  
  render(ctx: RenderContext): void;
  
  private generatePath(data: ChartPoint[], scales: Scales): string;
  private optimizePath(points: Point[]): Point[]; // Douglas-Peucker
}
```

---

## 7. Persistence Layer Structure

### 7.1 Persistence Organization

```
persistence/
├── schema/
│   ├── StorageSchema.ts        # Complete schema type definition
│   ├── SchemaVersion.ts        # Version constants
│   └── index.ts
├── migrations/
│   ├── MigrationService.ts     # Migration orchestrator
│   ├── migrations/
│   │   ├── v1_0_0.ts          # Initial schema
│   │   ├── v1_1_0.ts          # Add new fields
│   │   └── index.ts           # Migration registry
│   └── index.ts
├── serializers/
│   ├── portfolioSerializer.ts  # Portfolio ↔ StoredPortfolio
│   ├── tradeSerializer.ts      # Trade ↔ StoredTrade
│   ├── orderSerializer.ts      # Order ↔ StoredOrder
│   └── index.ts
└── index.ts
```

### 7.2 Schema Definition

```typescript
// persistence/schema/StorageSchema.ts

export const STORAGE_KEYS = {
  VERSION: 'tradepulse_version',
  PORTFOLIO: 'tradepulse_portfolio',
  TRADES: 'tradepulse_trades',
  ORDERS: 'tradepulse_orders',
  WATCHLIST: 'tradepulse_watchlist',
  PREFERENCES: 'tradepulse_preferences',
} as const;

export interface StorageSchema {
  version: string;
  portfolio: StoredPortfolio;
  trades: StoredTrade[];
  orders: StoredOrder[];
  watchlist: string[];
  preferences: StoredPreferences;
}

export interface StoredPortfolio {
  cash: number;
  positions: StoredPosition[];
  realizedPL: number;
  initialCash: number;
  lastUpdated: number;
}

export interface StoredPosition {
  symbol: string;
  shares: number;
  avgCost: number;
}

export interface StoredTrade {
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
```

### 7.3 Migration Service

```typescript
// persistence/migrations/MigrationService.ts

interface Migration {
  version: string;
  up: (data: unknown) => unknown;
  down: (data: unknown) => unknown;
}

export class MigrationService {
  private migrations: Map<string, Migration> = new Map();
  
  register(migration: Migration): void;
  
  migrate(data: unknown, fromVersion: string, toVersion: string): unknown;
  
  getCurrentVersion(): string;
  
  private compareVersions(a: string, b: string): number;
}

// persistence/migrations/migrations/v1_1_0.ts

export const migration_v1_1_0: Migration = {
  version: '1.1.0',
  
  up: (data: StorageSchema_v1_0_0): StorageSchema_v1_1_0 => {
    return {
      ...data,
      version: '1.1.0',
      portfolio: {
        ...data.portfolio,
        // New field with default value
        lastResetAt: null,
      },
    };
  },
  
  down: (data: StorageSchema_v1_1_0): StorageSchema_v1_0_0 => {
    const { lastResetAt, ...portfolio } = data.portfolio;
    return {
      ...data,
      version: '1.0.0',
      portfolio,
    };
  },
};
```

---

## 8. Example File Responsibilities

### 8.1 Component File

```typescript
// features/watchlist/components/WatchlistItem/WatchlistItem.tsx

/**
 * WatchlistItem
 * 
 * RESPONSIBILITY:
 * - Render a single symbol in the watchlist
 * - Display real-time price from PriceContext
 * - Handle selection and removal interactions
 * 
 * DOES NOT:
 * - Fetch data directly
 * - Manage global state
 * - Handle business logic
 */

interface WatchlistItemProps {
  symbol: string;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

export const WatchlistItem: React.FC<WatchlistItemProps> = React.memo(
  ({ symbol, isSelected, onSelect, onRemove }) => {
    const price = usePrice(symbol); // Subscribe to this symbol only
    
    const handleClick = useCallback(() => {
      onSelect(symbol);
    }, [symbol, onSelect]);
    
    const handleRemove = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove(symbol);
    }, [symbol, onRemove]);
    
    return (
      <div 
        className={clsx(styles.item, isSelected && styles.selected)}
        onClick={handleClick}
      >
        <span className={styles.symbol}>{symbol}</span>
        <PriceDisplay price={price?.price} />
        <PriceChange 
          change={price?.change} 
          changePercent={price?.changePercent} 
        />
        <button onClick={handleRemove} aria-label="Remove">×</button>
      </div>
    );
  }
);
```

### 8.2 Hook File

```typescript
// features/trade/hooks/useTradeThrottle.ts

/**
 * useTradeThrottle
 * 
 * RESPONSIBILITY:
 * - Track trade throttle state
 * - Expose throttle remaining time
 * - Update countdown every 100ms
 * 
 * DOES NOT:
 * - Execute trades
 * - Validate trades
 * - Manage trade history
 */

export function useTradeThrottle(tradeEngine: TradeEngine) {
  const [isThrottled, setIsThrottled] = useState(tradeEngine.isThrottled());
  const [remaining, setRemaining] = useState(tradeEngine.getThrottleRemaining());
  
  useEffect(() => {
    if (!isThrottled) return;
    
    const interval = setInterval(() => {
      const remainingMs = tradeEngine.getThrottleRemaining();
      setRemaining(remainingMs);
      
      if (remainingMs === 0) {
        setIsThrottled(false);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isThrottled, tradeEngine]);
  
  const triggerThrottle = useCallback(() => {
    setIsThrottled(true);
    setRemaining(1000);
  }, []);
  
  return { isThrottled, remaining, triggerThrottle };
}
```

### 8.3 Engine File

```typescript
// engines/PriceEngine/priceSimulator.ts

/**
 * priceSimulator
 * 
 * RESPONSIBILITY:
 * - Implement Geometric Brownian Motion price simulation
 * - Generate realistic random price movements
 * - Apply volatility and drift parameters
 * 
 * DOES NOT:
 * - Manage subscriptions
 * - Store price state
 * - Handle timing/intervals
 */

export function generateNextPrice(
  current: PriceData,
  symbolInfo: SymbolInfo,
  config: PriceEngineConfig
): PriceData {
  const volatility = symbolInfo.volatility * config.volatilityMultiplier;
  const drift = 0.0001;
  
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  // GBM formula
  let changePercent = drift + volatility * z;
  changePercent = clamp(changePercent, -0.05, 0.05);
  
  let newPrice = current.price * (1 + changePercent);
  newPrice = clamp(newPrice, 0.01, 999999.99);
  newPrice = roundPrice(newPrice);
  
  // Calculate derived values
  const spread = calculateSpread(newPrice);
  const bid = roundPrice(newPrice - spread / 2);
  const ask = roundPrice(newPrice + spread / 2);
  
  return {
    ...current,
    price: newPrice,
    bid,
    ask,
    spread,
    high: Math.max(current.high, newPrice),
    low: Math.min(current.low, newPrice),
    change: roundPrice(newPrice - current.previousClose),
    changePercent: ((newPrice - current.previousClose) / current.previousClose) * 100,
    timestamp: Date.now(),
  };
}
```

### 8.4 Utility File

```typescript
// utils/calculations/wac.ts

/**
 * wac.ts (Weighted Average Cost)
 * 
 * RESPONSIBILITY:
 * - Pure calculation functions for WAC
 * - Edge case handling for division
 * - Precision rounding
 * 
 * DOES NOT:
 * - Access any state
 * - Have side effects
 * - Depend on external modules
 */

/**
 * Calculate Weighted Average Cost after a buy
 */
export function calculateWAC(
  existingShares: number,
  existingAvgCost: number,
  newShares: number,
  newPrice: number
): number {
  // Edge: First purchase
  if (existingShares === 0) {
    return newPrice;
  }
  
  // Edge: Zero new shares (shouldn't happen)
  if (newShares === 0) {
    return existingAvgCost;
  }
  
  const totalCost = (existingShares * existingAvgCost) + (newShares * newPrice);
  const totalShares = existingShares + newShares;
  
  // Edge: Division safety
  if (totalShares <= 0) {
    console.error('Invalid total shares in WAC calculation');
    return existingAvgCost;
  }
  
  return Math.round((totalCost / totalShares) * 100) / 100;
}

/**
 * Calculate realized P&L from a sell
 */
export function calculateRealizedPL(
  shares: number,
  sellPrice: number,
  avgCost: number
): number {
  const proceeds = shares * sellPrice;
  const cost = shares * avgCost;
  return Math.round((proceeds - cost) * 100) / 100;
}
```

---

## 9. Dependency Direction Rules

### 9.1 Layer Dependency Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DEPENDENCY DIRECTION RULES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ALLOWED DEPENDENCIES (→ means "can import from")                           │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       PRESENTATION LAYER                              │   │
│  │     app/ → components/ → features/                                    │   │
│  │       │         │            │                                        │   │
│  │       │         │            ├──→ hooks/ (generic)                    │   │
│  │       │         │            ├──→ models/                             │   │
│  │       │         │            ├──→ utils/                              │   │
│  │       │         │            └──→ types/                              │   │
│  │       │         │                                                     │   │
│  │       │         ├──→ hooks/                                           │   │
│  │       │         ├──→ types/                                           │   │
│  │       │         └──→ utils/                                           │   │
│  │       │                                                               │   │
│  │       └──→ features/                                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       APPLICATION LAYER                               │   │
│  │     features/context/ → store/ → engines/                             │   │
│  │                           │          │                                │   │
│  │                           │          ├──→ models/                     │   │
│  │                           │          ├──→ utils/                      │   │
│  │                           │          └──→ services/                   │   │
│  │                           │                                           │   │
│  │                           ├──→ models/                                │   │
│  │                           └──→ types/                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         DOMAIN LAYER                                  │   │
│  │     models/ ←── utils/calculations/                                   │   │
│  │       │                                                               │   │
│  │       └──→ types/                                                     │   │
│  │                                                                       │   │
│  │     (Pure types and calculations - no external dependencies)          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     INFRASTRUCTURE LAYER                              │   │
│  │     services/ → adapters/ → persistence/                              │   │
│  │         │           │            │                                    │   │
│  │         │           │            ├──→ models/ (for serialization)     │   │
│  │         │           │            └──→ types/                          │   │
│  │         │           │                                                 │   │
│  │         │           └──→ types/                                       │   │
│  │         │                                                             │   │
│  │         └──→ types/                                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Import Rules by Folder

| From Folder | Can Import From | Cannot Import From |
|-------------|-----------------|-------------------|
| `app/` | `components/`, `features/`, `hooks/`, `types/`, `config/`, `styles/` | `engines/`, `store/`, `services/`, `persistence/` |
| `components/common/` | `hooks/`, `types/`, `utils/`, `styles/` | `features/`, `engines/`, `store/` |
| `components/layout/` | `components/common/`, `hooks/`, `types/` | `features/`, `engines/` |
| `features/{name}/components/` | `features/{name}/hooks/`, `components/common/`, `hooks/`, `models/`, `types/`, `utils/` | Other features, `engines/` directly, `persistence/` |
| `features/{name}/hooks/` | `features/{name}/context/`, `models/`, `types/`, `utils/`, `hooks/` | Other features, `engines/` directly |
| `features/{name}/context/` | `engines/`, `store/`, `services/`, `models/`, `types/` | Other features |
| `engines/` | `models/`, `types/`, `utils/`, `services/` | `features/`, `components/`, `store/` |
| `store/` | `models/`, `types/`, `utils/` | `features/`, `components/`, `engines/` |
| `services/` | `types/`, `adapters/` | `features/`, `components/`, `engines/`, `store/` |
| `persistence/` | `models/`, `types/`, `services/` | `features/`, `components/`, `engines/`, `store/` |
| `models/` | `types/` | Everything else |
| `types/` | Nothing | Everything |
| `utils/` | `types/`, `models/` | Everything else |
| `hooks/` | `types/` | `features/`, `engines/`, `store/` |
| `charts/` | `types/`, `utils/`, `models/` | `features/`, `engines/`, `store/` |

### 9.3 Circular Dependency Prevention

```typescript
// ❌ FORBIDDEN: Circular dependency
// engines/TradeEngine.ts
import { usePortfolio } from '@/features/portfolio'; // NO!

// ✅ CORRECT: Dependency injection
// engines/TradeEngine.ts
class TradeEngine {
  constructor(
    private priceEngine: PriceEngine,
    private getPortfolio: () => Portfolio, // Injected function
  ) {}
}

// features/portfolio/context/PortfolioProvider.tsx
const tradeEngine = new TradeEngine(
  priceEngine,
  () => portfolioState, // Pass getter, not direct import
);
```

### 9.4 ESLint Boundary Rules

```javascript
// .eslintrc.cjs

module.exports = {
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          // Engines cannot import from features
          {
            target: './src/engines',
            from: './src/features',
            message: 'Engines cannot depend on features. Use dependency injection.',
          },
          // Features cannot import from other features
          {
            target: './src/features/price',
            from: './src/features/!(price)',
            message: 'Feature modules must be isolated. Use shared context.',
          },
          // Models cannot import from anywhere except types
          {
            target: './src/models',
            from: ['./src/features', './src/engines', './src/store', './src/services'],
            message: 'Models must be pure type definitions.',
          },
          // Components cannot import engines directly
          {
            target: './src/components',
            from: './src/engines',
            message: 'Components must access engines through context/hooks.',
          },
        ],
      },
    ],
  },
};
```

### 9.5 Path Alias Configuration

```typescript
// vite.config.ts

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@features': resolve(__dirname, './src/features'),
      '@engines': resolve(__dirname, './src/engines'),
      '@services': resolve(__dirname, './src/services'),
      '@store': resolve(__dirname, './src/store'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@models': resolve(__dirname, './src/models'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@config': resolve(__dirname, './src/config'),
      '@charts': resolve(__dirname, './src/charts'),
      '@persistence': resolve(__dirname, './src/persistence'),
      '@test': resolve(__dirname, './src/test'),
    },
  },
});

// tsconfig.json

{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@features/*": ["src/features/*"],
      "@engines/*": ["src/engines/*"],
      "@services/*": ["src/services/*"],
      "@store/*": ["src/store/*"],
      "@hooks/*": ["src/hooks/*"],
      "@models/*": ["src/models/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"],
      "@config/*": ["src/config/*"],
      "@charts/*": ["src/charts/*"],
      "@persistence/*": ["src/persistence/*"],
      "@test/*": ["src/test/*"]
    }
  }
}
```

---

## Summary

This project structure provides:

1. **Clear Separation of Concerns** - Each folder has a single, well-defined responsibility
2. **Feature Isolation** - Features are self-contained and don't cross-depend
3. **Engine Encapsulation** - Business logic is isolated from UI
4. **Testability** - Pure domain logic and dependency injection enable easy testing
5. **Scalability** - Adding new features or symbols requires no architectural changes
6. **Maintainability** - Strict import rules prevent architectural decay

The structure mirrors patterns used in production trading platforms like Zerodha Kite (feature isolation), TradingView (chart layer separation), and Bloomberg Terminal (engine-driven architecture).
