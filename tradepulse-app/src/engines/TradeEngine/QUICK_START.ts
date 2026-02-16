/**
 * ============================================================================
 * Trade Engine - Quick Start Guide
 * ============================================================================
 * 
 * This file provides a quick reference for using the Trade Execution Engine.
 * For detailed documentation, see README.md
 * ============================================================================
 */

import TradeEngine from '@engines/TradeEngine';
import type { TradeRequest, TradeResult, Portfolio } from '@types';

/**
 * ============================================================================
 * BASIC USAGE
 * ============================================================================
 */

// Example 1: Execute a BUY trade
function buyStock() {
  const request: TradeRequest = {
    symbol: 'AAPL',
    type: 'BUY',
    quantity: 10,
    price: 150.50,
    orderType: 'MARKET',
  };
  
  const result: TradeResult = TradeEngine.executeTrade(request);
  
  if (result.success) {
    console.log('✅ Trade executed successfully!');
    console.log('Trade ID:', result.trade?.id);
    console.log('Total cost:', result.trade?.total);
  } else {
    console.error('❌ Trade failed:', result.error);
  }
}

// Example 2: Execute a SELL trade
function sellStock() {
  const request: TradeRequest = {
    symbol: 'AAPL',
    type: 'SELL',
    quantity: 5,
    price: 180.25,
    orderType: 'MARKET',
  };
  
  const result: TradeResult = TradeEngine.executeTrade(request);
  
  if (result.success) {
    console.log('✅ Sold successfully!');
    console.log('Proceeds:', result.trade?.total);
    
    // Check realized P&L
    const portfolio = TradeEngine.getPortfolio();
    console.log('Realized P&L:', portfolio.realizedPL);
  } else {
    console.error('❌ Sell failed:', result.error);
  }
}

/**
 * ============================================================================
 * PORTFOLIO MANAGEMENT
 * ============================================================================
 */

// Example 3: Get current portfolio state
function checkPortfolio() {
  const portfolio: Portfolio = TradeEngine.getPortfolio();
  
  console.log('Cash:', portfolio.cash);
  console.log('Positions:', portfolio.positions);
  console.log('Realized P&L:', portfolio.realizedPL);
  
  // Iterate through positions
  for (const symbol in portfolio.positions) {
    const position = portfolio.positions[symbol];
    console.log(`${symbol}: ${position.shares} shares @ $${position.avgCost} avg cost`);
  }
}

// Example 4: Calculate portfolio metrics with current prices
function calculateMetrics() {
  // Get current prices from PriceEngine or API
  const currentPrices = {
    AAPL: 180.50,
    GOOGL: 145.75,
    MSFT: 385.20,
  };
  
  const metrics = TradeEngine.getPortfolioMetrics(currentPrices);
  
  console.log('Total Value:', metrics.totalValue);
  console.log('Total P&L:', metrics.totalPL);
  console.log('Total P&L %:', metrics.totalPLPercent.toFixed(2) + '%');
  console.log('Unrealized P&L:', metrics.unrealizedPL);
  console.log('Realized P&L:', metrics.realizedPL);
  console.log('Cash %:', metrics.cashPercent.toFixed(2) + '%');
}

/**
 * ============================================================================
 * TRADE HISTORY
 * ============================================================================
 */

// Example 5: Get trade history
function viewTradeHistory() {
  const history = TradeEngine.getTradeHistory();
  
  console.log(`Total trades: ${history.length}`);
  
  // Show last 5 trades
  const recentTrades = history.slice(-5);
  recentTrades.forEach(trade => {
    const date = new Date(trade.executedAt).toLocaleString();
    console.log(`${date}: ${trade.type} ${trade.quantity} ${trade.symbol} @ $${trade.executedPrice}`);
  });
}

/**
 * ============================================================================
 * ERROR HANDLING
 * ============================================================================
 */

// Example 6: Handle validation errors
function handleErrors() {
  const result = TradeEngine.executeTrade({
    symbol: 'AAPL',
    type: 'BUY',
    quantity: 1000,
    price: 150,
    orderType: 'MARKET',
  });
  
  if (!result.success) {
    // Check error type
    if (result.error?.includes('Insufficient cash')) {
      console.error('Not enough cash to complete trade');
      // Show user how much more they need
    } else if (result.error?.includes('Insufficient shares')) {
      console.error('Not enough shares to sell');
    } else if (result.error?.includes('throttled')) {
      console.error('Please wait before trading again');
      const remaining = TradeEngine.getThrottleRemaining();
      console.log(`Wait ${Math.ceil(remaining / 1000)} seconds`);
    } else {
      console.error('Trade validation failed:', result.error);
    }
  }
}

/**
 * ============================================================================
 * VALIDATION BEFORE SUBMITTING
 * ============================================================================
 */

// Example 7: Pre-validate before submitting trade
function preValidateTrade(request: TradeRequest): boolean {
  const portfolio = TradeEngine.getPortfolio();
  
  // Check throttle
  if (TradeEngine.isThrottled()) {
    const remaining = TradeEngine.getThrottleRemaining();
    alert(`Please wait ${Math.ceil(remaining / 1000)} second(s)`);
    return false;
  }
  
  // Check sufficient cash for BUY
  if (request.type === 'BUY') {
    const cost = request.price * request.quantity;
    if (portfolio.cash < cost) {
      alert(`Insufficient cash. Need $${cost.toFixed(2)}, have $${portfolio.cash.toFixed(2)}`);
      return false;
    }
  }
  
  // Check sufficient holdings for SELL
  if (request.type === 'SELL') {
    const position = portfolio.positions[request.symbol];
    if (!position || position.shares < request.quantity) {
      const have = position?.shares || 0;
      alert(`Insufficient shares. Trying to sell ${request.quantity}, have ${have}`);
      return false;
    }
  }
  
  return true;
}

/**
 * ============================================================================
 * PERSISTENCE
 * ============================================================================
 */

// Example 8: Save and load state
function saveState() {
  const portfolio = TradeEngine.getPortfolio();
  const history = TradeEngine.getTradeHistory();
  
  // Save to localStorage or backend
  localStorage.setItem('portfolio', JSON.stringify(portfolio));
  localStorage.setItem('tradeHistory', JSON.stringify(history));
}

function loadState() {
  const savedPortfolio = localStorage.getItem('portfolio');
  const savedHistory = localStorage.getItem('tradeHistory');
  
  if (savedPortfolio) {
    TradeEngine.loadPortfolio(JSON.parse(savedPortfolio));
  }
  
  if (savedHistory) {
    TradeEngine.loadTradeHistory(JSON.parse(savedHistory));
  }
}

/**
 * ============================================================================
 * TESTING
 * ============================================================================
 */

// Example 9: Reset for testing
function resetForTesting() {
  TradeEngine.reset();
  console.log('Engine reset to initial state');
  
  const portfolio = TradeEngine.getPortfolio();
  console.log('Cash:', portfolio.cash); // $100,000
  console.log('Positions:', Object.keys(portfolio.positions).length); // 0
}

/**
 * ============================================================================
 * COMPLETE TRADING WORKFLOW
 * ============================================================================
 */

// Example 10: Complete workflow
function completeTradingWorkflow() {
  console.log('=== Trading Workflow Demo ===\n');
  
  // Step 1: Check initial state
  console.log('1. Initial portfolio:');
  checkPortfolio();
  
  // Step 2: Execute buy
  console.log('\n2. Buying 10 AAPL @ $150...');
  const buyResult = TradeEngine.executeTrade({
    symbol: 'AAPL',
    type: 'BUY',
    quantity: 10,
    price: 150,
    orderType: 'MARKET',
  });
  console.log('Result:', buyResult.success ? '✅ Success' : '❌ Failed');
  
  // Step 3: Check updated portfolio
  console.log('\n3. Updated portfolio:');
  checkPortfolio();
  
  // Step 4: Calculate metrics
  console.log('\n4. Portfolio metrics (AAPL @ $160):');
  const metrics = TradeEngine.getPortfolioMetrics({ AAPL: 160 });
  console.log('Unrealized P&L:', metrics.unrealizedPL);
  
  // Step 5: Execute sell
  console.log('\n5. Selling 5 AAPL @ $180...');
  const sellResult = TradeEngine.executeTrade({
    symbol: 'AAPL',
    type: 'SELL',
    quantity: 5,
    price: 180,
    orderType: 'MARKET',
  });
  console.log('Result:', sellResult.success ? '✅ Success' : '❌ Failed');
  
  // Step 6: Check final state
  console.log('\n6. Final portfolio:');
  checkPortfolio();
  
  // Step 7: View history
  console.log('\n7. Trade history:');
  viewTradeHistory();
}

/**
 * ============================================================================
 * COMMON PATTERNS
 * ============================================================================
 */

// Pattern 1: Safe trade execution with error handling
function safeTrade(request: TradeRequest): boolean {
  // Pre-validate
  if (!preValidateTrade(request)) {
    return false;
  }
  
  // Execute
  const result = TradeEngine.executeTrade(request);
  
  // Handle result
  if (result.success) {
    console.log(`✅ ${request.type} ${request.quantity} ${request.symbol} successful`);
    saveState(); // Persist
    return true;
  } else {
    console.error(`❌ Trade failed: ${result.error}`);
    return false;
  }
}

// Pattern 2: Batch position check
function getAllPositionValues(currentPrices: Record<string, number>): void {
  const portfolio = TradeEngine.getPortfolio();
  
  console.log('Portfolio Positions:');
  console.log('─'.repeat(60));
  
  for (const symbol in portfolio.positions) {
    const position = portfolio.positions[symbol];
    const currentPrice = currentPrices[symbol] || position.avgCost;
    
    const currentValue = position.shares * currentPrice;
    const costBasis = position.shares * position.avgCost;
    const unrealizedPL = currentValue - costBasis;
    const unrealizedPLPercent = (unrealizedPL / costBasis) * 100;
    
    console.log(`${symbol.padEnd(10)} ${position.shares} shares`);
    console.log(`  Avg Cost: $${position.avgCost.toFixed(2)}`);
    console.log(`  Current: $${currentPrice.toFixed(2)}`);
    console.log(`  Value: $${currentValue.toFixed(2)}`);
    console.log(`  Unrealized P&L: $${unrealizedPL.toFixed(2)} (${unrealizedPLPercent.toFixed(2)}%)`);
    console.log('─'.repeat(60));
  }
}

// Pattern 3: Trade validation summary
function validateTradeWithDetails(request: TradeRequest): void {
  console.log('Trade Validation:');
  console.log('─'.repeat(60));
  
  // Symbol
  const symbolValid = /^[A-Z0-9.]{1,10}$/.test(request.symbol);
  console.log(`Symbol (${request.symbol}): ${symbolValid ? '✅' : '❌'}`);
  
  // Quantity
  const quantityValid = Number.isInteger(request.quantity) && request.quantity > 0;
  console.log(`Quantity (${request.quantity}): ${quantityValid ? '✅' : '❌'}`);
  
  // Price
  const priceValid = request.price >= 0.01 && request.price <= 1_000_000;
  console.log(`Price ($${request.price}): ${priceValid ? '✅' : '❌'}`);
  
  // Financial constraints
  const portfolio = TradeEngine.getPortfolio();
  
  if (request.type === 'BUY') {
    const cost = request.price * request.quantity;
    const cashValid = portfolio.cash >= cost;
    console.log(`Cash ($${portfolio.cash.toFixed(2)} >= $${cost.toFixed(2)}): ${cashValid ? '✅' : '❌'}`);
  } else {
    const position = portfolio.positions[request.symbol];
    const sharesValid = position && position.shares >= request.quantity;
    console.log(`Holdings (${position?.shares || 0} >= ${request.quantity}): ${sharesValid ? '✅' : '❌'}`);
  }
  
  console.log('─'.repeat(60));
}

/**
 * ============================================================================
 * EXPORT EXAMPLES
 * ============================================================================
 */

export const TradeEngineExamples = {
  // Basic operations
  buyStock,
  sellStock,
  checkPortfolio,
  calculateMetrics,
  viewTradeHistory,
  
  // Error handling
  handleErrors,
  preValidateTrade,
  
  // Persistence
  saveState,
  loadState,
  
  // Testing
  resetForTesting,
  
  // Workflows
  completeTradingWorkflow,
  safeTrade,
  getAllPositionValues,
  validateTradeWithDetails,
};

export default TradeEngineExamples;
