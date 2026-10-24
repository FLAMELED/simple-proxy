#!/bin/sh
# Downloads the build-only tools into $BOLSILLO_TOOLS (default: ./.tools, git-ignored) and checks their hashes.
# None of these files end up inside the APK. A signing key is never stored in the repository:
# if $BOLSILLO_TOOLS/key.p12 is missing, a new one is generated (it will not match earlier releases).
set -eu
T=${BOLSILLO_TOOLS:-$(dirname "$0")/.tools}
mkdir -p "$T"
M=https://repo1.maven.org/maven2
get() { [ -f "$T/$1" ] || curl -fsSL -o "$T/$1" "$2"; echo "$3  $T/$1" | sha256sum -c -; }
get dx.jar          $M/com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar 1e4b645628e3bdb097b5331d669e177ef235a551582a8c646dbe36865e541907
get apksig.jar      $M/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar 9637078c0016244e4be0941836295365a7e2e5b164c59cb7885783c40460bfee
get android-all.jar $M/org/robolectric/android-all/10-robolectric-5803371/android-all-10-robolectric-5803371.jar a0ad701eedd47bdaefbac1c2cc80dd400c0adea3cccd8a3ad286f79da1ca294c
if [ ! -f "$T/key.p12" ]; then
  keytool -genkeypair -keystore "$T/key.p12" -storetype PKCS12 -storepass bolsillo -keypass bolsillo \
    -alias bolsillo -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Bolsillo Advance"
fi
