import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { statusLabel } from '../../../components/shared/statusLabels';
import { ACCOUNT_STATUSES } from '../lib/accountStatus';
import { WORK_FILTERS, WORK_LABELS } from '../lib/workload';
import type { VrmsRoles } from '../hooks/useVrmsRoles';
import { hasActiveFilters, SEARCH_MAX_LENGTH, USERS_SEARCH_ID, type UserFilterValues } from '../lib/userFilters';

interface UserListFiltersProps {
  value: UserFilterValues;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onChange: (patch: Partial<UserFilterValues>) => void;
  onClear: () => void;
  /** The VRMS roles from welinc-auth's catalog, in display order (spec 0004, AC-20). */
  roles: VrmsRoles;
}

const LABEL = 'text-label text-muted-foreground';

export function UserListFilters({ value, searchText, onSearchTextChange, onChange, onClear, roles }: UserListFiltersProps) {
  const filtered = hasActiveFilters(value) || searchText.trim() !== '';
  // A role from the URL that the catalog doesn't list still shows, by its code, so it can be cleared
  const unknownRole = value.role !== 'all' && roles.status === 'ready' && !roles.roles.some((role) => role.code === value.role);

  return (
    <div role="search" aria-label="Filter users" className="mb-4 grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:items-end">
      <div className="col-span-2 flex flex-col gap-1.5 lg:min-w-64 lg:flex-1">
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
        <Select value={value.role} onValueChange={(role) => onChange({ role })} disabled={roles.status !== 'ready'}>
          <SelectTrigger id="users-role" className="w-full lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All roles</SelectItem>
              {roles.roles.map((role) => (
                <SelectItem key={role.code} value={role.code}>
                  {role.name}
                </SelectItem>
              ))}
              {unknownRole && <SelectItem value={value.role}>{value.role}</SelectItem>}
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
        <Button variant="ghost" className="h-11 self-end md:h-10" onClick={onClear}>
          <X aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
