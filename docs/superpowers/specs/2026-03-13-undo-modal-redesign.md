# Undo Modal Redesign & Menu Cleanup

## Goal

Redesign undo to be user-selectable (not LIFO), fix Ctrl+Z hijacking, and clean up File menu.

## Changes

### 1. Menu Changes

**File menu** — replace "Undo" (CmdOrCtrl+Z) with:
- `Undo Rename...` — no accelerator, sends `menu:undo-rename` IPC, opens UndoModal
- `Toggle Web View` — no accelerator, sends `menu:toggle-webview` IPC, has checkmark reflecting `showWebView` config state. Renderer sends `webview-state` IPC to main when `showWebView` changes so the menu checkmark stays in sync.

**Edit menu** — keep as `{ role: 'editMenu' }` (standard Electron undo/redo for text fields). Removing the custom CmdOrCtrl+Z from File menu restores standard Ctrl+Z behavior.

**Preload:**
- Add to `zeebMenu`: `onUndoRename`, `onToggleWebView`
- Remove from `zeebMenu`: `onUndo`
- Add to `zeebDialog` (or new `zeebIpc`): `sendWebViewState(visible: boolean)` — renderer-to-main IPC for checkmark sync

**App.tsx:**
- Remove the `onUndo` handler (lines 68-72) that called `undoTransaction(txns[txns.length-1].id)`)
- Remove `handleUndo` callback (lines 183-188) and its usage as `onUndo` prop
- Add `onUndoRename` → `setShowUndo(true)` (fixes existing bug: modal was never openable)
- Add `onToggleWebView` → toggle `showWebView` config and call `sendWebViewState`

### 2. Data Model

Add `basePath` to `RenameTransaction`:

```typescript
export interface RenameTransaction {
  id: string;
  timestamp: number;
  basePath: string;  // scanned folder root for relative path display
  entries: UndoEntry[];
}
```

`commitTransaction` signature changes to `commitTransaction(basePath: string, maxUndos?: number)`. Callers (Renamer.tsx rename pipeline) pass the scanned folder path. The inline `UndoStoreLike` type in `Renamer.tsx` must also be updated.

### 3. undoTransaction Return Type

`undoTransaction` changes from `Promise<void>` (throws on partial failure) to returning per-entry results:

```typescript
interface UndoResult {
  entry: UndoEntry;
  success: boolean;
  error?: string;
}

undoTransaction(id: string): Promise<UndoResult[]>
```

On full success, the transaction is removed from the store. On partial failure, the original transaction is replaced with a new one containing only the failed entries (same `basePath`, new `id` and `timestamp`). The function no longer throws.

### 4. UndoModal Redesign

**Props change:** Remove `onUndo: (id: string) => void`. Add:
- `undoStore` — store ref so modal calls `undoTransaction` directly
- `onRescan: () => void` — called on close if any undos happened

**Internal state:**
- `expandedIds: Set<string>` — which transactions are expanded
- `undoResults: Map<string, UndoResult[]>` — keyed by transaction ID
- `didUndo: boolean` — set true when any undo completes

**Collapsed row:** Shows movie names + file count + expand chevron + UNDO button:

```
▶ Movie (2024), Show S01E01 — 3 files        [UNDO]
```

Movie names are extracted from destination filenames: strip path, strip extension to get the stem. Group entries by stem, show unique stems. If >3 unique names, show first 2 + "+N more".

**Expanded row:** Shows entries with paths relative to `basePath`:

```
▼ Another Movie (2023) — 2 files              [UNDO]
   rename: Sub/Another.Movie.2023.mkv → Sub/Another Movie (2023).mkv
   rename: Sub/Another.Movie.2023.srt → Sub/Another Movie (2023).srt
```

Entry type display:
- `rename`: `old → new`
- `create`: `filename (will delete)`
- `delete`: `filename (will restore)`

**After clicking UNDO:** Per-file results shown inline, UNDO button becomes disabled "DONE":

```
▼ Another Movie (2023) — 2 files              [DONE]
   ✓ rename: Sub/Another.Movie.2023.mkv
   ✗ rename: Sub/Another.Movie.2023.srt — file not found
```

- Full success: transaction removed from list after ~1 second delay
- Partial failure: store replaces original transaction with failed-entries-only transaction. Modal shows results. User can retry the new transaction.

**On modal close:** If `didUndo` is true, call `onRescan()`. Reset `undoResults` and `didUndo`.

### 5. Rescan Wiring

`App.tsx` passes `onRescan` to UndoModal. The callback re-runs `scanDirectory` with the last used folder path and recursion mode, updating the file store. It does NOT change view, reset config, or reset file indices — just refreshes the file list in place.

## Files to Modify

- `src/main/index.ts` — menu template: remove "Undo", add "Undo Rename...", "Toggle Web View" with checkmark; add `webview-state` IPC listener to update checkmark
- `src/preload/main.ts` — add `onUndoRename`, `onToggleWebView`, `sendWebViewState`; remove `onUndo`
- `src/renderer/App.tsx` — remove `onUndo`/`handleUndo`, add `onUndoRename`/`onToggleWebView`, pass `undoStore`+`onRescan` to UndoModal
- `src/renderer/components/UndoModal.tsx` — full redesign: expandable rows, movie names, per-file results, didUndo tracking
- `src/types/index.ts` — add `basePath` to `RenameTransaction`
- `src/stores/undoStore.ts` — `commitTransaction(basePath, maxUndos?)`, `undoTransaction` returns `UndoResult[]` and replaces partial-failure transactions
- `src/renderer/components/Renamer.tsx` — update `UndoStoreLike` type, pass `basePath` to `commitTransaction`

## Testing

- **Menu** (`__tests__/main/`): "Undo Rename..." sends `menu:undo-rename`, "Toggle Web View" sends `menu:toggle-webview`, checkmark updates on `webview-state` IPC
- **Preload** (`__tests__/preload/preload.test.ts`): `onUndoRename` and `onToggleWebView` exposed, `onUndo` removed, `sendWebViewState` exposed
- **App** (`__tests__/App.test.tsx`): `onUndoRename` sets `showUndo` true, `onToggleWebView` toggles config, no Ctrl+Z hijack
- **UndoModal** (`__tests__/components/UndoModal.test.tsx`):
  - Expand/collapse toggles detail view
  - Movie name extraction from filenames (with deduplication, truncation)
  - Relative path display using `basePath`
  - Undo success: results shown, transaction removed after delay (mock timers)
  - Undo partial failure: results shown, failed entries kept
  - `onRescan` called on close only if `didUndo` is true
  - Not called if no undos performed
- **undoStore** (`__tests__/stores/undoStore.test.ts`):
  - `commitTransaction` stores `basePath`
  - `undoTransaction` returns `UndoResult[]`
  - Full success removes transaction
  - Partial failure replaces transaction with failed entries only
  - No longer throws on partial failure
- **Renamer**: `commitTransaction` called with `basePath` argument
