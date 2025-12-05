/**
 * Example usage of the ProgressTracker component
 * 
 * This file demonstrates how to use the ProgressTracker component
 * with different states and configurations.
 */

import { ProgressTracker } from './ProgressTracker';

// Example 1: Early stage analysis
export function EarlyStageExample() {
  return (
    <ProgressTracker
      progress={15}
      stage="detecting-languages"
      estimatedTimeRemaining={180}
      isAnalyzing={true}
      onCancel={() => console.log('Analysis cancelled')}
    />
  );
}

// Example 2: Mid-stage analysis
export function MidStageExample() {
  return (
    <ProgressTracker
      progress={55}
      stage="analyzing-dependencies"
      estimatedTimeRemaining={90}
      isAnalyzing={true}
      onCancel={() => console.log('Analysis cancelled')}
    />
  );
}

// Example 3: Late stage analysis
export function LateStageExample() {
  return (
    <ProgressTracker
      progress={85}
      stage="generating-report"
      estimatedTimeRemaining={30}
      isAnalyzing={true}
      onCancel={() => console.log('Analysis cancelled')}
    />
  );
}

// Example 4: Complete analysis
export function CompleteExample() {
  return (
    <ProgressTracker
      progress={100}
      stage="complete"
      estimatedTimeRemaining={0}
      isAnalyzing={false}
    />
  );
}

// Example 5: Without cancel button
export function NoCancelExample() {
  return (
    <ProgressTracker
      progress={45}
      stage="calculating-metrics"
      estimatedTimeRemaining={120}
      isAnalyzing={true}
    />
  );
}

// Example 6: With WebSocket integration
export function WebSocketExample({ projectId }: { projectId: string }) {
  // This would typically use the useWebSocket hook
  const mockProgress = 35;
  const mockStage = 'extracting';
  const mockTimeRemaining = 150;

  return (
    <ProgressTracker
      progress={mockProgress}
      stage={mockStage}
      estimatedTimeRemaining={mockTimeRemaining}
      isAnalyzing={true}
      onCancel={() => {
        // Call API to cancel analysis
        console.log(`Cancelling analysis for project ${projectId}`);
      }}
    />
  );
}
