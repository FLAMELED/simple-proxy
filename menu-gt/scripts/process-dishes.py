"""Convierte las ilustraciones crudas (assets/dishes/<id>-src.webp, 768 px, fondo blanco)
en WebP de 192 px para la app y escribe src/ui/dish-images.js.
Las crudas no se publican; quedan en el repositorio como fuente con su prompt."""
import json, os, re, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(ROOT, 'assets', 'dishes')
ids = []
for f in sorted(os.listdir(src)):
    m = re.match(r'(.+)-(?:raw\.png|src\.webp)$', f)
    if not m:
        continue
    rid = m.group(1)
    im = Image.open(os.path.join(src, f)).convert('RGB')
    # Fondo: blanquea solo píxeles claros y casi grises (gradientes y sombras suaves);
    # el trazo negro y los colores del dibujo no se tocan.
    import numpy as np
    a = np.asarray(im).astype(np.int16)
    mx, mn = a.max(axis=2), a.min(axis=2)
    soft = (mn > 168) & ((mx - mn) < 22)
    a[soft] = 255
    im = Image.fromarray(a.clip(0, 255).astype('uint8'), 'RGB')
    # recorte al contenido (fondo blanco) con margen, luego cuadrado
    gray = im.convert('L').point(lambda v: 255 if v < 245 else 0)
    bbox = gray.getbbox() or (0, 0, im.width, im.height)
    pad = int(0.06 * im.width)
    x0, y0, x1, y1 = max(0, bbox[0]-pad), max(0, bbox[1]-pad), min(im.width, bbox[2]+pad), min(im.height, bbox[3]+pad)
    side = max(x1-x0, y1-y0); cx, cy = (x0+x1)//2, (y0+y1)//2
    box = (max(0, cx-side//2), max(0, cy-side//2), min(im.width, cx+side//2), min(im.height, cy+side//2))
    im.crop(box).resize((192, 192), Image.LANCZOS).save(os.path.join(src, f'{rid}.webp'), 'WEBP', quality=82, method=6)
    ids.append(rid)
with open(os.path.join(ROOT, 'src', 'ui', 'dish-images.js'), 'w') as fh:
    fh.write('// GENERADO por scripts/process-dishes.py. Ilustraciones generadas con IA (no son fotos).\n')
    fh.write('export const DISH_IMAGES = ' + json.dumps({i: f'assets/dishes/{i}.webp' for i in ids}, indent=1) + ';\n')
print(len(ids), 'ilustraciones:', ', '.join(ids))
