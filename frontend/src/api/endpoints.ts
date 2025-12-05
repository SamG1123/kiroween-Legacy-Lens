import apiClient from './client';
import type { Project, CreateProjectDTO, Analysis, Report } from '../types';

export const projectsAPI = {
  getAll: async () => {
    const response = await apiClient.get<Project[]>('/projects');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },
  create: async (data: CreateProjectDTO) => {
    const response = await apiClient.post<Project>('/analyze', data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data;
  },
};

export const analysisAPI = {
  getStatus: async (id: string) => {
    const response = await apiClient.get<Analysis>(`/analysis/${id}`);
    return response.data;
  },
  getReport: async (id: string) => {
    const response = await apiClient.get<Report>(`/report/${id}`);
    return response.data;
  },
  downloadReport: async (id: string, format: string) => {
    const response = await apiClient.get<Blob>(`/report/${id}/download?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
