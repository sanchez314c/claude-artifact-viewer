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

FONT_JSON="null"
if [ "$USE_SYS_FONT" = "false" ] && [ -n "$FONT" ]; then
  FONT_JSON="\"${FONT}\""
fi

cat > "$CACHE_FILE" <<EOF
{
  "bg": "${BG_HEX}",
  "fg": "${FG_HEX}",
  "font": ${FONT_JSON},
  "palette": ${PALETTE_JSON},
  "source": "gnome-terminal",
  "timestamp": "$(date -Iseconds)"
}
EOF
