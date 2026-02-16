/**
 * ============================================================================
 * Portfolio Hooks
 * ============================================================================
 * 
 * Custom React hooks for portfolio data management:
 * - usePortfolio: Get portfolio data with live price updates
 * - usePortfolioMetrics: Calculate portfolio metrics
 * - useTradeHistory: Get trade history
 * 
 * Features:
 * - Real-time price subscriptions
 * - Automatic P&L calculations
 * - Memoized computations
 * - Optimized re-renders
 * ============================================================================
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Portfolio, PortfolioMetrics, Trade, PriceData, Position } from '@types';
import TradeEngine from '@engines/TradeEngine';
import PriceEngine from '@engines/PriceEngine';

/**
 * Hook for portfolio data with live price updates
 * 
 * Subscribes to price updates for all positions and recalculates
 * unrealized P&L in real-time.
 * 
 * @returns Portfolio data with live prices
 */
export const usePortfolio = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load initial portfolio
  useEffect(() => {
    const loadPortfolio = () => {
      const data = TradeEngine.getPortfolio();
      setPortfolio(data);
      setIsLoading(false);
    };

    loadPortfolio();
  }, []);

  // Subscribe to price updates for all positions
  useEffect(() => {
    if (!portfolio) return;

    const symbols = Object.keys(portfolio.positions);
    if (symbols.length === 0) return;

    const unsubscribers: Array<() => void> = [];

    // Subscribe to each symbol
    symbols.forEach((symbol) => {
      const unsubscribe = PriceEngine.subscribe(symbol, (priceData: PriceData) => {
        setPrices((prev) => ({
          ...prev,
          [symbol]: priceData,
        }));
      });

      unsubscribers.push(unsubscribe);
    });

    // Cleanup subscriptions
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [portfolio?.positions]);

  // Refresh portfolio data (for after trades)
  const refresh = useCallback(() => {
    const data = TradeEngine.getPortfolio();
    setPortfolio(data);
  }, []);

  return {
    portfolio,
    prices,
    isLoading,
    refresh,
  };
};

/**
 * Calculate portfolio metrics with live prices
 * 
 * @param portfolio Portfolio data
 * @param prices Current prices for positions
 * @returns Portfolio metrics
 */
export const usePortfolioMetrics = (
  portfolio: Portfolio | null,
  prices: Record<string, PriceData>
): PortfolioMetrics | null => {
  return useMemo(() => {
    if (!portfolio) return null;

    // Calculate total invested (cost basis)
    let totalInvested = 0;
    let currentValue = 0;

    Object.entries(portfolio.positions).forEach(([symbol, position]) => {
      const invested = position.shares * position.avgCost;
      totalInvested += invested;

      const currentPrice = prices[symbol]?.price || position.avgCost;
      currentValue += position.shares * currentPrice;
    });

    // Add cash to current value
    const totalValue = currentValue + portfolio.cash;

    // Calculate unrealized P&L
    const unrealizedPL = currentValue - totalInvested;
    const unrealizedPLPercent =
      totalInvested > 0 ? unrealizedPL / totalInvested : 0;

    // Total P&L (realized + unrealized)
    const totalPL = portfolio.realizedPL + unrealizedPL;
    const totalPLPercent =
      portfolio.initialCash > 0 ? totalPL / portfolio.initialCash : 0;

    // Cash percentage
    const cashPercent = totalValue > 0 ? portfolio.cash / totalValue : 1;

    return {
      totalValue,
      totalInvested,
      totalPL,
      totalPLPercent,
      unrealizedPL,
      unrealizedPLPercent,
      realizedPL: portfolio.realizedPL,
      cashPercent,
    };
  }, [portfolio, prices]);
};

/**
 * Calculate position metrics with live price
 * 
 * @param position Position data
 * @param currentPrice Current market price
 * @returns Position metrics
 */
export interface PositionMetrics {
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

export const usePositionMetrics = (
  position: Position,
  priceData: PriceData | undefined
): PositionMetrics => {
  return useMemo(() => {
    const currentPrice = priceData?.price || position.avgCost;
    const marketValue = position.shares * currentPrice;
    const costBasis = position.shares * position.avgCost;
    const unrealizedPL = marketValue - costBasis;
    const unrealizedPLPercent = costBasis > 0 ? unrealizedPL / costBasis : 0;

    const dayChange = priceData?.change || 0;
    const dayChangePercent = priceData?.changePercent || 0;

    return {
      symbol: position.symbol,
      shares: position.shares,
      avgCost: position.avgCost,
      currentPrice,
      marketValue,
      costBasis,
      unrealizedPL,
      unrealizedPLPercent,
      dayChange: dayChange * position.shares,
      dayChangePercent: dayChangePercent / 100,
    };
  }, [position, priceData]);
};

/**
 * Hook for trade history
 * 
 * @param limit Maximum number of trades to return
 * @returns Trade history
 */
export const useTradeHistory = (limit?: number) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTrades = () => {
      const history = TradeEngine.getTradeHistory();
      const sorted = [...history].reverse(); // Most recent first
      setTrades(limit ? sorted.slice(0, limit) : sorted);
      setIsLoading(false);
    };

    loadTrades();
  }, [limit]);

  // Refresh trade history
  const refresh = useCallback(() => {
    const history = TradeEngine.getTradeHistory();
    const sorted = [...history].reverse();
    setTrades(limit ? sorted.slice(0, limit) : sorted);
  }, [limit]);

  return {
    trades,
    isLoading,
    refresh,
  };
};

/**
 * Aggregate trades by symbol for summary view
 */
export interface TradesBySymbol {
  symbol: string;
  totalBought: number;
  totalSold: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  netShares: number;
  realizedPL: number;
  tradeCount: number;
}

export const useTradesBySymbol = (): Record<string, TradesBySymbol> => {
  const { trades } = useTradeHistory();

  return useMemo(() => {
    const bySymbol: Record<string, TradesBySymbol> = {};

    trades.forEach((trade) => {
      if (!bySymbol[trade.symbol]) {
        bySymbol[trade.symbol] = {
          symbol: trade.symbol,
          totalBought: 0,
          totalSold: 0,
          avgBuyPrice: 0,
          avgSellPrice: 0,
          netShares: 0,
          realizedPL: 0,
          tradeCount: 0,
        };
      }

      const summary = bySymbol[trade.symbol];
      summary.tradeCount++;

      if (trade.type === 'BUY') {
        summary.totalBought += trade.quantity;
        summary.avgBuyPrice =
          (summary.avgBuyPrice * (summary.totalBought - trade.quantity) +
            trade.executedPrice * trade.quantity) /
          summary.totalBought;
        summary.netShares += trade.quantity;
      } else {
        summary.totalSold += trade.quantity;
        summary.avgSellPrice =
          (summary.avgSellPrice * (summary.totalSold - trade.quantity) +
            trade.executedPrice * trade.quantity) /
          summary.totalSold;
        summary.netShares -= trade.quantity;
      }
    });

    return bySymbol;
  }, [trades]);
};

export default {
  usePortfolio,
  usePortfolioMetrics,
  usePositionMetrics,
  useTradeHistory,
  useTradesBySymbol,
};
