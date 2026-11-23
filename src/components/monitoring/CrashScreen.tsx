import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

interface CrashScreenProps {
  /** The first 8 characters of the Sentry event id; none when monitoring is off. */
  code?: string;
  /** `page` sits inside the shell; `full` fills the window (the shell itself crashed). */
  variant: 'page' | 'full';
}

/** VRMS spec 0025, AC-7: what a user sees instead of a blank page when a screen crashes. */
export function CrashScreen({ code, variant }: CrashScreenProps) {
  const backHome =
    variant === 'page' ? (
      <Button variant="outline" asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    ) : (
      // Outside the router's outlet a full load is the safe way home
      <Button variant="outline" asChild>
        <a href="/dashboard">Back to dashboard</a>
      </Button>
    );

  return (
    <div className={cn(variant === 'full' && 'flex min-h-dvh items-center justify-center bg-background px-4')}>
      <Empty role="alert">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
            <AlertCircle aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle className="text-group font-semibold text-foreground">Something went wrong on this page</EmptyTitle>
          <EmptyDescription>Try reloading. If it keeps happening, send this code to your admin.</EmptyDescription>
          {code && (
            <p className="text-body text-muted-foreground">
              Reference <span className="font-mono font-semibold text-foreground select-all">{code}</span>
            </p>
          )}
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => window.location.reload()}>Reload</Button>
            {backHome}
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}
