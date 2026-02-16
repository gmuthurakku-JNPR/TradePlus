/**
 * ============================================================================
 * Limit Order Engine - Quick Start Guide
 * ============================================================================
 * 
 * This guide demonstrates how to use the Limit Order Engine for automated
 * trading based on price conditions.
 * 
 * The Limit Order Engine monitors real-time prices and automatically executes
 * trades when specified price conditions are met.
 * 
 * ============================================================================
 */

import OrderEngine from '@engines/OrderEngine';
import PriceEngine from '@engines/PriceEngine';
import TradeEngine from '@engines/TradeEngine';
import type { OrderRequest } from '@types';

/**
 * ============================================================================
 * EXAMPLE 1: Place a BUY Limit Order
 * ============================================================================
 * 
 * BUY orders execute when the market price drops to or below the limit price.
 * Use this when you want to buy a stock at a specific price or lower.
 */
export const example1_PlaceBuyLimitOrder = () => {
  console.log('\n=== Example 1: Place BUY Limit Order ===');

  // Start price engine for real-time monitoring
  PriceEngine.start();

  const request: OrderRequest = {
    symbol: 'AAPL',
    type: 'BUY',
    limitPrice: 145.00, // Will execute when AAPL <= $145
    quantity: 10,
  };

  const order = OrderEngine.placeOrder(request);

  if (order) {
    console.log(`✓ Order placed: ${order.id}`);
    console.log(`  Symbol: ${order.symbol}`);
    console.log(`  Type: ${order.type}`);
    console.log(`  Limit: $${order.limitPrice}`);
    console.log(`  Quantity: ${order.quantity}`);
    console.log(`  Status: ${order.status}`);
    console.log('\nThe order will automatically execute when AAPL price drops to $145 or below.');
  } else {
    console.error('✗ Order placement failed (check validation errors)');
  }

  // The order is now being monitored. When price <= $145, it will auto-execute.
};

/**
 * ============================================================================
 * EXAMPLE 2: Place a SELL Limit Order
 * ============================================================================
 * 
 * SELL orders execute when the market price rises to or above the limit price.
 * Use this when you want to sell a stock at a specific price or higher.
 */
export const example2_PlaceSellLimitOrder = () => {
  console.log('\n=== Example 2: Place SELL Limit Order ===');

  // First, ensure we have shares to sell
  const buyResult = TradeEngine.executeTrade({
    symbol: 'AAPL',
    type: 'BUY',
    quantity: 20,
    price: 150.00,
    orderType: 'MARKET',
  });

  if (!buyResult.success) {
    console.error('Failed to buy shares');
    return;
  }

  console.log('✓ Bought 20 shares of AAPL at $150');

  // Now place a SELL limit order
  const request: OrderRequest = {
    symbol: 'AAPL',
    type: 'SELL',
    limitPrice: 160.00, // Will execute when AAPL >= $160
    quantity: 10,
  };

  const order = OrderEngine.placeOrder(request);

  if (order) {
    console.log(`✓ SELL order placed: ${order.id}`);
    console.log(`  Will execute when AAPL rises to $160 or above`);
    console.log(`  Current status: ${order.status}`);
  }

  // The order will auto-execute when AAPL >= $160
};

/**
 * ============================================================================
 * EXAMPLE 3: Monitor Order Status
 * ============================================================================
 * 
 * Check the status of your orders and view execution details.
 */
export const example3_MonitorOrderStatus = () => {
  console.log('\n=== Example 3: Monitor Order Status ===');

  // Get all active orders
  const activeOrders = OrderEngine.getActiveOrders();
  console.log(`\nActive Orders: ${activeOrders.length}`);
  
  activeOrders.forEach((order) => {
    console.log(`\n  Order ${order.id}`);
    console.log(`    Symbol: ${order.symbol}`);
    console.log(`    Type: ${order.type}`);
    console.log(`    Limit: $${order.limitPrice}`);
    console.log(`    Quantity: ${order.quantity}`);
    console.log(`    Status: ${order.status}`);
    console.log(`    Created: ${new Date(order.createdAt).toLocaleString()}`);
  });

  // Get order history (filled, cancelled, failed)
  const history = OrderEngine.getOrderHistory(10); // Last 10
  console.log(`\n\nRecent Order History: ${history.length}`);
  
  history.forEach((order) => {
    console.log(`\n  Order ${order.id}`);
    console.log(`    Symbol: ${order.symbol}`);
    console.log(`    Type: ${order.type}`);
    console.log(`    Status: ${order.status}`);
    
    if (order.status === 'filled') {
      console.log(`    Executed at: $${order.executedPrice?.toFixed(2)}`);
      console.log(`    Total: $${order.executedTotal?.toFixed(2)}`);
      console.log(`    Trade ID: ${order.tradeId}`);
    } else if (order.status === 'cancelled') {
      console.log(`    Cancelled at: ${new Date(order.cancelledAt!).toLocaleString()}`);
    } else if (order.status === 'failed') {
      console.log(`    Error: ${order.error}`);
    }
  });

  // Get statistics
  const stats = OrderEngine.getOrderStats();
  console.log('\n\nOrder Statistics:');
  console.log(`  Total orders: ${stats.total}`);
  console.log(`  Active: ${stats.active}`);
  console.log(`  Pending: ${stats.pending}`);
  console.log(`  Filled: ${stats.filled}`);
  console.log(`  Cancelled: ${stats.cancelled}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Monitoring ${stats.subscribedSymbols} symbols`);
};

/**
 * ============================================================================
 * EXAMPLE 4: Cancel an Order
 * ============================================================================
 * 
 * Cancel a pending order before it executes.
 * Note: You can only cancel orders with 'pending' status.
 */
export const example4_CancelOrder = () => {
  console.log('\n=== Example 4: Cancel Order ===');

  // Place an order
  const order = OrderEngine.placeOrder({
    symbol: 'TSLA',
    type: 'BUY',
    limitPrice: 200,
    quantity: 5,
  });

  if (!order) {
    console.error('Failed to place order');
    return;
  }

  console.log(`✓ Order placed: ${order.id}`);
  console.log(`  Status: ${order.status}`);

  // Check active orders
  let activeCount = OrderEngine.getActiveOrders().length;
  console.log(`\nActive orders before cancellation: ${activeCount}`);

  // Cancel the order
  const cancelled = OrderEngine.cancelOrder(order.id);

  if (cancelled) {
    console.log(`✓ Order ${order.id} cancelled successfully`);

    // Verify cancellation
    const updatedOrder = OrderEngine.getOrderById(order.id);
    console.log(`  Updated status: ${updatedOrder?.status}`);
    console.log(`  Cancelled at: ${new Date(updatedOrder?.cancelledAt!).toLocaleString()}`);

    activeCount = OrderEngine.getActiveOrders().length;
    console.log(`\nActive orders after cancellation: ${activeCount}`);
  } else {
    console.error('✗ Cancellation failed');
  }
};

/**
 * ============================================================================
 * EXAMPLE 5: Modify an Order
 * ============================================================================
 * 
 * Update the limit price or quantity of a pending order.
 */
export const example5_ModifyOrder = () => {
  console.log('\n=== Example 5: Modify Order ===');

  // Place an order
  const order = OrderEngine.placeOrder({
    symbol: 'MSFT',
    type: 'BUY',
    limitPrice: 300,
    quantity: 10,
  });

  if (!order) {
    console.error('Failed to place order');
    return;
  }

  console.log('✓ Original order:');
  console.log(`  Limit: $${order.limitPrice}`);
  console.log(`  Quantity: ${order.quantity}`);

  // Modify limit price
  const modified1 = OrderEngine.modifyOrder(order.id, {
    limitPrice: 310,
  });

  if (modified1) {
    const updated = OrderEngine.getOrderById(order.id);
    console.log('\n✓ Updated limit price:');
    console.log(`  New limit: $${updated?.limitPrice}`);
  }

  // Modify quantity
  const modified2 = OrderEngine.modifyOrder(order.id, {
    quantity: 15,
  });

  if (modified2) {
    const updated = OrderEngine.getOrderById(order.id);
    console.log('\n✓ Updated quantity:');
    console.log(`  New quantity: ${updated?.quantity}`);
  }

  // Modify both
  const modified3 = OrderEngine.modifyOrder(order.id, {
    limitPrice: 305,
    quantity: 20,
  });

  if (modified3) {
    const updated = OrderEngine.getOrderById(order.id);
    console.log('\n✓ Final order:');
    console.log(`  Limit: $${updated?.limitPrice}`);
    console.log(`  Quantity: ${updated?.quantity}`);
  }
};

/**
 * ============================================================================
 * EXAMPLE 6: Query Orders by Symbol
 * ============================================================================
 * 
 * Find all orders for a specific symbol.
 */
export const example6_QueryOrdersBySymbol = () => {
  console.log('\n=== Example 6: Query Orders by Symbol ===');

  // Place multiple orders
  OrderEngine.placeOrder({
    symbol: 'AAPL',
    type: 'BUY',
    limitPrice: 145,
    quantity: 10,
  });

  OrderEngine.placeOrder({
    symbol: 'AAPL',
    type: 'SELL',
    limitPrice: 155,
    quantity: 5,
  });

  OrderEngine.placeOrder({
    symbol: 'GOOGL',
    type: 'BUY',
    limitPrice: 2800,
    quantity: 2,
  });

  // Query AAPL orders
  const aaplOrders = OrderEngine.getOrdersForSymbol('AAPL');
  console.log(`\nAAPL Orders: ${aaplOrders.length}`);
  
  aaplOrders.forEach((order) => {
    console.log(`  ${order.type} ${order.quantity} @ $${order.limitPrice}`);
  });

  // Query GOOGL orders
  const googlOrders = OrderEngine.getOrdersForSymbol('GOOGL');
  console.log(`\nGOOGL Orders: ${googlOrders.length}`);
  
  googlOrders.forEach((order) => {
    console.log(`  ${order.type} ${order.quantity} @ $${order.limitPrice}`);
  });
};

/**
 * ============================================================================
 * EXAMPLE 7: Query Orders by Status
 * ============================================================================
 * 
 * Find all orders with a specific status.
 */
export const example7_QueryOrdersByStatus = () => {
  console.log('\n=== Example 7: Query Orders by Status ===');

  // Get pending orders
  const pending = OrderEngine.getOrdersByStatus('pending');
  console.log(`\nPending Orders: ${pending.length}`);
  pending.forEach((order) => {
    console.log(`  ${order.id} - ${order.type} ${order.symbol} @ $${order.limitPrice}`);
  });

  // Get filled orders
  const filled = OrderEngine.getOrdersByStatus('filled');
  console.log(`\nFilled Orders: ${filled.length}`);
  filled.forEach((order) => {
    console.log(
      `  ${order.id} - ${order.type} ${order.symbol} @ $${order.executedPrice?.toFixed(2)}`
    );
  });

  // Get cancelled orders
  const cancelled = OrderEngine.getOrdersByStatus('cancelled');
  console.log(`\nCancelled Orders: ${cancelled.length}`);
  cancelled.forEach((order) => {
    console.log(`  ${order.id} - ${order.type} ${order.symbol}`);
  });

  // Get failed orders
  const failed = OrderEngine.getOrdersByStatus('failed');
  console.log(`\nFailed Orders: ${failed.length}`);
  failed.forEach((order) => {
    console.log(`  ${order.id} - ${order.error}`);
  });
};

/**
 * ============================================================================
 * EXAMPLE 8: Persistence (Save/Load Orders)
 * ============================================================================
 * 
 * Save orders to storage and restore them later.
 */
export const example8_Persistence = () => {
  console.log('\n=== Example 8: Persistence ===');

  // Place some orders
  OrderEngine.placeOrder({
    symbol: 'AAPL',
    type: 'BUY',
    limitPrice: 145,
    quantity: 10,
  });

  OrderEngine.placeOrder({
    symbol: 'GOOGL',
    type: 'BUY',
    limitPrice: 2800,
    quantity: 5,
  });

  // Serialize orders
  const serialized = OrderEngine.serializeOrders();
  console.log(`\n✓ Serialized ${serialized.length} orders`);

  // Save to localStorage (or any storage)
  localStorage.setItem('orders', JSON.stringify(serialized));
  console.log('✓ Saved to localStorage');

  // Simulate app restart
  console.log('\n--- App Restart ---\n');
  OrderEngine.reset();

  const stats1 = OrderEngine.getOrderStats();
  console.log(`Orders after reset: ${stats1.total}`);

  // Load from localStorage
  const saved = localStorage.getItem('orders');
  if (saved) {
    const orders = JSON.parse(saved);
    OrderEngine.loadOrders(orders);
    console.log(`✓ Loaded ${orders.length} orders from storage`);

    const stats2 = OrderEngine.getOrderStats();
    console.log(`Orders after load: ${stats2.total}`);
    console.log(`  Active: ${stats2.active}`);
    console.log(`  Monitoring ${stats2.subscribedSymbols} symbols`);
  }
};

/**
 * ============================================================================
 * EXAMPLE 9: Real-Time Monitoring with Callbacks
 * ============================================================================
 * 
 * Monitor order execution in real-time.
 */
export const example9_RealTimeMonitoring = async () => {
  console.log('\n=== Example 9: Real-Time Monitoring ===');

  // Start price engine
  PriceEngine.start();

  // Place order
  const order = OrderEngine.placeOrder({
    symbol: 'AAPL',
    type: 'BUY',
    limitPrice: 200, // High limit, should trigger quickly
    quantity: 5,
  });

  if (!order) {
    console.error('Failed to place order');
    return;
  }

  console.log(`✓ Order placed: ${order.id}`);
  console.log('  Monitoring for execution...\n');

  // Poll for status updates
  const checkStatus = () => {
    const updated = OrderEngine.getOrderById(order.id);
    if (!updated) return;

    console.log(`  Status: ${updated.status}`);

    if (updated.status === 'filled') {
      console.log(`\n✓ Order filled!`);
      console.log(`  Executed at: $${updated.executedPrice?.toFixed(2)}`);
      console.log(`  Total: $${updated.executedTotal?.toFixed(2)}`);
      console.log(`  Trade ID: ${updated.tradeId}`);
      
      // Check portfolio
      const portfolio = TradeEngine.getPortfolio();
      const position = portfolio.positions['AAPL'];
      console.log(`\n  Portfolio updated:`);
      console.log(`    Cash: $${portfolio.cash.toFixed(2)}`);
      console.log(`    AAPL shares: ${position?.shares || 0}`);
      
      PriceEngine.stop();
      clearInterval(interval);
    }
  };

  // Check every second
  const interval = setInterval(checkStatus, 1000);

  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(interval);
    PriceEngine.stop();
    console.log('\n⏱ Monitoring timeout');
  }, 10000);
};

/**
 * ============================================================================
 * EXAMPLE 10: Error Handling
 * ============================================================================
 * 
 * Handle validation errors and execution failures.
 */
export const example10_ErrorHandling = () => {
  console.log('\n=== Example 10: Error Handling ===');

  // Invalid symbol
  let order = OrderEngine.placeOrder({
    symbol: 'invalid',
    type: 'BUY',
    limitPrice: 100,
    quantity: 10,
  });
  console.log(order === null ? '✓ Caught invalid symbol' : '✗ Should fail');

  // Invalid quantity
  order = OrderEngine.placeOrder({
    symbol: 'AAPL',
    type: 'BUY',
    limitPrice: 100,
    quantity: -5,
  });
  console.log(order === null ? '✓ Caught negative quantity' : '✗ Should fail');

  // Insufficient funds
  order = OrderEngine.placeOrder({
    symbol: 'AAPL',
    type: 'BUY',
    limitPrice: 1000000,
    quantity: 1000,
  });
  console.log(order === null ? '✓ Caught insufficient funds' : '✗ Should fail');

  // Insufficient shares
  order = OrderEngine.placeOrder({
    symbol: 'AAPL',
    type: 'SELL',
    limitPrice: 100,
    quantity: 1000,
  });
  console.log(order === null ? '✓ Caught insufficient shares' : '✗ Should fail');

  // Check failed orders in history
  const failed = OrderEngine.getOrdersByStatus('failed');
  console.log(`\n✓ ${failed.length} failed orders in history`);
  failed.forEach((order) => {
    console.log(`  ${order.id}: ${order.error}`);
  });
};

/**
 * ============================================================================
 * Run All Examples
 * ============================================================================
 */
export const runAllExamples = async () => {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   Limit Order Engine - Quick Start Examples          ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  OrderEngine.reset();
  TradeEngine.reset();

  example1_PlaceBuyLimitOrder();
  example2_PlaceSellLimitOrder();
  example3_MonitorOrderStatus();
  example4_CancelOrder();
  example5_ModifyOrder();
  example6_QueryOrdersBySymbol();
  example7_QueryOrdersByStatus();
  example8_Persistence();
  await example9_RealTimeMonitoring();
  example10_ErrorHandling();

  console.log('\n✅ All examples completed!');
};

export default {
  example1_PlaceBuyLimitOrder,
  example2_PlaceSellLimitOrder,
  example3_MonitorOrderStatus,
  example4_CancelOrder,
  example5_ModifyOrder,
  example6_QueryOrdersBySymbol,
  example7_QueryOrdersByStatus,
  example8_Persistence,
  example9_RealTimeMonitoring,
  example10_ErrorHandling,
  runAllExamples,
};
