/**
 * Watchlist Component
 * Displays saved symbols with current prices
 */

import { useEffect, useState } from 'react';
import PriceEngine from '@engines/PriceEngine';
import type { PriceData } from '@types';

interface WatchlistItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
}

interface WatchlistProps {
  colors?: any;
  theme?: 'light' | 'dark';
}

export function Watchlist({ colors, theme }: WatchlistProps) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  const [newSymbol, setNewSymbol] = useState('');
  const [error, setError] = useState('');
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);

  useEffect(() => {
    // Load available symbols from PriceEngine
    const symbols = PriceEngine.getAvailableSymbols();
    setAvailableSymbols(symbols);
  }, []);

  useEffect(() => {
    // Initial setup
    PriceEngine.reset();
    const unsubscribers: Array<() => void> = [];

    watchlist.forEach((item) => {
      const unsubscribe = PriceEngine.subscribe(item.symbol, (priceData: PriceData) => {
        setWatchlist((prev) =>
          prev.map((w) =>
            w.symbol === item.symbol
              ? {
                  ...w,
                  price: priceData.price,
                  change: priceData.change,
                  changePercent: priceData.changePercent,
                  bid: priceData.bid,
                  ask: priceData.ask,
                }
              : w
          )
        );
      });
      unsubscribers.push(unsubscribe);
    });

    PriceEngine.start();

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      PriceEngine.stop();
    };
  }, [watchlist.length]);

  const addToWatchlist = () => {
    const upperSymbol = newSymbol.toUpperCase().trim();
    
    setError('');
    
    if (!upperSymbol) {
      setError('Please enter a symbol');
      return;
    }

    if (!availableSymbols.includes(upperSymbol)) {
      setError(`${upperSymbol} not available. Try: ${availableSymbols.join(', ')}`);
      return;
    }

    if (watchlist.some((w) => w.symbol === upperSymbol)) {
      setError(`${upperSymbol} is already in your watchlist`);
      return;
    }

    setWatchlist((prev) => [
      ...prev,
      { symbol: upperSymbol, price: 0, change: 0, changePercent: 0, bid: 0, ask: 0 },
    ]);
    setNewSymbol('');
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol));
  };

  return (
    <div style={containerStyle(colors)}>
      <div style={headerStyle(colors)}>
        <div>
          <h2 style={{ margin: 0, color: colors?.text }}>⭐ My Watchlist</h2>
          <p style={{ margin: '0.5rem 0 0 0', color: colors?.textSecondary || '#9ca3af', fontSize: '0.875rem' }}>
            Tracking {watchlist.length} symbols
          </p>
        </div>
      </div>

      {/* Add Symbol Section */}
      <div style={addSymbolSectionStyle(colors)}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: colors?.text }}>➕ Add Symbol to Watchlist</h3>
        <div style={inputGroupStyle}>
          <input
            type="text"
            placeholder="Enter symbol (e.g., AAPL, META, NVDA)"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addToWatchlist()}
            style={inputStyle(colors)}
          />
          <button onClick={addToWatchlist} style={addButtonStyle}>
            Add Symbol
          </button>
        </div>
        {error && <div style={errorStyle(colors)}>{error}</div>}
        <p style={{ marginTop: '0.75rem', color: colors?.textSecondary || '#9ca3af', fontSize: '0.875rem' }}>
          📌 Available symbols: {availableSymbols.join(', ')}
        </p>
      </div>

      {watchlist.length === 0 ? (
        <div style={emptyStyle(colors)}>
          <p style={{ color: colors?.text }}>📭 Your watchlist is empty</p>
          <p style={{ color: colors?.textSecondary || '#9ca3af', fontSize: '0.875rem' }}>Use the form above to add symbols</p>
        </div>
      ) : (
        <div style={gridStyle}>
          {watchlist.map((item) => (
            <div key={item.symbol} style={cardStyle(colors)}>
              <div style={cardHeaderStyle}>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', color: colors?.text }}>
                  {item.symbol}
                </h3>
                <button
                  onClick={() => removeFromWatchlist(item.symbol)}
                  style={removeButtonStyle}
                  title="Remove from watchlist"
                >
                  ✕
                </button>
              </div>

              <div style={priceStyle(colors)}>
                ${item.price.toFixed(2)}
              </div>

              <div
                style={{
                  ...changeStyle,
                  color:
                    item.changePercent >= 0 ? '#10b981' : '#ef4444',
                }}
              >
                {item.changePercent >= 0 ? '📈' : '📉'}{' '}
                {item.changePercent >= 0 ? '+' : ''}
                {item.changePercent.toFixed(2)}%
              </div>

              <div style={metricsStyle(colors)}>
                <div style={metricStyle(colors)}>
                  <span style={{ color: colors?.textSecondary || '#9ca3af' }}>Bid</span>
                  <span style={{ color: colors?.text }}>${item.bid.toFixed(2)}</span>
                </div>
                <div style={metricStyle(colors)}>
                  <span style={{ color: colors?.textSecondary || '#9ca3af' }}>Ask</span>
                  <span style={{ color: colors?.text }}>${item.ask.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const containerStyle = (colors: any): React.CSSProperties => ({
  padding: '0',
});

const headerStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors?.bgSecondary || '#374151',
  padding: '1.5rem',
  borderRadius: '0.5rem',
  marginBottom: '1.5rem',
  border: `1px solid ${colors?.border || '#4b5563'}`,
});

const addSymbolSectionStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors?.bgSecondary || '#374151',
  padding: '1.5rem',
  borderRadius: '0.5rem',
  border: '2px solid #10b981',
  marginBottom: '1.5rem',
});

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  marginBottom: '0.75rem',
};

const inputStyle = (colors: any): React.CSSProperties => ({
  flex: 1,
  padding: '0.75rem',
  backgroundColor: colors?.bg || '#111827',
  color: colors?.text || '#f9fafb',
  border: `1px solid ${colors?.border || '#374151'}`,
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
});

const addButtonStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  backgroundColor: '#10b981',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '0.875rem',
  transition: 'background-color 0.2s',
};

const errorStyle = (colors: any): React.CSSProperties => ({
  padding: '0.75rem',
  backgroundColor: colors?.bgSecondary === '#111827' ? '#7f1d1d' : '#fee2e2',
  color: colors?.bgSecondary === '#111827' ? '#fee2e2' : '#7f1d1d',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  border: colors?.bgSecondary === '#111827' ? '1px solid #dc2626' : '1px solid #fca5a5',
});

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
  gap: '1rem',
};

const cardStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors?.bgSecondary || '#1f2937',
  border: `1px solid ${colors?.border || '#374151'}`,
  borderRadius: '0.5rem',
  padding: '1.5rem',
  transition: 'all 0.2s',
  cursor: 'pointer',
});

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '1rem',
};

const priceStyle = (colors: any): React.CSSProperties => ({
  fontSize: '1.875rem',
  fontWeight: 'bold',
  color: colors?.text || '#f9fafb',
  marginBottom: '0.5rem',
});

const changeStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: '600',
  marginBottom: '1rem',
};

const metricsStyle = (colors: any): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  paddingTop: '1rem',
  borderTop: `1px solid ${colors?.border || '#374151'}`,
});

const metricStyle = (colors: any): React.CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.875rem',
  color: colors?.textSecondary || '#d1d5db',
});

const removeButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: '#9ca3af',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1.25rem',
  padding: '0',
  transition: 'color 0.2s',
};

const emptyStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors?.bgSecondary || '#374151',
  padding: '3rem',
  borderRadius: '0.5rem',
  textAlign: 'center',
  color: colors?.textSecondary || '#9ca3af',
  border: `1px dashed ${colors?.border || '#4b5563'}`,
});
