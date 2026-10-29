import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMenu, alternativesFor, checkRecipe, recipeAllergens, recipeProteins } from '../src/engine/selector.js';
import { INGREDIENTS } from '../src/data/ingredients.js';
import { RECIPES, RECIPE_BY_ID } from '../src/data/recipes.js';
import { defaultState, planDays, exportState, importState, saveState, loadState, ALL_EQUIPMENT } from '../src/state/state.js';
import { computeAll, buildMenu, allOffers } from '../src/engine/index.js';

const days = (n) => Array.from({ length: n }, (_, k) => ({ index: k, weekend: k >= 5 }));
/** Estado con las tiendas de ejemplo (ficticias) para pruebas reproducibles. */
const demoState = () => {
  const s = defaultState('2026-10-19');
  s.demo = true;
  s.useSavedPrices = false; // sin la captura real, que cambia con el tiempo
  s.stores.selected = ['ejemplo-a', 'ejemplo-b'];
  s.stores.primary = 'ejemplo-a';
  return s;
};
const basePrefs = { allergies: [], excludedIngredients: [], excludedProteins: [], equipment: ALL_EQUIPMENT, maxMinutes: {} };

test('el menú generado respeta alergias, exclusiones y vegetariano', () => {
  const prefs = { ...basePrefs, allergies: ['huevo', 'gluten'], excludedIngredients: ['miltomate'], excludedProteins: ['cerdo'] };
  const { slots } = generateMenu({ days: days(7), meals: ['desayuno', 'almuerzo', 'cena'], people: 4, prefs, recipes: RECIPES, ingredients: INGREDIENTS, seed: 3 });
  assert.equal(slots.length, 21);
  for (const s of slots) {
    assert.ok(s.recipeId, `slot vacío ${s.id}`);
    const r = RECIPE_BY_ID[s.recipeId];
    assert.ok(!recipeAllergens(r, INGREDIENTS).has('huevo'), r.id);
    assert.ok(!recipeAllergens(r, INGREDIENTS).has('gluten'), r.id);
    assert.ok(!r.ingredients.some((l) => l.ing === 'miltomate'), r.id);
    assert.ok(!recipeProteins(r, INGREDIENTS).has('cerdo'), r.id);
    assert.ok(r.meals.includes(s.meal));
  }
  const veg = generateMenu({ days: days(3), meals: ['almuerzo'], people: 2, prefs: { ...basePrefs, vegetarian: true }, recipes: RECIPES, ingredients: INGREDIENTS });
  for (const s of veg.slots) {
    const p = recipeProteins(RECIPE_BY_ID[s.recipeId], INGREDIENTS);
    for (const meat of ['pollo', 'res', 'cerdo', 'pescado']) assert.ok(!p.has(meat), s.recipeId);
  }
});

test('cambiar una receta solo ofrece alternativas que respetan alergias y exclusiones', () => {
  const prefs = { ...basePrefs, allergies: ['lacteos'], excludedProteins: ['res'] };
  const { slots } = generateMenu({ days: days(2), meals: ['cena'], people: 4, prefs, recipes: RECIPES, ingredients: INGREDIENTS });
  const alts = alternativesFor(slots[0], { slots, prefs, recipes: RECIPES, recipeById: RECIPE_BY_ID, ingredients: INGREDIENTS, limit: 50 });
  assert.ok(alts.length > 0);
  for (const a of alts) {
    assert.ok(checkRecipe(a.recipe, prefs, INGREDIENTS, 'cena').ok, a.recipe.id);
    assert.ok(!recipeAllergens(a.recipe, INGREDIENTS).has('lacteos'));
    assert.ok(a.recipe.meals.includes('cena'));
  }
});

test('equipo y tiempo: sin horno no aparece receta de horno; el tiempo se relaja solo si no hay opción', () => {
  const prefs = { ...basePrefs, equipment: ['estufa', 'olla', 'sarten', 'comal', 'licuadora'], maxMinutes: { almuerzo: 40 } };
  const { slots } = generateMenu({ days: days(7), meals: ['almuerzo'], people: 4, prefs, recipes: RECIPES, ingredients: INGREDIENTS });
  for (const s of slots) {
    const r = RECIPE_BY_ID[s.recipeId];
    assert.ok(!r.equipment.includes('horno'));
    assert.ok(r.minutes <= 40, `${r.id} ${r.minutes}`);
    assert.equal(s.relaxed, undefined);
  }
});

test('la variedad evita repetir recetas mientras haya opciones', () => {
  const { slots } = generateMenu({ days: days(7), meals: ['almuerzo'], people: 4, prefs: basePrefs, recipes: RECIPES, ingredients: INGREDIENTS });
  assert.equal(new Set(slots.map((s) => s.recipeId)).size, 7);
});

test('las alternativas explican qué cambia', () => {
  const state = demoState();
  const offers = allOffers(state).filter((o) => o.storeId === 'ejemplo-a');
  const slot = { id: 's', day: 0, meal: 'almuerzo', recipeId: 'caldo-res', servings: 4 };
  const alts = alternativesFor(slot, { slots: [slot], prefs: state.prefs, recipes: RECIPES, recipeById: RECIPE_BY_ID, ingredients: INGREDIENTS, offers, limit: 50 });
  const lentejas = alts.find((a) => a.recipe.id === 'lentejas');
  assert.ok(lentejas.reasons.some((r) => r.kind === 'ahorro' && r.cents > 0));
  assert.ok(lentejas.reasons.some((r) => r.kind === 'tiempo' && r.minutes < 0));
  assert.ok(lentejas.reasons.some((r) => r.kind === 'proteina'));
});

test('guardar y recuperar conserva el plan, presupuesto, despensa y preferencias', () => {
  const memory = new Map();
  const storage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  const s = demoState();
  s.household.budgetCents = 123456;
  s.pantry.push({ id: 'p1', ingredientId: 'arroz', qty: 2, unit: 'lb' });
  s.prefs.allergies = ['huevo'];
  s.myPrices.push({ id: 'm1', storeId: 'mis-precios', ingredientId: 'tomate', product: 'Tomate', brand: 'Mercado', packQty: 1, packUnit: 'lb', priceCents: 500, availability: 'disponible', channel: 'usuario', status: 'usuario', place: 'Mercado municipal' });
  s.plan.slots = buildMenu(s).slots;
  assert.ok(saveState(storage, s));
  const { state: back } = loadState(storage);
  assert.deepEqual(back, s);
  const imported = importState(exportState(s));
  assert.deepEqual(imported, s);
  assert.throws(() => importState('{"hola":1}'), /no fue exportado/);
  assert.throws(() => importState('no es json'), /JSON/);
  // El almacenamiento bloqueado no rompe la app
  const broken = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
  assert.equal(saveState(broken, s), false);
  assert.equal(loadState(broken).state, null);
});

test('período: días, fines de semana y días omitidos', () => {
  const d = planDays({ startDate: '2026-10-19', numDays: 7, skipDays: [2] });
  assert.equal(d[0].weekday, 'lunes');
  assert.equal(d[5].weekend, true);
  assert.equal(d[2].skipped, true);
});

test('cálculo completo con datos de ejemplo: coherente y sin precios faltantes tratados como cero', () => {
  const s = demoState();
  s.household.meals = ['desayuno', 'almuerzo', 'cena'];
  s.plan.slots = buildMenu(s).slots;
  const r = computeAll(s);
  const t = r.purchase.totals;
  assert.equal(t.quoted + t.inPantry + t.missing.length, r.purchase.items.length);
  const sum = r.purchase.items.filter((i) => i.status === 'cotizado').reduce((a, i) => a + i.cents, 0);
  assert.equal(sum, t.purchaseCents);
  for (const it of r.purchase.items) if (it.status !== 'cotizado' && it.status !== 'en-casa') assert.equal(it.cents, null);
  // Al cambiar de tienda principal, las necesidades no cambian
  s.stores.primary = 'ejemplo-b';
  const r2 = computeAll(s);
  for (const [id, n] of r.needs) assert.equal(r2.needs.get(id).needQty, n.needQty);
  // Presupuesto muy bajo: insuficiente y con sugerencias que no se aplican solas
  s.household.budgetCents = 10000;
  const before = JSON.stringify(s.plan.slots);
  const r3 = computeAll(s);
  assert.equal(r3.budget.status, 'insuficiente');
  assert.ok(r3.suggestions.some((x) => x.kind === 'receta' && x.savingCents > 0));
  // No reduce porciones ni quita comidas para aparentar que alcanza
  assert.equal(JSON.stringify(s.plan.slots), before);
  assert.equal(r3.slots.length, 21);
});

test('lo pagado en la sucursal reemplaza el precio en línea de ese producto', () => {
  const s = defaultState('2026-10-29');
  const online = allOffers(s).find((o) => o.storeId === 'paiz' && o.status === 'guardado');
  s.myPrices.push({ id: 'mine-1', storeId: 'paiz', ingredientId: online.ingredientId, product: online.product, brand: online.brand,
    packQty: online.packQty, packUnit: online.packUnit, priceCents: online.priceCents + 500, channel: 'usuario', status: 'usuario',
    availability: 'disponible', replacesOfferId: online.id, fetchedAt: '2026-10-29T18:00:00Z' });
  const offers = allOffers(s);
  assert.equal(offers.some((o) => o.id === online.id), false);
  assert.equal(offers.find((o) => o.id === 'mine-1').priceCents, online.priceCents + 500);
});
