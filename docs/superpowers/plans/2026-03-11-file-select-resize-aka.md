# File Select, Dynamic Resize, AKA Support

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix file click selection, make FileList fill available space, and implement AKA extraction + UI matching legacy Flex behavior.

**Architecture:** File click bubbles from Renamer → App via new callback prop. FileList drops fixed `max-h` in favor of flex growth. AKA extraction adds `alternateName` from JSON-LD + DOM scrape of "Also Known As" section; UI adds a Use AKA button and editable AKA dropdown to the rename area.

**Tech Stack:** React, Zustand, Electron webview preload, Tailwind CSS

---

## Chunk 1: File Click Selection + FileList Resize

### Task 1: Wire file click from FileList through Renamer to App

**Files:**
- Modify: `src/renderer/components/Renamer.tsx:22-40` (props), `src/renderer/components/Renamer.tsx:217-223` (handler)
- Modify: `src/renderer/App.tsx:111-119` (add handlers), `src/renderer/App.tsx:179-210` (pass props)

- [ ] **Step 1: Add `onFileSelect` prop to RenamerProps**

In `src/renderer/components/Renamer.tsx`, add to `RenamerProps`:
```ts
onFileSelect?: (index: number) => void;
```
Destructure it in the component params. Replace `handleFileSelect` body:
```ts
const handleFileSelect = useCallback(
  (index: number) => {
    onFileSelect?.(index);
  },
  [onFileSelect],
);
```

- [ ] **Step 2: Add handlers in App.tsx**

After `handleComplete1`, add:
```ts
const handleFileSelect0 = useCallback((clickedIndex: number) => {
  setFileIndex0(clickedIndex);
  setFileIndex1(findNextVisible(clickedIndex + 1, 1));
}, [findNextVisible]);

const handleFileSelect1 = useCallback((clickedIndex: number) => {
  setFileIndex1(clickedIndex);
  setFileIndex0(findNextVisible(clickedIndex + 1, 1));
}, [findNextVisible]);
```

Pass `onFileSelect={handleFileSelect0}` to Renamer 0 and `onFileSelect={handleFileSelect1}` to Renamer 1.

- [ ] **Step 3: Verify in browser**

Click a filename in the list. Active renamer should load that file. The other renamer should pre-cache the next visible file.

- [ ] **Step 4: Commit**

```
feat: wire file click selection from FileList through to App
```

### Task 2: Make FileList dynamically fill available space

**Files:**
- Modify: `src/renderer/components/FileList.tsx:13` (remove max-h-48)
- Modify: `src/renderer/components/Renamer.tsx:358` (flex container already correct)

- [ ] **Step 1: Remove fixed max-height from FileList**

In `FileList.tsx`, change:
```tsx
<div data-testid="file-list" className="overflow-y-auto max-h-48">
```
to:
```tsx
<div data-testid="file-list" className="overflow-y-auto">
```

The parent in Renamer.tsx already has `flex-1 overflow-y-auto min-h-0` which will let FileList grow to fill available vertical space.

- [ ] **Step 2: Also remove fixed max-h on movie results**

In Renamer.tsx line 369, change:
```tsx
<div data-testid="movie-results" className="overflow-y-auto min-h-[80px] max-h-48">
```
to:
```tsx
<div data-testid="movie-results" className="overflow-y-auto min-h-[80px] max-h-[30%]">
```

This keeps results from overwhelming the file list while still being dynamic.

- [ ] **Step 3: Verify in browser**

Resize the window. FileList should grow/shrink with available space. Movie results should cap at ~30% of the left panel.

- [ ] **Step 4: Commit**

```
fix: FileList dynamically resizes to fill available space
```

---

## Chunk 2: AKA Extraction + UI

### Task 3: Extract AKA data from IMDB title pages

**Files:**
- Modify: `src/preload/webview.ts:76-153` (extractTitleData function)
- Modify: `src/services/imdbExtractor.ts:136-157` (generateTitleExtractionScript)

- [ ] **Step 1: Add AKA extraction to webview preload**

In `src/preload/webview.ts`, inside `extractTitleData()`, after the `genres` block (~line 125) and before the `duration` block, add:

```ts
// AKA: from JSON-LD alternateName + DOM scrape of "Also Known As" section
let akas: string[] = [];
if (ld.alternateName) {
  akas.push(ld.alternateName);
}

// Scrape inline "Also Known As" from the details section
const akaElements = document.querySelectorAll('[data-testid="details-languages"] ~ div, li[data-testid="title-details-aka"]');
for (const el of akaElements) {
  const text = (el.textContent || '').trim();
  if (text && !akas.includes(text)) akas.push(text);
}

// Also try the general AKA pattern in the page
const akaSection = document.querySelector('[class*="AKA"], [data-testid*="aka"]');
if (akaSection) {
  const text = (akaSection.textContent || '').replace(/Also Known As\s*/i, '').trim();
  if (text && !akas.includes(text)) akas.push(text);
}
```

Then change `aka: [],` to `aka: akas,` in the return object.

- [ ] **Step 2: Mirror in generateTitleExtractionScript**

In `src/services/imdbExtractor.ts`, same logic but as string JS. Change `aka: [],` to use the extracted akas array. (This function is legacy fallback — the preload is primary.)

- [ ] **Step 3: Commit**

```
feat: extract AKA/alternateName from IMDB title pages
```

### Task 4: Add AKA UI to Renamer

**Files:**
- Modify: `src/renderer/components/Renamer.tsx:410-445` (bottom area, add AKA row)
- Modify: `src/renderer/components/Renamer.tsx:124-149` (format selection logic)
- Modify: `src/services/formatEngine.ts:54-55` (fix `<original>` token)

- [ ] **Step 1: Add AKA state and controls**

In `Renamer.tsx`, add state:
```ts
const [useAka, setUseAka] = useState(false);
const [selectedAka, setSelectedAka] = useState('');
```

Reset them when `currentFile` changes (in the existing useEffect):
```ts
setUseAka(false);
setSelectedAka('');
```

- [ ] **Step 2: Auto-populate selectedAka when metadata arrives**

Add effect after the format preview effect:
```ts
useEffect(() => {
  if (metadata && metadata.aka.length > 0) {
    setSelectedAka(metadata.aka[0]);
  } else {
    setSelectedAka('');
    setUseAka(false);
  }
}, [metadata]);
```

- [ ] **Step 3: Update format selection to respect useAka**

Change the format selection in the preview effect from:
```ts
const format = currentFile.isDvdFolder
  ? config.formatDvd
  : metadata.aka.length > 0
    ? config.formatAka
    : config.formatStandard;
```
to:
```ts
const format = currentFile.isDvdFolder
  ? config.formatDvd
  : useAka && selectedAka
    ? config.formatAka
    : config.formatStandard;
```

Add `useAka` and `selectedAka` to the effect dependency array.

- [ ] **Step 4: Fix `<original>` and `<aka>` tokens in formatEngine**

In `src/services/formatEngine.ts`, the `<original>` token currently just maps to `metadata.title` which is wrong — it should be the page title (local title) when AKA is used. But since the Renamer controls which format string is used and the AKA value, pass the selected AKA through to the format engine.

Update `FormatOptions` to include:
```ts
selectedAka?: string;
```

Update the tokens:
```ts
'<aka>': options.selectedAka ?? metadata.aka[0] ?? '',
```

In Renamer.tsx, pass `selectedAka` in the options:
```ts
const formatted = interpolateFormat(format, metadata, {
  saved,
  selectedAka: useAka ? selectedAka : undefined,
  // ...existing options
});
```

- [ ] **Step 5: Add AKA row to the bottom area UI**

In Renamer.tsx, between the SearchParts div and RenamePreview, add:
```tsx
{metadata && metadata.aka.length > 0 && (
  <div className="flex items-center gap-2 px-2 py-0.5 border-b border-gray-200 bg-gray-50">
    <button
      className={`px-2 py-0.5 text-[11px] font-bold rounded shrink-0 ${
        useAka
          ? 'bg-green-600 text-white hover:bg-green-700'
          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
      }`}
      onClick={() => setUseAka(!useAka)}
    >
      Use AKA
    </button>
    <span className="text-[11px] text-gray-500 shrink-0">Also Known As</span>
    <select
      className="flex-1 px-1 py-0.5 text-xs border border-gray-300 rounded bg-white"
      value={selectedAka}
      onChange={(e) => {
        setSelectedAka(e.target.value);
        if (!useAka) setUseAka(true);
      }}
    >
      {metadata.aka.map((a, i) => (
        <option key={i} value={a}>{a}</option>
      ))}
    </select>
  </div>
)}
```

- [ ] **Step 6: Verify in browser**

Load a foreign film (e.g., A Separation, Parasite). AKA row should appear with the alternate name. Clicking "Use AKA" should toggle the format. The preview filename should update.

- [ ] **Step 7: Commit**

```
feat: add AKA selection UI matching legacy Flex behavior
```

### Task 5: Run full test suite

- [ ] **Step 1: Run vitest**

```bash
npx vitest run
```

All 134+ tests should pass. Fix any failures.

- [ ] **Step 2: Final commit if tests needed fixes**

```
fix: test adjustments for AKA support
```
