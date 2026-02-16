/**
 * Chart Component
 * Displays price history for selected symbol with timeframe selection
 * Supports light and dark themes
 * Includes professional analyst features: Technical indicators, trends, support/resistance
 */

import { useEffect, useState, useMemo } from 'react';
import PriceEngine from '@engines/PriceEngine';
import type { PriceData } from '@types';

interface ChartPoint {
  price: number;
  timestamp: number;
  time: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

type TimeframeType = '5s' | '10s' | '15s' | '30s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

interface ChartProps {
  theme?: 'dark' | 'light';
}

export function Chart({ theme = 'dark' }: ChartProps) {
  const [symbol, setSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState<TimeframeType>('5s');
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [stats, setStats] = useState({
    high: 0,
    low: 0,
    open: 0,
    close: 0,
  });
  const [symbols, setSymbols] = useState<string[]>([]);

  // Get timeframe in milliseconds
  const getTimeframeMs = (tf: TimeframeType): number => {
    const timeframeMap: Record<TimeframeType, number> = {
      '5s': 5 * 1000,
      '10s': 10 * 1000,
      '15s': 15 * 1000,
      '30s': 30 * 1000,
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1D': 24 * 60 * 60 * 1000,
    };
    return timeframeMap[tf];
  };

  // Calculate Simple Moving Average (works with smaller datasets)
  const calculateSMA = (prices: number[], period: number): number | null => {
    if (prices.length === 0) return null;
    // Use minimum of period or available data
    const actualPeriod = Math.min(period, prices.length);
    const sum = prices.slice(-actualPeriod).reduce((a, b) => a + b, 0);
    return sum / actualPeriod;
  };

  // Calculate RSI (Relative Strength Index - works with smaller datasets)
  const calculateRSI = (prices: number[], period: number = 14): number | null => {
    if (prices.length < 2) return null;
    // Use minimum of period or available data
    const actualPeriod = Math.min(period, prices.length - 1);
    
    const deltas = [];
    for (let i = 1; i < prices.length; i++) {
      deltas.push(prices[i] - prices[i - 1]);
    }
    
    const gains = deltas.map((d) => (d > 0 ? d : 0)).slice(-actualPeriod);
    const losses = deltas.map((d) => (d < 0 ? -d : 0)).slice(-actualPeriod);
    
    const avgGain = gains.reduce((a, b) => a + b, 0) / actualPeriod;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / actualPeriod;
    
    if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    return Math.min(100, Math.max(0, rsi));
  };

  // Calculate Bollinger Bands (works with smaller datasets)
  const calculateBollingerBands = (prices: number[], period: number = 20) => {
    const sma = calculateSMA(prices, period);
    if (!sma || prices.length === 0) return { upper: null, middle: null, lower: null };
    
    // Use minimum of period or available prices
    const actualPeriod = Math.min(period, prices.length);
    const slicedPrices = prices.slice(-actualPeriod);
    const variance = slicedPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / actualPeriod;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: sma + (stdDev * 2),
      middle: sma,
      lower: sma - (stdDev * 2),
    };
  };

  // Calculate Trend (comparing price to moving averages - works with small datasets)
  const calculateTrend = (prices: number[]): { trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; strength: number } => {
    if (prices.length < 2) return { trend: 'NEUTRAL', strength: 0 };
    
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const currentPrice = prices[prices.length - 1];
    
    // Use available SMAs (at least one required)
    if (!sma20 && !sma50) return { trend: 'NEUTRAL', strength: 0 };
    
    // Fallback to using current price if SMA not available
    const sma20Val = sma20 || currentPrice;
    const sma50Val = sma50 || currentPrice;
    
    const priceVsSMA20 = ((currentPrice - sma20Val) / sma20Val) * 100;
    const smaRelation = ((sma20Val - sma50Val) / sma50Val) * 100;
    
    const bullish = priceVsSMA20 > 0 && smaRelation > 0;
    const bearish = priceVsSMA20 < 0 && smaRelation < 0;
    
    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let strength = 0;
    
    if (bullish) {
      trend = 'BULLISH';
      strength = Math.min(100, Math.abs(priceVsSMA20) + Math.abs(smaRelation));
    } else if (bearish) {
      trend = 'BEARISH';
      strength = Math.min(100, Math.abs(priceVsSMA20) + Math.abs(smaRelation));
    }
    
    return { trend, strength };
  };

  // Calculate Support and Resistance levels (works with smaller datasets)
  const calculateSupportResistance = (points: ChartPoint[]) => {
    if (points.length < 2) return { support: 0, resistance: 0 };
    
    const prices = points.map((p) => p.high || p.close || p.price);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    
    const typical = points.map((p) => ((p.high || p.price) + (p.low || p.price) + (p.close || p.price)) / 3);
    const pivot = typical.reduce((a, b) => a + b, 0) / typical.length;
    
    const resistance = pivot + (maxPrice - minPrice) * 0.5;
    const support = pivot - (maxPrice - minPrice) * 0.5;
    
    return { support, resistance };
  };

  // Aggregate raw price data to timeframe candles
  const aggregatePrices = (rawPoints: any[], tf: TimeframeType): ChartPoint[] => {
    if (rawPoints.length === 0) return [];

    const tfMs = getTimeframeMs(tf);
    const candles: ChartPoint[] = [];
    let currentCandle: any = null;

    rawPoints.forEach((point) => {
      if (!currentCandle) {
        currentCandle = {
          open: point.price,
          high: point.price,
          low: point.price,
          close: point.price,
          timestamp: point.timestamp,
        };
      } else {
        const timeDiff = point.timestamp - currentCandle.timestamp;
        if (timeDiff < tfMs) {
          currentCandle.high = Math.max(currentCandle.high, point.price);
          currentCandle.low = Math.min(currentCandle.low, point.price);
          currentCandle.close = point.price;
        } else {
          candles.push({
            price: currentCandle.close,
            timestamp: currentCandle.timestamp,
            time: new Date(currentCandle.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
            open: currentCandle.open,
            high: currentCandle.high,
            low: currentCandle.low,
            close: currentCandle.close,
          });
          currentCandle = {
            open: point.price,
            high: point.price,
            low: point.price,
            close: point.price,
            timestamp: point.timestamp,
          };
        }
      }
    });

    if (currentCandle) {
      candles.push({
        price: currentCandle.close,
        timestamp: currentCandle.timestamp,
        time: new Date(currentCandle.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close,
      });
    }

    const result = candles.slice(-200);
    return result;
  };

  // ========== MEMOIZED HOOKS (now functions are defined above) ==========

  // Memoized technical indicators
  const technicalIndicators = useMemo(() => {
    if (chartPoints.length === 0) {
      return {
        sma20: null,
        sma50: null,
        rsi: null,
        bollingerUpper: null,
        bollingerMiddle: null,
        bollingerLower: null,
        trend: 'NEUTRAL' as const,
        trendStrength: 0,
        resistance: 0,
        support: 0,
      };
    }

    const prices = chartPoints.map((p) => p.close || p.price);
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const rsi = calculateRSI(prices, 14);
    const bbands = calculateBollingerBands(prices, 20);
    const { trend, strength } = calculateTrend(prices);
    const { support, resistance } = calculateSupportResistance(chartPoints);

    return {
      sma20,
      sma50,
      rsi,
      bollingerUpper: bbands.upper,
      bollingerMiddle: bbands.middle,
      bollingerLower: bbands.lower,
      trend,
      trendStrength: strength,
      support,
      resistance,
    };
  }, [chartPoints]);

  // Theme-aware color palette
  const isDark = theme === 'dark';
  const colors = {
    bg: isDark ? '#1f2937' : '#ffffff',
    bgSecondary: isDark ? '#111827' : '#f9fafb',
    border: isDark ? '#374151' : '#e5e7eb',
    borderLight: isDark ? '#4b5563' : '#d1d5db',
    text: isDark ? '#f9fafb' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#4b5563',
    upColor: '#10b981',
    downColor: '#ef4444',
    upFaint: isDark ? '#10b98144' : '#10b98166',
    downFaint: isDark ? '#ef444444' : '#ef444466',
  };

  // Get available symbols on mount
  useEffect(() => {
    const availableSymbols = PriceEngine.getAvailableSymbols();
    setSymbols(availableSymbols);
  }, []);

  useEffect(() => {
    PriceEngine.reset();
    let unsubscribe: (() => void) | null = null;
    let rawPoints: any[] = [];

    unsubscribe = PriceEngine.subscribe(symbol, (priceData: PriceData) => {
      rawPoints.push({
        price: priceData.price,
        timestamp: Date.now(),
      });

      // Keep raw points reasonably sized (last 1000)
      if (rawPoints.length > 1000) {
        rawPoints = rawPoints.slice(-1000);
      }

      // Aggregate to current timeframe
      const aggregated = aggregatePrices(rawPoints, timeframe);
      setChartPoints(aggregated);

      // Update stats from aggregated data
      if (aggregated.length > 0) {
        const lastCandle = aggregated[aggregated.length - 1];
        const prices = aggregated.map((p) => p.high || p.price);
        setStats({
          high: Math.max(...prices),
          low: Math.min(...aggregated.map((p) => p.low || p.price)),
          open: aggregated[0].open || aggregated[0].price,
          close: lastCandle.close || lastCandle.price,
        });
      }
    });

    PriceEngine.start();

    return () => {
      if (unsubscribe) unsubscribe();
      PriceEngine.stop();
    };
  }, [symbol, timeframe]);

  // Calculate price range with padding for better visualization
  const rawMaxPrice = Math.max(...chartPoints.map((p) => p.high || p.price), stats.high || 100);
  const rawMinPrice = Math.min(...chartPoints.map((p) => p.low || p.price), stats.low || 50);
  const rawRange = rawMaxPrice - rawMinPrice || 1;
  const padding = rawRange * 0.05; // 5% padding on each side
  const maxPrice = rawMaxPrice + padding;
  const minPrice = Math.max(0, rawMinPrice - padding); // Don't go below 0

  // Smart Y-axis label generator - creates neat, rounded intervals
  const generateNeatYAxisLabels = (min: number, max: number, targetCount: number = 5) => {
    const range = max - min;
    if (range === 0) return Array(targetCount).fill(min);
    
    // Calculate nice step size
    const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
    let step = magnitude;
    
    // Adjust step to be 1, 2, or 5 times the magnitude
    const steps = [1, 2, 5];
    for (const s of steps) {
      const possibleStep = s * magnitude;
      const possibleCount = Math.ceil(range / possibleStep);
      if (possibleCount <= targetCount + 1) {
        step = possibleStep;
        break;
      }
    }
    
    // Round min/max to step
    const adjustedMin = Math.floor(min / step) * step;
    const adjustedMax = Math.ceil(max / step) * step;
    const adjustedRange = adjustedMax - adjustedMin;
    
    // Generate labels
    const labels: number[] = [];
    const count = Math.round(adjustedRange / step);
    for (let i = 0; i <= count; i++) {
      labels.push(adjustedMin + (i * step));
    }
    
    // Return most relevant 5 labels
    if (labels.length > targetCount) {
      const step_idx = Math.ceil(labels.length / targetCount);
      return labels.filter((_, i) => i % step_idx === 0).slice(0, targetCount);
    }
    return labels.slice(0, targetCount);
  };

  const yAxisLabels = generateNeatYAxisLabels(minPrice, maxPrice, 5);
  
  // Use neat Y-axis range for chart alignment
  const displayMinPrice = Math.min(...yAxisLabels);
  const displayMaxPrice = Math.max(...yAxisLabels);
  const displayPriceRange = Math.max(displayMaxPrice - displayMinPrice, 1);

  // Get time range for X-axis context
  const timeStart = chartPoints.length > 0 ? chartPoints[0].time : '';
  const timeEnd = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].time : '';

  return (
    <div style={getContainerStyle()}>
      <div style={getHeaderStyle(colors)}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: colors.text }}>📈 Price Chart</h2>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={getSelectStyle(colors)}
          >
            {symbols.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['5s', '10s', '15s', '30s', '1m', '5m', '15m', '1h', '4h', '1D'] as TimeframeType[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '0.375rem 0.75rem',
                  backgroundColor: timeframe === tf ? colors.upColor : colors.bgSecondary,
                  color: timeframe === tf ? '#ffffff' : colors.text,
                  border: `1px solid ${timeframe === tf ? colors.upColor : colors.border}`,
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: timeframe === tf ? 'bold' : 'normal',
                  transition: 'all 0.2s ease',
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div style={statsGridStyle}>
          <div style={statItemStyle}>
            <span style={{ color: colors.textSecondary }}>Open</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: colors.text }}>
              ${stats.open.toFixed(2)}
            </span>
          </div>
          <div style={statItemStyle}>
            <span style={{ color: colors.textSecondary }}>Close</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: colors.text }}>
              ${stats.close.toFixed(2)}
            </span>
          </div>
          <div style={statItemStyle}>
            <span style={{ color: colors.textSecondary }}>High</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
              ${stats.high.toFixed(2)}
            </span>
          </div>
          <div style={statItemStyle}>
            <span style={{ color: colors.textSecondary }}>Low</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>
              ${stats.low.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Candlestick Chart with Axes */}
      <div style={getChartContainerStyle(colors)}>
        {chartPoints.length === 0 ? (
          <div style={{ textAlign: 'center', color: colors.textSecondary, padding: '3rem' }}>
            Waiting for price data...
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', height: '400px' }}>
            {/* Y-Axis (Price Scale) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingRight: '0.75rem',
              width: '60px',
              fontSize: '0.8rem',
              fontWeight: '500',
              color: colors.text,
              borderRight: `2px solid ${colors.border}`,
              height: '100%',
              background: isDark
                ? 'linear-gradient(90deg, rgba(17, 24, 39, 0.5) 0%, transparent 100%)'
                : 'linear-gradient(90deg, rgba(249, 250, 251, 0.5) 0%, transparent 100%)',
              paddingLeft: '0.5rem',
            }}>
              {yAxisLabels.map((price, idx) => (
                <div
                  key={idx}
                  style={{
                    transition: 'all 0.3s ease',
                    opacity: 0.8,
                    letterSpacing: '0.5px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  title={`Price: $${price.toFixed(2)}`}
                >
                  ${price.toFixed(2)}
                </div>
              ))}
            </div>

            {/* Chart Area with Grid */}
            <div style={{ 
              flex: 1, 
              position: 'relative', 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%', 
              minHeight: 0,
              background: isDark 
                ? 'linear-gradient(135deg, rgba(31, 41, 55, 0.5) 0%, rgba(17, 24, 39, 0.8) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(249, 250, 251, 0.8) 100%)',
              borderRadius: '0.25rem',
            }}>
              {/* Grid Lines */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: '30px',
                pointerEvents: 'none',
              }}>
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <div
                    key={`grid-${ratio}`}
                    style={{
                      position: 'absolute',
                      top: `${(1 - ratio) * 100}%`,
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: isDark
                        ? `linear-gradient(90deg, transparent, ${colors.border}, transparent)`
                        : `linear-gradient(90deg, transparent, rgba(229, 231, 235, 0.5), transparent)`,
                      opacity: ratio === 0.5 ? 0.5 : 0.25,
                      transition: 'opacity 0.3s ease',
                    }}
                  />
                ))}
              </div>

              {/* Price Line Connecting Points */}
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: 'calc(100% - 30px)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                {/* Close Price Line */}
                <polyline
                  points={chartPoints
                    .map((point, idx) => {
                      const closePrice = point.close || point.price;
                      const closeNormalized = ((closePrice - displayMinPrice) / displayPriceRange) || 0.5;
                      const x = ((idx + 0.5) / chartPoints.length) * 100;
                      const y = (1 - closeNormalized) * 100;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke={isDark ? '#3b82f6' : '#2563eb'}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.85"
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.4))',
                  }}
                />
                
                {/* High-Low Range Area */}
                <polygon
                  points={
                    chartPoints
                      .map((point, idx) => {
                        const highPrice = point.high || point.price;
                        const highNormalized = ((highPrice - displayMinPrice) / displayPriceRange) || 0.5;
                        const x = ((idx + 0.5) / chartPoints.length) * 100;
                        const y = (1 - highNormalized) * 100;
                        return `${x},${y}`;
                      })
                      .join(' ') +
                    ' ' +
                    [...chartPoints]
                      .reverse()
                      .map((point, idx) => {
                        const lowPrice = point.low || point.price;
                        const lowNormalized = ((lowPrice - displayMinPrice) / displayPriceRange) || 0.5;
                        const x = ((chartPoints.length - idx - 0.5) / chartPoints.length) * 100;
                        const y = (1 - lowNormalized) * 100;
                        return `${x},${y}`;
                      })
                      .join(' ')
                  }
                  fill={isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.08)'}
                  stroke="none"
                />
                
                {/* Price Points */}
                {chartPoints.map((point, idx) => {
                  const closePrice = point.close || point.price;
                  const closeNormalized = ((closePrice - displayMinPrice) / displayPriceRange) || 0.5;
                  const x = ((idx + 0.5) / chartPoints.length) * 100;
                  const y = (1 - closeNormalized) * 100;
                  const isUp = (point.close || point.price) >= (point.open || point.price);
                  
                  return (
                    <circle
                      key={`point-${idx}`}
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="3"
                      fill={isUp ? '#10b981' : '#ef4444'}
                      stroke={isDark ? '#1f2937' : '#ffffff'}
                      strokeWidth="1.5"
                      opacity="0.9"
                    />
                  );
                })}
              </svg>

              {/* Candlestick Chart */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                flex: 1,
                gap: '2px',
                paddingTop: '1.5rem',
                paddingBottom: '1.5rem',
                paddingRight: '0.5rem',
                paddingLeft: '0.5rem',
                position: 'relative',
                zIndex: 2,
              }}>
                {chartPoints.map((point, idx) => {
                  const highNormalized =
                    ((point.high !== undefined ? point.high : point.price) - displayMinPrice) / displayPriceRange * 100 || 5;
                  const lowNormalized =
                    ((point.low !== undefined ? point.low : point.price) - displayMinPrice) / displayPriceRange * 100 || 5;
                  const openNormalized =
                    ((point.open !== undefined ? point.open : point.price) - displayMinPrice) / displayPriceRange * 100 || 5;
                  const closeNormalized =
                    ((point.close !== undefined ? point.close : point.price) - displayMinPrice) / displayPriceRange * 100 || 5;
                  
                  const isUp = (point.close || point.price) >= (point.open || point.price);
                  
                  // Ensure minimum height for small ranges - scale up tiny candles
                  let bodyHeight = Math.abs(closeNormalized - openNormalized);
                  let wickHeight = highNormalized - lowNormalized;
                  
                  // If range is very small, amplify the display
                  if (displayPriceRange < 1) {
                    // Amplify up to 3x for very small ranges
                    const amplification = Math.min(3, Math.max(1, 1 / (displayPriceRange * 100)));
                    bodyHeight = Math.max(bodyHeight * amplification, 6);
                    wickHeight = Math.max(wickHeight * amplification, 4);
                  } else {
                    bodyHeight = Math.max(bodyHeight, 5);
                    wickHeight = Math.max(wickHeight, 2);
                  }
                  
                  const volume = Math.random() * 0.4 + 0.2; // Simulated volume intensity
                  
                  const upGradient = isDark 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)'
                    : 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)';
                  const downGradient = isDark 
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)'
                    : 'linear-gradient(135deg, #f87171 0%, #ef4444 50%, #dc2626 100%)';
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        minHeight: '100%',
                        minWidth: '8px',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        opacity: 0.7,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = '1';
                        (e.currentTarget as HTMLElement).style.filter = 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = '0.7';
                        (e.currentTarget as HTMLElement).style.filter = 'none';
                      }}
                      title={`${point.time}: O: $${(point.open || point.price).toFixed(2)} H: $${(point.high || point.price).toFixed(2)} L: $${(point.low || point.price).toFixed(2)} C: $${(point.close || point.price).toFixed(2)}`}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '0px' }}>
                        {/* Volume Bar Background */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            width: '80%',
                            height: `${Math.min(wickHeight * volume * 0.3, 60)}%`,
                            backgroundColor: isUp ? `rgba(16, 185, 129, 0.08)` : `rgba(239, 68, 68, 0.08)`,
                            zIndex: 0,
                          }}
                        />
                        
                        {/* Wick */}
                        <div
                          style={{
                            width: '2px',
                            height: `${wickHeight}%`,
                            background: isUp 
                              ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.8) 0%, rgba(16, 185, 129, 0.3) 100%)'
                              : 'linear-gradient(180deg, rgba(239, 68, 68, 0.8) 0%, rgba(239, 68, 68, 0.3) 100%)',
                            zIndex: 1,
                          }}
                        />
                        
                        {/* Body */}
                        <div
                          style={{
                            height: `${Math.max(bodyHeight, 3)}%`,
                            width: '85%',
                            background: isUp ? upGradient : downGradient,
                            borderRadius: '2px',
                            border: `1px solid ${isUp ? '#10b981' : '#ef4444'}`,
                            boxShadow: isUp
                              ? `0 4px 12px ${isDark ? 'rgba(16, 185, 129, 0.5)' : 'rgba(16, 185, 129, 0.4)'}, inset 0 1px 0 rgba(255, 255, 255, 0.3)`
                              : `0 4px 12px ${isDark ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.4)'}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
                            zIndex: 2,
                            transition: 'all 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-Axis (Time Labels) */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '35px',
                paddingRight: '0.5rem',
                paddingLeft: '0rem',
                fontSize: '0.8rem',
                fontWeight: '500',
                color: colors.text,
                borderTop: `2px solid ${colors.border}`,
                background: isDark
                  ? 'linear-gradient(180deg, transparent 0%, rgba(17, 24, 39, 0.3) 100%)'
                  : 'linear-gradient(180deg, transparent 0%, rgba(249, 250, 251, 0.3) 100%)',
                gap: '0.5rem',
              }}>
                {chartPoints.length > 0 && (
                  <>
                    <span style={{ opacity: 0.8, minWidth: '35px', textAlign: 'center', letterSpacing: '0.5px' }} title={`Start: ${timeStart}`}>{timeStart}</span>
                    <span style={{ opacity: 0.6, minWidth: '35px', textAlign: 'center', letterSpacing: '0.5px' }} title={`${Math.floor(chartPoints.length * 0.25)} candles`}>{chartPoints[Math.floor(chartPoints.length * 0.25)].time}</span>
                    <span style={{ opacity: 0.8, minWidth: '35px', textAlign: 'center', letterSpacing: '0.5px' }} title={`Midpoint: ${Math.floor(chartPoints.length * 0.5)} candles`}>{chartPoints[Math.floor(chartPoints.length * 0.5)].time}</span>
                    <span style={{ opacity: 0.6, minWidth: '35px', textAlign: 'center', letterSpacing: '0.5px' }} title={`${Math.floor(chartPoints.length * 0.75)} candles`}>{chartPoints[Math.floor(chartPoints.length * 0.75)].time}</span>
                    <span style={{ opacity: 0.8, minWidth: '35px', textAlign: 'center', letterSpacing: '0.5px' }} title={`End: ${timeEnd}`}>{timeEnd}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Technical Analysis Panel */}
      <div style={getTechnicalPanelStyle(colors)}>
        <h3 style={{ margin: '0 0 1.25rem 0', color: colors.text, fontSize: '1.125rem', fontWeight: '600', letterSpacing: '0.5px' }}>🎯 Technical Analysis</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {/* Trend Analysis */}
          <div style={analysisCardStyle(colors)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ color: colors.textSecondary, fontSize: '0.875rem', fontWeight: '500' }}>Market Trend</span>
              <span style={{
                color: technicalIndicators.trend === 'BULLISH' ? '#10b981' : 
                       technicalIndicators.trend === 'BEARISH' ? '#ef4444' : colors.textSecondary,
                fontWeight: 'bold',
                fontSize: '0.95rem',
                letterSpacing: '1px',
                textShadow: technicalIndicators.trend === 'BULLISH' ? '0 0 8px rgba(16, 185, 129, 0.3)' : 
                           technicalIndicators.trend === 'BEARISH' ? '0 0 8px rgba(239, 68, 68, 0.3)' : 'none',
              }}>
                {technicalIndicators.trend === 'BULLISH' ? '📈' : technicalIndicators.trend === 'BEARISH' ? '📉' : '➡️'} {technicalIndicators.trend}
              </span>
            </div>
            <div style={{ height: '10px', backgroundColor: `${colors.bgSecondary}aa`, borderRadius: '5px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
              <div style={{
                height: '100%',
                width: `${technicalIndicators.trendStrength}%`,
                background: technicalIndicators.trend === 'BULLISH' ? 'linear-gradient(90deg, #10b981, #34d399)' :
                            technicalIndicators.trend === 'BEARISH' ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #6b7280, #9ca3af)',
                transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: technicalIndicators.trend === 'BULLISH' ? '0 0 8px rgba(16, 185, 129, 0.5)' :
                          technicalIndicators.trend === 'BEARISH' ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.8rem' }}>
              <span style={{ color: colors.textSecondary }}>Strength:</span>
              <span style={{ color: colors.text, fontWeight: '600' }}>{technicalIndicators.trendStrength.toFixed(0)}%</span>
            </div>
          </div>

          {/* RSI */}
          <div style={analysisCardStyle(colors)}>
            <span style={{ color: colors.textSecondary, fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', display: 'block' }}>RSI (14)</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ 
                fontSize: '1.75rem', 
                fontWeight: 'bold', 
                color: technicalIndicators.rsi !== null ? (technicalIndicators.rsi > 70 ? '#ef4444' : technicalIndicators.rsi < 30 ? '#ef4444' : '#3b82f6') : colors.text,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {technicalIndicators.rsi !== null ? technicalIndicators.rsi.toFixed(1) : 'N/A'}
              </div>
            </div>
            <div style={{
              height: '6px',
              backgroundColor: `${colors.bgSecondary}aa`,
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '0.75rem',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{
                height: '100%',
                width: `${technicalIndicators.rsi || 50}%`,
                background: 'linear-gradient(90deg, #ef4444, #3b82f6, #10b981)',
                transition: 'width 0.6s ease',
              }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: colors.textSecondary, fontWeight: '500' }}>
              {technicalIndicators.rsi !== null && (
                technicalIndicators.rsi > 70 ? '⚠️ Overbought' :
                technicalIndicators.rsi < 30 ? '💪 Oversold' : '⚖️ Neutral'
              )}
            </span>
          </div>

          {/* Moving Averages */}
          <div style={analysisCardStyle(colors)}>
            <span style={{ color: colors.textSecondary, fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', display: 'block' }}>Moving Averages</span>
            <div style={{ fontSize: '0.9rem', gap: '0.75rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: `${colors.bg}77`, borderRadius: '0.375rem', border: `1px solid ${colors.border}` }}>
                <span style={{ color: colors.textSecondary }}>SMA 20:</span>
                <span style={{ color: colors.text, fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>${technicalIndicators.sma20?.toFixed(2) || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: `${colors.bg}77`, borderRadius: '0.375rem', border: `1px solid ${colors.border}` }}>
                <span style={{ color: colors.textSecondary }}>SMA 50:</span>
                <span style={{ color: colors.text, fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>${technicalIndicators.sma50?.toFixed(2) || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Bollinger Bands */}
          <div style={analysisCardStyle(colors)}>
            <span style={{ color: colors.textSecondary, fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', display: 'block' }}>Bollinger Bands (20)</span>
            <div style={{ fontSize: '0.85rem', gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: `${colors.upFaint}`, borderRadius: '0.375rem', border: `1px solid ${colors.upColor}44` }}>
                <span style={{ color: colors.textSecondary }}>Upper:</span>
                <span style={{ color: colors.upColor, fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>${technicalIndicators.bollingerUpper?.toFixed(2) || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: `${colors.bgSecondary}77`, borderRadius: '0.375rem', border: `1px solid ${colors.border}` }}>
                <span style={{ color: colors.textSecondary }}>Mid:</span>
                <span style={{ color: colors.text, fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>${technicalIndicators.bollingerMiddle?.toFixed(2) || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: `${colors.downFaint}`, borderRadius: '0.375rem', border: `1px solid ${colors.downColor}44` }}>
                <span style={{ color: colors.textSecondary }}>Lower:</span>
                <span style={{ color: colors.downColor, fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>${technicalIndicators.bollingerLower?.toFixed(2) || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Support & Resistance */}
          <div style={analysisCardStyle(colors)}>
            <span style={{ color: colors.textSecondary, fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', display: 'block' }}>Support / Resistance</span>
            <div style={{ fontSize: '0.9rem', gap: '0.75rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.75rem', backgroundColor: `${colors.downFaint}`, borderRadius: '0.375rem', border: `1px solid ${colors.downColor}44` }}>
                <span style={{ color: colors.downColor, fontWeight: '600' }} title="Resistance level - potential sell zone">🔴 Resistance:</span>
                <span style={{ color: colors.text, fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>${technicalIndicators.resistance.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.75rem', backgroundColor: `${colors.upFaint}`, borderRadius: '0.375rem', border: `1px solid ${colors.upColor}44` }}>
                <span style={{ color: colors.upColor, fontWeight: '600' }} title="Support level - potential buy zone">🟢 Support:</span>
                <span style={{ color: colors.text, fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>${technicalIndicators.support.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Analysis Summary */}
          <div style={analysisCardStyle(colors)}>
            <span style={{ color: colors.textSecondary }}>📊 Analyst View</span>
            <div style={{ fontSize: '0.875rem', margin: '0.75rem 0', color: colors.textSecondary }}>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1rem' }}>
                <li>{technicalIndicators.trend === 'BULLISH' ? '📈 Strong uptrend' : technicalIndicators.trend === 'BEARISH' ? '📉 Strong downtrend' : '➡️ Range bound'}</li>
                <li>{technicalIndicators.rsi && (technicalIndicators.rsi > 70 ? '⚠️ Momentum exhaustion' : technicalIndicators.rsi < 30 ? '💪 Oversold bounce' : '⚖️ Balanced momentum')}</li>
                <li>{'Price near ' + (stats.close >= technicalIndicators.resistance ? 'Resistance 🔴' : stats.close <= technicalIndicators.support ? 'Support 🟢' : 'Mid-range')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div style={getInfoStyle(colors)}>
        <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
          📊 Displaying {chartPoints.length} candles ({timeframe}) | Price Range: ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} | Time: {timeStart} → {timeEnd}
        </p>
      </div>
    </div>
  );
}

const getContainerStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

const getHeaderStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors.bgSecondary,
  padding: '1.5rem',
  borderRadius: '0.5rem',
  border: `1px solid ${colors.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '2rem',
});

const getSelectStyle = (colors: any): React.CSSProperties => ({
  padding: '0.5rem',
  backgroundColor: colors.bg === '#ffffff' ? '#f9fafb' : '#111827',
  color: colors.text,
  border: `1px solid ${colors.border}`,
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  cursor: 'pointer',
  marginTop: '0.5rem',
});

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '1rem',
};

const statItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const getChartContainerStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: '0.5rem',
  padding: '1.5rem',
  minHeight: '300px',
});



const getInfoStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors.bgSecondary,
  padding: '0.75rem 1rem',
  borderRadius: '0.375rem',
  border: `1px solid ${colors.border}`,
  fontSize: '0.875rem',
});

const getTechnicalPanelStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors.bgSecondary,
  padding: '1.5rem',
  borderRadius: '0.5rem',
  border: `1px solid ${colors.border}`,
});

const analysisCardStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors.bg,
  padding: '1rem',
  borderRadius: '0.375rem',
  border: `1px solid ${colors.border}`,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});
