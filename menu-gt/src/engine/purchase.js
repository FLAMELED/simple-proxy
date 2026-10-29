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

const MAX_COMBINATIONS = 50000;

/**
 * Elige cómo cubrir `needQty` (unidad base) con las ofertas de un ingrediente.
 * Puede combinar presentaciones (p. ej. 1 kg + 400 g) si así se paga menos.
 * Reglas: excluye agotados y sin precio; respeta marca fija; minimiza el
 * dinero a pagar; en empate, menor sobrante y menos productos distintos.
 * Devuelve `lines` (cada producto con su número de empaques) y, por
 * compatibilidad, `offer`/`packs`/`packQtyBase` de la línea principal.
 */
export function chooseOffer(needQty, ing, offers, { brandLock = null, acceptedPromos = {}, allowMix = true } = {}) {
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
  const conversionErrors = [];
  const cands = [];
  for (const offer of branded) {
    try {
      const pack = packBase(offer, ing);
      cands.push({ offer, packQtyBase: pack.qty, packApprox: pack.approx, packNotes: pack.notes });
    } catch (err) {
      if (!(err instanceof ConversionError)) throw err;
      conversionErrors.push(err.message);
    }
  }
  if (!cands.length) return { status: 'sin-conversion', reason: conversionErrors[0] ?? 'Sin conversión posible.' };
  cands.sort((a, b) => (a.offer.id < b.offer.id ? -1 : 1));

  const evaluate = (counts) => {
    let cents = 0;
    let qty = 0;
    let packs = 0;
    const lines = [];
    counts.forEach((n, i) => {
      if (!n) return;
      const c = cands[i];
      const cost = offerCost(c.offer, n, { acceptedPromos });
      cents += cost.cents;
      qty += n * c.packQtyBase;
      packs += n;
      lines.push({ ...c, packs: n, cents: cost.cents, promoApplied: cost.promoApplied, promoNote: cost.promoNote });
    });
    return { cents, purchasedQty: clean(qty), leftover: clean(qty - needQty), packs, lines };
  };
  const better = (a, b) =>
    !b ||
    a.cents < b.cents ||
    (a.cents === b.cents && (a.leftover < b.leftover ||
      (a.leftover === b.leftover && (a.lines.length < b.lines.length ||
        (a.lines.length === b.lines.length && a.packs < b.packs)))));

  // Mejor opción con una sola presentación (siempre se calcula).
  let best = null;
  cands.forEach((c, i) => {
    const counts = cands.map(() => 0);
    counts[i] = packsFor(needQty, c.packQtyBase);
    const r = evaluate(counts);
    if (better(r, best)) best = r;
  });
  // Combinaciones de presentaciones: búsqueda exhaustiva acotada.
  if (allowMix && cands.length > 1 && needQty > 0) {
    let explored = 0;
    const counts = cands.map(() => 0);
    const walk = (i, remaining) => {
      if (explored++ > MAX_COMBINATIONS) return;
      if (i === cands.length - 1) {
        counts[i] = packsFor(remaining, cands[i].packQtyBase);
        const r = evaluate(counts);
        if (better(r, best)) best = r;
        counts[i] = 0;
        return;
      }
      const maxN = packsFor(remaining, cands[i].packQtyBase);
      for (let n = 0; n <= maxN; n++) {
        counts[i] = n;
        walk(i + 1, Math.max(0, clean(remaining - n * cands[i].packQtyBase)));
      }
      counts[i] = 0;
    };
    walk(0, needQty);
  }
  if (!best.lines.length) {
    // Necesidad cero: se toma la presentación más barata por unidad como referencia.
    const c = [...cands].sort((a, b) => a.offer.priceCents / a.packQtyBase - b.offer.priceCents / b.packQtyBase)[0];
    best.lines = [{ ...c, packs: 0, cents: 0, promoApplied: false, promoNote: null }];
  }
  const main = [...best.lines].sort((a, b) => b.packs * b.packQtyBase - a.packs * a.packQtyBase)[0];
  return {
    status: 'cotizado',
    offer: main.offer,
    packQtyBase: main.packQtyBase,
    packApprox: best.lines.some((l) => l.packApprox),
    packNotes: [...new Set(best.lines.flatMap((l) => l.packNotes))],
    packs: best.packs,
    cents: best.cents,
    purchasedQty: best.purchasedQty,
    leftover: best.leftover,
    lines: best.lines,
    mixed: best.lines.length > 1,
    promoApplied: best.lines.some((l) => l.promoApplied),
    promoNote: best.lines.map((l) => l.promoNote).filter(Boolean).join(' ') || null,
  };
}

/** Valor proporcional de `qty` al precio por unidad más bajo disponible (para lo que ya hay en casa). */
function referenceValue(choice, qty) {
  const l = [...choice.lines].sort((a, b) => a.offer.priceCents / a.packQtyBase - b.offer.priceCents / b.packQtyBase)[0];
  return proportionalCents(l.offer.priceCents, qty, l.packQtyBase);
}

/**
 * Calcula la compra de toda la lista en un conjunto de ofertas.
 * Los valores proporcionales usan lo que realmente se paga por unidad
 * (dinero a pagar ÷ cantidad comprada), así usado + sobrante = pagado.
 * @param needs salida de applyPantry
 * @returns { items[], totals }
 */
export function computePurchase(needs, ingredients, offers, opts = {}) {
  const { brandLocks = {}, acceptedPromos = {}, fallbackOffers = null, allowMix = true } = opts;
  const items = [];
  for (const [id, need] of needs) {
    const ing = ingredients[id];
    const base = { ingredientId: id, ingredient: ing, ...need };
    if (need.errors.length && need.qty === 0) {
      items.push({ ...base, status: 'sin-conversion', reason: need.errors[0] });
      continue;
    }
    const buyQty = need.needQty > 0 ? need.needQty : 0;
    const choiceOpts = { brandLock: brandLocks[id], acceptedPromos, allowMix };
    let choice = chooseOffer(buyQty, ing, offers, choiceOpts);
    let fromFallback = false;
    if (choice.status !== 'cotizado' && fallbackOffers) {
      const fb = chooseOffer(buyQty, ing, fallbackOffers, choiceOpts);
      if (fb.status === 'cotizado') {
        choice = { ...fb, primaryStatus: choice.status, primaryReason: choice.reason };
        fromFallback = true;
      }
    }
    if (need.needQty <= 0) {
      // Todo cubierto por la despensa: no se compra nada; se valúa como referencia.
      const valued = choice.status === 'cotizado' ? choice : null;
      items.push({
        ...base,
        status: 'en-casa',
        packs: 0,
        cents: 0,
        lines: [],
        offer: valued?.offer ?? null,
        packQtyBase: valued?.packQtyBase ?? null,
        usedValueCents: valued ? referenceValue(valued, need.qty) : null,
        pantryValueCents: valued ? referenceValue(valued, need.coveredQty) : null,
        leftover: 0,
        fromFallback,
      });
      continue;
    }
    if (choice.status !== 'cotizado') {
      items.push({ ...base, ...choice, cents: null, packs: null, lines: [], fromFallback: false });
      continue;
    }
    const rate = (q) => proportionalCents(choice.cents, q, choice.purchasedQty);
    items.push({
      ...base,
      ...choice,
      // Valor de lo que usan las comidas (incluye lo de la despensa, al mismo precio por unidad)
      usedValueCents: rate(need.qty),
      pantryValueCents: need.coveredQty > 0 ? rate(need.coveredQty) : 0,
      leftoverValueCents: choice.cents - rate(need.needQty),
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
