import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { LanguagePieChart } from './LanguagePieChart';
import { mockLanguages } from '../../test/mockData';

describe('LanguagePieChart', () => {
  it('renders chart with language data', () => {
    render(<LanguagePieChart data={mockLanguages} />);

    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('CSS')).toBeInTheDocument();
  });

  it('displays percentages correctly', () => {
    render(<LanguagePieChart data={mockLanguages} />);

    expect(screen.getByText(/65\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/25\.3%/)).toBeInTheDocument();
    expect(screen.getByText(/9\.2%/)).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<LanguagePieChart data={[]} />);

    expect(screen.getByText(/no language data/i)).toBeInTheDocument();
  });

  it('shows line counts in legend', () => {
    render(<LanguagePieChart data={mockLanguages} />);

    expect(screen.getByText(/10000 lines/i)).toBeInTheDocument();
    expect(screen.getByText(/3800 lines/i)).toBeInTheDocument();
  });
});
