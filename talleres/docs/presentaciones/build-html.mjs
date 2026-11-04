// Genera las presentaciones en HTML (un archivo independiente por taller) desde la
// misma fuente que el PowerPoint: docs/presentaciones/src/<taller>.mjs.
// Las capturas y las fuentes van incrustadas: el archivo se abre sin internet.
// Uso: node docs/presentaciones/build-html.mjs [fichero|cortes]
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const CAP = join(HERE, 'capturas');
const CACHE = join(HERE, '.cache');
const PX = 100; // 1 pulgada de la diapositiva = 100 px del escenario (1333 × 750)
const pt = (v) => `${(v * PX / 72).toFixed(1)}px`;
const inch = (v) => `${(v * PX).toFixed(1)}px`;
const PHONE_RATIO = 780 / 1688;

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ESC[c]);
const br = (s) => esc(s).replace(/\n/g, '<br>');

// ——— Recursos incrustados ———
function webp(file) {
  mkdirSync(CACHE, { recursive: true });
  const src = join(CAP, file); const out = join(CACHE, file.replace(/\.png$/, '.webp'));
  if (!existsSync(out) || statSync(out).mtimeMs < statSync(src).mtimeMs) {
    execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2],"WEBP",quality=82,method=6)', src, out]);
  }
  return `data:image/webp;base64,${readFileSync(out).toString('base64')}`;
}
const imgCache = new Map();
const img = (file) => { if (!imgCache.has(file)) imgCache.set(file, webp(file)); return imgCache.get(file); };
const font = (name) => `data:font/woff2;base64,${readFileSync(join(ROOT, 'shared', 'fonts', name)).toString('base64')}`;

// ——— Elementos ———
function box(e) { return `left:${inch(e.x)};top:${inch(e.y)};width:${inch(e.w)};${e.h ? `height:${inch(e.h)};` : ''}`; }

function listHtml(items, plain, size) {
  return `<ul class="${plain ? 'plain' : 'dots'}" style="font-size:${pt(size)}">${items.map((it) => (typeof it === 'string'
    ? `<li>${br(it)}</li>`
    : `<li class="${it.bold ? 'b' : ''}">${br(it.text)}</li>`)).join('')}</ul>`;
}

function el(e) {
  switch (e.t) {
    case 'text':
      return `<div class="el txt ${e.bold ? 'b' : ''} ${e.font === 'head' ? 'head' : ''}" style="${box(e)}font-size:${pt(e.size || 20)};text-align:${e.align || 'left'};${e.color ? `color:var(--${e.color})` : ''}">${br(e.text)}</div>`;
    case 'bullets':
      return `<div class="el" style="${box(e)}">${listHtml(e.items, e.plain, e.size || 20)}</div>`;
    case 'phone': {
      const h = e.h || 5.0; const w = h * PHONE_RATIO;
      return `<figure class="el phone" style="left:${inch(e.x)};top:${inch(e.y)};width:${inch(w)};"><img src="${img(e.file)}" alt="${esc(e.alt || e.caption || 'Captura de la aplicación')}" style="height:${inch(h)}">${e.caption ? `<figcaption>${esc(e.caption)}</figcaption>` : ''}</figure>`;
    }
    case 'image':
      return `<figure class="el shot" style="left:${inch(e.x)};top:${inch(e.y)};width:${inch(e.w)};"><img src="${img(e.file)}" alt="${esc(e.alt || e.caption || 'Captura de la aplicación')}" style="height:${inch(e.h)};object-fit:${e.crop ? 'cover' : 'contain'}">${e.caption ? `<figcaption>${esc(e.caption)}</figcaption>` : ''}</figure>`;
    case 'box': {
      const parts = [];
      if (e.label) parts.push(`<p class="lbl">${esc(e.label)}</p>`);
      if (e.head) parts.push(`<p class="bhead" style="font-size:${pt(e.headSize || 22)}">${br(e.head)}</p>`);
      if (e.text) {
        if (Array.isArray(e.text) && e.list) parts.push(listHtml(e.text, false, e.size || 17));
        else (Array.isArray(e.text) ? e.text : [e.text]).forEach((t) => parts.push(`<p style="font-size:${pt(e.size || 17)}">${br(t)}</p>`));
      }
      return `<div class="el bx tone-${e.tone || 'tint'}" style="${box(e)}">${parts.join('')}</div>`;
    }
    case 'table': {
      const total = e.colW.reduce((a, b) => a + b, 0);
      const cols = e.colW.map((w) => `<col style="width:${(w / total * 100).toFixed(2)}%">`).join('');
      const rows = e.rows.map((r, ri) => `<tr>${r.map((c) => {
        const cell = typeof c === 'object' && c !== null ? c : { text: String(c) };
        const tag = e.header !== false && ri === 0 ? 'th' : 'td';
        return `<${tag} class="${cell.bold ? 'b' : ''}" style="${cell.color ? `color:var(--${cell.color});` : ''}${cell.align ? `text-align:${cell.align}` : ''}">${br(cell.text)}</${tag}>`;
      }).join('')}</tr>`).join('');
      return `<table class="el tbl head-${e.headFill || 'accent'}" style="left:${inch(e.x)};top:${inch(e.y)};width:${inch(e.w)};font-size:${pt(e.size || 16)}"><colgroup>${cols}</colgroup>${rows}</table>`;
    }
    case 'flow': {
      const n = e.steps.length; const gap = e.gap ?? 0.35; const bw = (e.w - gap * (n - 1)) / n;
      return e.steps.map((st, i) => {
        const x = e.x + i * (bw + gap);
        const fill = st.fill || 'accent';
        const card = `<div class="el flow fill-${fill}" style="left:${inch(x)};top:${inch(e.y)};width:${inch(bw)};height:${inch(e.h)}"><p class="fn">${esc(st.n ?? i + 1)}</p><p class="fh" style="font-size:${pt(e.headSize || 19)}">${esc(st.head)}</p>${st.text ? `<p class="ft" style="font-size:${pt(e.size || 14)}">${esc(st.text)}</p>` : ''}</div>`;
        const arrow = i < n - 1 ? `<div class="el arrow" style="left:${inch(x + bw)};top:${inch(e.y + e.h / 2 - 0.25)};width:${inch(gap)};height:${inch(0.5)}" aria-hidden="true">→</div>` : '';
        return card + arrow;
      }).join('');
    }
    case 'stat':
      return `<div class="el stat" style="${box({ ...e, h: e.h || 1.9 })}"><p class="sv" style="font-size:${pt(e.size || 64)};color:var(--${e.color || 'accent'})">${esc(e.value)}</p><p class="sl">${br(e.label)}</p></div>`;
    case 'code':
      return `<pre class="el code" style="${box(e)}font-size:${pt(e.size || 14)}">${esc(e.text)}</pre>`;
    case 'rect':
      return `<div class="el rect fill-${e.fill || 'tint'} ${e.dash ? 'dash' : ''} ${e.bold ? 'b' : ''}" style="${box(e)}border-width:${(e.lw ?? 1.5) * 1.4}px;font-size:${pt(e.size || 14)}">${br(e.text || '')}</div>`;
    default: throw new Error(`Elemento desconocido: ${e.t}`);
  }
}

function notesHtml(s) {
  const n = s.notes; const mins = s.min[1] - s.min[0];
  const sec = (label, text, cls = '') => (text ? `<section class="${cls}"><h4>${label}</h4><p>${br(text)}</p></section>` : '');
  return `<p class="ntime">Minuto ${s.min[0]}–${s.min[1]} · ${mins} min · ${esc(s.blockLabel)}</p>`
    + sec('Qué decir', n.say) + sec('Qué hacer', n.do) + sec('Pregunta o actividad', n.ask) + sec('Respuesta esperada', n.answer)
    + sec('Pendiente de comprobar en un teléfono real (no presentarlo como verificado)', n.check, 'pend')
    + sec('Preparación', n.prep) + sec('Transición', n.next);
}

function slideHtml(s, i, total, def) {
  const kind = s.cover ? 'cover' : s.dark ? 'dark' : 'light';
  const head = s.cover
    ? `<p class="kick cover-kick">${esc(s.kicker || '')}</p><h1 class="ctitle">${br(s.title)}</h1>${s.subtitle ? `<p class="csub">${esc(s.subtitle)}</p>` : ''}`
    : `<p class="kick">${esc(s.blockLabel)}</p><h2 class="title">${br(s.title)}</h2>`;
  return `<section class="slide ${kind}" data-i="${i}" aria-roledescription="diapositiva" aria-label="${i + 1} de ${total}: ${esc(s.title.replace(/\n/g, ' '))}">
<div class="mins">min ${s.min[0]}–${s.min[1]}</div>${head}
${(s.elements || []).map(el).join('\n')}
${s.cover ? '' : `<p class="foot">${esc(def.footer)}</p><p class="num">${i + 1}</p>`}
<template class="notes">${notesHtml(s)}</template>
</section>`;
}

export function buildHtml(def) {
  const c = def.theme.colors;
  const slides = def.slides.map((s, i) => slideHtml(s, i, def.slides.length, def)).join('\n');
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(def.title)} · Presentación del taller</title>
<style>
@font-face{font-family:Fraunces;font-weight:700;src:url(${font('fraunces-latin-700-normal.woff2')}) format('woff2')}
@font-face{font-family:Fraunces;font-weight:900;src:url(${font('fraunces-latin-900-normal.woff2')}) format('woff2')}
@font-face{font-family:'Source Sans 3';font-weight:400;src:url(${font('source-sans-3-latin-400-normal.woff2')}) format('woff2')}
@font-face{font-family:'Source Sans 3';font-weight:600;src:url(${font('source-sans-3-latin-600-normal.woff2')}) format('woff2')}
@font-face{font-family:'Source Sans 3';font-weight:700;src:url(${font('source-sans-3-latin-700-normal.woff2')}) format('woff2')}
:root{--ink:#${c.dk1};--paper:#${c.lt1};--accent:#${c.accent1};--accent2:#${c.accent2};--light:#${c.accent3};--tint:#${c.accent4};--danger:#${c.accent5};--muted:#${c.accent6};--white:#fff;
--display:Fraunces,Georgia,serif;--text:'Source Sans 3','Segoe UI',Arial,sans-serif;--notes-h:0px;color-scheme:light}
*{box-sizing:border-box;border-radius:0!important}
html,body{margin:0;height:100%;background:#16171a;color:var(--ink);font-family:var(--text);overflow:hidden}
#viewport{position:fixed;left:0;right:0;top:0;bottom:calc(var(--notes-h) + 44px);display:flex;align-items:center;justify-content:center}
#stage{position:relative;width:1333.33px;height:750px;flex:none;transform-origin:center center}
.slide{position:absolute;inset:0;display:none;background:var(--paper);overflow:hidden;font-variant-numeric:tabular-nums}
.slide.on{display:block}
.slide.dark{background:var(--ink);color:var(--paper)}
.slide.cover{background:var(--accent);color:#fff}
.el{position:absolute;margin:0}
p{margin:0}
.kick{position:absolute;left:60px;top:32px;font-weight:700;font-size:${pt(12)};letter-spacing:.2em;text-transform:uppercase;color:var(--accent)}
.dark .kick{color:var(--light)}
.cover-kick{top:110px;font-size:${pt(16)};color:var(--light)}
.title{position:absolute;left:60px;top:66px;width:1060px;margin:0;font-family:var(--display);font-weight:700;font-size:${pt(32)};line-height:1.15;letter-spacing:-.01em}
.ctitle{position:absolute;left:60px;top:190px;width:1160px;margin:0;font-family:var(--display);font-weight:900;font-size:${pt(60)};line-height:.98;letter-spacing:-.02em}
.csub{position:absolute;left:60px;top:500px;width:1100px;font-size:${pt(22)}}
.mins{position:absolute;left:1135px;top:30px;width:138px;height:36px;display:flex;align-items:center;justify-content:center;border:1.75px solid currentColor;font-weight:700;font-size:${pt(12)}}
.foot{position:absolute;left:60px;top:702px;font-size:${pt(10)};opacity:.65}
.num{position:absolute;left:1213px;top:702px;width:60px;text-align:right;font-size:${pt(10)};opacity:.65}
.txt{line-height:1.25}.txt.b{font-weight:700}.txt.head{font-family:var(--display)}
.b{font-weight:700}
ul{margin:0;padding:0;list-style:none;line-height:1.28}
ul li{margin:0 0 .45em}
ul.dots li{position:relative;padding-left:1.05em}
ul.dots li::before{content:'';position:absolute;left:0;top:.5em;width:.42em;height:.42em;background:currentColor}
.phone,.shot{margin:0}
.phone img,.shot img{display:block;width:100%;outline:6px solid var(--ink);background:var(--ink)}
.dark .phone img,.dark .shot img{outline-color:var(--paper)}
figcaption{margin-top:9px;font-size:${pt(11)};text-align:center;line-height:1.2}
.bx{padding:16px 22px;overflow:hidden;line-height:1.28}
.bx p+p{margin-top:.35em}
.bx .lbl{font-weight:700;font-size:${pt(12)};letter-spacing:.14em;text-transform:uppercase;margin-bottom:.4em}
.bx .bhead{font-family:var(--display);font-weight:700;line-height:1.1;margin-bottom:.35em}
.bx ul{margin-top:.2em}
.tone-tint{background:var(--tint);color:var(--ink)}.tone-accent{background:var(--accent);color:#fff}.tone-dark{background:var(--ink);color:var(--paper)}.tone-light{background:var(--light);color:var(--ink)}.tone-paper{background:var(--paper);color:var(--ink)}
.dark .tone-dark{outline:2px solid var(--paper)}
.tbl{border-collapse:collapse;line-height:1.2}
.tbl th,.tbl td{border:1.4px solid var(--muted);padding:6px 9px;text-align:left;vertical-align:middle}
.tbl th{background:var(--accent);color:#fff;font-weight:700}
.light .tbl td{background:var(--paper)}
.dark .tbl td{background:var(--ink);color:var(--paper)}
.flow{border:2px solid var(--ink);padding:12px 14px;overflow:hidden;line-height:1.2}
.dark .flow{border-color:var(--paper)}
.flow .fn{font-family:var(--display);font-weight:900;font-size:${pt(26)};line-height:1}
.flow .fh{font-weight:700;margin-top:6px}.flow .ft{margin-top:4px}
.fill-accent{background:var(--accent);color:#fff}.fill-accent2{background:var(--accent2);color:#fff}.fill-light{background:var(--light);color:var(--ink)}.fill-tint{background:var(--tint);color:var(--ink)}.fill-paper{background:#fff;color:var(--ink)}
.arrow{display:flex;align-items:center;justify-content:center;font-size:${pt(22)};font-weight:700}
.stat .sv{font-family:var(--display);font-weight:900;line-height:1;letter-spacing:-.02em}
.stat .sl{margin-top:8px;font-size:${pt(16)};line-height:1.25}
.code{background:var(--ink);color:var(--paper);padding:18px 25px;font-family:ui-monospace,'Cascadia Mono',Consolas,'Courier New',monospace;line-height:1.32;white-space:pre-wrap;overflow:hidden}
.dark .code{outline:2px solid var(--paper)}
.rect{border:2px solid var(--ink);display:flex;align-items:center;justify-content:center;text-align:center;padding:2px;line-height:1.15;color:var(--ink)}
.rect.dash{border-style:dashed}
/* Barra y notas */
#bar{position:fixed;left:0;right:0;bottom:var(--notes-h);height:44px;display:flex;align-items:center;gap:6px;padding:0 10px;background:#0e0f11;color:#e8e8e8;font:600 14px var(--text);z-index:5}
#bar button{font:inherit;min-width:44px;height:34px;padding:0 10px;border:1.5px solid #6b6f78;background:#1d1f24;color:#fff;cursor:pointer}
#bar button:hover,#bar button:focus-visible{border-color:#fff;outline:none}
#bar button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent)}
#pos{min-width:64px;text-align:center}
#progress{flex:1;height:6px;background:#2a2d33;position:relative}
#progress span{position:absolute;left:0;top:0;bottom:0;background:var(--accent)}
#notes{position:fixed;left:0;right:0;bottom:0;height:var(--notes-h);overflow:auto;background:#fbfbf8;color:#16171a;padding:14px 22px 22px;font-size:16px;line-height:1.45;border-top:4px solid var(--accent);display:none}
body.show-notes #notes{display:block}
#notes h3{font:700 20px var(--display);margin:0 0 4px}
#notes .ntime{font-weight:700;color:var(--accent);margin-bottom:8px}
#notes section{margin:0 0 10px;max-width:1100px}
#notes h4{margin:0 0 2px;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:#555}
#notes .pend{border-left:6px solid #b26b00;background:#fff3dc;padding:8px 12px}
#notes .pend h4{color:#7a4b00}
#help{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:9}
#help.on{display:flex}
#help div{background:#fff;color:#111;padding:24px 30px;max-width:520px;font-size:16px;line-height:1.6;border:3px solid var(--accent)}
#help kbd{display:inline-block;min-width:28px;padding:0 6px;border:1.5px solid #333;text-align:center;font:700 14px var(--text);margin-right:6px}
body.fs #bar{opacity:0;transition:opacity .2s}body.fs #bar:hover,body.fs:not(.idle) #bar{opacity:1}
@media print{
  @page{size:13.333in 7.5in;margin:0}
  html,body{overflow:visible;height:auto;background:#fff}
  #bar,#help,#notes{display:none!important}
  #viewport{position:static;display:block}
  #stage{transform:none!important;width:13.333in;height:auto}
  .slide{display:block!important;position:relative;width:1333.33px;height:750px;break-after:page;zoom:${(13.333 * 96 / 1333.33).toFixed(4)}}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>
<div id="viewport"><div id="stage" role="region" aria-label="${esc(def.title)}">
${slides}
</div></div>
<div id="bar" role="toolbar" aria-label="Controles de la presentación">
  <button id="prev" aria-label="Anterior">←</button>
  <span id="pos" aria-live="polite"></span>
  <button id="next" aria-label="Siguiente">→</button>
  <div id="progress" aria-hidden="true"><span></span></div>
  <button id="bnotes" aria-pressed="false" title="Notas del facilitador (N)">Notas</button>
  <button id="bfs" title="Pantalla completa (F)">Pantalla completa</button>
  <button id="bhelp" title="Atajos (?)">?</button>
</div>
<aside id="notes" aria-label="Notas del facilitador"></aside>
<div id="help" role="dialog" aria-label="Atajos de teclado"><div>
  <p><strong>Atajos de teclado</strong></p>
  <p><kbd>→</kbd><kbd>Espacio</kbd> siguiente · <kbd>←</kbd> anterior</p>
  <p><kbd>Inicio</kbd> primera · <kbd>Fin</kbd> última · número + <kbd>Enter</kbd> ir a esa</p>
  <p><kbd>N</kbd> mostrar u ocultar notas del facilitador</p>
  <p><kbd>F</kbd> pantalla completa · <kbd>Esc</kbd> salir</p>
  <p><kbd>?</kbd> esta ayuda · Imprimir: una diapositiva por página</p>
  <p style="font-size:14px;color:#555">Al compartir pantalla en la videollamada, comparte solo esta pestaña con las notas ocultas, o abre una segunda copia del archivo para ver las notas.</p>
</div></div>
<script>
(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const stage = document.getElementById('stage'); const notes = document.getElementById('notes');
  const pos = document.getElementById('pos'); const prog = document.querySelector('#progress span');
  const bn = document.getElementById('bnotes'); const help = document.getElementById('help');
  let i = 0; let typed = '';
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  function fit() {
    const nh = document.body.classList.contains('show-notes') ? Math.round(innerHeight * 0.36) : 0;
    document.documentElement.style.setProperty('--notes-h', nh + 'px');
    const vw = innerWidth; const vh = innerHeight - nh - 44;
    stage.style.transform = 'scale(' + Math.min(vw / 1333.33, vh / 750) + ')';
  }
  function show(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, j) => s.classList.toggle('on', j === i));
    pos.textContent = (i + 1) + ' / ' + slides.length;
    prog.style.width = ((i + 1) / slides.length * 100) + '%';
    const t = slides[i].querySelector('template.notes');
    notes.innerHTML = '<h3>Notas · ' + slides[i].getAttribute('aria-label') + '</h3>' + t.innerHTML;
    notes.scrollTop = 0;
    // Títulos largos: bajar el tamaño hasta que entren en una línea (mínimo 26 pt).
    const t2 = slides[i].querySelector('.title');
    if (t2 && !t2.dataset.fit) { let fs = parseFloat(getComputedStyle(t2).fontSize); while (t2.offsetHeight > fs * 1.3 && fs > 36) { fs -= 1; t2.style.fontSize = fs + 'px'; } t2.dataset.fit = '1'; }
    history.replaceState(null, '', '#' + (i + 1));
  }
  function toggleNotes(force) {
    const on = force ?? !document.body.classList.contains('show-notes');
    document.body.classList.toggle('show-notes', on); bn.setAttribute('aria-pressed', on); store.set('notas', on ? '1' : '0'); fit();
  }
  function fullscreen() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
  document.addEventListener('fullscreenchange', () => document.body.classList.toggle('fs', !!document.fullscreenElement));
  document.getElementById('prev').onclick = () => show(i - 1);
  document.getElementById('next').onclick = () => show(i + 1);
  bn.onclick = () => toggleNotes();
  document.getElementById('bfs').onclick = fullscreen;
  document.getElementById('bhelp').onclick = () => help.classList.toggle('on');
  help.onclick = () => help.classList.remove('on');
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) { typed += k; return; }
    if (k === 'Enter' && typed) { show(Number(typed) - 1); typed = ''; e.preventDefault(); return; }
    typed = '';
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(k)) { show(i + 1); e.preventDefault(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { show(i - 1); e.preventDefault(); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(slides.length - 1);
    else if (k === 'n' || k === 'N') toggleNotes();
    else if (k === 'f' || k === 'F') fullscreen();
    else if (k === '?') help.classList.toggle('on');
    else if (k === 'Escape') help.classList.remove('on');
  });
  let x0 = null;
  stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => { if (x0 === null) return; const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 50) show(i + (d < 0 ? 1 : -1)); x0 = null; });
  let idle; addEventListener('mousemove', () => { document.body.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(() => document.body.classList.add('idle'), 2500); });
  addEventListener('resize', fit);
  addEventListener('hashchange', () => show((parseInt(location.hash.slice(1)) || 1) - 1));
  if (store.get('notas') === '1') toggleNotes(true);
  fit(); show((parseInt(location.hash.slice(1)) || 1) - 1);
})();
</script>
</body>
</html>`;
  const name = def.file.replace(/\.pptx$/, '.html');
  writeFileSync(join(HERE, name), html);
  return { name, size: Buffer.byteLength(html) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const n of process.argv.slice(2).length ? process.argv.slice(2) : ['fichero', 'cortes']) {
    const def = (await import(join(HERE, 'src', `${n}.mjs`))).default;
    let t = 0;
    for (const s of def.slides) { if (s.min[0] !== t) throw new Error(`${n}: «${s.title}» empieza en ${s.min[0]}, se esperaba ${t}`); t = s.min[1]; }
    if (t !== 90) throw new Error(`${n}: termina en el minuto ${t}`);
    const r = buildHtml(def);
    console.log(`${r.name} · ${def.slides.length} diapositivas · ${(r.size / 1e6).toFixed(2)} MB`);
  }
}
