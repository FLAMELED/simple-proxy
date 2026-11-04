// Copia cada app a build/<app>/ junto con una copia de shared/.
// Ese contenido es exactamente el que va dentro del APK (assets/www).
// No depende de los enlaces fichero/shared y cortes/shared: siempre copia ../shared.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apps = process.argv.slice(2).length ? process.argv.slice(2) : ['fichero', 'cortes'];
for (const app of apps) {
  const src = join(root, app);
  const out = join(root, 'build', app);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(src, out, {
    recursive: true,
    filter: (p) => {
      const rel = relative(src, p).split(sep);
      return rel[0] !== 'shared' && !rel.includes('node_modules') && !rel.includes('.DS_Store');
    },
  });
  cpSync(join(root, 'shared'), join(out, 'shared'), { recursive: true, filter: (p) => !p.endsWith('.DS_Store') });
  console.log(`build/${app} listo`);
}
