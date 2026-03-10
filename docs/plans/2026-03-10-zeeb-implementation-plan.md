# Zeeb React Native Rewrite — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite Zeeb (Adobe Flex movie file renamer) as a React Native desktop app for Windows and macOS.

**Architecture:** Dual-Renamer pattern with WebView JS injection for IMDB data extraction. Zustand stores for state. JSON file for config persistence. Services layer decoupled from UI.

**Tech Stack:** React Native, react-native-windows, react-native-macos, react-native-webview, react-native-fs, Zustand, TypeScript (strict)

**Design Doc:** `docs/plans/2026-03-10-zeeb-react-native-design.md`

---

## Phase 1: Scaffold & Core Types

### Task 1: Initialize React Native Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `App.tsx`, etc. (via CLI)

**Step 1: Init RN project with Windows + macOS support**

```bash
npx @react-native-community/cli init Zeeb --template @react-native-community/template --directory .
npx react-native-windows-init --overwrite
npx react-native-macos-init --overwrite
```

**Step 2: Install core dependencies**

```bash
npm install zustand react-native-webview react-native-fs
npm install --save-dev @types/react @types/react-native jest ts-jest
```

**Step 3: Verify builds**

Run: `npx react-native run-windows`
Expected: Default RN app launches on Windows

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold React Native project with Windows + macOS support"
```

### Task 2: Define Core Types

**Files:**
- Create: `src/types/index.ts`
- Test: `__tests__/types.test.ts`

**Step 1: Write type validation test**

```typescript
import type {
  MovieFile,
  MovieMatch,
  MovieMetadata,
  SearchPart,
  SearchPartState,
  RenameTransaction,
  UndoEntry,
  ZeebConfig,
  ExtractionPattern,
  FormatTokens,
} from '../src/types';

describe('Core types', () => {
  it('MovieFile has required fields', () => {
    const file: MovieFile = {
      id: '1',
      name: 'Movie.2024.720p.mkv',
      nativePath: '/movies/Movie.2024.720p.mkv',
      folder: '/movies',
      extension: 'mkv',
      size: 1024,
      isDvdFolder: false,
      hasNfo: false,
      hasUrl: false,
      hasPoster: false,
      nfoPath: null,
      urlPath: null,
      posterPath: null,
    };
    expect(file.name).toBe('Movie.2024.720p.mkv');
  });

  it('SearchPart tracks state and text', () => {
    const part: SearchPart = {
      id: '0',
      text: 'Movie',
      originalText: 'Movie',
      state: 'search',
      editable: true,
    };
    expect(part.state).toBe('search');
  });

  it('MovieMetadata holds extracted IMDB data', () => {
    const meta: MovieMetadata = {
      tt: 'tt0111161',
      title: 'The Shawshank Redemption',
      year: 1994,
      rating: 9.3,
      directors: ['Frank Darabont'],
      genres: ['Drama'],
      actors: ['Tim Robbins', 'Morgan Freeman'],
      duration: 142,
      mpaa: 'R',
      aka: [],
      posterUrl: null,
    };
    expect(meta.tt).toBe('tt0111161');
  });

  it('RenameTransaction tracks undo operations', () => {
    const tx: RenameTransaction = {
      id: '1',
      timestamp: Date.now(),
      entries: [
        {
          type: 'rename',
          sourcePath: '/movies/old.mkv',
          destPath: '/movies/new.mkv',
        },
      ],
    };
    expect(tx.entries).toHaveLength(1);
  });

  it('ExtractionPattern supports all three tiers', () => {
    const pattern: ExtractionPattern = {
      field: 'title',
      jsonLdPath: 'name',
      domSelector: 'h1[data-testid="hero__pageTitle"] span',
      regexPattern: '<title>(.+?) \\(\\d{4}\\)',
      regexGroup: 1,
    };
    expect(pattern.field).toBe('title');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/types.test.ts`
Expected: FAIL — cannot find module '../src/types'

**Step 3: Write types**

```typescript
// src/types/index.ts

export type SearchPartState = 'search' | 'keep' | 'remove' | 'keepAlways' | 'removeAlways';

export interface SearchPart {
  id: string;
  text: string;
  originalText: string;
  state: SearchPartState;
  editable: boolean;
}

export interface MovieFile {
  id: string;
  name: string;
  nativePath: string;
  folder: string;
  extension: string;
  size: number;
  isDvdFolder: boolean;
  hasNfo: boolean;
  hasUrl: boolean;
  hasPoster: boolean;
  nfoPath: string | null;
  urlPath: string | null;
  posterPath: string | null;
}

export interface MovieMatch {
  tt: string;
  title: string;
  year: number | null;
  aka: string | null;
  thumbnailUrl: string | null;
}

export interface MovieMetadata {
  tt: string;
  title: string;
  year: number | null;
  rating: number | null;
  directors: string[];
  genres: string[];
  actors: string[];
  duration: number | null;
  mpaa: string | null;
  aka: string[];
  posterUrl: string | null;
}

export type UndoEntryType = 'rename' | 'create' | 'delete';

export interface UndoEntry {
  type: UndoEntryType;
  sourcePath: string;
  destPath: string | null;
  content?: string;
}

export interface RenameTransaction {
  id: string;
  timestamp: number;
  entries: UndoEntry[];
}

export interface ExtractionPattern {
  field: string;
  jsonLdPath: string | null;
  domSelector: string | null;
  regexPattern: string | null;
  regexGroup: number | null;
}

export interface FormatTokens {
  title: string;
  year: string;
  imdb: string;
  rating100: string;
  rating10: string;
  directors: string;
  director: string;
  genres: string;
  genre: string;
  stars: string;
  star1: string;
  stars2: string;
  stars3: string;
  duration: string;
  mpaa: string;
  H: string;
  M: string;
  aka: string;
  original: string;
  saved: string;
}

export interface ZeebConfig {
  // Window state
  windowWidth: number;
  windowHeight: number;
  windowMaximized: boolean;

  // Format strings
  formatStandard: string;
  formatAka: string;
  formatDvd: string;
  formatPoster: string;
  formatUrl: string;

  // File handling
  movieExtensions: string[];
  subtitleExtensions: string[];
  removeTerms: string[];
  keepTerms: string[];

  // IMDB/TMDB
  urlImdbSearch: string;
  urlImdbTT: string;
  urlTmdbApi: string;
  tmdbApiKey: string;

  // Extraction patterns (user-configurable)
  extractionPatterns: ExtractionPattern[];

  // Separators
  directorSeparator: string;
  genreSeparator: string;
  starSeparator: string;

  // Options
  renameFolder: boolean;
  createUrlFile: boolean;
  createPoster: boolean;
  removeThe: boolean;
  swapThe: boolean;
  titleSpaceChar: string;
  htmlZoom: number;
  showWebView: boolean;

  // NFO
  nfoFolder: string;
  scanNfo: boolean;

  // MPAA mapping
  mpaaMap: Record<string, string>;

  // Recent folders
  recentFolders: string[];

  // Recursion
  recursionMode: 'none' | 'subfolders' | 'full';

  // Log
  logFilePath: string;

  // Legacy regex (for imported configs)
  customRegexPatterns: Record<string, string> | null;
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/index.ts __tests__/types.test.ts
git commit -m "feat: define core TypeScript types for Zeeb"
```

---

## Phase 2: Utilities

### Task 3: CP437 Character Map

**Files:**
- Create: `src/utils/cp437.ts`
- Test: `__tests__/utils/cp437.test.ts`

**Step 1: Write failing test**

```typescript
import { cp437ToUnicode } from '../../src/utils/cp437';

describe('cp437ToUnicode', () => {
  it('converts standard ASCII unchanged', () => {
    expect(cp437ToUnicode(Buffer.from([0x41, 0x42, 0x43]))).toBe('ABC');
  });

  it('converts CP437 box-drawing characters', () => {
    // 0xC9 = ╔, 0xCD = ═, 0xBB = ╗
    expect(cp437ToUnicode(Buffer.from([0xc9, 0xcd, 0xbb]))).toBe('╔═╗');
  });

  it('converts CP437 block elements', () => {
    // 0xB0 = ░, 0xB1 = ▒, 0xB2 = ▓, 0xDB = █
    expect(cp437ToUnicode(Buffer.from([0xb0, 0xb1, 0xb2, 0xdb]))).toBe('░▒▓█');
  });

  it('handles empty input', () => {
    expect(cp437ToUnicode(Buffer.from([]))).toBe('');
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Full 256-entry CP437 → Unicode lookup table. Port the mapping from `NfoViewer.mxml`'s character conversion logic.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/utils/cp437.ts __tests__/utils/cp437.test.ts
git commit -m "feat: add CP437 to Unicode character mapping"
```

### Task 4: Platform Utility

**Files:**
- Create: `src/utils/platform.ts`
- Test: `__tests__/utils/platform.test.ts`

**Step 1: Write failing test**

```typescript
import { isWindows, isMacOS, urlShortcutExtension } from '../../src/utils/platform';

describe('platform utils', () => {
  it('urlShortcutExtension returns .url or .webloc', () => {
    const ext = urlShortcutExtension();
    expect(['.url', '.webloc']).toContain(ext);
  });

  it('isWindows and isMacOS are mutually exclusive', () => {
    expect(isWindows() && isMacOS()).toBe(false);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement**

```typescript
import { Platform } from 'react-native';

export const isWindows = (): boolean => Platform.OS === 'windows';
export const isMacOS = (): boolean => Platform.OS === 'macos';

export const urlShortcutExtension = (): string =>
  isMacOS() ? '.webloc' : '.url';
```

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/utils/platform.ts __tests__/utils/platform.test.ts
git commit -m "feat: add platform detection utilities"
```

### Task 5: Default Terms

**Files:**
- Create: `src/utils/defaultTerms.ts`
- Test: `__tests__/utils/defaultTerms.test.ts`

**Step 1: Write failing test**

```typescript
import { DEFAULT_REMOVE_TERMS, DEFAULT_KEEP_TERMS, DEFAULT_MOVIE_EXTENSIONS, DEFAULT_SUBTITLE_EXTENSIONS } from '../../src/utils/defaultTerms';

describe('defaultTerms', () => {
  it('remove terms includes common release group tags', () => {
    expect(DEFAULT_REMOVE_TERMS).toContain('YIFY');
    expect(DEFAULT_REMOVE_TERMS).toContain('BluRay');
    expect(DEFAULT_REMOVE_TERMS).toContain('WEBRip');
  });

  it('remove terms includes modern encoding formats', () => {
    expect(DEFAULT_REMOVE_TERMS).toContain('x265');
    expect(DEFAULT_REMOVE_TERMS).toContain('HEVC');
    expect(DEFAULT_REMOVE_TERMS).toContain('HDR');
    expect(DEFAULT_REMOVE_TERMS).toContain('Atmos');
    expect(DEFAULT_REMOVE_TERMS).toContain('DTS-HD');
  });

  it('keep terms includes quality markers', () => {
    expect(DEFAULT_KEEP_TERMS).toContain('720p');
    expect(DEFAULT_KEEP_TERMS).toContain('1080p');
    expect(DEFAULT_KEEP_TERMS).toContain('4K');
    expect(DEFAULT_KEEP_TERMS).toContain("Director's Cut");
    expect(DEFAULT_KEEP_TERMS).toContain('Extended');
  });

  it('movie extensions includes standard formats', () => {
    expect(DEFAULT_MOVIE_EXTENSIONS).toContain('mkv');
    expect(DEFAULT_MOVIE_EXTENSIONS).toContain('mp4');
    expect(DEFAULT_MOVIE_EXTENSIONS).toContain('avi');
  });

  it('subtitle extensions includes standard formats', () => {
    expect(DEFAULT_SUBTITLE_EXTENSIONS).toContain('srt');
    expect(DEFAULT_SUBTITLE_EXTENSIONS).toContain('sub');
    expect(DEFAULT_SUBTITLE_EXTENSIONS).toContain('idx');
  });

  it('has no duplicates in remove terms', () => {
    const unique = new Set(DEFAULT_REMOVE_TERMS.map(t => t.toLowerCase()));
    expect(unique.size).toBe(DEFAULT_REMOVE_TERMS.length);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Port all terms from legacy `Config.as`, add modern terms (x265, HEVC, HDR, HDR10, HDR10+, Dolby Vision, DV, Atmos, DTS-HD, DTS-X, REMUX, 2160p, 4K, UHD, WEB-DL, WEBRip, AMZN, NF, DSNP, HMAX, ATVP, etc.).

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/utils/defaultTerms.ts __tests__/utils/defaultTerms.test.ts
git commit -m "feat: add refreshed default remove/keep terms"
```

---

## Phase 3: Services (no UI dependency)

### Task 6: Config Store with JSON Persistence

**Files:**
- Create: `src/stores/configStore.ts`
- Create: `src/services/configDefaults.ts`
- Test: `__tests__/stores/configStore.test.ts`

**Step 1: Write failing test**

```typescript
import { createConfigStore, DEFAULT_CONFIG } from '../../src/stores/configStore';

// Mock react-native-fs
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/docs',
  readFile: jest.fn(),
  writeFile: jest.fn(),
  exists: jest.fn(),
}));

import RNFS from 'react-native-fs';

describe('configStore', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initializes with defaults when no config file exists', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    const store = createConfigStore();
    await store.getState().load();
    expect(store.getState().config.formatStandard).toBe(DEFAULT_CONFIG.formatStandard);
  });

  it('loads config from JSON file', async () => {
    const saved = { ...DEFAULT_CONFIG, removeThe: true };
    (RNFS.exists as jest.Mock).mockResolvedValue(true);
    (RNFS.readFile as jest.Mock).mockResolvedValue(JSON.stringify(saved));
    const store = createConfigStore();
    await store.getState().load();
    expect(store.getState().config.removeThe).toBe(true);
  });

  it('saves config to JSON file', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    (RNFS.writeFile as jest.Mock).mockResolvedValue(undefined);
    const store = createConfigStore();
    await store.getState().load();
    store.getState().updateConfig({ removeThe: true });
    await store.getState().save();
    expect(RNFS.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('zeeb-config.json'),
      expect.stringContaining('"removeThe":true'),
      'utf8'
    );
  });

  it('merges partial updates without losing other fields', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    const store = createConfigStore();
    await store.getState().load();
    const original = store.getState().config.formatStandard;
    store.getState().updateConfig({ removeThe: true });
    expect(store.getState().config.formatStandard).toBe(original);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Zustand store with `load()`, `save()`, `updateConfig(partial)`. Default config values include all fields from `ZeebConfig` type. JSON pretty-printed on save for human readability.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/stores/configStore.ts src/services/configDefaults.ts __tests__/stores/configStore.test.ts
git commit -m "feat: add config store with JSON file persistence"
```

### Task 7: Filename Parser Service

**Files:**
- Create: `src/services/filenameParser.ts`
- Test: `__tests__/services/filenameParser.test.ts`

**Step 1: Write failing test**

```typescript
import { parseFilename } from '../../src/services/filenameParser';

const removeTerms = ['BluRay', 'x264', 'YIFY', '720p', 'DTS'];
const keepTerms = ['Directors Cut', 'Extended'];

describe('parseFilename', () => {
  it('splits filename into parts by common separators', () => {
    const parts = parseFilename('The.Matrix.1999.720p.BluRay.x264-YIFY.mkv', removeTerms, keepTerms);
    const texts = parts.map(p => p.text);
    expect(texts).toContain('The');
    expect(texts).toContain('Matrix');
    expect(texts).toContain('1999');
  });

  it('marks remove terms as remove state', () => {
    const parts = parseFilename('Movie.720p.BluRay.x264.mkv', removeTerms, keepTerms);
    const bluray = parts.find(p => p.text === 'BluRay');
    expect(bluray?.state).toBe('remove');
  });

  it('marks keep terms as keep state', () => {
    const parts = parseFilename('Movie.Directors.Cut.mkv', removeTerms, keepTerms);
    const dc = parts.find(p => p.text === 'Directors Cut');
    expect(dc?.state).toBe('keep');
  });

  it('strips file extension', () => {
    const parts = parseFilename('Movie.mkv', removeTerms, keepTerms);
    expect(parts.find(p => p.text === 'mkv')).toBeUndefined();
  });

  it('handles spaces, dots, underscores, and dashes as separators', () => {
    const parts = parseFilename('Movie_Name-2024 720p.mkv', removeTerms, keepTerms);
    const texts = parts.map(p => p.text);
    expect(texts).toContain('Movie');
    expect(texts).toContain('Name');
    expect(texts).toContain('2024');
  });

  it('detects year-like 4-digit numbers and marks as search', () => {
    const parts = parseFilename('Movie.1999.mkv', removeTerms, keepTerms);
    const year = parts.find(p => p.text === '1999');
    expect(year?.state).toBe('search');
  });

  it('returns empty array for empty input', () => {
    expect(parseFilename('', removeTerms, keepTerms)).toEqual([]);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Port regex splitting logic from `Renamer.mxml`'s `parseFileName()`. Classify each token by matching against remove/keep term lists (case-insensitive). Handle multi-word keep terms by joining adjacent parts. Return `SearchPart[]`.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/services/filenameParser.ts __tests__/services/filenameParser.test.ts
git commit -m "feat: add filename parser service"
```

### Task 8: Format Engine Service

**Files:**
- Create: `src/services/formatEngine.ts`
- Test: `__tests__/services/formatEngine.test.ts`

**Step 1: Write failing test**

```typescript
import { interpolateFormat } from '../../src/services/formatEngine';
import type { MovieMetadata } from '../../src/types';

const meta: MovieMetadata = {
  tt: 'tt0111161',
  title: 'The Shawshank Redemption',
  year: 1994,
  rating: 9.3,
  directors: ['Frank Darabont'],
  genres: ['Drama'],
  actors: ['Tim Robbins', 'Morgan Freeman', 'Bob Gunton'],
  duration: 142,
  mpaa: 'R',
  aka: ['Die Verurteilten'],
  posterUrl: null,
};

describe('interpolateFormat', () => {
  it('replaces <title> with movie title', () => {
    expect(interpolateFormat('<title>', meta, { saved: '' })).toBe('The Shawshank Redemption');
  });

  it('replaces <year> with release year', () => {
    expect(interpolateFormat('<year>', meta, { saved: '' })).toBe('1994');
  });

  it('replaces <rating100> with rating * ~10.75 (0-100 scale)', () => {
    const result = interpolateFormat('<rating100>', meta, { saved: '' });
    expect(result).toBe('100');
  });

  it('replaces <rating10> with rating', () => {
    expect(interpolateFormat('<rating10>', meta, { saved: '' })).toBe('9.3');
  });

  it('replaces <imdb> with tt number', () => {
    expect(interpolateFormat('<imdb>', meta, { saved: '' })).toBe('tt0111161');
  });

  it('replaces <directors> with separator-joined list', () => {
    expect(interpolateFormat('<directors>', meta, { saved: '', directorSeparator: ', ' })).toBe('Frank Darabont');
  });

  it('replaces <star1> with first actor', () => {
    expect(interpolateFormat('<star1>', meta, { saved: '' })).toBe('Tim Robbins');
  });

  it('handles compound format string', () => {
    const fmt = '<title> (<year>).<imdb>(<rating100>).<saved>';
    const result = interpolateFormat(fmt, meta, { saved: '720p' });
    expect(result).toBe('The Shawshank Redemption (1994).tt0111161(100).720p');
  });

  it('replaces <H> and <M> for duration', () => {
    expect(interpolateFormat('<H>h<M>m', meta, { saved: '' })).toBe('2h22m');
  });

  it('handles removeThe option', () => {
    expect(interpolateFormat('<title>', meta, { saved: '', removeThe: true })).toBe('Shawshank Redemption');
  });

  it('handles swapThe option', () => {
    expect(interpolateFormat('<title>', meta, { saved: '', swapThe: true })).toBe('Shawshank Redemption, The');
  });

  it('replaces spaces with titleSpaceChar', () => {
    expect(interpolateFormat('<title>', meta, { saved: '', titleSpaceChar: '.' })).toBe('The.Shawshank.Redemption');
  });

  it('returns empty string for null fields', () => {
    const noYear = { ...meta, year: null };
    expect(interpolateFormat('<year>', noYear, { saved: '' })).toBe('');
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Token replacement engine supporting all 25+ tokens. Port logic from `Renamer.mxml`'s rename formatting. Accept metadata + options (saved parts, separators, The-handling, space char).

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/services/formatEngine.ts __tests__/services/formatEngine.test.ts
git commit -m "feat: add format string interpolation engine"
```

### Task 9: NFO Parser Service

**Files:**
- Create: `src/services/nfoParser.ts`
- Test: `__tests__/services/nfoParser.test.ts`

**Step 1: Write failing test**

```typescript
import { parseNfo, extractImdbFromNfo } from '../../src/services/nfoParser';

describe('nfoParser', () => {
  it('converts CP437 bytes to Unicode string', () => {
    // Use the cp437 utility under the hood
    const result = parseNfo(Buffer.from([0x41, 0xc9, 0xcd, 0xbb]));
    expect(result).toBe('A╔═╗');
  });

  it('extracts IMDB tt number from NFO content', () => {
    const nfo = 'Some text\nhttp://www.imdb.com/title/tt0111161/\nMore text';
    expect(extractImdbFromNfo(nfo)).toBe('tt0111161');
  });

  it('extracts tt from various IMDB URL formats', () => {
    expect(extractImdbFromNfo('imdb.com/title/tt1234567')).toBe('tt1234567');
    expect(extractImdbFromNfo('IMDB: tt7654321')).toBe('tt7654321');
  });

  it('returns null when no tt found', () => {
    expect(extractImdbFromNfo('No IMDB link here')).toBeNull();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Thin wrapper around cp437 utility + regex for tt extraction.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/services/nfoParser.ts __tests__/services/nfoParser.test.ts
git commit -m "feat: add NFO parser with IMDB extraction"
```

### Task 10: URL File Writer Service

**Files:**
- Create: `src/services/urlFileWriter.ts`
- Test: `__tests__/services/urlFileWriter.test.ts`

**Step 1: Write failing test**

```typescript
import { generateUrlFileContent, generateWeblocContent } from '../../src/services/urlFileWriter';

describe('urlFileWriter', () => {
  it('generates Windows .url content', () => {
    const content = generateUrlFileContent({
      url: 'http://www.imdb.com/title/tt0111161/',
      originalPath: '/movies/old.mkv',
      nfoContent: null,
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
    });
    expect(content).toContain('[NFO]');
    expect(content).toContain('NFO=line1');
    expect(content).toContain('NFO=line2');
  });

  it('generates macOS .webloc plist XML', () => {
    const content = generateWeblocContent('http://www.imdb.com/title/tt0111161/');
    expect(content).toContain('<?xml version="1.0"');
    expect(content).toContain('<string>http://www.imdb.com/title/tt0111161/</string>');
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Two formatters: INI-style for .url, plist XML for .webloc. Port .url format from legacy `Renamer.mxml`'s `createURLFile()`.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/services/urlFileWriter.ts __tests__/services/urlFileWriter.test.ts
git commit -m "feat: add URL file writer for Windows and macOS"
```

### Task 11: File Scanner Service

**Files:**
- Create: `src/services/fileScanner.ts`
- Test: `__tests__/services/fileScanner.test.ts`

**Step 1: Write failing test**

```typescript
jest.mock('react-native-fs', () => ({
  readDir: jest.fn(),
  exists: jest.fn(),
}));

import RNFS from 'react-native-fs';
import { scanDirectory } from '../../src/services/fileScanner';

const mockFiles = [
  { name: 'Movie.mkv', path: '/movies/Movie.mkv', isFile: () => true, isDirectory: () => false, size: 1000 },
  { name: 'Movie.srt', path: '/movies/Movie.srt', isFile: () => true, isDirectory: () => false, size: 100 },
  { name: 'Movie.nfo', path: '/movies/Movie.nfo', isFile: () => true, isDirectory: () => false, size: 50 },
  { name: 'subfolder', path: '/movies/subfolder', isFile: () => false, isDirectory: () => true, size: 0 },
  { name: 'random.txt', path: '/movies/random.txt', isFile: () => true, isDirectory: () => false, size: 10 },
];

describe('fileScanner', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns only movie files matching extensions', async () => {
    (RNFS.readDir as jest.Mock).mockResolvedValue(mockFiles);
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    const files = await scanDirectory('/movies', ['mkv', 'avi'], 'none');
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('Movie.mkv');
  });

  it('detects associated NFO files', async () => {
    (RNFS.readDir as jest.Mock).mockResolvedValue(mockFiles);
    (RNFS.exists as jest.Mock).mockResolvedValue(true);
    const files = await scanDirectory('/movies', ['mkv'], 'none');
    expect(files[0].hasNfo).toBe(true);
  });

  it('detects DVD folders by VIDEO_TS.IFO presence', async () => {
    const dvdFiles = [
      { name: 'MyMovie', path: '/movies/MyMovie', isFile: () => false, isDirectory: () => true, size: 0 },
    ];
    const dvdContents = [
      { name: 'VIDEO_TS.IFO', path: '/movies/MyMovie/VIDEO_TS.IFO', isFile: () => true, isDirectory: () => false, size: 500 },
    ];
    (RNFS.readDir as jest.Mock)
      .mockResolvedValueOnce(dvdFiles)
      .mockResolvedValueOnce(dvdContents);
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    const files = await scanDirectory('/movies', ['mkv'], 'none');
    expect(files[0].isDvdFolder).toBe(true);
  });

  it('recurses into subfolders when mode is subfolders', async () => {
    const subFiles = [
      { name: 'Sub.mkv', path: '/movies/subfolder/Sub.mkv', isFile: () => true, isDirectory: () => false, size: 2000 },
    ];
    (RNFS.readDir as jest.Mock)
      .mockResolvedValueOnce(mockFiles)
      .mockResolvedValueOnce(subFiles);
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
    const files = await scanDirectory('/movies', ['mkv'], 'subfolders');
    expect(files).toHaveLength(2);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Recursive directory scanner using react-native-fs. Port DVD folder detection logic (VIDEO_TS.IFO, BDMV, VIDEO_TS). Detect associated .nfo, .url, poster files per movie.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/services/fileScanner.ts __tests__/services/fileScanner.test.ts
git commit -m "feat: add recursive file scanner with DVD detection"
```

### Task 12: Logger Service

**Files:**
- Create: `src/services/logger.ts`
- Test: `__tests__/services/logger.test.ts`

**Step 1: Write failing test**

```typescript
jest.mock('react-native-fs', () => ({
  appendFile: jest.fn().mockResolvedValue(undefined),
}));

import RNFS from 'react-native-fs';
import { createLogger } from '../../src/services/logger';

describe('logger', () => {
  beforeEach(() => jest.clearAllMocks());

  it('appends timestamped entry to log file', async () => {
    const logger = createLogger('/mock/zeeb.log');
    await logger.log('rename', '/old.mkv', '/new.mkv');
    expect(RNFS.appendFile).toHaveBeenCalledWith(
      '/mock/zeeb.log',
      expect.stringMatching(/\d{4}-\d{2}-\d{2}.*rename.*\/old\.mkv.*\/new\.mkv/),
      'utf8'
    );
  });

  it('logs different operation types', async () => {
    const logger = createLogger('/mock/zeeb.log');
    await logger.log('poster', '/movie.jpg', null);
    expect(RNFS.appendFile).toHaveBeenCalled();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Simple append-to-file logger matching legacy plain text format.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/services/logger.ts __tests__/services/logger.test.ts
git commit -m "feat: add plain text operation logger"
```

### Task 13: File Renamer Service

**Files:**
- Create: `src/services/fileRenamer.ts`
- Test: `__tests__/services/fileRenamer.test.ts`

**Step 1: Write failing test**

```typescript
jest.mock('react-native-fs', () => ({
  moveFile: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(false),
  readDir: jest.fn().mockResolvedValue([]),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

import RNFS from 'react-native-fs';
import { renameFile, findSubtitles, renameSubtitles } from '../../src/services/fileRenamer';

describe('fileRenamer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renames file and returns undo entry', async () => {
    const entry = await renameFile('/movies/old.mkv', '/movies/new.mkv');
    expect(RNFS.moveFile).toHaveBeenCalledWith('/movies/old.mkv', '/movies/new.mkv');
    expect(entry.type).toBe('rename');
    expect(entry.sourcePath).toBe('/movies/old.mkv');
    expect(entry.destPath).toBe('/movies/new.mkv');
  });

  it('finds subtitle files matching movie name', async () => {
    (RNFS.readDir as jest.Mock).mockResolvedValue([
      { name: 'Movie.srt', path: '/movies/Movie.srt', isFile: () => true },
      { name: 'Movie.en.srt', path: '/movies/Movie.en.srt', isFile: () => true },
      { name: 'Other.srt', path: '/movies/Other.srt', isFile: () => true },
    ]);
    const subs = await findSubtitles('/movies', 'Movie', ['srt', 'sub']);
    expect(subs).toHaveLength(2);
  });

  it('renames subtitles to match new movie name', async () => {
    const entries = await renameSubtitles(
      ['/movies/Movie.srt', '/movies/Movie.en.srt'],
      'Movie',
      'New Movie (2024)'
    );
    expect(entries).toHaveLength(2);
    expect(RNFS.moveFile).toHaveBeenCalledWith('/movies/Movie.srt', '/movies/New Movie (2024).srt');
    expect(RNFS.moveFile).toHaveBeenCalledWith('/movies/Movie.en.srt', '/movies/New Movie (2024).en.srt');
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — File rename operations returning `UndoEntry[]`. Subtitle discovery and rename. Folder rename option. Port logic from `Renamer.mxml`'s `onFinalRename()`.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/services/fileRenamer.ts __tests__/services/fileRenamer.test.ts
git commit -m "feat: add file renamer service with subtitle support"
```

### Task 14: IMDB Extractor Service

**Files:**
- Create: `src/services/imdbExtractor.ts`
- Test: `__tests__/services/imdbExtractor.test.ts`

**Step 1: Write failing test**

```typescript
import {
  buildSearchUrl,
  buildTitleUrl,
  generateSearchExtractionScript,
  generateTitleExtractionScript,
  parseSearchResults,
  parseTitleData,
} from '../../src/services/imdbExtractor';
import type { ExtractionPattern } from '../../src/types';

describe('imdbExtractor', () => {
  it('builds IMDB search URL from query', () => {
    const url = buildSearchUrl('The Matrix 1999', 'https://www.imdb.com/find?s=tt&q=');
    expect(url).toBe('https://www.imdb.com/find?s=tt&q=The%20Matrix%201999');
  });

  it('builds IMDB title URL from tt number', () => {
    const url = buildTitleUrl('tt0111161', 'https://www.imdb.com/title/');
    expect(url).toBe('https://www.imdb.com/title/tt0111161/');
  });

  it('generates JS injection script for search page', () => {
    const script = generateSearchExtractionScript();
    expect(script).toContain('ReactNativeWebView.postMessage');
    expect(script).toContain('JSON.stringify');
  });

  it('generates JS injection script for title page', () => {
    const patterns: ExtractionPattern[] = [
      { field: 'title', jsonLdPath: 'name', domSelector: 'h1 span', regexPattern: null, regexGroup: null },
    ];
    const script = generateTitleExtractionScript(patterns);
    expect(script).toContain('application/ld+json');
    expect(script).toContain('querySelector');
  });

  it('parses search results from WebView message', () => {
    const message = JSON.stringify({
      type: 'searchResults',
      results: [
        { tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994, aka: null, thumbnailUrl: null },
        { tt: 'tt0111162', title: 'Another Movie', year: 2000, aka: null, thumbnailUrl: null },
      ],
    });
    const results = parseSearchResults(message);
    expect(results).toHaveLength(2);
    expect(results[0].tt).toBe('tt0111161');
  });

  it('parses title data from WebView message', () => {
    const message = JSON.stringify({
      type: 'titleData',
      data: {
        tt: 'tt0111161',
        title: 'The Shawshank Redemption',
        year: 1994,
        rating: 9.3,
        directors: ['Frank Darabont'],
        genres: ['Drama'],
        actors: ['Tim Robbins', 'Morgan Freeman'],
        duration: 142,
        mpaa: 'R',
        aka: [],
        posterUrl: null,
      },
    });
    const data = parseTitleData(message);
    expect(data?.title).toBe('The Shawshank Redemption');
    expect(data?.rating).toBe(9.3);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — URL builders, JS injection script generators (search page + title page), message parsers. The injection scripts:
- Search page: Find result links, extract tt/title/year from DOM
- Title page: Extract JSON-LD first, fall back to DOM selectors from config, then regex
- Both scripts post results via `window.ReactNativeWebView.postMessage()`

Port extraction logic from `Renamer.mxml`'s `reMovies()` and `reMovie()` but adapt for DOM access instead of raw HTML regex.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/services/imdbExtractor.ts __tests__/services/imdbExtractor.test.ts
git commit -m "feat: add IMDB extractor with WebView JS injection"
```

### Task 15: TMDB Service

**Files:**
- Create: `src/services/tmdbService.ts`
- Test: `__tests__/services/tmdbService.test.ts`

**Step 1: Write failing test**

```typescript
import { searchPosters, buildPosterUrl } from '../../src/services/tmdbService';

// Mock fetch
global.fetch = jest.fn();

describe('tmdbService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('searches TMDB for movie posters by IMDB id', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
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
    expect(results[0]).toContain('abc123.jpg');
  });

  it('builds full poster URL from path', () => {
    const url = buildPosterUrl('/abc123.jpg', 'w500');
    expect(url).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg');
  });

  it('returns empty array on API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
    const results = await searchPosters('tt9999999', 'https://api.themoviedb.org/3/', 'fake-key');
    expect(results).toEqual([]);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — TMDB REST client: find by IMDB ID, get poster paths, build full URLs. Port logic from legacy `Renamer.mxml`'s poster search.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/services/tmdbService.ts __tests__/services/tmdbService.test.ts
git commit -m "feat: add TMDB poster service"
```

### Task 16: Legacy Config Importer

**Files:**
- Create: `src/services/legacyImporter.ts`
- Test: `__tests__/services/legacyImporter.test.ts`

**Step 1: Write failing test**

```typescript
import { parseLegacyXml, detectCustomizations, migrateLegacyConfig } from '../../src/services/legacyImporter';

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <formatStandard>&lt;title&gt; (&lt;year&gt;).&lt;imdb&gt;(&lt;rating100&gt;).&lt;saved&gt;</formatStandard>
  <removeThe>true</removeThe>
  <removeTerms>YIFY,BluRay,x264,CustomGroup</removeTerms>
  <keepTerms>720p,1080p</keepTerms>
  <reFilenamePartsSplitter>[._ -]+</reFilenamePartsSplitter>
</config>`;

describe('legacyImporter', () => {
  it('parses legacy XML config into key-value map', () => {
    const parsed = parseLegacyXml(sampleXml);
    expect(parsed.formatStandard).toBe('<title> (<year>).<imdb>(<rating100>).<saved>');
    expect(parsed.removeThe).toBe('true');
  });

  it('detects customized remove terms', () => {
    const parsed = parseLegacyXml(sampleXml);
    const customizations = detectCustomizations(parsed);
    expect(customizations.hasCustomRemoveTerms).toBe(true);
    expect(customizations.customRemoveTerms).toContain('CustomGroup');
  });

  it('migrates legacy config to new ZeebConfig shape', () => {
    const parsed = parseLegacyXml(sampleXml);
    const config = migrateLegacyConfig(parsed);
    expect(config.removeThe).toBe(true);
    expect(config.removeTerms).toContain('CustomGroup');
    expect(config.formatStandard).toContain('<title>');
  });

  it('preserves custom regex patterns', () => {
    const parsed = parseLegacyXml(sampleXml);
    const config = migrateLegacyConfig(parsed);
    expect(config.customRegexPatterns?.reFilenamePartsSplitter).toBe('[._ -]+');
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — XML parser (simple regex-based, legacy XML is flat), customization detector (diff against known legacy defaults), migrator to new JSON config shape. Merge custom terms on top of refreshed defaults.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/services/legacyImporter.ts __tests__/services/legacyImporter.test.ts
git commit -m "feat: add legacy XML config importer"
```

---

## Phase 4: State Stores

### Task 17: Undo Store

**Files:**
- Create: `src/stores/undoStore.ts`
- Test: `__tests__/stores/undoStore.test.ts`

**Step 1: Write failing test**

```typescript
import { createUndoStore } from '../../src/stores/undoStore';

jest.mock('react-native-fs', () => ({
  moveFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

describe('undoStore', () => {
  it('begins and commits a transaction', () => {
    const store = createUndoStore();
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().commitTransaction();
    expect(store.getState().transactions).toHaveLength(1);
    expect(store.getState().transactions[0].entries).toHaveLength(1);
  });

  it('discards uncommitted transaction', () => {
    const store = createUndoStore();
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().discardTransaction();
    expect(store.getState().transactions).toHaveLength(0);
  });

  it('undoes a transaction by reversing renames', async () => {
    const RNFS = require('react-native-fs');
    const store = createUndoStore();
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/old.mkv', destPath: '/new.mkv' });
    store.getState().commitTransaction();

    await store.getState().undoTransaction(store.getState().transactions[0].id);
    expect(RNFS.moveFile).toHaveBeenCalledWith('/new.mkv', '/old.mkv');
    expect(store.getState().transactions).toHaveLength(0);
  });

  it('undoes entries in reverse order', async () => {
    const RNFS = require('react-native-fs');
    const callOrder: string[] = [];
    (RNFS.moveFile as jest.Mock).mockImplementation((from: string) => {
      callOrder.push(from);
      return Promise.resolve();
    });

    const store = createUndoStore();
    store.getState().beginTransaction();
    store.getState().addEntry({ type: 'rename', sourcePath: '/a.mkv', destPath: '/b.mkv' });
    store.getState().addEntry({ type: 'rename', sourcePath: '/c.mkv', destPath: '/d.mkv' });
    store.getState().commitTransaction();

    await store.getState().undoTransaction(store.getState().transactions[0].id);
    expect(callOrder).toEqual(['/d.mkv', '/b.mkv']);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Zustand store: `beginTransaction`, `addEntry`, `commitTransaction`, `discardTransaction`, `undoTransaction` (reverses file operations).

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/stores/undoStore.ts __tests__/stores/undoStore.test.ts
git commit -m "feat: add undo store with transaction support"
```

### Task 18: File Store

**Files:**
- Create: `src/stores/fileStore.ts`
- Test: `__tests__/stores/fileStore.test.ts`

**Step 1: Write failing test**

```typescript
import { createFileStore } from '../../src/stores/fileStore';
import type { MovieFile } from '../../src/types';

const mockFile: MovieFile = {
  id: '1',
  name: 'Movie.mkv',
  nativePath: '/movies/Movie.mkv',
  folder: '/movies',
  extension: 'mkv',
  size: 1024,
  isDvdFolder: false,
  hasNfo: false,
  hasUrl: false,
  hasPoster: false,
  nfoPath: null,
  urlPath: null,
  posterPath: null,
};

describe('fileStore', () => {
  it('sets scanned files', () => {
    const store = createFileStore();
    store.getState().setFiles([mockFile]);
    expect(store.getState().files).toHaveLength(1);
  });

  it('filters sample files when configured', () => {
    const sample = { ...mockFile, id: '2', name: 'Movie.sample.mkv' };
    const store = createFileStore();
    store.getState().setFiles([mockFile, sample]);
    const filtered = store.getState().getFilteredFiles(false);
    expect(filtered).toHaveLength(1);
  });

  it('clears files', () => {
    const store = createFileStore();
    store.getState().setFiles([mockFile]);
    store.getState().clear();
    expect(store.getState().files).toHaveLength(0);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Zustand store for scanned file list with filtering.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/stores/fileStore.ts __tests__/stores/fileStore.test.ts
git commit -m "feat: add file store for scanned movie files"
```

### Task 19: Renamer Store

**Files:**
- Create: `src/stores/renamerStore.ts`
- Test: `__tests__/stores/renamerStore.test.ts`

**Step 1: Write failing test**

```typescript
import { createRenamerStore } from '../../src/stores/renamerStore';

describe('renamerStore', () => {
  it('tracks current file index', () => {
    const store = createRenamerStore();
    store.getState().setCurrentIndex(5);
    expect(store.getState().currentIndex).toBe(5);
  });

  it('stores search parts for current file', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([
      { id: '0', text: 'Movie', originalText: 'Movie', state: 'search', editable: true },
    ]);
    expect(store.getState().searchParts).toHaveLength(1);
  });

  it('updates a search part state', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([
      { id: '0', text: 'Movie', originalText: 'Movie', state: 'search', editable: true },
    ]);
    store.getState().updatePartState('0', 'remove');
    expect(store.getState().searchParts[0].state).toBe('remove');
  });

  it('stores movie matches and selected metadata', () => {
    const store = createRenamerStore();
    store.getState().setMovieMatches([
      { tt: 'tt0111161', title: 'Shawshank', year: 1994, aka: null, thumbnailUrl: null },
    ]);
    expect(store.getState().movieMatches).toHaveLength(1);
  });

  it('stores selected metadata', () => {
    const store = createRenamerStore();
    store.getState().setMetadata({
      tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994,
      rating: 9.3, directors: ['Frank Darabont'], genres: ['Drama'],
      actors: ['Tim Robbins'], duration: 142, mpaa: 'R', aka: [], posterUrl: null,
    });
    expect(store.getState().metadata?.title).toBe('The Shawshank Redemption');
  });

  it('resets state for next file', () => {
    const store = createRenamerStore();
    store.getState().setMetadata({
      tt: 'tt0111161', title: 'Test', year: null,
      rating: null, directors: [], genres: [], actors: [],
      duration: null, mpaa: null, aka: [], posterUrl: null,
    });
    store.getState().reset();
    expect(store.getState().metadata).toBeNull();
    expect(store.getState().searchParts).toEqual([]);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Zustand store: current file index, search parts, movie matches, selected metadata, poster URLs, preview filename. Methods for updating part states, selecting matches, resetting.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/stores/renamerStore.ts __tests__/stores/renamerStore.test.ts
git commit -m "feat: add renamer store for per-instance state"
```

---

## Phase 5: UI Components

### Task 20: App Shell + ViewStack

**Files:**
- Create: `src/App.tsx`
- Test: `__tests__/App.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import App from '../../src/App';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('react-native-fs', () => ({ DocumentDirectoryPath: '/mock' }));

describe('App', () => {
  it('renders folder browser view by default', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId('folder-browser')).toBeTruthy();
  });

  it('switches to process view when folder is selected', () => {
    const { getByTestId, queryByTestId } = render(<App />);
    fireEvent.press(getByTestId('start-processing'));
    expect(queryByTestId('folder-browser')).toBeNull();
    expect(getByTestId('renamer-view')).toBeTruthy();
  });

  it('shows options modal when options button pressed', () => {
    const { getByTestId } = render(<App />);
    fireEvent.press(getByTestId('options-button'));
    expect(getByTestId('options-modal')).toBeTruthy();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Root App component with view state ('folderBrowser' | 'process'), toolbar buttons (Options, Undo, Release Notes), conditional rendering for views. Stub child components initially.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/App.tsx __tests__/App.test.tsx
git commit -m "feat: add App shell with ViewStack navigation"
```

### Task 21: FolderBrowser Component

**Files:**
- Create: `src/components/FolderBrowser/FolderBrowser.tsx`
- Create: `src/components/FolderBrowser/index.ts`
- Test: `__tests__/components/FolderBrowser.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FolderBrowser } from '../../src/components/FolderBrowser';

describe('FolderBrowser', () => {
  it('renders folder path input', () => {
    const { getByTestId } = render(<FolderBrowser onFolderSelected={jest.fn()} recentFolders={[]} />);
    expect(getByTestId('folder-path-input')).toBeTruthy();
  });

  it('renders recent folders dropdown', () => {
    const { getByTestId } = render(
      <FolderBrowser onFolderSelected={jest.fn()} recentFolders={['/movies', '/downloads']} />
    );
    expect(getByTestId('recent-folders')).toBeTruthy();
  });

  it('renders recursion mode selector', () => {
    const { getByTestId } = render(<FolderBrowser onFolderSelected={jest.fn()} recentFolders={[]} />);
    expect(getByTestId('recursion-mode')).toBeTruthy();
  });

  it('calls onFolderSelected with path and recursion mode', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(<FolderBrowser onFolderSelected={onSelect} recentFolders={[]} />);
    fireEvent.changeText(getByTestId('folder-path-input'), '/movies');
    fireEvent.press(getByTestId('list-movies-button'));
    expect(onSelect).toHaveBeenCalledWith('/movies', expect.any(String));
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Folder path input, browse button (native file dialog), recent folders picker, recursion mode toggle (none/subfolders/full), "List Movies" button. Uses config store for recent folders.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/FolderBrowser/ __tests__/components/FolderBrowser.test.tsx
git commit -m "feat: add FolderBrowser component"
```

### Task 22: FileList Component

**Files:**
- Create: `src/components/FileList/FileList.tsx`
- Create: `src/components/FileList/index.ts`
- Test: `__tests__/components/FileList.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FileList } from '../../src/components/FileList';
import type { MovieFile } from '../../src/types';

const files: MovieFile[] = [
  { id: '1', name: 'Movie1.mkv', nativePath: '/m/1.mkv', folder: '/m', extension: 'mkv', size: 1000, isDvdFolder: false, hasNfo: false, hasUrl: false, hasPoster: false, nfoPath: null, urlPath: null, posterPath: null },
  { id: '2', name: 'Movie2.mkv', nativePath: '/m/2.mkv', folder: '/m', extension: 'mkv', size: 2000, isDvdFolder: false, hasNfo: true, hasUrl: false, hasPoster: false, nfoPath: '/m/2.nfo', urlPath: null, posterPath: null },
];

describe('FileList', () => {
  it('renders all files', () => {
    const { getByText } = render(<FileList files={files} selectedIndex={0} onSelect={jest.fn()} />);
    expect(getByText('Movie1.mkv')).toBeTruthy();
    expect(getByText('Movie2.mkv')).toBeTruthy();
  });

  it('highlights selected file', () => {
    const { getByTestId } = render(<FileList files={files} selectedIndex={0} onSelect={jest.fn()} />);
    expect(getByTestId('file-item-0').props.style).toMatchObject(expect.objectContaining({ backgroundColor: expect.any(String) }));
  });

  it('calls onSelect when file tapped', () => {
    const onSelect = jest.fn();
    const { getByText } = render(<FileList files={files} selectedIndex={0} onSelect={onSelect} />);
    fireEvent.press(getByText('Movie2.mkv'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('shows NFO indicator for files with NFO', () => {
    const { getByTestId } = render(<FileList files={files} selectedIndex={0} onSelect={jest.fn()} />);
    expect(getByTestId('nfo-indicator-1')).toBeTruthy();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — FlatList of movie files with selection highlight, NFO/poster/URL indicators, readiness indicator for prefetched files.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/FileList/ __tests__/components/FileList.test.tsx
git commit -m "feat: add FileList component"
```

### Task 23: SearchParts Component

**Files:**
- Create: `src/components/SearchParts/SearchParts.tsx`
- Create: `src/components/SearchParts/SearchPartItem.tsx`
- Create: `src/components/SearchParts/index.ts`
- Test: `__tests__/components/SearchParts.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchParts } from '../../src/components/SearchParts';
import type { SearchPart } from '../../src/types';

const parts: SearchPart[] = [
  { id: '0', text: 'The', state: 'search', originalText: 'The', editable: true },
  { id: '1', text: 'Matrix', state: 'search', originalText: 'Matrix', editable: true },
  { id: '2', text: '1999', state: 'search', originalText: '1999', editable: true },
  { id: '3', text: 'BluRay', state: 'remove', originalText: 'BluRay', editable: true },
];

describe('SearchParts', () => {
  it('renders all parts', () => {
    const { getByText } = render(
      <SearchParts parts={parts} onPartStateChange={jest.fn()} onPartTextChange={jest.fn()} onSearch={jest.fn()} />
    );
    expect(getByText('The')).toBeTruthy();
    expect(getByText('Matrix')).toBeTruthy();
    expect(getByText('BluRay')).toBeTruthy();
  });

  it('color-codes parts by state', () => {
    const { getByTestId } = render(
      <SearchParts parts={parts} onPartStateChange={jest.fn()} onPartTextChange={jest.fn()} onSearch={jest.fn()} />
    );
    // Remove parts should be styled differently
    const removePart = getByTestId('search-part-3');
    expect(removePart).toBeTruthy();
  });

  it('calls onPartStateChange when state button pressed', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SearchParts parts={parts} onPartStateChange={onChange} onPartTextChange={jest.fn()} onSearch={jest.fn()} />
    );
    fireEvent.press(getByTestId('remove-button-0'));
    expect(onChange).toHaveBeenCalledWith('0', 'remove');
  });

  it('calls onSearch when search button pressed', () => {
    const onSearch = jest.fn();
    const { getByTestId } = render(
      <SearchParts parts={parts} onPartStateChange={jest.fn()} onPartTextChange={jest.fn()} onSearch={onSearch} />
    );
    fireEvent.press(getByTestId('search-button'));
    expect(onSearch).toHaveBeenCalled();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Horizontal list of editable SearchPartItem components. Each part has state buttons (remove, remove-always, keep, keep-always, search). Color-coded: green=keep, red=remove, neutral=search. Editable text. Search button triggers search with all 'search' state parts.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/SearchParts/ __tests__/components/SearchParts.test.tsx
git commit -m "feat: add SearchParts interactive token editor"
```

### Task 24: MovieResults Component

**Files:**
- Create: `src/components/MovieResults/MovieResults.tsx`
- Create: `src/components/MovieResults/index.ts`
- Test: `__tests__/components/MovieResults.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MovieResults } from '../../src/components/MovieResults';
import type { MovieMatch } from '../../src/types';

const matches: MovieMatch[] = [
  { tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994, aka: null, thumbnailUrl: null },
  { tt: 'tt0068646', title: 'The Godfather', year: 1972, aka: null, thumbnailUrl: null },
];

describe('MovieResults', () => {
  it('renders movie matches', () => {
    const { getByText } = render(<MovieResults matches={matches} onSelect={jest.fn()} />);
    expect(getByText('The Shawshank Redemption (1994)')).toBeTruthy();
    expect(getByText('The Godfather (1972)')).toBeTruthy();
  });

  it('calls onSelect with tt when match tapped', () => {
    const onSelect = jest.fn();
    const { getByText } = render(<MovieResults matches={matches} onSelect={onSelect} />);
    fireEvent.press(getByText('The Shawshank Redemption (1994)'));
    expect(onSelect).toHaveBeenCalledWith('tt0111161');
  });

  it('shows empty state when no matches', () => {
    const { getByText } = render(<MovieResults matches={[]} onSelect={jest.fn()} />);
    expect(getByText('No results')).toBeTruthy();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — FlatList of movie matches showing title, year, AKA, thumbnail. Tap to select.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/MovieResults/ __tests__/components/MovieResults.test.tsx
git commit -m "feat: add MovieResults component"
```

### Task 25: PosterPreview Component

**Files:**
- Create: `src/components/PosterPreview/PosterPreview.tsx`
- Create: `src/components/PosterPreview/index.ts`
- Test: `__tests__/components/PosterPreview.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PosterPreview } from '../../src/components/PosterPreview';

describe('PosterPreview', () => {
  it('renders poster image when URL provided', () => {
    const { getByTestId } = render(<PosterPreview posterUrl="https://image.tmdb.org/t/p/w500/abc.jpg" onSelect={jest.fn()} />);
    expect(getByTestId('poster-image')).toBeTruthy();
  });

  it('shows placeholder when no URL', () => {
    const { getByTestId } = render(<PosterPreview posterUrl={null} onSelect={jest.fn()} />);
    expect(getByTestId('poster-placeholder')).toBeTruthy();
  });

  it('calls onSelect when poster tapped', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(<PosterPreview posterUrl="https://image.tmdb.org/t/p/w500/abc.jpg" onSelect={onSelect} />);
    fireEvent.press(getByTestId('poster-image'));
    expect(onSelect).toHaveBeenCalled();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Image component showing poster, placeholder when empty, tap to cycle through poster options.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/PosterPreview/ __tests__/components/PosterPreview.test.tsx
git commit -m "feat: add PosterPreview component"
```

### Task 26: RenamePreview Component

**Files:**
- Create: `src/components/RenamePreview/RenamePreview.tsx`
- Create: `src/components/RenamePreview/index.ts`
- Test: `__tests__/components/RenamePreview.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RenamePreview } from '../../src/components/RenamePreview';

describe('RenamePreview', () => {
  it('displays formatted filename preview', () => {
    const { getByText } = render(
      <RenamePreview
        originalName="Movie.mkv"
        previewName="The Shawshank Redemption (1994).tt0111161(100).720p.mkv"
        onRename={jest.fn()}
        onSkip={jest.fn()}
      />
    );
    expect(getByText('The Shawshank Redemption (1994).tt0111161(100).720p.mkv')).toBeTruthy();
  });

  it('calls onRename when rename button pressed', () => {
    const onRename = jest.fn();
    const { getByTestId } = render(
      <RenamePreview originalName="Movie.mkv" previewName="New.mkv" onRename={onRename} onSkip={jest.fn()} />
    );
    fireEvent.press(getByTestId('rename-button'));
    expect(onRename).toHaveBeenCalled();
  });

  it('calls onSkip when skip button pressed', () => {
    const onSkip = jest.fn();
    const { getByTestId } = render(
      <RenamePreview originalName="Movie.mkv" previewName="New.mkv" onRename={jest.fn()} onSkip={onSkip} />
    );
    fireEvent.press(getByTestId('skip-button'));
    expect(onSkip).toHaveBeenCalled();
  });

  it('disables rename when no preview name', () => {
    const { getByTestId } = render(
      <RenamePreview originalName="Movie.mkv" previewName="" onRename={jest.fn()} onSkip={jest.fn()} />
    );
    expect(getByTestId('rename-button').props.accessibilityState.disabled).toBe(true);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Shows original → new filename, rename/skip buttons, disabled state when no metadata.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/RenamePreview/ __tests__/components/RenamePreview.test.tsx
git commit -m "feat: add RenamePreview component"
```

### Task 27: Renamer Component (Composition)

**Files:**
- Create: `src/components/Renamer/Renamer.tsx`
- Create: `src/components/Renamer/index.ts`
- Test: `__tests__/components/Renamer.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { Renamer } from '../../src/components/Renamer';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('react-native-fs', () => ({ DocumentDirectoryPath: '/mock' }));

describe('Renamer', () => {
  it('renders FileList, SearchParts, MovieResults, and RenamePreview', () => {
    const { getByTestId } = render(<Renamer instanceId={0} visible={true} />);
    expect(getByTestId('file-list')).toBeTruthy();
    expect(getByTestId('search-parts')).toBeTruthy();
    expect(getByTestId('movie-results')).toBeTruthy();
    expect(getByTestId('rename-preview')).toBeTruthy();
  });

  it('renders WebView', () => {
    const { getByTestId } = render(<Renamer instanceId={0} visible={true} />);
    expect(getByTestId('imdb-webview')).toBeTruthy();
  });

  it('hides WebView when showWebView is false', () => {
    // Mock config store to return showWebView: false
    const { queryByTestId } = render(<Renamer instanceId={0} visible={true} />);
    // WebView still exists in DOM but is hidden via style
    expect(queryByTestId('imdb-webview')).toBeTruthy();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Composes all sub-components. Owns a WebView instance. Connects to its renamer store slice (by instanceId). Handles the full pipeline: file selection → parse → search → extract → preview → rename. Wires up WebView `onMessage` for IMDB extraction and `onLoadEnd` for JS injection.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/Renamer/ __tests__/components/Renamer.test.tsx
git commit -m "feat: add Renamer composition component"
```

### Task 28: OptionsModal Component

**Files:**
- Create: `src/components/OptionsModal/OptionsModal.tsx`
- Create: `src/components/OptionsModal/index.ts`
- Test: `__tests__/components/OptionsModal.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OptionsModal } from '../../src/components/OptionsModal';

jest.mock('react-native-fs', () => ({ DocumentDirectoryPath: '/mock' }));

describe('OptionsModal', () => {
  it('renders format string inputs', () => {
    const { getByTestId } = render(<OptionsModal visible={true} onClose={jest.fn()} />);
    expect(getByTestId('format-standard-input')).toBeTruthy();
    expect(getByTestId('format-aka-input')).toBeTruthy();
  });

  it('renders remove/keep term editors', () => {
    const { getByTestId } = render(<OptionsModal visible={true} onClose={jest.fn()} />);
    expect(getByTestId('remove-terms-editor')).toBeTruthy();
    expect(getByTestId('keep-terms-editor')).toBeTruthy();
  });

  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<OptionsModal visible={true} onClose={onClose} />);
    fireEvent.press(getByTestId('close-options'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Modal with all config options grouped by category. Two-way binding to config store. Save on close. Port sections from legacy `Options.mxml`.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/OptionsModal/ __tests__/components/OptionsModal.test.tsx
git commit -m "feat: add OptionsModal component"
```

### Task 29: UndoModal Component

**Files:**
- Create: `src/components/UndoModal/UndoModal.tsx`
- Create: `src/components/UndoModal/index.ts`
- Test: `__tests__/components/UndoModal.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UndoModal } from '../../src/components/UndoModal';

describe('UndoModal', () => {
  it('renders transaction list', () => {
    const { getByTestId } = render(<UndoModal visible={true} onClose={jest.fn()} />);
    expect(getByTestId('undo-transaction-list')).toBeTruthy();
  });

  it('shows empty state when no transactions', () => {
    const { getByText } = render(<UndoModal visible={true} onClose={jest.fn()} />);
    expect(getByText('No undo history')).toBeTruthy();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Modal showing undo transactions with details and undo button per transaction.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/UndoModal/ __tests__/components/UndoModal.test.tsx
git commit -m "feat: add UndoModal component"
```

### Task 30: NfoViewer Component

**Files:**
- Create: `src/components/NfoViewer/NfoViewer.tsx`
- Create: `src/components/NfoViewer/index.ts`
- Test: `__tests__/components/NfoViewer.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { NfoViewer } from '../../src/components/NfoViewer';

describe('NfoViewer', () => {
  it('renders NFO content in monospace', () => {
    const { getByTestId } = render(<NfoViewer visible={true} content="Test NFO" onClose={jest.fn()} />);
    const text = getByTestId('nfo-text');
    expect(text.props.style).toMatchObject(expect.objectContaining({ fontFamily: expect.stringMatching(/mono|courier/i) }));
  });

  it('renders converted Unicode content', () => {
    const { getByText } = render(<NfoViewer visible={true} content="╔═══╗" onClose={jest.fn()} />);
    expect(getByText('╔═══╗')).toBeTruthy();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Modal with monospace ScrollView displaying CP437-converted NFO content.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/NfoViewer/ __tests__/components/NfoViewer.test.tsx
git commit -m "feat: add NfoViewer component"
```

---

## Phase 6: Integration

### Task 31: Dual Renamer Swap Logic

**Files:**
- Modify: `src/App.tsx`
- Test: `__tests__/integration/dualRenamer.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import App from '../../src/App';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('react-native-fs', () => ({ DocumentDirectoryPath: '/mock', exists: jest.fn().mockResolvedValue(false), readFile: jest.fn(), writeFile: jest.fn() }));

describe('Dual Renamer integration', () => {
  it('renders two Renamer instances', () => {
    const { getByTestId } = render(<App />);
    // Switch to process view first
    act(() => { /* trigger folder selection */ });
    expect(getByTestId('renamer-0')).toBeTruthy();
    expect(getByTestId('renamer-1')).toBeTruthy();
  });

  it('only one Renamer is visible at a time', () => {
    const { getByTestId } = render(<App />);
    const r0 = getByTestId('renamer-0');
    const r1 = getByTestId('renamer-1');
    // One visible, one hidden
    expect(r0.props.visible !== r1.props.visible).toBe(true);
  });

  it('swaps active Renamer on advance', () => {
    const { getByTestId } = render(<App />);
    const initialActive = getByTestId('renamer-0').props.visible;
    fireEvent.press(getByTestId('skip-button'));
    const afterActive = getByTestId('renamer-0').props.visible;
    expect(afterActive).not.toBe(initialActive);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Wire up dual Renamer instances in App. Active instance index toggles on advance/skip. Hidden instance prefetches next file. Both WebViews always exist.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/App.tsx __tests__/integration/dualRenamer.test.tsx
git commit -m "feat: integrate dual Renamer swap logic"
```

### Task 32: WebView IMDB Extraction Integration

**Files:**
- Modify: `src/components/Renamer/Renamer.tsx`
- Test: `__tests__/integration/imdbExtraction.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Renamer } from '../../src/components/Renamer';

jest.mock('react-native-webview', () => {
  const { forwardRef } = require('react');
  return {
    WebView: forwardRef((props: any, ref: any) => {
      // Simulate onLoadEnd after mount
      setTimeout(() => props.onLoadEnd?.(), 0);
      return <mock-webview {...props} ref={ref} testID={props.testID} />;
    }),
  };
});

describe('IMDB extraction integration', () => {
  it('injects extraction script on page load', async () => {
    const { getByTestId } = render(<Renamer instanceId={0} visible={true} />);
    await act(async () => { /* wait for onLoadEnd */ });
    // Verify injectJavaScript was called
  });

  it('parses search results from WebView message', async () => {
    const { getByTestId } = render(<Renamer instanceId={0} visible={true} />);
    const webview = getByTestId('imdb-webview');
    await act(async () => {
      webview.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'searchResults',
            results: [{ tt: 'tt0111161', title: 'Test', year: 1994, aka: null, thumbnailUrl: null }],
          }),
        },
      });
    });
    // Verify movie results populated in store
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Wire up WebView `onLoadEnd` → inject JS, `onMessage` → parse results → update renamer store. Handle both search page and title page message types.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/Renamer/Renamer.tsx __tests__/integration/imdbExtraction.test.tsx
git commit -m "feat: integrate WebView IMDB extraction pipeline"
```

### Task 33: Full Rename Pipeline Integration

**Files:**
- Test: `__tests__/integration/renamePipeline.test.tsx`

**Step 1: Write integration test**

```typescript
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock',
  moveFile: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(false),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(''),
  readDir: jest.fn().mockResolvedValue([]),
  appendFile: jest.fn().mockResolvedValue(undefined),
}));

import { renameFile, findSubtitles, renameSubtitles } from '../../src/services/fileRenamer';
import { generateUrlFileContent } from '../../src/services/urlFileWriter';
import { interpolateFormat } from '../../src/services/formatEngine';
import { createUndoStore } from '../../src/stores/undoStore';
import { createLogger } from '../../src/services/logger';
import RNFS from 'react-native-fs';
import type { MovieMetadata } from '../../src/types';

describe('Full rename pipeline', () => {
  const meta: MovieMetadata = {
    tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994,
    rating: 9.3, directors: ['Frank Darabont'], genres: ['Drama'],
    actors: ['Tim Robbins', 'Morgan Freeman'], duration: 142,
    mpaa: 'R', aka: [], posterUrl: 'https://image.tmdb.org/t/p/w500/abc.jpg',
  };

  it('executes complete rename with undo, URL file, and logging', async () => {
    const undoStore = createUndoStore();
    const logger = createLogger('/mock/zeeb.log');

    // Generate new filename
    const newName = interpolateFormat(
      '<title> (<year>).<imdb>(<rating100>).<saved>',
      meta,
      { saved: '720p' }
    );
    expect(newName).toBe('The Shawshank Redemption (1994).tt0111161(100).720p');

    // Begin transaction
    undoStore.getState().beginTransaction();

    // Rename file
    const entry = await renameFile('/movies/old.mkv', `/movies/${newName}.mkv`);
    undoStore.getState().addEntry(entry);

    // Create URL file
    const urlContent = generateUrlFileContent({
      url: `https://www.imdb.com/title/${meta.tt}/`,
      originalPath: '/movies/old.mkv',
      nfoContent: null,
    });
    expect(urlContent).toContain(meta.tt);

    // Commit
    undoStore.getState().commitTransaction();
    expect(undoStore.getState().transactions).toHaveLength(1);

    // Log
    await logger.log('rename', '/movies/old.mkv', `/movies/${newName}.mkv`);
    expect(RNFS.appendFile).toHaveBeenCalled();

    // Undo
    await undoStore.getState().undoTransaction(undoStore.getState().transactions[0].id);
    expect(RNFS.moveFile).toHaveBeenCalledWith(`/movies/${newName}.mkv`, '/movies/old.mkv');
  });
});
```

**Step 2: Run test — expect PASS (all services already implemented)**

**Step 3: Commit**

```bash
git add __tests__/integration/renamePipeline.test.tsx
git commit -m "test: add full rename pipeline integration test"
```

### Task 34: Legacy Import Flow

**Files:**
- Modify: `src/App.tsx`
- Test: `__tests__/integration/legacyImport.test.tsx`

**Step 1: Write failing test**

```typescript
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock',
  exists: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

import RNFS from 'react-native-fs';
import { parseLegacyXml, detectCustomizations, migrateLegacyConfig } from '../../src/services/legacyImporter';

describe('Legacy import flow', () => {
  it('detects and imports legacy config on first launch', async () => {
    // Simulate: new config doesn't exist, legacy config does
    (RNFS.exists as jest.Mock)
      .mockResolvedValueOnce(false)  // new config
      .mockResolvedValueOnce(true);  // legacy config
    (RNFS.readFile as jest.Mock).mockResolvedValue('<config><removeThe>true</removeThe></config>');

    const parsed = parseLegacyXml('<config><removeThe>true</removeThe></config>');
    const config = migrateLegacyConfig(parsed);
    expect(config.removeThe).toBe(true);
  });

  it('shows notification when custom terms detected', () => {
    const parsed = parseLegacyXml('<config><removeTerms>YIFY,CustomGroup</removeTerms></config>');
    const customizations = detectCustomizations(parsed);
    expect(customizations.hasCustomRemoveTerms).toBe(true);
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — On app startup: check for new config → if missing, check for legacy → import if found → show summary if customized.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add __tests__/integration/legacyImport.test.tsx src/App.tsx
git commit -m "feat: integrate legacy config import on first launch"
```

### Task 35: ReleaseNotes Component

**Files:**
- Create: `src/components/ReleaseNotes/ReleaseNotes.tsx`
- Create: `src/components/ReleaseNotes/index.ts`
- Test: `__tests__/components/ReleaseNotes.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { ReleaseNotes } from '../../src/components/ReleaseNotes';

describe('ReleaseNotes', () => {
  it('renders release notes content', () => {
    const { getByTestId } = render(<ReleaseNotes visible={true} onClose={jest.fn()} />);
    expect(getByTestId('release-notes-content')).toBeTruthy();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement** — Simple modal with scrollable release notes.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/ReleaseNotes/ __tests__/components/ReleaseNotes.test.tsx
git commit -m "feat: add ReleaseNotes component"
```

### Task 36: Final Verification

**Step 1: Run full test suite**

```bash
npx jest --coverage
```

Expected: All tests pass. Review coverage report for gaps.

**Step 2: Build for Windows**

```bash
npx react-native run-windows --release
```

Expected: App builds and launches.

**Step 3: Build for macOS**

```bash
npx react-native run-macos
```

Expected: App builds and launches.

**Step 4: Manual smoke test**
- Select a folder with movie files
- Verify file list populates
- Select a file, verify search parts render
- Search IMDB, verify results
- Select match, verify metadata extraction
- Preview rename, confirm
- Check undo works
- Check options persist after restart

**Step 5: Commit any fixes, tag release**

```bash
git tag v4.0.0-alpha.1
```
