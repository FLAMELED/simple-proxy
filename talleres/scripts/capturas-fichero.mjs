// Capturas reales de «Mi fichero» para las presentaciones (docs/presentaciones/capturas/).
// Recorre el caso del taller con datos ficticios y comprueba cada paso.
import { chromium } from '../tests/e2e/pw.mjs';
import { serve } from './serve.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const OUT = new URL('../docs/presentaciones/capturas/', import.meta.url).pathname;
const s = await serve(0); const URL_APP = `http://127.0.0.1:${s.address().port}/fichero/`;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true, locale: 'es-GT' });
const page = await ctx.newPage(); page.setDefaultTimeout(8000);
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
const shot = async (name, sel) => { if (sel) await page.locator(sel).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(250); await page.screenshot({ path: join(OUT, `fichero-${name}.png`) }); };
const hideToast = () => page.addStyleTag({ content: '#toast{display:none!important}' }).then((h) => h);
const fill = (label, v) => page.locator(`.m-row:has(label.label:text-is("${label}")) input.num`).fill(v);
const sid = () => page.evaluate(() => location.hash.split('/')[2].split('?')[0]);

await page.goto(URL_APP); await page.waitForSelector('html[data-ready]');
await hideToast(); // los avisos se muestran solo en la captura de la recuperación
// Ajustes: nombre del negocio ficticio
await page.goto(URL_APP + '#/copias'); await page.fill('input[name="business"]', 'Entre Hilos · Cortinas'); await page.waitForTimeout(700);
await page.goto(URL_APP + '#/'); await shot('01-inicio');

// Proyecto de práctica
await page.click('text=+ Nuevo proyecto');
await page.fill('input[name="clientName"]', 'Lucía Ramírez');
await page.fill('input[name="name"]', 'Cortinas sala y comedor');
await page.fill('input[name="place"]', 'Mixco, zona 1 (ficticio)');
await page.check('input[name="practice"]');
await shot('02-nuevo-proyecto', 'input[name="practice"]');
await page.click('button:has-text("Crear proyecto")'); await page.waitForSelector('h1:has-text("Cortinas sala y comedor")');
await page.click('text=+ Nueva ficha'); await page.fill('input[name="title"]', 'Ventana sala');
await shot('03-nueva-ficha');
await page.click('button:has-text("Crear y completar")'); await page.waitForSelector('.savebar');
await fill('Ancho de ventana', '180'); await fill('Alto de ventana', '150'); await fill('Ancho del riel o barra', '220'); await fill('Alto del riel al piso', '250'); await fill('Del techo al riel', '10'); await fill('Paños', '2');
await shot('04-medidas', '.m-row');
// número ambiguo
await fill('Ancho del riel o barra', '2.200'); await page.waitForSelector('.err:not([hidden])');
await shot('05-numero-ambiguo', '.m-row:has(label.label:text-is("Ancho del riel o barra"))');
await fill('Ancho del riel o barra', '220');
for (const c of ['Ondas', 'Blackout', 'Dobladillo 10 cm']) await page.click(`.chip:has-text("${c}")`);
await page.locator('[data-k="s-value"]').nth(1).fill('Lino crudo'); await page.locator('[data-k="s-value"]').nth(2).fill('Crudo natural');
await shot('06-especificaciones', '.chip:has-text("Ondas")');
// foto de referencia: textura dibujada en el navegador (no es foto real de un cliente)
const dataUrl = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 1200; c.height = 900; const g = c.getContext('2d'); g.fillStyle = '#e4d9c2'; g.fillRect(0, 0, 1200, 900); for (let y = 0; y < 900; y += 5) { g.fillStyle = `rgba(110,90,60,${0.05 + (y % 15) / 150})`; g.fillRect(0, y, 1200, 2); } for (let x = 0; x < 1200; x += 6) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, 0, 2, 900); } g.fillStyle = 'rgba(20,20,20,.75)'; g.fillRect(0, 800, 1200, 100); g.fillStyle = '#fff'; g.font = 'bold 42px sans-serif'; g.fillText('Muestra de tela (imagen de ejemplo)', 36, 864); return c.toDataURL('image/jpeg', .9); });
const tmp = mkdtempSync(join(tmpdir(), 'cap-')); const img = join(tmp, 'muestra-lino.jpg'); writeFileSync(img, Buffer.from(dataUrl.split(',')[1], 'base64'));
await page.locator('[data-photo-input]').last().setInputFiles(img); await page.waitForSelector('.pe-item img[src^="blob:"]');
await page.locator('[data-k="p-caption"]').fill('Muestra de lino elegida');
await page.fill('[data-k="notes"]', 'El riel nuevo lo instala la clienta antes de la entrega.');
await shot('07-fotos', '.pe-item');
await page.click('button:has-text("Guardar versión 1")'); await page.waitForSelector('text=versión 1 de 1');
const sala = await sid();
await shot('09-ficha');
await page.locator('h2:has-text("Medidas")').scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -60)); await page.waitForTimeout(200); await page.screenshot({ path: join(OUT, 'fichero-10-ficha-medidas.png') });

// Comedor
await page.click('.bar a'); await page.click('text=+ Nueva ficha'); await page.fill('input[name="title"]', 'Ventana comedor'); await page.click('button:has-text("Crear y completar")'); await page.waitForSelector('.savebar');
await fill('Ancho de ventana', '120'); await fill('Alto de ventana', '140'); await fill('Ancho del riel o barra', '160'); await fill('Alto del riel al piso', '240'); await fill('Paños', '1');
for (const c of ['Ondas', 'Forro común', 'Dobladillo 10 cm', 'A la izquierda']) await page.click(`.chip:has-text("${c}")`);
await page.locator('[data-k="s-value"]').nth(1).fill('Lino crudo'); await page.locator('[data-k="s-value"]').nth(2).fill('Crudo natural');
await page.click('button:has-text("Guardar versión 1")'); await page.waitForSelector('dialog .dlg-title:has-text("Falta una medida")');
await shot('08-faltan-datos');
await page.click('dialog button:has-text("Guardar con datos faltantes")'); await page.waitForSelector('text=versión 1 de 1');
await page.locator('h2:has-text("Medidas")').scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -60)); await page.waitForTimeout(200); await page.screenshot({ path: join(OUT, 'fichero-10b-comedor-sin-dato.png') });
const comedor = await sid();

// Corrección sala 180 → 182
await page.goto(`${URL_APP}#/editar/${sala}`); await page.waitForSelector('.savebar');
await fill('Ancho de ventana', '182'); await page.fill('input[name="note"]', 'Se volvió a medir el ancho en la visita');
await page.locator('input[name="note"]').scrollIntoViewIfNeeded(); await page.waitForTimeout(200); await page.screenshot({ path: join(OUT, 'fichero-11-correccion.png') });
await page.click('button:has-text("Guardar versión 2")'); await page.waitForSelector('text=versión 2 de 2');
await page.click('text=Historial (2 versiones)'); await page.waitForSelector('.timeline');
assert.match(await page.locator('.timeline').innerText(), /180 cm → 182 cm/);
await shot('12-historial');

// Hoja de trabajo del proyecto
await page.goto(`${URL_APP}#/ficha/${sala}`); await page.waitForSelector('.crumbs');
await page.click('.crumbs a >> nth=1'); await page.click('text=Hoja de trabajo del proyecto'); await page.waitForSelector('.ws');
await page.waitForFunction(() => [...document.querySelectorAll('.ws img')].every((i) => i.complete && i.naturalWidth > 0));
await shot('13-hoja');
const ws = await ctx.newPage(); await ws.setViewportSize({ width: 800, height: 1130 }); // vista de la hoja en tamaño carta para la diapositiva
await ws.goto(page.url()); await ws.waitForSelector('html[data-ready]'); await ws.waitForSelector('.ws'); await ws.emulateMedia({ media: 'print' }); await ws.waitForTimeout(400);
await ws.locator('.ws').screenshot({ path: join(OUT, 'fichero-14-hoja-impresa.png') }); await ws.close();

// Búsqueda
await page.goto(URL_APP + '#/'); await page.fill('#q', 'lucia comedor'); await page.waitForSelector('#results a');
await shot('15-busqueda');

// Plantillas
await page.goto(URL_APP + '#/plantilla/tpl-tapiceria'); await page.waitForSelector('.tpl-row'); await shot('16-plantilla');

// Copias: guardar (incluyendo práctica), borrar una ficha y recuperarla
await page.goto(URL_APP + '#/copias'); await page.check('[data-include-demo]');
await shot('17-copias');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Guardar una copia")')]);
const copia = join(tmp, 'copia.zip'); await dl.saveAs(copia);
await page.goto(`${URL_APP}#/ficha/${comedor}`); await page.click('button:has-text("Eliminar ficha")'); await page.click('dialog button:has-text("Eliminar")'); await page.waitForSelector('h1:has-text("Cortinas sala y comedor")');
assert.equal(await page.locator('a.row:has-text("Ventana comedor")').count(), 0);
await page.goto(URL_APP + '#/copias'); await page.locator('[data-restore-input]').setInputFiles(copia);
await page.waitForSelector('dialog:has-text("Agregar lo nuevo")'); await shot('18-recuperar');
await page.evaluate(() => document.querySelectorAll('style').forEach((st) => { if (st.textContent.includes('#toast{display:none')) st.remove(); }));
await page.click('dialog button:has-text("Agregar lo nuevo")'); await page.waitForSelector('.toast:has-text("se agregaron 1 ficha")'); await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, 'fichero-18b-recuperada-aviso.png') });
await page.goto(`${URL_APP}#/ficha/${comedor}`); await page.waitForSelector('text=versión 1 de 1');
await shot('19-ficha-recuperada');
// Copia sin ejemplo: no incluye la práctica
await page.goto(URL_APP + '#/');
await shot('20-inicio-con-proyecto');
assert.deepEqual(errs, []);
await b.close(); s.close();
console.log('capturas de fichero listas; respaldo y recuperación comprobados');
