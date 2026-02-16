/**
 * ============================================================================
 * TradeEngine Module
 * ============================================================================
 * 
 * Synchronous functional module for trade execution with financial accuracy.
 * 
 * RESPONSIBILITIES:
 * - Execute trades with atomic portfolio updates
 * - Validate trades against business rules
 * - Enforce throttle limits (prevent rapid-fire trades)
 * - Record trade history
 * - Calculate portfolio metrics
 * 
 * FINANCIAL PRECISION:
 * All calculations use cents-based integer arithmetic to avoid floating-point
 * errors. Portfolio state is updated atomically (all-or-nothing).
 * 
 * THROTTLE:
 * Minimum 1000ms between trades to prevent UI spam and accidental double-clicks.
 * 
 * THREAD SAFETY:
 * Uses isExecuting flag to prevent concurrent trade execution.
 * ============================================================================
 */

import type { Portfolio, Trade, TradeRequest, TradeResult } from '@types';

// Import validation
import { validateTradeRequest } from './validators/tradeValidation';

// Import execution logic
import { executeBuyTrade } from './commands/executeBuy';
import { executeSellTrade } from './commands/executeSell';

// Import utilities
import { generateTradeId } from './utils/tradeHistory';
import { calculatePortfolioMetrics } from './utils/portfolioManager';
import type { ExtendedPortfolioMetrics } from './utils/portfolioManager';

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
 * ============================================================================
 * EXECUTE TRADE
 * ============================================================================
 * 
 * Main entry point for trade execution with full validation and atomic updates.
 * 
 * Algorithm:
 * 1. Check if trade already in progress (race condition prevention)
 * 2. Check throttle (1000ms minimum between trades)
 * 3. Validate trade request (symbol, quantity, price, cash, holdings)
 * 4. Execute trade (BUY or SELL) with atomic portfolio updates
 * 5. Record trade in history
 * 6. Update last trade time
 * 7. Return result
 * 
 * ATOMIC UPDATES:
 * If validation fails, portfolio is unchanged.
 * If execution fails, portfolio is unchanged (rolled back).
 * Only successful trades update state.
 * 
 * Example:
 *   Request: Buy 10 AAPL @ $150
 *   
 *   1. Check isExecuting: false ✓
 *   2. Check throttle: not throttled ✓
 *   3. Validate:
 *      - Symbol: AAPL ✓
 *      - Quantity: 10 ✓
 *      - Price: $150 ✓
 *      - Cash: $10,000 >= $1,500 ✓
 *   4. Execute:
 *      - Deduct $1,500 from cash
 *      - Add 10 shares to AAPL position
 *      - Calculate average cost
 *   5. Record trade in history
 *   6. Update lastTradeTime
 *   7. Return { success: true, trade: {...} }
 * ============================================================================
 */
export const executeTrade = (request: TradeRequest): TradeResult => {
  // Step 1: Check if already executing (race condition prevention)
  if (isExecuting) {
    return {
      success: false,
      error: 'Trade in progress. Try again in 1 second.',
    };
  }

  // Step 2: Check throttle (1000ms minimum between trades)
  if (isThrottled()) {
    const remaining = getThrottleRemaining();
    return {
      success: false,
      error: `Trade throttled. Wait ${Math.ceil(remaining / 1000)} second(s).`,
    };
  }

  try {
    // Set executing flag
    isExecuting = true;

    // Step 3: Validate trade request
    const validation = validateTradeRequest(request, portfolio);
    
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || 'Invalid trade request',
      };
    }

    // Step 4: Generate trade ID and timestamp
    const tradeId = generateTradeId();
    const timestamp = Date.now();

    // Step 5: Execute trade based on type
    let result: { portfolio: Portfolio; trade: Trade };
    
    try {
      if (request.type === 'BUY') {
        result = executeBuyTrade(portfolio, request, tradeId, timestamp);
      } else if (request.type === 'SELL') {
        result = executeSellTrade(portfolio, request, tradeId, timestamp);
      } else {
        return {
          success: false,
          error: `Invalid trade type: ${request.type}`,
        };
      }
    } catch (error: any) {
      // Execution failed, return error (portfolio unchanged)
      return {
        success: false,
        trade: error.trade,
        error: error.error || 'Trade execution failed',
      };
    }

    // Step 6: Update module state atomically
    portfolio = result.portfolio;
    tradeHistory = [...tradeHistory, result.trade];
    
    // Step 7: Update last trade time
    lastTradeTime = timestamp;

    // Step 8: Return success
    return {
      success: true,
      trade: result.trade,
      error: undefined,
    };
  } catch (error) {
    // Unexpected error, return error (portfolio unchanged)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    // Always clear executing flag
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
 * Load complete engine state (convenience method)
 */
export const loadState = (savedPortfolio: Portfolio, savedHistory: Trade[]): void => {
  loadPortfolio(savedPortfolio);
  loadTradeHistory(savedHistory);
  console.log('[TradeEngine] State loaded');
};

/**
 * Reset engine state (for testing)
 * @param initialCashAmount Optional. Starting cash balance. Defaults to 100,000
 */
export const reset = (initialCashAmount: number = 100_000): void => {
  const clampedAmount = Math.max(1000, Math.min(10_000_000, initialCashAmount));
  portfolio = {
    cash: clampedAmount,
    positions: {},
    realizedPL: 0,
    initialCash: clampedAmount,
  };
  tradeHistory = [];
  isExecuting = false;
  lastTradeTime = 0;
};

/**
 * ============================================================================
 * PORTFOLIO METRICS
 * ============================================================================
 * 
 * Calculate comprehensive portfolio metrics using current market prices.
 * 
 * Metrics:
 *   - Total Value = cash + positions value
 *   - Unrealized P&L = current value - cost basis
 *   - Realized P&L = cumulative from all sells
 *   - Total P&L = realized + unrealized
 *   - Total Return % = total P&L / initial cash × 100
 * 
 * Example:
 *   Portfolio: $5,000 cash, 10 AAPL @ $150 avg cost
 *   Current Price: AAPL = $180
 *   
 *   Calculations:
 *     positionsValue = 10 × $180 = $1,800
 *     totalValue = $5,000 + $1,800 = $6,800
 *     unrealizedPL = (180 - 150) × 10 = $300
 *     totalPL = $200 (realized) + $300 (unrealized) = $500
 * ============================================================================
 */
export const getPortfolioMetrics = (
  currentPrices: Record<string, number>
): ExtendedPortfolioMetrics => {
  return calculatePortfolioMetrics(portfolio, currentPrices);
};

/**
 * ============================================================================
 * EXPORTS
 * ============================================================================
 */
export default {
  // State getters
  getPortfolio,
  getTradeHistory,
  getPortfolioMetrics,
  
  // Throttle
  isThrottled,
  getThrottleRemaining,
  
  // Execution
  executeTrade,
  
  // Persistence
  loadPortfolio,
  loadTradeHistory,
  loadState,
  
  // Testing
  reset,
};
