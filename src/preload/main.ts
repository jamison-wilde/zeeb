import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('zeebFs', {
  readdir: (dirPath: string) => ipcRenderer.invoke('fs:readdir', dirPath),
  readFile: (filePath: string, encoding: string) => ipcRenderer.invoke('fs:readFile', filePath, encoding),
  writeFile: (filePath: string, data: string, encoding: string) => ipcRenderer.invoke('fs:writeFile', filePath, data, encoding),
  appendFile: (filePath: string, data: string, encoding: string) => ipcRenderer.invoke('fs:appendFile', filePath, data, encoding),
  rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
  unlink: (filePath: string) => ipcRenderer.invoke('fs:unlink', filePath),
  exists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
  writeBinaryFile: (filePath: string, data: Uint8Array) => ipcRenderer.invoke('fs:writeBinaryFile', filePath, data),
  downloadToFile: (url: string, filePath: string) => ipcRenderer.invoke('fs:downloadToFile', url, filePath),
});

contextBridge.exposeInMainWorld('zeebDialog', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
});

contextBridge.exposeInMainWorld('zeebApp', {
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
  getWebviewPreloadPath: () => ipcRenderer.invoke('app:getWebviewPreloadPath'),
  getReleaseNotes: () => ipcRenderer.invoke('app:getReleaseNotes'),
});

contextBridge.exposeInMainWorld('zeebImdb', {
  suggest: (query: string) => ipcRenderer.invoke('imdb:suggest', query),
});

contextBridge.exposeInMainWorld('zeebUpdate', {
  onUpdateAvailable: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update:available', handler);
    return () => ipcRenderer.removeListener('update:available', handler);
  },
  downloadUpdate: (assetUrl: string) => ipcRenderer.invoke('update:download', assetUrl),
  onDownloadProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('update:download-progress', handler);
    return () => ipcRenderer.removeListener('update:download-progress', handler);
  },
  onDownloadComplete: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update:download-complete', handler);
    return () => ipcRenderer.removeListener('update:download-complete', handler);
  },
  onDownloadError: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update:download-error', handler);
    return () => ipcRenderer.removeListener('update:download-error', handler);
  },
  showInFolder: (filePath: string) => ipcRenderer.invoke('update:show-in-folder', filePath),
  openExternal: (url: string) => ipcRenderer.invoke('update:open-external', url),
});

contextBridge.exposeInMainWorld('zeebMenu', {
  onOptions: (callback: () => void) => ipcRenderer.on('menu:options', callback),
  onUndoRename: (callback: () => void) => ipcRenderer.on('menu:undo-rename', callback),
  onToggleWebView: (callback: () => void) => ipcRenderer.on('menu:toggle-webview', callback),
  onReleaseNotes: (callback: () => void) => ipcRenderer.on('menu:release-notes', callback),
  onOpenFolder: (callback: () => void) => ipcRenderer.on('menu:open-folder', callback),
  sendWebViewState: (visible: boolean) => ipcRenderer.send('webview-state', visible),
  onWindowStateChanged: (callback: (state: any) => void) => {
    const handler = (_event: any, state: any) => callback(state);
    ipcRenderer.on('config:window-state', handler);
    return () => ipcRenderer.removeListener('config:window-state', handler);
  },
});
