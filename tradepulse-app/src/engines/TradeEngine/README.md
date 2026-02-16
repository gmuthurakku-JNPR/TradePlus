# Trade Execution Engine

**Precision** | **Atomic** | **Validated** | **Financial Accuracy**

## Overview

The Trade Execution Engine is a synchronous, functional trading system with **cents-based precision arithmetic** to eliminate floating-point errors in financial calculations. All portfolio updates are **atomic** (all-or-nothing), ensuring data consistency.

## Architecture

```
User Input (TradeRequest)
    ↓
[Validation Layer] → validates symbol, quantity, price, cash, holdings
    ↓
[Financial Math Layer] → cents-based precision calculations
    ↓
[Execution Layer] → buy/sell logic with atomic portfolio updates
    ↓
[Portfolio Manager] → metrics calculation (P&L, returns)
    ↓
[Trade History] → recording and querying
    ↓
TradeResult (success/error)
```

## Financial Precision

### The Problem

JavaScript floating-point arithmetic is **imprecise**:

```javascript
0.1 + 0.2 = 0.30000000000000004  // ❌ Not 0.3!
100.50 * 3 = 301.50000000000006  // ❌ Not 301.50!
```

### The Solution

**Cents-based integer arithmetic**:

```javascript
// Convert to cents (integers)
10 + 20 = 30         // ✅ Exact
10050 * 3 = 30150    // ✅ Exact

// Convert back to dollars
30150 cents = $301.50
```

### Conversion Functions

```typescript
dollarsToCents(dollars: number): number
// Example: dollarsToCents(100.50) = 10050

centsToDollars(cents: number): number
// Example: centsToDollars(10050) = 100.50
```

## Core Formulas

### 1. Trade Total

```
totalCents = priceCents × quantity
```

**Example:**
```
Price: $150.33
Quantity: 10 shares

Step 1: Convert to cents
  priceCents = 15,033 cents

Step 2: Calculate total
  totalCents = 15,033 × 10 = 150,330 cents

Step 3: Convert to dollars
  total = $1,503.30 (exact)
```

### 2. Average Cost (Weighted Average)

```
newAvgCost = (oldCost × oldShares + newCost × newShares) / totalShares
```

**Example:**
```
Existing: 10 shares @ $100/share
Purchase: 15 shares @ $150/share

Step 1: Calculate totals in cents
  oldTotal = 10,000 × 10 = 100,000 cents
  newTotal = 15,000 × 15 = 225,000 cents

Step 2: Sum and divide
  combined = 100,000 + 225,000 = 325,000 cents
  totalShares = 10 + 15 = 25
  avgCostCents = 325,000 / 25 = 13,000 cents

Step 3: Convert to dollars
  avgCost = $130.00
```

### 3. Realized Profit/Loss

```
realizedPL = (sellPrice - avgCost) × quantity
```

**Example: Profit**
```
Bought: 10 shares @ $150/share
Sold: 10 shares @ $180/share

Step 1: Convert to cents
  sellPriceCents = 18,000 cents
  avgCostCents = 15,000 cents

Step 2: Calculate P&L
  plCents = (18,000 - 15,000) × 10 = 30,000 cents

Step 3: Convert to dollars
  realizedPL = $300.00 (profit)
```

**Example: Loss**
```
Bought: 10 shares @ $150/share
Sold: 10 shares @ $100/share

realizedPL = (100 - 150) × 10 = -$500.00 (loss)
```

### 4. Portfolio Metrics

```
totalValue = cash + sum(shares × currentPrice)
unrealizedPL = sum((currentPrice - avgCost) × shares)
totalPL = realizedPL + unrealizedPL
totalReturn% = (totalPL / initialCash) × 100
```

**Example:**
```
Portfolio:
  Cash: $5,000
  AAPL: 10 shares @ $150 avgCost (current price: $180)
  GOOGL: 5 shares @ $140 avgCost (current price: $130)
  Realized P&L: $200

Calculations:
  AAPL value = 10 × $180 = $1,800
  GOOGL value = 5 × $130 = $650
  totalValue = $5,000 + $1,800 + $650 = $7,450

  AAPL unrealized = (180 - 150) × 10 = $300
  GOOGL unrealized = (130 - 140) × 5 = -$50
  unrealizedPL = $300 + (-$50) = $250

  totalPL = $200 (realized) + $250 (unrealized) = $450
  totalReturn = ($450 / $10,000) × 100 = 4.5%
```

## Validation Rules

### Symbol
- **Length**: 1-10 characters
- **Format**: Uppercase alphanumeric (A-Z, 0-9, dot)
- **Examples**: `AAPL`, `GOOGL`, `BRK.B`

### Quantity
- **Type**: Positive integer (no fractional shares)
- **Range**: 1 to 9,007,199,254,740,991 (MAX_SAFE_INTEGER)
- **Examples**: `10`, `100`, `1000`

### Price
- **Type**: Positive number
- **Range**: $0.01 to $1,000,000
- **Precision**: Rounded to nearest cent
- **Examples**: `150.33`, `0.50`, `999999.99`

### Trade Type
- **Values**: `BUY` or `SELL`

### Order Type
- **Values**: `MARKET` or `LIMIT`

### Financial Constraints

**BUY:**
```
cash >= (price × quantity)
```

**SELL:**
```
position.shares >= quantity
```

## Usage

### Basic Trade Execution

```typescript
import TradeEngine from '@engines/TradeEngine';

// Buy 10 shares of AAPL at $150
const buyResult = TradeEngine.executeTrade({
  symbol: 'AAPL',
  type: 'BUY',
  quantity: 10,
  price: 150,
  orderType: 'MARKET',
});

if (buyResult.success) {
  console.log('Trade executed:', buyResult.trade);
} else {
  console.error('Trade failed:', buyResult.error);
}
```

### Get Portfolio

```typescript
const portfolio = TradeEngine.getPortfolio();
console.log('Cash:', portfolio.cash);
console.log('Positions:', portfolio.positions);
console.log('Realized P&L:', portfolio.realizedPL);
```

### Get Portfolio Metrics

```typescript
const currentPrices = {
  AAPL: 180,
  GOOGL: 140,
};

const metrics = TradeEngine.getPortfolioMetrics(currentPrices);
console.log('Total Value:', metrics.totalValue);
console.log('Total P&L:', metrics.totalPL);
console.log('Return %:', metrics.totalReturnPercent);
```

### Get Trade History

```typescript
const history = TradeEngine.getTradeHistory();
console.log('Total trades:', history.length);

// Most recent trade
const lastTrade = history[history.length - 1];
console.log('Last trade:', lastTrade);
```

## Trade Flow

### BUY Trade

```
1. Validate request
   ├─ Check symbol format
   ├─ Check quantity (positive integer)
   ├─ Check price (>= $0.01)
   └─ Check sufficient cash

2. Execute buy
   ├─ Convert to cents
   ├─ Calculate total cost
   ├─ Deduct cash
   ├─ Get existing position (if any)
   ├─ Calculate new average cost
   └─ Update or create position

3. Record trade
   ├─ Generate trade ID
   ├─ Create trade record
   └─ Add to history

4. Return result
   └─ { success: true, trade: {...} }
```

### SELL Trade

```
1. Validate request
   ├─ Check symbol format
   ├─ Check quantity (positive integer)
   ├─ Check price (>= $0.01)
   └─ Check sufficient holdings

2. Execute sell
   ├─ Convert to cents
   ├─ Calculate total proceeds
   ├─ Add cash
   ├─ Get position (must exist)
   ├─ Calculate realized P&L
   ├─ Update portfolio realized P&L
   └─ Decrease or remove position

3. Record trade
   ├─ Generate trade ID
   ├─ Create trade record
   └─ Add to history

4. Return result
   └─ { success: true, trade: {...} }
```

## Edge Cases

### 1. First Purchase (No Existing Position)

```typescript
// Portfolio: no AAPL position
const result = TradeEngine.executeTrade({
  symbol: 'AAPL',
  type: 'BUY',
  quantity: 10,
  price: 150,
});

// Result: New position created
// { symbol: 'AAPL', shares: 10, avgCost: 150 }
```

### 2. Add to Existing Position

```typescript
// Portfolio: 10 AAPL @ $100 avgCost
const result = TradeEngine.executeTrade({
  symbol: 'AAPL',
  type: 'BUY',
  quantity: 15,
  price: 150,
});

// Result: Position updated with weighted average
// { symbol: 'AAPL', shares: 25, avgCost: 130 }
// Calculation: (100×10 + 150×15) / 25 = 130
```

### 3. Sell Partial Position

```typescript
// Portfolio: 20 AAPL @ $150 avgCost
const result = TradeEngine.executeTrade({
  symbol: 'AAPL',
  type: 'SELL',
  quantity: 10,
  price: 180,
});

// Result: Position decreased, avgCost unchanged
// { symbol: 'AAPL', shares: 10, avgCost: 150 }
// Realized P&L: (180 - 150) × 10 = $300
```

### 4. Sell Entire Position

```typescript
// Portfolio: 10 AAPL @ $150 avgCost
const result = TradeEngine.executeTrade({
  symbol: 'AAPL',
  type: 'SELL',
  quantity: 10,
  price: 180,
});

// Result: Position removed
// portfolio.positions['AAPL'] = undefined
// Realized P&L: $300
```

### 5. Insufficient Cash

```typescript
// Portfolio: $1,000 cash
const result = TradeEngine.executeTrade({
  symbol: 'AAPL',
  type: 'BUY',
  quantity: 10,
  price: 150, // $1,500 > $1,000
});

// Result: { success: false, error: 'Insufficient cash...' }
// Portfolio unchanged
```

### 6. Insufficient Holdings

```typescript
// Portfolio: 5 AAPL shares
const result = TradeEngine.executeTrade({
  symbol: 'AAPL',
  type: 'SELL',
  quantity: 10, // 10 > 5
  price: 150,
});

// Result: { success: false, error: 'Insufficient shares...' }
// Portfolio unchanged
```

### 7. Sell for Loss

```typescript
// Portfolio: 10 AAPL @ $150 avgCost
const result = TradeEngine.executeTrade({
  symbol: 'AAPL',
  type: 'SELL',
  quantity: 10,
  price: 100,
});

// Result: Position removed
// Realized P&L: (100 - 150) × 10 = -$500 (loss)
// Cash increases by $1,000, but portfolio.realizedPL decreases by $500
```

## Thread Safety

### Race Condition Prevention

```typescript
// Module-level flag prevents concurrent execution
let isExecuting = false;

const executeTrade = (request) => {
  if (isExecuting) {
    return { success: false, error: 'Trade in progress' };
  }
  
  try {
    isExecuting = true;
    // ... execute trade
  } finally {
    isExecuting = false; // Always clear flag
  }
};
```

### Throttle

```typescript
// Minimum 1000ms between trades
const THROTTLE_MS = 1000;
let lastTradeTime = 0;

const isThrottled = () => {
  return Date.now() - lastTradeTime < THROTTLE_MS;
};
```

## Testing

### Run All Tests

```typescript
import TradeEngineTests from '@engines/TradeEngine/__tests__/integration.test';

// Run comprehensive integration tests
const allPassed = await TradeEngineTests.runAll();
```

### Test Categories

1. **Buy Trades** (3 tests)
   - First purchase
   - Add to existing position
   - Multiple positions

2. **Sell Trades** (3 tests)
   - Partial position
   - Entire position
   - Sell for loss

3. **Validation** (5 tests)
   - Insufficient cash
   - Insufficient holdings
   - Invalid symbol
   - Invalid quantity
   - Invalid price

4. **Calculations** (3 tests)
   - Portfolio metrics
   - Precision (cents-based)
   - Trade history

5. **Edge Cases** (1 test)
   - Load and reset

**Total: 15 comprehensive integration tests**

## File Structure

```
TradeEngine/
├── index.ts                     # Main engine (integration)
├── validators/
│   ├── financialMath.ts         # Cents-based precision arithmetic
│   └── tradeValidation.ts       # Business rules validation
├── commands/
│   ├── executeBuy.ts            # Buy trade execution
│   └── executeSell.ts           # Sell trade execution
├── utils/
│   ├── portfolioManager.ts      # Portfolio metrics calculation
│   └── tradeHistory.ts          # Trade recording and querying
└── __tests__/
    └── integration.test.ts      # Comprehensive integration tests
```

## Performance

- **Trade Execution**: ~1ms (synchronous)
- **Validation**: ~0.1ms (fail-fast)
- **Metrics Calculation**: ~1ms per 10 positions
- **Throttle**: 1000ms minimum between trades

## Atomic Updates

All portfolio updates are **atomic** (all-or-nothing):

```typescript
// Example: Buy trade
try {
  // Step 1: Validate (if fails, return early)
  const validation = validate(request, portfolio);
  if (!validation.isValid) return { success: false };
  
  // Step 2: Execute (if fails, throw error)
  const result = executeBuy(portfolio, request);
  
  // Step 3: Update state (all or nothing)
  portfolio = result.portfolio;        // ✅ Atomic
  tradeHistory = [...history, trade];  // ✅ Atomic
  
  return { success: true };
} catch (error) {
  // Portfolio unchanged if ANY step fails
  return { success: false };
}
```

## Error Handling

### Validation Errors

```typescript
{
  success: false,
  error: 'Insufficient cash. Need $1,500.00, have $1,000.00 (short $500.00)'
}
```

### Execution Errors

```typescript
{
  success: false,
  trade: { ...trade, status: 'failed' },
  error: 'Execution failed: overflow detected'
}
```

### Graceful Degradation

- Invalid prices → use avgCost (no unrealized P&L)
- Missing position → throw error (should be validated)
- Overflow → throw error (safety check)

## Best Practices

### 1. Always Check Result

```typescript
const result = TradeEngine.executeTrade(request);

if (result.success) {
  // Trade succeeded
  console.log('Success:', result.trade);
} else {
  // Trade failed
  console.error('Error:', result.error);
}
```

### 2. Use Current Prices for Metrics

```typescript
// Fetch current prices from PriceEngine
const currentPrices = {
  AAPL: priceEngine.getPrice('AAPL'),
  GOOGL: priceEngine.getPrice('GOOGL'),
};

const metrics = TradeEngine.getPortfolioMetrics(currentPrices);
```

### 3. Validate Before Submitting

```typescript
// Check sufficient cash before submitting buy
const portfolio = TradeEngine.getPortfolio();
const cost = request.price * request.quantity;

if (portfolio.cash < cost) {
  alert('Insufficient cash');
  return;
}

TradeEngine.executeTrade(request);
```

### 4. Handle Throttle

```typescript
if (TradeEngine.isThrottled()) {
  const remaining = TradeEngine.getThrottleRemaining();
  alert(`Wait ${Math.ceil(remaining / 1000)} seconds`);
  return;
}

TradeEngine.executeTrade(request);
```

## Mathematical Guarantees

1. **Precision**: All calculations exact up to cent precision
2. **Consistency**: Total cash + positions = initial cash + realized P&L + unrealized P&L
3. **Invariants**: 
   - `shares >= 0` (always)
   - `avgCost > 0` (always)
   - `cash >= 0` (enforced by validation)

## License

Part of TradePulse trading terminal.
