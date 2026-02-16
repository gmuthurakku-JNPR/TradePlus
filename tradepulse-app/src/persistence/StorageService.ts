/**
 * ============================================================================
 * Storage Service
 * ============================================================================
 * 
 * Abstraction layer over localStorage with:
 * - Type-safe save/load operations
 * - Automatic JSON serialization with error handling
 * - Storage quota management
 * - Data validation
 * - Compression support (future)
 * - Migration coordination
 * 
 * Design Pattern: Service Layer
 * - Encapsulates all localStorage access
 * - Provides clean API for engines and components
 * - Handles errors gracefully
 * - Ensures data integrity
 * 
 * Error Handling:
 * - QuotaExceededError → QUOTA_EXCEEDED
 * - SyntaxError → PARSE_ERROR
 * - SecurityError → PERMISSION_DENIED
 * - null storage → UNSUPPORTED_BROWSER
 * 
 * Performance:
 * - Caches availability check
 * - Lazy validation (only on load)
 * - Batch operations where possible
 * 
 * ============================================================================
 */

import type { Portfolio, Trade, LimitOrder, Preferences } from '@types';
import {
  STORAGE_KEYS,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_PORTFOLIO,
  DEFAULT_PREFERENCES,
  DEFAULT_METADATA,
  isValidPortfolio,
  isValidTradeArray,
  isValidOrderArray,
  isValidWatchlist,
  isValidPreferences,
  createStorageError,
  type AppState,
  type StorageResult,
  type StorageMetadata,
} from './schema/storageSchema';

/**
 * Storage availability cache
 */
let isAvailableCache: boolean | null = null;

/**
 * ============================================================================
 * STORAGE AVAILABILITY CHECK
 * ============================================================================
 */

/**
 * Check if localStorage is available
 * Caches result to avoid repeated checks
 */
export const isStorageAvailable = (): boolean => {
  // Return cached result if available
  if (isAvailableCache !== null) {
    return isAvailableCache;
  }

  // Test localStorage
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    isAvailableCache = true;
    return true;
  } catch {
    isAvailableCache = false;
    return false;
  }
};

/**
 * ============================================================================
 * LOW-LEVEL OPERATIONS
 * ============================================================================
 */

/**
 * Save data to localStorage with error handling
 * 
 * @param key Storage key
 * @param data Data to save (will be JSON serialized)
 * @returns Result with success/error
 */
export const saveItem = <T>(key: string, data: T): StorageResult => {
  try {
    // Check availability
    if (!isStorageAvailable()) {
      return {
        success: false,
        error: createStorageError(
          'UNSUPPORTED_BROWSER',
          'localStorage is not available in this browser'
        ),
      };
    }

    // Serialize to JSON
    const json = JSON.stringify(data);

    // Save to storage
    localStorage.setItem(key, json);

    return { success: true };
  } catch (error) {
    // Handle quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return {
        success: false,
        error: createStorageError(
          'QUOTA_EXCEEDED',
          'Storage quota exceeded. Please clear some data.',
          error
        ),
      };
    }

    // Handle permission denied
    if (error instanceof DOMException && error.name === 'SecurityError') {
      return {
        success: false,
        error: createStorageError(
          'PERMISSION_DENIED',
          'Storage access denied. Check browser permissions.',
          error
        ),
      };
    }

    // Unknown error
    return {
      success: false,
      error: createStorageError('UNKNOWN_ERROR', 'Failed to save data', error),
    };
  }
};

/**
 * Load data from localStorage with validation
 * 
 * @param key Storage key
 * @param validator Optional type guard for validation
 * @returns Result with data or error
 */
export const loadItem = <T>(
  key: string,
  validator?: (data: unknown) => data is T
): StorageResult<T> => {
  try {
    // Check availability
    if (!isStorageAvailable()) {
      return {
        success: false,
        error: createStorageError(
          'UNSUPPORTED_BROWSER',
          'localStorage is not available in this browser'
        ),
      };
    }

    // Load from storage
    const json = localStorage.getItem(key);

    // Handle not found
    if (json === null) {
      return {
        success: false,
        error: createStorageError('NOT_FOUND', `Key not found: ${key}`),
      };
    }

    // Parse JSON
    const data = JSON.parse(json) as unknown;

    // Validate if validator provided
    if (validator && !validator(data)) {
      return {
        success: false,
        error: createStorageError(
          'VALIDATION_ERROR',
          `Data validation failed for key: ${key}`
        ),
      };
    }

    return { success: true, data: data as T };
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: createStorageError(
          'PARSE_ERROR',
          'Failed to parse stored data',
          error
        ),
      };
    }

    // Unknown error
    return {
      success: false,
      error: createStorageError('UNKNOWN_ERROR', 'Failed to load data', error),
    };
  }
};

/**
 * Remove item from localStorage
 */
export const removeItem = (key: string): StorageResult => {
  try {
    if (!isStorageAvailable()) {
      return {
        success: false,
        error: createStorageError(
          'UNSUPPORTED_BROWSER',
          'localStorage is not available'
        ),
      };
    }

    localStorage.removeItem(key);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: createStorageError('UNKNOWN_ERROR', 'Failed to remove item', error),
    };
  }
};

/**
 * ============================================================================
 * HIGH-LEVEL DATA OPERATIONS
 * ============================================================================
 */

/**
 * Save portfolio to storage
 */
export const savePortfolio = (portfolio: Portfolio): StorageResult => {
  return saveItem(STORAGE_KEYS.PORTFOLIO, portfolio);
};

/**
 * Load portfolio from storage
 */
export const loadPortfolio = (): StorageResult<Portfolio> => {
  const result = loadItem<Portfolio>(STORAGE_KEYS.PORTFOLIO, isValidPortfolio);

  // Return default if not found
  if (!result.success && result.error?.code === 'NOT_FOUND') {
    return {
      success: true,
      data: DEFAULT_PORTFOLIO,
    };
  }

  return result;
};

/**
 * Save trade history to storage
 */
export const saveTrades = (trades: Trade[]): StorageResult => {
  return saveItem(STORAGE_KEYS.TRADES, trades);
};

/**
 * Load trade history from storage
 */
export const loadTrades = (): StorageResult<Trade[]> => {
  const result = loadItem<Trade[]>(STORAGE_KEYS.TRADES, isValidTradeArray);

  // Return empty array if not found
  if (!result.success && result.error?.code === 'NOT_FOUND') {
    return {
      success: true,
      data: [],
    };
  }

  return result;
};

/**
 * Save orders to storage
 */
export const saveOrders = (orders: LimitOrder[]): StorageResult => {
  return saveItem(STORAGE_KEYS.ORDERS, orders);
};

/**
 * Load orders from storage
 */
export const loadOrders = (): StorageResult<LimitOrder[]> => {
  const result = loadItem<LimitOrder[]>(STORAGE_KEYS.ORDERS, isValidOrderArray);

  // Return empty array if not found
  if (!result.success && result.error?.code === 'NOT_FOUND') {
    return {
      success: true,
      data: [],
    };
  }

  return result;
};

/**
 * Save watchlist to storage
 */
export const saveWatchlist = (watchlist: string[]): StorageResult => {
  return saveItem(STORAGE_KEYS.WATCHLIST, watchlist);
};

/**
 * Load watchlist from storage
 */
export const loadWatchlist = (): StorageResult<string[]> => {
  const result = loadItem<string[]>(STORAGE_KEYS.WATCHLIST, isValidWatchlist);

  // Return empty array if not found
  if (!result.success && result.error?.code === 'NOT_FOUND') {
    return {
      success: true,
      data: [],
    };
  }

  return result;
};

/**
 * Save preferences to storage
 */
export const savePreferences = (preferences: Preferences): StorageResult => {
  return saveItem(STORAGE_KEYS.PREFERENCES, preferences);
};

/**
 * Load preferences from storage
 */
export const loadPreferences = (): StorageResult<Preferences> => {
  const result = loadItem<Preferences>(
    STORAGE_KEYS.PREFERENCES,
    isValidPreferences
  );

  // Return defaults if not found
  if (!result.success && result.error?.code === 'NOT_FOUND') {
    return {
      success: true,
      data: DEFAULT_PREFERENCES,
    };
  }

  return result;
};

/**
 * Save metadata to storage
 */
export const saveMetadata = (metadata: StorageMetadata): StorageResult => {
  return saveItem(STORAGE_KEYS.METADATA, metadata);
};

/**
 * Load metadata from storage
 */
export const loadMetadata = (): StorageResult<StorageMetadata> => {
  const result = loadItem<StorageMetadata>(STORAGE_KEYS.METADATA);

  // Return defaults if not found
  if (!result.success && result.error?.code === 'NOT_FOUND') {
    return {
      success: true,
      data: DEFAULT_METADATA,
    };
  }

  return result;
};

/**
 * ============================================================================
 * BATCH OPERATIONS
 * ============================================================================
 */

/**
 * Save complete app state
 */
export const saveAppState = (state: AppState): StorageResult => {
  const results = [
    saveItem(STORAGE_KEYS.VERSION, state.version),
    savePortfolio(state.portfolio),
    saveTrades(state.trades),
    saveOrders(state.orders),
    saveWatchlist(state.watchlist),
    savePreferences(state.preferences),
    saveMetadata({
      ...state.metadata,
      lastSaved: Date.now(),
      saveCount: state.metadata.saveCount + 1,
    }),
  ];

  // Check if any failed
  const failed = results.find((r) => !r.success);
  if (failed) {
    return failed;
  }

  return { success: true };
};

/**
 * Load complete app state
 */
export const loadAppState = (): StorageResult<AppState> => {
  try {
    // Load version first
    const versionResult = loadItem<string>(STORAGE_KEYS.VERSION);
    const version = versionResult.success
      ? versionResult.data!
      : CURRENT_SCHEMA_VERSION;

    // Load all data
    const portfolioResult = loadPortfolio();
    const tradesResult = loadTrades();
    const ordersResult = loadOrders();
    const watchlistResult = loadWatchlist();
    const preferencesResult = loadPreferences();
    const metadataResult = loadMetadata();

    // Check for errors (excluding NOT_FOUND)
    const hasError =
      (!portfolioResult.success && portfolioResult.error?.code !== 'NOT_FOUND') ||
      (!tradesResult.success && tradesResult.error?.code !== 'NOT_FOUND') ||
      (!ordersResult.success && ordersResult.error?.code !== 'NOT_FOUND') ||
      (!watchlistResult.success && watchlistResult.error?.code !== 'NOT_FOUND') ||
      (!preferencesResult.success &&
        preferencesResult.error?.code !== 'NOT_FOUND') ||
      (!metadataResult.success && metadataResult.error?.code !== 'NOT_FOUND');

    if (hasError) {
      // Return first error found
      const error =
        portfolioResult.error ||
        tradesResult.error ||
        ordersResult.error ||
        watchlistResult.error ||
        preferencesResult.error ||
        metadataResult.error;

      return {
        success: false,
        error: error!,
      };
    }

    // Assemble app state
    const appState: AppState = {
      version,
      portfolio: portfolioResult.data || DEFAULT_PORTFOLIO,
      trades: tradesResult.data || [],
      orders: ordersResult.data || [],
      watchlist: watchlistResult.data || [],
      preferences: preferencesResult.data || DEFAULT_PREFERENCES,
      metadata: metadataResult.data || DEFAULT_METADATA,
    };

    return {
      success: true,
      data: appState,
    };
  } catch (error) {
    return {
      success: false,
      error: createStorageError(
        'UNKNOWN_ERROR',
        'Failed to load app state',
        error
      ),
    };
  }
};

/**
 * ============================================================================
 * UTILITY OPERATIONS
 * ============================================================================
 */

/**
 * Clear all storage data
 */
export const clearAllData = (): StorageResult => {
  try {
    if (!isStorageAvailable()) {
      return {
        success: false,
        error: createStorageError(
          'UNSUPPORTED_BROWSER',
          'localStorage is not available'
        ),
      };
    }

    // Remove all TradePulse keys
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key as string);
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: createStorageError('UNKNOWN_ERROR', 'Failed to clear data', error),
    };
  }
};

/**
 * Get storage usage info
 */
export const getStorageInfo = (): {
  used: number;
  available: boolean;
  keys: string[];
} => {
  if (!isStorageAvailable()) {
    return { used: 0, available: false, keys: [] };
  }

  let totalSize = 0;
  const keys: string[] = [];

  Object.values(STORAGE_KEYS).forEach((key) => {
    const value = localStorage.getItem(key as string);
    if (value) {
      keys.push(key as string);
      totalSize += value.length;
    }
  });

  return {
    used: totalSize,
    available: true,
    keys,
  };
};

/**
 * Export all data as JSON (for backup)
 */
export const exportData = (): string | null => {
  const result = loadAppState();
  if (!result.success || !result.data) {
    return null;
  }

  return JSON.stringify(result.data, null, 2);
};

/**
 * Import data from JSON (for restore)
 */
export const importData = (json: string): StorageResult => {
  try {
    const data = JSON.parse(json) as AppState;
    return saveAppState(data);
  } catch (error) {
    return {
      success: false,
      error: createStorageError(
        'PARSE_ERROR',
        'Failed to parse import data',
        error
      ),
    };
  }
};

/**
 * Public API
 */
export default {
  // Availability
  isStorageAvailable,

  // Low-level operations
  saveItem,
  loadItem,
  removeItem,

  // High-level operations
  savePortfolio,
  loadPortfolio,
  saveTrades,
  loadTrades,
  saveOrders,
  loadOrders,
  saveWatchlist,
  loadWatchlist,
  savePreferences,
  loadPreferences,
  saveMetadata,
  loadMetadata,

  // Batch operations
  saveAppState,
  loadAppState,

  // Utility operations
  clearAllData,
  getStorageInfo,
  exportData,
  importData,
};
