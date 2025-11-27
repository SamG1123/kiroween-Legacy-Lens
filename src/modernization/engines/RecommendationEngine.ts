import { v4 as uuidv4 } from 'uuid';
import {
  DependencyAnalysis,
  FrameworkAnalysis,
  PatternAnalysis,
  Recommendation,
  Priority,
} from '../types';

/**
 * RecommendationEngine generates modernization recommendations from analysis results
 * Validates: Requirements 4.1, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5
 */
export class RecommendationEngine {
  /**
   * Generate all recommendations from analysis results
   * @param dependencyAnalysis - Results from dependency analysis
   * @param frameworkAnalysis - Results from framework analysis
   * @param patternAnalysis - Results from pattern analysis
   * @returns Array of recommendations
   */
  generateRecommendations(
    dependencyAnalysis: DependencyAnalysis[],
    frameworkAnalysis: FrameworkAnalysis[],
    patternAnalysis: PatternAnalysis[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Create dependency recommendations
    for (const analysis of dependencyAnalysis) {
      const recommendation = this.createDependencyRecommendation(analysis);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Create framework recommendations
    for (const analysis of frameworkAnalysis) {
      const recommendation = this.createFrameworkRecommendation(analysis);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Create pattern recommendations
    for (const analysis of patternAnalysis) {
      const recommendation = this.createPatternRecommendation(analysis);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Create a recommendation from dependency analysis
   * Validates: Requirements 4.1, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5
   */
  createDependencyRecommendation(analysis: DependencyAnalysis): Recommendation | null {
    const { dependency, currentVersion, latestVersion, updateCategory, isDeprecated, vulnerabilities } = analysis;

    // Skip if already on latest version and no issues
    if (currentVersion === latestVersion && !isDeprecated && vulnerabilities.length === 0) {
      return null;
    }

    // Calculate priority based on security and deprecation
    const priority = this.calculateDependencyPriority(analysis);

    // Build benefits list
    const benefits = this.buildDependencyBenefits(analysis);

    // Build migration steps
    const migrationSteps = this.buildDependencyMigrationSteps(analysis);

    // Build resources
    const resources = this.buildDependencyResources(analysis);

    // Determine automated tools
    const automatedTools = this.getDependencyAutomatedTools(dependency.ecosystem);

    return {
      id: uuidv4(),
      type: 'dependency',
      title: `Update ${dependency.name} from ${currentVersion} to ${latestVersion}`,
      description: this.buildDependencyDescription(analysis),
      currentState: `${dependency.name}@${currentVersion}`,
      suggestedState: `${dependency.name}@${latestVersion}`,
      benefits,
      effort: this.estimateDependencyEffort(analysis),
      priority,
      migrationSteps,
      resources,
      automatedTools,
    };
  }

  /**
   * Create a recommendation from framework analysis
   * Validates: Requirements 4.1, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5
   */
  createFrameworkRecommendation(analysis: FrameworkAnalysis): Recommendation | null {
    const { framework, currentVersion, latestVersion, breakingChanges, migrationGuide, effortEstimate } = analysis;

    // Skip if already on latest version
    if (currentVersion === latestVersion) {
      return null;
    }

    // Framework upgrades are typically high priority
    const priority: Priority = breakingChanges.length > 0 ? 'high' : 'medium';

    // Build benefits list
    const benefits = this.buildFrameworkBenefits(analysis);

    // Build migration steps
    const migrationSteps = this.buildFrameworkMigrationSteps(analysis);

    // Build resources
    const resources = this.buildFrameworkResources(analysis);

    return {
      id: uuidv4(),
      type: 'framework',
      title: `Upgrade ${framework.name} from ${currentVersion} to ${latestVersion}`,
      description: this.buildFrameworkDescription(analysis),
      currentState: `${framework.name}@${currentVersion}`,
      suggestedState: `${framework.name}@${latestVersion}`,
      benefits,
      effort: effortEstimate,
      priority,
      migrationSteps,
      codeExamples: this.buildFrameworkCodeExamples(analysis),
      resources,
      automatedTools: migrationGuide.automatedTools,
    };
  }

  /**
   * Create a recommendation from pattern analysis
   * Validates: Requirements 4.1, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5
   */
  createPatternRecommendation(analysis: PatternAnalysis): Recommendation | null {
    const { pattern, occurrences, modernAlternative, benefits, migrationComplexity } = analysis;

    // Skip if no occurrences
    if (occurrences.length === 0) {
      return null;
    }

    // Pattern modernization is typically medium priority
    const priority: Priority = 'medium';

    // Build migration steps
    const migrationSteps = this.buildPatternMigrationSteps(analysis);

    // Build resources
    const resources = this.buildPatternResources(pattern);

    // Get code examples from first occurrence
    const codeExamples = this.buildPatternCodeExamples(analysis);

    return {
      id: uuidv4(),
      type: 'pattern',
      title: `Modernize ${this.formatPatternName(pattern)} (${occurrences.length} occurrence${occurrences.length > 1 ? 's' : ''})`,
      description: this.buildPatternDescription(analysis),
      currentState: pattern,
      suggestedState: modernAlternative,
      benefits,
      effort: migrationComplexity,
      priority,
      migrationSteps,
      codeExamples,
      resources,
      automatedTools: this.getPatternAutomatedTools(pattern),
    };
  }

  // Private helper methods for building recommendation details

  private calculateDependencyPriority(analysis: DependencyAnalysis): Priority {
    const { vulnerabilities, isDeprecated, updateCategory } = analysis;

    // Critical vulnerabilities get critical priority
    if (vulnerabilities.some(v => v.severity === 'critical')) {
      return 'critical';
    }

    // High severity vulnerabilities get critical priority
    if (vulnerabilities.some(v => v.severity === 'high')) {
      return 'critical';
    }

    // Deprecated packages get high priority
    if (isDeprecated) {
      return 'high';
    }

    // Medium/low vulnerabilities get high priority
    if (vulnerabilities.length > 0) {
      return 'high';
    }

    // Major updates get medium priority
    if (updateCategory === 'major') {
      return 'medium';
    }

    // Minor/patch updates get low priority
    return 'low';
  }

  private buildDependencyDescription(analysis: DependencyAnalysis): string {
    const { dependency, isDeprecated, vulnerabilities, updateCategory } = analysis;
    
    const parts: string[] = [];

    if (vulnerabilities.length > 0) {
      const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
      const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
      
      if (criticalCount > 0) {
        parts.push(`Contains ${criticalCount} critical security ${criticalCount === 1 ? 'vulnerability' : 'vulnerabilities'}.`);
      }
      if (highCount > 0) {
        parts.push(`Contains ${highCount} high severity security ${highCount === 1 ? 'vulnerability' : 'vulnerabilities'}.`);
      }
      if (criticalCount === 0 && highCount === 0) {
        parts.push(`Contains ${vulnerabilities.length} security ${vulnerabilities.length === 1 ? 'vulnerability' : 'vulnerabilities'}.`);
      }
    }

    if (isDeprecated) {
      parts.push(`This package is deprecated and should be replaced.`);
      if (analysis.deprecationInfo?.reason) {
        parts.push(analysis.deprecationInfo.reason);
      }
    }

    if (parts.length === 0) {
      parts.push(`A ${updateCategory} version update is available for ${dependency.name}.`);
    }

    return parts.join(' ');
  }

  private buildDependencyBenefits(analysis: DependencyAnalysis): string[] {
    const benefits: string[] = [];
    const { vulnerabilities, isDeprecated, updateCategory } = analysis;

    // Security benefits
    if (vulnerabilities.length > 0) {
      const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
      const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
      
      if (criticalCount > 0 || highCount > 0) {
        benefits.push(`Fixes ${vulnerabilities.length} security ${vulnerabilities.length === 1 ? 'vulnerability' : 'vulnerabilities'}, including ${criticalCount + highCount} critical/high severity ${criticalCount + highCount === 1 ? 'issue' : 'issues'}`);
      } else {
        benefits.push(`Addresses ${vulnerabilities.length} security ${vulnerabilities.length === 1 ? 'vulnerability' : 'vulnerabilities'}`);
      }
      
      benefits.push('Improves application security posture');
      benefits.push('Reduces risk of security breaches');
    }

    // Deprecation benefits
    if (isDeprecated) {
      benefits.push('Replaces deprecated package with maintained alternative');
      benefits.push('Ensures continued support and updates');
      benefits.push('Aligns with current ecosystem best practices');
    }

    // Version update benefits
    if (!isDeprecated && vulnerabilities.length === 0) {
      if (updateCategory === 'major') {
        benefits.push('Access to new features and capabilities');
        benefits.push('Improved performance and efficiency');
        benefits.push('Better compatibility with modern tooling');
      } else if (updateCategory === 'minor') {
        benefits.push('Access to new features while maintaining compatibility');
        benefits.push('Bug fixes and improvements');
        benefits.push('Enhanced functionality');
      } else {
        benefits.push('Bug fixes and stability improvements');
        benefits.push('Patch-level security updates');
        benefits.push('Minimal risk update');
      }
    }

    // Always include best practices alignment
    if (benefits.length > 0) {
      benefits.push('Keeps dependencies up-to-date with industry standards');
    }

    return benefits;
  }

  private buildDependencyMigrationSteps(analysis: DependencyAnalysis): string[] {
    const { dependency, currentVersion, latestVersion, updateCategory, isDeprecated } = analysis;
    const steps: string[] = [];

    if (isDeprecated && analysis.alternatives && analysis.alternatives.length > 0) {
      // Migration for deprecated packages
      steps.push(`Review the recommended alternatives: ${analysis.alternatives.join(', ')}`);
      steps.push('Choose the most suitable replacement based on your use case');
      steps.push(`Update imports and references from ${dependency.name} to the chosen alternative`);
      steps.push('Update package.json to remove the deprecated package and add the replacement');
      steps.push('Run your package manager install command');
      steps.push('Update code to match the new package API');
      steps.push('Run all tests to verify functionality');
      steps.push('Review and update documentation');
    } else {
      // Standard version update
      steps.push(`Review the changelog for ${dependency.name} from ${currentVersion} to ${latestVersion}`);
      
      if (updateCategory === 'major') {
        steps.push('Check for breaking changes in the release notes');
        steps.push('Review migration guide if available');
      }
      
      steps.push(`Update ${dependency.name} version in package.json to ${latestVersion}`);
      steps.push('Run your package manager install command (npm install, yarn install, etc.)');
      
      if (updateCategory === 'major') {
        steps.push('Update code to handle any breaking changes');
        steps.push('Update type definitions if using TypeScript');
      }
      
      steps.push('Run all tests to verify compatibility');
      steps.push('Test the application manually in development environment');
      
      if (analysis.vulnerabilities.length > 0) {
        steps.push('Verify that security vulnerabilities are resolved using security audit tools');
      }
      
      steps.push('Deploy to staging environment for further testing');
      steps.push('Monitor for any issues after deployment');
    }

    return steps;
  }

  private buildDependencyResources(analysis: DependencyAnalysis): string[] {
    const { dependency } = analysis;
    const resources: string[] = [];

    // Add package-specific resources based on ecosystem
    switch (dependency.ecosystem) {
      case 'npm':
        resources.push(`https://www.npmjs.com/package/${dependency.name}`);
        resources.push(`https://github.com/search?q=${encodeURIComponent(dependency.name)}&type=repositories`);
        break;
      case 'pypi':
        resources.push(`https://pypi.org/project/${dependency.name}/`);
        break;
      case 'maven':
        const [groupId, artifactId] = dependency.name.split(':');
        if (groupId && artifactId) {
          resources.push(`https://mvnrepository.com/artifact/${groupId}/${artifactId}`);
        }
        break;
    }

    // Add vulnerability resources
    if (analysis.vulnerabilities.length > 0) {
      for (const vuln of analysis.vulnerabilities) {
        if (vuln.references && vuln.references.length > 0) {
          resources.push(...vuln.references);
        }
      }
    }

    // Add deprecation resources
    if (analysis.isDeprecated && analysis.alternatives && analysis.alternatives.length > 0) {
      for (const alt of analysis.alternatives) {
        if (dependency.ecosystem === 'npm') {
          resources.push(`https://www.npmjs.com/package/${alt}`);
        }
      }
    }

    return [...new Set(resources)]; // Remove duplicates
  }

  private getDependencyAutomatedTools(ecosystem: string): string[] {
    const tools: Record<string, string[]> = {
      npm: ['npm update', 'npm-check-updates', 'yarn upgrade', 'pnpm update'],
      pypi: ['pip install --upgrade', 'poetry update', 'pipenv update'],
      maven: ['mvn versions:use-latest-versions', 'mvn versions:update-properties'],
      rubygems: ['bundle update'],
    };

    return tools[ecosystem] || [];
  }

  private estimateDependencyEffort(analysis: DependencyAnalysis): 'low' | 'medium' | 'high' {
    const { updateCategory, isDeprecated, vulnerabilities } = analysis;

    // Deprecated packages require more effort
    if (isDeprecated) {
      return 'high';
    }

    // Major updates typically require more effort
    if (updateCategory === 'major') {
      return 'medium';
    }

    // Security fixes might require testing but are usually straightforward
    if (vulnerabilities.length > 0) {
      return 'low';
    }

    // Minor and patch updates are typically low effort
    return 'low';
  }

  private buildFrameworkDescription(analysis: FrameworkAnalysis): string {
    const { framework, currentVersion, latestVersion, breakingChanges } = analysis;
    
    const parts: string[] = [];
    parts.push(`Upgrade ${framework.name} from version ${currentVersion} to ${latestVersion}.`);

    if (breakingChanges.length > 0) {
      parts.push(`This upgrade includes ${breakingChanges.length} breaking ${breakingChanges.length === 1 ? 'change' : 'changes'} that will require code modifications.`);
    } else {
      parts.push('This upgrade maintains backward compatibility.');
    }

    return parts.join(' ');
  }

  private buildFrameworkBenefits(analysis: FrameworkAnalysis): string[] {
    const { framework, breakingChanges } = analysis;
    const benefits: string[] = [];

    // Generic framework upgrade benefits
    benefits.push('Access to latest features and improvements');
    benefits.push('Enhanced performance and optimization');
    benefits.push('Improved security with latest patches');
    benefits.push('Better developer experience and tooling support');
    benefits.push('Continued community support and updates');
    benefits.push('Compatibility with modern ecosystem packages');

    // Add framework-specific benefits
    const frameworkName = framework.name.toLowerCase();
    if (frameworkName === 'react') {
      benefits.push('Improved concurrent rendering capabilities');
      benefits.push('Better TypeScript support');
    } else if (frameworkName === 'vue') {
      benefits.push('Enhanced Composition API features');
      benefits.push('Better TypeScript integration');
    } else if (frameworkName === 'angular') {
      benefits.push('Improved build performance with Ivy');
      benefits.push('Smaller bundle sizes');
    }

    if (breakingChanges.length === 0) {
      benefits.push('Smooth upgrade path with no breaking changes');
    }

    benefits.push('Aligns with industry best practices and standards');

    return benefits;
  }

  private buildFrameworkMigrationSteps(analysis: FrameworkAnalysis): string[] {
    const { framework, currentVersion, latestVersion, breakingChanges, migrationGuide } = analysis;
    const steps: string[] = [];

    // Use official migration guide steps if available
    if (migrationGuide.steps && migrationGuide.steps.length > 0) {
      return migrationGuide.steps;
    }

    // Generic migration steps
    steps.push(`Review the ${framework.name} changelog from ${currentVersion} to ${latestVersion}`);
    
    if (migrationGuide.url) {
      steps.push(`Read the official migration guide: ${migrationGuide.url}`);
    }

    if (breakingChanges.length > 0) {
      steps.push('Review all breaking changes and their impact on your codebase');
      for (const change of breakingChanges) {
        steps.push(`Address breaking change: ${change.description}`);
      }
    }

    steps.push(`Update ${framework.name} version in your package manager configuration`);
    steps.push('Install updated dependencies');

    if (migrationGuide.automatedTools.length > 0) {
      steps.push(`Run automated migration tools: ${migrationGuide.automatedTools.join(', ')}`);
    }

    steps.push('Update code to handle any API changes');
    steps.push('Update configuration files if needed');
    steps.push('Run all tests to verify functionality');
    steps.push('Test the application thoroughly in development');
    steps.push('Update documentation to reflect framework version');
    steps.push('Deploy to staging for integration testing');

    return steps;
  }

  private buildFrameworkResources(analysis: FrameworkAnalysis): string[] {
    const { framework, migrationGuide } = analysis;
    const resources: string[] = [];

    if (migrationGuide.url) {
      resources.push(migrationGuide.url);
    }

    // Add framework-specific resources
    const frameworkName = framework.name.toLowerCase();
    const resourceMap: Record<string, string[]> = {
      react: [
        'https://react.dev',
        'https://react.dev/blog',
        'https://github.com/facebook/react/blob/main/CHANGELOG.md',
      ],
      vue: [
        'https://vuejs.org',
        'https://v3-migration.vuejs.org/',
        'https://github.com/vuejs/core/blob/main/CHANGELOG.md',
      ],
      angular: [
        'https://angular.io',
        'https://update.angular.io/',
        'https://github.com/angular/angular/blob/main/CHANGELOG.md',
      ],
      next: [
        'https://nextjs.org',
        'https://nextjs.org/docs/upgrading',
        'https://github.com/vercel/next.js/releases',
      ],
      express: [
        'https://expressjs.com',
        'https://github.com/expressjs/express/blob/master/History.md',
      ],
    };

    if (resourceMap[frameworkName]) {
      resources.push(...resourceMap[frameworkName]);
    }

    return [...new Set(resources)]; // Remove duplicates
  }

  private buildFrameworkCodeExamples(analysis: FrameworkAnalysis): { before: string; after: string } | undefined {
    const { breakingChanges } = analysis;

    // If there are breaking changes, show an example from the first one
    if (breakingChanges.length > 0 && breakingChanges[0].migrationPath) {
      return {
        before: `// Before: ${breakingChanges[0].description}`,
        after: `// After: ${breakingChanges[0].migrationPath}`,
      };
    }

    return undefined;
  }

  private buildPatternDescription(analysis: PatternAnalysis): string {
    const { pattern, occurrences, modernAlternative } = analysis;
    
    return `Found ${occurrences.length} ${occurrences.length === 1 ? 'instance' : 'instances'} of ${this.formatPatternName(pattern)} that can be modernized to ${modernAlternative}.`;
  }

  private buildPatternMigrationSteps(analysis: PatternAnalysis): string[] {
    const { pattern, occurrences } = analysis;
    const steps: string[] = [];

    steps.push(`Review all ${occurrences.length} ${occurrences.length === 1 ? 'occurrence' : 'occurrences'} of the pattern`);
    steps.push('Understand the current implementation and its dependencies');
    steps.push('Review the suggested modern alternative and its benefits');
    
    if (pattern === 'callback-pattern') {
      steps.push('Convert callback-based functions to return Promises');
      steps.push('Update calling code to use async/await or .then()');
      steps.push('Update error handling to use try/catch or .catch()');
    } else if (pattern === 'var-declaration') {
      steps.push('Replace var with const for variables that are not reassigned');
      steps.push('Replace var with let for variables that are reassigned');
      steps.push('Verify block scoping behavior is correct');
    } else if (pattern === 'class-component') {
      steps.push('Convert class component to functional component');
      steps.push('Replace state with useState hooks');
      steps.push('Replace lifecycle methods with useEffect hooks');
      steps.push('Update refs to use useRef hook');
      steps.push('Update context usage to use useContext hook');
    } else if (pattern === 'deprecated-feature') {
      steps.push('Replace deprecated feature with modern alternative');
      steps.push('Update any dependent code');
    }

    steps.push('Run tests to verify functionality is preserved');
    steps.push('Review code for any edge cases or side effects');
    steps.push('Update related documentation and comments');

    if (occurrences.length > 10) {
      steps.push('Consider using automated refactoring tools for bulk changes');
    }

    return steps;
  }

  private buildPatternResources(pattern: string): string[] {
    const resources: string[] = [];

    const resourceMap: Record<string, string[]> = {
      'callback-pattern': [
        'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function',
        'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises',
        'https://javascript.info/async-await',
      ],
      'var-declaration': [
        'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let',
        'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const',
        'https://javascript.info/variables',
      ],
      'class-component': [
        'https://react.dev/reference/react/Component',
        'https://react.dev/learn/hooks-intro',
        'https://react.dev/learn/hooks-overview',
      ],
      'deprecated-feature': [
        'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Deprecated_and_obsolete_features',
      ],
    };

    if (resourceMap[pattern]) {
      resources.push(...resourceMap[pattern]);
    }

    return resources;
  }

  private buildPatternCodeExamples(analysis: PatternAnalysis): { before: string; after: string } | undefined {
    const { occurrences } = analysis;

    if (occurrences.length === 0) {
      return undefined;
    }

    // Get the first occurrence as an example
    const firstOccurrence = occurrences[0];
    
    // Get the suggestion for this pattern
    const suggestion = this.getSuggestionForPattern(firstOccurrence.patternType);

    return {
      before: suggestion.beforeCode,
      after: suggestion.afterCode,
    };
  }

  private getSuggestionForPattern(patternType: string): { beforeCode: string; afterCode: string } {
    const suggestions: Record<string, { beforeCode: string; afterCode: string }> = {
      'callback-pattern': {
        beforeCode: `fs.readFile('file.txt', (err, data) => {
  if (err) throw err;
  console.log(data);
});`,
        afterCode: `const data = await fs.promises.readFile('file.txt');
console.log(data);`,
      },
      'var-declaration': {
        beforeCode: `var count = 0;
for (var i = 0; i < 10; i++) {
  var temp = i * 2;
}`,
        afterCode: `let count = 0;
for (let i = 0; i < 10; i++) {
  const temp = i * 2;
}`,
      },
      'class-component': {
        beforeCode: `class MyComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }
  
  render() {
    return <div>{this.state.count}</div>;
  }
}`,
        afterCode: `function MyComponent(props) {
  const [count, setCount] = useState(0);
  
  return <div>{count}</div>;
}`,
      },
      'deprecated-feature': {
        beforeCode: `// Using arguments object
function sum() {
  return Array.from(arguments).reduce((a, b) => a + b);
}`,
        afterCode: `// Using rest parameters
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b);
}`,
      },
    };

    return suggestions[patternType] || {
      beforeCode: '// Current code',
      afterCode: '// Modernized code',
    };
  }

  private getPatternAutomatedTools(pattern: string): string[] {
    const tools: Record<string, string[]> = {
      'callback-pattern': ['lebab', 'jscodeshift'],
      'var-declaration': ['lebab', 'eslint --fix'],
      'class-component': ['react-codemod', 'jscodeshift'],
      'deprecated-feature': ['eslint --fix', 'jscodeshift'],
    };

    return tools[pattern] || [];
  }

  private formatPatternName(pattern: string): string {
    const names: Record<string, string> = {
      'callback-pattern': 'callback-based async code',
      'var-declaration': 'var declarations',
      'class-component': 'class-based React components',
      'deprecated-feature': 'deprecated language features',
    };

    return names[pattern] || pattern;
  }
}
