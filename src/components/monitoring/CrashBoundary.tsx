import { Component, type ErrorInfo, type ReactNode } from 'react';
import type { CaughtCrash } from '../../lib/monitoring/crashDetails';
import { reportRenderCrash } from '../../lib/monitoring/sentry';
import { CrashScreen } from './CrashScreen';

interface CrashBoundaryProps {
  children: ReactNode;
  variant: 'page' | 'full';
}

interface CrashBoundaryState {
  crash?: CaughtCrash;
  code?: string;
}

/**
 * VRMS spec 0025, AC-3, AC-7 and AC-7a: catches a render crash, reports it once (Sentry's own
 * ErrorBoundary is not used, it would report a second time) and shows the crash screen. The page
 * boundary is keyed on the location, so moving to another page clears it.
 */
export class CrashBoundary extends Component<CrashBoundaryProps, CrashBoundaryState> {
  state: CrashBoundaryState = {};

  /** Runs before the first draw, so the error, the page and the time are there from the start. */
  static getDerivedStateFromError(error: unknown): Partial<CrashBoundaryState> {
    const path = typeof window === 'undefined' ? '' : window.location.pathname;
    return { crash: { error, path, at: new Date() } };
  }

  /** Runs after the draw and only adds the reference code. */
  componentDidCatch(error: unknown, info: ErrorInfo) {
    const eventId = reportRenderCrash(error, info.componentStack);
    if (eventId) this.setState({ code: eventId.slice(0, 8) });
  }

  render() {
    if (this.state.crash) {
      return <CrashScreen variant={this.props.variant} crash={this.state.crash} code={this.state.code} />;
    }
    return this.props.children;
  }
}
