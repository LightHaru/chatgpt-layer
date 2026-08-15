#!/usr/bin/env bash
set -euo pipefail

for cmd in chatgpt-layer cgl codexplusplus codex-plusplus; do
  if command -v "$cmd" >/dev/null 2>&1; then
    exec "$cmd" update "$@"
  fi
done

echo "[!] chatgpt-layer is not installed in PATH; running the installer instead." >&2
exec bash -c "$(curl -fsSL https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.sh)"
