# Zeeb Electron Migration Design

## Context

The React Native Windows build is blocked by `react-native-webview` incompatibility with RNW 0.81.x (no Fabric support, no timeline from Microsoft). Migrating to Electron where WebView is built-in (Chromium).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| WebView approach | `<webview>` tag | 1:1 mapping to RN WebView; supports JS injection, IPC messaging, dual instances; keeps ToS compliance (renders full IMDB page with ads) |
| Build tooling | electron-forge + Vite plugin | Official Electron scaffolding; handles main/preload/renderer split; includes packaging for Windows + macOS |
| Styling | Tailwind CSS | Fastest to port from StyleSheet.create(); utility classes map to inline styles; no separate CSS files |
| Testing | Vitest | Shares Vite config; Jest-compatible API; better ESM support |
| RN Windows cleanup | Delete entirely | Code is in git history; branch won't stay relevant |

## Architecture

Electron's standard three-layer model:

- **Main process** — single Node.js process; app lifecycle, window creation, system APIs (file dialogs, menus)
- **Preload script** — security boundary; runs before renderer page loads; uses `contextBridge` to expose whitelisted Node.js APIs to the renderer
- **Renderer process** — Chromium window running React + Tailwind UI with embedded `<webview>` tags for IMDB

This is Electron's default architecture, not a design choice. Every Electron app (VS Code, Slack, Discord) uses the same model.

## What Stays Unchanged

- Services without RN imports (`filenameParser`, `formatEngine`, `nfoParser`, `tmdbService`, `legacyImporter`, `urlFileWriter`) — pure TS
- Stores without RN imports (`fileStore`, `renamerStore`) — Zustand vanilla stores
- All types (`src/types/*`)
- All utils except `platform.ts` (simplifies to `process.platform`)
- Default terms, CP437 table, config defaults
- Three-tier IMDB extraction strategy (JSON-LD → DOM selectors → regex)
- Dual-instance pattern (two Renamer instances at App level — one visible, one hidden for prefetch)
- 34 test files in `__tests__/`: service/store/util tests move as-is; component tests rewrite for `@testing-library/react`

## What Changes

### File I/O

`react-native-fs` → Node.js `fs/promises` exposed through preload script's `contextBridge`.

Files that import `react-native-fs`: `configStore`, `undoStore`, `fileScanner`, `fileRenamer`, `logger`. Each gets refactored to accept an `fs` adapter interface instead of importing RNFS directly. The adapter is injected from the renderer via the preload-exposed API.

### WebView

`react-native-webview` → Electron `<webview>` tag.

| React Native | Electron |
|---|---|
| `injectJavaScript(script)` | `webviewRef.executeJavaScript(script)` |
| `onMessage` callback | `webviewRef.addEventListener('ipc-message', handler)` |
| `ReactNativeWebView.postMessage(data)` | `ipcRenderer.sendToHost(data)` (via webview preload script) |

**WebView preload script**: `<webview>` guest pages run in isolated renderer processes. A dedicated webview preload script uses `contextBridge` to expose `ipcRenderer.sendToHost()` to the guest page. This is separate from the main window's preload script. The `<webview>` tag specifies this via its `preload` attribute.

**`webviewTag: true`**: Required in BrowserWindow's `webPreferences` to enable `<webview>` tags in the renderer.

**Dual instances at App level**: Two `<Renamer>` components rendered in `App.tsx` (one visible, one hidden for prefetch) — same pattern as the RN implementation. The swap logic lives in App, not inside Renamer.

**`imdbExtractor.ts` changes**: The injected JS scripts contain `ReactNativeWebView.postMessage()` as string literals (4 occurrences). These change to use the webview preload's exposed `sendToHost()` function.

### Components

React Native primitives → HTML + Tailwind:

| React Native | HTML + Tailwind |
|---|---|
| `<View>` | `<div>` |
| `<Text>` | `<span>` / `<p>` |
| `<TouchableOpacity>` | `<button>` |
| `<TextInput>` | `<input>` |
| `<ScrollView>` | `<div className="overflow-auto">` |
| `<Modal>` | `<dialog>` or portal |
| `StyleSheet.create()` | Tailwind utility classes |

### Platform Util

`Platform.OS` → `process.platform`. `isWindows()` checks `'win32'`, `isMacOS()` checks `'darwin'`.

### Folder Picker

RN document picker → Electron `dialog.showOpenDialog()` via IPC from main process.

### Build

Metro bundler → Vite (via electron-forge). Packaging via electron-forge makers for Windows (Squirrel/MSI) and macOS (DMG).

### Test Framework

Jest + ts-jest → Vitest. Same assertion API, shares Vite config.

## Project Structure

```
src/
├── main/              # Electron main process
│   ├── index.ts       # App entry, window creation
│   └── ipc.ts         # IPC handlers (file ops, dialog)
├── preload/
│   ├── index.ts       # contextBridge exposing fs/dialog APIs to main window
│   └── webview.ts     # contextBridge exposing sendToHost() to webview guests
├── renderer/          # React app (Vite-built)
│   ├── App.tsx
│   ├── components/    # Ported from RN → HTML+Tailwind
│   ├── index.html
│   └── index.tsx      # React DOM entry
├── services/          # Mostly unchanged; imdbExtractor + RNFS users get adapter
├── stores/            # configStore + undoStore refactored for fs adapter
├── types/             # Unchanged
└── utils/             # Unchanged (except platform.ts)
```

## Security Model

- `contextIsolation: true`, `nodeIntegration: false` on main BrowserWindow
- **Main window preload** (`src/preload/index.ts`): exposes whitelisted fs/dialog APIs via `contextBridge`
- **Webview preload** (`src/preload/webview.ts`): exposes only `ipcRenderer.sendToHost()` via `contextBridge` — this is the only API IMDB guest pages can call
- `<webview>` tags sandboxed by default — IMDB pages can't access Node.js or the main renderer's APIs
- File system access scoped through IPC handlers in main process
- `webviewTag: true` explicitly set in BrowserWindow preferences

## Data Flow

Unchanged from the React Native design:

```
Folder selected → scanDirectory → files in fileStore
  → Renamer loads file → parseFilename → SearchParts displayed
  → WebView navigates to IMDB search → JS injection extracts results
  → User selects match → WebView navigates to title page
  → JS injection extracts metadata
  → interpolateFormat → preview shown
  → User confirms → renameFile + undoStore
  → Hidden WebView prefetches next file in parallel
```
