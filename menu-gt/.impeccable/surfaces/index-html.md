---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Superficie: app Mercadito (index.html, todas las pestañas)

Modo: Operate. Tarea: planificar la semana, revisar el presupuesto y comprar con la lista en la tienda, con una mano.

## Direction contract

THESIS: El presupuesto es un ticket que se imprime: cada total sale renglón por renglón, con columnas exactas y lo desconocido marcado, nunca escondido. Rechaza la app de comida genérica (tarjetas blancas, verde, cuadrícula de fotos).

OWN-WORLD: Barra superior y navegación en tinta azul-negra de impresión térmica; fondo de papel térmico blanco frío; montos en mono de caja registradora con cifras tabulares; texto de interfaz en grotesca sobria; resaltador amarillo fosforescente para pendiente y selección; sello violeta "SIN COTIZAR" para faltantes; rojo de sello para "no alcanza". Ilustraciones de platos como dibujo de línea sobre papel.

STORY: Al abrir, la persona ve cuánto le queda del presupuesto y qué falta cotizar; entiende de dónde sale cada quetzal y decide cambiar una receta o ir a comprar.

FIRST VIEWPORT: Barra de tinta con nombre y tienda; debajo, la tira-ticket del presupuesto (saldo grande en mono, renglones: compra cotizada, gastos, disponible; marca de sello para faltantes); luego "Hoy" con las próximas comidas como renglones con ilustración pequeña; navegación inferior de 5 pestañas. Acción principal: abrir la lista de compras.

FORM: Recibo térmico de supermercado (candidato 6 de 7 en mi lista: libreta de fiado, rótulos pintados, cuaderno cuadriculado, pizarra y balanza, costales, ticket, camioneta). Seed key ea9c4dbd. Movimiento propio: los totales se "imprimen" renglón por renglón al cambiar algo.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Registro de aprobaciones

- 2026-10-29 · Maqueta aprobada: `.impeccable/mocks/comp-1-inicio.png` ("1 · Inicio con ticket").
- 2026-10-29 · Plan y activos aprobados por la persona en el chat ("Aprobar y construir"). La herramienta de revisión no pudo registrarlo porque este entorno no tiene navegador para el revisor; la fase `plates` queda abierta en `build/state.json` por esa razón, no por un activo pendiente.
- Desviaciones deliberadas: sello "SIN COTIZAR · N" dibujado con código (N es dato vivo); "¿Cómo se calculó?" dentro del ticket (principio: cada total se explica); botón de ubicación de 40 px (objetivo táctil).
