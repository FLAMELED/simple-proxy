# Anexo A — Comparaciones lado a lado

Fragmentos citados solo para el análisis de procedencia. Las rutas `snapshot/…` son la versión auditada (ver `snapshot-SHA256SUMS.txt`). Las rutas `refs/…` son los proyectos de referencia en los commits de `refs.lock`.

**Licencias de los fragmentos de terceros que se reproducen aquí:**
- Los fragmentos de mGBA (`refs/mgba-*`) son © Jeffrey Pfau, bajo MPL-2.0: "This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/." El texto completo está en `../notices/licenses/MPL-2.0.txt`.
- Los fragmentos `snapshot/…` de RTC y BIOS son la versión auditada de Bolsillo Advance. Siguen igual en la versión actual (ver `ESTADO-VERSIONES.md`).

**Retirado de la copia del repositorio:** la sección "Corrección de color" del anexo original. Reproducía código de higan (GPLv3 o posterior) y la versión anterior de nuestra función. Esta versión anterior es una posible adaptación sin licencia aclarada, y por eso no se republica aquí. Los datos que se comparaban están en la sección final. Para regenerar la comparación completa en local: `./fetch.sh refs.lock refs` y luego `python3 -I run-audit.py <copia>/src`, sobre una copia de la versión auditada.

## RTC: lectura de pines

**Nuestro:** `snapshot/src/cart.js` líneas 209–244

```js
 209    rtcReadPins() {
 210      const rtc = this.rtc, p = this.pinState;
 211      switch (rtc.transferStep) {
 212        case 0:
 213          if ((p & 5) === 1) rtc.transferStep = 1;
 214          break;
 215        case 1:
 216          if ((p & 5) === 5) rtc.transferStep = 2;
 217          else if ((p & 5) !== 1) rtc.transferStep = 0;
 218          break;
 219        case 2:
 220          if (!(p & 1)) {
 221            rtc.bits &= ~(1 << rtc.bitsRead);
 222            rtc.bits |= ((p & 2) >>> 1) << rtc.bitsRead;
 223          } else if (p & 4) {
 224            const reading = rtc.command & 0x80;
 225            if (!reading) {
 226              rtc.bitsRead++;
 227              if (rtc.bitsRead === 8) this.rtcProcessByte();
 228            } else {
 229              this.outputPins(5 | (this.rtcOutput() << 1));
 230              rtc.bitsRead++;
 231              if (rtc.bitsRead === 8) {
 232                rtc.bytesRemaining--;
 233                if (rtc.bytesRemaining <= 0) { rtc.commandActive = false; rtc.command = 0; }
 234                rtc.bitsRead = 0;
 235              }
 236            }
 237          } else {
 238            rtc.bitsRead = 0; rtc.bytesRemaining = 0; rtc.commandActive = false; rtc.command = 0;
 239            rtc.transferStep = p & 1;
 240            this.outputPins(1);
 241          }
 242          break;
 243      }
 244    }
```

**Referencia:** `refs/mgba-0.10.5/src/gba/cart/gpio.c` líneas 138–197

```c
 138  void _rtcReadPins(struct GBACartridgeHardware* hw) {
 139  	// Transfer sequence:
 140  	// P: 0 | 1 |  2 | 3
 141  	// == Initiate
 142  	// > HI | - | LO | -
 143  	// > HI | - | HI | -
 144  	// == Transfer bit (x8)
 145  	// > LO | x | HI | -
 146  	// > HI | - | HI | -
 147  	// < ?? | x | ?? | -
 148  	// == Terminate
 149  	// >  - | - | LO | -
 150  	switch (hw->rtc.transferStep) {
 151  	case 0:
 152  		if ((hw->pinState & 5) == 1) {
 153  			hw->rtc.transferStep = 1;
 154  		}
 155  		break;
 156  	case 1:
 157  		if ((hw->pinState & 5) == 5) {
 158  			hw->rtc.transferStep = 2;
 159  		} else if ((hw->pinState & 5) != 1) {
 160  			hw->rtc.transferStep = 0;
 161  		}
 162  		break;
 163  	case 2:
 164  		if (!(hw->pinState & 1)) {
 165  			hw->rtc.bits &= ~(1 << hw->rtc.bitsRead);
 166  			hw->rtc.bits |= ((hw->pinState & 2) >> 1) << hw->rtc.bitsRead;
 167  		} else {
 168  			if (hw->pinState & 4) {
 169  				if (!RTCCommandDataIsReading(hw->rtc.command)) {
 170  					++hw->rtc.bitsRead;
 171  					if (hw->rtc.bitsRead == 8) {
 172  						_rtcProcessByte(hw);
 173  					}
 174  				} else {
 175  					_outputPins(hw, 5 | (_rtcOutput(hw) << 1));
 176  					++hw->rtc.bitsRead;
 177  					if (hw->rtc.bitsRead == 8) {
 178  						--hw->rtc.bytesRemaining;
 179  						if (hw->rtc.bytesRemaining <= 0) {
 180  							hw->rtc.commandActive = 0;
 181  							hw->rtc.command = 0;
 182  						}
 183  						hw->rtc.bitsRead = 0;
 184  					}
 185  				}
 186  			} else {
 187  				hw->rtc.bitsRead = 0;
 188  				hw->rtc.bytesRemaining = 0;
 189  				hw->rtc.commandActive = 0;
 190  				hw->rtc.command = 0;
 191  				hw->rtc.transferStep = hw->pinState & 1;
 192  				_outputPins(hw, 1);
 193  			}
 194  		}
 195  		break;
 196  	}
 197  }
```

## RTC: procesado de byte y tabla

**Nuestro:** `snapshot/src/cart.js` líneas 246–266

```js
 246    rtcProcessByte() {
 247      const rtc = this.rtc;
 248      rtc.bytesRemaining--;
 249      if (!rtc.commandActive) {
 250        const command = rtc.bits;
 251        if ((command & 0xF) === 0x6) {
 252          rtc.command = command;
 253          const cmd = (command >>> 4) & 7;
 254          rtc.bytesRemaining = RTC_BYTES[cmd];
 255          rtc.commandActive = rtc.bytesRemaining > 0;
 256          if (cmd === 0) rtc.control = 0;
 257          else if (cmd === 2 || cmd === 6) this.rtcUpdateClock();
 258        }
 259      } else {
 260        const cmd = (rtc.command >>> 4) & 7;
 261        if (cmd === 4) rtc.control = rtc.bits;
 262      }
 263      rtc.bits = 0;
 264      rtc.bitsRead = 0;
 265      if (!rtc.bytesRemaining) { rtc.commandActive = false; rtc.command = 0; }
 266    }
```

**Referencia:** `refs/mgba-0.10.5/src/gba/cart/gpio.c` líneas 199–246

```c
 199  void _rtcProcessByte(struct GBACartridgeHardware* hw) {
 200  	--hw->rtc.bytesRemaining;
 201  	if (!hw->rtc.commandActive) {
 202  		RTCCommandData command;
 203  		command = hw->rtc.bits;
 204  		if (RTCCommandDataGetMagic(command) == 0x06) {
 205  			hw->rtc.command = command;
 206  
 207  			hw->rtc.bytesRemaining = RTC_BYTES[RTCCommandDataGetCommand(command)];
 208  			hw->rtc.commandActive = hw->rtc.bytesRemaining > 0;
 209  			mLOG(GBA_HW, DEBUG, "Got RTC command %x", RTCCommandDataGetCommand(command));
 210  			switch (RTCCommandDataGetCommand(command)) {
 211  			case RTC_RESET:
 212  				hw->rtc.control = 0;
 213  				break;
 214  			case RTC_DATETIME:
 215  			case RTC_TIME:
 216  				_rtcUpdateClock(hw);
 217  				break;
 218  			case RTC_FORCE_IRQ:
 219  			case RTC_CONTROL:
 220  				break;
 221  			}
 222  		} else {
 223  			mLOG(GBA_HW, WARN, "Invalid RTC command byte: %02X", hw->rtc.bits);
 224  		}
 225  	} else {
 226  		switch (RTCCommandDataGetCommand(hw->rtc.command)) {
 227  		case RTC_CONTROL:
 228  			hw->rtc.control = hw->rtc.bits;
 229  			break;
 230  		case RTC_FORCE_IRQ:
 231  			mLOG(GBA_HW, STUB, "Unimplemented RTC command %u", RTCCommandDataGetCommand(hw->rtc.command));
 232  			break;
 233  		case RTC_RESET:
 234  		case RTC_DATETIME:
 235  		case RTC_TIME:
 236  			break;
 237  		}
 238  	}
 239  
 240  	hw->rtc.bits = 0;
 241  	hw->rtc.bitsRead = 0;
 242  	if (!hw->rtc.bytesRemaining) {
 243  		hw->rtc.commandActive = 0;
 244  		hw->rtc.command = 0;
 245  	}
 246  }
```

## RTC: salida

**Nuestro:** `snapshot/src/cart.js` líneas 268–276

```js
 268    rtcOutput() {
 269      const rtc = this.rtc;
 270      if (!rtc.commandActive) return 0;
 271      let out = 0;
 272      const cmd = (rtc.command >>> 4) & 7;
 273      if (cmd === 4) out = rtc.control;
 274      else if (cmd === 2 || cmd === 6) out = rtc.time[7 - rtc.bytesRemaining];
 275      return (out >>> rtc.bitsRead) & 1;
 276    }
```

**Referencia:** `refs/mgba-0.10.5/src/gba/cart/gpio.c` líneas 248–271

```c
 248  unsigned _rtcOutput(struct GBACartridgeHardware* hw) {
 249  	uint8_t outputByte = 0;
 250  	if (!hw->rtc.commandActive) {
 251  		mLOG(GBA_HW, GAME_ERROR, "Attempting to use RTC without an active command");
 252  		return 0;
 253  	}
 254  	switch (RTCCommandDataGetCommand(hw->rtc.command)) {
 255  	case RTC_CONTROL:
 256  		outputByte = hw->rtc.control;
 257  		break;
 258  	case RTC_DATETIME:
 259  	case RTC_TIME:
 260  		outputByte = hw->rtc.time[7 - hw->rtc.bytesRemaining];
 261  		break;
 262  	case RTC_FORCE_IRQ:
 263  	case RTC_RESET:
 264  		break;
 265  	}
 266  	unsigned output = (outputByte >> hw->rtc.bitsRead) & 1;
 267  	if (hw->rtc.bitsRead == 0) {
 268  		mLOG(GBA_HW, DEBUG, "RTC output byte %02X", outputByte);
 269  	}
 270  	return output;
 271  }
```

## BIOS ArcTan2

**Nuestro:** `snapshot/src/bios.js` líneas 135–156

```js
 135    arctan2(x, y) {
 136      const at = v => this.arctan(v);
 137      const q = (n, d) => (n / d) | 0;
 138      let res;
 139      if (!y) res = x >= 0 ? 0 : 0x8000;
 140      else if (!x) res = y >= 0 ? 0x4000 : 0xC000;
 141      else if (y >= 0) {
 142        if (x >= 0) {
 143          if (x >= y) res = at(q(y << 14, x));
 144          else res = 0x4000 - at(q(x << 14, y));
 145        } else if (-x >= y) res = at(q(y << 14, x)) + 0x8000;
 146        else res = 0x4000 - at(q(x << 14, y));
 147      } else {
 148        if (x <= 0) {
 149          if (-x > -y) res = at(q(y << 14, x)) + 0x8000;
 150          else res = 0xC000 - at(q(x << 14, y));
 151        } else if (x >= -y) res = at(q(y << 14, x)) + 0x10000;
 152        else res = 0xC000 - at(q(x << 14, y));
 153      }
 154      this.gba.cpu.r[3] = 0x170;
 155      return res & 0xFFFF;
 156    }
```

**Referencia:** `refs/mgba-0.10.5/src/gba/bios.c` líneas 337–372

```c
 337  static int16_t _ArcTan2(int32_t x, int32_t y, int32_t* r1, uint32_t* cycles) {
 338  	if (!y) {
 339  		*cycles = 11;
 340  		if (x >= 0) {
 341  			return 0;
 342  		}
 343  		return 0x8000;
 344  	}
 345  	if (!x) {
 346  		*cycles = 11;
 347  		if (y >= 0) {
 348  			return 0x4000;
 349  		}
 350  		return 0xC000;
 351  	}
 352  	if (y >= 0) {
 353  		if (x >= 0) {
 354  			if (x >= y) {
 355  				return _ArcTan((y << 14) / x, r1, NULL, cycles);
 356  			}
 357  		} else if (-x >= y) {
 358  			return _ArcTan((y << 14) / x, r1, NULL, cycles) + 0x8000;
 359  		}
 360  		return 0x4000 - _ArcTan((x << 14) / y, r1, NULL, cycles);
 361  	} else {
 362  		if (x <= 0) {
 363  			if (-x > -y) {
 364  				return _ArcTan((y << 14) / x, r1, NULL, cycles) + 0x8000;
 365  			}
 366  		} else if (x >= -y) {
 367  			return _ArcTan((y << 14) / x, r1, NULL, cycles) + 0x10000;
 368  		}
 369  		return 0xC000 - _ArcTan((x << 14) / y, r1, NULL, cycles);
 370  	}
 371  }
 372  
```

## BIOS ObjAffineSet

**Nuestro:** `snapshot/src/bios.js` líneas 204–217

```js
 204    objAffineSet(src, dst, count, diff) {
 205      const bus = this.gba.bus;
 206      for (let i = 0; i < count; i++) {
 207        const sx = ((bus.read16(src) << 16) >> 16) / 256, sy = ((bus.read16(src + 2) << 16) >> 16) / 256;
 208        const theta = (bus.read16(src + 4) >>> 8) / 128 * Math.PI;
 209        src += 8;
 210        const cos = Math.cos(theta), sin = Math.sin(theta);
 211        bus.write16(dst, (cos * sx * 256) & 0xFFFF);
 212        bus.write16(dst + diff, (-sin * sx * 256) & 0xFFFF);
 213        bus.write16(dst + diff * 2, (sin * sy * 256) & 0xFFFF);
 214        bus.write16(dst + diff * 3, (cos * sy * 256) & 0xFFFF);
 215        dst += diff * 4;
 216      }
 217    }
```

**Referencia:** `refs/mgba-0.10.5/src/gba/bios.c` líneas 234–264

```c
 234  static void _ObjAffineSet(struct GBA* gba) {
 235  	struct ARMCore* cpu = gba->cpu;
 236  	int i = cpu->gprs[2];
 237  	float sx, sy;
 238  	float theta;
 239  	int offset = cpu->gprs[0];
 240  	int destination = cpu->gprs[1];
 241  	int diff = cpu->gprs[3];
 242  	float a, b, c, d;
 243  	while (i--) {
 244  		// [ sx   0 ]   [ cos(theta)  -sin(theta) ]   [ A B ]
 245  		// [  0  sy ] * [ sin(theta)   cos(theta) ] = [ C D ]
 246  		sx = (int16_t) cpu->memory.load16(cpu, offset, 0) / 256.f;
 247  		sy = (int16_t) cpu->memory.load16(cpu, offset + 2, 0) / 256.f;
 248  		theta = (cpu->memory.load16(cpu, offset + 4, 0) >> 8) / 128.f * M_PI;
 249  		offset += 8;
 250  		// Rotation
 251  		a = d = cosf(theta);
 252  		b = c = sinf(theta);
 253  		// Scale
 254  		a *= sx;
 255  		b *= -sx;
 256  		c *= sy;
 257  		d *= sy;
 258  		cpu->memory.store16(cpu, destination, a * 256, 0);
 259  		cpu->memory.store16(cpu, destination + diff, b * 256, 0);
 260  		cpu->memory.store16(cpu, destination + diff * 2, c * 256, 0);
 261  		cpu->memory.store16(cpu, destination + diff * 3, d * 256, 0);
 262  		destination += diff * 4;
 263  	}
 264  }
```

## BIOS Div (división por cero)

**Nuestro:** `snapshot/src/bios.js` líneas 111–119

```js
 111    div(num, den) {
 112      const r = this.gba.cpu.r;
 113      if (den === 0) {
 114        r[0] = num < 0 ? -1 : 1; r[1] = num; r[3] = 1;
 115        return;
 116      }
 117      const q = (num / den) | 0;
 118      r[0] = q; r[1] = (num - Math.imul(q, den)) | 0; r[3] = Math.abs(q) | 0;
 119    }
```

**Referencia:** `refs/mgba-0.10.5/src/gba/bios.c` líneas 277–307

```c
 277  static void _Div(struct GBA* gba, int32_t num, int32_t denom) {
 278  	struct ARMCore* cpu = gba->cpu;
 279  	if (denom == 0) {
 280  		if (num == 0 || num == -1 || num == 1) {
 281  			mLOG(GBA_BIOS, GAME_ERROR, "Attempting to divide %i by zero!", num);
 282  		} else {
 283  			mLOG(GBA_BIOS, FATAL, "Attempting to divide %i by zero!", num);
 284  		}
 285  		// If abs(num) > 1, this should hang, but that would be painful to
 286  		// emulate in HLE, and no game will get into a state under normal
 287  		// operation where it hangs...
 288  		cpu->gprs[0] = (num < 0) ? -1 : 1;
 289  		cpu->gprs[1] = num;
 290  		cpu->gprs[3] = 1;
 291  	} else if (denom == -1 && num == INT32_MIN) {
 292  		mLOG(GBA_BIOS, GAME_ERROR, "Attempting to divide INT_MIN by -1!");
 293  		cpu->gprs[0] = INT32_MIN;
 294  		cpu->gprs[1] = 0;
 295  		cpu->gprs[3] = INT32_MIN;
 296  	} else {
 297  		div_t result = div(num, denom);
 298  		cpu->gprs[0] = result.quot;
 299  		cpu->gprs[1] = result.rem;
 300  		cpu->gprs[3] = abs(result.quot);
 301  	}
 302  	int loops = clz32(denom) - clz32(num);
 303  	if (loops < 1) {
 304  		loops = 1;
 305  	}
 306  	gba->biosStall = 4 /* prologue */ + 13 * loops + 7 /* epilogue */;
 307  }
```

## Manejador IRQ de la BIOS HLE

**Nuestro:** `snapshot/src/bios.js` líneas 3–23

```js
   3  const BIOS_IRQ_HANDLER = [
   4    0xE92D500F, // 0x18 stmfd sp!, {r0-r3, r12, lr}
   5    0xE3A00301, // 0x1C mov r0, #0x04000000
   6    0xE28FE000, // 0x20 add lr, pc, #0
   7    0xE510F004, // 0x24 ldr pc, [r0, #-4]
   8    0xE8BD500F, // 0x28 ldmfd sp!, {r0-r3, r12, lr}
   9    0xE25EF004, // 0x2C subs pc, lr, #4
  10  ];
  11  
  12  const SINE_TABLE = new Int16Array(256);
  13  for (let i = 0; i < 256; i++) SINE_TABLE[i] = Math.round(Math.sin(i * Math.PI / 128) * 0x4000);
  14  
  15  class BIOS {
  16    constructor(gba) {
  17      this.gba = gba;
  18      const b = gba.bus.bios32;
  19      b[0] = 0xEA000000 | 0; // reset vector (unused)
  20      b[2] = 0xE1B0F00E | 0; // swi vector: movs pc, lr (unused, swi is HLE)
  21      for (let i = 0; i < BIOS_IRQ_HANDLER.length; i++) b[6 + i] = BIOS_IRQ_HANDLER[i] | 0;
  22      b[0x34 >>> 2] = 0xE55EC002 | 0; // value seen on the bus after returning from an IRQ
  23    }
```

**Referencia:** `refs/mgba-0.10.5/src/gba/hle-bios.s` líneas 116–124

```c
 116  irqBase:
 117  stmfd  sp!, {r0-r3, r12, lr}
 118  mov    r0, #0x04000000
 119  add    lr, pc, #0
 120  ldr    pc, [r0, #-4]
 121  ldmfd  sp!, {r0-r3, r12, lr}
 122  subs   pc, lr, #4
 123  .word 0
 124  .word 0xE55EC002
```

## Corrección de color (solo referencias)

- **Nuestro (versión auditada, retirada):** `ppu.js` `setColorCorrection`, líneas 46–63, sha256 del archivo `0bec4525…`.
- **Referencia:** higan `higan/gba/ppu/color.cpp`, líneas 1–21, commit `8f4df010715298455b92cfc0821ea833770a8b5a` (cambio `1539f10`).
- **Parámetros que coincidían:**
  - gamma de entrada 4,0 y de salida 2,2;
  - matriz (fila por canal de salida, columnas r, g, b): R = 255r + 50g + 0b, G = 10r + 230g + 30b, B = 50r + 10g + 220b;
  - término `0 * lb`;
  - escalado 255/280.
- **Métrica:** ratio 0,44, racha de 20 tokens (`pairsim-results.txt`).
- **Sustitución:** `COLOR-REEMPLAZO.md`.
