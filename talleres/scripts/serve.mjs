// Servidor local mínimo para probar build/<app> en un navegador.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };
const BUILD = join(dirname(fileURLToPath(import.meta.url)), '..', 'build');

/** Sirve `root` (por defecto build/). Con `mounts` se sirven otras carpetas bajo un prefijo, en el mismo origen. */
export function serve(port = 0, { root = BUILD, mounts = {} } = {}) {
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    let base = root;
    for (const [prefix, dir] of Object.entries(mounts)) if (p.startsWith(prefix)) { base = dir; p = p.slice(prefix.length - 1); break; }
    const file = normalize(join(base, p));
    if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end('No encontrado'); }
  });
  return new Promise((r) => server.listen(port, '127.0.0.1', () => r(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await serve(Number(process.env.PORT) || 8080);
  console.log(`http://127.0.0.1:${s.address().port}/fichero/  ·  /cortes/`);
}
