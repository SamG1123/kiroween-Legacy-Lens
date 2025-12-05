import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { LanguageStats } from '../../types';

interface LanguagePieChartProps {
  languages: LanguageStats[];
  height?: number;
}

// Color palette for different languages
const LANGUAGE_COLORS: Record<string, string> = {
  'JavaScript': '#f7df1e',
  'TypeScript': '#3178c6',
  'Python': '#3776ab',
  'Java': '#007396',
  'C++': '#00599c',
  'C#': '#239120',
  'Ruby': '#cc342d',
  'Go': '#00add8',
  'Rust': '#000000',
  'PHP': '#777bb4',
  'Swift': '#fa7343',
  'Kotlin': '#7f52ff',
  'HTML': '#e34c26',
  'CSS': '#1572b6',
  'SCSS': '#cc6699',
  'Shell': '#89e051',
  'SQL': '#e38c00',
  'Markdown': '#083fa1',
  'JSON': '#292929',
  'YAML': '#cb171e',
  'XML': '#0060ac',
  'Dockerfile': '#384d54',
};

// Default colors for languages not in the map
const DEFAULT_COLORS = [
  '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#ef4444', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

const getLanguageColor = (language: string, index: number): string => {
  return LANGUAGE_COLORS[language] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
};

export default function LanguagePieChart({ languages, height = 300 }: LanguagePieChartProps) {
  // Prepare data for pie chart
  const chartData = languages.map((lang, index) => ({
    name: lang.language,
    value: lang.percentage,
    lineCount: lang.lineCount,
    color: getLanguageColor(lang.language, index),
  }));

  // Create accessible description
  const chartDescription = `Language distribution chart showing ${languages.length} languages. ${
    languages.slice(0, 3).map(l => `${l.language}: ${l.percentage.toFixed(1)}%`).join(', ')
  }`;

  return (
    <div 
      role="img" 
      aria-label={chartDescription}
      tabIndex={0}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
              // Hide labels on very small screens or for small percentages
              if (percent < 0.05) return null;
              
              const RADIAN = Math.PI / 180;
              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              
              return (
                <text 
                  x={x} 
                  y={y} 
                  fill="white" 
                  textAnchor={x > cx ? 'start' : 'end'} 
                  dominantBaseline="central"
                  className="text-xs sm:text-sm font-medium"
                  aria-hidden="true"
                >
                  {`${name} ${(percent * 100).toFixed(0)}%`}
                </text>
              );
            }}
            outerRadius={typeof window !== 'undefined' && window.innerWidth < 640 ? 60 : 80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number, name: string, props: any) => [
              `${value.toFixed(1)}% (${props?.payload?.lineCount?.toLocaleString() || 0} lines)`,
              name
            ]}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconSize={10}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Screen reader only table for accessibility */}
      <table className="sr-only">
        <caption>Language distribution</caption>
        <thead>
          <tr>
            <th>Language</th>
            <th>Percentage</th>
            <th>Line Count</th>
          </tr>
        </thead>
        <tbody>
          {languages.map((lang) => (
            <tr key={lang.language}>
              <td>{lang.language}</td>
              <td>{lang.percentage.toFixed(1)}%</td>
              <td>{lang.lineCount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
