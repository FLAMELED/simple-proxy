// Paleta de la serie: lectura, validación de contraste (WCAG 2.x) y generación de CSS.
// La fuente única es talleres-finanzas/paleta.json.
import { readFileSync } from 'node:fs';

export function cargarPaleta(ruta) {
  return JSON.parse(readFileSync(ruta, 'utf8'));
}

function luminancia(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// [texto o figura, fondo, mínimo, uso]. 7:1 en textos principales porque el proyector baja el contraste.
export const REGLAS = [
  ['tinta', 'papel', 7, 'Texto principal'],
  ['tinta-2', 'papel', 4.5, 'Texto secundario'],
  ['tinta', 'papel-2', 7, 'Texto en hojas y tablas'],
  ['tinta-2', 'papel-2', 4.5, 'Texto secundario en hojas'],
  ['papel', 'tinta', 7, 'Botón principal (invertido)'],
  ['falta', 'papel', 4.5, 'Estado: falta'],
  ['falta', 'papel-2', 4.5, 'Estado: falta, en hoja'],
  ['cuadra', 'papel', 4.5, 'Estado: cuadra / alcanza'],
  ['cuadra', 'papel-2', 4.5, 'Estado: cuadra, en hoja'],
  ['sobra', 'papel', 4.5, 'Estado: sobra / bajo el colchón'],
  ['sobra', 'papel-2', 4.5, 'Estado: sobra, en hoja'],
  ['campo-tinta', 'campo', 7, 'Texto sobre el color del taller'],
  ['campo-tinta-2', 'campo', 4.5, 'Texto secundario sobre el color'],
  ['acento', 'papel', 4.5, 'Enlaces y anillo de foco'],
  ['acento', 'papel-2', 4.5, 'Enlaces en hojas'],
  ['tinta', 'campo-suave', 7, 'Texto sobre resalte suave'],
  ['campo-fuerte-tinta', 'campo-fuerte', 4.5, 'Etiqueta sobre relleno de gráfico'],
];

export function validar(P) {
  const filas = [];
  for (const modo of ['claro', 'noche']) {
    for (const [t, fam] of Object.entries(P.talleres)) {
      const c = { ...P.comun[modo], ...fam[modo] };
      for (const [fg, bg, min, uso] of REGLAS) {
        if (!c[fg] || !c[bg]) throw new Error(`Paleta: falta «${!c[fg] ? fg : bg}» en el taller ${t} (${modo})`);
        const v = contraste(c[fg], c[bg]);
        filas.push({ modo, taller: t, fg, bg, min, uso, v, ok: v >= min, cfg: c[fg], cbg: c[bg] });
      }
    }
  }
  const malas = filas.filter((f) => !f.ok);
  if (malas.length) throw new Error('Paleta: contrastes insuficientes\n' + malas.map((f) => `  ${f.modo} ${f.taller} ${f.fg} sobre ${f.bg}: ${f.v.toFixed(2)} (mínimo ${f.min})`).join('\n'));
  return filas;
}

const vars = (o) => Object.entries(o).filter(([, v]) => typeof v === 'string' && v.startsWith('#')).map(([k, v]) => `--${k}: ${v};`).join(' ');

// CSS para una presentación o guía: neutros y estados comunes + la familia del taller.
export function cssPaleta(P, taller) {
  const fam = P.talleres[taller];
  if (!fam) throw new Error(`Paleta: no existe el taller ${taller}`);
  const bloque = (modo) => {
    const c = P.comun[modo];
    // Dentro de una hoja blanca sobre un campo de color se recuperan los neutros.
    return `${vars(c)} --regla: ${c.tinta}; --hoja-tinta-2: ${c['tinta-2']}; --hoja-regla-suave: ${c['regla-suave']}; ${vars(fam[modo])}`;
  };
  return `/* Paleta generada desde paleta.json · taller ${taller} (${fam.color}) */
:root { ${bloque('claro')} color-scheme: light; }
:root[data-tema="noche"] { ${bloque('noche')} color-scheme: dark; }
@media print { :root, :root[data-tema="noche"] { ${bloque('claro')} color-scheme: light; } }`;
}

// Hoja de referencia visual de la paleta (paleta.html).
const ROLES = {
  papel: 'Fondo de las pantallas', 'papel-2': 'Hojas, tablas y campos', tinta: 'Texto principal, filetes y botones', 'tinta-2': 'Texto secundario',
  'regla-suave': 'Filetes finos y divisiones', falta: 'Falta dinero · error', cuadra: 'Cuadra · alcanza · correcto', sobra: 'Sobra · bajo el colchón · atención',
  campo: 'Color del taller: portada, preguntas y resaltes grandes', 'campo-tinta': 'Texto sobre el color del taller', 'campo-tinta-2': 'Texto secundario sobre el color',
  'campo-regla': 'Filetes sobre el color', 'campo-fuerte': 'Relleno de gráficos (siempre con contorno de tinta)', 'campo-fuerte-tinta': 'Etiqueta sobre ese relleno',
  'campo-suave': 'Resalte suave sobre papel (filas, celdas)', acento: 'Enlaces y anillo de foco',
};
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const claroSobre = (hex) => luminancia(hex) < 0.18;
function muestras(obj) {
  return Object.entries(obj).filter(([, v]) => typeof v === 'string' && v.startsWith('#')).map(([k, v]) =>
    `<div class="m"><span class="chip" style="background:${v};color:${claroSobre(v) ? '#fff' : '#000'}">${v}</span><b>--${k}</b><small>${esc(ROLES[k] || '')}</small></div>`).join('');
}
function maqueta(P, t, modo) {
  const c = { ...P.comun[modo], ...P.talleres[t][modo] };
  return `<div class="maqueta" style="background:${c.papel};color:${c.tinta}">
    <div class="mq-campo" style="background:${c.campo};color:${c['campo-tinta']}"><span style="color:${c['campo-tinta-2']}">${t} · ${esc(P.talleres[t].etapa)}</span><strong>${esc(P.talleres[t].nombre)}</strong></div>
    <div class="mq-cuerpo">
      <p style="color:${c['tinta-2']}">Texto secundario · <a style="color:${c.acento}">enlace</a></p>
      <div class="mq-barras">${[['70%', c['campo-fuerte']], ['45%', c.campo], ['85%', c.tinta]].map(([w, f]) => `<i style="width:${w};background:${f};border-color:${c.tinta}"></i>`).join('')}</div>
      <p class="mq-estados"><span style="color:${c.falta}">− Falta Q25.00</span><span style="color:${c.cuadra}">✓ Cuadra</span><span style="color:${c.sobra}">+ Sobra Q2.00</span></p>
      <p class="mq-hoja" style="background:${c['papel-2']};border-color:${c['regla-suave']}"><span style="background:${c['campo-suave']}">resalte suave</span> <span style="background:${c.tinta};color:${c.papel}">&nbsp;Botón&nbsp;</span></p>
    </div></div>`;
}
export function htmlReferencia(P, filas, fuentes) {
  const talleres = Object.keys(P.talleres);
  const tabla = filas.map((f) => `<tr><td>${f.modo}</td><td>${f.taller}</td><td>${esc(f.uso)}</td><td><span class="par" style="background:${f.cbg};color:${f.cfg}">Aa ${f.fg} / ${f.bg}</span></td><td class="n">${f.v.toFixed(2)}:1</td><td class="n">${f.min}:1</td><td>${f.ok ? '✓ cumple' : '✗ no cumple'}</td></tr>`).join('');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Paleta de la serie · Finanzas del negocio con IA</title>
<style>${fuentes}
*{box-sizing:border-box}body{margin:0;background:#f6f4ef;color:#1b1916;font:16px/1.5 "Texto",system-ui,sans-serif;font-variant-numeric:tabular-nums}
main{max-width:76rem;margin:0 auto;padding:2rem 1.25rem 4rem}h1,h2{font-family:"Titular",Georgia,serif;font-weight:800;font-stretch:68%;line-height:1;margin:0}
h1{font-size:clamp(2.4rem,6vw,4rem)}h2{font-size:2rem;margin:3rem 0 1rem;border-bottom:3px solid #1b1916;padding-bottom:.3rem}h3{margin:1.4rem 0 .5rem;font-size:1.05rem}
p{max-width:70ch}.reglas{padding-left:1.2rem}.reglas li+li{margin-top:.35rem}
.franja{display:grid;grid-template-columns:repeat(4,1fr);height:5rem;margin:1.5rem 0;border:2px solid #1b1916}.franja span{display:flex;align-items:end;padding:.5rem;font-weight:800}
.m{display:grid;grid-template-columns:6.2rem 1fr;grid-template-rows:auto auto;column-gap:.7rem;align-items:center;padding:.35rem 0;border-bottom:1px solid #cdc7bc}
.m .chip{grid-row:span 2;height:2.6rem;display:grid;place-items:center;font:700 .8rem "Cifras",monospace;border:1.5px solid #1b1916}.m b{font:700 .9rem "Cifras",monospace}.m small{color:#4d4943}
.modos{display:grid;grid-template-columns:1fr 1fr;gap:2rem}.modos h3{margin-top:0}
.maqueta{border:2px solid #1b1916;margin-bottom:1rem}.mq-campo{padding:1rem 1.1rem;display:grid;gap:.2rem}.mq-campo span{font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.78rem}
.mq-campo strong{font-family:"Titular",serif;font-weight:900;font-stretch:65%;font-size:2rem;line-height:1}.mq-cuerpo{padding:.8rem 1.1rem}
.mq-barras{display:grid;gap:.3rem;margin:.6rem 0}.mq-barras i{display:block;height:.9rem;border:1.5px solid}.mq-estados{display:flex;gap:1.2rem;font-weight:800}
.mq-hoja{border:1.5px solid;padding:.4rem .6rem}.mq-hoja span{padding:.1rem .3rem}
table{border-collapse:collapse;width:100%;font-size:.9rem}td,th{text-align:left;padding:.3rem .5rem;border-bottom:1px solid #cdc7bc}th{border-bottom:2px solid #1b1916;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em}
td.n{text-align:right;font-family:"Cifras",monospace}.par{display:inline-block;padding:.1rem .45rem;border:1px solid #cdc7bc;font-weight:700}
@media (max-width:760px){.modos,.franja{grid-template-columns:1fr}.franja{height:auto}.franja span{height:3rem}table{display:block;overflow-x:auto}}
</style></head><body><main>
<h1>Paleta de la serie</h1>
<p>Finanzas del negocio con IA · cuatro talleres. Cada taller tiene su color (tomado del afiche de la serie) y comparte con los demás los neutros, los colores de estado y las reglas de uso. Esta hoja se genera desde <code>paleta.json</code>; el armado se detiene si algún contraste no cumple.</p>
<div class="franja">${talleres.map((t) => `<span style="background:${P.talleres[t].claro.campo};color:${P.talleres[t].claro['campo-tinta']}">${t} · ${esc(P.talleres[t].color)}</span>`).join('')}</div>
<h2>Reglas de uso</h2>
<ul class="reglas">
<li><b>Un solo color por taller.</b> El color del taller ocupa campos grandes (portada, preguntas, rutina) y resaltes. No se mezcla con el color de otro taller en la misma presentación.</li>
<li><b>Neutros comunes.</b> Papel cálido y tinta casi negra, iguales en toda la serie; la navegación usa solo neutros y el color del taller.</li>
<li><b>Contraste para proyector.</b> Texto principal ≥ 7:1 (WCAG AAA) sobre papel y sobre el color del taller; texto secundario, estados y enlaces ≥ 4.5:1 (AA).</li>
<li><b>Los estados no dependen del color.</b> Falta, cuadra y sobra llevan siempre signo o símbolo y texto (− Falta, ✓ Cuadra, + Sobra).</li>
<li><b>Gráficos.</b> Serie principal en tinta sólida; segunda serie en el color del taller; tercera en el tono fuerte; pendiente o crédito con trama; negativo en el color de «falta». Todo relleno lleva contorno de tinta para separarse del papel.</li>
<li><b>Modo nocturno.</b> Mismos papeles de cada token, con valores propios; el color del taller se vuelve un tono profundo con texto claro.</li>
<li><b>Impresión.</b> Siempre en modo claro, sobre papel blanco.</li>
</ul>
<h2>Neutros y estados comunes</h2>
<div class="modos"><div><h3>Claro</h3>${muestras(P.comun.claro)}</div><div><h3>Nocturno</h3>${muestras(P.comun.noche)}</div></div>
${talleres.map((t) => `<h2>${t} · ${esc(P.talleres[t].nombre)}</h2><p>${esc(P.talleres[t].etapa)} · ${esc(P.talleres[t].color)}</p>
<div class="modos"><div><h3>Claro</h3>${maqueta(P, t, 'claro')}${muestras(P.talleres[t].claro)}</div><div><h3>Nocturno</h3>${maqueta(P, t, 'noche')}${muestras(P.talleres[t].noche)}</div></div>`).join('')}
<h2>Contrastes comprobados</h2>
<p>Relación de contraste WCAG 2.x calculada para cada combinación que usan las pantallas.</p>
<table><thead><tr><th>Modo</th><th>Taller</th><th>Uso</th><th>Muestra</th><th>Contraste</th><th>Mínimo</th><th></th></tr></thead><tbody>${tabla}</tbody></table>
</main></body></html>`;
}
