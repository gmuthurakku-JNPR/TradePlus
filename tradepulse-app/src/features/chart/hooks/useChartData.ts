/**
 * ============================================================================
 * useChartData Hook - Subscribe to Price History
 * ============================================================================
 * 
 * Custom hook that provides real-time price history for charting.
 * 
 * FEATURES:
 * - Fetches initial history from PriceEngine
 * - Subscribes to live price updates
 * - Automatically appends new points to history
 * - Cleanup on unmount
 * - Loading and error states
 * 
 * PERFORMANCE:
 * - Memoized data processing
 * - Efficient array updates (spread operator optimized by V8)
 * - Max 500 points per symbol (managed by PriceEngine)
 * ============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import PriceEngine from '@engines/PriceEngine';
import type { PriceData, PricePoint } from '@types';

/**
 * Hook result interface
 */
export interface UseChartDataResult {
  /** Array of price points for charting */
  data: PricePoint[];
  
  /** Current (latest) price data */
  currentPrice: PriceData | null;
  
  /** Loading state (true until first data received) */
  isLoading: boolean;
  
  /** Error message if subscription failed */
  error: string | null;
  
  /** Manually refresh history (useful after engine restart) */
  refresh: () => void;
}

/**
 * ============================================================================
 * MAIN HOOK: useChartData
 * ============================================================================
 * 
 * Subscribes to price history for a given symbol.
 * 
 * Data Flow:
 *   1. On mount: Fetch existing history from PriceEngine
 *   2. Subscribe to live updates
 *   3. On each update: Append new point to local state
 *   4. On unmount: Unsubscribe
 * 
 * Usage:
 *   const { data, currentPrice, isLoading } = useChartData('AAPL');
 *   
 *   if (isLoading) return <Spinner />;
 *   return <Chart points={data} />;
 * 
 * Performance Notes:
 *   - History capped at 500 points by PriceEngine
 *   - Each update adds 1 point every 1 second
 *   - 500 points = ~8 minutes of history
 * ============================================================================
 */
export function useChartData(
  symbol: string,
  maxPoints: number = 500
): UseChartDataResult {
  // State
  const [data, setData] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load initial history from PriceEngine
   */
  const loadHistory = useCallback(() => {
    try {
      const history = PriceEngine.getHistory(symbol, maxPoints);
      setData([...history]); // Create new array to trigger re-render
      
      // Also get current price
      const price = PriceEngine.getPrice(symbol);
      if (price) {
        setCurrentPrice(price);
      }
      
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error(`[useChartData] Error loading history for ${symbol}:`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  }, [symbol, maxPoints]);

  /**
   * Handle price update from subscription
   */
  const handlePriceUpdate = useCallback((priceData: PriceData) => {
    try {
      // Update current price
      setCurrentPrice(priceData);
      
      // Create new price point
      const newPoint: PricePoint = {
        price: priceData.price,
        timestamp: priceData.timestamp,
      };
      
      // Append to history (with max limit)
      setData(prevData => {
        const updated = [...prevData, newPoint];
        
        // Keep only last maxPoints
        if (updated.length > maxPoints) {
          return updated.slice(-maxPoints);
        }
        
        return updated;
      });
      
      setIsLoading(false);
    } catch (err) {
      console.error(`[useChartData] Error handling price update for ${symbol}:`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [maxPoints, symbol]);

  /**
   * Setup subscription on mount
   */
  useEffect(() => {
    // Load initial history
    loadHistory();
    
    // Subscribe to live updates
    const unsubscribe = PriceEngine.subscribe(symbol, handlePriceUpdate);
    
    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [symbol, handlePriceUpdate, loadHistory]);

  /**
   * Public refresh function
   */
  const refresh = useCallback(() => {
    setIsLoading(true);
    loadHistory();
  }, [loadHistory]);

  return {
    data,
    currentPrice,
    isLoading,
    error,
    refresh,
  };
}

/**
 * ============================================================================
 * VARIANT: useChartDataSnapshot
 * ============================================================================
 * 
 * Get current history without subscribing to updates.
 * Useful for displaying static charts or exporting data.
 * 
 * Usage:
 *   const data = useChartDataSnapshot('AAPL');
 *   return <StaticChart points={data} />;
 * ============================================================================
 */
export function useChartDataSnapshot(symbol: string, maxPoints: number = 500): PricePoint[] {
  const [data, setData] = useState<PricePoint[]>([]);

  useEffect(() => {
    try {
      const history = PriceEngine.getHistory(symbol, maxPoints);
      setData([...history]);
    } catch (err) {
      console.error(`[useChartDataSnapshot] Error loading history for ${symbol}:`, err);
      setData([]);
    }
  }, [symbol, maxPoints]);

  return data;
}

/**
 * ============================================================================
 * VARIANT: useMultiChartData
 * ============================================================================
 * 
 * Subscribe to multiple symbols simultaneously (for comparison charts).
 * 
 * Usage:
 *   const data = useMultiChartData(['AAPL', 'GOOGL', 'MSFT']);
 *   // Returns: Map<symbol, PricePoint[]>
 * ============================================================================
 */
export function useMultiChartData(
  symbols: string[],
  maxPoints: number = 500
): Map<string, PricePoint[]> {
  const [dataMap, setDataMap] = useState<Map<string, PricePoint[]>>(new Map());

  /**
   * Load initial histories for all symbols
   */
  const loadHistories = useCallback(() => {
    const newMap = new Map<string, PricePoint[]>();
    
    for (const symbol of symbols) {
      try {
        const history = PriceEngine.getHistory(symbol, maxPoints);
        newMap.set(symbol, [...history]);
      } catch (err) {
        console.error(`[useMultiChartData] Error loading history for ${symbol}:`, err);
        newMap.set(symbol, []);
      }
    }
    
    setDataMap(newMap);
  }, [symbols, maxPoints]);

  /**
   * Create update handler for a specific symbol
   */
  const createUpdateHandler = useCallback((symbol: string) => {
    return (priceData: PriceData) => {
      const newPoint: PricePoint = {
        price: priceData.price,
        timestamp: priceData.timestamp,
      };
      
      setDataMap(prevMap => {
        const newMap = new Map(prevMap);
        const prevData = newMap.get(symbol) || [];
        const updated = [...prevData, newPoint];
        
        // Keep only last maxPoints
        if (updated.length > maxPoints) {
          newMap.set(symbol, updated.slice(-maxPoints));
        } else {
          newMap.set(symbol, updated);
        }
        
        return newMap;
      });
    };
  }, [maxPoints]);

  /**
   * Setup subscriptions for all symbols
   */
  useEffect(() => {
    // Load initial histories
    loadHistories();
    
    // Subscribe to each symbol
    const unsubscribers: Array<() => void> = [];
    
    for (const symbol of symbols) {
      const handler = createUpdateHandler(symbol);
      const unsubscribe = PriceEngine.subscribe(symbol, handler);
      unsubscribers.push(unsubscribe);
    }
    
    // Cleanup all subscriptions on unmount
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [symbols, createUpdateHandler, loadHistories]);

  return dataMap;
}

/**
 * ============================================================================
 * UTILITY: useChartDataRange
 * ============================================================================
 * 
 * Get price history for a specific time range.
 * Useful for displaying "last hour" or "last day" charts.
 * 
 * Usage:
 *   const data = useChartDataRange('AAPL', Date.now() - 3600000, Date.now());
 *   // Returns only points from last hour
 * ============================================================================
 */
export function useChartDataRange(
  symbol: string,
  startTime: number,
  endTime: number
): PricePoint[] {
  const { data } = useChartData(symbol);

  // Filter data by time range (memoized)
  const filteredData = useMemo(() => {
    return data.filter(point => 
      point.timestamp >= startTime && point.timestamp <= endTime
    );
  }, [data, startTime, endTime]);

  return filteredData;
}
