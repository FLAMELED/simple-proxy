/* ==========================================================================
   Taller 02 · Ejercicios: clasificación de las notas de Ana y mesa de cierre.
   El dinero se maneja en centavos enteros. Un monto vacío es «pendiente», nunca cero.
   Los datos del caso de Ana son constantes: ningún ejercicio los modifica.
   ========================================================================== */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Dinero ---------- */
  // Devuelve centavos (entero), null si está vacío, o NaN si no es válido.
  function centavos(texto) {
    if (texto === null || texto === undefined) return null;
    let t = String(texto).trim().replace(/^q\s*/i, '').replace(/\s/g, '');
    if (t === '') return null;
    if (/,\d{1,2}$/.test(t) && !t.includes('.')) t = t.replace(',', '.'); // 25,50
    t = t.replace(/,(?=\d{3}(\D|$))/g, ''); // 1,200.00
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
    const [ent, dec = ''] = t.split('.');
    return Number(ent) * 100 + Number((dec + '00').slice(0, 2));
  }
  function q(c) {
    if (c === null || c === undefined || Number.isNaN(c)) return 'Q—';
    const neg = c < 0;
    const a = Math.abs(c);
    const ent = Math.floor(a / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '−' : '') + 'Q' + ent + '.' + String(a % 100).padStart(2, '0');
  }
  window.dinero = { centavos, q };

  /* ======================================================================
     1. Clasificar las notas de Ana (pantalla «¿Qué es cada nota?»)
     ====================================================================== */
  const CLASES = [
    ['fondo', 'Fondo inicial'], ['venta', 'Venta'], ['cobro', 'Cobro de venta anterior'], ['aporte', 'Aporte del dueño'],
    ['prestamo', 'Préstamo recibido'], ['compra', 'Compra de insumos'], ['gasto', 'Pago de gasto del negocio'],
    ['trabajo', 'Pago por trabajo del dueño'], ['retiro', 'Retiro personal'],
  ];
  const clas = $('#clasificar');
  if (clas) {
    const filas = $$('tbody tr', clas);
    filas.forEach((tr) => {
      const sel = $('select', tr);
      sel.innerHTML = '<option value="">Elige…</option>' + CLASES.map(([v, n]) => `<option value="${v}">${n}</option>`).join('');
      sel.addEventListener('change', () => { tr.dataset.estado = ''; $('.veredicto', tr).textContent = ''; actualizarCuenta(); });
    });
    const cuenta = $('#clasificar-cuenta');
    function actualizarCuenta() {
      const n = filas.filter((tr) => $('select', tr).value).length;
      cuenta.textContent = `${n} de ${filas.length} notas clasificadas`;
    }
    $('#clasificar-revisar').addEventListener('click', () => {
      let bien = 0, vacias = 0;
      filas.forEach((tr) => {
        const v = $('select', tr).value;
        const ok = v === tr.dataset.respuesta;
        if (!v) vacias++;
        if (ok) bien++;
        tr.dataset.estado = v ? (ok ? 'bien' : 'revisar') : 'vacia';
        $('.veredicto', tr).textContent = v ? (ok ? '✓ Correcto' : '✗ Revisa') : 'Sin elegir';
      });
      cuenta.textContent = `${bien} de ${filas.length} correctas` + (vacias ? ` · ${vacias} sin elegir` : '');
    });
    $('#clasificar-mostrar').addEventListener('click', () => { clas.classList.add('con-respuesta'); });
    $('#clasificar-reiniciar').addEventListener('click', () => {
      clas.classList.remove('con-respuesta');
      filas.forEach((tr) => { $('select', tr).value = ''; tr.dataset.estado = ''; $('.veredicto', tr).textContent = ''; });
      actualizarCuenta();
    });
    actualizarCuenta();
  }

  /* ---------- Vasos dibujados (cantidades reales) ---------- */
  $$('.vasos[data-n]').forEach((g) => {
    const n = Number(g.dataset.n);
    g.setAttribute('role', 'img');
    g.innerHTML = Array.from({ length: n }, () => `<svg viewBox="0 0 20 24" aria-hidden="true"><use href="#vaso-${g.dataset.forma}"/></svg>`).join('');
  });

  /* ======================================================================
     2. Mesa de cierre (práctica): caso Lucía o datos propios
     ====================================================================== */
  const TIPOS = {
    venta: { n: 'Venta', formas: ['efectivo', 'transferencia', 'credito'], sentido: 'entra' },
    cobro: { n: 'Cobro de venta anterior', formas: ['efectivo', 'transferencia'], sentido: 'entra' },
    aporte: { n: 'Aporte del dueño', formas: ['efectivo', 'transferencia'], sentido: 'entra' },
    prestamo: { n: 'Préstamo recibido', formas: ['efectivo', 'transferencia'], sentido: 'entra' },
    compra: { n: 'Compra de insumos o mercadería', formas: ['efectivo', 'transferencia', 'credito'], sentido: 'sale' },
    gasto: { n: 'Pago de gasto del negocio', formas: ['efectivo', 'transferencia', 'credito'], sentido: 'sale' },
    trabajo: { n: 'Pago por trabajo del dueño', formas: ['efectivo', 'transferencia'], sentido: 'sale' },
    retiro: { n: 'Retiro personal', formas: ['efectivo', 'transferencia'], sentido: 'sale' },
    deuda: { n: 'Pago de deuda o préstamo', formas: ['efectivo', 'transferencia'], sentido: 'sale' },
  };
  const FORMAS = { efectivo: 'Efectivo', transferencia: 'Transferencia', credito: 'Crédito (queda pendiente)' };
  const DENOM = [20000, 10000, 5000, 2000, 1000, 500, 100, 50, 25, 10, 5, 1];
  const nombreDenom = (d) => (d >= 100 ? 'Q' + d / 100 : 'Q0.' + String(d).padStart(2, '0')) + (d === 100 ? ' (billete o moneda)' : d < 100 ? ' (moneda)' : '');

  const nuevoId = () => 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  const LUCIA = () => ({
    negocio: 'Tostadas y atol Lucía (caso ficticio)', fecha: 'Un sábado', fondo: '100', app: '', notas: '', conteo: {},
    movs: [
      ['6:40 Préstamo de mi hermana Carmen (se lo devuelvo el otro sábado)', '200'],
      ['6:50 Tostadas, frijol, aguacate y maíz para el atol', '180'],
      ['Ventas en efectivo', '310'],
      ['Pedidos pagados por transferencia', '90'],
      ['La maestra Elena se llevó fiado (paga el lunes)', '30'],
      ['9:30 Don Beto pagó lo del sábado pasado', '25'],
      ['12:00 Pago a Doña Tere por ayudarme hoy', '60'],
      ['12:30 Pasaje y refacción de mis hijos', '40'],
    ].map(([desc, monto], i) => ({ id: 'lucia-' + (i + 1), desc, tipo: '', forma: '', monto })),
  });
  const RESPUESTA_LUCIA = [['prestamo', 'efectivo'], ['compra', 'efectivo'], ['venta', 'efectivo'], ['venta', 'transferencia'], ['venta', 'credito'], ['cobro', 'efectivo'], ['gasto', 'efectivo'], ['retiro', 'efectivo']];
  const CONTEO_LUCIA = { 10000: '1', 5000: '3', 2000: '4', 1000: '2', 500: '1', 100: '2' };
  const PROPIO = () => ({ negocio: '', fecha: '', fondo: '', app: '', notas: '', conteo: {}, movs: [{ id: nuevoId(), desc: '', tipo: '', forma: '', monto: '' }] });

  const CLAVE = 'taller02:mesa';
  let mesa;
  try { mesa = JSON.parse(sessionStorage.getItem(CLAVE)); } catch (e) { mesa = null; }
  if (!mesa || !mesa.datos || !mesa.datos.lucia || !mesa.datos.propio) mesa = { activo: 'lucia', datos: { lucia: LUCIA(), propio: PROPIO() } };
  let deshacer = null;
  const guardarMesa = () => { try { sessionStorage.setItem(CLAVE, JSON.stringify(mesa)); } catch (e) { /* sin almacenamiento: sigue en memoria */ } };
  const D = () => mesa.datos[mesa.activo];

  /* ---------- Cálculo ---------- */
  function calcular(d) {
    const faltan = [];
    const errores = [];
    const fondo = centavos(d.fondo);
    if (fondo === null) faltan.push('el fondo inicial (con cuánto abriste)');
    else if (Number.isNaN(fondo)) errores.push('El fondo inicial no es un monto válido.');
    const r = {
      fondo, ventas: { ef: 0, tr: 0, cr: 0 }, cobrado: 0, entradasEf: [], salidasEf: [], bancoEntra: 0, bancoSale: 0,
      porCobrar: [], porDevolver: [], porPagar: [], faltan, errores, ventasCompletas: true, cajaCompleta: fondo !== null && !Number.isNaN(fondo),
    };
    d.movs.forEach((m, i) => {
      const fila = `Fila ${i + 1}${m.desc ? ' («' + m.desc.slice(0, 40) + (m.desc.length > 40 ? '…' : '') + '»)' : ''}`;
      const vacia = !m.desc && !m.tipo && !m.forma && !m.monto;
      if (vacia) return;
      const c = centavos(m.monto);
      const t = TIPOS[m.tipo];
      if (Number.isNaN(c)) { errores.push(`${fila}: el monto «${m.monto}» no es válido. Escribe solo el número, por ejemplo 25.50.`); r.cajaCompleta = false; r.ventasCompletas = false; return; }
      if (!t) { faltan.push(`${fila}: falta elegir qué tipo de movimiento es`); r.cajaCompleta = false; if (!m.tipo) r.ventasCompletas = false; return; }
      if (!m.forma) { faltan.push(`${fila}: falta la forma de pago`); r.cajaCompleta = false; if (m.tipo === 'venta') r.ventasCompletas = false; return; }
      if (c === null) {
        faltan.push(`${fila}: falta el monto (queda pendiente, no cuenta como cero)`);
        if (m.forma === 'efectivo') r.cajaCompleta = false;
        if (m.tipo === 'venta') r.ventasCompletas = false;
        return;
      }
      const item = { desc: m.desc || t.n, monto: c, tipo: m.tipo };
      if (m.tipo === 'venta') r.ventas[{ efectivo: 'ef', transferencia: 'tr', credito: 'cr' }[m.forma]] += c;
      if ((m.tipo === 'venta' || m.tipo === 'cobro') && m.forma !== 'credito') r.cobrado += c;
      if (m.forma === 'efectivo') (t.sentido === 'entra' ? r.entradasEf : r.salidasEf).push(item);
      if (m.forma === 'transferencia') { if (t.sentido === 'entra') r.bancoEntra += c; else r.bancoSale += c; }
      if (m.forma === 'credito' && m.tipo === 'venta') r.porCobrar.push(item);
      if (m.forma === 'credito' && m.tipo !== 'venta') r.porPagar.push(item);
      if (m.tipo === 'prestamo') r.porDevolver.push(item);
    });
    r.ventas.total = r.ventas.ef + r.ventas.tr + r.ventas.cr;
    const suma = (l) => l.reduce((a, x) => a + x.monto, 0);
    r.totEntra = suma(r.entradasEf);
    r.totSale = suma(r.salidasEf);
    r.esperado = r.cajaCompleta && !errores.length ? fondo + r.totEntra - r.totSale : null;
    // Conteo
    let alguno = false, contado = 0, conteoMal = false;
    DENOM.forEach((den) => {
      const v = (d.conteo[den] ?? '').toString().trim();
      if (v === '') return;
      if (!/^\d+$/.test(v)) { conteoMal = true; return; }
      alguno = true; contado += Number(v) * den;
    });
    if (conteoMal) errores.push('En el conteo, escribe cuántos billetes o monedas hay (números enteros).');
    r.contado = alguno && !conteoMal ? contado : null;
    r.diferencia = r.contado !== null && r.esperado !== null ? r.contado - r.esperado : null;
    const app = centavos(d.app);
    r.app = Number.isNaN(app) ? null : app;
    if (Number.isNaN(app)) errores.push('Lo que muestra la app del banco no es un monto válido.');
    return r;
  }
  window.calcularCierre = calcular; // usado por las pruebas automáticas

  /* ---------- Dibujo ---------- */
  const raiz = $$('.mesa');
  if (!raiz.length) return;

  function opcionesTipo(sel) {
    return '<option value="">Elige…</option>' + Object.entries(TIPOS).map(([v, t]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${t.n}</option>`).join('');
  }
  function opcionesForma(tipo, sel) {
    const f = TIPOS[tipo] ? TIPOS[tipo].formas : [];
    return `<option value="">${tipo ? 'Elige…' : '—'}</option>` + f.map((v) => `<option value="${v}"${v === sel ? ' selected' : ''}>${FORMAS[v]}</option>`).join('');
  }

  function dibujarCabeceras() {
    $$('.mesa-cab').forEach((cab) => {
      $$('[data-conjunto]', cab).forEach((b) => b.setAttribute('aria-pressed', b.dataset.conjunto === mesa.activo));
      const et = $('.mesa-etiqueta', cab);
      et.textContent = mesa.activo === 'lucia' ? 'Caso alternativo · Lucía (ficticio)' : 'Tus datos · solo en este navegador';
      et.dataset.tipo = mesa.activo === 'lucia' ? 'lucia' : 'propio';
      $$('.solo-lucia', cab).forEach((e) => { e.hidden = mesa.activo !== 'lucia'; });
    });
    $$('.solo-propio').forEach((e) => { e.hidden = mesa.activo !== 'propio'; });
    $$('.pantalla[data-mesa]').forEach((p) => {
      p.dataset.caso = mesa.activo === 'lucia' ? 'Práctica · caso Lucía' : 'Práctica · tus datos';
      const c = $('.corrido .caso', p);
      if (c) { c.textContent = p.dataset.caso; c.dataset.tipo = mesa.activo === 'lucia' ? 'lucia' : 'propio'; }
    });
  }

  function dibujarMovimientos() {
    const d = D();
    $('#mesa-fondo').value = d.fondo;
    $('#mesa-negocio').value = d.negocio;
    $('#mesa-fecha').value = d.fecha;
    const cuerpo = $('#mesa-movs');
    cuerpo.innerHTML = d.movs.map((m, i) => `
      <tr data-id="${esc(m.id)}">
        <td class="n">${i + 1}</td>
        <td><input type="text" data-campo="desc" value="${esc(m.desc)}" aria-label="Fila ${i + 1}: qué pasó" placeholder="Qué pasó"></td>
        <td><select data-campo="tipo" aria-label="Fila ${i + 1}: tipo de movimiento">${opcionesTipo(m.tipo)}</select></td>
        <td><select data-campo="forma" aria-label="Fila ${i + 1}: forma de pago"${m.tipo ? '' : ' disabled'}>${opcionesForma(m.tipo, m.forma)}</select></td>
        <td><span class="campo-q"><span aria-hidden="true">Q</span><input type="text" inputmode="decimal" data-campo="monto" value="${esc(m.monto)}" aria-label="Fila ${i + 1}: monto en quetzales" placeholder="0.00"></span></td>
        <td><button type="button" class="quitar" data-quitar="${esc(m.id)}" aria-label="Quitar fila ${i + 1}" title="Quitar fila">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></button></td>
      </tr>`).join('');
    validarFilas();
  }

  function validarFilas() {
    $$('#mesa-movs tr').forEach((tr) => {
      const inp = $('[data-campo="monto"]', tr);
      const c = centavos(inp.value);
      inp.setAttribute('aria-invalid', Number.isNaN(c) ? 'true' : 'false');
    });
    const f = $('#mesa-fondo');
    f.setAttribute('aria-invalid', Number.isNaN(centavos(f.value)) ? 'true' : 'false');
  }

  function dibujarConteo() {
    const d = D();
    $('#mesa-conteo').innerHTML = DENOM.map((den) => {
      const v = d.conteo[den] ?? '';
      return `<label class="den"><span class="den-n">${nombreDenom(den).replace(/ \(.*\)/, '')}<small>${den === 100 ? 'billete o moneda' : den < 100 ? 'moneda' : 'billete'}</small></span>
        <input type="text" inputmode="numeric" data-den="${den}" value="${esc(v)}" aria-label="Cantidad de ${nombreDenom(den)}" placeholder="0">
        <span class="den-sub cifra" data-sub="${den}"></span></label>`;
    }).join('');
    $('#mesa-app').value = d.app;
    $('#mesa-notas').value = d.notas;
  }

  const lineaOp = (l, signo) => l.map((x) => `<li><span class="signo">${signo}</span><span>${esc(x.desc)}</span><span class="cifra">${q(x.monto)}</span></li>`).join('');

  function resumen() {
    const d = D();
    const r = calcular(d);
    // Paso 1: estado de la clasificación
    const usadas = d.movs.filter((m) => m.desc || m.tipo || m.forma || m.monto);
    const clasificadas = usadas.filter((m) => m.tipo && m.forma).length;
    $('#mesa-estado').innerHTML = `
      <p><b class="cifra">${clasificadas}</b> de <b class="cifra">${usadas.length}</b> movimientos con tipo y forma</p>
      <p>Ventas del día: <b class="cifra">${r.ventasCompletas ? q(r.ventas.total) : 'pendiente'}</b>${r.ventasCompletas && r.ventas.total ? `<br><span class="pequeno">efectivo ${q(r.ventas.ef)} · transferencia ${q(r.ventas.tr)} · crédito ${q(r.ventas.cr)}</span>` : ''}</p>
      <p>Cobrado hoy (ventas + cobros): <b class="cifra">${r.ventasCompletas ? q(r.cobrado) : 'pendiente'}</b></p>`;
    const avisos = [...r.errores.map((e) => `<li class="error">${esc(e)}</li>`), ...r.faltan.map((f) => `<li>Falta: ${esc(f)}</li>`)];
    $$('.mesa-avisos').forEach((u) => { u.innerHTML = avisos.length ? avisos.join('') : '<li class="ok">Todo clasificado y con monto.</li>'; });

    // Paso 2: esperado
    const esp = $('#mesa-esperado');
    if (r.esperado === null) {
      esp.innerHTML = `<p class="no-calc"><b>Todavía no se puede calcular.</b> Revisa la lista de faltantes: un dato desconocido no se cuenta como cero.</p>`;
    } else {
      esp.innerHTML = `<ol class="op">
          <li><span class="signo"></span><span>Fondo inicial</span><span class="cifra">${q(r.fondo)}</span></li>
          ${lineaOp(r.entradasEf, '+')}${lineaOp(r.salidasEf, '−')}
        </ol>
        <p class="op-total"><span>Efectivo esperado</span><span class="cifra fuerte">${q(r.esperado)}</span></p>
        <p class="pequeno">${q(r.fondo)} + ${q(r.totEntra)} que entró − ${q(r.totSale)} que salió. No incluye transferencias ni ventas al crédito.</p>`;
    }
    DENOM.forEach((den) => {
      const s = $(`[data-sub="${den}"]`);
      const v = (d.conteo[den] ?? '').toString().trim();
      if (s) s.textContent = /^\d+$/.test(v) && Number(v) ? '= ' + q(Number(v) * den) : '';
    });
    $('#mesa-contado').textContent = r.contado === null ? 'Falta contar' : q(r.contado);
    const dif = $('#mesa-diferencia');
    if (r.diferencia === null) {
      dif.dataset.estado = '';
      dif.innerHTML = `<p class="dif-titulo">Diferencia: pendiente</p><p class="pequeno">${r.esperado === null ? 'Primero completa los movimientos.' : 'Falta el conteo de la gaveta.'}</p>`;
    } else {
      const e = r.diferencia === 0 ? 'cuadra' : r.diferencia < 0 ? 'falta' : 'sobra';
      dif.dataset.estado = e;
      const txt = { cuadra: 'Cuadra', falta: 'Falta ' + q(-r.diferencia), sobra: 'Sobra ' + q(r.diferencia) }[e];
      dif.innerHTML = `<p class="dif-op cifra">${q(r.contado)} − ${q(r.esperado)} = ${q(r.diferencia)}</p>
        <p class="dif-titulo"><span class="dif-icono" aria-hidden="true">${e === 'cuadra' ? '=' : e === 'falta' ? '−' : '+'}</span>${txt}</p>
        <p class="pequeno">${e === 'cuadra' ? 'Lo contado coincide con lo esperado.' : 'Queda pendiente de revisión. No inventes un movimiento para borrarla.'}</p>`;
    }
    const banco = $('#mesa-banco');
    if (r.app === null) banco.innerHTML = `Anotaste <b class="cifra">${q(r.bancoEntra)}</b> en entradas por transferencia. Escribe lo que muestra la app para comparar.`;
    else if (r.app === r.bancoEntra) banco.innerHTML = `✓ Coinciden: anotaste <b class="cifra">${q(r.bancoEntra)}</b> y la app muestra <b class="cifra">${q(r.app)}</b>.`;
    else banco.innerHTML = `✗ No coinciden: anotaste <b class="cifra">${q(r.bancoEntra)}</b> y la app muestra <b class="cifra">${q(r.app)}</b> (diferencia <b class="cifra">${q(r.app - r.bancoEntra)}</b>). ¿Anotaste alguna transferencia como efectivo?`;

    // Paso 3: resumen y pendientes
    const pend = [];
    r.porCobrar.forEach((x) => pend.push(`Cobrar ${q(x.monto)}: ${x.desc}`));
    r.porDevolver.forEach((x) => pend.push(`Devolver ${q(x.monto)}: ${x.desc}`));
    r.porPagar.forEach((x) => pend.push(`Pagar ${q(x.monto)}: ${x.desc}`));
    if (r.diferencia) pend.push(`Revisar la diferencia de caja: ${r.diferencia < 0 ? 'faltan' : 'sobran'} ${q(Math.abs(r.diferencia))}. Queda sin explicar hasta encontrar la causa.`);
    if (r.app !== null && r.app !== r.bancoEntra) pend.push(`Revisar transferencias: la app muestra ${q(r.app)} y anotaste ${q(r.bancoEntra)}.`);
    r.faltan.forEach((f) => pend.push('Dato faltante: ' + f));
    $('#mesa-pendientes').innerHTML = pend.length ? pend.map((p) => `<li>${esc(p)}</li>`).join('') : '<li>No hay pendientes calculados. Revisa si falta algo que solo tú sabes.</li>';
    $('#mesa-resumen').innerHTML = `
      <tr><td>Fondo inicial</td><td class="num">${q(r.fondo)}</td></tr>
      <tr><td>Ventas del día</td><td class="num">${r.ventasCompletas ? q(r.ventas.total) : 'pendiente'}</td></tr>
      <tr><td>Cobrado hoy</td><td class="num">${r.ventasCompletas ? q(r.cobrado) : 'pendiente'}</td></tr>
      <tr><td>Efectivo esperado</td><td class="num">${r.esperado === null ? 'pendiente' : q(r.esperado)}</td></tr>
      <tr><td>Efectivo contado</td><td class="num">${r.contado === null ? 'pendiente' : q(r.contado)}</td></tr>
      <tr><td>Diferencia</td><td class="num">${r.diferencia === null ? 'pendiente' : (r.diferencia === 0 ? 'cuadra' : (r.diferencia < 0 ? 'falta ' : 'sobra ') + q(Math.abs(r.diferencia)))}</td></tr>
      <tr><td>Transferencias anotadas / app</td><td class="num">${q(r.bancoEntra)} / ${r.app === null ? '—' : q(r.app)}</td></tr>`;
    $('#mesa-texto-resumen').value = textoResumen(d, r, pend);
    return r;
  }

  function textoResumen(d, r, pend) {
    const l = [];
    l.push(`Cierre de caja de práctica · ${d.negocio || 'mi negocio'} · ${d.fecha || 'fecha sin anotar'}`);
    l.push(`Fondo inicial contado: ${r.fondo === null ? 'pendiente' : q(r.fondo)}`);
    d.movs.forEach((m, i) => {
      if (!m.desc && !m.tipo && !m.monto) return;
      const c = centavos(m.monto);
      l.push(`${i + 1}. ${m.desc || '(sin descripción)'} · ${TIPOS[m.tipo]?.n || 'sin clasificar'} · ${FORMAS[m.forma] || 'sin forma'} · ${c === null ? 'monto pendiente' : Number.isNaN(c) ? 'monto inválido' : q(c)}`);
    });
    l.push(`Ventas del día: ${r.ventasCompletas ? q(r.ventas.total) : 'pendiente'} · Cobrado hoy: ${r.ventasCompletas ? q(r.cobrado) : 'pendiente'}`);
    l.push(`Efectivo esperado: ${r.esperado === null ? 'pendiente' : q(r.esperado)} · Contado: ${r.contado === null ? 'pendiente' : q(r.contado)} · Diferencia: ${r.diferencia === null ? 'pendiente' : q(r.diferencia)}`);
    l.push(`Transferencias anotadas: ${q(r.bancoEntra)} · La app muestra: ${r.app === null ? 'no lo revisé' : q(r.app)}`);
    if (pend.length) { l.push('Pendientes:'); pend.forEach((p) => l.push('- ' + p)); }
    if (d.notas) l.push('Notas: ' + d.notas);
    return l.join('\n');
  }

  function todo() { dibujarCabeceras(); dibujarMovimientos(); dibujarConteo(); resumen(); guardarMesa(); }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-conjunto]');
    if (b) { mesa.activo = b.dataset.conjunto; todo(); return; }
    const qb = e.target.closest('[data-quitar]');
    if (qb) {
      const d = D();
      d.movs = d.movs.filter((m) => m.id !== qb.dataset.quitar);
      if (!d.movs.length) d.movs.push({ id: nuevoId(), desc: '', tipo: '', forma: '', monto: '' });
      dibujarMovimientos(); resumen(); guardarMesa();
    }
  });
  $('#mesa-agregar').addEventListener('click', () => {
    D().movs.push({ id: nuevoId(), desc: '', tipo: '', forma: '', monto: '' });
    dibujarMovimientos(); resumen(); guardarMesa();
    const ult = $$('#mesa-movs tr').pop();
    if (ult) { $('[data-campo="desc"]', ult).focus(); ult.scrollIntoView({ block: 'nearest' }); }
  });
  $('#mesa-movs').addEventListener('input', (e) => {
    const tr = e.target.closest('tr');
    const m = D().movs.find((x) => x.id === tr.dataset.id);
    if (!m) return;
    m[e.target.dataset.campo] = e.target.value;
    if (e.target.dataset.campo === 'tipo') {
      const f = $('[data-campo="forma"]', tr);
      if (!TIPOS[m.tipo] || !TIPOS[m.tipo].formas.includes(m.forma)) m.forma = '';
      f.innerHTML = opcionesForma(m.tipo, m.forma);
      f.disabled = !m.tipo;
    }
    validarFilas(); resumen(); guardarMesa();
  });
  $('#mesa-movs').addEventListener('change', (e) => { if (e.target.tagName === 'SELECT') { const ev = new Event('input', { bubbles: true }); e.target.dispatchEvent(ev); } });
  [['#mesa-fondo', 'fondo'], ['#mesa-negocio', 'negocio'], ['#mesa-fecha', 'fecha'], ['#mesa-app', 'app'], ['#mesa-notas', 'notas']].forEach(([s, k]) => {
    $(s).addEventListener('input', (e) => { D()[k] = e.target.value; validarFilas(); resumen(); guardarMesa(); });
  });
  $('#mesa-conteo').addEventListener('input', (e) => {
    const den = e.target.dataset.den;
    if (!den) return;
    D().conteo[den] = e.target.value;
    e.target.setAttribute('aria-invalid', e.target.value.trim() !== '' && !/^\d+$/.test(e.target.value.trim()) ? 'true' : 'false');
    resumen(); guardarMesa();
  });
  $$('[data-mesa-reiniciar]').forEach((b) => b.addEventListener('click', () => {
    if (mesa.activo === 'propio') {
      const hay = D().movs.some((m) => m.desc || m.monto) || D().fondo;
      if (hay && !window.confirm('¿Borrar tus datos de práctica? Si quieres conservarlos, primero guarda una copia (JSON).')) return;
      mesa.datos.propio = PROPIO();
    } else mesa.datos.lucia = LUCIA();
    todo();
    window.avisar(mesa.activo === 'lucia' ? 'Caso Lucía reiniciado: notas originales, sin clasificar.' : 'Tus datos de práctica quedaron en blanco.');
  }));
  $$('[data-mesa-respuesta]').forEach((b) => b.addEventListener('click', () => {
    if (mesa.activo !== 'lucia') return;
    const d = mesa.datos.lucia = LUCIA();
    d.movs.forEach((m, i) => { [m.tipo, m.forma] = RESPUESTA_LUCIA[i]; });
    d.conteo = { ...CONTEO_LUCIA };
    d.app = '90';
    todo();
    window.avisar('Se cargó la respuesta del caso Lucía para comparar.');
  }));

  /* ---------- Copia JSON (formato de práctica, versión 1) ---------- */
  const FORMATO = 'cierre-practica-taller02';
  function aJSON(d) {
    const c = (t) => { const v = centavos(t); return Number.isNaN(v) ? null : v; };
    return {
      formato: FORMATO, version: 1, exportado: new Date().toISOString(),
      negocio: d.negocio || '', fecha: d.fecha || '', moneda: 'GTQ', unidad: 'centavos',
      fondoInicial: c(d.fondo), appTransferencias: c(d.app), notas: d.notas || '',
      movimientos: d.movs.filter((m) => m.desc || m.tipo || m.forma || m.monto).map((m) => ({ id: m.id, descripcion: m.desc, tipo: m.tipo || null, forma: m.forma || null, monto: c(m.monto) })),
      conteo: Object.fromEntries(DENOM.filter((den) => /^\d+$/.test(String(d.conteo[den] ?? '').trim())).map((den) => [String(den), Number(d.conteo[den])])),
    };
  }
  function desdeJSON(o) {
    const err = [];
    if (!o || typeof o !== 'object') err.push('El archivo no contiene datos.');
    else {
      if (o.formato !== FORMATO) err.push('No es una copia de la práctica de este taller.');
      if (o.version !== 1) err.push(`Versión de formato ${esc(o.version)} no reconocida (se esperaba 1).`);
      if (!Array.isArray(o.movimientos)) err.push('Falta la lista de movimientos.');
      else o.movimientos.forEach((m, i) => {
        if (!m || typeof m !== 'object') { err.push(`Movimiento ${i + 1}: no es válido.`); return; }
        if (m.tipo && !TIPOS[m.tipo]) err.push(`Movimiento ${i + 1}: tipo «${esc(m.tipo)}» desconocido.`);
        if (m.forma && !FORMAS[m.forma]) err.push(`Movimiento ${i + 1}: forma «${esc(m.forma)}» desconocida.`);
        if (m.monto !== null && m.monto !== undefined && !(Number.isInteger(m.monto) && m.monto >= 0)) err.push(`Movimiento ${i + 1}: monto no válido.`);
      });
      const ids = (Array.isArray(o.movimientos) ? o.movimientos : []).map((m) => m && m.id).filter(Boolean);
      if (new Set(ids).size !== ids.length) err.push('Hay movimientos con el mismo identificador (duplicados).');
    }
    if (err.length) return { err };
    const aTexto = (c) => (c === null || c === undefined ? '' : (c / 100).toFixed(2));
    return {
      datos: {
        negocio: String(o.negocio || ''), fecha: String(o.fecha || ''), fondo: aTexto(o.fondoInicial), app: aTexto(o.appTransferencias), notas: String(o.notas || ''),
        conteo: Object.fromEntries(Object.entries(o.conteo || {}).filter(([k, v]) => DENOM.includes(Number(k)) && Number.isInteger(v) && v >= 0).map(([k, v]) => [k, String(v)])),
        movs: o.movimientos.map((m) => ({ id: String(m.id || nuevoId()), desc: String(m.descripcion || ''), tipo: m.tipo || '', forma: m.forma || '', monto: aTexto(m.monto) })),
      },
      exportado: o.exportado,
    };
  }
  function descargar(nombre, texto) {
    try {
      const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = nombre;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    } catch (e) { return false; }
  }
  $('#mesa-exportar').addEventListener('click', () => {
    const d = D();
    const texto = JSON.stringify(aJSON(d), null, 2);
    const nombre = `cierre-practica-${(d.negocio || mesa.activo).toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'datos'}.json`;
    if (descargar(nombre, texto)) window.avisar(`Se descargó «${nombre}». Puedes abrirlo en otro dispositivo con «Abrir copia».`);
    else { $('#mesa-texto-resumen').value = texto; window.avisar('El navegador no permitió descargar. El contenido quedó en el cuadro de texto: cópialo y guárdalo como .json.'); }
  });
  const archivo = $('#mesa-archivo');
  $('#mesa-importar').addEventListener('click', () => archivo.click());
  let pendienteImportar = null;
  archivo.addEventListener('change', () => {
    const f = archivo.files[0];
    archivo.value = '';
    if (!f) return;
    if (f.size > 500000) { window.avisar('El archivo es demasiado grande para una copia de práctica.'); return; }
    const lector = new FileReader();
    lector.onerror = () => window.avisar('No se pudo leer el archivo.');
    lector.onload = () => {
      let o;
      try { o = JSON.parse(lector.result); } catch (e) { mostrarImportacion({ err: ['El archivo no es un JSON válido.'] }); return; }
      mostrarImportacion(desdeJSON(o));
    };
    lector.readAsText(f);
  });
  function mostrarImportacion(res) {
    const dlg = $('#dlg-importar');
    const cuerpo = $('#dlg-importar-cuerpo');
    const ok = $('#importar-confirmar');
    if (res.err) {
      pendienteImportar = null;
      ok.hidden = true;
      cuerpo.innerHTML = `<p><b>No se puede abrir esta copia.</b> Tus datos actuales no cambiaron.</p><ul>${res.err.map((x) => `<li>${x}</li>`).join('')}</ul>`;
    } else {
      const actual = JSON.stringify(aJSON(mesa.datos.propio).movimientos);
      const nueva = JSON.stringify(aJSON(res.datos).movimientos);
      const r = calcular(res.datos);
      pendienteImportar = res.datos;
      ok.hidden = actual === nueva;
      cuerpo.innerHTML = (actual === nueva ? '<p><b>Esta copia ya está cargada</b>: los movimientos son los mismos. No hace falta importarla otra vez.</p>' : '<p>Revisa la vista previa antes de abrirla. Reemplazará <b>tus datos</b> de práctica (el caso Lucía no cambia). Podrás deshacerlo.</p>') +
        `<table><tbody>
          <tr><td>Negocio</td><td>${esc(res.datos.negocio) || '—'}</td></tr>
          <tr><td>Fecha</td><td>${esc(res.datos.fecha) || '—'}</td></tr>
          <tr><td>Guardada</td><td>${res.exportado ? esc(new Date(res.exportado).toLocaleString('es-GT')) : '—'}</td></tr>
          <tr><td>Movimientos</td><td class="num">${res.datos.movs.length}</td></tr>
          <tr><td>Fondo inicial</td><td class="num">${q(r.fondo)}</td></tr>
          <tr><td>Efectivo esperado</td><td class="num">${r.esperado === null ? 'pendiente' : q(r.esperado)}</td></tr>
        </tbody></table>`;
    }
    window.abrirDialogo(dlg);
  }
  $('#importar-confirmar').addEventListener('click', () => {
    if (!pendienteImportar) return;
    deshacer = JSON.parse(JSON.stringify(mesa.datos.propio));
    mesa.datos.propio = pendienteImportar;
    mesa.activo = 'propio';
    pendienteImportar = null;
    window.cerrarDialogo($('#dlg-importar'));
    todo();
    $('#mesa-deshacer').hidden = false;
    window.avisar('Copia abierta en «Tus datos». Si te equivocaste, usa «Deshacer importación».');
  });
  $('#mesa-deshacer').addEventListener('click', () => {
    if (!deshacer) return;
    mesa.datos.propio = deshacer; deshacer = null; mesa.activo = 'propio';
    $('#mesa-deshacer').hidden = true;
    todo();
    window.avisar('Se recuperaron tus datos anteriores.');
  });

  todo();
})();
