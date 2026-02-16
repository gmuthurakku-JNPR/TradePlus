/**
 * ============================================================================
 * SVG Path Generation Utilities
 * ============================================================================
 * 
 * Generates optimized SVG path strings for line charts.
 * 
 * SVG PATH COMMANDS:
 * - M x,y: Move to absolute position (start of path)
 * - L x,y: Line to absolute position
 * - l dx,dy: Line to relative position
 * - Z: Close path
 * 
 * OPTIMIZATION:
 * - Use absolute coordinates for clarity
 * - Round to 2 decimal places to reduce string size
 * - Pre-allocate string buffer for large datasets
 * ============================================================================
 */

import type { PricePoint } from '@types';
import type { ChartDimensions, ChartBounds } from './coordinates';
import { mapPointToSVG } from './coordinates';

/**
 * ============================================================================
 * MAIN PATH GENERATOR: Line Chart
 * ============================================================================
 * 
 * Generates SVG path string for a line chart:
 * 
 *   M x1,y1 L x2,y2 L x3,y3 ... L xn,yn
 * 
 * Where:
 *   - M: Move to first point (start)
 *   - L: Line to each subsequent point
 * 
 * Algorithm:
 *   1. Map all data points to SVG coordinates
 *   2. Start with M command to first point
 *   3. Add L command for each remaining point
 *   4. Round coordinates to 2 decimal places
 * 
 * Performance:
 *   - O(n) time complexity
 *   - Minimal string concatenation overhead
 *   - Tested with 10,000+ points
 * 
 * Example Output:
 *   "M 50.00,200.00 L 100.00,180.00 L 150.00,220.00"
 * ============================================================================
 */
export function generateLinePath(
  points: PricePoint[],
  bounds: ChartBounds,
  dimensions: ChartDimensions
): string {
  // Handle empty dataset
  if (points.length === 0) {
    return '';
  }
  
  // Handle single point (just draw a dot by moving to it)
  if (points.length === 1) {
    const svgPoint = mapPointToSVG(points[0], bounds, dimensions);
    return `M ${svgPoint.x.toFixed(2)},${svgPoint.y.toFixed(2)}`;
  }
  
  // Build path string
  const pathCommands: string[] = [];
  
  // First point: Move command
  const firstPoint = mapPointToSVG(points[0], bounds, dimensions);
  pathCommands.push(`M ${firstPoint.x.toFixed(2)},${firstPoint.y.toFixed(2)}`);
  
  // Remaining points: Line commands
  for (let i = 1; i < points.length; i++) {
    const svgPoint = mapPointToSVG(points[i], bounds, dimensions);
    pathCommands.push(`L ${svgPoint.x.toFixed(2)},${svgPoint.y.toFixed(2)}`);
  }
  
  return pathCommands.join(' ');
}

/**
 * ============================================================================
 * AREA PATH GENERATOR: Filled Area Chart
 * ============================================================================
 * 
 * Generates SVG path for filled area under line:
 * 
 *   M x1,bottom L x1,y1 L x2,y2 ... L xn,yn L xn,bottom Z
 * 
 * Where:
 *   - bottom: Y coordinate at bottom of chart (marginTop + chartHeight)
 * 
 * Algorithm:
 *   1. Move to bottom-left (first x, bottom y)
 *   2. Line up to first data point
 *   3. Follow data points across
 *   4. Line down to bottom-right
 *   5. Close path with Z command
 * 
 * This creates a closed polygon that can be filled with color/gradient.
 * ============================================================================
 */
export function generateAreaPath(
  points: PricePoint[],
  bounds: ChartBounds,
  dimensions: ChartDimensions
): string {
  // Handle empty dataset
  if (points.length === 0) {
    return '';
  }
  
  const bottom = dimensions.marginTop + (dimensions.height - dimensions.marginTop - dimensions.marginBottom);
  
  // Handle single point
  if (points.length === 1) {
    const svgPoint = mapPointToSVG(points[0], bounds, dimensions);
    return `M ${svgPoint.x.toFixed(2)},${bottom.toFixed(2)} L ${svgPoint.x.toFixed(2)},${svgPoint.y.toFixed(2)} L ${svgPoint.x.toFixed(2)},${bottom.toFixed(2)} Z`;
  }
  
  const pathCommands: string[] = [];
  
  // Start at bottom-left
  const firstPoint = mapPointToSVG(points[0], bounds, dimensions);
  pathCommands.push(`M ${firstPoint.x.toFixed(2)},${bottom.toFixed(2)}`);
  
  // Line up to first data point
  pathCommands.push(`L ${firstPoint.x.toFixed(2)},${firstPoint.y.toFixed(2)}`);
  
  // Follow the data points
  for (let i = 1; i < points.length; i++) {
    const svgPoint = mapPointToSVG(points[i], bounds, dimensions);
    pathCommands.push(`L ${svgPoint.x.toFixed(2)},${svgPoint.y.toFixed(2)}`);
  }
  
  // Line down to bottom-right
  const lastPoint = mapPointToSVG(points[points.length - 1], bounds, dimensions);
  pathCommands.push(`L ${lastPoint.x.toFixed(2)},${bottom.toFixed(2)}`);
  
  // Close path
  pathCommands.push('Z');
  
  return pathCommands.join(' ');
}

/**
 * ============================================================================
 * GRID LINES GENERATOR: Horizontal Price Lines
 * ============================================================================
 * 
 * Generates SVG path for horizontal grid lines at price ticks.
 * Each line spans full chart width.
 * 
 * Path format:
 *   M x1,y L x2,y M x1,y L x2,y ...
 * 
 * Multiple disconnected horizontal lines in single path.
 * ============================================================================
 */
export function generateGridLines(
  priceTicks: number[],
  bounds: ChartBounds,
  dimensions: ChartDimensions
): string {
  const pathCommands: string[] = [];
  
  const chartLeft = dimensions.marginLeft;
  const chartRight = dimensions.width - dimensions.marginRight;
  
  for (const price of priceTicks) {
    // Create a dummy point to get Y coordinate
    const dummyPoint: PricePoint = { price, timestamp: bounds.minTime };
    const svgPoint = mapPointToSVG(dummyPoint, bounds, dimensions);
    
    // Draw horizontal line across chart
    pathCommands.push(`M ${chartLeft.toFixed(2)},${svgPoint.y.toFixed(2)} L ${chartRight.toFixed(2)},${svgPoint.y.toFixed(2)}`);
  }
  
  return pathCommands.join(' ');
}

/**
 * ============================================================================
 * DOWNSAMPLING UTILITY: Reduce Point Count
 * ============================================================================
 * 
 * Reduces number of points for performance while preserving shape.
 * 
 * Algorithm: Largest-Triangle-Three-Buckets (LTTB)
 *   1. Divide data into buckets
 *   2. Keep first and last points
 *   3. For each bucket, select point that forms largest triangle
 * 
 * Benefits:
 *   - Preserves peaks and valleys
 *   - Maintains visual accuracy
 *   - Reduces rendering time
 * 
 * Use when: points.length > targetCount (e.g., 1000 points → 200 points)
 * ============================================================================
 */
export function downsamplePoints(points: PricePoint[], targetCount: number): PricePoint[] {
  // No downsampling needed
  if (points.length <= targetCount || targetCount < 3) {
    return points;
  }
  
  const result: PricePoint[] = [];
  
  // Always keep first point
  result.push(points[0]);
  
  // Calculate bucket size
  const bucketSize = (points.length - 2) / (targetCount - 2);
  
  let a = 0; // Start with first point
  
  for (let i = 0; i < targetCount - 2; i++) {
    // Calculate average point in next bucket (for triangle calculation)
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, points.length);
    
    let avgX = 0;
    let avgY = 0;
    let avgRangeLength = avgRangeEnd - avgRangeStart;
    
    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += points[j].timestamp;
      avgY += points[j].price;
    }
    
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;
    
    // Get the range for this bucket
    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.floor((i + 1) * bucketSize) + 1;
    
    // Point A (previous selected point)
    const pointA = points[a];
    
    let maxArea = -1;
    let maxAreaPoint = rangeStart;
    
    // Find point in bucket that creates largest triangle
    for (let j = rangeStart; j < rangeEnd; j++) {
      // Calculate area of triangle formed by: pointA, current point, avgPoint
      const area = Math.abs(
        (pointA.timestamp - avgX) * (points[j].price - pointA.price) -
        (pointA.timestamp - points[j].timestamp) * (avgY - pointA.price)
      ) * 0.5;
      
      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = j;
      }
    }
    
    result.push(points[maxAreaPoint]);
    a = maxAreaPoint; // This is the next point A
  }
  
  // Always keep last point
  result.push(points[points.length - 1]);
  
  return result;
}

/**
 * ============================================================================
 * TOOLTIP HELPER: Find Nearest Point
 * ============================================================================
 * 
 * Finds the data point closest to a given SVG coordinate (for tooltips).
 * 
 * Algorithm:
 *   1. Map all points to SVG coordinates
 *   2. Calculate distance from mouse position
 *   3. Return point with minimum distance
 * 
 * Uses Euclidean distance: sqrt((x2-x1)² + (y2-y1)²)
 * ============================================================================
 */
export function findNearestPoint(
  mouseX: number,
  mouseY: number,
  points: PricePoint[],
  bounds: ChartBounds,
  dimensions: ChartDimensions
): { point: PricePoint; index: number } | null {
  if (points.length === 0) {
    return null;
  }
  
  let minDistance = Infinity;
  let nearestIndex = 0;
  
  for (let i = 0; i < points.length; i++) {
    const svgPoint = mapPointToSVG(points[i], bounds, dimensions);
    const distance = Math.sqrt(
      Math.pow(svgPoint.x - mouseX, 2) + 
      Math.pow(svgPoint.y - mouseY, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }
  
  return {
    point: points[nearestIndex],
    index: nearestIndex,
  };
}

/**
 * ============================================================================
 * ANIMATION HELPER: Interpolate Path
 * ============================================================================
 * 
 * Generates intermediate path for smooth animation between two datasets.
 * 
 * Algorithm:
 *   1. Match points between old and new datasets
 *   2. Linearly interpolate each coordinate
 *   3. Generate path at given progress (0 to 1)
 * 
 * Used for smooth transitions when data updates.
 * ============================================================================
 */
export function interpolatePath(
  oldPoints: PricePoint[],
  newPoints: PricePoint[],
  progress: number,
  bounds: ChartBounds,
  dimensions: ChartDimensions
): string {
  // Simple case: same number of points
  if (oldPoints.length === newPoints.length) {
    const interpolatedPoints: PricePoint[] = [];
    
    for (let i = 0; i < oldPoints.length; i++) {
      interpolatedPoints.push({
        timestamp: oldPoints[i].timestamp + (newPoints[i].timestamp - oldPoints[i].timestamp) * progress,
        price: oldPoints[i].price + (newPoints[i].price - oldPoints[i].price) * progress,
      });
    }
    
    return generateLinePath(interpolatedPoints, bounds, dimensions);
  }
  
  // Complex case: different number of points
  // For simplicity, just use newPoints (instant transition)
  // A more sophisticated implementation would resample to match point counts
  return generateLinePath(newPoints, bounds, dimensions);
}
