# Guion del facilitador · Planea antes de cortar

**Taller en línea · 90 minutos · emprendimientos que cortan piezas rectangulares de material en plancha** (cartón, MDF, plywood, acrílico, foamboard).

**Objetivos observables.** Al terminar, cada participante:
1. Convierte un pedido en una lista de piezas con medidas, cantidad, unidad y permiso de giro, incluyendo piezas que dependen del grosor del material.
2. Genera un plano en la app e interpreta piezas colocadas, pendientes con su motivo, sobrantes útiles y aprovechamiento.
3. Decide cuántas planchas comprar y calcula el costo de material por unidad, usando una IA externa y verificando sus cuentas.

**Resultado.** La app instalada; un proyecto de práctica con plano verificado en PDF; la decisión de compra y el costo por unidad calculados; una copia de seguridad guardada y recuperada.

**Antes de empezar (preparación).**
- Instala `cortes-1.0.0.apk` en tu teléfono y comparte su pantalla. Solo funciona en **Android 7 o más reciente**: con iPhone se sigue la demostración y se hace la práctica en papel o en pareja.
- Ten abierta una IA externa (ChatGPT o Claude). La app **no tiene IA integrada**: calcula con reglas programadas.
- La app se probó de forma automática en Chromium (escritorio y ancho de teléfono). El APK compila y está firmado, pero aún no se ha instalado ni probado en un teléfono Android real. Antes del primer taller, comprueba en un teléfono real lo marcado como «Pendiente de comprobar en un teléfono real».
- Lo que la app **no hace** y no debe enseñarse como disponible: calcular costos o precios, usar más de un material por proyecto, cortar formas curvas o patrones, indicar el orden de los cortes, mover piezas a mano en el plano, guardar los sobrantes como inventario para otro proyecto, o garantizar el plano de menor desperdicio.
- Precios en quetzales: son de ejemplo (plancha de cartón gris de 70 × 100 cm a Q30). Pide a cada participante el precio real de su proveedor.

## 1 · Situación

### Diapositiva 1 · Planea antes de cortar  
**Minuto 0–2** (2 min)

**Qué decir.** Bienvenida. Hoy vamos a responder una pregunta que cuesta dinero: ¿cuánto material compro y cómo lo corto para que me alcance? Usaremos una app que calcula y comprueba el plano, y una IA externa para preparar la lista de piezas y revisar las cuentas.

**Qué hacer.** Pide que escriban en el chat qué material cortan y dónde lo compran.

> **Pendiente de comprobar en un teléfono real:** La app se probó de forma automática en Chromium (escritorio y ancho de teléfono). El APK compila y está firmado, pero aún no se ha instalado ni probado en un teléfono Android real.

**Preparación.** App instalada y sin proyectos. Ten a mano el ejemplo «Papel y Forma» (Copias → «Cargar el ejemplo») por si algo falla. IA externa abierta en otra ventana.

*Transición:* Una historia de un taller en Xela.

### Diapositiva 2 · Un pedido, ¿cuántas planchas?  
**Minuto 2–5** (3 min)

**Qué decir.** Andrea y su negocio son ficticios. Su pedido tiene 23 piezas. Con una sola plancha y cortando sin plan, se da cuenta a mitad del trabajo de que no le alcanza.

**Pregunta o actividad.** Lee algunas respuestas del chat.

**Respuesta esperada.** A ojo, con experiencia, dibujando en papel, comprando de más «por si acaso».

*Transición:* ¿Qué cuesta hacerlo así?

### Diapositiva 3 · Cortar a ojo cuesta de dos maneras  
**Minuto 5–8** (3 min)

**Qué decir.** Lo veremos con la app: este pedido cabe en 2 planchas. Con 1 faltan los 3 fondos de cuadro; con 3 sobra una entera. A Q30 la plancha (precio de ejemplo), el material del pedido es Q60.

**Pregunta o actividad.** ¿Qué te ha pasado más: comprar de menos o de más?

*Transición:* Esto es lo que vas a lograr hoy.

### Diapositiva 4 · Lo que vas a lograr hoy  
**Minuto 8–10** (2 min)

**Qué decir.** Tres objetivos que veremos en tu pantalla. Y una pregunta trampa para pensar.

**Pregunta o actividad.** Pide «sí» o «no» en el chat a la pregunta del día. No la respondas todavía.

**Respuesta esperada.** No siempre. Lo veremos con un ejemplo: una pieza puede tener poca área pero ser más ancha que la plancha.

*Transición:* Primero, las ideas que necesitamos.

## 2 · Conceptos

### Diapositiva 5 · Medidas: ancho, largo y una sola unidad  
**Minuto 10–13** (3 min)

**Qué decir.** La app dibuja el material con el ancho hacia la derecha y el largo hacia abajo, y así hay que escribir las piezas. Todo el proyecto usa una sola unidad. Si la cambias, la app pide confirmación y convierte todas las medidas (1 pulgada = 25,4 mm); las cantidades no cambian y el plano guardado queda desactualizado. Algunas medidas salen de una cuenta: el lateral corto de la caja va entre los dos largos, así que mide 20 menos dos grosores de 0,2 cm: 19,6 cm.

**Pregunta o actividad.** Si tu cartón mide 3 mm, ¿cuánto mide el lateral corto de una caja de 20 cm? 

**Respuesta esperada.** 20 − 2 × 0,3 = 19,4 cm.

*Transición:* Cortar también se come material.

### Diapositiva 6 · Separación de corte y margen del borde  
**Minuto 13–16** (3 min)

**Qué decir.** Cada corte de sierra convierte en aserrín el grosor del disco. Si no lo cuentas, la última pieza sale corta. Con cúter casi no se pierde material, pero conviene dejar unos milímetros de seguridad. El margen es el borde de la plancha que no usas porque viene golpeado. Con 0,5 cm por lado, una plancha de 70 × 100 tiene 69 × 99 cm útiles.

**Respuesta esperada.** Este caso de dos piezas de 50 cm está en las pruebas automáticas de la app: con 0 caben dos; con 0,3 solo una.

*Transición:* Otra decisión: qué piezas se pueden girar.

### Diapositiva 7 · Girar o no girar: veta, estampado, doblez  
**Minuto 16–18** (2 min)

**Qué decir.** Girar una pieza a veces ayuda a que quepa, pero no siempre se puede: el cartón y la madera tienen veta, el papel estampado tiene dirección. En el ejemplo, los fondos de cuadro van «no girar» para que la veta quede a lo largo y el cuadro no se curve. La app nunca gira una pieza marcada así.

**Pregunta o actividad.** Pide ejemplos en el chat.

*Transición:* Ahora la pregunta del día.

### Diapositiva 8 · Que el área alcance no significa que la pieza quepa  
**Minuto 18–21** (3 min)

**Qué decir.** Esta es la respuesta a la pregunta del día. El panel tiene 3750 cm², bastante menos que los 6831 cm² útiles, pero mide 75 cm de ancho y la plancha solo tiene 69 cm útiles de ancho. Si no se puede girar, no cabe. La app nunca esconde una pieza: la deja como pendiente y dice el motivo, que es uno de estos tres.

**Respuesta esperada.** El área sirve como referencia rápida; para saber si cabe hay que comparar medidas y orientación.

*Transición:* ¿Cómo calcula la app?

### Diapositiva 9 · Cómo calcula la app: una propuesta comprobada  
**Minuto 21–23** (2 min)

**Qué decir.** La app no adivina: sigue reglas fijas. Coloca primero las piezas grandes; cada vez que coloca una, divide el espacio libre con un corte recto de lado a lado (por eso se puede cortar con sierra, guillotina o cúter con regla). Prueba 15 combinaciones y se queda con la que acomoda más piezas en menos planchas. Luego un verificador revisa todo. No decimos «óptimo» porque no lo podemos demostrar. Una limitación: como empieza por las grandes, cuando no todo cabe, a veces dejaría más piezas chicas si sacara una grande.

*Transición:* Tres palabras más: sobrante, desperdicio y aprovechamiento.

### Diapositiva 10 · Sobrante útil, desperdicio y aprovechamiento  
**Minuto 23–25** (2 min)

**Qué decir.** El sobrante útil es un pedazo que vale la pena guardar; tú decides desde qué tamaño. El aprovechamiento compara el área de las piezas con el área total de las planchas usadas, incluido el margen. En el ejemplo: 8199,4 cm² entre 14 000 cm² da 58,6 %. Que sea bajo no es malo si el sobrante grande se usa en otro trabajo: aquí queda un pedazo de 38,8 × 99 cm. Ojo: la app no guarda los sobrantes como inventario para otro proyecto; anótalos tú.

**Respuesta esperada.** Cuenta: 4 × 600 + 8 × 240 + 8 × 156,8 + 3 × 875 = 2400 + 1920 + 1254,4 + 2625 = 8199,4 cm².

*Transición:* Vamos a la app con el caso completo.

## 3 · Demostración guiada

### Diapositiva 11 · El caso: la lista de piezas de Papel y Forma  
**Minuto 25–27** (2 min)

**Qué decir.** Todos los datos del ejemplo tienen un origen. La plancha de 70 × 100 es un formato común. La separación de 0,2 cm es seguridad al cortar con cúter. El margen de 0,5 cm es por los bordes golpeados.

**Qué hacer.** Carga el ejemplo: Copias → «Cargar el ejemplo "Papel y Forma"». Trae exactamente estos datos.

**Pregunta o actividad.** ¿Cuántas piezas son en total?

**Respuesta esperada.** 4 + 8 + 8 + 3 = 23 piezas.

*Transición:* Revisemos cómo quedó en la app.

### Diapositiva 12 · Paso 1 · Material y medidas de corte  
**Minuto 27–30** (3 min)

**Qué decir.** Revisamos la sección Material. Fíjate que la unidad es una sola para todo el proyecto. Cada campo se guarda solo, sin botón; arriba dice «Guardado en el teléfono» con la hora.

> **Pendiente de comprobar en un teléfono real:** Que el guardado automático sobreviva a cerrar la app desde el selector de apps de Android (en Chromium se comprobó al cerrar y reabrir).

*Transición:* Ahora las piezas.

### Diapositiva 13 · Paso 2 · Piezas con letra, cantidad y giro  
**Minuto 30–33** (3 min)

**Qué decir.** La barra de abajo da el total: 23 piezas y 8199,4 cm². Es un primer control: si el total no coincide con lo que calculaste, falta o sobra una pieza.

*Transición:* Generamos el plano.

### Diapositiva 14 · Paso 3 · Generar el plano y leer el resumen  
**Minuto 33–35** (2 min)

**Qué decir.** Al tocar «Generar plano», la app calcula y verifica. Antes de mirar el dibujo, leemos el resumen: todas las piezas tienen lugar, usa 2 de 2 planchas y aprovecha 58,6 %. La línea «Verificado» es el resultado de una revisión independiente; si algo fallara, aparecería en rojo y diría «No cortes con este plano».

*Transición:* Ahora sí, el dibujo.

### Diapositiva 15 · Paso 4 · Leer el plano: códigos, giros y sobrantes  
**Minuto 35–38** (3 min)

**Qué decir.** Cada pieza tiene su código. Las que llevan la flecha circular están giradas. Las zonas rayadas son sobrantes útiles, con su código y medida en la tabla; las zonas blancas son retazos más chicos que el mínimo. La leyenda dice dónde va cada pieza, medida desde la esquina superior izquierda: así se marca la plancha antes de cortar.

**Qué hacer.** Toca «+» dos veces para mostrar la ampliación y desplázate con el dedo.

> **Pendiente de comprobar en un teléfono real:** Legibilidad del plano y ampliación en pantallas pequeñas de teléfono; ampliar con dos dedos.

*Transición:* Probemos qué pasa si el material no alcanza.

### Diapositiva 16 · Paso 5 · Prueba: ¿y con una sola plancha?  
**Minuto 38–40** (2 min)

**Qué decir.** Esto es lo que le pasó a Andrea: con una plancha caben 20 piezas y quedan fuera los 3 fondos de cuadro. La app lo dice antes de cortar. Al terminar, vuelve a poner 2 planchas.

**Respuesta esperada.** Si cambias un dato después de generar, la app avisa que el plano guardado «ya no coincide».

*Transición:* Ahora, una pieza que no cabe por su forma.

### Diapositiva 17 · Paso 6 · Prueba: una pieza que no cabe sin girar  
**Minuto 40–43** (3 min)

**Qué decir.** Agregamos un panel de exhibición de 75 × 50 cm y desmarcamos «Se puede girar». Queda pendiente: «No cabe en esa orientación y está marcada "no girar"». Si el panel se puede girar, entra como 50 × 75 y el aprovechamiento sube a 85,4 %. Antes de seguir, quitamos el panel para dejar el ejemplo como estaba.

*Transición:* Antes del ejercicio: proteger el trabajo.

### Diapositiva 18 · Paso 7 · Respaldo: guardar, borrar y recuperar  
**Minuto 43–45** (2 min)

**Qué decir.** La app guarda los proyectos en el teléfono, sin internet. Eso no es una copia de seguridad: si desinstalas la app, borras sus datos o pierdes el teléfono, se va todo, y la app no usa el respaldo automático de Google. Hagamos la prueba completa: Copias, marca «Incluir también el ejemplo», «Guardar una copia». Luego eliminamos un proyecto a propósito y lo recuperamos: la app muestra qué contiene la copia; «Agregar lo nuevo» agrega lo que no existe en el teléfono y no actualiza lo que ya existe, aunque la copia tenga cambios más recientes; la vista previa dice cuántos se agregan y cuántos se omiten. «Reemplazar todo» pide confirmación y se puede deshacer.

**Qué hacer.** En la demostración puedes eliminar el ejemplo y recuperarlo. En el ejercicio, cada participante lo hace con su propio proyecto de práctica.

**Respuesta esperada.** Aviso: «Copia recuperada: se agregaron 1 proyecto». El plano vuelve con él.

> **Pendiente de comprobar en un teléfono real:** Selector de Android al guardar (Descargas o Drive) y al recuperar; recuperar en un segundo teléfono; conservar los datos al instalar una versión nueva encima. En Chromium se comprobó guardar, eliminar y recuperar.

*Transición:* Tu turno con otro pedido.

## 4 · Ejercicio práctico

### Diapositiva 19 · Tu turno: cajitas de recuerdo para Detalles Ixchel  
**Minuto 45–47** (2 min)

**Qué decir.** Ahora otro pedido, también ficticio. Primero calculen en papel lo que falta en la tabla. Tienen 2 minutos.

**Respuesta esperada.** B: 10 × 5 cm, 24 (2 por cajita × 12). C: 9,6 × 5 cm (10 − 2 × 0,2), 24. Total: 12 + 24 + 24 + 12 = 72 piezas.

*Transición:* Los pasos.

### Diapositiva 20 · Pasos del ejercicio · 13 minutos  
**Minuto 47–60** (13 min)

**Qué decir.** Trabajen solos con estos pasos. El paso 6 es el reto: piensen antes de generar si la bandeja va a caber.

**Qué hacer.** A los 5 minutos, pide que escriban en el chat sus tres números del paso 5. A los 10, los del paso 7.

**Respuesta esperada.** Paso 5: 72 de 72, 1 de 1, 69,3 %. Paso 7: con 1 plancha, 48 de 73 y 25 pendientes por falta de material (B24 y C1 a C24); con 2 planchas, 73 de 73 y 51,8 %.

> **Pendiente de comprobar en un teléfono real:** Imprimir → «Guardar como PDF» desde el APK. En Chromium se comprobó que el plano sale en PDF, una plancha por página.

*Transición:* Los errores que más se repiten.

### Diapositiva 21 · Errores frecuentes y cómo detectarlos  
**Minuto 60–63** (3 min)

**Qué decir.** La app verifica el plano con los datos que le das, pero no puede saber si la lista de piezas está bien pensada: eso es tuyo. El total de piezas y el área de la barra inferior son tu primer control.

**Pregunta o actividad.** ¿Cuál te pasó? Respondan con el número de fila.

*Transición:* Comprobemos.

### Diapositiva 22 · Comprueba tu resultado  
**Minuto 63–65** (2 min)

**Qué decir.** Si tus números coinciden, tu plano es el mismo que el mío: la app es determinista, con los mismos datos da el mismo plano. Si no coinciden, revisa la lista: casi siempre es una cantidad o una medida.

*Transición:* Ahora sumamos la IA, como herramienta externa.

## 5 · IA como herramienta externa

### Diapositiva 23 · La IA trabaja afuera de la app  
**Minuto 65–67** (2 min)

**Qué decir.** La app no tiene IA adentro y funciona sin internet. La IA externa necesita internet y sirve para pensar la lista de piezas y hacer cuentas, no para dibujar el plano: un plano dibujado por una IA no está verificado. El ciclo: organizo, consulto, verifico y aplico en la app. No compartas datos de tus clientes: basta con el producto y sus medidas.

*Transición:* Prompt 1: de la idea a la lista de piezas.

### Diapositiva 24 · Prompt 1 · Del producto a la lista de piezas  
**Minuto 67–71** (4 min)

**Qué decir.** Probemos con las cajitas: «Fabrico cajitas con tapa con cartón gris de 2 mm, medidas finales 10 × 10 × 5 cm, los laterales cortos van entre los largos, la tapa sobresale 0,2 cm por lado, 12 unidades». Comparemos la tabla con la nuestra.

**Qué hacer.** Hazlo en vivo y compara con la tabla del ejercicio.

**Respuesta esperada.** Debe dar 12 bases de 10 × 10, 24 laterales de 10 × 5, 24 de 9,6 × 5 y 12 tapas de 10,4 × 10,4. Si da otra cosa, la IA se equivocó o faltó información en el prompt.

*Transición:* Prompt 2: revisar antes de cargar.

### Diapositiva 25 · Prompt 2 · Revisar la lista antes de cargarla  
**Minuto 71–75** (4 min)

**Qué decir.** Este prompt anticipa problemas. Con el reto de la bandeja, el área total pasa a 7249,92 cm², más que los 6831 cm² útiles de una plancha: ya sabemos que hacen falta dos antes de generar el plano. Al revés no funciona: que el área alcance no garantiza que todo quepa, como vimos con el panel.

**Respuesta esperada.** 4849,92 + 2400 = 7249,92 cm². 7249,92 > 6831.

*Transición:* Prompt 3: decidir con el plano en la mano.

### Diapositiva 26 · Prompt 3 · Decidir la compra y el costo por unidad  
**Minuto 75–80** (5 min)

**Qué decir.** Con los números del plano, la IA ayuda a hacer cuentas, pero la decisión es tuya. Doce cajitas caben en una plancha: Q30 entre 12 son Q2,50 de cartón por cajita. Si agregan la bandeja, hace falta una segunda plancha: Q60 el pedido, y queda un sobrante grande de 69 × 78,2 cm. ¿Se compra la segunda plancha o la bandeja se hace con otro material? Eso lo decide el negocio, no la IA.

**Respuesta esperada.** 30 ÷ 12 = 2,50. 2 × 30 = 60. 69 × 78,2 = 5395,8 cm², cerca del 77 % de una plancha.

*Transición:* Cerremos revisando el ejercicio.

## 6 · Revisión y plan

### Diapositiva 27 · Solución del ejercicio  
**Minuto 80–84** (4 min)

**Qué decir.** Revisemos. Sin bandeja, las 72 piezas caben en una plancha. Con bandeja, la app la coloca primero por ser la más grande, y con una plancha quedan 25 piezas pendientes: un lateral largo y los 24 cortos. Con dos planchas cabe todo. Lo importante: los motivos de los pendientes y la decisión de compra.

**Pregunta o actividad.** Vuelve a la pregunta del día: si el área cabe, ¿las piezas caben?

**Respuesta esperada.** No siempre: hay que comparar medidas y orientación. Y si el área NO cabe, seguro hace falta más material.

*Transición:* Una rutina para usarlo mañana.

### Diapositiva 28 · Tu rutina y la tarea de mañana  
**Minuto 84–90** (6 min)

**Qué decir.** La rutina: listar piezas con sus cuentas, cargar el material real, leer el plano y sus pendientes, decidir cuántas planchas y cuánto cuesta por unidad, y guardar una copia cada viernes. La tarea: el plano de tu próximo pedido real. Al terminar de practicar, quita el ejemplo desde Copias.

**Qué hacer.** Abre dudas (4 min).

> **Pendiente de comprobar en un teléfono real:** Pendientes de comprobar en un teléfono real antes de repetir el taller: instalación del APK, guardado al cerrar, reiniciar y actualizar, copias con el selector de Android y Drive, recuperación en otro teléfono, imprimir como PDF, ampliación del plano en pantalla chica, modo avión y botón Atrás.
