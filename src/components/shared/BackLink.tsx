import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/** The "Back to …" link above a detail page's header. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-4 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {label}
    </Link>
  );
}
