// Unidades y conversiones. Cada ingrediente tiene una unidad base:
// g (masa), ml (volumen), u (piezas) o manojo (sin conversión posible).
// Las conversiones entre dimensiones solo existen si el ingrediente
// declara un dato específico (gramos por taza, peso aproximado por pieza).

export const UNITS = {
  g: { dim: 'mass', factor: 1, label: 'g', plural: 'g' },
  kg: { dim: 'mass', factor: 1000, label: 'kg', plural: 'kg' },
  lb: { dim: 'mass', factor: 453.59237, label: 'lb', plural: 'lb' },
  oz: { dim: 'mass', factor: 28.349523125, label: 'oz', plural: 'oz' },
  ml: { dim: 'volume', factor: 1, label: 'ml', plural: 'ml' },
  l: { dim: 'volume', factor: 1000, label: 'litro', plural: 'litros' },
  // Taza de cocina de 240 ml; para sólidos se usa el peso por taza del ingrediente.
  taza: { dim: 'volume', factor: 240, label: 'taza', plural: 'tazas' },
  cda: { dim: 'volume', factor: 15, label: 'cucharada', plural: 'cucharadas' },
  cdta: { dim: 'volume', factor: 5, label: 'cucharadita', plural: 'cucharaditas' },
  u: { dim: 'count', factor: 1, label: 'unidad', plural: 'unidades' },
  docena: { dim: 'count', factor: 12, label: 'docena', plural: 'docenas' },
  manojo: { dim: 'bunch', factor: 1, label: 'manojo', plural: 'manojos' },
};

const DIM_OF_BASE = { g: 'mass', ml: 'volume', u: 'count', manojo: 'bunch' };

export class ConversionError extends Error {}

const EPS = 1e-9;
/** Redondeo a 1e-6 para que 0.1 + 0.2 no deje residuos que generen un empaque extra. */
export const clean = (x) => Math.round(x * 1e6) / 1e6;

function unitInfo(unit, ing) {
  if (UNITS[unit]) return UNITS[unit];
  const custom = ing?.units?.[unit];
  if (custom) return { custom, label: custom.label ?? unit, plural: custom.plural ?? unit };
  throw new ConversionError(`Unidad desconocida "${unit}" para ${ing?.name ?? 'ingrediente'}`);
}

/**
 * Convierte una cantidad a la unidad base del ingrediente.
 * Devuelve { qty, approx, notes[] }. Lanza ConversionError si no hay
 * una conversión justificada.
 */
export function toBase(qty, unit, ing) {
  const info = unitInfo(unit, ing);
  if (info.custom) {
    // Unidad propia del ingrediente, p. ej. "diente" de ajo = 3 g aprox.
    const inner = toBase(qty * info.custom.qty, info.custom.unit, ing);
    return {
      qty: clean(inner.qty),
      approx: inner.approx || !!info.custom.approx,
      notes: [...inner.notes, info.custom.note].filter(Boolean),
    };
  }
  const baseDim = DIM_OF_BASE[ing.base];
  const value = qty * info.factor; // en g, ml, u o manojo
  if (info.dim === baseDim) {
    return { qty: clean(value / UNITS[ing.base].factor), approx: false, notes: [] };
  }
  if (info.dim === 'volume' && baseDim === 'mass' && ing.gPerCup) {
    return {
      qty: clean((value * ing.gPerCup) / 240),
      approx: true,
      notes: [`1 taza de ${ing.name} ≈ ${ing.gPerCup} g (${ing.gPerCupSource ?? 'aprox.'})`],
    };
  }
  if (info.dim === 'count' && baseDim === 'mass' && ing.unitG) {
    return {
      qty: clean(value * ing.unitG),
      approx: true,
      notes: [`1 ${ing.unitName ?? 'unidad'} de ${ing.name} ≈ ${ing.unitG} g (${ing.unitGSource ?? 'aprox.'})`],
    };
  }
  if (info.dim === 'mass' && baseDim === 'count' && ing.unitG) {
    return {
      qty: clean(value / ing.unitG),
      approx: true,
      notes: [`1 ${ing.unitName ?? 'unidad'} de ${ing.name} ≈ ${ing.unitG} g (${ing.unitGSource ?? 'aprox.'})`],
    };
  }
  throw new ConversionError(
    `No hay una conversión justificada de ${info.plural} a ${UNITS[ing.base].plural} para ${ing.name}`,
  );
}

export function canConvert(unit, ing) {
  try {
    toBase(1, unit, ing);
    return true;
  } catch {
    return false;
  }
}

/** Número de empaques necesarios para cubrir `need` unidades base. */
export function packsFor(need, packQty) {
  if (need <= EPS) return 0;
  return Math.ceil(clean(need / packQty) - EPS);
}

const fmtNum = (n, max = 2) =>
  Number(n.toFixed(max)).toLocaleString('es-GT', { maximumFractionDigits: max });

/**
 * Texto amigable para una cantidad en unidad base, con medidas usadas
 * en Guatemala: libras y onzas para peso, litros/ml, unidades/docenas.
 */
export function describeQty(qtyBase, ing) {
  const q = clean(qtyBase);
  switch (ing.base) {
    case 'g': {
      if (ing.unitG && ing.preferCount) {
        const pieces = q / ing.unitG;
        return `≈ ${fmtNum(pieces, 1)} ${pieces === 1 ? ing.unitName ?? 'unidad' : ing.unitNamePlural ?? 'unidades'} (${fmtNum(q, 0)} g)`;
      }
      const lb = q / UNITS.lb.factor;
      if (lb >= 0.5) return `${fmtNum(lb, 2)} lb (${fmtNum(q, 0)} g)`;
      const oz = q / UNITS.oz.factor;
      return `${fmtNum(oz, 1)} oz (${fmtNum(q, 0)} g)`;
    }
    case 'ml':
      return q >= 1000 ? `${fmtNum(q / 1000, 2)} litros` : `${fmtNum(q, 0)} ml`;
    case 'u': {
      const label = q === 1 ? ing.unitName ?? 'unidad' : ing.unitNamePlural ?? 'unidades';
      if (ing.sellsByDozen && q >= 12) {
        const doz = Math.floor(q / 12);
        const rest = clean(q - doz * 12);
        return `${fmtNum(q, 1)} ${label} (${doz} docena${doz > 1 ? 's' : ''}${rest ? ` + ${fmtNum(rest, 1)}` : ''})`;
      }
      return `${fmtNum(q, 1)} ${label}`;
    }
    case 'manojo':
      return `${fmtNum(q, 2)} ${q === 1 ? 'manojo' : 'manojos'}`;
    default:
      return `${fmtNum(q)} ${ing.base}`;
  }
}

/** Describe una cantidad de receta en su unidad original ("2 tazas"). */
export function describeRecipeQty(qty, unit, ing) {
  const info = unitInfo(unit, ing);
  const n = fmtNum(qty, 2);
  if (unit === 'u') return `${n} ${qty === 1 ? ing.unitName ?? 'unidad' : ing.unitNamePlural ?? 'unidades'}`;
  return `${n} ${qty === 1 ? info.label : info.plural}`;
}

export const UNIT_OPTIONS = Object.entries(UNITS).map(([id, u]) => ({ id, label: u.plural }));

/** Unidades con las que se puede expresar este ingrediente. */
export function unitsFor(ing) {
  const list = Object.keys(UNITS).filter((u) => canConvert(u, ing));
  for (const u of Object.keys(ing.units ?? {})) list.push(u);
  return list;
}

export function unitLabel(unit, ing, qty = 2) {
  const info = unitInfo(unit, ing);
  if (unit === 'u' && ing) return qty === 1 ? ing.unitName ?? 'unidad' : ing.unitNamePlural ?? 'unidades';
  return qty === 1 ? info.label : info.plural;
}
