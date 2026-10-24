# Auditoría de procedencia y licencias — Bolsillo Advance

> **Copia en el repositorio (2026-10-24).** Es el informe entregado ese día. Solo cambia esto respecto al original:
> - (a) esta nota;
> - (b) una fe de erratas en §2.3: la matriz de color se había escrito con los canales r y b intercambiados;
> - (c) las rutas del entorno de trabajo pasan a rutas de esta carpeta.
>
> El razonamiento y las conclusiones no cambian. La versión actual de la app y qué conclusiones siguen vigentes están en `ESTADO-VERSIONES.md`. La transcripción de la conversación citada en §1.1 **no se incluye**: es privada. Por eso las afirmaciones marcadas [H] no se pueden comprobar desde este repositorio.


**Fecha:** 2026-10-24
**Alcance:** revisión y documentación únicamente. No se modificó el motor, la app, el APK ni el artefacto publicado. **No se asigna ninguna licencia global.**
**Naturaleza:** informe técnico, no dictamen jurídico. Los puntos marcados **⚖ Interpretación legal** requieren a un abogado especialista en propiedad intelectual y licencias de software libre.

---

## 0. Versión exacta analizada

La revisión se hizo sobre una **copia congelada de solo lectura**:
la carpeta `snapshot/` del expediente original (no publicada en el repositorio; ver `ESTADO-VERSIONES.md`) (`chmod a-w`).
La lista de hashes está en `audit/snapshot-SHA256SUMS.txt`. Todos los archivos tienen fecha de modificación 2026-10-16. Al hacer la revisión no había en disco reparaciones posteriores.

| Archivo | SHA-256 |
|---|---|
| `gba/src/apu.js` | `db59caef43eb50fc1cb357241049075587fc18b558af57135e83061aa0be3fe1` |
| `gba/src/bios.js` | `5e73d2e2652f12b13b99c4ef91d5866eb19ba809e490e4cf8c27ab4d4c639a47` |
| `gba/src/bus.js` | `183ae537eb419355c02e7d1f2a556ce118f14e556927eb0494d796b9d165ba73` |
| `gba/src/cart.js` | `af3f1605248c4acc96c14447321964b268d20592d209f893e389e03bdaf03349` |
| `gba/src/cpu.js` | `c131ad2b741fce2b862ed34aef368dfa6c1602dea2e834051e3853ea78683e1e` |
| `gba/src/gba.js` | `39c4cfef3ac22e7c45cf517a6a6a1cfc49bce210d0a86c37f4ad44ecea4803c5` |
| `gba/src/ppu.js` | `0bec452571cf65a618956599756f1d8b50b219f7490b16d559ec7772d8a235db` |
| `gba/ui/template.html` | `31e86287d7956ca1502d54264bb03cf2f0a8221346c6471b98484045a235536c` |
| `gba/ui/ui.js` | `b8ee6f9764ff66202b2d53031dcfff2e662abb0c56afaa3244aadd6d5d98c157` |
| `gba/dist/bolsillo-advance.html` | `5227aa53b36e1620342c33b7c41cc329096abf51c56ce34d7539fdfa2db19b0d` |
| `gba/build.js` | `129a8e48defff92604d9c037b60d5524fa62ae431b5bb8af1f5a1793fa021a10` |
| `apk/src/com/bolsillo/advance/MainActivity.java` | `84a18acad6487bae97135e93329b99bbc296b7ca3fff8a8f3d315df4c3f77e68` |
| `apk/build.py` | `28bd92957c395762a1d6c7b152abb9db3137aae8cb34e4accac50fad2b61dc41` |
| `apk/tools/androidbin.py` | `dcae6e43f17fb6f415ad61695809aa7fd80b2667d5c56c8d9cdda7842e09760f` |
| `apk/tools/signer/Sign.java` | `e82253860e4d2af7dfdc6c4ad4dcc863ad0270fc3aa8a1c649be28cf04ed7ca0` |
| `Bolsillo-Advance.apk` (68 888 bytes) | `4d57ba9d5aaaee2abcd3889e6ca4bb88d47048badeb321bc5ed5e221cedeccbc` |

**Comprobaciones de coherencia:**
- `dist/bolsillo-advance.html` es idéntico byte a byte al resultado de reconstruirlo desde `src/` y `ui/`.
- El cuerpo de `assets/www/index.html` dentro del APK es igual a `dist`.
- El artefacto publicado https://claude.ai/artifact/5rDBasLwjDBPY56UCybKmi (versión 11, id `1792186409-5033`) tiene SHA-256 `5be4d75a1543e920ff8d66fe10b04a7e446d208bb41e153236d0f891973d712b`. Solo difiere de `dist` en espacios en blanco.

> **Cómo usar esta auditoría frente a versiones futuras:** si la app cambia después de esta fecha, las conclusiones solo valen para los archivos con estos hashes. Antes de aplicar una recomendación, compara los hashes. Las líneas citadas son las del snapshot. Esta revisión no debe reemplazar ni revertir reparaciones posteriores.

---

## 1. Reconstrucción de la procedencia

Separo cuatro tipos de afirmación:
- **[H] Evidencia del historial:** registros de herramientas de esta conversación.
- **[C] Coincidencias encontradas ahora:** comparación con código de referencia descargado hoy.
- **[I] Inferencia.**
- **[N] No verificable.**

### 1.1 Lo que dice el historial [H]

Fuente: la transcripción de la sesión de trabajo (archivo local privado, **no incluido en el repositorio**).

- **Uso de herramientas:** Bash 118, Write 14, Read 26, Artifact 12, Edit 1, Skill 2. **No hubo ninguna llamada a WebFetch ni a WebSearch.**
- **Únicas descargas de red durante el desarrollo:**
  - `jsmolka/gba-tests` (git clone);
  - tonc (falló, 403);
  - FuzzARM;
  - PeterLemon/GBA;
  - con pip: `pyaxml`, `lxml`, `click`, `protobuf` y `androguard`;
  - desde Maven: `dx 16.0.1`, `apksig 2.3.0` y `android-all 10-robolectric-5803371`.
- **No se descargó ni se leyó** código de mGBA, higan, ares, GBA.js ni GBATEK durante el desarrollo.
- Los módulos del motor se crearon con la herramienta Write el 2026-10-16, de 05:26 a 05:33 UTC: cpu, bus, ppu, apu, bios, cart y gba. Después se parchearon con Bash/python.
- El parche de 2026-10-16T05:41:16Z sobre `bios.js` lleva el comentario literal **`# arctan exact port`** ("port exacto de arctan"). No dice de qué es port. Ver 1.3.
- El código fuente no contiene ninguna atribución, aviso de copyright ni cabecera de licencia.
- El razonamiento interno del modelo **no se guardó**: 131 bloques, 8 no vacíos, de 258 caracteres como máximo. No se puede reconstruir qué "pensaba" el modelo al escribir cada función.
- La única mención registrada de mGBA, higan o GBATEK es mi respuesta del 2026-10-24 a tu pregunta sobre derechos de autor. Es una **autodescripción a posteriori**, no una evidencia contemporánea. No debe usarse como prueba de lo que pasó.

### 1.2 Lo que implica [I]

Como no se consultó ninguna fuente externa, cualquier parecido con código de terceros tiene que venir del **conocimiento previo del modelo** (datos de entrenamiento), no de una copia hecha durante la sesión. Esto **no prueba independencia**: un modelo puede reproducir de memoria estructuras, nombres y constantes de código que vio al entrenarse. Por eso el análisis de la sección 2 compara el resultado y no se fía del proceso.

### 1.3 Lo que no se puede verificar [N]

- **GBATEK** (problemkaputt.de) está bloqueado por el proxy de este entorno (`connect_rejected`). No pude comprobar qué constantes y fórmulas documenta. Hay que repetir esa comprobación desde fuera.
- **El origen de "exact port".** El texto coincide estructuralmente con mGBA `_ArcTan` (ver 2.2), pero el registro no dice qué se estaba portando.
- **Autoría y titularidad del resultado generado por IA:** ver 4.4.
- **Cobertura de la comparación.** Solo comparé con cinco emuladores: mGBA, higan, ares, GBA.js e IodineGBA. No comparé con VBA-M, NanoBoyAdvance, gpSP, SkyEmu, NooDS, Boyo ni otros. Una "ausencia de coincidencias" vale solo frente a esos cinco.

### 1.4 Método de comparación [C]

Las herramientas están en `audit/tools/` y los resultados en `audit/*.txt`.
- **`simscan.py`:** compara entre lenguajes (JS frente a C/C++). Normaliza:
  - todos los identificadores pasan a `I`;
  - los números se pasan a decimal;
  - se eliminan comentarios, cadenas y castings de C;
  - `->` pasa a `.`;
  - las cadenas de acceso a miembros se colapsan.

  Después busca k-gramas compartidos (k = 10, 12, 14).
- **`jsscan.py`:** compara JS con JS (GBA.js, IodineGBA) conservando los identificadores.
- **`pairsim.py`:** compara función contra función con `difflib.SequenceMatcher` sobre los tokens normalizados. Da un *ratio* (0–1) y la racha común más larga. Incluye **líneas base** para calibrar:
  - dos funciones no relacionadas dan **0,34**;
  - dos implementaciones del mismo protocolo de Flash dan **0,26**.
- **Limitaciones:**
  - estas métricas son **orientativas**, no son una prueba pericial;
  - un ratio alto en código corto y muy determinado por el hardware significa poco;
  - un ratio bajo no excluye una adaptación reescrita.

  Los fragmentos lado a lado están en **`ANEXO-A-comparaciones.md`**.

---

## 2. Comparaciones pedidas

Principio aplicado: **compartir una fórmula o un dato de hardware no prueba adaptación**. Tampoco prueban independencia el cambio de lenguaje (C a JS) ni el cambio de nombres. Lo que pesa es la coincidencia en **decisiones de implementación arbitrarias**: estructura, nombres de estado, orden, efectos secundarios no exigidos por el hardware y particularidades de una versión concreta.

### 2.1 RTC frente a mGBA 0.10.5 `src/gba/cart/gpio.c`

- **Referencia:** mGBA, tag `0.10.5`, commit `26b7884bc25a5933960f3cdcd98bac1ae14d42e2` (2025-03-08).
  - Autor: Jeffrey Pfau.
  - Licencia: **MPL-2.0**. La cabecera del archivo solo trae el aviso del Exhibit A y no lleva Exhibit B ("Incompatible With Secondary Licenses"), así que es compatible con licencias secundarias.
- **Nuestro código** (`cart.js`):
  - `RTC_BYTES` L134;
  - `resetGpio` L146–150;
  - `outputPins` L205–207;
  - `rtcReadPins` L209–244;
  - `rtcProcessByte` L246–266;
  - `rtcOutput` L268–276;
  - `rtcUpdateClock` L278–289.

**Coincidencias:**

| Elemento | ¿Dictado por el hardware? |
|---|---|
| Tabla `RTC_BYTES = [0,0,7,0,1,0,3,0]` (bytes de respuesta por comando) | Sí: el formato de la Seiko S-3511. Aun así, codificarla como tabla indexada por comando es una elección. |
| Comprobación del magic `0x06` en los 4 bits altos del comando | Parcialmente (protocolo) |
| **Nombres de los campos de estado:** `transferStep`, `bits`, `bitsRead`, `command`, `commandActive`, `bytesRemaining`, `control`, `time` | **No.** Son nombres arbitrarios y coinciden todos. |
| Máquina de estados de `readPins` en tres pasos (0/1/2) con las mismas condiciones, incluido `else if ((p & 5) !== 1)` en el paso 1 | No. Es la forma concreta de mGBA. |
| Lectura frente a escritura según `command & 0x80` | El bit sí es del protocolo; dónde se comprueba no. |
| `bytesRemaining` se decrementa primero y luego se indexa `time[7 - bytesRemaining]` | **No.** Es una particularidad de implementación. |
| Salida `5 \| (output << 1)` | Parcialmente (asignación de pines) |
| Fin de transferencia con `transferStep = p & 1; outputPins(1)` | **No.** |
| Máscara `pins & ~direction & 0xF` | Parcialmente |
| `control = bits` al escribir el registro de control | Bastante natural |

- **Métricas:**
  - `rtcReadPins` 0,83, `rtcProcessByte` 0,65 y `rtcOutput` 0,55. Línea base: 0,34.
  - Contra **mGBA master** (`fd9dc5c2cbf234365068855851107e762fc6211b`), donde el RTC se reescribió en `c5cddc04` el 2025-04-29, el ratio baja a **0,34**, igual que la línea base. Es decir, nuestro código se parece a **la versión antigua concreta** del diseño de mGBA, que existe desde 0.5.0 (2016) hasta 0.10.5. No se parece a "cualquier RTC".
- **Antecesor con otra licencia:** GBA.js `js/gpio.js`.
  - Autor: Jeffrey Pfau, 2012–2013.
  - Licencia: **BSD-2-Clause**.
  - Commit `0cf0ac7d624eaae032e19ba2f154e0ae1ce73796`.
  - Tiene el diseño ancestral. Ratios 0,82 / 0,63 / 0,58, con una racha de 38 tokens.
  - **Pero** nuestro código incluye detalles que **solo están en mGBA** y no en GBA.js: la condición del paso 1, `commandActive`, la lectura por `command & 0x80`, el cierre `transferStep = p & 1` + `outputPins(1)` y `control = bits`.
- **Diferencias:**
  - añadimos la bandera PM `0x80` en el modo de 12 horas;
  - no hay `vbaBugCompat`;
  - `rtcUpdateClock` usa `Date` de JS.
- **Clasificación provisional:** **posible adaptación de mGBA ≤0.10.5 (MPL-2.0)**, dentro de un linaje que también tiene una versión BSD-2-Clause (GBA.js).

### 2.2 ArcTan, ArcTan2 y ObjAffineSet frente a mGBA master `src/gba/bios.c`

- **Referencia:** mGBA master `fd9dc5c2cbf234365068855851107e762fc6211b`. El último cambio de `bios.c` es `6400039` (2026-02-05). Estas tres funciones son **idénticas en 0.10.5 y en master**. Licencia **MPL-2.0**, Jeffrey Pfau.
- **Nuestro código** (`bios.js`): `arctan` L121–133, `arctan2` L135–156, `objAffineSet` L204–217.

**ArcTan:**
- El polinomio con `>> 14` en cada paso y las constantes `0xA9, 0x390, 0x91C, 0xFB6, 0x16AA, 0x2081, 0x3651, 0xA2F9` es el algoritmo de la BIOS real. Es **dato y fórmula**, probablemente documentado en GBATEK, pero no lo he podido verificar (ver 1.3).
- Coincide con la elección de mGBA de los **efectos secundarios en registros**: `r1 = a` y `r3 = 0x170` (confirmado: mGBA `bios.c` L485 y nuestro L154).
- Ratio 0,61. El historial registra el comentario **"arctan exact port"**.

**ArcTan2:**
- La **misma estructura de ramas por octantes** que mGBA `_ArcTan2`: el orden de las comparaciones `x`/`y`, los mismos desplazamientos `0x4000`, `0x8000` y `0xC000` y las mismas llamadas a `ArcTan(…<<14 / …)`.
- Ratio **0,64**, racha de **20 tokens**. Es la racha más larga del módulo BIOS.
- GBA.js **no** sirve de antecesor BSD: usa `Math.atan2`.

**ObjAffineSet:**
- Usa el mismo enfoque con coma flotante (`cos`/`sin` de `angle/65536·2π`, escalado y redondeo) y el mismo orden de escritura `pa, pb, pc, pd` con el `stride` de destino. Ratio 0,58.
- El ABI (registros y formato de los datos) determina buena parte de la estructura.
- **Equivalente BSD-2-Clause:** GBA.js `js/irq.js` tiene el mismo algoritmo con coma flotante e incluso los mismos comentarios de matriz.

**Clasificación provisional:**
- **ArcTan y ArcTan2:** posible adaptación (MPL-2.0).
- **ObjAffineSet:** posible adaptación, con un equivalente BSD-2-Clause en GBA.js.

### 2.3 Corrección de color frente a higan master `higan/gba/ppu/color.cpp`

- **Referencia:** higan `8f4df010715298455b92cfc0821ea833770a8b5a`. `color.cpp` se cambió por última vez en `1539f10` (byuu, v106.205, 2019-08-29).
  - Licencia: **GPLv3 o posterior**.
  - Aviso: "Copyright © 2004-2020 Near et al".
- **Nuestro código:** `ppu.js` `setColorCorrection` L46–63, con la fórmula en L53–57.

**Coincidencias:**
- gamma de pantalla **4.0** y gamma de salida **2.2**;
- matriz `R = 255·r + 50·g + 0·b`, `G = 10·r + 230·g + 30·b`, `B = 50·r + 10·g + 220·b`, con la misma asignación de canales *(fe de erratas: el original la daba con r y b intercambiados; los coeficientes son los mismos)*;
- un término redundante `0 * lb` que se conserva igual;
- escalado final **255/280**.

Estos números no salen de una especificación pública de Nintendo. Son **parámetros elegidos a mano por el autor de higan** para imitar la LCD de la GBA. La matriz y las gammas pueden ser una expresión creativa mínima o un "dato". Ratio 0,44, racha de 20.

**Otras versiones con licencia distinta:**
- **ares** actual (licencia ISC, `c76aaffa6e69778baf9a66d1da04298ac2ed7d1d`) usa **240** en el rojo. Ese cambio se hizo en `a6d3a57` (2022-04-06, Luke Usher), así que ares actual **no** es idéntico a nuestro código.
- La versión con **255** se distribuyó en ares bajo **ISC** desde `ea1eef8` ("add license (ISC)", 2021-07-05, Luke Usher; LICENSE "Copyright (c) 2004-2021 Near et al") hasta `8d04df1`.
- Antes de eso hubo commits de ares sin archivo de licencia: v111 `dc35465` y v117 `7656765`.

**Clasificación provisional:** **posible adaptación** de higan (GPLv3+) o de ares 2021–2022 (ISC).
- ⚖ **Interpretación legal:** si la reetiquetación GPL → ISC en ares fue válida (lo hizo un contribuidor sobre código de Near/byuu), y si unos coeficientes de calibración son siquiera protegibles.

### 2.4 Otras referencias comprobadas

| Referencia | Versión exacta | Licencia | Resultado |
|---|---|---|---|
| mGBA `src/gba/hle-bios.s` | 0.10.5 `26b7884` | MPL-2.0 | El stub IRQ de 6 instrucciones (`bios.js` L3–10) y la colocación de `0xE55EC002` dos palabras después (L22) son idénticos a `irqBase` (L116–124). Ver 2.5. |
| mGBA `src/arm/arm.c` | 0.10.5 | MPL-2.0 | El índice de decodificación `((op>>>16)&0xFF0)\|((op>>>4)&0xF)` y el de Thumb `op>>>6` (`cpu.js` L152/158) coinciden con L215/224. Es una técnica habitual en emuladores ARM. No es significativo por sí solo. |
| mGBA `bios.c` `_Div` | 0.10.5 / master | MPL-2.0 | La división por cero devuelve `r0=±1, r1=num, r3=1`, la misma elección HLE que mGBA (ratio 0,57). GBA.js no trata el cero. |
| mGBA `bios.c` `_MidiKey2Freq` | 0.10.5 | MPL-2.0 | Misma fórmula (ratio 0,48, racha de 3). Es una fórmula de hardware. |
| mGBA `bios.c` `_unLz77`, `_unHuffman` | 0.10.5 | MPL-2.0 | LZ77 0,33, con estructura distinta. Huffman 0,46 con una racha de 26: lo común son las expresiones del formato `(node & ~1) + offset*2 + 2` y el empaquetado de bits, y la estructura es distinta. |
| mGBA `savedata.c` (Flash/EEPROM) | 0.10.5 | MPL-2.0 | EEPROM 0,22 y Flash 0,26, por debajo de la línea base. Los IDs de chip (Sanyo `0x62/0x13`, Panasonic) son datos de hardware. |
| mGBA, higan, ares (CPU, PPU, APU, bus) | ver arriba | MPL-2.0 / GPLv3+ / ISC | Sin coincidencias sustanciales en `scan-k12-cores.txt`. |
| GBA.js, IodineGBA (todo el motor) | `0cf0ac7` / `a6aa389` | BSD-2-Clause / MIT | Sin coincidencias sustanciales fuera del RTC y de ObjAffineSet (`scan-js-k10.txt`). |
| Mezcla de audio PSG/DMA | mGBA | MPL-2.0 | La proporción 120/512 equivale al escalado `<<2` de DMA de mGBA. Es un parámetro y la preocupación es baja. |
| GBATEK | — | (documentación, Martin Korth) | **No verificable** desde este entorno. |

### 2.5 Stub de IRQ y valores de bus abierto de la BIOS

- **Nuestro código:** `bios.js` L3–10 (`BIOS_IRQ_HANDLER`), L22 (`0xE55EC002`), L28 (`biosLast = 0xE3A02004`); `bus.js` L38/63/132.
- Las 6 palabras de instrucción ARM son la secuencia del manejador de IRQ de la **BIOS de Nintendo**. mGBA `hle-bios.s` la reproduce también, con la misma disposición.
- Las constantes de bus abierto `E129F000`, `E3A02004`, `E25EF004` y `E55EC002` las comprueban los tests de jsmolka (`bios.asm`, MIT). Aparecen también en mGBA.
- **Clasificación:** funcional/hardware, pero coincide con una expresión MPL y son palabras de opcode de la BIOS de Nintendo.
- ⚖ **Interpretación legal:** si 6 instrucciones necesarias para la compatibilidad son *de minimis* o funcionales (interoperabilidad).

---

## 3. Tabla de evidencias por componente

Clasificaciones posibles:
- **IID:** implementación independiente documentada;
- **PA:** posible adaptación;
- **DI:** dependencia incorporada;
- **PSD:** procedencia sin determinar.

### 3.1 Componentes que se distribuyen dentro del APK (`assets/www/index.html` y `classes.dex`)

| # | Nuestro archivo / función / líneas | Referencia (proyecto · autor · enlace · versión) | Coincidencias y diferencias | Licencia verificada y excepciones | Clasif. | Qué falta comprobar | Consecuencia de distribuirlo en el APK |
|---|---|---|---|---|---|---|---|
| 1 | `cart.js` RTC: `RTC_BYTES` L134, `resetGpio` L146, `outputPins` 205–207, `rtcReadPins` 209–244, `rtcProcessByte` 246–266, `rtcOutput` 268–276 | mGBA · Jeffrey Pfau · github.com/mgba-emu/mgba `src/gba/cart/gpio.c` · 0.10.5 `26b7884`. Antecesor: GBA.js `js/gpio.js` `0cf0ac7` | Mismos nombres de estado, máquina de 3 pasos, `time[7-bytesRemaining]` tras decrementar y cierre `p&1`+`outputPins(1)`. Ratio 0,83 / 0,65 / 0,55 (base 0,34). Contra master 0,34. Diferencias: bandera PM y sin `vbaBugCompat`. | mGBA: MPL-2.0 (solo Exhibit A, sin Exhibit B). GBA.js: BSD-2-Clause (© 2012–2013 Jeffrey Pfau). | **PA** (MPL-2.0) | GBATEK y otros emuladores no comparados. Si el titular acepta la versión BSD como base. | Si es obra derivada MPL: hay que poner a disposición el **código fuente de los archivos MPL** (y sus modificaciones) bajo MPL, conservar los avisos e informar al destinatario de cómo obtenerlo. ⚖ Como `build.js` concatena todo en un `index.html`, ver 4.1. |
| 2 | `bios.js` `arctan` L121–133 | mGBA `src/gba/bios.c` `_ArcTan` · master `fd9dc5c` (= 0.10.5) | Polinomio idéntico (dato de la BIOS) y los mismos efectos secundarios `r1`, `r3=0x170`. Ratio 0,61. Historial: "arctan exact port". | MPL-2.0 | **PA** | Si GBATEK documenta `r1`/`r3`. Si es así, el peso de la coincidencia baja. | Igual que el n.º 1. |
| 3 | `bios.js` `arctan2` L135–156 | mGBA `bios.c` `_ArcTan2` · master `fd9dc5c` | Misma estructura de octantes y orden de comparaciones. Ratio 0,64, racha de 20. Sin equivalente BSD (GBA.js usa `Math.atan2`). | MPL-2.0 | **PA** | Si la BIOS real impone esa estructura (requiere un desensamblado legal o GBATEK). | Igual que el n.º 1. |
| 4 | `bios.js` `objAffineSet` L204–217 | mGBA `bios.c` `_ObjAffineSet`. GBA.js `js/irq.js` `0cf0ac7` | Mismo algoritmo con coma flotante y orden de escritura. Ratio 0,58. El ABI determina gran parte. | MPL-2.0 / BSD-2-Clause | **PA** (con equivalente BSD) | Ninguno técnico. Decisión: qué base se atribuye. | Con atribución BSD-2-Clause bastaría con incluir el aviso de copyright, las condiciones y el descargo (cláusula 2 para binarios). ⚖ Si la elección de base es defendible. |
| 5 | `bios.js` `div` L111–119 | mGBA `bios.c` `_Div` | Mismo tratamiento de la división por cero (`±1`, `num`, `1`). Ratio 0,57, código muy corto. | MPL-2.0 | **PA** (menor) | Comportamiento de la BIOS real ante división por cero (GBATEK o test en hardware). | Igual que el n.º 1, con bajo peso. |
| 6 | `bios.js` L3–10, L22, L28; `bus.js` L38/63/132 (stub IRQ y bus abierto) | mGBA `src/gba/hle-bios.s` L116–124 (0.10.5). BIOS de Nintendo. jsmolka `bios.asm` (MIT) | Las 6 instrucciones, su colocación y las constantes son idénticas. | MPL-2.0 (mGBA). Propiedad de Nintendo (opcodes de la BIOS). MIT (tests de jsmolka, que solo verifican). | **PA / funcional** | ⚖ Si es *de minimis* o interoperabilidad. | Riesgo bajo pero no nulo. Se reduce documentándolo como necesario para la compatibilidad. |
| 7 | `ppu.js` `setColorCorrection` L46–63 | higan · byuu/Near · github.com/higan-emu/higan `higan/gba/ppu/color.cpp` · `8f4df01` (cambio `1539f10`). ares `ea1eef8`…`8d04df1` | Gammas 4,0/2,2, matriz 3×3 completa, `0*lb` y escalado 255/280. Ratio 0,44, racha de 20. | higan: **GPLv3+**. ares 2021–2022: **ISC** (validez ⚖). ares actual (240): ISC, pero no es idéntico. | **PA** | ⚖ Validez de la licencia ISC de ares. ⚖ Si los coeficientes son protegibles. | Si se toma como GPLv3+: **toda la obra combinada** distribuida tendría que ir bajo GPLv3, con el código fuente completo correspondiente. Esto choca con un modelo comercial cerrado. Si se toma como ISC: basta con el aviso de copyright y el de permiso. |
| 8 | `bios.js` `bgAffineSet` L185–202 | mGBA `_BgAffineSet` (ratio 0,31) | Reescrito a enteros con una tabla de senos para cuadrar con los valores esperados de los tests de Peter Lemon. El historial documenta esta derivación. | — | **IID** | `SINE_TABLE` L12–13: comprobar que se generó (fórmula) y no se copió de la BIOS. | Sin obligación de terceros identificada. |
| 9 | `bios.js` `lz77` L250–274, `huffman` L276–313, `midiKey2Freq` L352–355, resto de SWI | mGBA `bios.c` | LZ77 0,33, Huffman 0,46 (coincide en expresiones del formato) y MIDI con fórmula. | — | **IID** probable (derivada del formato) | Nada crítico. | Ninguna identificada. |
| 10 | `cart.js` Flash L3–64, EEPROM L73–132, `detectSaveType` L334 | mGBA `savedata.c` | Por debajo de la línea base (0,26 / 0,22). IDs de chip = hardware. | — | **IID** probable | — | Ninguna identificada. |
| 11 | `cpu.js` (ARM7TDMI) | mGBA `arm.c`, higan, ares | Solo el índice de decodificación, que es una técnica común. | — | **PSD** con bajo riesgo: sin coincidencias frente a 5 proyectos | Comparar con VBA-M, NanoBoyAdvance, gpSP y otros. | Ninguna identificada frente a los proyectos comparados. |
| 12 | `ppu.js` (resto), `apu.js`, `bus.js`, `gba.js` | mGBA, higan, ares, GBA.js, IodineGBA | Sin coincidencias sustanciales. Mezcla de audio 120/512 equivalente a mGBA (parámetro). | — | **PSD** con bajo riesgo | Igual que el n.º 11. | Ninguna identificada. |
| 13 | `ui/ui.js`, `ui/template.html` | — | Escritos en esta sesión. Sin coincidencias. | — | **PSD** con bajo riesgo | — | Ver 4.4 (autoría de IA) y 4.5 (marcas). |
| 14 | `MainActivity.java` → `classes.dex` | — | Usa solo la API pública de Android. El DEX contiene **solo** clases `com.bolsillo.advance.*` (`MainActivity`, `$1`, `$2`, `$3`, `$Bridge`). No se incorporan bibliotecas. | — | **PSD** con bajo riesgo | — | Ninguna de terceros. |
| 15 | `res/drawable/ic_launcher.png` (icono) | — | Lo dibuja `build.py` L17–41 con primitivas de Pillow (rectángulos y elipses). | Pillow (MIT-CMU / HPND) se usa **solo al compilar**. El PNG que genera no está sujeto a esa licencia. | **IID** | ⚖ Que el diseño de "consola portátil" no imite el trade dress de Nintendo. | Ninguna de terceros. |
| 16 | Fuentes Silkscreen y Rubik | Google Fonts (`gfonts` `e7db6ca`). Silkscreen: Jason Kottke, "Copyright 2001 The Silkscreen Project Authors". Rubik: "Copyright 2015 The Rubik Project Authors" (Hubert & Fischer, Meir Sadan, Cyreal, Daniel Grumer, Omaima Dajani) | **No están dentro del APK.** Se cargan al ejecutar desde `fonts.googleapis.com`. | **SIL OFL-1.1** (ambas) | **DI remota** | — | No hay obligación de la OFL mientras no se redistribuyan. Pero hay **transmisión de la IP del usuario a Google** (privacidad, RGPD: hay que declararlo o incrustarlas). Sin conexión se usa la tipografía del sistema. Si se incrustan: incluir el texto de la OFL-1.1 y su aviso de copyright, y no venderlas sueltas. |

### 3.2 Herramientas solo de compilación (no van en el APK)

| Pieza | Versión / hash | Licencia verificada | Uso | Consecuencia |
|---|---|---|---|---|
| `dx` (Dalvik dexer) | 16.0.1, reempaquetado de AOSP por Jake Wharton, sha256 `1e4b6456…` | Apache-2.0 (según el POM) | `.class` → `classes.dex` | Ninguna. El DEX generado no hereda su licencia. |
| `apksig` | 2.3.0, sha256 `963707…` | Apache-2.0 | Firma v2 (v1 desactivada, `Sign.java` L21) | Ninguna. |
| `android-all` | 10-robolectric-5803371, sha256 `a0ad701e…` | Apache-2.0, con una nota que remite al **Android SDK License Agreement** | Classpath de javac | ⚖ Usar los stubs de Robolectric en lugar del SDK oficial. Para publicar se recomienda compilar con el SDK oficial y aceptar sus términos. |
| JDK (javac `--release 8`) | el del sistema | GPLv2 + Classpath Exception | Compilar | Ninguna. |
| Pillow | 12.3.0 | MIT-CMU (HPND) | Dibujar el icono | Ninguna. |
| Node.js (`build.js`) | el del sistema | MIT | Concatenar los módulos | Ninguna. |
| `pyaxml` | 0.1.1 | **GPLv2** | Instalado pero **no se usa** (no hay `import` en el build) | Ninguna. Conviene desinstalarlo del entorno de build para que no haya dudas. |
| `androguard` | 4.1.4 | Apache-2.0 (un *classifier* de PyPI dice "Other/Proprietary", contradictorio) | Solo verificación | Ninguna. |
| `androidbin.py`, `build.py`, `Sign.java` | hashes en §0 | — | Escritos en esta sesión | Ninguna. Nota: el docstring de `build.py` dice "v1 + v2", pero la firma real es solo v2. |

### 3.3 Solo pruebas (no se distribuyen)

| Pieza | Versión | Licencia | Nota |
|---|---|---|---|
| jsmolka/gba-tests | `a7113b67e63f83a9b321696ddd7042ccfad6c881` | MIT, © 2019 Julian Smolka | Las constantes de bus abierto se verificaron contra estos tests. |
| FuzzARM (DenSinH) | `a675329cd57da48e3e406216ba2d79dd7e09ee20` | **GPLv3** | Solo se ejecuta. No debe incluirse en el APK ni en el repositorio que se distribuya. |
| PeterLemon/GBA | `efdb535c9c6212c154379c947e758e173fd1e03d` | **Sin archivo de licencia** (por defecto, todos los derechos reservados) | Se usó para derivar los valores esperados de BgAffineSet. No se debe redistribuir. ⚖ Usar valores de salida observados es un uso de hechos, no de código. |
| tonc | — | — | La descarga falló (403). No se usó. |
| Playwright + Chromium | preinstalados | Apache-2.0 / BSD-3-Clause (y otras de Chromium) | Solo pruebas automatizadas. |
| `gba/test/rtc.js` | — | — | Menciona el driver `siirtc.c` de pokeruby (descompilación de un juego de Nintendo). Solo es una referencia de comportamiento en una prueba. **No** debe acabar en material distribuido. |
| ROMs de juegos (Pokémon) | — | © Nintendo / Game Freak / Creatures | **No se incluyen ni se deben incluir.** El usuario aporta la suya. |

---

## 4. Puntos transversales

### 4.1 MPL-2.0 en un único `index.html` ⚖
MPL-2.0 es un copyleft **por archivo**. Si el RTC (n.º 1) y ArcTan, ArcTan2, ObjAffineSet y Div (n.º 2–5) se consideran derivados de mGBA, los "Covered Files" son `cart.js` y `bios.js`. Pero `build.js` concatena **todos** los módulos en un único `index.html`.
- **Riesgo:** que ese único archivo se considere "Modification" del archivo MPL. En ese caso, el `index.html` completo tendría que estar disponible en forma de código fuente bajo MPL.
- **Lo que no implica:** no "contagia" a `MainActivity.java`.
- Que el JS no esté minificado ayuda a cumplir (la forma ejecutable ya es legible), pero **no basta por sí solo**: la MPL exige además los avisos y que se indique al destinatario cómo obtener el código fuente.

### 4.2 GPLv3 en la corrección de color ⚖
Si se toma de higan, la obra combinada que se distribuye tendría que ir bajo GPLv3. Esto es incompatible con un APK comercial cerrado. Es el **punto de mayor impacto** aunque el código sea pequeño (unas 10 líneas).

### 4.3 Aún no hay archivo NOTICE
El APK no contiene ningún aviso de terceros. Hoy, con cualquiera de las clasificaciones **PA**, la distribución sería **incumplidora** de MPL, BSD, ISC y GPL. Esto afecta también al **artefacto compartido "con cualquiera que tenga el enlace"**, que ya cuenta como distribución.

### 4.4 Autoría de IA y titularidad ⚖
- La protección por derechos de autor del código generado por IA y su titularidad dependen de la jurisdicción y de la aportación humana. Hay que revisar los términos de Anthropic que se apliquen a tu cuenta.
- **Que el código lo generara yo no lo hace original ni libre de obligaciones de terceros.** Esta auditoría encontró precisamente lo contrario en varios componentes.

### 4.5 Marcas y presentación ⚖
- "Pokémon", "Game Boy Advance" y "GBA" son marcas de Nintendo y sus socios. No deben usarse en el nombre, el icono ni la ficha de la tienda de forma que sugiera afiliación.
- Google Play tiene políticas específicas sobre emuladores y contenido con derechos ajenos (no promocionar ROMs).

---

## 5. Cómo cerrar cada pendiente

Las opciones por componente se ordenan de menor a mayor esfuerzo. **Ninguna está aplicada.**

| # | Componente | Opción A: mantener y cumplir | Opción B: aclarar permisos | Opción C: sustituir |
|---|---|---|---|---|
| 1 | RTC | Separar el RTC en su **propio archivo** (`rtc.js`) que no se concatene, o se concatene con límites claros. Cabecera MPL-2.0 con "Portions © Jeffrey Pfau (mGBA)". Publicar el código fuente de ese archivo (repositorio público o enlace en la app y la ficha). | Pedir a Jeffrey Pfau (titular de mGBA y de GBA.js) permiso para usar esa parte bajo BSD-2-Clause, como ya hizo en GBA.js. | Reimplementación en **sala limpia**: que alguien que no haya visto mGBA ni este código la escriba solo a partir de la hoja de datos de la S-3511 o de GBATEK y de los tests (`gba/test/rtc.js`). |
| 2–3 | ArcTan, ArcTan2 | Igual que el n.º 1, en un `bios-hle-mgba.js` separado con cabecera MPL. | Igual que el n.º 1. | Sala limpia a partir de GBATEK, verificando contra tests. |
| 4 | ObjAffineSet | Atribuir a GBA.js con el texto **BSD-2-Clause** completo en el NOTICE. | — | Reescribir en enteros, como BgAffineSet. |
| 5 | Div | Incluirlo en el archivo MPL de los n.º 2–3. | — | Documentar el comportamiento real ante división por cero (GBATEK o test en hardware) y escribirlo desde ahí. |
| 6 | Stub IRQ / bus abierto | Documentar en el código que se trata de valores necesarios para la compatibilidad (verificados con los tests MIT de jsmolka). | ⚖ Dictamen *de minimis* / interoperabilidad. | Un stub distinto pero funcionalmente equivalente (los valores de bus abierto deben mantenerse si se quiere pasar los tests). |
| 7 | Color | Si se acepta ⚖ la validez de ares ISC: aviso ISC "Copyright (c) 2004-2021 Near et al" en el NOTICE. | — | **Recomendada:** un perfil propio calibrado con mediciones o publicado con licencia permisiva, o quitar la corrección. Es poco código y es lo que más condiciona el modelo de negocio (GPLv3). |
| 8–13 | Resto del motor y UI | Nada por terceros. | — | Opcional: ampliar la comparación a VBA-M, NanoBoyAdvance, gpSP y SkyEmu antes de lanzar. |
| 16 | Fuentes | Incrustarlas en el APK con OFL-1.1 + avisos, o mantenerlas remotas declarándolo en la política de privacidad. | — | Usar las tipografías del sistema. |
| — | Build | Compilar la versión comercial con el Android SDK oficial (aceptando su licencia), Gradle/AGP y una clave de firma de publicación propia. Desinstalar `pyaxml`. | — | — |
| — | General | Crear `THIRD-PARTY-NOTICES` dentro del APK (pantalla "Acerca de / Licencias"), con el texto completo de cada licencia que corresponda. No sirve un genérico "MIT y similares". | — | — |

**Archivos cuyo código fuente habría que ofrecer** si se mantiene el código MPL (opción A):
- `gba/src/cart.js` (o el `rtc.js` separado);
- `gba/src/bios.js` (o el `bios-hle-mgba.js` separado);
- y, ⚖ según la interpretación de 4.1, el `index.html` concatenado completo.

Si se mantiene el color de higan bajo GPLv3: **todo** el código fuente correspondiente de la app (JS, Java y scripts de build).

---

## 6. Decisiones que tienes que tomar

1. **Modelo de licencia del producto:**
   - **cerrado**: obliga a sustituir el color (n.º 7) y a aislar o sustituir lo MPL;
   - **código abierto**: por ejemplo MPL-2.0 o GPLv3 para todo, lo que simplifica el cumplimiento.

   *No asigno ninguna licencia: la decisión es tuya.*
2. **Para cada componente PA (n.º 1–7), qué hacer:** cumplir (A), pedir permiso (B) o sustituir en sala limpia (C). La sala limpia requiere **otra persona** distinta del autor actual, que no haya visto mGBA ni este código.
3. **Si contratas un dictamen legal** sobre:
   - el alcance de la MPL en un archivo concatenado;
   - la validez de ares ISC;
   - el stub de la BIOS como *de minimis*;
   - la autoría de la IA;
   - el uso de valores observados de PeterLemon;
   - marcas y políticas de Google Play.
4. **El artefacto compartido por enlace** (https://claude.ai/artifact/5rDBasLwjDBPY56UCybKmi): ya cuenta como distribución sin avisos. Decide si lo vuelves privado hasta resolver los pendientes. No lo he cambiado.
5. **Fuentes:** incrustarlas o mantenerlas remotas, con su efecto en la privacidad.
6. **Si amplías la comparación** a más emuladores y **verificas GBATEK** desde una red sin bloqueo antes del lanzamiento.
7. **Nombre, icono y ficha** sin marcas de Nintendo.

---

## 7. Anexos y reproducibilidad

Todos los anexos están en esta carpeta, `bolsillo-advance/audit/`. El índice completo está en `README.md`.

| Archivo | Contenido |
|---|---|
| `ANEXO-A-comparaciones.md` | Fragmentos lado a lado: RTC, ArcTan2, ObjAffineSet, Div y stub IRQ. Del color solo hay referencias. |
| `results-2026-10-24-auditada/` | Resultados regenerados de forma determinista sobre la versión auditada: `pairsim-results.txt` (ratios, con líneas base), `scan-k12-cores.txt` y `scan-js-k10.txt` (k-gramas). |
| `tools/`, `run-audit.py`, `pairs.txt` | Herramientas de comparación y la lista exacta de pares comparados. |
| `snapshot-SHA256SUMS.txt` | Hashes de la versión analizada. Los archivos no se publican aquí; ver `ESTADO-VERSIONES.md`. |
| `refs.lock` + `fetch.sh` | Referencias en los commits citados. Se descargan; no se copian. |

Las primeras búsquedas ruidosas (`scan-k10.txt` y `scan-k14.txt`) no se incluyen: se hicieron con una versión anterior de `simscan.py` (sin excluir third-party/platform/test) y no se pueden regenerar con la actual.

**Limitaciones (resumen):**
- GBATEK no se pudo verificar.
- El razonamiento del modelo no se guardó.
- Solo se compararon cinco emuladores.
- Las métricas son orientativas.
- Las conclusiones legales quedan abiertas (⚖).
- Esta auditoría vale solo para los hashes de la sección 0.
