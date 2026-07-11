import { app, BrowserWindow, ipcMain, Menu, nativeTheme, session } from 'electron';
import path from 'node:path';
import * as fs from 'node:fs';
import { registerIpcHandlers } from './ipc';
import { handleSquirrelEvents } from './squirrelHandler';
import { checkForUpdates, downloadAsset } from './updateChecker';
import { loadWindowState, saveWindowState } from './windowState';

if (handleSquirrelEvents()) {
  process.exit(0);
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

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
        {
          label: 'Theme',
          submenu: [
            { id: 'theme-dark', label: 'Dark', type: 'radio', checked: true,
              click: () => mainWindow.webContents.send('menu:set-theme', 'dark') },
            { id: 'theme-light', label: 'Light', type: 'radio',
              click: () => mainWindow.webContents.send('menu:set-theme', 'light') },
            { id: 'theme-system', label: 'System', type: 'radio',
              click: () => mainWindow.webContents.send('menu:set-theme', 'system') },
          ],
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        // Custom zoom items: adjust the persisted UI scale (config.uiZoom)
        // instead of the transient Chromium zoom level.
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow.webContents.send('menu:zoom-reset'),
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => mainWindow.webContents.send('menu:zoom-in'),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => mainWindow.webContents.send('menu:zoom-out'),
        },
        // Hidden aliases keep the secondary bindings the stock zoom roles had.
        {
          label: 'Zoom In (numpad)',
          accelerator: 'CmdOrCtrl+numadd',
          visible: false,
          acceleratorWorksWhenHidden: true,
          click: () => mainWindow.webContents.send('menu:zoom-in'),
        },
        {
          label: 'Zoom Out (numpad)',
          accelerator: 'CmdOrCtrl+numsub',
          visible: false,
          acceleratorWorksWhenHidden: true,
          click: () => mainWindow.webContents.send('menu:zoom-out'),
        },
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

  nativeTheme.on('updated', () => {
    mainWindow.webContents.send('theme:system-changed', nativeTheme.shouldUseDarkColors);
  });

  ipcMain.on('webview-state', (_event, visible: boolean) => {
    const menuItem = menu.getMenuItemById('toggle-webview');
    if (menuItem) menuItem.checked = visible;
  });

  ipcMain.on('theme-state', (_event, theme: string) => {
    const item = menu.getMenuItemById(`theme-${theme}`);
    if (item) item.checked = true;
  });

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;

  mainWindow.on('resize', () => {
    if (mainWindow.isMaximized()) return;
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const [width, height] = mainWindow.getSize();
      saveWindowState({ width, height });
    }, 500);
  });

  mainWindow.on('maximize', () => {
    saveWindowState({ maximized: true });
  });

  mainWindow.on('unmaximize', () => {
    const [width, height] = mainWindow.getSize();
    saveWindowState({ maximized: false, width, height });
  });

  // Windows-only: flush storage on graceful shutdown/restart/logoff. Windows
  // allows ~5s before SIGKILL. Doesn't fire on hard power-off, BSOD, or End Task.
  mainWindow.on('session-end', () => {
    session.defaultSession.flushStorageData();
    app.quit();
  });

  return mainWindow;
}

app.whenReady().then(async () => {
  // Dev-only: clear HTTP cache on startup. Chromium's disk cache uses
  // memory-mapped block files that can corrupt on forced shutdown, poisoning
  // subsequent loads of Vite-served modules. Production keeps the cache.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await session.defaultSession.clearCache();
  }

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
