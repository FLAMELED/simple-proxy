// Hojas inferiores: detalle de receta y cambio de receta.
import { esc, q, icon, mealLabel, dayLabel, equipmentLabel, proteinLabel, describeQty, cap } from './common.js';
import { RECIPES, RECIPE_BY_ID } from '../data/recipes.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { describeRecipeQty, toBase } from '../engine/units.js';
import { alternativesFor } from '../engine/selector.js';
import { offersByStore } from '../engine/index.js';

function recipeSheet(ctx, slot) {
  const r = RECIPE_BY_ID[slot.recipeId];
  const factor = slot.servings / r.yield;
  const day = ctx.days[slot.day];
  const cost = ctx.result.slotCosts[slot.id];
  const fav = ctx.state.prefs.favorites.includes(r.id);
  return `
  <header class="sheet-head">
    <div><p class="eyebrow">${esc(dayLabel(day, true))} · ${mealLabel(slot.meal)}</p><h2 id="sheet-title">${esc(r.name)}</h2></div>
    <button class="btn icon" data-action="close-sheet" aria-label="Cerrar">${icon('cerrar')}</button>
  </header>
  <div class="sheet-body">
    <p class="meta"><span>${icon('reloj')} ${r.minutes} min</span><span>${icon('personas')} ${slot.servings} porciones (la receta rinde ${r.yield})</span><span>${proteinLabel(r.protein)}</span></p>
    ${cost ? `<p class="small">Valor de ingredientes usados: <b>${q(cost.totalCents)}</b> (${q(cost.cents)} por porción)${cost.complete ? '' : ` · <span class="pill warn">${cost.missing.length} ingrediente(s) sin precio</span>`}</p>` : ''}
    <h3 class="h3">Ingredientes para ${slot.servings} porciones</h3>
    <ul class="ing-list">${r.ingredients.map((l) => {
      const ing = INGREDIENTS[l.ing];
      const base = toBase(l.qty * factor, l.unit, ing);
      const orig = describeRecipeQty(Math.round(l.qty * factor * 100) / 100, l.unit, ing);
      const showBase = l.unit !== ing.base && !['manojo'].includes(ing.base);
      return `<li><span>${esc(cap(ing.name))}${l.note ? ` <span class="muted">(${esc(l.note)})</span>` : ''}</span><span class="qty">${esc(orig)}${showBase ? ` <span class="muted">≈ ${esc(describeQty(base.qty, ing))}</span>` : ''}</span></li>`;
    }).join('')}</ul>
    <h3 class="h3">Equipo</h3>
    <p>${r.equipment.length ? r.equipment.map(equipmentLabel).join(', ') : 'No requiere cocción'}</p>
    <h3 class="h3">Preparación</h3>
    <ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <p class="small muted">Receta de referencia, no probada en cocina por esta app. Cantidades en crudo. Las equivalencias marcadas con ≈ son aproximadas.</p>
    <div class="actions">
      <button class="btn" data-action="toggle-fav" data-recipe="${r.id}" aria-pressed="${fav}">${icon('estrella', fav ? 'filled' : '')} ${fav ? 'Favorita' : 'Marcar como favorita'}</button>
      <button class="btn primary" data-action="open-swap" data-slot="${slot.id}">${icon('cambiar')} Cambiar receta</button>
    </div>
  </div>`;
}

function reasonText(r, ctx) {
  switch (r.kind) {
    case 'ahorro': return `<span class="pill ok">${q(r.cents)} menos en ingredientes</span>`;
    case 'gasto': return `<span class="pill">${q(r.cents)} más en ingredientes</span>`;
    case 'sin-precio': return `<span class="pill warn">${r.count} sin precio</span>`;
    case 'tiempo': return `<span class="pill">${r.minutes < 0 ? `${-r.minutes} min menos` : `${r.minutes} min más`}</span>`;
    case 'proteina': return `<span class="pill">${esc(proteinLabel(r.from === 'sin carne' ? null : r.from))} → ${esc(proteinLabel(r.to === 'sin carne' ? null : r.to))}</span>`;
    case 'despensa': return `<span class="pill home">Usa lo de casa: ${esc(r.names.join(', '))}</span>`;
    case 'excede-tiempo': return `<span class="pill warn">${r.minutes} min, más que tu máximo de ${r.max}</span>`;
    case 'repetida': return `<span class="pill">Ya está ${r.times} vez${r.times > 1 ? 'es' : ''} en el menú</span>`;
    default: return '';
  }
}

function swapSheet(ctx, slot) {
  const current = RECIPE_BY_ID[slot.recipeId];
  const offers = offersByStore(ctx.state)[ctx.state.stores.primary] ?? [];
  const alts = alternativesFor(slot, {
    slots: ctx.result.slots, prefs: ctx.state.prefs, pantry: ctx.state.pantry, recipes: RECIPES, recipeById: RECIPE_BY_ID,
    ingredients: INGREDIENTS, offers, limit: 8,
  });
  const restrictions = [
    ...ctx.state.prefs.allergies.map((a) => `sin ${a}`),
    ...ctx.state.prefs.excludedProteins.map((p) => `sin ${p}`),
    ...(ctx.state.prefs.vegetarian ? ['vegetariano'] : []),
  ];
  return `
  <header class="sheet-head">
    <div><p class="eyebrow">Cambiar ${mealLabel(slot.meal).toLowerCase()} · ${esc(dayLabel(ctx.days[slot.day], true))}</p><h2 id="sheet-title">En lugar de ${esc(current.name)}</h2></div>
    <button class="btn icon" data-action="close-sheet" aria-label="Cerrar">${icon('cerrar')}</button>
  </header>
  <div class="sheet-body">
    <p class="small muted">Solo aparecen recetas que respetan tus restricciones${restrictions.length ? ` (${esc(restrictions.join(', '))})` : ''} y tu equipo de cocina. Las diferencias de costo son por ${slot.servings} porciones, con precios de la tienda actual.</p>
    ${alts.length ? `<ul class="alt-list">${alts.map((a) => `<li class="alt">
      <div><h3>${esc(a.recipe.name)}</h3><p class="small muted">${a.recipe.minutes} min · ${esc(proteinLabel(a.recipe.protein))}</p>
      <div class="tags">${a.reasons.map((r) => reasonText(r, ctx)).join('')}</div></div>
      <button class="btn small primary" data-action="apply-swap" data-slot="${slot.id}" data-recipe="${a.recipe.id}">Elegir</button>
    </li>`).join('')}</ul>` : '<p>No hay otras recetas que cumplan tus restricciones para esta comida.</p>'}
  </div>`;
}

export function renderSheet(ctx) {
  const s = ctx.ui.sheet;
  if (!s) return '';
  const slot = ctx.state.plan.slots.find((x) => x.id === s.slotId);
  if (!slot) return '';
  return s.type === 'recipe' ? recipeSheet(ctx, slot) : swapSheet(ctx, slot);
}
