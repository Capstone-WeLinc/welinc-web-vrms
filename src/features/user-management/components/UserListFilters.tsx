import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { statusLabel } from '../../../components/shared/statusLabels';
import { ACCOUNT_STATUSES } from '../lib/accountStatus';
import { WORK_FILTERS, WORK_LABELS } from '../lib/workload';
import { hasActiveFilters, SEARCH_MAX_LENGTH, USERS_SEARCH_ID, type UserFilterValues } from '../lib/userFilters';

interface UserListFiltersProps {
  value: UserFilterValues;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onChange: (patch: Partial<UserFilterValues>) => void;
  onClear: () => void;
}

const LABEL = 'text-xs font-medium tracking-wide text-muted-foreground uppercase';
const ROLE_LABELS = { ADMIN: 'Admin', CHIEF_MECHANIC: 'Chief mechanic', MECHANIC: 'Mechanic' } as const;

export function UserListFilters({ value, searchText, onSearchTextChange, onChange, onClear }: UserListFiltersProps) {
  const filtered = hasActiveFilters(value) || searchText.trim() !== '';

  return (
    <div role="search" aria-label="Filter users" className="mb-4 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
      <div className="flex flex-col gap-1.5 sm:col-span-2 lg:min-w-64 lg:flex-1">
        <Label htmlFor={USERS_SEARCH_ID} className={LABEL}>
          Search
        </Label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={USERS_SEARCH_ID}
            type="search"
            className="pl-9"
            placeholder="Search by name or email"
            maxLength={SEARCH_MAX_LENGTH}
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="users-role" className={LABEL}>
          Role
        </Label>
        <Select value={value.role} onValueChange={(role) => onChange({ role: role as UserFilterValues['role'] })}>
          <SelectTrigger id="users-role" className="w-full lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All roles</SelectItem>
              {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="users-status" className={LABEL}>
          Status
        </Label>
        <Select value={value.status} onValueChange={(status) => onChange({ status: status as UserFilterValues['status'] })}>
          <SelectTrigger id="users-status" className="w-full lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All statuses</SelectItem>
              {ACCOUNT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="users-work" className={LABEL}>
          Work
        </Label>
        <Select value={value.work} onValueChange={(work) => onChange({ work: work as UserFilterValues['work'] })}>
          <SelectTrigger id="users-work" className="w-full lg:w-44">
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
        <Button variant="ghost" className="h-11 sm:self-end md:h-10" onClick={onClear}>
          <X aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
