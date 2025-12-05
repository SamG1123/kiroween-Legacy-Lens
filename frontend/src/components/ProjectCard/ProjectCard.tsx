import { Github, FileArchive, FolderOpen, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { useAnalysisStatus } from '../../hooks/useAnalysis';
import { getStatusAriaLabel, getDateAriaLabel, getProgressAriaLabel } from '../../utils/accessibility';
import type { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
  onDelete?: (projectId: string) => void;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const navigate = useNavigate();
  const { data: analysisStatus } = useAnalysisStatus(
    project.status === 'analyzing' ? project.id : ''
  );

  // Get source type icon
  const getSourceIcon = () => {
    switch (project.sourceType) {
      case 'github':
        return <Github className="h-5 w-5 text-gray-600" />;
      case 'zip':
        return <FileArchive className="h-5 w-5 text-gray-600" />;
      case 'local':
        return <FolderOpen className="h-5 w-5 text-gray-600" />;
      default:
        return null;
    }
  };

  // Get status badge styling
  const getStatusBadgeClass = () => {
    switch (project.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'analyzing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format timestamp
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleView = () => {
    navigate(`/project/${project.id}`);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(project.id);
    }
  };

  return (
    <Card 
      className="p-4 sm:p-6 hover:shadow-lg transition-shadow group"
      role="article"
      aria-label={`Project: ${project.name}`}
    >
      {/* Header with name and status */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div aria-hidden="true">
            {getSourceIcon()}
          </div>
          <h3 
            className="font-semibold text-base sm:text-lg truncate" 
            title={project.name}
            id={`project-${project.id}-name`}
          >
            {project.name}
          </h3>
        </div>
        <Badge 
          className={`${getStatusBadgeClass()} text-xs whitespace-nowrap`}
          aria-label={getStatusAriaLabel(project.status)}
        >
          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
        </Badge>
      </div>

      {/* Progress indicator for analyzing projects */}
      {project.status === 'analyzing' && analysisStatus && (
        <div 
          className="mb-4 space-y-2"
          role="status"
          aria-live="polite"
          aria-label={getProgressAriaLabel(analysisStatus.progress, analysisStatus.stage)}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{analysisStatus.stage || 'Processing...'}</span>
            <span className="text-gray-600 font-medium" aria-label={`${analysisStatus.progress} percent complete`}>
              {analysisStatus.progress}%
            </span>
          </div>
          <Progress 
            value={analysisStatus.progress} 
            className="h-2"
            aria-label="Analysis progress"
          />
          {analysisStatus.estimatedTimeRemaining && (
            <p className="text-xs text-gray-500" role="timer">
              Est. {Math.ceil(analysisStatus.estimatedTimeRemaining / 60)} min remaining
            </p>
          )}
        </div>
      )}

      {/* Project metadata */}
      <dl className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center justify-between">
          <dt className="text-gray-500">Source:</dt>
          <dd className="font-medium capitalize">{project.sourceType}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-gray-500">Created:</dt>
          <dd 
            className="font-medium"
            aria-label={getDateAriaLabel(project.createdAt, 'Created')}
          >
            {formatDate(project.createdAt)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-gray-500">Updated:</dt>
          <dd 
            className="font-medium"
            aria-label={getDateAriaLabel(project.updatedAt, 'Updated')}
          >
            {formatDate(project.updatedAt)}
          </dd>
        </div>
      </dl>

      {/* Quick actions */}
      <div 
        className="flex gap-2 mt-4 pt-4 border-t border-gray-100"
        role="group"
        aria-label="Project actions"
      >
        <Button
          variant="outline"
          size="sm"
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm focus-visible-ring"
          onClick={handleView}
          aria-label={`View details for ${project.name}`}
        >
          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
          <span>View</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 focus-visible-ring"
          onClick={handleDelete}
          aria-label={`Delete ${project.name}`}
        >
          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
          <span>Delete</span>
        </Button>
      </div>
    </Card>
  );
}
