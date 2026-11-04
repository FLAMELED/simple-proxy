// Verificación independiente de un plano. No reutiliza el motor: vuelve a revisar
// cada pieza contra los datos del proyecto. Devuelve una lista de problemas; vacía = correcto.
//
// Todas las comparaciones se hacen con enteros de la misma rejilla exacta (units.js):
// los datos del proyecto con su valor exacto en mm y las coordenadas del plano
// devueltas a la rejilla. No hay tolerancias que puedan aceptar un solape real
// ni rechazar una pieza que cabe justo.
import { toGrid, gridPerUnit } from './units.js';

export function verifyPlan(project, plan) {
  const problems = [];
  if (plan.unit !== project.unit) return [`El plano está en ${plan.unit} y el proyecto en ${project.unit}: genera el plano de nuevo.`];
  const G = gridPerUnit(project.unit);
  const q = (v) => Math.round(v * G); // coordenada del plano → rejilla
  const W = toGrid(project, 'material.width'); const H = toGrid(project, 'material.height');
  const k = toGrid(project, 'kerf'); const m = toGrid(project, 'margin');
  const quantity = project.material.quantity;
  if (plan.sheets.length > quantity) problems.push(`Usa ${plan.sheets.length} planchas y solo hay ${quantity}.`);

  const types = new Map(project.pieces.map((p) => [p.id, { p, w: toGrid(project, `pieces.${p.id}.width`), h: toGrid(project, `pieces.${p.id}.height`), placed: 0, pending: 0 }]));
  const codes = new Set();
  const seen = (code) => { if (codes.has(code)) problems.push(`La pieza ${code} aparece dos veces.`); codes.add(code); };

  for (const s of plan.sheets) {
    const ps = s.placements.map((pl) => ({ ...pl, X: q(pl.x), Y: q(pl.y), Wd: q(pl.w), Hd: q(pl.h) }));
    for (const pl of ps) {
      seen(pl.code);
      const t = types.get(pl.pieceId);
      if (!t) { problems.push(`${pl.code}: no corresponde a ninguna pieza del proyecto.`); continue; }
      t.placed++;
      const same = pl.Wd === t.w && pl.Hd === t.h;
      const swapped = pl.Wd === t.h && pl.Hd === t.w;
      if (!same && !swapped) problems.push(`${pl.code}: medidas distintas a las indicadas.`);
      if (!same && swapped && !t.p.rotate) problems.push(`${pl.code}: está girada y no se permite girarla.`);
      if ((same || swapped) && !(same && swapped) && pl.rotated !== !same) problems.push(`${pl.code}: la marca de giro no coincide.`);
      if (pl.X < m || pl.Y < m || pl.X + pl.Wd > W - m || pl.Y + pl.Hd > H - m) problems.push(`${pl.code}: se sale del área útil (plancha ${s.index}).`);
    }
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i]; const b = ps[j];
      const apart = a.X + a.Wd + k <= b.X || b.X + b.Wd + k <= a.X || a.Y + a.Hd + k <= b.Y || b.Y + b.Hd + k <= a.Y;
      if (!apart) problems.push(`${a.code} y ${b.code} se encuentran o no respetan la separación de ${project.kerf} (plancha ${s.index}).`);
    }
    if (!isGuillotine(ps.map((p) => ({ x: p.X, y: p.Y, w: p.Wd + k, h: p.Hd + k })))) problems.push(`Plancha ${s.index}: no se puede separar con cortes rectos de lado a lado.`);
    for (const l of s.leftovers) {
      const L = { X: q(l.x), Y: q(l.y), Wd: q(l.w), Hd: q(l.h) };
      for (const p of ps) {
        const apart = L.X + L.Wd <= p.X || p.X + p.Wd <= L.X || L.Y + L.Hd <= p.Y || p.Y + p.Hd <= L.Y;
        if (!apart) problems.push(`El sobrante ${l.code} se cruza con la pieza ${p.code}.`);
      }
      if (L.X < m || L.Y < m || L.X + L.Wd > W - m || L.Y + L.Hd > H - m) problems.push(`El sobrante ${l.code} se sale del área útil.`);
    }
  }
  for (const pe of plan.pending) { seen(pe.code); const t = types.get(pe.pieceId); if (t) t.pending++; }
  for (const { p, placed, pending } of types.values()) {
    if (placed + pending !== p.qty) problems.push(`${p.label || 'Pieza'}: se pidieron ${p.qty} y el plano tiene ${placed} colocadas y ${pending} pendientes.`);
  }
  return problems;
}

/** ¿Se pueden separar todos los rectángulos (enteros) con cortes rectos que atraviesen todo el trozo? */
export function isGuillotine(rects) {
  if (rects.length <= 1) return true;
  for (const axis of ['x', 'y']) {
    const size = axis === 'x' ? 'w' : 'h';
    const cuts = [...new Set(rects.map((r) => r[axis] + r[size]))].sort((a, b) => a - b);
    for (const c of cuts) {
      const left = rects.filter((r) => r[axis] + r[size] <= c);
      const right = rects.filter((r) => r[axis] >= c);
      if (left.length && right.length && left.length + right.length === rects.length) {
        return isGuillotine(left) && isGuillotine(right);
      }
    }
  }
  return false;
}
