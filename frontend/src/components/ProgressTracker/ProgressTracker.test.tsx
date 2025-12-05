import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { ProgressTracker } from './ProgressTracker';

describe('ProgressTracker', () => {
  const mockStages = [
    { name: 'Uploading', status: 'completed' as const },
    { name: 'Analyzing', status: 'in-progress' as const },
    { name: 'Generating Report', status: 'pending' as const },
  ];

  it('renders progress bar with correct percentage', () => {
    render(<ProgressTracker progress={50} currentStage="Analyzing" stages={mockStages} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  it('displays current stage', () => {
    render(<ProgressTracker progress={50} currentStage="Analyzing" stages={mockStages} />);

    expect(screen.getByText('Analyzing')).toBeInTheDocument();
  });

  it('shows all stages with correct status', () => {
    render(<ProgressTracker progress={50} currentStage="Analyzing" stages={mockStages} />);

    expect(screen.getByText('Uploading')).toBeInTheDocument();
    expect(screen.getByText('Analyzing')).toBeInTheDocument();
    expect(screen.getByText('Generating Report')).toBeInTheDocument();
  });

  it('displays estimated time remaining', () => {
    render(
      <ProgressTracker
        progress={50}
        currentStage="Analyzing"
        stages={mockStages}
        estimatedTime={120}
      />
    );

    expect(screen.getByText(/2 minutes/i)).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ProgressTracker
        progress={50}
        currentStage="Analyzing"
        stages={mockStages}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('shows completion message at 100%', () => {
    const completedStages = mockStages.map((s) => ({ ...s, status: 'completed' as const }));

    render(
      <ProgressTracker progress={100} currentStage="Completed" stages={completedStages} />
    );

    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });
});
