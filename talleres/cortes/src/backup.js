// «Guardar una copia» / «Recuperar una copia» para los proyectos de corte.
import { readZip, textOf, writeZip } from '../shared/zip.js';
import { nowIso } from '../shared/ui.js';
import * as store from './store.js';

export const BACKUP_KIND = 'mi-plan-de-cortes-copia';
export const SCHEMA = 1;

export async function buildBackup({ includeDemo = false, appVersion = '' } = {}) {
  const projects = (await store.all()).filter((p) => includeDemo || !p.demo);
  const manifest = { kind: BACKUP_KIND, schema: SCHEMA, appVersion, createdAt: nowIso(), includesDemo: includeDemo, projects };
  const bytes = writeZip([
    { name: 'copia.json', data: JSON.stringify(manifest, null, 1) },
    { name: 'LEEME.txt', data: 'Copia de «Mi plan de cortes».\r\nPara recuperarla: abre la app, entra en «Copias» y toca «Recuperar una copia».\r\n' },
  ]);
  return { bytes, count: projects.length };
}

export function validateManifest(m) {
  if (!m || m.kind !== BACKUP_KIND) throw new Error('Este archivo no es una copia de «Mi plan de cortes».');
  if (typeof m.schema !== 'number' || m.schema > SCHEMA) throw new Error('La copia viene de una versión más nueva de la aplicación. Actualiza la app para recuperarla.');
  if (!Array.isArray(m.projects)) throw new Error('La copia está incompleta.');
  const ids = new Set();
  for (const p of m.projects) {
    if (!p || typeof p.id !== 'string' || !p.id || !p.material || !Array.isArray(p.pieces)) throw new Error('La copia está incompleta.');
    if (ids.has(p.id)) throw new Error(`La copia está dañada: el proyecto ${p.id} está repetido.`);
    if (!['mm', 'cm', 'in'].includes(p.unit)) throw new Error(`La copia está dañada: el proyecto «${p.name}» tiene una unidad desconocida.`);
    ids.add(p.id);
  }
  return m;
}

export async function readBackup(bytes) {
  const files = await readZip(bytes);
  const json = files.get('copia.json');
  if (!json) throw new Error('Este archivo no es una copia de «Mi plan de cortes».');
  let m; try { m = JSON.parse(textOf(json)); } catch { throw new Error('La copia está dañada: no se pudo leer su contenido.'); }
  return validateManifest(m);
}

/** Agrega solo proyectos que no existen en este teléfono. No actualiza los que ya existen. */
export async function planMerge(m) {
  const have = new Set((await store.all()).map((p) => p.id));
  const add = m.projects.filter((p) => !have.has(p.id));
  const existing = m.projects.filter((p) => have.has(p.id));
  return { add, existing, kept: existing.length };
}
export async function applyMerge(m) { const plan = await planMerge(m); await store.insert(plan.add); return plan; }

/** Reemplaza todo en una sola transacción; antes prepara la copia del estado actual para deshacer. */
export async function applyReplace(m) {
  const before = await buildBackup({ includeDemo: true });
  await store.replaceAll(m.projects, { metaPut: [{ key: 'antesDeRecuperar', value: { at: nowIso(), blob: new Blob([before.bytes], { type: 'application/zip' }) } }] });
}

/** Deshace «Reemplazar todo» en una sola transacción; el estado guardado se borra solo si todo sale bien. */
export async function undoReplace() {
  const snap = await store.getMeta('antesDeRecuperar');
  if (!snap) throw new Error('No hay nada que deshacer.');
  const m = await readBackup(new Uint8Array(await snap.blob.arrayBuffer()));
  await store.replaceAll(m.projects, { metaDelete: ['antesDeRecuperar'] });
}
