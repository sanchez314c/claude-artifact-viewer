# Claude Artifact Viewer — Changelog

## [1.2.1] - 2026-03-12 @ Repo Compliance Pass

### Fixed
- `package.json` version pinned to `1.2.0` (was stale at `1.0.0`)
- All dependency versions pinned to exact resolved values (no more `^` ranges)
- `bin/artifact` symlink corrected — was pointing to non-existent global install path
- `hooks/post-write.sh` `VIEWER_DIR` hardcode removed — now resolves relative to script location

### Added
- `.gitignore` for Node.js / Electron project
- `docs/INSTALLATION.md` (was referenced by README but missing)
- `CODE_OF_CONDUCT.md` (was referenced by CONTRIBUTING.md but missing)
- `.github/ISSUE_TEMPLATE/bug_report.md` and `feature_request.md`
- `engines.node` field in package.json (`>=18.0.0`)
- `keywords` and `repository` fields in package.json

## [1.2.0] - 2026-02-09 20:38 @ Artifact Auto-Expiry

### Added
- **Auto-expiry system**: Artifacts expire after 5 minutes unless explicitly kept
- **Keep button** in toolbar (also Ctrl+K) — toggles artifact retention
- **Tab checkmarks**: Each tab shows ○ (will expire) or ✓ (kept) — clickable to toggle
- **Countdown display**: Keep button shows remaining minutes for unkept artifacts
- **Tab tooltips**: Now include expiry countdown for unkept artifacts
- **Visual dimming**: Unkept/expiring tabs render at reduced opacity
- **15-second sweep**: Background timer auto-removes expired artifacts

## [1.1.1] - 2026-02-09 18:15 @ Project-Name Sessions + Race Fix

### Changed
- **Session ID is now the project directory name** — shows "openclaw", "claude-companion", "SWARM-audit" instead of cryptic TTY paths like "pts/0"
- Matches what your terminal tabs actually say — instantly recognizable

### Fixed
- **Port file race condition**: Old viewer's `before-quit` handler was deleting the port file AFTER the new viewer wrote it. Now each instance only cleans up its own port.

## [1.1.0] - 2026-02-09 @ Multi-Session Support

### Added
- **Session identification**: Each artifact tagged with source session
- **Session color coding**: Tab indicator dots colored per-session (12-color palette)
- **Session badge**: Toolbar shows active artifact's session with matching color
- **Tab tooltips**: Hover any tab to see session + source (hook/cli)
- **Status bar session info**: Last-received status shows which session sent the artifact
- **Auto-launch**: Hook auto-starts the Viewer if not running — first artifact from ANY session boots the panel
- **Launch race protection**: File lock prevents multiple sessions spawning duplicate viewers
- **CLI `--session` flag**: Override auto-detected session name

## [1.0.0] - 2026-02-09 @ Initial Release

### Added
- Electron-based floating artifact viewer panel with custom frameless window
- Terminal-native dark theme matching standard terminal aesthetics
- WebSocket + HTTP relay server for receiving artifacts in real-time
- Markdown rendering with full GFM support (marked.js)
- Syntax highlighting for 30+ languages (highlight.js)
- JSON auto-formatting and highlighting
- HTML content rendering
- Tabbed interface with artifact history and per-tab close buttons
- Source indicators: green (hook), blue (CLI), yellow (API)
- Copy to clipboard (Ctrl+C), Save/Download (Ctrl+S), Raw toggle (Ctrl+R)
- Tab cycling with Ctrl+Tab / Ctrl+Shift+Tab
- Close tab with Ctrl+W
- Pin on top (always-on-top toggle)
- Window position/size persistence across restarts
- Toast notifications for copy/save feedback
- CLI tool (`artifact push/status/clear`) for manual artifact pushing
- Pipe support (`cat file.md | artifact push --stdin`)
- Claude Code PostToolUse hook for automatic artifact capture on file writes
- Status bar with last-received artifact info and timestamp
