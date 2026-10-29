# Mercadito

Planificador de comidas y compras para hogares de Guatemala: menú semanal editable, lista de compras consolidada, despensa, precios por supermercado y presupuesto en quetzales que se puede explicar línea por línea.

> Esta carpeta es independiente del proxy que vive en la raíz del repositorio.

## Uso

```bash
cd menu-gt
npm install          # solo herramientas de prueba y empaquetado
npm start            # http://localhost:5173 (app + consulta de precios)
npm run ci           # todo lo que corre GitHub Actions: check + test + e2e + artifact
npm run check        # integridad de datos y sintaxis, sin red
npm test             # 38 pruebas del motor, selector, guardado y capa de precios
npm run test:e2e     # 40 comprobaciones en Chromium a 320 y 390 px
npm run build:artifact   # dist/mercadito.html, un solo archivo sin servidor
npm run capture      # capturas de revisión de diseño
NODE_USE_ENV_PROXY=1 npm run snapshot   # vuelve a capturar precios reales (≈6 min) y reporta cambios
```

## Estructura

```
src/engine/    Motor de cálculo puro (sin DOM ni red)
  units.js       Unidades y conversiones justificadas por ingrediente
  money.js       Centavos enteros y formato Q1,234.50
  demand.js      Demanda consolidada del período y descuento de despensa
  purchase.js    Producto, empaques, promociones y valores proporcionales
  budget.js      Saldo, faltante, vigencia de precios y estado ("alcanza", "sin confirmar", "no alcanza")
  compare.js     Comparar tiendas y combinar tiendas con transporte
  selector.js    Menú por reglas y alternativas con explicación
  index.js       Orquesta todo a partir del estado
src/data/      Ingredientes, 30 recetas, tiendas, precios reales guardados (generados) y de EJEMPLO (ficticios)
src/state/     Estado, guardado local, exportar/importar
src/ui/        Interfaz (JS sin framework + CSS)
src/prices/    Cliente de la consulta de precios
server/        Servidor local y obtención de precios (robots.txt, JSON-LD)
scripts/       Captura y diferencias de precios, revisión de datos, Artifact, capturas de diseño
sw.js          Service worker: la versión servida abre sin señal
test/          Pruebas unitarias, fixture sintético y pruebas E2E
docs/          Investigación de fuentes de precios
```

## Cómo se calcula

1. Se suma lo que piden todas las recetas del período por ingrediente, en unidad base (g, ml, unidad o manojo).
2. Se descuenta la despensa, solo del mismo ingrediente.
3. Para lo que falta se eligen empaques completos. Se busca la combinación de presentaciones con menor dinero a pagar (por ejemplo 1 kg + 2 × 400 g si sale más barato que 2 kg), respetando marcas fijas y sin usar agotados ni productos sin precio.
4. Las promociones solo se aplican si se cumple su requisito (cantidad mínima, o confirmación de la persona en las que piden tarjeta).
5. Se separan: dinero a pagar, valor proporcional de lo usado, valor de lo que había en casa y sobrante.
6. Si falta un precio se muestra el subtotal conocido y nunca se afirma que el presupuesto alcanza.

Las tazas se convierten a gramos solo con el peso por taza de cada ingrediente; los manojos no se convierten a peso.

## Qué está implementado y qué no

| | Estado |
|---|---|
| Menú, porciones, cambio de receta con explicación, restricciones | Implementado (reglas, sin IA) |
| Lista consolidada, despensa, empaques, presupuesto explicable | Implementado y probado |
| Mi supermercado, Comparar, Combinar (con transporte) | Implementado |
| "Mi precio", copiar lista, compartir por WhatsApp | Implementado |
| Guardado local, exportar e importar | Implementado (solo este navegador; en el Artifact, la descarga pide confirmación) |
| Precios de "Súper Ejemplo A/B" | Ficticios, solo para probar |
| Precios reales de Paiz y La Torre | 94 precios leídos el 2026-10-29 de sus páginas públicas de producto, como "último precio guardado", sin sucursal (ver `docs/INVESTIGACION-PRECIOS.md`) |
| Consulta en vivo por página de producto | Verificada en Paiz, La Torre y Walmart con el servidor local; Maxi Despensa sin precio en el producto probado |
| Modelo de IA para interpretar preferencias | No conectado |
| Nutrición, calorías, metas de salud | Fuera de alcance |
| Cuentas, sincronización, pagos, compras directas | Fuera de alcance |

Las recetas son de referencia y no se han probado en cocina.

## Cinco mejoras de fondo (2026-10-29)

1. **Vigencia de precios.** Un precio guardado o consultado de más de 14 días, o uno ingresado por ti de más de 30, ya no sirve para confirmar que el presupuesto alcanza. En la lista aparece como "Precio de hace N días" (`engine/budget.js`, `PRICE_MAX_AGE_DAYS`).
2. **Lo pagado en tu sucursal.** Al marcar un producto como comprado, puedes anotar cuánto pagaste y en qué sucursal. Ese precio reemplaza el precio en línea de ese producto en esa tienda. Así se cubre lo que las páginas no publican: el precio real en Chiquimula.
3. **Funciona sin señal.** La versión servida instala un service worker y abre sin red con el plan guardado. La consulta de precios nunca se guarda en caché.
4. **Arnés permanente.** `npm run check` revisa la integridad de los datos. `npm run ci` corre lo mismo que GitHub Actions (`.github/workflows/menu-gt.yml`). Un hook de inicio prepara las sesiones en la nube (`.claude/hooks/session-start.sh`) y `CLAUDE.md` tiene las reglas del proyecto.
5. **Captura semanal con cambios.** `snapshot-prices.mjs` compara contra la captura anterior y escribe `data/capturas/cambios.md`. El flujo `menu-gt-precios.yml` la corre cada lunes y deja el resultado para revisión, sin hacer commit automático.

## Referencias visuales: ¿fotos de las tiendas? No

Las ilustraciones de los platos son generadas y su origen está documentado en `assets/dishes/PROMPTS.md`. No se usan las fotos de producto de Paiz, La Torre o Walmart por cuatro razones:

- Son material con derechos de las cadenas o de las marcas, y robots.txt no autoriza a reutilizarlas.
- Enlazarlas en vivo agrega peticiones a sus servidores en cada vista y rompe el uso sin señal. Además, el Artifact bloquea imágenes de otros dominios.
- Una foto de empaque haría creer que ese es el producto que se va a cotizar, cuando la app elige entre varias presentaciones.
- Cada precio ya lleva el enlace a la página de origen ("Ver origen"): esa es la referencia verificable.

## Fuentes y repositorios revisados

| Fuente | Qué ofrece | Estado |
|---|---|---|
| MAGA, [precios.maga.gob.gt](https://precios.maga.gob.gt/) | Informes semanales de precios mayoristas y al consumidor (mercado La Terminal) | Solo PDF; los hallados son de 2015-2016. El dominio está bloqueado en este entorno. Sería útil como "precio de referencia de mercado" para lo que no tiene precio en línea, si se permite el dominio y se confirma que sigue publicándose. |
| INCAP, Tabla de Composición de Alimentos de Centroamérica | Composición de alimentos | Solo PDF, sin datos descargables. La nutrición queda fuera del alcance. |
| Open Food Facts | Datos abiertos de productos por código de barras | Dominio bloqueado aquí. Sirve para normalizar marcas y presentaciones, pero no da precios. |
| [Grocy](https://github.com/grocy/grocy), [KitchenOwl](https://github.com/TomBursch/kitchenowl), RecipeSage | Despensa, recetas y lista de compras autoalojadas | Sirvieron como referencia de funciones (despensa por ubicación, lista compartida). No se reutiliza código: usan PHP, Flutter o TypeScript con servidor, y este proyecto no tiene dependencias en tiempo de ejecución. |

