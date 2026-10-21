import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function FormCardSkeleton({ fields }: { fields: number }) {
  return (
    <Card className="px-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-36 self-end" />
    </Card>
  );
}

/** Shaped like the profile page, shown while the account loads. */
export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading your profile" className="flex flex-col gap-6">
      <Card className="flex-row items-center gap-4 p-4 sm:p-6">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <FormCardSkeleton fields={3} />
        <FormCardSkeleton fields={3} />
      </div>
    </div>
  );
}
