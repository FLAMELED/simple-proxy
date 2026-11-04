// Números escritos por personas: aceptan coma o punto decimal.
// Un campo vacío es null (sin dato). Cero es 0. Nunca se confunden.

export const UNITS = {
  mm: 'mm', cm: 'cm', m: 'm', in: 'pulg', u: 'unid.',
};
export const UNIT_NAMES = {
  mm: 'milímetros', cm: 'centímetros', m: 'metros', in: 'pulgadas', u: 'unidades',
};

/**
 * Convierte el texto de un campo en número.
 * @returns {{ok:true,value:number|null}|{ok:false,error:string}}
 */
export function parseAmount(text, { unit = 'cm', allowNegative = false, integer = false } = {}) {
  const s = String(text ?? '').trim().replace(/\s+/g, '');
  if (s === '') return { ok: true, value: null };
  if (!/^-?\d*([.,]\d*)?$/.test(s) || s === '-' || s === '.' || s === ',') {
    return { ok: false, error: 'Escribe solo números, con coma o punto para decimales.' };
  }
  // "1.250" o "1,250" en mm/cm/pulg puede ser mil doscientos cincuenta o uno coma veinticinco.
  if (/^-?\d{1,3}[.,]\d{3}$/.test(s) && ['mm', 'cm', 'in'].includes(unit)) {
    const [a, b] = s.split(/[.,]/);
    return { ok: false, error: `¿Quisiste decir ${a}${b} o ${a}.${b.replace(/0+$/, '') || '0'}? Escríbelo sin separador de miles.` };
  }
  const value = Number(s.replace(',', '.'));
  if (!Number.isFinite(value)) return { ok: false, error: 'El número no es válido.' };
  if (!allowNegative && value < 0) return { ok: false, error: 'La medida no puede ser negativa.' };
  if (integer && !Number.isInteger(value)) return { ok: false, error: 'Escribe un número entero.' };
  return { ok: true, value };
}

export function formatNumber(value, decimalSep = '.') {
  if (value === null || value === undefined) return '';
  const rounded = Math.round(value * 1000) / 1000;
  let s = String(rounded);
  if (decimalSep === ',') s = s.replace('.', ',');
  return s;
}

/** Texto para mostrar una medida: "182 cm", "0 cm" o "Sin dato". */
export function formatAmount(value, unit, decimalSep = '.') {
  if (value === null || value === undefined) return 'Sin dato';
  return `${formatNumber(value, decimalSep)} ${UNITS[unit] || unit}`;
}

export function defaultDecimalSep(locale = (globalThis.navigator && navigator.language) || 'es') {
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(1.5);
    const d = parts.find((p) => p.type === 'decimal');
    return d && d.value === ',' ? ',' : '.';
  } catch { return '.'; }
}
