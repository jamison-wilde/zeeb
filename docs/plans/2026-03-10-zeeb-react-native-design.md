# Zeeb React Native Rewrite — Design Document

## Overview

Rewrite Zeeb (legacy Adobe Flex/AIR movie file renamer) as a React Native desktop app targeting Windows and macOS using `react-native-windows` and `react-native-macos`.

## Core Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | React Native (RN Windows + RN macOS) | MS-maintained, native UI, single JS codebase |
| Language | TypeScript (strict, no `any`) | Type safety, maintainability |
| State management | Zustand | Lightweight, no boilerplate, easy store slicing |
| Settings storage | JSON file on disk | Human-readable/editable, closest to original XML |
| Undo system | In-memory only | Matches original behavior, simple |
| Log format | Plain text | Matches original |
| IMDB data source | Scrape via WebView JS injection | Single request per file, ToS-friendly (renders full page with ads) |
| Poster source | TMDB REST API | Same as original |
| Distribution | Deferred | Focus on app first |

## Architecture

```
┌─────────────────────────────────────────────┐
│              React Native App               │
│  (react-native-windows + react-native-macos)│
├─────────────────────────────────────────────┤
│  UI Layer                                   │
│  ├─ FolderBrowser (directory tree + recent)  │
│  ├─ Renamer × 2 (dual instances, swap)      │
│  │   ├─ FileList (scanned movies)           │
│  │   ├─ SearchParts (interactive tokens)    │
│  │   ├─ MovieResults (IMDB matches)         │
│  │   ├─ WebView (IMDB page, toggleable vis) │
│  │   ├─ PosterPreview                       │
│  │   └─ RenamePreview + controls            │
│  ├─ OptionsModal                            │
│  ├─ UndoModal                               │
│  └─ NfoViewer                               │
├─────────────────────────────────────────────┤
│  State Layer                                │
│  ├─ ConfigStore (JSON file on disk)         │
│  ├─ FileStore (scanned files + metadata)    │
│  ├─ UndoStore (in-memory transactions)      │
│  └─ RenamerState × 2 (per-instance state)   │
├─────────────────────────────────────────────┤
│  Services                                   │
│  ├─ ImdbExtractor (JS injection into WebView)│
│  ├─ TmdbService (poster fetch via REST)     │
│  ├─ FileScanner (recursive dir listing)     │
│  ├─ FileRenamer (rename + subtitle + folder)│
│  ├─ NfoParser (CP437 → Unicode)             │
│  ├─ FilenameParser (tokenize + classify)    │
│  ├─ UrlFileWriter (.url / .webloc per OS)   │
│  └─ LegacyImporter (XML config → JSON)     │
├─────────────────────────────────────────────┤
│  Platform (native modules where needed)     │
│  ├─ react-native-fs (filesystem)            │
│  ├─ react-native-webview (dual WebViews)    │
│  └─ Native: .webloc writer (macOS only)     │
└─────────────────────────────────────────────┘
```

## Data Flow

### File Discovery → Rename Pipeline (per Renamer instance)

1. User selects folder → FileScanner recursively lists directory
2. Filter by extension config (mkv, avi, mp4, etc.), detect DVD folders (VIDEO_TS.IFO, BDMV)
3. Scan for existing .nfo, .url, poster files per movie → populate FileStore
4. User selects file → FilenameParser tokenizes by regex, classifies via keep/remove terms
5. SearchPart components render (interactive, editable)
6. User triggers search → collect "search" tokens → WebView navigates to IMDB search
7. JS injection extracts search results → MovieResults renders matches
8. User selects match → WebView navigates to IMDB title page
9. JS injection extracts metadata: JSON-LD → DOM selectors → regex fallback
10. TmdbService fetches poster candidates
11. RenamePreview generates filename from format string + metadata
12. User confirms → transaction: rename file + subtitles + folder + create .url/.webloc + save poster
13. Advance to next file, swap to prefetched Renamer instance

### Prefetch Cycle

While Renamer[visible] is active, Renamer[hidden]:
- Auto-selects next file, runs FilenameParser + auto-search
- WebView[hidden] loads IMDB results
- If single strong match: auto-navigates to title page, extracts metadata, fetches poster
- Ready when user advances

## IMDB Data Extraction Strategy

Three-tier extraction from WebView via JS injection (`onLoadEnd`):

1. **JSON-LD** (preferred): Extract `<script type="application/ld+json">` content
2. **DOM selectors** (fallback): Configurable `querySelector` patterns stored in config JSON
3. **Regex** (final fallback): For users with customized patterns from legacy app

All extraction patterns are user-configurable in the JSON config file. Users can fix IMDB breakage or adapt for localized IMDB versions without an app release.

Data returned via `window.ReactNativeWebView.postMessage()`.

## WebView Behavior

- **Two WebView instances always exist** — one visible, one offscreen prefetching
- **IMDB page always loads** regardless of visibility toggle — rendering with ads is ToS-friendly
- Toggle controls visibility only, not loading
- Each WebView is owned by its Renamer instance

## Legacy Config Import

- On first launch, search for existing Zeeb XML config in default AIR storage locations
- Parse XML → convert to JSON schema
- Diff customized regex/terms against known legacy defaults
- If customized: show summary dialog, import custom values, flag them in config
- If default: use new refreshed defaults silently

## Filename Format Engine

Same token syntax as original with 25+ interpolation tokens:
- `<title>`, `<year>`, `<imdb>`, `<rating100>`, `<rating10>`
- `<directors>`, `<director>`, `<genres>`, `<genre>`
- `<stars>`, `<star1>`, `<stars2>`, `<stars3>`
- `<duration>`, `<mpaa>`, `<H>`, `<M>`
- `<aka>`, `<original>`, `<saved>`

Separate format strings for: standard, AKA, DVD folder, poster filename, URL filename.
"The" handling and space replacement configurable.

## Remove/Keep Terms

- Refreshed defaults for new installs (updated for modern release groups, x265, HDR, HEVC, Atmos, etc.)
- Imported configs get customized terms merged on top of refreshed defaults

## Platform-Specific Behavior

| Feature | Windows | macOS |
|---------|---------|-------|
| URL shortcut | `.url` (INI format) | `.webloc` (plist XML) |
| WebView engine | Edge/Chromium | WKWebView |
| Filesystem | react-native-fs | react-native-fs |
| File dialog | native via RN | native via RN |

## Project Structure

```
zeeb/
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── FolderBrowser/
│   │   ├── Renamer/
│   │   ├── FileList/
│   │   ├── SearchParts/
│   │   ├── MovieResults/
│   │   ├── PosterPreview/
│   │   ├── RenamePreview/
│   │   ├── OptionsModal/
│   │   ├── UndoModal/
│   │   ├── NfoViewer/
│   │   └── ReleaseNotes/
│   ├── services/
│   │   ├── imdbExtractor.ts
│   │   ├── tmdbService.ts
│   │   ├── fileScanner.ts
│   │   ├── fileRenamer.ts
│   │   ├── filenameParser.ts
│   │   ├── formatEngine.ts
│   │   ├── nfoParser.ts
│   │   ├── urlFileWriter.ts
│   │   ├── legacyImporter.ts
│   │   └── logger.ts
│   ├── stores/
│   │   ├── configStore.ts
│   │   ├── fileStore.ts
│   │   ├── undoStore.ts
│   │   └── renamerStore.ts
│   ├── utils/
│   │   ├── cp437.ts
│   │   ├── defaultTerms.ts
│   │   └── platform.ts
│   ├── native/
│   │   └── webloc/
│   └── types/
│       └── index.ts
├── assets/
│   ├── icons/
│   └── fonts/
├── docs/
│   └── plans/
├── __tests__/
├── package.json
├── tsconfig.json
└── CLAUDE.md
```
