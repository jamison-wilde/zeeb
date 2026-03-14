# Undo Modal Redesign & Menu Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign undo to be user-selectable (not LIFO), fix Ctrl+Z hijacking, add Toggle Web View and Undo Rename menu items.

**Architecture:** Change menu/preload/App IPC wiring to replace the old `onUndo` (Ctrl+Z hijack) with `onUndoRename` (opens modal) and `onToggleWebView`. Redesign `UndoModal` with expandable transaction rows, per-file undo results, and rescan-on-close. Update `undoStore` to return per-entry results and store `basePath` on transactions.

**Tech Stack:** React, TypeScript, Electron IPC, Zustand, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-13-undo-modal-redesign.md`

---

## Chunk 1: Data Model + Store Changes

### Task 1: Add `basePath` to `RenameTransaction` and `UndoResult` type

**Context:** `RenameTransaction` in `src/types/index.ts` (lines 60-64) needs a `basePath` field. We also need a new `UndoResult` interface for per-entry undo results.

**Files:**
- Modify: `src/types/index.ts` (lines 60-64)
- Test: `__tests__/stores/undoStore.test.ts`

- [ ] **Step 1: Add types**

In `src/types/index.ts`, change lines 60-64 from:

```typescript
export interface RenameTransaction {
  id: string;
  timestamp: number;
  entries: UndoEntry[];
}
```

to:

```typescript
export interface RenameTransaction {
  id: string;
  timestamp: number;
  basePath: string;
  entries: UndoEntry[];
}

export interface UndoResult {
  entry: UndoEntry;
  success: boolean;
  error?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add basePath to RenameTransaction and UndoResult type"
```

---

### Task 2: Update `undoStore` — `commitTransaction` takes `basePath`, `undoTransaction` returns `UndoResult[]`

**Context:** `src/stores/undoStore.ts` — `commitTransaction` (line 34) currently takes `(maxUndos?: number)`. Change to `(basePath: string, maxUndos?: number)`. `undoTransaction` (line 59) currently returns `Promise<void>` and throws on partial failure. Change to return `Promise<UndoResult[]>`, never throw, and on partial failure replace the original transaction with one containing only failed entries.

**Files:**
- Modify: `src/stores/undoStore.ts`
- Modify: `__tests__/stores/undoStore.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `__tests__/stores/undoStore.test.ts`:

```typescript
it('stores basePath on committed transaction', () => {
  const store = createUndoStore(fs);
  store.getState().beginTransaction();
  store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
  store.getState().commitTransaction('/movies');
  expect(store.getState().transactions[0].basePath).toBe('/movies');
});

it('returns UndoResult array on successful undo', async () => {
  const store = createUndoStore(fs);
  store.getState().beginTransaction();
  store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
  store.getState().commitTransaction('/movies');

  const results = await store.getState().undoTransaction(store.getState().transactions[0].id);
  expect(results).toHaveLength(1);
  expect(results[0].success).toBe(true);
  expect(results[0].entry.sourcePath).toBe('/old.mkv');
});

it('returns UndoResult with failure info and keeps failed entries', async () => {
  (fs.rename as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ENOENT'));
  const store = createUndoStore(fs);
  store.getState().beginTransaction();
  store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
  store.getState().addEntry({ type: 'rename', sourcePath: '/old2.mkv', destPath: '/new2.mkv' });
  store.getState().commitTransaction('/movies');

  const txId = store.getState().transactions[0].id;
  const results = await store.getState().undoTransaction(txId);
  expect(results).toHaveLength(2);
  // Entries processed in reverse: /old2 first (fails via mockRejectedValueOnce), /old second (succeeds)
  expect(results.find(r => r.entry.sourcePath === '/old2.mkv')!.success).toBe(false);
  expect(results.find(r => r.entry.sourcePath === '/old.mkv')!.success).toBe(true);

  // Original transaction replaced with one containing only failed entry
  expect(store.getState().transactions).toHaveLength(1);
  expect(store.getState().transactions[0].id).not.toBe(txId);
  expect(store.getState().transactions[0].entries).toHaveLength(1);
  expect(store.getState().transactions[0].entries[0].sourcePath).toBe('/old2.mkv');
  expect(store.getState().transactions[0].basePath).toBe('/movies');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/stores/undoStore.test.ts`
Expected: 3 new tests FAIL

- [ ] **Step 3: Update existing tests for new `commitTransaction` signature**

In `__tests__/stores/undoStore.test.ts`, update all existing `commitTransaction()` calls to pass a basePath:

- `commitTransaction()` → `commitTransaction('/movies')`
- `commitTransaction(3)` → `commitTransaction('/movies', 3)`
- `commitTransaction(0)` → `commitTransaction('/movies', 0)`

Also update the "undoes a transaction" test to expect a return value:

```typescript
it('undoes a transaction by reversing renames', async () => {
  const store = createUndoStore(fs);
  store.getState().beginTransaction();
  store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
  store.getState().commitTransaction('/movies');

  const results = await store.getState().undoTransaction(store.getState().transactions[0].id);
  expect(fs.rename).toHaveBeenCalledWith('/new.mkv', '/old.mkv');
  expect(store.getState().transactions).toHaveLength(0);
  expect(results).toHaveLength(1);
  expect(results[0].success).toBe(true);
});
```

- [ ] **Step 4: Implement store changes**

Replace `src/stores/undoStore.ts` with:

```typescript
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { FsAdapter } from '../adapters/fs';
import type { UndoEntry, RenameTransaction, UndoResult } from '../types';

interface UndoStoreState {
  transactions: RenameTransaction[];
  pendingTransaction: { entries: UndoEntry[] } | null;
  beginTransaction: () => void;
  addEntry: (entry: UndoEntry) => void;
  commitTransaction: (basePath: string, maxUndos?: number) => void;
  discardTransaction: () => void;
  undoTransaction: (id: string) => Promise<UndoResult[]>;
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

    commitTransaction(basePath: string, maxUndos?: number) {
      const pending = get().pendingTransaction;
      if (!pending) return;
      if (maxUndos === 0) {
        set({ pendingTransaction: null });
        return;
      }
      const transaction: RenameTransaction = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        timestamp: Date.now(),
        basePath,
        entries: pending.entries,
      };
      set((state) => {
        let txns = [...state.transactions, transaction];
        if (maxUndos != null && maxUndos > 0 && txns.length > maxUndos) {
          txns = txns.slice(txns.length - maxUndos);
        }
        return { transactions: txns, pendingTransaction: null };
      });
    },

    discardTransaction() {
      set({ pendingTransaction: null });
    },

    async undoTransaction(id: string): Promise<UndoResult[]> {
      const transaction = get().transactions.find((t) => t.id === id);
      if (!transaction) return [];

      const results: UndoResult[] = [];
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
              if (entry.content != null) {
                await fs.writeFile(entry.sourcePath, entry.content, 'utf-8');
              }
              break;
          }
          results.push({ entry, success: true });
        } catch (error) {
          results.push({
            entry,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const failedEntries = results.filter((r) => !r.success).map((r) => r.entry);
      if (failedEntries.length === 0) {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
      } else {
        // Replace original transaction with one containing only failed entries
        const retryTransaction: RenameTransaction = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          timestamp: Date.now(),
          basePath: transaction.basePath,
          entries: failedEntries,
        };
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? retryTransaction : t,
          ),
        }));
      }

      return results;
    },
  }));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run __tests__/stores/undoStore.test.ts`
Expected: All 10 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/stores/undoStore.ts src/types/index.ts __tests__/stores/undoStore.test.ts
git commit -m "feat: undoStore returns UndoResult[], commitTransaction takes basePath"
```

---

### Task 3: Update Renamer to pass `basePath` to `commitTransaction`

**Context:** `src/renderer/components/Renamer.tsx` line 35-39 defines an inline `UndoStoreLike` type that includes `commitTransaction: (maxUndos?: number) => void`. Update to match new signature. Line 537 calls `commitTransaction(config.maxUndos)` — needs `basePath` as first arg. The `basePath` is `currentFile.folder` (the scanned folder for this file).

**Files:**
- Modify: `src/renderer/components/Renamer.tsx` (lines 35-39, 537)

- [ ] **Step 1: Update the inline type**

In `src/renderer/components/Renamer.tsx`, change lines 35-39 from:

```typescript
  undoStore?: StoreApi<{
    beginTransaction: () => void;
    addEntry: (entry: UndoEntry) => void;
    commitTransaction: (maxUndos?: number) => void;
  }>;
```

to:

```typescript
  undoStore?: StoreApi<{
    beginTransaction: () => void;
    addEntry: (entry: UndoEntry) => void;
    commitTransaction: (basePath: string, maxUndos?: number) => void;
  }>;
```

- [ ] **Step 2: Update the commitTransaction call**

In `src/renderer/components/Renamer.tsx`, change line 537 from:

```typescript
      undoStore?.getState().commitTransaction(config.maxUndos);
```

to:

```typescript
      undoStore?.getState().commitTransaction(currentFile.folder, config.maxUndos);
```

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/Renamer.tsx
git commit -m "feat: pass basePath to commitTransaction in Renamer"
```

---

## Chunk 2: Menu + Preload + App IPC Wiring

### Task 4: Update preload — add `onUndoRename`, `onToggleWebView`, `sendWebViewState`; remove `onUndo`

**Context:** `src/preload/main.ts` lines 29-39 expose the `zeebMenu` object. Remove `onUndo` (line 31). Add `onUndoRename` and `onToggleWebView` as IPC listeners. Add `sendWebViewState` as a renderer-to-main send function.

**Files:**
- Modify: `src/preload/main.ts` (lines 29-39)
- Modify: `__tests__/preload/preload.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `__tests__/preload/preload.test.ts` inside the `'main preload'` describe block:

```typescript
it('exposes onUndoRename and onToggleWebView on zeebMenu', async () => {
  await import('../../src/preload/main');
  const { contextBridge: cb } = await import('electron');
  const exposeMock = cb.exposeInMainWorld as ReturnType<typeof vi.fn>;
  const menuCall = exposeMock.mock.calls.find((c: unknown[]) => c[0] === 'zeebMenu');
  expect(menuCall![1]).toHaveProperty('onUndoRename');
  expect(menuCall![1]).toHaveProperty('onToggleWebView');
});

it('does not expose onUndo on zeebMenu', async () => {
  await import('../../src/preload/main');
  const { contextBridge: cb } = await import('electron');
  const exposeMock = cb.exposeInMainWorld as ReturnType<typeof vi.fn>;
  const menuCall = exposeMock.mock.calls.find((c: unknown[]) => c[0] === 'zeebMenu');
  expect(menuCall![1]).not.toHaveProperty('onUndo');
});

it('exposes sendWebViewState on zeebMenu', async () => {
  await import('../../src/preload/main');
  const { contextBridge: cb } = await import('electron');
  const exposeMock = cb.exposeInMainWorld as ReturnType<typeof vi.fn>;
  const menuCall = exposeMock.mock.calls.find((c: unknown[]) => c[0] === 'zeebMenu');
  expect(menuCall![1]).toHaveProperty('sendWebViewState');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/preload/preload.test.ts`
Expected: 3 new tests FAIL

- [ ] **Step 3: Implement preload changes**

Replace `src/preload/main.ts` lines 29-39 (`zeebMenu` block) with:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/preload/preload.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/preload/main.ts __tests__/preload/preload.test.ts
git commit -m "feat: preload adds onUndoRename, onToggleWebView, sendWebViewState; removes onUndo"
```

---

### Task 5: Update main process menu

**Context:** `src/main/index.ts` lines 51-83 define the menu. Replace "Undo" (lines 65-69) with "Undo Rename..." (no accelerator) and add "Toggle Web View" (with checkmark). Add an `ipcMain.on('webview-state')` listener to sync the checkmark.

**Files:**
- Modify: `src/main/index.ts` (lines 51-83)

- [ ] **Step 1: Implement menu changes**

In `src/main/index.ts`, add `ipcMain` to the electron import on line 1:

```typescript
import { app, BrowserWindow, ipcMain, Menu } from 'electron';
```

Replace lines 65-69 (the Undo menu item) with:

```typescript
        {
          label: 'Undo Rename...',
          click: () => mainWindow.webContents.send('menu:undo-rename'),
        },
        {
          id: 'toggle-webview',
          label: 'Toggle Web View',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            mainWindow.webContents.send('menu:toggle-webview');
            // The renderer will send back the actual state
          },
        },
```

After `Menu.setApplicationMenu(menu);` (line 84), add the IPC listener:

```typescript
  ipcMain.on('webview-state', (_event, visible: boolean) => {
    const menuItem = menu.getMenuItemById('toggle-webview');
    if (menuItem) menuItem.checked = visible;
  });
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: menu adds Undo Rename and Toggle Web View, removes Ctrl+Z hijack"
```

---

### Task 6: Update App.tsx — wire new menu events, pass undoStore to UndoModal

**Context:** `src/renderer/App.tsx` — remove `onUndo` handler (lines 68-72), remove `handleUndo` (lines 183-188), remove `undoTransaction` selector (line 56), remove `transactions` selector (line 55). Add `onUndoRename` → `setShowUndo(true)`, `onToggleWebView` → toggle `showWebView` config + send state to main. Pass `undoStore` ref and `onRescan` to UndoModal instead of `transactions`/`onUndo`.

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `__tests__/App.test.tsx`

- [ ] **Step 1: Write failing tests**

Replace `__tests__/App.test.tsx` content with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import App from '../src/renderer/App';
import { createMockFsAdapter } from '../src/adapters/fs';
import { initConfigStore } from '../src/stores/configStore';

const mockFs = createMockFsAdapter();

let optionsCallback: (() => void) | null = null;
let undoRenameCallback: (() => void) | null = null;
let toggleWebViewCallback: (() => void) | null = null;

const mockZeebMenu = {
  onOptions: vi.fn((cb: () => void) => { optionsCallback = cb; }),
  onUndoRename: vi.fn((cb: () => void) => { undoRenameCallback = cb; }),
  onToggleWebView: vi.fn((cb: () => void) => { toggleWebViewCallback = cb; }),
  onReleaseNotes: vi.fn(),
  onOpenFolder: vi.fn(),
  onWindowStateChanged: vi.fn(() => () => {}),
  sendWebViewState: vi.fn(),
};

describe('App', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
    optionsCallback = null;
    undoRenameCallback = null;
    toggleWebViewCallback = null;
    vi.clearAllMocks();
    mockZeebMenu.onOptions.mockImplementation((cb: () => void) => { optionsCallback = cb; });
    mockZeebMenu.onUndoRename.mockImplementation((cb: () => void) => { undoRenameCallback = cb; });
    mockZeebMenu.onToggleWebView.mockImplementation((cb: () => void) => { toggleWebViewCallback = cb; });
    Object.defineProperty(window, 'zeebMenu', { value: mockZeebMenu, writable: true, configurable: true });
    Object.defineProperty(window, 'zeebApp', {
      value: { getPath: vi.fn(), getWebviewPreloadPath: vi.fn().mockResolvedValue('') },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'zeebImdb', {
      value: { suggest: vi.fn().mockResolvedValue([]) },
      writable: true,
      configurable: true,
    });
  });

  it('renders folder browser view by default', () => {
    render(<App fs={mockFs} />);
    expect(screen.getByTestId('folder-browser')).toBeDefined();
  });

  it('does not render Start Processing button', () => {
    render(<App fs={mockFs} />);
    expect(screen.queryByTestId('start-processing')).toBeNull();
  });

  it('shows options modal via menu event', () => {
    render(<App fs={mockFs} />);
    act(() => { optionsCallback?.(); });
    expect(screen.getByTestId('options-modal')).toBeDefined();
  });

  it('registers onOpenFolder handler', () => {
    render(<App fs={mockFs} />);
    expect(mockZeebMenu.onOpenFolder).toHaveBeenCalled();
  });

  it('switches to folder browser when Open Folder callback fires', () => {
    let openFolderCallback: (() => void) | null = null;
    mockZeebMenu.onOpenFolder = vi.fn((cb: () => void) => { openFolderCallback = cb; });
    render(<App fs={mockFs} />);
    act(() => { openFolderCallback?.(); });
    expect(screen.getByTestId('folder-browser')).toBeDefined();
  });

  it('opens undo modal via onUndoRename menu event', () => {
    render(<App fs={mockFs} />);
    act(() => { undoRenameCallback?.(); });
    expect(screen.getByText('Undo History')).toBeDefined();
  });

  it('does not register onUndo handler', () => {
    render(<App fs={mockFs} />);
    expect(mockZeebMenu).not.toHaveProperty('onUndo');
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npx vitest run __tests__/App.test.tsx`
Expected: 2 new tests FAIL (onUndoRename, onUndo)

- [ ] **Step 3: Implement App.tsx changes**

In `src/renderer/App.tsx`:

1. Remove line 56 (`const undoTransaction = ...`).

2. Remove line 55 (`const transactions = ...`).

3. Replace lines 66-79 (the useEffect with menu handlers) with:

```typescript
  useEffect(() => {
    window.zeebMenu.onOptions(() => setShowOptions(true));
    window.zeebMenu.onUndoRename(() => setShowUndo(true));
    window.zeebMenu.onToggleWebView(() => {
      const newVal = !useConfigStore.getState().config.showWebView;
      useConfigStore.getState().updateConfig({ showWebView: newVal });
      void useConfigStore.getState().save();
      window.zeebMenu.sendWebViewState(newVal);
    });
    window.zeebMenu.onReleaseNotes(() => setShowReleaseNotes(true));
    window.zeebMenu.onOpenFolder(() => {
      setFiles([]);
      setView('folderBrowser');
    });
  }, []);
```

4. Remove lines 183-188 (`handleUndo` callback).

5. Add a `handleRescan` callback after `handleOptionsClose`:

```typescript
  const handleRescan = useCallback(async () => {
    const cfg = useConfigStore.getState().config;
    const folder = cfg.recentFolders[0];
    if (!folder) return;
    const results = await scanDirectory(
      fs,
      folder,
      cfg.movieExtensions,
      cfg.recursionMode,
      { detectDvd: cfg.detectDvd },
    );
    setFiles(results);
  }, [fs, setFiles]);
```

6. Replace the UndoModal JSX (lines 245-250) with:

```tsx
      <UndoModal
        visible={showUndo}
        onClose={() => setShowUndo(false)}
        undoStore={undoStoreRef.current}
        onRescan={handleRescan}
      />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/App.test.tsx`
Expected: All 7 tests PASS

- [ ] **Step 5: Update integration test mocks**

In `__tests__/integration/dualRenamer.test.tsx`, replace line 14:

```typescript
      value: { onOptions: vi.fn(), onUndo: vi.fn(), onReleaseNotes: vi.fn(), onOpenFolder: vi.fn(), onWindowStateChanged: vi.fn(() => () => {}) },
```

with:

```typescript
      value: { onOptions: vi.fn(), onUndoRename: vi.fn(), onToggleWebView: vi.fn(), onReleaseNotes: vi.fn(), onOpenFolder: vi.fn(), onWindowStateChanged: vi.fn(() => () => {}), sendWebViewState: vi.fn() },
```

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/renderer/App.tsx __tests__/App.test.tsx __tests__/integration/dualRenamer.test.tsx
git commit -m "feat: wire onUndoRename and onToggleWebView, remove Ctrl+Z hijack"
```

---

## Chunk 3: UndoModal Redesign

### Task 7: Redesign UndoModal — expandable rows, movie names, per-file results, rescan

**Context:** `src/renderer/components/UndoModal.tsx` is a simple list of transactions. Redesign to:
- Accept `undoStore` ref + `onRescan` instead of `transactions`/`onUndo`
- Show movie names in collapsed row (extracted from dest filenames, deduped by stem)
- Expand/collapse to show entry details with relative paths
- Per-file undo results (✓/✗) shown inline after clicking UNDO
- Full success → remove transaction after 1s; partial failure → keep with failed entries
- Track `didUndo` flag; call `onRescan` on close if true

**Files:**
- Modify: `src/renderer/components/UndoModal.tsx`
- Modify: `__tests__/components/UndoModal.test.tsx`

- [ ] **Step 1: Write failing tests**

Replace `__tests__/components/UndoModal.test.tsx` with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UndoModal } from '../../src/renderer/components/UndoModal';
import { createUndoStore } from '../../src/stores/undoStore';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { FsAdapter } from '../../src/adapters/fs';

describe('UndoModal', () => {
  let fs: FsAdapter;

  beforeEach(() => {
    fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
    });
  });

  function makeStore(entries?: Array<{ type: 'rename' | 'create' | 'delete'; sourcePath: string; destPath: string | null }>) {
    const store = createUndoStore(fs);
    if (entries) {
      store.getState().beginTransaction();
      for (const e of entries) {
        store.getState().addEntry(e);
      }
      store.getState().commitTransaction('/movies');
    }
    return store;
  }

  it('shows empty state when no transactions', () => {
    const store = makeStore();
    render(<UndoModal visible={true} onClose={vi.fn()} undoStore={store} onRescan={vi.fn()} />);
    expect(screen.getByText('No undo history')).toBeDefined();
  });

  it('shows movie names in collapsed row', () => {
    const store = makeStore([
      { type: 'rename', sourcePath: '/movies/Old.Movie.mkv', destPath: '/movies/New Movie (2024).mkv' },
      { type: 'rename', sourcePath: '/movies/Old.Movie.srt', destPath: '/movies/New Movie (2024).srt' },
    ]);
    render(<UndoModal visible={true} onClose={vi.fn()} undoStore={store} onRescan={vi.fn()} />);
    expect(screen.getByText(/New Movie \(2024\)/)).toBeDefined();
    expect(screen.getByText(/2 files/)).toBeDefined();
  });

  it('expands to show entry details', () => {
    const store = makeStore([
      { type: 'rename', sourcePath: '/movies/Old.mkv', destPath: '/movies/New.mkv' },
    ]);
    render(<UndoModal visible={true} onClose={vi.fn()} undoStore={store} onRescan={vi.fn()} />);
    // Click to expand
    fireEvent.click(screen.getByTestId('expand-toggle-0'));
    expect(screen.getByText(/Old\.mkv/)).toBeDefined();
    expect(screen.getByText(/New\.mkv/)).toBeDefined();
  });

  it('shows relative paths based on basePath', () => {
    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/movies/sub/Old.mkv', destPath: '/movies/sub/New.mkv' });
    store.getState().commitTransaction('/movies');
    render(<UndoModal visible={true} onClose={vi.fn()} undoStore={store} onRescan={vi.fn()} />);
    fireEvent.click(screen.getByTestId('expand-toggle-0'));
    expect(screen.getByText(/sub\/Old\.mkv/)).toBeDefined();
    expect(screen.getByText(/sub\/New\.mkv/)).toBeDefined();
  });

  it('shows per-file success results after undo', async () => {
    const store = makeStore([
      { type: 'rename', sourcePath: '/movies/Old.mkv', destPath: '/movies/New.mkv' },
    ]);
    render(<UndoModal visible={true} onClose={vi.fn()} undoStore={store} onRescan={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('undo-button-0'));
    });
    expect(screen.getByText(/✓/)).toBeDefined();
  });

  it('shows per-file failure results after partial undo', async () => {
    (fs.rename as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ENOENT'));
    const store = createUndoStore(fs);
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/movies/A.mkv', destPath: '/movies/B.mkv' });
    store.getState().addEntry({ type: 'rename', sourcePath: '/movies/C.mkv', destPath: '/movies/D.mkv' });
    store.getState().commitTransaction('/movies');
    render(<UndoModal visible={true} onClose={vi.fn()} undoStore={store} onRescan={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('undo-button-0'));
    });
    expect(screen.getByText(/✗/)).toBeDefined();
    expect(screen.getByText(/✓/)).toBeDefined();
  });

  it('calls onRescan on close when undos were performed', async () => {
    const onRescan = vi.fn();
    const store = makeStore([
      { type: 'rename', sourcePath: '/movies/Old.mkv', destPath: '/movies/New.mkv' },
    ]);
    render(<UndoModal visible={true} onClose={vi.fn()} undoStore={store} onRescan={onRescan} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('undo-button-0'));
    });
    fireEvent.click(screen.getByTestId('close-undo'));
    expect(onRescan).toHaveBeenCalled();
  });

  it('does not call onRescan on close when no undos performed', () => {
    const onRescan = vi.fn();
    const store = makeStore([
      { type: 'rename', sourcePath: '/movies/Old.mkv', destPath: '/movies/New.mkv' },
    ]);
    render(<UndoModal visible={true} onClose={vi.fn()} undoStore={store} onRescan={onRescan} />);
    fireEvent.click(screen.getByTestId('close-undo'));
    expect(onRescan).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/UndoModal.test.tsx`
Expected: Most tests FAIL (props changed, new functionality)

- [ ] **Step 3: Implement UndoModal redesign**

Replace `src/renderer/components/UndoModal.tsx` with:

```tsx
import React, { useState, useCallback } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';
import type { RenameTransaction, UndoEntry, UndoResult } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyStore = StoreApi<any>;

interface UndoModalProps {
  visible: boolean;
  onClose: () => void;
  undoStore: AnyStore;
  onRescan: () => void;
}

function getRelativePath(fullPath: string, basePath: string): string {
  // Normalize separators for comparison
  const normFull = fullPath.replace(/\\/g, '/');
  const normBase = basePath.replace(/\\/g, '/').replace(/\/$/, '') + '/';
  if (normFull.startsWith(normBase)) {
    return normFull.slice(normBase.length);
  }
  // Fallback: just return the filename
  return normFull.split('/').pop() ?? normFull;
}

function extractMovieNames(entries: UndoEntry[]): string[] {
  const names = new Set<string>();
  for (const entry of entries) {
    const path = entry.destPath ?? entry.sourcePath;
    const filename = path.replace(/\\/g, '/').split('/').pop() ?? '';
    const stem = filename.replace(/\.[^.]+$/, '');
    names.add(stem);
  }
  return Array.from(names);
}

function formatMovieNames(names: string[]): string {
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
}

function entryDescription(entry: UndoEntry, basePath: string): string {
  const src = getRelativePath(entry.sourcePath, basePath);
  switch (entry.type) {
    case 'rename': {
      const dst = entry.destPath ? getRelativePath(entry.destPath, basePath) : '';
      return `rename: ${src} → ${dst}`;
    }
    case 'create': {
      const dst = entry.destPath ? getRelativePath(entry.destPath, basePath) : src;
      return `create: ${dst} (will delete)`;
    }
    case 'delete':
      return `delete: ${src} (will restore)`;
  }
}

function resultDescription(result: UndoResult, basePath: string): React.JSX.Element {
  const src = getRelativePath(result.entry.sourcePath, basePath);
  const icon = result.success ? '✓' : '✗';
  const color = result.success ? 'text-green-600' : 'text-red-600';
  const suffix = result.success ? '' : ` — ${result.error ?? 'unknown error'}`;
  return (
    <div className={`text-xs pl-6 py-0.5 ${color}`}>
      {icon} {result.entry.type}: {src}{suffix}
    </div>
  );
}

export function UndoModal({ visible, onClose, undoStore, onRescan }: UndoModalProps): React.JSX.Element | null {
  const transactions = useStore(undoStore, (s) => s.transactions);
  const undoTransaction = useStore(undoStore, (s) => s.undoTransaction);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [undoResults, setUndoResults] = useState<Map<string, UndoResult[]>>(new Map());
  const [didUndo, setDidUndo] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleUndo = useCallback(async (id: string) => {
    setPendingIds((prev) => new Set(prev).add(id));
    const results = await undoTransaction(id);
    setUndoResults((prev) => new Map(prev).set(id, results));
    setExpandedIds((prev) => new Set(prev).add(id));
    setDidUndo(true);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    // If all succeeded, remove from results after delay
    if (results.every((r) => r.success)) {
      setTimeout(() => {
        setUndoResults((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      }, 1000);
    }
  }, [undoTransaction]);

  const handleClose = useCallback(() => {
    if (didUndo) onRescan();
    setExpandedIds(new Set());
    setUndoResults(new Map());
    setDidUndo(false);
    onClose();
  }, [didUndo, onRescan, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold">Undo History</h2>
        <button data-testid="close-undo" className="text-blue-500" onClick={handleClose}>
          Close
        </button>
      </div>
      {transactions.length === 0 && undoResults.size === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 text-gray-500">
          No undo history
        </div>
      ) : (
        <div data-testid="undo-list" className="flex-1 overflow-y-auto">
          {transactions.map((txn, index) => {
            const isExpanded = expandedIds.has(txn.id);
            const results = undoResults.get(txn.id);
            const isPending = pendingIds.has(txn.id);
            const movieNames = extractMovieNames(txn.entries);

            return (
              <div key={txn.id} className="border-b border-gray-200">
                <div className="flex items-center px-3 py-2.5">
                  <button
                    data-testid={`expand-toggle-${index}`}
                    className="mr-2 text-gray-400 hover:text-gray-600 w-4"
                    onClick={() => toggleExpand(txn.id)}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{formatMovieNames(movieNames)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {txn.entries.length} {txn.entries.length === 1 ? 'file' : 'files'}
                    </p>
                  </div>
                  {results ? (
                    <span className="px-4 py-1.5 text-gray-400 font-bold text-sm">DONE</span>
                  ) : (
                    <button
                      data-testid={`undo-button-${index}`}
                      className="px-4 py-1.5 bg-red-500 text-white rounded font-bold text-sm hover:bg-red-600 disabled:opacity-50"
                      onClick={() => handleUndo(txn.id)}
                      disabled={isPending}
                    >
                      {isPending ? '...' : 'UNDO'}
                    </button>
                  )}
                </div>
                {isExpanded && !results && (
                  <div className="pb-2">
                    {txn.entries.map((entry, i) => (
                      <div key={i} className="text-xs text-gray-600 pl-6 py-0.5">
                        {entryDescription(entry, txn.basePath)}
                      </div>
                    ))}
                  </div>
                )}
                {isExpanded && results && (
                  <div className="pb-2">
                    {results.map((result, i) => (
                      <React.Fragment key={i}>
                        {resultDescription(result, txn.basePath)}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/UndoModal.test.tsx`
Expected: All 8 tests PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/UndoModal.tsx __tests__/components/UndoModal.test.tsx
git commit -m "feat: redesign UndoModal with expandable rows, per-file results, rescan on close"
```

---

## Verification

Run: `npx vitest run`
Expected: All tests pass.
