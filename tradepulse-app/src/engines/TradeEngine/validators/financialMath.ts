/**
 * ============================================================================
 * Financial Math Utilities - Precision Arithmetic
 * ============================================================================
 * 
 * CRITICAL: Financial calculations must avoid floating-point errors.
 * 
 * PROBLEM:
 *   0.1 + 0.2 = 0.30000000000000004 (JavaScript floating point)
 *   $100.50 * 3 = $301.49999999999994 (incorrect!)
 * 
 * SOLUTION:
 *   Work in CENTS (integers) to avoid floating point errors
 *   $100.50 → 10050 cents
 *   10050 * 3 = 30150 cents → $301.50 (correct!)
 * 
 * CONVERSION:
 *   Dollars → Cents: multiply by 100, round to nearest integer
 *   Cents → Dollars: divide by 100 (safe, result is exact)
 * 
 * PRECISION:
 *   All calculations use integers (cents)
 *   Convert to/from dollars only at boundaries (input/output)
 *   Never mix dollar and cent calculations
 * ============================================================================
 */

/**
 * ============================================================================
 * FORMULA 1: Dollar to Cent Conversion
 * ============================================================================
 * 
 * cents = Math.round(dollars * 100)
 * 
 * Examples:
 *   $123.45 → 12345 cents
 *   $0.01 → 1 cent
 *   $1000.00 → 100000 cents
 *   $99.999 → 10000 cents (rounded)
 * 
 * Why round?
 *   - Input may have sub-cent precision ($1.234567)
 *   - Round to nearest cent (standard financial practice)
 *   - Math.round() uses banker's rounding for .5
 * ============================================================================
 */
export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) {
    throw new Error('Invalid dollar amount: must be finite number');
  }
  
  // Convert to cents with rounding
  const cents = Math.round(dollars * 100);
  
  // Sanity check: prevent overflow
  if (Math.abs(cents) > Number.MAX_SAFE_INTEGER) {
    throw new Error('Dollar amount too large to convert safely');
  }
  
  return cents;
}

/**
 * ============================================================================
 * FORMULA 2: Cent to Dollar Conversion
 * ============================================================================
 * 
 * dollars = cents / 100
 * 
 * Examples:
 *   12345 cents → $123.45
 *   1 cent → $0.01
 *   100000 cents → $1000.00
 * 
 * Safe Division:
 *   Division by constant (100) is exact in floating point
 *   No precision loss when converting cents to dollars
 * ============================================================================
 */
export function centsToDollars(cents: number): number {
  if (!Number.isFinite(cents)) {
    throw new Error('Invalid cent amount: must be finite number');
  }
  
  if (!Number.isInteger(cents)) {
    throw new Error('Invalid cent amount: must be integer');
  }
  
  return cents / 100;
}

/**
 * ============================================================================
 * FORMULA 3: Trade Total Calculation (in cents)
 * ============================================================================
 * 
 * totalCents = priceCents * quantity
 * 
 * Where:
 *   - priceCents: Price per share in cents (integer)
 *   - quantity: Number of shares (integer)
 *   - totalCents: Total cost in cents (integer)
 * 
 * Examples:
 *   10050 cents × 10 shares = 100500 cents ($1,005.00)
 *   12345 cents × 5 shares = 61725 cents ($617.25)
 * 
 * No Floating Point:
 *   Integer multiplication is exact
 *   No rounding needed
 *   Result is always exact
 * ============================================================================
 */
export function calculateTradeTotalCents(priceCents: number, quantity: number): number {
  if (!Number.isInteger(priceCents) || !Number.isInteger(quantity)) {
    throw new Error('Price and quantity must be integers (in cents)');
  }
  
  if (priceCents <= 0 || quantity <= 0) {
    throw new Error('Price and quantity must be positive');
  }
  
  const total = priceCents * quantity;
  
  // Check for overflow
  if (total > Number.MAX_SAFE_INTEGER) {
    throw new Error('Trade total too large (overflow)');
  }
  
  return total;
}

/**
 * ============================================================================
 * FORMULA 4: Average Cost Calculation (Weighted Average)
 * ============================================================================
 * 
 * newAvgCost = (oldCost × oldShares + newCost × newShares) / totalShares
 * 
 * Where:
 *   - oldCost: Previous average cost per share (cents)
 *   - oldShares: Previous number of shares
 *   - newCost: Cost of new shares (cents per share)
 *   - newShares: Number of new shares
 *   - totalShares: oldShares + newShares
 * 
 * Examples:
 *   Old: 10 shares @ $100/share = $1000 total
 *   New: 5 shares @ $110/share = $550 total
 *   Avg: ($1000 + $550) / 15 shares = $103.33/share
 * 
 * In Cents:
 *   Old: 10 shares @ 10000 cents = 100000 cents
 *   New: 5 shares @ 11000 cents = 55000 cents
 *   Avg: (100000 + 55000) / 15 = 10333.33 cents
 *   Round: 10333 cents = $103.33/share
 * 
 * Calculation Order (to prevent overflow):
 *   1. Calculate old total: oldCost * oldShares
 *   2. Calculate new total: newCost * newShares
 *   3. Add totals
 *   4. Divide by total shares
 *   5. Round to nearest cent
 * ============================================================================
 */
export function calculateAverageCostCents(
  oldAvgCostCents: number,
  oldShares: number,
  newCostCents: number,
  newShares: number
): number {
  if (!Number.isInteger(oldAvgCostCents) || !Number.isInteger(newCostCents)) {
    throw new Error('Costs must be integers (in cents)');
  }
  
  if (!Number.isInteger(oldShares) || !Number.isInteger(newShares)) {
    throw new Error('Shares must be integers');
  }
  
  if (oldShares < 0 || newShares <= 0) {
    throw new Error('Shares must be non-negative (newShares must be positive)');
  }
  
  // Edge case: no previous shares
  if (oldShares === 0) {
    return newCostCents;
  }
  
  // Calculate total values (in cents)
  const oldTotalCents = oldAvgCostCents * oldShares;
  const newTotalCents = newCostCents * newShares;
  const totalCents = oldTotalCents + newTotalCents;
  
  // Check for overflow
  if (totalCents > Number.MAX_SAFE_INTEGER) {
    throw new Error('Total cost too large (overflow)');
  }
  
  // Calculate new average (in cents)
  const totalShares = oldShares + newShares;
  const avgCostCents = totalCents / totalShares;
  
  // Round to nearest cent (standard practice)
  return Math.round(avgCostCents);
}

/**
 * ============================================================================
 * FORMULA 5: Realized P&L Calculation (FIFO)
 * ============================================================================
 * 
 * realizedPL = (sellPrice - avgCost) × quantity
 * 
 * Where:
 *   - sellPrice: Price per share sold (cents)
 *   - avgCost: Average cost basis per share (cents)
 *   - quantity: Number of shares sold
 *   - realizedPL: Profit or loss (cents, can be negative)
 * 
 * Examples:
 *   Bought: 10 shares @ $100 = $1000
 *   Sold: 10 shares @ $110 = $1100
 *   P&L: ($110 - $100) × 10 = $100 profit
 * 
 * In Cents:
 *   Bought: 10 shares @ 10000 cents
 *   Sold: 10 shares @ 11000 cents
 *   P&L: (11000 - 10000) × 10 = 10000 cents = $100
 * 
 * Negative P&L (Loss):
 *   Bought: 10 shares @ $100
 *   Sold: 10 shares @ $90
 *   P&L: ($90 - $100) × 10 = -$100 loss
 * ============================================================================
 */
export function calculateRealizedPLCents(
  sellPriceCents: number,
  avgCostCents: number,
  quantity: number
): number {
  if (!Number.isInteger(sellPriceCents) || !Number.isInteger(avgCostCents)) {
    throw new Error('Prices must be integers (in cents)');
  }
  
  if (!Number.isInteger(quantity)) {
    throw new Error('Quantity must be integer');
  }
  
  if (quantity <= 0) {
    throw new Error('Quantity must be positive');
  }
  
  // Calculate profit/loss per share (can be negative)
  const plPerShareCents = sellPriceCents - avgCostCents;
  
  // Calculate total P&L (can be negative)
  const totalPLCents = plPerShareCents * quantity;
  
  // Check for overflow (both positive and negative)
  if (Math.abs(totalPLCents) > Number.MAX_SAFE_INTEGER) {
    throw new Error('P&L calculation overflow');
  }
  
  return totalPLCents;
}

/**
 * ============================================================================
 * UTILITY: Format Cents as Dollar String
 * ============================================================================
 * 
 * Formats cents as human-readable dollar string with 2 decimal places.
 * 
 * Examples:
 *   12345 cents → "$123.45"
 *   1 cent → "$0.01"
 *   -5000 cents → "-$50.00"
 * ============================================================================
 */
export function formatCentsAsDollars(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error('Cents must be integer');
  }
  
  const dollars = centsToDollars(Math.abs(cents));
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${dollars.toFixed(2)}`;
}

/**
 * ============================================================================
 * UTILITY: Safe Addition (Overflow Check)
 * ============================================================================
 * 
 * Adds two numbers and checks for overflow.
 * Used for balance and portfolio calculations.
 * ============================================================================
 */
export function safeAdd(a: number, b: number): number {
  const result = a + b;
  
  if (!Number.isFinite(result)) {
    throw new Error('Addition resulted in non-finite number');
  }
  
  if (Math.abs(result) > Number.MAX_SAFE_INTEGER) {
    throw new Error('Addition overflow');
  }
  
  return result;
}

/**
 * ============================================================================
 * UTILITY: Safe Subtraction (Overflow Check)
 * ============================================================================
 * 
 * Subtracts two numbers and checks for overflow.
 * Used for balance and portfolio calculations.
 * ============================================================================
 */
export function safeSubtract(a: number, b: number): number {
  const result = a - b;
  
  if (!Number.isFinite(result)) {
    throw new Error('Subtraction resulted in non-finite number');
  }
  
  if (Math.abs(result) > Number.MAX_SAFE_INTEGER) {
    throw new Error('Subtraction overflow');
  }
  
  return result;
}

/**
 * ============================================================================
 * VALIDATION: Check if Amount is Valid
 * ============================================================================
 * 
 * Validates that an amount (in cents) is valid for financial operations.
 * ============================================================================
 */
export function isValidAmountCents(cents: number): boolean {
  return (
    Number.isInteger(cents) &&
    Number.isFinite(cents) &&
    cents >= 0 &&
    cents <= Number.MAX_SAFE_INTEGER
  );
}

/**
 * ============================================================================
 * VALIDATION: Check if Quantity is Valid
 * ============================================================================
 * 
 * Validates that a share quantity is valid for trading.
 * ============================================================================
 */
export function isValidQuantity(quantity: number): boolean {
  return (
    Number.isInteger(quantity) &&
    Number.isFinite(quantity) &&
    quantity > 0 &&
    quantity <= Number.MAX_SAFE_INTEGER
  );
}

/**
 * ============================================================================
 * TEST UTILITIES: Verify Financial Accuracy
 * ============================================================================
 */
export const FinancialMathTests = {
  /**
   * Test: Dollar-Cent conversion round-trip
   */
  testConversion(): boolean {
    const testCases = [0.01, 0.99, 1.00, 100.50, 999.99, 12345.67];
    
    for (const dollars of testCases) {
      const cents = dollarsToCents(dollars);
      const backToDollars = centsToDollars(cents);
      
      // Allow 0.01 cent tolerance for rounding
      if (Math.abs(backToDollars - dollars) > 0.01) {
        console.error(`Conversion failed for ${dollars}`);
        return false;
      }
    }
    
    return true;
  },
  
  /**
   * Test: Average cost calculation
   */
  testAverageCost(): boolean {
    // Test case: Buy 10 @ $100, then 5 @ $110
    const oldCost = dollarsToCents(100);
    const oldShares = 10;
    const newCost = dollarsToCents(110);
    const newShares = 5;
    
    const avgCost = calculateAverageCostCents(oldCost, oldShares, newCost, newShares);
    const avgDollars = centsToDollars(avgCost);
    
    // Expected: $103.33 (rounded from $103.333...)
    const expected = 103.33;
    
    if (Math.abs(avgDollars - expected) > 0.01) {
      console.error(`Average cost test failed: ${avgDollars} vs ${expected}`);
      return false;
    }
    
    return true;
  },
  
  /**
   * Test: Realized P&L calculation
   */
  testRealizedPL(): boolean {
    // Test case: Buy @ $100, Sell @ $110, 10 shares
    const buyCost = dollarsToCents(100);
    const sellPrice = dollarsToCents(110);
    const quantity = 10;
    
    const pl = calculateRealizedPLCents(sellPrice, buyCost, quantity);
    const plDollars = centsToDollars(pl);
    
    // Expected: $100 profit
    const expected = 100.00;
    
    if (Math.abs(plDollars - expected) > 0.01) {
      console.error(`P&L test failed: ${plDollars} vs ${expected}`);
      return false;
    }
    
    return true;
  },
  
  /**
   * Run all tests
   */
  runAll(): boolean {
    console.log('[FinancialMath] Running tests...');
    
    const results = [
      this.testConversion(),
      this.testAverageCost(),
      this.testRealizedPL(),
    ];
    
    const allPassed = results.every(r => r);
    
    if (allPassed) {
      console.log('[FinancialMath] ✓ All tests passed');
    } else {
      console.error('[FinancialMath] ✗ Some tests failed');
    }
    
    return allPassed;
  },
};
