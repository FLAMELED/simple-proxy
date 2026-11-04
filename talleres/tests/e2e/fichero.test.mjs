// Recorre el caso del taller «Entre Hilos» en un Chromium real a 390 px y 320 px.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startServer, newProfileDir, removeDir, openApp, pngBuffer, layoutChecks, closeAll } from './helpers.mjs';

let srv; let URL_APP;
const dirs = [];
before(async () => { srv = await startServer(); URL_APP = `${srv.base}/fichero/`; });
after(async () => { await closeAll(); srv.server.close(); dirs.forEach(removeDir); });
const profile = () => { const d = newProfileDir(); dirs.push(d); return d; };

async function fillMeasure(page, label, value) {
  const input = page.locator('.m-row', { has: page.locator('label', { hasText: new RegExp(`^${label}$`) }) }).locator('input.num');
  await input.fill(value);
}
async function sheetHash(page) { return page.evaluate(() => location.hash.split('/')[2].split('?')[0]); }

let backupPath; // copia guardada en la primera prueba

test('caso del taller: dos ventanas, foto, acabado, corrección, hoja e historial; sobrevive al cierre', async () => {
  const dir = profile();
  let { ctx, page, errors } = await openApp(dir, URL_APP);

  // Proyecto con cliente nuevo
  await page.click('text=+ Nuevo proyecto');
  await page.fill('input[name="clientName"]', 'Marta Gómez');
  await page.fill('input[name="name"]', 'Cortinas dos ventanas');
  await page.click('button:has-text("Crear proyecto")');
  await page.waitForSelector('h1:has-text("Cortinas dos ventanas")');

  // Ventana 1
  await page.click('text=+ Nueva ficha');
  await page.fill('input[name="title"]', 'Ventana sala');
  await page.click('button:has-text("Crear y completar")');
  await page.waitForSelector('.savebar');
  await fillMeasure(page, 'Ancho de ventana', '180');
  await fillMeasure(page, 'Alto de ventana', '150');
  await fillMeasure(page, 'Del techo al riel', '0'); // cero explícito
  await page.locator('[data-photo-input]').last().setInputFiles({ name: 'referencia.png', mimeType: 'image/png', buffer: pngBuffer() });
  await page.waitForSelector('.pe-item img[src^="blob:"]');
  await page.locator('[data-k="p-caption"]').fill('Tela de referencia');
  await page.click('.chip:has-text("Dobladillo 10 cm")');
  await page.click('button:has-text("Guardar versión 1")');
  // Faltan medidas: la app avisa y no las convierte en cero
  await page.waitForSelector('dialog .dlg-title:has-text("Faltan")');
  await page.click('dialog button:has-text("Guardar con datos faltantes")');
  await page.waitForSelector('text=versión 1 de 1');
  const salaId = await sheetHash(page);
  assert.equal(await page.locator('tr:has(th:text-is("Del techo al riel")) td').innerText(), '0 cm');
  assert.match(await page.locator('tr:has(th:text-is("Ancho del riel o barra")) td').innerText(), /Sin dato/);
  assert.match(await page.locator('tr:has(th:text-is("Acabado del dobladillo")) td').innerText(), /Dobladillo 10 cm/);

  // Ventana 2
  await page.click('.bar a');
  await page.click('text=+ Nueva ficha');
  await page.fill('input[name="title"]', 'Ventana comedor');
  await page.click('button:has-text("Crear y completar")');
  await page.waitForSelector('.savebar');
  await fillMeasure(page, 'Ancho de ventana', '120,5');
  await fillMeasure(page, 'Alto de ventana', '140');
  await page.click('button:has-text("Guardar versión 1")');
  await page.click('dialog button:has-text("Guardar con datos faltantes")');
  await page.waitForSelector('text=versión 1 de 1');
  assert.match(await page.locator('tr:has(th:text-is("Ancho de ventana")) td').innerText(), /120\.5\s*cm/);

  // Número ambiguo: se rechaza con explicación
  await page.click('text=Editar ficha');
  await fillMeasure(page, 'Ancho de ventana', '1.205');
  await page.waitForSelector('.err:not([hidden]):has-text("sin separador de miles")');
  await page.click('button:has-text("Guardar versión 2")');
  await page.waitForSelector('.toast:has-text("no es válido")');
  await page.click('button:has-text("Descartar")');
  await page.click('dialog button:has-text("Descartar")');
  await page.waitForSelector('text=versión 1 de 1');

  // Corregir una medida de la sala → versión 2
  await page.goto(`${URL_APP}#/editar/${salaId}`);
  await page.waitForSelector('.savebar');
  await fillMeasure(page, 'Ancho de ventana', '182');
  await page.fill('input[name="note"]', 'Se volvió a medir');
  await page.click('button:has-text("Guardar versión 2")');
  await page.click('dialog button:has-text("Guardar con datos faltantes")');
  await page.waitForSelector('text=versión 2 de 2');
  await page.click('text=Historial (2 versiones)');
  await page.waitForSelector('.timeline');
  const hist = await page.locator('.timeline').innerText();
  assert.match(hist, /Ancho de ventana: 180 cm → 182 cm/);
  assert.match(hist, /Se volvió a medir/);

  // Borrador: escribir sin guardar y cerrar la app
  await page.goto(`${URL_APP}#/editar/${salaId}`);
  await page.waitForSelector('.savebar');
  await page.fill('[data-k="notes"]', 'Nota sin guardar todavía');
  await page.waitForSelector('[data-draft-state]:has-text("Borrador guardado")');

  // Hoja de trabajo del proyecto
  await page.click('.tabs a[data-tab="inicio"]');
  await page.click('text=Cortinas dos ventanas');
  await page.click('text=Hoja de trabajo del proyecto');
  await page.waitForSelector('.ws');
  const ws = await page.locator('.ws').innerText();
  assert.match(ws, /Marta Gómez/);
  assert.match(ws, /Ventana sala/);
  assert.match(ws, /Ventana comedor/);
  assert.match(ws, /182/);
  assert.match(ws, /SIN DATO/);
  await page.waitForFunction(() => [...document.querySelectorAll('.ws img')].every((i) => i.complete && i.naturalWidth > 0));
  const pdf = await page.pdf({ format: 'A4' });
  assert.ok(pdf.length > 10000, 'la hoja se puede imprimir como PDF');

  // Guardar una copia (desde la hoja se vuelve con la flecha; la barra inferior no se muestra al imprimir)
  await page.click('.bar a');
  await page.click('.tabs a[data-tab="copias"]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Guardar una copia")')]);
  backupPath = `${dir}-copia.zip`;
  await dl.saveAs(backupPath);
  await page.waitForSelector('.toast:has-text("Copia guardada")');
  assert.match(dl.suggestedFilename(), /^Mi fichero - copia \d{4}-\d\d-\d\d \d{4}\.zip$/);
  assert.deepEqual(errors, []);
  await ctx.close();

  // Volver a abrir la app: todo sigue ahí, incluido el borrador y la foto
  ({ ctx, page, errors } = await openApp(dir, `${URL_APP}#/ficha/${salaId}`));
  await page.waitForSelector('text=versión 2 de 2');
  await page.waitForSelector('text=Hay cambios sin guardar como versión');
  await page.waitForFunction(() => { const i = document.querySelector('.photos img'); return i && i.naturalWidth > 0; });
  assert.match(await page.locator('tr:has(th:text-is("Ancho de ventana")) td').innerText(), /182/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('recuperar la copia en otro teléfono (perfil vacío) restaura fichas, fotos e historial', async () => {
  assert.ok(backupPath, 'requiere la copia de la prueba anterior');
  const dir = profile();
  const { ctx, page, errors } = await openApp(dir, `${URL_APP}#/copias`);
  await page.locator('[data-restore-input]').setInputFiles(backupPath);
  await page.waitForSelector('dialog:has-text("2 fichas con 3 versiones")');
  assert.match(await page.locator('dialog').innerText(), /1 foto/);
  await page.click('dialog button:has-text("Recuperar")');
  await page.waitForSelector('.toast:has-text("Copia recuperada")');
  await page.click('.tabs a[data-tab="inicio"]');
  await page.fill('#q', 'marta sala');
  await page.click('#results a:has-text("Ventana sala")');
  await page.waitForSelector('text=versión 2 de 2');
  await page.waitForFunction(() => { const i = document.querySelector('.photos img'); return i && i.naturalWidth > 0; });
  assert.match(await page.locator('figcaption').innerText(), /Tela de referencia/);
  await page.click('text=Historial (2 versiones)');
  assert.match(await page.locator('.timeline').innerText(), /180 cm → 182 cm/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('recuperar sin sobrescribir: «Agregar lo nuevo» conserva lo del teléfono; «Reemplazar» se puede deshacer', async () => {
  const dir = profile();
  const { ctx, page, errors } = await openApp(dir, `${URL_APP}#/copias`);
  // Primero se recupera la copia, luego se cambia la sala a versión 3 en este teléfono.
  await page.locator('[data-restore-input]').setInputFiles(backupPath);
  await page.click('dialog button:has-text("Recuperar")');
  await page.waitForSelector('.toast:has-text("Copia recuperada")');
  await page.click('.tabs a[data-tab="inicio"]');
  await page.fill('#q', 'sala');
  await page.click('#results a:has-text("Ventana sala")');
  await page.waitForSelector('text=versión 2 de 2');
  const salaId = await sheetHash(page);
  await page.goto(`${URL_APP}#/editar/${salaId}`);
  await page.waitForSelector('.savebar');
  await fillMeasure(page, 'Alto de ventana', '151');
  await page.click('button:has-text("Guardar versión")');
  await page.click('dialog button:has-text("Guardar con datos faltantes")');
  await page.waitForSelector('text=versión 3 de 3');
  // Además, un cliente nuevo propio
  await page.goto(`${URL_APP}#/cliente/nuevo`);
  await page.fill('input[name="name"]', 'Cliente solo de este teléfono');
  await page.click('button:has-text("Crear cliente")');
  await page.waitForSelector('h1:has-text("Cliente solo de este teléfono")');

  // Combinar: la sala sigue en versión 3
  await page.goto(`${URL_APP}#/copias`);
  await page.locator('[data-restore-input]').setInputFiles(backupPath);
  await page.waitForSelector('dialog:has-text("ya existen aquí")');
  await page.click('dialog button:has-text("Agregar lo nuevo")');
  await page.waitForSelector('.toast:has-text("se agregaron 0 fichas")');
  await page.goto(`${URL_APP}#/ficha/${salaId}`);
  await page.waitForSelector('text=versión 3 de 3');

  // Reemplazar: pide confirmación, deja la sala en versión 2 y borra el cliente propio
  await page.goto(`${URL_APP}#/copias`);
  await page.locator('[data-restore-input]').setInputFiles(backupPath);
  await page.click('dialog button:has-text("Reemplazar todo")');
  await page.waitForSelector('dialog .dlg-title:has-text("¿Reemplazar todo?")');
  await page.click('dialog button:has-text("Sí, reemplazar")');
  await page.waitForSelector('.toast:has-text("Copia recuperada")');
  await page.goto(`${URL_APP}#/ficha/${salaId}`);
  await page.waitForSelector('text=versión 2 de 2');
  await page.goto(`${URL_APP}#/clientes`);
  assert.equal(await page.locator('text=Cliente solo de este teléfono').count(), 0);

  // Deshacer: vuelve la versión 3 y el cliente propio
  await page.goto(`${URL_APP}#/copias`);
  await page.click('button:has-text("Deshacer y volver a como estaba")');
  await page.click('dialog button:has-text("Deshacer")');
  await page.waitForSelector('.toast:has-text("estado anterior")');
  await page.goto(`${URL_APP}#/ficha/${salaId}`);
  await page.waitForSelector('text=versión 3 de 3');
  await page.goto(`${URL_APP}#/clientes`);
  await page.waitForSelector('text=Cliente solo de este teléfono');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('archivo que no es una copia: mensaje claro y nada cambia', async () => {
  const dir = profile();
  const { ctx, page } = await openApp(dir, `${URL_APP}#/copias`);
  await page.locator('[data-restore-input]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: pngBuffer() });
  await page.waitForSelector('.toast-error:has-text("no es una copia")');
  await ctx.close();
});

test('ejemplo separado: se carga marcado, se excluye de la copia por defecto y se quita sin tocar lo real', async () => {
  const dir = profile();
  const { ctx, page, errors } = await openApp(dir, URL_APP);
  await page.click('button:has-text("Cargar el ejemplo")');
  await page.waitForSelector('h1:has-text("Cortinas sala y comedor")');
  assert.equal(await page.locator('h1 .tag-demo').count(), 1);
  await page.goto(`${URL_APP}#/cliente/nuevo`);
  await page.fill('input[name="name"]', 'Cliente real');
  await page.click('button:has-text("Crear cliente")');
  await page.waitForSelector('h1:has-text("Cliente real")');
  await page.goto(`${URL_APP}#/copias`);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Guardar una copia")')]);
  const p = `${dir}-c.zip`; await dl.saveAs(p);
  const json = JSON.parse(extractJson(readFileSync(p)));
  assert.equal(json.clients.length, 1);
  assert.equal(json.clients[0].name, 'Cliente real');
  assert.equal(json.sheets.length, 0);
  await page.click('button:has-text("Quitar los datos de ejemplo")');
  await page.click('dialog button:has-text("Quitar ejemplo")');
  await page.waitForSelector('.toast:has-text("Ejemplo quitado")');
  await page.goto(`${URL_APP}#/clientes`);
  await page.waitForSelector('text=Cliente real');
  assert.equal(await page.locator('text=Lucía Ramírez').count(), 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('pantallas a 320 px: sin desplazamiento horizontal y botones cómodos', async () => {
  const dir = profile();
  const { ctx, page, errors } = await openApp(dir, URL_APP, { width: 320, height: 640 });
  await page.click('button:has-text("Cargar el ejemplo")');
  await page.waitForSelector('h1:has-text("Cortinas sala y comedor")');
  const sala = page.locator('a.row', { hasText: 'Ventana sala' });
  await sala.click();
  await page.waitForSelector('text=versión 2 de 2');
  const sid = await sheetHash(page);
  for (const h of ['#/', '#/clientes', '#/plantillas', '#/copias', `#/ficha/${sid}`, `#/editar/${sid}`, `#/historial/${sid}`, `#/hoja/f/${sid}`, '#/plantilla/tpl-cortinas', '#/nuevo-proyecto']) {
    await page.goto(URL_APP + h);
    await page.waitForTimeout(150);
    const r = await layoutChecks(page);
    assert.equal(r.overflow, 0, `desborde horizontal en ${h}`);
    assert.deepEqual(r.small, [], `objetivos pequeños en ${h}`);
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

function extractJson(buf) {
  // copia.json es la primera entrada y va sin compresión
  const nlen = buf.readUInt16LE(26); const size = buf.readUInt32LE(18);
  return buf.subarray(30 + nlen, 30 + nlen + size).toString('utf8');
}
