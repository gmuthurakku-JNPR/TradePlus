/**
 * TradeEngine Module
 * Synchronous functional module for trade execution
 * 
 * Responsible for:
 * - Executing trades with atomic updates
 * - Validating trades
 * - Enforcing throttle limits
 * - Recording trade history
 */

import type { Portfolio, Trade, TradeRequest, TradeResult } from '@types';

// Module-level state
let portfolio: Portfolio = {
  cash: 100_000,
  positions: {},
  realizedPL: 0,
  initialCash: 100_000,
};

let tradeHistory: Trade[] = [];
let isExecuting = false;
let lastTradeTime = 0;
const THROTTLE_MS = 1000;

/**
 * Get current portfolio state
 */
export const getPortfolio = (): Portfolio => {
  return { ...portfolio };
};

/**
 * Get trade history
 */
export const getTradeHistory = (): readonly Trade[] => {
  return Object.freeze([...tradeHistory]);
};

/**
 * Check if trade is throttled
 */
export const isThrottled = (): boolean => {
  return Date.now() - lastTradeTime < THROTTLE_MS;
};

/**
 * Get remaining throttle time in ms
 */
export const getThrottleRemaining = (): number => {
  const remaining = THROTTLE_MS - (Date.now() - lastTradeTime);
  return Math.max(0, remaining);
};

/**
 * Execute a trade with atomic updates
 */
export const executeTrade = (_request: TradeRequest): TradeResult => {
  // Check if already executing
  if (isExecuting) {
    return {
      success: false,
      error: 'Trade in progress. Try again in 1 second.',
    };
  }

  // Check throttle
  if (isThrottled()) {
    return {
      success: false,
      error: `Trade throttled. Try again in ${getThrottleRemaining()}ms.`,
    };
  }

  try {
    isExecuting = true;

    // TODO: Validate trade
    // TODO: Update portfolio atomically
    // TODO: Record trade
    // TODO: Persist state
    // TODO: Notify subscribers

    lastTradeTime = Date.now();

    return {
      success: true,
      error: undefined,
    };
  } finally {
    isExecuting = false;
  }
};

/**
 * Load portfolio from persisted state
 */
export const loadPortfolio = (savedPortfolio: Portfolio): void => {
  portfolio = { ...savedPortfolio };
  console.log('[TradeEngine] Portfolio loaded');
};

/**
 * Load trade history from persisted state
 */
export const loadTradeHistory = (savedHistory: Trade[]): void => {
  tradeHistory = [...savedHistory];
  console.log('[TradeEngine] Trade history loaded');
};

/**
 * Reset engine state (for testing)
 */
export const reset = (): void => {
  portfolio = {
    cash: 100_000,
    positions: {},
    realizedPL: 0,
    initialCash: 100_000,
  };
  tradeHistory = [];
  isExecuting = false;
  lastTradeTime = 0;
};

export default {
  getPortfolio,
  getTradeHistory,
  isThrottled,
  getThrottleRemaining,
  executeTrade,
  loadPortfolio,
  loadTradeHistory,
  reset,
};
