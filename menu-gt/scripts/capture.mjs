import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { server } from '../server/server.mjs';
// Capturas de referencia para revisar el diseño: npm run capture [carpeta]
const OUT = process.argv[2] ?? '.impeccable/review';
const EXE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
mkdirSync(OUT, { recursive: true });
await new Promise((r) => server.listen(0, r));
const b = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
for (const [w, h, scheme, name] of [[390, 844, 'light', 'mobile'], [390, 844, 'dark', 'mobile-dark'], [1280, 900, 'light', 'desktop']]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: scheme })).newPage();
  await p.goto(`http://localhost:${server.address().port}/`);
  await p.click('[data-action="finish-onboarding"]');
  await p.waitForTimeout(600);
  const m = await p.evaluate(() => [...document.querySelectorAll('.ticket, .ticket > *, .today .section-head, .today .slot')].map((e) => `${e.className.split(' ')[0]}:${Math.round(e.getBoundingClientRect().top)}-${Math.round(e.getBoundingClientRect().bottom)}`).join(' '));
  if (name === 'mobile') console.log(m);
  await p.screenshot({ path: `${OUT}/${name}.png` });
}
await b.close(); server.close();
