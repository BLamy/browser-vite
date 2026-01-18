import { defineConfig } from 'vite';
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
  // Base path for GitHub Pages - uses repo name from environment or defaults to /
  base: process.env.GITHUB_PAGES ? '/browser-vite/' : '/',
  server: {
    port: 5173,
    // Required headers for SharedArrayBuffer (used by OXC WASM workers)
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'esnext',  // Required for top-level await in OXC WASM
    outDir: 'dist',
  },
  optimizeDeps: {
    exclude: ['@oxc-transform/binding-wasm32-wasi'],
  },
  worker: {
    format: 'es',
  },
});
