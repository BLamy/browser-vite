import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    target: 'es2020',
  },
  optimizeDeps: {
    include: ['esbuild'],
  },
  // Ensure esbuild-wasm is available for browser transform
  resolve: {
    alias: {
      // In a real browser-vite setup, you'd alias to the browser bundle
    },
  },
});
