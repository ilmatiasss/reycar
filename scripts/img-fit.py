#!/usr/bin/env python3
"""Encuadre de las fotos de producto: mide dónde está el producto dentro de cada foto.

Las fotos del sitio vienen con márgenes blancos muy distintos (un bidón llena la foto, un rociador
de 473 ml ocupa un tercio de una foto apaisada). Este script descarga la foto de tarjeta de cada
producto, busca el contorno del producto sobre el fondo y guarda en data/imgfit.json:

  id: [zoom, dx, dy]   → la tienda agranda/centra la foto para que el producto ocupe ~80 % del recuadro
  id: "cover"           → foto con fondo de color, casi cuadrada: se muestra llenando el recuadro
  id: "frame"           → foto con fondo de color muy alargada (afiche, banner): entera, sin agrandar

Uso:  python3 -I scripts/img-fit.py            (descarga a .img-cache/, no se publica)
Después: node build-data.js (lo incorpora a data/products.js).
"""
import json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from statistics import median
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, '.img-cache')
BASE = 'https://reycarstore.cl/wp-content/uploads/'
TARGET = 0.84          # lado mayor del producto / lado del recuadro
ZMIN, ZMAX = 0.9, 2.0   # sin achicar de más ni pixelar

def load_products():
    src = open(os.path.join(ROOT, 'data', 'products.js'), encoding='utf-8').read()
    m = re.search(r'window\.PRODUCTS = (\[.*\]);', src, re.S)
    return json.loads(m.group(1))

def url_of(u):
    return u if re.match(r'https?:', u) else BASE + u

def fetch(item):
    pid, u = item
    out = os.path.join(CACHE, f'{pid}' + os.path.splitext(u.split('?')[0])[1])
    if not os.path.exists(out) or os.path.getsize(out) == 0:
        subprocess.run(['curl', '-sSfL', '--max-time', '40', '-o', out, url_of(u)], check=False)
    return pid, out

def analyze(path):
    im = Image.open(path)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
        bg.alpha_composite(im)
        im = bg
    im = im.convert('RGB')
    w, h = im.size
    small = im.resize((max(1, w // 2), max(1, h // 2))) if max(w, h) > 400 else im
    sw, sh = small.size
    px = small.load()
    border = [px[x, y] for x in range(sw) for y in (0, 1, sh - 2, sh - 1)] + [px[x, y] for y in range(sh) for x in (0, 1, sw - 2, sw - 1)]
    bgc = tuple(median(c[i] for c in border) for i in range(3))
    lum = 0.299 * bgc[0] + 0.587 * bgc[1] + 0.114 * bgc[2]
    spread = median(max(abs(c[i] - bgc[i]) for i in range(3)) for c in border)
    if lum < 226 or spread > 14:
        return ('cover' if 0.78 <= w / h <= 1.34 else 'frame'), w, h, None
    thr = 26
    cols = [0] * sw
    rows = [0] * sh
    for y in range(sh):
        for x in range(sw):
            c = px[x, y]
            if max(abs(c[0] - bgc[0]), abs(c[1] - bgc[1]), abs(c[2] - bgc[2])) > thr:
                cols[x] += 1
                rows[y] += 1
    mincount = 2
    xs = [i for i, v in enumerate(cols) if v >= mincount]
    ys = [i for i, v in enumerate(rows) if v >= mincount]
    if not xs or not ys:
        return 'blank', w, h, None
    k = w / sw
    return 'ok', w, h, (xs[0] * k, ys[0] * k, (xs[-1] + 1) * k, (ys[-1] + 1) * k)

def fit(w, h, box):
    x0, y0, x1, y1 = box
    side = max(w, h)
    cw, ch = (x1 - x0) / side, (y1 - y0) / side
    fill = max(cw, ch)
    z = min(ZMAX, max(ZMIN, TARGET / fill)) if fill > 0 else 1
    # producto cortado por el borde de la foto: no se agranda ni se mueve en ese eje (se vería el corte al medio)
    tol = 0.01 * side
    cut_x = (x0 <= tol or x1 >= w - tol) and (x1 - x0) < 0.9 * w
    cut_y = (y0 <= tol or y1 >= h - tol) and (y1 - y0) < 0.9 * h
    if cut_x or cut_y:
        z = min(z, 1)
    # desplazamiento del centro del producto respecto del centro de la foto, en fracción del recuadro
    dx = ((x0 + x1) / 2 - w / 2) / side
    dy = ((y0 + y1) / 2 - h / 2) / side
    tx = -dx * z if abs(dx) > 0.015 and not cut_x else 0
    ty = -dy * z if abs(dy) > 0.015 and not cut_y else 0
    return [round(z, 2), round(tx * 100, 1), round(ty * 100, 1)], fill

def main():
    os.makedirs(CACHE, exist_ok=True)
    items = [(p['id'], p['im'][0][0]) for p in load_products() if p.get('im')]
    with ThreadPoolExecutor(8) as ex:
        files = list(ex.map(fetch, items))
    res, stats = {}, {'ok': 0, 'cover': 0, 'frame': 0, 'blank': 0, 'error': 0}
    for pid, path in files:
        try:
            kind, w, h, box = analyze(path)
        except Exception as e:  # descarga fallida o archivo raro: se deja como está
            stats['error'] += 1
            print('error', pid, e, file=sys.stderr)
            continue
        stats[kind] += 1
        if kind in ('cover', 'frame'):
            res[str(pid)] = kind
        elif kind == 'ok':
            f, _ = fit(w, h, box)
            if f != [1, 0, 0]:
                res[str(pid)] = f
    json.dump(res, open(os.path.join(ROOT, 'data', 'imgfit.json'), 'w'), separators=(',', ':'), sort_keys=True)
    print(stats, 'ajustes:', len(res))

if __name__ == '__main__':
    main()
