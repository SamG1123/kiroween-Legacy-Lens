# Database Setup

This directory contains the database configuration, models, and migrations for the Legacy Code Revival AI system.

## Prerequisites

- PostgreSQL 12 or higher installed and running
- Node.js and npm/yarn installed

## Setup

1. **Create the database:**
   ```bash
   createdb legacy_code_revival
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```

3. **Run migrations:**
   ```bash
   npm run migrate:up
   ```

## Database Schema

### Projects Table

Stores information about uploaded codebases.

| Column      | Type      | Description                                    |
|-------------|-----------|------------------------------------------------|
| id          | UUID      | Primary key                                    |
| name        | VARCHAR   | Project name                                   |
| source_type | VARCHAR   | Source type: 'github', 'zip', or 'local'      |
| source_url  | TEXT      | URL for GitHub repos, null for ZIP/local      |
| status      | VARCHAR   | Status: 'pending', 'analyzing', 'completed', 'failed' |
| created_at  | TIMESTAMP | Creation timestamp                             |
| updated_at  | TIMESTAMP | Last update timestamp                          |

### Analyses Table

Stores analysis results for projects.

| Column      | Type      | Description                                    |
|-------------|-----------|------------------------------------------------|
| id          | UUID      | Primary key                                    |
| project_id  | UUID      | Foreign key to projects table                  |
| agent_type  | VARCHAR   | Type of agent that performed the analysis      |
| result      | JSONB     | Analysis results in JSON format                |
| created_at  | TIMESTAMP | Creation timestamp                             |

## Models

### ProjectModel

CRUD operations for projects:
- `create(data)` - Create a new project
- `findById(id)` - Find project by ID
- `updateStatus(id, status)` - Update project status
- `update(id, data)` - Update project fields
- `delete(id)` - Delete a project
- `findAll(limit, offset)` - List all projects
- `findByStatus(status)` - Find projects by status

### AnalysisModel

CRUD operations for analyses:
- `create(data)` - Create a new analysis
- `findById(id)` - Find analysis by ID
- `findByProjectId(projectId)` - Find all analyses for a project
- `findLatestByProjectId(projectId)` - Find the latest analysis for a project
- `findByAgentType(agentType)` - Find analyses by agent type
- `updateResult(id, result)` - Update analysis result
- `delete(id)` - Delete an analysis
- `deleteByProjectId(projectId)` - Delete all analyses for a project
- `findAll(limit, offset)` - List all analyses

## Migrations

Migrations are SQL scripts that create and modify the database schema.

### Running Migrations

```bash
# Run all pending migrations
npm run migrate:up

# Rollback the last migration
npm run migrate:down
```

### Creating New Migrations

1. Create a new SQL file in `src/database/migrations/` with the naming pattern: `XXX_description.sql`
2. Add the migration to the `migrations` array in `src/database/migrate.ts`
3. Run `npm run migrate:up`

## Usage Example

```typescript
import { ProjectModel, AnalysisModel } from './database';

// Create a new project
const projectModel = new ProjectModel();
const project = await projectModel.create({
  name: 'My Legacy Project',
  sourceType: 'github',
  sourceUrl: 'https://github.com/user/repo',
});

// Update project status
await projectModel.updateStatus(project.id, 'analyzing');

// Create an analysis
const analysisModel = new AnalysisModel();
const analysis = await analysisModel.create({
  projectId: project.id,
  agentType: 'analyzer',
  result: {
    projectId: project.id,
    status: 'completed',
    // ... other analysis data
  },
});

// Retrieve analysis
const latestAnalysis = await analysisModel.findLatestByProjectId(project.id);
```

## Testing

The database connection can be tested using:

```typescript
import { testConnection } from './database';

const isConnected = await testConnection();
console.log('Database connected:', isConnected);
```
