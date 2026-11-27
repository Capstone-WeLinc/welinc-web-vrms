import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCan } from '../../lib/permissions/usePermissions';

/**
 * Spec 0027, AC-8 (2026-11-28): New repair is the primary action in the dashboard's header at
 * every size; the Repair tickets page has its own. The sidebar holds no New repair button.
 */
export function NewRepairAction() {
  const canCreate = useCan('ticket.create');
  if (!canCreate) return null;
  return (
    <Button asChild className="max-md:h-11">
      <Link to="/repairs/new">
        <Plus aria-hidden="true" />
        New repair
      </Link>
    </Button>
  );
}
