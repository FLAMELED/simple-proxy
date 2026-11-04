// Resuelve en la app real el ejercicio de tapicería del taller de Fichero y comprueba
// las respuestas de la hoja de práctica. Guarda capturas para la hoja de respuestas.
import { chromium } from '../tests/e2e/pw.mjs';
import { serve } from './serve.mjs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const OUT = new URL('../docs/presentaciones/capturas/', import.meta.url).pathname;
const s = await serve(0); const URL_APP = `http://127.0.0.1:${s.address().port}/fichero/`;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-GT' });
await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '#toast{display:none!important}'; document.head.appendChild(st); }));
const page = await ctx.newPage(); page.setDefaultTimeout(8000);
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
const fill = (label, v) => page.locator(`.m-row:has(label.label:text-is("${label}")) input.num`).fill(v);
const unit = (label, u) => page.locator(`.m-row:has(label.label:text-is("${label}")) select.unit`).selectOption(u);
const spec = (label, v) => page.locator(`.field:has(label.label:text-is("${label}")) input.input`).fill(v);
const cell = (label) => page.locator(`table.data tr:has(th:text-is("${label}")) td`).first().innerText();
const sid = () => page.evaluate(() => location.hash.split('/')[2].split('?')[0]);

await page.goto(URL_APP); await page.waitForSelector('html[data-ready]');
await page.click('text=+ Nuevo proyecto');
await page.fill('input[name="clientName"]', 'Carmen López'); await page.fill('input[name="name"]', 'Retapizar sala'); await page.fill('input[name="place"]', 'Villa Nueva (ficticio)'); await page.check('input[name="practice"]');
await page.click('button:has-text("Crear proyecto")'); await page.waitForSelector('h1:has-text("Retapizar sala")');

// Sofá
await page.click('text=+ Nueva ficha'); await page.fill('input[name="title"]', 'Sofá 2 plazas'); await page.check('input[value="tpl-tapiceria"]');
await page.click('button:has-text("Crear y completar")'); await page.waitForSelector('.savebar');
for (const [l, v] of [['Ancho total', '150'], ['Fondo total', '85'], ['Alto total', '90'], ['Alto del asiento', '45'], ['Fondo del asiento', '55'], ['Alto del respaldo', '45'], ['Grosor del cojín', '4'], ['Cojines', '3']]) await fill(l, v);
await unit('Grosor del cojín', 'in');
await page.click('.chip:has-text("Sofá")'); await spec('Tela', 'Microfibra'); await spec('Color', 'Gris oxford'); await page.click('.chip:has-text("Vivo")'); await spec('Estructura y patas', 'Revisar pata trasera izquierda (floja)');
await page.click('button:has-text("Guardar versión 1")'); await page.waitForSelector('text=versión 1 de 1'); // sin medidas faltantes: no hay aviso
const sofa = await sid();
// Sillas
await page.click('.bar a'); await page.click('text=+ Nueva ficha'); await page.fill('input[name="title"]', 'Sillas de comedor'); await page.check('input[value="tpl-tapiceria"]');
await page.click('button:has-text("Crear y completar")'); await page.waitForSelector('.savebar');
for (const [l, v] of [['Ancho total', '45'], ['Fondo total', '50'], ['Alto total', '95'], ['Alto del asiento', '47'], ['Fondo del asiento', '42']]) await fill(l, v);
await page.click('.chip:has-text("Silla de comedor")');
await page.fill('[data-k="notes"]', 'Son 4 sillas iguales. Grosor del cojín dudoso (¿2 pulg?): medir otra vez.');
await page.click('button:has-text("Guardar versión 1")'); await page.waitForSelector('dialog .dlg-title:has-text("Faltan 3 medidas")');
await page.click('dialog button:has-text("Guardar con datos faltantes")'); await page.waitForSelector('text=versión 1 de 1');
assert.match(await page.locator('h2:has-text("Medidas")').innerText(), /5 de 8 con dato/);
assert.match(await cell('Alto del respaldo'), /Sin dato/);
await page.locator('h2:has-text("Medidas")').scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -60)); await page.waitForTimeout(200);
await page.screenshot({ path: join(OUT, 'fichero-r2-sillas.png') });
// Corrección del respaldo
await page.goto(`${URL_APP}#/editar/${sofa}`); await page.waitForSelector('.savebar');
await fill('Alto del respaldo', '48'); await page.fill('input[name="note"]', 'Medida confirmada por la clienta en la segunda llamada');
await page.click('button:has-text("Guardar versión 2")'); await page.waitForSelector('text=versión 2 de 2');
assert.match(await page.locator('h2:has-text("Medidas")').innerText(), /8 de 8 con dato/);
assert.match(await cell('Ancho total'), /150\s*cm/); assert.match(await cell('Grosor del cojín'), /4\s*pulg/); assert.match(await cell('Alto del respaldo'), /48\s*cm/);
assert.match(await page.locator('table.data-text tr:has(th:text-is("Espuma")) td').innerText(), /Sin dato/);
await page.locator('h2:has-text("Medidas")').scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -60)); await page.waitForTimeout(200);
await page.screenshot({ path: join(OUT, 'fichero-r1-sofa.png') });
await page.click('text=Historial (2 versiones)'); await page.waitForSelector('.timeline');
assert.match(await page.locator('.timeline').innerText(), /Alto del respaldo: 45 cm → 48 cm/);
await page.screenshot({ path: join(OUT, 'fichero-r3-historial.png') });
// Hoja del proyecto
await page.goto(`${URL_APP}#/ficha/${sofa}`); await page.click('.crumbs a >> nth=1'); await page.click('text=Hoja de trabajo del proyecto'); await page.waitForSelector('.ws');
const ws = await page.locator('.ws').innerText();
assert.match(ws, /Carmen López \(EJEMPLO\)/); assert.match(ws, /SIN DATO — completar/); assert.match(ws, /versión 2/);
// Búsqueda
await page.goto(URL_APP); await page.fill('#q', 'carmen'); await page.waitForSelector('#results a:has-text("Retapizar sala")');
assert.deepEqual(errs, []);
await b.close(); s.close();
console.log('ejercicio de tapicería resuelto en la app: respuestas comprobadas');
