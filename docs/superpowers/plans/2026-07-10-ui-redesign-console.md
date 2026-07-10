# Zeeb Console UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Console" dark/light redesign from `docs/superpowers/specs/2026-07-10-ui-redesign-console-design.md`: semantic theme tokens, restyled SearchPart chips with drag merge/reorder, toggle switches, and enriched search-result rows.

**Architecture:** CSS-variable theme tokens registered via Tailwind 4 `@theme inline`, switched by a `data-theme` attribute on `<html>` (dark/light/system via Electron `nativeTheme`). New behavior (parser separators, store merge/reorder, theme resolution) is TDD'd; pure restyles are token class swaps verified by the full suite plus visual comparison to the mock.

**Tech Stack:** Electron 41 + React 19 + TypeScript, Tailwind CSS 4 (CSS-first config in `src/renderer/index.css`), Zustand, Vitest + Testing Library (jsdom).

## Global Constraints

- **Windows shell rules:** ONE command per Bash call. Never chain with `&&`, `||`, or `;`. Never use `cd X && cmd` — set the working directory separately. Avoid `sed`, `tee`, PowerShell, `$?`, and `$VAR` unless unavoidable. Do not pass Windows-style paths (`C:\...`) to bash commands like `ls`; use forward slashes.
- **Temp files:** use the gitignored `./tmp/` folder in the project root. Use `node` (not python) for any scripting.
- **Git:** conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Run git commands one at a time; check `git status --short` after operations that modify files. **NEVER push to origin** — local commits only.
- **Testing:** full suite is `npm test` (vitest run). Single file: `npx vitest run __tests__/path/file.test.ts`. Never delete existing tests — update them. Mock all IPC/network; never hit real APIs.
- **Design references:** visual ground truth is `tmp/zeeb-final-design.dc.html` (open in a browser; the chip strip section is templated and only renders in the Claude Design canvas, but all its exact values are inlined in the tasks below). Token/measurement source of truth: `docs/superpowers/specs/2026-07-10-ui-redesign-upstream-spec.md`.
- **Visual tasks (1, 9, 11, 12):** invoke the `frontend-design:frontend-design` skill before writing UI code.
- **No hover-dependent affordances.** Every control visible at rest; hover may only add feedback (e.g. slight bg change), never reveal functionality.
- Density stays: rows `py-0.5`, body text 11px. Filenames/chips/pills/preview use `font-mono` (Tailwind's default mono stack is `ui-monospace…` — do not define a custom font).
- The pre-existing dirty files `src/main/squirrelHandler.ts`, `__tests__/main/squirrelHandler.test.ts`, `test-data_bad/` are unrelated WIP. Never stage, commit, or revert them. Stage files for commits explicitly by path — never `git add -A` or `git add .`.

---

### Task 1: Theme tokens + themed shell

**Files:**
- Modify: `src/renderer/index.css` (currently just `@import "tailwindcss";`)
- Modify: `index.html`

**Interfaces:**
- Produces: Tailwind color utilities used by every later task: `surface`, `panel`, `raised`, `well`, `line`, `line-subtle`, `ink`, `ink-bright`, `ink-2`, `ink-dim`, `ink-faint`, `accent`, `on-accent`, `accent-muted`, `row-selected`, `toggle-off`, `toggle-knob-off`, `chip`, `ghost`, `part-search`, `part-keep`, `part-keep-always`, `part-remove`, `part-remove-always`, `pill-year-bg`, `pill-year-fg`, `pill-year-line` (usable as `bg-surface`, `text-ink-dim`, `border-line`, etc.), plus a `section-header` utility class.

- [ ] **Step 1: Replace `src/renderer/index.css` with the token system**

```css
@import "tailwindcss";

@theme inline {
  --color-surface: var(--z-surface);
  --color-panel: var(--z-panel);
  --color-raised: var(--z-raised);
  --color-well: var(--z-well);
  --color-line: var(--z-line);
  --color-line-subtle: var(--z-line-subtle);
  --color-ink: var(--z-ink);
  --color-ink-bright: var(--z-ink-bright);
  --color-ink-2: var(--z-ink-2);
  --color-ink-dim: var(--z-ink-dim);
  --color-ink-faint: var(--z-ink-faint);
  --color-accent: var(--z-accent);
  --color-on-accent: var(--z-on-accent);
  --color-accent-muted: var(--z-accent-muted);
  --color-row-selected: var(--z-row-selected);
  --color-toggle-off: var(--z-toggle-off);
  --color-toggle-knob-off: var(--z-toggle-knob-off);
  --color-chip: var(--z-chip);
  --color-ghost: var(--z-ghost);
  --color-part-search: var(--z-part-search);
  --color-part-keep: var(--z-part-keep);
  --color-part-keep-always: var(--z-part-keep-always);
  --color-part-remove: var(--z-part-remove);
  --color-part-remove-always: var(--z-part-remove-always);
  --color-pill-year-bg: var(--z-pill-year-bg);
  --color-pill-year-fg: var(--z-pill-year-fg);
  --color-pill-year-line: var(--z-pill-year-line);
}

/* Dark is the default theme (spec: dark primary). */
:root,
:root[data-theme='dark'] {
  --z-surface: #1b1d20;
  --z-panel: #1b1d20;
  --z-raised: #222428;
  --z-well: #17181b;
  --z-line: #33363b;
  --z-line-subtle: #33363b;
  --z-ink: #d7dade;
  --z-ink-bright: #e3ecf5;
  --z-ink-2: #a9aeb5;
  --z-ink-dim: #8b9098;
  --z-ink-faint: #6b7076;
  --z-accent: #4da3ff;
  --z-on-accent: #101214;
  --z-accent-muted: #38618c;
  --z-row-selected: #24384f;
  --z-toggle-off: #3c4046;
  --z-toggle-knob-off: #8b9098;
  --z-chip: #232529;
  --z-ghost: #5c6167;
  --z-part-search: #4da3ff;
  --z-part-keep: #4bbf6b;
  --z-part-keep-always: #35d07f;
  --z-part-remove: #f0655e;
  --z-part-remove-always: #b93832;
  --z-pill-year-bg: #173d24;
  --z-pill-year-fg: #4bbf6b;
  --z-pill-year-line: #2f6b42;
}

:root[data-theme='light'] {
  --z-surface: #f5f6f7;
  --z-panel: #ffffff;
  --z-raised: #f5f6f7;
  --z-well: #e9eaec;
  --z-line: #d8dadd;
  --z-line-subtle: #e4e6e8;
  --z-ink: #26282c;
  --z-ink-bright: #1d2530;
  --z-ink-2: #565b62;
  --z-ink-dim: #70757c;
  --z-ink-faint: #9aa0a6;
  --z-accent: #2a78d6;
  --z-on-accent: #ffffff;
  --z-accent-muted: #a9c9ea;
  --z-row-selected: #dcebfa;
  --z-toggle-off: #c9ccd0;
  --z-toggle-knob-off: #ffffff;
  --z-chip: #ffffff;
  --z-ghost: #9aa0a6;
  --z-part-search: #2a78d6;
  --z-part-keep: #2c9a4f;
  --z-part-keep-always: #157347;
  --z-part-remove: #d64541;
  --z-part-remove-always: #a32e2a;
  --z-pill-year-bg: #e2f3e8;
  --z-pill-year-fg: #157347;
  --z-pill-year-line: #9fd3ae;
}

/* 10px bold uppercase section headers (spec §1) */
@utility section-header {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--z-ink-dim);
}
```

- [ ] **Step 2: Theme the shell in `index.html`**

Replace the `<html>` and `<body>` open tags:

```html
<html lang="en" data-theme="dark">
```

```html
<body class="bg-surface text-ink m-0 h-screen overflow-hidden">
```

(First paint is always dark; the config load in Task 6 corrects it. This is the accepted launch-flash limitation from the spec.)

- [ ] **Step 3: Verify the app still builds and the suite passes**

Run: `npm test`
Expected: all tests pass (no component uses the tokens yet; this catches CSS syntax errors via the Vite pipeline used in component tests — if the CSS is not exercised by tests, also run `npm run lint`).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/index.css index.html
git commit -m "feat: add console theme token system with dark/light palettes"
```

---

### Task 2: Config fields `theme` and `showResultThumbnails`

**Files:**
- Modify: `src/types/index.ts` (ZeebConfig, ~line 104)
- Modify: `src/services/configDefaults.ts`
- Test: `__tests__/stores/configStore.test.ts`

**Interfaces:**
- Produces: `ZeebConfig.theme: 'dark' | 'light' | 'system'` (default `'dark'`), `ZeebConfig.showResultThumbnails: boolean` (default `true`). Tasks 6, 7, 8 consume these via `useConfigStore((s) => s.config)`.

- [ ] **Step 1: Write the failing test** — append to the existing `describe` in `__tests__/stores/configStore.test.ts`:

```ts
it('defaults theme to dark and result thumbnails to on', () => {
  expect(DEFAULT_CONFIG.theme).toBe('dark');
  expect(DEFAULT_CONFIG.showResultThumbnails).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/stores/configStore.test.ts`
Expected: FAIL (property `theme` does not exist / is undefined).

- [ ] **Step 3: Add the fields**

In `src/types/index.ts`, inside `ZeebConfig` after the `showWebView: boolean;` line:

```ts
  theme: 'dark' | 'light' | 'system';
  showResultThumbnails: boolean;
```

In `src/services/configDefaults.ts`, after `showWebView: false,`:

```ts
  theme: 'dark',
  showResultThumbnails: true,
```

- [ ] **Step 4: Run the suite** (type changes can ripple)

Run: `npm test`
Expected: PASS (existing tests build configs via `...DEFAULT_CONFIG` spreads, so no other updates are needed).

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/services/configDefaults.ts __tests__/stores/configStore.test.ts
git commit -m "feat: add theme and result-thumbnail settings to config"
```

---

### Task 3: `MovieMatch.stars` from the suggest API

**Files:**
- Modify: `src/types/index.ts` (MovieMatch, ~line 29)
- Modify: `src/main/ipc.ts:91-99` (suggest mapping)
- Test: `__tests__/main/ipc.test.ts`

**Interfaces:**
- Produces: `MovieMatch.stars: string | null` — the IMDB suggest `s` field (e.g. `"Tim Robbins, Morgan Freeman"`). Task 8 renders it.

- [ ] **Step 1: Write the failing test.** Read `__tests__/main/ipc.test.ts` first; extend the existing `imdb:suggest` test's mocked fetch response so one item includes `s: 'Georges Méliès'` and one omits it, then assert:

```ts
expect(results[0].stars).toBe('Georges Méliès');
expect(results[1].stars).toBeNull();
```

(Adapt fixture names to the file's existing style; keep all current assertions.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/main/ipc.test.ts`
Expected: FAIL (`stars` is `undefined`).

- [ ] **Step 3: Implement.** In `src/types/index.ts` add to `MovieMatch`:

```ts
  stars: string | null;
```

In `src/main/ipc.ts`, extend the suggest `.map()`:

```ts
      .map((item: any) => ({
        tt: item.id,
        title: item.l || '',
        year: item.y ?? null,
        aka: null,
        thumbnailUrl: item.i?.imageUrl ?? null,
        stars: item.s ?? null,
      }));
```

- [ ] **Step 4: Fix compile fallout in tests.** `MovieMatch` literals now need `stars`. Known sites: `__tests__/components/MovieResults.test.tsx` (add `stars: null` to both fixtures — Task 8 rewrites this file anyway) and any other literal the type-checker flags. Vitest does NOT type-check, so find them with:

Run: `npx tsc --noEmit`
Expected: errors point at each `MovieMatch` literal; add `stars: null` (or a string where a test wants one) until clean.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/main/ipc.ts __tests__
git commit -m "feat: map stars credit line from imdb suggest results"
```

---

### Task 4: Parser retains `separatorAfter`

**Files:**
- Modify: `src/types/index.ts` (SearchPart, ~line 5)
- Modify: `src/services/filenameParser.ts`
- Test: `__tests__/services/filenameParser.test.ts`

**Interfaces:**
- Produces: `SearchPart.separatorAfter?: string` — the raw separator run that followed the token in the original filename; `''` for the last token. Optional in the type so existing `SearchPart` literals compile, but `parseFilename` always sets it. Task 5's `mergeParts` consumes it.

- [ ] **Step 1: Write the failing tests** — append to `__tests__/services/filenameParser.test.ts`:

```ts
describe('separatorAfter', () => {
  it('captures the separator run following each token', () => {
    const parts = parseFilename('A.Trip_to the-Moon.1902.mkv', [], []);
    expect(parts.map((p) => p.separatorAfter)).toEqual(['.', '_', ' ', '-', '.', '']);
  });

  it('captures multi-character separator runs', () => {
    const parts = parseFilename('Foo..-..Bar.mkv', [], []);
    expect(parts.map((p) => p.separatorAfter)).toEqual(['..-..', '']);
  });

  it('multi-token keep terms take the separator after their last token', () => {
    const parts = parseFilename('Movie.Final.Cut.2001.mkv', [], [['Final Cut', 'Final Cut']]);
    const keep = parts.find((p) => p.text === 'Final Cut');
    expect(keep?.separatorAfter).toBe('.');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/services/filenameParser.test.ts`
Expected: FAIL (`separatorAfter` undefined).

- [ ] **Step 3: Implement.** In `src/types/index.ts` add to `SearchPart`:

```ts
  separatorAfter?: string;
```

Rewrite the tokenization in `src/services/filenameParser.ts`. Replace:

```ts
  const stripped = filename.replace(/\.[a-zA-Z0-9]{2,4}$/, '');
  const tokens = stripped.split(/[.\s_-]+/).filter(Boolean);
  if (tokens.length === 0) return [];
```

with:

```ts
  const stripped = filename.replace(/\.[a-zA-Z0-9]{2,4}$/, '');
  const pieces: Array<{ token: string; sep: string }> = [];
  for (const m of stripped.matchAll(/([^.\s_-]+)([.\s_-]*)/g)) {
    pieces.push({ token: m[1], sep: m[2] ?? '' });
  }
  if (pieces.length === 0) return [];
  const tokens = pieces.map((p) => p.token);
```

Then thread separators into the two `parts.push` sites:
- Multi-token keep-term branch (`parts.push({ id: ..., text: display, originalText: match, state: 'keep', editable: true })`) becomes:

```ts
        parts.push({
          id: String(idCounter++),
          text: display,
          originalText: match,
          state: 'keep',
          editable: true,
          separatorAfter: pieces[i + termWords.length - 1].sep,
        });
```

- Single-token push (`parts.push({ id: String(idCounter++), text, originalText: token, state, editable: true })`) becomes:

```ts
    parts.push({
      id: String(idCounter++),
      text,
      originalText: token,
      state,
      editable: true,
      separatorAfter: pieces[i].sep,
    });
```

The last token's trailing `sep` is naturally `''` unless the stripped name ends in separators — either value is acceptable (merge falls back on empty).

- [ ] **Step 4: Run the parser tests, then the full suite**

Run: `npx vitest run __tests__/services/filenameParser.test.ts`
Expected: PASS (all pre-existing cases too — tokenization behavior is unchanged).
Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/services/filenameParser.ts __tests__/services/filenameParser.test.ts
git commit -m "feat: retain token separators in filename parsing"
```

---

### Task 5: Store actions `mergeParts` / `reorderParts`

**Files:**
- Modify: `src/stores/renamerStore.ts`
- Test: `__tests__/stores/renamerStore.test.ts`

**Interfaces:**
- Consumes: `SearchPart.separatorAfter` (Task 4).
- Produces: `mergeParts(sourceId: string, targetId: string): void` and `reorderParts(sourceId: string, targetIndex: number): void` on the renamer store. **`targetIndex` is the insertion index in the array AFTER the source is removed** (matches the dnd hit-test in Task 10). Merge semantics: merged text = earlier-in-array part's `text` + its `separatorAfter` (fallback `'.'` when empty/undefined) + later part's `text`; merged part keeps the **target's** `id`, `state`, `originalText`, `editable`; `separatorAfter` = the later part's; result sits at the earlier index. Merging never writes to config.

- [ ] **Step 1: Write the failing tests** — append to `__tests__/stores/renamerStore.test.ts` (match the file's existing store-creation helper style; ensure `SearchPart` and `SearchPartState` are imported from `'../../src/types'`):

```ts
const mkPart = (id: string, text: string, sep = '.', state: SearchPartState = 'search'): SearchPart =>
  ({ id, text, originalText: text, state, editable: true, separatorAfter: sep });

describe('mergeParts', () => {
  it('joins with the earlier part separator regardless of drag direction', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([mkPart('0', 'DDP5'), mkPart('1', '1')]);
    store.getState().mergeParts('1', '0'); // drag "1" onto "DDP5"
    const parts = store.getState().searchParts;
    expect(parts).toHaveLength(1);
    expect(parts[0].text).toBe('DDP5.1');
  });

  it('keeps the drop target state and id', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([mkPart('0', 'DDP5', '.', 'remove'), mkPart('1', '1', '.', 'keep')]);
    store.getState().mergeParts('0', '1'); // drag "DDP5" onto "1"
    const parts = store.getState().searchParts;
    expect(parts[0].id).toBe('1');
    expect(parts[0].state).toBe('keep');
    expect(parts[0].text).toBe('DDP5.1');
  });

  it('falls back to "." when the earlier separator is empty', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([mkPart('0', 'AV1', ''), mkPart('1', 'YIFY', '')]);
    store.getState().mergeParts('0', '1');
    expect(store.getState().searchParts[0].text).toBe('AV1.YIFY');
  });

  it('adopts the later part separatorAfter and ignores bad ids', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([mkPart('0', 'a', '-'), mkPart('1', 'b', '_')]);
    store.getState().mergeParts('0', 'nope');
    expect(store.getState().searchParts).toHaveLength(2);
    store.getState().mergeParts('0', '1');
    expect(store.getState().searchParts[0].separatorAfter).toBe('_');
  });
});

describe('reorderParts', () => {
  it('moves a part to the given post-removal index', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([mkPart('0', 'a'), mkPart('1', 'b'), mkPart('2', 'c')]);
    store.getState().reorderParts('0', 2); // a to the end
    expect(store.getState().searchParts.map((p) => p.text)).toEqual(['b', 'c', 'a']);
    store.getState().reorderParts('2', 0); // c (id '2') to the front
    expect(store.getState().searchParts.map((p) => p.text)).toEqual(['c', 'b', 'a']);
  });

  it('clamps out-of-range indexes and ignores unknown ids', () => {
    const store = createRenamerStore();
    store.getState().setSearchParts([mkPart('0', 'a'), mkPart('1', 'b')]);
    store.getState().reorderParts('0', 99);
    expect(store.getState().searchParts.map((p) => p.text)).toEqual(['b', 'a']);
    store.getState().reorderParts('nope', 0);
    expect(store.getState().searchParts.map((p) => p.text)).toEqual(['b', 'a']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/stores/renamerStore.test.ts`
Expected: FAIL (`mergeParts is not a function`).

- [ ] **Step 3: Implement** in `src/stores/renamerStore.ts`. Add to the interface:

```ts
  mergeParts: (sourceId: string, targetId: string) => void;
  reorderParts: (sourceId: string, targetIndex: number) => void;
```

Add to the store body (after `updatePartText`):

```ts
    mergeParts(sourceId: string, targetId: string) {
      set((s) => {
        const parts = s.searchParts;
        const si = parts.findIndex((p) => p.id === sourceId);
        const ti = parts.findIndex((p) => p.id === targetId);
        if (si < 0 || ti < 0 || si === ti) return s;
        const first = parts[Math.min(si, ti)];
        const second = parts[Math.max(si, ti)];
        const target = parts[ti];
        const merged: SearchPart = {
          ...target,
          text: `${first.text}${first.separatorAfter || '.'}${second.text}`,
          separatorAfter: second.separatorAfter,
        };
        const result = parts.filter((_, i) => i !== si && i !== ti);
        result.splice(Math.min(si, ti), 0, merged);
        return { searchParts: result };
      });
    },

    reorderParts(sourceId: string, targetIndex: number) {
      set((s) => {
        const si = s.searchParts.findIndex((p) => p.id === sourceId);
        if (si < 0) return s;
        const moved = s.searchParts[si];
        const rest = s.searchParts.filter((_, i) => i !== si);
        const idx = Math.max(0, Math.min(targetIndex, rest.length));
        rest.splice(idx, 0, moved);
        return { searchParts: rest };
      });
    },
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run __tests__/stores/renamerStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/renamerStore.ts __tests__/stores/renamerStore.test.ts
git commit -m "feat: add merge and reorder actions for search parts"
```

---

### Task 6: Theme plumbing end-to-end (menu, IPC, hook, Options)

**Files:**
- Modify: `src/main/index.ts` (View menu ~line 81-103; ipcMain listeners ~line 132)
- Modify: `src/main/ipc.ts` (add `theme:get-system` handler)
- Modify: `src/preload/main.ts`
- Modify: `src/types/electron.d.ts`
- Modify: `src/adapters/platform.ts`
- Create: `src/renderer/hooks/useTheme.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/options/GeneralSection.tsx`
- Test: `__tests__/renderer/hooks/useTheme.test.ts` (create), `__tests__/components/options/GeneralSection.test.tsx`

**Interfaces:**
- Consumes: `ZeebConfig.theme` (Task 2).
- Produces:
  - `PlatformAdapter.theme: { getSystemIsDark(): Promise<boolean>; onSystemThemeChanged(cb: (isDark: boolean) => void): () => void }`
  - `MenuAdapter.onSetTheme(cb: (theme: 'dark' | 'light' | 'system') => void): void` and `MenuAdapter.sendThemeState(theme: string): void`
  - `useTheme(theme: 'dark' | 'light' | 'system', platform: PlatformAdapter): void` — sets `data-theme` on `document.documentElement`; unknown values resolve to dark.

- [ ] **Step 1: Write the failing hook test** — create `__tests__/renderer/hooks/useTheme.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme, type ThemeSetting } from '../../../src/renderer/hooks/useTheme';
import { createMockPlatformAdapter } from '../../../src/adapters/platform';

describe('useTheme', () => {
  it('applies explicit dark and light themes', () => {
    const platform = createMockPlatformAdapter();
    const { rerender } = renderHook(({ t }) => useTheme(t, platform), {
      initialProps: { t: 'dark' as ThemeSetting },
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    rerender({ t: 'light' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('resolves system from the platform and follows live changes', async () => {
    let listener: (isDark: boolean) => void = () => {};
    const platform = createMockPlatformAdapter({
      theme: {
        getSystemIsDark: async () => false,
        onSystemThemeChanged: (cb: (isDark: boolean) => void) => {
          listener = cb;
          return () => {};
        },
      },
    });
    renderHook(() => useTheme('system', platform));
    await act(async () => {});
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    act(() => listener(true));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('falls back to dark for unknown values', () => {
    const platform = createMockPlatformAdapter();
    renderHook(() => useTheme('purple' as never, platform));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/renderer/hooks/useTheme.test.ts`
Expected: FAIL (module `useTheme` not found).

- [ ] **Step 3: Implement the hook** — create `src/renderer/hooks/useTheme.ts`:

```ts
import { useEffect, useState } from 'react';
import type { PlatformAdapter } from '../../adapters/platform';

export type ThemeSetting = 'dark' | 'light' | 'system';

export function useTheme(theme: ThemeSetting, platform: PlatformAdapter): void {
  const [systemDark, setSystemDark] = useState(true);

  useEffect(() => {
    if (theme !== 'system') return;
    let mounted = true;
    void platform.theme.getSystemIsDark().then((isDark) => {
      if (mounted) setSystemDark(isDark);
    });
    return () => {
      mounted = false;
    };
  }, [theme, platform]);

  useEffect(() => {
    return platform.theme.onSystemThemeChanged(setSystemDark);
  }, [platform]);

  useEffect(() => {
    const resolved =
      theme === 'light' ? 'light'
      : theme === 'system' ? (systemDark ? 'dark' : 'light')
      : 'dark';
    document.documentElement.setAttribute('data-theme', resolved);
  }, [theme, systemDark]);
}
```

- [ ] **Step 4: Add the adapters.** In `src/adapters/platform.ts`:

Add to `MenuAdapter`:

```ts
  onSetTheme(cb: (theme: 'dark' | 'light' | 'system') => void): void;
  sendThemeState(theme: string): void;
```

Add a new interface + field on `PlatformAdapter`:

```ts
export interface ThemeAdapter {
  getSystemIsDark(): Promise<boolean>;
  onSystemThemeChanged(cb: (isDark: boolean) => void): () => void;
}
```

```ts
  theme: ThemeAdapter;
```

In `createElectronPlatformAdapter()` add to `menu`:

```ts
      onSetTheme: (cb) => window.zeebMenu.onSetTheme(cb),
      sendThemeState: (theme) => window.zeebMenu.sendThemeState(theme),
```

and a top-level:

```ts
    theme: {
      getSystemIsDark: () => window.zeebTheme.getSystemIsDark(),
      onSystemThemeChanged: (cb) => window.zeebTheme.onSystemThemeChanged(cb),
    },
```

In `createMockPlatformAdapter` defaults add to `menu`:

```ts
      onSetTheme: () => {},
      sendThemeState: () => {},
```

and top-level:

```ts
    theme: {
      getSystemIsDark: async () => true,
      onSystemThemeChanged: () => () => {},
    },
```

and to the return merge:

```ts
    theme: { ...defaults.theme, ...(overrides.theme ?? {}) },
```

- [ ] **Step 5: Preload + typings.** In `src/preload/main.ts`, add inside the `zeebMenu` bridge:

```ts
  onSetTheme: (callback: (theme: string) => void) =>
    ipcRenderer.on('menu:set-theme', (_event, theme: string) => callback(theme)),
  sendThemeState: (theme: string) => ipcRenderer.send('theme-state', theme),
```

and a new bridge after `zeebMenu`:

```ts
contextBridge.exposeInMainWorld('zeebTheme', {
  getSystemIsDark: () => ipcRenderer.invoke('theme:get-system'),
  onSystemThemeChanged: (callback: (isDark: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isDark: boolean) => callback(isDark);
    ipcRenderer.on('theme:system-changed', handler);
    return () => ipcRenderer.removeListener('theme:system-changed', handler);
  },
});
```

In `src/types/electron.d.ts` add to the `zeebMenu` block:

```ts
    onSetTheme(callback: (theme: 'dark' | 'light' | 'system') => void): void;
    sendThemeState(theme: string): void;
```

and a new window property:

```ts
  zeebTheme: {
    getSystemIsDark(): Promise<boolean>;
    onSystemThemeChanged(callback: (isDark: boolean) => void): () => void;
  };
```

- [ ] **Step 6: Main process.** In `src/main/ipc.ts`, import `nativeTheme` from `'electron'` and register:

```ts
  ipcMain.handle('theme:get-system', () => nativeTheme.shouldUseDarkColors);
```

In `src/main/index.ts`:
- View menu — insert a Theme submenu directly after the `toggle-webview` item (before its trailing `{ type: 'separator' }`):

```ts
        {
          label: 'Theme',
          submenu: [
            { id: 'theme-dark', label: 'Dark', type: 'radio', checked: true,
              click: () => mainWindow.webContents.send('menu:set-theme', 'dark') },
            { id: 'theme-light', label: 'Light', type: 'radio',
              click: () => mainWindow.webContents.send('menu:set-theme', 'light') },
            { id: 'theme-system', label: 'System', type: 'radio',
              click: () => mainWindow.webContents.send('menu:set-theme', 'system') },
          ],
        },
```

- Next to the existing `ipcMain.on('webview-state', ...)` listener add:

```ts
  ipcMain.on('theme-state', (_event, theme: string) => {
    const item = menu.getMenuItemById(`theme-${theme}`);
    if (item) item.checked = true;
  });
```

- Import `nativeTheme` in the electron import and, inside `createWindow` after `Menu.setApplicationMenu(menu)`, push live changes:

```ts
  nativeTheme.on('updated', () => {
    mainWindow.webContents.send('theme:system-changed', nativeTheme.shouldUseDarkColors);
  });
```

- [ ] **Step 7: Wire the renderer.** In `src/renderer/App.tsx`:
- Import: `import { useTheme } from './hooks/useTheme';`
- After `const config = useConfigStore((s) => s.config);` add:

```ts
  useTheme(config.theme, platform);
```

- Inside the existing menu-listener `useEffect` (the one registering `platform.menu.onOptions(...)`) add:

```ts
    platform.menu.onSetTheme((t) => {
      const store = useConfigStore.getState();
      store.updateConfig({ theme: t });
      void store.save();
    });
```

- Add a sync effect after the menu effect (keeps the radio checkmarks true after load and Options changes):

```ts
  useEffect(() => {
    platform.menu.sendThemeState(config.theme);
  }, [config.theme, platform]);
```

- [ ] **Step 8: Options select — failing test first.** Append to `__tests__/components/options/GeneralSection.test.tsx` (add any missing imports — `fireEvent`, `DEFAULT_CONFIG` — following the file's existing style):

```tsx
it('changes the theme via the appearance select', () => {
  const updateConfig = vi.fn();
  render(<GeneralSection config={DEFAULT_CONFIG} updateConfig={updateConfig} />);
  fireEvent.change(screen.getByTestId('theme-select'), { target: { value: 'light' } });
  expect(updateConfig).toHaveBeenCalledWith({ theme: 'light' });
});
```

Run: `npx vitest run __tests__/components/options/GeneralSection.test.tsx`
Expected: FAIL (no `theme-select`).

- [ ] **Step 9: Add the select.** In `src/renderer/components/options/GeneralSection.tsx`, add a new block above "Title Handling":

```tsx
      <div>
        <h3 className="text-sm font-bold text-ink mb-3">Appearance</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-ink-2 w-40">Theme:</label>
          <select
            data-testid="theme-select"
            className="border border-line rounded px-2 py-1 text-sm w-32 bg-panel text-ink"
            value={config.theme}
            onChange={(e) => updateConfig({ theme: e.target.value as ZeebConfig['theme'] })}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>
```

- [ ] **Step 10: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/main/index.ts src/main/ipc.ts src/preload/main.ts src/types/electron.d.ts src/adapters/platform.ts src/renderer/hooks/useTheme.ts src/renderer/App.tsx src/renderer/components/options/GeneralSection.tsx __tests__/renderer/hooks/useTheme.test.ts __tests__/components/options/GeneralSection.test.tsx
git commit -m "feat: add dark/light/system theme switching via menu, options, and nativeTheme"
```

---

### Task 7: `Toggle` component + header switches

**Files:**
- Create: `src/renderer/components/ui/Toggle.tsx`
- Modify: `src/renderer/components/Renamer.tsx` (Movie Files header ~line 300-311; Search Results header ~line 320-322)
- Test: `__tests__/components/ui/Toggle.test.tsx` (create)

**Interfaces:**
- Consumes: token utilities (Task 1), `config.showResultThumbnails` (Task 2).
- Produces: `Toggle` — `{ checked: boolean; onChange: (checked: boolean) => void; label?: string; title?: string; 'data-testid'?: string }`. Renamer passes `showResultThumbnails` down to `MovieResults` in Task 8.

- [ ] **Step 1: Write the failing test** — create `__tests__/components/ui/Toggle.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { Toggle } from '../../../src/renderer/components/ui/Toggle';

describe('Toggle', () => {
  it('reflects checked state via role=switch', () => {
    render(<Toggle checked={true} onChange={vi.fn()} label="TT" />);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('TT')).toBeDefined();
  });

  it('reports the inverted value on click', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Sample" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/components/ui/Toggle.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — create `src/renderer/components/ui/Toggle.tsx` (22×12px pill, radius 6px, knob 8px; label brightens when on — spec §3):

```tsx
import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  title?: string;
  'data-testid'?: string;
}

export function Toggle({ checked, onChange, label, title, 'data-testid': testId }: ToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      data-testid={testId}
      className="flex items-center gap-1 shrink-0 cursor-pointer select-none"
      onClick={() => onChange(!checked)}
    >
      {label && (
        <span className={`text-[10px] ${checked ? 'text-ink' : 'text-ink-dim'}`}>{label}</span>
      )}
      <span className={`relative w-[22px] h-3 rounded-md ${checked ? 'bg-accent' : 'bg-toggle-off'}`}>
        <span
          className={`absolute top-[2px] w-2 h-2 rounded-full ${
            checked ? 'right-[2px] bg-on-accent' : 'left-[2px] bg-toggle-knob-off'
          }`}
        />
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/components/ui/Toggle.test.tsx`
Expected: PASS.

- [ ] **Step 5: Replace the header checkboxes in `Renamer.tsx`.** Import `{ Toggle } from './ui/Toggle';`. Replace the Movie Files header `<div>` (the one containing the two `<label>` checkboxes) with:

```tsx
          <div className="flex items-center gap-2 px-2 py-1 bg-raised text-ink-2 border-b border-line shrink-0">
            <span className="section-header">Movie Files</span>
            <span className="flex-1" />
            <span className="text-[10px] text-ink-faint">Filters</span>
            <Toggle label="TT" data-testid="tt-toggle" checked={showTt ?? false} onChange={(v) => onShowTtChange?.(v)} />
            <Toggle label="Sample" data-testid="sample-toggle" checked={showSample ?? false} onChange={(v) => onShowSampleChange?.(v)} />
          </div>
```

Replace the Search Results header block:

```tsx
          <div className="border-t border-line shrink-0">
            <div className="flex items-center gap-2 px-2 py-1 bg-raised">
              <span className="section-header">Search Results</span>
              <span className="flex-1" />
              <Toggle
                label="▦"
                title="Toggle poster thumbnails"
                data-testid="thumbs-toggle"
                checked={config.showResultThumbnails}
                onChange={(v) => {
                  updateConfig({ showResultThumbnails: v });
                  void saveConfig();
                }}
              />
            </div>
          </div>
```

- [ ] **Step 6: Run the full suite** (App/Renamer integration tests may touch these headers)

Run: `npm test`
Expected: PASS; fix any test that queried the old checkboxes by updating it to `getByTestId('tt-toggle')` / `getByTestId('sample-toggle')` clicks.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/ui/Toggle.tsx src/renderer/components/Renamer.tsx __tests__/components/ui/Toggle.test.tsx __tests__
git commit -m "feat: replace filter checkboxes with toggle switches and add thumbnail toggle"
```

---

### Task 8: Enriched `MovieResults` rows

**Files:**
- Modify: `src/renderer/components/MovieResults.tsx` (full rewrite)
- Modify: `src/renderer/components/Renamer.tsx` (~line 324-328, pass new props)
- Test: `__tests__/components/MovieResults.test.tsx` (rewrite)

**Interfaces:**
- Consumes: `MovieMatch.stars`/`thumbnailUrl` (Task 3), `SearchPart` (Task 4), tokens (Task 1), `config.showResultThumbnails` (Tasks 2/7).
- Produces: `MovieResultsProps` gains `searchParts?: SearchPart[]` and `showThumbnails?: boolean`. Row layout: `[thumb 22×32] Title [year pill] ···(flex spacer)··· stars`. Year pill fills green when `match.year` equals a 4-digit `part.text`.

- [ ] **Step 1: Rewrite the test file first** — `__tests__/components/MovieResults.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { MovieResults } from '../../src/renderer/components/MovieResults';
import type { MovieMatch, SearchPart } from '../../src/types';

const matches: MovieMatch[] = [
  { tt: 'tt0111161', title: 'The Shawshank Redemption', year: 1994, aka: null, thumbnailUrl: 'https://img.example/shawshank.jpg', stars: 'Tim Robbins, Morgan Freeman' },
  { tt: 'tt0068646', title: 'The Godfather', year: 1972, aka: null, thumbnailUrl: null, stars: null },
];

const parts: SearchPart[] = [
  { id: '0', text: 'Shawshank', originalText: 'Shawshank', state: 'search', editable: true, separatorAfter: '.' },
  { id: '1', text: '1994', originalText: '1994', state: 'remove', editable: true, separatorAfter: '' },
];

describe('MovieResults', () => {
  it('renders titles, year pills, and stars', () => {
    render(<MovieResults matches={matches} onSelect={vi.fn()} searchParts={parts} showThumbnails={true} />);
    expect(screen.getByText('The Shawshank Redemption')).toBeDefined();
    expect(screen.getByText('1994')).toBeDefined();
    expect(screen.getByText('1972')).toBeDefined();
    expect(screen.getByText('Tim Robbins, Morgan Freeman')).toBeDefined();
  });

  it('fills the year pill green only when a part token matches the year', () => {
    render(<MovieResults matches={matches} onSelect={vi.fn()} searchParts={parts} showThumbnails={false} />);
    expect(screen.getByText('1994').className).toContain('bg-pill-year-bg');
    expect(screen.getByText('1972').className).not.toContain('bg-pill-year-bg');
  });

  it('renders thumbnails only when showThumbnails is on', () => {
    const { container, rerender } = render(
      <MovieResults matches={matches} onSelect={vi.fn()} searchParts={parts} showThumbnails={true} />,
    );
    expect(container.querySelectorAll('img')).toHaveLength(1); // only the match with a url
    rerender(<MovieResults matches={matches} onSelect={vi.fn()} searchParts={parts} showThumbnails={false} />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('calls onSelect with tt when a row is tapped', () => {
    const onSelect = vi.fn();
    render(<MovieResults matches={matches} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('The Shawshank Redemption'));
    expect(onSelect).toHaveBeenCalledWith('tt0111161');
  });

  it('shows empty state when no matches', () => {
    render(<MovieResults matches={[]} onSelect={vi.fn()} />);
    expect(screen.getByText('No results')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/components/MovieResults.test.tsx`
Expected: FAIL (pill/stars/thumb assertions).

- [ ] **Step 3: Rewrite `src/renderer/components/MovieResults.tsx`:**

```tsx
import React from 'react';
import type { MovieMatch, SearchPart } from '../../types';

interface MovieResultsProps {
  matches: MovieMatch[];
  onSelect: (tt: string) => void;
  selectedTt?: string;
  searchParts?: SearchPart[];
  showThumbnails?: boolean;
}

function Thumb({ url }: { url: string | null }): React.JSX.Element {
  const [failed, setFailed] = React.useState(false);
  return (
    <span className="w-[22px] h-8 shrink-0 border border-line rounded-[2px] bg-well overflow-hidden">
      {url && !failed && (
        <img src={url} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

export function MovieResults({
  matches,
  onSelect,
  selectedTt,
  searchParts,
  showThumbnails,
}: MovieResultsProps): React.JSX.Element {
  if (matches.length === 0) {
    return <div className="p-3 text-center text-xs text-ink-faint">No results</div>;
  }

  const yearTokens = new Set(
    (searchParts ?? []).map((p) => p.text.trim()).filter((t) => /^\d{4}$/.test(t)),
  );

  return (
    <div data-testid="movie-results-list" className="overflow-y-auto">
      {matches.map((item) => {
        const selected = selectedTt === item.tt;
        const yearMatched = item.year != null && yearTokens.has(String(item.year));
        return (
          <button
            key={item.tt}
            className={`w-full text-left px-2 py-[3px] flex items-center gap-2 ${selected ? 'bg-row-selected' : ''}`}
            onClick={() => onSelect(item.tt)}
            title={`${item.title}${item.year ? ` (${item.year})` : ''} — ${item.tt}`}
          >
            {showThumbnails && <Thumb url={item.thumbnailUrl} />}
            <span className={`font-semibold text-[11px] truncate ${selected ? 'text-ink-bright' : 'text-ink-2'}`}>
              {item.title || item.tt}
            </span>
            {item.year != null && (
              <span
                className={`font-mono font-bold text-[10px] border rounded-[3px] px-[5px] py-px shrink-0 ${
                  yearMatched
                    ? 'bg-pill-year-bg text-pill-year-fg border-pill-year-line'
                    : 'text-ink-dim border-line'
                }`}
              >
                {item.year}
              </span>
            )}
            {item.aka && (
              <span className="text-[10px] text-ink-faint italic truncate max-w-[30%]">aka {item.aka}</span>
            )}
            <span className="flex-1" />
            {item.stars && (
              <span className="text-[10px] text-ink-faint truncate max-w-[40%] shrink-0">{item.stars}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Pass the new props from `Renamer.tsx`:**

```tsx
            <MovieResults
              matches={movieMatches}
              onSelect={handleMovieSelect}
              selectedTt={selectedTt}
              searchParts={searchParts}
              showThumbnails={config.showResultThumbnails}
            />
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/MovieResults.tsx src/renderer/components/Renamer.tsx __tests__/components/MovieResults.test.tsx
git commit -m "feat: enrich search results with thumbnails, year pills, and stars"
```

---

### Task 9: SearchPartItem chip redesign

**Files:**
- Modify: `src/renderer/components/SearchPartItem.tsx` (full rewrite)
- Modify: `src/renderer/components/SearchParts.tsx` (strip spacing only — full rewrite comes in Task 10)
- Test: `__tests__/components/SearchParts.test.tsx`

**Interfaces:**
- Consumes: tokens (Task 1).
- Produces: `SearchPartItemProps` gains `dragging?: boolean` and `mergeHighlight?: boolean` (Task 10 sets them; default false). Chip root carries `data-part-id={part.id}` for Task 10's hit-testing. Exactly one state button is lit (`aria-pressed="true"`).

- [ ] **Step 1: Write the failing tests** — append to `__tests__/components/SearchParts.test.tsx`:

```tsx
it('lights exactly one state button per chip', () => {
  render(
    <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={vi.fn()} />
  );
  const chip = screen.getByDisplayValue('BluRay').closest('[data-part-id]') as HTMLElement;
  const lit = chip.querySelectorAll('button[aria-pressed="true"]');
  expect(lit).toHaveLength(1);
  expect(lit[0].getAttribute('title')).toBe('Remove');
});

it('changes state from both button rows', () => {
  const onStateChange = vi.fn();
  render(
    <SearchParts parts={parts} onPartStateChange={onStateChange} onPartTextChange={vi.fn()} onSearch={vi.fn()} />
  );
  const chip = screen.getByDisplayValue('Matrix').closest('[data-part-id]') as HTMLElement;
  fireEvent.click(chip.querySelector('button[title="Keep"]')!);
  expect(onStateChange).toHaveBeenCalledWith('1', 'keep');
  fireEvent.click(chip.querySelector('button[title="Never"]')!);
  expect(onStateChange).toHaveBeenCalledWith('1', 'removeAlways');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/SearchParts.test.tsx`
Expected: FAIL (no `[data-part-id]`; old titles are "Remove Always"/"Keep Always").

- [ ] **Step 3: Rewrite `src/renderer/components/SearchPartItem.tsx`** (layout per upstream spec §2 and mock: text row with 2px state underline; big `+ −` row 20×15px; small `? ★ ×` row 13×10px; constant chip bg; tooltips Keep/Remove/Search/Always keep/Never):

```tsx
import React from 'react';
import type { SearchPart, SearchPartState } from '../../types';

interface SearchPartItemProps {
  part: SearchPart;
  onStateChange: (id: string, state: SearchPartState) => void;
  onTextChange: (id: string, text: string) => void;
  dragging?: boolean;
  mergeHighlight?: boolean;
}

const UNDERLINE: Record<SearchPartState, string> = {
  search: 'border-part-search',
  keep: 'border-part-keep',
  keepAlways: 'border-part-keep-always',
  remove: 'border-part-remove',
  removeAlways: 'border-part-remove-always',
};

const TEXT_TREATMENT: Record<SearchPartState, string> = {
  search: 'text-ink-bright',
  keep: 'text-ink',
  keepAlways: 'text-ink',
  remove: 'text-ink-dim line-through',
  removeAlways: 'text-ink-faint line-through',
};

const ACTIVE_FILL: Record<SearchPartState, string> = {
  search: 'bg-part-search text-on-accent',
  keep: 'bg-part-keep text-on-accent',
  keepAlways: 'bg-part-keep-always text-on-accent',
  remove: 'bg-part-remove text-on-accent',
  removeAlways: 'bg-part-remove-always text-white',
};

interface ActionButton {
  label: string;
  state: SearchPartState;
  title: string;
}

const BIG_BUTTONS: ActionButton[] = [
  { label: '+', state: 'keep', title: 'Keep' },
  { label: '−', state: 'remove', title: 'Remove' },
];

const SMALL_BUTTONS: ActionButton[] = [
  { label: '?', state: 'search', title: 'Search' },
  { label: '★', state: 'keepAlways', title: 'Always keep' },
  { label: '×', state: 'removeAlways', title: 'Never' },
];

export function SearchPartItem({
  part,
  onStateChange,
  onTextChange,
  dragging = false,
  mergeHighlight = false,
}: SearchPartItemProps): React.JSX.Element {
  const renderButton = (btn: ActionButton, sizeClass: string): React.JSX.Element => (
    <button
      key={btn.state}
      type="button"
      title={btn.title}
      aria-pressed={part.state === btn.state}
      className={`${sizeClass} flex items-center justify-center rounded-[2px] font-mono font-bold leading-none ${
        part.state === btn.state ? ACTIVE_FILL[btn.state] : 'text-ghost'
      }`}
      onClick={() => onStateChange(part.id, btn.state)}
    >
      {btn.label}
    </button>
  );

  return (
    <div
      data-part-id={part.id}
      className={`flex flex-col shrink-0 border rounded bg-chip overflow-hidden touch-pan-x ${
        mergeHighlight ? 'border-accent' : 'border-line'
      } ${dragging ? 'opacity-50' : ''}`}
    >
      <input
        className={`px-1 pt-px pb-0 text-center text-[11px] font-mono font-semibold bg-transparent border-b-2 outline-none ${UNDERLINE[part.state]} ${TEXT_TREATMENT[part.state]}`}
        value={part.text}
        onChange={(e) => onTextChange(part.id, e.target.value)}
        size={Math.max(part.text.length, 2)}
      />
      <div className="flex flex-col items-center gap-px px-[3px] py-[2px]">
        <div className="flex gap-[2px]">{BIG_BUTTONS.map((b) => renderButton(b, 'w-5 h-[15px] text-[11px]'))}</div>
        <div className="flex gap-px">{SMALL_BUTTONS.map((b) => renderButton(b, 'w-[13px] h-[10px] text-[8px]'))}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update the strip spacing** in `src/renderer/components/SearchParts.tsx` — change the container class only (spec §2: gap 3px, padding 6px 8px):

```tsx
    <div data-testid="search-parts-row" className="flex flex-nowrap gap-[3px] px-2 py-1.5">
```

- [ ] **Step 5: Run the suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/SearchPartItem.tsx src/renderer/components/SearchParts.tsx __tests__/components/SearchParts.test.tsx
git commit -m "feat: redesign search part chips with state underline and two-row buttons"
```

---

### Task 10: Drag to merge / reorder

**Files:**
- Create: `src/renderer/components/searchPartsDnd.ts`
- Modify: `src/renderer/components/SearchParts.tsx` (full rewrite)
- Modify: `src/renderer/components/Renamer.tsx` (pass merge/reorder handlers)
- Test: `__tests__/components/searchPartsDnd.test.ts` (create), `__tests__/components/SearchParts.test.tsx`

**Interfaces:**
- Consumes: `mergeParts`/`reorderParts` (Task 5 — reorder index is post-removal), `SearchPartItem` `dragging`/`mergeHighlight` props and `data-part-id` (Task 9).
- Produces:
  - `searchPartsDnd.ts`: `DRAG_THRESHOLD_PX = 5`, `LONG_PRESS_MS = 350`, `MERGE_BAND_RATIO = 0.6`, `interface ChipRect { id: string; left: number; right: number }`, `type DropTarget = { type: 'merge'; targetId: string } | { type: 'reorder'; index: number } | null`, `hitTest(rects: ChipRect[], x: number, sourceId: string): DropTarget`.
  - `SearchPartsProps` gains `onMergeParts?: (sourceId: string, targetId: string) => void` and `onReorderParts?: (sourceId: string, targetIndex: number) => void`.

- [ ] **Step 1: Write the failing hit-test tests** — create `__tests__/components/searchPartsDnd.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hitTest, type ChipRect } from '../../src/renderer/components/searchPartsDnd';

// three 100px chips with 10px gaps: [0,100] [110,210] [220,320]
const rects: ChipRect[] = [
  { id: 'a', left: 0, right: 100 },
  { id: 'b', left: 110, right: 210 },
  { id: 'c', left: 220, right: 320 },
];

describe('hitTest', () => {
  it('returns merge when over the central band of another chip', () => {
    expect(hitTest(rects, 160, 'a')).toEqual({ type: 'merge', targetId: 'b' });
  });

  it('returns reorder at chip edges and gaps (index is post-removal)', () => {
    // dragging c: remaining order is [a, b]; x=105 sits in the a|b gap → index 1
    expect(hitTest(rects, 105, 'c')).toEqual({ type: 'reorder', index: 1 });
    // dragging a: remaining [b, c]; left edge of b (within 20% inset) → before b → index 0
    expect(hitTest(rects, 112, 'a')).toEqual({ type: 'reorder', index: 0 });
  });

  it('never merges a chip into itself', () => {
    expect(hitTest(rects, 50, 'a')).not.toEqual({ type: 'merge', targetId: 'a' });
  });

  it('returns null outside the strip', () => {
    expect(hitTest(rects, -50, 'a')).toBeNull();
    expect(hitTest(rects, 500, 'a')).toBeNull();
    expect(hitTest([{ id: 'a', left: 0, right: 100 }], 50, 'a')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/searchPartsDnd.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — create `src/renderer/components/searchPartsDnd.ts`:

```ts
export const DRAG_THRESHOLD_PX = 5;
export const LONG_PRESS_MS = 350;
export const MERGE_BAND_RATIO = 0.6;

export interface ChipRect {
  id: string;
  left: number;
  right: number;
}

export type DropTarget =
  | { type: 'merge'; targetId: string }
  | { type: 'reorder'; index: number }
  | null;

/**
 * Classify a drop position. Over the central band of another chip = merge;
 * over gaps or chip edges = reorder (index into the array with the source
 * removed); outside the strip = null (abort).
 */
export function hitTest(rects: ChipRect[], x: number, sourceId: string): DropTarget {
  const others = rects.filter((r) => r.id !== sourceId);
  if (others.length === 0) return null;
  if (x < others[0].left || x > others[others.length - 1].right) return null;

  for (const r of others) {
    const inset = ((r.right - r.left) * (1 - MERGE_BAND_RATIO)) / 2;
    if (x >= r.left + inset && x <= r.right - inset) {
      return { type: 'merge', targetId: r.id };
    }
  }

  let index = others.length;
  for (let i = 0; i < others.length; i++) {
    if (x < (others[i].left + others[i].right) / 2) {
      index = i;
      break;
    }
  }
  return { type: 'reorder', index };
}
```

Run: `npx vitest run __tests__/components/searchPartsDnd.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing component tests** — append to `__tests__/components/SearchParts.test.tsx` (mock the geometry, drive pointer events):

```tsx
import * as dnd from '../../src/renderer/components/searchPartsDnd';

// vi.spyOn cannot redefine ES-module namespace exports; use spy-mode mocking.
// Place this at the top of the file with the other imports (it is hoisted):
vi.mock(import('../../src/renderer/components/searchPartsDnd'), { spy: true });

function chipOf(text: string): HTMLElement {
  return screen.getByDisplayValue(text).closest('[data-part-id]') as HTMLElement;
}

describe('drag interactions', () => {
  afterEach(() => {
    vi.mocked(dnd.hitTest).mockRestore();
  });

  it('merges when hit-test reports merge', () => {
    const onMerge = vi.fn();
    vi.mocked(dnd.hitTest).mockReturnValue({ type: 'merge', targetId: '1' });
    render(
      <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={vi.fn()}
        onMergeParts={onMerge} onReorderParts={vi.fn()} />
    );
    const chip = chipOf('The');
    fireEvent.pointerDown(chip, { pointerId: 1, clientX: 10, clientY: 5, pointerType: 'mouse' });
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 60, clientY: 5, pointerType: 'mouse' });
    fireEvent.pointerUp(chip, { pointerId: 1, clientX: 60, clientY: 5, pointerType: 'mouse' });
    expect(onMerge).toHaveBeenCalledWith('0', '1');
  });

  it('reorders when hit-test reports reorder', () => {
    const onReorder = vi.fn();
    vi.mocked(dnd.hitTest).mockReturnValue({ type: 'reorder', index: 2 });
    render(
      <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={vi.fn()}
        onMergeParts={vi.fn()} onReorderParts={onReorder} />
    );
    const chip = chipOf('The');
    fireEvent.pointerDown(chip, { pointerId: 1, clientX: 10, clientY: 5, pointerType: 'mouse' });
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 90, clientY: 5, pointerType: 'mouse' });
    fireEvent.pointerUp(chip, { pointerId: 1, clientX: 90, clientY: 5, pointerType: 'mouse' });
    expect(onReorder).toHaveBeenCalledWith('0', 2);
  });

  it('does not drag below the movement threshold (click still edits)', () => {
    const onMerge = vi.fn();
    const onReorder = vi.fn();
    render(
      <SearchParts parts={parts} onPartStateChange={vi.fn()} onPartTextChange={vi.fn()} onSearch={vi.fn()}
        onMergeParts={onMerge} onReorderParts={onReorder} />
    );
    const chip = chipOf('The');
    fireEvent.pointerDown(chip, { pointerId: 1, clientX: 10, clientY: 5, pointerType: 'mouse' });
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 12, clientY: 5, pointerType: 'mouse' });
    fireEvent.pointerUp(chip, { pointerId: 1, clientX: 12, clientY: 5, pointerType: 'mouse' });
    expect(onMerge).not.toHaveBeenCalled();
    expect(onReorder).not.toHaveBeenCalled();
  });
});
```

Note: with `vi.mock(..., { spy: true })`, every export of the module becomes a spy that wraps the real implementation, so the third test (threshold) runs the real `hitTest`; `mockRestore()` in `afterEach` clears the forced return values between tests.

Run: `npx vitest run __tests__/components/SearchParts.test.tsx`
Expected: FAIL (no drag handling yet).

- [ ] **Step 5: Rewrite `src/renderer/components/SearchParts.tsx`:**

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchPart, SearchPartState } from '../../types';
import { SearchPartItem } from './SearchPartItem';
import * as dnd from './searchPartsDnd';
import type { ChipRect, DropTarget } from './searchPartsDnd';

interface SearchPartsProps {
  parts: SearchPart[];
  onPartStateChange: (id: string, state: SearchPartState) => void;
  onPartTextChange: (id: string, text: string) => void;
  onSearch: () => void;
  onMergeParts?: (sourceId: string, targetId: string) => void;
  onReorderParts?: (sourceId: string, targetIndex: number) => void;
}

interface PendingDrag {
  sourceId: string;
  pointerId: number;
  startX: number;
  startY: number;
}

interface ActiveDrag extends PendingDrag {
  x: number;
  target: DropTarget;
  text: string;
  caretX: number | null;
}

export function SearchParts({
  parts,
  onPartStateChange,
  onPartTextChange,
  onSearch,
  onMergeParts,
  onReorderParts,
}: SearchPartsProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<PendingDrag | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drag, setDrag] = useState<ActiveDrag | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const chipRects = useCallback((): ChipRect[] => {
    const container = containerRef.current;
    if (!container) return [];
    return Array.from(container.querySelectorAll<HTMLElement>('[data-part-id]')).map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.dataset.partId as string, left: r.left, right: r.right };
    });
  }, []);

  const caretFor = useCallback(
    (target: DropTarget, rects: ChipRect[], sourceId: string): number | null => {
      if (!target || target.type !== 'reorder') return null;
      const others = rects.filter((r) => r.id !== sourceId);
      if (target.index >= others.length) return others.length ? others[others.length - 1].right + 1 : null;
      return others[target.index].left - 2;
    },
    [],
  );

  const beginDrag = useCallback(
    (pending: PendingDrag, x: number) => {
      const text = parts.find((p) => p.id === pending.sourceId)?.text ?? '';
      const rects = chipRects();
      const target = dnd.hitTest(rects, x, pending.sourceId);
      setDrag({ ...pending, x, target, text, caretX: caretFor(target, rects, pending.sourceId) });
      pendingRef.current = null;
      const active = document.activeElement as HTMLElement | null;
      active?.blur?.();
    },
    [parts, chipRects, caretFor],
  );

  const endDrag = useCallback(() => {
    clearLongPress();
    pendingRef.current = null;
    setDrag(null);
  }, [clearLongPress]);

  useEffect(() => {
    if (!drag) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') endDrag();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drag, endDrag]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.target as HTMLElement;
      if (el.closest('button')) return; // state buttons act on click, never drag
      const chip = el.closest<HTMLElement>('[data-part-id]');
      if (!chip) return;
      const pending: PendingDrag = {
        sourceId: chip.dataset.partId as string,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
      };
      pendingRef.current = pending;
      if (e.pointerType === 'touch') {
        clearLongPress();
        longPressTimer.current = setTimeout(() => {
          if (pendingRef.current === pending) beginDrag(pending, pending.startX);
        }, dnd.LONG_PRESS_MS);
      }
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [beginDrag, clearLongPress],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (drag && e.pointerId === drag.pointerId) {
        e.preventDefault();
        const rects = chipRects();
        const target = dnd.hitTest(rects, e.clientX, drag.sourceId);
        setDrag({ ...drag, x: e.clientX, target, caretX: caretFor(target, rects, drag.sourceId) });
        return;
      }
      const pending = pendingRef.current;
      if (!pending || e.pointerId !== pending.pointerId) return;
      const moved = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
      if (moved <= dnd.DRAG_THRESHOLD_PX) return;
      if (e.pointerType === 'touch') {
        // moved before long-press fired: this is a scroll, not a drag
        clearLongPress();
        pendingRef.current = null;
      } else {
        beginDrag(pending, e.clientX);
      }
    },
    [drag, beginDrag, chipRects, caretFor, clearLongPress],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (drag && e.pointerId === drag.pointerId) {
        if (drag.target?.type === 'merge') onMergeParts?.(drag.sourceId, drag.target.targetId);
        if (drag.target?.type === 'reorder') onReorderParts?.(drag.sourceId, drag.target.index);
      }
      endDrag();
    },
    [drag, onMergeParts, onReorderParts, endDrag],
  );

  return (
    <div
      ref={containerRef}
      data-testid="search-parts-row"
      className="relative flex flex-nowrap gap-[3px] px-2 py-1.5"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={endDrag}
    >
      {parts.map((part) => (
        <SearchPartItem
          key={part.id}
          part={part}
          onStateChange={onPartStateChange}
          onTextChange={onPartTextChange}
          dragging={drag?.sourceId === part.id}
          mergeHighlight={drag?.target?.type === 'merge' && drag.target.targetId === part.id}
        />
      ))}
      {drag && drag.caretX !== null && containerRef.current && (
        <span
          className="pointer-events-none fixed w-[2px] bg-accent z-50"
          style={{
            left: drag.caretX,
            top: containerRef.current.getBoundingClientRect().top + 4,
            height: containerRef.current.getBoundingClientRect().height - 8,
          }}
        />
      )}
      {drag && (
        <span
          className="pointer-events-none fixed z-50 font-mono text-[11px] font-semibold px-2 py-0.5 rounded border border-accent bg-chip text-ink-bright"
          style={{
            left: drag.x + 8,
            top: containerRef.current
              ? containerRef.current.getBoundingClientRect().top - 6
              : 0,
          }}
        >
          {drag.text}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Wire `Renamer.tsx`.** Add store selectors next to the existing ones:

```ts
  const mergeParts = useStore(storeRef.current, (s) => s.mergeParts);
  const reorderParts = useStore(storeRef.current, (s) => s.reorderParts);
```

and pass them:

```tsx
          <SearchParts
            parts={searchParts}
            onPartStateChange={handlePartStateChange}
            onPartTextChange={handlePartTextChange}
            onSearch={handleSearch}
            onMergeParts={mergeParts}
            onReorderParts={reorderParts}
          />
```

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/renderer/components/searchPartsDnd.ts src/renderer/components/SearchParts.tsx src/renderer/components/Renamer.tsx __tests__/components/searchPartsDnd.test.ts __tests__/components/SearchParts.test.tsx
git commit -m "feat: drag search part chips to merge or reorder"
```

---

### Task 11: Restyle sweep A — main window

**Files:**
- Modify: `src/renderer/components/Renamer.tsx` (all remaining gray classes)
- Modify: `src/renderer/components/FileList.tsx`
- Modify: `src/renderer/components/RenamePreview.tsx`
- Modify: `src/renderer/components/PosterGrid.tsx`

No behavior changes — the existing suite must stay green. Use these exact replacements (values from the mock):

- [ ] **Step 1: `FileList.tsx`** — replace the row `<button>` and contents with:

```tsx
          <button
            key={file.id}
            className={`w-full text-left px-2 py-0.5 flex items-center gap-1.5 ${
              index === selectedIndex ? 'bg-row-selected' : ''
            } ${!visible ? 'opacity-30' : ''}`}
            onClick={() => onSelect(index)}
          >
            <span className={`flex-1 font-mono text-[11px] truncate ${index === selectedIndex ? 'text-ink-bright' : 'text-ink-2'}`}>
              {file.name}
            </span>
            {file.hasNfo && (
              <span className={`font-mono font-bold text-[8px] border rounded-[3px] px-[3px] py-px shrink-0 ${
                index === selectedIndex ? 'text-accent border-accent-muted' : 'text-ink-faint border-line'
              }`}>
                NFO
              </span>
            )}
          </button>
```

- [ ] **Step 2: `RenamePreview.tsx`** — replace the returned JSX with (primary accent Rename, bordered secondary Skip, mono preview input on raised bg):

```tsx
    <div data-testid="rename-preview" className="flex items-center gap-2 px-2 py-1.5 bg-surface border-t border-line">
      <button
        data-testid="rename-button"
        className={`px-4 py-1 rounded-[3px] bg-accent text-on-accent text-[11px] font-bold shrink-0 ${
          renameDisabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={onRename}
        disabled={renameDisabled}
      >
        Rename
      </button>
      <button
        data-testid="skip-button"
        className="px-3 py-1 rounded-[3px] border border-toggle-off text-ink-2 text-[11px] font-bold shrink-0"
        onClick={onSkip}
      >
        Skip
      </button>
      <input
        data-testid="preview-name-input"
        className="flex-1 px-2 py-1 font-mono text-[11px] text-ink-bright bg-raised border border-line rounded-[3px]"
        value={previewName}
        onChange={(e) => onPreviewChange(e.target.value)}
        placeholder="New filename..."
      />
    </div>
```

- [ ] **Step 3: `PosterGrid.tsx`** — three changes:
  - Thumb wrapper selection classes: `selected ? 'border-accent' : 'border-transparent'` and `rounded` → `rounded-[3px]`.
  - Placeholder `bg-gray-200` → `bg-chip`; both `thumbClass` values `rounded` → `rounded-[3px]`.
  - Hover-preview portal wrapper: `bg-white shadow-lg rounded border border-gray-200 p-1` → `bg-panel shadow-lg rounded border border-line p-1`.

- [ ] **Step 4: `Renamer.tsx` remaining chrome** — exact swaps:

| Location | Old classes | New classes |
|---|---|---|
| Left panel wrapper | `border-r border-gray-300` | `border-r border-line bg-panel` |
| URL bar row | `bg-gray-100 border-b border-gray-300` | `bg-raised border-b border-line` |
| Back button | `bg-gray-200 hover:bg-gray-300 rounded` | `border border-toggle-off text-ink-2 rounded-[3px]` |
| URL input | `border border-gray-300 rounded bg-white` | `border border-line rounded-[3px] bg-panel text-ink` |
| Right panel (`flex-1 min-h-0 relative` div) | *(none)* | add `bg-well` |
| Loading overlay | `bg-white/80` … `text-gray-500` | `bg-surface/80` … `text-ink-dim` |
| Compact poster overlay | `bg-white/95 border-t border-gray-300` | `bg-panel/95 border-t border-line` |
| Bottom area wrapper | `border-t border-gray-300` | `border-t border-line bg-panel` |
| Filename bar | `bg-gray-50 border-b border-gray-200` | `bg-raised border-b border-line` |
| NFO button | `bg-gray-600 text-white text-[11px] font-bold rounded hover:bg-gray-700` | `bg-ink-dim text-surface font-mono text-[9px] font-bold rounded-[3px] px-[5px] py-[2px]` (drop the old `px-2 py-0.5`) |
| Filename span | `text-xs text-gray-600` | `font-mono text-[11px] text-ink-2` |
| Size span | `text-xs text-gray-400` | `font-mono text-[10px] text-ink-faint` |
| Search button | `bg-blue-500 text-white text-[11px] font-bold rounded hover:bg-blue-600` | `bg-accent text-on-accent text-[10px] font-bold rounded-[3px] px-3 py-[3px]` (drop old `px-2 py-0.5`) |
| AKA row | `border-b border-gray-200 bg-gray-50` | `border-b border-line-subtle bg-raised` |
| Use AKA active | `bg-green-600 text-white hover:bg-green-700` | `bg-part-keep text-on-accent` |
| Use AKA inactive | `bg-gray-300 text-gray-700 hover:bg-gray-400` | `border border-toggle-off text-ink-2` |
| Use AKA both | `rounded` | `rounded-[3px]` |
| AKA label span | `text-gray-500` | `text-ink-faint` |
| AKA select | `border border-gray-300 rounded bg-white` | `border border-line rounded-[3px] bg-panel text-ink text-[11px]` |

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS (all changes are class-only; if a test asserted an old class, update the assertion to the new token class).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/Renamer.tsx src/renderer/components/FileList.tsx src/renderer/components/RenamePreview.tsx src/renderer/components/PosterGrid.tsx
git commit -m "refactor: restyle main window with console theme tokens"
```

---

### Task 12: Restyle sweep B — secondary surfaces

**Files (modify each):**
- `src/renderer/components/FolderBrowser.tsx`
- `src/renderer/components/OptionsModal.tsx`
- `src/renderer/components/AboutModal.tsx`
- `src/renderer/components/UndoModal.tsx`
- `src/renderer/components/ReleaseNotes.tsx`
- `src/renderer/components/UpdateModal.tsx`
- `src/renderer/components/NotificationToast.tsx`
- `src/renderer/components/NfoViewer.tsx`
- `src/renderer/components/ErrorBoundary.tsx`
- `src/renderer/components/options/*.tsx` (all 12 files)

No structural changes. Apply this mapping to every hardcoded palette class; where a mapped choice is ambiguous, pick by role (label → `text-ink-2`/`text-ink-dim`, body → `text-ink`, disabled/hint → `text-ink-faint`):

| Old | New |
|---|---|
| `bg-white` | `bg-panel` |
| `bg-gray-50`, `bg-gray-100` | `bg-raised` |
| `bg-gray-200`/`bg-gray-300` (button fills) | `border border-toggle-off text-ink-2` (bordered secondary, no fill) |
| `bg-gray-200` (non-button surfaces) | `bg-well` |
| `border-gray-200` | `border-line-subtle` |
| `border-gray-300`/`border-gray-400` | `border-line` |
| `text-gray-900`, `text-gray-800`, `text-gray-700` | `text-ink` |
| `text-gray-600`, `text-gray-500` | `text-ink-2` or `text-ink-dim` (by role) |
| `text-gray-400` | `text-ink-faint` |
| `bg-blue-500`/`bg-blue-600` + `text-white` (primary buttons) | `bg-accent text-on-accent` |
| `bg-blue-100`, `bg-blue-50` (selection) | `bg-row-selected` |
| `text-blue-*` (links/accents) | `text-accent` |
| green fills (success/confirm) | `bg-part-keep text-on-accent` |
| red fills (danger/error) | `bg-part-remove text-on-accent` |
| yellow/amber warnings | keep hue, pair with `text-ink` on `bg-raised` and a `border-line` border |
| modal backdrop `bg-black/xx` | keep as-is |
| `rounded` on buttons | `rounded-[3px]` |
| `hover:bg-gray-*` on flat/hoverable rows | `hover:bg-raised` (feedback only) |
| `hover:bg-blue-600` etc. on filled buttons | drop (accent fill is enough) or `hover:opacity-90` |

Notes:
- `NotificationToast` success/error: `bg-part-keep`/`bg-part-remove` with `text-on-accent`.
- `NfoViewer` content: `bg-panel text-ink font-mono border-line`.
- Options section `<h3>` headings: `text-ink` (Task 6 already did GeneralSection's new block; normalize the rest of that file too).
- Do not touch `tmdb-logo.svg` usage, webview internals, or any layout classes (flex/grid/spacing stay).

- [ ] **Step 1: Apply the mapping file-by-file.** Read each file fully, swap classes, keep structure identical.
- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: PASS; update any test asserting old class names.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components __tests__
git commit -m "refactor: restyle secondary surfaces with console theme tokens"
```

---

### Task 13: Full verification

**Files:** none new.

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: PASS, zero skips introduced by this work.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 4: Visual verification against the mock** (use the `verify`/`run` skill if available)

Run: `npm start`

Checklist (compare with `tmp/zeeb-final-design.dc.html` in a browser and the upstream spec):
- Dark theme by default; View → Theme switches Dark/Light/System live; radio checkmark follows Options select and vice versa; theme persists across restart (check `zeeb-config.json`).
- Chips: constant bg, 2px state underline, `+ −` big row, `? ★ ×` small row, exactly one lit button, strikethrough+dim on remove states, editing reflows the chip.
- Drag: chip onto a chip's center → border highlight, drop merges with original separator (e.g. `DDP5` + `1` → `DDP5.1`); drag between chips → caret, drop reorders; sub-threshold click still focuses the text; Escape aborts.
- Movie Files header: `Filters TT [toggle] Sample [toggle]`, labels brighten when on.
- Search Results: `▦` toggle hides/shows 22×32 thumbs, year pill green only when it matches a chip year, stars right-aligned dim, selected row uses row-selected bg.
- Bottom bars: accent Search/Rename, bordered Skip, green Use AKA when active, mono preview input on raised bg.
- Poster grid: well bg, 3px tiles, 2px accent selected border.
- Light theme: repeat the sweep; no leftover light-only or dark-only surfaces anywhere (open every modal + Options tab in both themes).

- [ ] **Step 5: Update CHANGELOG.md** under `## [Unreleased]` (create the section if absent) with a short feature list (theme toggle, chip redesign + drag merge/reorder, enriched results, switches). No version bump — not releasing.

- [ ] **Step 6: Final commit**

```bash
git add CHANGELOG.md
git commit -m "docs: note console redesign in changelog"
```

Then follow **superpowers:finishing-a-development-branch** (no pushes without explicit approval).
