import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function SkeletonCard({ lines }: { lines: number }) {
  return (
    <Card className="gap-4 p-4 md:p-5">
      <Skeleton className="h-5 w-28" />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={index % 2 ? 'h-4 w-1/2' : 'h-4 w-3/4'} />
      ))}
    </Card>
  );
}

/** Shaped like the two column detail layout: side panel first below 1024px. */
export function RepairDetailSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="mb-4 h-5 w-32" />
      <div className="mb-6 flex items-center gap-4 border-b border-border pb-6">
        <Skeleton className="size-12 rounded-lg" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col gap-4 lg:col-start-3 lg:row-start-1">
          <Card className="gap-4 p-4 md:p-5">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-11 w-full lg:h-10" />
          </Card>
          <SkeletonCard lines={4} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    </div>
  );
}
