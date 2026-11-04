// Capturas reales de «Mi plan de cortes» para las presentaciones, con datos ficticios.
import { chromium } from '../tests/e2e/pw.mjs';
import { serve } from './serve.mjs';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const OUT = new URL('../docs/presentaciones/capturas/', import.meta.url).pathname;
const s = await serve(0); const URL_APP = `http://127.0.0.1:${s.address().port}/cortes/`;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true, locale: 'es-GT' });
// Los avisos flotantes se ocultan en las capturas (se recargan las páginas, por eso va en cada carga).
await ctx.addInitScript(() => { if (!window.__conAvisos) document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '#toast{display:none!important}'; document.head.appendChild(st); }); });
const page = await ctx.newPage(); page.setDefaultTimeout(8000);
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
const shot = async (name, sel, dy = 0) => { if (sel) { await page.locator(sel).first().scrollIntoViewIfNeeded(); if (dy) await page.evaluate((d) => window.scrollBy(0, d), dy); } await page.waitForTimeout(250); await page.screenshot({ path: join(OUT, `cortes-${name}.png`) }); };
const elShot = async (name, sel) => { await page.locator(sel).first().screenshot({ path: join(OUT, `cortes-${name}.png`) }); };
const num = (scope, label) => scope.locator(`label.field:has(.label:text-matches("^${label}"))`).locator('input.num').first();
const pid = () => page.evaluate(() => location.hash.split('/')[2]);

await page.goto(URL_APP); await page.waitForSelector('html[data-ready]');

await shot('01-inicio');
await page.click('button:has-text("Cargar el ejemplo")'); await page.waitForSelector('.piece');
const demo = await pid();
await shot('02-material', '.kicker:has-text("Material")', -10);
await shot('03-piezas', '.piece', -40);
await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.plan-svg');
assert.match(await page.locator('.stats').innerText(), /23\s*de 23/);
await shot('04-plano-resumen');
await shot('05-plancha1', '.sheet', -60);
await elShot('06-svg-plancha1', '.sheet >> nth=0 >> .plan-svg');
await elShot('07-svg-plancha2', '.sheet >> nth=1 >> .plan-svg');
await shot('08-leyenda', '.legend', -20);
await page.click('button[aria-label="Acercar"]'); await page.click('button[aria-label="Acercar"]');
await shot('09-zoom', '.sheet', -60);
await page.click('button:has-text("Ajustar")');
await shot('10-como-se-calculo', '.method', -20);

// Prueba: 1 plancha
await page.goto(`${URL_APP}#/proyecto/${demo}`); await num(page, 'Planchas').fill('1'); await page.waitForTimeout(600);
await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.alert');
assert.match(await page.locator('.alert').innerText(), /D1, D2, D3 · Fondo de cuadro/);
await shot('11-una-plancha');
// Prueba: panel 75 × 50 no girar
await page.goto(`${URL_APP}#/proyecto/${demo}`); await num(page, 'Planchas').fill('2');
await page.click('button:has-text("+ Agregar pieza")');
const e = page.locator('.piece').nth(4);
await e.locator('[data-pt="label"]').fill('Panel de exhibición'); await num(e, 'Ancho').fill('75'); await num(e, 'Largo').fill('50'); await e.locator('[data-pt="rotate"]').uncheck();
await page.waitForTimeout(600);
await shot('12-pieza-no-girar', '.piece >> nth=4', -20);
await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.alert');
assert.match(await page.locator('.alert').innerText(), /E1 · Panel de exhibición \(75 × 50 cm\): No cabe en esa orientación/);
await shot('13-no-cabe');
await page.goto(`${URL_APP}#/proyecto/${demo}`); await page.locator('.piece').nth(4).locator('[data-pt="rotate"]').check(); await page.waitForTimeout(600);
await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.okline:has-text("Todas las piezas")');
await elShot('14-svg-girada', '.sheet >> nth=0 >> .plan-svg');
// Quitar el panel: el ejemplo vuelve a su estado
await page.goto(`${URL_APP}#/proyecto/${demo}`); await page.locator('.piece').nth(4).locator('button:has-text("Quitar pieza")').click(); await page.click('dialog button:has-text("Quitar")'); await page.waitForTimeout(500);

// Ejercicio: cajitas de recuerdo (proyecto de práctica)
await page.goto(URL_APP); await page.click('button:has-text("+ Nuevo proyecto")'); await page.waitForSelector('.piece');
const ej = await pid();
await page.click('button:has-text("Generar plano")'); await page.waitForSelector('dialog:has-text("Faltan datos")');
await shot('15-faltan-datos');
await page.click('dialog button:has-text("Entendido")');
await page.fill('[data-t="name"]', 'Cajitas de recuerdo · 12 unidades'); await page.check('[data-t="demo"]');
await page.fill('[data-t="material.name"]', 'Cartón gris 2 mm');
await num(page, 'Ancho').fill('70'); await num(page, 'Largo').fill('100'); await num(page, 'Separación').fill('0,2'); await num(page, 'Margen').fill('0,5');
const rows = [['Base', '10', '10', '12', true], ['Lateral largo', '10', '5', '24', true], ['Lateral corto', '9,6', '5', '24', true], ['Tapa', '10,4', '10,4', '12', true]];
for (let i = 0; i < rows.length; i++) {
  if (i) await page.click('button:has-text("+ Agregar pieza")');
  const r = page.locator('.piece').nth(i); const [l, w, h, q] = rows[i];
  await r.locator('[data-pt="label"]').fill(l); await num(r, 'Ancho').fill(w); await num(r, 'Largo').fill(h); await num(r, 'Cantidad').fill(q);
}
await page.waitForTimeout(600);
await shot('16-ejercicio-piezas', '.piece >> nth=2', -40);
await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.okline:has-text("Todas las piezas")');
assert.match(await page.locator('.stats').innerText(), /72\s*de 72[\s\S]*1\s*de 1[\s\S]*69\.3/);
await shot('17-ejercicio-plano');
await elShot('18-svg-ejercicio', '.sheet >> nth=0 >> .plan-svg');
// Reto: bandeja 40 × 60 sin girar
await page.goto(`${URL_APP}#/proyecto/${ej}`); await page.click('button:has-text("+ Agregar pieza")');
const t = page.locator('.piece').nth(4); await t.locator('[data-pt="label"]').fill('Bandeja exhibidora'); await num(t, 'Ancho').fill('40'); await num(t, 'Largo').fill('60'); await t.locator('[data-pt="rotate"]').uncheck(); await page.waitForTimeout(600);
await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.alert');
assert.match(await page.locator('.stats').innerText(), /48\s*de 73/);
await shot('19-bandeja-pendientes');
await page.goto(`${URL_APP}#/proyecto/${ej}`); await num(page, 'Planchas').fill('2'); await page.waitForTimeout(600);
await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.okline:has-text("Todas las piezas")');
assert.match(await page.locator('.stats').innerText(), /73\s*de 73[\s\S]*2\s*de 2/);
await shot('20-bandeja-dos-planchas');
await elShot('21-svg-bandeja-p2', '.sheet >> nth=1 >> .plan-svg');

// Respaldo: guardar (con ejemplo y práctica), eliminar el ejercicio, recuperar
await page.goto(URL_APP + '#/copias'); await page.check('[data-include-demo]'); await shot('22-copias');
const tmp = mkdtempSync(join(tmpdir(), 'capc-'));
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Guardar una copia")')]);
const copia = join(tmp, 'copia.zip'); await dl.saveAs(copia);
await page.goto(`${URL_APP}#/proyecto/${ej}`); await page.click('button:has-text("Eliminar proyecto")'); await page.click('dialog button:has-text("Eliminar")'); await page.waitForSelector('.masthead');
assert.equal(await page.locator('a.row:has-text("Cajitas")').count(), 0);
await page.goto(URL_APP + '#/copias'); await page.locator('[data-restore-input]').setInputFiles(copia);
await page.waitForSelector('dialog:has-text("Agregar lo nuevo")'); await shot('23-recuperar');
await page.evaluate(() => document.querySelectorAll('style').forEach((st) => { if (st.textContent.includes('#toast{display:none')) st.remove(); }));
await page.click('dialog button:has-text("Agregar lo nuevo")'); await page.waitForSelector('.toast:has-text("se agregaron 1 proyecto")'); await page.waitForTimeout(300);
await page.goto(URL_APP); await page.waitForSelector('a.row:has-text("Cajitas")'); await shot('24-recuperado');
await page.goto(`${URL_APP}#/plano/${ej}`); await page.waitForSelector('.okline:has-text("Todas las piezas")');
await shot('25-metodo-pantalla'); // plano recuperado
await page.goto(URL_APP + '#/metodo'); await shot('26-metodo');
assert.deepEqual(errs, []);
await b.close(); s.close();
console.log('capturas de cortes listas; respaldo y recuperación comprobados');
