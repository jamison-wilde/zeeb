# App Boundary Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace dual-renamer cursor state with a focused hook, unify zustand stores to `create()` singletons (with `renamerStore` as a justified factory exception), and wrap all `window.zeeb*` IPC globals behind a `PlatformAdapter` exposed via React Context.

**Architecture:** Three independent cleanups in 9 commits. (1) `useDualCursor` hook drops 50 lines from App.tsx. (2) Stores convert from factory-via-`useRef` to `create()` singletons; fs-needing stores expose a `setFs` action for tests. (3) `PlatformAdapter` interface + electron impl + mock factory; provided via `<PlatformProvider>` and consumed via `usePlatform()` in any component that needs it.

**Tech Stack:** TypeScript 5.8, React 19, Zustand 5, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-05-02-app-boundary-cleanup-design.md`

**Refinement from spec:** the spec described threading `platform` as a prop on App. Surveying the codebase revealed 9 components touch `window.zeeb*` (App, Renamer, AboutModal, FolderBrowser, ReleaseNotes, UpdateModal, BrowseInput, ImdbSection, useImdbWebview). Prop-drilling through this many is heavier than the alternative: a `<PlatformProvider>` Context with a `usePlatform()` hook. The plan uses Context. Tests wrap components in `<PlatformProvider value={mockPlatform}>`.

---

## File map

**Create:**
- `src/renderer/hooks/useDualCursor.ts`
- `src/adapters/platform.ts` (interface + `createElectronPlatformAdapter` + `createMockPlatformAdapter`)
- `src/renderer/PlatformContext.tsx` (Context + Provider + `usePlatform` hook)
- `__tests__/renderer/hooks/useDualCursor.test.ts`
- `__tests__/adapters/platform.test.ts`

**Modify (stores):**
- `src/stores/configStore.ts` — singleton + `setFs`
- `src/stores/undoStore.ts` — singleton + `setFs`
- `src/stores/fileStore.ts` — singleton

**Modify (consumers):**
- `src/renderer/index.tsx` — drop `initConfigStore`; wrap App in `<PlatformProvider>`.
- `src/renderer/App.tsx` — use `useDualCursor`; drop `useRef(create…)`; replace `window.zeeb*` with `usePlatform()`; drop `getConfigStore` references.
- `src/renderer/components/Renamer.tsx` — drop `undoStore` prop; replace `window.zeebImdb`.
- `src/renderer/hooks/useImdbWebview.ts` — replace `window.zeebApp.getWebviewPreloadPath`.
- `src/renderer/components/AboutModal.tsx`, `FolderBrowser.tsx`, `ReleaseNotes.tsx`, `UpdateModal.tsx`, `options/BrowseInput.tsx`, `options/ImdbSection.tsx` — replace `window.zeeb*` with `usePlatform()`.

**Modify (tests):**
- `__tests__/stores/configStore.test.ts`, `undoStore.test.ts`, `fileStore.test.ts` — switch to singleton API + `setFs`.
- `__tests__/App.test.tsx`, `__tests__/renderer/App.test.tsx`, `__tests__/integration/dualRenamer.test.tsx`, `__tests__/components/OptionsModal.test.tsx`, `__tests__/renderer/Renamer.test.tsx` — drop `initConfigStore(mockFs)`; use `<PlatformProvider value={createMockPlatformAdapter(...)}>`.
- `__tests__/components/UndoModal.test.tsx`, `__tests__/integration/renamePipeline.test.ts` — switch from `createUndoStore(fs)` to `useUndoStore.getState().setFs(fs)`.

---

## Task 1: `useDualCursor` hook

**Files:**
- Create: `src/renderer/hooks/useDualCursor.ts`
- Create: `__tests__/renderer/hooks/useDualCursor.test.ts`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Write the failing test**

Create directory if needed and the file:

```ts
// __tests__/renderer/hooks/useDualCursor.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDualCursor } from '../../../src/renderer/hooks/useDualCursor';
import type { MovieFile } from '../../../src/types';

function makeFile(name: string, id = name): MovieFile {
  return {
    id,
    name,
    nativePath: `/m/${name}`,
    folder: '/m',
    extension: 'mkv',
    size: 0,
    isDvdFolder: false,
    hasNfo: false,
    hasUrl: false,
    hasPoster: false,
    nfoPath: null,
    urlPath: null,
    posterPath: null,
  };
}

describe('useDualCursor', () => {
  it('places initial cursors on the first two visible files via setFromList', () => {
    const files = [makeFile('sample.mkv'), makeFile('a.mkv'), makeFile('b.mkv'), makeFile('c.mkv')];
    const visible = (f: { name: string }) => !f.name.startsWith('sample');
    const { result } = renderHook(() => useDualCursor({ files, isFileVisible: visible }));
    act(() => result.current.setFromList(files));
    expect(result.current.active).toBe(0);
    expect(result.current.index0).toBe(1); // 'a.mkv'
    expect(result.current.index1).toBe(2); // 'b.mkv'
  });

  it('advance() moves the active cursor past current and the other index, then flips active', () => {
    const files = [makeFile('a'), makeFile('b'), makeFile('c'), makeFile('d')];
    const { result } = renderHook(() => useDualCursor({ files, isFileVisible: () => true }));
    act(() => result.current.setFromList(files));
    // Initial: active=0, index0=0, index1=1
    act(() => result.current.advance());
    // After: active=1, index0 advanced past index1 → index0 should be 2
    expect(result.current.active).toBe(1);
    expect(result.current.index0).toBe(2);
    expect(result.current.index1).toBe(1); // unchanged
  });

  it('selectAt(N) updates the active cursor and moves the other to next visible after N', () => {
    const files = [makeFile('a'), makeFile('b'), makeFile('c'), makeFile('d')];
    const { result } = renderHook(() => useDualCursor({ files, isFileVisible: () => true }));
    act(() => result.current.setFromList(files));
    // active=0 initially. Click index 3.
    act(() => result.current.selectAt(3));
    expect(result.current.index0).toBe(3);
    expect(result.current.index1).toBe(4); // past end is fine; renamer renders empty
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useDualCursor`
Expected: FAIL — "Cannot find module".

- [ ] **Step 3: Implement the hook**

Create `src/renderer/hooks/useDualCursor.ts`:

```ts
import { useCallback, useState, useRef, useEffect } from 'react';
import type { MovieFile } from '../../types';

interface UseDualCursorArgs {
  files: MovieFile[];
  isFileVisible: (f: { name: string }) => boolean;
}

export interface DualCursor {
  active: 0 | 1;
  index0: number;
  index1: number;
  setFromList: (files: MovieFile[]) => void;
  advance: () => void;
  selectAt: (clickedIndex: number) => void;
}

export function useDualCursor({ files, isFileVisible }: UseDualCursorArgs): DualCursor {
  const [active, setActive] = useState<0 | 1>(0);
  const [index0, setIndex0] = useState(0);
  const [index1, setIndex1] = useState(1);

  // Track the latest files so callbacks don't go stale across renders.
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const findNextVisible = useCallback((from: number, otherIdx: number): number => {
    const list = filesRef.current;
    let idx = from;
    while (idx < list.length && (!isFileVisible(list[idx]) || idx === otherIdx)) {
      idx += 1;
    }
    return idx;
  }, [isFileVisible]);

  const setFromList = useCallback((next: MovieFile[]) => {
    filesRef.current = next;
    let idx0 = 0;
    while (idx0 < next.length && !isFileVisible(next[idx0])) idx0 += 1;
    let idx1 = idx0 + 1;
    while (idx1 < next.length && !isFileVisible(next[idx1])) idx1 += 1;
    setIndex0(idx0);
    setIndex1(idx1);
    setActive(0);
  }, [isFileVisible]);

  const advance = useCallback(() => {
    if (active === 0) {
      setIndex0((prev) => findNextVisible(prev + 1, index1));
      setActive(1);
    } else {
      setIndex1((prev) => findNextVisible(prev + 1, index0));
      setActive(0);
    }
  }, [active, index0, index1, findNextVisible]);

  const selectAt = useCallback((clickedIndex: number) => {
    if (active === 0) {
      setIndex0(clickedIndex);
      setIndex1(findNextVisible(clickedIndex + 1, clickedIndex));
    } else {
      setIndex1(clickedIndex);
      setIndex0(findNextVisible(clickedIndex + 1, clickedIndex));
    }
  }, [active, findNextVisible]);

  return { active, index0, index1, setFromList, advance, selectAt };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useDualCursor`
Expected: 3 tests pass.

- [ ] **Step 5: Wire into App.tsx**

In `src/renderer/App.tsx`:

Add the import near the other hook imports:

```ts
import { useDualCursor } from './hooks/useDualCursor';
```

Delete the existing dual-cursor state and helpers (lines ~25, 36–37, 52–59, 137–169 — the four handlers and `findNextVisible`):

Delete:
```ts
const [activeRenamer, setActiveRenamer] = useState<0 | 1>(0);
const [fileIndex0, setFileIndex0] = useState(0);
const [fileIndex1, setFileIndex1] = useState(1);
// ... findNextVisible callback
// ... handleComplete0, handleComplete1, handleFileSelect0, handleFileSelect1
```

Add after the `isFileVisible` callback:

```ts
  const cursor = useDualCursor({ files, isFileVisible });
```

In `handleFolderSelected`, replace:

```ts
      setFiles(results);
      // Find first two visible files for the interleaved renamers
      let idx0 = 0;
      while (idx0 < results.length && !isFileVisible(results[idx0])) idx0++;
      let idx1 = idx0 + 1;
      while (idx1 < results.length && !isFileVisible(results[idx1])) idx1++;
      setFileIndex0(idx0);
      setFileIndex1(idx1);
      setActiveRenamer(0);
      setView('process');
```

with:

```ts
      setFiles(results);
      cursor.setFromList(results);
      setView('process');
```

Update the JSX for the two `<Renamer>` calls to use the cursor:

```tsx
          <div data-testid="renamer-view" className="flex-1 flex flex-col min-h-0">
            <div data-testid="renamer-0" className={`flex-1 flex flex-col min-h-0 ${cursor.active === 0 ? '' : 'hidden'}`}>
              <Renamer
                instanceId={0}
                fileIndex={cursor.index0}
                files={files}
                isFileVisible={isFileVisible}
                fs={fs}
                undoStore={undoStoreRef.current}
                onFileRenamed={handleFileRenamed}
                onComplete={cursor.advance}
                onFileSelect={cursor.selectAt}
                showTt={showTt}
                onShowTtChange={setShowTt}
                showSample={showSample}
                onShowSampleChange={setShowSample}
              />
            </div>
            <div data-testid="renamer-1" className={`flex-1 flex flex-col min-h-0 ${cursor.active === 1 ? '' : 'hidden'}`}>
              <Renamer
                instanceId={1}
                fileIndex={cursor.index1}
                files={files}
                isFileVisible={isFileVisible}
                fs={fs}
                undoStore={undoStoreRef.current}
                onFileRenamed={handleFileRenamed}
                onComplete={cursor.advance}
                onFileSelect={cursor.selectAt}
                showTt={showTt}
                onShowTtChange={setShowTt}
                showSample={showSample}
                onShowSampleChange={setShowSample}
              />
            </div>
          </div>
```

(`undoStore` prop stays for now — Task 3 drops it.)

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all green. Existing dual-renamer integration tests still pass.

Run: `npx tsc --noEmit 2>&1 | grep -E "App.tsx|useDualCursor"`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/hooks/useDualCursor.ts __tests__/renderer/hooks/useDualCursor.test.ts src/renderer/App.tsx
git commit -m "refactor: extract dual-renamer cursor logic into useDualCursor"
```

---

## Task 2: `fileStore` → singleton

**Files:**
- Modify: `src/stores/fileStore.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `__tests__/stores/fileStore.test.ts`

`fileStore` doesn't take fs. Easiest of the three.

- [ ] **Step 1: Convert the store**

Replace `src/stores/fileStore.ts` entirely:

```ts
import { create } from 'zustand';
import type { MovieFile } from '../types';

interface FileStoreState {
  files: MovieFile[];
  setFiles: (files: MovieFile[]) => void;
  updateFile: (id: string, updates: Partial<MovieFile>) => void;
  clear: () => void;
}

export const useFileStore = create<FileStoreState>((set) => ({
  files: [],

  setFiles(files) {
    set({ files });
  },

  updateFile(id, updates) {
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  },

  clear() {
    set({ files: [] });
  },
}));
```

- [ ] **Step 2: Update tests**

Replace `__tests__/stores/fileStore.test.ts` entirely:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useFileStore } from '../../src/stores/fileStore';
import type { MovieFile } from '../../src/types';

function makeFile(id: string): MovieFile {
  return {
    id, name: `${id}.mkv`, nativePath: `/${id}.mkv`, folder: '/',
    extension: 'mkv', size: 0, isDvdFolder: false, hasNfo: false,
    hasUrl: false, hasPoster: false, nfoPath: null, urlPath: null, posterPath: null,
  };
}

describe('fileStore', () => {
  beforeEach(() => {
    useFileStore.setState({ files: [] });
  });

  it('starts empty', () => {
    expect(useFileStore.getState().files).toEqual([]);
  });

  it('setFiles replaces the list', () => {
    useFileStore.getState().setFiles([makeFile('a'), makeFile('b')]);
    expect(useFileStore.getState().files).toHaveLength(2);
  });

  it('updateFile patches one entry by id without losing others', () => {
    useFileStore.getState().setFiles([makeFile('a'), makeFile('b')]);
    useFileStore.getState().updateFile('a', { name: 'renamed.mkv' });
    const list = useFileStore.getState().files;
    expect(list[0].name).toBe('renamed.mkv');
    expect(list[1].name).toBe('b.mkv');
  });
});
```

- [ ] **Step 3: Update App.tsx**

In `src/renderer/App.tsx`:

Replace:
```ts
import { createFileStore } from '../stores/fileStore';
```

with:
```ts
import { useFileStore } from '../stores/fileStore';
```

Delete the line:
```ts
const fileStoreRef = useRef(createFileStore());
```

Replace the three `useStore(fileStoreRef.current, ...)` calls:

```ts
const files = useStore(fileStoreRef.current, (s) => s.files);
const setFiles = useStore(fileStoreRef.current, (s) => s.setFiles);
const updateFile = useStore(fileStoreRef.current, (s) => s.updateFile);
```

with:

```ts
const files = useFileStore((s) => s.files);
const setFiles = useFileStore((s) => s.setFiles);
const updateFile = useFileStore((s) => s.updateFile);
```

Replace any `fileStoreRef.current.getState()` usage — currently in `findNextVisible` (now removed by Task 1) and elsewhere — with `useFileStore.getState()`. After Task 1, the `findNextVisible` lives inside `useDualCursor` which doesn't reach for fileStore. Verify no other refs.

If the `useStore` import from zustand is now unused, drop that import.

- [ ] **Step 4: Run tests**

Run: `npm test -- fileStore App dualRenamer`
Expected: all green.

Run: `npm test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/stores/fileStore.ts src/renderer/App.tsx __tests__/stores/fileStore.test.ts
git commit -m "refactor: convert fileStore to a create() singleton"
```

---

## Task 3: `undoStore` → singleton

**Files:**
- Modify: `src/stores/undoStore.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/Renamer.tsx`
- Modify: `__tests__/stores/undoStore.test.ts`
- Modify: `__tests__/components/UndoModal.test.tsx`
- Modify: `__tests__/integration/renamePipeline.test.ts`

The store currently takes `fs` at creation and is held in `useRef`. Convert to singleton with default `createElectronFsAdapter()` and `setFs(adapter)` for tests. Drop the `undoStore` prop on `Renamer`.

- [ ] **Step 1: Convert the store**

Replace `src/stores/undoStore.ts`:

```ts
import { create } from 'zustand';
import { createElectronFsAdapter, type FsAdapter } from '../adapters/fs';
import type { UndoEntry, RenameTransaction, UndoResult } from '../types';

interface UndoStoreState {
  transactions: RenameTransaction[];
  pendingTransaction: { entries: UndoEntry[] } | null;
  beginTransaction: () => void;
  addEntry: (entry: UndoEntry) => void;
  commitTransaction: (basePath: string, maxUndos?: number) => void;
  discardTransaction: () => void;
  undoTransaction: (id: string) => Promise<UndoResult[]>;
  setFs: (adapter: FsAdapter) => void;
}

let fs: FsAdapter = createElectronFsAdapter();

export const useUndoStore = create<UndoStoreState>((set, get) => ({
  transactions: [],
  pendingTransaction: null,

  beginTransaction() {
    set({ pendingTransaction: { entries: [] } });
  },

  addEntry(entry) {
    const pending = get().pendingTransaction;
    if (!pending) return;
    set({ pendingTransaction: { entries: [...pending.entries, entry] } });
  },

  commitTransaction(basePath, maxUndos) {
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

  async undoTransaction(id) {
    const transaction = get().transactions.find((t) => t.id === id);
    if (!transaction) return [];

    const results: UndoResult[] = [];
    const reversed = [...transaction.entries].reverse();
    for (const entry of reversed) {
      try {
        switch (entry.type) {
          case 'rename':
            if (entry.destPath) await fs.rename(entry.destPath, entry.sourcePath);
            break;
          case 'create':
            if (entry.destPath) await fs.unlink(entry.destPath);
            break;
          case 'delete':
            if (entry.content != null) await fs.writeFile(entry.sourcePath, entry.content, 'utf-8');
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
      set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
    } else {
      const retryTransaction: RenameTransaction = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        timestamp: Date.now(),
        basePath: transaction.basePath,
        entries: failedEntries,
      };
      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === id ? retryTransaction : t)),
      }));
    }

    return results;
  },

  setFs(adapter) {
    fs = adapter;
  },
}));
```

- [ ] **Step 2: Update store tests**

Replace `__tests__/stores/undoStore.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUndoStore } from '../../src/stores/undoStore';
import { createMockFsAdapter } from '../../src/adapters/fs';

describe('undoStore', () => {
  beforeEach(() => {
    useUndoStore.setState({ transactions: [], pendingTransaction: null });
    useUndoStore.getState().setFs(createMockFsAdapter());
  });

  it('begins, adds entries, and commits a transaction', () => {
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/a', destPath: '/b' });
    useUndoStore.getState().commitTransaction('/base');
    expect(useUndoStore.getState().transactions).toHaveLength(1);
    expect(useUndoStore.getState().pendingTransaction).toBeNull();
  });

  it('discards the pending transaction', () => {
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/a', destPath: '/b' });
    useUndoStore.getState().discardTransaction();
    expect(useUndoStore.getState().pendingTransaction).toBeNull();
    expect(useUndoStore.getState().transactions).toHaveLength(0);
  });

  it('addEntry is a no-op when no pending transaction', () => {
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/a', destPath: '/b' });
    expect(useUndoStore.getState().pendingTransaction).toBeNull();
  });

  it('caps transactions at maxUndos', () => {
    for (let i = 0; i < 5; i++) {
      useUndoStore.getState().beginTransaction();
      useUndoStore.getState().addEntry({ type: 'rename', sourcePath: `/a${i}`, destPath: `/b${i}` });
      useUndoStore.getState().commitTransaction('/base', 3);
    }
    expect(useUndoStore.getState().transactions).toHaveLength(3);
    expect(useUndoStore.getState().transactions[0].entries[0].sourcePath).toBe('/a2');
  });

  it('commitTransaction with maxUndos=0 drops the pending transaction without saving', () => {
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/a', destPath: '/b' });
    useUndoStore.getState().commitTransaction('/base', 0);
    expect(useUndoStore.getState().pendingTransaction).toBeNull();
    expect(useUndoStore.getState().transactions).toHaveLength(0);
  });

  it('undoTransaction reverses rename entries via fs.rename', async () => {
    const renameMock = vi.fn().mockResolvedValue(undefined);
    useUndoStore.getState().setFs(createMockFsAdapter({ rename: renameMock }));
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/old', destPath: '/new' });
    useUndoStore.getState().commitTransaction('/base');
    const id = useUndoStore.getState().transactions[0].id;
    const results = await useUndoStore.getState().undoTransaction(id);
    expect(renameMock).toHaveBeenCalledWith('/new', '/old');
    expect(results).toEqual([{ entry: { type: 'rename', sourcePath: '/old', destPath: '/new' }, success: true }]);
    expect(useUndoStore.getState().transactions).toHaveLength(0);
  });

  it('undoTransaction reverses create entries via fs.unlink', async () => {
    const unlinkMock = vi.fn().mockResolvedValue(undefined);
    useUndoStore.getState().setFs(createMockFsAdapter({ unlink: unlinkMock }));
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'create', sourcePath: '/x', destPath: '/x' });
    useUndoStore.getState().commitTransaction('/base');
    const id = useUndoStore.getState().transactions[0].id;
    await useUndoStore.getState().undoTransaction(id);
    expect(unlinkMock).toHaveBeenCalledWith('/x');
  });

  it('undoTransaction reverses delete entries by re-writing content', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    useUndoStore.getState().setFs(createMockFsAdapter({ writeFile: writeMock }));
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'delete', sourcePath: '/x.nfo', destPath: null, content: 'BODY' });
    useUndoStore.getState().commitTransaction('/base');
    const id = useUndoStore.getState().transactions[0].id;
    await useUndoStore.getState().undoTransaction(id);
    expect(writeMock).toHaveBeenCalledWith('/x.nfo', 'BODY', 'utf-8');
  });

  it('undoTransaction keeps failed entries in a retry transaction', async () => {
    const renameMock = vi.fn().mockRejectedValueOnce(new Error('EBUSY'));
    useUndoStore.getState().setFs(createMockFsAdapter({ rename: renameMock }));
    useUndoStore.getState().beginTransaction();
    useUndoStore.getState().addEntry({ type: 'rename', sourcePath: '/a', destPath: '/b' });
    useUndoStore.getState().commitTransaction('/base');
    const id = useUndoStore.getState().transactions[0].id;
    const results = await useUndoStore.getState().undoTransaction(id);
    expect(results[0].success).toBe(false);
    expect(useUndoStore.getState().transactions).toHaveLength(1);
    // Retry transaction has a fresh id
    expect(useUndoStore.getState().transactions[0].id).not.toBe(id);
  });
});
```

(The exact assertions mirror the existing test file's coverage; this rewrite uses the singleton API.)

- [ ] **Step 3: Update App.tsx**

In `src/renderer/App.tsx`:

Replace:
```ts
import { createUndoStore } from '../stores/undoStore';
```

with:
```ts
import { useUndoStore } from '../stores/undoStore';
```

Delete:
```ts
const undoStoreRef = useRef(createUndoStore(fs));
```

In `src/renderer/components/UndoModal.tsx`, drop the `undoStore` prop from `UndoModalProps`. Inside the component, import `useUndoStore` directly. Replace any subscriptions like `useStore(undoStore, (s) => s.transactions)` with `useUndoStore((s) => s.transactions)`. Replace any `undoStore.getState().X` with `useUndoStore.getState().X`.

In `src/renderer/App.tsx`, simplify the `<UndoModal>` JSX (drop the `undoStore` prop):

```tsx
<UndoModal
  visible={showUndo}
  onClose={() => setShowUndo(false)}
  onRescan={handleRescan}
/>
```

The `<Renamer>` JSX call sites also drop their `undoStore={undoStoreRef.current}` prop (Step 4 below removes the prop from `RenamerProps`). After Steps 3 and 4, `undoStoreRef` is unused — delete the `useRef(createUndoStore(fs))` line as the final part of this step.

- [ ] **Step 4: Update Renamer.tsx**

In `src/renderer/components/Renamer.tsx`:

Drop the `undoStore` prop from `RenamerProps` and the destructure on the function signature.

Replace each `undoStore?.getState().X(...)` call inside `handleRename` with `useUndoStore.getState().X(...)`. Add the import:

```ts
import { useUndoStore } from '../../stores/undoStore';
```

`handleRename`'s body becomes (the changed parts):

```ts
useUndoStore.getState().beginTransaction();
result.entries.forEach((e) => useUndoStore.getState().addEntry(e));
useUndoStore.getState().commitTransaction(currentFile.folder, config.maxUndos);
```

Drop `undoStore` from the `useCallback` deps array.

In `App.tsx`, drop the `undoStore` prop from both `<Renamer>` JSX call sites.

- [ ] **Step 5: Update component tests**

In `__tests__/components/UndoModal.test.tsx`, replace `createUndoStore(fs)` with the singleton API. Each test follows this pattern:

```ts
import { useUndoStore } from '../../src/stores/undoStore';
import { createMockFsAdapter } from '../../src/adapters/fs';

beforeEach(() => {
  useUndoStore.setState({ transactions: [], pendingTransaction: null });
  useUndoStore.getState().setFs(createMockFsAdapter());
});

// Wherever the test previously did `<UndoModal undoStore={store} ... />`, drop the prop.
// Wherever it did `store.getState().X`, use `useUndoStore.getState().X`.
```

Open the file, walk through each `it(...)` block, and apply the pattern. Tests typically: render `<UndoModal>`, drive state via `useUndoStore.getState()`, assert.

In `__tests__/integration/renamePipeline.test.ts`: replace `const undoStore = createUndoStore(fs);` with `useUndoStore.getState().setFs(fs);` and use `useUndoStore.getState()` everywhere `undoStore.getState()` appeared. Reset state in `beforeEach` with `useUndoStore.setState({ transactions: [], pendingTransaction: null })`.

- [ ] **Step 6: Run the suite**

Run: `npm test`
Expected: all green.

Run: `npx tsc --noEmit 2>&1 | grep -E "App.tsx|Renamer.tsx|UndoModal|undoStore"`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/stores/undoStore.ts src/renderer/App.tsx src/renderer/components/Renamer.tsx \
        src/renderer/components/UndoModal.tsx \
        __tests__/stores/undoStore.test.ts __tests__/components/UndoModal.test.tsx \
        __tests__/integration/renamePipeline.test.ts
git commit -m "refactor: convert undoStore to a singleton; drop undoStore prop on Renamer"
```

---

## Task 4: `configStore` → singleton with `setFs`

**Files:**
- Modify: `src/stores/configStore.ts`
- Modify: `src/renderer/index.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `__tests__/stores/configStore.test.ts`
- Modify: `__tests__/App.test.tsx`, `__tests__/renderer/App.test.tsx`, `__tests__/integration/dualRenamer.test.tsx`, `__tests__/components/OptionsModal.test.tsx`, `__tests__/renderer/Renamer.test.tsx`

- [ ] **Step 1: Convert the store**

Replace `src/stores/configStore.ts`:

```ts
import { create } from 'zustand';
import { createElectronFsAdapter, type FsAdapter } from '../adapters/fs';
import type { ZeebConfig } from '../types';
import { DEFAULT_CONFIG } from '../services/configDefaults';
import { DEFAULT_MPAA_MAP } from '../utils/defaultTerms';

export { DEFAULT_CONFIG };

const CONFIG_FILENAME = 'zeeb-config.json';

interface ConfigStoreState {
  config: ZeebConfig;
  load: () => Promise<void>;
  save: () => Promise<void>;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
  setFs: (adapter: FsAdapter) => void;
}

let fs: FsAdapter = createElectronFsAdapter();
let configPath: string | null = null;

async function getConfigPath(): Promise<string> {
  if (!configPath) {
    const dir = await fs.getConfigDir();
    configPath = `${dir}/${CONFIG_FILENAME}`;
  }
  return configPath;
}

export const useConfigStore = create<ConfigStoreState>((set, get) => ({
  config: { ...DEFAULT_CONFIG },

  async load() {
    const path = await getConfigPath();
    const fileExists = await fs.exists(path);
    if (fileExists) {
      const json = await fs.readFile(path, 'utf8');
      try {
        const saved = JSON.parse(json) as Record<string, unknown>;
        if (Array.isArray(saved.keepTerms)) {
          saved.keepTerms = (saved.keepTerms as unknown[]).map((t) =>
            Array.isArray(t) ? t : [t, t],
          );
        }
        if (saved.mpaaMap && !Array.isArray(saved.mpaaMap)) {
          const entries = Object.entries(saved.mpaaMap as Record<string, string>);
          saved.mpaaMap = entries.length > 0 ? entries : DEFAULT_MPAA_MAP;
        } else if (Array.isArray(saved.mpaaMap) && (saved.mpaaMap as unknown[]).length === 0) {
          saved.mpaaMap = DEFAULT_MPAA_MAP;
        }
        set({ config: { ...DEFAULT_CONFIG, ...(saved as Partial<ZeebConfig>) } });
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

  updateConfig(partial) {
    set((state) => ({ config: { ...state.config, ...partial } }));
  },

  setFs(adapter) {
    fs = adapter;
    configPath = null; // reset cached path so next getConfigPath uses the new fs
  },
}));
```

`createConfigStore`, `initConfigStore`, `getConfigStore` are removed. `useConfigStore` is now the singleton hook directly.

- [ ] **Step 2: Update store tests**

In `__tests__/stores/configStore.test.ts`, replace the import and `beforeEach` pattern. Each `describe` block follows:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConfigStore, DEFAULT_CONFIG } from '../../src/stores/configStore';
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
    useConfigStore.getState().setFs(fs);
    useConfigStore.setState({ config: { ...DEFAULT_CONFIG } });
  });

  it('initializes with defaults when no config file exists', async () => {
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().config.formatStandard).toBe(DEFAULT_CONFIG.formatStandard);
  });

  it('loads config from JSON file', async () => {
    const saved = { ...DEFAULT_CONFIG, removeThe: true };
    (fs.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(saved));
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().config.removeThe).toBe(true);
  });

  it('saves config to JSON file', async () => {
    await useConfigStore.getState().load();
    useConfigStore.getState().updateConfig({ removeThe: true });
    await useConfigStore.getState().save();
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('zeeb-config.json'),
      expect.stringContaining('"removeThe": true'),
      'utf8',
    );
  });

  it('merges partial updates without losing other fields', async () => {
    await useConfigStore.getState().load();
    const original = useConfigStore.getState().config.formatStandard;
    useConfigStore.getState().updateConfig({ removeThe: true });
    expect(useConfigStore.getState().config.formatStandard).toBe(original);
  });
});
```

For the `mpaaMap migration` and `keepTerms migration` describe blocks, use the same pattern: set up a mock fs in `beforeEach` via `useConfigStore.getState().setFs(fs)`, drive `load()`, assert via `useConfigStore.getState().config.X`. Walk through each existing test and apply mechanically.

- [ ] **Step 3: Update `index.tsx`**

In `src/renderer/index.tsx`:

```ts
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createElectronFsAdapter } from '../adapters/fs';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const fs = createElectronFsAdapter();

const root = createRoot(document.getElementById('root')!);
root.render(
  <ErrorBoundary>
    <App fs={fs} />
  </ErrorBoundary>,
);
```

`initConfigStore(fs)` is gone. The store self-initializes with `createElectronFsAdapter()` at module load.

- [ ] **Step 4: Update App.tsx**

In `src/renderer/App.tsx`:

Replace:
```ts
import { useConfigStore, getConfigStore } from '../stores/configStore';
```

with:
```ts
import { useConfigStore } from '../stores/configStore';
```

Replace `getConfigStore().getState()` with `useConfigStore.getState()` everywhere it appears (currently 3 sites: lines 68, 80, 201).

- [ ] **Step 5: Update integration/component tests**

For each of:
- `__tests__/App.test.tsx`
- `__tests__/renderer/App.test.tsx`
- `__tests__/integration/dualRenamer.test.tsx`
- `__tests__/components/OptionsModal.test.tsx`
- `__tests__/renderer/Renamer.test.tsx`

Replace:
```ts
import { initConfigStore } from '../src/stores/configStore'; // or relative path
// ...
initConfigStore(mockFs);
```

with:
```ts
import { useConfigStore } from '../src/stores/configStore'; // or relative path
// ...
useConfigStore.getState().setFs(mockFs);
```

- [ ] **Step 6: Run the suite**

Run: `npm test`
Expected: all green.

Run: `npx tsc --noEmit 2>&1 | grep -E "configStore|App.tsx|index.tsx"`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/stores/configStore.ts src/renderer/index.tsx src/renderer/App.tsx \
        __tests__/stores/configStore.test.ts \
        __tests__/App.test.tsx __tests__/renderer/App.test.tsx \
        __tests__/integration/dualRenamer.test.tsx \
        __tests__/components/OptionsModal.test.tsx \
        __tests__/renderer/Renamer.test.tsx
git commit -m "refactor: convert configStore to a singleton with setFs"
```

---

## Task 5: PlatformAdapter — interface + impl + mock factory

**Files:**
- Create: `src/adapters/platform.ts`
- Create: `__tests__/adapters/platform.test.ts`

Pure addition. No call sites changed yet.

- [ ] **Step 1: Write the failing test**

Create `__tests__/adapters/platform.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createMockPlatformAdapter } from '../../src/adapters/platform';

describe('createMockPlatformAdapter', () => {
  it('returns a fully populated adapter when called with no overrides', () => {
    const p = createMockPlatformAdapter();
    expect(typeof p.menu.onOptions).toBe('function');
    expect(typeof p.menu.sendWebViewState).toBe('function');
    expect(typeof p.appMeta.getPath).toBe('function');
    expect(typeof p.appMeta.getVersion).toBe('function');
    expect(typeof p.update.onUpdateAvailable).toBe('function');
    expect(typeof p.update.downloadUpdate).toBe('function');
    expect(typeof p.imdb.suggest).toBe('function');
    expect(typeof p.dialog.openDirectory).toBe('function');
  });

  it('lets callers override individual sub-adapter methods', async () => {
    const customSuggest = async () => [];
    const p = createMockPlatformAdapter({
      imdb: { suggest: customSuggest },
    });
    expect(p.imdb.suggest).toBe(customSuggest);
    // Other sub-adapters still default
    expect(typeof p.menu.onOptions).toBe('function');
  });

  it('default mock methods are no-ops returning safe values', async () => {
    const p = createMockPlatformAdapter();
    await expect(p.appMeta.getVersion()).resolves.toBeTypeOf('string');
    await expect(p.dialog.openDirectory()).resolves.toBeNull();
    await expect(p.imdb.suggest('q')).resolves.toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- platform`
Expected: FAIL — "Cannot find module".

- [ ] **Step 3: Implement the adapter**

Create `src/adapters/platform.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- platform`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/platform.ts __tests__/adapters/platform.test.ts
git commit -m "feat: add PlatformAdapter interface, electron impl, and mock factory"
```

---

## Task 6: PlatformContext

**Files:**
- Create: `src/renderer/PlatformContext.tsx`
- Modify: `src/renderer/index.tsx`

- [ ] **Step 1: Create the context provider and hook**

Create `src/renderer/PlatformContext.tsx`:

```tsx
import React, { createContext, useContext } from 'react';
import type { PlatformAdapter } from '../adapters/platform';

const PlatformContext = createContext<PlatformAdapter | null>(null);

interface PlatformProviderProps {
  value: PlatformAdapter;
  children: React.ReactNode;
}

export function PlatformProvider({ value, children }: PlatformProviderProps): React.JSX.Element {
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformAdapter {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error('usePlatform must be used inside <PlatformProvider>');
  }
  return ctx;
}
```

- [ ] **Step 2: Wrap App in `<PlatformProvider>`**

In `src/renderer/index.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createElectronFsAdapter } from '../adapters/fs';
import { createElectronPlatformAdapter } from '../adapters/platform';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlatformProvider } from './PlatformContext';
import './index.css';

const fs = createElectronFsAdapter();
const platform = createElectronPlatformAdapter();

const root = createRoot(document.getElementById('root')!);
root.render(
  <ErrorBoundary>
    <PlatformProvider value={platform}>
      <App fs={fs} />
    </PlatformProvider>
  </ErrorBoundary>,
);
```

- [ ] **Step 3: Run the suite (no behavioral change yet)**

Run: `npm test`
Expected: all green. No consumers reach for `usePlatform()` yet, so existing tests are unaffected.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/PlatformContext.tsx src/renderer/index.tsx
git commit -m "feat: add PlatformProvider and usePlatform hook; wire at renderer root"
```

---

## Task 7: Migrate `App.tsx` and modal components to `usePlatform`

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/AboutModal.tsx`
- Modify: `src/renderer/components/UpdateModal.tsx`
- Modify: `src/renderer/components/ReleaseNotes.tsx`
- Modify: `__tests__/App.test.tsx`, `__tests__/renderer/App.test.tsx`, `__tests__/integration/dualRenamer.test.tsx`

- [ ] **Step 1: Replace `window.zeeb*` in App.tsx**

In `src/renderer/App.tsx`:

Add the import:

```ts
import { usePlatform } from './PlatformContext';
```

Inside the `App` function body, near the top:

```ts
const platform = usePlatform();
```

Then replace each `window.zeeb*` reference (10 sites in App.tsx):

| Old | New |
|---|---|
| `window.zeebApp.getVersion()` | `platform.appMeta.getVersion()` |
| `window.zeebMenu.sendWebViewState(...)` | `platform.menu.sendWebViewState(...)` |
| `window.zeebMenu.onOptions(...)` | `platform.menu.onOptions(...)` |
| `window.zeebMenu.onUndoRename(...)` | `platform.menu.onUndoRename(...)` |
| `window.zeebMenu.onToggleWebView(...)` | `platform.menu.onToggleWebView(...)` |
| `window.zeebMenu.onReleaseNotes(...)` | `platform.menu.onReleaseNotes(...)` |
| `window.zeebMenu.onOpenFolder(...)` | `platform.menu.onOpenFolder(...)` |
| `window.zeebMenu.onAbout(...)` | `platform.menu.onAbout(...)` |
| `window.zeebUpdate.onUpdateAvailable(...)` | `platform.update.onUpdateAvailable(...)` |

Add `platform` to the dependency arrays of any `useEffect`/`useCallback` that closes over it.

- [ ] **Step 2: Migrate AboutModal**

In `src/renderer/components/AboutModal.tsx`, add the import and use `usePlatform`:

```ts
import { usePlatform } from '../PlatformContext';
// inside component:
const platform = usePlatform();
// replace:
//   onClick={() => window.zeebUpdate.openExternal('https://sourceforge.net/projects/zeeb/')}
// with:
//   onClick={() => platform.update.openExternal('https://sourceforge.net/projects/zeeb/')}
```

- [ ] **Step 3: Migrate UpdateModal**

In `src/renderer/components/UpdateModal.tsx`, replace 5 `window.zeebUpdate.X` references with `platform.update.X`. Add `usePlatform` import and call. Add `platform` to relevant dep arrays.

- [ ] **Step 4: Migrate ReleaseNotes**

In `src/renderer/components/ReleaseNotes.tsx`, replace `window.zeebApp.getReleaseNotes()` with `platform.appMeta.getReleaseNotes()`. Add `usePlatform` import.

- [ ] **Step 5: Update tests**

For `__tests__/App.test.tsx`:

Replace:
```ts
Object.defineProperty(window, 'zeebMenu', {
  value: { onOptions: vi.fn(...), ... },
  writable: true, configurable: true,
});
Object.defineProperty(window, 'zeebApp', { ... });
Object.defineProperty(window, 'zeebUpdate', { ... });
// etc.
```

with:
```ts
import { PlatformProvider } from '../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../src/adapters/platform';

let optionsCallback: (() => void) | null = null;
let undoRenameCallback: (() => void) | null = null;
let toggleWebViewCallback: (() => void) | null = null;

const platform = createMockPlatformAdapter({
  menu: {
    onOptions: vi.fn((cb) => { optionsCallback = cb; }),
    onUndoRename: vi.fn((cb) => { undoRenameCallback = cb; }),
    onToggleWebView: vi.fn((cb) => { toggleWebViewCallback = cb; }),
  },
});
```

Wrap `<App fs={mockFs} />` in `<PlatformProvider value={platform}>` for each `render(...)` call.

Repeat for `__tests__/renderer/App.test.tsx` and `__tests__/integration/dualRenamer.test.tsx`. Both use the same `Object.defineProperty(window, 'zeebMenu', ...)` boilerplate — replace with `<PlatformProvider value={createMockPlatformAdapter({...})}>`.

- [ ] **Step 6: Run the suite**

Run: `npm test`
Expected: all green.

Run: `grep -rn "window\.zeeb" src/renderer/App.tsx src/renderer/components/AboutModal.tsx src/renderer/components/UpdateModal.tsx src/renderer/components/ReleaseNotes.tsx`
Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/App.tsx src/renderer/components/AboutModal.tsx \
        src/renderer/components/UpdateModal.tsx src/renderer/components/ReleaseNotes.tsx \
        __tests__/App.test.tsx __tests__/renderer/App.test.tsx \
        __tests__/integration/dualRenamer.test.tsx
git commit -m "refactor: route App, AboutModal, UpdateModal, ReleaseNotes through PlatformAdapter"
```

---

## Task 8: Migrate Renamer.tsx + useImdbWebview to `usePlatform`

**Files:**
- Modify: `src/renderer/components/Renamer.tsx`
- Modify: `src/renderer/hooks/useImdbWebview.ts`
- Modify: `__tests__/renderer/Renamer.test.tsx` (if present)

- [ ] **Step 1: Update `useImdbWebview`**

In `src/renderer/hooks/useImdbWebview.ts`:

Add import:
```ts
import { usePlatform } from '../PlatformContext';
```

Inside the hook, near the top:
```ts
const platform = usePlatform();
```

Replace:
```ts
useEffect(() => {
  window.zeebApp.getWebviewPreloadPath().then(setWebviewPreloadPath);
}, []);
```

with:
```ts
useEffect(() => {
  platform.appMeta.getWebviewPreloadPath().then(setWebviewPreloadPath);
}, [platform]);
```

- [ ] **Step 2: Update Renamer.tsx**

In `src/renderer/components/Renamer.tsx`:

Add import:
```ts
import { usePlatform } from '../PlatformContext';
```

Inside the component:
```ts
const platform = usePlatform();
```

Replace:
```ts
const doSearch = useCallback(async (query: string) => {
  if (!query.trim()) return;
  const results = await window.zeebImdb.suggest(query);
  setMovieMatches(results);
}, [setMovieMatches]);
```

with:
```ts
const doSearch = useCallback(async (query: string) => {
  if (!query.trim()) return;
  const results = await platform.imdb.suggest(query);
  setMovieMatches(results);
}, [platform, setMovieMatches]);
```

- [ ] **Step 3: Update Renamer test**

In `__tests__/renderer/Renamer.test.tsx`, replace any `Object.defineProperty(window, 'zeebImdb', ...)` or `'zeebApp'` setup with a mock platform passed via `<PlatformProvider>`. Wrap the rendered Renamer in the provider.

If the test file doesn't currently configure `zeebImdb`/`zeebApp` (it may inherit globals from a setup file), search for any references. If none, just wrap in `<PlatformProvider value={createMockPlatformAdapter()}>`.

- [ ] **Step 4: Run the suite**

Run: `npm test`
Expected: all green.

Run: `grep -rn "window\.zeeb" src/renderer/components/Renamer.tsx src/renderer/hooks/useImdbWebview.ts`
Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/Renamer.tsx src/renderer/hooks/useImdbWebview.ts \
        __tests__/renderer/Renamer.test.tsx
git commit -m "refactor: route Renamer and useImdbWebview through PlatformAdapter"
```

---

## Task 9: Migrate FolderBrowser, BrowseInput, ImdbSection + final cleanup

**Files:**
- Modify: `src/renderer/components/FolderBrowser.tsx`
- Modify: `src/renderer/components/options/BrowseInput.tsx`
- Modify: `src/renderer/components/options/ImdbSection.tsx`

- [ ] **Step 1: Migrate FolderBrowser**

In `src/renderer/components/FolderBrowser.tsx`:

Replace:
```ts
const handleBrowse = async (): Promise<void> => {
  const zeebDialog = (window as any).zeebDialog;
  if (zeebDialog) {
    const path = await zeebDialog.openDirectory();
    if (path) setFolderPath(path);
  }
};
```

with:
```ts
import { usePlatform } from '../PlatformContext';
// ...inside component:
const platform = usePlatform();

const handleBrowse = async (): Promise<void> => {
  const path = await platform.dialog.openDirectory();
  if (path) setFolderPath(path);
};
```

- [ ] **Step 2: Migrate BrowseInput**

In `src/renderer/components/options/BrowseInput.tsx`:

Replace:
```ts
const path = mode === 'directory'
  ? await window.zeebDialog.openDirectory()
  : await window.zeebDialog.openFile();
```

with:
```ts
import { usePlatform } from '../../PlatformContext';
// ...inside component:
const platform = usePlatform();

// Inside the existing handler:
const path = mode === 'directory'
  ? await platform.dialog.openDirectory()
  : await platform.dialog.openFile();
```

- [ ] **Step 3: Migrate ImdbSection**

In `src/renderer/components/options/ImdbSection.tsx`:

Replace:
```ts
onClick={() => window.zeebUpdate.openExternal('https://www.themoviedb.org/settings/api')}
```

with:
```ts
import { usePlatform } from '../../PlatformContext';
// ...inside component:
const platform = usePlatform();

// In the JSX:
onClick={() => platform.update.openExternal('https://www.themoviedb.org/settings/api')}
```

- [ ] **Step 4: Update component tests for BrowseInput / FolderBrowser**

If `__tests__/components/options/BrowseInput.test.tsx` or `__tests__/components/FolderBrowser.test.tsx` reach for `window.zeebDialog`, wrap their renders in `<PlatformProvider value={createMockPlatformAdapter({ dialog: { openDirectory: vi.fn().mockResolvedValue(...) } })}>`. Search the test files; apply if needed.

- [ ] **Step 5: Final grep — verify no `window.zeeb*` left in renderer**

Run: `grep -rn "window\.zeeb" src/renderer`
Expected: empty output.

Run: `grep -rn "window\.zeeb" __tests__`
Expected: only references inside platform-adapter test setup or comments — no `Object.defineProperty(window, 'zeeb*', ...)` anywhere.

If anything matches, address before committing.

- [ ] **Step 6: Run full suite + lint + typecheck**

Run: `npm test`
Expected: all green.

Run: `npm run lint`
Expected: 0 errors. Warning count should not have increased relative to post-Spec-B baseline.

Run: `npx tsc --noEmit`
Expected: no new errors in any touched file.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/FolderBrowser.tsx \
        src/renderer/components/options/BrowseInput.tsx \
        src/renderer/components/options/ImdbSection.tsx \
        __tests__/components/options/BrowseInput.test.tsx \
        __tests__/components/FolderBrowser.test.tsx
git commit -m "refactor: route FolderBrowser, BrowseInput, ImdbSection through PlatformAdapter"
```

---

## Final verification

- [ ] **Tests:** `npm test` — all green.
- [ ] **Lint:** `npm run lint` — 0 errors.
- [ ] **Typecheck:** `npx tsc --noEmit` — no new errors in touched files.
- [ ] **No `window.zeeb*` in renderer:** `grep -rn "window\.zeeb" src/renderer` — empty.
- [ ] **No `Object.defineProperty(window, 'zeeb*'...)` in tests:** `grep -rn "Object.defineProperty.*zeeb" __tests__` — empty.
- [ ] **Single zustand pattern:** stores other than `renamerStore` all use `create()`.
- [ ] **Manual smoke:** scan a folder, interleave-rename two files, undo, options modal opens, format tester works, app version + release notes display.

## Out of scope

- Folding `FsAdapter` into `PlatformAdapter` (separate interfaces per spec).
- ESLint rules to enforce no-`window.zeeb*` (manual grep is sufficient for go-live).
- Reorganizing the preload-side namespaces.
- `renamerStore` factory — preserved per spec (genuinely per-instance).
- Changelog pipeline cleanup.
- TODO.md feature work.
