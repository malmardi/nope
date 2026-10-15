// Content scripts cannot be ES modules, so this build bundles content.ts into one IIFE.
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  publicDir: false,
  build: {
    outDir: resolve(projectDir, 'dist'),
    emptyOutDir: false,
    target: 'chrome116',
    lib: {
      entry: resolve(projectDir, 'src/content/content.ts'),
      formats: ['iife'],
      name: 'NopeContent',
      fileName: () => 'content.js',
    },
  },
});
