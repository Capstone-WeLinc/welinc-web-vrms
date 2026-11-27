import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** One context line under the title. */
  context?: ReactNode;
  /** The page's one primary action: on the right, full width at the bottom on phones. */
  action?: ReactNode;
}

/**
 * Suite spec 0016 (design.md, Layout and navigation: Page header): the title in text-title, one
 * context line, the primary action on the right. The breadcrumb lives in the top bar (spec 0027, AC-9).
 */
export function PageHeader({ title, context, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-title text-foreground">{title}</h1>
        {context && <p className="text-small text-muted-foreground">{context}</p>}
      </div>
      {action && <div className="shrink-0 *:w-full sm:*:w-auto">{action}</div>}
    </header>
  );
}
