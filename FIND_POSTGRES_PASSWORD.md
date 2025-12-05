# Find Your PostgreSQL Password

You have local PostgreSQL installations running. Here's how to find/reset the password:

## Option 1: Check Common Passwords

Try these common passwords in your `.env` file:

```env
DB_PASSWORD=postgres
DB_PASSWORD=root  
DB_PASSWORD=admin
DB_PASSWORD=password
DB_PASSWORD=  (empty)
```

## Option 2: Reset PostgreSQL Password

### For PostgreSQL 17:
```bash
# Open pgAdmin or psql
psql -U postgres

# If it asks for password and you don't know it, reset it:
# 1. Find pg_hba.conf file (usually in C:\Program Files\PostgreSQL\17\data\)
# 2. Change "md5" to "trust" for local connections
# 3. Restart PostgreSQL service
# 4. Connect without password and reset:

ALTER USER postgres WITH PASSWORD 'postgres';

# 5. Change pg_hba.conf back to "md5"
# 6. Restart service again
```

## Option 3: Use Docker PostgreSQL (Recommended)

Since local PostgreSQL is causing issues, let's use Docker on a different port:

### Step 1: Stop local PostgreSQL services temporarily
```powershell
Stop-Service postgresql-x64-17
Stop-Service postgresql-x64-18
```

### Step 2: Start Docker PostgreSQL on port 5432
```bash
docker stop postgres 2>$null
docker rm postgres 2>$null
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=legacy_code_revival -p 5432:5432 postgres:15
```

### Step 3: Update .env
```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_PASSWORD=postgres
```

### Step 4: Wait and run migrations
```bash
timeout /t 10
npm run migrate:up
```

### Step 5: Restart local services when done
```powershell
Start-Service postgresql-x64-17
Start-Service postgresql-x64-18
```

## Option 4: Skip PostgreSQL for Now

The codebase analysis engine can work without PostgreSQL for testing. Just use Redis:

1. Comment out database calls in the code
2. Use in-memory storage for testing
3. Add PostgreSQL later when you have the password

## Quick Test

Try this to see which password works:

```bash
# Test with postgres
psql -h localhost -U postgres -d postgres -c "SELECT 1;"

# If it prompts for password, try:
# - postgres
# - root
# - admin
# - (empty - just press Enter)
```

## Current Status

Your local PostgreSQL services are running:
- postgresql-x64-17 (Running)
- postgresql-x64-18 (Running)

One of these is using port 5432 with an unknown password.

## Recommendation

**Easiest solution**: Temporarily stop local PostgreSQL services and use Docker:

```powershell
# Run this in PowerShell as Administrator
Stop-Service postgresql-x64-17
Stop-Service postgresql-x64-18

# Then start Docker PostgreSQL
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=legacy_code_revival -p 5432:5432 postgres:15

# Wait 10 seconds
timeout /t 10

# Run migrations
npm run migrate:up

# When done, restart local services
Start-Service postgresql-x64-17
Start-Service postgresql-x64-18
```

This way you have full control over the Docker PostgreSQL password.
