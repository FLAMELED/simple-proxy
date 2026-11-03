/* ==========================================================================
   Motor común de las presentaciones · Finanzas del negocio con IA
   - Navegación (botones, teclado, deslizar), pasos progresivos, índice
   - Diálogos con foco controlado (i, datos del caso, índice)
   - Tema claro/noche, pantalla completa, vista de todas las pantallas
   - Notas del facilitador en otra ventana (o panel si el navegador la bloquea)
   - Copiar consultas con confirmación y alternativa manual
   ========================================================================== */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const TALLER = document.documentElement.dataset.taller || 'taller';
  const guardar = (k, v) => { try { localStorage.setItem(TALLER + ':' + k, v); } catch (e) { /* sin almacenamiento */ } };
  const leer = (k) => { try { return localStorage.getItem(TALLER + ':' + k); } catch (e) { return null; } };

  const serie = $('.serie');
  if (serie) serie.innerHTML = `<span>${document.documentElement.dataset.serieNum || ''}</span>${document.documentElement.dataset.serieNombre || ''}`;

  const pantallas = $$('.pantalla');
  const total = pantallas.length;
  let actual = 0;
  let paso = 0;

  /* ---------- Avisos breves ---------- */
  const aviso = $('#aviso');
  let avisoT;
  function avisar(texto, ms = 4200) {
    aviso.textContent = texto;
    aviso.hidden = false;
    clearTimeout(avisoT);
    avisoT = setTimeout(() => { aviso.hidden = true; }, ms);
  }
  window.avisar = avisar;

  /* ---------- Preparar pantallas ---------- */
  const secciones = [];
  pantallas.forEach((p, i) => {
    p.id = p.id || 'p' + (i + 1);
    p.setAttribute('role', 'group');
    p.setAttribute('aria-roledescription', 'pantalla');
    p.setAttribute('aria-label', (i + 1) + ' de ' + total + ': ' + (p.dataset.titulo || ''));
    const nombre = p.dataset.seccion || '';
    let s = secciones[secciones.length - 1];
    if (!s || s.nombre !== nombre) {
      s = { nombre, min: 0, pantallas: [] };
      secciones.push(s);
    }
    s.pantallas.push(i);
    s.min += Number(p.dataset.min || 0);
    p.dataset.indiceSeccion = secciones.length - 1;
    p._pasos = Math.max(0, ...$$('[data-paso]', p).map((e) => Number(e.dataset.paso)));

    // Encabezado corrido
    const marco = $('.marco', p);
    if (marco && !p.hasAttribute('data-sin-corrido')) {
      const c = document.createElement('div');
      c.className = 'corrido';
      c.setAttribute('aria-hidden', 'true');
      const caso = p.dataset.caso ? `<span class="caso" data-tipo="${p.dataset.casoTipo || 'ana'}">${p.dataset.caso}</span>` : '<span></span>';
      c.innerHTML = `<span><b>${String.fromCharCode(65 + secciones.length - 1)}</b> · ${nombre}</span>${caso}`;
      marco.prepend(c);
    }
    // Número para la vista de todas las pantallas
    const n = document.createElement('div');
    n.className = 'num-pantalla';
    n.textContent = `${i + 1} / ${total} · ${p.dataset.titulo || ''} · ${p.dataset.min || 0} min`;
    p.prepend(n);
  });
  const minutosTotales = secciones.reduce((a, s) => a + s.min, 0);

  /* ---------- Barra de progreso por sección ---------- */
  const progreso = $('#progreso');
  secciones.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.setProperty('--peso', s.min || 1);
    b.title = `${String.fromCharCode(65 + i)} · ${s.nombre} (${s.min} min)`;
    b.setAttribute('aria-label', `Ir a la sección ${s.nombre}, ${s.min} minutos`);
    b.innerHTML = '<i></i>';
    b.addEventListener('click', () => ir(s.pantallas[0], 0));
    progreso.appendChild(b);
  });

  /* ---------- Mostrar pantalla y paso ---------- */
  function aplicarPaso(p, n) {
    $$('[data-paso]', p).forEach((e) => e.classList.toggle('visto', Number(e.dataset.paso) <= n));
    const rev = Number(p.dataset.revela || 0);
    p.classList.toggle('revelada', rev > 0 && n >= rev);
    p.dispatchEvent(new CustomEvent('paso', { detail: { paso: n } }));
  }

  function mostrar() {
    pantallas.forEach((p, i) => {
      const es = i === actual;
      p.classList.toggle('es-actual', es);
      p.setAttribute('aria-hidden', es ? 'false' : 'true');
      if (es) p.removeAttribute('inert'); else p.setAttribute('inert', '');
    });
    const p = pantallas[actual];
    aplicarPaso(p, paso);
    if (p.scrollTop) p.scrollTop = 0;
    const sIdx = Number(p.dataset.indiceSeccion);
    $('#indicador').innerHTML = `${actual + 1} / ${total}` + (p._pasos ? `<small>paso ${paso} de ${p._pasos}</small>` : '<small>&nbsp;</small>');
    $('#seccion-actual').textContent = secciones[sIdx].nombre;
    $$('#progreso button').forEach((b, i) => {
      const s = secciones[i];
      let lleno = 0;
      if (i < sIdx) lleno = 100;
      else if (i === sIdx) lleno = ((s.pantallas.indexOf(actual) + 1) / s.pantallas.length) * 100;
      b.firstChild.style.width = lleno + '%';
      b.setAttribute('aria-current', i === sIdx ? 'step' : 'false');
    });
    $('#btn-ant').disabled = actual === 0 && paso === 0;
    $('#btn-sig').disabled = actual === total - 1 && paso >= p._pasos;
    $('#anuncio').textContent = `Pantalla ${actual + 1} de ${total}: ${p.dataset.titulo || ''}` + (p._pasos ? `, paso ${paso} de ${p._pasos}` : '');
    try { history.replaceState(null, '', '#' + (actual + 1) + (paso ? '.' + paso : '')); } catch (e) { /* file:// en algunos navegadores */ }
    actualizarNotas();
  }

  function ir(i, n) {
    actual = Math.max(0, Math.min(total - 1, i));
    const p = pantallas[actual];
    paso = n === 'todo' ? p._pasos : Math.max(0, Math.min(p._pasos, n || 0));
    mostrar();
  }
  function siguiente() {
    const p = pantallas[actual];
    if (paso < p._pasos) { paso++; mostrar(); } else if (actual < total - 1) ir(actual + 1, 0);
  }
  function anterior() {
    if (paso > 0) { paso--; mostrar(); } else if (actual > 0) ir(actual - 1, 'todo');
  }
  window.presentacion = { ir, siguiente, anterior, get actual() { return actual; }, get paso() { return paso; }, total };

  $('#btn-sig').addEventListener('click', siguiente);
  $('#btn-ant').addEventListener('click', anterior);

  /* ---------- Teclado ---------- */
  const editando = (el) => el && (el.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName));
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (document.querySelector('dialog[open]')) return; // el diálogo maneja su teclado
    if (editando(e.target)) return; // no cambiar de pantalla mientras se escribe
    if (document.body.classList.contains('vista')) {
      if (e.key === 'Escape') salirVista();
      return;
    }
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && e.target.tagName !== 'BUTTON')) { e.preventDefault(); siguiente(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); anterior(); }
    else if (k === 'Home') { e.preventDefault(); ir(0, 0); }
    else if (k === 'End') { e.preventDefault(); ir(total - 1, 'todo'); }
    else if (k === 'f' || k === 'F') pantallaCompleta();
    else if (k === 'n' || k === 'N') abrirNotas();
    else if (k === 'Escape' && !$('#panel-notas').hidden) cerrarPanelNotas();
  });

  /* ---------- Deslizar en pantallas táctiles ---------- */
  let toque = null;
  $('#escenario').addEventListener('touchstart', (e) => {
    if (editando(e.target) || e.target.closest('.sin-deslizar')) { toque = null; return; }
    toque = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  $('#escenario').addEventListener('touchend', (e) => {
    if (!toque) return;
    const dx = e.changedTouches[0].clientX - toque.x;
    const dy = e.changedTouches[0].clientY - toque.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) (dx < 0 ? siguiente : anterior)();
    toque = null;
  });

  /* ---------- Diálogos ---------- */
  let origenFoco = null;
  function abrirDialogo(d) {
    origenFoco = document.activeElement;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    const f = d.querySelector('[autofocus]') || d.querySelector('.cerrar');
    if (f) f.focus();
  }
  function cerrarDialogo(d) {
    if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
  }
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d) cerrarDialogo(d); }); // clic fuera
    d.addEventListener('close', () => { if (origenFoco && document.contains(origenFoco)) origenFoco.focus(); });
    $$('.cerrar', d).forEach((b) => b.addEventListener('click', () => cerrarDialogo(d)));
  });
  window.abrirDialogo = abrirDialogo;
  window.cerrarDialogo = cerrarDialogo;

  // Botones «i»
  const dlgInfo = $('#dlg-info');
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-info]');
    if (!b) return;
    const t = document.getElementById(b.dataset.info);
    if (!t) return;
    const frag = t.content.cloneNode(true);
    const h = frag.querySelector('h3');
    $('#dlg-info-titulo').textContent = h ? h.textContent : 'Más información';
    if (h) h.remove();
    const cuerpo = $('.dlg-cuerpo', dlgInfo);
    cuerpo.replaceChildren(frag);
    abrirDialogo(dlgInfo);
  });

  // Índice
  const listaIndice = $('#indice-lista');
  secciones.forEach((s, si) => {
    const li = document.createElement('li');
    li.innerHTML = `<h3><span>${String.fromCharCode(65 + si)} · ${s.nombre}</span><small>${s.min} min</small></h3><ol></ol>`;
    s.pantallas.forEach((i) => {
      const a = document.createElement('a');
      a.href = '#' + (i + 1);
      a.innerHTML = `<span>${i + 1}</span>${pantallas[i].dataset.titulo || ''}`;
      a.addEventListener('click', (e) => { e.preventDefault(); cerrarDialogo($('#dlg-indice')); ir(i, 0); });
      const it = document.createElement('li');
      it.appendChild(a);
      $('ol', li).appendChild(it);
    });
    listaIndice.appendChild(li);
  });
  $('#total-min').textContent = minutosTotales;
  $('#btn-indice').addEventListener('click', () => {
    $$('#indice-lista a').forEach((a, i) => a.setAttribute('aria-current', i === actual ? 'true' : 'false'));
    abrirDialogo($('#dlg-indice'));
  });
  $('#btn-datos').addEventListener('click', () => abrirDialogo($('#dlg-datos')));

  // Pestañas genéricas
  $$('.pestanas').forEach((grupo) => {
    const botones = $$('button[role="tab"]', grupo);
    const elegir = (b) => {
      botones.forEach((x) => {
        const sel = x === b;
        x.setAttribute('aria-selected', sel);
        x.tabIndex = sel ? 0 : -1;
        const panel = document.getElementById(x.getAttribute('aria-controls'));
        if (panel) panel.hidden = !sel;
      });
    };
    botones.forEach((b, i) => {
      b.addEventListener('click', () => elegir(b));
      b.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const n = botones[(i + (e.key === 'ArrowRight' ? 1 : botones.length - 1)) % botones.length];
        n.focus(); elegir(n);
      });
    });
  });

  /* ---------- Tema ---------- */
  const btnTema = $('#btn-tema');
  function ponerTema(t) {
    document.documentElement.dataset.tema = t;
    btnTema.setAttribute('aria-pressed', t === 'noche');
    btnTema.title = t === 'noche' ? 'Cambiar a modo claro' : 'Cambiar a modo nocturno';
    btnTema.setAttribute('aria-label', btnTema.title);
  }
  const temaGuardado = leer('tema');
  ponerTema(temaGuardado || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'noche' : 'claro'));
  btnTema.addEventListener('click', () => {
    const t = document.documentElement.dataset.tema === 'noche' ? 'claro' : 'noche';
    ponerTema(t); guardar('tema', t);
  });

  /* ---------- Pantalla completa ---------- */
  function pantallaCompleta() {
    const d = document;
    const el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) {
        (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      } else if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => avisar('El navegador no permitió la pantalla completa. Prueba con la tecla F11 o el menú del navegador.'));
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else {
        avisar('Este navegador no permite pantalla completa desde la página. Usa F11 en PC o la opción del navegador. La presentación sigue funcionando igual.');
      }
    } catch (e) {
      avisar('No se pudo activar la pantalla completa. Usa F11 o el menú del navegador.');
    }
  }
  $('#btn-completa').addEventListener('click', pantallaCompleta);
  const marcarCompleta = () => $('#btn-completa').setAttribute('aria-pressed', !!(document.fullscreenElement || document.webkitFullscreenElement));
  document.addEventListener('fullscreenchange', marcarCompleta);
  document.addEventListener('webkitfullscreenchange', marcarCompleta);

  /* ---------- Menú en celular ---------- */
  const btnMas = $('#btn-mas');
  if (btnMas) btnMas.addEventListener('click', () => {
    const c = $('#controles');
    const abierto = c.classList.toggle('abierto');
    btnMas.setAttribute('aria-expanded', abierto);
  });

  /* ---------- Vista de todas las pantallas (e impresión) ---------- */
  // Las explicaciones de los botones «i» y las notas se copian debajo de cada pantalla.
  pantallas.forEach((p) => {
    const ex = document.createElement('div');
    ex.className = 'explicaciones';
    const ids = [...new Set($$('[data-info]', p).map((b) => b.dataset.info))];
    ids.forEach((id) => {
      const t = document.getElementById(id);
      if (!t) return;
      const f = t.content.cloneNode(true);
      const h = f.querySelector('h3');
      const h4 = document.createElement('h4');
      h4.textContent = 'Explicación «i»: ' + (h ? h.textContent : '');
      if (h) h.remove();
      ex.appendChild(h4);
      ex.appendChild(f);
    });
    const notas = $('.notas', p);
    if (notas) {
      const n = document.createElement('div');
      n.className = 'notas-copia';
      n.hidden = true;
      n.innerHTML = `<h4>Notas del facilitador · ${p.dataset.min || 0} min</h4>` + notas.innerHTML;
      ex.appendChild(n);
    }
    p.appendChild(ex);
  });
  function entrarVista() {
    document.body.classList.add('vista');
    pantallas.forEach((p) => { p.classList.add('vista-total'); p.removeAttribute('inert'); p.setAttribute('aria-hidden', 'false'); aplicarPaso(p, p._pasos); });
    $('#vista-salir').focus();
    window.scrollTo(0, 0);
  }
  function salirVista() {
    document.body.classList.remove('vista');
    pantallas.forEach((p) => p.classList.remove('vista-total'));
    mostrar();
    $('#btn-vista').focus();
  }
  $('#btn-vista').addEventListener('click', entrarVista);
  $('#vista-salir').addEventListener('click', salirVista);
  $('#vista-imprimir').addEventListener('click', () => {
    try { window.print(); } catch (e) { avisar('No se pudo abrir la impresión. Usa Ctrl+P (o Cmd+P).'); }
  });
  $('#vista-notas').addEventListener('change', (e) => { $$('.notas-copia').forEach((n) => { n.hidden = !e.target.checked; }); });
  $$('.pantalla').forEach((p, i) => p.addEventListener('dblclick', () => { if (document.body.classList.contains('vista')) { salirVista(); ir(i, 0); } }));
  window.addEventListener('beforeprint', () => { if (!document.body.classList.contains('vista')) entrarVista(); });

  /* ---------- Notas del facilitador ---------- */
  let ventanaNotas = null;
  const inicio = Date.now();
  function htmlNotas() {
    const p = pantallas[actual];
    const n = $('.notas', p);
    const s = secciones[Number(p.dataset.indiceSeccion)];
    let acumulado = 0;
    for (let i = 0; i < actual; i++) acumulado += Number(pantallas[i].dataset.min || 0);
    const sig = pantallas[actual + 1];
    return `<p class="meta"><b>${actual + 1} / ${total} · ${p.dataset.titulo || ''}</b><br>${s.nombre} · esta pantalla: ${p.dataset.min || 0} min · plan acumulado al empezar: ${acumulado} de ${minutosTotales} min` +
      (p._pasos ? `<br>Paso ${paso} de ${p._pasos}` : '') + `</p>` +
      (n ? n.innerHTML : '<p>Sin notas para esta pantalla.</p>') +
      (sig ? `<p class="sig">Sigue: ${sig.dataset.titulo || ''}</p>` : '');
  }
  function actualizarNotas() {
    if (ventanaNotas && !ventanaNotas.closed) {
      const c = ventanaNotas.document.getElementById('contenido');
      if (c) c.innerHTML = htmlNotas();
    }
    if (!$('#panel-notas').hidden) $('#panel-notas-cuerpo').innerHTML = htmlNotas();
  }
  function abrirNotas() {
    if (ventanaNotas && !ventanaNotas.closed) { ventanaNotas.focus(); return; }
    let w = null;
    try { w = window.open('', 'notas-' + TALLER, 'width=560,height=780'); } catch (e) { w = null; }
    if (!w) {
      abrirPanelNotas('El navegador bloqueó la ventana de notas. Se muestran aquí: si estás proyectando la misma pantalla, el público también las verá.');
      return;
    }
    ventanaNotas = w;
    w.document.open();
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Notas del facilitador · ${document.title}</title>
<style>body{font:17px/1.55 system-ui,sans-serif;margin:0;padding:1.2rem 1.4rem;background:#fbfaf7;color:#22102a}
.reloj{position:sticky;top:0;background:#22102a;color:#fff;margin:-1.2rem -1.4rem 1rem;padding:.6rem 1.4rem;display:flex;justify-content:space-between;font-weight:700}
.meta{border-bottom:2px solid #22102a;padding-bottom:.6rem}.sig{border-top:1px dashed #22102a;padding-top:.6rem;color:#4b3656}
button{font:inherit;padding:.3rem .8rem;border:2px solid #fff;background:transparent;color:#fff;cursor:pointer}
ul{padding-left:1.2rem}li+li{margin-top:.3rem}</style></head>
<body><div class="reloj"><span>Tiempo transcurrido: <span id="reloj">0:00</span></span><span><button id="ant">Anterior</button> <button id="sig">Siguiente</button></span></div><div id="contenido"></div></body></html>`);
    w.document.close();
    w.document.getElementById('ant').onclick = () => anterior();
    w.document.getElementById('sig').onclick = () => siguiente();
    w.document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') siguiente();
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') anterior();
    });
    const tic = () => {
      if (w.closed) return;
      const s = Math.floor((Date.now() - inicio) / 1000);
      const el = w.document.getElementById('reloj');
      if (el) el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      setTimeout(tic, 1000);
    };
    tic();
    actualizarNotas();
    avisar('Las notas se abrieron en otra ventana. Llévala a tu pantalla; no se proyecta.');
  }
  function abrirPanelNotas(msg) {
    $('#panel-notas-aviso').textContent = msg || '';
    $('#panel-notas').hidden = false;
    actualizarNotas();
    $('#panel-notas .cerrar').focus();
  }
  function cerrarPanelNotas() { $('#panel-notas').hidden = true; $('#btn-notas').focus(); }
  $('#btn-notas').addEventListener('click', abrirNotas);
  $('#panel-notas .cerrar').addEventListener('click', cerrarPanelNotas);
  $('#panel-notas-aqui') && $('#panel-notas-aqui').addEventListener('click', () => abrirPanelNotas('Panel dentro de la presentación: si proyectas esta misma pantalla, el público lo verá.'));

  /* ---------- Copiar consultas ---------- */
  async function copiarTexto(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(texto); return true; } catch (e) { /* sigue a la alternativa */ }
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = texto; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }
  window.copiarTexto = copiarTexto;
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copiar]');
    if (!b) return;
    const origen = document.getElementById(b.dataset.copiar);
    if (!origen) return;
    const texto = (origen.value !== undefined && origen.tagName === 'TEXTAREA') ? origen.value : origen.innerText.trim();
    const estado = b.closest('.consulta, .copiable')?.querySelector('.estado-copia');
    const ok = await copiarTexto(texto);
    if (ok) {
      if (estado) estado.textContent = 'Copiada. Pégala en ChatGPT.';
      avisar('Consulta copiada. Pégala en ChatGPT (requiere internet).');
    } else {
      // Alternativa: mostrar el texto seleccionado para copiarlo a mano
      let ta = b.closest('.consulta, .copiable')?.querySelector('textarea.respaldo');
      if (!ta && b.closest('.consulta, .copiable')) {
        ta = document.createElement('textarea');
        ta.className = 'respaldo';
        ta.setAttribute('aria-label', 'Texto de la consulta para copiar a mano');
        b.closest('.consulta, .copiable').appendChild(ta);
      }
      if (ta) { ta.value = texto; ta.focus(); ta.select(); }
      if (estado) estado.textContent = 'No se pudo copiar solo. El texto quedó seleccionado abajo: usa Ctrl+C, o mantén presionado y elige Copiar.';
    }
  });

  /* ---------- Opciones de preguntas (marcar lo que elige el grupo) ---------- */
  document.addEventListener('click', (e) => {
    const o = e.target.closest('.opcion');
    if (!o) return;
    const grupo = o.closest('.opciones');
    $$('.opcion', grupo).forEach((x) => {
      const sel = x === o && x.getAttribute('aria-pressed') !== 'true';
      x.setAttribute('aria-pressed', sel);
      const m = $('.marca', x);
      if (m) m.dataset.texto = sel ? 'Elegida' : '';
    });
  });

  /* ---------- Inicio ---------- */
  const m = /^#(\d+)(?:\.(\d+))?$/.exec(location.hash);
  if (m) ir(Number(m[1]) - 1, Number(m[2] || 0)); else ir(0, 0);
  window.addEventListener('hashchange', () => {
    const h = /^#(\d+)(?:\.(\d+))?$/.exec(location.hash);
    if (h && (Number(h[1]) - 1 !== actual || Number(h[2] || 0) !== paso)) ir(Number(h[1]) - 1, Number(h[2] || 0));
  });
  document.documentElement.classList.add('listo');
})();
