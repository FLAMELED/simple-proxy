// Dinero en centavos enteros. Ninguna suma monetaria usa decimales binarios.

/** Convierte un texto o número en quetzales a centavos enteros, o null si no es válido. */
export function parseQuetzales(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().replace(/^Q\s*/i, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, frac = ''] = text.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

/** Formatea centavos como "Q1,234.50". */
export function formatQ(cents) {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return '—';
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}Q${grouped}.${frac}`;
}

/**
 * Costo proporcional de usar `used` unidades base de un empaque de `pack`
 * unidades base que cuesta `priceCents`. Redondeo al centavo más cercano
 * (mitades hacia arriba) en una sola operación por línea.
 */
export function proportionalCents(priceCents, used, pack) {
  if (!(pack > 0)) throw new Error('El empaque debe tener cantidad positiva');
  return Math.round((priceCents * used) / pack);
}

export function sumCents(values) {
  let total = 0;
  for (const v of values) {
    if (!Number.isInteger(v)) throw new Error(`Monto no entero en centavos: ${v}`);
    total += v;
  }
  return total;
}
