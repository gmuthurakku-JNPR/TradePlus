/**
 * ============================================================================
 * Persistence Layer - Quick Reference
 * ============================================================================
 * 
 * Cheat sheet for using the persistence layer in TradePulse
 * 
 * ============================================================================
 */

# Persistence Layer - Quick Reference

## Import

```typescript
import { usePersistence } from '@hooks/usePersistence';
import StorageService from '@persistence/StorageService';
import { STORAGE_KEYS } from '@persistence/schema/storageSchema';
```

---

## React Hook (Recommended)

### Basic Usage

```tsx
function App() {
  const { isLoading, initError, triggerSave } = usePersistence();

  if (isLoading) return <div>Loading...</div>;
  if (initError) return <div>Error: {initError.message}</div>;

  return <YourApp />;
}
```

### Trigger Auto-Save

```tsx
const { triggerSave } = usePersistence();

// After any data change
const handleTrade = () => {
  TradeEngine.executeTrade(request);
  triggerSave(); // Saves after 1 second
};
```

### Manual Save

```tsx
const { saveNow } = usePersistence();

// Save immediately (bypass debounce)
<button onClick={saveNow}>Save Now</button>
```

### Reset Data

```tsx
const { resetData } = usePersistence();

<button onClick={resetData}>Reset All</button>
```

### Export/Import

```tsx
const { exportData, importData } = usePersistence();

// Export
const handleExport = () => {
  const json = exportData();
  // Download file...
};

// Import
const handleImport = (file: File) => {
  // Read file...
  importData(json);
};
```

---

## Direct StorageService (Advanced)

### Save Operations

```typescript
// Save portfolio
const result = StorageService.savePortfolio(portfolio);
if (!result.success) {
  console.error(result.error);
}

// Save trades
StorageService.saveTrades(trades);

// Save orders
StorageService.saveOrders(orders);

// Save complete state
StorageService.saveAppState(appState);
```

### Load Operations

```typescript
// Load portfolio
const result = StorageService.loadPortfolio();
if (result.success && result.data) {
  TradeEngine.loadPortfolio(result.data);
}

// Load trades
const tradesResult = StorageService.loadTrades();

// Load complete state
const stateResult = StorageService.loadAppState();
```

### Utility Operations

```typescript
// Check availability
if (StorageService.isStorageAvailable()) {
  // Safe to use
}

// Get storage info
const info = StorageService.getStorageInfo();
console.log(`Used: ${info.used} bytes`);
console.log(`Keys: ${info.keys}`);

// Clear all data
StorageService.clearAllData();

// Export
const json = StorageService.exportData();

// Import
StorageService.importData(json);
```

---

## Configuration

### Auto-Save Config

```typescript
usePersistence({
  debounceMs: 1000,        // Wait 1s after last change
  enabled: true,           // Enable auto-save
  saveOnUnload: true,      // Save when closing tab
  onSaveSuccess: () => {
    console.log('Saved!');
  },
  onSaveError: (error) => {
    showNotification(error.message);
  },
});
```

---

## Error Handling

```typescript
const result = StorageService.savePortfolio(portfolio);

if (!result.success) {
  switch (result.error?.code) {
    case 'QUOTA_EXCEEDED':
      // Storage full - clear old data
      break;
    case 'UNSUPPORTED_BROWSER':
      // localStorage not available
      break;
    case 'PERMISSION_DENIED':
      // Storage access denied
      break;
    case 'VALIDATION_ERROR':
      // Invalid data
      break;
    default:
      // Unknown error
  }
}
```

---

## Integration Points

### After Trade Execution

```tsx
function TradePanel() {
  const { triggerSave } = usePersistence();

  const handleTrade = () => {
    const result = TradeEngine.executeTrade(request);
    if (result.success) {
      triggerSave(); // Auto-save
    }
  };
}
```

### After Order Placement

```tsx
function OrderPanel() {
  const { triggerSave } = usePersistence();

  const handlePlaceOrder = () => {
    const order = OrderEngine.placeOrder(request);
    if (order) {
      triggerSave(); // Auto-save
    }
  };
}
```

### After Settings Change

```tsx
function Settings() {
  const { triggerSave } = usePersistence();

  const handleUpdate = (prefs: Preferences) => {
    // Update preferences
    triggerSave(); // Auto-save
  };
}
```

---

## Storage Keys

```typescript
// Direct access (not recommended)
tradepulse_app_version    // Version string
tradepulse_portfolio      // Portfolio data
tradepulse_trades         // Trade history
tradepulse_orders         // Limit orders
tradepulse_watchlist      // Symbol list
tradepulse_preferences    // User preferences
tradepulse_metadata       // Metadata
```

---

## Common Patterns

### Check Before Save

```typescript
if (StorageService.isStorageAvailable()) {
  const result = StorageService.savePortfolio(portfolio);
  if (result.success) {
    console.log('Saved successfully');
  }
}
```

### Load with Fallback

```typescript
const result = StorageService.loadPortfolio();
const portfolio = result.success && result.data 
  ? result.data 
  : DEFAULT_PORTFOLIO;
```

### Safe Save with Error Toast

```typescript
const { triggerSave } = usePersistence({
  onSaveError: (error) => {
    toast.error(`Save failed: ${error.message}`);
  }
});
```

---

## Testing

### Mock localStorage

```typescript
const mockStorage = {
  store: {} as Record<string, string>,
  getItem: (key: string) => mockStorage.store[key] || null,
  setItem: (key: string, val: string) => { mockStorage.store[key] = val; },
  removeItem: (key: string) => { delete mockStorage.store[key]; },
  clear: () => { mockStorage.store = {}; },
};

global.localStorage = mockStorage as any;
```

### Reset in Tests

```typescript
beforeEach(() => {
  StorageService.clearAllData();
  TradeEngine.reset();
  OrderEngine.reset();
});
```

---

## Troubleshooting

### Data Not Persisting

1. Check if localStorage is available:
   ```typescript
   console.log(StorageService.isStorageAvailable());
   ```

2. Check for save errors:
   ```typescript
   const result = StorageService.saveAppState(state);
   console.log(result);
   ```

3. Check browser private mode (disables localStorage)

### Storage Full

```typescript
const info = StorageService.getStorageInfo();
if (info.used > 5_000_000) { // 5MB
  // Clear old trades
  const recent = trades.slice(-100);
  StorageService.saveTrades(recent);
}
```

### Migration Issues

```typescript
import MigrationManager from '@persistence/migrations/migrationManager';

const info = MigrationManager.getMigrationInfo();
console.log(info);
```

---

## Performance Tips

1. **Use debounced saves** (avoid rapid localStorage writes)
2. **Limit history size** (keep last 1000 trades)
3. **Batch operations** (use saveAppState vs individual saves)
4. **Monitor storage usage** (useStorageInfo hook)

---

## Security Notes

⚠️ **localStorage is NOT encrypted**
- Don't store passwords or API keys
- Data is visible in DevTools
- Use HTTPS to prevent network interception

---

## Quick Links

- Full Docs: `src/persistence/README.md`
- Examples: `src/persistence/INTEGRATION_EXAMPLE.tsx`
- Schema: `src/persistence/schema/storageSchema.ts`
- Service: `src/persistence/StorageService.ts`
- Hooks: `src/hooks/usePersistence.ts`

---

**Last Updated**: February 16, 2026
