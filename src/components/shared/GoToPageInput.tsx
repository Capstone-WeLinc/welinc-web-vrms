import { useState } from 'react';

interface GoToPageInputProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Jumps to a typed page. While the field is not being edited it simply shows the current page.
export function GoToPageInput({ currentPage, totalPages, onPageChange }: GoToPageInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
      <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Go to:</span>
      <input
        type="text"
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
        className="input"
        style={{ width: '45px', padding: '4px', textAlign: 'center', height: '30px', fontSize: '13px', borderRadius: '6px' }}
      />
    </div>
  );
}
