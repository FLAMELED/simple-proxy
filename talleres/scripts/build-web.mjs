// Copia cada app con su carpeta shared/ (resolviendo el enlace) a build/<app>/.
// Ese contenido es exactamente el que va dentro del APK (assets/www).
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apps = process.argv.slice(2).length ? process.argv.slice(2) : ['fichero', 'cortes'];
for (const app of apps) {
  const out = join(root, 'build', app);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(root, app), out, { recursive: true, dereference: true, filter: (src) => !/\/(node_modules|\.DS_Store)/.test(src) && !src.endsWith('/LICENSE-Fraunces.txt.bak') });
  console.log(`build/${app} listo`);
}
