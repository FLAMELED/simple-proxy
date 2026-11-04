// Acceso a los datos guardados en el teléfono (IndexedDB).
import { openDB, uid } from '../shared/db.js';
import { nowIso } from '../shared/ui.js';
import { BUILTIN_TEMPLATES } from './templates.js';
import { clone, commitVersion, dataFromTemplate, photoIdsOf } from './model.js';

export const DB_NAME = 'mi-fichero';
const DB_VERSION = 1;
const STORES = ['clients', 'projects', 'sheets', 'photos', 'templates', 'meta'];

let db;
export async function open() {
  db = await openDB(DB_NAME, DB_VERSION, (raw, oldVersion) => {
    if (oldVersion < 1) {
      raw.createObjectStore('clients', { keyPath: 'id' });
      raw.createObjectStore('projects', { keyPath: 'id' }).createIndex('clientId', 'clientId');
      raw.createObjectStore('sheets', { keyPath: 'id' }).createIndex('projectId', 'projectId');
      raw.createObjectStore('photos', { keyPath: 'id' }).createIndex('sheetId', 'sheetId');
      raw.createObjectStore('templates', { keyPath: 'id' });
      raw.createObjectStore('meta', { keyPath: 'key' });
    }
    // Versiones futuras: agregar aquí migraciones (if (oldVersion < 2) …) sin borrar almacenes.
  });
  // Plantillas iniciales solo la primera vez (no pisar las que la persona ya adaptó).
  const seeded = await db.get('meta', 'templatesSeeded');
  if (!seeded) {
    await db.tx(['templates', 'meta'], (s) => {
      for (const t of BUILTIN_TEMPLATES) s.templates.put(clone(t));
      s.meta.put({ key: 'templatesSeeded', value: nowIso() });
    });
  }
  return db;
}
export const raw = () => db;

// ——— Ajustes ———
export async function getMeta(key, fallback = null) { const r = await db.get('meta', key); return r ? r.value : fallback; }
export const setMeta = (key, value) => db.put('meta', { key, value });

// ——— Lecturas ———
export const allClients = () => db.all('clients');
export const allProjects = () => db.all('projects');
export const allSheets = () => db.all('sheets');
export const allTemplates = () => db.all('templates');
export const getClient = (id) => db.get('clients', id);
export const getProject = (id) => db.get('projects', id);
export const getSheet = (id) => db.get('sheets', id);
export const getTemplate = (id) => db.get('templates', id);
export const getPhoto = (id) => db.get('photos', id);
export const projectsOf = (clientId) => db.byIndex('projects', 'clientId', clientId);
export const sheetsOf = (projectId) => db.byIndex('sheets', 'projectId', projectId);

// ——— Clientes y proyectos ———
export async function saveClient(c) {
  const at = nowIso();
  const rec = { id: c.id || uid('cli-'), name: (c.name || '').trim(), phone: (c.phone || '').trim(), notes: c.notes || '', demo: !!c.demo, createdAt: c.createdAt || at, updatedAt: at };
  return db.put('clients', rec);
}
export async function saveProject(p) {
  const at = nowIso();
  const rec = { id: p.id || uid('pro-'), clientId: p.clientId, name: (p.name || '').trim(), place: (p.place || '').trim(), notes: p.notes || '', status: p.status || 'abierto', demo: !!p.demo, createdAt: p.createdAt || at, updatedAt: at };
  return db.put('projects', rec);
}
export async function touchProject(id) { const p = await getProject(id); if (p) { p.updatedAt = nowIso(); await db.put('projects', p); } }

// ——— Fichas ———
export async function createSheet({ projectId, title, template, demo }) {
  const at = nowIso();
  const sheet = { id: uid('fic-'), projectId, title: title.trim(), templateId: template?.id || null, templateName: template?.name || 'Ficha libre', demo: !!demo, createdAt: at, updatedAt: at, versions: [], draft: dataFromTemplate(template), draftAt: at };
  await db.put('sheets', sheet);
  await touchProject(projectId);
  return sheet;
}

/** Guarda el borrador (se llama mientras la persona escribe). */
export async function saveDraft(sheetId, data) {
  const s = await getSheet(sheetId);
  s.draft = clone(data);
  s.draftAt = nowIso();
  await db.put('sheets', s);
  return s.draftAt;
}

export async function discardDraft(sheetId) {
  const s = await getSheet(sheetId);
  const referenced = new Set(); for (const v of s.versions) for (const p of v.data.photos) referenced.add(p.id);
  const orphan = (s.draft?.photos || []).filter((p) => !referenced.has(p.id)).map((p) => p.id);
  s.draft = null; s.draftAt = null;
  await db.tx(['sheets', 'photos'], (st) => { st.sheets.put(s); for (const id of orphan) st.photos.delete(id); });
  return s;
}

/** Convierte el borrador en una versión nueva. Devuelve la ficha, o null si no había cambios. */
export async function commitSheet(sheetId, data, note) {
  const s = await getSheet(sheetId);
  const ok = commitVersion(s, data, note, nowIso());
  if (!ok) return null;
  await db.put('sheets', s);
  await touchProject(s.projectId);
  return s;
}

export async function renameSheet(sheetId, title) { const s = await getSheet(sheetId); s.title = title.trim(); s.updatedAt = nowIso(); await db.put('sheets', s); }

export async function addPhoto(sheetId, { blob, width, height, mime }) {
  const rec = { id: uid('foto-'), sheetId, blob, mime, width, height, createdAt: nowIso() };
  await db.put('photos', rec);
  return rec;
}

export async function deleteSheet(id) {
  const s = await getSheet(id);
  const photos = await db.byIndex('photos', 'sheetId', id);
  await db.tx(['sheets', 'photos'], (st) => { st.sheets.delete(id); for (const p of photos) st.photos.delete(p.id); });
  if (s) await touchProject(s.projectId);
}
export async function deleteProject(id) { for (const s of await sheetsOf(id)) await deleteSheet(s.id); await db.del('projects', id); }
export async function deleteClient(id) { for (const p of await projectsOf(id)) await deleteProject(p.id); await db.del('clients', id); }

// ——— Plantillas ———
export async function saveTemplate(t) { t.updatedAt = nowIso(); if (!t.id) t.id = uid('tpl-'); return db.put('templates', t); }
export const deleteTemplate = (id) => db.del('templates', id);

// ——— Todo junto (copias) ———
export async function everything() {
  const [clients, projects, sheets, photos, templates] = await Promise.all(['clients', 'projects', 'sheets', 'photos', 'templates'].map((s) => db.all(s)));
  return { clients, projects, sheets, photos, templates };
}

export async function wipeAll() {
  await db.tx(['clients', 'projects', 'sheets', 'photos', 'templates'], (s) => { for (const k of Object.keys(s)) s[k].clear(); });
}

export async function insertAll(data) {
  await db.tx(['clients', 'projects', 'sheets', 'photos', 'templates'], (s) => {
    for (const k of ['clients', 'projects', 'sheets', 'photos', 'templates']) for (const r of data[k]) s[k].put(r);
  });
}

/** Borra solo los datos de ejemplo. Los trabajos reales no se tocan. */
export async function removeDemo() {
  const { clients, projects, sheets } = await everything();
  for (const s of sheets.filter((x) => x.demo)) await deleteSheet(s.id);
  for (const p of projects.filter((x) => x.demo)) await db.del('projects', p.id);
  for (const c of clients.filter((x) => x.demo)) await db.del('clients', c.id);
}

export { photoIdsOf, STORES };
