# Claude Artifact Viewer — Changelog

## [1.2.3] - 2026-03-12 @ Electron Security Upgrade

### Security
- **CVE fix (GHSA-vmqv-hx8q-j7mg)**: Upgraded Electron from `33.4.11` to `41.0.1` to resolve the ASAR Integrity Bypass vulnerability (moderate severity). The advisory requires `>=35.7.5`; upgrading to `41.0.1` exceeds that threshold.
- Electron version pinned exactly (`41.0.1`, no `^` caret) per project versioning standards.
- `npm audit` confirms 0 vulnerabilities after upgrade.

### Compatibility
- No API breaking changes detected between Electron 33 and 41 for the APIs used by this project (`BrowserWindow`, `contextBridge`, `ipcRenderer`, `ipcMain`, `webFrame`, `dialog`, `screen`, `app`).
- No native modules required rebuild (`@electron/rebuild` confirmed clean).
- Launch validation passed — HTTP server started, window rendered, clean SIGTERM exit.

## [1.2.2] - 2026-03-12 18:23 @ Security Hardening

### Security
- **S-1/S-2 (XSS)**: Installed DOMPurify 3.3.3. All HTML and Markdown artifact content is now sanitized via `DOMPurify.sanitize()` before `innerHTML` injection. Exposed `sanitizeHTML` through `contextBridge`.
- **S-3 (No Auth)**: HTTP `/artifact` endpoint now requires a `Bearer` token. A 64-char random hex token is generated at startup via `crypto.randomBytes(32)` and written to the port file as `port:token`. `cli/artifact.js` and `hooks/post-write.sh` both read and send the token. Unauthorized requests receive 401.
- **S-3 (No Body Limit)**: Added 10MB body size cap to the HTTP handler. Requests exceeding the limit receive 413 and the connection is destroyed.
- **S-4 (No Input Validation)**: POST `/artifact` handler now validates: artifact must be an object, `content` must be a string if present, `type` is coerced to `'text'` if not in the allowed list, `filename` is stripped of path separators and `..` sequences.
- **S-5 (Shell Injection)**: `hooks/detect-colors.sh` JSON output now built exclusively via `jq -n --arg/--argjson` instead of heredoc string interpolation, eliminating injection vectors from terminal color values. `run-source-linux.sh` duplicate color detection removed — now delegates to `detect-colors.sh`.
- **Sandbox note**: `sandbox: false` retained with explanation. Electron sandbox mode disables `require()` for npm packages in preload; since preload loads `dompurify`, `marked`, and `highlight.js`, sandbox cannot be enabled without a full architecture change. `contextIsolation: true` + `nodeIntegration: false` remain in force.

## [1.2.1] - 2026-03-12 18:24 @ Packaging & Ship-Blocking Fixes

### Fixed
- `package-lock.json` regenerated — now correctly reflects v1.2.1 (was at v1.0.0)
- `unsafe-inline` retained in CSP `style-src` — required for `element.style.setProperty` theme engine and dynamic swatch rendering (documented)

### Added
- `files` field in `package.json` to scope npm publish output
- `homepage` and `bugs` fields in `package.json`
- `.npmignore` to exclude dev/archive artifacts from published package
- `.github/workflows/ci.yml` — matrix CI across ubuntu/macos/windows × Node 18/20/22
- `.github/PULL_REQUEST_TEMPLATE.md`
- Git repository initialized with full initial commit
- Empty `lib/` directory removed (moved to pre-trash)

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
