# Options Modal Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat OptionsModal with a sidebar-navigated settings panel exposing all config from the legacy Flex app, with click-to-insert token reference and a live format tester.

**Architecture:** Full-screen overlay with left sidebar listing 8 sections and a content area on the right. Each section is its own React component. Three reusable components (TagInput, KeyValueTable, BrowseInput) handle repeated UI patterns. The `keepTerms` type changes from `string[]` to `Array<[string, string]>` with migration.

**Tech Stack:** React 19, Zustand 5, Tailwind CSS, Vitest + Testing Library, Electron IPC

**Spec:** `docs/superpowers/specs/2026-03-12-options-modal-design.md`

---

## Chunk 1: Infrastructure

### Task 1: Config Type Changes + Migration

**Files:**
- Modify: `src/types/index.ts:97-159`
- Modify: `src/services/configDefaults.ts`
- Modify: `src/utils/defaultTerms.ts:328-364`
- Modify: `src/stores/configStore.ts:32-46`
- Test: `__tests__/stores/configStore.test.ts`

- [ ] **Step 1: Write failing tests for keepTerms migration**

```typescript
// In __tests__/stores/configStore.test.ts — add new describe block

describe('keepTerms migration', () => {
  it('converts legacy string[] keepTerms to [string, string][] on load', async () => {
    const legacyConfig = {
      keepTerms: ['720p', '1080p', "Director's Cut"],
    };
    const fs = createMockFsAdapter({
      exists: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue(JSON.stringify(legacyConfig)),
    });
    const store = createConfigStore(fs);
    await store.getState().load();
    expect(store.getState().config.keepTerms).toEqual([
      ['720p', '720p'],
      ['1080p', '1080p'],
      ["Director's Cut", "Director's Cut"],
    ]);
  });

  it('preserves already-migrated [string, string][] keepTerms', async () => {
    const migratedConfig = {
      keepTerms: [['720', '720p'], ['dc', "Director's Cut"]],
    };
    const fs = createMockFsAdapter({
      exists: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue(JSON.stringify(migratedConfig)),
    });
    const store = createConfigStore(fs);
    await store.getState().load();
    expect(store.getState().config.keepTerms).toEqual([
      ['720', '720p'],
      ['dc', "Director's Cut"],
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/stores/configStore.test.ts`
Expected: FAIL — keepTerms type mismatch

- [ ] **Step 3: Update ZeebConfig type**

In `src/types/index.ts`, change line 114:

```typescript
// Before:
keepTerms: string[];

// After:
keepTerms: Array<[string, string]>;
```

- [ ] **Step 4: Add new config fields to ZeebConfig**

In `src/types/index.ts`, add after `showWebView: boolean;` (line 139):

```typescript
  includeOriginalInUrl: boolean;
  includeNfoInUrl: boolean;
  deleteNfoAfterInclude: boolean;
  posterInDvdFolder: boolean;
  detectDvd: boolean;
  maxUndos: number;
  theWord: string;
```

- [ ] **Step 5: Update DEFAULT_KEEP_TERMS to pair format**

In `src/utils/defaultTerms.ts`, change `DEFAULT_KEEP_TERMS`:

```typescript
export const DEFAULT_KEEP_TERMS: Array<[string, string]> = [
  ['720p', '720p'],
  ['720', '720p'],
  ['1080p', '1080p'],
  ['1080', '1080p'],
  ['2160p', '2160p'],
  ['2160', '2160p'],
  ['4K', '4K'],
  ['480p', '480p'],
  ['576p', '576p'],
  ["Director's Cut", "Director's Cut"],
  ['dc', "Director's Cut"],
  ['Extended', 'Extended'],
  ['Extended Cut', 'Extended Cut'],
  ['ee', 'Extended Edition'],
  ['Unrated', 'Unrated'],
  ['Uncut', 'Uncut'],
  ['Remastered', 'Remastered'],
  ['Special Edition', 'Special Edition'],
  ['se', 'Special Edition'],
  ['Theatrical', 'Theatrical'],
  ['IMAX', 'IMAX'],
  ['3D', '3D'],
  ['Criterion Collection', 'Criterion Collection'],
  ['cc', 'Criterion Collection'],
  ['Final Cut', 'Final Cut'],
  ['Redux', 'Redux'],
  ['Anniversary Edition', 'Anniversary Edition'],
  ['Restored', 'Restored'],
  ['Definitive Edition', 'Definitive Edition'],
  ['Ultimate Edition', 'Ultimate Edition'],
  ["Collector's Edition", "Collector's Edition"],
  ['Limited Edition', 'Limited Edition'],
  ['Deluxe Edition', 'Deluxe Edition'],
  ['Complete Edition', 'Complete Edition'],
  ['Gold Edition', 'Gold Edition'],
  ['Platinum Edition', 'Platinum Edition'],
  ['Black and Chrome', 'Black and Chrome'],
  ['Snyder Cut', 'Snyder Cut'],
  ['Assembly Cut', 'Assembly Cut'],
  ['Workprint', 'Workprint'],
  ['Open Matte', 'Open Matte'],
  ['Superbit', 'Superbit'],
  ['HDR', 'HDR'],
  ['HDR10', 'HDR'],
  ['HDR10Plus', 'HDR'],
  ['DolbyVision', 'DV'],
  ['DDP5.1', 'DDP5.1'],
  ['DTS-HD.MA', 'DTS-HD MA'],
  ['TrueHD', 'TrueHD'],
  ['Atmos', 'Atmos'],
];
```

- [ ] **Step 6: Update DEFAULT_CONFIG with new fields**

In `src/services/configDefaults.ts`, add after `showWebView: false,`:

```typescript
  includeOriginalInUrl: true,
  includeNfoInUrl: false,
  deleteNfoAfterInclude: false,
  posterInDvdFolder: true,
  detectDvd: true,
  maxUndos: 100,
  theWord: 'The',
```

- [ ] **Step 7: Add migration logic to configStore.load()**

In `src/stores/configStore.ts`, replace the `load()` method:

```typescript
    async load() {
      const path = await getConfigPath();
      const fileExists = await fs.exists(path);
      if (fileExists) {
        const json = await fs.readFile(path, 'utf8');
        try {
          const saved = JSON.parse(json) as Record<string, unknown>;
          // Migrate legacy keepTerms: string[] → Array<[string, string]>
          if (Array.isArray(saved.keepTerms)) {
            saved.keepTerms = (saved.keepTerms as unknown[]).map((t) =>
              Array.isArray(t) ? t : [t, t],
            );
          }
          set({ config: { ...DEFAULT_CONFIG, ...(saved as Partial<ZeebConfig>) } });
        } catch {
          set({ config: { ...DEFAULT_CONFIG } });
        }
      } else {
        set({ config: { ...DEFAULT_CONFIG } });
      }
    },
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run __tests__/stores/configStore.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/types/index.ts src/services/configDefaults.ts src/utils/defaultTerms.ts src/stores/configStore.ts __tests__/stores/configStore.test.ts
git commit -m "feat: add new config fields, change keepTerms to match/display pairs with migration"
```

### Task 2: Update Downstream keepTerms Consumers

**Files:**
- Modify: `src/services/filenameParser.ts`
- Modify: `src/renderer/components/Renamer.tsx:259-261`
- Modify: `src/services/legacyImporter.ts:50-55,92-96`
- Test: `__tests__/services/filenameParser.test.ts`

- [ ] **Step 1: Write failing test for filenameParser with pair keepTerms**

```typescript
// Add to __tests__/services/filenameParser.test.ts

it('uses match token from keepTerms pairs for matching', () => {
  const result = parseFilename(
    'Movie.720p.BluRay.mkv',
    ['BluRay'],
    [['720', '720p'], ['dc', "Director's Cut"]],
  );
  const kept = result.find(p => p.state === 'keep');
  expect(kept).toBeDefined();
  expect(kept!.text).toBe('720p'); // display label replaces raw token
});

it('matches multi-word keep term pairs', () => {
  const result = parseFilename(
    'Movie.Directors.Cut.1080p.mkv',
    [],
    [["Director's Cut", "Director's Cut"], ['1080', '1080p']],
  );
  // "Directors Cut" won't match "Director's Cut" with apostrophe — that's expected
  const kept1080 = result.find(p => p.state === 'keep');
  expect(kept1080).toBeDefined();
  expect(kept1080!.text).toBe('1080p');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/services/filenameParser.test.ts`
Expected: FAIL — type mismatch on keepTerms

- [ ] **Step 3: Update filenameParser to accept pair format**

Replace `src/services/filenameParser.ts`:

```typescript
import type { SearchPart } from '../types';

export function parseFilename(
  filename: string,
  removeTerms: string[],
  keepTerms: Array<[string, string]>,
): SearchPart[] {
  if (!filename) return [];

  // 1. Strip file extension (last .xxx where xxx is 2-4 chars)
  const stripped = filename.replace(/\.[a-zA-Z0-9]{2,4}$/, '');

  // 2. Split by dots, spaces, underscores, and dashes
  const tokens = stripped.split(/[.\s_-]+/).filter(Boolean);

  if (tokens.length === 0) return [];

  // Normalize term lists for case-insensitive comparison
  const removeLower = removeTerms.map(t => t.toLowerCase());
  // Build match→display map from keepTerms pairs
  const keepMap = new Map<string, string>();
  for (const [match, display] of keepTerms) {
    keepMap.set(match.toLowerCase(), display);
  }

  // 3. Check for multi-word keep terms by joining adjacent tokens
  const parts: SearchPart[] = [];
  let i = 0;
  let idCounter = 0;

  while (i < tokens.length) {
    let matched = false;

    // Try matching multi-word keep terms (longest first)
    for (const [match, display] of keepTerms) {
      const termWords = match.split(/\s+/);
      if (termWords.length <= 1) continue;

      const slice = tokens.slice(i, i + termWords.length);
      if (slice.length < termWords.length) continue;

      const sliceJoined = slice.join(' ').toLowerCase();
      if (sliceJoined === match.toLowerCase()) {
        parts.push({
          id: String(idCounter++),
          text: display,
          originalText: match,
          state: 'keep',
          editable: true,
        });
        i += termWords.length;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    const token = tokens[i];
    const tokenLower = token.toLowerCase();

    // 4. Classify token
    let state: SearchPart['state'] = 'search';
    let text = token;

    if (removeLower.includes(tokenLower)) {
      state = 'remove';
    } else if (keepMap.has(tokenLower)) {
      state = 'keep';
      text = keepMap.get(tokenLower)!;
    }

    // Detect 4-digit year candidates — mark tentatively, resolve after loop
    if (/^\d{4}$/.test(token)) {
      const num = parseInt(token, 10);
      if (num > 1900 && num <= new Date().getFullYear() + 1) {
        state = 'remove';
      }
    }

    parts.push({
      id: String(idCounter++),
      text,
      originalText: token,
      state,
      editable: true,
    });

    i++;
  }

  // Only treat the LAST year-like 'remove' part as the actual year.
  const yearIndices = parts
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => p.state === 'remove' && /^\d{4}$/.test(p.originalText) && parseInt(p.originalText, 10) > 1900)
    .map(({ idx }) => idx);

  if (yearIndices.length > 1) {
    for (const idx of yearIndices.slice(0, -1)) {
      parts[idx].state = 'search';
    }
  }

  return parts;
}
```

- [ ] **Step 4: Update Renamer.tsx keepAlways action**

In `src/renderer/components/Renamer.tsx`, around line 259-261, change the keepAlways branch:

```typescript
// Before:
if (!config.keepTerms.some((t) => t.toLowerCase() === term)) {
  updateConfig({ keepTerms: [...config.keepTerms, part.text] });
  void saveConfig();
}

// After:
if (!config.keepTerms.some(([m]) => m.toLowerCase() === term)) {
  updateConfig({ keepTerms: [...config.keepTerms, [part.text, part.text]] });
  void saveConfig();
}
```

- [ ] **Step 5: Update existing filenameParser tests to use pair format**

In `__tests__/services/filenameParser.test.ts`, update all existing test calls that pass `keepTerms` as `string[]` to use `Array<[string, string]>`. For each existing `keepTerms` argument like `['720p', "Director's Cut"]`, change to `[['720p', '720p'], ["Director's Cut", "Director's Cut"]]`.

- [ ] **Step 6: Update legacyImporter.ts**

In `src/services/legacyImporter.ts`, three changes are needed:

**6a. Update `detectCustomizations` (lines 44-45):**

```typescript
// Before:
const defaultRemoveSet = new Set(DEFAULT_REMOVE_TERMS.map(t => t.toLowerCase()));
const defaultKeepSet = new Set(DEFAULT_KEEP_TERMS.map(t => t.toLowerCase()));

// After:
const defaultRemoveSet = new Set(DEFAULT_REMOVE_TERMS.map(t => t.toLowerCase()));
const defaultKeepSet = new Set(DEFAULT_KEEP_TERMS.map(([m]) => m.toLowerCase()));
```

**6b. Update `migrateLegacyConfig` keepTerms block (lines 92-97):**

```typescript
// Before:
if (parsed.keepTerms) {
  const legacyTerms = parsed.keepTerms.split(',').map(t => t.trim()).filter(Boolean);
  const defaultSet = new Set(DEFAULT_KEEP_TERMS.map(t => t.toLowerCase()));
  const customTerms = legacyTerms.filter(t => !defaultSet.has(t.toLowerCase()));
  config.keepTerms = [...DEFAULT_KEEP_TERMS, ...customTerms];
}

// After:
if (parsed.keepTerms) {
  const legacyTerms = parsed.keepTerms.split(',').map(t => t.trim()).filter(Boolean);
  const defaultSet = new Set(DEFAULT_KEEP_TERMS.map(([m]) => m.toLowerCase()));
  const customTerms: Array<[string, string]> = legacyTerms
    .filter(t => !defaultSet.has(t.toLowerCase()))
    .map(t => [t, t] as [string, string]);
  config.keepTerms = [...DEFAULT_KEEP_TERMS, ...customTerms];
}
```

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add src/services/filenameParser.ts src/renderer/components/Renamer.tsx src/services/legacyImporter.ts __tests__/services/filenameParser.test.ts
git commit -m "refactor: update filenameParser and Renamer for keepTerms match/display pairs"
```

### Task 3: IPC dialog:openFile Handler + Bridge

**Files:**
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/main.ts`
- Test: `__tests__/main/ipc.test.ts` (if exists, otherwise `__tests__/preload/main.test.ts`)

- [ ] **Step 1: Add dialog:openFile IPC handler**

In `src/main/ipc.ts`, after the `dialog:openDirectory` handler (line 51):

```typescript
  ipcMain.handle('dialog:openFile', async (_event) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
```

- [ ] **Step 2: Add openFile bridge in preload**

In `src/preload/main.ts`, update the `zeebDialog` bridge (line 13-15):

```typescript
contextBridge.exposeInMainWorld('zeebDialog', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
});
```

- [ ] **Step 3: Update electron.d.ts type declarations**

In `src/types/electron.d.ts`, add `openFile` to the `zeebDialog` interface (line 27):

```typescript
// Before:
zeebDialog: {
  openDirectory(): Promise<string | null>;
};

// After:
zeebDialog: {
  openDirectory(): Promise<string | null>;
  openFile(): Promise<string | null>;
};
```

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc.ts src/preload/main.ts src/types/electron.d.ts
git commit -m "feat: add dialog:openFile IPC handler and preload bridge"
```

### Task 4: TagInput Reusable Component

**Files:**
- Create: `src/renderer/components/options/TagInput.tsx`
- Test: `__tests__/components/options/TagInput.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/components/options/TagInput.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { TagInput } from '../../../src/renderer/components/options/TagInput';

describe('TagInput', () => {
  it('renders each value as a pill', () => {
    render(<TagInput values={['mkv', 'avi', 'mp4']} onChange={vi.fn()} placeholder="Add..." />);
    expect(screen.getByText('mkv')).toBeDefined();
    expect(screen.getByText('avi')).toBeDefined();
    expect(screen.getByText('mp4')).toBeDefined();
  });

  it('adds a tag on Enter', () => {
    const onChange = vi.fn();
    render(<TagInput values={['mkv']} onChange={onChange} placeholder="Add..." />);
    const input = screen.getByPlaceholderText('Add...');
    fireEvent.change(input, { target: { value: 'webm' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['mkv', 'webm']);
  });

  it('adds a tag on comma', () => {
    const onChange = vi.fn();
    render(<TagInput values={['mkv']} onChange={onChange} placeholder="Add..." />);
    const input = screen.getByPlaceholderText('Add...');
    fireEvent.change(input, { target: { value: 'webm,' } });
    fireEvent.keyDown(input, { key: ',' });
    expect(onChange).toHaveBeenCalledWith(['mkv', 'webm']);
  });

  it('removes a tag when x clicked', () => {
    const onChange = vi.fn();
    render(<TagInput values={['mkv', 'avi']} onChange={onChange} placeholder="Add..." />);
    const removeButtons = screen.getAllByTestId('tag-remove');
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith(['avi']);
  });

  it('does not add duplicate tags', () => {
    const onChange = vi.fn();
    render(<TagInput values={['mkv']} onChange={onChange} placeholder="Add..." />);
    const input = screen.getByPlaceholderText('Add...');
    fireEvent.change(input, { target: { value: 'mkv' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/options/TagInput.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement TagInput**

```tsx
// src/renderer/components/options/TagInput.tsx
import React, { useState, useCallback } from 'react';

interface TagInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

export function TagInput({ values, onChange, placeholder }: TagInputProps): React.JSX.Element {
  const [input, setInput] = useState('');

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.replace(/,/g, '').trim();
      if (tag && !values.includes(tag)) {
        onChange([...values, tag]);
      }
      setInput('');
    },
    [values, onChange],
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(values.filter((_, i) => i !== index));
    },
    [values, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag(input);
      }
    },
    [input, addTag],
  );

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded bg-white min-h-[38px]">
      {values.map((v, i) => (
        <span
          key={`${v}-${i}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-sm"
        >
          {v}
          <button
            data-testid="tag-remove"
            className="text-blue-500 hover:text-blue-700 font-bold leading-none"
            onClick={() => removeTag(i)}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[80px] outline-none text-sm"
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/options/TagInput.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/options/TagInput.tsx __tests__/components/options/TagInput.test.tsx
git commit -m "feat: add TagInput reusable pill/tag component"
```

### Task 5: KeyValueTable Reusable Component

**Files:**
- Create: `src/renderer/components/options/KeyValueTable.tsx`
- Test: `__tests__/components/options/KeyValueTable.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/components/options/KeyValueTable.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { KeyValueTable } from '../../../src/renderer/components/options/KeyValueTable';

describe('KeyValueTable', () => {
  const defaults = {
    leftHeader: 'Match',
    rightHeader: 'Display',
    leftPlaceholder: 'match term',
    rightPlaceholder: 'display label',
  };

  it('renders rows for each pair', () => {
    render(
      <KeyValueTable
        values={[['720', '720p'], ['dc', "Director's Cut"]]}
        onChange={vi.fn()}
        {...defaults}
      />,
    );
    const inputs = screen.getAllByRole('textbox');
    // 2 rows × 2 inputs = 4, plus no add-row inputs
    expect(inputs).toHaveLength(4);
    expect((inputs[0] as HTMLInputElement).value).toBe('720');
    expect((inputs[1] as HTMLInputElement).value).toBe('720p');
  });

  it('calls onChange when a cell is edited', () => {
    const onChange = vi.fn();
    render(
      <KeyValueTable
        values={[['720', '720p']]}
        onChange={onChange}
        {...defaults}
      />,
    );
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[1], { target: { value: '720P HD' } });
    expect(onChange).toHaveBeenCalledWith([['720', '720P HD']]);
  });

  it('removes a row when × clicked', () => {
    const onChange = vi.fn();
    render(
      <KeyValueTable
        values={[['720', '720p'], ['dc', "Director's Cut"]]}
        onChange={onChange}
        {...defaults}
      />,
    );
    const removeButtons = screen.getAllByTestId('kv-remove');
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith([['dc', "Director's Cut"]]);
  });

  it('adds a blank row when Add clicked', () => {
    const onChange = vi.fn();
    render(
      <KeyValueTable
        values={[['720', '720p']]}
        onChange={onChange}
        {...defaults}
      />,
    );
    fireEvent.click(screen.getByTestId('kv-add'));
    expect(onChange).toHaveBeenCalledWith([['720', '720p'], ['', '']]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/options/KeyValueTable.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement KeyValueTable**

```tsx
// src/renderer/components/options/KeyValueTable.tsx
import React, { useCallback } from 'react';

interface KeyValueTableProps {
  values: Array<[string, string]>;
  onChange: (values: Array<[string, string]>) => void;
  leftHeader: string;
  rightHeader: string;
  leftPlaceholder: string;
  rightPlaceholder: string;
}

export function KeyValueTable({
  values,
  onChange,
  leftHeader,
  rightHeader,
  leftPlaceholder,
  rightPlaceholder,
}: KeyValueTableProps): React.JSX.Element {
  const handleCellChange = useCallback(
    (rowIndex: number, colIndex: 0 | 1, value: string) => {
      const updated = values.map((row, i) => {
        if (i !== rowIndex) return row;
        const copy: [string, string] = [...row];
        copy[colIndex] = value;
        return copy;
      });
      onChange(updated);
    },
    [values, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(values.filter((_, i) => i !== index));
    },
    [values, onChange],
  );

  const handleAdd = useCallback(() => {
    onChange([...values, ['', '']]);
  }, [values, onChange]);

  return (
    <div className="border border-gray-300 rounded overflow-hidden">
      <div className="grid grid-cols-[3fr_5fr_32px] bg-gray-100 text-xs font-semibold text-gray-600">
        <div className="px-2 py-1.5 border-r border-gray-200">{leftHeader}</div>
        <div className="px-2 py-1.5 border-r border-gray-200">{rightHeader}</div>
        <div />
      </div>
      {values.map(([left, right], i) => (
        <div key={i} className="grid grid-cols-[3fr_5fr_32px] border-t border-gray-200">
          <input
            className="px-2 py-1 text-sm border-r border-gray-200 outline-none"
            placeholder={leftPlaceholder}
            value={left}
            onChange={(e) => handleCellChange(i, 0, e.target.value)}
          />
          <input
            className="px-2 py-1 text-sm border-r border-gray-200 outline-none"
            placeholder={rightPlaceholder}
            value={right}
            onChange={(e) => handleCellChange(i, 1, e.target.value)}
          />
          <button
            data-testid="kv-remove"
            className="text-red-400 hover:text-red-600 text-sm font-bold"
            onClick={() => handleRemove(i)}
          >
            ×
          </button>
        </div>
      ))}
      <div className="border-t border-gray-200 p-1.5">
        <button
          data-testid="kv-add"
          className="text-sm text-blue-500 hover:text-blue-700"
          onClick={handleAdd}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/options/KeyValueTable.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/options/KeyValueTable.tsx __tests__/components/options/KeyValueTable.test.tsx
git commit -m "feat: add KeyValueTable reusable two-column editable table"
```

### Task 6: BrowseInput Reusable Component

**Files:**
- Create: `src/renderer/components/options/BrowseInput.tsx`
- Test: `__tests__/components/options/BrowseInput.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/components/options/BrowseInput.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { BrowseInput } from '../../../src/renderer/components/options/BrowseInput';

describe('BrowseInput', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'zeebDialog', {
      value: {
        openDirectory: vi.fn().mockResolvedValue('/selected/dir'),
        openFile: vi.fn().mockResolvedValue('/selected/file.log'),
      },
      writable: true,
    });
  });

  it('renders text input with current value', () => {
    render(<BrowseInput value="/some/path" onChange={vi.fn()} placeholder="path" mode="directory" />);
    expect((screen.getByPlaceholderText('path') as HTMLInputElement).value).toBe('/some/path');
  });

  it('calls onChange when text input changes', () => {
    const onChange = vi.fn();
    render(<BrowseInput value="" onChange={onChange} placeholder="path" mode="directory" />);
    fireEvent.change(screen.getByPlaceholderText('path'), { target: { value: '/new/path' } });
    expect(onChange).toHaveBeenCalledWith('/new/path');
  });

  it('calls openDirectory when Browse clicked in directory mode', async () => {
    const onChange = vi.fn();
    render(<BrowseInput value="" onChange={onChange} placeholder="path" mode="directory" />);
    fireEvent.click(screen.getByText('Browse'));
    // Await microtask for async dialog resolution
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('/selected/dir');
    });
  });

  it('calls openFile when Browse clicked in file mode', async () => {
    const onChange = vi.fn();
    render(<BrowseInput value="" onChange={onChange} placeholder="path" mode="file" />);
    fireEvent.click(screen.getByText('Browse'));
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('/selected/file.log');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/options/BrowseInput.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement BrowseInput**

```tsx
// src/renderer/components/options/BrowseInput.tsx
import React, { useCallback } from 'react';

interface BrowseInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  mode: 'file' | 'directory';
}

export function BrowseInput({ value, onChange, placeholder, mode }: BrowseInputProps): React.JSX.Element {
  const handleBrowse = useCallback(async () => {
    const result = mode === 'directory'
      ? await window.zeebDialog.openDirectory()
      : await window.zeebDialog.openFile();
    if (result) {
      onChange(result);
    }
  }, [mode, onChange]);

  return (
    <div className="flex gap-2">
      <input
        className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm"
        onClick={handleBrowse}
      >
        Browse
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/options/BrowseInput.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/options/BrowseInput.tsx __tests__/components/options/BrowseInput.test.tsx
git commit -m "feat: add BrowseInput component with native file/directory picker"
```

## Chunk 2: OptionsModal Shell + Section Components

### Task 7: OptionsModal Shell (Sidebar + Content Router)

**Files:**
- Rewrite: `src/renderer/components/OptionsModal.tsx`
- Test: `__tests__/components/OptionsModal.test.tsx`

- [ ] **Step 1: Write failing tests for the new shell**

Replace `__tests__/components/OptionsModal.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { OptionsModal } from '../../src/renderer/components/OptionsModal';
import { createMockFsAdapter } from '../../src/adapters/fs';
import { initConfigStore } from '../../src/stores/configStore';

const mockFs = createMockFsAdapter();

describe('OptionsModal', () => {
  beforeEach(() => {
    initConfigStore(mockFs);
  });

  it('renders nothing when not visible', () => {
    const { container } = render(<OptionsModal visible={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders sidebar with all section names', () => {
    render(<OptionsModal visible={true} onClose={vi.fn()} />);
    expect(screen.getByText('Formatting')).toBeDefined();
    expect(screen.getByText('General')).toBeDefined();
    expect(screen.getByText('File Types')).toBeDefined();
    expect(screen.getByText('Search Terms')).toBeDefined();
    expect(screen.getByText('Companions')).toBeDefined();
    expect(screen.getByText('Logging')).toBeDefined();
    expect(screen.getByText('IMDB')).toBeDefined();
    expect(screen.getByText('Format Tester')).toBeDefined();
  });

  it('shows Formatting section by default', () => {
    render(<OptionsModal visible={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('section-formatting')).toBeDefined();
  });

  it('switches section when sidebar item clicked', () => {
    render(<OptionsModal visible={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('General'));
    expect(screen.getByTestId('section-general')).toBeDefined();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<OptionsModal visible={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-options'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/OptionsModal.test.tsx`
Expected: FAIL

- [ ] **Step 3: Rewrite OptionsModal**

```tsx
// src/renderer/components/OptionsModal.tsx
import React, { useState } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { FormattingSection } from './options/FormattingSection';
import { GeneralSection } from './options/GeneralSection';
import { FileTypesSection } from './options/FileTypesSection';
import { SearchTermsSection } from './options/SearchTermsSection';
import { CompanionsSection } from './options/CompanionsSection';
import { LoggingSection } from './options/LoggingSection';
import { ImdbSection } from './options/ImdbSection';
import { FormatTesterSection } from './options/FormatTesterSection';

const SECTIONS = [
  { id: 'formatting', label: 'Formatting' },
  { id: 'general', label: 'General' },
  { id: 'file-types', label: 'File Types' },
  { id: 'search-terms', label: 'Search Terms' },
  { id: 'companions', label: 'Companions' },
  { id: 'logging', label: 'Logging' },
  { id: 'imdb', label: 'IMDB' },
  { id: 'format-tester', label: 'Format Tester' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

interface OptionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OptionsModal({ visible, onClose }: OptionsModalProps): React.JSX.Element | null {
  const [activeSection, setActiveSection] = useState<SectionId>('formatting');
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" data-testid="options-modal">
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-bold">Options</h2>
        <button data-testid="close-options" className="text-blue-500 hover:text-blue-700" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex flex-1 min-h-0">
        <nav className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`w-full text-left px-4 py-2.5 text-sm ${
                activeSection === s.id
                  ? 'bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-500'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'formatting' && (
            <div data-testid="section-formatting">
              <FormattingSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'general' && (
            <div data-testid="section-general">
              <GeneralSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'file-types' && (
            <div data-testid="section-file-types">
              <FileTypesSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'search-terms' && (
            <div data-testid="section-search-terms">
              <SearchTermsSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'companions' && (
            <div data-testid="section-companions">
              <CompanionsSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'logging' && (
            <div data-testid="section-logging">
              <LoggingSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'imdb' && (
            <div data-testid="section-imdb">
              <ImdbSection config={config} updateConfig={updateConfig} />
            </div>
          )}
          {activeSection === 'format-tester' && (
            <div data-testid="section-format-tester">
              <FormatTesterSection config={config} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create stub section components**

Create each section file as a minimal stub so the shell compiles and tests pass. Each stub follows this pattern:

```tsx
// src/renderer/components/options/FormattingSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';

interface FormattingSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function FormattingSection({ config, updateConfig }: FormattingSectionProps): React.JSX.Element {
  return <div>Formatting placeholder</div>;
}
```

Create identical stubs for: `GeneralSection`, `FileTypesSection`, `SearchTermsSection`, `CompanionsSection`, `LoggingSection`, `ImdbSection`.

`FormatTesterSection` takes only `config`:

```tsx
// src/renderer/components/options/FormatTesterSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';

interface FormatTesterSectionProps {
  config: ZeebConfig;
}

export function FormatTesterSection({ config }: FormatTesterSectionProps): React.JSX.Element {
  return <div>Format Tester placeholder</div>;
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run __tests__/components/OptionsModal.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/OptionsModal.tsx src/renderer/components/options/ __tests__/components/OptionsModal.test.tsx
git commit -m "feat: rewrite OptionsModal with sidebar navigation and section stubs"
```

### Task 8: FormattingSection (Format Inputs + Token Reference)

**Files:**
- Modify: `src/renderer/components/options/FormattingSection.tsx`
- Test: `__tests__/components/options/FormattingSection.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/components/options/FormattingSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { FormattingSection } from '../../../src/renderer/components/options/FormattingSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('FormattingSection', () => {
  it('renders all 5 format inputs', () => {
    render(<FormattingSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('format-standard-input')).toBeDefined();
    expect(screen.getByTestId('format-aka-input')).toBeDefined();
    expect(screen.getByTestId('format-dvd-input')).toBeDefined();
    expect(screen.getByTestId('format-poster-input')).toBeDefined();
    expect(screen.getByTestId('format-url-input')).toBeDefined();
  });

  it('renders token reference panel', () => {
    render(<FormattingSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByText('Available Tokens')).toBeDefined();
    expect(screen.getByText('<title>')).toBeDefined();
    expect(screen.getByText('<year>')).toBeDefined();
  });

  it('updates config when format input changes', () => {
    const updateConfig = vi.fn();
    render(<FormattingSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    fireEvent.change(screen.getByTestId('format-standard-input'), {
      target: { value: '<title> (<year>)' },
    });
    expect(updateConfig).toHaveBeenCalledWith({ formatStandard: '<title> (<year>)' });
  });

  it('inserts token at cursor when token clicked after input focused', () => {
    const updateConfig = vi.fn();
    render(<FormattingSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    const input = screen.getByTestId('format-standard-input') as HTMLInputElement;
    fireEvent.focus(input);
    // Set cursor position to end
    input.selectionStart = input.value.length;
    input.selectionEnd = input.value.length;
    fireEvent.click(screen.getByTestId('token-title'));
    expect(updateConfig).toHaveBeenCalled();
    const call = updateConfig.mock.calls[0][0];
    expect(call.formatStandard).toContain('<title>');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/options/FormattingSection.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement FormattingSection**

```tsx
// src/renderer/components/options/FormattingSection.tsx
import React, { useCallback, useRef, useState } from 'react';
import type { ZeebConfig } from '../../../types';

interface FormattingSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

const FORMAT_FIELDS = [
  { key: 'formatStandard', label: 'Standard Format', testId: 'format-standard-input' },
  { key: 'formatAka', label: 'AKA Format', testId: 'format-aka-input' },
  { key: 'formatDvd', label: 'DVD Folder Format', testId: 'format-dvd-input' },
  { key: 'formatPoster', label: 'Poster Format', testId: 'format-poster-input' },
  { key: 'formatUrl', label: 'URL File Format', testId: 'format-url-input' },
] as const;

const TOKENS = [
  { token: '<title>', short: '<t>', desc: 'Movie title', testId: 'token-title' },
  { token: '<year>', short: '<y>', desc: 'Release year', testId: 'token-year' },
  { token: '<imdb>', short: '<tt>', desc: 'IMDB tt number', testId: 'token-imdb' },
  { token: '<rating100>', short: '<r100>', desc: 'Rating 0\u2013100', testId: 'token-rating100' },
  { token: '<rating10>', short: '<r10>', desc: 'Rating 0\u201310', testId: 'token-rating10' },
  { token: '<saved>', short: '<s>', desc: 'Saved/kept parts', testId: 'token-saved' },
  { token: '<aka>', short: '<a>', desc: 'Also Known As', testId: 'token-aka' },
  { token: '<directors>', short: '<d>', desc: 'All directors', testId: 'token-directors' },
  { token: '<director>', short: '<d1>', desc: 'First director', testId: 'token-director' },
  { token: '<genres>', short: '<g>', desc: 'All genres', testId: 'token-genres' },
  { token: '<genre>', short: '<g1>', desc: 'First genre', testId: 'token-genre' },
  { token: '<stars>', short: '', desc: 'All stars', testId: 'token-stars' },
  { token: '<star1>', short: '', desc: 'First star', testId: 'token-star1' },
  { token: '<stars2>', short: '', desc: 'First 2 stars', testId: 'token-stars2' },
  { token: '<stars3>', short: '', desc: 'First 3 stars', testId: 'token-stars3' },
  { token: '<mpaa>', short: '<c>', desc: 'MPAA rating', testId: 'token-mpaa' },
  { token: '<duration>', short: '', desc: 'Duration (min)', testId: 'token-duration' },
  { token: '<H>', short: '', desc: 'Hours', testId: 'token-h' },
  { token: '<M>', short: '', desc: 'Minutes', testId: 'token-m' },
  { token: '<original>', short: '<o>', desc: 'Original filename', testId: 'token-original' },
] as const;

type FormatKey = (typeof FORMAT_FIELDS)[number]['key'];

export function FormattingSection({ config, updateConfig }: FormattingSectionProps): React.JSX.Element {
  const [focusedField, setFocusedField] = useState<FormatKey | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleTokenClick = useCallback(
    (token: string) => {
      if (!focusedField) return;
      const input = inputRefs.current[focusedField];
      if (!input) return;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      const current = config[focusedField] as string;
      const newValue = current.slice(0, start) + token + current.slice(end);
      updateConfig({ [focusedField]: newValue });
      // Restore cursor after React re-render
      requestAnimationFrame(() => {
        input.focus();
        const pos = start + token.length;
        input.setSelectionRange(pos, pos);
      });
    },
    [focusedField, config, updateConfig],
  );

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-3">
        <p className="text-xs text-gray-500 mb-3">
          Use <code>/</code> in format strings to create subfolders.
        </p>
        {FORMAT_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
            <input
              ref={(el) => { inputRefs.current[f.key] = el; }}
              data-testid={f.testId}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
              value={config[f.key] as string}
              onChange={(e) => updateConfig({ [f.key]: e.target.value })}
              onFocus={() => setFocusedField(f.key)}
            />
          </div>
        ))}
      </div>
      <div className="w-56 flex-shrink-0 bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="text-xs font-bold text-gray-700 mb-2">Available Tokens</div>
        <div className="space-y-0.5">
          {TOKENS.map((t) => (
            <button
              key={t.token}
              data-testid={t.testId}
              className={`w-full text-left flex justify-between items-center px-1.5 py-0.5 rounded text-xs hover:bg-blue-50 ${
                focusedField ? 'cursor-pointer' : 'opacity-50 cursor-default'
              }`}
              onClick={() => handleTokenClick(t.token)}
            >
              <code className="text-purple-600">{t.token}</code>
              <span className="text-gray-500 text-[10px] ml-2">{t.desc}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-gray-400">
          {focusedField ? 'Click to insert at cursor' : 'Focus an input first'}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run __tests__/components/options/FormattingSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/options/FormattingSection.tsx __tests__/components/options/FormattingSection.test.tsx
git commit -m "feat: implement FormattingSection with click-to-insert token reference"
```

### Task 9: GeneralSection

**Files:**
- Modify: `src/renderer/components/options/GeneralSection.tsx`
- Test: `__tests__/components/options/GeneralSection.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/components/options/GeneralSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { GeneralSection } from '../../../src/renderer/components/options/GeneralSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('GeneralSection', () => {
  it('renders removeThe checkbox', () => {
    render(<GeneralSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('remove-the')).toBeDefined();
  });

  it('toggles removeThe', () => {
    const updateConfig = vi.fn();
    render(<GeneralSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    fireEvent.click(screen.getByTestId('remove-the'));
    expect(updateConfig).toHaveBeenCalledWith({ removeThe: true });
  });

  it('renders separator inputs', () => {
    render(<GeneralSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('saved-part-separator')).toBeDefined();
    expect(screen.getByTestId('director-separator')).toBeDefined();
  });

  it('renders theWord input', () => {
    render(<GeneralSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('the-word-input')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/options/GeneralSection.test.tsx`
Expected: FAIL — stub component has no test IDs

- [ ] **Step 3: Implement GeneralSection**

```tsx
// src/renderer/components/options/GeneralSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';

interface GeneralSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function GeneralSection({ config, updateConfig }: GeneralSectionProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">Title Handling</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              data-testid="remove-the"
              type="checkbox"
              checked={config.removeThe}
              onChange={(e) => updateConfig({ removeThe: e.target.checked })}
            />
            <span className="text-sm">Remove &quot;The&quot; from beginning</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              data-testid="swap-the"
              type="checkbox"
              checked={config.swapThe}
              onChange={(e) => updateConfig({ swapThe: e.target.checked })}
            />
            <span className="text-sm">Swap &quot;The&quot; to end after comma</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-40">Custom &quot;The&quot; word:</label>
            <input
              data-testid="the-word-input"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
              value={config.theWord}
              onChange={(e) => updateConfig({ theWord: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-40">Replace title spaces with:</label>
            <input
              data-testid="title-space-char"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
              value={config.titleSpaceChar}
              onChange={(e) => updateConfig({ titleSpaceChar: e.target.value })}
              placeholder="(blank = keep spaces)"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">Separators</h3>
        <div className="space-y-2">
          {[
            { key: 'savedPartSeparator', label: 'Saved parts separator', testId: 'saved-part-separator' },
            { key: 'directorSeparator', label: 'Director separator', testId: 'director-separator' },
            { key: 'genreSeparator', label: 'Genre separator', testId: 'genre-separator' },
            { key: 'starSeparator', label: 'Star separator', testId: 'star-separator' },
          ].map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-40">{s.label}:</label>
              <input
                data-testid={s.testId}
                className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
                value={config[s.key as keyof ZeebConfig] as string}
                onChange={(e) => updateConfig({ [s.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">Behavior</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              data-testid="rename-folder"
              type="checkbox"
              checked={config.renameFolder}
              onChange={(e) => updateConfig({ renameFolder: e.target.checked })}
            />
            <span className="text-sm">Rename parent folder</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              data-testid="detect-dvd"
              type="checkbox"
              checked={config.detectDvd}
              onChange={(e) => updateConfig({ detectDvd: e.target.checked })}
            />
            <span className="text-sm">Detect DVD/BluRay folders</span>
          </label>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run __tests__/components/options/GeneralSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/options/GeneralSection.tsx __tests__/components/options/GeneralSection.test.tsx
git commit -m "feat: implement GeneralSection with title handling, separators, behavior"
```

### Task 10: FileTypesSection

**Files:**
- Modify: `src/renderer/components/options/FileTypesSection.tsx`
- Test: `__tests__/components/options/FileTypesSection.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/components/options/FileTypesSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FileTypesSection } from '../../../src/renderer/components/options/FileTypesSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('FileTypesSection', () => {
  it('renders movie extensions as tags', () => {
    render(<FileTypesSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByText('mkv')).toBeDefined();
    expect(screen.getByText('avi')).toBeDefined();
  });

  it('renders subtitle extensions as tags', () => {
    render(<FileTypesSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByText('srt')).toBeDefined();
    expect(screen.getByText('sub')).toBeDefined();
  });
});
```

- [ ] **Step 2: Implement FileTypesSection**

```tsx
// src/renderer/components/options/FileTypesSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';
import { TagInput } from './TagInput';

interface FileTypesSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function FileTypesSection({ config, updateConfig }: FileTypesSectionProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">Movie Extensions</h3>
        <TagInput
          values={config.movieExtensions}
          onChange={(v) => updateConfig({ movieExtensions: v })}
          placeholder="Add extension..."
        />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">Subtitle Extensions</h3>
        <TagInput
          values={config.subtitleExtensions}
          onChange={(v) => updateConfig({ subtitleExtensions: v })}
          placeholder="Add extension..."
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run __tests__/components/options/FileTypesSection.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/options/FileTypesSection.tsx __tests__/components/options/FileTypesSection.test.tsx
git commit -m "feat: implement FileTypesSection with TagInput for extensions"
```

### Task 11: SearchTermsSection

**Files:**
- Modify: `src/renderer/components/options/SearchTermsSection.tsx`
- Test: `__tests__/components/options/SearchTermsSection.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/components/options/SearchTermsSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SearchTermsSection } from '../../../src/renderer/components/options/SearchTermsSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('SearchTermsSection', () => {
  it('renders remove terms as tags', () => {
    render(<SearchTermsSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByText('YIFY')).toBeDefined();
  });

  it('renders keep terms as a two-column table', () => {
    render(<SearchTermsSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByText('Match')).toBeDefined();
    expect(screen.getByText('Display')).toBeDefined();
  });
});
```

- [ ] **Step 2: Implement SearchTermsSection**

```tsx
// src/renderer/components/options/SearchTermsSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';
import { TagInput } from './TagInput';
import { KeyValueTable } from './KeyValueTable';

interface SearchTermsSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function SearchTermsSection({ config, updateConfig }: SearchTermsSectionProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">Remove Terms</h3>
        <p className="text-xs text-gray-500 mb-2">Terms auto-marked as &quot;remove&quot; when parsing filenames.</p>
        <TagInput
          values={config.removeTerms}
          onChange={(v) => updateConfig({ removeTerms: v })}
          placeholder="Add term..."
        />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">Keep Terms</h3>
        <p className="text-xs text-gray-500 mb-2">
          Match column is what to look for in filenames. Display column is what to show in the saved parts.
        </p>
        <KeyValueTable
          values={config.keepTerms}
          onChange={(v) => updateConfig({ keepTerms: v })}
          leftHeader="Match"
          rightHeader="Display"
          leftPlaceholder="match term"
          rightPlaceholder="display label"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run __tests__/components/options/SearchTermsSection.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/options/SearchTermsSection.tsx __tests__/components/options/SearchTermsSection.test.tsx
git commit -m "feat: implement SearchTermsSection with TagInput + KeyValueTable"
```

## Chunk 3: Remaining Sections

### Task 12: CompanionsSection

**Files:**
- Modify: `src/renderer/components/options/CompanionsSection.tsx`
- Test: `__tests__/components/options/CompanionsSection.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/components/options/CompanionsSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { CompanionsSection } from '../../../src/renderer/components/options/CompanionsSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('CompanionsSection', () => {
  it('renders createUrlFile checkbox', () => {
    render(<CompanionsSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('create-url-file')).toBeDefined();
  });

  it('disables sub-options when parent is unchecked', () => {
    const config = { ...DEFAULT_CONFIG, createUrlFile: false };
    render(<CompanionsSection config={config} updateConfig={vi.fn()} />);
    expect((screen.getByTestId('include-original-in-url') as HTMLInputElement).disabled).toBe(true);
  });

  it('disables deleteNfo when both dependencies are off', () => {
    const config = { ...DEFAULT_CONFIG, createUrlFile: true, includeNfoInUrl: false };
    render(<CompanionsSection config={config} updateConfig={vi.fn()} />);
    expect((screen.getByTestId('delete-nfo-after-include') as HTMLInputElement).disabled).toBe(true);
  });

  it('enables deleteNfo when both dependencies are on', () => {
    const config = { ...DEFAULT_CONFIG, createUrlFile: true, includeNfoInUrl: true };
    render(<CompanionsSection config={config} updateConfig={vi.fn()} />);
    expect((screen.getByTestId('delete-nfo-after-include') as HTMLInputElement).disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Implement CompanionsSection**

```tsx
// src/renderer/components/options/CompanionsSection.tsx
import React from 'react';
import type { ZeebConfig } from '../../../types';
import { BrowseInput } from './BrowseInput';

interface CompanionsSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function CompanionsSection({ config, updateConfig }: CompanionsSectionProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">URL File</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              data-testid="create-url-file"
              type="checkbox"
              checked={config.createUrlFile}
              onChange={(e) => updateConfig({ createUrlFile: e.target.checked })}
            />
            <span className="text-sm">Create .url file</span>
          </label>
          <div className="ml-6 space-y-2">
            <label className="flex items-center gap-2">
              <input
                data-testid="include-original-in-url"
                type="checkbox"
                checked={config.includeOriginalInUrl}
                disabled={!config.createUrlFile}
                onChange={(e) => updateConfig({ includeOriginalInUrl: e.target.checked })}
              />
              <span className={`text-sm ${!config.createUrlFile ? 'text-gray-400' : ''}`}>
                Include original filename in .url
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                data-testid="include-nfo-in-url"
                type="checkbox"
                checked={config.includeNfoInUrl}
                disabled={!config.createUrlFile}
                onChange={(e) => updateConfig({ includeNfoInUrl: e.target.checked })}
              />
              <span className={`text-sm ${!config.createUrlFile ? 'text-gray-400' : ''}`}>
                Include NFO content in .url
              </span>
            </label>
            <label className="flex items-center gap-2 ml-4">
              <input
                data-testid="delete-nfo-after-include"
                type="checkbox"
                checked={config.deleteNfoAfterInclude}
                disabled={!config.createUrlFile || !config.includeNfoInUrl}
                onChange={(e) => updateConfig({ deleteNfoAfterInclude: e.target.checked })}
              />
              <span
                className={`text-sm ${
                  !config.createUrlFile || !config.includeNfoInUrl ? 'text-gray-400' : ''
                }`}
              >
                Delete original NFO after including
              </span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">Poster</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              data-testid="create-poster"
              type="checkbox"
              checked={config.createPoster}
              onChange={(e) => updateConfig({ createPoster: e.target.checked })}
            />
            <span className="text-sm">Download poster from TMDB</span>
          </label>
          <div className="ml-6">
            <label className="flex items-center gap-2">
              <input
                data-testid="poster-in-dvd-folder"
                type="checkbox"
                checked={config.posterInDvdFolder}
                disabled={!config.createPoster}
                onChange={(e) => updateConfig({ posterInDvdFolder: e.target.checked })}
              />
              <span className={`text-sm ${!config.createPoster ? 'text-gray-400' : ''}`}>
                Place poster inside DVD folder
              </span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">NFO</h3>
        <div className="space-y-2">
          <label className="text-sm text-gray-600">Additional NFO folder:</label>
          <BrowseInput
            value={config.nfoFolder}
            onChange={(v) => updateConfig({ nfoFolder: v })}
            placeholder="NFO folder path..."
            mode="directory"
          />
          <label className="flex items-center gap-2 mt-2">
            <input
              data-testid="scan-nfo"
              type="checkbox"
              checked={config.scanNfo}
              onChange={(e) => updateConfig({ scanNfo: e.target.checked })}
            />
            <span className="text-sm">Scan NFO folder</span>
          </label>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run __tests__/components/options/CompanionsSection.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/options/CompanionsSection.tsx __tests__/components/options/CompanionsSection.test.tsx
git commit -m "feat: implement CompanionsSection with cascading toggle dependencies"
```

### Task 13: LoggingSection

**Files:**
- Modify: `src/renderer/components/options/LoggingSection.tsx`
- Test: `__tests__/components/options/LoggingSection.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/components/options/LoggingSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { LoggingSection } from '../../../src/renderer/components/options/LoggingSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('LoggingSection', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'zeebDialog', {
      value: { openFile: vi.fn().mockResolvedValue(null), openDirectory: vi.fn() },
      writable: true,
    });
  });

  it('renders log file path input', () => {
    render(<LoggingSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByPlaceholderText('Log file path...')).toBeDefined();
  });

  it('renders max undos input', () => {
    render(<LoggingSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('max-undos')).toBeDefined();
  });

  it('clamps max undos to 0-1000', () => {
    const updateConfig = vi.fn();
    render(<LoggingSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    fireEvent.change(screen.getByTestId('max-undos'), { target: { value: '1500' } });
    expect(updateConfig).toHaveBeenCalledWith({ maxUndos: 1000 });
  });
});
```

- [ ] **Step 2: Implement LoggingSection**

```tsx
// src/renderer/components/options/LoggingSection.tsx
import React, { useCallback } from 'react';
import type { ZeebConfig } from '../../../types';
import { BrowseInput } from './BrowseInput';

interface LoggingSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function LoggingSection({ config, updateConfig }: LoggingSectionProps): React.JSX.Element {
  const handleMaxUndos = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(0, Math.min(1000, parseInt(e.target.value, 10) || 0));
      updateConfig({ maxUndos: val });
    },
    [updateConfig],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">Log File</h3>
        <BrowseInput
          value={config.logFilePath}
          onChange={(v) => updateConfig({ logFilePath: v })}
          placeholder="Log file path..."
          mode="file"
        />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">Undo History</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Maximum undos remembered:</label>
          <input
            data-testid="max-undos"
            type="number"
            min={0}
            max={1000}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
            value={config.maxUndos}
            onChange={handleMaxUndos}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run __tests__/components/options/LoggingSection.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/options/LoggingSection.tsx __tests__/components/options/LoggingSection.test.tsx
git commit -m "feat: implement LoggingSection with BrowseInput and clamped maxUndos"
```

### Task 14: ImdbSection

**Files:**
- Modify: `src/renderer/components/options/ImdbSection.tsx`
- Test: `__tests__/components/options/ImdbSection.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/components/options/ImdbSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ImdbSection } from '../../../src/renderer/components/options/ImdbSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('ImdbSection', () => {
  it('renders IMDB search URL input', () => {
    render(<ImdbSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('imdb-search-url')).toBeDefined();
  });

  it('renders HTML zoom input', () => {
    render(<ImdbSection config={DEFAULT_CONFIG} updateConfig={vi.fn()} />);
    expect(screen.getByTestId('html-zoom')).toBeDefined();
  });

  it('renders MPAA mapping table', () => {
    const config = { ...DEFAULT_CONFIG, mpaaMap: { 'R': 'R', 'PG-13': 'PG13' } };
    render(<ImdbSection config={config} updateConfig={vi.fn()} />);
    expect(screen.getByText('IMDB Rating')).toBeDefined();
    expect(screen.getByText('Output')).toBeDefined();
  });

  it('clamps zoom to 50-200', () => {
    const updateConfig = vi.fn();
    render(<ImdbSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
    fireEvent.change(screen.getByTestId('html-zoom'), { target: { value: '250' } });
    expect(updateConfig).toHaveBeenCalledWith({ htmlZoom: 200 });
  });
});
```

- [ ] **Step 2: Implement ImdbSection**

```tsx
// src/renderer/components/options/ImdbSection.tsx
import React, { useCallback, useMemo } from 'react';
import type { ZeebConfig } from '../../../types';
import { KeyValueTable } from './KeyValueTable';

interface ImdbSectionProps {
  config: ZeebConfig;
  updateConfig: (partial: Partial<ZeebConfig>) => void;
}

export function ImdbSection({ config, updateConfig }: ImdbSectionProps): React.JSX.Element {
  const handleZoom = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(50, Math.min(200, parseInt(e.target.value, 10) || 100));
      updateConfig({ htmlZoom: val });
    },
    [updateConfig],
  );

  // Convert mpaaMap Record to pairs for KeyValueTable
  const mpaaPairs = useMemo(
    () => Object.entries(config.mpaaMap) as Array<[string, string]>,
    [config.mpaaMap],
  );

  const handleMpaaChange = useCallback(
    (pairs: Array<[string, string]>) => {
      const map: Record<string, string> = {};
      for (const [k, v] of pairs) {
        if (k) map[k] = v;
      }
      updateConfig({ mpaaMap: map });
    },
    [updateConfig],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">URLs</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">IMDB Search URL</label>
            <input
              data-testid="imdb-search-url"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={config.urlImdbSearch}
              onChange={(e) => updateConfig({ urlImdbSearch: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">IMDB Title URL</label>
            <input
              data-testid="imdb-title-url"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={config.urlImdbTT}
              onChange={(e) => updateConfig({ urlImdbTT: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">HTML Zoom</h3>
        <div className="flex items-center gap-3">
          <button
            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold"
            onClick={() => updateConfig({ htmlZoom: Math.max(50, config.htmlZoom - 10) })}
          >
            −
          </button>
          <input
            data-testid="html-zoom"
            type="number"
            min={50}
            max={200}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-20 text-center"
            value={config.htmlZoom}
            onChange={handleZoom}
          />
          <span className="text-sm text-gray-500">%</span>
          <button
            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold"
            onClick={() => updateConfig({ htmlZoom: Math.min(200, config.htmlZoom + 10) })}
          >
            +
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">MPAA Mapping</h3>
        <p className="text-xs text-gray-500 mb-2">Map IMDB ratings to custom output strings.</p>
        <KeyValueTable
          values={mpaaPairs}
          onChange={handleMpaaChange}
          leftHeader="IMDB Rating"
          rightHeader="Output"
          leftPlaceholder="e.g. R"
          rightPlaceholder="e.g. R"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run __tests__/components/options/ImdbSection.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/options/ImdbSection.tsx __tests__/components/options/ImdbSection.test.tsx
git commit -m "feat: implement ImdbSection with URLs, zoom, MPAA mapping"
```

### Task 15: FormatTesterSection

**Files:**
- Modify: `src/renderer/components/options/FormatTesterSection.tsx`
- Test: `__tests__/components/options/FormatTesterSection.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/components/options/FormatTesterSection.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { FormatTesterSection } from '../../../src/renderer/components/options/FormatTesterSection';
import { DEFAULT_CONFIG } from '../../../src/stores/configStore';

describe('FormatTesterSection', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'zeebImdb', {
      value: { suggest: vi.fn().mockResolvedValue([]) },
      writable: true,
    });
  });

  it('renders tt# input in idle state', () => {
    render(<FormatTesterSection config={DEFAULT_CONFIG} />);
    expect(screen.getByPlaceholderText('Enter tt# (e.g., tt0068646)')).toBeDefined();
  });

  it('renders Test button', () => {
    render(<FormatTesterSection config={DEFAULT_CONFIG} />);
    expect(screen.getByText('Test')).toBeDefined();
  });

  it('shows error for invalid tt#', async () => {
    render(<FormatTesterSection config={DEFAULT_CONFIG} />);
    fireEvent.change(screen.getByPlaceholderText('Enter tt# (e.g., tt0068646)'), {
      target: { value: 'invalid' },
    });
    fireEvent.click(screen.getByText('Test'));
    await vi.waitFor(() => {
      expect(screen.getByText(/Could not fetch data/)).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Implement FormatTesterSection**

The Format Tester needs a webview to fetch IMDB data. For now, implement the UI shell with the IMDB suggestion API for basic metadata. Full webview extraction is out of scope for this section — it uses the same suggestion API flow as the main renamer.

```tsx
// src/renderer/components/options/FormatTesterSection.tsx
import React, { useState, useCallback } from 'react';
import type { ZeebConfig, MovieMetadata } from '../../../types';
import { interpolateFormat } from '../../../services/formatEngine';

interface FormatTesterSectionProps {
  config: ZeebConfig;
}

type TesterState = 'idle' | 'loading' | 'error' | 'results';

const TOKEN_LABELS: Array<{ token: string; label: string }> = [
  { token: 'title', label: '<title>' },
  { token: 'year', label: '<year>' },
  { token: 'tt', label: '<imdb>' },
  { token: 'rating', label: '<rating100>' },
  { token: 'directors', label: '<directors>' },
  { token: 'genres', label: '<genres>' },
  { token: 'actors', label: '<stars>' },
  { token: 'duration', label: '<duration>' },
  { token: 'mpaa', label: '<mpaa>' },
  { token: 'aka', label: '<aka>' },
];

export function FormatTesterSection({ config }: FormatTesterSectionProps): React.JSX.Element {
  const [ttInput, setTtInput] = useState('');
  const [state, setState] = useState<TesterState>('idle');
  const [metadata, setMetadata] = useState<MovieMetadata | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTest = useCallback(async () => {
    const tt = ttInput.trim();
    if (!tt.match(/^tt\d{5,}$/)) {
      setState('error');
      setErrorMsg(`Could not fetch data for "${tt}" — expected format: tt0068646`);
      return;
    }

    setState('loading');
    try {
      const results = await window.zeebImdb.suggest(tt);
      const match = results.find((r: { tt: string }) => r.tt === tt);
      if (!match) {
        setState('error');
        setErrorMsg(`Could not fetch data for ${tt}`);
        return;
      }
      const meta: MovieMetadata = {
        tt: match.tt,
        title: match.title,
        year: match.year,
        rating: null,
        directors: [],
        genres: [],
        actors: [],
        duration: null,
        mpaa: null,
        aka: [],
        posterUrl: match.thumbnailUrl,
      };
      setMetadata(meta);
      setState('results');
    } catch {
      setState('error');
      setErrorMsg(`Could not fetch data for ${tt}`);
    }
  }, [ttInput]);

  const preview = metadata
    ? interpolateFormat(config.formatStandard, metadata, {
        saved: '(from current file)',
        directorSeparator: config.directorSeparator,
        genreSeparator: config.genreSeparator,
        starSeparator: config.starSeparator,
        removeThe: config.removeThe,
        swapThe: config.swapThe,
        titleSpaceChar: config.titleSpaceChar,
      })
    : '';

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
          disabled={state === 'loading'}
        >
          {state === 'loading' ? 'Fetching...' : 'Test'}
        </button>
      </div>

      {state === 'error' && <p className="text-red-500 text-sm">{errorMsg}</p>}

      {state === 'results' && metadata && (
        <div className="space-y-4">
          <table className="w-full text-sm border border-gray-200 rounded">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Token</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Value</th>
              </tr>
            </thead>
            <tbody>
              {TOKEN_LABELS.map(({ token, label }) => {
                let value = '';
                if (token === 'title') value = metadata.title;
                else if (token === 'year') value = metadata.year?.toString() ?? '';
                else if (token === 'tt') value = metadata.tt;
                else if (token === 'rating') value = metadata.rating != null ? Math.round(metadata.rating * 10.75).toString() : '(unavailable)';
                else if (token === 'directors') value = metadata.directors.join(config.directorSeparator) || '(unavailable)';
                else if (token === 'genres') value = metadata.genres.join(config.genreSeparator) || '(unavailable)';
                else if (token === 'actors') value = metadata.actors.join(config.starSeparator) || '(unavailable)';
                else if (token === 'duration') value = metadata.duration?.toString() ?? '(unavailable)';
                else if (token === 'mpaa') value = metadata.mpaa ?? '(unavailable)';
                else if (token === 'aka') value = metadata.aka[0] ?? '(unavailable)';
                return (
                  <tr key={token} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 font-mono text-purple-600">{label}</td>
                    <td className="px-3 py-1.5">{value}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-gray-100">
                <td className="px-3 py-1.5 font-mono text-purple-600">{`<saved>`}</td>
                <td className="px-3 py-1.5 text-gray-400">(from current file)</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="px-3 py-1.5 font-mono text-purple-600">{`<original>`}</td>
                <td className="px-3 py-1.5 text-gray-400">{metadata.tt}</td>
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

- [ ] **Step 3: Run tests**

Run: `npx vitest run __tests__/components/options/FormatTesterSection.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/options/FormatTesterSection.tsx __tests__/components/options/FormatTesterSection.test.tsx
git commit -m "feat: implement FormatTesterSection with IMDB suggestion API lookup"
```

### Task 16: Full Test Suite + Final Cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Fix any type errors**

Run: `npx tsc --noEmit`
Expected: No errors (or only pre-existing ones)

- [ ] **Step 3: Add `openFile` to window type declarations if needed**

Type declarations for `window.zeebDialog.openFile` should already be in `src/types/electron.d.ts` from Task 3. If any other type declarations are needed, add them here.

- [ ] **Step 4: Commit any fixes**

Stage only the specific files that were fixed, then commit:

```bash
git commit -m "fix: resolve type errors and test failures from Options Modal implementation"
```

- [ ] **Step 5: Final verification**

Run: `npx vitest run`
Expected: ALL PASS
