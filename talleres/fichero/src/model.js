// Lógica pura del fichero: sin DOM ni almacenamiento. Se prueba con node --test.
import { formatAmount, UNITS } from '../shared/numbers.js';

export const SCHEMA_VERSION = 1;
export const BACKUP_KIND = 'mi-fichero-copia';

let n = 0;
export const fieldId = () => 'c' + Date.now().toString(36) + (n++).toString(36) + Math.random().toString(36).slice(2, 5);

/** Datos vacíos de una ficha a partir de una plantilla. Ninguna medida trae valor. */
export function dataFromTemplate(tpl) {
  return {
    measures: (tpl?.measures || []).map((m) => ({ id: fieldId(), label: m.label, unit: m.unit || 'cm', hint: m.hint || '', value: null })),
    specs: (tpl?.specs || []).map((s) => ({ id: fieldId(), label: s.label, options: s.options || [], value: '' })),
    photos: [],
    notes: '',
  };
}

export const clone = (o) => JSON.parse(JSON.stringify(o));

export function currentData(sheet) {
  const v = sheet.versions[sheet.versions.length - 1];
  return v ? v.data : null;
}

/** Normaliza para comparar: ignora pistas y opciones, que no son datos del trabajo. */
function core(data) {
  return {
    measures: data.measures.map((m) => ({ id: m.id, label: m.label.trim(), unit: m.unit, value: m.value })),
    specs: data.specs.map((s) => ({ id: s.id, label: s.label.trim(), value: String(s.value || '').trim() })),
    photos: data.photos.map((p) => ({ id: p.id, caption: (p.caption || '').trim() })),
    notes: (data.notes || '').trim(),
  };
}
export const sameData = (a, b) => JSON.stringify(core(a)) === JSON.stringify(core(b));

const fmtM = (m, sep) => formatAmount(m.value, m.unit, sep);
const fmtS = (v) => (String(v || '').trim() === '' ? 'Sin dato' : String(v).trim());

/**
 * Lista legible de cambios entre dos versiones.
 * Cada cambio: { kind: 'medida'|'especificación'|'foto'|'observaciones', text }
 */
export function diffData(before, after, sep = '.') {
  const out = [];
  if (!before) return [{ kind: 'ficha', text: 'Ficha creada.' }];
  const a = core(before); const b = core(after);
  const byId = (list) => new Map(list.map((x) => [x.id, x]));
  const am = byId(a.measures); const bm = byId(b.measures);
  for (const m of b.measures) {
    const o = am.get(m.id);
    if (!o) { out.push({ kind: 'medida', text: `Medida agregada: ${m.label} = ${fmtM(m, sep)}` }); continue; }
    if (o.label !== m.label) out.push({ kind: 'medida', text: `Medida renombrada: «${o.label}» ahora es «${m.label}»` });
    if (o.value !== m.value || o.unit !== m.unit) out.push({ kind: 'medida', text: `${m.label}: ${fmtM(o, sep)} → ${fmtM(m, sep)}` });
  }
  for (const o of a.measures) if (!bm.has(o.id)) out.push({ kind: 'medida', text: `Medida quitada: ${o.label} (era ${fmtM(o, sep)})` });

  const as = byId(a.specs); const bs = byId(b.specs);
  for (const s of b.specs) {
    const o = as.get(s.id);
    if (!o) { out.push({ kind: 'especificación', text: `Agregado: ${s.label} = ${fmtS(s.value)}` }); continue; }
    if (o.label !== s.label) out.push({ kind: 'especificación', text: `Campo renombrado: «${o.label}» ahora es «${s.label}»` });
    if (o.value !== s.value) out.push({ kind: 'especificación', text: `${s.label}: ${fmtS(o.value)} → ${fmtS(s.value)}` });
  }
  for (const o of a.specs) if (!bs.has(o.id)) out.push({ kind: 'especificación', text: `Quitado: ${o.label} (era ${fmtS(o.value)})` });

  const ap = byId(a.photos); const bp = byId(b.photos);
  const addedP = b.photos.filter((p) => !ap.has(p.id)).length;
  const removedP = a.photos.filter((p) => !bp.has(p.id)).length;
  if (addedP) out.push({ kind: 'foto', text: addedP === 1 ? 'Se agregó 1 foto.' : `Se agregaron ${addedP} fotos.` });
  if (removedP) out.push({ kind: 'foto', text: removedP === 1 ? 'Se quitó 1 foto.' : `Se quitaron ${removedP} fotos.` });
  for (const p of b.photos) { const o = ap.get(p.id); if (o && o.caption !== p.caption) out.push({ kind: 'foto', text: `Descripción de foto: ${fmtS(o.caption)} → ${fmtS(p.caption)}` }); }

  if (a.notes !== b.notes) out.push({ kind: 'observaciones', text: b.notes ? 'Observaciones modificadas.' : 'Observaciones borradas.' });
  return out;
}

/** Revisión antes de guardar: no bloquea, avisa de medidas sin dato. */
export function reviewData(data) {
  const missing = data.measures.filter((m) => m.value === null).map((m) => m.label);
  const unnamed = data.measures.filter((m) => !m.label.trim()).length + data.specs.filter((s) => !s.label.trim()).length;
  return { missing, unnamed };
}

/** Agrega una versión nueva. Devuelve false si no hay cambios. */
export function commitVersion(sheet, data, note, at) {
  const prev = currentData(sheet);
  if (prev && sameData(prev, data)) return false;
  sheet.versions.push({ n: sheet.versions.length + 1, savedAt: at, note: (note || '').trim(), data: clone(data) });
  sheet.draft = null;
  sheet.draftAt = null;
  sheet.updatedAt = at;
  return true;
}

/** Todas las fotos a las que hace referencia alguna versión o el borrador. */
export function photoIdsOf(sheet) {
  const ids = new Set();
  for (const v of sheet.versions) for (const p of v.data.photos) ids.add(p.id);
  if (sheet.draft) for (const p of sheet.draft.photos) ids.add(p.id);
  return ids;
}

// ——— Búsqueda ———
export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function search(q, { clients, projects, sheets }) {
  const t = norm(q);
  if (!t) return { clients: [], projects: [], sheets: [] };
  const words = t.split(/\s+/);
  const hit = (...fields) => { const h = norm(fields.join(' ')); return words.every((w) => h.includes(w)); };
  const cById = new Map(clients.map((c) => [c.id, c]));
  const pById = new Map(projects.map((p) => [p.id, p]));
  return {
    clients: clients.filter((c) => hit(c.name, c.phone)),
    projects: projects.filter((p) => hit(p.name, cById.get(p.clientId)?.name)),
    sheets: sheets.filter((s) => { const p = pById.get(s.projectId); return hit(s.title, p?.name, cById.get(p?.clientId)?.name); }),
  };
}

// ——— Copias ———
/** Comprueba que el contenido de una copia tenga la forma esperada. */
export function validateManifest(m) {
  if (!m || m.kind !== BACKUP_KIND) throw new Error('Este archivo no es una copia de «Mi fichero de trabajos a medida».');
  if (typeof m.schema !== 'number' || m.schema > SCHEMA_VERSION) throw new Error('La copia viene de una versión más nueva de la aplicación. Actualiza la app para recuperarla.');
  for (const k of ['clients', 'projects', 'sheets', 'photos', 'templates']) if (!Array.isArray(m[k])) throw new Error('La copia está incompleta.');
  for (const s of m.sheets) if (!Array.isArray(s.versions)) throw new Error('La copia está incompleta (historial de fichas).');
  return m;
}

const KINDS = ['clients', 'projects', 'sheets', 'photos', 'templates'];

/**
 * Revisa que una copia sea coherente antes de escribir nada:
 * identificadores presentes y únicos, y cada proyecto, ficha y foto con su registro padre.
 * Devuelve { errors, warnings }. Con errores, la copia no se recupera.
 */
export function checkRelations(data) {
  const errors = []; const warnings = [];
  const ids = {};
  for (const k of KINDS) {
    ids[k] = new Set();
    for (const r of data[k] || []) {
      if (!r || typeof r.id !== 'string' || !r.id) { errors.push(`Hay un registro sin identificador (${k}).`); continue; }
      if (ids[k].has(r.id)) errors.push(`El identificador ${r.id} está repetido (${k}).`);
      ids[k].add(r.id);
    }
  }
  for (const p of data.projects || []) if (!ids.clients.has(p.clientId)) errors.push(`El proyecto «${p.name}» no tiene su cliente en la copia.`);
  for (const s of data.sheets || []) {
    if (!ids.projects.has(s.projectId)) errors.push(`La ficha «${s.title}» no tiene su proyecto en la copia.`);
    if (!Array.isArray(s.versions)) errors.push(`La ficha «${s.title}» no tiene historial.`);
  }
  for (const ph of data.photos || []) if (!ids.sheets.has(ph.sheetId)) errors.push(`Una foto (${ph.id}) no tiene su ficha en la copia.`);
  let missing = 0;
  for (const s of data.sheets || []) if (Array.isArray(s.versions)) for (const id of photoIdsOf(s)) if (!ids.photos.has(id)) missing++;
  if (missing) warnings.push(missing === 1 ? '1 foto citada en las fichas no viene en la copia.' : `${missing} fotos citadas en las fichas no vienen en la copia.`);
  return { errors, warnings };
}

/**
 * Qué pasaría al recuperar una copia con «Agregar lo nuevo».
 * Agrega solo registros que no existen en este teléfono. No actualiza los que ya existen,
 * aunque la copia tenga cambios más recientes. Nunca deja un registro sin su relación:
 * - un proyecto se agrega solo si su cliente existe o también se agrega;
 * - una ficha, solo si su proyecto existe o también se agrega;
 * - una foto, solo si su ficha existe al final y alguna versión o borrador de esa ficha la usa.
 * Para cada tipo: { add, existing, orphan } (registros), y totales.
 */
export function planMerge(local, incoming) {
  const res = {};
  const have = Object.fromEntries(KINDS.map((k) => [k, new Set((local[k] || []).map((x) => x.id))]));
  const split = (k, related) => {
    const add = []; const existing = []; const orphan = [];
    for (const r of incoming[k] || []) {
      if (have[k].has(r.id)) existing.push(r);
      else if (related && !related(r)) orphan.push(r);
      else add.push(r);
    }
    return { add, existing, orphan };
  };
  res.clients = split('clients');
  const clientIds = new Set([...have.clients, ...res.clients.add.map((x) => x.id)]);
  res.projects = split('projects', (p) => clientIds.has(p.clientId));
  const projectIds = new Set([...have.projects, ...res.projects.add.map((x) => x.id)]);
  res.sheets = split('sheets', (s) => projectIds.has(s.projectId));
  const finalSheets = new Map([...(local.sheets || []), ...res.sheets.add].map((s) => [s.id, s]));
  res.photos = split('photos', (ph) => { const s = finalSheets.get(ph.sheetId); return !!s && photoIdsOf(s).has(ph.id); });
  res.templates = split('templates');
  for (const k of KINDS) res[k].kept = res[k].existing.length; // compatibilidad con la vista anterior
  res.totals = {
    add: KINDS.reduce((n, k) => n + res[k].add.length, 0),
    existing: KINDS.reduce((n, k) => n + res[k].existing.length, 0),
    orphan: KINDS.reduce((n, k) => n + res[k].orphan.length, 0),
  };
  return res;
}

export function measureLine(m, sep) { return `${m.label}: ${formatAmount(m.value, m.unit, sep)}`; }
export { UNITS };
