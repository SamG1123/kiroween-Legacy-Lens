/**
 * Setup Checker
 * Verifies all required services are running
 */

import { getRedisClient, closeRedisClient } from '../queue/config';
import { testConnection, closePool } from '../database/config';

async function checkSetup() {
  console.log('🔍 Checking system setup...\n');

  let allGood = true;

  // Check Redis
  console.log('1. Checking Redis connection...');
  try {
    const redisClient = await getRedisClient();
    await redisClient.ping();
    console.log('   ✅ Redis is connected and responding\n');
    await closeRedisClient();
  } catch (error) {
    console.log('   ❌ Redis connection failed');
    console.log('   → Run: docker run -d -p 6379:6379 --name redis redis:latest');
    console.log('   → Or see REDIS_SETUP.md for other options\n');
    allGood = false;
  }

  // Check Database (optional for now)
  console.log('2. Checking PostgreSQL connection...');
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      console.log('   ✅ PostgreSQL is connected\n');
    } else {
      console.log('   ⚠️  PostgreSQL connection failed (optional for now)\n');
    }
    await closePool();
  } catch (error) {
    console.log('   ⚠️  PostgreSQL not configured (optional for now)');
    console.log('   → Will be needed for Task 2: Database setup\n');
  }

  // Check Environment Variables
  console.log('3. Checking environment configuration...');
  const requiredEnvVars = ['REDIS_HOST'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length === 0 || process.env.REDIS_HOST === undefined) {
    console.log('   ✅ Environment variables configured (using defaults)\n');
  } else {
    console.log('   ⚠️  Missing environment variables:', missingVars.join(', '));
    console.log('   → Copy .env.example to .env\n');
  }

  // Summary
  console.log('─'.repeat(50));
  if (allGood) {
    console.log('✅ System is ready! You can start development.');
    console.log('\nRun: npm run dev\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some services need attention.');
    console.log('\nSee QUICKSTART.md for setup instructions.\n');
    process.exit(1);
  }
}

// Run the check
checkSetup();
