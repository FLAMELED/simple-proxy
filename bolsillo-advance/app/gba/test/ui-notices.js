// Opens the built Android site (dist/www) in Chromium: MPL files loaded separately, colour option, notices.
// Usage: node ui-notices.js <dist/www> <rom.gba> <out dir>
const { chromium } = require('playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const [www, rom, out] = process.argv.slice(2);
const served = [];
const srv = http.createServer((q, s) => {
  const rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const p = path.join(path.resolve(www), rel);
  if (!p.startsWith(path.resolve(www)) || !fs.existsSync(p)) { s.statusCode = 404; return s.end(); }
  served.push(rel);
  s.setHeader('content-type', p.endsWith('.js') ? 'application/javascript' : p.endsWith('.html') ? 'text/html' : 'text/plain');
  s.end(fs.readFileSync(p));
}).listen(8772);
let fails = 0;
const check = (name, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} [UI] ${name}${d ? ' — ' + d : ''}`); };
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8772/');
  await page.setInputFiles('#romInput', rom);
  await page.waitForTimeout(1500);
  await page.click('#menuBtn'); await page.waitForTimeout(200);
  check('opción de color "Suaves (LCD)" presente', await page.isVisible('#set-colors button:text-is("Suaves (LCD)")'));
  check('la etiqueta antigua "Como la GBA" ya no existe', (await page.locator('text=Como la GBA').count()) === 0);
  await page.click('#set-colors button:text-is("Suaves (LCD)")');
  check('el motor activa la corrección', await page.evaluate(() => document.querySelector('#set-colors button[aria-pressed="true"]').textContent) === 'Suaves (LCD)');
  await page.click('.notices summary');
  const txt = await page.textContent('#noticesText');
  check('avisos visibles en el menú', await page.isVisible('#noticesText'));
  for (const s of ['Jeffrey Pfau', 'Mozilla Public License Version 2.0', 'Redistributions in binary form', 'SIL Open Font License 1.1', 'mpl/gpio-rtc.js'])
    check(`el texto de avisos contiene "${s}"`, txt.includes(s));
  await page.locator('.notices').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'ui-notices.png') });
  await page.click('#closeMenu'); await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(out, 'ui-lcd.png') });
  check('los Covered Files MPL se cargan como archivos aparte', ['mpl/gpio-rtc.js', 'mpl/bios-hle.js'].every(f => served.includes(f)));
  const html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
  check('el index.html no contiene el código de los Covered Files', !html.includes('class GpioRtc') && !html.includes('MPL_BIOS_HLE = {'));
  check('los avisos llevan la URL del código y el commit', /https:\/\/github\.com\/[^\s]+\/tree\/[0-9a-f]{40}\/bolsillo-advance/.test(txt));
  check('sin errores de JavaScript', errs.length === 0, errs.join(' | '));
  await browser.close(); srv.close();
  process.exit(fails ? 1 : 0);
})();
