import axios from 'axios';
import { showToast } from '../../context/toast';
import { getApiErrorMessage, getDisabledModule, MODULE_OFF_MESSAGE } from './errors';
import { DENIED_MESSAGE, FORBIDDEN_EVENT } from '../permissions/keys';
import { installDataModes } from '../../features/dev-ui/worst-case/install';

const UNAVAILABLE = 'Sign in service unavailable. Try again in a moment.';
const UNAVAILABLE_TOAST_GAP_MS = 10_000;

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

let lastUnavailableToast = 0;

// Spec 0009, AC-26. The token, the 401 refresh and retry and the sign out live in
// src/lib/session/session.ts, which adds its own interceptors to this instance (spec 0003).
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
    } else if (status === 403 && !error.config?.sessionCall) {
      // A missing permission: stay signed in and refetch the keys at once. A page that now
      // needs a key you lost sends you to the dashboard on its own (spec 0011, AC-23, AC-24).
      // A lock no longer signs anyone out (spec 0003, AC-4).
      window.dispatchEvent(new Event(FORBIDDEN_EVENT));
      // A switched off module says so instead (spec 0012, AC-11); the refetch then hides it
      if (!quiet) showToast(getDisabledModule(error) ? MODULE_OFF_MESSAGE : DENIED_MESSAGE, 'error');
    }
    return Promise.reject(error);
  }
);

// Development only: break-ui's datasets for the Settings hub (?data=worst). The condition is a
// build time constant, so production drops the import.
if (import.meta.env.DEV) installDataModes(api);

export default api;
