# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Hogares guatemaltecos que organizan las comidas de la semana y controlan cuánto gastan. Empieza en Chiquimula, pero la ubicación se puede cambiar. Planifican desde el teléfono, a veces con conexión lenta, y usan la lista de compras dentro del supermercado o el mercado, a menudo con una mano. No todos los hogares comen igual: preferencias, alergias, equipo de cocina y tiempo varían.

## Product Purpose

Responder: "¿Qué vamos a cocinar esta semana, qué necesitamos comprar, cuánto costará donde compramos y cuánto dinero nos quedará?". Éxito: un menú editable conectado con una compra concreta y un presupuesto en quetzales que se puede explicar línea por línea.

## Positioning

Conecta el menú con la compra real: suma la demanda de toda la semana, descuenta la despensa, compra empaques completos y separa el dinero a pagar del valor de lo que se usa. Nunca trata un precio faltante como cero ni declara ganadora a una tienda con productos sin cotizar.

## Operating Context

- Planificación en casa (domingo o inicio de semana) y consulta de la lista en la tienda.
- Medidas familiares: libras, onzas, unidades, docenas, litros, tazas y manojos.
- Supermercados: Paiz y La Torre por defecto (precios en línea guardados con fecha y URL, sin sucursal); Walmart y Maxi Despensa disponibles; mercado y tiendas mediante "Mi precio".
- La lista se comparte por WhatsApp con una acción de la persona.

## Capabilities and Constraints

- Menú por reglas (sin IA conectada), 30 recetas cotidianas guatemaltecas, cambio de receta con explicación.
- Lista consolidada por categorías, despensa, comparación y combinación de tiendas, carga manual de precios, exportar/importar.
- Guardado solo en el navegador; sin cuentas, pagos ni sincronización.
- Publicado como un único HTML (Artifact) y como app con servidor local para consultar precios.
- Sin calorías ni valores nutricionales; las recetas no se probaron en cocina.

## Brand Commitments

- Nombre: Mercadito.
- Español natural de Guatemala; quetzales con dos decimales (Q1,234.50).

## Evidence on Hand

- 94 precios reales (Paiz y La Torre) leídos el 2026-10-29: `src/data/real-prices.js`.
- 30 recetas: `src/data/recipes.js`.
- No hay fotografías reales de los platos ni testimonios de usuarios; no se deben inventar.

## Product Principles

1. Cada total se puede explicar: de dónde salió cada número y qué falta.
2. Lo desconocido se muestra, no se rellena: precios faltantes, agotados y sucursal no indicada quedan visibles.
3. Empezar rápido y completar después.
4. Nada se cambia sin que la persona lo elija.
5. Pensado para la tienda: legible de un vistazo, con una mano.

## Accessibility & Inclusion

Contraste suficiente, objetivos táctiles de 44 px, navegación con teclado, sin desbordamiento horizontal en 320 px, respeto a movimiento reducido. Conexiones lentas: pocos recursos externos.
