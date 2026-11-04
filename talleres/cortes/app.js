// Mi plan de cortes — interfaz.
import * as store from './src/store.js';
import * as backup from './src/backup.js';
import { pack, validate, inputKey, pieceCode, ALGO_VERSION, UNIT_LABEL } from './src/engine.js';
import { verifyPlan } from './src/verify.js';
import { demoProject, DEMO_NAME } from './src/demo.js';
import { html, raw, esc, toast, ask, confirmAction, route, go, fmtDate, stampedName } from './shared/ui.js';
import { parseAmount, formatNumber, defaultDecimalSep } from './shared/numbers.js';
import { saveFile, printPage } from './shared/native.js';
import { askPersistence } from './shared/db.js';

export const APP_VERSION = '1.0.0';
const view = document.getElementById('view');
const settings = { sep: '.' };
const n = (v) => formatNumber(v, settings.sep);
const plural = (c, one, many) => `${c} ${c === 1 ? one : many}`;
const U = (p) => UNIT_LABEL[p.unit] || p.unit;
const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => { t = null; fn(...a); }, ms); }; d.flush = (...a) => { if (t) { clearTimeout(t); t = null; return fn(...a); } }; return d; };
const timeOnly = (iso) => new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const ICON_BACK = raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>');
const bar = (title, back = '#/') => html`<header class="bar"><a class="icon-btn" href="${back}" aria-label="Volver">${ICON_BACK}</a><span class="bar-title">${title}</span></header>`;
const demoTag = (r) => (r && r.demo ? html` <span class="tag tag-demo">Ejemplo</span>` : '');
const notFound = () => html`${bar('No encontrado')}<section class="section"><p class="empty"><strong>Este proyecto ya no existe.</strong></p><a class="btn" href="#/">Ir al inicio</a></section>`;

// ══════════════ INICIO ══════════════
async function vInicio() {
  const list = (await store.all()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return html`
  <header class="masthead">
    <p class="kicker"><span class="num">01</span> Aprovechar</p>
    <h1 class="headline">Mi plan <em>de cortes</em></h1>
    <p class="mast-sub">Distribuye piezas rectangulares en tu material antes de cortar.</p>
  </header>
  <section class="section">
    <div class="actions"><button class="btn btn-primary" data-action="new-project">+ Nuevo proyecto</button></div>
    <h2 class="h-rule">Proyectos <span>${list.length}</span></h2>
    ${list.length ? html`<ul class="list">${list.map((p) => {
      const total = p.pieces.reduce((s, x) => s + (Number.isInteger(x.qty) ? x.qty : 0), 0);
      const fresh = p.plan && p.plan.key === inputKey(p);
      return html`<li><a class="row" href="#/proyecto/${p.id}"><span class="row-main"><span class="row-title">${p.name}${demoTag(p)}</span>
        <span class="row-meta">${p.material.name || 'Material sin nombre'} · ${plural(total, 'pieza', 'piezas')} · ${p.plan ? (fresh ? `plano del ${fmtDate(p.plan.createdAt)}` : 'plano desactualizado') : 'sin plano'}</span></span><span class="row-end">›</span></a></li>`;
    })}</ul>` : html`<div class="empty"><strong>Aún no hay proyectos.</strong>Crea uno o carga el ejemplo «${DEMO_NAME}» (cajas y cuadros de cartón) para practicar.</div>
      <button class="btn" data-action="load-demo">Cargar el ejemplo «${DEMO_NAME}»</button>`}
  </section>`;
}

// ══════════════ PROYECTO (datos) ══════════════
let ed = null; // { p, invalid: Map<key, raw> }
const saveSoon = debounce(async () => {
  if (!ed) return;
  await store.save(ed.p);
  const el = document.querySelector('[data-saved]');
  if (el) el.textContent = `Guardado en el teléfono · ${timeOnly(ed.p.updatedAt)}`;
  updateSummary();
}, 400);

async function vProyecto({ args }) {
  const p = await store.get(args[0]);
  if (!p) return notFound();
  ed = { p, invalid: new Map() };
  return projectHtml();
}

function numField(key, label, value, { hint = '', unit = '', integer = false, id = key } = {}) {
  const bad = ed.invalid.has(id);
  return html`<label class="field"><span class="label">${label}</span>
    <span class="num-wrap"><input class="input num" inputmode="${integer ? 'numeric' : 'decimal'}" autocomplete="off" data-n="${key}" data-id="${id}" value="${bad ? ed.invalid.get(id) : n(value)}" placeholder="Sin dato" aria-invalid="${bad}">${unit ? html`<span class="num-unit">${unit}</span>` : ''}</span>
    ${hint ? html`<span class="hint">${hint}</span>` : ''}<span class="err" data-err="${id}" ${bad ? '' : 'hidden'}></span></label>`;
}

function projectHtml() {
  const p = ed.p; const u = U(p);
  return html`${bar('Proyecto de corte')}
  <form class="project" data-form="project" novalidate>
  <section class="section">
    <label class="field"><span class="label">Nombre del proyecto</span><input class="input input-title" data-t="name" value="${p.name}" autocomplete="off"></label>
    <label class="check"><input type="checkbox" data-t="demo" ${p.demo ? 'checked' : ''}> Es de práctica: marcarlo como <span class="tag tag-demo">Ejemplo</span></label>
    <p class="saved-state" data-saved>Los cambios se guardan solos en el teléfono.</p>
  </section>

  <section class="section">
    <p class="kicker"><span class="num">01</span> Material</p>
    <label class="field"><span class="label">Material</span><input class="input" data-t="material.name" value="${p.material.name}" placeholder="Ej.: Cartón gris 2 mm" autocomplete="off"></label>
    <fieldset class="field"><legend class="label">Unidad de todo el proyecto</legend>
      <div class="seg">${['mm', 'cm', 'in'].map((x) => html`<label class="seg-opt"><input type="radio" name="unit" value="${x}" data-t="unit" ${p.unit === x ? 'checked' : ''}><span>${x === 'in' ? 'pulgadas' : x === 'cm' ? 'centímetros' : 'milímetros'}</span></label>`)}</div>
      <span class="hint">Cambiar la unidad no convierte los números: revísalos.</span></fieldset>
    <div class="two">
      ${numField('material.width', 'Ancho (→)', p.material.width, { unit: u })}
      ${numField('material.height', 'Largo (↓)', p.material.height, { unit: u })}
    </div>
    ${numField('material.quantity', 'Planchas o piezas disponibles', p.material.quantity, { integer: true, unit: 'unid.' })}
    <div class="two">
      ${numField('kerf', 'Separación de corte', p.kerf, { unit: u, hint: 'Lo que se pierde en cada corte: grosor de la sierra o margen de seguridad.' })}
      ${numField('margin', 'Margen del borde', p.margin, { unit: u, hint: 'Borde de la plancha que no se usa.' })}
    </div>
    ${numField('minLeftover', 'Sobrante útil desde', p.minLeftover, { unit: u, hint: 'Retazos más chicos que esto se cuentan como desperdicio.' })}
  </section>

  <section class="section">
    <p class="kicker"><span class="num">02</span> Piezas</p>
    <p class="hint">El ancho va en la dirección → del material y el largo en la dirección ↓. Desmarca «Se puede girar» si la veta, el estampado o el doblez obligan a respetar la orientación.</p>
    <ol class="pieces">${p.pieces.map((pc, i) => html`<li class="piece" data-pid="${pc.id}">
      <span class="pcode" aria-hidden="true">${pieceCode(i)}</span>
      <div class="pbody">
        <label class="field"><span class="label">Pieza ${pieceCode(i)} · nombre</span><input class="input" data-pt="label" data-pid="${pc.id}" value="${pc.label}" placeholder="Ej.: Base de caja" autocomplete="off"></label>
        <div class="three">
          ${numField('width', 'Ancho', pc.width, { unit: u, id: `${pc.id}:width` })}
          ${numField('height', 'Largo', pc.height, { unit: u, id: `${pc.id}:height` })}
          ${numField('qty', 'Cantidad', pc.qty, { integer: true, id: `${pc.id}:qty` })}
        </div>
        <div class="prow"><label class="check"><input type="checkbox" data-pt="rotate" data-pid="${pc.id}" ${pc.rotate ? 'checked' : ''}> Se puede girar</label>
        <button type="button" class="btn btn-quiet" data-action="remove-piece" data-pid="${pc.id}">Quitar pieza</button></div>
      </div></li>`)}</ol>
    <button type="button" class="btn" data-action="add-piece">+ Agregar pieza</button>
  </section>

  <section class="section">
    <p class="kicker"><span class="num">03</span> Notas</p>
    <textarea class="input" data-t="notes" aria-label="Notas del proyecto">${p.notes}</textarea>
  </section>

  <section class="section danger-zone">
    <button type="button" class="btn" data-action="duplicate">Duplicar proyecto</button>
    <button type="button" class="btn btn-danger" data-action="delete">Eliminar proyecto</button>
  </section>

  <div class="savebar">
    <div class="savebar-state" data-summary></div>
    <button type="submit" class="btn btn-primary btn-block">Generar plano</button>
  </div>
  </form>`;
}

function updateSummary() {
  const el = document.querySelector('[data-summary]');
  if (!el || !ed) return;
  const p = ed.p;
  const total = p.pieces.reduce((s, x) => s + (Number.isInteger(x.qty) ? x.qty : 0), 0);
  const area = p.pieces.reduce((s, x) => s + (x.width || 0) * (x.height || 0) * (Number.isInteger(x.qty) ? x.qty : 0), 0);
  const fresh = p.plan && p.plan.key === inputKey(p);
  el.innerHTML = String(html`${plural(total, 'pieza', 'piezas')} · ${n(Math.round(area * 100) / 100)} ${U(p)}² de piezas
    ${p.plan ? (fresh ? html` · <a href="#/plano/${p.id}">Ver plano guardado</a>` : html` · <strong>el plano guardado ya no coincide</strong>`) : ''}`);
}

function setPath(obj, path, value) { const ks = path.split('.'); let o = obj; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = value; }

function onInput(t) {
  const p = ed.p;
  if (t.dataset.t) {
    if (t.dataset.t === 'unit') { if (t.checked) { p.unit = t.value; refreshUnits(); } }
    else if (t.dataset.t === 'demo') p.demo = t.checked;
    else setPath(p, t.dataset.t, t.value);
  } else if (t.dataset.pt) {
    const pc = p.pieces.find((x) => x.id === t.dataset.pid);
    if (t.dataset.pt === 'rotate') pc.rotate = t.checked; else pc[t.dataset.pt] = t.value;
  } else if (t.dataset.n) {
    const key = t.dataset.n; const id = t.dataset.id;
    const integer = key === 'qty' || key === 'material.quantity';
    const r = parseAmount(t.value, { unit: p.unit === 'in' ? 'in' : p.unit, integer });
    const err = view.querySelector(`[data-err="${CSS.escape(id)}"]`);
    if (r.ok) {
      ed.invalid.delete(id); t.setAttribute('aria-invalid', 'false'); err.hidden = true;
      if (id.includes(':')) { const [pid, f] = id.split(':'); p.pieces.find((x) => x.id === pid)[f] = r.value; } else setPath(p, key, r.value);
    } else { ed.invalid.set(id, t.value); t.setAttribute('aria-invalid', 'true'); err.hidden = false; err.textContent = r.error; }
  } else return;
  saveSoon();
}
function refreshUnits() { for (const el of view.querySelectorAll('.num-unit')) if (el.textContent !== 'unid.') el.textContent = U(ed.p); }

async function generate() {
  if (ed.invalid.size) { toast('Hay números que no son válidos. Revisa los campos marcados.', 'error'); view.querySelector('[aria-invalid="true"]')?.focus(); return; }
  const p = ed.p;
  const errors = validate(p);
  if (errors.length) {
    await ask({ title: 'Faltan datos para calcular', body: String(html`<ul>${errors.map((e) => html`<li>${e.message}</li>`)}</ul><p>La app no inventa medidas: completa estos datos y vuelve a intentarlo.</p>`), options: [{ label: 'Entendido', value: true, kind: 'primary' }] });
    return;
  }
  const result = pack(p);
  const problems = verifyPlan(p, result);
  p.plan = { key: inputKey(p), createdAt: new Date().toISOString(), result, problems, appVersion: APP_VERSION };
  await saveSoon.flush(); await store.save(p);
  toast(result.pending.length ? `Plano generado. ${plural(result.pending.length, 'pieza quedó pendiente', 'piezas quedaron pendientes')}.` : 'Plano generado y comprobado.', result.pending.length ? 'info' : 'ok');
  go(`#/plano/${p.id}`);
}

// ══════════════ PLANO ══════════════
let zoom = 1;
async function vPlano({ args }) {
  const p = await store.get(args[0]);
  if (!p) return notFound();
  if (!p.plan) return html`${bar('Plano', `#/proyecto/${p.id}`)}<section class="section"><p class="empty"><strong>Todavía no hay plano.</strong>Completa el material y las piezas, y toca «Generar plano».</p><a class="btn btn-primary" href="#/proyecto/${p.id}">Ir al proyecto</a></section>`;
  const r = p.plan.result; const u = UNIT_LABEL[r.unit] || r.unit; const st = r.stats;
  const fresh = p.plan.key === inputKey(p);
  const title = `Plano de cortes - ${p.name}`;
  document.title = title;
  const typeLabel = new Map(); r.sheets.forEach((s) => s.placements.forEach((x) => typeLabel.set(x.type, x.label))); r.pending.forEach((x) => typeLabel.set(x.type, x.label));
  return html`<div class="no-print">${bar('Plano', `#/proyecto/${p.id}`)}</div>
  <article class="plan">
  <header class="section plan-head">
    <p class="print-only plan-print-title">Mi plan de cortes</p>
    <h1 class="title">${p.name}${demoTag(p)}</h1>
    <p class="subtitle">${r.material.name || 'Material'} · ${n(r.material.width)} × ${n(r.material.height)} ${u} · separación ${n(r.kerf)} ${u} · margen ${n(r.margin)} ${u} · generado ${fmtDate(p.plan.createdAt)}</p>
    ${!fresh ? html`<p class="notice no-print"><strong>Cambiaste el proyecto después de generar este plano.</strong> Este plano corresponde a los datos anteriores. <a href="#/proyecto/${p.id}">Revisar y generar de nuevo</a></p>` : ''}
    <dl class="stats">
      <div><dt>Piezas colocadas</dt><dd>${st.placed}<small> de ${st.total}</small></dd></div>
      <div><dt>Planchas usadas</dt><dd>${st.sheetsUsed}<small> de ${st.sheetsAvailable}</small></dd></div>
      <div><dt>Aprovechamiento</dt><dd>${n(st.usePct)}<small> %</small></dd></div>
    </dl>
    ${r.pending.length ? html`<div class="alert" role="alert"><p class="alert-title">⚠ ${plural(r.pending.length, 'pieza pendiente', 'piezas pendientes')}: no se pudieron acomodar</p>
      <ul>${groupPending(r.pending).map((g) => html`<li><strong>${g.codes}</strong> · ${g.label} (${n(g.w)} × ${n(g.h)} ${u}): ${g.reasonText}</li>`)}</ul></div>`
      : html`<p class="okline">✓ Todas las piezas tienen lugar en el plano.</p>`}
    ${p.plan.problems.length ? html`<div class="alert" role="alert"><p class="alert-title">✕ La verificación encontró problemas. No cortes con este plano.</p><ul>${p.plan.problems.map((x) => html`<li>${x}</li>`)}</ul></div>`
      : html`<p class="okline">✓ Verificado: ninguna pieza se sale del área útil ni se superpone; entre piezas hay al menos ${n(r.kerf)} ${u}; cantidades completas; los giros respetan lo permitido; se separa con cortes rectos de lado a lado.</p>`}
  </header>

  <div class="zoombar no-print" role="group" aria-label="Ampliación del plano">
    <button class="btn" data-action="zoom" data-z="-1" aria-label="Alejar">−</button>
    <button class="btn" data-action="zoom" data-z="0">Ajustar</button>
    <button class="btn" data-action="zoom" data-z="1" aria-label="Acercar">+</button>
    <span class="zoom-val" data-zoomval>${Math.round(zoom * 100)} %</span>
  </div>

  ${r.sheets.map((s) => html`<section class="sheet">
    <h2 class="h-rule">Plancha ${s.index} de ${r.sheets.length} <span>${plural(s.placements.length, 'pieza', 'piezas')} · ${plural(s.leftovers.length, 'sobrante útil', 'sobrantes útiles')}</span></h2>
    <div class="plan-scroll"><div class="plan-zoom" style="width:${zoom * 100}%">${raw(sheetSvg(r, s))}</div></div>
    <table class="legend"><thead><tr><th>Código</th><th>Pieza</th><th class="r">Medida (${u})</th><th>Posición desde arriba-izq.</th></tr></thead><tbody>
      ${s.placements.map((x) => html`<tr><td class="code">${x.code}</td><td>${x.label}${x.rotated ? html` <span class="rot">girada ↻</span>` : ''}</td><td class="r">${n(x.w)} × ${n(x.h)}</td><td>${n(x.x)} → · ${n(x.y)} ↓</td></tr>`)}
    </tbody></table>
    ${s.leftovers.length ? html`<table class="legend legend-left"><thead><tr><th>Sobrante</th><th class="r">Medida (${u})</th><th>Posición</th></tr></thead><tbody>
      ${s.leftovers.map((l) => html`<tr><td class="code">${l.code}</td><td class="r">${n(l.w)} × ${n(l.h)}</td><td>${n(l.x)} → · ${n(l.y)} ↓</td></tr>`)}</tbody></table>` : ''}
  </section>`)}

  <section class="section method">
    <h2 class="h-rule">Cómo se calculó</h2>
    <ul>
      <li>Todas las piezas son rectángulos. Se colocan sin superponerse, con ${n(r.kerf)} ${u} de separación entre piezas (lo que quita cada corte) y ${n(r.margin)} ${u} de margen en el borde.</li>
      <li>El ancho de cada pieza va en la dirección → del material. Las piezas marcadas «no girar» nunca se giran.</li>
      <li>Cada colocación divide el espacio libre con un corte recto de lado a lado: el plano se puede cortar con cortes de guillotina (sierra, guillotina o cúter con regla).</li>
      <li>Las piezas grandes se acomodan primero. Si no todo cabe, quedan pendientes las que no encontraron lugar, aunque a veces cabrían más piezas chicas dejando fuera una grande.</li>
      <li>Se probaron ${r.attempts} combinaciones de orden y división, y se eligió la que acomoda más piezas con menos planchas. Es una propuesta buena y comprobada, pero no se garantiza que sea la mejor posible.</li>
      <li>Sobrantes útiles: retazos de al menos ${n(r.minLeftover)} × ${n(r.minLeftover)} ${u}. Los más chicos se cuentan como desperdicio.</li>
      <li>Antes de cortar, comprueba las medidas reales del material. Mide dos veces, corta una.</li>
    </ul>
    <p class="small muted">Método ${ALGO_VERSION} · app ${p.plan.appVersion || APP_VERSION}</p>
  </section>
  </article>
  <div class="section no-print"><div class="actions">
    <button class="btn btn-primary" data-action="print" data-title="${title}">Imprimir o guardar PDF</button>
    <a class="btn" href="#/proyecto/${p.id}">Volver al proyecto</a></div></div>`;
}

function groupPending(list) {
  const g = new Map();
  for (const x of list) {
    const k = x.type + x.reason;
    if (!g.has(k)) g.set(k, { ...x, codes: [] });
    g.get(k).codes.push(x.code);
  }
  return [...g.values()].map((x) => ({ ...x, codes: x.codes.join(', ') }));
}

const fmtSvg = (v) => String(Math.round(v * 1000) / 1000);
function sheetSvg(r, s) {
  const W = r.material.width; const H = r.material.height; const m = r.margin; const u = UNIT_LABEL[r.unit] || r.unit;
  const pad = Math.max(W, H) * 0.07;
  const fs = Math.max(W, H) * 0.028;
  const parts = [];
  parts.push(`<svg class="plan-svg" viewBox="${fmtSvg(-pad)} ${fmtSvg(-pad)} ${fmtSvg(W + pad * 1.4)} ${fmtSvg(H + pad * 1.4)}" role="img" aria-label="Plancha ${s.index}: ${s.placements.length} piezas en ${n(W)} por ${n(H)} ${u}" xmlns="http://www.w3.org/2000/svg">`);
  parts.push(`<defs><pattern id="hatch${s.index}" width="${fmtSvg(fs * 0.7)}" height="${fmtSvg(fs * 0.7)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="${fmtSvg(fs * 0.7)}" stroke="#8a7f6a" stroke-width="${fmtSvg(fs * 0.12)}"/></pattern></defs>`);
  // Medidas del material
  parts.push(`<text x="${fmtSvg(W / 2)}" y="${fmtSvg(-pad * 0.35)}" class="dim" font-size="${fmtSvg(fs)}" text-anchor="middle">${esc(n(W))} ${esc(u)} →</text>`);
  parts.push(`<text transform="translate(${fmtSvg(-pad * 0.35)} ${fmtSvg(H / 2)}) rotate(-90)" class="dim" font-size="${fmtSvg(fs)}" text-anchor="middle">${esc(n(H))} ${esc(u)} ←</text>`);
  parts.push(`<rect x="0" y="0" width="${fmtSvg(W)}" height="${fmtSvg(H)}" class="mat" stroke-width="${fmtSvg(fs * 0.12)}"/>`);
  if (m > 0) parts.push(`<rect x="${fmtSvg(m)}" y="${fmtSvg(m)}" width="${fmtSvg(W - 2 * m)}" height="${fmtSvg(H - 2 * m)}" class="margin" stroke-width="${fmtSvg(fs * 0.06)}" stroke-dasharray="${fmtSvg(fs * 0.4)} ${fmtSvg(fs * 0.3)}"/>`);
  for (const l of s.leftovers) {
    parts.push(`<rect x="${fmtSvg(l.x)}" y="${fmtSvg(l.y)}" width="${fmtSvg(l.w)}" height="${fmtSvg(l.h)}" fill="url(#hatch${s.index})" class="left"/>`);
    const lf = Math.min(fs, l.w / 4.5, l.h / 1.6);
    if (lf > fs * 0.3) parts.push(`<text x="${fmtSvg(l.x + l.w / 2)}" y="${fmtSvg(l.y + l.h / 2 + lf * 0.35)}" font-size="${fmtSvg(lf)}" text-anchor="middle" class="left-t"><tspan class="bg">${esc(l.code)}</tspan></text>`);
  }
  for (const x of s.placements) {
    parts.push(`<g class="pc"><rect x="${fmtSvg(x.x)}" y="${fmtSvg(x.y)}" width="${fmtSvg(x.w)}" height="${fmtSvg(x.h)}" stroke-width="${fmtSvg(fs * 0.08)}"/>`);
    const cf = Math.min(fs * 1.25, x.w / Math.max(2.4, x.code.length * 0.75), x.h / 1.5);
    const cx = x.x + x.w / 2; const cy = x.y + x.h / 2;
    const dimsFit = x.h > cf * 2.6 && x.w > fs * 4.5;
    parts.push(`<text x="${fmtSvg(cx)}" y="${fmtSvg(dimsFit ? cy : cy + cf * 0.35)}" font-size="${fmtSvg(cf)}" text-anchor="middle" class="pc-code">${esc(x.code)}${x.rotated ? ' ↻' : ''}</text>`);
    if (dimsFit) parts.push(`<text x="${fmtSvg(cx)}" y="${fmtSvg(cy + cf * 1.05)}" font-size="${fmtSvg(Math.min(cf * 0.6, fs * 0.8))}" text-anchor="middle" class="pc-dim">${esc(n(x.w))} × ${esc(n(x.h))}</text>`);
    parts.push('</g>');
  }
  parts.push('</svg>');
  return parts.join('');
}

// ══════════════ COPIAS ══════════════
async function vCopias() {
  const [last, snap, list] = await Promise.all([store.getMeta('lastBackupAt'), store.getMeta('antesDeRecuperar'), store.all()]);
  const real = list.filter((p) => !p.demo).length; const hasDemo = list.some((p) => p.demo);
  return html`${bar('Copias')}
  <section class="section">
    <p class="kicker"><span class="num">01</span> Guardar una copia</p>
    <p>Guarda en un archivo todos tus proyectos de corte con sus planos. Guárdalo fuera del teléfono para poder pasarlo a otro.</p>
    <p class="muted">${last ? `Última copia: ${fmtDate(last)}.` : 'Todavía no has guardado ninguna copia.'} Hay ${plural(real, 'proyecto propio', 'proyectos propios')} en este teléfono.</p>
    ${hasDemo ? html`<label class="check"><input type="checkbox" data-include-demo> Incluir también el ejemplo</label>` : ''}
    <button class="btn btn-primary btn-block" data-action="save-backup">Guardar una copia</button>
  </section>
  <section class="section">
    <p class="kicker"><span class="num">02</span> Recuperar una copia</p>
    <p>Antes de cambiar nada verás qué contiene la copia y qué pasa con lo que ya tienes.</p>
    <label class="btn btn-block"><input type="file" accept=".zip,application/zip,application/octet-stream,*/*" data-restore-input hidden>Recuperar una copia</label>
    ${snap ? html`<p class="notice">El ${fmtDate(snap.at)} reemplazaste los proyectos con una copia. <button class="btn btn-quiet" data-action="undo-restore">Deshacer y volver a como estaba</button></p>` : ''}
  </section>
  <section class="section">
    <p class="kicker"><span class="num">03</span> Ejemplo del taller</p>
    <p>«${DEMO_NAME}» es un emprendimiento ficticio de artículos decorativos de cartón. Su proyecto queda marcado como <span class="tag tag-demo">Ejemplo</span>.</p>
    ${hasDemo ? html`<button class="btn btn-block" data-action="remove-demo">Quitar el ejemplo</button>` : html`<button class="btn btn-block" data-action="load-demo">Cargar el ejemplo «${DEMO_NAME}»</button>`}
  </section>
  <section class="section">
    <p class="kicker"><span class="num">04</span> Ajustes</p>
    <fieldset class="field"><legend class="label">Decimales</legend>
      <label class="check"><input type="radio" name="sep" value="." data-sep ${settings.sep === '.' ? 'checked' : ''}> Con punto: 19.6</label>
      <label class="check"><input type="radio" name="sep" value="," data-sep ${settings.sep === ',' ? 'checked' : ''}> Con coma: 19,6</label>
      <p class="hint">Al escribir se aceptan los dos.</p></fieldset>
    <h2 class="h-rule">Dónde están tus datos</h2>
    <p class="small">Todo se guarda solo en este teléfono, sin cuentas ni internet. Se conserva al cerrar la app y al instalar una versión nueva. Se pierde si desinstalas la app o borras sus datos: por eso conviene guardar copias.</p>
    <p class="small muted">Versión ${APP_VERSION} · método ${ALGO_VERSION}</p>
  </section>`;
}

async function doRestore(file) {
  let m;
  try { m = await backup.readBackup(new Uint8Array(await file.arrayBuffer())); } catch (e) { toast(e.message, 'error'); return; }
  const plan = await backup.planMerge(m);
  const local = await store.all();
  const body = String(html`<p>Copia del <strong>${fmtDate(m.createdAt)}</strong> con ${plural(m.projects.length, 'proyecto', 'proyectos')}.</p>
    ${local.length ? html`<p><strong>Si eliges «Agregar lo nuevo»</strong>: se suman ${plural(plan.add.length, 'proyecto nuevo', 'proyectos nuevos')}.${plan.kept ? ` ${plural(plan.kept, 'proyecto ya existe', 'proyectos ya existen')} aquí y se conserva${plan.kept === 1 ? '' : 'n'} como está${plan.kept === 1 ? '' : 'n'} en este teléfono.` : ' Nada de lo que ya tienes se modifica.'}</p>` : html`<p>Este teléfono no tiene proyectos, así que no se borra nada.</p>`}`);
  const options = local.length
    ? [{ label: 'Cancelar', value: null }, { label: 'Reemplazar todo', value: 'replace', kind: 'danger' }, { label: 'Agregar lo nuevo', value: 'merge', kind: 'primary' }]
    : [{ label: 'Cancelar', value: null }, { label: 'Recuperar', value: 'merge', kind: 'primary' }];
  const choice = await ask({ title: 'Recuperar una copia', body, options });
  if (!choice) { toast('No se cambió nada.', 'info'); return; }
  if (choice === 'replace') {
    if (!await confirmAction('¿Reemplazar todo?', String(html`<p>Se quitarán ${plural(local.length, 'proyecto', 'proyectos')} de este teléfono y quedará solo el contenido de la copia.</p><p>Antes se guarda internamente el estado actual para poder deshacerlo.</p>`), 'Sí, reemplazar', true)) { toast('No se cambió nada.', 'info'); return; }
    await backup.applyReplace(m);
    toast(`Copia recuperada: ${plural(m.projects.length, 'proyecto', 'proyectos')}.`);
  } else {
    const res = await backup.applyMerge(m);
    toast(`Copia recuperada: se agregaron ${plural(res.add.length, 'proyecto', 'proyectos')}.`);
  }
  render();
}

// ══════════════ EVENTOS ══════════════
view.addEventListener('input', (ev) => { if (ed && ev.target.closest('form[data-form="project"]')) onInput(ev.target); });
view.addEventListener('change', async (ev) => {
  const t = ev.target;
  if (t.matches('[data-restore-input]') && t.files.length) { const f = t.files[0]; t.value = ''; await doRestore(f); return; }
  if (t.matches('[data-sep]')) { settings.sep = t.value; await store.setMeta('settings', { ...settings }); toast('Ajuste guardado.'); return; }
  if (ed && (t.type === 'checkbox' || t.type === 'radio')) onInput(t);
});
view.addEventListener('submit', async (ev) => { ev.preventDefault(); if (ed) await generate(); });

document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-action]');
  if (!b) return;
  try {
    switch (b.dataset.action) {
      case 'new-project': { const p = await store.save(store.blankProject()); go(`#/proyecto/${p.id}`); break; }
      case 'load-demo': { const p = await store.save(store.blankProject(demoProject())); toast(`Ejemplo «${DEMO_NAME}» cargado. Está marcado como EJEMPLO.`); go(`#/proyecto/${p.id}`); break; }
      case 'remove-demo': if (await confirmAction('¿Quitar el ejemplo?', '<p>Se borran solo los proyectos marcados como ejemplo.</p>', 'Quitar ejemplo', true)) { for (const p of (await store.all()).filter((x) => x.demo)) await store.del(p.id); toast('Ejemplo quitado. Tus proyectos siguen igual.'); render(); } break;
      case 'add-piece': ed.p.pieces.push(store.newPiece()); await saveSoon.flush(); await store.save(ed.p); await rerender(`[data-pt="label"][data-pid="${ed.p.pieces.at(-1).id}"]`); break;
      case 'remove-piece': {
        const pc = ed.p.pieces.find((x) => x.id === b.dataset.pid);
        if (pc.label || pc.width !== null || pc.height !== null) { if (!await confirmAction(`¿Quitar «${pc.label || 'esta pieza'}»?`, '<p>Las letras de las piezas siguientes se recorren.</p>', 'Quitar', true)) break; }
        ed.p.pieces = ed.p.pieces.filter((x) => x.id !== pc.id);
        for (const k of [...ed.invalid.keys()]) if (k.startsWith(pc.id)) ed.invalid.delete(k);
        await store.save(ed.p); await rerender(); break;
      }
      case 'duplicate': { await saveSoon.flush(); const c = structuredClone(ed.p); const copy = store.blankProject({ ...c, id: undefined, name: `${c.name} (copia)`, demo: c.demo, plan: null }); copy.id = store.blankProject().id; await store.save(copy); toast('Proyecto duplicado.'); go(`#/proyecto/${copy.id}`); break; }
      case 'delete': if (await confirmAction(`¿Eliminar «${ed.p.name}»?`, '<p>Se borra el proyecto y su plano. No se puede deshacer, salvo que tengas una copia.</p>', 'Eliminar', true)) { const id = ed.p.id; ed = null; await store.del(id); toast('Proyecto eliminado.'); go('#/'); } break;
      case 'zoom': {
        const z = Number(b.dataset.z);
        zoom = z === 0 ? 1 : Math.min(4, Math.max(1, zoom + z * 0.5));
        for (const el of view.querySelectorAll('.plan-zoom')) el.style.width = `${zoom * 100}%`;
        const v = view.querySelector('[data-zoomval]'); if (v) v.textContent = `${Math.round(zoom * 100)} %`;
        break;
      }
      case 'print': printPage(b.dataset.title); break;
      case 'save-backup': {
        const includeDemo = !!view.querySelector('[data-include-demo]')?.checked;
        const { bytes, count } = await backup.buildBackup({ includeDemo, appVersion: APP_VERSION });
        const res = await saveFile(stampedName('Mi plan de cortes - copia', 'zip'), 'application/zip', bytes);
        if (res === 'cancelled') { toast('No se guardó la copia.', 'info'); break; }
        await store.setMeta('lastBackupAt', new Date().toISOString());
        toast(`Copia guardada: ${plural(count, 'proyecto', 'proyectos')}.`);
        render(); break;
      }
      case 'undo-restore': if (await confirmAction('¿Deshacer la recuperación?', '<p>Los proyectos vuelven a como estaban justo antes de reemplazarlos.</p>', 'Deshacer')) { await backup.undoReplace(); toast('Se volvió al estado anterior.'); render(); } break;
    }
  } catch (e) { console.error(e); toast(e.message || 'Algo salió mal.', 'error'); }
});

async function rerender(focusSel) {
  const y = window.scrollY;
  view.innerHTML = String(projectHtml());
  for (const [id, rawText] of ed.invalid) { const err = view.querySelector(`[data-err="${CSS.escape(id)}"]`); if (err) err.textContent = parseAmount(rawText, { unit: ed.p.unit }).error || 'Número no válido'; }
  updateSummary();
  window.scrollTo(0, y);
  if (focusSel) view.querySelector(focusSel)?.focus();
}

// ══════════════ CÓMO FUNCIONA ══════════════
function vMetodo() {
  return html`${bar('Cómo funciona')}
  <section class="section">
    <h1 class="title">Cómo funciona</h1>
    <ol class="steps">
      <li><strong>Material.</strong> Escribe las medidas reales de la plancha y cuántas tienes. Todo el proyecto usa una sola unidad.</li>
      <li><strong>Separación y margen.</strong> La separación es lo que se pierde en cada corte (con sierra, el grosor del disco; con cúter, un margen de seguridad). El margen es el borde de la plancha que no se usa.</li>
      <li><strong>Piezas.</strong> Cada tipo de pieza recibe una letra (A, B, C…) y cada unidad un número: A1, A2… Así se identifican en el plano y al cortar.</li>
      <li><strong>Giro.</strong> «Se puede girar» permite cambiar ancho por largo. Desmárcalo cuando la veta, un estampado o un doblez obligan a respetar la orientación.</li>
      <li><strong>Plano.</strong> La app calcula la distribución con reglas fijas y la comprueba: nada se sale del material, nada se superpone, se respeta la separación y la cantidad pedida. Si algo no cabe, lo marca como pendiente y dice por qué.</li>
      <li><strong>Sobrantes.</strong> Los espacios libres de buen tamaño se numeran (S1.1, S1.2…) para que los guardes y los uses en otro trabajo.</li>
    </ol>
    <h2 class="h-rule">Límites de esta versión</h2>
    <ul class="steps">
      <li>Solo piezas rectangulares y un material por proyecto. No hace patrones de ropa ni formas curvas.</li>
      <li>El plano es una propuesta comprobada, no necesariamente la mejor posible. Si quieres, prueba otro orden de piezas o más planchas.</li>
      <li>La app no estima medidas: si falta un dato, lo pide.</li>
    </ul>
  </section>`;
}

// ══════════════ RUTAS ══════════════
const ROUTES = { inicio: vInicio, proyecto: vProyecto, plano: vPlano, copias: vCopias, metodo: vMetodo };
const TAB_OF = { inicio: 'inicio', proyecto: 'inicio', plano: 'inicio', copias: 'copias', metodo: 'metodo' };
let lastRoute = '';
async function render() {
  const r = route();
  if (ed && r.name !== 'proyecto') { await saveSoon.flush(); ed = null; }
  document.title = 'Mi plan de cortes';
  const fn = ROUTES[r.name] || vInicio;
  try { view.innerHTML = String(await fn(r)); }
  catch (e) { console.error(e); view.innerHTML = String(html`${bar('Error')}<section class="section"><p class="err">No se pudo abrir esta pantalla: ${e.message}</p></section>`); }
  if (r.name === 'proyecto' && ed) updateSummary();
  document.body.dataset.route = r.name;
  for (const a of document.querySelectorAll('.tabs a')) a.toggleAttribute('aria-current', a.dataset.tab === TAB_OF[r.name]);
  if (location.hash !== lastRoute) { window.scrollTo(0, 0); lastRoute = location.hash; }
}
window.addEventListener('hashchange', render);
window.addEventListener('pagehide', () => saveSoon.flush());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveSoon.flush(); });

(async function start() {
  try {
    await store.open();
    Object.assign(settings, { sep: defaultDecimalSep() }, await store.getMeta('settings', {}));
    askPersistence();
    await render();
    document.documentElement.dataset.ready = '1';
  } catch (e) {
    console.error(e);
    view.innerHTML = `<section class="section"><p class="err">No se pudo abrir el almacenamiento del teléfono: ${esc(e.message)}</p></section>`;
  }
})();
