# Zeeb UI Redesign — Implementation Spec

> Committed verbatim from `zeeb-redesign-spec.md` in the Claude Design project
> *Zeeb Movie Renamer Design* (`claude.ai/design/p/aede8ace-8862-4acf-962a-8d2a953a0eff`).
> See `2026-07-10-ui-redesign-console-design.md` for the implementation design.

Handoff spec for the redesign agreed in the design review. Reference mock: `Zeeb Final Design.dc.html` (dark window with result thumbnails ON, light window with them OFF). Codebase uses Tailwind; hex values below can go in `tailwind.config` or arbitrary-value classes.

## 1. Themes ("Console")

Dark is the primary theme; light is equivalent. Add a theme toggle (persist in config).

| Token | Dark | Light |
|---|---|---|
| Window / panel bg | `#1b1d20` | `#f5f6f7` (panels `#ffffff`) |
| Raised bars (headers, titlebar, bottom bars) | `#222428` | `#f5f6f7` / `#ececee` |
| Poster-grid area bg | `#17181b` | `#e9eaec` |
| Border / hairline | `#33363b` | `#d8dadd` (subtle `#e4e6e8`) |
| Text primary | `#d7dade` | `#26282c` |
| Text secondary | `#a9aeb5` | `#565b62` |
| Text dim | `#6b7076` / `#8b9098` | `#9aa0a6` / `#70757c` |
| Accent (buttons, selection, search state) | `#4da3ff` (dark text `#101214` on it) | `#2a78d6` (white text) |
| Selected row bg | `#24384f` | `#dcebfa` |

Type: system UI sans for chrome; `ui-monospace` for filenames, search-part text, year pills, and the rename preview. Section headers: 10px bold uppercase, letter-spacing 0.07em, dim color.

### SearchPart state colors

| State | Dark accent | Light accent | Text treatment |
|---|---|---|---|
| search | `#4da3ff` | `#2a78d6` | normal, slightly brighter fg |
| keep | `#4bbf6b` | `#2c9a4f` | normal |
| keepAlways | `#35d07f` | `#157347` | normal |
| remove | `#f0655e` | `#d64541` | dimmed + `line-through` |
| removeAlways | `#b93832` | `#a32e2a` | more dimmed + `line-through` |

Active button fill = accent with `#101214` text (dark theme) except removeAlways which uses white text; light theme uses white text on all fills. Inactive button glyphs: `#5c6167` (dark) / `#9aa0a6` (light), transparent bg.

## 2. SearchPartItem (the core change)

Chip = vertical stack, nothing fixed-width — the chip grows with its text (in-place editing must reflow live; `size={Math.max(len,2)}` style input is fine):

```
┌──────────────┐
│  HDR10Plus   │  ← text row: 11px semibold mono, padding 1px 4px 0, centered,
├──────────────┤     editable input; 2px bottom border in the state accent color
│   [+] [−]    │  ← row 1: keep / remove. 20×15px each, 2px gap, 11px bold glyphs
│   [?][★][×]  │  ← row 2: search / keepAlways / removeAlways. 13×10px, 1px gap, 8px glyphs
└──────────────┘
```

- Chip: `border 1px` (`#33363b` dark / `#d8dadd` light), `border-radius 4px`, bg `#232529` dark / `#ffffff` light (bg does NOT change with state — only the underline, text treatment, and lit button).
- Icon rows are centered as a fixed-size group under the text; they must NOT stretch when the chip is wider than the icons.
- Rationale: + and − are the most-pressed actions → big, top. ? is the default state (rarely pressed) → small row. Exactly one button is lit at a time (the current state).
- Strip: `gap 3px`, padding `6px 8px`, horizontal scroll as today.
- All buttons are always visible — no hover-revealed controls (touch screens). `title` tooltips: Keep / Remove / Search / Always keep / Never.

### Drag interactions (new)
- **Drag a chip onto a neighbor → merge** the two tokens (joined with the original separator between them, e.g. `DDP5` + `1` → `DDP5.1`; merged token keeps the drop target's state). Splitting back: edit the text (typos are already click-editable).
- **Drag a chip between two others → reorder** the search parts (affects `search`-state query order and `<saved>` output order).
- Disambiguation: drop *on* a chip = merge (highlight the target chip border), drop *between* chips = reorder (show an insertion caret). Use a small movement threshold so click-to-edit on the text still works; long-press to start drag on touch.

## 3. Movie Files header

Replace the `TT?` / `Sample?` checkboxes with labeled switches, right-aligned:

`Filters   TT [toggle]   Sample [toggle]`

- "Filters" label in dim text; each toggle 22×12px pill, radius 6px; ON = accent bg, knob right; OFF = `#3c4046` dark / `#c9ccd0` light, knob left. Label text brightens when ON.

## 4. Search Results

Enriched rows (see `MovieResults.tsx`):

`[thumb 22×32] Title  [year pill]  ······  director`

- Thumb: 22×32px, 1px border, radius 2px, from the suggest API's `thumbnailUrl` (already in `MovieMatch`).
- Year pill: bold 10px mono, 1px border, radius 3px, padding 1px 5px. **When the year matches a year-token in the filename**, fill it green (`#173d24` bg / `#4bbf6b` text / `#2f6b42` border dark; `#e2f3e8` / `#157347` / `#9fd3ae` light). Otherwise neutral dim.
- Director right-aligned, dim 10px, `—` when unknown (requires director in suggest data; omit the span if unavailable).
- **Thumbnail toggle** in the "Search Results" header bar, right side: `▦ [toggle]` (same switch component). OFF = current text-only rows (with year pill + director retained). Persist in config.

## 5. Everything else (styling only, structure unchanged)

- Titlebar/menu: OS chrome, untouched.
- Buttons: 3px radius; primary = accent fill; secondary = 1px border, no fill (e.g. Skip). `Use AKA` when active = green fill (`#4bbf6b` dark / `#2c9a4f` light).
- NFO badges in the file list: 8px bold mono, 1px border, 3px radius; accent-colored on the selected row.
- Rename preview input: mono, raised bg, 1px border.
- Poster grid: 3px radius tiles; selected = 2px accent border.
- Keep density: rows at `py-0.5`, 11px text throughout.

## 6. Out of scope / rejected

- No hover-dependent affordances anywhere (touch-first).
- No prepopulated auto-processing beyond the existing next-file hot-swap.
- AKA-as-chips rejected (titles too long); AKA row unchanged.
- Webview (IMDB) and TMDB poster grid internals unchanged.
