// Puente con la app Android (MainActivity expone window.Android).
// En un navegador común usa descargas e impresión del navegador.

const callbacks = new Map();
let seq = 0;
window.__nativeDone = (id, ok, message) => {
  const cb = callbacks.get(id);
  if (!cb) return;
  callbacks.delete(id);
  ok ? cb.resolve(message) : cb.reject(new Error(message || 'No se pudo completar.'));
};

export const isAndroid = () => typeof window.Android !== 'undefined';

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/**
 * Guarda un archivo donde la persona elija.
 * Resuelve con 'saved' o 'cancelled'.
 */
export async function saveFile(name, mime, bytes) {
  if (isAndroid()) {
    const id = 'f' + (++seq);
    const CHUNK = 768 * 1024; // múltiplo de 3 para que cada trozo sea base64 válido
    window.Android.beginFile(id);
    for (let i = 0; i < bytes.length; i += CHUNK) window.Android.appendFile(id, toBase64(bytes.subarray(i, i + CHUNK)));
    return new Promise((resolve, reject) => {
      callbacks.set(id, { resolve, reject });
      window.Android.finishFile(id, name, mime);
    });
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'saved';
}

/** Abre el diálogo de impresión. En Android permite «Guardar como PDF». */
export function printPage(title) {
  if (isAndroid()) window.Android.print(title || document.title);
  else window.print();
}
