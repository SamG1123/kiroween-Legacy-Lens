/**
 * Fallback data provider for when external APIs are unavailable
 */

import { VersionInfo, Vulnerability } from '../types';

/**
 * Bundled fallback data for common packages
 */
const FALLBACK_PACKAGE_DATA: Record<string, any> = {
  // NPM packages
  'npm:react': {
    latest: '18.2.0',
    versions: ['18.2.0', '18.1.0', '18.0.0', '17.0.2', '16.14.0'],
  },
  'npm:vue': {
    latest: '3.3.4',
    versions: ['3.3.4', '3.3.0', '3.2.0', '2.7.14'],
  },
  'npm:angular': {
    latest: '16.2.0',
    versions: ['16.2.0', '16.0.0', '15.2.0', '14.3.0'],
  },
  'npm:express': {
    latest: '4.18.2',
    versions: ['4.18.2', '4.18.0', '4.17.3', '4.17.1'],
  },
  'npm:lodash': {
    latest: '4.17.21',
    versions: ['4.17.21', '4.17.20', '4.17.19'],
  },
  'npm:axios': {
    latest: '1.5.0',
    versions: ['1.5.0', '1.4.0', '1.3.0', '0.27.2'],
  },
  'npm:typescript': {
    latest: '5.2.2',
    versions: ['5.2.2', '5.1.6', '5.0.4', '4.9.5'],
  },
  'npm:webpack': {
    latest: '5.88.2',
    versions: ['5.88.2', '5.88.0', '5.87.0', '4.46.0'],
  },
  'npm:jest': {
    latest: '29.6.4',
    versions: ['29.6.4', '29.5.0', '29.0.0', '28.1.3'],
  },
  'npm:eslint': {
    latest: '8.49.0',
    versions: ['8.49.0', '8.48.0', '8.47.0', '7.32.0'],
  },

  // Python packages
  'pypi:django': {
    latest: '4.2.5',
    versions: ['4.2.5', '4.2.0', '4.1.0', '3.2.20'],
  },
  'pypi:flask': {
    latest: '2.3.3',
    versions: ['2.3.3', '2.3.0', '2.2.0', '2.1.0'],
  },
  'pypi:requests': {
    latest: '2.31.0',
    versions: ['2.31.0', '2.30.0', '2.29.0', '2.28.0'],
  },
  'pypi:numpy': {
    latest: '1.25.2',
    versions: ['1.25.2', '1.25.0', '1.24.0', '1.23.0'],
  },
  'pypi:pandas': {
    latest: '2.1.0',
    versions: ['2.1.0', '2.0.0', '1.5.3', '1.4.0'],
  },

  // Maven packages
  'maven:org.springframework:spring-core': {
    latest: '6.0.11',
    versions: ['6.0.11', '6.0.0', '5.3.29', '5.3.0'],
  },
  'maven:org.hibernate:hibernate-core': {
    latest: '6.3.0',
    versions: ['6.3.0', '6.2.0', '6.1.0', '5.6.15'],
  },
};

/**
 * Known security vulnerabilities for fallback
 */
const FALLBACK_VULNERABILITIES: Record<string, Vulnerability[]> = {
  'npm:lodash:4.17.19': [
    {
      id: 'CVE-2020-8203',
      severity: 'high',
      description: 'Prototype pollution vulnerability',
      fixedIn: '4.17.21',
    },
  ],
  'npm:axios:0.21.0': [
    {
      id: 'CVE-2021-3749',
      severity: 'medium',
      description: 'Regular expression denial of service',
      fixedIn: '0.21.2',
    },
  ],
};

/**
 * Fallback data provider
 */
export class FallbackDataProvider {
  /**
   * Get fallback version info for a package
   */
  getVersionInfo(packageName: string, ecosystem: string): VersionInfo | null {
    const key = `${ecosystem}:${packageName}`;
    const data = FALLBACK_PACKAGE_DATA[key];

    if (!data) {
      return null;
    }

    return {
      current: '',
      latest: data.latest,
      latestStable: data.latest,
      allVersions: data.versions,
    };
  }

  /**
   * Get fallback vulnerabilities for a package
   */
  getVulnerabilities(
    packageName: string,
    version: string,
    ecosystem: string
  ): Vulnerability[] {
    const key = `${ecosystem}:${packageName}:${version}`;
    return FALLBACK_VULNERABILITIES[key] || [];
  }

  /**
   * Check if fallback data is available for a package
   */
  hasFallbackData(packageName: string, ecosystem: string): boolean {
    const key = `${ecosystem}:${packageName}`;
    return key in FALLBACK_PACKAGE_DATA;
  }

  /**
   * Get list of packages with fallback data
   */
  getAvailablePackages(): string[] {
    return Object.keys(FALLBACK_PACKAGE_DATA);
  }

  /**
   * Add custom fallback data (useful for testing or extending)
   */
  addFallbackData(packageName: string, ecosystem: string, data: any): void {
    const key = `${ecosystem}:${packageName}`;
    FALLBACK_PACKAGE_DATA[key] = data;
  }

  /**
   * Add custom vulnerability data
   */
  addVulnerabilityData(
    packageName: string,
    version: string,
    ecosystem: string,
    vulnerabilities: Vulnerability[]
  ): void {
    const key = `${ecosystem}:${packageName}:${version}`;
    FALLBACK_VULNERABILITIES[key] = vulnerabilities;
  }
}

/**
 * Global fallback data provider instance
 */
let globalFallbackProvider: FallbackDataProvider | null = null;

export function getFallbackDataProvider(): FallbackDataProvider {
  if (!globalFallbackProvider) {
    globalFallbackProvider = new FallbackDataProvider();
  }
  return globalFallbackProvider;
}
