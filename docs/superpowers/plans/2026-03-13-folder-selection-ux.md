# Folder Selection UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Streamline folder selection with fewer clicks, better layout, tooltips, auto-scan recent folders, and an "Open Folder" menu item.

**Architecture:** Modify FolderBrowser layout (compact buttons, tooltips, auto-scan, note text). Remove useless toolbar from App. Add "Open Folder" IPC event from main menu through preload to renderer.

**Tech Stack:** React, TypeScript, Electron IPC, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-13-folder-selection-ux-design.md`

---

## Chunk 1: FolderBrowser layout + tooltips + auto-scan + App cleanup

### Task 1: Compact FolderBrowser layout, tooltips, auto-scan, explanatory text

**Context:** `FolderBrowser.tsx` currently has: input + Browse on row 1, recent folders on row 2, recursion buttons on row 3, full-width List Movies on row 4. Changes: move List Movies next to Browse on row 1, add tooltips to recursion buttons, make recent folder clicks call `onFolderSelected` directly, add explanatory note.

**Files:**
- Modify: `src/renderer/components/FolderBrowser.tsx`
- Modify: `__tests__/components/FolderBrowser.test.tsx`

- [ ] **Step 1: Write failing tests**

Add to `__tests__/components/FolderBrowser.test.tsx`:

```typescript
it('renders List Movies button on the same row as Browse', () => {
  render(<FolderBrowser onFolderSelected={vi.fn()} recentFolders={[]} />);
  const browse = screen.getByTestId('browse-button');
  const listMovies = screen.getByTestId('list-movies-button');
  expect(browse.parentElement).toBe(listMovies.parentElement);
});

it('renders tooltips on recursion mode buttons', () => {
  render(<FolderBrowser onFolderSelected={vi.fn()} recentFolders={[]} />);
  const buttons = screen.getByTestId('recursion-mode').querySelectorAll('button');
  expect(buttons[0].getAttribute('title')).toBeTruthy();
  expect(buttons[1].getAttribute('title')).toBeTruthy();
  expect(buttons[2].getAttribute('title')).toBeTruthy();
});

it('calls onFolderSelected when a recent folder is clicked', () => {
  const onSelect = vi.fn();
  render(<FolderBrowser onFolderSelected={onSelect} recentFolders={['/movies', '/tv']} />);
  fireEvent.click(screen.getByText('/movies'));
  expect(onSelect).toHaveBeenCalledWith('/movies', expect.any(String));
});

it('renders explanatory note text', () => {
  render(<FolderBrowser onFolderSelected={vi.fn()} recentFolders={[]} />);
  expect(screen.getByText(/listing movies can take/i)).toBeDefined();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/FolderBrowser.test.tsx`
Expected: 4 new tests FAIL

- [ ] **Step 3: Implement the changes**

Replace `src/renderer/components/FolderBrowser.tsx` with:

```tsx
import React, { useState } from 'react';

interface FolderBrowserProps {
  onFolderSelected: (path: string, recursionMode: string) => void;
  recentFolders: string[];
  onRemoveRecentFolder?: (folder: string) => void;
  initialRecursionMode?: 'none' | 'subfolders' | 'full';
}

type RecursionMode = 'none' | 'subfolders' | 'full';

const RECURSION_OPTIONS: { label: string; value: RecursionMode; tooltip: string }[] = [
  { label: 'None', value: 'none', tooltip: 'Only look in this directory, not in subfolders' },
  { label: 'Subfolders', value: 'subfolders', tooltip: 'Look one level deep into immediate subfolders, but not deeper' },
  { label: 'Full', value: 'full', tooltip: 'Recursively look in all subfolders at every level' },
];

export function FolderBrowser({ onFolderSelected, recentFolders, onRemoveRecentFolder, initialRecursionMode = 'none' }: FolderBrowserProps): React.JSX.Element {
  const [folderPath, setFolderPath] = useState(recentFolders[0] ?? '');
  const [recursionMode, setRecursionMode] = useState<RecursionMode>(initialRecursionMode);

  const handleBrowse = async (): Promise<void> => {
    const zeebDialog = (window as any).zeebDialog;
    if (zeebDialog) {
      const path = await zeebDialog.openDirectory();
      if (path) setFolderPath(path);
    }
  };

  return (
    <div className="flex-1 p-4">
      <div className="flex gap-2 mb-3">
        <input
          data-testid="folder-path-input"
          className="flex-1 border border-gray-300 rounded px-2 py-1.5"
          value={folderPath}
          onChange={(e) => setFolderPath(e.target.value)}
          placeholder="Enter folder path..."
        />
        <button
          data-testid="browse-button"
          className="px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300 shrink-0"
          onClick={handleBrowse}
        >
          Browse...
        </button>
        <button
          data-testid="list-movies-button"
          className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 shrink-0"
          onClick={() => onFolderSelected(folderPath, recursionMode)}
        >
          List Movies
        </button>
      </div>

      <div data-testid="recent-folders" className="flex gap-2 mb-3 overflow-x-auto max-h-10">
        {recentFolders.map((folder, index) => (
          <div key={index} className="flex items-center bg-gray-200 rounded text-sm shrink-0">
            <button
              className="px-2 py-1 whitespace-nowrap hover:bg-gray-300 rounded-l"
              onClick={() => onFolderSelected(folder, recursionMode)}
            >
              {folder}
            </button>
            <button
              className="px-1 py-1 text-red-500 hover:text-red-700 hover:bg-gray-300 rounded-r text-xs font-bold"
              onClick={() => onRemoveRecentFolder?.(folder)}
              title="Remove"
            >
              x
            </button>
          </div>
        ))}
      </div>

      <div data-testid="recursion-mode" className="flex gap-2 mb-3">
        {RECURSION_OPTIONS.map((option) => (
          <button
            key={option.value}
            title={option.tooltip}
            className={`px-2 py-1 border rounded ${
              recursionMode === option.value
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300'
            }`}
            onClick={() => setRecursionMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 italic">
        Note: Listing movies can take several seconds or more, especially on network shares or when including subfolders.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/FolderBrowser.test.tsx`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/FolderBrowser.tsx __tests__/components/FolderBrowser.test.tsx
git commit -m "feat: compact FolderBrowser layout, tooltips, auto-scan recent folders, note text"
```

---

### Task 2: Remove "Start Processing" toolbar and update App tests

**Context:** `App.tsx` lines 188-198 render a toolbar with a "Start Processing" button when in folder browser view. This button switches to process view without scanning — useless. Remove the entire block. The existing App test "switches to process view" (line 42-47) clicks `start-processing` — replace it with a test that verifies the button no longer exists.

**Files:**
- Modify: `src/renderer/App.tsx` (lines 188-198)
- Modify: `__tests__/App.test.tsx` (lines 42-47)

- [ ] **Step 1: Update the test**

In `__tests__/App.test.tsx`, replace the "switches to process view" test (lines 42-47) with:

```typescript
it('does not render Start Processing button', () => {
  render(<App fs={mockFs} />);
  expect(screen.queryByTestId('start-processing')).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/App.test.tsx`
Expected: FAIL — `start-processing` element still exists

- [ ] **Step 3: Remove the toolbar block**

In `src/renderer/App.tsx`, remove lines 188-198 (the entire `{view === 'folderBrowser' && (<div className="flex flex-row p-2 bg-gray-100 gap-3">...</div>)}` block).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/App.test.tsx`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/App.tsx __tests__/App.test.tsx
git commit -m "fix: remove useless Start Processing toolbar button"
```

---

### Task 3: Add "Open Folder" menu item with IPC wiring

**Context:** Add "Open Folder" (Ctrl+O / Cmd+O) to the File menu in `src/main/index.ts`. It sends `menu:open-folder` IPC. The preload exposes `onOpenFolder` on `window.zeebMenu`. App.tsx listens and switches to folder browser view with `setFiles([])`.

**Files:**
- Modify: `src/main/index.ts` (menu template, lines 51-78)
- Modify: `src/preload/main.ts` (zeebMenu, lines 29-38)
- Modify: `src/renderer/App.tsx` (menu listener, lines 66-75)
- Modify: `__tests__/App.test.tsx`
- Modify: `__tests__/preload/preload.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `__tests__/App.test.tsx`:

```typescript
it('registers onOpenFolder handler', () => {
  mockZeebMenu.onOpenFolder = vi.fn();
  render(<App fs={mockFs} />);
  expect(mockZeebMenu.onOpenFolder).toHaveBeenCalled();
});

it('switches to folder browser when Open Folder callback fires', () => {
  let openFolderCallback: (() => void) | null = null;
  mockZeebMenu.onOpenFolder = vi.fn((cb: () => void) => { openFolderCallback = cb; });
  render(<App fs={mockFs} />);
  // Simulate moving to process view by firing the callback, then going back
  act(() => { openFolderCallback?.(); });
  expect(screen.getByTestId('folder-browser')).toBeDefined();
});
```

Add to `__tests__/preload/preload.test.ts` inside the `'main preload'` describe block:

```typescript
it('exposes onOpenFolder on zeebMenu', async () => {
  await import('../../src/preload/main');
  const { contextBridge: cb } = await import('electron');
  const exposeMock = cb.exposeInMainWorld as ReturnType<typeof vi.fn>;
  const menuCall = exposeMock.mock.calls.find((c: unknown[]) => c[0] === 'zeebMenu');
  expect(menuCall).toBeDefined();
  expect(menuCall![1]).toHaveProperty('onOpenFolder');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/App.test.tsx`
Expected: FAIL — `onOpenFolder` not a function

- [ ] **Step 3: Add menu item to main process**

In `src/main/index.ts`, add the Open Folder menu item to the File submenu. Insert as the first item (before Options):

```typescript
        {
          label: 'Open Folder',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:open-folder'),
        },
```

- [ ] **Step 4: Add to preload**

In `src/preload/main.ts`, add inside the `zeebMenu` object (after line 32):

```typescript
  onOpenFolder: (callback: () => void) => ipcRenderer.on('menu:open-folder', callback),
```

- [ ] **Step 5: Add listener in App.tsx**

In `src/renderer/App.tsx`, inside the `useEffect` that registers menu listeners (lines 66-75), add after line 74:

```typescript
    window.zeebMenu.onOpenFolder(() => {
      setFiles([]);
      setView('folderBrowser');
    });
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/main/index.ts src/preload/main.ts src/renderer/App.tsx __tests__/App.test.tsx __tests__/preload/preload.test.ts
git commit -m "feat: add Open Folder menu item (Ctrl+O) to return to folder browser"
```

---

## Verification

Run: `npx vitest run`
Expected: All tests pass.
