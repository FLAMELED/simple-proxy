// Fuentes de precios conocidas. Solo se consultan páginas públicas de
// producto que la persona indica, una a la vez, respetando robots.txt.
// No se usan endpoints internos ni se eluden bloqueos.

export const USER_AGENT = 'MenuGT-ConsultaPrecios/0.1 (consulta manual de una página de producto)';

export const SOURCES = {
  paiz: {
    storeId: 'paiz', name: 'Paiz', hosts: ['www.paiz.com.gt', 'paiz.com.gt'], origin: 'https://www.paiz.com.gt',
    branchNote: 'Precio de la tienda en línea, leído sin elegir tienda ni dirección de entrega. No se verificó si cambia por sucursal; puede no coincidir con la tienda física.',
  },
  'la-torre': {
    storeId: 'la-torre', name: 'La Torre', hosts: ['www.latorre.com.gt', 'latorre.com.gt'], origin: 'https://www.latorre.com.gt',
    branchNote: 'El sitio permite elegir tienda; este precio se leyó sin tienda elegida. No se verificó si cambia por sucursal; puede no coincidir con la tienda física.',
  },
  walmart: { storeId: 'walmart', name: 'Walmart', hosts: ['www.walmart.com.gt', 'walmart.com.gt'], origin: 'https://www.walmart.com.gt' },
  'maxi-despensa': { storeId: 'maxi-despensa', name: 'Maxi Despensa', hosts: ['www.maxidespensa.com.gt', 'maxidespensa.com.gt'], origin: 'https://www.maxidespensa.com.gt' },
};

export function sourceForUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: 'La dirección no es válida.' };
  }
  if (url.protocol !== 'https:') return { error: 'Solo se aceptan direcciones https.' };
  const source = Object.values(SOURCES).find((s) => s.hosts.includes(url.hostname));
  if (!source) return { error: 'La dirección no pertenece a uno de los supermercados configurados.' };
  return { source, url };
}
