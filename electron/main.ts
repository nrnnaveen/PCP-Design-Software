/**
 * FloZ EDA - Electron Main Process
 * Creates application window, builds native engineering menus, registers IPC, and handles OS events.
 */

import { app, BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron';
import path from 'path';
import { registerIPCHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'FloZ AI PCB Editor — Professional EDA Suite',
    backgroundColor: '#111418',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  // Register IPC Communication Channels
  registerIPCHandlers(mainWindow);

  // Build Native Application Menu
  const menu = buildApplicationMenu(mainWindow);
  Menu.setApplicationMenu(menu);

  // Smooth Show on Ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function buildApplicationMenu(win: BrowserWindow): Menu {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    // 1. File Menu
    {
      label: '&File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => win.webContents.send('menu:action', 'new-project'),
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => win.webContents.send('menu:action', 'open-project'),
        },
        { type: 'separator' },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => win.webContents.send('menu:action', 'save-project'),
        },
        {
          label: 'Save Project As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => win.webContents.send('menu:action', 'save-project-as'),
        },
        { type: 'separator' },
        {
          label: 'Export Manufacturing Package (Gerber/Drill)...',
          click: () => win.webContents.send('menu:action', 'export-gerber'),
        },
        {
          label: 'Export Bill of Materials (BOM CSV)...',
          click: () => win.webContents.send('menu:action', 'export-bom'),
        },
        {
          label: 'Export Pick and Place (CPL CSV)...',
          click: () => win.webContents.send('menu:action', 'export-cpl'),
        },
        { type: 'separator' },
        { role: isMac ? 'close' : 'quit' },
      ],
    },

    // 2. Edit Menu
    {
      label: '&Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => win.webContents.send('menu:action', 'undo'),
        },
        {
          label: 'Redo',
          accelerator: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y',
          click: () => win.webContents.send('menu:action', 'redo'),
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },

    // 3. View Menu
    {
      label: '&View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => win.webContents.send('menu:action', 'zoom-in'),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => win.webContents.send('menu:action', 'zoom-out'),
        },
        {
          label: 'Zoom to Fit Board',
          accelerator: 'CmdOrCtrl+0',
          click: () => win.webContents.send('menu:action', 'zoom-fit'),
        },
        { type: 'separator' },
        {
          label: 'Schematic Editor',
          accelerator: 'F1',
          click: () => win.webContents.send('menu:action', 'tab-schematic'),
        },
        {
          label: 'PCB Layout Editor',
          accelerator: 'F2',
          click: () => win.webContents.send('menu:action', 'tab-pcb'),
        },
        {
          label: '3D Board Viewer',
          accelerator: 'F3',
          click: () => win.webContents.send('menu:action', 'tab-3d'),
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // 4. Route & PCB Tools
    {
      label: '&Route',
      submenu: [
        {
          label: 'Interactive Route Track',
          accelerator: 'X',
          click: () => win.webContents.send('menu:action', 'tool-route'),
        },
        {
          label: 'Place Through-Hole Via',
          accelerator: 'V',
          click: () => win.webContents.send('menu:action', 'tool-via'),
        },
        {
          label: 'Refill All Copper Zones',
          accelerator: 'B',
          click: () => win.webContents.send('menu:action', 'fill-zones'),
        },
        { type: 'separator' },
        {
          label: 'Board Setup & Physical Stackup...',
          click: () => win.webContents.send('menu:action', 'open-board-setup'),
        },
        {
          label: 'Run Design Rules Check (DRC)',
          accelerator: 'F8',
          click: () => win.webContents.send('menu:action', 'run-drc'),
        },
      ],
    },

    // 5. Help Menu
    {
      label: '&Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts Reference',
          click: () => win.webContents.send('menu:action', 'help-shortcuts'),
        },
        {
          label: 'About FloZ AI PCB Editor',
          click: () => win.webContents.send('menu:action', 'help-about'),
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
