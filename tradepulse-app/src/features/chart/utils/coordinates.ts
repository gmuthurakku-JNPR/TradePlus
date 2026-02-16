/**
 * ============================================================================
 * Coordinate Mapping Utilities for SVG Chart
 * ============================================================================
 * 
 * Mathematical formulas for transforming price data to SVG coordinates.
 * 
 * COORDINATE SYSTEMS:
 * - Data Space: Raw price values and timestamps
 * - Normalized Space: [0, 1] range for both axes
 * - SVG Space: Pixel coordinates within viewBox
 * 
 * Y-AXIS INVERSION:
 * SVG Y-axis grows downward (0 at top, height at bottom)
 * Price axis grows upward (low at bottom, high at top)
 * Therefore: SVG_Y = height - (normalized * height)
 * ============================================================================
 */

import type { PricePoint } from '@types';

/**
 * Chart dimensions interface
 */
export interface ChartDimensions {
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

/**
 * Chart bounds (min/max for data)
 */
export interface ChartBounds {
  minPrice: number;
  maxPrice: number;
  minTime: number;
  maxTime: number;
}

/**
 * SVG Point coordinate
 */
export interface SVGPoint {
  x: number;
  y: number;
}

/**
 * ============================================================================
 * FORMULA 1: Normalization (Data → [0, 1])
 * ============================================================================
 * 
 * Maps a value from data range to normalized [0, 1] range:
 * 
 *   normalized = (value - min) / (max - min)
 * 
 * Where:
 *   - value: Current data point value
 *   - min: Minimum value in dataset
 *   - max: Maximum value in dataset
 * 
 * Edge case: If min === max, return 0.5 (center)
 * 
 * Example:
 *   Price range: [100, 200]
 *   Current price: 150
 *   normalized = (150 - 100) / (200 - 100) = 0.5
 * ============================================================================
 */
export function normalize(value: number, min: number, max: number): number {
  // Handle edge case: no variation in data
  if (max === min) {
    return 0.5; // Center the line
  }
  
  // Standard normalization formula
  return (value - min) / (max - min);
}

/**
 * ============================================================================
 * FORMULA 2: Scale to SVG X-axis (Normalized → SVG)
 * ============================================================================
 * 
 * Maps normalized [0, 1] value to SVG X coordinate:
 * 
 *   x = marginLeft + (normalized * chartWidth)
 * 
 * Where:
 *   - normalized: Value in [0, 1] range
 *   - marginLeft: Left padding in pixels
 *   - chartWidth: Available width (total width - margins)
 * 
 * Example:
 *   marginLeft = 50
 *   chartWidth = 900 (1000 - 50 - 50)
 *   normalized = 0.5
 *   x = 50 + (0.5 * 900) = 500
 * ============================================================================
 */
export function scaleX(normalized: number, dimensions: ChartDimensions): number {
  const chartWidth = dimensions.width - dimensions.marginLeft - dimensions.marginRight;
  return dimensions.marginLeft + (normalized * chartWidth);
}

/**
 * ============================================================================
 * FORMULA 3: Scale to SVG Y-axis with Inversion (Normalized → SVG)
 * ============================================================================
 * 
 * Maps normalized [0, 1] value to SVG Y coordinate (inverted):
 * 
 *   y = marginTop + chartHeight - (normalized * chartHeight)
 *   
 * Simplified as:
 *   y = marginTop + (1 - normalized) * chartHeight
 * 
 * Where:
 *   - normalized: Value in [0, 1] range
 *   - marginTop: Top padding in pixels
 *   - chartHeight: Available height (total height - margins)
 * 
 * Inversion Logic:
 *   - normalized = 0 (min price) → y = marginTop + chartHeight (bottom)
 *   - normalized = 1 (max price) → y = marginTop (top)
 * 
 * Example:
 *   marginTop = 20
 *   chartHeight = 380 (400 - 20 - 0)
 *   normalized = 0.75 (75% from bottom = high price)
 *   y = 20 + (1 - 0.75) * 380 = 20 + 95 = 115 (near top)
 * ============================================================================
 */
export function scaleY(normalized: number, dimensions: ChartDimensions): number {
  const chartHeight = dimensions.height - dimensions.marginTop - dimensions.marginBottom;
  // Invert Y-axis: higher prices appear at top
  return dimensions.marginTop + (1 - normalized) * chartHeight;
}

/**
 * ============================================================================
 * COMPOSITE FUNCTION: Map Price Point to SVG Coordinates
 * ============================================================================
 * 
 * Complete transformation pipeline:
 *   1. Normalize price: (price - minPrice) / (maxPrice - minPrice)
 *   2. Normalize time: (timestamp - minTime) / (maxTime - minTime)
 *   3. Scale X: marginLeft + normalizedTime * chartWidth
 *   4. Scale Y: marginTop + (1 - normalizedPrice) * chartHeight
 * 
 * This is the main function used to convert each data point.
 * ============================================================================
 */
export function mapPointToSVG(
  point: PricePoint,
  bounds: ChartBounds,
  dimensions: ChartDimensions
): SVGPoint {
  // Step 1: Normalize both axes to [0, 1]
  const normalizedTime = normalize(point.timestamp, bounds.minTime, bounds.maxTime);
  const normalizedPrice = normalize(point.price, bounds.minPrice, bounds.maxPrice);
  
  // Step 2: Scale to SVG coordinates
  const x = scaleX(normalizedTime, dimensions);
  const y = scaleY(normalizedPrice, dimensions);
  
  return { x, y };
}

/**
 * ============================================================================
 * UTILITY: Calculate Chart Bounds
 * ============================================================================
 * 
 * Analyzes dataset to find min/max values for both axes.
 * Adds 5% padding to price range for visual breathing room.
 * ============================================================================
 */
export function calculateBounds(points: PricePoint[]): ChartBounds {
  if (points.length === 0) {
    // Return default bounds for empty dataset
    return {
      minPrice: 0,
      maxPrice: 100,
      minTime: Date.now() - 60000,
      maxTime: Date.now(),
    };
  }
  
  // Find min/max prices
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let minTime = Infinity;
  let maxTime = -Infinity;
  
  for (const point of points) {
    if (point.price < minPrice) minPrice = point.price;
    if (point.price > maxPrice) maxPrice = point.price;
    if (point.timestamp < minTime) minTime = point.timestamp;
    if (point.timestamp > maxTime) maxTime = point.timestamp;
  }
  
  // Add 5% padding to price range for better visualization
  const priceRange = maxPrice - minPrice;
  const padding = priceRange * 0.05;
  
  return {
    minPrice: minPrice - padding,
    maxPrice: maxPrice + padding,
    minTime,
    maxTime,
  };
}

/**
 * ============================================================================
 * UTILITY: Generate Y-axis Price Ticks
 * ============================================================================
 * 
 * Creates evenly spaced price labels for Y-axis.
 * Uses "nice" numbers (multiples of 1, 2, 5, 10, etc.)
 * 
 * Algorithm:
 *   1. Calculate range = max - min
 *   2. Determine tick interval (power of 10 with 1, 2, or 5 multiplier)
 *   3. Generate ticks starting from first nice number >= min
 * ============================================================================
 */
export function generatePriceTicks(minPrice: number, maxPrice: number, targetCount: number = 5): number[] {
  const range = maxPrice - minPrice;
  
  // Handle edge case: no range
  if (range === 0) {
    return [minPrice];
  }
  
  // Calculate nice interval
  const roughInterval = range / (targetCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
  const normalizedInterval = roughInterval / magnitude;
  
  // Choose nice number: 1, 2, or 5
  let niceInterval: number;
  if (normalizedInterval <= 1) {
    niceInterval = 1;
  } else if (normalizedInterval <= 2) {
    niceInterval = 2;
  } else if (normalizedInterval <= 5) {
    niceInterval = 5;
  } else {
    niceInterval = 10;
  }
  
  const tickInterval = niceInterval * magnitude;
  
  // Generate ticks
  const ticks: number[] = [];
  const firstTick = Math.ceil(minPrice / tickInterval) * tickInterval;
  
  for (let tick = firstTick; tick <= maxPrice; tick += tickInterval) {
    ticks.push(tick);
  }
  
  // Ensure we have at least 2 ticks
  if (ticks.length < 2) {
    ticks.push(minPrice, maxPrice);
  }
  
  return ticks;
}

/**
 * ============================================================================
 * UTILITY: Generate X-axis Time Ticks
 * ============================================================================
 * 
 * Creates time labels for X-axis.
 * Returns timestamps evenly distributed across time range.
 * ============================================================================
 */
export function generateTimeTicks(minTime: number, maxTime: number, targetCount: number = 5): number[] {
  const ticks: number[] = [];
  const interval = (maxTime - minTime) / (targetCount - 1);
  
  for (let i = 0; i < targetCount; i++) {
    ticks.push(minTime + (i * interval));
  }
  
  return ticks;
}

/**
 * ============================================================================
 * UTILITY: Format Price for Display
 * ============================================================================
 * 
 * Formats price with appropriate decimal places.
 * - Prices >= 1000: No decimals (1,234)
 * - Prices >= 10: 2 decimals (123.45)
 * - Prices < 10: 4 decimals (1.2345)
 * ============================================================================
 */
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toFixed(0);
  } else if (price >= 10) {
    return price.toFixed(2);
  } else {
    return price.toFixed(4);
  }
}

/**
 * ============================================================================
 * UTILITY: Format Time for Display
 * ============================================================================
 * 
 * Formats timestamp based on time range:
 * - < 1 hour: HH:MM:SS
 * - < 1 day: HH:MM
 * - >= 1 day: MM/DD HH:MM
 * ============================================================================
 */
export function formatTime(timestamp: number, minTime: number, maxTime: number): string {
  const date = new Date(timestamp);
  const range = maxTime - minTime;
  
  // Less than 1 hour: show seconds
  if (range < 3600000) {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  }
  
  // Less than 1 day: show hours and minutes
  if (range < 86400000) {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }
  
  // More than 1 day: show date and time
  return date.toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false 
  });
}
