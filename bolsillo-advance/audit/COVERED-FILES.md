# Archivos cubiertos por la MPL-2.0 y delimitación del resto

**Fecha:** 2026-10-24. **Decisión aplicada:** opción A de `PROPUESTA-MGBA.md`, es decir, cumplir la MPL-2.0.
**No es asesoramiento legal.** Los puntos ⚖ deben revisarse con un abogado.

## 1. Covered Files (MPL-2.0)

| Archivo | Contenido | Referencia mGBA (MPL-2.0, © 2013-2021 Jeffrey Pfau, tag 0.10.5) | sha256 al escribir este documento |
|---|---|---|---|
| `app/gba/src/mpl/gpio-rtc.js` | Clase `GpioRtc`: puerto GPIO del cartucho (`read`, `write`, `outputPins`), RTC Seiko S-3511 (`RTC_BYTES`, `rtcReadPins`, `rtcProcessByte`, `rtcOutput`, `rtcUpdateClock`), estado inicial, y `getState`/`setState` del puerto | `src/gba/cart/gpio.c` | `006ce2e6144d84efce9519e817b10d5b85d2e0aeb8a861e73508219bd9e602b7` |
| `app/gba/src/mpl/bios-hle.js` | Objeto `MPL_BIOS_HLE`: `BIOS_IRQ_HANDLER` e `installIrqHandler` (con `0xE55EC002` en 0x34), `arcTanSwi`, `div`, `arctan`, `arctan2`, `objAffineSet` | `src/gba/bios.c`, `src/gba/hle-bios.s` | `713108f7d4059646b910ef207f19b6a620b23ad9b2ffc00ea9aaa590b2bd91ac` |

**Criterio de inclusión:** entra todo lo que la auditoría (`AUDITORIA-PROCEDENCIA.md` §3.1, filas 1–6) clasificó como **posible adaptación** de mGBA. Se incluye también código propio que estaba unido a esas partes, para no partir funciones:
- `rtcUpdateClock`;
- el puerto GPIO completo;
- `getState`/`setState` del puerto.

Ese código pasa a estar bajo MPL-2.0 al estar en un Covered File. Está permitido, y es la opción conservadora.

**Cabecera:** cada archivo lleva el aviso del Exhibit A y la atribución "Parts of it may be adapted from mGBA… Modified for Bolsillo Advance".

**Forma en que se distribuyen:** como archivos separados y sin minificar:
- en el APK/AAB: `assets/www/mpl/gpio-rtc.js` y `assets/www/mpl/bios-hle.js`;
- en la web: `mpl/*.js`, junto a la página.

Los carga `<script src>`. **No** se concatenan en `index.html`. Esto lo comprueban el CI (`check_bundle.py`) y `ui-notices.js`: los archivos del paquete son idénticos byte a byte a los del repositorio, y `index.html` no contiene su código.

## 2. El resto: "Larger Work" (MPL-2.0 §3.3)

Todos los demás archivos de la app están fuera de los Covered Files:
- `cpu.js`, `bus.js`, `ppu.js`, `apu.js`, `bios.js`, `cart.js` y `gba.js`;
- la UI (`ui.js` y `template.html`);
- `MainActivity.java`;
- los recursos y scripts.

La MPL-2.0 permite distribuirlos con otra licencia, también propietaria, siempre que se cumplan las obligaciones de los Covered Files (§3.3). **Mover las funciones no demuestra por sí solo que el resto esté libre de obligaciones.** Lo que sostiene esta delimitación es lo siguiente, con sus límites:

### 2.1 Puntos de contacto entre el resto y los Covered Files

Son la lista completa, obtenida con `grep` sobre `app/gba/src` y `ui`:

| Archivo | Línea | Uso | Naturaleza |
|---|---|---|---|
| `cart.js` | 140 | `this.gpio = new GpioRtc()` | Crea el objeto |
| `cart.js` | 143 | `resetGpio() { this.gpio.reset(); }` | Delega |
| `cart.js` | 178–180 | `gpioReadable`, `gpioRead`, `gpioWrite` delegan en `this.gpio` | Delegan (los usa `bus.js` en los accesos a 0x080000C4–C9) |
| `cart.js` | 202, 211 | `getState`/`setState` delegan el estado del puerto | Delegan |
| `bios.js` | 13 | `this.installIrqHandler(b)` | Llamada |
| `bios.js` | 27–28 | SWI 0x06 `div(r0, r1)` y 0x07 `div(r1, r0)` | Despacho de SWI. El orden invertido de DivArm lo fija la especificación de la BIOS. |
| `bios.js` | 30, 31, 36 | SWI 0x09 `arcTanSwi()`, 0x0A `arctan2`, 0x0F `objAffineSet` | Despacho de SWI |
| `bios.js` | 286 | `Object.assign(BIOS.prototype, MPL_BIOS_HLE)` | Añade los métodos |

Son llamadas a una interfaz, no copias de su implementación.

### 2.2 Similitud que queda fuera de `mpl/`

Se repitió la búsqueda de k-gramas de la auditoría (`tools/simscan.py`, K = 12) sobre los archivos que no están en `mpl/`, frente a mGBA 0.10.5 y master:
- **Han desaparecido** las coincidencias que la auditoría atribuía a las funciones movidas. Por ejemplo, `bios.c:330–356` (ArcTan/ArcTan2) y `gpio.c:31–33` (`RTC_BYTES`) ya no aparecen en `bios.js` ni en `cart.js`.
- **Quedan** coincidencias cortas, de 1 a 12 líneas, del tipo que la auditoría ya calificó de estructurales o de fórmula:
  - asignaciones encadenadas (`bios.js` L13–17 frente a `gpio.c:295`, una forma genérica `a; b; if (…) {`);
  - la fórmula del origen afín `ox − (a·cx + b·cy)` en BgAffineSet, una fórmula del hardware que la auditoría clasificó como implementación independiente documentada;
  - expresiones del formato LZ77/Huffman, clasificadas como derivadas del formato;
  - fragmentos del intérprete ARM, que son una técnica común.

  Ver `results-actual/` (se regenera con `run-audit.py`).

### 2.3 Valores que se dejan fuera a propósito ⚖

| Valor | Dónde | Por qué no está en un Covered File |
|---|---|---|
| `biosLast = 0xE129F000` (arranque), `0xE3A02004` (tras SWI) | `bus.js` L38/63, `bios.js` L19 | Son el opcode que muestra el bus abierto de la BIOS real en esas situaciones: un dato del hardware. Se comprueban con los tests MIT de jsmolka (`bios.asm`). También aparecen en mGBA, pero son constantes impuestas por el hardware, no una forma de implementarlo. **⚖ Si un abogado lo considera expresión de mGBA, hay que moverlos a `mpl/`.** Es un cambio pequeño. |

### 2.4 Lo que esta delimitación **no** demuestra

- Que el resto del motor sea independiente frente a **otros** emuladores no comparados (VBA-M, NanoBoyAdvance, gpSP, etc.). Ver `AUDITORIA-PROCEDENCIA.md` §1.3.
- Que la clasificación de los Covered Files como derivados sea correcta. Es provisional. Si mGBA no fuera el origen, la MPL se habría aplicado de más, lo que no causa ningún perjuicio.
- ⚖ Que la división por archivos sea suficiente si un tribunal considera la app entera una obra derivada única. La MPL está pensada para que no sea así (§3.3), pero la interpretación depende de la jurisdicción.

## 3. Obligaciones de la MPL-2.0 y cómo se cumplen

| Obligación (MPL-2.0) | Cómo se cumple | Dónde se comprueba |
|---|---|---|
| §3.2(a): poner a disposición la forma de código fuente de los Covered Files e informar de cómo obtenerla | Los archivos van sin minificar dentro del APK/AAB y en la web. Los avisos dan la URL exacta `https://github.com/FLAMELED/simple-proxy/tree/<commit>/bolsillo-advance`, con el commit de la compilación. | `check_bundle.py`: URL presente, commit = HEAD compilado, sin "cambios locales" en las compilaciones publicables |
| §3.2(b): la forma ejecutable puede tener otra licencia si no limita los derechos sobre el código fuente | Pendiente de tu decisión sobre la licencia del resto. Los avisos no restringen los Covered Files. | — |
| §3.4: no quitar ni alterar los avisos de los Covered Files | Cabecera del Exhibit A en cada archivo, y atribución a Jeffrey Pfau | Revisión del código; `check_bundle.py` compara los archivos byte a byte |
| §3.1/§3.2: informar de la MPL a los destinatarios | Texto completo en `assets/www/licenses/MPL-2.0.txt` y en el menú "Licencias y avisos" | `check_bundle.py`, `ui-notices.js` y la prueba en el emulador |
| Modificaciones bajo MPL | Las modificaciones de esos archivos siguen en ellos y bajo MPL. Las versiones futuras deben mantener la separación. | CI en cada push |

**Disponibilidad de la URL:** la URL apunta a un commit de la rama `ccr-71143cd8-pz8ihv` de un repositorio **público**. Si la rama se borra sin fusionarla, el commit podría dejar de estar accesible. Para cada versión publicada conviene una **etiqueta** (`git tag v1.1 <commit>`) o un repositorio propio del producto. Es una decisión tuya y está pendiente.
