// Ejemplo ficticio «Papel y Forma»: artículos decorativos de cartón gris.
// Las medidas son inventadas para el taller y están comprobadas en tests/unit/cortes-engine.test.mjs.
//
// Origen de cada dato:
//  · Plancha de cartón gris de 70 × 100 cm y 2 mm de grosor (un formato común; confirma el de tu proveedor).
//  · Separación de corte 0,2 cm: el cúter casi no quita material; es margen de seguridad para no cortar sobre la pieza vecina.
//  · Margen del borde 0,5 cm: los bordes de la plancha suelen venir golpeados.
//  · Caja de 30 × 20 × 8 cm: base 30 × 20; laterales largos 30 × 8;
//    laterales cortos 20 − 2 × 0,2 = 19,6 × 8, porque van entre los largos (el cartón mide 0,2 cm).
//  · Fondo de cuadro 25 × 35, «no girar»: la veta del cartón debe ir a lo largo para que no se curve.
export const DEMO_NAME = 'Papel y Forma';

export function demoProject() {
  return {
    name: 'Cajas y cuadros de cartón', demo: true, unit: 'cm',
    material: { name: 'Cartón gris 2 mm', width: 70, height: 100, quantity: 2 },
    kerf: 0.2, margin: 0.5, minLeftover: 5,
    notes: 'Ejemplo del taller: 4 cajas de 30 × 20 × 8 cm y 3 fondos para cuadro.',
    pieces: [
      { id: 'd-a', label: 'Base de caja', width: 30, height: 20, qty: 4, rotate: true },
      { id: 'd-b', label: 'Lateral largo', width: 30, height: 8, qty: 8, rotate: true },
      { id: 'd-c', label: 'Lateral corto', width: 19.6, height: 8, qty: 8, rotate: true },
      { id: 'd-d', label: 'Fondo de cuadro', width: 25, height: 35, qty: 3, rotate: false },
    ],
  };
}
