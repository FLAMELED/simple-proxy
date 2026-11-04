# Talleres: Mi fichero de trabajos a medida y Mi plan de cortes

Dos apps personales para Android, sin conexión, para los talleres «Del taller a tu teléfono». Independientes del proxy de la raíz y de `menu-gt/`.

## Comandos
- `npm test`: pruebas unitarias (`node --test`): ZIP, números, modelo del fichero, motor y verificador de cortes (incluye 500 casos al azar).
- `npm run test:e2e`: compila `build/` y recorre ambas apps en Chromium (390 y 320 px): persistencia al cerrar, copias con fotos e historial, combinar/reemplazar/deshacer, piezas que no caben, giros.
- `npm run serve`: sirve `build/` en http://127.0.0.1:8080/fichero/ y /cortes/.
- `npm run build:apk`: genera `dist/fichero-<versión>.apk` y `dist/cortes-<versión>.apk` (ver README: requiere paquetes de Ubuntu y la clave de firma).
- `npm run icons`: vuelve a generar los PNG del lanzador desde `<app>/icon.svg`.

## Estructura
- `shared/`: ZIP, IndexedDB, puente Android (`window.Android`), avisos/diálogos, números, fuentes. `fichero/shared` y `cortes/shared` son enlaces a esta carpeta.
- `fichero/src/model.js` y `cortes/src/engine.js` + `verify.js`: lógica pura, sin DOM. Todo lo que decide algo se prueba ahí.
- `android/`: contenedor nativo (Java) común a las dos apps, manifiesto plantilla y `build.sh` (sin Gradle).

## Reglas que no se negocian
- Nunca inventar medidas, materiales ni datos. Vacío es «Sin dato» (`null`), nunca cero.
- No estimar medidas a partir de fotos. No integrar APIs de IA en las apps.
- Los cortes se calculan con lógica programada y se verifican con `verifyPlan`. No llamar «óptimo» a un plano.
- Recuperar una copia nunca sobrescribe sin avisar: «Agregar lo nuevo» no toca lo existente; «Reemplazar todo» pide confirmación y guarda un estado para deshacer.
- Los datos de ejemplo llevan `demo: true`, se muestran con la etiqueta EJEMPLO y se pueden quitar sin tocar lo real.
- Migraciones de IndexedDB: solo agregar (`if (oldVersion < N)`), nunca borrar almacenes. Cambiar el formato de copia sube `SCHEMA_VERSION` y sigue leyendo los anteriores.
- Mantener el mismo `package` y la misma clave de firma: si cambian, Android no instala la actualización encima y los datos no se conservan.
- Sin bordes redondeados; tipografía expresiva (Fraunces) solo en títulos; datos en Source Sans 3 con números tabulares.
- Cortes: `inputKey()` debe incluir todo lo que cambia el resultado de `pack()`. Las longitudes pasan por `cortes/src/units.js` (rejilla entera de 0,1 µm y valor exacto en mm). Nunca comparar longitudes con tolerancias.
- Reemplazar y deshacer copias: una sola transacción (`replaceAll`). Preparar y validar todo antes; dentro de `db.tx` no se espera nada.
- «Agregar lo nuevo» agrega solo lo que no existe y no actualiza lo existente. En Fichero, nunca agrega registros sin su relación (`planMerge`).
- Firma: `KS_PASS` por variable de entorno y nunca en el código; `android/firma-esperada.txt` con la huella del certificado publicado. No crear claves nuevas sin `NEW_KEYSTORE=1`.
- Compatibilidad: `tests/fixtures/` tiene la versión 1.0.0 y copias reales hechas con ella; las pruebas de `tests/e2e/regresiones.test.mjs` deben seguir pasando.
