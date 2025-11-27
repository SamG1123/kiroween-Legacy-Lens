# Modernization Advisor

The Modernization Advisor analyzes legacy codebases to identify outdated dependencies, frameworks, and patterns, then provides actionable recommendations for modernization.

## Directory Structure

```
src/modernization/
├── analyzers/          # Analysis components
│   ├── DependencyAnalyzer.ts
│   ├── FrameworkAnalyzer.ts
│   └── PatternAnalyzer.ts
├── engines/            # Recommendation and compatibility engines
│   ├── RecommendationEngine.ts
│   ├── PriorityRanker.ts
│   └── CompatibilityChecker.ts
├── generators/         # Report and roadmap generators
│   ├── RoadmapGenerator.ts
│   └── ModernizationReportGenerator.ts
├── clients/            # External API clients
│   ├── NpmRegistryClient.ts
│   ├── PyPIClient.ts
│   ├── MavenClient.ts
│   ├── SecurityDatabaseClient.ts
│   └── CacheClient.ts
├── config/             # Configuration
│   └── api-config.ts
└── types/              # TypeScript type definitions
    └── index.ts
```

## Dependencies

### Core Dependencies
- **semver**: Semantic version parsing and comparison
- **redis**: Caching layer for API responses
- **@babel/parser**: JavaScript/TypeScript AST parsing
- **tree-sitter**: Multi-language AST parsing
- **esprima**: JavaScript parsing
- **acorn**: JavaScript parser

### Testing
- **jest**: Unit testing framework
- **fast-check**: Property-based testing library

## External APIs

### Package Registries
- **npm Registry**: https://registry.npmjs.org
- **PyPI**: https://pypi.org/pypi
- **Maven Central**: https://search.maven.org

### Security Databases
- **OSV (Open Source Vulnerabilities)**: https://api.osv.dev/v1
- **GitHub Advisory Database**: https://api.github.com/advisories
- **Snyk** (optional): Requires API key

## Configuration

Configuration is managed through environment variables. See `.env.example` for available options:

```env
# NPM Registry
NPM_REGISTRY_URL=https://registry.npmjs.org
NPM_TIMEOUT=10000

# PyPI
PYPI_API_URL=https://pypi.org/pypi
PYPI_TIMEOUT=10000

# Maven Central
MAVEN_CENTRAL_URL=https://search.maven.org/solrsearch/select
MAVEN_TIMEOUT=10000

# Security Databases
OSV_API_URL=https://api.osv.dev/v1
GITHUB_ADVISORY_URL=https://api.github.com/advisories
SNYK_API_URL=https://snyk.io/api/v1
SNYK_API_KEY=your_api_key_here
SECURITY_TIMEOUT=15000

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Cache Strategy

The system uses Redis for caching external API responses:

- **Package Metadata**: 24 hours
- **Security Data**: 6 hours
- **Migration Guides**: 7 days

## Usage

```typescript
import { DependencyAnalyzer } from './modernization/analyzers';
import { getCacheClient } from './modernization/clients';

// Initialize cache
const cache = getCacheClient();
await cache.connect();

// Analyze dependencies
const analyzer = new DependencyAnalyzer();
const results = await analyzer.analyzeDependencies(dependencies);

// Clean up
await cache.disconnect();
```

## Testing

Run tests with:
```bash
npm test
```

Run property-based tests:
```bash
npm test -- --testNamePattern="Property"
```

## Implementation Status

- [x] Project structure created
- [x] Type definitions
- [x] Configuration system
- [x] Cache client (Redis)
- [x] NPM Registry client
- [x] PyPI client
- [x] Maven client
- [x] Security database client
- [ ] Dependency analyzer
- [ ] Framework analyzer
- [ ] Pattern analyzer
- [ ] Recommendation engine
- [ ] Priority ranker
- [ ] Compatibility checker
- [ ] Roadmap generator
- [ ] Report generator
