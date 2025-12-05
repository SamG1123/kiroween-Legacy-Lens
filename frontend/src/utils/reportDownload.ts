import { analysisAPI } from '../api/endpoints';

export type ReportFormat = 'json' | 'pdf' | 'markdown';

export interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

/**
 * Download a report in the specified format
 */
export async function downloadReport(
  projectId: string,
  projectName: string,
  format: ReportFormat,
  options?: DownloadOptions
): Promise<void> {
  try {
    // Simulate progress for better UX (since blob downloads don't provide real progress)
    const progressInterval = setInterval(() => {
      if (options?.onProgress) {
        // Simulate progress
        const fakeProgress = Math.min(90, Math.random() * 100);
        options.onProgress({
          loaded: fakeProgress,
          total: 100,
          percentage: fakeProgress,
        });
      }
    }, 200);

    const blob = await analysisAPI.downloadReport(projectId, format);
    
    clearInterval(progressInterval);
    
    // Complete progress
    if (options?.onProgress) {
      options.onProgress({
        loaded: 100,
        total: 100,
        percentage: 100,
      });
    }

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFileName(projectName, format);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    options?.onSuccess?.();
  } catch (error) {
    const downloadError = error instanceof Error 
      ? error 
      : new Error('Failed to download report');
    options?.onError?.(downloadError);
    throw downloadError;
  }
}

/**
 * Generate the report URL for sharing
 */
export function getReportUrl(projectId: string, format?: ReportFormat): string {
  const baseUrl = window.location.origin;
  const formatParam = format ? `?format=${format}` : '';
  return `${baseUrl}/api/report/${projectId}/download${formatParam}`;
}

/**
 * Copy report URL to clipboard
 */
export async function copyReportUrl(
  projectId: string,
  format?: ReportFormat
): Promise<void> {
  const url = getReportUrl(projectId, format);
  
  try {
    await navigator.clipboard.writeText(url);
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
    } catch (err) {
      throw new Error('Failed to copy URL to clipboard');
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Generate appropriate filename for the report
 */
function getFileName(projectName: string, format: ReportFormat): string {
  const sanitizedName = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().split('T')[0];
  
  const extensions: Record<ReportFormat, string> = {
    json: 'json',
    pdf: 'pdf',
    markdown: 'md',
  };
  
  return `${sanitizedName}_report_${timestamp}.${extensions[format]}`;
}

/**
 * Get format display name
 */
export function getFormatDisplayName(format: ReportFormat): string {
  const names: Record<ReportFormat, string> = {
    json: 'JSON',
    pdf: 'PDF',
    markdown: 'Markdown',
  };
  return names[format];
}

/**
 * Get format icon name (for lucide-react)
 */
export function getFormatIcon(format: ReportFormat): string {
  const icons: Record<ReportFormat, string> = {
    json: 'FileJson',
    pdf: 'FileText',
    markdown: 'FileCode',
  };
  return icons[format];
}
