import { APIDocGenerator } from './APIDocGenerator';
import { APIEndpoint, Parameter, ResponseInfo, SchemaInfo } from '../types';

describe('APIDocGenerator', () => {
  let generator: APIDocGenerator;

  beforeEach(() => {
    generator = new APIDocGenerator();
  });

  describe('generate', () => {
    it('should generate documentation for empty endpoint list', async () => {
      const result = await generator.generate([]);
      
      expect(result).toContain('# API Documentation');
      expect(result).toContain('No API endpoints detected');
    });

    it('should generate documentation with table of contents', async () => {
      const endpoints: APIEndpoint[] = [
        {
          method: 'GET',
          path: '/api/users',
          handler: 'getUsers',
          parameters: [],
          responses: [],
        },
        {
          method: 'POST',
          path: '/api/users',
          handler: 'createUser',
          parameters: [],
          responses: [],
        },
      ];

      const result = await generator.generate(endpoints);
      
      expect(result).toContain('# API Documentation');
      expect(result).toContain('## Endpoints');
      expect(result).toContain('`GET /api/users`');
      expect(result).toContain('`POST /api/users`');
    });
  });

  describe('generateEndpointDoc', () => {
    it('should generate basic endpoint documentation', async () => {
      const endpoint: APIEndpoint = {
        method: 'GET',
        path: '/api/users/:id',
        handler: 'getUserById',
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
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                id: 'string',
                name: 'string',
              },
            },
          },
        ],
      };

      const result = await generator.generateEndpointDoc(endpoint);
      
      expect(result).toContain('`GET /api/users/:id`');
      expect(result).toContain('### Parameters');
      expect(result).toContain('id');
      expect(result).toContain('### Responses');
      expect(result).toContain('200 - Success');
    });

    it('should include request body documentation', async () => {
      const endpoint: APIEndpoint = {
        method: 'POST',
        path: '/api/users',
        handler: 'createUser',
        parameters: [],
        requestBody: {
          type: 'object',
          properties: {
            name: 'string',
            email: 'string',
          },
          required: ['name', 'email'],
        },
        responses: [],
      };

      const result = await generator.generateEndpointDoc(endpoint);
      
      expect(result).toContain('### Request Body');
      expect(result).toContain('name');
      expect(result).toContain('email');
    });

    it('should generate description based on endpoint', async () => {
      const endpoint: APIEndpoint = {
        method: 'GET',
        path: '/api/test',
        handler: 'testHandler',
        parameters: [],
        responses: [],
      };

      const result = await generator.generateEndpointDoc(endpoint);
      
      expect(result).toContain('`GET /api/test`');
      expect(result).toContain('testHandler');
      expect(result).toContain('Retrieves');
    });
  });

  describe('generateRequestExample', () => {
    it('should generate curl command for GET request', () => {
      const endpoint: APIEndpoint = {
        method: 'GET',
        path: '/api/users',
        handler: 'getUsers',
        parameters: [
          {
            name: 'limit',
            type: 'number',
            optional: true,
          },
        ],
        responses: [],
      };

      const result = generator.generateRequestExample(endpoint);
      
      expect(result).toContain('curl -X GET');
      expect(result).toContain('/api/users');
      expect(result).toContain('limit=');
    });

    it('should generate curl command with request body', () => {
      const endpoint: APIEndpoint = {
        method: 'POST',
        path: '/api/users',
        handler: 'createUser',
        parameters: [],
        requestBody: {
          type: 'object',
          properties: {
            name: 'string',
            email: 'string',
          },
        },
        responses: [],
      };

      const result = generator.generateRequestExample(endpoint);
      
      expect(result).toContain('curl -X POST');
      expect(result).toContain('Content-Type: application/json');
      expect(result).toContain('-d');
      expect(result).toContain('name');
      expect(result).toContain('email');
    });

    it('should handle path parameters', () => {
      const endpoint: APIEndpoint = {
        method: 'GET',
        path: '/api/users/:id',
        handler: 'getUserById',
        parameters: [
          {
            name: 'id',
            type: 'string',
          },
        ],
        responses: [],
      };

      const result = generator.generateRequestExample(endpoint);
      
      expect(result).toContain('/api/users/{id}');
    });
  });

  describe('generateResponseExample', () => {
    it('should generate response with schema', () => {
      const endpoint: APIEndpoint = {
        method: 'GET',
        path: '/api/users',
        handler: 'getUsers',
        parameters: [],
        responses: [],
      };

      const response: ResponseInfo = {
        statusCode: 200,
        description: 'Success',
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
      };

      const result = generator.generateResponseExample(endpoint, response);
      
      expect(result).toContain('```json');
      expect(result).toContain('id');
      expect(result).toContain('name');
    });

    it('should generate default response without schema', () => {
      const endpoint: APIEndpoint = {
        method: 'DELETE',
        path: '/api/users/:id',
        handler: 'deleteUser',
        parameters: [],
        responses: [],
      };

      const result = generator.generateResponseExample(endpoint);
      
      expect(result).toContain('```json');
      expect(result).toContain('success');
    });
  });

  describe('generateOpenAPISpec', () => {
    it('should generate valid OpenAPI 3.0 specification', () => {
      const endpoints: APIEndpoint[] = [
        {
          method: 'GET',
          path: '/api/users',
          handler: 'getUsers',
          parameters: [
            {
              name: 'limit',
              type: 'number',
              optional: true,
            },
          ],
          responses: [
            {
              statusCode: 200,
              description: 'Success',
            },
          ],
        },
      ];

      const spec = generator.generateOpenAPISpec(endpoints);
      
      expect(spec).toHaveProperty('openapi', '3.0.0');
      expect(spec).toHaveProperty('info');
      expect(spec).toHaveProperty('paths');
      expect(spec).toHaveProperty('servers');
      
      const paths = (spec as any).paths;
      expect(paths).toHaveProperty('/api/users');
      expect(paths['/api/users']).toHaveProperty('get');
    });

    it('should include request body in OpenAPI spec', () => {
      const endpoints: APIEndpoint[] = [
        {
          method: 'POST',
          path: '/api/users',
          handler: 'createUser',
          parameters: [],
          requestBody: {
            type: 'object',
            properties: {
              name: 'string',
              email: 'string',
            },
            required: ['name'],
          },
          responses: [],
        },
      ];

      const spec = generator.generateOpenAPISpec(endpoints);
      const paths = (spec as any).paths;
      
      expect(paths['/api/users'].post).toHaveProperty('requestBody');
      expect(paths['/api/users'].post.requestBody).toHaveProperty('required', true);
    });

    it('should add default error response', () => {
      const endpoints: APIEndpoint[] = [
        {
          method: 'GET',
          path: '/api/test',
          handler: 'test',
          parameters: [],
          responses: [
            {
              statusCode: 200,
              description: 'Success',
            },
          ],
        },
      ];

      const spec = generator.generateOpenAPISpec(endpoints);
      const paths = (spec as any).paths;
      
      expect(paths['/api/test'].get.responses).toHaveProperty('500');
    });
  });
});
