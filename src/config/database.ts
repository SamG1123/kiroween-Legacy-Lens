/**
 * Database Configuration
 * Re-exports existing database utilities for consistency
 */

export { getPool, closePool as disconnect, testConnection } from '../database/config';
