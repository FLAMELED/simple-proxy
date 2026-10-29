// Revisión de integridad de los datos y del código, sin red. Falla (código 1) si
// algo está roto; avisa sin fallar cuando la captura de precios envejece.
//   npm run check
import { readdir, readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INGREDIENTS } from '../src/data/ingredients.js';
import { RECIPES, EQUIPMENT } from '../src/data/recipes.js';
import { ALL_STORES as STORES } from '../src/data/stores.js';
import { DISH_IMAGES } from '../src/ui/dish-images.js';
import { toBase } from '../src/engine/units.js';
import { PRICE_MAX_AGE_DAYS, priceAge } from '../src/engine/budget.js';
import REAL from '../src/data/real-prices.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);

// 1. Recetas: ingredientes conocidos, unidades convertibles, equipo válido, sin ids repetidos
const ids = new Set();
const equipment = new Set(EQUIPMENT.map((e) => e.id ?? e));
for (const r of RECIPES) {
  if (ids.has(r.id)) fail(`receta repetida: ${r.id}`);
  ids.add(r.id);
  if (!(r.yield > 0)) fail(`${r.id}: rinde ${r.yield}`);
  for (const e of r.equipment) if (!equipment.has(e)) fail(`${r.id}: equipo desconocido "${e}"`);
  for (const l of r.ingredients) {
    const ing = INGREDIENTS[l.ing];
    if (!ing) { fail(`${r.id}: ingrediente desconocido "${l.ing}"`); continue; }
    try { toBase(l.qty, l.unit, ing); } catch (err) { fail(`${r.id}: ${l.qty} ${l.unit} de ${l.ing} no se convierte (${err.message})`); }
  }
  if (!DISH_IMAGES[r.id]) warnings.push(`${r.id}: sin ilustración`);
}

// 2. Ilustraciones: cada ruta existe
for (const [id, path] of Object.entries(DISH_IMAGES)) {
  if (!ids.has(id)) fail(`ilustración de una receta que no existe: ${id}`);
  await access(join(ROOT, path)).catch(() => fail(`falta el archivo ${path}`));
}

// 3. Mapa de productos: tiendas e ingredientes conocidos
const urls = JSON.parse(await readFile(join(ROOT, 'src/data/product-urls.json'), 'utf8'));
const storeIds = new Set(STORES.map((s) => s.id));
for (const [store, map] of Object.entries(urls)) {
  if (store.startsWith('_')) continue;
  if (!storeIds.has(store)) fail(`product-urls: tienda desconocida "${store}"`);
  for (const ing of Object.keys(map)) if (!INGREDIENTS[ing]) fail(`product-urls/${store}: ingrediente desconocido "${ing}"`);
}

// 4. Precios reales: cada oferta tiene origen verificable y montos en centavos enteros
const hosts = Object.fromEntries(STORES.filter((s) => s.site).map((s) => [s.id, new URL(s.site).host]));
for (const o of REAL.offers) {
  const where = `real-prices/${o.id}`;
  if (!INGREDIENTS[o.ingredientId]) fail(`${where}: ingrediente desconocido`);
  if (!Number.isInteger(o.priceCents) || o.priceCents <= 0) fail(`${where}: precio ${o.priceCents} no es un entero positivo de centavos`);
  if (o.status !== 'guardado') fail(`${where}: estado "${o.status}" (debe ser "guardado")`);
  if (Number.isNaN(Date.parse(o.fetchedAt))) fail(`${where}: fecha inválida`);
  if (!o.sourceUrl || new URL(o.sourceUrl).host !== hosts[o.storeId]) fail(`${where}: la URL no es del sitio de ${o.storeId}`);
  try { toBase(o.packQty, o.packUnit, INGREDIENTS[o.ingredientId]); } catch { fail(`${where}: ${o.packQty} ${o.packUnit} no se convierte`); }
}
const age = priceAge({ status: 'guardado', fetchedAt: REAL.finished });
if (age?.stale) warnings.push(`la captura de precios tiene ${age.days} días (máximo ${PRICE_MAX_AGE_DAYS.guardado}); vuelve a capturar con scripts/snapshot-prices.mjs`);

// 5. Sintaxis de todo el código propio
async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.impeccable', 'assets', 'data'].includes(e.name) || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(m?js)$/.test(e.name)) yield p;
  }
}
let files = 0;
for await (const f of walk(ROOT)) {
  files++;
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (err) { fail(`sintaxis: ${f.slice(ROOT.length + 1)}: ${String(err.stderr).split('\n').find((l) => l.includes('Error')) ?? ''}`); }
}

for (const w of warnings) console.log(`aviso · ${w}`);
for (const e of errors) console.log(`ERROR · ${e}`);
console.log(`\n${RECIPES.length} recetas, ${Object.keys(INGREDIENTS).length} ingredientes, ${REAL.offers.length} precios reales, ${files} archivos de código · ${errors.length} errores, ${warnings.length} avisos`);
process.exit(errors.length ? 1 : 0);
