// Empaqueta la app en un único HTML (CSS y JS en línea) para publicarla
// como Artifact o abrirla sin servidor. En ese modo no hay consulta
// automática de precios: solo carga manual y datos de ejemplo.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const js = await build({ entryPoints: ['src/ui/app.js'], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none', tsconfigRaw: {} });
const css = await readFile('src/ui/styles.css', 'utf8');
const code = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<title>Mercadito</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Menú semanal, lista de compras y presupuesto en quetzales para hogares de Guatemala.">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&display=swap">
<style>${css}</style>
<header class="app-head" id="app-head"></header>
<main id="main" tabindex="-1"></main>
<nav class="tabs" id="tabs" aria-label="Secciones"></nav>
<dialog id="sheet" aria-labelledby="sheet-title"></dialog>
<div id="toast" role="status" aria-live="polite"></div>
<script>${code}</script>
`;
await mkdir('dist', { recursive: true });
await writeFile('dist/mercadito.html', html);
console.log(`dist/mercadito.html · ${(html.length / 1024).toFixed(1)} KB`);
