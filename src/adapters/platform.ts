import type { MovieMatch } from '../types';

interface UpdateData {
  version: string;
  releaseNotes: string;
  releaseUrl: string;
  assets: Array<{ name: string; url: string; size: number }>;
}

interface DownloadProgress { percent: number; bytesDownloaded: number; totalBytes: number; }
interface DownloadComplete { filePath: string; }
interface DownloadError { message: string; }

export interface MenuAdapter {
  onOptions(cb: () => void): void;
  onUndoRename(cb: () => void): void;
  onToggleWebView(cb: () => void): void;
  onReleaseNotes(cb: () => void): void;
  onOpenFolder(cb: () => void): void;
  onAbout(cb: () => void): void;
  sendWebViewState(visible: boolean): void;
}

export interface AppMetaAdapter {
  getPath(name: string): Promise<string>;
  getWebviewPreloadPath(): Promise<string>;
  getReleaseNotes(): Promise<string>;
  getVersion(): Promise<string>;
}

export interface UpdateAdapter {
  onUpdateAvailable(cb: (data: UpdateData) => void): () => void;
  downloadUpdate(assetUrl: string): Promise<void>;
  onDownloadProgress(cb: (p: DownloadProgress) => void): () => void;
  onDownloadComplete(cb: (d: DownloadComplete) => void): () => void;
  onDownloadError(cb: (d: DownloadError) => void): () => void;
  showInFolder(path: string): Promise<void>;
  openExternal(url: string): Promise<void>;
}

export interface ImdbAdapter {
  suggest(query: string): Promise<MovieMatch[]>;
}

export interface DialogAdapter {
  openDirectory(): Promise<string | null>;
  openFile(): Promise<string | null>;
}

export interface PlatformAdapter {
  menu: MenuAdapter;
  appMeta: AppMetaAdapter;
  update: UpdateAdapter;
  imdb: ImdbAdapter;
  dialog: DialogAdapter;
}

export function createElectronPlatformAdapter(): PlatformAdapter {
  return {
    menu: {
      onOptions: (cb) => window.zeebMenu.onOptions(cb),
      onUndoRename: (cb) => window.zeebMenu.onUndoRename(cb),
      onToggleWebView: (cb) => window.zeebMenu.onToggleWebView(cb),
      onReleaseNotes: (cb) => window.zeebMenu.onReleaseNotes(cb),
      onOpenFolder: (cb) => window.zeebMenu.onOpenFolder(cb),
      onAbout: (cb) => window.zeebMenu.onAbout(cb),
      sendWebViewState: (visible) => window.zeebMenu.sendWebViewState(visible),
    },
    appMeta: {
      getPath: (name) => window.zeebApp.getPath(name),
      getWebviewPreloadPath: () => window.zeebApp.getWebviewPreloadPath(),
      getReleaseNotes: () => window.zeebApp.getReleaseNotes(),
      getVersion: () => window.zeebApp.getVersion(),
    },
    update: {
      onUpdateAvailable: (cb) => window.zeebUpdate.onUpdateAvailable(cb),
      downloadUpdate: (url) => window.zeebUpdate.downloadUpdate(url),
      onDownloadProgress: (cb) => window.zeebUpdate.onDownloadProgress(cb),
      onDownloadComplete: (cb) => window.zeebUpdate.onDownloadComplete(cb),
      onDownloadError: (cb) => window.zeebUpdate.onDownloadError(cb),
      showInFolder: (path) => window.zeebUpdate.showInFolder(path),
      openExternal: (url) => window.zeebUpdate.openExternal(url),
    },
    imdb: {
      suggest: (q) => window.zeebImdb.suggest(q),
    },
    dialog: {
      openDirectory: () => window.zeebDialog.openDirectory(),
      openFile: () => window.zeebDialog.openFile(),
    },
  };
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export function createMockPlatformAdapter(overrides: DeepPartial<PlatformAdapter> = {}): PlatformAdapter {
  const defaults: PlatformAdapter = {
    menu: {
      onOptions: () => {},
      onUndoRename: () => {},
      onToggleWebView: () => {},
      onReleaseNotes: () => {},
      onOpenFolder: () => {},
      onAbout: () => {},
      sendWebViewState: () => {},
    },
    appMeta: {
      getPath: async () => '/mock',
      getWebviewPreloadPath: async () => '',
      getReleaseNotes: async () => '',
      getVersion: async () => '0.0.0',
    },
    update: {
      onUpdateAvailable: () => () => {},
      downloadUpdate: async () => {},
      onDownloadProgress: () => () => {},
      onDownloadComplete: () => () => {},
      onDownloadError: () => () => {},
      showInFolder: async () => {},
      openExternal: async () => {},
    },
    imdb: {
      suggest: async () => [],
    },
    dialog: {
      openDirectory: async () => null,
      openFile: async () => null,
    },
  };

  return {
    menu: { ...defaults.menu, ...(overrides.menu ?? {}) },
    appMeta: { ...defaults.appMeta, ...(overrides.appMeta ?? {}) },
    update: { ...defaults.update, ...(overrides.update ?? {}) },
    imdb: { ...defaults.imdb, ...(overrides.imdb ?? {}) },
    dialog: { ...defaults.dialog, ...(overrides.dialog ?? {}) },
  };
}
