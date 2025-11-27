/**
 * Configuration Module
 * Exports all configuration utilities
 */

// Re-export database utilities
export { getPool, disconnect as disconnectDatabase, testConnection } from './database';

// Re-export Redis utilities  
export { getClient as getRedisClient, disconnect as disconnectRedis, isConnected } from './redis';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Application configuration
 */
export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'legacy_code_revival',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  
  // Upload limits
  upload: {
    maxSizeMB: parseInt(process.env.MAX_CODEBASE_SIZE_MB || '100'),
  },
  
  // Analysis
  analysis: {
    timeoutMinutes: parseInt(process.env.ANALYSIS_TIMEOUT_MINUTES || '10'),
    concurrentAgents: parseInt(process.env.CONCURRENT_AGENTS || '5'),
  },
  
  // API Keys
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    github: process.env.GITHUB_TOKEN,
  },
};
