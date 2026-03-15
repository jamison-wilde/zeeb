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

  ipcMain.handle('fs:writeBinaryFile', async (_event, filePath: string, data: Uint8Array) => {
    await fs.writeFile(filePath, Buffer.from(data));
  });

  ipcMain.handle('fs:downloadToFile', async (_event, url: string, filePath: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buffer = await res.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(buffer));
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

  ipcMain.handle('app:getVersion', () => app.getVersion());

  ipcMain.handle('app:getReleaseNotes', async () => {
    const fsSync = require('node:fs');
    // Try bundled release-notes.md first (production)
    const bundledPath = path.join(__dirname, '..', 'assets', 'release-notes.md');
    try {
      return fsSync.readFileSync(bundledPath, 'utf-8');
    } catch { /* not bundled — dev mode */ }

    // Dev fallback: extract from CHANGELOG.md
    try {
      const pkg = JSON.parse(fsSync.readFileSync(path.join(app.getAppPath(), 'package.json'), 'utf-8'));
      const changelog = fsSync.readFileSync(path.join(app.getAppPath(), 'CHANGELOG.md'), 'utf-8');
      const { extractVersionSection } = require('../../scripts/extract-changelog');
      return extractVersionSection(changelog, pkg.version) || 'No release notes available.';
    } catch {
      return 'No release notes available.';
    }
  });
}
