# Decompose Renamer Design Spec

## Goal

Pull `src/renderer/components/Renamer.tsx` (currently 685 lines) below ~250 by extracting four focused hooks and one pure-ish service. Add a top-level ErrorBoundary with reset/copy. Make the rename pipeline extraction behavior-preserving by construction via golden-master tests.

## Context

Spec A (`2026-05-02-tidy-and-tighten-design.md`) shipped the pre-launch tidy pass. Renamer.tsx is the largest and riskiest file in the app — `handleRename` (lines 408–556) inlines the entire fs-modifying flow with no direct unit-test coverage, and the surrounding ~10 effects + 4 callbacks bundle webview lifecycle, IMDB extraction, format derivation, poster fetching, and auto-select logic into one component.

This spec covers items 4 and 12 from the original review. Spec C (state model unification + PlatformAdapter) follows.

There are no existing users; behavioral changes are constrained to those explicitly approved during brainstorming (toast on rename failure).

---

## Section 1: File map

**Create:**
- `src/services/renamePipeline.ts` — `executeRename(args): Promise<{ entries, finalPath, finalFolder }>` orchestrating the 5 fs operations currently inlined in `handleRename`.
- `src/renderer/hooks/useImdbWebview.ts` — webview ref, all event listeners, navigation modes, IPC parsing, zoom application, extraction-pattern push, tester-request handler.
- `src/renderer/hooks/useFilenamePreview.ts` — metadata + parts + config → previewFilename derivation.
- `src/renderer/hooks/usePosterFetch.ts` — TMDB poster fetch + selectedPosterIndex state.
- `src/renderer/hooks/useAutoSelect.ts` — NFO-driven auto-navigate + year-match auto-select.
- `src/renderer/components/ErrorBoundary.tsx` — class component with reset (reload) + copy-error buttons.
- `__tests__/services/renamePipeline.test.ts` — branch-coverage tests, written against current `handleRename` first (golden master), then run unchanged against extracted pipeline.
- `__tests__/components/ErrorBoundary.test.tsx`

**Modify:**
- `src/renderer/components/Renamer.tsx` — slimmed to ~200 lines: hook calls + JSX + a thin `handleRename` that calls `executeRename`, drives undo, and toasts on failure.
- `src/renderer/index.tsx` — wrap `<App />` in `<ErrorBoundary>`.

---

## Section 2: Pipeline interface

```ts
interface ExecuteRenameArgs {
  fs: FsAdapter;
  currentFile: MovieFile;
  previewFilename: string;
  metadata: MovieMetadata;
  posterRemotePath: string | null;  // pre-resolved poster path (e.g. "/abc.jpg"), null if none
  selectedAka: string | null;       // null if useAka was false
  config: ZeebConfig;
  platform: 'mac' | 'win';          // chosen by caller from navigator.userAgent
}

interface ExecuteRenameResult {
  entries: UndoEntry[];
  finalPath: string;
  finalFolder: string;  // folder containing the file post-rename (may differ if folder was renamed)
}

export async function executeRename(args: ExecuteRenameArgs): Promise<ExecuteRenameResult>;
```

**Properties:**
- Pure orchestrator: takes inputs, returns outputs, throws on any fs failure.
- No coupling to `undoStore`, `notify`, or React state.
- Computes paths internally (separator detection, poster folder calculation, URL file extension by platform).
- Handles all the existing branches: subtitle rename, folder rename, URL file (Mac webloc vs Windows .url), NFO inclusion, NFO delete-after, poster save with optional separate poster format, DVD vs file mode, AKA vs standard format.

**Caller responsibilities (in `Renamer.handleRename`):**
- `beginTransaction()` → `entries.forEach(addEntry)` → `commitTransaction(folder, maxUndos)` on success.
- On throw: `notify('error', 'Rename failed: <reason>')`. Don't commit. Still `advance()`.
- Logging via `createLogger(fs, config.logFilePath)` if `config.logFilePath` is set.
- The `onFileRenamed` callback into `App.tsx`.

**Semantic note.** Today, partial entries on failure end up in `pendingTransaction` but never reach `transactions[]` (no commit), so they were never user-visible. The new shape makes this explicit by holding entries in the pipeline result and committing only on full success. No user-observable change.

---

## Section 3: Hook interfaces

```ts
function useImdbWebview(args: {
  webviewEl: WebviewTag | null;
  config: ZeebConfig;
  instanceId: number;
  currentFile: MovieFile | null;
  fs: FsAdapter;
  onTitleData: (data: MovieMetadata) => void;
  onAkasReceived: (akas: string[]) => void;
  onSelectedTtChange: (tt: string) => void;
}): {
  urlInput: string;
  setUrlInput: (s: string) => void;
  navigateToTitle: (tt: string) => void;
  navigateToUrl: (url: string) => void;
  goBack: () => void;
  webviewPreloadPath: string;
};
```

Owns: `webviewReady` ref, `navigationMode` ref, `dom-ready` / `did-navigate` / `ipc-message` / `render-process-gone` listeners, `set-extraction-patterns` send, `setZoomFactor`, NFO-driven auto-navigate (when `currentFile.nfoPath` exists and contains a `tt#`), tester-request handler (only fires when `instanceId === 0`), the 10-second tester timeout. Reads tester store directly (`useTesterStore`); doesn't take it as a prop because it's a global singleton. Calls `setTesterError` and `setTesterResult` from the tester store on tester completion.

```ts
function useFilenamePreview(args: {
  metadata: MovieMetadata | null;
  currentFile: MovieFile | null;
  searchParts: SearchPart[];
  useAka: boolean;
  selectedAka: string;
  config: ZeebConfig;
  setPreviewFilename: (s: string) => void;
}): void;
```

Single effect: when any input changes, derive the preview filename and push via `setPreviewFilename`. Returns void; the value lives in `renamerStore` so manual edits (via `RenamePreview.onPreviewChange`) still work the same way.

```ts
function usePosterFetch(args: {
  metadata: MovieMetadata | null;
  config: ZeebConfig;
  setPosterPaths: (paths: string[]) => void;
}): {
  selectedPosterIndex: number | null;
  setSelectedPosterIndex: (i: number | null) => void;
};
```

Owns the local `selectedPosterIndex` state and the TMDB fetch effect. Resets index to 0 (or null) when poster paths change.

```ts
function useAutoSelect(args: {
  currentFile: MovieFile | null;
  webviewEl: WebviewTag | null;
  fs: FsAdapter;
  config: ZeebConfig;
  movieMatches: MovieMatch[];
  searchParts: SearchPart[];
  onSelectImdbTt: (tt: string) => void;   // setSelectedTt
  navigateToTitle: (tt: string) => void;  // from useImdbWebview
}): void;
```

Bundles two related effects:
1. **NFO auto-navigate** — when `currentFile` has an `nfoPath`, read it via `fs`, extract a `tt#` via `extractImdbFromNfo`, and if found: call `onSelectImdbTt` and `navigateToTitle`. Internal `nfoSelectedRef` tracks whether NFO selected something.
2. **Year auto-select** — when `movieMatches` arrives and `nfoSelectedRef` is false, find a year token in `searchParts` and pick the first match whose year matches; call `navigateToTitle` for it.

`navigateToTitle` is shared between the two hooks — passed in from `useImdbWebview`'s return.

---

## Section 4: ErrorBoundary

`src/renderer/components/ErrorBoundary.tsx`. React class component (still the only way to catch render errors).

**Props:** `{ children: React.ReactNode }`.

**State:** `{ error: Error | null }`.

**Render when error:**
- Heading: "Something went wrong."
- Subline: error name + message.
- Pre-formatted block: first 5 frames of `error.stack`.
- "Reload" button → `window.location.reload()`.
- "Copy error" button → `navigator.clipboard.writeText(stack)` + temporary text change to "Copied".
- Plain CSS — no Tailwind dependency from the boundary itself in case Tailwind is what crashed; use inline styles.

**Wiring.** In `src/renderer/index.tsx`, wrap `<App fs={fs} />` in `<ErrorBoundary>`.

---

## Section 5: Test strategy (golden master)

Before extracting `executeRename`, write `__tests__/services/renamePipeline.test.ts` with twelve branch-coverage tests. Each test uses `createMockFsAdapter` and asserts the sequence of fs calls and the returned entries/paths.

**Test list:**
1. Plain file rename, no subtitles, no folder rename, no URL file, no poster.
2. File rename + subtitle rename (multiple subtitles, mixed extensions).
3. File rename + folder rename enabled, current folder name differs from new base.
4. File rename + URL file with original path included.
5. File rename + URL file + NFO included + `deleteNfoAfterInclude` true.
6. File rename + URL file on Mac (`navigator.userAgent.includes('Macintosh')` → `.webloc`).
7. DVD folder rename (no extension, `isDvdFolder=true`, `separateDvdFormat` on).
8. AKA selected — `formatAka` used; preview format different.
9. Poster save: standard format, default size.
10. Poster save: `separatePosterFormat` true with `<title>` interpolation.
11. Poster save: DVD with `posterInDvdFolder=false` saves to parent folder.
12. Failure mid-pipeline (e.g., `fs.rename` rejects mid-way) — pipeline throws, no commit, no full entries.

**Process:**
1. Add a temporary helper inside `Renamer.tsx`: factor the body of `handleRename` into a private `_legacyExecuteRename(args)` function with the same `ExecuteRenameArgs`/`ExecuteRenameResult` signature, but undoStore/log/callback wiring removed (those stay in `handleRename`'s caller code). Verify by inspection that the helper preserves the original control flow and operation order; nothing in the helper is rewritten or simplified at this stage.
2. Write the 12 tests pointing at `_legacyExecuteRename`. Get them green.
3. Create `src/services/renamePipeline.ts` with the same shape; copy logic from the helper.
4. Switch the test imports to point at the new module. Re-run. Must still be green.
5. Delete `_legacyExecuteRename`; replace `handleRename`'s body with the new shape (calls `executeRename`, drives undo, toasts on failure).

**Why this order.** Tests against the live behavior first, extraction second, swap third. If steps 4 or 5 introduce a regression, the tests catch it because they were written against the original behavior, not the refactored version.

**Mac webloc test.** Test 6 needs to vary `navigator.userAgent`. In the pipeline, replace the inline `navigator.userAgent.includes('Macintosh')` check with a `platform: 'mac' | 'win'` field in `ExecuteRenameArgs` derived by the caller from `navigator.userAgent`. This makes the test trivial (pass `'mac'`) and the pipeline platform-agnostic.

---

## Section 6: Renamer.tsx — final shape

```tsx
function Renamer({ ... }: RenamerProps) {
  const storeRef = useRef(createRenamerStore());
  const [webviewEl, setWebviewEl] = useState<WebviewTag | null>(null);
  const [useAka, setUseAka] = useState(false);
  const [selectedAka, setSelectedAka] = useState('');
  const [nfoViewerOpen, setNfoViewerOpen] = useState(false);
  const [nfoContent, setNfoContent] = useState('');
  const [selectedTt, setSelectedTt] = useState('');

  // Store subscriptions (renamerStore, configStore, testerStore) — unchanged

  const {
    urlInput, setUrlInput, navigateToTitle, navigateToUrl, goBack, webviewPreloadPath,
  } = useImdbWebview({
    webviewEl, config, instanceId, currentFile, fs,
    onTitleData: setMetadata,
    onAkasReceived: appendAkas,
    onSelectedTtChange: setSelectedTt,
  });

  useFilenamePreview({
    metadata, currentFile, searchParts, useAka, selectedAka, config, setPreviewFilename,
  });

  const { selectedPosterIndex, setSelectedPosterIndex } = usePosterFetch({
    metadata, config, setPosterPaths,
  });

  useAutoSelect({
    currentFile, webviewEl, fs, config, movieMatches, searchParts,
    onSelectImdbTt: setSelectedTt,
    navigateToTitle,
  });

  // ~6 small handler callbacks (handleSearch, handlePartStateChange, etc.) unchanged

  const handleRename = useCallback(async () => {
    if (!currentFile || !previewFilename || !metadata) return;
    const posterRemotePath =
      selectedPosterIndex != null && posterPaths.length > 0
        ? posterPaths[selectedPosterIndex] : null;
    const platform: 'mac' | 'win' =
      navigator.userAgent.includes('Macintosh') ? 'mac' : 'win';

    try {
      const result = await executeRename({
        fs, currentFile, previewFilename, metadata, posterRemotePath,
        selectedAka: useAka ? selectedAka : null, config, platform,
      });

      undoStore?.getState().beginTransaction();
      result.entries.forEach((e) => undoStore?.getState().addEntry(e));
      undoStore?.getState().commitTransaction(currentFile.folder, config.maxUndos);

      onFileRenamed?.(currentFile.id, previewFilename, result.finalPath);

      if (config.logFilePath) {
        await createLogger(fs, config.logFilePath)
          .log('rename', currentFile.nativePath, result.finalPath);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      useNotificationStore.getState().notify('error', `Rename failed: ${msg}`);
    }
    advance();
  }, [/* deps */]);

  // JSX — substantively unchanged from current ~180 lines
  return ( ... );
}
```

---

## Section 7: Sequencing inside the PR

1. **ErrorBoundary** — independent, easy first commit. Lands wrapping `<App />`. Includes its component test.
2. **Golden-master test scaffold** — extract `_legacyExecuteRename` helper inside Renamer.tsx, add the 12 tests. Tests green against live behavior.
3. **Extract `services/renamePipeline.ts`** — create the module, copy logic, switch test imports. Still green.
4. **Replace `handleRename` body** — delete `_legacyExecuteRename`; thin `handleRename` calls `executeRename`. Still green. Toast wiring lands here.
5. **Extract `useFilenamePreview`** — smallest, isolated effect. Move + invoke. Still green.
6. **Extract `usePosterFetch`** — moves the TMDB effect and the `selectedPosterIndex` state out.
7. **Extract `useAutoSelect`** — bundles two effects + nfo ref.
8. **Extract `useImdbWebview`** — last because it's the largest hook and benefits from a quiet Renamer when we touch it.
9. **Final pass** — remove dead local state, simplify imports, run lint. Manual smoke test.

Commits 1–4 land the high-value, risk-controlled work. Commits 5–8 are mechanical hook extractions that can each be reviewed independently.

---

## Section 8: Out of scope

- All Spec C items: dual-renamer state model unification, zustand pattern unification (`testerStore` and `notificationStore` stay singletons; `configStore`, `fileStore`, `undoStore`, `renamerStore` stay factories), PlatformAdapter generalization.
- Fixing the existing `// eslint-disable-next-line react-hooks/exhaustive-deps` at year-auto-select — preserved as-is when extracted into `useAutoSelect`. Real fix is its own work.
- Behavioral changes to rename logic beyond the failure toast (halting advance on failure was rejected during brainstorming).
- Changing `undoStore`'s `beginTransaction`/`addEntry`/`commitTransaction` API even though the new shape no longer needs partial entries.
- TODO.md feature work.

## Success criteria

- `Renamer.tsx` ≤ 250 lines.
- `npm test` green; new pipeline tests cover all 12 branches.
- `npm run lint` clean (0 errors); warning count not increased.
- `executeRename` is called from exactly one place (Renamer.tsx).
- ErrorBoundary triggers on a deliberately-thrown render error during manual smoke test.
- Manual smoke: scan a folder, search, rename a file with all options on (URL file with original + NFO + delete-NFO, poster save with separate poster format, folder rename), undo it. Force a failure (e.g., point output at a read-only path) and confirm a toast appears and the file index still advances.
