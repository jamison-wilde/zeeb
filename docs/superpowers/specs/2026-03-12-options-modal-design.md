# Options Modal Redesign

## Goal

Replace the current flat, minimal OptionsModal with a full-featured sidebar-navigated settings panel that exposes all meaningful configuration from the legacy Flex app, with contextual help and a live format tester.

## Architecture

The modal becomes a full-screen overlay with a left sidebar listing sections and a content area on the right. Each section is a React component. The Formatting section uses a two-column layout: format inputs on the left, a fixed token reference panel on the right with click-to-insert. A reusable tag-input component handles extensions, remove terms, and keep terms.

## Sections

### 1. Formatting

**Layout:** Two columns — format inputs left, token reference right.

**Format inputs (left column):**
- Standard format (`formatStandard`)
- AKA format (`formatAka`)
- DVD folder format (`formatDvd`)
- Poster format (`formatPoster`)
- URL file format (`formatUrl`)

Each input is a labeled text field. A brief note above the inputs: "Use `/` in format strings to create subfolders."

**Token reference (right column, fixed):**

Permanently visible scrollable panel listing all tokens with short descriptions. Tokens are clickable — clicking inserts the token at the cursor position in the last-focused format input. Before any input has been focused, clicking a token does nothing (tokens appear visually muted until an input is focused).

| Token | Short | Description |
|-------|-------|-------------|
| `<title>` | `<t>` | Movie title |
| `<year>` | `<y>` | Release year |
| `<imdb>` | `<tt>` | IMDB tt number |
| `<rating100>` | `<r100>` | Rating 0–100 |
| `<rating10>` | `<r10>` | Rating 0–10 decimal |
| `<saved>` | `<s>` | Saved/kept filename parts |
| `<aka>` | `<a>` | Also Known As title |
| `<directors>` | `<d>` | All directors |
| `<director>` | `<d1>` | First director |
| `<genres>` | `<g>` | All genres |
| `<genre>` | `<g1>` | First genre |
| `<stars>` | | All stars |
| `<star1>` | | First star |
| `<stars2>` | | First 2 stars |
| `<stars3>` | | First 3 stars |
| `<mpaa>` | `<c>` | MPAA/certification rating |
| `<duration>` | | Duration in minutes |
| `<H>` | | Hours component |
| `<M>` | | Minutes component |
| `<original>` | `<o>` | Original filename |

### 2. General

**Title handling:**
- Checkbox: Remove "The" from beginning
- Checkbox: Swap "The" to end after comma
- Text input: Custom "The" word (for non-English, e.g., "Die")
- Text input: Replace title spaces with (blank = keep spaces)

**Separators:**
- Saved parts separator (default `.`)
- Director separator (default `, `)
- Genre separator (default `, `)
- Star separator (default `, `)

**Behavior:**
- Checkbox: Rename parent folder
- Checkbox: Detect DVD/BluRay folders

### 3. File Types

**Movie extensions** — Tag-input component. Shows current extensions as removable pills. Text input to add new ones. Default set from `DEFAULT_MOVIE_EXTENSIONS`.

**Subtitle extensions** — Same tag-input component. Default set from `DEFAULT_SUBTITLE_EXTENSIONS`.

### 4. Search Terms

**Remove terms** — Tag-input component. Terms that get auto-marked as "remove" when parsing filenames.

**Keep terms** — Tag-input component. Terms that get auto-marked as "keep."

### 5. Companions

**URL file group:**
- Checkbox: Create .url file (parent toggle: `createUrlFile`)
  - Sub-checkbox: Include original filename in .url
  - Sub-checkbox: Include NFO content in .url
  - Sub-checkbox: Delete original NFO after including

Sub-options are visually indented and disabled when their parent toggle is unchecked. `deleteNfoAfterInclude` is disabled when either `createUrlFile` or `includeNfoInUrl` is off (two-level dependency).

**Poster group:**
- Checkbox: Download poster from TMDB (`createPoster`)
  - Sub-checkbox: Place poster inside DVD folder

**NFO:**
- Text input + Browse button: Additional NFO folder path (`nfoFolder`)
- Checkbox: Scan NFO folder (`scanNfo`)

### 6. Logging

- Text input + Browse button: Log file location (`logFilePath`)
- Numeric input: Maximum undos remembered (0–1000)

### 7. IMDB

- Text input: IMDB Search URL (`urlImdbSearch`)
- Text input: IMDB Title URL (`urlImdbTT`)
- Numeric input with +/- buttons: HTML zoom % (`htmlZoom`, range 50–200)
- Editable key-value table: MPAA mapping (`mpaaMap`) — left column is IMDB rating, right column is output string

### 8. Format Tester

A live preview panel. User enters an IMDB tt# and clicks "Test." The app fetches title data via the IMDB suggestion API + webview title page extraction, then displays every token's resolved value in a two-column table.

**States:**
- **Idle:** Empty input with placeholder "Enter tt# (e.g., tt0068646)"
- **Loading:** Spinner + "Fetching..." after clicking Test
- **Error:** Red text "Could not fetch data for tt#" if network fails or tt# is invalid
- **Results:** Token table + formatted filename preview

| Token | Value |
|-------|-------|
| `<title>` | The Godfather |
| `<year>` | 1972 |
| `<imdb>` | tt0068646 |
| `<rating100>` | 93 |
| ... | ... |

`<saved>` shows "(from current file)" placeholder since saved parts depend on the active file's parsed keep-parts. `<original>` shows the tt# as placeholder.

Below the token table, a preview of the current standard format string with all tokens substituted, showing the actual filename that would result.

## Reusable Components

### TagInput

Used for: movie extensions, subtitle extensions, remove terms, keep terms.

**Props:** `values: string[]`, `onChange: (values: string[]) => void`, `placeholder: string`

**Behavior:** Renders each value as a pill with an 'x' button. A text input at the end. Pressing Enter or comma adds the current text as a new tag. Clicking 'x' removes a tag.

### BrowseInput

Used for: NFO folder, log file location.

**Props:** `value: string`, `onChange: (value: string) => void`, `placeholder: string`, `mode: 'file' | 'directory'`

**Behavior:** Text input with a "Browse" button that opens the native file/directory picker. For directories, uses existing `window.zeebDialog.openDirectory()`. For files, requires adding `window.zeebDialog.openFile()` → new IPC handler `dialog:openFile` in `src/main/ipc.ts` + bridge in `src/preload/main.ts`.

## Config Store Changes

New fields to add to `ZeebConfig` (in `src/types/index.ts`) and `DEFAULT_CONFIG` (in `src/services/configDefaults.ts`):

- `includeOriginalInUrl: boolean` (default `true`)
- `includeNfoInUrl: boolean` (default `false`)
- `deleteNfoAfterInclude: boolean` (default `false`)
- `posterInDvdFolder: boolean` (default `true`)
- `detectDvd: boolean` (default `true`)
- `maxUndos: number` (default `100`)
- `theWord: string` (default `'The'`)

Existing fields that gain UI but already exist in `ZeebConfig`: `renameFolder`, `createUrlFile`, `createPoster`, `nfoFolder`, `scanNfo`, `logFilePath`, `urlImdbSearch`, `urlImdbTT`, `htmlZoom`, `mpaaMap`, `removeThe`, `swapThe`, `titleSpaceChar`, `formatPoster`, `formatUrl`, `savedPartSeparator`, `directorSeparator`, `genreSeparator`, `starSeparator`, `movieExtensions`, `subtitleExtensions`, `removeTerms`, `keepTerms`, `formatStandard`, `formatAka`, `formatDvd`.

## File Structure

```
src/renderer/components/
  OptionsModal.tsx          — Rewrite: sidebar + content router
  options/
    FormattingSection.tsx   — Format inputs + token reference panel
    GeneralSection.tsx      — The handling, separators, behavior toggles
    FileTypesSection.tsx    — Movie/subtitle extensions (TagInput)
    SearchTermsSection.tsx  — Remove/keep terms (TagInput)
    CompanionsSection.tsx   — URL file, poster, NFO toggles
    LoggingSection.tsx      — Log file, max undos
    ImdbSection.tsx         — URL overrides, zoom, MPAA map
    FormatTesterSection.tsx — Live token preview
    TagInput.tsx            — Reusable tag/pill input
    BrowseInput.tsx         — Text input + native browse button
```

## Migration

The current OptionsModal is a single 100-line file with no meaningful logic to preserve. It will be rewritten entirely. No backwards compatibility concerns — the config store shape is additive (new fields with defaults).

## Out of Scope

- Advanced regex editor (extraction uses JSON-LD, not user regexes)
- Auto-update check (Electron handles this)
- Show hidden files, show part icons (not relevant to new UI)
- Small file copy limit / duplicate-for-testing feature
- Include folder name in search terms (suggestion API makes this less relevant)
