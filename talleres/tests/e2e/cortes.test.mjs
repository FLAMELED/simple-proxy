// Mi plan de cortes en Chromium real: caso del taller, piezas que no caben, giros, copias y 320 px.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, newProfileDir, removeDir, openApp, layoutChecks, closeAll } from './helpers.mjs';

let srv; let URL_APP; let backupPath;
const dirs = [];
before(async () => { srv = await startServer(); URL_APP = `${srv.base}/cortes/`; });
after(async () => { await closeAll(); srv.server.close(); dirs.forEach(removeDir); });
const profile = () => { const d = newProfileDir(); dirs.push(d); return d; };
const pid = (page) => page.evaluate(() => location.hash.split('/')[2]);
const piece = (page, i) => page.locator('.piece').nth(i);
async function setNum(scope, label, value) {
  await scope.locator(`label.field:has(.label:text-matches("^${label}"))`).locator('input.num').first().fill(value);
}

test('proyecto nuevo con datos propios: valida, calcula, marca pendientes y sobrevive al cierre', async () => {
  const dir = profile();
  let { ctx, page, errors } = await openApp(dir, URL_APP);
  await page.click('button:has-text("+ Nuevo proyecto")');
  await page.waitForSelector('.piece');
  const id = await pid(page);

  // Sin datos: la app pide lo que falta y no inventa nada
  await page.click('button:has-text("Generar plano")');
  await page.waitForSelector('dialog:has-text("Faltan datos para calcular")');
  const msg = await page.locator('dialog').innerText();
  assert.match(msg, /ancho del material/); assert.match(msg, /separación/);
  await page.click('dialog button:has-text("Entendido")');

  await page.fill('[data-t="name"]', 'Cartón para cajas');
  await page.fill('[data-t="material.name"]', 'Cartón gris');
  await setNum(page, 'Ancho', '70');
  await setNum(page, 'Largo', '100');
  await setNum(page, 'Separación', '0,2');
  await setNum(page, 'Margen', '0.5');
  // Pieza A: 75 × 50 sin girar → no cabe
  const a = piece(page, 0);
  await a.locator('[data-pt="label"]').fill('Panel');
  await setNum(a, 'Ancho', '75'); await setNum(a, 'Largo', '50'); await setNum(a, 'Cantidad', '1');
  await a.locator('[data-pt="rotate"]').uncheck();
  // Pieza B con cantidad inválida primero
  await page.click('button:has-text("+ Agregar pieza")');
  const b = piece(page, 1);
  await b.locator('[data-pt="label"]').fill('Tapa');
  await setNum(b, 'Ancho', '18'); await setNum(b, 'Largo', '22'); await setNum(b, 'Cantidad', '2,5');
  await b.locator('.err:not([hidden])').waitFor();
  await page.click('button:has-text("Generar plano")');
  await page.waitForSelector('.toast-error:has-text("no son válidos")');
  await setNum(b, 'Cantidad', '6');
  await page.waitForSelector('[data-saved]:has-text("Guardado")');
  await page.click('button:has-text("Generar plano")');
  await page.waitForSelector('.plan-svg');
  const alert = await page.locator('.alert').innerText();
  assert.match(alert, /1 pieza pendiente/);
  assert.match(alert, /A1 · Panel \(75 × 50 cm\): No cabe en esa orientación y está marcada «no girar»/);
  assert.match(await page.locator('.stats').innerText(), /6\s*de 7/);
  assert.match(await page.locator('.okline').last().innerText(), /Verificado/);
  assert.equal(await page.locator('.plan-svg .pc').count(), 6);

  // Permitir el giro: ahora entra
  await page.click('a:has-text("Volver al proyecto")');
  await piece(page, 0).locator('[data-pt="rotate"]').check();
  await page.waitForSelector('[data-summary]:has-text("ya no coincide")');
  await page.click('button:has-text("Generar plano")');
  await page.waitForSelector('.okline:has-text("Todas las piezas tienen lugar")');
  assert.match(await page.locator('.legend').first().innerText(), /A1\s+Panel girada ↻\s+50 × 75/);

  // Zoom del plano
  await page.click('button[aria-label="Acercar"]');
  await page.waitForSelector('[data-zoomval]:has-text("150 %")');
  const w = await page.locator('.plan-zoom').first().evaluate((el) => el.getBoundingClientRect().width);
  const box = await page.locator('.plan-scroll').first().evaluate((el) => el.clientWidth);
  assert.ok(w > box * 1.4, 'el plano se amplía y se puede desplazar');
  const pdf = await page.pdf({ format: 'A4' });
  assert.ok(pdf.length > 10000);
  assert.deepEqual(errors, []);
  await ctx.close();

  // Reabrir la app
  ({ ctx, page, errors } = await openApp(dir, `${URL_APP}#/plano/${id}`));
  await page.waitForSelector('.okline:has-text("Todas las piezas tienen lugar")');
  assert.equal(await page.locator('.notice:has-text("Cambiaste el proyecto")').count(), 0);
  await page.goto(`${URL_APP}#/proyecto/${id}`);
  assert.equal(await page.locator('[data-t="name"]').inputValue(), 'Cartón para cajas');
  assert.equal(await piece(page, 1).locator('input.num').nth(2).inputValue(), '6');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('ejemplo «Papel y Forma»: 23 piezas en 2 planchas; con 1 plancha marca las que faltan; copia ida y vuelta', async () => {
  const dir = profile();
  let { ctx, page, errors } = await openApp(dir, URL_APP);
  await page.click('button:has-text("Cargar el ejemplo")');
  await page.waitForSelector('.piece');
  const id = await pid(page);
  await page.click('button:has-text("Generar plano")');
  await page.waitForSelector('.plan-svg');
  assert.match(await page.locator('.stats').innerText(), /23\s*de 23[\s\S]*2\s*de 2/);
  assert.equal(await page.locator('.sheet').count(), 2);
  // Una sola plancha
  await page.goto(`${URL_APP}#/proyecto/${id}`);
  await setNum(page, 'Planchas', '1');
  await page.waitForSelector('[data-saved]:has-text("Guardado")');
  await page.click('button:has-text("Generar plano")');
  await page.waitForSelector('.alert:has-text("No alcanzó el material")');
  // Copia
  await page.goto(`${URL_APP}#/copias`);
  await page.check('[data-include-demo]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Guardar una copia")')]);
  backupPath = `${dir}-copia.zip`; await dl.saveAs(backupPath);
  await page.waitForSelector('.toast:has-text("Copia guardada: 1 proyecto")');
  await ctx.close();

  const dir2 = profile();
  ({ ctx, page, errors } = await openApp(dir2, `${URL_APP}#/copias`));
  await page.locator('[data-restore-input]').setInputFiles(backupPath);
  await page.click('dialog button:has-text("Agregar lo nuevo")');
  await page.waitForSelector('.toast:has-text("se agregaron 1 proyecto")');
  await page.goto(`${URL_APP}#/plano/${id}`);
  await page.waitForSelector('.alert:has-text("No alcanzó el material")');
  // Combinar otra vez no duplica ni sobrescribe
  await page.goto(`${URL_APP}#/copias`);
  await page.locator('[data-restore-input]').setInputFiles(backupPath);
  await page.waitForSelector('dialog:has-text("No actualiza los que ya existen")');
  await page.click('dialog button:has-text("Agregar lo nuevo")');
  await page.waitForSelector('.toast:has-text("se agregaron 0 proyectos")');
  await page.goto(URL_APP);
  assert.equal(await page.locator('.list > li').count(), 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('pantallas a 320 px: sin desplazamiento horizontal y botones cómodos', async () => {
  const dir = profile();
  const { ctx, page, errors } = await openApp(dir, URL_APP, { width: 320, height: 640 });
  await page.click('button:has-text("Cargar el ejemplo")');
  await page.waitForSelector('.piece');
  const id = await pid(page);
  await page.click('button:has-text("Generar plano")');
  await page.waitForSelector('.plan-svg');
  for (const h of ['#/', `#/proyecto/${id}`, `#/plano/${id}`, '#/copias', '#/metodo']) {
    await page.goto(URL_APP + h);
    await page.waitForTimeout(150);
    const r = await layoutChecks(page);
    assert.equal(r.overflow, 0, `desborde horizontal en ${h}`);
    assert.deepEqual(r.small, [], `objetivos pequeños en ${h}`);
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});
