/**
 * ============================================================================
 * SVG Chart Component - Real-Time Price Visualization
 * ============================================================================
 * 
 * High-performance SVG line chart with real-time price updates.
 * 
 * FEATURES:
 * - Live price updates (1-second interval)
 * - Responsive SVG with viewBox scaling
 * - Y-axis price labels (auto-scaled)
 * - X-axis time labels (auto-formatted)
 * - Grid lines for reference
 * - Hover tooltip with crosshair
 * - Color-coded positive/negative changes
 * - Filled area under line (optional)
 * - Smooth animations
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - React.memo with custom equality check
 * - useMemo for expensive calculations (path generation, bounds)
 * - useCallback for event handlers
 * - SVG path memoization (only recalculate on data change)
 * - Downsampling for large datasets (>1000 points → 500 points)
 * 
 * MATHEMATICAL FORMULAS:
 * - Normalization: (value - min) / (max - min)
 * - X Scale: marginLeft + normalized * chartWidth
 * - Y Scale: marginTop + (1 - normalized) * chartHeight (inverted)
 * - SVG Path: M x1,y1 L x2,y2 L x3,y3 ...
 * ============================================================================
 */

import React, { memo, useMemo, useCallback, useState, useRef } from 'react';
import type { PricePoint } from '@types';
import { useChartData } from '../hooks/useChartData';
import {
  calculateBounds,
  generatePriceTicks,
  generateTimeTicks,
  formatPrice,
  formatTime,
  mapPointToSVG,
  type ChartDimensions,
} from '../utils/coordinates';
import {
  generateLinePath,
  generateAreaPath,
  generateGridLines,
  downsamplePoints,
  findNearestPoint,
} from '../utils/pathGenerator';
import styles from './Chart.module.css';

/**
 * Chart component props
 */
export interface ChartProps {
  /** Stock symbol to display */
  symbol: string;
  
  /** Chart width in pixels */
  width?: number;
  
  /** Chart height in pixels */
  height?: number;
  
  /** Show filled area under line */
  showArea?: boolean;
  
  /** Show grid lines */
  showGrid?: boolean;
  
  /** Show price axis labels */
  showPriceAxis?: boolean;
  
  /** Show time axis labels */
  showTimeAxis?: boolean;
  
  /** Enable hover tooltip */
  showTooltip?: boolean;
  
  /** Max data points (for downsampling) */
  maxPoints?: number;
  
  /** Additional CSS class */
  className?: string;
  
  /** Line color (default: auto based on change) */
  lineColor?: string;
  
  /** Area fill color */
  areaColor?: string;
}

/**
 * ============================================================================
 * MAIN COMPONENT: Chart
 * ============================================================================
 */
const ChartComponent: React.FC<ChartProps> = ({
  symbol,
  width = 800,
  height = 400,
  showArea = true,
  showGrid = true,
  showPriceAxis = true,
  showTimeAxis = true,
  showTooltip = true,
  maxPoints = 500,
  className = '',
  lineColor,
  areaColor,
}) => {
  // Hooks
  const { data, currentPrice, isLoading, error } = useChartData(symbol, maxPoints);
  const [hoveredPoint, setHoveredPoint] = useState<{ point: PricePoint; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * Chart dimensions with margins
   */
  const dimensions: ChartDimensions = useMemo(() => ({
    width,
    height,
    marginTop: 20,
    marginRight: showPriceAxis ? 60 : 20,
    marginBottom: showTimeAxis ? 40 : 20,
    marginLeft: 20,
  }), [width, height, showPriceAxis, showTimeAxis]);

  /**
   * Downsample data if needed (performance optimization)
   */
  const processedData = useMemo(() => {
    if (data.length > 1000) {
      return downsamplePoints(data, 500);
    }
    return data;
  }, [data]);

  /**
   * Calculate chart bounds (min/max for both axes)
   */
  const bounds = useMemo(() => {
    return calculateBounds(processedData);
  }, [processedData]);

  /**
   * Generate price ticks for Y-axis
   */
  const priceTicks = useMemo(() => {
    return generatePriceTicks(bounds.minPrice, bounds.maxPrice, 5);
  }, [bounds]);

  /**
   * Generate time ticks for X-axis
   */
  const timeTicks = useMemo(() => {
    return generateTimeTicks(bounds.minTime, bounds.maxTime, 5);
  }, [bounds]);

  /**
   * Generate SVG path for line
   */
  const linePath = useMemo(() => {
    return generateLinePath(processedData, bounds, dimensions);
  }, [processedData, bounds, dimensions]);

  /**
   * Generate SVG path for area fill
   */
  const areaPath = useMemo(() => {
    if (!showArea) return '';
    return generateAreaPath(processedData, bounds, dimensions);
  }, [showArea, processedData, bounds, dimensions]);

  /**
   * Generate SVG path for grid lines
   */
  const gridPath = useMemo(() => {
    if (!showGrid) return '';
    return generateGridLines(priceTicks, bounds, dimensions);
  }, [showGrid, priceTicks, bounds, dimensions]);

  /**
   * Determine line color based on price change
   */
  const actualLineColor = useMemo(() => {
    if (lineColor) return lineColor;
    
    if (currentPrice) {
      return currentPrice.change >= 0 ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)';
    }
    
    return 'var(--color-primary, #3b82f6)';
  }, [lineColor, currentPrice]);

  /**
   * Determine area fill color
   */
  const actualAreaColor = useMemo(() => {
    if (areaColor) return areaColor;
    
    if (currentPrice) {
      return currentPrice.change >= 0 
        ? 'rgba(16, 185, 129, 0.1)' 
        : 'rgba(239, 68, 68, 0.1)';
    }
    
    return 'rgba(59, 130, 246, 0.1)';
  }, [areaColor, currentPrice]);

  /**
   * Handle mouse move for tooltip
   */
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!showTooltip || !svgRef.current || processedData.length === 0) {
      return;
    }

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    
    // Convert mouse position to SVG coordinates
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find nearest point
    const nearest = findNearestPoint(x, y, processedData, bounds, dimensions);
    
    if (nearest) {
      const svgPoint = mapPointToSVG(nearest.point, bounds, dimensions);
      setHoveredPoint({
        point: nearest.point,
        x: svgPoint.x,
        y: svgPoint.y,
      });
    }
  }, [showTooltip, processedData, bounds, dimensions]);

  /**
   * Handle mouse leave
   */
  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <div className={`${styles.container} ${className}`} style={{ width, height }}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading chart data...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className={`${styles.container} ${className}`} style={{ width, height }}>
        <div className={styles.error}>
          <p>⚠️ Error loading chart</p>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      </div>
    );
  }

  /**
   * Render empty state
   */
  if (processedData.length === 0) {
    return (
      <div className={`${styles.container} ${className}`} style={{ width, height }}>
        <div className={styles.empty}>
          <p>📈</p>
          <p>No data available</p>
          <p className={styles.emptyHint}>Waiting for price updates...</p>
        </div>
      </div>
    );
  }

  /**
   * Main render
   */
  return (
    <div className={`${styles.container} ${className}`} style={{ width, height }}>
      {/* Header with current price */}
      {currentPrice && (
        <div className={styles.header}>
          <div className={styles.symbolName}>{symbol}</div>
          <div className={styles.priceInfo}>
            <span className={styles.currentPrice}>${currentPrice.price.toFixed(2)}</span>
            <span className={currentPrice.change >= 0 ? styles.changePositive : styles.changeNegative}>
              {currentPrice.change >= 0 ? '+' : ''}{currentPrice.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* SVG Chart */}
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Grid lines */}
        {showGrid && gridPath && (
          <path
            d={gridPath}
            className={styles.gridLines}
            stroke="var(--color-border, #e5e7eb)"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />
        )}

        {/* Area fill */}
        {showArea && areaPath && (
          <path
            d={areaPath}
            fill={actualAreaColor}
            opacity="0.3"
          />
        )}

        {/* Line path */}
        {linePath && (
          <path
            d={linePath}
            className={styles.linePath}
            stroke={actualLineColor}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Y-axis price labels */}
        {showPriceAxis && priceTicks.map((price, index) => {
          const dummyPoint: PricePoint = { price, timestamp: bounds.minTime };
          const svgPoint = mapPointToSVG(dummyPoint, bounds, dimensions);
          
          return (
            <g key={`price-${index}`}>
              <text
                x={width - dimensions.marginRight + 5}
                y={svgPoint.y}
                className={styles.axisLabel}
                dominantBaseline="middle"
                textAnchor="start"
                fill="var(--color-text-secondary, #6b7280)"
                fontSize="11"
              >
                ${formatPrice(price)}
              </text>
            </g>
          );
        })}

        {/* X-axis time labels */}
        {showTimeAxis && timeTicks.map((timestamp, index) => {
          const dummyPoint: PricePoint = { price: bounds.minPrice, timestamp };
          const svgPoint = mapPointToSVG(dummyPoint, bounds, dimensions);
          
          return (
            <g key={`time-${index}`}>
              <text
                x={svgPoint.x}
                y={height - dimensions.marginBottom + 15}
                className={styles.axisLabel}
                dominantBaseline="hanging"
                textAnchor="middle"
                fill="var(--color-text-secondary, #6b7280)"
                fontSize="10"
              >
                {formatTime(timestamp, bounds.minTime, bounds.maxTime)}
              </text>
            </g>
          );
        })}

        {/* Hover crosshair and tooltip */}
        {showTooltip && hoveredPoint && (
          <g className={styles.tooltip}>
            {/* Vertical crosshair line */}
            <line
              x1={hoveredPoint.x}
              y1={dimensions.marginTop}
              x2={hoveredPoint.x}
              y2={height - dimensions.marginBottom}
              stroke="var(--color-text-secondary, #6b7280)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.5"
            />
            
            {/* Horizontal crosshair line */}
            <line
              x1={dimensions.marginLeft}
              y1={hoveredPoint.y}
              x2={width - dimensions.marginRight}
              y2={hoveredPoint.y}
              stroke="var(--color-text-secondary, #6b7280)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.5"
            />
            
            {/* Point indicator */}
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="4"
              fill={actualLineColor}
              stroke="#ffffff"
              strokeWidth="2"
            />
            
            {/* Tooltip box */}
            <g>
              <rect
                x={hoveredPoint.x + 10}
                y={hoveredPoint.y - 30}
                width="120"
                height="50"
                fill="rgba(0, 0, 0, 0.8)"
                rx="4"
              />
              <text
                x={hoveredPoint.x + 15}
                y={hoveredPoint.y - 15}
                fill="#ffffff"
                fontSize="11"
                fontWeight="600"
              >
                ${hoveredPoint.point.price.toFixed(2)}
              </text>
              <text
                x={hoveredPoint.x + 15}
                y={hoveredPoint.y - 2}
                fill="#9ca3af"
                fontSize="9"
              >
                {new Date(hoveredPoint.point.timestamp).toLocaleTimeString()}
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* Footer with data info */}
      <div className={styles.footer}>
        <span className={styles.footerText}>
          {processedData.length} points • Updated {currentPrice ? new Date(currentPrice.timestamp).toLocaleTimeString() : 'N/A'}
        </span>
      </div>
    </div>
  );
};

/**
 * Memoize with custom equality check
 * Only re-render if symbol, dimensions, or show flags change
 */
const areEqual = (prevProps: ChartProps, nextProps: ChartProps): boolean => {
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.showArea === nextProps.showArea &&
    prevProps.showGrid === nextProps.showGrid &&
    prevProps.showPriceAxis === nextProps.showPriceAxis &&
    prevProps.showTimeAxis === nextProps.showTimeAxis &&
    prevProps.showTooltip === nextProps.showTooltip &&
    prevProps.lineColor === nextProps.lineColor &&
    prevProps.areaColor === nextProps.areaColor
  );
};

export const Chart = memo(ChartComponent, areEqual);

/**
 * Default export
 */
export default Chart;
