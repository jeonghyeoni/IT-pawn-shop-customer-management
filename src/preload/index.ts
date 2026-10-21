import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { PawnBridge } from '../shared/api';
import type { UpdateStatus } from '../shared/types';

const bridge: PawnBridge = {
  invoke: (method, args) => ipcRenderer.invoke('api', method, args),
  onUpdateStatus: (cb) => {
    const listener = (_e: unknown, s: UpdateStatus) => cb(s);
    ipcRenderer.on('update-status', listener);
    return () => ipcRenderer.removeListener('update-status', listener);
  },
  pathForFile: (file) => webUtils.getPathForFile(file)
};

contextBridge.exposeInMainWorld('pawn', bridge);
