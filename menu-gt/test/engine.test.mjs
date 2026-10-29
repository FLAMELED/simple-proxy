// Pruebas del motor de cálculo con casos reproducibles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consolidateDemand, applyPantry } from '../src/engine/demand.js';
import { computePurchase, offerCost, chooseOffer } from '../src/engine/purchase.js';
import { evaluateBudget, budgetMessage, priceAge, staleItems } from '../src/engine/budget.js';
import { compareStores, combineStores } from '../src/engine/compare.js';
import { toBase, packsFor, ConversionError, describeQty } from '../src/engine/units.js';
import { formatQ, parseQuetzales, proportionalCents } from '../src/engine/money.js';
import { INGREDIENTS } from '../src/data/ingredients.js';
import { RECIPES, RECIPE_BY_ID } from '../src/data/recipes.js';

// Recetas mínimas de prueba (no son las del catálogo)
const R = {
  arrozA: { id: 'arrozA', yield: 2, meals: ['almuerzo'], ingredients: [{ ing: 'arroz', qty: 100, unit: 'g' }] },
  arrozB: { id: 'arrozB', yield: 4, meals: ['cena'], ingredients: [{ ing: 'arroz', qty: 300, unit: 'g' }, { ing: 'huevo', qty: 6, unit: 'u' }] },
  cilantro: { id: 'cilantro', yield: 4, meals: ['cena'], ingredients: [{ ing: 'cilantro', qty: 0.5, unit: 'manojo' }] },
};
const offer = (o) => ({
  id: o.id, storeId: o.storeId ?? 'x', ingredientId: o.ing, product: o.product ?? o.ing, brand: o.brand ?? 'M',
  packQty: o.qty, packUnit: o.unit, priceCents: o.cents, promo: o.promo ?? null,
  availability: o.availability ?? 'disponible', channel: 'prueba', status: 'prueba',
});
const slot = (id, recipeId, servings) => ({ id, day: 0, meal: 'almuerzo', recipeId, servings });
const needsFor = (slots, pantry = []) => applyPantry(consolidateDemand(slots, R, INGREDIENTS), pantry, INGREDIENTS);

test('ejemplo del enunciado: 200 g de un paquete de 1 kg a Q12 → compra Q12, usado Q2.40, sobran 800 g', () => {
  const needs = needsFor([slot('s1', 'arrozA', 4)]); // 100 g por 2 porciones × 4 = 200 g
  const { items, totals } = computePurchase(needs, INGREDIENTS, [offer({ id: 'a', ing: 'arroz', qty: 1, unit: 'kg', cents: 1200 })]);
  const it = items[0];
  assert.equal(it.qty, 200);
  assert.equal(it.packs, 1);
  assert.equal(it.cents, 1200);
  assert.equal(it.usedValueCents, 240);
  assert.equal(it.leftover, 800);
  assert.equal(totals.purchaseCents, 1200);
  assert.equal(formatQ(it.usedValueCents), 'Q2.40');
});

test('el mismo ingrediente en varias recetas se consolida y no se cobra un paquete por receta', () => {
  const needs = needsFor([slot('s1', 'arrozA', 2), slot('s2', 'arrozB', 4), slot('s3', 'arrozA', 2)]);
  const arroz = needs.get('arroz');
  assert.equal(arroz.qty, 100 + 300 + 100);
  assert.equal(arroz.uses.length, 3);
  const { items } = computePurchase(needs, INGREDIENTS, [offer({ id: 'a', ing: 'arroz', qty: 1, unit: 'kg', cents: 1200 })]);
  assert.equal(items.find((i) => i.ingredientId === 'arroz').packs, 1); // 500 g caben en 1 kg
});

test('despensa: cubre todo, una parte o nada', () => {
  const slots = [slot('s1', 'arrozB', 4)]; // 300 g arroz, 6 huevos
  const offers = [offer({ id: 'a', ing: 'arroz', qty: 400, unit: 'g', cents: 600 }), offer({ id: 'h', ing: 'huevo', qty: 12, unit: 'u', cents: 2000 })];
  // Todo: 1 lb de arroz (453.6 g) ≥ 300 g
  let r = computePurchase(needsFor(slots, [{ ingredientId: 'arroz', qty: 1, unit: 'lb' }]), INGREDIENTS, offers);
  let a = r.items.find((i) => i.ingredientId === 'arroz');
  assert.equal(a.status, 'en-casa');
  assert.equal(a.cents, 0);
  assert.equal(a.coveredQty, 300);
  // Parte: 250 g en casa → faltan 50 g → 1 paquete de 400 g
  r = computePurchase(needsFor(slots, [{ ingredientId: 'arroz', qty: 250, unit: 'g' }]), INGREDIENTS, offers);
  a = r.items.find((i) => i.ingredientId === 'arroz');
  assert.equal(a.needQty, 50);
  assert.equal(a.packs, 1);
  assert.equal(a.cents, 600);
  assert.equal(a.pantryValueCents, proportionalCents(600, 250, 400));
  // Nada
  r = computePurchase(needsFor(slots, []), INGREDIENTS, offers);
  assert.equal(r.items.find((i) => i.ingredientId === 'arroz').needQty, 300);
  // Media docena en casa cubre exactamente los 6 huevos
  r = computePurchase(needsFor(slots, [{ ingredientId: 'huevo', qty: 0.5, unit: 'docena' }]), INGREDIENTS, offers);
  assert.equal(r.items.find((i) => i.ingredientId === 'huevo').status, 'en-casa');
});

test('la despensa solo descuenta el mismo ingrediente (frijol seco no cubre frijol volteado)', () => {
  const rec = { x: { id: 'x', yield: 1, ingredients: [{ ing: 'frijol-volteado', qty: 400, unit: 'g' }] } };
  const d = consolidateDemand([{ id: 's', day: 0, meal: 'cena', recipeId: 'x', servings: 1 }], rec, INGREDIENTS);
  const n = applyPantry(d, [{ ingredientId: 'frijol-negro', qty: 2, unit: 'lb' }], INGREDIENTS);
  assert.equal(n.get('frijol-volteado').needQty, 400);
});

test('varios empaques y sobrante', () => {
  const needs = needsFor([slot('s1', 'arrozB', 12)]); // 900 g arroz, 18 huevos
  const { items } = computePurchase(needs, INGREDIENTS, [
    offer({ id: 'a', ing: 'arroz', qty: 400, unit: 'g', cents: 600 }),
    offer({ id: 'h', ing: 'huevo', qty: 1, unit: 'docena', cents: 2000 }),
  ]);
  const a = items.find((i) => i.ingredientId === 'arroz');
  assert.equal(a.packs, 3);
  assert.equal(a.cents, 1800);
  assert.equal(a.leftover, 300);
  const h = items.find((i) => i.ingredientId === 'huevo');
  assert.equal(h.packs, 2);
  assert.equal(h.leftover, 6);
});

test('cambiar porciones recalcula cantidades y costos', () => {
  const offers = [offer({ id: 'a', ing: 'arroz', qty: 400, unit: 'g', cents: 600 })];
  const four = computePurchase(needsFor([slot('s1', 'arrozA', 4)]), INGREDIENTS, offers).items[0];
  const ten = computePurchase(needsFor([slot('s1', 'arrozA', 10)]), INGREDIENTS, offers).items[0];
  assert.equal(four.qty, 200);
  assert.equal(ten.qty, 500);
  assert.equal(four.cents, 600);
  assert.equal(ten.cents, 1200);
  assert.equal(four.usedValueCents, 300);
  assert.equal(ten.usedValueCents, 750);
});

test('paquetes de distinto tamaño se comparan por unidad base, sin falsas equivalencias', () => {
  // 1 lb ≠ 500 g: 453.59 g frente a 500 g
  assert.equal(toBase(1, 'lb', INGREDIENTS.arroz).qty, 453.59237);
  const needs = needsFor([slot('s1', 'arrozA', 9)]); // 450 g
  const lb = offer({ id: 'lb', ing: 'arroz', qty: 1, unit: 'lb', cents: 700, storeId: 'A' });
  const g500 = offer({ id: 'g5', ing: 'arroz', qty: 500, unit: 'g', cents: 720, storeId: 'B' });
  const cmp = compareStores(needs, INGREDIENTS, { A: [lb], B: [g500] }, ['A', 'B']);
  const eq = cmp.equivalences.find((e) => e.ingredientId === 'arroz');
  assert.equal(eq.sameProduct, false);
  assert.equal(eq.differentPack, true);
  assert.equal(eq.perStore.A.packs, 1);
  assert.equal(eq.perStore.B.packs, 1);
  // 460 g: la libra ya no alcanza; se necesitan 2 libras
  const needs2 = needsFor([slot('s1', 'arrozA', 9.2)]);
  const cmp2 = compareStores(needs2, INGREDIENTS, { A: [lb], B: [g500] }, ['A', 'B']);
  assert.equal(cmp2.equivalences[0].perStore.A.packs, 2);
  assert.equal(cmp2.winner, 'B');
});

test('cambiar de supermercado mantiene las necesidades del menú', () => {
  const needs = needsFor([slot('s1', 'arrozB', 4)]);
  const cmp = compareStores(needs, INGREDIENTS, {
    A: [offer({ id: 'a1', ing: 'arroz', qty: 1, unit: 'kg', cents: 1500, storeId: 'A' }), offer({ id: 'a2', ing: 'huevo', qty: 30, unit: 'u', cents: 4500, storeId: 'A' })],
    B: [offer({ id: 'b1', ing: 'arroz', qty: 400, unit: 'g', cents: 650, storeId: 'B' }), offer({ id: 'b2', ing: 'huevo', qty: 12, unit: 'u', cents: 2100, storeId: 'B' })],
  }, ['A', 'B']);
  for (const row of cmp.rows) {
    assert.equal(row.items.find((i) => i.ingredientId === 'arroz').needQty, 300);
    assert.equal(row.items.find((i) => i.ingredientId === 'huevo').needQty, 6);
  }
});

test('un producto sin precio o agotado no cuenta como gratis ni gana la comparación', () => {
  const needs = needsFor([slot('s1', 'arrozB', 4)]);
  const A = [offer({ id: 'a1', ing: 'arroz', qty: 1, unit: 'kg', cents: 1500, storeId: 'A' }), offer({ id: 'a2', ing: 'huevo', qty: 12, unit: 'u', cents: 2400, storeId: 'A' })];
  const B = [offer({ id: 'b1', ing: 'arroz', qty: 1, unit: 'kg', cents: 1000, storeId: 'B' }), offer({ id: 'b2', ing: 'huevo', qty: 12, unit: 'u', cents: 1800, availability: 'agotado', storeId: 'B' })];
  const C = [offer({ id: 'c1', ing: 'arroz', qty: 1, unit: 'kg', cents: 900, storeId: 'C' })]; // sin huevos
  const cmp = compareStores(needs, INGREDIENTS, { A, B, C }, ['A', 'B', 'C']);
  const rowB = cmp.rows.find((r) => r.storeId === 'B');
  const rowC = cmp.rows.find((r) => r.storeId === 'C');
  assert.equal(rowB.items.find((i) => i.ingredientId === 'huevo').status, 'agotado');
  assert.equal(rowB.items.find((i) => i.ingredientId === 'huevo').cents, null);
  assert.equal(rowC.items.find((i) => i.ingredientId === 'huevo').status, 'sin-precio');
  assert.equal(rowB.totals.complete, false);
  assert.equal(rowB.totals.purchaseCents, 1000); // subtotal conocido, sin sumar cero por el faltante
  assert.equal(cmp.winner, 'A'); // B y C son más baratas en lo conocido, pero están incompletas
  // Si ninguna está completa, no hay ganadora
  const cmp2 = compareStores(needs, INGREDIENTS, { B, C }, ['B', 'C']);
  assert.equal(cmp2.winner, null);
  // Presupuesto con faltantes: nunca "alcanza"
  const b = evaluateBudget({ budgetCents: 100000, totals: rowB.totals });
  assert.equal(b.status, 'sin-confirmar');
  assert.match(budgetMessage(b, formatQ), /no se puede confirmar/);
});

test('promoción condicionada no se aplica sin cumplir el requisito', () => {
  const minQ = offer({ id: 'p', ing: 'arroz', qty: 1, unit: 'lb', cents: 1000, promo: { kind: 'minQty', minQty: 3, priceCents: 800, text: 'Desde 3' } });
  assert.deepEqual([offerCost(minQ, 2).cents, offerCost(minQ, 2).promoApplied], [2000, false]);
  assert.deepEqual([offerCost(minQ, 3).cents, offerCost(minQ, 3).promoApplied], [2400, true]);
  const card = offer({ id: 'c', ing: 'arroz', qty: 1, unit: 'lb', cents: 1000, promo: { kind: 'requisito', priceCents: 900, text: 'Con tarjeta' } });
  assert.equal(offerCost(card, 2).cents, 2000);
  assert.equal(offerCost(card, 2, { acceptedPromos: { c: true } }).cents, 1800);
  const nxm = offer({ id: 'n', ing: 'aceite', qty: 1, unit: 'l', cents: 2750, promo: { kind: 'nxm', buy: 2, pay: 1.5, text: '2do a mitad' } });
  assert.equal(offerCost(nxm, 1).cents, 2750);
  assert.equal(offerCost(nxm, 2).cents, 4125);
  assert.equal(offerCost(nxm, 3).cents, 4125 + 2750);
});

test('marca fija: se respeta; si no está disponible queda visible como faltante', () => {
  const ing = INGREDIENTS.arroz;
  const offers = [offer({ id: 'x', ing: 'arroz', qty: 1, unit: 'kg', cents: 1000, brand: 'Barata' }), offer({ id: 'y', ing: 'arroz', qty: 1, unit: 'kg', cents: 1500, brand: 'Preferida' })];
  assert.equal(chooseOffer(500, ing, offers).offer.brand, 'Barata');
  assert.equal(chooseOffer(500, ing, offers, { brandLock: 'Preferida' }).offer.brand, 'Preferida');
  assert.equal(chooseOffer(500, ing, offers, { brandLock: 'Otra' }).status, 'marca-no-disponible');
});

test('presupuesto insuficiente se comunica con el faltante exacto', () => {
  const totals = { purchaseCents: 52345, missing: [] };
  const b = evaluateBudget({ budgetCents: 50000, totals, extras: [{ label: 'gas', cents: 1000 }] });
  assert.equal(b.status, 'insuficiente');
  assert.equal(b.shortfallCents, 3345);
  assert.equal(budgetMessage(b, formatQ), 'No alcanza: faltan Q33.45.');
  const b2 = evaluateBudget({ budgetCents: 50000, totals: { purchaseCents: 52345, missing: [{}] } });
  assert.match(budgetMessage(b2, formatQ), /al menos Q23.45/);
  const ok = evaluateBudget({ budgetCents: 60000, totals: { purchaseCents: 52345, missing: [] } });
  assert.equal(ok.status, 'alcanza');
  assert.equal(ok.balanceCents, 7655);
});

test('combinar tiendas no muestra ahorro neto sin costos de transporte', () => {
  const needs = needsFor([slot('s1', 'arrozB', 4)]);
  const byStore = {
    A: [offer({ id: 'a1', ing: 'arroz', qty: 1, unit: 'kg', cents: 1500, storeId: 'A' }), offer({ id: 'a2', ing: 'huevo', qty: 12, unit: 'u', cents: 2000, storeId: 'A' })],
    B: [offer({ id: 'b1', ing: 'arroz', qty: 1, unit: 'kg', cents: 1000, storeId: 'B' }), offer({ id: 'b2', ing: 'huevo', qty: 12, unit: 'u', cents: 2400, storeId: 'B' })],
  };
  const cmp = compareStores(needs, INGREDIENTS, byStore, ['A', 'B']);
  let comb = combineStores(cmp, {});
  assert.equal(comb.itemsCents, 3000);
  assert.equal(comb.netSavingsCents, null);
  assert.equal(comb.partial, true);
  comb = combineStores(cmp, { A: 1000, B: 1000 });
  // Mejor tienda sola: B = 1000 + 2400 = 3400, más Q10 de transporte = 4400.
  // Combinada: 3000 en productos + 2000 de transporte (dos tiendas) = 5000 → combinar cuesta Q6.00 más.
  assert.equal(cmp.winner, 'B');
  assert.equal(comb.netSavingsCents, 4400 - 5000);
});

test('manojos y tazas no se convierten a un peso universal', () => {
  assert.throws(() => toBase(1, 'g', INGREDIENTS.cilantro), ConversionError);
  assert.throws(() => toBase(1, 'taza', INGREDIENTS.cilantro), ConversionError);
  assert.throws(() => toBase(1, 'taza', INGREDIENTS['pollo-pechuga']), ConversionError);
  // La taza de arroz y la de avena pesan distinto
  assert.equal(toBase(1, 'taza', INGREDIENTS.arroz).qty, 185);
  assert.equal(toBase(1, 'taza', INGREDIENTS.avena).qty, 81);
  assert.equal(toBase(1, 'taza', INGREDIENTS.arroz).approx, true);
  // Un producto de cilantro vendido por peso no puede cubrir una demanda en manojos
  const needs = needsFor([{ id: 's', day: 0, meal: 'cena', recipeId: 'cilantro', servings: 4 }]);
  const { items } = computePurchase(needs, INGREDIENTS, [offer({ id: 'c', ing: 'cilantro', qty: 100, unit: 'g', cents: 300 })]);
  assert.equal(items[0].status, 'sin-conversion');
});

test('unidades y dinero sin errores de precisión', () => {
  assert.equal(toBase(1, 'docena', INGREDIENTS.huevo).qty, 12);
  assert.equal(toBase(2, 'oz', INGREDIENTS['queso-fresco']).qty, 56.699046);
  assert.equal(packsFor(0.1 + 0.2, 0.3), 1);
  assert.equal(parseQuetzales('Q1,234.5'), 123450);
  assert.equal(parseQuetzales('12.345'), null);
  assert.equal(formatQ(0.1 * 100 + 0.2 * 100), 'Q0.30');
  assert.equal(formatQ(123456789), 'Q1,234,567.89');
  assert.equal(describeQty(907.18474, INGREDIENTS.arroz), '2 lb (907 g)');
});

test('todas las recetas del catálogo son convertibles y están completas', () => {
  assert.ok(RECIPES.length >= 25 && RECIPES.length <= 30, `hay ${RECIPES.length} recetas`);
  for (const r of RECIPES) {
    assert.ok(r.steps.length >= 2 && r.minutes > 0 && r.yield > 0, r.id);
    assert.ok(Array.isArray(r.equipment), r.id);
    for (const l of r.ingredients) {
      assert.ok(INGREDIENTS[l.ing], `${r.id}: ${l.ing}`);
      assert.doesNotThrow(() => toBase(l.qty, l.unit, INGREDIENTS[l.ing]), `${r.id}: ${l.ing} ${l.unit}`);
    }
  }
  assert.equal(Object.keys(RECIPE_BY_ID).length, RECIPES.length);
});

test('combinar presentaciones cuando sale más barato (1 kg + 400 g)', () => {
  const ing = INGREDIENTS.arroz;
  const offers = [
    offer({ id: 'kg', ing: 'arroz', qty: 1, unit: 'kg', cents: 1200 }),
    offer({ id: 'g4', ing: 'arroz', qty: 400, unit: 'g', cents: 550 }),
  ];
  // 1,300 g: 2 kg = Q24.00 · 4 × 400 g = Q22.00 · 1 kg + 400 g = Q17.50
  const mix = chooseOffer(1300, ing, offers);
  assert.equal(mix.cents, 1750);
  assert.equal(mix.mixed, true);
  assert.deepEqual(mix.lines.map((l) => [l.offer.id, l.packs]).sort(), [['g4', 1], ['kg', 1]]);
  assert.equal(mix.leftover, 100);
  const single = chooseOffer(1300, ing, offers, { allowMix: false });
  assert.equal(single.cents, 2200);
  assert.equal(single.mixed, false);
  // Si una sola presentación ya es lo más barato, no se mezcla
  assert.equal(chooseOffer(900, ing, offers).lines.length, 1);
});

test('lo usado más lo sobrante suma exactamente lo pagado, también al combinar', () => {
  const slots = [slot('s1', 'arrozA', 26)]; // 1,300 g
  const { items } = computePurchase(needsFor(slots, [{ ingredientId: 'arroz', qty: 100, unit: 'g' }]), INGREDIENTS, [
    offer({ id: 'kg', ing: 'arroz', qty: 1, unit: 'kg', cents: 1200 }),
    offer({ id: 'g4', ing: 'arroz', qty: 400, unit: 'g', cents: 550 }),
  ]);
  const it = items[0];
  assert.equal(it.needQty, 1200); // 100 g en casa
  // 1,200 g: 3 × 400 g = Q16.50 es más barato que 1 kg + 400 g = Q17.50
  assert.equal(it.cents, 1650);
  assert.equal(it.leftover, 0);
  const usedFromPurchase = it.usedValueCents - it.pantryValueCents;
  assert.ok(Math.abs(usedFromPurchase + it.leftoverValueCents - it.cents) <= 1);
});

test('vigencia: un precio guardado de más de 14 días no confirma que alcanza', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');
  const saved = { status: 'guardado', channel: 'online', fetchedAt: '2026-10-29T05:45:00Z' };
  assert.deepEqual(priceAge(saved, now), { days: 22, maxDays: 14, stale: true });
  assert.equal(priceAge({ ...saved, fetchedAt: '2026-11-10T00:00:00Z' }, now).stale, false);
  // Lo ingresado por la persona vale 30 días; un ejemplo ficticio no tiene vigencia
  assert.equal(priceAge({ status: 'usuario', channel: 'usuario', fetchedAt: '2026-10-29T00:00:00Z' }, now).stale, false);
  assert.equal(priceAge({ status: 'ejemplo', fetchedAt: '2020-01-01T00:00:00Z' }, now), null);
  const items = [
    { status: 'cotizado', packs: 1, lines: [{ offer: saved }] },
    { status: 'cotizado', packs: 0, lines: [{ offer: saved }] }, // referencia sin compra: no cuenta
    { status: 'sin-precio', lines: [] },
  ];
  assert.equal(staleItems(items, now).length, 1);
  const totals = { purchaseCents: 50000, missing: [] };
  const b = evaluateBudget({ budgetCents: 90000, totals, staleCount: 1 });
  assert.equal(b.status, 'sin-confirmar');
  assert.match(budgetMessage(b, (c) => `Q${c / 100}`), /más días de los permitidos/);
  assert.equal(evaluateBudget({ budgetCents: 90000, totals }).status, 'alcanza');
  // Si ya no alcanza, lo viejo no cambia el veredicto
  assert.equal(evaluateBudget({ budgetCents: 100, totals, staleCount: 3 }).status, 'insuficiente');
});
