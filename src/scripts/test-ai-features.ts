/**
 * Test All AI Features
 * Comprehensive test of documentation, tests, modernization, and refactoring
 */

import { DocumentationGenerator } from '../documentation/DocumentationGenerator';
import { TestGenerator } from '../test-generator/TestGenerator';
import { ModernizationAdvisor } from '../modernization/ModernizationAdvisor';
import { RefactoringEngine } from '../refactoring/RefactoringEngine';
import { AIOrchestrator } from '../services/AIOrchestrator';
import * as path from 'path';

async function testAIFeatures() {
  console.log('🤖 Testing AI Features...\n');

  // Mock analysis data
  const mockAnalysisData = {
    languages: { javascript: 60, typescript: 40 },
    dependencies: [
      { name: 'express', version: '4.17.1' },
      { name: 'react', version: '17.0.2' },
    ],
    frameworks: ['Express', 'React'],
    metrics: {
      averageComplexity: 5.2,
      functions: [
        { name: 'complexFunc', complexity: 12, file: 'test.js', line: 10 }
      ]
    },
    codeSmells: [
      { type: 'long_function', file: 'test.js', line: 10, severity: 'high', message: 'Function too long' }
    ],
    totalFiles: 50,
  };

  const mockProjectPath = process.cwd();

  try {
    // Test 1: Documentation Generator
    console.log('1️⃣  Testing Documentation Generator...');
    const docGenerator = new DocumentationGenerator();
    const docs = await docGenerator.generateDocumentation(
      mockProjectPath,
      mockAnalysisData,
      { includeReadme: true, includeFunctionDocs: false }
    );
    console.log(`   ✓ README generated (${docs.readme?.length || 0} chars)`);
    console.log(`   ✓ Function docs: ${docs.functionDocs.size} files`);

    // Test 2: Test Generator
    console.log('\n2️⃣  Testing Test Generator...');
    const testGenerator = new TestGenerator();
    const tests = await testGenerator.generateTests(
      mockProjectPath,
      mockAnalysisData,
      { framework: 'jest', coverage: 'basic' }
    );
    console.log(`   ✓ Tests generated: ${tests.summary.totalTests} files`);
    console.log(`   ✓ Estimated coverage: ${tests.summary.estimatedCoverage}%`);

    // Test 3: Modernization Advisor
    console.log('\n3️⃣  Testing Modernization Advisor...');
    const modernizationAdvisor = new ModernizationAdvisor();
    const modernization = await modernizationAdvisor.analyzeForModernization(
      mockProjectPath,
      mockAnalysisData
    );
    console.log(`   ✓ Suggestions: ${modernization.summary.totalIssues}`);
    console.log(`   ✓ Critical issues: ${modernization.summary.criticalIssues}`);
    console.log(`   ✓ Estimated effort: ${modernization.summary.estimatedEffort}`);

    // Test 4: Refactoring Engine
    console.log('\n4️⃣  Testing Refactoring Engine...');
    const refactoringEngine = new RefactoringEngine();
    const refactoring = await refactoringEngine.analyzeForRefactoring(
      mockProjectPath,
      mockAnalysisData
    );
    console.log(`   ✓ Refactoring suggestions: ${refactoring.summary.totalSuggestions}`);
    console.log(`   ✓ High impact: ${refactoring.summary.highImpact}`);
    console.log(`   ✓ Safe to apply: ${refactoring.summary.safeToApply}`);

    // Test 5: AI Orchestrator (Full Analysis)
    console.log('\n5️⃣  Testing AI Orchestrator (Full Analysis)...');
    const orchestrator = new AIOrchestrator();
    const fullAnalysis = await orchestrator.runFullAnalysis(
      mockProjectPath,
      mockAnalysisData,
      {
        generateDocs: true,
        generateTests: true,
        analyzeModernization: true,
        suggestRefactorings: true,
      }
    );
    console.log(`   ✓ Completed tasks: ${fullAnalysis.summary.completedTasks.join(', ')}`);
    console.log(`   ✓ Failed tasks: ${fullAnalysis.summary.failedTasks.length}`);
    console.log(`   ✓ Total time: ${fullAnalysis.summary.totalTime}ms`);

    console.log('\n✅ All AI features tested successfully!');
    console.log('\n🎉 Your AI-powered Legacy Code Revival system is ready!');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ AI feature test failed:');
    console.error(error.message);
    console.error('\nMake sure you have:');
    console.error('1. Set GROQ_API_KEY in your .env file');
    console.error('2. Run: npm run test:groq first');
    process.exit(1);
  }
}

testAIFeatures();
