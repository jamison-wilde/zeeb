# Wire Up Config Options Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect 13 config fields that exist as UI-only controls to their backing application logic.

**Architecture:** Each task modifies the service/store layer where the config option takes effect, plus a test file. Renamer.tsx is the integration point for rename-time options. Most tasks are independent; URL file creation (Task 1) and folder rename (Task 5) both modify `handleRename` so Task 5 depends on Task 1.

**Tech Stack:** TypeScript, React 19, Zustand, Vitest, Electron IPC

**Spec:** `docs/superpowers/specs/2026-03-12-wire-up-config-options-design.md`

---

## File Map

| File | Responsibility | Tasks |
|------|---------------|-------|
| `src/services/urlFileWriter.ts` | URL/webloc file generation | 1 |
| `src/stores/undoStore.ts` | Undo transaction management | 2, 6 |
| `src/services/formatEngine.ts` | Format string interpolation | 3 |
| `src/services/fileScanner.ts` | Directory scanning | 4 |
| `src/renderer/components/Renamer.tsx` | Main rename UI + handler | 5, 7, 8 |
| `src/main/index.ts` | Electron main process | 9 |
| `src/main/ipc.ts` | IPC handlers | 9 |
| `src/preload/main.ts` | Preload bridge | 9 |
| `src/renderer/App.tsx` | App shell, scanDirectory call | 4 |
| `src/renderer/components/options/FormatTesterSection.tsx` | Format tester preview | 3 |

---

## Chunk 1: Service & Store Layer

### Task 1: URL file writer — fix NFO keys, gate sections, extend webloc

**Fields wired:** `includeOriginalInUrl`, `includeNfoInUrl` (generation side only)

**Files:**
- Modify: `src/services/urlFileWriter.ts`
- Modify: `__tests__/services/urlFileWriter.test.ts`

**Context:** `generateUrlFileContent()` always writes `[OriginalFilename]` and uses repeated `NFO=` keys (INI anti-pattern). `generateWeblocContent()` only takes a URL string. We need to gate sections with booleans and fix NFO keys to `LINE0=`, `LINE1=`, etc. Also extend webloc to accept optional extra data.

- [ ] **Step 1: Write failing tests for gated originalPath and sequential NFO keys**

Add to `__tests__/services/urlFileWriter.test.ts`:

```typescript
it('omits [OriginalFilename] when includeOriginal is false', () => {
  const content = generateUrlFileContent({
    url: 'http://www.imdb.com/title/tt0111161/',
    nfoContent: null,
    includeOriginal: false,
  });
  expect(content).toContain('[InternetShortcut]');
  expect(content).not.toContain('[OriginalFilename]');
});

it('includes [OriginalFilename] when includeOriginal is true', () => {
  const content = generateUrlFileContent({
    url: 'http://www.imdb.com/title/tt0111161/',
    originalPath: '/movies/old.mkv',
    nfoContent: null,
    includeOriginal: true,
  });
  expect(content).toContain('[OriginalFilename]');
  expect(content).toContain('NAME=/movies/old.mkv');
});

it('uses sequential LINE keys for NFO content', () => {
  const content = generateUrlFileContent({
    url: 'http://www.imdb.com/title/tt0111161/',
    nfoContent: 'line1\nline2\nline3',
    includeOriginal: false,
  });
  expect(content).toContain('[NFO]');
  expect(content).toContain('LINE0=line1');
  expect(content).toContain('LINE1=line2');
  expect(content).toContain('LINE2=line3');
  expect(content).not.toContain('NFO=');
});

it('generates webloc with optional original and NFO', () => {
  const content = generateWeblocContent({
    url: 'http://www.imdb.com/title/tt0111161/',
    originalPath: '/movies/old.mkv',
    nfoContent: 'some nfo data',
  });
  expect(content).toContain('<key>URL</key>');
  expect(content).toContain('<key>OriginalFilename</key>');
  expect(content).toContain('<string>/movies/old.mkv</string>');
  expect(content).toContain('<key>NFOContent</key>');
  expect(content).toContain('some nfo data');
});

it('generates webloc without optional fields when omitted', () => {
  const content = generateWeblocContent({ url: 'http://www.imdb.com/title/tt0111161/' });
  expect(content).toContain('<key>URL</key>');
  expect(content).not.toContain('OriginalFilename');
  expect(content).not.toContain('NFOContent');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/services/urlFileWriter.test.ts`
Expected: FAIL — old interface doesn't have `includeOriginal`, webloc doesn't accept options

- [ ] **Step 3: Update existing tests to use new interface**

The two existing tests must be updated to use the new `UrlFileOptions` shape:

```typescript
it('generates Windows .url content', () => {
  const content = generateUrlFileContent({
    url: 'http://www.imdb.com/title/tt0111161/',
    originalPath: '/movies/old.mkv',
    nfoContent: null,
    includeOriginal: true,
  });
  expect(content).toContain('[InternetShortcut]');
  expect(content).toContain('URL=http://www.imdb.com/title/tt0111161/');
  expect(content).toContain('[OriginalFilename]');
  expect(content).toContain('NAME=/movies/old.mkv');
});

it('includes NFO section when provided', () => {
  const content = generateUrlFileContent({
    url: 'http://www.imdb.com/title/tt0111161/',
    originalPath: '/movies/old.mkv',
    nfoContent: 'line1\nline2',
    includeOriginal: true,
  });
  expect(content).toContain('[NFO]');
  expect(content).toContain('LINE0=line1');
  expect(content).toContain('LINE1=line2');
});
```

Update the existing webloc test:
```typescript
it('generates macOS .webloc plist XML', () => {
  const content = generateWeblocContent({ url: 'http://www.imdb.com/title/tt0111161/' });
  expect(content).toContain('<?xml version="1.0"');
  expect(content).toContain('<string>http://www.imdb.com/title/tt0111161/</string>');
});
```

- [ ] **Step 4: Implement changes to urlFileWriter.ts**

Replace `src/services/urlFileWriter.ts` contents:

```typescript
export interface UrlFileOptions {
  url: string;
  originalPath?: string;
  nfoContent: string | null;
  includeOriginal?: boolean;
}

export interface WeblocOptions {
  url: string;
  originalPath?: string;
  nfoContent?: string | null;
}

/**
 * Generates Windows .url file content in INI format.
 */
export function generateUrlFileContent(options: UrlFileOptions): string {
  const lines: string[] = [
    '[InternetShortcut]',
    `URL=${options.url}`,
  ];

  if (options.includeOriginal && options.originalPath) {
    lines.push('');
    lines.push('[OriginalFilename]');
    lines.push(`NAME=${options.originalPath}`);
  }

  if (options.nfoContent) {
    lines.push('');
    lines.push('[NFO]');
    const nfoLines = options.nfoContent.split('\n');
    nfoLines.forEach((line, i) => {
      lines.push(`LINE${i}=${line}`);
    });
  }

  return lines.join('\r\n') + '\r\n';
}

/**
 * Generates macOS .webloc plist XML content.
 */
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function generateWeblocContent(options: WeblocOptions | string): string {
  // Support legacy single-string call
  const opts: WeblocOptions = typeof options === 'string' ? { url: options } : options;

  let extraKeys = '';
  if (opts.originalPath) {
    extraKeys += `\t<key>OriginalFilename</key>\n\t<string>${escapeXml(opts.originalPath)}</string>\n`;
  }
  if (opts.nfoContent) {
    extraKeys += `\t<key>NFOContent</key>\n\t<string>${escapeXml(opts.nfoContent)}</string>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>URL</key>
\t<string>${escapeXml(opts.url)}</string>
${extraKeys}</dict>
</plist>
`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run __tests__/services/urlFileWriter.test.ts`
Expected: PASS (all 7 tests)

- [ ] **Step 6: Update integration test for new UrlFileOptions interface**

In `__tests__/integration/renamePipeline.test.ts`, update the `generateUrlFileContent` call to use the new interface (add `includeOriginal: true`):

```typescript
const urlContent = generateUrlFileContent({
  url: `https://www.imdb.com/title/${meta.tt}/`,
  originalPath: '/movies/old.mkv',
  nfoContent: null,
  includeOriginal: true,
});
```

Run: `npx vitest run __tests__/integration/renamePipeline.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/services/urlFileWriter.ts __tests__/services/urlFileWriter.test.ts __tests__/integration/renamePipeline.test.ts
git commit -m "feat: gate URL file sections with includeOriginal, fix NFO key format, extend webloc"
```

---

### Task 2: Undo store — implement delete restore + maxUndos limit

**Fields wired:** `maxUndos`, `deleteNfoAfterInclude` (undo support)

**Files:**
- Modify: `src/stores/undoStore.ts`
- Modify: `__tests__/stores/undoStore.test.ts`

**Context:** `undoTransaction()` has `case 'delete': break;` — does nothing. Need to implement restore via `fs.writeFile()`. Also need `commitTransaction()` to trim transactions when exceeding `maxUndos`.

- [ ] **Step 1: Update beforeEach to mock writeFile as a spy**

The delete undo restore test needs `fs.writeFile` to be a `vi.fn()` spy for assertion. Update `beforeEach` in `__tests__/stores/undoStore.test.ts`:

```typescript
beforeEach(() => {
  fs = createMockFsAdapter({
    rename: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  });
});
```

- [ ] **Step 2: Write failing tests**

Add to `__tests__/stores/undoStore.test.ts`:

```typescript
it('restores deleted file on undo', async () => {
  const store = createUndoStore(fs);
  store.getState().beginTransaction();
  store.getState().addEntry({
    type: 'delete',
    sourcePath: '/movies/info.nfo',
    destPath: null,
    content: 'NFO content here',
  });
  store.getState().commitTransaction();

  await store.getState().undoTransaction(store.getState().transactions[0].id);
  expect(fs.writeFile).toHaveBeenCalledWith('/movies/info.nfo', 'NFO content here', 'utf-8');
  expect(store.getState().transactions).toHaveLength(0);
});

it('trims oldest transactions when exceeding maxUndos', () => {
  const store = createUndoStore(fs);
  for (let i = 0; i < 5; i++) {
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: `/old${i}.mkv`, destPath: `/new${i}.mkv` });
    store.getState().commitTransaction(3);
  }
  expect(store.getState().transactions).toHaveLength(3);
  // Oldest two (0, 1) trimmed; remaining are 2, 3, 4
  expect(store.getState().transactions[0].entries[0].sourcePath).toBe('/old2.mkv');
});

it('skips recording when maxUndos is 0', () => {
  const store = createUndoStore(fs);
  store.getState().beginTransaction();
  store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
  store.getState().commitTransaction(0);
  expect(store.getState().transactions).toHaveLength(0);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run __tests__/stores/undoStore.test.ts`
Expected: FAIL — `commitTransaction` doesn't accept `maxUndos`, delete case is no-op

- [ ] **Step 4: Implement changes to undoStore.ts**

In `src/stores/undoStore.ts`:

1. Update the `UndoStoreState` interface (line 10) to accept `maxUndos`:

```typescript
commitTransaction: (maxUndos?: number) => void;
```

2. Update `commitTransaction` implementation to accept optional `maxUndos`:

```typescript
commitTransaction(maxUndos?: number) {
  const pending = get().pendingTransaction;
  if (!pending) return;
  if (maxUndos === 0) {
    set({ pendingTransaction: null });
    return;
  }
  const transaction: RenameTransaction = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    timestamp: Date.now(),
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
```

3. Implement the `'delete'` case in `undoTransaction`:

```typescript
case 'delete':
  if (entry.content != null) {
    await fs.writeFile(entry.sourcePath, entry.content, 'utf-8');
  }
  break;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run __tests__/stores/undoStore.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add src/stores/undoStore.ts __tests__/stores/undoStore.test.ts
git commit -m "feat: implement delete undo restore, add maxUndos limit to commitTransaction"
```

---

### Task 3: Format engine — use `theWord` config instead of hard-coded "The"

**Fields wired:** `theWord`

**Files:**
- Modify: `src/services/formatEngine.ts`
- Modify: `__tests__/services/formatEngine.test.ts`
- Modify: `src/renderer/components/Renamer.tsx` (pass theWord)
- Modify: `src/renderer/components/options/FormatTesterSection.tsx` (pass theWord)

**Context:** `applyTheHandling()` hard-codes `/^The\s+/i`. Config has `theWord` but it's ignored. Need to add `theWord` to `FormatOptions`, use it in the regex, and pass it from callers.

- [ ] **Step 1: Write failing tests**

Add to `__tests__/services/formatEngine.test.ts`:

```typescript
it('removes custom theWord "Der" from title', () => {
  const german = { ...meta, title: 'Der Untergang' };
  const result = interpolateFormat('<title>', german, { saved: '', removeThe: true, theWord: 'Der' });
  expect(result).toBe('Untergang');
});

it('swaps custom theWord "Le" to end', () => {
  const french = { ...meta, title: 'Le Fabuleux Destin' };
  const result = interpolateFormat('<title>', french, { saved: '', swapThe: true, theWord: 'Le' });
  expect(result).toBe('Fabuleux Destin, Le');
});

it('defaults theWord to "The" when not provided', () => {
  const result = interpolateFormat('<title>', meta, { saved: '', removeThe: true });
  expect(result).toBe('Shawshank Redemption');
});

it('escapes regex special chars in theWord', () => {
  const weird = { ...meta, title: 'A+ Movie Title' };
  const result = interpolateFormat('<title>', weird, { saved: '', removeThe: true, theWord: 'A+' });
  expect(result).toBe('Movie Title');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/services/formatEngine.test.ts`
Expected: FAIL — `theWord` not used, hard-coded "The" won't match "Der"/"Le"

- [ ] **Step 3: Implement changes to formatEngine.ts**

Add `theWord` to `FormatOptions`:

```typescript
export interface FormatOptions {
  saved: string;
  selectedAka?: string;
  directorSeparator?: string;
  genreSeparator?: string;
  starSeparator?: string;
  removeThe?: boolean;
  swapThe?: boolean;
  titleSpaceChar?: string;
  mpaaMap?: Array<[string, string]>;
  theWord?: string;
}
```

Add escape utility and update `applyTheHandling`:

```typescript
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyTheHandling(title: string, options: FormatOptions): string {
  let result = title;
  const word = options.theWord ?? 'The';
  const escaped = escapeRegExp(word);
  if (options.removeThe) {
    result = result.replace(new RegExp(`^${escaped}\\s+`, 'i'), '');
  } else if (options.swapThe) {
    result = result.replace(new RegExp(`^(${escaped})\\s+(.+)$`, 'i'), '$2, $1');
  }
  if (options.titleSpaceChar) {
    result = result.replace(/ /g, options.titleSpaceChar);
  }
  return result;
}
```

- [ ] **Step 4: Pass theWord from Renamer.tsx**

In `src/renderer/components/Renamer.tsx`, in the `interpolateFormat` call (~line 162), add `theWord: config.theWord`:

```typescript
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
```

- [ ] **Step 5: Pass theWord from FormatTesterSection.tsx**

In `src/renderer/components/options/FormatTesterSection.tsx`, in the `interpolateFormat` call (~line 103), add `theWord: config.theWord`:

```typescript
const preview = testerResult
  ? interpolateFormat(activeFormat, testerResult, {
      saved: '(from current file)',
      directorSeparator: config.directorSeparator,
      genreSeparator: config.genreSeparator,
      starSeparator: config.starSeparator,
      removeThe: config.removeThe,
      swapThe: config.swapThe,
      titleSpaceChar: config.titleSpaceChar,
      mpaaMap: config.mpaaMap,
      theWord: config.theWord,
    })
  : '';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run __tests__/services/formatEngine.test.ts`
Expected: PASS (all tests including 4 new ones)

- [ ] **Step 7: Commit**

```bash
git add src/services/formatEngine.ts __tests__/services/formatEngine.test.ts src/renderer/components/Renamer.tsx src/renderer/components/options/FormatTesterSection.tsx
git commit -m "feat: use theWord config in format engine instead of hard-coded The"
```

---

### Task 4: File scanner — gate DVD detection with `detectDvd`

**Fields wired:** `detectDvd`

**Files:**
- Modify: `src/services/fileScanner.ts`
- Modify: `__tests__/services/fileScanner.test.ts`
- Modify: `src/renderer/App.tsx`

**Context:** `scanDirectory()` always calls `isDvdOrBluray()` on directories. Need to add `detectDvd` option and skip DVD detection when false, treating folders as normal directories for recursion.

- [ ] **Step 1: Write failing test**

Add to `__tests__/services/fileScanner.test.ts`:

```typescript
it('skips DVD detection when detectDvd is false', async () => {
  const dvdFiles: DirEntry[] = [
    mkEntry('MyMovie', '/movies/MyMovie', false),
  ];
  const subFiles: DirEntry[] = [
    mkEntry('movie.mkv', '/movies/MyMovie/movie.mkv', true, 2000),
  ];
  (fs.readdir as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce(dvdFiles)
    .mockResolvedValueOnce(subFiles);
  const files = await scanDirectory(fs, '/movies', ['mkv'], 'subfolders', { detectDvd: false });
  // Should NOT detect as DVD; should recurse and find movie.mkv inside
  expect(files.every((f) => !f.isDvdFolder)).toBe(true);
  expect(files).toHaveLength(1);
  expect(files[0].name).toBe('movie.mkv');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/services/fileScanner.test.ts`
Expected: FAIL — `scanDirectory` doesn't accept 5th arg

- [ ] **Step 3: Update existing test calls**

The existing tests call `scanDirectory(fs, path, exts, mode)`. The 5th parameter is optional, so existing calls continue to work. No changes needed to existing tests.

- [ ] **Step 4: Implement changes to fileScanner.ts**

Add options parameter to `scanDirectory`:

```typescript
interface ScanOptions {
  detectDvd?: boolean;
}

export async function scanDirectory(
  fs: FsAdapter,
  path: string,
  extensions: string[],
  recursionMode: RecursionMode,
  options?: ScanOptions,
): Promise<MovieFile[]> {
```

In the directory branch (~line 90), gate the DVD check:

```typescript
} else if (entry.isDirectory) {
  const detectDvd = options?.detectDvd ?? true;
  const dvd = detectDvd ? await isDvdOrBluray(fs, entry.path) : false;
```

Also pass `options` through to recursive calls (~line 115):

```typescript
const subResults = await scanDirectory(
  fs,
  entry.path,
  extensions,
  recursionMode === 'full' ? 'full' : 'none',
  options,
);
```

- [ ] **Step 5: Pass detectDvd from App.tsx**

In `src/renderer/App.tsx`, update the `scanDirectory` call (~line 91):

```typescript
const results = await scanDirectory(
  fs,
  path,
  config.movieExtensions,
  recursionMode as 'none' | 'subfolders' | 'full',
  { detectDvd: config.detectDvd },
);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run __tests__/services/fileScanner.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add src/services/fileScanner.ts __tests__/services/fileScanner.test.ts src/renderer/App.tsx
git commit -m "feat: gate DVD detection with detectDvd config option"
```

---

## Chunk 2: Renamer Integration

### Task 5: Rename handler — wire createUrlFile, includeNfoInUrl, deleteNfoAfterInclude, renameFolder, maxUndos

**Fields wired:** `createUrlFile`, `includeNfoInUrl`, `deleteNfoAfterInclude`, `includeOriginalInUrl`, `renameFolder`, `maxUndos`

**Files:**
- Modify: `src/renderer/components/Renamer.tsx`
- Modify: `__tests__/integration/renamePipeline.test.ts`

**Context:** `handleRename()` currently renames the file + subtitles, commits the undo transaction, and logs. Need to add: folder rename, URL file creation, NFO deletion, and pass `maxUndos` to `commitTransaction()`.

**Dependencies:** Tasks 1 and 2 must be complete (URL writer and undo store changes).

- [ ] **Step 1: Write integration test for URL file creation**

Add to `__tests__/integration/renamePipeline.test.ts`:

```typescript
import { generateUrlFileContent } from '../../src/services/urlFileWriter';
```

(already imported — verify)

Add test:

```typescript
it('creates URL file when createUrlFile is true', async () => {
  const undoStore = createUndoStore(fs);

  undoStore.getState().beginTransaction();
  const entry = await renameFile(fs, '/movies/old.mkv', '/movies/new.mkv');
  undoStore.getState().addEntry(entry);

  // Simulate URL file creation
  const urlContent = generateUrlFileContent({
    url: 'https://www.imdb.com/title/tt0111161/',
    originalPath: '/movies/old.mkv',
    nfoContent: null,
    includeOriginal: true,
  });
  expect(urlContent).toContain('[InternetShortcut]');
  expect(urlContent).toContain('[OriginalFilename]');
  expect(urlContent).toContain('NAME=/movies/old.mkv');

  undoStore.getState().commitTransaction();
  expect(undoStore.getState().transactions).toHaveLength(1);
});

it('respects maxUndos limit in commitTransaction', () => {
  const undoStore = createUndoStore(fs);
  for (let i = 0; i < 5; i++) {
    undoStore.getState().beginTransaction();
    undoStore.getState().addEntry({ type: 'rename', sourcePath: `/old${i}.mkv`, destPath: `/new${i}.mkv` });
    undoStore.getState().commitTransaction(2);
  }
  expect(undoStore.getState().transactions).toHaveLength(2);
});
```

- [ ] **Step 2: Run test to verify it passes (this is an integration sanity check)**

Run: `npx vitest run __tests__/integration/renamePipeline.test.ts`
Expected: PASS — these test the already-modified service layer from Tasks 1-2

- [ ] **Step 3: Modify handleRename in Renamer.tsx**

The updated `handleRename` needs these additions in order:

1. File rename (existing)
2. Subtitle renames (existing)
3. **Folder rename** (new — if `config.renameFolder`)
4. **URL file creation** (new — if `config.createUrlFile`)
5. **NFO deletion** (new — if `config.deleteNfoAfterInclude` and NFO was included)
6. **commitTransaction with maxUndos** (modified)

First, update the `undoStore` prop type in `RenamerProps` to accept the new `maxUndos` parameter:

```typescript
undoStore?: StoreApi<{
  beginTransaction: () => void;
  addEntry: (entry: UndoEntry) => void;
  commitTransaction: (maxUndos?: number) => void;
}>;
```

Add static import for URL file writer at the top of the file:

```typescript
import { generateUrlFileContent, generateWeblocContent } from '../../services/urlFileWriter';
```

Replace the `handleRename` callback in `src/renderer/components/Renamer.tsx`:

```typescript
const handleRename = useCallback(async () => {
  if (!currentFile || !previewFilename) return;

  undoStore?.getState().beginTransaction();

  try {
    const sep = currentFile.nativePath.includes('\\') ? '\\' : '/';
    let workingFolder = currentFile.folder;
    const newPath = `${workingFolder}${sep}${previewFilename}`;
    const entry = await renameFile(fs, currentFile.nativePath, newPath);
    undoStore?.getState().addEntry(entry);

    // Rename subtitles
    const baseName = currentFile.name.replace(/\.[^.]+$/, '');
    const newBase = previewFilename.replace(/\.[^.]+$/, '');
    const subs = await findSubtitles(fs, workingFolder, baseName, config.subtitleExtensions);
    if (subs.length > 0) {
      const subEntries = await renameSubtitles(fs, subs, baseName, newBase);
      for (const subEntry of subEntries) {
        undoStore?.getState().addEntry(subEntry);
      }
    }

    // Rename folder if enabled
    if (config.renameFolder) {
      const parentParts = workingFolder.split(/[\\/]/);
      // Skip if root/drive path (e.g., "C:" or "")
      if (parentParts.length > 1 && parentParts[parentParts.length - 1] !== '') {
        const parentDir = parentParts.slice(0, -1).join(sep);
        const newFolderName = newBase;
        const currentFolderName = parentParts[parentParts.length - 1];
        if (currentFolderName !== newFolderName) {
          const newFolderPath = `${parentDir}${sep}${newFolderName}`;
          await fs.rename(workingFolder, newFolderPath);
          undoStore?.getState().addEntry({
            type: 'rename',
            sourcePath: workingFolder,
            destPath: newFolderPath,
          });
          workingFolder = newFolderPath;
        }
      }
    }

    // Create URL file if enabled
    let nfoContent: string | null = null;
    if (config.createUrlFile && metadata) {
      if (config.includeNfoInUrl && currentFile.nfoPath) {
        try {
          // If folder was renamed, adjust NFO path
          const nfoName = currentFile.nfoPath.split(/[\\/]/).pop()!;
          const nfoPath = workingFolder !== currentFile.folder
            ? `${workingFolder}${sep}${nfoName}`
            : currentFile.nfoPath;
          nfoContent = await fs.readFile(nfoPath, 'utf-8');
        } catch { /* NFO read failed — skip */ }
      }

      const isMac = navigator.userAgent.includes('Macintosh');
      const urlExt = isMac ? '.webloc' : '.url';
      const urlPath = `${workingFolder}${sep}${newBase}${urlExt}`;
      const imdbUrl = buildTitleUrl(metadata.tt, config.urlImdbTT);

      const urlContent = isMac
        ? generateWeblocContent({
            url: imdbUrl,
            originalPath: config.includeOriginalInUrl ? currentFile.nativePath : undefined,
            nfoContent,
          })
        : generateUrlFileContent({
            url: imdbUrl,
            originalPath: config.includeOriginalInUrl ? currentFile.nativePath : undefined,
            nfoContent,
            includeOriginal: config.includeOriginalInUrl,
          });

      await fs.writeFile(urlPath, urlContent, 'utf-8');
      undoStore?.getState().addEntry({
        type: 'create',
        sourcePath: urlPath,
        destPath: urlPath,
      });

      // Delete NFO after including in URL file
      if (config.deleteNfoAfterInclude && nfoContent != null && currentFile.nfoPath) {
        const nfoName = currentFile.nfoPath.split(/[\\/]/).pop()!;
        const nfoPath = workingFolder !== currentFile.folder
          ? `${workingFolder}${sep}${nfoName}`
          : currentFile.nfoPath;
        await fs.unlink(nfoPath);
        undoStore?.getState().addEntry({
          type: 'delete',
          sourcePath: nfoPath,
          destPath: null,
          content: nfoContent,
        });
      }
    }

    undoStore?.getState().commitTransaction(config.maxUndos);
    onFileRenamed?.(currentFile.id, previewFilename, `${workingFolder}${sep}${previewFilename}`);

    if (config.logFilePath) {
      const logger = createLogger(fs, config.logFilePath);
      await logger.log('rename', currentFile.nativePath, `${workingFolder}${sep}${previewFilename}`);
    }
  } catch {
    // Transaction stays pending for inspection
  }

  advance();
}, [currentFile, previewFilename, metadata, fs, undoStore, onFileRenamed, config, searchParts, advance]);
```

Also add the import at top of file:
```typescript
import { buildTitleUrl, parseTitleData } from '../../services/imdbExtractor';
```
(already imported — verify)

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/Renamer.tsx __tests__/integration/renamePipeline.test.ts
git commit -m "feat: wire createUrlFile, renameFolder, deleteNfoAfterInclude, maxUndos into handleRename"
```

---

### Task 6: Webview zoom — apply `htmlZoom`

**Fields wired:** `htmlZoom`

**Files:**
- Modify: `src/renderer/components/Renamer.tsx`

**Context:** The webview in Renamer.tsx never calls `setZoomFactor()`. Need to apply `config.htmlZoom / 100` on `dom-ready` and when the config value changes.

- [ ] **Step 1: Add zoom logic to Renamer.tsx**

Add a ref to track webview readiness, and a useEffect to apply zoom:

After the `navigationMode` ref (~line 76), add:

```typescript
const webviewReady = useRef(false);
```

In the existing `handleDomReady` function (~line 203), add zoom application:

```typescript
const handleDomReady = () => {
  webviewReady.current = true;
  try {
    const url = webview.getURL();
    setUrlInput(url);
  } catch { /* ignore */ }
  // Apply zoom factor
  try {
    webview.setZoomFactor(config.htmlZoom / 100);
  } catch { /* ignore */ }
  // Send extraction patterns to the newly loaded preload context
  try {
    webview.send('set-extraction-patterns', config.extractionPatterns);
  } catch { /* ignore */ }
};
```

Add a new useEffect to re-apply zoom when config changes:

```typescript
useEffect(() => {
  if (!webviewEl || !webviewReady.current) return;
  try {
    webviewEl.setZoomFactor(config.htmlZoom / 100);
  } catch { /* webview not ready */ }
}, [webviewEl, config.htmlZoom]);
```

Note: `config.htmlZoom` is already in the dependency array for the main webview useEffect via `config.extractionPatterns`. Add `config.htmlZoom` to the dependency array of the useEffect that sets up `handleDomReady` (~line 256).

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: PASS (webview mocking in tests doesn't call setZoomFactor — no regressions)

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/Renamer.tsx
git commit -m "feat: apply htmlZoom config to webview via setZoomFactor"
```

---

### Task 7: Webview visibility — `showWebView` toggle with placeholder

**Fields wired:** `showWebView`

**Files:**
- Modify: `src/renderer/components/Renamer.tsx`

**Context:** Webview must stay in DOM for IPC extraction. When `showWebView` is false, hide via CSS and show "Poster view coming soon" placeholder.

- [ ] **Step 1: Modify the right panel rendering in Renamer.tsx**

Replace the right panel section (~lines 437-465):

```typescript
{/* Right panel: URL bar + webview */}
<div className="flex-1 flex flex-col min-h-0">
  {config.showWebView && (
    <div className="flex items-center gap-1 px-1 py-0.5 bg-gray-100 border-b border-gray-300">
      <button
        className="px-1.5 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 rounded"
        onClick={handleBack}
        title="Back"
      >
        ←
      </button>
      <input
        className="flex-1 px-2 py-0.5 text-xs border border-gray-300 rounded bg-white"
        value={urlInput}
        onChange={(e) => setUrlInput(e.target.value)}
        onKeyDown={handleUrlSubmit}
        placeholder="URL"
      />
    </div>
  )}
  <div className="flex-1 min-h-0 relative">
    {webviewPreloadPath && (
      <webview
        ref={(el: any) => { if (el && el !== webviewEl) setWebviewEl(el); }}
        data-testid="imdb-webview"
        src="about:blank"
        preload={webviewPreloadPath}
        style={config.showWebView
          ? { width: '100%', height: '100%' }
          : { position: 'absolute', left: '-9999px', width: '1px', height: '1px' }
        }
      />
    )}
    {!config.showWebView && (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Poster view coming soon
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/Renamer.tsx
git commit -m "feat: toggle webview visibility with showWebView config, show placeholder"
```

---

## Chunk 3: Window State & Final Verification

### Task 8: Window state persistence

**Fields wired:** `windowWidth`, `windowHeight`, `windowMaximized`

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/main.ts`
- Modify: `src/renderer/App.tsx`

**Context:** Main process hard-codes 1024x768. Need to read config on startup, listen for resize/maximize events, and persist changes back to renderer's configStore.

- [ ] **Step 1: Read config in main process on startup**

In `src/main/index.ts`, add imports and read config before creating window:

```typescript
import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'node:path';
import * as fs from 'node:fs';
import { registerIpcHandlers } from './ipc';
```

Add helper function before `createWindow`:

```typescript
function loadWindowState(): { width: number; height: number; maximized: boolean } {
  const defaults = { width: 1024, height: 768, maximized: false };
  try {
    const configDir = app.getPath('userData');
    const configPath = path.join(configDir, 'zeeb-config.json');
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    return {
      width: typeof config.windowWidth === 'number' ? config.windowWidth : defaults.width,
      height: typeof config.windowHeight === 'number' ? config.windowHeight : defaults.height,
      maximized: typeof config.windowMaximized === 'boolean' ? config.windowMaximized : defaults.maximized,
    };
  } catch {
    return defaults;
  }
}
```

Update `createWindow` to use it:

```typescript
function createWindow(): void {
  const windowState = loadWindowState();

  const mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    webPreferences: {
      preload: path.join(__dirname, 'main.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  if (windowState.maximized) {
    mainWindow.maximize();
  }
```

- [ ] **Step 2: Add resize/maximize event listeners**

Add after the `Menu.setApplicationMenu(menu)` call:

```typescript
  // Persist window state on resize/maximize
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;

  mainWindow.on('resize', () => {
    if (mainWindow.isMaximized()) return;
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const [width, height] = mainWindow.getSize();
      mainWindow.webContents.send('config:window-state', { windowWidth: width, windowHeight: height });
    }, 500);
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('config:window-state', { windowMaximized: true });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('config:window-state', { windowMaximized: false });
    const [width, height] = mainWindow.getSize();
    mainWindow.webContents.send('config:window-state', { windowWidth: width, windowHeight: height });
  });
```

- [ ] **Step 3: Add preload bridge for window state event**

In `src/preload/main.ts`, add `onWindowStateChanged` to the `zeebMenu` bridge. Return a removal function so the renderer can clean up:

```typescript
contextBridge.exposeInMainWorld('zeebMenu', {
  onOptions: (callback: () => void) => ipcRenderer.on('menu:options', callback),
  onUndo: (callback: () => void) => ipcRenderer.on('menu:undo', callback),
  onReleaseNotes: (callback: () => void) => ipcRenderer.on('menu:release-notes', callback),
  onWindowStateChanged: (callback: (state: any) => void) => {
    const handler = (_event: any, state: any) => callback(state);
    ipcRenderer.on('config:window-state', handler);
    return () => ipcRenderer.removeListener('config:window-state', handler);
  },
});
```

- [ ] **Step 4: Listen for window state in App.tsx**

In `src/renderer/App.tsx`, add a useEffect to handle window state events. Store the cleanup function returned by the preload bridge:

```typescript
useEffect(() => {
  const cleanup = window.zeebMenu.onWindowStateChanged((state: Partial<{ windowWidth: number; windowHeight: number; windowMaximized: boolean }>) => {
    updateConfig(state);
    void save();
  });
  return cleanup;
}, [updateConfig, save]);
```

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/index.ts src/preload/main.ts src/renderer/App.tsx
git commit -m "feat: persist and restore window dimensions and maximized state"
```

---

### Task 9: Full test suite verification

**Files:**
- No new files

- [ ] **Step 1: Run the complete test suite**

Run: `npx vitest run`
Expected: PASS — all tests green

- [ ] **Step 2: Verify no regressions in key integration tests**

Run these individually if the full suite passes:
```
npx vitest run __tests__/integration/renamePipeline.test.ts
npx vitest run __tests__/services/formatEngine.test.ts
npx vitest run __tests__/services/urlFileWriter.test.ts
npx vitest run __tests__/stores/undoStore.test.ts
npx vitest run __tests__/services/fileScanner.test.ts
```

- [ ] **Step 3: Commit any test fixes if needed**

Only if tests required adjustments.
