/**
 * ============================================================================
 * Trade Validation Functions
 * ============================================================================
 * 
 * Validates trade requests before execution to prevent invalid trades.
 * 
 * VALIDATION RULES:
 * 1. Balance Check: Sufficient cash for BUY orders
 * 2. Holdings Check: Sufficient shares for SELL orders
 * 3. Quantity Check: Positive integer quantity
 * 4. Price Check: Positive price
 * 5. Symbol Check: Valid symbol format
 * 6. Order Type Check: MARKET or LIMIT
 * 7. Trade Type Check: BUY or SELL
 * ============================================================================
 */

import type { Portfolio, TradeRequest, TradeValidation } from '@types';
import {
  dollarsToCents,
  calculateTradeTotalCents,
  isValidAmountCents,
  isValidQuantity,
} from './financialMath';

/**
 * ============================================================================
 * VALIDATION 1: Symbol Format
 * ============================================================================
 * 
 * Rules:
 *   - Must be non-empty string
 *   - Must be 1-10 characters
 *   - Must contain only uppercase letters and numbers
 *   - Common format: AAPL, GOOGL, MSFT, BRK.B
 * 
 * Examples:
 *   Valid: "AAPL", "GOOGL", "MSFT", "BRK", "SPY"
 *   Invalid: "", "a", "TOOLONGNAME", "invalid@"
 * ============================================================================
 */
export function validateSymbol(symbol: string): TradeValidation {
  if (!symbol || typeof symbol !== 'string') {
    return {
      isValid: false,
      error: 'Symbol must be a non-empty string',
    };
  }
  
  const trimmed = symbol.trim();
  
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Symbol cannot be empty',
    };
  }
  
  if (trimmed.length > 10) {
    return {
      isValid: false,
      error: 'Symbol must be 10 characters or less',
    };
  }
  
  // Allow alphanumeric characters and dots (for special symbols like BRK.B)
  if (!/^[A-Z0-9.]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Symbol must contain only uppercase letters, numbers, and dots',
    };
  }
  
  return { isValid: true };
}

/**
 * ============================================================================
 * VALIDATION 2: Trade Quantity
 * ============================================================================
 * 
 * Rules:
 *   - Must be a positive integer
 *   - Must be within safe integer range
 *   - No fractional shares (for simplicity)
 * 
 * Examples:
 *   Valid: 1, 10, 100, 1000
 *   Invalid: 0, -5, 1.5, NaN, Infinity
 * ============================================================================
 */
export function validateQuantity(quantity: number): TradeValidation {
  if (!Number.isFinite(quantity)) {
    return {
      isValid: false,
      error: 'Quantity must be a finite number',
    };
  }
  
  if (!Number.isInteger(quantity)) {
    return {
      isValid: false,
      error: 'Quantity must be a whole number (no fractional shares)',
    };
  }
  
  if (quantity <= 0) {
    return {
      isValid: false,
      error: 'Quantity must be greater than 0',
    };
  }
  
  if (!isValidQuantity(quantity)) {
    return {
      isValid: false,
      error: 'Quantity is too large or invalid',
    };
  }
  
  return { isValid: true };
}

/**
 * ============================================================================
 * VALIDATION 3: Trade Price
 * ============================================================================
 * 
 * Rules:
 *   - Must be a positive number
 *   - Must be finite
 *   - Can have decimals (e.g., $123.45)
 *   - Must be greater than $0.01 (minimum 1 cent)
 *   - Must be less than $1,000,000 (sanity check)
 * 
 * Examples:
 *   Valid: 0.01, 1.00, 100.50, 999.99
 *   Invalid: 0, -5, NaN, Infinity, 0.001
 * ============================================================================
 */
export function validatePrice(price: number): TradeValidation {
  if (!Number.isFinite(price)) {
    return {
      isValid: false,
      error: 'Price must be a finite number',
    };
  }
  
  if (price < 0.01) {
    return {
      isValid: false,
      error: 'Price must be at least $0.01',
    };
  }
  
  if (price > 1_000_000) {
    return {
      isValid: false,
      error: 'Price exceeds maximum allowed ($1,000,000)',
    };
  }
  
  // Check if price converts to cents without error
  try {
    const cents = dollarsToCents(price);
    if (!isValidAmountCents(cents)) {
      return {
        isValid: false,
        error: 'Price conversion to cents failed',
      };
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid price',
    };
  }
  
  return { isValid: true };
}

/**
 * ============================================================================
 * VALIDATION 4: Trade Type
 * ============================================================================
 * 
 * Rules:
 *   - Must be either 'BUY' or 'SELL'
 *   - Case-sensitive
 * 
 * Examples:
 *   Valid: "BUY", "SELL"
 *   Invalid: "buy", "sell", "SHORT", ""
 * ============================================================================
 */
export function validateTradeType(type: string): TradeValidation {
  if (type !== 'BUY' && type !== 'SELL') {
    return {
      isValid: false,
      error: 'Trade type must be either "BUY" or "SELL"',
    };
  }
  
  return { isValid: true };
}

/**
 * ============================================================================
 * VALIDATION 5: Order Type
 * ============================================================================
 * 
 * Rules:
 *   - Must be either 'MARKET' or 'LIMIT'
 *   - Case-sensitive
 *   - For this implementation, we primarily support MARKET orders
 * 
 * Examples:
 *   Valid: "MARKET", "LIMIT"
 *   Invalid: "market", "STOP", ""
 * ============================================================================
 */
export function validateOrderType(orderType: string | undefined): TradeValidation {
  // Default to MARKET if not specified
  if (!orderType) {
    return { isValid: true };
  }
  
  if (orderType !== 'MARKET' && orderType !== 'LIMIT') {
    return {
      isValid: false,
      error: 'Order type must be either "MARKET" or "LIMIT"',
    };
  }
  
  return { isValid: true };
}

/**
 * ============================================================================
 * VALIDATION 6: Sufficient Cash for BUY
 * ============================================================================
 * 
 * Rules:
 *   - Portfolio cash must be >= trade total
 *   - Trade total = price × quantity
 *   - All calculations in cents to avoid floating point errors
 * 
 * Formula:
 *   totalCents = priceCents × quantity
 *   cashCents >= totalCents
 * 
 * Examples:
 *   Cash: $10,000
 *   Buy: 10 shares @ $100 = $1,000 ✓ (sufficient)
 *   Buy: 200 shares @ $100 = $20,000 ✗ (insufficient)
 * ============================================================================
 */
export function validateSufficientCash(
  portfolio: Portfolio,
  price: number,
  quantity: number
): TradeValidation {
  try {
    // Convert to cents for precision
    const cashCents = dollarsToCents(portfolio.cash);
    const priceCents = dollarsToCents(price);
    const totalCents = calculateTradeTotalCents(priceCents, quantity);
    
    if (cashCents < totalCents) {
      const shortfall = (totalCents - cashCents) / 100;
      return {
        isValid: false,
        error: `Insufficient cash. Need $${(totalCents / 100).toFixed(2)}, have $${portfolio.cash.toFixed(2)} (short $${shortfall.toFixed(2)})`,
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Cash validation failed',
    };
  }
}

/**
 * ============================================================================
 * VALIDATION 7: Sufficient Holdings for SELL
 * ============================================================================
 * 
 * Rules:
 *   - Portfolio must have a position in the symbol
 *   - Position shares must be >= quantity to sell
 *   - Cannot sell more than you own (no short selling)
 * 
 * Examples:
 *   Holdings: 100 shares AAPL
 *   Sell: 50 shares ✓ (sufficient)
 *   Sell: 150 shares ✗ (insufficient)
 *   Sell: GOOGL ✗ (no position)
 * ============================================================================
 */
export function validateSufficientHoldings(
  portfolio: Portfolio,
  symbol: string,
  quantity: number
): TradeValidation {
  const position = portfolio.positions[symbol];
  
  if (!position) {
    return {
      isValid: false,
      error: `No position in ${symbol}. Cannot sell shares you don't own.`,
    };
  }
  
  if (position.shares < quantity) {
    return {
      isValid: false,
      error: `Insufficient shares. Trying to sell ${quantity}, but only have ${position.shares} shares of ${symbol}.`,
    };
  }
  
  return { isValid: true };
}

/**
 * ============================================================================
 * VALIDATION 8: Complete Trade Request Validation
 * ============================================================================
 * 
 * Validates all aspects of a trade request.
 * Returns first validation error encountered, or success if all pass.
 * 
 * Validation Order:
 *   1. Symbol format
 *   2. Trade type (BUY/SELL)
 *   3. Order type (MARKET/LIMIT)
 *   4. Quantity (positive integer)
 *   5. Price (positive, reasonable)
 *   6. Financial constraints (cash for BUY, holdings for SELL)
 * ============================================================================
 */
export function validateTradeRequest(
  request: TradeRequest,
  portfolio: Portfolio
): TradeValidation {
  // 1. Validate symbol
  const symbolCheck = validateSymbol(request.symbol);
  if (!symbolCheck.isValid) return symbolCheck;
  
  // 2. Validate trade type
  const typeCheck = validateTradeType(request.type);
  if (!typeCheck.isValid) return typeCheck;
  
  // 3. Validate order type
  const orderTypeCheck = validateOrderType(request.orderType);
  if (!orderTypeCheck.isValid) return orderTypeCheck;
  
  // 4. Validate quantity
  const quantityCheck = validateQuantity(request.quantity);
  if (!quantityCheck.isValid) return quantityCheck;
  
  // 5. Validate price
  const priceCheck = validatePrice(request.price);
  if (!priceCheck.isValid) return priceCheck;
  
  // 6. Validate financial constraints
  if (request.type === 'BUY') {
    const cashCheck = validateSufficientCash(portfolio, request.price, request.quantity);
    if (!cashCheck.isValid) return cashCheck;
  } else if (request.type === 'SELL') {
    const holdingsCheck = validateSufficientHoldings(portfolio, request.symbol, request.quantity);
    if (!holdingsCheck.isValid) return holdingsCheck;
  }
  
  // All validations passed
  return { isValid: true };
}

/**
 * ============================================================================
 * EDGE CASE VALIDATION: Prevent Duplicate Concurrent Trades
 * ============================================================================
 * 
 * Checks if a trade is already in progress.
 * Used by the main execution engine to prevent race conditions.
 * ============================================================================
 */
export function validateNotExecuting(isExecuting: boolean): TradeValidation {
  if (isExecuting) {
    return {
      isValid: false,
      error: 'A trade is already in progress. Please wait.',
    };
  }
  
  return { isValid: true };
}

/**
 * ============================================================================
 * EDGE CASE VALIDATION: Throttle Check
 * ============================================================================
 * 
 * Checks if enough time has passed since last trade.
 * Prevents rapid-fire trades that could cause issues.
 * ============================================================================
 */
export function validateNotThrottled(
  lastTradeTime: number,
  throttleMs: number
): TradeValidation {
  const elapsed = Date.now() - lastTradeTime;
  
  if (elapsed < throttleMs) {
    const remaining = throttleMs - elapsed;
    return {
      isValid: false,
      error: `Trade throttled. Please wait ${remaining}ms before next trade.`,
    };
  }
  
  return { isValid: true };
}

/**
 * ============================================================================
 * TEST CASES: Validation Logic
 * ============================================================================
 */
export const ValidationTests = {
  testSymbolValidation(): boolean {
    const validSymbols = ['AAPL', 'GOOGL', 'MSFT', 'A', 'BRK.B'];
    const invalidSymbols = ['', 'toolongname', 'invalid@', 'lower'];
    
    for (const symbol of validSymbols) {
      if (!validateSymbol(symbol).isValid) {
        console.error(`Symbol validation failed for valid symbol: ${symbol}`);
        return false;
      }
    }
    
    for (const symbol of invalidSymbols) {
      if (validateSymbol(symbol).isValid) {
        console.error(`Symbol validation passed for invalid symbol: ${symbol}`);
        return false;
      }
    }
    
    return true;
  },
  
  testQuantityValidation(): boolean {
    const validQuantities = [1, 10, 100, 1000];
    const invalidQuantities = [0, -1, 1.5, NaN, Infinity];
    
    for (const qty of validQuantities) {
      if (!validateQuantity(qty).isValid) {
        console.error(`Quantity validation failed for valid quantity: ${qty}`);
        return false;
      }
    }
    
    for (const qty of invalidQuantities) {
      if (validateQuantity(qty).isValid) {
        console.error(`Quantity validation passed for invalid quantity: ${qty}`);
        return false;
      }
    }
    
    return true;
  },
  
  testPriceValidation(): boolean {
    const validPrices = [0.01, 1.00, 100.50, 999.99];
    const invalidPrices = [0, -1, 0.001, NaN, Infinity, 2_000_000];
    
    for (const price of validPrices) {
      if (!validatePrice(price).isValid) {
        console.error(`Price validation failed for valid price: ${price}`);
        return false;
      }
    }
    
    for (const price of invalidPrices) {
      if (validatePrice(price).isValid) {
        console.error(`Price validation passed for invalid price: ${price}`);
        return false;
      }
    }
    
    return true;
  },
  
  testCashValidation(): boolean {
    const portfolio: Portfolio = {
      cash: 10000,
      positions: {},
      realizedPL: 0,
      initialCash: 10000,
    };
    
    // Valid: $1,000 total (10 × $100)
    const valid1 = validateSufficientCash(portfolio, 100, 10);
    if (!valid1.isValid) {
      console.error('Cash validation failed for valid trade');
      return false;
    }
    
    // Invalid: $20,000 total (200 × $100)
    const invalid1 = validateSufficientCash(portfolio, 100, 200);
    if (invalid1.isValid) {
      console.error('Cash validation passed for invalid trade');
      return false;
    }
    
    return true;
  },
  
  testHoldingsValidation(): boolean {
    const portfolio: Portfolio = {
      cash: 10000,
      positions: {
        AAPL: { symbol: 'AAPL', shares: 100, avgCost: 100 },
      },
      realizedPL: 0,
      initialCash: 10000,
    };
    
    // Valid: Sell 50 shares (have 100)
    const valid1 = validateSufficientHoldings(portfolio, 'AAPL', 50);
    if (!valid1.isValid) {
      console.error('Holdings validation failed for valid sell');
      return false;
    }
    
    // Invalid: Sell 150 shares (have 100)
    const invalid1 = validateSufficientHoldings(portfolio, 'AAPL', 150);
    if (invalid1.isValid) {
      console.error('Holdings validation passed for invalid sell');
      return false;
    }
    
    // Invalid: Sell GOOGL (no position)
    const invalid2 = validateSufficientHoldings(portfolio, 'GOOGL', 10);
    if (invalid2.isValid) {
      console.error('Holdings validation passed for non-existent position');
      return false;
    }
    
    return true;
  },
  
  runAll(): boolean {
    console.log('[Validation] Running tests...');
    
    const results = [
      this.testSymbolValidation(),
      this.testQuantityValidation(),
      this.testPriceValidation(),
      this.testCashValidation(),
      this.testHoldingsValidation(),
    ];
    
    const allPassed = results.every(r => r);
    
    if (allPassed) {
      console.log('[Validation] ✓ All tests passed');
    } else {
      console.error('[Validation] ✗ Some tests failed');
    }
    
    return allPassed;
  },
};
