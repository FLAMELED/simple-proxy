# Versión auditada y versión actual

**Fecha:** 2026-10-24.
**Versión auditada:** los hashes de `snapshot-SHA256SUMS.txt`, que son la sección 0 de `AUDITORIA-PROCEDENCIA.md`.
**Versión actual:** la de este repositorio, `bolsillo-advance/app/`.

## 1. ¿Hubo reparaciones posteriores a la auditoría?

Antes de hacer cambios comprobé que la auditoría se había hecho sobre la última versión. No había reparaciones posteriores en ninguna de las tres copias:

| Copia | Comprobación | Resultado |
|---|---|---|
| Archivos de trabajo (motor, UI, scripts del APK) | `sha256sum -c snapshot-SHA256SUMS.txt` | 16/16 iguales |
| Artefacto publicado (https://claude.ai/artifact/5rDBasLwjDBPY56UCybKmi) | versión y sha256 | Sigue en la versión `1792186409-5033`, sha256 `5be4d75a1543e920ff8d66fe10b04a7e446d208bb41e153236d0f891973d712b`, la misma auditada. Nadie lo ha republicado desde entonces. |
| APK entregado | sha256 | `4d57ba9d…cedeccbc`, el mismo auditado |

Los cambios de esta ronda parten, por tanto, de la versión auditada sin pisar nada. **El artefacto publicado no se ha modificado:** sigue sirviendo la versión auditada, con la corrección de color anterior y sin avisos.

## 2. Archivo por archivo

| Archivo | sha256 auditado | sha256 actual | Estado |
|---|---|---|---|
| `gba/src/apu.js` | `db59caef…aa0be3fe1` | igual | **sin cambios** |
| `gba/src/bios.js` | `5e73d2e2…c639a47` | igual | **sin cambios** |
| `gba/src/bus.js` | `183ae537…6ba73` | igual | **sin cambios** |
| `gba/src/cart.js` | `af3f1605…bdaf03349` | igual | **sin cambios** |
| `gba/src/cpu.js` | `c131ad2b…3683e1e` | igual | **sin cambios** |
| `gba/src/gba.js` | `39c4cfef…4803c5` | igual | **sin cambios** |
| `gba/src/ppu.js` | `0bec4525…8a235db` | `9a957380a6057e4df9b11f3ee164cb18e9f35497a85ad8174ddf4f9becc474d6` | Cambia solo la corrección de color (+7 líneas, ver 3) |
| `gba/ui/ui.js` | `b8ee6f97…d5d98c157` | `445d46387d208d0cf4fc8ffde5aafb8141447c91257c6713fd3be25e1024d033` | Cambia una etiqueta: "Como la GBA" pasa a "Suaves (LCD)" |
| `gba/ui/template.html` | `31e86287…a235536c` | `827a5e66f491b69c328e617038284ff06899633aa7ff13883eddf674ef2f2b47` | Nueva sección "Licencias y avisos" en el menú, con su estilo |
| `gba/build.js` | `129a8e48…a1fa021a10` | `951e5da859b028fc6f9a009069bee8eb8ec572d47f68c14d6316cf72e3302ba6` | Inserta `notices/` en la página |
| `apk/build.py` | `28bd9295…dc61dc41` | `c402d60db263f30bb5e32fbe787addf7e28dcc50067efe276c8730b8832cbd8e` | Compila Java/DEX y el firmador en el propio script, toma las herramientas de `$BOLSILLO_TOOLS`, añade los avisos y las fuentes separadas al APK y corrige el docstring ("v1 + v2" pasa a "v2 only") |
| `apk/tools/androidbin.py` | `dcae6e43…9760f` | igual | **sin cambios** |
| `apk/tools/signer/Sign.java` | `e8225386…ed7ca0` | igual | **sin cambios** |
| `apk/src/…/MainActivity.java` | `84a18aca…77e68` | igual | **sin cambios** |
| `dist/bolsillo-advance.html` | `5227aa53…19b0d` | `2f4e3cf91e611e5c6ae0f626b34ab9c3e53cdd4b270d94cc5894693ad2a74887` | Se regenera con `node gba/build.js` (determinista) |
| `Bolsillo-Advance.apk` | `4d57ba9d…cedeccbc` (68 888 B) | `a81709736dd9b5990f706c30a91921ec6efc8df4ebdc12a692c789edd6cb5ad5` (91 480 B) | Se regenera con `apk/build.py`. Es determinista con la misma clave: dos compilaciones dan el mismo hash. |

Las rutas son relativas a `bolsillo-advance/app/`. Los hashes completos de la versión auditada están en `snapshot-SHA256SUMS.txt`.

**Los archivos de la versión auditada no se publican en este repositorio.** Su `ppu.js` contiene la corrección de color con parámetros de higan (GPLv3+), de licencia no aclarada. Los demás archivos auditados son idénticos a los actuales, salvo los cuatro de UI y build de la tabla. Quien tenga la copia privada del expediente original puede verificarla con `sha256sum -c snapshot-SHA256SUMS.txt`.

## 3. Qué conclusiones de la auditoría siguen aplicando

| Componente (tabla §3.1 de la auditoría) | ¿Sigue aplicando? | Motivo |
|---|---|---|
| 1. RTC (`cart.js`) | **Sí, sin cambios** | Archivo idéntico, mismas líneas (L134–289). La reejecución da los mismos ratios (`results-actual/pairsim-results.txt`). |
| 2–5. ArcTan, ArcTan2, ObjAffineSet, Div (`bios.js`) | **Sí, sin cambios** | Archivo idéntico, mismas líneas. |
| 6. Stub IRQ y bus abierto (`bios.js`, `bus.js`) | **Sí, sin cambios** | Archivos idénticos. |
| 7. Corrección de color (`ppu.js`) | **Ya no aplica a la versión actual** | Los parámetros de higan se han retirado (ver `COLOR-REEMPLAZO.md`). En la búsqueda de k-gramas del `ppu.js` actual ya no aparece ninguna coincidencia con `color.cpp` (antes: L55–57 frente a `color.cpp:15–17`). **Sigue aplicando al artefacto publicado y al APK anterior**, que continúan distribuyendo la versión auditada. |
| 8–10. BgAffineSet, LZ77/Huffman/MIDI, Flash/EEPROM | Sí | Archivos idénticos. |
| 11–12. CPU, resto de la PPU, APU, bus | Sí | Idénticos. En `ppu.js` solo cambia el bloque de color. El resto de las coincidencias son ruido estructural, como antes: hay una nueva de 3 líneas en L58–60 frente a `arm/decoder.c` y `gba/core.c`, que es la forma genérica `let a, b, c; if (x) {`. |
| 13. UI | Sí | Cambio de una etiqueta y una sección de avisos nueva, escritos en esta ronda. |
| 14. `MainActivity.java` | Sí | Idéntico. |
| 15. Icono | Sí | Mismo código de dibujo. |
| 16. Tipografías | Sí | Siguen cargándose desde Google Fonts. No se incluyen en el APK (comprobado en `check_apk.py`). |
| §4.3 "No existe NOTICE" | **Resuelto en la versión actual** | `notices/THIRD-PARTY-NOTICES.txt`, los textos de MPL-2.0 y de BSD-2-Clause, y las fuentes `cart.js`/`bios.js` van dentro del APK y en el menú de la app (ver `VERIFICACION-2026-10-24.md`). **No resuelto** en el artefacto publicado ni en el APK anterior. |
| §4.1 MPL en un `index.html` concatenado ⚖ | Sigue abierto | La propuesta está en `PROPUESTA-MGBA.md`. No se ha aplicado la separación en archivos. |
| §4.4, §4.5 (autoría de IA, marcas) ⚖ | Siguen abiertos | — |
