// Vista "Compras": mi supermercado, comparar y combinar tiendas.
import { esc, q, icon, mealLabel, dayLabel, storeLabel, priceStatus, unitPrice, packText, describeQty, STATUS_TEXT, formatDate } from './common.js';
import { CATEGORIES } from '../data/ingredients.js';
import { RECIPE_BY_ID } from '../data/recipes.js';
import { STORE_BY_ID } from '../data/stores.js';
import { allOffers } from '../engine/index.js';
import { periodText } from './views-plan.js';

/** "2 × Arroz blanco 1 kg + 1 × Arroz blanco 400 g" */
export function linesText(it, { brand = true } = {}) {
  return it.lines
    .map((l) => `${l.packs} × ${l.offer.product} ${packText(l.offer)}${brand && l.offer.brand ? ` (${l.offer.brand})` : ''}`)
    .join(' + ');
}

const statusTone = { cotizado: 'ok', 'en-casa': 'home', 'sin-precio': 'warn', agotado: 'danger', 'marca-no-disponible': 'warn', 'sin-conversion': 'warn' };

function sourceBlock(offer, ctx) {
  if (!offer) return '';
  const st = priceStatus(offer, ctx.sessionStart);
  const store = STORE_BY_ID[offer.storeId];
  const branch = offer.branch ?? ctx.state.stores.branches[offer.storeId];
  const channel = { online: 'Tienda en línea', tienda: 'Tienda física', usuario: 'Dato ingresado por ti', ejemplo: 'Dato ficticio de ejemplo' }[offer.channel] ?? offer.channel;
  return `<dl class="source">
    <div><dt>Origen</dt><dd><span class="pill ${st.tone}">${st.label}</span> ${esc(st.detail)}</dd></div>
    <div><dt>Lugar</dt><dd>${esc(offer.place || store?.name || offer.storeId)} · ${esc(channel)}</dd></div>
    <div><dt>Sucursal o zona</dt><dd>${branch ? esc(branch) : 'No indicada'}${offer.branchNote ? ` <span class="muted">(${esc(offer.branchNote)})</span>` : ''}</dd></div>
    <div><dt>Disponibilidad</dt><dd>${esc(offer.availability)}</dd></div>
    ${offer.promo ? `<div><dt>Promoción</dt><dd>${esc(offer.promo.text ?? '')}</dd></div>` : ''}
    ${offer.presentationSource ? `<div><dt>Presentación</dt><dd>${esc(offer.presentationSource)}</dd></div>` : ''}
    ${offer.notes?.length ? `<div><dt>Notas</dt><dd>${offer.notes.map(esc).join(' ')}</dd></div>` : ''}
    ${offer.sourceUrl ? `<div><dt>Página</dt><dd><a href="${esc(offer.sourceUrl)}" target="_blank" rel="noopener noreferrer">${icon('enlace')} Ver origen</a></dd></div>` : ''}
  </dl>`;
}

function itemExplain(it, ctx) {
  const ing = it.ingredient;
  const uses = it.uses.map((u) => {
    const day = ctx.days[u.day];
    return `<li>${esc(dayLabel(day))} · ${mealLabel(u.meal)}: ${esc(RECIPE_BY_ID[u.recipeId].name)} — ${esc(describeQty(u.qty, ing))}</li>`;
  });
  const lines = [
    `<li>Total que piden las recetas: <b>${esc(describeQty(it.qty, ing))}</b>${it.approx ? ' (aproximado)' : ''}</li>`,
  ];
  if (it.pantryQty > 0) lines.push(`<li>En casa tienes ${esc(describeQty(it.pantryQty, ing))}; se usan ${esc(describeQty(it.coveredQty, ing))}.</li>`);
  if (it.status === 'cotizado') {
    lines.push(`<li>Falta comprar: <b>${esc(describeQty(it.needQty, ing))}</b>.</li>`);
    if (it.mixed) {
      lines.push(`<li>Se combinan presentaciones porque así se paga menos que con una sola:</li>`);
    }
    for (const l of it.lines) {
      lines.push(`<li>${esc(packText(l.offer))} (${esc(describeQty(l.packQtyBase, ing))}${l.packApprox ? ', aprox.' : ''}): ${l.packs} × ${q(l.offer.priceCents)} = ${q(l.offer.priceCents * l.packs)}${l.promoApplied ? ` → con promoción ${q(l.cents)}` : ''}.</li>`);
    }
    lines.push(`<li>Se compran ${esc(describeQty(it.purchasedQty, ing))} en total (empaques completos, redondeando hacia arriba). A pagar: <b>${q(it.cents)}</b>.</li>`);
    if (it.promoNote) lines.push(`<li>${esc(it.promoNote)}</li>`);
    lines.push(`<li>Valor proporcional de lo que usan las comidas: ${q(it.usedValueCents)}. Sobrará ${esc(describeQty(it.leftover, ing))} (≈ ${q(it.leftoverValueCents)}).</li>`);
  } else if (it.status === 'en-casa') {
    lines.push('<li>No necesitas comprar.</li>');
  } else {
    lines.push(`<li>${esc(it.reason ?? '')}</li>`);
  }
  const notes = [...(it.notes ?? []), ...(it.packNotes ?? []), ...(it.pantryNotes ?? [])];
  return `<details class="explain"><summary>Cómo se calculó</summary>
    <p class="small muted">Usado en:</p><ul class="uses">${uses.join('')}</ul>
    <ol class="calc">${lines.join('')}</ol>
    ${notes.length ? `<p class="small muted">Equivalencias: ${[...new Set(notes)].map(esc).join('; ')}.</p>` : ''}
    ${it.fromFallback ? `<p class="small">Sin precio en la tienda elegida (${esc(STATUS_TEXT[it.primaryStatus] ?? '')}); se usó tu precio registrado.</p>` : ''}
    ${sourceBlock(it.offer, ctx)}
  </details>`;
}

function brandControl(it, ctx) {
  const brands = [...new Set(allOffers(ctx.state).filter((o) => o.ingredientId === it.ingredientId).map((o) => o.brand).filter(Boolean))];
  if (brands.length < 2 && !ctx.state.brandLocks[it.ingredientId]) return '';
  const lock = ctx.state.brandLocks[it.ingredientId] ?? '';
  return `<label class="inline-field small"><span>Marca</span>
    <select data-action="brand-lock" data-ing="${it.ingredientId}" id="brand-${it.ingredientId}">
      <option value="">Aceptar alternativas</option>
      ${brands.map((b) => `<option value="${esc(b)}" ${b === lock ? 'selected' : ''}>Solo ${esc(b)}</option>`).join('')}
    </select></label>`;
}

function promoControl(it, ctx) {
  const o = it.offer;
  if (!o?.promo || o.promo.kind !== 'requisito') return '';
  return `<label class="check small"><input type="checkbox" data-action="accept-promo" data-offer="${esc(o.id)}" ${ctx.state.acceptedPromos[o.id] ? 'checked' : ''}> Cumplo: ${esc(o.promo.text)}</label>`;
}

function itemRow(it, ctx) {
  const ing = it.ingredient;
  const checked = !!ctx.state.checked[it.ingredientId];
  const tone = statusTone[it.status];
  const offer = it.offer;
  const st = offer ? priceStatus(offer, ctx.sessionStart) : null;
  let buy = '';
  if (it.status === 'cotizado') {
    buy = `<p class="buy">${esc(linesText(it))}</p>`;
  } else if (it.status === 'en-casa') {
    buy = '<p class="buy muted">Cubierto con lo que tienes en casa</p>';
  } else {
    buy = `<p class="buy warn-text">${esc(it.reason ?? '')}</p>`;
  }
  return `<li class="item ${checked ? 'done' : ''}">
    <label class="tick"><input type="checkbox" data-action="check-item" data-ing="${it.ingredientId}" ${checked ? 'checked' : ''} aria-label="Marcar ${esc(ing.name)} como comprado"></label>
    <div class="item-main">
      <div class="item-top">
        <h4>${esc(ing.name[0].toUpperCase() + ing.name.slice(1))}</h4>
        <span class="price">${it.status === 'cotizado' ? q(it.cents) : it.status === 'en-casa' ? q(0) : '—'}</span>
      </div>
      <p class="need">Necesitas ${esc(describeQty(it.needQty > 0 ? it.needQty : it.qty, ing))}${it.approx ? ' ≈' : ''}${it.coveredQty > 0 && it.status !== 'en-casa' ? ` <span class="muted">(ya descontado lo de casa)</span>` : ''}</p>
      ${buy}
      <div class="tags">
        <span class="pill ${tone}">${STATUS_TEXT[it.status]}</span>
        ${st && it.status === 'cotizado' ? `<span class="pill ${st.tone}">${st.label}</span>` : ''}
        ${it.promoApplied ? '<span class="pill ok">Promoción aplicada</span>' : ''}
        ${it.mixed ? '<span class="pill">Presentaciones combinadas</span>' : ''}
        ${it.fromFallback ? '<span class="pill user">Mi precio</span>' : ''}
        ${it.status === 'cotizado' && it.leftover > 0 ? `<span class="pill">Sobra ${esc(describeQty(it.leftover, ing))}</span>` : ''}
      </div>
      <div class="item-controls">
        ${brandControl(it, ctx)}
        ${promoControl(it, ctx)}
        ${['sin-precio', 'agotado', 'marca-no-disponible', 'sin-conversion'].includes(it.status) ? `<button class="btn small" data-action="add-price-for" data-ing="${it.ingredientId}">${icon('mas')} Agregar precio</button>` : ''}
      </div>
      ${itemExplain(it, ctx)}
    </div>
  </li>`;
}

export function listText(ctx) {
  const { result, state } = ctx;
  const lines = [`Lista de compras · ${periodText(ctx.days)}`, `Tienda: ${storeLabel(state.stores.primary, state)}`, ''];
  for (const cat of CATEGORIES) {
    const items = result.purchase.items.filter((i) => i.ingredient.cat === cat.id && i.status !== 'en-casa');
    if (!items.length) continue;
    lines.push(`*${cat.label}*`);
    for (const it of items) {
      const mark = state.checked[it.ingredientId] ? '✔' : '☐';
      const detail = it.status === 'cotizado' ? `${linesText(it, { brand: false })} — ${q(it.cents)}` : `${describeQty(it.needQty, it.ingredient)} — ${STATUS_TEXT[it.status].toLowerCase()}`;
      lines.push(`${mark} ${it.ingredient.name}: ${detail}`);
    }
    lines.push('');
  }
  const t = result.purchase.totals;
  lines.push(`Total cotizado: ${q(t.purchaseCents)}${t.missing.length ? ` (faltan ${t.missing.length} por cotizar)` : ''}`);
  if (state.demo && state.stores.primary.startsWith('ejemplo')) lines.push('Nota: precios de ejemplo, ficticios.');
  return lines.join('\n');
}

function singleStore(ctx) {
  const { result, state } = ctx;
  const t = result.purchase.totals;
  const storeOpts = [...state.stores.selected, 'mis-precios'].filter((v, i, a) => a.indexOf(v) === i);
  const groups = CATEGORIES.map((cat) => {
    const items = result.purchase.items.filter((i) => i.ingredient.cat === cat.id);
    if (!items.length) return '';
    const sub = items.reduce((s, i) => s + (i.status === 'cotizado' ? i.cents : 0), 0);
    return `<section class="cat" aria-labelledby="cat-${cat.id}">
      <div class="cat-head"><h3 id="cat-${cat.id}">${cat.label}</h3><span class="muted">${q(sub)}</span></div>
      <ul class="items">${items.map((i) => itemRow(i, ctx)).join('')}</ul>
    </section>`;
  });
  const sample = state.stores.primary.startsWith('ejemplo');
  return `
  <div class="card store-pick">
    <label class="field"><span class="label">Comprar todo en</span>
      <select id="primary-store" data-action="set-primary-select">
        ${storeOpts.map((id) => `<option value="${id}" ${id === state.stores.primary ? 'selected' : ''}>${esc(storeLabel(id, state))}</option>`).join('')}
      </select></label>
    ${state.stores.primary !== 'mis-precios' ? `<label class="field"><span class="label">Mis precios registrados</span>
      <select id="use-my-prices" data-bind="useMyPrices" data-type="str">
        <option value="faltantes" ${state.useMyPrices === 'faltantes' ? 'selected' : ''}>Usarlos solo si falta precio</option>
        <option value="mas-barato" ${state.useMyPrices === 'mas-barato' ? 'selected' : ''}>Usar el más barato</option>
        <option value="no" ${state.useMyPrices === 'no' ? 'selected' : ''}>No usarlos</option>
      </select></label>` : ''}
    ${sample ? `<p class="note">${icon('info')}<span>Precios <b>ficticios de ejemplo</b>. No corresponden a ninguna tienda real.</span></p>` : ''}
  </div>
  <div class="card totals">
    <div class="tot-main"><span class="eyebrow">A pagar</span><span class="big" data-tween="${t.purchaseCents}" data-tween-key="pagar">${q(t.purchaseCents)}</span>
      ${t.missing.length ? `<span class="pill warn">+ ${t.missing.length} sin precio</span>` : '<span class="pill ok">Todo cotizado</span>'}</div>
    <p class="muted small">${t.quoted} de ${t.toBuy} productos cotizados · ${t.inPantry} ya en casa</p>
    <div class="actions">
      <button class="btn" data-action="copy-list">${icon('copiar')} Copiar lista</button>
      <a class="btn" href="https://wa.me/?text=${encodeURIComponent(listText(ctx))}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} Compartir por WhatsApp</a>
    </div>
  </div>
  ${groups.join('')}`;
}

function compareView(ctx) {
  const { result, state } = ctx;
  const cmp = result.comparison;
  if (cmp.rows.length < 2) {
    return `<div class="card"><p>Elige al menos dos supermercados en Ajustes para comparar.</p><button class="btn" data-action="go" data-view="ajustes">Elegir tiendas</button></div>`;
  }
  const max = Math.max(...cmp.rows.map((r) => r.totals.purchaseCents), 1);
  const rows = cmp.rows.map((r) => {
    const win = cmp.winner === r.storeId;
    const t = r.totals;
    return `<li class="cmp-row ${win ? 'winner' : ''} ${t.complete ? '' : 'incomplete'}">
      <div class="cmp-top">
        <h3>${esc(storeLabel(r.storeId, state))}</h3>
        <span class="price">${q(t.purchaseCents)}${t.complete ? '' : '<small> conocido</small>'}</span>
      </div>
      <div class="mini-bar"><span style="width:${((t.purchaseCents / max) * 100).toFixed(1)}%"></span></div>
      <p class="small">${t.quoted} de ${t.toBuy} cotizados
        ${win ? '<span class="pill ok">Más barata con todo cotizado</span>' : ''}
        ${!t.complete ? `<span class="pill warn">Incompleta: no puede ganar</span>` : ''}</p>
      ${t.missing.length ? `<p class="small muted">Faltan: ${t.missing.map((m) => `${esc(m.ingredient.name)} (${STATUS_TEXT[m.status].toLowerCase()})`).join(', ')}</p>` : ''}
      ${r.storeId !== state.stores.primary ? `<button class="btn small" data-action="set-primary" data-store="${r.storeId}">Comprar aquí</button>` : '<span class="pill">Tienda actual</span>'}
    </li>`;
  });
  const eqRows = cmp.equivalences
    .filter((e) => Object.values(e.perStore).some((it) => it.status !== 'en-casa'))
    .map((e) => {
      const any = Object.values(e.perStore)[0];
      const cells = cmp.rows.map((r) => {
        const it = e.perStore[r.storeId];
        if (!it || it.status !== 'cotizado') return `<td data-label="${esc(storeLabel(r.storeId, state))}"><span class="pill ${statusTone[it?.status] ?? 'warn'}">${STATUS_TEXT[it?.status] ?? '—'}</span></td>`;
        return `<td data-label="${esc(storeLabel(r.storeId, state))}"><b>${q(it.cents)}</b><br><span class="small">${esc(linesText(it))}</span><br><span class="small muted">${esc(unitPrice(it.offer, any.ingredient))}</span></td>`;
      });
      const flag = !e.sameProduct ? `<span class="pill">${e.differentPack ? 'Presentaciones distintas' : 'Marcas distintas'}</span>` : '';
      return `<tr><th scope="row">${esc(any.ingredient.name)}<br><span class="small muted">${esc(describeQty(e.needQty, any.ingredient))}</span> ${flag}</th>${cells.join('')}</tr>`;
    });
  return `
  <div class="card">
    <p class="small">Misma lista, mismas cantidades, en cada tienda. ${esc(cmp.winnerReason)}</p>
    <ul class="cmp-list">${rows.join('')}</ul>
  </div>
  <details class="card eq-details" aria-labelledby="eq-title">
    <summary><h3 id="eq-title" class="h3">Qué se compara en cada tienda</h3><span class="small muted">${eqRows.length} productos · marcas, presentaciones y precio por unidad</span></summary>
    <p class="small muted">Cuando las marcas o presentaciones no son iguales se indica. El precio por libra, litro o unidad ayuda a comparar empaques de distinto tamaño; el total usa empaques completos.</p>
    <div class="table-wrap"><table class="eq">
      <thead><tr><th scope="col">Ingrediente</th>${cmp.rows.map((r) => `<th scope="col">${esc(storeLabel(r.storeId, state))}</th>`).join('')}</tr></thead>
      <tbody>${eqRows.join('')}</tbody>
    </table></div>
  </details>`;
}

function combineView(ctx) {
  const { result, state } = ctx;
  const c = result.combination;
  const ids = result.comparison.rows.map((r) => r.storeId);
  const byStore = new Map();
  for (const ch of c.chosen) (byStore.get(ch.storeId) ?? byStore.set(ch.storeId, []).get(ch.storeId)).push(ch.item);
  return `
  <div class="card">
    <p class="small">Cada producto en la tienda donde cuesta menos. Ir a varias tiendas cuesta transporte o envío: sin esos montos, el ahorro no se puede calcular.</p>
    <div class="transport">
      ${ids.map((id) => `<label class="field"><span class="label">Transporte o envío · ${esc(storeLabel(id, state))} (Q)</span>
        <input id="tr-${id}" inputmode="decimal" placeholder="Sin dato" value="${Number.isInteger(state.transport[id]) ? (state.transport[id] / 100).toFixed(2) : ''}" data-bind="transport.${id}" data-type="cents-null"></label>`).join('')}
    </div>
  </div>
  <div class="card totals">
    <div class="tot-main"><span class="eyebrow">Productos combinando tiendas</span><span class="big">${q(c.itemsCents)}</span></div>
    <p class="small">Transporte conocido: ${q(c.transportCents)}${c.unknownTransport.length ? ` · sin dato: ${c.unknownTransport.map((id) => esc(storeLabel(id, state))).join(', ')}` : ''}</p>
    ${c.partial
      ? `<p class="status warn">${icon('alerta')} Comparación parcial. ${esc(c.partialReason ?? '')}${c.grossDifferenceCents !== null ? ` Diferencia solo en productos frente a ${esc(storeLabel(c.bestSingle, state))}: ${q(c.grossDifferenceCents)} (no es ahorro neto).` : ''}</p>`
      : c.netSavingsCents > 0
        ? `<p class="status ok">${icon('check')} Ahorro neto frente a comprar todo en ${esc(storeLabel(c.bestSingle, state))}: ${q(c.netSavingsCents)}, ya contando transporte.</p>`
        : `<p class="status warn">${icon('info')} Combinar no conviene: cuesta ${q(-c.netSavingsCents)} más que comprar todo en ${esc(storeLabel(c.bestSingle, state))}, contando transporte.</p>`}
  </div>
  ${[...byStore].map(([id, items]) => `<section class="card"><h3 class="h3">${esc(storeLabel(id, state))} · ${q(items.reduce((s, i) => s + i.cents, 0))}</h3>
    <ul class="plain">${items.map((i) => `<li>${esc(i.ingredient.name)} — ${esc(linesText(i))} · ${q(i.cents)}</li>`).join('')}</ul></section>`).join('')}
  ${c.missing.length ? `<div class="card banner warn"><p>Sin precio en ninguna tienda: ${c.missing.map((e) => esc(Object.values(e.perStore)[0].ingredient.name)).join(', ')}.</p></div>` : ''}`;
}

export function viewCompras(ctx) {
  const mode = ctx.state.shopMode;
  const tab = (id, label) => `<button role="tab" id="tab-${id}" aria-selected="${mode === id}" aria-controls="shop-panel" class="seg-btn" data-action="shop-mode" data-mode="${id}">${label}</button>`;
  return `
  <div class="toolbar"><h2 class="h2">Compras</h2></div>
  <div class="segmented" role="tablist" aria-label="Forma de comprar">${tab('single', 'Mi supermercado')}${tab('compare', 'Comparar')}${tab('combine', 'Combinar')}</div>
  <div id="shop-panel" role="tabpanel" aria-labelledby="tab-${mode}">
    ${mode === 'single' ? singleStore(ctx) : mode === 'compare' ? compareView(ctx) : combineView(ctx)}
  </div>`;
}

export { sourceBlock, formatDate };
