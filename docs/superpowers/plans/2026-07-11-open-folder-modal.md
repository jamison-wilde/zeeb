# Open Movie Folder Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-page FolderBrowser with the mock's Open Movie Folder modal, and replace `recentFolders: string[]` with `folderHistory` entries carrying per-folder recursion depth, file count, and last-scanned time.

**Architecture:** Additive foundations first (types, pure history helpers, migration, relative-time util) so nothing breaks mid-plan; then the standalone `OpenFolderModal` component; then the App rewiring that deletes `FolderBrowser` and the legacy `recentFolders` field in one step. Spec: `docs/superpowers/specs/2026-07-11-open-folder-modal-design.md`. Visual ground truth: `tmp/zeeb-final-design.dc.html` (renders with `tmp/support.js`), "Open folder modal" screen.

**Tech Stack:** Electron 41 + React 19 + TypeScript, Tailwind 4 semantic tokens, Zustand, Vitest + Testing Library.

## Global Constraints

- **Windows shell rules:** ONE command per Bash call; never chain with `&&`/`||`/`;`; no `sed`/`tee`/PowerShell/`$?`/`$VAR`/`$(...)`; forward slashes in bash paths; use `node` for scripting; temp files in `./tmp/`.
- **Git:** conventional commits; one git command at a time; `git status --short` after mutations; **NEVER push**. Stage files explicitly by path — never `git add -A`/`.`. The pre-existing dirty files `src/main/squirrelHandler.ts`, `__tests__/main/squirrelHandler.test.ts`, `test-data_bad/` are unrelated WIP — never stage, commit, or revert them.
- **Testing:** full suite `npm test`; single file `npx vitest run <path>`; never delete tests — `FolderBrowser.test.tsx` is *replaced* only after its behaviors are re-covered by `OpenFolderModal.test.tsx` (Task 2). Mock all IPC/fs; TDD (RED before GREEN) for every behavior change. `npx tsc --noEmit` must add no NEW errors (baseline ≈39, all pre-existing).
- **Design:** semantic tokens only — no hardcoded palette classes, no arbitrary `text-[Npx]` sizes (use the typography tokens); no hover-revealed functionality. Modal is non-destructive: closing never mutates the loaded file list.
- **Spec decisions (binding):** fresh-path depth = `'none'`; history capped at 10, most-recent-first, case-insensitive path matching; `config.recursionMode` stays in the type but is no longer written; undo-rescan uses `folderHistory[0]` path + depth.
- **Spec correction:** the spec mentions `legacyImporter` producing history entries, but the Flex importer never handled folder lists (verified — no `recentFolders` handling exists in `src/services/legacyImporter.ts`). No importer change is needed or wanted.

---

### Task 1: Foundations — types, history helpers, migration, relative time

**Files:**
- Modify: `src/types/index.ts` (~line 168: `recentFolders`/`recursionMode` region)
- Modify: `src/services/fileScanner.ts:4` (delete local `RecursionMode`, import from types)
- Modify: `src/services/configDefaults.ts:72` (add `folderHistory: []`, keep `recentFolders` for now)
- Create: `src/services/folderHistory.ts`
- Create: `src/utils/relativeTime.ts`
- Modify: `src/stores/configStore.ts:33-58` (`load()` migration)
- Test: `__tests__/services/folderHistory.test.ts` (create), `__tests__/utils/relativeTime.test.ts` (create), `__tests__/stores/configStore.test.ts` (extend)

**Interfaces:**
- Produces (Tasks 2-3 rely on these exact names):
  - `export type RecursionMode = 'none' | 'subfolders' | 'full'` and `export interface FolderHistoryEntry { path: string; depth: RecursionMode; fileCount: number | null; lastScanned: number | null }` in `src/types/index.ts`
  - `ZeebConfig.folderHistory: FolderHistoryEntry[]` (default `[]`); `recentFolders` still present until Task 3
  - `upsertFolderHistory(history, { path, depth, fileCount, lastScanned }): FolderHistoryEntry[]`, `removeFromFolderHistory(history, path): FolderHistoryEntry[]`, `FOLDER_HISTORY_LIMIT = 10` in `src/services/folderHistory.ts`
  - `formatRelativeTime(timestamp: number, now?: number): string` in `src/utils/relativeTime.ts`

- [ ] **Step 1: Write the failing helper tests** — create `__tests__/services/folderHistory.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  upsertFolderHistory,
  removeFromFolderHistory,
  FOLDER_HISTORY_LIMIT,
} from '../../src/services/folderHistory';
import type { FolderHistoryEntry } from '../../src/types';

const entry = (path: string, depth: FolderHistoryEntry['depth'] = 'none'): FolderHistoryEntry =>
  ({ path, depth, fileCount: null, lastScanned: null });

describe('upsertFolderHistory', () => {
  it('inserts new entries at the front with scan metadata', () => {
    const out = upsertFolderHistory([entry('D:\\old')], {
      path: 'D:\\new', depth: 'full', fileCount: 12, lastScanned: 1000,
    });
    expect(out[0]).toEqual({ path: 'D:\\new', depth: 'full', fileCount: 12, lastScanned: 1000 });
    expect(out[1].path).toBe('D:\\old');
  });

  it('replaces an existing entry case-insensitively and moves it to the front', () => {
    const out = upsertFolderHistory([entry('D:\\a'), entry('D:\\Movies', 'subfolders')], {
      path: 'd:\\movies', depth: 'none', fileCount: 3, lastScanned: 2000,
    });
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ path: 'd:\\movies', depth: 'none', fileCount: 3, lastScanned: 2000 });
  });

  it('caps the history at the limit', () => {
    const many = Array.from({ length: FOLDER_HISTORY_LIMIT }, (_, i) => entry(`D:\\f${i}`));
    const out = upsertFolderHistory(many, { path: 'D:\\extra', depth: 'none', fileCount: 1, lastScanned: 1 });
    expect(out).toHaveLength(FOLDER_HISTORY_LIMIT);
    expect(out[0].path).toBe('D:\\extra');
    expect(out.some((e) => e.path === `D:\\f${FOLDER_HISTORY_LIMIT - 1}`)).toBe(false);
  });
});

describe('removeFromFolderHistory', () => {
  it('removes case-insensitively and leaves others alone', () => {
    const out = removeFromFolderHistory([entry('D:\\A'), entry('D:\\B')], 'd:\\a');
    expect(out.map((e) => e.path)).toEqual(['D:\\B']);
  });
});
```

- [ ] **Step 2: Write the failing relative-time tests** — create `__tests__/utils/relativeTime.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from '../../src/utils/relativeTime';

const NOW = 1_700_000_000_000;

describe('formatRelativeTime', () => {
  it('formats each bucket', () => {
    expect(formatRelativeTime(NOW - 30_000, NOW)).toBe('just now');
    expect(formatRelativeTime(NOW - 2 * 60_000, NOW)).toBe('2 min ago');
    expect(formatRelativeTime(NOW - 3 * 3_600_000, NOW)).toBe('3 h ago');
    expect(formatRelativeTime(NOW - 30 * 3_600_000, NOW)).toBe('yesterday');
    expect(formatRelativeTime(NOW - 3 * 86_400_000, NOW)).toBe('3 days ago');
  });

  it('falls back to a locale date beyond a week', () => {
    const old = NOW - 30 * 86_400_000;
    expect(formatRelativeTime(old, NOW)).toBe(new Date(old).toLocaleDateString());
  });
});
```

- [ ] **Step 3: Run both to verify they fail**

Run: `npx vitest run __tests__/services/folderHistory.test.ts __tests__/utils/relativeTime.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 4: Implement the types.** In `src/types/index.ts`, above `ZeebConfig` add:

```ts
export type RecursionMode = 'none' | 'subfolders' | 'full';

export interface FolderHistoryEntry {
  path: string;
  depth: RecursionMode;
  fileCount: number | null;
  lastScanned: number | null;
}
```

In `ZeebConfig`: change `recursionMode: 'none' | 'subfolders' | 'full';` to `recursionMode: RecursionMode;` and add `folderHistory: FolderHistoryEntry[];` next to `recentFolders: string[];` (which stays until Task 3). In `src/services/fileScanner.ts` delete the local `type RecursionMode = ...` (line 4) and add `RecursionMode` to its type import from `'../types'`. In `src/services/configDefaults.ts` add `folderHistory: [],` beside `recentFolders: [],`.

- [ ] **Step 5: Implement the helpers.** Create `src/services/folderHistory.ts`:

```ts
import type { FolderHistoryEntry, RecursionMode } from '../types';

export const FOLDER_HISTORY_LIMIT = 10;

// Windows paths are case-insensitive.
const samePath = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

export function upsertFolderHistory(
  history: FolderHistoryEntry[],
  entry: { path: string; depth: RecursionMode; fileCount: number; lastScanned: number },
): FolderHistoryEntry[] {
  const rest = history.filter((h) => !samePath(h.path, entry.path));
  return [{ ...entry }, ...rest].slice(0, FOLDER_HISTORY_LIMIT);
}

export function removeFromFolderHistory(
  history: FolderHistoryEntry[],
  path: string,
): FolderHistoryEntry[] {
  return history.filter((h) => !samePath(h.path, path));
}
```

Create `src/utils/relativeTime.ts`:

```ts
const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const delta = now - timestamp;
  if (delta < MINUTE) return 'just now';
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)} min ago`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)} h ago`;
  if (delta < 2 * DAY) return 'yesterday';
  if (delta < 7 * DAY) return `${Math.floor(delta / DAY)} days ago`;
  return new Date(timestamp).toLocaleDateString();
}
```

- [ ] **Step 6: Run Steps 1-2 tests to verify they pass**

Run: `npx vitest run __tests__/services/folderHistory.test.ts __tests__/utils/relativeTime.test.ts`
Expected: PASS.

- [ ] **Step 7: Write the failing migration tests** — append to the first `describe('configStore', ...)` block in `__tests__/stores/configStore.test.ts` (pattern-match the existing `mpaaMap migration` describe for fs mocking):

```ts
describe('folderHistory migration', () => {
  beforeEach(() => {
    useConfigStore.setState({ config: { ...DEFAULT_CONFIG } });
  });

  it('migrates legacy recentFolders + recursionMode into folderHistory', async () => {
    const legacy = { recentFolders: ['D:\\Movies', '\\\\nas\\media'], recursionMode: 'subfolders' };
    const fs = createMockFsAdapter({
      exists: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue(JSON.stringify(legacy)),
    });
    useConfigStore.getState().setFs(fs);
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().config.folderHistory).toEqual([
      { path: 'D:\\Movies', depth: 'subfolders', fileCount: null, lastScanned: null },
      { path: '\\\\nas\\media', depth: 'subfolders', fileCount: null, lastScanned: null },
    ]);
  });

  it('preserves an already-migrated folderHistory and sanitizes bad entries', async () => {
    const saved = {
      folderHistory: [
        { path: 'D:\\Good', depth: 'full', fileCount: 5, lastScanned: 123 },
        { path: 'D:\\Odd', depth: 'sideways', fileCount: 'many' },
        { depth: 'full' },
      ],
    };
    const fs = createMockFsAdapter({
      exists: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue(JSON.stringify(saved)),
    });
    useConfigStore.getState().setFs(fs);
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().config.folderHistory).toEqual([
      { path: 'D:\\Good', depth: 'full', fileCount: 5, lastScanned: 123 },
      { path: 'D:\\Odd', depth: 'none', fileCount: null, lastScanned: null },
    ]);
  });
});
```

Run: `npx vitest run __tests__/stores/configStore.test.ts`
Expected: FAIL (`folderHistory` is `[]` / entries unsanitized).

- [ ] **Step 8: Implement the migration.** In `src/stores/configStore.ts` `load()`, after the `mpaaMap` block and before `set(...)`, add (import `FOLDER_HISTORY_LIMIT` from `'../services/folderHistory'`):

```ts
        if (!Array.isArray(saved.folderHistory) && Array.isArray(saved.recentFolders)) {
          const depth =
            saved.recursionMode === 'subfolders' || saved.recursionMode === 'full'
              ? saved.recursionMode
              : 'none';
          saved.folderHistory = (saved.recentFolders as unknown[])
            .filter((p): p is string => typeof p === 'string')
            .map((path) => ({ path, depth, fileCount: null, lastScanned: null }));
        }
        if (Array.isArray(saved.folderHistory)) {
          saved.folderHistory = (saved.folderHistory as unknown[])
            .filter(
              (e): e is Record<string, unknown> =>
                !!e && typeof e === 'object' && typeof (e as Record<string, unknown>).path === 'string',
            )
            .map((e) => ({
              path: e.path as string,
              depth: e.depth === 'subfolders' || e.depth === 'full' ? e.depth : 'none',
              fileCount: typeof e.fileCount === 'number' ? e.fileCount : null,
              lastScanned: typeof e.lastScanned === 'number' ? e.lastScanned : null,
            }))
            .slice(0, FOLDER_HISTORY_LIMIT);
        }
```

- [ ] **Step 9: Run the full suite** (type ripple check — `recentFolders` still exists, so nothing else changes)

Run: `npm test`
Expected: PASS. Then `npx tsc --noEmit` — no NEW errors.

- [ ] **Step 10: Commit**

```bash
git add src/types/index.ts src/services/fileScanner.ts src/services/configDefaults.ts src/services/folderHistory.ts src/utils/relativeTime.ts src/stores/configStore.ts __tests__/services/folderHistory.test.ts __tests__/utils/relativeTime.test.ts __tests__/stores/configStore.test.ts
git commit -m "feat: add folder history model with migration and relative time util"
```

---

### Task 2: `OpenFolderModal` component

**Files:**
- Modify: `src/renderer/index.css` (add `modal` surface token)
- Create: `src/renderer/components/OpenFolderModal.tsx`
- Test: `__tests__/components/OpenFolderModal.test.tsx` (create)

**Interfaces:**
- Consumes: `FolderHistoryEntry`, `RecursionMode` (Task 1), `formatRelativeTime` (Task 1), tokens incl. new `bg-modal`.
- Produces (Task 3 relies on): `OpenFolderModalProps { visible: boolean; history: FolderHistoryEntry[]; onClose: () => void; onSelect: (path: string, depth: RecursionMode) => void; onRemove: (path: string) => void }`; test ids `open-folder-modal`, `close-open-folder`, `folder-path-input`, `recursion-mode`, `browse-button`, `list-movies-button`, `history-row-{i}`, `history-scan-{i}`, `history-remove-{i}`.

Behavior contract (from spec §2 + mock):
- On `visible` turning true: input prefills `history[0]?.path ?? ''`, depth `history[0]?.depth ?? 'none'` (the mock shows the top entry staged).
- Editing the path: if the new value case-insensitively equals a history entry's path, adopt that entry's depth; otherwise depth resets to `'none'` (fresh-path rule). Explicit segment clicks after that stick.
- `List Movies` (and Enter in the input) → `onSelect(trimmedPath, depth)`; disabled/no-op when blank.
- `Browse…` → `platform.dialog.openDirectory()`; a returned path goes through the same path-change logic.
- Row `▶` → `onSelect(row.path, row.depth)` directly. Row path click → stages path+depth only. Row `×` → `onRemove(row.path)`.
- Meta text `“{fileCount} files · scanned {formatRelativeTime(lastScanned)}”` renders only when both are non-null. Depth badge text: none→`None`, subfolders→`Sub`, full→`Full`.
- Escape (while visible) and `×` call `onClose`. The component renders `null` when `visible` is false.

- [ ] **Step 1: Add the modal surface token.** In `src/renderer/index.css`: add `--color-modal: var(--z-modal);` to the `@theme inline` block, `--z-modal: #1f2125;` to the dark palette, `--z-modal: #ffffff;` to the light palette.

- [ ] **Step 2: Write the failing component tests** — create `__tests__/components/OpenFolderModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { OpenFolderModal } from '../../src/renderer/components/OpenFolderModal';
import { PlatformProvider } from '../../src/renderer/PlatformContext';
import { createMockPlatformAdapter } from '../../src/adapters/platform';
import type { FolderHistoryEntry } from '../../src/types';

const history: FolderHistoryEntry[] = [
  { path: 'D:\\New Downloads', depth: 'subfolders', fileCount: 14, lastScanned: Date.now() - 120_000 },
  { path: '\\\\nas\\media', depth: 'full', fileCount: null, lastScanned: null },
];

function renderModal(props: Partial<React.ComponentProps<typeof OpenFolderModal>> = {}) {
  const defaults = {
    visible: true,
    history,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    onRemove: vi.fn(),
  };
  return render(
    <PlatformProvider value={createMockPlatformAdapter()}>
      <OpenFolderModal {...defaults} {...props} />
    </PlatformProvider>,
  );
}

describe('OpenFolderModal', () => {
  it('renders nothing when not visible', () => {
    renderModal({ visible: false });
    expect(screen.queryByTestId('open-folder-modal')).toBeNull();
  });

  it('prefills the top history entry path and depth', () => {
    renderModal();
    expect((screen.getByTestId('folder-path-input') as HTMLInputElement).value).toBe('D:\\New Downloads');
    const segments = screen.getByTestId('recursion-mode').querySelectorAll('button');
    expect(segments[1].getAttribute('aria-pressed')).toBe('true'); // Sub
  });

  it('resets depth to none for a fresh typed path', () => {
    renderModal();
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: 'D:\\Somewhere Else' } });
    const segments = screen.getByTestId('recursion-mode').querySelectorAll('button');
    expect(segments[0].getAttribute('aria-pressed')).toBe('true'); // None
  });

  it('adopts the saved depth when the typed path matches history case-insensitively', () => {
    renderModal();
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: '\\\\NAS\\media' } });
    const segments = screen.getByTestId('recursion-mode').querySelectorAll('button');
    expect(segments[2].getAttribute('aria-pressed')).toBe('true'); // Full
  });

  it('selects with the staged path and depth from List Movies and Enter', () => {
    const onSelect = vi.fn();
    renderModal({ onSelect });
    fireEvent.click(screen.getByTestId('list-movies-button'));
    expect(onSelect).toHaveBeenCalledWith('D:\\New Downloads', 'subfolders');
    fireEvent.keyDown(screen.getByTestId('folder-path-input'), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('disables List Movies when the path is blank', () => {
    renderModal({ history: [] });
    expect((screen.getByTestId('list-movies-button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('one-touch scans a row with its saved depth', () => {
    const onSelect = vi.fn();
    renderModal({ onSelect });
    fireEvent.click(screen.getByTestId('history-scan-1'));
    expect(onSelect).toHaveBeenCalledWith('\\\\nas\\media', 'full');
  });

  it('stages a row on path click without selecting', () => {
    const onSelect = vi.fn();
    renderModal({ onSelect });
    fireEvent.click(screen.getByText('\\\\nas\\media'));
    expect(onSelect).not.toHaveBeenCalled();
    expect((screen.getByTestId('folder-path-input') as HTMLInputElement).value).toBe('\\\\nas\\media');
    const segments = screen.getByTestId('recursion-mode').querySelectorAll('button');
    expect(segments[2].getAttribute('aria-pressed')).toBe('true');
  });

  it('shows scan metadata only when present, plus a depth badge', () => {
    renderModal();
    expect(screen.getByText(/14 files · scanned/)).toBeDefined();
    expect(screen.getByTestId('history-row-1').textContent).not.toContain('files');
    expect(screen.getByText('Sub')).toBeDefined();
    expect(screen.getByText('Full')).toBeDefined();
  });

  it('removes a row via its close control', () => {
    const onRemove = vi.fn();
    renderModal({ onRemove });
    fireEvent.click(screen.getByTestId('history-remove-0'));
    expect(onRemove).toHaveBeenCalledWith('D:\\New Downloads');
  });

  it('closes on the header control and on Escape', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByTestId('close-open-folder'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders the slow-scan note and recursion tooltips', () => {
    renderModal();
    expect(screen.getByText(/listing movies can take/i)).toBeDefined();
    const segments = screen.getByTestId('recursion-mode').querySelectorAll('button');
    segments.forEach((b) => expect(b.getAttribute('title')).toBeTruthy());
  });
});
```

- [ ] **Step 3: Run to verify RED**

Run: `npx vitest run __tests__/components/OpenFolderModal.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement** — create `src/renderer/components/OpenFolderModal.tsx`:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { usePlatform } from '../PlatformContext';
import { formatRelativeTime } from '../../utils/relativeTime';
import type { FolderHistoryEntry, RecursionMode } from '../../types';

export interface OpenFolderModalProps {
  visible: boolean;
  history: FolderHistoryEntry[];
  onClose: () => void;
  onSelect: (path: string, depth: RecursionMode) => void;
  onRemove: (path: string) => void;
}

const DEPTH_OPTIONS: { label: string; value: RecursionMode; tooltip: string }[] = [
  { label: 'None', value: 'none', tooltip: 'Only look in this directory, not in subfolders' },
  { label: 'Sub', value: 'subfolders', tooltip: 'Look one level deep into immediate subfolders, but not deeper' },
  { label: 'Full', value: 'full', tooltip: 'Recursively look in all subfolders at every level' },
];

const DEPTH_BADGE: Record<RecursionMode, string> = {
  none: 'None',
  subfolders: 'Sub',
  full: 'Full',
};

export function OpenFolderModal({
  visible,
  history,
  onClose,
  onSelect,
  onRemove,
}: OpenFolderModalProps): React.JSX.Element | null {
  const platform = usePlatform();
  const [path, setPath] = useState('');
  const [depth, setDepth] = useState<RecursionMode>('none');

  useEffect(() => {
    if (!visible) return;
    setPath(history[0]?.path ?? '');
    setDepth(history[0]?.depth ?? 'none');
    // Only reset when the modal opens; history churn while open must not clobber edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  const stagePath = useCallback(
    (value: string) => {
      setPath(value);
      const match = history.find((h) => h.path.toLowerCase() === value.toLowerCase());
      setDepth(match ? match.depth : 'none');
    },
    [history],
  );

  const submit = useCallback(() => {
    const trimmed = path.trim();
    if (trimmed) onSelect(trimmed, depth);
  }, [path, depth, onSelect]);

  const handleBrowse = useCallback(async () => {
    const chosen = await platform.dialog.openDirectory();
    if (chosen) stagePath(chosen);
  }, [platform, stagePath]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-start justify-center pt-11">
      <div
        data-testid="open-folder-modal"
        className="w-[680px] bg-modal border border-toggle-off rounded-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line">
          <span className="text-xs font-bold text-ink">Open Movie Folder</span>
          <span className="flex-1" />
          <button
            data-testid="close-open-folder"
            className="text-ink-faint text-base leading-none px-1"
            title="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-2.5">
          <input
            data-testid="folder-path-input"
            className="flex-1 font-mono text-body text-ink-bright bg-well border border-accent-muted rounded-[3px] px-2 py-1"
            value={path}
            onChange={(e) => stagePath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="Enter folder path..."
          />
          <span data-testid="recursion-mode" className="flex border border-toggle-off rounded-[3px] overflow-hidden shrink-0">
            {DEPTH_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                title={opt.tooltip}
                aria-pressed={depth === opt.value}
                className={`text-label font-semibold px-2 py-1 ${i > 0 ? 'border-l border-toggle-off' : ''} ${
                  depth === opt.value ? 'bg-accent text-on-accent' : 'text-ink-dim'
                }`}
                onClick={() => setDepth(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </span>
          <button
            data-testid="browse-button"
            className="text-label font-bold border border-toggle-off text-ink-2 rounded-[3px] px-2.5 py-1 shrink-0"
            onClick={handleBrowse}
          >
            Browse…
          </button>
          <button
            data-testid="list-movies-button"
            disabled={!path.trim()}
            className="text-label font-bold bg-accent text-on-accent rounded-[3px] px-3 py-1 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={submit}
          >
            List Movies
          </button>
        </div>

        <div className="px-3 pb-1 text-badge font-bold uppercase tracking-[0.07em] text-ink-faint">
          History — ▶ lists with saved depth
        </div>
        <div className="pb-1.5">
          {history.map((entry, i) => (
            <div key={entry.path} data-testid={`history-row-${i}`} className="flex items-center gap-2 px-3 py-1">
              <button
                data-testid={`history-scan-${i}`}
                title="List now with saved depth"
                className="w-5 h-4 flex items-center justify-center rounded-[3px] bg-row-selected text-accent text-label shrink-0"
                onClick={() => onSelect(entry.path, entry.depth)}
              >
                ▶
              </button>
              <button
                title="Load into the row above"
                className="flex-1 text-left font-mono font-semibold text-body text-ink-2 truncate"
                onClick={() => stagePath(entry.path)}
              >
                {entry.path}
              </button>
              {entry.fileCount !== null && entry.lastScanned !== null && (
                <span className="text-label text-ink-faint whitespace-nowrap shrink-0">
                  {entry.fileCount} files · scanned {formatRelativeTime(entry.lastScanned)}
                </span>
              )}
              <span className="text-micro font-mono font-bold bg-toggle-off text-ink-2 rounded-[2px] px-[5px] py-[2px] shrink-0">
                {DEPTH_BADGE[entry.depth]}
              </span>
              <button
                data-testid={`history-remove-${i}`}
                title="Remove from history"
                className="text-body font-mono font-bold text-ink-faint px-0.5"
                onClick={() => onRemove(entry.path)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <p className="px-3 py-1.5 text-label text-ink-dim italic border-t border-line">
          Note: Listing movies can take several seconds or more, especially on network shares or when including subfolders.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run to verify GREEN**

Run: `npx vitest run __tests__/components/OpenFolderModal.test.tsx`
Expected: PASS (all 12).

- [ ] **Step 6: Full suite + tsc**

Run: `npm test` → PASS. Run: `npx tsc --noEmit` → no NEW errors.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/index.css src/renderer/components/OpenFolderModal.tsx __tests__/components/OpenFolderModal.test.tsx
git commit -m "feat: add open movie folder modal with one-touch history"
```

---

### Task 3: App integration + legacy removal

**Files:**
- Modify: `src/renderer/App.tsx` (view switch, handlers, render — regions near lines 21-29, 76-84, 117-200)
- Delete: `src/renderer/components/FolderBrowser.tsx`
- Delete: `__tests__/components/FolderBrowser.test.tsx` (coverage lives in `OpenFolderModal.test.tsx` since Task 2 — verify before deleting)
- Modify: `src/types/index.ts` (remove `recentFolders`), `src/services/configDefaults.ts` (remove `recentFolders: []`)
- Test: `__tests__/App.test.tsx`, `__tests__/renderer/App.test.tsx` (update)

**Interfaces:**
- Consumes: `OpenFolderModal` (Task 2 props), `upsertFolderHistory`/`removeFromFolderHistory` (Task 1), `scanDirectory(fs, path, extensions, recursionMode, { detectDvd })` (existing).
- Produces: App state `showOpenFolder` (initial `true`); `menu:open-folder` only opens the modal (no file-list clearing); scan failure → `useNotificationStore.notify('error', 'Folder listing failed')` + modal stays open.

- [ ] **Step 1: Update the App tests first (RED).** In `__tests__/App.test.tsx`: replace the two `folder-browser` assertions:

```tsx
  it('shows the open folder modal at startup', () => {
    renderApp();
    expect(screen.getByTestId('open-folder-modal')).toBeDefined();
  });

  it('reopens the modal from the Open Folder menu event without clearing state', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('close-open-folder'));
    expect(screen.queryByTestId('open-folder-modal')).toBeNull();
    act(() => { openFolderCallback?.(); });
    expect(screen.getByTestId('open-folder-modal')).toBeDefined();
  });
```

(Add `fireEvent` to the testing-library import if missing.) In `__tests__/renderer/App.test.tsx`: change the `folder-browser` assertion (line ~27) to `expect(screen.getByTestId('open-folder-modal')).toBeDefined();` and keep the folder-path-input assertion (the modal renders the same test id).

Run: `npx vitest run __tests__/App.test.tsx __tests__/renderer/App.test.tsx`
Expected: FAIL (no modal yet).

- [ ] **Step 2: Rewire `App.tsx`.**
- Delete `type ViewName = ...` and the `view` state; add `const [showOpenFolder, setShowOpenFolder] = useState(true);`
- Imports: drop `FolderBrowser`, add `OpenFolderModal`, `upsertFolderHistory`, `removeFromFolderHistory`, `useNotificationStore`, and type `RecursionMode`.
- `platform.menu.onOpenFolder` handler becomes only `setShowOpenFolder(true);` (delete `setFiles([])` and `setView(...)`).
- Replace `handleFolderSelected`:

```tsx
  const handleFolderSelected = useCallback(
    async (path: string, depth: RecursionMode) => {
      let results;
      try {
        results = await scanDirectory(fs, path, config.movieExtensions, depth, {
          detectDvd: config.detectDvd,
        });
      } catch {
        useNotificationStore.getState().notify('error', 'Folder listing failed');
        return;
      }
      updateConfig({
        folderHistory: upsertFolderHistory(config.folderHistory, {
          path,
          depth,
          fileCount: results.length,
          lastScanned: Date.now(),
        }),
      });
      void save();
      setFiles(results);
      cursor.setFromList(results);
      setShowOpenFolder(false);
    },
    [fs, config.movieExtensions, config.detectDvd, config.folderHistory, setFiles, updateConfig, save, cursor],
  );
```

- Replace `handleRemoveRecentFolder` with:

```tsx
  const handleRemoveHistory = useCallback(
    (path: string) => {
      updateConfig({ folderHistory: removeFromFolderHistory(config.folderHistory, path) });
      void save();
    },
    [config.folderHistory, updateConfig, save],
  );
```

- Delete the `recentFolders` memo. In `handleRescan`, replace the `cfg.recentFolders[0]` / `cfg.recursionMode` reads with:

```tsx
    const entry = cfg.folderHistory[0];
    if (!entry) return;
    const results = await scanDirectory(fs, entry.path, cfg.movieExtensions, entry.depth, {
      detectDvd: cfg.detectDvd,
    });
```

- Render: delete the `view === 'folderBrowser'` block and the `view === 'process'` condition (the renamer div always renders; keep its `data-testid="renamer-view"` wrapper); append alongside the other modals:

```tsx
      <OpenFolderModal
        visible={showOpenFolder}
        history={config.folderHistory}
        onClose={() => setShowOpenFolder(false)}
        onSelect={handleFolderSelected}
        onRemove={handleRemoveHistory}
      />
```

- [ ] **Step 3: Remove the legacy field.** Delete `recentFolders: string[];` from `ZeebConfig` and `recentFolders: [],` from `DEFAULT_CONFIG`. (The migration in `configStore.load()` reads it from raw JSON, which stays valid.) Delete `src/renderer/components/FolderBrowser.tsx`. Before deleting its test file, diff its 10 behaviors against `OpenFolderModal.test.tsx` (all are re-covered: path input, recursion selector + tooltips, select callback, disabled states, history click, note text); then delete `__tests__/components/FolderBrowser.test.tsx`.

```bash
git rm src/renderer/components/FolderBrowser.tsx __tests__/components/FolderBrowser.test.tsx
```

- [ ] **Step 4: Run the target tests, then the full suite**

Run: `npx vitest run __tests__/App.test.tsx __tests__/renderer/App.test.tsx` → PASS.
Run: `npm test` → PASS. If any other test referenced `recentFolders` or the removed view switch, update it to the new model (never delete). Run: `npx tsc --noEmit` → no NEW errors (the `recentFolders` removal is the likely ripple source — fix every site by switching to `folderHistory`).

- [ ] **Step 5: Add the failure-path test (RED then GREEN).** Append to `__tests__/App.test.tsx`:

```tsx
  it('keeps the modal open and toasts when a scan fails', async () => {
    (mockFs.readdir as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('nope'));
    renderApp();
    fireEvent.change(screen.getByTestId('folder-path-input'), { target: { value: 'D:\\bad' } });
    fireEvent.click(screen.getByTestId('list-movies-button'));
    await screen.findByText('Folder listing failed');
    expect(screen.getByTestId('open-folder-modal')).toBeDefined();
  });
```

(Adapt the fs-mock spelling to the file's existing `mockFs` helper; `NotificationToast` is already rendered by App.) Run RED if the handler lacks the try/catch, GREEN once wired.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/App.tsx src/types/index.ts src/services/configDefaults.ts __tests__/App.test.tsx __tests__/renderer/App.test.tsx
git commit -m "feat: open folders through the modal and retire the folder browser view"
```

---

### Task 4: Verification + changelog

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1:** `npm test` → all green. `npx tsc --noEmit` → no NEW errors vs baseline. `npm run lint` → 0 errors, no new warnings.
- [ ] **Step 2:** Add a new `## [Unreleased]` section at the top of `CHANGELOG.md` (above `## [4.1.0]`, which is staged for release and must not absorb this):

```markdown
## [Unreleased]

### Changed
- Opening a movie folder is now a modal (startup and Ctrl+O) with one-touch history: each remembered folder keeps its own scan depth, file count, and last-scanned time
```

- [ ] **Step 3:** Commit:

```bash
git add CHANGELOG.md
git commit -m "docs: note open folder modal in changelog"
```

- [ ] **Step 4:** Visual check with `npm start` against `tmp/zeeb-final-design.dc.html`: modal at startup over the empty window (both themes), segmented depth staging, ▶ one-touch scan, path-click staging, × removal, meta text, Escape/× close leaving the list intact, Ctrl+O reopen.
- [ ] **Step 5:** Final whole-branch review (requesting-code-review template), then superpowers:finishing-a-development-branch — merge only with user approval, never push.
