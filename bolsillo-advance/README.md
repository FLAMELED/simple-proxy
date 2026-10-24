# Bolsillo Advance

Emulador de Game Boy Advance para el navegador y Android (WebView). Esta carpeta contiene el código de la app (`app/`), los avisos de terceros (`notices/`) y el expediente de procedencia y licencias (`audit/`).

## Licencia: léase antes de reutilizar

- **El archivo `LICENSE` (MIT) de la raíz de este repositorio pertenece a `simple-proxy` (© 2023 movie-web) y no se aplica a esta carpeta.**
- **`app/gba/src/mpl/gpio-rtc.js` y `app/gba/src/mpl/bios-hle.js` están bajo la Mozilla Public License 2.0**: son "Covered Files" y pueden contener código adaptado de mGBA, © Jeffrey Pfau. La delimitación y cómo se cumple la licencia están en `audit/COVERED-FILES.md`.
- **El resto de Bolsillo Advance no tiene, por ahora, ninguna licencia concedida.** Es la "Larger Work" de la MPL §3.3, y su licencia está pendiente de decisión (`audit/PROPUESTA-MGBA.md` §5).
- Hay atribución a GBA.js (BSD-2-Clause) en `notices/licenses/BSD-2-Clause-GBA.js.txt`.
- La app no incluye juegos ni la BIOS original. "Game Boy Advance" es una marca de Nintendo; este proyecto no tiene relación con Nintendo.

## Estructura

```
version.json        versión (name, code) para la web y Android
app/gba/src/        motor (CPU, bus, PPU, APU, BIOS HLE, cartucho)
app/gba/src/mpl/    Covered Files MPL-2.0 (se distribuyen como archivos aparte)
app/gba/ui/         interfaz (plantilla + JS)
app/gba/build.js    genera dist/: página para la web (+ mpl/) y dist/www/ para Android, con avisos y URL del código
app/gba/test/       verify.js (motor), ui-notices.js (Chromium), rtc.js, blend.js, run.js
android/            proyecto Gradle (API 36, AAB), pruebas del bundle y en emulador, PUBLICAR-EN-PLAY.md
notices/            avisos de terceros y textos de licencia (van dentro de la app)
audit/              expediente: ver audit/README.md
```

## Compilar y probar

- **Web y motor:**

  ```sh
  node app/gba/build.js
  TESTROMS=<dir> node app/gba/test/verify.js
  ```

  Las ROMs de prueba se descargan con `audit/fetch.sh audit/testroms.lock testroms`.
- **Android:** `gradle -p android bundleRelease`. Requiere el Android SDK, JDK 17 y Gradle 8.14. Ver `android/PUBLICAR-EN-PLAY.md`.
- **Todo en CI:** `.github/workflows/bolsillo-android.yml` comprueba el motor, el navegador, el AAB y el emulador API 36 en cada push que toque esta carpeta. Los resultados se resumen en `audit/VERIFICACION-ANDROID.md`.
