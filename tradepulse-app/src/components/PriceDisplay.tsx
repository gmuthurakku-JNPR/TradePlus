/**
 * Real-time Price Display Component
 * Connects to PriceEngine and displays live stock prices
 */

import { useEffect, useState } from 'react';
import PriceEngine from '@engines/PriceEngine';
import type { PriceData } from '@types';

interface Price {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
}

interface PriceDisplayProps {
  colors?: any;
  theme?: 'light' | 'dark';
}

export function PriceDisplay({ colors, theme }: PriceDisplayProps) {
  const [prices, setPrices] = useState<{ [key: string]: Price }>({});
  const [isRunning, setIsRunning] = useState(false);
  const [symbols, setSymbols] = useState<string[]>([]);

  useEffect(() => {
    // Load available symbols from PriceEngine
    const availableSymbols = PriceEngine.getAvailableSymbols();
    // Show first 5 symbols by default
    setSymbols(availableSymbols.slice(0, 5));
  }, []);

  useEffect(() => {
    if (symbols.length === 0) return;

    // Reset on mount
    PriceEngine.reset();

    // Subscribe to multiple symbols
    const unsubscribers: Array<() => void> = [];

    symbols.forEach((symbol) => {
      const unsubscribe = PriceEngine.subscribe(symbol, (priceData: PriceData) => {
        setPrices((prev) => ({
          ...prev,
          [symbol]: priceData,
        }));
      });
      unsubscribers.push(unsubscribe);
    });

    // Start price engine
    PriceEngine.start();
    setIsRunning(true);

    return () => {
      // Cleanup
      unsubscribers.forEach((unsub) => unsub());
      PriceEngine.stop();
      setIsRunning(false);
    };
  }, [symbols]);

  return (
    <div style={containerStyle(colors)}>
      <div style={headerStyle(colors)}>
        <h3 style={{ margin: 0 }}>📊 Market Prices</h3>
        <span style={statusStyle}>{isRunning ? '🟢 Live' : '⚪ Stopped'}</span>
      </div>

      <div style={gridStyle}>
        {Object.entries(prices).map(([symbol, data]) => (
          <div key={symbol} style={priceCardStyle(colors)}>
            <div style={symbolStyle(colors)}>{symbol}</div>
            <div style={priceStyle(colors)}>${data.price.toFixed(2)}</div>
            <div style={changeStyle(data.changePercent)}>
              {data.changePercent > 0 ? '📈' : '📉'} {data.changePercent.toFixed(2)}%
            </div>
            <div style={metricsStyle(colors)}>
              <div>High: ${data.high.toFixed(2)}</div>
              <div>Low: ${data.low.toFixed(2)}</div>
              <div>Bid: ${data.bid.toFixed(2)} | Ask: ${data.ask.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const containerStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors?.bgSecondary || '#1f2937',
  border: `1px solid ${colors?.border || '#374151'}`,
  borderRadius: '0.5rem',
  padding: '1rem',
  marginBottom: '1rem',
});

const headerStyle = (colors: any): React.CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
  borderBottom: `1px solid ${colors?.border || '#374151'}`,
  paddingBottom: '0.5rem',
});

const statusStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#10b981',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
};

const priceCardStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors?.bg || '#111827',
  border: `1px solid ${colors?.border || '#374151'}`,
  borderRadius: '0.375rem',
  padding: '1rem',
});

const symbolStyle = (colors: any): React.CSSProperties => ({
  fontSize: '0.875rem',
  color: colors?.textSecondary || '#9ca3af',
  marginBottom: '0.25rem',
});

const priceStyle = (colors: any): React.CSSProperties => ({
  fontSize: '1.5rem',
  fontWeight: 'bold',
  color: colors?.text || '#f9fafb',
  marginBottom: '0.25rem',
});

const changeStyle = (percent: number): React.CSSProperties => ({
  fontSize: '0.875rem',
  color: percent > 0 ? '#10b981' : '#ef4444',
  marginBottom: '0.5rem',
});

const metricsStyle = (colors: any): React.CSSProperties => ({
  fontSize: '0.75rem',
  color: colors?.textSecondary || '#d1d5db',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});
