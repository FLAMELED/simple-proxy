// ARM7TDMI interpreter (ARMv4T: ARM + Thumb)
// r[15] always holds the address of the executing instruction + 8 (ARM) / + 4 (Thumb),
// which is what the program sees when it reads PC.

const MODE_USR = 0x10, MODE_FIQ = 0x11, MODE_IRQ = 0x12, MODE_SVC = 0x13,
  MODE_ABT = 0x17, MODE_UND = 0x1B, MODE_SYS = 0x1F;

function bankOf(mode) {
  switch (mode) {
    case MODE_FIQ: return 1;
    case MODE_IRQ: return 2;
    case MODE_SVC: return 3;
    case MODE_ABT: return 4;
    case MODE_UND: return 5;
    default: return 0;
  }
}

function popcount16(v) {
  v = v - ((v >>> 1) & 0x5555);
  v = (v & 0x3333) + ((v >>> 2) & 0x3333);
  v = (v + (v >>> 4)) & 0x0F0F;
  return (v + (v >>> 8)) & 0x1F;
}

class CPU {
  constructor(bus) {
    this.bus = bus;
    this.r = new Int32Array(16);
    this.bankR13 = new Int32Array(6);
    this.bankR14 = new Int32Array(6);
    this.spsrBank = new Int32Array(6);
    this.usrR8 = new Int32Array(5);
    this.fiqR8 = new Int32Array(5);
    this.n = 0; this.z = 0; this.c = 0; this.v = 0;
    this.i = 0; this.f = 0; this.t = 0;
    this.mode = MODE_SYS;
    this.halted = false;
    this.branched = false;
    this.shc = 0;
    this.mulLo = 0; this.mulHi = 0;
    this.intrWait = false;
    this.swiHandler = null;
  }

  reset() {
    this.r.fill(0); this.bankR13.fill(0); this.bankR14.fill(0); this.spsrBank.fill(0);
    this.usrR8.fill(0); this.fiqR8.fill(0);
    this.n = this.z = this.c = this.v = 0;
    this.i = 0; this.f = 0; this.t = 0;
    this.mode = MODE_SYS;
    this.bankR13[bankOf(MODE_SVC)] = 0x03007FE0;
    this.bankR13[bankOf(MODE_IRQ)] = 0x03007FA0;
    this.r[13] = 0x03007F00;
    this.halted = false;
    this.intrWait = false;
    this.setPC(0x08000000);
  }

  getCPSR() {
    return (this.n << 31) | (this.z << 30) | (this.c << 29) | (this.v << 28) |
      (this.i << 7) | (this.f << 6) | (this.t << 5) | this.mode;
  }

  setCPSR(val) {
    let m = val & 0x1F;
    if (bankOf(m) === 0 && m !== MODE_USR && m !== MODE_SYS) m = MODE_SYS;
    this.switchMode(m);
    this.n = (val >>> 31) & 1; this.z = (val >>> 30) & 1;
    this.c = (val >>> 29) & 1; this.v = (val >>> 28) & 1;
    this.i = (val >>> 7) & 1; this.f = (val >>> 6) & 1; this.t = (val >>> 5) & 1;
  }

  getSPSR() {
    const b = bankOf(this.mode);
    return b ? this.spsrBank[b] : this.getCPSR();
  }

  setSPSR(val) {
    const b = bankOf(this.mode);
    if (b) this.spsrBank[b] = val;
  }

  switchMode(newMode) {
    const r = this.r;
    const ob = bankOf(this.mode), nb = bankOf(newMode);
    if (ob !== nb) {
      this.bankR13[ob] = r[13]; this.bankR14[ob] = r[14];
      r[13] = this.bankR13[nb]; r[14] = this.bankR14[nb];
      if (ob === 1) {
        for (let k = 0; k < 5; k++) { this.fiqR8[k] = r[8 + k]; r[8 + k] = this.usrR8[k]; }
      } else if (nb === 1) {
        for (let k = 0; k < 5; k++) { this.usrR8[k] = r[8 + k]; r[8 + k] = this.fiqR8[k]; }
      }
    }
    this.mode = newMode;
  }

  setPC(v) {
    if (this.t) this.r[15] = (v & ~1) + 4;
    else this.r[15] = (v & ~3) + 8;
    this.branched = true;
  }

  // Address of the instruction about to execute
  get pcAddr() { return this.r[15] - (this.t ? 4 : 8); }

  irq() {
    const ret = this.t ? this.r[15] : this.r[15] - 4;
    const cpsr = this.getCPSR();
    this.switchMode(MODE_IRQ);
    this.spsrBank[2] = cpsr;
    this.r[14] = ret;
    this.t = 0; this.i = 1;
    this.r[15] = 0x18 + 8;
    this.halted = false;
  }

  condPass(cond) {
    switch (cond) {
      case 0x0: return this.z;
      case 0x1: return !this.z;
      case 0x2: return this.c;
      case 0x3: return !this.c;
      case 0x4: return this.n;
      case 0x5: return !this.n;
      case 0x6: return this.v;
      case 0x7: return !this.v;
      case 0x8: return this.c && !this.z;
      case 0x9: return !this.c || this.z;
      case 0xA: return this.n === this.v;
      case 0xB: return this.n !== this.v;
      case 0xC: return !this.z && this.n === this.v;
      case 0xD: return this.z || this.n !== this.v;
      case 0xE: return true;
      default: return false;
    }
  }

  // Run until bus.cycles reaches bus.target
  run() {
    const bus = this.bus, r = this.r;
    while (bus.cycles < bus.target) {
      if (this.halted) {
        if (bus.ie & bus.if_) { this.halted = false; }
        else { bus.cycles = bus.target; break; }
      }
      if (bus.irqLine && !this.i) this.irq();
      this.branched = false;
      if (this.t) {
        const op = bus.fetch16(r[15] - 4);
        THUMB_TABLE[op >>> 6](this, op);
        if (!this.branched) r[15] += 2;
      } else {
        const op = bus.fetch32(r[15] - 8);
        const cond = op >>> 28;
        if (cond === 0xE || this.condPass(cond)) {
          ARM_TABLE[((op >>> 16) & 0xFF0) | ((op >>> 4) & 0xF)](this, op);
        }
        if (!this.branched) r[15] += 4;
      }
    }
  }

  // ---- flag helpers ----
  setNZ(res) { this.n = res >>> 31; this.z = (res | 0) === 0 ? 1 : 0; }

  add(a, b, s) {
    const sum = (a >>> 0) + (b >>> 0);
    const res = sum | 0;
    if (s) {
      this.n = res >>> 31; this.z = res === 0 ? 1 : 0;
      this.c = sum > 0xFFFFFFFF ? 1 : 0;
      this.v = ((a ^ res) & (b ^ res)) >>> 31;
    }
    return res;
  }

  sub(a, b, s) {
    const res = (a - b) | 0;
    if (s) {
      this.n = res >>> 31; this.z = res === 0 ? 1 : 0;
      this.c = (a >>> 0) >= (b >>> 0) ? 1 : 0;
      this.v = ((a ^ b) & (a ^ res)) >>> 31;
    }
    return res;
  }

  adc(a, b, s) {
    const sum = (a >>> 0) + (b >>> 0) + this.c;
    const res = sum | 0;
    if (s) {
      this.n = res >>> 31; this.z = res === 0 ? 1 : 0;
      this.c = sum > 0xFFFFFFFF ? 1 : 0;
      this.v = ((a ^ res) & (b ^ res)) >>> 31;
    }
    return res;
  }

  sbc(a, b, s) {
    const borrow = 1 - this.c;
    const res = (a - b - borrow) | 0;
    if (s) {
      this.n = res >>> 31; this.z = res === 0 ? 1 : 0;
      this.c = (a >>> 0) >= (b >>> 0) + borrow ? 1 : 0;
      this.v = ((a ^ b) & (a ^ res)) >>> 31;
    }
    return res;
  }

  // ---- state ----
  getState() {
    return {
      r: Array.from(this.r), bankR13: Array.from(this.bankR13), bankR14: Array.from(this.bankR14),
      spsrBank: Array.from(this.spsrBank), usrR8: Array.from(this.usrR8), fiqR8: Array.from(this.fiqR8),
      cpsr: this.getCPSR(), halted: this.halted, intrWait: this.intrWait,
    };
  }

  setState(s) {
    this.mode = s.cpsr & 0x1F;
    this.r.set(s.r); this.bankR13.set(s.bankR13); this.bankR14.set(s.bankR14);
    this.spsrBank.set(s.spsrBank); this.usrR8.set(s.usrR8); this.fiqR8.set(s.fiqR8);
    const v = s.cpsr;
    this.n = (v >>> 31) & 1; this.z = (v >>> 30) & 1; this.c = (v >>> 29) & 1; this.v = (v >>> 28) & 1;
    this.i = (v >>> 7) & 1; this.f = (v >>> 6) & 1; this.t = (v >>> 5) & 1;
    this.halted = s.halted; this.intrWait = s.intrWait;
  }
}

// ================= Barrel shifter =================

function shiftImm(cpu, type, v, amt) {
  switch (type) {
    case 0:
      if (amt === 0) { cpu.shc = cpu.c; return v; }
      cpu.shc = (v >>> (32 - amt)) & 1; return v << amt;
    case 1:
      if (amt === 0) { cpu.shc = v >>> 31; return 0; }
      cpu.shc = (v >>> (amt - 1)) & 1; return v >>> amt;
    case 2:
      if (amt === 0) { cpu.shc = v >>> 31; return v >> 31; }
      cpu.shc = (v >> (amt - 1)) & 1; return v >> amt;
    default:
      if (amt === 0) { cpu.shc = v & 1; return (cpu.c << 31) | (v >>> 1); }
      cpu.shc = (v >>> (amt - 1)) & 1; return (v >>> amt) | (v << (32 - amt));
  }
}

function shiftReg(cpu, type, v, amt) {
  if (amt === 0) { cpu.shc = cpu.c; return v; }
  switch (type) {
    case 0:
      if (amt < 32) { cpu.shc = (v >>> (32 - amt)) & 1; return v << amt; }
      cpu.shc = amt === 32 ? (v & 1) : 0; return 0;
    case 1:
      if (amt < 32) { cpu.shc = (v >>> (amt - 1)) & 1; return v >>> amt; }
      cpu.shc = amt === 32 ? (v >>> 31) : 0; return 0;
    case 2:
      if (amt < 32) { cpu.shc = (v >> (amt - 1)) & 1; return v >> amt; }
      cpu.shc = v >>> 31; return v >> 31;
    default:
      amt &= 31;
      if (amt === 0) { cpu.shc = v >>> 31; return v; }
      cpu.shc = (v >>> (amt - 1)) & 1; return (v >>> amt) | (v << (32 - amt));
  }
}

function mulCycles(v) {
  if ((v & 0xFFFFFF00) === 0 || (v & 0xFFFFFF00) === (0xFFFFFF00 | 0)) return 1;
  if ((v & 0xFFFF0000) === 0 || (v & 0xFFFF0000) === (0xFFFF0000 | 0)) return 2;
  if ((v & 0xFF000000) === 0 || (v & 0xFF000000) === (0xFF000000 | 0)) return 3;
  return 4;
}

function mul64(cpu, a, b, signed) {
  const au = a >>> 0, bu = b >>> 0;
  const al = au & 0xFFFF, ah = au >>> 16, bl = bu & 0xFFFF, bh = bu >>> 16;
  const ll = al * bl, mid = al * bh + ah * bl, hh = ah * bh;
  const midLo = mid % 65536, midHi = Math.floor(mid / 65536);
  let lo = ll + midLo * 65536;
  let carry = 0;
  if (lo >= 4294967296) { lo -= 4294967296; carry = 1; }
  let hi = hh + midHi + carry;
  if (signed) {
    if (a < 0) hi -= bu;
    if (b < 0) hi -= au;
  }
  cpu.mulLo = lo | 0;
  cpu.mulHi = hi | 0;
}

// ================= ARM instructions =================

function armUndef(cpu, op) { /* treated as no-op */ }

function armDataProc(cpu, op) {
  const r = cpu.r;
  const opcode = (op >>> 21) & 0xF;
  const s = (op >>> 20) & 1;
  const rn = (op >>> 16) & 0xF, rd = (op >>> 12) & 0xF;
  let op2, a;
  if (op & 0x02000000) {
    const imm = op & 0xFF, rot = (op >>> 7) & 0x1E;
    if (rot) { op2 = (imm >>> rot) | (imm << (32 - rot)); cpu.shc = op2 >>> 31; }
    else { op2 = imm; cpu.shc = cpu.c; }
    a = r[rn];
  } else {
    const rm = op & 0xF, type = (op >>> 5) & 3;
    if (op & 0x10) {
      let rmv = r[rm]; if (rm === 15) rmv = (rmv + 4) | 0;
      a = r[rn]; if (rn === 15) a = (a + 4) | 0;
      op2 = shiftReg(cpu, type, rmv, r[(op >>> 8) & 0xF] & 0xFF);
      cpu.bus.cycles += 1;
    } else {
      op2 = shiftImm(cpu, type, r[rm], (op >>> 7) & 0x1F);
      a = r[rn];
    }
  }
  const setFlags = s && rd !== 15;
  let res;
  switch (opcode) {
    case 0x0: res = a & op2; if (setFlags) { cpu.setNZ(res); cpu.c = cpu.shc; } break;
    case 0x1: res = a ^ op2; if (setFlags) { cpu.setNZ(res); cpu.c = cpu.shc; } break;
    case 0x2: res = cpu.sub(a, op2, setFlags); break;
    case 0x3: res = cpu.sub(op2, a, setFlags); break;
    case 0x4: res = cpu.add(a, op2, setFlags); break;
    case 0x5: res = cpu.adc(a, op2, setFlags); break;
    case 0x6: res = cpu.sbc(a, op2, setFlags); break;
    case 0x7: res = cpu.sbc(op2, a, setFlags); break;
    case 0x8: res = a & op2; cpu.setNZ(res); cpu.c = cpu.shc; if (rd === 15) cpu.setCPSR(cpu.getSPSR()); return;
    case 0x9: res = a ^ op2; cpu.setNZ(res); cpu.c = cpu.shc; if (rd === 15) cpu.setCPSR(cpu.getSPSR()); return;
    case 0xA: cpu.sub(a, op2, true); if (rd === 15) cpu.setCPSR(cpu.getSPSR()); return;
    case 0xB: cpu.add(a, op2, true); if (rd === 15) cpu.setCPSR(cpu.getSPSR()); return;
    case 0xC: res = a | op2; if (setFlags) { cpu.setNZ(res); cpu.c = cpu.shc; } break;
    case 0xD: res = op2; if (setFlags) { cpu.setNZ(res); cpu.c = cpu.shc; } break;
    case 0xE: res = a & ~op2; if (setFlags) { cpu.setNZ(res); cpu.c = cpu.shc; } break;
    default: res = ~op2; if (setFlags) { cpu.setNZ(res); cpu.c = cpu.shc; } break;
  }
  if (rd === 15) {
    if (s) cpu.setCPSR(cpu.getSPSR());
    cpu.setPC(res);
  } else {
    r[rd] = res;
  }
}

function armMrs(cpu, op) {
  cpu.r[(op >>> 12) & 0xF] = (op & 0x00400000) ? cpu.getSPSR() : cpu.getCPSR();
}

function armMsr(cpu, op) {
  let val;
  if (op & 0x02000000) {
    const imm = op & 0xFF, rot = (op >>> 7) & 0x1E;
    val = rot ? ((imm >>> rot) | (imm << (32 - rot))) : imm;
  } else {
    val = cpu.r[op & 0xF];
  }
  const fm = (op >>> 16) & 0xF;
  let mask = 0;
  if (fm & 8) mask |= 0xFF000000;
  if (fm & 4) mask |= 0x00FF0000;
  if (fm & 2) mask |= 0x0000FF00;
  if (fm & 1) mask |= 0x000000FF;
  if (op & 0x00400000) {
    cpu.setSPSR((cpu.getSPSR() & ~mask) | (val & mask));
  } else {
    if (cpu.mode === MODE_USR) mask &= 0xFF000000;
    let nv = (cpu.getCPSR() & ~mask) | (val & mask);
    nv = (nv & ~0x20) | (cpu.t << 5); // T bit can't be changed by MSR
    cpu.setCPSR(nv);
  }
}

function armBX(cpu, op) {
  const v = cpu.r[op & 0xF];
  cpu.t = v & 1;
  cpu.setPC(v);
}

function armMul(cpu, op) {
  const r = cpu.r;
  const rd = (op >>> 16) & 0xF, rn = (op >>> 12) & 0xF, rs = (op >>> 8) & 0xF, rm = op & 0xF;
  let res = Math.imul(r[rm], r[rs]);
  if (op & 0x00200000) { res = (res + r[rn]) | 0; cpu.bus.cycles += 1; }
  r[rd] = res;
  if (op & 0x00100000) cpu.setNZ(res);
  cpu.bus.cycles += mulCycles(r[rs]);
}

function armMulLong(cpu, op) {
  const r = cpu.r;
  const hiR = (op >>> 16) & 0xF, loR = (op >>> 12) & 0xF, rs = (op >>> 8) & 0xF, rm = op & 0xF;
  mul64(cpu, r[rm], r[rs], op & 0x00400000);
  let lo = cpu.mulLo, hi = cpu.mulHi;
  if (op & 0x00200000) {
    const l = (lo >>> 0) + (r[loR] >>> 0);
    const carry = l > 0xFFFFFFFF ? 1 : 0;
    lo = l | 0;
    hi = (hi + r[hiR] + carry) | 0;
    cpu.bus.cycles += 1;
  }
  r[loR] = lo; r[hiR] = hi;
  if (op & 0x00100000) { cpu.n = hi >>> 31; cpu.z = (hi === 0 && lo === 0) ? 1 : 0; }
  cpu.bus.cycles += mulCycles(r[rs]) + 1;
}

function armSwp(cpu, op) {
  const r = cpu.r, bus = cpu.bus;
  const addr = r[(op >>> 16) & 0xF], rd = (op >>> 12) & 0xF, rm = op & 0xF;
  if (op & 0x00400000) {
    const t = bus.read8(addr);
    bus.write8(addr, r[rm] & 0xFF);
    r[rd] = t;
  } else {
    let t = bus.read32(addr);
    const rot = (addr & 3) << 3;
    if (rot) t = (t >>> rot) | (t << (32 - rot));
    bus.write32(addr, r[rm]);
    r[rd] = t;
  }
  bus.cycles += 1;
}

function armHalf(cpu, op) {
  const r = cpu.r, bus = cpu.bus;
  const rn = (op >>> 16) & 0xF, rd = (op >>> 12) & 0xF;
  const off = (op & 0x00400000) ? (((op >>> 4) & 0xF0) | (op & 0xF)) : r[op & 0xF];
  const base = r[rn];
  const offAddr = (op & 0x00800000) ? (base + off) | 0 : (base - off) | 0;
  const pre = op & 0x01000000;
  const addr = pre ? offAddr : base;
  const wb = !pre || (op & 0x00200000);
  const sh = (op >>> 5) & 3;
  if (op & 0x00100000) {
    let val;
    if (sh === 1) {
      val = bus.read16(addr);
      if (addr & 1) val = (val >>> 8) | (val << 24);
    } else if (sh === 2) {
      val = (bus.read8(addr) << 24) >> 24;
    } else {
      if (addr & 1) val = (bus.read8(addr) << 24) >> 24;
      else val = (bus.read16(addr) << 16) >> 16;
    }
    if (wb && rn !== rd) r[rn] = offAddr;
    bus.cycles += 1;
    if (rd === 15) cpu.setPC(val); else r[rd] = val;
  } else {
    if (sh === 1) {
      let val = r[rd]; if (rd === 15) val += 4;
      bus.write16(addr, val & 0xFFFF);
    }
    if (wb) r[rn] = offAddr;
  }
}

function armSDT(cpu, op) {
  const r = cpu.r, bus = cpu.bus;
  const rn = (op >>> 16) & 0xF, rd = (op >>> 12) & 0xF;
  let off;
  if (op & 0x02000000) {
    const amt = (op >>> 7) & 0x1F, type = (op >>> 5) & 3, v = r[op & 0xF];
    switch (type) {
      case 0: off = v << amt; break;
      case 1: off = amt ? v >>> amt : 0; break;
      case 2: off = amt ? v >> amt : v >> 31; break;
      default: off = amt ? ((v >>> amt) | (v << (32 - amt))) : ((cpu.c << 31) | (v >>> 1)); break;
    }
  } else {
    off = op & 0xFFF;
  }
  const base = r[rn];
  const offAddr = (op & 0x00800000) ? (base + off) | 0 : (base - off) | 0;
  const pre = op & 0x01000000;
  const addr = pre ? offAddr : base;
  const wb = !pre || (op & 0x00200000);
  if (op & 0x00100000) {
    let val;
    if (op & 0x00400000) val = bus.read8(addr);
    else {
      val = bus.read32(addr);
      const rot = (addr & 3) << 3;
      if (rot) val = (val >>> rot) | (val << (32 - rot));
    }
    if (wb && rn !== rd) r[rn] = offAddr;
    bus.cycles += 1;
    if (rd === 15) cpu.setPC(val); else r[rd] = val;
  } else {
    let val = r[rd]; if (rd === 15) val += 4;
    if (op & 0x00400000) bus.write8(addr, val & 0xFF);
    else bus.write32(addr, val);
    if (wb) r[rn] = offAddr;
  }
}

function armBlock(cpu, op) {
  const r = cpu.r, bus = cpu.bus;
  const rn = (op >>> 16) & 0xF;
  let list = op & 0xFFFF;
  const pre = op & 0x01000000, up = op & 0x00800000, sbit = op & 0x00400000;
  const wb = op & 0x00200000, load = op & 0x00100000;
  const base = r[rn];
  let count;
  if (list === 0) { list = 0x8000; count = 16; } else count = popcount16(list);
  let start, fin;
  if (up) { start = pre ? base + 4 : base; fin = base + count * 4; }
  else { fin = base - count * 4; start = pre ? fin : fin + 4; }
  start |= 0; fin |= 0;
  const userBank = sbit && !(load && (list & 0x8000));
  const oldMode = cpu.mode;
  if (userBank) cpu.switchMode(MODE_SYS);
  let addr = start;
  if (load) {
    let pcVal = 0;
    for (let i = 0; i < 16; i++) {
      if (list & (1 << i)) {
        const v = bus.read32(addr);
        addr = (addr + 4) | 0;
        if (i === 15) pcVal = v; else r[i] = v;
      }
    }
    bus.cycles += 1;
    if (userBank) cpu.switchMode(oldMode);
    if (wb && !(list & (1 << rn))) r[rn] = fin;
    if (list & 0x8000) {
      if (sbit) cpu.setCPSR(cpu.getSPSR());
      cpu.setPC(pcVal);
    }
  } else {
    let first = true;
    for (let i = 0; i < 16; i++) {
      if (list & (1 << i)) {
        let v;
        if (i === 15) v = r[15] + 4;
        else if (i === rn && wb && !first) v = fin;
        else v = r[i];
        bus.write32(addr, v);
        addr = (addr + 4) | 0;
        first = false;
      }
    }
    if (userBank) cpu.switchMode(oldMode);
    if (wb) r[rn] = fin;
  }
}

function armB(cpu, op) {
  const off = (op << 8) >> 6;
  if (op & 0x01000000) cpu.r[14] = cpu.r[15] - 4;
  cpu.setPC(cpu.r[15] + off);
}

function armSwi(cpu, op) {
  cpu.swiHandler((op >>> 16) & 0xFF);
}

// ================= Thumb instructions =================

function thumbShift(cpu, op) {
  const r = cpu.r;
  const res = shiftImm(cpu, (op >>> 11) & 3, r[(op >>> 3) & 7], (op >>> 6) & 0x1F);
  r[op & 7] = res;
  cpu.setNZ(res); cpu.c = cpu.shc;
}

function thumbAddSub(cpu, op) {
  const r = cpu.r;
  const a = r[(op >>> 3) & 7];
  const n = (op >>> 6) & 7;
  const b = (op & 0x0400) ? n : r[n];
  r[op & 7] = (op & 0x0200) ? cpu.sub(a, b, true) : cpu.add(a, b, true);
}

function thumbImm(cpu, op) {
  const r = cpu.r;
  const rd = (op >>> 8) & 7, imm = op & 0xFF;
  switch ((op >>> 11) & 3) {
    case 0: r[rd] = imm; cpu.n = 0; cpu.z = imm === 0 ? 1 : 0; break;
    case 1: cpu.sub(r[rd], imm, true); break;
    case 2: r[rd] = cpu.add(r[rd], imm, true); break;
    default: r[rd] = cpu.sub(r[rd], imm, true); break;
  }
}

function thumbAlu(cpu, op) {
  const r = cpu.r;
  const rd = op & 7, rs = (op >>> 3) & 7;
  const a = r[rd], b = r[rs];
  let res;
  switch ((op >>> 6) & 0xF) {
    case 0x0: res = a & b; cpu.setNZ(res); r[rd] = res; break;
    case 0x1: res = a ^ b; cpu.setNZ(res); r[rd] = res; break;
    case 0x2: res = shiftReg(cpu, 0, a, b & 0xFF); cpu.setNZ(res); cpu.c = cpu.shc; r[rd] = res; cpu.bus.cycles++; break;
    case 0x3: res = shiftReg(cpu, 1, a, b & 0xFF); cpu.setNZ(res); cpu.c = cpu.shc; r[rd] = res; cpu.bus.cycles++; break;
    case 0x4: res = shiftReg(cpu, 2, a, b & 0xFF); cpu.setNZ(res); cpu.c = cpu.shc; r[rd] = res; cpu.bus.cycles++; break;
    case 0x5: r[rd] = cpu.adc(a, b, true); break;
    case 0x6: r[rd] = cpu.sbc(a, b, true); break;
    case 0x7: res = shiftReg(cpu, 3, a, b & 0xFF); cpu.setNZ(res); cpu.c = cpu.shc; r[rd] = res; cpu.bus.cycles++; break;
    case 0x8: cpu.setNZ(a & b); break;
    case 0x9: r[rd] = cpu.sub(0, b, true); break;
    case 0xA: cpu.sub(a, b, true); break;
    case 0xB: cpu.add(a, b, true); break;
    case 0xC: res = a | b; cpu.setNZ(res); r[rd] = res; break;
    case 0xD: res = Math.imul(a, b); cpu.setNZ(res); r[rd] = res; cpu.bus.cycles += mulCycles(a); break;
    case 0xE: res = a & ~b; cpu.setNZ(res); r[rd] = res; break;
    default: res = ~b; cpu.setNZ(res); r[rd] = res; break;
  }
}

function thumbHiReg(cpu, op) {
  const r = cpu.r;
  const rd = (op & 7) | ((op >>> 4) & 8);
  const rs = (op >>> 3) & 0xF;
  const sv = r[rs];
  switch ((op >>> 8) & 3) {
    case 0: {
      const res = (r[rd] + sv) | 0;
      if (rd === 15) cpu.setPC(res); else r[rd] = res;
      break;
    }
    case 1: cpu.sub(r[rd], sv, true); break;
    case 2:
      if (rd === 15) cpu.setPC(sv); else r[rd] = sv;
      break;
    default:
      cpu.t = sv & 1;
      cpu.setPC(sv);
      break;
  }
}

function thumbLdrPc(cpu, op) {
  const r = cpu.r;
  r[(op >>> 8) & 7] = cpu.bus.read32(((r[15] & ~2) + ((op & 0xFF) << 2)) | 0);
  cpu.bus.cycles += 1;
}

function ldrRot(bus, addr) {
  let val = bus.read32(addr);
  const rot = (addr & 3) << 3;
  if (rot) val = (val >>> rot) | (val << (32 - rot));
  return val;
}

function thumbLdStReg(cpu, op) {
  const r = cpu.r, bus = cpu.bus;
  const addr = (r[(op >>> 3) & 7] + r[(op >>> 6) & 7]) | 0;
  const rd = op & 7;
  switch ((op >>> 10) & 3) {
    case 0: bus.write32(addr, r[rd]); break;
    case 1: bus.write8(addr, r[rd] & 0xFF); break;
    case 2: r[rd] = ldrRot(bus, addr); bus.cycles++; break;
    default: r[rd] = bus.read8(addr); bus.cycles++; break;
  }
}

function thumbLdStSign(cpu, op) {
  const r = cpu.r, bus = cpu.bus;
  const addr = (r[(op >>> 3) & 7] + r[(op >>> 6) & 7]) | 0;
  const rd = op & 7;
  switch ((op >>> 10) & 3) {
    case 0: bus.write16(addr, r[rd] & 0xFFFF); break;
    case 1: r[rd] = (bus.read8(addr) << 24) >> 24; bus.cycles++; break;
    case 2: {
      let v = bus.read16(addr);
      if (addr & 1) v = (v >>> 8) | (v << 24);
      r[rd] = v; bus.cycles++;
      break;
    }
    default:
      if (addr & 1) r[rd] = (bus.read8(addr) << 24) >> 24;
      else r[rd] = (bus.read16(addr) << 16) >> 16;
      bus.cycles++;
      break;
  }
}

function thumbLdStImm(cpu, op) {
  const r = cpu.r, bus = cpu.bus;
  const rd = op & 7, off = (op >>> 6) & 0x1F;
  const base = r[(op >>> 3) & 7];
  switch ((op >>> 11) & 3) {
    case 0: bus.write32((base + (off << 2)) | 0, r[rd]); break;
    case 1: r[rd] = ldrRot(bus, (base + (off << 2)) | 0); bus.cycles++; break;
    case 2: bus.write8((base + off) | 0, r[rd] & 0xFF); break;
    default: r[rd] = bus.read8((base + off) | 0); bus.cycles++; break;
  }
}

function thumbLdStH(cpu, op) {
  const r = cpu.r, bus = cpu.bus;
  const rd = op & 7;
  const addr = (r[(op >>> 3) & 7] + (((op >>> 6) & 0x1F) << 1)) | 0;
  if (op & 0x0800) {
    let v = bus.read16(addr);
    if (addr & 1) v = (v >>> 8) | (v << 24);
    r[rd] = v; bus.cycles++;
  } else {
    bus.write16(addr, r[rd] & 0xFFFF);
  }
}

function thumbLdStSp(cpu, op) {
  const r = cpu.r, bus = cpu.bus;
  const rd = (op >>> 8) & 7;
  const addr = (r[13] + ((op & 0xFF) << 2)) | 0;
  if (op & 0x0800) { r[rd] = ldrRot(bus, addr); bus.cycles++; }
  else bus.write32(addr, r[rd]);
}

function thumbLoadAddr(cpu, op) {
  const r = cpu.r;
  const base = (op & 0x0800) ? r[13] : (r[15] & ~2);
  r[(op >>> 8) & 7] = (base + ((op & 0xFF) << 2)) | 0;
}

function thumbAddSp(cpu, op) {
  const off = (op & 0x7F) << 2;
  cpu.r[13] = (op & 0x80) ? (cpu.r[13] - off) | 0 : (cpu.r[13] + off) | 0;
}

function thumbPushPop(cpu, op) {
  const r = cpu.r, bus = cpu.bus;
  const list = op & 0xFF, R = op & 0x100;
  if (op & 0x0800) { // POP
    let addr = r[13];
    if (list === 0 && !R) {
      const v = bus.read32(addr);
      r[13] = (addr + 0x40) | 0;
      cpu.setPC(v);
      return;
    }
    for (let i = 0; i < 8; i++) {
      if (list & (1 << i)) { r[i] = bus.read32(addr); addr = (addr + 4) | 0; }
    }
    let pcVal = 0;
    if (R) { pcVal = bus.read32(addr); addr = (addr + 4) | 0; }
    r[13] = addr;
    bus.cycles++;
    if (R) cpu.setPC(pcVal);
  } else { // PUSH
    if (list === 0 && !R) {
      const addr = (r[13] - 0x40) | 0;
      bus.write32(addr, r[15] + 2);
      r[13] = addr;
      return;
    }
    const n = popcount16(list) + (R ? 1 : 0);
    let addr = (r[13] - n * 4) | 0;
    r[13] = addr;
    for (let i = 0; i < 8; i++) {
      if (list & (1 << i)) { bus.write32(addr, r[i]); addr = (addr + 4) | 0; }
    }
    if (R) bus.write32(addr, r[14]);
  }
}

function thumbLdmStm(cpu, op) {
  const r = cpu.r, bus = cpu.bus;
  const rb = (op >>> 8) & 7, list = op & 0xFF;
  let addr = r[rb];
  if (list === 0) {
    if (op & 0x0800) { const v = bus.read32(addr); r[rb] = (addr + 0x40) | 0; cpu.setPC(v); }
    else { bus.write32(addr, r[15] + 2); r[rb] = (addr + 0x40) | 0; }
    return;
  }
  const fin = (addr + popcount16(list) * 4) | 0;
  if (op & 0x0800) {
    for (let i = 0; i < 8; i++) {
      if (list & (1 << i)) { r[i] = bus.read32(addr); addr = (addr + 4) | 0; }
    }
    if (!(list & (1 << rb))) r[rb] = fin;
    bus.cycles++;
  } else {
    let first = true;
    for (let i = 0; i < 8; i++) {
      if (list & (1 << i)) {
        bus.write32(addr, (i === rb && !first) ? fin : r[i]);
        addr = (addr + 4) | 0;
        first = false;
      }
    }
    r[rb] = fin;
  }
}

function thumbBcond(cpu, op) {
  if (cpu.condPass((op >>> 8) & 0xF)) cpu.setPC(cpu.r[15] + ((op << 24) >> 23));
}

function thumbSwi(cpu, op) {
  cpu.swiHandler(op & 0xFF);
}

function thumbB(cpu, op) {
  cpu.setPC(cpu.r[15] + ((op << 21) >> 20));
}

function thumbBL(cpu, op) {
  const r = cpu.r;
  if (!(op & 0x0800)) {
    r[14] = (r[15] + (((op & 0x7FF) << 21) >> 9)) | 0;
  } else {
    const next = (r[15] - 2) | 1;
    cpu.setPC((r[14] + ((op & 0x7FF) << 1)) | 0);
    r[14] = next;
  }
}

function thumbUndef(cpu, op) { }

// ================= Decode tables =================

const ARM_TABLE = new Array(4096);
const THUMB_TABLE = new Array(1024);

(function buildTables() {
  for (let i = 0; i < 4096; i++) {
    const hi = i >>> 4, lo = i & 0xF;
    let fn;
    if ((hi & 0xE0) === 0x00) {
      if (lo === 0x9) {
        if ((hi & 0xFC) === 0x00) fn = armMul;
        else if ((hi & 0xF8) === 0x08) fn = armMulLong;
        else if ((hi & 0xFB) === 0x10) fn = armSwp;
        else fn = armUndef;
      } else if ((lo & 0x9) === 0x9) {
        fn = armHalf;
      } else if (hi === 0x12 && lo === 0x1) {
        fn = armBX;
      } else if ((hi & 0xFB) === 0x10 && lo === 0) {
        fn = armMrs;
      } else if ((hi & 0xFB) === 0x12 && lo === 0) {
        fn = armMsr;
      } else if ((hi & 0xF9) === 0x10) {
        fn = armUndef;
      } else {
        fn = armDataProc;
      }
    } else if ((hi & 0xE0) === 0x20) {
      if ((hi & 0xFB) === 0x32) fn = armMsr;
      else if ((hi & 0xFB) === 0x30) fn = armUndef;
      else fn = armDataProc;
    } else if ((hi & 0xE0) === 0x40) {
      fn = armSDT;
    } else if ((hi & 0xE0) === 0x60) {
      fn = (lo & 1) ? armUndef : armSDT;
    } else if ((hi & 0xE0) === 0x80) {
      fn = armBlock;
    } else if ((hi & 0xE0) === 0xA0) {
      fn = armB;
    } else if ((hi & 0xF0) === 0xF0) {
      fn = armSwi;
    } else {
      fn = armUndef;
    }
    ARM_TABLE[i] = fn;
  }

  for (let i = 0; i < 1024; i++) {
    const op = i << 6;
    let fn;
    if ((op & 0xF800) === 0x1800) fn = thumbAddSub;
    else if ((op & 0xE000) === 0x0000) fn = thumbShift;
    else if ((op & 0xE000) === 0x2000) fn = thumbImm;
    else if ((op & 0xFC00) === 0x4000) fn = thumbAlu;
    else if ((op & 0xFC00) === 0x4400) fn = thumbHiReg;
    else if ((op & 0xF800) === 0x4800) fn = thumbLdrPc;
    else if ((op & 0xF200) === 0x5000) fn = thumbLdStReg;
    else if ((op & 0xF200) === 0x5200) fn = thumbLdStSign;
    else if ((op & 0xE000) === 0x6000) fn = thumbLdStImm;
    else if ((op & 0xF000) === 0x8000) fn = thumbLdStH;
    else if ((op & 0xF000) === 0x9000) fn = thumbLdStSp;
    else if ((op & 0xF000) === 0xA000) fn = thumbLoadAddr;
    else if ((op & 0xFF00) === 0xB000) fn = thumbAddSp;
    else if ((op & 0xF600) === 0xB400) fn = thumbPushPop;
    else if ((op & 0xF000) === 0xC000) fn = thumbLdmStm;
    else if ((op & 0xFF00) === 0xDF00) fn = thumbSwi;
    else if ((op & 0xF000) === 0xD000) fn = thumbBcond;
    else if ((op & 0xF800) === 0xE000) fn = thumbB;
    else if ((op & 0xF000) === 0xF000) fn = thumbBL;
    else fn = thumbUndef;
    THUMB_TABLE[i] = fn;
  }
})();
