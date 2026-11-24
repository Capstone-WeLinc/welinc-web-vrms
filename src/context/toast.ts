import { createElement, type ReactElement } from 'react';
import { toast, type ExternalToast } from 'sonner';
import { Toast, type ToastKind } from '../components/ui/toast';
import { DENIED_MESSAGE, DENIED_TOAST_MS } from '../lib/permissions/keys';

export type ToastType = ToastKind;

/*
  Suite spec 0016 AC-11 (design.md, Feedback: Toasts). Success and info last 5 seconds, warnings 8,
  errors stay until closed. At most MAX_TOASTS show: when full, the oldest non error goes first,
  then the oldest error.
*/
export const TOAST_MS: Record<ToastType, number> = {
  success: 5000,
  info: 5000,
  warning: 8000,
  error: Infinity,
};
export const MAX_TOASTS = 3;

/**
 * Suite spec 0019, AC-25: the session warning's fixed id. It never counts toward MAX_TOASTS (it
 * is not in `shown`), so the toaster shows one more than the limit.
 */
export const SESSION_TOAST_ID = 'session-warning';

export type ToastOptions = {
  /** One optional line under the title. */
  body?: string;
  action?: { label: string; onClick: () => void };
  /** A toast with the same id replaces the one showing instead of stacking. */
  id?: string;
};

type Shown = { id: string | number; type: ToastType };
let shown: Shown[] = [];
let lastDeniedToast = 0;
let nextId = 0;

/** Which shown toast has to go to make room for one more, or null when there is room. */
export function pickToastToEvict(list: Shown[], max = MAX_TOASTS): Shown | null {
  if (list.length < max) return null;
  return list.find((item) => item.type !== 'error') ?? list[0] ?? null;
}

function forget(id: string | number) {
  shown = shown.filter((item) => item.id !== id);
}

/** For code outside React, such as the axios interceptor; components use useToast(). */
export function showToast(message: string, type: ToastType = 'success', options: ToastOptions = {}) {
  // The denied text shows at most once per window, however many callers raise it (spec 0011, AC-24)
  if (message === DENIED_MESSAGE) {
    const now = Date.now();
    if (now - lastDeniedToast < DENIED_TOAST_MS) return;
    lastDeniedToast = now;
  }

  const id = options.id ?? `toast-${++nextId}`;
  const replacing = shown.some((item) => item.id === id);
  if (!replacing) {
    const evict = pickToastToEvict(shown);
    if (evict) {
      forget(evict.id);
      toast.dismiss(evict.id);
    }
    shown = [...shown, { id, type }];
  }

  const duration = TOAST_MS[type];
  const settings: ExternalToast = {
    id,
    duration,
    onDismiss: () => forget(id),
    onAutoClose: () => forget(id),
  };
  toast.custom(
    () =>
      createElement(Toast, {
        kind: type,
        title: message,
        body: options.body,
        action: options.action,
        durationMs: Number.isFinite(duration) && type !== 'warning' ? duration : undefined,
        onClose: () => {
          forget(id);
          toast.dismiss(id);
        },
      }),
    settings,
  );
}

// One stable object, so callers can list showToast in effect dependencies.
const toastApi = { showToast };

export function useToast() {
  return toastApi;
}

/**
 * Suite spec 0019, AC-25: shows the session warning (or redraws it), with no time limit and no
 * swipe away. `render` reads the auth store itself, so its countdown ticks on its own.
 */
export function showSessionToast(render: () => ReactElement) {
  toast.custom(render, { id: SESSION_TOAST_ID, duration: Infinity, dismissible: false });
}

export function dismissSessionToast() {
  toast.dismiss(SESSION_TOAST_ID);
}

/** Tests only. */
export function resetToastsForTests() {
  shown = [];
  lastDeniedToast = 0;
}
