import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
  define: {
    'process.env': {},
  },
});
