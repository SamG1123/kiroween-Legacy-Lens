import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Github, Upload, FolderOpen, X, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { projectsAPI } from '../../api/endpoints';
import type { CreateProjectDTO } from '../../types';
import { showErrorToast, showSuccessToast } from '../../utils/errorHandling';
import { HelpTooltip } from '../Help';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

export default function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [activeTab, setActiveTab] = useState<'github' | 'zip' | 'local'>('github');
  const [githubUrl, setGithubUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPath, setLocalPath] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    githubUrl?: string;
    projectName?: string;
    file?: string;
    localPath?: string;
  }>({});

  // Upload progress
  const [uploadProgress, setUploadProgress] = useState(0);

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: CreateProjectDTO) => {
      // Simulate upload progress for file uploads
      if (data.file) {
        setUploadProgress(0);
        const interval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(interval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);
      }

      const result = await projectsAPI.create(data);
      
      if (data.file) {
        setUploadProgress(100);
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showSuccessToast('Project created successfully!');
      handleClose();
    },
    onError: (error: unknown) => {
      showErrorToast(error, 'Failed to create project');
      setUploadProgress(0);
    },
  });

  // Validation functions
  const validateGithubUrl = (url: string): string | undefined => {
    if (!url.trim()) {
      return 'GitHub URL is required';
    }
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    if (!githubRegex.test(url)) {
      return 'Please enter a valid GitHub repository URL';
    }
    return undefined;
  };

  const validateProjectName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'Project name is required';
    }
    if (name.length < 3) {
      return 'Project name must be at least 3 characters';
    }
    return undefined;
  };

  const validateFile = (file: File | null): string | undefined => {
    if (!file) {
      return 'Please select a file';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 100MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
    }
    if (!file.name.endsWith('.zip')) {
      return 'Only ZIP files are supported';
    }
    return undefined;
  };

  const validateLocalPath = (path: string): string | undefined => {
    if (!path.trim()) {
      return 'Local path is required';
    }
    return undefined;
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setErrors({ ...errors, file: error });
      setSelectedFile(null);
      return;
    }
    
    setSelectedFile(file);
    setErrors({ ...errors, file: undefined });
    
    // Auto-fill project name from file name
    if (!projectName) {
      const name = file.name.replace('.zip', '');
      setProjectName(name);
    }
  };

  // Handle drag and drop
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    const newErrors: typeof errors = {};

    // Validate based on active tab
    if (activeTab === 'github') {
      const urlError = validateGithubUrl(githubUrl);
      const nameError = validateProjectName(projectName);
      
      if (urlError) newErrors.githubUrl = urlError;
      if (nameError) newErrors.projectName = nameError;
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      createProjectMutation.mutate({
        name: projectName,
        sourceType: 'github',
        sourceUrl: githubUrl,
      });
    } else if (activeTab === 'zip') {
      const fileError = validateFile(selectedFile);
      const nameError = validateProjectName(projectName);
      
      if (fileError) newErrors.file = fileError;
      if (nameError) newErrors.projectName = nameError;
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      createProjectMutation.mutate({
        name: projectName,
        sourceType: 'zip',
        file: selectedFile!,
      });
    } else if (activeTab === 'local') {
      const pathError = validateLocalPath(localPath);
      const nameError = validateProjectName(projectName);
      
      if (pathError) newErrors.localPath = pathError;
      if (nameError) newErrors.projectName = nameError;
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      createProjectMutation.mutate({
        name: projectName,
        sourceType: 'local',
        path: localPath,
      });
    }
  };

  // Reset form
  const handleClose = () => {
    setGithubUrl('');
    setProjectName('');
    setSelectedFile(null);
    setLocalPath('');
    setErrors({});
    setUploadProgress(0);
    setActiveTab('github');
    onOpenChange(false);
  };

  const isLoading = createProjectMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px]"
        aria-describedby="upload-modal-description"
      >
        <DialogHeader>
          <DialogTitle>New Analysis</DialogTitle>
          <DialogDescription id="upload-modal-description">
            Upload a codebase from GitHub, ZIP file, or local directory to start analysis.
          </DialogDescription>
        </DialogHeader>

        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          aria-label="Upload source selection"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger 
              value="github" 
              className="flex items-center gap-2 focus-visible-ring"
              aria-label="Upload from GitHub repository"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              GitHub
            </TabsTrigger>
            <TabsTrigger 
              value="zip" 
              className="flex items-center gap-2 focus-visible-ring"
              aria-label="Upload ZIP file"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              ZIP File
            </TabsTrigger>
            <TabsTrigger 
              value="local" 
              className="flex items-center gap-2 focus-visible-ring"
              aria-label="Upload from local directory"
            >
              <FolderOpen className="h-4 w-4" aria-hidden="true" />
              Local
            </TabsTrigger>
          </TabsList>

          {/* GitHub Tab */}
          <TabsContent value="github" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="github-url">GitHub Repository URL</Label>
                <HelpTooltip 
                  content="Enter the full URL of a public GitHub repository. Example: https://github.com/username/repository"
                  side="right"
                />
              </div>
              <Input
                id="github-url"
                type="url"
                placeholder="https://github.com/username/repository"
                value={githubUrl}
                onChange={(e) => {
                  setGithubUrl(e.target.value);
                  setErrors({ ...errors, githubUrl: undefined });
                }}
                disabled={isLoading}
                className="focus-visible-ring"
                aria-invalid={!!errors.githubUrl}
                aria-describedby={errors.githubUrl ? "github-url-error" : undefined}
              />
              {errors.githubUrl && (
                <div 
                  id="github-url-error"
                  className="flex items-center gap-2 text-sm text-red-500"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {errors.githubUrl}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="github-project-name">Project Name</Label>
              <Input
                id="github-project-name"
                type="text"
                placeholder="My Project"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  setErrors({ ...errors, projectName: undefined });
                }}
                disabled={isLoading}
                className="focus-visible-ring"
                aria-invalid={!!errors.projectName}
                aria-describedby={errors.projectName ? "github-project-name-error" : undefined}
              />
              {errors.projectName && (
                <div 
                  id="github-project-name-error"
                  className="flex items-center gap-2 text-sm text-red-500"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {errors.projectName}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ZIP File Tab */}
          <TabsContent value="zip" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Upload ZIP File</Label>
                <HelpTooltip 
                  content="Upload a compressed codebase. Maximum file size is 100MB. The ZIP should contain your project's source code."
                  side="right"
                />
              </div>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 hover:border-gray-400'
                } ${errors.file ? 'border-red-500' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-label={selectedFile ? `Selected file: ${selectedFile.name}. Click to change file.` : 'Click or drag and drop to upload ZIP file'}
                aria-describedby={errors.file ? "file-upload-error" : "file-upload-help"}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={isLoading}
                  aria-label="Upload ZIP file"
                />
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" aria-hidden="true" />
                {selectedFile ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      disabled={isLoading}
                      className="focus-visible-ring"
                      aria-label={`Remove ${selectedFile.name}`}
                    >
                      <X className="h-4 w-4 mr-2" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Drag and drop your ZIP file here, or click to browse
                    </p>
                    <p id="file-upload-help" className="text-xs text-gray-500">Maximum file size: 100MB</p>
                  </div>
                )}
              </div>
              {errors.file && (
                <div 
                  id="file-upload-error"
                  className="flex items-center gap-2 text-sm text-red-500"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {errors.file}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip-project-name">Project Name</Label>
              <Input
                id="zip-project-name"
                type="text"
                placeholder="My Project"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  setErrors({ ...errors, projectName: undefined });
                }}
                disabled={isLoading}
              />
              {errors.projectName && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  {errors.projectName}
                </div>
              )}
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div 
                className="space-y-2"
                role="status"
                aria-live="polite"
                aria-label={`Uploading file: ${uploadProgress}% complete`}
              >
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span aria-label={`${uploadProgress} percent complete`}>{uploadProgress}%</span>
                </div>
                <Progress 
                  value={uploadProgress}
                  aria-label="Upload progress"
                />
              </div>
            )}
          </TabsContent>

          {/* Local Directory Tab */}
          <TabsContent value="local" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="local-path">Local Directory Path</Label>
              <Input
                id="local-path"
                type="text"
                placeholder="/path/to/your/project"
                value={localPath}
                onChange={(e) => {
                  setLocalPath(e.target.value);
                  setErrors({ ...errors, localPath: undefined });
                }}
                disabled={isLoading}
              />
              {errors.localPath && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  {errors.localPath}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="local-project-name">Project Name</Label>
              <Input
                id="local-project-name"
                type="text"
                placeholder="My Project"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  setErrors({ ...errors, projectName: undefined });
                }}
                disabled={isLoading}
              />
              {errors.projectName && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  {errors.projectName}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-4">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={isLoading}
            className="focus-visible-ring"
            aria-label="Cancel upload"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="focus-visible-ring"
            aria-label={isLoading ? 'Creating project...' : 'Start analysis'}
          >
            {isLoading ? 'Creating...' : 'Start Analysis'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
