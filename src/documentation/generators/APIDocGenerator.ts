import { AIDocumentationEngine } from '../ai/AIDocumentationEngine';
import { APIEndpoint, Parameter, ResponseInfo, SchemaInfo } from '../types';

export class APIDocGenerator {
  private aiEngine: AIDocumentationEngine;

  constructor(aiEngine?: AIDocumentationEngine) {
    this.aiEngine = aiEngine || new AIDocumentationEngine();
  }

  /**
   * Generate complete API documentation for all endpoints
   */
  async generate(endpoints: APIEndpoint[]): Promise<string> {
    if (endpoints.length === 0) {
      return '# API Documentation\n\nNo API endpoints detected in this project.';
    }

    const sections: string[] = [];

    // Title
    sections.push('# API Documentation');
    sections.push('');

    // Overview
    sections.push('## Overview');
    sections.push('');
    sections.push(`This API provides ${endpoints.length} endpoint${endpoints.length !== 1 ? 's' : ''}.`);
    sections.push('');

    // Table of contents
    sections.push('## Endpoints');
    sections.push('');
    endpoints.forEach(endpoint => {
      const anchor = this.createAnchor(endpoint.method, endpoint.path);
      sections.push(`- [\`${endpoint.method} ${endpoint.path}\`](#${anchor})`);
    });
    sections.push('');

    // Detailed endpoint documentation
    sections.push('---');
    sections.push('');

    for (const endpoint of endpoints) {
      const endpointDoc = await this.generateEndpointDoc(endpoint);
      sections.push(endpointDoc);
      sections.push('');
      sections.push('---');
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Generate documentation for a single endpoint using AI
   */
  async generateEndpointDoc(endpoint: APIEndpoint): Promise<string> {
    const sections: string[] = [];

    // Endpoint header
    const anchor = this.createAnchor(endpoint.method, endpoint.path);
    sections.push(`## <a id="${anchor}"></a>\`${endpoint.method} ${endpoint.path}\``);
    sections.push('');

    // Generate AI-powered description
    try {
      const description = await this.generateEndpointDescription(endpoint);
      sections.push(description);
      sections.push('');
    } catch (error) {
      // Fallback to basic description
      sections.push(`Endpoint handler: \`${endpoint.handler}\``);
      sections.push('');
    }

    // Parameters section
    if (endpoint.parameters.length > 0) {
      sections.push('### Parameters');
      sections.push('');
      sections.push(this.formatParametersTable(endpoint.parameters));
      sections.push('');
    }

    // Request body section
    if (endpoint.requestBody) {
      sections.push('### Request Body');
      sections.push('');
      sections.push(this.formatSchema(endpoint.requestBody));
      sections.push('');
      sections.push('**Example:**');
      sections.push('');
      sections.push(this.generateRequestExample(endpoint));
      sections.push('');
    }

    // Responses section
    if (endpoint.responses.length > 0) {
      sections.push('### Responses');
      sections.push('');
      
      for (const response of endpoint.responses) {
        sections.push(`#### ${response.statusCode} - ${response.description}`);
        sections.push('');
        
        if (response.schema) {
          sections.push(this.formatSchema(response.schema));
          sections.push('');
        }
        
        sections.push('**Example:**');
        sections.push('');
        sections.push(this.generateResponseExample(endpoint, response));
        sections.push('');
      }
    }

    return sections.join('\n');
  }

  /**
   * Generate request example
   */
  generateRequestExample(endpoint: APIEndpoint): string {
    const lines: string[] = [];
    
    lines.push('```bash');
    
    // Build curl command
    let curlCommand = `curl -X ${endpoint.method}`;
    
    // Add URL with path parameters replaced
    let url = endpoint.path;
    endpoint.parameters
      .filter(p => this.isPathParameter(p, endpoint.path))
      .forEach(p => {
        url = url.replace(`:${p.name}`, `{${p.name}}`);
      });
    
    curlCommand += ` "https://api.example.com${url}`;
    
    // Add query parameters
    const queryParams = endpoint.parameters.filter(p => !this.isPathParameter(p, endpoint.path));
    if (queryParams.length > 0) {
      const queryString = queryParams
        .map(p => `${p.name}=${this.getExampleValue(p)}`)
        .join('&');
      curlCommand += `?${queryString}`;
    }
    
    curlCommand += '"';
    
    // Add headers
    if (endpoint.requestBody) {
      lines.push(curlCommand + ' \\');
      lines.push('  -H "Content-Type: application/json" \\');
      
      // Add request body
      const bodyExample = this.generateBodyExample(endpoint.requestBody);
      lines.push(`  -d '${bodyExample}'`);
    } else {
      lines.push(curlCommand);
    }
    
    lines.push('```');
    
    return lines.join('\n');
  }

  /**
   * Generate response example
   */
  generateResponseExample(endpoint: APIEndpoint, response?: ResponseInfo): string {
    const lines: string[] = [];
    
    lines.push('```json');
    
    if (response && response.schema) {
      lines.push(this.generateBodyExample(response.schema));
    } else {
      // Default success response
      lines.push(JSON.stringify({
        success: true,
        message: 'Operation completed successfully'
      }, null, 2));
    }
    
    lines.push('```');
    
    return lines.join('\n');
  }

  /**
   * Generate OpenAPI specification (optional)
   */
  generateOpenAPISpec(endpoints: APIEndpoint[]): object {
    const paths: Record<string, any> = {};

    endpoints.forEach(endpoint => {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      const operation: any = {
        summary: `${endpoint.method} ${endpoint.path}`,
        operationId: this.generateOperationId(endpoint),
        parameters: [],
        responses: {},
      };

      // Add parameters
      endpoint.parameters.forEach(param => {
        const paramLocation = this.isPathParameter(param, endpoint.path) ? 'path' : 'query';
        operation.parameters.push({
          name: param.name,
          in: paramLocation,
          required: paramLocation === 'path' || !param.optional,
          schema: {
            type: this.mapTypeToOpenAPI(param.type),
          },
          description: param.description || '',
        });
      });

      // Add request body
      if (endpoint.requestBody) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: this.convertSchemaToOpenAPI(endpoint.requestBody),
            },
          },
        };
      }

      // Add responses
      endpoint.responses.forEach(response => {
        operation.responses[response.statusCode] = {
          description: response.description,
          content: response.schema ? {
            'application/json': {
              schema: this.convertSchemaToOpenAPI(response.schema),
            },
          } : undefined,
        };
      });

      // Add default error response if not present
      if (!operation.responses['500']) {
        operation.responses['500'] = {
          description: 'Internal server error',
        };
      }

      paths[endpoint.path][endpoint.method.toLowerCase()] = operation;
    });

    return {
      openapi: '3.0.0',
      info: {
        title: 'API Documentation',
        version: '1.0.0',
        description: 'Auto-generated API documentation',
      },
      servers: [
        {
          url: 'https://api.example.com',
          description: 'Production server',
        },
      ],
      paths,
    };
  }

  /**
   * Generate AI-powered endpoint description
   */
  private async generateEndpointDescription(endpoint: APIEndpoint): Promise<string> {
    const context = {
      method: endpoint.method,
      path: endpoint.path,
      handler: endpoint.handler,
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      responses: endpoint.responses,
    };

    // Use a simple description based on the endpoint
    // In a full implementation with AI, this would call the AI engine
    const action = this.inferActionFromMethod(endpoint.method);
    const resource = this.extractResourceFromPath(endpoint.path);
    
    return `${action} ${resource}. Handler: \`${endpoint.handler}\`.`;
  }

  /**
   * Infer action verb from HTTP method
   */
  private inferActionFromMethod(method: string): string {
    const actions: Record<string, string> = {
      GET: 'Retrieves',
      POST: 'Creates',
      PUT: 'Updates',
      PATCH: 'Partially updates',
      DELETE: 'Deletes',
    };
    return actions[method.toUpperCase()] || 'Handles';
  }

  /**
   * Extract resource name from path
   */
  private extractResourceFromPath(path: string): string {
    const parts = path.split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{'));
    const resource = parts[parts.length - 1] || 'resource';
    return resource;
  }

  /**
   * Format parameters as a markdown table
   */
  private formatParametersTable(parameters: Parameter[]): string {
    const lines: string[] = [];
    
    lines.push('| Name | Type | Required | Description |');
    lines.push('|------|------|----------|-------------|');
    
    parameters.forEach(param => {
      const required = param.optional ? 'No' : 'Yes';
      const description = param.description || '-';
      const type = param.type || 'any';
      
      lines.push(`| \`${param.name}\` | ${type} | ${required} | ${description} |`);
    });
    
    return lines.join('\n');
  }

  /**
   * Format schema information
   */
  private formatSchema(schema: SchemaInfo): string {
    const lines: string[] = [];
    
    lines.push('```json');
    lines.push('{');
    
    const properties = Object.entries(schema.properties);
    properties.forEach(([key, value], index) => {
      const isRequired = schema.required?.includes(key);
      const comment = isRequired ? ' // required' : '';
      const comma = index < properties.length - 1 ? ',' : '';
      
      if (typeof value === 'object' && value !== null) {
        lines.push(`  "${key}": ${JSON.stringify(value)}${comma}${comment}`);
      } else {
        lines.push(`  "${key}": "${value}"${comma}${comment}`);
      }
    });
    
    lines.push('}');
    lines.push('```');
    
    return lines.join('\n');
  }

  /**
   * Generate example body from schema
   */
  private generateBodyExample(schema: SchemaInfo): string {
    const example: Record<string, any> = {};
    
    Object.entries(schema.properties).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && 'type' in value) {
        example[key] = this.getExampleValueForType(value.type);
      } else {
        example[key] = value;
      }
    });
    
    return JSON.stringify(example, null, 2);
  }

  /**
   * Get example value for a parameter
   */
  private getExampleValue(param: Parameter): string {
    if (param.type) {
      return this.getExampleValueForType(param.type);
    }
    return 'example';
  }

  /**
   * Get example value based on type
   */
  private getExampleValueForType(type: string): any {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('string') || lowerType.includes('text')) {
      return 'example';
    }
    if (lowerType.includes('number') || lowerType.includes('int')) {
      return 123;
    }
    if (lowerType.includes('bool')) {
      return true;
    }
    if (lowerType.includes('array')) {
      return [];
    }
    if (lowerType.includes('object')) {
      return {};
    }
    if (lowerType.includes('date')) {
      return '2024-01-01T00:00:00Z';
    }
    
    return 'example';
  }

  /**
   * Check if parameter is a path parameter
   */
  private isPathParameter(param: Parameter, path: string): boolean {
    return path.includes(`:${param.name}`) || path.includes(`{${param.name}}`);
  }

  /**
   * Create anchor for table of contents
   */
  private createAnchor(method: string, path: string): string {
    return `${method.toLowerCase()}-${path.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
  }

  /**
   * Generate operation ID for OpenAPI
   */
  private generateOperationId(endpoint: APIEndpoint): string {
    const pathParts = endpoint.path.split('/').filter(p => p && !p.startsWith(':'));
    const resource = pathParts[pathParts.length - 1] || 'root';
    return `${endpoint.method.toLowerCase()}${resource.charAt(0).toUpperCase()}${resource.slice(1)}`;
  }

  /**
   * Map type to OpenAPI type
   */
  private mapTypeToOpenAPI(type: string | null): string {
    if (!type) return 'string';
    
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('string') || lowerType.includes('text')) {
      return 'string';
    }
    if (lowerType.includes('number') || lowerType.includes('float') || lowerType.includes('double')) {
      return 'number';
    }
    if (lowerType.includes('int')) {
      return 'integer';
    }
    if (lowerType.includes('bool')) {
      return 'boolean';
    }
    if (lowerType.includes('array')) {
      return 'array';
    }
    if (lowerType.includes('object')) {
      return 'object';
    }
    
    return 'string';
  }

  /**
   * Convert schema to OpenAPI format
   */
  private convertSchemaToOpenAPI(schema: SchemaInfo): any {
    const openAPISchema: any = {
      type: schema.type || 'object',
      properties: {},
    };

    if (schema.required && schema.required.length > 0) {
      openAPISchema.required = schema.required;
    }

    Object.entries(schema.properties).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && 'type' in value) {
        openAPISchema.properties[key] = {
          type: this.mapTypeToOpenAPI(value.type),
        };
      } else {
        openAPISchema.properties[key] = {
          type: typeof value,
        };
      }
    });

    return openAPISchema;
  }
}
