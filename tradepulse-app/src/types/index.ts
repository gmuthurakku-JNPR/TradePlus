/**
 * Core Type Definitions for TradePulse
 * Source: PSD and Architecture Specifications
 */

/**
 * PRICE MODULE TYPES
 */
export interface PriceData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  timestamp: number;
  previousClose: number;
}

export interface PricePoint {
  price: number;
  timestamp: number;
}

export interface PriceHistory {
  symbol: string;
  points: PricePoint[];
  maxPoints: number;
}

export interface SymbolInfo {
  symbol: string;
  volatility: number;
  liquidity: number;
  previousClose: number;
}

/**
 * TRADE MODULE TYPES
 */
export interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  executedPrice: number;
  total: number;
  createdAt: number;
  executedAt: number;
  status: 'executed' | 'failed';
  error?: string;
}

export interface TradeRequest {
  symbol: string;
  quantity: number;
  price: number;
  type: 'BUY' | 'SELL';
  orderType?: 'MARKET' | 'LIMIT';
}

export interface TradeResult {
  success: boolean;
  trade?: Trade;
  error?: string;
}

export interface TradeValidation {
  isValid: boolean;
  error?: string;
}

/**
 * ORDER MODULE TYPES
 */
export type OrderStatus = 
  | 'pending'    // Order created, monitoring price
  | 'triggered'  // Price condition met, executing trade
  | 'filled'     // Trade successfully executed
  | 'cancelled'  // User cancelled order
  | 'expired'    // Order expired (time-based)
  | 'failed';    // Execution failed

export interface LimitOrder {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  limitPrice: number;
  quantity: number;
  createdAt: number;
  status: OrderStatus;
  triggeredAt?: number;
  filledAt?: number;
  cancelledAt?: number;
  executedPrice?: number;
  executedTotal?: number;
  tradeId?: string;
  error?: string;
}

export interface OrderRequest {
  symbol: string;
  type: 'BUY' | 'SELL';
  limitPrice: number;
  quantity: number;
}

export interface OrderUpdate {
  limitPrice?: number;
  quantity?: number;
}

/**
 * PORTFOLIO MODULE TYPES
 */
export interface Position {
  symbol: string;
  shares: number;
  avgCost: number;
}

export interface Portfolio {
  cash: number;
  positions: Record<string, Position>;
  realizedPL: number;
  initialCash: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalInvested: number;
  totalPL: number;
  totalPLPercent: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  cashPercent: number;
}

/**
 * WATCHLIST MODULE TYPES
 */
export interface WatchlistItem {
  symbol: string;
  addedAt: number;
  notes?: string;
}

/**
 * PREFERENCES MODULE TYPES
 */
export interface Preferences {
  theme: 'light' | 'dark';
  currency: 'USD' | 'EUR' | 'GBP';
  decimalPlaces: number;
  chartTimeframe: '1m' | '5m' | '15m' | '1h' | '1d';
  language: string;
}

/**
 * STORAGE SCHEMA TYPES
 */
export interface StorageSchema {
  version: string;
  portfolio: Portfolio;
  trades: Trade[];
  orders: LimitOrder[];
  watchlist: string[];
  preferences: Preferences;
}

/**
 * ERROR TYPES
 */
export interface AppError {
  code: string;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

/**
 * UI STATE TYPES
 */
export interface UIState {
  selectedSymbol: string | null;
  selectedTimeframe: string;
  isPriceLoading: boolean;
  isChartLoading: boolean;
  showOrderPanel: boolean;
  showSettings: boolean;
  error: AppError | null;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  timestamp: number;
}

/**
 * CHART DATA TYPES
 */
export interface ChartPoint {
  x: number;
  price: number;
  timestamp: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface ChartDomain {
  min: number;
  max: number;
  range: number;
}

export interface ChartViewport {
  startIndex: number;
  endIndex: number;
  width: number;
  height: number;
}

export interface ChartScale {
  xScale: (index: number) => number;
  yScale: (price: number) => number;
  invert: (pixel: number) => number;
}

/**
 * ENGINE TYPES
 */
export interface PriceEngineConfig {
  volatilityMultiplier: number;
  updateInterval: number;
  initialSymbols: string[];
}

export type PriceSubscriber = (price: PriceData) => void;
export type UnsubscribeFn = () => void;

/**
 * CONSTANTS
 */
export const DEFAULT_INITIAL_CASH = 100_000;
export const MAX_TRADE_HISTORY = 1000;
export const MAX_CHART_POINTS = 500;
export const CHART_UPDATE_INTERVAL_MS = 1000;
export const TRADE_THROTTLE_MS = 1000;
