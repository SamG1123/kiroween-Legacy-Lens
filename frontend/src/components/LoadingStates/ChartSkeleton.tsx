import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

interface ChartSkeletonProps {
  title?: boolean;
  description?: boolean;
  height?: string;
}

export function ChartSkeleton({ 
  title = true, 
  description = false,
  height = 'h-64'
}: ChartSkeletonProps) {
  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <Skeleton className="h-5 w-32 mb-2" />}
          {description && <Skeleton className="h-4 w-48" />}
        </CardHeader>
      )}
      <CardContent>
        <Skeleton className={`w-full ${height}`} />
      </CardContent>
    </Card>
  );
}

export function PieChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-center gap-6">
        <div className="flex-shrink-0">
          <Skeleton className="h-48 w-48 rounded-full" />
        </div>
        <div className="flex-1 space-y-3 w-full">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function BarChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-6 w-full" style={{ width: `${Math.random() * 50 + 50}%` }} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
