// Pruebas de regresión de la versión 1.1.0 en Chromium:
// restauración atómica con fallos inducidos, conversión de unidades, vigencia del plano,
// vista previa de «Agregar lo nuevo» y compatibilidad con datos y copias de la versión 1.0.0.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer, newProfileDir, removeDir, openApp, closeAll } from './helpers.mjs';
import { serve } from '../../scripts/serve.mjs';

const FIX = fileURLToPath(new URL('../fixtures/', import.meta.url));
let srv; let base;
const dirs = [];
before(async () => {
  // Misma dirección (mismo origen) para la versión 1.0.0 y la actual: comparten IndexedDB, como en el teléfono.
  // Las fuentes no se guardaron en el fixture (son las mismas): se sirven desde shared/fonts.
  const fonts = fileURLToPath(new URL('../../shared/fonts/', import.meta.url));
  srv = await serve(0, { mounts: { '/v100/fichero/shared/fonts/': fonts, '/v100/cortes/shared/fonts/': fonts, '/v100/': join(FIX, 'v1.0.0') } });
  base = `http://127.0.0.1:${srv.address().port}`;
});
after(async () => { await closeAll(); srv.close(); dirs.forEach(removeDir); });
const profile = () => { const d = newProfileDir(); dirs.push(d); return d; };

/** Instala en la página un interruptor que hace fallar las escrituras de las transacciones de reemplazo. */
async function failureSwitch(page) {
  await page.evaluate(() => {
    const orig = IDBObjectStore.prototype.put;
    let n = 0;
    window.__fail = null; // { after: número de escrituras que sí pasan, mode: 'throw' | 'abort' }
    IDBObjectStore.prototype.put = function (...args) {
      const names = this.transaction.objectStoreNames;
      if (window.__fail && names.contains('meta') && names.length > 1) { // solo transacciones de reemplazo
        n++;
        if (n > window.__fail.after) {
          if (window.__fail.mode === 'throw') throw new DOMException('Fallo de prueba al escribir', 'QuotaExceededError');
          const r = orig.apply(this, args); this.transaction.abort(); return r; // falla a mitad de la transacción
        }
      }
      return orig.apply(this, args);
    };
    window.__setFail = (f) => { window.__fail = f; n = 0; };
  });
}

async function fichSnapshot(page) {
  return page.evaluate(() => new Promise((res, rej) => {
    const r = indexedDB.open('mi-fichero');
    r.onsuccess = () => {
      const db = r.result; const out = {};
      const tx = db.transaction(['clients', 'projects', 'sheets', 'photos', 'meta']);
      const all = (s) => new Promise((ok) => { const q = tx.objectStore(s).getAll(); q.onsuccess = () => ok(q.result); });
      Promise.all(['clients', 'projects', 'sheets', 'photos', 'meta'].map(all)).then(([c, p, s, ph, m]) => {
        out.clients = c.map((x) => x.name).sort(); out.projects = p.map((x) => x.name).sort();
        out.sheets = s.map((x) => `${x.title}:v${x.versions.length}`).sort(); out.photos = ph.length;
        out.undo = !!m.find((x) => x.key === 'antesDeRecuperar' && x.value);
        db.close(); res(out);
      });
    };
    r.onerror = () => rej(r.error);
  }));
}

test('Fichero: un fallo durante «Reemplazar todo» o «Deshacer» no cambia nada', async () => {
  const { ctx, page, errors } = await openApp(profile(), `${base}/fichero/#/copias`);
  // Datos del teléfono: el ejemplo + un proyecto propio.
  await page.click('button:has-text("Cargar el ejemplo")'); await page.waitForSelector('text=Ventana comedor');
  await page.goto(`${base}/fichero/#/cliente/nuevo`); await page.fill('input[name="name"]', 'Cliente del teléfono'); await page.click('button:has-text("Crear cliente")'); await page.waitForSelector('h1:has-text("Cliente del teléfono")');
  const original = await fichSnapshot(page);
  assert.equal(original.photos, 1); assert.equal(original.undo, false);
  await failureSwitch(page);
  await page.goto(`${base}/fichero/#/copias`);
  for (const mode of ['throw', 'abort']) {
    await page.evaluate((m) => window.__setFail({ after: 2, mode: m }), mode);
    await page.locator('[data-restore-input]').setInputFiles(join(FIX, 'fichero-copia-v1.0.0.zip'));
    await page.click('dialog button:has-text("Reemplazar todo")');
    await page.click('dialog button:has-text("Sí, reemplazar")');
    await page.waitForSelector('.toast-error:has-text("No se cambió nada")');
    assert.deepEqual(await fichSnapshot(page), original, `modo ${mode}: los datos anteriores siguen intactos y no se guardó estado para deshacer`);
  }
  // Sin fallos: el reemplazo funciona y se puede deshacer.
  await page.evaluate(() => window.__setFail(null));
  await page.locator('[data-restore-input]').setInputFiles(join(FIX, 'fichero-copia-v1.0.0.zip'));
  await page.click('dialog button:has-text("Reemplazar todo")'); await page.click('dialog button:has-text("Sí, reemplazar")');
  await page.waitForSelector('.toast-ok:has-text("Copia recuperada")');
  const replaced = await fichSnapshot(page);
  assert.ok(replaced.clients.includes('Taller propio') && !replaced.clients.includes('Cliente del teléfono'));
  assert.equal(replaced.undo, true);
  // «Deshacer» que falla a mitad: sigue el estado reemplazado y el respaldo para deshacer se conserva.
  for (const mode of ['throw', 'abort']) {
    await page.evaluate((m) => window.__setFail({ after: 1, mode: m }), mode);
    await page.goto(`${base}/fichero/#/copias`); await page.click('button:has-text("Deshacer y volver a como estaba")'); await page.click('dialog button:has-text("Deshacer")');
    await page.waitForSelector('.toast-error:has-text("el estado guardado se conserva")');
    assert.deepEqual(await fichSnapshot(page), replaced, `modo ${mode}: deshacer falló sin cambiar nada`);
  }
  await page.evaluate(() => window.__setFail(null));
  await page.goto(`${base}/fichero/#/copias`); await page.click('button:has-text("Deshacer y volver a como estaba")'); await page.click('dialog button:has-text("Deshacer")');
  await page.waitForSelector('.toast-ok:has-text("estado anterior")');
  assert.deepEqual(await fichSnapshot(page), { ...original, undo: false });
  // Al recargar, la base de datos sigue igual (no hay escrituras a medias en memoria).
  await page.reload(); await page.waitForSelector('html[data-ready]');
  assert.deepEqual(await fichSnapshot(page), { ...original, undo: false });
  assert.deepEqual(errors.filter((e) => !/Fallo de prueba|AbortError|QuotaExceeded/.test(e)), []);
  await ctx.close();
});

test('Fichero: «Agregar lo nuevo» explica que no actualiza y cuenta agregados y omitidos', async () => {
  const { ctx, page, errors } = await openApp(profile(), `${base}/fichero/#/copias`);
  await page.locator('[data-restore-input]').setInputFiles(join(FIX, 'fichero-copia-v1.0.0.zip'));
  await page.click('dialog button:has-text("Agregar lo nuevo")'); await page.waitForSelector('.toast:has-text("Copia recuperada")');
  // Segunda vez: todo existe, nada se agrega.
  await page.goto(`${base}/fichero/#/copias`);
  await page.locator('[data-restore-input]').setInputFiles(join(FIX, 'fichero-copia-v1.0.0.zip'));
  const d = page.locator('dialog');
  await d.waitFor();
  const text = await d.innerText();
  assert.match(text, /Agrega registros que no existen en este teléfono\. No actualiza los que ya existen, aunque la copia contenga cambios más recientes\./);
  const rows = await d.locator('.merge-table tbody tr').allInnerTexts();
  assert.deepEqual(rows.map((r) => r.replace(/\s+/g, ' ').trim()), ['Clientes 0 2', 'Proyectos 0 2', 'Fichas 0 3', 'Fotos 0 2', 'Plantillas 0 3']);
  await page.click('dialog button:has-text("Agregar lo nuevo")');
  await page.waitForSelector('.toast:has-text("se agregaron 0 fichas y 0 fotos. Se omitieron 12 registros")');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Fichero: una copia sin el ejemplo incluye el cliente de ejemplo de un proyecto real (sin relaciones rotas)', async () => {
  const { ctx, page, errors } = await openApp(profile(), `${base}/fichero/#/copias`);
  await page.click('button:has-text("Cargar el ejemplo")'); await page.waitForSelector('text=Ventana comedor');
  await page.goto(`${base}/fichero/#/nuevo-proyecto`); await page.fill('input[name="clientName"]', 'Temporal'); await page.fill('input[name="name"]', 'Proyecto real');
  await page.click('button:has-text("Crear proyecto")'); await page.waitForSelector('h1:has-text("Proyecto real")');
  // Se mueve el proyecto real a la clienta de ejemplo.
  await page.click('a:has-text("Editar datos")'); await page.selectOption('select[name="clientId"]', { label: 'Lucía Ramírez' }); await page.waitForTimeout(700);
  await page.goto(`${base}/fichero/#/copias`);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Guardar una copia")')]);
  const p = join(newProfileDir(), 'c.zip'); await dl.saveAs(p);
  const ok = await page.evaluate(async (bytes) => {
    const { readBackup } = await import('./src/backup.js');
    const parsed = await readBackup(new Uint8Array(bytes));
    return { errors: parsed.relations.errors, projects: parsed.manifest.projects.map((x) => x.name), clients: parsed.manifest.clients.map((x) => x.name) };
  }, [...(await import('node:fs')).readFileSync(p)]);
  assert.deepEqual(ok.errors, []);
  assert.ok(ok.projects.includes('Proyecto real')); assert.ok(ok.clients.includes('Lucía Ramírez'));
  assert.ok(!ok.projects.includes('Cortinas sala y comedor'), 'el proyecto de ejemplo no se incluye');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Cortes: un fallo durante «Reemplazar todo» o «Deshacer» no cambia nada', async () => {
  const { ctx, page, errors } = await openApp(profile(), `${base}/cortes/`);
  await page.click('button:has-text("+ Nuevo proyecto")'); await page.waitForSelector('.piece'); await page.fill('[data-t="name"]', 'Del teléfono'); await page.waitForTimeout(700);
  const names = () => page.evaluate(() => new Promise((res) => { const r = indexedDB.open('mi-plan-de-cortes'); r.onsuccess = () => { const db = r.result; const tx = db.transaction(['projects', 'meta']); const a = tx.objectStore('projects').getAll(); const m = tx.objectStore('meta').get('antesDeRecuperar'); tx.oncomplete = () => { db.close(); res({ names: a.result.map((x) => x.name).sort(), undo: !!m.result?.value }); }; }; }));
  const original = await names();
  await failureSwitch(page);
  await page.goto(`${base}/cortes/#/copias`);
  for (const mode of ['throw', 'abort']) {
    await page.evaluate((m) => window.__setFail({ after: 1, mode: m }), mode);
    await page.locator('[data-restore-input]').setInputFiles(join(FIX, 'cortes-copia-v1.0.0.zip'));
    await page.click('dialog button:has-text("Reemplazar todo")'); await page.click('dialog button:has-text("Sí, reemplazar")');
    await page.waitForSelector('.toast-error:has-text("No se cambió nada")');
    assert.deepEqual(await names(), original, `modo ${mode}`);
  }
  await page.evaluate(() => window.__setFail(null));
  await page.locator('[data-restore-input]').setInputFiles(join(FIX, 'cortes-copia-v1.0.0.zip'));
  await page.click('dialog button:has-text("Reemplazar todo")'); await page.click('dialog button:has-text("Sí, reemplazar")');
  await page.waitForSelector('.toast-ok:has-text("Copia recuperada")');
  const replaced = await names();
  assert.deepEqual(replaced, { names: ['Cajas y cuadros de cartón', 'Repisas MDF'], undo: true });
  await page.evaluate(() => window.__setFail({ after: 0, mode: 'abort' }));
  await page.goto(`${base}/cortes/#/copias`); await page.click('button:has-text("Deshacer y volver a como estaba")'); await page.click('dialog button:has-text("Deshacer")');
  await page.waitForSelector('.toast-error:has-text("el estado guardado se conserva")');
  assert.deepEqual(await names(), replaced);
  await page.evaluate(() => window.__setFail(null));
  await page.goto(`${base}/cortes/#/copias`); await page.click('button:has-text("Deshacer y volver a como estaba")'); await page.click('dialog button:has-text("Deshacer")');
  await page.waitForSelector('.toast-ok:has-text("estado anterior")');
  assert.deepEqual(await names(), { ...original, undo: false });
  assert.deepEqual(errors.filter((e) => !/Fallo de prueba|AbortError|QuotaExceeded/.test(e)), []);
  await ctx.close();
});

test('Cortes: cambiar el sobrante mínimo invalida el plano (caso 100 × 100, pieza 60 × 60)', async () => {
  const { ctx, page, errors } = await openApp(profile(), `${base}/cortes/`);
  const num = (sc, l) => sc.locator(`label.field:has(.label:text-matches("^${l}"))`).locator('input.num').first();
  await page.click('button:has-text("+ Nuevo proyecto")'); await page.waitForSelector('.piece');
  await num(page, 'Ancho').fill('100'); await num(page, 'Largo').fill('100'); await num(page, 'Separación').fill('0.3'); await num(page, 'Margen').fill('0'); await num(page, 'Sobrante').fill('5');
  const pz = page.locator('.piece').first(); await num(pz, 'Ancho').fill('60'); await num(pz, 'Largo').fill('60'); await pz.locator('[data-pt="rotate"]').uncheck();
  await page.waitForTimeout(600);
  await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.plan-svg');
  assert.ok(await page.locator('.legend-left tbody tr').count() >= 1, 'con 5 cm hay sobrantes');
  const id = await page.evaluate(() => location.hash.split('/')[2]);
  await page.goto(`${base}/cortes/#/proyecto/${id}`);
  await num(page, 'Sobrante').fill('50'); await page.waitForSelector('[data-summary]:has-text("ya no coincide")');
  await page.goto(`${base}/cortes/#/plano/${id}`);
  await page.waitForSelector('.notice:has-text("Cambiaste el proyecto")');
  await page.goto(`${base}/cortes/#/proyecto/${id}`); await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.plan-svg');
  assert.equal(await page.locator('.notice:has-text("Cambiaste el proyecto")').count(), 0);
  assert.equal(await page.locator('.legend-left').count(), 0, 'con 50 cm ya no hay sobrantes útiles');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Cortes: cambiar de unidad convierte las medidas, pide confirmación y deja el plano desactualizado', async () => {
  const { ctx, page, errors } = await openApp(profile(), `${base}/cortes/`);
  const num = (sc, l) => sc.locator(`label.field:has(.label:text-matches("^${l}"))`).locator('input.num').first();
  await page.click('button:has-text("Cargar el ejemplo")'); await page.waitForSelector('.piece');
  await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.plan-svg');
  const id = await page.evaluate(() => location.hash.split('/')[2]);
  await page.goto(`${base}/cortes/#/proyecto/${id}`);
  // Una medida pendiente: se vacía el largo de la última pieza.
  await num(page.locator('.piece').nth(3), 'Largo').fill(''); await page.waitForTimeout(600);
  // Cancelar: no cambia nada.
  await page.click('.seg-opt:has-text("milímetros")');
  await page.waitForSelector('dialog:has-text("70 cm → 700 mm")');
  assert.match(await page.locator('dialog').innerText(), /cantidades de piezas y planchas no cambian/);
  await page.click('dialog button:has-text("Cancelar")');
  assert.equal(await page.locator('input[data-t="unit"][value="cm"]').isChecked(), true);
  assert.equal(await num(page, 'Ancho').inputValue(), '70');
  // Convertir.
  await page.click('.seg-opt:has-text("milímetros")'); await page.click('dialog button:has-text("Convertir")');
  await page.waitForSelector('.toast:has-text("Medidas convertidas a milímetros")');
  const vals = async () => Promise.all(['Ancho', 'Largo', 'Planchas', 'Separación', 'Margen', 'Sobrante'].map((l) => num(page, l).inputValue()));
  assert.deepEqual(await vals(), ['700', '1000', '2', '2', '5', '50']);
  const p3 = page.locator('.piece').nth(2);
  assert.deepEqual(await Promise.all(['Ancho', 'Largo', 'Cantidad'].map((l) => num(p3, l).inputValue())), ['196', '80', '8']);
  assert.equal(await num(page.locator('.piece').nth(3), 'Largo').inputValue(), '', 'la medida pendiente sigue pendiente');
  await page.waitForSelector('[data-summary]:has-text("ya no coincide")');
  // A pulgadas y de vuelta a cm: vuelve exacto.
  await page.click('.seg-opt:has-text("pulgadas")'); await page.click('dialog button:has-text("Convertir")'); await page.waitForSelector('.toast:has-text("pulgadas")');
  assert.equal(await num(p3, 'Ancho').inputValue(), '7.717');
  await page.click('.seg-opt:has-text("centímetros")'); await page.click('dialog button:has-text("Convertir")'); await page.waitForSelector('.toast:has-text("centímetros")');
  assert.deepEqual(await vals(), ['70', '100', '2', '0.2', '0.5', '5']);
  assert.equal(await num(p3, 'Ancho').inputValue(), '19.6');
  // Persiste al recargar.
  await page.reload(); await page.waitForSelector('.piece');
  assert.equal(await num(page.locator('.piece').nth(2), 'Ancho').inputValue(), '19.6');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Compatibilidad: los datos guardados por la versión 1.0.0 siguen al abrir la 1.1.0', async () => {
  const { ctx, page, errors } = await openApp(profile(), `${base}/v100/fichero/`);
  await page.click('button:has-text("Cargar el ejemplo")'); await page.waitForSelector('text=Ventana comedor');
  await page.goto(`${base}/v100/cortes/`); await page.waitForSelector('html[data-ready]');
  await page.click('button:has-text("Cargar el ejemplo")'); await page.waitForSelector('.piece');
  await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.plan-svg');
  // Ahora la versión nueva, en el mismo origen (como al instalar la actualización encima).
  await page.goto(`${base}/fichero/`); await page.waitForSelector('html[data-ready]');
  await page.click('a.row:has-text("Cortinas sala y comedor")'); await page.click('a.row:has-text("Ventana sala")');
  await page.waitForSelector('text=versión 2 de 2');
  await page.waitForFunction(() => { const i = document.querySelector('.photos img'); return i && i.naturalWidth > 0; });
  await page.goto(`${base}/cortes/`); await page.waitForSelector('a.row:has-text("plano desactualizado")');
  await page.click('a.row:has-text("Cajas y cuadros")'); await page.click('button:has-text("Generar plano")');
  await page.waitForSelector('.okline:has-text("Todas las piezas")');
  assert.match(await page.locator('.stats').innerText(), /23\s*de 23[\s\S]*2\s*de 2/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Compatibilidad: las copias ZIP de la versión 1.0.0 se recuperan completas', async () => {
  const { ctx, page, errors } = await openApp(profile(), `${base}/fichero/#/copias`);
  await page.locator('[data-restore-input]').setInputFiles(join(FIX, 'fichero-copia-v1.0.0.zip'));
  await page.waitForSelector('dialog:has-text("3 fichas con 5 versiones y 2 fotos")');
  await page.click('dialog button:has-text("Agregar lo nuevo")'); await page.waitForSelector('.toast:has-text("se agregaron 3 fichas y 2 fotos")');
  await page.goto(`${base}/fichero/`); await page.fill('#q', 'sillon'); await page.click('#results a[href^="#/ficha/"]:has-text("Sillón")');
  await page.waitForSelector('text=versión 2 de 2');
  assert.match(await page.locator('tr:has(th:text-is("Ancho total")) td').innerText(), /82\s*cm/);
  assert.match(await page.locator('tr:has(th:text-is("Alto total")) td').innerText(), /^0\s*cm/);
  assert.match(await page.locator('tr:has(th:text-is("Fondo total")) td').innerText(), /Sin dato/);
  await page.waitForFunction(() => { const i = document.querySelector('.photos img'); return i && i.naturalWidth > 0; });
  await page.click('text=Historial (2 versiones)'); assert.match(await page.locator('.timeline').innerText(), /80 cm → 82 cm/);
  await page.goto(`${base}/cortes/#/copias`);
  await page.locator('[data-restore-input]').setInputFiles(join(FIX, 'cortes-copia-v1.0.0.zip'));
  await page.click('dialog button:has-text("Agregar lo nuevo")'); await page.waitForSelector('.toast:has-text("se agregaron 2 proyectos")');
  await page.goto(`${base}/cortes/`); await page.click('a.row:has-text("Repisas MDF")');
  const num = (sc, l) => sc.locator(`label.field:has(.label:text-matches("^${l}"))`).locator('input.num').first();
  assert.equal(await num(page, 'Ancho').inputValue(), '1220');
  await page.click('button:has-text("Generar plano")'); await page.waitForSelector('.okline:has-text("Verificado")');
  assert.match(await page.locator('.stats').innerText(), /6\s*de 6/);
  assert.deepEqual(errors, []);
  await ctx.close();
});
