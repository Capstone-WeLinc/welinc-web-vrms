import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, icon: Icon, action }: PageHeaderProps) {
  return (
    <header className="page-header-container">
      <div className="page-header-left">
        <div className="page-header-icon-box">
          <Icon size={24} strokeWidth={1.8} />
        </div>
        <div className="page-header-text">
          <h1 className="page-header-title">{title}</h1>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}
