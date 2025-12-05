import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export function ProjectCardSkeleton() {
  return (
    <Card className="p-4 sm:p-6">
      {/* Header with name and status */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32 sm:w-40" />
        </div>
        <Skeleton className="h-5 w-20" />
      </div>

      {/* Project metadata */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
      </div>
    </Card>
  );
}
