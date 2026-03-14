# Folder Selection UX Improvements Design

## Goal

Streamline the folder selection experience: fewer clicks, better layout, explanatory text, and a way to return from the process view.

## Changes

### 1. Remove "Start Processing" toolbar button

Remove the entire `{view === 'folderBrowser' && (<div>...</div>)}` toolbar block in `App.tsx`. The folder browser view should have no toolbar row.

### 2. Compact button layout

Move "List Movies" button next to "Browse..." on the same row. Layout: `[input] [Browse...] [List Movies]`. No longer full-width.

### 3. Recursion button tooltips

Add `title` attributes to the three recursion mode buttons:
- **None**: "Only look in this directory, not in subfolders"
- **Subfolders**: "Look one level deep into immediate subfolders, but not deeper"
- **Full**: "Recursively look in all subfolders at every level"

### 4. Recent folders auto-scan

Clicking a recent folder tag immediately calls `onFolderSelected(folder, currentRecursionMode)` — using the component's current recursion mode state. Scans and switches to process view in one click. No need to press "List Movies" separately.

### 5. Explanatory text

Below the recursion buttons, add a muted note:

> *(Note: Listing movies can take several seconds or more, especially on network shares or when including subfolders.)*

### 6. "Open Folder" menu item

Add "Open Folder" to the File menu with accelerator Ctrl+O (Cmd+O on macOS). Sends a `menu:open-folder` IPC event. In the renderer, `App.tsx` listens via `window.zeebMenu.onOpenFolder()` and:
- Calls `setFiles([])` to clear the file store
- Switches view to `folderBrowser`

Follow the existing pattern for menu event listeners (same as `onOptions`, `onUndo`, `onReleaseNotes`).

## Files to Modify

- `src/renderer/components/FolderBrowser.tsx` — layout changes (button placement), tooltips, auto-scan on recent folder click, explanatory text
- `src/renderer/App.tsx` — remove "Start Processing" toolbar block, add `menu:open-folder` handler
- `src/main/index.ts` — add "Open Folder" menu item to File submenu
- `src/preload/main.ts` — add `onOpenFolder` to `zeebMenu` context bridge

## Testing

- **FolderBrowser**: List Movies button beside Browse, tooltips on recursion buttons, recent folder click calls `onFolderSelected`, explanatory text renders
- **App**: no "Start Processing" button in folder browser view, Open Folder menu event switches to folder browser and calls `setFiles([])`
- **Preload**: `onOpenFolder` exists on `window.zeebMenu`
