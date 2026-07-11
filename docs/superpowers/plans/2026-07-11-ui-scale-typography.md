# UI Scale + Typography Tokens Implementation Plan

> Follow-up to the console redesign (user visual review 2026-07-10). Executed inline
> (small, coupled tasks) with TDD and a final review gate. Branch: `feat/ui-scale-typography`.

**Goal:** Default UI ~30% larger and user-adjustable via persisted zoom; SearchParts chips ≥2× effective size; TT/Sample toggles display filter semantics (negation); arbitrary `text-[Npx]` classes replaced by named typography tokens.

**Decisions (from user discussion):**
- Mechanism = **persisted zoom**: new `ZeebConfig.uiZoom` (percent, default `130`, clamp 50–250), applied with `webFrame.setZoomFactor`, adjusted by custom View-menu items (Ctrl+= / Ctrl+- / Ctrl+0; reset returns to the 130 default, not 100). Independent of the IMDB webview's `htmlZoom`.
- **Typography tokens** are static named sizes in `@theme` (`index.css`) — zoom does runtime scaling; tokens give a single edit point per role. Tailwind-default `text-xs`/`text-sm` in modals/options stay (already named sizes).
- **Toggle reversal**: display `!(showTt ?? false)` / `!(showSample ?? false)`; ON = filter active (files hidden). Underlying `showTt`/`showSample` state and `isFileVisible` logic unchanged.

## Tasks

### Task 1: Typography tokens + sweep
- `index.css` `@theme` additions:
  `--text-body: 11px; --text-label: 10px; --text-badge: 9px; --text-micro: 8px; --text-chip: 16px; --text-chip-small: 11px;`
- `section-header` utility font-size → `var(--text-label)`.
- Sweep all 27 `text-[8|9|10|11px]` occurrences (10 files) to `text-micro|badge|label|body` respectively — except `SearchPartItem.tsx`/`SearchParts.tsx` chip sizes, which move to `text-chip`/`text-chip-small` in Task 2.
- Tests asserting old class strings (if any) updated. Suite green.

### Task 2: SearchParts 2× scale
- `SearchPartItem.tsx`: chip text + big glyphs `text-chip` (16px); small glyphs `text-chip-small` (11px); underline `border-b-2` → `border-b-[3px]`; big buttons `w-5 h-[15px]` → `w-[30px] h-[22px]`; small buttons `w-[13px] h-[10px]` → `w-5 h-[15px]`; button radius `rounded-[2px]` → `rounded-[3px]`; input `px-1` → `px-1.5`.
- `SearchParts.tsx`: ghost label `text-[11px]` → `text-chip`; caret `w-[2px]` → `w-[3px]`; strip `gap-[3px]` → `gap-1`.
- Effective at 130% zoom: chip text ~21px, big buttons ~39×29 — ≥2× shipped size.

### Task 3: Toggle reversal (TDD)
- Failing test first in `__tests__/renderer/Renamer.test.tsx`: with `showTt={false}` the `tt-toggle` renders `aria-checked="true"`; clicking it calls `onShowTtChange(true)`. Same pattern for `sample-toggle`.
- `Renamer.tsx`: `checked={!(showTt ?? false)}` / `onChange={(v) => onShowTtChange?.(!v)}` (and Sample); add `title="Hide files with tt tags"` / `title="Hide sample files"`.

### Task 4: Persisted zoom (TDD)
- `ZeebConfig.uiZoom: number`; default `130` in `configDefaults`; defaults test extended.
- Preload: `zeebUi.setZoomFactor(factor)` via `webFrame`; `zeebMenu.onZoomIn/onZoomOut/onZoomReset` (`menu:zoom-in|zoom-out|zoom-reset`).
- `electron.d.ts`: `zeebUi` + menu additions. `adapters/platform.ts`: `UiAdapter { setZoomFactor(factor: number): void }` + menu callbacks + mock defaults + merge line.
- `src/main/index.ts`: replace `{role:'resetZoom'|'zoomIn'|'zoomOut'}` with custom items (accelerators `CmdOrCtrl+0`, `CmdOrCtrl+=`, `CmdOrCtrl+-`) sending the menu events.
- New `useUiZoom(uiZoom: number, platform: PlatformAdapter)` hook: clamps 50–250, calls `platform.ui.setZoomFactor(clamped / 100)` on change. Hook test: called with 1.3 by default, follows config changes, clamps.
- `App.tsx`: `useUiZoom(config.uiZoom, platform)`; menu handlers mutate config (`+10` / `-10` within clamp; reset → `DEFAULT_CONFIG.uiZoom`) and save.

### Task 5: Verification + docs
- Full suite, `tsc --noEmit` (no new error categories vs baseline), lint.
- CHANGELOG `[Unreleased]`: zoom scale, larger chips, filter-toggle semantics, typography tokens.
- Final review subagent over the branch diff; fix loop if needed; then finishing-a-development-branch.

## Out of scope
- Options UI for zoom (menu + shortcuts suffice; `htmlZoom` control untouched).
- Tokenizing `text-xs`/`text-sm` (already named), colors (done), or spacing.
