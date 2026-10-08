#!/usr/bin/env bash
# Installs ocode for the current user: Python venv, editor libraries, launchers, plugins and an app-menu entry.
#   ./install.sh          normal install
#   ./install.sh --amd    also run a second Ollama on an AMD GPU (Vulkan, port 11435) for AI autocomplete
set -euo pipefail

APP="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
BIN="$HOME/.local/bin"
CFG="${XDG_CONFIG_HOME:-$HOME/.config}"

# Python 3.14 breaks several wheels, so prefer an older interpreter when one exists.
PY="${PYTHON:-}"
if [[ -z $PY ]]; then
  for c in python3.12 python3.13 python3.11 python3; do command -v "$c" >/dev/null && { PY=$c; break; }; done
fi
if [[ ! -x $APP/.venv/bin/python ]]; then
  echo "→ creating Python environment with $PY"
  "$PY" -m venv "$APP/.venv"
fi
echo "→ installing Python packages"
"$APP/.venv/bin/pip" install -q -r "$APP/requirements.txt"

if [[ ! -f $APP/static/vendor/monaco/vs/loader.js ]]; then
  echo "→ downloading editor libraries with npm"
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT
  (cd "$tmp" && npm init -y >/dev/null && npm install --no-audit --no-fund --silent \
    monaco-editor@0.57.0 @xterm/xterm@6.0.0 @xterm/addon-fit@0.11.0 marked@18.1.0 dompurify@3.4.16)
  N="$tmp/node_modules" V="$APP/static/vendor"
  mkdir -p "$V/monaco" "$V/xterm"
  cp -r "$N/monaco-editor/min/vs" "$V/monaco/"
  cp "$N/@xterm/xterm/lib/xterm.js" "$N/@xterm/xterm/css/xterm.css" "$N/@xterm/addon-fit/lib/addon-fit.js" "$V/xterm/"
  cp "$N/marked/lib/marked.umd.js" "$N/dompurify/dist/purify.min.js" "$V/"
fi

link() {
  local src=$1 dest=$2
  if [[ -e $dest && ! -L $dest ]]; then
    mv "$dest" "$dest.bak.$(date +%s)"
    echo "  moved existing $dest aside"
  fi
  mkdir -p "$(dirname "$dest")"
  ln -sfn "$src" "$dest"
}

echo "→ linking launchers and plugins"
link "$APP/bin/ocode-gui" "$BIN/ocode-gui"
link "$APP/bin/ocode" "$BIN/ocode"
link "$APP/plugins" "$CFG/ocode/plugins"

echo "→ adding ocode to the app launcher"
mkdir -p "$HOME/.local/share/applications" "$HOME/.local/share/icons/hicolor/256x256/apps"
cp "$APP/icon.png" "$HOME/.local/share/icons/hicolor/256x256/apps/ocode-gui.png"
cat > "$HOME/.local/share/applications/ocode-gui.desktop" <<EOF
[Desktop Entry]
Version=1.0
Name=ocode
GenericName=AI Code Editor
Comment=Local AI coding assistant powered by Ollama
Exec=$BIN/ocode-gui
Icon=ocode-gui
Type=Application
Categories=Development;TextEditor;
Keywords=ai;code;editor;ollama;
Terminal=false
StartupWMClass=ocode-gui
StartupNotify=true
EOF
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true

if [[ ${1:-} == --amd ]]; then
  echo "→ installing the AMD (Vulkan) Ollama service"
  link "$APP/systemd/ollama-amd.service" "$CFG/systemd/user/ollama-amd.service"
  systemctl --user daemon-reload
  systemctl --user enable --now ollama-amd
  echo "  pull an autocomplete model with: OLLAMA_HOST=127.0.0.1:11435 ollama pull qwen2.5-coder:3b-base"
fi

echo "✓ done — run ocode-gui or open \"ocode\" from your app launcher"
