import { getAPIConfig } from '../config';
import { getCacheClient } from './CacheClient';
import { VersionInfo } from '../types';
import { withRetry } from '../utils/RetryHandler';
import { getErrorHandler } from '../utils/ErrorHandler';
import { getFallbackDataProvider } from '../utils/FallbackDataProvider';

export class PyPIClient {
  private baseUrl: string;
  private timeout: number;
  private cache = getCacheClient();
  private errorHandler = getErrorHandler();
  private fallbackProvider = getFallbackDataProvider();

  constructor() {
    const config = getAPIConfig();
    this.baseUrl = config.pypi.apiUrl;
    this.timeout = config.pypi.timeout;
  }

  async getPackageInfo(packageName: string): Promise<any> {
    const cacheKey = `pypi:package:${packageName}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from PyPI with retry logic
    try {
      const data = await withRetry(
        () => this.fetchPackageInfo(packageName),
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          onRetry: (error, attempt) => {
            console.log(`Retrying PyPI request for ${packageName} (attempt ${attempt}): ${error.message}`);
          },
        }
      );

      // Cache the result
      const config = getAPIConfig();
      await this.cache.set(cacheKey, data, config.cache.ttl.packageMetadata);
      
      return data;
    } catch (error) {
      // Handle error with graceful degradation
      this.errorHandler.handleError(error as Error, {
        operation: 'getPackageInfo',
        component: 'PyPIClient',
        packageName,
      }, 'Using fallback data if available');

      // Try fallback data
      const fallbackData = this.getFallbackPackageInfo(packageName);
      if (fallbackData) {
        return fallbackData;
      }

      throw error;
    }
  }

  private async fetchPackageInfo(packageName: string): Promise<any> {
    const url = `${this.baseUrl}/${packageName}/json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`PyPI returned ${response.status} for ${packageName}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private getFallbackPackageInfo(packageName: string): any | null {
    const versionInfo = this.fallbackProvider.getVersionInfo(packageName, 'pypi');
    if (!versionInfo) {
      return null;
    }

    // Construct minimal package info from fallback data
    return {
      info: {
        version: versionInfo.latest,
      },
      releases: versionInfo.allVersions.reduce((acc, version) => {
        acc[version] = [];
        return acc;
      }, {} as Record<string, any[]>),
    };
  }

  async getLatestVersion(packageName: string): Promise<string> {
    try {
      const packageInfo = await this.getPackageInfo(packageName);
      return packageInfo.info?.version || '';
    } catch (error) {
      this.errorHandler.handleWarning(
        `Failed to get latest version for ${packageName}: ${(error as Error).message}`,
        {
          operation: 'getLatestVersion',
          component: 'PyPIClient',
          packageName,
        }
      );
      return '';
    }
  }

  async getVersionInfo(packageName: string): Promise<VersionInfo> {
    const packageInfo = await this.getPackageInfo(packageName);
    const versions = Object.keys(packageInfo.releases || {});
    const latest = packageInfo.info?.version || '';

    return {
      current: '', // Will be set by caller
      latest,
      latestStable: latest,
      allVersions: versions,
    };
  }

  /**
   * Batch fetch package information for multiple packages
   * Fetches packages in parallel for improved performance
   */
  async getPackageInfoBatch(packageNames: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    // Fetch all packages in parallel
    const promises = packageNames.map(async (packageName) => {
      try {
        const info = await this.getPackageInfo(packageName);
        return { packageName, info, error: null };
      } catch (error) {
        return { packageName, info: null, error };
      }
    });

    const settled = await Promise.all(promises);

    // Build results map
    for (const result of settled) {
      if (result.info) {
        results.set(result.packageName, result.info);
      } else {
        console.error(`Failed to fetch package ${result.packageName}:`, result.error);
      }
    }

    return results;
  }

  /**
   * Batch fetch latest versions for multiple packages
   */
  async getLatestVersionBatch(packageNames: string[]): Promise<Map<string, string>> {
    const packageInfos = await this.getPackageInfoBatch(packageNames);
    const versions = new Map<string, string>();

    for (const [packageName, info] of packageInfos.entries()) {
      const latest = info.info?.version || '';
      versions.set(packageName, latest);
    }

    return versions;
  }
}
