# Mi TCL

App Android personal para controlar una TV **TCL 65C6K (Google TV)** desde un Xiaomi:

- **Mando por WiFi** con el protocolo de Google TV (el mismo de la app oficial): cruceta, volumen,
  canales, inicio, atrás, ajustes, entrada y multimedia, con repetición al mantener pulsado.
- **Abrir apps** directamente (YouTube, Netflix, Prime Video, Disney+, Max, Spotify o las que añadas).
- **Escenas**: secuencias de pasos (encender, esperar, abrir app, pulsar teclas, apagar…).
- **Horarios**: ejecutar una escena a una hora y en unos días concretos.
- **Widget** de pantalla de inicio: encendido, volumen, silencio y dos escenas.
- **Infrarrojo** como respaldo para encender la TV si no responde por WiFi.

## Instalar

Cada push a `tcl-remote/` compila el APK en GitHub Actions y lo publica en la release
`mi-tcl-latest` del repositorio. Descarga `MiTCL.apk` desde el móvil y ábrelo (Android pedirá
permiso para instalar apps de origen desconocido).

## Primer uso

1. TV y móvil en la misma WiFi.
2. *Ajustes › Buscar en la red* (o escribe la IP de la TV) y pulsa **Vincular**.
3. Escribe el código de 6 caracteres que aparece en la TV.

## Compilar en local

Requiere Android SDK (Android Studio): `./gradlew assembleRelease`.

`app/personal.keystore` es una clave de firma solo para esta app personal, incluida para que las
actualizaciones se instalen encima sin desinstalar.
