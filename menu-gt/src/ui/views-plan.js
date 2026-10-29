// Vistas "Esta semana" y "Menú".
import { esc, q, icon, mealLabel, dayLabel, storeLabel, proteinIcon, proteinLabel, cap } from './common.js';
import { budgetMessage, PRICE_MAX_AGE_DAYS } from '../engine/budget.js';
import { checkRecipe } from '../engine/selector.js';
import { RECIPE_BY_ID } from '../data/recipes.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { DEPARTAMENTOS } from '../data/stores.js';
import { REAL_SNAPSHOT } from '../engine/index.js';
import { formatDate } from './common.js';
import { DISH_IMAGES } from './dish-images.js';

/** Ilustración del plato (generada, no foto) o, si no hay, el icono de su proteína. */
export function dishArt(recipe, cls = 'slot-art') {
  const src = DISH_IMAGES[recipe.id];
  return `<span class="${cls}" aria-hidden="true">${src ? `<img src="${src}" alt="" width="192" height="192" loading="lazy" decoding="async">` : icon(proteinIcon(recipe.protein))}</span>`;
}

export const snapshotDate = () => (REAL_SNAPSHOT.offers.length ? formatDate(REAL_SNAPSHOT.finished, false) : 'sin captura');

export function periodText(days) {
  const active = days.filter((d) => !d.skipped);
  if (!active.length) return 'sin días';
  const a = active[0];
  const b = active.at(-1);
  return a === b ? dayLabel(a, true) : `${a.dayOfMonth} ${a.month} – ${b.dayOfMonth} ${b.month}`;
}

// ---------- Inicio rápido ----------
function quickStart(ctx) {
  const { state } = ctx;
  const h = state.household;
  const mealChip = (id, label) =>
    `<label class="chip-toggle"><input type="checkbox" data-action="toggle-meal" value="${id}" ${h.meals.includes(id) ? 'checked' : ''}><span>${label}</span></label>`;
  return `
  <section class="card quick" aria-labelledby="qs-title">
    <h2 id="qs-title">Empecemos con lo básico</h2>
    <p class="muted">Cuatro datos y tienes menú, lista y total. Preferencias, alergias y despensa las completas después.</p>
    <div class="qs-grid">
      <div class="field">
        <span class="label" id="lbl-people">Personas que comen</span>
        ${stepper('household.people', h.people, 1, 20, 'lbl-people')}
      </div>
      <fieldset class="field">
        <legend class="label">Comidas a organizar</legend>
        <div class="chips">${mealChip('desayuno', 'Desayunos')}${mealChip('almuerzo', 'Almuerzos')}${mealChip('cena', 'Cenas')}</div>
      </fieldset>
      <div class="field">
        <label class="label" for="qs-start">Desde</label>
        <input id="qs-start" type="date" value="${h.startDate}" data-bind="household.startDate" data-type="date">
      </div>
      <div class="field">
        <label class="label" for="qs-days">Días</label>
        <select id="qs-days" data-bind="household.numDays" data-type="int">
          ${[3, 5, 7, 10, 14].map((n) => `<option value="${n}" ${n === h.numDays ? 'selected' : ''}>${n} días</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label class="label" for="qs-budget">Presupuesto para esos días (Q)</label>
        <input id="qs-budget" inputmode="decimal" value="${h.budgetCents ? (h.budgetCents / 100).toFixed(2) : ''}" data-bind="household.budgetCents" data-type="cents" placeholder="900.00">
      </div>
      <div class="field">
        <label class="label" for="qs-dep">Ubicación</label>
        <select id="qs-dep" data-bind="location.departamento" data-type="str">
          ${DEPARTAMENTOS.map((d) => `<option ${d === state.location.departamento ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
    </div>
    <p class="note">${icon('info')}<span>Los precios de <strong>Paiz y La Torre</strong> son los publicados en sus tiendas en línea el ${esc(snapshotDate())}, sin sucursal elegida. Lo que falte lo registras con "Mi precio". Puedes cambiar de tienda en Ajustes.</span></p>
    <button class="btn primary wide" data-action="finish-onboarding">Crear mi menú</button>
  </section>`;
}

export function stepper(path, value, min, max, labelledBy) {
  return `<div class="stepper" role="group" ${labelledBy ? `aria-labelledby="${labelledBy}"` : ''}>
    <button class="btn icon" data-action="step" data-path="${path}" data-delta="-1" data-min="${min}" data-max="${max}" aria-label="Menos" ${value <= min ? 'disabled' : ''}>${icon('menos')}</button>
    <output aria-live="polite">${value}</output>
    <button class="btn icon" data-action="step" data-path="${path}" data-delta="1" data-min="${min}" data-max="${max}" aria-label="Más" ${value >= max ? 'disabled' : ''}>${icon('mas')}</button>
  </div>`;
}

// ---------- Presupuesto: el ticket ----------
export function budgetCard(ctx, { compact = false } = {}) {
  const { result, days } = ctx;
  const b = result.budget;
  const t = result.purchase.totals;
  const budget = b.budgetCents ?? 0;
  const scale = Math.max(budget, b.spentKnownCents, 1);
  const pct = (c) => `${((Math.min(c, scale) / scale) * 100).toFixed(2)}%`;
  const free = Math.max(budget - b.spentKnownCents, 0);
  let total;
  let tone;
  let note = '';
  if (b.status === 'sin-presupuesto') {
    total = `<span data-tween="${b.spentKnownCents}" data-tween-key="cotizado">${q(b.spentKnownCents)}</span>`;
    note = 'cotizados; indica un presupuesto en Ajustes.';
    tone = '';
  } else if (b.balanceCents >= 0) {
    const unsure = b.pendingCount || b.staleCount;
    total = `${unsure ? 'Quedan' : 'Te quedan'} <span data-tween="${b.balanceCents}" data-tween-key="saldo">${q(b.balanceCents)}</span>`;
    note = b.pendingCount
      ? 'por ahora: faltan precios, no se puede confirmar.'
      : b.staleCount ? `por ahora: ${b.staleCount} precio${b.staleCount === 1 ? ' es' : 's son'} de hace más de ${PRICE_MAX_AGE_DAYS.guardado} días; vuelve a consultarlos.` : '';
    tone = unsure ? '' : 'ok';
  } else {
    total = `Faltan <span data-tween="${b.shortfallCents}" data-tween-key="faltante">${q(b.shortfallCents)}</span>`;
    note = b.shortfallIsMinimum ? 'como mínimo: además hay productos sin precio.' : '';
    tone = 'danger';
  }
  const pendingStamp = b.pendingCount
    ? `<span class="stamp-mark" role="img" aria-label="${b.pendingCount} productos sin cotizar">Sin cotizar · ${b.pendingCount}</span>`
    : '';
  return `
  <section class="ticket" id="ticket" aria-labelledby="budget-title">
    <h2 id="budget-title" class="ticket-title">Presupuesto</h2>
    <p class="ticket-total print-line ${tone}" style="--i:0" aria-live="polite">${total}</p>
    ${note || !compact ? `<p class="ticket-note print-line" style="--i:1">${esc(note)}${compact ? '' : ` <button class="btn link" data-action="toggle-explain" aria-expanded="${!!ctx.ui.explainOpen}" aria-controls="explain">¿Cómo se calculó?</button>`}</p>` : ''}
    <div class="rule-double" aria-hidden="true"></div>
    <ul class="ticket-rows">
      <li class="leader meta print-line" style="--i:2"><span>Semana</span><span class="num">${esc(periodText(days))}</span></li>
      <li class="leader print-line" style="--i:3"><span>Presupuesto</span><span class="num">${b.budgetCents ? q(b.budgetCents) : '—'}</span></li>
      <li class="leader print-line" style="--i:4"><span>Compra cotizada</span><span class="num">${q(b.purchaseKnownCents)}</span></li>
      <li class="leader print-line" style="--i:5"><span>Gastos adicionales</span><span class="num">${q(b.extrasCents)}</span></li>
    </ul>
    <div class="rule-double" aria-hidden="true"></div>
    <div class="ticket-meter print-line" style="--i:6">
      <div class="bar" role="img" aria-label="${esc(budgetMessage(b, q))}">
        <span class="seg buy" data-w="${pct(Math.min(b.purchaseKnownCents, scale))}" style="width:${pct(Math.min(b.purchaseKnownCents, scale))}"></span>
        <span class="seg extra" data-w="${pct(b.extrasCents)}" style="width:${pct(b.extrasCents)}"></span>
        ${free ? `<span class="seg free" data-w="${pct(free)}" style="width:${pct(free)}"></span>` : ''}
        ${b.pendingCount ? '<span class="seg pending"></span>' : ''}
      </div>
      ${pendingStamp}
    </div>
    <div class="ticket-actions">
      <button class="btn" data-action="go" data-view="compras">Ver lista de compras</button>
      <button class="count-badge" data-action="go" data-view="compras" aria-label="${t.toBuy} productos por comprar"><b>${t.toBuy}</b><span>productos</span></button>
    </div>
    ${compact ? '' : budgetExplain(ctx)}
  </section>`;
}

function budgetExplain(ctx) {
  const { result, state } = ctx;
  const b = result.budget;
  const t = result.purchase.totals;
  const extras = state.extras.filter((e) => Number.isInteger(e.cents));
  const transport = state.transport[state.stores.primary];
  return `
  <details class="explain" id="explain" ${ctx.ui.explainOpen ? 'open' : ''}>
    <summary>¿Cómo se calculó?</summary>
    <ol class="calc">
      <li>Se sumó lo que piden todas las recetas del período, ingrediente por ingrediente (${result.needs.size} ingredientes).</li>
      <li>Se descontó lo que ya tienes en casa: ${t.inPantry} ingrediente${t.inPantry === 1 ? '' : 's'} cubierto${t.inPantry === 1 ? '' : 's'} por completo${t.pantryValueCents ? `; lo que usas de tu despensa vale ${q(t.pantryValueCents)}` : ''}.</li>
      <li>Para lo que falta se calcularon empaques completos en <b>${esc(storeLabel(state.stores.primary, state))}</b>: ${t.quoted} producto${t.quoted === 1 ? '' : 's'} cotizado${t.quoted === 1 ? '' : 's'}.</li>
    </ol>
    <table class="sum">
      <tbody>
        <tr><th scope="row">Presupuesto</th><td>${b.budgetCents ? q(b.budgetCents) : '—'}</td></tr>
        <tr><th scope="row">− Compra cotizada (empaques completos)</th><td>${q(b.purchaseKnownCents)}</td></tr>
        ${extras.map((e) => `<tr><th scope="row">− ${esc(e.label)}</th><td>${q(e.cents)}</td></tr>`).join('')}
        ${Number.isInteger(transport) ? `<tr><th scope="row">− Transporte o envío</th><td>${q(transport)}</td></tr>` : ''}
        <tr class="total"><th scope="row">= Saldo ${b.pendingCount ? '(sin los faltantes)' : ''}</th><td>${b.balanceCents === null || b.balanceCents === undefined ? '—' : q(b.balanceCents)}</td></tr>
      </tbody>
    </table>
    <dl class="facts">
      <div><dt>Valor de los ingredientes que usan las comidas</dt><dd>${q(t.usedValueKnownCents)}${t.missing.length ? ' (sin los faltantes)' : ''}</dd></div>
      <div><dt>Valor aproximado de lo que sobrará de los empaques</dt><dd>${q(t.leftoverValueCents)}</dd></div>
    </dl>
    <p class="muted small">El valor usado es proporcional: si una receta usa 200 g de un paquete de 1 kg de Q12.00, vale Q2.40, pero necesitas Q12.00 para comprar el paquete. Por eso el dinero a pagar es mayor que el valor usado.</p>
    ${!Number.isInteger(transport) ? '<p class="muted small">Transporte o envío no incluido. Puedes agregarlo en Ajustes → Gastos adicionales.</p>' : ''}
    ${t.missing.length ? `<p class="small"><b>Faltan por cotizar:</b> ${t.missing.map((m) => esc(m.ingredient.name)).join(', ')}.</p>` : ''}
  </details>`;
}

function suggestionsCard(ctx) {
  const { result, state } = ctx;
  if (!result.suggestions.length) {
    if (result.budget.status === 'insuficiente') {
      return `<section class="card"><h2 class="h3">Cómo ajustar</h2><p class="muted">No encontramos recetas más baratas que cumplan tus preferencias. Puedes aumentar el presupuesto, registrar precios de mercado o quitar comidas desde el menú.</p></section>`;
    }
    return '';
  }
  const slotById = Object.fromEntries(result.slots.map((s) => [s.id, s]));
  const items = result.suggestions.map((s) => {
    if (s.kind === 'receta') {
      const slot = slotById[s.slotId];
      const day = ctx.days[slot.day];
      return `<li class="sugg">
        <div><p><b>${esc(RECIPE_BY_ID[s.fromId].name)}</b> → <b>${esc(RECIPE_BY_ID[s.recipeId].name)}</b></p>
        <span class="muted small">${esc(dayLabel(day))} · ${mealLabel(slot.meal)}</span>
        <span class="pill ok">${q(s.savingCents)} menos en la compra</span></div>
        <button class="btn small" data-action="apply-swap" data-slot="${s.slotId}" data-recipe="${s.recipeId}">Cambiar</button>
      </li>`;
    }
    if (s.kind === 'tienda') {
      return `<li class="sugg"><div>Comprar todo en <b>${esc(storeLabel(s.storeId, state))}</b> <span class="pill ok">${q(s.savingCents)} menos</span></div>
        <button class="btn small" data-action="set-primary" data-store="${s.storeId}">Usar esa tienda</button></li>`;
    }
    if (s.kind === 'marcas') {
      return `<li class="sugg"><div>Tienes ${s.count} marca${s.count > 1 ? 's' : ''} fija${s.count > 1 ? 's' : ''}. Aceptar alternativas puede bajar el total.</div>
        <button class="btn small" data-action="go" data-view="compras">Revisar</button></li>`;
    }
    return '';
  });
  return `<section class="card" aria-labelledby="sugg-title">
    <h2 id="sugg-title" class="h3">Opciones para que alcance</h2>
    <p class="muted small">Nada se cambia sin que lo elijas. Los ahorros se calcularon recalculando la compra completa.</p>
    <ul class="sugg-list">${items.join('')}</ul>
  </section>`;
}

function nextMeals(ctx) {
  const { result, days } = ctx;
  const today = new Date().toISOString().slice(0, 10);
  let startIdx = days.findIndex((d) => d.iso >= today && !d.skipped);
  if (startIdx < 0) startIdx = 0;
  const first = result.slots.find((s) => s.day >= startIdx);
  if (!first) return '';
  const sameDay = result.slots.filter((s) => s.day === first.day);
  const day = days[first.day];
  const title = day.iso === today ? 'Hoy' : dayLabel(day, true);
  return `<section class="today" aria-labelledby="next-title">
    <div class="section-head"><h2 id="next-title" class="h2">${esc(title)}</h2></div>
    <ul class="meal-list">${sameDay.map((s, i) => `<li>${slotCard(ctx, s, { compact: true, highlight: i === 0 })}</li>`).join('')}</ul>
  </section>`;
}

export function viewSemana(ctx) {
  const { state } = ctx;
  if (!state.onboarded) return quickStart(ctx);
  return `
  ${budgetCard(ctx)}
  ${nextMeals(ctx)}
  ${suggestionsCard(ctx)}`;
}

// ---------- Menú ----------
export function slotCard(ctx, slot, { compact = false, highlight = false } = {}) {
  const r = RECIPE_BY_ID[slot.recipeId];
  const cost = ctx.result.slotCosts[slot.id];
  const conflict = checkRecipe(r, ctx.state.prefs, INGREDIENTS);
  const flash = ctx.ui.flash === slot.id ? ' flash' : '';
  const price = cost
    ? `<span class="slot-price">${q(cost.cents)}${cost.complete ? '' : '+'}<small>/porción</small></span>`
    : '';
  return `
  <article class="slot${flash}" data-slot-card="${slot.id}">
    ${dishArt(r)}
    <div class="slot-body">
      <h3><button class="link-title" data-action="open-recipe" data-slot="${slot.id}">${esc(r.name)}</button></h3>
      <p class="meta"><span>${r.minutes} min</span><span>${slot.servings} porci${slot.servings === 1 ? 'ón' : 'ones'}</span>${cost && !cost.complete ? `<span>${cost.missing.length} sin precio</span>` : ''}</p>
    </div>
    <div class="slot-side">
      <span class="meal-tag${highlight ? '' : ' quiet'}">${mealLabel(slot.meal)}</span>
      ${price}
    </div>
    ${!conflict.ok ? `<p class="status danger small">${icon('alerta')} Ya no cumple tus preferencias: ${esc(conflict.reasons.join(', '))}.</p>` : ''}
    ${slot.relaxed ? `<p class="muted small">Supera tu tiempo máximo: no había otra receta que cumpliera lo demás.</p>` : ''}
    ${compact ? '' : `<div class="slot-actions">
      ${stepperSlot(slot)}
      <button class="btn small" data-action="open-swap" data-slot="${slot.id}">${icon('cambiar')} Cambiar</button>
    </div>`}
  </article>`;
}

function stepperSlot(slot) {
  return `<div class="stepper small" role="group" aria-label="Porciones">
    <button class="btn icon" data-action="servings" data-slot="${slot.id}" data-delta="-1" aria-label="Una porción menos" ${slot.servings <= 1 ? 'disabled' : ''}>${icon('menos')}</button>
    <output>${slot.servings}</output>
    <button class="btn icon" data-action="servings" data-slot="${slot.id}" data-delta="1" aria-label="Una porción más">${icon('mas')}</button>
  </div>`;
}

export function viewMenu(ctx) {
  const { state, result, days } = ctx;
  if (!state.onboarded) return quickStart(ctx);
  const conflicts = result.slots.filter((s) => !checkRecipe(RECIPE_BY_ID[s.recipeId], state.prefs, INGREDIENTS).ok);
  const byDay = new Map();
  for (const s of state.plan.slots) {
    if (!state.household.meals.includes(s.meal)) continue;
    (byDay.get(s.day) ?? byDay.set(s.day, []).get(s.day)).push(s);
  }
  const order = ['desayuno', 'almuerzo', 'cena'];
  return `
  <div class="toolbar">
    <div>
      <h2 class="h2">Menú</h2>
      <p class="muted small">${esc(periodText(days))} · ${state.household.people} persona${state.household.people > 1 ? 's' : ''} · ${state.household.meals.map(mealLabel).join(', ').toLowerCase()}</p>
    </div>
    <button class="btn" data-action="regenerate">${icon('cambiar')} Otra propuesta</button>
  </div>
  ${conflicts.length ? `<div class="card banner danger"><p>${conflicts.length} receta${conflicts.length > 1 ? 's' : ''} ya no cumple${conflicts.length > 1 ? 'n' : ''} tus preferencias.</p><button class="btn small" data-action="fix-conflicts">Reemplazarlas</button></div>` : ''}
  ${result.menuNotices?.length ? `<div class="card banner warn">${result.menuNotices.map((n) => `<p>${esc(n)}</p>`).join('')}</div>` : ''}
  <p class="muted small">Costo por porción: valor proporcional de los ingredientes en ${esc(storeLabel(state.stores.primary, state))}. Lo que pagas por empaques completos está en Compras.</p>
  ${days
    .map((d) => {
      const slots = (byDay.get(d.index) ?? []).filter((s) => s.recipeId).sort((a, b) => order.indexOf(a.meal) - order.indexOf(b.meal));
      return `<section class="day ${d.skipped ? 'skipped' : ''}" aria-labelledby="day-${d.index}">
        <div class="day-head">
          <h3 id="day-${d.index}" class="day-title">${esc(cap(d.weekday))} <span>${d.dayOfMonth} ${d.month}</span></h3>
          <label class="switch small"><input type="checkbox" data-action="toggle-day" data-day="${d.index}" ${d.skipped ? '' : 'checked'}><span>${d.skipped ? 'No se cocina' : 'Se cocina'}</span></label>
        </div>
        ${d.skipped ? '' : `<ul class="meal-list">${slots.map((s) => `<li>${slotCard(ctx, s, { highlight: true })}</li>`).join('') || '<li class="muted">Sin recetas para este día.</li>'}</ul>`}
      </section>`;
    })
    .join('')}`;
}
