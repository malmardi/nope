// Runs both Vite builds into dist/. Pass --watch to rebuild on change.
import { build } from 'vite';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectDir = fileURLToPath(new URL('..', import.meta.url));
const watch = process.argv.includes('--watch') ? {} : null;

rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });

await build({ configFile: `${projectDir}vite.config.ts`, build: { watch } });
await build({ configFile: `${projectDir}vite.content.config.ts`, build: { watch } });
