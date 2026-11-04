#!/usr/bin/env bash
# Compila un APK firmado sin Android Studio ni Gradle.
# Uso: bash android/build.sh fichero|cortes
# Requiere (Ubuntu/Debian): openjdk, android-sdk-platform-23, aapt, dalvik-exchange, zipalign, apksigner.
#   sudo apt-get install -y android-sdk-platform-23 aapt dalvik-exchange zipalign apksigner
set -euo pipefail
APP="${1:?Indica la app: fichero o cortes}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
VNAME="$(node -p "require('$ROOT/package.json').version")"
IFS=. read -r MA MI PA <<< "$VNAME"; VCODE=$((MA * 10000 + MI * 100 + PA))

case "$APP" in
  fichero) PKG="com.talleres.mifichero"; LABEL="Mi fichero"; COLOR="#1630a8"; BG="#fbf8f1" ;;
  cortes)  PKG="com.talleres.miplandecortes"; LABEL="Mi plan de cortes"; COLOR="#232323"; BG="#f6f1e4" ;;
  *) echo "App desconocida: $APP"; exit 1 ;;
esac

ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
KEYSTORE="${KEYSTORE:-$HERE/keystore/talleres.jks}"
OUT="$HERE/out/$APP"
WWW="$ROOT/build/$APP"
[ -f "$WWW/index.html" ] || { echo "Falta $WWW. Ejecuta antes: node scripts/build-web.mjs $APP"; exit 1; }
# La contraseña de la clave nunca va en el código: se pasa en la variable KS_PASS.
[ -n "${KS_PASS:-}" ] || { echo "Falta la contraseña de la clave de firma: KS_PASS='…' bash android/build.sh $APP"; exit 1; }
# Huella del certificado con el que se firmaron las versiones publicadas. Android solo instala
# una actualización encima (conservando los datos) si la firma coincide.
EXPECTED_CERT="${EXPECTED_CERT_SHA256:-$(tr -d ' \n' < "$HERE/firma-esperada.txt" 2>/dev/null || true)}"
export JAVA_TOOL_OPTIONS=""

rm -rf "$OUT"; mkdir -p "$OUT/classes" "$OUT/assets" "$OUT/res/values" "$ROOT/dist"
cp -r "$HERE/res/$APP/." "$OUT/res/"
cat > "$OUT/res/values/styles.xml" <<XML
<resources>
  <style name="AppTheme" parent="@android:style/Theme.Material.Light.NoActionBar">
    <item name="android:windowBackground">@color/fondo</item>
    <item name="android:statusBarColor">$COLOR</item>
    <item name="android:colorAccent">$COLOR</item>
  </style>
  <color name="fondo">$BG</color>
</resources>
XML
sed -e "s/@PKG@/$PKG/g" -e "s/@VCODE@/$VCODE/g" -e "s/@VNAME@/$VNAME/g" -e "s/@LABEL@/$LABEL/g" -e "s/@COLOR@/$COLOR/g" \
  "$HERE/AndroidManifest.template.xml" > "$OUT/AndroidManifest.xml"
cp -r "$WWW" "$OUT/assets/www"

echo "→ Compilando Java"
javac -nowarn -Xlint:-options --release 8 -cp "$ANDROID_JAR" -d "$OUT/classes" $(find "$HERE/src" -name '*.java')
echo "→ Convirtiendo a DEX"
dalvik-exchange --dex --min-sdk-version=24 --output="$OUT/classes.dex" "$OUT/classes"
echo "→ Empaquetando recursos y la interfaz"
aapt package -f -M "$OUT/AndroidManifest.xml" -S "$OUT/res" -A "$OUT/assets" -I "$ANDROID_JAR" -F "$OUT/sin-firmar.apk"
(cd "$OUT" && aapt add sin-firmar.apk classes.dex > /dev/null)
zipalign -f -p 4 "$OUT/sin-firmar.apk" "$OUT/alineado.apk"

if [ ! -f "$KEYSTORE" ]; then
  if [ "${NEW_KEYSTORE:-}" != "1" ]; then
    echo "No se encontró la clave de firma en $KEYSTORE."
    echo "Sin la misma clave, Android no instala la actualización encima y obliga a desinstalar (se pierden los datos del teléfono)."
    echo "Usa KEYSTORE=/ruta/a/la/clave.jks. Solo para una app nueva, crea otra con NEW_KEYSTORE=1."
    exit 1
  fi
  echo "→ Creando una clave de firma NUEVA en $KEYSTORE (NEW_KEYSTORE=1). Las apps firmadas con ella no actualizan las anteriores."
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -keystore "$KEYSTORE" -storepass "$KS_PASS" -keypass "$KS_PASS" -alias talleres \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Talleres, O=Talleres con IA" > /dev/null 2>&1
  EXPECTED_CERT=""
fi
echo "→ Firmando"
DEST="$ROOT/dist/$APP-$VNAME.apk"
apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --ks-key-alias talleres --out "$DEST" "$OUT/alineado.apk"
rm -f "$DEST.idsig"
apksigner verify "$DEST"
CERT="$(apksigner verify --print-certs "$DEST" | sed -n 's/^Signer #1 certificate SHA-256 digest: //p')"
echo "→ Certificado: $CERT"
if [ -n "$EXPECTED_CERT" ] && [ "$CERT" != "$EXPECTED_CERT" ]; then
  rm -f "$DEST"
  echo "✗ La firma NO coincide con la de las versiones anteriores ($EXPECTED_CERT). Se borró el APK: no actualizaría las instaladas."
  exit 1
fi
[ -n "$EXPECTED_CERT" ] && echo "✓ Misma firma que las versiones anteriores: se puede instalar encima conservando los datos."
echo "→ Paquete $PKG · versión $VNAME · versionCode $VCODE"
echo "✓ $DEST ($(du -h "$DEST" | cut -f1))"
