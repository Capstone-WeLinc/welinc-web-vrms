import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PIPELINE_STATUSES, type PipelineStatus } from '../lib/attention';

// Chart tokens: the same hue families as the status badges, at mid tones that read as fills.
const STAGES: Record<PipelineStatus, { label: string; fill: string; dot: string }> = {
  PENDING: { label: 'Pending', fill: 'fill-chart-2', dot: 'bg-chart-2' },
  IN_PROGRESS: { label: 'In progress', fill: 'fill-chart-1', dot: 'bg-chart-1' },
  FOR_VERIFICATION: { label: 'For verification', fill: 'fill-chart-4', dot: 'bg-chart-4' },
  COMPLETED: { label: 'Completed', fill: 'fill-chart-3', dot: 'bg-chart-3' },
};

function share(count: number, total: number) {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

// Widths go through SVG attributes (viewBox units = ticket counts), so no inline style is needed.
export function RepairProgressChart({ counts }: { counts: Record<PipelineStatus, number> }) {
  const [hovered, setHovered] = useState<PipelineStatus | null>(null);
  const total = PIPELINE_STATUSES.reduce((sum, status) => sum + counts[status], 0);
  const breakdown = PIPELINE_STATUSES.map((s) => `${STAGES[s].label} ${counts[s]}`).join(', ');
  const label = `${total === 0 ? 'Nothing open and nothing completed this month. ' : ''}Pipeline: ${breakdown}`;

  const segments = PIPELINE_STATUSES.map((status, index) => ({
    status,
    x: PIPELINE_STATUSES.slice(0, index).reduce((sum, before) => sum + counts[before], 0),
    width: counts[status],
  })).filter((segment) => segment.width > 0);

  const dimmed = (status: PipelineStatus) => hovered !== null && hovered !== status;

  return (
    <Card className="gap-4 p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Pipeline</h2>
        <p className="text-sm text-muted-foreground">Open tickets and this month&apos;s completions</p>
      </div>

      <div role="img" aria-label={label} className="flex flex-col gap-2">
        <svg
          viewBox={`0 0 ${Math.max(total, 1)} 1`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="h-4 w-full overflow-hidden rounded-full bg-muted"
        >
          {segments.map((segment) => (
            <Tooltip key={segment.status}>
              <TooltipTrigger asChild>
                <rect
                  x={segment.x}
                  y={0}
                  width={segment.width}
                  height={1}
                  onMouseEnter={() => setHovered(segment.status)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    STAGES[segment.status].fill,
                    'cursor-default transition-opacity duration-150 motion-reduce:transition-none',
                    dimmed(segment.status) && 'opacity-30',
                  )}
                />
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                {STAGES[segment.status].label}: {segment.width} ({share(segment.width, total)}%)
              </TooltipContent>
            </Tooltip>
          ))}
        </svg>
        {total === 0 && <p className="text-sm text-muted-foreground">Nothing open and nothing completed this month</p>}
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {PIPELINE_STATUSES.map((status) => (
          <li
            key={status}
            onMouseEnter={() => setHovered(status)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              'flex items-center gap-2 text-sm transition-opacity duration-150 motion-reduce:transition-none',
              dimmed(status) && 'opacity-50',
            )}
          >
            <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', STAGES[status].dot)} />
            <span className="text-muted-foreground">{STAGES[status].label}</span>
            <span className="font-semibold text-foreground tabular-nums">{counts[status]}</span>
            <span className="text-muted-foreground tabular-nums">{share(counts[status], total)}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
