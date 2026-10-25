import { useEffect, useState } from 'react';
import { getEntryOptions, type EntryOption } from '../../../lib/api/knowledgeApi';

type Loaded = { status: 'ready'; options: EntryOption[] } | { status: 'error' };

/** Active knowledge entries for the ticket's "Link a known fix" Combobox (spec 0007, AC-27). Loads when enabled. */
export function useEntryOptions(enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getEntryOptions()
      .then((options) => {
        if (!cancelled) setLoaded({ status: 'ready', options });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  return {
    options: loaded?.status === 'ready' ? loaded.options : null,
    failed: loaded?.status === 'error',
    retry: () => setAttempt((n) => n + 1),
  };
}
