import { FallbackDataProvider, getFallbackDataProvider } from './FallbackDataProvider';

describe('FallbackDataProvider', () => {
  let provider: FallbackDataProvider;

  beforeEach(() => {
    provider = new FallbackDataProvider();
  });

  describe('getVersionInfo', () => {
    it('should return version info for known packages', () => {
      const versionInfo = provider.getVersionInfo('react', 'npm');

      expect(versionInfo).not.toBeNull();
      expect(versionInfo?.latest).toBeDefined();
      expect(versionInfo?.allVersions).toBeInstanceOf(Array);
    });

    it('should return null for unknown packages', () => {
      const versionInfo = provider.getVersionInfo('unknown-package', 'npm');

      expect(versionInfo).toBeNull();
    });

    it('should support different ecosystems', () => {
      const npmInfo = provider.getVersionInfo('react', 'npm');
      const pypiInfo = provider.getVersionInfo('django', 'pypi');
      const mavenInfo = provider.getVersionInfo('org.springframework:spring-core', 'maven');

      expect(npmInfo).not.toBeNull();
      expect(pypiInfo).not.toBeNull();
      expect(mavenInfo).not.toBeNull();
    });
  });

  describe('getVulnerabilities', () => {
    it('should return vulnerabilities for known packages', () => {
      const vulns = provider.getVulnerabilities('lodash', '4.17.19', 'npm');

      expect(vulns).toBeInstanceOf(Array);
      expect(vulns.length).toBeGreaterThan(0);
      expect(vulns[0]).toHaveProperty('id');
      expect(vulns[0]).toHaveProperty('severity');
    });

    it('should return empty array for packages without known vulnerabilities', () => {
      const vulns = provider.getVulnerabilities('react', '18.2.0', 'npm');

      expect(vulns).toEqual([]);
    });
  });

  describe('hasFallbackData', () => {
    it('should return true for known packages', () => {
      expect(provider.hasFallbackData('react', 'npm')).toBe(true);
      expect(provider.hasFallbackData('django', 'pypi')).toBe(true);
    });

    it('should return false for unknown packages', () => {
      expect(provider.hasFallbackData('unknown', 'npm')).toBe(false);
    });
  });

  describe('getAvailablePackages', () => {
    it('should return list of available packages', () => {
      const packages = provider.getAvailablePackages();

      expect(packages).toBeInstanceOf(Array);
      expect(packages.length).toBeGreaterThan(0);
      expect(packages).toContain('npm:react');
      expect(packages).toContain('pypi:django');
    });
  });

  describe('addFallbackData', () => {
    it('should add custom fallback data', () => {
      provider.addFallbackData('custom-package', 'npm', {
        latest: '1.0.0',
        versions: ['1.0.0', '0.9.0'],
      });

      const versionInfo = provider.getVersionInfo('custom-package', 'npm');

      expect(versionInfo).not.toBeNull();
      expect(versionInfo?.latest).toBe('1.0.0');
    });
  });

  describe('addVulnerabilityData', () => {
    it('should add custom vulnerability data', () => {
      const vulns = [
        {
          id: 'CVE-2023-0001',
          severity: 'high' as const,
          description: 'Test vulnerability',
          fixedIn: '2.0.0',
        },
      ];

      provider.addVulnerabilityData('test-package', '1.0.0', 'npm', vulns);

      const result = provider.getVulnerabilities('test-package', '1.0.0', 'npm');

      expect(result).toEqual(vulns);
    });
  });

  describe('global fallback provider', () => {
    it('should return singleton instance', () => {
      const provider1 = getFallbackDataProvider();
      const provider2 = getFallbackDataProvider();

      expect(provider1).toBe(provider2);
    });
  });
});
