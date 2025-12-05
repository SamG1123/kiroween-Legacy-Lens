import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import type { Issue } from '../../types';

interface IssuesSeverityChartProps {
  issues: Issue[];
  height?: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
};

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

export default function IssuesSeverityChart({ issues, height = 300 }: IssuesSeverityChartProps) {
  // Count issues by severity
  const severityCounts = SEVERITY_ORDER.map(severity => {
    const count = issues.filter(issue => issue.severity === severity).length;
    return {
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: count,
      color: SEVERITY_COLORS[severity],
    };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={severityCounts}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          allowDecimals={false}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={(value: number) => [`${value} issue${value !== 1 ? 's' : ''}`, 'Count']}
          contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', fontSize: '12px' }}
        />
        <Legend 
          wrapperStyle={{ fontSize: '12px' }}
        />
        <Bar dataKey="value" name="Issues" radius={[8, 8, 0, 0]}>
          {severityCounts.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
