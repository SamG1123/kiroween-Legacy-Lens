import {
  ModernizationReport,
  Recommendation,
  MigrationRoadmap,
  CompatibilityReport,
  PriorityBreakdown,
  TypeBreakdown,
  TimeEstimate,
} from '../types';
import { getErrorHandler } from '../utils/ErrorHandler';

/**
 * ModernizationReportGenerator creates comprehensive modernization reports
 * Combines recommendations, roadmap, and compatibility information into a complete report
 */
export class ModernizationReportGenerator {
  private errorHandler = getErrorHandler();
  /**
   * Generate a complete modernization report
   * @param roadmap - Migration roadmap with phased recommendations
   * @param recommendations - All recommendations
   * @param compatibilityReport - Compatibility analysis results
   * @returns Complete modernization report
   */
  generateReport(
    roadmap: MigrationRoadmap,
    recommendations: Recommendation[],
    compatibilityReport: CompatibilityReport
  ): ModernizationReport {
    const summary = this.generateSummary(recommendations, compatibilityReport);
    const statistics = this.generateStatistics(recommendations, roadmap);

    // Include error reporting in the report
    const errorReports = this.errorHandler.getAllReports();
    const errorSummary = errorReports.length > 0 
      ? `\n\nAnalysis Warnings: ${this.errorHandler.generateSummary()}`
      : '';

    return {
      summary: summary + errorSummary,
      statistics,
      recommendations,
      roadmap,
      compatibilityReport,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate a summary of the modernization analysis
   * @param recommendations - All recommendations
   * @param compatibilityReport - Compatibility analysis results
   * @returns Summary text
   */
  generateSummary(
    recommendations: Recommendation[],
    compatibilityReport: CompatibilityReport
  ): string {
    const parts: string[] = [];

    // Overall assessment
    const totalRecs = recommendations.length;
    if (totalRecs === 0) {
      return 'No modernization opportunities identified. Your codebase appears to be up-to-date.';
    }

    parts.push(`Identified ${totalRecs} modernization ${totalRecs === 1 ? 'opportunity' : 'opportunities'} across your codebase.`);

    // Priority breakdown
    const byPriority = this.generatePriorityBreakdown(recommendations);
    const criticalCount = byPriority.critical;
    const highCount = byPriority.high;

    if (criticalCount > 0) {
      parts.push(
        `${criticalCount} critical ${criticalCount === 1 ? 'issue' : 'issues'} require immediate attention, ` +
        `primarily related to security vulnerabilities.`
      );
    }

    if (highCount > 0) {
      parts.push(
        `${highCount} high-priority ${highCount === 1 ? 'item' : 'items'} should be addressed soon, ` +
        `including deprecated packages and breaking changes.`
      );
    }

    // Type breakdown
    const byType = this.generateTypeBreakdown(recommendations);
    const typeParts: string[] = [];
    if (byType.dependency > 0) {
      typeParts.push(`${byType.dependency} dependency ${byType.dependency === 1 ? 'update' : 'updates'}`);
    }
    if (byType.framework > 0) {
      typeParts.push(`${byType.framework} framework ${byType.framework === 1 ? 'upgrade' : 'upgrades'}`);
    }
    if (byType.pattern > 0) {
      typeParts.push(`${byType.pattern} code pattern ${byType.pattern === 1 ? 'modernization' : 'modernizations'}`);
    }

    if (typeParts.length > 0) {
      parts.push(`The recommendations include ${this.formatList(typeParts)}.`);
    }

    // Compatibility assessment
    if (!compatibilityReport.compatible) {
      const errorCount = compatibilityReport.issues.filter(i => i.severity === 'error').length;
      const warningCount = compatibilityReport.issues.filter(i => i.severity === 'warning').length;

      if (errorCount > 0) {
        parts.push(
          `Compatibility analysis identified ${errorCount} critical ${errorCount === 1 ? 'conflict' : 'conflicts'} ` +
          `that must be resolved before proceeding with upgrades.`
        );
      }

      if (warningCount > 0) {
        parts.push(
          `Additionally, ${warningCount} potential compatibility ${warningCount === 1 ? 'issue' : 'issues'} ` +
          `should be reviewed.`
        );
      }
    } else {
      parts.push('All recommended upgrades are compatible with each other.');
    }

    // Quick wins
    const quickWins = recommendations.filter(
      r => r.effort === 'low' && (r.priority === 'critical' || r.priority === 'high')
    );

    if (quickWins.length > 0) {
      parts.push(
        `${quickWins.length} quick ${quickWins.length === 1 ? 'win' : 'wins'} identified - ` +
        `low-effort, high-impact changes that can be implemented immediately.`
      );
    }

    // Closing recommendation
    parts.push(
      'Review the detailed roadmap below for a phased approach to modernization that ' +
      'minimizes risk and maximizes early benefits.'
    );

    return parts.join(' ');
  }

  /**
   * Generate priority breakdown statistics
   * @param recommendations - All recommendations
   * @returns Priority breakdown
   */
  generatePriorityBreakdown(recommendations: Recommendation[]): PriorityBreakdown {
    return {
      critical: recommendations.filter(r => r.priority === 'critical').length,
      high: recommendations.filter(r => r.priority === 'high').length,
      medium: recommendations.filter(r => r.priority === 'medium').length,
      low: recommendations.filter(r => r.priority === 'low').length,
    };
  }

  /**
   * Generate type breakdown statistics
   * @param recommendations - All recommendations
   * @returns Type breakdown
   */
  private generateTypeBreakdown(recommendations: Recommendation[]): TypeBreakdown {
    return {
      dependency: recommendations.filter(r => r.type === 'dependency').length,
      framework: recommendations.filter(r => r.type === 'framework').length,
      pattern: recommendations.filter(r => r.type === 'pattern').length,
    };
  }

  /**
   * Generate complete statistics for the report
   * @param recommendations - All recommendations
   * @param roadmap - Migration roadmap
   * @returns Statistics object
   */
  private generateStatistics(
    recommendations: Recommendation[],
    roadmap: MigrationRoadmap
  ): {
    totalRecommendations: number;
    byPriority: PriorityBreakdown;
    byType: TypeBreakdown;
    estimatedEffort: TimeEstimate;
  } {
    return {
      totalRecommendations: recommendations.length,
      byPriority: this.generatePriorityBreakdown(recommendations),
      byType: this.generateTypeBreakdown(recommendations),
      estimatedEffort: roadmap.totalEstimate,
    };
  }

  /**
   * Format a list of items with proper grammar
   * @param items - Array of items to format
   * @returns Formatted string
   */
  private formatList(items: string[]): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    
    const allButLast = items.slice(0, -1).join(', ');
    const last = items[items.length - 1];
    return `${allButLast}, and ${last}`;
  }
}
