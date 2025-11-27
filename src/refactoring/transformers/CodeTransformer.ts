import {
  RefactoringSuggestion,
  TransformResult,
  CodeBlock,
  Location,
  Scope,
} from '../types';
import { ExtractMethodTransformer } from './ExtractMethodTransformer';
import { DuplicationRemovalTransformer } from './DuplicationRemovalTransformer';
import { ConditionalSimplificationTransformer } from './ConditionalSimplificationTransformer';
import { RenameTransformer } from './RenameTransformer';
import { AIRefactoringClient } from '../ai/AIRefactoringClient';

/**
 * Applies refactorings to code using AST transformations
 * Implementation will be completed in tasks 5-8
 */
export class CodeTransformer {
  private extractMethodTransformer: ExtractMethodTransformer;
  private duplicationRemovalTransformer: DuplicationRemovalTransformer;
  private conditionalSimplificationTransformer: ConditionalSimplificationTransformer;
  private renameTransformer: RenameTransformer;

  constructor(aiClient?: AIRefactoringClient) {
    this.extractMethodTransformer = new ExtractMethodTransformer(aiClient);
    this.duplicationRemovalTransformer = new DuplicationRemovalTransformer(aiClient);
    this.conditionalSimplificationTransformer = new ConditionalSimplificationTransformer(aiClient);
    this.renameTransformer = new RenameTransformer(aiClient);
  }

  async applyRefactoring(code: string, refactoring: RefactoringSuggestion): Promise<TransformResult> {
    // To be implemented in tasks 5-8
    return {
      success: false,
      transformedCode: code,
      changes: [],
      error: 'Not implemented',
    };
  }

  async extractMethod(code: string, block: CodeBlock, newName?: string): Promise<TransformResult> {
    return this.extractMethodTransformer.extractMethod(code, block, newName);
  }

  async removeDuplication(code: string, instances: Location[], sharedMethodName?: string): Promise<TransformResult> {
    return this.duplicationRemovalTransformer.removeDuplication(code, instances, sharedMethodName);
  }

  async simplifyConditional(
    code: string,
    conditional: Location,
    simplificationType?: 'guard_clause' | 'extract_variable' | 'consolidate' | 'auto'
  ): Promise<TransformResult> {
    return this.conditionalSimplificationTransformer.simplifyConditional(
      code,
      conditional,
      simplificationType
    );
  }

  async rename(
    code: string,
    oldName: string,
    newName: string | undefined,
    scope: Scope,
    location?: Location
  ): Promise<TransformResult> {
    return this.renameTransformer.rename(code, oldName, newName, scope, location);
  }
}
