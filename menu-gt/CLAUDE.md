# Mercadito (menu-gt)

Planificador de comidas, lista de compras y presupuesto en quetzales para hogares de Guatemala. Vanilla JS con módulos ES, sin framework. Es independiente del proxy de la raíz del repositorio.

## Comandos
- `npm run ci`: lo mismo que corre GitHub Actions (`check`, `test`, `test:e2e`, `build:artifact`). Córrelo antes de cada push.
- `npm run check`: integridad de datos (recetas, conversiones, mapa de productos, precios reales, ilustraciones) y sintaxis. Es rápido y no usa red.
- `npm test`: motor, selector, guardado y capa de precios (`node --test`).
- `npm run test:e2e`: Chromium a 320 y 390 px. Cubre la primera pantalla, la impresión del ticket, la vigencia de precios, lo pagado en tienda, el uso sin señal, los objetivos táctiles y que no haya errores de JS.
- `npm run capture`: capturas de revisión de diseño en `.impeccable/review/` (no se versionan).
- `NODE_USE_ENV_PROXY=1 npm run snapshot`: vuelve a capturar precios reales, una página cada 3 s. Muestra qué cambió respecto de la captura anterior.

## Arquitectura
- `src/engine/`: cálculo puro y determinista, sin DOM ni red. La entrada es `computeAll(state, { now })` en `index.js`. Todo lo que dé un veredicto (presupuesto, ganador, ahorro) vive aquí y se prueba aquí.
- `src/data/`: catálogo estático. `real-prices.js` es GENERADO por `scripts/snapshot-prices.mjs`; no se edita a mano. Las correcciones manuales van en `price-reviews.json`.
- `src/state/`: estado versionado (`SCHEMA_VERSION`), localStorage, exportar e importar.
- `src/ui/`: vistas que devuelven HTML como texto. `app.js` tiene las acciones (`data-action`) y los formularios (`data-form`).
- `server/`: servidor local opcional. Sirve la app y `/api/prices/*`: robots.txt, una consulta cada 3 s, JSON-LD.
- `scripts/build-artifact.mjs`: genera un HTML de un solo archivo para el Artifact, sin servidor y sin service worker.

## Reglas que no se negocian
- **Nunca inventar precios, existencias, promociones ni conexiones.** Lo que no tiene precio se muestra como "Sin cotizar" y no cuenta como cero.
- Cada precio dice su origen: ejemplo ficticio, último guardado, consultado ahora o ingresado por ti, con su fecha.
- El presupuesto nunca dice "alcanza" si falta un precio o si un precio tiene más días de los que permite `PRICE_MAX_AGE_DAYS`.
- El dinero se maneja en centavos enteros (`engine/money.js`). Las conversiones solo se hacen con el peso por unidad o por taza justificado de cada ingrediente.
- Respetar robots.txt y no eludir bloqueos. No usar páginas de búsqueda (`/busca/`) ni servicios de scraping de terceros.
- No poner claves privadas en el navegador.
- No usar fotos de las tiendas: las ilustraciones son generadas y su origen está en `assets/dishes/PROMPTS.md`.

## Diseño
Antes de tocar la interfaz, lee `DESIGN.md`. Ahí están los tokens, las fuentes y el movimiento propio del ticket. Se usa tinta azul, papel y resaltador, y nunca verde.
