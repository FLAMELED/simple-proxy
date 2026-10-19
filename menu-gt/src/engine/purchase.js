// Paso 3: elegir producto y número de empaques por ingrediente en una tienda.
import { toBase, packsFor, clean, ConversionError } from './units.js';
import { proportionalCents } from './money.js';

/**
 * Costo de comprar `packs` empaques de una oferta, aplicando promociones
 * solo cuando se cumplen sus requisitos.
 * @returns { cents, promoApplied: bool, promoNote: string|null }
 */
export function offerCost(offer, packs, { acceptedPromos = {} } = {}) {
  const regular = offer.priceCents * packs;
  const promo = offer.promo;
  if (!promo || packs === 0) return { cents: regular, promoApplied: false, promoNote: null };
  switch (promo.kind) {
    case 'minQty': {
      if (packs >= promo.minQty) {
        return { cents: promo.priceCents * packs, promoApplied: true, promoNote: `Promoción aplicada: ${promo.text}` };
      }
      return { cents: regular, promoApplied: false, promoNote: `Promoción no aplicada: requiere ${promo.minQty} o más; la lista necesita ${packs}.` };
    }
    case 'nxm': {
      if (packs >= promo.buy) {
        const groups = Math.floor(packs / promo.buy);
        const rest = packs % promo.buy;
        const cents = Math.round(groups * promo.pay * offer.priceCents) + rest * offer.priceCents;
        return { cents, promoApplied: true, promoNote: `Promoción aplicada: ${promo.text}` };
      }
      return { cents: regular, promoApplied: false, promoNote: `Promoción no aplicada: requiere comprar ${promo.buy}; la lista necesita ${packs}.` };
    }
    case 'requisito': {
      if (acceptedPromos[offer.id]) {
        return { cents: promo.priceCents * packs, promoApplied: true, promoNote: `Promoción aplicada porque indicaste que cumples: ${promo.text}` };
      }
      return { cents: regular, promoApplied: false, promoNote: `Promoción no aplicada: ${promo.text}. Márcala si cumples el requisito.` };
    }
    default:
      return { cents: regular, promoApplied: false, promoNote: null };
  }
}

/** Cantidad del empaque en unidad base del ingrediente. */
export function packBase(offer, ing) {
  return toBase(offer.packQty, offer.packUnit, ing);
}

/**
 * Elige la mejor oferta para cubrir `needQty` (unidad base).
 * Reglas: excluye agotados y sin precio; respeta marca fija; minimiza el
 * dinero a pagar; en empate, menor sobrante.
 */
export function chooseOffer(needQty, ing, offers, { brandLock = null, acceptedPromos = {} } = {}) {
  const all = offers.filter((o) => o.ingredientId === ing.id);
  if (all.length === 0) return { status: 'sin-precio', reason: 'Ningún producto cotizado para este ingrediente.' };
  const priced = all.filter((o) => Number.isInteger(o.priceCents) && o.priceCents > 0);
  if (priced.length === 0) return { status: 'sin-precio', reason: 'Hay productos registrados, pero sin precio.' };
  const available = priced.filter((o) => o.availability !== 'agotado');
  if (available.length === 0) return { status: 'agotado', reason: 'Todos los productos registrados aparecen agotados.', offers: priced };
  const branded = brandLock ? available.filter((o) => o.brand === brandLock) : available;
  if (branded.length === 0) {
    return { status: 'marca-no-disponible', reason: `La marca fija "${brandLock}" no está disponible aquí. Hay ${available.length} alternativa(s) si aceptas otra marca.` };
  }
  let best = null;
  const conversionErrors = [];
  for (const offer of branded) {
    let pack;
    try {
      pack = packBase(offer, ing);
    } catch (err) {
      if (!(err instanceof ConversionError)) throw err;
      conversionErrors.push(err.message);
      continue;
    }
    const packs = packsFor(needQty, pack.qty);
    const cost = offerCost(offer, packs, { acceptedPromos });
    const leftover = clean(packs * pack.qty - needQty);
    const candidate = { offer, packQtyBase: pack.qty, packApprox: pack.approx, packNotes: pack.notes, packs, ...cost, leftover };
    if (
      !best ||
      candidate.cents < best.cents ||
      (candidate.cents === best.cents && candidate.leftover < best.leftover) ||
      (candidate.cents === best.cents && candidate.leftover === best.leftover && offer.id < best.offer.id)
    ) {
      best = candidate;
    }
  }
  if (!best) return { status: 'sin-conversion', reason: conversionErrors[0] ?? 'Sin conversión posible.' };
  return { status: 'cotizado', ...best };
}

/**
 * Calcula la compra de toda la lista en un conjunto de ofertas.
 * @param needs salida de applyPantry
 * @returns { items[], totals }
 */
export function computePurchase(needs, ingredients, offers, opts = {}) {
  const { brandLocks = {}, acceptedPromos = {}, fallbackOffers = null } = opts;
  const items = [];
  for (const [id, need] of needs) {
    const ing = ingredients[id];
    const base = { ingredientId: id, ingredient: ing, ...need };
    if (need.errors.length && need.qty === 0) {
      items.push({ ...base, status: 'sin-conversion', reason: need.errors[0] });
      continue;
    }
    // Si la despensa lo cubre todo, se elige el producto como referencia para
    // valuar lo usado, sin comprarlo.
    const qtyForChoice = need.needQty > 0 ? need.needQty : need.qty;
    let choice = chooseOffer(qtyForChoice, ing, offers, { brandLock: brandLocks[id], acceptedPromos });
    let fromFallback = false;
    if (choice.status !== 'cotizado' && fallbackOffers) {
      const fb = chooseOffer(qtyForChoice, ing, fallbackOffers, { brandLock: brandLocks[id], acceptedPromos });
      if (fb.status === 'cotizado') {
        choice = { ...fb, primaryStatus: choice.status, primaryReason: choice.reason };
        fromFallback = true;
      }
    }
    if (need.needQty <= 0) {
      // Todo cubierto por la despensa: no se compra nada.
      const valued = choice.status === 'cotizado' ? choice : null;
      items.push({
        ...base,
        status: 'en-casa',
        packs: 0,
        cents: 0,
        offer: valued?.offer ?? null,
        packQtyBase: valued?.packQtyBase ?? null,
        usedValueCents: valued ? proportionalCents(valued.offer.priceCents, need.qty, valued.packQtyBase) : null,
        pantryValueCents: valued ? proportionalCents(valued.offer.priceCents, need.coveredQty, valued.packQtyBase) : null,
        leftover: 0,
        fromFallback,
      });
      continue;
    }
    if (choice.status !== 'cotizado') {
      items.push({ ...base, ...choice, cents: null, packs: null, fromFallback: false });
      continue;
    }
    items.push({
      ...base,
      ...choice,
      // Valor proporcional de lo que se usa en las comidas (incluye lo de la despensa)
      usedValueCents: proportionalCents(choice.offer.priceCents, need.qty, choice.packQtyBase),
      pantryValueCents: need.coveredQty > 0 ? proportionalCents(choice.offer.priceCents, need.coveredQty, choice.packQtyBase) : 0,
      leftoverValueCents: proportionalCents(choice.offer.priceCents, choice.leftover, choice.packQtyBase),
      fromFallback,
    });
  }
  return { items, totals: summarize(items) };
}

export function summarize(items) {
  let purchaseCents = 0;
  let usedValueKnownCents = 0;
  let pantryValueCents = 0;
  let leftoverValueCents = 0;
  let quoted = 0;
  let inPantry = 0;
  const missing = [];
  for (const it of items) {
    if (it.status === 'cotizado') {
      purchaseCents += it.cents;
      usedValueKnownCents += it.usedValueCents;
      pantryValueCents += it.pantryValueCents;
      leftoverValueCents += it.leftoverValueCents;
      quoted++;
    } else if (it.status === 'en-casa') {
      inPantry++;
      if (it.usedValueCents !== null) usedValueKnownCents += it.usedValueCents;
      if (it.pantryValueCents !== null) pantryValueCents += it.pantryValueCents;
    } else {
      missing.push(it);
    }
  }
  const toBuy = items.length - inPantry;
  return {
    purchaseCents,
    usedValueKnownCents,
    pantryValueCents,
    leftoverValueCents,
    quoted,
    inPantry,
    toBuy,
    missing,
    complete: missing.length === 0,
  };
}
