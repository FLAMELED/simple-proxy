// Utilidades de interfaz: HTML seguro, avisos, diálogos y rutas.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Plantilla HTML que escapa los valores. Para insertar HTML ya seguro usa raw(). */
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += render(values[i]);
  });
  return new Raw(out);
}
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(String(s));
function render(v) {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  if (v === false || v === null || v === undefined) return '';
  return esc(v);
}

// ——— Avisos ———
let toastTimer;
/** kind: 'ok' | 'error' | 'info'. El texto siempre explica el estado; el color solo acompaña. */
export function toast(message, kind = 'ok') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  const label = { ok: 'Listo', error: 'Atención', info: 'Aviso' }[kind] || 'Aviso';
  el.className = `toast toast-${kind} is-on`;
  el.innerHTML = `<strong>${label}.</strong> ${esc(message)}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), kind === 'error' ? 7000 : 3500);
}

// ——— Diálogos ———
/**
 * Muestra un diálogo con opciones. Devuelve el valor de la opción elegida o null.
 * options: [{label, value, kind:'primary'|'danger'|'plain'}]
 */
export function ask({ title, body = '', options }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'dlg';
    d.innerHTML = `<h2 class="dlg-title">${esc(title)}</h2><div class="dlg-body">${body}</div>
      <div class="dlg-actions">${options.map((o, i) => `<button type="button" class="btn btn-${o.kind || 'plain'}" data-i="${i}">${esc(o.label)}</button>`).join('')}</div>`;
    document.body.appendChild(d);
    const close = (v) => { d.close(); d.remove(); resolve(v); };
    d.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-i]');
      if (b) close(options[Number(b.dataset.i)].value);
    });
    d.addEventListener('cancel', (ev) => { ev.preventDefault(); close(null); });
    d.showModal();
    const first = d.querySelector('.btn-primary') || d.querySelector('button');
    first && first.focus();
  });
}
export const confirmAction = (title, body, yes = 'Sí, continuar', danger = false) =>
  ask({ title, body, options: [{ label: 'Cancelar', value: false }, { label: yes, value: true, kind: danger ? 'danger' : 'primary' }] }).then(Boolean);

// ——— Rutas por hash: #/proyecto/abc ———
export function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = h.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || 'inicio', args: parts.slice(1), query: new URLSearchParams(query) };
}
export const go = (hash) => { if (location.hash !== hash) location.hash = hash; else window.dispatchEvent(new HashChangeEvent('hashchange')); };

// ——— Fechas ———
export function fmtDate(iso, withTime = true) {
  if (!iso) return '';
  const d = new Date(iso);
  const opts = withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat('es', opts).format(d);
}
export const today = () => new Date().toISOString().slice(0, 10);
export const nowIso = () => new Date().toISOString();

/** Nombre de archivo seguro: "Mi fichero - copia 2026-11-04 1642.zip" */
export function stampedName(prefix, ext) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${prefix} ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
}
