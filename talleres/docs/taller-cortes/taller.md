# Taller 01 · Planea tus cortes y aprovecha el material

**Producto del participante:** «Mi plan de cortes» instalado y configurado, con un proyecto de corte propio: material, piezas identificadas y plano imprimible.

**Antes de la sesión (facilitador):**
- Comprueba que el APK se instala en un teléfono de prueba.
- Pide a cada participante que traiga:
  - las medidas reales del material que usa (largo, ancho y cuántas planchas tiene);
  - la lista de piezas de un trabajo próximo;
  - si es posible, una regla o una cinta métrica.

## Secuencia de 90 minutos

| Min | Bloque | Qué pasa | Resultado visible |
|---|---|---|---|
| 0–8 | **Abrir** | Problema: cortar «a ojo» deja retazos inútiles y compras de más. Se muestra un plano impreso del ejemplo. | Cada quien dice qué material desperdicia más. |
| 8–15 | **Instalar** | Instalar el APK, cargar el ejemplo «Papel y Forma» y leer «Cómo funciona». | App abierta con el ejemplo marcado EJEMPLO. |
| 15–40 | **Caso guiado** | Revisar de dónde sale cada dato del ejemplo (abajo), generar el plano, ampliarlo, leer la leyenda y los sobrantes. Hacer dos pruebas: quitar una plancha y agregar una pieza que no cabe. | Plano verificado; lista de pendientes con su motivo. |
| 40–52 | **IA: lista de piezas** | Con el prompt 1, convertir una descripción de un producto en una lista de piezas, con los datos faltantes señalados. | Lista de piezas con medidas y cantidades, y preguntas abiertas. |
| 52–75 | **Práctica con datos propios** | Proyecto nuevo con el material y las piezas propias. Decidir qué piezas se pueden girar. Generar el plano e imprimir en PDF. | Plano propio guardado y en PDF. |
| 75–85 | **Copia** | Guardar una copia y recuperarla con «Agregar lo nuevo». Quitar el ejemplo. | Archivo de copia guardado. |
| 85–90 | **Cierre** | Antes de cortar: medir el material real, revisar el plano y marcar las piezas. | Cada quien anota qué hará con sus sobrantes. |

## Caso guiado: «Papel y Forma»

Papel y Forma es un emprendimiento **ficticio** de artículos decorativos de cartón. Los datos son inventados, pero **están comprobados**: el plano del ejemplo se verifica en las pruebas automáticas de la app.

| Dato | Valor | De dónde sale |
|---|---|---|
| Material | Cartón gris 2 mm, plancha de 70 × 100 cm, 2 planchas | Formato común de plancha. Hay que confirmar el del proveedor. |
| Separación de corte | 0,2 cm | El cúter casi no quita material; es un margen de seguridad para no cortar sobre la pieza vecina. |
| Margen del borde | 0,5 cm | Los bordes de la plancha suelen venir golpeados. |
| A · Base de caja | 30 × 20 cm, 4 | Caja de 30 × 20 × 8 cm. |
| B · Lateral largo | 30 × 8 cm, 8 | Dos por caja. |
| C · Lateral corto | 19,6 × 8 cm, 8 | Va entre los laterales largos: 20 − 2 × 0,2 = 19,6. |
| D · Fondo de cuadro | 25 × 35 cm, 3, **no girar** | La veta del cartón debe ir a lo largo para que no se curve. |

**Pasos:**
1. Copias → «Cargar el ejemplo "Papel y Forma"».
2. Revisar el material y las piezas. Comprobar el lateral corto: 20 − 0,4 = 19,6.
3. «Generar plano». Resultado esperado: **23 de 23 piezas en 2 de 2 planchas** y la línea «✓ Verificado…».
4. Ampliar con «+». Leer la leyenda: A1…D3 indican posición y si la pieza está girada (↻). Los sobrantes llevan códigos como S1.1.
5. **Prueba 1, falta material.** Cambiar las planchas a 1 y generar de nuevo. La app marca las piezas pendientes con «No alcanzó el material».
6. **Prueba 2, pieza que no cabe.**
   - Volver a 2 planchas.
   - Agregar «Panel de exhibición» de 75 × 50, cantidad 1, y **desmarcar «Se puede girar»**.
   - Al generar, queda pendiente: «No cabe en esa orientación y está marcada "no girar"». El área útil mide 69 cm de ancho.
   - Marcar «Se puede girar» y generar otra vez: entra girada, como 50 × 75.
7. Imprimir o guardar en PDF: sale una página por plancha, con la leyenda.

**Para conversar:**
- La app dice «propuesta comprobada», no «óptima». ¿Por qué importa?
- ¿Qué piezas de tu trabajo **no** se pueden girar, y por qué: veta, estampado, doblez o pelo de la tela?

## Práctica con datos propios

1. **Proyecto nuevo, sin marcar «de práctica».** Elige la unidad, y escribe el material real y cuántas planchas tienes.
2. **Separación de corte:** el grosor del disco o de la hoja si usas sierra; un margen pequeño si cortas con cúter.
3. **Piezas:** cárgalas con la lista que preparaste. Si usaste la IA, revisa cada medida contra tu dibujo o tu pieza de muestra.
4. **Generar el plano.**
   - Si hay pendientes, decide: ¿más material, otra orientación o menos piezas?
5. **Guardar en PDF** y hacer una copia.

**Qué separar:**
- El ejemplo y las pruebas llevan la etiqueta EJEMPLO.
- Tu proyecto real no la lleva.
