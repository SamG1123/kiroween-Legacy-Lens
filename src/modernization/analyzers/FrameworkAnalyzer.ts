import * as semver from 'semver';
import { NpmRegistryClient } from '../clients/NpmRegistryClient';
import { getCacheClient } from '../clients/CacheClient';
import {
  Framework,
  FrameworkAnalysis,
  BreakingChange,
  MigrationGuide,
  EffortEstimate,
} from '../types';

/**
 * FrameworkAnalyzer identifies outdated frameworks and provides upgrade guidance
 */
export class FrameworkAnalyzer {
  private npmClient: NpmRegistryClient;
  private cache = getCacheClient();

  // Known frameworks with their metadata sources
  private readonly frameworkMetadata: Record<string, {
    ecosystem: 'npm' | 'pypi' | 'maven';
    changelogUrl?: string;
    migrationGuideUrl?: string;
    docsUrl?: string;
  }> = {
    'react': {
      ecosystem: 'npm',
      changelogUrl: 'https://github.com/facebook/react/blob/main/CHANGELOG.md',
      migrationGuideUrl: 'https://react.dev/blog',
      docsUrl: 'https://react.dev',
    },
    'vue': {
      ecosystem: 'npm',
      changelogUrl: 'https://github.com/vuejs/core/blob/main/CHANGELOG.md',
      migrationGuideUrl: 'https://v3-migration.vuejs.org/',
      docsUrl: 'https://vuejs.org',
    },
    'angular': {
      ecosystem: 'npm',
      changelogUrl: 'https://github.com/angular/angular/blob/main/CHANGELOG.md',
      migrationGuideUrl: 'https://update.angular.io/',
      docsUrl: 'https://angular.io',
    },
    'next': {
      ecosystem: 'npm',
      changelogUrl: 'https://github.com/vercel/next.js/releases',
      migrationGuideUrl: 'https://nextjs.org/docs/upgrading',
      docsUrl: 'https://nextjs.org',
    },
    'express': {
      ecosystem: 'npm',
      changelogUrl: 'https://github.com/expressjs/express/blob/master/History.md',
      migrationGuideUrl: 'https://expressjs.com/en/guide/migrating-4.html',
      docsUrl: 'https://expressjs.com',
    },
    'django': {
      ecosystem: 'pypi',
      changelogUrl: 'https://docs.djangoproject.com/en/stable/releases/',
      migrationGuideUrl: 'https://docs.djangoproject.com/en/stable/howto/upgrade-version/',
      docsUrl: 'https://www.djangoproject.com',
    },
    'flask': {
      ecosystem: 'pypi',
      changelogUrl: 'https://flask.palletsprojects.com/en/latest/changes/',
      migrationGuideUrl: 'https://flask.palletsprojects.com/en/latest/upgrading/',
      docsUrl: 'https://flask.palletsprojects.com',
    },
    'spring-boot': {
      ecosystem: 'maven',
      changelogUrl: 'https://github.com/spring-projects/spring-boot/wiki',
      migrationGuideUrl: 'https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide',
      docsUrl: 'https://spring.io/projects/spring-boot',
    },
  };

  constructor() {
    this.npmClient = new NpmRegistryClient();
  }

  /**
   * Analyze multiple frameworks and return analysis results
   * Uses parallel processing for improved performance
   */
  async analyzeFrameworks(frameworks: Framework[]): Promise<FrameworkAnalysis[]> {
    // Process frameworks in parallel with Promise.allSettled
    const analysisPromises = frameworks.map(framework =>
      this.analyzeSingleFramework(framework)
        .then(analysis => ({ status: 'fulfilled' as const, value: analysis }))
        .catch(error => {
          console.error(`Error analyzing framework ${framework.name}:`, error);
          return { status: 'rejected' as const, reason: error };
        })
    );

    const results = await Promise.all(analysisPromises);

    // Extract successful analyses
    const analyses: FrameworkAnalysis[] = results
      .filter((result): result is { status: 'fulfilled'; value: FrameworkAnalysis } => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);

    return analyses;
  }

  /**
   * Analyze a single framework
   */
  private async analyzeSingleFramework(framework: Framework): Promise<FrameworkAnalysis> {
    // Get latest version
    const latestVersion = await this.getLatestVersion(framework);
    
    // Get breaking changes between versions
    const breakingChanges = await this.getBreakingChanges(
      framework,
      framework.version,
      latestVersion
    );
    
    // Get migration guide
    const migrationGuide = await this.getMigrationGuide(
      framework,
      framework.version,
      latestVersion
    );
    
    // Estimate upgrade effort
    const effortEstimate = this.estimateUpgradeEffort(framework, breakingChanges);

    return {
      framework,
      currentVersion: framework.version,
      latestVersion,
      breakingChanges,
      migrationGuide,
      effortEstimate,
    };
  }

  /**
   * Get the latest version for a framework
   */
  async getLatestVersion(framework: Framework): Promise<string> {
    const cacheKey = `framework:latest:${framework.name}`;
    
    // Try cache first
    const cached = await this.cache.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const metadata = this.frameworkMetadata[framework.name.toLowerCase()];
    
    if (!metadata) {
      throw new Error(`Unknown framework: ${framework.name}`);
    }

    let latestVersion: string;

    switch (metadata.ecosystem) {
      case 'npm':
        latestVersion = await this.npmClient.getLatestVersion(framework.name);
        break;
      case 'pypi':
        // PyPI support would be added here
        throw new Error('PyPI framework detection not yet implemented');
      case 'maven':
        // Maven support would be added here
        throw new Error('Maven framework detection not yet implemented');
      default:
        throw new Error(`Unsupported ecosystem: ${metadata.ecosystem}`);
    }

    // Cache the result for 24 hours
    await this.cache.set(cacheKey, latestVersion, 86400);
    
    return latestVersion;
  }

  /**
   * Get breaking changes between two framework versions
   */
  async getBreakingChanges(
    framework: Framework,
    fromVersion: string,
    toVersion: string
  ): Promise<BreakingChange[]> {
    const cacheKey = `framework:breaking:${framework.name}:${fromVersion}:${toVersion}`;
    
    // Try cache first
    const cached = await this.cache.get<BreakingChange[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const breakingChanges: BreakingChange[] = [];
    
    // If versions are the same, no breaking changes
    if (fromVersion === toVersion) {
      return breakingChanges;
    }

    // Determine if this is a major version upgrade
    const cleanFrom = semver.clean(fromVersion);
    const cleanTo = semver.clean(toVersion);
    
    if (!cleanFrom || !cleanTo) {
      // Can't parse versions, assume there might be breaking changes
      breakingChanges.push({
        description: 'Unable to parse version numbers. Manual review of changelog recommended.',
        affectedAPIs: [],
        migrationPath: 'Review the framework changelog and migration guides.',
      });
      return breakingChanges;
    }

    const diff = semver.diff(cleanFrom, cleanTo);
    
    // Major version changes typically have breaking changes
    if (diff === 'major' || diff === 'premajor') {
      breakingChanges.push(...this.getKnownBreakingChanges(framework, cleanFrom, cleanTo));
    }

    // Cache the result for 7 days
    await this.cache.set(cacheKey, breakingChanges, 604800);
    
    return breakingChanges;
  }

  /**
   * Get known breaking changes for popular frameworks
   */
  private getKnownBreakingChanges(
    framework: Framework,
    fromVersion: string,
    toVersion: string
  ): BreakingChange[] {
    const frameworkName = framework.name.toLowerCase();
    const fromMajor = semver.major(fromVersion);
    const toMajor = semver.major(toVersion);

    // Known breaking changes for popular frameworks
    const knownChanges: Record<string, Record<string, BreakingChange[]>> = {
      'react': {
        '16-17': [
          {
            description: 'Event pooling removed',
            affectedAPIs: ['SyntheticEvent'],
            migrationPath: 'Remove event.persist() calls as they are no longer needed.',
          },
          {
            description: 'New JSX transform',
            affectedAPIs: ['JSX'],
            migrationPath: 'Update build configuration to use the new JSX transform.',
          },
        ],
        '17-18': [
          {
            description: 'Automatic batching for all updates',
            affectedAPIs: ['setState', 'useState'],
            migrationPath: 'Review state update logic; use flushSync if synchronous updates are needed.',
          },
          {
            description: 'Stricter hydration errors',
            affectedAPIs: ['hydrate', 'hydrateRoot'],
            migrationPath: 'Fix any hydration mismatches between server and client rendering.',
          },
        ],
      },
      'vue': {
        '2-3': [
          {
            description: 'Composition API is now standard',
            affectedAPIs: ['Options API'],
            migrationPath: 'Consider migrating to Composition API for new components.',
          },
          {
            description: 'v-model usage changes',
            affectedAPIs: ['v-model'],
            migrationPath: 'Update custom v-model implementations to use modelValue and update:modelValue.',
          },
        ],
      },
      'angular': {
        '11-12': [
          {
            description: 'View Engine deprecated',
            affectedAPIs: ['View Engine'],
            migrationPath: 'Migrate to Ivy rendering engine.',
          },
        ],
        '12-13': [
          {
            description: 'IE11 support removed',
            affectedAPIs: ['Browser support'],
            migrationPath: 'Remove IE11 polyfills and update browser support documentation.',
          },
        ],
      },
    };

    const key = `${fromMajor}-${toMajor}`;
    return knownChanges[frameworkName]?.[key] || [
      {
        description: `Major version upgrade from ${fromMajor}.x to ${toMajor}.x may contain breaking changes.`,
        affectedAPIs: ['Various'],
        migrationPath: 'Review the official changelog and migration guide for detailed information.',
      },
    ];
  }

  /**
   * Get migration guide for upgrading between versions
   */
  async getMigrationGuide(
    framework: Framework,
    fromVersion: string,
    toVersion: string
  ): Promise<MigrationGuide> {
    const cacheKey = `framework:guide:${framework.name}:${fromVersion}:${toVersion}`;
    
    // Try cache first
    const cached = await this.cache.get<MigrationGuide>(cacheKey);
    if (cached) {
      return cached;
    }

    const metadata = this.frameworkMetadata[framework.name.toLowerCase()];
    
    const guide: MigrationGuide = {
      url: metadata?.migrationGuideUrl || metadata?.docsUrl || '',
      steps: this.getGenericMigrationSteps(framework, fromVersion, toVersion),
      automatedTools: this.getAutomatedTools(framework),
    };

    // Cache the result for 7 days
    await this.cache.set(cacheKey, guide, 604800);
    
    return guide;
  }

  /**
   * Get generic migration steps
   */
  private getGenericMigrationSteps(
    framework: Framework,
    fromVersion: string,
    toVersion: string
  ): string[] {
    const steps: string[] = [
      'Review the official changelog and migration guide',
      'Update the framework version in package.json or requirements file',
      'Run dependency update command (npm update, pip install --upgrade, etc.)',
      'Review and address any deprecation warnings',
      'Update code to handle breaking changes',
      'Run all tests to verify functionality',
      'Test the application manually in development environment',
      'Update documentation to reflect framework version change',
    ];

    // Add framework-specific steps
    const frameworkName = framework.name.toLowerCase();
    
    if (frameworkName === 'react' || frameworkName === 'vue' || frameworkName === 'angular') {
      steps.splice(3, 0, 'Update build configuration if needed');
    }

    if (frameworkName === 'angular') {
      steps.splice(2, 0, 'Run ng update command for automated migrations');
    }

    return steps;
  }

  /**
   * Get automated migration tools for a framework
   */
  private getAutomatedTools(framework: Framework): string[] {
    const frameworkName = framework.name.toLowerCase();
    
    const tools: Record<string, string[]> = {
      'react': ['react-codemod', 'jscodeshift'],
      'vue': ['@vue/compat', 'vue-migration-helper'],
      'angular': ['ng update', '@angular/cli'],
      'next': ['@next/codemod'],
      'express': [],
      'django': ['django-upgrade'],
      'flask': [],
      'spring-boot': ['spring-boot-migrator'],
    };

    return tools[frameworkName] || [];
  }

  /**
   * Estimate the effort required for a framework upgrade
   */
  estimateUpgradeEffort(framework: Framework, breakingChanges: BreakingChange[]): EffortEstimate {
    const cleanCurrent = semver.clean(framework.version);
    const breakingChangeCount = breakingChanges.length;

    // If we can't parse the version, assume high effort
    if (!cleanCurrent) {
      return 'high';
    }

    // Factors that influence effort:
    // 1. Number of breaking changes
    // 2. Version jump size
    // 3. Framework complexity

    let effortScore = 0;

    // Breaking changes contribute most to effort
    if (breakingChangeCount === 0) {
      effortScore += 1;
    } else if (breakingChangeCount <= 2) {
      effortScore += 3;
    } else if (breakingChangeCount <= 5) {
      effortScore += 5;
    } else {
      effortScore += 8;
    }

    // Framework-specific complexity
    const complexFrameworks = ['angular', 'spring-boot', 'django'];
    if (complexFrameworks.includes(framework.name.toLowerCase())) {
      effortScore += 2;
    }

    // Map score to effort estimate
    if (effortScore <= 2) {
      return 'low';
    } else if (effortScore <= 5) {
      return 'medium';
    } else {
      return 'high';
    }
  }
}
