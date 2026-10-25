import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '../../../components/layout/PageHeader';

interface KnowledgeHeaderProps {
  isEditor: boolean;
  /** Open mechanic suggestions, for the Suggestions tab badge (AC-36). */
  suggestionCount?: number;
  action?: ReactNode;
}

const TABS = [
  { to: '/knowledge-base', label: 'Library', end: true },
  { to: '/knowledge-base/suggestions', label: 'Suggestions', end: false },
  { to: '/knowledge-base/categories', label: 'Categories', end: false },
];

/** The knowledge base header, plus route tabs for editors (spec 0007, AC-6). */
export function KnowledgeHeader({ isEditor, suggestionCount = 0, action }: KnowledgeHeaderProps) {
  return (
    <>
      <PageHeader title="Knowledge base" subtitle="Known fixes from your own repairs." icon={BookOpen} action={action} />
      {isEditor && (
        <nav aria-label="Knowledge base sections" className="-mt-2 mb-6 overflow-x-auto border-b border-border">
          <ul className="flex w-max gap-1">
            {TABS.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    cn(
                      'relative inline-flex h-11 items-center gap-2 rounded-t-lg px-3 text-sm font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary'
                        : 'text-muted-foreground',
                    )
                  }
                >
                  {tab.label}
                  {tab.label === 'Suggestions' && suggestionCount > 0 && (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-highlight px-1.5 text-xs font-semibold text-highlight-foreground tabular-nums">
                      <span className="sr-only">, </span>
                      {suggestionCount}
                      <span className="sr-only"> open</span>
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
