// Cadenas reales: sin precios precargados. Su estado de acceso refleja la
// investigación hecha el 2026-10-19 (ver docs/INVESTIGACION-PRECIOS.md).
// Tiendas de ejemplo: ficticias, solo para probar la app.

export const RESEARCH_DATE = '2026-10-19';

export const REAL_STORES = [
  {
    id: 'paiz', name: 'Paiz', group: 'Walmart de México y Centroamérica', site: 'https://www.paiz.com.gt/',
    initial: true,
    access: 'verificado',
    accessNote:
      'Consulta verificada el 2026-10-29: las páginas de producto publican nombre, marca, precio en GTQ, disponibilidad y tamaño (en el nombre o en la ficha). robots.txt permite páginas de producto. Precio leído sin elegir tienda. No hay API documentada para terceros.',
  },
  {
    id: 'la-torre', name: 'La Torre', group: 'Unisuper', site: 'https://www.latorre.com.gt/',
    initial: true,
    access: 'verificado',
    accessNote:
      'Consulta verificada el 2026-10-29: precio, marca y disponibilidad estructurados; el tamaño suele estar en la ficha ("Contenido Neto"). Carnes y algunas verduras son de peso variable ("peso máximo"), y el sitio permite elegir tienda. robots.txt permite páginas de producto y prohíbe la búsqueda.',
  },
  {
    id: 'walmart', name: 'Walmart', group: 'Walmart de México y Centroamérica', site: 'https://www.walmart.com.gt/',
    access: 'verificado',
    accessNote: 'Consulta verificada el 2026-10-29 con una página de producto (mismo formato que Paiz). Sin precios guardados todavía: usa la consulta por página o "Mi precio".',
  },
  {
    id: 'maxi-despensa', name: 'Maxi Despensa', group: 'Walmart de México y Centroamérica', site: 'https://www.maxidespensa.com.gt/',
    access: 'parcial',
    accessNote: 'El sitio responde y robots.txt permite páginas de producto, pero el producto probado el 2026-10-29 aparecía sin precio ni existencia en línea. Sin precios guardados.',
  },
];

export const SAMPLE_STORES = [
  { id: 'ejemplo-a', name: 'Súper Ejemplo A', sample: true },
  { id: 'ejemplo-b', name: 'Súper Ejemplo B', sample: true },
];

export const MY_PRICES_STORE = { id: 'mis-precios', name: 'Mis precios', user: true };

export const ALL_STORES = [...SAMPLE_STORES, ...REAL_STORES, MY_PRICES_STORE];
export const STORE_BY_ID = Object.fromEntries(ALL_STORES.map((s) => [s.id, s]));

export const DEPARTAMENTOS = [
  'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso', 'Escuintla', 'Guatemala',
  'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa', 'Petén', 'Quetzaltenango', 'Quiché', 'Retalhuleu',
  'Sacatepéquez', 'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa',
];
