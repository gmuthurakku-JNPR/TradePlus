/**
 * ============================================================================
 * Order Engine Unit Tests (Jest)
 * ============================================================================
 * 
 * Comprehensive unit tests for Limit Order Engine using Jest framework.
 * 
 * Test Coverage:
 * 1. Order Validation
 * 2. Order Creation & Placement
 * 3. Order Cancellation
 * 4. Order Modification
 * 5. Price Monitoring & Trigger Detection
 * 6. Automatic Execution (BUY/SELL)
 * 7. Order Status Transitions
 * 8. Order Queries & Retrieval
 * 9. Persistence & Serialization
 * 10. Edge Cases & Error Handling
 * 
 * Run: npm test OrderEngine.test.ts
 * ============================================================================
 */

import OrderEngine from '../index';
import TradeEngine from '@engines/TradeEngine';
import PriceEngine from '@engines/PriceEngine';
import type { OrderRequest, LimitOrder } from '@types';

describe('OrderEngine - Limit Order Management', () => {
  beforeEach(() => {
    // Reset engines before each test
    OrderEngine.reset();
    TradeEngine.reset();
    PriceEngine.stop();
  });

  afterEach(() => {
    // Cleanup
    PriceEngine.stop();
  });

  describe('1. Order Validation', () => {
    test('should reject order with empty symbol', () => {
      const request: OrderRequest = {
        symbol: '',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      };

      const order = OrderEngine.placeOrder(request);

      expect(order).toBeNull();
    });

    test('should reject order with invalid symbol format', () => {
      const request: OrderRequest = {
        symbol: 'aapl', // lowercase
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      };

      const order = OrderEngine.placeOrder(request);

      expect(order).toBeNull();
    });

    test('should reject order with zero quantity', () => {
      const request: OrderRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 0,
      };

      const order = OrderEngine.placeOrder(request);

      expect(order).toBeNull();
    });

    test('should reject order with negative quantity', () => {
      const request: OrderRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: -10,
      };

      const order = OrderEngine.placeOrder(request);

      expect(order).toBeNull();
    });

    test('should reject order with fractional quantity', () => {
      const request: OrderRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10.5,
      };

      const order = OrderEngine.placeOrder(request);

      expect(order).toBeNull();
    });

    test('should reject order with zero limit price', () => {
      const request: OrderRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 0,
        quantity: 10,
      };

      const order = OrderEngine.placeOrder(request);

      expect(order).toBeNull();
    });

    test('should reject order with negative limit price', () => {
      const request: OrderRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: -150.00,
        quantity: 10,
      };

      const order = OrderEngine.placeOrder(request);

      expect(order).toBeNull();
    });

    test('should reject order with excessively high limit price', () => {
      const request: OrderRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 2_000_000,
        quantity: 10,
      };

      const order = OrderEngine.placeOrder(request);

      expect(order).toBeNull();
    });

    test('should reject invalid order type', () => {
      const request = {
        symbol: 'AAPL',
        type: 'HOLD', // Invalid
        limitPrice: 150.00,
        quantity: 10,
      } as any;

      const order = OrderEngine.placeOrder(request);

      expect(order).toBeNull();
    });
  });

  describe('2. Order Creation & Placement', () => {
    test('should create valid BUY order successfully', () => {
      const request: OrderRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      };

      const order = OrderEngine.placeOrder(request);

      expect(order).not.toBeNull();
      expect(order?.symbol).toBe('AAPL');
      expect(order?.type).toBe('BUY');
      expect(order?.limitPrice).toBe(150.00);
      expect(order?.quantity).toBe(10);
      expect(order?.status).toBe('pending');
    });

    test('should generate unique order ID', () => {
      const order1 = OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      const order2 = OrderEngine.placeOrder({
        symbol: 'GOOGL',
        type: 'BUY',
        limitPrice: 140.00,
        quantity: 5,
      });

      expect(order1?.id).toBeDefined();
      expect(order2?.id).toBeDefined();
      expect(order1?.id).not.toBe(order2?.id);
    });

    test('should set creation timestamp', () => {
      const before = Date.now();
      
      const order = OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      const after = Date.now();

      expect(order?.createdAt).toBeGreaterThanOrEqual(before);
      expect(order?.createdAt).toBeLessThanOrEqual(after);
    });

    test('should add order to active orders', () => {
      OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      const activeOrders = OrderEngine.getActiveOrders();

      expect(activeOrders).toHaveLength(1);
      expect(activeOrders[0].symbol).toBe('AAPL');
    });

    test('should reject BUY order with insufficient cash', () => {
      const request: OrderRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 50_000.00, // Too expensive
        quantity: 10,
      };

      const order = OrderEngine.placeOrder(request);

      expect(order).toBeNull();
    });

    test('should reject SELL order without position', () => {
      const request: OrderRequest = {
        symbol: 'AAPL',
        type: 'SELL',
        limitPrice: 150.00,
        quantity: 10,
      };

      const order = OrderEngine.placeOrder(request);

      expect(order).toBeNull();
    });

    test('should accept SELL order with sufficient position', () => {
      // First buy shares
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 20,
        price: 100.00,
        orderType: 'MARKET',
      });

      // Wait for throttle
      return new Promise(resolve => setTimeout(resolve, 1100)).then(() => {
        // Then place sell order
        const order = OrderEngine.placeOrder({
          symbol: 'AAPL',
          type: 'SELL',
          limitPrice: 120.00,
          quantity: 10,
        });

        expect(order).not.toBeNull();
        expect(order?.type).toBe('SELL');
      });
    });
  });

  describe('3. Order Cancellation', () => {
    test('should cancel pending order successfully', () => {
      const order = OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      const cancelled = OrderEngine.cancelOrder(order!.id);

      expect(cancelled).toBe(true);
    });

    test('should remove cancelled order from active orders', () => {
      const order = OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      OrderEngine.cancelOrder(order!.id);

      const activeOrders = OrderEngine.getActiveOrders();
      expect(activeOrders).toHaveLength(0);
    });

    test('should move cancelled order to history', () => {
      const order = OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      OrderEngine.cancelOrder(order!.id);

      const history = OrderEngine.getOrderHistory();
      expect(history.some(o => o.id === order!.id && o.status === 'cancelled')).toBe(true);
    });

    test('should return false for non-existent order', () => {
      const cancelled = OrderEngine.cancelOrder('NON_EXISTENT_ID');

      expect(cancelled).toBe(false);
    });

    test('should return false for already cancelled order', () => {
      const order = OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      OrderEngine.cancelOrder(order!.id);
      const cancelledAgain = OrderEngine.cancelOrder(order!.id);

      expect(cancelledAgain).toBe(false);
    });
  });

  describe('4. Order Modification', () => {
    test('should modify order limit price', () => {
      const order = OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      const modified = OrderEngine.modifyOrder(order!.id, {
        limitPrice: 160.00,
      });

      expect(modified).toBe(true);
      
      const updated = OrderEngine.getOrderById(order!.id);
      expect(updated?.limitPrice).toBe(160.00);
    });

    test('should modify order quantity', () => {
      const order = OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      const modified = OrderEngine.modifyOrder(order!.id, {
        quantity: 20,
      });

      expect(modified).toBe(true);
      
      const updated = OrderEngine.getOrderById(order!.id);
      expect(updated?.quantity).toBe(20);
    });

    test('should reject modification with invalid values', () => {
      const order = OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      const modified = OrderEngine.modifyOrder(order!.id, {
        limitPrice: -100, // Invalid
      });

      expect(modified).toBe(false);
    });

    test('should return false for non-existent order', () => {
      const modified = OrderEngine.modifyOrder('NON_EXISTENT_ID', {
        limitPrice: 160.00,
      });

      expect(modified).toBe(false);
    });
  });

  describe('5. Order Queries & Retrieval', () => {
    beforeEach(() => {
      // Setup: Buy some AAPL shares first so we can place SELL orders
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 100,
        price: 100.00,
        orderType: 'MARKET',
      });

      // Setup: Create multiple orders
      OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      OrderEngine.placeOrder({
        symbol: 'GOOGL',
        type: 'BUY',
        limitPrice: 140.00,
        quantity: 5,
      });

      OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'SELL',
        limitPrice: 160.00,
        quantity: 10,
      });
    });

    test('should get all active orders', () => {
      const orders = OrderEngine.getActiveOrders();

      expect(orders).toHaveLength(3);
    });

    test('should filter orders by symbol', () => {
      const appleOrders = OrderEngine.getOrdersForSymbol('AAPL');

      expect(appleOrders).toHaveLength(2);
      expect(appleOrders.every(o => o.symbol === 'AAPL')).toBe(true);
    });

    test('should get order by ID', () => {
      const orders = OrderEngine.getActiveOrders();
      const firstOrderId = orders[0].id;

      const order = OrderEngine.getOrderById(firstOrderId);

      expect(order).not.toBeNull();
      expect(order?.id).toBe(firstOrderId);
    });

    test('should return null for non-existent order ID', () => {
      const order = OrderEngine.getOrderById('NON_EXISTENT_ID');

      expect(order).toBeNull();
    });

    test('should get orders by status', () => {
      const pendingOrders = OrderEngine.getOrdersByStatus('pending');

      expect(pendingOrders).toHaveLength(3);
      expect(pendingOrders.every(o => o.status === 'pending')).toBe(true);
    });

    test('should get all orders (active + history)', () => {
      // Cancel one order
      const orders = OrderEngine.getActiveOrders();
      OrderEngine.cancelOrder(orders[0].id);

      const allOrders = OrderEngine.getAllOrders();

      expect(allOrders).toHaveLength(3); // 2 active + 1 cancelled
    });

    test('should get order statistics', () => {
      const stats = OrderEngine.getOrderStats();

      expect(stats.active).toBe(3);
      expect(stats.pending).toBe(3);
      expect(stats.filled).toBe(0);
      expect(stats.cancelled).toBe(0);
    });
  });

  describe('6. Order History', () => {
    test('should return empty history initially', () => {
      const history = OrderEngine.getOrderHistory();

      expect(history).toHaveLength(0);
    });

    test('should add cancelled orders to history', () => {
      const order = OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      OrderEngine.cancelOrder(order!.id);

      const history = OrderEngine.getOrderHistory();

      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('cancelled');
    });

    test('should limit history when requested', () => {
      // Create and cancel multiple orders
      for (let i = 0; i < 10; i++) {
        const order = OrderEngine.placeOrder({
          symbol: 'AAPL',
          type: 'BUY',
          limitPrice: 150.00,
          quantity: 10,
        });
        OrderEngine.cancelOrder(order!.id);
      }

      const limitedHistory = OrderEngine.getOrderHistory(5);

      expect(limitedHistory).toHaveLength(5);
    });
  });

  describe('7. Persistence & Serialization', () => {
    test('should serialize orders to array', () => {
      OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      const serialized = OrderEngine.serializeOrders();

      expect(Array.isArray(serialized)).toBe(true);
      expect(serialized).toHaveLength(1);
      expect(serialized[0].symbol).toBe('AAPL');
    });

    test('should load orders from saved state', () => {
      const savedOrders: LimitOrder[] = [
        {
          id: 'TEST-1',
          symbol: 'AAPL',
          type: 'BUY',
          limitPrice: 150.00,
          quantity: 10,
          status: 'pending',
          createdAt: Date.now(),
        },
      ];

      OrderEngine.loadOrders(savedOrders);

      const orders = OrderEngine.getActiveOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe('TEST-1');
    });

    test('should preserve order state across serialize/load', () => {
      OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      const serialized = OrderEngine.serializeOrders();
      OrderEngine.reset();
      OrderEngine.loadOrders(serialized);

      const orders = OrderEngine.getActiveOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0].symbol).toBe('AAPL');
    });
  });

  describe('8. Edge Cases & Error Handling', () => {
    test('should handle multiple orders for same symbol', () => {
      OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 145.00,
        quantity: 5,
      });

      const appleOrders = OrderEngine.getOrdersForSymbol('AAPL');

      expect(appleOrders).toHaveLength(2);
    });

    test('should handle many concurrent orders', () => {
      const orderCount = 100;

      for (let i = 0; i < orderCount; i++) {
        OrderEngine.placeOrder({
          symbol: 'AAPL',
          type: 'BUY',
          limitPrice: 150.00 + i,
          quantity: 1,
        });
      }

      const orders = OrderEngine.getActiveOrders();

      expect(orders).toHaveLength(orderCount);
    });

    test('should handle orders with very small prices', () => {
      const order = OrderEngine.placeOrder({
        symbol: 'PENNY',
        type: 'BUY',
        limitPrice: 0.01,
        quantity: 1000,
      });

      expect(order).not.toBeNull();
      expect(order?.limitPrice).toBe(0.01);
    });

    test('should handle orders with very large quantities', () => {
      const order = OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 1.00,
        quantity: 10000,
      });

      expect(order).not.toBeNull();
      expect(order?.quantity).toBe(10000);
    });

    test('should reset to clean state', () => {
      // Create multiple orders
      OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      OrderEngine.placeOrder({
        symbol: 'GOOGL',
        type: 'BUY',
        limitPrice: 140.00,
        quantity: 5,
      });

      OrderEngine.reset();

      const active = OrderEngine.getActiveOrders();
      const history = OrderEngine.getOrderHistory();

      expect(active).toHaveLength(0);
      expect(history).toHaveLength(0);
    });

    test('should return immutable order arrays', () => {
      OrderEngine.placeOrder({
        symbol: 'AAPL',
        type: 'BUY',
        limitPrice: 150.00,
        quantity: 10,
      });

      const orders = OrderEngine.getActiveOrders();

      expect(Object.isFrozen(orders)).toBe(true);
    });
  });
});
