/**
 * OrderEngine Module
 * Event-driven functional module for limit order management
 * 
 * Responsible for:
 * - Managing open limit orders
 * - Checking price triggers
 * - Auto-executing when conditions are met
 */

import type { LimitOrder, OrderRequest } from '@types';

// Module-level state
let openOrders: LimitOrder[] = [];
let orderHistory: LimitOrder[] = [];

/**
 * Place a new limit order
 */
export const placeOrder = (request: OrderRequest): LimitOrder | null => {
  // TODO: Validate order
  // TODO: Create order
  // TODO: Add to openOrders
  console.log('[OrderEngine] Order placed:', request);
  return null;
};

/**
 * Get all open orders
 */
export const getOpenOrders = (): readonly LimitOrder[] => {
  return Object.freeze([...openOrders]);
};

/**
 * Get orders for a specific symbol
 */
export const getOrdersForSymbol = (symbol: string): readonly LimitOrder[] => {
  return Object.freeze(openOrders.filter((o) => o.symbol === symbol));
};

/**
 * Cancel an order by ID
 */
export const cancelOrder = (orderId: string): boolean => {
  const index = openOrders.findIndex((o) => o.id === orderId);
  if (index === -1) return false;

  const [cancelled] = openOrders.splice(index, 1);
  cancelled.status = 'cancelled';
  orderHistory.push(cancelled);

  console.log('[OrderEngine] Order cancelled:', orderId);
  return true;
};

/**
 * Modify an order
 */
export const modifyOrder = (
  orderId: string,
  updates: Partial<LimitOrder>
): boolean => {
  const order = openOrders.find((o) => o.id === orderId);
  if (!order) return false;

  Object.assign(order, updates);
  console.log('[OrderEngine] Order modified:', orderId);
  return true;
};

/**
 * Load orders from persisted state
 */
export const loadOrders = (savedOrders: LimitOrder[]): void => {
  openOrders = savedOrders.filter((o) => o.status === 'open');
  orderHistory = savedOrders.filter((o) => o.status !== 'open');
  console.log('[OrderEngine] Orders loaded');
};

/**
 * Get serialized state for persistence
 */
export const serializeOrders = (): LimitOrder[] => {
  return [...openOrders, ...orderHistory];
};

/**
 * Reset engine state (for testing)
 */
export const reset = (): void => {
  openOrders = [];
  orderHistory = [];
};

export default {
  placeOrder,
  getOpenOrders,
  getOrdersForSymbol,
  cancelOrder,
  modifyOrder,
  loadOrders,
  serializeOrders,
  reset,
};
