// Usage: node run.js <rom.gba> <frames> <out.png> [keyScript]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SRC = ['cpu.js', 'bus.js', 'ppu.js', 'apu.js', 'bios.js', 'cart.js', 'gba.js'];
function loadCore() {
  const code = SRC.map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
  return new Function(code + '\nreturn { GBA, CPU, Bus };')();
}

function writePNG(file, w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w * 4; x++) raw[y * (w * 4 + 1) + 1 + x] = rgba[y * w * 4 + x];
  }
  const crcTable = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
  const crc = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]));
}

module.exports = { loadCore, writePNG };

if (require.main === module) {
  const [rom, frames = '120', out = 'out.png'] = process.argv.slice(2);
  const { GBA } = loadCore();
  const gba = new GBA();
  gba.loadRom(new Uint8Array(fs.readFileSync(rom)));
  const t0 = Date.now();
  for (let i = 0; i < +frames; i++) gba.runFrame();
  const dt = Date.now() - t0;
  console.log(`${frames} frames in ${dt} ms (${(frames / (dt / 1000)).toFixed(1)} fps), save=${gba.cart.saveType}, pc=${(gba.cpu.pcAddr >>> 0).toString(16)} t=${gba.cpu.t}`);
  writePNG(out, 240, 160, new Uint8Array(gba.ppu.frame.buffer));
}
