// Release check for the engine: CPU/BIOS/memory/save test ROMs, save round trips, RTC, BIOS HLE and graphics.
// Usage: TESTROMS=<dir> node verify.js [--ref <src dir of an earlier version>] [--out <dir>]
//   TESTROMS must hold jsmolka/gba-tests (gba-tests/) and PeterLemon/GBA (PL/), see bolsillo-advance/audit/testroms.lock and fetch.sh.
//   With --ref, every frame rendered with raw colours and every BIOS result must match that version.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writePNG } = require('./run.js');

const SRC = ['cpu.js', 'bus.js', 'ppu.js', 'apu.js', 'bios.js', 'cart.js', 'gba.js'];
function loadCore(dir) {
  const code = SRC.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  return new Function(code + '\nreturn { GBA };')();
}

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const ROMS = process.env.TESTROMS;
const OUT = opt('--out') || path.join(__dirname, '..', '..', 'out', 'verify');
const NEW = loadCore(path.join(__dirname, '..', 'src'));
const REF = opt('--ref') ? loadCore(opt('--ref')) : null;
fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
const results = [];
function check(group, name, ok, detail = '') {
  results.push({ group, name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} [${group}] ${name}${detail ? ' — ' + detail : ''}`);
}
const sha = buf => crypto.createHash('sha256').update(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength)).digest('hex');

function boot(core, rom, save) {
  const g = new core.GBA();
  g.loadRom(rom);
  if (save) g.cart.setSaveData(save);
  return g;
}
function runFrames(g, n) { for (let i = 0; i < n; i++) g.runFrame(); return g; }
function snap(g, name) { writePNG(path.join(OUT, name + '.png'), 240, 160, new Uint8Array(g.ppu.frame.buffer)); }

// jsmolka tests print "All tests passed" from x=56 or "Failed test NNN" from x=60 on row 76 (mode 4 text)
function jsmolkaVerdict(g) {
  const f = g.ppu.frame, bg = f[0];
  let minX = 240;
  for (let y = 76; y < 84; y++) for (let x = 0; x < 240; x++) if (f[y * 240 + x] !== bg && x < minX) minX = x;
  return minX === 240 ? 'blank' : minX < 59 ? 'passed' : 'failed';
}

function compareWithRef(group, name, rom, frames, save) {
  if (!REF) return;
  const a = runFrames(boot(NEW, rom, save), frames), b = runFrames(boot(REF, rom, save), frames);
  const ha = sha(a.ppu.frame), hb = sha(b.ppu.frame);
  check(group, name + ' = versión de referencia (colores sin corregir)', ha === hb, ha.slice(0, 16));
}

const read = p => new Uint8Array(fs.readFileSync(path.join(ROMS, p)));

// ---------- 1. CPU, BIOS and memory test ROMs ----------
for (const t of ['arm/arm', 'thumb/thumb', 'memory/memory', 'bios/bios']) {
  const rom = read(`gba-tests/${t}.gba`);
  const g = runFrames(boot(NEW, rom), 120);
  snap(g, 'jsmolka-' + t.split('/')[1]);
  check('CPU/BIOS', `gba-tests ${t}`, jsmolkaVerdict(g) === 'passed', jsmolkaVerdict(g));
  compareWithRef('CPU/BIOS', `gba-tests ${t}`, rom, 120);
}

// the verdict reader itself must notice a failure: break one CPU flag on purpose
{
  const g = boot(NEW, read('gba-tests/arm/arm.gba'));
  const sub = g.cpu.sub.bind(g.cpu);
  g.cpu.sub = (a, b, s) => { const r = sub(a, b, s); if (s) g.cpu.v = 0; return r; };
  runFrames(g, 120);
  check('CPU/BIOS', 'control negativo: CPU saboteada -> el test informa del fallo', jsmolkaVerdict(g) === 'failed', jsmolkaVerdict(g));
}

// ---------- 2. Saves ----------
for (const [t, type] of [['save/flash64', 'flash64'], ['save/flash128', 'flash128'], ['save/sram', 'sram'], ['save/none', 'none']]) {
  const rom = read(`gba-tests/${t}.gba`);
  const g = runFrames(boot(NEW, rom), 120);
  snap(g, 'jsmolka-' + t.split('/')[1]);
  check('Guardados', `gba-tests ${t}: tipo detectado ${g.cart.saveType}`, g.cart.saveType === type);
  check('Guardados', `gba-tests ${t}`, jsmolkaVerdict(g) === 'passed', jsmolkaVerdict(g));
  if (type === 'none') continue;
  // round trip: the .sav written by the game, loaded into a fresh console, reads back identical and the test still passes
  const sav = g.cart.getSaveData();
  const h = runFrames(boot(NEW, rom, sav), 120);
  check('Guardados', `${t}: partida recargada idéntica`, sha(sav) === sha(boot(NEW, rom, sav).cart.getSaveData()), `${sav.length} bytes`);
  check('Guardados', `${t}: el test pasa con la partida recargada`, jsmolkaVerdict(h) === 'passed');
  compareWithRef('Guardados', `gba-tests ${t}`, rom, 120);
}

// EEPROM: no test ROM available; drive the serial protocol the way a game's DMA does
{
  const rom = new Uint8Array(0x400); rom.set(Buffer.from('EEPROM_V124'), 0x200);
  const g = boot(NEW, rom);
  const e = g.cart.eeprom;
  check('Guardados', 'EEPROM detectada por la cadena EEPROM_V', !!e && g.cart.saveType === 'eeprom');
  if (e) {
    e.detectSize(81, true); // 64 Kbit: 14-bit addresses
    const bits = (v, n) => Array.from({ length: n }, (_, i) => (v >>> (n - 1 - i)) & 1);
    const payload = [0xDE, 0xAD, 0xBE, 0xEF, 0x01, 0x23, 0x45, 0x67];
    for (const b of [1, 0, ...bits(5, 14), ...payload.flatMap(x => bits(x, 8)), 0]) e.write(b);
    for (const b of [1, 1, ...bits(5, 14), 0]) e.write(b);
    const got = Array.from({ length: 68 }, () => e.read());
    const bytes = Array.from({ length: 8 }, (_, i) => got.slice(4 + i * 8, 12 + i * 8).reduce((a, b) => (a << 1) | b, 0));
    check('Guardados', 'EEPROM 64 Kbit: escribir y leer un bloque', JSON.stringify(bytes) === JSON.stringify(payload), bytes.map(x => x.toString(16)).join(' '));
    const h = boot(NEW, rom, g.cart.getSaveData());
    check('Guardados', 'EEPROM: el bloque sobrevive a exportar/importar', Array.from(h.cart.getSaveData().slice(40, 48)).join() === payload.join());
  }
}

// ---------- 3. RTC (Seiko S-3511 over GPIO, as the games' driver bit-bangs it) ----------
{
  const g = boot(NEW, new Uint8Array(0x200));
  const c = g.cart, W = (o, v) => c.gpioWrite(o, v), R = () => c.gpioRead(0xC4);
  W(0xC8, 1);
  const start = () => { W(0xC4, 1); W(0xC4, 5); }, stop = () => { W(0xC4, 1); W(0xC4, 1); };
  const clock = t => { for (let k = 0; k < 4; k++) W(0xC4, (t << 1) | 4); W(0xC4, (t << 1) | 5); };
  const cmd = v => { for (let i = 7; i >= 0; i--) clock((v >> i) & 1); };
  const data = v => { for (let i = 0; i < 8; i++) clock((v >> i) & 1); };
  const rd = () => { let v = 0; for (let i = 0; i < 8; i++) { for (let k = 0; k < 4; k++) W(0xC4, 4); W(0xC4, 5); v = (v >> 1) | (((R() & 2) >> 1) << 7); } return v; };
  const readTime = () => { W(0xC6, 7); start(); cmd(0x65); W(0xC6, 5); const t = []; for (let i = 0; i < 7; i++) t.push(rd()); stop(); return t; };
  const bcd = v => ((v / 10) | 0) * 16 + v % 10;
  W(0xC6, 7); start(); cmd(0x62); data(0x40); stop();               // control: 24-hour mode
  W(0xC6, 7); start(); cmd(0x63); W(0xC6, 5); const st = rd(); stop();
  check('RTC', 'registro de control leído = 0x40 (24 h)', st === 0x40, '0x' + st.toString(16));
  const now = new Date(), t = readTime();
  const want = [bcd(now.getFullYear() % 100), bcd(now.getMonth() + 1), bcd(now.getDate()), bcd(now.getDay()), bcd(now.getHours()), bcd(now.getMinutes())];
  check('RTC', 'fecha y hora (BCD) = reloj del sistema', t.slice(0, 6).join() === want.join() && t[6] <= 0x59,
    t.map(v => v.toString(16).padStart(2, '0')).join(' '));
  W(0xC6, 7); start(); cmd(0x62); data(0x00); stop();               // 12-hour mode
  const t12 = readTime(), h = now.getHours();
  check('RTC', 'modo 12 h con indicador PM', t12[4] === (bcd(h % 12) | (h >= 12 ? 0x80 : 0)), '0x' + t12[4].toString(16));
  const s = c.getState(true), g2 = boot(NEW, new Uint8Array(0x200)); g2.cart.setState(s);
  check('RTC', 'estado del RTC se conserva en un estado guardado', g2.cart.rtc.control === 0x00 && g2.cart.rtc.transferStep === c.rtc.transferStep);
}

// ---------- 4. BIOS HLE ----------
const BIOS_DIR = 'PL/BIOS';
const plRoms = dir => fs.readdirSync(path.join(ROMS, dir), { recursive: true }).filter(f => f.endsWith('.gba')).sort().map(f => path.join(dir, f));
for (const f of plRoms(BIOS_DIR)) {
  const rom = read(f), g = runFrames(boot(NEW, rom), 120);
  snap(g, 'pl-' + path.basename(f, '.gba'));
  check('BIOS', `${path.basename(f)} se ejecuta y dibuja`, new Set(g.ppu.frame).size > 1);
  compareWithRef('BIOS', path.basename(f), rom, 120);
}
if (REF) {
  // direct calls over a sweep of inputs: Div (incl. division by zero), Sqrt, ArcTan, ArcTan2
  const a = boot(NEW, new Uint8Array(0x200)), b = boot(REF, new Uint8Array(0x200));
  const call = (g, n, r0, r1) => { const r = g.cpu.r; r[0] = r0; r[1] = r1; r[3] = 0; g.bios.call(n); return [r[0], r[1], r[3]].join(); };
  let diff = 0, n = 0;
  for (let i = -300; i <= 300; i += 7) for (let j = -40; j <= 40; j += 3) {
    for (const swi of [0x06, 0x08, 0x09, 0x0A]) { n++; if (call(a, swi, i * 977, j * 131) !== call(b, swi, i * 977, j * 131)) diff++; }
  }
  check('BIOS', `Div/Sqrt/ArcTan/ArcTan2: ${n} llamadas idénticas a la referencia`, diff === 0, diff + ' diferencias');
}

// ---------- 5. Graphics ----------
const lcd = plRoms('PL/LCD');
const gfx = [...lcd, 'gba-tests/ppu/hello.gba', 'gba-tests/ppu/shades.gba', 'gba-tests/ppu/stripes.gba', 'PL/HelloWorld/HelloWorld.gba', 'PL/Myst/Myst.gba', 'PL/3DEngine/3DEngine.gba'];
for (const f of gfx) {
  const rom = read(f), g = runFrames(boot(NEW, rom), 180);
  snap(g, 'gfx-' + path.basename(f, '.gba'));
  check('Gráficos', `${path.basename(f)} dibuja`, new Set(g.ppu.frame).size > 1, new Set(g.ppu.frame).size + ' colores');
  compareWithRef('Gráficos', path.basename(f), rom, 180);
}
// colour option: raw path unchanged, "LCD look" sane, old profile gone
{
  const g = boot(NEW, new Uint8Array(0x200)), p = g.ppu;
  const raw = p.lut.slice();
  p.setColorCorrection(true); const lcdLut = p.lut.slice();
  p.setColorCorrection(false);
  check('Gráficos', 'colores sin corregir: 5 bits -> 8 bits exacto', raw.every((v, c) => { const r = c & 31; return (v & 0xFF) === ((r << 3) | (r >> 2)); }) && sha(p.lut) === sha(raw));
  const ch = (v, k) => (v >>> (8 * k)) & 0xFF;
  const gray = i => i | (i << 5) | (i << 10);
  let neutral = true, mono = true;
  for (let i = 0; i < 32; i++) {
    const v = lcdLut[gray(i)];
    if (ch(v, 0) !== ch(v, 1) || ch(v, 1) !== ch(v, 2)) neutral = false;
    if (i && ch(v, 0) <= ch(lcdLut[gray(i - 1)], 0)) mono = false;
  }
  check('Gráficos', 'modo LCD: grises neutros y rampa creciente', neutral && mono);
  check('Gráficos', 'modo LCD: negro = 0 y blanco atenuado', ch(lcdLut[0], 0) === 0 && ch(lcdLut[0x7FFF], 0) < 255, 'blanco=' + ch(lcdLut[0x7FFF], 0));
  if (REF) {
    const o = boot(REF, new Uint8Array(0x200)).ppu; o.setColorCorrection(true);
    check('Gráficos', 'modo LCD distinto del perfil anterior', sha(o.lut) !== sha(lcdLut));
  }
  const s = runFrames(boot(NEW, read('PL/LCD/BG/BGMode7/BGMode7.gba')), 180);
  s.ppu.setColorCorrection(true); s.runFrame(); snap(s, 'color-lcd-BGMode7');
  s.ppu.setColorCorrection(false); s.runFrame(); snap(s, 'color-raw-BGMode7');
}

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ date: new Date().toISOString(), ref: !!REF, failures, results }, null, 1));
console.log(`\n${results.length - failures}/${results.length} comprobaciones correctas`);
process.exit(failures ? 1 : 0);
