import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManagedUser } from '../../../types';

const mocks = vi.hoisted(() => ({
  toast: { error: vi.fn() },
  confirm: vi.fn(),
  confirmChoice: vi.fn(),
  getOpenWork: vi.fn(),
  releaseTickets: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));
vi.mock('../../../components/shared/confirm/confirm', () => ({
  confirm: mocks.confirm,
  confirmChoice: mocks.confirmChoice,
}));
vi.mock('../../../lib/api/vrmsConfigApi', () => ({
  getOpenWork: mocks.getOpenWork,
  releaseTickets: mocks.releaseTickets,
}));

import { askAboutOpenWork, releaseAfterLeaving } from './openWorkFlow';

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

// Spec 0011, AC-35
describe('askAboutOpenWork', () => {
  it('asks with the count by status and returns RELEASE for "Move them back"', async () => {
    mocks.getOpenWork.mockResolvedValue({ total: 2, byStatus: BY_STATUS });
    mocks.confirmChoice.mockResolvedValue('RELEASE');

    await expect(ask()).resolves.toBe('RELEASE');

    const options = mocks.confirmChoice.mock.calls[0][0];
    expect(options.description).toContain('Pedro Santos has 2 open tickets (1 assigned, 1 in progress)');
    expect(options.choices.map((c: { value: string }) => c.value)).toEqual(['RELEASE', 'KEEP']);
  });

  it('returns KEEP when the Admin picks "Keep them assigned"', async () => {
    mocks.getOpenWork.mockResolvedValue({ total: 1, byStatus: BY_STATUS });
    mocks.confirmChoice.mockResolvedValue('KEEP');

    await expect(ask()).resolves.toBe('KEEP');
  });

  it('returns STOP when the Admin backs out of the choice', async () => {
    mocks.getOpenWork.mockResolvedValue({ total: 1, byStatus: BY_STATUS });
    mocks.confirmChoice.mockResolvedValue(null);

    await expect(ask()).resolves.toBe('STOP');
  });

  it('shows the plain confirm with no choice when there are no open tickets', async () => {
    mocks.getOpenWork.mockResolvedValue({ total: 0, byStatus: {} });
    mocks.confirm.mockResolvedValue(true);

    await expect(ask()).resolves.toBe('KEEP');
    expect(mocks.confirmChoice).not.toHaveBeenCalled();
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });

  it('stops when the Admin cancels the plain confirm', async () => {
    mocks.getOpenWork.mockResolvedValue({ total: 0, byStatus: {} });
    mocks.confirm.mockResolvedValue(false);

    await expect(ask()).resolves.toBe('STOP');
  });

  it('just saves a role change with no open tickets, without asking', async () => {
    mocks.getOpenWork.mockResolvedValue({ total: 0, byStatus: {} });

    await expect(ask(false)).resolves.toBe('KEEP');
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.confirmChoice).not.toHaveBeenCalled();
  });

  it('fails closed for a mechanic whose open work cannot be read, and offers Try again', async () => {
    mocks.getOpenWork.mockRejectedValueOnce(new Error('network'));
    mocks.confirm.mockResolvedValueOnce(true);
    mocks.getOpenWork.mockResolvedValueOnce({ total: 1, byStatus: BY_STATUS });
    mocks.confirmChoice.mockResolvedValue('RELEASE');

    await expect(ask()).resolves.toBe('RELEASE');
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

    expect(release).toBe('KEEP');
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });
});

describe('releaseAfterLeaving', () => {
  const showToast = vi.fn();

  beforeEach(() => showToast.mockClear());

  it('says how many tickets were taken off them', async () => {
    mocks.releaseTickets.mockResolvedValue({ released: 2, reopened: 1 });

    await releaseAfterLeaving(user(), 'DEACTIVATED', showToast, 'Pedro Santos deactivated.');

    expect(mocks.releaseTickets).toHaveBeenCalledWith('u1', 'DEACTIVATED');
    expect(showToast).toHaveBeenCalledWith('Pedro Santos deactivated. 2 tickets taken off them.');
  });

  it('keeps the message short when nothing needed releasing', async () => {
    mocks.releaseTickets.mockResolvedValue({ released: 0, reopened: 0 });

    await releaseAfterLeaving(user(), 'ROLE_REMOVED', showToast, 'Role changed.');

    expect(showToast).toHaveBeenCalledWith('Role changed.');
  });

  it('offers Retry when the release fails, and Retry runs the release again', async () => {
    mocks.releaseTickets.mockRejectedValueOnce(new Error('down'));
    mocks.releaseTickets.mockResolvedValueOnce({ released: 1, reopened: 1 });

    await releaseAfterLeaving(user(), 'DEACTIVATED', showToast, 'Pedro Santos deactivated.');

    const [message, options] = mocks.toast.error.mock.calls[0];
    expect(message).toBe('Pedro Santos deactivated. But their tickets couldn’t be moved: check your connection');
    expect(options.action.label).toBe('Retry');

    options.action.onClick();
    await vi.waitFor(() => expect(showToast).toHaveBeenCalledWith('Pedro Santos deactivated. 1 ticket taken off them.'));
    expect(mocks.releaseTickets).toHaveBeenCalledTimes(2);
  });

  it('shows the fixed permission text when the release is refused with a 403', async () => {
    const response = { status: 403, data: { message: 'You do not have permission to do that.' } } as AxiosResponse;
    mocks.releaseTickets.mockRejectedValue(new AxiosError('forbidden', 'ERR', undefined, undefined, response));

    await releaseAfterLeaving(user(), 'DEACTIVATED', showToast, 'Pedro Santos deactivated.');

    expect(mocks.toast.error.mock.calls[0][0]).toBe(
      'Pedro Santos deactivated. But their tickets couldn’t be moved: You no longer have permission to do that.',
    );
  });
});
