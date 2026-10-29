// Estado de la app, valores iniciales, persistencia local e import/export.
// La persistencia es solo de este navegador: no hay cuentas ni sincronización.

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'menu-gt:v1';
export const ALL_EQUIPMENT = ['estufa', 'olla', 'sarten', 'comal', 'licuadora', 'horno', 'vaporera'];

export function todayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function defaultState(today = todayISO()) {
  return {
    schema: SCHEMA_VERSION,
    onboarded: false,
    guideDone: false,
    demo: false,
    location: { departamento: 'Chiquimula', municipio: 'Chiquimula' },
    stores: {
      selected: ['paiz', 'walmart', 'la-torre'],
      primary: 'paiz',
      branches: {},
    },
    household: {
      people: 4,
      meals: ['almuerzo', 'cena'],
      startDate: today,
      numDays: 7,
      skipDays: [],
      budgetCents: 90000,
    },
    prefs: {
      allergies: [],
      excludedIngredients: [],
      excludedProteins: [],
      vegetarian: false,
      maxMinutes: { desayuno: 30, almuerzo: 120, cena: 60 },
      equipment: ['estufa', 'olla', 'sarten', 'comal', 'licuadora'],
      favorites: [],
      budgetPriority: false,
    },
    pantry: [],
    brandLocks: {},
    acceptedPromos: {},
    useMyPrices: 'faltantes',
    myPrices: [],
    fetchedPrices: [],
    extras: [],
    transport: {},
    plan: { seed: 1, slots: [] },
    checked: {},
    view: 'semana',
    shopMode: 'single',
  };
}

/** Lista de días del período, con fecha y si cae en fin de semana. */
export function planDays(household) {
  const [y, m, d] = household.startDate.split('-').map(Number);
  const out = [];
  for (let k = 0; k < household.numDays; k++) {
    const date = new Date(Date.UTC(y, m - 1, d + k));
    const dow = date.getUTCDay();
    out.push({
      index: k,
      iso: date.toISOString().slice(0, 10),
      weekday: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][dow],
      dayOfMonth: date.getUTCDate(),
      month: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][date.getUTCMonth()],
      weekend: dow === 0 || dow === 6,
      skipped: household.skipDays.includes(k),
    });
  }
  return out;
}

function isObj(x) {
  return x && typeof x === 'object' && !Array.isArray(x);
}

/** Mezcla profunda de un objeto guardado sobre los valores por defecto. */
function mergeDefaults(def, saved) {
  if (!isObj(saved)) return def;
  const out = { ...def };
  for (const [k, v] of Object.entries(saved)) {
    if (isObj(def[k]) && isObj(v) && !['branches', 'brandLocks', 'acceptedPromos', 'transport', 'checked', 'maxMinutes'].includes(k)) {
      out[k] = mergeDefaults(def[k], v);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

export function normalizeState(saved) {
  const def = defaultState();
  if (!isObj(saved)) throw new Error('El archivo no contiene un plan válido.');
  if (saved.schema && saved.schema > SCHEMA_VERSION) {
    throw new Error('El archivo es de una versión más nueva de la app.');
  }
  const s = mergeDefaults(def, saved);
  s.schema = SCHEMA_VERSION;
  if (!Array.isArray(s.pantry) || !Array.isArray(s.myPrices) || !Array.isArray(s.plan.slots)) {
    throw new Error('El archivo tiene listas dañadas (despensa, precios o menú).');
  }
  if (!Number.isInteger(s.household.people) || s.household.people < 1) throw new Error('Número de personas inválido.');
  return s;
}

export function loadState(storage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return { state: null, persisted: !!storage };
    return { state: normalizeState(JSON.parse(raw)), persisted: true };
  } catch {
    return { state: null, persisted: false };
  }
}

export function saveState(storage, state) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportState(state, now = new Date()) {
  return JSON.stringify({ app: 'menu-gt', schema: SCHEMA_VERSION, exportedAt: now.toISOString(), data: state }, null, 2);
}

export function importState(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El texto no es JSON válido.');
  }
  if (parsed?.app !== 'menu-gt' || !parsed.data) throw new Error('El archivo no fue exportado desde esta app.');
  return normalizeState(parsed.data);
}
