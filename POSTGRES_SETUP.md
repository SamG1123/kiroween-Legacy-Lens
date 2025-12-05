# PostgreSQL Setup Guide

PostgreSQL is required for storing project data and analysis results.

## Option 1: Docker (Recommended - Easiest)

```bash
# Start PostgreSQL container
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=legacy_code_revival \
  -p 5432:5432 \
  postgres:15

# Check if running
docker ps

# View logs
docker logs postgres

# Stop PostgreSQL
docker stop postgres

# Start PostgreSQL again
docker start postgres
```

## Option 2: Windows Installer

1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer
3. Set password to `postgres` (or update `.env` file)
4. Default port: 5432
5. Create database: `legacy_code_revival`

### Create Database (if needed):
```bash
# Using psql command line
psql -U postgres
CREATE DATABASE legacy_code_revival;
\q
```

## Option 3: WSL2

```bash
wsl
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo service postgresql start

# Create user and database
sudo -u postgres psql
CREATE USER postgres WITH PASSWORD 'postgres';
CREATE DATABASE legacy_code_revival OWNER postgres;
GRANT ALL PRIVILEGES ON DATABASE legacy_code_revival TO postgres;
\q
```

## Configuration

Your `.env` file should have:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=legacy_code_revival
DB_USER=postgres
DB_PASSWORD=postgres
```

## Run Migrations

After PostgreSQL is running, create the database tables:

```bash
npm run migrate:up
```

Expected output:
```
Starting database migrations...
Executing migration 1: create_projects_table...
✓ Migration 1 completed successfully
Executing migration 2: create_analyses_table...
✓ Migration 2 completed successfully

✓ Successfully executed 2 migration(s)
```

## Verify Setup

```bash
npm run check
```

You should see:
```
2. Checking PostgreSQL connection...
   ✅ PostgreSQL is connected
```

## Database Schema

### Projects Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_url TEXT,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### Analyses Table
```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  agent_type VARCHAR(100) NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

## Troubleshooting

### Connection Refused

**Check if PostgreSQL is running:**
```bash
# Docker
docker ps | findstr postgres

# Windows Service
Get-Service postgresql*

# WSL2
wsl
sudo service postgresql status
```

**Restart PostgreSQL:**
```bash
# Docker
docker restart postgres

# Windows
Restart-Service postgresql*

# WSL2
wsl
sudo service postgresql restart
```

### Authentication Failed

Update your `.env` file with the correct credentials:
```env
DB_PASSWORD=your_actual_password
```

### Database Does Not Exist

Create the database:
```bash
# Docker
docker exec -it postgres psql -U postgres -c "CREATE DATABASE legacy_code_revival;"

# Local psql
psql -U postgres -c "CREATE DATABASE legacy_code_revival;"
```

### Port Already in Use

Check what's using port 5432:
```bash
netstat -an | findstr 5432
```

Change the port in `.env`:
```env
DB_PORT=5433
```

And update Docker command:
```bash
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres:15
```

## Quick Commands

```bash
# Start PostgreSQL (Docker)
docker start postgres

# Run migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Check connection
npm run check

# Connect to database (Docker)
docker exec -it postgres psql -U postgres -d legacy_code_revival

# View tables
docker exec -it postgres psql -U postgres -d legacy_code_revival -c "\dt"
```

## Database Management Tools

### pgAdmin (GUI)
- Download: https://www.pgadmin.org/download/
- Connect to: localhost:5432
- Database: legacy_code_revival

### DBeaver (GUI)
- Download: https://dbeaver.io/download/
- Universal database tool

### psql (Command Line)
```bash
# Connect to database
psql -h localhost -U postgres -d legacy_code_revival

# List tables
\dt

# Describe table
\d projects

# Query data
SELECT * FROM projects;

# Exit
\q
```

## Next Steps

Once PostgreSQL is set up:

1. ✅ Start PostgreSQL
2. ✅ Run migrations: `npm run migrate:up`
3. ✅ Verify: `npm run check`
4. ✅ Ready to use database models!

## Database Models Usage

```typescript
import { ProjectModel, AnalysisModel } from './database';

// Create a project
const projectModel = new ProjectModel();
const project = await projectModel.create({
  name: 'My Legacy Project',
  sourceType: 'github',
  sourceUrl: 'https://github.com/user/repo'
});

// Create an analysis
const analysisModel = new AnalysisModel();
const analysis = await analysisModel.create({
  projectId: project.id,
  agentType: 'analyzer',
  result: { /* analysis report */ }
});
```
