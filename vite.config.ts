import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/healthz': 'http://localhost:3001',
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'node',
    environmentMatchGlobs: [['src/**', 'jsdom']],
    setupFiles: ['src/setupTests.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{js,ts}'],
  },
});
