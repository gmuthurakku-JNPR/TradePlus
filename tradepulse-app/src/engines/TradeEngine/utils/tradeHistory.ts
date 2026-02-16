/**
 * ============================================================================
 * Trade History Manager
 * ============================================================================
 * 
 * Manages trade history and ID generation.
 * 
 * RESPONSIBILITIES:
 * - Generate unique trade IDs
 * - Record executed trades
 * - Query trade history
 * - Calculate metrics from trade history
 * 
 * ID FORMAT:
 *   T-{timestamp}-{random}
 *   Example: T-1705123456789-a7b3
 * ============================================================================
 */

import type { Trade } from '@types';

/**
 * ============================================================================
 * TRADE ID GENERATION
 * ============================================================================
 * 
 * Generate unique trade ID with format: T-{timestamp}-{random}
 * 
 * Components:
 *   T - Prefix (Trade)
 *   timestamp - Milliseconds since epoch
 *   random - 4-character random hex string
 * 
 * Example:
 *   T-1705123456789-a7b3
 * 
 * Uniqueness:
 *   - Timestamp ensures temporal ordering
 *   - Random suffix prevents collisions (<0.001% at 1000 trades/sec)
 * ============================================================================
 */
export function generateTradeId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  return `T-${timestamp}-${random}`;
}

/**
 * ============================================================================
 * TRADE HISTORY QUERIES
 * ============================================================================
 */

/**
 * Get recent trades (most recent first)
 */
export function getRecentTrades(
  trades: Trade[],
  limit: number = 10
): Trade[] {
  return trades
    .slice()
    .sort((a, b) => b.executedAt - a.executedAt)
    .slice(0, limit);
}

/**
 * Get trades for specific symbol
 */
export function getTradesBySymbol(
  trades: Trade[],
  symbol: string
): Trade[] {
  return trades
    .filter(t => t.symbol === symbol)
    .sort((a, b) => b.executedAt - a.executedAt);
}

/**
 * Get trades by type (BUY or SELL)
 */
export function getTradesByType(
  trades: Trade[],
  type: 'BUY' | 'SELL'
): Trade[] {
  return trades
    .filter(t => t.type === type)
    .sort((a, b) => b.executedAt - a.executedAt);
}

/**
 * Get trades in date range
 */
export function getTradesInRange(
  trades: Trade[],
  startTime: number,
  endTime: number
): Trade[] {
  return trades
    .filter(t => t.executedAt >= startTime && t.executedAt <= endTime)
    .sort((a, b) => b.executedAt - a.executedAt);
}

/**
 * Get failed trades
 */
export function getFailedTrades(
  trades: Trade[]
): Trade[] {
  return trades
    .filter(t => t.status === 'failed')
    .sort((a, b) => b.executedAt - a.executedAt);
}

/**
 * ============================================================================
 * TRADE HISTORY METRICS
 * ============================================================================
 */

export interface TradeHistoryMetrics {
  totalTrades: number;
  totalBuys: number;
  totalSells: number;
  totalFailed: number;
  totalVolume: number;
  successRate: number;
  symbols: string[];
  uniqueSymbols: number;
}

/**
 * Calculate metrics from trade history
 */
export function calculateTradeMetrics(trades: Trade[]): TradeHistoryMetrics {
  const totalTrades = trades.length;
  const totalBuys = trades.filter(t => t.type === 'BUY' && t.status === 'executed').length;
  const totalSells = trades.filter(t => t.type === 'SELL' && t.status === 'executed').length;
  const totalFailed = trades.filter(t => t.status === 'failed').length;
  
  const totalVolume = trades
    .filter(t => t.status === 'executed')
    .reduce((sum, t) => sum + t.total, 0);
  
  const successRate = totalTrades > 0
    ? ((totalTrades - totalFailed) / totalTrades) * 100
    : 100;
  
  const symbolSet = new Set(trades.map(t => t.symbol));
  const symbols = Array.from(symbolSet).sort();
  
  return {
    totalTrades,
    totalBuys,
    totalSells,
    totalFailed,
    totalVolume,
    successRate,
    symbols,
    uniqueSymbols: symbols.length,
  };
}

/**
 * ============================================================================
 * TRADE SUMMARY BY SYMBOL
 * ============================================================================
 */

export interface SymbolTradeSummary {
  symbol: string;
  totalTrades: number;
  totalBuys: number;
  totalSells: number;
  totalBuyVolume: number;
  totalSellVolume: number;
  netShares: number; // buys - sells
  avgBuyPrice: number;
  avgSellPrice: number;
}

/**
 * Calculate trade summary for each symbol
 */
export function calculateSymbolSummaries(trades: Trade[]): SymbolTradeSummary[] {
  const symbolMap = new Map<string, SymbolTradeSummary>();
  
  for (const trade of trades) {
    if (trade.status !== 'executed') continue;
    
    if (!symbolMap.has(trade.symbol)) {
      symbolMap.set(trade.symbol, {
        symbol: trade.symbol,
        totalTrades: 0,
        totalBuys: 0,
        totalSells: 0,
        totalBuyVolume: 0,
        totalSellVolume: 0,
        netShares: 0,
        avgBuyPrice: 0,
        avgSellPrice: 0,
      });
    }
    
    const summary = symbolMap.get(trade.symbol)!;
    summary.totalTrades++;
    
    if (trade.type === 'BUY') {
      summary.totalBuys++;
      summary.totalBuyVolume += trade.total;
      summary.netShares += trade.quantity;
    } else {
      summary.totalSells++;
      summary.totalSellVolume += trade.total;
      summary.netShares -= trade.quantity;
    }
  }
  
  // Calculate average prices
  for (const summary of symbolMap.values()) {
    if (summary.totalBuys > 0) {
      const buyTrades = trades.filter(t => 
        t.symbol === summary.symbol && 
        t.type === 'BUY' && 
        t.status === 'executed'
      );
      const totalBuyShares = buyTrades.reduce((sum, t) => sum + t.quantity, 0);
      summary.avgBuyPrice = totalBuyShares > 0 
        ? summary.totalBuyVolume / totalBuyShares 
        : 0;
    }
    
    if (summary.totalSells > 0) {
      const sellTrades = trades.filter(t => 
        t.symbol === summary.symbol && 
        t.type === 'SELL' && 
        t.status === 'executed'
      );
      const totalSellShares = sellTrades.reduce((sum, t) => sum + t.quantity, 0);
      summary.avgSellPrice = totalSellShares > 0 
        ? summary.totalSellVolume / totalSellShares 
        : 0;
    }
  }
  
  return Array.from(symbolMap.values()).sort((a, b) => 
    b.totalTrades - a.totalTrades
  );
}

/**
 * ============================================================================
 * TRADE VALIDATION
 * ============================================================================
 */

/**
 * Check if trade is valid
 */
export function isValidTrade(trade: Trade): boolean {
  return Boolean(
    trade.id &&
    trade.symbol &&
    (trade.type === 'BUY' || trade.type === 'SELL') &&
    trade.quantity > 0 &&
    trade.executedPrice > 0 &&
    trade.total > 0 &&
    trade.createdAt > 0 &&
    trade.executedAt > 0 &&
    (trade.status === 'executed' || trade.status === 'failed')
  );
}

/**
 * ============================================================================
 * TRADE EXPORT/IMPORT
 * ============================================================================
 */

/**
 * Export trades to JSON
 */
export function exportTrades(trades: Trade[]): string {
  return JSON.stringify({
    version: '1.0',
    exportedAt: Date.now(),
    count: trades.length,
    trades,
  }, null, 2);
}

/**
 * Import trades from JSON
 */
export function importTrades(json: string): Trade[] {
  try {
    const data = JSON.parse(json);
    
    if (!data.trades || !Array.isArray(data.trades)) {
      throw new Error('Invalid trade data format');
    }
    
    // Validate each trade
    const validTrades = data.trades.filter(isValidTrade);
    
    return validTrades;
  } catch (error) {
    throw new Error(`Failed to import trades: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * ============================================================================
 * TEST CASES: Trade History Manager
 * ============================================================================
 */
export const TradeHistoryTests = {
  /**
   * Test: Generate unique IDs
   */
  testGenerateIds(): boolean {
    const ids = new Set<string>();
    
    // Generate 1000 IDs
    for (let i = 0; i < 1000; i++) {
      const id = generateTradeId();
      
      // Check format: T-{timestamp}-{random}
      if (!id.startsWith('T-')) {
        console.error('ID format incorrect');
        return false;
      }
      
      ids.add(id);
    }
    
    // Check all unique
    if (ids.size !== 1000) {
      console.error('IDs not unique');
      return false;
    }
    
    return true;
  },
  
  /**
   * Test: Query by symbol
   */
  testQueryBySymbol(): boolean {
    const trades: Trade[] = [
      {
        id: 'T-1',
        symbol: 'AAPL',
        type: 'BUY',
        orderType: 'MARKET',
        quantity: 10,
        executedPrice: 150,
        total: 1500,
        createdAt: 1000,
        executedAt: 1000,
        status: 'executed',
      },
      {
        id: 'T-2',
        symbol: 'GOOGL',
        type: 'BUY',
        orderType: 'MARKET',
        quantity: 5,
        executedPrice: 140,
        total: 700,
        createdAt: 2000,
        executedAt: 2000,
        status: 'executed',
      },
      {
        id: 'T-3',
        symbol: 'AAPL',
        type: 'SELL',
        orderType: 'MARKET',
        quantity: 5,
        executedPrice: 160,
        total: 800,
        createdAt: 3000,
        executedAt: 3000,
        status: 'executed',
      },
    ];
    
    const aaplTrades = getTradesBySymbol(trades, 'AAPL');
    
    if (aaplTrades.length !== 2) {
      console.error('Query by symbol incorrect');
      return false;
    }
    
    return true;
  },
  
  /**
   * Test: Calculate metrics
   */
  testCalculateMetrics(): boolean {
    const trades: Trade[] = [
      {
        id: 'T-1',
        symbol: 'AAPL',
        type: 'BUY',
        orderType: 'MARKET',
        quantity: 10,
        executedPrice: 150,
        total: 1500,
        createdAt: 1000,
        executedAt: 1000,
        status: 'executed',
      },
      {
        id: 'T-2',
        symbol: 'AAPL',
        type: 'SELL',
        orderType: 'MARKET',
        quantity: 5,
        executedPrice: 160,
        total: 800,
        createdAt: 2000,
        executedAt: 2000,
        status: 'executed',
      },
      {
        id: 'T-3',
        symbol: 'GOOGL',
        type: 'BUY',
        orderType: 'MARKET',
        quantity: 3,
        executedPrice: 140,
        total: 420,
        createdAt: 3000,
        executedAt: 3000,
        status: 'failed',
      },
    ];
    
    const metrics = calculateTradeMetrics(trades);
    
    if (metrics.totalTrades !== 3) {
      console.error('Total trades incorrect');
      return false;
    }
    
    if (metrics.totalBuys !== 1) {
      console.error('Total buys incorrect');
      return false;
    }
    
    if (metrics.totalSells !== 1) {
      console.error('Total sells incorrect');
      return false;
    }
    
    if (metrics.totalFailed !== 1) {
      console.error('Total failed incorrect');
      return false;
    }
    
    // Success rate: 2/3 = 66.67%
    if (Math.abs(metrics.successRate - 66.67) > 0.1) {
      console.error('Success rate incorrect');
      return false;
    }
    
    return true;
  },
  
  /**
   * Test: Symbol summaries
   */
  testSymbolSummaries(): boolean {
    const trades: Trade[] = [
      {
        id: 'T-1',
        symbol: 'AAPL',
        type: 'BUY',
        orderType: 'MARKET',
        quantity: 10,
        executedPrice: 150,
        total: 1500,
        createdAt: 1000,
        executedAt: 1000,
        status: 'executed',
      },
      {
        id: 'T-2',
        symbol: 'AAPL',
        type: 'SELL',
        orderType: 'MARKET',
        quantity: 5,
        executedPrice: 160,
        total: 800,
        createdAt: 2000,
        executedAt: 2000,
        status: 'executed',
      },
    ];
    
    const summaries = calculateSymbolSummaries(trades);
    
    if (summaries.length !== 1) {
      console.error('Symbol summaries incorrect');
      return false;
    }
    
    const aaplSummary = summaries[0];
    
    if (aaplSummary.symbol !== 'AAPL') {
      console.error('Symbol incorrect');
      return false;
    }
    
    if (aaplSummary.totalTrades !== 2) {
      console.error('Total trades incorrect');
      return false;
    }
    
    if (aaplSummary.netShares !== 5) {
      console.error('Net shares incorrect (10 bought - 5 sold = 5)');
      return false;
    }
    
    return true;
  },
  
  /**
   * Run all tests
   */
  runAll(): boolean {
    console.log('[TradeHistory] Running tests...');
    
    const results = [
      this.testGenerateIds(),
      this.testQueryBySymbol(),
      this.testCalculateMetrics(),
      this.testSymbolSummaries(),
    ];
    
    const allPassed = results.every(r => r);
    
    if (allPassed) {
      console.log('[TradeHistory] ✓ All tests passed');
    } else {
      console.error('[TradeHistory] ✗ Some tests failed');
    }
    
    return allPassed;
  },
};
