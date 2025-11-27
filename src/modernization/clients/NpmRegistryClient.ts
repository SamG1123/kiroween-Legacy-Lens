import { getAPIConfig } from '../config';
import { getCacheClient } from './CacheClient';
import { VersionInfo } from '../types';
import { withRetry } from '../utils/RetryHandler';
import { getErrorHandler } from '../utils/ErrorHandler';
import { getFallbackDataProvider } from '../utils/FallbackDataProvider';

export class NpmRegistryClient {
  private baseUrl: string;
  private timeout: number;
  private cache = getCacheClient();
  private errorHandler = getErrorHandler();
  private fallbackProvider = getFallbackDataProvider();

  constructor() {
    const config = getAPIConfig();
    this.baseUrl = config.npm.registryUrl;
    this.timeout = config.npm.timeout;
  }

  async getPackageInfo(packageName: string): Promise<any> {
    const cacheKey = `npm:package:${packageName}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from registry with retry logic
    try {
      const data = await withRetry(
        () => this.fetchPackageInfo(packageName),
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          onRetry: (error, attempt) => {
            console.log(`Retrying npm registry request for ${packageName} (attempt ${attempt}): ${error.message}`);
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
        component: 'NpmRegistryClient',
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
    const url = `${this.baseUrl}/${packageName}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`NPM registry returned ${response.status} for ${packageName}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private getFallbackPackageInfo(packageName: string): any | null {
    const versionInfo = this.fallbackProvider.getVersionInfo(packageName, 'npm');
    if (!versionInfo) {
      return null;
    }

    // Construct minimal package info from fallback data
    return {
      'dist-tags': {
        latest: versionInfo.latest,
      },
      versions: versionInfo.allVersions.reduce((acc, version) => {
        acc[version] = { version };
        return acc;
      }, {} as Record<string, any>),
    };
  }

  async getLatestVersion(packageName: string): Promise<string> {
    try {
      const packageInfo = await this.getPackageInfo(packageName);
      return packageInfo['dist-tags']?.latest || '';
    } catch (error) {
      this.errorHandler.handleWarning(
        `Failed to get latest version for ${packageName}: ${(error as Error).message}`,
        {
          operation: 'getLatestVersion',
          component: 'NpmRegistryClient',
          packageName,
        }
      );
      return '';
    }
  }

  async getVersionInfo(packageName: string): Promise<VersionInfo> {
    const packageInfo = await this.getPackageInfo(packageName);
    const versions = Object.keys(packageInfo.versions || {});
    const latest = packageInfo['dist-tags']?.latest || '';

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
      const latest = info['dist-tags']?.latest || '';
      versions.set(packageName, latest);
    }

    return versions;
  }

  async getDeprecationInfo(packageName: string, version: string): Promise<{ deprecated: boolean; message?: string }> {
    const packageInfo = await this.getPackageInfo(packageName);
    const versionInfo = packageInfo.versions?.[version];
    
    if (versionInfo?.deprecated) {
      return {
        deprecated: true,
        message: versionInfo.deprecated,
      };
    }

    return { deprecated: false };
  }
}
