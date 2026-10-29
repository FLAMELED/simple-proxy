// Pruebas de extremo a extremo en Chromium con tamaño de teléfono.
// Levanta el servidor local, recorre el flujo principal y verifica que no
// haya desbordamiento horizontal ni errores de JavaScript.
//   npm run test:e2e
import { chromium } from 'playwright-core';
import { server } from '../../server/server.mjs';
import { existsSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const EXE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = process.env.SCREENSHOTS ?? 'test/e2e/screens';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(['ok', name]);
  } catch (err) {
    results.push(['FALLA', name, err.message.split('\n')[0]]);
  }
}

const noOverflow = async (page, label) => {
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert.ok(sw <= iw, `${label}: desborde horizontal ${sw} > ${iw}`);
};
const total = (page) => page.evaluate(() => window.__mercadito.ctx.result.purchase.totals.purchaseCents);
const go = (page, view) => page.click(`.tab[data-view="${view}"]`);

for (const width of [320, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('404') && errors.push(m.text()));
  await page.goto(base);

  await check(`[${width}px] inicio rápido crea menú, lista y total`, async () => {
    await page.click('[data-action="toggle-meal"][value="desayuno"]');
    await page.click('[data-action="finish-onboarding"]');
    const n = await page.locator('.slot').count();
    assert.ok(n >= 3, `próximas comidas: ${n}`);
    assert.ok((await total(page)) > 0);
    await noOverflow(page, 'semana');
  });

  await check(`[${width}px] se entiende: guía de 3 pasos, lista compacta y detalles a pedido`, async () => {
    assert.equal(await page.locator('.steps-guide li').count(), 3);
    await go(page, 'compras');
    const items = await page.locator('li.item').count();
    const perItem = await page.evaluate(() => document.querySelector('.cat').parentElement.scrollHeight) / items;
    assert.ok(perItem < 190, `cada producto ocupa ${Math.round(perItem)} px`);
    assert.equal(await page.locator('.item-more').count(), 0, 'los detalles empiezan cerrados');
    await page.locator('[data-action="item-more"]').first().click();
    assert.equal(await page.locator('.item-more details.explain').count(), 1);
    await page.locator('[data-action="item-more"]').first().click();
    await go(page, 'semana');
  });

  await check(`[${width}px] primera pantalla: ticket, "Hoy" y dos platos sobre la navegación`, async () => {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const r = await page.evaluate(() => {
      const nav = document.getElementById('tabs').getBoundingClientRect().top;
      const slots = [...document.querySelectorAll('.today .slot')].slice(0, 2).map((e) => e.getBoundingClientRect().bottom);
      return { nav, hoy: document.getElementById('next-title').getBoundingClientRect().bottom, slots, weight: getComputedStyle(document.getElementById('next-title')).fontWeight };
    });
    assert.ok(r.hoy < r.nav, `título del día en ${r.hoy}, navegación en ${r.nav}`);
    if (width >= 390) assert.ok(r.slots.length === 2 && r.slots.every((b) => b <= r.nav + 1), `platos terminan en ${r.slots}, navegación en ${r.nav}`);
    assert.equal(r.weight, '700');
    await page.setViewportSize({ width, height: 800 });
  });

  await check(`[${width}px] el ticket se vuelve a imprimir renglón por renglón al recalcular`, async () => {
    await page.locator('#explain').waitFor({ state: 'attached' });
    assert.equal(await page.locator('#explain').isVisible(), false);
    await page.click('[data-action="toggle-explain"]');
    assert.equal(await page.locator('#explain').isVisible(), true);
    assert.equal(await page.locator('.ticket.printing').count(), 0, 'abrir la explicación no reimprime');
    await page.click('[data-action="toggle-explain"]');
    await go(page, 'menu');
    await page.locator('[data-action="servings"][data-delta="1"]').first().click();
    await go(page, 'semana');
    const anim = await page.evaluate(() => [...document.querySelectorAll('.ticket.printing .print-line')].map((e) => e.getAnimations().length));
    assert.ok(anim.length >= 6 && anim.every((n) => n === 1), `renglones animados: ${anim}`);
  });

  await check(`[${width}px] precios reales: último precio guardado, con origen y sin ganar si faltan productos`, async () => {
    const r = await page.evaluate(() => {
      const c = window.__mercadito.ctx;
      const quoted = c.result.purchase.items.filter((i) => i.status === 'cotizado');
      return {
        primary: c.state.stores.primary,
        quoted: quoted.length,
        allSaved: quoted.every((i) => i.offer.status === 'guardado' && i.offer.sourceUrl?.startsWith('https://www.paiz.com.gt/')),
        missingNull: c.result.purchase.items.filter((i) => !['cotizado', 'en-casa'].includes(i.status)).every((i) => i.cents === null),
        winnerComplete: !c.result.comparison.winner || c.result.comparison.rows.find((x) => x.storeId === c.result.comparison.winner).totals.complete,
      };
    });
    assert.equal(r.primary, 'paiz');
    assert.ok(r.quoted > 0, 'hay productos cotizados con precios reales');
    assert.ok(r.allSaved);
    assert.ok(r.missingNull);
    assert.ok(r.winnerComplete);
    await go(page, 'compras');
    assert.ok(await page.locator('.pill.saved', { hasText: 'Último precio guardado' }).count());
    await go(page, 'precios');
    assert.ok(await page.locator('#snap-title').count());
    await noOverflow(page, 'precios reales');
    if (width === 390) await page.screenshot({ path: `${OUT}/precios-reales-${width}.png`, fullPage: true });
  });

  await check(`[${width}px] al marcar comprado se puede guardar lo pagado y reemplaza el precio en línea`, async () => {
    await go(page, 'compras');
    const ingId = await page.evaluate(() => window.__mercadito.ctx.result.purchase.items.find((i) => i.status === 'cotizado' && !i.mixed && i.offer.status === 'guardado').ingredientId);
    const box = page.locator(`[data-action="check-item"][data-ing="${ingId}"]`);
    await box.check();
    const form = page.locator('li.item', { has: box }).locator('form.paid');
    await form.locator('input[name="price"]').fill('99.50');
    await form.locator('input[name="place"]').fill('Chiquimula centro');
    await form.locator('button').click();
    const r = await page.evaluate(() => {
      const c = window.__mercadito.ctx;
      const m = c.state.myPrices.at(-1);
      return { cents: m.priceCents, replaces: m.replacesOfferId, branch: c.state.stores.branches[m.storeId] };
    });
    assert.equal(r.cents, 9950);
    assert.ok(r.replaces);
    assert.equal(r.branch, 'Chiquimula centro');
    await noOverflow(page, 'compras con precio pagado');
    await box.uncheck();
  });

  // A partir de aquí se usan las tiendas de ejemplo (ficticias) para casos reproducibles
  await page.click('.loc');
  await page.click('[data-action="toggle-demo"]');
  await page.evaluate(() => window.__mercadito.actions['set-primary']({ store: 'ejemplo-a' }));

  for (const v of ['menu', 'compras', 'despensa', 'precios']) {
    await check(`[${width}px] vista ${v} sin desbordamiento`, async () => {
      await go(page, v);
      await noOverflow(page, v);
      if (width === 390) await page.screenshot({ path: `${OUT}/${v}-${width}.png`, fullPage: true });
    });
  }
  await check(`[${width}px] ajustes y comparación sin desbordamiento`, async () => {
    await page.click('.loc');
    await noOverflow(page, 'ajustes');
    await go(page, 'compras');
    for (const m of ['compare', 'combine']) {
      await page.click(`[data-mode="${m}"]`);
      await noOverflow(page, m);
      if (width === 390) await page.screenshot({ path: `${OUT}/compras-${m}-${width}.png`, fullPage: true });
    }
    await page.click('[data-mode="single"]');
  });

  await check(`[${width}px] cambiar receta desde la hoja respeta el slot y recalcula`, async () => {
    await go(page, 'menu');
    const first = page.locator('[data-action="open-swap"]').first();
    const slotId = await first.getAttribute('data-slot');
    const before = await page.evaluate((id) => window.__mercadito.ctx.state.plan.slots.find((s) => s.id === id).recipeId, slotId);
    await first.click();
    await page.locator('#sheet .alt [data-action="apply-swap"]').first().click();
    const after = await page.evaluate((id) => window.__mercadito.ctx.state.plan.slots.find((s) => s.id === id).recipeId, slotId);
    assert.notEqual(after, before);
    assert.match(await page.locator('#toast').innerText(), /Compra: Q/);
    assert.equal(await page.locator('#sheet[open]').count(), 0);
  });

  await check(`[${width}px] más porciones aumenta cantidades y total`, async () => {
    const t0 = await total(page);
    for (let k = 0; k < 4; k++) await page.locator('[data-action="servings"][data-delta="1"]').first().click();
    assert.ok((await total(page)) >= t0);
    const q0 = await page.evaluate(() => [...window.__mercadito.ctx.result.needs.values()].reduce((a, n) => a + n.qty, 0));
    await page.locator('[data-action="servings"][data-delta="-1"]').first().click();
    const q1 = await page.evaluate(() => [...window.__mercadito.ctx.result.needs.values()].reduce((a, n) => a + n.qty, 0));
    assert.ok(q1 < q0);
  });

  await check(`[${width}px] despensa descuenta de la lista`, async () => {
    await go(page, 'despensa');
    await page.selectOption('#pf-ing', 'aceite');
    await page.fill('#pf-qty', '3');
    await page.selectOption('#pf-unit', 'l');
    await page.click('form[data-form="pantry"] button[type="submit"]');
    const st = await page.evaluate(() => window.__mercadito.ctx.result.purchase.items.find((i) => i.ingredientId === 'aceite')?.status);
    assert.equal(st, 'en-casa');
    await noOverflow(page, 'despensa con datos');
  });

  await check(`[${width}px] tienda B: faltantes visibles, no gana con productos sin precio`, async () => {
    await go(page, 'compras');
    await page.selectOption('#primary-store', 'ejemplo-b');
    const r = await page.evaluate(() => {
      const c = window.__mercadito.ctx.result;
      return { missing: c.purchase.totals.missing.map((m) => [m.ingredientId, m.cents]), winner: c.comparison.winner, rows: c.comparison.rows.map((x) => [x.storeId, x.totals.complete]) };
    });
    for (const [, cents] of r.missing) assert.equal(cents, null);
    const complete = Object.fromEntries(r.rows);
    if (r.winner) assert.equal(complete[r.winner], true);
    if (r.missing.length) assert.ok(await page.locator('.pill.warn', { hasText: 'sin precio' }).count());
  });

  await check(`[${width}px] "Mi precio" completa un faltante y queda marcado`, async () => {
    await page.evaluate(() => {
      const s = window.__mercadito.ctx.state;
      // Fuerza un faltante conocido: un día con hierba mora (sin precio en B)
      s.plan.slots[0].recipeId = 'hierba-mora-huevo';
      s.plan.slots[0].meal = 'cena';
      window.__mercadito.actions.go({ view: 'compras' });
    });
    await page.locator('[data-action="add-price-for"][data-ing="hierba-mora"]').click();
    await page.fill('#mp-price', '5.00');
    await page.fill('#mp-place', 'Mercado municipal');
    await page.click('#my-price-form button[type="submit"]');
    const it = await page.evaluate(() => window.__mercadito.ctx.result.purchase.items.find((i) => i.ingredientId === 'hierba-mora'));
    assert.equal(it.status, 'cotizado');
    assert.equal(it.fromFallback, true);
  });

  await check(`[${width}px] presupuesto insuficiente muestra faltante y opciones`, async () => {
    await page.click('.loc');
    await page.fill('#set-budget', '150');
    await page.locator('#set-budget').press('Enter');
    await page.locator('#set-budget').blur();
    await go(page, 'semana');
    assert.match(await page.locator('.ticket-total').innerText(), /Faltan Q/i);
    assert.match(await page.locator('.bar').getAttribute('aria-label'), /No alcanza: faltan/);
    assert.ok(await page.locator('.sugg').count());
    await page.waitForTimeout(700); // fin de la animación de cifras
    if (width === 390) await page.screenshot({ path: `${OUT}/semana-insuficiente-${width}.png`, fullPage: true });
  });

  await check(`[${width}px] recargar conserva plan, presupuesto y despensa`, async () => {
    const snap = await page.evaluate(() => JSON.stringify(window.__mercadito.ctx.state.plan.slots) + window.__mercadito.ctx.state.household.budgetCents + JSON.stringify(window.__mercadito.ctx.state.pantry));
    await page.reload();
    const again = await page.evaluate(() => JSON.stringify(window.__mercadito.ctx.state.plan.slots) + window.__mercadito.ctx.state.household.budgetCents + JSON.stringify(window.__mercadito.ctx.state.pantry));
    assert.equal(again, snap);
  });

  await check(`[${width}px] teclado: Tab llega a la navegación y Escape cierra la hoja`, async () => {
    await go(page, 'menu');
    await page.locator('[data-action="open-recipe"]').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#sheet[open]').count(), 1);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#sheet[open]').count(), 0);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button, a.btn, select, input:not([type=checkbox]):not([type=file])')]
        .filter((e) => e.offsetParent && e.getBoundingClientRect().height < 40)
        .map((e) => e.outerHTML.slice(0, 60)),
    );
    assert.deepEqual(small, []);
  });

  await check(`[${width}px] sin errores de JavaScript`, async () => assert.deepEqual(errors, []));
  await context.close();
}

// Vigencia: con el reloj 3 semanas después de la captura, los precios guardados se marcan como viejos
{
  const later = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const lp = await later.newPage();
  await lp.clock.install({ time: new Date('2026-11-20T12:00:00-06:00') });
  await lp.goto(base);
  await lp.click('[data-action="finish-onboarding"]');
  await check('[390px] precios de más de 14 días se marcan y no confirman el presupuesto', async () => {
    const r = await lp.evaluate(() => ({ stale: window.__mercadito.ctx.result.stale.length, status: window.__mercadito.ctx.result.budget.status }));
    assert.ok(r.stale > 0, 'sin precios vencidos');
    assert.notEqual(r.status, 'alcanza');
    await go(lp, 'compras');
    assert.ok(await lp.getByText(/Precio de hace \d+ días/).count());
  });
  await later.close();
}

// Sin señal: tras la primera visita, la app abre sin red y conserva el plan
{
  const off = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const op = await off.newPage();
  await op.goto(base);
  await op.click('[data-action="finish-onboarding"]');
  await op.evaluate(() => navigator.serviceWorker.ready);
  await op.reload(); // la segunda carga ya pasa por el service worker y guarda todo
  await op.waitForSelector('#ticket');
  await check('[390px] sin señal: abre desde lo guardado y conserva el plan', async () => {
    await off.setOffline(true);
    await op.reload();
    await op.waitForSelector('#ticket', { timeout: 5000 });
    assert.ok(await op.locator('.today .slot').count());
  });
  await off.close();
}

// Tema oscuro: captura para revisar contraste
const dark = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'dark', deviceScaleFactor: 2 });
const dp = await dark.newPage();
await dp.goto(base);
await dp.click('[data-action="finish-onboarding"]');
await dp.screenshot({ path: `${OUT}/semana-oscuro-390.png`, fullPage: true });
await dark.close();

await browser.close();
server.close();
for (const r of results) console.log(r.join(' · '));
const failed = results.filter((r) => r[0] !== 'ok').length;
console.log(`\n${results.length - failed} correctas, ${failed} fallidas`);
process.exit(failed ? 1 : 0);
