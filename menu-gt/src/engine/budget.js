// Paso 4: presupuesto. Nunca trata un precio faltante como cero ni declara
// que el presupuesto alcanza mientras falten productos por cotizar o mientras
// la cotización dependa de precios viejos.

const DAY = 24 * 60 * 60 * 1000;
/** Días tras los cuales un precio deja de servir para confirmar el presupuesto. */
export const PRICE_MAX_AGE_DAYS = { guardado: 14, consultado: 14, usuario: 30 };

/** Antigüedad de un precio, o null si es un ejemplo ficticio (no envejece: nunca confirma nada). */
export function priceAge(offer, now = Date.now()) {
  const kind = offer.channel === 'usuario' ? 'usuario' : offer.status;
  const max = PRICE_MAX_AGE_DAYS[kind];
  if (!max || !offer.fetchedAt) return null;
  const days = Math.floor((now - new Date(offer.fetchedAt).getTime()) / DAY);
  return { days, maxDays: max, stale: days > max };
}

/** Productos de la compra cotizados con al menos un precio vencido. */
export function staleItems(items, now = Date.now()) {
  return items.filter((it) => it.status === 'cotizado' && it.packs > 0 && it.lines.some((l) => priceAge(l.offer, now)?.stale));
}

export function evaluateBudget({ budgetCents, totals, extras = [], transportCents = null, staleCount = 0 }) {
  const extrasKnown = extras.filter((e) => Number.isInteger(e.cents));
  const extrasCents = extrasKnown.reduce((s, e) => s + e.cents, 0) + (Number.isInteger(transportCents) ? transportCents : 0);
  const purchaseKnownCents = totals.purchaseCents;
  const spentKnownCents = purchaseKnownCents + extrasCents;
  const pendingCount = totals.missing.length;
  if (!Number.isInteger(budgetCents) || budgetCents <= 0) {
    return { status: 'sin-presupuesto', purchaseKnownCents, extrasCents, spentKnownCents, pendingCount, staleCount, balanceCents: null };
  }
  const balanceCents = budgetCents - spentKnownCents;
  let status;
  if (balanceCents < 0) status = 'insuficiente';
  else if (pendingCount > 0 || staleCount > 0) status = 'sin-confirmar';
  else status = 'alcanza';
  return {
    status,
    budgetCents,
    purchaseKnownCents,
    extrasCents,
    spentKnownCents,
    balanceCents,
    pendingCount,
    staleCount,
    shortfallCents: balanceCents < 0 ? -balanceCents : 0,
    // Si faltan precios y ya no alcanza, el faltante real es "al menos" esto.
    shortfallIsMinimum: balanceCents < 0 && pendingCount > 0,
    transportIncluded: Number.isInteger(transportCents),
  };
}

export function budgetMessage(b, fmt) {
  switch (b.status) {
    case 'sin-presupuesto':
      return 'Aún no indicas un presupuesto para este período.';
    case 'alcanza':
      return `Alcanza. Te quedan ${fmt(b.balanceCents)} después de comprar todo.`;
    case 'sin-confirmar':
      return b.pendingCount
        ? `Llevas ${fmt(b.spentKnownCents)} cotizados. Faltan ${b.pendingCount} producto(s) por cotizar; no se puede confirmar si alcanza.`
        : `Llevas ${fmt(b.spentKnownCents)} cotizados, pero ${b.staleCount} precio(s) tienen más días de los permitidos; vuelve a consultarlos para confirmar si alcanza.`;
    case 'insuficiente':
      return b.shortfallIsMinimum
        ? `No alcanza: faltan al menos ${fmt(b.shortfallCents)}, y aún hay ${b.pendingCount} producto(s) sin precio.`
        : `No alcanza: faltan ${fmt(b.shortfallCents)}.`;
    default:
      return '';
  }
}
