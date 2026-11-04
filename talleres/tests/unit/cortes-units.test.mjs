// Conversión de unidades, precisión del motor y vigencia del plano (huella completa).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pack, inputKey } from '../../cortes/src/engine.js';
import { verifyPlan } from '../../cortes/src/verify.js';
import { convertProject, exactMm, toGrid } from '../../cortes/src/units.js';
import { demoProject } from '../../cortes/src/demo.js';
import { readZip, textOf } from '../../shared/zip.js';

const proj = (over = {}) => ({ unit: 'cm', material: { name: 'x', width: 100, height: 100, quantity: 1 }, kerf: 0.3, margin: 0, minLeftover: 5, pieces: [{ id: 'a', label: 'A', width: 60, height: 60, qty: 1, rotate: false }], ...over });

// ——— 1. Regresión: el sobrante mínimo cambia el resultado y debe invalidar el plano ———
test('regresión: cambiar el sobrante mínimo de 5 a 50 cm cambia la huella y los sobrantes', () => {
  const p5 = proj({ minLeftover: 5 });
  const r5 = pack(p5);
  assert.ok(r5.sheets[0].leftovers.some((l) => l.w < 50 || l.h < 50), 'con 5 cm hay sobrantes de menos de 50 cm');
  const p50 = { ...structuredClone(p5), minLeftover: 50 };
  assert.notEqual(inputKey(p50), inputKey(p5), 'el plano generado con 5 cm ya no está vigente');
  const r50 = pack(p50);
  for (const l of r50.sheets[0].leftovers) assert.ok(l.w >= 50 && l.h >= 50, `sobrante ${l.code} de ${l.w} × ${l.h} no cumple el mínimo`);
  assert.equal(r50.key, inputKey(p50));
  assert.deepEqual(verifyPlan(p50, r50), []);
});

test('la huella cambia con cada parámetro que afecta el resultado', () => {
  const base = demoProject();
  const k0 = inputKey(base);
  const variants = [
    (p) => { p.kerf = 0.3; }, (p) => { p.margin = 1; }, (p) => { p.minLeftover = 6; }, (p) => { p.material.width = 71; },
    (p) => { p.material.height = 99; }, (p) => { p.material.quantity = 3; }, (p) => { p.pieces[0].qty = 5; },
    (p) => { p.pieces[0].rotate = false; }, (p) => { p.pieces[0].label = 'Otra'; }, (p) => { p.pieces[1].width = 31; },
    (p) => { p.pieces.push({ id: 'n', label: 'Nueva', width: 5, height: 5, qty: 1, rotate: true }); },
    (p) => { Object.assign(p, convertProject(p, 'mm')); },
  ];
  for (const [i, f] of variants.entries()) { const p = structuredClone(base); f(p); assert.notEqual(inputKey(p), k0, `variante ${i}`); }
  const same = structuredClone(base); same.material.name = 'Otro nombre'; same.notes = 'x';
  assert.equal(inputKey(same), k0, 'nombre del material y notas no cambian el plano');
});

test('un plano guardado por la versión 1.0.0 se marca como desactualizado', async () => {
  const files = await readZip(new Uint8Array(readFileSync(new URL('../fixtures/cortes-copia-v1.0.0.zip', import.meta.url))));
  const m = JSON.parse(textOf(files.get('copia.json')));
  const withPlan = m.projects.filter((p) => p.plan);
  assert.ok(withPlan.length >= 2);
  for (const p of withPlan) assert.notEqual(p.plan.key, inputKey(p));
});

// ——— 3. Conversión de unidades ———
test('100 cm → 1000 mm y 25,4 mm → 1 pulgada', () => {
  const mm = convertProject(proj({ material: { width: 100, height: 100, quantity: 1 } }), 'mm');
  assert.equal(mm.unit, 'mm');
  assert.equal(mm.material.width, 1000);
  const q = convertProject({ ...proj(), unit: 'mm', material: { width: 25.4, height: 254, quantity: 1 } }, 'in');
  assert.equal(q.material.width, 1);
  assert.equal(q.material.height, 10);
});

test('convierte separación, margen, sobrante y piezas; no toca cantidades; conserva los pendientes', () => {
  const p = proj({ kerf: 0.3, margin: 0.5, minLeftover: 5, material: { name: 'm', width: 70, height: null, quantity: 4 },
    pieces: [{ id: 'a', label: 'A', width: 19.6, height: null, qty: 8, rotate: true }, { id: 'b', label: 'B', width: null, height: null, qty: 3, rotate: false }] });
  const q = convertProject(p, 'mm');
  assert.deepEqual([q.kerf, q.margin, q.minLeftover, q.material.width], [3, 5, 50, 700]);
  assert.equal(q.material.height, null);
  assert.equal(q.pieces[0].width, 196);
  assert.equal(q.pieces[0].height, null);
  assert.equal(q.pieces[1].width, null);
  assert.deepEqual([q.material.quantity, q.pieces[0].qty, q.pieces[1].qty, q.pieces[1].rotate], [4, 8, 3, false]);
  assert.equal(p.unit, 'cm', 'el original no se modifica');
});

test('ida y vuelta: cm → pulg → mm → cm → pulg (×10) sin pérdida acumulada', () => {
  const p0 = demoProject(); // 70 × 100 cm, 19,6, 0,2, 0,5…
  let p = p0;
  for (let i = 0; i < 10; i++) p = convertProject(convertProject(convertProject(p, 'in'), 'mm'), 'cm');
  assert.equal(p.material.width, 70); assert.equal(p.material.height, 100);
  assert.equal(p.kerf, 0.2); assert.equal(p.margin, 0.5); assert.equal(p.minLeftover, 5);
  assert.deepEqual(p.pieces.map((x) => [x.width, x.height, x.qty]), p0.pieces.map((x) => [x.width, x.height, x.qty]));
  const inch = convertProject(p, 'in');
  assert.equal(inch.pieces[2].width, 7.717); // 19,6 cm = 7,7165… pulg, mostrado con 3 decimales
  assert.equal(exactMm(inch, `pieces.${inch.pieces[2].id}.width`), 196); // el valor exacto se conserva
});

test('un campo editado después de convertir usa el valor nuevo, no el exacto anterior', () => {
  const inch = convertProject(proj({ material: { width: 10, height: 10, quantity: 1 } }), 'in'); // 3,937 pulg
  assert.equal(exactMm(inch, 'material.width'), 100);
  inch.material.width = 4; // la persona escribe 4 pulgadas
  assert.equal(exactMm(inch, 'material.width'), 101.6);
});

test('precisión: una pieza que cabe justo sigue cabiendo en mm y en pulgadas', () => {
  const p = proj({ material: { width: 70, height: 100, quantity: 1 }, kerf: 0.2, margin: 0.5, pieces: [{ id: 'a', label: 'A', width: 69, height: 99, qty: 1, rotate: false }] });
  for (const unit of ['cm', 'mm', 'in']) {
    const q = convertProject(p, unit);
    const r = pack(q);
    assert.equal(r.stats.placed, 1, `cabe en ${unit}`);
    assert.deepEqual(verifyPlan(q, r), [], `verificado en ${unit}`);
  }
  // Y una centésima de milímetro más ya no cabe, en ninguna unidad.
  const big = proj({ material: { width: 70, height: 100, quantity: 1 }, kerf: 0.2, margin: 0.5, pieces: [{ id: 'a', label: 'A', width: 69.001, height: 99, qty: 1, rotate: false }] });
  for (const unit of ['cm', 'mm', 'in']) assert.equal(pack(convertProject(big, unit)).stats.placed, 0, `no cabe en ${unit}`);
});

test('regresión: 30,1 cm con margen 0,5 y pieza de 29,1 cm sigue cabiendo al pasar a pulgadas', () => {
  // Con la versión 1.0.0, redondear cada valor a 3 decimales en pulgadas hacía que la pieza dejara de caber.
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const cm = proj({ material: { width: 30.1, height: 50, quantity: 1 }, kerf: 0.2, margin: 0.5, minLeftover: 0, pieces: [{ id: 'a', label: 'A', width: 29.1, height: 10, qty: 1, rotate: false }] });
  assert.equal(pack(cm).stats.placed, 1);
  const naive = { ...cm, unit: 'in', material: { width: r3(30.1 / 2.54), height: r3(50 / 2.54), quantity: 1 }, kerf: r3(0.2 / 2.54), margin: r3(0.5 / 2.54), pieces: [{ ...cm.pieces[0], width: r3(29.1 / 2.54), height: r3(10 / 2.54) }] };
  assert.equal(pack(naive).stats.placed, 0, 'los números redondeados, sin el valor exacto, describen otra pieza');
  const inch = convertProject(cm, 'in');
  assert.equal(pack(inch).stats.placed, 1);
  assert.deepEqual(verifyPlan(inch, pack(inch)), []);
});

test('precisión: la separación exacta se acepta y una diezmilésima menos se rechaza', () => {
  const p = proj({ material: { width: 100.2, height: 20, quantity: 1 }, kerf: 0.2, margin: 0, pieces: [{ id: 'a', label: 'A', width: 50, height: 20, qty: 2, rotate: false }] });
  const r = pack(p);
  assert.equal(r.stats.placed, 2);
  assert.deepEqual(verifyPlan(p, r), []);
  const bad = structuredClone(r); bad.sheets[0].placements.sort((a, b) => a.x - b.x); bad.sheets[0].placements[1].x -= 0.0001;
  assert.ok(verifyPlan(p, bad).some((m) => /separación/.test(m)));
  // En pulgadas, convertido: el mismo plano sigue verificado.
  const inch = convertProject(p, 'in');
  assert.deepEqual(verifyPlan(inch, pack(inch)), []);
});

test('el verificador rechaza un plano en otra unidad', () => {
  const p = demoProject(); const r = pack(p);
  assert.match(verifyPlan(convertProject(p, 'mm'), r)[0], /genera el plano de nuevo/);
});

test('rejilla exacta: 0,001 de cada unidad es un entero', () => {
  for (const unit of ['mm', 'cm', 'in']) {
    const g = toGrid({ unit, material: { width: 0.001 } }, 'material.width');
    assert.ok(Number.isInteger(g) && g > 0);
  }
});

test('500 proyectos al azar convertidos a pulgadas y mm: el resultado no cambia', () => {
  let seed = 777;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const pick = (a, b) => Math.round((a + rnd() * (b - a)) * 10) / 10;
  for (let t = 0; t < 500; t++) {
    const W = pick(20, 250); const H = pick(20, 250);
    const p = proj({ material: { width: W, height: H, quantity: 1 + Math.floor(rnd() * 3) }, kerf: [0, 0.2, 0.3][Math.floor(rnd() * 3)], margin: [0, 0.5][Math.floor(rnd() * 2)], minLeftover: 3,
      pieces: Array.from({ length: 1 + Math.floor(rnd() * 5) }, (_, i) => ({ id: `p${i}`, label: `P${i}`, width: pick(1, W * 0.9), height: pick(1, H * 0.9), qty: 1 + Math.floor(rnd() * 6), rotate: rnd() > 0.4 })) });
    const ref = pack(p);
    for (const unit of ['mm', 'in']) {
      const q = convertProject(p, unit); const r = pack(q);
      assert.deepEqual(verifyPlan(q, r), [], `caso ${t} en ${unit}`);
      assert.equal(r.stats.placed, ref.stats.placed, `caso ${t}: mismas piezas colocadas en ${unit}`);
      assert.equal(r.stats.sheetsUsed, ref.stats.sheetsUsed, `caso ${t}: mismas planchas en ${unit}`);
    }
  }
});
