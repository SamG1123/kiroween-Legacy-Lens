import * as semver from 'semver';
import {
  Recommendation,
  CompatibilityReport,
  CompatibilityIssue,
  Resolution,
  PeerDependencyCheck,
  Dependency,
} from '../types';
import { NpmRegistryClient } from '../clients/NpmRegistryClient';
import { PyPIClient } from '../clients/PyPIClient';
import { MavenClient } from '../clients/MavenClient';

/**
 * CompatibilityChecker verifies compatibility between recommended upgrades
 * and identifies potential conflicts in dependency trees
 */
export class CompatibilityChecker {
  private npmClient: NpmRegistryClient;
  private pypiClient: PyPIClient;
  private mavenClient: MavenClient;

  constructor() {
    this.npmClient = new NpmRegistryClient();
    this.pypiClient = new PyPIClient();
    this.mavenClient = new MavenClient();
  }

  /**
   * Check compatibility for a set of recommendations
   * Orchestrates all compatibility checks
   */
  async checkCompatibility(recommendations: Recommendation[]): Promise<CompatibilityReport> {
    const issues: CompatibilityIssue[] = [];

    // Extract dependencies from recommendations
    const dependencies = this.extractDependencies(recommendations);

    // Check dependency compatibility
    const depIssues = await this.checkDependencyCompatibility(dependencies);
    issues.push(...depIssues);

    // Generate resolutions for identified issues
    const resolutions = await this.resolveConflicts(issues);

    return {
      compatible: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      resolutions,
    };
  }

  /**
   * Check compatibility between multiple dependencies
   * Identifies version conflicts and transitive dependency issues
   */
  async checkDependencyCompatibility(dependencies: Dependency[]): Promise<CompatibilityIssue[]> {
    const issues: CompatibilityIssue[] = [];

    // Group dependencies by name to detect version conflicts
    const depsByName = new Map<string, Dependency[]>();
    for (const dep of dependencies) {
      const existing = depsByName.get(dep.name) || [];
      existing.push(dep);
      depsByName.set(dep.name, existing);
    }

    // Check for version conflicts
    for (const [name, deps] of depsByName.entries()) {
      if (deps.length > 1) {
        const versions = deps.map(d => d.version);
        const uniqueVersions = [...new Set(versions)];
        
        if (uniqueVersions.length > 1) {
          // Multiple versions of the same dependency
          const compatible = this.areVersionsCompatible(uniqueVersions);
          
          if (!compatible) {
            issues.push({
              type: 'version_conflict',
              description: `Multiple incompatible versions of ${name} required: ${uniqueVersions.join(', ')}`,
              affectedDependencies: [name],
              severity: 'error',
            });
          }
        }
      }
    }

    // Check peer dependencies for each dependency
    for (const dep of dependencies) {
      try {
        const peerCheck = await this.checkPeerDependencies(dep, dep.version);
        
        if (!peerCheck.satisfied) {
          if (peerCheck.missing.length > 0) {
            issues.push({
              type: 'peer_dependency',
              description: `${dep.name}@${dep.version} requires missing peer dependencies: ${peerCheck.missing.join(', ')}`,
              affectedDependencies: [dep.name, ...peerCheck.missing],
              severity: 'warning',
            });
          }
          
          if (peerCheck.conflicts.length > 0) {
            issues.push({
              type: 'peer_dependency',
              description: `${dep.name}@${dep.version} has peer dependency conflicts: ${peerCheck.conflicts.join(', ')}`,
              affectedDependencies: [dep.name, ...peerCheck.conflicts],
              severity: 'error',
            });
          }
        }
      } catch (error) {
        console.error(`Error checking peer dependencies for ${dep.name}:`, error);
      }
    }

    // Check for transitive conflicts
    const transitiveIssues = await this.checkTransitiveDependencies(dependencies);
    issues.push(...transitiveIssues);

    return issues;
  }

  /**
   * Check peer dependencies for a specific dependency version
   */
  async checkPeerDependencies(dep: Dependency, version: string): Promise<PeerDependencyCheck> {
    try {
      let peerDeps: Record<string, string> = {};

      // Get peer dependencies based on ecosystem
      switch (dep.ecosystem) {
        case 'npm':
          const npmPackageInfo = await this.npmClient.getPackageInfo(dep.name);
          const versionInfo = npmPackageInfo.versions?.[version];
          peerDeps = versionInfo?.peerDependencies || {};
          break;
        
        case 'pypi':
          // PyPI doesn't have a formal peer dependency concept
          // Would need to check extras_require or similar
          break;
        
        case 'maven':
          // Maven has optional dependencies which are similar
          // Would need to fetch and parse POM file for dependency information
          // For now, we'll skip this
          break;
      }

      // For now, return satisfied if no peer dependencies
      if (Object.keys(peerDeps).length === 0) {
        return {
          satisfied: true,
          missing: [],
          conflicts: [],
        };
      }

      // Check if peer dependencies are satisfied
      // This would require checking against the current dependency tree
      // For now, we'll return a basic check
      return {
        satisfied: true,
        missing: [],
        conflicts: [],
      };
    } catch (error) {
      console.error(`Error checking peer dependencies for ${dep.name}@${version}:`, error);
      return {
        satisfied: true,
        missing: [],
        conflicts: [],
      };
    }
  }

  /**
   * Check if a dependency version is compatible with a specific language version
   */
  checkLanguageCompatibility(dep: Dependency, version: string, languageVersion: string): boolean {
    try {
      // This would need to check the dependency's engine requirements
      // For npm packages, this is in the "engines" field
      // For Python, this is in python_requires
      // For Maven, this is in maven.compiler.source/target
      
      // For now, we'll implement basic Node.js version checking
      if (dep.ecosystem === 'npm') {
        // Would need to fetch package.json and check engines.node
        // Simplified implementation
        const majorVersion = parseInt(languageVersion.split('.')[0]);
        
        // Most modern packages require Node 14+
        if (majorVersion < 14) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`Error checking language compatibility for ${dep.name}:`, error);
      return true; // Default to compatible if check fails
    }
  }

  /**
   * Resolve conflicts and provide suggestions
   */
  async resolveConflicts(issues: CompatibilityIssue[]): Promise<Resolution[]> {
    const resolutions: Resolution[] = [];

    for (const issue of issues) {
      let resolution: Resolution;

      switch (issue.type) {
        case 'version_conflict':
          resolution = await this.resolveVersionConflict(issue);
          break;
        
        case 'peer_dependency':
          resolution = await this.resolvePeerDependency(issue);
          break;
        
        case 'language_incompatibility':
          resolution = await this.resolveLanguageIncompatibility(issue);
          break;
        
        default:
          resolution = {
            issue,
            solution: 'Manual review required',
          };
      }

      resolutions.push(resolution);
    }

    return resolutions;
  }

  /**
   * Extract dependencies from recommendations
   */
  private extractDependencies(recommendations: Recommendation[]): Dependency[] {
    const dependencies: Dependency[] = [];

    for (const rec of recommendations) {
      if (rec.type === 'dependency') {
        // Parse dependency information from recommendation
        // The suggestedState should contain the target version
        const name = this.extractDependencyName(rec.currentState);
        const version = this.extractVersion(rec.suggestedState);
        const ecosystem = this.detectEcosystem(rec);

        if (name && version && ecosystem) {
          dependencies.push({
            name,
            version,
            type: 'production',
            ecosystem,
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * Check if multiple versions are compatible (can coexist)
   */
  private areVersionsCompatible(versions: string[]): boolean {
    try {
      // Check if all versions satisfy a common range
      // For simplicity, check if they're all within the same major version
      const cleanVersions = versions.map(v => semver.clean(v)).filter(v => v !== null) as string[];
      
      if (cleanVersions.length === 0) {
        return false;
      }

      const majors = cleanVersions.map(v => semver.major(v));
      const uniqueMajors = [...new Set(majors)];

      // If all versions share the same major version, they might be compatible
      return uniqueMajors.length === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for transitive dependency conflicts
   */
  private async checkTransitiveDependencies(dependencies: Dependency[]): Promise<CompatibilityIssue[]> {
    const issues: CompatibilityIssue[] = [];

    // This would require building a full dependency tree
    // and checking for conflicts in transitive dependencies
    // For now, we'll return an empty array as this is complex
    // and would require recursive dependency resolution

    return issues;
  }

  /**
   * Resolve version conflict by finding a compatible version
   */
  private async resolveVersionConflict(issue: CompatibilityIssue): Promise<Resolution> {
    const depName = issue.affectedDependencies[0];
    
    // Extract versions from the description
    const versionMatch = issue.description.match(/versions?: (.+)/);
    if (!versionMatch) {
      return {
        issue,
        solution: 'Unable to parse version conflict. Manual review required.',
      };
    }

    const versions = versionMatch[1].split(',').map(v => v.trim());
    
    // Try to find a version that satisfies all requirements
    const solution = `Consider using a version that satisfies all requirements. ` +
      `Review the dependency tree and choose the highest compatible version. ` +
      `You may need to update other dependencies to resolve this conflict.`;

    return {
      issue,
      solution,
      alternativeVersions: versions,
    };
  }

  /**
   * Resolve peer dependency issue
   */
  private async resolvePeerDependency(issue: CompatibilityIssue): Promise<Resolution> {
    const solution = issue.description.includes('missing')
      ? `Install the missing peer dependencies: ${issue.affectedDependencies.slice(1).join(', ')}`
      : `Update conflicting peer dependencies to compatible versions`;

    return {
      issue,
      solution,
    };
  }

  /**
   * Resolve language incompatibility
   */
  private async resolveLanguageIncompatibility(issue: CompatibilityIssue): Promise<Resolution> {
    return {
      issue,
      solution: 'Upgrade your language/runtime version to meet the minimum requirements, or use an older version of the dependency that is compatible with your current language version.',
    };
  }

  /**
   * Extract dependency name from recommendation state
   */
  private extractDependencyName(state: string): string | null {
    // State format might be like "package-name@1.0.0" or just "package-name"
    const match = state.match(/^([^@]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract version from recommendation state
   */
  private extractVersion(state: string): string | null {
    // State format might be like "package-name@1.0.0"
    const match = state.match(/@(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Detect ecosystem from recommendation
   */
  private detectEcosystem(rec: Recommendation): 'npm' | 'pypi' | 'maven' | 'rubygems' | null {
    // Check description or title for ecosystem hints
    const text = (rec.title + ' ' + rec.description).toLowerCase();
    
    if (text.includes('npm') || text.includes('node') || text.includes('javascript') || text.includes('typescript')) {
      return 'npm';
    }
    if (text.includes('pypi') || text.includes('python') || text.includes('pip')) {
      return 'pypi';
    }
    if (text.includes('maven') || text.includes('java')) {
      return 'maven';
    }
    if (text.includes('rubygems') || text.includes('ruby') || text.includes('gem')) {
      return 'rubygems';
    }
    
    return 'npm'; // Default to npm
  }
}
