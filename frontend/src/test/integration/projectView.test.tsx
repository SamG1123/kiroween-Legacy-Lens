import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../utils';
import userEvent from '@testing-library/user-event';
import { ProjectPage } from '../../pages/ProjectPage';
import { mockProject, mockAnalysis } from '../mockData';
import * as api from '../../api/endpoints';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
  };
});

describe('Project View Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API calls
    vi.spyOn(api, 'getProject').mockResolvedValue({ data: mockProject });
    vi.spyOn(api, 'getAnalysis').mockResolvedValue({ data: mockAnalysis });
  });

  it('loads and displays project details', async () => {
    render(<ProjectPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    render(<ProjectPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Click Languages tab
    const languagesTab = screen.getByRole('tab', { name: /languages/i });
    await user.click(languagesTab);

    expect(screen.getByText('TypeScript')).toBeInTheDocument();

    // Click Dependencies tab
    const dependenciesTab = screen.getByRole('tab', { name: /dependencies/i });
    await user.click(dependenciesTab);

    expect(screen.getByText('react')).toBeInTheDocument();

    // Click Issues tab
    const issuesTab = screen.getByRole('tab', { name: /issues/i });
    await user.click(issuesTab);

    expect(screen.getByText(/function is too complex/i)).toBeInTheDocument();
  });

  it('filters issues by severity', async () => {
    const user = userEvent.setup();
    render(<ProjectPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Go to Issues tab
    const issuesTab = screen.getByRole('tab', { name: /issues/i });
    await user.click(issuesTab);

    // Filter by critical severity
    const severityFilter = screen.getByRole('combobox', { name: /severity/i });
    await user.click(severityFilter);
    await user.click(screen.getByText('Critical'));

    await waitFor(() => {
      expect(screen.getByText(/sql injection/i)).toBeInTheDocument();
      expect(screen.queryByText(/function is too complex/i)).not.toBeInTheDocument();
    });
  });

  it('downloads report', async () => {
    const user = userEvent.setup();
    const downloadSpy = vi.spyOn(api, 'downloadReport').mockResolvedValue({
      data: new Blob(['report content']),
    });

    render(<ProjectPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    const downloadButton = screen.getByRole('button', { name: /download/i });
    await user.click(downloadButton);

    // Select format
    await user.click(screen.getByText('JSON'));

    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalledWith('1', 'json');
    });
  });
});
