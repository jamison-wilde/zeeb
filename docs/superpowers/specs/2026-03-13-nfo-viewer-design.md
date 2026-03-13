# NFO Viewer Design

## Goal

Allow users to view NFO file contents in a full-screen overlay with selectable (read-only) text. URLs detected in the content show a copy icon that copies the URL to clipboard on click.

## Trigger

An "NFO" button (`data-testid="nfo-button"`) in the Renamer's filename/size/search bar (bottom panel), positioned to the left of the existing Search button. Only visible when `currentFile.nfoPath` is non-null.

On click: read the NFO file as binary via the existing `fs:readFile` IPC (no encoding argument to get raw bytes), decode with `parseNfo` (CP437→Unicode), set state, and open the NfoViewer overlay. On read failure, silently skip (don't open the viewer) — matches existing NFO error handling in Renamer.

**Note:** The current `FsAdapter.readFile` requires an encoding string. For CP437 support, read as `'latin1'` (preserves byte values 0–255) and pass the result through `cp437ToUnicode` which operates on individual character codes. This avoids needing a Buffer-based API change.

## NfoViewer Component

**Existing:** Full-screen dark overlay, `<pre>` with green monospace text, Close button.

**Enhancements:**

1. **URL detection:** Parse `content` with regex `https?://[^\s<>")\],.;:]+`. Strip trailing punctuation characters (`.,;:)]`) that are commonly not part of the URL in NFO files. Split into alternating text/URL segments.
2. **URL rendering:** Each URL renders as an inline `<span>` wrapper (`position: relative`) containing:
   - The URL text, styled with underline and a distinct color (e.g. blue-400)
   - A small clipboard icon (`position: absolute`, upper-right of the URL span). On click, calls `navigator.clipboard.writeText(url)` and shows "Copied!" feedback for 1500ms. Electron renderer context guarantees clipboard API availability.
3. **Keyboard:** Escape key closes the viewer.
4. **Read-only:** Text is selectable but not editable (existing `<pre>` behavior).

## Files to Modify

- `src/renderer/components/NfoViewer.tsx` — URL detection, copy icons, Escape key
- `src/renderer/components/Renamer.tsx` — NFO button, state for open/content, load NFO on click

## Testing

- NfoViewer: renders nothing when not visible, renders content, detects URLs and renders copy icons, copies URL to clipboard on icon click, closes on Escape key
- Renamer: NFO button (`data-testid="nfo-button"`) hidden when no nfoPath, visible when nfoPath exists
