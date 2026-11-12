import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManagedUser } from '../../../types';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  getOpenWork: vi.fn(),
}));

vi.mock('../../../components/shared/confirm/confirm', () => ({
  confirm: mocks.confirm,
}));
vi.mock('../../../lib/api/vrmsConfigApi', () => ({
  getOpenWork: mocks.getOpenWork,
}));

import { askAboutOpenWork } from './openWorkFlow';

const BY_STATUS = { OPEN: 0, ASSIGNED: 1, IN_PROGRESS: 1, ON_HOLD: 0 };

function user(role: 'MECHANIC' | 'ADMIN' = 'MECHANIC'): ManagedUser {
  return {
    id: 'u1',
    name: 'Pedro Santos',
    email: 'pedro@welinc.com',
    emailVerified: true,
    isActive: true,
    isLocked: false,
    lockedAt: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    roles: [{ role, system: 'VRMS' }],
  } as ManagedUser;
}

const ask = (alwaysConfirm = true) =>
  askAboutOpenWork(user(), {
    title: 'Deactivate Pedro Santos?',
    description: 'They’ll be signed out.',
    confirmText: 'Deactivate',
    alwaysConfirm,
  });

beforeEach(() => {
  vi.clearAllMocks();
});

// Spec 0011, AC-35; suite spec 0012, AC-24 (VRMS unassigns on its own: no choice, one confirm)
describe('askAboutOpenWork', () => {
  it('says how many open tickets go back to the queue, and GO on confirm', async () => {
    mocks.getOpenWork.mockResolvedValue({ total: 2, byStatus: BY_STATUS });
    mocks.confirm.mockResolvedValue(true);

    await expect(ask()).resolves.toBe('GO');
    const [options] = mocks.confirm.mock.calls[0];
    expect(options.description).toContain('Pedro Santos has 2 open tickets (1 assigned, 1 in progress)');
    expect(options.description).toContain('back to the queue');
    expect(options).not.toHaveProperty('choices');
  });

  it('stops when the Admin cancels', async () => {
    mocks.getOpenWork.mockResolvedValue({ total: 1, byStatus: BY_STATUS });
    mocks.confirm.mockResolvedValue(false);

    await expect(ask()).resolves.toBe('STOP');
  });

  it('asks a plain confirm with no open work, or saves at once for a role change', async () => {
    mocks.getOpenWork.mockResolvedValue({ total: 0, byStatus: {} });
    mocks.confirm.mockResolvedValue(true);

    await expect(ask()).resolves.toBe('GO');
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    await expect(ask(false)).resolves.toBe('GO');
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });

  it('fails closed for a mechanic whose open work cannot be read, and offers Try again', async () => {
    mocks.getOpenWork.mockRejectedValueOnce(new Error('network'));
    mocks.confirm.mockResolvedValue(true);
    mocks.getOpenWork.mockResolvedValueOnce({ total: 1, byStatus: BY_STATUS });

    await expect(ask()).resolves.toBe('GO');
    expect(mocks.getOpenWork).toHaveBeenCalledTimes(2);
  });

  it('stops when the Admin closes the Try again prompt', async () => {
    mocks.getOpenWork.mockRejectedValue(new Error('network'));
    mocks.confirm.mockResolvedValue(false);

    await expect(ask()).resolves.toBe('STOP');
  });

  it('does not block an account that was never a mechanic when open work cannot be read', async () => {
    mocks.getOpenWork.mockRejectedValue(new Error('network'));
    mocks.confirm.mockResolvedValue(true);

    const release = await askAboutOpenWork(user('ADMIN'), {
      title: 'Deactivate?',
      description: 'They’ll be signed out.',
      confirmText: 'Deactivate',
      alwaysConfirm: true,
    });

    expect(release).toBe('GO');
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });
});
