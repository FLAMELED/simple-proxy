// PRECIOS FICTICIOS DE EJEMPLO. No provienen de ningún supermercado.
// Existen solo para que la app pueda probarse completa. Se muestran siempre
// con la etiqueta "Ejemplo" y no se mezclan con precios reales.

// [ingrediente, producto, marca, cantidad, unidad, precio Q, extras]
const A = [
  ['arroz', 'Arroz blanco', 'Marca Ejemplo', 1, 'kg', '14.50'],
  ['arroz', 'Arroz blanco', 'Otra Marca Ejemplo', 400, 'g', '6.25'],
  ['frijol-negro', 'Frijol negro', 'Marca Ejemplo', 1, 'lb', '9.75'],
  ['frijol-volteado', 'Frijol volteado en bolsa', 'Marca Ejemplo', 400, 'g', '8.90'],
  ['frijol-volteado', 'Frijol volteado en bolsa', 'Otra Marca Ejemplo', 227, 'g', '5.40'],
  ['lentejas', 'Lentejas', 'Marca Ejemplo', 1, 'lb', '11.20'],
  ['harina-maiz', 'Harina de maíz', 'Marca Ejemplo', 2, 'lb', '10.95'],
  ['avena', 'Avena en hojuelas', 'Marca Ejemplo', 400, 'g', '13.40'],
  ['fideos', 'Fideos', 'Marca Ejemplo', 200, 'g', '4.10'],
  ['azucar', 'Azúcar', 'Marca Ejemplo', 2, 'kg', '17.80'],
  ['atun', 'Atún en agua (lata)', 'Marca Ejemplo', 140, 'g', '10.50'],
  ['pepitoria', 'Pepitoria', 'Marca Ejemplo', 100, 'g', '9.80'],
  ['ajonjoli', 'Ajonjolí', 'Marca Ejemplo', 100, 'g', '7.25'],
  ['chile-guaque', 'Chile guaque', 'Marca Ejemplo', 50, 'g', '8.00'],
  ['chile-pasa', 'Chile pasa', 'Marca Ejemplo', 50, 'g', '8.50'],
  ['tusa', 'Hojas de tusa (bolsa)', 'Marca Ejemplo', 30, 'u', '9.00'],
  ['pollo-pechuga', 'Pechuga de pollo', 'Granel', 1, 'lb', '21.90'],
  ['pollo-piezas', 'Pollo en piezas', 'Granel', 1, 'lb', '15.50'],
  ['res-guisar', 'Carne de res para guisar', 'Granel', 1, 'lb', '36.50'],
  ['res-molida', 'Carne de res molida', 'Granel', 1, 'lb', '33.00'],
  ['res-falda', 'Falda de res', 'Granel', 1, 'lb', '34.75'],
  ['cerdo-costilla', 'Costilla de cerdo', 'Granel', 1, 'lb', '27.80'],
  ['longaniza', 'Longaniza', 'Marca Ejemplo', 1, 'lb', '29.90'],
  ['huevo', 'Huevos', 'Granja Ejemplo', 15, 'u', '24.50'],
  ['huevo', 'Huevos', 'Granja Ejemplo', 30, 'u', '45.90'],
  ['queso-fresco', 'Queso fresco', 'Lácteos Ejemplo', 1, 'lb', '27.00'],
  ['queso-seco', 'Queso seco', 'Lácteos Ejemplo', 8, 'oz', '19.50'],
  ['crema', 'Crema', 'Lácteos Ejemplo', 450, 'ml', '15.75'],
  ['leche', 'Leche entera', 'Lácteos Ejemplo', 1, 'l', '12.40'],
  ['tomate', 'Tomate', 'Granel', 1, 'lb', '6.50'],
  ['miltomate', 'Miltomate', 'Granel', 1, 'lb', '7.90'],
  ['cebolla', 'Cebolla', 'Granel', 1, 'lb', '6.90'],
  ['ajo', 'Ajo (malla)', 'Granel', 100, 'g', '6.00'],
  ['chile-pimiento', 'Chile pimiento', 'Granel', 1, 'u', '3.25'],
  ['jalapeno', 'Chile jalapeño', 'Granel', 1, 'lb', '9.50'],
  ['papa', 'Papa', 'Granel', 1, 'lb', '5.80'],
  ['guisquil', 'Güisquil', 'Granel', 1, 'u', '3.50'],
  ['guicoy', 'Güicoy', 'Granel', 1, 'lb', '6.20'],
  ['ejotes', 'Ejotes', 'Granel', 1, 'lb', '8.25'],
  ['zanahoria', 'Zanahoria', 'Granel', 1, 'lb', '4.90'],
  ['repollo', 'Repollo', 'Granel', 1, 'lb', '4.25'],
  ['remolacha', 'Remolacha', 'Granel', 1, 'lb', '6.40'],
  ['elote', 'Elote', 'Granel', 1, 'u', '3.75'],
  ['aguacate', 'Aguacate', 'Granel', 1, 'u', '6.50'],
  ['platano', 'Plátano', 'Granel', 1, 'u', '2.75'],
  ['lechuga', 'Lechuga', 'Granel', 1, 'u', '7.50'],
  ['cilantro', 'Cilantro', 'Granel', 1, 'manojo', '2.50'],
  ['hierbabuena', 'Hierbabuena', 'Granel', 1, 'manojo', '3.00'],
  ['cebollin', 'Cebollín', 'Granel', 1, 'manojo', '3.50'],
  ['chipilin', 'Chipilín', 'Granel', 1, 'manojo', '4.00'],
  ['hierba-mora', 'Hierba mora', 'Granel', 1, 'manojo', '4.00'],
  ['limon', 'Limón', 'Granel', 1, 'u', '0.75'],
  ['banano', 'Banano', 'Granel', 1, 'u', '1.10'],
  ['papaya', 'Papaya', 'Granel', 1, 'lb', '5.50'],
  ['pina', 'Piña', 'Granel', 1, 'u', '14.00'],
  ['mango', 'Mango', 'Granel', 1, 'u', '4.25'],
  ['tortilla', 'Tortillas de maíz (paquete)', 'Tortillería Ejemplo', 30, 'u', '12.00'],
  ['tostada', 'Tostadas', 'Marca Ejemplo', 12, 'u', '11.25'],
  ['pan-frances', 'Pan francés', 'Panadería Ejemplo', 1, 'u', '1.00'],
  ['pan-molido', 'Pan molido', 'Marca Ejemplo', 200, 'g', '9.90'],
  ['aceite', 'Aceite vegetal', 'Marca Ejemplo', 900, 'ml', '25.90'],
  ['sal', 'Sal', 'Marca Ejemplo', 1, 'kg', '4.50'],
  ['consome', 'Consomé de pollo', 'Marca Ejemplo', 100, 'g', '9.25'],
  ['achiote', 'Achiote en pasta', 'Marca Ejemplo', 100, 'g', '7.80'],
  ['salsa-soya', 'Salsa de soya', 'Marca Ejemplo', 150, 'ml', '11.40'],
  ['hierbas-olor', 'Hierbas de olor', 'Marca Ejemplo', 10, 'g', '5.25'],
  ['canela', 'Canela en raja', 'Marca Ejemplo', 25, 'g', '8.75'],
  ['vinagre', 'Vinagre', 'Marca Ejemplo', 500, 'ml', '7.40'],
];

// Tienda B: precios distintos, presentaciones distintas, faltantes y promociones.
const B_OVERRIDES = {
  arroz: [['arroz', 'Arroz blanco', 'Marca B Ejemplo', 4, 'lb', '25.80']],
  'frijol-volteado': [['frijol-volteado', 'Frijol volteado en bolsa', 'Marca B Ejemplo', 800, 'g', '16.40']],
  huevo: [
    ['huevo', 'Huevos', 'Granja B Ejemplo', 30, 'u', '43.50', { promo: { kind: 'requisito', text: 'Precio con tarjeta de cliente frecuente', priceQ: '39.90' } }],
  ],
  'pollo-piezas': [
    ['pollo-piezas', 'Pollo en piezas', 'Granel', 1, 'lb', '16.20', { promo: { kind: 'minQty', minQty: 5, priceQ: '14.25', text: 'Desde 5 lb, Q14.25 c/lb' } }],
  ],
  tortilla: [['tortilla', 'Tortillas de maíz (paquete)', 'Tortillería B Ejemplo', 10, 'u', '4.50']],
  aceite: [
    ['aceite', 'Aceite vegetal', 'Marca B Ejemplo', 1, 'l', '27.50', { promo: { kind: 'nxm', buy: 2, pay: 1.5, text: 'Segundo a mitad de precio' } }],
  ],
  // Agotado en B
  chipilin: [['chipilin', 'Chipilín', 'Granel', 1, 'manojo', '3.75', { availability: 'agotado' }]],
};
// Productos que B no tiene en su catálogo de ejemplo
const B_MISSING = new Set(['hierba-mora', 'chile-guaque', 'chile-pasa', 'tusa', 'remolacha']);
// Ajuste fijo de precios de B frente a A para los demás productos (en centavos, sin decimales binarios)
const B_DELTA = { carnes: -150, verduras: 35, granos: 20 };

import { INGREDIENTS } from './ingredients.js';
import { parseQuetzales } from '../engine/money.js';

const FICTICIO = '2026-10-19T08:00:00-06:00';

function make(storeId, [ing, product, brand, qty, unit, priceQ, extra = {}], idx) {
  const promo = extra.promo
    ? { ...extra.promo, priceCents: extra.promo.priceQ ? parseQuetzales(extra.promo.priceQ) : undefined }
    : null;
  return {
    id: `${storeId}-${ing}-${idx}`,
    storeId,
    ingredientId: ing,
    product,
    brand,
    packQty: qty,
    packUnit: unit,
    priceCents: parseQuetzales(priceQ),
    promo,
    availability: extra.availability ?? 'disponible',
    channel: 'ejemplo',
    branch: null,
    sourceUrl: null,
    fetchedAt: FICTICIO,
    status: 'ejemplo',
  };
}

export function sampleOffers() {
  const out = A.map((row, idx) => make('ejemplo-a', row, idx));
  let idx = 0;
  const seen = new Set();
  for (const row of A) {
    const ing = row[0];
    if (B_MISSING.has(ing)) continue;
    if (B_OVERRIDES[ing]) {
      if (seen.has(ing)) continue;
      seen.add(ing);
      for (const r of B_OVERRIDES[ing]) out.push(make('ejemplo-b', r, idx++));
      continue;
    }
    const cat = INGREDIENTS[ing].cat;
    const delta = B_DELTA[cat] ?? 0;
    const cents = Math.max(25, parseQuetzales(row[5]) + delta);
    const price = `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
    out.push(make('ejemplo-b', [row[0], row[1], row[2].replace('Ejemplo', 'B Ejemplo'), row[3], row[4], price], idx++));
  }
  return out;
}
