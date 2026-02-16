/**
 * Order History Component
 * Displays trade history and current orders
 */

import { useEffect, useState } from 'react';
import TradeEngine from '@engines/TradeEngine';
import OrderEngine from '@engines/OrderEngine';

interface Order {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED';
  timestamp: number;
}

interface OrderHistoryProps {
  colors?: any;
  theme?: 'light' | 'dark';
}

export function OrderHistory({ colors, theme }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'pending'>('history');

  useEffect(() => {
    // Initial load
    loadOrders();

    // Poll every 1 second for updates
    const interval = setInterval(loadOrders, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadOrders = () => {
    try {
      // Get trade history from TradeEngine
      const history = TradeEngine.getTradeHistory();
      // Get open orders from OrderEngine
      const openOrders = OrderEngine.getAllOrders();

      // Combine and format
      const allOrders: Order[] = [
        ...history.map((trade: any) => ({
          id: `TRADE_${trade.symbol}_${trade.timestamp}`,
          symbol: trade.symbol,
          type: trade.type,
          quantity: trade.quantity,
          price: trade.executedPrice || trade.price || 0,
          status: 'EXECUTED' as const,
          timestamp: trade.executedAt || trade.timestamp,
        })),
        ...openOrders.map((order: any) => ({
          id: order.id,
          symbol: order.symbol,
          type: order.type,
          quantity: order.quantity,
          price: order.limitPrice || order.price,
          status: order.status === 'pending' ? ('PENDING' as const) : ('EXECUTED' as const),
          timestamp: order.createdAt || order.timestamp,
        })),
      ];

      // Sort by timestamp (newest first)
      allOrders.sort((a, b) => b.timestamp - a.timestamp);

      setOrders(allOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    try {
      const success = OrderEngine.cancelOrder(orderId);
      if (success) {
        loadOrders();
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  const filteredOrders = activeTab === 'history' 
    ? orders.filter(o => o.status === 'EXECUTED')
    : orders.filter(o => o.status !== 'EXECUTED');

  return (
    <div style={containerStyle(colors)}>
      <h3 style={{ margin: '0 0 1rem 0', color: colors?.text }}>📊 Order History</h3>

      {/* Tab Navigation */}
      <div style={tabsStyle(colors)}>
        <button
          style={tabButtonStyle(colors, activeTab === 'history')}
          onClick={() => setActiveTab('history')}
        >
          ✅ History ({orders.filter(o => o.status === 'EXECUTED').length})
        </button>
        <button
          style={tabButtonStyle(colors, activeTab === 'pending')}
          onClick={() => setActiveTab('pending')}
        >
          ⏳ Pending ({orders.filter(o => o.status !== 'EXECUTED').length})
        </button>
      </div>

      {/* Orders Table */}
      <div style={tableContainerStyle}>
        {filteredOrders.length === 0 ? (
          <div style={emptyStateStyle(colors)}>
            {activeTab === 'history'
              ? '📭 No trades executed yet'
              : '✨ No pending orders'}
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={headerRowStyle(colors)}>
                <th style={headerCellStyle(colors)}>Symbol</th>
                <th style={headerCellStyle(colors)}>Type</th>
                <th style={headerCellStyle(colors)}>Qty</th>
                <th style={headerCellStyle(colors)}>Price</th>
                <th style={headerCellStyle(colors)}>Total</th>
                <th style={headerCellStyle(colors)}>Status</th>
                {activeTab === 'pending' && <th style={headerCellStyle(colors)}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} style={rowStyle(colors)}>
                  <td style={cellStyle(colors)}>
                    <span style={{ fontWeight: 600, color: colors?.text || '#f9fafb' }}>
                      {order.symbol}
                    </span>
                  </td>
                  <td style={cellStyle(colors)}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: order.type === 'BUY' ? '#065f46' : '#7f1d1d',
                        color: order.type === 'BUY' ? '#d1fae5' : '#fee2e2',
                      }}
                    >
                      {order.type}
                    </span>
                  </td>
                  <td style={cellStyle(colors)}>{order.quantity}</td>
                  <td style={cellStyle(colors)}>${order.price.toFixed(2)}</td>
                  <td style={cellStyle(colors)}>
                    ${(order.quantity * order.price).toFixed(2)}
                  </td>
                  <td style={cellStyle(colors)}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor:
                          order.status === 'EXECUTED'
                            ? '#065f46'
                            : order.status === 'PENDING'
                              ? '#1e3a8a'
                              : '#7f1d1d',
                        color:
                          order.status === 'EXECUTED'
                            ? '#d1fae5'
                            : order.status === 'PENDING'
                              ? '#bfdbfe'
                              : '#fee2e2',
                      }}
                    >
                      {order.status}
                    </span>
                  </td>
                  {activeTab === 'pending' && (
                    <td style={cellStyle(colors)}>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        style={cancelButtonStyle}
                      >
                        Cancel
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const containerStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors?.bgSecondary || '#1f2937',
  border: `1px solid ${colors?.border || '#374151'}`,
  borderRadius: '0.5rem',
  padding: '1rem',
});

const tabsStyle = (colors: any): React.CSSProperties => ({
  display: 'flex',
  borderBottom: `1px solid ${colors?.border || '#374151'}`,
  marginBottom: '1rem',
  gap: '1rem',
});

const tabButtonStyle = (colors: any, isActive: boolean): React.CSSProperties => ({
  padding: '0.75rem 0',
  backgroundColor: 'transparent',
  color: isActive ? colors?.text : colors?.textSecondary || '#d1d5db',
  border: 'none',
  borderBottomWidth: '2px',
  borderBottomStyle: 'solid',
  borderBottomColor: isActive ? '#2563eb' : 'transparent',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'all 0.2s',
});

const tableContainerStyle: React.CSSProperties = {
  overflowX: 'auto',
  maxHeight: '400px',
  overflowY: 'auto',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.875rem',
};

const headerRowStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors?.bg || '#111827',
  borderBottom: `1px solid ${colors?.border || '#374151'}`,
  position: 'sticky',
  top: 0,
});

const headerCellStyle = (colors: any): React.CSSProperties => ({
  padding: '0.75rem',
  textAlign: 'left' as const,
  color: colors?.textSecondary || '#9ca3af',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
});

const rowStyle = (colors: any): React.CSSProperties => ({
  borderBottom: `1px solid ${colors?.border || '#374151'}`,
  transition: 'background-color 0.15s',
});

const cellStyle = (colors: any): React.CSSProperties => ({
  padding: '0.75rem',
  color: colors?.text || '#e5e7eb',
});

const emptyStateStyle = (colors: any): React.CSSProperties => ({
  textAlign: 'center' as const,
  padding: '2rem',
  color: colors?.textSecondary || '#6b7280',
  fontSize: '0.875rem',
});

const cancelButtonStyle: React.CSSProperties = {
  padding: '0.25rem 0.75rem',
  backgroundColor: '#dc2626',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.25rem',
  fontSize: '0.75rem',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};
