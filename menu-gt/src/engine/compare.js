// Comparar la misma lista en varias tiendas y, opcionalmente, combinar tiendas.
import { computePurchase, summarize } from './purchase.js';

export function compareStores(needs, ingredients, offersByStore, storeIds, opts = {}) {
  const rows = storeIds.map((storeId) => {
    const { items, totals } = computePurchase(needs, ingredients, offersByStore[storeId] ?? [], opts);
    return { storeId, items, totals, coverage: totals.toBuy ? totals.quoted / totals.toBuy : 1 };
  });
  const complete = rows.filter((r) => r.totals.complete).sort((a, b) => a.totals.purchaseCents - b.totals.purchaseCents);
  let winner = null;
  let winnerReason;
  if (complete.length === 0) {
    winnerReason = 'Ninguna tienda tiene todos los productos cotizados; no se puede declarar la más barata.';
  } else {
    winner = complete[0].storeId;
    const tie = complete.length > 1 && complete[1].totals.purchaseCents === complete[0].totals.purchaseCents;
    winnerReason = tie
      ? 'Empate entre tiendas completas.'
      : complete.length === 1
        ? 'Es la única tienda con todos los productos cotizados.'
        : 'Es la más barata entre las tiendas con todos los productos cotizados.';
    if (tie) winner = null;
  }
  // Orden de presentación: completas por total, luego incompletas por cobertura.
  const ordered = [
    ...complete,
    ...rows.filter((r) => !r.totals.complete).sort((a, b) => b.coverage - a.coverage),
  ];
  return { rows: ordered, winner, winnerReason, equivalences: buildEquivalences(rows) };
}

/** Por ingrediente, qué producto se eligió en cada tienda y si son productos distintos. */
function buildEquivalences(rows) {
  const byIng = new Map();
  for (const row of rows) {
    for (const it of row.items) {
      if (!byIng.has(it.ingredientId)) byIng.set(it.ingredientId, { ingredientId: it.ingredientId, needQty: it.needQty, perStore: {} });
      byIng.get(it.ingredientId).perStore[row.storeId] = it;
    }
  }
  for (const eq of byIng.values()) {
    const quoted = Object.values(eq.perStore).filter((it) => it.status === 'cotizado');
    const keys = new Set(quoted.map((it) => `${it.offer.brand}|${it.offer.product}|${it.offer.packQty}${it.offer.packUnit}`));
    eq.sameProduct = keys.size <= 1;
    eq.differentPack = new Set(quoted.map((it) => it.packQtyBase)).size > 1;
  }
  return [...byIng.values()];
}

/**
 * Combinar tiendas: cada ingrediente en la tienda donde cuesta menos.
 * El ahorro neto solo se calcula si se conocen los costos de transporte o
 * envío de todas las tiendas involucradas.
 */
export function combineStores(comparison, transport = {}) {
  const chosen = [];
  const missing = [];
  for (const eq of comparison.equivalences) {
    const options = Object.entries(eq.perStore).filter(([, it]) => it.status === 'cotizado');
    const inPantry = Object.values(eq.perStore).some((it) => it.status === 'en-casa');
    if (inPantry) continue;
    if (options.length === 0) {
      missing.push(eq);
      continue;
    }
    options.sort((a, b) => a[1].cents - b[1].cents);
    chosen.push({ storeId: options[0][0], item: options[0][1] });
  }
  const storesUsed = [...new Set(chosen.map((c) => c.storeId))];
  const itemsCents = chosen.reduce((s, c) => s + c.item.cents, 0);
  const unknownTransport = storesUsed.filter((id) => !Number.isInteger(transport[id]));
  const transportCents = storesUsed.reduce((s, id) => s + (Number.isInteger(transport[id]) ? transport[id] : 0), 0);

  const best = comparison.winner ? comparison.rows.find((r) => r.storeId === comparison.winner) : null;
  let netSavingsCents = null;
  let partialReason = null;
  if (missing.length) partialReason = `${missing.length} producto(s) sin precio en ninguna tienda.`;
  else if (!best) partialReason = 'Ninguna tienda individual está completa para compararla con la combinación.';
  else if (unknownTransport.length || !Number.isInteger(transport[best.storeId])) {
    partialReason = 'Falta el costo de transporte o envío de al menos una tienda. Ingrésalo para calcular el ahorro neto.';
  } else {
    const singleTotal = best.totals.purchaseCents + transport[best.storeId];
    netSavingsCents = singleTotal - (itemsCents + transportCents);
  }
  return {
    chosen,
    missing,
    storesUsed,
    itemsCents,
    transportCents,
    unknownTransport,
    grossDifferenceCents: best ? best.totals.purchaseCents - itemsCents : null,
    netSavingsCents,
    partial: netSavingsCents === null,
    partialReason,
    bestSingle: best?.storeId ?? null,
  };
}

export { summarize };
