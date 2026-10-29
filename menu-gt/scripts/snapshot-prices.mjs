// Captura precios reales de las páginas de producto listadas en
// src/data/product-urls.json, una página cada 3 s, respetando robots.txt.
// Solo acepta presentaciones inequívocas; el resto queda excluido con motivo.
//   NODE_USE_ENV_PROXY=1 node scripts/snapshot-prices.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { lookup } from '../server/server.mjs';
import { SOURCES } from '../server/sources/registry.mjs';
import { allPresentations, decode } from '../server/sources/product-page.mjs';
import { INGREDIENTS } from '../src/data/ingredients.js';
import { toBase } from '../src/engine/units.js';
import { diffSnapshots, diffReport } from './price-diff.mjs';
import PREVIOUS from '../src/data/real-prices.js';

const map = JSON.parse(await readFile(new URL('../src/data/product-urls.json', import.meta.url), 'utf8'));
const reviews = JSON.parse(await readFile(new URL('../src/data/price-reviews.json', import.meta.url), 'utf8').catch(() => '{}'));

const baseQty = (p, ing) => {
  try {
    return toBase(p.packQty, p.packUnit, ing).qty;
  } catch {
    return null;
  }
};

export function classify(record, ing, path, review) {
  const name = record.product;
  const approxWeight = /peso\s*m[aá]ximo|\d[\d.,]*\s*(?:lb|libras?|kg|g)\b[^a-z]{0,4}\(?aprox/i;
  if (approxWeight.test(name) || /peso-maximo|(?:lb|kg)--aprox/.test(path)) {
    return { ok: false, reason: 'peso-variable', detail: 'Se vende por peso variable ("peso máximo" o "aprox."): el cobro real depende de lo que pese.' };
  }
  const fromName = allPresentations(name).find((p) => baseQty(p, ing) !== null) ?? null;
  const spec = record.presentationFromSpec && baseQty(record.presentationFromSpec, ing) !== null ? record.presentationFromSpec : null;
  if (review?.accept) {
    return { ok: true, presentation: { ...review.accept, detectedFrom: `revisión manual: ${review.reason}` } };
  }
  if (fromName && spec) {
    const a = baseQty(fromName, ing);
    const b = baseQty(spec, ing);
    if (Math.abs(a - b) / Math.max(a, b) > 0.02) {
      return { ok: false, reason: 'contradiccion', detail: `El nombre indica "${fromName.detectedFrom}" y la ficha "${spec.detectedFrom}".` };
    }
  }
  const p = fromName ?? spec;
  if (!p) {
    const any = allPresentations(name)[0] ?? record.presentationFromSpec;
    return any
      ? { ok: false, reason: 'sin-conversion', detail: `La presentación "${any.detectedFrom}" no se puede convertir a la unidad del ingrediente.` }
      : { ok: false, reason: 'sin-presentacion', detail: 'Ni el nombre ni la ficha indican el tamaño del empaque.' };
  }
  return { ok: true, presentation: fromName ? p : { ...p, detectedFrom: `ficha: ${p.detectedFrom}` } };
}

if (process.argv[1].endsWith('snapshot-prices.mjs')) {
  // --reclasificar: usa la última captura cruda guardada, sin consultar los sitios.
  const reclassify = process.argv.includes('--reclasificar');
  // --reintentar: vuelve a consultar solo las páginas que fallaron en la última captura
  const retry = process.argv.includes('--reintentar');
  // --solo=la-torre: vuelve a consultar solo esa tienda y conserva lo demás.
  const only = process.argv.find((a) => a.startsWith('--solo='))?.slice(7) ?? null;
  const rawFile = new URL('../data/capturas/ultima-captura.json', import.meta.url);
  const raw = reclassify || only || retry ? JSON.parse(await readFile(rawFile, 'utf8')) : { started: new Date().toISOString(), results: {} };
  const offers = [];
  const excluded = [];
  const started = raw.started;
  for (const storeId of Object.keys(map).filter((k) => !k.startsWith('_'))) {
    const origin = SOURCES[storeId].origin;
    for (const [ingId, paths] of Object.entries(map[storeId])) {
      const ing = INGREDIENTS[ingId];
      for (const path of paths) {
        const url = `${origin}/${path}/p`;
        const failed = !raw.results[url]?.json?.ok && !raw.results[url]?.json?.unavailable;
        const fetchNow = !reclassify && (!only || only === storeId) && (!retry || failed);
        const out = fetchNow ? await lookup({ url, storeId }) : raw.results[url];
        if (!out) continue;
        if (fetchNow) raw.results[url] = { status: out.status, json: out.json };
        const base = { storeId, ingredientId: ingId, url };
        if (!out.json.ok) {
          excluded.push({ ...base, reason: out.json.unavailable ? 'no-disponible' : 'error', detail: out.json.error });
          console.log(`✗ ${storeId} ${ingId}: ${out.json.error}`);
          continue;
        }
        const r = out.json.record;
        const c = classify(r, ing, path, reviews[`${storeId}:${path}`]);
        if (!c.ok) {
          excluded.push({ ...base, product: decode(r.product), priceCents: r.priceCents, reason: c.reason, detail: c.detail });
          console.log(`– ${storeId} ${ingId}: ${r.product} → ${c.reason}`);
          continue;
        }
        offers.push({
          id: `${storeId}-${path}`,
          storeId,
          ingredientId: ingId,
          product: decode(r.product),
          brand: decode(r.brand) || 'Sin marca',
          packQty: c.presentation.packQty,
          packUnit: c.presentation.packUnit,
          presentationSource: c.presentation.detectedFrom,
          priceCents: r.priceCents,
          regularPriceCents: r.regularPriceCents,
          promo: null,
          notes: r.notes,
          availability: r.availability,
          channel: 'online',
          status: 'guardado',
          branch: null,
          branchNote: SOURCES[storeId].branchNote ?? r.branchNote,
          sourceUrl: r.sourceUrl,
          fetchedAt: r.fetchedAt,
        });
        console.log(`✓ ${storeId} ${ingId}: ${r.product} · ${c.presentation.packQty} ${c.presentation.packUnit} · Q${(r.priceCents / 100).toFixed(2)}`);
      }
    }
  }
  if (!reclassify) {
    raw.finished = new Date().toISOString();
    if (only) raw.refreshed = { ...(raw.refreshed ?? {}), [only]: raw.finished };
    await mkdir(new URL('../data/capturas/', import.meta.url), { recursive: true });
    await writeFile(rawFile, JSON.stringify(raw, null, 1));
  }
  const snapshot = { started, finished: raw.finished, method: 'Página pública de producto (JSON-LD y ficha), robots.txt respetado, 1 consulta cada 3 s', offers, excluded };
  await writeFile(
    new URL('../src/data/real-prices.js', import.meta.url),
    `// GENERADO por scripts/snapshot-prices.mjs. Precios reales publicados en línea;\n// no editar a mano. Ver docs/INVESTIGACION-PRECIOS.md.\nexport default ${JSON.stringify(snapshot, null, 1)};\n`,
  );
  console.log(`\n${offers.length} precios aceptados, ${excluded.length} excluidos`);
  const changes = diffSnapshots(PREVIOUS, snapshot);
  await writeFile(new URL('../data/capturas/cambios.md', import.meta.url), diffReport(PREVIOUS, snapshot, changes));
  console.log(`Cambios frente a la captura anterior: ${changes.subio.length} subieron, ${changes.bajo.length} bajaron, ${changes.agotado.length} agotados, ${changes.nuevo.length} nuevos, ${changes.quitado.length} quitados (data/capturas/cambios.md)`);
}
