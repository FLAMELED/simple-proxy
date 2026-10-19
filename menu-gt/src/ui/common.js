// Utilidades de presentación compartidas por las vistas.
import { formatQ } from '../engine/money.js';
import { toBase, UNITS, describeQty, ConversionError } from '../engine/units.js';
import { STORE_BY_ID } from '../data/stores.js';
import { MEALS, EQUIPMENT } from '../data/recipes.js';

export const q = formatQ;

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const mealLabel = (id) => MEALS.find((m) => m.id === id)?.label ?? id;
export const equipmentLabel = (id) => EQUIPMENT.find((e) => e.id === id)?.label ?? id;

export function storeLabel(id, state) {
  const s = STORE_BY_ID[id];
  if (!s) return id;
  const branch = state?.stores?.branches?.[id];
  return branch ? `${s.name} · ${branch}` : s.name;
}

export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function dayLabel(day, long = false) {
  if (!day) return '';
  return long ? `${cap(day.weekday)} ${day.dayOfMonth} ${day.month}` : `${cap(day.weekday.slice(0, 3))} ${day.dayOfMonth}`;
}

const dtf = (iso, withTime = true) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'fecha desconocida';
  const date = d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
  return withTime ? `${date}, ${d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}` : date;
};
export const formatDate = dtf;

/** Etiqueta del origen de un precio: ejemplo, consultado ahora, guardado o ingresado. */
export function priceStatus(offer, sessionStart) {
  if (offer.status === 'ejemplo') return { tone: 'sample', label: 'Ejemplo ficticio', detail: 'Precio inventado para probar la app.' };
  if (offer.channel === 'usuario' || offer.status === 'usuario') {
    return { tone: 'user', label: 'Ingresado por ti', detail: `Registrado el ${dtf(offer.fetchedAt)}${offer.place ? ` · ${offer.place}` : ''}` };
  }
  const fresh = new Date(offer.fetchedAt).getTime() >= sessionStart;
  return fresh
    ? { tone: 'live', label: 'Consultado ahora', detail: `Consultado el ${dtf(offer.fetchedAt)} en la tienda en línea` }
    : { tone: 'saved', label: 'Último precio guardado', detail: `Consultado el ${dtf(offer.fetchedAt)}; puede haber cambiado` };
}

/** Precio por unidad de referencia (Q/lb, Q/litro, Q/unidad, Q/manojo). */
export function unitPrice(offer, ing) {
  try {
    const base = toBase(offer.packQty, offer.packUnit, ing).qty;
    const per = (refBase, label) => `${q(Math.round((offer.priceCents * refBase) / base))}/${label}`;
    switch (ing.base) {
      case 'g': return per(UNITS.lb.factor, 'lb');
      case 'ml': return per(1000, 'litro');
      case 'u': return per(1, ing.unitName ?? 'unidad');
      case 'manojo': return per(1, 'manojo');
    }
  } catch (err) {
    if (!(err instanceof ConversionError)) throw err;
  }
  return '';
}

export function packText(offer) {
  const u = UNITS[offer.packUnit];
  const label = u ? (offer.packQty === 1 ? u.label : u.plural) : offer.packUnit;
  return `${Number(offer.packQty).toLocaleString('es-GT')} ${label}`;
}

export { describeQty };

const PATHS = {
  semana: '<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="16" r="3"/>',
  menu: '<path d="M4 13a8 8 0 0 0 16 0Z"/><path d="M2 13h20M9 6c0-1 1-1.5 1-2.5M13 7c0-1 1-1.5 1-2.5"/>',
  compras: '<path d="M5 8h14l-1.4 10.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  despensa: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 10h14M5 16h14M10 6.5h4"/>',
  precios: '<path d="M3 12V4h8l10 10-8 8Z"/><circle cx="7.5" cy="8" r="1.5"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  personas: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3 3 0 0 1 0 6M21 20c0-2.6-1.6-4.8-4-5.6"/>',
  cambiar: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  enlace: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
  basura: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  alerta: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  estrella: '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9Z"/>',
  whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8 19Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2Z"/>',
  pollo: '<path d="M15 3a6 6 0 0 1 3 11l-4 1-4 4a2 2 0 1 1-3-3l4-4 1-4a6 6 0 0 1 3-5Z"/>',
  res: '<path d="M4 9c0-3 3-5 8-5s9 3 8 7-4 9-10 9-6-4-6-11Z"/><circle cx="14" cy="11" r="2"/>',
  cerdo: '<rect x="3" y="9" width="18" height="6" rx="3"/><path d="M7 9v6M12 9v6M17 9v6"/>',
  huevo: '<path d="M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11Z"/>',
  pescado: '<path d="M3 12c3-5 9-6 13-3l5-3v12l-5-3c-4 3-10 2-13-3Z"/><circle cx="8" cy="11" r="1"/>',
  queso: '<path d="M3 17V9l13-5 5 5v8Z"/><path d="M3 9h18M8 13h.01M14 14h.01"/>',
  hoja: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15Z"/><path d="M5 19 13 11"/>',
};

export function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${PATHS[name] ?? PATHS.info}</svg>`;
}

export const proteinIcon = (p) => ({ pollo: 'pollo', res: 'res', cerdo: 'cerdo', huevo: 'huevo', pescado: 'pescado', queso: 'queso' })[p] ?? 'hoja';
export const proteinLabel = (p) => ({ pollo: 'Pollo', res: 'Res', cerdo: 'Cerdo', huevo: 'Huevo', pescado: 'Pescado', queso: 'Queso' })[p] ?? 'Sin carne';

export const STATUS_TEXT = {
  cotizado: 'Cotizado',
  'en-casa': 'Ya lo tienes',
  'sin-precio': 'Falta cotizar',
  agotado: 'Agotado',
  'marca-no-disponible': 'Marca no disponible',
  'sin-conversion': 'Sin equivalencia',
};
