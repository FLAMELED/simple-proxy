// Vistas "Esta semana" y "Menú".
import { esc, q, icon, mealLabel, dayLabel, storeLabel, proteinIcon, proteinLabel, cap } from './common.js';
import { budgetMessage } from '../engine/budget.js';
import { checkRecipe } from '../engine/selector.js';
import { RECIPE_BY_ID } from '../data/recipes.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { DEPARTAMENTOS } from '../data/stores.js';

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
    <p class="note">${icon('info')}<span>Las tiendas y precios iniciales son <strong>ejemplos ficticios</strong> para que veas cómo funciona. Puedes elegir Paiz, La Torre u otras en Ajustes y registrar precios reales.</span></p>
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

// ---------- Presupuesto ----------
export function budgetCard(ctx, { compact = false } = {}) {
  const { result, state, days } = ctx;
  const b = result.budget;
  const t = result.purchase.totals;
  const budget = b.budgetCents ?? 0;
  const scale = Math.max(budget, b.spentKnownCents, 1);
  const pct = (c) => `${((c / scale) * 100).toFixed(2)}%`;
  const free = Math.max(budget - b.spentKnownCents, 0);
  const headline =
    b.status === 'sin-presupuesto'
      ? `<span class="big">${q(b.spentKnownCents)}</span><span class="big-label">cotizados</span>`
      : b.balanceCents >= 0
        ? `<span class="big" data-tween="${b.balanceCents}" data-tween-key="saldo">${q(b.balanceCents)}</span><span class="big-label">${b.pendingCount ? 'disponibles por ahora' : 'te quedan'}</span>`
        : `<span class="big danger" data-tween="${b.shortfallCents}" data-tween-key="faltante">${q(b.shortfallCents)}</span><span class="big-label">${b.shortfallIsMinimum ? 'faltan, como mínimo' : 'faltan'}</span>`;
  const tone = { alcanza: 'ok', 'sin-confirmar': 'warn', insuficiente: 'danger', 'sin-presupuesto': 'warn' }[b.status];
  return `
  <section class="card budget" aria-labelledby="budget-title">
    <div class="budget-head">
      <div>
        <h2 id="budget-title" class="eyebrow">Presupuesto · ${esc(periodText(days))}</h2>
        <div class="headline">${headline}</div>
      </div>
      ${b.budgetCents ? `<div class="of">de ${q(b.budgetCents)}</div>` : ''}
    </div>
    <div class="bar" role="img" aria-label="${esc(budgetMessage(b, q))}">
      <span class="seg buy" data-w="${pct(b.purchaseKnownCents)}" style="width:${pct(b.purchaseKnownCents)}"></span>
      <span class="seg extra" data-w="${pct(b.extrasCents)}" style="width:${pct(b.extrasCents)}"></span>
      ${b.budgetCents ? `<span class="seg free" data-w="${pct(free)}" style="width:${pct(free)}"></span>` : ''}
      ${b.pendingCount ? `<span class="seg pending" title="Sin cotizar">?</span>` : ''}
    </div>
    <ul class="legend">
      <li><i class="dot buy"></i>Compra cotizada <b>${q(b.purchaseKnownCents)}</b></li>
      ${b.extrasCents ? `<li><i class="dot extra"></i>Gastos adicionales <b>${q(b.extrasCents)}</b></li>` : ''}
      ${b.budgetCents ? `<li><i class="dot free"></i>Disponible <b>${q(free)}</b></li>` : ''}
      ${b.pendingCount ? `<li><i class="dot pending"></i>Sin cotizar <b>${b.pendingCount} producto${b.pendingCount > 1 ? 's' : ''}</b></li>` : ''}
    </ul>
    <p class="status ${tone}" role="status">${icon(tone === 'ok' ? 'check' : 'alerta')} ${esc(budgetMessage(b, q))}</p>
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
  <details class="explain">
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
  const upcoming = result.slots.filter((s) => s.day >= startIdx).slice(0, 4);
  if (!upcoming.length) return '';
  return `<section aria-labelledby="next-title">
    <div class="section-head"><h2 id="next-title" class="h3">Próximas comidas</h2><button class="btn link" data-action="go" data-view="menu">Ver menú completo</button></div>
    <div class="slot-list">${upcoming.map((s) => slotCard(ctx, s, { compact: true })).join('')}</div>
  </section>`;
}

export function viewSemana(ctx) {
  const { state, result } = ctx;
  if (!state.onboarded) return quickStart(ctx);
  const t = result.purchase.totals;
  return `
  ${budgetCard(ctx)}
  ${suggestionsCard(ctx)}
  <button class="card shortcut" data-action="go" data-view="compras">
    ${icon('compras')}
    <span><b>Lista de compras</b><span class="muted small">${t.toBuy} producto${t.toBuy === 1 ? '' : 's'} por comprar · ${t.inPantry} ya en casa · ${esc(storeLabel(state.stores.primary, state))}</span></span>
    <span class="amount">${q(t.purchaseCents)}${t.missing.length ? '<small> + faltantes</small>' : ''}</span>
  </button>
  ${nextMeals(ctx)}`;
}

// ---------- Menú ----------
export function slotCard(ctx, slot, { compact = false } = {}) {
  const r = RECIPE_BY_ID[slot.recipeId];
  const day = ctx.days[slot.day];
  const cost = ctx.result.slotCosts[slot.id];
  const conflict = checkRecipe(r, ctx.state.prefs, INGREDIENTS);
  const flash = ctx.ui.flash === slot.id ? ' flash' : '';
  const costText = cost
    ? cost.complete
      ? `${q(cost.cents)} por porción`
      : `${q(cost.cents)}+ por porción <span class="pill warn">${cost.missing.length} sin precio</span>`
    : '';
  return `
  <article class="slot${flash}" data-slot-card="${slot.id}">
    <div class="slot-icon" aria-hidden="true">${icon(proteinIcon(r.protein))}</div>
    <div class="slot-body">
      <p class="eyebrow">${compact ? `${esc(dayLabel(day))} · ` : ''}${mealLabel(slot.meal)}</p>
      <h3><button class="link-title" data-action="open-recipe" data-slot="${slot.id}">${esc(r.name)}</button></h3>
      <p class="meta">
        <span>${icon('reloj')} ${r.minutes} min</span>
        <span>${icon('personas')} ${slot.servings} porci${slot.servings === 1 ? 'ón' : 'ones'}</span>
        <span>${costText}</span>
      </p>
      ${!conflict.ok ? `<p class="status danger small">${icon('alerta')} Ya no cumple tus preferencias: ${esc(conflict.reasons.join(', '))}.</p>` : ''}
      ${slot.relaxed ? `<p class="muted small">Supera tu tiempo máximo: no había otra receta que cumpliera lo demás.</p>` : ''}
    </div>
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
  <p class="muted small">El costo por porción es el valor proporcional de los ingredientes que usa (precios de ${esc(storeLabel(state.stores.primary, state))}). El dinero a pagar por empaques está en la lista de compras.</p>
  ${days
    .map((d) => {
      const slots = (byDay.get(d.index) ?? []).filter((s) => s.recipeId).sort((a, b) => order.indexOf(a.meal) - order.indexOf(b.meal));
      return `<section class="day ${d.skipped ? 'skipped' : ''}" aria-labelledby="day-${d.index}">
        <div class="day-head">
          <h3 id="day-${d.index}" class="day-title">${esc(cap(d.weekday))} <span>${d.dayOfMonth} ${d.month}</span></h3>
          <label class="switch small"><input type="checkbox" data-action="toggle-day" data-day="${d.index}" ${d.skipped ? '' : 'checked'}><span>${d.skipped ? 'No se cocina' : 'Se cocina'}</span></label>
        </div>
        ${d.skipped ? '' : `<div class="slot-list">${slots.map((s) => slotCard(ctx, s)).join('') || '<p class="muted">Sin recetas para este día.</p>'}</div>`}
      </section>`;
    })
    .join('')}`;
}
