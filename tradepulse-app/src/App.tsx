/**
 * App Shell Component
 * 3-panel layout: Header | Sidebar + Main Content | Bottom Panel
 * Main content displays live trading data from integrated engines
 */

import { useState, useEffect } from 'react';
import './App.module.css';
import { PriceDisplay } from './components/PriceDisplay';
import { Portfolio } from './components/Portfolio';
import { TradeInterface } from './components/TradeInterface';
import { OrderHistory } from './components/OrderHistory';
import { Watchlist } from './components/Watchlist';
import { Chart } from './components/Chart';
import { Settings } from './components/Settings';
import { ToastProvider } from '@contexts/ToastContext';
import { ToastContainer } from '@components/Toast/ToastContainer';

type NavSection = 'dashboard' | 'watchlist' | 'chart' | 'portfolio' | 'orders' | 'settings' | 'documentation' | 'support';
type Theme = 'dark' | 'light';

interface WalletInfo {
  connected: boolean;
  address: string;
  balance: number;
  provider: string;
  connectedAt: string;
}

interface HeaderProps {
  onNavigate: (section: NavSection) => void;
  onWalletConnect: () => void;
  walletInfo: WalletInfo;
  onWalletDisconnect: () => void;
  colors: any;
}

// Placeholder components for layout
const Header = ({ onNavigate, onWalletConnect, walletInfo, onWalletDisconnect, colors }: HeaderProps) => (
  <header style={getHeaderStyle(colors)}>
    <div>
      <h1 style={{ margin: 0, fontSize: '1.875rem', color: colors.text, fontFamily: 'var(--font-heading)' }}>TradePulse</h1>
      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: colors.textSecondary }}>
        Simulated Paper Trading Terminal
      </p>
    </div>
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
      {walletInfo.connected && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          padding: '0.75rem 1.25rem',
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.border}`,
          borderRadius: '0.5rem',
          gap: '0.25rem',
        }}>
          <div style={{ fontSize: '0.75rem', color: colors.textSecondary, fontWeight: 500 }}>
            💳 {walletInfo.provider}
          </div>
          <div style={{ fontSize: '0.875rem', color: colors.text, fontWeight: 600 }}>
            {walletInfo.address.slice(0, 6)}...{walletInfo.address.slice(-4)}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 700 }}>
            ${walletInfo.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {walletInfo.connected ? (
          <button 
            onClick={onWalletDisconnect}
            style={{
              ...headerButtonStyle,
              backgroundColor: '#ef4444',
            }}
          >
            🚪 Disconnect
          </button>
        ) : (
          <button 
            onClick={onWalletConnect}
            style={{
              ...headerButtonStyle,
              backgroundColor: '#2563eb',
            }}
          >
            💳 Connect Wallet
          </button>
        )}
        <button 
          onClick={() => onNavigate('settings')}
          style={headerButtonStyle}
        >
          ⚙️ Settings
        </button>
      </div>
    </div>
  </header>
);

interface SidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  colors: any;
}

const Sidebar = ({ activeSection, onNavigate, colors }: SidebarProps) => (
  <aside style={getSidebarStyle(colors)}>
    <nav>
      <h3 style={{ marginTop: 0, fontSize: '1.125rem', color: colors.text }}>Navigation</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <li>
          <button 
            onClick={() => onNavigate('dashboard')}
            style={{
              ...getNavLinkStyle(colors, activeSection === 'dashboard'),
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            📊 Dashboard
          </button>
        </li>
        <li>
          <button 
            onClick={() => onNavigate('watchlist')}
            style={{
              ...getNavLinkStyle(colors, activeSection === 'watchlist'),
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            ⭐ Watchlist
          </button>
        </li>
        <li>
          <button 
            onClick={() => onNavigate('chart')}
            style={{
              ...getNavLinkStyle(colors, activeSection === 'chart'),
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            📈 Chart
          </button>
        </li>
        <li>
          <button 
            onClick={() => onNavigate('portfolio')}
            style={{
              ...getNavLinkStyle(colors, activeSection === 'portfolio'),
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            💼 Portfolio
          </button>
        </li>
        <li>
          <button 
            onClick={() => onNavigate('orders')}
            style={{
              ...getNavLinkStyle(colors, activeSection === 'orders'),
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            📋 Orders
          </button>
        </li>
        <li>
          <button 
            onClick={() => onNavigate('settings')}
            style={{
              ...getNavLinkStyle(colors, activeSection === 'settings'),
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            ⚙️ Settings
          </button>
        </li>
      </ul>
    </nav>
    
    <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: `1px solid ${colors.border}` }}>
      <h4 style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: '0 0 0.5rem 0' }}>Quick Links</h4>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <li>
          <button 
            onClick={() => onNavigate('documentation')}
            style={{
              ...getNavLinkStyle(colors, activeSection === 'documentation'),
              fontSize: '0.75rem',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            📖 Documentation
          </button>
        </li>
        <li>
          <button 
            onClick={() => onNavigate('support')}
            style={{
              ...getNavLinkStyle(colors, activeSection === 'support'),
              fontSize: '0.75rem',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            💬 Support
          </button>
        </li>
      </ul>
    </div>
  </aside>
);

interface MainContentProps {
  activeSection: NavSection;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onNavigate: (section: NavSection) => void;
  colors: any;
}

const MainContent = ({ activeSection, theme, onThemeChange, onNavigate, colors }: MainContentProps) => {
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <>
            <PriceDisplay colors={colors} theme={theme} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <TradeInterface 
                colors={colors} 
                theme={theme} 
                onTradeSuccess={() => onNavigate('dashboard')}
              />
              <Portfolio colors={colors} theme={theme} />
            </div>
          </>
        );
      case 'watchlist':
        return <Watchlist colors={colors} theme={theme} />;
      case 'chart':
        return <Chart theme={theme} />;
      case 'portfolio':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Portfolio colors={colors} theme={theme} />
          </div>
        );
      case 'orders':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <OrderHistory colors={colors} theme={theme} />
          </div>
        );
      case 'settings':
        return <Settings theme={theme} onThemeChange={onThemeChange} colors={colors} />;
      case 'documentation':
        return (
          <div style={getSectionStyle(colors)}>
            <h2 style={{ color: colors.text }}>📖 Documentation</h2>
            <h3 style={{ color: colors.text }}>Getting Started with TradePulse</h3>
            <p style={{ color: colors.textSecondary }}>
              TradePulse is a simulated paper trading terminal for practicing stock trading strategies.
            </p>
            
            <h4 style={{ color: colors.text }}>Features:</h4>
            <ul style={{ color: colors.textSecondary }}>
              <li><strong>Real-time Price Updates:</strong> Track live stock prices from simulated market data</li>
              <li><strong>Portfolio Management:</strong> Monitor positions, cash, and P&L in real-time</li>
              <li><strong>Order Execution:</strong> Place BUY and SELL market orders instantly</li>
              <li><strong>Trade History:</strong> Review all executed trades and pending orders</li>
              <li><strong>Watchlist:</strong> Keep track of symbols you're interested in</li>
            </ul>

            <h4 style={{ color: colors.text }}>How to Trade:</h4>
            <ol style={{ color: colors.textSecondary }}>
              <li>Go to the Dashboard (main view)</li>
              <li>Use the Trade Interface form to select a symbol</li>
              <li>Enter quantity and price</li>
              <li>Click "Execute BUY" or "Execute SELL"</li>
              <li>View your trade in the Order History below</li>
            </ol>

            <h4 style={{ color: colors.text }}>Key Metrics:</h4>
            <ul style={{ color: colors.textSecondary }}>
              <li><strong>Total Value:</strong> Cash + Position Value</li>
              <li><strong>Realized P&L:</strong> Gains/losses from closed positions</li>
              <li><strong>Unrealized P&L:</strong> Current gains/losses from open positions</li>
              <li><strong>P&L %:</strong> Percentage return on investment</li>
            </ul>

            <p style={{ marginTop: '1.5rem', color: colors.textSecondary }}>
              For additional help, see the Support section.
            </p>
          </div>
        );
      case 'support':
        return (
          <div style={getSectionStyle(colors)}>
            <h2 style={{ color: colors.text }}>💬 Support & Help</h2>
            
            <h3 style={{ color: colors.text }}>Frequently Asked Questions</h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#10b981' }}>Q: What is the initial cash balance?</h4>
              <p style={{ color: colors.textSecondary }}>A: TradePulse starts with $100,000 in simulated cash.</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#10b981' }}>Q: How often do prices update?</h4>
              <p style={{ color: colors.textSecondary }}>A: Prices update every second, simulating market ticks.</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#10b981' }}>Q: Can I short sell?</h4>
              <p style={{ color: colors.textSecondary }}>A: You can trade any symbol in both BUY and SELL directions. SELL orders open short positions that can be closed with BUY orders later.</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#10b981' }}>Q: What trade fees apply?</h4>
              <p style={{ color: colors.textSecondary }}>A: This is a commission-free paper trading platform.</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#10b981' }}>Q: How do I reset my portfolio?</h4>
              <p style={{ color: colors.textSecondary }}>A: Click on Settings to find reset options.</p>
            </div>

            <h3 style={{ color: colors.text }}>Troubleshooting</h3>
            <ul style={{ color: colors.textSecondary }}>
              <li><strong>Orders not executing?</strong> Check that you have sufficient cash balance</li>
              <li><strong>Prices not updating?</strong> Refresh the page or check your connection</li>
              <li><strong>Portfolio shows old data?</strong> Wait for the next update cycle (1 second)</li>
            </ul>

            <p style={{ marginTop: '1.5rem', color: colors.textSecondary }}>
              For more information, visit the Documentation section.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main style={getMainContentStyle(colors)}>
      {renderContent()}
    </main>
  );
};

const BottomPanel = ({ colors }: { colors: any }) => (
  <div style={getBottomPanelStyle(colors)}>
    <OrderHistory />
  </div>
);

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (provider: string) => void;
  colors: any;
}

const WalletModal = ({ isOpen, onClose, onConnect, colors }: WalletModalProps) => {
  if (!isOpen) return null;

  return (
    <div style={getModalOverlayStyle()}>
      <div style={getModalStyle(colors)}>
        <div style={getModalHeaderStyle(colors)}>
          <h2 style={{ margin: 0, color: colors.text, fontFamily: 'var(--font-heading)' }}>💼 Connect Wallet</h2>
          <button onClick={onClose} style={getModalCloseStyle(colors)}>✕</button>
        </div>

        <div style={getModalContentStyle(colors)}>
          <p style={{ color: colors.textSecondary, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Connect your wallet to start trading with simulated funds
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <button
              onClick={() => onConnect('MetaMask')}
              style={{
                width: '100%',
                padding: '1.125rem 1.25rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: '1px solid #1d4ed8',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🦊</span>
              <span>MetaMask</span>
            </button>
            
            <button
              onClick={() => onConnect('Coinbase Wallet')}
              style={{
                width: '100%',
                padding: '1.125rem 1.25rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: '1px solid #1d4ed8',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>💼</span>
              <span>Coinbase Wallet</span>
            </button>
            
            <button
              onClick={() => onConnect('WalletConnect')}
              style={{
                width: '100%',
                padding: '1.125rem 1.25rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: '1px solid #1d4ed8',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🔗</span>
              <span>WalletConnect</span>
            </button>
          </div>
          
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            backgroundColor: colors.bgSecondary, 
            borderRadius: '0.5rem',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ color: colors.text, fontSize: '0.85rem', margin: 0, fontWeight: 600, marginBottom: '0.5rem' }}>
              ℹ️ Simulated Environment
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
              You will receive $10,000 in simulated funds to practice trading. All transactions are simulated and no real money is involved.
            </p>
          </div>
        </div>

        <div style={getModalFooterStyle(colors)}>
          <p style={{ color: colors.textSecondary, fontSize: '0.8rem', margin: 0 }}>
            🔒 Secure connection - No real wallet integration required
          </p>
        </div>
      </div>
    </div>
  );
};

export function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [theme, setTheme] = useState<Theme>('dark');
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  // Wallet state with full information
  const [walletInfo, setWalletInfo] = useState<WalletInfo>(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem('tradepulse_wallet');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      connected: false,
      address: '',
      balance: 0,
      provider: '',
      connectedAt: '',
    };
  });

  // Save wallet state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('tradepulse_wallet', JSON.stringify(walletInfo));
  }, [walletInfo]);

  const handleWalletConnect = (provider: string) => {
    // Generate simulated wallet address
    const randomAddress = '0x' + Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    const newWalletInfo: WalletInfo = {
      connected: true,
      address: randomAddress,
      balance: 10000.00,
      provider: provider,
      connectedAt: new Date().toISOString(),
    };
    
    setWalletInfo(newWalletInfo);
  };

  const handleWalletDisconnect = () => {
    setWalletInfo({
      connected: false,
      address: '',
      balance: 0,
      provider: '',
      connectedAt: '',
    });
    localStorage.removeItem('tradepulse_wallet');
  };

  const getThemeColors = () => {
    if (theme === 'light') {
      return {
        bg: '#ffffff',
        bgSecondary: '#f9fafb',
        text: '#111827',
        textSecondary: '#4b5563',
        border: '#e5e7eb',
      };
    }
    // Dark theme (default)
    return {
      bg: '#1f2937',
      bgSecondary: '#111827',
      text: '#f9fafb',
      textSecondary: '#9ca3af',
      border: '#374151',
    };
  };

  const colors = getThemeColors();

  return (
    <ToastProvider>
      <div style={{ ...getAppContainerStyle(), backgroundColor: colors.bg, color: colors.text }}>
        <Header 
          onNavigate={setActiveSection} 
          onWalletConnect={() => setShowWalletModal(true)}
          walletInfo={walletInfo}
          onWalletDisconnect={handleWalletDisconnect}
          colors={colors}
        />
        
        <div style={getMainLayoutStyle(colors)}>
          <Sidebar activeSection={activeSection} onNavigate={setActiveSection} colors={colors} />
          <MainContent activeSection={activeSection} theme={theme} onThemeChange={setTheme} onNavigate={setActiveSection} colors={colors} />
        </div>
        
        <BottomPanel colors={colors} />
        
        <WalletModal 
          isOpen={showWalletModal} 
          onClose={() => setShowWalletModal(false)}
          onConnect={handleWalletConnect}
          colors={colors}
        />
        
        <ToastContainer />
      </div>
    </ToastProvider>
  );
}

// Inline styles for layout (soon to be CSS Modules)
const getAppContainerStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  fontFamily: 'system-ui, -apple-system, sans-serif',
});

const getHeaderStyle = (colors: any): React.CSSProperties => ({
  padding: '1.5rem 2rem',
  backgroundColor: colors.bgSecondary,
  borderBottom: `1px solid ${colors.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  minHeight: '90px',
  gap: '1.5rem',
});

const headerButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  fontSize: '0.875rem',
  transition: 'background-color 0.2s',
};

const getMainLayoutStyle = (colors: any): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: '250px 1fr',
  flex: 1,
  overflow: 'hidden',
  gap: '1px',
  backgroundColor: colors.border,
});

const getSidebarStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors.bgSecondary,
  padding: '1.5rem',
  borderRight: `1px solid ${colors.border}`,
  overflowY: 'auto',
  fontSize: '0.875rem',
});

const getNavLinkStyle = (colors: any, isActive: boolean): React.CSSProperties => ({
  color: colors.text,
  textDecoration: 'none',
  display: 'block',
  padding: '0.75rem 1rem',
  borderRadius: '0.5rem',
  transition: 'all 0.2s',
  cursor: 'pointer',
  backgroundColor: isActive ? (colors.bg === '#ffffff' ? '#e5e7eb' : '#374151') : 'transparent',
  fontWeight: isActive ? 600 : 400,
});

const getMainContentStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors.bg,
  padding: '2rem',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  flex: 1,
  color: colors.text,
});

const getSectionStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors.bgSecondary,
  padding: '2rem',
  borderRadius: '0.75rem',
  border: `1px solid ${colors.border}`,
  color: colors.text,
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
});

const getBottomPanelStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors.bgSecondary,
  padding: '1.5rem 2rem',
  borderTop: `1px solid ${colors.border}`,
  maxHeight: '280px',
  overflowY: 'auto',
  fontSize: '0.875rem',
  color: colors.text,
});

const getModalOverlayStyle = (): React.CSSProperties => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
});

const getModalStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: colors.bg,
  borderRadius: '0.5rem',
  border: `1px solid ${colors.border}`,
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  maxWidth: '500px',
  width: '90%',
  maxHeight: '80vh',
  overflowY: 'auto',
});

const getModalHeaderStyle = (colors: any): React.CSSProperties => ({
  borderBottom: `1px solid ${colors.border}`,
  padding: '1.5rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const getModalCloseStyle = (colors: any): React.CSSProperties => ({
  backgroundColor: 'transparent',
  border: 'none',
  color: colors.textSecondary,
  fontSize: '1.5rem',
  cursor: 'pointer',
  padding: '0',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const getModalContentStyle = (colors: any): React.CSSProperties => ({
  padding: '1.5rem',
  color: colors.text,
});

const getModalFooterStyle = (colors: any): React.CSSProperties => ({
  borderTop: `1px solid ${colors.border}`,
  padding: '1rem 1.5rem',
  textAlign: 'center',
});

export default App;
