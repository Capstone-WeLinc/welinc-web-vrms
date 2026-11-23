import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GoToPageInputProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label?: string;
}

// Jumps to a typed page. While the field is not being edited it simply shows the current page.
export function GoToPageInput({ currentPage, totalPages, onPageChange, label = 'Go to page' }: GoToPageInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="text-body font-medium whitespace-nowrap text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        value={draft ?? currentPage.toString()}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '') {
            setDraft('');
            return;
          }
          const num = parseInt(val, 10);
          if (!isNaN(num) && num >= 1 && num <= totalPages) {
            setDraft(val);
            onPageChange(num);
          }
        }}
        onBlur={() => setDraft(null)}
        className="w-16 text-center md:h-9 md:w-14"
      />
    </div>
  );
}
