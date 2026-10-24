"""Builds Bolsillo Advance as an Android APK without the Android SDK.

Steps: javac + dx -> icon -> binary manifest + resources.arsc -> zip (aligned) -> apksig (v2 only).
Expects ../gba/dist/bolsillo-advance.html (node ../gba/build.js) and the build-only tools in
$BOLSILLO_TOOLS (default ./.tools, see fetch-build-tools.sh). Output: build/Bolsillo-Advance.apk
"""
import os, struct, subprocess, sys, zipfile, zlib
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'tools'))
from androidbin import Manifest, resources_arsc, TYPE_STRING, TYPE_INT_DEC, TYPE_INT_HEX, TYPE_INT_BOOLEAN, TYPE_REFERENCE
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build')
TOOLS = os.environ.get('BOLSILLO_TOOLS', os.path.join(HERE, '.tools'))
ROOT = os.path.join(HERE, '..', '..')  # bolsillo-advance/
PKG = 'com.bolsillo.advance'
VERSION_CODE, VERSION_NAME = 1, '1.0'

# ---------- icon (192 px, drawn here) ----------
def icon():
    S = 4  # supersample
    W = 192 * S
    im = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, W - 1, W - 1], radius=44 * S, fill=(58, 53, 83, 255))
    d.rounded_rectangle([6 * S, 6 * S, W - 6 * S, W - 6 * S], radius=40 * S, fill=(44, 40, 64, 255))
    # screen bezel + lcd
    d.rounded_rectangle([34 * S, 40 * S, 158 * S, 112 * S], radius=10 * S, fill=(18, 16, 25, 255))
    d.rectangle([44 * S, 48 * S, 148 * S, 102 * S], fill=(143, 154, 122, 255))
    # tiny pixel character on the lcd
    px = 6 * S
    sprite = ["..##..", ".####.", "#.##.#", "..##..", ".#..#."]
    ox, oy = 78 * S, 58 * S
    for y, row in enumerate(sprite):
        for x, c in enumerate(row):
            if c == '#':
                d.rectangle([ox + x * px, oy + y * px, ox + (x + 1) * px - 1, oy + (y + 1) * px - 1], fill=(45, 51, 34, 255))
    # joystick
    d.ellipse([34 * S, 122 * S, 76 * S, 164 * S], fill=(74, 68, 102, 255))
    d.ellipse([45 * S, 133 * S, 65 * S, 153 * S], fill=(93, 86, 128, 255))
    # A / B buttons
    d.ellipse([132 * S, 120 * S, 158 * S, 146 * S], fill=(201, 84, 122, 255))
    d.ellipse([108 * S, 138 * S, 134 * S, 164 * S], fill=(201, 84, 122, 255))
    return im.resize((192, 192), Image.LANCZOS)

# ---------- manifest ----------
A = 'android'
R = {
    'theme': 0x01010000, 'label': 0x01010001, 'icon': 0x01010002, 'name': 0x01010003, 'exported': 0x01010010,
    'launchMode': 0x0101001d, 'screenOrientation': 0x0101001e, 'configChanges': 0x0101001f,
    'minSdkVersion': 0x0101020c, 'versionCode': 0x0101021b, 'versionName': 0x0101021c,
    'targetSdkVersion': 0x01010270, 'allowBackup': 0x01010280, 'hardwareAccelerated': 0x010102d3,
}
def at(name, typ, val):
    return (A, name, R[name], typ, val)

ICON_ID = 0x7f010000
THEME_FULLSCREEN = 16974383  # @android:style/Theme.Material.NoActionBar.Fullscreen
CONFIG_CHANGES = 0x80 | 0x20 | 0x400 | 0x800 | 0x100 | 0x10  # orientation|keyboardHidden|screenSize|smallestScreenSize|screenLayout|keyboard

manifest_tree = ('manifest', [
    (None, 'package', None, TYPE_STRING, PKG),
    at('versionCode', TYPE_INT_DEC, VERSION_CODE),
    at('versionName', TYPE_STRING, VERSION_NAME),
], [
    ('uses-sdk', [at('minSdkVersion', TYPE_INT_DEC, 24), at('targetSdkVersion', TYPE_INT_DEC, 29)], []),
    ('uses-permission', [at('name', TYPE_STRING, 'android.permission.INTERNET')], []),
    ('uses-permission', [at('name', TYPE_STRING, 'android.permission.VIBRATE')], []),
    ('application', [
        at('label', TYPE_STRING, 'Bolsillo Advance'),
        at('icon', TYPE_REFERENCE, ICON_ID),
        at('theme', TYPE_REFERENCE, THEME_FULLSCREEN),
        at('allowBackup', TYPE_INT_BOOLEAN, 0xFFFFFFFF),
        at('hardwareAccelerated', TYPE_INT_BOOLEAN, 0xFFFFFFFF),
    ], [
        ('activity', [
            at('name', TYPE_STRING, PKG + '.MainActivity'),
            at('exported', TYPE_INT_BOOLEAN, 0xFFFFFFFF),
            at('launchMode', TYPE_INT_DEC, 2),            # singleTask
            at('screenOrientation', TYPE_INT_DEC, 10),    # fullSensor
            at('configChanges', TYPE_INT_HEX, CONFIG_CHANGES),
        ], [
            ('intent-filter', [], [
                ('action', [at('name', TYPE_STRING, 'android.intent.action.MAIN')], []),
                ('category', [at('name', TYPE_STRING, 'android.intent.category.LAUNCHER')], []),
            ]),
        ]),
    ]),
])

# ---------- page: wrap the artifact body in a full document ----------
def page():
    body = open(os.path.join(HERE, '..', 'gba', 'dist', 'bolsillo-advance.html'), encoding='utf-8').read()
    head = ('<!doctype html><html lang="es"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">'
            '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>')
    return (head + body + '</body></html>').encode('utf-8')

def run(*cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(' '.join(cmd[:3]) + ' failed:\n' + r.stdout + r.stderr)

def compile_java():
    classes = os.path.join(B, 'classes')
    os.makedirs(classes, exist_ok=True)
    run('javac', '--release', '8', '-nowarn', '-cp', os.path.join(TOOLS, 'android-all.jar'), '-d', classes,
        os.path.join(HERE, 'src', 'com', 'bolsillo', 'advance', 'MainActivity.java'))
    run('java', '-cp', os.path.join(TOOLS, 'dx.jar'), 'com.android.dx.command.Main', '--dex', '--min-sdk-version=24',
        '--output=' + os.path.join(B, 'classes.dex'), classes)
    signer = os.path.join(B, 'signer')
    os.makedirs(signer, exist_ok=True)
    run('javac', '-nowarn', '-cp', os.path.join(TOOLS, 'apksig.jar'), '-d', signer, os.path.join(HERE, 'tools', 'signer', 'Sign.java'))

# third-party notices and the separate source files of the parts they cover (see notices/THIRD-PARTY-NOTICES.txt)
def notice_assets():
    rd = lambda *p: open(os.path.join(ROOT, *p), 'rb').read()
    return [
        ('assets/THIRD-PARTY-NOTICES.txt', rd('notices', 'THIRD-PARTY-NOTICES.txt')),
        ('assets/licenses/MPL-2.0.txt', rd('notices', 'licenses', 'MPL-2.0.txt')),
        ('assets/licenses/BSD-2-Clause-GBA.js.txt', rd('notices', 'licenses', 'BSD-2-Clause-GBA.js.txt')),
        ('assets/source/cart.js', rd('app', 'gba', 'src', 'cart.js')),
        ('assets/source/bios.js', rd('app', 'gba', 'src', 'bios.js')),
    ]

def build():
    os.makedirs(B, exist_ok=True)
    compile_java()
    icon_png = os.path.join(B, 'ic_launcher.png')
    icon().save(icon_png, optimize=True)
    files = [
        ('AndroidManifest.xml', Manifest(manifest_tree).build(), zipfile.ZIP_DEFLATED),
        ('classes.dex', open(os.path.join(B, 'classes.dex'), 'rb').read(), zipfile.ZIP_DEFLATED),
        ('resources.arsc', resources_arsc(PKG, 'drawable', [('ic_launcher', 'res/drawable/ic_launcher.png')]), zipfile.ZIP_STORED),
        ('res/drawable/ic_launcher.png', open(icon_png, 'rb').read(), zipfile.ZIP_STORED),
        ('assets/www/index.html', page(), zipfile.ZIP_DEFLATED),
    ] + [(n, d, zipfile.ZIP_DEFLATED) for n, d in notice_assets()]
    unsigned = os.path.join(B, 'unsigned.apk')
    with zipfile.ZipFile(unsigned, 'w') as z:
        for name, data, method in files:
            zi = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            zi.compress_type = method
            zi.external_attr = 0o644 << 16
            if method == zipfile.ZIP_STORED:
                # pad the local header's extra field so the data starts on a 4-byte boundary
                off = z.fp.tell() + 30 + len(name.encode())
                padn = (4 - (off + 6) % 4) % 4
                zi.extra = struct.pack('<HHH', 0xD935, 2 + padn, 4) + b'\0' * padn
            z.writestr(zi, data)
    out = os.path.join(B, 'Bolsillo-Advance.apk')
    cp = os.pathsep.join([os.path.join(TOOLS, 'apksig.jar'), os.path.join(B, 'signer')])
    r = subprocess.run(['java', '--add-exports', 'java.base/sun.security.x509=ALL-UNNAMED', '--add-exports', 'java.base/sun.security.pkcs=ALL-UNNAMED', '--add-exports', 'java.base/sun.security.util=ALL-UNNAMED', '-cp', cp, 'Sign', unsigned, out, os.path.join(TOOLS, 'key.p12'), 'bolsillo'],
                       capture_output=True, text=True)
    print(r.stdout.strip(), r.stderr.strip().replace('Picked up JAVA_TOOL_OPTIONS', '')[-400:] if r.returncode else '')
    print('apk:', os.path.abspath(out), os.path.getsize(out), 'bytes')

if __name__ == '__main__':
    build()
