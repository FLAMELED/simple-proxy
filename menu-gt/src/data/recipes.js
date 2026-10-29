// Recetas cotidianas de referencia. Cantidades en crudo o seco, tal como se
// compran. No han sido probadas en una cocina por este proyecto: son una base
// para planificar y deben ajustarse al gusto de cada hogar.
// `yield` = porciones que rinde la receta tal como está escrita.

const i = (ing, qty, unit, note) => ({ ing, qty, unit, ...(note ? { note } : {}) });

export const EQUIPMENT = [
  { id: 'estufa', label: 'Estufa' },
  { id: 'olla', label: 'Olla' },
  { id: 'sarten', label: 'Sartén' },
  { id: 'comal', label: 'Comal' },
  { id: 'licuadora', label: 'Licuadora' },
  { id: 'horno', label: 'Horno' },
  { id: 'vaporera', label: 'Olla para tamales (vaporera)' },
];

export const MEALS = [
  { id: 'desayuno', label: 'Desayuno' },
  { id: 'almuerzo', label: 'Almuerzo' },
  { id: 'cena', label: 'Cena' },
];

export const RECIPES = [
  // ---------- Desayunos ----------
  {
    id: 'desayuno-chapin', name: 'Desayuno chapín', meals: ['desayuno'], yield: 4, minutes: 25,
    protein: 'huevo', equipment: ['estufa', 'sarten', 'comal'], tags: ['tipico'],
    ingredients: [
      i('huevo', 8, 'u'), i('frijol-volteado', 400, 'g'), i('platano', 2, 'u'),
      i('crema', 120, 'ml'), i('queso-fresco', 150, 'g'), i('tortilla', 12, 'u'), i('aceite', 3, 'cda'), i('sal', 0.5, 'cdta'),
    ],
    steps: [
      'Pela y corta los plátanos en tiras; fríelos en 2 cucharadas de aceite hasta dorar.',
      'Calienta el frijol volteado en la misma sartén a fuego bajo.',
      'Estrella los huevos con el aceite restante y sazona con sal.',
      'Sirve con crema, queso fresco desmoronado y tortillas calientes del comal.',
    ],
  },
  {
    id: 'huevos-ejotes', name: 'Huevos envueltos con ejotes', meals: ['desayuno', 'cena'], yield: 4, minutes: 25,
    protein: 'huevo', equipment: ['estufa', 'olla', 'sarten'], tags: ['tipico'],
    ingredients: [
      i('huevo', 6, 'u'), i('ejotes', 300, 'g'), i('tomate', 1, 'u'), i('cebolla', 0.5, 'u'),
      i('aceite', 2, 'cda'), i('sal', 0.5, 'cdta'), i('tortilla', 12, 'u'),
    ],
    steps: [
      'Despunta los ejotes, córtalos en trozos y cuécelos en agua con sal 6–8 minutos; escurre.',
      'Sofríe cebolla y tomate picados en el aceite.',
      'Agrega los ejotes, luego los huevos batidos, y mezcla hasta que cuajen.',
      'Sirve con tortillas.',
    ],
  },
  {
    id: 'mosh', name: 'Mosh de avena con banano', meals: ['desayuno'], yield: 4, minutes: 15,
    protein: null, equipment: ['estufa', 'olla'], tags: ['vegetariano', 'rapido'],
    ingredients: [
      i('avena', 1.5, 'taza'), i('leche', 1, 'l'), i('canela', 5, 'g'), i('azucar', 4, 'cda'), i('banano', 4, 'u'),
    ],
    steps: [
      'Hierve la leche con la canela.',
      'Agrega la avena y cocina 5–7 minutos moviendo para que no se pegue.',
      'Endulza al gusto y sirve con banano en rodajas.',
    ],
  },
  {
    id: 'panes-frijol', name: 'Panes con frijol, queso y aguacate', meals: ['desayuno', 'cena'], yield: 4, minutes: 10,
    protein: 'queso', equipment: ['comal'], tags: ['vegetariano', 'rapido'],
    ingredients: [
      i('pan-frances', 8, 'u'), i('frijol-volteado', 300, 'g'), i('queso-fresco', 150, 'g'), i('aguacate', 2, 'u'), i('tomate', 1, 'u'),
    ],
    steps: [
      'Abre los panes y caliéntalos en el comal.',
      'Unta frijol, agrega queso, rodajas de aguacate y tomate.',
    ],
  },
  {
    id: 'tortillas-queso', name: 'Tortillas con frijol, queso y chirmol', meals: ['desayuno', 'cena'], yield: 4, minutes: 20,
    protein: 'queso', equipment: ['comal'], tags: ['vegetariano', 'tipico', 'rapido'],
    ingredients: [
      i('tortilla', 16, 'u'), i('frijol-volteado', 400, 'g'), i('queso-fresco', 200, 'g'),
      i('tomate', 3, 'u'), i('cebolla', 0.5, 'u'), i('cilantro', 0.5, 'manojo'), i('limon', 1, 'u'), i('sal', 0.5, 'cdta'),
    ],
    steps: [
      'Asa los tomates en el comal, pélalos y machácalos con cebolla y cilantro picados, limón y sal (chirmol).',
      'Calienta las tortillas y el frijol.',
      'Sirve las tortillas con frijol, queso y chirmol.',
    ],
  },
  {
    id: 'platanos-frijol', name: 'Plátanos fritos con frijol y crema', meals: ['desayuno', 'cena'], yield: 4, minutes: 20,
    protein: null, equipment: ['estufa', 'sarten'], tags: ['vegetariano', 'tipico'],
    ingredients: [
      i('platano', 4, 'u'), i('frijol-volteado', 400, 'g'), i('crema', 200, 'ml'), i('aceite', 3, 'cda'), i('tortilla', 8, 'u'),
    ],
    steps: [
      'Corta los plátanos maduros en tiras y fríelos en el aceite hasta caramelizar.',
      'Calienta el frijol volteado.',
      'Sirve con crema y tortillas.',
    ],
  },

  // ---------- Almuerzos ----------
  {
    id: 'pepian', name: 'Pepián de pollo', meals: ['almuerzo'], yield: 6, minutes: 90,
    protein: 'pollo', equipment: ['estufa', 'olla', 'comal', 'licuadora'], tags: ['tipico', 'fin-de-semana'],
    ingredients: [
      i('pollo-piezas', 1500, 'g'), i('tomate', 5, 'u'), i('miltomate', 250, 'g'), i('cebolla', 1, 'u'),
      i('chile-guaque', 15, 'g'), i('chile-pasa', 10, 'g'), i('pepitoria', 60, 'g'), i('ajonjoli', 40, 'g'),
      i('guisquil', 2, 'u'), i('papa', 3, 'u'), i('ejotes', 200, 'g'), i('cilantro', 1, 'manojo'),
      i('sal', 1, 'cdta'), i('arroz', 2, 'taza'), i('tortilla', 18, 'u'),
    ],
    steps: [
      'Cuece el pollo en agua con sal 30 minutos; reserva el caldo.',
      'Tuesta en el comal tomate, miltomate, cebolla, chiles (sin semillas), pepitoria y ajonjolí, sin quemarlos.',
      'Licúa todo lo tostado con 2 tazas del caldo y el cilantro.',
      'Cocina la salsa en la olla, agrega el pollo, el güisquil, la papa y los ejotes en trozos; cocina 25 minutos.',
      'Prepara el arroz aparte y sirve con tortillas.',
    ],
  },
  {
    id: 'jocon', name: 'Jocón de pollo', meals: ['almuerzo'], yield: 6, minutes: 70,
    protein: 'pollo', equipment: ['estufa', 'olla', 'licuadora'], tags: ['tipico'],
    ingredients: [
      i('pollo-piezas', 1500, 'g'), i('miltomate', 500, 'g'), i('cilantro', 2, 'manojo'), i('cebollin', 1, 'manojo'),
      i('jalapeno', 2, 'u'), i('pepitoria', 50, 'g'), i('tortilla', 2, 'u', 'para espesar'),
      i('sal', 1, 'cdta'), i('arroz', 2, 'taza'),
    ],
    steps: [
      'Cuece el pollo en agua con sal; reserva el caldo.',
      'Cuece los miltomates y licúalos con cilantro, cebollín, chile, pepitoria y las tortillas remojadas.',
      'Cocina la salsa con 2 tazas de caldo, agrega el pollo y deja hervir 15 minutos.',
      'Sirve con arroz.',
    ],
  },
  {
    id: 'caldo-res', name: 'Caldo de res', meals: ['almuerzo'], yield: 6, minutes: 120,
    protein: 'res', equipment: ['estufa', 'olla'], tags: ['tipico', 'fin-de-semana'],
    ingredients: [
      i('res-guisar', 1200, 'g'), i('guisquil', 2, 'u'), i('papa', 3, 'u'), i('zanahoria', 3, 'u'), i('elote', 3, 'u'),
      i('repollo', 400, 'g'), i('guicoy', 2, 'u'), i('cebolla', 1, 'u'), i('tomate', 2, 'u'),
      i('cilantro', 1, 'manojo'), i('sal', 2, 'cdta'), i('limon', 3, 'u'), i('tortilla', 18, 'u'),
    ],
    steps: [
      'Cuece la carne con cebolla, tomate y sal a fuego medio, retirando la espuma, 1 hora o hasta suavizar.',
      'Agrega elote en trozos, zanahoria y papa; 15 minutos.',
      'Agrega güisquil, güicoy y repollo; 10–15 minutos más.',
      'Sirve con cilantro picado, limón y tortillas.',
    ],
  },
  {
    id: 'caldo-pollo', name: 'Caldo de pollo con verduras', meals: ['almuerzo', 'cena'], yield: 6, minutes: 60,
    protein: 'pollo', equipment: ['estufa', 'olla'], tags: [],
    ingredients: [
      i('pollo-piezas', 1200, 'g'), i('guisquil', 2, 'u'), i('papa', 3, 'u'), i('zanahoria', 2, 'u'),
      i('guicoy', 1, 'u'), i('cebolla', 1, 'u'), i('ajo', 2, 'diente'), i('hierbabuena', 0.5, 'manojo'),
      i('sal', 2, 'cdta'), i('arroz', 1, 'taza'), i('limon', 3, 'u'), i('tortilla', 18, 'u'),
    ],
    steps: [
      'Cuece el pollo con cebolla, ajo y sal 30 minutos.',
      'Agrega papa y zanahoria; 10 minutos. Luego güisquil y güicoy; 10 minutos más.',
      'Al final agrega la hierbabuena. Prepara el arroz aparte.',
      'Sirve con arroz, limón y tortillas.',
    ],
  },
  {
    id: 'hilachas', name: 'Hilachas', meals: ['almuerzo'], yield: 6, minutes: 100,
    protein: 'res', equipment: ['estufa', 'olla', 'comal', 'licuadora'], tags: ['tipico'],
    ingredients: [
      i('res-falda', 1000, 'g'), i('tomate', 5, 'u'), i('miltomate', 250, 'g'), i('chile-guaque', 10, 'g'),
      i('chile-pasa', 10, 'g'), i('papa', 3, 'u'), i('zanahoria', 2, 'u'), i('cebolla', 1, 'u'),
      i('achiote', 10, 'g'), i('tortilla', 2, 'u', 'para espesar'), i('sal', 1, 'cdta'), i('arroz', 2, 'taza'),
    ],
    steps: [
      'Cuece la falda con cebolla y sal hasta que se deshebre fácilmente (alrededor de 1 hora). Deshébrala.',
      'Asa tomate, miltomate y chiles; licúalos con achiote, las tortillas remojadas y 1 taza de caldo.',
      'Cocina la salsa, agrega la carne, la papa y la zanahoria en cubos; 20 minutos.',
      'Sirve con arroz.',
    ],
  },
  {
    id: 'carne-guisada', name: 'Carne guisada con papas', meals: ['almuerzo'], yield: 4, minutes: 75,
    protein: 'res', equipment: ['estufa', 'olla', 'licuadora'], tags: [],
    ingredients: [
      i('res-guisar', 800, 'g'), i('papa', 4, 'u'), i('tomate', 4, 'u'), i('cebolla', 1, 'u'),
      i('chile-pimiento', 1, 'u'), i('ajo', 2, 'diente'), i('hierbas-olor', 2, 'g'), i('aceite', 2, 'cda'),
      i('sal', 1, 'cdta'), i('arroz', 1.5, 'taza'), i('tortilla', 12, 'u'),
    ],
    steps: [
      'Dora la carne en cubos con el aceite.',
      'Licúa tomate, cebolla, chile pimiento y ajo; agrégalo con las hierbas y 1 taza de agua.',
      'Cocina tapado 40 minutos, agrega la papa en cubos y cocina 20 minutos más.',
      'Sirve con arroz y tortillas.',
    ],
  },
  {
    id: 'pollo-guisado', name: 'Pollo guisado', meals: ['almuerzo', 'cena'], yield: 4, minutes: 50,
    protein: 'pollo', equipment: ['estufa', 'olla', 'licuadora'], tags: [],
    ingredients: [
      i('pollo-piezas', 1000, 'g'), i('tomate', 4, 'u'), i('cebolla', 1, 'u'), i('chile-pimiento', 1, 'u'),
      i('ajo', 2, 'diente'), i('papa', 2, 'u'), i('zanahoria', 2, 'u'), i('consome', 10, 'g'),
      i('aceite', 2, 'cda'), i('arroz', 1.5, 'taza'), i('tortilla', 12, 'u'),
    ],
    steps: [
      'Dora el pollo en el aceite.',
      'Licúa tomate, cebolla, chile y ajo con el consomé y 1 taza de agua.',
      'Agrega la salsa, la papa y la zanahoria; cocina tapado 30 minutos.',
      'Sirve con arroz y tortillas.',
    ],
  },
  {
    id: 'arroz-pollo', name: 'Arroz con pollo y verduras', meals: ['almuerzo', 'cena'], yield: 4, minutes: 45,
    protein: 'pollo', equipment: ['estufa', 'olla'], tags: [],
    ingredients: [
      i('arroz', 2, 'taza'), i('pollo-pechuga', 500, 'g'), i('zanahoria', 2, 'u'), i('ejotes', 150, 'g'),
      i('chile-pimiento', 1, 'u'), i('cebolla', 0.5, 'u'), i('tomate', 2, 'u'), i('consome', 10, 'g'),
      i('achiote', 5, 'g'), i('aceite', 2, 'cda'),
    ],
    steps: [
      'Cuece y deshebra la pechuga; guarda 4 tazas del caldo.',
      'Sofríe cebolla, chile y tomate; agrega el arroz y dóralo un poco.',
      'Agrega el caldo con consomé y achiote, la zanahoria y los ejotes picados.',
      'Cuando hierva, baja el fuego, tapa y cocina 20 minutos. Mezcla el pollo al final.',
    ],
  },
  {
    id: 'pollo-achiote', name: 'Pollo al horno con achiote', meals: ['almuerzo'], yield: 4, minutes: 70,
    protein: 'pollo', equipment: ['horno', 'licuadora', 'estufa', 'olla'], tags: [],
    ingredients: [
      i('pollo-piezas', 1200, 'g'), i('achiote', 30, 'g'), i('limon', 3, 'u'), i('ajo', 3, 'diente'),
      i('cebolla', 1, 'u'), i('sal', 1, 'cdta'), i('papa', 4, 'u'), i('arroz', 1.5, 'taza'),
    ],
    steps: [
      'Licúa achiote, jugo de limón, ajo y sal con un poco de agua; unta el pollo y deja reposar 20 minutos.',
      'Hornea el pollo con la cebolla y la papa en gajos a 200 °C por 45 minutos.',
      'Prepara el arroz y sirve.',
    ],
  },
  {
    id: 'guisquiles-rellenos', name: 'Güisquiles rellenos', meals: ['almuerzo', 'cena'], yield: 4, minutes: 50,
    protein: 'queso', equipment: ['estufa', 'olla', 'sarten'], tags: ['vegetariano', 'tipico'],
    ingredients: [
      i('guisquil', 4, 'u'), i('queso-fresco', 200, 'g'), i('huevo', 3, 'u'), i('pan-molido', 60, 'g'),
      i('cebolla', 0.5, 'u'), i('aceite', 3, 'cda'), i('sal', 0.5, 'cdta'), i('arroz', 1.5, 'taza'),
    ],
    steps: [
      'Cuece los güisquiles partidos a la mitad 20 minutos. Saca la pulpa sin romper la cáscara.',
      'Machaca la pulpa con queso, cebolla picada, 1 huevo y la mitad del pan molido.',
      'Rellena las cáscaras, cubre con los huevos batidos y el resto del pan molido.',
      'Dora en la sartén con aceite por el lado del relleno. Sirve con arroz.',
    ],
  },
  {
    id: 'lentejas', name: 'Lentejas guisadas', meals: ['almuerzo', 'cena'], yield: 4, minutes: 45,
    protein: null, equipment: ['estufa', 'olla'], tags: ['vegetariano'],
    ingredients: [
      i('lentejas', 1.5, 'taza'), i('tomate', 2, 'u'), i('cebolla', 1, 'u'), i('zanahoria', 2, 'u'),
      i('papa', 2, 'u'), i('ajo', 2, 'diente'), i('aceite', 2, 'cda'), i('sal', 1, 'cdta'), i('arroz', 1, 'taza'),
    ],
    steps: [
      'Lava las lentejas. Sofríe cebolla, ajo y tomate en el aceite.',
      'Agrega lentejas, papa y zanahoria en cubos y 5 tazas de agua.',
      'Cocina 30 minutos a fuego medio hasta que estén suaves; sazona.',
      'Sirve con arroz.',
    ],
  },
  {
    id: 'frijoles-longaniza', name: 'Frijoles negros con longaniza', meals: ['almuerzo'], yield: 6, minutes: 150,
    protein: 'cerdo', equipment: ['estufa', 'olla', 'sarten'], tags: ['tipico', 'fin-de-semana'],
    ingredients: [
      i('frijol-negro', 500, 'g'), i('longaniza', 400, 'g'), i('cebolla', 1, 'u'), i('ajo', 3, 'diente'),
      i('sal', 1, 'cdta'), i('arroz', 2, 'taza'), i('tortilla', 18, 'u'),
    ],
    steps: [
      'Remoja el frijol desde la noche anterior. Cuécelo con cebolla y ajo 2 horas o hasta suavizar; sazona.',
      'Dora la longaniza en trozos y agrégala a los frijoles los últimos 15 minutos.',
      'Sirve con arroz y tortillas.',
    ],
  },
  {
    id: 'tortitas-atun', name: 'Tortitas de atún con arroz', meals: ['almuerzo', 'cena'], yield: 4, minutes: 35,
    protein: 'pescado', equipment: ['estufa', 'sarten', 'olla'], tags: ['rapido'],
    ingredients: [
      i('atun', 280, 'g'), i('huevo', 3, 'u'), i('pan-molido', 40, 'g'), i('cebolla', 0.5, 'u'),
      i('aceite', 4, 'cda'), i('arroz', 1.5, 'taza'), i('lechuga', 1, 'u'), i('tomate', 2, 'u'), i('limon', 2, 'u'),
    ],
    steps: [
      'Mezcla el atún escurrido con huevo, pan molido y cebolla picada.',
      'Forma tortitas y fríelas en el aceite hasta dorar por ambos lados.',
      'Sirve con arroz y una ensalada de lechuga y tomate con limón.',
    ],
  },
  {
    id: 'chao-mein', name: 'Chao mein de pollo', meals: ['almuerzo', 'cena'], yield: 4, minutes: 35,
    protein: 'pollo', equipment: ['estufa', 'olla', 'sarten'], tags: ['rapido'],
    ingredients: [
      i('fideos', 400, 'g'), i('pollo-pechuga', 450, 'g'), i('repollo', 300, 'g'), i('zanahoria', 2, 'u'),
      i('chile-pimiento', 1, 'u'), i('cebolla', 1, 'u'), i('salsa-soya', 60, 'ml'), i('aceite', 3, 'cda'),
    ],
    steps: [
      'Cuece los fideos y escúrrelos.',
      'Saltea el pollo en tiras con el aceite; agrega cebolla, chile, zanahoria y repollo en juliana.',
      'Agrega los fideos y la salsa de soya; mezcla a fuego alto 3 minutos.',
    ],
  },
  {
    id: 'sopa-fideos', name: 'Sopa de fideos con verduras', meals: ['almuerzo', 'cena'], yield: 4, minutes: 30,
    protein: null, equipment: ['estufa', 'olla', 'licuadora'], tags: ['vegetariano', 'rapido'],
    ingredients: [
      i('fideos', 250, 'g'), i('tomate', 3, 'u'), i('cebolla', 0.5, 'u'), i('ajo', 1, 'diente'),
      i('guisquil', 1, 'u'), i('zanahoria', 1, 'u'), i('aceite', 2, 'cda'), i('sal', 1, 'cdta'), i('queso-seco', 60, 'g'),
    ],
    steps: [
      'Dora los fideos en el aceite.',
      'Licúa tomate, cebolla y ajo con 5 tazas de agua y agrégalo.',
      'Agrega güisquil y zanahoria en cubos; cocina 12 minutos y sazona.',
      'Sirve con queso seco rallado.',
    ],
  },

  // ---------- Cenas ----------
  {
    id: 'chilaquilas', name: 'Chilaquilas de güisquil', meals: ['cena', 'almuerzo'], yield: 4, minutes: 45,
    protein: 'queso', equipment: ['estufa', 'olla', 'sarten', 'licuadora'], tags: ['vegetariano', 'tipico'],
    ingredients: [
      i('guisquil', 3, 'u'), i('queso-fresco', 250, 'g'), i('huevo', 4, 'u'), i('tomate', 4, 'u'),
      i('cebolla', 0.5, 'u'), i('aceite', 6, 'cda'), i('sal', 0.5, 'cdta'), i('frijol-volteado', 300, 'g'),
    ],
    steps: [
      'Cuece el güisquil en rodajas de 1 cm hasta que esté suave pero firme.',
      'Pon queso entre dos rodajas y pásalas por huevo batido a punto de nieve.',
      'Fríelas en aceite hasta dorar.',
      'Licúa y cocina tomate con cebolla y sal; sirve las chilaquilas en esa salsa, con frijol.',
    ],
  },
  {
    id: 'enchiladas', name: 'Enchiladas guatemaltecas', meals: ['cena'], yield: 4, minutes: 60,
    protein: 'res', equipment: ['estufa', 'olla', 'sarten'], tags: ['tipico'],
    ingredients: [
      i('tostada', 12, 'u'), i('res-molida', 450, 'g'), i('repollo', 400, 'g'), i('remolacha', 2, 'u'),
      i('zanahoria', 2, 'u'), i('ejotes', 150, 'g'), i('cebolla', 1, 'u'), i('vinagre', 60, 'ml'),
      i('huevo', 3, 'u'), i('queso-seco', 60, 'g'), i('tomate', 3, 'u'), i('aceite', 2, 'cda'), i('sal', 1, 'cdta'),
    ],
    steps: [
      'Cuece remolacha, zanahoria y ejotes; pícalos y mézclalos con repollo picado, vinagre y sal (picado). Reposa 20 minutos.',
      'Cocina la carne con cebolla y tomate picados en el aceite.',
      'Cuece los huevos 10 minutos y rebánalos.',
      'Arma: tostada, carne, picado, huevo, cebolla en aros y queso seco.',
    ],
  },
  {
    id: 'tacos-dorados', name: 'Tacos dorados de pollo', meals: ['cena'], yield: 4, minutes: 40,
    protein: 'pollo', equipment: ['estufa', 'olla', 'sarten', 'licuadora'], tags: [],
    ingredients: [
      i('pollo-pechuga', 500, 'g'), i('tortilla', 16, 'u'), i('aceite', 120, 'ml'), i('repollo', 300, 'g'),
      i('tomate', 3, 'u'), i('cebolla', 0.5, 'u'), i('queso-seco', 50, 'g'), i('sal', 1, 'cdta'),
    ],
    steps: [
      'Cuece y deshebra la pechuga con sal.',
      'Rellena las tortillas, enróllalas y fríelas hasta dorar; escurre en papel.',
      'Licúa y cocina tomate con cebolla para la salsa.',
      'Sirve con repollo picado, salsa y queso seco.',
    ],
  },
  {
    id: 'tamalitos-chipilin', name: 'Tamalitos de chipilín', meals: ['cena', 'desayuno'], yield: 4, minutes: 80,
    protein: null, equipment: ['estufa', 'vaporera'], tags: ['vegetariano', 'tipico', 'fin-de-semana'],
    ingredients: [
      i('harina-maiz', 500, 'g'), i('chipilin', 1, 'manojo'), i('aceite', 60, 'ml'), i('sal', 1, 'cdta'),
      i('tusa', 16, 'u'), i('queso-fresco', 150, 'g'), i('crema', 120, 'ml'),
    ],
    steps: [
      'Remoja las hojas de tusa en agua tibia.',
      'Mezcla la harina con agua tibia, aceite, sal y las hojas de chipilín deshojadas hasta tener una masa suave.',
      'Envuelve porciones en las hojas de tusa.',
      'Cuece al vapor 45–50 minutos. Sirve con queso y crema.',
    ],
  },
  {
    id: 'hierba-mora-huevo', name: 'Hierba mora con huevo', meals: ['cena', 'desayuno'], yield: 4, minutes: 25,
    protein: 'huevo', equipment: ['estufa', 'olla', 'sarten'], tags: ['tipico', 'rapido'],
    ingredients: [
      i('hierba-mora', 2, 'manojo'), i('huevo', 6, 'u'), i('tomate', 2, 'u'), i('cebolla', 0.5, 'u'),
      i('aceite', 2, 'cda'), i('sal', 0.5, 'cdta'), i('tortilla', 12, 'u'),
    ],
    steps: [
      'Deshoja y lava la hierba mora; cuécela 5 minutos y escúrrela.',
      'Sofríe tomate y cebolla, agrega la hierba mora y luego los huevos batidos.',
      'Revuelve hasta cuajar y sirve con tortillas.',
    ],
  },
  {
    id: 'frijoles-colados', name: 'Frijoles colados con queso y crema', meals: ['cena'], yield: 4, minutes: 20,
    protein: 'queso', equipment: ['estufa', 'sarten'], tags: ['vegetariano', 'tipico', 'rapido'],
    ingredients: [
      i('frijol-volteado', 600, 'g'), i('queso-fresco', 150, 'g'), i('crema', 120, 'ml'),
      i('aguacate', 1, 'u'), i('tortilla', 16, 'u'), i('aceite', 1, 'cda'),
    ],
    steps: [
      'Calienta el frijol con el aceite, moviendo hasta que espese.',
      'Sirve con queso, crema, aguacate y tortillas calientes.',
    ],
  },
  {
    id: 'tostadas-guacamol', name: 'Tostadas con guacamol y frijol', meals: ['cena'], yield: 4, minutes: 15,
    protein: null, equipment: [], tags: ['vegetariano', 'rapido'],
    ingredients: [
      i('tostada', 12, 'u'), i('aguacate', 3, 'u'), i('frijol-volteado', 300, 'g'), i('tomate', 2, 'u'),
      i('cebolla', 0.5, 'u'), i('limon', 2, 'u'), i('queso-seco', 50, 'g'), i('sal', 0.5, 'cdta'),
    ],
    steps: [
      'Machaca el aguacate con limón, sal, cebolla y tomate picados.',
      'Unta frijol en las tostadas, cubre con guacamol y queso seco.',
    ],
  },
  {
    id: 'chuchitos', name: 'Chuchitos de pollo', meals: ['cena', 'almuerzo'], yield: 6, minutes: 120,
    protein: 'pollo', equipment: ['estufa', 'olla', 'licuadora', 'vaporera'], tags: ['tipico', 'fin-de-semana'],
    ingredients: [
      i('harina-maiz', 750, 'g'), i('pollo-pechuga', 600, 'g'), i('tomate', 5, 'u'), i('miltomate', 150, 'g'),
      i('chile-guaque', 10, 'g'), i('achiote', 10, 'g'), i('aceite', 120, 'ml'), i('sal', 2, 'cdta'),
      i('tusa', 24, 'u'), i('queso-seco', 80, 'g'),
    ],
    steps: [
      'Cuece el pollo y córtalo en trozos pequeños; reserva el caldo.',
      'Licúa tomate, miltomate, chile y achiote; cocina el recado 15 minutos.',
      'Prepara la masa con harina, caldo tibio, aceite y sal hasta que esté suave.',
      'Forma bolitas, agrega pollo y recado, envuelve en tusa y cuece al vapor 1 hora.',
      'Sirve con salsa de tomate y queso seco.',
    ],
  },
  {
    id: 'ensalada-frutas', name: 'Fruta picada con avena', meals: ['desayuno'], yield: 4, minutes: 10,
    protein: null, equipment: [], tags: ['vegetariano', 'rapido'],
    ingredients: [
      i('papaya', 600, 'g'), i('banano', 2, 'u'), i('pina', 0.5, 'u'), i('mango', 2, 'u'), i('limon', 1, 'u'), i('avena', 0.5, 'taza'),
    ],
    steps: [
      'Pela y pica la fruta.',
      'Rocía con limón y sirve con avena cruda o tostada por encima.',
    ],
  },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
