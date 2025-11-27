# Technical Specifications

## API Endpoints

### POST /api/analyze
Upload codebase for analysis
```json
{
  "source": "github_url | zip_file",
  "options": {
    "include_refactoring": true,
    "include_tests": true,
    "include_docs": true
  }
}
```

### GET /api/analysis/{id}
Get analysis status and results

### POST /api/refactor/{id}
Trigger refactoring for specific files

### POST /api/generate-tests/{id}
Generate tests for analyzed code

### GET /api/report/{id}
Download comprehensive report

## Agent Specifications

### Analyzer Agent
**Input:** Codebase directory
**Output:** Analysis report JSON

```json
{
  "languages": ["python", "javascript"],
  "frameworks": ["django", "react"],
  "metrics": {
    "total_files": 150,
    "total_lines": 45000,
    "complexity_score": 7.2,
    "maintainability_index": 65
  },
  "issues": [
    {
      "type": "code_smell",
      "severity": "high",
      "file": "app.py",
      "line": 42,
      "description": "Function too complex"
    }
  ]
}
```

### Documentation Agent
**Input:** Code files + analysis
**Output:** Documentation files

- README.md with project overview
- API documentation
- Architecture diagrams (Mermaid)
- Inline code comments

### Modernization Agent
**Input:** Dependencies + framework versions
**Output:** Upgrade recommendations

```json
{
  "recommendations": [
    {
      "type": "framework_upgrade",
      "current": "React 16.8",
      "suggested": "React 18.2",
      "effort": "medium",
      "benefits": ["Better performance", "Concurrent features"],
      "migration_steps": []
    }
  ]
}
```

### Refactoring Agent
**Input:** Code files + issues
**Output:** Refactored code + diff

- Extract method refactoring
- Remove code duplication
- Simplify conditionals
- Apply SOLID principles

### Testing Agent
**Input:** Code files
**Output:** Test files

- Unit tests with high coverage
- Integration test suggestions
- Test data generators
- Mocking strategies

## Database Schema

### projects
- id (uuid)
- name (string)
- source_type (enum: github, zip, local)
- source_url (string)
- created_at (timestamp)
- status (enum: pending, analyzing, completed, failed)

### analyses
- id (uuid)
- project_id (fk)
- agent_type (string)
- result (jsonb)
- created_at (timestamp)

### refactorings
- id (uuid)
- project_id (fk)
- file_path (string)
- original_code (text)
- refactored_code (text)
- applied (boolean)
- created_at (timestamp)

## Configuration

### Environment Variables
```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DATABASE_URL=
REDIS_URL=
GITHUB_TOKEN=
MAX_CODEBASE_SIZE_MB=100
CONCURRENT_AGENTS=5
```

## Performance Requirements

- Analyze 10,000 LOC in < 2 minutes
- Support codebases up to 100MB
- Handle 10 concurrent analyses
- API response time < 500ms
- 99% uptime SLA
