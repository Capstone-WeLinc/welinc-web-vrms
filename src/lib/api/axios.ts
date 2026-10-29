import axios from 'axios';
import { showToast } from '../../context/toast';
import { getApiErrorMessage } from './errors';
import { DENIED_MESSAGE, DENIED_TOAST_MS, FORBIDDEN_EVENT } from '../permissions/keys';

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'http://localhost:8000';
const UNAVAILABLE = 'Sign in service unavailable. Try again in a moment.';
const UNAVAILABLE_TOAST_GAP_MS = 10_000;
// Long enough to read the reason before the page leaves
const SIGN_OUT_DELAY_MS = 2_500;

declare module 'axios' {
  interface AxiosRequestConfig {
    /** No toast for a 503 or a wrong role 403; the caller handles it. A 401 still signs out. */
    quiet?: boolean;
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('welinc_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let lastUnavailableToast = 0;
let lastDeniedToast = 0;
let signingOut = false;

/**
 * Ends the session and leaves for the portal. The portal shows no message of its own, so the
 * reason shows here first. `logout=true` makes the portal drop its copy of the token too, or it
 * would send the person straight back.
 */
function signOutToPortal(message: string) {
  if (signingOut) return;
  signingOut = true;
  localStorage.removeItem('welinc_token');
  localStorage.removeItem('welinc_user');
  localStorage.removeItem('welinc-auth-storage');
  showToast(message, 'error');
  setTimeout(() => {
    window.location.href = `${PORTAL_URL}/login?logout=true`;
  }, SIGN_OUT_DELAY_MS);
}

// Spec 0009, AC-6 and AC-26
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status;
    const quiet = error.config?.quiet === true;

    if (status === 503 && !quiet) {
      // welinc-auth is down: keep the session, say so at most once per 10 seconds
      const now = Date.now();
      if (now - lastUnavailableToast >= UNAVAILABLE_TOAST_GAP_MS) {
        lastUnavailableToast = now;
        showToast(getApiErrorMessage(error, UNAVAILABLE), 'error');
      }
    } else if (status === 401) {
      signOutToPortal(getApiErrorMessage(error, 'Your session has ended. Sign in again.'));
    } else if (status === 403) {
      const message = getApiErrorMessage(error, "You don't have access to that.");
      if (message.startsWith('Account is locked')) {
        signOutToPortal(message);
      } else {
        // A missing permission: stay signed in and refetch the keys at once. A page that now
        // needs a key you lost sends you to the dashboard on its own (spec 0011, AC-23, AC-24).
        window.dispatchEvent(new Event(FORBIDDEN_EVENT));
        const now = Date.now();
        if (!quiet && now - lastDeniedToast >= DENIED_TOAST_MS) {
          lastDeniedToast = now;
          showToast(DENIED_MESSAGE, 'error');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
