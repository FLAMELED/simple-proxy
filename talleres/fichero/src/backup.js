// «Guardar una copia» y «Recuperar una copia».
// La copia es un único archivo .zip con:
//   copia.json  → clientes, proyectos, fichas con todo su historial, plantillas
//   fotos/…jpg  → cada foto, con el mismo identificador que usan las fichas
import { readZip, textOf, writeZip } from '../shared/zip.js';
import { blobToBytes } from '../shared/images.js';
import { nowIso } from '../shared/ui.js';
import { BACKUP_KIND, SCHEMA_VERSION, planMerge, validateManifest, checkRelations, photoIdsOf } from './model.js';
import * as store from './store.js';

export async function buildBackup({ includeDemo = false, appVersion = '' } = {}) {
  const all = await store.everything();
  const keep = (r) => includeDemo || !r.demo;
  const sheets = all.sheets.filter(keep);
  // Sin el ejemplo, igual se incluyen el proyecto y el cliente de cada ficha o proyecto incluido
  // (por ejemplo, un proyecto real que se movió a un cliente de ejemplo): la copia nunca queda con relaciones rotas.
  const projectIds = new Set([...all.projects.filter(keep).map((p) => p.id), ...sheets.map((s) => s.projectId)]);
  const projects = all.projects.filter((p) => projectIds.has(p.id));
  const clientIds = new Set([...all.clients.filter(keep).map((c) => c.id), ...projects.map((p) => p.clientId)]);
  const clients = all.clients.filter((c) => clientIds.has(c.id));
  const sheetIds = new Set(sheets.map((s) => s.id));
  const photos = all.photos.filter((p) => sheetIds.has(p.sheetId));
  const entries = [];
  const photoMeta = [];
  for (const p of photos) {
    const file = `fotos/${p.id}.jpg`;
    entries.push({ name: file, data: await blobToBytes(p.blob) });
    photoMeta.push({ id: p.id, sheetId: p.sheetId, mime: p.mime, width: p.width, height: p.height, createdAt: p.createdAt, file });
  }
  const manifest = {
    kind: BACKUP_KIND, schema: SCHEMA_VERSION, appVersion, createdAt: nowIso(), includesDemo: includeDemo,
    clients, projects, sheets, photos: photoMeta, templates: all.templates,
  };
  entries.unshift({ name: 'copia.json', data: JSON.stringify(manifest, null, 1) });
  entries.push({ name: 'LEEME.txt', data: 'Copia de «Mi fichero de trabajos a medida».\r\nPara recuperarla: abre la app, entra en «Copias» y toca «Recuperar una copia».\r\nNo cambies el nombre de los archivos de dentro.\r\n' });
  return { bytes: writeZip(entries), counts: counts(manifest) };
}

export function counts(m) {
  return { clients: m.clients.length, projects: m.projects.length, sheets: m.sheets.length, photos: m.photos.length, versions: m.sheets.reduce((s, x) => s + x.versions.length, 0) };
}

/** Lee y comprueba una copia sin tocar nada del teléfono. */
export async function readBackup(bytes) {
  const files = await readZip(bytes);
  const json = files.get('copia.json');
  if (!json) throw new Error('Este archivo no es una copia de «Mi fichero de trabajos a medida».');
  let manifest;
  try { manifest = JSON.parse(textOf(json)); } catch { throw new Error('La copia está dañada: no se pudo leer su contenido.'); }
  validateManifest(manifest);
  const photos = manifest.photos.map((p) => {
    const data = files.get(p.file);
    return data ? { id: p.id, sheetId: p.sheetId, mime: p.mime || 'image/jpeg', width: p.width, height: p.height, createdAt: p.createdAt, blob: new Blob([data], { type: p.mime || 'image/jpeg' }) } : null;
  });
  const present = photos.filter(Boolean);
  const data = { clients: manifest.clients, projects: manifest.projects, sheets: manifest.sheets, templates: manifest.templates, photos: present };
  const relations = checkRelations(data);
  const presentIds = new Set(present.map((p) => p.id));
  let missingPhotos = 0;
  for (const sh of manifest.sheets) for (const id of photoIdsOf(sh)) if (!presentIds.has(id)) missingPhotos++;
  return { manifest, data, relations, missingPhotos, counts: counts(manifest) };
}

export async function previewMerge(parsed) {
  const local = await store.everything();
  return planMerge(local, parsed.data);
}

/**
 * «Agregar lo nuevo»: agrega registros que no existen en este teléfono, en una sola transacción.
 * No actualiza los que ya existen, aunque la copia tenga cambios más recientes.
 * Omite lo que quedaría sin su relación (ver planMerge).
 */
export async function applyMerge(parsed) {
  const plan = await previewMerge(parsed);
  await store.insertAll(Object.fromEntries(['clients', 'projects', 'sheets', 'photos', 'templates'].map((k) => [k, plan[k].add])));
  return plan;
}

/**
 * «Reemplazar todo». Primero se prepara todo (validación y copia del estado actual para
 * poder deshacer); luego, en UNA transacción, se borra, se inserta la copia y se guarda
 * el estado anterior. Si falla cualquier escritura, no cambia nada.
 */
export async function applyReplace(parsed) {
  if (parsed.relations.errors.length) throw new Error(`La copia tiene datos sin relación y no se puede usar para reemplazar: ${parsed.relations.errors[0]}`);
  const before = await buildBackup({ includeDemo: true });
  const snapshot = { key: 'antesDeRecuperar', value: { at: nowIso(), blob: new Blob([before.bytes], { type: 'application/zip' }), counts: before.counts } };
  await store.replaceAll(parsed.data, { metaPut: [snapshot] });
}

/** Vuelve al estado anterior a «Reemplazar todo», también en una sola transacción. */
export async function undoReplace() {
  const snap = await store.getMeta('antesDeRecuperar');
  if (!snap) throw new Error('No hay nada que deshacer.');
  const parsed = await readBackup(new Uint8Array(await snap.blob.arrayBuffer())); // se lee y valida antes de tocar nada
  if (parsed.relations.errors.length) throw new Error(`El estado guardado está dañado: ${parsed.relations.errors[0]}`);
  // El estado guardado se borra en la misma transacción: solo desaparece si la restauración termina bien.
  await store.replaceAll(parsed.data, { metaDelete: ['antesDeRecuperar'] });
}
