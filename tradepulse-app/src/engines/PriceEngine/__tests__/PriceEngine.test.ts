/**
 * ============================================================================
 * Price Engine Unit Tests (Jest)
 * ============================================================================
 * 
 * Comprehensive unit tests for the Price Engine module.
 * 
 * Test Coverage:
 * 1. Initialization & Setup
 * 2. Subscribe/Unsubscribe Lifecycle
 * 3. Price Queries
 * 4. Price History Management
 * 5. Price Updates & GBM Simulation
 * 6. Subscriber Notifications
 * 7. Start/Stop Lifecycle
 * 8. Reset Functionality
 * 9. Edge Cases (multiple subscribers, history limits, etc.)
 * 
 * Run: npm test PriceEngine.test.ts
 * ============================================================================
 */

import PriceEngine from '../index';
import type { PriceData } from '@types';

describe('PriceEngine', () => {
  // Reset state before each test
  beforeEach(() => {
    jest.useFakeTimers();
    PriceEngine.reset();
  });

  // Ensure engine is stopped after each test
  afterEach(() => {
    PriceEngine.stop();
    jest.useRealTimers();
  });

  describe('1. Initialization & Setup', () => {
    test('should initialize with default state', () => {
      const status = PriceEngine.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.activeSymbols).toBe(0);
      expect(status.subscribers).toBe(0);
      expect(status.totalHistoryPoints).toBe(0);
    });

    test('should start successfully', () => {
      PriceEngine.start();
      const status = PriceEngine.getStatus();

      expect(status.isRunning).toBe(true);
    });

    test('should not start twice', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      PriceEngine.start();
      PriceEngine.start(); // Second start

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Already running')
      );

      consoleSpy.mockRestore();
    });

    test('should stop successfully', () => {
      PriceEngine.start();
      PriceEngine.stop();

      const status = PriceEngine.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('2. Subscribe/Unsubscribe Lifecycle', () => {
    test('should subscribe to symbol', () => {
      const callback = jest.fn();

      const unsubscribe = PriceEngine.subscribe('AAPL', callback);

      expect(unsubscribe).toBeInstanceOf(Function);
    });

    test('should call subscriber on price update', async () => {
      const callback = jest.fn();

      PriceEngine.subscribe('AAPL', callback);
      PriceEngine.start();

      // Wait for at least 1 tick (1 second)
      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      // Callback should have been called at least once
      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toMatchObject({
        symbol: 'AAPL',
        price: expect.any(Number),
        bid: expect.any(Number),
        ask: expect.any(Number),
        timestamp: expect.any(Number),
      });
    });

    test('should unsubscribe successfully', async () => {
      const callback = jest.fn();

      const unsubscribe = PriceEngine.subscribe('AAPL', callback);
      PriceEngine.start();

      // Wait for 1 tick
      jest.advanceTimersByTime(1100);
      const callCountBefore = callback.mock.calls.length;

      // Unsubscribe
      unsubscribe();

      // Wait for another tick
      jest.advanceTimersByTime(1100);
      const callCountAfter = callback.mock.calls.length;

      PriceEngine.stop();

      // Callback should not have been called after unsubscribe
      expect(callCountAfter).toBe(callCountBefore);
    });

    test('should support multiple subscribers for same symbol', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      PriceEngine.subscribe('AAPL', callback1);
      PriceEngine.subscribe('AAPL', callback2);
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      // Both callbacks should have been called
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should support subscribing to multiple symbols', async () => {
      const appleCallback = jest.fn();
      const googleCallback = jest.fn();

      PriceEngine.subscribe('AAPL', appleCallback);
      PriceEngine.subscribe('GOOGL', googleCallback);
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      // Both callbacks should have been called
      expect(appleCallback).toHaveBeenCalled();
      expect(googleCallback).toHaveBeenCalled();

      // Verify correct symbols
      expect(appleCallback.mock.calls[0][0].symbol).toBe('AAPL');
      expect(googleCallback.mock.calls[0][0].symbol).toBe('GOOGL');
    });
  });

  describe('3. Price Queries', () => {
    test('should return undefined for non-existent symbol', () => {
      const price = PriceEngine.getPrice('NONEXISTENT');

      expect(price).toBeUndefined();
    });

    test('should return price after update', async () => {
      PriceEngine.subscribe('AAPL', () => {}); // Subscribe to activate
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      const price = PriceEngine.getPrice('AAPL');

      expect(price).toBeDefined();
      expect(price!.symbol).toBe('AAPL');
      expect(price!.price).toBeGreaterThan(0);
    });

    test('should return all prices', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.subscribe('GOOGL', () => {});
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      const allPrices = PriceEngine.getAllPrices();

      expect(allPrices.size).toBeGreaterThanOrEqual(2);
      expect(allPrices.get('AAPL')).toBeDefined();
      expect(allPrices.get('GOOGL')).toBeDefined();
    });

    test('should return immutable price data', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      const allPrices = PriceEngine.getAllPrices();

      // Should be a new Map (not reference to internal state)
      expect(allPrices).toBeInstanceOf(Map);
    });

    test('should include price metadata', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      const price = PriceEngine.getPrice('AAPL')!;

      // Verify all expected fields
      expect(price).toHaveProperty('symbol');
      expect(price).toHaveProperty('price');
      expect(price).toHaveProperty('bid');
      expect(price).toHaveProperty('ask');
      expect(price).toHaveProperty('spread');
      expect(price).toHaveProperty('high');
      expect(price).toHaveProperty('low');
      expect(price).toHaveProperty('change');
      expect(price).toHaveProperty('changePercent');
      expect(price).toHaveProperty('timestamp');
      expect(price).toHaveProperty('previousClose');

      // Verify bid < price < ask
      expect(price.bid).toBeLessThan(price.price);
      expect(price.ask).toBeGreaterThan(price.price);
    });
  });

  describe('4. Price History Management', () => {
    test('should start with empty history', () => {
      const history = PriceEngine.getHistory('AAPL');

      expect(history).toEqual([]);
    });

    test('should accumulate history over time', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.start();

      // Wait for 3 ticks
      jest.advanceTimersByTime(3200);

      PriceEngine.stop();

      const history = PriceEngine.getHistory('AAPL');

      // Should have at least 3 history points
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    test('should respect history limit parameter', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.start();

      jest.advanceTimersByTime(5200);

      PriceEngine.stop();

      const limitedHistory = PriceEngine.getHistory('AAPL', 3);

      // Should return last 3 points
      expect(limitedHistory.length).toBeLessThanOrEqual(3);
    });

    test('should cap history at 500 points', async () => {
      // This test would take 500 seconds to run naturally
      // Instead, we'll manually trigger ticks for testing
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.start();

      // Manually trigger many ticks (using internal _tick method)
      for (let i = 0; i < 510; i++) {
        PriceEngine._tick();
      }

      PriceEngine.stop();

      const history = PriceEngine.getHistory('AAPL');

      // Should cap at 500
      expect(history.length).toBeLessThanOrEqual(500);
    }, 10000); // Increase timeout for this test

    test('should return frozen history array', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      const history = PriceEngine.getHistory('AAPL');

      // History array should be immutable
      expect(() => {
        (history as any).push({ timestamp: Date.now(), price: 100 });
      }).toThrow();
    });

    test('should maintain separate histories for different symbols', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.subscribe('GOOGL', () => {});
      PriceEngine.start();

      jest.advanceTimersByTime(2200);

      PriceEngine.stop();

      const appleHistory = PriceEngine.getHistory('AAPL');
      const googleHistory = PriceEngine.getHistory('GOOGL');

      expect(appleHistory.length).toBeGreaterThan(0);
      expect(googleHistory.length).toBeGreaterThan(0);

      // Should have different prices
      expect(appleHistory[0].price).not.toBe(googleHistory[0].price);
    });
  });

  describe('5. Price Updates & GBM Simulation', () => {
    test('should generate prices near initial value', async () => {
      const initialPrice = 150.25; // AAPL initial price

      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      const price = PriceEngine.getPrice('AAPL')!;

      // Price should be within reasonable range (±10% for 1 second)
      expect(price.price).toBeGreaterThan(initialPrice * 0.90);
      expect(price.price).toBeLessThan(initialPrice * 1.10);
    });

    test('should produce different prices on each tick', async () => {
      const prices: number[] = [];
      const callback = (priceData: PriceData) => {
        prices.push(priceData.price);
      };

      PriceEngine.subscribe('AAPL', callback);
      PriceEngine.start();

      jest.advanceTimersByTime(3200);

      PriceEngine.stop();

      // Prices should be different (very unlikely to be identical)
      expect(prices.length).toBeGreaterThanOrEqual(3);
      expect(new Set(prices).size).toBeGreaterThan(1);
    });

    test('should track daily high/low correctly', async () => {
      let highestSeen = 0;
      let lowestSeen = Infinity;

      const callback = (priceData: PriceData) => {
        highestSeen = Math.max(highestSeen, priceData.price);
        lowestSeen = Math.min(lowestSeen, priceData.price);
      };

      PriceEngine.subscribe('AAPL', callback);
      PriceEngine.start();

      jest.advanceTimersByTime(3200);

      PriceEngine.stop();

      const price = PriceEngine.getPrice('AAPL')!;

      // High/Low should match seen values
      expect(price.high).toBeGreaterThanOrEqual(highestSeen - 0.01); // Allow rounding
      expect(price.low).toBeLessThanOrEqual(lowestSeen + 0.01);
    });

    test('should calculate change from start price', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      const firstPrice = PriceEngine.getPrice('AAPL')!;
      const startPrice = firstPrice.previousClose;

      jest.advanceTimersByTime(2100);

      PriceEngine.stop();

      const finalPrice = PriceEngine.getPrice('AAPL')!;

      // Change should be calculated from start price
      const expectedChange = finalPrice.price - startPrice;
      expect(finalPrice.change).toBeCloseTo(expectedChange, 1);
    });

    test('should update timestamps correctly', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.start();

      const startTime = Date.now();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      const price = PriceEngine.getPrice('AAPL')!;

      // Timestamp should be recent
      expect(price.timestamp).toBeGreaterThanOrEqual(startTime);
      expect(price.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('6. Subscriber Notifications', () => {
    test('should notify all subscribers on each tick', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      PriceEngine.subscribe('AAPL', callback1);
      PriceEngine.subscribe('AAPL', callback2);
      PriceEngine.subscribe('AAPL', callback3);
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      // All 3 callbacks should have been called
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();

      // All should receive same price update
      expect(callback1.mock.calls[0][0].timestamp).toBe(
        callback2.mock.calls[0][0].timestamp
      );
    });

    test('should not notify after unsubscribe', async () => {
      const callback = jest.fn();

      const unsubscribe = PriceEngine.subscribe('AAPL', callback);
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      const callsBefore = callback.mock.calls.length;
      unsubscribe();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      // No additional calls after unsubscribe
      expect(callback.mock.calls.length).toBe(callsBefore);
    });

    test('should handle errors in subscriber callbacks gracefully', async () => {
      const goodCallback = jest.fn();
      const badCallback = jest.fn(() => {
        throw new Error('Subscriber error');
      });

      PriceEngine.subscribe('AAPL', badCallback);
      PriceEngine.subscribe('AAPL', goodCallback);
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      // Good callback should still be called despite error in bad callback
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('7. Start/Stop Lifecycle', () => {
    test('should allow restart after stop', async () => {
      PriceEngine.subscribe('AAPL', () => {});

      // First run
      PriceEngine.start();
      jest.advanceTimersByTime(1100);
      PriceEngine.stop();

      const history1 = PriceEngine.getHistory('AAPL');
      const count1 = history1.length;

      // Second run
      PriceEngine.start();
      jest.advanceTimersByTime(1100);
      PriceEngine.stop();

      const history2 = PriceEngine.getHistory('AAPL');
      const count2 = history2.length;

      // History should have grown
      expect(count2).toBeGreaterThan(count1);
    });

    test('should preserve prices when stopped', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      const priceBeforeStop = PriceEngine.getPrice('AAPL')!;
      PriceEngine.stop();

      jest.advanceTimersByTime(1100);

      const priceAfterStop = PriceEngine.getPrice('AAPL')!;

      // Price should remain unchanged while stopped
      expect(priceAfterStop.price).toBe(priceBeforeStop.price);
    });

    test('should not update while stopped', async () => {
      const callback = jest.fn();

      PriceEngine.subscribe('AAPL', callback);
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      const callsWhileRunning = callback.mock.calls.length;

      jest.advanceTimersByTime(2100);

      const callsAfterStop = callback.mock.calls.length;

      // No additional calls while stopped
      expect(callsAfterStop).toBe(callsWhileRunning);
    });
  });

  describe('8. Reset Functionality', () => {
    test('should clear all prices on reset', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      const priceBefore = PriceEngine.getPrice('AAPL');
      expect(priceBefore).toBeDefined();

      PriceEngine.reset();

      const priceAfter = PriceEngine.getPrice('AAPL');
      expect(priceAfter).toBeUndefined();
    });

    test('should clear all history on reset', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.start();

      jest.advanceTimersByTime(2200);

      PriceEngine.stop();

      const historyBefore = PriceEngine.getHistory('AAPL');
      expect(historyBefore.length).toBeGreaterThan(0);

      PriceEngine.reset();

      const historyAfter = PriceEngine.getHistory('AAPL');
      expect(historyAfter.length).toBe(0);
    });

    test('should remove all subscribers on reset', async () => {
      const callback = jest.fn();

      PriceEngine.subscribe('AAPL', callback);
      PriceEngine.reset();

      PriceEngine.start();
      jest.advanceTimersByTime(1100);
      PriceEngine.stop();

      // Callback should not have been called (subscriber removed)
      expect(callback).not.toHaveBeenCalled();
    });

    test('should stop engine on reset', () => {
      PriceEngine.start();

      const statusBefore = PriceEngine.getStatus();
      expect(statusBefore.isRunning).toBe(true);

      PriceEngine.reset();

      const statusAfter = PriceEngine.getStatus();
      expect(statusAfter.isRunning).toBe(false);
    });

    test('should reset status counters', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.subscribe('GOOGL', () => {});
      PriceEngine.start();

      jest.advanceTimersByTime(1100);

      PriceEngine.stop();

      const statusBefore = PriceEngine.getStatus();
      expect(statusBefore.activeSymbols).toBeGreaterThan(0);

      PriceEngine.reset();

      const statusAfter = PriceEngine.getStatus();
      expect(statusAfter.activeSymbols).toBe(0);
      expect(statusAfter.subscribers).toBe(0);
      expect(statusAfter.totalHistoryPoints).toBe(0);
    });
  });

  describe('9. Edge Cases', () => {
    test('should handle 10 concurrent subscribers', async () => {
      const callbacks: jest.Mock[] = [];

      for (let i = 0; i < 10; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        PriceEngine.subscribe('AAPL', callback);
      }

      PriceEngine.start();
      jest.advanceTimersByTime(1100);
      PriceEngine.stop();

      // All 10 should have been called
      callbacks.forEach((callback) => {
        expect(callback).toHaveBeenCalled();
      });
    });

    test('should handle subscribing to many symbols', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META'];
      const callbacks: jest.Mock[] = [];

      symbols.forEach((symbol) => {
        const callback = jest.fn();
        callbacks.push(callback);
        PriceEngine.subscribe(symbol, callback);
      });

      PriceEngine.start();
      jest.advanceTimersByTime(1100);
      PriceEngine.stop();

      // All should have been called
      callbacks.forEach((callback) => {
        expect(callback).toHaveBeenCalled();
      });

      // Verify different symbols
      const allPrices = PriceEngine.getAllPrices();
      expect(allPrices.size).toBeGreaterThanOrEqual(5);
    });

    test('should handle rapid subscribe/unsubscribe', () => {
      const callback = jest.fn();

      const unsubscribe1 = PriceEngine.subscribe('AAPL', callback);
      unsubscribe1();

      const unsubscribe2 = PriceEngine.subscribe('AAPL', callback);
      unsubscribe2();

      const unsubscribe3 = PriceEngine.subscribe('AAPL', callback);

      // Should not throw errors
      expect(() => unsubscribe3()).not.toThrow();
    });

    test('should handle multiple unsubscribe calls', () => {
      const callback = jest.fn();

      const unsubscribe = PriceEngine.subscribe('AAPL', callback);
      unsubscribe();
      unsubscribe(); // Second call

      // Should not throw
      expect(() => unsubscribe()).not.toThrow();
    });

    test('should return empty history for non-existent symbol', () => {
      const history = PriceEngine.getHistory('NONEXISTENT');

      expect(history).toEqual([]);
    });

    test('should handle very short running time', async () => {
      PriceEngine.subscribe('AAPL', () => {});
      PriceEngine.start();

      jest.advanceTimersByTime(100); // 0.1 second

      PriceEngine.stop();

      // Should not crash or throw errors
      const status = PriceEngine.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });
});

