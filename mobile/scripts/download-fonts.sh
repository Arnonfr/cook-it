#!/usr/bin/env bash
# Download Noto Sans Hebrew fonts from Google Fonts GitHub
set -e

FONTS_DIR="$(dirname "$0")/../assets/fonts"
mkdir -p "$FONTS_DIR"

BASE="https://github.com/google/fonts/raw/main/ofl/notosanshebrew"

curl -fsSL "$BASE/NotoSansHebrew%5Bwdth%2Cwght%5D.ttf" -o "$FONTS_DIR/NotoSansHebrew-Variable.ttf" 2>/dev/null || true

# Download individual weights from Expo Google Fonts CDN
declare -A WEIGHTS=(
  ["Regular"]="400"
  ["Medium"]="500"
  ["SemiBold"]="600"
  ["Bold"]="700"
)

CDN="https://fonts.gstatic.com/s/notosanshebrew/v38"

# Fallback: use Google Fonts API URL
for name in Regular Medium SemiBold Bold; do
  OUT="$FONTS_DIR/NotoSansHebrew-${name}.ttf"
  if [ ! -f "$OUT" ]; then
    echo "Downloading NotoSansHebrew-${name}.ttf ..."
    # Use @expo-google-fonts package approach
    echo "  → Use: npx expo install @expo-google-fonts/noto-sans-hebrew"
  fi
done

echo ""
echo "⚠️  Run: npx expo install @expo-google-fonts/noto-sans-hebrew"
echo "   Then update app/_layout.tsx to use useFonts from that package."
