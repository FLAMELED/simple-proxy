import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pack, validate, pieceCode, inputKey } from '../../cortes/src/engine.js';
import { verifyPlan, isGuillotine } from '../../cortes/src/verify.js';
import { demoProject } from '../../cortes/src/demo.js';

const base = (over = {}) => ({ unit: 'cm', material: { width: 100, height: 50, quantity: 1 }, kerf: 0, margin: 0, minLeftover: 0, pieces: [], ...over });
const pc = (id, width, height, qty = 1, rotate = true, label = id) => ({ id, label, width, height, qty, rotate });

test('ejemplo del taller: 23 piezas en 2 planchas, verificado', () => {
  const p = demoProject();
  const r = pack(p);
  assert.equal(r.ok, true);
  assert.equal(r.stats.total, 23);
  assert.equal(r.stats.placed, 23);
  assert.equal(r.stats.sheetsUsed, 2);
  assert.equal(r.stats.piecesArea, 4 * 600 + 8 * 240 + 8 * 19.6 * 8 + 3 * 875);
  assert.deepEqual(verifyPlan(p, r), []);
  // Los fondos de cuadro (no girar) conservan su orientación
  for (const s of r.sheets) for (const x of s.placements.filter((q) => q.type === 'D')) assert.deepEqual([x.w, x.h, x.rotated], [25, 35, false]);
});

test('ejemplo con una sola plancha: quedan pendientes por falta de material', () => {
  const p = demoProject(); p.material.quantity = 1;
  const r = pack(p);
  assert.ok(r.stats.pending > 0);
  assert.ok(r.pending.every((x) => x.reason === 'material'));
  assert.equal(r.stats.placed + r.stats.pending, 23);
  assert.deepEqual(verifyPlan(p, r), []);
});

test('pieza más grande que el material queda pendiente con motivo', () => {
  const p = base({ pieces: [pc('a', 120, 10), pc('b', 10, 10)] });
  const r = pack(p);
  assert.equal(r.pending.length, 1);
  assert.equal(r.pending[0].code, 'A1');
  assert.equal(r.pending[0].reason, 'size');
  assert.deepEqual(verifyPlan(p, r), []);
});

test('restricción de giro: cabe solo girada', () => {
  const p = base({ pieces: [pc('a', 40, 90, 1, false)] }); // 40 de ancho × 90 de largo en material 100 × 50
  assert.equal(pack(p).pending[0].reason, 'size-norotate');
  p.pieces[0].rotate = true;
  const r = pack(p);
  assert.equal(r.pending.length, 0);
  assert.equal(r.sheets[0].placements[0].rotated, true);
  assert.deepEqual([r.sheets[0].placements[0].w, r.sheets[0].placements[0].h], [90, 40]);
  assert.deepEqual(verifyPlan(p, r), []);
});

test('sin giro, las piezas nunca aparecen giradas', () => {
  const p = base({ material: { width: 60, height: 60, quantity: 3 }, kerf: 0.3, pieces: [pc('a', 10, 25, 9, false), pc('b', 25, 10, 6, false)] });
  const r = pack(p);
  for (const s of r.sheets) for (const x of s.placements) assert.equal(x.rotated, false);
  assert.deepEqual(verifyPlan(p, r), []);
});

test('separación de corte: 2 piezas de 50 no caben en 100 si el corte quita 0,3', () => {
  const tight = base({ material: { width: 100, height: 20, quantity: 1 }, pieces: [pc('a', 50, 20, 2, false)] });
  assert.equal(pack(tight).stats.placed, 2, 'sin separación caben justo');
  tight.kerf = 0.3;
  const r = pack(tight);
  assert.equal(r.stats.placed, 1);
  assert.equal(r.pending[0].reason, 'material');
});

test('margen: la pieza que ocupa toda el área útil cabe; un milímetro más no', () => {
  const p = base({ material: { width: 70, height: 100, quantity: 1 }, margin: 0.5, kerf: 0.2, pieces: [pc('a', 69, 99)] });
  const r = pack(p);
  assert.equal(r.stats.placed, 1);
  assert.deepEqual([r.sheets[0].placements[0].x, r.sheets[0].placements[0].y], [0.5, 0.5]);
  assert.deepEqual(verifyPlan(p, r), []);
  p.pieces[0].width = 69.1;
  assert.equal(pack(p).stats.placed, 0);
});

test('milímetros y pulgadas con decimales, sin errores de redondeo', () => {
  const mm = base({ unit: 'mm', material: { width: 1220, height: 2440, quantity: 1 }, kerf: 3.2, margin: 10, pieces: [pc('a', 600, 400, 5), pc('b', 297.5, 210, 4)] });
  assert.deepEqual(verifyPlan(mm, pack(mm)), []);
  const inch = base({ unit: 'in', material: { width: 48, height: 96, quantity: 1 }, kerf: 0.125, margin: 0.25, pieces: [pc('a', 23.875, 11.75, 6)] });
  const r = pack(inch);
  assert.equal(r.stats.placed, 6);
  assert.deepEqual(verifyPlan(inch, r), []);
});

test('sobrantes: no se cruzan con piezas y respetan el mínimo útil', () => {
  const p = base({ material: { width: 100, height: 100, quantity: 1 }, kerf: 0.5, minLeftover: 10, pieces: [pc('a', 60, 60)] });
  const r = pack(p);
  assert.ok(r.sheets[0].leftovers.length >= 2);
  for (const l of r.sheets[0].leftovers) assert.ok(l.w >= 10 && l.h >= 10);
  const total = r.sheets[0].leftovers.reduce((a, l) => a + l.w * l.h, 0);
  assert.ok(total < 100 * 100 - 3600, 'los sobrantes no cuentan el área de la pieza');
  assert.deepEqual(verifyPlan(p, r), []);
});

test('validación: mensajes claros y sin calcular', () => {
  const r = pack(base({ material: { width: null, height: 50, quantity: 0 }, kerf: null, pieces: [pc('a', 0, 10, 1.5)] }));
  assert.equal(r.ok, false);
  const msgs = r.errors.map((e) => e.message).join(' | ');
  assert.match(msgs, /ancho del material/);
  assert.match(msgs, /cuántas planchas/);
  assert.match(msgs, /separación/);
  assert.match(msgs, /falta el ancho/);
  assert.match(msgs, /número entero/);
  assert.match(validate(base({ margin: 30, pieces: [pc('a', 1, 1)] }))[0].message, /no deja espacio/);
});

test('códigos de pieza: A…Z, AA…', () => {
  assert.equal(pieceCode(0), 'A'); assert.equal(pieceCode(25), 'Z'); assert.equal(pieceCode(26), 'AA'); assert.equal(pieceCode(27), 'AB');
});

test('determinista: mismas entradas, mismo plano', () => {
  const p = demoProject();
  assert.deepEqual(pack(p), pack(demoProject()));
  assert.equal(inputKey(p), inputKey(demoProject()));
});

test('el verificador detecta errores (superposición, giro no permitido, cantidades, fuera del borde)', () => {
  const p = base({ material: { width: 100, height: 50, quantity: 1 }, kerf: 0.2, pieces: [pc('a', 20, 10, 2, false)] });
  const r = pack(p);
  const bad = structuredClone(r);
  bad.sheets[0].placements[1].x = bad.sheets[0].placements[0].x + 5;
  bad.sheets[0].placements[1].y = bad.sheets[0].placements[0].y;
  assert.ok(verifyPlan(p, bad).some((m) => /separación/.test(m)));
  const rot = structuredClone(r); Object.assign(rot.sheets[0].placements[0], { w: 10, h: 20, rotated: true });
  assert.ok(verifyPlan(p, rot).some((m) => /no se permite girarla/.test(m)));
  const miss = structuredClone(r); miss.sheets[0].placements.pop();
  assert.ok(verifyPlan(p, miss).some((m) => /se pidieron 2/.test(m)));
  const out = structuredClone(r); out.sheets[0].placements[0].x = 95;
  assert.ok(verifyPlan(p, out).some((m) => /se sale/.test(m)));
});

test('guillotina: detecta una distribución en molinete', () => {
  const pinwheel = [{ x: 0, y: 0, w: 2, h: 1 }, { x: 2, y: 0, w: 1, h: 2 }, { x: 1, y: 2, w: 2, h: 1 }, { x: 0, y: 1, w: 1, h: 2 }, { x: 1, y: 1, w: 1, h: 1 }];
  assert.equal(isGuillotine(pinwheel), false);
  assert.equal(isGuillotine([{ x: 0, y: 0, w: 1, h: 1 }, { x: 1, y: 0, w: 1, h: 1 }, { x: 0, y: 1, w: 2, h: 1 }]), true);
});

test('500 proyectos al azar: todos los planos pasan la verificación', () => {
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const pick = (a, b, step = 0.5) => Math.round((a + rnd() * (b - a)) / step) * step;
  for (let t = 0; t < 500; t++) {
    const W = pick(20, 250, 1); const H = pick(20, 250, 1);
    const p = base({
      material: { width: W, height: H, quantity: 1 + Math.floor(rnd() * 3) },
      kerf: [0, 0.2, 0.3, 1][Math.floor(rnd() * 4)], margin: [0, 0.5, 1][Math.floor(rnd() * 3)], minLeftover: 3,
      pieces: Array.from({ length: 1 + Math.floor(rnd() * 6) }, (_, i) => pc(`p${i}`, pick(1, W * 0.9), pick(1, H * 0.9), 1 + Math.floor(rnd() * 8), rnd() > 0.4)),
    });
    const r = pack(p);
    assert.equal(r.ok, true);
    const problems = verifyPlan(p, r);
    assert.deepEqual(problems, [], `caso ${t}: ${JSON.stringify(p)}`);
    assert.equal(r.stats.placed + r.stats.pending, r.stats.total);
  }
});
