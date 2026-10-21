import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoToPageInput } from '../GoToPageInput';
import { lastPage, type PaginationState } from './types';

type PaginationProps = PaginationState & {
  previousText?: string;
  nextText?: string;
  pageInfo?: (page: number, last: number) => string;
};

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  previousText = 'Previous',
  nextText = 'Next',
  pageInfo = (current, last) => `Page ${current} of ${last}`,
}: PaginationProps) {
  const last = lastPage(total, pageSize);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-sm text-muted-foreground tabular-nums">{pageInfo(page, last)}</p>
      <div className="flex flex-wrap items-center gap-2">
        <GoToPageInput currentPage={page} totalPages={last} onPageChange={onPageChange} />
        <Button
          variant="outline"
          size="touch"
          className="md:h-9 md:px-3 md:text-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          {previousText}
        </Button>
        <Button
          variant="outline"
          size="touch"
          className="md:h-9 md:px-3 md:text-sm"
          disabled={page >= last}
          onClick={() => onPageChange(page + 1)}
        >
          {nextText}
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
