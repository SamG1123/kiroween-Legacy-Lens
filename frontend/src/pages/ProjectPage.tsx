import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import { ArrowLeft, FileCode, GitBranch, AlertCircle, BarChart3, Loader2 } from 'lucide-react';
import { useProject, useProjectReport } from '../hooks/useProjects';
import LanguagesTab from '../components/LanguagesTab';
import DependenciesTab from '../components/DependenciesTab';
import MetricsTab from '../components/MetricsTab';
import IssuesTab from '../components/IssuesTab';
import { ProgressTracker } from '../components/ProgressTracker';
import { useWebSocket } from '../hooks/useWebSocket';
import { ReportDownloadButton } from '../components/ReportDownload';
import ErrorDisplay from '../components/ErrorDisplay';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: projectLoading, error: projectError, refetch: refetchProject } = useProject(id || '');
  const { data: report, isLoading: reportLoading, error: reportError, refetch: refetchReport } = useProjectReport(id || '');
  
  // Connect to WebSocket for real-time progress updates
  const { 
    progress, 
    stage, 
    estimatedTimeRemaining, 
    isConnected, 
    error: wsError,
    reconnect 
  } = useWebSocket(
    project?.status === 'analyzing' ? id || null : null
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'analyzing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceTypeIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'github':
        return <GitBranch className="h-4 w-4" />;
      case 'zip':
        return <FileCode className="h-4 w-4" />;
      case 'local':
        return <FileCode className="h-4 w-4" />;
      default:
        return <FileCode className="h-4 w-4" />;
    }
  };

  if (projectLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Tabs skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-full sm:w-96" />
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <ErrorDisplay 
          error={projectError || new Error('Project not found')}
          onRetry={() => refetchProject()}
          title="Failed to load project"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Breadcrumb Navigation */}
      <nav 
        aria-label="Breadcrumb" 
        className="flex items-center gap-2 text-xs sm:text-sm overflow-x-auto"
      >
        <Link 
          to="/" 
          className="text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors whitespace-nowrap focus-visible-ring rounded"
          aria-label="Return to dashboard"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </Link>
        <span className="text-gray-400" aria-hidden="true">/</span>
        <span className="text-gray-900 truncate" aria-current="page">{project.name}</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
              {project.name}
            </h1>
            <Badge className={`${getStatusColor(project.status)} text-xs whitespace-nowrap`}>
              {project.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
            <div className="flex items-center gap-1">
              {getSourceTypeIcon(project.sourceType)}
              <span className="capitalize">{project.sourceType}</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
            <span className="hidden sm:inline">•</span>
            <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <ReportDownloadButton
            projectId={id || ''}
            projectName={project.name}
            disabled={project.status !== 'completed'}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs 
        defaultValue="overview" 
        className="space-y-4"
        aria-label="Project analysis sections"
      >
        <TabsList className="w-full sm:w-auto grid grid-cols-5 sm:inline-flex">
          <TabsTrigger 
            value="overview" 
            className="text-xs sm:text-sm focus-visible-ring"
            aria-label="Overview section"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="languages" 
            className="text-xs sm:text-sm focus-visible-ring"
            aria-label="Languages section"
          >
            Languages
          </TabsTrigger>
          <TabsTrigger 
            value="dependencies" 
            className="text-xs sm:text-sm focus-visible-ring"
            aria-label="Dependencies section"
          >
            Deps
          </TabsTrigger>
          <TabsTrigger 
            value="metrics" 
            className="text-xs sm:text-sm focus-visible-ring"
            aria-label="Metrics section"
          >
            Metrics
          </TabsTrigger>
          <TabsTrigger 
            value="issues" 
            className="text-xs sm:text-sm focus-visible-ring"
            aria-label="Issues section"
          >
            Issues
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {project.status === 'completed' && report ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Lines</CardTitle>
                  <FileCode className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{report.metrics.totalLines.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {report.metrics.codeLines.toLocaleString()} code, {report.metrics.commentLines.toLocaleString()} comments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Languages</CardTitle>
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{report.languages.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Primary: {report.languages[0]?.language || 'N/A'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Dependencies</CardTitle>
                  <GitBranch className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{report.dependencies.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {report.dependencies.filter(d => d.type === 'runtime').length} runtime, {report.dependencies.filter(d => d.type === 'dev').length} dev
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Issues</CardTitle>
                  <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{report.issues.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {report.issues.filter(i => i.severity === 'critical' || i.severity === 'high').length} high priority
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : project.status === 'analyzing' ? (
            <div className="space-y-4">
              {/* WebSocket connection status */}
              {wsError && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">{wsError.message}</span>
                    </div>
                    {wsError.code === 'RECONNECT_FAILED' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={reconnect}
                        className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                      >
                        Retry Connection
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {!isConnected && !wsError && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="flex items-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-800">Connecting to real-time updates...</span>
                  </CardContent>
                </Card>
              )}
              
              <ProgressTracker
                progress={progress}
                stage={stage}
                estimatedTimeRemaining={estimatedTimeRemaining}
                isAnalyzing={true}
                onCancel={() => {
                  // TODO: Implement cancel functionality
                  console.log('Cancel analysis requested');
                }}
              />
            </div>
          ) : project.status === 'pending' ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <FileCode className="h-12 w-12 text-yellow-500 mx-auto" />
                  <p className="text-lg font-medium">Analysis pending</p>
                  <p className="text-sm text-gray-500">Your project is queued for analysis</p>
                </div>
              </CardContent>
            </Card>
          ) : project.status === 'failed' ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                  <p className="text-lg font-medium">Analysis failed</p>
                  <p className="text-sm text-gray-500">Please try uploading the project again</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {project.status === 'completed' && report && (
            <Card>
              <CardHeader>
                <CardTitle>Maintainability Index</CardTitle>
                <CardDescription>Overall code quality score (0-100)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{report.metrics.maintainabilityIndex}</span>
                    <Badge className={
                      report.metrics.maintainabilityIndex >= 80 ? 'bg-green-100 text-green-800' :
                      report.metrics.maintainabilityIndex >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {report.metrics.maintainabilityIndex >= 80 ? 'Good' :
                       report.metrics.maintainabilityIndex >= 60 ? 'Fair' : 'Poor'}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        report.metrics.maintainabilityIndex >= 80 ? 'bg-green-500' :
                        report.metrics.maintainabilityIndex >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${report.metrics.maintainabilityIndex}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Languages Tab */}
        <TabsContent value="languages">
          {reportError ? (
            <ErrorDisplay 
              error={reportError}
              onRetry={() => refetchReport()}
              title="Failed to load language data"
            />
          ) : (
            <LanguagesTab 
              languages={report?.languages || []} 
              isLoading={reportLoading} 
            />
          )}
        </TabsContent>

        {/* Dependencies Tab */}
        <TabsContent value="dependencies">
          {reportError ? (
            <ErrorDisplay 
              error={reportError}
              onRetry={() => refetchReport()}
              title="Failed to load dependency data"
            />
          ) : (
            <DependenciesTab 
              dependencies={report?.dependencies || []} 
              frameworks={report?.frameworks}
              isLoading={reportLoading} 
            />
          )}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          {reportError ? (
            <ErrorDisplay 
              error={reportError}
              onRetry={() => refetchReport()}
              title="Failed to load metrics data"
            />
          ) : (
            <MetricsTab 
              metrics={report?.metrics} 
              isLoading={reportLoading} 
            />
          )}
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues">
          {reportError ? (
            <ErrorDisplay 
              error={reportError}
              onRetry={() => refetchReport()}
              title="Failed to load issues data"
            />
          ) : (
            <IssuesTab 
              issues={report?.issues || []} 
              isLoading={reportLoading} 
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
