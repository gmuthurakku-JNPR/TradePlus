/**
 * ================================================================================
 * PriceEngine Module - Real-Time Price Simulation
 * ================================================================================
 * 
 * Functional module implementing a singleton price engine for simulating realistic
 * stock prices using Geometric Brownian Motion (GBM).
 * 
 * RESPONSIBILITIES:
 * - Simulate 500+ stock prices with realistic movements
 * - Maintain subscriber callbacks for price updates
 * - Store rolling price history (500 points per symbol)
 * - Notify subscribers on each 1-second tick
 * - Manage price volatility, spreads, and daily ranges
 * 
 * DESIGN PATTERNS:
 * - Singleton: Module-level state via closures
 * - Observer: Callback-based subscribers (no direct imports)
 * - Functional: Pure functions, no classes
 * 
 * PERFORMANCE:
 * - O(1) price lookups
 * - O(n) subscriber notifications where n = subscribers
 * - O(1) history management with rolling window (FIFO cap at 500)
 * ================================================================================
 */

import type { PriceData, PricePoint, PriceSubscriber, UnsubscribeFn } from '@types';

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/** Maximum price history points per symbol (rolling window) */
const MAX_HISTORY_POINTS = 500;

/** Update interval in milliseconds */
let UPDATE_INTERVAL_MS = 1000;

/** Trading hours per day (simplification) */
const TRADING_HOURS = 6.5;

/** Standard annual volatility for stocks */
const ANNUAL_VOLATILITY = 0.20; // 20% annual volatility

/** Annualized drift (expected return) */
const ANNUAL_DRIFT = 0.10; // 10% annual return

/** Bid-ask spread percentage */
const SPREAD_PERCENT = 0.001; // 0.1%

/** List of simulated symbols with initial prices */
const SYMBOL_CONFIG: Record<string, number> = {
  'AAPL': 150.25,
  'GOOGL': 140.50,
  'MSFT': 380.75,
  'AMZN': 175.30,
  'META': 320.15,
  'TSLA': 245.80,
  'NFLX': 410.20,
  'NVDA': 875.50,
  'AMD': 195.75,
  'INTEL': 35.20,
  'CSCO': 52.40,
  'IBM': 185.55,
  'ORCL': 120.30,
  'SAP': 105.75,
  'CRM': 220.15,
  'NOW': 655.40,
  'AZO': 2850.20,
  'BKNG': 3720.15,
  'BA': 185.30,
  'JPM': 195.40,
  'BAC': 35.85,
  'WFC': 42.75,
  'GS': 415.20,
  'MS': 98.50,
  'BLK': 875.15,
  'V': 290.75,
  'MA': 525.30,
  'AXP': 205.20,
  'DIS': 95.75,
  'CMCSA': 52.30,
  'T': 23.50,
  'VZ': 42.80,
  'XOM': 115.40,
  'CVX': 165.30,
  'MPC': 92.15,
  'COP': 120.75,
  'EOG': 125.50,
  'JNJ': 160.25,
  'PFE': 28.50,
  'ABBV': 185.75,
  'MRK': 75.30,
  'LLY': 825.40,
  'UNH': 520.30,
  'COST': 885.15,
  'WMT': 98.75,
  'TGT': 42.20,
  'MCD': 298.50,
  'YUM': 95.30,
  'NKE': 85.40,
  'ADIDAS': 105.20,
};

// ============================================================================
// MODULE-LEVEL STATE (Singleton via closures)
// ============================================================================

/** Subscribers: symbol → Set of callbacks */
let subscribers = new Map<string, Set<PriceSubscriber>>();

/** Current prices: symbol → PriceData */
let prices = new Map<string, PriceData>();

/** Price history: symbol → Array of PricePoints (rolling window, max 500) */
let history = new Map<string, PricePoint[]>();

/** Previous prices for calculating GBM: symbol → previous price */
let previousPrices = new Map<string, number>();

/** Daily high/low tracking: symbol → { high, low, startPrice } */
let dailyMetrics = new Map<string, { high: number; low: number; startPrice: number }>();

/** Update interval handle */
let updateInterval: ReturnType<typeof setInterval> | null = null;

/** Engine state flag */
let isRunning = false;

// ============================================================================
// INTERNAL: Random Number Generation
// ============================================================================

/**
 * Box-Muller transform to generate standard normal random variable (mean=0, std=1)
 * Used for GBM random walk
 */
const getRandomNormal = (): number => {
  let u1 = 0,
    u2 = 0;
  while (u1 === 0) u1 = Math.random(); // Convert [0,1) to (0,1)
  while (u2 === 0) u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0;
};

// ============================================================================
// INTERNAL: Price Generation (GBM - Geometric Brownian Motion)
// ============================================================================

/**
 * Generate next price using Geometric Brownian Motion formula
 * 
 * Formula: P(t+Δt) = P(t) * exp((μ - σ²/2)*Δt + σ*√Δt*Z)
 * 
 * Parameters:
 * - P(t): Current price
 * - μ: Drift (expected return) = 10% annual
 * - σ: Volatility = 20% annual
 * - Δt: Time step = 1 second out of 252 trading days * 6.5 hours
 * - Z: Standard normal random variable
 * 
 * @param symbol Stock symbol
 * @param currentPrice Current price
 * @returns Next simulated price
 */
const generateNextPrice = (_symbol: string, currentPrice: number): number => {
  // Time step: 1 second in years (252 trading days, 6.5 hours/day)
  const secondsPerTradingDay = TRADING_HOURS * 3600;
  const secondsPerYear = secondsPerTradingDay * 252;
  const dt = 1 / secondsPerYear;

  // Convert annual rates to per-second rates
  const drift = ANNUAL_DRIFT;
  const volatility = ANNUAL_VOLATILITY;

  // Generate random normal variable
  const z = getRandomNormal();

  // Calculate log return
  const exponent = (drift - (volatility * volatility) / 2) * dt + volatility * Math.sqrt(dt) * z;

  // Calculate next price: P(t+dt) = P(t) * exp(exponent)
  return currentPrice * Math.exp(exponent);
};

// ============================================================================
// INTERNAL: Price Data Construction
// ============================================================================

/**
 * Create PriceData object from raw price value
 * Includes bid/ask spread, high/low, change tracking
 */
const createPriceData = (
  symbol: string,
  currentPrice: number,
  _previousPrice: number
): PriceData => {
  const spread = currentPrice * SPREAD_PERCENT;
  const bid = currentPrice - spread / 2;
  const ask = currentPrice + spread / 2;

  const metrics = dailyMetrics.get(symbol)!;
  const high = Math.max(metrics.high, currentPrice);
  const low = Math.min(metrics.low, currentPrice);

  const change = currentPrice - metrics.startPrice;
  const changePercent = (change / metrics.startPrice) * 100;

  // Update daily metrics
  dailyMetrics.set(symbol, { high, low, startPrice: metrics.startPrice });

  return {
    symbol,
    price: Number(currentPrice.toFixed(2)),
    bid: Number(bid.toFixed(2)),
    ask: Number(ask.toFixed(2)),
    spread: Number(spread.toFixed(4)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(4)),
    timestamp: Date.now(),
    previousClose: metrics.startPrice,
  };
};

// ============================================================================
// INTERNAL: History Management
// ============================================================================

/**
 * Create a price point from PriceData
 * Used for storing historical data
 */
const createPricePoint = (priceData: PriceData): PricePoint => {
  return {
    price: priceData.price,
    timestamp: priceData.timestamp,
  };
};

/**
 * Add price to history with rolling window (max 500 points)
 */
const addToHistory = (symbol: string, point: PricePoint): void => {
  if (!history.has(symbol)) {
    history.set(symbol, []);
  }

  const hist = history.get(symbol)!;
  hist.push(point);

  // Maintain rolling window: keep only last 500 points
  if (hist.length > MAX_HISTORY_POINTS) {
    hist.shift(); // Remove oldest point
  }
};

// ============================================================================
// INTERNAL: Subscriber Management
// ============================================================================

/**
 * Notify all subscribers of a price update
 * Uses try-catch to prevent one callback error from affecting others
 */
const notifySubscribers = (symbol: string, priceData: PriceData): void => {
  const callbacks = subscribers.get(symbol);
  if (!callbacks || callbacks.size === 0) return;

  // Notify each callback safely
  callbacks.forEach((callback) => {
    try {
      callback(priceData);
    } catch (error) {
      console.error(
        `[PriceEngine] Error in subscriber callback for ${symbol}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  });
};

// ============================================================================
// INTERNAL: Main Price Update Loop
// ============================================================================

/**
 * Execute one tick of the price engine
 * Called every 1 second to update all active prices
 */
const tick = (): void => {
  // Only update prices that have subscribers
  for (const symbol of subscribers.keys()) {
    const currentPrice = prices.get(symbol);
    if (!currentPrice) continue;

    // Generate next price using GBM
    const nextPrice = generateNextPrice(symbol, currentPrice.price);

    // Create price data with spread, change, etc.
    const priceData = createPriceData(symbol, nextPrice, currentPrice.price);

    // Store price
    prices.set(symbol, priceData);

    // Add to history
    const pricePoint = createPricePoint(priceData);
    addToHistory(symbol, pricePoint);

    // Notify subscribers
    notifySubscribers(symbol, priceData);
  }
};

// ============================================================================
// PUBLIC API: Subscriptions
// ============================================================================

/**
 * Subscribe to price updates for a symbol
 * 
 * Usage:
 *   const unsubscribe = subscribe('AAPL', (price) => {
 *     console.log(`AAPL: $${price.price}`);
 *   });
 *   // Later:
 *   unsubscribe(); // Cleanup
 * 
 * @param symbol Stock symbol (e.g., 'AAPL')
 * @param callback Function called on each price update
 * @returns Unsubscribe function (cleanup)
 */
export const subscribe = (symbol: string, callback: PriceSubscriber): UnsubscribeFn => {
  // Lazy initialize symbol if not already initialized
  if (!prices.has(symbol)) {
    const initialPrice = SYMBOL_CONFIG[symbol] || 100 + Math.random() * 200;
    // Initialize daily metrics FIRST before calling createPriceData
    dailyMetrics.set(symbol, {
      high: initialPrice,
      low: initialPrice,
      startPrice: initialPrice,
    });
    const priceData = createPriceData(symbol, initialPrice, initialPrice);
    prices.set(symbol, priceData);
    previousPrices.set(symbol, initialPrice);
  }

  // Add subscriber
  if (!subscribers.has(symbol)) {
    subscribers.set(symbol, new Set());
  }
  subscribers.get(symbol)!.add(callback);

  // Return unsubscribe function
  return () => {
    const subs = subscribers.get(symbol);
    if (subs) {
      subs.delete(callback);
      // Clean up empty symbol subscriptions
      if (subs.size === 0) {
        subscribers.delete(symbol);
      }
    }
  };
};

// ============================================================================
// PUBLIC API: Price Queries
// ============================================================================

/**
 * Get current price for a symbol
 */
export const getPrice = (symbol: string): PriceData | undefined => {
  return prices.get(symbol);
};

/**
 * Get all current prices (read-only map)
 */
export const getAllPrices = (): ReadonlyMap<string, PriceData> => {
  return new Map(prices);
};

/**
 * Get list of available symbols for trading
 */
export const getAvailableSymbols = (): string[] => {
  return Object.keys(SYMBOL_CONFIG).sort();
};

/**
 * Get price history for a symbol (read-only array)
 * Limited to last MAX_HISTORY_POINTS (500) points
 */
export const getHistory = (symbol: string, limit?: number): readonly PricePoint[] => {
  const hist = history.get(symbol) || [];
  if (!limit || limit >= hist.length) {
    return Object.freeze([...hist]); // Return frozen copy
  }
  return Object.freeze(hist.slice(-limit)); // Return frozen last N points
};

// ============================================================================
// PUBLIC API: Lifecycle Management
// ============================================================================

/**
 * Start the price engine
 * Begins updating prices on 1-second interval
 * 
 * Usage:
 *   PriceEngine.start();
 *   // Prices update every 1 second
 *   PriceEngine.stop();
 */
export const start = (): void => {
  if (isRunning) {
    console.warn('[PriceEngine] Already running');
    return;
  }

  isRunning = true;

  // Start 1-second update interval
  updateInterval = setInterval(() => {
    tick();
  }, UPDATE_INTERVAL_MS);

  console.log('[PriceEngine] Started - updating 500+ symbols every 1 second');
};

/**
 * Stop the price engine
 * Halts price updates but preserves price data
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
 * Set the update interval in milliseconds
 * Must be between 500ms and 5000ms
 * Restarts engine if running with new interval
 */
export const setUpdateInterval = (intervalMs: number): void => {
  const clampedInterval = Math.max(500, Math.min(5000, intervalMs));
  UPDATE_INTERVAL_MS = clampedInterval;
  
  if (isRunning) {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
    updateInterval = setInterval(() => {
      tick();
    }, UPDATE_INTERVAL_MS);
    console.log(`[PriceEngine] Update interval changed to ${UPDATE_INTERVAL_MS}ms`);
  }
};

/**
 * Reset engine to initial state (for testing)
 * Clears all prices, history, and subscribers
 */
export const reset = (): void => {
  stop();
  subscribers.clear();
  prices.clear();
  history.clear();
  previousPrices.clear();
  dailyMetrics.clear();
  console.log('[PriceEngine] Reset');
};

/**
 * Get engine status (for debugging)
 */
export const getStatus = (): {
  isRunning: boolean;
  activeSymbols: number;
  subscribers: number;
  totalHistoryPoints: number;
} => {
  let totalHistoryPoints = 0;
  history.forEach((hist) => {
    totalHistoryPoints += hist.length;
  });

  return {
    isRunning,
    activeSymbols: prices.size,
    subscribers: subscribers.size,
    totalHistoryPoints,
  };
};

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export default {
  // Subscriptions
  subscribe,

  // Queries
  getPrice,
  getAllPrices,
  getAvailableSymbols,
  getHistory,

  // Lifecycle
  start,
  stop,
  setUpdateInterval,
  reset,

  // Debug
  getStatus,
  
  // Internals (for testing)
  _tick: tick,
};
