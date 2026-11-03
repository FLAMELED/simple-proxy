// Genera los HTML autocontenidos de los talleres.
// Uso: node talleres-finanzas/scripts/build.mjs
//
// Cada fuente en src/<taller>/*.html puede incluir:
//   /*@fuentes*/                -> @font-face con las fuentes en base64 (funcionan sin internet)
//   /*@incluir:comun/archivo*/  -> contenido de src/comun/archivo
// La salida va a <taller>/<archivo>.html. No edites la salida: edita src/ y vuelve a construir.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarPaleta, validar, cssPaleta, htmlReferencia } from './paleta.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(raiz, 'src');

const b64 = (archivo) => readFileSync(join(raiz, 'fuentes', archivo)).toString('base64');
const cara = (familia, archivo, estilo, peso, ancho) => `@font-face{font-family:"${familia}";src:url(data:font/woff2;base64,${b64(archivo)}) format("woff2");font-style:${estilo};font-weight:${peso};${ancho ? `font-stretch:${ancho};` : ''}font-display:block;}`;

const fuentes = [
  cara('Titular', 'noto-serif-display-latin-wdth-normal.woff2', 'normal', '100 900', '62.5% 100%'),
  cara('Titular', 'noto-serif-display-latin-wdth-italic.woff2', 'italic', '100 900', '62.5% 100%'),
  cara('Texto', 'atkinson-hyperlegible-next-latin-wght-normal.woff2', 'normal', '200 800'),
  cara('Texto', 'atkinson-hyperlegible-next-latin-wght-italic.woff2', 'italic', '200 800'),
  cara('Cifras', 'atkinson-hyperlegible-mono-latin-wght-normal.woff2', 'normal', '200 800'),
].join('\n');

const paleta = cargarPaleta(join(raiz, 'paleta.json'));
const contrastes = validar(paleta); // se detiene si algún contraste no cumple

function expandir(texto, taller) {
  return texto
    .replace('/*@fuentes*/', () => fuentes)
    .replace('/*@paleta*/', () => cssPaleta(paleta, taller))
    .replace(/\/\*@incluir:([\w./-]+)\*\//g, (_, ruta) => expandir(readFileSync(join(src, ruta), 'utf8'), taller));
}

let total = 0;
for (const taller of readdirSync(src)) {
  if (taller === 'comun' || !statSync(join(src, taller)).isDirectory()) continue;
  for (const archivo of readdirSync(join(src, taller)).filter((a) => a.endsWith('.html'))) {
    mkdirSync(join(raiz, taller), { recursive: true });
    const salida = join(raiz, taller, archivo);
    const html = expandir(readFileSync(join(src, taller, archivo), 'utf8'), taller.slice(0, 2));
    if (html.includes('/*@')) throw new Error(`Quedó una inclusión sin resolver en ${archivo}`);
    writeFileSync(salida, html);
    total++;
    console.log(`✓ ${taller}/${archivo}  ${(html.length / 1024).toFixed(0)} KB`);
  }
}
if (!total) throw new Error('No se generó ningún archivo');
writeFileSync(join(raiz, 'paleta.html'), htmlReferencia(paleta, contrastes, fuentes));
console.log(`✓ paleta.html  ${contrastes.length} contrastes comprobados`);
