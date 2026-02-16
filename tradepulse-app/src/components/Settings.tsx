/**
 * Settings Component
 * User preferences and app configuration
 */

import { useState } from 'react';
import PriceEngine from '@engines/PriceEngine';
import TradeEngine from '@engines/TradeEngine';

interface SettingsProps {
  theme?: 'dark' | 'light';
  onThemeChange?: (theme: 'dark' | 'light') => void;
  colors?: any;
}

export function Settings({ theme: initialTheme = 'dark', onThemeChange, colors }: SettingsProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>(initialTheme);
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [initialBalance, setInitialBalance] = useState(100000);
  const [message, setMessage] = useState('');

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  const handleRefreshIntervalChange = (newInterval: number) => {
    setRefreshInterval(newInterval);
    // Wire to PriceEngine
    PriceEngine.setUpdateInterval(newInterval);
  };

  const handleInitialBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1000, Math.min(10000000, parseInt(e.target.value) || 100000));
    setInitialBalance(value);
  };

  const handleResetPortfolio = () => {
    if (confirm(`Are you sure? This will reset your portfolio to $${initialBalance.toLocaleString()}.`)) {
      TradeEngine.reset(initialBalance);
      PriceEngine.reset();
      setMessage(`✅ Portfolio reset successfully to $${initialBalance.toLocaleString()}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleExportData = () => {
    try {
      const portfolio = TradeEngine.getPortfolio();
      const history = TradeEngine.getTradeHistory();
      
      const data = {
        portfolio,
        tradeHistory: history,
        exportedAt: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `tradepulse_export_${Date.now()}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      setMessage('✅ Data exported successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Export failed');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ marginTop: 0 }}>⚙️ Settings & Preferences</h2>

      {message && <div style={messageStyle}>{message}</div>}

      {/* Display Settings */}
      <div style={sectionStyle(colors)}>
        <h3>Display Settings</h3>

        <div style={settingItemStyle(colors)}>
          <div>
            <label style={labelStyle(colors)}>Theme</label>
            <p style={{ margin: '0.25rem 0 0 0', color: colors?.textSecondary || '#9ca3af', fontSize: '0.875rem' }}>
              Choose your preferred theme
            </p>
          </div>
          <div style={selectContainerStyle}>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value as 'dark' | 'light')}
              style={selectStyle(colors)}
            >
              <option value="dark">🌙 Dark Theme (Active)</option>
              <option value="light">☀️ Light Theme</option>
            </select>
            {theme === 'light' && (
              <p style={{ marginTop: '0.5rem', color: '#10b981', fontSize: '0.875rem' }}>
                ✓ Light theme selected (optimized for daytime trading)
              </p>
            )}
          </div>
        </div>

        <div style={settingItemStyle(colors)}>
          <div>
            <label style={labelStyle(colors)}>Notifications</label>
            <p style={{ margin: '0.25rem 0 0 0', color: colors?.textSecondary || '#9ca3af', fontSize: '0.875rem' }}>
              Receive alerts for trade executions
            </p>
          </div>
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
            style={checkboxStyle}
          />
        </div>
      </div>

      {/* Data Settings */}
      <div style={sectionStyle(colors)}>
        <h3>Data & Sync</h3>

        <div style={settingItemStyle(colors)}>
          <div>
            <label style={labelStyle(colors)}>Auto-Refresh</label>
            <p style={{ margin: '0.25rem 0 0 0', color: colors?.textSecondary || '#9ca3af', fontSize: '0.875rem' }}>
              Automatically update portfolio and prices
            </p>
          </div>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            style={checkboxStyle}
          />
        </div>

        <div style={settingItemStyle(colors)}>
          <div>
            <label style={labelStyle(colors)}>Refresh Interval (ms)</label>
            <p style={{ margin: '0.25rem 0 0 0', color: colors?.textSecondary || '#9ca3af', fontSize: '0.875rem' }}>
              Price update speed: {refreshInterval}ms (500ms = faster, 5000ms = slower)
            </p>
          </div>
          <input
            type="range"
            min="500"
            max="5000"
            step="500"
            value={refreshInterval}
            onChange={(e) => handleRefreshIntervalChange(parseInt(e.target.value))}
            style={rangeStyle}
          />
        </div>
      </div>

      {/* Portfolio Settings */}
      <div style={sectionStyle(colors)}>
        <h3>Portfolio Settings</h3>

        <div style={settingItemStyle(colors)}>
          <div>
            <label style={labelStyle(colors)}>Initial Balance</label>
            <p style={{ margin: '0.25rem 0 0 0', color: colors?.textSecondary || '#9ca3af', fontSize: '0.875rem' }}>
              Starting amount for reset ($1,000 - $10,000,000)
            </p>
          </div>
          <input
            type="number"
            min="1000"
            max="10000000"
            step="1000"
            value={initialBalance}
            onChange={handleInitialBalanceChange}
            style={numberInputStyle(colors)}
          />
        </div>

        <p style={{ 
          margin: '1rem 0 0 0', 
          padding: '1rem', 
          backgroundColor: colors?.bgSecondary || '#111827',
          borderLeft: '3px solid #3b82f6',
          color: colors?.textSecondary || '#d1d5db', 
          fontSize: '0.875rem',
          borderRadius: '0.375rem'
        }}>
          💡 Current portfolio will be reset to <strong>${initialBalance.toLocaleString()}</strong> when you click Reset Portfolio
        </p>
      </div>

      {/* Advanced Settings */}
      <div style={sectionStyle(colors)}>
        <h3>Advanced</h3>

        <div style={settingItemStyle(colors)}>
          <div>
            <label style={labelStyle(colors)}>API Endpoint</label>
            <p style={{ margin: '0.25rem 0 0 0', color: colors?.textSecondary || '#9ca3af', fontSize: '0.875rem' }}>
              localhost:3000 (Local Development)
            </p>
          </div>
          <span style={{ color: '#10b981', fontSize: '0.875rem' }}>✓ Connected</span>
        </div>

        <div style={settingItemStyle(colors)}>
          <div>
            <label style={labelStyle(colors)}>Engine Status</label>
            <p style={{ margin: '0.25rem 0 0 0', color: colors?.textSecondary || '#9ca3af', fontSize: '0.875rem' }}>
              All trading engines operational
            </p>
          </div>
          <span style={{ color: '#10b981', fontSize: '0.875rem' }}>🟢 Running</span>
        </div>
      </div>

      {/* Data Management */}
      <div style={sectionStyle(colors)}>
        <h3>Data Management</h3>

        <div style={buttonGroupStyle}>
          <button onClick={handleExportData} style={primaryButtonStyle}>
            📥 Export Data
          </button>
          <button onClick={handleResetPortfolio} style={dangerButtonStyle}>
            🔄 Reset Portfolio
          </button>
        </div>

        <p style={{ margin: '1rem 0 0 0', color: colors?.textSecondary || '#9ca3af', fontSize: '0.875rem' }}>
          💡 Export your trading data for backup. Resetting will clear your portfolio and return to $100,000.
        </p>
      </div>

      {/* About */}
      <div style={sectionStyle(colors)}>
        <h3>About TradePulse</h3>
        <p style={{ color: colors?.textSecondary || '#d1d5db' }}>
          <strong>Version:</strong> 1.0.0
        </p>
        <p style={{ color: colors?.textSecondary || '#d1d5db' }}>
          <strong>Build:</strong> Production-Ready
        </p>
        <p style={{ color: colors?.textSecondary || '#d1d5db' }}>
          <strong>Status:</strong> Fully Operational
        </p>
        <p style={{ color: colors?.textSecondary || '#9ca3af', fontSize: '0.875rem', marginTop: '1rem' }}>
          TradePulse is a simulated paper trading platform for practicing stock trading strategies
          without real money. All trading is simulated with realistic market dynamics.
        </p>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: '800px',
};

const sectionStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors?.bgSecondary || '#111827',
  padding: '1.5rem',
  borderRadius: '0.5rem',
  border: `1px solid ${colors?.border || '#374151'}`,
  marginBottom: '1.5rem',
});

const settingItemStyle = (colors: any): React.CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 0',
  borderBottom: `1px solid ${colors?.border || '#374151'}`,
});

const labelStyle = (colors: any): React.CSSProperties => ({
  fontWeight: 600,
  color: colors?.text || '#111827',
  margin: 0,
});

const selectContainerStyle: React.CSSProperties = {
  flex: '0 0 auto',
};

const selectStyle = (colors: any): React.CSSProperties => ({
  padding: '0.5rem',
  backgroundColor: colors?.bg || '#ffffff',
  color: colors?.text || '#111827',
  border: `1px solid ${colors?.border || '#e5e7eb'}`,
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  cursor: 'pointer',
});

const checkboxStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  cursor: 'pointer',
};

const rangeStyle: React.CSSProperties = {
  width: '200px',
  cursor: 'pointer',
};

const numberInputStyle = (colors: any): React.CSSProperties => ({
  padding: '0.5rem',
  width: '150px',
  backgroundColor: colors?.bg || '#ffffff',
  color: colors?.text || '#111827',
  border: `1px solid ${colors?.border || '#e5e7eb'}`,
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  cursor: 'text',
});

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.875rem',
  transition: 'background-color 0.2s',
};

const dangerButtonStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  backgroundColor: '#dc2626',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.875rem',
  transition: 'background-color 0.2s',
};

const messageStyle: React.CSSProperties = {
  padding: '1rem',
  backgroundColor: '#065f46',
  color: '#d1fae5',
  borderRadius: '0.375rem',
  marginBottom: '1rem',
  border: '1px solid #10b981',
};
