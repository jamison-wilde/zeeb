# Options Modal Fixes & Legacy Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five issues in the Options Modal: align defaults with legacy Flex app, add keep terms filtering, fix Format Tester to use real webview extraction, apply MPAA mapping in the format engine, and add separate format toggles.

**Architecture:** Replace default arrays wholesale, add new config fields with migration, create a shared testerStore for Format Tester ↔ Renamer communication, extend Renamer's navigation mode to support tester requests, and add conditional format inputs to FormattingSection.

**Tech Stack:** React 19, Zustand, Vitest, Testing Library, TypeScript, Electron webview

**Spec:** `docs/superpowers/specs/2026-03-12-options-fixes-design.md`

---

## Chunk 1: Default Values & Config Changes

### Task 1: Replace DEFAULT_KEEP_TERMS with Legacy-Aligned Values

**Files:**
- Modify: `src/utils/defaultTerms.ts:328-379`
- Modify: `__tests__/utils/defaultTerms.test.ts`

- [ ] **Step 1: Update the test to expect exactly 35 entries**

In `__tests__/utils/defaultTerms.test.ts`, update (or add) a test that checks the exact count and presence of legacy entries:

```typescript
it('DEFAULT_KEEP_TERMS contains all legacy entries plus modern additions', () => {
  expect(DEFAULT_KEEP_TERMS).toHaveLength(35);
  // Legacy entries
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['720p', '720p']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['720', '720p']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['hdtv', 'HDTV']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['animated', 'Animated']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['cd1', 'CD1']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['cd2', 'CD2']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['dvdr', 'dvdr']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(["director's", "Director's"]);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(["directors", "Director's"]);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['cut', 'Cut']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['dts', 'DTS']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['dc', "Director's Cut"]);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['ee', 'Extended Edition']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['oar', 'HDTV']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['dircut', "Director's Cut"]);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['se', 'Special Edition']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['blu1080p', '1080p']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['blu720p', '720p']);
  // Modern additions
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['2160p', '2160p']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['2160', '2160p']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['4K', '4K']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['IMAX', 'IMAX']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['3D', '3D']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['HDR', 'HDR']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['HDR10', 'HDR']);
  expect(DEFAULT_KEEP_TERMS).toContainEqual(['DolbyVision', 'DV']);
});

it('DEFAULT_KEEP_TERMS does not contain removed entries', () => {
  const matches = DEFAULT_KEEP_TERMS.map(([m]) => m);
  expect(matches).not.toContain('Criterion Collection');
  expect(matches).not.toContain('cc');
  expect(matches).not.toContain('Platinum Edition');
  expect(matches).not.toContain('Snyder Cut');
  expect(matches).not.toContain('DDP5.1');
  expect(matches).not.toContain('TrueHD');
  expect(matches).not.toContain('Atmos');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/utils/defaultTerms.test.ts`
Expected: FAIL — count mismatch and missing legacy entries.

- [ ] **Step 3: Replace the DEFAULT_KEEP_TERMS array wholesale**

In `src/utils/defaultTerms.ts`, replace the entire `DEFAULT_KEEP_TERMS` array (lines 328–379) with:

```typescript
export const DEFAULT_KEEP_TERMS: Array<[string, string]> = [
  // Legacy entries (from Flex Config.as, exact reproduction)
  ['720p', '720p'],
  ['720', '720p'],
  ['1080p', '1080p'],
  ['1080', '1080p'],
  ['hdtv', 'HDTV'],
  ['animated', 'Animated'],
  ['cd1', 'CD1'],
  ['cd2', 'CD2'],
  ['dvdr', 'dvdr'],
  ['extended', 'Extended'],
  ["director's", "Director's"],
  ["directors", "Director's"],
  ['cut', 'Cut'],
  ['dts', 'DTS'],
  ['dc', "Director's Cut"],
  ['ee', 'Extended Edition'],
  ['unrated', 'Unrated'],
  ['uncut', 'Uncut'],
  ['oar', 'HDTV'],
  ['dircut', "Director's Cut"],
  ['se', 'Special Edition'],
  ['blu1080p', '1080p'],
  ['blu720p', '720p'],
  ['576p', '576p'],
  ['remastered', 'Remastered'],
  // Modern additions
  ['2160p', '2160p'],
  ['2160', '2160p'],
  ['4K', '4K'],
  ['480p', '480p'],
  ['IMAX', 'IMAX'],
  ['3D', '3D'],
  ['HDR', 'HDR'],
  ['HDR10', 'HDR'],
  ['HDR10Plus', 'HDR'],
  ['DolbyVision', 'DV'],
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/utils/defaultTerms.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/defaultTerms.ts __tests__/utils/defaultTerms.test.ts
git commit -m "fix: align DEFAULT_KEEP_TERMS with legacy Flex values"
```

---

### Task 2: Add DEFAULT_MPAA_MAP and Fix Config Types

**Files:**
- Modify: `src/utils/defaultTerms.ts`
- Modify: `src/types/index.ts:97-166`
- Modify: `src/services/configDefaults.ts:9-78`
- Modify: `__tests__/utils/defaultTerms.test.ts`

- [ ] **Step 1: Write tests for DEFAULT_MPAA_MAP**

Add to `__tests__/utils/defaultTerms.test.ts` (import path is `../../src/utils/defaultTerms` — two levels up from `__tests__/utils/`):

```typescript
import { DEFAULT_KEEP_TERMS, DEFAULT_MPAA_MAP } from '../../src/utils/defaultTerms';

describe('DEFAULT_MPAA_MAP', () => {
  it('contains all 16 legacy MPAA entries', () => {
    expect(DEFAULT_MPAA_MAP).toHaveLength(16);
    expect(DEFAULT_MPAA_MAP[0]).toEqual(['NF', 'NR']); // first = not-found fallback
    expect(DEFAULT_MPAA_MAP).toContainEqual(['R', 'R']);
    expect(DEFAULT_MPAA_MAP).toContainEqual(['PG_13', 'PG-13']);
    expect(DEFAULT_MPAA_MAP).toContainEqual(['NC_17', 'NC-17']);
    expect(DEFAULT_MPAA_MAP).toContainEqual(['TV_MA', 'TV-MA']);
    expect(DEFAULT_MPAA_MAP).toContainEqual(['UNRATED', 'NR']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/utils/defaultTerms.test.ts`
Expected: FAIL — DEFAULT_MPAA_MAP not exported.

- [ ] **Step 3: Add DEFAULT_MPAA_MAP to defaultTerms.ts**

Add at the end of `src/utils/defaultTerms.ts`:

```typescript
export const DEFAULT_MPAA_MAP: Array<[string, string]> = [
  ['NF', 'NR'],       // default "not found" fallback — must be first
  ['R', 'R'],
  ['APPROVED', 'A'],
  ['NOT_RATED', 'NR'],
  ['PG', 'PG'],
  ['PG_13', 'PG-13'],
  ['NC_17', 'NC-17'],
  ['G', 'G'],
  ['TV_G', 'G'],
  ['TV_PG', 'TV-PG'],
  ['TV_R', 'TV-R'],
  ['TV_14', 'TV-14'],
  ['TV_Y7', 'TV-Y7'],
  ['TV_MA', 'TV-MA'],
  ['X', 'X'],
  ['UNRATED', 'NR'],
];
```

- [ ] **Step 4: Update ZeebConfig type AND DEFAULT_CONFIG atomically**

**Important:** These two files must be changed together — changing the type alone will cause a TypeScript compile error because `configDefaults.ts` still has `mpaaMap: {}`.

In `src/types/index.ts`, change `mpaaMap` type (line 153) from:
```typescript
  mpaaMap: Record<string, string>;
```
to:
```typescript
  mpaaMap: Array<[string, string]>;
```

Add new fields in the format strings section (after `formatUrl`, around line 108):
```typescript
  formatDvdAka: string;
```

Add new fields after `theWord` (line 146):
```typescript
  separateDvdFormat: boolean;
  separatePosterFormat: boolean;
  separateUrlFormat: boolean;
```

- [ ] **Step 5: Update DEFAULT_CONFIG in `src/services/configDefaults.ts` (same atomic change)**

Add import:
```typescript
import { DEFAULT_KEEP_TERMS, DEFAULT_REMOVE_TERMS, DEFAULT_MOVIE_EXTENSIONS, DEFAULT_SUBTITLE_EXTENSIONS, DEFAULT_MPAA_MAP } from '../utils/defaultTerms';
```

Fix format defaults (lines 16-20):
```typescript
  formatStandard: '<title> (<year>).<imdb>(<rating100>).<saved>',
  formatAka: '<aka> (<title>) (<year>).<imdb>(<rating100>).<saved>',
  formatDvd: '<title> (<year>).<imdb>(<rating100>).<saved>',
  formatDvdAka: '<aka> (<title>) (<year>).<imdb>(<rating100>).<saved>',
  formatPoster: '',
  formatUrl: '',
```

Add new fields:
```typescript
  separateDvdFormat: false,
  separatePosterFormat: false,
  separateUrlFormat: false,
```

Change mpaaMap default:
```typescript
  mpaaMap: DEFAULT_MPAA_MAP,
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run __tests__/utils/defaultTerms.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/utils/defaultTerms.ts src/types/index.ts src/services/configDefaults.ts __tests__/utils/defaultTerms.test.ts
git commit -m "feat: add DEFAULT_MPAA_MAP, new config fields, fix format defaults"
```

---

### Task 3: Config Migration for mpaaMap

**Files:**
- Modify: `src/stores/configStore.ts:32-52`
- Modify: `__tests__/stores/configStore.test.ts`

- [ ] **Step 1: Write migration tests**

Add to `__tests__/stores/configStore.test.ts`. Import `DEFAULT_MPAA_MAP` from `'../../src/utils/defaultTerms'` (separate import from the configStore imports). Follow the existing test pattern — each test creates its own `mockFs` and `store`:

```typescript
import { DEFAULT_MPAA_MAP } from '../../src/utils/defaultTerms';

// ... inside the existing describe block:

it('migrates mpaaMap from Record<string, string> to Array<[string, string]>', async () => {
  const fs = createMockFsAdapter({
    exists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(JSON.stringify({
      mpaaMap: { R: 'R', PG: 'PG', PG_13: 'PG-13' },
    })),
  });
  const store = createConfigStore(fs);
  await store.getState().load();
  expect(store.getState().config.mpaaMap).toEqual([['R', 'R'], ['PG', 'PG'], ['PG_13', 'PG-13']]);
});

it('falls back to DEFAULT_MPAA_MAP when mpaaMap is empty object', async () => {
  const fs = createMockFsAdapter({
    exists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(JSON.stringify({
      mpaaMap: {},
    })),
  });
  const store = createConfigStore(fs);
  await store.getState().load();
  expect(store.getState().config.mpaaMap).toEqual(DEFAULT_MPAA_MAP);
});

it('falls back to DEFAULT_MPAA_MAP when mpaaMap is empty array', async () => {
  const fs = createMockFsAdapter({
    exists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(JSON.stringify({
      mpaaMap: [],
    })),
  });
  const store = createConfigStore(fs);
  await store.getState().load();
  expect(store.getState().config.mpaaMap).toEqual(DEFAULT_MPAA_MAP);
});

it('preserves mpaaMap when already a non-empty array', async () => {
  const fs = createMockFsAdapter({
    exists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(JSON.stringify({
      mpaaMap: [['R', 'Restricted'], ['G', 'General']],
    })),
  });
  const store = createConfigStore(fs);
  await store.getState().load();
  expect(store.getState().config.mpaaMap).toEqual([['R', 'Restricted'], ['G', 'General']]);
});
```

Note: Check the existing test file for the exact `createMockFsAdapter` helper pattern and match it.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/stores/configStore.test.ts`
Expected: FAIL — no migration logic for mpaaMap.

- [ ] **Step 3: Add mpaaMap migration to configStore.ts**

In `src/stores/configStore.ts`, add after the keepTerms migration (line 44), before the `set(...)` call:

```typescript
          // Migrate legacy mpaaMap: Record<string, string> → Array<[string, string]>
          if (saved.mpaaMap && !Array.isArray(saved.mpaaMap)) {
            const entries = Object.entries(saved.mpaaMap as Record<string, string>);
            saved.mpaaMap = entries.length > 0 ? entries : DEFAULT_MPAA_MAP;
          } else if (Array.isArray(saved.mpaaMap) && (saved.mpaaMap as unknown[]).length === 0) {
            saved.mpaaMap = DEFAULT_MPAA_MAP;
          }
```

Add import at top of file:
```typescript
import { DEFAULT_MPAA_MAP } from '../utils/defaultTerms';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/stores/configStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/configStore.ts __tests__/stores/configStore.test.ts
git commit -m "fix: migrate mpaaMap from Record to Array with empty fallback"
```

---

### Task 4: Apply mpaaMap in Format Engine

**Files:**
- Modify: `src/services/formatEngine.ts:27-58`
- Modify: `__tests__/services/formatEngine.test.ts`

- [ ] **Step 1: Write tests for mpaaMap lookup**

Add to `__tests__/services/formatEngine.test.ts`:

```typescript
describe('mpaaMap substitution', () => {
  const baseMeta: MovieMetadata = {
    tt: 'tt0068646', title: 'The Godfather', year: 1972,
    rating: 9.2, directors: ['Francis Ford Coppola'], genres: ['Crime', 'Drama'],
    actors: ['Marlon Brando'], duration: 175, mpaa: 'R', aka: [], posterUrl: null,
  };

  it('applies mpaaMap when raw value has a mapping', () => {
    const result = interpolateFormat('<mpaa>', baseMeta, {
      saved: '',
      mpaaMap: [['R', 'Restricted']],
    });
    expect(result).toBe('Restricted');
  });

  it('passes through raw value when no mapping found', () => {
    const result = interpolateFormat('<mpaa>', baseMeta, {
      saved: '',
      mpaaMap: [['PG', 'PG']],
    });
    expect(result).toBe('R');
  });

  it('uses NF fallback entry when mpaa is null', () => {
    const meta = { ...baseMeta, mpaa: null };
    const result = interpolateFormat('<mpaa>', meta, {
      saved: '',
      mpaaMap: [['NF', 'NR'], ['R', 'R']],
    });
    expect(result).toBe('NR');
  });

  it('works with empty mpaaMap', () => {
    const result = interpolateFormat('<mpaa>', baseMeta, {
      saved: '',
      mpaaMap: [],
    });
    expect(result).toBe('R');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/services/formatEngine.test.ts`
Expected: FAIL — `mpaaMap` not a recognized option.

- [ ] **Step 3: Add mpaaMap to FormatOptions and apply in interpolateFormat**

In `src/services/formatEngine.ts`:

Add to `FormatOptions` interface (after `titleSpaceChar`):
```typescript
  mpaaMap?: Array<[string, string]>;
```

Replace the `<mpaa>` token line (line 52) with:
```typescript
    '<mpaa>': (() => {
      const raw = metadata.mpaa;
      const map = options.mpaaMap ?? [];
      if (raw == null) {
        // Use NF (not-found) fallback if present
        const nf = map.find(([m]) => m === 'NF');
        return nf ? nf[1] : '';
      }
      const entry = map.find(([m]) => m === raw);
      return entry ? entry[1] : raw;
    })(),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/services/formatEngine.test.ts`
Expected: PASS

- [ ] **Step 5: Pass mpaaMap from config in all interpolateFormat call sites**

Search the codebase for `interpolateFormat` calls and ensure `mpaaMap: config.mpaaMap` is passed in the options. Known call sites:
- `src/renderer/components/Renamer.tsx` (in the preview/rename logic)
- `src/renderer/components/options/FormatTesterSection.tsx` (will be rewritten in Task 8)

In `Renamer.tsx`, find the `interpolateFormat` call and add `mpaaMap: config.mpaaMap` to the options object.

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/services/formatEngine.ts __tests__/services/formatEngine.test.ts src/renderer/components/Renamer.tsx
git commit -m "feat: apply mpaaMap lookup in format engine"
```

---

## Chunk 2: Keep Terms Filter & FormattingSection

### Task 5: Add Filter to SearchTermsSection

**Files:**
- Modify: `src/renderer/components/options/SearchTermsSection.tsx`
- Modify: `src/renderer/components/options/KeyValueTable.tsx`
- Modify: `__tests__/components/options/SearchTermsSection.test.tsx`

- [ ] **Step 1: Write test for filter behavior**

Add to `__tests__/components/options/SearchTermsSection.test.tsx`:

```typescript
it('filters keep terms by text input', async () => {
  const config = {
    ...DEFAULT_CONFIG,
    keepTerms: [['720p', '720p'], ['1080p', '1080p'], ['dc', "Director's Cut"]] as Array<[string, string]>,
  };
  const updateConfig = vi.fn();
  render(<SearchTermsSection config={config as ZeebConfig} updateConfig={updateConfig} />);
  const filterInput = screen.getByPlaceholderText('Filter terms...');
  await userEvent.type(filterInput, '720');
  // Only rows containing "720" in match or display should be visible
  expect(screen.getByDisplayValue('720p')).toBeInTheDocument();
  expect(screen.queryByDisplayValue("Director's Cut")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/options/SearchTermsSection.test.tsx`
Expected: FAIL — no filter input.

- [ ] **Step 3: Add filter prop to KeyValueTable**

In `src/renderer/components/options/KeyValueTable.tsx`, add an optional `filter` prop to the interface:

```typescript
interface KeyValueTableProps {
  values: Array<[string, string]>;
  onChange: (values: Array<[string, string]>) => void;
  leftHeader: string;
  rightHeader: string;
  leftPlaceholder?: string;
  rightPlaceholder?: string;
  filter?: string;
}
```

In the component, filter the visible rows but maintain the original indices for editing:

```typescript
export function KeyValueTable({ values, onChange, leftHeader, rightHeader, leftPlaceholder, rightPlaceholder, filter }: KeyValueTableProps): React.JSX.Element {
  // Build list of [originalIndex, pair] for display
  const visibleRows = filter
    ? values.map((pair, i) => [i, pair] as const).filter(([, [m, d]]) => {
        const f = filter.toLowerCase();
        return m.toLowerCase().includes(f) || d.toLowerCase().includes(f);
      })
    : values.map((pair, i) => [i, pair] as const);
```

Update the row rendering to use `originalIndex` from `visibleRows` instead of the map index:

```typescript
  {visibleRows.map(([originalIndex, pair]) => (
    <div key={originalIndex} className="grid grid-cols-[3fr_5fr_32px] gap-1 items-center">
      <input ... value={pair[0]} onChange={(e) => handleCellChange(originalIndex, 0, e.target.value)} />
      <input ... value={pair[1]} onChange={(e) => handleCellChange(originalIndex, 1, e.target.value)} />
      <button ... onClick={() => handleRemove(originalIndex)}>×</button>
    </div>
  ))}
```

- [ ] **Step 4: Add filter input to SearchTermsSection**

In `src/renderer/components/options/SearchTermsSection.tsx`:

```typescript
import React, { useState } from 'react';
```

Add state inside the component:
```typescript
  const [keepFilter, setKeepFilter] = useState('');
```

Add filter input between the heading and the KeyValueTable:
```typescript
        <input
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2"
          placeholder="Filter terms..."
          value={keepFilter}
          onChange={(e) => setKeepFilter(e.target.value)}
        />
        <KeyValueTable
          values={config.keepTerms}
          onChange={(v) => updateConfig({ keepTerms: v })}
          leftHeader="Match"
          rightHeader="Display"
          leftPlaceholder="match term"
          rightPlaceholder="display label"
          filter={keepFilter}
        />
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/options/SearchTermsSection.test.tsx __tests__/components/options/KeyValueTable.test.tsx`
Expected: PASS (both SearchTermsSection and KeyValueTable tests — verify filter doesn't break existing KV tests).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/options/KeyValueTable.tsx src/renderer/components/options/SearchTermsSection.tsx __tests__/components/options/SearchTermsSection.test.tsx
git commit -m "feat: add live filter to keep terms table"
```

---

### Task 6: Add Separate Format Toggles to FormattingSection

**Files:**
- Modify: `src/renderer/components/options/FormattingSection.tsx`
- Modify: `__tests__/components/options/FormattingSection.test.tsx`

**Dependency:** Task 2 must be completed first (adds `separateDvdFormat`, `separatePosterFormat`, `separateUrlFormat`, `formatDvdAka` to ZeebConfig).

- [ ] **Step 1: Replace tests for conditional format inputs**

Delete the existing `renders all 5 format inputs` test (it asserts all 5 are always present, which is no longer true). Replace the test file contents in `__tests__/components/options/FormattingSection.test.tsx` with:

```typescript
it('shows only Standard and AKA inputs when all separate toggles are off', () => {
  const config = { ...DEFAULT_CONFIG, separateDvdFormat: false, separatePosterFormat: false, separateUrlFormat: false };
  render(<FormattingSection config={config as ZeebConfig} updateConfig={vi.fn()} />);
  expect(screen.getByTestId('format-standard-input')).toBeInTheDocument();
  expect(screen.getByTestId('format-aka-input')).toBeInTheDocument();
  expect(screen.queryByTestId('format-dvd-input')).not.toBeInTheDocument();
  expect(screen.queryByTestId('format-dvd-aka-input')).not.toBeInTheDocument();
  expect(screen.queryByTestId('format-poster-input')).not.toBeInTheDocument();
  expect(screen.queryByTestId('format-url-input')).not.toBeInTheDocument();
});

it('shows DVD inputs when separateDvdFormat is on', () => {
  const config = { ...DEFAULT_CONFIG, separateDvdFormat: true };
  render(<FormattingSection config={config as ZeebConfig} updateConfig={vi.fn()} />);
  expect(screen.getByTestId('format-dvd-input')).toBeInTheDocument();
  expect(screen.getByTestId('format-dvd-aka-input')).toBeInTheDocument();
});

it('shows poster input when separatePosterFormat is on', () => {
  const config = { ...DEFAULT_CONFIG, separatePosterFormat: true };
  render(<FormattingSection config={config as ZeebConfig} updateConfig={vi.fn()} />);
  expect(screen.getByTestId('format-poster-input')).toBeInTheDocument();
});

it('shows URL input when separateUrlFormat is on', () => {
  const config = { ...DEFAULT_CONFIG, separateUrlFormat: true };
  render(<FormattingSection config={config as ZeebConfig} updateConfig={vi.fn()} />);
  expect(screen.getByTestId('format-url-input')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/options/FormattingSection.test.tsx`
Expected: FAIL — all 5 inputs always render.

- [ ] **Step 3: Rewrite FormattingSection with conditional inputs**

Replace the `FORMAT_FIELDS` constant and rendering logic in `src/renderer/components/options/FormattingSection.tsx`:

```typescript
type FormatFieldDef = { key: string; label: string; testId: string };

function getVisibleFields(config: ZeebConfig): FormatFieldDef[] {
  const fields: FormatFieldDef[] = [
    { key: 'formatStandard', label: 'Standard Format', testId: 'format-standard-input' },
    { key: 'formatAka', label: 'AKA Format', testId: 'format-aka-input' },
  ];
  if (config.separateDvdFormat) {
    fields.push(
      { key: 'formatDvd', label: 'DVD Folder Format', testId: 'format-dvd-input' },
      { key: 'formatDvdAka', label: 'DVD AKA Format', testId: 'format-dvd-aka-input' },
    );
  }
  if (config.separatePosterFormat) {
    fields.push({ key: 'formatPoster', label: 'Poster Format', testId: 'format-poster-input' });
  }
  if (config.separateUrlFormat) {
    fields.push({ key: 'formatUrl', label: 'URL File Format', testId: 'format-url-input' });
  }
  return fields;
}
```

Update the `FormatKey` type:
```typescript
type FormatKey = 'formatStandard' | 'formatAka' | 'formatDvd' | 'formatDvdAka' | 'formatPoster' | 'formatUrl';
```

Add checkboxes before the format inputs in the JSX:
```typescript
        <div className="space-y-1 mb-3">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={config.separateDvdFormat}
              onChange={(e) => updateConfig({ separateDvdFormat: e.target.checked })} />
            Use separate DVD folder format
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={config.separatePosterFormat}
              onChange={(e) => updateConfig({ separatePosterFormat: e.target.checked })} />
            Use separate poster format
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={config.separateUrlFormat}
              onChange={(e) => updateConfig({ separateUrlFormat: e.target.checked })} />
            Use separate URL file format
          </label>
        </div>
```

Use `getVisibleFields(config)` instead of `FORMAT_FIELDS` in the map:
```typescript
        {getVisibleFields(config).map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
            <input
              ref={(el) => { inputRefs.current[f.key] = el; }}
              data-testid={f.testId}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
              value={(config as Record<string, unknown>)[f.key] as string}
              onChange={(e) => updateConfig({ [f.key]: e.target.value })}
              onFocus={() => setFocusedField(f.key as FormatKey)}
            />
          </div>
        ))}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/options/FormattingSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/options/FormattingSection.tsx __tests__/components/options/FormattingSection.test.tsx
git commit -m "feat: add separate format toggle checkboxes with conditional inputs"
```

---

## Chunk 3: Format Tester via Webview

### Task 7: Create testerStore

**Files:**
- Create: `src/stores/testerStore.ts`
- Create: `__tests__/stores/testerStore.test.ts`

- [ ] **Step 1: Write tests**

Create `__tests__/stores/testerStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useTesterStore } from '../src/stores/testerStore';

describe('testerStore', () => {
  beforeEach(() => {
    useTesterStore.getState().clear();
  });

  it('starts with null request and result', () => {
    const state = useTesterStore.getState();
    expect(state.testerRequest).toBeNull();
    expect(state.testerResult).toBeNull();
    expect(state.testerError).toBeNull();
  });

  it('setRequest sets the request and clears previous results', () => {
    useTesterStore.getState().setRequest('tt0068646');
    const state = useTesterStore.getState();
    expect(state.testerRequest).toEqual({ tt: 'tt0068646' });
    expect(state.testerResult).toBeNull();
    expect(state.testerError).toBeNull();
  });

  it('setResult sets the result', () => {
    const meta = {
      tt: 'tt0068646', title: 'The Godfather', year: 1972,
      rating: 9.2, directors: ['Francis Ford Coppola'], genres: ['Crime'],
      actors: ['Marlon Brando'], duration: 175, mpaa: 'R', aka: [], posterUrl: null,
    };
    useTesterStore.getState().setResult(meta);
    expect(useTesterStore.getState().testerResult).toEqual(meta);
  });

  it('clear resets all fields', () => {
    useTesterStore.getState().setRequest('tt0068646');
    useTesterStore.getState().setError('fail');
    useTesterStore.getState().clear();
    const state = useTesterStore.getState();
    expect(state.testerRequest).toBeNull();
    expect(state.testerResult).toBeNull();
    expect(state.testerError).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/stores/testerStore.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement testerStore**

Create `src/stores/testerStore.ts`:

```typescript
import { create } from 'zustand';
import type { MovieMetadata } from '../types';

interface TesterStoreState {
  testerRequest: { tt: string } | null;
  testerResult: MovieMetadata | null;
  testerError: string | null;

  setRequest: (tt: string) => void;
  setResult: (data: MovieMetadata) => void;
  setError: (msg: string) => void;
  clear: () => void;
}

export const useTesterStore = create<TesterStoreState>((set) => ({
  testerRequest: null,
  testerResult: null,
  testerError: null,

  setRequest(tt: string) {
    set({ testerRequest: { tt }, testerResult: null, testerError: null });
  },

  setResult(data: MovieMetadata) {
    set({ testerResult: data });
  },

  setError(msg: string) {
    set({ testerError: msg });
  },

  clear() {
    set({ testerRequest: null, testerResult: null, testerError: null });
  },
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/stores/testerStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/testerStore.ts __tests__/stores/testerStore.test.ts
git commit -m "feat: create testerStore for Format Tester <-> Renamer communication"
```

---

### Task 8: Rewrite FormatTesterSection to Use testerStore

**Files:**
- Modify: `src/renderer/components/options/FormatTesterSection.tsx`
- Modify: `__tests__/components/options/FormatTesterSection.test.tsx`

- [ ] **Step 1: Write tests**

Rewrite `__tests__/components/options/FormatTesterSection.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormatTesterSection } from '../../../src/renderer/components/options/FormatTesterSection';
import { useTesterStore } from '../../../src/stores/testerStore';
import { DEFAULT_CONFIG } from '../../../src/services/configDefaults';

describe('FormatTesterSection', () => {
  beforeEach(() => {
    useTesterStore.getState().clear();
  });

  it('renders input and Test button', () => {
    render(<FormatTesterSection config={DEFAULT_CONFIG as any} />);
    expect(screen.getByPlaceholderText(/Enter tt#/)).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('sets testerRequest in store on valid tt# submit', async () => {
    render(<FormatTesterSection config={DEFAULT_CONFIG as any} />);
    const input = screen.getByPlaceholderText(/Enter tt#/);
    await userEvent.type(input, 'tt0068646');
    await userEvent.click(screen.getByText('Test'));
    expect(useTesterStore.getState().testerRequest).toEqual({ tt: 'tt0068646' });
  });

  it('shows error for invalid tt# format', async () => {
    render(<FormatTesterSection config={DEFAULT_CONFIG as any} />);
    const input = screen.getByPlaceholderText(/Enter tt#/);
    await userEvent.type(input, 'badid');
    await userEvent.click(screen.getByText('Test'));
    expect(screen.getByText(/expected format/)).toBeInTheDocument();
    expect(useTesterStore.getState().testerRequest).toBeNull();
  });

  it('shows token table when testerResult is populated', () => {
    useTesterStore.getState().setResult({
      tt: 'tt0068646', title: 'The Godfather', year: 1972,
      rating: 9.2, directors: ['Francis Ford Coppola'], genres: ['Crime', 'Drama'],
      actors: ['Marlon Brando'], duration: 175, mpaa: 'R', aka: [], posterUrl: null,
    });
    render(<FormatTesterSection config={DEFAULT_CONFIG as any} />);
    expect(screen.getByText('The Godfather')).toBeInTheDocument();
    expect(screen.getByText('1972')).toBeInTheDocument();
  });

  it('shows error when testerError is set', () => {
    useTesterStore.getState().setError('Could not fetch data for tt9999999');
    render(<FormatTesterSection config={DEFAULT_CONFIG as any} />);
    expect(screen.getByText(/Could not fetch/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/options/FormatTesterSection.test.tsx`
Expected: FAIL — component still uses suggestion API.

- [ ] **Step 3: Rewrite FormatTesterSection**

Replace `src/renderer/components/options/FormatTesterSection.tsx`:

```typescript
import React, { useState, useCallback } from 'react';
import type { ZeebConfig } from '../../../types';
import { interpolateFormat } from '../../../services/formatEngine';
import { useTesterStore } from '../../../stores/testerStore';

interface FormatTesterSectionProps {
  config: ZeebConfig;
}

const TOKEN_LABELS: Array<{ token: string; label: string }> = [
  { token: 'title', label: '<title>' },
  { token: 'year', label: '<year>' },
  { token: 'tt', label: '<imdb>' },
  { token: 'rating', label: '<rating100>' },
  { token: 'rating10', label: '<rating10>' },
  { token: 'directors', label: '<directors>' },
  { token: 'director', label: '<director>' },
  { token: 'genres', label: '<genres>' },
  { token: 'genre', label: '<genre>' },
  { token: 'actors', label: '<stars>' },
  { token: 'star1', label: '<star1>' },
  { token: 'duration', label: '<duration>' },
  { token: 'H', label: '<H>' },
  { token: 'M', label: '<M>' },
  { token: 'mpaa', label: '<mpaa>' },
  { token: 'aka', label: '<aka>' },
];

function getTokenValue(token: string, meta: NonNullable<ReturnType<typeof useTesterStore.getState>['testerResult']>, config: ZeebConfig): string {
  const dur = meta.duration ?? 0;
  switch (token) {
    case 'title': return meta.title;
    case 'year': return meta.year?.toString() ?? '';
    case 'tt': return meta.tt;
    case 'rating': return meta.rating != null ? Math.min(100, Math.round(meta.rating * 10.75)).toString() : '(unavailable)';
    case 'rating10': return meta.rating?.toString() ?? '(unavailable)';
    case 'directors': return meta.directors.join(config.directorSeparator) || '(unavailable)';
    case 'director': return meta.directors[0] ?? '(unavailable)';
    case 'genres': return meta.genres.join(config.genreSeparator) || '(unavailable)';
    case 'genre': return meta.genres[0] ?? '(unavailable)';
    case 'actors': return meta.actors.join(config.starSeparator) || '(unavailable)';
    case 'star1': return meta.actors[0] ?? '(unavailable)';
    case 'duration': return meta.duration?.toString() ?? '(unavailable)';
    case 'H': return Math.floor(dur / 60).toString();
    case 'M': return (dur % 60).toString();
    case 'mpaa': return meta.mpaa ?? '(unavailable)';
    case 'aka': return meta.aka[0] ?? '(unavailable)';
    default: return '';
  }
}

export function FormatTesterSection({ config }: FormatTesterSectionProps): React.JSX.Element {
  const [ttInput, setTtInput] = useState('');
  const [localError, setLocalError] = useState('');

  const testerRequest = useTesterStore((s) => s.testerRequest);
  const testerResult = useTesterStore((s) => s.testerResult);
  const testerError = useTesterStore((s) => s.testerError);
  const setRequest = useTesterStore((s) => s.setRequest);

  const isLoading = testerRequest !== null && testerResult === null && testerError === null;

  const handleTest = useCallback(() => {
    const tt = ttInput.trim();
    if (!tt.match(/^tt\d{5,}$/)) {
      setLocalError(`Could not fetch data for "${tt}" — expected format: tt0068646`);
      return;
    }
    setLocalError('');
    setRequest(tt);
  }, [ttInput, setRequest]);

  const preview = testerResult
    ? interpolateFormat(config.formatStandard, testerResult, {
        saved: '(from current file)',
        directorSeparator: config.directorSeparator,
        genreSeparator: config.genreSeparator,
        starSeparator: config.starSeparator,
        removeThe: config.removeThe,
        swapThe: config.swapThe,
        titleSpaceChar: config.titleSpaceChar,
        mpaaMap: config.mpaaMap,
      })
    : '';

  const errorMsg = localError || testerError;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
          placeholder="Enter tt# (e.g., tt0068646)"
          value={ttInput}
          onChange={(e) => setTtInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTest()}
        />
        <button
          className="px-4 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          onClick={handleTest}
          disabled={isLoading}
        >
          {isLoading ? 'Fetching...' : 'Test'}
        </button>
      </div>

      {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

      {testerResult && (
        <div className="space-y-4">
          <table className="w-full text-sm border border-gray-200 rounded">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Token</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Value</th>
              </tr>
            </thead>
            <tbody>
              {TOKEN_LABELS.map(({ token, label }) => (
                <tr key={token} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 font-mono text-purple-600">{label}</td>
                  <td className="px-3 py-1.5">{getTokenValue(token, testerResult, config)}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-100">
                <td className="px-3 py-1.5 font-mono text-purple-600">{`<saved>`}</td>
                <td className="px-3 py-1.5 text-gray-400">(from current file)</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="px-3 py-1.5 font-mono text-purple-600">{`<original>`}</td>
                <td className="px-3 py-1.5 text-gray-400">{testerResult.tt}</td>
              </tr>
            </tbody>
          </table>

          <div>
            <h4 className="text-xs font-semibold text-gray-600 mb-1">Preview</h4>
            <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm font-mono">
              {preview}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/options/FormatTesterSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/options/FormatTesterSection.tsx __tests__/components/options/FormatTesterSection.test.tsx
git commit -m "feat: rewrite FormatTesterSection to use testerStore"
```

---

### Task 9: Wire Renamer to Handle Tester Requests

**Files:**
- Modify: `src/renderer/components/Renamer.tsx`

- [ ] **Step 1: Add testerStore import**

At top of `src/renderer/components/Renamer.tsx`:
```typescript
import { useTesterStore } from '../../stores/testerStore';
```

- [ ] **Step 2: Update navigationMode type**

Change line 71 from:
```typescript
  const navigationMode = useRef<'title' | 'idle'>('idle');
```
to:
```typescript
  const navigationMode = useRef<'title' | 'idle' | 'tester'>('idle');
```

- [ ] **Step 3: Subscribe to tester requests and add ref**

Add after the config store subscriptions (after line 67):

```typescript
  const testerRequest = useTesterStore((s) => s.testerRequest);
  const setTesterResult = useTesterStore((s) => s.setResult);
  const setTesterError = useTesterStore((s) => s.setError);
```

Add `testerClaimedRef` at the component body level alongside other refs (near line 77):

```typescript
  const testerClaimedRef = useRef(false);
```

Note: `useRef` must be called at component top level (React rules of hooks), not inside a `useEffect`.

- [ ] **Step 4: Add effect to watch testerRequest**

Add a new useEffect after the existing webview effects:

```typescript
  // Handle Format Tester requests — only first Renamer instance responds
  useEffect(() => {
    if (!testerRequest || !webviewEl || instanceId !== 0) return;
    testerClaimedRef.current = true;
    navigationMode.current = 'tester';
    const url = `${config.urlImdbTT}${testerRequest.tt}/`;
    webviewEl.loadURL(url);

    // Timeout after 10 seconds
    const timer = setTimeout(() => {
      if (navigationMode.current === 'tester') {
        setTesterError(`Timed out fetching data for ${testerRequest.tt}`);
        navigationMode.current = 'idle';
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [testerRequest, webviewEl, instanceId, config.urlImdbTT, setTesterError]);
```

- [ ] **Step 5: Update handleIpcMessage to route tester results**

In the `handleIpcMessage` handler (lines 212-230), update the title data handling:

Change:
```typescript
      const titleData = parseTitleData(message);
      if (titleData) {
        setMetadata(titleData);
      }
```

To:
```typescript
      const titleData = parseTitleData(message);
      if (titleData) {
        if (navigationMode.current === 'tester') {
          setTesterResult(titleData);
          navigationMode.current = 'idle';
          // Clear the request so the effect doesn't re-trigger (spec requirement)
          useTesterStore.getState().clear();
        } else {
          setMetadata(titleData);
        }
      }
```

- [ ] **Step 6: Update the useEffect dependency array**

The existing `handleIpcMessage` useEffect (line 241 in Renamer.tsx) has a dependency array:
```typescript
  }, [webviewEl, instanceId, config.extractionPatterns, setMovieMatches, setMetadata]);
```
Add `setTesterResult` to it:
```typescript
  }, [webviewEl, instanceId, config.extractionPatterns, setMovieMatches, setMetadata, setTesterResult]);
```

Also add the `useTesterStore` import used in the `handleIpcMessage` body:
```typescript
import { useTesterStore } from '../../stores/testerStore';
```
(This was already added in Step 1.)

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/renderer/components/Renamer.tsx
git commit -m "feat: wire Renamer to handle tester requests via testerStore"
```

---

### Task 10: Full Test Suite Verification

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (180+ tests).

- [ ] **Step 2: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: Only pre-existing errors (tmdbService mock, forge.config.ts).

- [ ] **Step 3: Fix any new failures**

If any tests fail or new type errors appear, fix them.

- [ ] **Step 4: Commit any fixes**

```bash
git add -u
git commit -m "fix: resolve test/type issues from options fixes"
```
