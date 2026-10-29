// Paso 1 y 2 del cálculo: demanda consolidada de todo el período y
// descuento de lo que ya hay en casa. No toca precios.
import { toBase, clean, ConversionError } from './units.js';

/**
 * @param slots [{id, day, meal, recipeId, servings}]
 * @param recipes mapa id → receta
 * @param ingredients mapa id → ingrediente
 * @returns Map ingredientId → { ingredientId, qty, approx, notes, uses:[{slotId, recipeId, qty}] , errors[] }
 */
export function consolidateDemand(slots, recipes, ingredients) {
  const demand = new Map();
  for (const slot of slots) {
    const recipe = recipes[slot.recipeId];
    if (!recipe) continue;
    const factor = slot.servings / recipe.yield;
    for (const line of recipe.ingredients) {
      const ing = ingredients[line.ing];
      let entry = demand.get(line.ing);
      if (!entry) {
        entry = { ingredientId: line.ing, qty: 0, approx: false, notes: new Set(), uses: [], errors: [] };
        demand.set(line.ing, entry);
      }
      try {
        const base = toBase(line.qty * factor, line.unit, ing);
        entry.qty = clean(entry.qty + base.qty);
        entry.approx ||= base.approx;
        base.notes.forEach((n) => entry.notes.add(n));
        entry.uses.push({ slotId: slot.id, recipeId: recipe.id, day: slot.day, meal: slot.meal, qty: base.qty, factor });
      } catch (err) {
        if (!(err instanceof ConversionError)) throw err;
        entry.errors.push(err.message);
      }
    }
  }
  for (const e of demand.values()) e.notes = [...e.notes];
  return demand;
}

/**
 * Descuenta la despensa. Solo descuenta existencias del mismo ingrediente
 * (p. ej. frijol seco no cubre frijol volteado).
 * @returns Map ingredientId → { ...demanda, pantryQty, coveredQty, needQty, pantryNotes }
 */
export function applyPantry(demand, pantry, ingredients) {
  const stock = new Map();
  const pantryNotes = new Map();
  for (const item of pantry) {
    const ing = ingredients[item.ingredientId];
    if (!ing) continue;
    try {
      const base = toBase(Number(item.qty), item.unit, ing);
      stock.set(item.ingredientId, clean((stock.get(item.ingredientId) ?? 0) + base.qty));
      if (base.approx) pantryNotes.set(item.ingredientId, base.notes);
    } catch (err) {
      if (!(err instanceof ConversionError)) throw err;
      pantryNotes.set(item.ingredientId, [err.message]);
    }
  }
  const result = new Map();
  for (const [id, d] of demand) {
    const pantryQty = stock.get(id) ?? 0;
    const coveredQty = Math.min(pantryQty, d.qty);
    result.set(id, {
      ...d,
      pantryQty,
      coveredQty: clean(coveredQty),
      needQty: clean(d.qty - coveredQty),
      pantryLeftQty: clean(pantryQty - coveredQty),
      pantryNotes: pantryNotes.get(id) ?? [],
    });
  }
  return result;
}
