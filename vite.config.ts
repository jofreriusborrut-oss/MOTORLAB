/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  // Ruta relativa: funciona a GitHub Pages (/MOTORLAB/) i en local sense canvis
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      // Dues aplicacions: MOTORLAB (/) i el pòquer (/poker/)
      input: { main: resolve(__dirname, 'index.html'), poker: resolve(__dirname, 'poker/index.html') },
      output: {
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          if (/node_modules\/(recharts|d3-|victory-vendor|lodash|react-smooth|recharts-scale|decimal\.js|eventemitter3|tiny-invariant|clsx|fast-equals|react-is|prop-types|dom-helpers|react-transition-group)/.test(id)) return 'recharts';
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  test: { globals: true, environment: 'node', include: ['tests/**/*.test.ts'] },
});
