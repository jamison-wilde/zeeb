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

  ipcMain.handle('dialog:openFile', async (_event) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('app:getPath', (_event, name: string) => {
    return app.getPath(name as Parameters<typeof app.getPath>[0]);
  });

  ipcMain.handle('app:getWebviewPreloadPath', () => {
    const p = path.join(__dirname, 'webview.js').replace(/\\/g, '/');
    return `file:///${p}`;
  });

  ipcMain.handle('imdb:suggest', async (_event, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const firstChar = q[0];
    const url = `https://v3.sg.media-imdb.com/suggestion/${encodeURIComponent(firstChar)}/${encodeURIComponent(q)}.json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json.d)) return [];
    return json.d
      .filter((item: any) => item.id?.startsWith('tt'))
      .map((item: any) => ({
        tt: item.id,
        title: item.l || '',
        year: item.y ?? null,
        aka: null,
        thumbnailUrl: item.i?.imageUrl ?? null,
      }));
  });
}
