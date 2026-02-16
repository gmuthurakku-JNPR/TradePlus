/**
 * ============================================================================
 * Limit Order Engine
 * ============================================================================
 * 
 * A comprehensive order management system with automated execution:
 * 
 * Architecture:
 * - Event-driven: Reacts to price updates via PriceEngine subscriptions
 * - Stateful: Maintains active orders and execution history
 * - Atomic: Orders transition through well-defined states
 * - Integrated: Coordinates with TradeEngine for execution
 * 
 * Features:
 * 1. Order Management: Create, cancel, modify, query orders
 * 2. Price Monitoring: Subscribe to real-time prices for active symbols
 * 3. Trigger Detection: Automatically detect when price conditions are met
 * 4. Execution: Execute trades via TradeEngine when triggered
 * 5. Status Tracking: Track order lifecycle from pending → filled/cancelled/failed
 * 6. Duplicate Prevention: Ensure each order executes at most once
 * 7. Error Handling: Graceful failure with detailed error messages
 * 8. Persistence: Support for loading/saving order state
 * 
 * Order Lifecycle:
 * 1. pending → Price monitoring active
 * 2. triggered → Price condition met, executing trade
 * 3. filled → Trade executed successfully
 * 4. cancelled → User cancelled (or timed out)
 * 5. failed → Execution failed (insufficient funds, etc.)
 * 
 * Trigger Logic:
 * - BUY orders: Execute when market price <= limitPrice
 * - SELL orders: Execute when market price >= limitPrice
 * 
 * Performance:
 * - O(1) order lookup by ID
 * - O(n) price check per symbol (n = orders for that symbol)
 * - Lazy subscription: Only monitor symbols with active orders
 * 
 * Thread Safety:
 * - Single-threaded JavaScript execution model
 * - No race conditions within synchronous operations
 * - Status checks prevent duplicate execution
 * 
 * ============================================================================
 */

import type { LimitOrder, OrderRequest, OrderStatus, TradeRequest, PriceData } from '@types';
import type { UnsubscribeFn } from '@types';
import PriceEngine from '@engines/PriceEngine';
import TradeEngine from '@engines/TradeEngine';

/**
 * ============================================================================
 * STORAGE & STATE
 * ============================================================================
 */

/** Active orders (pending or triggered) */
let activeOrders = new Map<string, LimitOrder>();

/** Order history (filled, cancelled, failed) */
let orderHistory: LimitOrder[] = [];

/** Price subscriptions by symbol */
let priceSubscriptions = new Map<string, UnsubscribeFn>();

/** Order counter for generating unique IDs */
let orderCounter = 1;

/** Active execution locks (prevent duplicate execution) */
let executionLocks = new Set<string>();

/**
 * ============================================================================
 * VALIDATION
 * ============================================================================
 */

/**
 * Validate order request parameters
 */
const validateOrderRequest = (request: OrderRequest): { isValid: boolean; error?: string } => {
  // Validate symbol
  if (!request.symbol || typeof request.symbol !== 'string') {
    return { isValid: false, error: 'Symbol is required' };
  }
  if (request.symbol.length < 1 || request.symbol.length > 10) {
    return { isValid: false, error: 'Symbol must be 1-10 characters' };
  }
  if (!/^[A-Z0-9.]+$/.test(request.symbol)) {
    return { isValid: false, error: 'Invalid symbol format (use uppercase A-Z, 0-9, .)' };
  }

  // Validate type
  if (request.type !== 'BUY' && request.type !== 'SELL') {
    return { isValid: false, error: 'Type must be BUY or SELL' };
  }

  // Validate quantity
  if (!Number.isInteger(request.quantity) || request.quantity <= 0) {
    return { isValid: false, error: 'Quantity must be a positive integer' };
  }

  // Validate limit price
  if (typeof request.limitPrice !== 'number' || request.limitPrice < 0.01) {
    return { isValid: false, error: 'Limit price must be at least $0.01' };
  }
  if (request.limitPrice > 1_000_000) {
    return { isValid: false, error: 'Limit price exceeds maximum ($1,000,000)' };
  }

  return { isValid: true };
};

/**
 * Validate order can be executed (portfolio constraints)
 */
const validateOrderExecution = (order: LimitOrder): { isValid: boolean; error?: string } => {
  const portfolio = TradeEngine.getPortfolio();

  if (order.type === 'BUY') {
    // Check cash availability (use limit price for estimation)
    const estimatedCost = order.quantity * order.limitPrice;
    if (portfolio.cash < estimatedCost) {
      return {
        isValid: false,
        error: `Insufficient cash: need $${estimatedCost.toFixed(2)}, have $${portfolio.cash.toFixed(2)}`,
      };
    }
  } else {
    // Check share availability
    const position = portfolio.positions[order.symbol];
    const availableShares = position?.shares || 0;
    if (availableShares < order.quantity) {
      return {
        isValid: false,
        error: `Insufficient shares: trying to sell ${order.quantity}, have ${availableShares}`,
      };
    }
  }

  return { isValid: true };
};

/**
 * ============================================================================
 * ORDER CREATION
 * ============================================================================
 */

/**
 * Place a new limit order
 * 
 * Validates the order, creates it with pending status, and starts price monitoring.
 * 
 * @param request Order parameters
 * @returns Created order or null if validation fails
 * 
 * @example
 * ```ts
 * const order = placeOrder({
 *   symbol: 'AAPL',
 *   type: 'BUY',
 *   limitPrice: 150.00,
 *   quantity: 10
 * });
 * ```
 */
export const placeOrder = (request: OrderRequest): LimitOrder | null => {
  console.log('[OrderEngine] Placing order:', request);

  // Validate request
  const validation = validateOrderRequest(request);
  if (!validation.isValid) {
    console.error('[OrderEngine] Validation failed:', validation.error);
    return null;
  }

  // Create order
  const order: LimitOrder = {
    id: `ORD-${Date.now()}-${orderCounter++}`,
    symbol: request.symbol,
    type: request.type,
    limitPrice: request.limitPrice,
    quantity: request.quantity,
    createdAt: Date.now(),
    status: 'pending',
  };

  // Validate execution constraints (cash/shares)
  const execValidation = validateOrderExecution(order);
  if (!execValidation.isValid) {
    console.error('[OrderEngine] Execution validation failed:', execValidation.error);
    order.status = 'failed';
    order.error = execValidation.error;
    orderHistory.push(order);
    return null;
  }

  // Add to active orders
  activeOrders.set(order.id, order);

  // Start price monitoring for this symbol
  subscribeToSymbol(order.symbol);

  console.log(`[OrderEngine] Order created: ${order.id} (${order.type} ${order.quantity} ${order.symbol} @ $${order.limitPrice})`);

  return order;
};

/**
 * ============================================================================
 * PRICE MONITORING
 * ============================================================================
 */

/**
 * Subscribe to price updates for a symbol (if not already subscribed)
 */
const subscribeToSymbol = (symbol: string): void => {
  // Skip if already subscribed
  if (priceSubscriptions.has(symbol)) {
    return;
  }

  console.log(`[OrderEngine] Subscribing to price updates for ${symbol}`);

  // Subscribe to PriceEngine
  const unsubscribe = PriceEngine.subscribe(symbol, (priceData: PriceData) => {
    handlePriceUpdate(symbol, priceData);
  });

  priceSubscriptions.set(symbol, unsubscribe);
};

/**
 * Unsubscribe from price updates for a symbol (if no active orders remain)
 */
const unsubscribeFromSymbol = (symbol: string): void => {
  // Check if any active orders remain for this symbol
  const hasActiveOrders = Array.from(activeOrders.values()).some(
    (order) => order.symbol === symbol && order.status === 'pending'
  );

  if (hasActiveOrders) {
    return; // Keep subscription active
  }

  // Unsubscribe
  const unsubscribe = priceSubscriptions.get(symbol);
  if (unsubscribe) {
    console.log(`[OrderEngine] Unsubscribing from price updates for ${symbol}`);
    unsubscribe();
    priceSubscriptions.delete(symbol);
  }
};

/**
 * ============================================================================
 * TRIGGER DETECTION
 * ============================================================================
 */

/**
 * Handle price update for a symbol
 * Checks all pending orders for this symbol and triggers execution if conditions are met
 */
const handlePriceUpdate = (symbol: string, priceData: PriceData): void => {
  // Get all pending orders for this symbol
  const pendingOrders = Array.from(activeOrders.values()).filter(
    (order) => order.symbol === symbol && order.status === 'pending'
  );

  if (pendingOrders.length === 0) {
    return;
  }

  // Check each order for trigger conditions
  for (const order of pendingOrders) {
    const shouldTrigger = checkTriggerCondition(order, priceData);

    if (shouldTrigger) {
      console.log(
        `[OrderEngine] Order ${order.id} triggered: ${order.type} ${order.quantity} ${order.symbol} @ limit $${order.limitPrice} (market: $${priceData.price})`
      );
      executeOrder(order, priceData);
    }
  }
};

/**
 * Check if order trigger condition is met
 * 
 * Trigger Logic:
 * - BUY orders: Trigger when market price <= limit price
 * - SELL orders: Trigger when market price >= limit price
 */
const checkTriggerCondition = (order: LimitOrder, priceData: PriceData): boolean => {
  if (order.type === 'BUY') {
    // BUY: Execute when price drops to or below limit
    return priceData.price <= order.limitPrice;
  } else {
    // SELL: Execute when price rises to or above limit
    return priceData.price >= order.limitPrice;
  }
};

/**
 * ============================================================================
 * EXECUTION
 * ============================================================================
 */

/**
 * Execute a triggered order via TradeEngine
 * 
 * Prevents duplicate execution using locks and status checks.
 */
const executeOrder = (order: LimitOrder, priceData: PriceData): void => {
  // Prevent duplicate execution
  if (executionLocks.has(order.id)) {
    console.warn(`[OrderEngine] Order ${order.id} already executing`);
    return;
  }

  // Double-check status
  if (order.status !== 'pending') {
    console.warn(`[OrderEngine] Order ${order.id} status is ${order.status}, cannot execute`);
    return;
  }

  // Acquire execution lock
  executionLocks.add(order.id);

  // Update status to triggered
  order.status = 'triggered';
  order.triggeredAt = Date.now();

  console.log(`[OrderEngine] Executing order ${order.id}...`);

  try {
    // Prepare trade request (use current market price for execution)
    const tradeRequest: TradeRequest = {
      symbol: order.symbol,
      type: order.type,
      quantity: order.quantity,
      price: priceData.price, // Execute at current market price
      orderType: 'MARKET',
    };

    // Execute via TradeEngine
    const result = TradeEngine.executeTrade(tradeRequest);

    // Handle result
    if (result.success && result.trade) {
      // Success!
      order.status = 'filled';
      order.filledAt = Date.now();
      order.executedPrice = result.trade.executedPrice;
      order.executedTotal = result.trade.total;
      order.tradeId = result.trade.id;

      console.log(
        `[OrderEngine] Order ${order.id} filled: ${order.quantity} ${order.symbol} @ $${order.executedPrice?.toFixed(2)} (total: $${order.executedTotal?.toFixed(2)})`
      );

      // Move to history
      activeOrders.delete(order.id);
      orderHistory.push(order);

      // Cleanup subscription if no more orders for this symbol
      unsubscribeFromSymbol(order.symbol);
    } else {
      // Execution failed
      order.status = 'failed';
      order.error = result.error || 'Trade execution failed';

      console.error(`[OrderEngine] Order ${order.id} execution failed:`, order.error);

      // Move to history
      activeOrders.delete(order.id);
      orderHistory.push(order);

      // Cleanup subscription if no more orders for this symbol
      unsubscribeFromSymbol(order.symbol);
    }
  } catch (error) {
    // Unexpected error
    order.status = 'failed';
    order.error = error instanceof Error ? error.message : 'Unknown execution error';

    console.error(`[OrderEngine] Order ${order.id} execution error:`, error);

    // Move to history
    activeOrders.delete(order.id);
    orderHistory.push(order);

    // Cleanup subscription
    unsubscribeFromSymbol(order.symbol);
  } finally {
    // Release execution lock
    executionLocks.delete(order.id);
  }
};

/**
 * ============================================================================
 * ORDER MANAGEMENT
 * ============================================================================
 */

/**
 * Cancel an order by ID
 * 
 * Only pending orders can be cancelled.
 * Triggered/filled/failed orders cannot be cancelled.
 * 
 * @param orderId Order ID to cancel
 * @returns true if cancelled, false if not found or cannot be cancelled
 */
export const cancelOrder = (orderId: string): boolean => {
  const order = activeOrders.get(orderId);

  if (!order) {
    console.warn(`[OrderEngine] Order ${orderId} not found`);
    return false;
  }

  if (order.status !== 'pending') {
    console.warn(`[OrderEngine] Order ${orderId} status is ${order.status}, cannot cancel`);
    return false;
  }

  // Cancel order
  order.status = 'cancelled';
  order.cancelledAt = Date.now();

  console.log(`[OrderEngine] Order ${orderId} cancelled`);

  // Move to history
  activeOrders.delete(orderId);
  orderHistory.push(order);

  // Cleanup subscription if no more orders for this symbol
  unsubscribeFromSymbol(order.symbol);

  return true;
};

/**
 * Modify an existing order
 * 
 * Only limit price and quantity can be modified.
 * Only pending orders can be modified.
 * 
 * @param orderId Order ID to modify
 * @param updates Fields to update
 * @returns true if modified, false if not found or cannot be modified
 */
export const modifyOrder = (
  orderId: string,
  updates: { limitPrice?: number; quantity?: number }
): boolean => {
  const order = activeOrders.get(orderId);

  if (!order) {
    console.warn(`[OrderEngine] Order ${orderId} not found`);
    return false;
  }

  if (order.status !== 'pending') {
    console.warn(`[OrderEngine] Order ${orderId} status is ${order.status}, cannot modify`);
    return false;
  }

  // Validate updates
  if (updates.limitPrice !== undefined) {
    if (updates.limitPrice < 0.01 || updates.limitPrice > 1_000_000) {
      console.error('[OrderEngine] Invalid limit price');
      return false;
    }
    order.limitPrice = updates.limitPrice;
  }

  if (updates.quantity !== undefined) {
    if (!Number.isInteger(updates.quantity) || updates.quantity <= 0) {
      console.error('[OrderEngine] Invalid quantity');
      return false;
    }
    order.quantity = updates.quantity;
  }

  console.log(`[OrderEngine] Order ${orderId} modified:`, updates);

  return true;
};

/**
 * ============================================================================
 * QUERIES
 * ============================================================================
 */

/**
 * Get all active orders (pending or triggered)
 */
export const getActiveOrders = (): readonly LimitOrder[] => {
  return Object.freeze(Array.from(activeOrders.values()));
};

/**
 * Get orders for a specific symbol (active only)
 */
export const getOrdersForSymbol = (symbol: string): readonly LimitOrder[] => {
  return Object.freeze(
    Array.from(activeOrders.values()).filter((order) => order.symbol === symbol)
  );
};

/**
 * Get a specific order by ID (checks both active and history)
 */
export const getOrderById = (orderId: string): LimitOrder | null => {
  // Check active orders first
  const activeOrder = activeOrders.get(orderId);
  if (activeOrder) {
    return activeOrder;
  }

  // Check history
  const historicalOrder = orderHistory.find((order) => order.id === orderId);
  return historicalOrder || null;
};

/**
 * Get order history (filled, cancelled, failed orders)
 */
export const getOrderHistory = (limit?: number): readonly LimitOrder[] => {
  const history = [...orderHistory].reverse(); // Most recent first
  return Object.freeze(limit ? history.slice(0, limit) : history);
};

/**
 * Get all orders (active + history)
 */
export const getAllOrders = (): readonly LimitOrder[] => {
  return Object.freeze([...Array.from(activeOrders.values()), ...orderHistory]);
};

/**
 * Get orders by status
 */
export const getOrdersByStatus = (status: OrderStatus): readonly LimitOrder[] => {
  const activeMatches = Array.from(activeOrders.values()).filter((o) => o.status === status);
  const historyMatches = orderHistory.filter((o) => o.status === status);
  return Object.freeze([...activeMatches, ...historyMatches]);
};

/**
 * ============================================================================
 * PERSISTENCE
 * ============================================================================
 */

/**
 * Load orders from persisted state
 * 
 * Restores active orders and re-subscribes to price updates.
 */
export const loadOrders = (savedOrders: LimitOrder[]): void => {
  console.log(`[OrderEngine] Loading ${savedOrders.length} orders...`);

  // Separate active and historical orders
  const active = savedOrders.filter((o) => o.status === 'pending' || o.status === 'triggered');
  const historical = savedOrders.filter((o) => o.status !== 'pending' && o.status !== 'triggered');

  // Restore active orders
  activeOrders.clear();
  active.forEach((order) => {
    activeOrders.set(order.id, order);
  });

  // Restore history
  orderHistory = historical;

  // Re-subscribe to symbols with active orders
  const symbols = new Set(active.map((o) => o.symbol));
  symbols.forEach((symbol) => subscribeToSymbol(symbol));

  console.log(`[OrderEngine] Loaded ${active.length} active orders, ${historical.length} historical orders`);
};

/**
 * Get serialized state for persistence
 */
export const serializeOrders = (): LimitOrder[] => {
  return [...Array.from(activeOrders.values()), ...orderHistory];
};

/**
 * ============================================================================
 * UTILITIES
 * ============================================================================
 */

/**
 * Get statistics about orders
 */
export const getOrderStats = () => {
  const all = getAllOrders();
  return {
    total: all.length,
    active: activeOrders.size,
    pending: getOrdersByStatus('pending').length,
    triggered: getOrdersByStatus('triggered').length,
    filled: getOrdersByStatus('filled').length,
    cancelled: getOrdersByStatus('cancelled').length,
    failed: getOrdersByStatus('failed').length,
    subscribedSymbols: priceSubscriptions.size,
  };
};

/**
 * Reset engine state (for testing)
 * 
 * Clears all orders and unsubscribes from all price updates.
 */
export const reset = (): void => {
  console.log('[OrderEngine] Resetting...');

  // Unsubscribe from all symbols
  priceSubscriptions.forEach((unsubscribe) => unsubscribe());
  priceSubscriptions.clear();

  // Clear state
  activeOrders.clear();
  orderHistory = [];
  executionLocks.clear();
  orderCounter = 1;

  console.log('[OrderEngine] Reset complete');
};

/**
 * ============================================================================
 * PUBLIC API
 * ============================================================================
 */

export default {
  // Order management
  placeOrder,
  cancelOrder,
  modifyOrder,

  // Queries
  getActiveOrders,
  getOrdersForSymbol,
  getOrderById,
  getOrderHistory,
  getAllOrders,
  getOrdersByStatus,
  getOrderStats,

  // Persistence
  loadOrders,
  serializeOrders,

  // Utilities
  reset,
};
