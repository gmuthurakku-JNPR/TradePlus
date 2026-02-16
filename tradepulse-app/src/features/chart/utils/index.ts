/**
 * Chart Utilities Barrel Export
 */

// Coordinate utilities
export {
  normalize,
  scaleX,
  scaleY,
  mapPointToSVG,
  calculateBounds,
  generatePriceTicks,
  generateTimeTicks,
  formatPrice,
  formatTime,
} from './coordinates';

export type {
  ChartDimensions,
  ChartBounds,
  SVGPoint,
} from './coordinates';

// Path generation utilities
export {
  generateLinePath,
  generateAreaPath,
  generateGridLines,
  downsamplePoints,
  findNearestPoint,
  interpolatePath,
} from './pathGenerator';
