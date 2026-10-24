# Bolsillo Advance

Emulador de Game Boy Advance para el navegador y Android (WebView). Esta carpeta contiene el código de la app (`app/`), los avisos de terceros (`notices/`) y el expediente de procedencia y licencias (`audit/`).

## Licencia: léase antes de reutilizar

- **El archivo `LICENSE` (MIT) de la raíz de este repositorio pertenece a `simple-proxy` (© 2023 movie-web) y no se aplica a esta carpeta.**
- **No se concede, por ahora, ninguna licencia general sobre Bolsillo Advance.** La decisión está pendiente; ver `audit/PROPUESTA-MGBA.md` §5.
- Algunas partes de `app/gba/src/cart.js` y `app/gba/src/bios.js` **pueden contener código adaptado de mGBA (MPL-2.0)**. Esa clasificación es provisional. Ver `notices/THIRD-PARTY-NOTICES.txt`. A esas partes se les aplica la MPL-2.0 (`notices/licenses/MPL-2.0.txt`).
- Hay atribución a GBA.js (BSD-2-Clause) en `notices/licenses/BSD-2-Clause-GBA.js.txt`.
- La app no incluye juegos ni la BIOS original. "Game Boy Advance" es una marca de Nintendo; este proyecto no tiene relación con Nintendo.

## Estructura

```
app/gba/src/        motor (CPU, bus, PPU, APU, BIOS HLE, cartucho)
app/gba/ui/         interfaz (plantilla + JS)
app/gba/build.js    genera dist/bolsillo-advance.html (con los avisos dentro)
app/gba/test/       verify.js (pruebas del motor), ui-notices.js (Chromium), rtc.js, blend.js, run.js
app/apk/            MainActivity.java, build.py (APK sin el Android SDK), check_apk.py
notices/            avisos de terceros y textos de licencia (van dentro de la app)
audit/              expediente: ver audit/README.md
```

## Compilar y probar

Ver los pasos en `audit/VERIFICACION-2026-10-24.md`, sección "Cómo repetirlo". Requisitos:
- Node 20+;
- Python 3 con Pillow;
- JDK 17+ (`javac`, `keytool`);
- Playwright con Chromium, solo para `ui-notices.js`;
- androguard, opcional, para `check_apk.py`.
