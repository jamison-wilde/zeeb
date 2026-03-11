import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('zeebIpc', {
  sendToHost: (data: string) => ipcRenderer.sendToHost('webview-message', data),
});
