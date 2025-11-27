import { IDependencyAnalyzer } from '../interfaces/DependencyAnalyzer';
import { Dependency, Framework, DependencyReport } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXml = promisify(parseString);

/**
 * DependencyAnalyzer Implementation
 * Responsibility: Extract and identify dependencies and frameworks
 */
export class DependencyAnalyzer implements IDependencyAnalyzer {
  /**
   * Analyze all dependencies in the codebase
   */
  async analyzeDependencies(directory: string): Promise<DependencyReport> {
    const dependencies: Dependency[] = [];
    const frameworks: Framework[] = [];

    try {
      // Find all relevant dependency files
      const files = await this.findDependencyFiles(directory);

      // Parse each dependency file
      for (const file of files) {
        try {
          const fileName = path.basename(file);
          
          if (fileName === 'package.json') {
            const deps = await this.parsePackageJson(file);
            dependencies.push(...deps);
          } else if (fileName === 'requirements.txt' || fileName === 'Pipfile') {
            const deps = await this.parsePythonRequirements(file);
            dependencies.push(...deps);
          } else if (fileName === 'pom.xml' || fileName === 'build.gradle') {
            const deps = await this.parseJavaDependencies(file);
            dependencies.push(...deps);
          }
        } catch (error) {
          // Skip files that can't be parsed
          continue;
        }
      }

      // Detect frameworks based on all files in directory
      const allFiles = await this.getAllFiles(directory);
      frameworks.push(...await this.detectFrameworks(allFiles));

      return {
        dependencies,
        frameworks,
      };
    } catch (error) {
      // Return empty report on error
      return {
        dependencies: [],
        frameworks: [],
      };
    }
  }

  /**
   * Parse package.json for Node.js dependencies
   */
  async parsePackageJson(filePath: string): Promise<Dependency[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const packageJson = JSON.parse(content);
      const dependencies: Dependency[] = [];

      // Parse runtime dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          dependencies.push({
            name,
            version: this.cleanVersion(version as string),
            type: 'runtime',
          });
        }
      }

      // Parse dev dependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          dependencies.push({
            name,
            version: this.cleanVersion(version as string),
            type: 'dev',
          });
        }
      }

      return dependencies;
    } catch (error) {
      throw new Error(`Failed to parse package.json: ${error}`);
    }
  }

  /**
   * Parse Python requirements files
   */
  async parsePythonRequirements(filePath: string): Promise<Dependency[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const dependencies: Dependency[] = [];
      const fileName = path.basename(filePath);

      if (fileName === 'requirements.txt') {
        // Parse requirements.txt format
        const lines = content.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          
          // Skip empty lines and comments
          if (!trimmed || trimmed.startsWith('#')) {
            continue;
          }

          // Parse dependency line (e.g., "package==1.0.0", "package>=1.0.0", "package")
          const match = trimmed.match(/^([a-zA-Z0-9_-]+)([=<>!]+)?(.+)?/);
          
          if (match) {
            const name = match[1];
            const version = match[3] ? match[3].trim() : '*';
            
            dependencies.push({
              name,
              version: this.cleanVersion(version),
              type: 'runtime',
            });
          }
        }
      } else if (fileName === 'Pipfile') {
        // Parse Pipfile (TOML-like format)
        const lines = content.split('\n');
        let currentSection = '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          
          // Detect section headers
          if (trimmed.startsWith('[')) {
            currentSection = trimmed;
            continue;
          }

          // Skip empty lines and comments
          if (!trimmed || trimmed.startsWith('#')) {
            continue;
          }

          // Parse dependency lines in [packages] or [dev-packages] sections
          if (currentSection === '[packages]' || currentSection === '[dev-packages]') {
            const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*["']([^"']+)["']/);
            
            if (match) {
              const name = match[1];
              const version = match[2];
              
              dependencies.push({
                name,
                version: this.cleanVersion(version),
                type: currentSection === '[packages]' ? 'runtime' : 'dev',
              });
            }
          }
        }
      }

      return dependencies;
    } catch (error) {
      throw new Error(`Failed to parse Python requirements: ${error}`);
    }
  }

  /**
   * Parse Java dependency files
   */
  async parseJavaDependencies(filePath: string): Promise<Dependency[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const dependencies: Dependency[] = [];
      const fileName = path.basename(filePath);

      if (fileName === 'pom.xml') {
        // Parse Maven pom.xml
        const result: any = await parseXml(content);
        
        if (result.project && result.project.dependencies) {
          const deps = result.project.dependencies[0].dependency || [];
          
          for (const dep of deps) {
            const groupId = dep.groupId?.[0] || '';
            const artifactId = dep.artifactId?.[0] || '';
            const version = dep.version?.[0] || '*';
            const scope = dep.scope?.[0] || 'compile';
            
            if (artifactId) {
              dependencies.push({
                name: groupId ? `${groupId}:${artifactId}` : artifactId,
                version: this.cleanVersion(version),
                type: scope === 'test' ? 'dev' : 'runtime',
              });
            }
          }
        }
      } else if (fileName === 'build.gradle') {
        // Parse Gradle build.gradle (simplified parsing)
        const lines = content.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          
          // Match dependency declarations
          // e.g., implementation 'group:artifact:version'
          // e.g., testImplementation 'group:artifact:version'
          const match = trimmed.match(/(implementation|api|compile|testImplementation|testCompile)\s+['"]([^'"]+)['"]/);
          
          if (match) {
            const scope = match[1];
            const depString = match[2];
            const parts = depString.split(':');
            
            if (parts.length >= 2) {
              const name = parts.length === 3 ? `${parts[0]}:${parts[1]}` : parts[0];
              const version = parts.length === 3 ? parts[2] : (parts.length === 2 ? parts[1] : '*');
              
              dependencies.push({
                name,
                version: this.cleanVersion(version),
                type: scope.includes('test') ? 'dev' : 'runtime',
              });
            }
          }
        }
      }

      return dependencies;
    } catch (error) {
      throw new Error(`Failed to parse Java dependencies: ${error}`);
    }
  }

  /**
   * Detect frameworks based on file patterns
   */
  async detectFrameworks(files: string[]): Promise<Framework[]> {
    const frameworks: Framework[] = [];
    const detectedFrameworks = new Set<string>();

    // Framework detection patterns
    const frameworkPatterns = [
      // JavaScript/TypeScript frameworks
      { name: 'React', files: ['package.json'], dependencies: ['react'], confidence: 0.9 },
      { name: 'Vue', files: ['package.json'], dependencies: ['vue'], confidence: 0.9 },
      { name: 'Angular', files: ['package.json', 'angular.json'], dependencies: ['@angular/core'], confidence: 0.9 },
      { name: 'Next.js', files: ['package.json'], dependencies: ['next'], confidence: 0.9 },
      { name: 'Express', files: ['package.json'], dependencies: ['express'], confidence: 0.8 },
      { name: 'NestJS', files: ['package.json'], dependencies: ['@nestjs/core'], confidence: 0.9 },
      
      // Python frameworks
      { name: 'Django', files: ['manage.py', 'requirements.txt'], dependencies: ['django'], confidence: 0.9 },
      { name: 'Flask', files: ['requirements.txt'], dependencies: ['flask'], confidence: 0.8 },
      { name: 'FastAPI', files: ['requirements.txt'], dependencies: ['fastapi'], confidence: 0.8 },
      
      // Java frameworks
      { name: 'Spring Boot', files: ['pom.xml'], dependencies: ['spring-boot'], confidence: 0.9 },
      { name: 'Spring', files: ['pom.xml'], dependencies: ['spring-core'], confidence: 0.8 },
      
      // Ruby frameworks
      { name: 'Rails', files: ['Gemfile'], dependencies: ['rails'], confidence: 0.9 },
      
      // PHP frameworks
      { name: 'Laravel', files: ['composer.json'], dependencies: ['laravel/framework'], confidence: 0.9 },
      { name: 'Symfony', files: ['composer.json'], dependencies: ['symfony/symfony'], confidence: 0.9 },
    ];

    // Check for framework-specific files
    const fileNames = files.map(f => path.basename(f));
    const fileSet = new Set(fileNames);

    for (const pattern of frameworkPatterns) {
      // Check if framework-specific files exist
      const hasFiles = pattern.files.some(f => fileSet.has(f));
      
      if (hasFiles && !detectedFrameworks.has(pattern.name)) {
        // Try to detect version from dependency files
        let version: string | null = null;
        let foundDependency = false;
        
        for (const file of files) {
          const fileName = path.basename(file);
          
          try {
            if (fileName === 'package.json' && pattern.dependencies.length > 0) {
              const content = await fs.readFile(file, 'utf-8');
              const packageJson = JSON.parse(content);
              
              for (const dep of pattern.dependencies) {
                if (packageJson.dependencies?.[dep]) {
                  version = this.cleanVersion(packageJson.dependencies[dep]);
                  foundDependency = true;
                  break;
                } else if (packageJson.devDependencies?.[dep]) {
                  version = this.cleanVersion(packageJson.devDependencies[dep]);
                  foundDependency = true;
                  break;
                }
              }
            } else if ((fileName === 'requirements.txt' || fileName === 'Pipfile') && pattern.dependencies.length > 0) {
              const content = await fs.readFile(file, 'utf-8');
              
              for (const dep of pattern.dependencies) {
                const regex = new RegExp(`${dep}[=<>!]+([\\d.]+)`, 'i');
                const match = content.match(regex);
                
                if (match) {
                  version = match[1];
                  foundDependency = true;
                  break;
                }
              }
            } else if (fileName === 'pom.xml' && pattern.dependencies.length > 0) {
              const content = await fs.readFile(file, 'utf-8');
              
              for (const dep of pattern.dependencies) {
                const regex = new RegExp(`<artifactId>${dep}</artifactId>\\s*<version>([^<]+)</version>`, 'i');
                const match = content.match(regex);
                
                if (match) {
                  version = match[1];
                  foundDependency = true;
                  break;
                }
              }
            }
          } catch (error) {
            // Skip files that can't be read
            continue;
          }
        }

        // Only add framework if we found the dependency
        if (foundDependency) {
          frameworks.push({
            name: pattern.name,
            version,
            confidence: pattern.confidence,
          });
          
          detectedFrameworks.add(pattern.name);
        }
      }
    }

    return frameworks;
  }

  /**
   * Helper: Find all dependency files in directory
   */
  private async findDependencyFiles(directory: string): Promise<string[]> {
    const dependencyFiles: string[] = [];
    const targetFiles = [
      'package.json',
      'requirements.txt',
      'Pipfile',
      'pom.xml',
      'build.gradle',
      'composer.json',
      'Gemfile',
    ];

    try {
      await this.searchFiles(directory, targetFiles, dependencyFiles);
    } catch (error) {
      // Return empty array on error
    }

    return dependencyFiles;
  }

  /**
   * Helper: Recursively search for specific files
   */
  private async searchFiles(
    directory: string,
    targetFiles: string[],
    results: string[],
    maxDepth: number = 5,
    currentDepth: number = 0
  ): Promise<void> {
    if (currentDepth > maxDepth) {
      return;
    }

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        // Skip node_modules, .git, and other common directories
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', '.svn', 'dist', 'build', 'target', '__pycache__'].includes(entry.name)) {
            await this.searchFiles(fullPath, targetFiles, results, maxDepth, currentDepth + 1);
          }
        } else if (entry.isFile() && targetFiles.includes(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  /**
   * Helper: Get all files in directory recursively
   */
  private async getAllFiles(directory: string, maxDepth: number = 5, currentDepth: number = 0): Promise<string[]> {
    const files: string[] = [];

    if (currentDepth > maxDepth) {
      return files;
    }

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          if (!['node_modules', '.git', '.svn', 'dist', 'build', 'target', '__pycache__'].includes(entry.name)) {
            const subFiles = await this.getAllFiles(fullPath, maxDepth, currentDepth + 1);
            files.push(...subFiles);
          }
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }

    return files;
  }

  /**
   * Helper: Clean version string (remove ^, ~, etc.)
   */
  private cleanVersion(version: string): string {
    return version.replace(/^[\^~>=<]+/, '').trim();
  }
}
