/**
 * FloZ EDA - Secure Preload Bridge
 * Exposes minimal safe IPC channels to the renderer process with contextIsolation enabled.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('flozBridge', {
  getPlatformInfo: () => ipcRenderer.sendSync('platform:info'),

  openProjectDialog: () => ipcRenderer.invoke('dialog:openProject'),

  saveProjectDialog: (content: string, filePath?: string) =>
    ipcRenderer.invoke('dialog:saveProject', { content, filePath }),

  saveProjectAsDialog: (content: string, defaultName?: string) =>
    ipcRenderer.invoke('dialog:saveProjectAs', { content, defaultName }),

  exportFileDialog: (data: string | Uint8Array, defaultName: string, filters?: any[]) =>
    ipcRenderer.invoke('dialog:exportFile', { data, defaultName, filters }),

  getRecentProjects: () => ipcRenderer.invoke('recents:get'),

  onMenuCommand: (callback: (action: string) => void) => {
    const handler = (_event: any, action: string) => callback(action);
    ipcRenderer.on('menu:action', handler);
    return () => {
      ipcRenderer.removeListener('menu:action', handler);
    };
  },

  showNotification: (title: string, body: string) =>
    ipcRenderer.send('notification:show', { title, body }),

  setWindowModified: (modified: boolean) =>
    ipcRenderer.send('window:setModified', modified),
});
