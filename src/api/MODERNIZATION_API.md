# Modernization API Endpoints

This document describes the API endpoints for the Modernization Advisor feature.

## POST /api/modernize/:projectId

Analyzes a project and generates modernization recommendations.

### Prerequisites

- The project must exist and have a completed analysis (status: 'completed')
- The analysis must include dependency or framework information

### Request

**URL Parameters:**
- `projectId` (string, required): UUID of the project to analyze

**Request Body (optional):**
```json
{
  "dependencies": [
    {
      "name": "express",
      "version": "4.17.0",
      "type": "production",
      "ecosystem": "npm"
    }
  ],
  "frameworks": [
    {
      "name": "express",
      "version": "4.17.0",
      "type": "backend"
    }
  ],
  "codebasePath": "/path/to/codebase"
}
```

**Note:** If dependencies and frameworks are not provided in the request body, they will be extracted from the project's analysis report.

### Response

**Success (200 OK):**
```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "analysisId": "789e0123-e89b-12d3-a456-426614174000",
  "status": "completed",
  "message": "Modernization analysis completed successfully",
  "summary": "Identified 5 modernization opportunities across your codebase...",
  "statistics": {
    "totalRecommendations": 5,
    "byPriority": {
      "critical": 1,
      "high": 2,
      "medium": 1,
      "low": 1
    },
    "byType": {
      "dependency": 3,
      "framework": 1,
      "pattern": 1
    },
    "estimatedEffort": {
      "min": 5,
      "max": 10,
      "confidence": "medium"
    }
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid project ID format, analysis not complete, or no data to analyze
- `404 Not Found`: Project or analysis not found
- `500 Internal Server Error`: Server error during analysis

### Example Usage

```bash
# Using curl
curl -X POST http://localhost:3000/api/modernize/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json"

# With custom dependencies
curl -X POST http://localhost:3000/api/modernize/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{
    "dependencies": [
      {
        "name": "express",
        "version": "4.17.0",
        "type": "production",
        "ecosystem": "npm"
      }
    ]
  }'
```

## GET /api/modernization/:projectId

Retrieves the modernization recommendations for a project.

### Request

**URL Parameters:**
- `projectId` (string, required): UUID of the project

### Response

**Success (200 OK):**
```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "analysisId": "789e0123-e89b-12d3-a456-426614174000",
  "name": "My Project",
  "report": {
    "summary": "Identified 5 modernization opportunities...",
    "statistics": {
      "totalRecommendations": 5,
      "byPriority": {
        "critical": 1,
        "high": 2,
        "medium": 1,
        "low": 1
      },
      "byType": {
        "dependency": 3,
        "framework": 1,
        "pattern": 1
      },
      "estimatedEffort": {
        "min": 5,
        "max": 10,
        "confidence": "medium"
      }
    },
    "recommendations": [
      {
        "id": "rec-1",
        "type": "dependency",
        "title": "Update express to latest version",
        "description": "Express 4.17.0 is outdated. Latest version is 4.18.2",
        "currentState": "express@4.17.0",
        "suggestedState": "express@4.18.2",
        "benefits": [
          "Security fixes",
          "Performance improvements",
          "New features"
        ],
        "effort": "low",
        "priority": "high",
        "migrationSteps": [
          "Update package.json",
          "Run npm install",
          "Test application"
        ],
        "resources": [
          "https://expressjs.com/en/changelog/4x.html"
        ],
        "automatedTools": []
      }
    ],
    "roadmap": {
      "phases": [
        {
          "number": 1,
          "name": "Critical Security Updates",
          "description": "Address critical security vulnerabilities",
          "recommendations": [],
          "estimate": {
            "min": 1,
            "max": 2,
            "confidence": "high"
          },
          "prerequisites": []
        }
      ],
      "totalEstimate": {
        "min": 5,
        "max": 10,
        "confidence": "medium"
      },
      "criticalPath": ["rec-1", "rec-2"],
      "quickWins": []
    },
    "compatibilityReport": {
      "compatible": true,
      "issues": [],
      "resolutions": []
    },
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid project ID format
- `404 Not Found`: Project not found or no modernization analysis exists
- `500 Internal Server Error`: Server error

### Example Usage

```bash
# Using curl
curl http://localhost:3000/api/modernization/123e4567-e89b-12d3-a456-426614174000
```

## Workflow

1. **Analyze Project**: First, analyze the project using `POST /api/analyze` to get dependency and framework information
2. **Generate Modernization Report**: Call `POST /api/modernize/:projectId` to generate modernization recommendations
3. **Retrieve Report**: Use `GET /api/modernization/:projectId` to retrieve the full modernization report anytime

## Report Structure

The modernization report includes:

- **Summary**: High-level overview of modernization opportunities
- **Statistics**: Breakdown by priority, type, and estimated effort
- **Recommendations**: Detailed list of all recommendations with:
  - Current and suggested states
  - Benefits and effort estimates
  - Migration steps and resources
  - Code examples (when applicable)
- **Roadmap**: Phased implementation plan with:
  - Organized phases
  - Dependencies between recommendations
  - Timeline estimates
  - Quick wins identification
- **Compatibility Report**: Analysis of potential conflicts between recommendations

## Error Codes

- `INVALID_ID`: Project ID is not a valid UUID
- `PROJECT_NOT_FOUND`: Project does not exist
- `ANALYSIS_NOT_COMPLETE`: Project analysis must be completed first
- `ANALYSIS_NOT_FOUND`: No analysis report found for project
- `NO_DATA_TO_ANALYZE`: No dependencies or frameworks found to analyze
- `MODERNIZATION_NOT_FOUND`: No modernization analysis exists for project
- `INTERNAL_ERROR`: Server error occurred
