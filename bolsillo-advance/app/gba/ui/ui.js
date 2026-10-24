// ===================== Browser front-end =====================
(function () {
  const $ = id => document.getElementById(id);
  // Inside the Android app there is no claude.ai runtime: files are saved to Downloads through the app's bridge
  const IN_APP = !!window.AndroidBridge;
  let lastSavedPath = '';
  if (IN_APP && !window.claude) {
    const toB64 = async data => {
      let u8;
      if (typeof data === 'string') u8 = new TextEncoder().encode(data);
      else if (data instanceof Blob) u8 = new Uint8Array(await data.arrayBuffer());
      else if (data instanceof ArrayBuffer) u8 = new Uint8Array(data);
      else u8 = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      let bin = '';
      for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(bin);
    };
    const downloads = {
      save: async ({ filename, data }) => {
        const r = window.AndroidBridge.saveFile(filename, await toB64(data));
        if (String(r).startsWith('ERROR')) throw { code: 'unavailable', message: r };
        lastSavedPath = r;
        return { status: 'saved' };
      },
    };
    window.claude = { use: async n => (n === 'downloads' ? downloads : null) };
  }
  const savedMsg = base => base + (IN_APP && lastSavedPath ? ' en ' + lastSavedPath.replace(/\/[^/]*$/, '') : '');
  const gba = new GBA();
  const canvas = $('screen');
  const ctx2d = canvas.getContext('2d');
  const image = ctx2d.createImageData(240, 160);
  const frameBytes = new Uint8ClampedArray(gba.ppu.frame.buffer);

  let running = false;
  let romKey = null;
  let turbo = 1;
  let soundOn = true;
  let volume = 75;
  const gainFor = () => soundOn ? 2.6 * Math.pow(volume / 100, 2) : 0;
  const pref = (k, d) => { try { const v = localStorage.getItem('ba:' + k); return v === null ? d : v; } catch (e) { return d; } };
  const setPref = (k, v) => { try { localStorage.setItem('ba:' + k, String(v)); } catch (e) {} };
  let keysTouch = 0, keysKbd = 0;
  // player settings (kept in this browser)
  const S = {
    filter: pref('filter', 'sharp'), colors: pref('colors', 'raw'), fps: pref('fps', 'off'), skip: pref('skip', 'auto'),
    ctl: pref('ctl', '1'), sens: pref('sens', 'normal'), vibe: pref('vibe', 'on'), turboMode: pref('turboMode', 'toggle'),
    rewind: pref('rewind', 'on'), autosave: pref('autosave', '3'),
  };
  let autoA = pref('autoA', 'off') === 'on';
  let rewinding = false;
  const snaps = [];
  let snapCounter = 0;

  // ---------- storage (IndexedDB) ----------
  const DB = {
    db: null,
    open() {
      return new Promise(res => {
        try {
          const req = indexedDB.open('bolsillo-advance', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('kv');
          req.onsuccess = () => { DB.db = req.result; res(true); };
          req.onerror = () => res(false);
        } catch (e) { res(false); }
      });
    },
    get(k) {
      return new Promise(res => {
        try {
          const r = DB.db.transaction('kv').objectStore('kv').get(k);
          r.onsuccess = () => res(r.result); r.onerror = () => res(undefined);
        } catch (e) { res(undefined); }
      });
    },
    del(k) {
      return new Promise(res => {
        try {
          const tx = DB.db.transaction('kv', 'readwrite');
          tx.objectStore('kv').delete(k);
          tx.oncomplete = () => res(true); tx.onerror = () => res(false);
        } catch (e) { res(false); }
      });
    },
    set(k, v) {
      return new Promise(res => {
        try {
          const tx = DB.db.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(v, k);
          tx.oncomplete = () => res(true); tx.onerror = () => res(false); tx.onabort = () => res(false);
        } catch (e) { res(false); }
      });
    },
  };

  // ---------- toast ----------
  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.innerHTML = '<span class="dot"></span>';
    t.appendChild(document.createTextNode(msg));
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // ---------- audio ----------
  const Audio = {
    ctx: null, node: null, gain: null, frac: 0, lastL: 0, lastR: 0,
    lpL: 0, lpR: 0, hxL: 0, hxR: 0, hyL: 0, hyR: 0,
    start() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC({ latencyHint: 'interactive' });
        this.node = this.ctx.createScriptProcessor(1024, 0, 2);
        this.gain = this.ctx.createGain();
        this.gain.gain.value = gainFor();
        this.node.onaudioprocess = e => this.process(e);
        this.node.connect(this.gain);
        this.gain.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; }
    },
    process(e) {
      const L = e.outputBuffer.getChannelData(0), R = e.outputBuffer.getChannelData(1);
      const apu = gba.apu, ring = apu.ring;
      // dynamic rate control: play a hair faster or slower to keep ~70 ms buffered, so audio never clicks or drifts
      const target = 2300, fill = apu.available();
      let adj = (fill - target) / target;
      if (adj > 1) adj = 1; else if (adj < -1) adj = -1;
      const step = SAMPLE_RATE / this.ctx.sampleRate * (1 + adj * 0.006);
      const lpA = 1 - Math.exp(-2 * Math.PI * 11000 / this.ctx.sampleRate);
      for (let i = 0; i < L.length; i++) {
        let l, r;
        if (!running || rewinding || apu.available() < 2) {
          this.lastL *= 0.995; this.lastR *= 0.995;
          l = this.lastL; r = this.lastR;
        } else {
          const p = apu.readPos, q = (p + 1) % RING_SIZE, f = this.frac;
          l = ring[p * 2] * (1 - f) + ring[q * 2] * f;
          r = ring[p * 2 + 1] * (1 - f) + ring[q * 2 + 1] * f;
          this.lastL = l; this.lastR = r;
          this.frac += step;
          while (this.frac >= 1) { this.frac -= 1; apu.readPos = (apu.readPos + 1) % RING_SIZE; }
        }
        // soften the harsh top end of the square waves, then remove DC offset
        this.lpL += lpA * (l - this.lpL); this.lpR += lpA * (r - this.lpR);
        const yl = this.lpL - this.hxL + 0.996 * this.hyL, yr = this.lpR - this.hxR + 0.996 * this.hyR;
        this.hxL = this.lpL; this.hxR = this.lpR; this.hyL = yl; this.hyR = yr;
        L[i] = yl; R[i] = yr;
      }
    },
    apply() { if (this.gain) this.gain.gain.value = gainFor(); },
  };

  // ---------- ROM loading ----------
  async function unzip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    let fallback = null;
    for (let i = 0; i + 30 < u8.length; ) {
      if (dv.getUint32(i, true) !== 0x04034b50) break;
      const method = dv.getUint16(i + 8, true);
      let csize = dv.getUint32(i + 18, true);
      const nlen = dv.getUint16(i + 26, true), xlen = dv.getUint16(i + 28, true);
      const name = new TextDecoder().decode(u8.subarray(i + 30, i + 30 + nlen));
      const start = i + 30 + nlen + xlen;
      if (csize === 0 && (dv.getUint16(i + 6, true) & 8)) {
        // size stored in central directory; find it
        csize = findCentralSize(u8, dv, name);
      }
      const data = u8.subarray(start, start + csize);
      const entry = { name, method, data };
      if (/\.(gba|agb|bin|sav|srm|fla)$/i.test(name)) return inflateEntry(entry);
      if (!fallback && !name.endsWith('/')) fallback = entry;
      i = start + csize;
    }
    if (fallback) return inflateEntry(fallback);
    throw new Error('El .zip no contiene ningún .gba');
  }
  // every file in a .zip, as { name: Uint8Array }
  async function unzipAll(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf), out = {};
    for (let i = 0; i + 30 < u8.length; ) {
      if (dv.getUint32(i, true) !== 0x04034b50) break;
      const method = dv.getUint16(i + 8, true);
      let csize = dv.getUint32(i + 18, true);
      const nlen = dv.getUint16(i + 26, true), xlen = dv.getUint16(i + 28, true);
      const name = new TextDecoder().decode(u8.subarray(i + 30, i + 30 + nlen));
      const start = i + 30 + nlen + xlen;
      if (csize === 0 && (dv.getUint16(i + 6, true) & 8)) csize = findCentralSize(u8, dv, name);
      if (!name.endsWith('/')) out[name] = await inflateEntry({ name, method, data: u8.subarray(start, start + csize) });
      i = start + csize;
    }
    return out;
  }
  function findCentralSize(u8, dv, name) {
    for (let i = u8.length - 22; i >= 0; i--) {
      if (dv.getUint32(i, true) === 0x02014b50) {
        const nlen = dv.getUint16(i + 28, true);
        const n = new TextDecoder().decode(u8.subarray(i + 46, i + 46 + nlen));
        if (n === name) return dv.getUint32(i + 20, true);
      }
    }
    return 0;
  }
  async function inflateEntry(e) {
    if (e.method === 0) return e.data.slice();
    if (e.method !== 8 || typeof DecompressionStream === 'undefined') throw new Error('No se puede abrir este .zip; descomprímelo primero');
    const stream = new Blob([e.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function loadRomBytes(bytes, fileName, remember) {
    pause();
    gba.loadRom(bytes);
    snaps.length = 0;
    const title = gba.cart.title || fileName.replace(/\.[^.]+$/, '');
    romKey = (gba.cart.code || 'XXXX') + ':' + (gba.cart.title || fileName);
    $('gameName').textContent = title;
    const save = await DB.get('save:' + romKey);
    const meta = await DB.get('savemeta:' + romKey);
    if (save) gba.cart.setSaveData(new Uint8Array(save));
    const remote = await Cloud.fetch(romKey, 5000);
    const localT = save ? (meta ? meta.t : 1) : 0;
    const synced = meta && meta.synced;
    const useRemote = async () => {
      if (save) await addSaveVersion(romKey, new Uint8Array(save), localT, true);
      gba.cart.setSaveData(remote.data);
      await DB.set('save:' + romKey, remote.data);
      await DB.set('savemeta:' + romKey, { t: remote.t, synced: remote.t });
      await addSaveVersion(romKey, remote.data, remote.t, true);
    };
    if (remote && save && synced && remote.t !== localT && localT > synced && remote.t > synced) {
      // both copies changed since they were last in sync: let the player choose
      const pick = await ask('Tu partida cambió en dos sitios',
        `En este dispositivo se guardó por última vez el ${fmtTime(localT)}; en tu cuenta, el ${fmtTime(remote.t)} (otro dispositivo). ¿Cuál quieres usar? La otra queda en el historial de la partida.`,
        [{ label: 'Usar la de este dispositivo · ' + fmtTime(localT), primary: true }, { label: 'Usar la de mi cuenta · ' + fmtTime(remote.t) }]);
      if (pick === 1) { await useRemote(); setTimeout(() => toast('Usando la partida de tu cuenta'), 300); }
      else {
        await addSaveVersion(romKey, remote.data, remote.t, true);
        Cloud.schedule(romKey, new Uint8Array(save), Date.now(), 0);
      }
    } else if (remote && remote.t > localT) {
      await useRemote();
      setTimeout(() => toast('Partida recuperada de tu cuenta'), 600);
    } else if (save && (!remote || remote.t < localT)) {
      Cloud.schedule(romKey, new Uint8Array(save), localT || Date.now());
    } else if (save && remote && remote.t === localT && !synced) {
      await DB.set('savemeta:' + romKey, { t: localT, synced: localT });
    }
    if (save && !((await DB.get('savehist:' + romKey)) || []).length) await addSaveVersion(romKey, new Uint8Array(save), localT || Date.now(), true);
    gba.cart.clearDirty();
    updateBackupButtons();
    if (remember) await DB.set('lastRom', { name: fileName, data: bytes });
    $('emptyOverlay').hidden = true;
    await renderSlots();
    autoFrames = 0;
    cloudMetasReady = fetchCloudMetas(romKey);
    return title;
  }

  $('romInput').addEventListener('change', async ev => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    closeMenu();
    try {
      let buf = await file.arrayBuffer();
      let bytes = new Uint8Array(buf);
      if (bytes[0] === 0x50 && bytes[1] === 0x4B) bytes = await unzip(buf);
      if (bytes.length < 0xC0) throw new Error('Este archivo no parece una ROM de GBA');
      const title = await loadRomBytes(bytes, file.name, true);
      Audio.start();
      checkPersist(true);
      toast('Cargado: ' + title);
      await offerResume(title, true);
    } catch (e) {
      toast(e.message || 'No se pudo cargar el archivo');
    }
  });

  // ---------- save persistence ----------
  async function flushSave() {
    if (!romKey || !gba.cart.saveDirty) return;
    gba.cart.clearDirty();
    const data = gba.cart.getSaveData();
    if (!data) return;
    const t = Date.now(), key = romKey;
    const old = (await DB.get('savemeta:' + key)) || {};
    await DB.set('save:' + key, data);
    await DB.set('savemeta:' + key, { t, synced: old.synced });
    await addSaveVersion(key, data, t);
    Cloud.schedule(key, data, t);
  }

  // ---------- history of the in-game save ----------
  // newest entry always mirrors the current save; older ones are at least 10 minutes apart; kept 7 days (3 minimum, 20 maximum)
  async function addSaveVersion(key, data, t, forceNew) {
    const h = (await DB.get('savehist:' + key)) || [];
    if (!forceNew && h.length && t - h[0].t < 10 * 60e3) {
      await DB.set('savever:' + key + ':' + h[0].id, data.slice());
      h[0].t = t;
    } else {
      const id = String(t) + '-' + Math.floor(Math.random() * 1e4);
      await DB.set('savever:' + key + ':' + id, data.slice());
      h.unshift({ id, t });
      h.sort((a, b) => b.t - a.t);
    }
    const keep = [], drop = [];
    h.forEach((v, idx) => ((idx < 3 || (t - v.t < 7 * 864e5 && idx < 20)) ? keep : drop).push(v));
    for (const v of drop) await DB.del('savever:' + key + ':' + v.id);
    await DB.set('savehist:' + key, keep);
    if (!$('sheetBack').hidden) renderSaveHist();
  }
  async function renderSaveHist() {
    const box = $('saveHist');
    const h = romKey ? ((await DB.get('savehist:' + romKey)) || []) : [];
    box.textContent = '';
    if (!h.length) { const e = document.createElement('div'); e.className = 'hist-empty'; e.textContent = romKey ? 'Aún no has guardado dentro del juego.' : 'Carga un juego para ver su historial.'; box.appendChild(e); return; }
    h.forEach((v, idx) => {
      const row = document.createElement('div'); row.className = 'hist-row';
      const sp = document.createElement('span'); sp.textContent = fmtTime(v.t) + (idx === 0 ? ' · la actual' : '');
      row.appendChild(sp);
      if (idx > 0) {
        const b = document.createElement('button'); b.className = 'chip'; b.textContent = 'Restaurar';
        b.onclick = () => restoreSaveVersion(v);
        row.appendChild(b);
      }
      box.appendChild(row);
    });
  }
  async function restoreSaveVersion(v) {
    const pick = await ask('Restaurar la partida del ' + fmtTime(v.t),
      'Tu partida actual se sustituye por esa versión y el juego se reinicia. La actual queda en el historial y puedes deshacerlo justo después.',
      [{ label: 'Restaurar y reiniciar', primary: true }, { label: 'Cancelar' }]);
    if (pick !== 0) return;
    const data = await DB.get('savever:' + romKey + ':' + v.id);
    if (!data) { toast('No se encontró esa versión'); return; }
    takeSafety();
    gba.reset();
    afterStateChange();
    gba.cart.setSaveData(new Uint8Array(data));
    await storeSaveNow(new Uint8Array(data));
    closeMenu();
    offerUndo('Partida del ' + fmtTime(v.t) + ' restaurada');
  }
  // write the current save everywhere right away (local, history, account)
  async function storeSaveNow(data) {
    const t = Date.now(), key = romKey;
    const old = (await DB.get('savemeta:' + key)) || {};
    await DB.set('save:' + key, gba.cart.getSaveData());
    await DB.set('savemeta:' + key, { t, synced: old.synced });
    await addSaveVersion(key, gba.cart.getSaveData(), t, true);
    Cloud.schedule(key, gba.cart.getSaveData(), t, 0);
    gba.cart.clearDirty();
  }

  // ---------- undo + confirm dialog ----------
  let undoState = null, undoTimer = 0;
  function takeSafety() {
    if (!gba.loaded) return;
    undoState = gba.getState();
    if (romKey) DB.set('state:' + romKey + ':undo', undoState);
  }
  function afterStateChange() {
    gba.apu.readPos = gba.apu.writePos;
    snaps.length = 0;
    autoFrames = 0;
  }
  function offerUndo(text) {
    $('undoText').textContent = text;
    $('undoBar').hidden = false;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { $('undoBar').hidden = true; }, 9000);
  }
  $('undoBtn').onclick = async () => {
    $('undoBar').hidden = true;
    const st = undoState;
    undoState = null;
    if (!st) return;
    gba.setState(st);
    afterStateChange();
    gba.runFrame(); redraw();
    if (gba.cart.saveDirty) await storeSaveNow(gba.cart.getSaveData());
    toast('Deshecho: vuelves a donde estabas');
  };
  function ask(title, text, buttons) {
    return new Promise(res => {
      $('askTitle').textContent = title;
      $('askText').textContent = text;
      const box = $('askBtns'); box.textContent = '';
      buttons.forEach((b, idx) => {
        const el = document.createElement('button');
        el.className = 'chip' + (b.primary ? ' primary' : '');
        el.textContent = b.label;
        el.onclick = () => { $('askBack').hidden = true; res(idx); };
        box.appendChild(el);
      });
      $('askBack').hidden = false;
      box.firstChild && box.firstChild.focus();
    });
  }

  // ---------- browser storage protection ----------
  async function checkPersist(requestIt) {
    if (IN_APP) {
      $('persistLed').className = 'led ok';
      $('persistStatus').textContent = 'Los datos están dentro de la app: solo se borran si la desinstalas o borras sus datos en Ajustes.';
      return;
    }
    try {
      if (!navigator.storage || !navigator.storage.persisted) throw 0;
      let ok = await navigator.storage.persisted();
      if (!ok && requestIt && navigator.storage.persist) ok = await navigator.storage.persist();
      let used = '';
      try { const est = await navigator.storage.estimate(); used = ' Ocupa ' + Math.max(1, Math.round(est.usage / 1048576)) + ' MB.'; } catch (e) {}
      $('persistLed').className = 'led ' + (ok ? 'ok' : 'busy');
      $('persistStatus').textContent = ok
        ? 'Datos protegidos: el navegador no los borrará aunque falte espacio.' + used
        : 'El navegador no ha concedido la protección contra borrado; por eso todo se copia también en tu cuenta.' + used;
    } catch (e) {
      $('persistLed').className = 'led off';
      $('persistStatus').textContent = 'Este navegador no permite proteger los datos; la copia en tu cuenta te cubre.';
    }
  }
  setInterval(flushSave, 1500);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { flushSave(); autoSave('hide'); if (running) { pause(); showResume('Pausa', 'Toca para seguir jugando.'); } }
  });
  window.addEventListener('pagehide', () => { flushSave(); autoSave('hide'); Cloud.push(); });

  // ---------- backups: Claude account (db) + exported file (downloads) ----------
  function b64encode(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64decode(str) {
    const s = atob(str), u8 = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return u8;
  }
  const docKey = key => 'save-' + key.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120);
  function fmtTime(t) {
    return new Date(t).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function setCloudStatus(kind, text) {
    $('cloudLed').className = 'led ' + kind;
    $('cloudStatus').textContent = text;
  }

  const Cloud = {
    db: null, uid: null, ready: null, timer: 0, pending: null, lastT: 0,
    init() {
      this.ready = (async () => {
        try {
          if (!window.claude || !window.claude.use) throw 0;
          const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
          const uid = user ? await user.id() : null;
          if (!db || !uid) throw 0;
          this.db = db; this.uid = uid;
          setCloudStatus('ok', 'Cuenta conectada. Aún no hay copia de este juego.');
          return true;
        } catch (e) {
          setCloudStatus('off', IN_APP
            ? 'En la app no hay copia en tu cuenta de Claude. Para tener respaldo fuera del móvil, usa «Copia completa» de vez en cuando (se guarda en Descargas).'
            : 'Copia en la cuenta no disponible aquí (abre la página con tu sesión de Claude iniciada). Usa «Exportar partida» o «Copia completa».');
          return false;
        }
      })();
      return this.ready;
    },
    ref(key) { return this.db.collection('data/users/' + this.uid).doc(docKey(key)); },
    async fetch(key, timeoutMs) {
      const ok = await Promise.race([this.ready, new Promise(r => setTimeout(() => r(false), timeoutMs))]);
      if (!ok || !this.db) return null;
      try {
        const snap = await Promise.race([this.ref(key).get(), new Promise((_, rej) => setTimeout(() => rej(0), timeoutMs))]);
        if (!snap.exists) return null;
        const d = snap.data();
        this.lastT = d.t;
        setCloudStatus('ok', 'Copia en tu cuenta: ' + fmtTime(d.t));
        return { t: d.t, data: b64decode(d.b64) };
      } catch (e) { return null; }
    },
    schedule(key, data, t, delay = 4000) {
      this.pending = { key, data: data.slice(), t };
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.push(), delay);
    },
    async push() {
      const p = this.pending;
      if (!p) return false;
      const ok = await this.ready;
      if (!ok) return false;
      this.pending = null;
      setCloudStatus('busy', 'Copiando a tu cuenta…');
      try {
        await this.ref(p.key).set({ t: p.t, title: gba.cart.title || '', size: p.data.length, b64: b64encode(p.data) });
        this.lastT = p.t;
        const m = await DB.get('savemeta:' + p.key);
        if (m && m.t <= p.t) await DB.set('savemeta:' + p.key, { t: m.t, synced: p.t });
        setCloudStatus('ok', 'Copia en tu cuenta: ' + fmtTime(p.t));
        $('menuBadge').hidden = true;
        return true;
      } catch (e) {
        this.pending = this.pending || p;
        setCloudStatus('off', 'No se pudo copiar (' + (e && e.code || 'error') + '). Se reintentará al próximo guardado.');
        $('menuBadge').hidden = false;
        return false;
      }
    },
  };
  Cloud.init();

  function updateBackupButtons() {
    const has = gba.loaded && !!gba.cart.getSaveData();
    $('exportBtn').disabled = !has;
    $('backupBtn').disabled = !gba.loaded;
    $('cloudBtn').disabled = !has || !Cloud.db;
  }
  Cloud.ready.then(updateBackupButtons);

  $('cloudBtn').onclick = async () => {
    if (!romKey) return;
    await flushSave();
    const data = gba.cart.getSaveData();
    const meta = await DB.get('savemeta:' + romKey);
    Cloud.schedule(romKey, data, meta ? meta.t : Date.now(), 0);
    clearTimeout(Cloud.timer);
    toast((await Cloud.push()) ? 'Partida copiada en tu cuenta' : 'No se pudo copiar ahora');
  };

  // minimal .zip writer (stored, no compression) so the file passes the download allowlist
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function makeZip(name, data) { return makeZipMulti([{ name, data }]); }
  function makeZipMulti(files) {
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const data = f.data;
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
      crc = (crc ^ 0xFFFFFFFF) >>> 0;
      const nm = new TextEncoder().encode(f.name);
      const d = new Date();
      const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
      const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 10, true);
      local.setUint16(10, dosTime, true); local.setUint16(12, dosDate, true);
      local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
      local.setUint16(26, nm.length, true);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 10, true);
      cen.setUint16(12, dosTime, true); cen.setUint16(14, dosDate, true);
      cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true);
      cen.setUint16(28, nm.length, true); cen.setUint32(42, offset, true);
      parts.push(local, nm, data);
      central.push(cen, nm);
      offset += 30 + nm.length + data.length;
    }
    const cenSize = central.reduce((n, x) => n + (x.byteLength !== undefined ? x.byteLength : x.length), 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cenSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end]);
  }


  $('exportBtn').onclick = async () => {
    const data = gba.cart.getSaveData();
    if (!data) return;
    const downloads = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (!downloads) { toast('Exportar no está disponible en esta vista'); return; }
    const base = (gba.cart.title || 'partida').replace(/[^A-Za-z0-9 _-]/g, '').trim() || 'partida';
    const stamp = new Date().toISOString().slice(0, 10);
    try {
      await downloads.save({ filename: `${base} ${stamp}.zip`, data: makeZip(base + '.sav', data) });
      toast(savedMsg('Partida exportada'));
    } catch (e) {
      if (e && e.code !== 'declined') toast('No se pudo exportar (' + (e.code || 'error') + ')');
    }
  };

  // ---------- full backup (save + states) ----------
  $('backupBtn').onclick = async () => {
    if (!gba.loaded) return;
    const downloads = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (!downloads) { toast('Exportar no está disponible en esta vista'); return; }
    await flushSave();
    const files = [], manifest = { app: 'bolsillo-advance', v: 1, code: gba.cart.code, title: gba.cart.title, t: Date.now(), states: {} };
    const save = gba.cart.getSaveData();
    if (save) files.push({ name: 'partida.sav', data: save });
    for (const i of ['auto', 1, 2, 3]) {
      const meta = await DB.get('statemeta:' + romKey + ':' + i);
      if (!meta) continue;
      const st = await DB.get('state:' + romKey + ':' + (i === 'auto' && meta.id ? meta.id : i));
      if (!st) continue;
      const packed = await packState(st);
      files.push({ name: 'estado-' + i + '.bin', data: b64decode(packed.b64) });
      manifest.states[i] = { t: meta.t, thumb: meta.thumb || '', name: meta.name || '', gz: packed.gz };
    }
    files.unshift({ name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify(manifest)) });
    const base = (gba.cart.title || 'partida').replace(/[^A-Za-z0-9 _-]/g, '').trim() || 'partida';
    try {
      await downloads.save({ filename: `${base} copia completa ${new Date().toISOString().slice(0, 10)}.zip`, data: makeZipMulti(files) });
      toast(savedMsg('Copia completa exportada'));
    } catch (e) { if (e && e.code !== 'declined') toast('No se pudo exportar (' + (e.code || 'error') + ')'); }
  };
  async function importFullBackup(entries) {
    const manifest = JSON.parse(new TextDecoder().decode(entries['manifest.json']));
    if (manifest.code && gba.cart.code && manifest.code !== gba.cart.code) {
      await ask('Esta copia es de otro juego', `La copia es de «${manifest.title || manifest.code}» y ahora tienes cargado «${gba.cart.title}». Carga ese juego primero y vuelve a importarla.`, [{ label: 'Entendido', primary: true }]);
      return;
    }
    const n = Object.keys(manifest.states).length;
    const pick = await ask('Importar copia completa',
      `Copia del ${fmtTime(manifest.t)}: ${entries['partida.sav'] ? 'partida del juego' : 'sin partida'}${n ? ' y ' + n + ' estado' + (n > 1 ? 's' : '') : ''}. Sustituye lo que tengas en esas ranuras y reinicia el juego. Podrás deshacerlo.`,
      [{ label: 'Importar', primary: true }, { label: 'Cancelar' }]);
    if (pick !== 0) return;
    takeSafety();
    for (const [i, m] of Object.entries(manifest.states)) {
      const bytes = entries['estado-' + i + '.bin'];
      if (!bytes) continue;
      const st = await unpackState(m.gz, b64encode(bytes));
      await DB.set('state:' + romKey + ':' + i, st);
      await DB.set('statemeta:' + romKey + ':' + i, { t: m.t, thumb: m.thumb, name: m.name });
      cloudPutState(romKey, i, st, { t: m.t, thumb: m.thumb, name: m.name });
    }
    gba.reset();
    afterStateChange();
    if (entries['partida.sav']) { gba.cart.setSaveData(entries['partida.sav']); await storeSaveNow(entries['partida.sav']); }
    closeMenu();
    offerUndo('Copia completa importada');
  }

  // ---------- save states (local + copy in the account) ----------
  const TA = { Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array };
  async function packState(st) {
    const json = JSON.stringify(st, (k, v) => ArrayBuffer.isView(v)
      ? { __ta: v.constructor.name, b: b64encode(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) } : v);
    let bytes = new TextEncoder().encode(json), gz = false;
    if (typeof CompressionStream !== 'undefined') {
      bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
      gz = true;
    }
    return { gz, b64: b64encode(bytes) };
  }
  async function unpackState(gz, b64) {
    let bytes = b64decode(b64);
    if (gz) bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    return JSON.parse(new TextDecoder().decode(bytes), (k, v) => (v && v.__ta && TA[v.__ta]) ? new TA[v.__ta](b64decode(v.b).buffer) : v);
  }
  const stateKey = (key, i) => 'st-' + key.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 100) + '-' + i;
  const CHUNK = 180000;
  let cloudMetas = {}, cloudMetasReady = Promise.resolve();
  async function cloudPutState(key, i, st, meta) {
    if (!(await Cloud.ready) || !Cloud.db) return false;
    try {
      const packed = await packState(st);
      const col = Cloud.db.collection('data/users/' + Cloud.uid);
      const n = Math.ceil(packed.b64.length / CHUNK);
      for (let c = 0; c < n; c++) await col.doc(stateKey(key, i) + '-' + c).set({ d: packed.b64.slice(c * CHUNK, (c + 1) * CHUNK) });
      const m = { t: meta.t, thumb: meta.thumb || '', name: meta.name || '', n, gz: packed.gz };
      await col.doc(stateKey(key, i)).set(m);
      cloudMetas[i] = m;
      return true;
    } catch (e) { return false; }
  }
  async function cloudGetState(key, i) {
    if (!(await Cloud.ready) || !Cloud.db) return null;
    try {
      const col = Cloud.db.collection('data/users/' + Cloud.uid);
      const ms = await col.doc(stateKey(key, i)).get();
      if (!ms.exists) return null;
      const m = ms.data();
      let b64 = '';
      for (let c = 0; c < m.n; c++) { const d = await col.doc(stateKey(key, i) + '-' + c).get(); if (!d.exists) return null; b64 += d.data().d; }
      return await unpackState(m.gz, b64);
    } catch (e) { return null; }
  }
  async function fetchCloudMetas(key) {
    cloudMetas = {};
    if (!(await Cloud.ready) || !Cloud.db) return;
    const col = Cloud.db.collection('data/users/' + Cloud.uid);
    for (const i of ['auto', 1, 2, 3]) {
      try { const ms = await col.doc(stateKey(key, i)).get(); if (ms.exists) cloudMetas[i] = ms.data(); } catch (e) {}
    }
    if (!$('sheetBack').hidden) renderSlots();
  }
  function makeThumb() {
    try {
      const c = document.createElement('canvas'); c.width = 120; c.height = 80;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.drawImage(canvas, 0, 0, 120, 80);
      return c.toDataURL('image/jpeg', 0.8);
    } catch (e) { return ''; }
  }
  async function bestMeta(i) {
    const local = romKey ? await DB.get('statemeta:' + romKey + ':' + i) : null;
    const cloud = cloudMetas[i];
    if (local && (!cloud || local.t >= cloud.t)) return Object.assign({ where: 'local' }, local);
    return cloud ? Object.assign({ where: 'cloud' }, cloud) : null;
  }
  const slotLabel = (i, meta) => i === 'auto' ? 'Autoguardado' : (meta && meta.name) || 'Ranura ' + i;
  let autoListOpen = false;
  function slotCard(i, meta, ring) {
    const isAuto = i === 'auto';
    const div = document.createElement('div');
    div.className = isAuto ? 'slot auto' : 'slot';
    let title;
    if (!isAuto && meta) {
      title = document.createElement('button'); title.className = 'slot-name';
      title.title = 'Toca para ponerle nombre';
      title.onclick = () => editName(i, meta, div, title);
      const bb = document.createElement('b'); bb.textContent = slotLabel(i, meta); title.appendChild(bb);
    } else { title = document.createElement('b'); title.textContent = slotLabel(i, meta); }
    let pic;
    if (meta && meta.thumb) { pic = document.createElement('img'); pic.src = meta.thumb; pic.alt = 'Captura de ' + slotLabel(i, meta); }
    else { pic = document.createElement('div'); pic.className = 'noimg'; }
    const small = document.createElement('small');
    small.textContent = meta ? fmtTime(meta.t) + (meta.where === 'cloud' ? ' · en tu cuenta' : '') : 'Vacío';
    const ld = document.createElement('button');
    ld.className = 'chip'; ld.textContent = 'Cargar'; ld.disabled = !meta;
    ld.onclick = () => loadState(i);
    if (isAuto) {
      const hint = document.createElement('small');
      hint.textContent = S.autosave === 'off' ? 'Desactivado' : 'Cada ' + S.autosave + ' min de juego y al salir';
      div.append(pic, title, small, hint, ld);
      const older = (ring && ring.items ? ring.items.slice(1) : []);
      if (older.length) {
        const more = document.createElement('button');
        more.className = 'chip auto-more'; more.textContent = (autoListOpen ? 'Ocultar' : 'Anteriores (' + older.length + ')');
        more.onclick = () => { autoListOpen = !autoListOpen; renderSlots(); };
        div.appendChild(more);
        if (autoListOpen) {
          const list = document.createElement('div'); list.className = 'hist auto-list';
          for (const it of older) {
            const row = document.createElement('div'); row.className = 'hist-row';
            if (it.thumb) { const im = document.createElement('img'); im.src = it.thumb; im.alt = ''; row.appendChild(im); }
            const sp = document.createElement('span'); sp.textContent = fmtTime(it.t); row.appendChild(sp);
            const b = document.createElement('button'); b.className = 'chip'; b.textContent = 'Cargar';
            b.onclick = () => loadAutoVersion(it);
            row.appendChild(b);
            list.appendChild(row);
          }
          div.appendChild(list);
        }
      }
    } else {
      const sv = document.createElement('button');
      sv.className = 'chip'; sv.textContent = 'Guardar'; sv.disabled = !romKey;
      let armed = 0;
      sv.onclick = () => {
        if (meta && !armed) {
          sv.textContent = '¿Sobrescribir?'; sv.classList.add('danger');
          armed = setTimeout(() => { armed = 0; sv.textContent = 'Guardar'; sv.classList.remove('danger'); }, 3000);
          return;
        }
        clearTimeout(armed); armed = 0;
        saveState(i, meta && meta.name);
      };
      div.append(title, pic, small, sv, ld);
    }
    return div;
  }
  function editName(i, meta, div, titleEl) {
    const inp = document.createElement('input');
    inp.className = 'name-edit'; inp.id = 'name-' + i; inp.maxLength = 24;
    inp.value = meta.name || ''; inp.placeholder = 'Ranura ' + i;
    titleEl.replaceWith(inp);
    inp.focus();
    let done = false;
    const finish = async save => {
      if (done) return; done = true;
      if (save) {
        const name = inp.value.trim();
        const local = await DB.get('statemeta:' + romKey + ':' + i);
        if (local) await DB.set('statemeta:' + romKey + ':' + i, Object.assign(local, { name }));
        const cm = cloudMetas[i];
        if (cm && Cloud.db) {
          cm.name = name;
          try { await Cloud.db.collection('data/users/' + Cloud.uid).doc(stateKey(romKey, i)).set(cm); } catch (e) {}
        }
      }
      renderSlots();
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false); });
    inp.addEventListener('blur', () => finish(true));
  }
  async function renderSlots() {
    const box = $('slots');
    const ring = romKey ? await DB.get('autoring:' + romKey) : null;
    const cards = [];
    for (const i of ['auto', 1, 2, 3]) cards.push(slotCard(i, await bestMeta(i), ring));
    box.textContent = '';
    for (const c of cards) box.appendChild(c);
  }

  // ---------- autosave (keeps the last 5) ----------
  let autoFrames = 0, autoBusy = false, lastAutoCloud = 0;
  async function autoSave(reason) {
    if (!romKey || !gba.loaded || autoBusy || rewinding || autoFrames === 0 || S.autosave === 'off') return;
    autoBusy = true;
    autoFrames = 0;
    try {
      const key = romKey, st = gba.getState(), t = Date.now(), thumb = makeThumb();
      const ring = (await DB.get('autoring:' + key)) || { next: 0, items: [] };
      const id = 'auto' + ring.next;
      await DB.set('state:' + key + ':' + id, st);
      ring.items = [{ id, t, thumb }, ...ring.items.filter(x => x.id !== id)].slice(0, 5);
      ring.next = (ring.next + 1) % 5;
      await DB.set('autoring:' + key, ring);
      await DB.set('statemeta:' + key + ':auto', { t, thumb, id });
      if (!$('sheetBack').hidden) renderSlots();
      // the copy in the account is heavier, so do it at most every 5 minutes, and always when leaving
      if (reason === 'hide' || t - lastAutoCloud > 5 * 60e3) {
        lastAutoCloud = t;
        cloudPutState(key, 'auto', st, { t, thumb });
      }
    } finally { autoBusy = false; }
  }
  async function loadAutoVersion(it) {
    const st = await DB.get('state:' + romKey + ':' + it.id);
    if (!st) { toast('Ese autoguardado ya no está'); return; }
    takeSafety();
    gba.setState(st);
    afterStateChange();
    redraw();
    closeMenu();
    offerUndo('Autoguardado del ' + fmtTime(it.t) + ' cargado');
  }
  async function saveState(i, keepName) {
    if (!romKey) return;
    const key = romKey;
    const st = gba.getState();
    const meta = { t: Date.now(), thumb: makeThumb(), name: keepName || '' };
    const ok = await DB.set('state:' + key + ':' + i, st);
    await DB.set('statemeta:' + key + ':' + i, meta);
    toast(ok ? `Guardado en «${slotLabel(i, meta)}»` : 'No se pudo guardar el estado');
    await renderSlots();
    if (await cloudPutState(key, i, st, meta)) {
      if (!$('sheetBack').hidden) renderSlots();
    }
  }
  async function loadState(i) {
    const local = await DB.get('statemeta:' + romKey + ':' + i);
    const cloud = cloudMetas[i];
    const sid = (i === 'auto' && local && local.id) ? local.id : i;
    let st = null;
    if (local && (!cloud || local.t >= cloud.t)) st = await DB.get('state:' + romKey + ':' + sid);
    if (!st && cloud) {
      toast('Descargando el estado de tu cuenta…');
      st = await cloudGetState(romKey, i);
      if (st) { await DB.set('state:' + romKey + ':' + i, st); await DB.set('statemeta:' + romKey + ':' + i, { t: cloud.t, thumb: cloud.thumb, name: cloud.name || '' }); }
    }
    if (!st && local) st = await DB.get('state:' + romKey + ':' + sid);
    if (!st) { toast('No se pudo cargar esa ranura'); return; }
    takeSafety();
    gba.setState(st);
    afterStateChange();
    redraw();
    closeMenu();
    offerUndo(`«${slotLabel(i, local || cloud)}» cargado`);
  }

  // ---------- menu ----------
  let wasRunning = false;
  $('menuBtn').onclick = () => {
    wasRunning = running;
    pause();
    renderSlots();
    renderSaveHist();
    checkPersist(false);
    $('sheetBack').hidden = false;
  };
  function closeMenu() {
    if ($('sheetBack').hidden) return;
    $('sheetBack').hidden = true;
    disarmReset();
    if (wasRunning && gba.loaded) resume();
  }
  $('closeMenu').onclick = closeMenu;
  $('sheetBack').addEventListener('click', e => { if (e.target === $('sheetBack')) closeMenu(); });

  // ---------- volume ----------
  function renderVolume() {
    const silent = !soundOn || volume === 0;
    $('volSlider').value = volume;
    $('volOut').textContent = volume + ' %';
    $('muteBtn').textContent = soundOn ? 'Silenciar' : 'Activar sonido';
    $('muteBtn').setAttribute('aria-pressed', soundOn ? 'false' : 'true');
    $('soundState').textContent = silent ? 'Silenciado' : 'Volumen ' + volume + ' %';
    $('volMute').style.display = silent ? '' : 'none';
    $('volWave1').style.display = silent ? 'none' : '';
    $('volWave2').style.display = silent || volume < 50 ? 'none' : '';
    $('volBtn').setAttribute('aria-label', silent ? 'Volumen: silenciado' : 'Volumen: ' + volume + ' %');
    Audio.apply();
  }
  volume = Math.max(0, Math.min(100, +pref('volume', 75) || 0));
  soundOn = pref('sound', '1') === '1';
  renderVolume();
  $('volSlider').addEventListener('input', () => {
    volume = +$('volSlider').value;
    if (volume > 0) soundOn = true;
    setPref('volume', volume); setPref('sound', soundOn ? 1 : 0);
    renderVolume();
  });
  function toggleMute() {
    soundOn = !soundOn;
    if (soundOn && volume === 0) volume = 50;
    setPref('volume', volume); setPref('sound', soundOn ? 1 : 0);
    renderVolume();
  }
  $('muteBtn').onclick = toggleMute;
  $('soundBtn').onclick = toggleMute;
  function closeVol() { $('volPop').hidden = true; $('volBtn').setAttribute('aria-expanded', 'false'); }
  $('volBtn').onclick = () => {
    Audio.start();
    const open = $('volPop').hidden;
    $('volPop').hidden = !open;
    $('volBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  // close when touching anywhere else
  document.addEventListener('pointerdown', e => {
    if ($('volPop').hidden) return;
    if (e.target.closest('#volPop') || e.target.closest('#volBtn')) return;
    closeVol();
  }, true);

  // ---------- day / night look ----------
  function applyLook(look) {
    const day = look === 'day';
    if (day) document.documentElement.setAttribute('data-look', 'day');
    else document.documentElement.removeAttribute('data-look');
    $('lookMoon').style.display = day ? 'none' : '';
    $('lookSun').style.display = day ? '' : 'none';
    $('lookBtn').setAttribute('aria-label', day ? 'Cambiar a modo noche' : 'Cambiar a modo día');
  }
  let look = pref('look', 'night');
  applyLook(look);
  $('lookBtn').onclick = () => {
    look = look === 'day' ? 'night' : 'day';
    setPref('look', look);
    applyLook(look);
    toast(look === 'day' ? 'Modo día' : 'Modo noche');
  };

  let resetArmed = false;
  function disarmReset() { resetArmed = false; $('resetHint').textContent = 'Pierdes lo no guardado'; }
  $('resetBtn').onclick = () => {
    if (!gba.loaded) return;
    if (!resetArmed) { resetArmed = true; $('resetHint').textContent = 'Toca otra vez para confirmar'; return; }
    disarmReset();
    takeSafety();
    const save = gba.cart.getSaveData();
    gba.reset();
    afterStateChange();
    if (save) gba.cart.setSaveData(save);
    gba.cart.clearDirty();
    closeMenu();
    offerUndo('Consola reiniciada');
  };

  $('savInput').addEventListener('change', async ev => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!file || !gba.loaded) { if (!gba.loaded) toast('Primero carga la ROM'); return; }
    let buf = await file.arrayBuffer();
    let data = new Uint8Array(buf);
    try {
      if (data[0] === 0x50 && data[1] === 0x4B) {
        const entries = await unzipAll(buf);
        if (entries['manifest.json']) { await importFullBackup(entries); return; }
        data = await unzip(buf);
      }
    } catch (e) { toast('No se pudo abrir ese .zip'); return; }
    const pick = await ask('Importar partida', 'Tu partida actual se sustituye por la del archivo y el juego se reinicia. La actual queda en el historial y podrás deshacerlo.', [{ label: 'Importar y reiniciar', primary: true }, { label: 'Cancelar' }]);
    if (pick !== 0) return;
    takeSafety();
    gba.reset();
    afterStateChange();
    gba.cart.setSaveData(data);
    await storeSaveNow(data);
    closeMenu();
    offerUndo('Partida importada; el juego se ha reiniciado');
  });

  // ---------- diagnostics ----------
  $('diagBtn').onclick = () => {
    const io = gba.bus.io16, h = v => v.toString(16).toUpperCase().padStart(4, '0');
    const regs = [['DISPCNT', 0x00], ['BG0CNT', 0x08], ['BG1CNT', 0x0A], ['BG2CNT', 0x0C], ['BG3CNT', 0x0E],
      ['WIN0H', 0x40], ['WIN1H', 0x42], ['WIN0V', 0x44], ['WIN1V', 0x46], ['WININ', 0x48], ['WINOUT', 0x4A],
      ['MOSAIC', 0x4C], ['BLDCNT', 0x50], ['BLDALPHA', 0x52], ['BLDY', 0x54]];
    const objs = [];
    for (let i = 0; i < 128 && objs.length < 24; i++) {
      const a0 = gba.bus.oam16[i * 4], a1 = gba.bus.oam16[i * 4 + 1], a2 = gba.bus.oam16[i * 4 + 2];
      if (!(a0 & 0x100) && (a0 & 0x200)) continue;
      objs.push(i + ':' + h(a0) + ',' + h(a1) + ',' + h(a2));
    }
    const txt = 'BA v3 ' + (gba.cart.code || '') + ' ' + (gba.cart.title || '') + ' save=' + gba.cart.saveType + '\n' +
      regs.map(([n, o]) => n + '=' + h(io[o >>> 1])).join(' ') + '\nOBJ ' + objs.join(' ');
    const ta = $('diagText');
    ta.value = txt; ta.hidden = false;
    const done = () => toast('Diagnóstico copiado; pégalo en el chat');
    try {
      navigator.clipboard.writeText(txt).then(done, () => { ta.select(); toast('Selecciona el texto y cópialo'); });
    } catch (e) { ta.select(); toast('Selecciona el texto y cópialo'); }
  };

  // ---------- turbo ----------
  const TURBO_STEPS = [1, 2, 4];
  function setTurbo(v) {
    turbo = v;
    $('turboBtn').textContent = '» ×' + v;
    $('turboBtn').setAttribute('aria-pressed', v > 1 ? 'true' : 'false');
  }
  $('turboBtn').onclick = () => {
    if (S.turboMode === 'hold') return;
    setTurbo(TURBO_STEPS[(TURBO_STEPS.indexOf(turbo) + 1) % TURBO_STEPS.length]);
  };
  $('turboBtn').addEventListener('pointerdown', e => {
    if (S.turboMode !== 'hold') return;
    e.preventDefault();
    try { $('turboBtn').setPointerCapture(e.pointerId); } catch (err) {}
    setTurbo(4);
  });
  for (const ev of ['pointerup', 'pointercancel']) $('turboBtn').addEventListener(ev, () => { if (S.turboMode === 'hold') setTurbo(1); });

  // ---------- pause / resume ----------
  let resumeFromAuto = false;
  function showResume(title, text, primary, alt) {
    $('resumeTitle').textContent = title;
    $('resumeText').textContent = text;
    $('resumeBtn').textContent = primary || 'Continuar';
    $('resumeAltBtn').hidden = !alt;
    if (alt) $('resumeAltBtn').textContent = alt;
    resumeFromAuto = !!alt;
    $('resumeOverlay').hidden = false;
  }
  // after a cartridge is inserted: offer to pick up from the autosave when there is one
  async function offerResume(title, startNow) {
    await Promise.race([cloudMetasReady, new Promise(r => setTimeout(r, 3000))]);
    const meta = await bestMeta('auto');
    if (meta) {
      showResume(title, 'Último autoguardado: ' + fmtTime(meta.t) + (meta.where === 'cloud' ? ' (en tu cuenta)' : ''), 'Seguir donde lo dejé', 'Empezar desde el título');
    } else if (startNow) {
      resume();
    } else {
      showResume(title, 'Tu cartucho sigue puesto. Toca para jugar.');
    }
  }
  function pause() { running = false; }
  // hooks used by the Android app: leaving the app, and the system back button
  window.__appPause = () => {
    flushSave(); autoSave('hide');
    if (running) { pause(); showResume('Pausa', 'Toca para seguir jugando.'); }
    try { if (Audio.ctx && Audio.ctx.state === 'running') Audio.ctx.suspend(); } catch (e) {}
  };
  window.__back = () => {
    if (!$('askBack').hidden) return true;
    if (!$('volPop').hidden) { $('volPop').hidden = true; return true; }
    if (!$('sheetBack').hidden) { closeMenu(); return true; }
    return false;
  };
  let wakeLock = null;
  function resume() {
    if (!gba.loaded) return;
    $('resumeOverlay').hidden = true;
    running = true;
    lastTime = performance.now();
    acc = 0;
    try { navigator.wakeLock && navigator.wakeLock.request('screen').then(l => { wakeLock = l; }).catch(() => {}); } catch (e) {}
  }
  $('resumeBtn').onclick = async () => {
    Audio.start();
    if (resumeFromAuto) { resumeFromAuto = false; await loadState('auto'); }
    resume();
  };
  $('resumeAltBtn').onclick = () => { Audio.start(); checkPersist(true); resumeFromAuto = false; resume(); };

  // ---------- input: touch ----------
  const pointers = new Map();
  const stick = $('stick'), knob = $('knob');
  const notches = Array.from(stick.querySelectorAll('.notch'));
  const buttons = Array.from(document.querySelectorAll('[data-key]'));
  // 4 directions only: sector 0 = right, then down, left, up (screen y grows downwards)
  const SECTOR_MASK = [16, 128, 32, 64];
  let stickId = null, stickSector = -1;
  // dead zone (fraction of travel) to start / keep a direction, and extra degrees needed to switch direction
  const STICK_SENS = { low: { on: 0.45, off: 0.35, margin: 14 }, normal: { on: 0.32, off: 0.24, margin: 10 }, high: { on: 0.2, off: 0.14, margin: 6 } };

  function inStickZone(x, y) {
    const r = stick.getBoundingClientRect(), pad = 30;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }
  function setKnob(dx, dy) { knob.style.transform = `translate(${dx}px, ${dy}px)`; }
  function stickMask(x, y) {
    const r = stick.getBoundingClientRect();
    const R = r.width * 0.31;
    let dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > R) { dx *= R / dist; dy *= R / dist; }
    setKnob(dx, dy);
    // dead zone with hysteresis so the direction doesn't flicker near the centre
    const sens = STICK_SENS[S.sens] || STICK_SENS.normal;
    const dead = R * (stickSector < 0 ? sens.on : sens.off);
    if (dist < dead) { stickSector = -1; return 0; }
    const ang = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    let sector = Math.round(ang / 90) % 4;
    if (stickSector >= 0 && sector !== stickSector) {
      let diff = Math.abs(ang - stickSector * 90) % 360;
      if (diff > 180) diff = 360 - diff;
      if (diff < 45 + sens.margin) sector = stickSector;
    }
    stickSector = sector;
    return SECTOR_MASK[sector];
  }
  function releaseStick() {
    stickId = null; stickSector = -1;
    stick.classList.remove('dragging');
    applyKeys();
  }
  function buttonAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const b = el && el.closest && el.closest('[data-key]');
    return b ? +b.dataset.key : 0;
  }
  function updateTouch() {
    let m = 0;
    for (const v of pointers.values()) m |= v;
    if (m !== keysTouch) {
      const added = m & ~keysTouch;
      if (added && S.vibe === 'on' && navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
      keysTouch = m;
      applyKeys();
    }
  }
  function applyKeys() {
    const m = keysTouch | keysKbd;
    gba.setKeys(m);
    for (const b of buttons) { const k = +b.dataset.key; b.classList.toggle('pressed', (m & k) === k); }
    const dirs = m & 0xF0;
    const sector = SECTOR_MASK.indexOf(dirs);
    notches.forEach((n, i) => n.classList.toggle('on', i === sector));
    stick.classList.toggle('active', dirs !== 0);
    if (stickId === null) {
      // keyboard or released: show the knob leaning the way it points, or centred
      if (sector >= 0) {
        const R = stick.getBoundingClientRect().width * 0.31 * 0.8, a = sector * Math.PI / 2;
        setKnob(Math.cos(a) * R, Math.sin(a) * R);
      } else setKnob(0, 0);
    }
  }
  const controlZone = $('app');
  let rewindPointer = null;
  function startRewind() {
    if (!gba.loaded || !running) return;
    if (S.rewind !== 'on') { toast('El rebobinado está desactivado en el menú'); return; }
    if (!snaps.length) { toast('Aún no hay nada que rebobinar'); return; }
    rewinding = true; $('rewindBtn').classList.add('pressed');
  }
  function stopRewind() {
    if (!rewinding) return;
    rewinding = false; $('rewindBtn').classList.remove('pressed');
    gba.apu.readPos = gba.apu.writePos;
    acc = 0;
  }
  function setAutoA(on) {
    autoA = on; setPref('autoA', on ? 'on' : 'off');
    $('autoBtn').setAttribute('aria-pressed', on ? 'true' : 'false');
    toast(on ? 'A rápido activado: mantén A' : 'A rápido desactivado');
  }
  $('autoBtn').setAttribute('aria-pressed', autoA ? 'true' : 'false');
  controlZone.addEventListener('pointerdown', e => {
    if (e.target.closest('.bar') || e.target.closest('.bezel')) return;
    Audio.start();
    e.preventDefault();
    if (e.target.closest('#rewindBtn')) {
      rewindPointer = e.pointerId;
      startRewind();
      try { controlZone.setPointerCapture(e.pointerId); } catch (err) {}
      return;
    }
    if (e.target.closest('#autoBtn')) { setAutoA(!autoA); return; }
    if (stickId === null && inStickZone(e.clientX, e.clientY)) {
      stickId = e.pointerId;
      stick.classList.add('dragging');
      pointers.set(e.pointerId, stickMask(e.clientX, e.clientY));
    } else {
      pointers.set(e.pointerId, buttonAt(e.clientX, e.clientY));
    }
    try { controlZone.setPointerCapture(e.pointerId); } catch (err) {}
    updateTouch();
  });
  controlZone.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    const last = evs.length ? evs[evs.length - 1] : e;
    pointers.set(e.pointerId, e.pointerId === stickId ? stickMask(last.clientX, last.clientY) : buttonAt(last.clientX, last.clientY));
    updateTouch();
  });
  const up = e => {
    if (e.pointerId === rewindPointer) { rewindPointer = null; stopRewind(); return; }
    if (!pointers.delete(e.pointerId)) return;
    if (e.pointerId === stickId) releaseStick();
    updateTouch();
  };
  controlZone.addEventListener('pointerup', up);
  controlZone.addEventListener('pointercancel', up);
  controlZone.addEventListener('contextmenu', e => e.preventDefault());

  // ---------- input: keyboard ----------
  const KEYMAP = {
    ArrowRight: 16, ArrowLeft: 32, ArrowUp: 64, ArrowDown: 128,
    KeyX: 1, KeyZ: 2, ShiftLeft: 4, ShiftRight: 4, Enter: 8, KeyA: 512, KeyS: 256,
  };
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'Space') { setTurbo(4); e.preventDefault(); return; }
    if (e.code === 'Backspace') { if (!e.repeat) startRewind(); e.preventDefault(); return; }
    const k = KEYMAP[e.code];
    if (k) { keysKbd |= k; applyKeys(); e.preventDefault(); Audio.start(); }
  });
  window.addEventListener('keyup', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'Space') { setTurbo(1); return; }
    if (e.code === 'Backspace') { stopRewind(); return; }
    const k = KEYMAP[e.code];
    if (k) { keysKbd &= ~k; applyKeys(); }
  });

  // ---------- main loop ----------
  const FRAME_MS = 1000 / FRAME_RATE;
  let lastTime = performance.now(), acc = 0;
  let frameNo = 0, rewindTick = 0;
  let fpsT0 = performance.now(), fpsEmu = 0, fpsDrawn = 0;
  function redraw() {
    image.data.set(frameBytes);
    ctx2d.putImageData(image, 0, 0);
    fpsDrawn++;
  }
  function updateFps(now) {
    if (now - fpsT0 < 1000) return;
    const secs = (now - fpsT0) / 1000;
    const emu = fpsEmu / secs, drawn = fpsDrawn / secs;
    fpsT0 = now; fpsEmu = 0; fpsDrawn = 0;
    if (S.fps !== 'on') return;
    const el = $('fps');
    if (!running) { el.textContent = 'pausa'; return; }
    let t = Math.round(emu) + ' fps · ' + Math.round(emu / FRAME_RATE * 100) + ' %';
    if (drawn < emu - 3) t += ' · dibuja ' + Math.round(drawn);
    el.textContent = t;
  }
  function tick(now) {
    requestAnimationFrame(tick);
    updateFps(now);
    if (!running) { lastTime = now; return; }
    let dt = now - lastTime;
    lastTime = now;
    if (dt > 100) dt = 100;
    if (rewinding) {
      // step back one snapshot (1/3 s of play) every 6 screen refreshes: about 3x faster than it was played
      if (++rewindTick % 6 === 0) {
        const st = snaps.pop();
        if (!st) { stopRewind(); toast('No se puede rebobinar más'); return; }
        gba.setState(st);
        gba.ppu.skipRender = false;
        gba.runFrame();
        gba.apu.readPos = gba.apu.writePos;
        redraw();
      }
      return;
    }
    acc += dt * turbo;
    let frames = Math.floor(acc / FRAME_MS);
    acc -= frames * FRAME_MS;
    // safety net for the audio buffer (fine adjustment happens in the audio callback)
    if (turbo === 1 && Audio.ctx) {
      const buffered = gba.apu.available();
      if (buffered > 7000 && frames > 0) frames--;
      else if (buffered < 700 && frames < 2) frames++;
    }
    const maxFrames = turbo > 1 ? 10 : 4;
    if (frames > maxFrames) frames = maxFrames;
    if (frames <= 0) return;
    const held = keysTouch | keysKbd;
    for (let i = 0; i < frames; i++) {
      frameNo++;
      if (autoA && (held & 1)) gba.setKeys((frameNo & 2) ? held & ~1 : held);
      // frame skip: when several frames run in one tick (slow phone or fast-forward), only draw the last one
      gba.ppu.skipRender = S.skip === 'auto' && i < frames - 1;
      gba.runFrame();
      fpsEmu++;
      if (S.rewind === 'on' && ++snapCounter >= 20) {
        snapCounter = 0;
        snaps.push(gba.getState(true));
        if (snaps.length > 45) snaps.shift();
      }
    }
    gba.ppu.skipRender = false;
    if (autoA && (held & 1)) gba.setKeys(held);
    autoFrames += frames;
    if (S.autosave !== 'off' && autoFrames >= +S.autosave * 60 * FRAME_RATE) autoSave('timer');
    if (turbo > 1) gba.apu.readPos = (gba.apu.writePos - 2048 + RING_SIZE) % RING_SIZE;
    redraw();
  }
  requestAnimationFrame(tick);

  // ---------- screenshot ----------
  $('shotBtn').onclick = async () => {
    if (!gba.loaded) { toast('Primero carga un juego'); return; }
    const downloads = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (!downloads) { toast('Las capturas no están disponibles en esta vista'); return; }
    const c = document.createElement('canvas'); c.width = 720; c.height = 480;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(canvas, 0, 0, 720, 480);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const base = (gba.cart.title || 'captura').replace(/[^A-Za-z0-9 _-]/g, '').trim() || 'captura';
    const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/:/g, '-');
    try { await downloads.save({ filename: `${base} ${stamp}.png`, data: blob }); toast(savedMsg('Captura guardada')); }
    catch (e) { if (e && e.code !== 'declined') toast('No se pudo guardar la captura (' + (e.code || 'error') + ')'); }
  };

  // ---------- settings (screen + controls) ----------
  const SETTINGS = [
    { box: 'setScreen', key: 'filter', label: 'Filtro', opts: [['sharp', 'Nítido'], ['smooth', 'Suave'], ['lcd', 'Rejilla LCD']] },
    { box: 'setScreen', key: 'colors', label: 'Colores', opts: [['raw', 'Vivos'], ['gba', 'Suaves (LCD)']] },
    { box: 'setScreen', key: 'fps', label: 'Contador de FPS', opts: [['off', 'No'], ['on', 'Sí']] },
    { box: 'setScreen', key: 'skip', label: 'Saltar fotogramas si va lento', opts: [['auto', 'Automático'], ['never', 'Nunca']] },
    { box: 'setControls', key: 'ctl', label: 'Tamaño de los botones', opts: [['0.85', 'Pequeño'], ['1', 'Normal'], ['1.12', 'Grande']] },
    { box: 'setControls', key: 'sens', label: 'Sensibilidad del joystick', opts: [['low', 'Baja'], ['normal', 'Normal'], ['high', 'Alta']] },
    { box: 'setControls', key: 'vibe', label: 'Vibración', opts: [['on', 'Sí'], ['off', 'No']] },
    { box: 'setControls', key: 'turboMode', label: 'Botón »', opts: [['toggle', 'Toca para cambiar'], ['hold', 'Mantén pulsado']] },
    { box: 'setControls', key: 'rewind', label: 'Rebobinado', opts: [['on', 'Activado'], ['off', 'Desactivado']] },
    { box: 'setSave', key: 'autosave', label: 'Autoguardado', opts: [['1', '1 min'], ['3', '3 min'], ['5', '5 min'], ['off', 'No']] },
  ];
  const PREF_NAME = { filter: 'filter', colors: 'colors', fps: 'fps', skip: 'skip', ctl: 'ctl', sens: 'sens', vibe: 'vibe', turboMode: 'turboMode', rewind: 'rewind', autosave: 'autosave' };
  function applySetting(key) {
    const v = S[key];
    switch (key) {
      case 'filter':
        canvas.classList.toggle('smooth', v === 'smooth');
        $('lcdGrid').hidden = v !== 'lcd';
        break;
      case 'colors': gba.ppu.setColorCorrection(v === 'gba'); break;
      case 'fps': $('fps').hidden = v !== 'on'; break;
      case 'ctl': document.documentElement.style.setProperty('--ctl', v); break;
      case 'turboMode': setTurbo(1); break;
      case 'rewind': if (v !== 'on') snaps.length = 0; $('rewindWrap').hidden = v !== 'on'; break;
      case 'autosave': if (!$('sheetBack').hidden) renderSlots(); break;
    }
  }
  function renderSettings() {
    for (const st of SETTINGS) {
      let row = document.getElementById('set-' + st.key);
      if (!row) {
        row = document.createElement('div'); row.className = 'seg-row'; row.id = 'set-' + st.key;
        const lab = document.createElement('span'); lab.textContent = st.label;
        const seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', st.label);
        for (const [val, txt] of st.opts) {
          const b = document.createElement('button'); b.textContent = txt; b.dataset.val = val;
          b.onclick = () => { S[st.key] = val; setPref(PREF_NAME[st.key], val); applySetting(st.key); renderSettings(); };
          seg.appendChild(b);
        }
        row.append(lab, seg);
        $(st.box).appendChild(row);
      }
      for (const b of row.querySelectorAll('button')) b.setAttribute('aria-pressed', b.dataset.val === S[st.key] ? 'true' : 'false');
    }
  }
  renderSettings();
  for (const st of SETTINGS) applySetting(st.key);
  // keep the LCD grid aligned with the game's pixels
  const syncGrid = () => document.documentElement.style.setProperty('--px', (canvas.clientWidth / 240) + 'px');
  try { new ResizeObserver(syncGrid).observe(canvas); } catch (e) { window.addEventListener('resize', syncGrid); }
  syncGrid();

  // ---------- boot ----------
  (async () => {
    const ok = await DB.open();
    if (!ok) { $('storageNote').textContent = 'Este navegador no deja guardar datos aquí (¿modo incógnito?). Tu partida solo se conservará con la copia en tu cuenta o exportando el archivo.'; }
    await renderSlots();
    const last = ok ? await DB.get('lastRom') : null;
    if (last && last.data) {
      try {
        const title = await loadRomBytes(new Uint8Array(last.data), last.name, false);
        gba.runFrame();
        redraw();
        await offerResume(title, false);
      } catch (e) { /* show empty state */ }
    }
  })();
})();
