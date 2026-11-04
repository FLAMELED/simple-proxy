// Verificación independiente de un plano. No reutiliza el motor: vuelve a revisar
// cada pieza contra los datos del proyecto. Devuelve una lista de problemas; vacía = correcto.

const EPS = 1e-6;

export function verifyPlan(project, plan) {
  const problems = [];
  const { width: W, height: H, quantity } = project.material;
  const k = project.kerf; const m = project.margin;
  if (plan.sheets.length > quantity) problems.push(`Usa ${plan.sheets.length} planchas y solo hay ${quantity}.`);

  const types = new Map(project.pieces.map((p, i) => [p.id, { p, i, placed: 0, pending: 0 }]));
  const codes = new Set();
  const seen = (code) => { if (codes.has(code)) problems.push(`La pieza ${code} aparece dos veces.`); codes.add(code); };

  for (const s of plan.sheets) {
    for (const pl of s.placements) {
      seen(pl.code);
      const t = types.get(pl.pieceId);
      if (!t) { problems.push(`${pl.code}: no corresponde a ninguna pieza del proyecto.`); continue; }
      t.placed++;
      const same = Math.abs(pl.w - t.p.width) < EPS && Math.abs(pl.h - t.p.height) < EPS;
      const swapped = Math.abs(pl.w - t.p.height) < EPS && Math.abs(pl.h - t.p.width) < EPS;
      if (!same && !swapped) problems.push(`${pl.code}: medidas distintas a las indicadas.`);
      if (!same && swapped && !t.p.rotate) problems.push(`${pl.code}: está girada y no se permite girarla.`);
      if ((same || swapped) && !(same && swapped) && pl.rotated !== !same) problems.push(`${pl.code}: la marca de giro no coincide.`);
      if (pl.x < m - EPS || pl.y < m - EPS || pl.x + pl.w > W - m + EPS || pl.y + pl.h > H - m + EPS) problems.push(`${pl.code}: se sale del área útil (plancha ${s.index}).`);
    }
    const ps = s.placements;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i]; const b = ps[j];
      const apart = a.x + a.w + k <= b.x + EPS || b.x + b.w + k <= a.x + EPS || a.y + a.h + k <= b.y + EPS || b.y + b.h + k <= a.y + EPS;
      if (!apart) problems.push(`${a.code} y ${b.code} se encuentran o no respetan la separación de ${k} (plancha ${s.index}).`);
    }
    if (!isGuillotine(ps.map((p) => ({ x: p.x, y: p.y, w: p.w + k, h: p.h + k })))) problems.push(`Plancha ${s.index}: no se puede separar con cortes rectos de lado a lado.`);
    for (const l of s.leftovers) {
      for (const p of ps) {
        const apart = l.x + l.w <= p.x + EPS || p.x + p.w <= l.x + EPS || l.y + l.h <= p.y + EPS || p.y + p.h <= l.y + EPS;
        if (!apart) problems.push(`El sobrante ${l.code} se cruza con la pieza ${p.code}.`);
      }
      if (l.x < m - EPS || l.y < m - EPS || l.x + l.w > W - m + EPS || l.y + l.h > H - m + EPS) problems.push(`El sobrante ${l.code} se sale del área útil.`);
    }
  }
  for (const pe of plan.pending) { seen(pe.code); const t = types.get(pe.pieceId); if (t) t.pending++; }
  for (const { p, placed, pending } of types.values()) {
    if (placed + pending !== p.qty) problems.push(`${p.label || 'Pieza'}: se pidieron ${p.qty} y el plano tiene ${placed} colocadas y ${pending} pendientes.`);
  }
  return problems;
}

/** ¿Se pueden separar todos los rectángulos con cortes rectos que atraviesen todo el trozo? */
export function isGuillotine(rects) {
  if (rects.length <= 1) return true;
  for (const axis of ['x', 'y']) {
    const size = axis === 'x' ? 'w' : 'h';
    const cuts = [...new Set(rects.map((r) => r[axis] + r[size]))].sort((a, b) => a - b);
    for (const c of cuts) {
      const left = rects.filter((r) => r[axis] + r[size] <= c + EPS);
      const right = rects.filter((r) => r[axis] >= c - EPS);
      if (left.length && right.length && left.length + right.length === rects.length) {
        return isGuillotine(left) && isGuillotine(right);
      }
    }
  }
  return false;
}
