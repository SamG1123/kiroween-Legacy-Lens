import { DependencyAnalyzer } from './DependencyAnalyzer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';

describe('DependencyAnalyzer', () => {
  let analyzer: DependencyAnalyzer;
  let testDir: string;

  beforeEach(() => {
    analyzer = new DependencyAnalyzer();
    testDir = path.join(__dirname, '../../test-workspace/dep-test');
    
    // Clean up and create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('parsePackageJson', () => {
    it('should parse runtime and dev dependencies from package.json', async () => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          'express': '^4.18.0',
          'react': '~18.2.0',
        },
        devDependencies: {
          'jest': '^29.0.0',
          'typescript': '>=5.0.0',
        },
      };

      const filePath = path.join(testDir, 'package.json');
      await fs.writeFile(filePath, JSON.stringify(packageJson, null, 2));

      const dependencies = await analyzer.parsePackageJson(filePath);

      expect(dependencies).toHaveLength(4);
      
      const express = dependencies.find(d => d.name === 'express');
      expect(express).toEqual({
        name: 'express',
        version: '4.18.0',
        type: 'runtime',
      });

      const jest = dependencies.find(d => d.name === 'jest');
      expect(jest).toEqual({
        name: 'jest',
        version: '29.0.0',
        type: 'dev',
      });
    });

    it('should handle package.json with only runtime dependencies', async () => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          'lodash': '^4.17.21',
        },
      };

      const filePath = path.join(testDir, 'package.json');
      await fs.writeFile(filePath, JSON.stringify(packageJson, null, 2));

      const dependencies = await analyzer.parsePackageJson(filePath);

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0]).toEqual({
        name: 'lodash',
        version: '4.17.21',
        type: 'runtime',
      });
    });

    it('should throw error for invalid JSON', async () => {
      const filePath = path.join(testDir, 'package.json');
      await fs.writeFile(filePath, 'invalid json {');

      await expect(analyzer.parsePackageJson(filePath)).rejects.toThrow();
    });
  });

  describe('parsePythonRequirements', () => {
    it('should parse requirements.txt with version specifiers', async () => {
      const requirements = `
# This is a comment
django==4.2.0
flask>=2.0.0
requests
pytest==7.4.0
`;

      const filePath = path.join(testDir, 'requirements.txt');
      await fs.writeFile(filePath, requirements, 'utf-8');
      
      // Verify file was written
      expect(existsSync(filePath)).toBe(true);

      const dependencies = await analyzer.parsePythonRequirements(filePath);

      expect(dependencies).toHaveLength(4);
      
      const django = dependencies.find(d => d.name === 'django');
      expect(django).toEqual({
        name: 'django',
        version: '4.2.0',
        type: 'runtime',
      });

      const requests = dependencies.find(d => d.name === 'requests');
      expect(requests).toEqual({
        name: 'requests',
        version: '*',
        type: 'runtime',
      });
    });

    it('should parse Pipfile with packages and dev-packages', async () => {
      const pipfile = `
[[source]]
url = "https://pypi.org/simple"
verify_ssl = true
name = "pypi"

[packages]
django = "==4.2.0"
requests = "*"

[dev-packages]
pytest = "==7.4.0"
black = "*"

[requires]
python_version = "3.11"
`;

      const filePath = path.join(testDir, 'Pipfile');
      await fs.writeFile(filePath, pipfile);

      const dependencies = await analyzer.parsePythonRequirements(filePath);

      expect(dependencies.length).toBeGreaterThanOrEqual(2);
      
      const django = dependencies.find(d => d.name === 'django');
      expect(django).toEqual({
        name: 'django',
        version: '4.2.0',
        type: 'runtime',
      });

      const pytest = dependencies.find(d => d.name === 'pytest');
      expect(pytest).toEqual({
        name: 'pytest',
        version: '7.4.0',
        type: 'dev',
      });
    });

    it('should skip empty lines and comments', async () => {
      const requirements = `
# Comment line

django==4.2.0

# Another comment
`;

      const filePath = path.join(testDir, 'requirements.txt');
      await fs.writeFile(filePath, requirements);

      const dependencies = await analyzer.parsePythonRequirements(filePath);

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].name).toBe('django');
    });
  });

  describe('parseJavaDependencies', () => {
    it('should parse pom.xml dependencies', async () => {
      const pomXml = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>my-app</artifactId>
  <version>1.0.0</version>
  
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <version>3.1.0</version>
    </dependency>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.13.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>
`;

      const filePath = path.join(testDir, 'pom.xml');
      await fs.writeFile(filePath, pomXml);

      const dependencies = await analyzer.parseJavaDependencies(filePath);

      expect(dependencies).toHaveLength(2);
      
      const springBoot = dependencies.find(d => d.name.includes('spring-boot-starter-web'));
      expect(springBoot).toEqual({
        name: 'org.springframework.boot:spring-boot-starter-web',
        version: '3.1.0',
        type: 'runtime',
      });

      const junit = dependencies.find(d => d.name.includes('junit'));
      expect(junit).toEqual({
        name: 'junit:junit',
        version: '4.13.2',
        type: 'dev',
      });
    });

    it('should parse build.gradle dependencies', async () => {
      const buildGradle = `
plugins {
    id 'java'
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web:3.1.0'
    api 'com.google.guava:guava:31.1-jre'
    testImplementation 'junit:junit:4.13.2'
    testCompile 'org.mockito:mockito-core:5.3.1'
}
`;

      const filePath = path.join(testDir, 'build.gradle');
      await fs.writeFile(filePath, buildGradle);

      const dependencies = await analyzer.parseJavaDependencies(filePath);

      expect(dependencies.length).toBeGreaterThanOrEqual(2);
      
      const springBoot = dependencies.find(d => d.name.includes('spring-boot-starter-web'));
      expect(springBoot).toEqual({
        name: 'org.springframework.boot:spring-boot-starter-web',
        version: '3.1.0',
        type: 'runtime',
      });

      const junit = dependencies.find(d => d.name.includes('junit'));
      expect(junit?.type).toBe('dev');
    });
  });

  describe('detectFrameworks', () => {
    it('should detect React framework from package.json', async () => {
      const packageJson = {
        name: 'react-app',
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
        },
      };

      const filePath = path.join(testDir, 'package.json');
      await fs.writeFile(filePath, JSON.stringify(packageJson, null, 2));

      const frameworks = await analyzer.detectFrameworks([filePath]);

      const react = frameworks.find(f => f.name === 'React');
      expect(react).toBeDefined();
      expect(react?.version).toBe('18.2.0');
      expect(react?.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Django framework from manage.py and requirements.txt', async () => {
      const managePy = path.join(testDir, 'manage.py');
      const requirementsTxt = path.join(testDir, 'requirements.txt');
      
      await fs.writeFile(managePy, '#!/usr/bin/env python\n# Django management script');
      await fs.writeFile(requirementsTxt, 'django==4.2.0\n');

      const frameworks = await analyzer.detectFrameworks([managePy, requirementsTxt]);

      const django = frameworks.find(f => f.name === 'Django');
      expect(django).toBeDefined();
      expect(django?.version).toBe('4.2.0');
    });

    it('should detect multiple frameworks', async () => {
      const packageJson = {
        name: 'fullstack-app',
        dependencies: {
          'express': '^4.18.0',
          'react': '^18.2.0',
        },
      };

      const filePath = path.join(testDir, 'package.json');
      await fs.writeFile(filePath, JSON.stringify(packageJson, null, 2));

      const frameworks = await analyzer.detectFrameworks([filePath]);

      expect(frameworks.length).toBeGreaterThanOrEqual(2);
      expect(frameworks.some(f => f.name === 'React')).toBe(true);
      expect(frameworks.some(f => f.name === 'Express')).toBe(true);
    });

    it('should return empty array when no frameworks detected', async () => {
      const packageJson = {
        name: 'simple-app',
        dependencies: {
          'lodash': '^4.17.21',
        },
      };

      const filePath = path.join(testDir, 'package.json');
      await fs.writeFile(filePath, JSON.stringify(packageJson, null, 2));

      const frameworks = await analyzer.detectFrameworks([filePath]);

      expect(frameworks).toHaveLength(0);
    });
  });

  describe('analyzeDependencies', () => {
    it('should analyze complete codebase with multiple dependency files', async () => {
      // Create package.json
      const packageJson = {
        name: 'test-project',
        dependencies: {
          'express': '^4.18.0',
          'react': '^18.2.0',
        },
        devDependencies: {
          'jest': '^29.0.0',
        },
      };
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create requirements.txt
      await fs.writeFile(
        path.join(testDir, 'requirements.txt'),
        'django==4.2.0\nrequests>=2.28.0'
      );

      const report = await analyzer.analyzeDependencies(testDir);

      expect(report.dependencies.length).toBeGreaterThanOrEqual(5);
      expect(report.frameworks.length).toBeGreaterThanOrEqual(1);
      
      // Check that dependencies from both files are included
      expect(report.dependencies.some(d => d.name === 'express')).toBe(true);
      expect(report.dependencies.some(d => d.name === 'django')).toBe(true);
    });

    it('should handle directory with no dependency files', async () => {
      const report = await analyzer.analyzeDependencies(testDir);

      expect(report.dependencies).toHaveLength(0);
      expect(report.frameworks).toHaveLength(0);
    });

    it('should handle errors gracefully and return partial results', async () => {
      // Create a valid package.json
      const packageJson = {
        name: 'test-project',
        dependencies: {
          'express': '^4.18.0',
        },
      };
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create an invalid requirements.txt
      await fs.writeFile(
        path.join(testDir, 'requirements.txt'),
        'invalid content that will cause parsing issues'
      );

      const report = await analyzer.analyzeDependencies(testDir);

      // Should still get results from package.json
      expect(report.dependencies.length).toBeGreaterThanOrEqual(1);
      expect(report.dependencies.some(d => d.name === 'express')).toBe(true);
    });
  });
});
