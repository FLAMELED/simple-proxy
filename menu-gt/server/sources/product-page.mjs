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

/** Todas las presentaciones que aparecen en un texto, en orden de prioridad. */
export function allPresentations(name) {
  const out = [];
  let rest = String(name ?? '');
  for (let k = 0; k < 4; k++) {
    const p = parsePresentation(rest);
    if (!p) break;
    out.push(p);
    rest = rest.toLowerCase().replace(/,/g, '.').replace(p.detectedFrom, ' ');
  }
  return out;
}

/** Detecta la presentación en el nombre del producto: "1000 g", "1 Kilo", "10 Libras", "946 ml", "30 unidades". */
export function parsePresentation(name) {
  const text = name
    .toLowerCase()
    .replace(/,/g, '.')
    // "7 unidades por lb aproximadamente" describe el producto; no es el empaque
    .replace(/\d+\s*unidad(?:es)?\s+por\s+(?:lb|libra)\.?(?:\s*aproximadamente)?/g, ' ');
  const patterns = [
    [/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilogramos?)\b/, 'kg'],
    [/(\d+(?:\.\d+)?)\s*(?:g|gr|grs|gramos?)\b\.?/, 'g'],
    [/(\d+(?:\.\d+)?)\s*(?:lb|lbs|libras?)\b/, 'lb'],
    [/(\d+(?:\.\d+)?)\s*(?:oz|onzas?)\b/, 'oz'],
    [/(\d+(?:\.\d+)?)\s*(?:ml|mililitros?)\b/, 'ml'],
    [/(\d+(?:\.\d+)?)\s*(?:l|lt|lts|litros?)\b/, 'l'],
    [/(\d+(?:\.\d+)?)\s*(?:u|und|unidad(?:es)?|uds)\b/, 'u'],
  ];
  for (const [re, unit] of patterns) {
    const m = text.match(re);
    if (m) return { packQty: Number(m[1]), packUnit: unit, detectedFrom: m[0] };
  }
  // Palabras sin número: "Libra", "Manojo", "Media docena", "1 Unidad"
  const words = [
    [/\bmedia docena\b/, 6, 'u'],
    [/\bdocena\b/, 12, 'u'],
    [/\b(?:por )?libra\b/, 1, 'lb'],
    [/\bmanojo\b/, 1, 'manojo'],
    [/\bunidad\b/, 1, 'u'],
  ];
  for (const [re, qty, unit] of words) {
    const m = text.match(re);
    if (m) return { packQty: qty, packUnit: unit, detectedFrom: m[0] };
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

/**
 * Datos que la página incrusta para mostrarse (ficha técnica y oferta):
 * contenido neto, precio regular y promociones con condiciones.
 * Solo se leen campos con nombre explícito; si no están, se devuelve null.
 */
export function embeddedDetails(html) {
  const out = { netContent: null, listPrice: null, price: null, available: null, conditionalPromos: false, measurement: null };
  const spec = html.match(/"name":"(?:Contenido Neto|Tamaño \(Gramaje, Volumen\)|Contenido)",(?:"originalName":"[^"]*",)?"values":\{"type":"json","json":\["([^"]{1,40})"\]/);
  if (spec) out.netContent = spec[1];
  const offer = html.match(/"discountHighlights":(\[[^\]]*\]),"teasers":(\[[^\]]*\]),"Price":([\d.]+),"ListPrice":([\d.]+)/);
  if (offer) {
    out.price = offer[3];
    out.listPrice = offer[4];
    out.conditionalPromos = offer[1] !== '[]' || offer[2] !== '[]';
  }
  const qty = html.match(/"AvailableQuantity":(\d+)/);
  if (qty) out.available = Number(qty[1]) > 0;
  const mu = html.match(/"measurementUnit":"([^"]{1,10})","unitMultiplier":([\d.]+)/);
  if (mu) out.measurement = { unit: mu[1], multiplier: Number(mu[2]) };
  return out;
}

const ENTITIES = { '&amp;': '&', '&apos;': "'", '&#39;': "'", '&quot;': '"', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };
export const decode = (s) => String(s ?? '').replace(/&(?:amp|apos|#39|quot|lt|gt|nbsp);/g, (m) => ENTITIES[m]);

export function extractProduct(html, sourceUrl, fetchedAt) {
  let product = null;
  for (const block of jsonLdBlocks(html)) {
    product = findProduct(block);
    if (product) break;
  }
  const embedded = embeddedDetails(html);
  if (!product) {
    if (embedded.available === false && Number(embedded.price) === 0) {
      return { ok: false, unavailable: true, error: 'La página indica que el producto no está disponible en línea (precio 0, existencia 0). No hay precio que registrar.' };
    }
    return { ok: false, error: 'La página no publica datos estructurados de producto; no se extrajo ningún precio.' };
  }
  const offers = [].concat(product.offers ?? []);
  const flat = offers.flatMap((o) => (o['@type'] === 'AggregateOffer' ? [].concat(o.offers ?? o) : [o]));
  const offer = flat.find((o) => o && (o.price !== undefined || o.lowPrice !== undefined));
  if (!offer) return { ok: false, error: 'La página no publica un precio estructurado; no se extrajo ningún precio.' };
  const currency = offer.priceCurrency ?? product.offers?.priceCurrency;
  if (currency && currency !== 'GTQ') return { ok: false, error: `Moneda inesperada (${currency}).` };
  const priceCents = toCents(offer.price ?? offer.lowPrice);
  if (priceCents === null) return { ok: false, error: 'El precio publicado no tiene un formato reconocible.' };
  const availRaw = String(offer.availability ?? '').split('/').pop().toLowerCase();
  const name = decode(product.name).trim();
  const brand = decode(typeof product.brand === 'object' ? product.brand?.name : product.brand) || null;
  const fromName = parsePresentation(name);
  const fromSpec = embedded.netContent ? parsePresentation(embedded.netContent) : null;
  const listCents = embedded.listPrice ? toCents(embedded.listPrice) : null;
  const notes = [];
  if (listCents && listCents > priceCents) notes.push(`Precio regular publicado ${(listCents / 100).toFixed(2)}; el precio registrado ya es el rebajado.`);
  if (embedded.conditionalPromos) notes.push('La página muestra promociones con condiciones; no se aplicaron.');
  return {
    ok: true,
    record: {
      product: name,
      brand: brand ?? null,
      presentation: fromName ?? (fromSpec ? { ...fromSpec, detectedFrom: `ficha: ${embedded.netContent}` } : null),
      priceCents,
      regularPriceCents: listCents && listCents > priceCents ? listCents : null,
      presentationFromName: fromName,
      presentationFromSpec: fromSpec ? { ...fromSpec, detectedFrom: embedded.netContent } : null,
      measurement: embedded.measurement,
      notes,
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
