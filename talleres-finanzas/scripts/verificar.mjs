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
// Pantallas que usan las pruebas generales (índice desde 0)
const CONF = { '02': { pasos: 7, editar: [30, '#mesa-fondo'], info: 2 }, '03': { pasos: 5, editar: [27, '#plan-saldo'], info: 5 }, '04': { pasos: 6, editar: [28, '#comp-fijos'], info: 6 } }[taller.slice(0, 2)];
const fallos = [];
const falla = (m) => { fallos.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

const navegador = await chromium.launch();

async function pruebas02(page) {
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
}

async function pruebas04(page) {
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const esc = await page.evaluate(() => Object.fromEntries(['original', 'sin', 'lote', 'precio'].map((k) => {
    const r = window.escenarioAna4(k);
    return [k, [r.aporteMes, r.minMes, r.pagoTrabajo, r.resultado, r.paraDuena, r.cabe]];
  })));
  igual(esc.original, [224000, 2070, 69000, 135000, 204000, false]) ? ok('Ana menú actual: aporte Q2,240, 34.5 h, resultado Q1,350, para Ana Q2,040') : falla('original: ' + JSON.stringify(esc.original));
  igual(esc.sin, [184000, 1320, 44000, 120000, 164000, true]) ? ok('A sin ensalada: 22 h, resultado Q1,200, para Ana Q1,640') : falla('A: ' + JSON.stringify(esc.sin));
  igual(esc.lote, [224000, 1770, 59000, 145000, 204000, true]) ? ok('B en lote: 29.5 h, resultado Q1,450, para Ana Q2,040') : falla('B: ' + JSON.stringify(esc.lote));
  igual(esc.precio, [228000, 1920, 64000, 144000, 208000, false]) ? ok('C a Q18 vendiendo 40: 32 h, resultado Q1,440, para Ana Q2,080') : falla('C: ' + JSON.stringify(esc.precio));
  const filas = await page.evaluate(() => window.escenarioAna4('original').filas.map((f) => [f.aporte, Math.round(f.margen * 1000) / 10, Math.round(f.porHora), f.aporteMes]));
  igual(filas, [[800, 40, 9600, 96000], [1000, 40, 5000, 40000], [800, 53.3, 3200, 40000], [600, 40, 12000, 48000]]) ? ok('aporte, margen, aporte por hora y al mes de los 4 productos coinciden con las pantallas') : falla('filas: ' + JSON.stringify(filas));
  const ordenes = await page.evaluate(() => { const r = window.escenarioAna4('original'); return [r.ordenUnidad[0], r.ordenHora[0], r.ordenMes[0], r.ordenHora[3]]; });
  igual(ordenes, ['Licuado con leche', 'Limonada', 'Jugo de naranja', 'Ensalada de frutas']) ? ok('tres órdenes distintos: licuado por unidad, limonada por hora, jugo al mes') : falla('órdenes: ' + JSON.stringify(ordenes));
  // Comparador del caso
  await page.evaluate(() => window.presentacion.ir(16, 0));
  await page.click('[data-esc4="lote"]');
  /Cabe en 30 h/.test(await page.textContent('#ana4-veredicto')) ? ok('comparador: en lote «Cabe en 30 h»') : falla('veredicto lote');
  await page.click('[data-esc4="precio"]');
  /No cabe/.test(await page.textContent('#ana4-veredicto')) ? ok('comparador: a Q18 «No cabe»') : falla('veredicto precio');
  await page.click('[data-ana4-reiniciar]');
  (await page.getAttribute('[data-esc4="original"]', 'aria-pressed')) === 'true' ? ok('reiniciar comparador vuelve al menú actual') : falla('reinicio comparador');
  // Práctica Lucía
  const luc = await page.evaluate(() => {
    const m = JSON.parse(sessionStorage.getItem('taller04:comparador'));
    const p = window.prepararComparador(m.datos.lucia, false);
    const r = window.evaluarProductos(p.entrada);
    const d = JSON.parse(JSON.stringify(m.datos.lucia));
    d.cambio = { id: d.productos[1].id, campo: 'precio', valor: '7' };
    const r7 = window.evaluarProductos(window.prepararComparador(d, true).entrada);
    d.cambio = { id: d.productos[1].id, campo: 'unidades', valor: '90' };
    const p90 = window.prepararComparador(d, true).entrada; p90.productos[1].precio = 700;
    const r90 = window.evaluarProductos(p90);
    return [r.aporteMes, r.minMes, r.resultado, r7.aporteMes, r7.resultado, r90.aporteMes];
  });
  igual(luc, [142000, 1140, 53000, 154000, 65000, 143500]) ? ok('Lucía: aporte Q1,420, 19 h, resultado Q530; guacamol a Q7: Q1,540; con 90 ventas: Q1,435') : falla('Lucía: ' + JSON.stringify(luc));
  await page.evaluate(() => window.presentacion.ir(29, 0));
  await page.selectOption('#comp-cambio-prod', { index: 2 });
  await page.selectOption('#comp-cambio-campo', 'precio');
  await page.fill('#comp-cambio-valor', '7');
  /Simulación/.test(await page.textContent('#comp-cambio-nota')) && /\+Q120\.00/.test(await page.textContent('#comp-cambio-nota')) ? ok('probar un cambio: guacamol a Q7 muestra +Q120.00 como simulación') : falla('cambio: ' + await page.textContent('#comp-cambio-nota'));
  await page.click('#comp-quitar-cambio');
  // Datos propios con faltantes
  await page.evaluate(() => window.presentacion.ir(28, 0));
  await page.click('.pantalla.es-actual [data-conjunto4="propio"]');
  await page.fill('#comp-fijos', '300');
  await page.fill('#comp-filas tr:first-child [data-campo="nombre"]', 'Pan dulce');
  await page.fill('#comp-filas tr:first-child [data-campo="precio"]', '2');
  await page.evaluate(() => window.presentacion.ir(29, 0));
  /Todavía no se puede comparar/.test(await page.textContent('#comp-tabla')) ? ok('dato vacío: «Todavía no se puede comparar», no se toma como cero') : falla('faltante');
  await page.evaluate(() => window.presentacion.ir(28, 0));
  await page.fill('#comp-filas tr:first-child [data-campo="costo"]', 'dos');
  (await page.getAttribute('#comp-filas tr:first-child [data-campo="costo"]', 'aria-invalid')) === 'true' ? ok('costo inválido marcado con error') : falla('inválido');
  await page.fill('#comp-filas tr:first-child [data-campo="costo"]', '2.50');
  await page.fill('#comp-filas tr:first-child [data-campo="min"]', '2');
  await page.fill('#comp-filas tr:first-child [data-campo="unidades"]', '100');
  const pierde = await page.evaluate(() => { const m = JSON.parse(sessionStorage.getItem('taller04:comparador')); const p = window.prepararComparador(m.datos.propio, false); return p.entrada.productos.length === 1 && window.evaluarProductos(p.entrada).filas[0].pierde; });
  pierde ? ok('un producto con costo mayor que el precio se marca «pierde»') : falla('pierde');
  page.once('dialog', (d) => d.accept());
  await page.click('.pantalla.es-actual [data-comp-reiniciar]');
  (await page.evaluate(() => JSON.parse(sessionStorage.getItem('taller04:comparador')).datos.propio.fijos === '')) ? ok('reiniciar «Mis datos» deja todo en blanco') : falla('reinicio propio');
  await page.click('.pantalla.es-actual [data-conjunto4="lucia"]');
}

async function pruebas03(page) {

  // Escenarios del caso de Ana: deben coincidir con las cifras de las pantallas
  const esc = await page.evaluate(() => {
    const r = (p, t) => { const x = window.escenarioAna(p, t); return [x.bajo.saldo, x.bajo.dia, x.fin, x.semanas.map((s) => s.fin)]; };
    return { orig: r('original', 'ninguna'), fin: r('final', 'ninguna'), ent: r('entrega', 'ninguna'), atr: r('entrega', 'atraso'), imp: r('entrega', 'imprevisto'), finAtr: r('final', 'atraso') };
  });
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  igual(esc.orig, [20000, 2, 70000, [50000, 70000, 70000, 70000]]) ? ok('Ana sin pedido: lo más bajo Q200 (martes 2), semanas Q500/Q700/Q700/Q700') : falla('Ana original: ' + JSON.stringify(esc.orig));
  igual(esc.fin, [-70000, 25, 106000, [50000, 28000, -14000, 106000]]) ? ok('pedido pagado al final: −Q700 el jueves 25, semanas Q500/Q280/−Q140/Q1,060') : falla('pedido final: ' + JSON.stringify(esc.fin));
  igual(esc.ent.slice(0, 3), [14000, 11, 106000]) ? ok('pago por entrega: Q140 el jueves 11, final Q1,060') : falla('por entrega: ' + JSON.stringify(esc.ent));
  igual(esc.atr.slice(0, 2), [-13000, 18]) ? ok('atraso del primer pago: −Q130 el jueves 18') : falla('atraso: ' + JSON.stringify(esc.atr));
  esc.imp[0] >= 10000 ? ok(`imprevisto de Q250 con pago por entrega: lo más bajo ${esc.imp[0] / 100}, respeta el colchón`) : falla('imprevisto: ' + JSON.stringify(esc.imp));
  esc.finAtr[2] < 0 ? ok('atraso con pago al final: el cobro queda fuera de las 4 semanas') : falla('atraso final: ' + JSON.stringify(esc.finAtr));
  // Simulador interactivo
  await page.evaluate(() => window.presentacion.ir(15, 0));
  await page.click('[data-ana-plan="entrega"]');
  /Alcanza/.test(await page.textContent('#ana-veredicto')) ? ok('simulador: pago por entrega dice «Alcanza»') : falla('veredicto entrega');
  await page.click('[data-ana-prueba="atraso"]');
  /No alcanza/.test(await page.textContent('#ana-veredicto')) ? ok('simulador: con atraso dice «No alcanza»') : falla('veredicto atraso');
  await page.click('[data-ana-reiniciar]');
  (await page.getAttribute('[data-ana-plan="final"]', 'aria-pressed')) === 'true' && (await page.getAttribute('[data-ana-prueba="ninguna"]', 'aria-pressed')) === 'true' ? ok('reiniciar simulador vuelve al pedido como lo ofrecen') : falla('reinicio simulador');
  await page.evaluate(() => window.presentacion.ir(16, 0));
  await page.click('#ana-calendario .cal-dia[data-dia="25"]');
  /Fruta del pedido/.test(await page.textContent('#ana-dia')) ? ok('calendario: el día 25 muestra sus movimientos') : falla('detalle del día');
  // Planificador · caso Lucía
  const lucia = await page.evaluate(() => {
    const m = JSON.parse(sessionStorage.getItem('taller03:plan'));
    const d = m.datos.lucia;
    const res = (dia) => { const x = JSON.parse(JSON.stringify(d)); x.filas.find((f) => f.decision).dia = String(dia); const p = window.prepararPlan(x); const s = window.simularCaja(p.saldo, p.sin, p.colchon); const c = window.simularCaja(p.saldo, p.con, p.colchon); return [s.bajo.saldo, s.bajo.dia, s.fin, c.bajo.saldo, c.bajo.dia, c.fin, c.alcanza]; };
    return { d1: res(1), d15: res(15), d22: res(22) };
  });
  igual(lucia.d1, [13500, 7, 126000, -46500, 7, 66000, false]) ? ok('Lucía: sin plancha Q135 (dom 7) y Q1,260; plancha el 1 −Q465') : falla('Lucía día 1: ' + JSON.stringify(lucia.d1));
  igual(lucia.d15.slice(3), [-12000, 20, 66000, false]) ? ok('Lucía: plancha el 15 llega a −Q120 el sábado 20') : falla('Lucía día 15: ' + JSON.stringify(lucia.d15));
  igual(lucia.d22.slice(3), [13500, 7, 66000, true]) ? ok('Lucía: plancha el 22 alcanza (Q135)') : falla('Lucía día 22: ' + JSON.stringify(lucia.d22));
  // Monto vacío y monto inválido en datos propios
  await page.evaluate(() => window.presentacion.ir(27, 0));
  await page.click('.pantalla.es-actual [data-conjunto3="propio"]');
  await page.fill('#plan-saldo', '300');
  await page.selectOption('#plan-filas tr:first-child [data-campo="dia"]', '3');
  await page.fill('#plan-filas tr:first-child [data-campo="desc"]', 'Pago del alquiler');
  await page.evaluate(() => window.presentacion.ir(28, 0));
  /No se puede concluir/.test(await page.textContent('#plan-sin')) ? ok('monto vacío: «No se puede concluir», no se toma como cero') : falla('monto vacío');
  await page.evaluate(() => window.presentacion.ir(27, 0));
  await page.fill('#plan-filas tr:first-child [data-campo="monto"]', 'doscientos');
  (await page.getAttribute('#plan-filas tr:first-child [data-campo="monto"]', 'aria-invalid')) === 'true' ? ok('monto inválido marcado con error') : falla('monto inválido');
  await page.fill('#plan-filas tr:first-child [data-campo="monto"]', '250');
  await page.check('#plan-filas tr:first-child [data-campo="repite"]');
  const prop = await page.evaluate(() => { const m = JSON.parse(sessionStorage.getItem('taller03:plan')); const p = window.prepararPlan(m.datos.propio); return [p.con.length, window.simularCaja(p.saldo, p.con, p.colchon).fin]; });
  igual(prop, [4, -70000]) ? ok('«cada semana» repite la fila 4 veces (días 3, 10, 17, 24)') : falla('repetir: ' + JSON.stringify(prop));
  page.once('dialog', (d) => d.accept());
  await page.click('.pantalla.es-actual [data-plan-reiniciar]');
  (await page.evaluate(() => JSON.parse(sessionStorage.getItem('taller03:plan')).datos.propio.saldo === '')) ? ok('reiniciar «Mis datos» (con confirmación) deja todo en blanco') : falla('reinicio mis datos');
  await page.click('.pantalla.es-actual [data-conjunto3="lucia"]');
  await page.evaluate(() => window.presentacion.ir(28, 0));
  /No alcanza/.test(await page.textContent('#plan-con')) && /Alcanza/.test(await page.textContent('#plan-sin')) ? ok('planificador Lucía: sin plancha alcanza, con plancha el día 1 no') : falla('veredictos Lucía');
}


async function abrir(viewport, tema = 'claro') {
  const ctx = await navegador.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.addInitScript((t) => { try { localStorage.setItem('taller02:tema', t); localStorage.setItem('taller03:tema', t); localStorage.setItem('taller04:tema', t); sessionStorage.clear(); } catch (e) {} }, tema);
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
    if (taller.startsWith('02') && i === 30) await page.click('.pantalla.es-actual [data-mesa-respuesta]');
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
  await page.evaluate((c) => window.presentacion.ir(c, 0), CONF.pasos);
  await page.keyboard.press('ArrowRight');
  pos = await page.evaluate(() => [window.presentacion.actual, window.presentacion.paso]);
  pos[0] === CONF.pasos && pos[1] === 1 ? ok('los pasos se revelan antes de cambiar de pantalla') : falla('pasos: ' + pos);
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  pos = await page.evaluate(() => [window.presentacion.actual, window.presentacion.paso]);
  pos[0] === CONF.pasos - 1 ? ok('flecha izquierda retrocede') : falla('retroceso: ' + pos);
  // Flechas mientras se edita un campo
  await page.evaluate((c) => window.presentacion.ir(c, 0), CONF.editar[0]);
  await page.click(CONF.editar[1]);
  await page.keyboard.press('ArrowRight');
  pos = await page.evaluate(() => window.presentacion.actual);
  pos === CONF.editar[0] ? ok('las flechas no cambian de pantalla mientras se edita') : falla('cambió de pantalla al editar');
  // Diálogo «i»: abrir, Escape, foco de regreso
  await page.evaluate((c) => window.presentacion.ir(c, 'todo'), CONF.info);
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
  if (taller.startsWith('02')) await pruebas02(page);
  if (taller.startsWith('03')) await pruebas03(page);
  if (taller.startsWith('04')) await pruebas04(page);
  // Vista de todas las pantallas
  await page.click('#btn-vista');
  const vista = await page.evaluate(() => [document.body.classList.contains('vista'), [...document.querySelectorAll('.pantalla')].filter((p) => getComputedStyle(p).display !== 'none').length, document.querySelectorAll('.explicaciones h4').length]);
  vista[0] && vista[1] === (await page.evaluate(() => window.presentacion.total)) && vista[2] > 10 ? ok(`vista de todas las pantallas: ${vista[1]} pantallas con ${vista[2]} explicaciones desplegadas`) : falla('vista: ' + vista);
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
