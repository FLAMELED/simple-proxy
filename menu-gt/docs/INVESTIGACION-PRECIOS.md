# Investigación de fuentes de precios

Fecha: 2026-10-19. Ubicación de referencia: Chiquimula.

## Resultado (actualizado 2026-10-29)

**La consulta de páginas públicas de producto funciona en Paiz, La Torre y Walmart.** Con los dominios permitidos en la red del entorno, el servidor leyó robots.txt y páginas de producto reales. La app trae **164 precios reales guardados** (66 de Paiz, 60 de Walmart y 38 de La Torre) leídos el 2026-10-29, cada uno con URL, fecha y hora, disponibilidad y nota de sucursal. Se muestran como "Último precio guardado".

### Qué publica cada página (comprobado)

| Dato | Paiz | La Torre | Walmart | Maxi Despensa |
|---|---|---|---|---|
| Precio en GTQ (JSON-LD `schema.org/Product`) | Sí | Sí | Sí | No en el producto probado (sin existencia) |
| Marca y disponibilidad | Sí | Sí | Sí | — |
| Tamaño del empaque | Casi siempre en el nombre; si no, en la ficha "Tamaño (Gramaje, Volumen)" | Casi nunca en el nombre; en la ficha "Contenido Neto" | Como Paiz | — |
| Precio regular frente a rebajado | Sí (`ListPrice`) | Sí | Sí | — |
| Promociones con condiciones | Lista incrustada, sin estructura; no se aplican | Igual | Igual | — |
| Sucursal | La página no la indica | El sitio permite elegir tienda; se leyó sin tienda elegida | No la indica | — |

### Segunda captura del 2026-10-29: Walmart y faltantes de Paiz

- Las listas de productos se bajan con `scripts/sitemap-urls.mjs`: 18,684 páginas en Paiz, 15,400 en La Torre y 40,377 en Walmart. Walmart comparte el catálogo con Paiz (mismas rutas), pero sus precios son propios.
- Se agregaron alternativas en Paiz para lo que estaba agotado o sin mapear. Faltantes de Paiz para las 30 recetas: de 15 a 7.
- **Siguen sin precio en línea en ninguna de las tres tiendas:** miltomate, chipilín fresco, tusa y hierba mora. Son productos de mercado; se registran con "Mi precio" o anotando lo pagado.
- **Agotados en línea en Paiz y Walmart:** ajo, lechuga y mango (precio 0, existencia 0).
- **Excluidos por no tener una conversión justificada:** el elote "en bolsa" (sin cantidad), el ajo en red de 3 unidades y la lechuga romana de 227 g (la receta pide lechugas enteras).
- Las revisiones manuales de carne molida, tomate, zanahoria y queso fresco aplican también a Walmart, porque es la misma ficha.
- La página de harina Maseca de Paiz dejó de publicar datos de producto; la harina de maíz sigue cubierta por otra marca.
- Cambios de precio respecto de la primera captura: `data/capturas/cambios.md`.

### Captura del 2026-10-29

- Productos elegidos a mano desde los **sitemaps** que cada sitio declara en su robots.txt (17,895 URLs en Paiz y 15,397 en La Torre). No se usaron páginas de búsqueda.
- 120 páginas, una cada 3 s. Script: `scripts/snapshot-prices.mjs`; lista: `src/data/product-urls.json`; resultado: `src/data/real-prices.js`; datos crudos: `data/capturas/ultima-captura.json`.
- **Aceptados: 94. Excluidos: 25**, cada uno con su motivo en la app (Precios → "productos no se cargaron y por qué"):
  - **Peso variable (6):** carnes de La Torre ("bandeja peso máximo 1.25 lb") y cebolla ("3 lb aprox."). El cobro real depende del peso, así que no se pueden tratar como empaque fijo.
  - **No disponibles en línea (6):** productos de Paiz (limón, banano, mango, ajo, canela y un consomé) aparecen con precio 0 y existencia 0.
  - **Sin tamaño publicado (7):** varias verduras de La Torre (papa, güisquil, zanahoria, repollo, chile pimiento, papaya) y el elote de Paiz.
  - **Sin equivalencia justificada (5):** repollo y ajo por unidad, y tortillas o tostadas vendidas por gramos para recetas que piden unidades.
  - **Error de lectura (1):** una página de azúcar de La Torre no publicó datos estructurados; se usó otra marca.
- **13 productos de La Torre aparecen "agotados"** sin tienda elegida (leche, tomate, aguacate, cilantro, entre otros). Se guardan como agotados y no se usan para cotizar. Puede que la existencia dependa de la sucursal; no se verificó.
- **Revisión manual (4 casos, documentados en `src/data/price-reviews.json`):** carne molida (la ficha decía "15 g" por el 15 % de grasa), tomate (la ficha decía 1 kg y el nombre libra), zanahoria y queso fresco (el nombre dice 350 g y la ficha 370 g; se usa 350 g para no subestimar el costo).
- **Un producto se retiró** del mapa por estar mal elegido: "Plátano Maduro Pro" de 70.9 g no es plátano fresco.

### Límites que siguen

- Los precios son de la tienda **en línea**, sin sucursal. No se verificó si coinciden con las tiendas de Chiquimula.
- Términos de uso de los sitios: no se encontró una política que prohíba la consulta de páginas públicas, pero tampoco una autorización explícita. El método es de bajo volumen y respeta robots.txt.
- Hay que volver a capturar periódicamente; la app muestra la fecha de cada precio.

---

## Resultado inicial (2026-10-19)

Ninguna conexión automática quedó comprobada en esa fecha: la red del entorno bloqueaba los cuatro dominios.

| Cadena | Sitio | Qué se pudo comprobar | Acceso en vivo desde este entorno |
|---|---|---|---|
| Paiz | https://www.paiz.com.gt/ | El buscador indexa páginas de producto (`/…/p`) y de categoría con nombre, presentación en el nombre y precio en quetzales. | Bloqueado: la política de red del entorno respondió 403 al conectar. |
| La Torre | https://www.latorre.com.gt/ | Páginas de producto con código (`/…-2010451/p`), páginas de marca y categoría; algunos productos aparecen como agotados. | Bloqueado (403). |
| Walmart | https://www.walmart.com.gt/ | Páginas de producto y categoría con el mismo patrón de URL que Paiz y Maxi Despensa. | Bloqueado (403). |
| Maxi Despensa | https://www.maxidespensa.com.gt/ | Páginas de producto y categoría indexadas; algunas con precio rebajado. | Bloqueado (403). |

Salida literal de la comprobación: [`verificacion-fuentes-2026-10-19.txt`](verificacion-fuentes-2026-10-19.txt).

### Actualización 2026-10-29: robots.txt

Con el conector Firecrawl (consulta en vivo, `maxAge: 0`) se obtuvieron dos robots.txt. Copias en `test/fixtures/robots/`.

| Sitio | Resultado | Lo relevante |
|---|---|---|
| La Torre | Leído (HTTP 200) | Permite las páginas de producto (`/…/p`). Prohíbe `/busca/*` (búsqueda), `/checkout/*`, `/account/*`, `/login/*`, `/quick-view/*`, `/img/*`. Su `Sitemap` apunta a un dominio de plantilla (`lojavazia.com.br`), lo que sugiere una plataforma de comercio estándar sin personalizar ese archivo. |
| Maxi Despensa | Leído (HTTP 200) | Permite las páginas de producto. Prohíbe `/checkout/`, `/account/`, `/login/*`, `/quick-view/*`, `/404` y URLs con `returnUrl`. Declara los sitemaps de Walmart, Maxi Despensa y Paiz: parece un robots.txt compartido por los tres sitios, pero no se confirmó en Paiz ni en Walmart. |
| Paiz | Leído después de permitir el dominio | Igual al de Maxi Despensa: los tres sitios de Walmart comparten robots.txt. |
| Walmart | Leído después de permitir el dominio | Igual al de Maxi Despensa. |

Conclusión: el método elegido (una página de producto a la vez) es compatible con lo que permiten los robots.txt leídos; las búsquedas (`/busca/`) no deben usarse. Siguen sin verificarse los términos de uso, el precio por sucursal y la presencia de datos estructurados en las páginas de producto.

La forma correcta de avanzar es permitir los cuatro dominios en la configuración de red del entorno (Ajustes del entorno → Acceso de red → dominios permitidos) y ejecutar `scripts/check-sources.mjs`.

### Qué no se pudo comprobar

- robots.txt de Paiz y Walmart, y términos de uso de los cuatro sitios.
- Si los precios publicados dependen de una sucursal o zona elegida, y cómo se elige.
- Si existe una integración documentada o un catálogo autorizado para terceros. No se encontró ninguna en búsquedas públicas; no se supone que exista una API pública.
- Disponibilidad en tiendas de Chiquimula.

### Por qué no se usaron los precios que muestra el buscador

Los resultados del buscador incluyen precios (por ejemplo de arroz), pero son fragmentos indexados sin fecha de consulta ni sucursal. No son precios vigentes y no se cargaron en la app.

## Cadenas iniciales elegidas: Paiz y La Torre

- Son operadores distintos (Walmart de México y Centroamérica / Unisuper), así que la comparación tiene sentido.
- Ambas publican, en sus páginas de producto indexadas, nombre con presentación, precio y marca de agotado: los campos que necesita el cálculo.
- Walmart y Maxi Despensa comparten patrón de URL con Paiz; el mismo método de consulta les sirve. Quedan disponibles como tiendas seleccionables.

Esta elección se basa en lo que se ve en el índice público, no en una prueba en vivo. Hay que repetir la comprobación con red permitida.

## Método implementado (pendiente de verificar en vivo)

`server/server.mjs` → `POST /api/prices/lookup` con la URL de **una** página de producto que indica la persona:

1. Solo acepta `https://` de los cuatro dominios configurados.
2. Lee `robots.txt`; si no puede leerlo o no permite la ruta, no consulta.
3. Máximo una petición cada 3 s por sitio, con User-Agent identificable.
4. Extrae solo datos estructurados `schema.org/Product` (JSON-LD): nombre, marca, precio en GTQ, disponibilidad. Si la página no los publica, devuelve error y no infiere nada.
5. La presentación se detecta en el nombre y la persona la confirma antes de guardar.
6. Se guarda con canal "online", URL, fecha y hora, y la nota "la página no indica sucursal".

No usa endpoints internos de la plataforma de comercio, no hace búsquedas masivas, no usa intermediarios para eludir CORS y no elude bloqueos.

Para probarlo con red permitida:

```bash
NODE_USE_ENV_PROXY=1 node scripts/check-sources.mjs https://www.paiz.com.gt/<producto>/p
```

## Alternativa que funciona hoy

"Mi precio": carga manual con producto, marca, presentación, precio, lugar o sucursal, disponibilidad y fecha. Esos precios se pueden asignar a Paiz, La Torre, Walmart, Maxi Despensa o a "Mercado u otro lugar".
