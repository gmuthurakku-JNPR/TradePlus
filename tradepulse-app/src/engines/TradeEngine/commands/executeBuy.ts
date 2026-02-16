/**
 * ============================================================================
 * Buy Execution Logic
 * ============================================================================
 * 
 * Executes BUY trades with atomic portfolio updates.
 * 
 * BUY TRADE FLOW:
 * 1. Deduct cash from portfolio
 * 2. Add shares to position (or create new position)
 * 3. Update average cost basis (weighted average)
 * 4. Create trade record
 * 
 * ATOMIC UPDATES:
 * All portfolio changes must happen atomically (all-or-nothing).
 * If any step fails, the entire trade is rolled back.
 * 
 * PRECISION:
 * All calculations use cents (integers) to avoid floating point errors.
 * Convert to/from dollars only at boundaries.
 * ============================================================================
 */

import type { Portfolio, Position, Trade, TradeRequest } from '@types';
import {
  dollarsToCents,
  centsToDollars,
  calculateTradeTotalCents,
  calculateAverageCostCents,
  safeSubtract,
} from '../validators/financialMath';

/**
 * ============================================================================
 * BUY EXECUTION LOGIC
 * ============================================================================
 * 
 * Algorithm:
 * 1. Convert price and cash to cents (precision)
 * 2. Calculate total cost in cents
 * 3. Deduct cash from portfolio
 * 4. Get existing position (if any)
 * 5. Calculate new average cost (weighted average)
 * 6. Update position with new shares and average cost
 * 7. Create trade record
 * 8. Return updated portfolio and trade
 * 
 * Average Cost Formula:
 *   newAvgCost = (oldCost × oldShares + newCost × newShares) / totalShares
 * 
 * Example:
 *   Portfolio: $10,000 cash, no positions
 *   Buy: 10 shares AAPL @ $150
 *   
 *   Step 1: Convert to cents
 *     cashCents = 1,000,000 cents
 *     priceCents = 15,000 cents
 *   
 *   Step 2: Calculate total
 *     totalCents = 15,000 × 10 = 150,000 cents ($1,500)
 *   
 *   Step 3: Deduct cash
 *     newCashCents = 1,000,000 - 150,000 = 850,000 cents ($8,500)
 *   
 *   Step 4: No existing position
 *   
 *   Step 5: Average cost = price (first purchase)
 *     avgCostCents = 15,000 cents ($150)
 *   
 *   Step 6: Create position
 *     position = { symbol: 'AAPL', shares: 10, avgCost: 150 }
 *   
 *   Step 7: Create trade record
 *     trade = { id, symbol: 'AAPL', type: 'BUY', quantity: 10, ... }
 * ============================================================================
 */
export function executeBuyTrade(
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
    
    // Step 2: Calculate total cost
    const totalCents = calculateTradeTotalCents(priceCents, quantity);
    
    // Step 3: Deduct cash (will throw if overflow)
    const newCashCents = safeSubtract(cashCents, totalCents);
    
    // Step 4: Get existing position (if any)
    const existingPosition = portfolio.positions[request.symbol];
    const oldShares = existingPosition?.shares || 0;
    const oldAvgCostCents = existingPosition ? dollarsToCents(existingPosition.avgCost) : 0;
    
    // Step 5: Calculate new average cost (weighted average)
    const newAvgCostCents = calculateAverageCostCents(
      oldAvgCostCents,
      oldShares,
      priceCents,
      quantity
    );
    
    // Step 6: Update position
    const newPosition: Position = {
      symbol: request.symbol,
      shares: oldShares + quantity,
      avgCost: centsToDollars(newAvgCostCents),
    };
    
    // Step 7: Create updated portfolio (immutable)
    const updatedPortfolio: Portfolio = {
      ...portfolio,
      cash: centsToDollars(newCashCents),
      positions: {
        ...portfolio.positions,
        [request.symbol]: newPosition,
      },
    };
    
    // Step 8: Create trade record
    const trade: Trade = {
      id: tradeId,
      symbol: request.symbol,
      type: 'BUY',
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
      type: 'BUY',
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
 * BUY EXECUTION - STEP BY STEP EXAMPLE
 * ============================================================================
 * 
 * Scenario: Buy 10 shares of AAPL at $150, already own 5 shares at $100
 * 
 * Initial State:
 *   Portfolio:
 *     cash: $10,000
 *     positions: { AAPL: { shares: 5, avgCost: 100 } }
 *   
 * Execution Steps:
 *   
 *   1. Convert to cents:
 *      cashCents = 1,000,000 cents
 *      priceCents = 15,000 cents
 *      oldAvgCostCents = 10,000 cents
 *   
 *   2. Calculate total:
 *      totalCents = 15,000 × 10 = 150,000 cents ($1,500)
 *   
 *   3. Deduct cash:
 *      newCashCents = 1,000,000 - 150,000 = 850,000 cents ($8,500)
 *   
 *   4. Get existing position:
 *      oldShares = 5
 *      oldAvgCostCents = 10,000 cents
 *   
 *   5. Calculate new average cost:
 *      oldTotal = 10,000 × 5 = 50,000 cents
 *      newTotal = 15,000 × 10 = 150,000 cents
 *      combined = 50,000 + 150,000 = 200,000 cents
 *      totalShares = 5 + 10 = 15
 *      avgCostCents = 200,000 / 15 = 13,333.33... ≈ 13,333 cents
 *      avgCost = $133.33
 *   
 *   6. Update position:
 *      position = {
 *        symbol: 'AAPL',
 *        shares: 15,
 *        avgCost: 133.33
 *      }
 *   
 *   7. Create trade:
 *      trade = {
 *        id: '...',
 *        symbol: 'AAPL',
 *        type: 'BUY',
 *        quantity: 10,
 *        executedPrice: 150,
 *        total: 1500,
 *        status: 'executed'
 *      }
 * 
 * Final State:
 *   Portfolio:
 *     cash: $8,500 (was $10,000)
 *     positions: { AAPL: { shares: 15, avgCost: 133.33 } }
 *   
 *   Trade:
 *     { type: 'BUY', quantity: 10, executedPrice: 150, total: 1500 }
 * ============================================================================
 */

/**
 * ============================================================================
 * EDGE CASES HANDLED
 * ============================================================================
 * 
 * 1. First Purchase (No Existing Position):
 *    - oldShares = 0
 *    - avgCost = price (no calculation needed)
 *    - Create new position
 * 
 * 2. Adding to Existing Position:
 *    - Calculate weighted average cost
 *    - Update shares and avgCost
 * 
 * 3. Precision Rounding:
 *    - All calculations in cents
 *    - avgCost rounded to nearest cent
 *    - Example: 13,333.33 cents → 13,333 cents ($133.33)
 * 
 * 4. Overflow Protection:
 *    - safeSubtract() checks for overflow
 *    - calculateTradeTotalCents() checks for overflow
 *    - Throws error if overflow detected
 * 
 * 5. Insufficient Cash:
 *    - Should be caught by validation before execution
 *    - If cash becomes negative, safeSubtract() throws error
 * 
 * 6. Invalid Price/Quantity:
 *    - Should be caught by validation before execution
 *    - If somehow invalid, dollarsToCents() or calculateTradeTotalCents() throws
 * ============================================================================
 */

/**
 * ============================================================================
 * TEST CASES: Buy Execution
 * ============================================================================
 */
export const BuyExecutionTests = {
  /**
   * Test: First purchase (no existing position)
   */
  testFirstPurchase(): boolean {
    const portfolio: Portfolio = {
      cash: 10000,
      positions: {},
      realizedPL: 0,
      initialCash: 10000,
    };
    
    const request: TradeRequest = {
      symbol: 'AAPL',
      type: 'BUY',
      quantity: 10,
      price: 150,
    };
    
    const result = executeBuyTrade(portfolio, request, 'test-1', Date.now());
    
    // Check cash deducted
    if (Math.abs(result.portfolio.cash - 8500) > 0.01) {
      console.error('Cash not deducted correctly');
      return false;
    }
    
    // Check position created
    const position = result.portfolio.positions['AAPL'];
    if (!position || position.shares !== 10 || Math.abs(position.avgCost - 150) > 0.01) {
      console.error('Position not created correctly');
      return false;
    }
    
    // Check trade record
    if (result.trade.type !== 'BUY' || result.trade.quantity !== 10) {
      console.error('Trade record incorrect');
      return false;
    }
    
    return true;
  },
  
  /**
   * Test: Adding to existing position (average cost calculation)
   */
  testAddToPosition(): boolean {
    const portfolio: Portfolio = {
      cash: 10000,
      positions: {
        AAPL: { symbol: 'AAPL', shares: 5, avgCost: 100 },
      },
      realizedPL: 0,
      initialCash: 10000,
    };
    
    const request: TradeRequest = {
      symbol: 'AAPL',
      type: 'BUY',
      quantity: 10,
      price: 150,
    };
    
    const result = executeBuyTrade(portfolio, request, 'test-2', Date.now());
    
    // Check cash
    if (Math.abs(result.portfolio.cash - 8500) > 0.01) {
      console.error('Cash incorrect after adding to position');
      return false;
    }
    
    // Check position updated
    const position = result.portfolio.positions['AAPL'];
    if (!position || position.shares !== 15) {
      console.error('Shares not updated correctly');
      return false;
    }
    
    // Check average cost: (100*5 + 150*10) / 15 = 133.33
    if (Math.abs(position.avgCost - 133.33) > 0.01) {
      console.error(`Average cost incorrect: ${position.avgCost} (expected 133.33)`);
      return false;
    }
    
    return true;
  },
  
  /**
   * Test: Multiple positions
   */
  testMultiplePositions(): boolean {
    const portfolio: Portfolio = {
      cash: 20000,
      positions: {
        AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150 },
      },
      realizedPL: 0,
      initialCash: 20000,
    };
    
    const request: TradeRequest = {
      symbol: 'GOOGL',
      type: 'BUY',
      quantity: 5,
      price: 140,
    };
    
    const result = executeBuyTrade(portfolio, request, 'test-3', Date.now());
    
    // Check both positions exist
    if (!result.portfolio.positions['AAPL'] || !result.portfolio.positions['GOOGL']) {
      console.error('Multiple positions not maintained');
      return false;
    }
    
    // Check AAPL position unchanged
    const aaplPosition = result.portfolio.positions['AAPL'];
    if (aaplPosition.shares !== 10 || Math.abs(aaplPosition.avgCost - 150) > 0.01) {
      console.error('Existing position modified incorrectly');
      return false;
    }
    
    // Check GOOGL position created
    const googlPosition = result.portfolio.positions['GOOGL'];
    if (googlPosition.shares !== 5 || Math.abs(googlPosition.avgCost - 140) > 0.01) {
      console.error('New position incorrect');
      return false;
    }
    
    return true;
  },
  
  /**
   * Run all tests
   */
  runAll(): boolean {
    console.log('[BuyExecution] Running tests...');
    
    const results = [
      this.testFirstPurchase(),
      this.testAddToPosition(),
      this.testMultiplePositions(),
    ];
    
    const allPassed = results.every(r => r);
    
    if (allPassed) {
      console.log('[BuyExecution] ✓ All tests passed');
    } else {
      console.error('[BuyExecution] ✗ Some tests failed');
    }
    
    return allPassed;
  },
};
