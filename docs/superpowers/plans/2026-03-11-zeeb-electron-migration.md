# Zeeb Electron Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Zeeb from React Native Windows to Electron, preserving all business logic and porting UI to HTML+Tailwind.

**Architecture:** Electron three-layer model (main/preload/renderer). Services and stores keep their interfaces; RNFS-dependent files get an `fs` adapter injected via preload's contextBridge. Components rewritten from RN primitives to HTML+Tailwind. WebView extraction uses Electron's `<webview>` tag with a dedicated webview preload script.

**Tech Stack:** Electron 35+, electron-forge with Vite plugin, React 19, Tailwind CSS 4, Zustand 5, Vitest

**Spec:** `docs/superpowers/specs/2026-03-11-zeeb-electron-migration-design.md`

---

## File Structure

### New files to create

```
forge.config.ts                    # electron-forge configuration
vite.main.config.ts                # Vite config for main process
vite.preload.config.ts             # Vite config for preload scripts
vite.renderer.config.ts            # Vite config for renderer + Tailwind
vitest.config.ts                   # Vitest test config
src/types/electron.d.ts            # Type declarations for webview tag and preload APIs
src/main/index.ts                  # Electron main process entry
src/main/ipc.ts                    # IPC handler registration
src/preload/index.ts               # Main window preload (fs/dialog APIs)
src/preload/webview.ts             # Webview preload (sendToHost only)
src/renderer/index.html            # HTML shell for renderer
src/renderer/index.tsx             # React DOM entry point
src/renderer/index.css             # Tailwind directives
src/adapters/fs.ts                 # Filesystem adapter interface + Electron impl
```

### Files to modify (not rewrite)

```
src/services/imdbExtractor.ts      # Replace ReactNativeWebView.postMessage → sendToHost
src/stores/configStore.ts          # Replace RNFS → fs adapter
src/stores/undoStore.ts            # Replace RNFS → fs adapter
src/services/fileScanner.ts        # Replace RNFS → fs adapter
src/services/fileRenamer.ts        # Replace RNFS → fs adapter
src/services/logger.ts             # Replace RNFS → fs adapter
src/utils/platform.ts              # Replace Platform.OS → process.platform
```

### Files to rewrite (RN → HTML+Tailwind)

```
src/renderer/App.tsx               # New renderer App (from src/App.tsx)
src/renderer/components/FolderBrowser.tsx
src/renderer/components/Renamer.tsx
src/renderer/components/FileList.tsx
src/renderer/components/SearchParts.tsx
src/renderer/components/SearchPartItem.tsx
src/renderer/components/MovieResults.tsx
src/renderer/components/RenamePreview.tsx
src/renderer/components/PosterPreview.tsx
src/renderer/components/NfoViewer.tsx
src/renderer/components/OptionsModal.tsx
src/renderer/components/UndoModal.tsx
src/renderer/components/ReleaseNotes.tsx
```

### Files to delete

```
windows/                           # Entire RN Windows directory
metro.config.js
babel.config.js
jest.config.js
jest.config.windows.js
src/App.tsx                        # Replaced by src/renderer/App.tsx
src/components/                    # Replaced by src/renderer/components/
```

### Files unchanged

```
src/types/index.ts
src/services/filenameParser.ts
src/services/formatEngine.ts
src/services/nfoParser.ts
src/services/tmdbService.ts
src/services/urlFileWriter.ts
src/services/legacyImporter.ts
src/services/configDefaults.ts
src/stores/fileStore.ts
src/stores/renamerStore.ts
src/utils/defaultTerms.ts
src/utils/cp437.ts
```

---

## Chunk 1: Project Scaffold & Electron Infrastructure

### Task 1: Initialize electron-forge with Vite

**Files:**
- Create: `forge.config.ts`
- Create: `vite.main.config.ts`
- Create: `vite.preload.config.ts`
- Create: `vite.renderer.config.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: Install Electron and electron-forge dependencies**

```bash
npm install --save-dev electron @electron-forge/cli @electron-forge/maker-squirrel @electron-forge/maker-dmg @electron-forge/maker-zip @electron-forge/plugin-vite vite
```

- [ ] **Step 2: Remove React Native dependencies**

```bash
npm uninstall react-native react-native-fs react-native-webview react-native-windows react-native-macos react-native-safe-area-context @react-native/new-app-screen @react-native/babel-preset @react-native/eslint-config @react-native/metro-config @react-native/typescript-config @react-native-community/cli @react-native-community/cli-platform-android @react-native-community/cli-platform-ios @rnx-kit/jest-preset @testing-library/react-native react-test-renderer @types/react-test-renderer @babel/core @babel/preset-env @babel/runtime metro-config ts-jest @types/jest
```

- [ ] **Step 3: Install renderer and test dependencies**

```bash
npm install react-dom
npm install --save-dev @types/react-dom @vitejs/plugin-react @testing-library/react @testing-library/jest-dom vitest jsdom tailwindcss @tailwindcss/vite
```

- [ ] **Step 4: Write forge.config.ts**

```ts
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
  },
  makers: [
    new MakerSquirrel({}),
    new MakerDMG({}),
    new MakerZIP({}, ['darwin']),
  ],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main/index.ts', config: 'vite.main.config.ts', target: 'main' },
        { entry: 'src/preload/index.ts', config: 'vite.preload.config.ts', target: 'preload', name: 'main_preload' },
        { entry: 'src/preload/webview.ts', config: 'vite.preload.config.ts', target: 'preload', name: 'webview_preload' },
      ],
      renderer: [
        { name: 'main_window', config: 'vite.renderer.config.ts' },
      ],
    }),
  ],
};

export default config;
```

- [ ] **Step 5: Write vite.main.config.ts**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
    },
  },
});
```

- [ ] **Step 6: Write vite.preload.config.ts**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
    },
  },
});
```

- [ ] **Step 7: Write vite.renderer.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 8: Update package.json**

Replace `"scripts"` section and set top-level `"main"` field. Also remove the `"react-native-windows"` top-level key.

```json
{
  "main": ".vite/build/main.js",
  "scripts": {
    "start": "electron-forge start",
    "package": "electron-forge package",
    "make": "electron-forge make",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint ."
  }
}
```

- [ ] **Step 9: Update tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "__tests__/**/*.ts", "__tests__/**/*.tsx", "*.config.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 10: Write src/types/electron.d.ts**

Type declarations for Electron's webview tag and the preload-exposed APIs:

```ts
// Electron webview tag type for React refs
interface WebviewTag extends HTMLElement {
  loadURL(url: string): void;
  executeJavaScript(code: string): Promise<unknown>;
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
  };
  zeebApp: {
    getPath(name: string): Promise<string>;
  };
  zeebIpc: {
    sendToHost(data: string): void;
  };
  WEBVIEW_PRELOAD_PATH: string;
}
```

- [ ] **Step 11: Write vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['@testing-library/jest-dom/vitest'],
  },
});
```

- [ ] **Step 12: Commit scaffold**

```bash
git add forge.config.ts vite.main.config.ts vite.preload.config.ts vite.renderer.config.ts vitest.config.ts package.json package-lock.json tsconfig.json src/types/electron.d.ts
git commit -m "chore: scaffold electron-forge with Vite plugin and Vitest"
```

---

### Task 2: Electron main process

**Files:**
- Create: `src/main/index.ts`
- Create: `src/main/ipc.ts`

- [ ] **Step 1: Write the failing test for IPC handlers**

Create `__tests__/main/ipc.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  rename: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  appendFile: vi.fn(),
  unlink: vi.fn(),
  access: vi.fn(),
}));

import { ipcMain } from 'electron';
import { registerIpcHandlers } from '../../src/main/ipc';

describe('IPC handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers all expected IPC channels', () => {
    registerIpcHandlers();
    const handleMock = ipcMain.handle as ReturnType<typeof vi.fn>;
    const channels = handleMock.mock.calls.map((c: unknown[]) => c[0]);
    expect(channels).toContain('fs:readdir');
    expect(channels).toContain('fs:readFile');
    expect(channels).toContain('fs:writeFile');
    expect(channels).toContain('fs:appendFile');
    expect(channels).toContain('fs:rename');
    expect(channels).toContain('fs:unlink');
    expect(channels).toContain('fs:exists');
    expect(channels).toContain('dialog:openDirectory');
    expect(channels).toContain('app:getPath');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/main/ipc.test.ts
```

Expected: FAIL — module `../../src/main/ipc` not found.

- [ ] **Step 3: Write src/main/ipc.ts**

```ts
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

  ipcMain.handle('app:getPath', (_event, name: string) => {
    return app.getPath(name as Parameters<typeof app.getPath>[0]);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/main/ipc.test.ts
```

Expected: PASS

- [ ] **Step 5: Write src/main/index.ts**

```ts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { registerIpcHandlers } from './ipc';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'main_preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

- [ ] **Step 6: Commit**

```bash
git add src/main/ __tests__/main/
git commit -m "feat: add Electron main process with IPC handlers for fs and dialog"
```

---

### Task 3: Preload scripts

**Files:**
- Create: `src/preload/index.ts`
- Create: `src/preload/webview.ts`

- [ ] **Step 1: Write the failing test for preload API shape**

Create `__tests__/preload/preload.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    sendToHost: vi.fn(),
  },
}));

vi.mock('node:path', () => ({
  default: { join: (...args: string[]) => args.join('/') },
  join: (...args: string[]) => args.join('/'),
}));

describe('main preload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exposes zeebFs and zeebDialog APIs', async () => {
    await import('../../src/preload/index');
    const { contextBridge: cb } = await import('electron');
    const exposeMock = cb.exposeInMainWorld as ReturnType<typeof vi.fn>;
    const keys = exposeMock.mock.calls.map((c: unknown[]) => c[0]);
    expect(keys).toContain('zeebFs');
    expect(keys).toContain('zeebDialog');
    expect(keys).toContain('zeebApp');
    expect(keys).toContain('WEBVIEW_PRELOAD_PATH');
  });
});

describe('webview preload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exposes sendToHost API', async () => {
    await import('../../src/preload/webview');
    const { contextBridge: cb } = await import('electron');
    const exposeMock = cb.exposeInMainWorld as ReturnType<typeof vi.fn>;
    const keys = exposeMock.mock.calls.map((c: unknown[]) => c[0]);
    expect(keys).toContain('zeebIpc');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/preload/preload.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Write src/preload/index.ts**

```ts
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
```

- [ ] **Step 4: Write src/preload/webview.ts**

```ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('zeebIpc', {
  sendToHost: (data: string) => ipcRenderer.sendToHost('webview-message', data),
});
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run __tests__/preload/preload.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/preload/ __tests__/preload/
git commit -m "feat: add preload scripts for main window and webview guest"
```

---

### Task 4: Filesystem adapter

**Files:**
- Create: `src/adapters/fs.ts`

- [ ] **Step 1: Write the failing test for fs adapter**

Create `__tests__/adapters/fs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { FsAdapter, DirEntry } from '../../src/adapters/fs';
import { createMockFsAdapter } from '../../src/adapters/fs';

describe('FsAdapter interface', () => {
  it('createMockFsAdapter returns an object implementing the interface', () => {
    const adapter = createMockFsAdapter();
    expect(typeof adapter.readdir).toBe('function');
    expect(typeof adapter.readFile).toBe('function');
    expect(typeof adapter.writeFile).toBe('function');
    expect(typeof adapter.appendFile).toBe('function');
    expect(typeof adapter.rename).toBe('function');
    expect(typeof adapter.unlink).toBe('function');
    expect(typeof adapter.exists).toBe('function');
    expect(typeof adapter.getConfigDir).toBe('function');
  });

  it('mock readdir returns empty array by default', async () => {
    const adapter = createMockFsAdapter();
    const result = await adapter.readdir('/any');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/adapters/fs.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write src/adapters/fs.ts**

```ts
export interface DirEntry {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
  size?: number;
}

export interface FsAdapter {
  readdir(dirPath: string): Promise<DirEntry[]>;
  readFile(filePath: string, encoding: string): Promise<string>;
  writeFile(filePath: string, data: string, encoding: string): Promise<void>;
  appendFile(filePath: string, data: string, encoding: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  unlink(filePath: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  getConfigDir(): Promise<string>;
}

/**
 * Creates an FsAdapter backed by the preload-exposed zeebFs API.
 * Call this in the renderer process.
 */
export function createElectronFsAdapter(): FsAdapter {
  const zeebFs = (window as any).zeebFs;
  const zeebApp = (window as any).zeebApp;

  return {
    readdir: (dirPath) => zeebFs.readdir(dirPath),
    readFile: (filePath, encoding) => zeebFs.readFile(filePath, encoding),
    writeFile: (filePath, data, encoding) => zeebFs.writeFile(filePath, data, encoding),
    appendFile: (filePath, data, encoding) => zeebFs.appendFile(filePath, data, encoding),
    rename: (oldPath, newPath) => zeebFs.rename(oldPath, newPath),
    unlink: (filePath) => zeebFs.unlink(filePath),
    exists: (filePath) => zeebFs.exists(filePath),
    getConfigDir: () => zeebApp.getPath('userData'),
  };
}

/**
 * Creates a mock FsAdapter for testing.
 */
export function createMockFsAdapter(overrides?: Partial<FsAdapter>): FsAdapter {
  return {
    readdir: async () => [],
    readFile: async () => '',
    writeFile: async () => {},
    appendFile: async () => {},
    rename: async () => {},
    unlink: async () => {},
    exists: async () => false,
    getConfigDir: async () => '/mock/config',
    ...overrides,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/adapters/fs.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapters/ __tests__/adapters/
git commit -m "feat: add filesystem adapter interface with Electron and mock implementations"
```

---

## Chunk 2: Service & Store Migration

### Task 5: Migrate platform.ts

**Files:**
- Modify: `src/utils/platform.ts`

- [ ] **Step 1: Update the existing platform test**

Open `__tests__/utils/platform.test.ts`. Update test expectations to use `process.platform` instead of `Platform.OS`. The tests should verify `isWindows()` returns `true` when `process.platform === 'win32'`, and `isMacOS()` returns `true` when `process.platform === 'darwin'`.

Replace the test file content:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('platform utils', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isWindows returns true on win32', async () => {
    vi.stubGlobal('process', { ...process, platform: 'win32' });
    const { isWindows } = await import('../../src/utils/platform');
    expect(isWindows()).toBe(true);
  });

  it('isMacOS returns true on darwin', async () => {
    vi.stubGlobal('process', { ...process, platform: 'darwin' });
    const { isMacOS } = await import('../../src/utils/platform');
    expect(isMacOS()).toBe(true);
  });

  it('urlShortcutExtension returns .webloc on macOS', async () => {
    vi.stubGlobal('process', { ...process, platform: 'darwin' });
    const { urlShortcutExtension } = await import('../../src/utils/platform');
    expect(urlShortcutExtension()).toBe('.webloc');
  });

  it('urlShortcutExtension returns .url on Windows', async () => {
    vi.stubGlobal('process', { ...process, platform: 'win32' });
    const { urlShortcutExtension } = await import('../../src/utils/platform');
    expect(urlShortcutExtension()).toBe('.url');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/utils/platform.test.ts
```

Expected: FAIL — `Platform` from `react-native` not available.

- [ ] **Step 3: Update src/utils/platform.ts**

```ts
export const isWindows = (): boolean => process.platform === 'win32';
export const isMacOS = (): boolean => process.platform === 'darwin';
export const urlShortcutExtension = (): string => isMacOS() ? '.webloc' : '.url';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/utils/platform.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/platform.ts __tests__/utils/platform.test.ts
git commit -m "refactor: replace Platform.OS with process.platform"
```

---

### Task 6: Migrate imdbExtractor.ts

**Files:**
- Modify: `src/services/imdbExtractor.ts`

- [ ] **Step 1: Update imdbExtractor test**

Open `__tests__/services/imdbExtractor.test.ts`.

1. Find any existing assertions checking for `ReactNativeWebView.postMessage` and change them to check for `zeebIpc.sendToHost` instead.
2. Replace `jest` API calls with `vitest`: `jest.fn()` → `vi.fn()`, add `import { describe, it, expect, vi } from 'vitest'`.
3. Add these two new assertions:

```ts
it('search extraction script uses zeebIpc.sendToHost', () => {
  const script = generateSearchExtractionScript();
  expect(script).toContain('window.zeebIpc.sendToHost');
  expect(script).not.toContain('ReactNativeWebView');
});

it('title extraction script uses zeebIpc.sendToHost', () => {
  const script = generateTitleExtractionScript([]);
  expect(script).toContain('window.zeebIpc.sendToHost');
  expect(script).not.toContain('ReactNativeWebView');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/services/imdbExtractor.test.ts
```

Expected: FAIL — scripts still contain `ReactNativeWebView`.

- [ ] **Step 3: Update src/services/imdbExtractor.ts**

Replace all 4 occurrences of `window.ReactNativeWebView.postMessage` with `window.zeebIpc.sendToHost`:

Line 35: `window.ReactNativeWebView.postMessage(JSON.stringify({` → `window.zeebIpc.sendToHost(JSON.stringify({`
Line 40: `window.ReactNativeWebView.postMessage(JSON.stringify({` → `window.zeebIpc.sendToHost(JSON.stringify({`
Line 130: `window.ReactNativeWebView.postMessage(JSON.stringify({` → `window.zeebIpc.sendToHost(JSON.stringify({`
Line 135: `window.ReactNativeWebView.postMessage(JSON.stringify({` → `window.zeebIpc.sendToHost(JSON.stringify({`

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/services/imdbExtractor.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/imdbExtractor.ts __tests__/services/imdbExtractor.test.ts
git commit -m "refactor: replace ReactNativeWebView.postMessage with zeebIpc.sendToHost"
```

---

### Task 7: Migrate fileScanner.ts

**Files:**
- Modify: `src/services/fileScanner.ts`

- [ ] **Step 1: Rewrite fileScanner test to use fs adapter**

Replace the entire contents of `__tests__/services/fileScanner.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanDirectory } from '../../src/services/fileScanner';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { FsAdapter, DirEntry } from '../../src/adapters/fs';

const mkEntry = (name: string, path: string, isFile: boolean, size = 0): DirEntry => ({
  name, path, isFile, isDirectory: !isFile, size,
});

const mockFiles: DirEntry[] = [
  mkEntry('Movie.mkv', '/movies/Movie.mkv', true, 1000),
  mkEntry('Movie.srt', '/movies/Movie.srt', true, 100),
  mkEntry('Movie.nfo', '/movies/Movie.nfo', true, 50),
  mkEntry('subfolder', '/movies/subfolder', false),
  mkEntry('random.txt', '/movies/random.txt', true, 10),
];

describe('fileScanner', () => {
  let fs: FsAdapter;

  beforeEach(() => {
    fs = createMockFsAdapter({
      readdir: vi.fn().mockResolvedValue(mockFiles),
      exists: vi.fn().mockResolvedValue(false),
    });
  });

  it('returns only movie files matching extensions', async () => {
    const files = await scanDirectory(fs, '/movies', ['mkv', 'avi'], 'none');
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('Movie.mkv');
  });

  it('detects associated NFO files', async () => {
    (fs.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const files = await scanDirectory(fs, '/movies', ['mkv'], 'none');
    expect(files[0].hasNfo).toBe(true);
  });

  it('detects DVD folders by VIDEO_TS.IFO presence', async () => {
    const dvdFiles: DirEntry[] = [
      mkEntry('MyMovie', '/movies/MyMovie', false),
    ];
    const dvdContents: DirEntry[] = [
      mkEntry('VIDEO_TS.IFO', '/movies/MyMovie/VIDEO_TS.IFO', true, 500),
    ];
    (fs.readdir as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(dvdFiles)
      .mockResolvedValueOnce(dvdContents);
    const files = await scanDirectory(fs, '/movies', ['mkv'], 'none');
    expect(files[0].isDvdFolder).toBe(true);
  });

  it('recurses into subfolders when mode is subfolders', async () => {
    const subFiles: DirEntry[] = [
      mkEntry('Sub.mkv', '/movies/subfolder/Sub.mkv', true, 2000),
    ];
    (fs.readdir as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockFiles)
      .mockResolvedValueOnce(subFiles);
    const files = await scanDirectory(fs, '/movies', ['mkv'], 'subfolders');
    expect(files).toHaveLength(2);
  });
});
```

Note: `DirEntry.isFile` and `isDirectory` are **boolean properties**, not methods. The old test used `isFile: () => true` (methods); the new `DirEntry` interface uses `isFile: true` (booleans).

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/services/fileScanner.test.ts
```

Expected: FAIL — signature mismatch.

- [ ] **Step 3: Update src/services/fileScanner.ts**

Replace `import RNFS from 'react-native-fs'` with `import type { FsAdapter, DirEntry } from '../adapters/fs'`.

Change all functions to accept `fs: FsAdapter` as first parameter:

```ts
import type { FsAdapter, DirEntry } from '../adapters/fs';
import { MovieFile } from '../types';

type RecursionMode = 'none' | 'subfolders' | 'full';

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `file_${Date.now()}_${idCounter}`;
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : '';
}

function getBaseName(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.substring(0, dot) : filename;
}

function getFolder(filepath: string): string {
  const sep = filepath.lastIndexOf('/');
  return sep >= 0 ? filepath.substring(0, sep) : '';
}

async function isDvdOrBluray(fs: FsAdapter, dirPath: string): Promise<boolean> {
  try {
    const contents = await fs.readdir(dirPath);
    return contents.some(
      (item) =>
        item.isFile &&
        (item.name.toUpperCase() === 'VIDEO_TS.IFO' ||
          item.name.toUpperCase() === 'INDEX.BDMV'),
    );
  } catch {
    return false;
  }
}

async function checkAssociatedFile(
  fs: FsAdapter,
  dirPath: string,
  baseName: string,
  ext: string,
): Promise<string | null> {
  const candidate = `${dirPath}/${baseName}.${ext}`;
  const exists = await fs.exists(candidate);
  return exists ? candidate : null;
}

export async function scanDirectory(
  fs: FsAdapter,
  path: string,
  extensions: string[],
  recursionMode: RecursionMode,
): Promise<MovieFile[]> {
  const results: MovieFile[] = [];
  const entries = await fs.readdir(path);
  const extSet = new Set(extensions.map((e) => e.toLowerCase()));

  for (const entry of entries) {
    if (entry.isFile) {
      const ext = getExtension(entry.name);
      if (!extSet.has(ext)) continue;

      const baseName = getBaseName(entry.name);
      const folder = getFolder(entry.path);

      const nfoPath = await checkAssociatedFile(fs, folder, baseName, 'nfo');
      const urlPath = await checkAssociatedFile(fs, folder, baseName, 'url');
      const posterPath = await checkAssociatedFile(fs, folder, baseName, 'jpg');

      results.push({
        id: generateId(),
        name: entry.name,
        nativePath: entry.path,
        folder,
        extension: ext,
        size: entry.size ?? 0,
        isDvdFolder: false,
        hasNfo: nfoPath !== null,
        hasUrl: urlPath !== null,
        hasPoster: posterPath !== null,
        nfoPath,
        urlPath,
        posterPath,
      });
    } else if (entry.isDirectory) {
      const dvd = await isDvdOrBluray(fs, entry.path);
      if (dvd) {
        const baseName = entry.name;
        const folder = getFolder(entry.path);
        const nfoPath = await checkAssociatedFile(fs, folder, baseName, 'nfo');
        const urlPath = await checkAssociatedFile(fs, folder, baseName, 'url');
        const posterPath = await checkAssociatedFile(fs, folder, baseName, 'jpg');

        results.push({
          id: generateId(),
          name: entry.name,
          nativePath: entry.path,
          folder,
          extension: '',
          size: entry.size ?? 0,
          isDvdFolder: true,
          hasNfo: nfoPath !== null,
          hasUrl: urlPath !== null,
          hasPoster: posterPath !== null,
          nfoPath,
          urlPath,
          posterPath,
        });
      } else if (recursionMode === 'subfolders' || recursionMode === 'full') {
        const subResults = await scanDirectory(
          fs,
          entry.path,
          extensions,
          recursionMode === 'full' ? 'full' : 'none',
        );
        results.push(...subResults);
      }
    }
  }

  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/services/fileScanner.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/fileScanner.ts __tests__/services/fileScanner.test.ts
git commit -m "refactor: inject FsAdapter into fileScanner instead of importing RNFS"
```

---

### Task 8: Migrate fileRenamer.ts

**Files:**
- Modify: `src/services/fileRenamer.ts`

- [ ] **Step 1: Rewrite fileRenamer test to use fs adapter**

Replace the entire contents of `__tests__/services/fileRenamer.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renameFile, findSubtitles, renameSubtitles } from '../../src/services/fileRenamer';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { FsAdapter } from '../../src/adapters/fs';

describe('fileRenamer', () => {
  let fs: FsAdapter;

  beforeEach(() => {
    fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      readdir: vi.fn().mockResolvedValue([]),
    });
  });

  it('renames file and returns undo entry', async () => {
    const entry = await renameFile(fs, '/movies/old.mkv', '/movies/new.mkv');
    expect(fs.rename).toHaveBeenCalledWith('/movies/old.mkv', '/movies/new.mkv');
    expect(entry.type).toBe('rename');
    expect(entry.sourcePath).toBe('/movies/old.mkv');
    expect(entry.destPath).toBe('/movies/new.mkv');
  });

  it('finds subtitle files matching movie name', async () => {
    (fs.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'Movie.srt', path: '/movies/Movie.srt', isFile: true, isDirectory: false },
      { name: 'Movie.en.srt', path: '/movies/Movie.en.srt', isFile: true, isDirectory: false },
      { name: 'Other.srt', path: '/movies/Other.srt', isFile: true, isDirectory: false },
    ]);
    const subs = await findSubtitles(fs, '/movies', 'Movie', ['srt', 'sub']);
    expect(subs).toHaveLength(2);
  });

  it('renames subtitles to match new movie name', async () => {
    const entries = await renameSubtitles(
      fs,
      ['/movies/Movie.srt', '/movies/Movie.en.srt'],
      'Movie',
      'New Movie (2024)',
    );
    expect(entries).toHaveLength(2);
    expect(fs.rename).toHaveBeenCalledWith('/movies/Movie.srt', '/movies/New Movie (2024).srt');
    expect(fs.rename).toHaveBeenCalledWith('/movies/Movie.en.srt', '/movies/New Movie (2024).en.srt');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/services/fileRenamer.test.ts
```

- [ ] **Step 3: Update src/services/fileRenamer.ts**

```ts
import type { FsAdapter } from '../adapters/fs';
import type { UndoEntry } from '../types';

export async function renameFile(fs: FsAdapter, src: string, dest: string): Promise<UndoEntry> {
  await fs.rename(src, dest);
  return {
    type: 'rename',
    sourcePath: src,
    destPath: dest,
  };
}

export async function findSubtitles(
  fs: FsAdapter,
  folder: string,
  baseName: string,
  extensions: string[],
): Promise<string[]> {
  const items = await fs.readdir(folder);
  const extSet = new Set(extensions.map(e => e.toLowerCase()));

  return items
    .filter(item => {
      if (!item.isFile) return false;
      const name = item.name;
      if (!name.startsWith(baseName)) return false;
      const suffix = name.substring(baseName.length);
      if (!suffix.startsWith('.')) return false;
      const lastDot = suffix.lastIndexOf('.');
      const ext = suffix.substring(lastDot + 1).toLowerCase();
      return extSet.has(ext);
    })
    .map(item => item.path);
}

export async function renameSubtitles(
  fs: FsAdapter,
  paths: string[],
  oldBase: string,
  newBase: string,
): Promise<UndoEntry[]> {
  const entries: UndoEntry[] = [];

  for (const filePath of paths) {
    const dirSep = filePath.lastIndexOf('/');
    const dir = dirSep >= 0 ? filePath.substring(0, dirSep) : '';
    const fileName = dirSep >= 0 ? filePath.substring(dirSep + 1) : filePath;

    const newFileName = fileName.replace(oldBase, newBase);
    const newPath = dir ? `${dir}/${newFileName}` : newFileName;

    await fs.rename(filePath, newPath);
    entries.push({
      type: 'rename',
      sourcePath: filePath,
      destPath: newPath,
    });
  }

  return entries;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/services/fileRenamer.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/services/fileRenamer.ts __tests__/services/fileRenamer.test.ts
git commit -m "refactor: inject FsAdapter into fileRenamer instead of importing RNFS"
```

---

### Task 9: Migrate logger.ts

**Files:**
- Modify: `src/services/logger.ts`

- [ ] **Step 1: Rewrite logger test to use fs adapter**

Replace the entire contents of `__tests__/services/logger.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from '../../src/services/logger';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { FsAdapter } from '../../src/adapters/fs';

describe('logger', () => {
  let fs: FsAdapter;

  beforeEach(() => {
    fs = createMockFsAdapter({
      appendFile: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('appends timestamped entry to log file', async () => {
    const logger = createLogger(fs, '/mock/zeeb.log');
    await logger.log('rename', '/old.mkv', '/new.mkv');
    expect(fs.appendFile).toHaveBeenCalledWith(
      '/mock/zeeb.log',
      expect.stringMatching(/\d{4}-\d{2}-\d{2}.*rename.*\/old\.mkv.*\/new\.mkv/),
      'utf8',
    );
  });

  it('logs different operation types', async () => {
    const logger = createLogger(fs, '/mock/zeeb.log');
    await logger.log('poster', '/movie.jpg', null);
    expect(fs.appendFile).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/services/logger.test.ts
```

- [ ] **Step 3: Update src/services/logger.ts**

```ts
import type { FsAdapter } from '../adapters/fs';

export interface Logger {
  log(type: string, source: string, dest: string | null): Promise<void>;
}

export function createLogger(fs: FsAdapter, filePath: string): Logger {
  return {
    async log(type: string, source: string, dest: string | null): Promise<void> {
      const timestamp = new Date().toISOString();
      const destStr = dest ?? '';
      const line = `${timestamp} [${type}] ${source} -> ${destStr}\n`;
      await fs.appendFile(filePath, line, 'utf8');
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/services/logger.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/services/logger.ts __tests__/services/logger.test.ts
git commit -m "refactor: inject FsAdapter into logger instead of importing RNFS"
```

---

### Task 10: Migrate configStore.ts

**Files:**
- Modify: `src/stores/configStore.ts`

- [ ] **Step 1: Rewrite configStore test to use fs adapter**

Replace the entire contents of `__tests__/stores/configStore.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConfigStore, DEFAULT_CONFIG } from '../../src/stores/configStore';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { FsAdapter } from '../../src/adapters/fs';

describe('configStore', () => {
  let fs: FsAdapter;

  beforeEach(() => {
    fs = createMockFsAdapter({
      exists: vi.fn().mockResolvedValue(false),
      readFile: vi.fn().mockResolvedValue(''),
      writeFile: vi.fn().mockResolvedValue(undefined),
      getConfigDir: vi.fn().mockResolvedValue('/mock/docs'),
    });
  });

  it('initializes with defaults when no config file exists', async () => {
    const store = createConfigStore(fs);
    await store.getState().load();
    expect(store.getState().config.formatStandard).toBe(DEFAULT_CONFIG.formatStandard);
  });

  it('loads config from JSON file', async () => {
    const saved = { ...DEFAULT_CONFIG, removeThe: true };
    (fs.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(saved));
    const store = createConfigStore(fs);
    await store.getState().load();
    expect(store.getState().config.removeThe).toBe(true);
  });

  it('saves config to JSON file', async () => {
    const store = createConfigStore(fs);
    await store.getState().load();
    store.getState().updateConfig({ removeThe: true });
    await store.getState().save();
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('zeeb-config.json'),
      expect.stringContaining('"removeThe": true'),
      'utf8',
    );
  });

  it('merges partial updates without losing other fields', async () => {
    const store = createConfigStore(fs);
    await store.getState().load();
    const original = store.getState().config.formatStandard;
    store.getState().updateConfig({ removeThe: true });
    expect(store.getState().config.formatStandard).toBe(original);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/stores/configStore.test.ts
```

- [ ] **Step 3: Update src/stores/configStore.ts**

```ts
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { FsAdapter } from '../adapters/fs';
import type { ZeebConfig } from '../types';
import { DEFAULT_CONFIG } from '../services/configDefaults';

export { DEFAULT_CONFIG };

const CONFIG_FILENAME = 'zeeb-config.json';

interface ConfigStoreState {
  config: ZeebConfig;
  load: () => Promise<void>;
  save: () => Promise<void>;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function createConfigStore(fs: FsAdapter): StoreApi<ConfigStoreState> {
  let configPath: string | null = null;

  async function getConfigPath(): Promise<string> {
    if (!configPath) {
      const dir = await fs.getConfigDir();
      configPath = `${dir}/${CONFIG_FILENAME}`;
    }
    return configPath;
  }

  return createStore<ConfigStoreState>((set, get) => ({
    config: { ...DEFAULT_CONFIG },

    async load() {
      const path = await getConfigPath();
      const fileExists = await fs.exists(path);
      if (fileExists) {
        const json = await fs.readFile(path, 'utf8');
        try {
          const saved = JSON.parse(json) as Partial<ZeebConfig>;
          set({ config: { ...DEFAULT_CONFIG, ...saved } });
        } catch {
          set({ config: { ...DEFAULT_CONFIG } });
        }
      } else {
        set({ config: { ...DEFAULT_CONFIG } });
      }
    },

    async save() {
      const path = await getConfigPath();
      const json = JSON.stringify(get().config, null, 2);
      await fs.writeFile(path, json, 'utf8');
    },

    updateConfig(partial: Partial<ZeebConfig>) {
      set((state) => ({ config: { ...state.config, ...partial } }));
    },
  }));
}

// Default store is created lazily in the renderer when fs adapter is available
let defaultStore: StoreApi<ConfigStoreState> | null = null;

export function initConfigStore(fs: FsAdapter): void {
  defaultStore = createConfigStore(fs);
}

export function getConfigStore(): StoreApi<ConfigStoreState> {
  if (!defaultStore) throw new Error('Config store not initialized. Call initConfigStore(fs) first.');
  return defaultStore;
}

export function useConfigStore(): ConfigStoreState;
export function useConfigStore<T>(selector: (state: ConfigStoreState) => T): T;
export function useConfigStore<T>(selector?: (state: ConfigStoreState) => T) {
  return useStore(getConfigStore(), selector as (state: ConfigStoreState) => T);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/stores/configStore.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/configStore.ts __tests__/stores/configStore.test.ts
git commit -m "refactor: inject FsAdapter into configStore instead of importing RNFS"
```

---

### Task 11: Migrate undoStore.ts

**Files:**
- Modify: `src/stores/undoStore.ts`

- [ ] **Step 1: Rewrite undoStore test to use fs adapter**

Replace the entire contents of `__tests__/stores/undoStore.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUndoStore } from '../../src/stores/undoStore';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { FsAdapter } from '../../src/adapters/fs';

describe('undoStore', () => {
  let fs: FsAdapter;

  beforeEach(() => {
    fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('begins and commits a transaction', () => {
    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().commitTransaction();
    expect(store.getState().transactions).toHaveLength(1);
    expect(store.getState().transactions[0].entries).toHaveLength(1);
  });

  it('discards uncommitted transaction', () => {
    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().discardTransaction();
    expect(store.getState().transactions).toHaveLength(0);
  });

  it('undoes a transaction by reversing renames', async () => {
    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().commitTransaction();

    await store.getState().undoTransaction(store.getState().transactions[0].id);
    expect(fs.rename).toHaveBeenCalledWith('/new.mkv', '/old.mkv');
    expect(store.getState().transactions).toHaveLength(0);
  });

  it('undoes entries in reverse order', async () => {
    const callOrder: string[] = [];
    (fs.rename as ReturnType<typeof vi.fn>).mockImplementation((from: string) => {
      callOrder.push(from);
      return Promise.resolve();
    });

    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/a.mkv', destPath: '/b.mkv' });
    store.getState().addEntry({ type: 'rename', sourcePath: '/c.mkv', destPath: '/d.mkv' });
    store.getState().commitTransaction();

    await store.getState().undoTransaction(store.getState().transactions[0].id);
    expect(callOrder).toEqual(['/d.mkv', '/b.mkv']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/stores/undoStore.test.ts
```

- [ ] **Step 3: Update src/stores/undoStore.ts**

```ts
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { FsAdapter } from '../adapters/fs';
import type { UndoEntry, RenameTransaction } from '../types';

interface UndoStoreState {
  transactions: RenameTransaction[];
  pendingTransaction: { entries: UndoEntry[] } | null;
  beginTransaction: () => void;
  addEntry: (entry: UndoEntry) => void;
  commitTransaction: () => void;
  discardTransaction: () => void;
  undoTransaction: (id: string) => Promise<void>;
}

export function createUndoStore(fs: FsAdapter): StoreApi<UndoStoreState> {
  return createStore<UndoStoreState>((set, get) => ({
    transactions: [],
    pendingTransaction: null,

    beginTransaction() {
      set({ pendingTransaction: { entries: [] } });
    },

    addEntry(entry: UndoEntry) {
      const pending = get().pendingTransaction;
      if (!pending) return;
      set({
        pendingTransaction: {
          entries: [...pending.entries, entry],
        },
      });
    },

    commitTransaction() {
      const pending = get().pendingTransaction;
      if (!pending) return;
      const transaction: RenameTransaction = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        timestamp: Date.now(),
        entries: pending.entries,
      };
      set((state) => ({
        transactions: [...state.transactions, transaction],
        pendingTransaction: null,
      }));
    },

    discardTransaction() {
      set({ pendingTransaction: null });
    },

    async undoTransaction(id: string) {
      const transaction = get().transactions.find((t) => t.id === id);
      if (!transaction) return;

      const errors: Array<{ entry: UndoEntry; error: unknown }> = [];
      const reversed = [...transaction.entries].reverse();
      for (const entry of reversed) {
        try {
          switch (entry.type) {
            case 'rename':
              if (entry.destPath) {
                await fs.rename(entry.destPath, entry.sourcePath);
              }
              break;
            case 'create':
              if (entry.destPath) {
                await fs.unlink(entry.destPath);
              }
              break;
            case 'delete':
              break;
          }
        } catch (error) {
          errors.push({ entry, error });
        }
      }

      if (errors.length === 0) {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
      }
      if (errors.length > 0) {
        throw new Error(
          `Undo partially failed: ${errors.length}/${reversed.length} entries failed`,
        );
      }
    },
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/stores/undoStore.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/undoStore.ts __tests__/stores/undoStore.test.ts
git commit -m "refactor: inject FsAdapter into undoStore instead of importing RNFS"
```

---

### Task 12: Run all service/store/util tests

- [ ] **Step 1: Run the full non-component test suite**

```bash
npx vitest run __tests__/services/ __tests__/stores/ __tests__/utils/ __tests__/types.test.ts
```

Expected: All pass. Fix any failures before proceeding.

- [ ] **Step 2: Commit any remaining fixes**

```bash
git add src/ __tests__/
git commit -m "fix: resolve remaining test failures after RNFS migration"
```

---

## Chunk 3: Renderer & Component Migration

### Task 13: Renderer entry point and Tailwind setup

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/index.tsx`
- Create: `src/renderer/index.css`

- [ ] **Step 1: Write src/renderer/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Zeeb</title>
  </head>
  <body class="bg-white text-gray-900 m-0 h-screen overflow-hidden">
    <div id="root" class="h-full"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Write src/renderer/index.css**

```css
@import "tailwindcss";
```

- [ ] **Step 3: Write src/renderer/index.tsx**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createElectronFsAdapter } from '../adapters/fs';
import { initConfigStore } from '../stores/configStore';
import App from './App';
import './index.css';

const fs = createElectronFsAdapter();
initConfigStore(fs);

const root = createRoot(document.getElementById('root')!);
root.render(<App fs={fs} />);
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/index.html src/renderer/index.tsx src/renderer/index.css
git commit -m "feat: add renderer entry point with Tailwind CSS and React DOM"
```

---

### Task 14: Port App.tsx

**Files:**
- Create: `src/renderer/App.tsx`

- [ ] **Step 1: Write the App test**

Create `__tests__/renderer/App.test.tsx`. Verify the App renders a folder browser by default, toolbar buttons, and switches to renamer view on folder selection.

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/renderer/App';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { initConfigStore } from '../../src/stores/configStore';

const mockFs = createMockFsAdapter();

describe('App', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
  });

  it('renders toolbar with Options and Undo buttons', () => {
    render(<App fs={mockFs} />);
    expect(screen.getByText('Options')).toBeDefined();
    expect(screen.getByText('Undo')).toBeDefined();
  });

  it('shows folder browser by default', () => {
    render(<App fs={mockFs} />);
    expect(screen.getByPlaceholderText('Enter folder path...')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/renderer/App.test.tsx
```

- [ ] **Step 3: Write src/renderer/App.tsx**

```tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import type { FsAdapter } from '../adapters/fs';
import { Renamer } from './components/Renamer';
import { FolderBrowser } from './components/FolderBrowser';
import { OptionsModal } from './components/OptionsModal';
import { UndoModal } from './components/UndoModal';
import { ReleaseNotes } from './components/ReleaseNotes';
import { useConfigStore } from '../stores/configStore';
import { createFileStore } from '../stores/fileStore';
import { createUndoStore } from '../stores/undoStore';
import { scanDirectory } from '../services/fileScanner';

type ViewName = 'folderBrowser' | 'process';

interface AppProps {
  fs: FsAdapter;
}

function App({ fs }: AppProps): React.JSX.Element {
  const [view, setView] = useState<ViewName>('folderBrowser');
  const [activeRenamer, setActiveRenamer] = useState<0 | 1>(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);

  const fileStoreRef = useRef(createFileStore());
  const undoStoreRef = useRef(createUndoStore(fs));

  const files = useStore(fileStoreRef.current, (s) => s.files);
  const setFiles = useStore(fileStoreRef.current, (s) => s.setFiles);

  const transactions = useStore(undoStoreRef.current, (s) => s.transactions);
  const undoTransaction = useStore(undoStoreRef.current, (s) => s.undoTransaction);

  const config = useConfigStore((s) => s.config);
  const load = useConfigStore((s) => s.load);
  const save = useConfigStore((s) => s.save);

  useEffect(() => {
    void load();
  }, [load]);

  const recentFolders = useMemo(() => config.recentFolders, [config.recentFolders]);

  const handleFolderSelected = useCallback(
    async (path: string, recursionMode: string) => {
      const results = await scanDirectory(
        fs,
        path,
        config.movieExtensions,
        recursionMode as 'none' | 'subfolders' | 'full',
      );
      setFiles(results);
      setView('process');
    },
    [fs, config.movieExtensions, setFiles],
  );

  const swapRenamer = useCallback(() => {
    setActiveRenamer((prev) => (prev === 0 ? 1 : 0) as 0 | 1);
  }, []);

  const handleOptionsClose = useCallback(() => {
    setShowOptions(false);
    void save();
  }, [save]);

  const handleUndo = useCallback(
    (id: string) => {
      void undoTransaction(id);
    },
    [undoTransaction],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-row p-2 bg-gray-100 gap-3">
        <button
          data-testid="options-button"
          className="px-3 py-2 hover:bg-gray-200 rounded"
          onClick={() => setShowOptions(true)}
        >
          Options
        </button>
        <button
          data-testid="undo-button"
          className="px-3 py-2 hover:bg-gray-200 rounded"
          onClick={() => setShowUndo(true)}
        >
          Undo
        </button>
        <button
          data-testid="release-notes-button"
          className="px-3 py-2 hover:bg-gray-200 rounded"
          onClick={() => setShowReleaseNotes(true)}
        >
          Release Notes
        </button>
        {view === 'folderBrowser' && (
          <button
            data-testid="start-processing"
            className="px-3 py-2 hover:bg-gray-200 rounded"
            onClick={() => setView('process')}
          >
            Start Processing
          </button>
        )}
      </div>

      {view === 'folderBrowser' && (
        <div data-testid="folder-browser" className="flex-1">
          <FolderBrowser
            onFolderSelected={handleFolderSelected}
            recentFolders={recentFolders}
          />
        </div>
      )}

      {view === 'process' && (
        <div data-testid="renamer-view" className="flex-1 flex flex-col">
          <div data-testid="renamer-0">
            <Renamer
              instanceId={0}
              visible={activeRenamer === 0}
              files={files}
              fs={fs}
              undoStore={undoStoreRef.current}
              onComplete={swapRenamer}
            />
          </div>
          <div data-testid="renamer-1">
            <Renamer
              instanceId={1}
              visible={activeRenamer === 1}
              files={files}
              fs={fs}
              undoStore={undoStoreRef.current}
              onComplete={swapRenamer}
            />
          </div>
        </div>
      )}

      <OptionsModal visible={showOptions} onClose={handleOptionsClose} />
      <UndoModal
        visible={showUndo}
        onClose={() => setShowUndo(false)}
        transactions={transactions}
        onUndo={handleUndo}
      />
      <ReleaseNotes
        visible={showReleaseNotes}
        onClose={() => setShowReleaseNotes(false)}
      />
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/renderer/App.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/App.tsx __tests__/renderer/
git commit -m "feat: port App component to HTML+Tailwind for Electron renderer"
```

---

### Task 15: Port simple components (FolderBrowser, FileList, SearchParts, SearchPartItem, MovieResults, RenamePreview)

**Files:**
- Create: `src/renderer/components/FolderBrowser.tsx`
- Create: `src/renderer/components/FileList.tsx`
- Create: `src/renderer/components/SearchParts.tsx`
- Create: `src/renderer/components/SearchPartItem.tsx`
- Create: `src/renderer/components/MovieResults.tsx`
- Create: `src/renderer/components/RenamePreview.tsx`

Each component follows the same pattern: replace RN imports with HTML elements and Tailwind classes. Props stay identical.

- [ ] **Step 1: Write FolderBrowser.tsx**

```tsx
import React, { useState } from 'react';

interface FolderBrowserProps {
  onFolderSelected: (path: string, recursionMode: string) => void;
  recentFolders: string[];
}

type RecursionMode = 'none' | 'subfolders' | 'full';

const RECURSION_OPTIONS: { label: string; value: RecursionMode }[] = [
  { label: 'None', value: 'none' },
  { label: 'Subfolders', value: 'subfolders' },
  { label: 'Full', value: 'full' },
];

export function FolderBrowser({ onFolderSelected, recentFolders }: FolderBrowserProps): React.JSX.Element {
  const [folderPath, setFolderPath] = useState('');
  const [recursionMode, setRecursionMode] = useState<RecursionMode>('none');

  const handleBrowse = async (): Promise<void> => {
    const zeebDialog = (window as any).zeebDialog;
    if (zeebDialog) {
      const path = await zeebDialog.openDirectory();
      if (path) setFolderPath(path);
    }
  };

  return (
    <div className="flex-1 p-4">
      <div className="flex gap-2 mb-3">
        <input
          data-testid="folder-path-input"
          className="flex-1 border border-gray-300 rounded px-2 py-1.5"
          value={folderPath}
          onChange={(e) => setFolderPath(e.target.value)}
          placeholder="Enter folder path..."
        />
        <button
          data-testid="browse-button"
          className="px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300"
          onClick={handleBrowse}
        >
          Browse...
        </button>
      </div>

      <div data-testid="recent-folders" className="flex gap-2 mb-3 overflow-x-auto max-h-10">
        {recentFolders.map((folder, index) => (
          <button
            key={index}
            className="px-2 py-1 bg-gray-200 rounded whitespace-nowrap text-sm"
            onClick={() => setFolderPath(folder)}
          >
            {folder}
          </button>
        ))}
      </div>

      <div data-testid="recursion-mode" className="flex gap-2 mb-3">
        {RECURSION_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`px-2 py-1 border rounded ${
              recursionMode === option.value
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300'
            }`}
            onClick={() => setRecursionMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button
        data-testid="list-movies-button"
        className="w-full bg-blue-500 text-white py-2.5 rounded hover:bg-blue-600"
        onClick={() => onFolderSelected(folderPath, recursionMode)}
      >
        List Movies
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write FileList.tsx**

```tsx
import React from 'react';
import type { MovieFile } from '../../types';

interface FileListProps {
  files: MovieFile[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function FileList({ files, selectedIndex, onSelect }: FileListProps): React.JSX.Element {
  return (
    <div data-testid="file-list" className="overflow-y-auto max-h-48">
      {files.map((file, index) => (
        <button
          key={file.id}
          className={`w-full text-left px-3 py-2.5 border-b border-gray-200 flex items-center ${
            index === selectedIndex ? 'bg-blue-100' : 'hover:bg-gray-50'
          }`}
          onClick={() => onSelect(index)}
        >
          <span className="flex-1">{file.name}</span>
          {file.hasNfo && (
            <span className="text-xs text-blue-500 font-bold ml-2">NFO</span>
          )}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write SearchPartItem.tsx**

```tsx
import React from 'react';
import type { SearchPart, SearchPartState } from '../../types';

interface SearchPartItemProps {
  part: SearchPart;
  onStateChange: (id: string, state: SearchPartState) => void;
  onTextChange: (id: string, text: string) => void;
}

const STATE_COLORS: Record<SearchPartState, string> = {
  search: 'border-blue-500 text-blue-500',
  keep: 'border-green-500 text-green-500',
  remove: 'border-red-500 text-red-500',
  keepAlways: 'border-green-800 text-green-800',
  removeAlways: 'border-red-900 text-red-900',
};

const NEXT_STATE: Record<SearchPartState, SearchPartState> = {
  search: 'keep',
  keep: 'remove',
  remove: 'search',
  keepAlways: 'removeAlways',
  removeAlways: 'keepAlways',
};

export function SearchPartItem({ part, onStateChange }: SearchPartItemProps): React.JSX.Element {
  return (
    <button
      className={`px-2 py-1 mr-1 border rounded text-sm ${STATE_COLORS[part.state]}`}
      onClick={() => onStateChange(part.id, NEXT_STATE[part.state])}
    >
      {part.text}
    </button>
  );
}
```

- [ ] **Step 4: Write SearchParts.tsx**

```tsx
import React from 'react';
import type { SearchPart, SearchPartState } from '../../types';
import { SearchPartItem } from './SearchPartItem';

interface SearchPartsProps {
  parts: SearchPart[];
  onPartStateChange: (id: string, state: SearchPartState) => void;
  onPartTextChange: (id: string, text: string) => void;
  onSearch: () => void;
}

export function SearchParts({
  parts,
  onPartStateChange,
  onPartTextChange,
  onSearch,
}: SearchPartsProps): React.JSX.Element {
  return (
    <div className="p-2">
      <div data-testid="search-parts-row" className="flex overflow-x-auto mb-2">
        {parts.map((part) => (
          <SearchPartItem
            key={part.id}
            part={part}
            onStateChange={onPartStateChange}
            onTextChange={onPartTextChange}
          />
        ))}
      </div>
      <button
        data-testid="search-button"
        className="w-full bg-blue-500 text-white py-2 rounded font-bold hover:bg-blue-600"
        onClick={onSearch}
      >
        Search
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Write MovieResults.tsx**

```tsx
import React from 'react';
import type { MovieMatch } from '../../types';

interface MovieResultsProps {
  matches: MovieMatch[];
  onSelect: (tt: string) => void;
}

export function MovieResults({ matches, onSelect }: MovieResultsProps): React.JSX.Element {
  if (matches.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">No results</div>
    );
  }

  return (
    <div data-testid="movie-results-list" className="overflow-y-auto max-h-48">
      {matches.map((item) => (
        <button
          key={item.tt}
          className="w-full text-left px-3 py-2.5 border-b border-gray-200 hover:bg-gray-50"
          onClick={() => onSelect(item.tt)}
        >
          {item.title} ({item.year})
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Write RenamePreview.tsx**

```tsx
import React from 'react';

interface RenamePreviewProps {
  originalName: string;
  previewName: string;
  onRename: () => void;
  onSkip: () => void;
}

export function RenamePreview({
  originalName,
  previewName,
  onRename,
  onSkip,
}: RenamePreviewProps): React.JSX.Element {
  const renameDisabled = previewName.length === 0;

  return (
    <div data-testid="rename-preview" className="p-3">
      <p className="text-xs text-gray-500 mb-0.5">Original:</p>
      <p className="text-sm mb-2">{originalName}</p>
      <p className="text-center text-lg my-1">&rarr;</p>
      <p className="text-xs text-gray-500 mb-0.5">New:</p>
      <p className="text-sm mb-2">{previewName}</p>
      <div className="flex gap-2 mt-2">
        <button
          data-testid="rename-button"
          className={`flex-1 py-2 rounded text-white font-bold ${
            renameDisabled ? 'bg-blue-500/50 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
          }`}
          onClick={onRename}
          disabled={renameDisabled}
        >
          Rename
        </button>
        <button
          data-testid="skip-button"
          className="flex-1 py-2 rounded bg-gray-400 text-white font-bold hover:bg-gray-500"
          onClick={onSkip}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/FolderBrowser.tsx src/renderer/components/FileList.tsx src/renderer/components/SearchPartItem.tsx src/renderer/components/SearchParts.tsx src/renderer/components/MovieResults.tsx src/renderer/components/RenamePreview.tsx
git commit -m "feat: port FolderBrowser, FileList, SearchParts, MovieResults, RenamePreview to HTML+Tailwind"
```

---

### Task 16: Port modal components (OptionsModal, UndoModal, NfoViewer, PosterPreview, ReleaseNotes)

**Files:**
- Create: `src/renderer/components/OptionsModal.tsx`
- Create: `src/renderer/components/UndoModal.tsx`
- Create: `src/renderer/components/NfoViewer.tsx`
- Create: `src/renderer/components/PosterPreview.tsx`
- Create: `src/renderer/components/ReleaseNotes.tsx`

- [ ] **Step 1: Write OptionsModal.tsx**

```tsx
import React, { useCallback } from 'react';
import { useConfigStore } from '../../stores/configStore';

interface OptionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OptionsModal({ visible, onClose }: OptionsModalProps): React.JSX.Element | null {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);

  const handleChange = useCallback(
    (field: string, value: string) => {
      updateConfig({ [field]: value });
    },
    [updateConfig],
  );

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" data-testid="options-modal">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold">Options</h2>
        <button data-testid="close-options" className="text-blue-500" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-bold mt-4 mb-2 text-gray-700">Format Strings</h3>
        <input
          data-testid="format-standard-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="Standard format"
          value={config.formatStandard}
          onChange={(e) => handleChange('formatStandard', e.target.value)}
        />
        <input
          data-testid="format-aka-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="AKA format"
          value={config.formatAka}
          onChange={(e) => handleChange('formatAka', e.target.value)}
        />
        <input
          data-testid="format-dvd-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="DVD format"
          value={config.formatDvd}
          onChange={(e) => handleChange('formatDvd', e.target.value)}
        />

        <h3 className="text-sm font-bold mt-4 mb-2 text-gray-700">Remove Terms</h3>
        <input
          data-testid="remove-terms-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="Terms to remove"
          value={config.removeTerms.join(', ')}
          onChange={(e) =>
            updateConfig({ removeTerms: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })
          }
        />

        <h3 className="text-sm font-bold mt-4 mb-2 text-gray-700">Keep Terms</h3>
        <input
          data-testid="keep-terms-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="Terms to keep"
          value={config.keepTerms.join(', ')}
          onChange={(e) =>
            updateConfig({ keepTerms: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })
          }
        />

        <h3 className="text-sm font-bold mt-4 mb-2 text-gray-700">Separators</h3>
        <input
          data-testid="director-separator-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="Director separator"
          value={config.directorSeparator}
          onChange={(e) => handleChange('directorSeparator', e.target.value)}
        />
        <input
          data-testid="genre-separator-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="Genre separator"
          value={config.genreSeparator}
          onChange={(e) => handleChange('genreSeparator', e.target.value)}
        />
        <input
          data-testid="star-separator-input"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2"
          placeholder="Star separator"
          value={config.starSeparator}
          onChange={(e) => handleChange('starSeparator', e.target.value)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write UndoModal.tsx**

```tsx
import React from 'react';
import type { RenameTransaction } from '../../types';

interface UndoModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: RenameTransaction[];
  onUndo: (id: string) => void;
}

export function UndoModal({ visible, onClose, transactions, onUndo }: UndoModalProps): React.JSX.Element | null {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold">Undo History</h2>
        <button data-testid="close-undo" className="text-blue-500" onClick={onClose}>
          Close
        </button>
      </div>
      {transactions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 text-gray-500">
          No undo history
        </div>
      ) : (
        <div data-testid="undo-list" className="flex-1 overflow-y-auto">
          {transactions.map((item) => (
            <div key={item.id} className="flex items-center px-3 py-2.5 border-b border-gray-200">
              <div className="flex-1">
                <p className="text-sm">{new Date(item.timestamp).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.entries.length} {item.entries.length === 1 ? 'file' : 'files'}
                </p>
              </div>
              <button
                data-testid={`undo-button-${item.id}`}
                className="px-4 py-1.5 bg-red-500 text-white rounded font-bold text-sm hover:bg-red-600"
                onClick={() => onUndo(item.id)}
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write NfoViewer.tsx**

```tsx
import React from 'react';

interface NfoViewerProps {
  visible: boolean;
  content: string;
  onClose: () => void;
}

export function NfoViewer({ visible, content, onClose }: NfoViewerProps): React.JSX.Element | null {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white">NFO Viewer</h2>
        <button data-testid="close-nfo" className="text-blue-400" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="font-mono text-xs text-green-400 leading-4 whitespace-pre">
          {content}
        </pre>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write PosterPreview.tsx**

```tsx
import React from 'react';

interface PosterPreviewProps {
  posterUrl: string | null;
  onSelect: () => void;
}

export function PosterPreview({ posterUrl, onSelect }: PosterPreviewProps): React.JSX.Element {
  return (
    <button className="flex items-center justify-center p-2" onClick={onSelect}>
      {posterUrl ? (
        <img
          data-testid="poster-image"
          src={posterUrl}
          className="w-[150px] h-[225px] rounded object-contain"
          alt="Movie poster"
        />
      ) : (
        <div
          data-testid="poster-placeholder"
          className="w-[150px] h-[225px] rounded bg-gray-200 flex items-center justify-center"
        >
          <span className="text-gray-400">No Poster</span>
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 5: Write ReleaseNotes.tsx**

```tsx
import React from 'react';

interface ReleaseNotesProps {
  visible: boolean;
  onClose: () => void;
}

const RELEASE_NOTES = `Zeeb - Electron Rewrite

v3.0.0
- Migrated from React Native to Electron
- Built-in Chromium WebView for IMDB extraction
- Windows and macOS desktop support
- Tailwind CSS UI
- Dual renamer with swap logic for faster processing
- Improved IMDB extraction with configurable patterns
- Full undo support with transaction history
- Legacy config import from XML
`;

export function ReleaseNotes({ visible, onClose }: ReleaseNotesProps): React.JSX.Element | null {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-4/5 max-h-[70%] bg-white rounded-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">Release Notes</h2>
          <button data-testid="release-notes-close" className="text-blue-500" onClick={onClose}>
            Close
          </button>
        </div>
        <div data-testid="release-notes-content" className="flex-1 overflow-y-auto p-4">
          <p className="text-sm leading-relaxed whitespace-pre-line">{RELEASE_NOTES}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/OptionsModal.tsx src/renderer/components/UndoModal.tsx src/renderer/components/NfoViewer.tsx src/renderer/components/PosterPreview.tsx src/renderer/components/ReleaseNotes.tsx
git commit -m "feat: port OptionsModal, UndoModal, NfoViewer, PosterPreview, ReleaseNotes to HTML+Tailwind"
```

---

### Task 17: Port Renamer component (WebView integration)

**Files:**
- Create: `src/renderer/components/Renamer.tsx`

This is the most complex component. It replaces `react-native-webview` with Electron's `<webview>` tag.

- [ ] **Step 1: Write the Renamer test**

Create `__tests__/renderer/Renamer.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Renamer } from '../../src/renderer/components/Renamer';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { initConfigStore } from '../../src/stores/configStore';
import type { MovieFile } from '../../src/types';

const mockFs = createMockFsAdapter();

const testFile: MovieFile = {
  id: 'test1',
  name: 'The.Matrix.1999.mkv',
  nativePath: '/movies/The.Matrix.1999.mkv',
  folder: '/movies',
  extension: 'mkv',
  size: 1000,
  isDvdFolder: false,
  hasNfo: false,
  hasUrl: false,
  hasPoster: false,
  nfoPath: null,
  urlPath: null,
  posterPath: null,
};

describe('Renamer', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <Renamer instanceId={0} visible={false} files={[testFile]} fs={mockFs} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders file list and search parts when visible', () => {
    render(
      <Renamer instanceId={0} visible={true} files={[testFile]} fs={mockFs} />,
    );
    expect(screen.getByTestId('file-list')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/renderer/Renamer.test.tsx
```

- [ ] **Step 3: Write src/renderer/components/Renamer.tsx**

```tsx
import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';
import type { FsAdapter } from '../../adapters/fs';
import { FileList } from './FileList';
import { SearchParts } from './SearchParts';
import { MovieResults } from './MovieResults';
import { RenamePreview } from './RenamePreview';
import { createRenamerStore } from '../../stores/renamerStore';
import { useConfigStore } from '../../stores/configStore';
import type { MovieFile, SearchPartState, UndoEntry } from '../../types';
import { parseFilename } from '../../services/filenameParser';
import {
  buildSearchUrl,
  buildTitleUrl,
  generateSearchExtractionScript,
  generateTitleExtractionScript,
  parseSearchResults,
  parseTitleData,
} from '../../services/imdbExtractor';
import { interpolateFormat } from '../../services/formatEngine';
import { renameFile, findSubtitles, renameSubtitles } from '../../services/fileRenamer';
import { createLogger } from '../../services/logger';

interface RenamerProps {
  instanceId: number;
  visible: boolean;
  files?: MovieFile[];
  fs: FsAdapter;
  undoStore?: StoreApi<{
    beginTransaction: () => void;
    addEntry: (entry: UndoEntry) => void;
    commitTransaction: () => void;
  }>;
  onComplete?: () => void;
}

export function Renamer({ instanceId, visible, files = [], fs, undoStore, onComplete }: RenamerProps): React.JSX.Element | null {
  const storeRef = useRef(createRenamerStore());
  const webviewRef = useRef<WebviewTag | null>(null);

  const currentIndex = useStore(storeRef.current, (s) => s.currentIndex);
  const searchParts = useStore(storeRef.current, (s) => s.searchParts);
  const movieMatches = useStore(storeRef.current, (s) => s.movieMatches);
  const metadata = useStore(storeRef.current, (s) => s.metadata);
  const previewFilename = useStore(storeRef.current, (s) => s.previewFilename);
  const setCurrentIndex = useStore(storeRef.current, (s) => s.setCurrentIndex);
  const setSearchParts = useStore(storeRef.current, (s) => s.setSearchParts);
  const updatePartState = useStore(storeRef.current, (s) => s.updatePartState);
  const updatePartText = useStore(storeRef.current, (s) => s.updatePartText);
  const setMovieMatches = useStore(storeRef.current, (s) => s.setMovieMatches);
  const setMetadata = useStore(storeRef.current, (s) => s.setMetadata);
  const setPreviewFilename = useStore(storeRef.current, (s) => s.setPreviewFilename);
  const reset = useStore(storeRef.current, (s) => s.reset);

  const config = useConfigStore((s) => s.config);

  const currentFile = useMemo(() => files[currentIndex] ?? null, [files, currentIndex]);

  const navigationMode = useRef<'search' | 'title' | 'idle'>('idle');

  // When file changes, parse filename into search parts
  useEffect(() => {
    if (!currentFile) return;
    const parts = parseFilename(currentFile.name, config.removeTerms, config.keepTerms);
    setSearchParts(parts);
    setMovieMatches([]);
    setMetadata(null);
    setPreviewFilename('');
  }, [currentFile, config.removeTerms, config.keepTerms, setSearchParts, setMovieMatches, setMetadata, setPreviewFilename]);

  // When metadata changes, compute preview filename
  useEffect(() => {
    if (!metadata || !currentFile) {
      setPreviewFilename('');
      return;
    }
    const format = currentFile.isDvdFolder
      ? config.formatDvd
      : metadata.aka.length > 0
        ? config.formatAka
        : config.formatStandard;
    const ext = currentFile.isDvdFolder ? '' : `.${currentFile.extension}`;
    const saved = currentFile.extension;
    const formatted = interpolateFormat(format, metadata, {
      saved,
      directorSeparator: config.directorSeparator,
      genreSeparator: config.genreSeparator,
      starSeparator: config.starSeparator,
      removeThe: config.removeThe,
      swapThe: config.swapThe,
      titleSpaceChar: config.titleSpaceChar,
    });
    setPreviewFilename(formatted + ext);
  }, [metadata, currentFile, config, setPreviewFilename]);

  // Set up webview IPC message listener
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleMessage = (event: any) => {
      const message = event.args?.[0];
      if (!message) return;

      const results = parseSearchResults(message);
      if (results.length > 0) {
        setMovieMatches(results);
        return;
      }
      const titleData = parseTitleData(message);
      if (titleData) {
        setMetadata(titleData);
      }
    };

    const handleLoadEnd = () => {
      if (navigationMode.current === 'search') {
        const script = generateSearchExtractionScript();
        webview.executeJavaScript(script);
      } else if (navigationMode.current === 'title') {
        const script = generateTitleExtractionScript(config.extractionPatterns);
        webview.executeJavaScript(script);
      }
    };

    webview.addEventListener('ipc-message', handleMessage);
    webview.addEventListener('did-finish-load', handleLoadEnd);

    return () => {
      webview.removeEventListener('ipc-message', handleMessage);
      webview.removeEventListener('did-finish-load', handleLoadEnd);
    };
  }, [config.extractionPatterns, setMovieMatches, setMetadata]);

  const handleFileSelect = useCallback(
    (index: number) => {
      reset();
      setCurrentIndex(index);
    },
    [reset, setCurrentIndex],
  );

  const handlePartStateChange = useCallback(
    (id: string, state: SearchPartState) => {
      updatePartState(id, state);
    },
    [updatePartState],
  );

  const handlePartTextChange = useCallback(
    (id: string, text: string) => {
      updatePartText(id, text);
    },
    [updatePartText],
  );

  const handleSearch = useCallback(() => {
    const query = searchParts
      .filter((p) => p.state === 'search' || p.state === 'keep' || p.state === 'keepAlways')
      .map((p) => p.text)
      .join(' ');
    if (!query.trim()) return;
    const url = buildSearchUrl(query, config.urlImdbSearch);
    navigationMode.current = 'search';
    webviewRef.current?.loadURL(url);
  }, [searchParts, config.urlImdbSearch]);

  const handleMovieSelect = useCallback(
    (tt: string) => {
      const url = buildTitleUrl(tt, config.urlImdbTT);
      navigationMode.current = 'title';
      webviewRef.current?.loadURL(url);
    },
    [config.urlImdbTT],
  );

  const advance = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < files.length) {
      reset();
      setCurrentIndex(nextIndex);
    }
    onComplete?.();
  }, [currentIndex, files.length, reset, setCurrentIndex, onComplete]);

  const handleRename = useCallback(async () => {
    if (!currentFile || !previewFilename) return;

    undoStore?.getState().beginTransaction();

    try {
      const newPath = `${currentFile.folder}/${previewFilename}`;
      const entry = await renameFile(fs, currentFile.nativePath, newPath);
      undoStore?.getState().addEntry(entry);

      const baseName = currentFile.name.replace(/\.[^.]+$/, '');
      const newBase = previewFilename.replace(/\.[^.]+$/, '');
      const subs = await findSubtitles(fs, currentFile.folder, baseName, config.subtitleExtensions);
      if (subs.length > 0) {
        const subEntries = await renameSubtitles(fs, subs, baseName, newBase);
        for (const subEntry of subEntries) {
          undoStore?.getState().addEntry(subEntry);
        }
      }

      undoStore?.getState().commitTransaction();

      if (config.logFilePath) {
        const logger = createLogger(fs, config.logFilePath);
        await logger.log('rename', currentFile.nativePath, newPath);
      }
    } catch {
      // Transaction stays pending for inspection
    }

    advance();
  }, [currentFile, previewFilename, fs, undoStore, config.subtitleExtensions, config.logFilePath, advance]);

  const handleSkip = useCallback(() => {
    advance();
  }, [advance]);

  if (!visible) return null;

  return (
    <div className="flex-1 flex flex-col">
      <FileList
        files={files}
        selectedIndex={currentIndex}
        onSelect={handleFileSelect}
      />
      <div data-testid="search-parts">
        <SearchParts
          parts={searchParts}
          onPartStateChange={handlePartStateChange}
          onPartTextChange={handlePartTextChange}
          onSearch={handleSearch}
        />
      </div>
      <div data-testid="movie-results">
        <MovieResults
          matches={movieMatches}
          onSelect={handleMovieSelect}
        />
      </div>
      <RenamePreview
        originalName={currentFile?.name ?? ''}
        previewName={previewFilename}
        onRename={handleRename}
        onSkip={handleSkip}
      />
      <webview
        ref={(el: any) => { webviewRef.current = el; }}
        data-testid="imdb-webview"
        src="about:blank"
        preload={window.WEBVIEW_PRELOAD_PATH ?? ''}
        className="flex-1"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/renderer/Renamer.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/Renamer.tsx __tests__/renderer/Renamer.test.tsx
git commit -m "feat: port Renamer component with Electron webview integration"
```

---

## Chunk 4: Cleanup, Tests & Verification

### Task 18: Update component tests for @testing-library/react

**Files:**
- Modify: `__tests__/components/*.test.tsx`
- Modify: `__tests__/App.test.tsx`
- Modify: `__tests__/integration/dualRenamer.test.tsx`

All component tests must change from `@testing-library/react-native` to `@testing-library/react`. Key changes:

- `import { render, screen, fireEvent } from '@testing-library/react'` instead of `@testing-library/react-native`
- `fireEvent.click()` instead of `fireEvent.press()`
- `fireEvent.change(input, { target: { value: '...' } })` instead of `fireEvent.changeText(input, '...')`
- `screen.getByTestId('x')` uses `data-testid` instead of `testID`
- Remove any `jest.mock('react-native')` or `jest.mock('react-native-webview')` calls
- Replace Jest API: `jest.fn()` → `vi.fn()`, `jest.mock()` → `vi.mock()`, `beforeEach(() => { jest.clearAllMocks() })` → `beforeEach(() => { vi.clearAllMocks() })`

- [ ] **Step 1: Update each component test file one by one**

Apply the import and API changes to every test in `__tests__/components/` and `__tests__/App.test.tsx`. Also update the integration test `__tests__/integration/dualRenamer.test.tsx`.

For each test:
1. Replace `@testing-library/react-native` → `@testing-library/react`
2. Replace `jest` global API → `vitest` imports
3. Replace `fireEvent.press` → `fireEvent.click`
4. Replace `fireEvent.changeText(el, val)` → `fireEvent.change(el, { target: { value: val } })`
5. Update component imports to point to `src/renderer/components/`
6. Add `initConfigStore(mockFs)` in `beforeEach` for tests that use config
7. Update mock paths (no more `react-native-fs`, `react-native-webview`)

- [ ] **Step 2: Run all component tests**

```bash
npx vitest run __tests__/components/ __tests__/renderer/
```

Fix failures iteratively.

- [ ] **Step 3: Commit**

```bash
git add __tests__/
git commit -m "refactor: migrate component tests from react-native to @testing-library/react"
```

---

### Task 19: Update service/store tests for Vitest

**Files:**
- Modify: `__tests__/services/*.test.ts`
- Modify: `__tests__/stores/*.test.ts`
- Modify: `__tests__/utils/*.test.ts`
- Modify: `__tests__/types.test.ts`
- Modify: `__tests__/integration/*.test.ts`

- [ ] **Step 1: Replace Jest globals with Vitest imports**

In every test file under `__tests__/`, add:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

Replace:
- `jest.fn()` → `vi.fn()`
- `jest.mock()` → `vi.mock()`
- `jest.spyOn()` → `vi.spyOn()`
- `jest.clearAllMocks()` → `vi.clearAllMocks()`
- `jest.resetModules()` → `vi.resetModules()`

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Fix all failures.

- [ ] **Step 3: Commit**

```bash
git add __tests__/
git commit -m "refactor: migrate all tests from Jest to Vitest"
```

---

### Task 20: Delete React Native files

**Irreversible: this deletes the old RN source and Windows build files. Everything is in git history.**

**Files:**
- Delete: `src/App.tsx`
- Delete: `src/components/` (entire directory)
- Delete: `windows/` (entire directory)
- Delete: `metro.config.js`
- Delete: `babel.config.js`
- Delete: `jest.config.js`
- Delete: `jest.config.windows.js`
- Delete: `Directory.Build.props`

- [ ] **Step 1: Remove old files**

```bash
rm -rf src/App.tsx src/components/ windows/ metro.config.js babel.config.js jest.config.js jest.config.windows.js Directory.Build.props
```

- [ ] **Step 2: Run full test suite to confirm nothing breaks**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

Stage the deleted tracked files and commit. (`Directory.Build.props` may be untracked — `git add` will handle either case.)

```bash
git add src/App.tsx src/components/ metro.config.js babel.config.js jest.config.js jest.config.windows.js Directory.Build.props windows/
git commit -m "chore: remove React Native source, Windows build files, and old configs"
```

---

### Task 21: Verify Electron app starts

- [ ] **Step 1: Run npm start**

```bash
npm start
```

Expected: Electron window opens showing the FolderBrowser with toolbar. No console errors. The webview won't navigate until a folder is selected and files processed, but the UI should render.

- [ ] **Step 2: Fix any startup errors**

Resolve import path issues, missing modules, or Vite config problems.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve Electron startup issues"
```

---

### Task 22: Final full test run

- [ ] **Step 1: Run the complete test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: fix lint errors after Electron migration"
```
