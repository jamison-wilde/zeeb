// Electron webview tag type for React refs
interface WebviewTag extends HTMLElement {
  loadURL(url: string): void;
  getURL(): string;
  goBack(): void;
  canGoBack(): boolean;
  executeJavaScript(code: string): Promise<unknown>;
  send(channel: string, ...args: any[]): void;
  addEventListener(event: string, handler: (...args: any[]) => void): void;
  removeEventListener(event: string, handler: (...args: any[]) => void): void;
  src: string;
  preload: string;
}

// APIs exposed by preload scripts via contextBridge
interface Window {
  zeebFs: {
    readdir(dirPath: string): Promise<import('../adapters/fs').DirEntry[]>;
    readFile(filePath: string, encoding: string): Promise<string>;
    writeFile(filePath: string, data: string, encoding: string): Promise<void>;
    appendFile(filePath: string, data: string, encoding: string): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
    unlink(filePath: string): Promise<void>;
    exists(filePath: string): Promise<boolean>;
  };
  zeebDialog: {
    openDirectory(): Promise<string | null>;
    openFile(): Promise<string | null>;
  };
  zeebApp: {
    getPath(name: string): Promise<string>;
    getWebviewPreloadPath(): Promise<string>;
    getReleaseNotes(): Promise<string>;
    getVersion(): Promise<string>;
  };
  zeebUpdate: {
    onUpdateAvailable(callback: (data: {
      version: string;
      releaseNotes: string;
      releaseUrl: string;
      assets: Array<{ name: string; url: string; size: number }>;
    }) => void): () => void;
    downloadUpdate(assetUrl: string): Promise<void>;
    onDownloadProgress(callback: (progress: { percent: number; bytesDownloaded: number; totalBytes: number }) => void): () => void;
    onDownloadComplete(callback: (data: { filePath: string }) => void): () => void;
    onDownloadError(callback: (data: { message: string }) => void): () => void;
    showInFolder(filePath: string): Promise<void>;
    openExternal(url: string): Promise<void>;
  };
  zeebImdb: {
    suggest(query: string): Promise<import('../types').MovieMatch[]>;
  };
  zeebMenu: {
    onOptions(callback: () => void): void;
    onUndoRename(callback: () => void): void;
    onToggleWebView(callback: () => void): void;
    onReleaseNotes(callback: () => void): void;
    onOpenFolder(callback: () => void): void;
    onAbout(callback: () => void): void;
    sendWebViewState(visible: boolean): void;
    onWindowStateChanged(callback: (state: Partial<{ windowWidth: number; windowHeight: number; windowMaximized: boolean }>) => void): () => void;
  };
}
