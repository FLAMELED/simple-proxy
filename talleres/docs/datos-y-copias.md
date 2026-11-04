# Dónde se guardan los datos, uso sin internet y copias

Este documento describe lo que hace el código de la versión 1.1.0.

- **Comprobado en Chromium con pruebas automáticas:** el guardado, la recuperación y las copias.
- **Todavía no comprobado en un teléfono real:** lo marcado con *(sin probar en teléfono)*.

## 1. Dónde se guardan los datos

Cada app guarda todo en el teléfono, en una base de datos **IndexedDB** de su propio WebView. No hay servidor, ni cuenta, ni nube.

| App | Base de datos | Qué guarda |
|---|---|---|
| Mi fichero | `mi-fichero` | `clients`, `projects`, `sheets` (cada ficha con todas sus versiones y el borrador), `photos` (cada foto como `Blob` JPEG de hasta 1600 px), `templates` y `meta` (ajustes, fecha de la última copia y estado previo para «Deshacer») |
| Mi plan de cortes | `mi-plan-de-cortes` | `projects` (material, piezas y el último plano generado con su verificación) y `meta` (ajustes, fecha de la última copia y estado previo para «Deshacer») |

**Ubicación física.** Los datos quedan en el almacenamiento privado de la app, dentro de `/data/data/<paquete>/app_webview/…/IndexedDB/`:

| App | Paquete |
|---|---|
| Mi fichero | `com.talleres.mifichero` |
| Mi plan de cortes | `com.talleres.miplandecortes` |

La ruta exacta depende de la versión de WebView. Otras apps no pueden leer ese almacenamiento, y no se ve desde el administrador de archivos.

**Origen fijo.** La interfaz se abre siempre desde `https://appassets.androidplatform.net/`. Esa dirección no sale a internet: el contenedor (`android/src/taller/shell/MainActivity.java`) sirve los archivos desde dentro del APK. Al tener siempre la misma dirección, la base de datos es siempre la misma.

**Cuándo se conservan:**
- al cerrar la app y al apagar el teléfono *(sin probar en teléfono)*;
- al instalar una versión nueva encima, siempre que tenga **el mismo paquete y la misma clave de firma**. La base se actualiza con migraciones que solo agregan, nunca borran.

**Cuándo se pierden:**
- al desinstalar la app;
- con «Borrar datos» o «Borrar almacenamiento» en los ajustes de Android.

`android:allowBackup="false"`: el respaldo automático de Google no copia estos datos. **La única copia es la que guarda la persona** (sección 3).

**Guardado automático:**
- **Fichero:**
  - Clientes, proyectos, ajustes y plantillas se guardan medio segundo después de cada cambio.
  - En una ficha, todo lo que se escribe se guarda como **borrador** en el teléfono. «Guardar versión N» lo convierte en una versión nueva, sin borrar las anteriores.
  - Al salir de la pantalla o al minimizar la app, se guarda lo pendiente.
- **Cortes:** el proyecto se guarda medio segundo después de cada cambio. El plano se guarda al tocar «Generar plano», junto con una huella de los datos; si después cambias algo, la app avisa que el plano ya no coincide.

## 2. ¿Funcionan sin internet?

**Sí, en el uso diario.** Las dos apps se pueden usar en modo avión.

- **Sin permiso de internet:** el `AndroidManifest` no declara el permiso `INTERNET`.
- **Todo viene dentro del APK:** HTML, JavaScript, estilos, fuentes (Fraunces y Source Sans 3), íconos y el ejemplo. La foto del ejemplo es un dibujo que se genera en el propio teléfono.
- **Lo externo se bloquea:** si la interfaz intentara cargar algo de otro sitio, el contenedor responde «no encontrado».
- **Sin IA dentro:** las apps no usan ninguna API de IA.

Lo único que necesita internet es **la práctica del taller con una IA externa** (copiar un prompt en Claude u otra), y eso ocurre fuera de las apps.

*(sin probar en teléfono: comprobar en modo avión)*

## 3. Copias: exportar y restaurar

### Formato
Una copia es **un solo archivo `.zip`**. Se llama, por ejemplo, `Mi fichero - copia 2026-11-04 1642.zip` o `Mi plan de cortes - copia 2026-11-04 1642.zip`.

**Contenido de una copia de Mi fichero:**
```
copia.json            clientes, proyectos, fichas con TODAS sus versiones, plantillas
fotos/foto-….jpg      cada foto, con el mismo identificador que usan las fichas
LEEME.txt             cómo recuperarla
```

**Contenido de una copia de Mi plan de cortes:**
```
copia.json            proyectos con material, piezas y último plano
LEEME.txt
```

`copia.json` lleva:
- `kind`: el tipo de copia, para no confundir una app con la otra;
- `schema`: la versión del formato;
- `createdAt`: la fecha;
- `includesDemo`: si trae los datos de ejemplo.

Cada archivo dentro del zip lleva su **CRC**, que permite detectar una copia dañada antes de tocar nada. El código está en `shared/zip.js`, `fichero/src/backup.js` y `cortes/src/backup.js`.

### Exportar: «Guardar una copia»
1. Copias → **Guardar una copia**.
   - Los datos de ejemplo quedan **fuera** salvo que se marque «Incluir también los datos de ejemplo».
2. La app arma el `.zip` en el teléfono. En Android, el contenedor abre el selector del sistema para elegir dónde guardarlo: Descargas, Drive, una tarjeta…
   - Por dentro, los bytes pasan en trozos de 768 KB y se usa `ACTION_CREATE_DOCUMENT`.
   - En un navegador común, en cambio, se descarga.
3. Mensaje de confirmación. En el fichero dice cuántas fichas, versiones y fotos se guardaron; en cortes, cuántos proyectos. Si se cancela: «No se guardó la copia».
4. En Inicio, el fichero recuerda guardar una copia cuando hay fichas propias y la última copia tiene 7 días o más, o nunca se hizo.

### Restaurar: «Recuperar una copia»
1. Copias → **Recuperar una copia** → elegir el `.zip`.
2. La app **lee y comprueba** la copia sin cambiar nada:
   - Si no es un zip, o es una copia de la otra app: «Este archivo no es una copia de…».
   - Si un CRC no coincide: «La copia está dañada…».
   - Si viene de una versión más nueva: pide actualizar la app.
   - Si falta alguna foto citada en las fichas, lo avisa.
3. Muestra qué contiene la copia (fecha, clientes, proyectos, fichas, versiones y fotos) y qué pasaría:
   - **Agregar lo nuevo:** «Agrega registros que no existen en este teléfono. No actualiza los que ya existen, aunque la copia contenga cambios más recientes.»
     - La vista previa muestra, por tipo de registro, cuántos se agregan y cuántos se omiten por existir ya.
     - En Fichero tampoco agrega lo que quedaría sin su relación: un proyecto sin su cliente, una ficha sin su proyecto o una foto que ninguna ficha usa. Esos casos se cuentan aparte como «sin relación».
     - Todo se agrega en una sola transacción: o entran todos los registros, o ninguno.
     - No es una sincronización: nunca sustituye versiones existentes.
   - **Reemplazar todo:**
     - Pide una segunda confirmación.
     - Antes de tocar nada, valida la copia (identificadores y relaciones) y prepara una copia del estado actual para poder deshacer.
     - Luego, en **una sola transacción** de IndexedDB, borra los datos, inserta la copia y guarda el estado anterior. Si falla cualquier escritura, IndexedDB cancela la transacción completa y quedan los datos de antes.
     - En Copias aparece **«Deshacer y volver a como estaba»**. Deshacer también es una sola transacción; el estado guardado se borra dentro de ella, así que solo desaparece si la restauración terminó bien.
     - Si la copia tiene registros sin su relación, «Reemplazar todo» no se ofrece; solo «Agregar lo nuevo» con lo que esté completo.
   - Si el teléfono está vacío, solo ofrece «Agregar lo nuevo».
4. Al recuperar se conservan las fichas con todas sus versiones e historial, las fotos y su relación con cada ficha, las plantillas y los planos de corte.

### Pasar a otro teléfono
1. En el teléfono viejo: **Guardar una copia** en Drive o en el correo.
2. En el teléfono nuevo: instalar el mismo APK.
3. Abrir la app → Copias → **Recuperar una copia**.

### Qué está comprobado
Las pruebas automáticas (`tests/e2e/`) comprueban:
- que se guarda una copia y se recupera en un perfil vacío, con fichas, foto, 3 versiones e historial;
- que «Agregar lo nuevo» conserva la versión local más nueva y cuenta agregados y omitidos;
- que «Reemplazar» se puede deshacer;
- que un fallo inducido a mitad de «Reemplazar todo» o de «Deshacer» deja todos los datos anteriores y el estado guardado para deshacer;
- que las copias ZIP hechas con la versión 1.0.0 se recuperan completas, y que los datos guardados por la 1.0.0 siguen al abrir la 1.1.0;
- que un archivo que no es una copia da un mensaje claro y no cambia nada;
- que el ejemplo queda fuera de la copia;
- que en cortes la copia va y vuelve sin duplicar.

*(sin probar en teléfono: el selector de Android, guardar en Drive y recuperar en un segundo teléfono)*

## 4. Unidades en Mi plan de cortes

- **Al cambiar la unidad de un proyecto, la app convierte todas las longitudes:** material, piezas, separación de corte, margen y sobrante mínimo. Usa 1 pulgada = 25,4 mm y 1 cm = 10 mm. Antes muestra un ejemplo («70 cm → 700 mm») y pide confirmación.
- **Las cantidades de piezas y planchas no cambian.** Lo pendiente sigue pendiente.
- **El plano guardado queda desactualizado** y hay que generarlo de nuevo.
- **Los valores se muestran con 3 decimales,** pero el proyecto guarda el valor exacto en mm. Por eso cm → pulg → cm vuelve exactamente al número original, y una pieza que cabía justo sigue cabiendo.
- **El motor y el verificador calculan con enteros exactos** (0,1 µm), sin tolerancias.
- **El plano se marca desactualizado si cambia cualquier dato que afecta el resultado,** también el sobrante mínimo.
