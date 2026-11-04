// Genera las dos presentaciones (PowerPoint editable) y el guion del facilitador
// desde una sola fuente: docs/presentaciones/src/<taller>.mjs.
// Uso: PPTXGENJS=/ruta/a/node_modules/pptxgenjs node docs/presentaciones/build-decks.mjs
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
function load(name) {
  const tries = [process.env[name.toUpperCase().replace(/[^A-Z]/g, '')], name, `${execSync('npm root -g', { encoding: 'utf8' }).trim()}/${name}`].filter(Boolean);
  for (const t of tries) { try { return require(t); } catch {} }
  throw new Error(`No se encontró ${name}. Instálalo (npm install ${name}) o indica su ruta en la variable ${name.toUpperCase()}.`);
}
const pptxgen = load('pptxgenjs');
const applyThemePath = process.env.APPLY_THEME;

const W = 13.333; const H = 7.5; const M = 0.6;
const CAP = join(HERE, 'capturas');
const PHONE_RATIO = 780 / 1688;

export async function buildDeck(def) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'Talleres «Del taller a tu teléfono»';
  pres.title = def.title;
  pres.theme = { headFontFace: def.theme.headFontFace, bodyFontFace: def.theme.bodyFontFace };
  const C = pres.SchemeColor;
  const col = (k) => ({ ink: C.text1, paper: C.background1, accent: C.accent1, accent2: C.accent2, light: C.accent3, tint: C.accent4, danger: C.accent5, muted: C.accent6, white: C.background1 }[k] || k);

  // ——— Diseños (layouts) ———
  pres.defineSlideMaster({
    title: 'PORTADA', background: { color: C.accent1 },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: M, y: 2.0, w: 11.6, h: 2.6, fontFace: def.theme.headFontFace, fontSize: 54, bold: true, color: C.background1, align: 'left', valign: 'top', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: M, y: 4.9, w: 11.6, h: 1.4, fontSize: 22, color: C.background1, align: 'left', valign: 'top', margin: 0 }, text: '' } },
    ],
  });
  const contentLayout = (name, bg, fg) => pres.defineSlideMaster({
    title: name, background: { color: bg },
    margin: [0.5, 0.6, 0.6, 0.6],
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.72, w: 10.6, h: 1.0, fontFace: def.theme.headFontFace, fontSize: 34, bold: true, color: fg, align: 'left', valign: 'top', margin: 0, fit: 'shrink' }, text: '' } },
      { text: { text: def.footer, options: { x: M, y: 7.02, w: 8, h: 0.3, fontSize: 10, color: fg, margin: 0, transparency: 35 } } },
    ],
    slideNumber: { x: 12.2, y: 7.02, w: 0.6, h: 0.3, fontSize: 10, color: fg, align: 'right' },
  });
  contentLayout('CONTENIDO', C.background1, C.text1);
  contentLayout('OSCURO', C.text1, C.background1);

  let section = null;
  for (const s of def.slides) {
    if (s.block !== section) { section = s.block; pres.addSection({ title: section }); }
    const layout = s.cover ? 'PORTADA' : s.dark ? 'OSCURO' : 'CONTENIDO';
    const slide = pres.addSlide({ masterName: layout, sectionTitle: section });
    const fg = s.cover || s.dark ? 'paper' : 'ink';
    if (s.cover) {
      slide.addText(s.title, { placeholder: 'title' });
      if (s.subtitle) slide.addText(s.subtitle, { placeholder: 'body' });
      if (s.kicker) slide.addText(s.kicker, { x: M, y: 1.1, w: 10, h: 0.45, fontSize: 16, bold: true, charSpacing: 3, color: col('light'), margin: 0, isTextBox: true });
    } else {
      slide.addText(s.title, { placeholder: 'title' });
      slide.addText(`${s.blockLabel}`.toUpperCase(), { x: M, y: 0.32, w: 8.5, h: 0.32, fontSize: 12, bold: true, charSpacing: 3, color: col(s.dark ? 'light' : 'accent'), margin: 0, isTextBox: true, objectName: 'bloque' });
    }
    // Minutos de la clase (marca cuadrada, arriba a la derecha)
    slide.addText(`min ${s.min[0]}–${s.min[1]}`, { x: 11.35, y: 0.3, w: 1.38, h: 0.36, fontSize: 12, bold: true, align: 'center', valign: 'middle', color: col(fg), line: { color: col(fg), width: 1.25 }, margin: 0, isTextBox: true, objectName: 'minutos' });
    for (const e of s.elements || []) draw(slide, e, { col, fg, pres, dark: s.dark || s.cover });
    slide.addNotes(notesText(s));
  }
  const out = join(HERE, def.file);
  await pres.writeFile({ fileName: out });
  if (applyThemePath) { const { applyTheme } = require(applyThemePath); await applyTheme(out, def.theme); }
  return out;
}

function draw(slide, e, ctx) {
  const { col, fg } = ctx;
  const ink = col(fg);
  switch (e.t) {
    case 'text':
      slide.addText(e.text, { x: e.x, y: e.y, w: e.w, h: e.h, fontSize: e.size || 20, bold: !!e.bold, italic: !!e.italic, color: col(e.color || fg), fontFace: e.font === 'head' ? undefined : undefined, valign: e.valign || 'top', align: e.align || 'left', margin: 0, isTextBox: true, fit: 'none', ...(e.font === 'head' ? { fontFace: ctx.pres.theme.headFontFace } : {}) });
      break;
    case 'bullets':
      slide.addText(e.items.map((it, i) => (typeof it === 'string'
        ? { text: it, options: { bullet: !e.plain, breakLine: i < e.items.length - 1, paraSpaceAfter: 8 } }
        : { text: it.text, options: { bullet: !e.plain && it.bullet !== false, bold: !!it.bold, breakLine: i < e.items.length - 1, paraSpaceAfter: 8, color: it.color ? col(it.color) : undefined } })),
      { x: e.x, y: e.y, w: e.w, h: e.h, fontSize: e.size || 20, color: ink, valign: 'top', margin: 0, isTextBox: true });
      break;
    case 'phone': {
      const h = e.h || 5.0; const w = h * PHONE_RATIO; const pad = 0.06;
      slide.addShape('rect', { x: e.x - pad, y: e.y - pad, w: w + 2 * pad, h: h + 2 * pad, fill: { color: col('ink') }, line: { color: col('ink'), width: 0 } });
      slide.addImage({ path: join(CAP, e.file), x: e.x, y: e.y, w, h, altText: e.alt || e.caption || 'Captura de la aplicación' });
      if (e.caption) slide.addText(e.caption, { x: e.x - 0.3, y: e.y + h + 0.1, w: w + 0.6, h: 0.32, fontSize: 11, color: ink, align: 'center', margin: 0, isTextBox: true });
      break;
    }
    case 'image': {
      slide.addShape('rect', { x: e.x - 0.05, y: e.y - 0.05, w: e.w + 0.1, h: e.h + 0.1, fill: { color: col('ink') }, line: { color: col('ink'), width: 0 } });
      slide.addImage({ path: join(CAP, e.file), x: e.x, y: e.y, w: e.w, h: e.h, altText: e.alt || e.caption || 'Captura de la aplicación', sizing: e.crop ? { type: 'crop', w: e.w, h: e.h } : undefined });
      if (e.caption) slide.addText(e.caption, { x: e.x, y: e.y + e.h + 0.1, w: e.w, h: 0.32, fontSize: 11, color: ink, align: 'center', margin: 0, isTextBox: true });
      break;
    }
    case 'box': {
      const tone = e.tone || 'tint';
      const fill = { tint: col('tint'), accent: col('accent'), dark: col('ink'), light: col('light'), paper: col('paper') }[tone];
      const txt = { tint: col('ink'), accent: col('paper'), dark: col('paper'), light: col('ink'), paper: col('ink') }[tone];
      slide.addShape('rect', { x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: fill }, line: { color: e.border ? col(e.border) : fill, width: e.border ? 2 : 0 } });
      const runs = [];
      if (e.label) runs.push({ text: e.label.toUpperCase(), options: { bold: true, fontSize: 12, charSpacing: 2, breakLine: true } });
      if (e.head) runs.push({ text: e.head, options: { bold: true, fontSize: e.headSize || 22, breakLine: !!e.text, fontFace: ctx.pres.theme.headFontFace } });
      if (e.text) (Array.isArray(e.text) ? e.text : [e.text]).forEach((t, i, a) => runs.push({ text: t, options: { fontSize: e.size || 17, breakLine: i < a.length - 1, bullet: Array.isArray(e.text) && e.list ? true : undefined, paraSpaceAfter: 4 } }));
      slide.addText(runs, { x: e.x + 0.22, y: e.y + 0.16, w: e.w - 0.44, h: e.h - 0.32, color: txt, valign: e.valign || 'top', margin: 0, isTextBox: true });
      break;
    }
    case 'table': {
      const rows = e.rows.map((r, ri) => r.map((cell) => {
        const c = typeof cell === 'object' && cell !== null ? cell : { text: String(cell) };
        const head = e.header !== false && ri === 0;
        return { text: c.text, options: { bold: head || !!c.bold, color: head ? col('paper') : col(c.color || fg), fill: { color: head ? col(e.headFill || 'accent') : (c.fill ? col(c.fill) : (ctx.dark ? col('ink') : col('paper'))) }, fontSize: e.size || 16, align: c.align || 'left', valign: 'middle', margin: [3, 6, 3, 6] } };
      }));
      slide.addTable(rows, { x: e.x, y: e.y, w: e.w, colW: e.colW, border: { type: 'solid', pt: 1, color: col(e.lineColor || 'muted') }, rowH: e.rowH || 0.42 });
      break;
    }
    case 'flow': {
      const n = e.steps.length; const gap = e.gap ?? 0.35; const bw = (e.w - gap * (n - 1)) / n;
      e.steps.forEach((st, i) => {
        const x = e.x + i * (bw + gap);
        const on = e.highlight === undefined || e.highlight === i;
        slide.addShape('rect', { x, y: e.y, w: bw, h: e.h, fill: { color: on ? col(st.fill || 'accent') : col('tint') }, line: { color: col('ink'), width: 1.5 } });
        slide.addText([{ text: st.n ?? `${i + 1}`, options: { bold: true, fontSize: 26, breakLine: true, fontFace: ctx.pres.theme.headFontFace } }, { text: st.head, options: { bold: true, fontSize: e.headSize || 19, breakLine: !!st.text } }, ...(st.text ? [{ text: st.text, options: { fontSize: e.size || 14 } }] : [])],
          { x: x + 0.14, y: e.y + 0.12, w: bw - 0.28, h: e.h - 0.24, color: on ? col(st.fill === 'light' || st.fill === 'tint' ? 'ink' : 'paper') : col('ink'), valign: 'top', margin: 0, isTextBox: true });
        if (i < n - 1) slide.addText('→', { x: x + bw, y: e.y + e.h / 2 - 0.25, w: gap, h: 0.5, fontSize: 22, bold: true, align: 'center', valign: 'middle', color: ink, margin: 0, isTextBox: true });
      });
      break;
    }
    case 'stat':
      slide.addText([{ text: e.value, options: { fontSize: e.size || 64, bold: true, fontFace: ctx.pres.theme.headFontFace, color: col(e.color || 'accent'), breakLine: true } }, { text: e.label, options: { fontSize: 16, color: ink } }], { x: e.x, y: e.y, w: e.w, h: e.h || 1.9, valign: 'top', margin: 0, isTextBox: true });
      break;
    case 'code':
      slide.addShape('rect', { x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: col('ink') }, line: { color: col('ink'), width: 0 } });
      slide.addText(e.text, { x: e.x + 0.25, y: e.y + 0.18, w: e.w - 0.5, h: e.h - 0.36, fontFace: 'Courier New', fontSize: e.size || 14, color: col('paper'), valign: 'top', margin: 0, isTextBox: true });
      break;
    case 'rect':
      slide.addShape('rect', { x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: col(e.fill || 'tint') }, line: { color: col(e.line || 'ink'), width: e.lw ?? 1.5, dashType: e.dash ? 'dash' : 'solid' } });
      if (e.text) slide.addText(e.text, { x: e.x, y: e.y, w: e.w, h: e.h, fontSize: e.size || 14, bold: !!e.bold, align: 'center', valign: 'middle', color: col(e.color || 'ink'), margin: 2, isTextBox: true });
      break;
    default: throw new Error(`Elemento desconocido: ${e.t}`);
  }
}

function notesText(s) {
  const mins = s.min[1] - s.min[0];
  const parts = [`TIEMPO: minuto ${s.min[0]} a ${s.min[1]} (${mins} min) · Bloque: ${s.blockLabel}`];
  if (s.notes.say) parts.push(`QUÉ DECIR\n${s.notes.say}`);
  if (s.notes.do) parts.push(`QUÉ HACER\n${s.notes.do}`);
  if (s.notes.ask) parts.push(`PREGUNTA O ACTIVIDAD\n${s.notes.ask}`);
  if (s.notes.answer) parts.push(`RESPUESTA ESPERADA\n${s.notes.answer}`);
  if (s.notes.check) parts.push(`PENDIENTE DE COMPROBAR EN UN TELÉFONO REAL (no presentarlo como verificado)\n${s.notes.check}`);
  if (s.notes.prep) parts.push(`PREPARACIÓN\n${s.notes.prep}`);
  if (s.notes.next) parts.push(`TRANSICIÓN\n${s.notes.next}`);
  return parts.join('\n\n');
}

/** Guion del facilitador en Markdown, generado de las mismas notas. */
export function guionMarkdown(def) {
  const out = [`# Guion del facilitador · ${def.title}`, '', def.guionIntro, ''];
  let block = null;
  def.slides.forEach((s, i) => {
    if (s.block !== block) { block = s.block; out.push(`## ${s.blockLabel}`, ''); }
    out.push(`### Diapositiva ${i + 1} · ${s.title.replace(/\n/g, ' ')}  `, `**Minuto ${s.min[0]}–${s.min[1]}** (${s.min[1] - s.min[0]} min)`, '');
    if (s.notes.say) out.push(`**Qué decir.** ${s.notes.say}`, '');
    if (s.notes.do) out.push(`**Qué hacer.** ${s.notes.do}`, '');
    if (s.notes.ask) out.push(`**Pregunta o actividad.** ${s.notes.ask}`, '');
    if (s.notes.answer) out.push(`**Respuesta esperada.** ${s.notes.answer}`, '');
    if (s.notes.check) out.push(`> **Pendiente de comprobar en un teléfono real:** ${s.notes.check}`, '');
    if (s.notes.prep) out.push(`**Preparación.** ${s.notes.prep}`, '');
    if (s.notes.next) out.push(`*Transición:* ${s.notes.next}`, '');
  });
  return out.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ['fichero', 'cortes']) {
    const def = (await import(join(HERE, 'src', `${name}.mjs`))).default;
    // Comprobación de tiempos: los minutos deben ser continuos de 0 a 90.
    let t = 0;
    for (const s of def.slides) { if (s.min[0] !== t) throw new Error(`${name}: «${s.title}» empieza en ${s.min[0]}, se esperaba ${t}`); t = s.min[1]; }
    if (t !== 90) throw new Error(`${name}: termina en el minuto ${t}`);
    const f = await buildDeck(def);
    writeFileSync(join(HERE, `guion-${name}.md`), guionMarkdown(def));
    console.log(`${f} · ${def.slides.length} diapositivas`);
  }
}
