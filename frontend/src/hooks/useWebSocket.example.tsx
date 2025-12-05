/**
 * Example usage of the useWebSocket hook
 * 
 * This file demonstrates various ways to use the WebSocket hook
 * for real-time project analysis updates.
 */

import { useWebSocket } from './useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { AlertCircle, Wifi, WifiOff, Loader2 } from 'lucide-react';

// Example 1: Basic Usage
export function BasicProgressExample({ projectId }: { projectId: string }) {
  const { progress, stage, isConnected } = useWebSocket(projectId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Analysis Progress</span>
          {isConnected ? (
            <Badge className="bg-green-100 text-green-800">
              <Wifi className="h-3 w-3 mr-1" />
              Live
            </Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-800">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>
        <div className="text-sm text-gray-600">
          Current Stage: <span className="font-medium">{stage || 'Initializing...'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Example 2: With Error Handling
export function ProgressWithErrorHandling({ projectId }: { projectId: string }) {
  const { 
    progress, 
    stage, 
    error, 
    reconnect, 
    reconnectAttempts,
    isConnected 
  } = useWebSocket(projectId);

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">{error.message}</p>
                {reconnectAttempts > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    Reconnection attempt {reconnectAttempts}/5
                  </p>
                )}
              </div>
            </div>
            {error.code === 'RECONNECT_FAILED' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={reconnect}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                Retry Connection
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      {!isConnected && !error && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-800">Connecting to real-time updates...</span>
          </CardContent>
        </Card>
      )}

      {/* Progress Display */}
      <Card>
        <CardContent className="py-6">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-600 mt-2">{stage}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Example 3: With Time Remaining
export function ProgressWithTimeEstimate({ projectId }: { projectId: string }) {
  const { 
    progress, 
    stage, 
    estimatedTimeRemaining,
    isConnected 
  } = useWebSocket(projectId);

  const formatTime = (seconds?: number): string => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis in Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{Math.round(progress)}%</span>
          {isConnected && estimatedTimeRemaining !== undefined && (
            <span className="text-gray-600">{formatTime(estimatedTimeRemaining)}</span>
          )}
        </div>
        <Progress value={progress} className="h-3" />
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-gray-600">{stage || 'Initializing...'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Example 4: Conditional Connection
export function ConditionalConnectionExample({ 
  projectId, 
  projectStatus 
}: { 
  projectId: string;
  projectStatus: 'pending' | 'analyzing' | 'completed' | 'failed';
}) {
  // Only connect when project is being analyzed
  const shouldConnect = projectStatus === 'analyzing';
  
  const { progress, stage, isConnected } = useWebSocket(
    shouldConnect ? projectId : null
  );

  if (projectStatus === 'completed') {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-green-600 font-medium">✓ Analysis Complete</p>
        </CardContent>
      </Card>
    );
  }

  if (projectStatus === 'failed') {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-red-600 font-medium">✗ Analysis Failed</p>
        </CardContent>
      </Card>
    );
  }

  if (projectStatus === 'pending') {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-yellow-600 font-medium">⏳ Pending Analysis</p>
        </CardContent>
      </Card>
    );
  }

  // projectStatus === 'analyzing'
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Analyzing...</span>
          {isConnected && (
            <Badge className="bg-green-100 text-green-800">Live</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={progress} />
        <p className="text-sm text-gray-600 mt-2">{stage}</p>
      </CardContent>
    </Card>
  );
}

// Example 5: Multiple Projects Dashboard
export function MultiProjectDashboard({ 
  analyzingProjects 
}: { 
  analyzingProjects: Array<{ id: string; name: string }> 
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Active Analyses</h2>
      {analyzingProjects.map(project => (
        <ProjectProgressCard key={project.id} project={project} />
      ))}
    </div>
  );
}

function ProjectProgressCard({ 
  project 
}: { 
  project: { id: string; name: string } 
}) {
  const { progress, stage, isConnected } = useWebSocket(project.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{project.name}</span>
          {isConnected && (
            <Badge variant="outline" className="text-xs">
              <Wifi className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-gray-600 mt-2">{stage}</p>
      </CardContent>
    </Card>
  );
}

// Example 6: With Manual Reconnect Button
export function ProgressWithManualReconnect({ projectId }: { projectId: string }) {
  const { 
    progress, 
    stage, 
    isConnected, 
    error,
    reconnect 
  } = useWebSocket(projectId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Analysis Progress</span>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge className="bg-green-100 text-green-800">
                <Wifi className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <>
                <Badge className="bg-red-100 text-red-800">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Disconnected
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={reconnect}
                >
                  Reconnect
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
            {error.message}
          </div>
        )}
        <Progress value={progress} />
        <p className="text-sm text-gray-600">{stage}</p>
      </CardContent>
    </Card>
  );
}
