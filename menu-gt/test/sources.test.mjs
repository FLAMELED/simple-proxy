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
