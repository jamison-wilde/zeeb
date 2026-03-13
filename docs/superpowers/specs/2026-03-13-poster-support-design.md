# Poster Support

## Goal

Download and save movie poster images from TMDB during rename. Show a poster selection grid in the right panel — single row when webview is visible, multi-row grid when webview is hidden.

## Scope

**In scope:** TMDB poster search, poster grid UI, hover preview, poster save on rename, binary file write IPC, `posterSaveSize` config, TMDB API key editing.

**Out of scope:** NFO viewer (`nfoFolder`, `scanNfo`), any non-poster TMDB features.

---

## Section 1: TMDB API & Poster Fetching

**Existing:** `src/services/tmdbService.ts` has `searchPosters(imdbId, apiBase, apiKey)` returning raw TMDB poster path strings (e.g. `/abc123.jpg`), and `buildPosterUrl(posterPath, size)` constructing full CDN URLs.

**Changes:**

- Add `fetchPosterBinary(posterPath: string, size: string): Promise<Uint8Array>` — calls `buildPosterUrl` internally, fetches image bytes via `fetch()`, returns as `Uint8Array` for IPC transfer.
- No changes to `searchPosters` or `buildPosterUrl`.

**Store clarification:** `renamerStore.posterUrls` stores raw TMDB poster paths (not full URLs). PosterGrid calls `buildPosterUrl()` on each path to construct display URLs. Rename field name to `posterPaths` for clarity.

**Display flow:** When metadata arrives, Renamer calls `searchPosters()` and stores raw poster paths in `renamerStore.posterPaths`. PosterGrid renders `<img>` tags using `buildPosterUrl(path, 'w185')` for thumbnails and `buildPosterUrl(path, 'w780')` for hover previews. No binary fetching for display — just CDN URLs in `<img src>`.

**Save flow:** At rename time, `fetchPosterBinary()` downloads the user's configured size and sends the bytes through IPC.

**Error handling:** `searchPosters` failures (network error, bad API key, TMDB down) are caught silently — poster grid stays empty. `fetchPosterBinary` failures during rename are caught — rename continues without saving the poster (file rename, subtitles, URL file all still succeed). No rollback of other rename steps on poster failure.

---

## Section 2: Binary File Write IPC

**Current state:** `fs:writeFile` IPC handler only accepts text content with an encoding parameter. No binary file support.

**Changes:**

### FsAdapter (`src/adapters/fs.ts`)

Add `writeBinaryFile(path: string, data: Uint8Array): Promise<void>` to the `FsAdapter` interface and IPC implementation.

Add to `createMockFsAdapter` with `async () => {}` default (consistent with other mock methods). Tests needing call assertions use the overrides parameter: `createMockFsAdapter({ writeBinaryFile: vi.fn() })`.

### IPC handler (`src/main/ipc.ts`)

Add `fs:writeBinaryFile` handler: accepts `(filePath: string, data: Uint8Array)`, writes via `fs.writeFile(path, Buffer.from(data))`.

### Preload bridge

Expose through the existing `zeebApp.invoke` pattern — no new bridge methods needed, just a new channel name.

---

## Section 3: PosterGrid Component

New file: `src/renderer/components/PosterGrid.tsx`

### Props

```typescript
interface PosterGridProps {
  posterPaths: string[];       // raw TMDB paths, not full URLs
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  compact: boolean;            // true = single row, false = multi-row grid
}
```

### Behavior

- Renders `<img>` tags with `src={buildPosterUrl(path, 'w185')}`. Imports `buildPosterUrl` from `tmdbService.ts`.
- Selected poster: blue highlighted border. First poster auto-selected when list populates.
- **Empty state:** When `posterPaths` is empty, renders nothing (no placeholder text — the parent handles empty state if needed).
- **Hover preview:** Absolute-positioned overlay showing `buildPosterUrl(path, 'w780')`. The `w780` image loads on hover (browser caches subsequent hovers). Overlay dismissed on mouse leave.
- **Compact mode** (`compact={true}`): Single horizontal row, `overflow-x: auto` for scrolling.
- **Full mode** (`compact={false}`): `flex-wrap: wrap` grid filling available space.

### Integration in Renamer.tsx

- When `showWebView` is true: `<PosterGrid compact={true} />` below the webview.
- When `showWebView` is false: `<PosterGrid compact={false} />` replaces the "Poster view coming soon" placeholder. Webview remains in DOM hidden via CSS.
- Track `selectedPosterIndex` as local state in Renamer. Reset to `null` when file changes, auto-set to `0` when `posterPaths` populates.

### PosterPreview.tsx

Delete `src/renderer/components/PosterPreview.tsx` — replaced entirely by PosterGrid. Remove any imports.

---

## Section 4: Poster Save During Rename

**Pre-existing config fields** (already in `ZeebConfig` and `configDefaults`): `createPoster`, `posterInDvdFolder`, `separatePosterFormat`, `formatPoster`.

In `handleRename()` in `Renamer.tsx`, after URL file creation and before NFO deletion:

1. If `config.createPoster` is true and a poster is selected (`selectedPosterIndex !== null`):
   - Fetch binary: `fetchPosterBinary(posterPaths[selectedPosterIndex], config.posterSaveSize)`
   - Determine save path:
     - **Normal files:** Same folder as renamed file, base name + `.jpg`
     - **DVD folders, `posterInDvdFolder` true:** Inside the DVD folder
     - **DVD folders, `posterInDvdFolder` false:** Parent directory
   - If `config.separatePosterFormat` is true and `config.formatPoster` is non-empty, use the poster format string (via `interpolateFormat`) for the filename instead of the movie base name.
   - Write: `fs.writeBinaryFile(posterPath, data)`
   - Undo entry: `{ type: 'create', sourcePath: posterPath, destPath: posterPath }` — undo deletes it. The existing `'create'` undo handler calls `fs.unlink(entry.destPath)`, so setting both to the poster path is correct.
   - **On failure:** Catch the error, skip poster save, continue with the rest of the rename. Do not roll back file/subtitle/folder/URL renames.

### Ordering in handleRename

file rename → subtitle renames → folder rename → URL file creation → **poster save** → NFO deletion → commitTransaction

---

## Section 5: Options Modal — Poster Config

### Companions section (`CompanionsSection.tsx`)

Existing `createPoster` and `posterInDvdFolder` toggles stay. Add:

- **Poster Save Size** dropdown below existing poster toggles. Options: `w185`, `w342`, `w500`, `w780`, `original`. Disabled when `createPoster` is unchecked.
- **TMDB API Key** input field. Already exists as `config.tmdbApiKey` with a hardcoded default. Make it editable so users can substitute their own key.

### New config field

- `posterSaveSize: string` — one of `'w185' | 'w342' | 'w500' | 'w780' | 'original'`, default `'w780'`.
- Added to `ZeebConfig` interface, `configDefaults`.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/services/tmdbService.ts` | Add `fetchPosterBinary()` |
| `src/adapters/fs.ts` | Add `writeBinaryFile` to interface + mock |
| `src/main/ipc.ts` | Add `fs:writeBinaryFile` handler |
| `src/types/index.ts` | Add `posterSaveSize` to `ZeebConfig` |
| `src/services/configDefaults.ts` | Add `posterSaveSize: 'w780'` default |
| `src/renderer/components/PosterGrid.tsx` | **New** — poster grid component |
| `src/renderer/components/PosterPreview.tsx` | **Delete** — replaced by PosterGrid |
| `src/renderer/components/Renamer.tsx` | Integrate PosterGrid, poster save in handleRename, rename `posterUrls` → `posterPaths` |
| `src/stores/renamerStore.ts` | Rename `posterUrls` → `posterPaths` |
| `src/renderer/components/options/CompanionsSection.tsx` | Add posterSaveSize dropdown, TMDB API key input |

## Testing Strategy

1. **tmdbService:** Test `fetchPosterBinary` with mocked fetch — verify it returns `Uint8Array`. Test failure case returns/throws appropriately.
2. **PosterGrid:** Render with mock poster paths, verify thumbnails render with correct `w185` URLs, selection callback fires on click, selected poster has highlight class. Test empty `posterPaths` renders nothing. Test compact vs full mode layout (check CSS classes).
3. **PosterGrid hover:** Verify hovering a thumbnail renders an overlay `<img>` with `w780` URL, mouse leave removes overlay.
4. **Binary write IPC:** Test `fs:writeBinaryFile` handler writes buffer correctly.
5. **Integration:** Test handleRename calls `writeBinaryFile` when `createPoster` is true and poster selected; skips when false. Test poster fetch failure doesn't abort rename.
6. **CompanionsSection:** Test posterSaveSize dropdown renders, disabled state when createPoster unchecked. Test TMDB API key input renders and updates config.
