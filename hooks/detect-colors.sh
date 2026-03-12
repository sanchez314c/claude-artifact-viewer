#!/bin/bash
# Detect GNOME Terminal colors and cache as JSON
# Called from run-source-linux.sh and the auto-launch hook

CACHE_DIR="$HOME/.claude-artifacts"
CACHE_FILE="$CACHE_DIR/detected-colors.json"
mkdir -p "$CACHE_DIR"

PROFILE=$(gsettings get org.gnome.Terminal.ProfilesList default 2>/dev/null | tr -d "'")
[ -z "$PROFILE" ] && exit 1

PREFIX="/org/gnome/terminal/legacy/profiles:/:${PROFILE}/"

BG=$(dconf read "${PREFIX}background-color" 2>/dev/null | tr -d "'")
FG=$(dconf read "${PREFIX}foreground-color" 2>/dev/null | tr -d "'")
[ -z "$BG" ] || [ -z "$FG" ] && exit 1

FONT=$(dconf read "${PREFIX}font" 2>/dev/null | tr -d "'")
USE_SYS_FONT=$(dconf read "${PREFIX}use-system-font" 2>/dev/null)

PALETTE_RAW=$(dconf read "${PREFIX}palette" 2>/dev/null)

rgb_to_hex() {
  echo "$1" | sed -n 's/rgb(\([0-9]*\),\([0-9]*\),\([0-9]*\))/\1 \2 \3/p' | {
    read r g b
    printf '#%02x%02x%02x' "$r" "$g" "$b"
  }
}

BG_HEX=$(rgb_to_hex "$BG")
FG_HEX=$(rgb_to_hex "$FG")

# Parse ANSI palette if present
PALETTE_JSON="null"
if [ -n "$PALETTE_RAW" ] && [ "$PALETTE_RAW" != "''" ]; then
  COLORS=$(echo "$PALETTE_RAW" | grep -oP 'rgb\(\d+,\d+,\d+\)')
  if [ -n "$COLORS" ]; then
    PALETTE_JSON="["
    FIRST=1
    while IFS= read -r c; do
      HEX=$(rgb_to_hex "$c")
      [ "$FIRST" = "1" ] && FIRST=0 || PALETTE_JSON="${PALETTE_JSON},"
      PALETTE_JSON="${PALETTE_JSON}\"${HEX}\""
    done <<< "$COLORS"
    PALETTE_JSON="${PALETTE_JSON}]"
  fi
fi

FONT_VAL=""
if [ "$USE_SYS_FONT" = "false" ] && [ -n "$FONT" ]; then
  FONT_VAL="$FONT"
fi

TIMESTAMP=$(date -Iseconds)

if [ -n "$FONT_VAL" ]; then
  jq -n \
    --arg bg "$BG_HEX" \
    --arg fg "$FG_HEX" \
    --arg font "$FONT_VAL" \
    --argjson palette "$PALETTE_JSON" \
    --arg source "gnome-terminal" \
    --arg timestamp "$TIMESTAMP" \
    '{bg: $bg, fg: $fg, font: $font, palette: $palette, source: $source, timestamp: $timestamp}' \
    > "$CACHE_FILE"
else
  jq -n \
    --arg bg "$BG_HEX" \
    --arg fg "$FG_HEX" \
    --argjson palette "$PALETTE_JSON" \
    --arg source "gnome-terminal" \
    --arg timestamp "$TIMESTAMP" \
    '{bg: $bg, fg: $fg, font: null, palette: $palette, source: $source, timestamp: $timestamp}' \
    > "$CACHE_FILE"
fi
