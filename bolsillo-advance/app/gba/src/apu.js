// Sound: 4 PSG channels + 2 DirectSound FIFOs, mixed to 32768 Hz stereo

const SAMPLE_RATE = 32768;
const CYCLES_PER_SAMPLE = 512;
const DUTY = [
  [0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
];
const RING_SIZE = 16384; // stereo frames

class APU {
  constructor(gba) {
    this.gba = gba;
    this.io16 = gba.bus.io16;
    this.ring = new Float32Array(RING_SIZE * 2);
    this.wave = new Uint8Array(32);
    this.fifo = [new Int8Array(32), new Int8Array(32)];
    this.reset();
  }

  reset() {
    this.next = CYCLES_PER_SAMPLE;
    this.writePos = 0; this.readPos = 0;
    this.ring.fill(0);
    this.wave.fill(0);
    this.fifoR = [0, 0]; this.fifoW = [0, 0]; this.fifoCount = [0, 0]; this.fifoSample = [0, 0];
    this.seqStep = 0; this.seqCounter = 0;
    this.ch = [];
    for (let i = 0; i < 4; i++) {
      this.ch.push({
        on: false, freq: 0, phase: 0, length: 0, lenEn: false,
        vol: 0, envDir: 0, envPeriod: 0, envTimer: 0,
        sweepTime: 0, sweepDir: 0, sweepShift: 0, sweepTimer: 0, shadow: 0, sweepOn: false,
        lfsr: 0x7FFF, acc: 0,
      });
    }
    this.enabled = false;
  }

  // ---------- registers ----------

  read16(off) {
    const io = this.io16;
    if (off === 0x84) {
      let v = io[off >>> 1] & 0x80;
      for (let i = 0; i < 4; i++) if (this.ch[i].on) v |= 1 << i;
      return v;
    }
    if (off >= 0x90 && off < 0xA0) {
      const bank = (io[0x70 >>> 1] & 0x40) ? 0 : 16;
      const i = bank + (off - 0x90);
      return this.wave[i] | (this.wave[i + 1] << 8);
    }
    if (off >= 0xA0) return 0;
    switch (off) {
      case 0x60: return io[off >>> 1] & 0x7F;
      case 0x62: case 0x68: case 0x78: return io[off >>> 1] & 0xFFC0;
      case 0x64: case 0x6C: case 0x74: case 0x7C: return io[off >>> 1] & 0x4000 | (off === 0x7C ? io[off >>> 1] & 0xFF : 0);
      case 0x70: return io[off >>> 1] & 0xE0;
      case 0x72: return io[off >>> 1] & 0xE000;
      case 0x80: return io[off >>> 1] & 0xFF77;
      case 0x82: return io[off >>> 1] & 0x770F;
      case 0x88: return io[off >>> 1];
      default: return 0;
    }
  }

  write16(off, val) {
    const io = this.io16;
    if (off >= 0x90 && off < 0xA0) {
      const bank = (io[0x70 >>> 1] & 0x40) ? 0 : 16;
      const i = bank + (off - 0x90);
      this.wave[i] = val & 0xFF; this.wave[i + 1] = val >>> 8;
      return;
    }
    if (off >= 0xA0 && off < 0xA8) {
      const n = off >= 0xA4 ? 1 : 0;
      this.fifoWrite8(n, val & 0xFF);
      this.fifoWrite8(n, val >>> 8);
      return;
    }
    if (off === 0x84) {
      io[off >>> 1] = val & 0x80;
      this.enabled = !!(val & 0x80);
      if (!this.enabled) {
        for (let i = 0; i < 4; i++) this.ch[i].on = false;
        for (let r = 0x60; r < 0x82; r += 2) io[r >>> 1] = 0;
      }
      return;
    }
    if (!this.enabled && off < 0x80) return;
    const ch = this.ch;
    switch (off) {
      case 0x60: io[off >>> 1] = val;
        ch[0].sweepShift = val & 7; ch[0].sweepDir = (val >>> 3) & 1; ch[0].sweepTime = (val >>> 4) & 7;
        return;
      case 0x62: case 0x68: case 0x78: {
        io[off >>> 1] = val;
        const c = ch[off === 0x62 ? 0 : off === 0x68 ? 1 : 3];
        c.length = 64 - (val & 0x3F);
        c.envPeriod = (val >>> 8) & 7; c.envDir = (val >>> 11) & 1;
        if ((val >>> 11) === 0) c.on = false; // DAC off
        return;
      }
      case 0x64: case 0x6C: {
        io[off >>> 1] = val & 0x7FFF;
        const c = ch[off === 0x64 ? 0 : 1];
        c.freq = val & 0x7FF; c.lenEn = !!(val & 0x4000);
        if (val & 0x8000) this.trigger(off === 0x64 ? 0 : 1);
        return;
      }
      case 0x70: io[off >>> 1] = val; if (!(val & 0x80)) ch[2].on = false; return;
      case 0x72: io[off >>> 1] = val; ch[2].length = 256 - (val & 0xFF); return;
      case 0x74: io[off >>> 1] = val & 0x7FFF;
        ch[2].freq = val & 0x7FF; ch[2].lenEn = !!(val & 0x4000);
        if (val & 0x8000) this.trigger(2);
        return;
      case 0x7C: io[off >>> 1] = val & 0x7FFF;
        ch[3].lenEn = !!(val & 0x4000);
        if (val & 0x8000) this.trigger(3);
        return;
      case 0x82:
        io[off >>> 1] = val & 0x770F;
        if (val & 0x0800) this.fifoReset(0);
        if (val & 0x8000) this.fifoReset(1);
        return;
      default:
        io[off >>> 1] = val;
    }
  }

  trigger(n) {
    const c = this.ch[n], io = this.io16;
    if (n === 2) {
      c.on = !!(io[0x70 >>> 1] & 0x80);
      if (c.length === 0) c.length = 256;
      c.phase = 0;
      return;
    }
    const envReg = io[(n === 0 ? 0x62 : n === 1 ? 0x68 : 0x78) >>> 1];
    c.vol = envReg >>> 12;
    c.envTimer = c.envPeriod;
    c.on = (envReg >>> 11) !== 0;
    if (c.length === 0) c.length = 64;
    if (n === 0) {
      c.shadow = c.freq;
      c.sweepTimer = c.sweepTime || 8;
      c.sweepOn = c.sweepTime !== 0 || c.sweepShift !== 0;
      if (c.sweepShift && this.sweepCalc() > 2047) c.on = false;
    }
    if (n === 3) { c.lfsr = (io[0x7C >>> 1] & 8) ? 0x7F : 0x7FFF; c.acc = 0; }
  }

  sweepCalc() {
    const c = this.ch[0];
    const d = c.shadow >>> c.sweepShift;
    return c.sweepDir ? c.shadow - d : c.shadow + d;
  }

  fifoReset(n) { this.fifoR[n] = 0; this.fifoW[n] = 0; this.fifoCount[n] = 0; }

  fifoWrite8(n, v) {
    if (this.fifoCount[n] >= 32) return;
    this.fifo[n][this.fifoW[n]] = v;
    this.fifoW[n] = (this.fifoW[n] + 1) & 31;
    this.fifoCount[n]++;
  }

  timerOverflow(t) {
    if (!this.enabled) return;
    const cnth = this.io16[0x82 >>> 1];
    for (let n = 0; n < 2; n++) {
      const timer = (cnth >>> (n ? 14 : 10)) & 1;
      if (timer !== t) continue;
      if (this.fifoCount[n] > 0) {
        this.fifoSample[n] = this.fifo[n][this.fifoR[n]];
        this.fifoR[n] = (this.fifoR[n] + 1) & 31;
        this.fifoCount[n]--;
      }
      if (this.fifoCount[n] <= 16) this.gba.dma.fifoRequest(n ? 0x040000A4 : 0x040000A0);
    }
  }

  // ---------- frame sequencer (512 Hz) ----------

  clockSequencer() {
    const step = this.seqStep;
    this.seqStep = (step + 1) & 7;
    const ch = this.ch;
    if ((step & 1) === 0) {
      for (let i = 0; i < 4; i++) {
        const c = ch[i];
        if (c.lenEn && c.length > 0) { c.length--; if (c.length === 0) c.on = false; }
      }
    }
    if (step === 2 || step === 6) {
      const c = ch[0];
      if (c.sweepTimer > 0) c.sweepTimer--;
      if (c.sweepTimer === 0) {
        c.sweepTimer = c.sweepTime || 8;
        if (c.sweepOn && c.sweepTime) {
          const nf = this.sweepCalc();
          if (nf > 2047) c.on = false;
          else if (c.sweepShift) {
            c.shadow = nf; c.freq = nf;
            if (this.sweepCalc() > 2047) c.on = false;
          }
        }
      }
    }
    if (step === 7) {
      for (const i of [0, 1, 3]) {
        const c = ch[i];
        if (c.envPeriod === 0) continue;
        if (--c.envTimer <= 0) {
          c.envTimer = c.envPeriod;
          if (c.envDir && c.vol < 15) c.vol++;
          else if (!c.envDir && c.vol > 0) c.vol--;
        }
      }
    }
  }

  // ---------- sample generation ----------

  sample(now) {
    while (now >= this.next) {
      this.next += CYCLES_PER_SAMPLE;
      if (++this.seqCounter >= 64) { this.seqCounter = 0; this.clockSequencer(); }
      this.mix();
    }
  }

  mix() {
    let L = 0, R = 0;
    if (this.enabled) {
      const io = this.io16, ch = this.ch;
      const cntl = io[0x80 >>> 1], cnth = io[0x82 >>> 1];
      const psg = [0, 0, 0, 0];
      // square channels
      for (let i = 0; i < 2; i++) {
        const c = ch[i];
        if (!c.on) continue;
        const hz = 131072 / (2048 - c.freq);
        c.phase += hz / SAMPLE_RATE;
        c.phase -= Math.floor(c.phase);
        const duty = (io[(i === 0 ? 0x62 : 0x68) >>> 1] >>> 6) & 3;
        psg[i] = (DUTY[duty][(c.phase * 8) | 0] ? 1 : -1) * c.vol / 15;
      }
      // wave channel
      {
        const c = ch[2];
        if (c.on) {
          const r70 = io[0x70 >>> 1], r72 = io[0x72 >>> 1];
          const len = (r70 & 0x20) ? 64 : 32;
          c.phase += (2097152 / (2048 - c.freq)) / SAMPLE_RATE;
          if (c.phase >= len) c.phase %= len;
          let pos = c.phase | 0;
          const bankStart = (r70 & 0x40) ? 16 : 0;
          const byte = this.wave[(bankStart + (pos >>> 1)) & 31];
          const nib = (pos & 1) ? byte & 15 : byte >>> 4;
          let vol;
          if (r72 & 0x8000) vol = 0.75;
          else vol = [0, 1, 0.5, 0.25][(r72 >>> 13) & 3];
          psg[2] = ((nib - 7.5) / 7.5) * vol;
        }
      }
      // noise channel
      {
        const c = ch[3];
        if (c.on) {
          const r7c = io[0x7C >>> 1];
          const rr = r7c & 7, s = (r7c >>> 4) & 15;
          const hz = 524288 / (rr === 0 ? 0.5 : rr) / Math.pow(2, s + 1);
          c.acc += hz / SAMPLE_RATE;
          let steps = c.acc | 0;
          c.acc -= steps;
          if (steps > 64) steps = 64;
          const w7 = r7c & 8;
          for (let k = 0; k < steps; k++) {
            const bit = (c.lfsr ^ (c.lfsr >>> 1)) & 1;
            c.lfsr = (c.lfsr >>> 1) | (bit << 14);
            if (w7) c.lfsr = (c.lfsr & ~0x40) | (bit << 6);
          }
          psg[3] = ((c.lfsr & 1) ? -1 : 1) * c.vol / 15;
        }
      }
      const psgScale = [0.25, 0.5, 1, 1][cnth & 3] * (120 / 512);
      const lv = (((cntl >>> 4) & 7) + 1) / 8, rv = ((cntl & 7) + 1) / 8;
      let pl = 0, pr = 0;
      for (let i = 0; i < 4; i++) {
        if (cntl & (0x1000 << i)) pl += psg[i];
        if (cntl & (0x100 << i)) pr += psg[i];
      }
      L = pl * lv * psgScale; R = pr * rv * psgScale;
      const a = this.fifoSample[0] / 128 * ((cnth & 4) ? 1 : 0.5);
      const b = this.fifoSample[1] / 128 * ((cnth & 8) ? 1 : 0.5);
      if (cnth & 0x0200) L += a;
      if (cnth & 0x0100) R += a;
      if (cnth & 0x2000) L += b;
      if (cnth & 0x1000) R += b;
      L *= 0.5; R *= 0.5;
    }
    const w = this.writePos;
    this.ring[w * 2] = L;
    this.ring[w * 2 + 1] = R;
    this.writePos = (w + 1) % RING_SIZE;
    if (this.writePos === this.readPos) this.readPos = (this.readPos + 1) % RING_SIZE;
  }

  available() {
    return (this.writePos - this.readPos + RING_SIZE) % RING_SIZE;
  }

  getState() {
    return {
      next: this.next, wave: this.wave.slice(), fifo0: this.fifo[0].slice(), fifo1: this.fifo[1].slice(),
      fifoR: this.fifoR.slice(), fifoW: this.fifoW.slice(), fifoCount: this.fifoCount.slice(), fifoSample: this.fifoSample.slice(),
      seqStep: this.seqStep, seqCounter: this.seqCounter, enabled: this.enabled,
      ch: this.ch.map(c => Object.assign({}, c)),
    };
  }

  setState(s) {
    this.next = s.next; this.wave.set(s.wave); this.fifo[0].set(s.fifo0); this.fifo[1].set(s.fifo1);
    this.fifoR = s.fifoR.slice(); this.fifoW = s.fifoW.slice(); this.fifoCount = s.fifoCount.slice(); this.fifoSample = s.fifoSample.slice();
    this.seqStep = s.seqStep; this.seqCounter = s.seqCounter; this.enabled = s.enabled;
    for (let i = 0; i < 4; i++) Object.assign(this.ch[i], s.ch[i]);
  }
}
