/**
 * ============================================================================
 * WatchlistItem Component - Individual Ticker Row
 * ============================================================================
 * 
 * Displays a single stock symbol with real-time price updates.
 * Heavily memoized to prevent unnecessary re-renders.
 * 
 * OPTIMIZATION:
 * - React.memo with custom equality check
 * - Only re-renders when price actually changes
 * - Isolated subscription (doesn't affect siblings)
 * 
 * PERFORMANCE:
 * - Each item subscribes independently to PriceEngine
 * - Price updates don't trigger parent re-renders
 * - Remove button memoized to prevent closure issues
 * ============================================================================
 */

import React, { memo, useCallback } from 'react';
import { usePrice } from '@hooks/usePrice';
import type { WatchlistItem as WatchlistItemType } from '@types';
import styles from './WatchlistItem.module.css';

/**
 * Component props
 */
export interface WatchlistItemProps {
  item: WatchlistItemType;
  onRemove: (symbol: string) => void;
}

/**
 * Format price change for display
 */
const formatChange = (change: number, changePercent: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
};

/**
 * Get CSS class for price change (positive/negative/neutral)
 */
const getChangeClass = (change: number): string => {
  if (change > 0) return styles.positive;
  if (change < 0) return styles.negative;
  return styles.neutral;
};

/**
 * Individual watchlist item component
 * Subscribes to price updates independently
 */
const WatchlistItemComponent: React.FC<WatchlistItemProps> = ({ item, onRemove }) => {
  const { price, isLoading, error } = usePrice(item.symbol);

  // Memoize remove handler to prevent re-creating on every render
  const handleRemove = useCallback(() => {
    onRemove(item.symbol);
  }, [item.symbol, onRemove]);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.item} data-loading="true">
        <div className={styles.symbol}>{item.symbol}</div>
        <div className={styles.price}>Loading...</div>
        <div className={styles.change}>--</div>
        <button 
          className={styles.removeBtn}
          onClick={handleRemove}
          aria-label={`Remove ${item.symbol} from watchlist`}
        >
          ×
        </button>
      </div>
    );
  }

  // Error state
  if (error || !price) {
    return (
      <div className={styles.item} data-error="true">
        <div className={styles.symbol}>{item.symbol}</div>
        <div className={styles.price}>Error</div>
        <div className={styles.change}>--</div>
        <button 
          className={styles.removeBtn}
          onClick={handleRemove}
          aria-label={`Remove ${item.symbol} from watchlist`}
        >
          ×
        </button>
      </div>
    );
  }

  // Normal state with price data
  return (
    <div className={styles.item}>
      <div className={styles.symbol}>
        <span className={styles.symbolText}>{price.symbol}</span>
      </div>
      
      <div className={styles.price}>
        <span className={styles.priceValue}>${price.price.toFixed(2)}</span>
        <span className={styles.spread}>
          Bid: {price.bid.toFixed(2)} / Ask: {price.ask.toFixed(2)}
        </span>
      </div>
      
      <div className={`${styles.change} ${getChangeClass(price.change)}`}>
        {formatChange(price.change, price.changePercent)}
      </div>
      
      <div className={styles.highLow}>
        <span className={styles.high}>H: {price.high.toFixed(2)}</span>
        <span className={styles.low}>L: {price.low.toFixed(2)}</span>
      </div>

      <button 
        className={styles.removeBtn}
        onClick={handleRemove}
        aria-label={`Remove ${item.symbol} from watchlist`}
        title="Remove from watchlist"
      >
        ×
      </button>
    </div>
  );
};

/**
 * Custom equality check for React.memo
 * Only re-render if symbol changes (price updates are handled by usePrice hook)
 */
const areEqual = (
  prevProps: Readonly<WatchlistItemProps>,
  nextProps: Readonly<WatchlistItemProps>
): boolean => {
  // Only re-render if symbol changes
  // Price updates are handled internally by usePrice hook
  return (
    prevProps.item.symbol === nextProps.item.symbol &&
    prevProps.onRemove === nextProps.onRemove
  );
};

/**
 * Memoized export to prevent unnecessary re-renders
 * Each item only re-renders when its own price changes
 */
export const WatchlistItem = memo(WatchlistItemComponent, areEqual);
