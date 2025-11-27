import { getAPIConfig } from '../config';
import { getCacheClient } from './CacheClient';
import { Vulnerability } from '../types';
import { withRetry } from '../utils/RetryHandler';
import { getErrorHandler } from '../utils/ErrorHandler';
import { getFallbackDataProvider } from '../utils/FallbackDataProvider';

export class SecurityDatabaseClient {
  private osvApiUrl: string;
  private githubAdvisoryUrl: string;
  private snykApiUrl?: string;
  private snykApiKey?: string;
  private timeout: number;
  private cache = getCacheClient();
  private errorHandler = getErrorHandler();
  private fallbackProvider = getFallbackDataProvider();

  constructor() {
    const config = getAPIConfig();
    this.osvApiUrl = config.security.osvApiUrl;
    this.githubAdvisoryUrl = config.security.githubAdvisoryUrl;
    this.snykApiUrl = config.security.snykApiUrl;
    this.snykApiKey = config.security.snykApiKey;
    this.timeout = config.security.timeout;
  }

  async checkVulnerabilities(
    packageName: string,
    version: string,
    ecosystem: 'npm' | 'pypi' | 'maven'
  ): Promise<Vulnerability[]> {
    const cacheKey = `security:${ecosystem}:${packageName}:${version}`;
    
    // Try cache first
    const cached = await this.cache.get<Vulnerability[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query OSV database with retry logic
    try {
      const vulnerabilities = await withRetry(
        () => this.queryOSV(packageName, version, ecosystem),
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          onRetry: (error, attempt) => {
            console.log(`Retrying OSV query for ${packageName}@${version} (attempt ${attempt}): ${error.message}`);
          },
        }
      );
      
      // Cache the result
      const config = getAPIConfig();
      await this.cache.set(cacheKey, vulnerabilities, config.cache.ttl.securityData);
      
      return vulnerabilities;
    } catch (error) {
      // Handle error with graceful degradation
      this.errorHandler.handleError(error as Error, {
        operation: 'checkVulnerabilities',
        component: 'SecurityDatabaseClient',
        packageName: `${packageName}@${version}`,
      }, 'Using fallback vulnerability data if available');

      // Try fallback data
      const fallbackVulns = this.fallbackProvider.getVulnerabilities(packageName, version, ecosystem);
      if (fallbackVulns.length > 0) {
        return fallbackVulns;
      }

      // Return empty array instead of throwing - graceful degradation
      return [];
    }
  }

  private async queryOSV(
    packageName: string,
    version: string,
    ecosystem: 'npm' | 'pypi' | 'maven'
  ): Promise<Vulnerability[]> {
    const ecosystemMap = {
      npm: 'npm',
      pypi: 'PyPI',
      maven: 'Maven',
    };

    const url = `${this.osvApiUrl}/query`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package: {
            name: packageName,
            ecosystem: ecosystemMap[ecosystem],
          },
          version,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OSV API returned ${response.status} for ${packageName}`);
      }

      const data = await response.json() as any;
      const vulns = data.vulns || [];

      return vulns.map((vuln: any) => ({
        id: vuln.id,
        severity: this.mapSeverity(vuln.severity),
        description: vuln.summary || vuln.details || 'No description available',
        fixedIn: this.extractFixedVersion(vuln),
        publishedDate: vuln.published ? new Date(vuln.published) : undefined,
        references: vuln.references?.map((ref: any) => ref.url) || [],
      }));
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private mapSeverity(severity: any): 'critical' | 'high' | 'medium' | 'low' {
    if (!severity) return 'medium';
    
    const score = severity[0]?.score;
    if (!score) return 'medium';

    // CVSS score mapping
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }

  private extractFixedVersion(vuln: any): string {
    // Try to extract fixed version from affected ranges
    const affected = vuln.affected || [];
    for (const pkg of affected) {
      const ranges = pkg.ranges || [];
      for (const range of ranges) {
        const events = range.events || [];
        for (const event of events) {
          if (event.fixed) {
            return event.fixed;
          }
        }
      }
    }
    return 'unknown';
  }

  async checkGitHubAdvisories(packageName: string, ecosystem: string): Promise<Vulnerability[]> {
    // GitHub Advisory Database query
    // This is a simplified implementation
    const cacheKey = `github:advisory:${ecosystem}:${packageName}`;
    
    const cached = await this.cache.get<Vulnerability[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // In a real implementation, this would query GitHub's GraphQL API
    // For now, return empty array
    return [];
  }

  /**
   * Batch check vulnerabilities for multiple packages
   * Processes packages in parallel for improved performance
   */
  async checkVulnerabilitiesBatch(
    packages: Array<{ name: string; version: string; ecosystem: 'npm' | 'pypi' | 'maven' }>
  ): Promise<Map<string, Vulnerability[]>> {
    const results = new Map<string, Vulnerability[]>();

    // Check all packages in parallel
    const promises = packages.map(async (pkg) => {
      try {
        const vulnerabilities = await this.checkVulnerabilities(pkg.name, pkg.version, pkg.ecosystem);
        return { key: `${pkg.ecosystem}:${pkg.name}:${pkg.version}`, vulnerabilities, error: null };
      } catch (error) {
        return { key: `${pkg.ecosystem}:${pkg.name}:${pkg.version}`, vulnerabilities: [], error };
      }
    });

    const settled = await Promise.all(promises);

    // Build results map
    for (const result of settled) {
      results.set(result.key, result.vulnerabilities);
      if (result.error) {
        console.error(`Failed to check vulnerabilities for ${result.key}:`, result.error);
      }
    }

    return results;
  }
}
