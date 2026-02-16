/**
 * ============================================================================
 * Persistence Hooks
 * ============================================================================
 * 
 * React hooks for auto-save and data persistence:
 * - useAppInitialization: Load data on app startup
 * - useAutoSave: Auto-save on data changes
 * - usePersistence: Combined initialization + auto-save
 * - useStorageInfo: Monitor storage usage
 * 
 * Features:
 * - Debounced saves (avoid spamming localStorage)
 * - Error notifications
 * - Loading states
 * - Manual save/reset triggers
 * 
 * Usage:
 * ```tsx
 * function App() {
 *   const { isLoading, error, saveNow, resetData } = usePersistence();
 *   
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   
 *   return <YourApp />;
 * }
 * ```
 * 
 * ============================================================================
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import type { AppState, StorageError } from '../persistence/schema/storageSchema';
import { DEFAULT_APP_STATE } from '../persistence/schema/storageSchema';
import StorageService from '../persistence/StorageService';
import MigrationManager from '../persistence/migrations/migrationManager';
import TradeEngine from '@engines/TradeEngine';
import OrderEngine from '@engines/OrderEngine';

/**
 * Auto-save configuration
 */
export interface AutoSaveConfig {
  /** Debounce delay in ms (default: 1000) */
  debounceMs?: number;
  /** Enable auto-save (default: true) */
  enabled?: boolean;
  /** Save on window unload (default: true) */
  saveOnUnload?: boolean;
  /** Callback on save success */
  onSaveSuccess?: () => void;
  /** Callback on save error */
  onSaveError?: (error: StorageError) => void;
}

const DEFAULT_AUTO_SAVE_CONFIG: Required<AutoSaveConfig> = {
  debounceMs: 1000,
  enabled: true,
  saveOnUnload: true,
  onSaveSuccess: () => {},
  onSaveError: () => {},
};

/**
 * ============================================================================
 * APP INITIALIZATION HOOK
 * ============================================================================
 */

/**
 * Initialize app by loading persisted data
 * 
 * Process:
 * 1. Load data from localStorage
 * 2. Apply migrations if needed
 * 3. Restore engine states
 * 4. Handle errors gracefully
 */
export const useAppInitialization = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<StorageError | null>(null);
  const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('[Persistence] Initializing app...');

        // Check if storage is available
        if (!StorageService.isStorageAvailable()) {
          console.warn('[Persistence] localStorage not available, using defaults');
          setAppState(DEFAULT_APP_STATE);
          setIsLoading(false);
          return;
        }

        // Load data from storage
        const loadResult = StorageService.loadAppState();

        if (!loadResult.success) {
          console.error('[Persistence] Failed to load data:', loadResult.error);
          setError(loadResult.error || null);
          setAppState(DEFAULT_APP_STATE);
          setIsLoading(false);
          return;
        }

        let loadedState = loadResult.data!;

        // Apply migrations if needed
        if (MigrationManager.needsMigration(loadedState.version)) {
          console.log('[Persistence] Migration required');
          const migrateResult = MigrationManager.migrateAppState(loadedState);

          if (!migrateResult.success) {
            console.error('[Persistence] Migration failed:', migrateResult.error);
            // Use default state if migration fails
            loadedState = DEFAULT_APP_STATE;
          } else {
            loadedState = migrateResult.data!;
            // Save migrated state
            StorageService.saveAppState(loadedState);
          }
        }

        // Restore engine states
        console.log('[Persistence] Restoring engine states...');
        
        // Restore TradeEngine (portfolio + trades)
        TradeEngine.loadState(loadedState.portfolio, loadedState.trades);
        console.log('[Persistence] ✅ TradeEngine restored');

        // Restore OrderEngine (active + history)
        OrderEngine.loadOrders(loadedState.orders);
        console.log('[Persistence] ✅ OrderEngine restored');

        // TODO: Restore watchlist and preferences when those features are added

        setAppState(loadedState);
        setIsLoading(false);

        console.log('[Persistence] ✅ App initialization complete');
      } catch (err) {
        console.error('[Persistence] Initialization error:', err);
        setError({
          code: 'UNKNOWN_ERROR',
          message: 'Failed to initialize app',
          details: err,
          timestamp: Date.now(),
        });
        setAppState(DEFAULT_APP_STATE);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    isLoading,
    error,
    appState,
  };
};

/**
 * ============================================================================
 * AUTO-SAVE HOOK
 * ============================================================================
 */

/**
 * Auto-save app state on changes
 * 
 * Features:
 * - Debounced saves (reduces localStorage writes)
 * - Save on window unload (before user closes tab)
 * - Manual save trigger
 * - Error handling
 */
export const useAutoSave = (config: AutoSaveConfig = {}) => {
  const cfg = { ...DEFAULT_AUTO_SAVE_CONFIG, ...config };
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<StorageError | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Perform save operation
   */
  const performSave = useCallback(async () => {
    try {
      setIsSaving(true);
      setSaveError(null);

      // Gather current state from engines
      const portfolio = TradeEngine.getPortfolio();
      const trades = [...TradeEngine.getTradeHistory()];
      const orders = [...OrderEngine.getAllOrders()];
      
      // TODO: Add watchlist and preferences when available
      const watchlist: string[] = [];
      const preferences = DEFAULT_APP_STATE.preferences;

      // Build app state
      const appState: AppState = {
        version: DEFAULT_APP_STATE.version,
        portfolio,
        trades,
        orders,
        watchlist,
        preferences,
        metadata: {
          ...DEFAULT_APP_STATE.metadata,
          lastSaved: Date.now(),
          lastModified: Date.now(),
        },
      };

      // Save to storage
      const saveResult = StorageService.saveAppState(appState);

      if (!saveResult.success) {
        console.error('[AutoSave] Save failed:', saveResult.error);
        setSaveError(saveResult.error || null);
        cfg.onSaveError(saveResult.error!);
      } else {
        console.log('[AutoSave] ✅ Saved successfully');
        setLastSaved(Date.now());
        cfg.onSaveSuccess();
      }
    } catch (err) {
      console.error('[AutoSave] Unexpected error:', err);
      const error: StorageError = {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to save data',
        details: err,
        timestamp: Date.now(),
      };
      setSaveError(error);
      cfg.onSaveError(error);
    } finally {
      setIsSaving(false);
    }
  }, [cfg]);

  /**
   * Trigger debounced save
   */
  const triggerSave = useCallback(() => {
    if (!cfg.enabled) return;

    // Cancel pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, cfg.debounceMs);
  }, [cfg.enabled, cfg.debounceMs, performSave]);

  /**
   * Save immediately (bypass debounce)
   */
  const saveNow = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    performSave();
  }, [performSave]);

  /**
   * Auto-save on window unload
   */
  useEffect(() => {
    if (!cfg.saveOnUnload) return;

    const handleUnload = () => {
      // Synchronous save before unload
      const portfolio = TradeEngine.getPortfolio();
      const trades = [...TradeEngine.getTradeHistory()];
      const orders = [...OrderEngine.getAllOrders()];

      const appState: AppState = {
        version: DEFAULT_APP_STATE.version,
        portfolio,
        trades,
        orders,
        watchlist: [],
        preferences: DEFAULT_APP_STATE.preferences,
        metadata: {
          ...DEFAULT_APP_STATE.metadata,
          lastSaved: Date.now(),
        },
      };

      StorageService.saveAppState(appState);
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [cfg.saveOnUnload]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    lastSaved,
    isSaving,
    saveError,
    triggerSave,
    saveNow,
  };
};

/**
 * ============================================================================
 * COMBINED PERSISTENCE HOOK
 * ============================================================================
 */

/**
 * Combined hook for initialization + auto-save
 * 
 * This is the main hook you'll use in your app
 */
export const usePersistence = (config?: AutoSaveConfig) => {
  const { isLoading, error: initError, appState } = useAppInitialization();
  const { lastSaved, isSaving, saveError, triggerSave, saveNow } = useAutoSave(config);

  /**
   * Reset all data to defaults
   */
  const resetData = useCallback(() => {
    console.log('[Persistence] Resetting all data...');
    
    // Reset engines
    TradeEngine.reset();
    OrderEngine.reset();

    // Clear storage
    StorageService.clearAllData();

    // Save default state
    StorageService.saveAppState(DEFAULT_APP_STATE);

    console.log('[Persistence] ✅ Reset complete');
  }, []);

  /**
   * Export data as JSON
   */
  const exportData = useCallback(() => {
    return StorageService.exportData();
  }, []);

  /**
   * Import data from JSON
   */
  const importData = useCallback((json: string) => {
    const result = StorageService.importData(json);
    
    if (result.success) {
      // Reload page to reinitialize with imported data
      window.location.reload();
    }

    return result;
  }, []);

  return {
    // Initialization
    isLoading,
    initError,
    appState,

    // Auto-save
    lastSaved,
    isSaving,
    saveError,
    triggerSave,
    saveNow,

    // Utilities
    resetData,
    exportData,
    importData,
  };
};

/**
 * ============================================================================
 * STORAGE INFO HOOK
 * ============================================================================
 */

/**
 * Monitor storage usage
 */
export const useStorageInfo = () => {
  const [storageInfo, setStorageInfo] = useState(() =>
    StorageService.getStorageInfo()
  );

  const refresh = useCallback(() => {
    setStorageInfo(StorageService.getStorageInfo());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...storageInfo,
    refresh,
  };
};

/**
 * Public API
 */
export default {
  useAppInitialization,
  useAutoSave,
  usePersistence,
  useStorageInfo,
};
