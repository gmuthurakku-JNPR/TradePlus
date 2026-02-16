/**
 * App Shell Component
 * 3-panel layout: Header | Sidebar + Main Content | Bottom Panel
 */

import './App.module.css';

// Placeholder components for layout
const Header = () => (
  <header style={headerStyle}>
    <div>
      <h1 style={{ margin: 0, fontSize: '1.875rem' }}>TradePulse</h1>
      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#9ca3af' }}>
        Simulated Paper Trading Terminal
      </p>
    </div>
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <button style={headerButtonStyle}>Connect Wallet</button>
      <button style={headerButtonStyle}>⚙️</button>
    </div>
  </header>
);

const Sidebar = () => (
  <aside style={sidebarStyle}>
    <nav>
      <h3 style={{ marginTop: 0, fontSize: '1.125rem' }}>Navigation</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <li><a href="#watchlist" style={navLinkStyle}>📊 Watchlist</a></li>
        <li><a href="#chart" style={navLinkStyle}>📈 Chart</a></li>
        <li><a href="#portfolio" style={navLinkStyle}>💼 Portfolio</a></li>
        <li><a href="#orders" style={navLinkStyle}>📋 Orders</a></li>
        <li><a href="#settings" style={navLinkStyle}>⚙️ Settings</a></li>
      </ul>
    </nav>
    
    <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #374151' }}>
      <h4 style={{ fontSize: '0.875rem', color: '#9ca3af', margin: '0 0 0.5rem 0' }}>Quick Links</h4>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <li><a href="#docs" style={quickLinkStyle}>Documentation</a></li>
        <li><a href="#support" style={quickLinkStyle}>Support</a></li>
      </ul>
    </div>
  </aside>
);

const MainContent = () => (
  <main style={mainContentStyle}>
    <section style={sectionStyle}>
      <h2 style={{ marginTop: 0 }}>Welcome to TradePulse</h2>
      <p>This is the main content area where trading components will render:</p>
      <ul>
        <li>Price Display & Ticker</li>
        <li>Interactive Chart with Technical Analysis</li>
        <li>Order Entry Form</li>
        <li>Real-time Portfolio Updates</li>
        <li>Live P&L Metrics</li>
      </ul>
    </section>
    
    <section style={sectionStyle}>
      <h3>Layout Structure</h3>
      <p><strong>Left Sidebar:</strong> Navigation and quick access</p>
      <p><strong>Main Area:</strong> Charts, prices, trading interface</p>
      <p><strong>Bottom Panel:</strong> Trade history and order book</p>
    </section>
  </main>
);

const BottomPanel = () => (
  <div style={bottomPanelStyle}>
    <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Trade History & Orders</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
      <div>
        <p style={{ color: '#9ca3af', margin: 0 }}>Recent Trades: None yet</p>
      </div>
      <div>
        <p style={{ color: '#9ca3af', margin: 0 }}>Open Orders: None yet</p>
      </div>
    </div>
  </div>
);

export function App() {
  return (
    <div style={appContainerStyle}>
      <Header />
      
      <div style={mainLayoutStyle}>
        <Sidebar />
        <MainContent />
      </div>
      
      <BottomPanel />
    </div>
  );
}

// Inline styles for layout (soon to be CSS Modules)
const appContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  backgroundColor: '#1f2937',
  color: '#f9fafb',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const headerStyle: React.CSSProperties = {
  padding: '1rem 1.5rem',
  backgroundColor: '#111827',
  borderBottom: '1px solid #374151',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  minHeight: '80px',
};

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

const mainLayoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '250px 1fr',
  flex: 1,
  overflow: 'hidden',
  gap: '1px',
  backgroundColor: '#374151',
};

const sidebarStyle: React.CSSProperties = {
  backgroundColor: '#111827',
  padding: '1rem',
  borderRight: '1px solid #374151',
  overflowY: 'auto',
  fontSize: '0.875rem',
};

const navLinkStyle: React.CSSProperties = {
  color: '#d1d5db',
  textDecoration: 'none',
  display: 'block',
  padding: '0.5rem',
  borderRadius: '0.375rem',
  transition: 'all 0.2s',
  cursor: 'pointer',
};

const quickLinkStyle: React.CSSProperties = {
  ...navLinkStyle,
  fontSize: '0.75rem',
};

const mainContentStyle: React.CSSProperties = {
  backgroundColor: '#1f2937',
  padding: '1.5rem',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: '#374151',
  padding: '1.5rem',
  borderRadius: '0.5rem',
  border: '1px solid #4b5563',
};

const bottomPanelStyle: React.CSSProperties = {
  backgroundColor: '#111827',
  padding: '1rem 1.5rem',
  borderTop: '1px solid #374151',
  maxHeight: '200px',
  overflowY: 'auto',
  fontSize: '0.875rem',
};

export default App;
