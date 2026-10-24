"""Checks a built APK: notices and source files inside it, page contents, DEX classes and signature.

Usage: python3 check_apk.py build/Bolsillo-Advance.apk   (androguard is used if importable)
"""
import hashlib, os, re, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
apk = sys.argv[1]
fails = 0

def check(name, ok, detail=''):
    global fails
    fails += not ok
    print(('OK  ' if ok else 'FAIL') + ' [APK] ' + name + (' — ' + detail if detail else ''))

z = zipfile.ZipFile(apk)
names = z.namelist()
same = lambda entry, *p: entry in names and z.read(entry) == open(os.path.join(ROOT, *p), 'rb').read()
check('avisos de terceros = notices/THIRD-PARTY-NOTICES.txt', same('assets/THIRD-PARTY-NOTICES.txt', 'notices', 'THIRD-PARTY-NOTICES.txt'))
check('texto completo MPL-2.0', same('assets/licenses/MPL-2.0.txt', 'notices', 'licenses', 'MPL-2.0.txt'))
check('texto completo BSD-2-Clause (GBA.js)', same('assets/licenses/BSD-2-Clause-GBA.js.txt', 'notices', 'licenses', 'BSD-2-Clause-GBA.js.txt'))
check('fuente separada cart.js = app/gba/src/cart.js', same('assets/source/cart.js', 'app', 'gba', 'src', 'cart.js'))
check('fuente separada bios.js = app/gba/src/bios.js', same('assets/source/bios.js', 'app', 'gba', 'src', 'bios.js'))
page = z.read('assets/www/index.html').decode('utf-8')
check('la página lleva la sección "Licencias y avisos"', 'id="noticesText"' in page and 'Mozilla Public License Version 2.0' in page)
check('la página lleva el aviso Exhibit A', 'This Source Code Form is subject to the terms of the Mozilla Public' in page)
check('corrección de color nueva presente', 'srgbToLinear' in page and 'LCD_DESAT' in page)
old = ['255 / 280', '50 * lg + 255 * lr', '220 * lb']
check('sin restos del perfil de color anterior', not any(s in page for s in old))
check('código JS sin minificar (forma de código fuente)', 'rtcProcessByte(' in page and 'arctan2(' in page)
check('no incluye fuentes tipográficas', not any(n.lower().endswith(('.ttf', '.otf', '.woff', '.woff2')) for n in names))
check('no incluye ROMs ni BIOS', not any(n.lower().endswith(('.gba', '.agb', '.bin')) for n in names))
dex = z.read('classes.dex')
pkgs = sorted(set(m.decode() for m in re.findall(rb'L([a-z][\w/]*)/[\w$]+;', dex) if not m.startswith((b'java/', b'android/', b'dalvik/'))))
check('DEX: solo paquetes propios fuera de la plataforma', pkgs == ['com/bolsillo/advance'], ', '.join(pkgs))
try:
    from loguru import logger; logger.remove()  # androguard logs every chunk at DEBUG
    from androguard.core.apk import APK
    a = APK(apk)
    check('firma APK v2 válida (androguard)', a.is_signed_v2() and a.is_valid_APK())
    check('paquete y SDK', a.get_package() == 'com.bolsillo.advance' and a.get_min_sdk_version() == '24', f'{a.get_package()} min={a.get_min_sdk_version()} target={a.get_target_sdk_version()}')
except ImportError:
    print('--   [APK] androguard no disponible: la firma solo la comprueba apksig al compilar')
print('sha256', hashlib.sha256(open(apk, 'rb').read()).hexdigest(), os.path.getsize(apk), 'bytes')
sys.exit(1 if fails else 0)
