/**
 * ============================================================================
 * Storage Schema Definition
 * ============================================================================
 * 
 * Defines the structure and versioning for persisted application state.
 * 
 * Schema Design:
 * - Version-based: Each schema has a version for migration support
 * - Granular: Separate keys for each data type (portfolio, trades, orders)
 * - Typed: Full TypeScript type safety
 * - Extensible: Easy to add new data types
 * 
 * Storage Keys:
 * - tradepulse_app_version: Schema version
 * - tradepulse_portfolio: Portfolio data (cash, positions, P&L)
 * - tradepulse_trades: Trade history array
 * - tradepulse_orders: Limit orders (active + history)
 * - tradepulse_watchlist: Symbol watchlist
 * - tradepulse_preferences: User preferences
 * - tradepulse_metadata: App metadata (last saved, etc.)
 * 
 * Migration Strategy:
 * - Version field tracks schema changes
 * - Migrations applied sequentially on load
 * - Backward compatibility maintained where possible
 * 
 * ============================================================================
 */

import type { Portfolio, Trade, LimitOrder, Preferences } from '@types';

/**
 * Current schema version
 * Increment when schema changes require migration
 */
export const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * Storage key prefix (prevents collisions with other apps)
 */
export const STORAGE_PREFIX = 'tradepulse';

/**
 * Storage keys for each data type
 */
export const STORAGE_KEYS = {
  VERSION: `${STORAGE_PREFIX}_app_version`,
  PORTFOLIO: `${STORAGE_PREFIX}_portfolio`,
  TRADES: `${STORAGE_PREFIX}_trades`,
  ORDERS: `${STORAGE_PREFIX}_orders`,
  WATCHLIST: `${STORAGE_PREFIX}_watchlist`,
  PREFERENCES: `${STORAGE_PREFIX}_preferences`,
  METADATA: `${STORAGE_PREFIX}_metadata`,
} as const;

/**
 * Storage metadata (last saved, data integrity, etc.)
 */
export interface StorageMetadata {
  version: string;
  lastSaved: number;
  lastModified: number;
  saveCount: number;
  appVersion?: string;
}

/**
 * Complete application state (all persisted data)
 */
export interface AppState {
  version: string;
  portfolio: Portfolio;
  trades: Trade[];
  orders: LimitOrder[];
  watchlist: string[];
  preferences: Preferences;
  metadata: StorageMetadata;
}

/**
 * Storage operation result
 */
export interface StorageResult<T = void> {
  success: boolean;
  data?: T;
  error?: StorageError;
}

/**
 * Storage error types
 */
export type StorageErrorCode =
  | 'QUOTA_EXCEEDED'           // localStorage full
  | 'PARSE_ERROR'              // JSON parsing failed
  | 'VALIDATION_ERROR'         // Data validation failed
  | 'MIGRATION_ERROR'          // Schema migration failed
  | 'NOT_FOUND'                // Key not found
  | 'UNSUPPORTED_BROWSER'      // localStorage not available
  | 'PERMISSION_DENIED'        // Storage access denied
  | 'UNKNOWN_ERROR';           // Unknown error

/**
 * Storage error object
 */
export interface StorageError {
  code: StorageErrorCode;
  message: string;
  details?: unknown;
  timestamp: number;
}

/**
 * Default preferences
 */
export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  currency: 'USD',
  decimalPlaces: 2,
  chartTimeframe: '1h',
  language: 'en',
};

/**
 * Default portfolio state
 */
export const DEFAULT_PORTFOLIO: Portfolio = {
  cash: 100_000,
  positions: {},
  realizedPL: 0,
  initialCash: 100_000,
};

/**
 * Default metadata
 */
export const DEFAULT_METADATA: StorageMetadata = {
  version: CURRENT_SCHEMA_VERSION,
  lastSaved: Date.now(),
  lastModified: Date.now(),
  saveCount: 0,
};

/**
 * Default app state (clean slate)
 */
export const DEFAULT_APP_STATE: AppState = {
  version: CURRENT_SCHEMA_VERSION,
  portfolio: DEFAULT_PORTFOLIO,
  trades: [],
  orders: [],
  watchlist: [],
  preferences: DEFAULT_PREFERENCES,
  metadata: DEFAULT_METADATA,
};

/**
 * Type guard: Check if object is a valid Portfolio
 */
export const isValidPortfolio = (obj: unknown): obj is Portfolio => {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.cash === 'number' &&
    typeof p.positions === 'object' &&
    p.positions !== null &&
    typeof p.realizedPL === 'number' &&
    typeof p.initialCash === 'number'
  );
};

/**
 * Type guard: Check if object is a valid Trade
 */
export const isValidTrade = (obj: unknown): obj is Trade => {
  if (!obj || typeof obj !== 'object') return false;
  const t = obj as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.symbol === 'string' &&
    (t.type === 'BUY' || t.type === 'SELL') &&
    (t.orderType === 'MARKET' || t.orderType === 'LIMIT') &&
    typeof t.quantity === 'number' &&
    typeof t.executedPrice === 'number' &&
    typeof t.total === 'number' &&
    typeof t.executedAt === 'number' &&
    (t.status === 'executed' || t.status === 'failed')
  );
};

/**
 * Type guard: Check if object is a valid LimitOrder
 */
export const isValidOrder = (obj: unknown): obj is LimitOrder => {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.symbol === 'string' &&
    (o.type === 'BUY' || o.type === 'SELL') &&
    typeof o.limitPrice === 'number' &&
    typeof o.quantity === 'number' &&
    typeof o.createdAt === 'number' &&
    typeof o.status === 'string'
  );
};

/**
 * Type guard: Check if object is valid Preferences
 */
export const isValidPreferences = (obj: unknown): obj is Preferences => {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    (p.theme === 'light' || p.theme === 'dark') &&
    (p.currency === 'USD' || p.currency === 'EUR' || p.currency === 'GBP') &&
    typeof p.decimalPlaces === 'number' &&
    typeof p.chartTimeframe === 'string' &&
    typeof p.language === 'string'
  );
};

/**
 * Type guard: Check if array contains valid trades
 */
export const isValidTradeArray = (arr: unknown): arr is Trade[] => {
  return Array.isArray(arr) && arr.every(isValidTrade);
};

/**
 * Type guard: Check if array contains valid orders
 */
export const isValidOrderArray = (arr: unknown): arr is LimitOrder[] => {
  return Array.isArray(arr) && arr.every(isValidOrder);
};

/**
 * Type guard: Check if array is valid watchlist
 */
export const isValidWatchlist = (arr: unknown): arr is string[] => {
  return (
    Array.isArray(arr) &&
    arr.every((item) => typeof item === 'string' && item.length > 0)
  );
};

/**
 * Create storage error
 */
export const createStorageError = (
  code: StorageErrorCode,
  message: string,
  details?: unknown
): StorageError => ({
  code,
  message,
  details,
  timestamp: Date.now(),
});
