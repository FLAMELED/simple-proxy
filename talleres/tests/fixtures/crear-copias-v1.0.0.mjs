// Genera, con la versión 1.0.0 guardada en tests/fixtures/v1.0.0/, copias de seguridad reales
// de ambas apps. Sirven para comprobar que la versión nueva sigue recuperándolas.
// Se ejecutó una vez (4 nov 2026) antes de las correcciones de la 1.1.0. Los datos son ficticios.
import { chromium } from '../e2e/pw.mjs';
import { serve } from '../../scripts/serve.mjs';
import { pngBuffer } from '../e2e/helpers.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const s = await serve(0, { root: join(HERE, 'v1.0.0') }); const base = `http://127.0.0.1:${s.address().port}`;
const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const page = await ctx.newPage(); page.setDefaultTimeout(8000);
const fill = (label, v) => page.locator(`.m-row:has(label.label:text-is("${label}")) input.num`).fill(v);

// ——— Fichero 1.0.0 ———
await page.goto(`${base}/fichero/`); await page.waitForSelector('html[data-ready]');
await page.click('button:has-text("Cargar el ejemplo")'); await page.waitForSelector('text=Ventana comedor');
await page.goto(`${base}/fichero/#/nuevo-proyecto`); await page.fill('input[name="clientName"]', 'Taller propio'); await page.fill('input[name="name"]', 'Sillón de prueba');
await page.click('button:has-text("Crear proyecto")'); await page.waitForSelector('h1:has-text("Sillón de prueba")');
await page.click('text=+ Nueva ficha'); await page.fill('input[name="title"]', 'Sillón'); await page.check('input[value="tpl-tapiceria"]'); await page.click('button:has-text("Crear y completar")'); await page.waitForSelector('.savebar');
await fill('Ancho total', '80'); await fill('Alto total', '0');
await page.locator('[data-photo-input]').last().setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: pngBuffer(60, 40, [20, 90, 160]) }); await page.waitForSelector('.pe-item img[src^="blob:"]');
await page.click('button:has-text("Guardar versión 1")'); await page.click('dialog button:has-text("Guardar con datos faltantes")'); await page.waitForSelector('text=versión 1 de 1');
await page.click('text=Editar ficha'); await fill('Ancho total', '82'); await page.click('button:has-text("Guardar versión 2")'); await page.click('dialog button:has-text("Guardar con datos faltantes")'); await page.waitForSelector('text=versión 2 de 2');
await page.goto(`${base}/fichero/#/copias`); await page.check('[data-include-demo]');
let [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Guardar una copia")')]);
await dl.saveAs(join(HERE, 'fichero-copia-v1.0.0.zip'));

// ——— Cortes 1.0.0 ———
await page.goto(`${base}/cortes/`); await page.waitForSelector('html[data-ready]');
await page.click('button:has-text("Cargar el ejemplo")'); await page.waitForSelector('.piece');
await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.plan-svg');
await page.goto(`${base}/cortes/`); await page.click('button:has-text("+ Nuevo proyecto")'); await page.waitForSelector('.piece');
await page.fill('[data-t="name"]', 'Repisas MDF'); await page.click('.seg-opt:has-text("milímetros")');
const num = (sc, l) => sc.locator(`label.field:has(.label:text-matches("^${l}"))`).locator('input.num').first();
await num(page, 'Ancho').fill('1220'); await num(page, 'Largo').fill('2440'); await num(page, 'Separación').fill('3'); await num(page, 'Margen').fill('10');
const pz = page.locator('.piece').first(); await pz.locator('[data-pt="label"]').fill('Repisa'); await num(pz, 'Ancho').fill('600'); await num(pz, 'Largo').fill('250'); await num(pz, 'Cantidad').fill('6');
await page.waitForTimeout(600); await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.plan-svg');
await page.goto(`${base}/cortes/#/copias`); await page.check('[data-include-demo]');
[dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Guardar una copia")')]);
await dl.saveAs(join(HERE, 'cortes-copia-v1.0.0.zip'));
await b.close(); s.close();
console.log('copias 1.0.0 creadas');
