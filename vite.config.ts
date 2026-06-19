import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
