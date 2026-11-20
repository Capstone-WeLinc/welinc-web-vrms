import type { ErrorInfo, ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CrashBoundary } from './CrashBoundary';
import { CrashScreen } from './CrashScreen';

// covers: VRMS spec 0025 AC-3, AC-7
// Plain Node has no DOM to throw a real render error into, so the boundary's methods are called
// the way React calls them.

const reportRenderCrash = vi.hoisted(() => vi.fn());
vi.mock('../../lib/monitoring/sentry', () => ({ reportRenderCrash }));

const make = (variant: 'page' | 'full' = 'page') => {
  const boundary = new CrashBoundary({ children: 'the page', variant });
  const setState = vi.spyOn(boundary, 'setState').mockImplementation(() => undefined);
  return { boundary, setState };
};

const info = { componentStack: '\n    at RepairPage' } as ErrorInfo;

beforeEach(() => vi.clearAllMocks());

describe('CrashBoundary', () => {
  it('starts without a crash and shows its children', () => {
    const { boundary } = make();

    expect(boundary.state).toEqual({ crashed: false });
    expect(boundary.render()).toBe('the page');
  });

  it('turns the crashed flag on when a child throws', () => {
    expect(CrashBoundary.getDerivedStateFromError()).toEqual({ crashed: true });
  });

  it('reports the crash once, with the component stack', () => {
    const { boundary } = make();
    const error = new Error('boom');

    boundary.componentDidCatch(error, info);

    expect(reportRenderCrash).toHaveBeenCalledTimes(1);
    expect(reportRenderCrash).toHaveBeenCalledWith(error, '\n    at RepairPage');
  });

  it('keeps the first 8 characters of the event id as the reference code', () => {
    reportRenderCrash.mockReturnValue('abcdef0123456789abcdef0123456789');
    const { boundary, setState } = make();

    boundary.componentDidCatch(new Error('boom'), info);

    expect(setState).toHaveBeenCalledWith({ code: 'abcdef01' });
  });

  it('sets no code when monitoring is off', () => {
    reportRenderCrash.mockReturnValue(undefined);
    const { boundary, setState } = make();

    boundary.componentDidCatch(new Error('boom'), info);

    expect(setState).not.toHaveBeenCalled();
  });

  it('shows the crash screen with its variant and code once crashed', () => {
    const { boundary } = make('full');
    boundary.state = { crashed: true, code: 'abcdef01' };

    const screen = boundary.render() as ReactElement<{ variant: string; code?: string }>;

    expect(screen.type).toBe(CrashScreen);
    expect(screen.props).toEqual({ variant: 'full', code: 'abcdef01' });
  });
});
