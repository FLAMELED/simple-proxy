// Empaqueta la app en un único HTML (CSS, JS, fuentes e ilustraciones en línea)
// para publicarla como Artifact o abrirla sin servidor. Deriva su estructura de
// index.html para que ambas versiones no se separen. En este modo no hay consulta
// automática de precios: solo precios guardados, carga manual y ejemplos.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const b64 = async (path) => (await readFile(join(ROOT, path))).toString('base64');

// Ilustraciones como data URIs: reemplaza el módulo de rutas por uno en línea.
const { DISH_IMAGES } = await import(join(ROOT, 'src/ui/dish-images.js'));
const inlineDishes = {};
for (const [id, path] of Object.entries(DISH_IMAGES)) inlineDishes[id] = `data:image/webp;base64,${await b64(path)}`;
const dishPlugin = {
  name: 'inline-dishes',
  setup(b) {
    b.onLoad({ filter: /dish-images\.js$/ }, () => ({ contents: `export const DISH_IMAGES = ${JSON.stringify(inlineDishes)};`, loader: 'js' }));
  },
};

const js = await build({
  entryPoints: [join(ROOT, 'src/ui/app.js')], bundle: true, format: 'iife', minify: true, write: false,
  target: 'es2020', legalComments: 'none', tsconfigRaw: {}, plugins: [dishPlugin],
});

// CSS con las fuentes en línea (sin pedir nada a otros dominios).
let fonts = await readFile(join(ROOT, 'src/ui/fonts.css'), 'utf8');
for (const m of [...fonts.matchAll(/url\('\.\.\/\.\.\/(assets\/fonts\/[^']+)'\)/g)]) {
  fonts = fonts.replace(m[0], `url(data:font/woff2;base64,${await b64(m[1])})`);
}
const css = (await readFile(join(ROOT, 'src/ui/styles.css'), 'utf8')).replace(/@import url\('\.\/fonts\.css'\);/, fonts);

const index = await readFile(join(ROOT, 'index.html'), 'utf8');
const body = index
  .slice(index.indexOf('<body>') + 6, index.indexOf('</body>'))
  .replace(/<script type="module"[^>]*><\/script>/, '')
  .replace(/<noscript>.*?<\/noscript>/, '')
  .trim();
const code = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<title>Mercadito</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Menú semanal, lista de compras y presupuesto en quetzales para hogares de Guatemala.">
<style>${css}</style>
${body}
<script>${code}</script>
`;
await mkdir(join(ROOT, 'dist'), { recursive: true });
await writeFile(join(ROOT, 'dist/mercadito.html'), html);
console.log(`dist/mercadito.html · ${(html.length / 1024).toFixed(1)} KB · ${Object.keys(inlineDishes).length} ilustraciones`);
