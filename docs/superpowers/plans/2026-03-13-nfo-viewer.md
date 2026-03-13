# NFO Viewer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the existing NfoViewer with URL detection + clipboard copy icons, wire it into Renamer with an NFO button.

**Architecture:** Enhance `NfoViewer.tsx` to parse content for URLs, render them with copy-to-clipboard icons. Add NFO button to Renamer's bottom panel that loads NFO content (CP437-decoded) and opens the viewer. Add a string-based CP437 decode function for use with `FsAdapter.readFile('latin1')`.

**Tech Stack:** React, TypeScript, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-13-nfo-viewer-design.md`

---

## Chunk 1: CP437 string decode + NfoViewer enhancements + Renamer wiring

### Task 1: Add string-based CP437 decode

**Context:** `cp437ToUnicode(buffer: Buffer)` exists but requires a `Buffer`. The renderer reads files via IPC as strings. We need a variant that accepts a `latin1`-encoded string (where `charCodeAt(i)` equals the original byte value).

**Files:**
- Modify: `src/utils/cp437.ts:50-56`
- Modify: `__tests__/utils/cp437.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `__tests__/utils/cp437.test.ts`:

```typescript
import { cp437StringToUnicode } from '../../src/utils/cp437';

it('converts a latin1-encoded string using CP437 table', () => {
  // 0xDA = ┌, 0xC4 = ─, 0xBF = ┐ in CP437
  const latin1 = String.fromCharCode(0xDA, 0xC4, 0xBF);
  expect(cp437StringToUnicode(latin1)).toBe('┌─┐');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/utils/cp437.test.ts`
Expected: FAIL — `cp437StringToUnicode` not exported

- [ ] **Step 3: Implement cp437StringToUnicode**

Add to `src/utils/cp437.ts` after the existing `cp437ToUnicode` function:

```typescript
/**
 * Converts a latin1-encoded string (from readFile with 'latin1' encoding)
 * to Unicode using the CP437 table. Each character's charCode is used as
 * the byte index into the CP437 lookup table.
 */
export function cp437StringToUnicode(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    result += CP437_TABLE[str.charCodeAt(i)];
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/utils/cp437.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/cp437.ts __tests__/utils/cp437.test.ts
git commit -m "feat: add cp437StringToUnicode for latin1-encoded string input"
```

---

### Task 2: Enhance NfoViewer with URL detection, copy icons, and Escape key

**Context:** The existing `NfoViewer` component renders raw text in a `<pre>`. Enhance it to: detect URLs via regex, render each URL with a copy icon that copies to clipboard with 1500ms "Copied!" feedback, and close on Escape.

**Files:**
- Modify: `src/renderer/components/NfoViewer.tsx`
- Modify: `__tests__/components/NfoViewer.test.tsx`

- [ ] **Step 1: Write failing tests**

Replace the content of `__tests__/components/NfoViewer.test.tsx` with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NfoViewer } from '../../src/renderer/components/NfoViewer';

describe('NfoViewer', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <NfoViewer visible={false} content="test" onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders NFO content', () => {
    render(<NfoViewer visible={true} content="╔═══╗" onClose={vi.fn()} />);
    expect(screen.getByText('╔═══╗')).toBeDefined();
  });

  it('detects URLs and renders copy icons', () => {
    const content = 'Visit https://example.com for info';
    render(<NfoViewer visible={true} content={content} onClose={vi.fn()} />);
    expect(screen.getByText('https://example.com')).toBeDefined();
    expect(screen.getByTestId('copy-url-0')).toBeDefined();
  });

  it('copies URL to clipboard on icon click', async () => {
    const content = 'Visit https://example.com for info';
    render(<NfoViewer visible={true} content={content} onClose={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-url-0'));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com');
  });

  it('does not include trailing punctuation in detected URLs', () => {
    const content = 'See (https://example.com).';
    render(<NfoViewer visible={true} content={content} onClose={vi.fn()} />);
    expect(screen.getByText('https://example.com')).toBeDefined();
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<NfoViewer visible={true} content="test" onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/NfoViewer.test.tsx`
Expected: 3 new tests fail (copy icon, clipboard, escape). Existing tests should still pass.

- [ ] **Step 3: Implement the enhanced NfoViewer**

Replace `src/renderer/components/NfoViewer.tsx` with:

```tsx
import React, { useEffect, useState, useCallback } from 'react';

interface NfoViewerProps {
  visible: boolean;
  content: string;
  onClose: () => void;
}

const URL_REGEX = /https?:\/\/[^\s<>")\],.;:]+/g;

interface ContentSegment {
  type: 'text' | 'url';
  value: string;
}

function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(URL_REGEX.source, 'g');

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'url', value: match[0] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return segments;
}

function CopyableUrl({ url, index }: { url: string; index: number }): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [url]);

  return (
    <span className="relative inline">
      <span className="text-blue-400 underline">{url}</span>
      <span
        data-testid={`copy-url-${index}`}
        className="absolute -top-4 -right-5 cursor-pointer text-[10px] text-gray-400 hover:text-white select-none"
        onClick={handleCopy}
        title="Copy URL"
      >
        {copied ? 'Copied!' : '📋'}
      </span>
    </span>
  );
}

export function NfoViewer({ visible, content, onClose }: NfoViewerProps): React.JSX.Element | null {
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  const segments = parseContent(content);
  let urlIndex = 0;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white">NFO Viewer</h2>
        <button data-testid="close-nfo" className="text-blue-400" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="font-mono text-xs text-green-400 leading-4 whitespace-pre">
          {segments.map((seg, i) => {
            if (seg.type === 'url') {
              const idx = urlIndex++;
              return <CopyableUrl key={i} url={seg.value} index={idx} />;
            }
            return <React.Fragment key={i}>{seg.value}</React.Fragment>;
          })}
        </pre>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/NfoViewer.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/NfoViewer.tsx __tests__/components/NfoViewer.test.tsx
git commit -m "feat: add URL detection with copy icons and Escape key to NfoViewer"
```

---

### Task 3: Wire NFO button into Renamer

**Context:** Add an "NFO" button to the filename/size bar in Renamer's bottom panel (line 644-660). The button is only visible when `currentFile.nfoPath` is non-null. On click, it reads the NFO file as `latin1`, decodes with `cp437StringToUnicode`, and opens the NfoViewer overlay. Import `NfoViewer` and `cp437StringToUnicode`. Add state for `nfoViewerOpen` and `nfoContent`.

**Files:**
- Modify: `src/renderer/components/Renamer.tsx` (imports ~line 1-24, state ~line 47-55, bottom panel ~line 644-660, JSX end ~line 704-706)

- [ ] **Step 1: Write failing tests for NFO button visibility**

Add to `__tests__/renderer/Renamer.test.tsx`:

```typescript
it('shows NFO button when file has nfoPath', () => {
  const fileWithNfo = { ...testFile, nfoPath: '/movies/The.Matrix.1999.nfo', hasNfo: true };
  render(
    <Renamer instanceId={0} visible={true} fileIndex={0} files={[fileWithNfo]} fs={mockFs} />,
  );
  expect(screen.getByTestId('nfo-button')).toBeDefined();
});

it('hides NFO button when file has no nfoPath', () => {
  render(
    <Renamer instanceId={0} visible={true} fileIndex={0} files={[testFile]} fs={mockFs} />,
  );
  expect(screen.queryByTestId('nfo-button')).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/renderer/Renamer.test.tsx`
Expected: FAIL — `nfo-button` not found

- [ ] **Step 3: Add imports**

Add to the imports section of `src/renderer/components/Renamer.tsx`:

After `import { PosterGrid } from './PosterGrid';` (line 24), add:
```typescript
import { NfoViewer } from './NfoViewer';
import { cp437StringToUnicode } from '../../utils/cp437';
```

- [ ] **Step 4: Add state**

After `const [selectedPosterIndex, setSelectedPosterIndex] = useState<number | null>(null);` (line 55), add:
```typescript
const [nfoViewerOpen, setNfoViewerOpen] = useState(false);
const [nfoContent, setNfoContent] = useState('');
```

- [ ] **Step 5: Add NFO button to bottom panel**

In the filename/size bar div (around line 652, before `<span className="flex-1" />`), add the NFO button:

Replace:
```tsx
            <span className="flex-1" />
            <button
              data-testid="search-button"
```

With:
```tsx
            <span className="flex-1" />
            {currentFile.nfoPath && (
              <button
                data-testid="nfo-button"
                className="px-2 py-0.5 bg-gray-600 text-white text-[11px] font-bold rounded hover:bg-gray-700 shrink-0"
                onClick={async () => {
                  try {
                    const raw = await fs.readFile(currentFile.nfoPath!, 'latin1');
                    setNfoContent(cp437StringToUnicode(raw));
                    setNfoViewerOpen(true);
                  } catch { /* silently skip */ }
                }}
              >
                NFO
              </button>
            )}
            <button
              data-testid="search-button"
```

- [ ] **Step 6: Add NfoViewer component to JSX**

Before the closing `</div>` of the root element (line 705), add:

```tsx
      <NfoViewer
        visible={nfoViewerOpen}
        content={nfoContent}
        onClose={() => setNfoViewerOpen(false)}
      />
```

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/renderer/components/Renamer.tsx __tests__/renderer/Renamer.test.tsx
git commit -m "feat: wire NFO button and viewer into Renamer bottom panel"
```

---

## Verification

Run: `npx vitest run`
Expected: All tests pass (existing 249 + new tests).
