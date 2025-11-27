# Quick Start Guide

Get the Legacy Code Revival AI system up and running in minutes.

## Prerequisites

- Node.js 18+ installed
- Docker Desktop (for Redis) OR WSL2 (for Redis)
- PostgreSQL (optional for now, will be needed later)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Redis

### Using Docker (Easiest):

```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### Using WSL2:

```bash
wsl
sudo apt update && sudo apt install redis-server
sudo service redis-server start
```

See [REDIS_SETUP.md](REDIS_SETUP.md) for more options.

## Step 3: Configure Environment

```bash
# Copy example environment file
copy .env.example .env

# Edit .env if needed (default values should work)
```

## Step 4: Test Redis Connection

```bash
npm run test:redis
```

You should see:
```
✓ Connected to Redis
✓ SET operation successful
✓ GET operation successful
✓ DEL operation successful
✓ SETEX operation successful

✅ All Redis tests passed!
```

## Step 5: Run the Application

```bash
npm run dev
```

## Next Steps

Now you're ready to implement the analysis engine components:

1. **Task 2**: Implement data models and database schema
2. **Task 3**: Implement Upload Handler
3. **Task 4**: Implement Source Processor
4. And so on...

## Troubleshooting

### Redis Connection Failed

If you see connection errors:

1. **Check if Redis is running:**
   ```bash
   docker ps
   # or
   sudo service redis-server status
   ```

2. **Restart Redis:**
   ```bash
   docker restart redis
   # or
   sudo service redis-server restart
   ```

3. **Check port availability:**
   ```bash
   netstat -an | findstr 6379
   ```

### Module Not Found

If you see module errors:
```bash
npm install
```

### TypeScript Errors

```bash
npm run build
```

## Development Commands

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Test Redis connection
npm run test:redis

# Build for production
npm run build
```

## Project Structure

```
legacy-code-revival-ai/
├── src/
│   ├── config/          # Configuration (Redis, Database)
│   ├── interfaces/      # TypeScript interfaces
│   ├── types/           # Type definitions
│   ├── scripts/         # Utility scripts
│   └── index.ts         # Entry point
├── .env                 # Environment variables
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript config
```

## Need Help?

- Check [REDIS_SETUP.md](REDIS_SETUP.md) for detailed Redis setup
- Review the spec files in `.kiro/specs/codebase-analysis-engine/`
- Check the design document for architecture details
