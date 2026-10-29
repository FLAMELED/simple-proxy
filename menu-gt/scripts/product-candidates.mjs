// Busca candidatos de producto por ingrediente en las URLs de los sitemaps
// publicados por cada supermercado. Solo lee la lista de URLs (sin red).
//   node scripts/product-candidates.mjs urls-paiz.txt urls-latorre.txt > candidatos.json
import { readFileSync } from 'node:fs';

// [ingrediente, palabras obligatorias (todas), palabras excluidas]
export const RULES = [
  ['arroz', ['arroz', 'blanco'], ['integral', 'precocido', 'basmati', 'jazmin', 'arborio', 'pollo', 'leche', 'galleta', 'cereal', 'harina', 'bebida', 'sazonador', 'atun']],
  ['frijol-negro', ['frijol', 'negro'], ['volteado', 'molido', 'refrito', 'lata', 'colado', 'instantaneo', 'chips', 'sopa']],
  ['frijol-volteado', ['frijol', 'volteado'], ['blanco', 'rojo', 'chips', 'sopa']],
  ['lentejas', ['lenteja'], ['sopa', 'lata', 'pasta', 'chips', 'snack']],
  ['harina-maiz', ['harina', 'maiz'], ['trigo', 'arroz', 'tostada', 'atol', 'pan']],
  ['avena', ['avena', 'hojuela'], ['galleta', 'barra', 'bebida', 'leche', 'cereal', 'shampoo', 'jabon', 'crema']],
  ['fideos', ['fideo'], ['instantaneo', 'sopa', 'ramen', 'maruchan', 'vaso', 'cup', 'arroz']],
  ['azucar', ['azucar'], ['morena', 'glas', 'pulverizada', 'sustituto', 'splenda', 'stevia', 'galleta', 'sin', 'light', 'dulce', 'cereal']],
  ['atun', ['atun'], ['aceite', 'galleta', 'ensalada', 'pasta', 'salsa', 'gato', 'perro', 'mascota', 'chile', 'mayonesa', 'pate']],
  ['pepitoria', ['pepitoria'], []],
  ['ajonjoli', ['ajonjoli'], ['aceite', 'galleta', 'barra', 'pan']],
  ['chile-guaque', ['guaque'], []],
  ['chile-pasa', ['chile', 'pasa'], ['pasas', 'pastilla']],
  ['tusa', ['tusa'], []],
  ['pollo-pechuga', ['pechuga', 'pollo'], ['empanizad', 'nugget', 'salchicha', 'jamon', 'embutido', 'sopa', 'consome', 'deli', 'ahumad', 'rellen', 'cocid', 'mascota', 'perro', 'gato', 'fajita', 'filete', 'congelad', 'pavo']],
  ['pollo-piezas', ['pollo'], ['pechuga', 'empanizad', 'nugget', 'salchicha', 'jamon', 'sopa', 'consome', 'caldo', 'perro', 'gato', 'mascota', 'alitas', 'sazonador', 'pasta', 'arroz', 'mortadela', 'chorizo', 'fideo', 'galleta', 'cubito', 'adobo', 'congelad', 'hamburguesa', 'pan', 'rostizado', 'frito', 'deli', 'molleja', 'higado', 'patas', 'pescuezo', 'menudo', 'croqueta', 'chicharron', 'ramen', 'instantane']],
  ['res-guisar', ['res'], ['molida', 'consome', 'caldo', 'perro', 'gato', 'mascota', 'hamburguesa', 'salchicha', 'jamon', 'sopa', 'cubito', 'chorizo', 'sazon', 'bistec', 'lomito', 'puyazo', 'costilla', 'hueso', 'higado', 'lengua', 'falda', 'pancita', 'tripa', 'ramen', 'instantane', 'galleta', 'snack', 'pellet', 'carne-seca', 'tasajo']],
  ['res-molida', ['molida', 'res'], ['perro', 'gato', 'mascota', 'hamburguesa']],
  ['res-falda', ['falda', 'res'], []],
  ['cerdo-costilla', ['costilla', 'cerdo'], ['ahumad', 'bbq', 'salsa', 'sazon']],
  ['longaniza', ['longaniza'], []],
  ['huevo', ['huevo'], ['pascua', 'chocolate', 'juguete', 'kinder', 'pasta', 'fideo', 'polvo', 'codorniz', 'liquido', 'galleta', 'mayonesa', 'shampoo', 'tortilla', 'figura', 'sorpresa', 'pan']],
  ['queso-fresco', ['queso', 'fresco'], ['crema', 'galleta', 'snack', 'cheetos', 'pan']],
  ['queso-seco', ['queso', 'seco'], ['crema', 'galleta', 'snack']],
  ['crema', ['crema'], ['dental', 'corporal', 'mani', 'cacahuate', 'peinar', 'facial', 'manos', 'cuerpo', 'afeitar', 'galleta', 'helado', 'cafe', 'batida', 'chantilly', 'sopa', 'champinon', 'elote', 'pie', 'pastel', 'labial', 'antiarrugas', 'solar', 'pies', 'hidratante', 'bebe', 'protectora', 'cabello', 'tratamiento', 'humectante', 'coco', 'avellana', 'cacao', 'chocolate', 'vainilla', 'fresa', 'acida', 'agria', 'queso']],
  ['leche', ['leche', 'entera'], ['polvo', 'evaporada', 'condensada', 'formula', 'infantil', 'saborizada', 'chocolate', 'fresa', 'deslactosada', 'semi', 'descremada', 'almendra', 'soya', 'coco', 'avena', 'arroz', 'crecimiento', 'jabon', 'crema', 'galleta']],
  ['tomate', ['tomate'], ['salsa', 'pasta', 'pure', 'ketchup', 'sopa', 'jugo', 'deshidratado', 'seco', 'sazon', 'consome', 'cubito', 'arroz', 'atun', 'sardina', 'lata', 'enlatado', 'pizza', 'frijol', 'chile', 'caldo', 'semilla', 'cherry', 'tomatillo', 'miltomate', 'verde']],
  ['miltomate', ['miltomate'], ['salsa']],
  ['cebolla', ['cebolla'], ['polvo', 'sopa', 'aros', 'frita', 'sazon', 'deshidratada', 'encurtida', 'chips', 'snack', 'salsa', 'consome', 'crema', 'papa']],
  ['ajo', ['ajo'], ['polvo', 'sal', 'salsa', 'pasta', 'pan', 'sazon', 'mayonesa', 'aceite', 'consome', 'cubito', 'deshidratado', 'molido', 'tostado', 'aderezo', 'mantequilla', 'chips', 'pure', 'papa', 'crema', 'pollo', 'hongo', 'aceituna', 'queso']],
  ['chile-pimiento', ['pimiento'], ['polvo', 'salsa', 'lata', 'molido', 'rojo', 'amarillo', 'encurtido', 'aceituna', 'pimienta', 'asado', 'piquillo']],
  ['jalapeno', ['jalapeno'], ['salsa', 'lata', 'encurtido', 'rajas', 'chips', 'queso', 'snack', 'escabeche', 'nachos', 'en-vinagre', 'aderezo', 'relleno', 'papalinas', 'tortrix', 'doritos']],
  ['papa', ['papa'], ['chips', 'frita', 'pure', 'snack', 'papalina', 'pringles', 'tortrix', 'lays', 'congelad', 'perro', 'papaya', 'papaga', 'papas-a', 'gajos', 'hash', 'deshidratada', 'sopa', 'papel', 'harina']],
  ['guisquil', ['guisquil'], ['sopa', 'perulero']],
  ['guicoy', ['guicoy'], ['sazon', 'semilla']],
  ['ejotes', ['ejote'], ['lata', 'congelad', 'mixto', 'mezcla']],
  ['zanahoria', ['zanahoria'], ['jugo', 'baby', 'pastel', 'congelad', 'mixto', 'mezcla', 'rallada', 'jabon', 'crema', 'papilla', 'compota', 'nestle', 'gerber', 'pure']],
  ['repollo', ['repollo'], ['morado', 'ensalada', 'mezcla', 'curtido']],
  ['remolacha', ['remolacha'], ['jugo', 'lata', 'polvo']],
  ['elote', ['elote'], ['crema', 'sopa', 'lata', 'enlatado', 'tamal', 'atol', 'sazon', 'snack', 'tortrix', 'pan', 'congelad', 'dulce', 'helado', 'grano', 'chips', 'galleta']],
  ['aguacate', ['aguacate'], ['salsa', 'guacamol', 'aceite', 'crema', 'shampoo', 'jabon', 'mascarilla', 'acondicionador', 'hass-congelad', 'pulpa']],
  ['platano', ['platano'], ['chips', 'frito', 'tostones', 'snack', 'papalina', 'harina', 'mole', 'deshidratado', 'congelad', 'verde', 'tajadas', 'chicharron', 'enmielado', 'tortrix', 'ricos', 'baby', 'papilla', 'compota']],
  ['lechuga', ['lechuga'], ['ensalada', 'mezcla', 'mix', 'semilla']],
  ['cilantro', ['cilantro'], ['seco', 'deshidratado', 'polvo', 'salsa', 'sazon', 'semilla', 'molido']],
  ['hierbabuena', ['hierbabuena'], ['te', 'infusion', 'seco', 'caramelo', 'chicle', 'pasta', 'dental', 'menta', 'aceite', 'jabon', 'shampoo']],
  ['cebollin', ['cebollin'], ['seco', 'deshidratado']],
  ['chipilin', ['chipilin'], ['tamal', 'tamalito', 'congelad']],
  ['hierba-mora', ['hierba-mora'], []],
  ['limon', ['limon'], ['jugo', 'te', 'bebida', 'refresco', 'galleta', 'jabon', 'lavaplatos', 'limonada', 'sal', 'pimienta', 'aceite', 'desinfectante', 'detergente', 'cloro', 'ambiental', 'suavizante', 'helado', 'caramelo', 'agua', 'gaseosa', 'soda', 'pastel', 'pie', 'yogur', 'shampoo', 'lavatrastos', 'salsa', 'aderezo', 'chile', 'mayonesa', 'pollo', 'atun', 'papa', 'chips', 'cerveza', 'vodka', 'energizante', 'tostada', 'nachos', 'cacahuate', 'mani', 'pasta', 'mermelada', 'gelatina', 'desengrasante', 'polvo', 'concentrado', 'esencia', 'sazon', 'sopa', 'cubito', 'consome']],
  ['banano', ['banano'], ['chips', 'deshidratado', 'pan', 'pastel', 'bebida', 'licuado', 'yogur', 'papilla', 'compota', 'cereal', 'galleta', 'gerber', 'helado', 'snack', 'leche']],
  ['papaya', ['papaya'], ['jugo', 'bebida', 'deshidratada', 'mermelada', 'crema', 'jabon', 'gel', 'cosmetic', 'locion', 'yogur', 'helado', 'nectar']],
  ['pina', ['pina'], ['jugo', 'lata', 'almibar', 'bebida', 'refresco', 'mermelada', 'deshidratada', 'gelatina', 'nectar', 'yogur', 'helado', 'colada', 'galleta', 'pan', 'pastel', 'rodajas', 'trozos', 'concentrado', 'enlatada', 'soda', 'gaseosa', 'te']],
  ['mango', ['mango'], ['jugo', 'bebida', 'deshidratado', 'nectar', 'mermelada', 'yogur', 'helado', 'refresco', 'gelatina', 'chile', 'salsa', 'te', 'gomita', 'dulce', 'pulpa', 'congelad', 'concentrado', 'licuado', 'shampoo', 'jabon', 'crema', 'gel', 'soda', 'agua', 'pan', 'pastel', 'galleta']],
  ['tortilla', ['tortilla', 'maiz'], ['chips', 'tostada', 'harina', 'trigo', 'nachos', 'tortrix', 'doritos', 'snack', 'sopa', 'totopos']],
  ['tostada', ['tostada'], ['pan', 'francesa', 'sandwich', 'cafe', 'harina', 'trigo', 'galleta', 'integral', 'nachos', 'bimbo', 'chips', 'cacahuate']],
  ['pan-frances', ['pan', 'frances'], ['tostado', 'molido', 'harina']],
  ['pan-molido', ['pan', 'molido'], []],
  ['aceite', ['aceite', 'vegetal'], ['spray', 'aerosol', 'motor', 'bebe', 'masaje', 'corporal', 'cabello', 'mascota', 'lubricante', 'automotriz']],
  ['sal', ['sal'], ['ajo', 'cebolla', 'apio', 'galleta', 'snack', 'salsa', 'salchicha', 'salami', 'salmon', 'salud', 'salvado', 'sandia', 'salado', 'salada', 'pimienta', 'limon', 'chile', 'gruesa', 'marina', 'himalaya', 'rosada', 'parrilla', 'carne', 'pollo', 'mariscos', 'baja', 'light', 'sazon', 'condimento', 'epsom', 'banos', 'uvas', 'frutas', 'salsera', 'salero', 'salchichon', 'salvavida', 'saludable', 'salvia', 'salpicon', 'sales', 'salida', 'salon', 'saltin', 'salteado', 'salomon', 'salam', 'salt', 'cebollin', 'consome', 'sopa', 'papa', 'cacahuate', 'mani', 'sazonador', 'lavanda', 'peces', 'animal', 'ganado', 'industrial', 'piscina', 'descongelar', 'hielo', 'salsas', 'salmuera']],
  ['consome', ['consome', 'pollo'], ['cubito', 'cubo', 'tomate', 'res', 'camaron', 'costilla', 'bajo', 'sin', 'light']],
  ['achiote', ['achiote'], ['polvo', 'liquido', 'aceite', 'semilla']],
  ['salsa-soya', ['soya'], ['leche', 'bebida', 'proteina', 'aceite', 'carne', 'texturizada', 'frijol', 'grano', 'harina', 'lecitina', 'yogur', 'tofu', 'galleta', 'snack', 'cereal', 'polvo', 'nuggets']],
  ['hierbas-olor', ['laurel'], ['aceite', 'jabon', 'shampoo', 'te', 'infusion', 'vela', 'ambiental']],
  ['canela', ['canela', 'raja'], []],
  ['vinagre', ['vinagre'], ['manzana', 'balsamico', 'vino', 'arroz', 'limpia', 'limpiador', 'desinfect', 'aderezo', 'jalapeno', 'chile', 'cebolla', 'encurtido', 'papalina', 'chips', 'papas', 'sal-y']],
];

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slugOf = (u) => norm(decodeURIComponent(new URL(u).pathname.replace(/\/p$/, '')));

export function candidates(urls) {
  const out = {};
  for (const [ing, must, not] of RULES) {
    const list = urls.filter((u) => {
      const s = slugOf(u);
      const words = s.split(/[^a-z0-9]+/);
      return must.every((m) => (m.includes('-') ? s.includes(m) : words.some((w) => w === m || w === `${m}s` || w === `${m}es` || w.startsWith(m)))) &&
        !not.some((n) => s.includes(n));
    });
    out[ing] = [...new Set(list)].sort((a, b) => slugOf(a).length - slugOf(b).length);
  }
  return out;
}

if (process.argv[1].endsWith('product-candidates.mjs')) {
  const [paizFile, latorreFile] = process.argv.slice(2);
  const read = (f) => readFileSync(f, 'utf8').split('\n').filter(Boolean);
  console.log(JSON.stringify({ paiz: candidates(read(paizFile)), 'la-torre': candidates(read(latorreFile)) }, null, 1));
}
