/**
 * ============================================================================
 * Data Migration System
 * ============================================================================
 * 
 * Handles schema version changes gracefully:
 * - Sequential migrations from old to new versions
 * - Backward compatibility
 * - Data transformation and validation
 * - Rollback support (future)
 * 
 * Migration Strategy:
 * 1. Check stored version vs current version
 * 2. Apply migrations sequentially (v1.0 → v1.1 → v2.0)
 * 3. Validate migrated data
 * 4. Save with new version number
 * 
 * Adding New Migrations:
 * 1. Increment CURRENT_SCHEMA_VERSION in storageSchema.ts
 * 2. Add migration function to MIGRATIONS array
 * 3. Update migration tests
 * 
 * Example Migration:
 * ```ts
 * const migrate_v1_0_to_v1_1 = (state: AppState): AppState => {
 *   return {
 *     ...state,
 *     version: '1.1.0',
 *     // Transform data here
 *     portfolio: {
 *       ...state.portfolio,
 *       // Add new field
 *       createdAt: Date.now(),
 *     }
 *   };
 * };
 * ```
 * 
 * ============================================================================
 */

import type { AppState } from '../schema/storageSchema';
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_APP_STATE,
  createStorageError,
  type StorageResult,
} from '../schema/storageSchema';

/**
 * Migration function type
 * Takes old state, returns new state (or throws error)
 */
export type MigrationFn = (state: AppState) => AppState;

/**
 * Migration descriptor
 */
export interface Migration {
  fromVersion: string;
  toVersion: string;
  migrate: MigrationFn;
  description: string;
}

/**
 * ============================================================================
 * MIGRATION DEFINITIONS
 * ============================================================================
 */

/**
 * v1.0.0 baseline (no migration needed)
 * This is the initial schema version
 */

/**
 * Example future migration: v1.0.0 → v1.1.0
 * Uncomment and modify when needed
 */
// const migrate_v1_0_to_v1_1: Migration = {
//   fromVersion: '1.0.0',
//   toVersion: '1.1.0',
//   description: 'Add createdAt timestamp to portfolio',
//   migrate: (state: AppState): AppState => {
//     return {
//       ...state,
//       version: '1.1.0',
//       portfolio: {
//         ...state.portfolio,
//         // Add new field with default value
//         createdAt: state.metadata.lastModified || Date.now(),
//       },
//       metadata: {
//         ...state.metadata,
//         version: '1.1.0',
//       },
//     };
//   },
// };

/**
 * Example future migration: v1.1.0 → v2.0.0
 * Breaking change example
 */
// const migrate_v1_1_to_v2_0: Migration = {
//   fromVersion: '1.1.0',
//   toVersion: '2.0.0',
//   description: 'Restructure positions to array format',
//   migrate: (state: AppState): AppState => {
//     // Convert positions from Record to Array
//     const positionsArray = Object.entries(state.portfolio.positions).map(
//       ([symbol, position]) => ({
//         ...position,
//         symbol,
//       })
//     );
//
//     return {
//       ...state,
//       version: '2.0.0',
//       portfolio: {
//         ...state.portfolio,
//         positions: positionsArray, // Breaking change!
//       },
//       metadata: {
//         ...state.metadata,
//         version: '2.0.0',
//       },
//     };
//   },
// };

/**
 * All available migrations (in order)
 * Add new migrations to the end of this array
 */
export const MIGRATIONS: Migration[] = [
  // Add migrations here as schema evolves
  // migrate_v1_0_to_v1_1,
  // migrate_v1_1_to_v2_0,
];

/**
 * ============================================================================
 * MIGRATION EXECUTION
 * ============================================================================
 */

/**
 * Compare semantic versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
};

/**
 * Check if migration is needed
 */
export const needsMigration = (currentVersion: string): boolean => {
  return compareVersions(currentVersion, CURRENT_SCHEMA_VERSION) < 0;
};

/**
 * Find migration path from old version to current version
 * Returns array of migrations to apply in order
 */
export const findMigrationPath = (fromVersion: string): Migration[] => {
  const path: Migration[] = [];
  let currentVersion = fromVersion;

  // Find sequential migrations
  while (compareVersions(currentVersion, CURRENT_SCHEMA_VERSION) < 0) {
    const migration = MIGRATIONS.find((m) => m.fromVersion === currentVersion);

    if (!migration) {
      // No migration path found
      console.warn(
        `No migration found from ${currentVersion} to ${CURRENT_SCHEMA_VERSION}`
      );
      break;
    }

    path.push(migration);
    currentVersion = migration.toVersion;
  }

  return path;
};

/**
 * Apply single migration with error handling
 */
const applyMigration = (
  state: AppState,
  migration: Migration
): StorageResult<AppState> => {
  try {
    console.log(
      `[Migration] Applying: ${migration.fromVersion} → ${migration.toVersion}`
    );
    console.log(`[Migration] Description: ${migration.description}`);

    const migratedState = migration.migrate(state);

    console.log(`[Migration] ✅ Successfully migrated to ${migration.toVersion}`);

    return {
      success: true,
      data: migratedState,
    };
  } catch (error) {
    console.error(`[Migration] ❌ Failed:`, error);

    return {
      success: false,
      error: createStorageError(
        'MIGRATION_ERROR',
        `Migration failed: ${migration.fromVersion} → ${migration.toVersion}`,
        error
      ),
    };
  }
};

/**
 * Migrate app state from old version to current version
 * 
 * @param state Old app state
 * @returns Result with migrated state or error
 */
export const migrateAppState = (state: AppState): StorageResult<AppState> => {
  const fromVersion = state.version;

  // Check if migration needed
  if (!needsMigration(fromVersion)) {
    console.log(`[Migration] No migration needed (already at ${fromVersion})`);
    return {
      success: true,
      data: state,
    };
  }

  console.log(`[Migration] Starting migration from ${fromVersion} to ${CURRENT_SCHEMA_VERSION}`);

  // Find migration path
  const path = findMigrationPath(fromVersion);

  if (path.length === 0) {
    // No migration path found, but version mismatch
    // This could happen if user downgrades or skips versions
    console.warn(
      `[Migration] No migration path found from ${fromVersion} to ${CURRENT_SCHEMA_VERSION}`
    );

    return {
      success: false,
      error: createStorageError(
        'MIGRATION_ERROR',
        `No migration path from ${fromVersion} to ${CURRENT_SCHEMA_VERSION}. Data may be incompatible.`
      ),
    };
  }

  console.log(`[Migration] Found migration path with ${path.length} step(s)`);

  // Apply migrations sequentially
  let currentState = state;

  for (const migration of path) {
    const result = applyMigration(currentState, migration);

    if (!result.success || !result.data) {
      // Migration failed
      return result;
    }

    currentState = result.data;
  }

  console.log(`[Migration] ✅ All migrations completed successfully`);

  return {
    success: true,
    data: currentState,
  };
};

/**
 * ============================================================================
 * FALLBACK STRATEGIES
 * ============================================================================
 */

/**
 * Handle migration failure
 * 
 * Options:
 * 1. Reset to defaults (lose data, but app works)
 * 2. Export backup and reset
 * 3. Prompt user for action
 */
export const handleMigrationFailure = (
  error: unknown
): StorageResult<AppState> => {
  console.error('[Migration] Migration failed, using default state:', error);

  // For now, return default state
  // In production, you might want to:
  // 1. Export current state as backup
  // 2. Show user notification
  // 3. Offer option to restore from backup

  return {
    success: true,
    data: DEFAULT_APP_STATE,
  };
};

/**
 * Safe migration with fallback
 * 
 * Attempts migration, falls back to defaults if it fails
 */
export const safeMigrate = (state: AppState): AppState => {
  const result = migrateAppState(state);

  if (result.success && result.data) {
    return result.data;
  }

  // Migration failed, use default state
  console.warn('[Migration] Using default state due to migration failure');
  const fallbackResult = handleMigrationFailure(result.error);

  return fallbackResult.data || DEFAULT_APP_STATE;
};

/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Get migration info for debugging
 */
export const getMigrationInfo = () => {
  return {
    currentVersion: CURRENT_SCHEMA_VERSION,
    availableMigrations: MIGRATIONS.length,
    migrations: MIGRATIONS.map((m) => ({
      from: m.fromVersion,
      to: m.toVersion,
      description: m.description,
    })),
  };
};

/**
 * Check if version is compatible (within migration path)
 */
export const isVersionCompatible = (version: string): boolean => {
  // Current version is always compatible
  if (version === CURRENT_SCHEMA_VERSION) {
    return true;
  }

  // Check if migration path exists
  const path = findMigrationPath(version);
  return path.length > 0;
};

/**
 * Public API
 */
export default {
  compareVersions,
  needsMigration,
  findMigrationPath,
  migrateAppState,
  safeMigrate,
  getMigrationInfo,
  isVersionCompatible,
  handleMigrationFailure,
};
