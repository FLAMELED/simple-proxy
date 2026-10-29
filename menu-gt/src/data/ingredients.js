// Catálogo de ingredientes. `base` es la unidad en la que se suma la demanda.
// Las equivalencias por pieza o por taza son aproximadas y citan su referencia
// (USDA FoodData Central, porciones estándar). Las hierbas en manojo no se
// convierten a peso porque un manojo varía según vendedor y temporada.

const USDA = 'ref. USDA FoodData Central';

export const CATEGORIES = [
  { id: 'verduras', label: 'Verduras' },
  { id: 'hierbas', label: 'Hierbas y hojas' },
  { id: 'frutas', label: 'Frutas' },
  { id: 'carnes', label: 'Carnes, pollo y huevos' },
  { id: 'lacteos', label: 'Lácteos' },
  { id: 'granos', label: 'Granos y abarrotes' },
  { id: 'tortilleria', label: 'Tortillería y panadería' },
  { id: 'despensa', label: 'Aceites, salsas y especias' },
];

export const ALLERGENS = [
  { id: 'huevo', label: 'Huevo' },
  { id: 'lacteos', label: 'Lácteos' },
  { id: 'gluten', label: 'Gluten (trigo)' },
  { id: 'pescado', label: 'Pescado' },
  { id: 'soya', label: 'Soya' },
  { id: 'ajonjoli', label: 'Ajonjolí' },
];

const list = [
  // Granos y abarrotes (cantidades en crudo / seco)
  { id: 'arroz', name: 'arroz blanco (crudo)', cat: 'granos', base: 'g', gPerCup: 185, gPerCupSource: USDA },
  { id: 'frijol-negro', name: 'frijol negro seco', cat: 'granos', base: 'g', gPerCup: 194, gPerCupSource: USDA },
  { id: 'frijol-volteado', name: 'frijol negro volteado (preparado)', cat: 'granos', base: 'g' },
  { id: 'lentejas', name: 'lentejas secas', cat: 'granos', base: 'g', gPerCup: 192, gPerCupSource: USDA },
  { id: 'harina-maiz', name: 'harina de maíz nixtamalizado', cat: 'granos', base: 'g', gPerCup: 114, gPerCupSource: USDA },
  { id: 'avena', name: 'avena en hojuelas', cat: 'granos', base: 'g', gPerCup: 81, gPerCupSource: USDA, allergens: [] },
  { id: 'fideos', name: 'fideos / pasta seca', cat: 'granos', base: 'g', allergens: ['gluten'] },
  { id: 'azucar', name: 'azúcar', cat: 'granos', base: 'g', gPerCup: 200, gPerCupSource: USDA },
  { id: 'atun', name: 'atún en lata (escurrido)', cat: 'granos', base: 'g', allergens: ['pescado'], protein: 'pescado' },
  { id: 'pepitoria', name: 'pepitoria (semilla de ayote)', cat: 'granos', base: 'g' },
  { id: 'ajonjoli', name: 'ajonjolí', cat: 'granos', base: 'g', allergens: ['ajonjoli'] },
  { id: 'chile-guaque', name: 'chile guaque (seco)', cat: 'granos', base: 'g' },
  { id: 'chile-pasa', name: 'chile pasa (seco)', cat: 'granos', base: 'g' },
  { id: 'tusa', name: 'hojas de tusa', cat: 'granos', base: 'u', unitName: 'hoja', unitNamePlural: 'hojas' },

  // Carnes, pollo y huevos (peso crudo)
  { id: 'pollo-pechuga', name: 'pechuga de pollo', cat: 'carnes', base: 'g', protein: 'pollo' },
  { id: 'pollo-piezas', name: 'pollo en piezas (pierna y muslo)', cat: 'carnes', base: 'g', protein: 'pollo' },
  { id: 'res-guisar', name: 'carne de res para guisar', cat: 'carnes', base: 'g', protein: 'res' },
  { id: 'res-molida', name: 'carne de res molida', cat: 'carnes', base: 'g', protein: 'res' },
  { id: 'res-falda', name: 'falda de res (para hilachas)', cat: 'carnes', base: 'g', protein: 'res' },
  { id: 'cerdo-costilla', name: 'costilla de cerdo', cat: 'carnes', base: 'g', protein: 'cerdo' },
  { id: 'longaniza', name: 'longaniza', cat: 'carnes', base: 'g', protein: 'cerdo' },
  {
    id: 'huevo', name: 'huevo', cat: 'carnes', base: 'u', allergens: ['huevo'], protein: 'huevo',
    unitName: 'huevo', unitNamePlural: 'huevos', sellsByDozen: true,
  },

  // Lácteos
  { id: 'queso-fresco', name: 'queso fresco', cat: 'lacteos', base: 'g', allergens: ['lacteos'], protein: 'queso' },
  { id: 'queso-seco', name: 'queso seco (duro)', cat: 'lacteos', base: 'g', allergens: ['lacteos'] },
  { id: 'crema', name: 'crema', cat: 'lacteos', base: 'ml', allergens: ['lacteos'] },
  { id: 'leche', name: 'leche', cat: 'lacteos', base: 'ml', allergens: ['lacteos'] },

  // Verduras (peso con cáscara, tal como se compran)
  { id: 'tomate', name: 'tomate', cat: 'verduras', base: 'g', unitG: 123, unitGSource: `${USDA}, mediano`, unitName: 'tomate', unitNamePlural: 'tomates' },
  { id: 'miltomate', name: 'miltomate', cat: 'verduras', base: 'g' },
  { id: 'cebolla', name: 'cebolla', cat: 'verduras', base: 'g', unitG: 110, unitGSource: `${USDA}, mediana`, unitName: 'cebolla', unitNamePlural: 'cebollas' },
  { id: 'ajo', name: 'ajo', cat: 'verduras', base: 'g', units: { diente: { qty: 3, unit: 'g', approx: true, label: 'diente', plural: 'dientes', note: `1 diente de ajo ≈ 3 g (${USDA})` } } },
  { id: 'chile-pimiento', name: 'chile pimiento', cat: 'verduras', base: 'g', unitG: 119, unitGSource: `${USDA}, mediano`, unitName: 'chile', unitNamePlural: 'chiles' },
  { id: 'jalapeno', name: 'chile jalapeño', cat: 'verduras', base: 'g', unitG: 14, unitGSource: USDA, unitName: 'chile', unitNamePlural: 'chiles' },
  { id: 'papa', name: 'papa', cat: 'verduras', base: 'g', unitG: 213, unitGSource: `${USDA}, mediana`, unitName: 'papa', unitNamePlural: 'papas' },
  { id: 'guisquil', name: 'güisquil', cat: 'verduras', base: 'g', unitG: 203, unitGSource: `${USDA} (chayote)`, unitName: 'güisquil', unitNamePlural: 'güisquiles' },
  { id: 'guicoy', name: 'güicoy', cat: 'verduras', base: 'g', unitG: 196, unitGSource: `${USDA} (calabacín mediano)`, unitName: 'güicoy', unitNamePlural: 'güicoyes' },
  { id: 'ejotes', name: 'ejotes', cat: 'verduras', base: 'g' },
  { id: 'zanahoria', name: 'zanahoria', cat: 'verduras', base: 'g', unitG: 61, unitGSource: `${USDA}, mediana`, unitName: 'zanahoria', unitNamePlural: 'zanahorias' },
  { id: 'repollo', name: 'repollo', cat: 'verduras', base: 'g' },
  { id: 'remolacha', name: 'remolacha', cat: 'verduras', base: 'g', unitG: 82, unitGSource: USDA, unitName: 'remolacha', unitNamePlural: 'remolachas' },
  { id: 'elote', name: 'elote', cat: 'verduras', base: 'u', unitName: 'elote', unitNamePlural: 'elotes' },
  { id: 'aguacate', name: 'aguacate', cat: 'verduras', base: 'u', unitName: 'aguacate', unitNamePlural: 'aguacates' },
  { id: 'platano', name: 'plátano maduro', cat: 'verduras', base: 'u', unitG: 179, unitGSource: `${USDA}, mediano`, unitName: 'plátano', unitNamePlural: 'plátanos' },
  { id: 'lechuga', name: 'lechuga', cat: 'verduras', base: 'u', unitName: 'lechuga', unitNamePlural: 'lechugas' },

  // Hierbas y hojas: se compran por manojo; no se convierten a peso.
  { id: 'cilantro', name: 'cilantro', cat: 'hierbas', base: 'manojo' },
  { id: 'hierbabuena', name: 'hierbabuena', cat: 'hierbas', base: 'manojo' },
  { id: 'cebollin', name: 'cebollín', cat: 'hierbas', base: 'manojo' },
  { id: 'chipilin', name: 'chipilín', cat: 'hierbas', base: 'manojo' },
  { id: 'hierba-mora', name: 'hierba mora', cat: 'hierbas', base: 'manojo' },
  { id: 'limon', name: 'limón', cat: 'hierbas', base: 'u', unitG: 67, unitGSource: `${USDA} (lima)`, unitName: 'limón', unitNamePlural: 'limones' },

  // Frutas
  { id: 'banano', name: 'banano', cat: 'frutas', base: 'u', unitG: 118, unitGSource: `${USDA}, mediano`, unitName: 'banano', unitNamePlural: 'bananos' },
  { id: 'papaya', name: 'papaya', cat: 'frutas', base: 'g' },
  { id: 'pina', name: 'piña', cat: 'frutas', base: 'u', unitName: 'piña', unitNamePlural: 'piñas' },
  { id: 'mango', name: 'mango', cat: 'frutas', base: 'u', unitName: 'mango', unitNamePlural: 'mangos' },

  // Tortillería y panadería
  { id: 'tortilla', name: 'tortilla de maíz', cat: 'tortilleria', base: 'u', unitName: 'tortilla', unitNamePlural: 'tortillas' },
  { id: 'tostada', name: 'tostada', cat: 'tortilleria', base: 'u', unitName: 'tostada', unitNamePlural: 'tostadas' },
  { id: 'pan-frances', name: 'pan francés', cat: 'tortilleria', base: 'u', allergens: ['gluten'], unitName: 'pan', unitNamePlural: 'panes' },
  { id: 'pan-molido', name: 'pan molido', cat: 'tortilleria', base: 'g', allergens: ['gluten'] },

  // Aceites, salsas y especias
  { id: 'aceite', name: 'aceite vegetal', cat: 'despensa', base: 'ml' },
  { id: 'sal', name: 'sal', cat: 'despensa', base: 'g', gPerCup: 288, gPerCupSource: `${USDA} (1 cdta ≈ 6 g)` },
  { id: 'consome', name: 'consomé de pollo en polvo', cat: 'despensa', base: 'g' },
  { id: 'achiote', name: 'achiote en pasta', cat: 'despensa', base: 'g' },
  { id: 'salsa-soya', name: 'salsa de soya', cat: 'despensa', base: 'ml', allergens: ['soya', 'gluten'] },
  { id: 'hierbas-olor', name: 'hierbas de olor secas (laurel y tomillo)', cat: 'despensa', base: 'g' },
  { id: 'canela', name: 'canela en raja', cat: 'despensa', base: 'g' },
  { id: 'vinagre', name: 'vinagre', cat: 'despensa', base: 'ml' },
];

export const INGREDIENTS = Object.fromEntries(list.map((i) => [i.id, { allergens: [], ...i }]));

export function ingredient(id) {
  const ing = INGREDIENTS[id];
  if (!ing) throw new Error(`Ingrediente desconocido: ${id}`);
  return ing;
}

export const PROTEINS = [
  { id: 'pollo', label: 'Pollo' },
  { id: 'res', label: 'Res' },
  { id: 'cerdo', label: 'Cerdo' },
  { id: 'pescado', label: 'Pescado' },
  { id: 'huevo', label: 'Huevo' },
];
