# Claude Artifact Viewer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![Electron](https://img.shields.io/badge/Electron-33-47848f.svg)](https://electronjs.org)

A floating artifact viewer panel for Claude Code — displays overviews, reports, and code in a native Electron window bound to your terminal. Artifacts stream in automatically via a Claude Code PostToolUse hook whenever Claude writes a document file, or manually via the `artifact` CLI.

## What It Does

When Claude Code writes a Markdown report, HTML output, JSON file, or any document-type artifact, the viewer pops it up instantly in a side panel next to your terminal. Multiple concurrent Claude Code sessions are supported, each color-coded for visual identification. Artifacts auto-expire after 5 minutes unless you keep them.

## Quick Start

```bash
# Install dependencies
npm install

# Launch the viewer
./run-source-linux.sh

# Push a file manually
artifact push myfile.md
artifact push --stdin < output.txt
artifact push --text "hello world"
```

## Installation

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for complete setup including Claude Code hook configuration.

## Features

- **Multi-session**: Tracks artifacts from multiple Claude Code sessions simultaneously, each with a distinct color
- **Auto-launch**: Hook starts the viewer automatically on first artifact from any session
- **Content types**: Renders Markdown (GFM), HTML, JSON (formatted + highlighted), and 30+ code languages
- **Auto-expiry**: Artifacts expire after 5 minutes; use Keep (Ctrl+K) to retain indefinitely
- **Theme engine**: 8 built-in themes (GitHub Dark, Dracula, Nord, Monokai, One Dark, Solarized, Catppuccin) + auto-detect from GNOME Terminal
- **Keyboard shortcuts**: Ctrl+C copy, Ctrl+S save, Ctrl+R raw toggle, Ctrl+W close tab, Ctrl+Tab cycle tabs, Ctrl+= zoom

## CLI Reference

```bash
artifact push <file>                    # Push a file
artifact push --stdin                   # Push from stdin pipe
artifact push --text "content"          # Push inline text
artifact push <file> --title "My Title" # Custom title
artifact push <file> --type markdown    # Force content type
artifact push <file> --lang python      # Force syntax language
artifact push <file> --session myapp    # Override session name
artifact status                         # Check if viewer is running
artifact clear                          # Clear all artifacts
```

## File Structure

```
claude-artifact-viewer/
├── main.js              # Electron main process, HTTP+WebSocket server
├── preload.js           # Context bridge exposing artifactAPI to renderer
├── renderer/
│   ├── index.html       # UI layout: titlebar, tabs, toolbar, content, statusbar
│   ├── renderer.js      # Full renderer logic: themes, tabs, expiry, keyboard
│   └── styles.css       # CSS variables, theme tokens, component styles
├── cli/
│   └── artifact.js      # CLI tool (push/status/clear commands)
├── hooks/
│   ├── post-write.sh    # Claude Code PostToolUse hook (auto-push on Write)
│   └── detect-colors.sh # GNOME Terminal color detection → ~/.claude-artifacts/
├── bin/
│   └── artifact         # npm bin symlink → cli/artifact.js
└── run-source-linux.sh  # Dev launch script
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE)
