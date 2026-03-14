# GitHub & Deployment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Zeeb Movie Renamer v4.0.0 as a public GitHub repo with CI builds, GitHub Releases, in-app update notifications, and Help/About dialog.

**Architecture:** Electron Forge packages the app for Windows (Squirrel) and macOS (DMG). GitHub Actions builds on tag push. Main process checks GitHub Releases API for updates, renderer shows modal with markdown release notes. CHANGELOG.md is the single source of truth for release notes.

**Tech Stack:** Electron Forge, GitHub Actions, `marked` + `dompurify` for markdown rendering, Node `https` for update downloads.

**Spec:** `docs/superpowers/specs/2026-03-14-github-deployment-design.md`

---

## File Map

### New Files
- `assets/zeeb.ico` — Windows icon (copied from legacy)
- `assets/zeeb.icns` — macOS icon (copied from legacy)
- `assets/zeeb512.png` — PNG icon for About dialog
- `assets/tmdb-logo.svg` — TMDB attribution logo
- `CHANGELOG.md` — Release notes source of truth
- `scripts/extract-changelog.js` — Extracts version section from CHANGELOG
- `.github/workflows/release.yml` — CI build + publish
- `src/main/updateChecker.ts` — GitHub Releases version check + download
- `src/main/squirrelHandler.ts` — Squirrel install/update/uninstall lifecycle
- `src/renderer/components/UpdateModal.tsx` — Update notification modal
- `src/renderer/components/AboutModal.tsx` — Help → About dialog
- `src/services/versionCompare.ts` — Semver comparison utility
- `src/services/markdownRenderer.ts` — marked + dompurify wrapper
- `__tests__/services/versionCompare.test.ts`
- `__tests__/services/markdownRenderer.test.ts`
- `__tests__/components/UpdateModal.test.tsx`
- `__tests__/components/AboutModal.test.tsx`
- `__tests__/scripts/extractChangelog.test.ts`

### Modified Files
- `package.json` — version, metadata, dependencies
- `forge.config.ts` — icons, maker config, generateAssets hook
- `.gitignore` — clean up React Native entries, add Forge outputs
- `src/main/index.ts` — import squirrelHandler, Help menu, update IPC
- `src/main/ipc.ts` — add `app:getReleaseNotes` handler
- `src/preload/main.ts` — add `zeebUpdate` namespace, `onAbout` to `zeebMenu`
- `src/types/electron.d.ts` — add `zeebUpdate` types, `onAbout`
- `src/types/index.ts` — add `skipUpdateVersion` to ZeebConfig
- `src/services/configDefaults.ts` — add `skipUpdateVersion` default
- `src/renderer/App.tsx` — wire UpdateModal, AboutModal
- `src/renderer/components/ReleaseNotes.tsx` — render markdown from IPC
- `src/renderer/components/options/ImdbSection.tsx` — add TMDB API key input + link
- `README.md` — replace with proper docs

### Deleted Files
- `NuGet.config` — React Native leftover

---

## Chunk 1: Foundation

### Task 1: Project Cleanup

**Files:**
- Delete: `NuGet.config`
- Modify: `.gitignore`
- Modify: `package.json`
- Copy: icon files to `assets/`
- Download: TMDB logo to `assets/`

- [ ] **Step 1: Delete NuGet.config**

```bash
rm NuGet.config
```

- [ ] **Step 2: Clean .gitignore**

Remove all React Native sections (Xcode, Android, CocoaPods, fastlane, Metro, Buck, Pods). Add:

```
# Electron Forge
out/
.vite/
```

Keep: node_modules, .env, credentials.json, coverage, build/, test-data entries.

- [ ] **Step 3: Copy icon files**

```bash
mkdir -p assets
cp "legacy_adobe_flex_src/src/assets/icon/ico (windows)/zeeb.ico" assets/zeeb.ico
cp "legacy_adobe_flex_src/src/assets/icon/icns (mac)/zeeb.icns" assets/zeeb.icns
cp "legacy_adobe_flex_src/src/assets/icon/zeeb512.png" assets/zeeb512.png
```

- [ ] **Step 4: Download TMDB logo**

```bash
curl -o assets/tmdb-logo.svg "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg"
```

- [ ] **Step 5: Update package.json metadata**

Change these fields:
```json
{
  "name": "zeeb",
  "productName": "Zeeb Movie Renamer",
  "version": "4.0.0",
  "description": "Batch movie file renamer with IMDB integration",
  "author": "jamison-wilde",
  "license": "MIT"
}
```

- [ ] **Step 6: Install new dependencies**

```bash
npm install marked dompurify
npm install --save-dev @types/dompurify
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: project cleanup, icons, bump to v4.0.0"
```

---

### Task 2: Forge Config & Squirrel Handler

**Files:**
- Modify: `forge.config.ts`
- Create: `src/main/squirrelHandler.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Update forge.config.ts**

```typescript
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'assets/zeeb',
    name: 'Zeeb Movie Renamer',
  },
  makers: [
    new MakerSquirrel({
      name: 'Zeeb',
      setupIcon: 'assets/zeeb.ico',
      noMsi: true,
    }),
    new MakerDMG({
      icon: 'assets/zeeb.icns',
    }),
    new MakerZIP({}, ['darwin']),
  ],
  hooks: {
    generateAssets: async () => {
      const { execSync } = require('child_process');
      execSync('node scripts/extract-changelog.js', { stdio: 'inherit' });
    },
  },
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main/index.ts', config: 'vite.main.config.ts', target: 'main' },
        { entry: 'src/preload/main.ts', config: 'vite.preload.config.ts', target: 'preload', name: 'main_preload' },
        { entry: 'src/preload/webview.ts', config: 'vite.preload.config.ts', target: 'preload', name: 'webview_preload' },
      ],
      renderer: [
        { name: 'main_window', config: 'vite.renderer.config.ts' },
      ],
    }),
  ],
};

export default config;
```

- [ ] **Step 2: Create squirrelHandler.ts**

```typescript
// src/main/squirrelHandler.ts
import { app } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';

function run(args: string[], done: () => void): void {
  const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
  spawn(updateExe, args, { detached: true }).on('close', done);
}

export function handleSquirrelEvents(): boolean {
  if (process.platform !== 'win32') return false;

  const cmd = process.argv[1];

  switch (cmd) {
    case '--squirrel-install':
    case '--squirrel-updated':
      run(['--createShortcut=' + path.basename(process.execPath)], () => app.quit());
      return true;

    case '--squirrel-uninstall':
      run(['--removeShortcut=' + path.basename(process.execPath)], () => app.quit());
      return true;

    case '--squirrel-obsolete':
      app.quit();
      return true;

    default:
      return false;
  }
}
```

- [ ] **Step 3: Wire squirrel handler into main/index.ts**

Add at the very top of `src/main/index.ts` (after imports):

```typescript
import { handleSquirrelEvents } from './squirrelHandler';

if (handleSquirrelEvents()) {
  // Squirrel is handling install/update/uninstall — exit immediately
  process.exit(0);
}
```

This must be before any `app.whenReady()` or window creation.

- [ ] **Step 4: Commit**

```bash
git add forge.config.ts src/main/squirrelHandler.ts src/main/index.ts
git commit -m "feat: configure Forge packaging with icons and Squirrel handler"
```

---

### Task 3: Version Compare Utility

**Files:**
- Create: `src/services/versionCompare.ts`
- Create: `__tests__/services/versionCompare.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// __tests__/services/versionCompare.test.ts
import { describe, it, expect } from 'vitest';
import { isNewerVersion } from '../src/services/versionCompare';

describe('isNewerVersion', () => {
  it('returns true when candidate major is higher', () => {
    expect(isNewerVersion('5.0.0', '4.0.0')).toBe(true);
  });

  it('returns true when candidate minor is higher', () => {
    expect(isNewerVersion('4.1.0', '4.0.0')).toBe(true);
  });

  it('returns true when candidate patch is higher', () => {
    expect(isNewerVersion('4.0.1', '4.0.0')).toBe(true);
  });

  it('returns false when versions are equal', () => {
    expect(isNewerVersion('4.0.0', '4.0.0')).toBe(false);
  });

  it('returns false when candidate is older', () => {
    expect(isNewerVersion('3.9.9', '4.0.0')).toBe(false);
  });

  it('strips v prefix', () => {
    expect(isNewerVersion('v5.0.0', 'v4.0.0')).toBe(true);
  });

  it('handles two-segment versions', () => {
    expect(isNewerVersion('4.1', '4.0')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npx vitest run __tests__/services/versionCompare.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/services/versionCompare.ts

/** Returns true if candidate is a newer semver than current. Strips leading 'v'. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const a = parse(candidate);
  const b = parse(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    if (ai > bi) return true;
    if (ai < bi) return false;
  }
  return false;
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npx vitest run __tests__/services/versionCompare.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/services/versionCompare.ts __tests__/services/versionCompare.test.ts
git commit -m "feat: add semver comparison utility"
```

---

### Task 4: Markdown Renderer Utility

**Files:**
- Create: `src/services/markdownRenderer.ts`
- Create: `__tests__/services/markdownRenderer.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// __tests__/services/markdownRenderer.test.ts
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../src/services/markdownRenderer';

describe('renderMarkdown', () => {
  it('renders heading', () => {
    const html = renderMarkdown('## Hello');
    expect(html).toContain('<h2');
    expect(html).toContain('Hello');
  });

  it('renders bullet list', () => {
    const html = renderMarkdown('- item one\n- item two');
    expect(html).toContain('<li>');
    expect(html).toContain('item one');
  });

  it('renders bold text', () => {
    const html = renderMarkdown('**bold**');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('strips script tags', () => {
    const html = renderMarkdown('<script>alert("xss")</script>');
    expect(html).not.toContain('<script');
  });

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npx vitest run __tests__/services/markdownRenderer.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/services/markdownRenderer.ts
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/** Renders markdown to sanitized HTML. */
export function renderMarkdown(markdown: string): string {
  if (!markdown) return '';
  const raw = marked.parse(markdown, { async: false }) as string;
  return DOMPurify.sanitize(raw);
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npx vitest run __tests__/services/markdownRenderer.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/services/markdownRenderer.ts __tests__/services/markdownRenderer.test.ts
git commit -m "feat: add markdown renderer with DOMPurify sanitization"
```

---

### Task 5: CHANGELOG + Extract Script

**Files:**
- Create: `CHANGELOG.md`
- Create: `scripts/extract-changelog.js`
- Create: `__tests__/scripts/extractChangelog.test.ts`

- [ ] **Step 1: Create CHANGELOG.md**

```markdown
# Changelog

## [4.0.0] - 2026-03-14

### Added
- Complete rewrite from Adobe Flex to Electron + React
- Dual-renamer workflow with interleaved file processing
- IMDB integration via embedded webview
- TMDB poster browsing and saving
- NFO file parsing for auto-selection
- Configurable filename format patterns
- AKA (alternate title) support
- Subtitle and companion file renaming
- Selective undo with per-file results
- DVD folder detection and renaming
- URL/webloc bookmark file generation
- Format tester in Options
- Recent folders with delete
- Window state persistence
```

- [ ] **Step 2: Write tests for extract script**

```typescript
// __tests__/scripts/extractChangelog.test.ts
import { describe, it, expect } from 'vitest';
import { extractVersionSection } from '../scripts/extract-changelog';

const SAMPLE = `# Changelog

## [4.1.0] - 2026-04-01

### Added
- New feature

## [4.0.0] - 2026-03-14

### Added
- Initial release
`;

describe('extractVersionSection', () => {
  it('extracts the correct version section', () => {
    const result = extractVersionSection(SAMPLE, '4.0.0');
    expect(result).toContain('Initial release');
    expect(result).not.toContain('New feature');
  });

  it('extracts first version section', () => {
    const result = extractVersionSection(SAMPLE, '4.1.0');
    expect(result).toContain('New feature');
    expect(result).not.toContain('Initial release');
  });

  it('returns null for missing version', () => {
    expect(extractVersionSection(SAMPLE, '9.9.9')).toBeNull();
  });

  it('handles version being the last section (no trailing ## header)', () => {
    const single = '# Changelog\n\n## [1.0.0] - 2026-01-01\n\n### Added\n- Only item\n';
    const result = extractVersionSection(single, '1.0.0');
    expect(result).toContain('Only item');
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

```bash
npx vitest run __tests__/scripts/extractChangelog.test.ts
```

- [ ] **Step 4: Implement extract-changelog.js**

The script exports `extractVersionSection` for testing, and when run directly reads from disk:

```javascript
// scripts/extract-changelog.js
const fs = require('fs');
const path = require('path');

/**
 * Extract a specific version's section from a Keep a Changelog file.
 * @param {string} changelog - Full changelog content
 * @param {string} version - Version to extract (e.g. '4.0.0')
 * @returns {string|null} The section content, or null if not found
 */
function extractVersionSection(changelog, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^## \\[${escaped}\\][^\n]*\n`, 'm');
  const match = pattern.exec(changelog);
  if (!match) return null;

  const start = match.index + match[0].length;
  const nextHeader = changelog.indexOf('\n## [', start);
  const end = nextHeader === -1 ? changelog.length : nextHeader;
  return changelog.substring(start, end).trim();
}

// When run directly: extract current version to assets/release-notes.md
if (require.main === module) {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
  const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf-8');
  const section = extractVersionSection(changelog, pkg.version);

  if (!section) {
    console.error(`No changelog section found for version ${pkg.version}`);
    process.exit(1);
  }

  const outDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'release-notes.md'), section, 'utf-8');
  console.log(`Extracted release notes for v${pkg.version} to assets/release-notes.md`);
}

module.exports = { extractVersionSection };
```

- [ ] **Step 5: Run tests, verify they pass**

```bash
npx vitest run __tests__/scripts/extractChangelog.test.ts
```

- [ ] **Step 6: Test the script manually**

```bash
node scripts/extract-changelog.js
cat assets/release-notes.md
```

Should output the 4.0.0 section content.

- [ ] **Step 7: Add `assets/release-notes.md` to .gitignore** (it's generated at build time)

- [ ] **Step 8: Commit**

```bash
git add CHANGELOG.md scripts/extract-changelog.js __tests__/scripts/extractChangelog.test.ts .gitignore
git commit -m "feat: add CHANGELOG.md and extract script with Forge hook"
```

---

## Chunk 2: Release Notes & Update Notification

### Task 6: Release Notes from Markdown (File Menu)

**Files:**
- Modify: `src/main/ipc.ts` — add `app:getReleaseNotes` handler
- Modify: `src/renderer/components/ReleaseNotes.tsx` — render markdown via IPC
- Modify: `__tests__/components/ReleaseNotes.test.tsx` (if exists, update; otherwise test existing behavior is preserved)

- [ ] **Step 1: Add IPC handler in main/ipc.ts**

Add to `registerIpcHandlers()`:

```typescript
ipcMain.handle('app:getReleaseNotes', async () => {
  // Try bundled release-notes.md first (production)
  const bundledPath = path.join(__dirname, '..', 'assets', 'release-notes.md');
  try {
    return fs.readFileSync(bundledPath, 'utf-8');
  } catch { /* not bundled — dev mode */ }

  // Dev fallback: extract from CHANGELOG.md
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(app.getAppPath(), 'package.json'), 'utf-8'));
    const changelog = fs.readFileSync(path.join(app.getAppPath(), 'CHANGELOG.md'), 'utf-8');
    const { extractVersionSection } = require('../../scripts/extract-changelog');
    return extractVersionSection(changelog, pkg.version) || 'No release notes available.';
  } catch {
    return 'No release notes available.';
  }
});
```

- [ ] **Step 2: Add to preload**

In `src/preload/main.ts`, add to the `zeebApp` block:

```typescript
getReleaseNotes: () => ipcRenderer.invoke('app:getReleaseNotes'),
```

- [ ] **Step 3: Add type to electron.d.ts**

In `zeebApp`:
```typescript
getReleaseNotes(): Promise<string>;
```

- [ ] **Step 4: Rewrite ReleaseNotes.tsx**

```tsx
// src/renderer/components/ReleaseNotes.tsx
import React, { useEffect, useState } from 'react';
import { renderMarkdown } from '../../services/markdownRenderer';

interface ReleaseNotesProps {
  visible: boolean;
  onClose: () => void;
}

export function ReleaseNotes({ visible, onClose }: ReleaseNotesProps): React.JSX.Element | null {
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!visible) return;
    window.zeebApp.getReleaseNotes().then((md) => {
      setHtml(renderMarkdown(md));
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-4/5 max-w-2xl max-h-[70%] bg-white rounded-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">Release Notes</h2>
          <button data-testid="release-notes-close" className="text-blue-500" onClick={onClose}>
            Close
          </button>
        </div>
        <div
          data-testid="release-notes-content"
          className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Fix any broken ReleaseNotes tests (update mocks for `window.zeebApp.getReleaseNotes`).

- [ ] **Step 6: Commit**

```bash
git add src/main/ipc.ts src/preload/main.ts src/types/electron.d.ts src/renderer/components/ReleaseNotes.tsx
git commit -m "feat: render release notes from CHANGELOG via IPC and marked"
```

---

### Task 7: Update Checker (Main Process)

**Files:**
- Create: `src/main/updateChecker.ts`
- Modify: `src/main/index.ts` — wire update check after window ready
- Modify: `src/types/index.ts` — add `skipUpdateVersion` to ZeebConfig
- Modify: `src/services/configDefaults.ts` — add default

- [ ] **Step 1: Add config field**

In `src/types/index.ts`, add to `ZeebConfig` interface:

```typescript
skipUpdateVersion: string | null;
```

In `src/services/configDefaults.ts`, add to `DEFAULT_CONFIG`:

```typescript
skipUpdateVersion: null,
```

- [ ] **Step 2: Create updateChecker.ts**

```typescript
// src/main/updateChecker.ts
import { app, BrowserWindow } from 'electron';
import https from 'node:https';
import path from 'node:path';
import fs from 'node:fs';
import { isNewerVersion } from '../services/versionCompare';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface ReleaseData {
  version: string;
  releaseNotes: string;
  releaseUrl: string;
  assets: Array<{ name: string; url: string; size: number }>;
}

function fetchLatestRelease(): Promise<ReleaseData | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/jamison-wilde/zeeb/releases/latest',
      headers: { 'User-Agent': 'Zeeb-Movie-Renamer' },
    };

    const req = https.get(options, (res) => {
      if (res.statusCode !== 200) { resolve(null); res.resume(); return; }
      let body = '';
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({
            version: (data.tag_name || '').replace(/^v/, ''),
            releaseNotes: data.body || '',
            releaseUrl: data.html_url || '',
            assets: (data.assets || []).map((a: ReleaseAsset) => ({
              name: a.name,
              url: a.browser_download_url,
              size: a.size,
            })),
          });
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

export function downloadAsset(
  url: string,
  window: BrowserWindow,
): void {
  const fileName = url.split('/').pop() || 'download';
  const downloadsPath = app.getPath('downloads');
  const filePath = path.join(downloadsPath, fileName);

  const follow = (downloadUrl: string) => {
    https.get(downloadUrl, { headers: { 'User-Agent': 'Zeeb-Movie-Renamer' } }, (res) => {
      // Follow redirects (GitHub serves assets via redirect)
      if (res.statusCode === 302 || res.statusCode === 301) {
        const location = res.headers.location;
        if (location) { follow(location); return; }
      }

      if (res.statusCode !== 200) {
        window.webContents.send('update:download-error', { message: `HTTP ${res.statusCode}` });
        res.resume();
        return;
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let bytesDownloaded = 0;
      const file = fs.createWriteStream(filePath);

      res.on('data', (chunk: Buffer) => {
        bytesDownloaded += chunk.length;
        const percent = totalBytes > 0 ? Math.round((bytesDownloaded / totalBytes) * 100) : 0;
        window.webContents.send('update:download-progress', { percent, bytesDownloaded, totalBytes });
      });

      res.pipe(file);

      file.on('finish', () => {
        file.close();
        window.webContents.send('update:download-complete', { filePath });
      });

      file.on('error', (err) => {
        fs.unlink(filePath, () => {});
        window.webContents.send('update:download-error', { message: err.message });
      });
    }).on('error', (err) => {
      window.webContents.send('update:download-error', { message: err.message });
    });
  };

  follow(url);
}

export function checkForUpdates(window: BrowserWindow, skipVersion: string | null): void {
  setTimeout(async () => {
    const release = await fetchLatestRelease();
    if (!release) return;
    if (!isNewerVersion(release.version, app.getVersion())) return;
    if (skipVersion === release.version) return;
    window.webContents.send('update:available', release);
  }, 5000);
}
```

- [ ] **Step 3: Wire into main/index.ts**

After `createWindow()` in the `app.whenReady()` block, add the update check and download IPC handler. Inside `createWindow()`, after the window is ready:

```typescript
import { checkForUpdates, downloadAsset } from './updateChecker';

// Inside createWindow(), after loadURL:
const configPath = path.join(app.getPath('userData'), 'zeeb-config.json');
let skipVersion: string | null = null;
try {
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  skipVersion = cfg.skipUpdateVersion ?? null;
} catch { /* no config yet */ }
checkForUpdates(mainWindow, skipVersion);

// Download handler
ipcMain.handle('update:download', (_event, assetUrl: string) => {
  downloadAsset(assetUrl, mainWindow);
});

// Show in folder handler
ipcMain.handle('update:show-in-folder', (_event, filePath: string) => {
  const { shell } = require('electron');
  shell.showItemInFolder(filePath);
});
```

- [ ] **Step 4: Commit**

```bash
git add src/main/updateChecker.ts src/main/index.ts src/types/index.ts src/services/configDefaults.ts
git commit -m "feat: add GitHub Releases update checker with download support"
```

---

### Task 8: Update Preload & Types

**Files:**
- Modify: `src/preload/main.ts` — add `zeebUpdate` namespace
- Modify: `src/types/electron.d.ts` — add types

- [ ] **Step 1: Add zeebUpdate to preload**

Add new `contextBridge.exposeInMainWorld` call in `src/preload/main.ts`:

```typescript
contextBridge.exposeInMainWorld('zeebUpdate', {
  onUpdateAvailable: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update:available', handler);
    return () => ipcRenderer.removeListener('update:available', handler);
  },
  downloadUpdate: (assetUrl: string) => ipcRenderer.invoke('update:download', assetUrl),
  onDownloadProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('update:download-progress', handler);
    return () => ipcRenderer.removeListener('update:download-progress', handler);
  },
  onDownloadComplete: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update:download-complete', handler);
    return () => ipcRenderer.removeListener('update:download-complete', handler);
  },
  onDownloadError: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update:download-error', handler);
    return () => ipcRenderer.removeListener('update:download-error', handler);
  },
  showInFolder: (filePath: string) => ipcRenderer.invoke('update:show-in-folder', filePath),
  openExternal: (url: string) => {
    const { shell } = require('electron');
    shell.openExternal(url);
  },
});
```

Note: `openExternal` cannot be called from the renderer directly. Use `ipcRenderer.invoke` instead:

```typescript
openExternal: (url: string) => ipcRenderer.invoke('update:open-external', url),
```

And add the handler in main:
```typescript
ipcMain.handle('update:open-external', (_event, url: string) => {
  const { shell } = require('electron');
  shell.openExternal(url);
});
```

- [ ] **Step 2: Add types to electron.d.ts**

```typescript
zeebUpdate: {
  onUpdateAvailable(callback: (data: {
    version: string;
    releaseNotes: string;
    releaseUrl: string;
    assets: Array<{ name: string; url: string; size: number }>;
  }) => void): () => void;
  downloadUpdate(assetUrl: string): Promise<void>;
  onDownloadProgress(callback: (progress: { percent: number; bytesDownloaded: number; totalBytes: number }) => void): () => void;
  onDownloadComplete(callback: (data: { filePath: string }) => void): () => void;
  onDownloadError(callback: (data: { message: string }) => void): () => void;
  showInFolder(filePath: string): Promise<void>;
  openExternal(url: string): Promise<void>;
};
```

- [ ] **Step 3: Commit**

```bash
git add src/preload/main.ts src/types/electron.d.ts src/main/index.ts
git commit -m "feat: add zeebUpdate preload namespace and IPC types"
```

---

### Task 9: Update Modal Component

**Files:**
- Create: `src/renderer/components/UpdateModal.tsx`
- Create: `__tests__/components/UpdateModal.test.tsx`
- Modify: `src/renderer/App.tsx` — wire modal

- [ ] **Step 1: Write tests**

```typescript
// __tests__/components/UpdateModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateModal } from '../src/renderer/components/UpdateModal';

const mockData = {
  version: '4.1.0',
  releaseNotes: '### Added\n- Cool feature',
  releaseUrl: 'https://github.com/jamison-wilde/zeeb/releases/tag/v4.1.0',
  assets: [
    { name: 'Zeeb-Movie-Renamer-4.1.0-Setup.exe', url: 'https://example.com/setup.exe', size: 50000000 },
    { name: 'Zeeb-Movie-Renamer-4.1.0.dmg', url: 'https://example.com/setup.dmg', size: 60000000 },
  ],
};

beforeEach(() => {
  (window as any).zeebUpdate = {
    downloadUpdate: vi.fn().mockResolvedValue(undefined),
    onDownloadProgress: vi.fn().mockReturnValue(vi.fn()),
    onDownloadComplete: vi.fn().mockReturnValue(vi.fn()),
    onDownloadError: vi.fn().mockReturnValue(vi.fn()),
    showInFolder: vi.fn().mockResolvedValue(undefined),
    openExternal: vi.fn().mockResolvedValue(undefined),
  };
});

describe('UpdateModal', () => {
  it('renders version in header', () => {
    render(<UpdateModal data={mockData} onClose={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(/4\.1\.0/)).toBeTruthy();
  });

  it('renders release notes as HTML', () => {
    render(<UpdateModal data={mockData} onClose={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText('Cool feature')).toBeTruthy();
  });

  it('calls onSkip when skip link clicked', () => {
    const onSkip = vi.fn();
    render(<UpdateModal data={mockData} onClose={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByText(/skip this version/i));
    expect(onSkip).toHaveBeenCalledWith('4.1.0');
  });

  it('calls openExternal when View on GitHub clicked', () => {
    render(<UpdateModal data={mockData} onClose={vi.fn()} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByText(/view on github/i));
    expect(window.zeebUpdate.openExternal).toHaveBeenCalledWith(mockData.releaseUrl);
  });

  it('calls downloadUpdate when Download clicked', () => {
    // Mock platform to win32
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    render(<UpdateModal data={mockData} onClose={vi.fn()} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByText(/download update/i));
    expect(window.zeebUpdate.downloadUpdate).toHaveBeenCalledWith(mockData.assets[0].url);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npx vitest run __tests__/components/UpdateModal.test.tsx
```

- [ ] **Step 3: Implement UpdateModal.tsx**

```tsx
// src/renderer/components/UpdateModal.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { renderMarkdown } from '../../services/markdownRenderer';

interface UpdateData {
  version: string;
  releaseNotes: string;
  releaseUrl: string;
  assets: Array<{ name: string; url: string; size: number }>;
}

interface UpdateModalProps {
  data: UpdateData;
  onClose: () => void;
  onSkip: (version: string) => void;
}

export function UpdateModal({ data, onClose, onSkip }: UpdateModalProps): React.JSX.Element {
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadedPath, setDownloadedPath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    unsubs.push(window.zeebUpdate.onDownloadProgress((p) => {
      setProgress(p.percent);
    }));
    unsubs.push(window.zeebUpdate.onDownloadComplete((d) => {
      setDownloadedPath(d.filePath);
      setDownloadState('complete');
    }));
    unsubs.push(window.zeebUpdate.onDownloadError((e) => {
      setErrorMessage(e.message);
      setDownloadState('error');
    }));
    return () => unsubs.forEach((fn) => fn());
  }, []);

  const platformAsset = data.assets.find((a) => {
    if (process.platform === 'win32') return a.name.endsWith('.exe');
    if (process.platform === 'darwin') return a.name.endsWith('.dmg');
    return false;
  });

  const handleDownload = useCallback(() => {
    if (!platformAsset) return;
    setDownloadState('downloading');
    setProgress(0);
    setErrorMessage('');
    window.zeebUpdate.downloadUpdate(platformAsset.url);
  }, [platformAsset]);

  const handleShowInFolder = useCallback(() => {
    window.zeebUpdate.showInFolder(downloadedPath);
  }, [downloadedPath]);

  const handleViewOnGithub = useCallback(() => {
    window.zeebUpdate.openExternal(data.releaseUrl);
  }, [data.releaseUrl]);

  const handleSkip = useCallback(() => {
    onSkip(data.version);
  }, [data.version, onSkip]);

  const notesHtml = renderMarkdown(data.releaseNotes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-4/5 max-w-2xl max-h-[80%] bg-white rounded-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">Zeeb Movie Renamer v{data.version} Available</h2>
          <button className="text-gray-400 hover:text-gray-600 text-xl" onClick={onClose}>×</button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: notesHtml }}
        />

        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex gap-2">
            {downloadState === 'idle' && platformAsset && (
              <button
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
                onClick={handleDownload}
              >
                Download Update
              </button>
            )}
            {downloadState === 'downloading' && (
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded h-8 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all flex items-center justify-center text-white text-xs font-bold"
                    style={{ width: `${progress}%` }}
                  >
                    {progress}%
                  </div>
                </div>
              </div>
            )}
            {downloadState === 'complete' && (
              <button
                className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700"
                onClick={handleShowInFolder}
              >
                Show in Folder
              </button>
            )}
            {downloadState === 'error' && (
              <>
                <button
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
                  onClick={handleDownload}
                >
                  Retry Download
                </button>
                <span className="text-red-500 text-sm self-center">{errorMessage}</span>
              </>
            )}
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded hover:bg-gray-300"
              onClick={handleViewOnGithub}
            >
              View on GitHub
            </button>
          </div>
          <button
            className="text-xs text-gray-400 hover:text-gray-600"
            onClick={handleSkip}
          >
            Skip this version
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire into App.tsx**

Add state and effect to `App`:

```typescript
const [updateData, setUpdateData] = useState<any>(null);

useEffect(() => {
  return window.zeebUpdate.onUpdateAvailable((data) => {
    setUpdateData(data);
  });
}, []);

const handleSkipUpdate = useCallback((version: string) => {
  updateConfig({ skipUpdateVersion: version });
  void save();
  setUpdateData(null);
}, [updateConfig, save]);
```

Add to JSX:

```tsx
{updateData && (
  <UpdateModal
    data={updateData}
    onClose={() => setUpdateData(null)}
    onSkip={handleSkipUpdate}
  />
)}
```

- [ ] **Step 5: Run tests, verify they pass**

```bash
npx vitest run
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/UpdateModal.tsx __tests__/components/UpdateModal.test.tsx src/renderer/App.tsx
git commit -m "feat: add update notification modal with download support"
```

---

## Chunk 3: Help Menu, About Dialog, Options, Docs

### Task 10: Help Menu & About Modal

**Files:**
- Create: `src/renderer/components/AboutModal.tsx`
- Create: `__tests__/components/AboutModal.test.tsx`
- Modify: `src/main/index.ts` — custom Help menu
- Modify: `src/preload/main.ts` — add `onAbout` to `zeebMenu`
- Modify: `src/types/electron.d.ts` — add `onAbout` type
- Modify: `src/renderer/App.tsx` — wire AboutModal
- Copy: `assets/zeeb512.png` and `assets/tmdb-logo.svg` into `src/renderer/assets/` for Vite static import

- [ ] **Step 1: Copy assets for renderer import**

```bash
mkdir -p src/renderer/assets
cp assets/zeeb512.png src/renderer/assets/zeeb512.png
cp assets/tmdb-logo.svg src/renderer/assets/tmdb-logo.svg
```

- [ ] **Step 2: Write tests**

```typescript
// __tests__/components/AboutModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AboutModal } from '../src/renderer/components/AboutModal';

beforeEach(() => {
  (window as any).zeebUpdate = {
    openExternal: vi.fn().mockResolvedValue(undefined),
  };
});

describe('AboutModal', () => {
  it('renders app name', () => {
    render(<AboutModal visible={true} onClose={vi.fn()} version="4.0.0" />);
    expect(screen.getByText('Zeeb Movie Renamer')).toBeTruthy();
  });

  it('renders version', () => {
    render(<AboutModal visible={true} onClose={vi.fn()} version="4.0.0" />);
    expect(screen.getByText(/4\.0\.0/)).toBeTruthy();
  });

  it('renders TMDB attribution', () => {
    render(<AboutModal visible={true} onClose={vi.fn()} version="4.0.0" />);
    expect(screen.getByText(/not endorsed or certified by TMDB/)).toBeTruthy();
  });

  it('renders icon credit', () => {
    render(<AboutModal visible={true} onClose={vi.fn()} version="4.0.0" />);
    expect(screen.getByText(/Kristof Polleunis/)).toBeTruthy();
  });

  it('returns null when not visible', () => {
    const { container } = render(<AboutModal visible={false} onClose={vi.fn()} version="4.0.0" />);
    expect(container.innerHTML).toBe('');
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

```bash
npx vitest run __tests__/components/AboutModal.test.tsx
```

- [ ] **Step 4: Implement AboutModal.tsx**

```tsx
// src/renderer/components/AboutModal.tsx
import React from 'react';
import zeebIcon from '../assets/zeeb512.png';
import tmdbLogo from '../assets/tmdb-logo.svg';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
  version: string;
}

export function AboutModal({ visible, onClose, version }: AboutModalProps): React.JSX.Element | null {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[400px] bg-white rounded-lg overflow-hidden flex flex-col">
        <div className="flex justify-end p-2">
          <button className="text-gray-400 hover:text-gray-600 text-xl" onClick={onClose}>×</button>
        </div>

        <div className="flex flex-col items-center px-6 pb-6 space-y-4">
          <img src={zeebIcon} alt="Zeeb" className="w-24 h-24" />
          <div className="text-center">
            <h2 className="text-xl font-bold">Zeeb Movie Renamer</h2>
            <p className="text-sm text-gray-500">Version {version}</p>
          </div>

          <p className="text-xs text-gray-500 text-center">
            A rewrite of the original{' '}
            <button
              className="text-blue-500 hover:underline"
              onClick={() => window.zeebUpdate.openExternal('https://sourceforge.net/projects/zeeb/')}
            >
              Zeeb
            </button>{' '}
            (Adobe Flex)
          </p>

          <p className="text-xs text-gray-400">Icon by Kristof Polleunis</p>

          <div className="w-full border-t border-gray-200 pt-4 flex flex-col items-center space-y-2">
            <img src={tmdbLogo} alt="TMDB" className="h-8" />
            <p className="text-[10px] text-gray-400 text-center leading-relaxed">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>

          <p className="text-[10px] text-gray-300">MIT License</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update Help menu in main/index.ts**

Replace `{ label: 'Help', role: 'help' }` with:

```typescript
{
  label: 'Help',
  submenu: [
    {
      label: 'About Zeeb Movie Renamer',
      click: () => mainWindow.webContents.send('menu:about'),
    },
    { type: 'separator' },
    {
      label: 'Zeeb on GitHub',
      click: () => {
        const { shell } = require('electron');
        shell.openExternal('https://github.com/jamison-wilde/zeeb');
      },
    },
    {
      label: 'Report an Issue',
      click: () => {
        const { shell } = require('electron');
        shell.openExternal('https://github.com/jamison-wilde/zeeb/issues');
      },
    },
  ],
},
```

- [ ] **Step 6: Add onAbout to preload**

In `src/preload/main.ts`, add to the `zeebMenu` object:

```typescript
onAbout: (callback: () => void) => ipcRenderer.on('menu:about', callback),
```

- [ ] **Step 7: Add type to electron.d.ts**

In `zeebMenu`:
```typescript
onAbout(callback: () => void): void;
```

- [ ] **Step 8: Wire into App.tsx**

Add state:
```typescript
const [showAbout, setShowAbout] = useState(false);
```

Add to the menu useEffect:
```typescript
window.zeebMenu.onAbout(() => setShowAbout(true));
```

Get version (add IPC or use a simple approach — add `getVersion` to preload):

In preload (`zeebApp`):
```typescript
getVersion: () => ipcRenderer.invoke('app:getVersion'),
```

In main IPC:
```typescript
ipcMain.handle('app:getVersion', () => app.getVersion());
```

In electron.d.ts (`zeebApp`):
```typescript
getVersion(): Promise<string>;
```

In App.tsx, load version on mount:
```typescript
const [appVersion, setAppVersion] = useState('');

useEffect(() => {
  window.zeebApp.getVersion().then(setAppVersion);
}, []);
```

Add to JSX:
```tsx
<AboutModal
  visible={showAbout}
  onClose={() => setShowAbout(false)}
  version={appVersion}
/>
```

- [ ] **Step 9: Run tests, verify they pass**

```bash
npx vitest run
```

- [ ] **Step 10: Commit**

```bash
git add src/renderer/components/AboutModal.tsx __tests__/components/AboutModal.test.tsx src/renderer/assets/ src/main/index.ts src/main/ipc.ts src/preload/main.ts src/types/electron.d.ts src/renderer/App.tsx
git commit -m "feat: add Help menu with About dialog and TMDB attribution"
```

---

### Task 11: TMDB API Key Link in Options

**Files:**
- Modify: `src/renderer/components/options/ImdbSection.tsx`

- [ ] **Step 1: Add TMDB API key input and link**

Add a new section to `ImdbSection.tsx` after the URLs section (after line 42):

```tsx
<div>
  <h3 className="text-sm font-bold text-gray-700 mb-3">TMDB</h3>
  <div className="space-y-2">
    <div>
      <label className="block text-xs text-gray-600 mb-1">TMDB API Key</label>
      <input
        data-testid="tmdb-api-key"
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
        value={config.tmdbApiKey}
        onChange={(e) => updateConfig({ tmdbApiKey: e.target.value })}
      />
    </div>
    <button
      className="text-xs text-blue-500 hover:underline"
      onClick={() => window.zeebUpdate.openExternal('https://www.themoviedb.org/settings/api')}
    >
      Get your own API key
    </button>
  </div>
</div>
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/options/ImdbSection.tsx
git commit -m "feat: add TMDB API key input with link to get key"
```

---

### Task 12: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create workflow**

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test

  build-windows:
    needs: test
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run make
      - uses: actions/upload-artifact@v4
        with:
          name: windows-artifacts
          path: out/make/squirrel.windows/x64/

  build-macos:
    needs: test
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run make
      - uses: actions/upload-artifact@v4
        with:
          name: macos-artifacts
          path: out/make/*.dmg

  release:
    needs: [build-windows, build-macos]
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Extract version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT

      - name: Extract changelog
        id: changelog
        run: |
          node scripts/extract-changelog.js
          echo "NOTES_FILE=assets/release-notes.md" >> $GITHUB_OUTPUT

      - uses: actions/download-artifact@v4
        with:
          name: windows-artifacts
          path: artifacts/windows

      - uses: actions/download-artifact@v4
        with:
          name: macos-artifacts
          path: artifacts/macos

      - name: Rename artifacts
        run: |
          VERSION=${{ steps.version.outputs.VERSION }}
          mv artifacts/windows/*Setup*.exe "artifacts/Zeeb-Movie-Renamer-${VERSION}-Setup.exe" 2>/dev/null || true
          mv artifacts/macos/*.dmg "artifacts/Zeeb-Movie-Renamer-${VERSION}.dmg" 2>/dev/null || true
          # Keep Squirrel nupkg and RELEASES for future auto-update support
          cp artifacts/windows/*.nupkg artifacts/ 2>/dev/null || true
          cp artifacts/windows/RELEASES artifacts/ 2>/dev/null || true

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          body_path: ${{ steps.changelog.outputs.NOTES_FILE }}
          files: |
            artifacts/Zeeb-Movie-Renamer-*
            artifacts/*.nupkg
            artifacts/RELEASES
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add GitHub Actions release workflow"
```

---

### Task 13: README & CLAUDE.md

**Files:**
- Rewrite: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write README.md**

```markdown
# Zeeb Movie Renamer

Batch movie file renamer with IMDB integration. Automatically parses filenames, searches IMDB, and renames files with customizable format patterns.

A complete rewrite of the original [Zeeb](https://sourceforge.net/projects/zeeb/) (Adobe Flex, v3.x) as a modern Electron + React desktop application.

## Download

Get the latest release from the [Releases page](https://github.com/jamison-wilde/zeeb/releases):

- **Windows:** Download the `.exe` installer (no admin rights needed)
- **macOS:** Download the `.dmg` disk image

No Node.js or other runtime is required — the installer is self-contained.

> **Note:** The app is not code-signed. On Windows, click "More info" → "Run anyway" on the SmartScreen prompt. On macOS, right-click → Open → confirm.

## Features

- Dual-renamer workflow with interleaved file processing
- IMDB integration via embedded webview
- TMDB poster browsing and saving
- NFO file parsing for auto-selection
- Configurable filename format patterns
- AKA (alternate title) support
- Subtitle and companion file renaming
- Selective undo with per-file results
- DVD folder detection and renaming
- URL/webloc bookmark file generation
- Format tester

## Building from Source

Requires Node.js >= 20.

```bash
git clone https://github.com/jamison-wilde/zeeb.git
cd zeeb
npm install
npm start        # Run in development mode
npm test         # Run tests
npm run make     # Build installers for your platform
```

## Releasing

1. Update `version` in `package.json`
2. Add release notes to `CHANGELOG.md` under `## [x.y.z] - YYYY-MM-DD`
3. Commit: `git commit -m "chore: bump version to x.y.z"`
4. Tag: `git tag vx.y.z`
5. Push: `git push origin main --tags`

GitHub Actions will automatically build Windows and macOS installers and create a GitHub Release.

## Credits

- Icon by Kristof Polleunis
- This product uses the TMDB API but is not endorsed or certified by TMDB.

## License

MIT
```

- [ ] **Step 2: Add Releasing section to CLAUDE.md**

Add after the Git / GitHub Usage section:

```markdown
## Releasing

1. Update `version` in `package.json`
2. Add release notes to `CHANGELOG.md` under `## [x.y.z] - YYYY-MM-DD` (Keep a Changelog format)
3. Commit: `chore: bump version to x.y.z`
4. Tag: `git tag vx.y.z`
5. Push: `git push origin main --tags`
6. CI builds Win+Mac installers and creates GitHub Release with changelog as body
- Never push a tag without a matching CHANGELOG.md entry — the build will fail
- Version in package.json must match the tag (minus the `v` prefix)
```

- [ ] **Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: add README with download/build/release instructions"
```

---

## Verification

After all tasks complete:

```bash
npx vitest run
```

All tests should pass. Then verify manually:

1. `npm start` — app launches, File → Release Notes shows markdown-rendered notes
2. Help → About shows icon, version, TMDB attribution
3. Options → IMDB section has TMDB API key input with "Get your own API key" link
4. `node scripts/extract-changelog.js` succeeds and creates `assets/release-notes.md`
