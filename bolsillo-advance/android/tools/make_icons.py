"""Draws the launcher icons (legacy PNGs + adaptive foreground) and the 512 px Play Store icon.

Run: python3 make_icons.py   (Pillow). The drawing is the same one the earlier APK build used.
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, '..', 'app', 'src', 'main', 'res')
SHELL = (58, 53, 83, 255)

def console(d, S, ox=0, oy=0):
    """The handheld drawn on a 192-unit grid, offset by (ox, oy) units."""
    R = lambda *v: [(v[i] + (ox if i % 2 == 0 else oy)) * S for i in range(4)]
    d.rounded_rectangle(R(34, 40, 158, 112), radius=10 * S, fill=(18, 16, 25, 255))
    d.rectangle(R(44, 48, 148, 102), fill=(143, 154, 122, 255))
    sprite = ["..##..", ".####.", "#.##.#", "..##..", ".#..#."]
    for y, row in enumerate(sprite):
        for x, c in enumerate(row):
            if c == '#':
                d.rectangle(R(78 + x * 6, 58 + y * 6, 78 + x * 6 + 6, 58 + y * 6 + 6), fill=(45, 51, 34, 255))
    d.ellipse(R(34, 122, 76, 164), fill=(74, 68, 102, 255))
    d.ellipse(R(45, 133, 65, 153), fill=(93, 86, 128, 255))
    d.ellipse(R(132, 120, 158, 146), fill=(201, 84, 122, 255))
    d.ellipse(R(108, 138, 134, 164), fill=(201, 84, 122, 255))

def legacy(size):
    S = 4; W = 192 * S
    im = Image.new('RGBA', (W, W), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, W - 1, W - 1], radius=44 * S, fill=SHELL)
    d.rounded_rectangle([6 * S, 6 * S, W - 6 * S, W - 6 * S], radius=40 * S, fill=(44, 40, 64, 255))
    console(d, S)
    return im.resize((size, size), Image.LANCZOS)

def foreground(size):
    # adaptive icons: 108 dp canvas, the inner 66 dp always visible -> draw the console in the central 61%
    S = 4; W = 312 * S  # 192 / 0.615 ~ 312 units
    im = Image.new('RGBA', (W, W), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    console(d, S, ox=60, oy=60)
    return im.resize((size, size), Image.LANCZOS)

for name, px in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    d = os.path.join(RES, 'mipmap-' + name); os.makedirs(d, exist_ok=True)
    legacy(px).save(os.path.join(d, 'ic_launcher.png'), optimize=True)
    foreground(px * 108 // 48).save(os.path.join(d, 'ic_launcher_foreground.png'), optimize=True)
os.makedirs(os.path.join(RES, 'mipmap-anydpi-v26'), exist_ok=True)
open(os.path.join(RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'), 'w').write(
    '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
    '    <background android:drawable="@color/ic_launcher_background"/>\n'
    '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n')
legacy(512).convert('RGBA').save(os.path.join(HERE, '..', 'play', 'icon-512.png'), optimize=True)
print('icons written')
