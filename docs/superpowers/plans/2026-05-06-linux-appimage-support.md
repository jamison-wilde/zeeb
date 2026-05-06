# Linux AppImage Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Linux as a third release target via AppImage with no behavioral change to existing Windows/macOS users.

**Architecture:** AppImage-only distribution. Three small renderer code changes (`Renamer.tsx` platform detection, `UpdateModal.tsx` asset finder, `renamePipeline.ts` type union) plus a new build-pipeline maker and CI job. Linux reuses Windows's `.url` bookmark format — no new pipeline branch needed.

**Tech Stack:** Electron Forge 7, `@reforged/maker-appimage` (community fork; the official `@electron-forge/maker-appimage` is unmaintained).

**Spec:** `docs/superpowers/specs/2026-05-06-linux-appimage-support-design.md`

---

## File map

**Modify:**
- `package.json` — add `@reforged/maker-appimage` to devDependencies; bump `version` to `4.0.1`.
- `forge.config.ts` — add `MakerAppImage` to the makers array.
- `src/renderer/components/UpdateModal.tsx` — extend `platformAsset` finder.
- `src/renderer/components/Renamer.tsx` — extend platform-detection ternary.
- `src/services/renamePipeline.ts` — extend `platform` union to include `'linux'`.
- `__tests__/services/renamePipeline.test.ts` — add Linux test case.
- `.github/workflows/release.yml` — add `build-linux` job; extend `release` job's `needs`, downloads, rename logic, and upload list.
- `CHANGELOG.md` — add `## [4.0.1]` section.

No new files.

---

## Task 1: Add AppImage maker dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (auto-regenerated)

- [ ] **Step 1: Install the maker as a devDependency**

Run: `npm install --save-dev @reforged/maker-appimage`
Expected: `package.json` gets a new line under `devDependencies`; `package-lock.json` updates.

- [ ] **Step 2: Verify it installed**

Run: `node -e "console.log(require('@reforged/maker-appimage'))"`
Expected: prints an object containing `MakerAppImage`. If it errors with "Cannot find module," the install failed — re-run Step 1.

- [ ] **Step 3: Confirm tests still pass**

Run: `npm test`
Expected: 343 passing.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @reforged/maker-appimage devDependency"
```

---

## Task 2: Configure the AppImage maker in forge.config.ts

**Files:**
- Modify: `forge.config.ts`

- [ ] **Step 1: Edit `forge.config.ts`**

Replace the existing imports and `makers` array with the additions for AppImage. The full file becomes:

```ts
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerAppImage } from '@reforged/maker-appimage';
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
    new MakerAppImage({
      options: {
        bin: 'Zeeb Movie Renamer',
        icon: 'assets/zeeb512.png',
        categories: ['Utility', 'AudioVideo'],
      },
    }, ['linux']),
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

The `['linux']` second argument constrains the maker to Linux platforms; on Windows or macOS runners, Forge skips it.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit forge.config.ts 2>&1 | head -10`
Expected: no errors specific to `forge.config.ts`. The pre-existing `forge.config.ts` errors about `name` not existing on `VitePluginBuildConfig` may still appear — that's a separate unfixed issue, not our concern.

- [ ] **Step 3: Tests still green**

Run: `npm test`
Expected: 343 passing.

- [ ] **Step 4: Commit**

```bash
git add forge.config.ts
git commit -m "feat(forge): register MakerAppImage for linux"
```

---

## Task 3: Update `renamePipeline.ts` platform union (TDD)

**Files:**
- Modify: `__tests__/services/renamePipeline.test.ts` (add failing test)
- Modify: `src/services/renamePipeline.ts` (extend type)

- [ ] **Step 1: Add the failing test**

Open `__tests__/services/renamePipeline.test.ts`. Append a new `it` block at the end of the existing `describe('renamePipeline', ...)`:

```ts
  // --- Test 13: Linux uses .url like Windows ---
  it('writes a .url file when platform is linux (same as windows)', async () => {
    const writeFileMock = vi.fn().mockResolvedValue(undefined);
    const fs = createMockFsAdapter({
      rename: vi.fn().mockResolvedValue(undefined),
      writeFile: writeFileMock,
    });
    await executeRename(makeArgs({
      fs,
      platform: 'linux',
      config: makeConfig({ createUrlFile: true }),
    }));
    const [path, content] = writeFileMock.mock.calls[0];
    expect(path).toBe('/movies/New Movie (1994).url');
    expect(content).toContain('[InternetShortcut]');
  });
```

- [ ] **Step 2: Run the new test — expect a TypeScript compile error**

Run: `npm test -- renamePipeline`
Expected: TypeScript errors at the test file because `'linux'` isn't assignable to `'mac' | 'win'`. Either tsc compile error or vitest fails the file with a transpile error.

If it instead runs and passes, the type narrowing isn't enforced — proceed to Step 3 anyway.

- [ ] **Step 3: Extend the platform union in `renamePipeline.ts`**

Open `src/services/renamePipeline.ts`. Find the `ExecuteRenameArgs` interface and change:

```ts
platform: 'mac' | 'win';
```

to:

```ts
platform: 'mac' | 'win' | 'linux';
```

The implementation logic does not need to change. The existing `const isMac = platform === 'mac';` already routes Linux to the `.url` branch via the ternary.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- renamePipeline`
Expected: 13 tests pass (12 originals + 1 Linux).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: 344 passing (was 343, +1 Linux test).

- [ ] **Step 6: Commit**

```bash
git add src/services/renamePipeline.ts __tests__/services/renamePipeline.test.ts
git commit -m "feat(pipeline): accept linux as a third platform value"
```

---

## Task 4: Update `Renamer.tsx` platform detection

**Files:**
- Modify: `src/renderer/components/Renamer.tsx`

- [ ] **Step 1: Find the existing platform detection**

In `src/renderer/components/Renamer.tsx`, locate the line in the `handleRename` callback that determines `platform`. It currently looks like:

```ts
const platform: 'mac' | 'win' =
  navigator.userAgent.includes('Macintosh') ? 'mac' : 'win';
```

- [ ] **Step 2: Replace with three-way detection**

Change those lines to:

```ts
const platform: 'mac' | 'win' | 'linux' =
  navigator.userAgent.includes('Macintosh') ? 'mac'
  : navigator.userAgent.includes('Linux') ? 'linux'
  : 'win';
```

Order matters: Chromium on Linux includes "Linux x86_64" in the UA but not "Macintosh", so the Mac check must run first. Windows UAs include neither "Linux" nor "Macintosh", so the final fallback is correct.

- [ ] **Step 3: Tests stay green**

Run: `npm test`
Expected: 344 passing. (No tests directly assert on the renderer's platform-detection ternary; this change is exercised end-to-end via the Renamer integration test which mocks the platform indirectly through `executeRename`'s args.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "Renamer.tsx"`
Expected: no new errors from this file.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/Renamer.tsx
git commit -m "feat(renamer): detect linux from navigator.userAgent"
```

---

## Task 5: Update `UpdateModal.tsx` asset finder

**Files:**
- Modify: `src/renderer/components/UpdateModal.tsx`

- [ ] **Step 1: Find the existing platformAsset block**

In `src/renderer/components/UpdateModal.tsx`, locate the `platformAsset` declaration. It currently looks like:

```ts
const platformAsset = data.assets.find((a) => {
  if (process.platform === 'win32') return a.name.endsWith('.exe');
  if (process.platform === 'darwin') return a.name.endsWith('.dmg');
  return false;
});
```

- [ ] **Step 2: Add the Linux branch**

Replace the block with:

```ts
const platformAsset = data.assets.find((a) => {
  if (process.platform === 'win32') return a.name.endsWith('.exe');
  if (process.platform === 'darwin') return a.name.endsWith('.dmg');
  if (process.platform === 'linux') return a.name.endsWith('.AppImage');
  return false;
});
```

- [ ] **Step 3: Run the suite**

Run: `npm test`
Expected: 344 passing.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/UpdateModal.tsx
git commit -m "feat(update): match .AppImage release asset on linux"
```

---

## Task 6: Update GitHub Actions release workflow

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Add a `build-linux` job**

Open `.github/workflows/release.yml`. After the existing `build-macos` job (and before `release`), insert:

```yaml
  build-linux:
    needs: test
    runs-on: ubuntu-latest
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
          name: linux-artifacts
          path: out/make/**/*.AppImage
```

The `out/make/**/*.AppImage` glob is robust to `@reforged/maker-appimage` writing to either `out/make/AppImage/x64/` or `out/make/appimage/x64/` (the maker may use either casing). The double-star matches subdirectories.

- [ ] **Step 2: Add `build-linux` to the `release` job's `needs:`**

Find the `release` job. Change:

```yaml
release:
  needs: [build-windows, build-macos]
```

to:

```yaml
release:
  needs: [build-windows, build-macos, build-linux]
```

- [ ] **Step 3: Add a Linux artifact download step**

Inside the `release` job, after the existing macOS download step (`actions/download-artifact@v4` with `name: macos-artifacts`), add:

```yaml
      - uses: actions/download-artifact@v4
        with:
          name: linux-artifacts
          path: artifacts/linux
```

- [ ] **Step 4: Add a Linux rename step**

Inside the `release` job's `Rename artifacts` step, append the Linux move using `find` (more reliable than bash `**` glob, which requires `shopt -s globstar` in default Actions bash):

```yaml
      - name: Rename artifacts
        run: |
          VERSION=${{ steps.version.outputs.VERSION }}
          mv artifacts/windows/*Setup*.exe "artifacts/Zeeb-Movie-Renamer-${VERSION}-Setup.exe" 2>/dev/null || true
          mv artifacts/macos/*.dmg "artifacts/Zeeb-Movie-Renamer-${VERSION}.dmg" 2>/dev/null || true
          find artifacts/linux -name "*.AppImage" -exec mv {} "artifacts/Zeeb-Movie-Renamer-${VERSION}.AppImage" \; 2>/dev/null || true
          # Keep Squirrel nupkg and RELEASES for future auto-update support
          cp artifacts/windows/*.nupkg artifacts/ 2>/dev/null || true
          cp artifacts/windows/RELEASES artifacts/ 2>/dev/null || true
```

`find … -exec mv` handles nested subdirs without needing globstar.

- [ ] **Step 5: Add `*.AppImage` to the release `files` block**

Find the `Create GitHub Release` step. Change its `files` block from:

```yaml
          files: |
            artifacts/Zeeb-Movie-Renamer-*
            artifacts/*.nupkg
            artifacts/RELEASES
```

That existing first line `artifacts/Zeeb-Movie-Renamer-*` already matches the renamed `Zeeb-Movie-Renamer-<version>.AppImage` file, so no change is strictly needed. But to be explicit and resilient if the rename fails, add an explicit AppImage entry:

```yaml
          files: |
            artifacts/Zeeb-Movie-Renamer-*
            artifacts/*.nupkg
            artifacts/RELEASES
            artifacts/*.AppImage
```

- [ ] **Step 6: Sanity-check the YAML structure**

Run: `cat .github/workflows/release.yml | grep -E "^\s*(name|needs|runs-on|build-)"`
Expected: shows the four jobs (`test`, `build-windows`, `build-macos`, `build-linux`, `release`) with the right `needs:` chains.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add linux build job and AppImage release upload"
```

---

## Task 7: Bump version and update changelog

**Files:**
- Modify: `package.json`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump version**

In `package.json`, change `"version": "4.0.0"` to `"version": "4.0.1"`.

- [ ] **Step 2: Add changelog entry**

In `CHANGELOG.md`, insert a new section just below the `# Changelog` heading and above the existing `## [4.0.0]` section:

```markdown
## [4.0.1] - 2026-05-06

### Added
- Linux release as AppImage; runs on most distributions without dependency setup.
```

(Use the actual date when you commit. If today differs from 2026-05-06, change accordingly.)

- [ ] **Step 3: Verify changelog extraction**

Run: `node scripts/extract-changelog.js && cat assets/release-notes.md`
Expected: prints the 4.0.1 section content (Linux release line). If it pulls 4.0.0, the extractor isn't picking up the latest section — check that the `package.json` version was actually bumped and the heading format matches `## [<version>] - <date>`.

- [ ] **Step 4: Run tests + lint**

Run: `npm test`
Expected: 344 passing.

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 4.0.1 with linux release notes"
```

---

## Task 8: Tag and push

- [ ] **Step 1: Push commits**

Run: `git push origin main`
Expected: 7 new commits land on the remote.

- [ ] **Step 2: Tag**

Run: `git tag v4.0.1`
Expected: tag created locally.

- [ ] **Step 3: Push tag**

Run: `git push origin v4.0.1`
Expected: tag pushed; the release workflow at `https://github.com/jamison-wilde/zeeb/actions` starts running. Three parallel build jobs (Windows, macOS, Linux) followed by `release`. Total time ~10–18 minutes.

- [ ] **Step 4: Watch the build**

Open `https://github.com/jamison-wilde/zeeb/actions`. The most likely failure modes, in priority order:

1. `build-linux` fails with `MakerAppImage` complaining about a missing system tool. Ubuntu's runner has most of what's needed, but if `appimagetool` or `mksquashfs` is missing, prepend an apt step:
   ```yaml
       - run: sudo apt-get update && sudo apt-get install -y libfuse2
   ```
   to the `build-linux` job's `steps:`.
2. The artifact glob `out/make/**/*.AppImage` matches zero files. Inspect the runner logs to see the actual output path the maker used; adjust the glob.
3. The rename glob `artifacts/linux/**/*.AppImage` similarly fails to find the file. Use the runner logs from Step 2 to see where the artifact was downloaded.

If any of these happen, fix the workflow file, re-tag with `git tag -d v4.0.1 && git push --delete origin v4.0.1 && git tag v4.0.1 && git push origin v4.0.1`. (Note: deleting and re-pushing a tag is acceptable when the release is in active first-cut shaping; once the release is public, never re-tag.)

- [ ] **Step 5: Verify the release**

Once `release` job is green, open `https://github.com/jamison-wilde/zeeb/releases/tag/v4.0.1`. It should contain:
- `Zeeb-Movie-Renamer-4.0.1-Setup.exe`
- `Zeeb-Movie-Renamer-4.0.1.dmg`
- `Zeeb-Movie-Renamer-4.0.1.AppImage`
- `Zeeb-4.0.1-full.nupkg`
- `RELEASES`
- Body text from CHANGELOG.md 4.0.1 section.

- [ ] **Step 6: Smoke test on Linux**

Download the AppImage on any Linux machine (Ubuntu LTS is the safest baseline). Then:

```bash
chmod +x Zeeb-Movie-Renamer-4.0.1.AppImage
./Zeeb-Movie-Renamer-4.0.1.AppImage
```

In the app: scan a folder, search for a movie, rename a file. Open one of the generated `.url` files in the file manager — should open the IMDB page in the system browser.

If it doesn't launch (Gtk errors, libfuse missing on the user's system), Step 4's apt install hint applies *to the user's machine*, not just CI. Document in CHANGELOG.md that AppImage requires libfuse2 if needed.

---

## Final verification

- [ ] **Tests:** `npm test` — 344 passing.
- [ ] **Lint:** `npm run lint` — 0 errors.
- [ ] **Typecheck:** `npx tsc --noEmit` — no new errors in touched files (pre-existing forge.config errors about `name` field can be ignored).
- [ ] **Release artifacts present:** Windows .exe, macOS .dmg, Linux .AppImage all attached to `https://github.com/jamison-wilde/zeeb/releases/tag/v4.0.1`.
- [ ] **AppImage runs on a Linux machine:** chmod +x → run → folder scan → file rename works end-to-end.

## Out of scope

- `.deb` and `.rpm` makers.
- Auto-update via electron-updater + AppImageUpdate (Linux uses the macOS pattern: manual download).
- `.desktop` bookmark file generator (decided to reuse `.url`).
- Code signing (not enforced on Linux).
- Cross-distro test matrix (trust AppImage's portability claims; spot-check Ubuntu).
