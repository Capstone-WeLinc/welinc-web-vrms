import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { statusLabel } from '../../../components/shared/statusLabels';
import type { GarageOption, MechanicOption } from '../../../lib/api/vrmsConfigApi';
import {
  OPEN_STATUS_FILTERS,
  SEARCH_MAX_LENGTH,
  type OpenStatusFilter,
  type RepairListFilterValues,
} from '../lib/repairListFilters';

interface RepairListFiltersProps {
  value: RepairListFilterValues;
  searchText: string;
  garages: GarageOption[];
  /** Admins only; null hides the Mechanic filter. */
  mechanics: MechanicOption[] | null;
  onSearchTextChange: (text: string) => void;
  onChange: (patch: Partial<RepairListFilterValues>) => void;
}

const LABEL = 'text-label text-muted-foreground';

export function RepairListFilters({ value, searchText, garages, mechanics, onSearchTextChange, onChange }: RepairListFiltersProps) {
  return (
    <div role="search" aria-label="Filter repair tickets" className="mb-4 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
      <div className="flex flex-col gap-1.5 sm:col-span-2 lg:min-w-64 lg:flex-1">
        <Label htmlFor="repairs-search" className={LABEL}>
          Search
        </Label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="repairs-search"
            type="search"
            className="pl-9"
            placeholder="Repair #, plate or driver"
            maxLength={SEARCH_MAX_LENGTH}
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="repairs-status" className={LABEL}>
          Status
        </Label>
        <Select value={value.status} onValueChange={(status) => onChange({ status: status as OpenStatusFilter })}>
          <SelectTrigger id="repairs-status" className="w-full lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All open</SelectItem>
              {OPEN_STATUS_FILTERS.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="repairs-garage" className={LABEL}>
          Garage
        </Label>
        <Select value={value.garageId} onValueChange={(garageId) => onChange({ garageId })}>
          <SelectTrigger id="repairs-garage" className="w-full lg:w-44">
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

      {mechanics && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="repairs-mechanic" className={LABEL}>
            Mechanic
          </Label>
          <Select value={value.mechanicId} onValueChange={(mechanicId) => onChange({ mechanicId })}>
            <SelectTrigger id="repairs-mechanic" className="w-full lg:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All mechanics</SelectItem>
                {mechanics.map((mechanic) => (
                  <SelectItem key={mechanic.id} value={mechanic.id}>
                    {mechanic.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex h-10 items-center gap-2 sm:self-end">
        <Switch id="repairs-overdue" checked={value.overdue} onCheckedChange={(overdue) => onChange({ overdue })} />
        <Label htmlFor="repairs-overdue" className="text-body font-medium text-foreground">
          Overdue only
        </Label>
      </div>
    </div>
  );
}
