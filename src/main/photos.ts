import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);

/**
 * 사진은 데이터 폴더의 photos/ 아래에 복사해서 보관한다.
 *  - photos/_pending/  : 계약 저장 전에 고른 사진 (프로그램 켤 때 비움)
 *  - photos/<계약번호>/ : 저장된 계약의 사진
 */
export class Photos {
  constructor(readonly root: string) {}

  private get pendingDir() { return path.join(this.root, '_pending'); }
  private contractDir(id: number) { return path.join(this.root, String(id)); }

  cleanPending(): void {
    fs.rmSync(this.pendingDir, { recursive: true, force: true });
  }

  /** 원본 파일을 임시 보관함에 복사하고 새 이름들을 돌려준다. 그림 파일이 아니면 건너뛴다. */
  importToPending(files: string[]): string[] {
    fs.mkdirSync(this.pendingDir, { recursive: true });
    const names: string[] = [];
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (!IMAGE_EXT.has(ext) || !fs.statSync(f, { throwIfNoEntry: false })?.isFile()) continue;
      const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      fs.copyFileSync(f, path.join(this.pendingDir, name));
      names.push(name);
    }
    return names;
  }

  /** 임시 보관함 → 계약 폴더. 옮긴 이름들만 돌려준다. */
  attach(contractId: number, names: string[]): string[] {
    const dir = this.contractDir(contractId);
    fs.mkdirSync(dir, { recursive: true });
    return names.filter((n) => {
      const from = this.resolve('p', n);
      if (!from || !fs.existsSync(from)) return false;
      fs.renameSync(from, path.join(dir, n));
      return true;
    });
  }

  remove(contractId: number, name: string): void {
    const f = this.resolve(String(contractId), name);
    if (f) fs.rmSync(f, { force: true });
  }

  removeAll(contractId: number): void {
    fs.rmSync(this.contractDir(contractId), { recursive: true, force: true });
  }

  /** photo://local/<p | 계약번호>/<이름> 을 실제 파일 경로로. 폴더 밖을 가리키면 null. */
  resolve(scope: string, name: string): string | null {
    if (!/^[\w.-]+$/.test(name) || name.startsWith('.')) return null;
    if (scope === 'p') return path.join(this.pendingDir, name);
    if (/^\d+$/.test(scope)) return path.join(this.contractDir(Number(scope)), name);
    return null;
  }
}
