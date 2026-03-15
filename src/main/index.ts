import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'node:path';
import * as fs from 'node:fs';
import { registerIpcHandlers } from './ipc';
import { handleSquirrelEvents } from './squirrelHandler';
import { checkForUpdates, downloadAsset } from './updateChecker';

if (handleSquirrelEvents()) {
  process.exit(0);
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

function loadWindowState(): { width: number; height: number; maximized: boolean } {
  const defaults = { width: 1024, height: 768, maximized: false };
  try {
    const configDir = app.getPath('userData');
    const configPath = path.join(configDir, 'zeeb-config.json');
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    return {
      width: typeof config.windowWidth === 'number' ? config.windowWidth : defaults.width,
      height: typeof config.windowHeight === 'number' ? config.windowHeight : defaults.height,
      maximized: typeof config.windowMaximized === 'boolean' ? config.windowMaximized : defaults.maximized,
    };
  } catch {
    return defaults;
  }
}

function createWindow(): BrowserWindow {
  const windowState = loadWindowState();
  const mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    webPreferences: {
      preload: path.join(__dirname, 'main.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  if (windowState.maximized) {
    mainWindow.maximize();
  }

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:open-folder'),
        },
        {
          label: 'Options',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('menu:options'),
        },
        {
          label: 'Undo Rename...',
          click: () => mainWindow.webContents.send('menu:undo-rename'),
        },
        { type: 'separator' },
        {
          label: 'Release Notes',
          click: () => mainWindow.webContents.send('menu:release-notes'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo Typing', role: 'undo' },
        { label: 'Redo Typing', role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          id: 'toggle-webview',
          label: 'Toggle Web View',
          type: 'checkbox',
          checked: false,
          click: () => {
            mainWindow.webContents.send('menu:toggle-webview');
          },
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Zeeb Movie Renamer',
          click: () => mainWindow.webContents.send('menu:about'),
        },
        { type: 'separator' },
        {
          label: 'Zeeb on GitHub',
          click: () => {
            const { shell } = require('electron');
            shell.openExternal('https://github.com/jamison-wilde/zeeb');
          },
        },
        {
          label: 'Report an Issue',
          click: () => {
            const { shell } = require('electron');
            shell.openExternal('https://github.com/jamison-wilde/zeeb/issues');
          },
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  ipcMain.on('webview-state', (_event, visible: boolean) => {
    const menuItem = menu.getMenuItemById('toggle-webview');
    if (menuItem) menuItem.checked = visible;
  });

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;

  mainWindow.on('resize', () => {
    if (mainWindow.isMaximized()) return;
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const [width, height] = mainWindow.getSize();
      mainWindow.webContents.send('config:window-state', { windowWidth: width, windowHeight: height });
    }, 500);
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('config:window-state', { windowMaximized: true });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('config:window-state', { windowMaximized: false });
    const [width, height] = mainWindow.getSize();
    mainWindow.webContents.send('config:window-state', { windowWidth: width, windowHeight: height });
  });

  return mainWindow;
}

app.whenReady().then(() => {
  registerIpcHandlers();
  const mainWindow = createWindow();

  // Update check
  const configPath = path.join(app.getPath('userData'), 'zeeb-config.json');
  let skipVersion: string | null = null;
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    skipVersion = cfg.skipUpdateVersion ?? null;
  } catch { /* no config yet */ }
  checkForUpdates(mainWindow, skipVersion);

  // Download handler
  ipcMain.handle('update:download', (_event, assetUrl: string) => {
    downloadAsset(assetUrl, mainWindow);
  });

  // Show in folder handler
  ipcMain.handle('update:show-in-folder', (_event, filePath: string) => {
    const { shell } = require('electron');
    shell.showItemInFolder(filePath);
  });

  // Open external handler
  ipcMain.handle('update:open-external', (_event, url: string) => {
    const { shell } = require('electron');
    shell.openExternal(url);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
