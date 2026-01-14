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
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
  optimizeDeps: {
    include: ['esbuild-wasm'],
  },
});
