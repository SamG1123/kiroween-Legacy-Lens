import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';

interface ProgressTrackerProps {
  progress: number;
  stage: string;
  estimatedTimeRemaining?: number;
  onCancel?: () => void;
  isAnalyzing?: boolean;
}

// Define the analysis stages in order
const ANALYSIS_STAGES = [
  { id: 'uploading', label: 'Uploading codebase' },
  { id: 'extracting', label: 'Extracting files' },
  { id: 'detecting-languages', label: 'Detecting languages' },
  { id: 'analyzing-dependencies', label: 'Analyzing dependencies' },
  { id: 'calculating-metrics', label: 'Calculating metrics' },
  { id: 'detecting-issues', label: 'Detecting code smells' },
  { id: 'generating-report', label: 'Generating report' },
  { id: 'complete', label: 'Analysis complete' },
];

/**
 * ProgressTracker component displays real-time analysis progress
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export function ProgressTracker({
  progress,
  stage,
  estimatedTimeRemaining,
  onCancel,
  isAnalyzing = true,
}: ProgressTrackerProps) {
  // Determine which stage is currently active
  const currentStageIndex = ANALYSIS_STAGES.findIndex((s) => s.id === stage);
  
  // Format estimated time remaining
  const formatTimeRemaining = (seconds?: number): string => {
    if (!seconds || seconds <= 0) return 'Calculating...';
    
    if (seconds < 60) {
      return `${Math.round(seconds)}s remaining`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${minutes}m ${secs}s remaining`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m remaining`;
    }
  };

  // Get stage status (completed, active, pending)
  const getStageStatus = (index: number): 'completed' | 'active' | 'pending' | 'failed' => {
    if (!isAnalyzing && progress < 100) {
      return index <= currentStageIndex ? 'failed' : 'pending';
    }
    if (index < currentStageIndex) return 'completed';
    if (index === currentStageIndex) return 'active';
    return 'pending';
  };

  return (
    <Card 
      className="w-full"
      role="region"
      aria-label="Analysis progress tracker"
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Analysis Progress</span>
          {isAnalyzing && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-red-600 hover:text-red-700 focus-visible-ring"
              aria-label="Cancel analysis"
            >
              <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Cancel
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar - Requirement 3.1 */}
        <div 
          className="space-y-2"
          role="status"
          aria-live="polite"
          aria-label={`Analysis ${Math.round(progress)}% complete`}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium" aria-label={`Progress: ${Math.round(progress)} percent`}>
              {progress >= 100 ? 'Complete' : `${Math.round(progress)}%`}
            </span>
            {/* Estimated Time Remaining - Requirement 3.4 */}
            {isAnalyzing && estimatedTimeRemaining !== undefined && (
              <span 
                className="text-muted-foreground"
                role="timer"
                aria-label={formatTimeRemaining(estimatedTimeRemaining)}
              >
                {formatTimeRemaining(estimatedTimeRemaining)}
              </span>
            )}
          </div>
          <Progress 
            value={progress} 
            className="h-2"
            aria-label="Analysis progress bar"
          />
        </div>

        {/* Current Stage - Requirement 3.2 */}
        {stage && (
          <div 
            className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {ANALYSIS_STAGES.find((s) => s.id === stage)?.label || stage}
              </span>
            </div>
          </div>
        )}

        {/* Stage Checklist - Requirement 3.3 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Analysis Stages</h4>
          <ul 
            className="space-y-1"
            role="list"
            aria-label="Analysis stages checklist"
          >
            {ANALYSIS_STAGES.map((stageItem, index) => {
              const status = getStageStatus(index);
              const statusLabel = status === 'completed' ? 'completed' : 
                                 status === 'active' ? 'in progress' :
                                 status === 'failed' ? 'failed' : 'pending';
              
              return (
                <li
                  key={stageItem.id}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    status === 'active'
                      ? 'bg-blue-50 dark:bg-blue-950'
                      : status === 'completed'
                      ? 'bg-green-50 dark:bg-green-950'
                      : status === 'failed'
                      ? 'bg-red-50 dark:bg-red-950'
                      : 'bg-gray-50 dark:bg-gray-900'
                  }`}
                  role="listitem"
                  aria-label={`${stageItem.label}: ${statusLabel}`}
                >
                  {status === 'completed' && (
                    <CheckCircle2 
                      className="h-4 w-4 flex-shrink-0 text-green-600" 
                      aria-label="Completed"
                    />
                  )}
                  {status === 'active' && (
                    <Loader2 
                      className="h-4 w-4 flex-shrink-0 animate-spin text-blue-600" 
                      aria-label="In progress"
                    />
                  )}
                  {status === 'failed' && (
                    <XCircle 
                      className="h-4 w-4 flex-shrink-0 text-red-600" 
                      aria-label="Failed"
                    />
                  )}
                  {status === 'pending' && (
                    <Circle 
                      className="h-4 w-4 flex-shrink-0 text-gray-400" 
                      aria-label="Pending"
                    />
                  )}
                  <span
                    className={`${
                      status === 'active'
                        ? 'font-medium text-blue-900 dark:text-blue-100'
                        : status === 'completed'
                        ? 'text-green-900 dark:text-green-100'
                        : status === 'failed'
                        ? 'text-red-900 dark:text-red-100'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {stageItem.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
