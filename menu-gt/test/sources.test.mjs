// Pruebas de la capa de precios con datos sintéticos (sin red).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isAllowed } from '../server/sources/robots.mjs';
import { extractProduct, parsePresentation } from '../server/sources/product-page.mjs';
import { sourceForUrl, USER_AGENT } from '../server/sources/registry.mjs';

test('robots.txt: reglas más específicas y comodines', () => {
  const robots = 'User-agent: *\nDisallow: /checkout\nDisallow: /*?map=\nAllow: /checkout/ayuda\n\nUser-agent: OtroBot\nDisallow: /';
  assert.equal(isAllowed(robots, USER_AGENT, '/arroz-blanco-1kg/p'), true);
  assert.equal(isAllowed(robots, USER_AGENT, '/checkout/cart'), false);
  assert.equal(isAllowed(robots, USER_AGENT, '/checkout/ayuda'), true);
  assert.equal(isAllowed(robots, USER_AGENT, '/abarrotes?map=c'), false);
  assert.equal(isAllowed(robots, 'OtroBot/1.0', '/arroz/p'), false);
  assert.equal(isAllowed('', USER_AGENT, '/x'), true);
});

test('solo se aceptan páginas https de los supermercados configurados', () => {
  assert.equal(sourceForUrl('https://www.paiz.com.gt/arroz/p').source.storeId, 'paiz');
  assert.equal(sourceForUrl('https://www.latorre.com.gt/arroz/p').source.storeId, 'la-torre');
  assert.match(sourceForUrl('http://www.paiz.com.gt/arroz/p').error, /https/);
  assert.match(sourceForUrl('https://paiz.com.gt.ejemplo.com/x').error, /no pertenece/);
  assert.match(sourceForUrl('nada').error, /válida/);
});

test('extrae producto, precio exacto, presentación y agotado desde JSON-LD (fixture sintético)', async () => {
  const html = await readFile(new URL('./fixtures/producto-sintetico.html', import.meta.url), 'utf8');
  const r = extractProduct(html, 'https://www.paiz.com.gt/x/p', '2026-10-19T12:00:00Z');
  assert.equal(r.ok, true);
  assert.equal(r.record.priceCents, 1725);
  assert.equal(r.record.brand, 'Prueba');
  assert.deepEqual([r.record.presentation.packQty, r.record.presentation.packUnit], [1000, 'g']);
  assert.equal(r.record.availability, 'agotado');
  assert.equal(r.record.branch, null);
  assert.match(r.record.branchNote, /no indica sucursal/);
});

test('sin precio estructurado no se inventa un precio', () => {
  const r = extractProduct('<html><body>Arroz Q12.00</body></html>', 'https://www.paiz.com.gt/x/p', 'x');
  assert.equal(r.ok, false);
  const r2 = extractProduct('<script type="application/ld+json">{"@type":"Product","name":"X"}</script>', 'u', 'x');
  assert.equal(r2.ok, false);
});

test('presentaciones comunes en nombres de producto', () => {
  assert.deepEqual(parsePresentation('Arroz Molinero Basmati 1 Kilo'), { packQty: 1, packUnit: 'kg', detectedFrom: '1 kilo' });
  assert.equal(parsePresentation('Arroz Tierra Noble Blanco Empaque - 10 Libras').packUnit, 'lb');
  assert.equal(parsePresentation('Arroz Suli Precocido 4536 g').packQty, 4536);
  assert.equal(parsePresentation('Aceite 946 ml').packUnit, 'ml');
  assert.equal(parsePresentation('Producto sin tamaño'), null);
});

test('robots.txt reales (2026-10-29): páginas de producto permitidas, búsqueda y cuenta no', async () => {
  const latorre = await readFile(new URL('./fixtures/robots/latorre-2026-10-29.txt', import.meta.url), 'utf8');
  const maxi = await readFile(new URL('./fixtures/robots/maxidespensa-2026-10-29.txt', import.meta.url), 'utf8');
  assert.equal(isAllowed(latorre, USER_AGENT, '/arroz-precocido-gallo-dorado-2010451/p'), true);
  assert.equal(isAllowed(latorre, USER_AGENT, '/busca/?ft=arroz'), false);
  assert.equal(isAllowed(latorre, USER_AGENT, '/checkout/cart'), false);
  assert.equal(isAllowed(maxi, USER_AGENT, '/arroz-gallo-dorado-precocido-400gr/p'), true);
  assert.equal(isAllowed(maxi, USER_AGENT, '/abarrotes?page=2&returnUrl=/x'), false);
  assert.equal(isAllowed(maxi, USER_AGENT, '/account/orders'), false);
});

import { classify } from '../scripts/snapshot-prices.mjs';
import { embeddedDetails, allPresentations } from '../server/sources/product-page.mjs';
import { INGREDIENTS } from '../src/data/ingredients.js';

const rec = (product, spec = null) => ({ product, presentationFromSpec: spec });

test('captura: solo se aceptan presentaciones inequívocas', () => {
  // Peso variable: se excluye aunque tenga precio
  assert.equal(classify(rec('Muslos Pollo Bandeja Peso Máximo 1.25Lb.'), INGREDIENTS['pollo-piezas'], 'muslos-x').reason, 'peso-variable');
  assert.equal(classify(rec('Cebolla Blanca Red'), INGREDIENTS.cebolla, 'cebolla-blanca-red-3lb--aprox--1').reason, 'peso-variable');
  // Nombre y ficha se contradicen (libra frente a 1 kg)
  const t = classify(rec('Tomate De Cocina Libra - 7 Unidades Por Lb. Aproximadamente', { packQty: 1, packUnit: 'kg', detectedFrom: '1 kg' }), INGREDIENTS.tomate, 'tomate-de-cocina-libra');
  assert.equal(t.reason, 'contradiccion');
  // Sin tamaño
  assert.equal(classify(rec('Tomate Cocina Red'), INGREDIENTS.tomate, 'tomate-cocina-red').reason, 'sin-presentacion');
  // Tamaño desde la ficha
  const a = classify(rec('Arroz Precocido Gallo Dorado', { packQty: 400, packUnit: 'g', detectedFrom: '400gr.' }), INGREDIENTS.arroz, 'arroz');
  assert.deepEqual([a.ok, a.presentation.packQty, a.presentation.packUnit], [true, 400, 'g']);
  // Se elige la medida compatible con el ingrediente: tortillas por unidad, no por gramos
  const tor = classify(rec('Tortilla Tortiamigos de Maiz 20 uds 260 g'), INGREDIENTS.tortilla, 'tortilla');
  assert.deepEqual([tor.presentation.packQty, tor.presentation.packUnit], [20, 'u']);
  // Manojo de cilantro: no se convierte a peso
  assert.equal(classify(rec('Cilantro 100 g'), INGREDIENTS.cilantro, 'cilantro').reason, 'sin-conversion');
  // Revisión manual explícita y documentada
  const ok = classify(rec('Tomate De Cocina Libra', { packQty: 1, packUnit: 'kg', detectedFrom: '1 kg' }), INGREDIENTS.tomate, 'x', { accept: { packQty: 1, packUnit: 'lb' }, reason: 'el nombre dice Libra' });
  assert.equal(ok.ok, true);
  assert.match(ok.presentation.detectedFrom, /revisión manual/);
});

test('datos incrustados: precio regular, promociones condicionadas, existencia (sintético)', () => {
  const html = '"name":"Contenido Neto","originalName":"Contenido Neto","values":{"type":"json","json":["400gr."]}' +
    '"discountHighlights":[],"teasers":[{"name":"2x1 con tarjeta"}],"Price":8.4,"ListPrice":9.9,"AvailableQuantity":0,"measurementUnit":"un","unitMultiplier":1.25';
  const d = embeddedDetails(html);
  assert.equal(d.netContent, '400gr.');
  assert.deepEqual([d.price, d.listPrice, d.conditionalPromos, d.available], ['8.4', '9.9', true, false]);
  assert.deepEqual(d.measurement, { unit: 'un', multiplier: 1.25 });
  assert.equal(allPresentations('Arroz 1 Kilo').length, 1);
});

import REAL from '../src/data/real-prices.js';
import { toBase } from '../src/engine/units.js';
import { SOURCES as SRC } from '../server/sources/registry.mjs';

test('captura real guardada: cada precio tiene origen, fecha, monto válido y presentación convertible', () => {
  assert.ok(REAL.offers.length > 0);
  const ids = new Set();
  for (const o of REAL.offers) {
    assert.ok(!ids.has(o.id), `duplicado ${o.id}`);
    ids.add(o.id);
    assert.ok(o.sourceUrl.startsWith(`${SRC[o.storeId].origin}/`), o.id);
    assert.ok(!Number.isNaN(Date.parse(o.fetchedAt)), o.id);
    assert.ok(Number.isInteger(o.priceCents) && o.priceCents > 0, o.id);
    assert.equal(o.status, 'guardado');
    assert.equal(o.channel, 'online');
    assert.equal(o.branch, null); // sucursal no conocida: se indica, no se inventa
    assert.ok(o.branchNote.length > 20);
    assert.doesNotThrow(() => toBase(o.packQty, o.packUnit, INGREDIENTS[o.ingredientId]), o.id);
    assert.ok(!/peso m[aá]ximo/i.test(o.product), `peso variable aceptado: ${o.id}`);
  }
  for (const e of REAL.excluded) assert.ok(e.reason && e.url, JSON.stringify(e));
});

test('cambios entre capturas: subidas, bajadas, agotados y quitados', async () => {
  const { diffSnapshots, diffReport } = await import('../scripts/price-diff.mjs');
  const o = (id, priceCents, availability = 'disponible') => ({ id, product: id, priceCents, availability });
  const prev = { finished: '2026-10-29T06:00:00Z', offers: [o('a', 1000), o('b', 2000), o('c', 500), o('d', 800)] };
  const next = { finished: '2026-11-05T06:00:00Z', offers: [o('a', 1100), o('b', 1800), o('c', 500, 'agotado'), o('e', 300)] };
  const ch = diffSnapshots(prev, next);
  assert.deepEqual(ch.subio.map((x) => [x.id, x.pct]), [['a', 10]]);
  assert.deepEqual(ch.bajo.map((x) => [x.id, x.pct]), [['b', -10]]);
  assert.deepEqual(ch.agotado.map((x) => x.id), ['c']);
  assert.deepEqual(ch.nuevo.map((x) => x.id), ['e']);
  assert.deepEqual(ch.quitado.map((x) => x.id), ['d']);
  assert.match(diffReport(prev, next, ch), /a: Q10\.00 → Q11\.00 \(\+10 %\)/);
  assert.match(diffReport(prev, prev, diffSnapshots(prev, prev)), /Sin cambios/);
});
