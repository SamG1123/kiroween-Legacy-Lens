/**
 * Example demonstrating APIDocGenerator usage
 * 
 * This example shows how to use the APIDocGenerator to create
 * comprehensive API documentation from endpoint definitions.
 */

import { APIDocGenerator } from '../APIDocGenerator';
import { APIEndpoint } from '../../types';

async function generateExampleAPIDocumentation() {
  // Create generator instance
  const generator = new APIDocGenerator();

  // Define API endpoints
  const endpoints: APIEndpoint[] = [
    {
      method: 'GET',
      path: '/api/v1/users',
      handler: 'UserController.listUsers',
      parameters: [
        {
          name: 'page',
          type: 'number',
          description: 'Page number for pagination',
          optional: true,
        },
        {
          name: 'limit',
          type: 'number',
          description: 'Number of items per page',
          optional: true,
        },
      ],
      responses: [
        {
          statusCode: 200,
          description: 'Successfully retrieved users',
          schema: {
            type: 'object',
            properties: {
              users: {
                type: 'array',
              },
              total: 'number',
              page: 'number',
            },
          },
        },
      ],
    },
    {
      method: 'POST',
      path: '/api/v1/users',
      handler: 'UserController.createUser',
      parameters: [],
      requestBody: {
        type: 'object',
        properties: {
          username: 'string',
          email: 'string',
          password: 'string',
        },
        required: ['username', 'email', 'password'],
      },
      responses: [
        {
          statusCode: 201,
          description: 'User created successfully',
          schema: {
            type: 'object',
            properties: {
              id: 'string',
              username: 'string',
              email: 'string',
              createdAt: 'string',
            },
          },
        },
        {
          statusCode: 400,
          description: 'Invalid request data',
        },
      ],
    },
  ];

  // Generate markdown documentation
  const markdownDoc = await generator.generate(endpoints);
  console.log('=== Generated API Documentation (Markdown) ===');
  console.log(markdownDoc);
  console.log('\n');

  // Generate OpenAPI specification
  const openAPISpec = generator.generateOpenAPISpec(endpoints);
  console.log('=== Generated OpenAPI Specification ===');
  console.log(JSON.stringify(openAPISpec, null, 2));
}

// Run the example
if (require.main === module) {
  generateExampleAPIDocumentation().catch(console.error);
}

export { generateExampleAPIDocumentation };
