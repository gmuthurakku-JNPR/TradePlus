# Limit Order Engine - Complete Documentation

## Overview

The **Limit Order Engine** is a comprehensive order management system that automatically executes trades when price conditions are met. It monitors real-time prices from the PriceEngine and triggers trades via the TradeEngine when limit prices are reached.

### Key Features

✅ **Automated Execution** - Orders execute automatically when price conditions are met  
✅ **Real-Time Monitoring** - Subscribes to live price updates  
✅ **Duplicate Prevention** - Ensures each order executes at most once  
✅ **Status Tracking** - Complete order lifecycle management  
✅ **Portfolio Validation** - Pre-flight checks for cash/shares  
✅ **Persistence** - Save and restore orders across sessions  
✅ **Comprehensive Queries** - Search by ID, symbol, status  
✅ **Order Modification** - Update pending orders  
✅ **Error Handling** - Graceful failures with detailed messages  

---

## Architecture

### Order Lifecycle

```
┌─────────────┐
│   pending   │ ← Order created, monitoring price
└──────┬──────┘
       │
       ├────────────────────────────┐
       │                            │
       ▼                            ▼
┌─────────────┐             ┌─────────────┐
│  triggered  │             │  cancelled  │ ← User cancelled
└──────┬──────┘             └─────────────┘
       │
       ├────────────────┐
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│   filled    │  │   failed    │ ← Execution error
└─────────────┘  └─────────────┘
```

### Trigger Logic

**BUY Orders:**
- Execute when: `market_price <= limit_price`
- Use case: "Buy AAPL when it drops to $145 or below"

**SELL Orders:**
- Execute when: `market_price >= limit_price`
- Use case: "Sell AAPL when it rises to $160 or above"

### Integration

```
┌─────────────────┐
│  Price Engine   │ ← Real-time price simulation
└────────┬────────┘
         │ subscribe
         ▼
┌─────────────────┐
│  Order Engine   │ ← Price monitoring & trigger detection
└────────┬────────┘
         │ executeTrade
         ▼
┌─────────────────┐
│  Trade Engine   │ ← Trade execution & portfolio updates
└─────────────────┘
```

---

## Data Model

### OrderRequest

Parameters for creating a new order:

```typescript
interface OrderRequest {
  symbol: string;      // Stock symbol (uppercase, 1-10 chars)
  type: 'BUY' | 'SELL'; // Order type
  limitPrice: number;  // Trigger price ($0.01 - $1,000,000)
  quantity: number;    // Number of shares (positive integer)
}
```

### LimitOrder

Complete order record:

```typescript
type OrderStatus = 
  | 'pending'    // Monitoring price
  | 'triggered'  // Executing trade
  | 'filled'     // Successfully executed
  | 'cancelled'  // User cancelled
  | 'expired'    // Time-based expiration
  | 'failed';    // Execution failed

interface LimitOrder {
  // Core fields
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  limitPrice: number;
  quantity: number;
  status: OrderStatus;
  
  // Timestamps
  createdAt: number;
  triggeredAt?: number;
  filledAt?: number;
  cancelledAt?: number;
  
  // Execution details
  executedPrice?: number;
  executedTotal?: number;
  tradeId?: string;
  error?: string;
}
```

---

## API Reference

### Order Management

#### `placeOrder(request: OrderRequest): LimitOrder | null`

Create a new limit order with price monitoring.

**Parameters:**
- `request`: Order parameters (symbol, type, limitPrice, quantity)

**Returns:**
- `LimitOrder` object if successful
- `null` if validation fails

**Validation Rules:**
- Symbol: 1-10 uppercase characters (A-Z, 0-9, .)
- Type: 'BUY' or 'SELL'
- Quantity: Positive integer (no fractional shares)
- Limit Price: $0.01 - $1,000,000
- Portfolio: Sufficient cash (BUY) or shares (SELL)

**Example:**
```typescript
const order = OrderEngine.placeOrder({
  symbol: 'AAPL',
  type: 'BUY',
  limitPrice: 145.00,
  quantity: 10
});

if (order) {
  console.log(`Order ${order.id} created`);
}
```

---

#### `cancelOrder(orderId: string): boolean`

Cancel a pending order.

**Parameters:**
- `orderId`: Order ID to cancel

**Returns:**
- `true` if cancelled successfully
- `false` if order not found or cannot be cancelled

**Rules:**
- Only pending orders can be cancelled
- Triggered/filled/failed orders cannot be cancelled
- Unsubscribes from price updates if no more orders for that symbol

**Example:**
```typescript
const cancelled = OrderEngine.cancelOrder('ORD-123456');
if (cancelled) {
  console.log('Order cancelled');
}
```

---

#### `modifyOrder(orderId: string, updates: { limitPrice?: number; quantity?: number }): boolean`

Modify a pending order's limit price or quantity.

**Parameters:**
- `orderId`: Order ID to modify
- `updates`: Fields to update

**Returns:**
- `true` if modified successfully
- `false` if order not found or cannot be modified

**Rules:**
- Only pending orders can be modified
- Limit price: $0.01 - $1,000,000
- Quantity: Positive integer

**Example:**
```typescript
// Update limit price
OrderEngine.modifyOrder('ORD-123456', { limitPrice: 150 });

// Update quantity
OrderEngine.modifyOrder('ORD-123456', { quantity: 20 });

// Update both
OrderEngine.modifyOrder('ORD-123456', { 
  limitPrice: 148, 
  quantity: 15 
});
```

---

### Queries

#### `getActiveOrders(): readonly LimitOrder[]`

Get all active orders (pending or triggered).

**Returns:**
- Array of active orders

**Example:**
```typescript
const active = OrderEngine.getActiveOrders();
console.log(`${active.length} active orders`);
```

---

#### `getOrdersForSymbol(symbol: string): readonly LimitOrder[]`

Get all active orders for a specific symbol.

**Parameters:**
- `symbol`: Stock symbol

**Returns:**
- Array of orders for that symbol

**Example:**
```typescript
const aaplOrders = OrderEngine.getOrdersForSymbol('AAPL');
aaplOrders.forEach(order => {
  console.log(`${order.type} ${order.quantity} @ $${order.limitPrice}`);
});
```

---

#### `getOrderById(orderId: string): LimitOrder | null`

Get a specific order by ID (checks both active and history).

**Parameters:**
- `orderId`: Order ID

**Returns:**
- Order object or null if not found

**Example:**
```typescript
const order = OrderEngine.getOrderById('ORD-123456');
if (order) {
  console.log(`Status: ${order.status}`);
}
```

---

#### `getOrderHistory(limit?: number): readonly LimitOrder[]`

Get completed orders (filled, cancelled, failed).

**Parameters:**
- `limit`: Optional limit (most recent first)

**Returns:**
- Array of historical orders

**Example:**
```typescript
const recent = OrderEngine.getOrderHistory(10);
recent.forEach(order => {
  console.log(`${order.id}: ${order.status}`);
});
```

---

#### `getAllOrders(): readonly LimitOrder[]`

Get all orders (active + history).

**Returns:**
- Array of all orders

**Example:**
```typescript
const all = OrderEngine.getAllOrders();
console.log(`Total orders: ${all.length}`);
```

---

#### `getOrdersByStatus(status: OrderStatus): readonly LimitOrder[]`

Get orders with a specific status.

**Parameters:**
- `status`: Order status to filter by

**Returns:**
- Array of orders with that status

**Example:**
```typescript
const pending = OrderEngine.getOrdersByStatus('pending');
const filled = OrderEngine.getOrdersByStatus('filled');
const cancelled = OrderEngine.getOrdersByStatus('cancelled');
```

---

#### `getOrderStats(): OrderStats`

Get statistics about orders.

**Returns:**
```typescript
{
  total: number;              // Total orders (all time)
  active: number;             // Active orders
  pending: number;            // Pending orders
  triggered: number;          // Triggered orders
  filled: number;             // Filled orders
  cancelled: number;          // Cancelled orders
  failed: number;             // Failed orders
  subscribedSymbols: number;  // Symbols being monitored
}
```

**Example:**
```typescript
const stats = OrderEngine.getOrderStats();
console.log(`Active: ${stats.active}`);
console.log(`Filled: ${stats.filled}`);
console.log(`Monitoring ${stats.subscribedSymbols} symbols`);
```

---

### Persistence

#### `serializeOrders(): LimitOrder[]`

Export all orders for persistence.

**Returns:**
- Array of all orders (active + history)

**Example:**
```typescript
const orders = OrderEngine.serializeOrders();
localStorage.setItem('orders', JSON.stringify(orders));
```

---

#### `loadOrders(savedOrders: LimitOrder[]): void`

Restore orders from storage.

**Parameters:**
- `savedOrders`: Array of orders to restore

**Behavior:**
- Restores active orders with 'pending' or 'triggered' status
- Restores order history
- Re-subscribes to price updates for active symbols

**Example:**
```typescript
const saved = localStorage.getItem('orders');
if (saved) {
  const orders = JSON.parse(saved);
  OrderEngine.loadOrders(orders);
}
```

---

#### `reset(): void`

Reset engine state (for testing).

**Behavior:**
- Clears all orders
- Unsubscribes from all price updates
- Resets counters

**Example:**
```typescript
OrderEngine.reset();
```

---

## Usage Patterns

### Basic Order Placement

```typescript
import OrderEngine from '@engines/OrderEngine';
import PriceEngine from '@engines/PriceEngine';

// Start price monitoring
PriceEngine.start();

// Place BUY limit order
const buyOrder = OrderEngine.placeOrder({
  symbol: 'AAPL',
  type: 'BUY',
  limitPrice: 145.00, // Execute when AAPL <= $145
  quantity: 10
});

// Place SELL limit order
const sellOrder = OrderEngine.placeOrder({
  symbol: 'AAPL',
  type: 'SELL',
  limitPrice: 160.00, // Execute when AAPL >= $160
  quantity: 5
});

// Orders automatically execute when conditions are met
```

---

### Real-Time Status Monitoring

```typescript
// Monitor order status
const checkStatus = setInterval(() => {
  const order = OrderEngine.getOrderById(orderId);
  
  if (order?.status === 'filled') {
    console.log('Order filled!');
    console.log(`Executed at: $${order.executedPrice}`);
    console.log(`Total: $${order.executedTotal}`);
    clearInterval(checkStatus);
  }
}, 1000);
```

---

### Portfolio Integration

```typescript
import TradeEngine from '@engines/TradeEngine';

// Check portfolio before placing order
const portfolio = TradeEngine.getPortfolio();
console.log(`Cash: $${portfolio.cash.toFixed(2)}`);

// Place order
const order = OrderEngine.placeOrder({ ... });

// After execution, portfolio is automatically updated
if (order?.status === 'filled') {
  const updated = TradeEngine.getPortfolio();
  console.log(`New cash: $${updated.cash.toFixed(2)}`);
}
```

---

### Error Handling

```typescript
const order = OrderEngine.placeOrder({
  symbol: 'AAPL',
  type: 'BUY',
  limitPrice: 1000000, // Exceeds cash
  quantity: 1000
});

if (!order) {
  // Validation failed - check console for error
  console.error('Order placement failed');
  
  // Check failed orders
  const failed = OrderEngine.getOrdersByStatus('failed');
  failed.forEach(order => {
    console.log(`Error: ${order.error}`);
  });
}
```

---

### Order Management Dashboard

```typescript
import OrderEngine from '@engines/OrderEngine';

// Get comprehensive view
const stats = OrderEngine.getOrderStats();
const active = OrderEngine.getActiveOrders();
const recent = OrderEngine.getOrderHistory(10);

// Display dashboard
console.log('=== Order Dashboard ===');
console.log(`Active: ${stats.active}`);
console.log(`Filled: ${stats.filled}`);
console.log(`Cancelled: ${stats.cancelled}`);
console.log('\nActive Orders:');
active.forEach(order => {
  console.log(`  ${order.type} ${order.quantity} ${order.symbol} @ $${order.limitPrice}`);
});
```

---

## Advanced Topics

### Price Subscription Management

The Order Engine automatically manages price subscriptions:

1. **Lazy Subscribe**: Subscribes to a symbol when first order is placed
2. **Shared Subscription**: Multiple orders for same symbol share one subscription
3. **Auto-Unsubscribe**: Unsubscribes when no active orders remain for a symbol

This ensures efficient resource usage and minimal overhead.

---

### Duplicate Execution Prevention

The engine uses multiple mechanisms to prevent duplicate execution:

1. **Execution Locks**: Acquire lock before execution
2. **Status Checks**: Verify order is still 'pending' before executing
3. **Atomic Updates**: Update status to 'triggered' immediately
4. **Single Execution**: Each order can only transition to 'filled' once

---

### Trigger Timing

Orders are checked for triggers on every price update:

- **Price Update Frequency**: 1 second (configurable in PriceEngine)
- **Check Latency**: < 1ms per order
- **Execution Time**: Synchronous (immediate)

**Note**: In production, consider asynchronous execution for high-volume scenarios.

---

### Performance Characteristics

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| Place Order | O(1) | Constant time |
| Cancel Order | O(1) | Map lookup |
| Get by ID | O(1) | Map lookup + array scan |
| Get by Symbol | O(n) | Linear scan of active orders |
| Get by Status | O(n) | Linear scan of all orders |
| Price Check | O(m) | m = orders for that symbol |
| Subscribe | O(1) | Map operations |

**Scalability:**
- Efficient for up to 10,000 active orders
- Consider indexing for larger scales

---

## Testing

### Run Tests

```typescript
import OrderEngineTests from '@engines/OrderEngine/__tests__/integration.test';

// Run all tests
OrderEngineTests.runAll();

// Run specific test
OrderEngineTests.testOrderCreation();
OrderEngineTests.testBuyTrigger();
OrderEngineTests.testOrderCancellation();
```

### Test Coverage

✅ Order validation (7 test cases)  
✅ Order creation and storage  
✅ BUY trigger detection  
✅ SELL trigger detection  
✅ Order cancellation  
✅ Order modification  
✅ Insufficient funds handling  
✅ Insufficient shares handling  
✅ Order statistics  
✅ Persistence (save/load)  
✅ Duplicate execution prevention  

---

## Best Practices

### ✅ DO:

- Start PriceEngine before placing orders
- Validate portfolio constraints before order placement
- Use order IDs for tracking (not array indices)
- Save orders to storage periodically
- Monitor order status for execution confirmation
- Handle null returns from placeOrder()
- Use getOrderStats() for dashboard displays

### ❌ DON'T:

- Don't modify orders after they're triggered
- Don't assume orders execute instantly
- Don't place duplicate orders for same conditions
- Don't forget to cancel orders before app shutdown
- Don't rely on array indices (orders move between active/history)
- Don't place orders without checking portfolio first

---

## Troubleshooting

### Order Not Executing

**Possible causes:**
1. PriceEngine not started: `PriceEngine.start()`
2. Limit price not reached: Check current price vs. limit
3. Order cancelled: Check `order.status`
4. Execution failed: Check `order.error`

**Debug:**
```typescript
const order = OrderEngine.getOrderById(orderId);
console.log(`Status: ${order?.status}`);
console.log(`Error: ${order?.error}`);

const price = PriceEngine.getPrice(order?.symbol);
console.log(`Current: $${price?.price}, Limit: $${order?.limitPrice}`);
```

---

### Order Placement Fails

**Possible causes:**
1. Invalid parameters: Check validation rules
2. Insufficient funds/shares: Check portfolio
3. Symbol format: Must be uppercase

**Debug:**
```typescript
const portfolio = TradeEngine.getPortfolio();
console.log(`Cash: $${portfolio.cash}`);
console.log(`Positions:`, portfolio.positions);

const failed = OrderEngine.getOrdersByStatus('failed');
failed.forEach(order => console.log(order.error));
```

---

### Price Updates Not Triggering

**Possible causes:**
1. PriceEngine not running: `PriceEngine.start()`
2. No subscription: Check `getOrderStats().subscribedSymbols`
3. Symbol not initialized: Place order to trigger initialization

**Debug:**
```typescript
const stats = OrderEngine.getOrderStats();
console.log(`Subscribed symbols: ${stats.subscribedSymbols}`);

const price = PriceEngine.getPrice('AAPL');
if (!price) {
  console.log('Price not initialized');
}
```

---

## Examples

See [QUICK_START.ts](./QUICK_START.ts) for 10 comprehensive examples covering:

1. Place BUY limit order
2. Place SELL limit order
3. Monitor order status
4. Cancel order
5. Modify order
6. Query by symbol
7. Query by status
8. Persistence (save/load)
9. Real-time monitoring
10. Error handling

---

## Integration with Trade Engine

The Order Engine seamlessly integrates with the Trade Engine:

```typescript
// Order Engine handles the "when"
const order = OrderEngine.placeOrder({
  symbol: 'AAPL',
  type: 'BUY',
  limitPrice: 145,
  quantity: 10
});

// Trade Engine handles the "how"
// (automatically called when order triggers)
// TradeEngine.executeTrade({
//   symbol: 'AAPL',
//   type: 'BUY',
//   quantity: 10,
//   price: 145.00,
//   orderType: 'MARKET'
// });

// Portfolio automatically updated
const portfolio = TradeEngine.getPortfolio();
```

---

## Future Enhancements

Potential improvements:

- **Time-based Expiration**: Orders expire after N days
- **Good-Till-Cancelled (GTC)**: Orders persist indefinitely
- **Stop-Loss Orders**: Trigger when price crosses threshold (opposite direction)
- **Trailing Stop**: Dynamic stop price based on price movements
- **Bracket Orders**: Combined entry/exit orders
- **Partial Fills**: Execute fractional quantities
- **Order Priority**: FIFO queue for same-price orders
- **Advanced Conditions**: Multiple triggers (AND/OR logic)
- **Market Hours**: Only execute during trading hours
- **Volume Conditions**: Trigger based on volume thresholds

---

## License

MIT

---

## Support

For questions or issues:
1. Check [QUICK_START.ts](./QUICK_START.ts) for examples
2. Run tests: `OrderEngineTests.runAll()`
3. Check console logs for detailed error messages
4. Verify PriceEngine and TradeEngine are properly initialized

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Author**: TradePulse Engineering Team
