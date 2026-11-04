import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Keep the charting library in its own long-cached chunk.
      output: { manualChunks: { recharts: ['recharts'], vendor: ['react', 'react-dom', '@tanstack/react-query'] } },
    },
  },
  server: {
    port: 5173,
    // In dev, proxy API calls to the Express server so the browser sees one origin.
    proxy: { '/api': { target: process.env.VITE_API_TARGET ?? 'http://localhost:4000', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
