// Mi fichero de trabajos a medida — interfaz.
import * as store from './src/store.js';
import * as backup from './src/backup.js';
import { loadDemo, DEMO_BUSINESS } from './src/demo.js';
import { currentData, diffData, reviewData, search, clone, fieldId, dataFromTemplate } from './src/model.js';
import { html, raw, esc, toast, ask, confirmAction, route, go, fmtDate, stampedName } from './shared/ui.js';
import { parseAmount, formatAmount, formatNumber, UNITS, UNIT_NAMES, defaultDecimalSep } from './shared/numbers.js';
import { preparePhoto } from './shared/images.js';
import { saveFile, printPage } from './shared/native.js';
import { askPersistence } from './shared/db.js';

export const APP_VERSION = '1.0.0';
const view = document.getElementById('view');
const settings = { business: '', sep: '.' };

// ——— Fotos: URL temporales para mostrarlas ———
const photoUrls = new Map();
async function hydratePhotos(root = view) {
  for (const img of root.querySelectorAll('img[data-photo]')) {
    const id = img.dataset.photo;
    if (!photoUrls.has(id)) {
      const p = await store.getPhoto(id);
      photoUrls.set(id, p ? URL.createObjectURL(p.blob) : '');
    }
    const url = photoUrls.get(id);
    if (url) img.src = url; else img.replaceWith(Object.assign(document.createElement('span'), { className: 'photo-missing', textContent: 'Foto no disponible' }));
  }
}

// ——— Piezas comunes ———
const ICON_BACK = raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>');
const bar = (title, back = '#/') => html`<header class="bar"><a class="icon-btn" href="${back}" aria-label="Volver">${ICON_BACK}</a><span class="bar-title">${title}</span></header>`;
const demoTag = (r) => (r && r.demo ? html` <span class="tag tag-demo">Ejemplo</span>` : '');
const amount = (m) => formatAmount(m.value, m.unit, settings.sep);
const unitOptions = (sel) => Object.keys(UNITS).map((u) => html`<option value="${u}" ${u === sel ? 'selected' : ''}>${UNITS[u]}</option>`);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => { t = null; fn(...a); }, ms); }; d.flush = (...a) => { if (t) { clearTimeout(t); t = null; return fn(...a); } }; return d; };
const timeOnly = (iso) => new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function notFound(what = 'Este registro') {
  return html`${bar('No encontrado')}<section class="section"><p class="empty"><strong>${what} ya no existe.</strong>Puede que se haya eliminado o que venga de una copia que no se recuperó.</p><a class="btn" href="#/">Ir al inicio</a></section>`;
}

// ══════════════ INICIO ══════════════
let cache = null;
async function vInicio() {
  const [clients, projects, sheets] = await Promise.all([store.allClients(), store.allProjects(), store.allSheets()]);
  cache = { clients, projects, sheets };
  const cById = new Map(clients.map((c) => [c.id, c]));
  const recent = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const sheetCount = (pid) => sheets.filter((s) => s.projectId === pid).length;
  const last = await store.getMeta('lastBackupAt');
  const hasReal = sheets.some((s) => !s.demo);
  const days = last ? Math.floor((Date.now() - Date.parse(last)) / 864e5) : null;
  const reminder = hasReal && (days === null || days >= 7)
    ? html`<p class="notice no-print"><strong>${days === null ? 'Todavía no guardas una copia.' : `Tu última copia fue hace ${plural(days, 'día', 'días')}.`}</strong> Si pierdes o cambias el teléfono, la copia es lo que te permite recuperar tus fichas. <a href="#/copias">Guardar una copia</a></p>` : '';
  return html`
  <header class="masthead">
    <p class="kicker"><span class="num">${settings.business ? esc(settings.business) : 'Tu archivo'}</span> Medidas y especificaciones</p>
    <h1 class="headline">Mi fichero <em>de trabajos</em> a medida</h1>
  </header>
  <section class="section search-zone">
    <label class="label" for="q">Buscar por cliente, proyecto o ficha</label>
    <input id="q" class="input input-search" type="search" autocomplete="off" placeholder="Ej.: Lucía, cortinas, sala" data-search>
    <div id="results" aria-live="polite"></div>
    <div class="actions"><a class="btn btn-primary" href="#/nuevo-proyecto">+ Nuevo proyecto</a><a class="btn" href="#/cliente/nuevo">+ Nuevo cliente</a></div>
  </section>
  ${reminder}
  <section class="section">
    <h2 class="h-rule">Proyectos recientes <span>${recent.length}</span></h2>
    ${recent.length ? html`<ul class="list">${recent.slice(0, 30).map((p) => html`<li><a class="row" href="#/proyecto/${p.id}">
      <span class="row-main"><span class="row-title">${p.name}${demoTag(p)}</span>
      <span class="row-meta">${cById.get(p.clientId)?.name || 'Sin cliente'} · ${plural(sheetCount(p.id), 'ficha', 'fichas')} · ${p.status === 'entregado' ? 'Entregado' : 'Abierto'} · ${fmtDate(p.updatedAt)}</span></span>
      <span class="row-end" aria-hidden="true">›</span></a></li>`)}</ul>`
      : html`<div class="empty"><strong>Aún no hay proyectos.</strong>Crea tu primer proyecto o carga el ejemplo «${DEMO_BUSINESS}» para practicar. El ejemplo queda marcado y se puede quitar sin tocar tus trabajos.</div>
        <button class="btn" data-action="load-demo">Cargar el ejemplo «${DEMO_BUSINESS}»</button>`}
  </section>`;
}

function renderResults(q) {
  const box = document.getElementById('results');
  if (!box || !cache) return;
  if (!q.trim()) { box.innerHTML = ''; return; }
  const r = search(q, cache);
  const pById = new Map(cache.projects.map((p) => [p.id, p]));
  const cById = new Map(cache.clients.map((c) => [c.id, c]));
  const total = r.clients.length + r.projects.length + r.sheets.length;
  box.innerHTML = String(total === 0 ? html`<p class="empty">No hay resultados para «${q}».</p>` : html`
    ${r.clients.length ? html`<h3 class="h-rule">Clientes</h3><ul class="list">${r.clients.map((c) => html`<li><a class="row" href="#/cliente/${c.id}"><span class="row-main"><span class="row-title">${c.name}${demoTag(c)}</span><span class="row-meta">${c.phone || 'Sin teléfono'}</span></span><span class="row-end">›</span></a></li>`)}</ul>` : ''}
    ${r.projects.length ? html`<h3 class="h-rule">Proyectos</h3><ul class="list">${r.projects.map((p) => html`<li><a class="row" href="#/proyecto/${p.id}"><span class="row-main"><span class="row-title">${p.name}${demoTag(p)}</span><span class="row-meta">${cById.get(p.clientId)?.name || ''}</span></span><span class="row-end">›</span></a></li>`)}</ul>` : ''}
    ${r.sheets.length ? html`<h3 class="h-rule">Fichas</h3><ul class="list">${r.sheets.map((s) => { const p = pById.get(s.projectId); return html`<li><a class="row" href="#/ficha/${s.id}"><span class="row-main"><span class="row-title">${s.title}${demoTag(s)}</span><span class="row-meta">${p?.name || ''} · ${cById.get(p?.clientId)?.name || ''}</span></span><span class="row-end">›</span></a></li>`; })}</ul>` : ''}`);
}

// ══════════════ CLIENTES ══════════════
async function vClientes() {
  const [clients, projects] = await Promise.all([store.allClients(), store.allProjects()]);
  clients.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return html`${bar('Clientes')}
  <section class="section">
    <h1 class="title">Clientes</h1>
    <div class="actions"><a class="btn btn-primary" href="#/cliente/nuevo">+ Nuevo cliente</a></div>
    ${clients.length ? html`<ul class="list">${clients.map((c) => html`<li><a class="row" href="#/cliente/${c.id}"><span class="row-main"><span class="row-title">${c.name}${demoTag(c)}</span><span class="row-meta">${c.phone || 'Sin teléfono'} · ${plural(projects.filter((p) => p.clientId === c.id).length, 'proyecto', 'proyectos')}</span></span><span class="row-end">›</span></a></li>`)}</ul>`
      : html`<p class="empty"><strong>Todavía no hay clientes.</strong>Crea uno nuevo o agrégalo al crear un proyecto.</p>`}
  </section>`;
}

async function vCliente({ args }) {
  const isNew = args[0] === 'nuevo';
  const c = isNew ? { name: '', phone: '', notes: '' } : await store.getClient(args[0]);
  if (!c) return notFound('Este cliente');
  const projects = isNew ? [] : await store.projectsOf(c.id);
  return html`${bar(isNew ? 'Nuevo cliente' : 'Cliente', '#/clientes')}
  <section class="section">
    <h1 class="title">${isNew ? 'Nuevo cliente' : c.name}${demoTag(c)}</h1>
    <form data-form="client" data-id="${isNew ? '' : c.id}" novalidate>
      <label class="field"><span class="label">Nombre <span class="req">(obligatorio)</span></span><input class="input" name="name" value="${c.name}" autocomplete="off" required></label>
      <label class="field"><span class="label">Teléfono</span><input class="input" name="phone" type="tel" value="${c.phone}" autocomplete="off"></label>
      <label class="field"><span class="label">Notas</span><textarea class="input" name="notes">${c.notes}</textarea></label>
      ${isNew ? html`<button class="btn btn-primary btn-block" type="submit">Crear cliente</button>` : html`<p class="saved-state" data-saved>Los cambios se guardan solos en el teléfono.</p>`}
    </form>
  </section>
  ${isNew ? '' : html`<section class="section">
    <h2 class="h-rule">Proyectos <span>${projects.length}</span></h2>
    <ul class="list">${projects.map((p) => html`<li><a class="row" href="#/proyecto/${p.id}"><span class="row-main"><span class="row-title">${p.name}</span><span class="row-meta">${p.status === 'entregado' ? 'Entregado' : 'Abierto'} · ${fmtDate(p.updatedAt)}</span></span><span class="row-end">›</span></a></li>`)}</ul>
    <div class="actions"><a class="btn btn-primary" href="#/nuevo-proyecto?cliente=${c.id}">+ Nuevo proyecto para ${c.name}</a></div>
  </section>
  <section class="section danger-zone"><button class="btn btn-danger" data-action="delete-client" data-id="${c.id}">Eliminar cliente</button></section>`}`;
}

// ══════════════ PROYECTOS ══════════════
async function vNuevoProyecto({ query }) {
  const clients = (await store.allClients()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const pre = query.get('cliente') || '';
  return html`${bar('Nuevo proyecto')}
  <section class="section">
    <h1 class="title">Nuevo proyecto</h1>
    <form data-form="new-project" novalidate>
      <label class="field"><span class="label">Cliente</span>
        <select class="input" name="clientId" data-toggle-newclient>
          <option value="__new" ${pre ? '' : 'selected'}>+ Cliente nuevo</option>
          ${clients.map((c) => html`<option value="${c.id}" ${c.id === pre ? 'selected' : ''}>${c.name}${c.demo ? ' (ejemplo)' : ''}</option>`)}
        </select></label>
      <label class="field" data-newclient ${pre ? 'hidden' : ''}><span class="label">Nombre del cliente nuevo</span><input class="input" name="clientName" autocomplete="off"></label>
      <label class="field"><span class="label">Nombre del proyecto <span class="req">(obligatorio)</span></span><input class="input" name="name" placeholder="Ej.: Cortinas sala y comedor" autocomplete="off"></label>
      <label class="field"><span class="label">Lugar</span><input class="input" name="place" placeholder="Ej.: Casa de la clienta, oficina" autocomplete="off"></label>
      <label class="field"><span class="label">Notas</span><textarea class="input" name="notes"></textarea></label>
      <label class="check"><input type="checkbox" name="practice"> Es de práctica: marcarlo como <span class="tag tag-demo">Ejemplo</span></label>
      <p class="hint">Lo marcado como ejemplo se puede quitar de una vez en «Copias» sin tocar tus trabajos reales.</p>
      <button class="btn btn-primary btn-block" type="submit">Crear proyecto</button>
    </form>
  </section>`;
}

async function vProyecto({ args }) {
  const p = await store.getProject(args[0]);
  if (!p) return notFound('Este proyecto');
  const [c, sheets] = await Promise.all([store.getClient(p.clientId), store.sheetsOf(p.id)]);
  sheets.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return html`${bar('Proyecto')}
  <section class="section">
    <p class="crumbs"><a href="#/cliente/${c?.id}">${c?.name || 'Sin cliente'}</a></p>
    <h1 class="title">${p.name}${demoTag(p)}</h1>
    <p class="subtitle">${p.place ? `${p.place} · ` : ''}${p.status === 'entregado' ? 'Entregado' : 'Abierto'} · actualizado ${fmtDate(p.updatedAt)}</p>
    ${p.notes ? html`<p class="notes">${p.notes}</p>` : ''}
    <div class="actions"><a class="btn" href="#/proyecto-editar/${p.id}">Editar datos</a>${sheets.some((s) => s.versions.length) ? html`<a class="btn" href="#/hoja/p/${p.id}">Hoja de trabajo del proyecto</a>` : ''}</div>
  </section>
  <section class="section">
    <h2 class="h-rule">Fichas <span>${sheets.length}</span></h2>
    ${sheets.length ? html`<ul class="list">${sheets.map((s) => {
      const d = s.draft || currentData(s);
      const first = d?.photos[0];
      const missing = d ? d.measures.filter((m) => m.value === null).length : 0;
      return html`<li><a class="row" href="#/ficha/${s.id}">
        ${first ? html`<img class="thumb" data-photo="${first.id}" alt="">` : html`<span class="thumb thumb-empty" aria-hidden="true">${s.title.slice(0, 1)}</span>`}
        <span class="row-main"><span class="row-title">${s.title}</span>
        <span class="row-meta">${s.templateName} · ${s.versions.length ? `versión ${s.versions.length}` : 'sin versión guardada'}${missing ? ` · ${plural(missing, 'medida sin dato', 'medidas sin dato')}` : ''}</span>
        ${s.draft ? html`<span class="tag tag-draft">Borrador sin guardar</span>` : ''}</span>
        <span class="row-end">›</span></a></li>`;
    })}</ul>` : html`<p class="empty"><strong>Este proyecto aún no tiene fichas.</strong>Crea una ficha por cada pieza o espacio: una ventana, un sillón, una prenda.</p>`}
    <div class="actions"><a class="btn btn-primary" href="#/nueva-ficha/${p.id}">+ Nueva ficha</a></div>
  </section>`;
}

async function vProyectoEditar({ args }) {
  const p = await store.getProject(args[0]);
  if (!p) return notFound('Este proyecto');
  const clients = (await store.allClients()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return html`${bar('Datos del proyecto', `#/proyecto/${p.id}`)}
  <section class="section">
    <h1 class="title">${p.name}</h1>
    <form data-form="project" data-id="${p.id}" novalidate>
      <label class="field"><span class="label">Nombre del proyecto</span><input class="input" name="name" value="${p.name}" autocomplete="off"></label>
      <label class="field"><span class="label">Cliente</span><select class="input" name="clientId">${clients.map((c) => html`<option value="${c.id}" ${c.id === p.clientId ? 'selected' : ''}>${c.name}</option>`)}</select></label>
      <label class="field"><span class="label">Lugar</span><input class="input" name="place" value="${p.place}" autocomplete="off"></label>
      <fieldset class="field"><legend class="label">Estado</legend>
        <label class="check"><input type="radio" name="status" value="abierto" ${p.status !== 'entregado' ? 'checked' : ''}> Abierto</label>
        <label class="check"><input type="radio" name="status" value="entregado" ${p.status === 'entregado' ? 'checked' : ''}> Entregado</label></fieldset>
      <label class="field"><span class="label">Notas</span><textarea class="input" name="notes">${p.notes}</textarea></label>
      <p class="saved-state" data-saved>Los cambios se guardan solos en el teléfono.</p>
    </form>
  </section>
  <section class="section danger-zone"><button class="btn btn-danger" data-action="delete-project" data-id="${p.id}">Eliminar proyecto y sus fichas</button></section>`;
}

// ══════════════ FICHAS ══════════════
async function vNuevaFicha({ args }) {
  const p = await store.getProject(args[0]);
  if (!p) return notFound('Este proyecto');
  const templates = (await store.allTemplates()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return html`${bar('Nueva ficha', `#/proyecto/${p.id}`)}
  <section class="section">
    <p class="crumbs">${p.name}</p>
    <h1 class="title">Nueva ficha</h1>
    <form data-form="new-sheet" data-project="${p.id}" novalidate>
      <label class="field"><span class="label">Nombre de la ficha <span class="req">(obligatorio)</span></span><input class="input" name="title" placeholder="Ej.: Ventana sala" autocomplete="off"><span class="hint">Lo que se va a fabricar o medir: una ventana, un sillón, una prenda.</span></label>
      <fieldset class="field"><legend class="label">Plantilla</legend>
        ${templates.map((t, i) => html`<label class="check check-row"><input type="radio" name="template" value="${t.id}" ${i === 0 ? 'checked' : ''}><span><strong>${t.name}</strong> <span class="muted">· ${t.oficio} · ${plural(t.measures.length, 'medida', 'medidas')}</span></span></label>`)}
        <label class="check check-row"><input type="radio" name="template" value=""><span><strong>Ficha libre</strong> <span class="muted">· sin campos, los agregas tú</span></span></label>
      </fieldset>
      <button class="btn btn-primary btn-block" type="submit">Crear y completar</button>
    </form>
  </section>`;
}

function measuresTable(d) {
  return html`<table class="data"><tbody>${d.measures.map((m) => html`<tr class="${m.value === null ? 'is-missing' : ''}"><th scope="row">${m.label || 'Sin nombre'}</th><td>${m.value === null ? html`<span class="missing">Sin dato</span>` : html`<span class="val">${formatNumber(m.value, settings.sep)}</span> <span class="unit">${UNITS[m.unit] || m.unit}</span>`}</td></tr>`)}</tbody></table>`;
}
function specsList(d) {
  return html`<table class="data data-text"><tbody>${d.specs.map((s) => html`<tr class="${s.value ? '' : 'is-missing'}"><th scope="row">${s.label || 'Sin nombre'}</th><td>${s.value ? s.value : html`<span class="missing">Sin dato</span>`}</td></tr>`)}</tbody></table>`;
}
function photoStrip(d) {
  if (!d.photos.length) return html`<p class="muted">Sin fotos.</p>`;
  return html`<div class="photos">${d.photos.map((ph) => html`<figure><button class="photo-open" data-action="zoom-photo" data-id="${ph.id}" aria-label="Ver foto en grande"><img data-photo="${ph.id}" alt="${ph.caption || 'Foto de la ficha'}"></button>${ph.caption ? html`<figcaption>${ph.caption}</figcaption>` : ''}</figure>`)}</div>`;
}

async function vFicha({ args, query }) {
  const s = await store.getSheet(args[0]);
  if (!s) return notFound('Esta ficha');
  const p = await store.getProject(s.projectId);
  const c = p ? await store.getClient(p.clientId) : null;
  const total = s.versions.length;
  const vn = Number(query.get('v')) || total;
  const ver = s.versions[vn - 1];
  const d = ver?.data;
  return html`${bar('Ficha', `#/proyecto/${s.projectId}`)}
  <section class="section">
    <p class="crumbs"><a href="#/cliente/${c?.id}">${c?.name || ''}</a> / <a href="#/proyecto/${p?.id}">${p?.name || ''}</a></p>
    <h1 class="title">${s.title}${demoTag(s)}</h1>
    <p class="subtitle">${s.templateName}${ver ? ` · versión ${vn} de ${total} · guardada ${fmtDate(ver.savedAt)}` : ''}</p>
    ${vn < total ? html`<p class="notice"><strong>Estás viendo la versión ${vn}, que es anterior.</strong> <a href="#/ficha/${s.id}">Ver la versión actual (${total})</a></p>` : ''}
    ${s.draft ? html`<p class="notice notice-draft"><strong>Hay cambios sin guardar como versión</strong> (borrador del ${fmtDate(s.draftAt)}). <a href="#/editar/${s.id}">Seguir editando</a></p>` : ''}
    ${!ver ? html`<p class="empty"><strong>Esta ficha todavía no tiene una versión guardada.</strong>Complétala y toca «Guardar versión».</p>` : ''}
  </section>
  ${d ? html`
  <section class="section"><h2 class="h-rule">Fotos <span>${d.photos.length}</span></h2>${photoStrip(d)}</section>
  <section class="section"><h2 class="h-rule">Medidas <span>${d.measures.filter((m) => m.value !== null).length} de ${d.measures.length} con dato</span></h2>${measuresTable(d)}</section>
  <section class="section"><h2 class="h-rule">Especificaciones</h2>${specsList(d)}</section>
  <section class="section"><h2 class="h-rule">Observaciones</h2>${d.notes ? html`<p class="notes">${d.notes}</p>` : html`<p class="muted">Sin observaciones.</p>`}</section>` : ''}
  <section class="section">
    <div class="actions">
      ${vn === total ? html`<a class="btn btn-primary" href="#/editar/${s.id}">${ver ? 'Editar ficha' : 'Completar ficha'}</a>` : ''}
      ${ver ? html`<a class="btn" href="#/hoja/f/${s.id}?v=${vn}">Hoja de trabajo</a>` : ''}
      ${total ? html`<a class="btn" href="#/historial/${s.id}">Historial (${plural(total, 'versión', 'versiones')})</a>` : ''}
    </div>
  </section>
  <section class="section danger-zone"><button class="btn btn-quiet" data-action="rename-sheet" data-id="${s.id}">Cambiar nombre</button> <button class="btn btn-danger" data-action="delete-sheet" data-id="${s.id}">Eliminar ficha</button></section>`;
}

// ——— Edición ———
let ed = null; // { sheet, data, invalid: Map, fieldsMode }
const saveDraftSoon = debounce(async () => {
  if (!ed) return;
  const at = await store.saveDraft(ed.sheet.id, ed.data);
  ed.sheet.draft = ed.data;
  const el = document.querySelector('[data-draft-state]');
  if (el) el.textContent = `Borrador guardado en el teléfono · ${timeOnly(at)}`;
  const discard = document.querySelector('[data-action="discard-draft"]');
  if (discard) discard.hidden = false;
}, 400);

async function vEditar({ args }) {
  const s = await store.getSheet(args[0]);
  if (!s) return notFound('Esta ficha');
  const base = s.draft || currentData(s) || dataFromTemplate(null);
  ed = { sheet: s, data: clone(base), invalid: new Map(), fieldsMode: !s.versions.length && !base.measures.length };
  return editorHtml();
}

function editorHtml() {
  const { sheet: s, data: d } = ed;
  const next = s.versions.length + 1;
  const fm = ed.fieldsMode;
  return html`${bar(`Editar · ${s.title}`, `#/ficha/${s.id}`)}
  <form class="editor" data-form="sheet" novalidate>
  <section class="section">
    <h1 class="title">${s.title}${demoTag(s)}</h1>
    <p class="subtitle">${s.versions.length ? `Editando sobre la versión ${s.versions.length}. Al guardar se crea la versión ${next}; las anteriores se conservan.` : 'Primera versión de esta ficha.'}</p>
    <label class="check"><input type="checkbox" data-action="fields-mode" ${fm ? 'checked' : ''}> Cambiar nombres o agregar campos</label>
  </section>

  <section class="section">
    <h2 class="h-rule">Medidas <span>vacío = sin dato · 0 = cero</span></h2>
    ${d.measures.map((m) => html`<div class="m-row" data-mid="${m.id}">
      ${fm ? html`<label class="field-label-edit"><span class="sr">Nombre de la medida</span><input class="input input-label" data-k="m-label" data-id="${m.id}" value="${m.label}" placeholder="Nombre de la medida"></label>`
        : html`<label class="label" for="m-${m.id}">${m.label || 'Sin nombre'}</label>`}
      <div class="m-input">
        <input id="m-${m.id}" class="input num" inputmode="decimal" autocomplete="off" data-k="m-value" data-id="${m.id}" value="${ed.invalid.has(m.id) ? ed.invalid.get(m.id) : formatNumber(m.value, settings.sep)}" placeholder="Sin dato" aria-invalid="${ed.invalid.has(m.id)}" aria-describedby="e-${m.id}" ${fm ? html`aria-label="${m.label || 'Medida'}"` : ''}>
        <select class="input unit" data-k="m-unit" data-id="${m.id}" aria-label="Unidad de ${m.label}">${unitOptions(m.unit)}</select>
        ${fm ? html`<button type="button" class="btn btn-quiet" data-action="remove-measure" data-id="${m.id}">Quitar</button>` : ''}
      </div>
      ${m.hint && !fm ? html`<p class="hint">${m.hint}</p>` : ''}
      <p class="err" id="e-${m.id}" ${ed.invalid.has(m.id) ? '' : 'hidden'}>${ed.invalid.has(m.id) ? parseAmount(ed.invalid.get(m.id), { unit: m.unit }).error : ''}</p>
    </div>`)}
    <button type="button" class="btn" data-action="add-measure">+ Agregar medida</button>
  </section>

  <section class="section">
    <h2 class="h-rule">Especificaciones</h2>
    ${d.specs.map((sp) => html`<div class="field" data-sid="${sp.id}">
      ${fm ? html`<div class="m-input"><input class="input input-label" data-k="s-label" data-id="${sp.id}" value="${sp.label}" placeholder="Nombre del campo" aria-label="Nombre del campo"><button type="button" class="btn btn-quiet" data-action="remove-spec" data-id="${sp.id}">Quitar</button></div>`
        : html`<label class="label" for="s-${sp.id}">${sp.label || 'Sin nombre'}</label>`}
      <input id="s-${sp.id}" class="input" data-k="s-value" data-id="${sp.id}" value="${sp.value}" autocomplete="off" ${sp.options?.length ? html`list="o-${sp.id}"` : ''} placeholder="${sp.options?.length ? 'Escribe o elige' : ''}" ${fm ? html`aria-label="${sp.label || 'Valor'}"` : ''}>
      ${sp.options?.length ? html`<datalist id="o-${sp.id}">${sp.options.map((o) => html`<option value="${o}">`)}</datalist><div class="chips">${sp.options.map((o) => html`<button type="button" class="chip ${sp.value === o ? 'is-on' : ''}" data-action="pick-option" data-id="${sp.id}" data-value="${o}" aria-pressed="${sp.value === o}">${o}</button>`)}</div>` : ''}
    </div>`)}
    <button type="button" class="btn" data-action="add-spec">+ Agregar especificación</button>
  </section>

  <section class="section">
    <h2 class="h-rule">Fotos y referencias <span>${d.photos.length}</span></h2>
    <p class="hint">Las fotos son referencia visual. Las medidas siempre se escriben a mano; la app no las calcula a partir de una foto.</p>
    <div class="photo-edit">${d.photos.map((ph) => html`<div class="pe-item"><img data-photo="${ph.id}" alt="">
      <div><label class="label" for="pc-${ph.id}">Descripción</label><input id="pc-${ph.id}" class="input" data-k="p-caption" data-id="${ph.id}" value="${ph.caption || ''}" placeholder="Ej.: Tela elegida, vista del riel">
      <button type="button" class="btn btn-quiet" data-action="remove-photo" data-id="${ph.id}">Quitar foto</button></div></div>`)}</div>
    <div class="actions">
      <label class="btn"><input type="file" accept="image/*" capture="environment" data-photo-input hidden>Tomar foto</label>
      <label class="btn"><input type="file" accept="image/*" multiple data-photo-input hidden>Elegir de la galería</label>
    </div>
  </section>

  <section class="section">
    <h2 class="h-rule">Observaciones</h2>
    <textarea class="input" data-k="notes" aria-label="Observaciones">${d.notes}</textarea>
  </section>

  ${s.versions.length ? html`<section class="section"><label class="field"><span class="label">¿Qué cambió y por qué?</span><input class="input" name="note" autocomplete="off" placeholder="Ej.: Se volvió a medir el ancho"><span class="hint">Opcional. Se verá en el historial.</span></label></section>` : ''}

  <div class="savebar">
    <p class="savebar-state" data-draft-state>${s.draft ? `Borrador guardado en el teléfono · ${timeOnly(s.draftAt)}` : 'Los cambios se guardan como borrador mientras escribes.'}</p>
    <div class="savebar-actions">
      <button type="button" class="btn" data-action="discard-draft" ${s.draft ? '' : 'hidden'}>Descartar</button>
      <button type="submit" class="btn btn-primary">Guardar versión ${next}</button>
    </div>
  </div>
  </form>`;
}

async function rerenderEditor(focusSel) {
  const y = window.scrollY;
  view.innerHTML = String(editorHtml());
  await hydratePhotos();
  window.scrollTo(0, y);
  if (focusSel) { const el = view.querySelector(focusSel); el && el.focus(); }
}

function onEditorInput(t) {
  const k = t.dataset.k; const id = t.dataset.id; const d = ed.data;
  if (k === 'm-value' || k === 'm-unit') {
    const m = d.measures.find((x) => x.id === id);
    if (k === 'm-unit') m.unit = t.value;
    const input = view.querySelector(`#m-${CSS.escape(id)}`);
    const r = parseAmount(input.value, { unit: m.unit });
    const err = view.querySelector(`#e-${CSS.escape(id)}`);
    if (r.ok) { m.value = r.value; ed.invalid.delete(id); input.setAttribute('aria-invalid', 'false'); err.hidden = true; }
    else { ed.invalid.set(id, input.value); input.setAttribute('aria-invalid', 'true'); err.hidden = false; err.textContent = r.error; }
  } else if (k === 'm-label') d.measures.find((x) => x.id === id).label = t.value;
  else if (k === 's-label') d.specs.find((x) => x.id === id).label = t.value;
  else if (k === 's-value') {
    const sp = d.specs.find((x) => x.id === id); sp.value = t.value;
    for (const ch of view.querySelectorAll(`[data-action="pick-option"][data-id="${CSS.escape(id)}"]`)) { const on = ch.dataset.value === t.value; ch.classList.toggle('is-on', on); ch.setAttribute('aria-pressed', on); }
  } else if (k === 'p-caption') d.photos.find((x) => x.id === id).caption = t.value;
  else if (k === 'notes') d.notes = t.value;
  else return;
  saveDraftSoon();
}

async function addPhotos(files) {
  let added = 0;
  for (const f of files) {
    try {
      const prepared = await preparePhoto(f);
      const rec = await store.addPhoto(ed.sheet.id, prepared);
      ed.data.photos.push({ id: rec.id, caption: '' });
      added++;
    } catch (e) { toast(e.message, 'error'); }
  }
  if (added) {
    await store.saveDraft(ed.sheet.id, ed.data); ed.sheet.draft = ed.data; ed.sheet.draftAt = new Date().toISOString();
    await rerenderEditor();
    toast(added === 1 ? 'Foto agregada al borrador.' : `${added} fotos agregadas al borrador.`);
  }
}

async function submitSheet(form) {
  if (ed.invalid.size) {
    const first = [...ed.invalid.keys()][0];
    const m = ed.data.measures.find((x) => x.id === first);
    toast(`Revisa «${m?.label || 'una medida'}»: el número no es válido.`, 'error');
    view.querySelector(`#m-${CSS.escape(first)}`)?.focus();
    return;
  }
  const r = reviewData(ed.data);
  if (r.unnamed) { toast('Hay campos sin nombre. Escribe un nombre o quítalos.', 'error'); return; }
  if (r.missing.length) {
    const ok = await ask({
      title: r.missing.length === 1 ? 'Falta una medida' : `Faltan ${r.missing.length} medidas`,
      body: String(html`<ul>${r.missing.map((x) => html`<li>${x}</li>`)}</ul><p>Se guardarán como <strong>«Sin dato»</strong>, no como cero. Podrás completarlas en otra versión.</p>`),
      options: [{ label: 'Seguir completando', value: false }, { label: 'Guardar con datos faltantes', value: true, kind: 'primary' }],
    });
    if (!ok) return;
  }
  saveDraftSoon.flush();
  const note = form.elements.note ? form.elements.note.value : '';
  const s = await store.commitSheet(ed.sheet.id, ed.data, note);
  const id = ed.sheet.id;
  if (!s) { await store.discardDraft(id); ed = null; toast('No hay cambios respecto a la versión anterior. No se creó una versión nueva.', 'info'); go(`#/ficha/${id}`); return; }
  ed = null;
  toast(`Versión ${s.versions.length} guardada en el teléfono.`);
  go(`#/ficha/${id}`);
}

// ——— Historial ———
async function vHistorial({ args }) {
  const s = await store.getSheet(args[0]);
  if (!s) return notFound('Esta ficha');
  const items = s.versions.map((v, i) => ({ v, changes: diffData(i ? s.versions[i - 1].data : null, v.data, settings.sep) })).reverse();
  const draftChanges = s.draft && s.versions.length ? diffData(currentData(s), s.draft, settings.sep) : null;
  return html`${bar('Historial', `#/ficha/${s.id}`)}
  <section class="section">
    <h1 class="title">Historial · ${s.title}</h1>
    <p class="subtitle">Cada vez que guardas se crea una versión nueva. Las anteriores no se borran.</p>
  </section>
  <section class="section">
    <ol class="timeline">
      ${draftChanges ? html`<li class="tl-draft"><p class="tl-head"><span class="tag tag-draft">Borrador</span> sin guardar · ${fmtDate(s.draftAt)}</p>
        ${draftChanges.length ? html`<ul class="changes">${draftChanges.map((c) => html`<li>${c.text}</li>`)}</ul>` : html`<p class="muted">Sin cambios respecto a la versión ${s.versions.length}.</p>`}
        <a class="btn" href="#/editar/${s.id}">Seguir editando</a></li>` : ''}
      ${items.map(({ v, changes }) => html`<li><p class="tl-head"><strong>Versión ${v.n}</strong>${v.n === s.versions.length ? ' (actual)' : ''} · ${fmtDate(v.savedAt)}</p>
        ${v.note ? html`<p class="tl-note">«${v.note}»</p>` : ''}
        <ul class="changes">${changes.map((c) => html`<li>${c.text}</li>`)}</ul>
        <p><a href="#/ficha/${s.id}?v=${v.n}">Ver versión ${v.n}</a> · <a href="#/hoja/f/${s.id}?v=${v.n}">Hoja de esta versión</a></p></li>`)}
    </ol>
  </section>`;
}

// ══════════════ HOJA DE TRABAJO ══════════════
async function vHoja({ args, query }) {
  const [kind, id] = args;
  let sheets; let p;
  if (kind === 'p') {
    p = await store.getProject(id);
    if (!p) return notFound('Este proyecto');
    sheets = (await store.sheetsOf(id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((s) => ({ s, n: s.versions.length }));
  } else {
    const s = await store.getSheet(id);
    if (!s) return notFound('Esta ficha');
    p = await store.getProject(s.projectId);
    sheets = [{ s, n: Number(query.get('v')) || s.versions.length }];
  }
  const c = await store.getClient(p.clientId);
  const printable = sheets.filter((x) => x.n > 0);
  const skipped = sheets.filter((x) => x.n === 0);
  const back = kind === 'p' ? `#/proyecto/${p.id}` : `#/ficha/${id}`;
  const title = `Hoja de trabajo - ${p.name}${kind === 'f' ? ' - ' + sheets[0].s.title : ''}`;
  document.title = title;
  return html`<div class="no-print">${bar('Hoja de trabajo', back)}
    <section class="section"><p>Revisa la hoja y toca <strong>Imprimir o guardar PDF</strong>. En Android, elige «Guardar como PDF» en la impresora.</p>
    ${skipped.length ? html`<p class="notice">No se incluyen fichas sin versión guardada: ${skipped.map((x) => x.s.title).join(', ')}.</p>` : ''}
    <div class="actions"><button class="btn btn-primary" data-action="print" data-title="${title}">Imprimir o guardar PDF</button></div></section></div>
  <article class="ws">
    <header class="ws-head">
      <div><p class="ws-biz">${settings.business || 'Mi fichero de trabajos a medida'}</p><h1 class="ws-title">Hoja de trabajo</h1></div>
      <p class="ws-date">Impresa el ${fmtDate(new Date().toISOString())}</p>
    </header>
    <table class="ws-meta"><tbody>
      <tr><th>Cliente</th><td>${c?.name || ''}${c?.demo ? ' (EJEMPLO)' : ''}</td><th>Teléfono</th><td>${c?.phone || '—'}</td></tr>
      <tr><th>Proyecto</th><td>${p.name}</td><th>Lugar</th><td>${p.place || '—'}</td></tr>
    </tbody></table>
    ${printable.map(({ s, n }) => { const v = s.versions[n - 1]; const d = v.data; return html`<section class="ws-sheet">
      <h2 class="ws-h2">${s.title} <small>${s.templateName} · versión ${n}${n < s.versions.length ? ' (ANTERIOR, hay una más nueva)' : ''} · ${fmtDate(v.savedAt)}</small></h2>
      <div class="ws-cols">
        <table class="ws-table"><thead><tr><th>Medida</th><th class="r">Valor</th><th>Unidad</th></tr></thead><tbody>
        ${d.measures.map((m) => html`<tr><td>${m.label}</td>${m.value === null ? html`<td class="r ws-missing" colspan="2">SIN DATO — completar</td>` : html`<td class="r ws-val">${formatNumber(m.value, settings.sep)}</td><td>${UNIT_NAMES[m.unit] || m.unit}</td>`}</tr>`)}
        </tbody></table>
        <table class="ws-table"><thead><tr><th>Especificación</th><th>Valor</th></tr></thead><tbody>
        ${d.specs.map((sp) => html`<tr><td>${sp.label}</td><td class="${sp.value ? '' : 'ws-missing'}">${sp.value || 'SIN DATO'}</td></tr>`)}
        </tbody></table>
      </div>
      ${d.notes ? html`<p class="ws-notes"><strong>Observaciones:</strong> ${d.notes}</p>` : ''}
      ${d.photos.length ? html`<div class="ws-photos">${d.photos.map((ph) => html`<figure><img data-photo="${ph.id}" alt=""><figcaption>${ph.caption || 'Foto de referencia'}</figcaption></figure>`)}</div>` : ''}
    </section>`; })}
    <footer class="ws-foot">
      <p>Medidas registradas y verificadas por: ______________________ &nbsp; Fecha: ____________</p>
      <p class="ws-small">«Sin dato» significa que la medida no se ha registrado; no equivale a cero. Generado con Mi fichero de trabajos a medida.</p>
    </footer>
  </article>`;
}

// ══════════════ PLANTILLAS ══════════════
async function vPlantillas() {
  const ts = (await store.allTemplates()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return html`${bar('Plantillas')}
  <section class="section">
    <h1 class="title">Plantillas</h1>
    <p class="subtitle">Los campos con los que empieza cada ficha nueva. Adáptalos a tu oficio. Cambiar una plantilla no modifica las fichas que ya existen.</p>
    <div class="actions"><button class="btn btn-primary" data-action="new-template">+ Nueva plantilla</button></div>
    <ul class="list">${ts.map((t) => html`<li><a class="row" href="#/plantilla/${t.id}"><span class="row-main"><span class="row-title">${t.name}</span><span class="row-meta">${t.oficio || 'Sin oficio'} · ${plural(t.measures.length, 'medida', 'medidas')} · ${plural(t.specs.length, 'especificación', 'especificaciones')}${t.builtin ? ' · incluida' : ''}</span></span><span class="row-end">›</span></a></li>`)}</ul>
  </section>`;
}

let tplEd = null;
const saveTplSoon = debounce(async () => { if (tplEd) { await store.saveTemplate(tplEd); const el = document.querySelector('[data-saved]'); if (el) el.textContent = `Plantilla guardada · ${timeOnly(new Date().toISOString())}`; } }, 400);

async function vPlantilla({ args }) {
  const t = await store.getTemplate(args[0]);
  if (!t) return notFound('Esta plantilla');
  tplEd = t;
  return tplHtml();
}
function tplHtml() {
  const t = tplEd;
  return html`${bar('Plantilla', '#/plantillas')}
  <form class="section" data-form="template" novalidate>
    <label class="field"><span class="label">Nombre</span><input class="input" data-t="name" value="${t.name}"></label>
    <label class="field"><span class="label">Oficio</span><input class="input" data-t="oficio" value="${t.oficio || ''}"></label>
    <h2 class="h-rule">Medidas <span>${t.measures.length}</span></h2>
    ${t.measures.map((m, i) => html`<div class="tpl-row">
      <span class="tpl-n">${i + 1}</span>
      <div class="tpl-fields">
        <input class="input" data-t="m-label" data-i="${i}" value="${m.label}" aria-label="Nombre de la medida ${i + 1}" placeholder="Nombre de la medida">
        <div class="m-input"><select class="input unit" data-t="m-unit" data-i="${i}" aria-label="Unidad">${unitOptions(m.unit)}</select>
        <input class="input" data-t="m-hint" data-i="${i}" value="${m.hint || ''}" aria-label="Ayuda" placeholder="Ayuda para medir (opcional)"></div>
      </div>
      <div class="tpl-btns"><button type="button" class="icon-btn" data-action="tpl-move" data-list="measures" data-i="${i}" data-dir="-1" aria-label="Subir">▲</button><button type="button" class="icon-btn" data-action="tpl-move" data-list="measures" data-i="${i}" data-dir="1" aria-label="Bajar">▼</button><button type="button" class="icon-btn" data-action="tpl-remove" data-list="measures" data-i="${i}" aria-label="Quitar">✕</button></div>
    </div>`)}
    <button type="button" class="btn" data-action="tpl-add" data-list="measures">+ Agregar medida</button>
    <h2 class="h-rule">Especificaciones <span>${t.specs.length}</span></h2>
    ${t.specs.map((s, i) => html`<div class="tpl-row">
      <span class="tpl-n">${i + 1}</span>
      <div class="tpl-fields">
        <input class="input" data-t="s-label" data-i="${i}" value="${s.label}" aria-label="Nombre del campo ${i + 1}" placeholder="Nombre del campo">
        <input class="input" data-t="s-options" data-i="${i}" value="${(s.options || []).join(', ')}" aria-label="Opciones" placeholder="Opciones separadas por coma (opcional)">
      </div>
      <div class="tpl-btns"><button type="button" class="icon-btn" data-action="tpl-move" data-list="specs" data-i="${i}" data-dir="-1" aria-label="Subir">▲</button><button type="button" class="icon-btn" data-action="tpl-move" data-list="specs" data-i="${i}" data-dir="1" aria-label="Bajar">▼</button><button type="button" class="icon-btn" data-action="tpl-remove" data-list="specs" data-i="${i}" aria-label="Quitar">✕</button></div>
    </div>`)}
    <button type="button" class="btn" data-action="tpl-add" data-list="specs">+ Agregar especificación</button>
    <p class="saved-state" data-saved>Los cambios se guardan solos.</p>
  </form>
  <section class="section danger-zone">
    <button class="btn" data-action="tpl-duplicate">Duplicar plantilla</button>
    ${t.builtin ? html`<button class="btn btn-quiet" data-action="tpl-reset">Volver a la versión original</button>` : html`<button class="btn btn-danger" data-action="tpl-delete">Eliminar plantilla</button>`}
  </section>`;
}
async function rerenderTpl() { const y = window.scrollY; view.innerHTML = String(tplHtml()); window.scrollTo(0, y); }

// ══════════════ COPIAS Y AJUSTES ══════════════
async function vCopias() {
  const [last, snap, all] = await Promise.all([store.getMeta('lastBackupAt'), store.getMeta('antesDeRecuperar'), store.everything()]);
  const hasDemo = all.clients.some((c) => c.demo) || all.projects.some((p) => p.demo);
  const real = { clients: all.clients.filter((x) => !x.demo).length, projects: all.projects.filter((x) => !x.demo).length, sheets: all.sheets.filter((x) => !x.demo).length };
  return html`${bar('Copias')}
  <section class="section">
    <p class="kicker"><span class="num">01</span> Guardar una copia</p>
    <p>Guarda en un solo archivo tus clientes, proyectos, fichas con su historial, fotos y plantillas. Guárdalo fuera del teléfono (correo, Drive, computadora) para poder pasarlo a otro teléfono.</p>
    <p class="muted">${last ? `Última copia: ${fmtDate(last)}.` : 'Todavía no has guardado ninguna copia.'} En este teléfono hay ${plural(real.clients, 'cliente', 'clientes')}, ${plural(real.projects, 'proyecto', 'proyectos')} y ${plural(real.sheets, 'ficha', 'fichas')} propios.</p>
    ${hasDemo ? html`<label class="check"><input type="checkbox" data-include-demo> Incluir también los datos de ejemplo</label>` : ''}
    <button class="btn btn-primary btn-block" data-action="save-backup">Guardar una copia</button>
  </section>
  <section class="section">
    <p class="kicker"><span class="num">02</span> Recuperar una copia</p>
    <p>Elige un archivo de copia. Antes de cambiar nada verás qué contiene y qué pasará con lo que ya tienes.</p>
    <label class="btn btn-block"><input type="file" accept=".zip,application/zip,application/octet-stream,*/*" data-restore-input hidden>Recuperar una copia</label>
    ${snap ? html`<p class="notice">El ${fmtDate(snap.at)} reemplazaste los datos con una copia. <button class="btn btn-quiet" data-action="undo-restore">Deshacer y volver a como estaba</button></p>` : ''}
  </section>
  <section class="section">
    <p class="kicker"><span class="num">03</span> Ejemplo del taller</p>
    <p>«${DEMO_BUSINESS}» es un negocio ficticio de cortinas. Sus datos se marcan como <span class="tag tag-demo">Ejemplo</span> y se pueden quitar sin tocar tus trabajos.</p>
    ${hasDemo ? html`<button class="btn btn-block" data-action="remove-demo">Quitar los datos de ejemplo</button>` : html`<button class="btn btn-block" data-action="load-demo">Cargar el ejemplo «${DEMO_BUSINESS}»</button>`}
  </section>
  <section class="section">
    <p class="kicker"><span class="num">04</span> Ajustes</p>
    <form data-form="settings" novalidate>
      <label class="field"><span class="label">Nombre de tu negocio</span><input class="input" name="business" value="${settings.business}" placeholder="Aparece en la hoja de trabajo" autocomplete="organization"></label>
      <fieldset class="field"><legend class="label">Decimales</legend>
        <label class="check"><input type="radio" name="sep" value="." ${settings.sep === '.' ? 'checked' : ''}> Con punto: 182.5</label>
        <label class="check"><input type="radio" name="sep" value="," ${settings.sep === ',' ? 'checked' : ''}> Con coma: 182,5</label>
        <p class="hint">Al escribir se aceptan los dos. Esto cambia cómo se muestran.</p></fieldset>
      <p class="saved-state" data-saved>Los ajustes se guardan solos.</p>
    </form>
    <h2 class="h-rule">Dónde están tus datos</h2>
    <p class="small">Todo se guarda solo en este teléfono, sin cuentas ni internet. Se conserva al cerrar la app y al instalar una versión nueva. Se pierde si desinstalas la app o borras sus datos desde Ajustes de Android: por eso conviene guardar copias.</p>
    <p class="small muted">Versión ${APP_VERSION}</p>
  </section>`;
}

async function doSaveBackup() {
  const includeDemo = !!view.querySelector('[data-include-demo]')?.checked;
  try {
    const { bytes, counts } = await backup.buildBackup({ includeDemo, appVersion: APP_VERSION });
    const res = await saveFile(stampedName('Mi fichero - copia', 'zip'), 'application/zip', bytes);
    if (res === 'cancelled') { toast('No se guardó la copia.', 'info'); return; }
    await store.setMeta('lastBackupAt', new Date().toISOString());
    toast(`Copia guardada: ${plural(counts.sheets, 'ficha', 'fichas')}, ${plural(counts.versions, 'versión', 'versiones')} y ${plural(counts.photos, 'foto', 'fotos')}.`);
    render();
  } catch (e) { toast(`No se pudo guardar la copia. ${e.message}`, 'error'); }
}

async function doRestore(file) {
  let parsed;
  try { parsed = await backup.readBackup(new Uint8Array(await file.arrayBuffer())); }
  catch (e) { toast(e.message, 'error'); return; }
  const plan = await backup.previewMerge(parsed);
  const local = await store.everything();
  const k = parsed.counts;
  const localEmpty = !local.clients.length && !local.projects.length && !local.sheets.length;
  const kept = plan.clients.kept + plan.projects.kept + plan.sheets.kept;
  const body = String(html`<p>Copia del <strong>${fmtDate(parsed.manifest.createdAt)}</strong>:</p>
    <ul><li>${plural(k.clients, 'cliente', 'clientes')}, ${plural(k.projects, 'proyecto', 'proyectos')}</li><li>${plural(k.sheets, 'ficha', 'fichas')} con ${plural(k.versions, 'versión', 'versiones')}</li><li>${plural(k.photos, 'foto', 'fotos')}</li></ul>
    ${parsed.missingPhotos ? html`<p class="err">${plural(parsed.missingPhotos, 'foto citada no viene', 'fotos citadas no vienen')} en el archivo.</p>` : ''}
    ${localEmpty ? html`<p>Este teléfono no tiene fichas, así que no se borra nada.</p>`
      : html`<p><strong>Si eliges «Agregar lo nuevo»</strong>: se suman ${plural(plan.sheets.add.length, 'ficha nueva', 'fichas nuevas')} y ${plural(plan.projects.add.length, 'proyecto nuevo', 'proyectos nuevos')}. ${kept ? `${plural(kept, 'registro ya existe', 'registros ya existen')} aquí y se conserva${kept === 1 ? '' : 'n'} como está${kept === 1 ? '' : 'n'} en este teléfono.` : 'Nada de lo que ya tienes se modifica.'}</p>`}`);
  const options = localEmpty
    ? [{ label: 'Cancelar', value: null }, { label: 'Recuperar', value: 'merge', kind: 'primary' }]
    : [{ label: 'Cancelar', value: null }, { label: 'Reemplazar todo', value: 'replace', kind: 'danger' }, { label: 'Agregar lo nuevo', value: 'merge', kind: 'primary' }];
  const choice = await ask({ title: 'Recuperar una copia', body, options });
  if (!choice) { toast('No se cambió nada.', 'info'); return; }
  try {
    if (choice === 'replace') {
      const sure = await confirmAction('¿Reemplazar todo?', String(html`<p>Se quitarán ${plural(local.sheets.length, 'ficha', 'fichas')} de este teléfono y quedará solo el contenido de la copia.</p><p>Antes se guarda internamente el estado actual: podrás deshacerlo desde esta pantalla.</p>`), 'Sí, reemplazar', true);
      if (!sure) { toast('No se cambió nada.', 'info'); return; }
      await backup.applyReplace(parsed);
      toast(`Copia recuperada: ${plural(k.sheets, 'ficha', 'fichas')} y ${plural(k.photos, 'foto', 'fotos')}.`);
    } else {
      const res = await backup.applyMerge(parsed);
      toast(`Copia recuperada: se agregaron ${plural(res.sheets.add.length, 'ficha', 'fichas')} y ${plural(res.photos.add.length, 'foto', 'fotos')}.`);
    }
    photoUrls.clear();
    render();
  } catch (e) { toast(`No se pudo recuperar la copia. ${e.message}`, 'error'); }
}

// ══════════════ EVENTOS ══════════════
const saveFormSoon = debounce(async (form) => {
  const f = Object.fromEntries(new FormData(form));
  const el = form.querySelector('[data-saved]');
  if (form.dataset.form === 'client') {
    if (!f.name.trim()) { if (el) el.textContent = 'Escribe un nombre: sin nombre no se guarda.'; return; }
    const c = await store.getClient(form.dataset.id); await store.saveClient({ ...c, ...f });
  } else if (form.dataset.form === 'project') {
    if (!f.name.trim()) { if (el) el.textContent = 'Escribe un nombre: sin nombre no se guarda.'; return; }
    const p = await store.getProject(form.dataset.id); await store.saveProject({ ...p, ...f });
  } else if (form.dataset.form === 'settings') {
    settings.business = f.business.trim(); settings.sep = f.sep;
    await store.setMeta('settings', { ...settings });
  }
  if (el) el.textContent = `Guardado en el teléfono · ${timeOnly(new Date().toISOString())}`;
}, 500);

view.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.matches('[data-search]')) return renderResults(t.value);
  if (ed && t.dataset.k) return onEditorInput(t);
  if (tplEd && t.dataset.t) return onTplInput(t);
  const form = t.closest('form[data-form]');
  if (form && ['client', 'project', 'settings'].includes(form.dataset.form) && form.dataset.id !== '') saveFormSoon(form);
});
view.addEventListener('change', async (ev) => {
  const t = ev.target;
  if (t.matches('[data-photo-input]') && t.files.length) { await addPhotos([...t.files]); t.value = ''; return; }
  if (t.matches('[data-restore-input]') && t.files.length) { const f = t.files[0]; t.value = ''; await doRestore(f); return; }
  if (t.matches('[data-toggle-newclient]')) { view.querySelector('[data-newclient]').hidden = t.value !== '__new'; return; }
  if (ed && t.dataset.k === 'm-unit') return onEditorInput(t);
  if (tplEd && t.dataset.t) return onTplInput(t);
  const form = t.closest('form[data-form]');
  if (form && ['client', 'project', 'settings'].includes(form.dataset.form) && form.dataset.id !== '') saveFormSoon(form);
});

function onTplInput(t) {
  const i = Number(t.dataset.i); const k = t.dataset.t;
  if (k === 'name') tplEd.name = t.value;
  else if (k === 'oficio') tplEd.oficio = t.value;
  else if (k === 'm-label') tplEd.measures[i].label = t.value;
  else if (k === 'm-unit') tplEd.measures[i].unit = t.value;
  else if (k === 'm-hint') tplEd.measures[i].hint = t.value;
  else if (k === 's-label') tplEd.specs[i].label = t.value;
  else if (k === 's-options') tplEd.specs[i].options = t.value.split(',').map((x) => x.trim()).filter(Boolean);
  saveTplSoon();
}

view.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const form = ev.target;
  const f = Object.fromEntries(new FormData(form));
  try {
    if (form.dataset.form === 'client') {
      if (!f.name.trim()) return fieldError(form, 'name', 'Escribe el nombre del cliente.');
      const c = await store.saveClient(f); toast('Cliente creado.'); go(`#/cliente/${c.id}`);
    } else if (form.dataset.form === 'new-project') {
      if (f.clientId === '__new' && !f.clientName.trim()) return fieldError(form, 'clientName', 'Escribe el nombre del cliente o elige uno de la lista.');
      if (!f.name.trim()) return fieldError(form, 'name', 'Escribe el nombre del proyecto.');
      const practice = f.practice === 'on';
      const client = f.clientId !== '__new' ? await store.getClient(f.clientId) : await store.saveClient({ name: f.clientName, demo: practice });
      const p = await store.saveProject({ clientId: client.id, name: f.name, place: f.place, notes: f.notes, demo: client.demo || practice });
      toast('Proyecto creado.'); go(`#/proyecto/${p.id}`);
    } else if (form.dataset.form === 'new-sheet') {
      if (!f.title.trim()) return fieldError(form, 'title', 'Escribe un nombre para la ficha.');
      const p = await store.getProject(form.dataset.project);
      const tpl = f.template ? await store.getTemplate(f.template) : null;
      const s = await store.createSheet({ projectId: p.id, title: f.title, template: tpl, demo: p.demo });
      go(`#/editar/${s.id}`);
    } else if (form.dataset.form === 'sheet') {
      await submitSheet(form);
    }
  } catch (e) { toast(`No se pudo guardar. ${e.message}`, 'error'); }
});

function fieldError(form, name, msg) {
  const input = form.elements[name];
  input.setAttribute('aria-invalid', 'true');
  let err = input.parentElement.querySelector('.err');
  if (!err) { err = document.createElement('p'); err.className = 'err'; input.insertAdjacentElement('afterend', err); }
  err.textContent = msg;
  input.focus();
  toast(msg, 'error');
}

document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-action]');
  if (!b) return;
  const a = b.dataset.action; const id = b.dataset.id;
  try {
    switch (a) {
      case 'load-demo': { const p = await loadDemo(); toast('Ejemplo «Entre Hilos» cargado. Está marcado como EJEMPLO.'); go(`#/proyecto/${p.id}`); break; }
      case 'remove-demo': if (await confirmAction('¿Quitar el ejemplo?', '<p>Se borran solo los clientes, proyectos y fichas marcados como ejemplo. Tus trabajos no se tocan.</p>', 'Quitar ejemplo', true)) { await store.removeDemo(); toast('Ejemplo quitado. Tus trabajos siguen igual.'); render(); } break;
      case 'save-backup': await doSaveBackup(); break;
      case 'undo-restore': if (await confirmAction('¿Deshacer la recuperación?', '<p>Los datos volverán a como estaban justo antes de reemplazarlos.</p>', 'Deshacer')) { await backup.undoReplace(); photoUrls.clear(); toast('Se volvió al estado anterior.'); render(); } break;
      case 'print': printPage(b.dataset.title); break;
      case 'zoom-photo': zoomPhoto(id); break;
      case 'fields-mode': ed.fieldsMode = b.checked; await rerenderEditor(); break;
      case 'add-measure': ed.fieldsMode = true; ed.data.measures.push({ id: fieldId(), label: '', unit: 'cm', hint: '', value: null }); saveDraftSoon(); await rerenderEditor(`[data-k="m-label"][data-id="${ed.data.measures.at(-1).id}"]`); break;
      case 'add-spec': ed.fieldsMode = true; ed.data.specs.push({ id: fieldId(), label: '', options: [], value: '' }); saveDraftSoon(); await rerenderEditor(`[data-k="s-label"][data-id="${ed.data.specs.at(-1).id}"]`); break;
      case 'remove-measure': ed.data.measures = ed.data.measures.filter((m) => m.id !== id); ed.invalid.delete(id); saveDraftSoon(); await rerenderEditor(); break;
      case 'remove-spec': ed.data.specs = ed.data.specs.filter((m) => m.id !== id); saveDraftSoon(); await rerenderEditor(); break;
      case 'remove-photo': ed.data.photos = ed.data.photos.filter((p) => p.id !== id); saveDraftSoon(); await rerenderEditor(); toast('Foto quitada del borrador. Las versiones anteriores la conservan.', 'info'); break;
      case 'pick-option': { const sp = ed.data.specs.find((x) => x.id === id); const input = view.querySelector(`#s-${CSS.escape(id)}`); input.value = sp.value === b.dataset.value ? '' : b.dataset.value; onEditorInput(input); break; }
      case 'discard-draft': if (await confirmAction('¿Descartar los cambios?', '<p>Se borra el borrador. La última versión guardada queda igual.</p>', 'Descartar', true)) { const sid = ed.sheet.id; ed = null; await store.discardDraft(sid); toast('Borrador descartado.', 'info'); go(`#/ficha/${sid}`); } break;
      case 'rename-sheet': {
        const s = await store.getSheet(id);
        const name = await promptText('Cambiar nombre de la ficha', s.title);
        if (name) { await store.renameSheet(id, name); toast('Nombre cambiado.'); render(); }
        break;
      }
      case 'delete-sheet': { const s = await store.getSheet(id); if (await confirmAction(`¿Eliminar «${s.title}»?`, `<p>Se borran sus ${s.versions.length} versiones y sus fotos. Esto no se puede deshacer, salvo que tengas una copia.</p>`, 'Eliminar', true)) { await store.deleteSheet(id); toast('Ficha eliminada.'); go(`#/proyecto/${s.projectId}`); } break; }
      case 'delete-project': { const p = await store.getProject(id); const n = (await store.sheetsOf(id)).length; if (await confirmAction(`¿Eliminar «${p.name}»?`, `<p>Se borran el proyecto y sus ${plural(n, 'ficha', 'fichas')}. Esto no se puede deshacer, salvo que tengas una copia.</p>`, 'Eliminar', true)) { await store.deleteProject(id); toast('Proyecto eliminado.'); go('#/'); } break; }
      case 'delete-client': { const c = await store.getClient(id); const n = (await store.projectsOf(id)).length; if (await confirmAction(`¿Eliminar a ${c.name}?`, `<p>${n ? `También se borran sus ${plural(n, 'proyecto', 'proyectos')} con todas sus fichas. ` : ''}Esto no se puede deshacer, salvo que tengas una copia.</p>`, 'Eliminar', true)) { await store.deleteClient(id); toast('Cliente eliminado.'); go('#/clientes'); } break; }
      case 'new-template': { const t = await store.saveTemplate({ name: 'Plantilla nueva', oficio: '', builtin: false, measures: [], specs: [] }); go(`#/plantilla/${t.id}`); break; }
      case 'tpl-add': tplEd[b.dataset.list].push(b.dataset.list === 'measures' ? { label: '', unit: 'cm', hint: '' } : { label: '', options: [] }); saveTplSoon(); await rerenderTpl(); break;
      case 'tpl-remove': tplEd[b.dataset.list].splice(Number(b.dataset.i), 1); saveTplSoon(); await rerenderTpl(); break;
      case 'tpl-move': { const list = tplEd[b.dataset.list]; const i = Number(b.dataset.i); const j = i + Number(b.dataset.dir); if (j >= 0 && j < list.length) { [list[i], list[j]] = [list[j], list[i]]; saveTplSoon(); await rerenderTpl(); } break; }
      case 'tpl-duplicate': { saveTplSoon.flush(); const t = clone(tplEd); delete t.id; t.builtin = false; t.name += ' (copia)'; const n = await store.saveTemplate(t); toast('Plantilla duplicada.'); go(`#/plantilla/${n.id}`); break; }
      case 'tpl-delete': if (await confirmAction('¿Eliminar plantilla?', '<p>Las fichas creadas con ella no cambian.</p>', 'Eliminar', true)) { await store.deleteTemplate(tplEd.id); tplEd = null; toast('Plantilla eliminada.'); go('#/plantillas'); } break;
      case 'tpl-reset': {
        const { BUILTIN_TEMPLATES } = await import('./src/templates.js');
        const orig = BUILTIN_TEMPLATES.find((x) => x.id === tplEd.id);
        if (orig && await confirmAction('¿Volver a la versión original?', '<p>Se pierden los cambios hechos a esta plantilla. Las fichas no cambian.</p>', 'Restaurar')) { tplEd = clone(orig); await store.saveTemplate(tplEd); toast('Plantilla restaurada.'); await rerenderTpl(); }
        break;
      }
    }
  } catch (e) { console.error(e); toast(e.message || 'Algo salió mal.', 'error'); }
});

function promptText(title, value) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog'); d.className = 'dlg';
    d.innerHTML = `<form method="dialog"><h2 class="dlg-title">${esc(title)}</h2><input class="input" name="v" value="${esc(value)}" autocomplete="off"><div class="dlg-actions"><button class="btn" value="">Cancelar</button><button class="btn btn-primary" value="ok">Guardar</button></div></form>`;
    document.body.appendChild(d);
    d.addEventListener('close', () => { const v = d.returnValue === 'ok' ? d.querySelector('input').value.trim() : ''; d.remove(); resolve(v); });
    d.showModal();
  });
}

function zoomPhoto(id) {
  const d = document.createElement('dialog'); d.className = 'dlg dlg-photo';
  d.innerHTML = `<div class="zoom-wrap"><img data-photo="${esc(id)}" alt="Foto ampliada"></div><div class="dlg-actions"><button class="btn btn-primary" value="x">Cerrar</button></div>`;
  document.body.appendChild(d);
  d.addEventListener('click', (e) => { if (e.target.closest('button')) d.close(); });
  d.addEventListener('close', () => d.remove());
  hydratePhotos(d);
  d.showModal();
}

// ══════════════ RUTAS ══════════════
const ROUTES = {
  inicio: vInicio, clientes: vClientes, cliente: vCliente, 'nuevo-proyecto': vNuevoProyecto, proyecto: vProyecto, 'proyecto-editar': vProyectoEditar,
  'nueva-ficha': vNuevaFicha, ficha: vFicha, editar: vEditar, historial: vHistorial, hoja: vHoja, plantillas: vPlantillas, plantilla: vPlantilla, copias: vCopias,
};
const TAB_OF = { inicio: 'inicio', clientes: 'clientes', cliente: 'clientes', plantillas: 'plantillas', plantilla: 'plantillas', copias: 'copias' };
let lastRoute = '';

async function render() {
  const r = route();
  const key = location.hash;
  // Antes de salir del editor, guardar lo que esté pendiente.
  if (ed && r.name !== 'editar') { await saveDraftSoon.flush(); ed = null; }
  if (tplEd && r.name !== 'plantilla') { await saveTplSoon.flush(); tplEd = null; }
  document.title = 'Mi fichero de trabajos a medida';
  const fn = ROUTES[r.name] || vInicio;
  try { view.innerHTML = String(await fn(r)); }
  catch (e) { console.error(e); view.innerHTML = String(html`${bar('Error')}<section class="section"><p class="err">No se pudo abrir esta pantalla: ${e.message}</p><a class="btn" href="#/">Ir al inicio</a></section>`); }
  document.body.dataset.route = r.name;
  for (const a of document.querySelectorAll('.tabs a')) a.toggleAttribute('aria-current', a.dataset.tab === TAB_OF[r.name]);
  await hydratePhotos();
  if (key !== lastRoute) { window.scrollTo(0, 0); lastRoute = key; }
}

window.addEventListener('hashchange', render);
window.addEventListener('pagehide', () => { saveDraftSoon.flush(); saveTplSoon.flush(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { saveDraftSoon.flush(); saveTplSoon.flush(); } });

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
