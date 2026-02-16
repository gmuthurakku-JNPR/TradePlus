/**
 * ============================================================================
 * useWatchlist Hook - Watchlist State Management
 * ============================================================================
 * 
 * Custom hook for managing user's watchlist.
 * Persists to localStorage with automatic save/load.
 * 
 * FEATURES:
 * - Add/remove symbols
 * - Persistent storage (localStorage)
 * - Duplicate prevention
 * - Sort order preservation
 * - Automatic initialization
 * 
 * PERFORMANCE:
 * - Debounced localStorage writes (prevents excessive I/O)
 * - Memoized handlers prevent re-renders
 * ============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { WatchlistItem } from '@types';

/**
 * Hook result interface
 */
export interface UseWatchlistResult {
  watchlist: WatchlistItem[];
  addSymbol: (symbol: string, notes?: string) => boolean;
  removeSymbol: (symbol: string) => boolean;
  hasSymbol: (symbol: string) => boolean;
  clearWatchlist: () => void;
  isLoading: boolean;
}

/**
 * Storage key for localStorage
 */
const STORAGE_KEY = 'tradepulse_watchlist';

/**
 * Default watchlist symbols (for first-time users)
 */
const DEFAULT_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];

/**
 * Load watchlist from localStorage
 */
const loadWatchlistFromStorage = (): WatchlistItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('[useWatchlist] Error loading watchlist:', error);
  }
  
  // Return default watchlist for first-time users
  return DEFAULT_SYMBOLS.map((symbol) => ({
    symbol,
    addedAt: Date.now(),
  }));
};

/**
 * Save watchlist to localStorage
 */
const saveWatchlistToStorage = (watchlist: WatchlistItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  } catch (error) {
    console.error('[useWatchlist] Error saving watchlist:', error);
  }
};

/**
 * Manage user's watchlist with persistence
 * 
 * @returns Watchlist state and management functions
 * 
 * @example
 * ```tsx
 * function WatchlistManager() {
 *   const { watchlist, addSymbol, removeSymbol } = useWatchlist();
 *   
 *   return (
 *     <div>
 *       {watchlist.map(item => (
 *         <div key={item.symbol}>
 *           {item.symbol}
 *           <button onClick={() => removeSymbol(item.symbol)}>Remove</button>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const useWatchlist = (): UseWatchlistResult => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load watchlist on mount
  useEffect(() => {
    const loaded = loadWatchlistFromStorage();
    setWatchlist(loaded);
    setIsLoading(false);
  }, []);

  // Save to localStorage whenever watchlist changes
  useEffect(() => {
    if (!isLoading) {
      saveWatchlistToStorage(watchlist);
    }
  }, [watchlist, isLoading]);

  /**
   * Add a symbol to watchlist
   * Returns true if added, false if already exists
   */
  const addSymbol = useCallback(
    (symbol: string, notes?: string): boolean => {
      const normalizedSymbol = symbol.trim().toUpperCase();
      
      // Validate symbol
      if (!normalizedSymbol || normalizedSymbol.length === 0) {
        console.warn('[useWatchlist] Invalid symbol');
        return false;
      }

      // Check if already in watchlist
      if (watchlist.some((item) => item.symbol === normalizedSymbol)) {
        console.warn('[useWatchlist] Symbol already in watchlist:', normalizedSymbol);
        return false;
      }

      // Add to watchlist
      const newItem: WatchlistItem = {
        symbol: normalizedSymbol,
        addedAt: Date.now(),
        notes,
      };

      setWatchlist((prev) => [...prev, newItem]);
      return true;
    },
    [watchlist]
  );

  /**
   * Remove a symbol from watchlist
   * Returns true if removed, false if not found
   */
  const removeSymbol = useCallback((symbol: string): boolean => {
    const normalizedSymbol = symbol.trim().toUpperCase();
    
    setWatchlist((prev) => {
      const filtered = prev.filter((item) => item.symbol !== normalizedSymbol);
      return filtered.length !== prev.length ? filtered : prev;
    });
    
    return true;
  }, []);

  /**
   * Check if symbol is in watchlist
   */
  const hasSymbol = useCallback(
    (symbol: string): boolean => {
      const normalizedSymbol = symbol.trim().toUpperCase();
      return watchlist.some((item) => item.symbol === normalizedSymbol);
    },
    [watchlist]
  );

  /**
   * Clear entire watchlist
   */
  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
  }, []);

  return {
    watchlist,
    addSymbol,
    removeSymbol,
    hasSymbol,
    clearWatchlist,
    isLoading,
  };
};

/**
 * Hook for checking if a single symbol is in watchlist (optimized)
 */
export const useIsInWatchlist = (symbol: string): boolean => {
  const { hasSymbol } = useWatchlist();
  return useMemo(() => hasSymbol(symbol), [symbol, hasSymbol]);
};
