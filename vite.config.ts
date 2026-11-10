import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { checkEnv } from './env.schema.ts';

export default defineConfig(({ mode }) => {
  // Spec 0010: stop dev and build with a list of missing or malformed VITE_* names.
  // Vitest skips it, since unit tests don't use the addresses.
  if (!process.env.VITEST) checkEnv(loadEnv(mode, process.cwd(), 'VITE_'), mode);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 8001,
      host: true, // Bind to 0.0.0.0 — required for Docker
      watch: {
        usePolling: true, // Fix for Windows/WSL docker hot-reload
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
    define: {
      'process.env': {},
    },
  };
});
