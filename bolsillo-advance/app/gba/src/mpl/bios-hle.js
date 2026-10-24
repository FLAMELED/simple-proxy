/* Bolsillo Advance: BIOS routines Div, ArcTan, ArcTan2, ObjAffineSet and the IRQ handler.
 *
 * Covered File under the Mozilla Public License 2.0. Parts of it may be adapted from
 * mGBA, src/gba/bios.c and src/gba/hle-bios.s (tag 0.10.5), Copyright (c) 2013-2021 Jeffrey Pfau.
 * Modified for Bolsillo Advance. See bolsillo-advance/audit/COVERED-FILES.md.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const BIOS_IRQ_HANDLER = [
  0xE92D500F, // 0x18 stmfd sp!, {r0-r3, r12, lr}
  0xE3A00301, // 0x1C mov r0, #0x04000000
  0xE28FE000, // 0x20 add lr, pc, #0
  0xE510F004, // 0x24 ldr pc, [r0, #-4]
  0xE8BD500F, // 0x28 ldmfd sp!, {r0-r3, r12, lr}
  0xE25EF004, // 0x2C subs pc, lr, #4
];

// mixed into BIOS.prototype by bios.js
const MPL_BIOS_HLE = {
  // the BIOS IRQ handler at 0x18 and the opcode the bus shows after an IRQ returns
  installIrqHandler(b) {
    for (let i = 0; i < BIOS_IRQ_HANDLER.length; i++) b[6 + i] = BIOS_IRQ_HANDLER[i] | 0;
    b[0x34 >>> 2] = 0xE55EC002 | 0; // value seen on the bus after returning from an IRQ
  },

  arcTanSwi() {
    const r = this.gba.cpu.r;
    r[0] = this.arctan(r[0]); r[3] = this.atanB;
  },

  div(num, den) {
    const r = this.gba.cpu.r;
    if (den === 0) {
      r[0] = num < 0 ? -1 : 1; r[1] = num; r[3] = 1;
      return;
    }
    const q = (num / den) | 0;
    r[0] = q; r[1] = (num - Math.imul(q, den)) | 0; r[3] = Math.abs(q) | 0;
  },

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
  },

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
  },

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
};
