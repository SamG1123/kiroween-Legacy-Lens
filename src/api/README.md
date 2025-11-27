# Codebase Analysis Engine API

This API provides endpoints for analyzing legacy codebases.

## Endpoints

### POST /api/analyze

Start a new codebase analysis.

**Request Body:**

```json
{
  "sourceType": "github" | "zip",
  "sourceUrl": "https://github.com/user/repo",  // Required for GitHub
  "file": "<Buffer>",                            // Required for ZIP
  "name": "Project Name"                         // Optional
}
```

**Response (202 Accepted):**

```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "message": "Analysis started"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid source type, missing required fields, or upload failed
- `500 Internal Server Error` - Unexpected server error

---

### GET /api/analysis/:id

Get the status and details of an analysis.

**Parameters:**

- `id` - Project UUID

**Response (200 OK):**

```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Project Name",
  "sourceType": "github",
  "sourceUrl": "https://github.com/user/repo",
  "status": "completed",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:05:00.000Z",
  "analysis": {
    "id": "456e7890-e89b-12d3-a456-426614174000",
    "agentType": "analyzer",
    "createdAt": "2024-01-01T00:05:00.000Z",
    "hasResults": true
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid UUID format
- `404 Not Found` - Project not found
- `500 Internal Server Error` - Unexpected server error

---

### GET /api/report/:id

Get the full analysis report for a project.

**Parameters:**

- `id` - Project UUID

**Response (200 OK):**

```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Project Name",
  "sourceType": "github",
  "sourceUrl": "https://github.com/user/repo",
  "status": "completed",
  "report": {
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "completed",
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-01-01T00:05:00.000Z",
    "languages": {
      "languages": [
        {
          "name": "JavaScript",
          "percentage": 60.5,
          "lineCount": 5000
        },
        {
          "name": "TypeScript",
          "percentage": 39.5,
          "lineCount": 3267
        }
      ]
    },
    "frameworks": [
      {
        "name": "React",
        "version": "18.2.0",
        "confidence": 0.95
      }
    ],
    "dependencies": [
      {
        "name": "express",
        "version": "4.18.2",
        "type": "runtime"
      }
    ],
    "metrics": {
      "totalFiles": 150,
      "totalLines": 8267,
      "codeLines": 6500,
      "commentLines": 1000,
      "blankLines": 767,
      "averageComplexity": 4.2,
      "maintainabilityIndex": 78.5
    },
    "issues": [
      {
        "type": "long_function",
        "severity": "medium",
        "file": "src/utils/helper.js",
        "line": 42,
        "description": "Function exceeds 50 lines",
        "metadata": {
          "lineCount": 75
        }
      }
    ]
  }
}
```

**Response (202 Accepted):**

When analysis is still in progress:

```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "analyzing",
  "message": "Analysis is still in progress"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid UUID format
- `404 Not Found` - Project not found or no report available
- `500 Internal Server Error` - Unexpected server error

---

## Status Values

- `pending` - Analysis has been queued but not started
- `analyzing` - Analysis is currently in progress
- `completed` - Analysis completed successfully
- `failed` - Analysis failed with errors

## Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

---

### POST /api/generate-tests/:projectId

Generate tests for a function or class.

**Parameters:**

- `projectId` - Project UUID

**Request Body:**

```json
{
  "targetType": "function" | "class",
  "targetCode": {
    "name": "myFunction",
    "parameters": [
      {
        "name": "param1",
        "type": "string",
        "optional": false
      }
    ],
    "returnType": "string",
    "body": "function myFunction(param1) { return param1; }",
    "location": {
      "file": "src/utils.ts",
      "line": 10
    }
  },
  "framework": "jest" | "mocha" | "pytest" | "junit" | "rspec",
  "language": "typescript",
  "codeStyle": {
    "indentation": 2,
    "quotes": "single",
    "semicolons": true
  },
  "maxRetries": 3
}
```

**Response (200 OK):**

```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "analysisId": "456e7890-e89b-12d3-a456-426614174000",
  "status": "completed",
  "message": "Tests generated successfully",
  "testSuite": {
    "id": "test-1234567890-abc123",
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "targetFile": "src/utils.ts",
    "framework": "jest",
    "testCode": "describe('myFunction', () => { ... })",
    "testCases": [...],
    "mocks": [...],
    "coverageImprovement": 85,
    "status": "validated",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "warnings": [],
  "progress": [...]
}
```

**Error Responses:**

- `400 Bad Request` - Invalid parameters or missing required fields
- `404 Not Found` - Project not found
- `500 Internal Server Error` - Test generation failed

---

### GET /api/tests/:projectId

Retrieve generated tests for a project.

**Parameters:**

- `projectId` - Project UUID

**Query Parameters:**

- `targetFile` (optional) - Filter by target file

**Response (200 OK):**

```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Project Name",
  "testSuites": [
    {
      "id": "test-1234567890-abc123",
      "projectId": "123e4567-e89b-12d3-a456-426614174000",
      "targetFile": "src/utils.ts",
      "framework": "jest",
      "testCode": "describe('myFunction', () => { ... })",
      "testCases": [...],
      "mocks": [...],
      "coverageImprovement": 85,
      "status": "validated",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "statistics": {
    "totalTestSuites": 5,
    "totalTestCases": 42,
    "byFramework": {
      "jest": 5
    },
    "byStatus": {
      "validated": 4,
      "generated": 1
    },
    "averageCoverageImprovement": 78.5
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid UUID format
- `404 Not Found` - Project not found or no tests generated
- `500 Internal Server Error` - Unexpected server error

---

### GET /api/coverage/:projectId

Analyze test coverage for a project.

**Parameters:**

- `projectId` - Project UUID

**Response (200 OK):**

```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Project Name",
  "overallPercentage": 65.5,
  "byFile": {
    "src/utils.ts": 85,
    "src/helpers.ts": 70,
    "src/services.ts": 45
  },
  "untestedFiles": [
    "src/legacy.ts",
    "src/old-code.ts"
  ],
  "statistics": {
    "totalFiles": 10,
    "filesWithTests": 3,
    "filesWithoutTests": 7,
    "totalTestSuites": 5,
    "totalTestCases": 42,
    "averageCoverageImprovement": 78.5
  },
  "recommendations": [
    "7 files have no test coverage",
    "Consider generating tests for high-priority untested files",
    "Focus on critical paths and complex functions first"
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Invalid UUID format
- `404 Not Found` - Project not found or no analysis available
- `500 Internal Server Error` - Unexpected server error

---

## Example Usage

### Analyze a GitHub Repository

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "github",
    "sourceUrl": "https://github.com/expressjs/express",
    "name": "Express.js Analysis"
  }'
```

### Check Analysis Status

```bash
curl http://localhost:3000/api/analysis/123e4567-e89b-12d3-a456-426614174000
```

### Get Full Report

```bash
curl http://localhost:3000/api/report/123e4567-e89b-12d3-a456-426614174000
```

### Generate Tests for a Function

```bash
curl -X POST http://localhost:3000/api/generate-tests/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "function",
    "targetCode": {
      "name": "calculateTotal",
      "parameters": [
        {"name": "items", "type": "array", "optional": false},
        {"name": "taxRate", "type": "number", "optional": true}
      ],
      "returnType": "number",
      "body": "function calculateTotal(items, taxRate = 0) { ... }",
      "location": {"file": "src/utils.ts", "line": 10}
    },
    "framework": "jest",
    "language": "typescript"
  }'
```

### Get Generated Tests

```bash
curl http://localhost:3000/api/tests/123e4567-e89b-12d3-a456-426614174000
```

### Get Coverage Report

```bash
curl http://localhost:3000/api/coverage/123e4567-e89b-12d3-a456-426614174000
```
