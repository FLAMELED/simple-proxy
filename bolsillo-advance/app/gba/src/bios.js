// High-level emulation of the GBA BIOS (no copyrighted BIOS image needed)

const BIOS_IRQ_HANDLER = [
  0xE92D500F, // 0x18 stmfd sp!, {r0-r3, r12, lr}
  0xE3A00301, // 0x1C mov r0, #0x04000000
  0xE28FE000, // 0x20 add lr, pc, #0
  0xE510F004, // 0x24 ldr pc, [r0, #-4]
  0xE8BD500F, // 0x28 ldmfd sp!, {r0-r3, r12, lr}
  0xE25EF004, // 0x2C subs pc, lr, #4
];

const SINE_TABLE = new Int16Array(256);
for (let i = 0; i < 256; i++) SINE_TABLE[i] = Math.round(Math.sin(i * Math.PI / 128) * 0x4000);

class BIOS {
  constructor(gba) {
    this.gba = gba;
    const b = gba.bus.bios32;
    b[0] = 0xEA000000 | 0; // reset vector (unused)
    b[2] = 0xE1B0F00E | 0; // swi vector: movs pc, lr (unused, swi is HLE)
    for (let i = 0; i < BIOS_IRQ_HANDLER.length; i++) b[6 + i] = BIOS_IRQ_HANDLER[i] | 0;
    b[0x34 >>> 2] = 0xE55EC002 | 0; // value seen on the bus after returning from an IRQ
  }

  call(n) {
    const g = this.gba, cpu = g.cpu, bus = g.bus, r = cpu.r;
    bus.cycles += 8;
    bus.biosLast = 0xE3A02004 | 0;
    switch (n) {
      case 0x00: this.softReset(); break;
      case 0x01: this.registerRamReset(r[0]); break;
      case 0x02: cpu.halted = true; break;
      case 0x03: cpu.halted = true; break;
      case 0x04: this.intrWait(r[0], r[1]); break;
      case 0x05: r[0] = 1; r[1] = 1; this.intrWait(1, 1); break;
      case 0x06: this.div(r[0], r[1]); break;
      case 0x07: this.div(r[1], r[0]); break;
      case 0x08: r[0] = Math.floor(Math.sqrt(r[0] >>> 0)); break;
      case 0x09: r[0] = this.arctan(r[0]); r[3] = this.atanB; break;
      case 0x0A: r[0] = this.arctan2(r[0], r[1]); break;
      case 0x0B: this.cpuSet(r[0], r[1], r[2]); break;
      case 0x0C: this.cpuFastSet(r[0], r[1], r[2]); break;
      case 0x0D: r[0] = 0xBAAE187F | 0; break;
      case 0x0E: this.bgAffineSet(r[0], r[1], r[2]); break;
      case 0x0F: this.objAffineSet(r[0], r[1], r[2], r[3]); break;
      case 0x10: this.bitUnpack(r[0], r[1], r[2]); break;
      case 0x11: this.lz77(r[0], r[1], false); break;
      case 0x12: this.lz77(r[0], r[1], true); break;
      case 0x13: this.huffman(r[0], r[1]); break;
      case 0x14: this.rle(r[0], r[1], false); break;
      case 0x15: this.rle(r[0], r[1], true); break;
      case 0x16: this.diffUnfilter(r[0], r[1], 1, false); break;
      case 0x17: this.diffUnfilter(r[0], r[1], 1, true); break;
      case 0x18: this.diffUnfilter(r[0], r[1], 2, true); break;
      case 0x19: break; // SoundBias
      case 0x1F: r[0] = this.midiKey2Freq(r[0], r[1], r[2]); break;
      default: break; // sound driver / multiboot etc. are not needed
    }
  }

  softReset() {
    const g = this.gba, cpu = g.cpu, bus = g.bus;
    const flag = bus.iwram[0x7FFA];
    for (let i = 0x7E00; i < 0x8000; i++) bus.iwram[i] = 0;
    cpu.switchMode(MODE_SVC); cpu.r[13] = 0x03007FE0; cpu.r[14] = 0; cpu.setSPSR(0);
    cpu.switchMode(MODE_IRQ); cpu.r[13] = 0x03007FA0; cpu.r[14] = 0; cpu.setSPSR(0);
    cpu.switchMode(MODE_SYS); cpu.r[13] = 0x03007F00;
    for (let i = 0; i < 13; i++) cpu.r[i] = 0;
    cpu.r[14] = 0;
    cpu.n = cpu.z = cpu.c = cpu.v = 0; cpu.i = 0; cpu.f = 0;
    cpu.t = 0;
    cpu.setPC(flag ? 0x02000000 : 0x08000000);
  }

  registerRamReset(flags) {
    const bus = this.gba.bus;
    if (flags & 0x01) bus.ewram.fill(0);
    if (flags & 0x02) bus.iwram.fill(0, 0, 0x7E00);
    if (flags & 0x04) bus.pal.fill(0);
    if (flags & 0x08) bus.vram.fill(0);
    if (flags & 0x10) bus.oam.fill(0);
    if (flags & 0x80) {
      for (let off = 0; off < 0x60; off += 2) bus.ioWrite16(off, 0);
      bus.ioWrite16(0x20, 0x100); bus.ioWrite16(0x26, 0x100);
      bus.ioWrite16(0x30, 0x100); bus.ioWrite16(0x36, 0x100);
      bus.ioWrite16(0x0, 0x80);
    }
    if (flags & 0x40) {
      for (let off = 0x60; off < 0xA8; off += 2) bus.ioWrite16(off, 0);
    }
  }

  intrWait(discard, mask) {
    const g = this.gba, cpu = g.cpu, bus = g.bus;
    bus.ime = 1; bus.updateIrq();
    const iw = bus.iwram16;
    const FLAGS = 0x7FF8 >>> 1;
    if (!cpu.intrWait && discard) iw[FLAGS] &= ~mask;
    const hit = iw[FLAGS] & mask;
    if (hit) {
      iw[FLAGS] &= ~hit;
      cpu.intrWait = false;
      return;
    }
    // Wait: halt and re-execute this SWI after the interrupt handler returns.
    cpu.intrWait = true;
    cpu.halted = true;
    cpu.branched = true; // PC is left pointing at this SWI
  }

  div(num, den) {
    const r = this.gba.cpu.r;
    if (den === 0) {
      r[0] = num < 0 ? -1 : 1; r[1] = num; r[3] = 1;
      return;
    }
    const q = (num / den) | 0;
    r[0] = q; r[1] = (num - Math.imul(q, den)) | 0; r[3] = Math.abs(q) | 0;
  }

  arctan(i) {
    const a = -(Math.imul(i, i) >> 14);
    let b = (Math.imul(0xA9, a) >> 14) + 0x390;
    b = (Math.imul(b, a) >> 14) + 0x91C;
    b = (Math.imul(b, a) >> 14) + 0xFB6;
    b = (Math.imul(b, a) >> 14) + 0x16AA;
    b = (Math.imul(b, a) >> 14) + 0x2081;
    b = (Math.imul(b, a) >> 14) + 0x3651;
    b = (Math.imul(b, a) >> 14) + 0xA2F9;
    this.gba.cpu.r[1] = a;
    this.atanB = b;
    return ((Math.imul(i, b) >> 16) << 16) >> 16;
  }

  arctan2(x, y) {
    const at = v => this.arctan(v);
    const q = (n, d) => (n / d) | 0;
    let res;
    if (!y) res = x >= 0 ? 0 : 0x8000;
    else if (!x) res = y >= 0 ? 0x4000 : 0xC000;
    else if (y >= 0) {
      if (x >= 0) {
        if (x >= y) res = at(q(y << 14, x));
        else res = 0x4000 - at(q(x << 14, y));
      } else if (-x >= y) res = at(q(y << 14, x)) + 0x8000;
      else res = 0x4000 - at(q(x << 14, y));
    } else {
      if (x <= 0) {
        if (-x > -y) res = at(q(y << 14, x)) + 0x8000;
        else res = 0xC000 - at(q(x << 14, y));
      } else if (x >= -y) res = at(q(y << 14, x)) + 0x10000;
      else res = 0xC000 - at(q(x << 14, y));
    }
    this.gba.cpu.r[3] = 0x170;
    return res & 0xFFFF;
  }

  cpuSet(src, dst, cnt) {
    const bus = this.gba.bus;
    const count = cnt & 0x1FFFFF;
    const fill = cnt & (1 << 24);
    if (cnt & (1 << 26)) {
      src &= ~3; dst &= ~3;
      if (fill) { const v = bus.read32(src); for (let i = 0; i < count; i++) { bus.write32(dst, v); dst += 4; } }
      else for (let i = 0; i < count; i++) { bus.write32(dst, bus.read32(src)); src += 4; dst += 4; }
    } else {
      src &= ~1; dst &= ~1;
      if (fill) { const v = bus.read16(src); for (let i = 0; i < count; i++) { bus.write16(dst, v); dst += 2; } }
      else for (let i = 0; i < count; i++) { bus.write16(dst, bus.read16(src)); src += 2; dst += 2; }
    }
  }

  cpuFastSet(src, dst, cnt) {
    const bus = this.gba.bus;
    const count = ((cnt & 0x1FFFFF) + 7) & ~7;
    src &= ~3; dst &= ~3;
    if (cnt & (1 << 24)) {
      const v = bus.read32(src);
      for (let i = 0; i < count; i++) { bus.write32(dst, v); dst += 4; }
    } else {
      for (let i = 0; i < count; i++) { bus.write32(dst, bus.read32(src)); src += 4; dst += 4; }
    }
  }

  bgAffineSet(src, dst, count) {
    const bus = this.gba.bus;
    for (let i = 0; i < count; i++) {
      const ox = bus.read32(src), oy = bus.read32(src + 4);
      const cx = (bus.read16(src + 8) << 16) >> 16, cy = (bus.read16(src + 10) << 16) >> 16;
      const sx = (bus.read16(src + 12) << 16) >> 16, sy = (bus.read16(src + 14) << 16) >> 16;
      const theta = bus.read16(src + 16) >>> 8;
      src += 20;
      const sin = SINE_TABLE[theta], cos = SINE_TABLE[(theta + 64) & 255];
      const a = Math.imul(cos, sx) >> 14, b = -(Math.imul(sin, sx) >> 14);
      const c = Math.imul(sin, sy) >> 14, d = Math.imul(cos, sy) >> 14;
      bus.write16(dst, a & 0xFFFF); bus.write16(dst + 2, b & 0xFFFF);
      bus.write16(dst + 4, c & 0xFFFF); bus.write16(dst + 6, d & 0xFFFF);
      bus.write32(dst + 8, (ox - Math.imul(a, cx) - Math.imul(b, cy)) | 0);
      bus.write32(dst + 12, (oy - Math.imul(c, cx) - Math.imul(d, cy)) | 0);
      dst += 16;
    }
  }

  objAffineSet(src, dst, count, diff) {
    const bus = this.gba.bus;
    for (let i = 0; i < count; i++) {
      const sx = ((bus.read16(src) << 16) >> 16) / 256, sy = ((bus.read16(src + 2) << 16) >> 16) / 256;
      const theta = (bus.read16(src + 4) >>> 8) / 128 * Math.PI;
      src += 8;
      const cos = Math.cos(theta), sin = Math.sin(theta);
      bus.write16(dst, (cos * sx * 256) & 0xFFFF);
      bus.write16(dst + diff, (-sin * sx * 256) & 0xFFFF);
      bus.write16(dst + diff * 2, (sin * sy * 256) & 0xFFFF);
      bus.write16(dst + diff * 3, (cos * sy * 256) & 0xFFFF);
      dst += diff * 4;
    }
  }

  bitUnpack(src, dst, info) {
    const bus = this.gba.bus;
    let len = bus.read16(info);
    const sw = bus.read8(info + 2), dw = bus.read8(info + 3);
    const offRaw = bus.read32(info + 4);
    const offset = offRaw & 0x7FFFFFFF, zeroFlag = offRaw >>> 31;
    let out = 0, outBits = 0;
    dst &= ~3;
    while (len-- > 0) {
      const b = bus.read8(src++);
      for (let bit = 0; bit < 8; bit += sw) {
        let v = (b >>> bit) & ((1 << sw) - 1);
        if (v !== 0 || zeroFlag) v = (v + offset) | 0;
        out |= (dw === 32 ? v : (v & ((1 << dw) - 1))) << outBits;
        outBits += dw;
        if (outBits >= 32) { bus.write32(dst, out); dst += 4; out = 0; outBits = 0; }
      }
    }
  }

  writeOut(bytes, dst, vram) {
    const bus = this.gba.bus;
    if (vram) {
      dst &= ~1;
      for (let i = 0; i + 1 < bytes.length; i += 2) bus.write16(dst + i, bytes[i] | (bytes[i + 1] << 8));
      if (bytes.length & 1) bus.write16(dst + bytes.length - 1, bytes[bytes.length - 1]);
    } else {
      for (let i = 0; i < bytes.length; i++) bus.write8(dst + i, bytes[i]);
    }
  }

  lz77(src, dst, vram) {
    const bus = this.gba.bus;
    const header = bus.read32(src);
    const size = header >>> 8;
    src += 4;
    const out = new Uint8Array(size);
    let o = 0;
    while (o < size) {
      const flags = bus.read8(src++);
      for (let k = 0; k < 8 && o < size; k++) {
        if (flags & (0x80 >>> k)) {
          const b1 = bus.read8(src++), b2 = bus.read8(src++);
          const len = (b1 >>> 4) + 3;
          const disp = (((b1 & 15) << 8) | b2) + 1;
          for (let j = 0; j < len && o < size; j++) {
            out[o] = o - disp >= 0 ? out[o - disp] : 0;
            o++;
          }
        } else {
          out[o++] = bus.read8(src++);
        }
      }
    }
    this.writeOut(out, dst, vram);
  }

  huffman(src, dst) {
    const bus = this.gba.bus;
    const header = bus.read32(src);
    const bits = header & 15;
    const size = header >>> 8;
    const treeSize = bus.read8(src + 4);
    const treeStart = src + 5;
    let stream = treeStart + treeSize * 2 + 1;
    stream = (stream + 3) & ~3;
    const out = new Uint8Array(size + 4);
    let outVal = 0, outBits = 0;
    let node = treeStart, nodeVal = bus.read8(node);
    const bytes = [];
    while (bytes.length < size) {
      let word = bus.read32(stream); stream += 4;
      for (let k = 0; k < 32 && bytes.length < size; k++) {
        const bit = (word >>> 31) & 1; word <<= 1;
        const offset = nodeVal & 0x3F;
        const next = (node & ~1) + offset * 2 + 2 + bit;
        const isLeaf = bit ? (nodeVal & 0x40) : (nodeVal & 0x80);
        if (isLeaf) {
          const data = bus.read8(next);
          outVal |= (data & ((1 << bits) - 1)) << outBits;
          outBits += bits;
          if (outBits >= 8) {
            bytes.push(outVal & 0xFF);
            outVal >>>= 8; outBits -= 8;
          }
          node = treeStart; nodeVal = bus.read8(node);
        } else {
          node = next; nodeVal = bus.read8(node);
        }
      }
    }
    for (let i = 0; i < size; i++) out[i] = bytes[i];
    dst &= ~3;
    for (let i = 0; i < size; i += 4) bus.write32(dst + i, out[i] | (out[i + 1] << 8) | (out[i + 2] << 16) | (out[i + 3] << 24));
  }

  rle(src, dst, vram) {
    const bus = this.gba.bus;
    const size = bus.read32(src) >>> 8;
    src += 4;
    const out = new Uint8Array(size);
    let o = 0;
    while (o < size) {
      const f = bus.read8(src++);
      if (f & 0x80) {
        const len = (f & 0x7F) + 3, v = bus.read8(src++);
        for (let j = 0; j < len && o < size; j++) out[o++] = v;
      } else {
        const len = (f & 0x7F) + 1;
        for (let j = 0; j < len && o < size; j++) out[o++] = bus.read8(src++);
      }
    }
    this.writeOut(out, dst, vram);
  }

  diffUnfilter(src, dst, unit, vram) {
    const bus = this.gba.bus;
    const size = bus.read32(src) >>> 8;
    src += 4;
    if (unit === 1) {
      const out = new Uint8Array(size);
      let acc = 0;
      for (let i = 0; i < size; i++) { acc = (acc + bus.read8(src + i)) & 0xFF; out[i] = acc; }
      this.writeOut(out, dst, vram);
    } else {
      let acc = 0;
      for (let i = 0; i < size; i += 2) {
        acc = (acc + bus.read16(src + i)) & 0xFFFF;
        bus.write16(dst + i, acc);
      }
    }
  }

  midiKey2Freq(wave, mk, fp) {
    const freq = this.gba.bus.read32(wave + 4) >>> 0;
    return Math.floor(freq / Math.pow(2, (180 - mk - fp / 256) / 12)) | 0;
  }
}
