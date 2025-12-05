-- Migration: Create AI Results Table
-- Description: Store AI-generated documentation, tests, modernization, and refactoring results

CREATE TABLE IF NOT EXISTS ai_results (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Documentation results
  documentation JSONB,
  
  -- Test generation results
  tests JSONB,
  
  -- Modernization analysis results
  modernization JSONB,
  
  -- Refactoring suggestions
  refactoring JSONB,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_results_project_id ON ai_results(project_id);
CREATE INDEX idx_ai_results_created_at ON ai_results(created_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_ai_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_results_updated_at
  BEFORE UPDATE ON ai_results
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_results_updated_at();
