/**
 * ============================================================================
 * Watchlist Component - Container for Stock Watchlist
 * ============================================================================
 * 
 * Main container component for displaying user's stock watchlist.
 * Shows real-time prices for multiple symbols with add/remove functionality.
 * 
 * ARCHITECTURE:
 * - Container/Presenter pattern
 * - Independent subscriptions per item (isolation)
 * - Memoized callbacks prevent re-renders
 * - Virtualization-ready (future optimization)
 * 
 * PERFORMANCE:
 * - Each WatchlistItem subscribes independently
 * - Adding/removing items doesn't affect other items
 * - useCallback prevents re-creating handlers
 * - React.memo on WatchlistItem prevents unnecessary renders
 * 
 * STATE MANAGEMENT:
 * - Local state via useWatchlist hook
 * - Persisted to localStorage automatically
 * - No global state needed (feature isolation)
 * ============================================================================
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { WatchlistItem } from './WatchlistItem';
import { useWatchlist } from '../hooks/useWatchlist';
import styles from './Watchlist.module.css';

/**
 * Component props
 */
export interface WatchlistProps {
  className?: string;
  maxItems?: number;
}

/**
 * Main Watchlist component
 * Displays user's watchlist with add/remove functionality
 */
export const Watchlist: React.FC<WatchlistProps> = ({ 
  className = '',
  maxItems = 50,
}) => {
  const { watchlist, addSymbol, removeSymbol, isLoading } = useWatchlist();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle symbol input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.toUpperCase();
      setInputValue(value);
      setError(null);
    },
    []
  );

  /**
   * Handle add symbol
   * Validates and adds symbol to watchlist
   */
  const handleAddSymbol = useCallback(() => {
    const symbol = inputValue.trim().toUpperCase();

    // Validate input
    if (!symbol) {
      setError('Please enter a symbol');
      return;
    }

    if (!/^[A-Z0-9]{1,10}$/.test(symbol)) {
      setError('Invalid symbol format');
      return;
    }

    if (watchlist.length >= maxItems) {
      setError(`Maximum ${maxItems} symbols allowed`);
      return;
    }

    // Attempt to add
    const added = addSymbol(symbol);
    
    if (added) {
      setInputValue('');
      setError(null);
      inputRef.current?.focus();
    } else {
      setError(`${symbol} is already in your watchlist`);
    }
  }, [inputValue, watchlist.length, maxItems, addSymbol]);

  /**
   * Handle Enter key in input
   */
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddSymbol();
      }
    },
    [handleAddSymbol]
  );

  /**
   * Memoized remove handler
   * Prevents re-creating function on every render
   */
  const handleRemove = useCallback(
    (symbol: string) => {
      removeSymbol(symbol);
      setError(null);
    },
    [removeSymbol]
  );

  /**
   * Render watchlist items (memoized)
   */
  const renderedItems = useMemo(() => {
    if (watchlist.length === 0) {
      return (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📊</div>
          <p className={styles.emptyText}>Your watchlist is empty</p>
          <p className={styles.emptyHint}>Add symbols above to start tracking</p>
        </div>
      );
    }

    return watchlist.map((item) => (
      <WatchlistItem
        key={item.symbol}
        item={item}
        onRemove={handleRemove}
      />
    ));
  }, [watchlist, handleRemove]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading watchlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Header with add symbol input */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          Watchlist
          <span className={styles.count}>({watchlist.length})</span>
        </h2>
        
        <div className={styles.addSection}>
          <div className={styles.inputGroup}>
            <input
              ref={inputRef}
              type="text"
              className={styles.input}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Enter symbol (e.g., AAPL)"
              maxLength={10}
              aria-label="Stock symbol"
              aria-invalid={error ? 'true' : 'false'}
            />
            <button
              className={styles.addBtn}
              onClick={handleAddSymbol}
              disabled={!inputValue.trim()}
              aria-label="Add symbol to watchlist"
            >
              + Add
            </button>
          </div>
          
          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Column headers */}
      {watchlist.length > 0 && (
        <div className={styles.tableHeader}>
          <div className={styles.headerCell}>Symbol</div>
          <div className={styles.headerCell}>Price</div>
          <div className={styles.headerCell}>Change</div>
          <div className={styles.headerCell}>Day Range</div>
          <div className={styles.headerCell}></div>
        </div>
      )}

      {/* Watchlist items */}
      <div className={styles.list}>
        {renderedItems}
      </div>

      {/* Footer with stats */}
      {watchlist.length > 0 && (
        <div className={styles.footer}>
          <p className={styles.footerText}>
            {watchlist.length} {watchlist.length === 1 ? 'symbol' : 'symbols'} tracked
            {maxItems && ` • ${maxItems - watchlist.length} slots remaining`}
          </p>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
