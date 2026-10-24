"""End-to-end test of the app on an Android device or emulator, over adb.

Two passes:
  full    on the DEBUG build of the same commit: real taps and swipes (adb input), the system file picker,
          back/home buttons and a killed process; the page state is read through the WebView DevTools socket,
          which only debug builds open. The WebView's contents are not in the accessibility tree, so this is
          the only way to read them from outside.
  release on the universal APK built from the Play bundle (.aab): install, open, page drawn, back, no
          DevTools socket, no crash. It cannot read the page, so it checks the screen instead.

Usage: python3 device_test.py <debug.apk> <release-universal.apk> <roms dir> <expected sram .sav> <out dir>
  roms dir: BGMode7.gba (reacts to the d-pad and A), SoundPCMStereo.gba (plays PCM), sram.gba (jsmolka).
Writes results.json, screenshots, picker dumps and logcat to <out dir>. Exit code 0 only if every check passes.
"""
import io, json, os, re, subprocess, sys, threading, time, urllib.request, zipfile
import xml.etree.ElementTree as ET
import websocket  # websocket-client
from PIL import Image

DEBUG_APK, RELEASE_APK, ROMS, EXPECTED_SAV, OUT = sys.argv[1:6]
PKG = 'com.bolsillo.advance'
os.makedirs(OUT, exist_ok=True)
results, step = [], [0]


def adb(*a, binary=False, check=True, timeout=180):
    r = subprocess.run(['adb', *a], capture_output=True, timeout=timeout)
    if check and r.returncode:
        raise RuntimeError('adb %s: %s' % (' '.join(a), r.stderr.decode(errors='replace').strip()))
    return r.stdout if binary else r.stdout.decode(errors='replace')


def sh(cmd, **k):
    return adb('shell', cmd, **k)


def check(name, ok, detail=''):
    results.append({'name': name, 'ok': bool(ok), 'detail': str(detail)[:300]})
    print(('OK  ' if ok else 'FAIL') + ' [Android] ' + name + (' — ' + str(detail)[:300] if detail != '' else ''), flush=True)
    return ok


def shot(name):
    step[0] += 1
    png = adb('exec-out', 'screencap -p', binary=True)
    open(os.path.join(OUT, '%02d-%s.png' % (step[0], name)), 'wb').write(png)
    return Image.open(io.BytesIO(png)).convert('RGB')


def until(fn, timeout=20, every=0.5):
    end = time.time() + timeout
    while True:
        try:
            v = fn()
            if v:
                return v
        except Exception:
            pass
        if time.time() > end:
            return None
        time.sleep(every)


# ---------------- native UI (system picker, launcher) through uiautomator ----------------
def dump(name=None):
    out = sh('uiautomator dump /sdcard/ui.xml', check=False)
    if 'dumped' not in out:
        return []
    xml = adb('exec-out', 'cat /sdcard/ui.xml')
    if name:
        open(os.path.join(OUT, 'ui-%s.xml' % name), 'w').write(xml)
    nodes = []
    for n in ET.fromstring(xml).iter('node'):
        b = [int(v) for v in re.findall(r'\d+', n.get('bounds', '[0,0][0,0]'))]
        nodes.append({'text': n.get('text', ''), 'desc': n.get('content-desc', ''), 'pkg': n.get('package', ''),
                      'cls': n.get('class', ''), 'bounds': b})
    return nodes


def find(nodes, pattern):
    rx = re.compile(pattern, re.I)
    return [n for n in nodes if rx.search(n['text']) or rx.search(n['desc'])]


def tap_xy(x, y):
    sh('input tap %d %d' % (x, y))


def tap_node(n):
    x1, y1, x2, y2 = n['bounds']
    tap_xy((x1 + x2) // 2, (y1 + y2) // 2)


def pick_file(filename):
    """Picks /sdcard/Download/<filename> in the system picker the app opens (DocumentsUI)."""
    target = '^' + re.escape(filename) + '$'
    nodes = until(lambda: [n for n in [dump()] if find(n, target + '|Downloads|Descargas|Recent|Show roots|Elige un archivo')], 25)
    nodes = nodes[0] if nodes else dump('picker-missing')
    if not find(nodes, target):
        roots = find(nodes, 'Show roots|Mostrar raíces')
        if roots:
            tap_node(roots[0]); time.sleep(1.5); nodes = dump()
        dl = find(nodes, '^(Downloads|Descargas)$')
        if dl:
            tap_node(dl[0]); time.sleep(2)
    hit = until(lambda: find(dump(), target), 15)
    if not hit:
        dump('picker-' + filename)
        print('   picker shows:', [n['text'] or n['desc'] for n in dump() if n['text'] or n['desc']][:30], flush=True)
        return False
    tap_node(hit[0])
    return True


def resumed_package():
    out = sh('dumpsys activity activities')
    m = re.search(r'(?:topResumedActivity|mResumedActivity)[^\n]*?\s([\w.]+)/', out)
    return m.group(1) if m else ''


def launch():
    sh('am start -W -n %s/.MainActivity' % PKG)


# ---------------- the page, through the WebView DevTools socket (debug builds only) ----------------
class Page:
    def __init__(self):
        pid = until(lambda: sh('pidof %s' % PKG, check=False).strip().split()[0], 20)
        sock = until(lambda: ('webview_devtools_remote_%s' % pid) in sh('cat /proc/net/unix', check=False), 20)
        if not sock:
            raise RuntimeError('no DevTools socket for pid %s' % pid)
        adb('forward', '--remove-all', check=False)
        adb('forward', 'tcp:9222', 'localabstract:webview_devtools_remote_%s' % pid)
        page = until(lambda: [t for t in json.load(urllib.request.urlopen('http://127.0.0.1:9222/json', timeout=5))
                              if t.get('url', '').startswith('https://app.bolsillo.local')], 20)
        self.ws = websocket.create_connection(page[0]['webSocketDebuggerUrl'], suppress_origin=True, timeout=30)
        self.n = 0
        self.origin = None  # WebView position on screen (system bars hidden, cutout padding)

    def eval(self, expr):
        self.n += 1
        self.ws.send(json.dumps({'id': self.n, 'method': 'Runtime.evaluate',
                                 'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get('id') == self.n:
                r = m.get('result', {})
                if 'exceptionDetails' in r:
                    raise RuntimeError(r['exceptionDetails'].get('text', 'JS error') + ' in ' + expr[:80])
                return r.get('result', {}).get('value')

    def diag(self):
        return self.eval('window.__diag && window.__diag()') or {}

    def visible(self, sel):
        return self.eval('(e => !!e && !e.closest("[hidden]") && e.getClientRects().length > 0)(document.querySelector(%s))' % json.dumps(sel))

    def xy(self, sel):
        """Screen coordinates (px) of the centre of an element: WebView origin + CSS rect * devicePixelRatio."""
        r = self.eval('(e => { e.scrollIntoView({block: "center"}); const r = e.getBoundingClientRect();'
                      ' return [r.left + r.width / 2, r.top + r.height / 2, devicePixelRatio]; })(document.querySelector(%s))' % json.dumps(sel))
        if self.origin is None:
            wv = [n for n in dump() if n['cls'] == 'android.webkit.WebView' and n['pkg'] == PKG]
            self.origin = (wv[0]['bounds'][0], wv[0]['bounds'][1]) if wv else (0, 0)
        ox, oy = self.origin
        return int(ox + r[0] * r[2]), int(oy + r[1] * r[2]), r[2]

    def tap(self, sel):
        x, y, _ = self.xy(sel)
        tap_xy(x, y)


def hold_and_watch(page, cmd, ms, key_mask):
    """Runs a long touch (adb input swipe) and polls the emulated key register while it lasts."""
    seen = []
    t = threading.Thread(target=lambda: sh(cmd))
    t.start()
    end = time.time() + ms / 1000
    while time.time() < end:
        try:
            seen.append(page.diag().get('keys', 0))
        except Exception:
            pass
        time.sleep(0.1)
    t.join()
    return any(k & key_mask for k in seen), seen


def exports():
    return set(f.strip() for f in sh('ls "/sdcard/Download/Bolsillo Advance/"', check=False).split('\n') if f.strip())


def export_save(page, label):
    """Taps Menú -> Exportar partida and pulls the new .zip from Downloads; returns the .sav bytes."""
    before = exports()
    page.tap('#menuBtn'); time.sleep(1)
    page.tap('#exportBtn')
    new = until(lambda: sorted(exports() - before), 15)
    sh('input keyevent KEYCODE_BACK'); time.sleep(1)
    if not new:
        return None, None
    local = os.path.join(OUT, 'export-%s.zip' % label)
    adb('pull', '/sdcard/Download/Bolsillo Advance/' + new[-1], local)
    with zipfile.ZipFile(local) as z:
        sav = [n for n in z.namelist() if n.endswith('.sav')]
        return new[-1], (z.read(sav[0]) if sav else None)


def load_rom(page, filename, from_menu):
    name_js = 'document.getElementById("gameName").textContent'
    before = page.eval(name_js)
    if from_menu:
        page.tap('#menuBtn'); time.sleep(1)
        page.tap('.sheet label[for="romInput"]')
    else:
        page.tap('#emptyOverlay label[for="romInput"]')
    ok = pick_file(filename)
    # the bar shows the cartridge title, or the file name when the header has none
    loaded = until(lambda: page.diag().get('loaded') and page.eval(name_js) != before and page.eval(name_js), 20)
    # first insert: either it starts straight away or the overlay offers to start
    if until(lambda: page.visible('#resumeBtn'), 3):
        page.tap('#resumeBtn')
    until(lambda: page.diag().get('running'), 10)
    return ok, loaded


def full_pass():
    adb('install', '-r', '-g', DEBUG_APK, timeout=300)
    sh('pm clear %s' % PKG)
    for f in ('BGMode7.gba', 'SoundPCMStereo.gba', 'sram.gba'):
        adb('push', os.path.join(ROMS, f), '/sdcard/Download/' + f)
    sh('rm -rf "/sdcard/Download/Bolsillo Advance"', check=False)
    sh('logcat -c')

    # 1. opening
    launch()
    check('[completa] la app abre en primer plano', until(lambda: resumed_package() == PKG, 15), resumed_package())
    page = Page()
    check('[completa] la página carga: pantalla "Inserta un cartucho"', until(lambda: page.visible('#emptyOverlay'), 30))
    shot('inicio')

    # 2. importing a game through the system picker
    ok, loaded = load_rom(page, 'BGMode7.gba', from_menu=False)
    check('[completa] importar juego con el selector del sistema (BGMode7.gba)', ok and loaded, page.diag())
    time.sleep(3)
    shot('juego')

    # 3. controls: still screen while idle; joystick right and A change the game (real touches)
    h0 = page.diag().get('frameHash'); time.sleep(1.5); h1 = page.diag().get('frameHash')
    check('[completa] sin tocar nada la imagen no cambia', h0 == h1, '%s %s' % (h0, h1))
    x, y, dpr = page.xy('#stick')
    right, seen = hold_and_watch(page, 'input swipe %d %d %d %d 1500' % (x, y, x + int(60 * dpr), y), 1500, 16)
    h2 = page.diag().get('frameHash')
    check('[completa] joystick a la derecha: llega la tecla DERECHA al juego', right, sorted(set(seen)))
    check('[completa] joystick a la derecha: el juego responde', h2 != h1)
    shot('tras-derecha')
    ax, ay, _ = page.xy('.ab .a')
    a_pressed, seen = hold_and_watch(page, 'input swipe %d %d %d %d 1200' % (ax, ay, ax, ay), 1200, 1)
    h3 = page.diag().get('frameHash')
    check('[completa] botón A: llega la tecla A al juego', a_pressed, sorted(set(seen)))
    check('[completa] botón A: el juego responde', h3 != h2)

    # 4. back button: closes the menu first, then the app goes to the background
    page.tap('#menuBtn')
    check('[completa] el menú se abre', until(lambda: page.visible('#sheetBack'), 5))
    sh('input keyevent KEYCODE_BACK')
    check('[completa] atrás cierra el menú y la app sigue delante', until(lambda: not page.visible('#sheetBack'), 5) and resumed_package() == PKG)

    # 5. notices inside the app
    page.tap('#menuBtn'); time.sleep(1)
    page.tap('.notices summary'); time.sleep(1)
    txt = page.eval('document.getElementById("noticesText").textContent') or ''
    check('[completa] "Licencias y avisos" se abre en el menú', page.visible('#noticesText'))
    check('[completa] avisos: MPL-2.0, Jeffrey Pfau, archivos mpl/ y URL con commit',
          'Mozilla Public License Version 2.0' in txt and 'Jeffrey Pfau' in txt and 'mpl/gpio-rtc.js' in txt
          and re.search(r'https://github\.com/\S+/tree/[0-9a-f]{40}/bolsillo-advance', txt), re.findall(r'https://github\.com/\S+', txt)[:1])
    check('[completa] los Covered Files se cargaron como archivos aparte',
          page.eval('[...document.scripts].map(s => s.getAttribute("src")).filter(Boolean).join(",")') == 'mpl/gpio-rtc.js,mpl/bios-hle.js')
    shot('avisos')
    sh('input keyevent KEYCODE_BACK'); time.sleep(1)

    # 6. sound
    ok, loaded = load_rom(page, 'SoundPCMStereo.gba', from_menu=True)
    check('[completa] importar SoundPCMStereo.gba', ok and loaded)
    peak = until(lambda: (lambda d: d.get('audio') and d['audio']['state'] == 'running' and d['audio']['peak'] > 0.02 and d['audio'])(page.diag()), 15)
    check('[completa] sonido: AudioContext en marcha y señal no nula a la salida', peak, peak or page.diag().get('audio'))
    audio = sh('dumpsys audio')
    open(os.path.join(OUT, 'dumpsys-audio.txt'), 'w').write(audio)
    uid = (re.search(r'uid:(\d+)', sh('cmd package list packages -U %s' % PKG)) or [None, '?'])[1]
    started = [l.strip() for l in audio.split('\n') if 'AudioPlaybackConfiguration' in l and 'state:started' in l]
    check('[completa] sonido: Android registra un reproductor activo de la app', any('/%s/' % uid in l or ' u/pid:%s/' % uid in l for l in started), (started or ['ninguno'])[:2])

    # 7. game saves: jsmolka's sram test writes SRAM; export it and compare with the expected bytes
    expected = open(EXPECTED_SAV, 'rb').read()
    ok, loaded = load_rom(page, 'sram.gba', from_menu=True)
    check('[completa] importar sram.gba (tipo de guardado SRAM)', ok and loaded and page.diag().get('saveType') == 'sram', page.diag().get('saveType'))
    time.sleep(4)
    name, sav = export_save(page, 'antes')
    check('[completa] exportar partida deja un .zip en Descargas/Bolsillo Advance', name, name)
    check('[completa] la partida exportada es idéntica a la que escribe el juego', sav == expected, '%d bytes' % len(sav or b''))
    pre = page.diag().get('frameHash')
    shot('antes-de-cerrar')

    # 8. recovery: leave with HOME, kill the process, open again
    sh('input keyevent KEYCODE_HOME')
    check('[completa] al salir, la app pasa a segundo plano', until(lambda: resumed_package() != PKG, 8), resumed_package())
    time.sleep(3)
    sh('am force-stop %s' % PKG)
    check('[completa] proceso cerrado', until(lambda: not sh('pidof %s' % PKG, check=False).strip(), 10))
    launch()
    page = Page()
    offered = until(lambda: page.visible('#resumeBtn') and page.eval('document.getElementById("resumeBtn").textContent'), 30)
    check('[completa] al reabrir, ofrece seguir la partida', offered, offered)
    check('[completa] al reabrir, el juego sigue cargado', page.diag().get('loaded') and page.diag().get('saveType') == 'sram')
    if offered:
        page.tap('#resumeBtn')
    until(lambda: page.diag().get('running'), 10)
    time.sleep(2)
    post = page.diag().get('frameHash')
    check('[completa] continúa en la misma pantalla que al cerrar', post == pre, '%s %s' % (pre, post))
    shot('reabierta')
    name, sav2 = export_save(page, 'despues')
    check('[completa] la partida del juego se conserva tras cerrar la app', sav2 == expected, name)
    page.ws.close()

    log = adb('logcat', '-d')
    open(os.path.join(OUT, 'logcat-completa.txt'), 'w').write(log)
    crashes = [l for l in log.split('\n') if 'FATAL EXCEPTION' in l or ('AndroidRuntime' in l and 'E ' in l)]
    check('[completa] sin cierres inesperados (logcat)', not crashes, crashes[:2])


def release_pass():
    adb('uninstall', PKG, check=False)
    adb('install', '-g', RELEASE_APK, timeout=300)
    sh('logcat -c')
    pkg = sh('dumpsys package %s' % PKG)
    tgt = (re.search(r'targetSdk=(\d+)', pkg) or [None, '?'])[1]
    check('[release] APK del bundle instalado con targetSdk 36', tgt == '36', tgt)
    check('[release] no es depurable', 'DEBUGGABLE' not in (re.search(r'pkgFlags=\[([^\]]*)\]', pkg) or [None, ''])[1])
    launch()
    check('[release] la app abre en primer plano', until(lambda: resumed_package() == PKG, 15), resumed_package())
    time.sleep(10)
    img = shot('release-inicio')
    lcd = sum(1 for p in img.resize((108, 240)).getdata() if abs(p[0] - 143) < 12 and abs(p[1] - 154) < 12 and abs(p[2] - 122) < 12)
    check('[release] la página se dibuja (pantalla LCD de "Inserta un cartucho" visible)', lcd > 200, '%d px' % lcd)
    pid = sh('pidof %s' % PKG, check=False).strip()
    check('[release] sin socket de DevTools (no inspeccionable)', pid and ('webview_devtools_remote_%s' % pid) not in sh('cat /proc/net/unix', check=False))
    sh('input keyevent KEYCODE_BACK')
    check('[release] atrás sin menús abiertos: la app pasa a segundo plano', until(lambda: resumed_package() != PKG, 8), resumed_package())
    log = adb('logcat', '-d')
    open(os.path.join(OUT, 'logcat-release.txt'), 'w').write(log)
    check('[release] sin cierres inesperados (logcat)', 'FATAL EXCEPTION' not in log)


try:
    info = sh('getprop ro.build.version.sdk').strip() + ' / ' + sh('getprop ro.product.model').strip()
    check('dispositivo', True, 'API ' + info)
    for name, fn in (('completa', full_pass), ('release', release_pass)):
        try:
            fn()
        except Exception as e:
            check('[%s] la prueba terminó sin errores del arnés' % name, False, repr(e))
            try:
                shot('error-' + name); dump('error-' + name)
            except Exception:
                pass
finally:
    json.dump({'results': results}, open(os.path.join(OUT, 'results.json'), 'w'), indent=1, ensure_ascii=False)
fails = sum(1 for r in results if not r['ok'])
print('\n%d/%d comprobaciones en Android correctas' % (len(results) - fails, len(results)))
sys.exit(1 if fails else 0)
