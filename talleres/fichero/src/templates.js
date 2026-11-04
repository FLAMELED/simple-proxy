// Plantillas iniciales. Son puntos de partida: cada persona puede renombrar,
// quitar o agregar campos desde «Plantillas». Ningún campo trae un valor:
// las medidas siempre las escribe y verifica la persona.

export const BUILTIN_TEMPLATES = [
  {
    id: 'tpl-cortinas', builtin: true, name: 'Cortina', oficio: 'Cortinas',
    measures: [
      { label: 'Ancho de ventana', unit: 'cm', hint: 'De marco a marco, por dentro.' },
      { label: 'Alto de ventana', unit: 'cm', hint: 'De marco a marco, por dentro.' },
      { label: 'Ancho del riel o barra', unit: 'cm', hint: 'Largo total instalado o por instalar.' },
      { label: 'Alto del riel al piso', unit: 'cm', hint: 'Mide en dos puntos y anota el menor.' },
      { label: 'Del techo al riel', unit: 'cm', hint: '' },
      { label: 'Paños', unit: 'u', hint: 'Cuántas piezas de cortina lleva esta ventana.' },
    ],
    specs: [
      { label: 'Tipo de cortina', options: ['Ondas', 'Pliegues', 'Ojales', 'Pasa barra', 'Panel japonés', 'Enrollable'] },
      { label: 'Tela', options: [] },
      { label: 'Color', options: [] },
      { label: 'Forro', options: ['Sin forro', 'Forro común', 'Blackout'] },
      { label: 'Acabado del dobladillo', options: ['Dobladillo 10 cm', 'Dobladillo 5 cm', 'Con plomo', 'Ras de piso', 'A 1 cm del piso'] },
      { label: 'Recogido', options: ['Al centro', 'A la izquierda', 'A la derecha', 'A ambos lados'] },
    ],
  },
  {
    id: 'tpl-tapiceria', builtin: true, name: 'Mueble tapizado', oficio: 'Tapicería',
    measures: [
      { label: 'Ancho total', unit: 'cm', hint: '' },
      { label: 'Fondo total', unit: 'cm', hint: '' },
      { label: 'Alto total', unit: 'cm', hint: '' },
      { label: 'Alto del asiento', unit: 'cm', hint: 'Del piso a la parte superior del cojín.' },
      { label: 'Fondo del asiento', unit: 'cm', hint: '' },
      { label: 'Alto del respaldo', unit: 'cm', hint: '' },
      { label: 'Grosor del cojín', unit: 'cm', hint: '' },
      { label: 'Cojines', unit: 'u', hint: '' },
    ],
    specs: [
      { label: 'Mueble', options: ['Sofá', 'Sillón', 'Silla de comedor', 'Banca', 'Cabecera'] },
      { label: 'Tela', options: [] },
      { label: 'Color', options: [] },
      { label: 'Espuma', options: [] },
      { label: 'Costura o acabado', options: ['Costura simple', 'Vivo', 'Capitoné', 'Doble pespunte'] },
      { label: 'Estructura y patas', options: [] },
    ],
  },
  {
    id: 'tpl-confeccion', builtin: true, name: 'Prenda a medida', oficio: 'Confección',
    measures: [
      { label: 'Contorno de busto o pecho', unit: 'cm', hint: '' },
      { label: 'Contorno de cintura', unit: 'cm', hint: '' },
      { label: 'Contorno de cadera', unit: 'cm', hint: '' },
      { label: 'Ancho de hombros', unit: 'cm', hint: '' },
      { label: 'Largo de espalda', unit: 'cm', hint: 'De la base del cuello a la cintura.' },
      { label: 'Largo de manga', unit: 'cm', hint: '' },
      { label: 'Largo total', unit: 'cm', hint: '' },
    ],
    specs: [
      { label: 'Prenda', options: ['Vestido', 'Blusa', 'Camisa', 'Falda', 'Pantalón', 'Saco'] },
      { label: 'Tela', options: [] },
      { label: 'Color', options: [] },
      { label: 'Cierre', options: ['Cremallera invisible', 'Botones', 'Broches', 'Sin cierre'] },
      { label: 'Acabado', options: [] },
      { label: 'Fecha de prueba', options: [] },
    ],
  },
];
