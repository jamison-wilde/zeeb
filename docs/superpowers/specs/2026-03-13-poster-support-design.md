# Poster Support

## Goal

Download and save movie poster images from TMDB during rename. Show a poster selection grid in the right panel — single row when webview is visible, multi-row grid when webview is hidden.

## Scope

**In scope:** TMDB poster search, poster grid UI, hover preview, poster save on rename, binary file write IPC, `posterSaveSize` config, TMDB API key editing.

**Out of scope:** NFO viewer (`nfoFolder`, `scanNfo`), any non-poster TMDB features.

---

## Section 1: TMDB API & Poster Fetching

**Existing:** `src/services/tmdbService.ts` has `searchPosters(imdbId, apiBase, apiKey)` returning poster path strings, and `buildPosterUrl(posterPath, size)` constructing CDN URLs.

**Changes:**

- Add `fetchPosterBinary(posterPath: string, size: string): Promise<Uint8Array>` — fetches image bytes from TMDB CDN via `fetch()`, returns as `Uint8Array` for IPC transfer.
- No changes to `searchPosters` or `buildPosterUrl`.

**Display flow:** When metadata arrives, Renamer calls `searchPosters()` and stores poster paths in `renamerStore.posterUrls`. The PosterGrid component renders `<img>` tags using `buildPosterUrl(path, 'w185')` for thumbnails and `buildPosterUrl(path, 'w780')` for hover previews. No binary fetching for display — just CDN URLs in `<img src>`.

**Save flow:** At rename time, `fetchPosterBinary()` downloads the user's configured size and sends the bytes through IPC.

---

## Section 2: Binary File Write IPC

**Current state:** `fs:writeFile` IPC handler only accepts text content with an encoding parameter. No binary file support.

**Changes:**

### FsAdapter (`src/adapters/fs.ts`)

Add `writeBinaryFile(path: string, data: Uint8Array): Promise<void>` to the `FsAdapter` interface and IPC implementation.

Add to `createMockFsAdapter` with `vi.fn()` default.

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
  posterPaths: string[];
  apiBase: string;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  compact: boolean;  // true = single row, false = multi-row grid
}
```

### Behavior

- Renders `<img>` tags with `src={buildPosterUrl(path, 'w185')}`.
- Selected poster: blue highlighted border. First poster auto-selected when list populates.
- **Hover preview:** Absolute-positioned overlay showing `buildPosterUrl(path, 'w780')`. The `w780` image loads on hover (browser caches subsequent hovers).
- **Compact mode** (`compact={true}`): Single horizontal row, `overflow-x: auto` for scrolling.
- **Full mode** (`compact={false}`): `flex-wrap: wrap` grid filling available space.

### Integration in Renamer.tsx

- When `showWebView` is true: `<PosterGrid compact={true} />` below the webview.
- When `showWebView` is false: `<PosterGrid compact={false} />` replaces the "Poster view coming soon" placeholder. Webview remains in DOM hidden via CSS.

---

## Section 4: Poster Save During Rename

In `handleRename()` in `Renamer.tsx`, after URL file creation and before NFO deletion:

1. If `config.createPoster` is true and a poster is selected (`selectedPosterIndex !== null`):
   - Fetch binary: `fetchPosterBinary(posterPaths[selectedIndex], config.posterSaveSize)`
   - Determine save path:
     - **Normal files:** Same folder as renamed file, base name + `.jpg`
     - **DVD folders, `posterInDvdFolder` true:** Inside the DVD folder
     - **DVD folders, `posterInDvdFolder` false:** Parent directory
   - If `config.separatePosterFormat` is true and `config.formatPoster` is non-empty, use the poster format string (via `interpolateFormat`) for the filename instead of the movie base name.
   - Write: `fs.writeBinaryFile(posterPath, data)`
   - Undo entry: `{ type: 'create', sourcePath: posterPath, destPath: posterPath }` — undo deletes it.

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
| `src/renderer/components/Renamer.tsx` | Integrate PosterGrid, poster save in handleRename |
| `src/renderer/components/options/CompanionsSection.tsx` | Add posterSaveSize dropdown, TMDB API key input |

## Testing Strategy

1. **tmdbService:** Test `fetchPosterBinary` with mocked fetch — verify it returns `Uint8Array`.
2. **PosterGrid:** Render with mock poster paths, verify thumbnails render, selection callback fires, hover shows `w780` URL.
3. **Binary write IPC:** Test `fs:writeBinaryFile` handler writes buffer correctly.
4. **Integration:** Test handleRename calls `writeBinaryFile` when `createPoster` is true and poster selected; skips when false.
5. **CompanionsSection:** Test posterSaveSize dropdown renders, disabled state when createPoster unchecked.
