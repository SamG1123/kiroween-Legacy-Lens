// Configuration for external API clients

export interface APIConfig {
  npm: {
    registryUrl: string;
    timeout: number;
  };
  pypi: {
    apiUrl: string;
    timeout: number;
  };
  maven: {
    centralUrl: string;
    timeout: number;
  };
  security: {
    snykApiUrl?: string;
    snykApiKey?: string;
    githubAdvisoryUrl: string;
    osvApiUrl: string;
    timeout: number;
  };
  cache: {
    redis: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
    ttl: {
      packageMetadata: number; // 24 hours in seconds
      securityData: number; // 6 hours in seconds
      migrationGuides: number; // 7 days in seconds
    };
  };
}

export const defaultConfig: APIConfig = {
  npm: {
    registryUrl: process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org',
    timeout: parseInt(process.env.NPM_TIMEOUT || '10000', 10),
  },
  pypi: {
    apiUrl: process.env.PYPI_API_URL || 'https://pypi.org/pypi',
    timeout: parseInt(process.env.PYPI_TIMEOUT || '10000', 10),
  },
  maven: {
    centralUrl: process.env.MAVEN_CENTRAL_URL || 'https://search.maven.org/solrsearch/select',
    timeout: parseInt(process.env.MAVEN_TIMEOUT || '10000', 10),
  },
  security: {
    snykApiUrl: process.env.SNYK_API_URL || 'https://snyk.io/api/v1',
    snykApiKey: process.env.SNYK_API_KEY,
    githubAdvisoryUrl: process.env.GITHUB_ADVISORY_URL || 'https://api.github.com/advisories',
    osvApiUrl: process.env.OSV_API_URL || 'https://api.osv.dev/v1',
    timeout: parseInt(process.env.SECURITY_TIMEOUT || '15000', 10),
  },
  cache: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    },
    ttl: {
      packageMetadata: 24 * 60 * 60, // 24 hours
      securityData: 6 * 60 * 60, // 6 hours
      migrationGuides: 7 * 24 * 60 * 60, // 7 days
    },
  },
};

export function getAPIConfig(): APIConfig {
  return defaultConfig;
}
