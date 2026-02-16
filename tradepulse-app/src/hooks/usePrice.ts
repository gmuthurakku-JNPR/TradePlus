/**
 * ============================================================================
 * usePrice Hook - Subscribe to Real-Time Price Updates
 * ============================================================================
 * 
 * Custom hook that subscribes to PriceEngine for a single symbol.
 * Optimized for performance with automatic cleanup.
 * 
 * FEATURES:
 * - Automatic subscription on mount
 * - Automatic unsubscribe on unmount
 * - Loading state management
 * - Error handling
 * - Re-subscription on symbol change
 * 
 * PERFORMANCE:
 * - No unnecessary re-renders (only on price updates)
 * - Proper cleanup prevents memory leaks
 * - Memoized subscription callback
 * ============================================================================
 */

import { useEffect, useState, useCallback } from 'react';
import PriceEngine from '@engines/PriceEngine';
import type { PriceData } from '@types';

/**
 * Hook result interface
 */
interface UsePriceResult {
  price: PriceData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Subscribe to real-time price updates for a symbol
 * 
 * @param symbol Stock symbol (e.g., 'AAPL')
 * @returns Price data, loading state, and error
 * 
 * @example
 * ```tsx
 * function PriceDisplay({ symbol }: { symbol: string }) {
 *   const { price, isLoading, error } = usePrice(symbol);
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   
 *   return <div>${price?.price.toFixed(2)}</div>;
 * }
 * ```
 */
export const usePrice = (symbol: string): UsePriceResult => {
  const [price, setPrice] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoize callback to prevent re-subscription on every render
  const handlePriceUpdate = useCallback(
    (priceData: PriceData) => {
      try {
        setPrice(priceData);
        setIsLoading(false);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
      }
    },
    [] // No dependencies - stable callback
  );

  useEffect(() => {
    // Reset state when symbol changes
    setIsLoading(true);
    setError(null);

    // Check if symbol is valid
    if (!symbol || typeof symbol !== 'string') {
      setError(new Error('Invalid symbol'));
      setIsLoading(false);
      return;
    }

    // Subscribe to price updates
    const unsubscribe = PriceEngine.subscribe(symbol, handlePriceUpdate);

    // Get initial price immediately if available
    const initialPrice = PriceEngine.getPrice(symbol);
    if (initialPrice) {
      setPrice(initialPrice);
      setIsLoading(false);
    }

    // Cleanup: unsubscribe on unmount or symbol change
    return () => {
      unsubscribe();
    };
  }, [symbol, handlePriceUpdate]);

  return { price, isLoading, error };
};

/**
 * Hook for getting price without real-time updates (snapshot)
 * Useful for one-time price checks without subscription overhead
 */
export const usePriceSnapshot = (symbol: string): PriceData | null => {
  const [price, setPrice] = useState<PriceData | null>(null);

  useEffect(() => {
    const currentPrice = PriceEngine.getPrice(symbol);
    setPrice(currentPrice || null);
  }, [symbol]);

  return price;
};
