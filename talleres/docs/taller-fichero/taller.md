# Taller 02 · Crea tu archivo de medidas y especificaciones

**Producto del participante:** «Mi fichero de trabajos a medida» instalado y configurado para su oficio, con un proyecto de fichas completas, guardadas y recuperables desde una copia.

**Antes de la sesión (facilitador):**
- Comprueba que el APK se instala en un teléfono Android de prueba.
- Prepara el enlace para descargar el APK y esta carpeta de materiales.
- Pide a cada participante que traiga:
  - un teléfono Android con al menos 100 MB libres;
  - los apuntes de un trabajo real (en papel, una foto o notas del teléfono);
  - una foto de referencia de ese trabajo.

## Secuencia de 90 minutos

| Min | Bloque | Qué pasa | Resultado visible |
|---|---|---|---|
| 0–8 | **Abrir** | Problema: apuntes dispersos, medidas sin unidad y «¿cuánto medía?». Se muestra la ficha terminada del ejemplo. | Cada quien nombra un trabajo que perdió o repitió por falta de datos. |
| 8–18 | **Instalar** | Instalar el APK y cargar el ejemplo «Entre Hilos» desde Copias. Recorrer proyecto → ficha → historial → hoja de trabajo. | App abierta con el ejemplo marcado EJEMPLO. |
| 18–43 | **Caso guiado** | Con los apuntes de la clienta (abajo), crear un proyecto **de práctica** con dos fichas de ventana: adjuntar una referencia, elegir el acabado, guardar, corregir una medida y generar la hoja. | Dos fichas; la sala en versión 2; hoja de trabajo en pantalla. |
| 43–55 | **IA: organizar apuntes** | Pegar los apuntes en la IA con el prompt 1. Comparar su tabla con lo que se cargó a mano. Ver qué datos marcó como faltantes o ambiguos. | Lista de datos faltantes, sin valores inventados. |
| 55–75 | **Práctica con datos propios** | Con el prompt 2, definir los campos del propio oficio y ajustar una plantilla. Crear una ficha **real** con los apuntes propios y una foto. | Una plantilla adaptada y una ficha real guardada. |
| 75–85 | **Copia y recuperación** | Guardar una copia en Descargas o Drive. Recuperarla y elegir «Agregar lo nuevo» para ver que no se duplica ni se pisa nada. Quitar el ejemplo. | Archivo de copia guardado; solo quedan los datos reales. |
| 85–90 | **Cierre** | Repaso de la rutina: medir → ficha → guardar versión → hoja → copia semanal. | Cada quien anota su próximo trabajo para registrar. |

## Caso guiado: «Entre Hilos»

**De dónde salen los datos:**
- Entre Hilos es un negocio **ficticio** de cortinas, inventado para el taller.
- La clienta y su teléfono también son ficticios.
- Las medidas son inventadas, pero coherentes entre sí: el riel sobrepasa la ventana unos 20 cm por lado, y la altura del riel al piso es mayor que la de la ventana.

**Apuntes de la visita, tal como los dejó la persona que midió:**

```
Lucía Ramírez – cortinas casa
sala: ventana 1.80 ancho x 150 alto. riel 2.20. del riel al piso 2,50. techo-riel 10cm. 2 paños
comedor: 120 x 140, riel 160, al piso 240. 1 paño, recoge a la izq
las 2 en ondas, lino crudo color natural
sala con blackout, comedor forro normal
dobladillo 10 en todas
ojo: volver a medir ancho de sala
```

Qué hay que notar antes de cargar:
- **Unidades mezcladas.** «1.80» y «2.20» están en metros; el resto, en centímetros. Todo se carga en **cm**: 180, 220 y 250.
- **Comedor, «Del techo al riel»:** no se anotó. Queda **vacío**, como «Sin dato». **No es cero.**
- **Sala, «Recogido»:** no se anotó. Queda vacío.

**Pasos:**
1. **Crear el proyecto.** Nuevo proyecto → cliente nuevo «Lucía Ramírez» → proyecto «Cortinas sala y comedor» → marcar **Es de práctica**.
2. **Primera ficha.** Nueva ficha «Ventana sala», con la plantilla Cortina. Cargar las medidas en cm y las especificaciones.
3. **Foto.** En «Fotos y referencias», tomar o elegir una foto. Sirve cualquier tela que haya a mano, como referencia del acabado, con la descripción «Tela de referencia».
4. **Guardar.** Tocar «Guardar versión 1». La app avisa de las medidas sin dato; elegir «Guardar con datos faltantes».
5. **Segunda ficha.** Repetir los pasos 2 y 4 con «Ventana comedor».
6. **Corrección.** En la visita, el ancho de la sala midió **182 cm**. Editar la ficha → 182 → en «¿Qué cambió y por qué?» escribir «Se volvió a medir el ancho» → «Guardar versión 2».
7. **Historial.** Abrir el Historial. Debe decir: `Ancho de ventana: 180 cm → 182 cm`.
8. **Hoja de trabajo.** Desde el proyecto, abrir «Hoja de trabajo del proyecto» → «Imprimir o guardar PDF» → «Guardar como PDF».

**Comprobación.** En la hoja, la medida que falta del comedor dice «SIN DATO — completar», no «0». La sala dice versión 2.

## Práctica con datos propios

1. **Con el prompt 1:** ordena tus apuntes reales. Revisa la tabla contra tus apuntes; si la IA puso un número que tú no escribiste, bórralo.
2. **Con el prompt 2:** decide qué campos necesita tu oficio. En la app, abre Plantillas → duplica la más parecida → renombra, agrega o quita campos.
3. **Crea un proyecto real, sin marcar «de práctica»,** con una ficha y una foto.
4. **Guarda una copia y recupérala.**

**Qué separar:**
- El caso guiado y el ejemplo llevan la etiqueta **EJEMPLO**.
- Tu ficha real no la lleva.
- Al final, «Quitar el ejemplo» deja solo lo real.
