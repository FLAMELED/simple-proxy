# Expediente de procedencia y licencias

| Archivo | Qué es |
|---|---|
| `AUDITORIA-PROCEDENCIA.md` | Informe de auditoría del 2026-10-24 sobre la versión auditada |
| `ANEXO-A-comparaciones.md` | Fragmentos lado a lado (RTC, ArcTan2, ObjAffineSet, Div, stub IRQ), con referencias de color |
| `ESTADO-VERSIONES.md` | Hashes de la versión auditada frente a la actual, y qué conclusiones siguen aplicando |
| `PROPUESTA-MGBA.md` | Propuesta para los componentes posiblemente derivados de mGBA: archivos, avisos, licencias, código fuente |
| `COLOR-REEMPLAZO.md` | Retirada de la corrección de color con parámetros de higan y procedencia del reemplazo |
| `COVERED-FILES.md` | Archivos bajo MPL-2.0, delimitación del resto (Larger Work) y cómo se cumple cada obligación |
| `VERIFICACION-ANDROID.md` | Segunda ronda: CI en GitHub Actions (motor, navegador, AAB API 36, emulador Android 16: 34/34) |
| `VERIFICACION-2026-10-24.md` + `verificacion-2026-10-24/` | Pruebas de la versión actual (motor, interfaz, APK), con sus registros |
| `snapshot-SHA256SUMS.txt` | Hashes de los 16 archivos auditados |
| `results-2026-10-24-auditada/`, `results-actual/` | Resultados de similitud de cada versión, regenerados de forma determinista |
| `run-audit.py`, `pairs.txt`, `tools/` | Herramientas y lista exacta de comparaciones |
| `refs.lock`, `testroms.lock`, `fetch.sh` | Proyectos de referencia y ROMs de prueba, fijados por commit |

## Reproducir

```sh
./fetch.sh refs.lock refs                               # ~1 GB; se descarga, no se copia aquí
python3 -I run-audit.py                                 # sobre la versión actual -> out/
python3 -I run-audit.py <copia auditada>/src out-aud    # reproduce results-2026-10-24-auditada/
```

## Qué se excluye a propósito

| Material | Motivo |
|---|---|
| Transcripción de la conversación de trabajo | Privada. Por eso la evidencia [H] del informe no se puede comprobar desde aquí. |
| Copia de los archivos auditados (`snapshot/`) y el APK anterior | Contienen la corrección de color con parámetros de higan (GPLv3+), de licencia no aclarada. Se conservan en el expediente privado y se verifican con los hashes. |
| Fragmentos de higan del anexo original | GPLv3+. Sustituidos por referencias de archivo, commit y líneas. |
| Clones de mGBA, higan, ares, GBA.js, IodineGBA y Google Fonts | Código de terceros. Se descargan con `refs.lock`. |
| ROMs de PeterLemon/GBA | Sin licencia: no se pueden redistribuir. |
| FuzzARM | GPLv3, y no se usa en `verify.js`. |
| jsmolka/gba-tests | MIT. Se descargan, para no mezclar material de prueba de terceros. |
| Capturas de las ROMs de prueba | Son la salida de ROMs sin licencia. |
| `dx`, `apksig`, `android-all` y la clave de firma | Son herramientas de compilación, que se descargan con hash. La clave no debe publicarse. |
| Búsquedas ruidosas iniciales (`scan-k10`, `scan-k14`) | Se hicieron con una versión anterior de la herramienta y no se pueden regenerar. |
