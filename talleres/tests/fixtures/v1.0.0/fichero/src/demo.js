// Ejemplo ficticio «Entre Hilos» (taller de cortinas).
// Todos los datos son inventados para el taller y quedan marcados como EJEMPLO.
// La foto de referencia es un dibujo generado aquí mismo, no una foto real.
import { BUILTIN_TEMPLATES } from './templates.js';
import { clone, dataFromTemplate } from './model.js';
import * as store from './store.js';

export const DEMO_BUSINESS = 'Entre Hilos';

/** Dibuja una muestra de tela de ejemplo (no es una foto real). */
export async function drawReference() {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 900;
  const g = c.getContext('2d');
  g.fillStyle = '#e9e0cc'; g.fillRect(0, 0, 1200, 900);
  for (let y = 0; y < 900; y += 6) { g.fillStyle = y % 12 ? 'rgba(120,100,70,.10)' : 'rgba(255,255,255,.18)'; g.fillRect(0, y, 1200, 3); }
  for (let x = 0; x < 1200; x += 7) { g.fillStyle = 'rgba(110,90,60,.08)'; g.fillRect(x, 0, 3, 900); }
  // Ondas de la cortina
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 120;
    const grd = g.createLinearGradient(x, 0, x + 120, 0);
    grd.addColorStop(0, 'rgba(60,45,20,.20)'); grd.addColorStop(.5, 'rgba(255,255,255,.22)'); grd.addColorStop(1, 'rgba(60,45,20,.20)');
    g.fillStyle = grd; g.fillRect(x, 80, 120, 700);
  }
  g.fillStyle = '#2b2b2b'; g.fillRect(40, 60, 1120, 14);
  g.fillStyle = 'rgba(20,20,20,.82)'; g.fillRect(0, 780, 1200, 120);
  g.fillStyle = '#fff'; g.font = 'bold 44px sans-serif'; g.fillText('IMAGEN DE EJEMPLO · Lino crudo en ondas', 40, 845);
  g.font = '30px sans-serif'; g.fillText('Dibujo generado para el taller. No contiene medidas.', 40, 885);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
  return { blob, width: 1200, height: 900, mime: 'image/jpeg' };
}

function fill(data, measures, specs) {
  for (const m of data.measures) if (m.label in measures) m.value = measures[m.label];
  for (const s of data.specs) if (s.label in specs) s.value = specs[s.label];
  return data;
}

export async function loadDemo() {
  const tpl = BUILTIN_TEMPLATES.find((t) => t.id === 'tpl-cortinas');
  const client = await store.saveClient({ name: 'Lucía Ramírez', phone: '5555-0101 (ficticio)', notes: 'Clienta de ejemplo del taller.', demo: true });
  const project = await store.saveProject({ clientId: client.id, name: 'Cortinas sala y comedor', place: 'Casa de la clienta', notes: 'Dos ventanas con medidas diferentes.', demo: true });

  // Ventana de la sala: versión 1 con 180 cm y versión 2 corregida a 182 cm.
  const sala = await store.createSheet({ projectId: project.id, title: 'Ventana sala', template: tpl, demo: true });
  const photo = await store.addPhoto(sala.id, await drawReference());
  const d1 = fill(dataFromTemplate(tpl),
    { 'Ancho de ventana': 180, 'Alto de ventana': 150, 'Ancho del riel o barra': 220, 'Alto del riel al piso': 250, 'Del techo al riel': 10, 'Paños': 2 },
    { 'Tipo de cortina': 'Ondas', 'Tela': 'Lino crudo', 'Color': 'Crudo natural', 'Forro': 'Blackout', 'Acabado del dobladillo': 'Dobladillo 10 cm', 'Recogido': 'A ambos lados' });
  d1.photos.push({ id: photo.id, caption: 'Referencia de tela elegida (imagen de ejemplo)' });
  d1.notes = 'El riel nuevo lo instala la clienta antes de la entrega.';
  await store.commitSheet(sala.id, d1, 'Primera medición.');
  const d2 = clone(d1); d2.measures.find((m) => m.label === 'Ancho de ventana').value = 182;
  await store.commitSheet(sala.id, d2, 'Se volvió a medir el ancho en la visita.');

  // Ventana del comedor: «Del techo al riel» queda vacío a propósito (sin dato, no es cero).
  const comedor = await store.createSheet({ projectId: project.id, title: 'Ventana comedor', template: tpl, demo: true });
  const c1 = fill(dataFromTemplate(tpl),
    { 'Ancho de ventana': 120, 'Alto de ventana': 140, 'Ancho del riel o barra': 160, 'Alto del riel al piso': 240, 'Paños': 1 },
    { 'Tipo de cortina': 'Ondas', 'Tela': 'Lino crudo', 'Color': 'Crudo natural', 'Forro': 'Forro común', 'Acabado del dobladillo': 'Dobladillo 10 cm', 'Recogido': 'A la izquierda' });
  c1.notes = 'Falta confirmar la distancia del techo al riel.';
  await store.commitSheet(comedor.id, c1, 'Primera medición.');
  return project;
}
