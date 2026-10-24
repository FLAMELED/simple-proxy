"""End-to-end test of the installed app on an Android device or emulator, driven over adb.

It uses only what a person would use: taps, the system file picker, the back button, the home button and
killing the process. The release build cannot be inspected from outside, so the page is read through the
accessibility tree (uiautomator) and through screenshots.

Usage: python3 device_test.py <universal.apk> <roms dir> <expected sram .sav> <out dir>
  roms dir must hold BGMode7.gba (reacts to the d-pad and A), SoundPCMStereo.gba (plays PCM) and sram.gba (jsmolka).
Exit code 0 only if every check passes; results.json and screenshots/dumps/logcat land in <out dir>.
"""
import io, json, os, re, subprocess, sys, time, zipfile
import xml.etree.ElementTree as ET
from PIL import Image, ImageChops

APK, ROMS, EXPECTED_SAV, OUT = sys.argv[1:5]
PKG = 'com.bolsillo.advance'
os.makedirs(OUT, exist_ok=True)
results, step = [], [0]


def adb(*a, binary=False, check=True, timeout=120):
    r = subprocess.run(['adb', *a], capture_output=True, timeout=timeout)
    if check and r.returncode:
        raise RuntimeError('adb %s failed: %s' % (' '.join(a), r.stderr.decode(errors='replace')))
    return r.stdout if binary else r.stdout.decode(errors='replace')


def sh(cmd, **k):
    return adb('shell', cmd, **k)


def check(name, ok, detail=''):
    results.append({'name': name, 'ok': bool(ok), 'detail': str(detail)})
    print(('OK  ' if ok else 'FAIL') + ' [Android] ' + name + (' — ' + str(detail) if detail else ''), flush=True)
    return ok


def shot(name):
    step[0] += 1
    png = adb('exec-out', 'screencap -p', binary=True)
    path = os.path.join(OUT, '%02d-%s.png' % (step[0], name))
    open(path, 'wb').write(png)
    return Image.open(io.BytesIO(png)).convert('RGB')


def dump(name=None, tries=4):
    """Accessibility tree as a list of nodes; WebView content shows up as text / content-desc."""
    for _ in range(tries):
        out = sh('uiautomator dump /sdcard/ui.xml', check=False)
        if 'dumped' in out:
            xml = adb('exec-out', 'cat /sdcard/ui.xml')
            if name:
                open(os.path.join(OUT, 'ui-%s.xml' % name), 'w').write(xml)
            nodes = []
            for n in ET.fromstring(xml).iter('node'):
                b = [int(v) for v in re.findall(r'\d+', n.get('bounds', '[0,0][0,0]'))]
                nodes.append({'text': n.get('text', ''), 'desc': n.get('content-desc', ''), 'res': n.get('resource-id', ''),
                              'pkg': n.get('package', ''), 'cls': n.get('class', ''), 'bounds': b})
            return nodes
        time.sleep(1)
    return []


def label(n):
    return (n['text'] + ' ' + n['desc']).strip()


def find(nodes, pattern, exact=False):
    rx = re.compile(('^(%s)$' if exact else '%s') % pattern, re.I)
    return [n for n in nodes if rx.search(n['text']) or rx.search(n['desc'])]


def center(n):
    x1, y1, x2, y2 = n['bounds']
    return (x1 + x2) // 2, (y1 + y2) // 2


def tap(n):
    x, y = center(n)
    sh('input tap %d %d' % (x, y))


def wait_for(pattern, timeout=20, exact=False, name=None):
    end = time.time() + timeout
    while time.time() < end:
        nodes = dump()
        hit = find(nodes, pattern, exact)
        if hit:
            return hit[0], nodes
        time.sleep(1)
    dump(name or 'missing-' + re.sub(r'\W+', '_', pattern)[:30])
    return None, []


def tap_text(pattern, timeout=20, exact=False):
    n, _ = wait_for(pattern, timeout, exact)
    if n:
        tap(n)
    return n


def resumed_package():
    out = sh('dumpsys activity activities')
    m = re.search(r'(?:mResumedActivity|topResumedActivity)[^\n]*?(\S+)/', out)
    return m.group(1).split()[-1] if m else ''


def launch():
    sh('am start -W -n %s/.MainActivity' % PKG)
    time.sleep(3)


def pick_file(filename):
    """Picks a file in /sdcard/Download through the system picker (DocumentsUI)."""
    n, nodes = wait_for(re.escape(filename) + '|Elige un archivo|Files|Archivos|Recent|Downloads', 25)
    if not n:
        return False
    if not find(nodes, re.escape(filename)):
        # an app chooser first ("Elige un archivo"): take the system Files app
        for t in ('Files', 'Archivos'):
            hit = [x for x in find(nodes, t, exact=True) if 'documentsui' not in x['pkg']]
            if hit and find(nodes, 'Elige un archivo'):
                tap(hit[0]); time.sleep(2); break
        nodes = dump()
        if not find(nodes, re.escape(filename)):
            roots = find(nodes, 'Show roots|Mostrar raíces')
            if roots:
                tap(roots[0]); time.sleep(1.5)
            d = tap_text('^Downloads$|^Descargas$', 10)
            time.sleep(2)
    f = tap_text(re.escape(filename), 15)
    time.sleep(4)
    return bool(f)


W, H = 1080, 2400
BOX = [None]


def screen_box(img):
    """Game screen area: from below the top bar down to the shoulder buttons (set once the controls are found)."""
    w, h = img.size
    return BOX[0] or ((0, int(h * 0.06), w, int(h * 0.40)) if h > w else (int(w * 0.2), 0, int(w * 0.8), h))


def differs(a, b, box):
    diff = ImageChops.difference(a.crop(box), b.crop(box)).convert('L')
    return sum(1 for v in diff.getdata() if v > 24)


def pull_latest_export(before):
    files = sh('ls "/sdcard/Download/Bolsillo Advance/"', check=False).split('\n')
    files = [f.strip() for f in files if f.strip().endswith('.zip') and f.strip() not in before]
    if not files:
        return None, None
    name = sorted(files)[-1]
    local = os.path.join(OUT, 'export-%d.zip' % step[0])
    adb('pull', '/sdcard/Download/Bolsillo Advance/' + name, local)
    with zipfile.ZipFile(local) as z:
        sav = [n for n in z.namelist() if n.endswith('.sav')]
        return name, z.read(sav[0]) if sav else None


def exports():
    return set(f.strip() for f in sh('ls "/sdcard/Download/Bolsillo Advance/"', check=False).split('\n') if f.strip())


def open_menu():
    return tap_text('^Menú$', 10, exact=False)


def run():
    global W, H
    m = re.search(r'(\d+)x(\d+)', sh('wm size'))
    if m:
        W, H = int(m.group(1)), int(m.group(2))
    info = sh('getprop ro.build.version.sdk').strip() + ' / ' + sh('getprop ro.product.model').strip()
    check('dispositivo disponible', info.strip(' /'), 'API ' + info)
    adb('install', '-r', '-g', APK, timeout=300)
    pkg = sh('dumpsys package %s' % PKG)
    tgt = re.search(r'targetSdk=(\d+)', pkg)
    check('instalado con targetSdk 36', tgt and tgt.group(1) == '36', tgt.group(1) if tgt else pkg[:200])
    for f in ('BGMode7.gba', 'SoundPCMStereo.gba', 'sram.gba'):
        adb('push', os.path.join(ROMS, f), '/sdcard/Download/' + f)
    sh('pm clear %s' % PKG)
    sh('logcat -c')

    # 1. opening
    launch()
    check('la app abre en primer plano', resumed_package() == PKG, resumed_package())
    n, _ = wait_for('Inserta un cartucho', 30, name='start')
    check('la página carga (pantalla inicial)', n)
    shot('inicio')

    # 2. importing a game through the system picker
    tap_text('^Cargar ROM$', 10)
    check('selector del sistema: elegir BGMode7.gba', pick_file('BGMode7.gba'))
    n, nodes = wait_for('BGMode7', 15, name='loaded')
    check('juego importado (nombre visible)', n, n and label(n))
    resume_btn = find(dump(), '^Continuar$|Toca para jugar|Seguir donde lo dejé', exact=False)
    if resume_btn:
        tap(resume_btn[0]); time.sleep(1)
    time.sleep(4)  # let the load toast disappear
    a = shot('juego')
    box = screen_box(a)
    time.sleep(1.5)
    b = shot('juego-quieto')
    check('la ROM se dibuja y queda estable sin tocar nada', differs(a, b, box) < 50, differs(a, b, box))

    # 3. controls: joystick right, then A
    nodes = dump('controls')
    stick = find(nodes, '^Joystick$', exact=True)
    abtn = find(nodes, '^A$', exact=True)
    shoulder = find(nodes, '^L$', exact=True)
    if shoulder:  # the LCD sits between the top bar and the shoulder buttons
        BOX[0] = (0, int(H * 0.05), W, shoulder[0]['bounds'][1] - 10)
    if check('joystick y botón A presentes', stick and abtn):
        x, y = center(stick[0])
        sh('input swipe %d %d %d %d 1500' % (x, y, x + 120, y, ))
        c = shot('tras-derecha')
        check('el joystick mueve el juego (derecha)', differs(b, c, box) > 500, differs(b, c, box))
        ax, ay = center(abtn[0])
        sh('input swipe %d %d %d %d 1500' % (ax, ay, ax, ay))
        d = shot('tras-A')
        check('el botón A actúa en el juego', differs(c, d, box) > 500, differs(c, d, box))

    # 4. back gesture: opens nothing -> app goes to the background; menu open -> only the menu closes
    open_menu(); time.sleep(1)
    check('menú abierto', find(dump(), 'Estados rápidos'))
    sh('input keyevent KEYCODE_BACK'); time.sleep(1.5)
    check('atrás cierra el menú y la app sigue delante', resumed_package() == PKG and not find(dump(), 'Estados rápidos'))
    open_menu(); time.sleep(1)
    for _ in range(8):
        if find(dump(), 'Ver avisos de terceros'):
            break
        sh('input swipe %d %d %d %d 300' % (W // 2, H * 3 // 4, W // 2, H // 4)); time.sleep(0.7)
    notes = find(dump('menu-avisos'), 'Ver avisos de terceros')
    check('el menú muestra "Licencias y avisos"', notes)
    if notes:
        tap(notes[0]); time.sleep(1)
        nodes = dump('avisos')
        txt = ' '.join(label(x) for x in nodes)
        check('los avisos se leen en la app (MPL-2.0, Jeffrey Pfau, URL del código)',
              'Mozilla Public License' in txt and 'Jeffrey Pfau' in txt and re.search(r'github\.com/\S+/tree/[0-9a-f]{40}', txt), txt[:160])
        shot('avisos')
    sh('input keyevent KEYCODE_BACK'); time.sleep(1)

    # 5. sound: load the PCM demo and look for an active audio player of the app
    uid = re.search(r'uid:(\d+)', sh('cmd package list packages -U %s' % PKG))
    open_menu(); time.sleep(1)
    tap_text('^Cambiar ROM', 10)
    check('selector del sistema: elegir SoundPCMStereo.gba', pick_file('SoundPCMStereo.gba'))
    btn = find(dump(), '^Continuar$|Toca para jugar|Seguir donde lo dejé|Empezar desde el título')
    if btn:
        tap(btn[-1])
    time.sleep(4)
    audio = sh('dumpsys audio')
    players = [l for l in audio.split('\n') if 'AudioPlaybackConfiguration' in l and uid and ('u/pid:%s/' % uid.group(1)) in l]
    open(os.path.join(OUT, 'dumpsys-audio.txt'), 'w').write(audio)
    check('hay audio en reproducción de la app (AudioTrack started)', any('state:started' in l for l in players), (players or ['ninguno'])[0][:200])
    shot('sonido')

    # 6. game saves: jsmolka sram test writes SRAM; export it and compare with the expected bytes
    expected = open(EXPECTED_SAV, 'rb').read()
    open_menu(); time.sleep(1)
    tap_text('^Cambiar ROM', 10)
    check('selector del sistema: elegir sram.gba', pick_file('sram.gba'))
    btn = find(dump(), '^Continuar$|Toca para jugar|Seguir donde lo dejé|Empezar desde el título')
    if btn:
        tap(btn[-1])
    time.sleep(5)
    shot('sram')
    before = exports()
    open_menu(); time.sleep(1)
    tap_text('^Exportar partida', 10); time.sleep(3)
    name, sav = pull_latest_export(before)
    check('exportar partida deja un .zip en Descargas/Bolsillo Advance', name, name)
    check('la partida exportada coincide con la que escribe el juego', sav is not None and sav[:len(expected)] == expected,
          '%s bytes' % (len(sav) if sav else 0))
    sh('input keyevent KEYCODE_BACK'); time.sleep(1)
    pre = shot('antes-de-cerrar')

    # 7. recovery after leaving and killing the app
    sh('input keyevent KEYCODE_HOME'); time.sleep(4)
    check('al salir, la app pasa a segundo plano', resumed_package() != PKG, resumed_package())
    sh('am force-stop %s' % PKG); time.sleep(2)
    check('proceso cerrado', not sh('pidof %s' % PKG, check=False).strip())
    launch()
    n, _ = wait_for('Seguir donde lo dejé|Continuar|Toca para jugar', 30, name='reopen')
    check('al reabrir ofrece continuar la partida', n, n and label(n))
    if n:
        tap(n); time.sleep(4)
    post = shot('reabierta')
    check('el juego vuelve a la misma pantalla', differs(pre, post, screen_box(pre)) < 2000, differs(pre, post, screen_box(pre)))
    before = exports()
    open_menu(); time.sleep(1)
    tap_text('^Exportar partida', 10); time.sleep(3)
    name, sav2 = pull_latest_export(before)
    check('la partida del juego sigue tras cerrar la app', sav2 is not None and sav2[:len(expected)] == expected, name)

    log = adb('logcat', '-d')
    open(os.path.join(OUT, 'logcat.txt'), 'w').write(log)
    crashes = [l for l in log.split('\n') if 'FATAL EXCEPTION' in l or ('AndroidRuntime' in l and PKG in l)]
    check('sin cierres inesperados en logcat', not crashes, crashes[:2])


try:
    run()
except Exception as e:  # keep the evidence of a broken run
    check('la prueba terminó sin errores del arnés', False, repr(e))
    try:
        shot('error'); dump('error'); open(os.path.join(OUT, 'logcat.txt'), 'w').write(adb('logcat', '-d', check=False))
    except Exception:
        pass
json.dump({'results': results}, open(os.path.join(OUT, 'results.json'), 'w'), indent=1, ensure_ascii=False)
fails = sum(1 for r in results if not r['ok'])
print('\n%d/%d comprobaciones en Android correctas' % (len(results) - fails, len(results)))
sys.exit(1 if fails else 0)
