import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { Plus, Search, Filter, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Card } from '../ui/card';
import ProjectCard from '../ProjectCard';
import ErrorDisplay from '../ErrorDisplay';
import { ProjectCardSkeleton } from '../LoadingStates';
import { useProjects, useDebounce } from '../../hooks';
import { useDeleteProject } from '../../hooks/useProjects';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { showErrorToast, showSuccessToast } from '../../utils/errorHandling';
import type { Project } from '../../types';

// Lazy load UploadModal for better initial load performance
const UploadModal = lazy(() => import('../UploadModal'));

type StatusFilter = 'all' | 'pending' | 'analyzing' | 'completed' | 'failed';
type SortOption = 'date' | 'name' | 'status';

export default function Dashboard() {
  const { data: projects, isLoading, error, refetch } = useProjects();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  
  const queryClient = useQueryClient();
  const deleteProjectMutation = useDeleteProject();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Debounce search query to avoid excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // N key - Open new analysis modal
      if (event.key === 'n' && !event.ctrlKey && !event.altKey && !event.metaKey && !isTyping) {
        event.preventDefault();
        setIsUploadModalOpen(true);
      }
      
      // / key - Focus search input
      if (event.key === '/' && !event.ctrlKey && !event.altKey && !event.metaKey && !isTyping) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // WebSocket connection for real-time dashboard updates
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    const socket: Socket = io(wsUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('Dashboard WebSocket connected');
      setWsConnected(true);
      // Subscribe to all project updates
      socket.emit('subscribe_dashboard');
    });

    socket.on('disconnect', () => {
      console.log('Dashboard WebSocket disconnected');
      setWsConnected(false);
    });

    // Listen for project status updates
    socket.on('project_updated', (data: { projectId: string; status: string }) => {
      console.log('Project updated:', data);
      // Invalidate projects query to refetch
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });

    // Listen for new projects
    socket.on('project_created', () => {
      console.log('New project created');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });

    // Listen for deleted projects
    socket.on('project_deleted', () => {
      console.log('Project deleted');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });

    return () => {
      socket.emit('unsubscribe_dashboard');
      socket.disconnect();
    };
  }, [queryClient]);

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    if (!projects) return [];

    let filtered = projects;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p: Project) => p.status === statusFilter);
    }

    // Apply search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((p: Project) =>
        p.name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a: Project, b: Project) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return sorted;
  }, [projects, statusFilter, debouncedSearchQuery, sortBy]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!projects) return { total: 0, pending: 0, analyzing: 0, completed: 0, failed: 0 };

    return {
      total: projects.length,
      pending: projects.filter((p: Project) => p.status === 'pending').length,
      analyzing: projects.filter((p: Project) => p.status === 'analyzing').length,
      completed: projects.filter((p: Project) => p.status === 'completed').length,
      failed: projects.filter((p: Project) => p.status === 'failed').length,
    };
  }, [projects]);

  const handleDeleteProject = (projectId: string) => {
    // Find the project to get its name for the confirmation dialog
    const project = projects?.find((p: Project) => p.id === projectId);
    if (project) {
      setProjectToDelete({ id: projectId, name: project.name });
      setDeleteDialogOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProjectMutation.mutateAsync(projectToDelete.id);
      
      showSuccessToast(`"${projectToDelete.name}" has been successfully deleted.`);
      
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      showErrorToast(error, 'Failed to delete project');
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            {/* Real-time connection indicator */}
            <div 
              className="flex items-center gap-1.5 text-xs"
              role="status"
              aria-live="polite"
              aria-label={wsConnected ? 'Real-time updates connected' : 'Real-time updates disconnected'}
            >
              {wsConnected ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
                  <span className="text-green-600">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                  <span className="text-gray-400">Offline</span>
                </>
              )}
            </div>
          </div>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Manage and monitor your code analysis projects
          </p>
        </div>
        <Button 
          className="flex items-center gap-2 w-full sm:w-auto justify-center focus-visible-ring" 
          onClick={() => setIsUploadModalOpen(true)}
          aria-label="Create new analysis project"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>New Analysis</span>
        </Button>
      </div>

      {/* Summary Statistics */}
      <div 
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4"
        role="region"
        aria-label="Project statistics summary"
      >
        <Card className="p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-500" id="stat-total-label">Total Projects</div>
          <div 
            className="text-xl sm:text-2xl font-bold mt-1"
            aria-labelledby="stat-total-label"
            role="status"
          >
            {stats.total}
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-500" id="stat-pending-label">Pending</div>
          <div 
            className="text-xl sm:text-2xl font-bold mt-1 text-yellow-600"
            aria-labelledby="stat-pending-label"
            role="status"
          >
            {stats.pending}
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-500" id="stat-analyzing-label">Analyzing</div>
          <div 
            className="text-xl sm:text-2xl font-bold mt-1 text-blue-600"
            aria-labelledby="stat-analyzing-label"
            role="status"
          >
            {stats.analyzing}
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-500" id="stat-completed-label">Completed</div>
          <div 
            className="text-xl sm:text-2xl font-bold mt-1 text-green-600"
            aria-labelledby="stat-completed-label"
            role="status"
          >
            {stats.completed}
          </div>
        </Card>
        <Card className="p-3 sm:p-4 col-span-2 sm:col-span-1">
          <div className="text-xs sm:text-sm text-gray-500" id="stat-failed-label">Failed</div>
          <div 
            className="text-xl sm:text-2xl font-bold mt-1 text-red-600"
            aria-labelledby="stat-failed-label"
            role="status"
          >
            {stats.failed}
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-3 sm:gap-4" role="search">
        {/* Search Input */}
        <div className="relative flex-1">
          <label htmlFor="project-search" className="sr-only">
            Search projects by name
          </label>
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" 
            aria-hidden="true"
          />
          <Input
            ref={searchInputRef}
            id="project-search"
            type="text"
            placeholder="Search projects... (Press / to focus)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 focus-visible-ring"
            aria-label="Search projects by name"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Filter Buttons */}
          <div 
            className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0"
            role="group"
            aria-label="Filter projects by status"
          >
            <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" aria-hidden="true" />
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="whitespace-nowrap focus-visible-ring"
                aria-pressed={statusFilter === 'all'}
                aria-label="Show all projects"
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
                className="whitespace-nowrap focus-visible-ring"
                aria-pressed={statusFilter === 'pending'}
                aria-label="Show pending projects"
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === 'analyzing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('analyzing')}
                className="whitespace-nowrap focus-visible-ring"
                aria-pressed={statusFilter === 'analyzing'}
                aria-label="Show analyzing projects"
              >
                Analyzing
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('completed')}
                className="whitespace-nowrap focus-visible-ring"
                aria-pressed={statusFilter === 'completed'}
                aria-label="Show completed projects"
              >
                Completed
              </Button>
              <Button
                variant={statusFilter === 'failed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('failed')}
                className="whitespace-nowrap focus-visible-ring"
                aria-pressed={statusFilter === 'failed'}
                aria-label="Show failed projects"
              >
                Failed
              </Button>
            </div>
          </div>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger 
              className="w-full sm:w-[180px] focus-visible-ring"
              aria-label="Sort projects"
            >
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="status">Sort by Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Project Grid */}
      <div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        role="region"
        aria-label="Project list"
        aria-live="polite"
        aria-busy={isLoading}
      >
        {isLoading && (
          <>
            {[...Array(6)].map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </>
        )}

        {error && (
          <div className="col-span-full">
            <ErrorDisplay 
              error={error} 
              onRetry={() => refetch()}
              title="Failed to load projects"
            />
          </div>
        )}

        {!isLoading && !error && filteredAndSortedProjects.length === 0 && (
          <Card className="p-6 col-span-full">
            <p className="text-gray-500 text-center" role="status">
              {searchQuery || statusFilter !== 'all'
                ? 'No projects match your filters.'
                : 'No projects yet. Click "New Analysis" to get started.'}
            </p>
          </Card>
        )}

        {!isLoading && filteredAndSortedProjects.map((project: Project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onDelete={handleDeleteProject}
          />
        ))}
      </div>

      {/* Upload Modal - Lazy loaded for better performance */}
      {isUploadModalOpen && (
        <Suspense fallback={null}>
          <UploadModal open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen} />
        </Suspense>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Project
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
              All analysis data and reports associated with this project will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelDelete}
              disabled={deleteProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
