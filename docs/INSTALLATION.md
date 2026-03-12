# Installation

## Requirements

- Node.js 18 or newer
- npm
- Linux with a display server (X11 or Wayland)

## Install Dependencies

```bash
cd claude-artifact-viewer
npm install
```

## Run

```bash
./run-source-linux.sh
```

The script handles the Linux Electron sandbox requirement automatically (`kernel.unprivileged_userns_clone=1`).

## Claude Code Hook Setup

To have artifacts auto-pushed whenever Claude Code writes a file, register the `post-write.sh` hook.

Add this to your Claude Code hooks config (`.claude/settings.json`):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/claude-artifact-viewer/hooks/post-write.sh"
          }
        ]
      }
    ]
  }
}
```

Replace `/path/to/claude-artifact-viewer` with the actual path where you cloned or installed this repo.

The hook:
- Detects if the written file is an artifact-worthy document (Markdown, HTML, JSON, etc.)
- Auto-launches the viewer if it's not running
- Pushes the file content to the viewer over HTTP

## CLI Setup (Optional)

To use the `artifact` CLI from any directory:

```bash
# Option 1: npm link (requires the repo)
npm link

# Option 2: Add the bin directory to PATH
export PATH="/path/to/claude-artifact-viewer/bin:$PATH"
```

## Terminal Color Detection

The viewer auto-detects your GNOME Terminal colors on startup. Colors are cached in `~/.claude-artifacts/detected-colors.json`. If detection fails, the viewer falls back to GitHub Dark theme.

## Themes

Select a theme from the toolbar dropdown. Options:
- Auto (matches terminal)
- GitHub Dark
- Dracula
- Nord
- Monokai
- One Dark
- Solarized Dark
- Catppuccin Mocha

Theme preference is saved to `~/.claude-artifacts/theme.json`.
