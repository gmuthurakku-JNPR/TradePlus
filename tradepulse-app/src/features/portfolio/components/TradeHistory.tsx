/**
 * ============================================================================
 * Trade History Component
 * ============================================================================
 * 
 * Displays list of past trades with:
 * - Trade type (BUY/SELL)
 * - Execution details (price, quantity, total)
 * - Timestamp
 * - Status
 * 
 * Features:
 * - Paginated display
 * - Color-coded trade types
 * - Sortable columns
 * - Empty state for no trades
 * - Responsive layout
 * ============================================================================
 */

import React, { memo, useState, useMemo } from 'react';
import type { Trade } from '@types';
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
} from '@utils/format';
import { useTradeHistory } from '../hooks/usePortfolio';
import styles from './TradeHistory.module.css';

interface TradeHistoryProps {
  className?: string;
  limit?: number;
}

type SortField = 'executedAt' | 'symbol' | 'type' | 'total';
type SortDirection = 'asc' | 'desc';

/**
 * Individual trade item component
 */
const TradeItem = memo<{ trade: Trade }>(({ trade }) => {
  const isBuy = trade.type === 'BUY';
  const typeColorClass = isBuy ? styles.buy : styles.sell;

  return (
    <div className={styles.tradeItem}>
      {/* Type Badge */}
      <div className={styles.typeCell}>
        <span className={`${styles.typeBadge} ${typeColorClass}`}>
          {isBuy ? '↗' : '↘'} {trade.type}
        </span>
      </div>

      {/* Symbol */}
      <div className={styles.symbolCell}>
        <div className={styles.symbolMain}>{trade.symbol}</div>
        <div className={styles.symbolSub}>
          {trade.quantity} shares @ {formatCurrency(trade.executedPrice)}
        </div>
      </div>

      {/* Order Type */}
      <div className={styles.orderTypeCell}>
        <span className={styles.orderTypeBadge}>{trade.orderType}</span>
      </div>

      {/* Total */}
      <div className={styles.totalCell}>
        <div className={`${styles.totalMain} ${typeColorClass}`}>
          {isBuy ? '-' : '+'}{formatCurrency(trade.total)}
        </div>
      </div>

      {/* Timestamp */}
      <div className={styles.timeCell}>
        <div className={styles.timeMain}>{formatDateTime(trade.executedAt)}</div>
        <div className={styles.timeSub}>{formatRelativeTime(trade.executedAt)}</div>
      </div>

      {/* Status */}
      <div className={styles.statusCell}>
        <span
          className={`${styles.statusBadge} ${
            trade.status === 'executed' ? styles.executed : styles.failed
          }`}
        >
          {trade.status === 'executed' ? '✓' : '✗'} {trade.status}
        </span>
      </div>
    </div>
  );
});

TradeItem.displayName = 'TradeItem';

/**
 * Trade History Component
 */
export const TradeHistory: React.FC<TradeHistoryProps> = memo(({ className = '', limit }) => {
  const { trades, isLoading } = useTradeHistory(limit);
  const [sortField, setSortField] = useState<SortField>('executedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort trades
  const sortedTrades = useMemo(() => {
    const sorted = [...trades];

    sorted.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'executedAt':
          aValue = a.executedAt;
          bValue = b.executedAt;
          break;
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'total':
          aValue = a.total;
          bValue = b.total;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
    });

    return sorted;
  }, [trades, sortField, sortDirection]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'executedAt' ? 'desc' : 'asc');
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalBuys = trades.filter((t) => t.type === 'BUY').length;
    const totalSells = trades.filter((t) => t.type === 'SELL').length;
    const totalVolume = trades.reduce((sum, t) => sum + t.total, 0);

    return { totalBuys, totalSells, totalVolume };
  }, [trades]);

  if (isLoading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading trade history...</span>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <span className={styles.titleIcon}>📜</span>
            Trade History
          </h2>
        </div>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📊</div>
          <h3>No Trade History</h3>
          <p>You haven't executed any trades yet</p>
          <p className={styles.emptyHint}>Your trades will appear here once you buy or sell stocks</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleIcon}>📜</span>
          Trade History
          <span className={styles.count}>({trades.length})</span>
        </h2>
      </div>

      {/* Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Trades:</span>
          <span className={styles.statValue}>{trades.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Buys:</span>
          <span className={`${styles.statValue} ${styles.buy}`}>{stats.totalBuys}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Sells:</span>
          <span className={`${styles.statValue} ${styles.sell}`}>{stats.totalSells}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Volume:</span>
          <span className={styles.statValue}>{formatCurrency(stats.totalVolume)}</span>
        </div>
      </div>

      {/* Column Headers */}
      <div className={styles.columnHeaders}>
        <button
          className={`${styles.columnHeader} ${sortField === 'type' ? styles.active : ''}`}
          onClick={() => handleSort('type')}
        >
          Type
          {sortField === 'type' && (
            <span className={styles.sortArrow}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>

        <button
          className={`${styles.columnHeader} ${sortField === 'symbol' ? styles.active : ''}`}
          onClick={() => handleSort('symbol')}
        >
          Symbol
          {sortField === 'symbol' && (
            <span className={styles.sortArrow}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>

        <div className={styles.columnHeader}>Order</div>

        <button
          className={`${styles.columnHeader} ${sortField === 'total' ? styles.active : ''}`}
          onClick={() => handleSort('total')}
        >
          Total
          {sortField === 'total' && (
            <span className={styles.sortArrow}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>

        <button
          className={`${styles.columnHeader} ${sortField === 'executedAt' ? styles.active : ''}`}
          onClick={() => handleSort('executedAt')}
        >
          Time
          {sortField === 'executedAt' && (
            <span className={styles.sortArrow}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>

        <div className={styles.columnHeader}>Status</div>
      </div>

      {/* Trade List */}
      <div className={styles.list}>
        {sortedTrades.map((trade) => (
          <TradeItem key={trade.id} trade={trade} />
        ))}
      </div>
    </div>
  );
});

TradeHistory.displayName = 'TradeHistory';

export default TradeHistory;
