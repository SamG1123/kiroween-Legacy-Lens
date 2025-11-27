/**
 * Redis Configuration
 * Re-exports existing Redis utilities for consistency
 */

export { getRedisClient as getClient, closeRedisClient as disconnect } from '../queue/config';

// Helper to check if connected
export async function isConnected(): Promise<boolean> {
  try {
    const client = await getClient();
    return client.isOpen;
  } catch {
    return false;
  }
}

// Re-export for convenience
import { getRedisClient } from '../queue/config';
const getClient = getRedisClient;
