// Orquesta el cálculo completo a partir del estado. Todo es determinista y
// verificable: sin IA, sin red.
import { consolidateDemand, applyPantry } from './demand.js';
import { computePurchase } from './purchase.js';
import { evaluateBudget } from './budget.js';
import { compareStores, combineStores } from './compare.js';
import { servingCost, alternativesFor, generateMenu } from './selector.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { RECIPES, RECIPE_BY_ID } from '../data/recipes.js';
import { sampleOffers } from '../data/sample-prices.js';
import REAL from '../data/real-prices.js';
import { planDays } from '../state/state.js';

let SAMPLE_CACHE = null;
const samples = () => (SAMPLE_CACHE ??= sampleOffers());

/** Precios reales capturados de páginas públicas (último precio guardado). */
export const REAL_SNAPSHOT = REAL;

/** Todas las ofertas disponibles, cada una con su origen. */
export function allOffers(state) {
  const fetchedIds = new Set(state.fetchedPrices.map((o) => o.sourceUrl));
  // Una consulta más reciente de la misma página reemplaza la captura guardada.
  const saved = (state.useSavedPrices === false ? [] : REAL.offers).filter((o) => !fetchedIds.has(o.sourceUrl));
  return [...(state.demo ? samples() : []), ...saved, ...state.fetchedPrices, ...state.myPrices];
}

export function offersByStore(state) {
  const map = {};
  for (const o of allOffers(state)) (map[o.storeId] ??= []).push(o);
  return map;
}

export function activeSlots(state) {
  const days = planDays(state.household);
  const active = new Set(days.filter((d) => !d.skipped).map((d) => d.index));
  return state.plan.slots.filter((s) => active.has(s.day) && state.household.meals.includes(s.meal) && s.recipeId);
}

export function buildMenu(state, seed = state.plan.seed) {
  const days = planDays(state.household).filter((d) => !d.skipped);
  const byStore = offersByStore(state);
  return generateMenu({
    days,
    meals: ['desayuno', 'almuerzo', 'cena'].filter((m) => state.household.meals.includes(m)),
    people: state.household.people,
    prefs: state.prefs,
    pantry: state.pantry,
    recipes: RECIPES,
    ingredients: INGREDIENTS,
    offers: byStore[state.stores.primary] ?? [],
    seed,
  });
}

function primaryOffers(state, byStore) {
  const own = byStore[state.stores.primary] ?? [];
  const mine = byStore['mis-precios'] ?? [];
  if (state.stores.primary === 'mis-precios') return { offers: own, fallback: null };
  if (state.useMyPrices === 'mas-barato') return { offers: [...own, ...mine], fallback: null };
  if (state.useMyPrices === 'faltantes') return { offers: own, fallback: mine.length ? mine : null };
  return { offers: own, fallback: null };
}

export function computeAll(state) {
  const slots = activeSlots(state);
  const demand = consolidateDemand(slots, RECIPE_BY_ID, INGREDIENTS);
  const needs = applyPantry(demand, state.pantry, INGREDIENTS);
  const byStore = offersByStore(state);
  const opts = { brandLocks: state.brandLocks, acceptedPromos: state.acceptedPromos };
  const { offers, fallback } = primaryOffers(state, byStore);
  const purchase = computePurchase(needs, INGREDIENTS, offers, { ...opts, fallbackOffers: fallback });
  const transportCents = state.transport[state.stores.primary];
  const budget = evaluateBudget({
    budgetCents: state.household.budgetCents,
    totals: purchase.totals,
    extras: state.extras,
    transportCents: Number.isInteger(transportCents) ? transportCents : null,
  });
  const compareIds = state.stores.selected.filter((id) => id !== 'mis-precios');
  const comparison = compareStores(needs, INGREDIENTS, byStore, compareIds, opts);
  const combination = combineStores(comparison, state.transport);
  const slotCosts = {};
  for (const s of slots) {
    const c = servingCost(RECIPE_BY_ID[s.recipeId], offers, INGREDIENTS);
    slotCosts[s.id] = { ...c, totalCents: c.cents * s.servings };
  }
  const purchaseFor = (altSlots) => {
    const n = applyPantry(consolidateDemand(altSlots, RECIPE_BY_ID, INGREDIENTS), state.pantry, INGREDIENTS);
    return computePurchase(n, INGREDIENTS, offers, { ...opts, fallbackOffers: fallback }).totals;
  };
  const suggestions =
    budget.status === 'insuficiente' ? suggestSavings(state, slots, offers, comparison, budget, purchaseFor) : [];
  return { slots, demand, needs, purchase, budget, comparison, combination, slotCosts, suggestions };
}

/** Propuestas para ajustar el gasto. Nunca se aplican solas. */
export function suggestSavings(state, slots, offers, comparison, budget, purchaseFor) {
  const out = [];
  const baseTotals = purchaseFor(slots);
  for (const slot of slots) {
    const alts = alternativesFor(slot, {
      slots, prefs: state.prefs, pantry: state.pantry, recipes: RECIPES, recipeById: RECIPE_BY_ID,
      ingredients: INGREDIENTS, offers, limit: 30,
    });
    // Candidatas: respetan tiempo y no repiten; se ordenan por el ahorro estimado
    // (proporcional) y se verifican recalculando la compra completa.
    const candidates = alts
      .filter((a) => !a.reasons.some((r) => r.kind === 'excede-tiempo' || r.kind === 'repetida'))
      .map((a) => ({ a, est: a.reasons.find((r) => r.kind === 'ahorro')?.cents ?? 0 }))
      .sort((x, y) => y.est - x.est)
      .slice(0, 3);
    let best = null;
    for (const { a } of candidates) {
      // Ahorro real en dinero a pagar, sin agregar productos sin precio.
      const swapped = slots.map((s) => (s.id === slot.id ? { ...s, recipeId: a.recipe.id } : s));
      const t = purchaseFor(swapped);
      const saving = baseTotals.purchaseCents - t.purchaseCents;
      if (saving > 0 && t.missing.length <= baseTotals.missing.length && (!best || saving > best.savingCents)) {
        best = { kind: 'receta', slotId: slot.id, recipeId: a.recipe.id, fromId: slot.recipeId, savingCents: saving };
      }
    }
    if (best) out.push(best);
  }
  out.sort((a, b) => b.savingCents - a.savingCents);
  // Una propuesta por receta destino y solo ahorros de al menos Q1.00.
  const seen = new Set();
  const recipeSuggestions = out
    .filter((x) => x.savingCents >= 100 && !seen.has(x.recipeId) && seen.add(x.recipeId))
    .slice(0, 4);
  const extra = [];
  if (Object.keys(state.brandLocks).length) extra.push({ kind: 'marcas', count: Object.keys(state.brandLocks).length });
  const primaryRow = comparison.rows.find((r) => r.storeId === state.stores.primary);
  for (const row of comparison.rows) {
    if (row.storeId === state.stores.primary || !row.totals.complete) continue;
    if (primaryRow && row.totals.purchaseCents < budget.purchaseKnownCents && primaryRow.totals.complete) {
      extra.push({ kind: 'tienda', storeId: row.storeId, savingCents: budget.purchaseKnownCents - row.totals.purchaseCents });
    }
  }
  return [...recipeSuggestions, ...extra];
}
