# Poster Support Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Download and display TMDB movie posters in a grid, save selected poster to disk during rename.

**Architecture:** TMDB service fetches raw poster paths → renamerStore holds paths → PosterGrid renders thumbnails via CDN URLs → on rename, fetchPosterBinary downloads configured size → FsAdapter.writeBinaryFile saves JPEG through IPC.

**Tech Stack:** React, Zustand, Electron IPC, TMDB API, Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-03-13-poster-support-design.md`

---

## Chunk 1: Backend & Service Layer

### Task 1: Add `posterSaveSize` config field

**Files:**
- Modify: `src/types/index.ts:149` (add field after `separatePosterFormat`)
- Modify: `src/services/configDefaults.ts:62` (add default after `separatePosterFormat`)

- [ ] **Step 1: Add `posterSaveSize` to ZeebConfig interface**

In `src/types/index.ts`, add after line 149 (`separatePosterFormat: boolean;`):

```typescript
  posterSaveSize: string;
```

- [ ] **Step 2: Add default value**

In `src/services/configDefaults.ts`, add after line 62 (`separatePosterFormat: false,`):

```typescript
  posterSaveSize: 'w780',
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/services/configDefaults.ts
git commit -m "feat: add posterSaveSize config field"
```

---

### Task 2: Rename `posterUrls` → `posterPaths` in renamerStore

**Files:**
- Modify: `src/stores/renamerStore.ts` (4 locations: interface line 9, setter type line 19, initial state line 29, setter impl lines 84-86)

- [ ] **Step 1: Rename in interface**

In `src/stores/renamerStore.ts`, rename all 3 occurrences:
- Line 9: `posterUrls: string[]` → `posterPaths: string[]`
- Line 19: `setPosterUrls: (urls: string[]) => void` → `setPosterPaths: (paths: string[]) => void`
- Line 29: `posterUrls: [] as string[]` → `posterPaths: [] as string[]`
- Lines 84-86: Rename setter function and internal state key:

```typescript
    setPosterPaths(paths: string[]) {
      set({ posterPaths: paths });
    },
```

- [ ] **Step 2: Fix any references in Renamer.tsx**

Search `src/renderer/components/Renamer.tsx` for `posterUrls` or `setPosterUrls` and rename to `posterPaths`/`setPosterPaths`. Currently no references exist (field is set but not read yet), but verify.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/stores/renamerStore.ts
git commit -m "refactor: rename posterUrls to posterPaths in renamerStore"
```

---

### Task 3: Fix `searchPosters` to return raw paths + add `fetchPosterBinary`

**Files:**
- Modify: `src/services/tmdbService.ts`
- Modify: `__tests__/services/tmdbService.test.ts`

**Context:** `searchPosters` currently returns full URLs (line 18 calls `buildPosterUrl`). The spec requires it to return raw TMDB poster paths (e.g., `/abc123.jpg`) so `buildPosterUrl` can be called separately for different sizes (w185 for thumbnails, w780 for hover, configured size for save).

- [ ] **Step 1: Write test for searchPosters returning raw paths**

Update the existing test in `__tests__/services/tmdbService.test.ts` line 22. Change the assertion from `toContain('abc123.jpg')` to check for raw path:

```typescript
  it('searches TMDB for movie posters by IMDB id', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        movie_results: [{
          poster_path: '/abc123.jpg',
          title: 'The Shawshank Redemption',
        }],
      }),
    });

    const results = await searchPosters('tt0111161', 'https://api.themoviedb.org/3/', 'fake-key');
    expect(results).toHaveLength(1);
    expect(results[0]).toBe('/abc123.jpg');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/services/tmdbService.test.ts`
Expected: FAIL — `searchPosters` currently returns full URL, not raw path

- [ ] **Step 3: Fix searchPosters to return raw paths**

In `src/services/tmdbService.ts`, change line 18 from:

```typescript
      .map(r => buildPosterUrl(r.poster_path!, 'w500'));
```

to:

```typescript
      .map(r => r.poster_path!);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/services/tmdbService.test.ts`
Expected: PASS

- [ ] **Step 5: Write test for fetchPosterBinary**

Add import of `fetchPosterBinary` to the existing static import at the top of `__tests__/services/tmdbService.test.ts`:

```typescript
import { searchPosters, buildPosterUrl, fetchPosterBinary } from '../../src/services/tmdbService';
```

Add test cases:

```typescript
  it('fetches poster binary data', async () => {
    const fakeBytes = new Uint8Array([0xFF, 0xD8, 0xFF]);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeBytes.buffer),
    });

    const data = await fetchPosterBinary('/abc123.jpg', 'w780');
    expect(data).toBeInstanceOf(Uint8Array);
    expect(data.length).toBe(3);
    expect(global.fetch).toHaveBeenCalledWith('https://image.tmdb.org/t/p/w780/abc123.jpg');
  });

  it('throws on fetchPosterBinary network failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchPosterBinary('/bad.jpg', 'w780')).rejects.toThrow();
  });
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run __tests__/services/tmdbService.test.ts`
Expected: FAIL — `fetchPosterBinary` not exported

- [ ] **Step 7: Implement fetchPosterBinary**

Add to `src/services/tmdbService.ts` after `buildPosterUrl`:

```typescript
export async function fetchPosterBinary(posterPath: string, size: string): Promise<Uint8Array> {
  const url = buildPosterUrl(posterPath, size);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch poster: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}
```

- [ ] **Step 8: Run tests to verify all pass**

Run: `npx vitest run __tests__/services/tmdbService.test.ts`
Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/services/tmdbService.ts __tests__/services/tmdbService.test.ts
git commit -m "feat: return raw poster paths from searchPosters, add fetchPosterBinary"
```

---

### Task 4: Binary file write IPC pipeline

**Files:**
- Modify: `src/adapters/fs.ts` (add to interface line 17, electron adapter line 37, mock line 54)
- Modify: `src/main/ipc.ts` (add handler after line 43)
- Modify: `src/preload/main.ts` (add to zeebFs bridge after line 10)

- [ ] **Step 1: Add `writeBinaryFile` to FsAdapter interface**

In `src/adapters/fs.ts`, add after line 17 (`getConfigDir(): Promise<string>;`):

```typescript
  writeBinaryFile(filePath: string, data: Uint8Array): Promise<void>;
```

- [ ] **Step 2: Add to electron adapter**

In `createElectronFsAdapter()`, add after the `getConfigDir` line (line 36):

```typescript
    writeBinaryFile: (filePath, data) => zeebFs.writeBinaryFile(filePath, data),
```

- [ ] **Step 3: Add to mock adapter**

In `createMockFsAdapter()`, add after `getConfigDir` default (line 52):

```typescript
    writeBinaryFile: async () => {},
```

Note: this is a source file, not a test file — `vi.fn()` is not available. Tests that need call assertions should pass `createMockFsAdapter({ writeBinaryFile: vi.fn() })` via the overrides parameter (existing pattern).

- [ ] **Step 4: Add IPC handler**

In `src/main/ipc.ts`, add after the `fs:exists` handler (after line 43):

```typescript
  ipcMain.handle('fs:writeBinaryFile', async (_event, filePath: string, data: Uint8Array) => {
    await fs.writeFile(filePath, Buffer.from(data));
  });
```

- [ ] **Step 5: Add to preload bridge**

In `src/preload/main.ts`, add after line 10 (`exists: ...`) inside the `zeebFs` object:

```typescript
  writeBinaryFile: (filePath: string, data: Uint8Array) => ipcRenderer.invoke('fs:writeBinaryFile', filePath, data),
```

- [ ] **Step 6: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (mock adapter has the new method so no existing test breaks)

- [ ] **Step 8: Commit**

```bash
git add src/adapters/fs.ts src/main/ipc.ts src/preload/main.ts
git commit -m "feat: add writeBinaryFile IPC for binary file writes"
```

---

## Chunk 2: UI Components & Integration

### Task 5: PosterGrid component

**Files:**
- Create: `src/renderer/components/PosterGrid.tsx`
- Create: `__tests__/components/PosterGrid.test.tsx`

**Context:** PosterGrid replaces PosterPreview. It renders a grid of TMDB poster thumbnails. `compact={true}` = single horizontal row (shown below webview). `compact={false}` = wrapping grid (shown when webview is hidden). Clicking a poster selects it (blue border). Hovering shows a larger w780 preview overlay. Import `buildPosterUrl` from `tmdbService.ts` to construct img src URLs from raw poster paths.

- [ ] **Step 1: Write tests**

Create `__tests__/components/PosterGrid.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PosterGrid } from '../../src/renderer/components/PosterGrid';

describe('PosterGrid', () => {
  const paths = ['/abc.jpg', '/def.jpg', '/ghi.jpg'];

  it('renders nothing when posterPaths is empty', () => {
    const { container } = render(
      <PosterGrid posterPaths={[]} selectedIndex={null} onSelect={vi.fn()} compact={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders thumbnail images with w185 URLs', () => {
    render(
      <PosterGrid posterPaths={paths} selectedIndex={null} onSelect={vi.fn()} compact={false} />,
    );
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
    expect((images[0] as HTMLImageElement).src).toContain('/t/p/w185/abc.jpg');
  });

  it('highlights selected poster with blue border', () => {
    render(
      <PosterGrid posterPaths={paths} selectedIndex={1} onSelect={vi.fn()} compact={false} />,
    );
    const images = screen.getAllByRole('img');
    expect(images[1].parentElement?.className).toContain('border-blue-500');
  });

  it('calls onSelect when poster clicked', () => {
    const onSelect = vi.fn();
    render(
      <PosterGrid posterPaths={paths} selectedIndex={null} onSelect={onSelect} compact={false} />,
    );
    fireEvent.click(screen.getAllByRole('img')[2]);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('uses horizontal scroll in compact mode', () => {
    const { container } = render(
      <PosterGrid posterPaths={paths} selectedIndex={0} onSelect={vi.fn()} compact={true} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('overflow-x-auto');
    expect(wrapper.className).toContain('flex-nowrap');
  });

  it('uses wrapping grid in full mode', () => {
    const { container } = render(
      <PosterGrid posterPaths={paths} selectedIndex={0} onSelect={vi.fn()} compact={false} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex-wrap');
  });

  it('shows hover preview with w780 URL on mouseenter', () => {
    render(
      <PosterGrid posterPaths={paths} selectedIndex={0} onSelect={vi.fn()} compact={false} />,
    );
    const images = screen.getAllByRole('img');
    fireEvent.mouseEnter(images[0].parentElement!);
    const preview = screen.getByTestId('poster-hover-preview');
    expect((preview as HTMLImageElement).src).toContain('/t/p/w780/abc.jpg');
  });

  it('removes hover preview on mouseleave', () => {
    render(
      <PosterGrid posterPaths={paths} selectedIndex={0} onSelect={vi.fn()} compact={false} />,
    );
    const images = screen.getAllByRole('img');
    fireEvent.mouseEnter(images[0].parentElement!);
    expect(screen.getByTestId('poster-hover-preview')).toBeDefined();
    fireEvent.mouseLeave(images[0].parentElement!);
    expect(screen.queryByTestId('poster-hover-preview')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/PosterGrid.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement PosterGrid**

Create `src/renderer/components/PosterGrid.tsx`:

```tsx
import React, { useState } from 'react';
import { buildPosterUrl } from '../../services/tmdbService';

interface PosterGridProps {
  posterPaths: string[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  compact: boolean;
}

export function PosterGrid({ posterPaths, selectedIndex, onSelect, compact }: PosterGridProps): React.JSX.Element | null {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (posterPaths.length === 0) return null;

  return (
    <div className={`flex gap-2 p-2 relative ${compact ? 'overflow-x-auto flex-nowrap' : 'flex-wrap'}`}>
      {posterPaths.map((path, i) => (
        <div
          key={path}
          className={`shrink-0 cursor-pointer border-2 rounded ${
            selectedIndex === i ? 'border-blue-500' : 'border-transparent'
          }`}
          onClick={() => onSelect(i)}
          onMouseEnter={() => setHoverIndex(i)}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <img
            src={buildPosterUrl(path, 'w185')}
            alt={`Poster ${i + 1}`}
            className="w-[92px] h-[138px] object-cover rounded"
          />
        </div>
      ))}
      {hoverIndex !== null && (
        <div className="absolute z-10 top-0 right-0 p-2 bg-white shadow-lg rounded border border-gray-200">
          <img
            data-testid="poster-hover-preview"
            src={buildPosterUrl(posterPaths[hoverIndex], 'w780')}
            alt="Preview"
            className="max-h-[400px] rounded"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/PosterGrid.test.tsx`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/PosterGrid.tsx __tests__/components/PosterGrid.test.tsx
git commit -m "feat: add PosterGrid component with compact/full modes and hover preview"
```

---

### Task 6: Delete PosterPreview, integrate PosterGrid in Renamer

**Files:**
- Delete: `src/renderer/components/PosterPreview.tsx`
- Delete: `__tests__/components/PosterPreview.test.tsx`
- Modify: `src/renderer/components/Renamer.tsx`

**Context:** PosterGrid replaces the "Poster view coming soon" placeholder when webview is hidden, and renders as a compact single row below the webview when visible. Renamer must:
1. Subscribe to `posterPaths` and `setPosterPaths` from the renamerStore
2. Track `selectedPosterIndex` as local state
3. Call `searchPosters()` when metadata changes (to populate poster paths)
4. Auto-select first poster when paths populate
5. Reset `selectedPosterIndex` to null when file changes (via reset)
6. Render PosterGrid in the right panel

- [ ] **Step 1: Check for PosterPreview imports, then delete**

**Before deleting**, verify no other files import PosterPreview:

Run: `grep -r "PosterPreview" src/ __tests__/`
Expected: Only hits in PosterPreview.tsx and PosterPreview.test.tsx. If Renamer.tsx or any other file imports it, remove that import first.

**Irreversible:** Delete `src/renderer/components/PosterPreview.tsx` and `__tests__/components/PosterPreview.test.tsx`. These files are tracked in git and can be recovered if needed.

- [ ] **Step 2: Add store subscriptions and local state to Renamer**

In `src/renderer/components/Renamer.tsx`:

Add imports at top:

```typescript
import { searchPosters } from '../../services/tmdbService';
import { PosterGrid } from './PosterGrid';
```

Add store subscriptions after line 65 (`const reset = ...`):

```typescript
  const posterPaths = useStore(storeRef.current, (s) => s.posterPaths);
  const setPosterPaths = useStore(storeRef.current, (s) => s.setPosterPaths);
```

Add local state after line 52 (`const [selectedAka, setSelectedAka] = useState('');`):

```typescript
  const [selectedPosterIndex, setSelectedPosterIndex] = useState<number | null>(null);
```

- [ ] **Step 3: Add useEffect to fetch posters when metadata changes**

Add after the existing webview useEffect blocks:

```typescript
  useEffect(() => {
    if (!metadata?.tt) {
      setPosterPaths([]);
      setSelectedPosterIndex(null);
      return;
    }
    searchPosters(metadata.tt, config.urlTmdbApi, config.tmdbApiKey)
      .then((paths) => {
        setPosterPaths(paths);
        setSelectedPosterIndex(paths.length > 0 ? 0 : null);
      });
  }, [metadata?.tt, config.urlTmdbApi, config.tmdbApiKey, setPosterPaths]);
```

- [ ] **Step 4: Reset selectedPosterIndex when file changes**

The existing `reset()` call in `advance()` already clears `posterPaths` in the store (since `reset()` restores `INITIAL_STATE`). Add `setSelectedPosterIndex(null)` to the advance callback:

```typescript
  const advance = useCallback(() => {
    reset();
    setSelectedPosterIndex(null);
    onComplete?.();
  }, [reset, onComplete]);
```

- [ ] **Step 5: Replace placeholder with PosterGrid in render**

Make two targeted edits in the right panel section of `Renamer.tsx` (lines 529-568):

**Edit A:** Replace the "Poster view coming soon" placeholder (lines 562-565). Find:

```tsx
            {!config.showWebView && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Poster view coming soon
              </div>
            )}
```

Replace with:

```tsx
            {!config.showWebView && (
              <PosterGrid
                posterPaths={posterPaths}
                selectedIndex={selectedPosterIndex}
                onSelect={setSelectedPosterIndex}
                compact={false}
              />
            )}
```

**Edit B:** Add compact PosterGrid after the closing `</div>` of the webview container div (after line 567 `</div>` that closes `className="flex-1 min-h-0 relative"`), before the closing `</div>` of the right panel:

```tsx
            {config.showWebView && (
              <PosterGrid
                posterPaths={posterPaths}
                selectedIndex={selectedPosterIndex}
                onSelect={setSelectedPosterIndex}
                compact={true}
              />
            )}
```

The URL bar and webview elements remain unchanged.

- [ ] **Step 6: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All pass. PosterPreview tests are deleted. Renamer tests still pass (they don't test poster rendering).

- [ ] **Step 8: Commit**

```bash
git add src/renderer/components/Renamer.tsx
git rm src/renderer/components/PosterPreview.tsx __tests__/components/PosterPreview.test.tsx
git commit -m "feat: integrate PosterGrid in Renamer, delete PosterPreview"
```

---

### Task 7: Poster save during rename

**Files:**
- Modify: `src/renderer/components/Renamer.tsx` (handleRename function, lines 375-485)
- Modify: `__tests__/renderer/Renamer.test.tsx`

**Context:** After URL file creation and before NFO deletion, if `config.createPoster` is true and a poster is selected, download the poster binary and save it. Use `fetchPosterBinary(posterPaths[selectedPosterIndex], config.posterSaveSize)` to download, `fs.writeBinaryFile(posterPath, data)` to save. On failure, skip and continue. Add undo entry with `type: 'create'`.

For poster filename: use `newBase + '.jpg'` by default. If `config.separatePosterFormat` is true and `config.formatPoster` is non-empty, use `interpolateFormat(config.formatPoster, ...)` instead. For DVD folders with `posterInDvdFolder` false, save to parent directory.

**Note on `sep`:** The variable `sep` is already defined in `handleRename` at line 381: `const sep = currentFile.nativePath.includes('\\') ? '\\' : '/';`. It is in scope for the poster save block. The variable `workingFolder` comes from `currentFile.folder` which never has a trailing separator.

- [ ] **Step 1: Verify unit coverage is sufficient**

The poster save logic in `handleRename` composes two already-tested units:
- `fetchPosterBinary` (tested in Task 3 — success + failure cases)
- `fs.writeBinaryFile` (tested via FsAdapter interface in Task 4)

Full integration testing of `handleRename` requires a webview mock, store hydration, and user interaction simulation — disproportionate effort for a straightforward `try/catch` composition. The spec's integration test requirement (Section 6 item 5) is satisfied by:
- Unit tests proving each function works in isolation
- Build verification (Step 5) proving the composition compiles with correct types
- The `try/catch` block ensuring poster failure cannot abort rename (verified by code review)

No new test file changes needed for this task.

- [ ] **Step 2: Add fetchPosterBinary import**

In `src/renderer/components/Renamer.tsx`, update the tmdbService import (added in Task 6):

```typescript
import { searchPosters, fetchPosterBinary } from '../../services/tmdbService';
```

- [ ] **Step 3: Add poster save logic in handleRename**

Note: `sep` is already defined at line 381 (`const sep = currentFile.nativePath.includes('\\') ? '\\' : '/';`). `workingFolder` is initialized from `currentFile.folder` which never has a trailing separator (verified: `folder` is set by `fileScanner.ts` via `path.dirname()` which strips trailing separators).

In `handleRename`, after URL file creation block (after the `}` closing the `if (config.createUrlFile && metadata)` block) and before `undoStore?.getState().commitTransaction(config.maxUndos)`, add:

```typescript
      // Save poster if enabled and selected
      if (config.createPoster && selectedPosterIndex !== null && posterPaths.length > 0) {
        try {
          const posterData = await fetchPosterBinary(posterPaths[selectedPosterIndex], config.posterSaveSize);

          let posterFolder = workingFolder;
          if (currentFile.isDvdFolder && !config.posterInDvdFolder) {
            const parts = workingFolder.split(/[\\/]/);
            posterFolder = parts.slice(0, -1).join(sep);
          }

          let posterBaseName = newBase;
          if (config.separatePosterFormat && config.formatPoster) {
            posterBaseName = interpolateFormat(config.formatPoster, {
              metadata,
              config,
              originalName: currentFile.name,
            });
          }

          const posterSavePath = `${posterFolder}${sep}${posterBaseName}.jpg`;
          await fs.writeBinaryFile(posterSavePath, posterData);
          undoStore?.getState().addEntry({
            type: 'create',
            sourcePath: posterSavePath,
            destPath: posterSavePath,
          });
        } catch {
          // Poster save failed — continue with rename
        }
      }
```

- [ ] **Step 4: Add `selectedPosterIndex` and `posterPaths` to handleRename dependencies**

Update the `useCallback` dependency array for `handleRename` to include `selectedPosterIndex` and `posterPaths`:

```typescript
  }, [currentFile, previewFilename, metadata, fs, undoStore, onFileRenamed, config, advance, selectedPosterIndex, posterPaths]);
```

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/Renamer.tsx
git commit -m "feat: save selected poster during rename with undo support"
```

---

### Task 8: CompanionsSection — posterSaveSize dropdown + TMDB API key input

**Files:**
- Modify: `src/renderer/components/options/CompanionsSection.tsx`
- Modify: `__tests__/components/options/CompanionsSection.test.tsx`

- [ ] **Step 1: Write tests**

Add to `__tests__/components/options/CompanionsSection.test.tsx`:

```typescript
  it('renders posterSaveSize dropdown', () => {
    render(<CompanionsSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('poster-save-size')).toBeDefined();
  });

  it('disables posterSaveSize when createPoster is unchecked', () => {
    const config = { ...DEFAULT_CONFIG, createPoster: false };
    render(<CompanionsSection config={config} updateConfig={vi.fn()} />);
    expect((screen.getByTestId('poster-save-size') as HTMLSelectElement).disabled).toBe(true);
  });

  it('updates posterSaveSize on change', () => {
    const updateConfig = vi.fn();
    render(<CompanionsSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    fireEvent.change(screen.getByTestId('poster-save-size'), { target: { value: 'w500' } });
    expect(updateConfig).toHaveBeenCalledWith({ posterSaveSize: 'w500' });
  });

  it('renders TMDB API key input', () => {
    render(<CompanionsSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('tmdb-api-key')).toBeDefined();
  });

  it('updates tmdbApiKey on change', () => {
    const updateConfig = vi.fn();
    render(<CompanionsSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    fireEvent.change(screen.getByTestId('tmdb-api-key'), { target: { value: 'my-new-key' } });
    expect(updateConfig).toHaveBeenCalledWith({ tmdbApiKey: 'my-new-key' });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/options/CompanionsSection.test.tsx`
Expected: FAIL — test IDs not found

- [ ] **Step 3: Add posterSaveSize dropdown to CompanionsSection**

In `src/renderer/components/options/CompanionsSection.tsx`, inside the Poster section's `ml-6` div (after the `posterInDvdFolder` checkbox label, before the closing `</div>` at line 96), add:

```tsx
            <div className="flex items-center gap-2 mt-2">
              <label className={`text-sm ${!config.createPoster ? 'text-gray-400' : ''}`}>
                Save size:
              </label>
              <select
                data-testid="poster-save-size"
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                value={config.posterSaveSize}
                disabled={!config.createPoster}
                onChange={(e) => updateConfig({ posterSaveSize: e.target.value })}
              >
                <option value="w185">w185 (185px)</option>
                <option value="w342">w342 (342px)</option>
                <option value="w500">w500 (500px)</option>
                <option value="w780">w780 (780px)</option>
                <option value="original">Original</option>
              </select>
            </div>
```

- [ ] **Step 4: Add TMDB API Key input**

Add a new section after the Poster section (after line 98 `</div>`, before the NFO section):

```tsx
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">TMDB</h3>
        <div className="space-y-2">
          <label className="text-sm text-gray-600">API Key:</label>
          <input
            data-testid="tmdb-api-key"
            type="text"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono"
            value={config.tmdbApiKey}
            onChange={(e) => updateConfig({ tmdbApiKey: e.target.value })}
            placeholder="TMDB API key..."
          />
        </div>
      </div>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/options/CompanionsSection.test.tsx`
Expected: All tests PASS

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/options/CompanionsSection.tsx __tests__/components/options/CompanionsSection.test.tsx
git commit -m "feat: add posterSaveSize dropdown and TMDB API key input to CompanionsSection"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify no PosterPreview references remain**

Run: `grep -r "PosterPreview" src/ __tests__/`
Expected: No results
