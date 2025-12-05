import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { UploadModal } from './UploadModal';

describe('UploadModal', () => {
  it('renders when open', () => {
    render(<UploadModal open={true} onClose={() => {}} />);

    expect(screen.getByText(/new analysis/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /github/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /zip/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<UploadModal open={false} onClose={() => {}} />);

    expect(screen.queryByText(/new analysis/i)).not.toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    render(<UploadModal open={true} onClose={() => {}} />);

    const zipTab = screen.getByRole('tab', { name: /zip/i });
    await user.click(zipTab);

    expect(screen.getByText(/upload zip file/i)).toBeInTheDocument();
  });

  it('validates GitHub URL format', async () => {
    const user = userEvent.setup();
    render(<UploadModal open={true} onClose={() => {}} />);

    const urlInput = screen.getByPlaceholderText(/github url/i);
    await user.type(urlInput, 'invalid-url');

    const submitButton = screen.getByRole('button', { name: /analyze/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid url/i)).toBeInTheDocument();
    });
  });

  it('accepts valid GitHub URL', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<UploadModal open={true} onClose={() => {}} onSubmit={onSubmit} />);

    const urlInput = screen.getByPlaceholderText(/github url/i);
    await user.type(urlInput, 'https://github.com/user/repo');

    const submitButton = screen.getByRole('button', { name: /analyze/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it('validates file size limit', async () => {
    const user = userEvent.setup();
    render(<UploadModal open={true} onClose={() => {}} />);

    const zipTab = screen.getByRole('tab', { name: /zip/i });
    await user.click(zipTab);

    // Create a large file (>100MB)
    const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.zip', {
      type: 'application/zip',
    });

    const fileInput = screen.getByLabelText(/upload/i);
    await user.upload(fileInput, largeFile);

    await waitFor(() => {
      expect(screen.getByText(/file size exceeds/i)).toBeInTheDocument();
    });
  });
});
