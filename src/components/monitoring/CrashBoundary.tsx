import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportRenderCrash } from '../../lib/monitoring/sentry';
import { CrashScreen } from './CrashScreen';

interface CrashBoundaryProps {
  children: ReactNode;
  variant: 'page' | 'full';
}

interface CrashBoundaryState {
  crashed: boolean;
  code?: string;
}

/**
 * VRMS spec 0025, AC-3 and AC-7: catches a render crash, reports it once (Sentry's own
 * ErrorBoundary is not used, it would report a second time) and shows the crash screen. The page
 * boundary is keyed on the location, so moving to another page clears it.
 */
export class CrashBoundary extends Component<CrashBoundaryProps, CrashBoundaryState> {
  state: CrashBoundaryState = { crashed: false };

  static getDerivedStateFromError(): Partial<CrashBoundaryState> {
    return { crashed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const eventId = reportRenderCrash(error, info.componentStack);
    if (eventId) this.setState({ code: eventId.slice(0, 8) });
  }

  render() {
    if (this.state.crashed) return <CrashScreen variant={this.props.variant} code={this.state.code} />;
    return this.props.children;
  }
}
