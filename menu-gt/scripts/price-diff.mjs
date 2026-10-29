// Compara dos capturas de precios reales: qué subió, bajó, se agotó, volvió o desapareció.
// Lo usan snapshot-prices.mjs (reporte en data/capturas/cambios.md) y las pruebas.

const pct = (a, b) => Math.round(((b - a) / a) * 1000) / 10;

export function diffSnapshots(prev, next) {
  const before = new Map(prev.offers.map((o) => [o.id, o]));
  const after = new Map(next.offers.map((o) => [o.id, o]));
  const changes = { subio: [], bajo: [], agotado: [], disponible: [], nuevo: [], quitado: [] };
  for (const [id, o] of after) {
    const p = before.get(id);
    if (!p) { changes.nuevo.push({ id, product: o.product, priceCents: o.priceCents }); continue; }
    if (o.priceCents !== p.priceCents) {
      (o.priceCents > p.priceCents ? changes.subio : changes.bajo).push({ id, product: o.product, from: p.priceCents, to: o.priceCents, pct: pct(p.priceCents, o.priceCents) });
    }
    if (p.availability !== o.availability) (o.availability === 'agotado' ? changes.agotado : changes.disponible).push({ id, product: o.product });
  }
  for (const [id, p] of before) if (!after.has(id)) changes.quitado.push({ id, product: p.product });
  for (const k of ['subio', 'bajo']) changes[k].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  return changes;
}

const q = (c) => `Q${(c / 100).toFixed(2)}`;

export function diffReport(prev, next, changes) {
  const out = [`# Cambios de precio`, '', `De la captura del ${prev.finished?.slice(0, 10) ?? '—'} a la del ${next.finished?.slice(0, 10) ?? '—'}.`, ''];
  const section = (title, rows, fmt) => {
    if (!rows.length) return;
    out.push(`## ${title} (${rows.length})`, '', ...rows.map((r) => `- ${fmt(r)}`), '');
  };
  section('Subieron', changes.subio, (r) => `${r.product}: ${q(r.from)} → ${q(r.to)} (+${r.pct} %)`);
  section('Bajaron', changes.bajo, (r) => `${r.product}: ${q(r.from)} → ${q(r.to)} (${r.pct} %)`);
  section('Ahora agotados', changes.agotado, (r) => r.product);
  section('De nuevo disponibles', changes.disponible, (r) => r.product);
  section('Nuevos', changes.nuevo, (r) => `${r.product}: ${q(r.priceCents)}`);
  section('Ya no se aceptan (ver excluidos)', changes.quitado, (r) => r.product);
  if (out.length === 4) out.push('Sin cambios.', '');
  return out.join('\n');
}
