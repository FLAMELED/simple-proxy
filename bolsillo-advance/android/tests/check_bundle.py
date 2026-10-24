"""Checks the Play bundle (.aab) and the universal APK built from it.

Usage: python3 check_bundle.py <app-release.aab> <universal.apk> <bundletool.jar> [--release]
  --release also requires the notices to point at a clean commit (no local changes).
"""
import hashlib, os, re, subprocess, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')  # bolsillo-advance/
aab, apk, bundletool = sys.argv[1:4]
release = '--release' in sys.argv
fails = 0


def check(name, ok, detail=''):
    global fails
    fails += not ok
    print(('OK  ' if ok else 'FAIL') + ' [AAB] ' + name + (' — ' + str(detail) if detail else ''))


def bt(*a):
    return subprocess.run(['java', '-jar', bundletool, *a], capture_output=True, text=True, check=True).stdout


repo = lambda *p: open(os.path.join(ROOT, *p), 'rb').read()
z = zipfile.ZipFile(aab)
names = set(z.namelist())
man = bt('dump', 'manifest', '--bundle', aab)
attr = lambda n: (re.search(r'android:%s="([^"]+)"' % n, man) or [None, None])[1]
check('targetSdkVersion 36', attr('targetSdkVersion') == '36', attr('targetSdkVersion'))
check('minSdkVersion 24', attr('minSdkVersion') == '24', attr('minSdkVersion'))
check('versionCode = version.json', attr('versionCode') == re.search(r'"code":\s*(\d+)', repo('version.json').decode()).group(1), attr('versionCode'))
check('gesto atrás predictivo declarado', attr('enableOnBackInvokedCallback') == 'true')

www = 'base/assets/www/'
for f in ('mpl/gpio-rtc.js', 'mpl/bios-hle.js'):
    check(f'Covered File {f} incluido como archivo aparte e idéntico al repositorio', z.read(www + f) == repo('app', 'gba', 'src', *f.split('/')))
page = z.read(www + 'index.html').decode()
check('index.html no contiene código de los Covered Files', 'class GpioRtc' not in page and 'MPL_BIOS_HLE = {' not in page)
check('index.html carga los Covered Files por <script src>', '<script src="mpl/gpio-rtc.js"></script>' in page and '<script src="mpl/bios-hle.js"></script>' in page)
check('texto completo MPL-2.0', z.read(www + 'licenses/MPL-2.0.txt') == repo('notices', 'licenses', 'MPL-2.0.txt'))
check('texto completo BSD-2-Clause (GBA.js)', z.read(www + 'licenses/BSD-2-Clause-GBA.js.txt') == repo('notices', 'licenses', 'BSD-2-Clause-GBA.js.txt'))
notices = z.read(www + 'THIRD-PARTY-NOTICES.txt').decode()
m = re.search(r'https://github\.com/\S+/tree/([0-9a-f]{40})/bolsillo-advance', notices)
check('avisos con URL del código fuente y commit', m, m and m.group(0))
head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
check('el commit de los avisos es el commit compilado', m and m.group(1) == head, head[:12])
if release:
    check('compilado sin cambios locales (versión publicable)', 'cambios locales' not in notices)
check('avisos también en la página (menú)', 'Mozilla Public License Version 2.0' in page and 'This Source Code Form is subject to the terms of the Mozilla Public' in page)
check('sin restos del perfil de color anterior', not any(s in page for s in ['255 / 280', '50 * lg + 255 * lr', '220 * lb']))
check('no incluye tipografías, ROMs ni BIOS', not any(n.lower().endswith(('.ttf', '.otf', '.woff', '.woff2', '.gba', '.agb')) for n in names))
dex = b''.join(z.read(n) for n in names if n.startswith('base/dex/'))
pkgs = sorted(set(x.decode() for x in re.findall(rb'L([a-z][\w/]*)/[\w$]+;', dex) if not x.startswith((b'java/', b'android/', b'dalvik/', b'kotlin/'))))
check('DEX: solo código propio (sin bibliotecas)', pkgs == ['com/bolsillo/advance'], ', '.join(pkgs))

u = zipfile.ZipFile(apk)
check('APK universal generado desde el AAB contiene los mismos avisos', u.read('assets/www/THIRD-PARTY-NOTICES.txt').decode() == notices)
for n, h in ((aab, None), (apk, None)):
    print('sha256', hashlib.sha256(open(n, 'rb').read()).hexdigest(), os.path.getsize(n), 'bytes', os.path.basename(n))
sys.exit(1 if fails else 0)
