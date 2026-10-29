// Baja la lista de páginas de producto (/p) desde los sitemaps públicos de cada
// tienda, una petición cada 3 s. Solo lee XML de sitemaps; no visita productos.
//   NODE_USE_ENV_PROXY=1 node scripts/sitemap-urls.mjs [paiz la-torre walmart]
// Resultado: data/sitemaps/<tienda>.txt (no se versiona; se regenera a pedido).
import { writeFile, mkdir } from 'node:fs/promises';
import { SOURCES } from '../server/sources/registry.mjs';

const WAIT_MS = 3000;
const UA = 'Mercadito/1.0 (planificador de compras; una peticion cada 3 s)';
let last = 0;
async function get(url) {
  const wait = last + WAIT_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
  return res.text();
}
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

const stores = process.argv.slice(2).length ? process.argv.slice(2) : ['paiz', 'la-torre', 'walmart'];
await mkdir(new URL('../data/sitemaps/', import.meta.url), { recursive: true });
for (const id of stores) {
  const origin = SOURCES[id].origin;
  const parts = locs(await get(`${origin}/sitemap.xml`)).filter((u) => /\/product-\d+\.xml$/.test(u));
  const urls = new Set();
  for (const part of parts) for (const u of locs(await get(part))) if (u.endsWith('/p')) urls.add(u);
  await writeFile(new URL(`../data/sitemaps/${id}.txt`, import.meta.url), [...urls].sort().join('\n') + '\n');
  console.log(`${id}: ${parts.length} sitemaps de producto, ${urls.size} páginas`);
}
