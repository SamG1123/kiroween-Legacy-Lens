import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartSkeleton, BarChartSkeleton } from '../LoadingStates';
import { CodeMetrics } from '../../types';
import { HelpTooltip } from '../Help';

interface MetricsTabProps {
  metrics: CodeMetrics | undefined;
  isLoading: boolean;
}

const getMaintainabilityColor = (score: number): string => {
  if (score >= 80) return '#10b981'; // green
  if (score >= 60) return '#f59e0b'; // yellow
  return '#ef4444'; // red
};

const getMaintainabilityLabel = (score: number): string => {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Poor';
};

const getMaintainabilityBadgeClass = (score: number): string => {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

const getComplexityColor = (complexity: number): string => {
  if (complexity <= 10) return '#10b981'; // green - low complexity
  if (complexity <= 20) return '#f59e0b'; // yellow - moderate complexity
  return '#ef4444'; // red - high complexity
};

const getComplexityLabel = (complexity: number): string => {
  if (complexity <= 10) return 'Low';
  if (complexity <= 20) return 'Moderate';
  return 'High';
};

const getComplexityIcon = (complexity: number) => {
  if (complexity <= 10) return <TrendingDown className="h-4 w-4 text-green-600" />;
  if (complexity <= 20) return <Minus className="h-4 w-4 text-yellow-600" />;
  return <TrendingUp className="h-4 w-4 text-red-600" />;
};

export default function MetricsTab({ metrics, isLoading }: MetricsTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <ChartSkeleton title description height="h-48" />
        <BarChartSkeleton />
        <ChartSkeleton title description height="h-40" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Code Metrics</CardTitle>
          <CardDescription>Detailed code quality and complexity metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No metrics available</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for LOC breakdown bar chart
  const locData = [
    { name: 'Code', value: metrics.codeLines, color: '#3b82f6' },
    { name: 'Comments', value: metrics.commentLines, color: '#10b981' },
    { name: 'Blank', value: metrics.blankLines, color: '#6b7280' },
  ];

  // Calculate percentages for LOC breakdown
  const codePercentage = ((metrics.codeLines / metrics.totalLines) * 100).toFixed(1);
  const commentPercentage = ((metrics.commentLines / metrics.totalLines) * 100).toFixed(1);
  const blankPercentage = ((metrics.blankLines / metrics.totalLines) * 100).toFixed(1);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Maintainability Index Gauge */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base sm:text-lg">Maintainability Index</CardTitle>
            <HelpTooltip 
              content="A composite metric (0-100) that measures how easy your code is to maintain. It considers factors like complexity, documentation, and code structure. Scores above 80 are excellent, 60-80 are fair, and below 60 need improvement."
              side="right"
            />
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Overall code quality score (0-100). Higher scores indicate better maintainability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-4xl sm:text-5xl font-bold" style={{ color: getMaintainabilityColor(metrics.maintainabilityIndex) }}>
                  {metrics.maintainabilityIndex}
                </div>
                <p className="text-xs sm:text-sm text-gray-500">out of 100</p>
              </div>
              <Badge className={getMaintainabilityBadgeClass(metrics.maintainabilityIndex)}>
                {getMaintainabilityLabel(metrics.maintainabilityIndex)}
              </Badge>
            </div>
            
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="h-4 rounded-full transition-all"
                  style={{ 
                    width: `${metrics.maintainabilityIndex}%`,
                    backgroundColor: getMaintainabilityColor(metrics.maintainabilityIndex)
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0 (Poor)</span>
                <span>50 (Fair)</span>
                <span>100 (Excellent)</span>
              </div>
            </div>

            {/* Quality indicator description */}
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                {metrics.maintainabilityIndex >= 80 && (
                  "Excellent! This codebase is highly maintainable with good structure and documentation."
                )}
                {metrics.maintainabilityIndex >= 60 && metrics.maintainabilityIndex < 80 && (
                  "Fair. The codebase is moderately maintainable but could benefit from refactoring and better documentation."
                )}
                {metrics.maintainabilityIndex < 60 && (
                  "Needs improvement. Consider refactoring complex code, adding documentation, and reducing technical debt."
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lines of Code Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Lines of Code (LOC) Breakdown</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Distribution of code, comments, and blank lines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 sm:space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-gray-500">Total Lines</p>
                <p className="text-xl sm:text-2xl font-bold">{metrics.totalLines.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-gray-500">Code Lines</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{metrics.codeLines.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{codePercentage}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-gray-500">Comment Lines</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{metrics.commentLines.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{commentPercentage}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-gray-500">Blank Lines</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-600">{metrics.blankLines.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{blankPercentage}%</p>
              </div>
            </div>

            {/* Bar chart */}
            <div className="pt-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={locData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => value.toLocaleString()}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {locData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complexity Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base sm:text-lg">Complexity Score</CardTitle>
            <HelpTooltip 
              content="Cyclomatic complexity measures the number of independent paths through your code. Lower scores (≤10) indicate simple, easy-to-test code. Moderate scores (11-20) suggest some complexity. High scores (>20) indicate code that may be difficult to understand and maintain."
              side="right"
            />
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Cyclomatic complexity indicator. Lower scores indicate simpler, more maintainable code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="text-4xl sm:text-5xl font-bold" style={{ color: getComplexityColor(metrics.complexity) }}>
                  {metrics.complexity}
                </div>
                {getComplexityIcon(metrics.complexity)}
              </div>
              <Badge className={
                metrics.complexity <= 10 ? 'bg-green-100 text-green-800' :
                metrics.complexity <= 20 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }>
                {getComplexityLabel(metrics.complexity)}
              </Badge>
            </div>

            {/* Complexity bar chart */}
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="h-4 rounded-full transition-all"
                  style={{ 
                    width: `${Math.min((metrics.complexity / 30) * 100, 100)}%`,
                    backgroundColor: getComplexityColor(metrics.complexity)
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0 (Simple)</span>
                <span>15 (Moderate)</span>
                <span>30+ (Complex)</span>
              </div>
            </div>

            {/* Complexity description */}
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                {metrics.complexity <= 10 && (
                  "Excellent! The code has low complexity and should be easy to understand and maintain."
                )}
                {metrics.complexity > 10 && metrics.complexity <= 20 && (
                  "Moderate complexity. Some functions may benefit from simplification or breaking into smaller units."
                )}
                {metrics.complexity > 20 && (
                  "High complexity detected. Consider refactoring complex functions into smaller, more manageable pieces."
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
