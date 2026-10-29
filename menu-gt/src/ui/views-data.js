// Vistas "Despensa", "Precios" y "Ajustes".
import { esc, q, icon, storeLabel, priceStatus, packText, unitPrice, describeQty, formatDate, equipmentLabel, cap } from './common.js';
import { INGREDIENTS, CATEGORIES, ALLERGENS, PROTEINS } from '../data/ingredients.js';
import { REAL_STORES, SAMPLE_STORES, STORE_BY_ID, DEPARTAMENTOS, RESEARCH_DATE } from '../data/stores.js';
import { EQUIPMENT, MEALS } from '../data/recipes.js';
import { unitsFor, unitLabel, toBase } from '../engine/units.js';
import { allOffers, REAL_SNAPSHOT } from '../engine/index.js';
import { stepper } from './views-plan.js';

export function ingredientOptions(selected, { onlyIds = null } = {}) {
  return CATEGORIES.map((cat) => {
    const opts = Object.values(INGREDIENTS)
      .filter((i) => i.cat === cat.id && (!onlyIds || onlyIds.has(i.id)))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .map((i) => `<option value="${i.id}" ${i.id === selected ? 'selected' : ''}>${esc(cap(i.name))}</option>`)
      .join('');
    return opts ? `<optgroup label="${cat.label}">${opts}</optgroup>` : '';
  }).join('');
}

export function unitOptions(ingId, selected) {
  const ing = INGREDIENTS[ingId];
  if (!ing) return '';
  return unitsFor(ing)
    .map((u) => `<option value="${u}" ${u === selected ? 'selected' : ''}>${esc(unitLabel(u, ing))}</option>`)
    .join('');
}

// ---------- Despensa ----------
export function viewDespensa(ctx) {
  const { state, result, ui } = ctx;
  const form = ui.pantryForm;
  const items = state.pantry.map((p) => {
    const ing = INGREDIENTS[p.ingredientId];
    const need = result.needs.get(p.ingredientId);
    let coverage = '<span class="muted small">No lo usa el menú actual</span>';
    if (need) {
      coverage = need.needQty <= 0
        ? `<span class="pill home">Cubre todo lo del menú (${esc(describeQty(need.qty, ing))})</span>`
        : `<span class="pill warn">Cubre ${esc(describeQty(need.coveredQty, ing))} de ${esc(describeQty(need.qty, ing))}</span>`;
    }
    return `<li class="pantry-item">
      <div><h4>${esc(cap(ing.name))}</h4>${coverage}${need?.pantryNotes?.length ? `<p class="small muted">${esc(need.pantryNotes.join('; '))}</p>` : ''}</div>
      <div class="pantry-qty">
        <label class="sr-only" for="pq-${p.id}">Cantidad de ${esc(ing.name)}</label>
        <input id="pq-${p.id}" inputmode="decimal" value="${p.qty}" data-action="pantry-qty" data-id="${p.id}">
        <span>${esc(unitLabel(p.unit, ing, Number(p.qty)))}</span>
        <button class="btn icon" data-action="pantry-del" data-id="${p.id}" aria-label="Quitar ${esc(ing.name)}">${icon('basura')}</button>
      </div>
    </li>`;
  });
  const suggestions = [...result.needs.values()]
    .filter((n) => !state.pantry.some((p) => p.ingredientId === n.ingredientId) && INGREDIENTS[n.ingredientId].cat !== 'carnes')
    .slice(0, 10);
  return `
  <div class="toolbar"><h2 class="h2">Despensa</h2></div>
  <p class="muted small">Lo que ya tienes se descuenta de la lista. Solo se descuenta el mismo ingrediente: frijol seco no cubre frijol volteado.</p>
  <form class="card pantry-form" data-form="pantry">
    <div class="form-grid">
      <label class="field grow"><span class="label">Ingrediente</span>
        <select id="pf-ing" name="ing" data-action="pantry-form-ing">${ingredientOptions(form.ing)}</select></label>
      <label class="field"><span class="label">Cantidad</span><input id="pf-qty" name="qty" inputmode="decimal" required value="${esc(form.qty)}"></label>
      <label class="field"><span class="label">Unidad</span><select id="pf-unit" name="unit">${unitOptions(form.ing, form.unit)}</select></label>
    </div>
    ${ui.pantryError ? `<p class="status danger small" role="alert">${esc(ui.pantryError)}</p>` : ''}
    <button class="btn primary" type="submit">${icon('mas')} Agregar a la despensa</button>
  </form>
  ${suggestions.length ? `<div class="quick-add"><p class="small muted">Del menú, ¿ya tienes alguno?</p><div class="chips">${suggestions.map((n) => `<button class="chip" data-action="pantry-pick" data-ing="${n.ingredientId}">${esc(INGREDIENTS[n.ingredientId].name)}</button>`).join('')}</div></div>` : ''}
  ${items.length ? `<ul class="pantry-list card">${items.join('')}</ul>` : '<div class="card empty"><p>Tu despensa está vacía. Agrega lo que ya tienes para no comprarlo dos veces.</p></div>'}`;
}

// ---------- Precios ----------
function priceRow(o, ctx) {
  const ing = INGREDIENTS[o.ingredientId];
  const st = priceStatus(o, ctx.sessionStart);
  const deletable = o.status !== 'ejemplo' && o.status !== 'guardado';
  return `<li class="price-row">
    <div class="pr-main">
      <h4>${esc(o.product)} <span class="muted">${esc(o.brand ?? '')}</span></h4>
      <p class="small">${esc(cap(ing.name))} · ${esc(packText(o))} · <b>${q(o.priceCents)}</b> <span class="muted">(${esc(unitPrice(o, ing))})</span></p>
      <p class="small"><span class="pill ${st.tone}">${st.label}</span> ${o.availability === 'agotado' ? '<span class="pill danger">Agotado</span>' : ''} ${o.promo ? `<span class="pill">${esc(o.promo.text ?? 'Promoción')}</span>` : ''}
      <span class="muted">${esc(st.detail)}</span></p>
      ${o.presentationSource ? `<p class="small muted">Presentación tomada de: ${esc(o.presentationSource)}</p>` : ''}
      ${o.notes?.length ? `<p class="small muted">${o.notes.map(esc).join(' ')}</p>` : ''}
      ${o.sourceUrl ? `<a class="small" href="${esc(o.sourceUrl)}" target="_blank" rel="noopener noreferrer">${icon('enlace')} Ver origen</a>` : ''}
    </div>
    ${deletable ? `<button class="btn icon" data-action="price-del" data-id="${esc(o.id)}" aria-label="Borrar precio">${icon('basura')}</button>` : ''}
  </li>`;
}

function myPriceForm(ctx) {
  const f = ctx.ui.priceForm;
  const placeOpts = [...REAL_STORES, { id: 'mis-precios', name: 'Mercado u otro lugar' }];
  return `<form class="card" data-form="my-price" id="my-price-form" aria-labelledby="mp-title">
    <h3 id="mp-title" class="h3">Anota un precio</h3>
    <p class="small muted">Lo que pagaste o viste en el mercado, una tienda o el súper. Sirve sobre todo para lo que no está en línea (miltomate, chipilín, hierbas). Se guarda con la fecha como "ingresado por ti".</p>
    <div class="form-grid">
      <label class="field grow"><span class="label">Ingrediente</span><select id="mp-ing" name="ing" data-action="price-form-ing">${ingredientOptions(f.ing)}</select></label>
      <label class="field grow"><span class="label">Dónde</span><select id="mp-store" name="store">${placeOpts.map((s) => `<option value="${s.id}" ${s.id === f.store ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <label class="field grow"><span class="label">Nombre del lugar o sucursal</span><input id="mp-place" name="place" value="${esc(f.place)}" placeholder="Mercado municipal de Chiquimula"></label>
      <label class="field grow"><span class="label">Producto</span><input id="mp-product" name="product" value="${esc(f.product)}" placeholder="Tomate"></label>
      <label class="field"><span class="label">Marca</span><input id="mp-brand" name="brand" value="${esc(f.brand)}" placeholder="Sin marca"></label>
      <label class="field"><span class="label">Cantidad</span><input id="mp-qty" name="qty" inputmode="decimal" value="${esc(f.qty)}" required></label>
      <label class="field"><span class="label">Unidad</span><select id="mp-unit" name="unit">${unitOptions(f.ing, f.unit)}</select></label>
      <label class="field"><span class="label">Precio (Q)</span><input id="mp-price" name="price" inputmode="decimal" value="${esc(f.price)}" required placeholder="0.00"></label>
      <label class="field"><span class="label">Disponibilidad</span><select id="mp-avail" name="availability">
        <option value="disponible">Disponible</option><option value="agotado">Agotado</option><option value="desconocido">No sé</option></select></label>
      <label class="field grow"><span class="label">Promoción o nota (informativa)</span><input id="mp-note" name="note" value="${esc(f.note)}" placeholder="2 x Q10 solo los martes"></label>
    </div>
    <p class="small muted">Las promociones escritas aquí se guardan como nota y no se descuentan automáticamente.</p>
    ${ctx.ui.priceError ? `<p class="status danger small" role="alert">${esc(ctx.ui.priceError)}</p>` : ''}
    <button class="btn primary" type="submit">Guardar precio</button>
  </form>`;
}

function lookupBlock(ctx) {
  const srv = ctx.server;
  const lk = ctx.ui.lookup;
  if (srv.available === null) return `<div class="card"><p class="small muted">Comprobando si hay un servidor de consulta…</p></div>`;
  if (!srv.available) {
    return `<div class="card banner warn">
      <h3 class="h3">Consulta automática no disponible aquí</h3>
      <p class="small">Esta versión funciona solo en el navegador. Un navegador no puede leer las páginas de los supermercados por restricciones de seguridad (CORS), y no se usan intermediarios para eludirlas.</p>
      <p class="small">Con el servidor local del proyecto (<code>npm start</code>) puedes pegar la dirección de una página de producto y obtener su precio publicado, si el sitio lo permite.</p>
    </div>`;
  }
  return `<form class="card" data-form="lookup" aria-labelledby="lk-title">
    <h3 id="lk-title" class="h3">Consultar una página de producto</h3>
    <p class="small muted">Pega la dirección de un producto de Paiz, La Torre, Walmart o Maxi Despensa. El servidor revisa robots.txt, lee el precio publicado y no inventa datos que la página no tenga.</p>
    <label class="field"><span class="label">Dirección de la página</span><input id="lk-url" name="url" type="url" required value="${esc(lk.url)}" placeholder="https://www.paiz.com.gt/…/p"></label>
    <label class="field"><span class="label">¿Para qué ingrediente?</span><select id="lk-ing" name="ing">${ingredientOptions(lk.ing)}</select></label>
    <button class="btn" type="submit" ${lk.loading ? 'disabled' : ''}>${lk.loading ? 'Consultando…' : 'Consultar'}</button>
    ${lk.error ? `<p class="status danger small" role="alert">${esc(lk.error)}</p>` : ''}
    ${lk.result ? lookupResult(lk) : ''}
  </form>`;
}

function lookupResult(lk) {
  const r = lk.result.record;
  const ing = INGREDIENTS[lk.ing];
  return `<div class="lookup-result">
    <p><b>${esc(r.product)}</b> ${esc(r.brand ?? '')} · <b>${q(r.priceCents)}</b>${r.isRange ? ' (precio desde)' : ''} · ${esc(r.availability)}</p>
    <p class="small muted">${esc(r.branchNote)} Consultado ${esc(formatDate(r.fetchedAt))}.</p>
    <div class="form-grid">
      <label class="field"><span class="label">Cantidad del empaque</span><input id="lk-qty" name="packQty" inputmode="decimal" value="${esc(r.presentation?.packQty ?? '')}" required></label>
      <label class="field"><span class="label">Unidad</span><select id="lk-unit" name="packUnit">${unitOptions(lk.ing, r.presentation?.packUnit ?? ing?.base)}</select></label>
    </div>
    <p class="small">${r.presentation ? `Presentación detectada en el nombre: "${esc(r.presentation.detectedFrom)}". Revísala.` : 'No se detectó la presentación en el nombre: indícala tú.'}</p>
    <button class="btn primary" data-action="save-lookup">Guardar este precio</button>
  </div>`;
}

const EXCLUDED_LABEL = {
  'peso-variable': 'Peso variable',
  contradiccion: 'Datos contradictorios',
  'sin-presentacion': 'Sin tamaño de empaque',
  'sin-conversion': 'Sin equivalencia',
  'no-disponible': 'No disponible en línea',
  error: 'Error al consultar',
};

function snapshotBlock(ctx) {
  const snap = REAL_SNAPSHOT;
  if (!snap.offers.length && !snap.excluded.length) return '';
  const byStore = (id) => snap.offers.filter((o) => o.storeId === id).length;
  return `<section class="card" aria-labelledby="snap-title">
    <h3 id="snap-title" class="h3">Precios reales guardados</h3>
    <p class="small">Leídos el ${esc(formatDate(snap.finished))} de las páginas públicas de producto: ${REAL_STORES.filter((s) => byStore(s.id)).map((s) => `<b>${byStore(s.id)}</b> de ${esc(s.name)}`).join(', ')}. Se muestran como "Último precio guardado"; pueden haber cambiado.</p>
    <p class="small muted">Son precios de la tienda en línea, sin sucursal elegida. No se verificó si cambian por sucursal ni si coinciden con la tienda física de ${esc(ctx.state.location.municipio || ctx.state.location.departamento)}.</p>
    <details class="explain"><summary>${snap.excluded.length} productos no se cargaron y por qué</summary>
      <ul class="plain small">${snap.excluded.map((e) => `<li><b>${esc(STORE_BY_ID[e.storeId]?.name ?? e.storeId)} · ${esc(INGREDIENTS[e.ingredientId]?.name ?? e.ingredientId)}</b>: <span class="pill warn">${EXCLUDED_LABEL[e.reason] ?? e.reason}</span> ${esc(e.detail ?? '')} <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${icon('enlace')} Ver</a></li>`).join('')}</ul>
    </details>
  </section>`;
}

export function viewPrecios(ctx) {
  const { state } = ctx;
  const offers = allOffers(state);
  const byStore = new Map();
  for (const o of offers) (byStore.get(o.storeId) ?? byStore.set(o.storeId, []).get(o.storeId)).push(o);
  const filter = ctx.ui.priceFilter;
  const storeIds = [...byStore.keys()];
  const shown = filter && byStore.has(filter) ? [[filter, byStore.get(filter)]] : [...byStore].filter(([id]) => !id.startsWith('ejemplo'));
  return `
  <div class="toolbar"><h2 class="h2">Precios</h2></div>
  <p class="intro muted">De aquí salen los precios del menú y la lista. Los de las tiendas se leen de sus páginas en línea; lo demás lo anotas tú.</p>
  ${myPriceForm(ctx)}
  ${savedPrices(ctx, { shown, storeIds, filter })}
  <details class="card tech"><summary>Información técnica: cómo se obtienen los precios</summary>
  ${snapshotBlock(ctx)}
  ${lookupBlock(ctx)}
  <section aria-labelledby="sources-title">
    <h3 id="sources-title" class="h3">Fuentes revisadas</h3>
    <p class="small muted">Revisión inicial del ${RESEARCH_DATE}; consulta en vivo comprobada el 29 oct 2026 en Paiz, La Torre y Walmart.</p>
    <ul class="plain sources">${REAL_STORES.map((s) => `<li><b>${esc(s.name)}</b> ${s.initial ? '<span class="pill">Cadena inicial</span>' : ''} ${s.access === 'verificado' ? '<span class="pill ok">Consulta verificada</span>' : '<span class="pill warn">No verificado en vivo</span>'}<br><span class="small">${esc(s.accessNote)}</span> <a class="small" href="${s.site}" target="_blank" rel="noopener noreferrer">${icon('enlace')} Sitio oficial</a></li>`).join('')}</ul>
  </section>
  </details>`;
}

function savedPrices(ctx, { shown, storeIds, filter }) {
  const { state } = ctx;
  return `
  <section aria-labelledby="saved-title">
    <div class="section-head"><h3 id="saved-title" class="h3">Precios que usa la app</h3>
      <label class="inline-field small"><span>Ver</span><select id="price-filter" data-action="price-filter">
        <option value="">Reales y míos</option>
        ${storeIds.map((id) => `<option value="${id}" ${id === filter ? 'selected' : ''}>${esc(storeLabel(id, state))}</option>`).join('')}
      </select></label></div>
    ${shown.length ? shown.map(([id, list]) => `<details class="card store-prices" ${shown.length === 1 ? 'open' : ''}><summary><h4 class="store-h">${esc(storeLabel(id, state))}</h4><span class="small muted">${list.length} precio${list.length === 1 ? '' : 's'}</span></summary><ul class="plain">${list.map((o) => priceRow(o, ctx)).join('')}</ul></details>`).join('') : '<div class="card empty"><p>Aún no hay precios reales ni tuyos. Los de ejemplo se ven eligiendo una tienda de ejemplo en el filtro.</p></div>'}
  </section>`;
}

// ---------- Ajustes ----------
const chipCheck = (action, value, label, checked) =>
  `<label class="chip-toggle"><input type="checkbox" data-action="${action}" value="${value}" ${checked ? 'checked' : ''}><span>${esc(label)}</span></label>`;

export function viewAjustes(ctx) {
  const { state, ui } = ctx;
  const h = state.household;
  const p = state.prefs;
  const stores = [...(state.demo ? SAMPLE_STORES : []), ...REAL_STORES];
  return `
  <div class="toolbar"><h2 class="h2">Ajustes</h2></div>

  <section class="card settings" aria-labelledby="set-loc">
    <h3 id="set-loc" class="h3">Ubicación y tiendas</h3>
    <div class="form-grid">
      <label class="field"><span class="label">Departamento</span><select id="set-dep" data-bind="location.departamento" data-type="str">${DEPARTAMENTOS.map((d) => `<option ${d === state.location.departamento ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label class="field"><span class="label">Municipio</span><input id="set-mun" data-bind="location.municipio" data-type="str" value="${esc(state.location.municipio)}"></label>
    </div>
    <p class="small muted">La ubicación no cambia los precios por sí sola: un precio en línea o de la capital no se asume igual al de una sucursal de ${esc(state.location.municipio || state.location.departamento)}.</p>
    <fieldset><legend class="label">Supermercados de interés</legend>
      <ul class="plain store-list">${stores.map((s) => `<li>
        <label class="check"><input type="checkbox" data-action="toggle-store" value="${s.id}" ${state.stores.selected.includes(s.id) ? 'checked' : ''}> ${esc(s.name)} ${s.sample ? '<span class="pill sample">Ejemplo ficticio</span>' : ''}</label>
        ${!s.sample && state.stores.selected.includes(s.id) ? `<label class="field small"><span class="label">Sucursal o zona (opcional)</span><input id="br-${s.id}" data-bind="stores.branches.${s.id}" data-type="str" value="${esc(state.stores.branches[s.id] ?? '')}" placeholder="Sucursal no indicada"></label>` : ''}
      </li>`).join('')}</ul>
    </fieldset>
    <label class="switch"><input type="checkbox" data-action="toggle-demo" ${state.demo ? 'checked' : ''}><span>Mostrar tiendas y precios de ejemplo (ficticios)</span></label>
  </section>

  <section class="card settings" aria-labelledby="set-home">
    <h3 id="set-home" class="h3">Hogar y período</h3>
    <div class="form-grid">
      <div class="field"><span class="label" id="lbl-people2">Personas</span>${stepper('household.people', h.people, 1, 20, 'lbl-people2')}</div>
      <label class="field"><span class="label">Desde</span><input id="set-start" type="date" value="${h.startDate}" data-bind="household.startDate" data-type="date"></label>
      <label class="field"><span class="label">Días</span><input id="set-days" type="number" min="1" max="14" value="${h.numDays}" data-bind="household.numDays" data-type="int"></label>
      <label class="field"><span class="label">Presupuesto del período (Q)</span><input id="set-budget" inputmode="decimal" value="${h.budgetCents ? (h.budgetCents / 100).toFixed(2) : ''}" data-bind="household.budgetCents" data-type="cents"></label>
    </div>
    <fieldset><legend class="label">Comidas</legend><div class="chips">${MEALS.map((m) => chipCheck('toggle-meal', m.id, m.label, h.meals.includes(m.id))).join('')}</div></fieldset>
  </section>

  <section class="card settings" aria-labelledby="set-pref">
    <h3 id="set-pref" class="h3">Preferencias y restricciones</h3>
    <label class="switch"><input type="checkbox" data-action="toggle-pref-bool" data-key="vegetarian" ${p.vegetarian ? 'checked' : ''}><span>Solo recetas vegetarianas</span></label>
    <fieldset><legend class="label">Alergias o intolerancias</legend><div class="chips">${ALLERGENS.map((a) => chipCheck('toggle-allergy', a.id, a.label, p.allergies.includes(a.id))).join('')}</div></fieldset>
    <fieldset><legend class="label">No comemos</legend><div class="chips">${PROTEINS.map((a) => chipCheck('toggle-protein', a.id, a.label, p.excludedProteins.includes(a.id))).join('')}</div></fieldset>
    <div class="field"><span class="label">Ingredientes excluidos</span>
      <div class="chips">${p.excludedIngredients.map((id) => `<button class="chip removable" data-action="unexclude" data-ing="${id}" aria-label="Quitar exclusión de ${esc(INGREDIENTS[id].name)}">${esc(INGREDIENTS[id].name)} ${icon('cerrar')}</button>`).join('')}</div>
      <div class="inline-add"><label class="sr-only" for="excl-ing">Ingrediente a excluir</label><select id="excl-ing">${ingredientOptions('')}</select><button class="btn small" data-action="exclude">Excluir</button></div>
    </div>
    <fieldset><legend class="label">Tiempo máximo por comida</legend><div class="form-grid">
      ${MEALS.map((m) => `<label class="field"><span class="label">${m.label} (min)</span><input id="mx-${m.id}" type="number" min="5" step="5" value="${p.maxMinutes[m.id] ?? ''}" data-bind="prefs.maxMinutes.${m.id}" data-type="int"></label>`).join('')}
    </div></fieldset>
    <fieldset><legend class="label">Equipo de cocina disponible</legend><div class="chips">${EQUIPMENT.map((e) => chipCheck('toggle-equipment', e.id, e.label, p.equipment.includes(e.id))).join('')}</div></fieldset>
    <label class="switch"><input type="checkbox" data-action="toggle-pref-bool" data-key="budgetPriority" ${p.budgetPriority ? 'checked' : ''}><span>Dar más peso al ahorro al proponer el menú</span></label>
    <p class="small muted">Los cambios aquí no reescriben el menú solos: las recetas que ya no cumplan se marcan para que decidas.</p>
  </section>

  <section class="card settings" aria-labelledby="set-extra">
    <h3 id="set-extra" class="h3">Gastos adicionales del período</h3>
    <p class="small muted">Por ejemplo gas, transporte o envío. Se restan del presupuesto.</p>
    <ul class="plain">${state.extras.map((e) => `<li class="extra-row">${esc(e.label)} <b>${q(e.cents)}</b> <button class="btn icon" data-action="extra-del" data-id="${e.id}" aria-label="Quitar ${esc(e.label)}">${icon('basura')}</button></li>`).join('')}</ul>
    <form class="inline-add" data-form="extra"><label class="sr-only" for="ex-label">Concepto</label><input id="ex-label" name="label" placeholder="Concepto" required><label class="sr-only" for="ex-amount">Monto en quetzales</label><input id="ex-amount" name="amount" inputmode="decimal" placeholder="Q" required><button class="btn small" type="submit">Agregar</button></form>
    ${ui.extraError ? `<p class="status danger small" role="alert">${esc(ui.extraError)}</p>` : ''}
    <p class="small muted">Transporte o envío por tienda: se ingresa en Compras → Combinar.</p>
  </section>

  <section class="card settings" aria-labelledby="set-data">
    <h3 id="set-data" class="h3">Tus datos</h3>
    <p class="small">${ctx.persisted ? 'Se guardan automáticamente <b>solo en este navegador</b>. No hay cuentas ni sincronización entre dispositivos.' : 'Este navegador no permite guardar datos. Exporta tu plan para no perderlo.'} Para pasarlos a otro teléfono, exporta y luego importa.</p>
    <div class="actions">
      <button class="btn" data-action="export">Exportar archivo</button>
      <button class="btn" data-action="export-copy">${icon('copiar')} Copiar como texto</button>
      <label class="btn file-btn">Importar archivo<input type="file" accept="application/json,.json" data-action="import-file" class="sr-only"></label>
    </div>
    <details class="explain"><summary>Importar pegando el texto</summary>
      <label class="sr-only" for="import-text">Texto exportado</label>
      <textarea id="import-text" rows="4" placeholder='{"app":"menu-gt", ...}'></textarea>
      <button class="btn small" data-action="import-text">Importar texto</button>
    </details>
    ${ui.dataMsg ? `<p class="status ${ui.dataMsg.tone} small" role="status">${esc(ui.dataMsg.text)}</p>` : ''}
    ${ui.confirmReset
      ? `<div class="banner danger"><p>¿Borrar menú, despensa, precios y preferencias de este navegador?</p><div class="actions"><button class="btn danger" data-action="reset-confirm">Sí, borrar</button><button class="btn" data-action="reset-cancel">Cancelar</button></div></div>`
      : '<button class="btn link danger-text" data-action="reset-ask">Borrar todos mis datos</button>'}
  </section>

  <section class="card settings" aria-labelledby="set-about">
    <h3 id="set-about" class="h3">Qué hace y qué no hace esta versión</h3>
    <ul class="plain small">
      <li>El menú se arma con reglas (preferencias, restricciones, despensa, variedad, tiempo y costo). No hay un modelo de IA conectado.</li>
      <li>Todas las sumas, conversiones y empaques se calculan con reglas verificables en centavos.</li>
      <li>Las recetas son de referencia y no se han probado en cocina. No incluye calorías ni valores nutricionales.</li>
      <li>Los precios de las tiendas "Ejemplo" son ficticios. Paiz, La Torre, Walmart y Maxi Despensa no tienen precios cargados hasta que los registres o los consultes con el servidor local.</li>
    </ul>
  </section>`;
}
