import { ipcMain, dialog, app } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export function registerIpcHandlers(): void {
  ipcMain.handle('fs:readdir', async (_event, dirPath: string) => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      path: path.join(dirPath, e.name),
      isFile: e.isFile(),
      isDirectory: e.isDirectory(),
    }));
  });

  ipcMain.handle('fs:readFile', async (_event, filePath: string, encoding: string) => {
    return fs.readFile(filePath, { encoding: encoding as BufferEncoding });
  });

  ipcMain.handle('fs:writeFile', async (_event, filePath: string, data: string, encoding: string) => {
    await fs.writeFile(filePath, data, { encoding: encoding as BufferEncoding });
  });

  ipcMain.handle('fs:appendFile', async (_event, filePath: string, data: string, encoding: string) => {
    await fs.appendFile(filePath, data, { encoding: encoding as BufferEncoding });
  });

  ipcMain.handle('fs:rename', async (_event, oldPath: string, newPath: string) => {
    await fs.rename(oldPath, newPath);
  });

  ipcMain.handle('fs:unlink', async (_event, filePath: string) => {
    await fs.unlink(filePath);
  });

  ipcMain.handle('fs:exists', async (_event, filePath: string) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('dialog:openDirectory', async (_event) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('app:getPath', (_event, name: string) => {
    return app.getPath(name as Parameters<typeof app.getPath>[0]);
  });

  ipcMain.handle('app:getWebviewPreloadPath', () => {
    return `file://${path.join(__dirname, 'webview.js').replace(/\\/g, '/')}`;
  });
}
