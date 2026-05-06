# Linux AppImage Support Design Spec

## Goal

Add Linux as a third release target alongside Windows and macOS via AppImage, with minimal code changes. Reuse existing platform abstractions wherever possible.

## Context

v4.0.0 shipped on 2026-05-03 with Windows and macOS installers. Linux is the natural third platform. Linux conventions overlap heavily with Windows (menu in window not menu bar; quit on last window close) but path-handling matches macOS (forward slashes). All renderer code, fs adapter, and webview-based IMDB integration are platform-agnostic. The non-trivial work is build-pipeline plumbing plus three small platform-detection adjustments in renderer code.

Distribution format chosen: **AppImage only** for the MVP. Single self-contained executable that runs on most distros without dependency management. The closest Linux analog to a Windows `.exe`. `.deb`/`.rpm` deferred unless user requests demand them.

Bookmark file format on Linux: **reuse `.url`** (Windows INI format). Most Linux file managers (Nautilus, Dolphin, Thunar) recognize it and route double-clicks to the user's browser. Zero new code path needed; the existing pipeline `else` branch already handles non-Mac platforms. `.desktop` (XDG-native) deferred.

In-app auto-update integration: out of scope. Linux follows the macOS pattern — UpdateModal opens, user clicks Download, the new AppImage downloads, user runs it manually. Silent in-app auto-update via electron-updater + AppImageUpdate is its own design.

---

## Section 1: Build pipeline

**`package.json`:** add `@reforged/maker-appimage` to devDependencies. (The official `@electron-forge/maker-appimage` is unmaintained as of writing; `@reforged/maker-appimage` is the supported community fork that follows the standard maker interface.)

**`forge.config.ts`:** add a Linux-platform maker entry:

```ts
{
  name: '@reforged/maker-appimage',
  platforms: ['linux'],
  config: {
    options: {
      bin: 'Zeeb Movie Renamer',
      icon: 'assets/zeeb512.png',
      categories: ['Utility', 'AudioVideo'],
    },
  },
},
```

**`.github/workflows/release.yml`:** add a `build-linux` job parallel to `build-windows` and `build-macos`:

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
        path: out/make/AppImage/x64/*.AppImage
```

The `release` job's `needs:` array gains `build-linux`. Its rename step gains:

```bash
mv artifacts/linux/*.AppImage "artifacts/Zeeb-Movie-Renamer-${VERSION}.AppImage" 2>/dev/null || true
```

And its `softprops/action-gh-release@v2` `files` block gains `artifacts/*.AppImage`.

---

## Section 2: Renderer code changes

Three small adjustments. None changes existing behavior on Windows or macOS.

**`src/renderer/components/UpdateModal.tsx`** — extend the asset finder. Currently:

```ts
const platformAsset = data.assets.find((a) => {
  if (process.platform === 'win32') return a.name.endsWith('.exe');
  if (process.platform === 'darwin') return a.name.endsWith('.dmg');
  return false;
});
```

Becomes:

```ts
const platformAsset = data.assets.find((a) => {
  if (process.platform === 'win32') return a.name.endsWith('.exe');
  if (process.platform === 'darwin') return a.name.endsWith('.dmg');
  if (process.platform === 'linux') return a.name.endsWith('.AppImage');
  return false;
});
```

**`src/services/renamePipeline.ts`** — extend the `platform` union:

```ts
platform: 'mac' | 'win' | 'linux';
```

The existing `const isMac = platform === 'mac'` check already routes Linux to the `.url` branch via the ternary. No further pipeline logic changes.

**`src/renderer/components/Renamer.tsx`** — extend platform detection from a binary ternary to three-way:

```ts
const platform: 'mac' | 'win' | 'linux' =
  navigator.userAgent.includes('Macintosh') ? 'mac'
  : navigator.userAgent.includes('Linux') ? 'linux'
  : 'win';
```

Order matters: Chromium on Linux includes "Linux x86_64" in the UA but not "Macintosh", so the Mac check stays first. Windows UAs include "Windows" but not "Linux" or "Macintosh", so the final fallback is correct.

---

## Section 3: Test updates

Add one new case to `__tests__/services/renamePipeline.test.ts` confirming Linux follows the Windows path for bookmark generation:

```ts
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

No new test files. Existing 343 tests stay untouched (the Renamer test file uses a mock platform, not real `process.platform`).

---

## Section 4: Sequencing inside the PR

1. Add `@reforged/maker-appimage` to `package.json` devDependencies and configure it in `forge.config.ts`. Run `npm install`.
2. (Optional) Local sanity build on a Linux machine or via Docker: `npm run make` produces an AppImage under `out/make/AppImage/x64/`.
3. Update `UpdateModal.tsx` to recognize `.AppImage` assets.
4. Update `Renamer.tsx` platform detection for `'linux'`.
5. Extend `renamePipeline.ts` `ExecuteRenameArgs.platform` union to include `'linux'`. Add the new test case.
6. Update `.github/workflows/release.yml`: add `build-linux` job, extend `release` job's `needs:` and rename/upload logic.
7. Bump version in `package.json` to `4.0.1`. Add `## [4.0.1] - <date>` section to `CHANGELOG.md` listing "Initial Linux (AppImage) release."
8. Commit, tag `v4.0.1`, push tag. CI runs all three platform builds; success is the smoke test.

Steps 1–5 are local and verifiable without CI. Step 6 is the one that's only fully testable by tagging and pushing.

---

## Section 5: Out of scope

- **`.deb` / `.rpm` makers.** Revisit if Linux users request native package-manager integration.
- **Auto-update via electron-updater + AppImageUpdate.** Future work; current Linux flow matches macOS (manual download from UpdateModal).
- **Desktop integration** (system menu entry, MIME associations). AppImage's first-run integration prompt handles this user-side.
- **Code signing.** Not enforced for Linux direct downloads.
- **`.desktop` bookmark file.** Decided to reuse `.url`; revisit only if Linux users specifically complain about file appearance.
- **Cross-distro testing.** AppImage's purpose is "runs on any distro from ~2014 onward." Trust the format; spot-check on one distro (Ubuntu LTS) post-release.

## Section 6: Success criteria

- `npm test` green; new Linux test case passes alongside existing 343.
- `npm run lint` clean.
- CI release workflow produces three artifacts: Windows `.exe`, macOS `.dmg`, Linux `.AppImage`.
- Manual smoke on Linux (Ubuntu LTS or any current distro): chmod +x the AppImage, run, scan a folder, rename a file. URL file (`.url`) opens in default browser when double-clicked.
- The TypeScript type system catches any place that pattern-matched on the old `'mac' | 'win'` union without a Linux branch.
