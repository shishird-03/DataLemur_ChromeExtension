import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

// crxjs resolves the TypeScript entry points declared in manifest.json,
// bundles them per Chrome's rules (content scripts as IIFE, worker as ESM)
// and rewrites the emitted manifest into dist/.
export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
sourcemap: false,
  },
});
