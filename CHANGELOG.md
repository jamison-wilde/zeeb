# Changelog

## [Unreleased]

### Added
- Dark/Light/System theme switching (View → Theme menu and Options → General), dark by default
- Drag search-part chips onto a neighbor to merge them, or between chips to reorder
- Search results show poster thumbnails (toggle in the header), a year pill that lights up when it matches the filename, and the cast line
- TT and Sample filter toggles replace the old checkboxes
- Adjustable UI scale: Ctrl+= / Ctrl+- resize the whole interface, Ctrl+0 resets to the new 130% default, and the setting persists across restarts

### Changed
- Full visual redesign ("Console" theme): semantic color tokens, redesigned search-part chips with state underline and two-row buttons, restyled panels, modals, and options
- Search-part chips are roughly twice as large for easier tapping and editing
- TT and Sample toggles now read as filters: ON means matching files are hidden
- Text sizes are defined by named typography tokens instead of scattered pixel values

## [4.0.1] - 2026-05-06

### Added
- Linux release as AppImage; runs on most distributions without dependency setup.

## [4.0.0] - 2026-05-03

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
- Notification toast for poster-save and rename failures
- Top-level ErrorBoundary with reload and copy-error recovery
