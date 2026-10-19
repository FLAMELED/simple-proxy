// Paso 4: presupuesto. Nunca trata un precio faltante como cero ni declara
// que el presupuesto alcanza mientras falten productos por cotizar.

export function evaluateBudget({ budgetCents, totals, extras = [], transportCents = null }) {
  const extrasKnown = extras.filter((e) => Number.isInteger(e.cents));
  const extrasCents = extrasKnown.reduce((s, e) => s + e.cents, 0) + (Number.isInteger(transportCents) ? transportCents : 0);
  const purchaseKnownCents = totals.purchaseCents;
  const spentKnownCents = purchaseKnownCents + extrasCents;
  const pendingCount = totals.missing.length;
  if (!Number.isInteger(budgetCents) || budgetCents <= 0) {
    return { status: 'sin-presupuesto', purchaseKnownCents, extrasCents, spentKnownCents, pendingCount, balanceCents: null };
  }
  const balanceCents = budgetCents - spentKnownCents;
  let status;
  if (balanceCents < 0) status = 'insuficiente';
  else if (pendingCount > 0) status = 'sin-confirmar';
  else status = 'alcanza';
  return {
    status,
    budgetCents,
    purchaseKnownCents,
    extrasCents,
    spentKnownCents,
    balanceCents,
    pendingCount,
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
      return `Llevas ${fmt(b.spentKnownCents)} cotizados. Faltan ${b.pendingCount} producto(s) por cotizar; no se puede confirmar si alcanza.`;
    case 'insuficiente':
      return b.shortfallIsMinimum
        ? `No alcanza: faltan al menos ${fmt(b.shortfallCents)}, y aún hay ${b.pendingCount} producto(s) sin precio.`
        : `No alcanza: faltan ${fmt(b.shortfallCents)}.`;
    default:
      return '';
  }
}
