// Extrae datos de una página pública de producto a partir de sus datos
// estructurados (JSON-LD schema.org/Product). Si la página no publica un
// precio estructurado, no se infiere: se devuelve un error explícito.

function* jsonLdBlocks(html) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      yield JSON.parse(m[1].trim());
    } catch {
      /* bloque inválido: se ignora */
    }
  }
}

function findProduct(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const p = findProduct(n);
      if (p) return p;
    }
    return null;
  }
  const type = [].concat(node['@type'] ?? []);
  if (type.includes('Product')) return node;
  if (node['@graph']) return findProduct(node['@graph']);
  return null;
}

const AVAIL = {
  instock: 'disponible',
  instoreonly: 'disponible',
  limitedavailability: 'disponible',
  outofstock: 'agotado',
  soldout: 'agotado',
  discontinued: 'agotado',
};

/** Detecta la presentación en el nombre del producto: "1000 g", "1 Kilo", "10 Libras", "946 ml", "30 unidades". */
export function parsePresentation(name) {
  const text = name.toLowerCase().replace(/,/g, '.');
  const patterns = [
    [/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilogramos?)\b/, 'kg'],
    [/(\d+(?:\.\d+)?)\s*(?:g|gr|grs|gramos?)\b\.?/, 'g'],
    [/(\d+(?:\.\d+)?)\s*(?:lb|lbs|libras?)\b/, 'lb'],
    [/(\d+(?:\.\d+)?)\s*(?:oz|onzas?)\b/, 'oz'],
    [/(\d+(?:\.\d+)?)\s*(?:ml|mililitros?)\b/, 'ml'],
    [/(\d+(?:\.\d+)?)\s*(?:l|lt|lts|litros?)\b/, 'l'],
    [/(\d+(?:\.\d+)?)\s*(?:u|und|unidades?|uds)\b/, 'u'],
  ];
  for (const [re, unit] of patterns) {
    const m = text.match(re);
    if (m) return { packQty: Number(m[1]), packUnit: unit, detectedFrom: m[0] };
  }
  return null;
}

/** Precio decimal a centavos sin aritmética binaria. */
function toCents(value) {
  const text = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const [w, f = ''] = text.split('.');
  const frac = (f + '00').slice(0, 3);
  return Number(w) * 100 + Math.round(Number(frac) / 10);
}

export function extractProduct(html, sourceUrl, fetchedAt) {
  let product = null;
  for (const block of jsonLdBlocks(html)) {
    product = findProduct(block);
    if (product) break;
  }
  if (!product) return { ok: false, error: 'La página no publica datos estructurados de producto; no se extrajo ningún precio.' };
  const offers = [].concat(product.offers ?? []);
  const flat = offers.flatMap((o) => (o['@type'] === 'AggregateOffer' ? [].concat(o.offers ?? o) : [o]));
  const offer = flat.find((o) => o && (o.price !== undefined || o.lowPrice !== undefined));
  if (!offer) return { ok: false, error: 'La página no publica un precio estructurado; no se extrajo ningún precio.' };
  const currency = offer.priceCurrency ?? product.offers?.priceCurrency;
  if (currency && currency !== 'GTQ') return { ok: false, error: `Moneda inesperada (${currency}).` };
  const priceCents = toCents(offer.price ?? offer.lowPrice);
  if (priceCents === null) return { ok: false, error: 'El precio publicado no tiene un formato reconocible.' };
  const availRaw = String(offer.availability ?? '').split('/').pop().toLowerCase();
  const name = String(product.name ?? '').trim();
  const brand = typeof product.brand === 'object' ? product.brand?.name : product.brand;
  return {
    ok: true,
    record: {
      product: name,
      brand: brand ?? null,
      presentation: parsePresentation(name),
      priceCents,
      isRange: offer.price === undefined && offer.lowPrice !== undefined,
      availability: AVAIL[availRaw] ?? 'desconocido',
      promotion: null, // las condiciones de promoción no vienen estructuradas; no se infieren
      channel: 'online',
      branch: null,
      branchNote: 'Precio publicado en la tienda en línea. La página no indica sucursal; puede no coincidir con una tienda física.',
      sourceUrl,
      fetchedAt,
    },
  };
}
