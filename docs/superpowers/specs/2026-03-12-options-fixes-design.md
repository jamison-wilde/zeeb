# Options Modal Fixes & Legacy Alignment

## Goal

Fix five issues in the recently implemented Options Modal: align default values with legacy Flex app, add keep terms filtering, fix Format Tester to use real extraction, apply MPAA mapping in the format engine, and add separate format toggles.

## 1. Default Values Alignment

### Keep Terms

Replace DEFAULT_KEEP_TERMS with legacy entries plus sensible modern additions.

**Legacy entries (25, reproduced exactly):**

| Match | Display |
|-------|---------|
| `720p` | `720p` |
| `720` | `720p` |
| `1080p` | `1080p` |
| `1080` | `1080p` |
| `hdtv` | `HDTV` |
| `animated` | `Animated` |
| `cd1` | `CD1` |
| `cd2` | `CD2` |
| `dvdr` | `dvdr` |
| `extended` | `Extended` |
| `director's` | `Director's` |
| `directors` | `Director's` |
| `cut` | `Cut` |
| `dts` | `DTS` |
| `dc` | `Director's Cut` |
| `ee` | `Extended Edition` |
| `unrated` | `Unrated` |
| `uncut` | `Uncut` |
| `oar` | `HDTV` |
| `dircut` | `Director's Cut` |
| `se` | `Special Edition` |
| `blu1080p` | `1080p` |
| `blu720p` | `720p` |
| `576p` | `576p` |
| `remastered` | `Remastered` |

**Modern additions (10):**

| Match | Display |
|-------|---------|
| `2160p` | `2160p` |
| `2160` | `2160p` |
| `4K` | `4K` |
| `480p` | `480p` |
| `IMAX` | `IMAX` |
| `3D` | `3D` |
| `HDR` | `HDR` |
| `HDR10` | `HDR` |
| `HDR10Plus` | `HDR` |
| `DolbyVision` | `DV` |

**Removed** (not in legacy, too niche for defaults): Criterion Collection, cc, Final Cut, Redux, Anniversary/Definitive/Ultimate/Collector's/Limited/Deluxe/Complete/Gold/Platinum Edition, Black and Chrome, Snyder Cut, Assembly Cut, Workprint, Open Matte, Superbit, Extended Cut, Theatrical, DDP5.1, DTS-HD.MA, TrueHD, Atmos.

### MPAA Map

Change `mpaaMap` type from `Record<string, string>` (or `{}`) to `Array<[string, string]>`. Populate with all 16 legacy entries:

| IMDB Rating | Output |
|-------------|--------|
| `NF` | `NR` |
| `R` | `R` |
| `APPROVED` | `A` |
| `NOT_RATED` | `NR` |
| `PG` | `PG` |
| `PG_13` | `PG-13` |
| `NC_17` | `NC-17` |
| `G` | `G` |
| `TV_G` | `G` |
| `TV_PG` | `TV-PG` |
| `TV_R` | `TV-R` |
| `TV_14` | `TV-14` |
| `TV_Y7` | `TV-Y7` |
| `TV_MA` | `TV-MA` |
| `X` | `X` |
| `UNRATED` | `NR` |

Note: First entry (`NF→NR`) is the default "not found" fallback. Order matters — keep `NF` first.

### Format Defaults

- `formatStandard`: `<title> (<year>).<imdb>(<rating100>).<saved>` (already correct)
- `formatAka`: `<aka> (<title>) (<year>).<imdb>(<rating100>).<saved>`
- `formatDvd`: `<title> (<year>).<imdb>(<rating100>).<saved>`
- `formatDvdAka`: `<aka> (<title>) (<year>).<imdb>(<rating100>).<saved>`
- `formatPoster`: `''` (empty — user provides when enabled)
- `formatUrl`: `''` (empty — user provides when enabled)

### New Config Fields

- `separateDvdFormat: boolean` (default `false`) — when false, DVD folder uses standard/AKA format
- `separatePosterFormat: boolean` (default `false`) — when false, poster uses standard/AKA format
- `separateUrlFormat: boolean` (default `false`) — when false, URL file uses standard/AKA format
- `formatDvdAka: string` (default as above)

### Config Migration

On config load, if `mpaaMap` is a plain object (`Record<string, string>`), convert to `Array<[string, string]>` by mapping `Object.entries()`. If already an array, keep as-is.

## 2. Keep Terms Filter

Add a text filter input above the KeyValueTable in SearchTermsSection. The filter sits between the "Keep Terms" heading and the table.

- Case-insensitive filtering on both match and display columns
- Local UI state only — does not modify the underlying data
- Placeholder: "Filter terms..."
- The "+ Add" button remains visible at the bottom when filtering
- Filtered-out rows are hidden, not removed

## 3. Format Tester via Renamer Webview

Rewrite FormatTesterSection to use the Renamer's webview for real extraction instead of the suggestion API.

### Store Additions (renamerStore)

- `testerRequest: { tt: string } | null` — set by Format Tester
- `testerResult: MovieMetadata | null` — set by Renamer after extraction
- `testerError: string | null` — set by Renamer on failure

### Flow

1. User enters tt# in Format Tester, clicks "Test"
2. Format Tester sets `testerRequest = { tt }`, shows loading state
3. Renamer watches `testerRequest`. On change, navigates webview to `https://www.imdb.com/title/{tt}/`
4. Page loads, existing `generateTitleExtractionScript()` runs
5. Renamer receives extraction results through existing message handler, sets `testerResult`
6. Format Tester watches `testerResult`, displays token table and format preview
7. `testerRequest` is cleared after results are received

### Edge Cases

- Renamer is still mounted behind the OptionsModal overlay — webview stays functional
- Use the first/active Renamer instance
- Timeout after ~10 seconds → show error
- If webview isn't mounted, show "Webview not available" error

### Token Table

Shows all tokens with resolved values from extracted MovieMetadata. `<saved>` shows "(from current file)" placeholder. `<original>` shows the tt# as placeholder.

## 4. MPAA Map in Format Engine

`formatEngine.ts` currently substitutes `metadata.mpaa ?? ''` directly without consulting `mpaaMap`. Update to look up the raw MPAA value in the map: find the first entry where the match (left column) equals the raw value, output the display (right column). If no match found, output the raw value unchanged.

## 5. Formatting Section UI Changes

Add checkboxes for separate DVD, poster, and URL formats in FormattingSection.

**DVD format:** Checkbox "Use separate DVD folder format." When checked, shows two inputs (standard + AKA) for DVD format. When unchecked, inputs are hidden/disabled — the rename engine uses the main standard/AKA format.

**Poster format:** Checkbox "Use separate poster format." When checked, shows one input for poster format. When unchecked, hidden — poster uses standard/AKA format.

**URL format:** Checkbox "Use separate URL file format." When checked, shows one input for URL format. When unchecked, hidden — URL file uses standard/AKA format.

## File Changes

**Modified:**
- `src/utils/defaultTerms.ts` — Replace DEFAULT_KEEP_TERMS, add DEFAULT_MPAA_MAP
- `src/services/configDefaults.ts` — Fix format defaults, add new fields, use DEFAULT_MPAA_MAP
- `src/types/index.ts` — Add `separateDvdFormat`, `separatePosterFormat`, `separateUrlFormat`, `formatDvdAka`; change `mpaaMap` to `Array<[string, string]>`
- `src/services/formatEngine.ts` — Apply mpaaMap lookup for `<mpaa>` token
- `src/stores/renamerStore.ts` — Add `testerRequest`, `testerResult`, `testerError`
- `src/renderer/components/Renamer.tsx` — Watch `testerRequest`, drive webview, set `testerResult`
- `src/renderer/components/options/FormatTesterSection.tsx` — Rewrite to use renamerStore
- `src/renderer/components/options/FormattingSection.tsx` — Add checkboxes, DVD AKA input, conditional visibility
- `src/renderer/components/options/SearchTermsSection.tsx` — Add filter input above keep terms table

**Tests to update:**
- `__tests__/utils/defaultTerms.test.ts`
- `__tests__/services/formatEngine.test.ts`
- `__tests__/stores/configStore.test.ts`
- `__tests__/components/options/FormatTesterSection.test.tsx`
- `__tests__/components/options/FormattingSection.test.tsx`
- `__tests__/components/options/SearchTermsSection.test.tsx`
