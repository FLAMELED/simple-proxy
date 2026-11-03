/* ==========================================================================
   Taller 04 · ¿Qué me conviene vender? · Comparador de productos.
   - Dinero en centavos enteros; minutos con hasta un decimal.
   - El trabajo de la dueña se cuenta una sola vez, en el periodo (horas × valor
     de la hora); no entra en el costo por unidad.
   - Un dato vacío deja el producto «pendiente» y no se cuenta como cero.
   ========================================================================== */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function centavos(texto) {
    if (texto === null || texto === undefined) return null;
    let t = String(texto).trim().replace(/^q\s*/i, '').replace(/\s/g, '');
    if (t === '') return null;
    if (/,\d{1,2}$/.test(t) && !t.includes('.')) t = t.replace(',', '.');
    t = t.replace(/,(?=\d{3}(\D|$))/g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
    const [ent, dec = ''] = t.split('.');
    return Number(ent) * 100 + Number((dec + '00').slice(0, 2));
  }
  function numero(texto, decimales) {
    const t = String(texto ?? '').trim().replace(',', '.');
    if (t === '') return null;
    const re = decimales ? /^\d+(\.\d)?$/ : /^\d+$/;
    return re.test(t) ? Number(t) : NaN;
  }
  function q(c) {
    if (c === null || c === undefined || Number.isNaN(c)) return 'Q—';
    const r = Math.round(c);
    const a = Math.abs(r);
    return (r < 0 ? '−' : '') + 'Q' + Math.floor(a / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + String(a % 100).padStart(2, '0');
  }
  const pct = (x) => (x === null || !Number.isFinite(x) ? '—' : (Math.round(x * 1000) / 10).toFixed(1) + ' %');
  const horas = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return m ? `${h} h ${m} min` : `${h} h`; };

  /* ---------- Motor ---------- */
  // productos: [{ nombre, precio (c), costo (c), min, unidades, funcion }]
  function evaluar({ productos, fijos, valorHora, horasMax }) {
    const filas = productos.map((p) => {
      const aporte = p.precio - p.costo;
      return {
        ...p, aporte,
        margen: p.precio ? aporte / p.precio : null,
        sobreCosto: p.costo ? aporte / p.costo : null,
        porHora: p.min ? (aporte * 60) / p.min : null,
        aporteMes: aporte * p.unidades,
        minMes: p.min * p.unidades,
        pierde: aporte <= 0,
      };
    });
    const aporteMes = filas.reduce((a, f) => a + f.aporteMes, 0);
    const minMes = filas.reduce((a, f) => a + f.minMes, 0);
    const pagoTrabajo = Math.round((valorHora * minMes) / 60);
    const resultado = aporteMes - fijos - pagoTrabajo;
    const orden = (k) => [...filas].sort((a, b) => b[k] - a[k]).map((f) => f.nombre);
    return {
      filas, aporteMes, minMes, pagoTrabajo, resultado, fijos, valorHora, horasMax,
      paraDuena: resultado + pagoTrabajo,
      meta: fijos + pagoTrabajo,
      cabe: horasMax === null ? null : minMes <= horasMax * 60,
      ordenUnidad: orden('aporte'), ordenHora: orden('porHora'), ordenMes: orden('aporteMes'),
    };
  }
  window.evaluarProductos = evaluar;

  /* ---------- Caso de Ana ---------- */
  const ANA = () => ([
    { nombre: 'Jugo de naranja', precio: 2000, costo: 1200, min: 5, unidades: 120, funcion: 'Lo que más vende' },
    { nombre: 'Licuado con leche', precio: 2500, costo: 1500, min: 12, unidades: 40, funcion: 'Lo piden en la mañana' },
    { nombre: 'Ensalada de frutas', precio: 1500, costo: 700, min: 15, unidades: 50, funcion: 'La compran con un jugo' },
    { nombre: 'Limonada', precio: 1500, costo: 900, min: 3, unidades: 80, funcion: 'Rápida de servir en la fila' },
  ]);
  const CONF_ANA = { fijos: 20000, valorHora: 2000, horasMax: 30 };
  const ESCENARIOS = {
    original: { nombre: 'Menú actual', cambio: () => {} },
    sin: { nombre: 'A · Dejar de vender la ensalada', cambio: (p) => p.splice(2, 1) },
    lote: { nombre: 'B · Ensalada en lote: 9 min por vaso', cambio: (p) => { p[2].min = 9; } },
    precio: { nombre: 'C · Ensalada a Q18 · simulación: vende 40', cambio: (p) => { p[2].precio = 1800; p[2].unidades = 40; } },
  };
  function escenarioAna(clave) {
    const p = ANA();
    ESCENARIOS[clave].cambio(p);
    return evaluar({ productos: p, ...CONF_ANA });
  }
  window.escenarioAna4 = escenarioAna;

  /* ---------- Dibujos ---------- */
  function barrasProductos(cont, r, ref) {
    const maxA = Math.max(...r.filas.map((f) => f.aporteMes), ...(ref ? ref.filas.map((f) => f.aporteMes) : [1]), 1);
    const maxM = Math.max(...r.filas.map((f) => f.minMes), ...(ref ? ref.filas.map((f) => f.minMes) : [1]), 1);
    cont.innerHTML = `<div class="bp-cab"><span></span><span>Aporte al mes</span><span>Horas al mes</span></div>` + r.filas.map((f) => {
      const a = f.aporteMes, m = f.minMes;
      return `<div class="bp-fila"><span class="bp-n">${esc(f.nombre)}</span>
        <span class="bp-barra"><i class="bp-a" style="width:${Math.max(0, a) / maxA * 100}%"></i><b class="cifra">${q(a)}</b></span>
        <span class="bp-barra"><i class="bp-h" style="width:${m / maxM * 100}%"></i><b class="cifra">${horas(m)}</b></span></div>`;
    }).join('');
  }
  // Barra de la meta: el aporte total frente a lo que hay que cubrir, con el excedente a la vista
  function barraMeta(cont, r) {
    const escala = Math.max(r.aporteMes, r.meta, 1);
    const exced = r.aporteMes - r.meta;
    cont.innerHTML = `
      <div class="meta-fila"><span>Aporte de todos los productos</span><div class="meta-tira" role="img" aria-label="Aporte total ${q(r.aporteMes)}">
        ${r.filas.map((f, i) => `<i class="mseg s${i % 4}" style="width:${Math.max(0, f.aporteMes) / escala * 100}%" title="${esc(f.nombre)}: ${q(f.aporteMes)}"><span>${esc(f.nombre.split(' ')[0])}</span></i>`).join('')}
      </div><b class="cifra">${q(r.aporteMes)}</b></div>
      <div class="meta-fila"><span>Lo que hay que cubrir</span><div class="meta-tira" role="img" aria-label="Gastos fijos ${q(r.fijos)} y trabajo ${q(r.pagoTrabajo)}">
        <i class="mseg fijo" style="width:${r.fijos / escala * 100}%"><span>Fijos</span></i><i class="mseg trab" style="width:${r.pagoTrabajo / escala * 100}%"><span>Trabajo</span></i>
        ${exced > 0 ? `<i class="mseg exc" style="width:${exced / escala * 100}%"><span>Resultado ${q(exced)}</span></i>` : ''}
      </div><b class="cifra">${q(r.meta)}</b></div>
      <p class="pequeno">${exced >= 0 ? `El aporte cubre los gastos fijos y el trabajo, y sobran <b class="cifra">${q(exced)}</b>: resultado antes de impuestos.` : `El aporte no alcanza a cubrir: faltan <b class="cifra">${q(-exced)}</b>.`}</p>`;
  }
  function tablaProductos(cont, r) {
    cont.innerHTML = `<thead><tr><th>Producto</th><th class="num">Aporte por unidad</th><th class="num">Margen sobre venta</th><th class="num">Aporte por hora</th><th class="num">Al mes</th><th class="num">Horas</th></tr></thead><tbody>` +
      r.filas.map((f) => `<tr${f.pierde ? ' class="pierde"' : ''}><td>${esc(f.nombre)}${f.pierde ? ' <span class="tipo-cifra" data-t="pendiente">pierde</span>' : ''}</td><td class="num">${q(f.aporte)}</td><td class="num">${pct(f.margen)}</td><td class="num">${f.porHora === null ? '—' : q(f.porHora)}</td><td class="num">${q(f.aporteMes)}</td><td class="num">${horas(f.minMes)}</td></tr>`).join('') +
      `</tbody><tfoot><tr><td>Total</td><td></td><td></td><td></td><td class="num">${q(r.aporteMes)}</td><td class="num">${horas(r.minMes)}</td></tr></tfoot>`;
  }
  function resumenNumeros(cont, r, ref) {
    const fila = (n, v, vr) => `<tr><td>${n}</td>${ref ? `<td class="num">${vr}</td>` : ''}<td class="num"><b>${v}</b></td></tr>`;
    cont.innerHTML = (ref ? '<tr><th></th><th class="num">Menú actual</th><th class="num">Con el cambio</th></tr>' : '') +
      fila('Aporte del mes', q(r.aporteMes), ref && q(ref.aporteMes)) +
      fila('Horas de trabajo', horas(r.minMes) + (r.cabe === null ? '' : r.cabe ? ' ✓' : ' ✗'), ref && horas(ref.minMes)) +
      fila(`Pago por trabajo (× ${q(r.valorHora)})`, q(r.pagoTrabajo), ref && q(ref.pagoTrabajo)) +
      fila('Gastos fijos del mes', q(r.fijos), ref && q(ref.fijos)) +
      fila('Resultado antes de impuestos', q(r.resultado), ref && q(ref.resultado)) +
      fila('Para la dueña: resultado + su trabajo', q(r.paraDuena), ref && q(ref.paraDuena));
  }

  /* ======================================================================
     Comparador del caso de Ana (bloque D)
     ====================================================================== */
  let escAna = 'original';
  function pintarAna() {
    const r = escenarioAna(escAna);
    const ref = escAna === 'original' ? null : escenarioAna('original');
    $$('[data-esc4]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.esc4 === escAna));
    $$('.esc4-nombre').forEach((e) => { e.textContent = ESCENARIOS[escAna].nombre; });
    const b = $('#ana4-barras'); if (b) barrasProductos(b, r, ref);
    const t = $('#ana4-numeros'); if (t) resumenNumeros(t, r, ref);
    const v = $('#ana4-veredicto');
    if (v) {
      const h = r.cabe ? `<p class="veredicto-txt" data-estado="alcanza"><span class="v-icono" aria-hidden="true">✓</span><b>Cabe en ${CONF_ANA.horasMax} h</b></p>` : `<p class="veredicto-txt" data-estado="falta"><span class="v-icono" aria-hidden="true">✗</span><b>No cabe en ${CONF_ANA.horasMax} h</b></p>`;
      const nota = { original: 'Así está hoy: 4.5 horas más de las que Ana quiere trabajar.', sin: 'Libera 12.5 horas, pero Ana recibe Q400.00 menos al mes. Falta saber cuántos jugos se venden junto con la ensalada.', lote: 'Mismo dinero total y 5 horas menos. Requiere comprobar que de verdad baja a 9 minutos.', precio: 'Simulación: no sabemos si bajaría a 40. Gana poco y no cabe en 30 horas.' }[escAna];
      v.innerHTML = h + `<p class="pequeno">${nota}</p>`;
    }
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-esc4]');
    if (b) { escAna = b.dataset.esc4; pintarAna(); }
    if (e.target.closest('[data-ana4-reiniciar]')) { escAna = 'original'; pintarAna(); window.avisar && window.avisar('Comparador del caso de Ana reiniciado: menú actual.'); }
  });
  if ($('#ana4-barras')) pintarAna();
  // Dibujos fijos de las pantallas explicativas
  $$('[data-meta-fija]').forEach((c) => barraMeta(c, escenarioAna(c.dataset.metaFija)));
  $$('[data-barras-fijas]').forEach((c) => barrasProductos(c, escenarioAna(c.dataset.barrasFijas)));

  /* ======================================================================
     Comparador de práctica: caso Lucía o datos propios (bloque E)
     ====================================================================== */
  const nuevoId = () => 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const prod = (nombre, precio, costo, min, unidades, funcion) => ({ id: nuevoId(), nombre, precio: String(precio), costo: String(costo), min: String(min), unidades: String(unidades), funcion });
  const LUCIA = () => ({
    fijos: '510', valorHora: '20', horasMax: '20', cambio: null,
    productos: [
      prod('Tostada de frijol', 5, 2, 1.5, 160, 'La más pedida'),
      prod('Tostada de guacamol', 6, 3.5, 2, 120, 'La piden con el atol'),
      prod('Atol de elote', 6, 2, 3, 100, 'Se vende con todo'),
      prod('Chuchito', 7, 3, 6, 60, 'Por encargo, domingos'),
    ],
  });
  const PROPIO = () => ({ fijos: '', valorHora: '20', horasMax: '', cambio: null, productos: [prod('', '', '', '', '', ''), prod('', '', '', '', '', ''), prod('', '', '', '', '', '')] });
  const CLAVE = 'taller04:comparador';
  let comp;
  try { comp = JSON.parse(sessionStorage.getItem(CLAVE)); } catch (e) { comp = null; }
  if (!comp || !comp.datos || !comp.datos.lucia || !comp.datos.propio) comp = { activo: 'lucia', datos: { lucia: LUCIA(), propio: PROPIO() } };
  const guardar = () => { try { sessionStorage.setItem(CLAVE, JSON.stringify(comp)); } catch (e) { /* en memoria */ } };
  const C = () => comp.datos[comp.activo];

  // Convierte el formulario en datos para el motor. Devuelve también lo que falta.
  function preparar(d, conCambio) {
    const faltan = [], errores = [], productos = [];
    const fijos = centavos(d.fijos), vh = centavos(d.valorHora), hmax = numero(d.horasMax, true);
    if (fijos === null) faltan.push('los gastos fijos del mes'); else if (Number.isNaN(fijos)) errores.push('Los gastos fijos no son un monto válido.');
    if (vh === null) faltan.push('el valor de tu hora'); else if (Number.isNaN(vh)) errores.push('El valor de la hora no es un monto válido.');
    if (Number.isNaN(hmax)) errores.push('Las horas que quieres trabajar deben ser un número.');
    d.productos.forEach((p, i) => {
      const vacio = !p.nombre && !p.precio && !p.costo && !p.min && !p.unidades;
      if (vacio) return;
      const n = p.nombre || `producto ${i + 1}`;
      let v = { precio: centavos(p.precio), costo: centavos(p.costo), min: numero(p.min, true), unidades: numero(p.unidades, false) };
      if (conCambio && d.cambio && d.cambio.id === p.id) {
        const nv = d.cambio.campo === 'min' ? numero(d.cambio.valor, true) : d.cambio.campo === 'unidades' ? numero(d.cambio.valor, false) : centavos(d.cambio.valor);
        if (nv === null || Number.isNaN(nv)) errores.push(`El nuevo valor del cambio en «${n}» no es válido.`); else v = { ...v, [d.cambio.campo]: nv };
      }
      const etiquetas = { precio: 'el precio', costo: 'el costo por unidad', min: 'los minutos por unidad', unidades: 'las unidades al mes' };
      let ok = true;
      for (const k of Object.keys(v)) {
        if (v[k] === null) { faltan.push(`${etiquetas[k]} de «${n}»`); ok = false; }
        else if (Number.isNaN(v[k])) { errores.push(`En «${n}», ${etiquetas[k]} no es válido.`); ok = false; }
      }
      if (ok && v.min === 0) { errores.push(`En «${n}», los minutos por unidad no pueden ser 0.`); ok = false; }
      if (ok) productos.push({ id: p.id, nombre: n, funcion: p.funcion, ...v });
    });
    if (!productos.length && !faltan.length) faltan.push('al menos un producto');
    return { faltan, errores, entrada: { productos, fijos: fijos ?? 0, valorHora: vh ?? 0, horasMax: hmax ?? null } };
  }
  window.prepararComparador = preparar;

  function pintarFilas() {
    const d = C();
    $('#comp-fijos').value = d.fijos; $('#comp-hora').value = d.valorHora; $('#comp-horas').value = d.horasMax;
    $('#comp-filas').innerHTML = d.productos.map((p, i) => `
      <tr data-id="${esc(p.id)}">
        <td class="n">${i + 1}</td>
        <td><input type="text" data-campo="nombre" value="${esc(p.nombre)}" placeholder="Producto" aria-label="Producto ${i + 1}: nombre"></td>
        <td><span class="campo-q"><span aria-hidden="true">Q</span><input type="text" inputmode="decimal" data-campo="precio" value="${esc(p.precio)}" placeholder="0.00" aria-label="Producto ${i + 1}: precio"></span></td>
        <td><span class="campo-q"><span aria-hidden="true">Q</span><input type="text" inputmode="decimal" data-campo="costo" value="${esc(p.costo)}" placeholder="0.00" aria-label="Producto ${i + 1}: costo por unidad"></span></td>
        <td><input type="text" inputmode="decimal" data-campo="min" value="${esc(p.min)}" placeholder="min" aria-label="Producto ${i + 1}: minutos por unidad"></td>
        <td><input type="text" inputmode="numeric" data-campo="unidades" value="${esc(p.unidades)}" placeholder="0" aria-label="Producto ${i + 1}: unidades al mes"></td>
        <td><input type="text" data-campo="funcion" value="${esc(p.funcion)}" placeholder="Para qué sirve" aria-label="Producto ${i + 1}: para qué sirve en el negocio"></td>
        <td><button type="button" class="quitar" data-quitar4="${esc(p.id)}" aria-label="Quitar producto ${i + 1}" title="Quitar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></button></td>
      </tr>`).join('');
    $('#comp-agregar').disabled = d.productos.length >= 5;
    validar();
  }
  function validar() {
    $$('#comp-filas tr').forEach((tr) => {
      $$('input', tr).forEach((i) => {
        const c = i.dataset.campo;
        const v = c === 'precio' || c === 'costo' ? centavos(i.value) : c === 'min' ? numero(i.value, true) : c === 'unidades' ? numero(i.value, false) : 0;
        i.setAttribute('aria-invalid', Number.isNaN(v) ? 'true' : 'false');
      });
    });
    $('#comp-fijos').setAttribute('aria-invalid', Number.isNaN(centavos($('#comp-fijos').value)) ? 'true' : 'false');
    $('#comp-hora').setAttribute('aria-invalid', Number.isNaN(centavos($('#comp-hora').value)) ? 'true' : 'false');
    $('#comp-horas').setAttribute('aria-invalid', Number.isNaN(numero($('#comp-horas').value, true)) ? 'true' : 'false');
  }
  function pintarResultado() {
    const d = C();
    $$('[data-conjunto4]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.conjunto4 === comp.activo));
    $$('.comp-etiqueta').forEach((e) => { e.textContent = comp.activo === 'lucia' ? 'Caso alternativo · Lucía (ficticio)' : 'Tus datos · solo en este navegador'; e.dataset.tipo = comp.activo === 'lucia' ? 'lucia' : 'propio'; });
    $$('.pantalla[data-comp]').forEach((p) => {
      p.dataset.caso = comp.activo === 'lucia' ? 'Práctica · caso Lucía' : 'Práctica · tus datos';
      const c = $('.corrido .caso', p);
      if (c) { c.textContent = p.dataset.caso; c.dataset.tipo = comp.activo === 'lucia' ? 'lucia' : 'propio'; }
    });
    const base = preparar(d, false);
    const avisos = [...base.errores.map((x) => `<li class="error">${esc(x)}</li>`), ...base.faltan.map((x) => `<li>Falta ${esc(x)}</li>`)];
    const n = base.entrada.productos.length;
    if (n && (n < 3)) avisos.push('<li>Para comparar, conviene tener de 3 a 5 productos.</li>');
    $$('.comp-avisos').forEach((u) => { u.innerHTML = avisos.length ? avisos.join('') : '<li class="ok">Todos los productos tienen sus datos.</li>'; });
    const puede = !base.errores.length && !base.faltan.length;
    const r = puede ? evaluar(base.entrada) : null;
    const tabla = $('#comp-tabla');
    if (r) tablaProductos(tabla, r); else tabla.innerHTML = '<tbody><tr><td class="no-calc"><b>Todavía no se puede comparar.</b> Completa lo que falta: un dato desconocido no se cuenta como cero.</td></tr></tbody>';
    // Selector del cambio
    const sel = $('#comp-cambio-prod');
    const actual = d.cambio;
    sel.innerHTML = '<option value="">Ninguno</option>' + d.productos.filter((p) => p.nombre).map((p) => `<option value="${esc(p.id)}"${actual && actual.id === p.id ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('');
    $('#comp-cambio-campo').value = actual ? actual.campo : 'precio';
    $('#comp-cambio-valor').value = actual ? actual.valor : '';
    const conCambio = actual && actual.id && actual.valor !== '' ? preparar(d, true) : null;
    const rc = conCambio && !conCambio.errores.length && !conCambio.faltan.length ? evaluar(conCambio.entrada) : null;
    const num = $('#comp-numeros');
    if (r) resumenNumeros(num, rc || r, rc ? r : null); else num.innerHTML = '';
    const nota = $('#comp-cambio-nota');
    if (conCambio && conCambio.errores.length) nota.textContent = conCambio.errores.join(' ');
    else if (rc) {
      const p = d.productos.find((x) => x.id === actual.id);
      const dif = rc.paraDuena - r.paraDuena, dm = rc.minMes - r.minMes;
      nota.innerHTML = `<b>Simulación:</b> ${esc(p.nombre)}, ${({ precio: 'precio', costo: 'costo por unidad', min: 'minutos por unidad', unidades: 'unidades al mes' })[actual.campo]} → ${esc(actual.valor)}. Para la dueña: ${dif >= 0 ? '+' : '−'}${q(Math.abs(dif))}; tiempo: ${dm > 0 ? '+' : dm < 0 ? '−' : ''}${horas(Math.abs(dm))}. Si cambias el precio, ¿se venderá lo mismo? Ese dato es un supuesto.`;
    } else nota.textContent = 'Elige un producto y un solo dato para probar.';
    $('#comp-texto').value = textoResumen(r, rc, d);
  }
  function textoResumen(r, rc, d) {
    if (!r) return 'Comparador de práctica: faltan datos.';
    const l = [`Comparador de productos (práctica) · ${comp.activo === 'lucia' ? 'caso Lucía' : 'mi negocio'} · datos por mes`];
    r.filas.forEach((f) => l.push(`- ${f.nombre}: precio ${q(f.precio)}, costo ${q(f.costo)}, aporte ${q(f.aporte)} por unidad (margen ${pct(f.margen)}), ${f.min} min por unidad, aporte por hora ${q(f.porHora)}, ${f.unidades} al mes = ${q(f.aporteMes)}. Función: ${f.funcion || 'sin anotar'}.`));
    l.push(`Aporte total ${q(r.aporteMes)} · horas ${horas(r.minMes)} · gastos fijos ${q(r.fijos)} · trabajo ${q(r.pagoTrabajo)} · resultado antes de impuestos ${q(r.resultado)}.`);
    if (rc) l.push(`Con el cambio probado: aporte ${q(rc.aporteMes)}, horas ${horas(rc.minMes)}, resultado ${q(rc.resultado)}, para la dueña ${q(rc.paraDuena)} (antes ${q(r.paraDuena)}).`);
    return l.join('\n');
  }

  if ($('#comp-filas')) {
    const todo = () => { pintarFilas(); pintarResultado(); guardar(); };
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-conjunto4]');
      if (b) { comp.activo = b.dataset.conjunto4; todo(); return; }
      const qb = e.target.closest('[data-quitar4]');
      if (qb) {
        C().productos = C().productos.filter((p) => p.id !== qb.dataset.quitar4);
        if (C().cambio && C().cambio.id === qb.dataset.quitar4) C().cambio = null;
        if (!C().productos.length) C().productos.push(prod('', '', '', '', '', ''));
        todo();
      }
    });
    $('#comp-agregar').addEventListener('click', () => {
      if (C().productos.length >= 5) return;
      C().productos.push(prod('', '', '', '', '', ''));
      todo();
      const u = $$('#comp-filas tr').pop(); if (u) $('input', u).focus();
    });
    $('#comp-filas').addEventListener('input', (e) => {
      const tr = e.target.closest('tr');
      const p = tr && C().productos.find((x) => x.id === tr.dataset.id);
      if (!p) return;
      p[e.target.dataset.campo] = e.target.value;
      validar(); pintarResultado(); guardar();
    });
    [['#comp-fijos', 'fijos'], ['#comp-hora', 'valorHora'], ['#comp-horas', 'horasMax']].forEach(([s, k]) => $(s).addEventListener('input', (e) => { C()[k] = e.target.value; validar(); pintarResultado(); guardar(); }));
    const leerCambio = () => {
      const id = $('#comp-cambio-prod').value;
      C().cambio = id ? { id, campo: $('#comp-cambio-campo').value, valor: $('#comp-cambio-valor').value } : null;
      pintarResultado(); guardar();
    };
    $('#comp-cambio-prod').addEventListener('change', leerCambio);
    $('#comp-cambio-campo').addEventListener('change', leerCambio);
    $('#comp-cambio-valor').addEventListener('input', () => {
      const id = $('#comp-cambio-prod').value;
      if (!id) return;
      C().cambio = { id, campo: $('#comp-cambio-campo').value, valor: $('#comp-cambio-valor').value };
      const prev = document.activeElement;
      pintarResultado(); guardar();
      if (prev && prev.id === 'comp-cambio-valor') prev.focus();
    });
    $('#comp-quitar-cambio').addEventListener('click', () => { C().cambio = null; pintarResultado(); guardar(); });
    $$('[data-comp-reiniciar]').forEach((b) => b.addEventListener('click', () => {
      if (comp.activo === 'propio') {
        const hay = C().fijos || C().productos.some((p) => p.nombre || p.precio);
        if (hay && !window.confirm('¿Borrar tus datos de práctica?')) return;
        comp.datos.propio = PROPIO();
      } else comp.datos.lucia = LUCIA();
      todo();
      window.avisar && window.avisar(comp.activo === 'lucia' ? 'Caso Lucía reiniciado: sus cuatro productos, sin cambios.' : 'Tus datos de práctica quedaron en blanco.');
    }));
    todo();
  }
})();
