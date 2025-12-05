import { useQuery } from '@tanstack/react-query';
import { analysisAPI } from '../api/endpoints';
import logger from '@/utils/logger';

/**
 * Hook to fetch analysis status for a project
 */
export function useAnalysisStatus(projectId: string) {
  return useQuery({
    queryKey: ['analysis', projectId],
    queryFn: () => analysisAPI.getStatus(projectId),
    enabled: !!projectId,
    refetchInterval: (query) => {
      // Stop polling if analysis is complete or failed
      const data = query.state.data;
      if (data && data.progress >= 100) {
        return false;
      }
      return 2000; // Poll every 2 seconds during analysis
    },
  });
}

/**
 * Hook to fetch analysis report for a project
 */
export function useReport(projectId: string) {
  return useQuery({
    queryKey: ['report', projectId],
    queryFn: () => analysisAPI.getReport(projectId),
    enabled: !!projectId,
  });
}

/**
 * Hook to download a report
 * Note: This is not a query hook since downloads are imperative actions
 */
export async function downloadReport(projectId: string, format: 'json' | 'pdf' | 'markdown') {
  try {
    const blob = await analysisAPI.downloadReport(projectId, format);
    
    // Create a download link and trigger it
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${projectId}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    logger.error('Failed to download report:', error);
    throw error;
  }
}
