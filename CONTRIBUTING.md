# Contributing to Claude Artifact Viewer

## Dev Setup

```bash
git clone https://github.com/sanchez314c/claude-artifact-viewer
cd claude-artifact-viewer
npm install
./run-source-linux.sh
```

Requirements: Node.js 18+, npm, Electron 33 (installed as devDependency).

On Linux, Electron requires user namespaces:
```bash
sudo sysctl -w kernel.unprivileged_userns_clone=1
```
`run-source-linux.sh` handles this automatically.

## Project Layout

- `main.js` — Electron main process. Owns the window, HTTP server, IPC.
- `preload.js` — Exposes `window.artifactAPI` via contextBridge. This is the only interface between renderer and main.
- `renderer/renderer.js` — All UI logic. No Node.js APIs — only `window.artifactAPI`.
- `cli/artifact.js` — Self-contained CLI. Reads the port file, POST to `/artifact`.
- `hooks/post-write.sh` — Claude Code integration. Runs on every Write tool call.

## Code Conventions

- Plain JavaScript (no TypeScript). ES2022 features are fine — Electron 33 supports them.
- No build step. Source runs directly.
- CSS uses custom properties (`--bg-primary`, `--accent`, etc.) for all theme values. Do not hardcode colors.
- The renderer is sandboxed (`contextIsolation: true`, `nodeIntegration: false`). Keep it that way.
- Port is random (`:0` bind). Never hardcode a port.
- Session ID = `path.basename(process.cwd())`. Don't change this without updating both `cli/artifact.js` and `hooks/post-write.sh`.

## Testing Artifacts

With the viewer running, use the CLI to send test content:

```bash
# Push a markdown file
artifact push README.md

# Push inline text
artifact push --text "# Hello\n\nTest artifact"

# Push from stdin
echo '{"key": "value"}' | artifact push --stdin --type json

# Check viewer is alive
artifact status
```

## PR Process

1. Fork and create a feature branch
2. Make your changes
3. Test manually with `./run-source-linux.sh`
4. Update `CHANGELOG.md` with your change under a new version or `[Unreleased]`
5. Open a PR using the PR template

Please reference any related issues in your PR description.

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
