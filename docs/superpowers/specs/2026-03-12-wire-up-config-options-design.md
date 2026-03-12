# Wire Up Unimplemented Config Options

## Goal

Connect 14 config fields that currently exist as UI-only controls to their backing application logic. After this work, every option in the Options Modal (except TMDB API and poster download) will have real effects.

## Scope

**In scope:** htmlZoom, renameFolder, detectDvd, createUrlFile, includeNfoInUrl, deleteNfoAfterInclude, includeOriginalInUrl, maxUndos, theWord, showWebView, windowWidth, windowHeight, windowMaximized

**Out of scope:** urlTmdbApi, tmdbApiKey (TMDB), createPoster, posterInDvdFolder (poster support), nfoFolder, scanNfo (NFO viewer) — deferred to future iterations.

---

## Section 1: Rename-time URL file creation

**Fields:** `createUrlFile`, `includeNfoInUrl`, `deleteNfoAfterInclude`

**Current state:** `urlFileWriter.ts` has `generateUrlFileContent()` and `generateWeblocContent()` but neither is called from the rename handler.

**Changes:**

### Renamer.tsx — `handleRename()`

After subtitle renames and before `commitTransaction()`:

1. If `config.createUrlFile` is true:
   - Determine URL file path: same folder/base name as the renamed file, with `.url` extension (or `.webloc` on macOS)
   - Build IMDB URL from `metadata.tt` using `config.urlImdbTT`
   - If `config.includeNfoInUrl` is true and `currentFile.nfoPath` exists, read NFO content via `fs.readFile()`
   - If `config.includeOriginalInUrl` is true, pass `currentFile.nativePath` as `originalPath`
   - Call `generateUrlFileContent()` (or `generateWeblocContent()` on macOS) with the appropriate options
   - Write the file via `fs.writeFile()`
   - Add an undo entry (type: `'create'`) so undo deletes the URL file
2. If `config.deleteNfoAfterInclude` is true and NFO was included:
   - Delete the NFO file via `fs.unlink()` (new method on FsAdapter)
   - Add an undo entry to restore the NFO file (need to stash the content)

### urlFileWriter.ts — fix NFO key format

Change repeated `NFO=` keys to sequential `LINE0=`, `LINE1=`, etc.:

```
[NFO]
LINE0=first line of NFO
LINE1=second line of NFO
```

### urlFileWriter.ts — gate `[OriginalFilename]` section

Add `includeOriginal: boolean` to `UrlFileOptions`. Only emit the `[OriginalFilename]` section when true.

### urlFileWriter.ts — extend webloc format

Add optional `originalPath` and `nfoContent` parameters to `generateWeblocContent()`. Emit as extra plist `<key>`/`<string>` pairs when provided. macOS ignores unknown keys.

### undoStore — new entry type

Add `type: 'create'` to `UndoEntry` for files created during rename. Undo action: delete the created file. Add `type: 'delete'` for NFO deletions. Undo action: recreate the file with stashed content.

### FsAdapter — add missing methods

Add `unlink(path: string): Promise<void>` for file deletion. Add corresponding IPC handler and preload bridge method.

---

## Section 2: Format engine — `theWord`

**Field:** `theWord`

**Current state:** `applyTheHandling()` in `formatEngine.ts` hard-codes `"The"` in regex patterns. `config.theWord` exists but is unused.

**Changes:**

### formatEngine.ts

- Add `theWord: string` to `FormatOptions` interface
- Replace hard-coded `/^The\s+/i` with `new RegExp('^' + escapeRegExp(theWord) + '\\s+', 'i')`
- Replace hard-coded swap regex similarly
- Add `escapeRegExp(s: string): string` utility (inline or in a utils file)

### Renamer.tsx

- Pass `config.theWord` through to `interpolateFormat()` options

### FormatTesterSection.tsx

- Pass `config.theWord` through to `interpolateFormat()` options and `getTokenValue()`

---

## Section 3: Webview zoom — `htmlZoom`

**Field:** `htmlZoom`

**Current state:** `htmlZoom` is stored as a percentage (50-200) in config but never applied to the webview element.

**Changes:**

### Renamer.tsx

- Add a `useEffect` that watches `webviewEl` and `config.htmlZoom`
- On the webview's `dom-ready` event, call `webviewEl.setZoomFactor(config.htmlZoom / 100)`
- When `config.htmlZoom` changes (e.g., user updates in Options), re-apply `setZoomFactor()` if webview is ready

---

## Section 4: DVD detection toggle — `detectDvd`

**Field:** `detectDvd`

**Current state:** `fileScanner.ts` always calls `isDvdOrBluray()` on directories. The config flag is ignored.

**Changes:**

### fileScanner.ts — `scanDirectory()`

- Add `detectDvd: boolean` to the options parameter
- Before calling `isDvdOrBluray()`, check `if (!detectDvd)` — skip and treat the directory as a normal folder for recursion purposes

### App.tsx

- Pass `config.detectDvd` when calling `scanDirectory()`

---

## Section 5: Folder rename — `renameFolder`

**Field:** `renameFolder`

**Current state:** Only the file (and subtitles) are renamed. The parent folder is never renamed.

**Changes:**

### Renamer.tsx — `handleRename()`

After the main file rename, if `config.renameFolder` is true:

1. Compute target folder name: new file base name (without extension) becomes the folder name
2. Skip if folder is a root/drive path (e.g., `C:\` or `/`)
3. Skip if folder already has the target name
4. Rename the folder via `fs.rename(oldFolder, newFolder)`
5. Add an undo entry for the folder rename
6. Update all subsequent paths (for subtitle renames, URL file creation) to use the new folder path

### Ordering

Folder rename must happen **after** all file operations inside the folder complete (file rename, subtitle renames). URL file creation uses the new folder path.

---

## Section 6: Undo transaction limit — `maxUndos`

**Field:** `maxUndos`

**Current state:** `undoStore.ts` accumulates transactions without limit.

**Changes:**

### undoStore.ts — `commitTransaction()`

- Accept `maxUndos` as a parameter (or read from config at call time)
- After appending the new transaction, if `transactions.length > maxUndos` and `maxUndos > 0`, trim from the front
- When `maxUndos === 0`, skip recording entirely (don't create transactions)

### Renamer.tsx

- Pass `config.maxUndos` when calling `commitTransaction()`

---

## Section 7: Webview visibility — `showWebView`

**Field:** `showWebView`

**Current state:** The webview is always visible in the right panel.

**Changes:**

### Renamer.tsx

- The `<webview>` element must remain in the DOM for metadata extraction to work (IPC navigation and `extractTitleData` depend on it)
- When `config.showWebView` is false:
  - Hide the webview via CSS (`position: absolute; left: -9999px; width: 1px; height: 1px`)
  - In the visible right panel area, render a centered placeholder: muted text "Poster view coming soon" with a subtle icon or border
- When `config.showWebView` is true: render webview normally (current behavior)

---

## Section 8: Window state persistence — `windowWidth`, `windowHeight`, `windowMaximized`

**Fields:** `windowWidth`, `windowHeight`, `windowMaximized`

**Current state:** `main/index.ts` hard-codes 1024x768. Config fields exist but are never read or written.

**Changes:**

### New IPC channels

- `config:get-window-state` — renderer sends saved window state to main on startup
- `config:save-window-state` — main sends updated dimensions to renderer for persistence

### main/index.ts — `createWindow()`

- After creating BrowserWindow with defaults (1024x768), listen for the renderer to send saved window state and apply it
- If `windowMaximized` is true, call `mainWindow.maximize()` after setting dimensions
- Listen for `resize`, `maximize`, `unmaximize`, and `close` events:
  - On `resize` (debounced ~500ms): if not maximized, save current width/height
  - On `maximize`: save `windowMaximized: true`
  - On `unmaximize`: save `windowMaximized: false`
  - On `close`: save final state before window closes

### Renderer startup

- On app mount, read config window state and send to main via IPC
- Main process applies dimensions

### Alternative approach (simpler)

Since the main process already has access to `fs` via Node, it could read the config file directly on startup before creating the window. This avoids the IPC round-trip. The renderer would still handle saving on resize events via the existing configStore → save flow.

**Recommended: main process reads config file directly on startup.** Saves via IPC from renderer on window events.

---

## Section 9: Gate original filename in URL files — `includeOriginalInUrl`

**Field:** `includeOriginalInUrl`

**Current state:** `generateUrlFileContent()` always writes the `[OriginalFilename]` section.

**Changes:**

Covered in Section 1. The `includeOriginal` boolean in `UrlFileOptions` gates both the `[OriginalFilename]` INI section and the webloc plist key.

---

## Testing Strategy

Each section gets unit tests:

1. **URL file creation:** Test `generateUrlFileContent()` with/without NFO, with/without original. Test sequential `LINE0=`/`LINE1=` keys. Test webloc with extra keys. Integration test: mock rename handler verifying URL file write is called when `createUrlFile` is true and skipped when false.
2. **theWord:** Test `applyTheHandling()` with custom words like "Der", "Le", "Los".
3. **htmlZoom:** Test that `setZoomFactor` is called with correct value. (Webview mock.)
4. **detectDvd:** Test `scanDirectory()` with `detectDvd: false` — DVD folders should be treated as regular directories.
5. **renameFolder:** Test folder rename path computation, skip on root, skip on same name. Undo entry recorded.
6. **maxUndos:** Test trimming at limit. Test `maxUndos: 0` skips recording. Test `maxUndos: 1` keeps only latest.
7. **showWebView:** Test placeholder renders when false, webview visible when true.
8. **Window state:** Test main process reads config dimensions. Test debounced save on resize.
9. **includeOriginalInUrl:** Covered by URL file tests.

---

## Files Modified

| File | Sections |
|------|----------|
| `src/renderer/components/Renamer.tsx` | 1, 2, 3, 5, 6, 7 |
| `src/services/urlFileWriter.ts` | 1, 9 |
| `src/services/formatEngine.ts` | 2 |
| `src/services/fileScanner.ts` | 4 |
| `src/stores/undoStore.ts` | 1, 6 |
| `src/main/index.ts` | 8 |
| `src/main/ipc.ts` | 1, 8 |
| `src/adapters/fs.ts` | 1 |
| `src/preload/main.ts` | 1 |
| `src/renderer/App.tsx` | 4 |
| `src/renderer/components/options/FormatTesterSection.tsx` | 2 |
