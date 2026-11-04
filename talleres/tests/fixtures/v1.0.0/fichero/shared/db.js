// Envoltorio pequeño de IndexedDB. Todo se guarda en el teléfono.
// Las actualizaciones de la app suben `version` y migran en `upgrade`
// sin borrar almacenes existentes.

export function openDB(name, version, upgrade) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = (ev) => upgrade(req.result, ev.oldVersion, req.transaction);
    req.onsuccess = () => resolve(wrap(req.result));
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Cierra otras ventanas de la aplicación y vuelve a abrirla.'));
  });
}

const done = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
const txDone = (tx) => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('Operación cancelada')); });

function wrap(db) {
  return {
    raw: db,
    get: (store, key) => done(db.transaction(store).objectStore(store).get(key)),
    all: (store) => done(db.transaction(store).objectStore(store).getAll()),
    byIndex: (store, index, value) => done(db.transaction(store).objectStore(store).index(index).getAll(value)),
    async put(store, value) { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(value); await txDone(tx); return value; },
    async del(store, key) { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(key); await txDone(tx); },
    /** Ejecuta varias escrituras de forma atómica: o se guardan todas o ninguna. */
    async tx(stores, fn) {
      const tx = db.transaction(stores, 'readwrite');
      const api = Object.fromEntries(stores.map((s) => [s, tx.objectStore(s)]));
      fn(api);
      await txDone(tx);
    },
  };
}

export const uid = (prefix = '') => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Pide al navegador que no borre los datos por falta de espacio (sin efecto en algunos WebView). */
export async function askPersistence() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch {}
  return false;
}
