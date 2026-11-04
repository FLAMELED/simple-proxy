import { chromium } from './pw.mjs';
import { serve } from '../../scripts/serve.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import zlib from 'node:zlib';

export async function startServer() { const s = await serve(0); return { server: s, base: `http://127.0.0.1:${s.address().port}` }; }

/** Perfil persistente: cerrar y volver a abrir conserva IndexedDB, como cerrar la app. */
export function newProfileDir() { return mkdtempSync(join(tmpdir(), 'perfil-')); }
export const removeDir = (d) => rmSync(d, { recursive: true, force: true });

const open = new Set();
/** Cierra todo lo que haya quedado abierto (por ejemplo, si una prueba falló a mitad). */
export async function closeAll() { for (const c of open) await c.close().catch(() => {}); open.clear(); }

export async function openApp(dir, url, { width = 390, height = 844 } = {}) {
  const ctx = await chromium.launchPersistentContext(dir, { viewport: { width, height }, acceptDownloads: true });
  open.add(ctx); ctx.on('close', () => open.delete(ctx));
  const page = ctx.pages()[0] || await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForSelector('html[data-ready]');
  return { ctx, page, errors };
}

/** PNG mínimo de un color (para simular una foto). */
export function pngBuffer(w = 40, h = 30, rgb = [200, 60, 30]) {
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) { row[1 + x * 3] = rgb[0]; row[2 + x * 3] = rgb[1]; row[3 + x * 3] = rgb[2]; }
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** Comprueba que no haya desplazamiento horizontal y que los botones se puedan tocar. */
export async function layoutChecks(page) {
  return page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    const small = [...document.querySelectorAll('button, a.btn, label.btn, .tabs a, input.input, select.input')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 40 || r.width < 40)
      .map(({ el, r }) => `${el.tagName}.${el.className} "${(el.textContent || '').trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    return { overflow, small };
  });
}
