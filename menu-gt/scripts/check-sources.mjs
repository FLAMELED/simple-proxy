// Comprueba en vivo si el servidor puede leer robots.txt y una página de
// producto de cada supermercado. Imprime el resultado sin inventar datos.
//   NODE_USE_ENV_PROXY=1 node scripts/check-sources.mjs [url-de-producto ...]
import { lookup } from '../server/server.mjs';
import { SOURCES } from '../server/sources/registry.mjs';

const urls = process.argv.slice(2);
const targets = urls.length ? urls : Object.values(SOURCES).map((s) => `${s.origin}/`);
console.log(`Consulta: ${new Date().toISOString()}`);
for (const url of targets) {
  const out = await lookup({ url });
  console.log(`${url}\n  HTTP ${out.status} → ${JSON.stringify(out.json)}`);
}
