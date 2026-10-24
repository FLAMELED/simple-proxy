/* Bolsillo Advance: cartridge GPIO port and Seiko S-3511 real-time clock.
 *
 * Covered File under the Mozilla Public License 2.0. Parts of it may be adapted from
 * mGBA, src/gba/cart/gpio.c (tag 0.10.5), Copyright (c) 2013-2021 Jeffrey Pfau.
 * Modified for Bolsillo Advance. See bolsillo-advance/audit/COVERED-FILES.md.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const RTC_BYTES = [0, 0, 7, 0, 1, 0, 3, 0];

class GpioRtc {
  constructor() { this.reset(); }

  reset() {
    this.gpioReadable = false;
    this.pinState = 0; this.direction = 0;
    this.rtc = { transferStep: 0, bits: 0, bitsRead: 0, command: 0, commandActive: false, bytesRemaining: 0, control: 0x40, time: new Uint8Array(7) };
  }

  read(off) {
    switch (off) {
      case 0xC4: return this.pinState & ~this.direction & 0xF | (this.pinState & this.direction & 0xF);
      case 0xC6: return this.direction;
      case 0xC8: return this.gpioReadable ? 1 : 0;
    }
    return 0;
  }

  write(off, val) {
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

  // same shape as the save states written before this code moved here
  getState() {
    return { pinState: this.pinState, direction: this.direction, gpioReadable: this.gpioReadable,
      rtc: Object.assign({}, this.rtc, { time: this.rtc.time.slice() }) };
  }

  setState(s) {
    this.pinState = s.pinState; this.direction = s.direction; this.gpioReadable = s.gpioReadable;
    Object.assign(this.rtc, s.rtc);
  }
}
