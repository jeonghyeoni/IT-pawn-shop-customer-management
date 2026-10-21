// Bundles the Electron main and preload scripts. Runtime dependencies stay in node_modules.
import { build } from 'esbuild';

const common = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  packages: 'external',
  logLevel: 'info'
};

await build({ ...common, entryPoints: ['src/main/index.ts'], outfile: 'dist/main/index.js' });
await build({ ...common, entryPoints: ['src/preload/index.ts'], outfile: 'dist/preload/index.js' });
