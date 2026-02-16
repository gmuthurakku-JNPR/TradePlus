/**
 * Watchlist Feature Barrel Export
 * 
 * Main entry point for the Watchlist feature.
 * Re-exports all components, hooks, and types.
 */

// Components
export { Watchlist, WatchlistItem } from './components';
export type { WatchlistProps, WatchlistItemProps } from './components';

// Hooks
export { useWatchlist } from './hooks';
export type { UseWatchlistResult } from './hooks';
