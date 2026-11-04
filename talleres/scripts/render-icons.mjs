// Genera los íconos PNG del lanzador de Android a partir de <app>/icon.svg.
// Se ejecuta una vez y los PNG se versionan, así compilar el APK no necesita navegador.
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../tests/e2e/pw.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const browser = await chromium.launch();
for (const app of ['fichero', 'cortes']) {
  const svg = readFileSync(join(root, app, 'icon.svg'), 'utf8');
  for (const [dpi, px] of Object.entries(SIZES)) {
    const page = await browser.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0}svg{width:${px}px;height:${px}px;display:block}</style>${svg}`);
    const dir = join(root, 'android', 'res', app, `mipmap-${dpi}`);
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'ic_launcher.png') });
    await page.close();
  }
}
await browser.close();
console.log('íconos listos');
