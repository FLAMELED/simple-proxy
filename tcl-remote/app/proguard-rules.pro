# Código de la app: es pequeño, así que se conserva entero para no arriesgar nada
# (receptores, servicios, workers y widgets se instancian por nombre desde el sistema).
-keep class com.mdl.tclremote.** { *; }

# Nombres de clase útiles en los registros de errores.
-keepattributes SourceFile,LineNumberTable
