// Unidades y precisión de las medidas de un proyecto de corte.
//
// · 1 pulgada = 25,4 mm y 1 cm = 10 mm (exactos).
// · El motor y el verificador trabajan con enteros en una rejilla de 0,1 µm:
//   mm × 10 000, cm × 100 000, pulg × 254 000. Así 0,001 de cualquier unidad
//   es un número entero y las comparaciones son exactas, sin tolerancias.
// · Al convertir de unidad, el valor mostrado se redondea a 3 decimales, pero el
//   proyecto guarda en `exact` el valor exacto en mm. Mientras la persona no
//   cambie ese campo, el motor usa el valor exacto: ida y vuelta no pierde nada
//   y una pieza que cabía justo sigue cabiendo justo.

export const MM_PER = Object.freeze({ mm: 1, cm: 10, in: 25.4 });
export const GRID_PER_MM = 10000;
export const DECIMALS = 3;
export const UNIT_NAMES = { mm: 'milímetros', cm: 'centímetros', in: 'pulgadas' };

export const roundTo = (v, d = DECIMALS) => Math.round(v * 10 ** d) / 10 ** d;
export const gridPerUnit = (unit) => MM_PER[unit] * GRID_PER_MM;

/** Rutas de todas las longitudes del proyecto (no incluye cantidades). */
export function lengthPaths(p) {
  return ['material.width', 'material.height', 'kerf', 'margin', 'minLeftover',
    ...(p.pieces || []).flatMap((pc) => [`pieces.${pc.id}.width`, `pieces.${pc.id}.height`])];
}

export function getPath(p, path) {
  const [a, b, c] = path.split('.');
  if (a === 'pieces') return (p.pieces || []).find((x) => x.id === b)?.[c] ?? null;
  return (b ? p[a]?.[b] : p[a]) ?? null;
}

function setPath(p, path, v) {
  const [a, b, c] = path.split('.');
  if (a === 'pieces') { const pc = p.pieces.find((x) => x.id === b); if (pc) pc[c] = v; return; }
  if (b) p[a][b] = v; else p[a] = v;
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Valor exacto en mm de una longitud, o null si está pendiente. */
export function exactMm(p, path) {
  const v = getPath(p, path);
  if (!isNum(v)) return null;
  const e = p.exact?.[path];
  if (isNum(e) && roundTo(e / MM_PER[p.unit]) === v) return e; // el valor mostrado sigue siendo la conversión
  return v * MM_PER[p.unit];
}

/** Longitud como entero de la rejilla (0,1 µm), o null si está pendiente. */
export function toGrid(p, path) {
  const mm = exactMm(p, path);
  return mm === null ? null : Math.round(mm * GRID_PER_MM);
}

/**
 * Convierte todas las longitudes a otra unidad. Devuelve un proyecto nuevo.
 * No toca cantidades. Los datos pendientes (null) siguen pendientes.
 */
export function convertProject(p, to) {
  if (!MM_PER[to]) throw new Error(`Unidad desconocida: ${to}`);
  const q = structuredClone(p);
  if (p.unit === to) return q;
  const exact = {};
  for (const path of lengthPaths(p)) {
    const mm = exactMm(p, path);
    if (mm === null) continue;
    exact[path] = mm;
    setPath(q, path, roundTo(mm / MM_PER[to]));
  }
  q.unit = to;
  q.exact = exact;
  return q;
}

/** Quita el valor exacto de un campo que la persona acaba de cambiar. */
export function forgetExact(p, path) { if (p.exact) delete p.exact[path]; }

/** Ejemplo para el aviso: «100 cm → 1000 mm». */
export function conversionExample(p, to) {
  const mm = exactMm(p, 'material.width');
  if (mm === null) return null;
  return { from: getPath(p, 'material.width'), to: roundTo(mm / MM_PER[to]) };
}
