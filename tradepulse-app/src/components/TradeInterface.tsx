/**
 * Trade Interface Component
 * Allows users to place BUY and SELL orders
 */

import { useState, useEffect } from 'react';
import TradeEngine from '@engines/TradeEngine';
import PriceEngine from '@engines/PriceEngine';
import { useToast } from '@contexts/ToastContext';

interface TradeInterfaceProps {
  colors?: any;
  theme?: 'light' | 'dark';
  onTradeSuccess?: () => void;
}

export function TradeInterface({ colors, theme, onTradeSuccess }: TradeInterfaceProps) {
  const [symbol, setSymbol] = useState('AAPL');
  const [quantity, setQuantity] = useState('10');
  const [price, setPrice] = useState('150');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [symbols, setSymbols] = useState<string[]>([]);
  const { addToast } = useToast();

  useEffect(() => {
    // Load available symbols from PriceEngine
    const availableSymbols = PriceEngine.getAvailableSymbols();
    setSymbols(availableSymbols);
  }, []);

  const handleTrade = () => {
    setMessage('');

    // Validate inputs
    if (!symbol) {
      setMessage('Please select a symbol');
      setMessageType('error');
      addToast('Please select a symbol', 'error');
      return;
    }

    const qty = parseInt(quantity);
    const prc = parseFloat(price);

    if (isNaN(qty) || qty <= 0) {
      setMessage('Quantity must be positive');
      setMessageType('error');
      addToast('Quantity must be positive', 'error');
      return;
    }

    if (isNaN(prc) || prc <= 0) {
      setMessage('Price must be positive');
      setMessageType('error');
      addToast('Price must be positive', 'error');
      return;
    }

    // Execute trade
    const result = TradeEngine.executeTrade({
      symbol,
      type: tradeType,
      quantity: qty,
      price: prc,
      orderType: 'MARKET',
    });

    if (result.success) {
      const successMsg = `${tradeType} order executed: ${qty} ${symbol} @ $${prc.toFixed(2)}`;
      setMessage(`✅ ${successMsg}`);
      setMessageType('success');
      addToast(successMsg, 'success');
      // Reset form
      setQuantity('10');
      setPrice('150');
      // Navigate to dashboard after successful trade
      setTimeout(() => {
        if (onTradeSuccess) {
          onTradeSuccess();
        }
      }, 800);
    } else {
      const errorMsg = `Trade failed: ${result.error || 'Unknown error'}`;
      setMessage(`❌ ${errorMsg}`);
      setMessageType('error');
      addToast(errorMsg, 'error');
    }
  };

  return (
    <div style={containerStyle(colors)}>
      <h3 style={{ margin: '0 0 1rem 0', color: colors?.text }}>📝 Place Trade</h3>

      <div style={formGroupStyle}>
        <label style={labelStyle(colors)}>Symbol</label>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={selectStyle(colors)}
        >
          {symbols.map((sym) => (
            <option key={sym} value={sym}>
              {sym}
            </option>
          ))}
        </select>
      </div>

      <div style={formRowStyle}>
        <div style={formGroupStyle}>
          <label style={labelStyle(colors)}>Trade Type</label>
          <div style={toggleStyle}>
            <button
              style={{
                ...toggleButtonStyle(colors),
                backgroundColor: tradeType === 'BUY' ? '#10b981' : colors?.border || '#374151',
              }}
              onClick={() => setTradeType('BUY')}
            >
              🟢 BUY
            </button>
            <button
              style={{
                ...toggleButtonStyle(colors),
                backgroundColor: tradeType === 'SELL' ? '#ef4444' : colors?.border || '#374151',
              }}
              onClick={() => setTradeType('SELL')}
            >
              🔴 SELL
            </button>
          </div>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle(colors)}>Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={inputStyle(colors)}
            min="1"
            step="1"
          />
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle(colors)}>Price ($)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={inputStyle(colors)}
            min="0.01"
            step="0.01"
          />
        </div>
      </div>

      <button onClick={handleTrade} style={executeButtonStyle(colors)}>
        🎯 Execute {tradeType}
      </button>

      {message && (
        <div style={{ ...messageStyle(colors), borderColor: messageType === 'success' ? '#10b981' : '#ef4444' }}>
          {message}
        </div>
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

const formGroupStyle: React.CSSProperties = {
  marginBottom: '1rem',
};

const labelStyle = (colors: any): React.CSSProperties => ({
  display: 'block',
  fontSize: '0.875rem',
  color: colors?.textSecondary || '#9ca3af',
  marginBottom: '0.25rem',
  fontWeight: 500,
});

const selectStyle = (colors: any): React.CSSProperties => ({
  width: '100%',
  padding: '0.5rem',
  backgroundColor: colors?.bg || '#111827',
  color: colors?.text || '#f9fafb',
  border: `1px solid ${colors?.border || '#374151'}`,
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  cursor: 'pointer',
});

const formRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '1rem',
  marginBottom: '1rem',
};

const toggleStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
};

const toggleButtonStyle = (colors: any): React.CSSProperties => ({
  flex: 1,
  padding: '0.5rem',
  border: 'none',
  borderRadius: '0.375rem',
  color: colors?.text || '#f9fafb',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
});

const inputStyle = (colors: any): React.CSSProperties => ({
  width: '100%',
  padding: '0.5rem',
  backgroundColor: colors?.bg || '#111827',
  color: colors?.text || '#f9fafb',
  border: `1px solid ${colors?.border || '#374151'}`,
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
});

const executeButtonStyle = (colors: any): React.CSSProperties => ({
  width: '100%',
  padding: '0.75rem',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.875rem',
  transition: 'background-color 0.2s',
});

const messageStyle = (colors: any): React.CSSProperties => ({
  marginTop: '1rem',
  padding: '0.75rem',
  backgroundColor: colors?.bgSecondary || '#111827',
  border: `1px solid ${colors?.border || '#374151'}`,
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  color: colors?.text || '#111827',
});
