import fs from 'node:fs';
import path from 'node:path';

const KEEP = 30;

/** data.db 를 backup/data-YYYYMMDD[-HHMMSS].db 로 복사하고, 오래된 것은 30개만 남긴다. */
export function backup(dbFile: string, dir: string, stamp: string, force = false): string | null {
  if (!fs.existsSync(dbFile)) return null;
  fs.mkdirSync(dir, { recursive: true });
  const day = stamp.slice(0, 10).replace(/-/g, '');
  const daily = path.join(dir, `data-${day}.db`);
  const target = force ? path.join(dir, `data-${day}-${stamp.slice(11).replace(/:/g, '')}.db`) : daily;
  if (!force && fs.existsSync(daily)) return null;
  fs.copyFileSync(dbFile, target);

  const files = fs.readdirSync(dir).filter((f) => /^data-\d{8}(-\d{6})?\.db$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) fs.rmSync(path.join(dir, f), { force: true });
  return target;
}
