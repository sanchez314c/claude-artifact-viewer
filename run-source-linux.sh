#!/bin/bash
# Run Claude Artifact Viewer from source
cd "$(dirname "$0")"

# Electron sandbox fix for Linux
sudo sysctl -w kernel.unprivileged_userns_clone=1 2>/dev/null

# Check dependencies
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# ── Detect terminal colors before Electron launches ──
# (runs in the real shell env where dconf always works)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/hooks/detect-colors.sh" 2>/dev/null || true

# Launch
exec ./node_modules/.bin/electron . --no-sandbox "$@"
