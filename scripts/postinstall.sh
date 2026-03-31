#!/usr/bin/env bash
set -euo pipefail

BIN_DIR="$(dirname "$0")/../bin"
mkdir -p "$BIN_DIR"

case "$(uname -s)" in
  Linux*)  ASSET="yt-dlp_linux" ;;
  Darwin*) ASSET="yt-dlp_macos" ;;
  *)       echo "Unsupported OS: $(uname -s)"; exit 1 ;;
esac

TARGET="$BIN_DIR/yt-dlp"

# Always re-download if platform changed (e.g. cached macOS binary on Linux)
if [ -f "$TARGET" ] && "$TARGET" --version >/dev/null 2>&1; then
  echo "[postinstall] yt-dlp already exists and works, skipping download"
  exit 0
fi

URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/$ASSET"
echo "[postinstall] Downloading yt-dlp from $URL"
curl -L --fail --silent --show-error -o "$TARGET" "$URL"
chmod +x "$TARGET"
echo "[postinstall] yt-dlp installed to $TARGET"
