# Open Movie Folder Modal — Design

Implements the "Open folder modal" screen added to `Zeeb Final Design.dc.html` in the
Claude Design project (local mirror: `tmp/zeeb-final-design.dc.html` + `tmp/support.js`).
The startup folder picker becomes a modal over the main window, and folder history
gains a per-folder recursion depth plus scan metadata.

## Decisions (resolved during brainstorming)

- **Trigger:** File → Open Folder (Ctrl+O) only; no toolbar or in-window button. The
  modal also opens automatically at startup.
- **Fresh-path depth default:** always `none`. History rows carry their own saved depth.
- **History model:** `folderHistory` entry array replaces `recentFolders` (approach A).
- **Legacy `config.recursionMode`:** stays in the type for import compat; nothing
  writes it anymore. Undo-rescan uses `folderHistory[0].depth`.

## 1. Data model & migration

```ts
type RecursionMode = 'none' | 'subfolders' | 'full';   // existing type

interface FolderHistoryEntry {
  path: string;
  depth: RecursionMode;
  fileCount: number | null;   // null until first scan under this model
  lastScanned: number | null; // epoch ms, null until first scan
}
```

- `ZeebConfig.folderHistory: FolderHistoryEntry[]` (default `[]`), most-recent-first,
  capped at 10. `recentFolders` is removed from the type.
- **Migration** in `configStore.load()` (same pattern as `keepTerms`/`mpaaMap`): a
  loaded config with legacy `recentFolders: string[]` and no `folderHistory` maps each
  string to `{ path, depth: loaded.recursionMode ?? 'none', fileCount: null,
  lastScanned: null }`. `legacyImporter` (Flex) produces the same shape.
- **Upsert on successful scan:** move/insert the entry to index 0 with the depth used,
  `fileCount` = result length, `lastScanned` = `Date.now()`; trim to 10. Path match is
  case-insensitive (Windows). `×` removes the entry. Both save immediately.

## 2. `OpenFolderModal` component

New `src/renderer/components/OpenFolderModal.tsx`; `FolderBrowser.tsx` is deleted and
its test coverage migrates to the new component's tests.

- **Chrome:** dim backdrop (`bg-black/60`), 680px panel, new `modal` surface color
  token (dark `#1f2125` / light `#ffffff`), `toggle-off` border, 8px radius, heavy
  shadow. Header: bold 12px "Open Movie Folder", right-aligned × close. Escape closes.
  Closing never mutates the loaded file list.
- **Path row:** mono path input on `well` bg with `accent-muted` border; segmented
  `None | Sub | Full` control (active segment = accent fill + on-accent text; inactive
  = ink-dim on transparent; 1px `toggle-off` dividers; tooltips keep the existing long
  descriptions); `Browse…` bordered-secondary; `List Movies` primary (disabled when
  the path is blank; Enter in the input triggers it).
- **History:** header label "History — ▶ lists with saved depth" (uppercase
  section-header treatment). Each row:
  - `▶` 20×16 chip (accent-muted blue bg, light-accent glyph), tooltip "List now with
    saved depth" — immediately scans with the row's saved depth.
  - Path (mono semibold, truncating), tooltip "Load into the row above" — clicking
    loads path + depth into the path row without scanning.
  - Dim meta `“{fileCount} files · scanned {relative}”` — omitted while either value
    is null.
  - Depth badge: tiny bold mono `None`/`Sub`/`Full` on `toggle-off` bg.
  - `×` — removes the entry from history.
- **Footer:** existing italic note about slow scans.
- **`formatRelativeTime(ms: number): string`** — pure util (`src/utils/relativeTime.ts`):
  "just now" (<60s), "N min ago", "N h ago", "yesterday", "N days ago" (<7d), else a
  locale date string.

## 3. App integration

- The `'folderBrowser' | 'process'` view switch in `App.tsx` is removed; the dual-
  Renamer layout always renders (it tolerates `files=[]`; the bottom filename bar
  already hides with no current file).
- New `showOpenFolder` state, initial `true` (startup opens the modal over the empty
  window). The `menu:open-folder` handler now only opens the modal — it no longer
  clears the file list.
- **Scan flow** (`List Movies` and `▶`): `scanDirectory` with the chosen depth →
  success: `setFiles`, reset cursor, upsert history, save config, close modal.
  Failure: error toast ("Folder listing failed"), modal stays open, history untouched.
- **Undo rescan** (`handleRescan`): uses `folderHistory[0]` — its path and its saved
  `depth` (fallback `'none'`), replacing the legacy global `recursionMode` read.

## 4. Error handling

- Scan throw/reject → toast + modal remains open; no history mutation.
- History entry for a now-missing path: scan fails per above; user removes it via ×.
- Config with malformed `folderHistory` values: entries missing `path` are dropped at
  load; missing `depth` defaults to `'none'`; missing metadata becomes null.

## 5. Testing

- `configStore`: legacy migration (strings + recursionMode → entries), pass-through of
  already-migrated configs, 10-entry cap, malformed-entry handling.
- `OpenFolderModal`: rows render badge + meta (meta omitted when null); ▶ → select
  with saved depth; path click → input + segmented control update, no scan; × →
  remove; List Movies disabled on blank path; Enter submits; Escape/× close; fresh
  path defaults to None.
- `relativeTime`: bucket boundaries.
- `App`: modal shown at startup; `menu:open-folder` reopens; successful scan closes
  modal and updates history; failed scan leaves it open; open no longer clears files.
- Full suite green before completion.

## Out of scope

Auto-rescan, path validation beyond the scan attempt, network-share caching,
persisting TT/Sample filters, any toolbar.
