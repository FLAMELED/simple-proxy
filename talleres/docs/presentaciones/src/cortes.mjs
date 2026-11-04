// Contenido del taller «Planea antes de cortar» (app Mi plan de cortes).
// Cada número sale del motor real (talleres/cortes/src/engine.js) y pasó verifyPlan;
// las capturas se tomaron con scripts/capturas-cortes.mjs. Datos ficticios.

const B1 = '1 · Situación'; const B2 = '2 · Conceptos'; const B3 = '3 · Demostración guiada';
const B4 = '4 · Ejercicio práctico'; const B5 = '5 · IA como herramienta externa'; const B6 = '6 · Revisión y plan';
const s = (o) => ({ ...o, blockLabel: o.block });
const SVG_W = 4.6 * (708 / 976);

const PHONE_PENDIENTE = 'La app se probó de forma automática en Chromium (escritorio y ancho de teléfono). El APK compila y está firmado, pero aún no se ha instalado ni probado en un teléfono Android real.';

export default {
  file: 'Taller-Cortes-Planea-antes-de-cortar.pptx',
  title: 'Planea antes de cortar',
  footer: 'Planea antes de cortar · Mi plan de cortes',
  theme: {
    name: 'Cortes', headFontFace: 'Cambria', bodyFontFace: 'Calibri',
    colors: { dk1: '232323', lt1: 'F6F1E4', dk2: 'C4511A', lt2: 'FFFFFF', accent1: 'C4511A', accent2: '8A7F6A', accent3: 'F3C9AD', accent4: 'ECE4D1', accent5: 'A3221B', accent6: '5B564C', hlink: 'C4511A', folHlink: '8A7F6A' },
  },
  guionIntro: [
    '**Taller en línea · 90 minutos · emprendimientos que cortan piezas rectangulares de material en plancha** (cartón, MDF, plywood, acrílico, foamboard).',
    '',
    '**Objetivos observables.** Al terminar, cada participante:',
    '1. Convierte un pedido en una lista de piezas con medidas, cantidad, unidad y permiso de giro, incluyendo piezas que dependen del grosor del material.',
    '2. Genera un plano en la app e interpreta piezas colocadas, pendientes con su motivo, sobrantes útiles y aprovechamiento.',
    '3. Decide cuántas planchas comprar y calcula el costo de material por unidad, usando una IA externa y verificando sus cuentas.',
    '',
    '**Resultado.** La app instalada; un proyecto de práctica con plano verificado en PDF; la decisión de compra y el costo por unidad calculados; una copia de seguridad guardada y recuperada.',
    '',
    '**Antes de empezar (preparación).**',
    '- Instala `cortes-1.0.0.apk` en tu teléfono y comparte su pantalla. Solo funciona en **Android 7 o más reciente**: con iPhone se sigue la demostración y se hace la práctica en papel o en pareja.',
    '- Ten abierta una IA externa (ChatGPT o Claude). La app **no tiene IA integrada**: calcula con reglas programadas.',
    `- ${PHONE_PENDIENTE} Antes del primer taller, comprueba en un teléfono real lo marcado como «Pendiente de comprobar en un teléfono real».`,
    '- Lo que la app **no hace** y no debe enseñarse como disponible: calcular costos o precios, usar más de un material por proyecto, cortar formas curvas o patrones, indicar el orden de los cortes, mover piezas a mano en el plano, guardar los sobrantes como inventario para otro proyecto, o garantizar el plano de menor desperdicio.',
    '- Precios en quetzales: son de ejemplo (plancha de cartón gris de 70 × 100 cm a Q30). Pide a cada participante el precio real de su proveedor.',
  ].join('\n'),
  slides: [
    // ═════ 1 · SITUACIÓN ═════
    s({ block: B1, min: [0, 2], cover: true, kicker: 'TALLER EN LÍNEA · 90 MINUTOS', title: 'Planea antes de cortar', subtitle: 'Cuántas planchas necesitas, dónde va cada pieza y qué te sobra',
      elements: [{ t: 'text', x: 0.6, y: 6.35, w: 11, h: 0.4, text: 'App: Mi plan de cortes · Para quien corta piezas rectangulares en plancha', size: 16, color: 'light' }],
      notes: {
        say: 'Bienvenida. Hoy vamos a responder una pregunta que cuesta dinero: ¿cuánto material compro y cómo lo corto para que me alcance? Usaremos una app que calcula y comprueba el plano, y una IA externa para preparar la lista de piezas y revisar las cuentas.',
        do: 'Pide que escriban en el chat qué material cortan y dónde lo compran.',
        prep: 'App instalada y sin proyectos. Ten a mano el ejemplo «Papel y Forma» (Copias → «Cargar el ejemplo») por si algo falla. IA externa abierta en otra ventana.',
        check: PHONE_PENDIENTE,
        next: 'Una historia de un taller en Xela.',
      } }),
    s({ block: B1, min: [2, 5], title: 'Un pedido, ¿cuántas planchas?',
      elements: [
        { t: 'bullets', x: 0.6, y: 1.95, w: 6.4, h: 2.8, size: 21, items: [
          'Andrea tiene «Papel y Forma» en Quetzaltenango.',
          'Una tienda de regalos le pide 4 cajas de 30 × 20 × 8 cm y 3 cuadros.',
          'Compra 1 plancha de cartón gris «a ojo».',
          'Empieza a cortar sin plan.' ] },
        { t: 'box', x: 0.6, y: 4.95, w: 6.4, h: 1.55, tone: 'accent', label: 'Actividad · chat', text: '¿Cómo calculas hoy cuánto material comprar? A ojo, con papel, con la experiencia…', size: 17 },
        { t: 'rect', x: 7.9, y: 1.95, w: 3.45, h: 4.55, fill: 'paper', line: 'ink', lw: 2.5, text: '', size: 14 },
        { t: 'rect', x: 8.05, y: 2.1, w: 1.6, h: 1.1, fill: 'light', text: 'Base 30 × 20', size: 12 },
        { t: 'rect', x: 9.75, y: 2.1, w: 1.45, h: 1.1, fill: 'light', text: 'Base', size: 12 },
        { t: 'rect', x: 8.05, y: 3.3, w: 1.2, h: 1.8, fill: 'light', text: 'Cuadro 25 × 35', size: 12 },
        { t: 'rect', x: 9.35, y: 3.3, w: 1.85, h: 0.45, fill: 'light', text: 'Lateral', size: 11 },
        { t: 'rect', x: 9.35, y: 3.85, w: 1.85, h: 0.45, fill: 'light', text: 'Lateral', size: 11 },
        { t: 'rect', x: 8.05, y: 5.2, w: 3.15, h: 1.15, fill: 'tint', dash: true, text: '¿Y los otros cuadros?', size: 13, bold: true },
        { t: 'text', x: 11.55, y: 2.0, w: 1.2, h: 4.4, size: 13, text: 'Plancha 70 × 100 cm\n\nEsquema, no es el plano de la app.' },
      ],
      notes: {
        say: 'Andrea y su negocio son ficticios. Su pedido tiene 23 piezas. Con una sola plancha y cortando sin plan, se da cuenta a mitad del trabajo de que no le alcanza.',
        ask: 'Lee algunas respuestas del chat.',
        answer: 'A ojo, con experiencia, dibujando en papel, comprando de más «por si acaso».',
        next: '¿Qué cuesta hacerlo así?',
      } }),
    s({ block: B1, min: [5, 8], title: 'Cortar a ojo cuesta de dos maneras',
      elements: [
        { t: 'box', x: 0.6, y: 1.95, w: 5.9, h: 3.0, tone: 'tint', label: 'Comprar de menos', head: 'Faltaron los 3 fondos de cuadro', text: 'Segundo viaje a la distribuidora, otra plancha de Q30, medio día perdido y la entrega tarde.', size: 17, headSize: 22 },
        { t: 'box', x: 6.8, y: 1.95, w: 5.9, h: 3.0, tone: 'tint', label: 'Comprar de más', head: 'Tres planchas «por si acaso»', text: 'Si bastaban dos, Q30 quedan guardados en una plancha que no se usó.', size: 17, headSize: 22 },
        { t: 'stat', x: 0.6, y: 5.15, w: 12.1, h: 1.4, value: '2 planchas × Q30 = Q60', label: 'lo que de verdad necesitaba este pedido (precio de ejemplo)', size: 40 },
      ],
      notes: {
        say: 'Lo veremos con la app: este pedido cabe en 2 planchas. Con 1 faltan los 3 fondos de cuadro; con 3 sobra una entera. A Q30 la plancha (precio de ejemplo), el material del pedido es Q60.',
        ask: '¿Qué te ha pasado más: comprar de menos o de más?',
        next: 'Esto es lo que vas a lograr hoy.',
      } }),
    s({ block: B1, min: [8, 10], title: 'Lo que vas a lograr hoy',
      elements: [
        { t: 'flow', x: 0.6, y: 1.95, w: 12.1, h: 2.2, headSize: 18, size: 14, steps: [
          { head: 'Listar', text: 'Piezas con medida, cantidad, unidad y giro.' },
          { head: 'Interpretar', text: 'El plano: pendientes, sobrantes y aprovechamiento.' },
          { head: 'Decidir', text: 'Cuántas planchas comprar y el costo por unidad.' } ] },
        { t: 'box', x: 0.6, y: 4.45, w: 7.4, h: 2.05, tone: 'accent', label: 'Al terminar tendrás', text: ['Un plano verificado y guardado en PDF.', 'Tu decisión de compra con su cuenta en quetzales.', 'Una copia de seguridad guardada y recuperada.'], list: true, size: 17 },
        { t: 'box', x: 8.3, y: 4.45, w: 4.4, h: 2.05, tone: 'light', label: 'Pregunta del día', head: 'Si el área de las piezas cabe en la plancha, ¿las piezas caben?', headSize: 18 },
      ],
      notes: {
        say: 'Tres objetivos que veremos en tu pantalla. Y una pregunta trampa para pensar.',
        ask: 'Pide «sí» o «no» en el chat a la pregunta del día. No la respondas todavía.',
        answer: 'No siempre. Lo veremos con un ejemplo: una pieza puede tener poca área pero ser más ancha que la plancha.',
        next: 'Primero, las ideas que necesitamos.',
      } }),

    // ═════ 2 · CONCEPTOS ═════
    s({ block: B2, min: [10, 13], title: 'Medidas: ancho, largo y una sola unidad',
      elements: [
        { t: 'rect', x: 0.6, y: 2.2, w: 2.9, h: 4.1, fill: 'paper', line: 'ink', lw: 2.5 },
        { t: 'text', x: 0.6, y: 1.85, w: 2.9, h: 0.35, size: 15, bold: true, align: 'center', text: 'Ancho 70 cm →' },
        { t: 'text', x: 3.6, y: 3.9, w: 1.6, h: 0.6, size: 15, bold: true, text: 'Largo 100 cm ↓' },
        { t: 'bullets', x: 5.4, y: 1.95, w: 7.3, h: 2.6, size: 20, items: [
          'El ancho va en la dirección → del material; el largo, en la ↓.',
          'Una unidad para todo el proyecto: mm, cm o pulgadas.',
          '2 mm = 0,2 cm. Coma o punto, los dos sirven.' ] },
        { t: 'box', x: 5.4, y: 4.6, w: 7.3, h: 1.9, tone: 'accent', label: 'Piezas que dependen del grosor', head: 'Lateral corto = 20 − 2 × 0,2 = 19,6 cm', text: 'Va entre los dos laterales largos, y el cartón mide 2 mm.', size: 16, headSize: 22 },
      ],
      notes: {
        say: 'La app dibuja el material con el ancho hacia la derecha y el largo hacia abajo, y así hay que escribir las piezas. Todo el proyecto usa una sola unidad. Si la cambias, la app pide confirmación y convierte todas las medidas (1 pulgada = 25,4 mm); las cantidades no cambian y el plano guardado queda desactualizado. Algunas medidas salen de una cuenta: el lateral corto de la caja va entre los dos largos, así que mide 20 menos dos grosores de 0,2 cm: 19,6 cm.',
        ask: 'Si tu cartón mide 3 mm, ¿cuánto mide el lateral corto de una caja de 20 cm? ',
        answer: '20 − 2 × 0,3 = 19,4 cm.',
        next: 'Cortar también se come material.',
      } }),
    s({ block: B2, min: [13, 16], title: 'Separación de corte y margen del borde',
      elements: [
        { t: 'table', x: 0.6, y: 1.95, w: 6.6, colW: [3.3, 3.3], size: 16, rows: [
          ['Concepto', 'Ejemplo'], ['Separación de corte: lo que quita cada corte', 'Sierra: grosor del disco · Cúter: 0,2 cm de seguridad'], ['Margen del borde: lo que no se usa', '0,5 cm por lado (bordes golpeados)'], ['Área útil de la plancha', '(70 − 1) × (100 − 1) = 69 × 99 cm'] ] },
        { t: 'box', x: 7.6, y: 1.95, w: 5.1, h: 4.55, tone: 'accent', label: 'Prueba con la app', head: '2 piezas de 50 cm en 100 cm', text: ['Separación 0: caben las dos.', 'Separación 0,3 cm: cabe una. 50 + 0,3 + 50 = 100,3 cm.', 'La separación va entre piezas; una pieza sí puede llegar hasta el margen.'], list: true, size: 17, headSize: 22 },
      ],
      notes: {
        say: 'Cada corte de sierra convierte en aserrín el grosor del disco. Si no lo cuentas, la última pieza sale corta. Con cúter casi no se pierde material, pero conviene dejar unos milímetros de seguridad. El margen es el borde de la plancha que no usas porque viene golpeado. Con 0,5 cm por lado, una plancha de 70 × 100 tiene 69 × 99 cm útiles.',
        answer: 'Este caso de dos piezas de 50 cm está en las pruebas automáticas de la app: con 0 caben dos; con 0,3 solo una.',
        next: 'Otra decisión: qué piezas se pueden girar.',
      } }),
    s({ block: B2, min: [16, 18], title: 'Girar o no girar: veta, estampado, doblez',
      elements: [
        { t: 'flow', x: 0.6, y: 1.95, w: 6.4, h: 2.0, headSize: 18, size: 14, steps: [
          { n: 'A1', head: '30 × 20', text: 'Se puede girar' }, { n: 'A1 ↻', head: '20 × 30', text: 'Girada en el plano', fill: 'accent2' } ] },
        { t: 'bullets', x: 0.6, y: 4.25, w: 6.4, h: 2.3, size: 19, items: [
          'Letra por tipo de pieza y número por unidad: A1, A2, B1…',
          '↻ en el plano = la pieza está girada.',
          'Desmarca «Se puede girar» si importa la orientación.' ] },
        { t: 'phone', file: 'cortes-03-piezas.png', x: 7.6, y: 1.95, h: 4.6, caption: 'Piezas con «Se puede girar»' },
        { t: 'box', x: 10.05, y: 1.95, w: 2.65, h: 4.55, tone: 'light', label: 'Pregunta', head: '¿Qué pieza tuya no se puede girar?', headSize: 18, text: 'Veta del MDF, estampado del papel, dirección del doblez…', size: 14 },
      ],
      notes: {
        say: 'Girar una pieza a veces ayuda a que quepa, pero no siempre se puede: el cartón y la madera tienen veta, el papel estampado tiene dirección. En el ejemplo, los fondos de cuadro van «no girar» para que la veta quede a lo largo y el cuadro no se curve. La app nunca gira una pieza marcada así.',
        ask: 'Pide ejemplos en el chat.',
        next: 'Ahora la pregunta del día.',
      } }),
    s({ block: B2, min: [18, 21], title: 'Que el área alcance no significa que la pieza quepa',
      elements: [
        { t: 'rect', x: 0.6, y: 2.0, w: 2.07, h: 2.97, fill: 'paper', line: 'ink', lw: 2.5, text: 'Área útil\n69 × 99 cm\n6831 cm²', size: 14, bold: true },
        { t: 'rect', x: 3.0, y: 2.0, w: 2.25, h: 1.5, fill: 'light', text: 'Panel 75 × 50\n3750 cm²', size: 14, bold: true },
        { t: 'text', x: 3.0, y: 3.65, w: 3.4, h: 1.2, size: 15, text: '3750 < 6831 cm²… pero 75 cm de ancho > 69 cm útiles.' },
        { t: 'box', x: 0.6, y: 5.25, w: 6.0, h: 1.25, tone: 'accent', label: 'Respuesta', text: 'No siempre. Si no se puede girar, el panel queda pendiente.', size: 17 },
        { t: 'phone', file: 'cortes-13-no-cabe.png', x: 7.1, y: 1.95, h: 4.6, caption: 'La app lo marca como pendiente' },
        { t: 'box', x: 9.5, y: 1.95, w: 3.2, h: 4.55, tone: 'light', label: 'Motivos de la app', text: ['Más grande que el área útil, aun girándola.', 'No cabe en esa orientación y está marcada «no girar».', 'No alcanzó el material: faltan planchas.'], list: true, size: 15 },
      ],
      notes: {
        say: 'Esta es la respuesta a la pregunta del día. El panel tiene 3750 cm², bastante menos que los 6831 cm² útiles, pero mide 75 cm de ancho y la plancha solo tiene 69 cm útiles de ancho. Si no se puede girar, no cabe. La app nunca esconde una pieza: la deja como pendiente y dice el motivo, que es uno de estos tres.',
        answer: 'El área sirve como referencia rápida; para saber si cabe hay que comparar medidas y orientación.',
        next: '¿Cómo calcula la app?',
      } }),
    s({ block: B2, min: [21, 23], title: 'Cómo calcula la app: una propuesta comprobada',
      elements: [
        { t: 'flow', x: 0.6, y: 1.95, w: 12.1, h: 2.25, headSize: 17, size: 13, steps: [
          { head: 'Coloca', text: 'Grandes primero, en el espacio libre que mejor ajusta.' },
          { head: 'Corta', text: 'Divide el espacio con cortes rectos de lado a lado.' },
          { head: 'Prueba', text: '15 combinaciones de orden y división.' },
          { head: 'Elige', text: 'Más piezas, menos planchas.' },
          { head: 'Comprueba', text: 'Medidas, separación, giros, cantidades.' } ] },
        { t: 'box', x: 0.6, y: 4.5, w: 6.4, h: 2.0, tone: 'dark', label: 'No es «óptimo»', text: 'Es una buena propuesta verificada. No se garantiza que sea la de menor desperdicio posible.', size: 17 },
        { t: 'box', x: 7.3, y: 4.5, w: 5.4, h: 2.0, tone: 'light', label: 'Sin IA', text: 'Reglas programadas: con los mismos datos sale siempre el mismo plano.', size: 17 },
      ],
      notes: {
        say: 'La app no adivina: sigue reglas fijas. Coloca primero las piezas grandes; cada vez que coloca una, divide el espacio libre con un corte recto de lado a lado (por eso se puede cortar con sierra, guillotina o cúter con regla). Prueba 15 combinaciones y se queda con la que acomoda más piezas en menos planchas. Luego un verificador revisa todo. No decimos «óptimo» porque no lo podemos demostrar. Una limitación: como empieza por las grandes, cuando no todo cabe, a veces dejaría más piezas chicas si sacara una grande.',
        next: 'Tres palabras más: sobrante, desperdicio y aprovechamiento.',
      } }),
    s({ block: B2, min: [23, 25], title: 'Sobrante útil, desperdicio y aprovechamiento',
      elements: [
        { t: 'bullets', x: 0.6, y: 1.95, w: 6.2, h: 2.4, size: 19, items: [
          'Sobrante útil: un retazo de al menos el tamaño que tú defines (5 × 5 cm en el ejemplo). Se numera S1.1, S1.2…',
          'Desperdicio: retazos más chicos, cortes y margen.' ] },
        { t: 'stat', x: 0.6, y: 4.35, w: 6.2, value: '58,6 %', label: 'aprovechamiento = 8199,4 cm² de piezas ÷ 14 000 cm² de 2 planchas', size: 54 },
        { t: 'image', file: 'cortes-07-svg-plancha2.png', x: 7.4, y: 1.95, w: SVG_W, h: 4.6, caption: 'Plancha 2: sobrante S2.1 de 38,8 × 99 cm' },
        { t: 'box', x: 10.95, y: 1.95, w: 1.75, h: 4.55, tone: 'tint', label: 'Guardado', text: 'Copia de seguridad: lo vemos en la demostración.', size: 13 },
      ],
      notes: {
        say: 'El sobrante útil es un pedazo que vale la pena guardar; tú decides desde qué tamaño. El aprovechamiento compara el área de las piezas con el área total de las planchas usadas, incluido el margen. En el ejemplo: 8199,4 cm² entre 14 000 cm² da 58,6 %. Que sea bajo no es malo si el sobrante grande se usa en otro trabajo: aquí queda un pedazo de 38,8 × 99 cm. Ojo: la app no guarda los sobrantes como inventario para otro proyecto; anótalos tú.',
        answer: 'Cuenta: 4 × 600 + 8 × 240 + 8 × 156,8 + 3 × 875 = 2400 + 1920 + 1254,4 + 2625 = 8199,4 cm².',
        next: 'Vamos a la app con el caso completo.',
      } }),

    // ═════ 3 · DEMOSTRACIÓN ═════
    s({ block: B3, min: [25, 27], title: 'El caso: la lista de piezas de Papel y Forma',
      elements: [
        { t: 'table', x: 0.6, y: 1.95, w: 8.2, colW: [3.0, 1.6, 1.1, 2.5], size: 16, rows: [
          ['Pieza', 'Medida (cm)', 'Cant.', '¿De dónde sale?'], ['A · Base de caja', '30 × 20', '4', 'Caja de 30 × 20 × 8'], ['B · Lateral largo', '30 × 8', '8', '2 por caja'], ['C · Lateral corto', '19,6 × 8', '8', '20 − 2 × 0,2'], ['D · Fondo de cuadro', '25 × 35', '3', 'No girar: veta'] ] },
        { t: 'box', x: 0.6, y: 4.6, w: 8.2, h: 1.9, tone: 'light', label: 'Material', text: 'Cartón gris 2 mm · plancha 70 × 100 cm · 2 planchas · separación 0,2 cm · margen 0,5 cm · sobrante útil desde 5 cm. Datos ficticios; confirma el formato de tu proveedor.', size: 16 },
        { t: 'box', x: 9.2, y: 1.95, w: 3.5, h: 4.55, tone: 'accent', label: 'Actividad', head: 'Suma las piezas', text: '¿Cuántas piezas hay en total?', size: 18, headSize: 22 },
      ],
      notes: {
        say: 'Todos los datos del ejemplo tienen un origen. La plancha de 70 × 100 es un formato común. La separación de 0,2 cm es seguridad al cortar con cúter. El margen de 0,5 cm es por los bordes golpeados.',
        ask: '¿Cuántas piezas son en total?',
        answer: '4 + 8 + 8 + 3 = 23 piezas.',
        do: 'Carga el ejemplo: Copias → «Cargar el ejemplo "Papel y Forma"». Trae exactamente estos datos.',
        next: 'Revisemos cómo quedó en la app.',
      } }),
    s({ block: B3, min: [27, 30], title: 'Paso 1 · Material y medidas de corte',
      elements: [
        { t: 'bullets', x: 0.6, y: 1.95, w: 6.2, h: 4.6, size: 19, items: [
          'Nombre del material: Cartón gris 2 mm',
          'Unidad: centímetros',
          'Ancho (→) 70 · Largo (↓) 100',
          'Planchas disponibles: 2',
          'Separación 0,2 · Margen 0,5',
          'Sobrante útil desde 5' ] },
        { t: 'phone', file: 'cortes-02-material.png', x: 7.4, y: 1.95, h: 4.6, caption: 'Sección 01 · Material' },
        { t: 'box', x: 9.85, y: 1.95, w: 2.85, h: 4.55, tone: 'tint', label: 'Se guarda solo', text: 'Cada cambio se guarda en el teléfono en menos de un segundo. No hay botón «Guardar».', size: 15 },
      ],
      notes: {
        say: 'Revisamos la sección Material. Fíjate que la unidad es una sola para todo el proyecto. Cada campo se guarda solo, sin botón; arriba dice «Guardado en el teléfono» con la hora.',
        check: 'Que el guardado automático sobreviva a cerrar la app desde el selector de apps de Android (en Chromium se comprobó al cerrar y reabrir).',
        next: 'Ahora las piezas.',
      } }),
    s({ block: B3, min: [30, 33], title: 'Paso 2 · Piezas con letra, cantidad y giro',
      elements: [
        { t: 'bullets', x: 0.6, y: 1.95, w: 6.2, h: 4.6, size: 19, items: [
          'Cada tipo de pieza tiene su letra: A, B, C, D.',
          'Ancho, largo y cantidad.',
          '«Se puede girar»: sí en A, B y C.',
          'D, el fondo de cuadro: desmarcado.',
          'Abajo: total de piezas y área.' ] },
        { t: 'phone', file: 'cortes-03-piezas.png', x: 7.4, y: 1.95, h: 4.6, caption: 'Sección 02 · Piezas' },
        { t: 'box', x: 9.85, y: 1.95, w: 2.85, h: 4.55, tone: 'accent', label: 'Comprueba', text: '«23 piezas · 8199,4 cm² de piezas» en la barra inferior.', size: 16 },
      ],
      notes: {
        say: 'La barra de abajo da el total: 23 piezas y 8199,4 cm². Es un primer control: si el total no coincide con lo que calculaste, falta o sobra una pieza.',
        next: 'Generamos el plano.',
      } }),
    s({ block: B3, min: [33, 35], title: 'Paso 3 · Generar el plano y leer el resumen',
      elements: [
        { t: 'phone', file: 'cortes-04-plano-resumen.png', x: 0.6, y: 1.95, h: 4.6, caption: 'Resumen y verificación' },
        { t: 'stat', x: 3.6, y: 1.95, w: 3.0, value: '23 / 23', label: 'piezas colocadas', size: 44 },
        { t: 'stat', x: 6.7, y: 1.95, w: 3.0, value: '2 / 2', label: 'planchas usadas', size: 44 },
        { t: 'stat', x: 9.8, y: 1.95, w: 2.9, value: '58,6 %', label: 'aprovechamiento', size: 44 },
        { t: 'box', x: 3.6, y: 4.2, w: 9.1, h: 2.3, tone: 'tint', label: 'La línea «✓ Verificado» confirma', text: 'Ninguna pieza se sale del área útil ni se superpone · entre piezas hay al menos 0,2 cm · cantidades completas · los giros respetan lo permitido · se separa con cortes rectos de lado a lado.', size: 16 },
      ],
      notes: {
        say: 'Al tocar «Generar plano», la app calcula y verifica. Antes de mirar el dibujo, leemos el resumen: todas las piezas tienen lugar, usa 2 de 2 planchas y aprovecha 58,6 %. La línea «Verificado» es el resultado de una revisión independiente; si algo fallara, aparecería en rojo y diría «No cortes con este plano».',
        next: 'Ahora sí, el dibujo.',
      } }),
    s({ block: B3, min: [35, 38], title: 'Paso 4 · Leer el plano: códigos, giros y sobrantes',
      elements: [
        { t: 'image', file: 'cortes-06-svg-plancha1.png', x: 0.6, y: 1.95, w: SVG_W, h: 4.6, caption: 'Plancha 1 de 2 (captura real)' },
        { t: 'phone', file: 'cortes-08-leyenda.png', x: 4.3, y: 1.95, h: 4.6, caption: 'Leyenda: medida y posición' },
        { t: 'bullets', x: 6.85, y: 1.95, w: 5.85, h: 4.6, size: 17, items: [
          'Cada rectángulo lleva su código: D1, A1…',
          '↻: girada. A1 está como 20 × 30.',
          'Rayado: sobrante útil (S1.1 de 8 × 59,4 cm).',
          'En blanco: desperdicio menor de 5 cm.',
          'Posición desde la esquina de arriba a la izquierda: D1 en 0,5 → · 0,5 ↓.',
          'Botones +, − y Ajustar: de 100 % a 400 %.' ] },
      ],
      notes: {
        say: 'Cada pieza tiene su código. Las que llevan la flecha circular están giradas. Las zonas rayadas son sobrantes útiles, con su código y medida en la tabla; las zonas blancas son retazos más chicos que el mínimo. La leyenda dice dónde va cada pieza, medida desde la esquina superior izquierda: así se marca la plancha antes de cortar.',
        do: 'Toca «+» dos veces para mostrar la ampliación y desplázate con el dedo.',
        check: 'Legibilidad del plano y ampliación en pantallas pequeñas de teléfono; ampliar con dos dedos.',
        next: 'Probemos qué pasa si el material no alcanza.',
      } }),
    s({ block: B3, min: [38, 40], title: 'Paso 5 · Prueba: ¿y con una sola plancha?',
      elements: [
        { t: 'phone', file: 'cortes-11-una-plancha.png', x: 0.6, y: 1.95, h: 4.6, caption: 'Planchas disponibles: 1' },
        { t: 'bullets', x: 3.6, y: 1.95, w: 5.4, h: 4.6, size: 19, items: [
          'Cambia «Planchas disponibles» a 1.',
          'Genera de nuevo el plano.',
          '20 de 23 piezas.',
          'Pendientes: D1, D2, D3 · Fondo de cuadro.',
          'Motivo: «No alcanzó el material».' ] },
        { t: 'box', x: 9.3, y: 1.95, w: 3.4, h: 4.55, tone: 'accent', label: 'Decisión', head: 'Comprar 2 planchas', text: '2 × Q30 = Q60 (precio de ejemplo). Es lo que le faltó a Andrea.', size: 16, headSize: 21 },
      ],
      notes: {
        say: 'Esto es lo que le pasó a Andrea: con una plancha caben 20 piezas y quedan fuera los 3 fondos de cuadro. La app lo dice antes de cortar. Al terminar, vuelve a poner 2 planchas.',
        answer: 'Si cambias un dato después de generar, la app avisa que el plano guardado «ya no coincide».',
        next: 'Ahora, una pieza que no cabe por su forma.',
      } }),
    s({ block: B3, min: [40, 43], title: 'Paso 6 · Prueba: una pieza que no cabe sin girar',
      elements: [
        { t: 'phone', file: 'cortes-12-pieza-no-girar.png', x: 0.6, y: 1.95, h: 4.6, caption: 'E · Panel 75 × 50, no girar' },
        { t: 'phone', file: 'cortes-13-no-cabe.png', x: 3.55, y: 1.95, h: 4.6, caption: 'Pendiente con su motivo' },
        { t: 'image', file: 'cortes-14-svg-girada.png', x: 6.5, y: 1.95, w: SVG_W, h: 4.6, caption: 'Con giro: E1 entra como 50 × 75' },
        { t: 'box', x: 10.05, y: 1.95, w: 2.65, h: 4.55, tone: 'light', label: 'Resultado', text: ['Sin giro: 23 de 24.', 'Con giro: 24 de 24 y 85,4 %.', 'Luego quita el panel.'], list: true, size: 15 },
      ],
      notes: {
        say: 'Agregamos un panel de exhibición de 75 × 50 cm y desmarcamos «Se puede girar». Queda pendiente: «No cabe en esa orientación y está marcada "no girar"». Si el panel se puede girar, entra como 50 × 75 y el aprovechamiento sube a 85,4 %. Antes de seguir, quitamos el panel para dejar el ejemplo como estaba.',
        next: 'Antes del ejercicio: proteger el trabajo.',
      } }),
    s({ block: B3, min: [43, 45], title: 'Paso 7 · Respaldo: guardar, borrar y recuperar',
      elements: [
        { t: 'phone', file: 'cortes-22-copias.png', x: 0.6, y: 1.95, h: 4.3, caption: '1 · Guardar una copia' },
        { t: 'phone', file: 'cortes-23-recuperar.png', x: 3.55, y: 1.95, h: 4.3, caption: '3 · Qué pasará' },
        { t: 'phone', file: 'cortes-24-recuperado.png', x: 6.5, y: 1.95, h: 4.3, caption: '4 · Volvió (captura del ejercicio)' },
        { t: 'box', x: 9.45, y: 1.95, w: 3.25, h: 4.55, tone: 'dark', label: 'Guardado ≠ copia', text: ['La app guarda en el teléfono. Si lo pierdes o la desinstalas, se pierde.', 'La copia es un .zip que tú guardas en Drive o en el correo.', 'Marca «Incluir también el ejemplo» para respaldar la práctica.'], list: true, size: 14 },
      ],
      notes: {
        say: 'La app guarda los proyectos en el teléfono, sin internet. Eso no es una copia de seguridad: si desinstalas la app, borras sus datos o pierdes el teléfono, se va todo, y la app no usa el respaldo automático de Google. Hagamos la prueba completa: Copias, marca «Incluir también el ejemplo», «Guardar una copia». Luego eliminamos un proyecto a propósito y lo recuperamos: la app muestra qué contiene la copia; «Agregar lo nuevo» agrega lo que no existe en el teléfono y no actualiza lo que ya existe, aunque la copia tenga cambios más recientes; la vista previa dice cuántos se agregan y cuántos se omiten. «Reemplazar todo» pide confirmación y se puede deshacer.',
        do: 'En la demostración puedes eliminar el ejemplo y recuperarlo. En el ejercicio, cada participante lo hace con su propio proyecto de práctica.',
        answer: 'Aviso: «Copia recuperada: se agregaron 1 proyecto». El plano vuelve con él.',
        check: 'Selector de Android al guardar (Descargas o Drive) y al recuperar; recuperar en un segundo teléfono; conservar los datos al instalar una versión nueva encima. En Chromium se comprobó guardar, eliminar y recuperar.',
        next: 'Tu turno con otro pedido.',
      } }),

    // ═════ 4 · EJERCICIO ═════
    s({ block: B4, min: [45, 47], title: 'Tu turno: cajitas de recuerdo para Detalles Ixchel',
      elements: [
        { t: 'bullets', x: 0.6, y: 1.95, w: 6.4, h: 2.4, size: 19, items: [
          'Detalles Ixchel (Antigua Guatemala) hace recuerdos de primera comunión.',
          'Pedido: 12 cajitas de 10 × 10 × 5 cm, con tapa.',
          'Mismo cartón gris de 2 mm, en planchas de 70 × 100 cm.' ] },
        { t: 'table', x: 0.6, y: 4.4, w: 6.4, colW: [2.6, 1.6, 2.2], size: 15, rowH: 0.36, rows: [
          ['Pieza', 'Medida (cm)', 'Cantidad'], ['A · Base', '10 × 10', '12'], ['B · Lateral largo', '10 × 5', '¿?'], ['C · Lateral corto', '¿?', '¿?'], ['D · Tapa', '10,4 × 10,4', '12'] ] },
        { t: 'box', x: 7.4, y: 1.95, w: 5.3, h: 4.55, tone: 'accent', label: 'Antes de cargar, calcula', text: ['¿Cuántos laterales de cada tipo? (2 por cajita)', '¿Cuánto mide el lateral corto?', 'La tapa sobresale 0,2 cm por lado: 10 + 2 × 0,2.', 'Separación 0,2 · margen 0,5 · sobrante útil desde 5.'], list: true, size: 17 },
      ],
      notes: {
        say: 'Ahora otro pedido, también ficticio. Primero calculen en papel lo que falta en la tabla. Tienen 2 minutos.',
        answer: 'B: 10 × 5 cm, 24 (2 por cajita × 12). C: 9,6 × 5 cm (10 − 2 × 0,2), 24. Total: 12 + 24 + 24 + 12 = 72 piezas.',
        next: 'Los pasos.',
      } }),
    s({ block: B4, min: [47, 60], title: 'Pasos del ejercicio · 13 minutos',
      elements: [
        { t: 'bullets', plain: true, x: 0.6, y: 1.95, w: 6.1, h: 4.6, size: 18, items: [
          '1. + Nuevo proyecto «Cajitas de recuerdo». Marca «Es de práctica».',
          '2. Material: Cartón gris 2 mm, cm, 70 × 100, 1 plancha, 0,2 y 0,5.',
          '3. Las 4 piezas con sus cantidades.',
          '4. Revisa abajo: 72 piezas · 4849,92 cm².',
          '5. Genera el plano. Anota piezas, planchas y aprovechamiento.' ] },
        { t: 'bullets', plain: true, x: 7.0, y: 1.95, w: 5.7, h: 4.6, size: 18, items: [
          '6. Reto: agrega «Bandeja exhibidora» de 40 × 60, cantidad 1, sin giro (la veta va a lo largo).',
          '7. ¿Qué pasa con 1 plancha? ¿Y con 2?',
          '8. Guarda en PDF el plano final.',
          '9. Guarda una copia (incluye el ejemplo), elimina el proyecto y recupéralo.' ] },
      ],
      notes: {
        say: 'Trabajen solos con estos pasos. El paso 6 es el reto: piensen antes de generar si la bandeja va a caber.',
        do: 'A los 5 minutos, pide que escriban en el chat sus tres números del paso 5. A los 10, los del paso 7.',
        answer: 'Paso 5: 72 de 72, 1 de 1, 69,3 %. Paso 7: con 1 plancha, 48 de 73 y 25 pendientes por falta de material (B24 y C1 a C24); con 2 planchas, 73 de 73 y 51,8 %.',
        check: 'Imprimir → «Guardar como PDF» desde el APK. En Chromium se comprobó que el plano sale en PDF, una plancha por página.',
        next: 'Los errores que más se repiten.',
      } }),
    s({ block: B4, min: [60, 63], title: 'Errores frecuentes y cómo detectarlos',
      elements: [
        { t: 'table', x: 0.6, y: 1.95, w: 12.1, colW: [3.8, 4.3, 4.0], size: 15, rows: [
          ['Error', 'Cómo se nota', 'Arreglo'],
          ['Lateral corto de 10 en vez de 9,6', 'La caja no cierra al armar', 'Restar 2 grosores'],
          ['Cantidad por caja y no por pedido', 'Total de piezas: 6 en vez de 72', 'Multiplicar × 12'],
          ['Grosor en mm con unidad cm', 'Separación de 2 cm', 'Escribir 0,2'],
          ['Ancho y largo invertidos con «no girar»', 'Pieza pendiente o veta mal', 'Revisar → y ↓'],
          ['Cambiar un dato y cortar con el plano viejo', 'Aviso «ya no coincide»', 'Generar de nuevo'],
          ['Creer que el plano es «el mejor posible»', '—', 'Es propuesta comprobada'] ] },
      ],
      notes: {
        say: 'La app verifica el plano con los datos que le das, pero no puede saber si la lista de piezas está bien pensada: eso es tuyo. El total de piezas y el área de la barra inferior son tu primer control.',
        ask: '¿Cuál te pasó? Respondan con el número de fila.',
        next: 'Comprobemos.',
      } }),
    s({ block: B4, min: [63, 65], title: 'Comprueba tu resultado',
      elements: [
        { t: 'bullets', plain: true, x: 0.6, y: 1.95, w: 6.6, h: 4.6, size: 18, items: [
          '☐ Proyecto con etiqueta EJEMPLO.',
          '☐ 72 piezas · 4849,92 cm².',
          '☐ Sin bandeja: 72 de 72, 1 plancha, 69,3 %.',
          '☐ Bandeja sin giro: E1 de 40 × 60.',
          '☐ 1 plancha: 48 de 73, motivo «No alcanzó el material».',
          '☐ 2 planchas: 73 de 73, línea «✓ Verificado».',
          '☐ PDF guardado y proyecto recuperado desde la copia.' ] },
        { t: 'image', file: 'cortes-18-svg-ejercicio.png', x: 7.6, y: 1.95, w: SVG_W, h: 4.6, caption: 'Las 72 piezas en 1 plancha' },
        { t: 'box', x: 11.1, y: 1.95, w: 1.6, h: 4.55, tone: 'accent', label: 'S1.5', text: 'Sobrante de 38 × 36,4 cm', size: 14 },
      ],
      notes: {
        say: 'Si tus números coinciden, tu plano es el mismo que el mío: la app es determinista, con los mismos datos da el mismo plano. Si no coinciden, revisa la lista: casi siempre es una cantidad o una medida.',
        next: 'Ahora sumamos la IA, como herramienta externa.',
      } }),

    // ═════ 5 · IA ═════
    s({ block: B5, min: [65, 67], title: 'La IA trabaja afuera de la app',
      elements: [
        { t: 'flow', x: 0.6, y: 1.95, w: 12.1, h: 2.1, headSize: 19, size: 14, steps: [
          { head: 'Organizar', text: 'Describe el producto y junta sus medidas.' },
          { head: 'Consultar', text: 'Pega un prompt en ChatGPT o Claude.' },
          { head: 'Verificar', text: 'Rehaz cada cuenta y revisa cada medida.' },
          { head: 'Aplicar', text: 'Carga tú las piezas y genera el plano.' } ] },
        { t: 'table', x: 0.6, y: 4.35, w: 12.1, colW: [4.0, 4.0, 4.1], size: 15, rows: [
          ['La app hace', 'La IA externa ayuda a', 'Tú verificas y decides'],
          ['Calcular y verificar el plano', 'Pasar de producto a lista de piezas', 'Medidas, grosores y cantidades'],
          ['Marcar pendientes y sobrantes', 'Revisar la lista antes de cargarla', 'Qué piezas no se giran'],
          ['Guardar, PDF y copias', 'Hacer cuentas de costo por unidad', 'Precio real y cuántas planchas compras'] ] },
      ],
      notes: {
        say: 'La app no tiene IA adentro y funciona sin internet. La IA externa necesita internet y sirve para pensar la lista de piezas y hacer cuentas, no para dibujar el plano: un plano dibujado por una IA no está verificado. El ciclo: organizo, consulto, verifico y aplico en la app. No compartas datos de tus clientes: basta con el producto y sus medidas.',
        next: 'Prompt 1: de la idea a la lista de piezas.',
      } }),
    s({ block: B5, min: [67, 71], title: 'Prompt 1 · Del producto a la lista de piezas',
      elements: [
        { t: 'code', x: 0.6, y: 1.95, w: 7.6, h: 4.55, size: 14, text: 'Fabrico [producto] con [material y grosor].\nMedidas finales: [ancho × largo × alto].\nCómo se arma: [qué va entre qué].\nUnidades a fabricar: [cantidad].\nHaz una tabla: Pieza | Ancho | Largo |\nCantidad total | ¿Se puede girar? | Cuenta.\n- Muestra cada cuenta (restar grosores).\n- Si falta un dato, escribe SIN DATO.\n- Giro: "No" solo si mencioné veta o\n  estampado; si no, "Preguntar".\n- Todo en [cm]. Al final, mis preguntas.' },
        { t: 'box', x: 8.6, y: 1.95, w: 4.1, h: 2.15, tone: 'light', label: 'Qué das', text: 'Producto, material, grosor, medidas finales, cómo se arma y cuántas unidades.', size: 15 },
        { t: 'box', x: 8.6, y: 4.35, w: 4.1, h: 2.15, tone: 'accent', label: 'Qué verificas', text: 'Rehaz cada resta (10 − 2 × 0,2 = 9,6). Multiplica por unidades. Arma una pieza de muestra si dudas.', size: 15 },
      ],
      notes: {
        say: 'Probemos con las cajitas: «Fabrico cajitas con tapa con cartón gris de 2 mm, medidas finales 10 × 10 × 5 cm, los laterales cortos van entre los largos, la tapa sobresale 0,2 cm por lado, 12 unidades». Comparemos la tabla con la nuestra.',
        do: 'Hazlo en vivo y compara con la tabla del ejercicio.',
        answer: 'Debe dar 12 bases de 10 × 10, 24 laterales de 10 × 5, 24 de 9,6 × 5 y 12 tapas de 10,4 × 10,4. Si da otra cosa, la IA se equivocó o faltó información en el prompt.',
        next: 'Prompt 2: revisar antes de cargar.',
      } }),
    s({ block: B5, min: [71, 75], title: 'Prompt 2 · Revisar la lista antes de cargarla',
      elements: [
        { t: 'code', x: 0.6, y: 1.95, w: 7.6, h: 3.4, size: 14, text: 'Revisa esta lista para mi app de cortes.\nMaterial: [ancho × largo, unidad, planchas].\nSeparación: [valor]. Margen: [valor].\nDime solamente:\n- Medidas faltantes, en cero o dudosas.\n- Piezas más anchas o largas que el área\n  útil (¿cabrían giradas?).\n- Área total de piezas vs. área útil.\nNo cambies medidas. Lista: [pega aquí]' },
        { t: 'box', x: 0.6, y: 5.55, w: 7.6, h: 0.95, tone: 'light', label: 'Qué das', text: 'La lista de piezas y los datos del material.', size: 15 },
        { t: 'box', x: 8.6, y: 1.95, w: 4.1, h: 4.55, tone: 'accent', label: 'Qué verificas', text: ['Área útil: (70 − 1) × (100 − 1) = 6831 cm².', 'Con bandeja: 7249,92 cm² > 6831: no cabe en 1 plancha, aunque se acomode bien.', 'El área es referencia: si alcanza, el plano decide.'], list: true, size: 15 },
      ],
      notes: {
        say: 'Este prompt anticipa problemas. Con el reto de la bandeja, el área total pasa a 7249,92 cm², más que los 6831 cm² útiles de una plancha: ya sabemos que hacen falta dos antes de generar el plano. Al revés no funciona: que el área alcance no garantiza que todo quepa, como vimos con el panel.',
        answer: '4849,92 + 2400 = 7249,92 cm². 7249,92 > 6831.',
        next: 'Prompt 3: decidir con el plano en la mano.',
      } }),
    s({ block: B5, min: [75, 80], title: 'Prompt 3 · Decidir la compra y el costo por unidad',
      elements: [
        { t: 'code', x: 0.6, y: 1.95, w: 7.6, h: 3.2, size: 14, text: 'Mi app de cortes dio: [piezas colocadas,\nplanchas usadas, pendientes y motivo,\nsobrantes]. Precio por plancha: [Q].\nUnidades del pedido: [cantidad].\nCalcula, mostrando cada cuenta:\n- Costo de material del pedido.\n- Costo de material por unidad.\nNo hagas un plano. Si falta un dato, pídelo.' },
        { t: 'table', x: 0.6, y: 5.35, w: 7.6, colW: [3.8, 3.8], size: 15, rowH: 0.38, rows: [
          ['Caso (Q30 por plancha, ejemplo)', 'Cuenta'], ['12 cajitas en 1 plancha', 'Q30 ÷ 12 = Q2,50 por cajita'], ['Con bandeja: 2 planchas', '2 × Q30 = Q60 el pedido'] ] },
        { t: 'box', x: 8.6, y: 1.95, w: 4.1, h: 4.55, tone: 'accent', label: 'Qué verificas y decides', text: ['Rehaz las cuentas con calculadora.', 'Usa el precio real de tu proveedor.', 'Con bandeja queda S2.2 de 69 × 78,2 cm: ¿lo usarás en otro pedido?', 'Solo es material: falta mano de obra y otros insumos.'], list: true, size: 15 },
      ],
      notes: {
        say: 'Con los números del plano, la IA ayuda a hacer cuentas, pero la decisión es tuya. Doce cajitas caben en una plancha: Q30 entre 12 son Q2,50 de cartón por cajita. Si agregan la bandeja, hace falta una segunda plancha: Q60 el pedido, y queda un sobrante grande de 69 × 78,2 cm. ¿Se compra la segunda plancha o la bandeja se hace con otro material? Eso lo decide el negocio, no la IA.',
        answer: '30 ÷ 12 = 2,50. 2 × 30 = 60. 69 × 78,2 = 5395,8 cm², cerca del 77 % de una plancha.',
        next: 'Cerremos revisando el ejercicio.',
      } }),

    // ═════ 6 · REVISIÓN ═════
    s({ block: B6, min: [80, 84], title: 'Solución del ejercicio',
      elements: [
        { t: 'table', x: 0.6, y: 1.95, w: 7.6, colW: [3.4, 2.1, 2.1], size: 15, rowH: 0.4, rows: [
          ['', '1 plancha', '2 planchas'], ['Sin bandeja (72 piezas)', '72 de 72 · 69,3 %', '—'], ['Con bandeja (73 piezas)', '48 de 73 · 25 pend.', '73 de 73 · 51,8 %'], ['Pendientes con 1 plancha', 'B24 y C1–C24', 'ninguna'], ['Material (Q30, ejemplo)', 'Q30', 'Q60'] ] },
        { t: 'image', file: 'cortes-21-svg-bandeja-p2.png', x: 8.65, y: 1.95, w: SVG_W, h: 4.6, caption: 'Con bandeja: plancha 2 y S2.2' },
        { t: 'box', x: 0.6, y: 4.25, w: 7.6, h: 2.25, tone: 'tint', label: 'Por qué', text: ['Laterales cortos: 10 − 2 × 0,2 = 9,6 cm. Tapa: 10 + 2 × 0,2 = 10,4 cm.', 'Aprovechamiento: 4849,92 ÷ 7000 = 69,3 %. Con bandeja: 7249,92 ÷ 14 000 = 51,8 %.', 'La bandeja entra primero (es la más grande) y desplaza a los laterales.'], list: true, size: 15 },
      ],
      notes: {
        say: 'Revisemos. Sin bandeja, las 72 piezas caben en una plancha. Con bandeja, la app la coloca primero por ser la más grande, y con una plancha quedan 25 piezas pendientes: un lateral largo y los 24 cortos. Con dos planchas cabe todo. Lo importante: los motivos de los pendientes y la decisión de compra.',
        ask: 'Vuelve a la pregunta del día: si el área cabe, ¿las piezas caben?',
        answer: 'No siempre: hay que comparar medidas y orientación. Y si el área NO cabe, seguro hace falta más material.',
        next: 'Una rutina para usarlo mañana.',
      } }),
    s({ block: B6, min: [84, 90], dark: true, title: 'Tu rutina y la tarea de mañana',
      elements: [
        { t: 'flow', x: 0.6, y: 1.95, w: 12.1, h: 1.9, headSize: 18, size: 13, steps: [
          { head: 'Listar', text: 'Piezas y cuentas' }, { head: 'Cargar', text: 'Material real' }, { head: 'Plano', text: 'Leer pendientes' }, { head: 'Decidir', text: 'Planchas y costo' }, { head: 'Copia', text: 'Cada viernes' } ] },
        { t: 'box', x: 0.6, y: 4.15, w: 7.2, h: 2.35, tone: 'accent', label: 'Tarea para mañana', text: ['Mide tu material real y el próximo pedido.', 'Haz su plano y guárdalo en PDF.', 'Calcula el costo de material por unidad con tu precio.', 'Guarda una copia y quita el ejemplo.'], list: true, size: 16 },
        { t: 'box', x: 8.2, y: 4.15, w: 4.5, h: 2.35, tone: 'light', label: 'Antes de cortar', head: 'Mide dos veces, corta una', headSize: 20, text: 'Marca cada pieza con su código.', size: 15 },
      ],
      notes: {
        say: 'La rutina: listar piezas con sus cuentas, cargar el material real, leer el plano y sus pendientes, decidir cuántas planchas y cuánto cuesta por unidad, y guardar una copia cada viernes. La tarea: el plano de tu próximo pedido real. Al terminar de practicar, quita el ejemplo desde Copias.',
        do: 'Abre dudas (4 min).',
        check: 'Pendientes de comprobar en un teléfono real antes de repetir el taller: instalación del APK, guardado al cerrar, reiniciar y actualizar, copias con el selector de Android y Drive, recuperación en otro teléfono, imprimir como PDF, ampliación del plano en pantalla chica, modo avión y botón Atrás.',
      } }),
  ],
};
