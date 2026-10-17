#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "============================================================"
echo "  GitSwipe - one-click setup (macOS/Linux)"
echo "============================================================"
echo ""

if ! command -v node &> /dev/null; then
  echo "[!] Node.js is required (v22+). Install from https://nodejs.org"
  exit 1
fi
echo "[ok] Node found: $(node --version)"

if [ ! -d node_modules ]; then
  echo "[..] Installing dependencies (first run only)..."
  npm install
fi
echo "[ok] Dependencies ready."

if [ ! -f apps/daemon/public/index.html ]; then
  echo "[..] Building the web UI (first run only)..."
  npm run build:web
fi
echo "[ok] Web UI ready."

echo "[..] Starting the GitSwipe workstation..."
npm run daemon -- serve &
SERVE_PID=$!
sleep 10

if command -v open &> /dev/null; then
  open http://127.0.0.1:7420
elif command -v xdg-open &> /dev/null; then
  xdg-open http://127.0.0.1:7420
else
  echo "[ok] Open http://127.0.0.1:7420 in your browser"
fi

echo ""
echo "============================================================"
echo "  READY. The browser is opening."
echo "  Next: run  npm run daemon -- pair  for the pairing code."
echo "============================================================"
echo ""

read -p "Remote access? (T = tunnel, L = local only): " choice
if [[ "$choice" == "T" || "$choice" == "t" ]]; then
  CLOUDFLARED_DIR="$HOME/.local/share/opencode"
  CLOUDFLARED="$CLOUDFLARED_DIR/cloudflared"
  mkdir -p "$CLOUDFLARED_DIR"
  if [ ! -f "$CLOUDFLARED" ]; then
    echo "[..] Downloading cloudflared (one time)..."
    ARCH=$(uname -m)
    OS=$(uname)
    if [[ "$OS" == "Darwin" && "$ARCH" == "arm64" ]]; then
      curl -sSL -o "$CLOUDFLARED" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64
    elif [[ "$OS" == "Darwin" ]]; then
      curl -sSL -o "$CLOUDFLARED" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64
    else
      curl -sSL -o "$CLOUDFLARED" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
    fi
    chmod +x "$CLOUDFLARED"
  fi
  echo "[ok] Tunnel starting. The https URL below works from ANY network."
  "$CLOUDFLARED" tunnel --url http://127.0.0.1:7420
else
  echo "[ok] Local-only."
  wait $SERVE_PID
fi
