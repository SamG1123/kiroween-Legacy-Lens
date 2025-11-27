import { getAPIConfig, defaultConfig } from './api-config';

describe('API Configuration', () => {
  it('should return default configuration', () => {
    const config = getAPIConfig();
    
    expect(config).toBeDefined();
    expect(config.npm).toBeDefined();
    expect(config.pypi).toBeDefined();
    expect(config.maven).toBeDefined();
    expect(config.security).toBeDefined();
    expect(config.cache).toBeDefined();
  });

  it('should have valid npm registry URL', () => {
    const config = getAPIConfig();
    
    expect(config.npm.registryUrl).toBe('https://registry.npmjs.org');
    expect(config.npm.timeout).toBeGreaterThan(0);
  });

  it('should have valid PyPI URL', () => {
    const config = getAPIConfig();
    
    expect(config.pypi.apiUrl).toBe('https://pypi.org/pypi');
    expect(config.pypi.timeout).toBeGreaterThan(0);
  });

  it('should have valid Maven Central URL', () => {
    const config = getAPIConfig();
    
    expect(config.maven.centralUrl).toBe('https://search.maven.org/solrsearch/select');
    expect(config.maven.timeout).toBeGreaterThan(0);
  });

  it('should have valid security database URLs', () => {
    const config = getAPIConfig();
    
    expect(config.security.osvApiUrl).toBe('https://api.osv.dev/v1');
    expect(config.security.githubAdvisoryUrl).toBe('https://api.github.com/advisories');
    expect(config.security.timeout).toBeGreaterThan(0);
  });

  it('should have valid cache configuration', () => {
    const config = getAPIConfig();
    
    expect(config.cache.redis.host).toBe('localhost');
    expect(config.cache.redis.port).toBe(6379);
    expect(config.cache.ttl.packageMetadata).toBe(24 * 60 * 60);
    expect(config.cache.ttl.securityData).toBe(6 * 60 * 60);
    expect(config.cache.ttl.migrationGuides).toBe(7 * 24 * 60 * 60);
  });
});
