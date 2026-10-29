import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
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
});
