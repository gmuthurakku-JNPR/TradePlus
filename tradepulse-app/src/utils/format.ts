/**
 * ============================================================================
 * Formatting Utilities
 * ============================================================================
 * 
 * Utility functions for formatting financial data:
 * - Currency formatting (USD)
 * - Percentage formatting
 * - Number formatting
 * - Date/time formatting
 * 
 * Consistent formatting across the application.
 * ============================================================================
 */

/**
 * Format number as USD currency
 * 
 * @param value Number to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency(1234567.89) // "$1,234,567.89"
 * formatCurrency(-500) // "-$500.00"
 */
export const formatCurrency = (value: number, decimals: number = 2): string => {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absValue);
  
  return isNegative ? `-${formatted}` : formatted;
};

/**
 * Format number as percentage
 * 
 * @param value Number to format (0.05 = 5%)
 * @param decimals Number of decimal places (default: 2)
 * @param includeSign Include + for positive values
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercent(0.0525) // "5.25%"
 * formatPercent(0.0525, 2, true) // "+5.25%"
 * formatPercent(-0.0325) // "-3.25%"
 */
export const formatPercent = (
  value: number,
  decimals: number = 2,
  includeSign: boolean = false
): string => {
  const percent = value * 100;
  const formatted = percent.toFixed(decimals);
  
  if (includeSign && percent > 0) {
    return `+${formatted}%`;
  }
  
  return `${formatted}%`;
};

/**
 * Format number with thousands separators
 * 
 * @param value Number to format
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(1234.5678, 2) // "1,234.57"
 */
export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Format large numbers with suffixes (K, M, B)
 * 
 * @param value Number to format
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted compact number
 * 
 * @example
 * formatCompactNumber(1234) // "1.2K"
 * formatCompactNumber(1234567) // "1.2M"
 * formatCompactNumber(1234567890) // "1.2B"
 */
export const formatCompactNumber = (value: number, decimals: number = 1): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1e9) {
    return `${sign}${(absValue / 1e9).toFixed(decimals)}B`;
  } else if (absValue >= 1e6) {
    return `${sign}${(absValue / 1e6).toFixed(decimals)}M`;
  } else if (absValue >= 1e3) {
    return `${sign}${(absValue / 1e3).toFixed(decimals)}K`;
  }
  
  return `${sign}${absValue.toFixed(decimals)}`;
};

/**
 * Format timestamp as date
 * 
 * @param timestamp Unix timestamp in milliseconds
 * @param format Format type ('short', 'medium', 'long')
 * @returns Formatted date string
 * 
 * @example
 * formatDate(Date.now(), 'short') // "2/16/26"
 * formatDate(Date.now(), 'medium') // "Feb 16, 2026"
 * formatDate(Date.now(), 'long') // "February 16, 2026"
 */
export const formatDate = (
  timestamp: number,
  format: 'short' | 'medium' | 'long' = 'medium'
): string => {
  const date = new Date(timestamp);
  
  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: '2-digit',
      });
    case 'medium':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'long':
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
  }
};

/**
 * Format timestamp as time
 * 
 * @param timestamp Unix timestamp in milliseconds
 * @param includeSeconds Include seconds in output
 * @returns Formatted time string
 * 
 * @example
 * formatTime(Date.now()) // "2:30 PM"
 * formatTime(Date.now(), true) // "2:30:45 PM"
 */
export const formatTime = (timestamp: number, includeSeconds: boolean = false): string => {
  const date = new Date(timestamp);
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
  });
};

/**
 * Format timestamp as date and time
 * 
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted date and time string
 * 
 * @example
 * formatDateTime(Date.now()) // "Feb 16, 2026, 2:30 PM"
 */
export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Format relative time (e.g., "2 minutes ago")
 * 
 * @param timestamp Unix timestamp in milliseconds
 * @returns Relative time string
 * 
 * @example
 * formatRelativeTime(Date.now() - 60000) // "1 minute ago"
 * formatRelativeTime(Date.now() - 3600000) // "1 hour ago"
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  } else if (hours > 0) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  } else if (minutes > 0) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  } else if (seconds > 0) {
    return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
  } else {
    return 'just now';
  }
};

/**
 * Get color class for P&L value
 * 
 * @param value P&L value
 * @returns Color class name ('positive', 'negative', 'neutral')
 */
export const getPLColor = (value: number): 'positive' | 'negative' | 'neutral' => {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
};

/**
 * Get arrow indicator for change
 * 
 * @param value Change value
 * @returns Arrow character
 */
export const getChangeArrow = (value: number): string => {
  if (value > 0) return '▲';
  if (value < 0) return '▼';
  return '●';
};

export default {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatCompactNumber,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  getPLColor,
  getChangeArrow,
};
