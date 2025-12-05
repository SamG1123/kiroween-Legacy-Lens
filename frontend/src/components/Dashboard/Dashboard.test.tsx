import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { Dashboard } from './Dashboard';
import { mockProjects } from '../../test/mockData';

// Mock the useProjects hook
vi.mock('../../hooks/useProjects', () => ({
  useProjects: () => ({
    data: mockProjects,
    isLoading: false,
    error: null,
  }),
}));

describe('Dashboard', () => {
  it('renders project cards', () => {
    render(<Dashboard />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Analyzing Project')).toBeInTheDocument();
    expect(screen.getByText('Failed Project')).toBeInTheDocument();
  });

  it('filters projects by status', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    const completedFilter = screen.getByRole('button', { name: /completed/i });
    await user.click(completedFilter);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.queryByText('Analyzing Project')).not.toBeInTheDocument();
    });
  });

  it('searches projects by name', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Test');

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.queryByText('Failed Project')).not.toBeInTheDocument();
    });
  });

  it('displays summary statistics', () => {
    render(<Dashboard />);

    expect(screen.getByText(/total projects/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows new analysis button', () => {
    render(<Dashboard />);

    expect(screen.getByRole('button', { name: /new analysis/i })).toBeInTheDocument();
  });
});
