# Zeeb UI Redesign ("Console") — Design

Implements the design agreed in the Claude Design project *Zeeb Movie Renamer Design*
(`claude.ai/design/p/aede8ace-8862-4acf-962a-8d2a953a0eff`). Visual ground truth:
`Zeeb Final Design.dc.html` (dark window = thumbnails on, light window = thumbnails off).
The upstream handoff spec is committed verbatim alongside this doc as
`2026-07-10-ui-redesign-upstream-spec.md`; all hex values, sizes, and state tables live
there and are not repeated here. This doc records the implementation architecture and the
decisions made during brainstorming.

## Decisions (resolved during brainstorming)

- **Result-row third column**: the IMDB suggest API has no director; show its stars/cast
  string (`s` field) right-aligned instead. Omit the span when null.
- **Theme setting**: three-way `dark | light | system`, default `dark`. `system` follows
  Electron `nativeTheme` live.
- **Theme controls**: native View → Theme submenu (radio: Dark/Light/System) **and** a
  select in Options → General. Both write the same config field.
- **Theming architecture**: semantic CSS-variable tokens + Tailwind 4 `@theme inline`
  (approach A). No `dark:` class pairs, no parallel CSS component system.
- **TT/Sample filters**: restyled to switches; remain session-only state (not persisted).
- **Thumbnail toggle**: persisted as `config.showResultThumbnails`, default `true`.

## 1. Theming

**Tokens** — `src/renderer/index.css` defines the upstream token table as CSS variables
under `:root[data-theme="dark"]` and `:root[data-theme="light"]`, registered via
`@theme inline` so semantic utilities exist:

| Token | Meaning |
|---|---|
| `surface` | window/panel bg |
| `raised` | headers, titlebar-adjacent bars, bottom bars |
| `well` | poster-grid area bg |
| `line`, `line-subtle` | borders / hairlines |
| `ink`, `ink-2`, `ink-dim`, `ink-faint` | text tiers (primary → dim) |
| `accent`, `on-accent` | buttons, selection, search state; text on accent |
| `row-selected` | selected row bg |
| `toggle-off` | switch-off track |
| `part-search/-keep/-keep-always/-remove/-remove-always` | SearchPart state accents |
| `pill-year-bg/-fg/-line` | matched-year pill green triple |

Components use `bg-surface`, `text-ink-dim`, `border-line`, etc. Flipping `data-theme`
on `<html>` re-themes the whole app. `font-mono` (already `ui-monospace`) covers
filenames, chips, pills, preview. A `section-header` utility provides the 10px bold
uppercase `tracking-[0.07em]` dim header style.

**Resolution & plumbing**
- `ZeebConfig.theme: 'dark' | 'light' | 'system'` (default `'dark'`, in
  `configDefaults`).
- New `useTheme` hook: resolves `system` via IPC (`theme:getSystem` getter +
  `theme:onSystemChanged` push from `nativeTheme.on('updated')`), sets `data-theme` on
  `document.documentElement`, re-resolves on config change and on system change.
- `index.html` ships `data-theme="dark"` so first paint is dark; config load corrects it.
  Known cosmetic limitation: light-theme users see a dark flash at launch.
- View menu: Theme submenu with three radio items, wired like the existing
  Show Web View round-trip (menu event → renderer updates config + saves → renderer
  sends state back for the radio checkmarks).
- Options → General: three-way select bound to `config.theme`.

## 2. SearchPartItem + drag (the core change)

**Chip layout** per upstream §2: editable centered mono input with 2px bottom border in
the state accent; below, a fixed-size centered button group — row 1 `[+] [−]`
(20×15px), row 2 `[?][★][×]` (13×10px, 8px glyphs). Chip bg constant per theme; only
underline, text treatment (dim/strikethrough for remove states), and the single lit
button track state. All buttons always visible; `title` tooltips; no hover-revealed
controls. Strip: gap 3px, padding 6px 8px, horizontal scroll.

**Parser** — `SearchPart` gains `separatorAfter: string`: the raw separator that
followed the token in the original filename (`''` for the last token).
`parseFilename` tokenization switches to a capturing scan so separators are recorded;
multi-token keep-term matches take the separator after their last consumed token.

**Store** (`renamerStore`):
- `mergeParts(sourceId, targetId)` — merged text = earlier-in-array token +
  its `separatorAfter` + later token (drag direction irrelevant). Merged part keeps the
  **target's** state and the later part's `separatorAfter`; source removed. Merging
  persists nothing to config (unlike keepAlways/removeAlways state changes).
- `reorderParts(sourceId, targetIndex)` — array move. Query order and `<saved>` output
  already derive from array order; no downstream change.

**Drag mechanics** — custom pointer-events implementation in `SearchParts` (HTML5 DnD
rejected: poor touch support, conflicts with click-to-edit):
- `pointerdown` on chip body (not buttons) arms tracking. Mouse: movement > ~5px starts
  drag. Touch: long-press ~350ms starts drag. Otherwise the click focuses the input.
- During drag: ghost chip follows pointer. Hit-test: over a chip's central band →
  **merge** (target border highlights accent); over gaps/edges between chips →
  **reorder** (insertion caret element). Drop executes the store action.
- `pointercancel` / Escape aborts. Split-back = edit the text (no gesture).

## 3. Movie Files header + Search Results

- **`components/ui/Toggle.tsx`** — shared switch: 22×12px pill, 6px radius, accent bg +
  right knob when on, `toggle-off` + left knob when off; associated label brightens
  when on. Plain button role=switch semantics.
- **Movie Files header**: checkboxes → right-aligned `Filters TT [Toggle] Sample
  [Toggle]`, dim "Filters" label. State stays in `App.tsx` (session-only).
- **`MovieMatch.stars: string | null`** — mapped from suggest `item.s ?? null` in
  `ipc.ts` (and the null platform adapter).
- **Result rows**: `[thumb 22×32] Title [year pill] ··· stars`. Thumb from
  `thumbnailUrl` (1px border, 2px radius), hidden when thumbnails off. Year pill: bold
  10px mono bordered; green fill when `match.year` equals any 4-digit year token among
  the current search parts (`Renamer` passes `searchParts` down), else neutral dim.
  Stars right-aligned, dim, truncating; omitted when null. AKA display retained.
- **Thumbnail toggle** in the Search Results header bar (`▦` + Toggle), bound to
  `config.showResultThumbnails` (default `true`), saved on change.

## 4. Restyle-only sweep (structure unchanged)

Buttons 3px radius — primary accent fill, secondary 1px border no fill (Skip), Use AKA
active = green fill. NFO badges 8px bold mono bordered, accent on selected row. Rename
preview input mono on raised bg. Poster grid 3px tiles, selected = 2px accent border.
Selected file rows = `row-selected`. Density unchanged (`py-0.5`, 11px). Modals,
FolderBrowser, Options sections, toasts, NfoViewer re-skinned with tokens so no surface
is light-only. OS titlebar/menus, webview internals, TMDB poster internals untouched.
No hover-dependent affordances anywhere (touch-first).

## Error handling

- Thumbnail `<img>` errors hide the image (fall back to text-only row).
- Unknown/legacy `config.theme` values resolve to `dark`.
- Drag aborts cleanly on `pointercancel`, Escape, or drop outside the strip (no state
  change).
- Suggest items without `s` render no stars span; without `thumbnailUrl`, an empty
  placeholder box keeps row alignment.

## Testing

Reproduce-first per repo rules; mock all IPC/platform calls.

- `filenameParser`: separator capture (dots, spaces, mixed, trailing ext, multi-token
  keep terms); existing tests updated for the new field.
- `renamerStore`: `mergeParts` (text join uses original separator, target state wins,
  direction-agnostic), `reorderParts`.
- `useTheme`: dark/light/system resolution, live system change, unknown value fallback.
- `Toggle`: on/off rendering + callback.
- `MovieResults`: green pill only on year match, stars span omission, thumbnails-off
  text-only rows.
- Sweep-only changes: no behavioral tests; verified visually against
  `Zeeb Final Design.dc.html`.
- Full suite green before completion.

## Out of scope

Per upstream §6: no hover affordances, no auto-processing changes, AKA row unchanged,
webview/TMDB internals unchanged. Also out: persisting TT/Sample filters, a
localStorage pre-paint theme hint, chip split gesture.
