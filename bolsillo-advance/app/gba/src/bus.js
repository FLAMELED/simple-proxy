// Memory map, I/O registers, interrupts, DMA and timers

const IRQ_VBLANK = 0, IRQ_HBLANK = 1, IRQ_VCOUNT = 2, IRQ_TIMER0 = 3, IRQ_DMA0 = 8, IRQ_KEYPAD = 12;

class Bus {
  constructor(gba) {
    this.gba = gba;
    this.bios = new Uint8Array(0x4000);
    this.bios32 = new Int32Array(this.bios.buffer);
    this.bios16 = new Uint16Array(this.bios.buffer);
    this.ewram = new Uint8Array(0x40000);
    this.ewram16 = new Uint16Array(this.ewram.buffer);
    this.ewram32 = new Int32Array(this.ewram.buffer);
    this.iwram = new Uint8Array(0x8000);
    this.iwram16 = new Uint16Array(this.iwram.buffer);
    this.iwram32 = new Int32Array(this.iwram.buffer);
    this.io = new Uint8Array(0x400);
    this.io16 = new Uint16Array(this.io.buffer);
    this.pal = new Uint8Array(0x400);
    this.pal16 = new Uint16Array(this.pal.buffer);
    this.pal32 = new Int32Array(this.pal.buffer);
    this.vram = new Uint8Array(0x18000);
    this.vram16 = new Uint16Array(this.vram.buffer);
    this.vram32 = new Int32Array(this.vram.buffer);
    this.oam = new Uint8Array(0x400);
    this.oam16 = new Uint16Array(this.oam.buffer);
    this.oam32 = new Int32Array(this.oam.buffer);
    this.rom = new Uint8Array(4);
    this.rom16 = new Uint16Array(this.rom.buffer);
    this.rom32 = new Int32Array(this.rom.buffer);
    this.romSize = 0;

    this.cycles = 0;
    this.target = 0;
    this.ie = 0; this.if_ = 0; this.ime = 0;
    this.irqLine = false;
    this.keyinput = 0x3FF;
    this.biosLast = 0xE129F000 | 0;
    this.waitcnt = 0;

    // access timings per region (index = addr >>> 24 & 0xF)
    this.n16 = new Int32Array(16); this.s16 = new Int32Array(16);
    this.n32 = new Int32Array(16); this.s32 = new Int32Array(16);
    this.updateWaitstates(0);
  }

  setRom(data) {
    const size = (data.length + 3) & ~3;
    const buf = new ArrayBuffer(Math.max(size, 4));
    this.rom = new Uint8Array(buf);
    this.rom.set(data);
    this.rom16 = new Uint16Array(buf);
    this.rom32 = new Int32Array(buf);
    this.romSize = data.length;
  }

  reset() {
    this.ewram.fill(0); this.iwram.fill(0); this.io.fill(0);
    this.pal.fill(0); this.vram.fill(0); this.oam.fill(0);
    this.cycles = 0; this.target = 0;
    this.ie = 0; this.if_ = 0; this.ime = 0; this.irqLine = false;
    this.keyinput = 0x3FF;
    this.biosLast = 0xE129F000 | 0;
    this.updateWaitstates(0);
  }

  updateWaitstates(val) {
    this.waitcnt = val;
    const N = [4, 3, 2, 8];
    const t = this;
    const set = (reg, n, s) => {
      t.n16[reg] = n; t.s16[reg] = s; t.n32[reg] = n + s; t.s32[reg] = s * 2;
    };
    for (let i = 0; i < 16; i++) set(i, 1, 1);
    set(0x2, 3, 3); t.n32[2] = 6; t.s32[2] = 6;
    t.n32[5] = t.s32[5] = 2; t.n32[6] = t.s32[6] = 2;
    const ws0n = 1 + N[(val >> 2) & 3], ws0s = 1 + ((val & 0x10) ? 1 : 2);
    const ws1n = 1 + N[(val >> 5) & 3], ws1s = 1 + ((val & 0x80) ? 1 : 4);
    const ws2n = 1 + N[(val >> 8) & 3], ws2s = 1 + ((val & 0x400) ? 1 : 8);
    set(0x8, ws0n, ws0s); set(0x9, ws0n, ws0s);
    set(0xA, ws1n, ws1s); set(0xB, ws1n, ws1s);
    set(0xC, ws2n, ws2s); set(0xD, ws2n, ws2s);
    const sr = 1 + N[val & 3];
    set(0xE, sr, sr); set(0xF, sr, sr);
    this.prefetch = !!(val & 0x4000);
    // code fetch cost from ROM: with prefetch buffer enabled sequential fetches are ~1 cycle
    this.romFetch16 = this.prefetch ? 1 : ws0s;
    this.romFetch32 = this.prefetch ? 2 : ws0s * 2;
  }

  updateIrq() {
    this.irqLine = this.ime !== 0 && (this.ie & this.if_) !== 0;
  }

  raiseIrq(bit) {
    this.if_ |= 1 << bit;
    this.updateIrq();
  }

  // ================= code fetch =================

  fetch16(addr) {
    switch (addr >>> 24) {
      case 0x08: case 0x09: case 0x0A: case 0x0B: case 0x0C: case 0x0D: {
        this.cycles += this.romFetch16;
        const off = addr & 0x1FFFFFF;
        if (off < this.romSize) return this.rom16[off >>> 1];
        return (addr >>> 1) & 0xFFFF;
      }
      case 0x03: this.cycles += 1; return this.iwram16[(addr & 0x7FFF) >>> 1];
      case 0x02: this.cycles += 3; return this.ewram16[(addr & 0x3FFFF) >>> 1];
      case 0x00:
        this.cycles += 1;
        if (addr < 0x4000) { const v = this.bios16[addr >>> 1]; this.biosLast = v; return v; }
        return 0;
      default: return this.read16(addr);
    }
  }

  fetch32(addr) {
    switch (addr >>> 24) {
      case 0x08: case 0x09: case 0x0A: case 0x0B: case 0x0C: case 0x0D: {
        this.cycles += this.romFetch32;
        const off = addr & 0x1FFFFFC;
        if (off < this.romSize) return this.rom32[off >>> 2];
        return ((addr >>> 1) & 0xFFFF) | ((((addr >>> 1) + 1) & 0xFFFF) << 16);
      }
      case 0x03: this.cycles += 1; return this.iwram32[(addr & 0x7FFF) >>> 2];
      case 0x02: this.cycles += 6; return this.ewram32[(addr & 0x3FFFF) >>> 2];
      case 0x00:
        this.cycles += 1;
        if (addr < 0x4000) { this.biosLast = this.bios32[((addr + 8) & 0x3FFF) >>> 2]; return this.bios32[addr >>> 2]; }
        return 0;
      default: return this.read32(addr);
    }
  }

  // ================= reads =================

  read8(addr) {
    const region = addr >>> 24;
    switch (region) {
      case 0x00:
        this.cycles += 1;
        if (addr < 0x4000) {
          if (this.gba.cpu.pcAddr < 0x4000) return this.bios[addr];
          return (this.biosLast >>> ((addr & 3) << 3)) & 0xFF;
        }
        return 0;
      case 0x02: this.cycles += 3; return this.ewram[addr & 0x3FFFF];
      case 0x03: this.cycles += 1; return this.iwram[addr & 0x7FFF];
      case 0x04: {
        this.cycles += 1;
        const off = addr & 0xFFFFFF;
        if (off < 0x400) {
          const v = this.ioRead16(off & ~1);
          return (off & 1) ? v >>> 8 : v & 0xFF;
        }
        return 0;
      }
      case 0x05: this.cycles += 1; return this.pal[addr & 0x3FF];
      case 0x06: this.cycles += 1; return this.vram[vramOffset(addr)];
      case 0x07: this.cycles += 1; return this.oam[addr & 0x3FF];
      case 0x08: case 0x09: case 0x0A: case 0x0B: case 0x0C: case 0x0D: {
        this.cycles += this.n16[region];
        const off = addr & 0x1FFFFFF;
        const cart = this.gba.cart;
        if (cart.gpioReadable && off >= 0xC4 && off < 0xCA) {
          const v = cart.gpioRead(off & ~1);
          return (off & 1) ? v >>> 8 : v & 0xFF;
        }
        if (off < this.romSize) return this.rom[off];
        return ((addr >>> 1) >>> ((addr & 1) << 3)) & 0xFF;
      }
      case 0x0E: case 0x0F:
        this.cycles += this.n16[region];
        return this.gba.cart.saveRead8(addr & 0xFFFF);
      default:
        this.cycles += 1;
        return 0;
    }
  }

  read16(addr) {
    const region = addr >>> 24;
    switch (region) {
      case 0x00:
        this.cycles += 1;
        if (addr < 0x4000) {
          if (this.gba.cpu.pcAddr < 0x4000) return this.bios16[addr >>> 1];
          return (this.biosLast >>> ((addr & 2) << 3)) & 0xFFFF;
        }
        return 0;
      case 0x02: this.cycles += 3; return this.ewram16[(addr & 0x3FFFF) >>> 1];
      case 0x03: this.cycles += 1; return this.iwram16[(addr & 0x7FFF) >>> 1];
      case 0x04: {
        this.cycles += 1;
        const off = addr & 0xFFFFFE;
        if (off < 0x400) return this.ioRead16(off);
        return 0;
      }
      case 0x05: this.cycles += 1; return this.pal16[(addr & 0x3FF) >>> 1];
      case 0x06: this.cycles += 1; return this.vram16[vramOffset(addr) >>> 1];
      case 0x07: this.cycles += 1; return this.oam16[(addr & 0x3FF) >>> 1];
      case 0x08: case 0x09: case 0x0A: case 0x0B: case 0x0C: case 0x0D: {
        this.cycles += this.n16[region];
        const off = addr & 0x1FFFFFE;
        const cart = this.gba.cart;
        if (region === 0x0D && cart.eeprom && (this.romSize <= 0x1000000 || off >= 0x1FFFF00)) {
          return cart.eeprom.read();
        }
        if (cart.gpioReadable && off >= 0xC4 && off < 0xCA) return cart.gpioRead(off);
        if (off < this.romSize) return this.rom16[off >>> 1];
        return (addr >>> 1) & 0xFFFF;
      }
      case 0x0E: case 0x0F:
        this.cycles += this.n16[region];
        return this.gba.cart.saveRead8(addr & 0xFFFF) * 0x0101;
      default:
        this.cycles += 1;
        return 0;
    }
  }

  read32(addr) {
    const region = addr >>> 24;
    switch (region) {
      case 0x00:
        this.cycles += 1;
        if (addr < 0x4000) {
          if (this.gba.cpu.pcAddr < 0x4000) return this.bios32[addr >>> 2];
          return this.biosLast;
        }
        return 0;
      case 0x02: this.cycles += 6; return this.ewram32[(addr & 0x3FFFF) >>> 2];
      case 0x03: this.cycles += 1; return this.iwram32[(addr & 0x7FFF) >>> 2];
      case 0x04: {
        this.cycles += 1;
        const off = addr & 0xFFFFFC;
        if (off < 0x400) return this.ioRead16(off) | (this.ioRead16(off + 2) << 16);
        return 0;
      }
      case 0x05: this.cycles += 2; return this.pal32[(addr & 0x3FF) >>> 2];
      case 0x06: this.cycles += 2; return this.vram32[vramOffset(addr) >>> 2];
      case 0x07: this.cycles += 1; return this.oam32[(addr & 0x3FF) >>> 2];
      case 0x08: case 0x09: case 0x0A: case 0x0B: case 0x0C: case 0x0D: {
        this.cycles += this.n32[region];
        const off = addr & 0x1FFFFFC;
        const cart = this.gba.cart;
        if (cart.gpioReadable && off >= 0xC4 && off < 0xCA) {
          return cart.gpioRead(off) | (cart.gpioRead(off + 2) << 16);
        }
        if (off < this.romSize) return this.rom32[off >>> 2];
        return ((addr >>> 1) & 0xFFFF) | ((((addr >>> 1) + 1) & 0xFFFF) << 16);
      }
      case 0x0E: case 0x0F:
        this.cycles += this.n16[region];
        return Math.imul(this.gba.cart.saveRead8(addr & 0xFFFF), 0x01010101);
      default:
        this.cycles += 1;
        return 0;
    }
  }

  // ================= writes =================

  write8(addr, val) {
    switch (addr >>> 24) {
      case 0x02: this.cycles += 3; this.ewram[addr & 0x3FFFF] = val; return;
      case 0x03: this.cycles += 1; this.iwram[addr & 0x7FFF] = val; return;
      case 0x04: {
        this.cycles += 1;
        const off = addr & 0xFFFFFF;
        if (off < 0x400) this.ioWrite8(off, val & 0xFF);
        return;
      }
      case 0x05: this.cycles += 1; this.pal16[(addr & 0x3FF) >>> 1] = (val & 0xFF) * 0x101; return;
      case 0x06: {
        this.cycles += 1;
        const off = vramOffset(addr);
        const mode = this.io16[0] & 7;
        if (off < (mode >= 3 ? 0x14000 : 0x10000)) this.vram16[off >>> 1] = (val & 0xFF) * 0x101;
        return;
      }
      case 0x07: this.cycles += 1; return; // 8-bit OAM writes are ignored
      case 0x08: case 0x09: case 0x0A: case 0x0B: case 0x0C: case 0x0D:
        this.cycles += 1;
        return;
      case 0x0E: case 0x0F:
        this.cycles += this.n16[addr >>> 24];
        this.gba.cart.saveWrite8(addr & 0xFFFF, val & 0xFF);
        return;
      default:
        this.cycles += 1;
    }
  }

  write16(addr, val) {
    const region = addr >>> 24;
    switch (region) {
      case 0x02: this.cycles += 3; this.ewram16[(addr & 0x3FFFF) >>> 1] = val; return;
      case 0x03: this.cycles += 1; this.iwram16[(addr & 0x7FFF) >>> 1] = val; return;
      case 0x04: {
        this.cycles += 1;
        const off = addr & 0xFFFFFE;
        if (off < 0x400) this.ioWrite16(off, val & 0xFFFF);
        return;
      }
      case 0x05: this.cycles += 1; this.pal16[(addr & 0x3FF) >>> 1] = val; return;
      case 0x06: this.cycles += 1; this.vram16[vramOffset(addr) >>> 1] = val; return;
      case 0x07: this.cycles += 1; this.oam16[(addr & 0x3FF) >>> 1] = val; return;
      case 0x08: case 0x09: case 0x0A: case 0x0B: case 0x0C: case 0x0D: {
        this.cycles += this.n16[region];
        const off = addr & 0x1FFFFFE;
        const cart = this.gba.cart;
        if (region === 0x0D && cart.eeprom && (this.romSize <= 0x1000000 || off >= 0x1FFFF00)) {
          cart.eeprom.write(val & 1);
          return;
        }
        if (off >= 0xC4 && off < 0xCA) cart.gpioWrite(off, val & 0xFFFF);
        return;
      }
      case 0x0E: case 0x0F:
        this.cycles += this.n16[region];
        this.gba.cart.saveWrite8(addr & 0xFFFF, (val >>> ((addr & 1) << 3)) & 0xFF);
        return;
      default:
        this.cycles += 1;
    }
  }

  write32(addr, val) {
    const region = addr >>> 24;
    switch (region) {
      case 0x02: this.cycles += 6; this.ewram32[(addr & 0x3FFFF) >>> 2] = val; return;
      case 0x03: this.cycles += 1; this.iwram32[(addr & 0x7FFF) >>> 2] = val; return;
      case 0x04: {
        this.cycles += 1;
        const off = addr & 0xFFFFFC;
        if (off < 0x400) {
          this.ioWrite16(off, val & 0xFFFF);
          this.ioWrite16(off + 2, (val >>> 16) & 0xFFFF);
        }
        return;
      }
      case 0x05: this.cycles += 2; this.pal32[(addr & 0x3FF) >>> 2] = val; return;
      case 0x06: this.cycles += 2; this.vram32[vramOffset(addr) >>> 2] = val; return;
      case 0x07: this.cycles += 1; this.oam32[(addr & 0x3FF) >>> 2] = val; return;
      case 0x08: case 0x09: case 0x0A: case 0x0B: case 0x0C: case 0x0D: {
        this.cycles += this.n32[region];
        const off = addr & 0x1FFFFFC;
        if (off >= 0xC4 && off < 0xCA) {
          this.gba.cart.gpioWrite(off, val & 0xFFFF);
          this.gba.cart.gpioWrite(off + 2, (val >>> 16) & 0xFFFF);
        }
        return;
      }
      case 0x0E: case 0x0F:
        this.cycles += this.n16[region];
        this.gba.cart.saveWrite8(addr & 0xFFFF, (val >>> ((addr & 3) << 3)) & 0xFF);
        return;
      default:
        this.cycles += 1;
    }
  }

  // ================= I/O registers =================

  ioRead16(off) {
    const g = this.gba;
    switch (off) {
      case 0x004: return g.ppu.dispstat;
      case 0x006: return g.ppu.vcount;
      case 0x100: case 0x104: case 0x108: case 0x10C: return g.timers.readCounter((off - 0x100) >>> 2);
      case 0x130: return this.keyinput;
      case 0x200: return this.ie;
      case 0x202: return this.if_;
      case 0x204: return this.waitcnt;
      case 0x208: return this.ime;
      // write-only registers
      case 0x010: case 0x012: case 0x014: case 0x016: case 0x018: case 0x01A: case 0x01C: case 0x01E:
      case 0x0B0: case 0x0B2: case 0x0B4: case 0x0B6: case 0x0B8:
      case 0x0BC: case 0x0BE: case 0x0C0: case 0x0C2: case 0x0C4:
      case 0x0C8: case 0x0CA: case 0x0CC: case 0x0CE: case 0x0D0:
      case 0x0D4: case 0x0D6: case 0x0D8: case 0x0DA: case 0x0DC:
        return 0;
    }
    if (off >= 0x060 && off < 0x0B0) return g.apu.read16(off);
    if (off >= 0x20 && off < 0x40) return 0;
    if (off >= 0x40 && off < 0x48) return 0;
    if (off === 0x4C || off === 0x54) return 0;
    return this.io16[off >>> 1];
  }

  ioWrite8(off, val) {
    if (off === 0x301) { // HALTCNT
      this.gba.cpu.halted = true;
      return;
    }
    if (off === 0x202 || off === 0x203) {
      this.if_ &= ~(val << ((off & 1) << 3));
      this.updateIrq();
      return;
    }
    if (off >= 0xA0 && off < 0xA8) {
      this.gba.apu.fifoWrite8(off >= 0xA4 ? 1 : 0, val);
      return;
    }
    const base = off & ~1;
    let cur;
    if (base === 0x200) cur = this.ie;
    else if (base === 0x208) cur = this.ime;
    else if (base === 0x204) cur = this.waitcnt;
    else if (base === 0x004) cur = this.gba.ppu.dispstat;
    else cur = this.io16[base >>> 1];
    const merged = (off & 1) ? ((cur & 0x00FF) | (val << 8)) : ((cur & 0xFF00) | val);
    this.ioWrite16(base, merged);
  }

  ioWrite16(off, val) {
    const g = this.gba;
    switch (off) {
      case 0x004:
        g.ppu.dispstat = (g.ppu.dispstat & 0x7) | (val & 0xFFF8);
        g.ppu.checkVcount();
        return;
      case 0x006: return;
      case 0x028: case 0x02A:
        this.io16[off >>> 1] = val; g.ppu.latchRefX(2); return;
      case 0x02C: case 0x02E:
        this.io16[off >>> 1] = val; g.ppu.latchRefY(2); return;
      case 0x038: case 0x03A:
        this.io16[off >>> 1] = val; g.ppu.latchRefX(3); return;
      case 0x03C: case 0x03E:
        this.io16[off >>> 1] = val; g.ppu.latchRefY(3); return;
      case 0x0BA: g.dma.writeCnt(0, val); return;
      case 0x0C6: g.dma.writeCnt(1, val); return;
      case 0x0D2: g.dma.writeCnt(2, val); return;
      case 0x0DE: g.dma.writeCnt(3, val); return;
      case 0x100: case 0x104: case 0x108: case 0x10C:
        this.io16[off >>> 1] = val; g.timers.writeReload((off - 0x100) >>> 2, val); return;
      case 0x102: case 0x106: case 0x10A: case 0x10E:
        this.io16[off >>> 1] = val; g.timers.writeCnt((off - 0x102) >>> 2, val); return;
      case 0x130: return;
      case 0x132: this.io16[off >>> 1] = val; this.checkKeyIrq(); return;
      case 0x200: this.ie = val & 0x3FFF; this.updateIrq(); return;
      case 0x202: this.if_ &= ~val; this.updateIrq(); return;
      case 0x204: this.updateWaitstates(val & 0x5FFF); return;
      case 0x208: this.ime = val & 1; this.updateIrq(); return;
      case 0x300:
        this.io16[off >>> 1] = val & 0xFF;
        if (val & 0xFF00) {} // ignore HALTCNT via 16-bit
        return;
    }
    if (off >= 0x060 && off < 0x0B0) { g.apu.write16(off, val); return; }
    this.io16[off >>> 1] = val;
  }

  setKeys(mask) {
    this.keyinput = (~mask) & 0x3FF;
    this.checkKeyIrq();
  }

  checkKeyIrq() {
    const cnt = this.io16[0x132 >>> 1];
    if (!(cnt & 0x4000)) return;
    const pressed = (~this.keyinput) & 0x3FF;
    const sel = cnt & 0x3FF;
    const hit = (cnt & 0x8000) ? ((pressed & sel) === sel && sel !== 0) : (pressed & sel) !== 0;
    if (hit) this.raiseIrq(IRQ_KEYPAD);
  }

  getState() {
    return {
      ewram: this.ewram.slice(), iwram: this.iwram.slice(), io: this.io.slice(),
      pal: this.pal.slice(), vram: this.vram.slice(), oam: this.oam.slice(),
      cycles: this.cycles, ie: this.ie, if_: this.if_, ime: this.ime,
      biosLast: this.biosLast, waitcnt: this.waitcnt,
    };
  }

  setState(s) {
    this.ewram.set(s.ewram); this.iwram.set(s.iwram); this.io.set(s.io);
    this.pal.set(s.pal); this.vram.set(s.vram); this.oam.set(s.oam);
    this.cycles = s.cycles; this.target = s.cycles;
    this.ie = s.ie; this.if_ = s.if_; this.ime = s.ime;
    this.biosLast = s.biosLast;
    this.updateWaitstates(s.waitcnt);
    this.updateIrq();
  }
}

function vramOffset(addr) {
  let off = addr & 0x1FFFF;
  if (off >= 0x18000) off -= 0x8000;
  return off;
}

// ================= DMA =================

class DMA {
  constructor(gba) {
    this.gba = gba;
    this.ch = [];
    for (let i = 0; i < 4; i++) this.ch.push({ cnt: 0, isrc: 0, idst: 0, icount: 0, enabled: false });
  }

  reset() {
    for (const c of this.ch) { c.cnt = 0; c.isrc = 0; c.idst = 0; c.icount = 0; c.enabled = false; }
  }

  writeCnt(n, val) {
    const bus = this.gba.bus, io = bus.io16;
    const c = this.ch[n];
    const base = 0xB0 + n * 12;
    const was = c.enabled;
    io[(base + 10) >>> 1] = val;
    c.cnt = val;
    if (val & 0x8000) {
      if (!was) {
        c.enabled = true;
        const s = io[base >>> 1] | (io[(base + 2) >>> 1] << 16);
        const d = io[(base + 4) >>> 1] | (io[(base + 6) >>> 1] << 16);
        c.isrc = s & (n === 0 ? 0x07FFFFFF : 0x0FFFFFFF);
        c.idst = d & (n === 3 ? 0x0FFFFFFF : 0x07FFFFFF);
        this.loadCount(n);
        if (((val >>> 12) & 3) === 0) this.transfer(n);
      }
    } else {
      c.enabled = false;
    }
  }

  loadCount(n) {
    const c = this.ch[n];
    let cnt = this.gba.bus.io16[(0xB8 + n * 12) >>> 1];
    if (n !== 3) cnt &= 0x3FFF;
    c.icount = cnt === 0 ? (n === 3 ? 0x10000 : 0x4000) : cnt;
  }

  trigger(timing) {
    for (let n = 0; n < 4; n++) {
      const c = this.ch[n];
      if (c.enabled && ((c.cnt >>> 12) & 3) === timing) this.transfer(n);
    }
  }

  fifoRequest(fifoAddr) {
    for (let n = 1; n <= 2; n++) {
      const c = this.ch[n];
      if (c.enabled && ((c.cnt >>> 12) & 3) === 3 && c.idst === fifoAddr) this.transferFifo(n);
    }
  }

  transfer(n) {
    const c = this.ch[n], bus = this.gba.bus, cnt = c.cnt;
    const word = cnt & 0x400;
    const step = word ? 4 : 2;
    const dCtl = (cnt >>> 5) & 3, sCtl = (cnt >>> 7) & 3;
    const sInc = sCtl === 0 ? step : sCtl === 1 ? -step : 0;
    const dInc = (dCtl === 0 || dCtl === 3) ? step : dCtl === 1 ? -step : 0;
    let s = c.isrc, d = c.idst;
    const count = c.icount;
    const cart = this.gba.cart;
    if (n === 3 && cart.eeprom && (d >>> 24) === 0x0D) cart.eeprom.detectSize(count, true);
    if (n === 3 && cart.eeprom && (s >>> 24) === 0x0D) cart.eeprom.detectSize(count, false);
    if (word) {
      s &= ~3; d &= ~3;
      for (let k = 0; k < count; k++) {
        bus.write32(d, bus.read32(s));
        s = (s + sInc) | 0; d = (d + dInc) | 0;
      }
    } else {
      s &= ~1; d &= ~1;
      for (let k = 0; k < count; k++) {
        bus.write16(d, bus.read16(s));
        s = (s + sInc) | 0; d = (d + dInc) | 0;
      }
    }
    bus.cycles += 2;
    c.isrc = s;
    c.idst = d;
    if (cnt & 0x4000) bus.raiseIrq(IRQ_DMA0 + n);
    const timing = (cnt >>> 12) & 3;
    if ((cnt & 0x200) && timing !== 0) {
      this.loadCount(n);
      if (dCtl === 3) {
        const base = 0xB0 + n * 12, io = bus.io16;
        c.idst = (io[(base + 4) >>> 1] | (io[(base + 6) >>> 1] << 16)) & (n === 3 ? 0x0FFFFFFF : 0x07FFFFFF);
      }
    } else {
      c.enabled = false;
      c.cnt &= 0x7FFF;
      bus.io16[(0xBA + n * 12) >>> 1] = c.cnt;
    }
  }

  transferFifo(n) {
    const c = this.ch[n], bus = this.gba.bus, cnt = c.cnt;
    const sCtl = (cnt >>> 7) & 3;
    const sInc = sCtl === 0 ? 4 : sCtl === 1 ? -4 : 0;
    let s = c.isrc & ~3;
    for (let k = 0; k < 4; k++) {
      bus.write32(c.idst, bus.read32(s));
      s = (s + sInc) | 0;
    }
    c.isrc = s;
    if (cnt & 0x4000) bus.raiseIrq(IRQ_DMA0 + n);
    if (!(cnt & 0x200)) {
      c.enabled = false;
      c.cnt &= 0x7FFF;
      bus.io16[(0xBA + n * 12) >>> 1] = c.cnt;
    }
  }

  getState() { return this.ch.map(c => Object.assign({}, c)); }
  setState(s) { for (let i = 0; i < 4; i++) Object.assign(this.ch[i], s[i]); }
}

// ================= Timers =================

const PRESCALE = [1, 64, 256, 1024];

class Timers {
  constructor(gba) {
    this.gba = gba;
    this.t = [];
    for (let i = 0; i < 4; i++) {
      this.t.push({ reload: 0, counter: 0, cnt: 0, enabled: false, cascade: false, scale: 1, start: 0, next: Infinity });
    }
    this.next = Infinity;
  }

  reset() {
    for (const t of this.t) {
      t.reload = 0; t.counter = 0; t.cnt = 0; t.enabled = false; t.cascade = false; t.scale = 1; t.start = 0; t.next = Infinity;
    }
    this.next = Infinity;
  }

  readCounter(n) {
    const t = this.t[n];
    if (t.enabled && !t.cascade) {
      const ticks = Math.floor((this.gba.bus.cycles - t.start) / t.scale);
      let v = t.counter + ticks;
      if (v > 0xFFFF) {
        const period = 0x10000 - t.reload;
        v = t.reload + ((v - 0x10000) % period);
      }
      return v;
    }
    return t.counter;
  }

  writeReload(n, val) {
    this.t[n].reload = val;
  }

  writeCnt(n, val) {
    const t = this.t[n];
    const now = this.gba.bus.cycles;
    if (t.enabled && !t.cascade) { t.counter = this.readCounter(n); t.start = now; }
    const was = t.enabled;
    t.cnt = val;
    t.enabled = !!(val & 0x80);
    t.cascade = n > 0 && !!(val & 4);
    t.scale = PRESCALE[val & 3];
    if (!was && t.enabled) { t.counter = t.reload; t.start = now; }
    else t.start = now;
    this.schedule(n);
  }

  schedule(n) {
    const t = this.t[n];
    t.next = (t.enabled && !t.cascade) ? t.start + (0x10000 - t.counter) * t.scale : Infinity;
    this.updateNext();
  }

  updateNext() {
    const t = this.t;
    this.next = Math.min(t[0].next, t[1].next, t[2].next, t[3].next);
    const bus = this.gba.bus;
    if (this.next < bus.target) bus.target = this.next;
  }

  handle(now) {
    for (;;) {
      let n = -1, best = now + 1;
      for (let i = 0; i < 4; i++) if (this.t[i].next < best) { best = this.t[i].next; n = i; }
      if (n < 0) break;
      const t = this.t[n];
      t.counter = t.reload;
      t.start = t.next;
      t.next = t.start + (0x10000 - t.counter) * t.scale;
      this.overflow(n);
    }
    this.updateNext();
  }

  overflow(n) {
    const t = this.t[n];
    if (t.cnt & 0x40) this.gba.bus.raiseIrq(IRQ_TIMER0 + n);
    if (n < 2) this.gba.apu.timerOverflow(n);
    if (n < 3) {
      const u = this.t[n + 1];
      if (u.enabled && u.cascade) {
        u.counter++;
        if (u.counter > 0xFFFF) { u.counter = u.reload; this.overflow(n + 1); }
      }
    }
  }

  getState() { return this.t.map(t => Object.assign({}, t, { next: t.next === Infinity ? -1 : t.next })); }
  setState(s) {
    for (let i = 0; i < 4; i++) { Object.assign(this.t[i], s[i]); if (this.t[i].next === -1) this.t[i].next = Infinity; }
    this.next = Math.min(this.t[0].next, this.t[1].next, this.t[2].next, this.t[3].next);
  }
}
