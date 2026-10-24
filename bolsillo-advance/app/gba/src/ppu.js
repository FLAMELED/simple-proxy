// Scanline renderer: tile modes 0-2, bitmap modes 3-5, sprites, windows, blending, mosaic

const TRANSPARENT = 0x8000;
const HDRAW_CYCLES = 1006, HBLANK_CYCLES = 226;

const OBJ_SIZES = [
  [[8, 8], [16, 16], [32, 32], [64, 64]],
  [[16, 8], [32, 8], [32, 16], [64, 32]],
  [[8, 16], [8, 32], [16, 32], [32, 64]],
];

const LCD_DESAT = 0.2, LCD_GAIN = 0.85;
function srgbToLinear(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function linearToSrgb(v) { return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }

class PPU {
  constructor(gba) {
    this.gba = gba;
    const bus = gba.bus;
    this.bus = bus;
    this.io16 = bus.io16;
    this.vram = bus.vram;
    this.vram16 = bus.vram16;
    this.pal16 = bus.pal16;
    this.oam16 = bus.oam16;
    this.frame = new Uint32Array(240 * 160);
    this.bgLine = [new Uint16Array(240), new Uint16Array(240), new Uint16Array(240), new Uint16Array(240)];
    this.objColor = new Uint16Array(240);
    this.objPrio = new Uint8Array(240);
    this.objSemi = new Uint8Array(240);
    this.objWin = new Uint8Array(240);
    this.refX = new Int32Array(4);
    this.refY = new Int32Array(4);
    this.lut = new Uint32Array(32768);
    this.skipRender = false;
    this.setColorCorrection(false);
    this.reset();
  }

  reset() {
    this.vcount = 0;
    this.dispstat = 0;
    this.hblank = false;
    this.next = HDRAW_CYCLES;
    this.frameDone = false;
    this.refX.fill(0); this.refY.fill(0);
    this.frame.fill(0xFF000000);
  }

  // false: raw colours; true: a softer "LCD look" (less saturated, slightly darker).
  // Not a model of the real GBA panel: it uses only the public sRGB transfer function
  // (IEC 61966-2-1) and the BT.709 luma weights; LCD_DESAT and LCD_GAIN were picked by eye
  // for this project. Provenance: bolsillo-advance/audit/COLOR-REEMPLAZO.md
  setColorCorrection(on) {
    this.colorCorrection = !!on;
    for (let c = 0; c < 32768; c++) {
      const r = c & 31, g = (c >> 5) & 31, b = (c >> 10) & 31;
      let r8, g8, b8;
      if (on) {
        const lr = srgbToLinear(r / 31), lg = srgbToLinear(g / 31), lb = srgbToLinear(b / 31);
        const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
        r8 = Math.round(linearToSrgb((lr + (y - lr) * LCD_DESAT) * LCD_GAIN) * 255);
        g8 = Math.round(linearToSrgb((lg + (y - lg) * LCD_DESAT) * LCD_GAIN) * 255);
        b8 = Math.round(linearToSrgb((lb + (y - lb) * LCD_DESAT) * LCD_GAIN) * 255);
      } else {
        r8 = (r << 3) | (r >> 2); g8 = (g << 3) | (g >> 2); b8 = (b << 3) | (b >> 2);
      }
      this.lut[c] = (0xFF000000 | (b8 << 16) | (g8 << 8) | r8) >>> 0;
    }
  }

  latchRefX(bg) {
    const io = this.io16, o = bg === 2 ? 0x28 : 0x38;
    this.refX[bg] = ((io[o >>> 1] | (io[(o + 2) >>> 1] << 16)) << 4) >> 4;
  }

  latchRefY(bg) {
    const io = this.io16, o = bg === 2 ? 0x2C : 0x3C;
    this.refY[bg] = ((io[o >>> 1] | (io[(o + 2) >>> 1] << 16)) << 4) >> 4;
  }

  checkVcount() {
    const lyc = this.dispstat >>> 8;
    if (this.vcount === lyc) {
      if (!(this.dispstat & 4)) {
        this.dispstat |= 4;
        if (this.dispstat & 0x20) this.bus.raiseIrq(IRQ_VCOUNT);
      }
    } else {
      this.dispstat &= ~4;
    }
  }

  event(now) {
    const g = this.gba;
    if (!this.hblank) {
      // start of HBlank
      this.hblank = true;
      this.dispstat |= 2;
      if (this.vcount < 160) {
        if (this.skipRender) this.advanceRefs();
        else this.renderLine(this.vcount);
      }
      if (this.dispstat & 0x10) this.bus.raiseIrq(IRQ_HBLANK);
      if (this.vcount < 160) g.dma.trigger(2);
      this.next += HBLANK_CYCLES;
    } else {
      this.hblank = false;
      this.dispstat &= ~2;
      this.vcount++;
      if (this.vcount === 228) this.vcount = 0;
      if (this.vcount === 160) {
        this.dispstat |= 1;
        if (this.dispstat & 0x08) this.bus.raiseIrq(IRQ_VBLANK);
        g.dma.trigger(1);
        this.latchRefX(2); this.latchRefY(2); this.latchRefX(3); this.latchRefY(3);
        this.frameDone = true;
      } else if (this.vcount === 227) {
        this.dispstat &= ~1;
      }
      this.checkVcount();
      this.next += HDRAW_CYCLES;
    }
  }

  // ============ rendering ============

  renderLine(y) {
    const io = this.io16;
    const dispcnt = io[0];
    const frame = this.frame;
    const lineOff = y * 240;
    if (dispcnt & 0x80) {
      for (let x = 0; x < 240; x++) frame[lineOff + x] = 0xFFFFFFFF;
      return;
    }
    const mode = dispcnt & 7;
    const mosaic = io[0x4C >>> 1];
    let bgMask = 0;
    switch (mode) {
      case 0:
        for (let bg = 0; bg < 4; bg++) if (dispcnt & (0x100 << bg)) { this.renderTextBg(bg, y, mosaic); bgMask |= 1 << bg; }
        break;
      case 1:
        for (let bg = 0; bg < 2; bg++) if (dispcnt & (0x100 << bg)) { this.renderTextBg(bg, y, mosaic); bgMask |= 1 << bg; }
        if (dispcnt & 0x400) { this.renderAffineBg(2, mosaic); bgMask |= 4; }
        break;
      case 2:
        if (dispcnt & 0x400) { this.renderAffineBg(2, mosaic); bgMask |= 4; }
        if (dispcnt & 0x800) { this.renderAffineBg(3, mosaic); bgMask |= 8; }
        break;
      case 3: case 4: case 5:
        if (dispcnt & 0x400) { this.renderBitmap(mode, dispcnt, mosaic); bgMask |= 4; }
        break;
    }
    this.advanceRefs();

    const objOn = (dispcnt & 0x1000) !== 0;
    if (objOn) this.renderObjs(y, dispcnt, mosaic);
    this.composite(y, dispcnt, bgMask, objOn);
  }

  // advance affine reference points by one line
  advanceRefs() {
    const io = this.io16;
    for (let bg = 2; bg < 4; bg++) {
      const o = bg === 2 ? 0x20 : 0x30;
      this.refX[bg] = (this.refX[bg] + ((io[(o + 2) >>> 1] << 16) >> 16)) | 0;
      this.refY[bg] = (this.refY[bg] + ((io[(o + 6) >>> 1] << 16) >> 16)) | 0;
    }
  }

  renderTextBg(bg, y, mosaic) {
    const io = this.io16, vram = this.vram, pal = this.pal16;
    const cnt = io[(0x08 >>> 1) + bg];
    const hofs = io[(0x10 >>> 1) + bg * 2] & 0x1FF;
    const vofs = io[(0x12 >>> 1) + bg * 2] & 0x1FF;
    const charBase = ((cnt >>> 2) & 3) * 0x4000;
    const screenBase = ((cnt >>> 8) & 0x1F) * 0x800;
    const color256 = cnt & 0x80;
    const size = (cnt >>> 14) & 3;
    const wMask = (size & 1) ? 511 : 255;
    const hMask = (size & 2) ? 511 : 255;
    const out = this.bgLine[bg];
    let yy = y;
    const mos = cnt & 0x40;
    if (mos) { const mv = ((mosaic >>> 4) & 15) + 1; yy = y - (y % mv); }
    const sy = (yy + vofs) & hMask;
    const tileRow = (sy >>> 3) & 31;
    const inY = sy & 7;
    let sbRowOff = 0;
    if (sy >= 256) sbRowOff = (size === 3) ? 2 : 1;
    let x = 0;
    let sx = hofs & wMask;
    while (x < 240) {
      let sb = sbRowOff;
      if (sx >= 256) sb += 1;
      const mapAddr = screenBase + sb * 0x800 + (tileRow * 32 + ((sx >>> 3) & 31)) * 2;
      const entry = mapAddr < 0x10000 ? (vram[mapAddr] | (vram[mapAddr + 1] << 8)) : 0;
      const tile = entry & 0x3FF;
      const hflip = entry & 0x400;
      const py = (entry & 0x800) ? 7 - inY : inY;
      let px = sx & 7;
      if (color256) {
        const tbase = charBase + tile * 64 + py * 8;
        for (; px < 8 && x < 240; px++, x++) {
          const addr = tbase + (hflip ? 7 - px : px);
          const idx = addr < 0x10000 ? vram[addr] : 0;
          out[x] = idx ? (pal[idx] & 0x7FFF) : TRANSPARENT;
        }
      } else {
        const tbase = charBase + tile * 32 + py * 4;
        const pbank = (entry >>> 12) << 4;
        for (; px < 8 && x < 240; px++, x++) {
          const tx = hflip ? 7 - px : px;
          const addr = tbase + (tx >>> 1);
          const b = addr < 0x10000 ? vram[addr] : 0;
          const idx = (tx & 1) ? b >>> 4 : b & 15;
          out[x] = idx ? (pal[pbank + idx] & 0x7FFF) : TRANSPARENT;
        }
      }
      sx = (sx + 8 - (sx & 7)) & wMask;
    }
    if (mos) this.mosaicH(out, (mosaic & 15) + 1);
  }

  mosaicH(out, mh) {
    if (mh <= 1) return;
    for (let x = 0; x < 240; x++) {
      const m = x % mh;
      if (m) out[x] = out[x - m];
    }
  }

  renderAffineBg(bg, mosaic) {
    const io = this.io16, vram = this.vram, pal = this.pal16;
    const cnt = io[(0x08 >>> 1) + bg];
    const o = bg === 2 ? 0x20 : 0x30;
    const pa = (io[o >>> 1] << 16) >> 16;
    const pc = (io[(o + 4) >>> 1] << 16) >> 16;
    const charBase = ((cnt >>> 2) & 3) * 0x4000;
    const screenBase = ((cnt >>> 8) & 0x1F) * 0x800;
    const size = 128 << ((cnt >>> 14) & 3);
    const tilesPerRow = size >>> 3;
    const wrap = cnt & 0x2000;
    const out = this.bgLine[bg];
    let tx = this.refX[bg], ty = this.refY[bg];
    const mask = size - 1;
    for (let x = 0; x < 240; x++, tx += pa, ty += pc) {
      let ix = tx >> 8, iy = ty >> 8;
      if (wrap) { ix &= mask; iy &= mask; }
      else if (ix < 0 || iy < 0 || ix >= size || iy >= size) { out[x] = TRANSPARENT; continue; }
      const tile = vram[screenBase + (iy >>> 3) * tilesPerRow + (ix >>> 3)];
      const idx = vram[charBase + tile * 64 + (iy & 7) * 8 + (ix & 7)];
      out[x] = idx ? (pal[idx] & 0x7FFF) : TRANSPARENT;
    }
    if (cnt & 0x40) this.mosaicH(out, (mosaic & 15) + 1);
  }

  renderBitmap(mode, dispcnt, mosaic) {
    const io = this.io16, vram = this.vram, vram16 = this.vram16, pal = this.pal16;
    const pa = (io[0x20 >>> 1] << 16) >> 16;
    const pc = (io[0x24 >>> 1] << 16) >> 16;
    const out = this.bgLine[2];
    let tx = this.refX[2], ty = this.refY[2];
    const page = (dispcnt & 0x10) ? 0xA000 : 0;
    for (let x = 0; x < 240; x++, tx += pa, ty += pc) {
      const ix = tx >> 8, iy = ty >> 8;
      if (mode === 3) {
        if (ix < 0 || iy < 0 || ix >= 240 || iy >= 160) { out[x] = TRANSPARENT; continue; }
        out[x] = vram16[iy * 240 + ix] & 0x7FFF;
      } else if (mode === 4) {
        if (ix < 0 || iy < 0 || ix >= 240 || iy >= 160) { out[x] = TRANSPARENT; continue; }
        const idx = vram[page + iy * 240 + ix];
        out[x] = idx ? (pal[idx] & 0x7FFF) : TRANSPARENT;
      } else {
        if (ix < 0 || iy < 0 || ix >= 160 || iy >= 128) { out[x] = TRANSPARENT; continue; }
        out[x] = vram16[(page >>> 1) + iy * 160 + ix] & 0x7FFF;
      }
    }
    if (io[0x0C >>> 1] & 0x40) this.mosaicH(out, (mosaic & 15) + 1);
  }

  renderObjs(y, dispcnt, mosaic) {
    const oam = this.oam16, vram = this.vram, pal = this.pal16;
    const objColor = this.objColor, objPrio = this.objPrio, objSemi = this.objSemi, objWin = this.objWin;
    objPrio.fill(4); objWin.fill(0); objSemi.fill(0);
    const map1D = dispcnt & 0x40;
    const bitmap = (dispcnt & 7) >= 3;
    const mosH = ((mosaic >>> 8) & 15) + 1, mosV = ((mosaic >>> 12) & 15) + 1;
    for (let i = 0; i < 128; i++) {
      const a0 = oam[i * 4], a1 = oam[i * 4 + 1], a2 = oam[i * 4 + 2];
      const affine = a0 & 0x100;
      if (!affine && (a0 & 0x200)) continue;
      const mode = (a0 >>> 10) & 3;
      if (mode === 3) continue;
      const shape = a0 >>> 14;
      if (shape === 3) continue;
      const sz = OBJ_SIZES[shape][a1 >>> 14];
      const w = sz[0], h = sz[1];
      let bw = w, bh = h;
      if (affine && (a0 & 0x200)) { bw *= 2; bh *= 2; }
      const oy = a0 & 0xFF;
      let ox = a1 & 0x1FF;
      if (ox & 0x100) ox -= 512;
      let dy = (y - oy) & 0xFF;
      if (dy >= bh) continue;
      const mos = a0 & 0x1000;
      if (mos) dy -= dy % mosV;
      const tile = a2 & 0x3FF;
      if (bitmap && tile < 512) continue;
      const prio = (a2 >>> 10) & 3;
      const color256 = a0 & 0x2000;
      const palBase = color256 ? 256 : 256 + ((a2 >>> 12) << 4);
      const tilesW = w >>> 3;
      const rowStride = map1D ? (color256 ? tilesW * 2 : tilesW) : 32;

      let pa = 256, pb = 0, pc = 0, pd = 256;
      if (affine) {
        const g = ((a1 >>> 9) & 0x1F) * 16;
        pa = (oam[g + 3] << 16) >> 16; pb = (oam[g + 7] << 16) >> 16;
        pc = (oam[g + 11] << 16) >> 16; pd = (oam[g + 15] << 16) >> 16;
      }
      const hflip = !affine && (a1 & 0x1000);
      const vflip = !affine && (a1 & 0x2000);
      const halfBW = bw >> 1, halfBH = bh >> 1, halfW = w >> 1, halfH = h >> 1;
      const iy = dy - halfBH;

      for (let sx = 0; sx < bw; sx++) {
        const x = ox + sx;
        if (x < 0) continue;
        if (x >= 240) break;
        let tx, ty;
        if (affine) {
          const ix = sx - halfBW;
          tx = ((pa * ix + pb * iy) >> 8) + halfW;
          ty = ((pc * ix + pd * iy) >> 8) + halfH;
          if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
        } else {
          tx = hflip ? w - 1 - sx : sx;
          ty = vflip ? h - 1 - dy : dy;
        }
        if (mos) tx -= tx % mosH;
        let idx;
        if (color256) {
          const tn = tile + (ty >>> 3) * rowStride + (tx >>> 3) * 2;
          idx = vram[0x10000 + ((tn & 0x3FF) << 5) + ((ty & 7) << 3) + (tx & 7)];
        } else {
          const tn = tile + (ty >>> 3) * rowStride + (tx >>> 3);
          const b = vram[0x10000 + ((tn & 0x3FF) << 5) + ((ty & 7) << 2) + ((tx & 7) >>> 1)];
          idx = (tx & 1) ? b >>> 4 : b & 15;
        }
        if (!idx) continue;
        if (mode === 2) { objWin[x] = 1; continue; }
        if (prio < objPrio[x]) {
          objColor[x] = pal[palBase + idx] & 0x7FFF;
          objPrio[x] = prio;
          objSemi[x] = mode === 1 ? 1 : 0;
        }
      }
    }
  }

  composite(y, dispcnt, bgMask, objOn) {
    const io = this.io16, pal = this.pal16, lut = this.lut, frame = this.frame;
    const bgLine = this.bgLine;
    const objColor = this.objColor, objPrio = this.objPrio, objSemi = this.objSemi, objWin = this.objWin;
    const backdrop = pal[0] & 0x7FFF;
    const bldcnt = io[0x50 >>> 1];
    const effect = (bldcnt >>> 6) & 3;
    const t1 = bldcnt & 0x3F, t2 = (bldcnt >>> 8) & 0x3F;
    const alpha = io[0x52 >>> 1];
    const eva = Math.min(16, alpha & 0x1F), evb = Math.min(16, (alpha >>> 8) & 0x1F);
    const evy = Math.min(16, io[0x54 >>> 1] & 0x1F);

    // BG order sorted by priority then index
    const order = [];
    const prio = [0, 0, 0, 0];
    for (let p = 0; p < 4; p++) {
      for (let bg = 0; bg < 4; bg++) {
        if (!(bgMask & (1 << bg))) continue;
        const bp = io[(0x08 >>> 1) + bg] & 3;
        if (bp === p) { order.push(bg); prio[bg] = bp; }
      }
    }
    const nbg = order.length;

    const winOn = dispcnt & 0xE000;
    const winin = io[0x48 >>> 1], winout = io[0x4A >>> 1];
    let w0 = false, w1 = false, w0l = 0, w0r = 0, w1l = 0, w1r = 0;
    if (dispcnt & 0x2000) {
      const v = io[0x44 >>> 1]; let top = v >>> 8, bot = v & 0xFF;
      w0 = top <= bot ? (y >= top && y < bot) : (y >= top || y < bot);
      const hh = io[0x40 >>> 1]; w0l = hh >>> 8; w0r = hh & 0xFF;
      if (w0r > 240 && w0l <= w0r) w0r = 240;
    }
    if (dispcnt & 0x4000) {
      const v = io[0x46 >>> 1]; let top = v >>> 8, bot = v & 0xFF;
      w1 = top <= bot ? (y >= top && y < bot) : (y >= top || y < bot);
      const hh = io[0x42 >>> 1]; w1l = hh >>> 8; w1r = hh & 0xFF;
      if (w1r > 240 && w1l <= w1r) w1r = 240;
    }
    const objWinOn = (dispcnt & 0x8000) && objOn;
    const lineOff = y * 240;

    for (let x = 0; x < 240; x++) {
      let flags = 0x3F;
      if (winOn) {
        if (w0 && (w0l <= w0r ? (x >= w0l && x < w0r) : (x >= w0l || x < w0r))) flags = winin & 0x3F;
        else if (w1 && (w1l <= w1r ? (x >= w1l && x < w1r) : (x >= w1l || x < w1r))) flags = (winin >>> 8) & 0x3F;
        else if (objWinOn && objWin[x]) flags = (winout >>> 8) & 0x3F;
        else flags = winout & 0x3F;
      }
      let c1 = backdrop, l1 = 5, c2 = backdrop, l2 = 5, found = 0;
      const op = (objOn && (flags & 0x10)) ? objPrio[x] : 4;
      let objPending = op < 4;
      for (let k = 0; k < nbg && found < 2; k++) {
        const bg = order[k];
        if (objPending && op <= prio[bg]) {
          objPending = false;
          if (found === 0) { c1 = objColor[x]; l1 = 4; } else { c2 = objColor[x]; l2 = 4; }
          found++;
          if (found === 2) break;
        }
        if (flags & (1 << bg)) {
          const c = bgLine[bg][x];
          if (!(c & TRANSPARENT)) {
            if (found === 0) { c1 = c; l1 = bg; } else { c2 = c; l2 = bg; }
            found++;
          }
        }
      }
      if (objPending && found < 2) {
        if (found === 0) { c1 = objColor[x]; l1 = 4; } else { c2 = objColor[x]; l2 = 4; }
      }

      let out = c1;
      // Semi-transparent OBJs always alpha-blend, even where the window disables special effects
      if (l1 === 4 && objSemi[x] && (t2 & (1 << l2))) {
        out = blendAlpha(c1, c2, eva, evb);
      } else if (flags & 0x20) {
        if (t1 & (1 << l1)) {
          if (effect === 1) { if (t2 & (1 << l2)) out = blendAlpha(c1, c2, eva, evb); }
          else if (effect === 2) out = brighten(c1, evy);
          else if (effect === 3) out = darken(c1, evy);
        }
      }
      frame[lineOff + x] = lut[out & 0x7FFF];
    }
  }

  getState() {
    return {
      vcount: this.vcount, dispstat: this.dispstat, hblank: this.hblank, next: this.next,
      refX: Array.from(this.refX), refY: Array.from(this.refY),
    };
  }

  setState(s) {
    this.vcount = s.vcount; this.dispstat = s.dispstat; this.hblank = s.hblank; this.next = s.next;
    this.refX.set(s.refX); this.refY.set(s.refY);
  }
}

function blendAlpha(a, b, eva, evb) {
  let r = ((a & 31) * eva + (b & 31) * evb) >> 4;
  let g = (((a >> 5) & 31) * eva + ((b >> 5) & 31) * evb) >> 4;
  let bl = (((a >> 10) & 31) * eva + ((b >> 10) & 31) * evb) >> 4;
  if (r > 31) r = 31; if (g > 31) g = 31; if (bl > 31) bl = 31;
  return r | (g << 5) | (bl << 10);
}

function brighten(a, evy) {
  let r = a & 31, g = (a >> 5) & 31, b = (a >> 10) & 31;
  r += ((31 - r) * evy) >> 4; g += ((31 - g) * evy) >> 4; b += ((31 - b) * evy) >> 4;
  return r | (g << 5) | (b << 10);
}

function darken(a, evy) {
  let r = a & 31, g = (a >> 5) & 31, b = (a >> 10) & 31;
  r -= (r * evy) >> 4; g -= (g * evy) >> 4; b -= (b * evy) >> 4;
  return r | (g << 5) | (b << 10);
}
