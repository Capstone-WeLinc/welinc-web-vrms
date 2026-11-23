import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { QueuedPhoto } from '../hooks/usePhotoUploadQueue';

/** One upload's tile: waiting, a percentage, done, or the server's message with Retry and Remove (spec 0017, AC-23). */
export function UploadQueueRow({ item, onRetry, onDismiss }: { item: QueuedPhoto; onRetry: () => void; onDismiss: () => void }) {
  const status =
    item.status === 'uploading' ? `Uploading ${item.progress}%` : item.status === 'done' ? 'Done' : item.status === 'waiting' ? 'Waiting' : 'Failed';
  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-2 text-body">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span title={item.name} className="min-w-0 truncate text-foreground">
          {item.name}
        </span>
        <span className={cn('shrink-0 text-caption tabular-nums', item.status === 'failed' ? 'text-destructive' : 'text-muted-foreground')}>
          {/* Screen readers hear the status once; the progress bar carries the percentage */}
          <span aria-hidden="true">{status}</span>
          <span className="sr-only">{item.status === 'uploading' ? 'Uploading' : status}</span>
        </span>
      </div>
      {(item.status === 'uploading' || item.status === 'done') && (
        <div
          role="progressbar"
          aria-label={`Uploading ${item.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={item.progress}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full origin-left bg-primary transition-transform motion-reduce:transition-none" style={{ transform: `scaleX(${item.progress / 100})` }} />
        </div>
      )}
      {item.status === 'failed' && (
        <>
          <p className="text-caption break-words text-destructive">{item.error}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onRetry} aria-label={`Retry ${item.name}`}>
              <RotateCw aria-hidden="true" />
              Retry
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDismiss} aria-label={`Remove ${item.name} from uploads`}>
              Remove
            </Button>
          </div>
        </>
      )}
    </li>
  );
}
