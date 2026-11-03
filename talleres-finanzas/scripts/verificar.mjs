// Comprobaciones automáticas de una presentación.
// Uso: node talleres-finanzas/scripts/verificar.mjs 02-cierra-el-dia [carpeta-capturas]
// - Recorre todas las pantallas y pasos en PC (1920×1080, 1366×768, 1280×720) y celular (390×844).
// - En PC detecta contenido que se sale del marco (provocaría desplazamiento o cortes).
// - Revisa errores de JavaScript, la navegación con teclado, los diálogos y los ejercicios.
// - Verifica los cálculos de la mesa de práctica con el caso Lucía.
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
// Playwright puede estar instalado de forma global (NODE_PATH) o en el proyecto.
const { chromium } = createRequire(import.meta.url)('playwright');
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const taller = process.argv[2] || '02-cierra-el-dia';
const capturas = process.argv[3];
if (capturas) mkdirSync(capturas, { recursive: true });
const url = 'file://' + join(raiz, taller, 'presentacion.html');
const fallos = [];
const falla = (m) => { fallos.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

const navegador = await chromium.launch();

async function abrir(viewport, tema = 'claro') {
  const ctx = await navegador.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.addInitScript((t) => { try { localStorage.setItem('taller02:tema', t); sessionStorage.clear(); } catch (e) {} }, tema);
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.classList.contains('listo'));
  return { ctx, page, errores };
}

// Contenido que se sale del marco de la pantalla actual (solo PC)
const desbordes = () => {
  const p = document.querySelector('.pantalla.es-actual');
  const m = p.querySelector('.marco').getBoundingClientRect();
  const malos = [];
  p.querySelectorAll('.marco *').forEach((el) => {
    if (el.closest('.notas, .desplaza, dialog, template, .solo-lectores, [hidden]')) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (r.bottom > m.bottom + 1.5 || r.right > m.right + 1.5 || r.left < m.left - 1.5) {
      malos.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} «${(el.textContent || '').trim().slice(0, 40)}» (${Math.round(r.bottom - m.bottom)}px abajo, ${Math.round(r.right - m.right)}px a la derecha)`);
    }
    // texto cortado dentro de su caja
    if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden') && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) && el.childElementCount < 3) {
      malos.push(`recorte en ${el.tagName.toLowerCase()}.${[...el.classList].join('.')} «${(el.textContent || '').trim().slice(0, 30)}»`);
    }
  });
  return malos.slice(0, 4);
};

for (const vp of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }]) {
  console.log(`\nPC ${vp.width}×${vp.height}`);
  const { ctx, page, errores } = await abrir(vp);
  const total = await page.evaluate(() => window.presentacion.total);
  // Pasar por la mesa con datos completos para medir su estado más lleno
  let problemas = 0;
  for (let i = 0; i < total; i++) {
    await page.evaluate((i) => window.presentacion.ir(i, 'todo'), i);
    if (i === 30) await page.click('.pantalla.es-actual [data-mesa-respuesta]');
    const malos = await page.evaluate(desbordes);
    if (malos.length) { problemas++; falla(`pantalla ${i + 1}: ${malos.join(' | ')}`); }
    if (capturas && vp.width === 1280) await page.screenshot({ path: join(capturas, `pc-${String(i + 1).padStart(2, '0')}.png`) });
  }
  const scroll = await page.evaluate(() => document.scrollingElement.scrollHeight > innerHeight + 1);
  if (scroll) falla('la página tiene desplazamiento vertical en modo presentación');
  if (!problemas) ok(`${total} pantallas sin contenido fuera del marco`);
  if (errores.length) falla('errores de JS: ' + errores.join(' | ')); else ok('sin errores de JavaScript');
  await ctx.close();
}

console.log('\nCelular 390×844');
{
  const { ctx, page, errores } = await abrir({ width: 390, height: 844 });
  const total = await page.evaluate(() => window.presentacion.total);
  let anchos = 0;
  for (let i = 0; i < total; i++) {
    await page.evaluate((i) => window.presentacion.ir(i, 'todo'), i);
    const sobra = await page.evaluate(() => {
      const p = document.querySelector('.pantalla.es-actual');
      return p.scrollWidth > p.clientWidth + 1 ? p.scrollWidth - p.clientWidth : 0;
    });
    if (sobra) { anchos++; falla(`pantalla ${i + 1}: ${sobra}px de desplazamiento horizontal`); }
    if (capturas && [0, 5, 7, 12, 14, 19, 22, 30, 31, 32].includes(i)) await page.screenshot({ path: join(capturas, `movil-${String(i + 1).padStart(2, '0')}.png`), fullPage: false });
  }
  if (!anchos) ok('ninguna pantalla se desborda a lo ancho');
  if (errores.length) falla('errores de JS: ' + errores.join(' | ')); else ok('sin errores de JavaScript');
  await ctx.close();
}

console.log('\nFunciones');
{
  const { ctx, page, errores } = await abrir({ width: 1366, height: 768 }, 'noche');
  // Teclado y pasos
  await page.keyboard.press('ArrowRight');
  let pos = await page.evaluate(() => [window.presentacion.actual, window.presentacion.paso]);
  pos[0] === 1 ? ok('flecha derecha avanza') : falla('flecha derecha no avanzó: ' + pos);
  await page.evaluate(() => window.presentacion.ir(7, 0));
  await page.keyboard.press('ArrowRight');
  pos = await page.evaluate(() => [window.presentacion.actual, window.presentacion.paso]);
  pos[0] === 7 && pos[1] === 1 ? ok('los pasos se revelan antes de cambiar de pantalla') : falla('pasos: ' + pos);
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  pos = await page.evaluate(() => [window.presentacion.actual, window.presentacion.paso]);
  pos[0] === 6 ? ok('flecha izquierda retrocede') : falla('retroceso: ' + pos);
  // Flechas mientras se edita un campo
  await page.evaluate(() => window.presentacion.ir(30, 0));
  await page.click('#mesa-fondo');
  await page.keyboard.press('ArrowRight');
  pos = await page.evaluate(() => window.presentacion.actual);
  pos === 30 ? ok('las flechas no cambian de pantalla mientras se edita') : falla('cambió de pantalla al editar');
  // Diálogo «i»: abrir, Escape, foco de regreso
  await page.evaluate(() => window.presentacion.ir(2, 0));
  const i = page.locator('.pantalla.es-actual .i').first();
  await i.click();
  const abierto = await page.evaluate(() => document.getElementById('dlg-info').open);
  await page.keyboard.press('Escape');
  const cerrado = await page.evaluate(() => !document.getElementById('dlg-info').open && document.activeElement.classList.contains('i'));
  abierto && cerrado ? ok('botón «i»: abre, cierra con Escape y devuelve el foco') : falla('diálogo «i»');
  // Clic fuera
  await i.click();
  await page.mouse.click(5, 5);
  (await page.evaluate(() => !document.getElementById('dlg-info').open)) ? ok('diálogo se cierra con clic fuera') : falla('clic fuera no cierra');
  // Índice y datos del caso
  await page.click('#btn-indice');
  await page.locator('#indice-lista a').nth(15).click();
  pos = await page.evaluate(() => window.presentacion.actual);
  pos === 15 ? ok('el índice salta a la pantalla elegida') : falla('índice: ' + pos);
  await page.click('#btn-datos');
  await page.click('#t-lucia');
  (await page.isVisible('#d-lucia')) ? ok('datos del caso con pestañas') : falla('pestañas de datos');
  await page.keyboard.press('Escape');
  // Ejercicio de clasificación
  await page.evaluate(() => window.presentacion.ir(12, 0));
  const respuestas = ['fondo', 'aporte', 'venta', 'venta', 'venta', 'cobro', 'compra', 'gasto', 'retiro'];
  const sels = page.locator('#clasificar select');
  for (let k = 0; k < 9; k++) await sels.nth(k).selectOption(k === 5 ? 'venta' : respuestas[k]);
  await page.click('#clasificar-revisar');
  const cuenta = await page.textContent('#clasificar-cuenta');
  cuenta.startsWith('8 de 9') ? ok('clasificar: detecta 8 de 9 correctas') : falla('clasificar: ' + cuenta);
  await page.click('#clasificar-reiniciar');
  (await page.evaluate(() => [...document.querySelectorAll('#clasificar select')].every((s) => !s.value))) ? ok('clasificar: el reinicio deja todo en blanco') : falla('reinicio de clasificar');
  // Mesa: caso Lucía con la respuesta
  await page.evaluate(() => window.presentacion.ir(30, 0));
  await page.click('.pantalla.es-actual [data-mesa-respuesta]');
  const r = await page.evaluate(() => {
    const m = JSON.parse(sessionStorage.getItem('taller02:mesa'));
    const c = window.calcularCierre(m.datos.lucia);
    return { ventas: c.ventas.total, cobrado: c.cobrado, esperado: c.esperado, contado: c.contado, dif: c.diferencia, banco: c.bancoEntra, app: c.app };
  });
  const esperado = { ventas: 43000, cobrado: 42500, esperado: 35500, contado: 35700, dif: 200, banco: 9000, app: 9000 };
  JSON.stringify(r) === JSON.stringify(esperado) ? ok('mesa · Lucía: ventas Q430, cobrado Q425, esperado Q355, contado Q357, sobra Q2') : falla('mesa · Lucía: ' + JSON.stringify(r));
  const pend = await page.textContent('#mesa-pendientes');
  /Devolver Q200\.00/.test(pend) && /Cobrar Q30\.00/.test(pend) && /sobran Q2\.00/.test(pend) ? ok('mesa · pendientes: préstamo, fiado y sobrante') : falla('pendientes: ' + pend);
  // Caso de Ana en la mesa (mismos datos corregidos) para comprobar la lógica
  const ana = await page.evaluate(() => {
    const d = { fondo: '150', app: '120', conteo: { 10000: '1', 5000: '2', 2000: '1', 1000: '1', 100: '3', 50: '4' }, movs: [
      { desc: 'Aporte', tipo: 'aporte', forma: 'efectivo', monto: '100' }, { desc: 'Ventas', tipo: 'venta', forma: 'efectivo', monto: '240' },
      { desc: 'Transfer', tipo: 'venta', forma: 'transferencia', monto: '120' }, { desc: 'Don Luis', tipo: 'venta', forma: 'credito', monto: '40' },
      { desc: 'Doña Marta', tipo: 'cobro', forma: 'efectivo', monto: '60' }, { desc: 'Fruta', tipo: 'compra', forma: 'efectivo', monto: '200' },
      { desc: 'Teléfono', tipo: 'gasto', forma: 'efectivo', monto: '50' }, { desc: 'Útiles', tipo: 'retiro', forma: 'efectivo', monto: '60' }] };
    const c = window.calcularCierre(d);
    return [c.ventas.total, c.cobrado, c.esperado, c.contado, c.diferencia];
  });
  JSON.stringify(ana) === JSON.stringify([40000, 42000, 24000, 23500, -500]) ? ok('lógica · Ana corregida: ventas Q400, cobrado Q420, esperado Q240, contado Q235, falta Q5') : falla('Ana: ' + ana);
  // Dato faltante no se convierte en cero
  const faltante = await page.evaluate(() => window.calcularCierre({ fondo: '100', app: '', conteo: {}, movs: [{ desc: 'x', tipo: 'compra', forma: 'efectivo', monto: '' }] }));
  faltante.esperado === null && faltante.faltan.length === 1 ? ok('un monto vacío queda pendiente y bloquea el esperado') : falla('monto vacío: ' + JSON.stringify(faltante));
  const invalido = await page.evaluate(() => window.calcularCierre({ fondo: '100', app: '', conteo: {}, movs: [{ desc: 'x', tipo: 'compra', forma: 'efectivo', monto: '12,5,0' }] }));
  invalido.errores.length && invalido.esperado === null ? ok('un monto inválido muestra error y no calcula') : falla('monto inválido');
  const montos = await page.evaluate(() => ['25', '25.5', '25,50', 'Q1,200.00', '1.205', '-3', 'abc'].map((t) => window.dinero.centavos(t)));
  JSON.stringify(montos) === JSON.stringify([2500, 2550, 2550, 120000, null, null, null].map((v, k) => (k >= 4 ? 'NaN' : v))) || (montos[0] === 2500 && montos[1] === 2550 && montos[2] === 2550 && montos[3] === 120000 && montos.slice(4).every(Number.isNaN))
    ? ok('lectura de montos: 25 · 25.5 · 25,50 · Q1,200.00 válidos; 1.205, -3 y abc inválidos') : falla('montos: ' + JSON.stringify(montos));
  // Reinicio del caso Lucía
  await page.click('.pantalla.es-actual [data-mesa-reiniciar]');
  const reini = await page.evaluate(() => JSON.parse(sessionStorage.getItem('taller02:mesa')).datos.lucia.movs.every((m) => !m.tipo && !m.forma));
  reini ? ok('reinicio del caso Lucía restaura las notas sin clasificar') : falla('reinicio Lucía');
  // Exportar e importar (Mis datos)
  await page.click('.pantalla.es-actual [data-conjunto="propio"]');
  await page.fill('#mesa-fondo', '80');
  await page.fill('#mesa-movs tr:first-child [data-campo="desc"]', 'Ventas de la mañana');
  await page.selectOption('#mesa-movs tr:first-child [data-campo="tipo"]', 'venta');
  await page.selectOption('#mesa-movs tr:first-child [data-campo="forma"]', 'efectivo');
  await page.fill('#mesa-movs tr:first-child [data-campo="monto"]', '45.50');
  await page.evaluate(() => window.presentacion.ir(32, 0));
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.click('#mesa-exportar')]);
  const ruta = await descarga.path();
  const { readFileSync, writeFileSync } = await import('node:fs');
  const json = JSON.parse(readFileSync(ruta, 'utf8'));
  json.formato === 'cierre-practica-taller02' && json.version === 1 && json.movimientos[0].monto === 4550 && json.fondoInicial === 8000 && json.movimientos[0].id
    ? ok('copia JSON con formato, versión, identificadores y centavos') : falla('JSON: ' + JSON.stringify(json));
  // misma copia: debe avisar que ya está cargada
  await page.setInputFiles('#mesa-archivo', ruta);
  await page.waitForSelector('#dlg-importar[open]');
  (await page.isHidden('#importar-confirmar')) && /ya está cargada/.test(await page.textContent('#dlg-importar-cuerpo')) ? ok('importar la misma copia: avisa duplicado y no reemplaza') : falla('duplicado');
  await page.keyboard.press('Escape');
  // copia modificada
  json.movimientos.push({ id: 'm-nuevo', descripcion: 'Compra de gas', tipo: 'compra', forma: 'efectivo', monto: 2000 });
  const ruta2 = ruta + '-2.json';
  writeFileSync(ruta2, JSON.stringify(json));
  await page.setInputFiles('#mesa-archivo', ruta2);
  await page.waitForSelector('#dlg-importar[open]');
  await page.click('#importar-confirmar');
  const tras = await page.evaluate(() => JSON.parse(sessionStorage.getItem('taller02:mesa')).datos.propio.movs.length);
  tras === 2 ? ok('importar con vista previa reemplaza «Mis datos»') : falla('importación: ' + tras);
  await page.click('#mesa-deshacer');
  const des = await page.evaluate(() => JSON.parse(sessionStorage.getItem('taller02:mesa')).datos.propio.movs.length);
  des === 1 ? ok('deshacer importación recupera los datos anteriores') : falla('deshacer: ' + des);
  // archivo inválido
  const ruta3 = ruta + '-3.json';
  writeFileSync(ruta3, JSON.stringify({ formato: 'otro', version: 7, movimientos: 'x' }));
  await page.setInputFiles('#mesa-archivo', ruta3);
  await page.waitForSelector('#dlg-importar[open]');
  /No se puede abrir/.test(await page.textContent('#dlg-importar-cuerpo')) ? ok('archivo inválido: se rechaza y explica por qué') : falla('archivo inválido');
  await page.keyboard.press('Escape');
  // Copiar: con permiso de portapapeles denegado debe ofrecer la alternativa manual
  await page.evaluate(() => window.presentacion.ir(18, 0));
  await page.evaluate(() => { document.execCommand = () => false; if (navigator.clipboard) navigator.clipboard.writeText = () => Promise.reject(new Error('no')); });
  await page.click('.pantalla.es-actual [data-copiar]');
  const alt = await page.evaluate(() => { const t = document.querySelector('.pantalla.es-actual textarea.respaldo'); return t && t.value.length > 200; });
  alt ? ok('si el portapapeles falla, aparece el texto seleccionado para copiar a mano') : falla('alternativa de copia');
  // Vista de todas las pantallas
  await page.click('#btn-vista');
  const vista = await page.evaluate(() => [document.body.classList.contains('vista'), [...document.querySelectorAll('.pantalla')].filter((p) => getComputedStyle(p).display !== 'none').length, document.querySelectorAll('.explicaciones h4').length]);
  vista[0] && vista[1] === 37 && vista[2] > 10 ? ok(`vista de todas las pantallas: ${vista[1]} pantallas con ${vista[2]} explicaciones desplegadas`) : falla('vista: ' + vista);
  if (capturas) {
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: join(capturas, 'impresion.pdf'), format: 'Letter', landscape: true, printBackground: true });
    await page.emulateMedia({ media: 'screen' });
    ok('PDF de impresión generado');
  }
  await page.click('#vista-salir');
  // Minutos
  const min = await page.evaluate(() => [...document.querySelectorAll('.pantalla')].reduce((a, p) => a + Number(p.dataset.min || 0), 0));
  min === 90 ? ok('los tiempos suman 90 minutos') : falla('minutos: ' + min);
  if (errores.length) falla('errores de JS: ' + errores.join(' | ')); else ok('sin errores de JavaScript en modo nocturno');
  if (capturas) {
    for (const n of [4, 14, 22, 31]) { await page.evaluate((n) => window.presentacion.ir(n, 'todo'), n); await page.screenshot({ path: join(capturas, `noche-${n + 1}.png`) }); }
  }
  await ctx.close();
}

await navegador.close();
console.log(fallos.length ? `\n${fallos.length} problema(s).` : '\nTodo en orden.');
process.exit(fallos.length ? 1 : 0);
