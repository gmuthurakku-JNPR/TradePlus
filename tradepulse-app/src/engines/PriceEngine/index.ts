/**
 * PriceEngine Module
 * Functional module with closures for singleton price generation
 * 
 * Responsible for:
 * - Simulating realistic price movements (GBM)
 * - Maintaining subscribers
 * - Notifying on price updates
 */

import type { PriceData, PricePoint, PriceSubscriber, UnsubscribeFn } from '@types';

// Module-level state (singleton)
let subscribers = new Map<string, Set<PriceSubscriber>>();
let prices = new Map<string, PriceData>();
let history = new Map<string, PricePoint[]>();
let updateInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

/**
 * Subscribe to price updates for a symbol
 */
export const subscribe = (
  symbol: string,
  callback: PriceSubscriber
): UnsubscribeFn => {
  if (!subscribers.has(symbol)) {
    subscribers.set(symbol, new Set());
  }

  subscribers.get(symbol)!.add(callback);

  return () => {
    const subs = subscribers.get(symbol);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        subscribers.delete(symbol);
      }
    }
  };
};

/**
 * Get current price for a symbol
 */
export const getPrice = (symbol: string): PriceData | undefined => {
  return prices.get(symbol);
};

/**
 * Get all prices
 */
export const getAllPrices = (): ReadonlyMap<string, PriceData> => {
  return new Map(prices);
};

/**
 * Get price history for a symbol
 */
export const getHistory = (symbol: string): readonly PricePoint[] => {
  return Object.freeze(history.get(symbol) || []);
};

/**
 * Start the price engine
 */
export const start = (): void => {
  if (isRunning) return;
  isRunning = true;

  // TODO: Initialize symbols
  // TODO: Start interval for price updates
  console.log('[PriceEngine] Started');
};

/**
 * Stop the price engine
 */
export const stop = (): void => {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  isRunning = false;
  console.log('[PriceEngine] Stopped');
};

/**
 * Reset engine state (for testing)
 */
export const reset = (): void => {
  stop();
  subscribers.clear();
  prices.clear();
  history.clear();
};

/**
 * Internal: Notify all subscribers
 * TODO: Use this when implementing GBM price generation
 */
// const _notifyAll = (): void => {
//   for (const [symbol, callbacks] of subscribers.entries()) {
//     const price = prices.get(symbol);
//     if (!price) continue;
//
//     callbacks.forEach((callback) => {
//       try {
//         callback(price);
//       } catch (e) {
//         console.error(`[PriceEngine] Error in callback for ${symbol}:`, e);
//       }
//     });
//   }
// };

export default {
  subscribe,
  getPrice,
  getAllPrices,
  getHistory,
  start,
  stop,
  reset,
};
