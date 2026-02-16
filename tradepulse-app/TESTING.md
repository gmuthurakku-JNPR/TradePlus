# TradePulse Testing Guide

**Status:** Framework complete, ready for implementation  
**Created:** February 16, 2026

---

## Testing Strategy

The TradePulse project follows a **Test-Driven Development** approach with three levels of testing:

1. **Unit Tests** - Individual engines and utilities
2. **Integration Tests** - Engines working together
3. **E2E Tests** - Full user workflows

---

## Running Tests

### Setup
```bash
# Install test dependencies (future)
npm install --save-dev vitest @testing-library/react @testing-library/user-event

# Run tests
npm run test

# Run tests in watch mode (during development)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

---

## Unit Testing Pattern

### Test Structure
```typescript
// src/engines/__tests__/PriceEngine.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PriceEngine } from '../PriceEngine';
import type { PriceData } from '@types';

describe('PriceEngine', () => {
  describe('subscribe', () => {
    it('should notify subscriber when price updates', () => {
      const callback = vi.fn();
      const unsubscribe = PriceEngine.subscribe('AAPL', callback);

      // Trigger update
      // ... (mock implementation)

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'AAPL' })
      );
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = PriceEngine.subscribe('AAPL', callback);

      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
      // Callback should not be called after unsubscribe
    });
  });

  describe('getPrice', () => {
    it('should return price data for subscribed symbol', () => {
      const price = PriceEngine.getPrice('AAPL');
      
      expect(price).toBeDefined();
      expect(price?.symbol).toBe('AAPL');
      expect(price?.price).toBeGreaterThan(0);
    });

    it('should return undefined for unknown symbol', () => {
      const price = PriceEngine.getPrice('UNKNOWN');
      expect(price).toBeUndefined();
    });
  });

  describe('start and stop', () => {
    it('should start and stop price updates', () => {
      PriceEngine.start();
      // Prices should be updating

      PriceEngine.stop();
      // Prices should no longer update
    });
  });
});
```

### Key Testing Concepts

**Mocking Callbacks:**
```typescript
import { vi } from 'vitest';

const callback = vi.fn();
PriceEngine.subscribe('AAPL', callback);

// Verify called with specific arguments
expect(callback).toHaveBeenCalledWith(expectedPrice);
expect(callback).toHaveBeenCalledTimes(1);
```

**Testing Timing:**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

it('should notify subscribers every 1 second', async () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  
  PriceEngine.subscribe('AAPL', callback);
  PriceEngine.start();

  await vi.advanceTimersByTimeAsync(1000);
  expect(callback).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(1000);
  expect(callback).toHaveBeenCalledTimes(2);

  vi.useRealTimers();
});
```

---

## Testing Each Engine

### 1. PriceEngine Unit Tests

```typescript
describe('PriceEngine', () => {
  // Subscription tests
  describe('subscribe', () => {
    it('should return unsubscribe function');
    it('should notify callback on price update');
    it('should allow multiple subscribers');
    it('should handle callback errors gracefully');
  });

  // Price generation tests
  describe('price generation', () => {
    it('should generate prices using GBM formula');
    it('should maintain spread between bid and ask');
    it('should track high and low prices');
  });

  // History tests
  describe('getHistory', () => {
    it('should limit history to 500 points');
    it('should return chronological order');
    it('should include OHLCV data');
  });

  // Lifecycle tests
  describe('start/stop', () => {
    it('should start price simulation');
    it('should stop price simulation');
    it('should clear state on reset');
  });
});
```

### 2. TradeEngine Unit Tests

```typescript
describe('TradeEngine', () => {
  // Validation tests
  describe('trade validation', () => {
    it('should reject negative quantity');
    it('should reject trade without sufficient cash');
    it('should reject unknown symbol');
    it('should accept valid trade request');
  });

  // Execution tests
  describe('executeTrade', () => {
    it('should execute buy order');
    it('should execute sell order');
    it('should handle atomic updates');
    it('should enforce throttle (1 per second)');
    it('should record trade in history');
    it('should persist to localStorage');
  });

  // Portfolio tests
  describe('portfolio tracking', () => {
    it('should update cash after trade');
    it('should track positions correctly');
    it('should calculate realized P&L');
    it('should return accurate portfolio snapshot');
  });

  // Throttle tests
  describe('throttle logic', () => {
    it('should reject trade if still throttled');
    it('should show remaining throttle time');
    it('should allow trade after throttle expires');
  });
});
```

### 3. OrderEngine Unit Tests

```typescript
describe('OrderEngine', () => {
  // Order placement tests
  describe('placeOrder', () => {
    it('should create order with unique ID');
    it('should set order status to open');
    it('should store order in open orders list');
    it('should accept buy and sell orders');
  });

  // Order matching tests
  describe('order matching', () => {
    it('should match buy order when price <= limit');
    it('should match sell order when price >= limit');
    it('should execute trade on match');
    it('should move matched order to history');
  });

  // Order management tests
  describe('cancelOrder', () => {
    it('should remove order from open list');
    it('should move order to history');
    it('should reject cancellation of non-existent order');
  });

  describe('modifyOrder', () => {
    it('should update limit price');
    it('should update quantity');
    it('should prevent modification after match');
  });

  // Query tests
  describe('getOpenOrders', () => {
    it('should return only open orders');
    it('should return empty list if none exist');
  });

  describe('getOrdersForSymbol', () => {
    it('should filter orders by symbol');
    it('should return both open and filled orders');
  });
});
```

---

## Integration Testing Pattern

### Test Structure
```typescript
// src/__tests__/integration/engines.integration.test.ts
describe('Engine Integration', () => {
  let priceEngine: any;
  let tradeEngine: any;
  let orderEngine: any;

  beforeEach(() => {
    // Reset all engines
    priceEngine.reset();
    tradeEngine.reset();
    orderEngine.reset();
  });

  describe('PriceEngine → TradeEngine', () => {
    it('should execute trades at price from PriceEngine', () => {
      const price = priceEngine.getPrice('AAPL');
      const result = tradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'buy',
        orderType: 'market',
        quantity: 10,
      });

      expect(result.executedPrice).toBeDefined();
      expect(result.executedPrice).toBeCloseTo(price.price, 1);
    });
  });

  describe('PriceEngine → OrderEngine → TradeEngine', () => {
    it('should auto-execute limit order when price matches', async () => {
      const portfolio1 = tradeEngine.getPortfolio();
      const initialCash = portfolio1.cash;

      // Place limit order at price $150
      orderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'buy',
        limitPrice: 150,
        quantity: 5,
      });

      // Simulate price update to $150
      priceEngine.setPriceForTest('AAPL', 150);

      // Order should have executed
      await vi.advanceTimersByTimeAsync(100);

      const portfolio2 = tradeEngine.getPortfolio();
      expect(portfolio2.cash).toBeLessThan(initialCash);
      expect(portfolio2.positions.get('AAPL')?.quantity).toBe(5);
    });
  });
});
```

---

## E2E Testing Pattern

### Example: Complete Trading Workflow
```typescript
// src/__tests__/e2e/trading.e2e.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

describe('Trading Workflow E2E', () => {
  it('should complete full buy→sell workflow', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('TradePulse')).toBeInTheDocument();
    });

    // 2. Navigate to trade panel
    const tradeTab = screen.getByText('Trade');
    await user.click(tradeTab);

    // 3. Enter trade details
    const symbolInput = screen.getByLabelText('Symbol');
    await user.type(symbolInput, 'AAPL');

    const quantityInput = screen.getByLabelText('Quantity');
    await user.type(quantityInput, '10');

    // 4. Submit trade
    const buyButton = screen.getByRole('button', { name: /buy/i });
    await user.click(buyButton);

    // 5. Verify success toast
    await waitFor(() => {
      expect(screen.getByText(/trade executed/i)).toBeInTheDocument();
    });

    // 6. Verify portfolio updated
    expect(screen.getByText('10 AAPL')).toBeInTheDocument();

    // 7. Sell half position
    const sellButton = screen.getByRole('button', { name: /sell/i });
    const quantityInput2 = screen.getByDisplayValue('10');
    await user.clear(quantityInput2);
    await user.type(quantityInput2, '5');
    await user.click(sellButton);

    // 8. Verify position reduced
    await waitFor(() => {
      expect(screen.getByText('5 AAPL')).toBeInTheDocument();
    });
  });
});
```

---

## Mock Data for Testing

### Price Mocks
```typescript
export const mockPriceData = {
  symbol: 'AAPL',
  price: 150.25,
  bid: 150.20,
  ask: 150.30,
  spread: 0.10,
  high: 152.00,
  low: 149.50,
  change: 2.50,
  changePercent: 1.69,
  timestamp: new Date(),
};

export const mockAllPrices = new Map([
  ['AAPL', mockPriceData],
  ['GOOGL', { ...mockPriceData, symbol: 'GOOGL', price: 140.50 }],
  ['MSFT', { ...mockPriceData, symbol: 'MSFT', price: 380.75 }],
]);
```

### Trade Mocks
```typescript
export const mockTradeRequest = {
  symbol: 'AAPL',
  type: 'buy' as const,
  orderType: 'market' as const,
  quantity: 10,
};

export const mockTradeResult = {
  success: true,
  tradeId: 'trade-001',
  executedPrice: 150.25,
  fee: 2.25,
  timestamp: new Date(),
};

export const mockPortfolio = {
  cash: 85000,
  positions: new Map([
    ['AAPL', { quantity: 10, avgCost: 150.25 }],
  ]),
  realizedPL: 0,
  initialCash: 100000,
};
```

### Order Mocks
```typescript
export const mockOrderRequest = {
  symbol: 'AAPL',
  type: 'buy' as const,
  limitPrice: 150,
  quantity: 5,
};

export const mockOrder = {
  id: 'order-001',
  symbol: 'AAPL',
  type: 'buy' as const,
  limitPrice: 150,
  quantity: 5,
  status: 'open' as const,
  createdAt: new Date(),
};
```

---

## Performance Testing

### Testing Performance Metrics
```typescript
describe('PriceEngine Performance', () => {
  it('should handle 500 symbols without lag', () => {
    const metrics = {
      startTime: performance.now(),
      callbacks: [],
    };

    // Subscribe to all 500 symbols
    for (let i = 0; i < 500; i++) {
      const callback = vi.fn();
      PriceEngine.subscribe(`SYM${i}`, callback);
      metrics.callbacks.push(callback);
    }

    // Measure update time
    PriceEngine.start();
    const endTime = performance.now();
    const duration = endTime - metrics.startTime;

    // Should complete in under 100ms
    expect(duration).toBeLessThan(100);

    // All callbacks should fire
    metrics.callbacks.forEach((cb) => {
      expect(cb.mock.calls.length).toBeGreaterThan(0);
    });
  });

  it('should keep memory usage reasonable', () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;

    PriceEngine.start();
    
    // Wait for 10 seconds of updates
    vi.advanceTimersByTimeAsync(10000);

    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Should not use more than 10MB
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});
```

---

## Snapshot Testing

### Testing Complex Objects
```typescript
describe('Portfolio Snapshots', () => {
  it('should match portfolio structure', () => {
    const portfolio = tradeEngine.getPortfolio();
    
    expect(portfolio).toMatchSnapshot();
  });

  it('should match trade history format', () => {
    const history = tradeEngine.getTradeHistory();
    
    expect(history).toMatchSnapshot();
  });
});

// First run creates snapshots in __snapshots__ folder
// Subsequent runs compare against snapshots
// Update with: npm run test -- -u
```

---

## Coverage Goals

Target these coverage metrics:

```
Statements   : 90% (all code executed)
Branches     : 85% (all if/else paths)
Functions    : 90% (all functions called)
Lines        : 90% (all lines executed)
```

### View Coverage
```bash
npm run test:coverage

# Open coverage report
open coverage/index.html
```

---

## Testing Best Practices

### 1. **Test Behavior, Not Implementation**
```typescript
// ✅ Good: Tests what user sees
it('should show price in formatted currency', () => {
  const price = priceEngine.getPrice('AAPL');
  expect(formatPrice(price)).toBe('$150.25');
});

// ❌ Bad: Tests internal details
it('should use toFixed(2)', () => {
  expect(price.price.toFixed(2)).toBe('150.25');
});
```

### 2. **Use Descriptive Test Names**
```typescript
// ✅ Good
it('should reject buy order when cash is insufficient')

// ❌ Bad
it('should fail')
```

### 3. **Arrange-Act-Assert Pattern**
```typescript
it('should execute trade atomically', () => {
  // Arrange: Set up initial state
  const initialPortfolio = tradeEngine.getPortfolio();
  
  // Act: Execute trade
  const result = tradeEngine.executeTrade(mockTradeRequest);
  
  // Assert: Verify results
  expect(result.success).toBe(true);
  expect(tradeEngine.getPortfolio().cash).toBeLessThan(initialPortfolio.cash);
});
```

### 4. **Isolate Tests**
```typescript
describe('TradeEngine', () => {
  beforeEach(() => {
    // Reset state before each test
    tradeEngine.reset();
    priceEngine.reset();
    orderEngine.reset();
  });

  // Tests now don't interfere with each other
});
```

### 5. **Use Fixtures for Common Data**
```typescript
// Create fixture files
// src/__tests__/fixtures/prices.fixture.ts
export const mockPrices = { /* ... */ };

// Use in multiple tests
import { mockPrices } from '../fixtures/prices.fixture';
```

---

## Continuous Integration

### GitHub Actions Example
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

---

## Debugging Tests

### Common Issues

**Issue: Tests hanging**
```typescript
// Make sure to use vi.useFakeTimers() and vi.useRealTimers()
it('should handle timing', async () => {
  vi.useFakeTimers();
  // ... test code
  vi.useRealTimers(); // IMPORTANT: Clean up!
});
```

**Issue: Callbacks not firing**
```typescript
// Make sure to wait for async operations
it('should fire callback', async () => {
  const callback = vi.fn();
  subscribe('AAPL', callback);
  
  await vi.advanceTimersByTimeAsync(1000); // ← Don't forget await!
  expect(callback).toHaveBeenCalled();
});
```

**Issue: Memory leaks in tests**
```typescript
// Always unsubscribe in afterEach
afterEach(() => {
  unsubscribe?.();
  priceEngine.stop();
});
```

---

**Test your code thoroughly!** Quality tests catch bugs before users do. 🧪
