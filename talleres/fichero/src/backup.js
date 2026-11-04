// «Guardar una copia» y «Recuperar una copia».
// La copia es un único archivo .zip con:
//   copia.json  → clientes, proyectos, fichas con todo su historial, plantillas
//   fotos/…jpg  → cada foto, con el mismo identificador que usan las fichas
import { readZip, textOf, writeZip } from '../shared/zip.js';
import { blobToBytes } from '../shared/images.js';
import { nowIso } from '../shared/ui.js';
import { BACKUP_KIND, SCHEMA_VERSION, planMerge, validateManifest, photoIdsOf } from './model.js';
import * as store from './store.js';

export async function buildBackup({ includeDemo = false, appVersion = '' } = {}) {
  const all = await store.everything();
  const keep = (r) => includeDemo || !r.demo;
  const sheets = all.sheets.filter(keep);
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
    clients: all.clients.filter(keep), projects: all.projects.filter(keep), sheets, photos: photoMeta, templates: all.templates,
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
  const presentIds = new Set(present.map((p) => p.id));
  let missingPhotos = 0;
  for (const s of manifest.sheets) for (const id of photoIdsOf(s)) if (!presentIds.has(id)) missingPhotos++;
  return { manifest, data: { clients: manifest.clients, projects: manifest.projects, sheets: manifest.sheets, templates: manifest.templates, photos: present }, missingPhotos, counts: counts(manifest) };
}

export async function previewMerge(parsed) {
  const local = await store.everything();
  return planMerge(local, parsed.data);
}

/** Agrega solo lo que no existe. Nada del teléfono se modifica. */
export async function applyMerge(parsed) {
  const plan = await previewMerge(parsed);
  await store.insertAll(Object.fromEntries(Object.entries(plan).map(([k, v]) => [k, v.add])));
  return plan;
}

/** Reemplaza todo. Antes guarda en el teléfono una copia del estado actual para poder deshacer. */
export async function applyReplace(parsed) {
  const before = await buildBackup({ includeDemo: true });
  await store.setMeta('antesDeRecuperar', { at: nowIso(), blob: new Blob([before.bytes], { type: 'application/zip' }), counts: before.counts });
  await store.wipeAll();
  await store.insertAll(parsed.data);
}

export async function undoReplace() {
  const snap = await store.getMeta('antesDeRecuperar');
  if (!snap) throw new Error('No hay nada que deshacer.');
  const parsed = await readBackup(new Uint8Array(await snap.blob.arrayBuffer()));
  await store.wipeAll();
  await store.insertAll(parsed.data);
  await store.setMeta('antesDeRecuperar', null);
}
