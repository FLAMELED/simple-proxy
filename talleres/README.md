# Del taller a tu teléfono: dos apps personales

| App | Taller | APK |
|---|---|---|
| **Mi fichero de trabajos a medida** | Crea tu archivo de medidas y especificaciones | `dist/fichero-1.1.0.apk` (paquete `com.talleres.mifichero`) |
| **Mi plan de cortes** | Planea tus cortes y aprovecha el material | `dist/cortes-1.1.0.apk` (paquete `com.talleres.miplandecortes`) |

Las dos apps funcionan sin internet, sin cuentas y sin servidores. Guardan todo en el teléfono, generan hojas imprimibles o PDF y permiten **Guardar una copia** y **Recuperar una copia** para pasar los datos a otro teléfono.

> **Estado: APK compilado y firmado, sin probar todavía en un teléfono.** La interfaz y la lógica se probaron en Chromium (ver «Qué se probó»). Falta instalar los APK en un Android real y recorrer la lista de «Qué queda pendiente».

---

Dónde se guardan los datos, uso sin internet y cómo funcionan las copias: [docs/datos-y-copias.md](docs/datos-y-copias.md).

## 1. Decisiones de alcance y tecnología

**Por qué una app web local dentro de un APK nativo propio.**
- La interfaz está hecha con HTML, CSS y JavaScript sin framework. La misma app se prueba de forma automática en Chromium y se adapta con facilidad en los talleres.
- El APK es un contenedor Java pequeño (`android/src/taller/shell/`). Abre la interfaz en un WebView con el origen fijo `https://appassets.androidplatform.net`, servido desde el propio APK. Al tener un origen estable, IndexedDB guarda los datos en el teléfono y los conserva al cerrar la app y al instalar versiones nuevas.
- El APK **no pide permiso de internet**. Lo que la interfaz intente cargar desde afuera se bloquea.
- Lo que un WebView no hace solo lo resuelve el contenedor:
  - Cámara y galería, con `onShowFileChooser` y un `ContentProvider` propio para la foto.
  - Guardar la copia donde la persona elija (Descargas, Drive…), con el selector del sistema (`ACTION_CREATE_DOCUMENT`).
  - Imprimir o guardar en PDF, con `PrintManager`.
  - El botón Atrás.
- **Por qué no Capacitor, Cordova ni Gradle:** en este entorno `dl.google.com` está bloqueado y no se puede descargar el SDK de Android. El APK se compila con paquetes de Ubuntu (`android.jar` API 23, `aapt`, `dx`, `zipalign` y `apksigner`) mediante `android/build.sh`. El resultado es un APK normal: `minSdk 24` (Android 7) y `targetSdk 34`, con `resources.arsc` sin comprimir y alineado. Si más adelante se quiere publicar en Google Play, la interfaz se puede llevar sin cambios a un proyecto de Android Studio. Habría que subir `targetSdk` y firmar con la clave de Play.

**Almacenamiento.** IndexedDB guarda clientes, proyectos, fichas con versiones y fotos (como `Blob`), plantillas y ajustes. Cada actualización de la app sube la versión de la base y agrega migraciones sin borrar nada.

**Copias.** Cada copia es un único archivo `.zip`:
- `copia.json`: todos los registros con su historial.
- `fotos/<id>.jpg`: cada foto, con el mismo identificador que usan las fichas.
- `LEEME.txt`: instrucciones para recuperarla.

Cada archivo dentro del zip lleva su CRC, así una copia dañada se detecta antes de tocar nada. Al recuperar, primero se muestra qué contiene la copia y qué pasará:
- **Agregar lo nuevo:** Agrega registros que no existen en este teléfono. No actualiza los que ya existen, aunque la copia contenga cambios más recientes. Muestra cuántos registros se agregan y cuántos se omiten, y no agrega nada que quede sin su relación (en Fichero: proyecto sin cliente, ficha sin proyecto o foto que ninguna ficha usa).
- **Reemplazar todo:** pide una segunda confirmación y guarda internamente el estado anterior. Desde la misma pantalla se ofrece **Deshacer**.

**Cálculo de cortes.** El método es una guillotina con mejor ajuste por área (`cortes/src/engine.js`):
- Es determinista: con los mismos datos sale el mismo plano.
- Calcula con números enteros (milésimas de la unidad).
- Prueba 15 combinaciones de orden y de regla de división y elige la que acomoda más piezas con menos planchas.

Un verificador independiente (`cortes/src/verify.js`) revisa cada plano:
- que ninguna pieza se salga del área útil;
- que no haya solapes y que se respete la separación entre piezas;
- que las medidas sean las indicadas y los giros, los permitidos;
- que las cantidades estén completas (colocadas + pendientes);
- que todo se pueda separar con cortes de lado a lado.

La app nunca llama «óptimo» a un plano y explica sus condiciones en «Cómo se calculó».

## 2. Pantallas

**Mi fichero**
- Inicio con buscador por cliente, proyecto o ficha, y proyectos recientes.
- Clientes.
- Proyecto, con sus fichas.
- Ficha, con fotos, medidas, especificaciones y observaciones.
- Edición. Mientras se escribe, todo se guarda como borrador; «Guardar versión N» crea la versión nueva.
- Historial, con lo que cambió en cada versión.
- Hoja de trabajo, de una ficha o de todo el proyecto.
- Plantillas editables. Vienen incluidas cortina, mueble tapizado y prenda a medida.
- Copias y ajustes: nombre del negocio y decimales con punto o coma.

**Mi plan de cortes**
- Proyectos.
- Proyecto, en tres secciones: 01 Material, 02 Piezas y 03 Notas.
- Plano: resumen; aviso de pendientes con su motivo; verificación; zoom; cada plancha a escala con piezas A1, A2… y sobrantes S1.1…; leyenda; y «Cómo se calculó».
- Cómo funciona.
- Copias.

## 3. Ejecutar y probar

No hace falta `npm install`: las fuentes vienen incluidas en `shared/fonts/` y no hay dependencias. Basta Node 20 o más nuevo. Para las pruebas en navegador hace falta Playwright con Chromium.

```bash
cd talleres
npm test               # 50 pruebas unitarias
npm run test:e2e       # 17 recorridos en Chromium (necesita Playwright + Chromium)
npm run serve          # http://127.0.0.1:8080/fichero/  y  /cortes/
```

## 4. Compilar los APK

En Ubuntu o Debian:

```bash
sudo apt-get install -y openjdk-17-jdk android-sdk-platform-23 aapt dalvik-exchange zipalign apksigner
cd talleres
KS_PASS='la-contraseña-de-tu-clave' KEYSTORE=/ruta/segura/talleres.jks npm run build:apk
```

- **Versión:** sale de `package.json` (`1.1.0` → `versionCode 10100`). Súbela en cada entrega: Android solo actualiza a un versionCode mayor.
- **Contraseña:** nunca va en el código. `build.sh` la pide en la variable `KS_PASS` y se detiene si falta.
- **Clave de firma:**
  - **No se versiona ni va en el ZIP del código** (`*.jks` está en `.gitignore`).
  - Si `build.sh` no encuentra la clave, se detiene en vez de crear otra. Solo crea una nueva con `NEW_KEYSTORE=1`, y eso es solo para una app nueva: no actualiza las instaladas.
- **Comprobación de firma:** `android/firma-esperada.txt` guarda la huella SHA-256 del certificado de las versiones publicadas. No es secreta. Después de firmar, `build.sh` compara la huella y **borra el APK si no coincide**, para no repartir uno que obligaría a desinstalar.

### Actualizar de 1.0.0 a 1.1.0

Los APK 1.1.0 de `dist/` están firmados con **la misma clave** que los 1.0.0. Es el mismo certificado, `aaef3cd2…25b1c7`, comprobado con `apksigner verify --print-certs`. Usan el mismo paquete y un versionCode mayor (10100 > 10000). Por eso Android los instala **encima**, sin desinstalar, y conserva los datos.

1. **Antes de actualizar, guarda una copia por seguridad:** Copias → «Guardar una copia» → Drive o correo. En Fichero, marca «Incluir también los datos de ejemplo» si quieres conservar las prácticas.
2. Abre `fichero-1.1.0.apk` o `cortes-1.1.0.apk` en el teléfono y toca **Actualizar**. No desinstales antes.
3. Abre la app: deben estar tus fichas o proyectos. En Cortes, los planos guardados con la 1.0.0 aparecen como «plano desactualizado», porque cambió la forma de calcular la huella del plano: tócalos y genera el plano de nuevo.
4. Si Android dice que la app «no se instaló» o que hay un conflicto de paquete, **no desinstales**. Significa que el APK no está firmado con la misma clave. Primero guarda una copia desde la app vieja; luego desinstala, instala la nueva y usa «Recuperar una copia».

Las copias ZIP hechas con la 1.0.0 se recuperan en la 1.1.0. Hay copias reales en `tests/fixtures/` y una prueba que lo comprueba.

**Instalar en un teléfono:**
1. Copia el `.apk` al teléfono.
2. Ábrelo y acepta «Instalar apps de origen desconocido» para el administrador de archivos o el navegador.
3. Toca Instalar.

## 5. Cambios de la versión 1.1.0

- **Cortes, plano vigente.** La huella del plano incluye todos los datos que cambian el resultado, también el sobrante mínimo. Si cambia cualquiera, el plano guardado se marca desactualizado.
- **Cortes, unidades.** Cambiar de unidad convierte todas las longitudes, con confirmación. No toca cantidades, conserva lo pendiente y deja el plano desactualizado. Ida y vuelta no pierde precisión.
- **Cortes, precisión.** El motor y el verificador calculan con enteros exactos (0,1 µm), sin tolerancias.
- **Ambas, restauración atómica.** «Reemplazar todo» y «Deshacer» son una sola transacción de IndexedDB: si algo falla, quedan los datos anteriores.
- **Ambas, «Agregar lo nuevo».** Explica que no actualiza lo que existe y muestra cuántos registros se agregan y cuántos se omiten. En Fichero no agrega nada que quede sin su relación.
- **Fichero, copias sin el ejemplo.** Incluyen igual el cliente o el proyecto que necesita un registro real.
- **Compilación.** Sin contraseña en el código; comprueba que la firma sea la misma de las versiones anteriores.

## 6. Qué está terminado, qué se probó y qué queda pendiente

### Terminado
- Las dos apps completas en su alcance inicial, con su contenedor Android y el script de compilación.
- Los APK firmados en `dist/`: 1.1.0 (actual) y 1.0.0 (anterior, para probar la actualización encima).
- Ejemplos del taller: «Entre Hilos» (cortinas) y «Papel y Forma» (cartón). Los datos de ejemplo quedan separados de los reales.
- Guías, prompts, secuencias de 90 minutos y presentaciones en `docs/`, como borrador.

### Probado automáticamente
Las pruebas están en `tests/` y pasan todas.

- **Nuevo en 1.1.0** (`tests/unit/cortes-units.test.mjs`, `tests/unit/fichero-merge.test.mjs`, `tests/e2e/regresiones.test.mjs`):
  - el caso 100 × 100, pieza de 60 × 60, separación 0,3 y sobrante 5 → 50, en motor e interfaz;
  - conversión 100 cm → 1000 mm y 25,4 mm → 1 pulg; ida y vuelta ×10; datos pendientes y cantidades;
  - una pieza que cabe justo sigue cabiendo en mm y en pulgadas, con 500 proyectos al azar en las tres unidades;
  - fallos inducidos (error y cancelación) en «Reemplazar todo» y «Deshacer» de ambas apps, sin pérdida de datos;
  - vista previa de «Agregar lo nuevo» con el texto exacto y los conteos; combinación sin registros sueltos;
  - datos de la 1.0.0 abiertos por la 1.1.0 en el mismo origen, y copias ZIP reales de la 1.0.0 recuperadas.

- **Unitarias (32):**
  - ZIP: ida y vuelta, detección de daño y entradas comprimidas con *deflate*.
  - Números: vacío ≠ cero, coma o punto, y casos ambiguos como `1.250` en cm.
  - Versiones e historial legible (`180 cm → 182 cm`).
  - Búsqueda sin acentos.
  - Copias: combinar nunca sobrescribe.
  - Motor de cortes: ejemplo verificado, falta de material, pieza más grande que la plancha, giro prohibido o permitido, separación, margen exacto, mm y pulgadas, sobrantes, validación, determinismo, verificador que detecta errores y guillotina.
  - **500 proyectos al azar**, todos verificados.
- **De extremo a extremo en Chromium (9 recorridos):**
  - Caso «Entre Hilos» completo:
    - dos ventanas, una foto, un acabado y un número ambiguo rechazado;
    - corrección a la versión 2, historial y hoja de trabajo en PDF.
  - **Cerrar el navegador y volver a abrirlo:**
    - siguen las versiones, el borrador sin guardar y la foto;
    - la copia se recupera en un perfil vacío con fichas, fotos e historial.
  - «Agregar lo nuevo» conserva la versión 3 local; «Reemplazar» y luego «Deshacer».
  - Un archivo que no es una copia da un mensaje claro y no cambia nada.
  - El ejemplo se excluye de la copia y se quita sin tocar lo real.
  - Cortes:
    - con datos que faltan, la app los pide;
    - una pieza «no girar» que no cabe queda pendiente con su motivo y, al permitir el giro, entra;
    - la ampliación del plano funciona y el plano se imprime en PDF;
    - todo sigue igual al reabrir;
    - con una plancha, faltan piezas;
    - la copia va y vuelve sin duplicar.
  - **A 320 px de ancho:** sin desplazamiento horizontal y sin botones de menos de 40 px.
- **APK:** `apksigner verify` es correcto, `zipalign -c` también, y `aapt dump badging` muestra el paquete, las versiones y los íconos.

### Pendiente (no comprobado aún)
- [ ] **Actualizar en un teléfono real** de 1.0.0 a 1.1.0 instalando encima, y comprobar que siguen fichas, fotos y proyectos. La firma y el versionCode se verificaron con `apksigner` y `aapt`, pero la instalación no se probó en un dispositivo.
- [ ] El diálogo de conversión de unidades y la vista previa de «Agregar lo nuevo» en una pantalla de teléfono.
- [ ] **Instalar los APK en un Android real (7 a 15) y probar:**
  - que los datos sigan al cerrar la app y al reiniciar el teléfono;
  - que los datos sigan al instalar una versión nueva encima;
  - la cámara (`capture`) y la galería;
  - «Guardar una copia» en Descargas o Drive, y recuperarla en **otro** teléfono;
  - Imprimir → «Guardar como PDF»;
  - el botón Atrás.
- [ ] Revisar en el teléfono el tamaño de letra del plano y la ampliación con dos dedos.
- [ ] Caso límite de Android: si el sistema cierra la app mientras la cámara está abierta, la foto puede perderse. Habría que repetir la toma.
- [ ] Compilar con la clave definitiva antes de repartir.
- [ ] Validar los materiales del taller con una prueba piloto (tiempos reales de la secuencia de 90 min).
- Fuera de alcance por ahora: sincronización entre dispositivos, piezas no rectangulares, más de un material por proyecto y publicación en Google Play.
