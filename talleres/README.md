# Del taller a tu teléfono: dos apps personales

| App | Taller | APK |
|---|---|---|
| **Mi fichero de trabajos a medida** | Crea tu archivo de medidas y especificaciones | `dist/fichero-1.0.0.apk` (paquete `com.talleres.mifichero`) |
| **Mi plan de cortes** | Planea tus cortes y aprovecha el material | `dist/cortes-1.0.0.apk` (paquete `com.talleres.miplandecortes`) |

Las dos apps funcionan sin internet, sin cuentas y sin servidores. Guardan todo en el teléfono, generan hojas imprimibles o PDF y permiten **Guardar una copia** y **Recuperar una copia** para pasar los datos a otro teléfono.

> **Estado: APK compilado y firmado, sin probar todavía en un teléfono.** La interfaz y la lógica se probaron en Chromium (ver «Qué se probó»). Falta instalar los APK en un Android real y recorrer la lista de «Qué queda pendiente».

---

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
- **Agregar lo nuevo:** suma solo lo que no existe y no modifica nada de lo que ya está en el teléfono.
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

```bash
cd talleres
npm install            # solo fuentes de desarrollo; Playwright se usa el del sistema
npm test               # 32 pruebas unitarias
npm run test:e2e       # 9 recorridos en Chromium (necesita Playwright + Chromium)
npm run serve          # http://127.0.0.1:8080/fichero/  y  /cortes/
```

## 4. Compilar los APK

En Ubuntu o Debian:

```bash
sudo apt-get install -y openjdk-17-jdk android-sdk-platform-23 aapt dalvik-exchange zipalign apksigner
cd talleres
KS_PASS='una-clave-larga' npm run build:apk
```

- La versión sale de `package.json` (`1.0.0` → `versionCode 10000`). Súbela en cada entrega.
- **Clave de firma:**
  - La primera compilación crea `android/keystore/talleres.jks`. No se versiona.
  - Android solo instala una actualización encima, conservando los datos, si está firmada con **la misma clave** y lleva el mismo paquete. Guarda la clave y su contraseña en un lugar seguro.
  - Los APK de `dist/` de esta entrega están firmados con una clave **de prueba**. Antes de entregarlos a participantes, compila con tu propia clave y conserva siempre esa misma.

**Instalar en un teléfono:**
1. Copia el `.apk` al teléfono.
2. Ábrelo y acepta «Instalar apps de origen desconocido» para el administrador de archivos o el navegador.
3. Toca Instalar.

## 5. Qué está terminado, qué se probó y qué queda pendiente

### Terminado
- Las dos apps completas en su alcance inicial, con su contenedor Android y el script de compilación.
- Los dos APK firmados en `dist/`.
- Ejemplos del taller: «Entre Hilos» (cortinas) y «Papel y Forma» (cartón). Los datos de ejemplo quedan separados de los reales.
- Guías, prompts, secuencias de 90 minutos y presentaciones en `docs/`, como borrador.

### Probado automáticamente
Las pruebas están en `tests/` y pasan todas.

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
