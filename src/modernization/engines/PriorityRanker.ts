import { Recommendation, Priority, PriorityFactors } from '../types';

/**
 * PriorityRanker assigns and sorts recommendations by priority
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class PriorityRanker {
  /**
   * Rank recommendations by priority
   * Sorts recommendations by priority score (highest first)
   * Validates: Requirements 4.5
   * @param recommendations - Array of recommendations to rank
   * @returns Sorted array of recommendations
   */
  rankRecommendations(recommendations: Recommendation[]): Recommendation[] {
    // Create a copy to avoid mutating the original array
    const ranked = [...recommendations];

    // Sort by priority score (highest first)
    ranked.sort((a, b) => {
      const scoreA = this.scoreRecommendation(a);
      const scoreB = this.scoreRecommendation(b);
      return scoreB - scoreA;
    });

    return ranked;
  }

  /**
   * Calculate priority level for a recommendation
   * Validates: Requirements 4.1, 4.2, 4.3, 4.4
   * @param recommendation - Recommendation to calculate priority for
   * @returns Priority level
   */
  calculatePriority(recommendation: Recommendation): Priority {
    const score = this.scoreRecommendation(recommendation);

    // Map score to priority level based on thresholds
    if (score >= 100) {
      return 'critical';
    } else if (score >= 50) {
      return 'high';
    } else if (score >= 20) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate numeric score for a recommendation
   * Uses weighted factors to determine priority
   * Validates: Requirements 4.1, 4.2, 4.3, 4.4
   * @param recommendation - Recommendation to score
   * @returns Numeric priority score
   */
  scoreRecommendation(recommendation: Recommendation): number {
    const factors = this.extractPriorityFactors(recommendation);
    let score = 0;

    // Security vulnerabilities (highest weight)
    // Validates: Requirements 4.2
    if (factors.hasSecurityVulnerability) {
      const severityMultiplier = this.getVulnerabilitySeverityMultiplier(
        factors.vulnerabilitySeverity
      );
      score += 100 * severityMultiplier;
    }

    // Deprecation and breaking changes
    // Validates: Requirements 4.3
    if (factors.isDeprecated) {
      score += 50;
    }
    if (factors.hasBreakingChanges) {
      score += 50;
    }

    // Effort-to-benefit ratio
    // Validates: Requirements 4.4
    const benefitScore = this.calculateBenefitScore(recommendation.benefits);
    const effortPenalty = this.effortToNumber(recommendation.effort);
    score += benefitScore / effortPenalty;

    // Impact on codebase
    // Validates: Requirements 4.4
    score += factors.impactScore * 0.5;

    return score;
  }

  /**
   * Extract priority factors from a recommendation
   * @param recommendation - Recommendation to extract factors from
   * @returns Priority factors
   */
  private extractPriorityFactors(recommendation: Recommendation): PriorityFactors {
    // Check for security vulnerabilities in description and benefits
    const hasSecurityVulnerability = this.hasSecurityIndicators(recommendation);
    const vulnerabilitySeverity = this.extractVulnerabilitySeverity(recommendation);

    // Check for deprecation indicators
    const isDeprecated = this.hasDeprecationIndicators(recommendation);

    // Check for breaking changes
    const hasBreakingChanges = this.hasBreakingChangeIndicators(recommendation);

    // Calculate effort-to-benefit ratio
    const benefitScore = this.calculateBenefitScore(recommendation.benefits);
    const effortScore = this.effortToNumber(recommendation.effort);
    const effortToBenefitRatio = benefitScore / effortScore;

    // Calculate impact score based on recommendation type and content
    const impactScore = this.calculateImpactScore(recommendation);

    return {
      hasSecurityVulnerability,
      vulnerabilitySeverity,
      isDeprecated,
      hasBreakingChanges,
      effortToBenefitRatio,
      impactScore,
    };
  }

  /**
   * Check if recommendation has security vulnerability indicators
   */
  private hasSecurityIndicators(recommendation: Recommendation): boolean {
    const text = `${recommendation.title} ${recommendation.description} ${recommendation.benefits.join(' ')}`.toLowerCase();
    
    const securityKeywords = [
      'vulnerability',
      'vulnerabilities',
      'security vulnerability',
      'security vulnerabilities',
      'cve-',
      'exploit',
      'breach',
      'attack',
      'malicious',
      'fixes security',
      'security fix',
      'security issue',
    ];

    return securityKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Extract vulnerability severity from recommendation
   */
  private extractVulnerabilitySeverity(recommendation: Recommendation): string | undefined {
    const text = `${recommendation.title} ${recommendation.description} ${recommendation.benefits.join(' ')}`.toLowerCase();

    if (text.includes('critical')) {
      return 'critical';
    } else if (text.includes('high severity') || text.includes('high-severity')) {
      return 'high';
    } else if (text.includes('medium severity') || text.includes('medium-severity')) {
      return 'medium';
    } else if (text.includes('low severity') || text.includes('low-severity')) {
      return 'low';
    }

    return undefined;
  }

  /**
   * Get multiplier for vulnerability severity
   */
  private getVulnerabilitySeverityMultiplier(severity?: string): number {
    switch (severity) {
      case 'critical':
        return 1.5;
      case 'high':
        return 1.2;
      case 'medium':
        return 1.0;
      case 'low':
        return 0.8;
      default:
        return 1.0;
    }
  }

  /**
   * Check if recommendation has deprecation indicators
   */
  private hasDeprecationIndicators(recommendation: Recommendation): boolean {
    const text = `${recommendation.title} ${recommendation.description}`.toLowerCase();
    
    const deprecationKeywords = [
      'deprecated',
      'deprecation',
      'no longer maintained',
      'end of life',
      'eol',
      'obsolete',
    ];

    return deprecationKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if recommendation has breaking change indicators
   */
  private hasBreakingChangeIndicators(recommendation: Recommendation): boolean {
    const text = `${recommendation.title} ${recommendation.description}`.toLowerCase();
    
    const breakingChangeKeywords = [
      'breaking change',
      'breaking changes',
      'incompatible',
      'requires code modification',
      'requires code changes',
    ];

    return breakingChangeKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Calculate benefit score from benefits list
   */
  private calculateBenefitScore(benefits: string[]): number {
    // Base score from number of benefits
    let score = benefits.length * 2;

    // Add weight for specific high-value benefits
    const benefitsText = benefits.join(' ').toLowerCase();

    const highValueKeywords = [
      'security',
      'performance',
      'vulnerability',
      'critical',
      'stability',
      'compatibility',
    ];

    for (const keyword of highValueKeywords) {
      if (benefitsText.includes(keyword)) {
        score += 3;
      }
    }

    return score;
  }

  /**
   * Convert effort estimate to numeric value
   */
  private effortToNumber(effort: 'low' | 'medium' | 'high'): number {
    switch (effort) {
      case 'low':
        return 1;
      case 'medium':
        return 2;
      case 'high':
        return 3;
      default:
        return 2;
    }
  }

  /**
   * Calculate impact score based on recommendation characteristics
   */
  private calculateImpactScore(recommendation: Recommendation): number {
    let impact = 0;

    // Type-based impact
    if (recommendation.type === 'framework') {
      impact += 10; // Framework changes have high impact
    } else if (recommendation.type === 'dependency') {
      impact += 5; // Dependency changes have medium impact
    } else if (recommendation.type === 'pattern') {
      impact += 3; // Pattern changes have lower impact
    }

    // Migration steps complexity
    impact += Math.min(recommendation.migrationSteps.length * 0.5, 10);

    // Benefits count
    impact += Math.min(recommendation.benefits.length * 0.3, 5);

    return impact;
  }
}
