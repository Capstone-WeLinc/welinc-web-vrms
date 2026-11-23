import { cn } from '@/lib/utils';
import { formatTime } from '../lib/attention';

export function LastUpdated({ fetchedAt, refreshFailed }: { fetchedAt: number; refreshFailed: boolean }) {
  const time = formatTime(fetchedAt);
  return (
    <p role="status" className={cn('text-caption', refreshFailed ? 'text-destructive' : 'text-muted-foreground')}>
      {refreshFailed ? `Couldn't refresh, showing data from ${time}` : `Last updated ${time}`}
    </p>
  );
}
