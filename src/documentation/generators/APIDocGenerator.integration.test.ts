import { APIDocGenerator } from './APIDocGenerator';
import { APIEndpoint } from '../types';

describe('APIDocGenerator Integration', () => {
  let generator: APIDocGenerator;

  beforeEach(() => {
    generator = new APIDocGenerator();
  });

  it('should generate complete API documentation for a REST API', async () => {
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
          {
            name: 'offset',
            type: 'number',
            description: 'Number of users to skip',
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
                users: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: 'string',
                      name: 'string',
                      email: 'string',
                    },
                  },
                },
              },
            },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/users',
        handler: 'UserController.createUser',
        parameters: [],
        requestBody: {
          type: 'object',
          properties: {
            name: 'string',
            email: 'string',
            password: 'string',
          },
          required: ['name', 'email', 'password'],
        },
        responses: [
          {
            statusCode: 201,
            description: 'User created successfully',
            schema: {
              type: 'object',
              properties: {
                id: 'string',
                name: 'string',
                email: 'string',
              },
            },
          },
          {
            statusCode: 400,
            description: 'Invalid request data',
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/users/:id',
        handler: 'UserController.getUserById',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'User ID',
            optional: false,
          },
        ],
        responses: [
          {
            statusCode: 200,
            description: 'User found',
            schema: {
              type: 'object',
              properties: {
                id: 'string',
                name: 'string',
                email: 'string',
              },
            },
          },
          {
            statusCode: 404,
            description: 'User not found',
          },
        ],
      },
    ];

    const documentation = await generator.generate(endpoints);

    // Verify structure
    expect(documentation).toContain('# API Documentation');
    expect(documentation).toContain('## Overview');
    expect(documentation).toContain('## Endpoints');

    // Verify all endpoints are documented
    expect(documentation).toContain('`GET /api/users`');
    expect(documentation).toContain('`POST /api/users`');
    expect(documentation).toContain('`GET /api/users/:id`');

    // Verify parameters are documented
    expect(documentation).toContain('limit');
    expect(documentation).toContain('offset');
    expect(documentation).toContain('id');

    // Verify request body is documented
    expect(documentation).toContain('### Request Body');
    expect(documentation).toContain('name');
    expect(documentation).toContain('email');
    expect(documentation).toContain('password');

    // Verify responses are documented
    expect(documentation).toContain('### Responses');
    expect(documentation).toContain('201 - User created successfully');
    expect(documentation).toContain('404 - User not found');

    // Verify examples are included
    expect(documentation).toContain('curl');
    expect(documentation).toContain('```json');
  });

  it('should generate valid OpenAPI specification', () => {
    const endpoints: APIEndpoint[] = [
      {
        method: 'GET',
        path: '/api/products',
        handler: 'ProductController.getProducts',
        parameters: [
          {
            name: 'category',
            type: 'string',
            optional: true,
          },
        ],
        responses: [
          {
            statusCode: 200,
            description: 'Products retrieved',
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/products',
        handler: 'ProductController.createProduct',
        parameters: [],
        requestBody: {
          type: 'object',
          properties: {
            name: 'string',
            price: 'number',
          },
          required: ['name', 'price'],
        },
        responses: [
          {
            statusCode: 201,
            description: 'Product created',
          },
        ],
      },
    ];

    const spec = generator.generateOpenAPISpec(endpoints);

    // Verify OpenAPI structure
    expect(spec).toHaveProperty('openapi', '3.0.0');
    expect(spec).toHaveProperty('info');
    expect(spec).toHaveProperty('paths');
    expect(spec).toHaveProperty('servers');

    const paths = (spec as any).paths;

    // Verify GET endpoint
    expect(paths).toHaveProperty('/api/products');
    expect(paths['/api/products']).toHaveProperty('get');
    expect(paths['/api/products'].get.parameters).toHaveLength(1);
    expect(paths['/api/products'].get.parameters[0].name).toBe('category');

    // Verify POST endpoint
    expect(paths['/api/products']).toHaveProperty('post');
    expect(paths['/api/products'].post).toHaveProperty('requestBody');
    expect(paths['/api/products'].post.requestBody.required).toBe(true);

    // Verify error responses are added
    expect(paths['/api/products'].get.responses).toHaveProperty('500');
    expect(paths['/api/products'].post.responses).toHaveProperty('500');
  });
});
