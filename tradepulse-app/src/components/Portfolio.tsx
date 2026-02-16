/**
 * Portfolio Display Component
 * Shows positions, cash, and P&L metrics
 */

import { useEffect, useState } from 'react';
import TradeEngine from '@engines/TradeEngine';
import PriceEngine from '@engines/PriceEngine';
import type { PriceData as PriceDataType, Portfolio as PortfolioType } from '@types';

interface PriceData {
  [symbol: string]: number;
}

interface PortfolioProps {
  colors?: any;
  theme?: 'light' | 'dark';
}

export function Portfolio({ colors, theme }: PortfolioProps) {
  const [portfolio, setPortfolio] = useState<PortfolioType | null>(null);
  const [prices, setPrices] = useState<PriceData>({});

  useEffect(() => {
    // Get initial portfolio
    const initialPortfolio = TradeEngine.getPortfolio();
    setPortfolio(initialPortfolio);

    // Subscribe to price updates for each position
    const positions = Object.keys(initialPortfolio.positions);
    const unsubscribers: Array<() => void> = [];

    positions.forEach((symbol) => {
      const unsubscribe = PriceEngine.subscribe(symbol, (priceData: PriceDataType) => {
        setPrices((prev) => ({
          ...prev,
          [symbol]: priceData.price,
        }));
      });
      unsubscribers.push(unsubscribe);
    });

    // Poll portfolio for updates
    const interval = setInterval(() => {
      setPortfolio(TradeEngine.getPortfolio());
    }, 500);

    return () => {
      clearInterval(interval);
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  if (!portfolio) return null;

  const totalInvested = Object.entries(portfolio.positions).reduce(
    (sum, [, pos]) => sum + pos.shares * pos.avgCost,
    0
  );

  const totalPositionValue = Object.entries(portfolio.positions).reduce(
    (sum, [symbol, pos]) => sum + pos.shares * (prices[symbol] || pos.avgCost),
    0
  );

  const totalValue = portfolio.cash + totalPositionValue;
  const unrealizedPnL = totalPositionValue - totalInvested;
  const totalPnL = portfolio.realizedPL + unrealizedPnL;
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return (
    <div style={containerStyle(colors)}>
      <h3 style={{ margin: '0 0 1rem 0', color: colors?.text }}>💼 Portfolio</h3>

      {/* Summary Cards */}
      <div style={summaryGridStyle}>
        <div style={cardStyle(colors)}>
          <div style={labelStyle(colors)}>Total Value</div>
          <div style={valueStyle(colors)}>${totalValue.toFixed(2)}</div>
        </div>
        <div style={cardStyle(colors)}>
          <div style={labelStyle(colors)}>Cash</div>
          <div style={valueStyle(colors)}>${portfolio.cash.toFixed(2)}</div>
        </div>
        <div style={cardStyle(colors)}>
          <div style={labelStyle(colors)}>Realized P&L</div>
          <div style={{ ...valueStyle(colors), color: portfolio.realizedPL >= 0 ? '#10b981' : '#ef4444' }}>
            ${portfolio.realizedPL.toFixed(2)}
          </div>
        </div>
        <div style={cardStyle(colors)}>
          <div style={labelStyle(colors)}>Unrealized P&L</div>
          <div style={{ ...valueStyle(colors), color: unrealizedPnL >= 0 ? '#10b981' : '#ef4444' }}>
            ${unrealizedPnL.toFixed(2)}
          </div>
        </div>
        <div style={cardStyle(colors)}>
          <div style={labelStyle(colors)}>Total P&L</div>
          <div style={{ ...valueStyle(colors), color: totalPnL >= 0 ? '#10b981' : '#ef4444' }}>
            {totalPnL >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Positions */}
      {Object.keys(portfolio.positions).length > 0 && (
        <div style={positionsStyle}>
          <h4 style={{ margin: '1rem 0 0.5rem 0', color: colors?.text }}>Positions</h4>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderStyle(colors)}>
                <th style={thStyle(colors)}>Symbol</th>
                <th style={thStyle(colors)}>Shares</th>
                <th style={thStyle(colors)}>Avg Cost</th>
                <th style={thStyle(colors)}>Current Price</th>
                <th style={thStyle(colors)}>Position Value</th>
                <th style={thStyle(colors)}>P&L</th>
                <th style={thStyle(colors)}>P&L %</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(portfolio.positions).map(([symbol, pos]) => {
                const currentPrice = prices[symbol] || pos.avgCost;
                const positionValue = pos.shares * currentPrice;
                const positionCost = pos.shares * pos.avgCost;
                const positionPnL = positionValue - positionCost;
                const positionPnLPercent = (positionPnL / positionCost) * 100;

                return (
                  <tr key={symbol} style={tableRowStyle(colors)}>
                    <td style={tdStyle(colors)}>{symbol}</td>
                    <td style={tdStyle(colors)}>{pos.shares}</td>
                    <td style={tdStyle(colors)}>${pos.avgCost.toFixed(2)}</td>
                    <td style={tdStyle(colors)}>${currentPrice.toFixed(2)}</td>
                    <td style={tdStyle(colors)}>${positionValue.toFixed(2)}</td>
                    <td style={{ ...tdStyle(colors), color: positionPnL >= 0 ? '#10b981' : '#ef4444' }}>
                      {positionPnL >= 0 ? '+' : ''}${positionPnL.toFixed(2)}
                    </td>
                    <td style={{ ...tdStyle(colors), color: positionPnLPercent >= 0 ? '#10b981' : '#ef4444' }}>
                      {positionPnLPercent >= 0 ? '+' : ''}{positionPnLPercent.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {Object.keys(portfolio.positions).length === 0 && (
        <div style={emptyStyle(colors)}>No positions yet. Start trading to build your portfolio!</div>
      )}
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

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '0.5rem',
  marginBottom: '1rem',
};

const cardStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors?.bg || '#111827',
  border: `1px solid ${colors?.border || '#374151'}`,
  borderRadius: '0.375rem',
  padding: '0.75rem',
});

const labelStyle = (colors: any): React.CSSProperties => ({
  fontSize: '0.75rem',
  color: colors?.textSecondary || '#9ca3af',
  marginBottom: '0.25rem',
});

const valueStyle = (colors: any): React.CSSProperties => ({
  fontSize: '1.25rem',
  fontWeight: 'bold',
  color: colors?.text || '#f9fafb',
});

const positionsStyle: React.CSSProperties = {
  marginTop: '1rem',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.875rem',
};

const tableHeaderStyle = (colors: any): React.CSSProperties => ({
  borderBottom: `1px solid ${colors?.border || '#374151'}`,
});

const thStyle = (colors: any): React.CSSProperties => ({
  padding: '0.5rem',
  textAlign: 'left',
  color: colors?.textSecondary || '#9ca3af',
  fontWeight: 600,
  borderRight: `1px solid ${colors?.border || '#374151'}`,
});

const tableRowStyle = (colors: any): React.CSSProperties => ({
  borderBottom: `1px solid ${colors?.border || '#374151'}`,
});

const tdStyle = (colors: any): React.CSSProperties => ({
  padding: '0.5rem',
  borderRight: `1px solid ${colors?.border || '#374151'}`,
  color: colors?.textSecondary || '#d1d5db',
});

const emptyStyle = (colors: any): React.CSSProperties => ({
  textAlign: 'center',
  color: colors?.textSecondary || '#9ca3af',
  padding: '2rem',
});
