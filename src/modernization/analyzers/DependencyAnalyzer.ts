import * as semver from 'semver';
import { NpmRegistryClient } from '../clients/NpmRegistryClient';
import { PyPIClient } from '../clients/PyPIClient';
import { MavenClient } from '../clients/MavenClient';
import { SecurityDatabaseClient } from '../clients/SecurityDatabaseClient';
import { IncrementalAnalysisManager } from '../utils/IncrementalAnalysisManager';
import {
  Dependency,
  DependencyAnalysis,
  VersionInfo,
  Vulnerability,
  DeprecationInfo,
  UpdateCategory,
} from '../types';

export class DependencyAnalyzer {
  private npmClient: NpmRegistryClient;
  private pypiClient: PyPIClient;
  private mavenClient: MavenClient;
  private securityClient: SecurityDatabaseClient;
  private incrementalManager: IncrementalAnalysisManager;

  constructor() {
    this.npmClient = new NpmRegistryClient();
    this.pypiClient = new PyPIClient();
    this.mavenClient = new MavenClient();
    this.securityClient = new SecurityDatabaseClient();
    this.incrementalManager = new IncrementalAnalysisManager();
  }

  /**
   * Analyze multiple dependencies and return analysis results
   * Uses parallel processing for improved performance
   */
  async analyzeDependencies(dependencies: Dependency[]): Promise<DependencyAnalysis[]> {
    // Process dependencies in parallel with Promise.allSettled
    // This allows all API calls to run concurrently
    const analysisPromises = dependencies.map(dependency =>
      this.analyzeSingleDependency(dependency)
        .then(analysis => ({ status: 'fulfilled' as const, value: analysis }))
        .catch(error => {
          console.error(`Error analyzing dependency ${dependency.name}:`, error);
          return { status: 'rejected' as const, reason: error };
        })
    );

    const results = await Promise.all(analysisPromises);

    // Extract successful analyses
    const analyses: DependencyAnalysis[] = results
      .filter((result): result is { status: 'fulfilled'; value: DependencyAnalysis } => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);

    return analyses;
  }

  /**
   * Analyze dependencies incrementally - only analyze changed dependencies
   * @param dependencies Current dependencies
   * @param previousAnalyses Previous analysis results (from cache or database)
   * @returns Updated analysis results
   */
  async analyzeDependenciesIncremental(
    dependencies: Dependency[],
    previousAnalyses: DependencyAnalysis[]
  ): Promise<DependencyAnalysis[]> {
    // Create a map of previous analyses by dependency name and version
    const previousMap = new Map<string, DependencyAnalysis>();
    for (const analysis of previousAnalyses) {
      const key = `${analysis.dependency.name}@${analysis.dependency.version}`;
      previousMap.set(key, analysis);
    }

    // Identify which dependencies need re-analysis
    const toAnalyze: Dependency[] = [];
    const unchanged: DependencyAnalysis[] = [];

    for (const dependency of dependencies) {
      const key = `${dependency.name}@${dependency.version}`;
      const previous = previousMap.get(key);

      if (previous) {
        // Dependency hasn't changed, reuse previous analysis
        unchanged.push(previous);
      } else {
        // New or changed dependency, needs analysis
        toAnalyze.push(dependency);
      }
    }

    // Analyze only the changed dependencies
    const newAnalyses = await this.analyzeDependencies(toAnalyze);

    // Combine unchanged and new analyses
    return [...unchanged, ...newAnalyses];
  }

  /**
   * Analyze dependencies with automatic incremental analysis
   * Uses IncrementalAnalysisManager to track changes and cache results
   * @param projectId Unique identifier for the project
   * @param dependencies Current dependencies
   * @returns Analysis results
   */
  async analyzeDependenciesWithCache(
    projectId: string,
    dependencies: Dependency[]
  ): Promise<DependencyAnalysis[]> {
    // Check if dependencies have changed
    const hasChanged = await this.incrementalManager.haveDependenciesChanged(
      projectId,
      dependencies
    );

    if (!hasChanged) {
      // No changes, return cached results
      const cached = await this.incrementalManager.getCachedAnalysis(projectId);
      if (cached) {
        console.log(`Using cached analysis for project ${projectId}`);
        return cached;
      }
    }

    // Get changed dependencies
    const changes = await this.incrementalManager.getChangedDependencies(
      projectId,
      dependencies
    );

    console.log(`Incremental analysis for project ${projectId}:`, {
      added: changes.added.length,
      updated: changes.updated.length,
      unchanged: changes.unchanged.length,
      removed: changes.removed.length,
    });

    // Get cached analyses for unchanged dependencies
    const unchangedAnalyses = await this.incrementalManager.getUnchangedAnalyses(
      projectId,
      changes.unchanged
    );

    // Analyze only changed dependencies (added + updated)
    const toAnalyze = [...changes.added, ...changes.updated];
    const newAnalyses = toAnalyze.length > 0 
      ? await this.analyzeDependencies(toAnalyze)
      : [];

    // Combine results
    const allAnalyses = [...unchangedAnalyses, ...newAnalyses];

    // Save to cache
    await this.incrementalManager.saveAnalysis(projectId, dependencies, allAnalyses);

    return allAnalyses;
  }

  /**
   * Analyze a single dependency
   */
  private async analyzeSingleDependency(dependency: Dependency): Promise<DependencyAnalysis> {
    // Get version information
    const versionInfo = await this.checkLatestVersion(dependency);
    
    // Check for security vulnerabilities
    const vulnerabilities = await this.checkSecurityVulnerabilities(dependency);
    
    // Check deprecation status
    const deprecationInfo = await this.checkDeprecationStatus(dependency);
    
    // Categorize the update type
    const updateCategory = this.categorizeUpdate(
      dependency.version,
      versionInfo.latest
    );

    return {
      dependency,
      currentVersion: dependency.version,
      latestVersion: versionInfo.latest,
      updateCategory,
      isDeprecated: deprecationInfo.isDeprecated,
      deprecationInfo: deprecationInfo.isDeprecated ? deprecationInfo : undefined,
      vulnerabilities,
      alternatives: deprecationInfo.isDeprecated ? deprecationInfo.alternatives : undefined,
    };
  }

  /**
   * Check the latest version available for a dependency
   */
  async checkLatestVersion(dependency: Dependency): Promise<VersionInfo> {
    let versionInfo: VersionInfo;

    switch (dependency.ecosystem) {
      case 'npm':
        versionInfo = await this.npmClient.getVersionInfo(dependency.name);
        break;
      case 'pypi':
        versionInfo = await this.pypiClient.getVersionInfo(dependency.name);
        break;
      case 'maven':
        // Maven dependencies are typically in format groupId:artifactId
        const [groupId, artifactId] = dependency.name.split(':');
        if (!groupId || !artifactId) {
          throw new Error(`Invalid Maven dependency format: ${dependency.name}`);
        }
        versionInfo = await this.mavenClient.getVersionInfo(groupId, artifactId);
        break;
      case 'rubygems':
        // RubyGems support would be added here
        throw new Error('RubyGems ecosystem not yet implemented');
      default:
        throw new Error(`Unsupported ecosystem: ${dependency.ecosystem}`);
    }

    // Set the current version
    versionInfo.current = dependency.version;
    return versionInfo;
  }

  /**
   * Check for security vulnerabilities in a dependency
   */
  async checkSecurityVulnerabilities(dependency: Dependency): Promise<Vulnerability[]> {
    try {
      const vulnerabilities = await this.securityClient.checkVulnerabilities(
        dependency.name,
        dependency.version,
        dependency.ecosystem as 'npm' | 'pypi' | 'maven'
      );
      return vulnerabilities;
    } catch (error) {
      console.error(`Error checking vulnerabilities for ${dependency.name}:`, error);
      return [];
    }
  }

  /**
   * Check if a dependency is deprecated and get alternatives
   */
  async checkDeprecationStatus(dependency: Dependency): Promise<DeprecationInfo> {
    try {
      switch (dependency.ecosystem) {
        case 'npm':
          const npmDeprecation = await this.npmClient.getDeprecationInfo(
            dependency.name,
            dependency.version
          );
          
          if (npmDeprecation.deprecated) {
            return {
              isDeprecated: true,
              reason: npmDeprecation.message || 'Package is deprecated',
              alternatives: this.extractAlternatives(npmDeprecation.message || ''),
            };
          }
          break;
        
        case 'pypi':
        case 'maven':
          // PyPI and Maven don't have built-in deprecation mechanisms
          // Would need to check package metadata or external sources
          break;
      }

      return {
        isDeprecated: false,
        reason: '',
        alternatives: [],
      };
    } catch (error) {
      console.error(`Error checking deprecation for ${dependency.name}:`, error);
      return {
        isDeprecated: false,
        reason: '',
        alternatives: [],
      };
    }
  }

  /**
   * Categorize an update as major, minor, or patch based on semantic versioning
   */
  categorizeUpdate(currentVersion: string, latestVersion: string): UpdateCategory {
    try {
      // Clean versions (remove any prefixes like 'v')
      const cleanCurrent = semver.clean(currentVersion);
      const cleanLatest = semver.clean(latestVersion);

      if (!cleanCurrent || !cleanLatest) {
        // If versions can't be parsed, default to major
        return 'major';
      }

      const diff = semver.diff(cleanCurrent, cleanLatest);

      if (!diff) {
        // Versions are the same
        return 'patch';
      }

      // Map semver.diff results to our UpdateCategory
      if (diff === 'major' || diff === 'premajor') {
        return 'major';
      } else if (diff === 'minor' || diff === 'preminor') {
        return 'minor';
      } else {
        // patch, prepatch, prerelease
        return 'patch';
      }
    } catch (error) {
      console.error(`Error categorizing update from ${currentVersion} to ${latestVersion}:`, error);
      return 'major'; // Default to major for safety
    }
  }

  /**
   * Extract alternative package names from deprecation message
   */
  private extractAlternatives(message: string): string[] {
    const alternatives: string[] = [];
    
    // Common patterns in deprecation messages
    const patterns = [
      /use\s+([a-z0-9-_@/]+)\s+instead/gi,
      /replaced\s+by\s+([a-z0-9-_@/]+)/gi,
      /migrate\s+to\s+([a-z0-9-_@/]+)/gi,
      /see\s+([a-z0-9-_@/]+)/gi,
    ];

    for (const pattern of patterns) {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          alternatives.push(match[1]);
        }
      }
    }

    return [...new Set(alternatives)]; // Remove duplicates
  }
}
