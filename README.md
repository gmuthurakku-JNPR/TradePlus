# TradePulse

> **A realistic simulated paper trading terminal for learning trading concepts without financial risk.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Performance](https://img.shields.io/badge/performance-A+-brightgreen.svg)](./docs/PERFORMANCE_AUDIT.md)
[![Test Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen.svg)](./docs/TEST_COVERAGE_REPORT.md)

**Project Status:** ✅ **PRODUCTION READY** | **Version:** 1.0.0 | **Last Updated:** February 16, 2026

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Usage Guide](#-usage-guide)
- [Architecture](#️-architecture)
- [Development](#-development)
- [Testing](#-testing)
- [Performance](#-performance)
- [Documentation](#-documentation)
- [Browser Support](#-browser-support)
- [Project Status](#-project-status)
- [Support](#-support)
- [License](#-license)
- [Credits](#-credits)

---

## 🎯 Overview

**TradePulse** is a client-side web application that provides a **risk-free environment** for learning stock trading concepts. Built with React and TypeScript, it simulates realistic market behavior using **Geometric Brownian Motion** (GBM) for price generation.

### Why TradePulse?

- 🎓 **Educational Focus** - Learn trading without risking real money
- 🚀 **Zero Setup** - Works entirely in your browser, no backend required
- 🔒 **Privacy First** - All data stays local in localStorage
- ⚡ **High Performance** - 60 FPS, sub-100ms latency
- 📊 **Realistic Simulation** - GBM-based price engine with proper bid/ask spreads
- 💯 **Production Ready** - 85% test coverage, TypeScript strict mode

### Key Metrics

| Metric | Value |
|--------|-------|
| **Bundle Size** | 285KB (gzipped) |
| **Initial Load** | ~1.2 seconds |
| **Price Updates** | Every 1 second (configurable) |
| **Test Coverage** | 85%+ (200+ tests) |
| **Type Safety** | 100% (strict mode) |
| **Dependencies** | 3 runtime (minimal) |

---

## ✨ Features

For a complete list of implemented features and PRD requirements coverage, see:
- **[STAFF_ENGINEER_REVIEW.md](./docs/STAFF_ENGINEER_REVIEW.md)** - Complete requirements checklist
- **[PRD-TradePulse.md](./PRD-TradePulse.md)** - Original product requirements (1004 lines)

### Core Trading Features

- ✅ **Real-Time Price Simulation** (19 symbols, GBM-based)
- ✅ **Market Orders** (instant execution with 1s throttle)
- ✅ **Limit Orders** (GTC with FIFO execution)
- ✅ **Portfolio Management** (WAC P&L calculation)
- ✅ **Interactive Charts** (SVG-based, 6 timeframes)
- ✅ **Watchlist** (up to 20 symbols)
- ✅ **Trade History** (1000-trade cap with FIFO pruning)
- ✅ **Settings & Preferences** (configurable balance, themes, update speed)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm 9+
- **Modern browser:** Chrome 88+, Firefox 78+, Safari 14+, Edge 88+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tradepulse.git
cd tradepulse

# Navigate to the app directory
cd tradepulse-app

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

Build output will be in `tradepulse-app/dist/` (~285KB gzipped).

---

## 📖 Usage Guide

For detailed user instructions, see **[docs/QUICKSTART.md](./docs/QUICKSTART.md)**

### Basic Workflow

1. **Select a Symbol** - Click a stock in the watchlist
2. **View the Chart** - Analyze price movements
3. **Place a Trade** - Choose Market or Limit order
4. **Monitor Portfolio** - Track positions and P&L

---

## 🏛️ Architecture

TradePulse follows **Clean Architecture** principles with **Feature-Sliced Design**:

```
┌─────────────────────────────────────┐
│       PRESENTATION LAYER            │
│  React Components + View Hooks      │
├─────────────────────────────────────┤
│       APPLICATION LAYER             │
│  Engines + Context Providers        │
├─────────────────────────────────────┤
│         DOMAIN LAYER                │
│  Types + Models + Pure Functions    │
├─────────────────────────────────────┤
│     INFRASTRUCTURE LAYER            │
│  Persistence + Services             │
└─────────────────────────────────────┘
```

### Key Engines

- **PriceEngine** - GBM price simulation (Singleton pattern)
- **TradeEngine** - Order execution & validation (Command pattern)
- **OrderEngine** - Limit order management (Strategy pattern)

For comprehensive architecture documentation, see:
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system design & patterns
- **[PSD-TradePulse.md](./PSD-TradePulse.md)** - Detailed technical specifications
- **[STAFF_ENGINEER_REVIEW.md](./docs/STAFF_ENGINEER_REVIEW.md)** - Architecture compliance audit

---

## 💻 Development

### Available Scripts

```bash
# Development
npm run dev           # Start dev server
npm run build         # Build for production
npm run preview       # Preview production build
npm run lint          # Run ESLint

# Testing
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 19.2 |
| **Language** | TypeScript 5.9 (strict) |
| **Build Tool** | Vite 7 |
| **Styling** | CSS Modules + Variables |
| **Charting** | Native SVG |
| **State** | Context + useReducer |
| **Testing** | Jest + ts-jest |

### Contributing

Want to contribute? See:
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Complete contribution guide
- **[TEST_STRATEGY.md](./TEST_STRATEGY.md)** - Testing guidelines
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture

---

## 🧪 Testing

**Test Coverage: 85%+ (exceeds 80% target)**

```bash
npm test              # Run all 200+ tests
npm run test:coverage # Generate coverage report
```

For detailed testing documentation, see:
- **[TEST_STRATEGY.md](./TEST_STRATEGY.md)** - Comprehensive testing approach & guidelines
- **[TEST_COVERAGE_REPORT.md](./docs/TEST_COVERAGE_REPORT.md)** - Detailed coverage report

---

## ⚡ Performance

**Performance Grade: A+ (95/100)**

All benchmarks **exceed targets** by 2-8×:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Initial Load | < 3s | 1.2s | ✅ 2.5× faster |
| Price Update | < 100ms | 15ms | ✅ 6.7× faster |
| Chart Render | < 200ms | 45ms | ✅ 4.4× faster |
| Bundle Size | < 500KB | 285KB | ✅ 1.8× smaller |

For detailed performance documentation, see:
- **[PERFORMANCE.md](./PERFORMANCE.md)** - Performance optimization guide & techniques
- **[PERFORMANCE_AUDIT.md](./docs/PERFORMANCE_AUDIT.md)** - Comprehensive audit report

---

## 📚 Documentation

### 📖 Complete Documentation Suite

**[📋 Documentation Index](./DOCUMENTATION_INDEX.md)** - Complete guide to all documentation

### Core Technical Docs

| Document | Description | Audience |
|----------|-------------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture & design patterns | Developers |
| [PERFORMANCE.md](./PERFORMANCE.md) | Performance optimization guide | Engineers |
| [TEST_STRATEGY.md](./TEST_STRATEGY.md) | Testing approach & best practices | QA/Developers |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines & code style | Contributors |

### Specification Documents

| Document | Description | Lines |
|----------|-------------|-------|
| [PRD-TradePulse.md](./PRD-TradePulse.md) | Product Requirements | 1,004 |
| [PSD-TradePulse.md](./PSD-TradePulse.md) | System Design | 3,211 |

### Engineering Reports

| Document | Description | Grade |
|----------|-------------|-------|
| [STAFF_ENGINEER_REVIEW.md](./docs/STAFF_ENGINEER_REVIEW.md) | Final production review | **96.5/100** ✅ |
| [PERFORMANCE_AUDIT.md](./docs/PERFORMANCE_AUDIT.md) | Performance analysis | **A+ (95/100)** |
| [TEST_COVERAGE_REPORT.md](./docs/TEST_COVERAGE_REPORT.md) | Test coverage report | **85%** |

### Getting Started Guides

| Document | Description |
|----------|-------------|
| [QUICKSTART.md](./docs/QUICKSTART.md) | User onboarding guide |
| [SETUP.md](./docs/SETUP.md) | Development setup |

---

## 🌐 Browser Support

| Browser | Minimum Version | Status |
|---------|-----------------|--------|
| Chrome | 88+ | ✅ Fully Supported |
| Edge | 88+ | ✅ Fully Supported |
| Firefox | 78+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |

Mobile: iOS Safari 14+, Chrome Mobile 88+

---

## 📊 Project Status

### Version 1.0.0 (Current)

**Status:** ✅ **PRODUCTION READY**  
**Release Date:** February 16, 2026

**Quality Metrics:**
- ✅ 47/47 Must-Have requirements implemented
- ✅ 0 critical bugs identified
- ✅ 85%+ test coverage
- ✅ A+ performance grade (95/100)
- ✅ **96.5/100 overall quality score**

**Production Approval:** Signed off by Staff Engineer on February 16, 2026

See **[STAFF_ENGINEER_REVIEW.md](./docs/STAFF_ENGINEER_REVIEW.md)** for complete assessment.

### Roadmap

- **v1.0.1** (Week 1) - Minor bug fixes
- **v1.1.0** (4-6 weeks) - Candlestick charts, indicators, accessibility
- **v1.2.0** (8-12 weeks) - Fractional shares, stop-loss orders, export features
- **v2.0.0** (Future) - User accounts, cloud sync, social features

---

## 🤝 Support

### Getting Help

- 📖 **Documentation:** Check [docs/](./docs/) folder
- 🐛 **Bug Reports:** Open an issue on GitHub
- 💡 **Feature Requests:** Open an issue with `enhancement` label

### FAQ

**Q: Is my data stored on a server?**  
A: No. All data is stored locally in localStorage.

**Q: Can I use real money?**  
A: No. TradePulse is **simulation only** with fake money and mock prices.

**Q: How realistic are the prices?**  
A: Generated using Geometric Brownian Motion (GBM), the same model used in quantitative finance.

---

## 📄 License

**MIT License**  
Copyright (c) 2026 TradePulse Contributors

See [LICENSE](LICENSE) file for details.

---

## 🏆 Credits

### Built With

- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Jest** - Testing
- **date-fns** - Date utilities

### Engineering Team

- **Product Management** - PRD v1.1 specification
- **Frontend Architecture** - PSD design (3211 lines)
- **Performance Engineering** - Optimization audit (A+ grade)
- **QA Engineering** - Comprehensive test suite (85% coverage)
- **Staff Engineering** - Final production review (**Approved**)

---

<p align="center">
  <strong>⚠️ DISCLAIMER</strong><br>
  TradePulse is a <strong>simulated trading platform for educational purposes only</strong>.<br>
  It uses <strong>mock data</strong> and <strong>fake money</strong>. No real trades are executed.<br>
  Past performance (even in simulation) does not guarantee future results.
</p>

<p align="center">
  Made with ❤️ by the TradePulse team<br>
  <sub>Built February 2026 | v1.0.0 | Production Ready</sub>
</p>

