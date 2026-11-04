import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeZip, readZip, crc32, textOf } from '../../shared/zip.js';
import { parseAmount, formatAmount } from '../../shared/numbers.js';
import { deflateRawSync } from 'node:zlib';

test('crc32 conocido', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('zip: ida y vuelta conserva bytes y nombres con acentos', async () => {
  const bin = new Uint8Array(5000).map((_, i) => (i * 7) & 255);
  const z = writeZip([{ name: 'copia.json', data: '{"a":"ñandú"}' }, { name: 'fotos/foto-1.jpg', data: bin }]);
  const files = await readZip(z);
  assert.equal(textOf(files.get('copia.json')), '{"a":"ñandú"}');
  assert.deepEqual(files.get('fotos/foto-1.jpg'), bin);
});

test('zip: detecta archivo dañado', async () => {
  const z = writeZip([{ name: 'a.txt', data: 'hola mundo' }]);
  z[35] ^= 0xff; // cambia un byte del contenido
  await assert.rejects(readZip(z), /dañada/);
});

test('zip: rechaza algo que no es zip', async () => {
  await assert.rejects(readZip(new TextEncoder().encode('esto no es una copia')), /no es una copia/);
});

test('zip: lee entradas comprimidas con deflate', async () => {
  // Arma un zip con una entrada deflate a mano, como lo haría otra herramienta.
  const data = new TextEncoder().encode('texto '.repeat(200));
  const comp = deflateRawSync(data);
  const stored = writeZip([{ name: 'x.txt', data }]);
  const dv = new DataView(stored.buffer);
  // Reconstruye con el contenido comprimido.
  const name = new TextEncoder().encode('x.txt');
  const lh = new Uint8Array(stored.subarray(0, 30)); const ldv = new DataView(lh.buffer);
  ldv.setUint16(8, 8, true); ldv.setUint32(18, comp.length, true);
  const ch = new Uint8Array(stored.subarray(30 + name.length + data.length, 30 + name.length + data.length + 46)); const cdv = new DataView(ch.buffer);
  cdv.setUint16(10, 8, true); cdv.setUint32(20, comp.length, true);
  const end = new Uint8Array(stored.subarray(stored.length - 22)); const edv = new DataView(end.buffer);
  edv.setUint32(16, 30 + name.length + comp.length, true);
  const parts = [lh, name, comp, ch, name, end];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let p = 0; for (const x of parts) { out.set(x, p); p += x.length; }
  assert.ok(dv); // evita lint
  const files = await readZip(out);
  assert.equal(textOf(files.get('x.txt')), 'texto '.repeat(200));
});

test('números: vacío es null y cero es 0', () => {
  assert.deepEqual(parseAmount(''), { ok: true, value: null });
  assert.deepEqual(parseAmount('   '), { ok: true, value: null });
  assert.deepEqual(parseAmount('0'), { ok: true, value: 0 });
  assert.deepEqual(parseAmount('0,0'), { ok: true, value: 0 });
  assert.equal(formatAmount(null, 'cm'), 'Sin dato');
  assert.equal(formatAmount(0, 'cm'), '0 cm');
});

test('números: coma y punto decimales', () => {
  assert.equal(parseAmount('182,5').value, 182.5);
  assert.equal(parseAmount('182.5').value, 182.5);
  assert.equal(formatAmount(182.5, 'cm', ','), '182,5 cm');
});

test('números: rechaza texto, negativos y casos ambiguos', () => {
  assert.equal(parseAmount('abc').ok, false);
  assert.equal(parseAmount('12cm').ok, false);
  assert.equal(parseAmount('-3').ok, false);
  assert.equal(parseAmount('1.250', { unit: 'mm' }).ok, false);
  assert.match(parseAmount('1.250', { unit: 'cm' }).error, /1250 o 1\.25/);
  assert.equal(parseAmount('1.250', { unit: 'm' }).value, 1.25);
  assert.equal(parseAmount('2.5', { integer: true }).ok, false);
});
