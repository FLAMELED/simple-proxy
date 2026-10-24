// Opens the built page in Chromium: colour option and the "Licencias y avisos" section.
// Usage: node ui-notices.js <bolsillo-advance.html> <rom.gba> <out dir>
const { chromium } = require('playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const [file, rom, out] = process.argv.slice(2);
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>' + fs.readFileSync(file, 'utf8') + '</body></html>';
const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end(html); }).listen(8772);
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
  for (const s of ['Jeffrey Pfau', 'Mozilla Public License Version 2.0', 'Redistributions in binary form', 'SIL Open Font License 1.1', 'gba/src/cart.js'])
    check(`el texto de avisos contiene "${s}"`, txt.includes(s));
  await page.locator('.notices').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'ui-notices.png') });
  await page.click('#closeMenu'); await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(out, 'ui-lcd.png') });
  check('sin errores de JavaScript', errs.length === 0, errs.join(' | '));
  await browser.close(); srv.close();
  process.exit(fails ? 1 : 0);
})();
