import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/PageHeader';

function Crash(): never {
  throw new Error('Sentry test crash from welinc-web-vrms (spec 0025)');
}

/**
 * VRMS spec 0025, AC-16: `/debug/sentry`, only in builds made with VITE_SENTRY_TEST_ROUTES=true
 * (staging), only for `settings.manage`, and with no menu link. The button crashes the render so
 * the crash screen and the Sentry issue can be checked together.
 */
export function SentryTestPage() {
  const [crash, setCrash] = useState(false);
  return (
    <div>
      <PageHeader title="Error monitoring test" context="Crashes this page on purpose to check the crash screen and the Sentry report." />
      <Button variant="destructive" onClick={() => setCrash(true)}>
        Crash this page
      </Button>
      {crash && <Crash />}
    </div>
  );
}
