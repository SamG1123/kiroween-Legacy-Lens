# APIDocGenerator

The `APIDocGenerator` class automatically generates comprehensive API documentation from endpoint definitions. It creates markdown documentation with examples and can also generate OpenAPI 3.0 specifications.

## Features

- **Markdown Documentation**: Generates well-structured API documentation in markdown format
- **Table of Contents**: Automatically creates a navigable table of contents
- **Request Examples**: Generates curl command examples for each endpoint
- **Response Examples**: Provides JSON response examples
- **Parameter Documentation**: Documents all path, query, and body parameters
- **OpenAPI Support**: Optionally generates OpenAPI 3.0 specifications
- **Multiple Response Codes**: Documents all possible response status codes

## Usage

### Basic Usage

```typescript
import { APIDocGenerator } from './generators/APIDocGenerator';
import { APIEndpoint } from './types';

const generator = new APIDocGenerator();

const endpoints: APIEndpoint[] = [
  {
    method: 'GET',
    path: '/api/users',
    handler: 'UserController.getUsers',
    parameters: [
      {
        name: 'limit',
        type: 'number',
        description: 'Maximum number of users to return',
        optional: true,
      },
    ],
    responses: [
      {
        statusCode: 200,
        description: 'Successfully retrieved users',
        schema: {
          type: 'array',
          properties: {
            users: 'array',
          },
        },
      },
    ],
  },
];

// Generate markdown documentation
const documentation = await generator.generate(endpoints);
console.log(documentation);
```

### Generating OpenAPI Specification

```typescript
const openAPISpec = generator.generateOpenAPISpec(endpoints);

// Save to file or serve via API
fs.writeFileSync('openapi.json', JSON.stringify(openAPISpec, null, 2));
```

## API Reference

### `generate(endpoints: APIEndpoint[]): Promise<string>`

Generates complete API documentation in markdown format.

**Parameters:**
- `endpoints`: Array of API endpoint definitions

**Returns:** Promise resolving to markdown string

### `generateEndpointDoc(endpoint: APIEndpoint): Promise<string>`

Generates documentation for a single endpoint.

**Parameters:**
- `endpoint`: Single API endpoint definition

**Returns:** Promise resolving to markdown string for the endpoint

### `generateRequestExample(endpoint: APIEndpoint): string`

Generates a curl command example for the endpoint.

**Parameters:**
- `endpoint`: API endpoint definition

**Returns:** Markdown-formatted curl example

### `generateResponseExample(endpoint: APIEndpoint, response?: ResponseInfo): string`

Generates a JSON response example.

**Parameters:**
- `endpoint`: API endpoint definition
- `response`: Optional specific response to generate example for

**Returns:** Markdown-formatted JSON example

### `generateOpenAPISpec(endpoints: APIEndpoint[]): object`

Generates an OpenAPI 3.0 specification.

**Parameters:**
- `endpoints`: Array of API endpoint definitions

**Returns:** OpenAPI specification object

## Endpoint Definition Format

```typescript
interface APIEndpoint {
  method: string;              // HTTP method (GET, POST, PUT, DELETE, etc.)
  path: string;                // URL path (e.g., '/api/users/:id')
  handler: string;             // Handler function name
  parameters: Parameter[];     // Path and query parameters
  requestBody?: SchemaInfo;    // Request body schema (for POST/PUT)
  responses: ResponseInfo[];   // Possible responses
}
```

## Example Output

The generator produces documentation like this:

```markdown
# API Documentation

## Overview

This API provides 2 endpoints.

## Endpoints

- [`GET /api/users`](#get-api-users)
- [`POST /api/users`](#post-api-users)

---

## <a id="get-api-users"></a>`GET /api/users`

Retrieves users.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `limit` | number | No | Maximum number of users to return |

### Responses

#### 200 - Successfully retrieved users

**Example:**

```json
{
  "users": []
}
```

---
```

## Integration with Other Components

The APIDocGenerator integrates with:

- **CodeParser**: Extracts API endpoint definitions from source code
- **AIDocumentationEngine**: Generates natural language descriptions (optional)
- **DocumentationPackager**: Packages API docs with other documentation

## Requirements Satisfied

This implementation satisfies the following requirements:

- **4.1**: Creates api.md file for detected endpoints
- **4.2**: Documents HTTP method and path
- **4.3**: Documents request parameters and body schema
- **4.4**: Documents response formats and status codes
- **4.5**: Includes example requests and responses

## Testing

The APIDocGenerator includes comprehensive unit tests and integration tests:

```bash
npm test -- APIDocGenerator.test.ts
npm test -- APIDocGenerator.integration.test.ts
```

## Future Enhancements

Potential improvements:

- AI-powered endpoint descriptions (currently uses simple inference)
- Authentication/authorization documentation
- Rate limiting documentation
- Webhook documentation
- GraphQL schema support
