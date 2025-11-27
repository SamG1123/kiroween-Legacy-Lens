import { ILanguageDetector } from '../interfaces/LanguageDetector';
import { LanguageDistribution } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

/**
 * LanguageDetector Implementation
 * Responsibility: Identify programming languages in the codebase
 */
export class LanguageDetector implements ILanguageDetector {
  // Extension to language mapping
  private readonly extensionMap: Map<string, string> = new Map([
    // Python
    ['.py', 'Python'],
    ['.pyw', 'Python'],
    ['.pyi', 'Python'],
    
    // JavaScript
    ['.js', 'JavaScript'],
    ['.jsx', 'JavaScript'],
    ['.mjs', 'JavaScript'],
    ['.cjs', 'JavaScript'],
    
    // TypeScript
    ['.ts', 'TypeScript'],
    ['.tsx', 'TypeScript'],
    
    // Java
    ['.java', 'Java'],
    
    // C#
    ['.cs', 'C#'],
    ['.csx', 'C#'],
    
    // Ruby
    ['.rb', 'Ruby'],
    ['.rake', 'Ruby'],
    ['.gemspec', 'Ruby'],
    
    // PHP
    ['.php', 'PHP'],
    ['.phtml', 'PHP'],
    ['.php3', 'PHP'],
    ['.php4', 'PHP'],
    ['.php5', 'PHP'],
    
    // Go
    ['.go', 'Go'],
    
    // Other common languages
    ['.c', 'C'],
    ['.h', 'C'],
    ['.cpp', 'C++'],
    ['.cc', 'C++'],
    ['.cxx', 'C++'],
    ['.hpp', 'C++'],
    ['.hxx', 'C++'],
    ['.swift', 'Swift'],
    ['.kt', 'Kotlin'],
    ['.kts', 'Kotlin'],
    ['.rs', 'Rust'],
    ['.scala', 'Scala'],
    ['.clj', 'Clojure'],
    ['.html', 'HTML'],
    ['.htm', 'HTML'],
    ['.css', 'CSS'],
    ['.scss', 'SCSS'],
    ['.sass', 'Sass'],
    ['.less', 'Less'],
    ['.vue', 'Vue'],
    ['.sql', 'SQL'],
    ['.sh', 'Shell'],
    ['.bash', 'Shell'],
    ['.zsh', 'Shell'],
    ['.m', 'Objective-C'],
    ['.mm', 'Objective-C++'],
    ['.pl', 'Perl'],
    ['.r', 'R'],
    ['.dart', 'Dart'],
    ['.lua', 'Lua'],
    ['.groovy', 'Groovy'],
    ['.erl', 'Erlang'],
    ['.ex', 'Elixir'],
    ['.exs', 'Elixir'],
  ]);

  // Content-based detection patterns for ambiguous files
  private readonly contentPatterns: Array<{ language: string; patterns: RegExp[] }> = [
    {
      language: 'Python',
      patterns: [
        /^import\s+\w+/m,
        /^from\s+\w+\s+import/m,
        /^def\s+\w+\s*\(/m,
        /^class\s+\w+/m,
        /^if\s+__name__\s*==\s*['"]__main__['"]/m,
      ],
    },
    {
      language: 'JavaScript',
      patterns: [
        /^const\s+\w+\s*=/m,
        /^let\s+\w+\s*=/m,
        /^var\s+\w+\s*=/m,
        /^function\s+\w+\s*\(/m,
        /^import\s+.*\s+from\s+['"]/m,
        /^export\s+(default|const|function|class)/m,
        /require\s*\(['"]/,
      ],
    },
    {
      language: 'TypeScript',
      patterns: [
        /:\s*(string|number|boolean|any|void|never)\s*[;=)]/,
        /^interface\s+\w+/m,
        /^type\s+\w+\s*=/m,
        /^enum\s+\w+/m,
        /<\w+>/,
      ],
    },
    {
      language: 'Java',
      patterns: [
        /package\s+[\w.]+;/,
        /import\s+[\w.]+;/,
        /public\s+class\s+\w+/,
        /private\s+(static\s+)?(final\s+)?[\w<>]+\s+\w+/,
        /System\.out\.println/,
        /public\s+static\s+void\s+main/,
      ],
    },
    {
      language: 'C#',
      patterns: [
        /^using\s+[\w.]+;/m,
        /^namespace\s+[\w.]+/m,
        /^public\s+class\s+\w+/m,
        /Console\.WriteLine/,
        /\[[\w]+\]/,
      ],
    },
    {
      language: 'Ruby',
      patterns: [
        /^require\s+['"]/m,
        /^class\s+\w+/m,
        /^def\s+\w+/m,
        /^module\s+\w+/m,
        /^end$/m,
        /puts\s+/,
      ],
    },
    {
      language: 'PHP',
      patterns: [
        /^<\?php/m,
        /\$\w+\s*=/,
        /^function\s+\w+\s*\(/m,
        /^class\s+\w+/m,
        /echo\s+/,
      ],
    },
    {
      language: 'Go',
      patterns: [
        /^package\s+\w+/m,
        /^import\s+\(/m,
        /^func\s+\w+\s*\(/m,
        /^type\s+\w+\s+struct/m,
        /fmt\.Print/,
      ],
    },
  ];

  /**
   * Detect all languages in the codebase and calculate distribution
   */
  async detectLanguages(files: string[]): Promise<LanguageDistribution> {
    const languageLines: Map<string, number> = new Map();
    let totalLines = 0;

    for (const file of files) {
      try {
        // Skip if file doesn't exist
        if (!existsSync(file)) {
          continue;
        }

        // Detect language for this file
        let language = this.detectByExtension(file);
        
        // Fall back to content-based detection if extension is unknown
        if (!language) {
          language = await this.detectByContent(file);
        }

        // Skip if language couldn't be determined
        if (!language) {
          continue;
        }

        // Count lines in the file
        const lineCount = await this.countLines(file);
        
        // Update language line counts
        const currentCount = languageLines.get(language) || 0;
        languageLines.set(language, currentCount + lineCount);
        totalLines += lineCount;
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    // Calculate percentages and build result
    const languages = Array.from(languageLines.entries())
      .map(([name, lineCount]) => ({
        name,
        lineCount,
        percentage: totalLines > 0 ? (lineCount / totalLines) * 100 : 0,
      }))
      .sort((a, b) => b.lineCount - a.lineCount); // Sort by line count descending

    return { languages };
  }

  /**
   * Detect language by file extension
   */
  detectByExtension(file: string): string | null {
    const ext = path.extname(file).toLowerCase();
    return this.extensionMap.get(ext) || null;
  }

  /**
   * Detect language by analyzing file content
   */
  async detectByContent(file: string): Promise<string | null> {
    try {
      // Read file content (limit to first 1000 characters for efficiency)
      const content = await fs.readFile(file, 'utf-8');
      const sample = content.substring(0, 1000);

      // Try each language pattern
      let bestMatch: { language: string; score: number } | null = null;

      for (const { language, patterns } of this.contentPatterns) {
        let matchCount = 0;
        
        for (const pattern of patterns) {
          if (pattern.test(sample)) {
            matchCount++;
          }
        }

        // Update best match if this language has more pattern matches
        if (matchCount > 0) {
          if (!bestMatch || matchCount > bestMatch.score) {
            bestMatch = { language, score: matchCount };
          }
        }
      }

      return bestMatch ? bestMatch.language : null;
    } catch (error) {
      // Return null if file can't be read or parsed
      return null;
    }
  }

  /**
   * Helper: Count lines in a file
   */
  private async countLines(file: string): Promise<number> {
    try {
      const content = await fs.readFile(file, 'utf-8');
      // Handle empty files
      if (content.length === 0) {
        return 0;
      }
      // Count newlines + 1 for the last line (if file doesn't end with newline)
      const lines = content.split('\n');
      // If file ends with newline, don't count the empty string after the last newline
      // But ensure we count at least 1 line if there's any content
      const lineCount = content.endsWith('\n') ? lines.length - 1 : lines.length;
      return Math.max(1, lineCount);
    } catch (error) {
      return 0;
    }
  }
}
