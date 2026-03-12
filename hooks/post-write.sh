#!/bin/bash
# Claude Code PostToolUse hook — auto-pushes artifact-worthy files to the viewer
# Handles multiple concurrent Claude Code sessions via TTY-based session IDs
# Auto-launches the viewer if it's not already running

# Resolve viewer dir relative to this script's location (works from any install path)
VIEWER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT_FILE="$HOME/.claude-artifacts/port"
LOCK_FILE="$HOME/.claude-artifacts/launch.lock"

# ── Identify session by project directory name (what the tab is named) ──
SESSION_NAME=$(basename "$PWD" 2>/dev/null)
if [ -z "$SESSION_NAME" ] || [ "$SESSION_NAME" = "/" ]; then
  SESSION_NAME="claude"
fi

# ── Auto-launch viewer if not running ──
ensure_viewer_running() {
  # Quick check: port file exists and server responds
  if [ -f "$PORT_FILE" ]; then
    local port=$(cat "$PORT_FILE")
    if curl -sf --max-time 1 "http://127.0.0.1:$port/health" > /dev/null 2>&1; then
      return 0
    fi
  fi

  # Viewer not running — launch it (with lock to prevent race from multiple sessions)
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    # Another session is already launching — wait for it
    sleep 3
    return 0
  fi

  mkdir -p "$HOME/.claude-artifacts"

  # Cache terminal colors before launching (hook runs in real shell env)
  "$VIEWER_DIR/hooks/detect-colors.sh" 2>/dev/null

  if [ -d "$VIEWER_DIR/node_modules/.bin" ]; then
    nohup "$VIEWER_DIR/node_modules/.bin/electron" "$VIEWER_DIR" --no-sandbox \
      > /tmp/artifact-viewer.log 2>&1 &
    disown
    # Wait for it to come up
    for i in $(seq 1 20); do
      if [ -f "$PORT_FILE" ]; then
        local port=$(cat "$PORT_FILE")
        if curl -sf --max-time 1 "http://127.0.0.1:$port/health" > /dev/null 2>&1; then
          flock -u 9
          return 0
        fi
      fi
      sleep 0.25
    done
  fi

  flock -u 9
  return 1
}

# ── Read hook payload from stdin ──
PAYLOAD=$(cat)

# ── Extract tool name ──
TOOL=$(echo "$PAYLOAD" | jq -r '.tool_name // .tool // empty' 2>/dev/null)

# Only process Write tool calls
if [ "$TOOL" != "Write" ] && [ "$TOOL" != "write" ]; then
  exit 0
fi

# ── Extract file path ──
FILE_PATH=$(echo "$PAYLOAD" | jq -r '.tool_input.file_path // .input.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# ── Check if artifact-worthy (document files, not source code) ──
EXT="${FILE_PATH##*.}"
case "$EXT" in
  md|markdown|html|htm|json|txt|log|csv|xml|svg)
    ;;
  *)
    exit 0
    ;;
esac

# ── Ensure viewer is running (auto-launch if needed) ──
ensure_viewer_running || exit 0

PORT=$(cat "$PORT_FILE")

# ── Build and push artifact with session ID ──
FILENAME=$(basename "$FILE_PATH")
CONTENT=$(cat "$FILE_PATH")

case "$EXT" in
  md|markdown) TYPE="markdown" ;;
  html|htm|svg) TYPE="html" ;;
  json) TYPE="json" ;;
  *) TYPE="text" ;;
esac

jq -n \
  --arg action "push" \
  --arg title "$FILENAME" \
  --arg filename "$FILENAME" \
  --arg content "$CONTENT" \
  --arg type "$TYPE" \
  --arg source "hook" \
  --arg session "$SESSION_NAME" \
  --arg timestamp "$(date -Iseconds)" \
  '{action:$action, title:$title, filename:$filename, content:$content, type:$type, source:$source, session:$session, timestamp:$timestamp}' \
| curl -s -X POST "http://127.0.0.1:$PORT/artifact" \
    -H "Content-Type: application/json" \
    -d @- > /dev/null 2>&1 &

exit 0
