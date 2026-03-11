import { contextBridge, ipcRenderer } from 'electron';
import path from 'node:path';

contextBridge.exposeInMainWorld('zeebFs', {
  readdir: (dirPath: string) => ipcRenderer.invoke('fs:readdir', dirPath),
  readFile: (filePath: string, encoding: string) => ipcRenderer.invoke('fs:readFile', filePath, encoding),
  writeFile: (filePath: string, data: string, encoding: string) => ipcRenderer.invoke('fs:writeFile', filePath, data, encoding),
  appendFile: (filePath: string, data: string, encoding: string) => ipcRenderer.invoke('fs:appendFile', filePath, data, encoding),
  rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
  unlink: (filePath: string) => ipcRenderer.invoke('fs:unlink', filePath),
  exists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
});

contextBridge.exposeInMainWorld('zeebDialog', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
});

contextBridge.exposeInMainWorld('zeebApp', {
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
});

// Expose the webview preload script path so the renderer can set it on <webview> tags.
// __dirname is available in the preload script (it runs in Node.js context).
// The file is named by the forge config `name: 'webview_preload'`.
contextBridge.exposeInMainWorld('WEBVIEW_PRELOAD_PATH',
  `file://${path.join(__dirname, 'webview_preload.js')}`
);
