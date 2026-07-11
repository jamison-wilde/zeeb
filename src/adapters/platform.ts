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
  onSetTheme(cb: (theme: 'dark' | 'light' | 'system') => void): void;
  sendThemeState(theme: string): void;
  onZoomIn(cb: () => void): void;
  onZoomOut(cb: () => void): void;
  onZoomReset(cb: () => void): void;
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

export interface ThemeAdapter {
  getSystemIsDark(): Promise<boolean>;
  onSystemThemeChanged(cb: (isDark: boolean) => void): () => void;
}

export interface UiAdapter {
  setZoomFactor(factor: number): void;
}

export interface PlatformAdapter {
  menu: MenuAdapter;
  appMeta: AppMetaAdapter;
  update: UpdateAdapter;
  imdb: ImdbAdapter;
  dialog: DialogAdapter;
  theme: ThemeAdapter;
  ui: UiAdapter;
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
      onSetTheme: (cb) => window.zeebMenu.onSetTheme(cb),
      sendThemeState: (theme) => window.zeebMenu.sendThemeState(theme),
      onZoomIn: (cb) => window.zeebMenu.onZoomIn(cb),
      onZoomOut: (cb) => window.zeebMenu.onZoomOut(cb),
      onZoomReset: (cb) => window.zeebMenu.onZoomReset(cb),
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
    theme: {
      getSystemIsDark: () => window.zeebTheme.getSystemIsDark(),
      onSystemThemeChanged: (cb) => window.zeebTheme.onSystemThemeChanged(cb),
    },
    ui: {
      setZoomFactor: (factor) => window.zeebUi.setZoomFactor(factor),
    },
  };
}

// Functions are leaf values (an override replaces the whole function), so pass
// them through unchanged — recursing into them produces uncallable types.
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

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
      onSetTheme: () => {},
      sendThemeState: () => {},
      onZoomIn: () => {},
      onZoomOut: () => {},
      onZoomReset: () => {},
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
    theme: {
      getSystemIsDark: async () => true,
      onSystemThemeChanged: () => () => {},
    },
    ui: {
      setZoomFactor: () => {},
    },
  };

  return {
    menu: { ...defaults.menu, ...(overrides.menu ?? {}) },
    appMeta: { ...defaults.appMeta, ...(overrides.appMeta ?? {}) },
    update: { ...defaults.update, ...(overrides.update ?? {}) },
    imdb: { ...defaults.imdb, ...(overrides.imdb ?? {}) },
    dialog: { ...defaults.dialog, ...(overrides.dialog ?? {}) },
    theme: { ...defaults.theme, ...(overrides.theme ?? {}) },
    ui: { ...defaults.ui, ...(overrides.ui ?? {}) },
  };
}
