# GitHub & Deployment Design Spec

## Goal

Ship Zeeb Movie Renamer v4.0.0 as a public GitHub repo with automated CI builds, GitHub Releases distribution, and in-app update notifications — usable by end users without Node.js installed.

## Context

Zeeb is a rewrite of the [SourceForge Zeeb project](https://sourceforge.net/projects/zeeb/) (v3.x, Adobe Flex). This Electron + React version continues as v4.x. The app already uses Electron Forge with Squirrel (Windows) and DMG (macOS) makers, but has no CI, no GitHub repo, no versioning, and React Native leftovers from an earlier migration attempt.

---

## Section 1: Repo & Project Cleanup

**GitHub repo:** `jamison-wilde/zeeb`, public, MIT license.

**Cleanup:**
- Delete `NuGet.config` (React Native leftover)
- Remove React Native entries from `.gitignore` (CocoaPods, `ios/`, `android/`, fastlane, etc.)
- Add Electron Forge output dirs to `.gitignore` (`out/`, `.vite/`)
- Replace React Native boilerplate `README.md` with:
  - What the app does
  - Screenshot
  - Download link → GitHub Releases
  - "Releasing" section documenting the tag-based release workflow
  - Build-from-source instructions
  - Credit: "Icon by Kristof Polleunis"
  - Note that this is a rewrite of the SourceForge original

**Icons:** Copy from `legacy_adobe_flex_src/src/assets/icon/` into `assets/` at project root:
- `ico (windows)/zeeb.ico` → `assets/zeeb.ico`
- `icns (mac)/zeeb.icns` → `assets/zeeb.icns`
- `zeeb512.png` → `assets/zeeb512.png`

**TMDB logo:** Download `https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg` to `assets/tmdb-logo.svg`.

**Version:** `4.0.0` in `package.json`.

**CLAUDE.md:** Add a "Releasing" section documenting the release workflow for future agent sessions.

---

## Section 2: Forge Config & Packaging

**`package.json` metadata:**
- `productName`: "Zeeb Movie Renamer"
- `description`: "Batch movie file renamer with IMDB integration"
- `version`: "4.0.0"
- `author`: "jamison-wilde"
- `license`: "MIT"

**`forge.config.ts`:**
- `packagerConfig.icon`: `assets/zeeb` (Electron auto-selects `.ico`/`.icns` per platform)
- `packagerConfig.name`: "Zeeb Movie Renamer"

**MakerSquirrel (Windows):**
- `name`: "Zeeb"
- `setupIcon`: `assets/zeeb.ico`
- `noMsi`: true
- No desktop shortcut — Start Menu only

**MakerDMG (macOS):**
- `icon`: `assets/zeeb.icns`
- Default drag-to-Applications layout

**Squirrel events handler:** Add standard Squirrel lifecycle handler at the top of `src/main/index.ts`. Handles `--squirrel-install` (create Start Menu shortcut), `--squirrel-uninstall` (remove shortcut), `--squirrel-updated` (exit silently), `--squirrel-obsolete` (exit silently). App exits immediately during these events without creating a window.

---

## Section 3: CHANGELOG & Release Notes

**`CHANGELOG.md`** in [Keep a Changelog](https://keepachangelog.com) format:

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

**Build-time bundling:** An npm script (`scripts/extract-changelog.js`) extracts the current version's section from `CHANGELOG.md` into `assets/release-notes.md`. The script reads the version from `package.json`, finds the matching `## [version]` header in `CHANGELOG.md`, and extracts all content until the next `## [` header or end of file. This script runs as a Forge `generateAssets` hook (which runs before asar packaging in the `prePackage` phase). If no matching section is found, the build fails with a clear error message.

**CI uses the same script** to extract the release body for the GitHub Release.

---

## Section 4: GitHub Actions CI

**File:** `.github/workflows/release.yml`

**Trigger:** Push tag matching `v*`.

**Jobs:**

### 4a. Test
- Runs on `ubuntu-latest`
- `npm ci` → `npm test`

### 4b. Build Windows
- Runs on `windows-latest`
- Depends on: Test
- `npm ci` → `npm run make`
- Uploads entire `out/make/squirrel.windows/x64/` directory as artifact

### 4c. Build macOS
- Runs on `macos-latest`
- Depends on: Test
- `npm ci` → `npm run make`
- Uploads `.dmg` from `out/make/` as artifact

### 4d. Release
- Runs after both builds pass
- Downloads artifacts
- Runs `node scripts/extract-changelog.js` to extract release notes markdown
- Creates GitHub Release with extracted markdown as body
- Renames and attaches assets: `Zeeb-Movie-Renamer-{version}-Setup.exe` (from Squirrel's `Setup.exe`), `Zeeb-Movie-Renamer-{version}.dmg`
- Also attaches Squirrel's `.nupkg` and `RELEASES` files (needed later if auto-update via Squirrel is added)

**No code signing or notarization.** Users see SmartScreen (Windows) or Gatekeeper (macOS) warning on first run.

**macOS runner:** `macos-latest` (arm64). No x86_64 build for now — older Intel Macs can run arm64 apps via Rosetta.

**Release workflow (documented in README and CLAUDE.md):**
1. Update `version` in `package.json`
2. Add release notes section to `CHANGELOG.md` under `## [x.y.z] - YYYY-MM-DD`
3. Commit: `chore: bump version to x.y.z`
4. Tag: `git tag vx.y.z`
5. Push: `git push origin main --tags`
6. CI builds, tests, packages, and creates GitHub Release automatically

---

## Section 5: Update Notification

### 5a. Version Check (main process)

- 5 seconds after window loads, `GET https://api.github.com/repos/jamison-wilde/zeeb/releases/latest`
- Compare `tag_name` (strip `v` prefix) against `app.getVersion()` using semver comparison
- If newer and version does not match `skipUpdateVersion` in config → send release data to renderer via IPC
- Fail silently on network error, offline, or rate limit (60 req/hr unauthenticated)
- Check once per session only

### 5b. Config Additions

Add to `zeeb-config.json` schema:
- `skipUpdateVersion`: `string | null` — the specific version the user chose to skip. When a newer version than the skipped one is released, the notification reappears.

### 5c. IPC

- **Main → Renderer:** `update:available` with payload `{ version, releaseNotes, releaseUrl, assets: [{ name, url, size }] }`. `releaseNotes` is raw markdown from the GitHub Release `body` field.
- **Renderer → Main:** `update:download` with asset URL — main process downloads to user's Downloads folder via Node `https` module (consistent with existing `downloadToFile` pattern), sends progress back
- **Main → Renderer:** `update:download-progress` with `{ percent, bytesDownloaded, totalBytes }`
- **Main → Renderer:** `update:download-complete` with `{ filePath }`
- **Main → Renderer:** `update:download-error` with `{ message }` — shown to user in the modal

### 5d. Preload

Expose under `window.zeebUpdate` (new `contextBridge.exposeInMainWorld` call):
- `onUpdateAvailable(callback)` — receives update data, returns unsubscribe function
- `downloadUpdate(assetUrl)` — triggers download in main process via `ipcRenderer.invoke`
- `onDownloadProgress(callback)` — receives progress updates, returns unsubscribe function
- `onDownloadComplete(callback)` — receives `{ filePath }`, returns unsubscribe function
- `onDownloadError(callback)` — receives `{ message }`, returns unsubscribe function
- `showInFolder(filePath)` — calls `shell.showItemInFolder`
- `openExternal(url)` — calls `shell.openExternal`

All `on*` methods return an unsubscribe function (like the existing `onWindowStateChanged` pattern). The UpdateModal calls unsubscribe on unmount.

### 5e. Update Modal (`UpdateModal.tsx`)

- **Header:** "Zeeb Movie Renamer v{version} Available"
- **Body:** Release notes raw markdown rendered as HTML via `marked` library + `dompurify` for XSS safety, scrollable
- **Primary button:** "Download Update" — triggers download via IPC, shows progress bar, changes to "Show in Folder" button when complete (calls `shell.showItemInFolder`). On download error, shows error message inline and re-enables the Download button.
- **Secondary button:** "View on GitHub" — `shell.openExternal()` to release URL
- **Text link below buttons:** "Skip this version" — saves version to `skipUpdateVersion` config, closes modal
- **Close X / Escape:** Dismisses for this session, shows again next launch

**Asset selection:** Match platform from `assets` array by file extension: `.exe` on win32, `.dmg` on darwin.

### 5f. Dependencies

- `marked` — lightweight markdown-to-HTML renderer
- `dompurify` — sanitize rendered HTML before inserting into DOM
- Semver comparison: hand-roll a simple `isNewerVersion(a, b)` function (split on `.`, compare numeric segments). No need for full `semver` package for a single `gt` check.

---

## Section 6: File Menu Release Notes

**Current state:** `ReleaseNotes.tsx` renders a hardcoded `RELEASE_NOTES` string constant.

**Change:** Replace hardcoded content. On mount, read the bundled release notes via a new IPC handler `app:getReleaseNotes` that returns the **file contents** (not a path — the renderer is sandboxed and cannot read files directly). The main process reads `assets/release-notes.md` from within the asar and returns the markdown string. Render as HTML via `marked`.

**Dev mode fallback:** When the bundled file doesn't exist (running via `npm start`), the IPC handler reads `CHANGELOG.md` directly and extracts the current version's section using the same logic as `scripts/extract-changelog.js`.

---

## Section 7: Help Menu & About Dialog

### 7a. Help Menu

Replace the current `{ role: 'help' }` default with a custom submenu:
- **About Zeeb Movie Renamer** — sends `menu:about` IPC to renderer, opens AboutModal
- Separator
- **Zeeb on GitHub** — `shell.openExternal('https://github.com/jamison-wilde/zeeb')`
- **Report an Issue** — `shell.openExternal('https://github.com/jamison-wilde/zeeb/issues')`

### 7b. Preload

Merge into the existing `window.zeebMenu` `contextBridge.exposeInMainWorld` call (cannot call `exposeInMainWorld` twice with the same key):
- `onAbout(callback)` — receives `menu:about` event

### 7c. About Modal (`AboutModal.tsx`)

- Zeeb icon (import `assets/zeeb512.png` as a Vite static asset — place in `src/renderer/assets/` or configure Vite's `publicDir`)
- **"Zeeb Movie Renamer"** + version from config or IPC (`app.getVersion()`)
- "A rewrite of the original [Zeeb](https://sourceforge.net/projects/zeeb/) (Adobe Flex)"
- "Icon by Kristof Polleunis"
- Separator / spacing
- TMDB logo (`assets/tmdb-logo.svg`, displayed smaller than Zeeb icon)
- "This product uses the TMDB API but is not endorsed or certified by TMDB."
- "MIT License"
- Close button

### 7d. TMDB API Key in Options

The existing TMDB API key input in the IMDB section of Options:
- Keep the default key in `configDefaults.ts` (has been public on SourceForge for 15 years)
- Add a text link next to the input: "Get your own API key" → `shell.openExternal('https://www.themoviedb.org/settings/api')`

---

## Out of Scope

- Code signing and notarization (add later when user base grows)
- Auto-update via electron-updater (designed to be addable — already using GitHub Releases + Squirrel)
- Linux builds
- Crash reporting / telemetry
