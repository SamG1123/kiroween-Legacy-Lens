# useWebSocket Hook

## Overview

The `useWebSocket` hook provides real-time updates for project analysis progress using Socket.io. It handles connection management, reconnection logic, error handling, and subscription management automatically.

## Requirements

- **Requirement 3.2**: Real-time progress updates using WebSocket
- **Requirement 3.3**: Update UI in real-time with analysis progress

## Features

- ✅ Automatic connection management
- ✅ Real-time progress updates
- ✅ Automatic reconnection with exponential backoff
- ✅ Comprehensive error handling
- ✅ Connection status tracking
- ✅ Subscription management
- ✅ Manual reconnect capability
- ✅ Cleanup on unmount

## Usage

```typescript
import { useWebSocket } from '../hooks/useWebSocket';

function MyComponent() {
  const projectId = 'project-123';
  
  const {
    progress,              // Current progress (0-100)
    stage,                 // Current analysis stage
    estimatedTimeRemaining, // Estimated time in seconds
    isConnected,           // Connection status
    error,                 // Error object if any
    reconnectAttempts,     // Number of reconnection attempts
    reconnect,             // Manual reconnect function
  } = useWebSocket(projectId);

  return (
    <div>
      {error && <div>Error: {error.message}</div>}
      {isConnected ? 'Connected' : 'Disconnected'}
      <div>Progress: {progress}%</div>
      <div>Stage: {stage}</div>
    </div>
  );
}
```

## API

### Parameters

- `projectId: string | null` - The project ID to subscribe to. Pass `null` to disconnect.

### Return Value

```typescript
{
  progress: number;                    // Progress percentage (0-100)
  stage: string;                       // Current analysis stage
  estimatedTimeRemaining?: number;     // Estimated time remaining in seconds
  isConnected: boolean;                // WebSocket connection status
  error: WebSocketError | null;        // Error object if any
  reconnectAttempts: number;           // Number of reconnection attempts
  reconnect: () => void;               // Manual reconnect function
}
```

### WebSocketError

```typescript
interface WebSocketError {
  message: string;  // Human-readable error message
  code?: string;    // Error code for programmatic handling
}
```

## Error Codes

- `SERVER_DISCONNECT` - Server intentionally disconnected
- `CONNECTION_LOST` - Connection lost due to network issues
- `RECONNECTING` - Currently attempting to reconnect
- `RECONNECT_FAILED` - All reconnection attempts failed
- `CONNECTION_ERROR` - Failed to establish initial connection
- `ANALYSIS_FAILED` - Analysis failed on the server
- `SOCKET_ERROR` - Generic socket error

## WebSocket Events

### Emitted Events

- `subscribe` - Subscribe to project updates
- `unsubscribe` - Unsubscribe from project updates

### Received Events

- `connect` - Connection established
- `disconnect` - Connection lost
- `progress` - Progress update received
- `analysis_complete` - Analysis completed successfully
- `analysis_failed` - Analysis failed
- `error` - Error occurred

## Configuration

The WebSocket URL is configured via environment variable:

```env
VITE_WS_URL=http://localhost:3000
```

If not set, defaults to `http://localhost:3000`.

## Connection Options

The hook uses the following Socket.io connection options:

- `reconnection: true` - Enable automatic reconnection
- `reconnectionDelay: 1000` - Initial delay before reconnection (1 second)
- `reconnectionDelayMax: 5000` - Maximum delay between reconnections (5 seconds)
- `reconnectionAttempts: 5` - Maximum number of reconnection attempts
- `timeout: 10000` - Connection timeout (10 seconds)

## Best Practices

1. **Conditional Connection**: Only connect when needed
   ```typescript
   const { progress } = useWebSocket(
     project?.status === 'analyzing' ? projectId : null
   );
   ```

2. **Error Handling**: Always display errors to users
   ```typescript
   {error && (
     <Alert variant="warning">
       {error.message}
       {error.code === 'RECONNECT_FAILED' && (
         <Button onClick={reconnect}>Retry</Button>
       )}
     </Alert>
   )}
   ```

3. **Connection Status**: Show connection status for transparency
   ```typescript
   {!isConnected && <Badge>Connecting...</Badge>}
   ```

4. **Cleanup**: The hook automatically cleans up on unmount

## Examples

### Basic Usage

```typescript
function ProgressView({ projectId }: { projectId: string }) {
  const { progress, stage, isConnected } = useWebSocket(projectId);

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Live' : '🔴 Offline'}</div>
      <div>Progress: {progress}%</div>
      <div>Stage: {stage}</div>
    </div>
  );
}
```

### With Error Handling

```typescript
function ProgressViewWithErrors({ projectId }: { projectId: string }) {
  const { 
    progress, 
    stage, 
    error, 
    reconnect,
    isConnected 
  } = useWebSocket(projectId);

  if (error) {
    return (
      <Alert variant="error">
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        {error.code === 'RECONNECT_FAILED' && (
          <Button onClick={reconnect}>Retry Connection</Button>
        )}
      </Alert>
    );
  }

  return (
    <div>
      {!isConnected && <Spinner />}
      <ProgressBar value={progress} />
      <Text>{stage}</Text>
    </div>
  );
}
```

### Conditional Connection

```typescript
function ProjectDetails({ project }: { project: Project }) {
  // Only connect if project is being analyzed
  const shouldConnect = project.status === 'analyzing';
  
  const { progress, stage } = useWebSocket(
    shouldConnect ? project.id : null
  );

  if (project.status === 'analyzing') {
    return <ProgressTracker progress={progress} stage={stage} />;
  }

  return <CompletedView project={project} />;
}
```

## Testing

To test the WebSocket hook:

1. Start the backend server with WebSocket support
2. Create a project and start analysis
3. Navigate to the project page
4. Observe real-time progress updates
5. Test reconnection by temporarily stopping the server
6. Verify error messages display correctly

## Troubleshooting

### Connection Issues

- Verify `VITE_WS_URL` is set correctly
- Check that the backend WebSocket server is running
- Ensure CORS is configured properly on the backend
- Check browser console for connection errors

### No Updates Received

- Verify the project is in 'analyzing' status
- Check that the backend is emitting progress events
- Ensure the subscription is successful (check console logs)
- Verify the projectId is correct

### Reconnection Failures

- Check network connectivity
- Verify the backend server is accessible
- Increase `reconnectionAttempts` if needed
- Check for firewall or proxy issues

## Related Components

- `ProgressTracker` - Displays progress updates from this hook
- `ProjectPage` - Uses this hook for real-time updates
- `Dashboard` - Uses WebSocket for dashboard-wide updates
