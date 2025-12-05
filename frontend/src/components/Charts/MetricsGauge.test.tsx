import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { MetricsGauge } from './MetricsGauge';

describe('MetricsGauge', () => {
  it('renders gauge with correct value', () => {
    render(<MetricsGauge value={75} label="Maintainability" />);

    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('Maintainability')).toBeInTheDocument();
  });

  it('shows good quality indicator for high values', () => {
    render(<MetricsGauge value={85} label="Quality" />);

    expect(screen.getByText(/good/i)).toBeInTheDocument();
  });

  it('shows poor quality indicator for low values', () => {
    render(<MetricsGauge value={30} label="Quality" />);

    expect(screen.getByText(/poor/i)).toBeInTheDocument();
  });

  it('shows moderate quality indicator for medium values', () => {
    render(<MetricsGauge value={60} label="Quality" />);

    expect(screen.getByText(/moderate/i)).toBeInTheDocument();
  });

  it('handles edge case values', () => {
    const { rerender } = render(<MetricsGauge value={0} label="Test" />);
    expect(screen.getByText('0')).toBeInTheDocument();

    rerender(<MetricsGauge value={100} label="Test" />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
