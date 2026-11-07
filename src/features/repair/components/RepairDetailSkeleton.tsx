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

/** Spec 0024, AC-20: the Issues card as its photos line, summary line and 3 folded rows. */
function IssuesSkeleton() {
  return (
    <Card className="gap-0 p-4 md:p-5">
      <Skeleton className="mb-4 h-5 w-20" />
      <Skeleton className="mb-3 h-4 w-44" />
      <Skeleton className="mb-1 h-3 w-48" />
      <div className="flex flex-col divide-y divide-border">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-start gap-3 py-3">
            <Skeleton className="h-4 w-4" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className={row === 1 ? 'h-4 w-1/2' : 'h-4 w-3/4'} />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <div className="flex w-20 flex-col items-end gap-1.5 md:w-24">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-1 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Shaped like the detail page: the title, then the phone order below 1024px and two columns above. */
export function RepairDetailSkeleton() {
  return (
    <div>
      <p role="status" className="sr-only">
        Loading the ticket…
      </p>
      <div aria-hidden="true">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="mb-4 flex flex-col gap-2 border-b border-border pb-4 md:mb-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-7 w-3/4 max-w-md" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          <div className="hidden flex-col gap-4 lg:col-start-3 lg:row-start-1 lg:flex">
            <Card className="gap-4 p-4 md:p-5">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-10 w-full" />
            </Card>
            <SkeletonCard lines={4} />
          </div>
          <div className="flex flex-col gap-4 lg:col-span-2 lg:col-start-1 lg:row-start-1">
            <Skeleton className="h-6 w-28 rounded-full lg:hidden" />
            <IssuesSkeleton />
            <SkeletonCard lines={1} />
          </div>
        </div>
      </div>
    </div>
  );
}
