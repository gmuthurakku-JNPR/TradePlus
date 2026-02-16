/**
 * ============================================================================
 * Portfolio Manager
 * ============================================================================
 * 
 * Manages portfolio state and calculations.
 * 
 * RESPONSIBILITIES:
 * - Calculate portfolio metrics (total value, unrealized P&L)
 * - Get current market values of positions
 * - Calculate position-level metrics
 * - Provide portfolio snapshots
 * 
 * CALCULATIONS:
 * - Total Value = cash + sum(shares × currentPrice)
 * - Unrealized P&L = sum((currentPrice - avgCost) × shares)
 * - Total P&L = realizedPL + unrealizedPL
 * - Total Return % = totalPL / initialCash × 100
 * ============================================================================
 */

import type { Portfolio, Position, PortfolioMetrics } from '@types';
import {
  dollarsToCents,
  centsToDollars,
  calculateRealizedPLCents,
  safeAdd,
} from '../validators/financialMath';

/**
 * Extended portfolio metrics with additional calculated fields
 */
export interface ExtendedPortfolioMetrics extends PortfolioMetrics {
  cash: number;
  positionsValue: number;
}

/**
 * ============================================================================
 * PORTFOLIO METRICS CALCULATION
 * ============================================================================
 * 
 * Given a portfolio and current market prices, calculate comprehensive metrics.
 * 
 * Formula:
 *   totalValue = cash + sum(position.shares × currentPrice)
 *   unrealizedPL = sum((currentPrice - avgCost) × shares)
 *   totalPL = realizedPL + unrealizedPL
 *   totalReturn% = (totalPL / initialCash) × 100
 * 
 * Example:
 *   Portfolio:
 *     cash: $5,000
 *     positions:
 *       AAPL: 10 shares @ $150 avgCost
 *       GOOGL: 5 shares @ $140 avgCost
 *     realizedPL: $200
 *     initialCash: $10,000
 *   
 *   Current Prices:
 *     AAPL: $180
 *     GOOGL: $130
 *   
 *   Calculations:
 *     AAPL value = 10 × $180 = $1,800
 *     GOOGL value = 5 × $130 = $650
 *     totalValue = $5,000 + $1,800 + $650 = $7,450
 *     
 *     AAPL unrealized = (180 - 150) × 10 = $300
 *     GOOGL unrealized = (130 - 140) × 5 = -$50
 *     unrealizedPL = $300 + (-$50) = $250
 *     
 *     totalPL = $200 (realized) + $250 (unrealized) = $450
 *     totalReturn = ($450 / $10,000) × 100 = 4.5%
 * ============================================================================
 */
export function calculatePortfolioMetrics(
  portfolio: Portfolio,
  currentPrices: Record<string, number>
): ExtendedPortfolioMetrics {
  try {
    // Start with cash
    let totalValueCents = dollarsToCents(portfolio.cash);
    let unrealizedPLCents = 0;
    let totalInvestedCents = 0;
    
    // Process each position
    for (const symbol in portfolio.positions) {
      const position = portfolio.positions[symbol];
      const currentPrice = currentPrices[symbol];
      
      if (!currentPrice || currentPrice <= 0) {
        // If no current price available, use avgCost (no unrealized P&L)
        const positionValueCents = dollarsToCents(position.avgCost * position.shares);
        totalValueCents = safeAdd(totalValueCents, positionValueCents);
        totalInvestedCents = safeAdd(totalInvestedCents, positionValueCents);
        continue;
      }
      
      // Calculate position value
      const currentPriceCents = dollarsToCents(currentPrice);
      const positionValueCents = currentPriceCents * position.shares;
      totalValueCents = safeAdd(totalValueCents, positionValueCents);
      
      // Calculate invested amount (cost basis)
      const avgCostCents = dollarsToCents(position.avgCost);
      const costBasisCents = avgCostCents * position.shares;
      totalInvestedCents = safeAdd(totalInvestedCents, costBasisCents);
      
      // Calculate unrealized P&L for this position
      const positionUnrealizedPLCents = calculateRealizedPLCents(
        currentPriceCents,
        avgCostCents,
        position.shares
      );
      unrealizedPLCents = safeAdd(unrealizedPLCents, positionUnrealizedPLCents);
    }
    
    // Calculate total P&L
    const realizedPLCents = dollarsToCents(portfolio.realizedPL);
    const totalPLCents = safeAdd(realizedPLCents, unrealizedPLCents);
    
    // Calculate percentages
    const totalInvested = centsToDollars(totalInvestedCents);
    const totalValue = centsToDollars(totalValueCents);
    const totalPL = centsToDollars(totalPLCents);
    const unrealizedPL = centsToDollars(unrealizedPLCents);
    
    const totalPLPercent = totalInvested > 0
      ? (totalPL / totalInvested) * 100
      : 0;
    
    const unrealizedPLPercent = totalInvested > 0
      ? (unrealizedPL / totalInvested) * 100
      : 0;
    
    const cashPercent = totalValue > 0
      ? (portfolio.cash / totalValue) * 100
      : 0;
    
    return {
      totalValue,
      totalInvested,
      totalPL,
      totalPLPercent,
      unrealizedPL,
      unrealizedPLPercent,
      realizedPL: portfolio.realizedPL,
      cashPercent,
      cash: portfolio.cash,
      positionsValue: centsToDollars(totalValueCents - dollarsToCents(portfolio.cash)),
    };
  } catch (error) {
    // If calculation fails, return safe defaults
    return {
      totalValue: portfolio.cash,
      totalInvested: 0,
      totalPL: portfolio.realizedPL,
      totalPLPercent: 0,
      unrealizedPL: 0,
      unrealizedPLPercent: 0,
      realizedPL: portfolio.realizedPL,
      cashPercent: 100,
      cash: portfolio.cash,
      positionsValue: 0,
    };
  }
}

/**
 * ============================================================================
 * POSITION METRICS CALCULATION
 * ============================================================================
 * 
 * Calculate metrics for a single position.
 * 
 * Metrics:
 *   currentValue = shares × currentPrice
 *   costBasis = shares × avgCost
 *   unrealizedPL = (currentPrice - avgCost) × shares
 *   unrealizedPLPercent = (unrealizedPL / costBasis) × 100
 * ============================================================================
 */
export interface PositionMetrics {
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
}

export function calculatePositionMetrics(
  position: Position,
  currentPrice: number
): PositionMetrics {
  const currentPriceCents = dollarsToCents(currentPrice);
  const avgCostCents = dollarsToCents(position.avgCost);
  
  const currentValueCents = currentPriceCents * position.shares;
  const costBasisCents = avgCostCents * position.shares;
  
  const unrealizedPLCents = calculateRealizedPLCents(
    currentPriceCents,
    avgCostCents,
    position.shares
  );
  
  const unrealizedPLPercent = costBasisCents > 0
    ? (unrealizedPLCents / costBasisCents) * 100
    : 0;
  
  return {
    symbol: position.symbol,
    shares: position.shares,
    avgCost: position.avgCost,
    currentPrice,
    currentValue: centsToDollars(currentValueCents),
    costBasis: centsToDollars(costBasisCents),
    unrealizedPL: centsToDollars(unrealizedPLCents),
    unrealizedPLPercent,
  };
}

/**
 * ============================================================================
 * PORTFOLIO VALIDATION
 * ============================================================================
 * 
 * Validate portfolio state consistency.
 * ============================================================================
 */
export function validatePortfolio(portfolio: Portfolio): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check cash is non-negative
  if (portfolio.cash < 0) {
    errors.push(`Cash is negative: $${portfolio.cash.toFixed(2)}`);
  }
  
  // Check cash is finite
  if (!isFinite(portfolio.cash)) {
    errors.push('Cash is not finite');
  }
  
  // Check positions
  for (const symbol in portfolio.positions) {
    const position = portfolio.positions[symbol];
    
    // Check shares is positive
    if (position.shares <= 0) {
      errors.push(`${symbol}: Invalid shares (${position.shares})`);
    }
    
    // Check shares is integer
    if (!Number.isInteger(position.shares)) {
      errors.push(`${symbol}: Fractional shares not allowed (${position.shares})`);
    }
    
    // Check avgCost is positive
    if (position.avgCost <= 0) {
      errors.push(`${symbol}: Invalid avgCost ($${position.avgCost})`);
    }
    
    // Check avgCost is finite
    if (!isFinite(position.avgCost)) {
      errors.push(`${symbol}: avgCost is not finite`);
    }
  }
  
  // Check realizedPL is finite
  if (!isFinite(portfolio.realizedPL)) {
    errors.push('Realized P&L is not finite');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * ============================================================================
 * PORTFOLIO SNAPSHOT
 * ============================================================================
 * 
 * Create a snapshot of portfolio state for persistence or display.
 * ============================================================================
 */
export interface PortfolioSnapshot {
  timestamp: number;
  portfolio: Portfolio;
  metrics: PortfolioMetrics;
  positionsCount: number;
  symbols: string[];
}

export function createPortfolioSnapshot(
  portfolio: Portfolio,
  currentPrices: Record<string, number>
): PortfolioSnapshot {
  const metrics = calculatePortfolioMetrics(portfolio, currentPrices);
  const symbols = Object.keys(portfolio.positions);
  
  return {
    timestamp: Date.now(),
    portfolio,
    metrics,
    positionsCount: symbols.length,
    symbols,
  };
}

/**
 * ============================================================================
 * TEST CASES: Portfolio Manager
 * ============================================================================
 */
export const PortfolioManagerTests = {
  /**
   * Test: Calculate metrics with profit
   */
  testMetricsWithProfit(): boolean {
    const portfolio: Portfolio = {
      cash: 5000,
      positions: {
        AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150 },
      },
      realizedPL: 200,
      initialCash: 10000,
    };
    
    const currentPrices = {
      AAPL: 180, // Up $30 from avgCost
    };
    
    const metrics = calculatePortfolioMetrics(portfolio, currentPrices);
    
    // Check total value: $5,000 + (10 × $180) = $6,800
    if (Math.abs(metrics.totalValue - 6800) > 0.01) {
      console.error(`Total value incorrect: ${metrics.totalValue} (expected 6800)`);
      return false;
    }
    
    // Check unrealized P&L: (180 - 150) × 10 = $300
    if (Math.abs(metrics.unrealizedPL - 300) > 0.01) {
      console.error(`Unrealized P&L incorrect: ${metrics.unrealizedPL} (expected 300)`);
      return false;
    }
    
    // Check total P&L: $200 (realized) + $300 (unrealized) = $500
    if (Math.abs(metrics.totalPL - 500) > 0.01) {
      console.error(`Total P&L incorrect: ${metrics.totalPL} (expected 500)`);
      return false;
    }
    
    // Check return: ($500 / $10,000) × 100 = 5%
    if (Math.abs(metrics.totalPLPercent - 5) > 0.01) {
      console.error(`Return incorrect: ${metrics.totalPLPercent} (expected 5)`);
      return false;
    }
    
    return true;
  },
  
  /**
   * Test: Calculate metrics with loss
   */
  testMetricsWithLoss(): boolean {
    const portfolio: Portfolio = {
      cash: 5000,
      positions: {
        AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150 },
      },
      realizedPL: -100,
      initialCash: 10000,
    };
    
    const currentPrices = {
      AAPL: 120, // Down $30 from avgCost
    };
    
    const metrics = calculatePortfolioMetrics(portfolio, currentPrices);
    
    // Check unrealized P&L: (120 - 150) × 10 = -$300
    if (Math.abs(metrics.unrealizedPL - (-300)) > 0.01) {
      console.error(`Unrealized P&L incorrect: ${metrics.unrealizedPL} (expected -300)`);
      return false;
    }
    
    // Check total P&L: -$100 (realized) + (-$300) (unrealized) = -$400
    if (Math.abs(metrics.totalPL - (-400)) > 0.01) {
      console.error(`Total P&L incorrect: ${metrics.totalPL} (expected -400)`);
      return false;
    }
    
    return true;
  },
  
  /**
   * Test: Multiple positions
   */
  testMultiplePositions(): boolean {
    const portfolio: Portfolio = {
      cash: 3000,
      positions: {
        AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150 },
        GOOGL: { symbol: 'GOOGL', shares: 5, avgCost: 140 },
      },
      realizedPL: 0,
      initialCash: 10000,
    };
    
    const currentPrices = {
      AAPL: 180,  // +$30
      GOOGL: 130, // -$10
    };
    
    const metrics = calculatePortfolioMetrics(portfolio, currentPrices);
    
    // Check total value: $3,000 + (10×180) + (5×130) = $6,450
    if (Math.abs(metrics.totalValue - 6450) > 0.01) {
      console.error(`Total value incorrect: ${metrics.totalValue} (expected 6450)`);
      return false;
    }
    
    // Check unrealized P&L: (30×10) + (-10×5) = $250
    if (Math.abs(metrics.unrealizedPL - 250) > 0.01) {
      console.error(`Unrealized P&L incorrect: ${metrics.unrealizedPL} (expected 250)`);
      return false;
    }
    
    return true;
  },
  
  /**
   * Test: Position metrics
   */
  testPositionMetrics(): boolean {
    const position: Position = {
      symbol: 'AAPL',
      shares: 10,
      avgCost: 150,
    };
    
    const currentPrice = 180;
    
    const metrics = calculatePositionMetrics(position, currentPrice);
    
    // Check current value: 10 × $180 = $1,800
    if (Math.abs(metrics.currentValue - 1800) > 0.01) {
      console.error('Current value incorrect');
      return false;
    }
    
    // Check cost basis: 10 × $150 = $1,500
    if (Math.abs(metrics.costBasis - 1500) > 0.01) {
      console.error('Cost basis incorrect');
      return false;
    }
    
    // Check unrealized P&L: $300
    if (Math.abs(metrics.unrealizedPL - 300) > 0.01) {
      console.error('Unrealized P&L incorrect');
      return false;
    }
    
    // Check unrealized P&L %: ($300 / $1,500) × 100 = 20%
    if (Math.abs(metrics.unrealizedPLPercent - 20) > 0.01) {
      console.error('Unrealized P&L % incorrect');
      return false;
    }
    
    return true;
  },
  
  /**
   * Test: Portfolio validation
   */
  testValidation(): boolean {
    // Valid portfolio
    const validPortfolio: Portfolio = {
      cash: 5000,
      positions: {
        AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150 },
      },
      realizedPL: 0,
      initialCash: 10000,
    };
    
    const validResult = validatePortfolio(validPortfolio);
    if (!validResult.isValid) {
      console.error('Valid portfolio marked as invalid');
      return false;
    }
    
    // Invalid portfolio (negative cash)
    const invalidPortfolio: Portfolio = {
      cash: -100,
      positions: {},
      realizedPL: 0,
      initialCash: 10000,
    };
    
    const invalidResult = validatePortfolio(invalidPortfolio);
    if (invalidResult.isValid) {
      console.error('Invalid portfolio marked as valid');
      return false;
    }
    
    return true;
  },
  
  /**
   * Run all tests
   */
  runAll(): boolean {
    console.log('[PortfolioManager] Running tests...');
    
    const results = [
      this.testMetricsWithProfit(),
      this.testMetricsWithLoss(),
      this.testMultiplePositions(),
      this.testPositionMetrics(),
      this.testValidation(),
    ];
    
    const allPassed = results.every(r => r);
    
    if (allPassed) {
      console.log('[PortfolioManager] ✓ All tests passed');
    } else {
      console.error('[PortfolioManager] ✗ Some tests failed');
    }
    
    return allPassed;
  },
};
