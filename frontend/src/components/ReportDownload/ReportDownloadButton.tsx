import { useState } from 'react';
import { Button } from '../ui/button';
import { 
  Download, 
  FileJson, 
  FileText, 
  FileCode, 
  Link as LinkIcon, 
  Check,
  Loader2,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { downloadReport, copyReportUrl, type ReportFormat } from '../../utils/reportDownload';
import toast from 'react-hot-toast';

interface ReportDownloadButtonProps {
  projectId: string;
  projectName: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function ReportDownloadButton({
  projectId,
  projectName,
  disabled = false,
  variant = 'default',
  size = 'default',
}: ReportDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<ReportFormat | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleDownload = async (format: ReportFormat) => {
    setDownloading(true);
    setDownloadingFormat(format);

    try {
      await downloadReport(projectId, projectName, format, {
        onSuccess: () => {
          toast.success(`Your ${format.toUpperCase()} report is downloading.`);
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to download report. Please try again.');
        },
      });
    } catch (error) {
      // Error already handled in onError callback
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
      setDownloadingFormat(null);
    }
  };

  const handleCopyUrl = async (format?: ReportFormat) => {
    try {
      await copyReportUrl(projectId, format);
      setCopySuccess(true);
      toast.success('Report URL has been copied to clipboard.');
      
      // Reset copy success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      toast.error('Failed to copy URL to clipboard.');
    }
  };

  const formatOptions: Array<{ format: ReportFormat; icon: typeof FileJson; label: string }> = [
    { format: 'json', icon: FileJson, label: 'JSON' },
    { format: 'pdf', icon: FileText, label: 'PDF' },
    { format: 'markdown', icon: FileCode, label: 'Markdown' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          disabled={disabled || downloading}
          className="flex items-center gap-2"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {downloading ? `Downloading ${downloadingFormat?.toUpperCase()}...` : 'Download Report'}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold">Download as</div>
        {formatOptions.map(({ format, icon: Icon, label }) => (
          <DropdownMenuItem
            key={format}
            onClick={() => handleDownload(format)}
            disabled={downloading}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {downloadingFormat === format && (
              <Loader2 className="h-4 w-4 ml-auto animate-spin" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleCopyUrl()}
          className="flex items-center gap-2 cursor-pointer"
        >
          {copySuccess ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <LinkIcon className="h-4 w-4" />
          )}
          <span>{copySuccess ? 'URL Copied!' : 'Copy Report URL'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
