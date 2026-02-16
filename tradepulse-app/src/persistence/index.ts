/**
 * ============================================================================
 * Persistence Layer - Barrel Exports
 * ============================================================================
 * 
 * Centralized exports for the persistence layer
 * ============================================================================
 */

// Storage Service
export { default as StorageService } from './StorageService';
export * from './StorageService';

// Migration Manager
export { default as MigrationManager } from './migrations/migrationManager';
export * from './migrations/migrationManager';

// Storage Schema
export * from './schema/storageSchema';

// Hooks (re-export from hooks folder for convenience)
export { default as usePersistence } from '../hooks/usePersistence';
export * from '../hooks/usePersistence';
