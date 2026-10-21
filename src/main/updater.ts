import { app, type BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { UpdateStatus } from '../shared/types';

const CHECK_EVERY_MS = 4 * 60 * 60 * 1000;

/**
 * GitHub Releases 에 새 버전이 올라오면 화면 위에 '지금 업데이트' 띠를 띄운다.
 * 버튼을 누르면 내려받고, 다 받으면 프로그램이 다시 켜지면서 설치된다.
 */
export class Updater {
  private status: UpdateStatus = { state: 'idle' };
  private win: BrowserWindow | null = null;

  start(win: BrowserWindow): void {
    this.win = win;
    if (process.env.PAWN_FAKE_UPDATE) {
      this.set({ state: 'available', version: process.env.PAWN_FAKE_UPDATE });
      return;
    }
    if (!app.isPackaged) return;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', (info) => this.set({ state: 'available', version: info.version }));
    autoUpdater.on('download-progress', (p) => this.set({ state: 'downloading', percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', () => {
      this.set({ state: 'ready' });
      setTimeout(() => autoUpdater.quitAndInstall(true, true), 1500);
    });
    autoUpdater.on('error', (e) => {
      // 인터넷이 안 될 때 확인만 실패한 경우는 조용히 넘어간다.
      if (this.status.state === 'downloading') this.set({ state: 'error', message: String(e?.message ?? e) });
    });

    const check = () => autoUpdater.checkForUpdates().catch(() => undefined);
    check();
    setInterval(check, CHECK_EVERY_MS);
  }

  get(): UpdateStatus {
    return this.status;
  }

  async download(): Promise<void> {
    if (process.env.PAWN_FAKE_UPDATE) {
      this.set({ state: 'downloading', percent: 0 });
      return;
    }
    this.set({ state: 'downloading', percent: 0 });
    await autoUpdater.downloadUpdate();
  }

  private set(s: UpdateStatus): void {
    this.status = s;
    this.win?.webContents.send('update-status', s);
  }
}
