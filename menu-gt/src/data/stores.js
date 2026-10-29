// Cadenas reales: sin precios precargados. Su estado de acceso refleja la
// investigación hecha el 2026-10-19 (ver docs/INVESTIGACION-PRECIOS.md).
// Tiendas de ejemplo: ficticias, solo para probar la app.

export const RESEARCH_DATE = '2026-10-19';

export const REAL_STORES = [
  {
    id: 'paiz', name: 'Paiz', group: 'Walmart de México y Centroamérica', site: 'https://www.paiz.com.gt/',
    initial: true,
    access: 'no-verificado',
    accessNote:
      'Catálogo público con páginas de producto (nombre, presentación, precio, agotado). No se pudo abrir desde este entorno: la política de red lo bloqueó. No se encontró una API documentada para terceros.',
  },
  {
    id: 'la-torre', name: 'La Torre', group: 'Unisuper', site: 'https://www.latorre.com.gt/',
    initial: true,
    access: 'no-verificado',
    accessNote:
      'Catálogo público con páginas de producto y marca de agotado. Su robots.txt (leído el 2026-10-29) permite páginas de producto y prohíbe la búsqueda. Las páginas de producto no se pudieron abrir desde este entorno. No se encontró una API documentada para terceros.',
  },
  {
    id: 'walmart', name: 'Walmart', group: 'Walmart de México y Centroamérica', site: 'https://www.walmart.com.gt/',
    access: 'no-verificado',
    accessNote: 'Misma plataforma que Paiz y Maxi Despensa según los patrones de URL. No verificado en vivo.',
  },
  {
    id: 'maxi-despensa', name: 'Maxi Despensa', group: 'Walmart de México y Centroamérica', site: 'https://www.maxidespensa.com.gt/',
    access: 'no-verificado',
    accessNote: 'Catálogo público indexado. Su robots.txt (leído el 2026-10-29) permite páginas de producto. Las páginas de producto no se pudieron abrir desde este entorno.',
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
