import { contextBridge, ipcRenderer } from 'electron';

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
  getWebviewPreloadPath: () => ipcRenderer.invoke('app:getWebviewPreloadPath'),
});

contextBridge.exposeInMainWorld('zeebMenu', {
  onOptions: (callback: () => void) => ipcRenderer.on('menu:options', callback),
  onUndo: (callback: () => void) => ipcRenderer.on('menu:undo', callback),
  onReleaseNotes: (callback: () => void) => ipcRenderer.on('menu:release-notes', callback),
});
