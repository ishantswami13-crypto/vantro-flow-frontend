import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Tauri serves the web view from ../dist in release and from this dev server
// (fixed port, see src-tauri/tauri.conf.json) during `tauri dev`.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: { '@starlane/contracts': fileURLToPath(new URL('../packages/contracts/src/index.ts', import.meta.url)) },
  },
  server: { port: 1420, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    target: 'es2021',
    sourcemap: false,
    outDir: 'dist',
    emptyOutDir: true,
  },
});
