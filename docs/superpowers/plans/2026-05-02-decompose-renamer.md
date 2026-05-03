# Decompose Renamer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pull `src/renderer/components/Renamer.tsx` from 685 lines to ~200 by extracting one pipeline service, four hooks, and an ErrorBoundary, with a golden-master test suite that verifies the pipeline extraction is behavior-preserving.

**Architecture:** Nine sequential commits. (1) ErrorBoundary lands first as an independent unit. (2) The 12 pipeline branch tests are written first against an in-file `_legacyExecuteRename` helper that wraps the current `handleRename` body. (3) The pipeline service is extracted; tests still pass. (4) `handleRename` is rewritten to call the new service and toast on failure. (5–8) Four hooks are extracted in size order. (9) Final cleanup pass.

**Tech Stack:** React 19, TypeScript 5.8, Zustand 5, Vitest 4, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-05-02-decompose-renamer-design.md`

---

## File map

**Create:**
- `src/services/renamePipeline.ts` — `executeRename(args): Promise<{ entries, finalPath, finalFolder, posterSaveError? }>`.
- `src/renderer/hooks/useImdbWebview.ts`
- `src/renderer/hooks/useFilenamePreview.ts`
- `src/renderer/hooks/usePosterFetch.ts`
- `src/renderer/hooks/useAutoSelect.ts`
- `src/renderer/components/ErrorBoundary.tsx`
- `__tests__/services/renamePipeline.test.ts`
- `__tests__/components/ErrorBoundary.test.tsx`

**Modify:**
- `src/renderer/components/Renamer.tsx` — slimmed iteratively across Tasks 2, 4, 5, 6, 7, 8, 9.
- `src/renderer/index.tsx` — wrap `<App />` in `<ErrorBoundary>`.

---

## Task 1: ErrorBoundary

**Files:**
- Create: `src/renderer/components/ErrorBoundary.tsx`
- Create: `__tests__/components/ErrorBoundary.test.tsx`
- Modify: `src/renderer/index.tsx`

- [ ] **Step 1: Write the failing component test**

Create `__tests__/components/ErrorBoundary.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../src/renderer/components/ErrorBoundary';

function Boom(): React.JSX.Element {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React's "uncaught error" console noise during these tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">hello</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('hello');
  });

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading')).toHaveTextContent('Something went wrong');
    expect(screen.getByText(/kaboom/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy error/i })).toBeInTheDocument();
  });

  it('Reload button calls window.location.reload()', () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
    });
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /reload/i }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('Copy error button writes the error stack to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /copy error/i }));
    expect(writeText).toHaveBeenCalledTimes(1);
    const arg = writeText.mock.calls[0][0] as string;
    expect(arg).toContain('kaboom');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- ErrorBoundary`
Expected: FAIL — "Cannot find module".

- [ ] **Step 3: Implement the component**

Create `src/renderer/components/ErrorBoundary.tsx`:

```tsx
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const PANEL_STYLE: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  padding: '32px',
  maxWidth: '720px',
  margin: '40px auto',
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: '6px',
};

const PRE_STYLE: React.CSSProperties = {
  background: '#f6f6f6',
  padding: '12px',
  borderRadius: '4px',
  overflowX: 'auto',
  fontSize: '12px',
  lineHeight: '1.4',
  whiteSpace: 'pre-wrap',
};

const BUTTON_STYLE: React.CSSProperties = {
  padding: '8px 14px',
  marginRight: '8px',
  border: '1px solid #888',
  borderRadius: '4px',
  background: '#f0f0f0',
  cursor: 'pointer',
  fontSize: '13px',
};

function formatError(error: Error): string {
  const stack = error.stack ?? '';
  const frames = stack.split('\n').slice(0, 6).join('\n');
  return `${error.name}: ${error.message}\n${frames}`;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleCopy = (): void => {
    if (this.state.error) {
      void navigator.clipboard.writeText(formatError(this.state.error));
    }
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={PANEL_STYLE}>
        <h1 style={{ margin: '0 0 12px', fontSize: '20px' }}>Something went wrong</h1>
        <p style={{ margin: '0 0 16px', color: '#444' }}>{error.name}: {error.message}</p>
        <pre style={PRE_STYLE}>{formatError(error)}</pre>
        <div style={{ marginTop: '16px' }}>
          <button type="button" style={BUTTON_STYLE} onClick={this.handleReload}>Reload</button>
          <button type="button" style={BUTTON_STYLE} onClick={this.handleCopy}>Copy error</button>
        </div>
      </div>
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ErrorBoundary`
Expected: 4 tests pass.

- [ ] **Step 5: Wire into renderer entry**

Read `src/renderer/index.tsx` first to confirm its current shape, then modify it to wrap `<App />`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initConfigStore } from '../stores/configStore';
import { createElectronFsAdapter } from '../adapters/fs';
import './index.css';

const fs = createElectronFsAdapter();
initConfigStore(fs);

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App fs={fs} />
    </ErrorBoundary>
  </React.StrictMode>,
);
```

If the existing `index.tsx` differs (e.g., no `StrictMode`, different import order), preserve those — just add the `ErrorBoundary` import and wrap `<App />`.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all green.

Run: `npm run lint`
Expected: 0 errors (warning count may stay the same).

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/ErrorBoundary.tsx __tests__/components/ErrorBoundary.test.tsx src/renderer/index.tsx
git commit -m "feat: add top-level ErrorBoundary with reload and copy-error"
```

---

## Task 2: Golden-master pipeline tests

**Files:**
- Modify: `src/renderer/components/Renamer.tsx` (factor `handleRename` body into a private `_legacyExecuteRename` helper while leaving behavior identical)
- Create: `__tests__/services/renamePipeline.test.ts` (12 tests targeting the helper)

The goal of this task is to lock in current behavior with tests *before* extracting anything. The helper is a temporary scaffold; Task 3 replaces it with the real service.

- [ ] **Step 1: Add the helper inside Renamer.tsx**

Open `src/renderer/components/Renamer.tsx`. Just before the `Renamer` function declaration (after the imports and the `WebviewIpcMessageEvent` interface), add:

```ts
import type { ZeebConfig, MovieFile, MovieMetadata, UndoEntry } from '../../types';

export interface ExecuteRenameArgs {
  fs: FsAdapter;
  currentFile: MovieFile;
  previewFilename: string;
  metadata: MovieMetadata;
  posterRemotePath: string | null;
  selectedAka: string | null;
  config: ZeebConfig;
  platform: 'mac' | 'win';
}

export interface ExecuteRenameResult {
  entries: UndoEntry[];
  finalPath: string;
  finalFolder: string;
  posterSaveError?: Error;
}

/**
 * TEMPORARY helper — Task 3 replaces this with src/services/renamePipeline.ts.
 * Mirrors the body of handleRename minus undoStore/log/onFileRenamed wiring.
 */
export async function _legacyExecuteRename(args: ExecuteRenameArgs): Promise<ExecuteRenameResult> {
  const { fs, currentFile, previewFilename, metadata, posterRemotePath, selectedAka, config, platform } = args;
  const entries: UndoEntry[] = [];

  const sep = currentFile.nativePath.includes('\\') ? '\\' : '/';
  let workingFolder = currentFile.folder;
  const newPath = `${workingFolder}${sep}${previewFilename}`;
  const fileEntry = await renameFile(fs, currentFile.nativePath, newPath);
  entries.push(fileEntry);

  // Rename subtitles
  const baseName = currentFile.name.replace(/\.[^.]+$/, '');
  const newBase = previewFilename.replace(/\.[^.]+$/, '');
  const subs = await findSubtitles(fs, workingFolder, baseName, config.subtitleExtensions);
  if (subs.length > 0) {
    const subEntries = await renameSubtitles(fs, subs, baseName, newBase);
    entries.push(...subEntries);
  }

  // Rename folder if enabled
  if (config.renameFolder) {
    const parentParts = workingFolder.split(/[\\/]/);
    if (parentParts.length > 1 && parentParts[parentParts.length - 1] !== '') {
      const parentDir = parentParts.slice(0, -1).join(sep);
      const newFolderName = newBase;
      const currentFolderName = parentParts[parentParts.length - 1];
      if (currentFolderName !== newFolderName) {
        const newFolderPath = `${parentDir}${sep}${newFolderName}`;
        await fs.rename(workingFolder, newFolderPath);
        entries.push({ type: 'rename', sourcePath: workingFolder, destPath: newFolderPath });
        workingFolder = newFolderPath;
      }
    }
  }

  // Create URL file if enabled
  let nfoContent: string | null = null;
  if (config.createUrlFile) {
    if (config.includeNfoInUrl && currentFile.nfoPath) {
      try {
        const nfoName = currentFile.nfoPath.split(/[\\/]/).pop()!;
        const nfoPath = workingFolder !== currentFile.folder
          ? `${workingFolder}${sep}${nfoName}`
          : currentFile.nfoPath;
        nfoContent = await fs.readFile(nfoPath, 'utf-8');
      } catch { /* NFO read failed — skip */ }
    }

    const isMac = platform === 'mac';
    const urlExt = isMac ? '.webloc' : '.url';
    const urlPath = `${workingFolder}${sep}${newBase}${urlExt}`;
    const imdbUrl = buildTitleUrl(metadata.tt, config.urlImdbTT);

    const urlContent = isMac
      ? generateWeblocContent({
          url: imdbUrl,
          originalPath: config.includeOriginalInUrl ? currentFile.nativePath : undefined,
          includeOriginal: config.includeOriginalInUrl,
          nfoContent,
        })
      : generateUrlFileContent({
          url: imdbUrl,
          originalPath: config.includeOriginalInUrl ? currentFile.nativePath : undefined,
          nfoContent,
          includeOriginal: config.includeOriginalInUrl,
        });

    await fs.writeFile(urlPath, urlContent, 'utf-8');
    entries.push({ type: 'create', sourcePath: urlPath, destPath: urlPath });

    if (config.deleteNfoAfterInclude && nfoContent != null && currentFile.nfoPath) {
      const nfoName = currentFile.nfoPath.split(/[\\/]/).pop()!;
      const nfoPath = workingFolder !== currentFile.folder
        ? `${workingFolder}${sep}${nfoName}`
        : currentFile.nfoPath;
      await fs.unlink(nfoPath);
      entries.push({ type: 'delete', sourcePath: nfoPath, destPath: null, content: nfoContent });
    }
  }

  // Save poster if enabled and a remote path was provided
  let posterSaveError: Error | undefined;
  if (config.createPoster && posterRemotePath) {
    try {
      const posterUrl = buildPosterUrl(posterRemotePath, config.posterSaveSize);

      let posterFolder = workingFolder;
      if (currentFile.isDvdFolder && !config.posterInDvdFolder) {
        const parts = workingFolder.split(/[\\/]/);
        posterFolder = parts.slice(0, -1).join(sep);
      }

      let posterBaseName = newBase;
      if (config.separatePosterFormat && config.formatPoster) {
        posterBaseName = interpolateFormat(config.formatPoster, metadata, {
          saved: '',
          selectedAka: selectedAka ?? undefined,
          directorSeparator: config.directorSeparator,
          genreSeparator: config.genreSeparator,
          starSeparator: config.starSeparator,
          removeThe: config.removeThe,
          swapThe: config.swapThe,
          titleSpaceChar: config.titleSpaceChar,
          mpaaMap: config.mpaaMap,
          theWord: config.theWord,
        });
      }

      const posterSavePath = `${posterFolder}${sep}${posterBaseName}.jpg`;
      await fs.downloadToFile(posterUrl, posterSavePath);
      entries.push({ type: 'create', sourcePath: posterSavePath, destPath: posterSavePath });
    } catch (err) {
      posterSaveError = err instanceof Error ? err : new Error(String(err));
    }
  }

  const finalPath = `${workingFolder}${sep}${previewFilename}`;
  return { entries, finalPath, finalFolder: workingFolder, posterSaveError };
}
```

This helper is exported so the test file can import it. It's deliberately a near-copy of the current logic with two surface changes:
1. `posterRemotePath: string | null` is passed in (resolved from `posterPaths[selectedPosterIndex]` by the caller), so the helper doesn't need `posterPaths`/`selectedPosterIndex`.
2. `selectedAka: string | null` is passed in.
3. `platform: 'mac' | 'win'` is passed in instead of reading `navigator.userAgent` (makes test 6 trivial). Add `selectedAka` to the poster-format interpolation call as well — this keeps poster naming consistent with file naming when AKA is selected (matches what already happens for the file via `interpolateFormat`'s default behavior).

The existing `handleRename` in Renamer.tsx does **not** call this helper yet — it still has the inline body. That switch happens in Task 4. Task 2 only adds the helper for tests to target.

- [ ] **Step 2: Sanity-check Renamer still compiles**

Run: `npx tsc --noEmit src/renderer/components/Renamer.tsx 2>&1 | grep "Renamer.tsx" | head -10`
Expected: no new errors specifically attributable to the helper.

Run: `npm test -- Renamer App dualRenamer`
Expected: still green.

- [ ] **Step 3: Write the test file**

Create `__tests__/services/renamePipeline.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { _legacyExecuteRename, type ExecuteRenameArgs } from '../../src/renderer/components/Renamer';
import { createMockFsAdapter } from '../../src/adapters/fs';
import type { ZeebConfig, MovieFile, MovieMetadata } from '../../src/types';
import { DEFAULT_CONFIG } from '../../src/services/configDefaults';

function makeFile(overrides: Partial<MovieFile> = {}): MovieFile {
  return {
    id: 'f1',
    name: 'old.mkv',
    nativePath: '/movies/old.mkv',
    folder: '/movies',
    extension: 'mkv',
    size: 0,
    isDvdFolder: false,
    hasNfo: false,
    hasUrl: false,
    hasPoster: false,
    nfoPath: null,
    urlPath: null,
    posterPath: null,
    ...overrides,
  };
}

function makeMetadata(overrides: Partial<MovieMetadata> = {}): MovieMetadata {
  return {
    tt: 'tt0111161',
    title: 'The Shawshank Redemption',
    year: 1994,
    rating: 9.3,
    directors: ['Frank Darabont'],
    genres: ['Drama'],
    actors: ['Tim Robbins'],
    duration: 142,
    mpaa: 'R',
    aka: [],
    posterUrl: null,
    ...overrides,
  };
}

function makeConfig(overrides: Partial<ZeebConfig> = {}): ZeebConfig {
  return {
    ...DEFAULT_CONFIG,
    createUrlFile: false,
    createPoster: false,
    renameFolder: false,
    ...overrides,
  };
}

function makeArgs(overrides: Partial<ExecuteRenameArgs> = {}): ExecuteRenameArgs {
  return {
    fs: createMockFsAdapter(),
    currentFile: makeFile(),
    previewFilename: 'New Movie (1994).mkv',
    metadata: makeMetadata(),
    posterRemotePath: null,
    selectedAka: null,
    config: makeConfig(),
    platform: 'win',
    ...overrides,
  };
}

describe('renamePipeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --- Test 1: plain file rename ---
  it('renames a single file with no extras', async () => {
    const renameMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({ rename: renameMock });
    const result = await _legacyExecuteRename(makeArgs({ fs }));
    expect(renameMock).toHaveBeenCalledWith('/movies/old.mkv', '/movies/New Movie (1994).mkv');
    expect(result.entries).toEqual([
      { type: 'rename', sourcePath: '/movies/old.mkv', destPath: '/movies/New Movie (1994).mkv' },
    ]);
    expect(result.finalPath).toBe('/movies/New Movie (1994).mkv');
    expect(result.finalFolder).toBe('/movies');
    expect(result.posterSaveError).toBeUndefined();
  });

  // --- Test 2: subtitles ---
  it('renames matching subtitle files alongside the movie', async () => {
    const renameMock = vi.fn().mockResolvedValue(undefined);
    const readdirMock = vi.fn().mockResolvedValue([
      { name: 'old.mkv', path: '/movies/old.mkv', isFile: true, isDirectory: false },
      { name: 'old.en.srt', path: '/movies/old.en.srt', isFile: true, isDirectory: false },
      { name: 'old.fr.srt', path: '/movies/old.fr.srt', isFile: true, isDirectory: false },
    ]);
    const fs = createMockFsAdapter({ rename: renameMock, readdir: readdirMock });
    const result = await _legacyExecuteRename(makeArgs({ fs }));
    expect(renameMock).toHaveBeenCalledWith('/movies/old.mkv', '/movies/New Movie (1994).mkv');
    expect(renameMock).toHaveBeenCalledWith('/movies/old.en.srt', '/movies/New Movie (1994).en.srt');
    expect(renameMock).toHaveBeenCalledWith('/movies/old.fr.srt', '/movies/New Movie (1994).fr.srt');
    expect(result.entries).toHaveLength(3);
  });

  // --- Test 3: folder rename ---
  it('renames the containing folder when enabled and folder name differs', async () => {
    const renameMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({ rename: renameMock });
    const result = await _legacyExecuteRename(makeArgs({
      fs,
      currentFile: makeFile({ nativePath: '/parent/old folder/old.mkv', folder: '/parent/old folder' }),
      config: makeConfig({ renameFolder: true }),
    }));
    expect(renameMock).toHaveBeenCalledWith('/parent/old folder/old.mkv', '/parent/old folder/New Movie (1994).mkv');
    expect(renameMock).toHaveBeenCalledWith('/parent/old folder', '/parent/New Movie (1994)');
    expect(result.finalFolder).toBe('/parent/New Movie (1994)');
    expect(result.entries[result.entries.length - 1]).toEqual({
      type: 'rename',
      sourcePath: '/parent/old folder',
      destPath: '/parent/New Movie (1994)',
    });
  });

  // --- Test 4: URL file (Windows) ---
  it('writes a .url file with original path when createUrlFile is on', async () => {
    const writeFileMock = vi.fn().mockResolvedValue(undefined);
    const renameMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({ rename: renameMock, writeFile: writeFileMock });
    const result = await _legacyExecuteRename(makeArgs({
      fs,
      config: makeConfig({ createUrlFile: true, includeOriginalInUrl: true }),
    }));
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const [path, content] = writeFileMock.mock.calls[0];
    expect(path).toBe('/movies/New Movie (1994).url');
    expect(content).toContain('https://www.imdb.com/title/tt0111161/');
    expect(content).toContain('/movies/old.mkv');
    expect(result.entries.find((e) => e.type === 'create' && e.sourcePath.endsWith('.url'))).toBeTruthy();
  });

  // --- Test 5: URL file with NFO + delete-after ---
  it('includes NFO content in the URL file and deletes the NFO when configured', async () => {
    const writeFileMock = vi.fn().mockResolvedValue(undefined);
    const unlinkMock = vi.fn().mockResolvedValue(undefined);
    const readFileMock = vi.fn().mockResolvedValue('NFO BODY');
    const fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      writeFile: writeFileMock,
      unlink: unlinkMock,
      readFile: readFileMock,
    });
    const result = await _legacyExecuteRename(makeArgs({
      fs,
      currentFile: makeFile({ nfoPath: '/movies/old.nfo', hasNfo: true }),
      config: makeConfig({
        createUrlFile: true,
        includeNfoInUrl: true,
        deleteNfoAfterInclude: true,
      }),
    }));
    expect(readFileMock).toHaveBeenCalledWith('/movies/old.nfo', 'utf-8');
    const urlContent = writeFileMock.mock.calls[0][1] as string;
    expect(urlContent).toContain('NFO BODY');
    expect(unlinkMock).toHaveBeenCalledWith('/movies/old.nfo');
    expect(result.entries.some((e) => e.type === 'delete' && e.content === 'NFO BODY')).toBe(true);
  });

  // --- Test 6: Mac webloc ---
  it('writes a .webloc file when platform is mac', async () => {
    const writeFileMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      writeFile: writeFileMock,
    });
    await _legacyExecuteRename(makeArgs({
      fs,
      platform: 'mac',
      config: makeConfig({ createUrlFile: true }),
    }));
    const [path, content] = writeFileMock.mock.calls[0];
    expect(path).toBe('/movies/New Movie (1994).webloc');
    expect(content).toContain('<plist');
  });

  // --- Test 7: DVD folder rename ---
  // DVD MovieFiles have nativePath = the DVD folder, folder = parent dir, extension = ''.
  // First rename targets the DVD folder itself; renameFolder is intentionally off here
  // because the DVD case + renameFolder has well-known surprising behavior we don't want
  // to lock in via this test.
  it('renames a DVD folder (no extension) using its parent as the working folder', async () => {
    const renameMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({ rename: renameMock });
    const result = await _legacyExecuteRename(makeArgs({
      fs,
      currentFile: makeFile({
        name: 'OLD DVD',
        nativePath: '/parent/OLD DVD',
        folder: '/parent',
        extension: '',
        isDvdFolder: true,
      }),
      previewFilename: 'New Movie (1994)',
      config: makeConfig({ separateDvdFormat: true }),
    }));
    expect(renameMock).toHaveBeenCalledWith('/parent/OLD DVD', '/parent/New Movie (1994)');
    expect(result.finalPath).toBe('/parent/New Movie (1994)');
    expect(result.finalFolder).toBe('/parent');
  });

  // --- Test 8: AKA selected ---
  it('passes selectedAka through to poster format interpolation', async () => {
    const downloadMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      downloadToFile: downloadMock,
    });
    await _legacyExecuteRename(makeArgs({
      fs,
      posterRemotePath: '/abc.jpg',
      selectedAka: 'Castaway',
      metadata: makeMetadata({ aka: ['Castaway'] }),
      config: makeConfig({
        createPoster: true,
        separatePosterFormat: true,
        formatPoster: '<aka> Poster',
      }),
    }));
    expect(downloadMock).toHaveBeenCalledTimes(1);
    const [, savePath] = downloadMock.mock.calls[0];
    expect(savePath).toBe('/movies/Castaway Poster.jpg');
  });

  // --- Test 9: poster save (default size and base name) ---
  it('saves a poster using the renamed base when separatePosterFormat is off', async () => {
    const downloadMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      downloadToFile: downloadMock,
    });
    await _legacyExecuteRename(makeArgs({
      fs,
      posterRemotePath: '/abc.jpg',
      config: makeConfig({ createPoster: true }),
    }));
    expect(downloadMock).toHaveBeenCalledTimes(1);
    const [posterUrl, savePath] = downloadMock.mock.calls[0];
    expect(posterUrl).toContain('/abc.jpg');
    expect(savePath).toBe('/movies/New Movie (1994).jpg');
  });

  // --- Test 10: poster with separate format ---
  it('uses formatPoster string for poster filename when separatePosterFormat is on', async () => {
    const downloadMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      downloadToFile: downloadMock,
    });
    await _legacyExecuteRename(makeArgs({
      fs,
      posterRemotePath: '/abc.jpg',
      config: makeConfig({
        createPoster: true,
        separatePosterFormat: true,
        formatPoster: '<title> (<year>)',
      }),
    }));
    const [, savePath] = downloadMock.mock.calls[0];
    expect(savePath).toBe('/movies/The Shawshank Redemption (1994).jpg');
  });

  // --- Test 11: DVD poster outside folder ---
  // For DVD entries, workingFolder = currentFile.folder = the parent directory.
  // With posterInDvdFolder=false the existing logic walks one segment up from there:
  // /library/movies → /library. Locking in current behavior.
  it('saves the poster one level above workingFolder when DVD with posterInDvdFolder=false', async () => {
    const downloadMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      downloadToFile: downloadMock,
    });
    await _legacyExecuteRename(makeArgs({
      fs,
      currentFile: makeFile({
        name: 'OLD DVD',
        nativePath: '/library/movies/OLD DVD',
        folder: '/library/movies',
        extension: '',
        isDvdFolder: true,
      }),
      previewFilename: 'New Movie (1994)',
      posterRemotePath: '/abc.jpg',
      config: makeConfig({
        createPoster: true,
        posterInDvdFolder: false,
      }),
    }));
    const [, savePath] = downloadMock.mock.calls[0];
    expect(savePath).toBe('/library/New Movie (1994).jpg');
  });

  // --- Test 12: pipeline throws on fs.rename failure ---
  it('throws when the primary rename fails and returns no entries', async () => {
    const renameMock = vi.fn().mockRejectedValue(new Error('EACCES'));
    const fs = createMockFsAdapter({ rename: renameMock });
    await expect(_legacyExecuteRename(makeArgs({ fs }))).rejects.toThrow(/EACCES/);
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- renamePipeline`
Expected: all 12 pass.

If any fail, do **not** edit the helper to make them pass — instead fix the test to match current behavior. The helper is supposed to mirror `handleRename`. The whole point of this task is locking in current behavior.

If a real behavioral discrepancy is found (e.g., the helper diverged from `handleRename` accidentally), reconcile by editing the helper to match `handleRename`. Don't change semantics here.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all green (322 + 12 = 334 tests).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/Renamer.tsx __tests__/services/renamePipeline.test.ts
git commit -m "test: add 12-branch golden master tests for rename pipeline"
```

---

## Task 3: Extract `services/renamePipeline.ts`

**Files:**
- Create: `src/services/renamePipeline.ts`
- Modify: `__tests__/services/renamePipeline.test.ts` (re-point import)
- Modify: `src/renderer/components/Renamer.tsx` (delete helper)

- [ ] **Step 1: Create the pipeline module**

Create `src/services/renamePipeline.ts`:

```ts
import type { FsAdapter } from '../adapters/fs';
import type { ZeebConfig, MovieFile, MovieMetadata, UndoEntry } from '../types';
import { renameFile, findSubtitles, renameSubtitles } from './fileRenamer';
import { generateUrlFileContent, generateWeblocContent } from './urlFileWriter';
import { buildTitleUrl } from './imdbExtractor';
import { buildPosterUrl } from './tmdbService';
import { interpolateFormat } from './formatEngine';

export interface ExecuteRenameArgs {
  fs: FsAdapter;
  currentFile: MovieFile;
  previewFilename: string;
  metadata: MovieMetadata;
  posterRemotePath: string | null;
  selectedAka: string | null;
  config: ZeebConfig;
  platform: 'mac' | 'win';
}

export interface ExecuteRenameResult {
  entries: UndoEntry[];
  finalPath: string;
  finalFolder: string;
  posterSaveError?: Error;
}

export async function executeRename(args: ExecuteRenameArgs): Promise<ExecuteRenameResult> {
  const { fs, currentFile, previewFilename, metadata, posterRemotePath, selectedAka, config, platform } = args;
  const entries: UndoEntry[] = [];

  const sep = currentFile.nativePath.includes('\\') ? '\\' : '/';
  let workingFolder = currentFile.folder;
  const newPath = `${workingFolder}${sep}${previewFilename}`;
  const fileEntry = await renameFile(fs, currentFile.nativePath, newPath);
  entries.push(fileEntry);

  // Rename subtitles
  const baseName = currentFile.name.replace(/\.[^.]+$/, '');
  const newBase = previewFilename.replace(/\.[^.]+$/, '');
  const subs = await findSubtitles(fs, workingFolder, baseName, config.subtitleExtensions);
  if (subs.length > 0) {
    const subEntries = await renameSubtitles(fs, subs, baseName, newBase);
    entries.push(...subEntries);
  }

  // Rename folder if enabled
  if (config.renameFolder) {
    const parentParts = workingFolder.split(/[\\/]/);
    if (parentParts.length > 1 && parentParts[parentParts.length - 1] !== '') {
      const parentDir = parentParts.slice(0, -1).join(sep);
      const newFolderName = newBase;
      const currentFolderName = parentParts[parentParts.length - 1];
      if (currentFolderName !== newFolderName) {
        const newFolderPath = `${parentDir}${sep}${newFolderName}`;
        await fs.rename(workingFolder, newFolderPath);
        entries.push({ type: 'rename', sourcePath: workingFolder, destPath: newFolderPath });
        workingFolder = newFolderPath;
      }
    }
  }

  // Create URL file if enabled
  let nfoContent: string | null = null;
  if (config.createUrlFile) {
    if (config.includeNfoInUrl && currentFile.nfoPath) {
      try {
        const nfoName = currentFile.nfoPath.split(/[\\/]/).pop()!;
        const nfoPath = workingFolder !== currentFile.folder
          ? `${workingFolder}${sep}${nfoName}`
          : currentFile.nfoPath;
        nfoContent = await fs.readFile(nfoPath, 'utf-8');
      } catch { /* NFO read failed — skip */ }
    }

    const isMac = platform === 'mac';
    const urlExt = isMac ? '.webloc' : '.url';
    const urlPath = `${workingFolder}${sep}${newBase}${urlExt}`;
    const imdbUrl = buildTitleUrl(metadata.tt, config.urlImdbTT);

    const urlContent = isMac
      ? generateWeblocContent({
          url: imdbUrl,
          originalPath: config.includeOriginalInUrl ? currentFile.nativePath : undefined,
          includeOriginal: config.includeOriginalInUrl,
          nfoContent,
        })
      : generateUrlFileContent({
          url: imdbUrl,
          originalPath: config.includeOriginalInUrl ? currentFile.nativePath : undefined,
          nfoContent,
          includeOriginal: config.includeOriginalInUrl,
        });

    await fs.writeFile(urlPath, urlContent, 'utf-8');
    entries.push({ type: 'create', sourcePath: urlPath, destPath: urlPath });

    if (config.deleteNfoAfterInclude && nfoContent != null && currentFile.nfoPath) {
      const nfoName = currentFile.nfoPath.split(/[\\/]/).pop()!;
      const nfoPath = workingFolder !== currentFile.folder
        ? `${workingFolder}${sep}${nfoName}`
        : currentFile.nfoPath;
      await fs.unlink(nfoPath);
      entries.push({ type: 'delete', sourcePath: nfoPath, destPath: null, content: nfoContent });
    }
  }

  // Save poster if enabled and a remote path was provided
  let posterSaveError: Error | undefined;
  if (config.createPoster && posterRemotePath) {
    try {
      const posterUrl = buildPosterUrl(posterRemotePath, config.posterSaveSize);

      let posterFolder = workingFolder;
      if (currentFile.isDvdFolder && !config.posterInDvdFolder) {
        const parts = workingFolder.split(/[\\/]/);
        posterFolder = parts.slice(0, -1).join(sep);
      }

      let posterBaseName = newBase;
      if (config.separatePosterFormat && config.formatPoster) {
        posterBaseName = interpolateFormat(config.formatPoster, metadata, {
          saved: '',
          selectedAka: selectedAka ?? undefined,
          directorSeparator: config.directorSeparator,
          genreSeparator: config.genreSeparator,
          starSeparator: config.starSeparator,
          removeThe: config.removeThe,
          swapThe: config.swapThe,
          titleSpaceChar: config.titleSpaceChar,
          mpaaMap: config.mpaaMap,
          theWord: config.theWord,
        });
      }

      const posterSavePath = `${posterFolder}${sep}${posterBaseName}.jpg`;
      await fs.downloadToFile(posterUrl, posterSavePath);
      entries.push({ type: 'create', sourcePath: posterSavePath, destPath: posterSavePath });
    } catch (err) {
      posterSaveError = err instanceof Error ? err : new Error(String(err));
    }
  }

  const finalPath = `${workingFolder}${sep}${previewFilename}`;
  return { entries, finalPath, finalFolder: workingFolder, posterSaveError };
}
```

- [ ] **Step 2: Re-point the test imports**

In `__tests__/services/renamePipeline.test.ts`, change the import line:

```ts
import { executeRename, type ExecuteRenameArgs } from '../../src/services/renamePipeline';
```

Replace every call to `_legacyExecuteRename(...)` with `executeRename(...)`. Find/replace globally inside the file.

- [ ] **Step 3: Run the pipeline tests against the new module**

Run: `npm test -- renamePipeline`
Expected: all 12 pass.

If any fail, the extraction has a bug — fix the new module to match the helper. Don't fix the tests.

- [ ] **Step 4: Delete the helper from Renamer.tsx**

In `src/renderer/components/Renamer.tsx`, delete the entire `_legacyExecuteRename` function and the two exported interfaces `ExecuteRenameArgs` / `ExecuteRenameResult` (those now live in `src/services/renamePipeline.ts`). Also delete the imports for `MovieMetadata`, `UndoEntry` if they are no longer used elsewhere in the file (TypeScript will tell you).

The inline `handleRename` body is unchanged at this point — it still has the original ~150 lines. Task 4 replaces it.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all green.

Run: `npx tsc --noEmit src/renderer/components/Renamer.tsx 2>&1 | grep "Renamer.tsx" | head`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/renamePipeline.ts __tests__/services/renamePipeline.test.ts src/renderer/components/Renamer.tsx
git commit -m "refactor: extract executeRename into services/renamePipeline.ts"
```

---

## Task 4: Replace `handleRename` body with the new pipeline

**Files:**
- Modify: `src/renderer/components/Renamer.tsx` (rewrite `handleRename`)

- [ ] **Step 1: Add the import**

In `src/renderer/components/Renamer.tsx`, add to the imports near the top:

```ts
import { executeRename } from '../../services/renamePipeline';
```

If `useNotificationStore` is already imported from Spec A, leave it. Otherwise add:

```ts
import { useNotificationStore } from '../../stores/notificationStore';
```

- [ ] **Step 2: Replace the body of `handleRename`**

In `src/renderer/components/Renamer.tsx`, find the entire `handleRename = useCallback(async () => { ... }, [...])` block (currently lines ~414–563) and replace it with:

```ts
  const handleRename = useCallback(async () => {
    if (!currentFile || !previewFilename || !metadata) return;
    const posterRemotePath =
      selectedPosterIndex != null && posterPaths.length > 0
        ? posterPaths[selectedPosterIndex]
        : null;
    const platform: 'mac' | 'win' =
      navigator.userAgent.includes('Macintosh') ? 'mac' : 'win';

    try {
      const result = await executeRename({
        fs,
        currentFile,
        previewFilename,
        metadata,
        posterRemotePath,
        selectedAka: useAka ? selectedAka : null,
        config,
        platform,
      });

      undoStore?.getState().beginTransaction();
      result.entries.forEach((e) => undoStore?.getState().addEntry(e));
      undoStore?.getState().commitTransaction(currentFile.folder, config.maxUndos);

      onFileRenamed?.(currentFile.id, previewFilename, result.finalPath);

      if (config.logFilePath) {
        const logger = createLogger(fs, config.logFilePath);
        await logger.log('rename', currentFile.nativePath, result.finalPath);
      }

      if (result.posterSaveError) {
        useNotificationStore.getState().notify('error', 'Poster save failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      useNotificationStore.getState().notify('error', `Rename failed: ${msg}`);
    }

    advance();
  }, [
    currentFile,
    previewFilename,
    metadata,
    fs,
    undoStore,
    onFileRenamed,
    config,
    advance,
    selectedPosterIndex,
    posterPaths,
    useAka,
    selectedAka,
  ]);
```

- [ ] **Step 3: Remove now-unused imports**

After Step 2, `Renamer.tsx` no longer directly imports `renameFile`, `findSubtitles`, `renameSubtitles`, `generateUrlFileContent`, `generateWeblocContent`, `buildPosterUrl`, `interpolateFormat`. These are now used only inside `renamePipeline.ts`. Delete those imports from Renamer.tsx.

Keep `buildTitleUrl` (still used by `handleMovieSelect`) and `parseTitleData` (still used in the webview ipc handler). Keep `interpolateFormat` only if it's still used elsewhere — search the file: if no other uses remain, remove it.

Run: `npx tsc --noEmit 2>&1 | grep "Renamer.tsx" | head`
Expected: zero new errors.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: all green. The pipeline tests still pass; integration tests still pass.

- [ ] **Step 5: Smoke check**

Run: `npm start`
Verify (manual): pick a folder with a movie file, search, select a result, rename. File still renames correctly. (Skip if you can't run the app — tests + lint are the gate.)

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/Renamer.tsx
git commit -m "refactor: handleRename calls executeRename and toasts on failure"
```

---

## Task 5: Extract `useFilenamePreview`

**Files:**
- Create: `src/renderer/hooks/useFilenamePreview.ts`
- Modify: `src/renderer/components/Renamer.tsx` (replace the preview effect with hook call)

- [ ] **Step 1: Create the hook**

Create `src/renderer/hooks/useFilenamePreview.ts`:

```ts
import { useEffect } from 'react';
import { interpolateFormat } from '../../services/formatEngine';
import type { ZeebConfig, MovieFile, MovieMetadata, SearchPart } from '../../types';

interface UseFilenamePreviewArgs {
  metadata: MovieMetadata | null;
  currentFile: MovieFile | null;
  searchParts: SearchPart[];
  useAka: boolean;
  selectedAka: string;
  config: ZeebConfig;
  setPreviewFilename: (s: string) => void;
}

export function useFilenamePreview(args: UseFilenamePreviewArgs): void {
  const {
    metadata, currentFile, searchParts, useAka, selectedAka, config, setPreviewFilename,
  } = args;

  useEffect(() => {
    if (!metadata || !currentFile) {
      setPreviewFilename('');
      return;
    }
    const format = currentFile.isDvdFolder && config.separateDvdFormat
      ? (useAka && selectedAka ? config.formatDvdAka : config.formatDvd)
      : (useAka && selectedAka ? config.formatAka : config.formatStandard);
    const ext = currentFile.isDvdFolder ? '' : `.${currentFile.extension}`;
    const keepParts = searchParts
      .filter((p) => p.state === 'keep' || p.state === 'keepAlways')
      .map((p) => p.text);
    const saved = keepParts.join(config.savedPartSeparator ?? ' ');
    const formatted = interpolateFormat(format, metadata, {
      saved,
      selectedAka: useAka ? selectedAka : undefined,
      directorSeparator: config.directorSeparator,
      genreSeparator: config.genreSeparator,
      starSeparator: config.starSeparator,
      removeThe: config.removeThe,
      swapThe: config.swapThe,
      titleSpaceChar: config.titleSpaceChar,
      mpaaMap: config.mpaaMap,
      theWord: config.theWord,
    });
    setPreviewFilename(formatted + ext);
  }, [metadata, currentFile, config, searchParts, useAka, selectedAka, setPreviewFilename]);
}
```

- [ ] **Step 2: Replace the inline effect with a hook call in Renamer.tsx**

In `src/renderer/components/Renamer.tsx`:

Add to the imports near the other hook/local imports:

```ts
import { useFilenamePreview } from '../hooks/useFilenamePreview';
```

Find the existing `useEffect` block that begins with `if (!metadata || !currentFile) { setPreviewFilename(''); return; }` (currently around lines 160–186). Delete that entire `useEffect` block.

Right after the `currentFile` `useMemo` (around line 84) — or anywhere among the hook calls before the JSX — add the call:

```ts
  useFilenamePreview({
    metadata,
    currentFile,
    searchParts,
    useAka,
    selectedAka,
    config,
    setPreviewFilename,
  });
```

- [ ] **Step 3: Run the suite**

Run: `npm test`
Expected: all green. The Renamer integration tests cover preview filename derivation.

Run: `npx tsc --noEmit 2>&1 | grep -E "Renamer.tsx|useFilenamePreview" | head`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/hooks/useFilenamePreview.ts src/renderer/components/Renamer.tsx
git commit -m "refactor: extract preview filename derivation into useFilenamePreview"
```

---

## Task 6: Extract `usePosterFetch`

**Files:**
- Create: `src/renderer/hooks/usePosterFetch.ts`
- Modify: `src/renderer/components/Renamer.tsx`

- [ ] **Step 1: Create the hook**

Create `src/renderer/hooks/usePosterFetch.ts`:

```ts
import { useEffect, useState } from 'react';
import { searchPosters } from '../../services/tmdbService';
import type { ZeebConfig, MovieMetadata } from '../../types';

interface UsePosterFetchArgs {
  metadata: MovieMetadata | null;
  config: ZeebConfig;
  setPosterPaths: (paths: string[]) => void;
}

interface UsePosterFetchResult {
  selectedPosterIndex: number | null;
  setSelectedPosterIndex: (i: number | null) => void;
}

export function usePosterFetch(args: UsePosterFetchArgs): UsePosterFetchResult {
  const { metadata, config, setPosterPaths } = args;
  const [selectedPosterIndex, setSelectedPosterIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!metadata?.tt) {
      setPosterPaths([]);
      setSelectedPosterIndex(null);
      return;
    }
    let cancelled = false;
    searchPosters(metadata.tt, config.urlTmdbApi, config.tmdbApiKey)
      .then((paths) => {
        if (cancelled) return;
        setPosterPaths(paths);
        setSelectedPosterIndex(paths.length > 0 ? 0 : null);
      });
    return () => { cancelled = true; };
  }, [metadata?.tt, config.urlTmdbApi, config.tmdbApiKey, setPosterPaths]);

  return { selectedPosterIndex, setSelectedPosterIndex };
}
```

- [ ] **Step 2: Wire into Renamer.tsx**

Add to the imports:

```ts
import { usePosterFetch } from '../hooks/usePosterFetch';
```

In `Renamer.tsx`, find:

```ts
const [selectedPosterIndex, setSelectedPosterIndex] = useState<number | null>(null);
```

Delete that line. Then find the existing `useEffect` block that calls `searchPosters` (currently around lines 290–304). Delete it.

In place of the deleted state declaration, add (next to the other hook calls):

```ts
  const { selectedPosterIndex, setSelectedPosterIndex } = usePosterFetch({
    metadata,
    config,
    setPosterPaths,
  });
```

The existing `advance` callback resets `setSelectedPosterIndex(null)` — this still works because the hook still exposes the setter.

- [ ] **Step 3: Run the suite**

Run: `npm test`
Expected: all green.

Run: `npx tsc --noEmit 2>&1 | grep -E "Renamer.tsx|usePosterFetch"`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/hooks/usePosterFetch.ts src/renderer/components/Renamer.tsx
git commit -m "refactor: extract TMDB poster fetch into usePosterFetch"
```

---

## Task 7: Extract `useAutoSelect`

**Files:**
- Create: `src/renderer/hooks/useAutoSelect.ts`
- Modify: `src/renderer/components/Renamer.tsx`

This hook bundles the NFO-driven auto-navigate effect and the year-match auto-select effect, with a shared `nfoSelectedRef` so the latter doesn't override the former.

- [ ] **Step 1: Create the hook**

Create `src/renderer/hooks/useAutoSelect.ts`:

```ts
import { useEffect, useRef } from 'react';
import { extractImdbFromNfo } from '../../services/nfoParser';
import type { FsAdapter } from '../../adapters/fs';
import type { ZeebConfig, MovieFile, MovieMatch, SearchPart } from '../../types';

interface UseAutoSelectArgs {
  currentFile: MovieFile | null;
  webviewEl: WebviewTag | null;
  fs: FsAdapter;
  config: ZeebConfig;
  movieMatches: MovieMatch[];
  searchParts: SearchPart[];
  onSelectImdbTt: (tt: string) => void;
  navigateToTitle: (tt: string) => void;
}

export function useAutoSelect(args: UseAutoSelectArgs): void {
  const {
    currentFile, webviewEl, fs, config, movieMatches, searchParts,
    onSelectImdbTt, navigateToTitle,
  } = args;

  const nfoSelectedRef = useRef(false);

  // Reset flag whenever the file changes
  useEffect(() => {
    nfoSelectedRef.current = false;
  }, [currentFile]);

  // NFO-driven auto-navigate
  useEffect(() => {
    if (!currentFile?.nfoPath || !webviewEl) return;
    let cancelled = false;
    (async () => {
      try {
        const content = await fs.readFile(currentFile.nfoPath!, 'utf-8');
        const tt = extractImdbFromNfo(content);
        if (tt && !cancelled) {
          nfoSelectedRef.current = true;
          onSelectImdbTt(tt);
          navigateToTitle(tt);
        }
      } catch { /* NFO read failed — fall through to year-based auto-select */ }
    })();
    return () => { cancelled = true; };
  }, [currentFile, webviewEl, fs, onSelectImdbTt, navigateToTitle]);

  // Year-match auto-select
  useEffect(() => {
    if (movieMatches.length === 0 || nfoSelectedRef.current) return;
    const yearCandidates = searchParts.filter(
      (p) => p.state === 'remove' && /^\d{4}$/.test(p.text) && parseInt(p.text, 10) > 1900,
    );
    const yearPart = yearCandidates[yearCandidates.length - 1] ?? null;
    if (!yearPart) return;
    const match = movieMatches.slice(0, 8).find((m) => m.year === parseInt(yearPart.text, 10));
    if (match) {
      navigateToTitle(match.tt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieMatches]);
}
```

The `eslint-disable` mirrors the existing one in `Renamer.tsx` — the year-match effect deliberately doesn't re-fire when `searchParts` changes (only when new matches arrive). Fixing this is out of scope; preserved for behavioral parity.

`config` is unused in the body — drop it from the args interface if you prefer. (Leaving it in lets future logic reference url/format config without changing the call site. Either is fine; pick the one that doesn't trigger an unused-arg lint warning. The `_` prefix won't help here because `config` is destructured; just delete it from both the interface and the destructure.) Resolved: **delete `config` from the args interface and the destructure.**

- [ ] **Step 2: Wire into Renamer.tsx**

Note: this depends on `navigateToTitle` being available. Until Task 8 extracts `useImdbWebview`, `navigateToTitle` doesn't exist as a named function — `handleMovieSelect` plays that role. Pass `handleMovieSelect` as `navigateToTitle`.

Add to the imports:

```ts
import { useAutoSelect } from '../hooks/useAutoSelect';
```

Find the existing two effects in `Renamer.tsx`:
1. The NFO auto-navigate effect (currently around lines 110–127, starts with `if (!currentFile?.nfoPath || !webviewEl) return;`).
2. The year auto-select effect (currently around lines 190–201, starts with `if (movieMatches.length === 0 || nfoAutoSelectedRef.current) return;`).

Delete both effects. Also delete the `nfoAutoSelectedRef` declaration (`const nfoAutoSelectedRef = useRef(false);`, currently around line 94) — the new hook owns this ref.

Note: there is also a `useEffect` near line 96–107 that runs on file change and sets `nfoAutoSelectedRef.current = false` — delete the line `nfoAutoSelectedRef.current = false;` from inside it, but keep the rest of that effect (it still resets parts and metadata). The hook resets its own ref internally.

Add the hook call alongside the others:

```ts
  useAutoSelect({
    currentFile,
    webviewEl,
    fs,
    movieMatches,
    searchParts,
    onSelectImdbTt: setSelectedTt,
    navigateToTitle: handleMovieSelect,
  });
```

(Place this **after** `handleMovieSelect` is declared, since it's referenced.)

- [ ] **Step 3: Run the suite**

Run: `npm test`
Expected: all green.

Run: `npx tsc --noEmit 2>&1 | grep -E "Renamer.tsx|useAutoSelect"`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/hooks/useAutoSelect.ts src/renderer/components/Renamer.tsx
git commit -m "refactor: extract NFO + year auto-select into useAutoSelect"
```

---

## Task 8: Extract `useImdbWebview`

**Files:**
- Create: `src/renderer/hooks/useImdbWebview.ts`
- Modify: `src/renderer/components/Renamer.tsx`

This is the largest hook. It absorbs ~80 lines from `Renamer.tsx`.

- [ ] **Step 1: Create the hook**

Create `src/renderer/hooks/useImdbWebview.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FsAdapter } from '../../adapters/fs';
import type { ZeebConfig, MovieFile, MovieMetadata } from '../../types';
import { buildTitleUrl, parseTitleData } from '../../services/imdbExtractor';
import { useTesterStore } from '../../stores/testerStore';

interface WebviewIpcMessageEvent {
  channel: string;
  args?: unknown[];
}

interface UseImdbWebviewArgs {
  webviewEl: WebviewTag | null;
  config: ZeebConfig;
  instanceId: number;
  currentFile: MovieFile | null;
  fs: FsAdapter;
  onTitleData: (data: MovieMetadata) => void;
  onAkasReceived: (akas: string[]) => void;
  onSelectedTtChange: (tt: string) => void;
}

interface UseImdbWebviewResult {
  urlInput: string;
  setUrlInput: (s: string) => void;
  navigateToTitle: (tt: string) => void;
  navigateToUrl: (url: string) => void;
  goBack: () => void;
  webviewPreloadPath: string;
}

export function useImdbWebview(args: UseImdbWebviewArgs): UseImdbWebviewResult {
  const { webviewEl, config, instanceId, fs: _fs, currentFile: _currentFile,
          onTitleData, onAkasReceived, onSelectedTtChange: _onSelectedTtChange } = args;

  const [webviewPreloadPath, setWebviewPreloadPath] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const navigationMode = useRef<'title' | 'idle' | 'tester'>('idle');
  const webviewReady = useRef(false);

  const testerRequest = useTesterStore((s) => s.testerRequest);
  const setTesterResult = useTesterStore((s) => s.setResult);
  const setTesterError = useTesterStore((s) => s.setError);

  // Fetch webview preload path once
  useEffect(() => {
    window.zeebApp.getWebviewPreloadPath().then(setWebviewPreloadPath);
  }, []);

  // Send extraction patterns when they change
  useEffect(() => {
    if (!webviewEl) return;
    try {
      webviewEl.send('set-extraction-patterns', config.extractionPatterns);
    } catch { /* webview not ready yet */ }
  }, [webviewEl, config.extractionPatterns]);

  // Apply zoom when config changes
  useEffect(() => {
    if (!webviewEl || !webviewReady.current) return;
    try {
      webviewEl.setZoomFactor(config.htmlZoom / 100);
    } catch { /* webview not ready */ }
  }, [webviewEl, config.htmlZoom]);

  // Webview lifecycle: dom-ready, navigation, ipc-message, crash recovery
  useEffect(() => {
    if (!webviewEl) return;
    const webview = webviewEl;

    const handleDomReady = () => {
      webviewReady.current = true;
      try { setUrlInput(webview.getURL()); } catch { /* ignore */ }
      try { webview.setZoomFactor(config.htmlZoom / 100); } catch { /* ignore */ }
      try { webview.send('set-extraction-patterns', config.extractionPatterns); } catch { /* ignore */ }
    };

    const handleNavigate = (_event: Event) => {
      try { setUrlInput(webview.getURL()); } catch { /* ignore */ }
    };

    const handleIpcMessage = (event: WebviewIpcMessageEvent) => {
      if (event.channel !== 'extraction-result') return;
      const message = event.args?.[0];
      if (typeof message !== 'string') return;

      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'moreAkas' && Array.isArray(parsed.akas)) {
          onAkasReceived(parsed.akas);
          return;
        }
      } catch { /* not JSON or not moreAkas — fall through */ }

      const titleData = parseTitleData(message);
      if (titleData) {
        if (navigationMode.current === 'tester') {
          setTesterResult(titleData);
          navigationMode.current = 'idle';
          useTesterStore.setState({ testerRequest: null });
        } else {
          onTitleData(titleData);
        }
      }
    };

    const handleCrash = () => {
      webviewReady.current = false;
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('ipc-message', handleIpcMessage);
    webview.addEventListener('render-process-gone', handleCrash);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('ipc-message', handleIpcMessage);
      webview.removeEventListener('render-process-gone', handleCrash);
    };
  }, [webviewEl, config.extractionPatterns, config.htmlZoom, onAkasReceived, onTitleData, setTesterResult]);

  // Tester request handler — only first instance responds
  useEffect(() => {
    if (!testerRequest || !webviewEl || instanceId !== 0) return;
    navigationMode.current = 'tester';
    const url = `${config.urlImdbTT}${testerRequest.tt}/`;
    webviewEl.loadURL(url);

    const timer = setTimeout(() => {
      if (navigationMode.current === 'tester') {
        setTesterError(`Timed out fetching data for ${testerRequest.tt}`);
        navigationMode.current = 'idle';
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [testerRequest, webviewEl, instanceId, config.urlImdbTT, setTesterError]);

  // Navigation helpers
  const navigateToTitle = useCallback((tt: string) => {
    const url = buildTitleUrl(tt, config.urlImdbTT);
    navigationMode.current = 'title';
    webviewEl?.loadURL(url);
  }, [webviewEl, config.urlImdbTT]);

  const navigateToUrl = useCallback((url: string) => {
    navigationMode.current = 'idle';
    webviewEl?.loadURL(url);
  }, [webviewEl]);

  const goBack = useCallback(() => {
    webviewEl?.goBack();
  }, [webviewEl]);

  return {
    urlInput,
    setUrlInput,
    navigateToTitle,
    navigateToUrl,
    goBack,
    webviewPreloadPath,
  };
}
```

The `_fs`, `_currentFile`, `_onSelectedTtChange` underscored params are **not used** by this hook — those concerns belong to `useAutoSelect` (NFO read uses `fs` and `currentFile`; `onSelectedTtChange` updates Renamer's local state when NFO matches). Drop them from the `UseImdbWebviewArgs` interface and the destructure since they're noise. **Resolved: remove `fs`, `currentFile`, `onSelectedTtChange` from the args.**

Final args after cleanup:

```ts
interface UseImdbWebviewArgs {
  webviewEl: WebviewTag | null;
  config: ZeebConfig;
  instanceId: number;
  onTitleData: (data: MovieMetadata) => void;
  onAkasReceived: (akas: string[]) => void;
}
```

Update the destructure to match.

- [ ] **Step 2: Wire into Renamer.tsx**

Add the import:

```ts
import { useImdbWebview } from '../hooks/useImdbWebview';
```

Delete from `Renamer.tsx`:
- The `webviewPreloadPath` state declaration and its fetch effect (currently lines ~52, 89–91).
- The `urlInput` state declaration (currently line 53).
- The `navigationMode` ref (currently line 86).
- The `webviewReady` ref (currently line 87).
- The local `WebviewIpcMessageEvent` interface (added in Spec A near the top of the file). Now lives only inside the hook.
- The "Send extraction patterns" effect (currently lines 204–209).
- The "Re-apply zoom" effect (currently lines 212–217).
- The big webview lifecycle `useEffect` (currently lines 219–288).
- The "Tester request" effect (currently lines 307–322).
- The `handleBack` `useCallback` (currently lines 380–382). Replaced by `goBack` from the hook.
- The `handleUrlSubmit` callback's `webviewEl?.loadURL(url)` line is replaced by `navigateToUrl(url)`.
- The `handleMovieSelect` `useCallback` (currently lines 376–384) — its body becomes a single `navigateToTitle(tt)` plus `setSelectedTt(tt)`.
- The unused `import { parseTitleData }` and `import { buildTitleUrl }` from `imdbExtractor` (those are now used inside the hook, not in Renamer).
- The tester store subscriptions (`testerRequest`, `setTesterResult`, `setTesterError`) — the hook reads `useTesterStore` directly. Renamer keeps only what the AKA-publish effect needs (currently `useTesterStore.getState().setCurrentTt(...)`, which can stay as an inline call).

Add the hook call (place it before `useAutoSelect` since `useAutoSelect` uses `navigateToTitle` from here):

```ts
  const {
    urlInput,
    setUrlInput,
    navigateToTitle,
    navigateToUrl,
    goBack,
    webviewPreloadPath,
  } = useImdbWebview({
    webviewEl,
    config,
    instanceId,
    onTitleData: setMetadata,
    onAkasReceived: appendAkas,
  });
```

Update `handleMovieSelect`:

```ts
  const handleMovieSelect = useCallback((tt: string) => {
    setSelectedTt(tt);
    navigateToTitle(tt);
  }, [navigateToTitle]);
```

Update `handleUrlSubmit`:

```ts
  const handleUrlSubmit = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      let url = urlInput.trim();
      if (url && !url.startsWith('http')) url = 'https://' + url;
      if (url) navigateToUrl(url);
    }
  }, [navigateToUrl, urlInput]);
```

Update the back button JSX (currently `onClick={handleBack}`) to use `goBack`:

```tsx
              <button
                className="px-1.5 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                onClick={goBack}
                title="Back"
              >
                ←
              </button>
```

The webview ref callback (`ref={(el: WebviewTag | null) => { ... }}`) and the `webview` JSX element stay in Renamer.tsx (the JSX still owns the DOM element).

- [ ] **Step 3: Update the AKA-publish effect**

In Renamer.tsx, the existing effect that runs on `metadata` change publishes `currentTt` to testerStore (currently lines 147–158). The hook does not own this — leave it in Renamer.tsx as-is, but verify it still references `useTesterStore.getState()` correctly (it should, no changes needed).

Also delete the `setTesterError` and `setTesterResult` Renamer-level subscriptions if they were only used by code that's now in the hook. The hook subscribes to them internally; Renamer doesn't need them anymore. Verify by searching the file for those names.

- [ ] **Step 4: Run the suite**

Run: `npm test`
Expected: all green.

Run: `npx tsc --noEmit 2>&1 | grep -E "Renamer.tsx|useImdbWebview"`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/hooks/useImdbWebview.ts src/renderer/components/Renamer.tsx
git commit -m "refactor: extract webview lifecycle and tester handler into useImdbWebview"
```

---

## Task 9: Final cleanup pass

**Files:**
- Modify: `src/renderer/components/Renamer.tsx`

- [ ] **Step 1: Audit Renamer.tsx for dead state and stale imports**

Open `src/renderer/components/Renamer.tsx`. Walk the file:
- Verify every `useState` / `useRef` is still used. The remaining state should be: `webviewEl`, `useAka`, `selectedAka`, `nfoViewerOpen`, `nfoContent`, `selectedTt`. Anything else is dead.
- Verify every import is still used. Likely-removable: `useRef` (if no refs remain after Task 7/8), `extractImdbFromNfo`, `cp437StringToUnicode` (still used by NFO button), `interpolateFormat`, `parseTitleData`, `buildTitleUrl`, `searchPosters`, `buildPosterUrl`. Use TypeScript: `npx tsc --noEmit` will report unused imports if `noUnusedLocals` is on, otherwise just delete and see what breaks.
- Confirm `Renamer.tsx` line count is ≤ 250.

- [ ] **Step 2: Run lint and tests**

Run: `npm run lint`
Expected: 0 errors. Warning count should not have increased relative to the post-Spec-A baseline.

Run: `npm test`
Expected: all green.

Run: `npx tsc --noEmit`
Expected: no new errors in `src/renderer/components/Renamer.tsx`, the new hooks, or the new pipeline service.

- [ ] **Step 3: Manual smoke test**

Run: `npm start`
Verify, in this order:
1. App launches; ErrorBoundary not visible (no errors).
2. Open a folder with one movie, search, pick a result, rename. File renames, no toast.
3. Toggle on URL file + NFO include + delete-NFO + poster + folder rename. Rename. File + folder + URL file + poster all update; NFO is deleted.
4. Undo via the menu — everything reverts.
5. Force a failure: in a read-only folder, attempt rename. Expect a red "Rename failed: …" toast; file index advances.
6. Force a render error: temporarily edit `Renamer.tsx` to `throw new Error('test')` near the top of the component, save, observe ErrorBoundary screen with Reload + Copy error buttons. Revert the change.

- [ ] **Step 4: Verify branch shape**

Run: `git log --oneline master..HEAD`
Expected: 8 commits in order — ErrorBoundary, golden master tests, pipeline extraction, handleRename rewrite, useFilenamePreview, usePosterFetch, useAutoSelect, useImdbWebview. (Task 9 has no commit unless step 1 found dead code to delete; if so, commit it.)

If step 1 found dead code worth removing, commit it now:

```bash
git add src/renderer/components/Renamer.tsx
git commit -m "refactor: remove dead state and imports from Renamer.tsx"
```

Otherwise, the branch is complete after Task 8.

---

## Final verification

- [ ] **Tests:** `npm test` — all green.
- [ ] **Lint:** `npm run lint` — 0 errors.
- [ ] **Typecheck:** `npx tsc --noEmit` — no new errors in touched files.
- [ ] **Renamer.tsx size:** ≤ 250 lines.
- [ ] **Pipeline tests:** all 12 branches in `__tests__/services/renamePipeline.test.ts` pass.
- [ ] **Manual smoke:** golden path + failure toast + ErrorBoundary all work.

## Out of scope (deferred)

- Spec C items: dual-renamer state model, zustand pattern unification, PlatformAdapter.
- Fixing existing `react-hooks/exhaustive-deps` disables (year auto-select, others) — preserved for behavioral parity.
- Tests for the four new hooks themselves — covered transitively by existing Renamer/integration tests.
- TODO.md feature work.
