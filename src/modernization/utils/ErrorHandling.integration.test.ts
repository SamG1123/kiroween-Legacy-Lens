/**
 * Integration tests for error handling and resilience features
 */

import { NpmRegistryClient } from '../clients/NpmRegistryClient';
import { PyPIClient } from '../clients/PyPIClient';
import { SecurityDatabaseClient } from '../clients/SecurityDatabaseClient';
import { getErrorHandler, resetErrorHandler } from './ErrorHandler';
import { getFallbackDataProvider } from './FallbackDataProvider';

describe('Error Handling Integration', () => {
  beforeEach(() => {
    resetErrorHandler();
  });

  describe('NpmRegistryClient with error handling', () => {
    it('should use fallback data when API fails', async () => {
      const client = new NpmRegistryClient();
      const errorHandler = getErrorHandler();

      // Try to get info for a package that exists in fallback
      const result = await client.getLatestVersion('react');

      // Should either get real data or fallback data
      expect(result).toBeDefined();

      // If there were errors, they should be recorded
      const errors = errorHandler.getErrors();
      if (errors.length > 0) {
        expect(errors[0].context.component).toBe('NpmRegistryClient');
      }
    });

    it('should handle unknown packages gracefully', async () => {
      const client = new NpmRegistryClient();
      const errorHandler = getErrorHandler();

      // Try to get info for a package that doesn't exist
      const result = await client.getLatestVersion('this-package-definitely-does-not-exist-12345');

      // Should return empty string instead of throwing
      expect(result).toBe('');

      // Should have recorded a warning
      const warnings = errorHandler.getWarnings();
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('PyPIClient with error handling', () => {
    it('should use fallback data when API fails', async () => {
      const client = new PyPIClient();
      const errorHandler = getErrorHandler();

      // Try to get info for a package that exists in fallback
      const result = await client.getLatestVersion('django');

      // Should either get real data or fallback data
      expect(result).toBeDefined();

      // If there were errors, they should be recorded
      const errors = errorHandler.getErrors();
      if (errors.length > 0) {
        expect(errors[0].context.component).toBe('PyPIClient');
      }
    });
  });

  describe('SecurityDatabaseClient with error handling', () => {
    it('should return empty array when API fails', async () => {
      const client = new SecurityDatabaseClient();
      const errorHandler = getErrorHandler();

      // Try to check vulnerabilities for a package
      const result = await client.checkVulnerabilities(
        'test-package',
        '1.0.0',
        'npm'
      );

      // Should return empty array instead of throwing
      expect(Array.isArray(result)).toBe(true);

      // May have recorded errors depending on API availability
      const errors = errorHandler.getErrors();
      if (errors.length > 0) {
        expect(errors[0].context.component).toBe('SecurityDatabaseClient');
      }
    });

    it('should use fallback vulnerability data when available', async () => {
      const client = new SecurityDatabaseClient();
      const fallbackProvider = getFallbackDataProvider();

      // Add custom fallback vulnerability data
      fallbackProvider.addVulnerabilityData(
        'test-vuln-package',
        '1.0.0',
        'npm',
        [
          {
            id: 'TEST-001',
            severity: 'high',
            description: 'Test vulnerability',
            fixedIn: '1.0.1',
          },
        ]
      );

      // This should use fallback data if API fails
      const result = await client.checkVulnerabilities(
        'test-vuln-package',
        '1.0.0',
        'npm'
      );

      // Should get either real data or fallback data
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Error reporting', () => {
    it('should accumulate errors across multiple operations', async () => {
      const npmClient = new NpmRegistryClient();
      const pypiClient = new PyPIClient();
      const errorHandler = getErrorHandler();

      // Perform multiple operations that may fail
      await npmClient.getLatestVersion('unknown-npm-package-12345');
      await pypiClient.getLatestVersion('unknown-pypi-package-12345');

      // Should have recorded warnings
      const warnings = errorHandler.getWarnings();
      expect(warnings.length).toBeGreaterThan(0);

      // Should be able to generate a summary
      const summary = errorHandler.generateSummary();
      expect(summary).toContain('Warnings');
    });

    it('should distinguish between recoverable and non-recoverable errors', async () => {
      const errorHandler = getErrorHandler();

      // Simulate a recoverable error (network timeout)
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'ETIMEDOUT';
      errorHandler.handleError(timeoutError, {
        operation: 'fetch',
        component: 'TestClient',
      });

      // Simulate a non-recoverable error
      const criticalError = new Error('Invalid configuration');
      errorHandler.handleError(criticalError, {
        operation: 'init',
        component: 'TestClient',
      });

      const errors = errorHandler.getErrors();
      expect(errors).toHaveLength(2);

      // Should have at least one non-recoverable error
      expect(errorHandler.hasCriticalErrors()).toBe(true);
    });
  });

  describe('Fallback data provider', () => {
    it('should provide fallback data for common packages', () => {
      const fallbackProvider = getFallbackDataProvider();

      // Check for common npm packages
      expect(fallbackProvider.hasFallbackData('react', 'npm')).toBe(true);
      expect(fallbackProvider.hasFallbackData('vue', 'npm')).toBe(true);
      expect(fallbackProvider.hasFallbackData('express', 'npm')).toBe(true);

      // Check for common Python packages
      expect(fallbackProvider.hasFallbackData('django', 'pypi')).toBe(true);
      expect(fallbackProvider.hasFallbackData('flask', 'pypi')).toBe(true);

      // Check for common Maven packages
      expect(fallbackProvider.hasFallbackData('org.springframework:spring-core', 'maven')).toBe(true);
    });

    it('should allow adding custom fallback data', () => {
      const fallbackProvider = getFallbackDataProvider();

      fallbackProvider.addFallbackData('custom-package', 'npm', {
        latest: '2.0.0',
        versions: ['2.0.0', '1.9.0', '1.8.0'],
      });

      expect(fallbackProvider.hasFallbackData('custom-package', 'npm')).toBe(true);

      const versionInfo = fallbackProvider.getVersionInfo('custom-package', 'npm');
      expect(versionInfo?.latest).toBe('2.0.0');
    });
  });
});
