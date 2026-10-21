export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string; // default 'Confirm'
  cancelText?: string; // default 'Cancel'
  tone?: 'default' | 'destructive';
};

export type ConfirmRequest = {
  id: number;
  options: ConfirmOptions;
  /** The element that had focus when confirm() was called; focus returns here. */
  opener: HTMLElement | null;
  resolve: (confirmed: boolean) => void;
};

// A small external store: confirm() queues requests, ConfirmProvider shows the first one.
let queue: ConfirmRequest[] = [];
let nextId = 1;
let mountedProviders = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export const confirmStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getCurrent(): ConfirmRequest | null {
    return queue[0] ?? null;
  },
  settle(id: number, confirmed: boolean) {
    const request = queue.find((item) => item.id === id);
    if (!request) return;
    queue = queue.filter((item) => item !== request);
    request.resolve(confirmed);
    emit();
  },
  /** Resolves the open confirm and every queued one false (route change, unmount). */
  cancelAll() {
    if (queue.length === 0) return;
    const pending = queue;
    queue = [];
    pending.forEach((request) => request.resolve(false));
    emit();
  },
  attachProvider() {
    mountedProviders += 1;
    return () => {
      mountedProviders -= 1;
      if (mountedProviders === 0) confirmStore.cancelAll();
    };
  },
};

/**
 * Asks the user to confirm an action. Resolves true on confirm, and false on
 * cancel, Esc, a click outside, or a route change. Calls made while one is
 * open wait in a queue.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  if (mountedProviders === 0) {
    throw new Error('confirm() needs <ConfirmProvider> mounted');
  }
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  return new Promise<boolean>((resolve) => {
    queue = [...queue, { id: nextId++, options, opener, resolve }];
    emit();
  });
}
