import { DocumentationSet, APIEndpoint } from '../types';

/**
 * Readability score with metrics and suggestions
 */
export interface ReadabilityScore {
  score: number; // 0-100
  grade: 'excellent' | 'good' | 'fair' | 'poor';
  metrics: {
    avgSentenceLength: number;
    avgWordLength: number;
    complexWords: number;
    totalWords: number;
    totalSentences: number;
  };
  suggestions: string[];
}

/**
 * Completeness check result
 */
export interface CompletenessResult {
  isComplete: boolean;
  score: number; // 0-100
  missingElements: string[];
  suggestions: string[];
}

/**
 * Syntax validation result for code examples
 */
export interface SyntaxValidationResult {
  isValid: boolean;
  errors: Array<{
    line: number;
    language: string;
    message: string;
  }>;
  warnings: string[];
}

/**
 * Consistency verification result
 */
export interface ConsistencyResult {
  isConsistent: boolean;
  issues: Array<{
    type: 'terminology' | 'format' | 'reference';
    severity: 'error' | 'warning';
    message: string;
    locations: string[];
  }>;
}

/**
 * Overall quality assurance report
 */
export interface QualityAssuranceReport {
  readability: {
    overall: ReadabilityScore;
    byDocument: Map<string, ReadabilityScore>;
  };
  completeness: {
    overall: CompletenessResult;
    readme?: CompletenessResult;
    api?: CompletenessResult;
    architecture?: CompletenessResult;
  };
  syntaxValidation: SyntaxValidationResult;
  consistency: ConsistencyResult;
  overallScore: number; // 0-100
  passed: boolean;
  recommendations: string[];
}

/**
 * Quality Assurance system for generated documentation
 * Implements readability scoring, completeness checks, syntax validation, and consistency verification
 */
export class QualityAssurance {
  private readonly READABILITY_THRESHOLDS = {
    excellent: 80,
    good: 60,
    fair: 40,
  };

  private readonly COMPLETENESS_THRESHOLD = 70;
  private readonly OVERALL_PASS_THRESHOLD = 70;

  /**
   * Calculate readability score for documentation text
   * Uses Flesch Reading Ease and other metrics
   */
  calculateReadability(text: string): ReadabilityScore {
    // Remove code blocks to avoid skewing metrics
    const textWithoutCode = this.removeCodeBlocks(text);
    
    // Calculate basic metrics
    const sentences = this.splitIntoSentences(textWithoutCode);
    const words = this.splitIntoWords(textWithoutCode);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    
    const totalSentences = sentences.length || 1;
    const totalWords = words.length || 1;
    const avgSentenceLength = totalWords / totalSentences;
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / totalWords;
    const avgSyllablesPerWord = syllables / totalWords;
    
    // Count complex words (3+ syllables)
    const complexWords = words.filter(w => this.countSyllables(w) >= 3).length;
    
    // Calculate Flesch Reading Ease score
    // Formula: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
    let fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    
    // Normalize to 0-100 range
    fleschScore = Math.max(0, Math.min(100, fleschScore));
    
    // Determine grade
    let grade: 'excellent' | 'good' | 'fair' | 'poor';
    if (fleschScore >= this.READABILITY_THRESHOLDS.excellent) {
      grade = 'excellent';
    } else if (fleschScore >= this.READABILITY_THRESHOLDS.good) {
      grade = 'good';
    } else if (fleschScore >= this.READABILITY_THRESHOLDS.fair) {
      grade = 'fair';
    } else {
      grade = 'poor';
    }
    
    // Generate suggestions
    const suggestions: string[] = [];
    if (avgSentenceLength > 25) {
      suggestions.push('Consider breaking long sentences into shorter ones (average sentence length is high)');
    }
    if (complexWords / totalWords > 0.15) {
      suggestions.push('Consider using simpler words where possible (high percentage of complex words)');
    }
    if (avgWordLength > 6) {
      suggestions.push('Consider using shorter words to improve readability');
    }
    
    return {
      score: Math.round(fleschScore),
      grade,
      metrics: {
        avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
        avgWordLength: Math.round(avgWordLength * 10) / 10,
        complexWords,
        totalWords,
        totalSentences,
      },
      suggestions,
    };
  }

  /**
   * Check README completeness
   */
  checkREADMECompleteness(readme: string): CompletenessResult {
    const requiredSections = [
      { names: ['title', '#'], pattern: /^#\s+.+/m },
      { names: ['description', 'overview', 'about'], pattern: /##\s*(description|overview|about)/i },
      { names: ['installation', 'getting started', 'setup'], pattern: /##\s*(installation|getting started|setup)/i },
      { names: ['usage', 'how to use', 'examples'], pattern: /##\s*(usage|how to use|examples)/i },
      { names: ['project structure', 'structure', 'directory structure'], pattern: /##\s*(project structure|structure|directory)/i },
    ];
    
    const missingElements: string[] = [];
    let foundCount = 0;
    
    for (const section of requiredSections) {
      if (section.pattern.test(readme)) {
        foundCount++;
      } else {
        missingElements.push(section.names[0]);
      }
    }
    
    const score = Math.round((foundCount / requiredSections.length) * 100);
    const isComplete = score === 100;
    
    const suggestions: string[] = [];
    if (missingElements.length > 0) {
      suggestions.push(`Add missing sections: ${missingElements.join(', ')}`);
    }
    
    return {
      isComplete,
      score,
      missingElements,
      suggestions,
    };
  }

  /**
   * Check API documentation completeness
   */
  checkAPICompleteness(apiDoc: string, endpoints: APIEndpoint[]): CompletenessResult {
    const missingElements: string[] = [];
    let documentedCount = 0;
    
    for (const endpoint of endpoints) {
      const endpointPattern = new RegExp(`${endpoint.method}\\s+${endpoint.path.replace(/\//g, '\\/')}`, 'i');
      
      if (endpointPattern.test(apiDoc)) {
        documentedCount++;
        
        // Check for required subsections
        const endpointSection = this.extractEndpointSection(apiDoc, endpoint);
        if (endpointSection) {
          if (!/parameters?:/i.test(endpointSection)) {
            missingElements.push(`${endpoint.method} ${endpoint.path}: parameters section`);
          }
          if (!/response/i.test(endpointSection)) {
            missingElements.push(`${endpoint.method} ${endpoint.path}: response section`);
          }
          if (!/example/i.test(endpointSection)) {
            missingElements.push(`${endpoint.method} ${endpoint.path}: example`);
          }
        }
      } else {
        missingElements.push(`${endpoint.method} ${endpoint.path}`);
      }
    }
    
    const score = endpoints.length > 0 
      ? Math.round((documentedCount / endpoints.length) * 100)
      : 100;
    
    const isComplete = missingElements.length === 0;
    
    const suggestions: string[] = [];
    if (missingElements.length > 0) {
      suggestions.push(`Document missing endpoints or sections: ${missingElements.slice(0, 3).join(', ')}${missingElements.length > 3 ? '...' : ''}`);
    }
    
    return {
      isComplete,
      score,
      missingElements,
      suggestions,
    };
  }

  /**
   * Check architecture documentation completeness
   */
  checkArchitectureCompleteness(archDoc: string): CompletenessResult {
    const requiredElements = [
      { name: 'overview', pattern: /##\s*overview/i },
      { name: 'components', pattern: /##\s*components?/i },
      { name: 'diagram', pattern: /```mermaid/i },
      { name: 'data flow', pattern: /(data\s+flow|flow)/i },
      { name: 'patterns', pattern: /(pattern|architecture)/i },
    ];
    
    const missingElements: string[] = [];
    let foundCount = 0;
    
    for (const element of requiredElements) {
      if (element.pattern.test(archDoc)) {
        foundCount++;
      } else {
        missingElements.push(element.name);
      }
    }
    
    const score = Math.round((foundCount / requiredElements.length) * 100);
    const isComplete = score === 100;
    
    const suggestions: string[] = [];
    if (missingElements.length > 0) {
      suggestions.push(`Add missing architecture elements: ${missingElements.join(', ')}`);
    }
    
    return {
      isComplete,
      score,
      missingElements,
      suggestions,
    };
  }

  /**
   * Validate syntax of code examples in documentation
   */
  validateCodeExamples(doc: string): SyntaxValidationResult {
    const codeBlocks = this.extractCodeBlocks(doc);
    const errors: Array<{ line: number; language: string; message: string }> = [];
    const warnings: string[] = [];
    
    for (const block of codeBlocks) {
      // Skip non-code languages
      if (['mermaid', 'text', 'plain', ''].includes(block.language.toLowerCase())) {
        continue;
      }
      
      // Validate based on language
      switch (block.language.toLowerCase()) {
        case 'json':
          try {
            JSON.parse(block.code);
          } catch (e: any) {
            errors.push({
              line: block.line,
              language: block.language,
              message: `Invalid JSON: ${e.message}`,
            });
          }
          break;
          
        case 'javascript':
        case 'typescript':
        case 'js':
        case 'ts':
          // Basic syntax checks for JS/TS
          const jsErrors = this.validateJavaScript(block.code);
          jsErrors.forEach(err => {
            errors.push({
              line: block.line,
              language: block.language,
              message: err,
            });
          });
          break;
          
        default:
          // For other languages, just check if it's not empty
          if (block.code.trim().length === 0) {
            warnings.push(`Empty code block at line ${block.line} (${block.language})`);
          }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Verify consistency across documentation files
   */
  verifyConsistency(docs: DocumentationSet): ConsistencyResult {
    const issues: Array<{
      type: 'terminology' | 'format' | 'reference';
      severity: 'error' | 'warning';
      message: string;
      locations: string[];
    }> = [];
    
    // Check terminology consistency
    const terminologyIssues = this.checkTerminologyConsistency(docs);
    issues.push(...terminologyIssues);
    
    // Check format consistency
    const formatIssues = this.checkFormatConsistency(docs);
    issues.push(...formatIssues);
    
    // Check reference consistency
    const referenceIssues = this.checkReferenceConsistency(docs);
    issues.push(...referenceIssues);
    
    const errorCount = issues.filter(i => i.severity === 'error').length;
    
    return {
      isConsistent: errorCount === 0,
      issues,
    };
  }

  /**
   * Generate comprehensive quality assurance report
   */
  generateReport(docs: DocumentationSet, endpoints?: APIEndpoint[]): QualityAssuranceReport {
    // Calculate readability for each document
    const readabilityByDoc = new Map<string, ReadabilityScore>();
    const allText: string[] = [];
    
    if (docs.readme) {
      const readmeScore = this.calculateReadability(docs.readme);
      readabilityByDoc.set('readme', readmeScore);
      allText.push(docs.readme);
    }
    
    if (docs.api) {
      const apiScore = this.calculateReadability(docs.api);
      readabilityByDoc.set('api', apiScore);
      allText.push(docs.api);
    }
    
    if (docs.architecture) {
      const archScore = this.calculateReadability(docs.architecture);
      readabilityByDoc.set('architecture', archScore);
      allText.push(docs.architecture);
    }
    
    // Calculate overall readability
    const overallReadability = this.calculateReadability(allText.join('\n\n'));
    
    // Check completeness
    const completeness: any = {
      overall: { isComplete: true, score: 100, missingElements: [], suggestions: [] },
    };
    
    if (docs.readme) {
      completeness.readme = this.checkREADMECompleteness(docs.readme);
    }
    
    if (docs.api && endpoints) {
      completeness.api = this.checkAPICompleteness(docs.api, endpoints);
    }
    
    if (docs.architecture) {
      completeness.architecture = this.checkArchitectureCompleteness(docs.architecture);
    }
    
    // Calculate overall completeness
    const completenessScores = [
      completeness.readme?.score,
      completeness.api?.score,
      completeness.architecture?.score,
    ].filter((s): s is number => s !== undefined);
    
    if (completenessScores.length > 0) {
      const avgCompleteness = completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length;
      completeness.overall = {
        isComplete: avgCompleteness === 100,
        score: Math.round(avgCompleteness),
        missingElements: [
          ...(completeness.readme?.missingElements || []),
          ...(completeness.api?.missingElements || []),
          ...(completeness.architecture?.missingElements || []),
        ],
        suggestions: [
          ...(completeness.readme?.suggestions || []),
          ...(completeness.api?.suggestions || []),
          ...(completeness.architecture?.suggestions || []),
        ],
      };
    }
    
    // Validate syntax
    const allDocs = [docs.readme, docs.api, docs.architecture].filter(Boolean).join('\n\n');
    const syntaxValidation = this.validateCodeExamples(allDocs);
    
    // Verify consistency
    const consistency = this.verifyConsistency(docs);
    
    // Calculate overall score
    const readabilityWeight = 0.25;
    const completenessWeight = 0.35;
    const syntaxWeight = 0.20;
    const consistencyWeight = 0.20;
    
    const syntaxScore = syntaxValidation.isValid ? 100 : Math.max(0, 100 - (syntaxValidation.errors.length * 10));
    const consistencyScore = consistency.isConsistent ? 100 : Math.max(0, 100 - (consistency.issues.filter(i => i.severity === 'error').length * 10));
    
    const overallScore = Math.round(
      overallReadability.score * readabilityWeight +
      completeness.overall.score * completenessWeight +
      syntaxScore * syntaxWeight +
      consistencyScore * consistencyWeight
    );
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (overallReadability.score < this.READABILITY_THRESHOLDS.good) {
      recommendations.push('Improve readability by simplifying language and shortening sentences');
    }
    
    if (completeness.overall.score < this.COMPLETENESS_THRESHOLD) {
      recommendations.push('Add missing documentation sections to improve completeness');
    }
    
    if (!syntaxValidation.isValid) {
      recommendations.push('Fix syntax errors in code examples');
    }
    
    if (!consistency.isConsistent) {
      recommendations.push('Address consistency issues across documentation files');
    }
    
    return {
      readability: {
        overall: overallReadability,
        byDocument: readabilityByDoc,
      },
      completeness,
      syntaxValidation,
      consistency,
      overallScore,
      passed: overallScore >= this.OVERALL_PASS_THRESHOLD,
      recommendations,
    };
  }

  // Helper methods

  private removeCodeBlocks(text: string): string {
    return text.replace(/```[\s\S]*?```/g, '');
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private splitIntoWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    // Count vowel groups
    const vowels = word.match(/[aeiouy]+/g);
    let count = vowels ? vowels.length : 1;
    
    // Adjust for silent e
    if (word.endsWith('e')) {
      count--;
    }
    
    // Ensure at least 1 syllable
    return Math.max(1, count);
  }

  private extractCodeBlocks(doc: string): Array<{ language: string; code: string; line: number }> {
    const blocks: Array<{ language: string; code: string; line: number }> = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = regex.exec(doc)) !== null) {
      const lineNumber = doc.substring(0, match.index).split('\n').length;
      blocks.push({
        language: match[1] || 'text',
        code: match[2],
        line: lineNumber,
      });
    }
    
    return blocks;
  }

  private validateJavaScript(code: string): string[] {
    const errors: string[] = [];
    
    // Basic syntax checks
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Mismatched braces');
    }
    
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Mismatched parentheses');
    }
    
    const openBrackets = (code.match(/\[/g) || []).length;
    const closeBrackets = (code.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push('Mismatched brackets');
    }
    
    return errors;
  }

  private extractEndpointSection(apiDoc: string, endpoint: APIEndpoint): string | null {
    const pattern = new RegExp(`##\\s*${endpoint.method}\\s+${endpoint.path.replace(/\//g, '\\/')}([\\s\\S]*?)(?=##|$)`, 'i');
    const match = apiDoc.match(pattern);
    return match ? match[1] : null;
  }

  private checkTerminologyConsistency(docs: DocumentationSet): Array<{
    type: 'terminology';
    severity: 'error' | 'warning';
    message: string;
    locations: string[];
  }> {
    const issues: Array<{
      type: 'terminology';
      severity: 'error' | 'warning';
      message: string;
      locations: string[];
    }> = [];
    
    // Extract common technical terms and check for case inconsistencies
    const allText = [docs.readme, docs.api, docs.architecture].filter(Boolean).join('\n');
    const terms = new Map<string, Set<string>>();
    
    // Find all individual words (not phrases)
    const words = allText.match(/\b[A-Za-z]+\b/g) || [];
    
    for (const word of words) {
      const normalized = word.toLowerCase();
      // Only track words that appear with different capitalizations and are meaningful
      if (word.length > 2) { // Skip very short words
        if (!terms.has(normalized)) {
          terms.set(normalized, new Set());
        }
        terms.get(normalized)!.add(word);
      }
    }
    
    // Check for inconsistent capitalization
    for (const [normalized, variations] of terms.entries()) {
      if (variations.size > 1) {
        const locations: string[] = [];
        // Check each variation in each document
        for (const variation of variations) {
          if (docs.readme?.includes(variation)) locations.push('readme');
          if (docs.api?.includes(variation)) locations.push('api');
          if (docs.architecture?.includes(variation)) locations.push('architecture');
        }
        
        // Remove duplicates
        const uniqueLocations = Array.from(new Set(locations));
        
        issues.push({
          type: 'terminology',
          severity: 'warning',
          message: `Inconsistent capitalization of "${normalized}": ${Array.from(variations).join(', ')}`,
          locations: uniqueLocations,
        });
      }
    }
    
    return issues;
  }

  private checkFormatConsistency(docs: DocumentationSet): Array<{
    type: 'format';
    severity: 'error' | 'warning';
    message: string;
    locations: string[];
  }> {
    const issues: Array<{
      type: 'format';
      severity: 'error' | 'warning';
      message: string;
      locations: string[];
    }> = [];
    
    // Check for unclosed code blocks
    const checkUnclosedCodeBlocks = (text: string, docName: string) => {
      const openBlocks = (text.match(/```/g) || []).length;
      if (openBlocks % 2 !== 0) {
        issues.push({
          type: 'format',
          severity: 'error',
          message: 'Unclosed code block',
          locations: [docName],
        });
      }
    };
    
    if (docs.readme) checkUnclosedCodeBlocks(docs.readme, 'readme');
    if (docs.api) checkUnclosedCodeBlocks(docs.api, 'api');
    if (docs.architecture) checkUnclosedCodeBlocks(docs.architecture, 'architecture');
    
    return issues;
  }

  private checkReferenceConsistency(docs: DocumentationSet): Array<{
    type: 'reference';
    severity: 'error' | 'warning';
    message: string;
    locations: string[];
  }> {
    const issues: Array<{
      type: 'reference';
      severity: 'error' | 'warning';
      message: string;
      locations: string[];
    }> = [];
    
    // Check for broken internal links
    const allText = [docs.readme, docs.api, docs.architecture].filter(Boolean).join('\n');
    const links = allText.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    
    for (const link of links) {
      const match = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const url = match[2];
        // Check for internal references (starting with #)
        if (url.startsWith('#')) {
          const anchor = url.substring(1);
          const anchorPattern = new RegExp(`#+\\s*${anchor.replace(/-/g, '\\s+')}`, 'i');
          if (!anchorPattern.test(allText)) {
            issues.push({
              type: 'reference',
              severity: 'warning',
              message: `Potentially broken internal link: ${url}`,
              locations: ['documentation'],
            });
          }
        }
      }
    }
    
    return issues;
  }
}
