#!/usr/bin/env bash
set -euo pipefail

BIN_DIR="$(dirname "$0")/../bin"
mkdir -p "$BIN_DIR"

# Pick the right binary for the platform
case "$(uname -s)" in
  Linux*)  ASSET="yt-dlp_linux" ;;
  Darwin*) ASSET="yt-dlp_macos" ;;
  *)       echo "Unsupported OS: $(uname -s)"; exit 1 ;;
esac

TARGET="$BIN_DIR/yt-dlp"

if [ -f "$TARGET" ]; then
  echo "[postinstall] yt-dlp already exists, skipping download"
  exit 0
fi

# Get latest release download URL
URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/$ASSET"
echo "[postinstall] Downloading yt-dlp from $URL"
curl -L --fail --silent --show-error -o "$TARGET" "$URL"
chmod +x "$TARGET"
echo "[postinstall] yt-dlp installed to $TARGET"
