#!/bin/bash
# Prepara las sesiones en la nube: dependencias de Mercadito (menu-gt) y del proxy.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

# Mercadito: esbuild y playwright-core. Chromium ya viene en /opt/pw-browsers; no se descarga.
cd "$ROOT/menu-gt"
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-audit --no-fund --loglevel=error

# Las tiendas solo se alcanzan a través del proxy del entorno.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export NODE_USE_ENV_PROXY=1' >> "$CLAUDE_ENV_FILE"
fi

# Proxy de la raíz (pnpm), si la herramienta está disponible.
if command -v pnpm >/dev/null 2>&1; then
  cd "$ROOT"
  # Sin reescribir el lockfile: si no coincide, se avisa y la sesión sigue.
  pnpm install --frozen-lockfile --silent || echo "aviso: pnpm-lock.yaml no coincide con package.json; dependencias del proxy sin instalar" >&2
fi
