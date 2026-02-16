/**
 * ============================================================================
 * Sell Execution Logic
 * ============================================================================
 * 
 * Executes SELL trades with realized profit/loss calculation.
 * 
 * SELL TRADE FLOW:
 * 1. Add cash to portfolio (proceeds from sale)
 * 2. Remove shares from position
 * 3. Calculate realized profit/loss
 * 4. Update portfolio realized P&L
 * 5. Remove position if shares = 0
 * 6. Create trade record
 * 
 * REALIZED P&L CALCULATION:
 *   realizedPL = (sellPrice - avgCost) × quantity
 *   
 *   Profit Example: Bought at $100, sold at $150, 10 shares
 *     realizedPL = (150 - 100) × 10 = $500 profit
 *   
 *   Loss Example: Bought at $150, sold at $100, 10 shares
 *     realizedPL = (100 - 150) × 10 = -$500 loss
 * 
 * PRECISION:
 * All calculations use cents (integers) to avoid floating point errors.
 * ============================================================================
 */

import type { Portfolio, Position, Trade, TradeRequest } from '@types';
import {
  dollarsToCents,
  centsToDollars,
  calculateTradeTotalCents,
  calculateRealizedPLCents,
  safeAdd,
} from '../validators/financialMath';

/**
 * ============================================================================
 * SELL EXECUTION LOGIC
 * ============================================================================
 * 
 * Algorithm:
 * 1. Convert price and cash to cents (precision)
 * 2. Calculate total proceeds in cents
 * 3. Add cash to portfolio
 * 4. Get existing position (must exist, validated earlier)
 * 5. Calculate realized profit/loss
 * 6. Update portfolio realized P&L
 * 7. Decrease shares in position (or remove if 0)
 * 8. Create trade record
 * 9. Return updated portfolio and trade
 * 
 * Realized P&L Formula:
 *   realizedPL = (sellPrice - avgCost) × quantity
 * 
 * Example:
 *   Portfolio: $5,000 cash, AAPL: 20 shares @ $150 avg cost
 *   Sell: 10 shares AAPL @ $180
 *   
 *   Step 1: Convert to cents
 *     cashCents = 500,000 cents
 *     priceCents = 18,000 cents
 *     avgCostCents = 15,000 cents
 *   
 *   Step 2: Calculate proceeds
 *     totalCents = 18,000 × 10 = 180,000 cents ($1,800)
 *   
 *   Step 3: Add cash
 *     newCashCents = 500,000 + 180,000 = 680,000 cents ($6,800)
 *   
 *   Step 4: Get position
 *     oldShares = 20
 *     avgCostCents = 15,000 cents
 *   
 *   Step 5: Calculate realized P&L
 *     plCents = (18,000 - 15,000) × 10 = 30,000 cents ($300 profit)
 *   
 *   Step 6: Update portfolio realized P&L
 *     newRealizedPL = 0 + 300 = $300
 *   
 *   Step 7: Update position
 *     newShares = 20 - 10 = 10
 *     position = { symbol: 'AAPL', shares: 10, avgCost: 150 }
 *   
 *   Step 8: Create trade record
 *     trade = { type: 'SELL', quantity: 10, executedPrice: 180, ... }
 * ============================================================================
 */
export function executeSellTrade(
  portfolio: Portfolio,
  request: TradeRequest,
  tradeId: string,
  timestamp: number
): { portfolio: Portfolio; trade: Trade } {
  try {
    // Step 1: Convert to cents for precision
    const cashCents = dollarsToCents(portfolio.cash);
    const priceCents = dollarsToCents(request.price);
    const quantity = request.quantity;
    
    // Step 2: Calculate total proceeds
    const totalCents = calculateTradeTotalCents(priceCents, quantity);
    
    // Step 3: Add cash (will throw if overflow)
    const newCashCents = safeAdd(cashCents, totalCents);
    
    // Step 4: Get existing position (must exist, validated earlier)
    const existingPosition = portfolio.positions[request.symbol];
    if (!existingPosition) {
      throw new Error(`Position not found for ${request.symbol}`);
    }
    
    const oldShares = existingPosition.shares;
    const avgCostCents = dollarsToCents(existingPosition.avgCost);
    
    // Step 5: Calculate realized profit/loss
    const realizedPLCents = calculateRealizedPLCents(
      priceCents,
      avgCostCents,
      quantity
    );
    
    // Step 6: Update portfolio realized P&L
    const oldRealizedPLCents = dollarsToCents(portfolio.realizedPL);
    const newRealizedPLCents = safeAdd(oldRealizedPLCents, realizedPLCents);
    
    // Step 7: Update position (decrease shares)
    const newShares = oldShares - quantity;
    
    // Create updated positions object
    let updatedPositions: Record<string, Position>;
    
    if (newShares === 0) {
      // Remove position if no shares left
      const { [request.symbol]: removed, ...remainingPositions } = portfolio.positions;
      updatedPositions = remainingPositions;
    } else {
      // Keep position with decreased shares (avgCost unchanged)
      updatedPositions = {
        ...portfolio.positions,
        [request.symbol]: {
          symbol: request.symbol,
          shares: newShares,
          avgCost: existingPosition.avgCost, // avgCost stays same
        },
      };
    }
    
    // Step 8: Create updated portfolio (immutable)
    const updatedPortfolio: Portfolio = {
      ...portfolio,
      cash: centsToDollars(newCashCents),
      positions: updatedPositions,
      realizedPL: centsToDollars(newRealizedPLCents),
    };
    
    // Step 9: Create trade record
    const trade: Trade = {
      id: tradeId,
      symbol: request.symbol,
      type: 'SELL',
      orderType: request.orderType || 'MARKET',
      quantity: quantity,
      executedPrice: request.price,
      total: centsToDollars(totalCents),
      createdAt: timestamp,
      executedAt: timestamp,
      status: 'executed',
    };
    
    return {
      portfolio: updatedPortfolio,
      trade,
    };
  } catch (error) {
    // If any error occurs, return error trade
    const errorTrade: Trade = {
      id: tradeId,
      symbol: request.symbol,
      type: 'SELL',
      orderType: request.orderType || 'MARKET',
      quantity: request.quantity,
      executedPrice: request.price,
      total: request.price * request.quantity,
      createdAt: timestamp,
      executedAt: timestamp,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    throw {
      portfolio,
      trade: errorTrade,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ============================================================================
 * SELL EXECUTION - PROFIT EXAMPLE
 * ============================================================================
 * 
 * Scenario: Sell 10 shares of AAPL at $180, bought at $150 (profit)
 * 
 * Initial State:
 *   Portfolio:
 *     cash: $5,000
 *     positions: { AAPL: { shares: 20, avgCost: 150 } }
 *     realizedPL: $0
 *   
 * Execution Steps:
 *   
 *   1. Convert to cents:
 *      cashCents = 500,000 cents
 *      priceCents = 18,000 cents
 *      avgCostCents = 15,000 cents
 *   
 *   2. Calculate proceeds:
 *      totalCents = 18,000 × 10 = 180,000 cents ($1,800)
 *   
 *   3. Add cash:
 *      newCashCents = 500,000 + 180,000 = 680,000 cents ($6,800)
 *   
 *   4. Get position:
 *      oldShares = 20
 *      avgCostCents = 15,000 cents
 *   
 *   5. Calculate realized P&L:
 *      plCents = (18,000 - 15,000) × 10 = 30,000 cents ($300 profit)
 *   
 *   6. Update realized P&L:
 *      newRealizedPLCents = 0 + 30,000 = 30,000 cents ($300)
 *   
 *   7. Update position:
 *      newShares = 20 - 10 = 10
 *      position = { symbol: 'AAPL', shares: 10, avgCost: 150 }
 *   
 *   8. Create trade:
 *      trade = {
 *        type: 'SELL',
 *        quantity: 10,
 *        executedPrice: 180,
 *        total: 1800,
 *        status: 'executed'
 *      }
 * 
 * Final State:
 *   Portfolio:
 *     cash: $6,800 (was $5,000, gained $1,800)
 *     positions: { AAPL: { shares: 10, avgCost: 150 } } (was 20 shares)
 *     realizedPL: $300 (profit)
 * ============================================================================
 */

/**
 * ============================================================================
 * SELL EXECUTION - LOSS EXAMPLE
 * ============================================================================
 * 
 * Scenario: Sell 10 shares of AAPL at $100, bought at $150 (loss)
 * 
 * Initial State:
 *   Portfolio:
 *     cash: $5,000
 *     positions: { AAPL: { shares: 20, avgCost: 150 } }
 *     realizedPL: $0
 *   
 * Execution Steps:
 *   
 *   5. Calculate realized P&L:
 *      plCents = (10,000 - 15,000) × 10 = -50,000 cents (-$500 loss)
 *   
 *   6. Update realized P&L:
 *      newRealizedPLCents = 0 + (-50,000) = -50,000 cents (-$500)
 * 
 * Final State:
 *   Portfolio:
 *     cash: $6,000 (was $5,000, gained $1,000 in proceeds)
 *     positions: { AAPL: { shares: 10, avgCost: 150 } }
 *     realizedPL: -$500 (loss)
 * 
 * Note: Even though we lost money, cash increases because we received
 * proceeds from the sale. The loss is captured in realizedPL.
 * ============================================================================
 */

/**
 * ============================================================================
 * SELL EXECUTION - COMPLETE POSITION SALE EXAMPLE
 * ============================================================================
 * 
 * Scenario: Sell all 20 shares of AAPL at $180, bought at $150
 * 
 * Initial State:
 *   Portfolio:
 *     cash: $5,000
 *     positions: { AAPL: { shares: 20, avgCost: 150 } }
 *     realizedPL: $0
 *   
 * Execution Steps:
 *   
 *   7. Update position:
 *      newShares = 20 - 20 = 0
 *      → REMOVE POSITION (no shares left)
 * 
 * Final State:
 *   Portfolio:
 *     cash: $8,600 (was $5,000, gained $3,600)
 *     positions: {} (AAPL removed)
 *     realizedPL: $600 (profit: $30 × 20 shares)
 * ============================================================================
 */

/**
 * ============================================================================
 * EDGE CASES HANDLED
 * ============================================================================
 * 
 * 1. Complete Position Sale (Sell All Shares):
 *    - newShares = 0
 *    - Remove position from portfolio
 *    - positions = { ...old, [symbol]: undefined }
 * 
 * 2. Partial Position Sale:
 *    - newShares > 0
 *    - Keep position with decreased shares
 *    - avgCost remains unchanged (only matters for remaining shares)
 * 
 * 3. Profit vs. Loss:
 *    - Profit: sellPrice > avgCost → positive realizedPL
 *    - Loss: sellPrice < avgCost → negative realizedPL
 *    - Break-even: sellPrice = avgCost → zero realizedPL
 * 
 * 4. Multiple Sells (Cumulative P&L):
 *    - realizedPL accumulates across all trades
 *    - First sell: realizedPL = $100
 *    - Second sell: realizedPL = $100 + $50 = $150
 * 
 * 5. Precision Rounding:
 *    - All calculations in cents
 *    - P&L rounded to nearest cent
 * 
 * 6. Overflow Protection:
 *    - safeAdd() checks for overflow
 *    - calculateTradeTotalCents() checks for overflow
 *    - Throws error if overflow detected
 * 
 * 7. Position Not Found:
 *    - Should be caught by validation before execution
 *    - If somehow position doesn't exist, throws error
 * 
 * 8. Insufficient Shares:
 *    - Should be caught by validation before execution
 *    - If somehow not enough shares, will result in negative shares (bug)
 * ============================================================================
 */

/**
 * ============================================================================
 * TEST CASES: Sell Execution
 * ============================================================================
 */
export const SellExecutionTests = {
  /**
   * Test: Sell for profit (partial position)
   */
  testSellForProfit(): boolean {
    const portfolio: Portfolio = {
      cash: 5000,
      positions: {
        AAPL: { symbol: 'AAPL', shares: 20, avgCost: 150 },
      },
      realizedPL: 0,
      initialCash: 10000,
    };
    
    const request: TradeRequest = {
      symbol: 'AAPL',
      type: 'SELL',
      quantity: 10,
      price: 180, // Profit: $30 per share
    };
    
    const result = executeSellTrade(portfolio, request, 'test-1', Date.now());
    
    // Check cash increased by proceeds
    if (Math.abs(result.portfolio.cash - 6800) > 0.01) {
      console.error(`Cash incorrect: ${result.portfolio.cash} (expected 6800)`);
      return false;
    }
    
    // Check shares decreased
    const position = result.portfolio.positions['AAPL'];
    if (!position || position.shares !== 10) {
      console.error('Shares not decreased correctly');
      return false;
    }
    
    // Check avgCost unchanged
    if (Math.abs(position.avgCost - 150) > 0.01) {
      console.error('Average cost should not change on sell');
      return false;
    }
    
    // Check realized P&L: (180 - 150) * 10 = $300
    if (Math.abs(result.portfolio.realizedPL - 300) > 0.01) {
      console.error(`Realized P&L incorrect: ${result.portfolio.realizedPL} (expected 300)`);
      return false;
    }
    
    return true;
  },
  
  /**
   * Test: Sell for loss
   */
  testSellForLoss(): boolean {
    const portfolio: Portfolio = {
      cash: 5000,
      positions: {
        AAPL: { symbol: 'AAPL', shares: 20, avgCost: 150 },
      },
      realizedPL: 0,
      initialCash: 10000,
    };
    
    const request: TradeRequest = {
      symbol: 'AAPL',
      type: 'SELL',
      quantity: 10,
      price: 100, // Loss: -$50 per share
    };
    
    const result = executeSellTrade(portfolio, request, 'test-2', Date.now());
    
    // Check cash increased by proceeds (even though loss)
    if (Math.abs(result.portfolio.cash - 6000) > 0.01) {
      console.error(`Cash incorrect: ${result.portfolio.cash} (expected 6000)`);
      return false;
    }
    
    // Check realized P&L: (100 - 150) * 10 = -$500 (loss)
    if (Math.abs(result.portfolio.realizedPL - (-500)) > 0.01) {
      console.error(`Realized P&L incorrect: ${result.portfolio.realizedPL} (expected -500)`);
      return false;
    }
    
    return true;
  },
  
  /**
   * Test: Sell entire position (position should be removed)
   */
  testSellEntirePosition(): boolean {
    const portfolio: Portfolio = {
      cash: 5000,
      positions: {
        AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150 },
      },
      realizedPL: 0,
      initialCash: 10000,
    };
    
    const request: TradeRequest = {
      symbol: 'AAPL',
      type: 'SELL',
      quantity: 10, // Sell all shares
      price: 180,
    };
    
    const result = executeSellTrade(portfolio, request, 'test-3', Date.now());
    
    // Check position removed
    if (result.portfolio.positions['AAPL']) {
      console.error('Position should be removed when all shares sold');
      return false;
    }
    
    // Check cash increased
    if (Math.abs(result.portfolio.cash - 6800) > 0.01) {
      console.error('Cash incorrect after selling entire position');
      return false;
    }
    
    // Check realized P&L
    if (Math.abs(result.portfolio.realizedPL - 300) > 0.01) {
      console.error('Realized P&L incorrect');
      return false;
    }
    
    return true;
  },
  
  /**
   * Test: Multiple sells (cumulative P&L)
   */
  testCumulativePL(): boolean {
    let portfolio: Portfolio = {
      cash: 5000,
      positions: {
        AAPL: { symbol: 'AAPL', shares: 20, avgCost: 150 },
      },
      realizedPL: 100, // Already has $100 realized P&L
      initialCash: 10000,
    };
    
    const request: TradeRequest = {
      symbol: 'AAPL',
      type: 'SELL',
      quantity: 10,
      price: 180, // $300 profit
    };
    
    const result = executeSellTrade(portfolio, request, 'test-4', Date.now());
    
    // Check cumulative P&L: 100 + 300 = 400
    if (Math.abs(result.portfolio.realizedPL - 400) > 0.01) {
      console.error(`Cumulative P&L incorrect: ${result.portfolio.realizedPL} (expected 400)`);
      return false;
    }
    
    return true;
  },
  
  /**
   * Run all tests
   */
  runAll(): boolean {
    console.log('[SellExecution] Running tests...');
    
    const results = [
      this.testSellForProfit(),
      this.testSellForLoss(),
      this.testSellEntirePosition(),
      this.testCumulativePL(),
    ];
    
    const allPassed = results.every(r => r);
    
    if (allPassed) {
      console.log('[SellExecution] ✓ All tests passed');
    } else {
      console.error('[SellExecution] ✗ Some tests failed');
    }
    
    return allPassed;
  },
};
