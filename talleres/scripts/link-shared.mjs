// Las pruebas importan fichero/src y cortes/src, que usan ../shared/.
// Crea fichero/shared y cortes/shared como enlace a ../shared; si el sistema
// no permite enlaces (por ejemplo, Windows sin permisos), hace una copia.
import { cpSync, existsSync, lstatSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const app of ['fichero', 'cortes']) {
  const link = join(root, app, 'shared');
  if (existsSync(join(link, 'ui.js'))) continue; // enlace o copia ya en su lugar
  try { if (lstatSync(link)) rmSync(link, { recursive: true, force: true }); } catch {}
  try { symlinkSync('../shared', link, 'dir'); }
  catch { cpSync(join(root, 'shared'), link, { recursive: true }); console.log(`${app}/shared copiado (sin enlace)`); }
}
