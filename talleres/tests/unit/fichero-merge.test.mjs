// «Agregar lo nuevo» y validación de relaciones (Fichero).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planMerge, checkRelations } from '../../fichero/src/model.js';

const sheet = (id, projectId, photoIds = [], extra = {}) => ({ id, projectId, title: id, versions: [{ n: 1, data: { measures: [], specs: [], notes: '', photos: photoIds.map((p) => ({ id: p, caption: '' })) } }], draft: null, ...extra });
const empty = () => ({ clients: [], projects: [], sheets: [], photos: [], templates: [] });

test('agregar lo nuevo: no actualiza lo que ya existe aunque la copia sea más reciente', () => {
  const local = { ...empty(), clients: [{ id: 'c1', name: 'Viejo', updatedAt: '2026-01-01' }], projects: [{ id: 'p1', clientId: 'c1' }], sheets: [sheet('s1', 'p1')] };
  const incoming = { ...empty(), clients: [{ id: 'c1', name: 'Nuevo', updatedAt: '2027-01-01' }], projects: [{ id: 'p1', clientId: 'c1' }],
    sheets: [sheet('s1', 'p1', [], { versions: [{ n: 1, data: { measures: [], specs: [], notes: '', photos: [] } }, { n: 2, data: { measures: [], specs: [], notes: 'más nueva', photos: [] } }] })] };
  const plan = planMerge(local, incoming);
  assert.equal(plan.clients.add.length, 0); assert.equal(plan.clients.existing.length, 1);
  assert.equal(plan.sheets.add.length, 0); assert.equal(plan.sheets.existing.length, 1);
  assert.deepEqual(plan.totals, { add: 0, existing: 3, orphan: 0 });
});

test('agregar lo nuevo: cuenta lo que se agrega y lo que se omite por existir', () => {
  const local = { ...empty(), clients: [{ id: 'c1' }], projects: [{ id: 'p1', clientId: 'c1' }] };
  const incoming = { ...empty(), clients: [{ id: 'c1' }, { id: 'c2' }], projects: [{ id: 'p1', clientId: 'c1' }, { id: 'p2', clientId: 'c2' }],
    sheets: [sheet('s1', 'p1', ['f1']), sheet('s2', 'p2')], photos: [{ id: 'f1', sheetId: 's1' }], templates: [{ id: 't1' }] };
  const plan = planMerge(local, incoming);
  assert.deepEqual(['clients', 'projects', 'sheets', 'photos', 'templates'].map((k) => [plan[k].add.length, plan[k].existing.length]), [[1, 1], [1, 1], [2, 0], [1, 0], [1, 0]]);
  assert.deepEqual(plan.totals, { add: 6, existing: 2, orphan: 0 });
});

test('agregar lo nuevo: nunca deja proyectos, fichas ni fotos sin su relación', () => {
  const local = { ...empty(), clients: [{ id: 'c1' }], projects: [{ id: 'p1', clientId: 'c1' }], sheets: [sheet('sLocal', 'p1', ['fFalta'])] };
  const incoming = { ...empty(),
    projects: [{ id: 'pSinCliente', clientId: 'cNoExiste' }],
    sheets: [sheet('sDeHuerfano', 'pSinCliente', ['fH']), sheet('sNoProyecto', 'pX'), sheet('sOk', 'p1', ['fOk'])],
    photos: [{ id: 'fH', sheetId: 'sDeHuerfano' }, { id: 'fOk', sheetId: 'sOk' }, { id: 'fSuelta', sheetId: 'sLocal' }, { id: 'fFalta', sheetId: 'sLocal' }] };
  const plan = planMerge(local, incoming);
  assert.deepEqual(plan.projects.orphan.map((x) => x.id), ['pSinCliente']);
  assert.deepEqual(plan.sheets.add.map((x) => x.id), ['sOk']);
  assert.deepEqual(plan.sheets.orphan.map((x) => x.id), ['sDeHuerfano', 'sNoProyecto']);
  // fOk: su ficha se agrega y la usa. fFalta: repara una foto que la ficha local cita y no tenía.
  assert.deepEqual(plan.photos.add.map((x) => x.id).sort(), ['fFalta', 'fOk']);
  // fH: su ficha no se agrega. fSuelta: ninguna ficha la usa.
  assert.deepEqual(plan.photos.orphan.map((x) => x.id).sort(), ['fH', 'fSuelta']);
  // Comprobación global: tras combinar, todo tiene su padre.
  const final = { clients: [...local.clients, ...plan.clients.add], projects: [...local.projects, ...plan.projects.add], sheets: [...local.sheets, ...plan.sheets.add], photos: [...local.photos, ...plan.photos.add], templates: [] };
  assert.deepEqual(checkRelations(final).errors, []);
});

test('validación: detecta identificadores repetidos o ausentes y relaciones rotas', () => {
  const r = checkRelations({ ...empty(), clients: [{ id: 'c1' }, { id: 'c1' }, { name: 'sin id' }], projects: [{ id: 'p1', clientId: 'cX', name: 'P' }], sheets: [{ id: 's1', projectId: 'p1', title: 'S', versions: [] }], photos: [{ id: 'f1', sheetId: 'sX' }] });
  const t = r.errors.join(' | ');
  assert.match(t, /repetido/); assert.match(t, /sin identificador/); assert.match(t, /«P» no tiene su cliente/); assert.match(t, /no tiene su ficha/);
  assert.deepEqual(checkRelations({ ...empty(), clients: [{ id: 'c1' }], projects: [{ id: 'p1', clientId: 'c1' }], sheets: [sheet('s1', 'p1', ['f1'])], photos: [{ id: 'f1', sheetId: 's1' }] }).errors, []);
});

test('validación: avisa de fotos citadas que no vienen en la copia', () => {
  const r = checkRelations({ ...empty(), clients: [{ id: 'c1' }], projects: [{ id: 'p1', clientId: 'c1' }], sheets: [sheet('s1', 'p1', ['f1', 'f2'])], photos: [{ id: 'f1', sheetId: 's1' }] });
  assert.deepEqual(r.errors, []);
  assert.match(r.warnings[0], /1 foto/);
});
