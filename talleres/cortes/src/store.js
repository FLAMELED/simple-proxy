// Proyectos de corte guardados en el teléfono (IndexedDB).
import { openDB, uid } from '../shared/db.js';
import { nowIso } from '../shared/ui.js';

export const DB_NAME = 'mi-plan-de-cortes';
let db;
export async function open() {
  db = await openDB(DB_NAME, 1, (raw, oldVersion) => {
    if (oldVersion < 1) { raw.createObjectStore('projects', { keyPath: 'id' }); raw.createObjectStore('meta', { keyPath: 'key' }); }
    // Versiones futuras: migraciones aquí, sin borrar almacenes.
  });
  return db;
}
export async function getMeta(key, fallback = null) { const r = await db.get('meta', key); return r ? r.value : fallback; }
export const setMeta = (key, value) => db.put('meta', { key, value });
export const all = () => db.all('projects');
export const get = (id) => db.get('projects', id);
export const del = (id) => db.del('projects', id);

export function blankProject(over = {}) {
  const at = nowIso();
  return {
    id: uid('cor-'), name: 'Proyecto nuevo', notes: '', demo: false, unit: 'cm',
    material: { name: '', width: null, height: null, quantity: 1 }, kerf: null, margin: 0, minLeftover: 5,
    pieces: [newPiece()], plan: null, createdAt: at, updatedAt: at, ...over,
  };
}
export const newPiece = () => ({ id: uid('pz-'), label: '', width: null, height: null, qty: 1, rotate: true });
export async function save(p) { p.updatedAt = nowIso(); await db.put('projects', p); return p; }
export async function wipe() { await db.tx(['projects'], (s) => s.projects.clear()); }
export async function insert(list) { await db.tx(['projects'], (s) => { for (const p of list) s.projects.put(p); }); }
export const uidPiece = () => uid('pz-');
