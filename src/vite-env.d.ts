interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PORTAL_URL?: string;
  readonly VITE_VMMS_URL?: string;
  readonly VITE_AUTH_MODE?: 'portal' | 'standalone';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  // Dev only override for SessionMonitor, in seconds
  __WELINC_INACTIVITY_LIMIT__?: number;
}

declare module '*.css';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
