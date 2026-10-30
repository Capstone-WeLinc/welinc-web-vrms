import { Link } from 'react-router-dom';
import { PowerOff } from 'lucide-react';
import { EmptyState } from '../components/shared/EmptyState';
import { Button } from '../components/ui/button';
import { MODULE_LABELS, type ModuleName } from '../lib/permissions/keys';

/** Spec 0012, AC-12: a bookmarked URL of a switched off module lands here, not on the 403 page. */
export function ModuleOffPage({ module }: { module: ModuleName }) {
  return (
    <EmptyState
      icon={PowerOff}
      title={`${MODULE_LABELS[module]} is turned off`}
      description="This module is turned off by your Admin. Its data is kept for when it comes back."
      action={
        <Button asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
