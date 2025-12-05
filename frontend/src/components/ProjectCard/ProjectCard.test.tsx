import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { ProjectCard } from './ProjectCard';
import { mockProject, mockAnalyzingProject } from '../../test/mockData';

describe('ProjectCard', () => {
  it('renders project information correctly', () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('github')).toBeInTheDocument();
  });

  it('shows progress bar for analyzing projects', () => {
    render(<ProjectCard project={mockAnalyzingProject} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('analyzing')).toBeInTheDocument();
  });

  it('calls onView when view button is clicked', async () => {
    const user = userEvent.setup();
    const onView = vi.fn();

    render(<ProjectCard project={mockProject} onView={onView} />);

    const viewButton = screen.getByRole('button', { name: /view/i });
    await user.click(viewButton);

    expect(onView).toHaveBeenCalledWith(mockProject.id);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<ProjectCard project={mockProject} onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(mockProject.id);
  });

  it('displays error message for failed projects', () => {
    const failedProject = {
      ...mockProject,
      status: 'failed' as const,
      error: 'Test error message',
    };

    render(<ProjectCard project={failedProject} />);

    expect(screen.getByText(/test error message/i)).toBeInTheDocument();
  });
});
