import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../utils';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import * as api from '../../api/endpoints';

describe('Upload Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes full upload flow from GitHub', async () => {
    const user = userEvent.setup();

    // Mock API calls
    const createProjectSpy = vi.spyOn(api, 'createProject').mockResolvedValue({
      data: {
        id: '123',
        name: 'New Project',
        status: 'pending',
        sourceType: 'github',
        sourceUrl: 'https://github.com/user/repo',
      },
    });

    render(<App />);

    // Click "New Analysis" button
    const newAnalysisButton = screen.getByRole('button', { name: /new analysis/i });
    await user.click(newAnalysisButton);

    // Modal should open
    expect(screen.getByText(/new analysis/i)).toBeInTheDocument();

    // Enter GitHub URL
    const urlInput = screen.getByPlaceholderText(/github url/i);
    await user.type(urlInput, 'https://github.com/user/repo');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /analyze/i });
    await user.click(submitButton);

    // Verify API was called
    await waitFor(() => {
      expect(createProjectSpy).toHaveBeenCalledWith({
        sourceType: 'github',
        sourceUrl: 'https://github.com/user/repo',
      });
    });

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText(/new analysis/i)).not.toBeInTheDocument();
    });

    // Success message should appear
    expect(screen.getByText(/analysis started/i)).toBeInTheDocument();
  });

  it('handles upload errors gracefully', async () => {
    const user = userEvent.setup();

    // Mock API to return error
    vi.spyOn(api, 'createProject').mockRejectedValue(new Error('Upload failed'));

    render(<App />);

    const newAnalysisButton = screen.getByRole('button', { name: /new analysis/i });
    await user.click(newAnalysisButton);

    const urlInput = screen.getByPlaceholderText(/github url/i);
    await user.type(urlInput, 'https://github.com/user/repo');

    const submitButton = screen.getByRole('button', { name: /analyze/i });
    await user.click(submitButton);

    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });

    // Modal should remain open
    expect(screen.getByText(/new analysis/i)).toBeInTheDocument();
  });

  it('validates form before submission', async () => {
    const user = userEvent.setup();
    render(<App />);

    const newAnalysisButton = screen.getByRole('button', { name: /new analysis/i });
    await user.click(newAnalysisButton);

    // Try to submit without entering URL
    const submitButton = screen.getByRole('button', { name: /analyze/i });
    await user.click(submitButton);

    // Validation error should appear
    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });
});
