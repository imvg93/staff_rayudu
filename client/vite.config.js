import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend dev server proxies /api and /uploads to the Express backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
});
