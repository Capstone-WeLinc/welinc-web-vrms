import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { EmptyState } from '../components/shared/EmptyState';
import { Button } from '../components/ui/button';

/** Spec 0012, AC-21: a Settings section opened without its key. */
export function ForbiddenPage() {
  return (
    <EmptyState
      icon={ShieldOff}
      title="You don't have access to this page"
      description="Ask an Admin if you need it."
      action={
        <Button asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
