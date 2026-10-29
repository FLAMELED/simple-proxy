# Mercadito

Planificador de comidas y compras para hogares de Guatemala: menú semanal editable, lista de compras consolidada, despensa, precios por supermercado y presupuesto en quetzales que se puede explicar línea por línea.

> Esta carpeta es independiente del proxy que vive en la raíz del repositorio.

## Uso

```bash
cd menu-gt
npm install          # solo herramientas de prueba y empaquetado
npm start            # http://localhost:5173 (app + consulta de precios)
npm test             # 32 pruebas del motor, selector, guardado y capa de precios
npm run test:e2e     # 30 comprobaciones en Chromium a 320 y 390 px
npm run build:artifact   # dist/mercadito.html, un solo archivo sin servidor
```

## Estructura

```
src/engine/    Motor de cálculo puro (sin DOM ni red)
  units.js       Unidades y conversiones justificadas por ingrediente
  money.js       Centavos enteros y formato Q1,234.50
  demand.js      Demanda consolidada del período y descuento de despensa
  purchase.js    Producto, empaques, promociones y valores proporcionales
  budget.js      Saldo, faltante y estado ("alcanza", "sin confirmar", "no alcanza")
  compare.js     Comparar tiendas y combinar tiendas con transporte
  selector.js    Menú por reglas y alternativas con explicación
  index.js       Orquesta todo a partir del estado
src/data/      Ingredientes, 30 recetas, tiendas y precios de EJEMPLO (ficticios)
src/state/     Estado, guardado local, exportar/importar
src/ui/        Interfaz (JS sin framework + CSS)
src/prices/    Cliente de la consulta de precios
server/        Servidor local y obtención de precios (robots.txt, JSON-LD)
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
| Precios reales de Paiz, La Torre, Walmart, Maxi Despensa | No cargados. Consulta por página de producto implementada pero **no verificada en vivo** (ver `docs/INVESTIGACION-PRECIOS.md`) |
| Modelo de IA para interpretar preferencias | No conectado |
| Nutrición, calorías, metas de salud | Fuera de alcance |
| Cuentas, sincronización, pagos, compras directas | Fuera de alcance |

Las recetas son de referencia y no se han probado en cocina.
