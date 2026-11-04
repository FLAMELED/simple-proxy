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
KS_PASS="${KS_PASS:-cambia-esta-clave}"
OUT="$HERE/out/$APP"
WWW="$ROOT/build/$APP"
[ -f "$WWW/index.html" ] || { echo "Falta $WWW. Ejecuta antes: node scripts/build-web.mjs $APP"; exit 1; }
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
  echo "→ Creando clave de firma nueva en $KEYSTORE (guárdala: sin ella no se pueden instalar actualizaciones encima)"
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -keystore "$KEYSTORE" -storepass "$KS_PASS" -keypass "$KS_PASS" -alias talleres \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Talleres, O=Talleres con IA" > /dev/null 2>&1
fi
echo "→ Firmando"
DEST="$ROOT/dist/$APP-$VNAME.apk"
apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --ks-key-alias talleres --out "$DEST" "$OUT/alineado.apk"
rm -f "$DEST.idsig"
apksigner verify "$DEST"
echo "✓ $DEST ($(du -h "$DEST" | cut -f1))"
