import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { parseError, getUserFriendlyMessage, getErrorSuggestion, isRetryableError } from '../utils/errorHandling';

interface ErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

export default function ErrorDisplay({ 
  error, 
  onRetry, 
  title = 'Error',
  className = '' 
}: ErrorDisplayProps) {
  const appError = parseError(error);
  const message = getUserFriendlyMessage(appError);
  const suggestion = getErrorSuggestion(appError);
  const canRetry = isRetryableError(appError);

  return (
    <Card className={`border-red-200 ${className}`}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-red-900">{title}</CardTitle>
            <CardDescription className="text-red-700 mt-1">
              {message}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {(suggestion || (onRetry && canRetry)) && (
        <CardContent className="space-y-3">
          {suggestion && (
            <p className="text-sm text-gray-600">
              <strong>Suggestion:</strong> {suggestion}
            </p>
          )}
          {onRetry && canRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
