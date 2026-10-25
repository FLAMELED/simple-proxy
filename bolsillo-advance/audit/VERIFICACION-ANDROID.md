# Verificación en Android y en CI (segunda ronda, 2026-10-24/25)

Todas las pruebas de esta página **se ejecutaron en GitHub Actions**, no en el entorno de trabajo, que no tiene KVM ni acceso al SDK de Android. Cualquiera con acceso al repositorio puede ver los registros y repetirlas.

- **Ejecución en verde:** https://github.com/FLAMELED/simple-proxy/actions/runs/40146999270
- **Commit probado:** `d39f3f6d09b97378fb09ae59d151da5851d69710`
- **Workflow:** `.github/workflows/bolsillo-android.yml`

Los artefactos de la ejecución (AAB, APK, capturas, logcat, `results.json`) se pueden descargar desde esa página durante el periodo de retención de GitHub.

## 1. Resumen

| Trabajo | Qué hace | Resultado |
|---|---|---|
| `engine` | `verify.js` sin `--ref` (la versión auditada no es pública) y `ui-notices.js` en Chromium | **Verde**. Motor: 70/70. Sin `--ref`, las comprobaciones de igualdad con la versión auditada no se hacen; con ellas, en local, son 120/120. Los fallos conocidos se listan aparte (ver 3). Navegador: 13/13. |
| `bundle` | `gradle bundleRelease assembleDebug` (AGP 8.13, compile/targetSdk 36), APK universal con bundletool 1.18.1, `apksigner verify` y `check_bundle.py --release` | **Verde**. 20/20 comprobaciones del bundle. |
| `device (36)` | Emulador Android 16 (API 36, `google_apis` x86_64, perfil Pixel 6) con aceleración KVM: `device_test.py` | **Verde: 34/34** |

**Firma:** el AAB se firmó con una **clave de prueba desechable**, porque el repositorio no tiene los secretos de la clave de subida. **No se debe subir a Play.**

## 2. Prueba en el emulador: qué se hizo y cómo

**Qué APK se probó:** el **APK universal generado a partir del mismo `.aab` de release**. No es la compilación de depuración.
- La imagen del emulador es *userdebug*, así que todas las WebView abren su socket de DevTools. Por eso se pudo leer el estado de la página sin usar una compilación de depuración.
- En un teléfono de producción eso no ocurre, y el script usaría el APK de depuración del mismo commit.

**Cómo se interactúa con la app:**
- **Entradas:** son reales, por adb:
  - `input tap` y `input swipe` sobre las coordenadas de cada botón;
  - el **selector de archivos del sistema** (DocumentsUI);
  - las teclas ATRÁS e INICIO;
  - `am force-stop`, que mata el proceso.
- **Lectura del estado:** se usa `window.__diag()`, una función de solo lectura que devuelve si hay juego cargado, las teclas pulsadas, un hash del fotograma y el estado del audio. Además se usan `dumpsys` y los archivos exportados a Descargas.

| # | Comprobación (resultado: OK) | Evidencia en el registro |
|---|---|---|
| 1 | La app abre en primer plano y la página carga ("Inserta un cartucho") | `topResumedActivity` = `com.bolsillo.advance` |
| 2 | Importar `BGMode7.gba` con el selector del sistema | `loaded: true`, `running: true` |
| 3 | Sin tocar nada la imagen no cambia | hash `4133961642` = `4133961642` |
| 4 | Joystick a la derecha (deslizamiento real de 1,5 s): llega la tecla DERECHA y el juego responde | teclas vistas `[0, 16]`, el hash cambia |
| 5 | Botón A (pulsación real de 1,2 s): llega la tecla A y el juego responde | teclas `[1]`, el hash cambia |
| 6 | Menú: se abre; ATRÁS lo cierra y la app sigue delante (gesto atrás de API 36) | — |
| 7 | "Licencias y avisos" se abre y muestra MPL-2.0, Jeffrey Pfau, `mpl/gpio-rtc.js` y la URL con el commit | `…/tree/d39f3f6…/bolsillo-advance` |
| 8 | Los Covered Files se cargan como archivos aparte | `mpl/gpio-rtc.js,mpl/bios-hle.js` |
| 9 | Sonido con `SoundPCMStereo.gba`: AudioContext en marcha y señal no nula a la salida del motor de audio | `state: running`, `peak: 0.0208`. Con BGMode7, que es muda, el pico es 0. |
| 10 | Sonido: Android registra un reproductor activo de la app | `AudioPlaybackConfiguration … type:AAudio u/pid:10216/… state:started … usage=USAGE_MEDIA` |
| 11 | Importar `sram.gba` (jsmolka); tipo de guardado SRAM | `saveType: sram` |
| 12 | Exportar la partida deja un `.zip` en Descargas/Bolsillo Advance | `GBA Tests 2026-10-25.zip` |
| 13 | La partida exportada es **idéntica byte a byte** a la que deja el test en el motor de referencia (Node) | 32 768 bytes |
| 14 | INICIO: la app pasa a segundo plano; `force-stop`: el proceso desaparece | launcher en primer plano; `pidof` vacío |
| 15 | Al reabrir ofrece "Seguir donde lo dejé"; el juego sigue cargado | — |
| 16 | Continúa en la misma pantalla que al cerrar | hash `2216171524` = `2216171524` |
| 17 | La partida del juego se conserva tras matar la app: el segundo export es idéntico | `GBA Tests 2026-10-25 (1).zip` |
| 18 | Sin cierres inesperados en logcat | — |
| 19 | Release: instalado con targetSdk 36 y **no depurable** (`pkgFlags`) | — |
| 20 | Release: con una instalación limpia la página se dibuja (pantalla LCD visible en la captura), y ATRÁS sin menús abiertos manda la app a segundo plano | 6 505 px del color LCD |

A esto se suman las comprobaciones de infraestructura (dispositivo, APK probado), hasta llegar a 34.

## 3. Cómo leer estos números

- **Son comprobaciones automáticas de funciones concretas.** No son una medida de compatibilidad.
- **No se ha probado ningún juego comercial.** Las ROMs son de prueba: PeterLemon BGMode7 y SoundPCMStereo, y jsmolka `save/sram`.
- **El sonido** se comprueba de dos formas: la señal a la salida del motor de audio de la página, y el reproductor que registra Android. **No se ha escuchado.** El emulador no tiene salida de audio real (`pulseaudio: Failed to initialize`).
- **Fallos conocidos del motor.** `verify.js` los imprime en "FALLOS CONOCIDOS" y no los cuenta como superados:
  - filas TIMER0 de las ROMs de BIOS: 0 PASS / 59 FAIL, porque no se emulan los ciclos de la BIOS real;
  - `SoundGetJumpList`: datos FAIL;
  - 7 ROMs de BIOS solo miden tiempos y no comprueban datos.
- **Historial del CI:**
  - las dos primeras ejecuciones fallaron por problemas del arnés de prueba: el contenido del WebView no está en el árbol de accesibilidad, y el aviso del sistema "Viewing full screen — Got it" tapaba la app;
  - se corrigió el arnés; **no se tocó la app** para que pasaran;
  - las ejecuciones están en la pestaña Actions de la rama.

## 4. Lo que falta

- **Teléfono físico.** Ninguna de estas pruebas se ha hecho en un teléfono real. Lista mínima para hacerla a mano:
  - instalar el APK universal;
  - importar un juego propio;
  - joystick y botones;
  - sonido por el altavoz y con auriculares;
  - guardar dentro del juego, cerrar la app desde "recientes" y reabrir;
  - exportar e importar una partida;
  - girar el teléfono;
  - gesto atrás.
- **Otras versiones de Android:** solo se ha probado API 36. La matriz del workflow (`api: [36]`) se puede ampliar a 24, 29 y 34. La WebView de las imágenes antiguas es muy vieja y puede no ejecutar la app.
- **Juegos comerciales:** fuera del alcance del CI. Las ROMs no se pueden redistribuir.
