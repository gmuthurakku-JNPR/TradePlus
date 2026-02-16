# TradePulse Project Setup

**Status:** ✅ Project Skeleton Complete  
**Date:** February 16, 2026  
**Framework:** React 18 + TypeScript + Vite

---

## Project Overview

TradePulse is a simulated paper trading terminal built with React and TypeScript. The project follows the architecture defined in `ARCHITECTURE.md` and `PROJECT_STRUCTURE.md`.

---

## Folder Structure Explanation

```
tradepulse-app/
├── src/
│   ├── app/                      # Application bootstrap and providers
│   │   └── providers/            # Global Context providers
│   │
│   ├── components/               # Reusable UI components
│   │   ├── common/              # Generic UI components (Button, Input, Modal, etc.)
│   │   └── layout/              # Layout components (Header, Sidebar, MainContent, BottomPanel)
│   │
│   ├── features/                # Feature modules (domain-driven)
│   │   ├── price/               # Price display and subscriptions
│   │   ├── chart/               # Chart rendering and interactions
│   │   ├── order/               # Order entry and management
│   │   ├── trade/               # Trade execution UI
│   │   ├── portfolio/           # Portfolio display and metrics
│   │   ├── watchlist/           # Symbol watchlist
│   │   └── settings/            # User preferences
│   │
│   ├── engines/                 # Business logic (Functional modules)
│   │   ├── PriceEngine/         # Price simulation (GBM)
│   │   ├── TradeEngine/         # Trade execution (atomic updates)
│   │   └── OrderEngine/         # Limit order management
│   │
│   ├── store/                   # State management (Context + useReducer)
│   │   ├── priceStore/
│   │   ├── orderStore/
│   │   ├── tradeStore/
│   │   ├── portfolioStore/
│   │   └── watchlistStore/
│   │
│   ├── models/                  # Domain models and interfaces
│   ├── services/                # Utility services (storage, time, ID generation)
│   ├── persistence/             # Data persistence and schema
│   ├── charts/                  # Chart rendering system
│   ├── utils/                   # Utility functions
│   ├── types/                   # Type definitions (index.ts)
│   ├── styles/                  # Global styles
│   ├── hooks/                   # Custom React hooks
│   │
│   ├── App.tsx                  # App shell (3-panel layout)
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global CSS
│
├── public/                      # Static assets
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts              # Vite configuration with path aliases
└── index.html                   # HTML entry point
```

---

## Key Design Decisions

### 1. **Functional Modules for Engines**
Engines are implemented as functional modules with closures (not classes) for:
- Better tree-shaking
- Natural React hook compatibility
- Simpler state management
- Easier testing

### 2. **Singleton Pattern**
PriceEngine is a singleton accessible globally for consistent price data.

### 3. **Callback-Based Communication**
Engines communicate via callbacks to prevent circular dependencies.

### 4. **Hybrid State Management**
- **Engine State** (module-level): Source of truth for business data
- **React State** (Context + useReducer): Derived UI state

### 5. **Clean Architecture Layers**
- Presentation → Application → Domain → Infrastructure
- Strict dependency direction

---

## TypeScript Paths

All import paths are aliased for cleaner code:

```typescript
// Instead of: import { PriceData } from '../../../types'
import { PriceData } from '@types';

// Aliases configured in tsconfig.json and vite.config.ts:
@              → src/
@components    → src/components
@features      → src/features
@engines       → src/engines
@store         → src/store
@hooks         → src/hooks
@models        → src/models
@utils         → src/utils
@types         → src/types
@services      → src/services
@persistence   → src/persistence
@charts        → src/charts
```

---

## Running the Project

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

The app will start at `http://localhost:3000`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Type Check
```bash
npm run type-check
```

### Lint
```bash
npm run lint
```

---

## App Shell Layout

The current `App.tsx` implements a 3-panel layout:

```
┌─────────────────────────────────────────────────┐
│         HEADER (TradePulse Title)               │
├──────────────┬──────────────────────────────────┤
│              │                                  │
│  SIDEBAR     │      MAIN CONTENT AREA           │
│              │      (Charts, Orders, etc.)      │
│  Navigation  │                                  │
│              │                                  │
├──────────────┴──────────────────────────────────┤
│     BOTTOM PANEL (Trade History, Orders)       │
└─────────────────────────────────────────────────┘
```

**Responsive Design**: Sidebar is 250px fixed; main content expands to fill available space.

---

## Type Definitions

All core types are defined in `src/types/index.ts`:

- **Price Module**: `PriceData`, `PricePoint`, `PriceHistory`
- **Trade Module**: `Trade`, `TradeRequest`, `TradeResult`, `TradeValidation`
- **Order Module**: `LimitOrder`, `OrderRequest`, `OrderUpdate`
- **Portfolio Module**: `Position`, `Portfolio`, `PortfolioMetrics`
- **Storage**: `StorageSchema`
- **UI State**: `UIState`, `ToastMessage`
- **Chart**: `ChartPoint`, `ChartDomain`, `ChartScale`

---

## Next Steps for Implementation

### Phase 1: Engines (Domain Layer)
- [ ] Implement GBM price simulator in PriceEngine
- [ ] Implement trade validation in TradeEngine
- [ ] Implement limit order matching in OrderEngine
- [ ] Add test suite for engines

### Phase 2: Persistence (Infrastructure)
- [ ] Implement StorageService (localStorage abstraction)
- [ ] Implement MigrationService (schema versioning)
- [ ] Add data serialization helpers

### Phase 3: State Management (Application)
- [ ] Create Context providers for each feature store
- [ ] Implement reducers for state mutations
- [ ] Create custom hooks for engine subscriptions

### Phase 4: UI Components (Presentation)
- [ ] Build common components (Button, Input, Modal, etc.)
- [ ] Implement layout components (Header, Sidebar)
- [ ] Build feature components (Price display, Chart, Order form)

### Phase 5: Integration & Testing
- [ ] Wire up engines to React components
- [ ] Implement end-to-end data flows
- [ ] Add comprehensive test coverage

---

## Development Workflow

1. **Start dev server**: `npm run dev`
2. **Open browser**: `http://localhost:3000`
3. **Hot Module Replacement** works automatically
4. **Type checking**: Continuous in editor

---

## Environment Setup

- **Node.js**: v18+ recommended
- **Package Manager**: npm
- **Editor**: VS Code (with TypeScript extension)
- **Browser**: Chrome/Firefox (modern ES2022 support)

---

## Key Dependencies

- **react**: UI framework
- **react-dom**: React rendering
- **vite**: Build tool
- **typescript**: Type safety
- **date-fns**: Date utilities

---

## Configuration Files

- **tsconfig.json**: TypeScript settings and path aliases
- **tsconfig.app.json**: App-specific TypeScript config
- **vite.config.ts**: Vite build config with aliases
- **eslint.config.js**: Linting rules

---

**Ready to start implementation!**

For detailed architecture, see [ARCHITECTURE.md](../ARCHITECTURE.md)  
For project structure details, see [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md)  
For product requirements, see [PRD-TradePulse.md](../PRD-TradePulse.md)
