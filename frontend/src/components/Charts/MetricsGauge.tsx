import { Badge } from '../ui/badge';

interface MetricsGaugeProps {
  value: number;
  maxValue?: number;
  description?: string;
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

export default function MetricsGauge({ 
  value, 
  maxValue = 100, 
  description 
}: MetricsGaugeProps) {
  const percentage = (value / maxValue) * 100;
  const color = getMaintainabilityColor(value);
  const qualityLabel = getMaintainabilityLabel(value);
  const badgeClass = getMaintainabilityBadgeClass(value);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-5xl font-bold" style={{ color }}>
            {value}
          </div>
          <p className="text-sm text-gray-500">out of {maxValue}</p>
        </div>
        <Badge className={badgeClass}>
          {qualityLabel}
        </Badge>
      </div>
      
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="h-4 rounded-full transition-all"
            style={{ 
              width: `${percentage}%`,
              backgroundColor: color
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>0 (Poor)</span>
          <span>{maxValue / 2} (Fair)</span>
          <span>{maxValue} (Excellent)</span>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      )}

      {/* Quality indicator description */}
      {!description && (
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600">
            {value >= 80 && (
              "Excellent! This codebase is highly maintainable with good structure and documentation."
            )}
            {value >= 60 && value < 80 && (
              "Fair. The codebase is moderately maintainable but could benefit from refactoring and better documentation."
            )}
            {value < 60 && (
              "Needs improvement. Consider refactoring complex code, adding documentation, and reducing technical debt."
            )}
          </p>
        </div>
      )}
    </div>
  );
}
