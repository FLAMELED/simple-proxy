/* ==========================================================================
   Taller 03 · ¿Me alcanza? · Simulador de caja de 4 semanas.
   - Dinero en centavos enteros. Un monto vacío es «pendiente»: impide concluir.
   - Dentro de un día el orden es: mañana → durante el día → tarde; y en un mismo
     momento, primero lo que sale (supuesto prudente).
   - Los escenarios del caso de Ana se arman desde datos fijos; ninguna simulación
     los modifica. Los datos del participante viven aparte.
   ========================================================================== */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Dinero ---------- */
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
  function q(c) {
    if (c === null || c === undefined || Number.isNaN(c)) return 'Q—';
    const a = Math.abs(c);
    return (c < 0 ? '−' : '') + 'Q' + Math.floor(a / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + String(a % 100).padStart(2, '0');
  }
  const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const DC = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const nombreDia = (d) => `${DIAS[(d - 1) % 7]} ${d}`;
  const MOMENTO = { 1: 'mañana', 2: 'durante el día', 3: 'tarde' };

  /* ---------- Motor ---------- */
  // movs: { dia, momento (1|2|3), sentido ('entra'|'sale'), monto (centavos), desc, grupo }
  function simular(saldoInicial, movs, colchon) {
    const dentro = movs.filter((m) => m.dia >= 1 && m.dia <= 28);
    const fuera = movs.filter((m) => !(m.dia >= 1 && m.dia <= 28));
    const orden = dentro.map((m, i) => ({ ...m, i })).sort((a, b) => a.dia - b.dia || a.momento - b.momento || (a.sentido === b.sentido ? a.i - b.i : a.sentido === 'sale' ? -1 : 1));
    let s = saldoInicial;
    let bajo = { saldo: s, dia: 0, desc: 'saldo inicial' };
    const dias = [];
    for (let d = 1; d <= 28; d++) dias[d] = { dia: d, inicio: 0, movs: [], min: 0, fin: 0, entra: 0, sale: 0 };
    let k = 0;
    for (let d = 1; d <= 28; d++) {
      const dd = dias[d];
      dd.inicio = s; dd.min = s;
      while (k < orden.length && orden[k].dia === d) {
        const m = orden[k++];
        s += m.sentido === 'entra' ? m.monto : -m.monto;
        if (m.sentido === 'entra') dd.entra += m.monto; else dd.sale += m.monto;
        dd.movs.push({ ...m, saldo: s });
        if (s < dd.min) dd.min = s;
        if (s < bajo.saldo) bajo = { saldo: s, dia: d, desc: m.desc };
      }
      dd.fin = s;
    }
    const semanas = [0, 1, 2, 3].map((w) => {
      const ds = dias.slice(w * 7 + 1, w * 7 + 8);
      return { inicio: ds[0].inicio, entra: ds.reduce((a, x) => a + x.entra, 0), sale: ds.reduce((a, x) => a + x.sale, 0), fin: ds[6].fin, min: Math.min(...ds.map((x) => x.min)) };
    });
    const c = colchon ?? 0;
    return {
      saldoInicial, colchon: c, dias, semanas, bajo, fin: s, fuera,
      diasBajoColchon: dias.filter((x) => x && x.min < c).length,
      diasNegativos: dias.filter((x) => x && x.min < 0).length,
      alcanza: bajo.saldo >= c,
      faltaParaColchon: Math.max(0, c - bajo.saldo),
    };
  }
  window.simularCaja = simular;

  /* ---------- Caso de Ana (datos previstos del plan) ---------- */
  const SALDO_ANA = 65000;
  const COLCHON_ANA = 10000;
  function baseAna() {
    const m = [];
    for (let w = 0; w < 4; w++) {
      for (const d of [2, 4, 6]) {
        const dia = w * 7 + d;
        m.push({ dia, momento: 1, sentido: 'sale', monto: 10000, desc: 'Fruta: 1 tanda', grupo: 'base' });
        m.push({ dia, momento: 2, sentido: 'entra', monto: 20000, desc: 'Ventas: 10 vasos', grupo: 'base' });
      }
      m.push({ dia: w * 7 + 6, momento: 3, sentido: 'sale', monto: 10000, desc: 'Pago por trabajo de Ana', grupo: 'base' });
    }
    m.push({ dia: 1, momento: 1, sentido: 'sale', monto: 15000, desc: 'Espacio de venta del mes', grupo: 'base' });
    m.push({ dia: 1, momento: 1, sentido: 'sale', monto: 20000, desc: 'Empaque: 100 vasos', grupo: 'base' });
    m.push({ dia: 15, momento: 1, sentido: 'sale', monto: 5000, desc: 'Teléfono del mes', grupo: 'base' });
    m.push({ dia: 20, momento: 3, sentido: 'sale', monto: 15000, desc: 'Retiro personal (casa)', grupo: 'base' });
    m.push({ dia: 22, momento: 1, sentido: 'sale', monto: 20000, desc: 'Empaque: 100 vasos', grupo: 'base' });
    return m;
  }
  function movsAna(plan, prueba) {
    const m = baseAna();
    const avisos = [];
    if (plan !== 'original') {
      for (const d of [11, 18, 25]) {
        m.push({ dia: d, momento: 1, sentido: 'sale', monto: 30000, desc: 'Fruta del pedido: 3 tandas', grupo: 'pedido' });
        m.push({ dia: d, momento: 1, sentido: 'sale', monto: 6000, desc: 'Vasos del pedido: 30 × Q2', grupo: 'pedido' });
      }
      for (const d of [13, 20, 27]) m.push({ dia: d, momento: 3, sentido: 'sale', monto: 6000, desc: 'Trabajo extra de Ana: 3 h', grupo: 'pedido' });
      if (plan === 'final') m.push({ dia: prueba === 'atraso' ? 33 : 26, momento: 2, sentido: 'entra', monto: 162000, desc: 'Cobro de la oficina: 90 vasos', grupo: 'pedido' });
      if (plan === 'entrega') [12, 19, 26].forEach((d, i) => m.push({ dia: prueba === 'atraso' && i === 0 ? 19 : d, momento: 2, sentido: 'entra', monto: 54000, desc: i === 0 && prueba === 'atraso' ? 'Cobro de la 1.ª entrega (atrasado)' : `Cobro de la ${i + 1}.ª entrega`, grupo: 'pedido' }));
    }
    if (prueba === 'atraso' && plan === 'original') avisos.push('La prueba de atraso se aplica al pago de la oficina; en el plan original no hay pedido.');
    if (prueba === 'atraso' && plan === 'final') avisos.push('Con el atraso, el cobro pasa al viernes 33: queda fuera de estas 4 semanas y no se cuenta.');
    if (prueba === 'atraso' && plan === 'entrega') avisos.push('Con el atraso, la 1.ª entrega se cobra el viernes 19, junto con la 2.ª.');
    if (prueba === 'imprevisto') m.push({ dia: 16, momento: 1, sentido: 'sale', monto: 25000, desc: 'Imprevisto: reparar la licuadora', grupo: 'prueba' });
    return { movs: m, avisos };
  }
  window.escenarioAna = (plan, prueba) => simular(SALDO_ANA, movsAna(plan, prueba).movs, COLCHON_ANA);

  /* ---------- Dibujos ---------- */
  function escalaPasos(min, max) {
    const rango = max - min;
    const paso = [2500, 5000, 10000, 25000, 50000, 100000].find((p) => rango / p <= 6) || 200000;
    return { paso, min: Math.floor(min / paso) * paso, max: Math.ceil(max / paso) * paso };
  }
  // Gráfico: saldo más bajo de cada día (barras) + referencia (contorno) + colchón + cero
  function grafico(cont, r, ref, etiquetas) {
    const W = 1000, H = 380, L = 86, R = 16, T = 26, B = 40;
    const vals = r.dias.slice(1).map((d) => d.min);
    const refv = ref ? ref.dias.slice(1).map((d) => d.min) : [];
    const esc_ = escalaPasos(Math.min(0, ...vals, ...refv), Math.max(r.colchon, ...vals, ...refv, r.saldoInicial));
    const y = (v) => T + (esc_.max - v) / (esc_.max - esc_.min) * (H - T - B);
    const bw = (W - L - R) / 28;
    const x = (d) => L + (d - 1) * bw;
    let s = `<svg viewBox="0 0 ${W} ${H}" class="grafico-svg" role="img" aria-label="${esc(etiquetas.aria)}">`;
    s += `<defs><pattern id="${etiquetas.id}-ray" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="7" fill="currentColor"/></pattern></defs>`;
    for (let v = esc_.min; v <= esc_.max; v += esc_.paso) {
      s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="g-rejilla${v === 0 ? ' g-cero' : ''}"/>`;
      s += `<text x="${L - 8}" y="${y(v) + 5}" text-anchor="end" class="g-eje">${q(v).replace('.00', '')}</text>`;
    }
    for (let w = 0; w < 4; w++) {
      s += `<line x1="${x(w * 7 + 1)}" x2="${x(w * 7 + 1)}" y1="${T - 18}" y2="${H - B}" class="g-semana"/>`;
      s += `<text x="${x(w * 7 + 1) + 6}" y="${T - 6}" class="g-eje g-fuerte">Semana ${w + 1}</text>`;
    }
    const y0 = y(0);
    r.dias.slice(1).forEach((d) => {
      const v = d.min;
      const top = Math.min(y(v), y0), alto = Math.max(1.5, Math.abs(y(v) - y0));
      const clase = v < 0 ? 'g-neg' : v < r.colchon ? 'g-bajo' : 'g-ok';
      s += `<rect x="${x(d.dia) + 3}" y="${top}" width="${bw - 6}" height="${alto}" class="g-barra ${clase}"><title>${nombreDia(d.dia)}: lo más bajo del día ${q(v)}</title></rect>`;
      if (v < r.colchon) s += `<rect x="${x(d.dia) + 3}" y="${top}" width="${bw - 6}" height="${alto}" fill="url(#${etiquetas.id}-ray)" class="g-trama"/>`;
    });
    if (ref) ref.dias.slice(1).forEach((d) => {
      s += `<line x1="${x(d.dia) + 1}" x2="${x(d.dia) + bw - 1}" y1="${y(d.min)}" y2="${y(d.min)}" class="g-ref"/>`;
    });
    s += `<line x1="${L}" x2="${W - R}" y1="${y(r.colchon)}" y2="${y(r.colchon)}" class="g-colchon"/>`;
    s += `<text x="${W - R - 4}" y="${y(r.colchon) - 7}" text-anchor="end" class="g-eje g-fuerte g-etq">Colchón ${q(r.colchon)}</text>`;
    if (r.bajo.dia) {
      const bx = x(r.bajo.dia) + bw / 2, by = y(r.bajo.saldo);
      const izq = r.bajo.dia > 18;
      const ty = r.bajo.saldo < 0 ? by + 26 : by - 14;
      s += `<text x="${bx + (izq ? -10 : 10)}" y="${Math.min(H - B - 4, Math.max(T + 14, ty))}" text-anchor="${izq ? 'end' : 'start'}" class="g-nota">Lo más bajo: ${q(r.bajo.saldo)} · ${nombreDia(r.bajo.dia)}</text>`;
    }
    for (let d = 1; d <= 28; d++) s += `<text x="${x(d) + bw / 2}" y="${H - B + 18}" text-anchor="middle" class="g-eje g-dia">${d}</text>`;
    s += '</svg>';
    cont.innerHTML = s;
  }

  function veredicto(r, faltantes) {
    if (faltantes && faltantes.length) return `<p class="veredicto-txt" data-estado="pendiente"><span class="v-icono" aria-hidden="true">?</span><b>No se puede concluir</b></p><p class="pequeno">Faltan datos: ${esc(faltantes.slice(0, 3).join('; '))}${faltantes.length > 3 ? '…' : ''}. Un dato desconocido no se cuenta como cero.</p>`;
    const est = r.alcanza ? 'alcanza' : r.bajo.saldo < 0 ? 'falta' : 'bajo';
    const titulo = r.alcanza ? 'Alcanza' : 'No alcanza';
    const detalle = r.alcanza
      ? `Lo más bajo (${q(r.bajo.saldo)}, ${nombreDia(r.bajo.dia || 1)}) queda arriba de tu colchón (${q(r.colchon)}).`
      : r.bajo.saldo < 0
        ? `El ${nombreDia(r.bajo.dia)} faltarían ${q(-r.bajo.saldo)}. Para no bajar del colchón harían falta ${q(r.faltaParaColchon)} más ese día.`
        : `El ${nombreDia(r.bajo.dia)} quedaría ${q(r.bajo.saldo)}: no falta dinero, pero bajas de tu colchón por ${q(r.faltaParaColchon)}.`;
    return `<p class="veredicto-txt" data-estado="${est}"><span class="v-icono" aria-hidden="true">${r.alcanza ? '✓' : '✗'}</span><b>${titulo}</b></p><p class="pequeno">${detalle}</p>`;
  }

  function calendario(cont, r, alElegir) {
    let h = '<div class="cal-cab">' + DC.map((d) => `<span>${d}</span>`).join('') + '</div><div class="cal-cuerpo">';
    for (let d = 1; d <= 28; d++) {
      const x = r.dias[d];
      const est = x.min < 0 ? 'neg' : x.min < r.colchon ? 'bajo' : 'ok';
      const marca = est === 'neg' ? '<em>falta</em>' : est === 'bajo' ? '<em>bajo colchón</em>' : '';
      h += `<button type="button" class="cal-dia" data-estado="${est}" data-dia="${d}" aria-label="${nombreDia(d)}: entra ${q(x.entra)}, sale ${q(x.sale)}, lo más bajo ${q(x.min)}, termina con ${q(x.fin)}">
        <span class="cal-n">${d}</span>${x.movs.length ? `<span class="cal-mov">${x.entra ? `<span>+${q(x.entra).replace('.00', '')}</span>` : ''}${x.sale ? `<span>−${q(x.sale).replace('.00', '')}</span>` : ''}</span>` : '<span class="cal-mov vacio">sin movimientos</span>'}
        <span class="cal-fin">${q(x.fin).replace('.00', '')}</span>${marca}</button>`;
    }
    h += '</div>';
    cont.innerHTML = h;
    $$('.cal-dia', cont).forEach((b) => b.addEventListener('click', () => { $$('.cal-dia', cont).forEach((o) => o.setAttribute('aria-pressed', o === b)); alElegir(Number(b.dataset.dia)); }));
  }
  function detalleDia(cont, r, d) {
    const x = r.dias[d];
    cont.innerHTML = `<p class="rotulo">${nombreDia(d)} · semana ${Math.ceil(d / 7)}</p>
      <ol class="op"><li><span class="signo"></span><span>Empieza con</span><span class="cifra">${q(x.inicio)}</span></li>
      ${x.movs.map((m) => `<li><span class="signo">${m.sentido === 'entra' ? '+' : '−'}</span><span>${esc(m.desc)} <small>(${MOMENTO[m.momento]})</small></span><span class="cifra">${q(m.monto)}<small> → ${q(m.saldo)}</small></span></li>`).join('') || '<li><span></span><span>Sin movimientos</span><span></span></li>'}
      </ol><p class="op-total"><span>Termina con</span><span class="cifra">${q(x.fin)}</span></p>
      <p class="pequeno">Lo más bajo del día: <b class="cifra">${q(x.min)}</b>${x.min < 0 ? ' · falta dinero' : x.min < r.colchon ? ' · bajo el colchón' : ''}</p>`;
  }

  /* ======================================================================
     Simulador del caso de Ana (pantallas del bloque D)
     ====================================================================== */
  const est = { plan: 'final', prueba: 'ninguna', dia: 25 };
  const NOMBRE_PLAN = { original: 'Plan original, sin pedido', final: 'Pedido: paga todo el viernes 26', entrega: 'Pedido: paga cada entrega' };
  const NOMBRE_PRUEBA = { ninguna: 'sin prueba', atraso: 'atraso de una semana en el pago', imprevisto: 'imprevisto de Q250.00 el martes 16' };
  function pintarAna() {
    const { movs, avisos } = movsAna(est.plan, est.prueba);
    const r = simular(SALDO_ANA, movs, COLCHON_ANA);
    const ref = est.plan === 'original' && est.prueba === 'ninguna' ? null : simular(SALDO_ANA, baseAna(), COLCHON_ANA);
    $$('[data-ana-plan]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.anaPlan === est.plan));
    $$('[data-ana-prueba]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.anaPrueba === est.prueba));
    $$('.ana-escenario').forEach((e) => { e.textContent = NOMBRE_PLAN[est.plan] + (est.prueba !== 'ninguna' ? ' · simulación: ' + NOMBRE_PRUEBA[est.prueba] : ''); });
    const g = $('#ana-grafico');
    if (g) grafico(g, r, ref, { id: 'ga', aria: `Saldo más bajo de cada día. ${NOMBRE_PLAN[est.plan]}. Lo más bajo: ${q(r.bajo.saldo)} el ${nombreDia(r.bajo.dia || 1)}.` });
    const v = $('#ana-veredicto');
    if (v) v.innerHTML = veredicto(r);
    const res = $('#ana-resumen');
    if (res) res.innerHTML = `
      <tr><td>Saldo inicial</td><td class="num">${q(r.saldoInicial)}</td></tr>
      <tr><td>Lo más bajo</td><td class="num">${q(r.bajo.saldo)}</td></tr>
      <tr><td>Cuándo</td><td class="num">${r.bajo.dia ? nombreDia(r.bajo.dia) : '—'}</td></tr>
      <tr><td>Días bajo el colchón</td><td class="num">${r.diasBajoColchon}</td></tr>
      <tr><td>Saldo al final del día 28</td><td class="num">${q(r.fin)}</td></tr>`;
    const av = $('#ana-avisos');
    if (av) av.innerHTML = avisos.map((a) => `<p>${esc(a)}</p>`).join('') + (ref ? '<p>La raya fina sobre cada día es el plan original, para comparar.</p>' : '');
    const cal = $('#ana-calendario');
    if (cal) {
      calendario(cal, r, (d) => { est.dia = d; detalleDia($('#ana-dia'), r, d); });
      const b = $(`.cal-dia[data-dia="${est.dia}"]`, cal);
      if (b) b.setAttribute('aria-pressed', 'true');
      detalleDia($('#ana-dia'), r, est.dia);
    }
  }
  document.addEventListener('click', (e) => {
    const p = e.target.closest('[data-ana-plan]');
    if (p) { est.plan = p.dataset.anaPlan; pintarAna(); return; }
    const t = e.target.closest('[data-ana-prueba]');
    if (t) { est.prueba = t.dataset.anaPrueba; pintarAna(); return; }
    if (e.target.closest('[data-ana-reiniciar]')) { est.plan = 'final'; est.prueba = 'ninguna'; est.dia = 25; pintarAna(); window.avisar && window.avisar('Simulador del caso de Ana reiniciado: pedido como lo ofrecen, sin prueba.'); }
  });
  if ($('#ana-grafico')) pintarAna();

  // Gráficos fijos de las pantallas explicativas (datos del caso, no editables)
  $$('[data-grafico-fijo]').forEach((g) => {
    const [plan, prueba, conRef] = g.dataset.graficoFijo.split(':');
    const r = window.escenarioAna(plan, prueba);
    const ref = conRef ? window.escenarioAna(conRef, 'ninguna') : null;
    grafico(g, r, ref, { id: 'gf' + Math.random().toString(36).slice(2, 7), aria: g.dataset.aria || '' });
  });

  /* ======================================================================
     Planificador de 4 semanas: caso Lucía o datos propios (bloque E)
     ====================================================================== */
  const nuevoId = () => 'f-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fila = (dia, momento, desc, sentido, monto, extra = {}) => ({ id: nuevoId(), dia: String(dia), momento: String(momento), desc, sentido, monto: String(monto), estado: 'previsto', repite: false, decision: false, ...extra });
  const LUCIA = () => ({
    saldo: '500', colchon: '100',
    filas: [
      fila(1, 2, 'Cobro a la maestra Elena (fiado)', 'entra', 30),
      fila(5, 1, 'Recarga de gas', 'sale', 135),
      fila(19, 1, 'Recarga de gas', 'sale', 135),
      fila(6, 3, 'Devolver el préstamo a Carmen', 'sale', 200),
      fila(6, 1, 'Insumos del sábado', 'sale', 180, { repite: true }),
      fila(6, 2, 'Ventas del sábado', 'entra', 400, { repite: true }),
      fila(6, 3, 'Pago a Doña Tere', 'sale', 60, { repite: true }),
      fila(6, 3, 'Retiro personal', 'sale', 40, { repite: true }),
      fila(7, 1, 'Insumos del domingo', 'sale', 180, { repite: true }),
      fila(7, 2, 'Ventas del domingo', 'entra', 400, { repite: true }),
      fila(7, 3, 'Retiro personal', 'sale', 40, { repite: true }),
      fila(1, 1, 'Plancha nueva, al contado', 'sale', 600, { decision: true }),
    ],
  });
  const PROPIO = () => ({ saldo: '', colchon: '', filas: [fila('', 1, '', 'sale', '')] });
  const CLAVE = 'taller03:plan';
  let plan;
  try { plan = JSON.parse(sessionStorage.getItem(CLAVE)); } catch (e) { plan = null; }
  if (!plan || !plan.datos || !plan.datos.lucia || !plan.datos.propio) plan = { activo: 'lucia', datos: { lucia: LUCIA(), propio: PROPIO() } };
  const guardarPlan = () => { try { sessionStorage.setItem(CLAVE, JSON.stringify(plan)); } catch (e) { /* sigue en memoria */ } };
  const P = () => plan.datos[plan.activo];

  // Convierte las filas en movimientos; devuelve también lo que falta
  function prepararPlan(d) {
    const faltan = [], errores = [];
    const saldo = centavos(d.saldo);
    const colchon = centavos(d.colchon);
    if (saldo === null) faltan.push('el saldo con el que empiezas');
    if (Number.isNaN(saldo)) errores.push('El saldo inicial no es un monto válido.');
    if (Number.isNaN(colchon)) errores.push('El colchón no es un monto válido.');
    const sin = [], con = [];
    d.filas.forEach((f, i) => {
      if (!f.desc && !f.monto && !f.dia) return;
      const n = `fila ${i + 1}${f.desc ? ' («' + f.desc.slice(0, 30) + '»)' : ''}`;
      const c = centavos(f.monto);
      const dia = Number(f.dia);
      if (Number.isNaN(c)) { errores.push(`En la ${n}, el monto «${f.monto}» no es válido. Escribe solo el número, por ejemplo 150.50.`); return; }
      if (!dia) { faltan.push(`el día de la ${n}`); return; }
      if (c === null) { faltan.push(`el monto de la ${n}`); return; }
      const dias = f.repite ? [dia, dia + 7, dia + 14, dia + 21].filter((x) => x <= 28) : [dia];
      dias.forEach((x) => {
        const m = { dia: x, momento: Number(f.momento) || 2, sentido: f.sentido, monto: c, desc: f.desc || (f.sentido === 'entra' ? 'Entrada' : 'Salida'), grupo: f.decision ? 'decision' : 'base', estado: f.estado };
        con.push(m);
        if (!f.decision) sin.push(m);
      });
    });
    const hayDecision = d.filas.some((f) => f.decision && (f.desc || f.monto));
    return { saldo, colchon: colchon ?? 0, sinColchon: colchon === null, sin, con, faltan, errores, hayDecision, previstos: d.filas.filter((f) => f.estado === 'previsto' && (f.desc || f.monto)).length, total: d.filas.filter((f) => f.desc || f.monto).length };
  }
  window.prepararPlan = prepararPlan;

  const opcionesDia = (sel) => '<option value="">Día…</option>' + Array.from({ length: 28 }, (_, i) => i + 1).map((d) => `<option value="${d}"${String(d) === String(sel) ? ' selected' : ''}>${DC[(d - 1) % 7]} ${d}</option>`).join('');
  function pintarFilas() {
    const d = P();
    $('#plan-saldo').value = d.saldo;
    $('#plan-colchon').value = d.colchon;
    $('#plan-filas').innerHTML = d.filas.map((f, i) => `
      <tr data-id="${esc(f.id)}">
        <td class="n">${i + 1}</td>
        <td><select data-campo="dia" aria-label="Fila ${i + 1}: día">${opcionesDia(f.dia)}</select></td>
        <td><select data-campo="momento" aria-label="Fila ${i + 1}: momento del día">${[1, 2, 3].map((m) => `<option value="${m}"${String(m) === String(f.momento) ? ' selected' : ''}>${MOMENTO[m]}</option>`).join('')}</select></td>
        <td><input type="text" data-campo="desc" value="${esc(f.desc)}" placeholder="Qué es" aria-label="Fila ${i + 1}: qué es"></td>
        <td><select data-campo="sentido" aria-label="Fila ${i + 1}: entra o sale"><option value="entra"${f.sentido === 'entra' ? ' selected' : ''}>Entra</option><option value="sale"${f.sentido === 'sale' ? ' selected' : ''}>Sale</option></select></td>
        <td><span class="campo-q"><span aria-hidden="true">Q</span><input type="text" inputmode="decimal" data-campo="monto" value="${esc(f.monto)}" placeholder="0.00" aria-label="Fila ${i + 1}: monto"></span></td>
        <td><select data-campo="estado" aria-label="Fila ${i + 1}: estado"><option value="previsto"${f.estado === 'previsto' ? ' selected' : ''}>Previsto</option><option value="confirmado"${f.estado === 'confirmado' ? ' selected' : ''}>Confirmado</option></select></td>
        <td class="ck"><input type="checkbox" data-campo="repite"${f.repite ? ' checked' : ''} aria-label="Fila ${i + 1}: se repite cada semana"></td>
        <td class="ck"><input type="checkbox" data-campo="decision"${f.decision ? ' checked' : ''} aria-label="Fila ${i + 1}: es parte de la decisión"></td>
        <td><button type="button" class="quitar" data-quitar="${esc(f.id)}" aria-label="Quitar fila ${i + 1}" title="Quitar fila"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></button></td>
      </tr>`).join('');
    validar();
  }
  function validar() {
    $$('#plan-filas [data-campo="monto"], #plan-saldo, #plan-colchon').forEach((i) => i.setAttribute('aria-invalid', Number.isNaN(centavos(i.value)) ? 'true' : 'false'));
  }
  function pintarPlan() {
    const d = P();
    $$('[data-conjunto3]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.conjunto3 === plan.activo));
    $$('.plan-etiqueta').forEach((e) => { e.textContent = plan.activo === 'lucia' ? 'Caso alternativo · Lucía (ficticio)' : 'Tus datos · solo en este navegador'; e.dataset.tipo = plan.activo === 'lucia' ? 'lucia' : 'propio'; });
    $$('.pantalla[data-plan]').forEach((p) => {
      p.dataset.caso = plan.activo === 'lucia' ? 'Práctica · caso Lucía' : 'Práctica · tus datos';
      const c = $('.corrido .caso', p);
      if (c) { c.textContent = p.dataset.caso; c.dataset.tipo = plan.activo === 'lucia' ? 'lucia' : 'propio'; }
    });
    $$('.solo-lucia3').forEach((e) => { e.hidden = plan.activo !== 'lucia'; });
    const pr = prepararPlan(d);
    const avisos = [...pr.errores.map((x) => `<li class="error">${esc(x)}</li>`), ...pr.faltan.map((x) => `<li>Falta ${esc(x)}</li>`)];
    if (pr.sinColchon && !pr.errores.length) avisos.push('<li>Sin colchón anotado: se compara contra Q0.00.</li>');
    if (!pr.hayDecision) avisos.push('<li>Marca en «Decisión» las filas que dependen de lo que quieres decidir.</li>');
    $$('.plan-avisos').forEach((u) => { u.innerHTML = avisos.length ? avisos.join('') : '<li class="ok">Todo con día y monto.</li>'; });
    $('#plan-cuenta').innerHTML = `<b class="cifra">${pr.total}</b> filas · <b class="cifra">${pr.previstos}</b> previstas · <b class="cifra">${pr.total - pr.previstos}</b> confirmadas`;
    const puede = !pr.errores.length && !pr.faltan.length;
    const sin = puede ? simular(pr.saldo, pr.sin, pr.colchon) : null;
    const con = puede ? simular(pr.saldo, pr.con, pr.colchon) : null;
    const g = $('#plan-grafico');
    if (puede) grafico(g, con, pr.hayDecision ? sin : null, { id: 'gp', aria: `Saldo más bajo de cada día con la decisión. Lo más bajo: ${q(con.bajo.saldo)}.` });
    else g.innerHTML = '<p class="no-calc"><b>Todavía no se puede dibujar.</b> Completa lo que falta: un dato desconocido no se cuenta como cero.</p>';
    $('#plan-sin').innerHTML = puede ? veredicto(sin) : veredicto(null, pr.faltan.length ? pr.faltan : pr.errores);
    $('#plan-con').innerHTML = !pr.hayDecision ? '<p class="pequeno">No hay filas marcadas como decisión.</p>' : puede ? veredicto(con) : veredicto(null, pr.faltan.length ? pr.faltan : pr.errores);
    $('#plan-tabla').innerHTML = puede ? `
      <tr><th></th><th class="num">Sin la decisión</th><th class="num">Con la decisión</th></tr>
      <tr><td>Lo más bajo</td><td class="num">${q(sin.bajo.saldo)}</td><td class="num">${q(con.bajo.saldo)}</td></tr>
      <tr><td>Cuándo</td><td class="num">${sin.bajo.dia ? nombreDia(sin.bajo.dia) : 'al inicio'}</td><td class="num">${con.bajo.dia ? nombreDia(con.bajo.dia) : 'al inicio'}</td></tr>
      <tr><td>Días bajo el colchón</td><td class="num">${sin.diasBajoColchon}</td><td class="num">${con.diasBajoColchon}</td></tr>
      <tr><td>Saldo al final del día 28</td><td class="num">${q(sin.fin)}</td><td class="num">${q(con.fin)}</td></tr>` : '';
    $('#plan-texto').value = textoPlan(d, pr, sin, con);
    return { pr, sin, con };
  }
  function textoPlan(d, pr, sin, con) {
    const l = [`Plan de caja de 4 semanas (práctica) · ${plan.activo === 'lucia' ? 'caso Lucía' : 'mi negocio'}`, `Saldo inicial: ${pr.saldo === null ? 'pendiente' : q(pr.saldo)} · Colchón: ${q(pr.colchon)}`];
    d.filas.forEach((f, i) => {
      if (!f.desc && !f.monto) return;
      l.push(`${i + 1}. ${f.dia ? nombreDia(Number(f.dia)) : 'día pendiente'}, ${MOMENTO[f.momento] || ''} · ${f.desc || '(sin descripción)'} · ${f.sentido === 'entra' ? 'entra' : 'sale'} ${centavos(f.monto) === null ? 'monto pendiente' : q(centavos(f.monto))} · ${f.estado}${f.repite ? ' · cada semana' : ''}${f.decision ? ' · DECISIÓN' : ''}`);
    });
    if (sin && con) {
      l.push(`Sin la decisión: lo más bajo ${q(sin.bajo.saldo)} (${sin.bajo.dia ? nombreDia(sin.bajo.dia) : 'al inicio'}), final ${q(sin.fin)}.`);
      l.push(`Con la decisión: lo más bajo ${q(con.bajo.saldo)} (${con.bajo.dia ? nombreDia(con.bajo.dia) : 'al inicio'}), final ${q(con.fin)}.`);
    } else l.push('Resultado: pendiente, faltan datos.');
    return l.join('\n');
  }

  if ($('#plan-filas')) {
    const todo = () => { pintarFilas(); pintarPlan(); guardarPlan(); };
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-conjunto3]');
      if (b) { plan.activo = b.dataset.conjunto3; todo(); return; }
      const qb = e.target.closest('#plan-filas [data-quitar]');
      if (qb) {
        P().filas = P().filas.filter((f) => f.id !== qb.dataset.quitar);
        if (!P().filas.length) P().filas.push(fila('', 1, '', 'sale', ''));
        todo();
      }
    });
    $('#plan-agregar').addEventListener('click', () => {
      P().filas.push(fila('', 1, '', 'sale', ''));
      todo();
      const u = $$('#plan-filas tr').pop();
      if (u) { $('[data-campo="dia"]', u).focus(); u.scrollIntoView({ block: 'nearest' }); }
    });
    const cambio = (e) => {
      const tr = e.target.closest('tr');
      const f = tr && P().filas.find((x) => x.id === tr.dataset.id);
      if (!f) return;
      const c = e.target.dataset.campo;
      f[c] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      validar(); pintarPlan(); guardarPlan();
    };
    $('#plan-filas').addEventListener('input', cambio);
    $('#plan-filas').addEventListener('change', cambio);
    [['#plan-saldo', 'saldo'], ['#plan-colchon', 'colchon']].forEach(([s, k]) => $(s).addEventListener('input', (e) => { P()[k] = e.target.value; validar(); pintarPlan(); guardarPlan(); }));
    $$('[data-plan-reiniciar]').forEach((b) => b.addEventListener('click', () => {
      if (plan.activo === 'propio') {
        const hay = P().saldo || P().filas.some((f) => f.desc || f.monto);
        if (hay && !window.confirm('¿Borrar tus datos de práctica?')) return;
        plan.datos.propio = PROPIO();
      } else plan.datos.lucia = LUCIA();
      todo();
      window.avisar && window.avisar(plan.activo === 'lucia' ? 'Caso Lucía reiniciado: plancha al contado el lunes 1.' : 'Tus datos de práctica quedaron en blanco.');
    }));
    todo();
  }
})();
