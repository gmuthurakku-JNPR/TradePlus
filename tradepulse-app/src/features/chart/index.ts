/**
 * Chart Feature Barrel Export
 * 
 * Main entry point for the Chart feature.
 * Re-exports all components, hooks, utilities, and types.
 */

// Components
export { Chart } from './components';
export type { ChartProps } from './components';

// Hooks
export { 
  useChartData, 
  useChartDataSnapshot,
  useMultiChartData,
  useChartDataRange 
} from './hooks';
export type { UseChartDataResult } from './hooks';

// Utilities
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
  generateLinePath,
  generateAreaPath,
  generateGridLines,
  downsamplePoints,
  findNearestPoint,
  interpolatePath,
} from './utils';

export type {
  ChartDimensions,
  ChartBounds,
  SVGPoint,
} from './utils';
