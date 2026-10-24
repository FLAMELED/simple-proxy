// Cartridge hardware: save memory (SRAM / Flash / EEPROM) and GPIO real-time clock

class Flash {
  constructor(size) {
    this.size = size;
    this.data = new Uint8Array(size).fill(0xFF);
    // 128K: Sanyo LE26FV10N1TS, 64K: Panasonic MN63F805MNP
    this.mfr = size === 0x20000 ? 0x62 : 0x32;
    this.dev = size === 0x20000 ? 0x13 : 0x1B;
    this.reset();
  }
  reset() {
    this.state = 0; this.idMode = false; this.erase = false;
    this.writeNext = false; this.bankNext = false; this.bank = 0;
  }
  read8(addr) {
    if (this.idMode && addr < 2) return addr === 0 ? this.mfr : this.dev;
    return this.data[(this.bank << 16) + addr];
  }
  write8(addr, val) {
    if (this.writeNext) {
      this.data[(this.bank << 16) + addr] = val;
      this.writeNext = false;
      this.dirty = true;
      return;
    }
    if (this.bankNext) {
      if (addr === 0) this.bank = (val & 1) && this.size === 0x20000 ? 1 : 0;
      this.bankNext = false;
      return;
    }
    switch (this.state) {
      case 0:
        if (addr === 0x5555 && val === 0xAA) this.state = 1;
        else if (val === 0xF0) this.idMode = false;
        break;
      case 1:
        this.state = (addr === 0x2AAA && val === 0x55) ? 2 : 0;
        break;
      case 2:
        this.state = 0;
        if (addr === 0x5555) {
          switch (val) {
            case 0x90: this.idMode = true; this.erase = false; break;
            case 0xF0: this.idMode = false; this.erase = false; break;
            case 0x80: this.erase = true; break;
            case 0x10:
              if (this.erase) { this.data.fill(0xFF); this.dirty = true; }
              this.erase = false;
              break;
            case 0xA0: this.writeNext = true; this.erase = false; break;
            case 0xB0: this.bankNext = true; this.erase = false; break;
            default: this.erase = false;
          }
        } else if (val === 0x30 && this.erase) {
          const base = (this.bank << 16) + (addr & 0xF000);
          this.data.fill(0xFF, base, base + 0x1000);
          this.erase = false;
          this.dirty = true;
        }
        break;
    }
  }
}

class SRAM {
  constructor() { this.size = 0x8000; this.data = new Uint8Array(0x8000).fill(0xFF); }
  reset() {}
  read8(addr) { return this.data[addr & 0x7FFF]; }
  write8(addr, val) { this.data[addr & 0x7FFF] = val; this.dirty = true; }
}

class EEPROM {
  constructor() {
    this.size = 0x2000;
    this.addrBits = 14;
    this.data = new Uint8Array(0x2000).fill(0xFF);
    this.sizeKnown = false;
    this.reset();
  }
  reset() { this.bits = []; this.readBuf = null; this.readPos = 0; }
  detectSize(count, writing) {
    if (this.sizeKnown) return;
    let small = null;
    if (writing) { if (count === 9 || count === 73) small = true; else if (count === 17 || count === 81) small = false; }
    if (small === null) return;
    this.sizeKnown = true;
    this.addrBits = small ? 6 : 14;
    this.size = small ? 0x200 : 0x2000;
  }
  write(bit) {
    this.bits.push(bit);
    const ab = this.addrBits;
    if (this.bits.length >= 2) {
      const cmd = (this.bits[0] << 1) | this.bits[1];
      if (cmd === 3 && this.bits.length === 2 + ab + 1) {
        let addr = 0;
        for (let i = 0; i < ab; i++) addr = (addr << 1) | this.bits[2 + i];
        addr = (addr & 0x3FF) * 8;
        this.readBuf = [0, 0, 0, 0];
        for (let i = 0; i < 8; i++) {
          const b = this.data[(addr + i) % this.data.length];
          for (let k = 7; k >= 0; k--) this.readBuf.push((b >>> k) & 1);
        }
        this.readPos = 0;
        this.bits = [];
      } else if (cmd === 2 && this.bits.length === 2 + ab + 64 + 1) {
        let addr = 0;
        for (let i = 0; i < ab; i++) addr = (addr << 1) | this.bits[2 + i];
        addr = (addr & 0x3FF) * 8;
        for (let i = 0; i < 8; i++) {
          let b = 0;
          for (let k = 0; k < 8; k++) b = (b << 1) | this.bits[2 + ab + i * 8 + k];
          this.data[(addr + i) % this.data.length] = b;
        }
        this.dirty = true;
        this.bits = [];
        this.readBuf = null;
      } else if (this.bits.length > 2 + 14 + 64 + 1) {
        this.bits = [];
      }
    }
  }
  read() {
    if (this.readBuf && this.readPos < this.readBuf.length) {
      const b = this.readBuf[this.readPos++];
      if (this.readPos >= this.readBuf.length) this.readBuf = null;
      return b;
    }
    return 1;
  }
}

const RTC_BYTES = [0, 0, 7, 0, 1, 0, 3, 0];

class Cart {
  constructor(gba) {
    this.gba = gba;
    this.save = null;
    this.eeprom = null;
    this.saveType = 'none';
    this.gpioReadable = false;
    this.resetGpio();
  }

  resetGpio() {
    this.gpioReadable = false;
    this.pinState = 0; this.direction = 0;
    this.rtc = { transferStep: 0, bits: 0, bitsRead: 0, command: 0, commandActive: false, bytesRemaining: 0, control: 0x40, time: new Uint8Array(7) };
  }

  load(rom) {
    this.title = String.fromCharCode(...rom.subarray(0xA0, 0xAC)).replace(/\0/g, '').trim();
    this.code = String.fromCharCode(...rom.subarray(0xAC, 0xB0)).replace(/\0/g, '');
    const type = detectSaveType(rom);
    this.saveType = type;
    this.eeprom = null;
    switch (type) {
      case 'flash128': this.save = new Flash(0x20000); break;
      case 'flash64': this.save = new Flash(0x10000); break;
      case 'eeprom': this.eeprom = new EEPROM(); this.save = this.eeprom; break;
      case 'sram': this.save = new SRAM(); break;
      default: this.save = new SRAM(); break; // harmless default
    }
    this.resetGpio();
  }

  reset() {
    if (this.save && this.save.reset) this.save.reset();
    this.resetGpio();
  }

  saveRead8(addr) {
    if (this.eeprom || !this.save) return 0xFF;
    return this.save.read8(addr);
  }

  saveWrite8(addr, val) {
    if (this.eeprom || !this.save) return;
    this.save.write8(addr, val);
  }

  // ---------- GPIO / RTC (Seiko S-3511) ----------

  gpioRead(off) {
    switch (off) {
      case 0xC4: return this.pinState & ~this.direction & 0xF | (this.pinState & this.direction & 0xF);
      case 0xC6: return this.direction;
      case 0xC8: return this.gpioReadable ? 1 : 0;
    }
    return 0;
  }

  gpioWrite(off, val) {
    switch (off) {
      case 0xC4:
        this.pinState = (this.pinState & ~this.direction) | (val & this.direction & 0xF);
        this.rtcReadPins();
        break;
      case 0xC6: this.direction = val & 0xF; break;
      case 0xC8: this.gpioReadable = !!(val & 1); break;
    }
  }

  outputPins(pins) {
    this.pinState = (this.pinState & this.direction) | (pins & ~this.direction & 0xF);
  }

  rtcReadPins() {
    const rtc = this.rtc, p = this.pinState;
    switch (rtc.transferStep) {
      case 0:
        if ((p & 5) === 1) rtc.transferStep = 1;
        break;
      case 1:
        if ((p & 5) === 5) rtc.transferStep = 2;
        else if ((p & 5) !== 1) rtc.transferStep = 0;
        break;
      case 2:
        if (!(p & 1)) {
          rtc.bits &= ~(1 << rtc.bitsRead);
          rtc.bits |= ((p & 2) >>> 1) << rtc.bitsRead;
        } else if (p & 4) {
          const reading = rtc.command & 0x80;
          if (!reading) {
            rtc.bitsRead++;
            if (rtc.bitsRead === 8) this.rtcProcessByte();
          } else {
            this.outputPins(5 | (this.rtcOutput() << 1));
            rtc.bitsRead++;
            if (rtc.bitsRead === 8) {
              rtc.bytesRemaining--;
              if (rtc.bytesRemaining <= 0) { rtc.commandActive = false; rtc.command = 0; }
              rtc.bitsRead = 0;
            }
          }
        } else {
          rtc.bitsRead = 0; rtc.bytesRemaining = 0; rtc.commandActive = false; rtc.command = 0;
          rtc.transferStep = p & 1;
          this.outputPins(1);
        }
        break;
    }
  }

  rtcProcessByte() {
    const rtc = this.rtc;
    rtc.bytesRemaining--;
    if (!rtc.commandActive) {
      const command = rtc.bits;
      if ((command & 0xF) === 0x6) {
        rtc.command = command;
        const cmd = (command >>> 4) & 7;
        rtc.bytesRemaining = RTC_BYTES[cmd];
        rtc.commandActive = rtc.bytesRemaining > 0;
        if (cmd === 0) rtc.control = 0;
        else if (cmd === 2 || cmd === 6) this.rtcUpdateClock();
      }
    } else {
      const cmd = (rtc.command >>> 4) & 7;
      if (cmd === 4) rtc.control = rtc.bits;
    }
    rtc.bits = 0;
    rtc.bitsRead = 0;
    if (!rtc.bytesRemaining) { rtc.commandActive = false; rtc.command = 0; }
  }

  rtcOutput() {
    const rtc = this.rtc;
    if (!rtc.commandActive) return 0;
    let out = 0;
    const cmd = (rtc.command >>> 4) & 7;
    if (cmd === 4) out = rtc.control;
    else if (cmd === 2 || cmd === 6) out = rtc.time[7 - rtc.bytesRemaining];
    return (out >>> rtc.bitsRead) & 1;
  }

  rtcUpdateClock() {
    const d = new Date();
    const bcd = v => ((Math.floor(v / 10) % 10) << 4) | (v % 10);
    const t = this.rtc.time;
    t[0] = bcd(d.getFullYear() % 100);
    t[1] = bcd(d.getMonth() + 1);
    t[2] = bcd(d.getDate());
    t[3] = bcd(d.getDay());
    t[4] = (this.rtc.control & 0x40) ? bcd(d.getHours()) : bcd(d.getHours() % 12) | (d.getHours() >= 12 ? 0x80 : 0);
    t[5] = bcd(d.getMinutes());
    t[6] = bcd(d.getSeconds());
  }

  // ---------- persistence ----------

  getSaveData() {
    return this.save ? this.save.data.slice() : null;
  }

  setSaveData(data) {
    if (!this.save || !data) return;
    const d = this.save.data;
    d.fill(0xFF);
    d.set(data.subarray(0, Math.min(d.length, data.length)));
    if (this.eeprom && !this.eeprom.sizeKnown && data.length === 0x200) {
      this.eeprom.sizeKnown = true; this.eeprom.addrBits = 6; this.eeprom.size = 0x200;
    }
  }

  get saveDirty() { return !!(this.save && this.save.dirty); }
  clearDirty() { if (this.save) this.save.dirty = false; }

  getState(light) {
    const s = { pinState: this.pinState, direction: this.direction, gpioReadable: this.gpioReadable,
      rtc: Object.assign({}, this.rtc, { time: this.rtc.time.slice() }) };
    if (this.save && !light) {
      s.save = this.save.data.slice();
      if (this.save instanceof Flash) s.flash = { bank: this.save.bank, state: this.save.state, idMode: this.save.idMode };
    }
    return s;
  }

  setState(s) {
    this.pinState = s.pinState; this.direction = s.direction; this.gpioReadable = s.gpioReadable;
    Object.assign(this.rtc, s.rtc);
    if (this.save && s.save) {
      this.save.data.set(s.save.subarray(0, this.save.data.length));
      this.save.dirty = true;
      if (s.flash && this.save instanceof Flash) {
        this.save.reset();
        this.save.bank = s.flash.bank;
      }
    }
  }
}

function detectSaveType(rom) {
  const needles = [
    ['FLASH1M_V', 'flash128'], ['FLASH512_V', 'flash64'], ['FLASH_V', 'flash64'],
    ['EEPROM_V', 'eeprom'], ['SRAM_F_V', 'sram'], ['SRAM_V', 'sram'],
  ];
  const len = rom.length;
  for (let i = 0; i + 12 < len; i += 4) {
    const c = rom[i];
    if (c !== 0x46 && c !== 0x45 && c !== 0x53) continue; // F, E, S
    for (const [s, t] of needles) {
      if (s.charCodeAt(0) !== c) continue;
      let ok = true;
      for (let k = 1; k < s.length; k++) if (rom[i + k] !== s.charCodeAt(k)) { ok = false; break; }
      if (ok) return t;
    }
  }
  return 'none';
}
