#!/usr/bin/env python3
"""Copia al proyecto las fotos de producto que usa la tienda.

Hasta ahora las fotos se leían directo del sitio anterior (reycarstore.cl/wp-content/uploads). Si ese
dominio pasa a ser esta tienda, esas direcciones dejan de existir y no se vería ninguna foto. Este script
descarga cada foto referenciada en data/products.js a assets/uploads/<misma ruta>, así la tienda no
depende del sitio anterior (y las sirve la red de Vercel, más rápido).

Uso:   python3 -I scripts/mirror-images.py      (se puede repetir: solo baja lo que falta)
Si el catálogo cambia (node build-data.js), vuelve a correrlo para traer las fotos nuevas.

Las fotos de más de 450 KB (capturas de pantalla subidas tal cual) se reducen a 1600 px de ancho máximo
y se recomprimen sin cambiar nombre ni formato, para no cargar 2 MB por una foto.
"""
import json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://reycarstore.cl/wp-content/uploads/'
OUT = os.path.join(ROOT, 'assets', 'uploads')
BIG = 450 * 1024
MAXW = 1600


def refs():
    src = open(os.path.join(ROOT, 'data', 'products.js'), encoding='utf-8').read()
    prods = json.loads(re.search(r'window\.PRODUCTS = (\[.*\]);', src, re.S).group(1))
    out = set()
    for p in prods:
        for trio in p.get('im', []):
            for u in trio:
                if u and not re.match(r'https?:', u):
                    out.add(u)
    return sorted(out)


def valid(path):
    try:
        with Image.open(path) as im:
            im.verify()
        return True
    except Exception:
        return False


def fetch(u):
    dest = os.path.join(OUT, u)
    if os.path.exists(dest) and os.path.getsize(dest) > 0 and valid(dest):
        return u, 'ya estaba'
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    for _ in range(4):
        subprocess.run(['curl', '-sSfL', '--max-time', '60', '-o', dest, BASE + u], check=False,
                       stderr=subprocess.DEVNULL)
        if os.path.exists(dest) and os.path.getsize(dest) > 0 and valid(dest):
            return u, 'descargada'
    if os.path.exists(dest):
        os.remove(dest)
    return u, 'FALLÓ'


def shrink(path):
    """Reduce una foto pesada manteniendo nombre y formato. Devuelve (antes, después) en bytes."""
    before = os.path.getsize(path)
    if before <= BIG:
        return before, before
    ext = os.path.splitext(path)[1].lower()
    with Image.open(path) as im:
        im.load()
        if im.width > MAXW:
            im = im.resize((MAXW, round(im.height * MAXW / im.width)), Image.LANCZOS)
        tmp = path + '.tmp'
        if ext in ('.jpg', '.jpeg'):
            im.convert('RGB').save(tmp, 'JPEG', quality=85, optimize=True, progressive=True)
        elif ext == '.png':
            im.save(tmp, 'PNG', optimize=True)
        elif ext == '.webp':
            im.save(tmp, 'WEBP', quality=85)
        else:
            return before, before
    after = os.path.getsize(tmp)
    if after < before:
        os.replace(tmp, path)
        return before, after
    os.remove(tmp)
    return before, before


def main():
    urls = refs()
    with ThreadPoolExecutor(8) as ex:
        res = list(ex.map(fetch, urls))
    failed = [u for u, st in res if st == 'FALLÓ']
    new = sum(1 for _, st in res if st == 'descargada')
    saved = 0
    for u, st in res:
        if st == 'descargada':
            b, a = shrink(os.path.join(OUT, u))
            saved += b - a
    total = sum(os.path.getsize(os.path.join(OUT, u)) for u, st in res if st != 'FALLÓ')
    print(f'{len(urls)} fotos referenciadas · {new} nuevas · {len(failed)} fallaron · '
          f'ahorro por recompresión {saved/1e6:.1f} MB · peso total {total/1e6:.1f} MB')
    for u in failed:
        print('  falló:', u)
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
