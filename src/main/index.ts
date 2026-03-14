import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'node:path';
import * as fs from 'node:fs';
import { registerIpcHandlers } from './ipc';

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

function createWindow(): void {
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
    { label: 'Help', role: 'help' },
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
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
