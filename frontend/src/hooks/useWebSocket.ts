import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import logger from '@/utils/logger';

interface ProgressData {
  progress: number;
  stage: string;
  estimatedTimeRemaining?: number;
}

interface WebSocketError {
  message: string;
  code?: string;
}

/**
 * Hook to connect to WebSocket and receive real-time progress updates
 * Requirements: 3.2, 3.3
 * 
 * Features:
 * - Automatic connection management
 * - Real-time progress updates
 * - Reconnection handling
 * - Error handling
 * - Subscription management
 */
export function useWebSocket(projectId: string | null) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | undefined>();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<WebSocketError | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const socketRef = useRef<Socket | null>(null);
  const maxReconnectAttempts = 5;

  // Reset state when projectId changes
  useEffect(() => {
    setProgress(0);
    setStage('');
    setEstimatedTimeRemaining(undefined);
    setError(null);
    setReconnectAttempts(0);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      // Clean up if no projectId
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    
    // Create socket connection with options
    const socket: Socket = io(wsUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      timeout: 10000,
    });

    socketRef.current = socket;

    // Connection established
    socket.on('connect', () => {
      logger.log('WebSocket connected for project:', projectId);
      setIsConnected(true);
      setError(null);
      setReconnectAttempts(0);
      
      // Subscribe to project updates
      socket.emit('subscribe', projectId);
    });

    // Connection lost
    socket.on('disconnect', (reason) => {
      logger.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      
      // If disconnect was not intentional, show error
      if (reason === 'io server disconnect') {
        setError({ 
          message: 'Server disconnected. Attempting to reconnect...', 
          code: 'SERVER_DISCONNECT' 
        });
      } else if (reason === 'transport close' || reason === 'transport error') {
        setError({ 
          message: 'Connection lost. Attempting to reconnect...', 
          code: 'CONNECTION_LOST' 
        });
      }
    });

    // Reconnection attempt
    socket.io.on('reconnect_attempt', (attempt) => {
      logger.log('Reconnection attempt:', attempt);
      setReconnectAttempts(attempt);
      setError({ 
        message: `Reconnecting... (attempt ${attempt}/${maxReconnectAttempts})`, 
        code: 'RECONNECTING' 
      });
    });

    // Reconnection successful
    socket.io.on('reconnect', (attempt) => {
      logger.log('Reconnected after', attempt, 'attempts');
      setError(null);
      setReconnectAttempts(0);
      // Re-subscribe after reconnection
      socket.emit('subscribe', projectId);
    });

    // Reconnection failed
    socket.io.on('reconnect_failed', () => {
      logger.error('Reconnection failed after maximum attempts');
      setError({ 
        message: 'Unable to connect to server. Please refresh the page.', 
        code: 'RECONNECT_FAILED' 
      });
    });

    // Connection error
    socket.on('connect_error', (err) => {
      logger.error('WebSocket connection error:', err);
      setError({ 
        message: 'Failed to connect to server', 
        code: 'CONNECTION_ERROR' 
      });
    });

    // Progress updates - Requirement 3.2, 3.3
    socket.on('progress', (data: ProgressData) => {
      logger.log('Progress update:', data);
      setProgress(data.progress);
      setStage(data.stage);
      setEstimatedTimeRemaining(data.estimatedTimeRemaining);
      setError(null); // Clear any errors when receiving updates
    });

    // Analysis complete
    socket.on('analysis_complete', (data: { projectId: string }) => {
      logger.log('Analysis complete:', data);
      setProgress(100);
      setStage('complete');
      setEstimatedTimeRemaining(0);
    });

    // Analysis failed
    socket.on('analysis_failed', (data: { projectId: string; error: string }) => {
      logger.error('Analysis failed:', data);
      setError({ 
        message: `Analysis failed: ${data.error}`, 
        code: 'ANALYSIS_FAILED' 
      });
    });

    // Generic error handler
    socket.on('error', (err: Error | WebSocketError) => {
      logger.error('WebSocket error:', err);
      const errorMessage = typeof err === 'object' && 'message' in err 
        ? err.message 
        : 'An unknown error occurred';
      setError({ 
        message: errorMessage, 
        code: 'SOCKET_ERROR' 
      });
    });

    // Cleanup on unmount or projectId change
    return () => {
      logger.log('Cleaning up WebSocket connection');
      if (socket.connected) {
        socket.emit('unsubscribe', projectId);
      }
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      logger.log('Manual reconnect triggered');
      setError(null);
      setReconnectAttempts(0);
      socketRef.current.connect();
    }
  }, []);

  return {
    progress,
    stage,
    estimatedTimeRemaining,
    isConnected,
    error,
    reconnectAttempts,
    reconnect,
  };
}
