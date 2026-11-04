import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SEARCH_MAX_LENGTH } from '../../user-management/lib/userFilters';
import { WORK_FILTERS, WORK_LABELS } from '../../user-management/lib/workload';
import type { MechanicsFilters as Filters } from '../lib/mechanicsList';

const LABEL = 'text-xs font-medium tracking-wide text-muted-foreground uppercase';

interface MechanicsFiltersProps {
  value: Filters;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}

/** Spec 0022, AC-7: the name search and the Users page Work filter. */
export function MechanicsFilters({ value, searchText, onSearchTextChange, onChange, onClear }: MechanicsFiltersProps) {
  const filtered = value.work !== 'all' || searchText.trim() !== '';

  return (
    <div role="search" aria-label="Filter mechanics" className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-col gap-1.5 sm:min-w-64 sm:flex-1">
        <Label htmlFor="mechanics-search" className={LABEL}>
          Search
        </Label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="mechanics-search"
            type="search"
            className="pl-9"
            placeholder="Search by name"
            maxLength={SEARCH_MAX_LENGTH}
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mechanics-work" className={LABEL}>
          Work
        </Label>
        <Select value={value.work} onValueChange={(work) => onChange({ work: work as Filters['work'] })}>
          <SelectTrigger id="mechanics-work" className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Everyone</SelectItem>
              {WORK_FILTERS.map((work) => (
                <SelectItem key={work} value={work}>
                  {WORK_LABELS[work]} mechanics
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {filtered && (
        <Button variant="ghost" className="h-11 self-start sm:self-end md:h-10" onClick={onClear}>
          <X aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
