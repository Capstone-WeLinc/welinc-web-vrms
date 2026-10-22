import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function TileSkeleton() {
  return (
    <Card className="flex-row items-start justify-between gap-4 p-5">
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-7 w-12" />
      </div>
      <Skeleton className="size-10 rounded-lg" />
    </Card>
  );
}

// Shaped like the loaded page: tiles, the list, and for admins the pipeline and spend cards.
export function DashboardSkeleton({ admin }: { admin: boolean }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Loading dashboard</span>
      <Skeleton className="h-4 w-40" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <TileSkeleton key={index} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48" />
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
      {admin && (
        <>
          <Card className="gap-4 p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-4 w-24" />
              ))}
            </div>
          </Card>
          <Card className="gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-72 max-w-full" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TileSkeleton />
              <TileSkeleton />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
