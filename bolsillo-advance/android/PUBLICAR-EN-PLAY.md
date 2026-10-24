# Preparar la publicación en Google Play

**Estado técnico:** el proyecto compila un **Android App Bundle** (`.aab`) con:
- `compileSdk` 36, `targetSdkVersion` 36 y `minSdkVersion` 24;
- `versionCode` y `versionName` tomados de `bolsillo-advance/version.json`.

Lo compila y lo prueba el workflow `.github/workflows/bolsillo-android.yml` (ver `audit/VERIFICACION-ANDROID.md`).

## 1. Qué cambió para API 36

| Cambio de la plataforma | Qué hace la app |
|---|---|
| Ventana de borde a borde obligatoria (API 35+) | El contenedor del WebView se rellena con los *insets* de las barras del sistema y del recorte de pantalla (`OnApplyWindowInsetsListener`). Las barras se ocultan con `WindowInsetsController` (API 30+). |
| `setStatusBarColor`/`setNavigationBarColor` ya no hacen nada (API 35+) | Eliminados. El color de fondo es el del tema o el del contenedor. |
| Gesto atrás predictivo: en API 36 ya no se llama a `onBackPressed` | `OnBackInvokedCallback` registrado en API 33+ y `android:enableOnBackInvokedCallback="true"`. `onBackPressed` solo queda para API 24–32. |
| Archivos `.js` servidos desde los *assets* | El MIME pasa a `application/javascript`, necesario para los Covered Files MPL separados. |
| `setDatabaseEnabled` obsoleto | Eliminado (IndexedDB no lo necesita). |
| Icono adaptativo (API 26+) | `mipmap-anydpi-v26/ic_launcher.xml` + primer plano. El icono de 512 px para la ficha está en `play/icon-512.png`. |

## 2. Clave de subida (la creas tú; nunca va al repositorio)

Play App Signing firma la app final. Tú firmas el `.aab` con una **clave de subida**:

```sh
keytool -genkeypair -keystore upload.jks -storetype PKCS12 -alias upload -keyalg RSA -keysize 4096 -validity 10000
```

Guárdala fuera del repositorio, con copia de seguridad.

**Compilar en tu ordenador** con Android Studio, o con el Android SDK y Gradle 8.14:

```sh
cd bolsillo-advance/android
BOLSILLO_KEYSTORE=/ruta/upload.jks BOLSILLO_KEYSTORE_PASSWORD=… BOLSILLO_KEY_ALIAS=upload BOLSILLO_KEY_PASSWORD=… \
  gradle bundleRelease     # -> app/build/outputs/bundle/release/app-release.aab
```

**Compilar en GitHub Actions:** define los secretos `BOLSILLO_UPLOAD_KEYSTORE_B64` (el `.jks` en base64), `BOLSILLO_KEYSTORE_PASSWORD`, `BOLSILLO_KEY_ALIAS` y `BOLSILLO_KEY_PASSWORD`. **Sin secretos**, el CI firma con una clave de prueba desechable (`key-kind.txt` dice `test`). **Ese `.aab` no se debe subir a Play.**

Compilar con el Android SDK implica aceptar su licencia (Android Software Development Kit License Agreement). Lo hace quien compila.

## 3. Antes de subir: lista de comprobación

- [ ] Compilar desde un **commit limpio**. Los avisos llevan la URL de ese commit, y `check_bundle.py --release` falla si hay cambios locales.
- [ ] Crear una etiqueta de la versión (p. ej. `git tag v1.1 <commit> && git push origin v1.1`) o publicar el código en un repositorio propio, para que la URL de los avisos no dependa de una rama.
- [ ] Probar en al menos un teléfono real (ver `audit/VERIFICACION-ANDROID.md` §4).
- [ ] **Política de privacidad** (obligatoria en Play). Debe cubrir que:
  - las tipografías se cargan desde Google Fonts, lo que envía la IP a Google;
  - no hay cuentas, anuncios ni analítica;
  - las partidas y las ROM se quedan en el teléfono;
  - las exportaciones van a Descargas.
- [ ] **Formulario de seguridad de los datos** coherente con la política. La app no recoge datos, pero hay una conexión a Google Fonts.
- [ ] **Clasificación de contenido** (cuestionario IARC).
- [ ] **Ficha:**
  - nombre y descripción sin "Pokémon", "Nintendo" ni "Game Boy" como marca del producto;
  - sin capturas de juegos comerciales;
  - sin prometer juegos.
  
  ⚖ Las políticas de Play sobre propiedad intelectual y emuladores exigen no facilitar ni promocionar ROMs.
- [ ] **Licencia del resto de la app** (Larger Work): decisión pendiente (`audit/PROPUESTA-MGBA.md` §5).
- [ ] Subir `versionCode` en `version.json` en cada envío.

## 4. Lo que **no** está hecho

- No hay cuenta de desarrollador ni ficha en Play. No se ha subido nada.
- No se ha probado en un teléfono físico.
- No se ha probado en API 24–35 (ver `audit/VERIFICACION-ANDROID.md`).
