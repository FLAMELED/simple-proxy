import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataFromTemplate, diffData, commitVersion, sameData, clone, search, validateManifest, planMerge, reviewData, BACKUP_KIND } from '../../fichero/src/model.js';
import { BUILTIN_TEMPLATES } from '../../fichero/src/templates.js';

const tpl = BUILTIN_TEMPLATES[0];

test('plantillas: ninguna medida trae valor', () => {
  for (const t of BUILTIN_TEMPLATES) {
    const d = dataFromTemplate(t);
    assert.ok(d.measures.length > 0);
    assert.ok(d.measures.every((m) => m.value === null));
    assert.ok(d.specs.every((s) => s.value === ''));
  }
});

test('versiones: corregir una medida crea versión 2 y el cambio es legible', () => {
  const sheet = { versions: [], draft: null };
  const d1 = dataFromTemplate(tpl); d1.measures[0].value = 180;
  assert.equal(commitVersion(sheet, d1, 'Primera', '2026-01-01T10:00:00Z'), true);
  const d2 = clone(d1); d2.measures[0].value = 182;
  assert.equal(commitVersion(sheet, d2, 'Corrección', '2026-01-02T10:00:00Z'), true);
  assert.equal(sheet.versions.length, 2);
  assert.equal(sheet.versions[0].data.measures[0].value, 180, 'la versión 1 se conserva');
  const changes = diffData(sheet.versions[0].data, sheet.versions[1].data);
  assert.deepEqual(changes.map((c) => c.text), ['Ancho de ventana: 180 cm → 182 cm']);
});

test('versiones: guardar sin cambios no crea versión', () => {
  const sheet = { versions: [] };
  const d = dataFromTemplate(tpl);
  commitVersion(sheet, d, '', 'a');
  assert.equal(commitVersion(sheet, clone(d), '', 'b'), false);
  assert.equal(sheet.versions.length, 1);
});

test('diff: vacío a cero es un cambio, y se muestra así', () => {
  const a = dataFromTemplate(tpl); const b = clone(a); b.measures[4].value = 0;
  assert.equal(sameData(a, b), false);
  assert.deepEqual(diffData(a, b).map((c) => c.text), ['Del techo al riel: Sin dato → 0 cm']);
});

test('diff: campos agregados, quitados, especificaciones y fotos', () => {
  const a = dataFromTemplate(tpl); const b = clone(a);
  b.measures.push({ id: 'n1', label: 'Alto de zócalo', unit: 'cm', value: 12 });
  b.measures.splice(1, 1);
  b.specs[1].value = 'Lino';
  b.photos.push({ id: 'f1', caption: '' });
  const t = diffData(a, b).map((c) => c.text);
  assert.ok(t.includes('Medida agregada: Alto de zócalo = 12 cm'));
  assert.ok(t.includes('Medida quitada: Alto de ventana (era Sin dato)'));
  assert.ok(t.includes('Tela: Sin dato → Lino'));
  assert.ok(t.includes('Se agregó 1 foto.'));
});

test('revisión: lista medidas sin dato', () => {
  const d = dataFromTemplate(tpl); d.measures[0].value = 0;
  const r = reviewData(d);
  assert.ok(!r.missing.includes('Ancho de ventana'), 'cero no cuenta como faltante');
  assert.equal(r.missing.length, d.measures.length - 1);
});

test('búsqueda: sin acentos ni mayúsculas, por cliente o proyecto', () => {
  const data = {
    clients: [{ id: 'c1', name: 'Lucía Ramírez' }, { id: 'c2', name: 'Pedro' }],
    projects: [{ id: 'p1', clientId: 'c1', name: 'Cortinas sala y comedor' }, { id: 'p2', clientId: 'c2', name: 'Sofá' }],
    sheets: [{ id: 's1', projectId: 'p1', title: 'Ventana sala' }],
  };
  assert.equal(search('lucia', data).clients.length, 1);
  assert.equal(search('lucia', data).projects.length, 1, 'proyecto encontrado por nombre de cliente');
  assert.equal(search('sofa', data).projects[0].id, 'p2');
  assert.equal(search('ramirez sala', data).sheets.length, 1);
  assert.equal(search('xyz', data).clients.length, 0);
});

test('copias: valida formato y versión', () => {
  assert.throws(() => validateManifest({ kind: 'otra' }), /no es una copia/);
  assert.throws(() => validateManifest({ kind: BACKUP_KIND, schema: 99 }), /más nueva/);
  const ok = { kind: BACKUP_KIND, schema: 1, clients: [], projects: [], sheets: [], photos: [], templates: [] };
  assert.equal(validateManifest(ok), ok);
});

test('copias: combinar nunca sobrescribe lo existente', () => {
  const v = (photos = []) => [{ n: 1, data: { measures: [], specs: [], notes: '', photos } }];
  const local = { clients: [{ id: 'a' }], projects: [{ id: 'p0', clientId: 'a' }], sheets: [{ id: 's1', projectId: 'p0', versions: v() }], photos: [], templates: [] };
  const inc = { clients: [{ id: 'a' }, { id: 'b' }], projects: [{ id: 'p', clientId: 'b' }], sheets: [{ id: 's1', projectId: 'p0', versions: v() }, { id: 's2', projectId: 'p', versions: v([{ id: 'f' }]) }], photos: [{ id: 'f', sheetId: 's2' }], templates: [] };
  const plan = planMerge(local, inc);
  assert.deepEqual(plan.clients.add.map((x) => x.id), ['b']);
  assert.equal(plan.clients.kept, 1);
  assert.deepEqual(plan.sheets.add.map((x) => x.id), ['s2']);
});
