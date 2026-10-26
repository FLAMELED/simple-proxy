# Mi TCL

App Android personal para controlar una TV **TCL 65C6K (Google TV)** desde un Xiaomi:

- **Mando por WiFi** con el protocolo de Google TV: cruceta o **touchpad**, volumen, inicio, atrás,
  ajustes, entrada y un menú «Más» con canales, números y control de reproducción.
- **Teclado**: escribe en los buscadores de la TV con el teclado del móvil.
- **Botones de volumen del móvil** controlan la TV con la app abierta; **agitar para silenciar**.
- **App en pantalla**: muestra qué app está abierta en la TV.
- **Apps**: accesos a todas las apps de la TV, ordenables y con favoritas (★) en el mando.
- **Escenas** y **horarios**; **temporizador de apagado** rápido (15 min a 2 h).
- **Widgets**: mando 4×2, encendido 1×1 y apps favoritas 4×1.
- **Ajustes rápidos**: botón de encendido en la cortina de notificaciones.
- **Notificación de control** (también en la pantalla de bloqueo) y **accesos directos** en el icono.
- **Pausa al recibir una llamada** y reanudación al colgar.
- **Reconexión automática**, asistente de primer uso y colores del sistema (Material You) opcionales.
- **Infrarrojo** como respaldo para encender la TV si no responde por WiFi.

## Instalar

Cada push a `tcl-remote/` compila el APK en GitHub Actions y lo publica en la release
`mi-tcl-latest` del repositorio. Descarga `MiTCL.apk` desde el móvil y ábrelo (Android pedirá
permiso para instalar apps de origen desconocido).

## Primer uso

Al abrir la app por primera vez, un asistente busca la TV en la WiFi y pide el código de 6
caracteres que aparece en la pantalla de la TV.

## Compilar en local

Requiere Android SDK (Android Studio): `./gradlew assembleRelease`.

`app/personal.keystore` es una clave de firma solo para esta app personal, incluida para que las
actualizaciones se instalen encima sin desinstalar.
