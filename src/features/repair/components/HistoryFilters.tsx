import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangeFilter } from '../../../components/shared/date-range/DateRangeFilter';
import type { DateRangeValue } from '../../../components/shared/date-range/dateRange';
import type { GarageOption } from '../../../lib/api/vrmsConfigApi';
import type { HistoryFilterValues, Outcome } from '../lib/historyFilters';

interface HistoryFiltersProps {
  value: HistoryFilterValues;
  garages: GarageOption[];
  rangeError?: string;
  onChange: (value: HistoryFilterValues) => void;
}

const LABEL = 'text-xs font-medium tracking-wide text-muted-foreground uppercase';

export function HistoryFilters({ value, garages, rangeError, onChange }: HistoryFiltersProps) {
  const set = (patch: Partial<HistoryFilterValues>) => onChange({ ...value, ...patch });

  return (
    <div role="search" aria-label="Filter repair history" className="mb-4 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-start">
      <div className="flex flex-col gap-1.5 sm:col-span-2 lg:min-w-64 lg:flex-1">
        <Label htmlFor="history-search" className={LABEL}>
          Search
        </Label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="history-search"
            type="search"
            className="pl-9"
            placeholder="Repair #, plate or driver"
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="history-outcome" className={LABEL}>
          Outcome
        </Label>
        <Select value={value.outcome} onValueChange={(outcome) => set({ outcome: outcome as Outcome })}>
          <SelectTrigger id="history-outcome" className="w-full lg:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="history-garage" className={LABEL}>
          Garage
        </Label>
        <Select value={value.garageId} onValueChange={(garageId) => set({ garageId })}>
          <SelectTrigger id="history-garage" className="w-full lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All garages</SelectItem>
              {garages.map((garage) => (
                <SelectItem key={garage.id} value={garage.id}>
                  {garage.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="sm:col-span-2 lg:col-span-1">
        <DateRangeFilter value={value.range} error={rangeError} onChange={(range: DateRangeValue) => set({ range })} />
      </div>
    </div>
  );
}
