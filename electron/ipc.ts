/**
 * FloZ EDA - Electron IPC Handlers
 * Handles native file dialogs, filesystem persistence, and OS integrations.
 */

import { ipcMain, dialog, BrowserWindow, Notification, app } from 'electron';
import fs from 'fs';
import path from 'path';

const RECENT_PROJECTS_FILE = path.join(app.getPath('userData'), 'recent_projects.json');

function getStoredRecentProjects(): string[] {
  try {
    if (fs.existsSync(RECENT_PROJECTS_FILE)) {
      const data = fs.readFileSync(RECENT_PROJECTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read recent projects:', err);
  }
  return [];
}

function addStoredRecentProject(filePath: string) {
  try {
    const list = getStoredRecentProjects().filter((p) => p !== filePath);
    list.unshift(filePath);
    fs.writeFileSync(RECENT_PROJECTS_FILE, JSON.stringify(list.slice(0, 15), null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to update recent projects:', err);
  }
}

export function registerIPCHandlers(mainWindow: BrowserWindow) {
  // Synchronous Platform Info
  ipcMain.on('platform:info', (event) => {
    event.returnValue = {
      isElectron: true,
      isWindows: process.platform === 'win32',
      isLinux: process.platform === 'linux',
      isMacOS: process.platform === 'darwin',
      isWeb: false,
      platformName: process.platform,
      appVersion: app.getVersion(),
    };
  });

  // Open Project File Dialog
  ipcMain.handle('dialog:openProject', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open FloZ PCB Project',
      filters: [
        { name: 'FloZ PCB Project (*.floz)', extensions: ['floz', 'json'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false };
    }

    const filePath = result.filePaths[0];
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      addStoredRecentProject(filePath);
      return {
        success: true,
        filePath,
        fileName: path.basename(filePath),
        content,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Save Project
  ipcMain.handle('dialog:saveProject', async (_event, { content, filePath }) => {
    if (!filePath) {
      return saveProjectAsHelper(mainWindow, content);
    }

    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      addStoredRecentProject(filePath);
      return { success: true, filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Save Project As
  ipcMain.handle('dialog:saveProjectAs', async (_event, { content, defaultName }) => {
    return saveProjectAsHelper(mainWindow, content, defaultName);
  });

  // Export Arbitrary File
  ipcMain.handle('dialog:exportFile', async (_event, { data, defaultName, filters }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export File',
      defaultPath: defaultName,
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false };
    }

    try {
      if (typeof data === 'string') {
        fs.writeFileSync(result.filePath, data, 'utf-8');
      } else {
        fs.writeFileSync(result.filePath, Buffer.from(data));
      }
      return { success: true, filePath: result.filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Recent Projects
  ipcMain.handle('recents:get', async () => {
    return getStoredRecentProjects();
  });

  // Notifications
  ipcMain.on('notification:show', (_event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  // Modified Status
  ipcMain.on('window:setModified', (_event, modified) => {
    mainWindow.setDocumentEdited(modified);
  });
}

async function saveProjectAsHelper(
  mainWindow: BrowserWindow,
  content: string,
  defaultName = 'Project.floz'
) {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save FloZ PCB Project As',
    defaultPath: defaultName,
    filters: [
      { name: 'FloZ PCB Project (*.floz)', extensions: ['floz'] },
      { name: 'JSON Project (*.json)', extensions: ['json'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { success: false };
  }

  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    addStoredRecentProject(result.filePath);
    return { success: true, filePath: result.filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
