/**
 * ============================================================================
 * Trade Engine Unit Tests (Jest)
 * ============================================================================
 * 
 * Comprehensive unit tests for TradeEngine module using Jest framework.
 * 
 * Test Coverage:
 * 1. Portfolio State Management
 * 2. Buy Trade Execution
 * 3. Sell Trade Execution
 * 4. Trade Validation
 * 5. Throttle Protection
 * 6. Portfolio Metrics Calculation
 * 7. State Persistence & Loading
 * 8. Edge Cases & Error Handling
 * 
 * Run: npm test TradeEngine.test.ts
 * ============================================================================
 */

import TradeEngine from '../index';
import type { TradeRequest, Portfolio, Trade } from '@types';

describe('TradeEngine - Core Functionality', () => {
  beforeEach(() => {
    // Use fake timers to control time for throttle
    jest.useFakeTimers();
    // Reset engine state before each test
    TradeEngine.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('1. Portfolio State Management', () => {
    test('should initialize with default portfolio', () => {
      const portfolio = TradeEngine.getPortfolio();
      
      expect(portfolio.cash).toBe(100_000);
      expect(portfolio.initialCash).toBe(100_000);
      expect(portfolio.realizedPL).toBe(0);
      expect(Object.keys(portfolio.positions)).toHaveLength(0);
    });

    test('should return portfolio snapshot (not reference)', () => {
      const portfolio1 = TradeEngine.getPortfolio();
      const portfolio2 = TradeEngine.getPortfolio();
      
      expect(portfolio1).not.toBe(portfolio2); // Different references
      expect(portfolio1).toEqual(portfolio2); // Same values
    });

    test('should initialize with empty trade history', () => {
      const history = TradeEngine.getTradeHistory();
      
      expect(history).toHaveLength(0);
      expect(Array.isArray(history)).toBe(true);
    });

    test('should return frozen trade history (immutable)', () => {
      const history = TradeEngine.getTradeHistory();
      
      expect(Object.isFrozen(history)).toBe(true);
      expect(() => {
        // @ts-expect-error - Testing immutability
        history.push({} as Trade);
      }).toThrow();
    });
  });

  describe('2. Buy Trade Execution', () => {
    test('should execute valid buy trade successfully', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 150.25,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.trade).toBeDefined();
      expect(result.trade?.symbol).toBe('AAPL');
      expect(result.trade?.type).toBe('BUY');
      expect(result.trade?.quantity).toBe(10);
      expect(result.trade?.executedPrice).toBe(150.25);
    });

    test('should deduct correct amount from cash', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 150.00,
        orderType: 'MARKET',
      };

      TradeEngine.executeTrade(request);
      const portfolio = TradeEngine.getPortfolio();

      // Initial: $100,000 - (10 × $150) = $98,500
      expect(portfolio.cash).toBe(98_500);
    });

    test('should create new position for first buy', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 150.00,
        orderType: 'MARKET',
      };

      TradeEngine.executeTrade(request);
      const portfolio = TradeEngine.getPortfolio();

      expect(portfolio.positions['AAPL']).toBeDefined();
      expect(portfolio.positions['AAPL'].shares).toBe(10);
      expect(portfolio.positions['AAPL'].avgCost).toBe(150.00);
    });

    test('should add to existing position with correct average cost', () => {
      // First buy: 10 shares @ $100
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 100.00,
        orderType: 'MARKET',
      });

      // Advance time to bypass throttle
      jest.advanceTimersByTime(1100);

      // Second buy: 20 shares @ $150
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 20,
        price: 150.00,
        orderType: 'MARKET',
      });

      const portfolio = TradeEngine.getPortfolio();
      const position = portfolio.positions['AAPL'];

      expect(position.shares).toBe(30); // 10 + 20
      // Average cost = (10*100 + 20*150) / 30 = (1000 + 3000) / 30 = 133.33
      expect(position.avgCost).toBeCloseTo(133.33, 2);
    });

    test('should record buy trade in history', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 150.00,
        orderType: 'MARKET',
      };

      TradeEngine.executeTrade(request);
      const history = TradeEngine.getTradeHistory();

      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('BUY');
      expect(history[0].symbol).toBe('AAPL');
      expect(history[0].quantity).toBe(10);
    });

    test('should reject buy with insufficient cash', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 1000,
        price: 150.00,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient cash');
      expect(result.trade).toBeUndefined();
    });
  });

  describe('3. Sell Trade Execution', () => {
    beforeEach(() => {
      // Setup: Buy 100 shares of AAPL @ $100
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 100,
        price: 100.00,
        orderType: 'MARKET',
      });
      // Advance time past throttle
      jest.advanceTimersByTime(1100);
    });

    test('should execute valid sell trade successfully', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'SELL',
        quantity: 50,
        price: 120.00,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.trade).toBeDefined();
      expect(result.trade?.type).toBe('SELL');
    });

    test('should add proceeds to cash', () => {
      // Initial cash after buy: $100,000 - $10,000 = $90,000
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'SELL',
        quantity: 50,
        price: 120.00,
        orderType: 'MARKET',
      };

      TradeEngine.executeTrade(request);
      const portfolio = TradeEngine.getPortfolio();

      // Cash: $90,000 + (50 × $120) = $96,000
      expect(portfolio.cash).toBe(96_000);
    });

    test('should reduce position shares after partial sell', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'SELL',
        quantity: 50,
        price: 120.00,
        orderType: 'MARKET',
      };

      TradeEngine.executeTrade(request);
      const portfolio = TradeEngine.getPortfolio();

      expect(portfolio.positions['AAPL'].shares).toBe(50); // 100 - 50
      expect(portfolio.positions['AAPL'].avgCost).toBe(100.00); // Unchanged
    });

    test('should remove position after selling all shares', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'SELL',
        quantity: 100,
        price: 120.00,
        orderType: 'MARKET',
      };

      TradeEngine.executeTrade(request);
      const portfolio = TradeEngine.getPortfolio();

      expect(portfolio.positions['AAPL']).toBeUndefined();
    });

    test('should calculate realized P&L correctly on sell', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'SELL',
        quantity: 50,
        price: 120.00, // Bought at $100, selling at $120
        orderType: 'MARKET',
      };

      TradeEngine.executeTrade(request);
      const portfolio = TradeEngine.getPortfolio();

      // Realized P&L = (120 - 100) × 50 = $1,000
      expect(portfolio.realizedPL).toBe(1_000);
    });

    test('should accumulate realized P&L across multiple sells', () => {
      // First sell: 50 shares @ $120 (profit of $1,000)
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'SELL',
        quantity: 50,
        price: 120.00,
        orderType: 'MARKET',
      });

      jest.advanceTimersByTime(1100);

      // Second sell: 50 shares @ $80 (loss of $1,000)
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'SELL',
        quantity: 50,
        price: 80.00,
        orderType: 'MARKET',
      });

      const portfolio = TradeEngine.getPortfolio();

      // Total realized P&L = $1,000 - $1,000 = $0
      expect(portfolio.realizedPL).toBe(0);
    });

    test('should reject sell with insufficient holdings', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'SELL',
        quantity: 200, // Only have 100
        price: 120.00,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient shares');
    });

    test('should reject sell of non-existent position', () => {
      const request: TradeRequest = {
        symbol: 'GOOGL',
        type: 'SELL',
        quantity: 10,
        price: 140.00,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No position');
    });
  });

  describe('4. Trade Validation', () => {
    test('should reject invalid symbol (empty)', () => {
      const request: TradeRequest = {
        symbol: '',
        type: 'BUY',
        quantity: 10,
        price: 100.00,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Symbol');
    });

    test('should reject invalid symbol (lowercase)', () => {
      const request: TradeRequest = {
        symbol: 'aapl',
        type: 'BUY',
        quantity: 10,
        price: 100.00,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('uppercase');
    });

    test('should reject invalid symbol (special characters)', () => {
      const request: TradeRequest = {
        symbol: 'AAP@L',
        type: 'BUY',
        quantity: 10,
        price: 100.00,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Symbol');
    });

    test('should reject zero quantity', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 0,
        price: 100.00,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Quantity');
    });

    test('should reject negative quantity', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: -10,
        price: 100.00,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Quantity');
    });

    test('should reject fractional quantity', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10.5,
        price: 100.00,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('whole number');
    });

    test('should reject zero price', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 0,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Price');
    });

    test('should reject negative price', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: -100.00,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Price');
    });

    test('should reject invalid trade type', () => {
      const request = {
        symbol: 'AAPL',
        type: 'HOLD', // Invalid
        quantity: 10,
        price: 100.00,
        orderType: 'MARKET',
      } as any;

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('5. Throttle Protection', () => {
    test('should not be throttled initially', () => {
      expect(TradeEngine.isThrottled()).toBe(false);
      expect(TradeEngine.getThrottleRemaining()).toBe(0);
    });

    test('should be throttled immediately after trade', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 100.00,
        orderType: 'MARKET',
      };

      TradeEngine.executeTrade(request);

      expect(TradeEngine.isThrottled()).toBe(true);
      expect(TradeEngine.getThrottleRemaining()).toBeGreaterThan(0);
    });

    test('should reject trade when throttled', () => {
      // First trade
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 100.00,
        orderType: 'MARKET',
      });

      // Immediate second trade should be rejected
      const result = TradeEngine.executeTrade({
        symbol: 'GOOGL',
        type: 'BUY',
        quantity: 10,
        price: 140.00,
        orderType: 'MARKET',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('throttled');
    });

    test('should allow trade after throttle period', () => {
      // First trade
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 100.00,
        orderType: 'MARKET',
      });

      // Advance time past throttle
      jest.advanceTimersByTime(1100);

      // Second trade should succeed
      const result = TradeEngine.executeTrade({
        symbol: 'GOOGL',
        type: 'BUY',
        quantity: 10,
        price: 140.00,
        orderType: 'MARKET',
      });

      expect(result.success).toBe(true);
    });

    test('should decrease throttle remaining over time', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 100.00,
        orderType: 'MARKET',
      };

      TradeEngine.executeTrade(request);

      const remaining1 = TradeEngine.getThrottleRemaining();
      
      jest.advanceTimersByTime(200);
      
      const remaining2 = TradeEngine.getThrottleRemaining();

      expect(remaining2).toBeLessThan(remaining1);
    });
  });

  describe('6. Portfolio Metrics Calculation', () => {
    beforeEach(() => {
      // Setup: Buy positions
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 100.00,
        orderType: 'MARKET',
      });

      jest.advanceTimersByTime(1100);

      TradeEngine.executeTrade({
        symbol: 'GOOGL',
        type: 'BUY',
        quantity: 5,
        price: 140.00,
        orderType: 'MARKET',
      });

      jest.advanceTimersByTime(1100);
    });

    test('should calculate total invested correctly', () => {
      const metrics = TradeEngine.getPortfolioMetrics({
        AAPL: 100.00,
        GOOGL: 140.00,
      });

      // Invested = (10 × $100) + (5 × $140) = $1,700
      expect(metrics.totalInvested).toBe(1_700);
    });

    test('should calculate positions value with current prices', () => {
      const metrics = TradeEngine.getPortfolioMetrics({
        AAPL: 150.00, // Up from $100
        GOOGL: 120.00, // Down from $140
      });

      // Positions value = (10 × $150) + (5 × $120) = $2,100
      expect(metrics.positionsValue).toBe(2_100);
    });

    test('should calculate unrealized P&L correctly', () => {
      const metrics = TradeEngine.getPortfolioMetrics({
        AAPL: 120.00, // +$20 per share
        GOOGL: 150.00, // +$10 per share
      });

      // Unrealized P&L = (10 × $20) + (5 × $10) = $250
      expect(metrics.unrealizedPL).toBe(250);
    });

    test('should calculate total value (cash + positions)', () => {
      const metrics = TradeEngine.getPortfolioMetrics({
        AAPL: 120.00,
        GOOGL: 150.00,
      });

      const portfolio = TradeEngine.getPortfolio();
      const expected = portfolio.cash + (10 * 120) + (5 * 150);
      
      expect(metrics.totalValue).toBe(expected);
    });

    test('should calculate total P&L (realized + unrealized)', () => {
      // Sell some shares to create realized P&L
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'SELL',
        quantity: 5,
        price: 120.00, // Profit of $100
        orderType: 'MARKET',
      });

      const metrics = TradeEngine.getPortfolioMetrics({
        AAPL: 120.00,
        GOOGL: 150.00,
      });

      const portfolio = TradeEngine.getPortfolio();
      const expected = portfolio.realizedPL + metrics.unrealizedPL;
      
      expect(metrics.totalPL).toBe(expected);
    });
  });

  describe('7. State Persistence & Loading', () => {
    test('should load portfolio from saved state', () => {
      const savedPortfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 20, avgCost: 150.00 },
        },
        realizedPL: 500,
        initialCash: 100_000,
      };

      TradeEngine.loadPortfolio(savedPortfolio);
      const loaded = TradeEngine.getPortfolio();

      expect(loaded.cash).toBe(50_000);
      expect(loaded.positions.AAPL.shares).toBe(20);
      expect(loaded.realizedPL).toBe(500);
    });

    test('should load trade history from saved state', () => {
      const savedHistory: Trade[] = [
        {
          id: 'test-1',
          symbol: 'AAPL',
          type: 'BUY',
          orderType: 'MARKET',
          quantity: 10,
          executedPrice: 100.00,
          total: 1000.00,
          createdAt: Date.now(),
          executedAt: Date.now(),
          status: 'executed',
        },
      ];

      TradeEngine.loadTradeHistory(savedHistory);
      const loaded = TradeEngine.getTradeHistory();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].symbol).toBe('AAPL');
    });

    test('should load complete state with loadState()', () => {
      const savedPortfolio: Portfolio = {
        cash: 75_000,
        positions: {},
        realizedPL: 0,
        initialCash: 100_000,
      };

      const savedHistory: Trade[] = [];

      TradeEngine.loadState(savedPortfolio, savedHistory);

      const portfolio = TradeEngine.getPortfolio();
      const history = TradeEngine.getTradeHistory();

      expect(portfolio.cash).toBe(75_000);
      expect(history).toHaveLength(0);
    });

    test('should preserve loaded state across operations', () => {
      const savedPortfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 100.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      TradeEngine.loadPortfolio(savedPortfolio);

      // Execute a new trade
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'SELL',
        quantity: 5,
        price: 120.00,
        orderType: 'MARKET',
      });

      const portfolio = TradeEngine.getPortfolio();

      expect(portfolio.positions.AAPL.shares).toBe(5);
      expect(portfolio.cash).toBe(50_000 + 600); // Added proceeds
    });
  });

  describe('8. Edge Cases & Error Handling', () => {
    test('should handle precision with large quantities', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 1000,
        price: 99.99,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(true);
      
      const portfolio = TradeEngine.getPortfolio();
      expect(portfolio.cash).toBe(100_000 - 99_990);
    });

    test('should handle prices with many decimals', () => {
      const request: TradeRequest = {
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 123.456789,
        orderType: 'MARKET',
      };

      const result = TradeEngine.executeTrade(request);

      expect(result.success).toBe(true);
      expect(result.trade?.executedPrice).toBe(123.456789);
    });

    test('should handle multiple positions correctly', () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META'];

      symbols.forEach(symbol => {
        TradeEngine.executeTrade({
          symbol,
          type: 'BUY',
          quantity: 10,
          price: 100.00,
          orderType: 'MARKET',
        });
        jest.advanceTimersByTime(1100);
      });

      const portfolio = TradeEngine.getPortfolio();

      expect(Object.keys(portfolio.positions)).toHaveLength(5);
      symbols.forEach(symbol => {
        expect(portfolio.positions[symbol].shares).toBe(10);
      });
    });

    test('should handle rapid state changes correctly', () => {
      // Buy then immediately sell
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 100.00,
        orderType: 'MARKET',
      });

      // Advance time past throttle
      jest.advanceTimersByTime(1100);

      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'SELL',
        quantity: 10,
        price: 100.00,
        orderType: 'MARKET',
      });

      const portfolio = TradeEngine.getPortfolio();
      expect(portfolio.positions['AAPL']).toBeUndefined();
      expect(portfolio.realizedPL).toBe(0); // Break even
    });

    test('should maintain data integrity after errors', () => {
      const initialPortfolio = TradeEngine.getPortfolio();

      // Attempt invalid trade
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10000,
        price: 1000.00,
        orderType: 'MARKET',
      });

      const afterErrorPortfolio = TradeEngine.getPortfolio();

      expect(afterErrorPortfolio).toEqual(initialPortfolio);
    });

    test('should reset to clean state', () => {
      // Perform multiple trades
      TradeEngine.executeTrade({
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 100.00,
        orderType: 'MARKET',
      });

      jest.advanceTimersByTime(1100);

      TradeEngine.reset();

      const portfolio = TradeEngine.getPortfolio();
      const history = TradeEngine.getTradeHistory();

      expect(portfolio.cash).toBe(100_000);
      expect(Object.keys(portfolio.positions)).toHaveLength(0);
      expect(history).toHaveLength(0);
    });
  });
});
