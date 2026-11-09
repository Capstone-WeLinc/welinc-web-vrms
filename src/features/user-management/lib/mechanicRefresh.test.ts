import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/api/vrmsConfigApi', () => ({ refreshMechanic: vi.fn() }));

import { refreshMechanic } from '../../../lib/api/vrmsConfigApi';
import { REFRESH_FAILED_AFTER_SAVE, refreshAfterSave } from './mechanicRefresh';

// Spec 0005, AC-20: a Users page save refreshes that one person, and a failure only warns.

const refresh = vi.mocked(refreshMechanic);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('refreshAfterSave', () => {
  beforeEach(() => refresh.mockReset());

  it('refreshes that person quietly and shows nothing when it works', async () => {
    refresh.mockResolvedValue({ mechanicId: 'm1', isActive: true } as never);
    const toast = vi.fn();
    refreshAfterSave('auth-1', toast);
    await flush();
    expect(refresh).toHaveBeenCalledWith('auth-1', { quiet: true });
    expect(toast).not.toHaveBeenCalled();
  });

  it('warns, without throwing, when the refresh fails', async () => {
    // vitest rethrows a rejected promise its mock returned, as unhandled, so the stub only
    // answers .catch, which is all refreshAfterSave uses
    refresh.mockReturnValue({
      catch: (onFailed: (e: unknown) => void) => onFailed(new Error('503')),
    } as never);
    const toast = vi.fn();
    expect(() => refreshAfterSave('auth-1', toast)).not.toThrow();
    await flush();
    expect(toast).toHaveBeenCalledWith(REFRESH_FAILED_AFTER_SAVE, 'warning');
  });
});
