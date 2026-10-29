import { useEffect, useId, useState } from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { lookupAccounts, type LookupAccount } from '../../../lib/api/authApi';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { systemsText } from '../lib/openWorkCopy';

const MIN_QUERY = 2;

type Answer = { query: string; rows: LookupAccount[]; error: string | null };

interface ExistingAccountPickerProps {
  selected: LookupAccount | null;
  onSelect: (account: LookupAccount | null) => void;
}

/** Searches WeLinc accounts with no VRMS role, by name or email (spec 0011, AC-29 and AC-36). */
export function ExistingAccountPicker({ selected, onSelect }: ExistingAccountPickerProps) {
  const inputId = useId();
  const [text, setText] = useState('');
  const query = useDebouncedValue(text.trim(), 300);
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    if (query.length < MIN_QUERY) return;
    const controller = new AbortController();
    lookupAccounts(query, controller.signal)
      .then((rows) => setAnswer({ query, rows, error: null }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message =
          getApiErrorStatus(err) === 429
            ? 'Too many searches. Wait a moment and try again.'
            : getApiErrorMessage(err, 'Couldn’t search. Check your connection and try again.');
        setAnswer({ query, rows: [], error: message });
      });
    return () => controller.abort();
  }, [query]);

  // Only an answer for what is typed now counts; older ones are ignored, never cleared in an effect.
  const current = answer && answer.query === query && query.length >= MIN_QUERY ? answer : null;
  const searching = text.trim().length >= MIN_QUERY && !current;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>Find a WeLinc account</Label>
      <Input
        id={inputId}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Name or email"
        autoComplete="off"
        spellCheck={false}
        aria-describedby={`${inputId}-status`}
      />
      <p id={`${inputId}-status`} className="text-sm text-muted-foreground" aria-live="polite">
        {text.trim().length < MIN_QUERY && 'Type at least 2 characters.'}
        {searching && 'Searching…'}
        {current?.error}
        {current && !current.error && current.rows.length === 0 && 'No account without VRMS access matches.'}
      </p>
      {current && current.rows.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="Matching accounts">
          {current.rows.map((account) => {
            const isSelected = selected?.id === account.id;
            return (
              <li key={account.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(isSelected ? null : account)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    isSelected ? 'border-primary bg-primary/10' : 'border-input bg-card hover:bg-muted',
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{account.name}</span>
                    <span className="break-all text-muted-foreground">{account.email}</span>
                    {account.systems.length > 0 && (
                      <span className="text-xs text-muted-foreground">In {systemsText(account.systems)}</span>
                    )}
                  </span>
                  {isSelected && <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
