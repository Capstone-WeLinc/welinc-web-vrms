/// <reference types="vite/client" />

// Both are required and checked before dev or build starts (env.schema.ts, spec 0010)
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_PORTAL_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
