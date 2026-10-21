import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BrowserWindow, Menu, app, clipboard, dialog, ipcMain, net, protocol, shell } from 'electron';
import type { ApiMethod, PawnApi } from '../shared/api';
import { todayISO } from '../shared/schedule';
import { backup } from './backup';
import { writeAll, writeContracts } from './excel';
import { Photos } from './photos';
import { Repo, nowStamp } from './repo';
import { Store } from './store';
import { Updater } from './updater';

protocol.registerSchemesAsPrivileged([{ scheme: 'photo', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

// 날짜 칸 등을 한국식(연-월-일)으로 보이게
app.commandLine.appendSwitch('lang', 'ko-KR');

if (!app.requestSingleInstanceLock()) app.quit();

/** 자료는 '문서\전당포관리' 에 둔다. 프로그램을 지우거나 업데이트해도 그대로 남는다. */
const dataDir = process.env.PAWN_DATA_DIR || path.join(app.getPath('documents'), '전당포관리');
const dbFile = path.join(dataDir, 'data.db');
const backupDir = path.join(dataDir, 'backup');
const photos = new Photos(path.join(dataDir, 'photos'));
const updater = new Updater();
const today = () => process.env.PAWN_TODAY || todayISO();

let win: BrowserWindow | null = null;

function createWindow(zoom: number): BrowserWindow {
  const w = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    backgroundColor: '#F3F4F6',
    title: '전당포 관리',
    webPreferences: { preload: path.join(__dirname, '../preload/index.js'), contextIsolation: true, sandbox: true, zoomFactor: zoom }
  });
  w.webContents.on('did-finish-load', () => w.webContents.setZoomFactor(zoom));
  w.once('ready-to-show', () => {
    if (!process.env.PAWN_NO_MAXIMIZE) w.maximize();
    w.show();
  });
  w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  w.webContents.on('will-navigate', (e) => e.preventDefault());
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) w.loadURL(devUrl);
  else w.loadFile(path.join(__dirname, '../renderer/index.html'));
  return w;
}

async function exportDialog(defaultName: string): Promise<string | null> {
  const res = await dialog.showSaveDialog(win!, {
    title: '엑셀 파일로 저장',
    defaultPath: path.join(dataDir, defaultName),
    filters: [{ name: '엑셀 파일', extensions: ['xlsx'] }]
  });
  return res.canceled || !res.filePath ? null : res.filePath;
}

function makeApi(repo: Repo): PawnApi {
  return {
    getToday: async () => today(),
    getDashboard: async () => repo.dashboard(today()),
    listSent: async () => repo.sentList(today()),
    markSent: async (contractId, period, sent) => repo.markSent(contractId, period, sent),
    setPaid: async (contractId, period, paidDate) => repo.setPaid(contractId, period, paidDate),

    findCustomers: async (q) => repo.findCustomers(q),
    getCustomer: async (id) => repo.customerDetail(id, today()),
    createCustomer: async (input) => repo.createCustomer(input),
    updateCustomer: async (id, input) => repo.updateCustomer(id, input),

    searchContracts: async (filter) => repo.searchContracts(filter, today()),
    getContract: async (id) => repo.contractDetail(id, today()),
    createContract: async (input, names, markPastDone) => {
      const id = repo.createContract(input, markPastDone, today());
      repo.addPhotoRows(id, photos.attach(id, names));
      return id;
    },
    updateContract: async (id, input) => repo.updateContract(id, input),
    deleteContract: async (id) => {
      repo.deleteContract(id);
      photos.removeAll(id);
    },
    setContractStatus: async (id, status) => repo.setContractStatus(id, status, today()),

    pickPhotos: async () => {
      const res = await dialog.showOpenDialog(win!, {
        title: '사진 선택',
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: '사진', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }]
      });
      return res.canceled ? [] : photos.importToPending(res.filePaths);
    },
    importPhotos: async (paths) => photos.importToPending(paths),
    addContractPhotos: async (contractId, names) => repo.addPhotoRows(contractId, photos.attach(contractId, names)),
    removeContractPhoto: async (contractId, name) => {
      repo.removePhotoRow(contractId, name);
      photos.remove(contractId, name);
    },

    exportContracts: async (filter) => {
      const file = await exportDialog(`계약목록_${today()}.xlsx`);
      if (file) await writeContracts(file, repo.searchContracts(filter, today()));
      return file;
    },
    exportAll: async () => {
      const file = await exportDialog(`전체데이터_${today()}.xlsx`);
      if (file) await writeAll(file, repo.exportData(today()));
      return file;
    },

    getSettings: async () => repo.settings(),
    saveSettings: async (s) => {
      repo.saveSettings(s);
      win?.webContents.setZoomFactor(s.zoom);
    },
    copyText: async (text) => clipboard.writeText(text),
    openDataFolder: async () => {
      await shell.openPath(dataDir);
    },
    backupNow: async () => backup(dbFile, backupDir, nowStamp(), true) ?? '',
    getAppInfo: async () => ({ version: app.getVersion(), dataDir }),

    getUpdateStatus: async () => updater.get(),
    downloadUpdate: async () => updater.download()
  };
}

app.whenReady().then(async () => {
  const store = await Store.open(dbFile);
  backup(dbFile, backupDir, nowStamp());
  photos.cleanPending();
  const repo = new Repo(store);
  const api = makeApi(repo);

  protocol.handle('photo', (req) => {
    // photo://local/<p | 계약번호>/<이름>
    const [scope = '', name = ''] = new URL(req.url).pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const file = photos.resolve(scope, name);
    if (!file) return new Response('not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });

  ipcMain.handle('api', async (_e, method: ApiMethod, args: unknown[]) => {
    const fn = api[method] as ((...a: unknown[]) => Promise<unknown>) | undefined;
    if (typeof fn !== 'function' || !Object.prototype.hasOwnProperty.call(api, method)) throw new Error(`알 수 없는 기능: ${method}`);
    return fn(...args);
  });

  Menu.setApplicationMenu(null);
  win = createWindow(repo.settings().zoom);
  updater.start(win);
});

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.on('window-all-closed', () => app.quit());
