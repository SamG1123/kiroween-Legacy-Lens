import { Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Card } from '../ui/card';

interface UploadLoadingStateProps {
  progress: number;
  fileName?: string;
  status?: 'uploading' | 'processing' | 'complete';
  message?: string;
}

export function UploadLoadingState({ 
  progress, 
  fileName,
  status = 'uploading',
  message 
}: UploadLoadingStateProps) {
  const getIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />;
      case 'uploading':
      default:
        return <Upload className="h-12 w-12 text-blue-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'complete':
        return 'Upload complete';
      case 'processing':
        return 'Processing...';
      case 'uploading':
      default:
        return 'Uploading...';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          {getIcon()}
          {status === 'uploading' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xs font-bold text-blue-600">{progress}%</div>
            </div>
          )}
        </div>
        
        <div className="space-y-2 w-full">
          <p className="font-medium text-gray-900">{getStatusText()}</p>
          {fileName && (
            <p className="text-sm text-gray-500 truncate max-w-full">{fileName}</p>
          )}
          {message && (
            <p className="text-sm text-gray-600">{message}</p>
          )}
        </div>

        <div className="w-full space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{progress}%</span>
            <span>{status === 'complete' ? 'Done' : 'In progress'}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
