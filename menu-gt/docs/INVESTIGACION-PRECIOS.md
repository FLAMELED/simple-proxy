# Investigación de fuentes de precios

Fecha: 2026-10-19. Ubicación de referencia: Chiquimula.

## Resultado

**Ninguna conexión automática quedó comprobada.** Ningún precio real está cargado en la app.

| Cadena | Sitio | Qué se pudo comprobar | Acceso en vivo desde este entorno |
|---|---|---|---|
| Paiz | https://www.paiz.com.gt/ | El buscador indexa páginas de producto (`/…/p`) y de categoría con nombre, presentación en el nombre y precio en quetzales. | Bloqueado: la política de red del entorno respondió 403 al conectar. |
| La Torre | https://www.latorre.com.gt/ | Páginas de producto con código (`/…-2010451/p`), páginas de marca y categoría; algunos productos aparecen como agotados. | Bloqueado (403). |
| Walmart | https://www.walmart.com.gt/ | Páginas de producto y categoría con el mismo patrón de URL que Paiz y Maxi Despensa. | Bloqueado (403). |
| Maxi Despensa | https://www.maxidespensa.com.gt/ | Páginas de producto y categoría indexadas; algunas con precio rebajado. | Bloqueado (403). |

Salida literal de la comprobación: [`verificacion-fuentes-2026-10-19.txt`](verificacion-fuentes-2026-10-19.txt).

### Qué no se pudo comprobar

- robots.txt y términos de uso de cada sitio (no se pudieron leer).
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
