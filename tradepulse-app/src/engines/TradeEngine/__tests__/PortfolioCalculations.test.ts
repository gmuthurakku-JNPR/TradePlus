/**
 * ============================================================================
 * Portfolio Calculations Unit Tests (Jest)
 * ============================================================================
 * 
 * Comprehensive unit tests for portfolio metrics calculation functions.
 * 
 * Test Coverage:
 * 1. Portfolio Metrics Calculation
 * 2. Position Value Calculation
 * 3. Unrealized P&L Calculation
 * 4. Total P&L Calculation
 * 5. Percentage Calculations
 * 6. Multi-Position Portfolios
 * 7. Edge Cases (no prices, zero values, negative P&L)
 * 8. Precision & Rounding
 * 
 * Run: npm test PortfolioCalculations.test.ts
 * ============================================================================
 */

import { calculatePortfolioMetrics, calculatePositionMetrics } from '../utils/portfolioManager';
import type { Portfolio } from '@types';

describe('Portfolio Calculations', () => {
  describe('1. Basic Portfolio Metrics', () => {
    test('should calculate total value (cash + positions)', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 180.00,
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Total value = $50,000 + (10 × $180) = $51,800
      expect(metrics.totalValue).toBe(51_800);
    });

    test('should calculate total invested (cost basis)', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
          GOOGL: { symbol: 'GOOGL', shares: 5, avgCost: 140.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 180.00,
        GOOGL: 160.00,
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Total invested = (10 × $150) + (5 × $140) = $2,200
      expect(metrics.totalInvested).toBe(2_200);
    });

    test('should calculate positions value', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
          GOOGL: { symbol: 'GOOGL', shares: 5, avgCost: 140.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 180.00,
        GOOGL: 160.00,
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Positions value = (10 × $180) + (5 × $160) = $2,600
      expect(metrics.positionsValue).toBe(2_600);
    });

    test('should calculate cash percentage', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 150.00,
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Total value = $50,000 + (10 × $150) = $51,500
      // Cash % = ($50,000 / $51,500) × 100 = 97.09%
      expect(metrics.cashPercent).toBeCloseTo(97.09, 1);
    });
  });

  describe('2. Unrealized P&L Calculation', () => {
    test('should calculate positive unrealized P&L', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 180.00, // Up $30 per share
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Unrealized P&L = (180 - 150) × 10 = $300
      expect(metrics.unrealizedPL).toBe(300);
    });

    test('should calculate negative unrealized P&L', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 120.00, // Down $30 per share
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Unrealized P&L = (120 - 150) × 10 = -$300
      expect(metrics.unrealizedPL).toBe(-300);
    });

    test('should calculate zero unrealized P&L when price unchanged', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 150.00, // Unchanged
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      expect(metrics.unrealizedPL).toBe(0);
    });

    test('should sum unrealized P&L across multiple positions', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
          GOOGL: { symbol: 'GOOGL', shares: 5, avgCost: 140.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 180.00, // +$30 × 10 = +$300
        GOOGL: 120.00, // -$20 × 5 = -$100
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Total unrealized = $300 - $100 = $200
      expect(metrics.unrealizedPL).toBe(200);
    });
  });

  describe('3. Total P&L Calculation', () => {
    test('should sum realized and unrealized P&L', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
        },
        realizedPL: 500, // Previous trades profit
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 180.00, // Unrealized +$300
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Total P&L = $500 (realized) + $300 (unrealized) = $800
      expect(metrics.totalPL).toBe(800);
    });

    test('should handle negative total P&L', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
        },
        realizedPL: -200, // Previous loss
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 120.00, // Unrealized -$300
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Total P&L = -$200 (realized) + (-$300) (unrealized) = -$500
      expect(metrics.totalPL).toBe(-500);
    });

    test('should calculate total P&L percentage', () => {
      const portfolio: Portfolio = {
        cash: 90_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 100, avgCost: 100.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 120.00, // +$20 per share × 100 = +$2,000
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Total invested = 100 × $100 = $10,000
      // Total P&L = $2,000
      // P&L % = ($2,000 / $10,000) × 100 = 20%
      expect(metrics.totalPLPercent).toBe(20);
    });
  });

  describe('4. Multi-Position Portfolios', () => {
    test('should handle portfolio with 5 positions', () => {
      const portfolio: Portfolio = {
        cash: 20_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
          GOOGL: { symbol: 'GOOGL', shares: 5, avgCost: 140.00 },
          MSFT: { symbol: 'MSFT', shares: 8, avgCost: 380.00 },
          AMZN: { symbol: 'AMZN', shares: 12, avgCost: 175.00 },
          META: { symbol: 'META', shares: 6, avgCost: 320.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 150.00,
        GOOGL: 140.00,
        MSFT: 380.00,
        AMZN: 175.00,
        META: 320.00,
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Total invested = 1500 + 700 + 3040 + 2100 + 1920 = $9,260
      expect(metrics.totalInvested).toBe(9_260);
      
      // Unrealized P&L = 0 (all at cost)
      expect(metrics.unrealizedPL).toBe(0);
    });

    test('should correctly aggregate gains and losses', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          WINNER1: { symbol: 'WINNER1', shares: 10, avgCost: 100.00 },
          WINNER2: { symbol: 'WINNER2', shares: 10, avgCost: 100.00 },
          LOSER1: { symbol: 'LOSER1', shares: 10, avgCost: 100.00 },
          LOSER2: { symbol: 'LOSER2', shares: 10, avgCost: 100.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        WINNER1: 150.00, // +$500
        WINNER2: 140.00, // +$400
        LOSER1: 80.00, // -$200
        LOSER2: 70.00, // -$300
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Total unrealized = +$500 + $400 - $200 - $300 = $400
      expect(metrics.unrealizedPL).toBe(400);
    });

    test('should handle empty positions', () => {
      const portfolio: Portfolio = {
        cash: 100_000,
        positions: {},
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {};

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      expect(metrics.totalValue).toBe(100_000);
      expect(metrics.totalInvested).toBe(0);
      expect(metrics.unrealizedPL).toBe(0);
      expect(metrics.positionsValue).toBe(0);
    });
  });

  describe('5. Missing Price Handling', () => {
    test('should use average cost when current price unavailable', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {}; // No price for AAPL

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Should use avgCost, so unrealized P&L = 0
      expect(metrics.unrealizedPL).toBe(0);
      
      // Position value = 10 × $150 = $1,500
      expect(metrics.positionsValue).toBe(1_500);
    });

    test('should handle mix of available and unavailable prices', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
          GOOGL: { symbol: 'GOOGL', shares: 5, avgCost: 140.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 180.00, // Available
        // GOOGL missing
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // AAPL unrealized = (180 - 150) × 10 = $300
      // GOOGL unrealized = 0 (no price)
      expect(metrics.unrealizedPL).toBe(300);
    });

    test('should handle zero price (treat as unavailable)', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 0, // Invalid price
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Should treat as unavailable, use avgCost
      expect(metrics.unrealizedPL).toBe(0);
    });
  });

  describe('6. Position-Level Metrics', () => {
    test('should calculate single position metrics', () => {
      const position = { symbol: 'AAPL', shares: 10, avgCost: 150.00 };
      const currentPrice = 180.00;

      const metrics = calculatePositionMetrics(
        position,
        currentPrice
      );

      expect(metrics.symbol).toBe('AAPL');
      expect(metrics.shares).toBe(10);
      expect(metrics.avgCost).toBe(150.00);
      expect(metrics.currentPrice).toBe(180.00);
      expect(metrics.currentValue).toBe(1_800); // 10 × $180
      expect(metrics.costBasis).toBe(1_500); // 10 × $150
      expect(metrics.unrealizedPL).toBe(300); // $1,800 - $1,500
      expect(metrics.unrealizedPLPercent).toBeCloseTo(20, 2); // ($300 / $1,500) × 100
    });

    test('should handle position with loss', () => {
      const position = { symbol: 'AAPL', shares: 10, avgCost: 150.00 };
      const currentPrice = 120.00;

      const metrics = calculatePositionMetrics(
        position,
        currentPrice
      );

      expect(metrics.unrealizedPL).toBe(-300); // (120 - 150) × 10
      expect(metrics.unrealizedPLPercent).toBe(-20);
    });

    test('should handle position with break-even', () => {
      const position = { symbol: 'AAPL', shares: 10, avgCost: 150.00 };
      const currentPrice = 150.00;

      const metrics = calculatePositionMetrics(
        position,
        currentPrice
      );

      expect(metrics.unrealizedPL).toBe(0);
      expect(metrics.unrealizedPLPercent).toBe(0);
    });
  });

  describe('7. Precision & Rounding', () => {
    test('should handle prices with many decimals', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.123456 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 180.987654,
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Should handle precision correctly (rounding to cents during conversion)
      expect(metrics.unrealizedPL).toBeCloseTo(308.70, 2);
    });

    test('should handle very large quantities', () => {
      const portfolio: Portfolio = {
        cash: 10_000,
        positions: {
          PENNY: { symbol: 'PENNY', shares: 100_000, avgCost: 0.50 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        PENNY: 0.75,
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Cost basis = 100,000 × $0.50 = $50,000
      // Market value = 100,000 × $0.75 = $75,000
      // Unrealized P&L = $25,000
      expect(metrics.totalInvested).toBe(50_000);
      expect(metrics.positionsValue).toBe(75_000);
      expect(metrics.unrealizedPL).toBe(25_000);
    });

    test('should handle fractional share prices', () => {
      const portfolio: Portfolio = {
        cash: 95_000,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 100, avgCost: 49.99 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 50.01,
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Unrealized = (50.01 - 49.99) × 100 = $2.00
      expect(metrics.unrealizedPL).toBeCloseTo(2.00, 2);
    });
  });

  describe('8. Edge Cases', () => {
    test('should handle zero cash', () => {
      const portfolio: Portfolio = {
        cash: 0,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 10, avgCost: 150.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 180.00,
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      expect(metrics.totalValue).toBe(1_800);
      expect(metrics.cashPercent).toBe(0);
    });

    test('should handle 100% cash portfolio', () => {
      const portfolio: Portfolio = {
        cash: 100_000,
        positions: {},
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {};

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      expect(metrics.totalValue).toBe(100_000);
      expect(metrics.cashPercent).toBe(100);
      expect(metrics.unrealizedPL).toBe(0);
    });

    test('should handle single share position', () => {
      const portfolio: Portfolio = {
        cash: 99_850,
        positions: {
          AAPL: { symbol: 'AAPL', shares: 1, avgCost: 150.00 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        AAPL: 180.00,
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      expect(metrics.unrealizedPL).toBe(30); // 1 share × $30 gain
    });

    test('should handle negative realized P&L', () => {
      const portfolio: Portfolio = {
        cash: 50_000,
        positions: {},
        realizedPL: -5_000, // Lost money on previous trades
        initialCash: 100_000,
      };

      const currentPrices = {};

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      expect(metrics.totalPL).toBe(-5_000);
      expect(metrics.realizedPL).toBe(-5_000);
    });

    test('should handle very small average costs', () => {
      const portfolio: Portfolio = {
        cash: 99_990,
        positions: {
          PENNY: { symbol: 'PENNY', shares: 1000, avgCost: 0.01 },
        },
        realizedPL: 0,
        initialCash: 100_000,
      };

      const currentPrices = {
        PENNY: 0.02,
      };

      const metrics = calculatePortfolioMetrics(portfolio, currentPrices);

      // Unrealized = (0.02 - 0.01) × 1000 = $10
      expect(metrics.unrealizedPL).toBe(10);
    });
  });
});
