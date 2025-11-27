# Redis Setup Guide for Windows

Redis is required for the Legacy Code Revival AI system to handle job queues and caching.

## Option 1: Docker (Recommended - Easiest)

If you have Docker Desktop installed:

```bash
# Start Redis container
docker run -d -p 6379:6379 --name redis redis:latest

# Check if Redis is running
docker ps

# Stop Redis
docker stop redis

# Start Redis again
docker start redis

# View Redis logs
docker logs redis
```

## Option 2: WSL2 (Linux Subsystem)

If you have WSL2 installed:

```bash
# Open WSL2 terminal
wsl

# Update packages
sudo apt update

# Install Redis
sudo apt install redis-server

# Start Redis
sudo service redis-server start

# Check Redis status
sudo service redis-server status

# Test Redis connection
redis-cli ping
# Should return: PONG
```

## Option 3: Memurai (Windows Native)

Memurai is a Redis-compatible server for Windows:

1. Download from: https://www.memurai.com/get-memurai
2. Install the MSI package
3. Memurai will run as a Windows service automatically
4. Default port: 6379

## Option 4: Redis Stack (Docker with RedisInsight)

For a complete Redis experience with GUI:

```bash
docker run -d -p 6379:6379 -p 8001:8001 --name redis-stack redis/redis-stack:latest
```

Then access RedisInsight at: http://localhost:8001

## Verify Redis Connection

After starting Redis, test the connection:

```bash
# Install Redis CLI globally (optional)
npm install -g redis-cli

# Test connection
redis-cli ping
# Should return: PONG

# Or use Node.js
node -e "const redis = require('redis'); const client = redis.createClient(); client.connect().then(() => { console.log('Connected!'); client.quit(); });"
```

## Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Update Redis URL in `.env` if needed:
   ```
   REDIS_URL=redis://localhost:6379
   ```

## Testing the Setup

Run the application to test Redis connection:

```bash
npm install
npm run dev
```

You should see: `Redis: Connected successfully`

## Troubleshooting

### Connection Refused
- Make sure Redis is running: `docker ps` or `sudo service redis-server status`
- Check if port 6379 is available: `netstat -an | findstr 6379`

### Permission Denied (WSL2)
```bash
sudo chown -R $USER:$USER /var/lib/redis
sudo service redis-server restart
```

### Docker Issues
```bash
# Remove and recreate container
docker rm -f redis
docker run -d -p 6379:6379 --name redis redis:latest
```

## Quick Start Commands

```bash
# Start Redis (Docker)
docker start redis

# Start application
npm run dev

# Stop Redis (Docker)
docker stop redis
```
