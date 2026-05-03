# Tidy and Tighten Design Spec

## Goal

Land a low-risk, mostly-mechanical pass of cleanups before larger refactors (Spec B: Renamer decomposition; Spec C: state model unification) and before the GitHub go-live. No user-visible behavior changes except the new notification toast, which surfaces previously-silent failures.

## Context

Zeeb is preparing for a public GitHub release. A skeptical staff-engineer review identified ~14 maintainability and quality issues. Items have been split into three independent spec/plan cycles:

- **Spec A (this doc):** items 2, 3, 8, 9, 10, 13, 14 — independent tidy-ups
- **Spec B:** Renamer.tsx decomposition + ErrorBoundary
- **Spec C:** dual-renamer state unification + zustand pattern unification + PlatformAdapter

Item 1 (TMDB key) was deemed not actionable — the key has been on SourceForge for over a decade. Item 11 (changelog pipeline) was deferred.

There are no existing users; this is the pre-launch cleanup. Migrations are not required.

---

## Section 1: Type sync

**Problem.** `src/types/electron.d.ts:zeebFs` declares `readdir / readFile / writeFile / appendFile / rename / unlink / exists` but omits `writeBinaryFile` and `downloadToFile`, both of which `src/preload/main.ts:11-12` actually exposes and `src/adapters/fs.ts:39-40` actually calls. The renderer compiles only because `adapters/fs.ts:27` casts to `any`.

**Change.**
- Add `writeBinaryFile(filePath: string, data: Uint8Array): Promise<void>` and `downloadToFile(url: string, filePath: string): Promise<void>` to the `zeebFs` block in `electron.d.ts`.
- Replace `(window as any).zeebFs` and `(window as any).zeebApp` in `adapters/fs.ts:27-28` with `window.zeebFs` and `window.zeebApp`.

**Tests.** None required. The TypeScript compiler is the test.

---

## Section 2: Drop jest

**Problem.** `package.json` lists both `jest@^29.7.0` and `vitest@^4.0.18` as devDependencies. Only vitest is wired (`"test": "vitest run"`). Jest is dead weight and confuses contributors.

**Change.**
- Remove `"jest": "^29.7.0"` from `devDependencies`.
- Run `npm install` to regenerate `package-lock.json`.
- Verify `npm test` still passes.

**Tests.** Existing suite must remain green.

---

## Section 3: Delete dead extraction scripts

**Problem.** `src/services/imdbExtractor.ts` exports two functions, `generateSearchExtractionScript()` and `generateTitleExtractionScript()`, that emit ~150 lines of escaped JS strings. They're remnants of an earlier `webview.executeJavaScript()` approach; the live extraction path is the in-process preload at `src/preload/webview.ts`.

**Change.**
- Grep for `generateSearchExtractionScript` and `generateTitleExtractionScript` across `src/` and `__tests__/`. Confirm zero non-self references.
- Delete both functions and any imports they pulled in (`ExtractionPattern` may still be used by other exports — keep what's referenced).
- Keep `buildSearchUrl`, `buildTitleUrl`, `parseSearchResults`, `parseTitleData` — those are live.
- Update or remove `__tests__/services/imdbExtractor.test.ts` cases that target the deleted functions.

**Tests.** Existing tests for the kept functions must still pass; tests for the deleted functions are removed.

---

## Section 4: Window state separation

**Problem.** `windowWidth`, `windowHeight`, `windowMaximized` round-trip from main → IPC → preload → renderer → store → fs, *and* are also read directly by the main process via `loadWindowState()` in `src/main/index.ts:15-30`. Two writers, one file. The renderer doesn't actually need these values — only main does.

**Change.**
- New file `src/main/windowState.ts`:
  - `interface WindowState { width: number; height: number; maximized: boolean }`
  - `loadWindowState(): WindowState` — reads `<userData>/window-state.json`; on missing file or parse error, returns defaults `{ width: 1024, height: 768, maximized: false }`.
  - `saveWindowState(state: Partial<WindowState>): void` — merges with on-disk state, writes back. Synchronous fs ops are fine here; this is main process and the writes are debounced/event-driven.
- `src/main/index.ts`:
  - Replace inline `loadWindowState()` with the imported function.
  - The existing `mainWindow.on('resize')` debounced handler now calls `saveWindowState({ width, height })` directly instead of `webContents.send('config:window-state', …)`.
  - `mainWindow.on('maximize')` calls `saveWindowState({ maximized: true })`.
  - `mainWindow.on('unmaximize')` calls `saveWindowState({ maximized: false, width, height })`.
- Remove from preload (`src/preload/main.ts:65-69`): `onWindowStateChanged` handler and `config:window-state` IPC channel registration.
- Remove from renderer:
  - `electron.d.ts:60` — `onWindowStateChanged` field.
  - `App.tsx:103-109` — the `useEffect` that subscribes to window state.
  - `ZeebConfig` (`src/types/index.ts:106-108`): `windowWidth`, `windowHeight`, `windowMaximized`.
  - `DEFAULT_CONFIG` (`src/services/configDefaults.ts:11-14`): same three fields.

**No migration.** Per the user, there are no existing installs. Old config files in the wild (none) keep the dead keys; the renderer ignores them (`{ ...DEFAULT_CONFIG, ...saved }` pattern in `configStore.ts:53` lets them through harmlessly).

**Tests.**
- New `__tests__/main/windowState.test.ts`:
  - `loadWindowState()` returns defaults when file is missing.
  - `loadWindowState()` returns defaults when file is malformed JSON.
  - `loadWindowState()` returns parsed values when file is well-formed.
  - `saveWindowState({ width: 800 })` merges into existing on-disk state without losing other fields.
- Update `__tests__/stores/configStore.test.ts` to remove window-state assertions (if any).

---

## Section 5: Subtitle rename prefix bug

**Problem.** `src/services/fileRenamer.ts:49` does `fileName.replace(oldBase, newBase)`. `String.prototype.replace` with a string pattern replaces only the first occurrence — but if `oldBase` happens to appear inside the language tag (e.g., subtitle file `Foo.Foo.en.srt` with `oldBase = "Foo"`), the *first* `Foo` is the prefix, so today's behavior is accidentally correct in the common case. It breaks if the new base name and old base name are arranged such that the wrong occurrence is matched first, or if `oldBase` is empty. The fix is to make the prefix replacement explicit.

**Change.**
Tests-first per project CLAUDE.md.
1. Add failing test in `__tests__/services/fileRenamer.test.ts`:
   - Given subtitle path `/folder/Foo.en.srt`, `oldBase = "Foo"`, `newBase = "Bar"` → result `/folder/Bar.en.srt`. (Already passes; sanity baseline.)
   - Given subtitle path `/folder/Foo.Foo.en.srt` (a real edge case for re-renames), `oldBase = "Foo"`, `newBase = "Bar"` → result `/folder/Bar.Foo.en.srt`. **This currently passes too** — `replace` only hits the first occurrence — but the new strict-prefix implementation must keep this behavior.
   - Given subtitle path `/folder/My.Movie.en.srt`, `oldBase = "Movie"`, `newBase = "Film"` → result must be `/folder/My.Movie.en.srt` (unchanged — `Movie` is not the prefix). **This is the actual bug:** today's `replace("Movie", "Film")` produces `/folder/My.Film.en.srt`, which is wrong.
2. Fix `fileRenamer.ts:49`:
   ```ts
   const newFileName = fileName.startsWith(oldBase)
     ? newBase + fileName.slice(oldBase.length)
     : fileName;
   ```
3. If `newFileName === fileName`, skip the rename (no-op). Don't add a no-op `UndoEntry`.

**Tests.** Three cases above. The third (the actual bug) drives the fix.

---

## Section 6: Notification toast

**Problem.** `src/renderer/components/Renamer.tsx:540` swallows poster-download failures with `console.error` and continues. Users see a missing poster with no indication why. There's no toast/notice system in the app today.

**Change.**

**Store.** New `src/stores/notificationStore.ts`:
- Singleton zustand `create()` — matches `testerStore` pattern, not the factory pattern. (Spec C will unify these.)
- State:
  ```ts
  interface Notification {
    id: string;
    kind: 'error' | 'success' | 'info';
    message: string;
  }
  interface NotificationStoreState {
    notifications: Notification[];
    notify: (kind, message, ttlMs?: number) => void;  // defaults 4000
    dismiss: (id: string) => void;
  }
  ```
- `notify` generates an id, pushes to `notifications`, and schedules a `setTimeout` that calls `dismiss(id)`. The timeout reference is held in a module-scoped `Map<id, Timeout>` so `dismiss` can clear it on early click-dismiss.

**Component.** New `src/renderer/components/NotificationToast.tsx`:
- Subscribes to `notificationStore.notifications`.
- Renders a fixed-position stack at bottom-right (`fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2`).
- Each toast: rounded panel, color-coded by `kind` (`error` → red bg, `success` → green, `info` → gray). Click to dismiss.
- No animation library — a simple CSS transition on opacity is sufficient.

**Wiring.**
- Render `<NotificationToast />` once in `App.tsx`, alongside the existing modals (around line 275–297).
- Replace `Renamer.tsx:540`:
  ```ts
  } catch (err) {
    console.error('[Renamer] Poster save failed:', err);
    useNotificationStore.getState().notify('error', 'Poster save failed');
  }
  ```
- Keep the `console.error` for dev diagnostics.

**Tests.** New `__tests__/components/NotificationToast.test.tsx`:
- Renders nothing when `notifications` is empty.
- Renders one toast per entry; the toast's color class reflects `kind`.
- Auto-dismiss: with `vi.useFakeTimers()`, calling `notify('error', 'X', 1000)` then advancing timers by 1000ms removes the toast from the store.
- Click-to-dismiss: clicking the toast calls `dismiss` and removes it before the ttl elapses.

---

## Section 7: `any` call-site cleanup

**Problem.** `tsconfig.json` already has `strict: true`, so every remaining `any` is explicit. A handful are in places where the right type exists.

**Change.** Targeted cleanup of these call sites:
- `Renamer.tsx:239,245` — webview event handlers. Type as `Electron.IpcMessageEvent` for `ipc-message`, generic `Event` for `did-navigate`. If importing from `electron` in the renderer is awkward, declare a small local interface for the `ipc-message` payload (`{ channel: string; args: unknown[] }`).
- `Renamer.tsx:623` — `(el: any) =>` in the webview ref callback. Type as `WebviewTag | null`.
- `App.tsx:30` — `updateData: any`. Replace with the type already declared on `electron.d.ts:zeebUpdate.onUpdateAvailable` callback parameter; extract to a named `UpdateData` interface in `electron.d.ts` so both ends share it.
- `electron.d.ts:8` — `WebviewTag.executeJavaScript(code: string): Promise<unknown>`. Method becomes unused once Section 3 deletes the dead extraction scripts. Delete the line.
- `preload/webview.ts:17` — `(_event, patterns: ExtractionPattern[])` already typed; verify nothing slipped through.
- `preload/main.ts:33,38,43,48,65,67` — `(_event: any, data: any)` IPC handler signatures. Type `_event` as `Electron.IpcRendererEvent`. Type `data` per channel using existing types where they exist (e.g., `update:available` data uses the already-defined shape from `zeebUpdate.onUpdateAvailable`).

**Out of scope.** Anything that fights the type system gets a `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a one-line reason comment. This is not a perfectionist sweep.

**Tests.** None. Compiler check + existing suite.

---

## Sequencing inside the PR

Order to keep diffs reviewable and to let later sections benefit from earlier ones:

1. **Section 1** (type sync) — unblocks all subsequent renderer code and removes one `any`.
2. **Section 2** (drop jest) — independent, mechanical.
3. **Section 3** (delete dead scripts) — must happen before Section 7 deletes `executeJavaScript` from the d.ts.
4. **Section 7** (`any` cleanup) — clean slate before adding new code.
5. **Section 5** (subtitle bug) — small, isolated, TDD.
6. **Section 4** (window state) — one larger structural change.
7. **Section 6** (toast) — depends on nothing else; landing last keeps the new component out of the way of earlier diffs.

---

## Out of scope

- Item 1 (TMDB key) — not actionable.
- Item 11 (changelog pipeline) — deferred until it breaks.
- All Spec B items (Renamer decomposition, ErrorBoundary).
- All Spec C items (dual-renamer state, zustand unification, PlatformAdapter).
- TODO.md items (bulk rating updates, companion file rename).

---

## Success criteria

- `npm test` green.
- `npm run lint` green.
- Manual smoke: app launches, scans a folder, renames a file, undo works, options modal opens, window resize/maximize state persists across restart, poster-save error displays a toast.
- Diff is small enough to review in one sitting; PR description references this spec.
