// Selección de recetas basada en reglas (sin modelo de IA).
// Restricciones duras: alergias, exclusiones, proteínas excluidas,
// vegetariano, equipo disponible y tiempo máximo por comida.
// Puntaje: uso de la despensa, variedad, favoritas, costo y fin de semana.
import { proportionalCents } from './money.js';
import { toBase, ConversionError } from './units.js';

const MEAT = new Set(['pollo', 'res', 'cerdo', 'pescado']);

function recipeProteins(recipe, ingredients) {
  const set = new Set();
  for (const line of recipe.ingredients) {
    const p = ingredients[line.ing]?.protein;
    if (p) set.add(p);
  }
  return set;
}

function recipeAllergens(recipe, ingredients) {
  const set = new Set();
  for (const line of recipe.ingredients) for (const a of ingredients[line.ing]?.allergens ?? []) set.add(a);
  return set;
}

/** ¿La receta cumple las restricciones? Devuelve los motivos de rechazo. */
export function checkRecipe(recipe, prefs, ingredients, meal = null) {
  const reasons = [];
  if (meal && !recipe.meals.includes(meal)) reasons.push('no es para esta comida');
  const allergens = recipeAllergens(recipe, ingredients);
  for (const a of prefs.allergies ?? []) if (allergens.has(a)) reasons.push(`contiene ${a}`);
  for (const line of recipe.ingredients) {
    if ((prefs.excludedIngredients ?? []).includes(line.ing)) reasons.push(`lleva ${ingredients[line.ing].name}`);
  }
  const proteins = recipeProteins(recipe, ingredients);
  for (const p of prefs.excludedProteins ?? []) if (proteins.has(p)) reasons.push(`lleva ${p}`);
  if (prefs.vegetarian && [...proteins].some((p) => MEAT.has(p))) reasons.push('no es vegetariana');
  const equipment = new Set(prefs.equipment ?? []);
  for (const e of recipe.equipment) if (!equipment.has(e)) reasons.push(`requiere ${e}`);
  return { ok: reasons.length === 0, reasons };
}

function withinTime(recipe, prefs, meal) {
  const max = prefs.maxMinutes?.[meal];
  return !max || recipe.minutes <= max;
}

/** Hash determinista pequeño para desempatar con una semilla. */
function hash(str) {
  let h = 2166136261;
  for (let k = 0; k < str.length; k++) {
    h ^= str.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Costo proporcional de los ingredientes de una porción, con el precio por
 * unidad más bajo disponible en las ofertas dadas. Devuelve también los
 * ingredientes sin precio para no presentarlo como completo.
 */
export function servingCost(recipe, offers, ingredients) {
  let cents = 0;
  const missing = [];
  for (const line of recipe.ingredients) {
    const ing = ingredients[line.ing];
    let qty;
    try {
      qty = toBase(line.qty, line.unit, ing).qty;
    } catch (err) {
      if (err instanceof ConversionError) {
        missing.push(line.ing);
        continue;
      }
      throw err;
    }
    let best = null;
    for (const o of offers) {
      if (o.ingredientId !== line.ing || o.availability === 'agotado' || !Number.isInteger(o.priceCents)) continue;
      let pack;
      try {
        pack = toBase(o.packQty, o.packUnit, ing).qty;
      } catch {
        continue;
      }
      const c = proportionalCents(o.priceCents, qty, pack);
      if (best === null || c < best) best = c;
    }
    if (best === null) missing.push(line.ing);
    else cents += best;
  }
  return { cents: Math.round(cents / recipe.yield), complete: missing.length === 0, missing };
}

function pantryIds(pantry) {
  return new Set(pantry.filter((p) => Number(p.qty) > 0).map((p) => p.ingredientId));
}

function scoreRecipe(recipe, ctx, slot) {
  const { prefs, ingredients, pantrySet, used, seed, costOf, avgCost } = ctx;
  let score = 0;
  const lines = recipe.ingredients.length;
  const pantryHits = recipe.ingredients.filter((l) => pantrySet.has(l.ing) && ingredients[l.ing].cat !== 'despensa').length;
  score += (pantryHits / lines) * 3;
  if ((prefs.favorites ?? []).includes(recipe.id)) score += 2;
  const times = used.recipes.get(recipe.id) ?? 0;
  score -= times * 6;
  const protein = recipe.protein ?? 'ninguna';
  if (used.lastProtein === protein && protein !== 'ninguna') score -= 1.5;
  if (used.dayProteins.get(slot.day)?.has(protein) && protein !== 'ninguna') score -= 1;
  const weekend = slot.weekend;
  if (recipe.tags.includes('fin-de-semana')) score += weekend ? 0.8 : -2;
  if (costOf && avgCost) {
    const c = costOf(recipe);
    if (c.complete) score -= (c.cents / avgCost - 1) * (prefs.budgetPriority ? 2.5 : 1);
  }
  score += hash(`${seed}|${slot.day}|${slot.meal}|${recipe.id}`) * 1.2;
  return score;
}

/**
 * Genera un menú: un slot por día × comida.
 * @param days [{ index, date, weekend }]
 */
export function generateMenu({ days, meals, people, prefs, pantry = [], recipes, ingredients, offers = [], seed = 1 }) {
  const costCache = new Map();
  const costOf = (r) => {
    if (!costCache.has(r.id)) costCache.set(r.id, servingCost(r, offers, ingredients));
    return costCache.get(r.id);
  };
  const costs = recipes.map(costOf).filter((c) => c.complete).map((c) => c.cents);
  const avgCost = costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : null;
  const ctx = {
    prefs, ingredients, pantrySet: pantryIds(pantry), seed, costOf: offers.length ? costOf : null, avgCost,
    used: { recipes: new Map(), lastProtein: null, dayProteins: new Map() },
  };
  const slots = [];
  const notices = [];
  for (const day of days) {
    for (const meal of meals) {
      const slot = { id: `d${day.index}-${meal}`, day: day.index, meal, weekend: day.weekend, servings: people, recipeId: null };
      const allowed = recipes.filter((r) => checkRecipe(r, prefs, ingredients, meal).ok);
      let pool = allowed.filter((r) => withinTime(r, prefs, meal));
      if (pool.length === 0 && allowed.length) {
        pool = allowed;
        slot.relaxed = 'tiempo';
      }
      if (pool.length === 0) {
        notices.push(`Ninguna receta cumple tus restricciones para ${meal}.`);
        slots.push(slot);
        continue;
      }
      const ranked = pool.map((r) => ({ r, s: scoreRecipe(r, ctx, slot) })).sort((a, b) => b.s - a.s || a.r.id.localeCompare(b.r.id));
      const pick = ranked[0].r;
      slot.recipeId = pick.id;
      registerUse(ctx.used, pick, slot);
      slots.push(slot);
    }
  }
  for (const s of slots) delete s.weekend;
  return { slots, notices };
}

function registerUse(used, recipe, slot) {
  used.recipes.set(recipe.id, (used.recipes.get(recipe.id) ?? 0) + 1);
  const protein = recipe.protein ?? 'ninguna';
  used.lastProtein = protein;
  if (!used.dayProteins.has(slot.day)) used.dayProteins.set(slot.day, new Set());
  used.dayProteins.get(slot.day).add(protein);
}

/**
 * Alternativas para cambiar la receta de un slot, con una explicación
 * breve de qué cambia y por qué.
 */
export function alternativesFor(slot, { slots, prefs, pantry = [], recipes, recipeById, ingredients, offers = [], limit = 6 }) {
  const current = recipeById[slot.recipeId];
  const pantrySet = pantryIds(pantry);
  const usedCount = new Map();
  for (const s of slots) if (s.recipeId) usedCount.set(s.recipeId, (usedCount.get(s.recipeId) ?? 0) + 1);
  const curCost = current ? servingCost(current, offers, ingredients) : null;
  const options = [];
  for (const r of recipes) {
    if (r.id === slot.recipeId) continue;
    const check = checkRecipe(r, prefs, ingredients, slot.meal);
    if (!check.ok) continue;
    const cost = servingCost(r, offers, ingredients);
    const reasons = [];
    if (curCost && curCost.complete && cost.complete && offers.length) {
      const delta = cost.cents - curCost.cents;
      if (delta !== 0) reasons.push({ kind: delta < 0 ? 'ahorro' : 'gasto', cents: Math.abs(delta) * slot.servings });
    } else if (!cost.complete && offers.length) {
      reasons.push({ kind: 'sin-precio', count: cost.missing.length });
    }
    if (current) {
      const dt = r.minutes - current.minutes;
      if (dt !== 0) reasons.push({ kind: 'tiempo', minutes: dt });
      if ((r.protein ?? 'ninguna') !== (current.protein ?? 'ninguna')) {
        reasons.push({ kind: 'proteina', from: current.protein ?? 'sin carne', to: r.protein ?? 'sin carne' });
      }
    }
    const pantryUse = r.ingredients.filter((l) => pantrySet.has(l.ing) && ingredients[l.ing].cat !== 'despensa').map((l) => ingredients[l.ing].name);
    if (pantryUse.length) reasons.push({ kind: 'despensa', names: pantryUse.slice(0, 3) });
    const timeOk = withinTime(r, prefs, slot.meal);
    if (!timeOk) reasons.push({ kind: 'excede-tiempo', minutes: r.minutes, max: prefs.maxMinutes?.[slot.meal] });
    const repeats = usedCount.get(r.id) ?? 0;
    if (repeats) reasons.push({ kind: 'repetida', times: repeats });
    const score = (timeOk ? 0 : -5) - repeats * 3 + pantryUse.length - (cost.complete && offers.length ? cost.cents / 1000 : 0);
    options.push({ recipe: r, cost, reasons, score });
  }
  options.sort((a, b) => b.score - a.score || a.recipe.id.localeCompare(b.recipe.id));
  return options.slice(0, limit);
}

export { recipeAllergens, recipeProteins };
