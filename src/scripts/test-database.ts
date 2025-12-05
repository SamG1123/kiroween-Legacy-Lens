/**
 * Test Database Models
 * Run this script to verify database models are working
 */

import { ProjectModel, AnalysisModel, closePool } from '../database';
import { AnalysisReport } from '../types';

async function testDatabase() {
  console.log('Testing database models...\n');

  try {
    const projectModel = new ProjectModel();
    const analysisModel = new AnalysisModel();

    // Test 1: Create a project
    console.log('1. Creating a test project...');
    const project = await projectModel.create({
      name: 'Test Project',
      sourceType: 'github',
      sourceUrl: 'https://github.com/test/repo',
    });
    console.log(`   ✓ Project created: ${project.id}`);
    console.log(`   - Name: ${project.name}`);
    console.log(`   - Status: ${project.status}`);

    // Test 2: Find project by ID
    console.log('\n2. Finding project by ID...');
    const foundProject = await projectModel.findById(project.id);
    if (foundProject) {
      console.log(`   ✓ Project found: ${foundProject.name}`);
    } else {
      throw new Error('Project not found');
    }

    // Test 3: Update project status
    console.log('\n3. Updating project status...');
    const updatedProject = await projectModel.updateStatus(project.id, 'analyzing');
    if (updatedProject) {
      console.log(`   ✓ Status updated: ${updatedProject.status}`);
    } else {
      throw new Error('Failed to update status');
    }

    // Test 4: Create an analysis
    console.log('\n4. Creating an analysis...');
    const mockReport: AnalysisReport = {
      projectId: project.id,
      status: 'completed',
      startTime: new Date(),
      endTime: new Date(),
      languages: {
        languages: [
          { name: 'TypeScript', percentage: 80, lineCount: 8000 },
          { name: 'JavaScript', percentage: 20, lineCount: 2000 },
        ],
      },
      frameworks: [
        { name: 'Express', version: '4.18.2', confidence: 0.95 },
      ],
      dependencies: [
        { name: 'express', version: '4.18.2', type: 'runtime' },
      ],
      metrics: {
        totalFiles: 50,
        totalLines: 10000,
        codeLines: 8000,
        commentLines: 1500,
        blankLines: 500,
        averageComplexity: 5.2,
        maintainabilityIndex: 75,
      },
      issues: [
        {
          type: 'long_function',
          severity: 'medium',
          file: 'src/utils/helper.ts',
          line: 42,
          description: 'Function exceeds 50 lines',
        },
      ],
    };

    const analysis = await analysisModel.create({
      projectId: project.id,
      agentType: 'analyzer',
      result: mockReport,
    });
    console.log(`   ✓ Analysis created: ${analysis.id}`);
    console.log(`   - Agent type: ${analysis.agentType}`);
    console.log(`   - Languages: ${analysis.result.languages.languages.length}`);

    // Test 5: Find analyses by project
    console.log('\n5. Finding analyses by project...');
    const analyses = await analysisModel.findByProjectId(project.id);
    console.log(`   ✓ Found ${analyses.length} analysis/analyses`);

    // Test 6: Find latest analysis
    console.log('\n6. Finding latest analysis...');
    const latestAnalysis = await analysisModel.findLatestByProjectId(project.id);
    if (latestAnalysis) {
      console.log(`   ✓ Latest analysis: ${latestAnalysis.id}`);
      console.log(`   - Status: ${latestAnalysis.result.status}`);
    }

    // Test 7: List all projects
    console.log('\n7. Listing all projects...');
    const allProjects = await projectModel.findAll(10, 0);
    console.log(`   ✓ Found ${allProjects.length} project(s)`);

    // Test 8: Find projects by status
    console.log('\n8. Finding projects by status...');
    const analyzingProjects = await projectModel.findByStatus('analyzing');
    console.log(`   ✓ Found ${analyzingProjects.length} analyzing project(s)`);

    // Cleanup: Delete test data
    console.log('\n9. Cleaning up test data...');
    await analysisModel.delete(analysis.id);
    console.log('   ✓ Analysis deleted');
    await projectModel.delete(project.id);
    console.log('   ✓ Project deleted');

    console.log('\n✅ All database tests passed!');
    console.log('Database models are working correctly.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database test failed:');
    console.error(error);
    console.log('\nMake sure:');
    console.log('1. PostgreSQL is running');
    console.log('2. Database "legacy_code_revival" exists');
    console.log('3. Migrations have been run: npm run migrate:up\n');
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run the test
testDatabase();
