/**
 * ============================================================================
 * Portfolio Summary Component
 * ============================================================================
 * 
 * Displays high-level portfolio metrics:
 * - Total portfolio value
 * - Total P&L (realized + unrealized)
 * - Cash balance
 * - Day's change
 * 
 * Features:
 * - Real-time updates via price subscriptions
 * - Color-coded gains/losses
 * - Percentage displays
 * - Responsive layout
 * ============================================================================
 */

import React, { memo } from 'react';
// import type { Portfolio, PortfolioMetrics } from '@types';
import { formatCurrency, formatPercent, getPLColor, getChangeArrow as getChangeArrowUtil } from '@utils/format';
import { usePortfolio, usePortfolioMetrics } from '../hooks/usePortfolio';
import styles from './PortfolioSummary.module.css';

interface PortfolioSummaryProps {
  className?: string;
}

/**
 * Portfolio Summary Component
 * 
 * Shows overview of portfolio performance with live updates
 */
export const PortfolioSummary: React.FC<PortfolioSummaryProps> = memo(({ className = '' }) => {
  const { portfolio, prices, isLoading } = usePortfolio();
  const metrics = usePortfolioMetrics(portfolio, prices);

  if (isLoading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading portfolio...</span>
        </div>
      </div>
    );
  }

  if (!portfolio || !metrics) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📊</div>
          <h3>No Portfolio Data</h3>
          <p>Start trading to build your portfolio</p>
        </div>
      </div>
    );
  }

  const totalPLColor = getPLColor(metrics.totalPL);
  const unrealizedPLColor = getPLColor(metrics.unrealizedPL);

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleIcon}>💼</span>
          Portfolio Summary
        </h2>
      </div>

      {/* Main Metrics */}
      <div className={styles.content}>
        {/* Total Value */}
        <div className={styles.mainMetric}>
          <div className={styles.metricLabel}>Total Value</div>
          <div className={styles.metricValue}>
            {formatCurrency(metrics.totalValue)}
          </div>
        </div>

        {/* Total P&L */}
        <div className={styles.plMetric}>
          <div className={styles.plLabel}>Total P&L</div>
          <div className={`${styles.plValue} ${styles[totalPLColor]}`}>
            <span className={styles.plArrow}>{getChangeArrowUtil(metrics.totalPL)}</span>
            <span>{formatCurrency(Math.abs(metrics.totalPL))}</span>
            <span className={styles.plPercent}>
              ({formatPercent(metrics.totalPLPercent, 2, true)})
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className={styles.metricsGrid}>
          {/* Cash */}
          <div className={styles.metric}>
            <div className={styles.metricLabel}>Cash</div>
            <div className={styles.metricValue}>
              {formatCurrency(portfolio.cash)}
            </div>
            <div className={styles.metricSubtext}>
              {formatPercent(metrics.cashPercent)} of portfolio
            </div>
          </div>

          {/* Invested */}
          <div className={styles.metric}>
            <div className={styles.metricLabel}>Invested</div>
            <div className={styles.metricValue}>
              {formatCurrency(metrics.totalInvested)}
            </div>
            <div className={styles.metricSubtext}>
              {formatPercent(1 - metrics.cashPercent)} of portfolio
            </div>
          </div>

          {/* Realized P&L */}
          <div className={styles.metric}>
            <div className={styles.metricLabel}>Realized P&L</div>
            <div className={`${styles.metricValue} ${styles[getPLColor(metrics.realizedPL)]}`}>
              {formatCurrency(metrics.realizedPL, 2)}
            </div>
            <div className={styles.metricSubtext}>From closed positions</div>
          </div>

          {/* Unrealized P&L */}
          <div className={styles.metric}>
            <div className={styles.metricLabel}>Unrealized P&L</div>
            <div className={`${styles.metricValue} ${styles[unrealizedPLColor]}`}>
              {formatCurrency(metrics.unrealizedPL, 2)}
            </div>
            <div className={styles.metricSubtext}>
              {formatPercent(metrics.unrealizedPLPercent, 2, true)}
            </div>
          </div>
        </div>

        {/* Holdings Summary */}
        <div className={styles.holdingsSummary}>
          <div className={styles.holdingsCount}>
            <span className={styles.holdingsIcon}>📈</span>
            <span>
              {Object.keys(portfolio.positions).length} position
              {Object.keys(portfolio.positions).length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className={styles.initialCash}>
            Initial: {formatCurrency(portfolio.initialCash)}
          </div>
        </div>
      </div>
    </div>
  );
});

PortfolioSummary.displayName = 'PortfolioSummary';

export default PortfolioSummary;
