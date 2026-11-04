// Motor de distribución de piezas rectangulares. Lógica pura y determinista:
// mismas entradas → mismo plano. No usa IA ni azar. Se prueba con node --test.
//
// Método (guillotina con «mejor ajuste por área»):
//  1. Cada pieza se trata como un rectángulo agrandado con la separación de corte
//     a la derecha y abajo; el área útil (material menos margen) se agranda igual.
//     Así, entre dos piezas siempre queda al menos la separación indicada, y una
//     pieza puede llegar justo hasta el margen.
//  2. Cada pieza se coloca en la esquina de un espacio libre. El sobrante de ese
//     espacio se divide con un corte recto de lado a lado; por eso todo el plano
//     se puede separar con cortes de guillotina.
//  3. Se prueban varios órdenes de piezas y reglas de división, y se elige el que
//     acomoda más piezas con menos planchas. No se garantiza que sea el mejor
//     resultado posible.

export const ALGO_VERSION = 'guillotina-1';
const SCALE = 1000; // se calcula en milésimas de la unidad para evitar errores de redondeo
const toI = (v) => Math.round(Number(v) * SCALE);
const toU = (i) => Math.round(i) / SCALE;

export const UNIT_LABEL = { mm: 'mm', cm: 'cm', in: 'pulg' };

export function pieceCode(index) {
  let s = ''; let n = index;
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Revisa los datos antes de calcular. Devuelve [{ field, pieceId?, message }]. */
export function validate(p) {
  const e = [];
  const m = p.material || {};
  const u = UNIT_LABEL[p.unit] || p.unit;
  if (!isNum(m.width) || m.width <= 0) e.push({ field: 'material.width', message: 'Falta el ancho del material.' });
  if (!isNum(m.height) || m.height <= 0) e.push({ field: 'material.height', message: 'Falta el largo del material.' });
  if (!Number.isInteger(m.quantity) || m.quantity < 1) e.push({ field: 'material.quantity', message: 'Indica cuántas planchas o piezas de material tienes (1 o más).' });
  if (!isNum(p.kerf) || p.kerf < 0) e.push({ field: 'kerf', message: 'Indica la separación entre cortes (puede ser 0).' });
  if (!isNum(p.margin) || p.margin < 0) e.push({ field: 'margin', message: 'Indica el margen del borde (puede ser 0).' });
  if (isNum(m.width) && isNum(m.height) && isNum(p.margin) && (2 * p.margin >= m.width || 2 * p.margin >= m.height)) {
    e.push({ field: 'margin', message: `El margen (${p.margin} ${u} por lado) no deja espacio útil en el material.` });
  }
  if (!p.pieces || !p.pieces.length) e.push({ field: 'pieces', message: 'Agrega al menos una pieza.' });
  (p.pieces || []).forEach((pc, i) => {
    const name = pc.label?.trim() || `Pieza ${pieceCode(i)}`;
    if (!isNum(pc.width) || pc.width <= 0) e.push({ field: 'width', pieceId: pc.id, message: `${name}: falta el ancho.` });
    if (!isNum(pc.height) || pc.height <= 0) e.push({ field: 'height', pieceId: pc.id, message: `${name}: falta el largo.` });
    if (!Number.isInteger(pc.qty) || pc.qty < 1) e.push({ field: 'qty', pieceId: pc.id, message: `${name}: la cantidad debe ser un número entero, 1 o más.` });
  });
  const total = (p.pieces || []).reduce((s, x) => s + (Number.isInteger(x.qty) ? x.qty : 0), 0);
  if (total > 2000) e.push({ field: 'pieces', message: 'Son más de 2000 piezas; divide el proyecto en partes.' });
  return e;
}

/** Huella de las entradas: sirve para saber si el plano guardado sigue vigente. */
export function inputKey(p) {
  return JSON.stringify([ALGO_VERSION, p.unit, p.material.width, p.material.height, p.material.quantity, p.kerf, p.margin,
    p.pieces.map((x) => [x.id, x.label, x.width, x.height, x.qty, !!x.rotate])]);
}

const SORTS = {
  'área': (a, b) => b.w * b.h - a.w * a.h,
  'lado mayor': (a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || Math.min(b.w, b.h) - Math.min(a.w, a.h),
  'ancho': (a, b) => b.w - a.w || b.h - a.h,
  'largo': (a, b) => b.h - a.h || b.w - a.w,
  'perímetro': (a, b) => (b.w + b.h) - (a.w + a.h),
};
const SPLITS = ['eje sobrante corto', 'eje sobrante largo', 'sobrante mayor'];

function split(rule, r, iw, ih) {
  const lw = r.w - iw; const lh = r.h - ih;
  let horizontal; // true: el corte va a todo el ancho, debajo de la pieza
  if (rule === 'eje sobrante corto') horizontal = lw <= lh;
  else if (rule === 'eje sobrante largo') horizontal = lw > lh;
  else horizontal = r.w * lh >= lw * r.h; // deja el sobrante más grande posible
  const out = horizontal
    ? [{ x: r.x, y: r.y + ih, w: r.w, h: lh }, { x: r.x + iw, y: r.y, w: lw, h: ih }]
    : [{ x: r.x + iw, y: r.y, w: lw, h: r.h }, { x: r.x, y: r.y + ih, w: iw, h: lh }];
  return out.filter((f) => f.w > 0 && f.h > 0);
}

function packOnce(items, ctx, sortName, rule) {
  const { binW, binH, k, maxSheets } = ctx;
  const order = items.map((it, i) => ({ it, i })).sort((a, b) => SORTS[sortName](a.it, b.it) || a.i - b.i).map((x) => x.it);
  const sheets = [];
  const pending = [];
  const fitsIn = (r, w, h) => w <= r.w && h <= r.h;
  for (const it of order) {
    const orients = [[it.w + k, it.h + k, false]];
    if (it.rotate && it.w !== it.h) orients.push([it.h + k, it.w + k, true]);
    const fitsEmpty = orients.some(([w, h]) => w <= binW && h <= binH);
    if (!fitsEmpty) { pending.push({ it, reason: it.rotate ? 'size' : 'size-norotate' }); continue; }
    let best = null;
    const consider = (si, ri, r) => {
      for (const [w, h, rot] of orients) {
        if (!fitsIn(r, w, h)) continue;
        const area = r.w * r.h - w * h;
        const side = Math.min(r.w - w, r.h - h);
        if (!best || area < best.area || (area === best.area && side < best.side)) best = { si, ri, w, h, rot, area, side };
      }
    };
    sheets.forEach((s, si) => s.free.forEach((r, ri) => consider(si, ri, r)));
    if (!best) {
      if (sheets.length >= maxSheets) { pending.push({ it, reason: 'material' }); continue; }
      sheets.push({ free: [{ x: 0, y: 0, w: binW, h: binH }], placed: [] });
      consider(sheets.length - 1, 0, sheets[sheets.length - 1].free[0]);
    }
    const s = sheets[best.si];
    const r = s.free[best.ri];
    s.free.splice(best.ri, 1, ...split(rule, r, best.w, best.h));
    s.placed.push({ it, x: r.x, y: r.y, w: best.w - k, h: best.h - k, rotated: best.rot });
  }
  const placedCount = sheets.reduce((n, s) => n + s.placed.length, 0);
  const placedArea = sheets.reduce((n, s) => n + s.placed.reduce((a, p) => a + p.w * p.h, 0), 0);
  const biggestFree = Math.max(0, ...sheets.flatMap((s) => s.free.map((f) => (f.w - k) * (f.h - k))));
  return { sheets, pending, placedCount, placedArea, biggestFree, sortName, rule };
}

function better(a, b) {
  if (a.placedCount !== b.placedCount) return a.placedCount > b.placedCount;
  if (a.placedArea !== b.placedArea) return a.placedArea > b.placedArea;
  if (a.sheets.length !== b.sheets.length) return a.sheets.length < b.sheets.length;
  return a.biggestFree > b.biggestFree;
}

/**
 * Calcula la distribución. Las medidas de entrada y salida van en la unidad del proyecto.
 * @returns plan listo para dibujar, imprimir y verificar.
 */
export function pack(p) {
  const errors = validate(p);
  if (errors.length) return { ok: false, errors };
  const k = toI(p.kerf); const m = toI(p.margin);
  const W = toI(p.material.width); const H = toI(p.material.height);
  const minUseful = toI(p.minLeftover || 0);
  const ctx = { binW: W - 2 * m + k, binH: H - 2 * m + k, k, maxSheets: p.material.quantity };
  const items = [];
  p.pieces.forEach((pc, idx) => {
    const code = pieceCode(idx);
    for (let n = 1; n <= pc.qty; n++) items.push({ code: `${code}${n}`, type: code, pieceId: pc.id, label: pc.label?.trim() || `Pieza ${code}`, w: toI(pc.width), h: toI(pc.height), rotate: !!pc.rotate });
  });
  let best = null; let attempts = 0;
  for (const s of Object.keys(SORTS)) for (const r of SPLITS) {
    const res = packOnce(items, ctx, s, r); attempts++;
    if (!best || better(res, best)) best = res;
  }
  const REASON = {
    size: 'Es más grande que el área útil del material, aun girándola.',
    'size-norotate': 'No cabe en esa orientación y está marcada «no girar».',
    material: 'No alcanzó el material: faltan planchas.',
  };
  const sheetArea = (W - 2 * m) * (H - 2 * m);
  const sheets = best.sheets.map((s, i) => {
    const leftovers = s.free
      .map((f) => ({ x: f.x + m, y: f.y + m, w: f.w - k, h: f.h - k }))
      .filter((f) => f.w > 0 && f.h > 0)
      .sort((a, b) => b.w * b.h - a.w * a.h);
    const useful = leftovers.filter((f) => f.w >= minUseful && f.h >= minUseful);
    const order = (a, b) => a.y - b.y || a.x - b.x;
    return {
      index: i + 1,
      placements: s.placed.slice().sort((a, b) => a.it.type.localeCompare(b.it.type) || Number(a.it.code.slice(a.it.type.length)) - Number(b.it.code.slice(b.it.type.length)))
        .map((pl) => ({ code: pl.it.code, type: pl.it.type, pieceId: pl.it.pieceId, label: pl.it.label, x: toU(pl.x + m), y: toU(pl.y + m), w: toU(pl.w), h: toU(pl.h), rotated: pl.rotated })),
      leftovers: useful.sort(order).map((f, j) => ({ code: `S${i + 1}.${j + 1}`, x: toU(f.x), y: toU(f.y), w: toU(f.w), h: toU(f.h) })),
      piecesArea: toU(toU(s.placed.reduce((a, pl) => a + pl.w * pl.h, 0))),
      usefulLeftoverArea: toU(toU(useful.reduce((a, f) => a + f.w * f.h, 0))),
    };
  });
  const pending = best.pending.map(({ it, reason }) => ({ code: it.code, type: it.type, pieceId: it.pieceId, label: it.label, w: toU(it.w), h: toU(it.h), reason, reasonText: REASON[reason] }))
    .sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }));
  const piecesArea = sheets.reduce((a, s) => a + s.piecesArea, 0);
  const usedMaterial = toU(toU(W * H)) * sheets.length;
  return {
    ok: true, algo: ALGO_VERSION, attempts, chosen: { order: best.sortName, split: best.rule },
    unit: p.unit, material: { ...p.material }, kerf: p.kerf, margin: p.margin, minLeftover: p.minLeftover || 0,
    sheets, pending,
    stats: {
      total: items.length, placed: best.placedCount, pending: pending.length,
      sheetsUsed: sheets.length, sheetsAvailable: p.material.quantity,
      piecesArea: round2(piecesArea), usedMaterialArea: round2(usedMaterial),
      usePct: usedMaterial ? Math.round((piecesArea / usedMaterial) * 1000) / 10 : 0,
      usableAreaPerSheet: round2(toU(toU(sheetArea))),
    },
  };
}
const round2 = (v) => Math.round(v * 100) / 100;
