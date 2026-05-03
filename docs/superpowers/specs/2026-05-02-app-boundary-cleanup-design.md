# App Boundary Cleanup Design Spec

## Goal

Three independent cleanups at the App-level wiring boundary: replace the dual-renamer cursor state with a focused hook, unify the zustand patterns to one (with a single justified factory exception), and generalize the existing `FsAdapter` pattern to all renderer/preload IPC globals via a new `PlatformAdapter`.

## Context

Spec A (`2026-05-02-tidy-and-tighten-design.md`) and Spec B (`2026-05-02-decompose-renamer-design.md`) shipped. This is the third and final pre-launch refactor. Items 5, 6, 7 from the original review.

Item 6 (zustand unification) is largely cosmetic — the current mix isn't causing bugs. It's bundled here because it shares the "App boundary wiring" theme and removes ~6 lines of `useRef(create…)` boilerplate from `App.tsx` while making test setup more uniform.

There are no existing users; behavioral changes are not constrained by migration concerns.

---

## Section 1: Dual-cursor hook

**Problem.** `App.tsx` maintains `(fileIndex0, fileIndex1, activeRenamer)` and four near-duplicated handlers (`handleComplete0/1`, `handleFileSelect0/1`) plus an inline two-pass loop in `handleFolderSelected` for initial cursor placement. The skip-the-other-index logic appears in three places.

**Change.** New `src/renderer/hooks/useDualCursor.ts`:

```ts
interface UseDualCursorArgs {
  files: MovieFile[];
  isFileVisible: (f: { name: string }) => boolean;
}

interface DualCursor {
  active: 0 | 1;
  index0: number;
  index1: number;
  setFromList: (files: MovieFile[]) => void;   // initialize cursors after a folder scan
  advance: () => void;                          // active completes → move past + flip active
  selectAt: (clickedIndex: number) => void;     // user clicks a file in the list
}

export function useDualCursor(args: UseDualCursorArgs): DualCursor;
```

Internal state: `(active, index0, index1)` plus a private `findNextVisible(from, otherIdx)` helper.

`setFromList(files)` — called from `handleFolderSelected` after `setFiles(results)`. Walks the list to place index0 at the first visible file and index1 at the next visible file, sets `active = 0`.

`advance()` — moves the active cursor past its current file, skipping invisible files and the other cursor's index, then flips `active`.

`selectAt(clickedIndex)` — sets the active cursor to `clickedIndex`, moves the other cursor to the next visible file after `clickedIndex`. Matches current `handleFileSelect0/1` behavior.

**App.tsx becomes:**

```ts
const cursor = useDualCursor({ files, isFileVisible });
// ... after scanDirectory:
cursor.setFromList(results);
// in JSX:
<Renamer
  instanceId={0}
  fileIndex={cursor.index0}
  onComplete={cursor.advance}
  onFileSelect={cursor.selectAt}
  ...
/>
<Renamer
  instanceId={1}
  fileIndex={cursor.index1}
  onComplete={cursor.advance}
  onFileSelect={cursor.selectAt}
  ...
/>
```

The hook owns the active/inactive coordination; both Renamers receive the same callbacks.

**Tests:** New `__tests__/renderer/hooks/useDualCursor.test.ts` with three cases:
1. Initial state: `setFromList` skips invisible files and lands on the first two visible.
2. `advance` from active=0 sets active=1 and moves index0 past both `prev` and `index1`.
3. `selectAt(N)` updates active cursor and moves the other to the next visible file after N.

Existing `__tests__/integration/dualRenamer.test.tsx` keeps working — the user-visible behavior is identical.

**Net diff:** App.tsx loses ~50 lines.

---

## Section 2: Zustand pattern unification

**Final state.** All stores are `create()` singletons except `renamerStore`, which stays a factory because each `Renamer` instance legitimately owns its own state.

| Store | Today | After |
|---|---|---|
| `configStore` | singleton via `initConfigStore(fs)` | `create()` singleton with `setFs(adapter)` action |
| `undoStore` | factory taking fs, `useRef(createUndoStore(fs))` | `create()` singleton with `setFs(adapter)` action |
| `fileStore` | factory, `useRef(createFileStore())` | `create()` singleton |
| `testerStore` | `create()` singleton | unchanged |
| `notificationStore` | `create()` singleton | unchanged |
| `renamerStore` | factory, `useRef(createRenamerStore())` | unchanged |

**Mechanics for fs-needing stores.** Each store's module imports `createElectronFsAdapter` and creates a default fs at module load time. A `setFs(adapter: FsAdapter)` action lets tests swap in a mock. Production code never calls `setFs`.

```ts
// configStore.ts (sketch)
let fs: FsAdapter = createElectronFsAdapter();

export const useConfigStore = create<ConfigStoreState>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  async load() { /* uses module-level fs */ },
  async save() { /* uses module-level fs */ },
  updateConfig(partial) { set(...); },
  setFs(adapter: FsAdapter) { fs = adapter; },
}));
```

`createElectronFsAdapter()` reads `window.zeebFs` and `window.zeebApp` — these exist by the time the renderer entry runs. In test environments (jsdom), `setFs(createMockFsAdapter())` is called in `beforeEach`.

**Migrations:**
- `src/renderer/index.tsx` — drops `initConfigStore(fs)`. Stores self-initialize.
- `src/renderer/App.tsx` — drops `useRef(createFileStore())` and `useRef(createUndoStore(fs))`. Use `useFileStore` and `useUndoStore` directly. Drop the `getConfigStore` exported helper (no longer needed; inline `useConfigStore.getState()`).
- `src/renderer/components/Renamer.tsx` — drops the `undoStore` prop entirely. Reaches for `useUndoStore.getState()` directly inside `handleRename`.
- `src/stores/configStore.ts` — remove `createConfigStore(fs)`, `initConfigStore`, `getConfigStore`. Keep `useConfigStore` and `DEFAULT_CONFIG` exports. Add `setFs` action.
- `src/stores/undoStore.ts` — remove `createUndoStore(fs)`. Convert to `create()` singleton with `setFs` action.
- `src/stores/fileStore.ts` — remove `createFileStore()`. Convert to `create()` singleton.
- All test files using `initConfigStore(mockFs)` or `createConfigStore(mockFs)` — switch to `useConfigStore.getState().setFs(mockFs)` in `beforeEach`.

**Tests:** Existing tests are updated mechanically. No new tests required for the refactor itself; the existing store tests cover the behavior.

**Estimated churn:** ~60 lines across 4 store files, 2 renderer files, ~8 test files.

---

## Section 3: PlatformAdapter

**Problem.** `App.tsx`, `Renamer.tsx` (via `useImdbWebview`), and the renderer-side fs adapter reach directly for `window.zeebMenu`, `window.zeebApp`, `window.zeebUpdate`, `window.zeebImdb`, `window.zeebDialog`. Tests use `Object.defineProperty(window, 'zeebMenu', ...)` boilerplate. Future IPC additions inevitably grow the count of these globals.

**Change.** New `src/adapters/platform.ts` defines a `PlatformAdapter` umbrella with five sub-adapters. `FsAdapter` stays separate (established interface, separate file).

```ts
import type { MovieMatch } from '../types';

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
  onDownloadProgress(cb: (p: { percent: number; bytesDownloaded: number; totalBytes: number }) => void): () => void;
  onDownloadComplete(cb: (d: { filePath: string }) => void): () => void;
  onDownloadError(cb: (d: { message: string }) => void): () => void;
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

export function createElectronPlatformAdapter(): PlatformAdapter;
export function createMockPlatformAdapter(overrides?: PartialPlatform): PlatformAdapter;
```

Where `PartialPlatform` is a deep-partial type so tests can write `createMockPlatformAdapter({ menu: { onOptions: vi.fn(...) } })` and get sensible no-op defaults for everything else.

**Wiring:**
- `src/renderer/index.tsx` creates both adapters and threads them through:
  ```ts
  const fs = createElectronFsAdapter();
  const platform = createElectronPlatformAdapter();
  root.render(<ErrorBoundary><App fs={fs} platform={platform} /></ErrorBoundary>);
  ```
- `App.tsx` adds a `platform: PlatformAdapter` prop. Replaces every `window.zeebMenu.X` / `window.zeebApp.X` / `window.zeebUpdate.X` with the corresponding `platform.menu.X` / `platform.appMeta.X` / `platform.update.X`. About 12 call sites.
- `Renamer.tsx` accepts `platform` as a prop, passes to `useImdbWebview`. Replaces the inline `window.zeebImdb.suggest(query)` at the top of `doSearch` with `platform.imdb.suggest(query)`.
- `useImdbWebview.ts` adds `platform` to its args, replaces `window.zeebApp.getWebviewPreloadPath()` with `platform.appMeta.getWebviewPreloadPath()`.
- `FolderBrowser.tsx` (verify): if it touches `window.zeebDialog.openDirectory()`, route through `platform.dialog.openDirectory()`.

**Test cleanup.** `__tests__/App.test.tsx`, `__tests__/renderer/App.test.tsx`, and `__tests__/integration/dualRenamer.test.tsx` currently set up window globals via `Object.defineProperty(window, ...)`. They switch to:

```ts
const platform = createMockPlatformAdapter({
  menu: {
    onOptions: vi.fn((cb) => { optionsCallback = cb; }),
    // ... only what the test needs
  },
});
render(<App fs={mockFs} platform={platform} />);
```

The `Object.defineProperty` boilerplate disappears.

**Why FsAdapter stays separate.** Folding it into PlatformAdapter would force renaming every `fs` reference site in services (`fileScanner`, `fileRenamer`, `urlFileWriter`, `nfoParser`, `logger`, `legacyImporter`, `tmdbService`, etc.) to `platform.fs`. Massive churn for no real benefit — `fs` is already a well-defined boundary with consistent usage. PlatformAdapter wraps the *other* IPC surfaces.

**Net diff:** new 100-line adapter file, ~12 call sites changed in App.tsx, ~3 call sites changed in renderer-component code, ~4 test files cleaned up.

---

## Sequencing inside the PR

1. **`useDualCursor` hook** — independent, smallest first. Add hook test, update App.tsx, run integration tests.
2. **`fileStore` → singleton** — easy, no fs involved. Drop `useRef(createFileStore())` from App.tsx.
3. **`undoStore` → singleton** — drop the `undoStore` prop from `Renamer.tsx`; reach via singleton inside `handleRename`. Update tests.
4. **`configStore` → singleton with `setFs`** — biggest of the three store changes. Update `index.tsx` to drop `initConfigStore`. Update all test setups.
5. **PlatformAdapter — interface + electron impl + mock factory** — pure addition. No call sites changed yet. Add a small smoke test that the mock factory returns a fully populated object.
6. **PlatformAdapter wired through App.tsx** — replace `window.zeebMenu` / `zeebApp` / `zeebUpdate` calls. Update `App.test.tsx` and `renderer/App.test.tsx` mocks.
7. **PlatformAdapter wired through Renamer.tsx + useImdbWebview** — replace `window.zeebApp` / `window.zeebImdb`. Update Renamer tests and dualRenamer integration test.
8. **PlatformAdapter wired through FolderBrowser.tsx** — if it uses `window.zeebDialog`. Skip if not.
9. **Final pass** — grep `src/renderer/**` for `window.zeeb` references; only `src/adapters/platform.ts` and `src/adapters/fs.ts` should match. Run lint and tests.

---

## Out of scope

- Folding `FsAdapter` into `PlatformAdapter` (separate interfaces, separate file).
- Reorganizing the preload-side global names. `window.zeebMenu` etc. still exist on the preload contextBridge; only the renderer-side wrapping changes.
- Adding ESLint rules to forbid `window.zeeb*` direct access (could be done later; for now a manual grep verifies compliance).
- Behavioral changes anywhere.
- Spec-A/B follow-ups (changelog pipeline, Renamer JSX subcomponent extraction, etc.).
- TODO.md feature work.

## Success criteria

- App.tsx loses ~60 lines (dual cursor + dropped useRefs).
- Zero `window.zeeb*` references in `src/renderer/**` outside `src/adapters/platform.ts` and `src/adapters/fs.ts`.
- Zero `Object.defineProperty(window, 'zeeb*', ...)` in `__tests__/**`.
- Single zustand pattern across all stores except `renamerStore` (all `create()` singletons).
- `npm test` green; new `useDualCursor` tests pass.
- `npm run lint` — 0 errors; warning count not increased.
- Manual smoke: app launches, scans a folder, renames files in dual mode (interleaving), undo works, options modal opens, file index advances correctly when interleaving past the end of the visible list.
