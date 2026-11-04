// Contenido del taller «Mide una vez, encuéntralo siempre» (app Mi fichero de trabajos a medida).
// Todo lo que se dice de la app corresponde al código de talleres/fichero (versión 1.0.0).
// Datos de demostración y ejercicio: ficticios.

const B1 = '1 · Situación'; const B2 = '2 · Conceptos'; const B3 = '3 · Demostración guiada';
const B4 = '4 · Ejercicio práctico'; const B5 = '5 · IA como herramienta externa'; const B6 = '6 · Revisión y plan';
const s = (o) => ({ ...o, blockLabel: o.block });

const PHONE_PENDIENTE = 'La app se probó de forma automática en Chromium (escritorio y ancho de teléfono). El APK compila y está firmado, pero aún no se ha instalado ni probado en un teléfono Android real.';

export default {
  file: 'Taller-Fichero-Mide-una-vez.pptx',
  title: 'Mide una vez, encuéntralo siempre',
  footer: 'Mide una vez, encuéntralo siempre · Mi fichero de trabajos a medida',
  theme: {
    name: 'Fichero', headFontFace: 'Cambria', bodyFontFace: 'Calibri',
    colors: { dk1: '141A33', lt1: 'FBF8F1', dk2: '1630A8', lt2: 'FFFFFF', accent1: '1630A8', accent2: '6B7A2A', accent3: 'DFE8A6', accent4: 'E8EBF7', accent5: 'A3221B', accent6: '4F566E', hlink: '1630A8', folHlink: '6B7A2A' },
  },
  guionIntro: [
    '**Taller en línea · 90 minutos · emprendedores y personas de oficio que fabrican a medida** (cortinas, tapicería, confección y oficios parecidos).',
    '',
    '**Objetivos observables.** Al terminar, cada participante:',
    '1. Registra un trabajo en una ficha con medidas en su unidad, especificaciones y una foto, dejando vacío lo que no midió («Sin dato», no cero).',
    '2. Corrige una medida creando una versión nueva y muestra en el Historial qué cambió.',
    '3. Usa una IA externa para ordenar apuntes y detectar datos faltantes, verifica la respuesta y la aplica en la app.',
    '',
    '**Resultado.** La app instalada; un proyecto de práctica con fichas completas y una hoja de trabajo en PDF; una copia de seguridad guardada y recuperada; una plantilla adaptada a su oficio.',
    '',
    '**Antes de empezar (preparación).**',
    '- Instala el APK `fichero-1.0.0.apk` en tu teléfono y comparte pantalla del teléfono (con la app de videollamada o con un espejo de pantalla).',
    '- Envía con un día de anticipación el enlace del APK y la hoja de práctica. Solo funciona en **Android 7 o más reciente**: quien tenga iPhone sigue la demostración y hace la práctica en papel o en pareja.',
    '- Ten abierta una IA externa (ChatGPT o Claude) en otra ventana. La app **no tiene IA integrada**.',
    `- ${PHONE_PENDIENTE} Antes del primer taller, comprueba en un teléfono real todo lo marcado como «Pendiente de comprobar en un teléfono real».`,
    '- Funciones que el taller no puede enseñar porque **la app no las tiene**: precios o cotizaciones, enviar la hoja directo por WhatsApp (se guarda el PDF y se comparte desde el teléfono), sincronizar entre teléfonos, buscar dentro de medidas o especificaciones (el buscador revisa nombre y teléfono del cliente, proyecto y nombre de ficha), medir a partir de fotos.',
  ].join('\n'),
  slides: [
    // ═════ 1 · SITUACIÓN (0–10) ═════
    s({ block: B1, min: [0, 2], cover: true, kicker: 'TALLER EN LÍNEA · 90 MINUTOS', title: 'Mide una vez,\nencuéntralo siempre', subtitle: 'Tu fichero de medidas y especificaciones en el teléfono, con apoyo de inteligencia artificial',
      elements: [{ t: 'text', x: 0.6, y: 6.35, w: 11, h: 0.4, text: 'App: Mi fichero de trabajos a medida · Para personas que fabrican a medida', size: 16, color: 'light' }],
      notes: {
        say: 'Bienvenida. Hoy vamos a resolver algo que pasa en casi todos los talleres: medir bien un trabajo y, semanas después, no encontrar las medidas o no saber cuál era la correcta. Vamos a usar una app que guarda todo en el teléfono y una IA externa para ordenar apuntes.',
        do: 'Preséntate en 30 segundos. Pide que escriban en el chat su oficio y su ciudad.',
        prep: 'Ten tu teléfono con la app instalada y vacía (sin proyectos). Ten listo el ejemplo «Entre Hilos» por si algo falla: Copias → «Cargar el ejemplo». Ten abierta la IA externa en otra pestaña.',
        check: PHONE_PENDIENTE,
        next: 'Empecemos con una historia que seguro les suena.',
      } }),
    s({ block: B1, min: [2, 5], title: '¿Dónde quedaron las medidas?',
      elements: [
        { t: 'bullets', x: 0.6, y: 1.95, w: 6.6, h: 2.7, size: 22, items: [
          'Rosa tiene «Entre Hilos», un taller de cortinas en Mixco.',
          'Mide en casa de la clienta y anota en un cuaderno.',
          'Manda fotos por WhatsApp a su costurera.',
          'Tres meses después, la clienta pide «otra igual».' ] },
        { t: 'box', x: 0.6, y: 4.85, w: 6.6, h: 1.55, tone: 'accent', label: 'Actividad · chat', text: '¿Dónde anotas hoy tus medidas? Escribe una palabra: cuaderno, WhatsApp, memoria…', size: 18 },
        { t: 'code', x: 7.75, y: 1.95, w: 5.0, h: 3.9, size: 15, text: 'Lucía R – cortinas casa\nsala: ventana 1.80 ancho x 150\nalto. riel 2.20. del riel al piso\n2,50. techo-riel 10cm. 2 paños\ncomedor: 120 x 140, riel 160,\nal piso 240. 1 paño\nojo: volver a medir ancho sala' },
        { t: 'text', x: 7.75, y: 6.0, w: 5.0, h: 0.6, size: 13, text: 'Apuntes ficticios, como los deja una visita real: unidades mezcladas y un dato que falta.' },
      ],
      notes: {
        say: 'Rosa y su negocio son ficticios, pero la situación es real. Lean los apuntes de la derecha: hay metros y centímetros mezclados, y una nota que dice «volver a medir». Si Rosa pierde el cuaderno o confunde la versión, el error se paga en tela.',
        ask: 'Pide que escriban en el chat dónde anotan hoy sus medidas. Lee 4 o 5 respuestas en voz alta.',
        answer: 'Cuaderno, hojas sueltas, WhatsApp, fotos con flechas, memoria. Todas valen; el problema es que quedan dispersas y sin historial.',
        next: '¿Qué pasa cuando eso sale mal?',
      } }),
    s({ block: B1, min: [5, 8], title: 'Improvisar sale caro',
      elements: [
        { t: 'stat', x: 0.6, y: 1.95, w: 4.4, value: 'Q221', label: 'tela para rehacer un paño\n(2,60 m × Q85 el metro)', size: 72 },
        { t: 'bullets', x: 5.4, y: 1.95, w: 7.3, h: 3.2, size: 21, items: [
          'Cortó con 180 cm de ancho; la ventana medía 182 cm.',
          'El paño quedó corto: hubo que repetirlo.',
          'Más medio día de trabajo y una entrega tarde.',
          'Nadie sabía qué medida era la última.' ] },
        { t: 'box', x: 5.4, y: 5.25, w: 7.3, h: 1.25, tone: 'tint', label: 'Cómo sale la cuenta', text: '250 cm del riel al piso + 10 cm de dobladillo = 260 cm = 2,60 m. 2,60 × Q85 = Q221. Precio de ejemplo: usa el de tu proveedor.', size: 16 },
      ],
      notes: {
        say: 'Este es el costo de no tener una medida confiable. La cuenta es sencilla: el paño va del riel al piso, 250 cm, más 10 cm de dobladillo: 260 cm de tela, o sea 2,60 m. A Q85 el metro (precio de ejemplo) son Q221, sin contar la mano de obra ni el viaje.',
        ask: '¿A alguien le ha pasado algo parecido? ¿Cuánto le costó? Pide uno o dos ejemplos por micrófono.',
        answer: 'Ejemplos típicos: cortar de menos, comprar material de más, volver a medir en otra visita.',
        next: 'Entonces, ¿qué necesita una medida para ser útil dentro de seis meses?',
      } }),
    s({ block: B1, min: [8, 10], title: 'Lo que vas a lograr hoy',
      elements: [
        { t: 'flow', x: 0.6, y: 1.95, w: 12.1, h: 2.2, headSize: 18, size: 14, steps: [
          { head: 'Registrar', text: 'Una ficha con medidas, unidad, especificaciones y foto.' },
          { head: 'Corregir', text: 'Una medida, con versión nueva e historial.' },
          { head: 'Usar IA externa', text: 'Ordenar apuntes, verificar y aplicar en la app.' } ] },
        { t: 'box', x: 0.6, y: 4.45, w: 7.4, h: 2.05, tone: 'accent', label: 'Al terminar tendrás', text: ['La app instalada y adaptada a tu oficio.', 'Un proyecto de práctica resuelto con su hoja de trabajo en PDF.', 'Una copia de seguridad guardada y recuperada.'], list: true, size: 17 },
        { t: 'box', x: 8.3, y: 4.45, w: 4.4, h: 2.05, tone: 'light', label: 'Pregunta del día', head: '¿Qué necesita una medida para ser útil en 6 meses?', headSize: 19 },
      ],
      notes: {
        say: 'Estos son los tres objetivos: los vamos a poder ver en tu teléfono al final. Y esta es la pregunta que vamos a responder durante la clase.',
        ask: 'Pide respuestas rápidas en el chat a la pregunta del día. No la respondas todavía: vuelve a ella al final.',
        answer: 'Nombre de lo que se midió, número, unidad, fecha, y saber si es la última versión.',
        next: 'Antes de abrir la app, aprendamos cuatro ideas que la hacen útil.',
      } }),

    // ═════ 2 · CONCEPTOS (10–25) ═════
    s({ block: B2, min: [10, 13], title: 'Cliente, proyecto y ficha',
      elements: [
        { t: 'flow', x: 0.6, y: 1.95, w: 12.1, h: 2.0, headSize: 22, size: 15, steps: [
          { n: '1', head: 'Cliente', text: 'Lucía Ramírez' },
          { n: '2', head: 'Proyecto', text: 'Cortinas sala y comedor' },
          { n: '3', head: 'Ficha', text: 'Ventana sala · Ventana comedor' } ] },
        { t: 'bullets', x: 0.6, y: 4.3, w: 7.6, h: 2.3, size: 20, items: [
          'Una ficha por cada cosa que fabricas: una ventana, un sillón, una prenda.',
          'La ficha nace de una plantilla: Cortina, Mueble tapizado, Prenda a medida o libre.',
          'El buscador encuentra por nombre de cliente, proyecto o ficha.' ] },
        { t: 'box', x: 8.6, y: 4.3, w: 4.1, h: 2.2, tone: 'light', label: 'Pregunta', head: 'En tu oficio, ¿qué sería una «ficha»?', headSize: 19 },
      ],
      notes: {
        say: 'La app ordena la información en tres niveles. El cliente es la persona. El proyecto es el encargo: «cortinas de sala y comedor». Cada ficha es una pieza que se fabrica y se mide aparte. Si la clienta tiene dos ventanas distintas, son dos fichas en el mismo proyecto.',
        ask: '¿Qué sería una ficha en tu oficio? Ejemplos: una silla, un vestido, una puerta.',
        answer: 'Cualquier objeto que se mide y se fabrica por separado.',
        next: 'Dentro de la ficha, lo más importante son las medidas.',
      } }),
    s({ block: B2, min: [13, 19], title: 'Una medida útil: nombre, número y unidad',
      elements: [
        { t: 'table', x: 0.6, y: 1.95, w: 7.0, colW: [3.2, 1.5, 2.3], size: 17, rows: [
          ['Lo que anotaste', 'Valor', 'Problema'],
          ['ventana 1.80', '1.80', '¿metros o cm?'],
          ['riel 2.20', '2.20', '¿metros o cm?'],
          ['techo-riel', '—', 'no se midió'],
          ['Ancho de ventana', '180 cm', { text: 'Completo', bold: true, color: 'accent2' }] ] },
        { t: 'box', x: 0.6, y: 4.75, w: 7.0, h: 1.75, tone: 'accent', label: 'Regla', head: 'Vacío no es cero', text: 'Si no mediste, deja el campo vacío: la app escribe «Sin dato». El 0 solo para una medida que de verdad es cero.', size: 16, headSize: 24 },
        { t: 'phone', file: 'fichero-10b-comedor-sin-dato.png', x: 8.2, y: 1.95, h: 4.6, caption: 'Captura real: «Sin dato» en la ficha' },
        { t: 'text', x: 10.55, y: 2.1, w: 2.2, h: 3.5, size: 15, text: 'La app acepta coma o punto decimal.\n\nUnidades: mm, cm, m, pulg y unid.\n\nSi escribes «2.200» en cm, pregunta si quisiste decir 2200 o 2.2.' },
      ],
      notes: {
        say: 'Una medida sin unidad no sirve: «1.80» puede ser 1,80 m o un error. Cada medida en la app tiene su nombre, su número y su unidad, y la unidad se elige en cada medida. La regla más importante del taller: vacío no es cero. Si no mediste del techo al riel, el campo queda vacío y la ficha dice «Sin dato». Un cero significaría que el riel está pegado al techo.',
        ask: 'Pregunta: «En la ventana del comedor no se midió del techo al riel. ¿Qué escribimos: 0 o nada?»',
        answer: 'Nada. Queda vacío y aparece como «Sin dato». En la hoja de trabajo dirá «SIN DATO — completar».',
        do: 'Señala en la captura la línea «Del techo al riel · Sin dato» con el círculo vacío.',
        next: 'No todo es número: también hay que registrar materiales y acabados.',
      } }),
    s({ block: B2, min: [19, 21], title: 'Especificaciones y fotos',
      elements: [
        { t: 'bullets', x: 0.6, y: 1.95, w: 6.0, h: 3.0, size: 20, items: [
          'Especificación: lo que no es número. Tela, color, forro, acabado.',
          'Las plantillas traen opciones para tocar: Ondas, Blackout, Dobladillo 10 cm.',
          'La foto es referencia visual: tela elegida, riel, detalle.' ] },
        { t: 'box', x: 0.6, y: 5.0, w: 6.0, h: 1.5, tone: 'dark', label: 'Importante', text: 'La app no mide nada a partir de una foto. Las medidas las escribe y verifica la persona.', size: 17 },
        { t: 'phone', file: 'fichero-06-especificaciones.png', x: 7.2, y: 1.95, h: 4.6, caption: 'Especificaciones con opciones' },
        { t: 'phone', file: 'fichero-07-fotos.png', x: 10.2, y: 1.95, h: 4.6, caption: 'Foto con descripción' },
      ],
      notes: {
        say: 'Las especificaciones responden «¿con qué y cómo?». En la plantilla de cortina hay tipo, tela, color, forro, acabado del dobladillo y recogido; puedes tocar una opción o escribir otra. La foto se toma con la cámara o se elige de la galería y lleva una descripción. Ojo: la app no calcula medidas desde la foto, ni tiene inteligencia artificial adentro.',
        check: 'Tomar foto con la cámara y elegir de la galería desde el APK (en Chromium se probó adjuntar un archivo de imagen).',
        next: '¿Qué pasa cuando hay que corregir una medida?',
      } }),
    s({ block: B2, min: [21, 23], title: 'Corregir sin borrar: versiones',
      elements: [
        { t: 'flow', x: 0.6, y: 1.95, w: 6.6, h: 1.9, headSize: 18, size: 14, steps: [
          { n: 'v1', head: '180 cm', text: 'Primera medición' },
          { n: 'v2', head: '182 cm', text: '«Se volvió a medir»' } ] },
        { t: 'bullets', x: 0.6, y: 4.15, w: 6.6, h: 2.4, size: 19, items: [
          'Mientras escribes, todo queda como borrador en el teléfono.',
          '«Guardar versión» crea una versión nueva; las anteriores se conservan.',
          'El Historial muestra qué cambió y por qué.' ] },
        { t: 'phone', file: 'fichero-12-historial.png', x: 8.2, y: 1.95, h: 4.6, caption: 'Historial: 180 cm → 182 cm' },
      ],
      notes: {
        say: 'Cuando corriges, no se borra lo anterior: se crea la versión 2 y el historial lo dice en palabras: «Ancho de ventana: 180 cm → 182 cm», con el motivo que escribiste. Si cierras la app a mitad de una edición, el borrador se queda guardado y la ficha avisa «Hay cambios sin guardar como versión».',
        answer: 'Si guardas sin cambiar nada, la app no crea versión nueva y lo avisa.',
        next: 'Y una idea que casi nadie tiene clara: guardar no es lo mismo que respaldar.',
      } }),
    s({ block: B2, min: [23, 25], dark: true, title: 'Guardado en el teléfono ≠ copia de seguridad',
      elements: [
        { t: 'table', x: 0.6, y: 1.95, w: 7.6, colW: [4.4, 3.2], size: 16, headFill: 'accent', rows: [
          ['Si…', 'Tus fichas'],
          ['Cierras y vuelves a abrir la app', 'Siguen ahí'],
          ['Instalas una versión nueva encima', 'Siguen ahí*'],
          ['Desinstalas la app o borras sus datos', { text: 'Se pierden', bold: true }],
          ['Pierdes o cambias el teléfono', { text: 'Se pierden sin copia', bold: true }] ] },
        { t: 'box', x: 8.6, y: 1.95, w: 4.1, h: 3.0, tone: 'accent', label: 'Copia de seguridad', head: 'Un archivo .zip fuera del teléfono', text: 'Fichas con todo su historial, fotos y plantillas. En Drive, correo o computadora.', size: 15, headSize: 20 },
        { t: 'text', x: 0.6, y: 4.6, w: 7.6, h: 1.0, size: 14, color: 'light', text: '* Con el mismo APK firmado con la misma clave. La app no usa el respaldo automático de Google: la única copia es la que guardas tú.' },
        { t: 'box', x: 8.6, y: 5.15, w: 4.1, h: 1.35, tone: 'light', label: 'Hábito', text: 'Una copia cada semana y después de cada trabajo importante.', size: 15 },
      ],
      notes: {
        say: 'La app guarda todo dentro del teléfono, en su almacenamiento privado, sin internet ni cuenta. Eso la hace rápida y privada, pero si el teléfono se pierde o desinstalas la app, se pierde todo. Una copia de seguridad es otra cosa: un archivo que tú guardas fuera del teléfono. Además, la app tiene desactivado el respaldo automático de Google, así que nadie más lo hace por ti.',
        ask: 'Pregunta: «Si mañana te roban el teléfono, ¿qué fichas recuperas?»',
        answer: 'Solo las que estén en la última copia guardada fuera del teléfono.',
        check: 'Que los datos sigan después de cerrar la app, reiniciar el teléfono e instalar una versión nueva encima (en Chromium sí se comprobó al cerrar y volver a abrir).',
        next: 'Ya tenemos las ideas. Ahora resolvamos el caso completo, paso a paso.',
      } }),

    // ═════ 3 · DEMOSTRACIÓN (25–45) ═════
    s({ block: B3, min: [25, 27], title: 'El caso: las dos ventanas de Lucía',
      elements: [
        { t: 'code', x: 0.6, y: 1.95, w: 6.9, h: 3.3, size: 16, text: 'Lucía Ramírez – cortinas casa\nsala: ventana 1.80 ancho x 150 alto.\n  riel 2.20. del riel al piso 2,50.\n  techo-riel 10cm. 2 paños\ncomedor: 120 x 140, riel 160,\n  al piso 240. 1 paño, recoge a la izq\nlas 2 en ondas, lino crudo natural\nsala con blackout, comedor forro normal\ndobladillo 10 en todas' },
        { t: 'box', x: 0.6, y: 5.45, w: 6.9, h: 1.05, tone: 'light', label: 'Origen de los datos', text: 'Clienta, negocio y medidas son ficticios, creados para el taller.', size: 15 },
        { t: 'box', x: 7.9, y: 1.95, w: 4.8, h: 4.55, tone: 'accent', label: 'Actividad · 1 minuto', head: 'Antes de cargar, busca:', text: ['¿Qué números están en metros?', '¿Qué dato falta en el comedor?', '¿Qué no se anotó en la sala?'], list: true, size: 18, headSize: 22 },
      ],
      notes: {
        say: 'Estos son los apuntes de la visita. Antes de tocar el teléfono, leemos con lupa. Es el paso «organizar» que luego haremos con la IA.',
        ask: 'Da un minuto y pide respuestas por chat.',
        answer: '1.80, 2.20 y 2,50 están en metros: se cargan como 180, 220 y 250 cm. En el comedor falta «del techo al riel»: queda vacío. En la sala no se anotó el recogido: queda vacío.',
        next: 'Vamos a la app. Compartan pantalla conmigo o sigan en su teléfono.',
      } }),
    s({ block: B3, min: [27, 30], title: 'Pasos 1 y 2 · Proyecto de práctica y ficha',
      elements: [
        { t: 'bullets', x: 0.6, y: 1.95, w: 5.6, h: 4.6, size: 19, items: [
          { text: 'Inicio → + Nuevo proyecto', bold: true },
          'Cliente nuevo: Lucía Ramírez',
          'Proyecto: Cortinas sala y comedor',
          'Marca «Es de práctica»: queda con la etiqueta EJEMPLO',
          { text: '+ Nueva ficha → «Ventana sala»', bold: true },
          'Plantilla: Cortina (6 medidas)' ] },
        { t: 'phone', file: 'fichero-02-nuevo-proyecto.png', x: 7.0, y: 1.95, h: 4.6, caption: 'Nuevo proyecto de práctica' },
        { t: 'phone', file: 'fichero-03-nueva-ficha.png', x: 10.0, y: 1.95, h: 4.6, caption: 'Elegir plantilla' },
      ],
      notes: {
        say: 'Marcamos «Es de práctica» para separar este ejercicio de los trabajos reales: así se puede borrar de una vez al final, sin tocar nada propio. Luego creamos la primera ficha con la plantilla Cortina.',
        do: 'Hazlo en vivo, despacio, leyendo cada campo en voz alta.',
        check: 'Instalación del APK y primera apertura en el teléfono.',
        next: 'Ahora las medidas, con su unidad.',
      } }),
    s({ block: B3, min: [30, 34], title: 'Paso 3 · Medidas en una sola unidad',
      elements: [
        { t: 'table', x: 0.6, y: 1.95, w: 5.8, colW: [3.6, 2.2], size: 16, rows: [
          ['Medida (Ventana sala)', 'Se carga'], ['Ancho de ventana', '180 cm'], ['Alto de ventana', '150 cm'], ['Ancho del riel o barra', '220 cm'], ['Alto del riel al piso', '250 cm'], ['Del techo al riel', '10 cm'], ['Paños', '2 unid.'] ] },
        { t: 'box', x: 0.6, y: 5.25, w: 5.8, h: 1.25, tone: 'tint', label: 'Error que la app detecta', text: '«2.200» en cm: pregunta si es 2200 o 2.2.', size: 16 },
        { t: 'phone', file: 'fichero-04-medidas.png', x: 7.0, y: 1.95, h: 4.6, caption: 'Medidas con unidad' },
        { t: 'phone', file: 'fichero-05-numero-ambiguo.png', x: 10.0, y: 1.95, h: 4.6, caption: 'Número ambiguo' },
      ],
      notes: {
        say: 'Convertimos los metros a centímetros antes de escribir: 1,80 m son 180 cm, 2,20 m son 220 cm y 2,50 m son 250 cm. Todo en cm para que nadie se confunda. La app acepta coma o punto. Si alguien escribe «2.200» en centímetros, la app no adivina: pregunta si quisiste decir 2200 o 2.2.',
        ask: 'Pregunta: «¿Y si escribo 1.80 en un campo de cm?»',
        answer: 'La app lo guarda como 1.8 cm, porque es un número válido. No lo detecta: por eso hay que revisar que el valor tenga sentido. Es uno de los errores frecuentes.',
        next: 'Ahora lo que no es número.',
      } }),
    s({ block: B3, min: [34, 37], title: 'Paso 4 · Especificaciones y foto de referencia',
      elements: [
        { t: 'bullets', x: 0.6, y: 1.95, w: 5.8, h: 4.6, size: 19, items: [
          'Tipo: Ondas · Forro: Blackout',
          'Acabado: Dobladillo 10 cm',
          'Tela: Lino crudo · Color: Crudo natural',
          'Recogido: vacío (no se anotó)',
          'Foto: «Tomar foto» o «Elegir de la galería»',
          'Descripción: «Muestra de lino elegida»' ] },
        { t: 'phone', file: 'fichero-06-especificaciones.png', x: 7.0, y: 1.95, h: 4.6, caption: 'Tocar opciones' },
        { t: 'phone', file: 'fichero-07-fotos.png', x: 10.0, y: 1.95, h: 4.6, caption: 'Foto y observaciones' },
      ],
      notes: {
        say: 'Tocamos las opciones; también se puede escribir otra. Dejamos «Recogido» vacío porque los apuntes de la sala no lo dicen: no lo suponemos. La foto es una referencia de la tela; en la demostración usamos una imagen de ejemplo, nunca fotos de casas de clientes sin permiso.',
        do: 'Toma una foto de cualquier tela o papel que tengas a mano.',
        check: 'Cámara y galería desde el APK; tamaño y calidad de la foto guardada.',
        next: 'Guardamos y vemos qué pasa con lo que falta.',
      } }),
    s({ block: B3, min: [37, 39], title: 'Paso 5 · Guardar, aunque falte un dato',
      elements: [
        { t: 'bullets', x: 0.6, y: 1.95, w: 5.8, h: 2.6, size: 19, items: [
          'Ficha «Ventana comedor» con sus medidas.',
          '«Del techo al riel» queda vacío.',
          'Al guardar, la app avisa qué falta.',
          'Elige: «Seguir completando» o «Guardar con datos faltantes».' ] },
        { t: 'box', x: 0.6, y: 4.75, w: 5.8, h: 1.75, tone: 'accent', label: 'Lo que NO hace', text: 'No rellena con cero ni estima. Lo que falta se queda como «Sin dato» hasta que lo midas.', size: 16 },
        { t: 'phone', file: 'fichero-08-faltan-datos.png', x: 7.0, y: 1.95, h: 4.6, caption: 'Aviso de medida faltante' },
        { t: 'phone', file: 'fichero-10b-comedor-sin-dato.png', x: 10.0, y: 1.95, h: 4.6, caption: 'Ficha guardada: 5 de 6 con dato' },
      ],
      notes: {
        say: 'Creamos la segunda ficha con los datos del comedor: 120, 140, 160, 240 y 1 paño. Al tocar «Guardar versión 1», la app avisa: «Falta una medida: Del techo al riel». Podemos completarla o guardar así. Guardamos: la ficha dice «5 de 6 con dato».',
        next: 'Ahora el momento clave: la corrección.',
      } }),
    s({ block: B3, min: [39, 41], title: 'Paso 6 · Corregir de 180 a 182 y ver el historial',
      elements: [
        { t: 'bullets', x: 0.6, y: 1.95, w: 5.8, h: 4.6, size: 19, items: [
          'Ventana sala → Editar ficha',
          'Ancho de ventana: 182',
          '¿Qué cambió y por qué? «Se volvió a medir el ancho»',
          'Guardar versión 2',
          'Historial: la versión 1 sigue ahí' ] },
        { t: 'phone', file: 'fichero-11-correccion.png', x: 7.0, y: 1.95, h: 4.6, caption: 'Motivo del cambio' },
        { t: 'phone', file: 'fichero-12-historial.png', x: 10.0, y: 1.95, h: 4.6, caption: 'Qué cambió' },
      ],
      notes: {
        say: 'En la segunda visita, el ancho de la sala midió 182 cm. Editamos, escribimos el motivo y guardamos la versión 2. El historial muestra «Ancho de ventana: 180 cm → 182 cm» y el motivo. Si alguien imprimió la hoja con la versión 1, se nota: la hoja dice qué versión es.',
        next: '¿Cómo lo encuentro y cómo se lo paso a quien corta?',
      } }),
    s({ block: B3, min: [41, 43], title: 'Paso 7 · Encontrar y entregar la hoja de trabajo',
      elements: [
        { t: 'phone', file: 'fichero-15-busqueda.png', x: 0.6, y: 1.95, h: 4.6, caption: 'Buscar «lucia comedor»' },
        { t: 'image', file: 'fichero-14-hoja-impresa.png', x: 3.55, y: 1.95, w: 3.3, h: 4.6, crop: true, caption: 'Hoja de trabajo (vista de impresión)' },
        { t: 'bullets', x: 7.4, y: 1.95, w: 5.3, h: 4.6, size: 19, items: [
          'Buscador: sin tildes ni mayúsculas; por cliente, proyecto o ficha.',
          'Proyecto → «Hoja de trabajo del proyecto».',
          '«Imprimir o guardar PDF» → en Android, «Guardar como PDF».',
          'Lo que falta sale como «SIN DATO — completar».' ] },
      ],
      notes: {
        say: 'En Inicio escribimos «lucia comedor» y aparecen el proyecto y la ficha. La hoja de trabajo junta las dos ventanas con su versión, medidas, especificaciones y fotos, y tiene una línea para firma. Se imprime o se guarda como PDF; ese PDF luego se puede compartir por WhatsApp desde el teléfono, porque la app no envía mensajes.',
        check: 'Imprimir → «Guardar como PDF» desde el APK (el diálogo de impresión de Android), y compartir ese PDF por WhatsApp desde la app de archivos. En Chromium se comprobó que la hoja se genera como PDF.',
        next: 'Último paso de la demostración: la copia de seguridad.',
      } }),
    s({ block: B3, min: [43, 45], title: 'Paso 8 · Respaldo: guardar, borrar y recuperar',
      elements: [
        { t: 'phone', file: 'fichero-17-copias.png', x: 0.6, y: 1.95, h: 4.3, caption: '1 · Guardar una copia' },
        { t: 'phone', file: 'fichero-18-recuperar.png', x: 3.55, y: 1.95, h: 4.3, caption: '3 · Recuperar: qué pasará' },
        { t: 'phone', file: 'fichero-19-ficha-recuperada.png', x: 6.5, y: 1.95, h: 4.3, caption: '4 · La ficha volvió' },
        { t: 'bullets', plain: true, x: 9.45, y: 1.95, w: 3.3, h: 4.6, size: 16, items: [
          '1. Copias → marca «Incluir también los datos de ejemplo» → Guardar una copia.',
          '2. Elimina la ficha «Ventana comedor».',
          '3. Recuperar una copia → elige el .zip.',
          '4. «Agregar lo nuevo»: vuelve la ficha; lo demás no se toca.' ] },
      ],
      notes: {
        say: 'Hacemos la prueba que casi nadie hace: comprobar que la copia sirve. Como nuestro proyecto es de práctica, hay que marcar «Incluir también los datos de ejemplo»; si no, la copia sale sin él. Guardamos, borramos a propósito la ficha del comedor y recuperamos. La app primero muestra qué contiene la copia. «Agregar lo nuevo» agrega registros que no existen en este teléfono y no actualiza los que ya existen, aunque la copia tenga cambios más recientes; la vista previa dice cuántos se agregan y cuántos se omiten. «Reemplazar todo» deja el teléfono igual que la copia, pide confirmación y se puede deshacer.',
        answer: 'Aviso esperado: «Copia recuperada: se agregaron 1 ficha y 0 fotos». La ficha del comedor vuelve con su versión 1.',
        check: 'El selector de Android al guardar (Descargas o Drive) y al recuperar; recuperar la copia en un segundo teléfono. En Chromium se comprobó guardar, borrar y recuperar con fichas, fotos e historial.',
        next: 'Ahora te toca a ti, con otros datos.',
      } }),

    // ═════ 4 · EJERCICIO (45–65) ═════
    s({ block: B4, min: [45, 47], title: 'Tu turno: Tapicería El Buen Asiento',
      elements: [
        { t: 'code', x: 0.6, y: 1.95, w: 7.3, h: 4.55, size: 15, text: 'Sra. Carmen L. — retapizar sala\nsofá 2 plazas: ancho 1.50 m, fondo 85,\n  alto 90 · asiento: alto 45, fondo 55\n  respaldo: 45 de alto\n  cojín de 4 pulg · 3 cojines\n  tela microfibra gris oxford, con vivo\n  pata trasera izq. floja: revisar\nsillas de comedor (4 iguales):\n  ancho 45, fondo 50, alto 95\n  asiento a 47 del piso, fondo 42\n  cojín ¿2 pulg?\nespuma: preguntar densidad' },
        { t: 'box', x: 8.3, y: 1.95, w: 4.4, h: 2.35, tone: 'accent', label: 'Después de la 2.ª llamada', head: '«El respaldo del sofá mide 48 cm, no 45.»', headSize: 19 },
        { t: 'box', x: 8.3, y: 4.5, w: 4.4, h: 2.0, tone: 'light', label: 'Origen', text: 'Negocio y clienta ficticios. Taller en Villa Nueva. Plantilla: Mueble tapizado.', size: 15 },
      ],
      notes: {
        say: 'Ahora repetimos el proceso con otro oficio: tapicería. Los datos están en la hoja de práctica. Tienen 15 minutos. Fíjense: hay metros, pulgadas, una medida dudosa y cosas que no se dijeron.',
        do: 'Envía la hoja de práctica por el chat. Recuerda: proyecto marcado «Es de práctica».',
        next: 'Estos son los pasos.',
      } }),
    s({ block: B4, min: [47, 60], title: 'Pasos del ejercicio · 13 minutos',
      elements: [
        { t: 'bullets', plain: true, x: 0.6, y: 1.95, w: 6.2, h: 4.6, size: 18, items: [
          '1. Nuevo proyecto «Retapizar sala» para Carmen López. Marca «Es de práctica».',
          '2. Ficha «Sofá 2 plazas», plantilla Mueble tapizado.',
          '3. Medidas en cm; el cojín en pulg (cambia la unidad).',
          '4. Especificaciones: solo lo que dicen los apuntes.',
          '5. Guardar versión 1.' ] },
        { t: 'bullets', plain: true, x: 7.0, y: 1.95, w: 5.7, h: 4.6, size: 18, items: [
          '6. Ficha «Sillas de comedor»: lo dudoso, vacío y anotado en Observaciones.',
          '7. Corrige el respaldo del sofá a 48 cm, con motivo.',
          '8. Abre el Historial y la hoja de trabajo del proyecto.',
          '9. Guarda una copia (incluye el ejemplo), elimina la ficha de las sillas y recupérala con «Agregar lo nuevo».' ] },
      ],
      notes: {
        say: 'Trabajen solos. Yo voy leyendo dudas del chat. Si terminan antes, adelanten el reto: duplicar la plantilla más parecida a su oficio.',
        do: 'A los 6 minutos pregunta quién ya guardó la versión 1. A los 10 minutos, quién ya corrigió el respaldo. Comparte tu pantalla con el paso 7 si muchos se atrasan.',
        answer: 'Ver la hoja de respuestas: sofá v2 con 8 medidas con dato (respaldo 48 cm, cojín 4 pulg) y «Espuma» sin dato; sillas v1 con 5 de 8 medidas con dato.',
        check: 'Duración real de cada paso con participantes y sus teléfonos (no medida aún).',
        next: 'Revisemos los errores que más aparecen.',
      } }),
    s({ block: B4, min: [60, 63], title: 'Errores frecuentes y cómo detectarlos',
      elements: [
        { t: 'table', x: 0.6, y: 1.95, w: 12.1, colW: [3.6, 4.4, 4.1], size: 15, rows: [
          ['Error', 'Cómo se nota', 'Arreglo'],
          ['«1.50» en un campo de cm', 'La ficha dice 1.5 cm', 'Editar: 150 cm'],
          ['Poner 0 en lo que no se midió', 'La hoja dice 0, no «SIN DATO»', 'Borrar el 0: dejar vacío'],
          ['Suponer la tela de las sillas', 'Dato que nadie dijo', 'Vaciar y preguntar al cliente'],
          ['Cojín «4» en cm', 'Un cojín de 4 cm', 'Unidad: pulg'],
          ['Corregir sin guardar versión', 'Aviso «cambios sin guardar»', 'Tocar «Guardar versión»'],
          ['Copia sin marcar «ejemplo»', 'La copia no trae la práctica', 'Marcar la casilla y repetir'] ] },
      ],
      notes: {
        say: 'Estos errores salen en casi todos los grupos. La app detecta números ambiguos como «1.250» en cm y avisa de lo que falta, pero no puede saber si 1.5 cm es un error: eso lo revisa la persona.',
        ask: '¿Cuál de estos errores te pasó? Pide que respondan con el número de fila.',
        next: 'Comprobemos el resultado.',
      } }),
    s({ block: B4, min: [63, 65], title: 'Comprueba tu resultado',
      elements: [
        { t: 'bullets', plain: true, x: 0.6, y: 1.95, w: 7.2, h: 4.6, size: 19, items: [
          '☐ Proyecto con etiqueta EJEMPLO y 2 fichas.',
          '☐ Sofá: versión 2 de 2; respaldo 48 cm.',
          '☐ Historial: «Alto del respaldo: 45 cm → 48 cm».',
          '☐ Ancho total: 150 cm (no 1.5).',
          '☐ Cojín del sofá: 4 pulg.',
          '☐ Espuma: «Sin dato» en las dos fichas.',
          '☐ La hoja del proyecto muestra «SIN DATO — completar».',
          '☐ La ficha de las sillas volvió después de recuperar la copia.' ] },
        { t: 'box', x: 8.2, y: 1.95, w: 4.5, h: 4.55, tone: 'accent', label: 'Por qué así', text: ['1,50 m = 150 cm.', 'Lo dudoso (¿2 pulg?) no se registra como dato: se anota en Observaciones para volver a medir.', 'La versión 1 conserva el 45: no se pierde la historia.'], list: true, size: 16 },
      ],
      notes: {
        say: 'Marquen cada casilla. Si una no se cumple, ya saben dónde corregir.',
        ask: 'Pide un emoji o «listo» en el chat por cada participante que cumpla las 8.',
        next: 'Ahora sumamos la IA, como herramienta externa.',
      } }),

    // ═════ 5 · IA (65–80) ═════
    s({ block: B5, min: [65, 68], title: 'La IA trabaja afuera de la app',
      elements: [
        { t: 'flow', x: 0.6, y: 1.95, w: 12.1, h: 2.15, headSize: 19, size: 14, steps: [
          { head: 'Organizar', text: 'Junta tus apuntes. Quita nombres, teléfonos y direcciones.' },
          { head: 'Consultar', text: 'Pega un prompt en ChatGPT o Claude.' },
          { head: 'Verificar', text: 'Compara cada dato con tus apuntes.' },
          { head: 'Aplicar', text: 'Escribe tú los datos en la app.' } ] },
        { t: 'table', x: 0.6, y: 4.4, w: 12.1, colW: [4.0, 4.0, 4.1], size: 15, rows: [
          ['La app hace', 'La IA externa ayuda a', 'Tú verificas y decides'],
          ['Guardar fichas, versiones, fotos', 'Ordenar apuntes en una tabla', 'Cada número contra tus apuntes'],
          ['Avisar medidas sin dato', 'Señalar faltantes y dudas', 'Qué se vuelve a medir'],
          ['Hoja de trabajo y copias', 'Proponer campos para tu oficio', 'Qué campos usas de verdad'] ] },
      ],
      notes: {
        say: 'La app no tiene inteligencia artificial adentro: funciona sin internet. La IA la usamos aparte, en ChatGPT o Claude, que sí necesitan internet. El ciclo siempre es el mismo: organizo mis apuntes, consulto con un prompt, verifico lo que respondió y recién entonces aplico en la app. Nunca copies datos de clientes completos: usa iniciales y no pongas teléfonos ni direcciones.',
        ask: '¿Quién ha usado ChatGPT o Claude? Levanten la mano virtual.',
        next: 'Primer prompt: ordenar los apuntes del ejercicio.',
      } }),
    s({ block: B5, min: [68, 72], title: 'Prompt 1 · Ordenar apuntes sin inventar',
      elements: [
        { t: 'code', x: 0.6, y: 1.95, w: 7.6, h: 4.55, size: 14, text: 'Soy [tu oficio]. Ordena mis apuntes en una\ntabla por pieza: Campo | Valor | Unidad |\nTexto original.\n- Usa SOLO lo que está en mis apuntes.\n- Si falta un dato, escribe SIN DATO.\n  Nunca pongas 0.\n- Si mezclo m y cm, muestra la conversión.\n- Marca con (¿?) la unidad dudosa.\n- Al final: datos que faltan y datos\n  que conviene volver a medir.\nApuntes: [pega aquí, sin nombres ni teléfonos]' },
        { t: 'box', x: 8.6, y: 1.95, w: 4.1, h: 2.15, tone: 'light', label: 'Qué das', text: 'Tus apuntes con iniciales. Tu oficio.', size: 16 },
        { t: 'box', x: 8.6, y: 4.35, w: 4.1, h: 2.15, tone: 'accent', label: 'Qué verificas', text: 'Cada número contra el original. Las conversiones (1.50 m = 150 cm). Que no aparezcan datos que no escribiste.', size: 15 },
      ],
      notes: {
        say: 'Copien el prompt completo de la hoja de prompts y peguen los apuntes del ejercicio de tapicería. Comparen la tabla de la IA con lo que ya cargaron. Si la IA puso «espuma densidad 30» o «tela microfibra» en las sillas, inventó: se borra.',
        do: 'Haz la consulta en vivo con los apuntes del ejercicio y comparte la respuesta.',
        answer: 'La respuesta correcta lista como faltantes: densidad de espuma, tela y color de las sillas, alto del respaldo de las sillas y grosor del cojín de las sillas (dudoso).',
        check: 'Ninguno propio de la app: este paso usa una IA externa y necesita internet.',
        next: 'Segundo prompt: adaptar la plantilla a tu oficio. Este es tu reto individual.',
      } }),
    s({ block: B5, min: [72, 76], title: 'Prompt 2 · Reto: la plantilla de tu oficio',
      elements: [
        { t: 'code', x: 0.6, y: 1.95, w: 6.6, h: 4.55, size: 14, text: 'Hago [qué fabricas]. Hoy anoto: [lista].\nPropón una plantilla:\n1) Medidas: nombre, unidad (mm, cm, m,\n   pulg o unid.) y una ayuda de 1 línea.\n2) Especificaciones: nombre y 3 a 6\n   opciones separadas por coma.\nMáximo 10 medidas y 8 especificaciones.\nSin valores de ejemplo.\nSi algo no queda claro, pregúntame.' },
        { t: 'phone', file: 'fichero-16-plantilla.png', x: 7.7, y: 1.95, h: 4.6, caption: 'Plantillas → editar campos' },
        { t: 'box', x: 10.05, y: 1.95, w: 2.65, h: 4.55, tone: 'accent', label: 'Aplicar', text: ['Plantillas → elige la más parecida → Duplicar.', 'Renombra, agrega o quita campos.', 'Las fichas que ya existen no cambian.'], list: true, size: 14 },
      ],
      notes: {
        say: 'Reto individual: con este prompt, pide a la IA los campos de tu oficio. Revisa la propuesta: quita lo que nunca mides y agrega lo que falte. Luego en la app: Plantillas, duplicar la más parecida y ajustar nombres, unidades, ayudas y opciones. Cambiar una plantilla solo afecta a las fichas nuevas.',
        do: 'Da 4 minutos. Pide que compartan en el chat el nombre de su plantilla y cuántas medidas tiene.',
        answer: 'Una plantilla propia con nombres claros y su unidad. Si la IA propone más de 10 medidas, se recortan.',
        next: 'Tercer prompt: revisar antes de fabricar.',
      } }),
    s({ block: B5, min: [76, 80], title: 'Prompt 3 · Revisar la hoja antes de fabricar',
      elements: [
        { t: 'code', x: 0.6, y: 1.95, w: 7.6, h: 3.3, size: 14, text: 'Revisa esta hoja de trabajo como si fueras\na fabricar. Dime solamente:\n- Datos SIN DATO necesarios para fabricar.\n- Datos incoherentes entre sí y por qué.\n- Preguntas para el cliente, en un mensaje\n  corto para WhatsApp.\nNo propongas valores. No cambies medidas.\n[pega el texto de la hoja, sin teléfonos]' },
        { t: 'box', x: 0.6, y: 5.45, w: 7.6, h: 1.05, tone: 'light', label: 'Qué das', text: 'El texto de la hoja de trabajo (copiado o en foto), sin datos personales.', size: 15 },
        { t: 'box', x: 8.6, y: 1.95, w: 4.1, h: 4.55, tone: 'accent', label: 'Qué verificas', text: ['¿Lo «incoherente» lo es de verdad? Mídelo.', 'El mensaje no debe prometer precios ni fechas que no decidiste.', 'La IA nunca completa medidas: si lo hace, se ignora.'], list: true, size: 15 },
      ],
      notes: {
        say: 'La hoja de trabajo es lo que va al taller. Antes de cortar, la IA puede actuar como un segundo par de ojos: qué falta, qué no cuadra y qué preguntarle al cliente. Por ejemplo, un riel más corto que la ventana sería incoherente. Tú decides qué se vuelve a medir y envías el mensaje.',
        do: 'Pega el texto de la hoja del ejercicio y muestra la respuesta.',
        answer: 'Debe pedir densidad de espuma, tela y color de las sillas, alto del respaldo y grosor del cojín de las sillas; y no debe inventar valores.',
        next: 'Cerremos revisando el ejercicio.',
      } }),

    // ═════ 6 · REVISIÓN (80–90) ═════
    s({ block: B6, min: [80, 84], title: 'Solución del ejercicio',
      elements: [
        { t: 'table', x: 0.6, y: 1.95, w: 7.2, colW: [3.4, 1.9, 1.9], size: 14, rowH: 0.36, rows: [
          ['Medida', 'Sofá (v2)', 'Sillas (v1)'], ['Ancho total', '150 cm', '45 cm'], ['Fondo total', '85 cm', '50 cm'], ['Alto total', '90 cm', '95 cm'], ['Alto del asiento', '45 cm', '47 cm'], ['Fondo del asiento', '55 cm', '42 cm'], ['Alto del respaldo', '48 cm', 'Sin dato'], ['Grosor del cojín', '4 pulg', 'Sin dato'], ['Cojines', '3 unid.', 'Sin dato'] ] },
        { t: 'box', x: 8.2, y: 1.95, w: 4.5, h: 4.55, tone: 'tint', label: 'Especificaciones', text: ['Sofá: Sofá · Microfibra · Gris oxford · Vivo · «Revisar pata trasera izquierda (floja)» · Espuma: Sin dato.', 'Sillas: Silla de comedor · todo lo demás Sin dato.', 'Observaciones de las sillas: «Son 4 sillas iguales. Grosor del cojín dudoso (¿2 pulg?): medir otra vez».'], list: true, size: 15 },
      ],
      notes: {
        say: 'Repasamos la solución. Lo más importante no son los números, sino las decisiones: lo que no se dijo queda vacío; lo dudoso no se registra como dato; la corrección crea versión 2. Cojines de las sillas: los apuntes no lo dicen; si cada silla lleva un cojín, el participante puede escribir 4 después de confirmarlo.',
        ask: 'Vuelve a la pregunta del día: «¿Qué necesita una medida para ser útil en 6 meses?»',
        answer: 'Nombre, número, unidad, en qué ficha va, su versión y fecha, y una copia de seguridad fuera del teléfono.',
        next: 'Para que esto sirva mañana, una rutina corta.',
      } }),
    s({ block: B6, min: [84, 90], dark: true, title: 'Tu rutina y la tarea de mañana',
      elements: [
        { t: 'flow', x: 0.6, y: 1.95, w: 12.1, h: 1.9, headSize: 18, size: 13, steps: [
          { head: 'Medir', text: 'Con unidad' }, { head: 'Ficha', text: 'Vacío = sin dato' }, { head: 'Versión', text: 'Con motivo' }, { head: 'Hoja', text: 'PDF al taller' }, { head: 'Copia', text: 'Cada viernes' } ] },
        { t: 'box', x: 0.6, y: 4.15, w: 7.2, h: 2.35, tone: 'accent', label: 'Tarea para mañana', text: ['Registra un trabajo real con tu plantilla.', 'Usa iniciales del cliente, no su teléfono.', 'Guarda una copia en Drive o en tu correo.', 'Copias → «Quitar los datos de ejemplo».'], list: true, size: 16 },
        { t: 'box', x: 8.2, y: 4.15, w: 4.5, h: 2.35, tone: 'light', label: 'Preguntas', head: 'Dudas en el chat o por micrófono', headSize: 19 },
      ],
      notes: {
        say: 'Esta es la rutina: medir con unidad, ficha con lo que falta vacío, versión con motivo, hoja en PDF para el taller y una copia cada viernes. La tarea: un trabajo real con tu plantilla. Al terminar de practicar, quita los datos de ejemplo: así solo quedan los tuyos.',
        do: 'Abre dudas (4 min). Cierra recordando: la copia de seguridad es lo único que te salva si pierdes el teléfono.',
        check: 'Pendientes de comprobar en un teléfono real antes de repetir el taller: instalación del APK, cámara y galería, persistencia al reiniciar y al actualizar, guardar e importar copias con el selector de Android y Drive, recuperar en otro teléfono, imprimir como PDF, uso en modo avión y botón Atrás.',
      } }),
  ],
};
