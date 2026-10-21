// Development: Vite dev server for the screens + Electron pointed at it.
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import electron from 'electron';

await import('./build-main.mjs');
const server = await createServer({ configFile: 'vite.config.mts' });
await server.listen();
const url = `http://localhost:${server.config.server.port}`;
const child = spawn(electron, ['.'], { stdio: 'inherit', env: { ...process.env, VITE_DEV_SERVER_URL: url } });
child.on('close', () => { server.close(); process.exit(0); });
