-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_type VARCHAR(100) NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on project_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_analyses_project_id ON analyses(project_id);

-- Create index on agent_type for filtering
CREATE INDEX IF NOT EXISTS idx_analyses_agent_type ON analyses(agent_type);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- Create composite index for common query pattern (project_id + created_at)
CREATE INDEX IF NOT EXISTS idx_analyses_project_created ON analyses(project_id, created_at DESC);

-- Create GIN index on JSONB result field for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_analyses_result_gin ON analyses USING GIN (result);
