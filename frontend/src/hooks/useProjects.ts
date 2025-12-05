import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsAPI, analysisAPI } from '../api/endpoints';
import type { CreateProjectDTO } from '../types';

/**
 * Hook to fetch all projects
 */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsAPI.getAll,
    refetchInterval: 5000, // Poll every 5 seconds for status updates
  });
}

/**
 * Hook to fetch a single project by ID
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsAPI.getById(id),
    enabled: !!id, // Only run query if id is provided
  });
}

/**
 * Hook to fetch project report
 */
export function useProjectReport(id: string) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => analysisAPI.getReport(id),
    enabled: !!id, // Only run query if id is provided
  });
}

/**
 * Hook to create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectDTO) => projectsAPI.create(data),
    onSuccess: () => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * Hook to delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsAPI.delete(id),
    onSuccess: () => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
