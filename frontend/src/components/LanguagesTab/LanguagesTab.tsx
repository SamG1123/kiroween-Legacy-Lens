import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChartSkeleton } from '../LoadingStates';
import { LanguageStats } from '../../types';

interface LanguagesTabProps {
  languages: LanguageStats[];
  isLoading: boolean;
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

export default function LanguagesTab({ languages, isLoading }: LanguagesTabProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <PieChartSkeleton />
        <PieChartSkeleton />
      </div>
    );
  }

  if (!languages || languages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Language Distribution</CardTitle>
          <CardDescription>Breakdown of languages used in this project</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No language data available</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for pie chart
  const chartData = languages.map((lang, index) => ({
    name: lang.language,
    value: lang.percentage,
    lineCount: lang.lineCount,
    color: getLanguageColor(lang.language, index),
  }));

  return (
    <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Language Distribution</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Visual breakdown by percentage</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
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
        </CardContent>
      </Card>

      {/* Language List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Languages</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Detailed breakdown with line counts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {languages.map((lang, index) => {
              const color = getLanguageColor(lang.language, index);
              return (
                <div key={lang.language} className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium truncate">{lang.language}</span>
                    </div>
                    <span className="text-gray-500 ml-2 whitespace-nowrap">{lang.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div 
                      className="h-1.5 sm:h-2 rounded-full transition-all"
                      style={{ 
                        width: `${lang.percentage}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {lang.lineCount.toLocaleString()} lines of code
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
