import { getAPIConfig } from '../config';
import { getCacheClient } from './CacheClient';
import { VersionInfo } from '../types';
import { withRetry } from '../utils/RetryHandler';
import { getErrorHandler } from '../utils/ErrorHandler';
import { getFallbackDataProvider } from '../utils/FallbackDataProvider';

export class MavenClient {
  private baseUrl: string;
  private timeout: number;
  private cache = getCacheClient();
  private errorHandler = getErrorHandler();
  private fallbackProvider = getFallbackDataProvider();

  constructor() {
    const config = getAPIConfig();
    this.baseUrl = config.maven.centralUrl;
    this.timeout = config.maven.timeout;
  }

  async searchArtifact(groupId: string, artifactId: string): Promise<any> {
    const cacheKey = `maven:artifact:${groupId}:${artifactId}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from Maven Central with retry logic
    try {
      const data = await withRetry(
        () => this.fetchArtifact(groupId, artifactId),
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          onRetry: (error, attempt) => {
            console.log(`Retrying Maven Central request for ${groupId}:${artifactId} (attempt ${attempt}): ${error.message}`);
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
        operation: 'searchArtifact',
        component: 'MavenClient',
        packageName: `${groupId}:${artifactId}`,
      }, 'Using fallback data if available');

      // Try fallback data
      const fallbackData = this.getFallbackArtifactInfo(groupId, artifactId);
      if (fallbackData) {
        return fallbackData;
      }

      throw error;
    }
  }

  private async fetchArtifact(groupId: string, artifactId: string): Promise<any> {
    const query = `q=g:"${groupId}"+AND+a:"${artifactId}"&rows=1&wt=json`;
    const url = `${this.baseUrl}?${query}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Maven Central returned ${response.status} for ${groupId}:${artifactId}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private getFallbackArtifactInfo(groupId: string, artifactId: string): any | null {
    const packageName = `${groupId}:${artifactId}`;
    const versionInfo = this.fallbackProvider.getVersionInfo(packageName, 'maven');
    if (!versionInfo) {
      return null;
    }

    // Construct minimal artifact info from fallback data
    return {
      response: {
        docs: [
          {
            latestVersion: versionInfo.latest,
            g: groupId,
            a: artifactId,
          },
        ],
      },
    };
  }

  async getLatestVersion(groupId: string, artifactId: string): Promise<string> {
    try {
      const result = await this.searchArtifact(groupId, artifactId);
      const docs = result.response?.docs || [];
      return docs[0]?.latestVersion || '';
    } catch (error) {
      this.errorHandler.handleWarning(
        `Failed to get latest version for ${groupId}:${artifactId}: ${(error as Error).message}`,
        {
          operation: 'getLatestVersion',
          component: 'MavenClient',
          packageName: `${groupId}:${artifactId}`,
        }
      );
      return '';
    }
  }

  async getVersionInfo(groupId: string, artifactId: string): Promise<VersionInfo> {
    const result = await this.searchArtifact(groupId, artifactId);
    const docs = result.response?.docs || [];
    const latest = docs[0]?.latestVersion || '';

    return {
      current: '', // Will be set by caller
      latest,
      latestStable: latest,
      allVersions: [], // Maven API doesn't easily provide all versions
    };
  }

  /**
   * Batch fetch artifact information for multiple artifacts
   * Fetches artifacts in parallel for improved performance
   */
  async searchArtifactBatch(artifacts: Array<{ groupId: string; artifactId: string }>): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    // Fetch all artifacts in parallel
    const promises = artifacts.map(async ({ groupId, artifactId }) => {
      try {
        const info = await this.searchArtifact(groupId, artifactId);
        return { key: `${groupId}:${artifactId}`, info, error: null };
      } catch (error) {
        return { key: `${groupId}:${artifactId}`, info: null, error };
      }
    });

    const settled = await Promise.all(promises);

    // Build results map
    for (const result of settled) {
      if (result.info) {
        results.set(result.key, result.info);
      } else {
        console.error(`Failed to fetch artifact ${result.key}:`, result.error);
      }
    }

    return results;
  }

  /**
   * Batch fetch latest versions for multiple artifacts
   */
  async getLatestVersionBatch(artifacts: Array<{ groupId: string; artifactId: string }>): Promise<Map<string, string>> {
    const artifactInfos = await this.searchArtifactBatch(artifacts);
    const versions = new Map<string, string>();

    for (const [key, info] of artifactInfos.entries()) {
      const docs = info.response?.docs || [];
      const latest = docs[0]?.latestVersion || '';
      versions.set(key, latest);
    }

    return versions;
  }
}
