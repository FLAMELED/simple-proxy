# Propuesta para los componentes posiblemente derivados de mGBA

**Estado (actualizado el 2026-10-24, segunda ronda):** se ha elegido y **aplicado la opción A (cumplir la MPL-2.0)**. La delimitación vigente y cómo se cumple cada obligación están en **`COVERED-FILES.md`**. Este documento queda como la propuesta original.

Cambios respecto a lo propuesto:
- **Nombre del archivo del RTC:** es `mpl/gpio-rtc.js` y no `mpl/rtc.js`. Incluye el puerto GPIO completo, porque `outputPins` y la máscara de lectura también estaban señaladas.
- **Fuentes duplicadas:** los archivos se sirven aparte (`assets/www/mpl/`), así que desaparecen las copias de `assets/source/cart.js` y `bios.js`.
- **Avisos:** dan la URL del código con el commit exacto.

**No es asesoramiento legal.** Los puntos marcados ⚖ requieren un abogado.

## 1. Componentes y archivos afectados

Todos están en la versión actual, sin cambios respecto a la auditada:

| # | Componente | Archivo | Líneas actuales | Referencia mGBA (MPL-2.0, © Jeffrey Pfau) |
|---|---|---|---|---|
| 1 | Tabla de bytes por comando del RTC | `app/gba/src/cart.js` | L134 `RTC_BYTES` | `src/gba/cart/gpio.c` (0.10.5) |
| 1 | Estado inicial del RTC | `cart.js` | L146–150 `resetGpio` | `gpio.c` `GBAHardwareInitRTC` |
| 1 | Protocolo serie del RTC | `cart.js` | L205–207 `outputPins`, L209–244 `rtcReadPins`, L246–266 `rtcProcessByte`, L268–276 `rtcOutput` | `gpio.c` L126–271 |
| 2 | ArcTan | `app/gba/src/bios.js` | L121–133 `arctan` | `src/gba/bios.c` L309–335 |
| 3 | ArcTan2 | `bios.js` | L135–156 `arctan2` | `bios.c` L337–372 |
| 4 | ObjAffineSet | `bios.js` | L204–217 `objAffineSet` | `bios.c` L234–264. Hay un equivalente BSD-2-Clause en GBA.js `js/irq.js`. |
| 5 | Div (división por cero) | `bios.js` | L111–119 `div` | `bios.c` L277–307 |
| 6 | Manejador IRQ y su colocación | `bios.js` | L3–10 `BIOS_IRQ_HANDLER`, L22 | `src/gba/hle-bios.s` L116–124 |

No están afectados `cpu.js`, `bus.js`, `ppu.js`, `apu.js`, `gba.js`, la UI ni `MainActivity.java`. En ellos no se encontraron coincidencias sustanciales frente a los cinco proyectos comparados.

## 2. Separar los archivos

Esto es lo que se propone hacer; todavía no está hecho.

MPL-2.0 aplica **por archivo**. Hoy, las partes posiblemente derivadas están mezcladas con código propio dentro de `cart.js` y `bios.js`. Además, `build.js` concatena todo en un único `index.html` (⚖ §4.1 de la auditoría). La propuesta:

1. **`app/gba/src/mpl/rtc.js`**: mover `RTC_BYTES`, `resetGpio` (la parte del RTC), `outputPins`, `rtcReadPins`, `rtcProcessByte` y `rtcOutput` como funciones o *mixin* sobre `Cart`. En `cart.js` quedan Flash, SRAM, EEPROM, la detección de tipo y la persistencia.
2. **`app/gba/src/mpl/bios-hle.js`**: mover `BIOS_IRQ_HANDLER`, `arctan`, `arctan2`, `div` y `objAffineSet`. En `bios.js` quedan el resto de SWI (CpuSet, BgAffineSet, LZ77, Huffman, RLE, Diff, BitUnPack, MidiKey2Freq, Sqrt, etc.).
3. **Cabecera de cada archivo de `mpl/`:**
   ```
   /* Portions adapted from mGBA, Copyright (c) 2013-2021 Jeffrey Pfau.
    * Modifications Copyright (c) 2026 <titular de Bolsillo Advance>.
    *
    * This Source Code Form is subject to the terms of the Mozilla Public
    * License, v. 2.0. If a copy of the MPL was not distributed with this
    * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
   ```
   El año y el titular de las modificaciones los decides tú (⚖ autoría de IA, §4.4).
4. **Que no se fundan en un solo archivo:**
   - `build.js` debería emitir `assets/www/mpl/rtc.js` y `assets/www/mpl/bios-hle.js` como `<script src>` separados, en lugar de concatenarlos en `index.html`;
   - `MainActivity.java` ya sirve cualquier archivo bajo `assets/www/`. Solo habría que añadir el tipo MIME `application/javascript` para `.js` (hoy responde `application/octet-stream`).
   - En la versión web (el artefacto), los archivos separados se publicarían con `files`.

   ⚖ Con esto, los "Covered Files" quedarían delimitados. Sin esto, **un abogado debe decir si el `index.html` concatenado entero cuenta como Covered Software**.
5. **Pruebas:** `test/verify.js --ref <versión anterior>` debe dar 0 diferencias en RTC, BIOS y fotogramas. Es la misma comprobación que ya se usa en esta ronda.

## 3. Avisos

| Dónde | Qué | Estado |
|---|---|---|
| `notices/THIRD-PARTY-NOTICES.txt` | Atribución a mGBA (MPL-2.0) y GBA.js (BSD-2-Clause), lista de funciones afectadas, Exhibit A, dónde está el código fuente, tipografías y marcas | **Aplicado** |
| `notices/licenses/MPL-2.0.txt` | Texto completo de la MPL-2.0, copiado del `LICENSE` de mGBA 0.10.5 | **Aplicado** |
| `notices/licenses/BSD-2-Clause-GBA.js.txt` | Texto de `COPYING` de GBA.js: aviso, condiciones y descargo | **Aplicado** (la cláusula 2 exige reproducirlo con la distribución binaria) |
| App: menú, sección "Licencias y avisos" | Los tres textos anteriores, legibles en la app (web y APK) | **Aplicado** |
| APK: `assets/THIRD-PARTY-NOTICES.txt` y `assets/licenses/*` | Copia exacta de los anteriores | **Aplicado**, comprobado con `check_apk.py` |
| Cabecera Exhibit A dentro de los archivos | Ver 2.3 | Pendiente (va con la separación) |
| Ficha de la tienda / web del producto | Enlace a los avisos y al código fuente | Pendiente |

## 4. Entrega del código fuente ("Source Code Form", MPL-2.0 §3.2)

MPL-2.0 §3.2 exige que, quien distribuya en forma ejecutable, ponga a disposición el código fuente de los archivos cubiertos e informe de cómo obtenerlo, por un medio razonable y sin coste mayor que el de la distribución.

**Aplicado:**
- El APK lleva `assets/source/cart.js` y `assets/source/bios.js`, byte a byte iguales a los de `app/gba/src/` (`check_apk.py` lo comprueba).
- La página `assets/www/index.html` contiene el JavaScript **sin minificar**: `check_apk.py` verifica que estén los nombres de función originales. La forma ejecutable ya es legible.
- Los avisos indican que el código está dentro de la app y en la carpeta `bolsillo-advance/app/gba/src/` del repositorio del proyecto.

**Pendiente (decisión tuya):**
- **Dónde se publica el código fuente de forma estable.** Hoy es este repositorio (`FLAMELED/simple-proxy`, **público**). Para el producto quizá prefieras un repositorio propio. Lo que exige MPL es como mínimo el código de los archivos cubiertos (`cart.js` y `bios.js`, o `mpl/*.js` tras la separación). ⚖ Según §4.1 de la auditoría, quizá también el `index.html` completo.
- Si separas los archivos (punto 2), cambia `notice_assets()` en `apk/build.py` para incluir `mpl/*.js` en lugar de `cart.js` y `bios.js` enteros.

**No hace falta** publicar `MainActivity.java`, la UI ni el resto del motor por la MPL. Sí haría falta si eligieras una licencia copyleft para todo el producto.

## 5. Licencias que **no** se asignan

- No se asigna ninguna licencia global a Bolsillo Advance. El `LICENSE` MIT de la raíz de este repositorio pertenece a `simple-proxy` (© movie-web) y **no se aplica** a `bolsillo-advance/`. Lo dice `bolsillo-advance/README.md`.
- La MPL-2.0 se cita **solo** para las partes de la tabla 1, y como clasificación provisional ("pueden contener código adaptado").
- GBA.js se atribuye bajo su licencia exacta (BSD-2-Clause, texto de su `COPYING`), no como "MIT o similar".

## 6. Alternativas a mantener el código MPL

| Opción | Qué implica | Coste |
|---|---|---|
| **A. Cumplir MPL** (puntos 2–4) | Archivos separados, avisos, código fuente publicado. El resto de la app puede tener la licencia que elijas, porque la MPL es compatible con combinarse con código cerrado. | Bajo. Hay que mantenerlo en cada versión. |
| **B. Pedir permiso** a Jeffrey Pfau (titular de mGBA y GBA.js) para usar esas funciones bajo BSD-2-Clause o con permiso expreso | Mensaje con la lista de la tabla 1 y los enlaces al anexo A | Bajo. Depende de su respuesta. |
| **C. Reescribir en sala limpia** | Otra persona que no haya visto mGBA ni este código escribe RTC/ArcTan/ArcTan2/Div/ObjAffineSet desde GBATEK y la hoja de datos de la S-3511. Se valida con `verify.js` (RTC, BIOS PL, BIOSARCTAN/BIOSDIV/BIOSOBJAFFINESET). | Medio: unas 150 líneas. La sala limpia exige documentar quién vio qué. |
| **D. Mixta** | ObjAffineSet atribuido a GBA.js (BSD) + C para el resto | Medio |

⚖ El stub IRQ (fila 6) puede tratarse como funcional o *de minimis*. Necesita dictamen. Con la opción A queda cubierto en cualquier caso.
