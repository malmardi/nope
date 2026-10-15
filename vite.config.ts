// Builds the extension pages (popup, welcome, options) and the background service worker.
// The content script is built separately as a classic script, see vite.content.config.ts.
import { defineConfig, type Plugin } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND } from './src/shared/brand.ts';

const projectDir = fileURLToPath(new URL('.', import.meta.url));
const src = resolve(projectDir, 'src');

// Copies manifest.json (with the name and version filled in), icons and rules into dist.
function extensionFiles(): Plugin {
  const manifestPath = resolve(projectDir, 'manifest.json');
  const rulesPath = resolve(projectDir, 'rules/rules.json');
  const iconsDir = resolve(projectDir, 'icons');
  return {
    name: 'nope-extension-files',
    buildStart() {
      this.addWatchFile(manifestPath);
      this.addWatchFile(rulesPath);
    },
    generateBundle() {
      const pkg = JSON.parse(readFileSync(resolve(projectDir, 'package.json'), 'utf8'));
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      manifest.name = BRAND.storeName;
      manifest.short_name = BRAND.name;
      manifest.action.default_title = BRAND.name;
      manifest.homepage_url = BRAND.repoUrl;
      manifest.version = pkg.version;
      this.emitFile({ type: 'asset', fileName: 'manifest.json', source: JSON.stringify(manifest, null, 2) });
      this.emitFile({ type: 'asset', fileName: 'rules/rules.json', source: readFileSync(rulesPath, 'utf8') });
      for (const file of readdirSync(iconsDir).filter((f) => f.endsWith('.png'))) {
        this.emitFile({ type: 'asset', fileName: `icons/${file}`, source: readFileSync(resolve(iconsDir, file)) });
      }
    },
  };
}

export default defineConfig({
  root: src,
  publicDir: false,
  plugins: [extensionFiles()],
  build: {
    outDir: resolve(projectDir, 'dist'),
    emptyOutDir: false,
    modulePreload: false,
    target: 'chrome116',
    rollupOptions: {
      input: {
        popup: resolve(src, 'popup/popup.html'),
        welcome: resolve(src, 'welcome/welcome.html'),
        options: resolve(src, 'options/options.html'),
        background: resolve(src, 'background.ts'),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
});
