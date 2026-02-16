/**
 * ============================================================================
 * App Integration Example
 * ============================================================================
 * 
 * Example of how to integrate the persistence layer into your App component
 * 
 * This demonstrates:
 * 1. Using usePersistence hook
 * 2. Handling loading states
 * 3. Triggering auto-save on events
 * 4. Export/Import functionality
 * 5. Reset functionality
 * 
 * ============================================================================
 */

import React, { useCallback } from 'react';
import { usePersistence, useStorageInfo } from '@hooks/usePersistence';
import TradeEngine from '@engines/TradeEngine';
import OrderEngine from '@engines/OrderEngine';

/**
 * Loading component
 */
const LoadingScreen: React.FC = () => {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div className="spinner" />
      <h2>Loading TradePulse...</h2>
      <p>Restoring your portfolio and trade history</p>
    </div>
  );
};

/**
 * Error component
 */
const ErrorScreen: React.FC<{ error: any }> = ({ error }) => {
  const handleReset = () => {
    if (confirm('Reset all data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>⚠️ Initialization Error</h1>
      <p>Failed to load your data. This may be due to:</p>
      <ul>
        <li>Corrupted localStorage data</li>
        <li>Browser compatibility issues</li>
        <li>Storage permission denied</li>
      </ul>
      
      <div style={{ 
        padding: '1rem', 
        background: '#fee', 
        borderRadius: '4px',
        marginTop: '1rem'
      }}>
        <strong>Error:</strong> {error?.message || 'Unknown error'}
      </div>

      <button onClick={handleReset} style={{ marginTop: '1rem' }}>
        Reset All Data
      </button>
    </div>
  );
};

/**
 * Storage info panel (debug/admin)
 */
const StorageInfoPanel: React.FC = () => {
  const { used, available, keys, refresh } = useStorageInfo();

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '1rem', 
      right: '1rem',
      background: '#fff',
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '0.5rem',
      fontSize: '12px',
      maxWidth: '200px'
    }}>
      <strong>Storage Info</strong>
      <div>Used: {(used / 1024).toFixed(1)} KB</div>
      <div>Available: {available ? '✓' : '✗'}</div>
      <div>Keys: {keys.length}</div>
      <button onClick={refresh} style={{ marginTop: '0.5rem', fontSize: '10px' }}>
        Refresh
      </button>
    </div>
  );
};

/**
 * Main App Component with Persistence
 */
const App: React.FC = () => {
  // Initialize persistence layer
  const {
    isLoading,
    initError,
    lastSaved,
    isSaving,
    saveError,
    triggerSave,
    saveNow,
    resetData,
    exportData,
    importData,
  } = usePersistence({
    debounceMs: 1000,           // Save 1 second after last change
    enabled: true,              // Enable auto-save
    saveOnUnload: true,         // Save when closing tab
    onSaveSuccess: () => {
      console.log('✅ Data saved successfully');
    },
    onSaveError: (error) => {
      console.error('❌ Save failed:', error);
      // Could show toast notification here
    },
  });

  /**
   * Handle trade execution
   * Triggers auto-save after trade
   */
  const handleTrade = useCallback(() => {
    const result = TradeEngine.executeTrade({
      symbol: 'AAPL',
      type: 'BUY',
      quantity: 10,
      price: 150,
      orderType: 'MARKET',
    });

    if (result.success) {
      console.log('Trade executed:', result.trade);
      // Trigger auto-save (debounced)
      triggerSave();
    }
  }, [triggerSave]);

  /**
   * Handle order placement
   * Triggers auto-save after order creation
   */
  const handlePlaceOrder = useCallback(() => {
    const order = OrderEngine.placeOrder({
      symbol: 'AAPL',
      type: 'BUY',
      limitPrice: 145,
      quantity: 10,
    });

    if (order) {
      console.log('Order placed:', order);
      // Trigger auto-save (debounced)
      triggerSave();
    }
  }, [triggerSave]);

  /**
   * Export data as JSON file
   */
  const handleExport = useCallback(() => {
    const json = exportData();
    if (!json) {
      alert('Failed to export data');
      return;
    }

    // Create download link
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradepulse-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Data exported successfully!');
  }, [exportData]);

  /**
   * Import data from JSON file
   */
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const json = event.target?.result as string;
        const result = importData(json);

        if (result.success) {
          alert('Import successful! Page will reload.');
          // Page reloads automatically after import
        } else {
          alert(`Import failed: ${result.error?.message}`);
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }, [importData]);

  /**
   * Reset all data
   */
  const handleReset = useCallback(() => {
    if (confirm('Reset all data? This will delete your portfolio, trades, and orders. This cannot be undone.')) {
      resetData();
      alert('Data reset successfully!');
      window.location.reload();
    }
  }, [resetData]);

  // Show loading screen during initialization
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show error screen if initialization failed
  if (initError) {
    return <ErrorScreen error={initError} />;
  }

  // Main app UI
  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        borderBottom: '2px solid #ccc',
        paddingBottom: '1rem'
      }}>
        <h1>TradePulse</h1>
        
        {/* Save status indicator */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isSaving && <span>💾 Saving...</span>}
          {lastSaved && !isSaving && (
            <span style={{ fontSize: '12px', color: '#666' }}>
              Last saved: {new Date(lastSaved).toLocaleTimeString()}
            </span>
          )}
          {saveError && (
            <span style={{ color: 'red', fontSize: '12px' }}>
              ⚠️ Save failed
            </span>
          )}
        </div>
      </header>

      {/* Action buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <button onClick={handleTrade}>
          Execute Trade (Auto-save)
        </button>
        <button onClick={handlePlaceOrder}>
          Place Order (Auto-save)
        </button>
        <button onClick={saveNow}>
          Save Now (Manual)
        </button>
        <button onClick={handleExport}>
          Export Data
        </button>
        <button onClick={handleImport}>
          Import Data
        </button>
        <button onClick={handleReset} style={{ marginLeft: 'auto', background: '#d22' }}>
          Reset All Data
        </button>
      </div>

      {/* Your app components go here */}
      <main>
        {/* <TradePanel onTrade={triggerSave} /> */}
        {/* <Portfolio /> */}
        {/* <OrderBook /> */}
        {/* etc. */}
        <p style={{ color: '#666' }}>
          Your app components go here. Auto-save is active.
        </p>
      </main>

      {/* Storage info panel (for debugging) */}
      {import.meta.env?.DEV && <StorageInfoPanel />}
    </div>
  );
};

export default App;

/**
 * ============================================================================
 * Integration Points
 * ============================================================================
 * 
 * After implementing this pattern, update these components to trigger saves:
 * 
 * 1. TradePanel component:
 *    - Call triggerSave() after successful trade
 * 
 * 2. OrderPanel component:
 *    - Call triggerSave() after placing/cancelling/modifying orders
 * 
 * 3. Portfolio component:
 *    - No action needed (reads from engines)
 * 
 * 4. Settings component:
 *    - Call triggerSave() after changing preferences
 * 
 * 5. Watchlist component:
 *    - Call triggerSave() after adding/removing symbols
 * 
 * Example:
 * ```tsx
 * function TradePanel() {
 *   const { triggerSave } = usePersistence();
 * 
 *   const handleBuy = async () => {
 *     const result = await TradeEngine.executeTrade(request);
 *     if (result.success) {
 *       triggerSave(); // Auto-save after 1 second
 *     }
 *   };
 * 
 *   return <button onClick={handleBuy}>Buy</button>;
 * }
 * ```
 * 
 * ============================================================================
 */
