import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control';
import type { EntrySort, EntryStatusFilter, IssueCategory } from '../../../lib/api/knowledgeApi';
import { SEARCH_MAX_LENGTH, SORTS, STATUS_FILTERS, type LibraryFilterValues } from '../lib/libraryFilters';

interface LibrarySearchBandProps {
  value: LibraryFilterValues;
  searchText: string;
  categories: IssueCategory[];
  /** Entries per category under the current status filter. */
  categoryCounts: Record<string, number> | null;
  isEditor: boolean;
  onSearchTextChange: (text: string) => void;
  onClearSearch: () => void;
  onChange: (patch: Partial<LibraryFilterValues>) => void;
}

const LABEL = 'text-label text-muted-foreground';
export const LIBRARY_SEARCH_ID = 'knowledge-search';

/** Search, category chips and, for editors, status and sort (spec 0007, AC-7). */
export function LibrarySearchBand({
  value,
  searchText,
  categories,
  categoryCounts,
  isEditor,
  onSearchTextChange,
  onClearSearch,
  onChange,
}: LibrarySearchBandProps) {
  const count = (id: string) => categoryCounts?.[id] ?? 0;
  const allCount = categoryCounts ? Object.values(categoryCounts).reduce((sum, n) => sum + n, 0) : null;

  return (
    <section role="search" aria-label="Search the knowledge base" className="mb-4 flex flex-col gap-4 rounded-2xl border border-transparent bg-card p-4 shadow-card md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor={LIBRARY_SEARCH_ID} className={LABEL}>
            Search
          </Label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={LIBRARY_SEARCH_ID}
              type="search"
              className="h-11 pr-11 pl-10 text-base-input"
              placeholder="Describe the problem, like 'squeal when braking'"
              maxLength={SEARCH_MAX_LENGTH}
              value={searchText}
              onChange={(e) => onSearchTextChange(e.target.value)}
            />
            {searchText && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Clear search"
                className="absolute top-1/2 right-1 size-9 -translate-y-1/2"
                onClick={onClearSearch}
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        {isEditor && (
          <div className="grid grid-cols-2 gap-3 lg:flex">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="knowledge-status" className={LABEL}>
                Status
              </Label>
              <Select value={value.status} onValueChange={(status) => onChange({ status: status as EntryStatusFilter })}>
                <SelectTrigger id="knowledge-status" className="h-11 w-full lg:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATUS_FILTERS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="knowledge-sort" className={LABEL}>
                Sort by
              </Label>
              <Select value={value.sort} onValueChange={(sort) => onChange({ sort: sort as EntrySort })}>
                <SelectTrigger id="knowledge-sort" className="h-11 w-full lg:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SORTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* The chips scroll sideways inside their own row on a phone; the page never does. */}
      <div className="-mx-4 overflow-x-auto px-4 md:-mx-5 md:px-5">
        <SegmentedControl aria-label="Category" value={value.categoryId} onValueChange={(categoryId) => onChange({ categoryId })}>
          <CategoryChip value="all" label="All" count={allCount} />
          {categories.map((category) => (
            <CategoryChip key={category.id} value={category.id} label={category.name} count={categoryCounts ? count(category.id) : null} />
          ))}
        </SegmentedControl>
      </div>
    </section>
  );
}

function CategoryChip({ value, label, count }: { value: string; label: string; count: number | null }) {
  return (
    <SegmentedControlItem value={value}>
      {label}
      {count != null && <span className="font-mono text-caption">{count}</span>}
    </SegmentedControlItem>
  );
}
