/**
 * ============================================================================
 * Holdings List Component
 * ============================================================================
 * 
 * Displays list of portfolio positions with:
 * - Current market value
 * - Unrealized P&L
 * - Day's change
 * - Live price updates
 * 
 * Features:
 * - Real-time price subscriptions per position
 * - Color-coded gains/losses
 * - Sortable columns
 * - Empty state for no holdings
 * ============================================================================
 */

import React, { memo, useState, useMemo } from 'react';
import type { Position, PriceData } from '@types';
import { formatCurrency, formatPercent, getPLColor, getChangeArrow } from '@utils/format';
import { usePortfolio, usePositionMetrics } from '../hooks/usePortfolio';
import styles from './HoldingsList.module.css';

interface HoldingsListProps {
  className?: string;
}

type SortField = 'symbol' | 'value' | 'pl' | 'plPercent';
type SortDirection = 'asc' | 'desc';

/**
 * Individual holding item component
 */
const HoldingItem = memo<{
  position: Position;
  priceData: PriceData | undefined;
}>(({ position, priceData }) => {
  const metrics = usePositionMetrics(position, priceData);
  const plColor = getPLColor(metrics.unrealizedPL);
  const dayChangeColor = getPLColor(metrics.dayChange);

  return (
    <div className={styles.holdingItem}>
      {/* Symbol */}
      <div className={styles.symbol}>
        <div className={styles.symbolMain}>{position.symbol}</div>
        <div className={styles.symbolSub}>
          {metrics.shares} shares @ {formatCurrency(metrics.avgCost)}
        </div>
      </div>

      {/* Current Price */}
      <div className={styles.price}>
        <div className={styles.priceMain}>{formatCurrency(metrics.currentPrice)}</div>
        <div className={`${styles.priceSub} ${styles[dayChangeColor]}`}>
          {getChangeArrow(metrics.dayChange)} {formatPercent(metrics.dayChangePercent, 2, true)}
        </div>
      </div>

      {/* Market Value */}
      <div className={styles.value}>
        <div className={styles.valueMain}>{formatCurrency(metrics.marketValue)}</div>
        <div className={styles.valueSub}>Cost: {formatCurrency(metrics.costBasis)}</div>
      </div>

      {/* Unrealized P&L */}
      <div className={styles.pl}>
        <div className={`${styles.plMain} ${styles[plColor]}`}>
          {getChangeArrow(metrics.unrealizedPL)} {formatCurrency(Math.abs(metrics.unrealizedPL))}
        </div>
        <div className={`${styles.plSub} ${styles[plColor]}`}>
          {formatPercent(metrics.unrealizedPLPercent, 2, true)}
        </div>
      </div>
    </div>
  );
});

HoldingItem.displayName = 'HoldingItem';

/**
 * Holdings List Component
 */
export const HoldingsList: React.FC<HoldingsListProps> = memo(({ className = '' }) => {
  const { portfolio, prices, isLoading } = usePortfolio();
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Convert positions to array and calculate metrics
  const holdings = useMemo(() => {
    if (!portfolio) return [];

    return Object.entries(portfolio.positions).map(([symbol, position]) => {
      const priceData = prices[symbol];
      const currentPrice = priceData?.price || position.avgCost;
      const marketValue = position.shares * currentPrice;
      const costBasis = position.shares * position.avgCost;
      const unrealizedPL = marketValue - costBasis;
      const unrealizedPLPercent = costBasis > 0 ? unrealizedPL / costBasis : 0;

      return {
        position,
        priceData,
        marketValue,
        unrealizedPL,
        unrealizedPLPercent,
      };
    });
  }, [portfolio, prices]);

  // Sort holdings
  const sortedHoldings = useMemo(() => {
    const sorted = [...holdings];

    sorted.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'symbol':
          return sortDirection === 'asc'
            ? a.position.symbol.localeCompare(b.position.symbol)
            : b.position.symbol.localeCompare(a.position.symbol);
        case 'value':
          aValue = a.marketValue;
          bValue = b.marketValue;
          break;
        case 'pl':
          aValue = a.unrealizedPL;
          bValue = b.unrealizedPL;
          break;
        case 'plPercent':
          aValue = a.unrealizedPLPercent;
          bValue = b.unrealizedPLPercent;
          break;
        default:
          return 0;
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [holdings, sortField, sortDirection]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (isLoading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading holdings...</span>
        </div>
      </div>
    );
  }

  if (!portfolio || holdings.length === 0) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <span className={styles.titleIcon}>📊</span>
            Holdings
          </h2>
        </div>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📈</div>
          <h3>No Holdings</h3>
          <p>You don't have any positions yet</p>
          <p className={styles.emptyHint}>Buy stocks to start building your portfolio</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleIcon}>📊</span>
          Holdings
          <span className={styles.count}>({holdings.length})</span>
        </h2>
      </div>

      {/* Column Headers */}
      <div className={styles.columnHeaders}>
        <button
          className={`${styles.columnHeader} ${styles.symbolHeader} ${
            sortField === 'symbol' ? styles.active : ''
          }`}
          onClick={() => handleSort('symbol')}
        >
          Symbol
          {sortField === 'symbol' && (
            <span className={styles.sortArrow}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>

        <div className={styles.columnHeader}>Price</div>

        <button
          className={`${styles.columnHeader} ${sortField === 'value' ? styles.active : ''}`}
          onClick={() => handleSort('value')}
        >
          Market Value
          {sortField === 'value' && (
            <span className={styles.sortArrow}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>

        <button
          className={`${styles.columnHeader} ${
            sortField === 'pl' || sortField === 'plPercent' ? styles.active : ''
          }`}
          onClick={() => handleSort('pl')}
        >
          Unrealized P&L
          {(sortField === 'pl' || sortField === 'plPercent') && (
            <span className={styles.sortArrow}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>
      </div>

      {/* Holdings List */}
      <div className={styles.list}>
        {sortedHoldings.map(({ position, priceData }) => (
          <HoldingItem key={position.symbol} position={position} priceData={priceData} />
        ))}
      </div>

      {/* Summary Footer */}
      <div className={styles.footer}>
        <div className={styles.footerItem}>
          <span className={styles.footerLabel}>Total Positions:</span>
          <span className={styles.footerValue}>{holdings.length}</span>
        </div>
        <div className={styles.footerItem}>
          <span className={styles.footerLabel}>Total Market Value:</span>
          <span className={styles.footerValue}>
            {formatCurrency(
              holdings.reduce((sum, h) => sum + h.marketValue, 0)
            )}
          </span>
        </div>
      </div>
    </div>
  );
});

HoldingsList.displayName = 'HoldingsList';

export default HoldingsList;
