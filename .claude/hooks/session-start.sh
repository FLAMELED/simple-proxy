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

# Proxy de la raíz. El lockfile es formato 6: se usa pnpm 8, igual que el CI y el Dockerfile.
cd "$ROOT"
npx -y pnpm@8.15.9 install --frozen-lockfile --silent || echo "aviso: no se pudieron instalar las dependencias del proxy" >&2
