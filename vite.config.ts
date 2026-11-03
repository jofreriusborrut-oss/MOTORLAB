/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: { rollupOptions: { output: { manualChunks: { recharts: ['recharts'] } } }, chunkSizeWarningLimit: 800 },
  test: { globals: true, environment: 'node', include: ['tests/**/*.test.ts'] },
});
