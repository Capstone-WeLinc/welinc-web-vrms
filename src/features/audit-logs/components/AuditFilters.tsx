import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangeFilter } from '../../../components/shared/date-range/DateRangeFilter';
import type { AuditActor } from '../../../types';
import { TYPE_CHIPS, type AuditFilterValues } from '../lib/auditEvents';

interface AuditFiltersProps {
  value: AuditFilterValues;
  actors: AuditActor[];
  rangeError?: string;
  onChange: (value: AuditFilterValues) => void;
}

const LABEL = 'text-label text-muted-foreground';

export function AuditFilters({ value, actors, rangeError, onChange }: AuditFiltersProps) {
  const set = (patch: Partial<AuditFilterValues>) => onChange({ ...value, ...patch });

  return (
    <div role="search" aria-label="Filter the audit log" className="mb-4 flex flex-col gap-3">
      {/* One active at a time: toggle buttons with aria-pressed, not tabs (there are no panels). */}
      <div role="group" aria-label="Event type" className="flex flex-wrap gap-2">
        {TYPE_CHIPS.map((chip) => {
          const active = value.type === chip.value;
          return (
            <Button
              key={chip.value}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              aria-pressed={active}
              className="h-11 rounded-full px-4 md:h-9"
              onClick={() => set({ type: chip.value })}
            >
              {chip.label}
            </Button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-start">
        <div className="flex flex-col gap-1.5 lg:w-56">
          <Label htmlFor="audit-person" className={LABEL}>
            Person
          </Label>
          <Select value={value.actorId} onValueChange={(actorId) => set({ actorId })}>
            <SelectTrigger id="audit-person" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All people</SelectItem>
                {actors.map((actor) => (
                  <SelectItem key={actor.id} value={actor.id}>
                    {actor.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 lg:w-56">
          <Label htmlFor="audit-repair" className={LABEL}>
            Repair #
          </Label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="audit-repair"
              type="search"
              className="pl-9"
              placeholder="Part of a repair number"
              value={value.repairNumber}
              onChange={(e) => set({ repairNumber: e.target.value })}
            />
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-1">
          <DateRangeFilter value={value.range} error={rangeError} onChange={(range) => set({ range })} />
        </div>
      </div>
    </div>
  );
}
