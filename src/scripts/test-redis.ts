/**
 * Test Redis Connection
 * Run this script to verify Redis is properly configured
 */

import { getRedisClient, closeRedisClient } from '../queue/config';

async function testRedis() {
  console.log('Testing Redis connection...\n');

  try {
    // Get Redis client
    const client = await getRedisClient();
    console.log('✓ Connected to Redis');

    // Test basic operations
    console.log('\nTesting basic operations:');
    
    // Set a value
    await client.set('test:key', 'Hello Redis!');
    console.log('✓ SET operation successful');

    // Get the value
    const value = await client.get('test:key');
    console.log(`✓ GET operation successful: ${value}`);

    // Delete the key
    await client.del('test:key');
    console.log('✓ DEL operation successful');

    // Test expiration
    await client.setEx('test:expire', 5, 'This will expire');
    const ttl = await client.ttl('test:expire');
    console.log(`✓ SETEX operation successful (TTL: ${ttl}s)`);

    // Clean up
    await client.del('test:expire');

    console.log('\n✅ All Redis tests passed!');
    console.log('Redis is properly configured and working.\n');

    // Disconnect
    await closeRedisClient();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Redis connection failed:');
    console.error(error);
    console.log('\nPlease ensure Redis is running. See REDIS_SETUP.md for instructions.\n');
    process.exit(1);
  }
}

// Run the test
testRedis();
