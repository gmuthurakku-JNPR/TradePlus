# Contributing to TradePulse

First off, thank you for considering contributing to TradePulse! 🎉

This document provides guidelines for contributing to the project. Following these guidelines helps communicate that you respect the time of the developers managing and developing this open-source project.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guide](#code-style-guide)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)

---

## 📜 Code of Conduct

### Our Standards

- **Be respectful** - Treat everyone with respect
- **Be constructive** - Provide helpful feedback
- **Be collaborative** - Work together toward solutions
- **Be patient** - Remember everyone was a beginner once

### Unacceptable Behavior

- Harassment, discrimination, or hate speech
- Trolling, insulting, or derogatory comments
- Publishing others' private information
- Unprofessional conduct

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm 9+
- **Git** 2.x+
- **Code Editor** (VS Code recommended)
- **Browser** Chrome 88+, Firefox 78+, Safari 14+, or Edge 88+

### First-Time Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/tradepulse.git
   cd tradepulse
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/tradepulse.git
   ```

4. **Install dependencies**
   ```bash
   cd tradepulse-app
   npm install
   ```

5. **Verify installation**
   ```bash
   npm run dev       # Start dev server
   npm test          # Run tests
   npm run lint      # Check code style
   ```

6. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## 🔄 Development Workflow

### 1. Sync with Upstream

Before starting work, sync your fork:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Create Feature Branch

```bash
git checkout -b feature/add-order-types
# or
git checkout -b fix/chart-rendering-bug
# or
git checkout -b docs/update-readme
```

### 3. Make Changes

- Write clean, well-documented code
- Follow the [Code Style Guide](#code-style-guide)
- Add tests for new features
- Update documentation if needed

### 4. Test Your Changes

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Check test coverage
npm run test:coverage

# Verify TypeScript
npm run build

# Check linting
npm run lint
```

### 5. Commit Changes

Follow the [Commit Message Convention](#commit-message-convention):

```bash
git add .
git commit -m "feat: add stop-loss order type"
```

### 6. Push to Your Fork

```bash
git push origin feature/add-order-types
```

### 7. Open Pull Request

- Go to GitHub and click "Compare & pull request"
- Fill out the PR template
- Link related issues
- Request review from maintainers

---

## 🎨 Code Style Guide

### TypeScript Guidelines

#### 1. **Type Safety**

```typescript
// ✅ Good: Explicit types
interface TradeRequest {
  type: 'buy' | 'sell';
  symbol: string;
  quantity: number;
  price: number;
}

function executeTrade(request: TradeRequest): TradeResult {
  // ...
}

// ❌ Bad: Implicit any
function executeTrade(request: any) {
  // ...
}
```

#### 2. **Interfaces over Types** (for objects)

```typescript
// ✅ Good
interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
}

// ❌ Bad
type PriceData = {
  symbol: string;
  price: number;
  timestamp: number;
};
```

#### 3. **Function Naming**

```typescript
// ✅ Good: Verb-based, descriptive
function calculateUnrealizedPnL(position: Position, currentPrice: number): number {}
function executeTrade(request: TradeRequest): TradeResult {}
function validateQuantity(quantity: number): boolean {}

// ❌ Bad: Vague or noun-based
function calculation(position: Position): number {}
function trade(request: any) {}
function check(qty: number): boolean {}
```

#### 4. **Avoid `any`**

```typescript
// ✅ Good: Proper types
function processData(data: TradeData[]): ProcessedData {
  return data.map(item => transform(item));
}

// ❌ Bad: Using any
function processData(data: any): any {
  return data.map((item: any) => transform(item));
}

// ⚠️ Acceptable: Only in catch blocks
try {
  // ...
} catch (error: any) {
  console.error('Error:', error.message);
}
```

#### 5. **Use Const Assertions**

```typescript
// ✅ Good
const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT'] as const;
type Symbol = typeof SYMBOLS[number]; // 'AAPL' | 'GOOGL' | 'MSFT'

// ❌ Bad
const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT']; // string[]
```

---

### React Guidelines

#### 1. **Component Structure**

```typescript
// ✅ Good: Functional component with props interface
interface ChartProps {
  symbol: string;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

export const Chart: React.FC<ChartProps> = ({ symbol, timeframe, onTimeframeChange }) => {
  // Hooks at top
  const [data, setData] = useState<PricePoint[]>([]);
  const chartData = useMemo(() => transformData(data), [data]);
  
  // Effects
  useEffect(() => {
    // Subscribe logic
  }, [symbol]);
  
  // Event handlers
  const handleClick = useCallback((event: React.MouseEvent) => {
    // ...
  }, []);
  
  // Render
  return (
    <div className={styles.chart}>
      {/* JSX */}
    </div>
  );
};
```

#### 2. **Use React.memo for Performance**

```typescript
// ✅ Good: Memoize components that receive frequent updates
export const WatchlistItem = React.memo<WatchlistItemProps>(({ symbol }) => {
  const price = usePrice(symbol);
  return <div>{price?.price.toFixed(2)}</div>;
});
```

#### 3. **Custom Hooks**

```typescript
// ✅ Good: Reusable logic in custom hooks
export function usePrice(symbol: string): PriceData | null {
  const [price, setPrice] = useState<PriceData | null>(null);
  
  useEffect(() => {
    const unsubscribe = subscribe(symbol, setPrice);
    return unsubscribe; // Cleanup
  }, [symbol]);
  
  return price;
}

// Usage
const price = usePrice('AAPL');
```

#### 4. **Props Destructuring**

```typescript
// ✅ Good: Destructure props
export const TradePanel: React.FC<TradePanelProps> = ({ 
  symbol, 
  onTradeExecute 
}) => {
  // ...
};

// ❌ Bad: Use props object
export const TradePanel: React.FC<TradePanelProps> = (props) => {
  const symbol = props.symbol;
  // ...
};
```

---

### File Organization

```
src/
├── engines/              # Business logic (functional modules)
│   ├── PriceEngine/
│   │   ├── index.ts     # Public API
│   │   ├── types.ts     # Internal types
│   │   └── __tests__/   # Tests
│   ├── TradeEngine/
│   └── OrderEngine/
├── features/            # Feature-sliced design
│   ├── chart/
│   │   ├── Chart.tsx
│   │   ├── Chart.module.css
│   │   └── index.ts     # Export barrel
│   ├── watchlist/
│   └── portfolio/
├── components/          # Shared components
│   ├── Button/
│   └── Input/
├── hooks/               # Custom React hooks
│   ├── usePrice.ts
│   └── usePortfolio.ts
├── types/               # Shared type definitions
│   └── index.ts
└── utils/               # Utility functions
    ├── formatters.ts
    └── validators.ts
```

---

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Files** | PascalCase (components), camelCase (utils) | `Chart.tsx`, `formatters.ts` |
| **Components** | PascalCase | `TradePanel`, `WatchlistItem` |
| **Functions** | camelCase | `executeTrade`, `calculatePnL` |
| **Variables** | camelCase | `currentPrice`, `orderList` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_QUANTITY`, `DEFAULT_BALANCE` |
| **Interfaces** | PascalCase | `TradeRequest`, `PriceData` |
| **Types** | PascalCase | `OrderType`, `Timeframe` |
| **Enums** | PascalCase | `OrderStatus`, `TradeType` |

---

### Code Formatting

We use **ESLint** for linting. Configuration:

```javascript
// eslint.config.js
export default {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    'no-console': 'warn',
    'no-debugger': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
};
```

**Run linter:**
```bash
npm run lint
```

---

## 🧪 Testing Guidelines

### Test Requirements

- **All new features** must include tests
- **Bug fixes** should include regression tests
- **Coverage** must remain ≥80%
- **Tests must pass** before PR approval

### Writing Tests

```typescript
/**
 * Test file naming: ComponentName.test.ts
 * Location: __tests__/ folder
 */

import { executeTrade } from '../index';

describe('TradeEngine', () => {
  beforeEach(() => {
    // Setup: Reset state before each test
    resetPortfolio();
  });
  
  describe('Buy Trade', () => {
    test('should execute valid buy trade', () => {
      // Arrange
      const request: TradeRequest = {
        type: 'buy',
        symbol: 'AAPL',
        quantity: 10,
        price: 150.00,
      };
      
      // Act
      const result = executeTrade(request);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.portfolio.balance).toBe(98497.00);
    });
    
    test('should reject insufficient cash', () => {
      const request: TradeRequest = {
        type: 'buy',
        symbol: 'AAPL',
        quantity: 10000,
        price: 150.00,
      };
      
      const result = executeTrade(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient cash');
    });
  });
});
```

### Test Best Practices

- ✅ Test behavior, not implementation
- ✅ Use descriptive test names
- ✅ Follow AAA pattern (Arrange, Act, Assert)
- ✅ Keep tests focused (one assertion per test when possible)
- ✅ Clean up after tests (unsubscribe, reset state)
- ❌ Don't skip tests (`test.skip`)
- ❌ Don't test third-party libraries

See [TEST_STRATEGY.md](./TEST_STRATEGY.md) for comprehensive testing guidelines.

---

## 📝 Commit Message Convention

We follow **Conventional Commits** specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add stop-loss order type` |
| `fix` | Bug fix | `fix: correct P&L calculation` |
| `docs` | Documentation | `docs: update README with examples` |
| `style` | Code style (formatting) | `style: format TradeEngine.ts` |
| `refactor` | Code refactoring | `refactor: extract validation logic` |
| `perf` | Performance improvement | `perf: memoize expensive calculations` |
| `test` | Add/update tests | `test: add OrderEngine unit tests` |
| `chore` | Maintenance | `chore: update dependencies` |

### Examples

```bash
# Simple commit
git commit -m "feat: add limit order support"

# With scope
git commit -m "fix(chart): correct x-axis scaling"

# With body
git commit -m "feat: add stop-loss orders

- Add stopPrice field to Order interface
- Implement price monitoring in OrderEngine
- Add tests for stop-loss execution
- Update documentation"

# Breaking change
git commit -m "feat!: change executeTrade API

BREAKING CHANGE: executeTrade now returns Promise<TradeResult>
instead of TradeResult. Update all callers to use async/await."
```

---

## 🔀 Pull Request Process

### PR Checklist

Before submitting, ensure:

- [ ] Code follows the [Code Style Guide](#code-style-guide)
- [ ] All tests pass (`npm test`)
- [ ] Test coverage ≥80% (`npm run test:coverage`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] No linting errors (`npm run lint`)
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow [convention](#commit-message-convention)
- [ ] Branch is up-to-date with `main`

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] Documentation updated
```

### Review Process

1. **Submit PR** - Fill out PR template completely
2. **Automated checks** - CI runs tests and linting
3. **Code review** - Maintainer reviews code
4. **Address feedback** - Make requested changes
5. **Approval** - Maintainer approves PR
6. **Merge** - Maintainer merges to `main`

### After Merge

- Delete your feature branch
- Sync your fork with upstream
- Close related issues

---

## 🏗️ Project Structure

### Key Directories

```
TradePlus/
├── tradepulse-app/          # React application
│   ├── src/
│   │   ├── engines/         # Business logic (NO React)
│   │   │   ├── PriceEngine/
│   │   │   ├── TradeEngine/
│   │   │   └── OrderEngine/
│   │   ├── features/        # Feature modules (React)
│   │   │   ├── chart/
│   │   │   ├── watchlist/
│   │   │   └── portfolio/
│   │   ├── components/      # Shared components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── store/           # State management
│   │   ├── types/           # Type definitions
│   │   └── utils/           # Utility functions
│   ├── public/              # Static assets
│   ├── package.json         # Dependencies
│   ├── tsconfig.json        # TypeScript config
│   ├── vite.config.ts       # Vite config
│   └── jest.config.js       # Jest config
├── docs/                    # Documentation
├── README.md                # Project overview
├── ARCHITECTURE.md          # Architecture guide
├── PERFORMANCE.md           # Performance guide
├── TEST_STRATEGY.md         # Testing guide
└── CONTRIBUTING.md          # This file
```

### Module Dependencies

```
Presentation Layer (React)
        ↓
   Hooks Layer
        ↓
  Engines Layer (Pure TS)
        ↓
Infrastructure Layer
```

**Rules:**
- Engines **CANNOT** import React
- Components **CAN** import engines via hooks
- Hooks bridge engines and components

---

## 🛠️ Common Tasks

### Adding a New Feature

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Add business logic** (if needed)
   ```typescript
   // src/engines/MyEngine/index.ts
   export function myFunction() {
     // Pure TypeScript logic
   }
   ```

3. **Add React hook** (if needed)
   ```typescript
   // src/hooks/useMyFeature.ts
   export function useMyFeature() {
     // Connect engine to React
   }
   ```

4. **Add component**
   ```typescript
   // src/features/myfeature/MyFeature.tsx
   export const MyFeature: React.FC = () => {
     const data = useMyFeature();
     return <div>{data}</div>;
   };
   ```

5. **Add tests**
   ```typescript
   // src/engines/MyEngine/__tests__/MyEngine.test.ts
   describe('MyEngine', () => {
     test('should work', () => {
       expect(myFunction()).toBe(expected);
     });
   });
   ```

6. **Update documentation**
   - Update README if feature is user-facing
   - Update ARCHITECTURE if significant change

---

### Fixing a Bug

1. **Reproduce the bug** - Write a failing test
2. **Fix the bug** - Make the test pass
3. **Verify fix** - Ensure no regressions
4. **Document** - Add comments explaining the fix

---

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update specific package
npm update package-name

# Update all packages (major versions)
npm update

# Run tests after updating
npm test
```

---

## 🌟 Recognition

Contributors will be recognized in:
- GitHub contributors page
- README.md credits section
- Release notes (for significant contributions)

---

## 📞 Getting Help

- **Questions?** Open a [Discussion](https://github.com/owner/tradepulse/discussions)
- **Bug?** Open an [Issue](https://github.com/owner/tradepulse/issues)
- **Feature request?** Open an [Issue](https://github.com/owner/tradepulse/issues) with `enhancement` label
- **Security issue?** Email security@tradepulse.dev (DO NOT open public issue)

---

## 📚 Additional Resources

### Documentation
- [README.md](./README.md) - Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [PERFORMANCE.md](./PERFORMANCE.md) - Performance guide
- [TEST_STRATEGY.md](./TEST_STRATEGY.md) - Testing guide

### External Resources
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

<p align="center">
  <strong>Thank you for contributing to TradePulse! 🚀</strong><br>
  <sub>Your contributions make this project better for everyone.</sub>
</p>
