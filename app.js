/* Reycar Store — prototipo del rediseño (vanilla JS, sin build) */
(() => {
'use strict';

const ALL = window.PRODUCTS;      // cada formato por separado (id, SKU, precio y stock propios)
const P = ALL.filter((p) => !p.fam || p.fam === p.id); // lo que se lista: un producto por familia de formatos
const G = window.GROUPS;
const DISC = 0;                  // descuento web (ej. 0.05); en 0 no se muestra insignia ni precio tachado
const WA = '56963555437';
// cómo se cierra la compra: 'whatsapp' (pedido con el detalle del carro) mientras se conecta el pago en línea (Klap)
const CHECKOUT = 'whatsapp';
const IMG_BASE = '/assets/uploads/';   // fotos copiadas al proyecto con scripts/mirror-images.py (antes se leían del sitio anterior)
const PAGE = 24;
const ROUTE = ['lavado', 'secado', 'descontaminacion', 'pulido', 'proteccion', 'interior']; // orden del proceso
// categorías madre: ordenan el menú, la tienda y las migas (cada categoría pertenece a una sola)
const PARENTS = [
  { id: 'exterior', name: 'Cuidado exterior', short: 'exterior', blurb: 'Lavado, descontaminación, pulido y protección para pintura, neumáticos, llantas y vidrios.', groups: ['lavado', 'secado', 'descontaminacion', 'pulido', 'proteccion', 'ruedas', 'vidrios'] },
  { id: 'interior', name: 'Cuidado interior', short: 'interior', blurb: 'Limpieza y cuidado de tapices, cuero, plásticos y aromas del habitáculo.', groups: ['interior'] },
];

/* ───────── utilidades ───────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clp = (n) => '$' + Math.round(n).toLocaleString('es-CL');
const web = (p) => Math.round(p.p * (1 - DISC));
const was = (p) => (DISC ? `<s>${clp(p.p)}</s>` : '');
const safeDec = (s) => { try { return decodeURIComponent(s); } catch (e) { return s; } };
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const U = (u) => (u && !/^https?:/.test(u) ? IMG_BASE + u : u);
const wa = (msg) => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
const arrow = '<span class="arrow" aria-hidden="true">→</span>';

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5L16 9.5"/>',
  chat: '<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/>',
  bag: '<path d="M5 8h14l-1.2 11H6.2z"/><path d="M9 8V7a3 3 0 016 0v1"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M11 8v6M8 11h6"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
};
const ico = (n) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

/* ───────── nombres limpios para mostrar (los datos originales no se tocan) ─────────
   "MENZERNA HEAVY CUT COMPOUND 1000 250ML" → "Menzerna Heavy Cut Compound 1000 250 ml"
   "Ceramic Wash Snow Foam 5Litros Motor Clean 5LITROS" → "Ceramic Wash Snow Foam 5 L Motor Clean" */
const NAME_KEEP = new Set(['APC', 'DIY', 'MC', 'PH', 'UV', 'XL', 'SUV', 'II', 'III', 'HDO', 'SPTA', 'SRB', 'DA', 'LED', 'RGB', 'PRO', 'XXX', 'IPA', 'SIO2', 'USB', 'EVA', 'PVC', 'GTI', 'HD', 'TP']);
const NAME_SMALL = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'o', 'u', 'en', 'para', 'con', 'sin', 'por', 'a', 'al', 'x']);
const UNIT_RX = /\b(\d+(?:[.,]\d+)?)\s*(ml|cc|lts?|litros?|l|kg|grs?|gr|g|oz|mm|cm)\b(?:\.(?=\s|$))?/gi;
function unitTxt(n, u) {
  const v = n.replace('.', ',');
  if (/^(ml|cc)$/i.test(u)) return `${v} ml`;
  if (/^(l|lts?|litros?)$/i.test(u)) return parseFloat(n.replace(',', '.')) > 50 ? `${v} ml` : `${v} L`; // "500 L" en un frasco = 500 ml
  if (/^(g|gr|grs)$/i.test(u)) return `${v} g`;
  return `${v} ${u.toLowerCase()}`;
}
function niceName(raw) {
  let s = raw.replace(/\s+/g, ' ').trim()
    .replace(/\.(?=[A-ZÁÉÍÓÚÑ]{3,})/g, ' ')     // "57G.MEGUIARS" → "57G MEGUIARS"
    .replace(/\b([A-Za-z]+),s\b/gi, "$1's");      // "ADAM,S" → "ADAM'S"
  const sizes = [...s.matchAll(UNIT_RX)];        // tamaño repetido al final: "… 1litro 1LITRO"
  if (sizes.length >= 2) {
    const last = sizes[sizes.length - 1];
    const same = (m) => unitTxt(m[1], m[2]) === unitTxt(last[1], last[2]);
    if (sizes.slice(0, -1).some(same) && last.index + last[0].length >= s.length - 1) s = s.slice(0, last.index).trim();
  }
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  const shouting = letters.length > 6 && letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length / letters.length > 0.7;
  s = s.split(' ').map((wd, i) => {
    const bare = wd.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9']/g, '');
    if (NAME_KEEP.has(bare.toUpperCase()) && bare === bare.toUpperCase()) return wd;
    if (!shouting) return wd;
    if (/\d/.test(bare) && /[A-Z]/.test(bare) && !/^\d+[.,]?\d*(ML|L|LTS?|CC|GRS?|G|KG|OZ|MM|CM|LITROS?)$/i.test(bare)) return wd; // códigos: EC24, V10
    if (/^[A-Z]{1,3}-[A-Z]{2,5}$/.test(wd)) return wd; // líneas de producto: V-MOL
    const low = wd.toLowerCase();
    if (i > 0 && NAME_SMALL.has(low)) return low;
    return low.replace(/^([^a-záéíóúñ]*)([a-záéíóúñ])/, (m, a, b) => a + b.toUpperCase());
  }).join(' ');
  s = s.replace(UNIT_RX, (m, n, u) => unitTxt(n, u))
    .replace(/\s*–\s*/g, ' – ')
    .replace(/(\D)\s*,\s*/g, '$1, ')
    .replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
    .replace(/\s{2,}/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// nombre de la familia: el de su formato más chico sin el tamaño ("Desengrasante 2000 Motor Clean")
const stripSize = (t) => t.replace(UNIT_RX, ' ').replace(/(^|[^\d.,])\d+(?:[.,]\d+)?\s*(″|"|“|”)(\s*x\s*\d+(?:[.,]\d+)?\s*(″|"|“|”)?)?/g, '$1 ').replace(/\(\s*\)/g, ' ').replace(/\s+/g, ' ').replace(/[\s\-–,]+$/, '').trim();
// nombre a mostrar en listas: el de la familia si tiene varios formatos
const ttl = (p) => { const h = p.fam ? byId.get(p.fam) : p; return h.ft || p.t; };
const headOf = (p) => (p.fam ? byId.get(p.fam) : p);

/* ───────── datos derivados ───────── */
const byId = new Map(ALL.map((p) => [p.id, p]));
const bySlug = new Map(ALL.map((p) => [p.s, p]));
const gById = new Map(G.map((g) => [g.id, g]));
G.forEach((g) => { g.count = 0; });
// subcategorías: id → { id, name, g, count }
const scById = new Map();
G.forEach((g) => (g.subs || []).forEach((s) => { s.count = 0; s.g = g.id; scById.set(s.id, s); }));
ALL.forEach((p) => {
  const sc = p.sc && scById.get(p.sc);
  p._q = norm([p.n, p.b, gById.get(p.g).name, sc ? sc.name : '', p.c.join(' ')].join(' '));
  p.img = p.im && p.im[0] ? U(p.im[0][0]) : null;
  p.spec = specOf(p.n);
  p.t = niceName(p.n);
});
// familias: la cabeza (formato más chico) guarda todos sus formatos en p.vs y un nombre sin tamaño en p.ft
ALL.forEach((p) => { if (p.fam && p.fam !== p.id) { const h = byId.get(p.fam); (h.vs = h.vs || [h]).push(p); } });
P.forEach((p) => {
  gById.get(p.g).count++;
  const sc = p.sc && scById.get(p.sc);
  if (sc) sc.count++;
  if (p.vs) {
    p.vs.sort((a, b) => a.p - b.p);
    p.ft = stripSize(p.t);
    p._q = norm(p.vs.map((v) => v.n).join(' ')) + ' ' + p._q;
  }
});
const pById = new Map(PARENTS.map((x) => [x.id, x]));
const parentOf = new Map(PARENTS.flatMap((x) => x.groups.map((id) => [id, x])));
PARENTS.forEach((x) => { x.count = x.groups.reduce((a, id) => a + gById.get(id).count, 0); });
// una categoría madre con una sola categoría lleva directo a ella
const pHref = (x) => (x.groups.length > 1 ? `/tienda?p=${x.id}` : `/tienda?g=${x.groups[0]}`);
// nombre visible de una categoría: si es la única de su madre, se muestra la madre ("Cuidado interior")
const gName = (g) => { const x = parentOf.get(g.id); return x && x.groups.length === 1 ? x.name : g.name; };
// migas de categoría: madre (si agrupa varias) › categoría › subcategoría; con `last` el último queda como texto
function catTrail(g, sc, last) {
  const x = parentOf.get(g.id), t = [];
  if (x && x.groups.length > 1) t.push([pHref(x), x.name]);
  t.push([`/tienda?g=${g.id}`, gName(g)]);
  if (sc) t.push([`/tienda?g=${g.id}&sc=${sc.id}`, sc.name]);
  return t.map(([h, n], i) => (last && i === t.length - 1 ? `<span>${esc(n)}</span>` : `<a href="${h}">${esc(n)}</a>`)).join('');
}
const brandCount = {};
P.forEach((p) => { if (p.b) brandCount[p.b] = (brandCount[p.b] || 0) + 1; });
const BRANDS = Object.entries(brandCount).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));

// formato del producto leído desde el nombre (473 ml, 5 L, 40×40 cm, 5″…)
function specOf(n) {
  let m;
  if ((m = n.match(/(\d+(?:[.,]\d+)?)\s*(ml|cc)\b/i))) return `${m[1]} ml`;
  if ((m = n.match(/(\d+(?:[.,]\d+)?)\s*(litros?|lts?)\b/i)) || (m = n.match(/(\d+(?:[.,]\d+)?)\s*l\b\.?/i))) return parseFloat(m[1]) > 50 ? `${m[1]} ml` : `${m[1]} L`; // "500 L" en un frasco = 500 ml
  // medidas solo en paños/toallas o con "cm" explícito (en pads "5,5 x 1" son pulgadas)
  if ((m = n.match(/(?:^|[^\d.])(\d{2,3})\s*[x×]\s*(\d{2,3})\s*(cm)?/i)) && (m[3] || /toalla|pa[ñn]o|microfibra|towel/i.test(n))) return `${m[1]}×${m[2]} cm`;
  if ((m = n.match(/(\d+(?:[.,]\d+)?)\s*(kg|gr?)\b/i))) return `${m[1]} ${/kg/i.test(m[2]) ? 'kg' : 'g'}`;
  if ((m = n.match(/(\d+(?:[.,]\d+)?)\s*oz\b/i))) return `${m[1]} oz`;
  // pulgadas, salvo en medidas "5,5 x 1,25″" (el número va tras una x) o dentro de otro número
  m = [...n.matchAll(/(\d+(?:[.,]\d+)?)\s*(″|"|“|”)/gi)].find((x) => { const b = n.slice(0, x.index); return !/[x×]\s?$/i.test(b) && !/[\d.,]$/.test(b); });
  if (m) return `${m[1]}″`;
  return '';
}
const pick = (rx, g) => P.find((p) => p.img && rx.test(p.n) && (!g || p.g === g));
const bestOf = (fn) => P.filter((p) => p.img && fn(p)).sort((a, b) => b.p - a.p)[0];
const minPrice = (g) => Math.min(...P.filter((p) => p.g === g).map(web));
const topBrandsIn = (g, n) => {
  const c = {}; P.filter((p) => p.g === g && p.b).forEach((p) => { c[p.b] = (c[p.b] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n).map(([b]) => b);
};
const FEATURED_RX = [/Twist Towel/i, /Ultimate Polish/i, /Ceramic Gloss/i, /Heavy Cut Compound 1000/i, /Clay Towel/i, /Reflect/i,
  /Magic Buffer/i, /Incredible Suds/i, /Rinseless/i, /Recubrimiento Cer/i];
function featured(n = 10) {
  const out = [];
  FEATURED_RX.forEach((rx) => { const p = pick(rx); if (p && !out.includes(p)) out.push(p); });
  for (const p of P) { if (out.length >= n) break; if (p.img && p.b && !out.includes(p)) out.push(p); }
  return out.slice(0, n);
}
const STEP_IMG = { lavado: /Incredible Suds/i, secado: /Twist Towel/i, descontaminacion: /Clay Towel/i, pulido: /Heavy Cut Compound 1000/i, proteccion: /Ceramic Gloss/i };
const stepImg = (g) => (STEP_IMG[g] && pick(STEP_IMG[g])) || bestOf((p) => p.g === g && p.b);

/* ───────── medición (tracking.js) ─────────
   Si la medición falla o no está cargada, la tienda sigue funcionando igual. */
const track = (fn, ...a) => { try { if (window.Track) window.Track[fn](...a); } catch (e) { /* nunca romper la tienda */ } };
// mismo formato de ID que usa hoy el catálogo de Meta del sitio: SKU_idProducto
const tItem = (p, qty = 1) => ({ id: `${p.sku}_${p.id}`, name: p.t, brand: p.b || '', category: (gById.get(p.g) || {}).name || '', price: web(p), qty });

/* ───────── stock en vivo (Bsale, vía /api/stock) ─────────
   Si la API no está configurada o no responde, queda el stock del catálogo y nada se rompe. */
const STOCK_EVERY = 60 * 1000;
async function syncStock(timeout = 1500) {
  try {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), timeout);
    const r = await fetch('/api/stock', { cache: 'no-store', signal: ctl.signal });
    clearTimeout(tm);
    if (!r.ok) return false;
    const j = await r.json();
    if (j.source !== 'bsale' || !j.stock) return false;
    let hits = 0;
    ALL.forEach((p) => {
      const q = j.stock[String(p.sku)];
      if (q === undefined) return;          // no está en Bsale: conserva el stock del catálogo
      hits++; p.stk = q;
    });
    console.info(`[stock] Bsale: ${hits} de ${ALL.length} productos coinciden por SKU${j.stale ? ' (datos con retraso)' : ''}`);
    return true;
  } catch (e) { return false; }
}

/* ───────── carro ───────── */
let cart = {};
try { cart = JSON.parse(localStorage.getItem('reycars-cart') || '{}'); } catch (e) { cart = {}; }
// el carro guardado puede venir viejo o dañado: solo quedan productos que existen y cantidades enteras válidas
if (!cart || typeof cart !== 'object' || Array.isArray(cart)) cart = {};
Object.keys(cart).forEach((id) => {
  const q = Math.floor(Number(cart[id]));
  if (!byId.has(+id) || !(q >= 1)) delete cart[id]; else cart[id] = Math.min(q, 99);
});
try { localStorage.setItem('reycars-cart', JSON.stringify(cart)); } catch (e) { /* modo privado */ }
// después de actualizar el stock: el carro nunca supera lo disponible
function fitCartToStock() {
  let removed = 0;
  Object.keys(cart).forEach((id) => {
    const m = maxQty(byId.get(+id));
    if (m === 0) { delete cart[id]; removed++; } else if (cart[id] > m) cart[id] = m;
  });
  saveCart(); updateCartUI();
  if (removed) toast('Algún producto de tu carro se agotó y lo quitamos');
}
const saveCart = () => { try { localStorage.setItem('reycars-cart', JSON.stringify(cart)); } catch (e) { /* modo privado */ } };
const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
const maxQty = (p) => (Number.isFinite(p.stk) ? p.stk : 99);   // 0 = agotado
const cartItemsT = () => Object.entries(cart).map(([id, q]) => tItem(byId.get(+id), q));
const cartTotal = () => Object.entries(cart).reduce((a, [id, q]) => a + web(byId.get(+id)) * q, 0);

function addToCart(id, qty = 1) {
  const p = byId.get(id), before = cart[id] || 0;
  if (maxQty(p) === 0) { toast('Este producto está agotado por ahora'); return p; }
  cart[id] = Math.min(before + qty, maxQty(p));
  saveCart(); updateCartUI(true);
  if (cart[id] > before) track('addToCart', tItem(p, cart[id] - before));
  return p;
}
function setQty(id, q) {
  const p = byId.get(id);
  q = Math.max(0, Math.min(q, maxQty(p)));
  if (q === 0) delete cart[id]; else cart[id] = q;
  saveCart(); updateCartUI(); drawCart();
}
function updateCartUI(bump) {
  const n = cartCount();
  ['#cartCount'].forEach((s) => { const b = $(s); if (b) { b.hidden = n === 0; b.textContent = n; } });
  $('#cartTotal').textContent = clp(cartTotal());
  if (bump) ['.hd__carticon'].forEach((s) => { const c = $(s); if (c) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); } });
}
function drawCart() {
  const ids = Object.keys(cart);
  const body = $('#drawerBody'), foot = $('#drawerFoot');
  if (!ids.length) {
    body.innerHTML = `<div class="cart-empty"><h3>Tu carro está vacío</h3><p>Agrega productos y aparecerán aquí.</p></div>`;
    foot.innerHTML = `<a class="btn btn--dark btn--block" href="/tienda" data-action="close-cart">Ir a la tienda</a>`;
    return;
  }
  body.innerHTML = ids.map((id) => {
    const p = byId.get(+id), q = cart[id];
    return `<div class="ci">
      <a class="ci__img" href="/producto/${p.s}" data-action="close-cart">${p.img ? `<img src="${thumb(p)}" alt=""${fit(p)}>` : ''}</a>
      <div class="ci__b">
        <small>${esc(p.b || gById.get(p.g).name)}${p.spec ? ' · ' + esc(p.spec) : ''}</small>
        <a href="/producto/${p.s}" data-action="close-cart">${esc(p.t)}</a>
        <div class="ci__row">
          <div class="qty qty--s">
            <button data-action="qty" data-id="${p.id}" data-d="-1" aria-label="Quitar uno">${ico('minus')}</button>
            <output>${q}</output>
            <button data-action="qty" data-id="${p.id}" data-d="1" aria-label="Agregar uno">${ico('plus')}</button>
          </div>
          <span class="ci__price">${clp(web(p) * q)}</span>
        </div>
        <button class="ci__rm" data-action="rm" data-id="${p.id}">Quitar</button>
      </div>
    </div>`;
  }).join('');
  foot.innerHTML = `
    <div class="sum"><div>Subtotal<small>${CHECKOUT === 'whatsapp' ? 'Te confirmamos stock, despacho y pago por WhatsApp' : 'Envío calculado al finalizar la compra'}</small></div><b>${clp(cartTotal())}</b></div>
    <button class="btn btn--red btn--block" data-action="checkout">${CHECKOUT === 'whatsapp' ? `${ico('chat')} Hacer pedido por WhatsApp` : `Finalizar compra ${arrow}`}</button>
    <div class="cart-perks"><span>Envíos a todo Chile</span><span>Productos originales</span><span>Atención directa</span></div>`;
}

/* ───────── componentes ───────── */
const ADD_LABEL = 'Agregar<span class="pc__addx"> al carro</span>'; // en móvil se acorta a "Agregar"

// encuadre medido por scripts/img-fit.py: agranda y centra el producto para que todos se vean del mismo
// tamaño (--z, --x, --y), o marca las fotos con fondo de color para mostrarlas a sangre ('cover') o enteras ('frame')
const fit = (p) => { const f = p && p.fz; return !f ? '' : typeof f === 'string' ? ` data-fit="${f}"` : ` style="--z:${f[0]};--x:${f[1]}%;--y:${f[2]}%"`; };
// miniatura chica (≈300 px) para íconos y lista de resultados; [0] ≈600 px para tarjetas y carrusel; [1] ≈1024 px para la ficha
const thumb = (p) => (p.im && p.im[0] ? U(p.im[0][2] || p.im[0][0]) : null);
const srcset = (p, sizes) => (p.im[0][2] && p.im[0][2] !== p.im[0][0] ? ` srcset="${U(p.im[0][2])} 300w, ${p.img} 600w" sizes="${sizes}"` : '');
const img = (p, big) => (p.img
  ? `<img src="${big && p.im[0][1] ? U(p.im[0][1]) : p.img}"${big ? '' : srcset(p, '(max-width: 820px) 46vw, 260px')} alt="${esc(p.t)}" loading="lazy" decoding="async"${fit(p)}>`
  : `<span class="ph"><img src="/assets/reycars-crest.webp" alt="" loading="lazy"><small>Foto pronto</small></span>`);

const stockTag = (p) => (p.stk === 0 ? '<span class="pc__stock pc__stock--out">Agotado</span>' : p.stk === 1 ? '<span class="pc__stock">Última unidad</span>' : '');
// selector de formato (1 L · 5 L…) en tarjetas y ficha
const fmtBtns = (h, cur) => h.vs.map((v) => `<button class="${v === cur ? 'on' : ''}" data-action="card-fmt" data-id="${v.id}" aria-pressed="${v === cur}">${esc(v.spec)}</button>`).join('');
function card(p) {
  const out = p.stk === 0, h = headOf(p);
  return `<article class="pc">
    <a class="pc__img" href="/producto/${p.s}" tabindex="-1" aria-hidden="true">${img(p)}${DISC ? `<span class="pc__off">-${DISC * 100}%</span>` : ''}${stockTag(p)}</a>
    <div class="pc__body">
      <span class="pc__brand">${p.b ? esc(p.b) : '&nbsp;'}</span>
      <a class="pc__name" href="/producto/${p.s}">${esc(ttl(p))}</a>
      ${h.vs ? `<div class="pc__fmts" role="group" aria-label="Formato">${fmtBtns(h, p)}</div>` : p.spec ? `<span class="pc__spec">${esc(p.spec)}</span>` : ''}
      <div class="pc__price"><b>${clp(web(p))}</b>${was(p)}</div>
      <button class="pc__add" data-action="add" data-id="${p.id}"${out ? ' disabled' : ''} aria-label="${out ? 'Agotado' : 'Agregar al carro'}: ${esc(p.t)}">${ico('bag')}<span class="pc__addt">${out ? 'Agotado' : ADD_LABEL}</span></button>
    </div>
  </article>`;
}
// cambiar de formato en una tarjeta: precio, foto, stock, enlace y botón pasan al formato elegido
function cardFmt(b) {
  const c = b.closest('.pc'), v = byId.get(+b.dataset.id); if (!c || !v) return;
  $$('.pc__fmts button', c).forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
  $('.pc__price', c).innerHTML = `<b>${clp(web(v))}</b>${was(v)}`;
  $$('a[href^="/producto/"]', c).forEach((a) => { a.setAttribute('href', `/producto/${v.s}`); });
  const im = $('.pc__img img', c);
  if (im && v.img) {
    im.removeAttribute('srcset'); im.removeAttribute('style'); im.removeAttribute('data-fit'); im.src = v.img;
    const f = v.fz;
    if (typeof f === 'string') im.dataset.fit = f;
    else if (f) im.style.cssText = `--z:${f[0]};--x:${f[1]}%;--y:${f[2]}%`;
  }
  const st = $('.pc__stock', c); if (st) st.remove();
  $('.pc__img', c).insertAdjacentHTML('beforeend', stockTag(v));
  const add = $('.pc__add', c), out = v.stk === 0;
  add.dataset.id = v.id; add.disabled = out;
  add.setAttribute('aria-label', `${out ? 'Agotado' : 'Agregar al carro'}: ${v.t}`);
  $('.pc__addt', add).innerHTML = out ? 'Agotado' : ADD_LABEL;
}
const perksBar = () => `<div class="perks">
  <div class="perk">${ico('truck')}<div><b>Envíos a todo Chile</b><span>Despacho a todo el país</span></div></div>
  <div class="perk">${ico('card')}<div>${CHECKOUT === 'whatsapp' ? '<b>Pedido por WhatsApp</b><span>Te confirmamos stock y pago</span>' : '<b>Pago en línea</b><span>Tarjetas y billeteras digitales</span>'}</div></div>
  <div class="perk">${ico('shield')}<div><b>Productos originales</b><span>Marcas reconocidas</span></div></div>
  <a class="perk" href="${wa('Hola Reycar, necesito asesoría')}" target="_blank" rel="noopener">${ico('chat')}<div><b>Asesoría por WhatsApp</b><span>+56 9 6355 5437</span></div></a>
</div>`;
const helpBox = () => `<div class="help rv">
  <div>
    <span class="mono">Asesoría personalizada</span>
    <h2 class="cond">¿No sabes qué producto usar?</h2>
    <p>Cuéntanos qué auto tienes y qué quieres lograr. Te recomendamos la rutina por WhatsApp.</p>
  </div>
  <a class="btn btn--white" href="${wa('Hola Reycar, quisiera una recomendación de productos')}" target="_blank" rel="noopener">${ico('chat')} Escribir por WhatsApp</a>
</div>`;
// logos oficiales (fetch-logos.js). fx: 'dark' oscurece logos que vienen en blanco; 'clip' recorta el borde del archivo.
const LOGOS = {
  'Meguiars': ['/assets/brands/meguiars.png', 'tall'], 'Vonixx': ['/assets/brands/vonixx.webp', 'dark'],
  'Maxshine': ['/assets/brands/maxshine.png'], 'KochChemie': ['/assets/brands/kochchemie.svg'],
  'Carpro': ['/assets/brands/carpro.jpg', 'clip'], 'DIY': ['/assets/brands/diy.png'],
  'ReyCar': ['/assets/logo.png', 'tall'],
  'Menzerna': ['/assets/brands/menzerna.svg'], 'Lake Country': ['/assets/brands/lake-country.svg', 'dark'],
  'Rupes': ['/assets/brands/rupes.png', 'tall'], 'VINTEX': ['/assets/brands/vintex.webp', 'dark'],
  'DIMENSION CAR CARE': ['/assets/brands/dimension-car-care.png', 'tall'], 'Shine Mate': ['/assets/brands/shine-mate.svg', 'tall'],
  '3M': ['/assets/brands/3m.svg'], 'Sonax': ['/assets/brands/sonax.svg'],
  'Motor Clean': ['/assets/brands/motor-clean.png', 'tall'], 'SPTA': ['/assets/brands/spta.png', 'dark'],
  'TRINIK': ['/assets/brands/trinik.svg'], 'Professional Shine': ['/assets/brands/professional-shine.jpg', 'tall'],
  'Soft 99': ['/assets/brands/soft99.png'], 'Gtechniq': ['/assets/brands/gtechniq.svg'],
};
/* ── Motor Clean: marca destacada con espacio propio (inicio, página, menú, fichas y catálogo) ── */
const MC = 'Motor Clean', MC_LOGO = '/assets/brands/motor-clean.png';
const mcAll = () => P.filter((p) => p.b === MC);
const mcGroups = () => {
  const c = {}; mcAll().forEach((p) => { c[p.g] = (c[p.g] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ g: gById.get(id), n }));
};
// los que tienen varios formatos primero, luego los con foto
const mcSort = (l) => l.slice().sort((a, b) => (!!b.vs - !!a.vs) * 2 + (!!b.img - !!a.img));
// selección para el inicio: va alternando categorías para mostrar la línea completa
function mcPicks(n) {
  const byG = mcGroups().map(({ g }) => mcSort(mcAll().filter((p) => p.g === g.id && p.img)));
  const out = [];
  for (let i = 0; out.length < n && i < 30; i++) byG.forEach((l) => { if (l[i] && out.length < n) out.push(l[i]); });
  return out;
}
const mcStrip = () => `<a class="mcstrip" href="/motor-clean"><span class="mcstrip__logo"><img src="${MC_LOGO}" alt=""></span><span class="mcstrip__t"><b>Línea Motor Clean</b><span>${mcAll().length} productos, muchos en formato de 1 L y 5 L</span></span>${arrow}</a>`;
function mcHome() {
  return `<section class="sec wrap">
    <div class="mcb rv">
      <div class="mcb__head">
        <span class="mcb__logo"><img src="${MC_LOGO}" alt="Motor Clean"></span>
        <div class="mcb__copy">
          <span class="mcb__kicker">Marca destacada</span>
          <h2 class="cond">Línea Motor Clean</h2>
          <p>Shampoos, desengrasantes, renovadores de neumáticos, ceras y aromatizantes. Muchos en formato de 1 L y 5 L, para tu auto o para el taller.</p>
        </div>
        <a class="btn mcb__btn" href="/motor-clean">Ver la línea completa ${arrow}</a>
      </div>
      <div class="mcb__cats">${mcGroups().map(({ g, n }) => `<a href="/motor-clean?g=${g.id}">${esc(gName(g))}<small>${n}</small></a>`).join('')}</div>
      <div class="mcb__row">${mcPicks(8).map(card).join('')}</div>
    </div>
  </section>`;
}
function viewMC(o) {
  const gs = mcGroups(), cur = o.g && gs.find((x) => x.g.id === o.g);
  const fams = mcAll().filter((p) => p.vs).length;
  document.title = 'Motor Clean — Reycar Store';
  return `<section class="page wrap view">
    <div class="crumbs"><a href="/">Inicio</a><a href="/marcas">Marcas</a><span>Motor Clean</span></div>
    <div class="mcb mcb--hero">
      <div class="mcb__head">
        <span class="mcb__logo"><img src="${MC_LOGO}" alt="Motor Clean"></span>
        <div class="mcb__copy">
          <span class="mcb__kicker">Marca destacada</span>
          <h1 class="cond">Motor Clean</h1>
          <p>Toda la línea en un solo lugar: lavado, interior, neumáticos, protección y vidrios. Elige el formato de 1 L o 5 L directamente en cada producto.</p>
        </div>
        <dl class="mcb__stats"><div><dt>${mcAll().length}</dt><dd>productos</dd></div><div><dt>${gs.length}</dt><dd>categorías</dd></div><div><dt>${fams}</dt><dd>con varios formatos</dd></div></dl>
      </div>
    </div>
    <nav class="subnav mc__nav" aria-label="Categorías de Motor Clean">
      <a class="${cur ? '' : 'on'}" href="/motor-clean">Toda la línea <em>${mcAll().length}</em></a>
      ${gs.map(({ g, n }) => `<a class="${cur && cur.g === g ? 'on' : ''}" href="/motor-clean?g=${g.id}">${esc(gName(g))} <em>${n}</em></a>`).join('')}
    </nav>
    <div class="secs">${(cur ? [cur] : gs).map(({ g }) => {
      const items = mcSort(mcAll().filter((p) => p.g === g.id));
      return `<section class="secs__s"><div class="secs__h"><h2 class="cond">${esc(gName(g))}</h2><span class="count"><b>${items.length}</b> producto${items.length === 1 ? '' : 's'}</span></div><div class="grid grid--4">${items.map(card).join('')}</div></section>`;
    }).join('')}</div>
  </section>`;
}
// logos de igual peso visual: misma superficie aproximada sin importar si son altos o muy anchos
const fitLogo = (i) => { if (i.naturalWidth && i.naturalHeight) i.style.width = Math.round(Math.min(150, Math.sqrt(2900 * i.naturalWidth / i.naturalHeight))) + 'px'; };
const brandCell = (b, i = 0) => {
  const logo = LOGOS[b.name];
  return `<a class="bc rv" style="--d:${(i % 6) * 0.05}s" href="${b.name === MC ? '/motor-clean' : `/tienda?b=${encodeURIComponent(b.name)}`}" aria-label="${esc(b.name)}, ${b.n} producto${b.n === 1 ? '' : 's'}">
    <span class="bc__plate">${logo
      ? `<img class="bc__logo${logo[1] ? ' fx-' + logo[1] : ''}" src="${logo[0]}" alt="${esc(b.name)}" loading="lazy">`
      : `<span class="bc__word cond">${esc(b.name)}</span>`}</span>
    <span class="bc__meta"><b>${esc(b.name)}</b><span>${b.n} producto${b.n === 1 ? '' : 's'}</span></span>
  </a>`;
};

// pasos del proceso: líneas con "*" en la descripción del servicio
const steps = (d, n = 12) => (d || '').split('\n').map((l) => l.trim())
  .filter((l) => /^\*/.test(l) && !/precio|solo exterior/i.test(l))
  .map((l) => l.replace(/^\*\s*/, '').replace(/2 Vald[eé]s/i, '2 baldes').replace(/^./, (c) => c.toUpperCase())).slice(0, n);
const vehicleOf = (p) => (/SUV|camioneta/i.test(p.n) ? 'Camioneta · SUV XL' : /sed[aá]n|hatch/i.test(p.n) ? 'Sedán · Hatchback' : 'Servicio en taller');

/* ───────── logo grande con neón por el borde y reflejos (portada) ─────────
   El contorno sigue la silueta del escudo dorado, medida sobre assets/reycars-crest.webp (768×786). */
const SHIELD = 'M383 30 C330 30 290 36 257 42 C150 58 100 110 97 190 L97 540 C98 590 140 630 230 680 C290 712 355 750 383 771 C411 750 476 712 536 680 C626 630 668 590 669 540 L669 190 C666 110 616 58 509 42 C476 36 436 30 383 30 Z';
function crestHTML() {
  return `<div class="crest an an--crest" id="crest" style="--d:.05s">
    <span class="crest__floor" aria-hidden="true"></span>
    <div class="crest__tilt">
      <svg class="crest__neon" viewBox="0 0 768 786" aria-hidden="true" focusable="false">
        <defs>
          <filter id="neonGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b1"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b2"/>
            <feMerge><feMergeNode in="b2"/><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <g transform="translate(383 400) scale(1.055) translate(-383 -400)" filter="url(#neonGlow)">
          <path class="neon neon--tube" d="${SHIELD}"/>
          <path class="neon neon--run" d="${SHIELD}" pathLength="100"/>
          <path class="neon neon--run neon--run2" d="${SHIELD}" pathLength="100"/>
        </g>
      </svg>
      <img class="crest__logo" src="/assets/reycars-crest.webp" alt="Reycar Detailing Center" width="768" height="786" fetchpriority="high">
      <span class="crest__shine" aria-hidden="true"></span>
      <span class="crest__spec" aria-hidden="true"></span>
      <span class="crest__runs" aria-hidden="true"><span class="runs__in">
        <i class="run"></i><i class="run run--2"></i>
      </span></span>
    </div>
  </div>`;
}
// inclinación 3D y reflejo que siguen al mouse (solo con mouse y sin "reducir movimiento")
// La luz que recorre el escudo se anima solo con 'transform' (lo resuelve la tarjeta gráfica, sin redibujar nada):
// se toman puntos del contorno y se arman los cuadros clave una sola vez.
function runKeyframes(crest) {
  const path = $('.neon--tube', crest);
  if (!path || $('#runKF')) return;
  try {
    const len = path.getTotalLength(), N = 120, pts = [];
    for (let k = 0; k <= N; k++) pts.push(path.getPointAtLength((len * k) / N));
    let prev = 0, off = 0;
    const frames = pts.map((p, k) => {
      const q = pts[Math.min(k + 1, N)], o = pts[Math.max(k - 1, 0)];
      let a = (Math.atan2(q.y - o.y, q.x - o.x) * 180) / Math.PI + off;
      while (a - prev > 180) { off -= 360; a -= 360; }
      while (a - prev < -180) { off += 360; a += 360; }
      prev = a;
      return `${((k / N) * 100).toFixed(2)}%{transform:translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(${a.toFixed(1)}deg)}`;
    });
    const st = document.createElement('style'); st.id = 'runKF';
    st.textContent = `@keyframes runAlong{${frames.join('')}}`;
    document.head.appendChild(st);
  } catch (e) { /* sin luz que recorre: queda el contorno fijo */ }
}
function crestInit() {
  const stage = $('#stage'), crest = $('#crest');
  if (crest) {
    const fit = () => crest.style.setProperty('--cs', (crest.clientWidth / 768).toFixed(4));
    fit(); window.addEventListener('resize', fit, { passive: true });
    runKeyframes(crest);
  }
  if (!stage || !crest || reduceMotion.matches || !matchMedia('(hover: hover)').matches) return;
  stage.addEventListener('pointermove', (e) => {
    const r = crest.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    crest.style.setProperty('--rx', `${Math.max(-1, Math.min(1, px - 0.5)) * 16}deg`);
    crest.style.setProperty('--ry', `${Math.max(-1, Math.min(1, 0.5 - py)) * 12}deg`);
    crest.style.setProperty('--sx', `${Math.round(px * 100)}%`);
    crest.style.setProperty('--sy', `${Math.round(py * 100)}%`);
    crest.classList.add('is-lit');
  });
  stage.addEventListener('pointerleave', () => {
    ['--rx', '--ry'].forEach((k) => crest.style.setProperty(k, '0deg'));
    crest.classList.remove('is-lit');
  });
}

/* ───────── vistas ───────── */
let homeTab = 'feat';
const HOME_TABS = { feat: 'Destacados', proteccion: 'Cerámicos y ceras', secado: 'Microfibras', pulido: 'Pulido', interior: 'Interior' };
const tabItems = (t) => (t === 'feat' ? featured(10)
  : (() => { const per = {}; return filterProducts({ g: t }).filter((p) => p.img && (per[p.b] = (per[p.b] || 0) + 1) <= 3).slice(0, 10); })());

function viewHome() {
  const prot = gById.get('proteccion');
  const showcase = featured(9);
  const svc = P.filter((p) => p.g === 'servicios').sort((a, b) => a.p - b.p);
  const course = P.find((p) => p.g === 'cursos');
  const tsteps = steps(svc[0] && svc[0].d);
  const more = G.filter((g) => !ROUTE.includes(g.id) && g.id !== 'servicios');

  return `<div class="view">
  <section class="wrap">
    <div class="stage" id="stage">
      <div class="stage__top">
        ${crestHTML()}
        <div class="stage__copy">
          <span class="stage__eyebrow an" style="--d:.25s">Reycar · Detailing Center · Quinta Normal</span>
          <h1 class="cond an" style="--d:.35s">Tu auto,<br>tratado como <span class="gold">Rey.</span></h1>
          <p class="an" style="--d:.47s">Productos originales de Meguiars, Carpro, Koch-Chemie, Vonixx y más, y el taller que los aplica. Envíos a todo Chile.</p>
          <div class="stage__cta an" style="--d:.59s">
            <a class="btn btn--red" href="/tienda">Ver la tienda ${arrow}</a>
            <a class="btn btn--glass" href="/asesoria">Servicios de taller</a>
          </div>
          ${DISC ? `<span class="stage__badge an" style="--d:.71s"><b>−${DISC * 100}%</b> precio web en todo el catálogo</span>` : ''}
        </div>
      </div>
      ${mobileMQ.matches ? '' : `<div class="cf an" id="cf" style="--d:.55s" aria-roledescription="carrusel" aria-label="Productos destacados">
        <div class="cf__track">${showcase.map((p, i) => `
          <article class="cf__s" data-i="${i}" aria-roledescription="producto ${i + 1} de ${showcase.length}">
            <a class="cf__tile" href="/producto/${p.s}" tabindex="-1"><img src="${p.img}"${srcset(p, '(max-width: 820px) 58vw, 300px')} alt="${esc(p.t)}" decoding="async"${fit(p)}></a>
            <div class="cf__cap">
              <span class="cf__brand">${esc(p.b || gById.get(p.g).name)}${p.spec ? ' · ' + esc(p.spec) : ''}</span>
              <a class="cf__name" href="/producto/${p.s}">${esc(ttl(p))}</a>
              <div class="cf__row"><b>${clp(web(p))}</b>${was(p)}<button class="cf__add" data-action="add" data-id="${p.id}" aria-label="Agregar al carro: ${esc(p.t)}">${ico('plus')}</button></div>
            </div>
          </article>`).join('')}
        </div>
        <button class="cf__nav cf__prev" data-action="cf" data-d="-1" aria-label="Producto anterior">‹</button>
        <button class="cf__nav cf__next" data-action="cf" data-d="1" aria-label="Producto siguiente">›</button>
        <div class="cf__dots">${showcase.map((_, i) => `<button data-action="cf-go" data-i="${i}" aria-label="Ver producto ${i + 1}"></button>`).join('')}</div>
      </div>`}
    </div>

    <div class="promos">
      <a class="vit__side vit__side--light" href="/tienda?g=proteccion">
        <span class="mono">Protección · ${prot.count} productos</span>
        <strong class="cond"><em>Ceras y cerámicos desde</em>${clp(minPrice('proteccion'))}</strong>
        <span class="vit__go">Que el brillo dure meses, no días ${arrow}</span>
      </a>
      <a class="vit__side vit__side--red" href="/tienda?g=secado">
        <span class="mono">Secado y microfibras</span>
        <strong class="cond"><em>Desde</em>${clp(minPrice('secado'))}</strong>
        <span class="vit__go">Toallas, paños y aplicadores ${arrow}</span>
      </a>
      ${svc.length ? `<a class="vit__side vit__side--dark" href="/asesoria">
        <span class="mono">Taller · Quinta Normal</span>
        <strong class="cond"><em>Cerámico aplicado desde</em>${clp(web(svc[0]))}</strong>
        <span class="vit__go">Ver servicios del taller ${arrow}</span>
      </a>` : ''}
    </div>
    ${perksBar()}
  </section>

  ${mcHome()}


  <section class="sec wrap">
    <div class="sh rv">
      <div><span class="mono mono--gold">El proceso, en orden</span><h2 class="cond">Compra por etapa</h2><p>Del lavado a la protección. Cada etapa con los productos que necesitas.</p></div>
      <a class="sh__link" href="/tienda">Ver todo el catálogo ${arrow}</a>
    </div>
    <div class="steps">
      ${ROUTE.map((id, i) => {
        const g = gById.get(id), p = stepImg(id);
        return `<a class="step rv" style="--d:${i * 0.06}s" href="/tienda?g=${id}">
          <span class="step__n">${String(i + 1).padStart(2, '0')}</span>
          <h3 class="cond">${esc(g.name)}</h3>
          <span class="step__b">${esc(g.blurb)}</span>
          <span class="step__img">${p ? `<span class="step__tile"><img src="${p.img}" alt="" loading="lazy"${fit(p)}></span>` : ''}</span>
          <span class="step__foot"><span>${g.count} productos</span>${arrow}</span>
        </a>`;
      }).join('')}
    </div>
    <div class="steps__more"><span>Además</span>${more.map((g) => `<a href="/tienda?g=${g.id}">${esc(g.name)}<small>${g.count}</small></a>`).join('')}</div>
  </section>

  <section class="sec wrap">
    <div class="sh rv">
      <div><span class="mono mono--gold">Selección Reycar</span><h2 class="cond">Productos</h2></div>
      <div class="tabs" role="tablist">${Object.entries(HOME_TABS).map(([k, v]) => `<button role="tab" aria-selected="${k === homeTab}" class="${k === homeTab ? 'on' : ''}" data-action="tab" data-t="${k}">${v}</button>`).join('')}</div>
    </div>
    <div class="grid" id="homeGrid">${tabItems(homeTab).map(card).join('')}</div>
  </section>

  ${svc.length ? `<section class="taller">
    <div class="wrap taller__in">
      <div class="rv">
        <span class="mono mono--gold">Servicio en taller · Quinta Normal, Santiago</span>
        <h2 class="cond">¿Prefieres que lo hagamos <span class="red">nosotros?</span></h2>
        <p class="taller__lead">Aplicamos el cerámico en nuestro Detailing Center con la pintura preparada de principio a fin. El servicio exterior incluye:</p>
        <ol class="tsteps" id="tsteps">${tsteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        ${tsteps.length > 5 ? `<button class="tsteps__more" data-action="tsteps" aria-controls="tsteps" aria-expanded="false">Ver los ${tsteps.length} pasos del proceso</button>` : ''}
      </div>
      <div class="offers rv" style="--d:.1s">
        ${svc.map((p) => `<div class="offer">
          <span class="mono mono--gold">${vehicleOf(p)}</span>
          <h3>${esc(p.t)}</h3>
          <div class="offer__price"><b>${clp(web(p))}</b>${was(p)}</div>
          <div class="offer__row"><a class="btn btn--red" href="${wa(`Hola Reycar, quiero agendar: ${p.t}`)}" target="_blank" rel="noopener">Agendar por WhatsApp</a><a class="offer__link" href="/producto/${p.s}">Ver detalle</a></div>
        </div>`).join('')}
        ${course ? `<a class="offer offer--course" href="/producto/${course.s}"><div><span class="mono">Curso presencial · 6 días</span><b>Aprende detailing profesional</b></div><span class="p">${clp(web(course))} ${arrow}</span></a>` : ''}
      </div>
    </div>
  </section>` : ''}

  <section class="sec wrap">
    <div class="sh rv"><div><span class="mono mono--gold">Originales</span><h2 class="cond">Marcas</h2></div><a class="sh__link" href="/marcas">Ver las ${BRANDS.length} marcas ${arrow}</a></div>
    <div class="brandgrid">${BRANDS.filter((b) => LOGOS[b.name]).slice(0, 11).map(brandCell).join('')}<a class="bc bc--all rv" style="--d:.25s" href="/marcas"><span class="bc__plate"><span class="bc__word cond">Ver todas</span></span><span class="bc__meta"><b>${BRANDS.length} marcas</b><span>${arrow}</span></span></a></div>
    ${helpBox()}
  </section>
  </div>`;
}

function viewBrands() {
  document.title = 'Marcas — Reycar Store';
  return `<section class="page wrap view">
    <div class="crumbs"><a href="/">Inicio</a><span>Marcas</span></div>
    <div class="ptitle"><h1 class="cond">Marcas</h1><p>${BRANDS.length} marcas de detailing automotriz, todas con productos originales.</p></div>
    <div class="brandgrid">${BRANDS.map(brandCell).join('')}</div>
    ${helpBox()}
  </section>`;
}

function viewServices() {
  document.title = 'Servicios de taller — Reycar Store';
  const items = [...P.filter((p) => p.g === 'servicios').sort((a, b) => a.p - b.p), ...P.filter((p) => p.g === 'cursos')];
  const fallback = items.find((p) => steps(p.d).length && p.g === 'servicios');
  return `<section class="page wrap view">
    <div class="crumbs"><a href="/">Inicio</a><span>Servicios</span></div>
    <div class="ptitle"><h1 class="cond">Servicios de taller</h1><p>Cerámicos aplicados por nuestro equipo en Quinta Normal y cursos para aprender el oficio.</p></div>
    <div class="svc">${items.map((p) => {
      const course = p.g === 'cursos';
      let st = steps(p.d, 10);
      const inherited = !st.length && !course && fallback;
      if (inherited) st = steps(fallback.d, 10);
      return `<article class="svc__c">
        <a class="svc__img${p.img ? '' : ' svc__img--ph'}" href="/producto/${p.s}" tabindex="-1" aria-hidden="true">${p.img ? `<img src="${p.img}" alt="" loading="lazy">` : 'Reycar · Detailing Center'}</a>
        <div class="svc__b">
          <span class="mono mono--red">${course ? 'Curso presencial · 6 días' : vehicleOf(p)}</span>
          <h2 class="svc__t">${esc(p.t)}</h2>
          <div class="svc__price"><b>${clp(web(p))}</b>${was(p)}</div>
          ${st.length ? `${inherited ? '<p class="svc__txt">Mismo proceso que el servicio sedán, para vehículos grandes:</p>' : ''}<ol class="svc__steps">${st.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
          <div class="svc__cta">
            <a class="btn btn--red btn--sm" href="${wa(`Hola Reycar, quiero ${course ? 'reservar un cupo en' : 'agendar'}: ${p.t}`)}" target="_blank" rel="noopener">${course ? 'Reservar cupo' : 'Agendar'} por WhatsApp</a>
            <a class="svc__link" href="/producto/${p.s}">Ver detalle</a>
          </div>
        </div>
      </article>`;
    }).join('')}</div>
    ${helpBox()}
  </section>`;
}

/* ── catálogo ── */
let shop = { params: {}, shown: PAGE };
const SORTS = { rel: 'Relevancia', asc: 'Precio: menor a mayor', desc: 'Precio: mayor a menor', az: 'Nombre: A–Z' };
const parseQuery = (qs) => { const o = {}; new URLSearchParams(qs).forEach((v, k) => { if (k !== 'perf' && k !== 'track') o[k] = v; }); return o; };
const toQuery = (o) => { const u = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => { if (v !== '' && v != null) u.set(k, v); }); const s = u.toString(); return s ? '?' + s : ''; };

function filterProducts(o) {
  let list = P;
  if (o.p) { const x = pById.get(o.p); if (x) list = list.filter((p) => x.groups.includes(p.g)); }
  if (o.g) list = list.filter((p) => p.g === o.g);
  if (o.sc) list = list.filter((p) => p.sc === o.sc);
  if (o.b) { const set = new Set(o.b.split(',')); list = list.filter((p) => set.has(p.b)); }
  if (o.q) { const toks = norm(o.q).split(/\s+/).filter(Boolean); list = list.filter((p) => toks.every((t) => p._q.includes(t))); }
  if (o.min) list = list.filter((p) => web(p) >= +o.min);
  if (o.max) list = list.filter((p) => web(p) <= +o.max);
  list = list.slice();
  if (o.sort === 'asc') list.sort((a, b) => a.p - b.p);
  else if (o.sort === 'desc') list.sort((a, b) => b.p - a.p);
  else if (o.sort === 'az') list.sort((a, b) => a.n.localeCompare(b.n, 'es'));
  else if (o.q) {
    const q = norm(o.q);
    const sc = (p) => (norm(p.n).startsWith(q) ? 0 : norm(p.n).includes(q) ? 1 : 2) + (p.img ? 0 : 3);
    list.sort((a, b) => sc(a) - sc(b));
  } else {
    const sc = (p) => (p.img ? 0 : 2) + (p.b ? 0 : 1);
    list.sort((a, b) => sc(a) - sc(b));
  }
  return list;
}
function viewShop(params) {
  shop.params = params; shop.shown = PAGE; shop.allBrands = false;
  return `<section class="page wrap view"><div id="shopRoot"></div></section>`;
}
function drawShop() {
  const o = shop.params;
  const root = $('#shopRoot'); if (!root) return;
  const grpBtn = (x, c = '') => `<button class="${c}${o.g === x.id ? ' on' : ''}" data-action="set-group" data-g="${x.id}">${esc(x.name)} <em>${gc[x.id] || 0}</em></button>`;
  const oldF = $('.filters', root), oldB = $('.brandlist', root);
  const keep = { f: oldF ? oldF.scrollTop : 0, b: oldB ? oldB.scrollTop : 0, open: !!(oldF && oldF.classList.contains('open')) };
  const list = filterProducts(o);
  const g = o.g && gById.get(o.g);
  const scx = o.sc && scById.get(o.sc);
  const px = !g && o.p && pById.get(o.p);
  const sel = o.b ? o.b.split(',') : [];
  // categoría grande sin otros filtros: se muestra por subcategoría (no 100 productos seguidos)
  const plain = !o.q && !o.b && !o.min && !o.max && !o.sort;
  const landing = g && g.subs && !scx && plain && g.count > 16;

  const bc = {}; filterProducts({ ...o, b: '' }).forEach((p) => { if (p.b) bc[p.b] = (bc[p.b] || 0) + 1; });
  const brandsCtx = Object.entries(bc).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  sel.forEach((s) => { if (!bc[s]) brandsCtx.push([s, 0]); });
  const shortBrands = !shop.allBrands && brandsCtx.length > 9 && !brandsCtx.slice(8).some(([b]) => sel.includes(b));
  const gc = {}; filterProducts({ ...o, g: '', p: '', sc: '' }).forEach((p) => { gc[p.g] = (gc[p.g] || 0) + 1; });

  const title = o.q ? `«${esc(o.q)}»` : scx ? esc(scx.name) : g ? esc(gName(g)) : px ? esc(px.name) : sel.length === 1 ? esc(sel[0]) : 'Catálogo';
  const sub = o.q ? `Resultados de búsqueda.` : scx ? `${scx.count} producto${scx.count === 1 ? '' : 's'} en ${g ? g.name : ''}.` : g ? g.blurb : px ? px.blurb : sel.length === 1 ? 'Productos originales de la marca.' : `${P.length} productos de ${BRANDS.length} marcas.`;
  const tags = [];
  if (px) tags.push(['p', px.name]);
  if (g) tags.push(['g', gName(g)]);
  if (scx) tags.push(['sc', scx.name]);
  sel.forEach((s) => tags.push(['b:' + s, s]));
  if (o.q) tags.push(['q', `«${o.q}»`]);
  if (o.min || o.max) tags.push(['price', `${o.min ? clp(o.min) : '$0'} – ${o.max ? clp(o.max) : 'máx.'}`]);

  root.innerHTML = `
    <div class="crumbs"><a href="/">Inicio</a><a href="/tienda">Tienda</a>${g ? catTrail(g, scx, true) : px ? `<span>${esc(px.name)}</span>` : o.q ? '<span>Búsqueda</span>' : ''}</div>
    <div class="ptitle"><h1 class="cond">${title}</h1><p>${esc(sub)}</p></div>
    ${sel.length === 1 && sel[0] === MC ? mcStrip() : ''}
    ${g && g.subs ? `<nav class="subnav" aria-label="Subcategorías de ${esc(g.name)}">
      <a class="${!scx ? 'on' : ''}" href="/tienda?g=${g.id}">Todo ${esc(g.name.toLowerCase())} <em>${g.count}</em></a>
      ${g.subs.map((s) => `<a class="${scx && scx.id === s.id ? 'on' : ''}" href="/tienda?g=${g.id}&sc=${s.id}">${esc(s.name)} <em>${s.count}</em></a>`).join('')}
    </nav>` : px ? `<nav class="subnav" aria-label="Categorías de ${esc(px.name)}">
      <a class="on" href="${pHref(px)}">Todo ${esc(px.short)} <em>${px.count}</em></a>
      ${px.groups.map((id) => { const x = gById.get(id); return `<a href="/tienda?g=${id}">${esc(x.name)} <em>${x.count}</em></a>`; }).join('')}
    </nav>` : ''}
    <div class="shop">
      <div class="filters-scrim" data-action="close-filters"></div>
      <aside class="filters${keep.open ? ' open' : ''}" id="filters" aria-label="Filtros">
        <span class="sheet-grip" aria-hidden="true"></span>
        <div class="filters__head">Filtros<button class="icon-btn" data-action="close-filters" aria-label="Cerrar filtros">${ico('close')}</button></div>
        <div>
          <h2>Categoría</h2>
          <div class="fl">
            <button class="${!o.g && !o.p ? 'on' : ''}" data-action="set-group" data-g="">Todas <em>${Object.values(gc).reduce((a, b) => a + b, 0)}</em></button>
            ${PARENTS.map((x) => `<button class="fl__p${(x.groups.length > 1 ? px === x : o.g === x.groups[0]) ? ' on' : ''}" data-action="set-parent" data-p="${x.id}">${esc(x.name)} <em>${x.groups.reduce((a, id) => a + (gc[id] || 0), 0)}</em></button>
              ${x.groups.length > 1 ? x.groups.map((id) => grpBtn(gById.get(id), 'fl__c')).join('') : ''}`).join('')}
            ${G.filter((x) => !parentOf.has(x.id)).map((x) => grpBtn(x)).join('')}
          </div>
        </div>
        ${g && g.subs ? `<div>
          <h2>Subcategoría</h2>
          <div class="fl">
            <button class="${!scx ? 'on' : ''}" data-action="set-sub" data-sc="">Todas <em>${g.count}</em></button>
            ${g.subs.map((s) => `<button class="${scx && scx.id === s.id ? 'on' : ''}" data-action="set-sub" data-sc="${s.id}">${esc(s.name)} <em>${s.count}</em></button>`).join('')}
          </div>
        </div>` : ''}
        ${brandsCtx.length ? `<div>
          <h2>Marca</h2>
          <div class="brandlist${shortBrands ? ' is-short' : ''}">${brandsCtx.map(([b, n]) => `<label class="cb"><input type="checkbox" data-action="toggle-brand" value="${esc(b)}"${sel.includes(b) ? ' checked' : ''}>${esc(b)}<em>${n}</em></label>`).join('')}</div>
          ${shortBrands ? `<button class="brandmore" data-action="all-brands">Ver las ${brandsCtx.length} marcas</button>` : ''}
        </div>` : ''}
        <div>
          <h2>Precio</h2>
          <div class="price"><input type="number" inputmode="numeric" min="0" step="1000" placeholder="Mín." value="${esc(o.min || '')}" data-price="min" aria-label="Precio mínimo"><span>–</span><input type="number" inputmode="numeric" min="0" step="1000" placeholder="Máx." value="${esc(o.max || '')}" data-price="max" aria-label="Precio máximo"></div>
        </div>
        <div class="filters__apply"><button class="btn btn--dark" data-action="close-filters" id="applyBtn">Ver ${list.length} producto${list.length === 1 ? '' : 's'}</button></div>
      </aside>
      <div>
        <div class="toolbar">
          <div class="toolbar__acts">
            <button class="btn btn--line btn--sm filters-btn" data-action="open-filters">${ico('filter')} Filtros${tags.length ? `<i>${tags.length}</i>` : ''}</button>
            <label class="sort"><select data-action="sort" aria-label="Ordenar por">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}"${(o.sort || 'rel') === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
          </div>
          <div class="toolbar__l">
            <span class="count"><b>${list.length}</b> producto${list.length === 1 ? '' : 's'}</span>
            ${tags.map(([k, t]) => `<span class="tag">${esc(t)}<button data-action="rm-tag" data-k="${esc(k)}" aria-label="Quitar filtro ${esc(t)}">${ico('close')}</button></span>`).join('')}
            ${tags.length > 1 ? `<button class="tag tag--clear" data-action="clear-filters">Limpiar</button>` : ''}
          </div>
        </div>
        <div class="grid grid--4" id="grid"></div>
        <div class="more" id="more"></div>
      </div>
    </div>`;
  if (landing) drawSections(g.subs.map((s) => [s.name, `/tienda?g=${g.id}&sc=${s.id}`, filterProducts({ g: g.id, sc: s.id })]));
  else if (px && plain) drawSections(px.groups.map((id) => [gById.get(id).name, `/tienda?g=${id}`, filterProducts({ g: id })]));
  else drawResults(list);
  const f = $('.filters', root), bl = $('.brandlist', root);
  if (f) f.scrollTop = keep.f;
  if (bl) bl.scrollTop = keep.b;
  const sn = $('.subnav', root), son = sn && $('.on', sn); // en celular la fila se desliza: dejar visible la subcategoría activa
  if (son && sn.scrollWidth > sn.clientWidth) sn.scrollLeft = son.offsetLeft - sn.offsetLeft - parseFloat(getComputedStyle(sn).paddingLeft);
  document.title = `${o.q ? 'Búsqueda: ' + o.q : scx ? scx.name + ' · ' + (g ? gName(g) : '') : g ? gName(g) : px ? px.name : sel.length === 1 ? sel[0] : 'Tienda'} — Reycar Store`;
  markNav();
}
// página de una categoría grande o madre: una sección por subcategoría (o categoría) con sus 4 productos destacados
function drawSections(secs) {
  const grid = $('#grid'), more = $('#more'); if (!grid) return;
  grid.className = 'secs';
  grid.innerHTML = secs.map(([name, href, items]) => {
    return `<section class="secs__s">
      <div class="secs__h"><h2 class="cond">${esc(name)}</h2><a class="sh__link" href="${href}">Ver ${items.length > 4 ? `los ${items.length}` : 'todo'} ${arrow}</a></div>
      <div class="grid grid--4 grid--sec">${items.slice(0, 4).map(card).join('')}</div>
    </section>`;
  }).join('');
  more.innerHTML = '';
}
function drawResults(list = filterProducts(shop.params)) {
  const grid = $('#grid'), more = $('#more'); if (!grid) return;
  if (!list.length) {
    grid.innerHTML = `<div class="empty"><h3 class="cond">Sin resultados</h3><p>Prueba con otra búsqueda o quita algunos filtros.</p><br><button class="btn btn--line btn--sm" data-action="clear-filters">Limpiar filtros</button></div>`;
    more.innerHTML = ''; return;
  }
  grid.innerHTML = list.slice(0, shop.shown).map(card).join('');
  more.innerHTML = list.length > shop.shown ? `<button class="btn btn--line" data-action="more">Mostrar más · quedan ${list.length - shop.shown}</button>` : '';
}
function setParams(patch) {
  const next = { ...shop.params, ...patch };
  Object.keys(next).forEach((k) => { if (next[k] === '' || next[k] == null) delete next[k]; });
  shop.params = next; shop.shown = PAGE;
  history.replaceState(null, '', '/tienda' + toQuery(next));
  drawShop(); setMeta('tienda');
}

/* ── ficha de producto ── */
let pdp = { p: null, qty: 1 };
// descripción legible: títulos ("MODO DE USO", "Dilución:"), pasos numerados, viñetas y sin párrafos en MAYÚSCULAS
const isShout = (l) => /[A-ZÁÉÍÓÚÑ]{4}/.test(l) && l === l.toUpperCase();
function calm(l) {
  if (!isShout(l)) return l;
  const s = l.toLowerCase().replace(/(^|[.!?]\s+)([a-záéíóúñ])/g, (m, a, b) => a + b.toUpperCase());
  return s.replace(/\b[\wáéíóúñ]+\b/gi, (w) => (NAME_KEEP.has(w.toUpperCase()) ? w.toUpperCase() : w));
}
function descHTML(d) {
  if (!d) return '<p>Este producto aún no tiene descripción. Escríbenos por WhatsApp y te contamos cómo usarlo.</p>';
  let html = '', ul = [], ol = [];
  const flush = () => {
    if (ul.length) html += `<ul>${ul.map((l) => `<li>${esc(calm(l))}</li>`).join('')}</ul>`;
    if (ol.length) html += `<ol>${ol.map((l) => `<li>${esc(calm(l))}</li>`).join('')}</ol>`;
    ul = []; ol = [];
  };
  const isHead = (l) => l.length <= 42 && !/[.!?]$/.test(l) && (/:\s*$/.test(l) || (isShout(l) && !/\d{3}/.test(l)));
  // la palabra "Descripción" suelta (viene en los textos del sitio anterior) ya es el título del acordeón
  d.split('\n').map((l) => l.trim()).filter((l) => l && !/^descripci[oó]n\s*:?$/i.test(l)).forEach((l) => {
    if (/^\d{1,2}\s*[.)-]\s+/.test(l)) { if (ul.length) flush(); ol.push(l.replace(/^\d{1,2}\s*[.)-]\s+/, '')); }
    else if (/^[-•·–*]\s*/.test(l)) { if (ol.length) flush(); ul.push(l.replace(/^[-•·–*]\s*/, '')); }
    else if (isHead(l)) { flush(); html += `<h3>${esc(calm(l.replace(/:\s*$/, '')))}</h3>`; }
    else { flush(); html += `<p>${esc(calm(l))}</p>`; }
  });
  flush();
  return html;
}
function view404() {
  document.title = 'Página no encontrada — Reycar Store';
  return `<section class="page wrap view"><div class="empty"><h1 class="cond">Página no encontrada</h1><p>La dirección no existe o el producto ya no está disponible.</p><br><a class="btn btn--dark btn--sm" href="/tienda">Ir a la tienda</a> <a class="btn btn--line btn--sm" href="/">Inicio</a></div></section>`;
}
// dirección pública de un producto (las variantes de formato apuntan a la del producto principal)
const pUrl = (p) => `${location.origin}/producto/${p.s}`;
const absImg = (p) => (p && p.im && p.im[0] ? new URL(U(p.im[0][1] || p.im[0][0]), location.origin).href : `${location.origin}/assets/reycars-crest.webp`);
const DEFAULT_DESC = 'Productos originales de detailing automotriz: lavado, pulido, cerámicos, interior y más. Tienda y taller en Quinta Normal. Envíos a todo Chile.';
function headTag(sel, make) { let el = document.head.querySelector(sel); if (!el) { el = make(); document.head.appendChild(el); } return el; }
function setMetaTag(attr, key, val) {
  const m = headTag(`meta[${attr}="${key}"]`, () => { const el = document.createElement('meta'); el.setAttribute(attr, key); return el; });
  m.setAttribute('content', val);
}
// título, descripción, dirección canónica, vista previa al compartir y datos estructurados de cada página
function setMeta(name) {
  const p = name === 'producto' ? pdp.p : null;
  const ok = (name === 'home' || VIEWS.includes(name)) && !(name === 'producto' && !p);
  let desc = DEFAULT_DESC, img = absImg(null), canon = location.origin + curPath(), type = 'website', ld = null;
  if (p) {
    const h = headOf(p);
    // misma fórmula que scripts/prerender.js: nombre, marca si no está en el nombre, formatos y el inicio del texto
    const name = ttl(p), specs = h.vs ? h.vs.map((v) => v.spec) : [];
    const text = String(p.d || h.d || '').replace(/^\s*descripci[oó]n\s*:?\s*/i, '').replace(/\s+/g, ' ').trim();
    desc = `${name}${p.b && !name.toLowerCase().includes(p.b.toLowerCase()) ? ` de ${p.b}` : ''}${specs.length ? ` en formatos ${specs.slice(0, -1).join(', ')} y ${specs[specs.length - 1]}` : p.spec ? `, ${p.spec}` : ''}. ${text.length > 110 ? text.slice(0, 110).replace(/\s\S*$/, '') + '…' : text}`.trim();
    img = absImg(p); canon = pUrl(h); type = 'product';
    ld = { '@context': 'https://schema.org', '@type': 'Product', name: ttl(p), image: [img], sku: p.sku || undefined, brand: p.b ? { '@type': 'Brand', name: p.b } : undefined, category: (gById.get(p.g) || {}).name,
      offers: (h.vs || [p]).map((v) => ({ '@type': 'Offer', url: pUrl(v), sku: v.sku || undefined, price: web(v), priceCurrency: 'CLP', availability: v.stk === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition' })) };
  } else if (name === 'tienda') {
    const o = shop.params, g = o.g && gById.get(o.g), x = o.p && pById.get(o.p);
    desc = g ? `${gName(g)}: ${g.blurb} Productos originales con envío a todo Chile.` : x ? `${x.name}: ${x.blurb}` : o.q ? `Resultados para «${o.q}» en Reycar Store.` : DEFAULT_DESC;
    canon = location.origin + '/tienda' + toQuery(Object.fromEntries(Object.entries(o).filter(([k]) => k === 'g' || k === 'p' || k === 'sc' || k === 'b')));
  } else if (name === 'motor-clean') {
    desc = `Toda la línea Motor Clean: ${mcAll().length} productos de lavado, interior, neumáticos y protección, en formatos de 1 L y 5 L.`;
    img = `${location.origin}${MC_LOGO}`;
  } else if (name === 'marcas') desc = `${BRANDS.length} marcas de detailing automotriz, todas con productos originales.`;
  else if (name === 'asesoria') desc = 'Servicios de detailing en nuestro taller de Quinta Normal: lavado, pulido, cerámicos e interior. Agenda por WhatsApp.';
  setMetaTag('name', 'description', desc);
  setMetaTag('property', 'og:title', document.title);
  setMetaTag('property', 'og:description', desc);
  setMetaTag('property', 'og:image', img);
  setMetaTag('property', 'og:url', canon);
  setMetaTag('property', 'og:type', type);
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  headTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' })).href = canon;
  // las páginas que no existen no se indexan
  const nr = document.head.querySelector('meta[name="robots"][data-404]');
  if (!ok && !nr) { const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex'; m.dataset['404'] = ''; document.head.appendChild(m); } else if (ok && nr) nr.remove();
  const old = document.getElementById('ld-json'); if (old) old.remove();
  if (ld) { const sc = document.createElement('script'); sc.type = 'application/ld+json'; sc.id = 'ld-json'; sc.textContent = JSON.stringify(ld); document.head.appendChild(sc); }
}
function viewProduct(slug) {
  const p = bySlug.get(slug);
  if (!p) { pdp = { p: null, qty: 1 }; document.title = 'Producto no encontrado — Reycar Store'; }   // sin esto quedaba el producto anterior (y se medía como visto)
  if (!p) return `<section class="page wrap view"><div class="empty"><h3 class="cond">Producto no encontrado</h3><p>Puede que ya no esté disponible.</p><br><a class="btn btn--dark btn--sm" href="/tienda">Ir a la tienda</a></div></section>`;
  pdp = { p, qty: 1 };
  const g = gById.get(p.g), h = headOf(p);
  const psc = p.sc && scById.get(p.sc);
  // misma subcategoría primero (lo que realmente se compara), luego misma marca
  const same = P.filter((x) => x !== h && x.g === p.g && x.img).sort((a, b) => ((b.sc === p.sc) - (a.sc === p.sc)) * 2 + ((b.b === p.b) - (a.b === p.b))).slice(0, 5);
  const ri = ROUTE.indexOf(p.g);
  const nextG = ri >= 0 && ri < ROUTE.length - 1 ? gById.get(ROUTE[ri + 1]) : null;
  const next = nextG ? filterProducts({ g: nextG.id }).filter((x) => x.img && x.b).slice(0, 5) : [];
  const out = p.stk === 0, low = p.stk > 0 && p.stk <= 5;
  const logo = LOGOS[p.b];
  document.title = `${p.t} — Reycar Store`;
  return `<section class="page wrap view">
    <div class="crumbs"><a href="/">Inicio</a>${catTrail(g, psc)}<span>${esc(ttl(p))}</span></div>
    <a class="back" href="/tienda?g=${g.id}${psc ? `&sc=${psc.id}` : ''}"><span aria-hidden="true">←</span> ${esc(psc ? psc.name : g.name)}</a>
    <div class="pdp">
      <div class="gal">
        <div class="gal__main${p.img ? ' gal__main--zoom' : ''}" id="galMain"${p.img ? ' data-action="lightbox" role="button" tabindex="0" aria-label="Ampliar foto"' : ''}>
          <div class="gal__img" id="galImg">${p.img ? `<img src="${U(p.im[0][1])}" alt="${esc(p.t)}" fetchpriority="high"${fit(p)}>` : `<span class="ph"><img src="/assets/reycars-crest.webp" alt="" loading="lazy"><small>Foto pronto</small></span>`}</div>
          <div class="gal__tags">${DISC ? `<span class="gal__tag gal__tag--off">−${DISC * 100}% web</span>` : ''}${p.spec ? `<span class="gal__tag">${esc(p.spec)}</span>` : ''}</div>
          ${p.img ? `<span class="gal__zoom" aria-hidden="true">${ico('zoom')}Ampliar</span>` : ''}
        </div>
        ${p.im.length > 1 ? `<div class="gal__thumbs">${p.im.map((im, i) => `<button class="${i ? '' : 'on'}" data-action="gal" data-i="${i}" aria-label="Ver foto ${i + 1}"><img src="${U(im[2] || im[0])}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="info">
        <div class="info__top">
          ${logo ? `<a class="info__logo" href="/tienda?b=${encodeURIComponent(p.b)}" aria-label="Ver productos ${esc(p.b)}"><img class="${logo[1] ? 'fx-' + logo[1] : ''}" src="${logo[0]}" alt=""></a>` : ''}
          <div class="info__meta">${p.b ? `<a class="info__brand" href="/tienda?b=${encodeURIComponent(p.b)}">${esc(p.b)}</a>` : ''}<span class="mono">${esc(g.name)}${p.spec ? ' · ' + esc(p.spec) : ''}</span></div>
          <button class="info__share" data-action="share" aria-label="Compartir producto" title="Compartir">${ico('share')}</button>
        </div>
        <h1>${esc(ttl(p))}</h1>
        <div class="info__price">
          <span class="info__now">${clp(web(p))}</span>${DISC ? `<s class="info__was">${clp(p.p)}</s><span class="info__save">Ahorras ${clp(p.p - web(p))}</span>
          <span class="info__note">Precio web con ${DISC * 100}% de descuento</span>` : ''}
        </div>
        ${h.vs ? `<div class="fmt"><span class="fmt__l">Formato: <b>${esc(p.spec)}</b></span>
          <div class="fmt__opts">${h.vs.map((v) => `<a class="${v === p ? 'on' : ''}" href="/producto/${v.s}"${v === p ? ' aria-current="true"' : ''}><b>${esc(v.spec)}</b><em>${clp(web(v))}</em></a>`).join('')}</div></div>` : ''}
        <div class="stock${out ? ' stock--out' : low ? ' stock--low' : ''}"><i></i>${out ? 'Agotado por ahora' : low ? (p.stk === 1 ? 'Última unidad disponible' : `Quedan ${p.stk} unidades`) : 'En stock'}</div>
        <div class="buy">
          <div class="qty"><button data-action="pdp-qty" data-d="-1" aria-label="Menos">${ico('minus')}</button><output id="pdpQty">1</output><button data-action="pdp-qty" data-d="1" aria-label="Más">${ico('plus')}</button></div>
          <button class="btn btn--red" data-action="add-pdp" data-id="${p.id}"${out ? ' disabled' : ''}>${out ? 'Agotado' : 'Agregar al carro'}</button>
        </div>
        <a class="btn btn--line btn--block buy__wa" href="${wa(`Hola Reycar, tengo una consulta sobre: ${p.t} (${pUrl(headOf(p))})`)}" target="_blank" rel="noopener">${ico('chat')} ¿Dudas? Pregunta por WhatsApp</a>
        <ul class="pdpk">
          <li>${ico('truck')}<span><b>Envío a todo Chile.</b> El costo se calcula al finalizar la compra.</span></li>
          <li>${ico('card')}<span>${CHECKOUT === 'whatsapp' ? '<b>Pedido por WhatsApp:</b> te confirmamos stock, despacho y forma de pago.' : '<b>Pago en línea,</b> con tarjeta o billeteras digitales.'}</span></li>
          <li>${ico('shield')}<span><b>Producto original</b>${p.b ? ` ${esc(p.b)}` : ''}.</span></li>
        </ul>
        ${p.b === MC ? mcStrip() : ''}
        <div class="acc">
          <details open><summary><h2 class="acc__t">Descripción</h2>${ico('plus')}</summary><div class="acc__body">${descHTML(p.d || (h.vs || []).map((v) => v.d).find(Boolean) || '')}</div></details>
          <details><summary><h2 class="acc__t">Ficha técnica</h2>${ico('plus')}</summary><div class="acc__body"><dl class="specs">
            ${p.b ? `<dt>Marca</dt><dd><a href="/tienda?b=${encodeURIComponent(p.b)}">${esc(p.b)}</a></dd>` : ''}
            <dt>Categoría</dt><dd><a href="/tienda?g=${g.id}">${esc(g.name)}</a></dd>
            ${p.spec ? `<dt>Formato</dt><dd>${esc(p.spec)}</dd>` : ''}
            ${p.sku ? `<dt>SKU</dt><dd>${esc(p.sku)}</dd>` : ''}
          </dl></div></details>
        </div>
      </div>
    </div>
    ${next.length ? `<section class="sec"><div class="sh"><div><span class="mono mono--red">Siguiente etapa · ${String(ri + 2).padStart(2, '0')}</span><h2 class="cond">Después: ${esc(nextG.name)}</h2></div><a class="sh__link" href="/tienda?g=${nextG.id}">Ver ${esc(nextG.name.toLowerCase())} ${arrow}</a></div><div class="grid grid--row">${next.map(card).join('')}</div></section>` : ''}
    ${same.length ? `<section class="sec"><div class="sh"><h2 class="cond">También en ${esc(g.name)}</h2><a class="sh__link" href="/tienda?g=${g.id}">Ver todo ${arrow}</a></div><div class="grid grid--row">${same.map(card).join('')}</div></section>` : ''}
  </section>
  <div class="sticky-buy" id="stickyBuy" aria-hidden="true">
    ${p.img ? `<span class="sb__img"><img src="${thumb(p)}" alt=""${fit(p)}></span>` : ''}
    <span class="sb__t"><small>${esc(p.b || g.name)}${h.vs ? ' · ' + esc(p.spec) : ''}</small><b>${esc(ttl(p))}</b></span>
    <b class="sb__p">${clp(web(p))}</b>
    <button class="btn btn--red" data-action="add-pdp" data-id="${p.id}" tabindex="-1"${out ? ' disabled' : ''}>${ico('bag')} ${out ? 'Agotado' : 'Agregar'}</button>
  </div>`;
}

/* ── ficha: lupa, vista ampliada, compartir y barra de compra al bajar ── */

function pdpInit() {
  const main = $('#galMain');
  if (main && main.classList.contains('gal__main--zoom') && matchMedia('(hover: hover)').matches) {
    main.addEventListener('pointermove', (e) => {
      const r = main.getBoundingClientRect();
      main.style.setProperty('--zx', `${((e.clientX - r.left) / r.width) * 100}%`);
      main.style.setProperty('--zy', `${((e.clientY - r.top) / r.height) * 100}%`);
      main.classList.add('zooming');
    });
    main.addEventListener('pointerleave', () => main.classList.remove('zooming'));
  }
  if (main) main.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(); } });
  document.body.classList.remove('sticky-on');
  syncStickyBuy();
}
// la barra de compra aparece cuando el botón "Agregar al carro" ya quedó arriba, fuera de la pantalla
function syncStickyBuy() {
  const box = $('.buy'), bar = $('#stickyBuy');
  if (!box || !bar) return;
  const on = box.getBoundingClientRect().bottom < 0;
  if (bar.classList.contains('is-on') === on) return;
  bar.classList.toggle('is-on', on);
  bar.setAttribute('aria-hidden', !on);
  $$('button', bar).forEach((b) => { b.tabIndex = on ? 0 : -1; });
  document.body.classList.toggle('sticky-on', on);
}
window.addEventListener('scroll', syncStickyBuy, { passive: true });
function openLightbox() {
  const im = $('#galImg img'); if (!im) return;
  const lb = document.createElement('div');
  lb.className = 'lb'; lb.id = 'lightbox';
  lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Foto ampliada');
  lb.innerHTML = `<div class="lb__scrim" data-action="close-lightbox"></div><figure class="lb__fig"><img src="${im.src}" alt="${esc(im.alt)}"><figcaption>${esc(pdp.p.t)}</figcaption></figure><button class="lb__x" data-action="close-lightbox" aria-label="Cerrar">${ico('close')}</button>`;
  document.body.appendChild(lb);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => lb.classList.add('is-open'));
  $('.lb__x', lb).focus();
}
function closeLightbox() {
  const lb = $('#lightbox'); if (!lb) return;
  lb.remove();
  if (!$$('.drawer.is-open').length) document.body.style.overflow = '';
  const m = $('#galMain'); if (m) m.focus();
}
function shareProduct() {
  const p = pdp.p; if (!p) return;
  const text = `${p.t} en Reycar Store`;
  if (navigator.share) navigator.share({ title: text, url: pUrl(headOf(p)) }).catch(() => {});
  else window.open(`https://wa.me/?text=${encodeURIComponent(text + ': ' + pUrl(headOf(p)))}`, '_blank', 'noopener');
}

/* ───────── navegación ───────── */
// una categoría con sus subcategorías plegables (menú del celular y panel de categorías)
const mmGroup = (g) => (g.subs
  ? `<details><summary>${esc(g.name)}<small>${g.count}</small></summary><div class="mm__subs"><a href="/tienda?g=${g.id}">Ver todo ${esc(g.name.toLowerCase())}<small>${g.count}</small></a>${g.subs.map((s) => `<a href="/tienda?g=${g.id}&sc=${s.id}">${esc(s.name)}<small>${s.count}</small></a>`).join('')}</div></details>`
  : `<a href="/tienda?g=${g.id}">${esc(g.name)}<small>${g.count}</small></a>`);
// celular y tablet: tocar Cuidado exterior / interior / Accesorios abre sus subcategorías en vez de saltar a una página
function openCatSheet(key) {
  const x = pById.get(key);
  const g = x ? (x.groups.length === 1 ? gById.get(x.groups[0]) : null) : gById.get(key);
  const title = x ? x.name : g.name;
  const body = !g
    ? `<a class="mm__all" href="${pHref(x)}">Ver todo ${esc(x.short)}<small>${x.count}</small></a>${x.groups.map((id) => mmGroup(gById.get(id))).join('')}`
    : `<a class="mm__all" href="/tienda?g=${g.id}">Ver todo ${esc(x ? x.short : g.name.toLowerCase())}<small>${g.count}</small></a>${(g.subs || []).map((s) => `<a href="/tienda?g=${g.id}&sc=${s.id}">${esc(s.name)}<small>${s.count}</small></a>`).join('')}`;
  $('#catSheetTitle').textContent = title;
  $('#catSheetBody').innerHTML = `<div class="mm"><nav class="mm__list" aria-label="${esc(title)}">${body}</nav></div>`;
  openOverlay('#catSheet');
}
const wideMQ = window.matchMedia ? matchMedia('(min-width: 1101px)') : { matches: true };
function buildChrome() {
  const subLinks = (g) => g.subs.map((s) => `<a href="/tienda?g=${g.id}&sc=${s.id}">${esc(s.name)} <small>${s.count}</small></a>`).join('');
  const ddItem = (g, label, attr) => (g.subs
    ? `<div class="cats__item"><a href="/tienda?g=${g.id}" ${attr} aria-haspopup="true">${esc(label)}</a>
        <div class="cats__dd"><a class="cats__all" href="/tienda?g=${g.id}">Ver todo ${esc(g.name.toLowerCase())} <small>${g.count}</small></a>${subLinks(g)}</div></div>`
    : `<a href="/tienda?g=${g.id}" ${attr}>${esc(label)}</a>`);
  // escritorio: Cuidado exterior abre un panel con todas sus categorías y subcategorías en columnas
  const megaItem = (x) => `<div class="cats__item cats__item--mega"><a href="${pHref(x)}" data-p="${x.id}" aria-haspopup="true">${esc(x.name)}</a>
      <div class="cats__dd cats__mega">
        <div class="cats__cols">${x.groups.map((id) => { const g = gById.get(id); return `<div class="cats__col"><a class="cats__gh" href="/tienda?g=${id}">${esc(g.name)} <small>${g.count}</small></a>${(g.subs || []).map((s) => `<a href="/tienda?g=${id}&sc=${s.id}">${esc(s.name)}</a>`).join('')}</div>`; }).join('')}
        <a class="cats__allcell" href="${pHref(x)}"><span>Ver todo</span><b>${esc(x.name)}</b><small>${x.count} productos ${arrow}</small></a></div></div></div>`;
  const rest = G.filter((g) => !parentOf.has(g.id) && g.id !== 'servicios' && g.id !== 'cursos');
  $('#cats').innerHTML = PARENTS.map((x) => (x.groups.length > 1 ? megaItem(x) : ddItem(gById.get(x.groups[0]), x.name, `data-p="${x.id}"`))).join('')
    + rest.map((g) => ddItem(g, g.name, `data-g="${g.id}"`)).join('')
    + `<a href="/tienda" data-all="1">Todo el catálogo</a><a class="cats__mc" href="/motor-clean" data-r="motor-clean">Motor Clean</a>`
    + `<span class="cats__sp"></span><a href="/marcas" data-r="marcas">Marcas</a><a class="cats__svc" href="/asesoria" data-r="asesoria">Servicios de taller</a>`;
  $('#ftCats').insertAdjacentHTML('beforeend', PARENTS.map((x) => `<a href="${pHref(x)}">${esc(x.name)}</a>`).join('') + rest.map((g) => `<a href="/tienda?g=${g.id}">${esc(g.name)}</a>`).join('') + '<a href="/motor-clean">Motor Clean</a><a href="/tienda">Todo el catálogo</a>');
  $$('#cats .cats__item').forEach((it) => {
    const top = it.firstElementChild;
    // el nombre de la categoría no navega: en escritorio deja el panel abierto, en celular abre la hoja de subcategorías
    top.addEventListener('click', (e) => {
      e.preventDefault();
      if (wideMQ.matches) { it.classList.remove('is-closed'); top.focus(); } else openCatSheet(top.dataset.p || top.dataset.g);
    });
    it.addEventListener('click', (e) => { const a = e.target.closest('.cats__dd a'); if (a) { it.classList.add('is-closed'); a.blur(); } });
    it.addEventListener('mouseleave', () => it.classList.remove('is-closed'));
  });
  // menú del celular: categorías agrupadas por madre, cada una con sus subcategorías
  $('#mobileMenuBody').innerHTML = `<div class="mm">
    <nav class="mm__list" aria-label="Categorías">
      ${PARENTS.map((x) => `<a class="mm__h" href="${pHref(x)}">${esc(x.name)}<small>Ver todo</small></a>${x.groups.length === 1
        ? (gById.get(x.groups[0]).subs || []).map((s) => `<a href="/tienda?g=${x.groups[0]}&sc=${s.id}">${esc(s.name)}<small>${s.count}</small></a>`).join('')
        : x.groups.map((id) => mmGroup(gById.get(id))).join('')}`).join('')}
      <span class="mm__h">Más</span>${G.filter((g) => !parentOf.has(g.id) && g.id !== 'servicios').map(mmGroup).join('')}
    </nav>
    <div class="mm__links">
      <a class="mm__mc" href="/motor-clean">Motor Clean <small>Marca destacada</small></a>
      <a href="/tienda">Todo el catálogo <small>${P.length}</small></a>
      <a href="/marcas">Marcas <small>${BRANDS.length}</small></a>
      <a class="mm__svc" href="/asesoria">Servicios de taller <small>Quinta Normal</small></a>
      <a href="${wa('Hola Reycar, necesito asesoría')}" target="_blank" rel="noopener">Asesoría por WhatsApp <small>+56 9 6355 5437</small></a>
    </div>
  </div>`;
}
function markNav() {
  const seg = curPath().split('/'), qs = location.search;
  const r = seg[1] || '';
  const prod = r === 'producto' ? bySlug.get(safeDec(seg[2] || '')) : null;
  const g = (qs.match(/[?&]g=([^&]+)/) || [])[1] || (prod && prod.g);
  const pp = (qs.match(/[?&]p=([^&]+)/) || [])[1] || (parentOf.get(g) || {}).id;
  const shopping = r === 'tienda' || !!prod;
  $$('#cats > a, #cats > .cats__item > a').forEach((a) => a.classList.toggle('on', !!(
    (a.dataset.g && a.dataset.g === g && shopping) || (a.dataset.p && a.dataset.p === pp && shopping)
    || (a.dataset.all && shopping && !g && !pp) || (a.dataset.r && a.dataset.r === r))));
  // la categoría activa visible en la barra de chips (móvil)
  const on = $('#cats a.on');
  if (on) { const c = $('#cats'); c.scrollTo({ left: on.offsetLeft - 16, behavior: 'smooth' }); }
}

/* ───────── direcciones reales: /tienda, /producto/<nombre>, /marcas… ─────────
   Los enlaces internos se resuelven sin recargar (history.pushState). Las direcciones antiguas con #/ se
   convierten al cargar, así los enlaces ya compartidos siguen funcionando. */
const curPath = () => location.pathname.replace(/\/+$/, '') || '/';
const VIEWS = ['tienda', 'producto', 'marcas', 'asesoria', 'motor-clean'];
function navigate(url, replace) {
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  route();
}
const main = $('#main');
let lastRoute = '';
function route() {
  const qs = location.search.slice(1);
  const seg = curPath().split('/').filter(Boolean);
  const name = seg[0] || 'home';
  if (document.activeElement && document.activeElement.closest('#cats')) document.activeElement.blur(); // cierra el panel de categorías
  closeSearch(); closeOverlay('#mobileMenu', true); closeOverlay('#catSheet', true); closeOverlay('#drawer', true);
  document.body.classList.remove('filters-open');
  document.body.classList.toggle('is-catalog', name === 'tienda');
  if (typeof showHeader === 'function') showHeader();

  if (name === 'tienda' && lastRoute === 'tienda' && $('#shopRoot')) {
    shop.params = parseQuery(qs); shop.shown = PAGE; drawShop(); setMeta(name); window.scrollTo(0, 0); track('pageView'); return;
  }
  document.title = 'Reycar Store — Detailing automotriz profesional';
  const fromFam = lastRoute === 'producto' && pdp.p ? headOf(pdp.p) : null, y = window.scrollY;
  let html;
  if (name === 'tienda') html = viewShop(parseQuery(qs));
  else if (name === 'producto') html = viewProduct(safeDec(seg[1] || ''));
  else if (name === 'marcas') html = viewBrands();
  else if (name === 'asesoria') html = viewServices();
  else if (name === 'motor-clean') html = viewMC(parseQuery(qs));
  else if (name === 'home') html = viewHome();
  else html = view404();
  main.innerHTML = html;
  lastRoute = name;
  document.body.classList.toggle('has-sticky', name === 'producto');
  if (name === 'tienda') drawShop();
  markNav();
  $$('.bc__logo').forEach((i) => { if (i.complete) fitLogo(i); }); // logos ya en caché
  window.scrollTo(0, name === 'producto' && fromFam && pdp.p && headOf(pdp.p) === fromFam ? y : 0); // cambio de formato: no saltar arriba
  observeReveals();
  cfInit();
  crestInit();
  if (name === 'producto' && pdp.p) pdpInit();
  setMeta(name);
  if (location.hash.length > 1) { const el = document.getElementById(location.hash.slice(1)); if (el) setTimeout(() => el.scrollIntoView(), 0); }
  track('pageView');
  if (name === 'producto' && pdp.p) track('viewItem', tItem(pdp.p));
}

/* ───────── carrusel de la portada ───────── */
const reduceMotion = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const cf = { i: 0, n: 0, timer: null, paused: false };
const cfMobile = () => matchMedia('(max-width: 820px)').matches;   // en celular el carrusel se desliza con el dedo
// marca la diapositiva activa (puntos, accesibilidad)
function cfMark(root, slides) {
  slides.forEach((s, k) => {
    s.classList.toggle('is-on', k === cf.i);
    s.setAttribute('aria-hidden', k !== cf.i);
  });
  $$('.cf__dots button', root).forEach((b, k) => b.classList.toggle('on', k === cf.i));
}
function cfSet(i) {
  const root = $('#cf'); if (!root) return;
  const slides = $$('.cf__s', root);
  cf.n = slides.length; cf.i = ((i % cf.n) + cf.n) % cf.n;
  if (cfMobile()) {
    const tr = $('.cf__track', root), s = slides[cf.i];
    cfMark(root, slides);
    if (tr && s && !cf.fromScroll) tr.scrollTo({ left: s.offsetLeft - (tr.clientWidth - s.offsetWidth) / 2, behavior: 'smooth' });
    return;
  }
  slides.forEach((s, k) => {
    let d = k - cf.i;
    if (d > cf.n / 2) d -= cf.n;
    if (d < -cf.n / 2) d += cf.n;
    const ad = Math.min(Math.abs(d), 4);
    const x = Math.sign(d) * [0, 74, 138, 194, 240][ad];
    const sc = [1, 0.8, 0.66, 0.54, 0.45][ad];
    s.style.transform = `translateX(${x}%) scale(${sc})`;
    s.style.opacity = ad > 2 ? 0 : 1;
    s.style.filter = ['none', 'brightness(.9)', 'brightness(.6)', 'none', 'none'][ad];
    s.style.zIndex = 10 - ad;
    s.style.pointerEvents = ad > 1 ? 'none' : 'auto';
    s.style.visibility = ad > 2 ? 'hidden' : '';
    s.classList.toggle('is-on', d === 0);
    s.setAttribute('aria-hidden', d !== 0);
    $$('a,button', s).forEach((el) => { el.tabIndex = d === 0 && !el.classList.contains('cf__tile') ? 0 : -1; });
  });
  $$('.cf__dots button', root).forEach((b, k) => b.classList.toggle('on', k === cf.i));
}
function cfPlay() {
  clearInterval(cf.timer);
  if (reduceMotion.matches || !$('#cf') || cfMobile()) return;
  cf.timer = setInterval(() => { if (!cf.paused && !document.hidden) cfSet(cf.i + 1); }, 5500);
}
function cfInit() {
  clearInterval(cf.timer);
  const root = $('#cf'); if (!root) return;
  cf.paused = false;
  cfSet(0); cfPlay();
  // celular: al deslizar se actualizan los puntos; al cambiar entre celular y escritorio se reacomoda
  const tr = $('.cf__track', root);
  if (tr) tr.addEventListener('scroll', () => {
    if (!cfMobile()) return;
    clearTimeout(cf.st);
    cf.st = setTimeout(() => {
      const slides = $$('.cf__s', root), mid = tr.scrollLeft + tr.clientWidth / 2;
      let best = 0, bd = Infinity;
      slides.forEach((el, k) => { const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
      cf.i = best; cfMark(root, slides);
    }, 60);
  }, { passive: true });
  matchMedia('(max-width: 820px)').addEventListener('change', () => { cfSet(cf.i); cfPlay(); });
  root.addEventListener('mouseenter', () => { cf.paused = true; });
  root.addEventListener('mouseleave', () => { cf.paused = false; });
  root.addEventListener('focusin', () => { cf.paused = true; });
  root.addEventListener('focusout', () => { cf.paused = false; });
  // deslizar con el dedo
  let x0 = null;
  root.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  root.addEventListener('pointerup', (e) => {
    if (x0 === null || cfMobile()) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) { cf.swiped = true; setTimeout(() => { cf.swiped = false; }, 350); cfSet(cf.i + (dx < 0 ? 1 : -1)); cfPlay(); }
  });
  // un clic en un producto lateral lo trae al centro en vez de abrir la ficha
  root.addEventListener('click', (e) => {
    if (cfMobile()) return;
    if (cf.swiped) { cf.swiped = false; e.preventDefault(); e.stopPropagation(); return; }
    const s = e.target.closest('.cf__s');
    if (s && !s.classList.contains('is-on')) { e.preventDefault(); e.stopPropagation(); cfSet(+s.dataset.i); cfPlay(); }
  }, true);
}

/* aparición suave al hacer scroll */
let io;
function observeReveals() {
  const els = $$('.rv:not(.in)');
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  if (io) io.disconnect();
  io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
  els.forEach((e) => io.observe(e));
}

/* tema claro / oscuro: sigue al sistema hasta que la persona elige */
const darkMQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyMode() {
  const root = document.documentElement;
  const mode = root.dataset.theme || (darkMQ && darkMQ.matches ? 'dark' : 'light');
  root.dataset.mode = mode;
  const meta = $('meta[name="theme-color"]'); if (meta) meta.content = mode === 'dark' ? '#09090b' : '#f6f3ef';
  const btn = $('.hd__theme'); if (btn) btn.setAttribute('aria-label', mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
}
function toggleTheme() {
  const next = document.documentElement.dataset.mode === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('reycars-theme', next); } catch (e) { /* modo privado */ }
  applyMode();
}
if (darkMQ && darkMQ.addEventListener) darkMQ.addEventListener('change', applyMode);

/* móvil: la cabecera se esconde al bajar y vuelve al subir; --hd-off le dice a otras barras fijas dónde quedar */
const mobileMQ = window.matchMedia ? matchMedia('(max-width: 820px)') : { matches: false };
const head = $('#head');
let lastY = window.scrollY;
function setHeader(hidden) {
  head.classList.toggle('hd--hidden', hidden);
  document.documentElement.style.setProperty('--hd-off', hidden ? '0px' : head.offsetHeight + 'px');
}
function showHeader() { setHeader(false); }
window.addEventListener('scroll', () => {
  const y = window.scrollY, dy = y - lastY;
  if (Math.abs(dy) < 6) return;
  const typing = head.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
  setHeader(mobileMQ.matches && !typing && dy > 0 && y > 140);
  lastY = y;
}, { passive: true });
window.addEventListener('resize', () => setHeader(head.classList.contains('hd--hidden') && mobileMQ.matches));
// footer: acordeones cerrados en móvil, abiertos en escritorio
function syncFooter() { $$('.ft__col').forEach((d) => { d.open = !mobileMQ.matches; }); }
if (mobileMQ.addEventListener) mobileMQ.addEventListener('change', syncFooter);
// el carrusel de la portada solo existe en pantallas grandes: al cruzar el límite se vuelve a dibujar el inicio
if (mobileMQ.addEventListener) mobileMQ.addEventListener('change', () => { if (lastRoute === 'home') route(); });

/* ───────── overlays ───────── */
function openOverlay(sel) {
  const el = $(sel); el.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-open')));
  document.body.style.overflow = 'hidden';
}
function closeOverlay(sel, instant) {
  const el = $(sel); if (!el || el.hidden) return;
  el.classList.remove('is-open');
  const done = () => { el.hidden = true; if (!$$('.drawer.is-open').length) document.body.style.overflow = ''; };
  if (instant) done(); else setTimeout(done, 380);
}
function toast(msg) {
  const t = $('#toast');
  t.innerHTML = `<i></i><span>${esc(msg)}</span>`;
  t.classList.add('on'); clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('on'), 2400);
}

/* ───────── buscador (en el header) ───────── */
const sInput = $('#searchInput'), sDrop = $('#sdrop');
let sIdx = -1;
function hi(txt, q) {
  const w = norm(q.trim().split(/\s+/)[0] || ''); const i = w ? norm(txt).indexOf(w) : -1;
  return i < 0 ? esc(txt) : esc(txt.slice(0, i)) + '<mark>' + esc(txt.slice(i, i + w.length)) + '</mark>' + esc(txt.slice(i + w.length));
}
function drawSearch(q) {
  q = q.trim(); sIdx = -1;
  if (!q) {
    sDrop.innerHTML = `<div class="sh-l">Búsquedas frecuentes</div>
      <div class="sugs">${['Shampoo', 'Cerámico', 'Microfibra', 'Pad', 'Compuesto', 'Aromatizante', 'Neumáticos', 'Meguiars', 'Koch'].map((s) => `<a href="/tienda?q=${encodeURIComponent(s)}">${s}</a>`).join('')}</div>
      <div class="sh-l">Categorías</div>
      ${[...PARENTS.map((x) => [pHref(x), x.name, x.count]), ...G.filter((g) => !parentOf.has(g.id) && g.id !== 'servicios' && g.id !== 'cursos').map((g) => [`/tienda?g=${g.id}`, g.name, g.count]), ['/motor-clean', 'Motor Clean', mcAll().length]]
        .map(([h, n, c]) => `<a class="sr sr--text" href="${h}"><div class="sr__t">${esc(n)}</div><span class="sr__s">${c}</span></a>`).join('')}`;
    return;
  }
  const all = filterProducts({ q });
  const nq = norm(q);
  const gs = G.filter((g) => norm(g.name).includes(nq)).slice(0, 2);
  const ss = [...scById.values()].filter((s) => norm(s.name).includes(nq)).slice(0, 3);
  const bs = BRANDS.filter((b) => norm(b.name).includes(nq)).slice(0, 2);
  const top = all.slice(0, 6);
  if (!top.length && !gs.length && !bs.length && !ss.length) {
    sDrop.innerHTML = `<div class="sempty"><b>Sin resultados para «${esc(q)}»</b>Prueba con otra palabra o <a href="${wa('Hola Reycar, busco: ' + q)}" target="_blank" rel="noopener" style="text-decoration:underline">pregúntanos por WhatsApp</a>.</div>`;
    return;
  }
  sDrop.innerHTML =
    (gs.length || bs.length || ss.length ? `<div class="sh-l">Ir a</div>${ss.map((s) => `<a class="sr sr--text" href="/tienda?g=${s.g}&sc=${s.id}"><div class="sr__t">${hi(s.name, q)}</div><span class="sr__s">${esc(gById.get(s.g).name)} · ${s.count}</span></a>`).join('')}${gs.map((g) => `<a class="sr sr--text" href="/tienda?g=${g.id}"><div class="sr__t">${hi(g.name, q)}</div><span class="sr__s">Categoría · ${g.count}</span></a>`).join('')}${bs.map((b) => `<a class="sr sr--text" href="/tienda?b=${encodeURIComponent(b.name)}"><div class="sr__t">${hi(b.name, q)}</div><span class="sr__s">Marca · ${b.n}</span></a>`).join('')}` : '') +
    (top.length ? `<div class="sh-l">Productos</div>${top.map((p) => `<a class="sr" href="/producto/${p.s}"><span class="sr__img">${p.img ? `<img src="${thumb(p)}" alt=""${fit(p)}>` : ''}</span><div><div class="sr__t">${hi(ttl(p), q)}</div><div class="sr__s">${esc(p.b || gById.get(p.g).name)}${p.vs ? ' · ' + p.vs.map((v) => esc(v.spec)).join(' / ') : p.spec ? ' · ' + esc(p.spec) : ''}</div></div><span class="sr__p">${clp(web(p))}</span></a>`).join('')}` : '') +
    (all.length > top.length ? `<a class="sr sr--text" href="/tienda?q=${encodeURIComponent(q)}"><div class="sr__t">Ver los ${all.length} resultados ${arrow}</div></a>` : '');
}
function openSearch() { drawSearch(sInput.value); sDrop.hidden = false; }
function closeSearch() { sDrop.hidden = true; sIdx = -1; }
function moveSearch(d) {
  const items = $$('.sr', sDrop); if (!items.length) return;
  sIdx = (sIdx + d + items.length) % items.length;
  items.forEach((el, i) => el.classList.toggle('is-active', i === sIdx));
  items[sIdx].scrollIntoView({ block: 'nearest' });
}
sInput.addEventListener('focus', openSearch);
sInput.addEventListener('input', () => { drawSearch(sInput.value); sDrop.hidden = false; });
sInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); if (sDrop.hidden) openSearch(); moveSearch(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveSearch(-1); }
  else if (e.key === 'Enter' && sIdx >= 0) { e.preventDefault(); $$('.sr', sDrop)[sIdx].click(); sInput.blur(); }
  else if (e.key === 'Escape') { closeSearch(); sInput.blur(); }
});
sDrop.addEventListener('mousedown', (e) => e.preventDefault()); // mantiene el foco al hacer clic en un resultado
sDrop.addEventListener('click', (e) => { if (e.target.closest('a')) { closeSearch(); sInput.blur(); } });
sInput.addEventListener('blur', () => setTimeout(closeSearch, 120));
$('#hdSearch').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = sInput.value.trim(); if (!q) return;
  track('search', q);
  navigate('/tienda?q=' + encodeURIComponent(q));
  closeSearch(); sInput.blur();
});

/* ───────── eventos ───────── */
document.addEventListener('click', (e) => {
  if (e.target.closest('a[href^="https://wa.me"]')) track('contact', 'whatsapp');
  const t = e.target.closest('[data-action]'); if (!t) return;
  const a = t.dataset.action, id = +t.dataset.id;
  switch (a) {
    case 'card-fmt': cardFmt(t); break;
    case 'add': {
      const p = addToCart(id);
      const lbl = t.querySelector('.pc__addt');
      t.classList.add('ok'); if (lbl) lbl.textContent = 'Agregado';
      clearTimeout(t._t); t._t = setTimeout(() => { t.classList.remove('ok'); if (lbl) lbl.innerHTML = ADD_LABEL; }, 1400);
      toast(`Agregado: ${p.t}`);
      break;
    }
    case 'add-pdp': addToCart(id, pdp.qty); drawCart(); openOverlay('#drawer'); break;
    case 'pdp-qty': pdp.qty = Math.max(1, Math.min(maxQty(pdp.p) || 1, pdp.qty + +t.dataset.d)); $('#pdpQty').textContent = pdp.qty; break;
    case 'gal': {
      const i = +t.dataset.i;
      $('#galImg').innerHTML = `<img src="${U(pdp.p.im[i][1])}" alt="${esc(pdp.p.t)}"${i ? '' : fit(pdp.p)}>`;
      $$('.gal__thumbs button').forEach((b, j) => b.classList.toggle('on', j === i));
      break;
    }
    case 'tab': {
      homeTab = t.dataset.t;
      $$('.tabs button').forEach((b) => { const on = b.dataset.t === homeTab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      $('#homeGrid').innerHTML = tabItems(homeTab).map(card).join('');
      break;
    }
    case 'theme': toggleTheme(); break;
    case 'cf': cfSet(cf.i + +t.dataset.d); cfPlay(); break;
    case 'cf-go': cfSet(+t.dataset.i); cfPlay(); break;
    case 'lightbox': openLightbox(); break;
    case 'close-lightbox': closeLightbox(); break;
    case 'share': shareProduct(); break;
    case 'open-cart': drawCart(); openOverlay('#drawer'); track('viewCart', cartItemsT()); break;
    case 'close-cart': closeOverlay('#drawer'); break;
    case 'qty': setQty(id, (cart[id] || 0) + +t.dataset.d); break;
    case 'rm': setQty(id, 0); break;
    case 'checkout': {
      if (!cartCount()) break;
      track('beginCheckout', cartItemsT());
      // pedido por WhatsApp: cada línea con nombre, formato, cantidad, SKU y total, para preparar la boleta en Bsale
      const lines = Object.entries(cart).map(([id, q]) => { const p = byId.get(+id); return `• ${q} × ${ttl(p)}${headOf(p).vs ? ` (${p.spec})` : ''} — ${clp(web(p) * q)} [SKU ${p.sku}]`; });
      window.open(wa(`Hola Reycar, quiero hacer este pedido:\n${lines.join('\n')}\nSubtotal: ${clp(cartTotal())} (sin despacho)\n\nMi nombre:\nComuna de despacho o retiro en tienda:\nBoleta o factura (RUT):`), '_blank', 'noopener');
      break;
    }
    case 'open-menu': openOverlay('#mobileMenu'); break;
    case 'close-menu': closeOverlay('#mobileMenu'); break;
    case 'close-cats': closeOverlay('#catSheet'); break;
    case 'set-group': setParams({ g: t.dataset.g, sc: '', p: '' }); break;
    case 'set-parent': { const x = pById.get(t.dataset.p); setParams(x.groups.length > 1 ? { p: x.id, g: '', sc: '' } : { g: x.groups[0], p: '', sc: '' }); break; }
    case 'set-sub': setParams({ sc: t.dataset.sc }); break;
    case 'rm-tag': {
      const k = t.dataset.k;
      if (k === 'g') setParams({ g: '', sc: '' });
      else if (k === 'p') setParams({ p: '' });
      else if (k === 'sc') setParams({ sc: '' });
      else if (k === 'q') setParams({ q: '' });
      else if (k === 'price') setParams({ min: '', max: '' });
      else { const b = k.slice(2); setParams({ b: (shop.params.b || '').split(',').filter((x) => x && x !== b).join(',') }); }
      break;
    }
    case 'clear-filters': setParams({ p: '', g: '', sc: '', b: '', q: '', min: '', max: '' }); break;
    case 'more': shop.shown += PAGE; drawResults(); break;
    case 'all-brands': shop.allBrands = true; drawShop(); break;
    case 'open-filters': $('#filters').classList.add('open'); document.body.classList.add('filters-open'); break;
    case 'close-filters': $('#filters').classList.remove('open'); document.body.classList.remove('filters-open'); break;
    case 'focus-search': showHeader(); sInput.focus({ preventScroll: true }); openSearch(); break;
    case 'tsteps': {
      const ol = $('#tsteps'); const open = !ol.classList.contains('open');
      ol.classList.toggle('open', open); t.setAttribute('aria-expanded', open);
      t.textContent = open ? 'Ver menos' : `Ver los ${ol.children.length} pasos del proceso`;
      break;
    }
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.matches('[data-action="toggle-brand"]')) {
    const cur = new Set((shop.params.b || '').split(',').filter(Boolean));
    if (t.checked) cur.add(t.value); else cur.delete(t.value);
    setParams({ b: [...cur].join(',') });
  } else if (t.matches('[data-action="sort"]')) setParams({ sort: t.value === 'rel' ? '' : t.value });
  else if (t.matches('[data-price]')) setParams({ [t.dataset.price]: t.value });
});
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) { e.preventDefault(); sInput.focus(); }
  else if (e.key === 'Escape') { closeLightbox(); closeOverlay('#drawer'); closeOverlay('#mobileMenu'); closeOverlay('#catSheet'); const f = $('#filters'); if (f) f.classList.remove('open'); document.body.classList.remove('filters-open'); }
});
// fotos que no cargan -> placeholder
document.addEventListener('load', (e) => { if (e.target.classList && e.target.classList.contains('bc__logo')) fitLogo(e.target); }, true);
document.addEventListener('error', (e) => {
  const im = e.target;
  if (im.tagName === 'IMG' && !im.dataset.fb && im.closest('.pc__img,.gal__main')) {
    im.dataset.fb = 1;
    im.replaceWith(Object.assign(document.createElement('span'), { className: 'ph', textContent: 'Reycar' }));
  }
}, true);
// enlaces internos sin recargar la página; las anclas (#contacto, #main) y los enlaces externos quedan normales
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || a.hasAttribute('download')) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || /^\/(api|assets|data)\//.test(u.pathname) || /\.[a-z0-9]{2,4}$/i.test(u.pathname)) return;
  if (u.pathname === location.pathname && u.search === location.search && u.hash) return;
  e.preventDefault();
  navigate(u.pathname + u.search + u.hash);
});
window.addEventListener('popstate', route);
// direcciones antiguas con #/ (enlaces compartidos antes del cambio)
window.addEventListener('hashchange', () => { if (location.hash.startsWith('#/')) navigate(location.hash.slice(1), true); });
if (location.hash.startsWith('#/')) history.replaceState(null, '', location.hash.slice(1));
applyMode();
buildChrome();
// barra de categorías: el degradado de la derecha solo aparece si queda algo por deslizar
const catsEl = $('#cats');
const fadeCats = () => catsEl.classList.toggle('is-fade', catsEl.scrollWidth > catsEl.clientWidth + 2 && catsEl.scrollLeft + catsEl.clientWidth < catsEl.scrollWidth - 2);
catsEl.addEventListener('scroll', fadeCats, { passive: true });
window.addEventListener('resize', fadeCats);
fadeCats();
syncFooter();
updateCartUI();
// primero el stock real (máx. 1,5 s), luego se dibuja; después se refresca en silencio cada minuto
syncStock().then((ok) => {
  if (ok) fitCartToStock();
  route();
  setInterval(() => { if (!document.hidden) syncStock(4000).then((o) => { if (o) fitCartToStock(); }); }, STOCK_EVERY);
});
/* si un equipo en modo completo anda lento (menos de ~38 cuadros por segundo), pasa solo al modo liviano */
(function watchFps() {
  const root = document.documentElement;
  if (root.dataset.perf !== 'full' || reduceMotion.matches) return;
  setTimeout(() => {
    if (document.hidden) return;
    let last = performance.now(), start = last, t = [];
    const f = (n) => {
      t.push(n - last); last = n;
      if (n - start < 2500) { requestAnimationFrame(f); return; }
      t = t.slice(5).sort((x, y) => x - y);
      if (t.length && t[Math.floor(t.length / 2)] > 26) {
        root.dataset.perf = 'lite';
        try { localStorage.setItem('reycar-perf', 'lite'); } catch (e) { /* modo privado */ }
      }
    };
    requestAnimationFrame(f);
  }, 1500);
})();

/* Solo para el panel de pruebas (?track=debug): muestra cómo viajaría una compra confirmada.
   En la tienda real, Purchase se dispara desde el servidor cuando el pago ya está confirmado. */
window.__reycarSimulatePurchase = () => {
  const items = cartItemsT();
  track('purchase', { id: 'SIMULADO-' + Date.now().toString(36), items: items.length ? items : [tItem(P[0])], shipping: 0 });
};
})();
