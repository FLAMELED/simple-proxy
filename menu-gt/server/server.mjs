// Servidor local: sirve la app y expone la consulta de precios.
// Las consultas salen desde aquí (no desde el navegador) para respetar
// robots.txt, limitar la frecuencia y no exponer credenciales.
//   node server/server.mjs   →   http://localhost:5173
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES, USER_AGENT, sourceForUrl } from './sources/registry.mjs';
import { isAllowed } from './sources/robots.mjs';
import { extractProduct } from './sources/product-page.mjs';

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));
const PORT = Number(process.env.PORT ?? 5173);
const MIN_INTERVAL_MS = 3000; // como máximo una consulta cada 3 s por sitio
const TIMEOUT_MS = 15000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8',
};

const lastRequest = new Map();
const robotsCache = new Map();

async function politeFetch(url) {
  const host = new URL(url).host;
  const wait = (lastRequest.get(host) ?? 0) + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest.set(host, Date.now());
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'text/html,text/plain' }, signal: ctrl.signal, redirect: 'follow' });
  } catch (err) {
    err.timedOut = ctrl.signal.aborted;
    throw err;
  } finally {
    clearTimeout(t);
  }
}

function describeNetworkError(err, timedOut = false) {
  if (timedOut) return 'El sitio no respondió a tiempo.';
  const chain = [];
  for (let e = err; e && chain.length < 5; e = e.cause) chain.push(`${e.code ?? ''} ${e.message ?? ''}`);
  const detail = chain.join(' | ');
  if (/ENOTFOUND|EAI_AGAIN/.test(detail)) return 'No se pudo resolver el dominio desde este servidor (DNS o red restringida).';
  if (/Proxy response \((\d+)\)/.test(detail)) {
    const status = detail.match(/Proxy response \((\d+)\)/)[1];
    return `La política de red de este servidor rechazó la conexión al sitio (proxy respondió ${status}). El dominio debe estar permitido.`;
  }
  return `No se pudo conectar desde este servidor (${chain.at(-1)?.trim() || 'error de red'}).`;
}

async function robotsFor(origin) {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.at < 6 * 3600 * 1000) return cached;
  let entry;
  try {
    const res = await politeFetch(`${origin}/robots.txt`);
    if (res.status === 404) entry = { ok: true, text: '', status: 404 };
    else if (!res.ok) entry = { ok: false, error: `robots.txt respondió ${res.status}; no se consulta sin poder leerlo.` };
    else entry = { ok: true, text: await res.text(), status: res.status };
  } catch (err) {
    entry = { ok: false, error: describeNetworkError(err, err.timedOut) };
  }
  entry.at = Date.now();
  robotsCache.set(origin, entry);
  return entry;
}

async function lookup(body) {
  const { source, url, error } = sourceForUrl(body?.url ?? '');
  if (error) return { status: 400, json: { ok: false, error } };
  if (body.storeId && body.storeId !== source.storeId) {
    return { status: 400, json: { ok: false, error: `La dirección es de ${source.name}, no de la tienda elegida.` } };
  }
  const robots = await robotsFor(source.origin);
  if (!robots.ok) return { status: 502, json: { ok: false, stage: 'robots', error: robots.error } };
  if (!isAllowed(robots.text, USER_AGENT, url.pathname + url.search)) {
    return { status: 403, json: { ok: false, stage: 'robots', error: 'robots.txt del sitio no permite consultar esta página; no se consultó.' } };
  }
  let res;
  try {
    res = await politeFetch(url.href);
  } catch (err) {
    return { status: 502, json: { ok: false, stage: 'pagina', error: describeNetworkError(err, err.timedOut) } };
  }
  if (!res.ok) {
    return { status: 502, json: { ok: false, stage: 'pagina', error: `La página respondió ${res.status}. Si el sitio bloquea consultas automáticas, usa "Mi precio".` } };
  }
  const html = await res.text();
  const fetchedAt = new Date().toISOString();
  const parsed = extractProduct(html, url.href, fetchedAt);
  if (!parsed.ok) return { status: 422, json: parsed };
  return { status: 200, json: { ok: true, storeId: source.storeId, record: parsed.record } };
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 10_000) throw new Error('Solicitud demasiado grande');
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api/prices/status' && req.method === 'GET') {
      return send(res, 200, {
        ok: true,
        mode: 'servidor-local',
        sources: Object.values(SOURCES).map((s) => ({ storeId: s.storeId, name: s.name, origin: s.origin, method: 'Página pública de producto indicada por la persona (JSON-LD), con robots.txt' })),
      });
    }
    if (url.pathname === '/api/prices/lookup' && req.method === 'POST') {
      const out = await lookup(await readBody(req));
      return send(res, out.status, out.json);
    }
    // Archivos estáticos
    let path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!path.startsWith(ROOT) || path.includes('node_modules') || path.includes(`${ROOT}/server`)) return send(res, 404, 'No encontrado', 'text/plain');
    if ((await stat(path).catch(() => null))?.isDirectory()) path = join(path, 'index.html');
    const data = await readFile(path).catch(() => null);
    if (!data) return send(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
    send(res, 200, data, MIME[extname(path)] ?? 'application/octet-stream');
  } catch (err) {
    send(res, 500, { ok: false, error: err.message });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`Menú GT en http://localhost:${PORT}`));
}

export { server, lookup };
