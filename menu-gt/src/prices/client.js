// Cliente de la consulta de precios. Solo funciona si la app se sirve con
// el servidor local (server/server.mjs). En un HTML aislado no hay consulta
// automática: el navegador no puede leer otros sitios por CORS.

export async function serverStatus() {
  if (!/^https?:$/.test(location.protocol)) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch('api/prices/status', { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return false;
    const body = await res.json();
    return body?.ok === true && body.mode === 'servidor-local';
  } catch {
    return false;
  }
}

export async function lookupProduct(url) {
  try {
    const res = await fetch('api/prices/lookup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const body = await res.json();
    return body.ok ? body : { ok: false, error: body.error ?? `Error ${res.status}` };
  } catch {
    return { ok: false, error: 'No se pudo contactar el servidor local.' };
  }
}
