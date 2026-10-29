// Controlador de la interfaz: estado, acciones y render.
import { defaultState, loadState, saveState, exportState, importState, planDays, todayISO } from '../state/state.js';
import { computeAll, buildMenu, allOffers } from '../engine/index.js';
import { parseQuetzales } from '../engine/money.js';
import { toBase, unitsFor, ConversionError } from '../engine/units.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { RECIPE_BY_ID } from '../data/recipes.js';
import { STORE_BY_ID } from '../data/stores.js';
import { checkRecipe } from '../engine/selector.js';
import { esc, q, icon, storeLabel } from './common.js';
import { viewSemana, viewMenu } from './views-plan.js';
import { viewCompras, listText } from './views-shop.js';
import { viewDespensa, viewPrecios, viewAjustes, unitOptions } from './views-data.js';
import { renderSheet } from './sheets.js';
import { serverStatus, lookupProduct } from '../prices/client.js';

const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();

const loaded = loadState(storage);
const ctx = {
  state: loaded.state ?? defaultState(todayISO()),
  persisted: loaded.persisted,
  sessionStart: Date.now(),
  server: { available: null },
  ui: {
    sheet: null,
    flash: null,
    toast: null,
    pantryForm: { ing: 'arroz', qty: '1', unit: 'lb' },
    priceForm: { ing: 'tomate', store: 'mis-precios', place: '', product: '', brand: '', qty: '1', unit: 'lb', price: '', note: '' },
    lookup: { url: '', ing: 'arroz', loading: false, error: null, result: null },
    priceFilter: '',
  },
};

const VIEWS = { semana: viewSemana, menu: viewMenu, compras: viewCompras, despensa: viewDespensa, precios: viewPrecios, ajustes: viewAjustes };
const NAV = [
  ['semana', 'Semana'],
  ['menu', 'Menú'],
  ['compras', 'Compras'],
  ['despensa', 'Despensa'],
  ['precios', 'Precios'],
];

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ---------- Plan ----------
function syncPlan(state, { regenerate = false } = {}) {
  const fresh = buildMenu(state, state.plan.seed);
  if (regenerate) {
    state.plan.slots = fresh.slots;
  } else {
    const have = new Set(state.plan.slots.map((s) => s.id));
    for (const s of fresh.slots) if (!have.has(s.id)) state.plan.slots.push(s);
  }
  ctx.menuNotices = fresh.notices;
}

function recompute() {
  ctx.days = planDays(ctx.state.household);
  ctx.result = computeAll(ctx.state);
  ctx.result.menuNotices = ctx.menuNotices ?? [];
}

function commit({ render: doRender = true } = {}) {
  ctx.persisted = saveState(storage, ctx.state);
  recompute();
  if (doRender) render();
}

function toast(text) {
  ctx.ui.toast = text;
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 4500);
}

// ---------- Rutas en el estado ----------
function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] ??= {};
  o[keys.at(-1)] = value;
}
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function parseValue(raw, type) {
  switch (type) {
    case 'int': {
      const n = parseInt(raw, 10);
      return Number.isInteger(n) ? n : undefined;
    }
    case 'cents': return parseQuetzales(raw) ?? undefined;
    case 'cents-null': return raw.trim() === '' ? null : parseQuetzales(raw) ?? undefined;
    case 'date': return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
    default: return raw;
  }
}

function afterBind(path, prev) {
  const s = ctx.state;
  if (path === 'household.people') {
    for (const slot of s.plan.slots) slot.servings = s.household.people;
  }
  if (path === 'household.numDays') s.household.numDays = Math.min(14, Math.max(1, s.household.numDays));
  if (['household.numDays', 'household.startDate'].includes(path) && s.onboarded) syncPlan(s);
  if (path === 'household.startDate' && s.onboarded) {
    // Cambiar la fecha cambia qué días son fin de semana; se conserva lo elegido.
    syncPlan(s);
  }
}

// ---------- Acciones ----------
function applySwap(slotId, recipeId) {
  const s = ctx.state;
  const slot = s.plan.slots.find((x) => x.id === slotId);
  const before = ctx.result.purchase.totals.purchaseCents;
  const from = RECIPE_BY_ID[slot.recipeId].name;
  slot.recipeId = recipeId;
  delete slot.relaxed;
  ctx.ui.sheet = null;
  ctx.ui.flash = slotId;
  commit();
  const after = ctx.result.purchase.totals.purchaseCents;
  toast(`${from} → ${RECIPE_BY_ID[recipeId].name}. Compra: ${q(before)} → ${q(after)}.`);
  setTimeout(() => {
    ctx.ui.flash = null;
  }, 1200);
}

function toggleInList(list, value, on) {
  const i = list.indexOf(value);
  if (on && i < 0) list.push(value);
  if (!on && i >= 0) list.splice(i, 1);
}

const actions = {
  'guide-done'() {
    ctx.state.guideDone = true;
    commit();
  },
  'item-more'(d) {
    ctx.ui.openItem = ctx.ui.openItem === d.ing ? null : d.ing;
    render();
  },
  'toggle-explain'() {
    ctx.ui.explainOpen = !ctx.ui.explainOpen;
    render();
    if (ctx.ui.explainOpen) document.getElementById('explain')?.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
  },
  go(d) {
    ctx.state.view = d.view;
    ctx.ui.sheet = null;
    commit();
    window.scrollTo({ top: 0 });
    document.getElementById('main').focus({ preventScroll: true });
  },
  'finish-onboarding'() {
    const s = ctx.state;
    if (!s.household.meals.length) return toast('Elige al menos una comida.');
    s.onboarded = true;
    syncPlan(s, { regenerate: true });
    s.view = 'semana';
    commit();
    window.scrollTo({ top: 0 });
    toast('Menú creado. Puedes cambiar cualquier receta.');
  },
  step(d) {
    const cur = getPath(ctx.state, d.path);
    const next = Math.min(Number(d.max), Math.max(Number(d.min), cur + Number(d.delta)));
    setPath(ctx.state, d.path, next);
    afterBind(d.path, cur);
    commit();
  },
  'toggle-meal'(d, el) {
    toggleInList(ctx.state.household.meals, el.value, el.checked);
    if (ctx.state.onboarded) syncPlan(ctx.state);
    commit();
  },
  'toggle-day'(d, el) {
    toggleInList(ctx.state.household.skipDays, Number(d.day), !el.checked);
    commit();
  },
  servings(d) {
    const slot = ctx.state.plan.slots.find((x) => x.id === d.slot);
    slot.servings = Math.max(1, slot.servings + Number(d.delta));
    commit();
  },
  'open-recipe'(d) {
    ctx.ui.sheet = { type: 'recipe', slotId: d.slot };
    render();
  },
  'open-swap'(d) {
    ctx.ui.sheet = { type: 'swap', slotId: d.slot };
    render();
  },
  'close-sheet'() {
    ctx.ui.sheet = null;
    render();
  },
  'apply-swap'(d) {
    applySwap(d.slot, d.recipe);
  },
  regenerate() {
    const s = ctx.state;
    const before = ctx.result.purchase.totals.purchaseCents;
    s.plan.seed = (s.plan.seed % 9973) + 7;
    syncPlan(s, { regenerate: true });
    for (const slot of s.plan.slots) slot.servings = s.household.people;
    commit();
    toast(`Nueva propuesta. Compra: ${q(before)} → ${q(ctx.result.purchase.totals.purchaseCents)}.`);
  },
  'fix-conflicts'() {
    const s = ctx.state;
    const fresh = buildMenu(s, s.plan.seed + 101).slots;
    let n = 0;
    for (const slot of s.plan.slots) {
      if (!checkRecipe(RECIPE_BY_ID[slot.recipeId], s.prefs, INGREDIENTS).ok) {
        const repl = fresh.find((f) => f.id === slot.id);
        if (repl?.recipeId) {
          slot.recipeId = repl.recipeId;
          n++;
        }
      }
    }
    commit();
    toast(`${n} receta${n === 1 ? '' : 's'} reemplazada${n === 1 ? '' : 's'}.`);
  },
  'set-primary'(d) {
    ctx.state.stores.primary = d.store;
    ctx.state.shopMode = 'single';
    commit();
    toast(`Ahora calculas todo en ${storeLabel(d.store, ctx.state)}. El menú no cambió.`);
  },
  'set-primary-select'(d, el) {
    ctx.state.stores.primary = el.value;
    commit();
  },
  'shop-mode'(d) {
    ctx.state.shopMode = d.mode;
    commit();
  },
  'check-item'(d, el) {
    if (el.checked) ctx.state.checked[d.ing] = true;
    else delete ctx.state.checked[d.ing];
    commit();
  },
  'brand-lock'(d, el) {
    if (el.value) ctx.state.brandLocks[d.ing] = el.value;
    else delete ctx.state.brandLocks[d.ing];
    commit();
  },
  'accept-promo'(d, el) {
    if (el.checked) ctx.state.acceptedPromos[d.offer] = true;
    else delete ctx.state.acceptedPromos[d.offer];
    commit();
  },
  'add-price-for'(d) {
    const ing = INGREDIENTS[d.ing];
    const primary = ctx.state.stores.primary;
    const real = STORE_BY_ID[primary] && !STORE_BY_ID[primary].sample;
    ctx.ui.priceForm = { ...ctx.ui.priceForm, ing: d.ing, unit: unitsFor(ing).includes('lb') ? 'lb' : ing.base, product: ing.name[0].toUpperCase() + ing.name.slice(1), store: real ? primary : 'mis-precios', price: '' };
    ctx.state.view = 'precios';
    commit();
    document.getElementById('mp-price')?.focus();
    document.getElementById('my-price-form')?.scrollIntoView({ block: 'start' });
  },
  async 'copy-list'() {
    const text = listText(ctx);
    try {
      await navigator.clipboard.writeText(text);
      toast('Lista copiada.');
    } catch {
      showCopyFallback(text);
    }
  },
  'pantry-form-ing'(d, el) {
    const ing = INGREDIENTS[el.value];
    ctx.ui.pantryForm.ing = el.value;
    ctx.ui.pantryForm.unit = unitsFor(ing).includes('lb') ? 'lb' : ing.base;
    document.getElementById('pf-unit').innerHTML = unitOptions(el.value, ctx.ui.pantryForm.unit);
  },
  'pantry-pick'(d) {
    const ing = INGREDIENTS[d.ing];
    ctx.ui.pantryForm = { ing: d.ing, qty: '1', unit: unitsFor(ing).includes('lb') ? 'lb' : ing.base };
    render();
    document.getElementById('pf-qty')?.focus();
  },
  'pantry-qty'(d, el) {
    const item = ctx.state.pantry.find((p) => p.id === d.id);
    const n = Number(el.value.replace(',', '.'));
    if (!(n >= 0)) return toast('Escribe una cantidad válida.');
    item.qty = n;
    commit();
  },
  'pantry-del'(d) {
    ctx.state.pantry = ctx.state.pantry.filter((p) => p.id !== d.id);
    commit();
  },
  'price-form-ing'(d, el) {
    const ing = INGREDIENTS[el.value];
    ctx.ui.priceForm.ing = el.value;
    ctx.ui.priceForm.unit = unitsFor(ing).includes('lb') ? 'lb' : ing.base;
    document.getElementById('mp-unit').innerHTML = unitOptions(el.value, ctx.ui.priceForm.unit);
    const prod = document.getElementById('mp-product');
    if (prod && !prod.value) prod.placeholder = ing.name;
  },
  'price-del'(d) {
    ctx.state.myPrices = ctx.state.myPrices.filter((o) => o.id !== d.id);
    ctx.state.fetchedPrices = ctx.state.fetchedPrices.filter((o) => o.id !== d.id);
    commit();
    toast('Precio borrado.');
  },
  'price-filter'(d, el) {
    ctx.ui.priceFilter = el.value;
    render();
  },
  'save-lookup'(d, el, e) {
    e.preventDefault();
    const lk = ctx.ui.lookup;
    const form = el.closest('form');
    const packQty = Number(form.packQty.value.replace(',', '.'));
    const packUnit = form.packUnit.value;
    const ing = INGREDIENTS[form.ing.value];
    try {
      if (!(packQty > 0)) throw new Error('Indica la cantidad del empaque.');
      toBase(packQty, packUnit, ing);
    } catch (err) {
      lk.error = err.message;
      return render();
    }
    const r = lk.result.record;
    ctx.state.fetchedPrices.push({
      id: `web-${uid()}`, storeId: lk.result.storeId, ingredientId: ing.id, product: r.product, brand: r.brand ?? 'Sin marca',
      packQty, packUnit, priceCents: r.priceCents, promo: null, availability: r.availability, channel: 'online', status: 'consultado',
      branch: null, branchNote: r.branchNote, sourceUrl: r.sourceUrl, fetchedAt: r.fetchedAt,
    });
    ctx.ui.lookup = { url: '', ing: ing.id, loading: false, error: null, result: null };
    commit();
    toast('Precio guardado con su origen y fecha.');
  },
  'toggle-store'(d, el) {
    const s = ctx.state.stores;
    toggleInList(s.selected, el.value, el.checked);
    if (!s.selected.includes(s.primary)) s.primary = s.selected[0] ?? 'mis-precios';
    commit();
  },
  'toggle-demo'(d, el) {
    const s = ctx.state;
    s.demo = el.checked;
    if (!s.demo) {
      s.stores.selected = s.stores.selected.filter((id) => !id.startsWith('ejemplo'));
      if (!s.stores.selected.length) s.stores.selected = ['paiz', 'walmart', 'la-torre'];
      if (s.stores.primary.startsWith('ejemplo')) s.stores.primary = s.stores.selected[0];
      toast('Sin datos de ejemplo: se usan los últimos precios guardados de las tiendas.');
    } else {
      for (const id of ['ejemplo-a', 'ejemplo-b']) if (!s.stores.selected.includes(id)) s.stores.selected.unshift(id);
    }
    commit();
  },
  'toggle-pref-bool'(d, el) {
    ctx.state.prefs[d.key] = el.checked;
    commit();
  },
  'toggle-allergy'(d, el) {
    toggleInList(ctx.state.prefs.allergies, el.value, el.checked);
    commit();
  },
  'toggle-protein'(d, el) {
    toggleInList(ctx.state.prefs.excludedProteins, el.value, el.checked);
    commit();
  },
  'toggle-equipment'(d, el) {
    toggleInList(ctx.state.prefs.equipment, el.value, el.checked);
    commit();
  },
  exclude() {
    const id = document.getElementById('excl-ing').value;
    toggleInList(ctx.state.prefs.excludedIngredients, id, true);
    commit();
  },
  unexclude(d) {
    toggleInList(ctx.state.prefs.excludedIngredients, d.ing, false);
    commit();
  },
  'extra-del'(d) {
    ctx.state.extras = ctx.state.extras.filter((e) => e.id !== d.id);
    commit();
  },
  'toggle-fav'(d) {
    toggleInList(ctx.state.prefs.favorites, d.recipe, !ctx.state.prefs.favorites.includes(d.recipe));
    commit();
  },
  async export() {
    const text = exportState(ctx.state);
    const filename = `menu-gt-${todayISO()}.json`;
    // Dentro de un Artifact de claude.ai: la descarga pasa por la confirmación del visor.
    const downloads = window.claude?.use ? await window.claude.use('downloads').catch(() => null) : null;
    if (downloads) {
      try {
        await downloads.save({ filename, data: text });
        ctx.ui.dataMsg = { tone: 'ok', text: 'Archivo entregado para guardar.' };
      } catch (err) {
        ctx.ui.dataMsg = err?.code === 'declined'
          ? { tone: 'warn', text: 'No se guardó el archivo. Puedes usar "Copiar como texto".' }
          : { tone: 'warn', text: 'No se pudo guardar aquí. Usa "Copiar como texto".' };
      }
      return render();
    }
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      ctx.ui.dataMsg = { tone: 'ok', text: 'Archivo generado. Si tu navegador no lo descargó, usa "Copiar como texto".' };
    } catch {
      ctx.ui.dataMsg = { tone: 'warn', text: 'No se pudo descargar aquí. Usa "Copiar como texto".' };
    }
    render();
  },
  async 'export-copy'() {
    const text = exportState(ctx.state);
    try {
      await navigator.clipboard.writeText(text);
      ctx.ui.dataMsg = { tone: 'ok', text: 'Datos copiados. Pégalos en un mensaje o nota para guardarlos.' };
      render();
    } catch {
      showCopyFallback(text);
    }
  },
  'import-file'(d, el) {
    const file = el.files?.[0];
    if (!file) return;
    file.text().then(doImport);
  },
  'import-text'() {
    doImport(document.getElementById('import-text').value);
  },
  'reset-ask'() {
    ctx.ui.confirmReset = true;
    render();
  },
  'reset-cancel'() {
    ctx.ui.confirmReset = false;
    render();
  },
  'reset-confirm'() {
    ctx.state = defaultState(todayISO());
    ctx.ui.confirmReset = false;
    commit();
    toast('Datos borrados de este navegador.');
  },
};

function doImport(text) {
  try {
    ctx.state = importState(text);
    ctx.ui.dataMsg = { tone: 'ok', text: 'Plan importado: menú, presupuesto, despensa, precios y preferencias.' };
    commit();
  } catch (err) {
    ctx.ui.dataMsg = { tone: 'danger', text: err.message };
    render();
  }
}

function showCopyFallback(text) {
  ctx.ui.sheet = null;
  const dlg = document.getElementById('sheet');
  dlg.innerHTML = `<header class="sheet-head"><h2 id="sheet-title">Copia el texto</h2><button class="btn icon" data-action="close-sheet" aria-label="Cerrar">${icon('cerrar')}</button></header>
    <div class="sheet-body"><p class="small muted">Tu navegador no permitió copiar automáticamente. Selecciona el texto y cópialo.</p><textarea id="copy-fallback" rows="12" readonly>${esc(text)}</textarea></div>`;
  if (!dlg.open) dlg.showModal();
  const ta = document.getElementById('copy-fallback');
  ta.focus();
  ta.select();
}

// ---------- Formularios ----------
const forms = {
  pantry(form) {
    const ingId = form.ing.value;
    const qty = Number(form.qty.value.replace(',', '.'));
    const unit = form.unit.value;
    ctx.ui.pantryError = null;
    try {
      if (!(qty > 0)) throw new Error('Escribe una cantidad mayor que cero.');
      toBase(qty, unit, INGREDIENTS[ingId]);
    } catch (err) {
      ctx.ui.pantryError = err.message;
      return render();
    }
    const existing = ctx.state.pantry.find((p) => p.ingredientId === ingId && p.unit === unit);
    if (existing) existing.qty = Math.round((Number(existing.qty) + qty) * 1000) / 1000;
    else ctx.state.pantry.push({ id: uid(), ingredientId: ingId, qty, unit });
    ctx.ui.pantryForm = { ...ctx.ui.pantryForm, ing: ingId, unit, qty: '1' };
    commit();
    toast(`${INGREDIENTS[ingId].name} agregado a la despensa.`);
  },
  'my-price'(form) {
    const f = Object.fromEntries(new FormData(form));
    ctx.ui.priceForm = { ...ctx.ui.priceForm, ...f };
    ctx.ui.priceError = null;
    const ing = INGREDIENTS[f.ing];
    const qty = Number(String(f.qty).replace(',', '.'));
    const cents = parseQuetzales(f.price);
    try {
      if (!(qty > 0)) throw new Error('Escribe la cantidad del empaque o del peso comprado.');
      if (!cents) throw new Error('Escribe el precio en quetzales, por ejemplo 12.50.');
      toBase(qty, f.unit, ing);
    } catch (err) {
      ctx.ui.priceError = err instanceof ConversionError ? err.message : err.message;
      return render();
    }
    ctx.state.myPrices.push({
      id: `mine-${uid()}`, storeId: f.store, place: f.place.trim() || null, ingredientId: ing.id,
      product: f.product.trim() || ing.name[0].toUpperCase() + ing.name.slice(1), brand: f.brand.trim() || 'Sin marca',
      packQty: qty, packUnit: f.unit, priceCents: cents, promo: null, note: f.note.trim() || null,
      availability: f.availability, channel: 'usuario', status: 'usuario', branch: f.place.trim() || null, sourceUrl: null,
      fetchedAt: new Date().toISOString(),
    });
    if (f.store !== 'mis-precios' && !ctx.state.stores.selected.includes(f.store)) ctx.state.stores.selected.push(f.store);
    ctx.ui.priceForm = { ...ctx.ui.priceForm, price: '', product: '', brand: '', note: '' };
    commit();
    toast(`Precio guardado para ${storeLabel(f.store, ctx.state)}.`);
  },
  async lookup(form) {
    const lk = ctx.ui.lookup;
    lk.url = form.url.value.trim();
    lk.ing = form.ing.value;
    lk.loading = true;
    lk.error = null;
    lk.result = null;
    render();
    const out = await lookupProduct(lk.url);
    lk.loading = false;
    if (out.ok) lk.result = out;
    else lk.error = out.error;
    render();
  },
  paid(form) {
    const f = Object.fromEntries(new FormData(form));
    const o = allOffers(ctx.state).find((x) => x.id === f.offer);
    const cents = parseQuetzales(f.price);
    if (!o) return toast('Ese producto ya no está en la lista.');
    if (!cents) return toast('Escribe lo que pagaste, por ejemplo 27.70.');
    const place = f.place.trim() || null;
    if (place && !ctx.state.stores.branches[o.storeId]) ctx.state.stores.branches[o.storeId] = place;
    ctx.state.myPrices = ctx.state.myPrices.filter((m) => m.replacesOfferId !== o.id);
    ctx.state.myPrices.push({
      id: `mine-${uid()}`, storeId: o.storeId, place, ingredientId: o.ingredientId, product: o.product, brand: o.brand,
      packQty: o.packQty, packUnit: o.packUnit, priceCents: cents, promo: null, note: 'Pagado en tienda',
      availability: 'disponible', channel: 'usuario', status: 'usuario', branch: place, sourceUrl: null,
      replacesOfferId: o.id, fetchedAt: new Date().toISOString(),
    });
    commit();
    toast(`Guardado: ${q(cents)} en ${place ?? storeLabel(o.storeId, ctx.state)}.`);
  },
  extra(form) {
    const label = form.label.value.trim();
    const cents = parseQuetzales(form.amount.value);
    ctx.ui.extraError = null;
    if (!label || !cents) {
      ctx.ui.extraError = 'Escribe un concepto y un monto válido, por ejemplo 35.00.';
      return render();
    }
    ctx.state.extras.push({ id: uid(), label, cents });
    commit();
  },
};

// ---------- Render ----------
const tweenPrev = new Map();
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lastTicketKey = null;

function animateAfterRender() {
  // Movimiento propio: si cambian los montos, el ticket se vuelve a imprimir renglón por renglón.
  const ticket = document.getElementById('ticket');
  if (ticket) {
    const b = ctx.result.budget;
    const key = `${b.purchaseKnownCents}|${b.extrasCents}|${b.budgetCents}|${b.pendingCount}`;
    if (lastTicketKey !== null && key !== lastTicketKey && !reduceMotion()) ticket.classList.add('printing');
    lastTicketKey = key;
  }
  if (reduceMotion()) return;
  document.querySelectorAll('[data-tween]').forEach((el, i) => {
    const key = el.dataset.tweenKey ?? `${ctx.state.view}-${i}`;
    const target = Number(el.dataset.tween);
    const from = tweenPrev.get(key);
    tweenPrev.set(key, target);
    if (from === undefined || from === target) return;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 450);
      const e = 1 - (1 - k) ** 3;
      el.textContent = q(Math.round(from + (target - from) * e));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function header() {
  const s = ctx.state;
  const sample = s.demo && s.stores.primary.startsWith('ejemplo');
  const place = s.location.municipio || s.location.departamento;
  return `<div class="head-inner">
    <span class="brand">Mercadito</span>
    <button class="loc" data-action="go" data-view="ajustes" aria-label="Ajustes: ${esc(place)}, ${esc(storeLabel(s.stores.primary, s))}">
      <span class="loc-text">${esc(place)} · ${esc(storeLabel(s.stores.primary, s))}</span>
    </button>
  </div>
  ${sample ? '<p class="demo-band">Precios de ejemplo, ficticios</p>' : ''}`;
}

function nav() {
  return NAV.map(([id, label]) => `<button class="tab" data-action="go" data-view="${id}" ${ctx.state.view === id ? 'aria-current="page"' : ''}>${icon(id)}<span>${label}</span></button>`).join('');
}

function render() {
  const view = VIEWS[ctx.state.view] ? ctx.state.view : 'semana';
  const active = document.activeElement;
  const focusKey = active?.id || (active?.dataset?.action ? `${active.dataset.action}|${active.dataset.slot ?? ''}|${active.dataset.view ?? ''}|${active.dataset.ing ?? ''}|${active.dataset.mode ?? ''}` : null);
  document.getElementById('app-head').innerHTML = header();
  document.getElementById('main').innerHTML = VIEWS[view](ctx);
  document.querySelector('.apron')?.setAttribute('data-view', view);
  document.getElementById('tabs').innerHTML = nav();
  const dlg = document.getElementById('sheet');
  const sheetHtml = renderSheet(ctx);
  if (sheetHtml) {
    dlg.innerHTML = sheetHtml;
    if (!dlg.open) dlg.showModal();
  } else if (dlg.open && !document.getElementById('copy-fallback')) {
    dlg.close();
  }
  if (focusKey && !dlg.open) {
    let el = document.getElementById(focusKey);
    if (!el && focusKey.includes('|')) {
      const [a, slot, v, ing, mode] = focusKey.split('|');
      el = [...document.querySelectorAll(`[data-action="${a}"]`)].find(
        (x) => (x.dataset.slot ?? '') === slot && (x.dataset.view ?? '') === v && (x.dataset.ing ?? '') === ing && (x.dataset.mode ?? '') === mode,
      );
    }
    el?.focus({ preventScroll: true });
  }
  if (ctx.ui.flash) {
    document.querySelector(`[data-slot-card="${ctx.ui.flash}"]`)?.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
  }
  animateAfterRender();
}

// ---------- Eventos ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.matches('input, select, textarea')) return;
  const fn = actions[el.dataset.action];
  if (fn) fn(el.dataset, el, e);
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.bind) {
    const value = parseValue(el.value, el.dataset.type);
    if (value === undefined) {
      toast('Ese valor no es válido.');
      return render();
    }
    const prev = getPath(ctx.state, el.dataset.bind);
    setPath(ctx.state, el.dataset.bind, value);
    afterBind(el.dataset.bind, prev);
    return commit();
  }
  const fn = el.dataset.action && actions[el.dataset.action];
  if (fn) fn(el.dataset, el, e);
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  forms[form.dataset.form]?.(form);
});

document.getElementById('sheet').addEventListener('close', () => {
  if (ctx.ui.sheet) {
    ctx.ui.sheet = null;
    render();
  }
});
document.getElementById('sheet').addEventListener('click', (e) => {
  if (e.target.id === 'sheet') e.target.close(); // clic en el fondo
});

// ---------- Inicio ----------
if (ctx.state.onboarded && !ctx.state.plan.slots.length) syncPlan(ctx.state, { regenerate: true });
recompute();
render();
serverStatus().then((ok) => {
  ctx.server.available = ok;
  if (ctx.state.view === 'precios') render();
});

// Sin señal en el súper: solo en la versión servida (en el Artifact no hay service worker).
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && document.querySelector('link[rel="manifest"]')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Para pruebas automatizadas
window.__mercadito = { ctx, actions };
