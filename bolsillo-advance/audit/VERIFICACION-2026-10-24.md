# Verificación de la versión actual (2026-10-24)

**Versión probada:** los hashes de la sección 2 de `ESTADO-VERSIONES.md`.
- `dist/bolsillo-advance.html`: sha256 `2f4e3cf9…2a74887`.
- APK: sha256 `a81709736dd9b5990f706c30a91921ec6efc8df4ebdc12a692c789edd6cb5ad5`, 91 480 bytes.

**Referencia (`--ref`):** el código fuente del motor de la versión auditada (`snapshot-SHA256SUMS.txt`), desde la copia privada del expediente.

Registros completos en `verificacion-2026-10-24/`. Las rutas locales se han sustituido por `<expediente-privado>` y `<repo>`.

## Resumen

| Prueba | Herramienta | Resultado |
|---|---|---|
| Motor: CPU, BIOS, memoria, guardados, RTC, BIOS HLE, gráficos | `app/gba/test/verify.js --ref …` | **116/116** (`verify.txt`) |
| Mezcla semitransparente (niebla de Ruby) | `app/gba/test/blend.js` | Igual que antes: `ff7b7bff` con y sin ventanas (`blend.txt`) |
| Interfaz: opción de color y sección de avisos (Chromium) | `app/gba/test/ui-notices.js` | **10/10**, sin errores JS (`ui-notices.txt`) |
| APK: avisos, fuentes, página, DEX y firma | `app/apk/check_apk.py` | **15/15** (`apk.txt`) |
| Control negativo del comprobador del APK (APK anterior) | `check_apk.py` sobre `4d57ba9d…` | 9 FALLOS esperados: sin avisos y con el color antiguo (`apk-anterior-control-negativo.txt`) |
| Compilación determinista | `apk/build.py` dos veces | Mismo sha256 `a8170973…` |

## Detalle por área

**CPU / BIOS / memoria:**
- jsmolka/gba-tests (`a7113b6`) `arm`, `thumb`, `memory` y `bios`: los cuatro dicen "All tests passed".
- Se leen en pantalla: el texto empieza en x = 56 si pasan y en x = 60 si fallan.
- **Control negativo:** con un fallo forzado en la bandera V de la CPU, el mismo lector informa "failed". Así se comprueba que el lector distingue.

**Guardados:**
- `flash64`, `flash128` y `sram` pasan, y el tipo se detecta bien.
- La partida que escribe el juego, exportada e importada en una consola nueva, es idéntica: 65 536, 131 072 y 32 768 bytes. El test vuelve a pasar con ella.
- `none` pasa.
- **EEPROM 64 Kbit:** no hay ROM de prueba disponible, así que se hizo con el protocolo serie directo (escritura de un bloque, lectura y paso por exportar/importar).

**RTC (S-3511):**
- con el protocolo bit a bit del driver de los juegos, el registro de control vale 0x40;
- la fecha y la hora en BCD coinciden con el reloj del sistema;
- en modo 12 h se marca PM (0x80);
- el estado se conserva en un estado guardado.

**BIOS HLE:**
- Las 25 ROMs BIOS de PeterLemon/GBA (`efdb535`) se ejecutan. Su pantalla es idéntica bit a bit a la de la versión auditada.
- 9 288 llamadas directas a Div/Sqrt/ArcTan/ArcTan2, con divisores cero y negativos, dan resultados idénticos a los de la referencia.
- **Revisión visual:** todas las filas "OUTPUT DATA/R0/R1/R3" salen PASS. Las excepciones son las mismas que en la versión auditada:
  - las filas "OUTPUT TIMER0" salen FAIL en todas las ROMs, porque la BIOS HLE no reproduce los ciclos exactos de la BIOS original;
  - `SoundGetJumpList` "OUTPUT DATA" sale FAIL porque no se implementa la tabla real.

  No hay regresión.

**Gráficos:**
- 14 ROMs: 8 de LCD de PeterLemon, `hello`/`shades`/`stripes` de jsmolka, y HelloWorld, Myst y 3DEngine.
- Con "Colores: Vivos", cada fotograma es **idéntico bit a bit** al de la versión auditada tras 180 cuadros.
- La conversión de 5 a 8 bits es exacta.
- Modo "Suaves (LCD)":
  - grises neutros y crecientes;
  - negro = 0 y blanco = 237;
  - tabla distinta de la anterior.

**Interfaz y APK:**
- **Interfaz:**
  - existe "Suaves (LCD)" y ya no existe "Como la GBA";
  - el menú muestra "Licencias y avisos" con Jeffrey Pfau, el texto MPL-2.0, la cláusula BSD de binarios, la OFL de las tipografías y la lista de archivos.
- **Contenido del APK:**
  - `assets/THIRD-PARTY-NOTICES.txt`, `assets/licenses/MPL-2.0.txt`, `assets/licenses/BSD-2-Clause-GBA.js.txt`, `assets/source/cart.js` y `assets/source/bios.js` son iguales byte a byte a los del repositorio;
  - la página lleva el Exhibit A y el código JS sin minificar;
  - no queda ningún coeficiente del perfil anterior;
  - no lleva tipografías, ROMs ni BIOS;
  - el DEX solo contiene `com/bolsillo/advance`.
- **Firma:** firma v2 válida (apksig y androguard). Paquete `com.bolsillo.advance`, minSdk 24, targetSdk 29.

## Qué **no** se ha probado

- **La instalación y ejecución en un Android real o emulado.** En este entorno no hay SDK ni emulador de Android. Solo se ha validado la estructura, la firma y el contenido del APK, y el mismo HTML en Chromium. Antes de publicar hay que instalarlo en un teléfono y comprobar que se abre el menú "Licencias y avisos".
- **Juegos comerciales:** no hay ninguno en el entorno. El RTC se ha probado con el protocolo de los juegos, no con un juego.
- **EEPROM con una ROM real:** solo se probó el protocolo directo.
- **FuzzARM (GPLv3):** no se ejecutó en esta ronda. La CPU no ha cambiado (mismo hash) y las pruebas de jsmolka dan los mismos fotogramas.
- **La clave de firma** es la de las versiones anteriores, del expediente privado. `fetch-build-tools.sh` genera una nueva si no existe, y un APK firmado con otra clave no se instala encima del anterior.

## Cómo repetirlo

```sh
cd bolsillo-advance
audit/fetch.sh audit/testroms.lock testroms          # ROMs de prueba, fuera de git
app/apk/fetch-build-tools.sh                         # dx, apksig y android-all con hash fijado, y una clave si no hay
node app/gba/build.js
TESTROMS=$PWD/testroms node app/gba/test/verify.js [--ref <src de otra versión>]
node app/gba/test/ui-notices.js app/gba/dist/bolsillo-advance.html testroms/PL/LCD/BG/BGMode7/BGMode7.gba out
python3 app/apk/build.py && python3 app/apk/check_apk.py app/apk/build/Bolsillo-Advance.apk
```
