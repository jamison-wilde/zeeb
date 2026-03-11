import { ipcRenderer } from 'electron';

(window as any).zeebIpc = {
  sendToHost: (data: string) => ipcRenderer.sendToHost('webview-message', data),
};
