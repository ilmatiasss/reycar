/* Reycar Store — prototipo del rediseño (vanilla JS, sin build) */
(() => {
'use strict';

const P = window.PRODUCTS;
const G = window.GROUPS;
const DISC = 0.05;               // descuento web que el sitio actual ya muestra en todos los productos
const WA = '56963555437';
const IMG_BASE = 'https://reycarstore.cl/wp-content/uploads/';
const PAGE = 24;
const ROUTE = ['lavado', 'secado', 'descontaminacion', 'pulido', 'proteccion', 'interior']; // orden del proceso

/* ───────── utilidades ───────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clp = (n) => '$' + Math.round(n).toLocaleString('es-CL');
const web = (p) => Math.round(p.p * (1 - DISC));
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
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 002.5 2.5"/>',
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

/* ───────── datos derivados ───────── */
const byId = new Map(P.map((p) => [p.id, p]));
const bySlug = new Map(P.map((p) => [p.s, p]));
const gById = new Map(G.map((g) => [g.id, g]));
G.forEach((g) => { g.count = 0; });
P.forEach((p) => {
  gById.get(p.g).count++;
  p._q = norm([p.n, p.b, gById.get(p.g).name, p.c.join(' ')].join(' '));
  p.img = p.im && p.im[0] ? U(p.im[0][0]) : null;
  p.spec = specOf(p.n);
  p.t = niceName(p.n);
});
const brandCount = {};
P.forEach((p) => { if (p.b) brandCount[p.b] = (brandCount[p.b] || 0) + 1; });
const BRANDS = Object.entries(brandCount).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));

// formato del producto leído desde el nombre (473 ml, 5 L, 40×40 cm, 5″…)
function specOf(n) {
  let m;
  if ((m = n.match(/(\d+(?:[.,]\d+)?)\s*(ml|cc)\b/i))) return `${m[1]} ml`;
  if ((m = n.match(/(\d+(?:[.,]\d+)?)\s*(litros?|lts?)\b/i)) || (m = n.match(/(\d+(?:[.,]\d+)?)\s*l\b\.?/i))) return parseFloat(m[1]) > 50 ? `${m[1]} ml` : `${m[1]} L`; // "500 L" en un frasco = 500 ml
  // medidas solo en paños/toallas o con "cm" explícito (en pads "5,5 x 1" son pulgadas)
  if ((m = n.match(/(?<![\d.])(\d{2,3})\s*[x×]\s*(\d{2,3})\s*(cm)?/i)) && (m[3] || /toalla|pa[ñn]o|microfibra|towel/i.test(n))) return `${m[1]}×${m[2]} cm`;
  if ((m = n.match(/(\d+(?:[.,]\d+)?)\s*(kg|gr?)\b/i))) return `${m[1]} ${/kg/i.test(m[2]) ? 'kg' : 'g'}`;
  if ((m = n.match(/(\d+(?:[.,]\d+)?)\s*oz\b/i))) return `${m[1]} oz`;
  if ((m = n.match(/(?<![x×]\s?)(?<![\d.,])(\d+(?:[.,]\d+)?)\s*(″|"|“|”)/i))) return `${m[1]}″`;
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
    const r = await fetch('/api/stock', { cache: 'no-store', signal: AbortSignal.timeout(timeout) });
    if (!r.ok) return false;
    const j = await r.json();
    if (j.source !== 'bsale' || !j.stock) return false;
    let hits = 0;
    P.forEach((p) => {
      const q = j.stock[String(p.sku)];
      if (q === undefined) return;          // no está en Bsale: conserva el stock del catálogo
      hits++; p.stk = q;
    });
    console.info(`[stock] Bsale: ${hits} de ${P.length} productos coinciden por SKU${j.stale ? ' (datos con retraso)' : ''}`);
    return true;
  } catch (e) { return false; }
}

/* ───────── carro ───────── */
let cart = {};
try { cart = JSON.parse(localStorage.getItem('reycars-cart') || '{}'); } catch (e) { cart = {}; }
Object.keys(cart).forEach((id) => { if (!byId.has(+id)) delete cart[id]; });
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
    body.innerHTML = `<div class="cart-empty"><h4>Tu carro está vacío</h4><p>Agrega productos y aparecerán aquí.</p></div>`;
    foot.innerHTML = `<a class="btn btn--dark btn--block" href="#/tienda" data-action="close-cart">Ir a la tienda</a>`;
    return;
  }
  body.innerHTML = ids.map((id) => {
    const p = byId.get(+id), q = cart[id];
    return `<div class="ci">
      <a class="ci__img" href="#/producto/${p.s}" data-action="close-cart">${p.img ? `<img src="${thumb(p)}" alt="">` : ''}</a>
      <div class="ci__b">
        <small>${esc(p.b || gById.get(p.g).name)}${p.spec ? ' · ' + esc(p.spec) : ''}</small>
        <a href="#/producto/${p.s}" data-action="close-cart">${esc(p.t)}</a>
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
    <div class="sum"><div>Subtotal<small>Envío calculado al finalizar la compra</small></div><b>${clp(cartTotal())}</b></div>
    <button class="btn btn--red btn--block" data-action="checkout">Finalizar compra ${arrow}</button>
    <div class="cart-perks"><span>Envíos a todo Chile</span><span>Webpay y tarjetas</span><span>Productos originales</span></div>`;
}

/* ───────── componentes ───────── */
const ADD_LABEL = 'Agregar<span class="pc__addx"> al carro</span>'; // en móvil se acorta a "Agregar"

/* ── calculadora de rendimiento: usa solo diluciones indicadas por el fabricante (data/dilutions.js) ── */
const DIL = window.DILUTIONS || {};
const MIX = {
  spray5: { l: 'Pulverizador 500 ml', ml: 500, one: 'pulverizador', many: 'pulverizadores' },
  spray1: { l: 'Pulverizador 1 L', ml: 1000, one: 'pulverizador', many: 'pulverizadores' },
  foam: { l: 'Lanza de espuma 1 L', ml: 1000, one: 'carga de lanza', many: 'cargas de lanza' },
  balde4: { l: 'Balde 4 L', ml: 4000, one: 'balde', many: 'baldes' },
  balde10: { l: 'Balde 10 L', ml: 10000, one: 'balde', many: 'baldes' },
  maq: { l: 'Máquina de tapiz 4 L', ml: 4000, one: 'carga de máquina', many: 'cargas de máquina' },
};
const WASH_MIX = ['foam', 'balde4', 'balde10'];
const nOf = (o) => (o.ml ? o.water / o.ml : o.n != null ? o.n : o.min);
const ratioTxt = (n) => (n === 0 ? 'Puro' : `1:${Math.round(n * 10) / 10}`);
const fmtMl = (x) => (x >= 1000 ? `${(Math.round(x / 10) / 100).toLocaleString('es-CL')} L` : `${(x < 10 ? Math.round(x * 10) / 10 : Math.round(x)).toLocaleString('es-CL')} ml`);
const optTxt = (o) => (o.ml ? `${o.ml} ml en ${fmtMl(o.water)}` : o.min != null ? `${ratioTxt(o.min)} a ${ratioTxt(o.max)}` : ratioTxt(o.n));
// recipientes a ofrecer: los que indica el fabricante y, para completar, los de su mismo tipo de uso
function mixKeys(d) {
  const s = new Set(d.opts.map((o) => o.use));
  const pool = [...s].some((k) => WASH_MIX.includes(k)) ? WASH_MIX : ['spray5', 'spray1'];
  pool.forEach((k) => { if (s.size < 3) s.add(k); });
  return Object.keys(MIX).filter((k) => s.has(k));
}
function yieldOf(p, n, mixKey) {
  const d = DIL[p.id], mix = MIX[mixKey];
  const prod = n === 0 ? mix.ml : mix.ml / (n + 1);
  const uses = d.vol ? Math.floor(d.vol / prod) : null;
  return { mix, prod, water: mix.ml - prod, uses, cost: uses ? web(p) / uses : null };
}
// rango de rendimiento entre los usos que indica el fabricante (sin contar el uso "puro"), para tarjetas y "Rinden más"
const ysCache = new Map();
function yieldSummary(p) {
  if (ysCache.has(p.id)) return ysCache.get(p.id);
  const d = DIL[p.id];
  let r = null;
  if (d && d.vol && d.kind === 'yield') r = { hi: d.max, label: `${d.min}–${d.max} autos` };
  else if (d && d.vol) {
    const uses = d.opts.flatMap((o) => (o.min != null ? [o.min, o.max] : [nOf(o)]).filter((n) => n > 0).map((n) => yieldOf(p, n, o.use).uses));
    if (uses.length) {
      const lo = Math.min(...uses), hi = Math.max(...uses), f = (x) => x.toLocaleString('es-CL');
      r = { hi, label: lo === hi ? `${f(lo)} usos` : `${f(lo)}–${f(hi)} usos` };
    }
  }
  ysCache.set(p.id, r);
  return r;
}
function calcHTML(p) {
  const d = DIL[p.id];
  if (!d) return '';
  const head = `<div class="calc__head"><span class="calc__ic">${ico('drop')}</span><div><b>¿Cuánto rinde?</b><span class="mono mono--gold">${d.kind === 'yield' ? 'Rendimiento indicado' : 'Dilución indicada'} por el fabricante</span></div></div>`;
  const foot = `<details class="calc__src"><summary>Ver indicación del fabricante</summary><p>“${esc(d.src)}”</p></details>
    <p class="calc__note">Cálculo referencial: el consumo real depende de la suciedad y de cómo apliques el producto.</p>`;
  if (d.kind === 'yield') {
    return `<section class="calc">${head}
      <div class="calc__out"><div class="calc__big"><b>${d.min}–${d.max}</b><span>${d.unit} por envase de ${fmtMl(d.vol)}</span></div>
      <div class="calc__cost"><b>${clp(web(p) / d.max)}–${clp(web(p) / d.min)}</b><span>por auto</span></div></div>${foot}</section>`;
  }
  return `<section class="calc" id="calc">${head}
    ${d.opts.length > 1
      ? `<span class="calc__lbl">Uso</span><div class="calc__opts" role="radiogroup" aria-label="Uso">${d.opts.map((o, i) => `<button role="radio" class="calc__opt" data-action="calc-opt" data-i="${i}">${esc(o.l)}<em>${optTxt(o)}</em></button>`).join('')}</div>`
      : `<p class="calc__one">${esc(d.opts[0].l)} <em>${optTxt(d.opts[0])}</em></p>`}
    <div class="calc__range" id="calcRange" hidden>
      <span class="calc__lbl">Dilución <output id="calcN"></output></span>
      <input type="range" id="calcSlider" step="1" aria-label="Dilución">
      <div class="calc__ends"><span>Más concentrado</span><span>Más suave</span></div>
    </div>
    <span class="calc__lbl">Preparas</span>
    <div class="calc__opts" id="calcMix">${mixKeys(d).map((k) => `<button class="calc__opt" data-action="calc-mix" data-k="${k}">${MIX[k].l}</button>`).join('')}</div>
    <div class="calc__out" id="calcOut" aria-live="polite"></div>
    <p class="calc__recipe" id="calcRecipe"></p>
    ${foot}
  </section>`;
}
let calc = null;
function calcInit(p) {
  const d = DIL[p.id];
  calc = d && d.kind !== 'yield' && $('#calc') ? { p, d } : null;
  if (calc) calcPick(0);
}
function calcPick(i) {
  const o = calc.d.opts[i];
  Object.assign(calc, { opt: i, n: nOf(o), mix: o.use });
  drawCalc(true);
}
function drawCalc(resetRange) {
  const { p, d } = calc, o = d.opts[calc.opt];
  $$('#calc [data-action="calc-opt"]').forEach((b, k) => { b.classList.toggle('on', k === calc.opt); b.setAttribute('aria-checked', k === calc.opt); });
  $$('#calcMix button').forEach((b) => b.classList.toggle('on', b.dataset.k === calc.mix));
  const ranged = o.min != null, slider = $('#calcSlider');
  $('#calcRange').hidden = !ranged;
  if (ranged && resetRange) { slider.min = o.min; slider.max = o.max; slider.value = calc.n; }
  if (ranged) $('#calcN').textContent = ratioTxt(calc.n);
  const y = yieldOf(p, calc.n, calc.mix);
  $('#calcOut').innerHTML = y.uses
    ? `<div class="calc__big"><b>${y.uses.toLocaleString('es-CL')}</b><span>${y.uses === 1 ? y.mix.one : y.mix.many} de ${fmtMl(y.mix.ml)}</span></div>
       <div class="calc__cost"><b>${y.cost < 1 ? 'menos de $1' : clp(y.cost)}</b><span>por ${y.mix.one}</span></div>`
    : `<div class="calc__big"><span>El nombre del producto no indica el tamaño del envase: mostramos solo cómo prepararlo.</span></div>`;
  $('#calcRecipe').innerHTML = calc.n === 0
    ? `Se usa <b>puro</b>: ${fmtMl(y.prod)} de producto.`
    : `Mezcla: <b>${fmtMl(y.prod)}</b> de producto + <b>${fmtMl(y.water)}</b> de agua.`;
}
// miniatura chica (≈300 px) para íconos y lista de resultados; [0] ≈600 px para tarjetas y carrusel; [1] ≈1024 px para la ficha
const thumb = (p) => (p.im && p.im[0] ? U(p.im[0][2] || p.im[0][0]) : null);
const srcset = (p, sizes) => (p.im[0][2] && p.im[0][2] !== p.im[0][0] ? ` srcset="${U(p.im[0][2])} 300w, ${p.img} 600w" sizes="${sizes}"` : '');
const img = (p, big) => (p.img
  ? `<img src="${big && p.im[0][1] ? U(p.im[0][1]) : p.img}"${big ? '' : srcset(p, '(max-width: 820px) 46vw, 260px')} alt="${esc(p.t)}" loading="lazy" decoding="async">`
  : `<span class="ph">${esc(p.b || 'Reycar')}</span>`);

function card(p) {
  const out = p.stk === 0;
  const low = out ? '<span class="pc__stock pc__stock--out">Agotado</span>' : p.stk === 1 ? '<span class="pc__stock">Última unidad</span>' : '';
  const ys = yieldSummary(p);
  return `<article class="pc">
    <a class="pc__img" href="#/producto/${p.s}" tabindex="-1" aria-hidden="true">${img(p)}<span class="pc__off">-${DISC * 100}%</span>${low}${ys ? `<span class="pc__yield">${ico('drop')}Rinde ${ys.label}</span>` : ''}</a>
    <div class="pc__body">
      <span class="pc__brand">${esc(p.b || gById.get(p.g).name)}</span>
      <a class="pc__name" href="#/producto/${p.s}">${esc(p.t)}</a>
      ${p.spec ? `<span class="pc__spec">${esc(p.spec)}</span>` : ''}
      <div class="pc__price"><b>${clp(web(p))}</b><s>${clp(p.p)}</s></div>
      <button class="pc__add" data-action="add" data-id="${p.id}"${out ? ' disabled' : ''} aria-label="${out ? 'Agotado' : 'Agregar al carro'}: ${esc(p.t)}">${ico('bag')}<span class="pc__addt">${out ? 'Agotado' : ADD_LABEL}</span></button>
    </div>
  </article>`;
}
const perksBar = () => `<div class="perks">
  <div class="perk">${ico('truck')}<div><b>Envíos a todo Chile</b><span>Despacho a todo el país</span></div></div>
  <div class="perk">${ico('card')}<div><b>Webpay y tarjetas</b><span>Crédito y débito</span></div></div>
  <div class="perk">${ico('shield')}<div><b>Productos originales</b><span>Marcas reconocidas</span></div></div>
  <a class="perk" href="${wa('Hola Reycar, necesito asesoría')}" target="_blank" rel="noopener">${ico('chat')}<div><b>Asesoría por WhatsApp</b><span>+56 9 6355 5437</span></div></a>
</div>`;
const helpBox = () => `<div class="help rv">
  <div>
    <span class="mono">Asesoría personalizada</span>
    <h3 class="cond">¿No sabes qué producto usar?</h3>
    <p>Cuéntanos qué auto tienes y qué quieres lograr. Te recomendamos la rutina por WhatsApp.</p>
  </div>
  <a class="btn btn--white" href="${wa('Hola Reycar, quisiera una recomendación de productos')}" target="_blank" rel="noopener">${ico('chat')} Escribir por WhatsApp</a>
</div>`;
// logos oficiales (fetch-logos.js). fx: 'dark' oscurece logos que vienen en blanco; 'clip' recorta el borde del archivo.
const LOGOS = {
  'Meguiars': ['assets/brands/meguiars.png', 'tall'], 'Vonixx': ['assets/brands/vonixx.webp', 'dark'],
  'Maxshine': ['assets/brands/maxshine.png'], 'KochChemie': ['assets/brands/kochchemie.svg'],
  'Carpro': ['assets/brands/carpro.jpg', 'clip'], 'DIY': ['assets/brands/diy.png'],
  'ReyCar': ['https://reycarstore.cl/wp-content/uploads/2026/06/logor.png', 'tall'],
  'Menzerna': ['assets/brands/menzerna.svg'], 'Lake Country': ['assets/brands/lake-country.svg', 'dark'],
  'Rupes': ['assets/brands/rupes.png', 'tall'], 'VINTEX': ['assets/brands/vintex.webp', 'dark'],
  'DIMENSION CAR CARE': ['assets/brands/dimension-car-care.png', 'tall'], 'Shine Mate': ['assets/brands/shine-mate.svg', 'tall'],
  '3M': ['assets/brands/3m.svg'], 'Sonax': ['assets/brands/sonax.svg'],
};
const brandCell = (b, i = 0) => {
  const logo = LOGOS[b.name];
  return `<a class="bc rv" style="--d:${(i % 6) * 0.05}s" href="#/tienda?b=${encodeURIComponent(b.name)}" aria-label="${esc(b.name)}, ${b.n} productos">
    <span class="bc__plate">${logo
      ? `<img class="bc__logo${logo[1] ? ' fx-' + logo[1] : ''}" src="${logo[0]}" alt="${esc(b.name)}" loading="lazy">`
      : `<span class="bc__word cond">${esc(b.name)}</span>`}</span>
    <span class="bc__meta"><b>${esc(b.name)}</b><span>${b.n} productos</span></span>
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
      <img class="crest__logo" src="assets/reycars-crest.webp" alt="Reycar Detailing Center" width="768" height="786" fetchpriority="high">
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
const HOME_TABS = { feat: 'Destacados', rinde: 'Rinden más', proteccion: 'Cerámicos y ceras', secado: 'Microfibras', pulido: 'Pulido', interior: 'Interior' };
const tabItems = (t) => (t === 'feat' ? featured(10)
  : t === 'rinde' ? P.filter((p) => p.img && yieldSummary(p)).sort((a, b) => yieldSummary(b).hi - yieldSummary(a).hi).slice(0, 10)
  : filterProducts({ g: t }).filter((p) => p.img).slice(0, 10));

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
            <a class="btn btn--red" href="#/tienda">Ver la tienda ${arrow}</a>
            <a class="btn btn--glass" href="#/asesoria">Servicios de taller</a>
          </div>
          <span class="stage__badge an" style="--d:.71s"><b>−${DISC * 100}%</b> precio web en todo el catálogo</span>
        </div>
      </div>
      <div class="cf an" id="cf" style="--d:.55s" aria-roledescription="carrusel" aria-label="Productos destacados">
        <div class="cf__track">${showcase.map((p, i) => `
          <article class="cf__s" data-i="${i}" aria-roledescription="producto ${i + 1} de ${showcase.length}">
            <a class="cf__tile" href="#/producto/${p.s}" tabindex="-1"><img src="${p.img}"${srcset(p, '(max-width: 820px) 58vw, 300px')} alt="${esc(p.t)}" decoding="async"></a>
            <div class="cf__cap">
              <span class="cf__brand">${esc(p.b || gById.get(p.g).name)}${p.spec ? ' · ' + esc(p.spec) : ''}</span>
              <a class="cf__name" href="#/producto/${p.s}">${esc(p.t)}</a>
              <div class="cf__row"><b>${clp(web(p))}</b><s>${clp(p.p)}</s><button class="cf__add" data-action="add" data-id="${p.id}" aria-label="Agregar al carro: ${esc(p.t)}">${ico('plus')}</button></div>
            </div>
          </article>`).join('')}
        </div>
        <button class="cf__nav cf__prev" data-action="cf" data-d="-1" aria-label="Producto anterior">‹</button>
        <button class="cf__nav cf__next" data-action="cf" data-d="1" aria-label="Producto siguiente">›</button>
        <div class="cf__dots">${showcase.map((_, i) => `<button data-action="cf-go" data-i="${i}" aria-label="Ver producto ${i + 1}"></button>`).join('')}</div>
      </div>
    </div>

    <div class="promos">
      <a class="vit__side vit__side--light" href="#/tienda?g=proteccion">
        <span class="mono">Protección · ${prot.count} productos</span>
        <strong class="cond"><em>Ceras y cerámicos desde</em>${clp(minPrice('proteccion'))}</strong>
        <span class="vit__go">Que el brillo dure meses, no días ${arrow}</span>
      </a>
      <a class="vit__side vit__side--red" href="#/tienda?g=secado">
        <span class="mono">Secado y microfibras</span>
        <strong class="cond"><em>Desde</em>${clp(minPrice('secado'))}</strong>
        <span class="vit__go">Toallas, paños y aplicadores ${arrow}</span>
      </a>
      ${svc.length ? `<a class="vit__side vit__side--dark" href="#/asesoria">
        <span class="mono">Taller · Quinta Normal</span>
        <strong class="cond"><em>Cerámico aplicado desde</em>${clp(web(svc[0]))}</strong>
        <span class="vit__go">Ver servicios del taller ${arrow}</span>
      </a>` : ''}
    </div>
    ${perksBar()}
  </section>


  <section class="sec wrap">
    <div class="sh rv">
      <div><span class="mono mono--gold">El proceso, en orden</span><h2 class="cond">Compra por etapa</h2><p>Del lavado a la protección. Cada etapa con los productos que necesitas.</p></div>
      <a class="sh__link" href="#/tienda">Ver todo el catálogo ${arrow}</a>
    </div>
    <div class="steps">
      ${ROUTE.map((id, i) => {
        const g = gById.get(id), p = stepImg(id);
        return `<a class="step rv" style="--d:${i * 0.06}s" href="#/tienda?g=${id}">
          <span class="step__n">${String(i + 1).padStart(2, '0')}</span>
          <h3 class="cond">${esc(g.name)}</h3>
          <span class="step__b">${esc(g.blurb)}</span>
          <span class="step__img">${p ? `<span class="step__tile"><img src="${p.img}" alt="" loading="lazy"></span>` : ''}</span>
          <span class="step__foot"><span>${g.count} productos</span>${arrow}</span>
        </a>`;
      }).join('')}
    </div>
    <div class="steps__more"><span>Además</span>${more.map((g) => `<a href="#/tienda?g=${g.id}">${esc(g.name)}<small>${g.count}</small></a>`).join('')}</div>
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
          <div class="offer__price"><b>${clp(web(p))}</b><s>${clp(p.p)}</s></div>
          <div class="offer__row"><a class="btn btn--red" href="${wa(`Hola Reycar, quiero agendar: ${p.t}`)}" target="_blank" rel="noopener">Agendar por WhatsApp</a><a class="offer__link" href="#/producto/${p.s}">Ver detalle</a></div>
        </div>`).join('')}
        ${course ? `<a class="offer offer--course" href="#/producto/${course.s}"><div><span class="mono">Curso presencial · 6 días</span><b>Aprende detailing profesional</b></div><span class="p">${clp(web(course))} ${arrow}</span></a>` : ''}
      </div>
    </div>
  </section>` : ''}

  <section class="sec wrap">
    <div class="sh rv"><div><span class="mono mono--gold">Originales</span><h2 class="cond">Marcas</h2></div><a class="sh__link" href="#/marcas">Ver las ${BRANDS.length} marcas ${arrow}</a></div>
    <div class="brandgrid">${BRANDS.filter((b) => LOGOS[b.name]).slice(0, 11).map(brandCell).join('')}<a class="bc bc--all rv" style="--d:.25s" href="#/marcas"><span class="bc__plate"><span class="bc__word cond">Ver todas</span></span><span class="bc__meta"><b>${BRANDS.length} marcas</b><span>${arrow}</span></span></a></div>
    ${helpBox()}
  </section>
  </div>`;
}

function viewBrands() {
  document.title = 'Marcas — Reycar Store';
  return `<section class="page wrap view">
    <div class="crumbs"><a href="#/">Inicio</a><span>Marcas</span></div>
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
    <div class="crumbs"><a href="#/">Inicio</a><span>Servicios</span></div>
    <div class="ptitle"><h1 class="cond">Servicios de taller</h1><p>Cerámicos aplicados por nuestro equipo en Quinta Normal y cursos para aprender el oficio.</p></div>
    <div class="svc">${items.map((p) => {
      const course = p.g === 'cursos';
      let st = steps(p.d, 10);
      const inherited = !st.length && !course && fallback;
      if (inherited) st = steps(fallback.d, 10);
      return `<article class="svc__c">
        <a class="svc__img${p.img ? '' : ' svc__img--ph'}" href="#/producto/${p.s}" tabindex="-1" aria-hidden="true">${p.img ? `<img src="${p.img}" alt="" loading="lazy">` : 'Reycar · Detailing Center'}</a>
        <div class="svc__b">
          <span class="mono mono--red">${course ? 'Curso presencial · 6 días' : vehicleOf(p)}</span>
          <h3>${esc(p.t)}</h3>
          <div class="svc__price"><b>${clp(web(p))}</b><s>${clp(p.p)}</s></div>
          ${st.length ? `${inherited ? '<p class="svc__txt">Mismo proceso que el servicio sedán, para vehículos grandes:</p>' : ''}<ol class="svc__steps">${st.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
          <div class="svc__cta">
            <a class="btn btn--red btn--sm" href="${wa(`Hola Reycar, quiero ${course ? 'reservar un cupo en' : 'agendar'}: ${p.t}`)}" target="_blank" rel="noopener">${course ? 'Reservar cupo' : 'Agendar'} por WhatsApp</a>
            <a class="svc__link" href="#/producto/${p.s}">Ver detalle</a>
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
const parseQuery = (qs) => { const o = {}; new URLSearchParams(qs).forEach((v, k) => { o[k] = v; }); return o; };
const toQuery = (o) => { const u = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => { if (v !== '' && v != null) u.set(k, v); }); const s = u.toString(); return s ? '?' + s : ''; };

function filterProducts(o) {
  let list = P;
  if (o.g) list = list.filter((p) => p.g === o.g);
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
  shop.params = params; shop.shown = PAGE;
  return `<section class="page wrap view"><div id="shopRoot"></div></section>`;
}
function drawShop() {
  const o = shop.params;
  const root = $('#shopRoot'); if (!root) return;
  const oldF = $('.filters', root), oldB = $('.brandlist', root);
  const keep = { f: oldF ? oldF.scrollTop : 0, b: oldB ? oldB.scrollTop : 0, open: !!(oldF && oldF.classList.contains('open')) };
  const list = filterProducts(o);
  const g = o.g && gById.get(o.g);
  const sel = o.b ? o.b.split(',') : [];

  const bc = {}; filterProducts({ ...o, b: '' }).forEach((p) => { if (p.b) bc[p.b] = (bc[p.b] || 0) + 1; });
  const brandsCtx = Object.entries(bc).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  sel.forEach((s) => { if (!bc[s]) brandsCtx.push([s, 0]); });
  const gc = {}; filterProducts({ ...o, g: '' }).forEach((p) => { gc[p.g] = (gc[p.g] || 0) + 1; });

  const title = o.q ? `«${esc(o.q)}»` : g ? esc(g.name) : sel.length === 1 ? esc(sel[0]) : 'Catálogo';
  const sub = o.q ? `Resultados de búsqueda.` : g ? g.blurb : sel.length === 1 ? 'Productos originales de la marca.' : `${P.length} productos de ${BRANDS.length} marcas.`;
  const tags = [];
  if (g) tags.push(['g', g.name]);
  sel.forEach((s) => tags.push(['b:' + s, s]));
  if (o.q) tags.push(['q', `“${o.q}”`]);
  if (o.min || o.max) tags.push(['price', `${o.min ? clp(o.min) : '$0'} – ${o.max ? clp(o.max) : 'máx.'}`]);

  root.innerHTML = `
    <div class="crumbs"><a href="#/">Inicio</a><a href="#/tienda">Tienda</a>${g ? `<span>${esc(g.name)}</span>` : o.q ? '<span>Búsqueda</span>' : ''}</div>
    <div class="ptitle"><h1 class="cond">${title}</h1><p>${esc(sub)}</p></div>
    <div class="shop">
      <div class="filters-scrim" data-action="close-filters"></div>
      <aside class="filters${keep.open ? ' open' : ''}" id="filters" aria-label="Filtros">
        <div class="filters__head">Filtros<button class="icon-btn" data-action="close-filters" aria-label="Cerrar filtros">${ico('close')}</button></div>
        <div>
          <h4>Categoría</h4>
          <div class="fl">
            <button class="${!o.g ? 'on' : ''}" data-action="set-group" data-g="">Todas <em>${Object.values(gc).reduce((a, b) => a + b, 0)}</em></button>
            ${G.map((x) => `<button class="${o.g === x.id ? 'on' : ''}" data-action="set-group" data-g="${x.id}">${esc(x.name)} <em>${gc[x.id] || 0}</em></button>`).join('')}
          </div>
        </div>
        <div>
          <h4>Marca</h4>
          <div class="brandlist">${brandsCtx.map(([b, n]) => `<label class="cb"><input type="checkbox" data-action="toggle-brand" value="${esc(b)}"${sel.includes(b) ? ' checked' : ''}>${esc(b)}<em>${n}</em></label>`).join('')}</div>
        </div>
        <div>
          <h4>Precio</h4>
          <div class="price"><input type="number" inputmode="numeric" min="0" step="1000" placeholder="Mín." value="${esc(o.min || '')}" data-price="min" aria-label="Precio mínimo"><span>–</span><input type="number" inputmode="numeric" min="0" step="1000" placeholder="Máx." value="${esc(o.max || '')}" data-price="max" aria-label="Precio máximo"></div>
        </div>
        <div class="filters__apply"><button class="btn btn--dark" data-action="close-filters" id="applyBtn">Ver ${list.length} productos</button></div>
      </aside>
      <div>
        <div class="toolbar">
          <div class="toolbar__acts">
            <button class="btn btn--line btn--sm filters-btn" data-action="open-filters">${ico('filter')} Filtros${tags.length ? `<i>${tags.length}</i>` : ''}</button>
            <label class="sort"><select data-action="sort" aria-label="Ordenar por">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}"${(o.sort || 'rel') === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
          </div>
          <div class="toolbar__l">
            <span class="count"><b>${list.length}</b> productos</span>
            ${tags.map(([k, t]) => `<span class="tag">${esc(t)}<button data-action="rm-tag" data-k="${esc(k)}" aria-label="Quitar filtro ${esc(t)}">${ico('close')}</button></span>`).join('')}
            ${tags.length > 1 ? `<button class="tag tag--clear" data-action="clear-filters">Limpiar</button>` : ''}
          </div>
        </div>
        <div class="grid grid--4" id="grid"></div>
        <div class="more" id="more"></div>
      </div>
    </div>`;
  drawResults(list);
  const f = $('.filters', root), bl = $('.brandlist', root);
  if (f) f.scrollTop = keep.f;
  if (bl) bl.scrollTop = keep.b;
  document.title = `${o.q ? 'Búsqueda: ' + o.q : g ? g.name : sel.length === 1 ? sel[0] : 'Tienda'} — Reycar Store`;
  markNav();
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
  history.replaceState(null, '', '#/tienda' + toQuery(next));
  drawShop();
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
  d.split('\n').map((l) => l.trim()).filter(Boolean).forEach((l) => {
    if (/^\d{1,2}\s*[.)-]\s+/.test(l)) { if (ul.length) flush(); ol.push(l.replace(/^\d{1,2}\s*[.)-]\s+/, '')); }
    else if (/^[-•·–*]\s*/.test(l)) { if (ol.length) flush(); ul.push(l.replace(/^[-•·–*]\s*/, '')); }
    else if (isHead(l)) { flush(); html += `<h4>${esc(calm(l.replace(/:\s*$/, '')))}</h4>`; }
    else { flush(); html += `<p>${esc(calm(l))}</p>`; }
  });
  flush();
  return html;
}
function viewProduct(slug) {
  const p = bySlug.get(slug);
  if (!p) return `<section class="page wrap view"><div class="empty"><h3 class="cond">Producto no encontrado</h3><p>Puede que ya no esté disponible.</p><br><a class="btn btn--dark btn--sm" href="#/tienda">Ir a la tienda</a></div></section>`;
  pdp = { p, qty: 1 };
  const g = gById.get(p.g);
  const same = P.filter((x) => x.id !== p.id && x.g === p.g && x.img).sort((a, b) => (b.b === p.b) - (a.b === p.b)).slice(0, 5);
  const ri = ROUTE.indexOf(p.g);
  const nextG = ri >= 0 && ri < ROUTE.length - 1 ? gById.get(ROUTE[ri + 1]) : null;
  const next = nextG ? filterProducts({ g: nextG.id }).filter((x) => x.img && x.b).slice(0, 5) : [];
  const out = p.stk === 0, low = p.stk > 0 && p.stk <= 5;
  const ys = yieldSummary(p), logo = LOGOS[p.b];
  document.title = `${p.t} — Reycar Store`;
  return `<section class="page wrap view">
    <div class="crumbs"><a href="#/">Inicio</a><a href="#/tienda?g=${g.id}">${esc(g.name)}</a><span>${esc(p.t)}</span></div>
    <a class="back" href="#/tienda?g=${g.id}"><span aria-hidden="true">←</span> ${esc(g.name)}</a>
    <div class="pdp">
      <div class="gal">
        <div class="gal__main${p.img ? ' gal__main--zoom' : ''}" id="galMain"${p.img ? ' data-action="lightbox" role="button" tabindex="0" aria-label="Ampliar foto"' : ''}>
          <div class="gal__img" id="galImg">${p.img ? `<img src="${U(p.im[0][1])}" alt="${esc(p.t)}" fetchpriority="high">` : `<span class="ph">${esc(p.b || 'Reycar')}</span>`}</div>
          <div class="gal__tags"><span class="gal__tag gal__tag--off">−${DISC * 100}% web</span>${p.spec ? `<span class="gal__tag">${esc(p.spec)}</span>` : ''}</div>
          ${ys ? `<span class="gal__yield">${ico('drop')}Rinde ${ys.label}</span>` : ''}
          ${p.img ? `<span class="gal__zoom" aria-hidden="true">${ico('zoom')}Ampliar</span>` : ''}
        </div>
        ${p.im.length > 1 ? `<div class="gal__thumbs">${p.im.map((im, i) => `<button class="${i ? '' : 'on'}" data-action="gal" data-i="${i}" aria-label="Ver foto ${i + 1}"><img src="${U(im[2] || im[0])}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="info">
        <div class="info__top">
          ${logo ? `<a class="info__logo" href="#/tienda?b=${encodeURIComponent(p.b)}" aria-label="Ver productos ${esc(p.b)}"><img class="${logo[1] ? 'fx-' + logo[1] : ''}" src="${logo[0]}" alt=""></a>` : ''}
          <div class="info__meta">${p.b ? `<a class="info__brand" href="#/tienda?b=${encodeURIComponent(p.b)}">${esc(p.b)}</a>` : ''}<span class="mono">${esc(g.name)}${p.spec ? ' · ' + esc(p.spec) : ''}</span></div>
          <button class="info__share" data-action="share" aria-label="Compartir producto" title="Compartir">${ico('share')}</button>
        </div>
        <h1>${esc(p.t)}</h1>
        <div class="info__price">
          <span class="info__now">${clp(web(p))}</span><s class="info__was">${clp(p.p)}</s><span class="info__save">Ahorras ${clp(p.p - web(p))}</span>
          <span class="info__note">Precio web con ${DISC * 100}% de descuento</span>
        </div>
        <div class="stock${out ? ' stock--out' : low ? ' stock--low' : ''}"><i></i>${out ? 'Agotado por ahora' : low ? (p.stk === 1 ? 'Última unidad disponible' : `Quedan ${p.stk} unidades`) : 'En stock'}</div>
        <div class="buy">
          <div class="qty"><button data-action="pdp-qty" data-d="-1" aria-label="Menos">${ico('minus')}</button><output id="pdpQty">1</output><button data-action="pdp-qty" data-d="1" aria-label="Más">${ico('plus')}</button></div>
          <button class="btn btn--red" data-action="add-pdp" data-id="${p.id}"${out ? ' disabled' : ''}>${out ? 'Agotado' : 'Agregar al carro'}</button>
        </div>
        <a class="btn btn--line btn--block buy__wa" href="${wa(`Hola Reycar, tengo una consulta sobre: ${p.t} (${p.url})`)}" target="_blank" rel="noopener">${ico('chat')} ¿Dudas? Pregunta por WhatsApp</a>
        <ul class="pdpk">
          <li>${ico('truck')}<span><b>Envío a todo Chile.</b> El costo se calcula al finalizar la compra.</span></li>
          <li>${ico('card')}<span><b>Paga con Webpay,</b> tarjetas de crédito o débito.</span></li>
          <li>${ico('shield')}<span><b>Producto original</b>${p.b ? ` ${esc(p.b)}` : ''}.</span></li>
        </ul>
        ${calcHTML(p)}
        <div class="acc">
          <details open><summary>Descripción ${ico('plus')}</summary><div class="acc__body">${descHTML(p.d)}</div></details>
          <details><summary>Ficha técnica ${ico('plus')}</summary><div class="acc__body"><dl class="specs">
            ${p.b ? `<dt>Marca</dt><dd><a href="#/tienda?b=${encodeURIComponent(p.b)}">${esc(p.b)}</a></dd>` : ''}
            <dt>Categoría</dt><dd><a href="#/tienda?g=${g.id}">${esc(g.name)}</a></dd>
            ${p.spec ? `<dt>Formato</dt><dd>${esc(p.spec)}</dd>` : ''}
            ${p.sku ? `<dt>SKU</dt><dd>${esc(p.sku)}</dd>` : ''}
          </dl></div></details>
        </div>
      </div>
    </div>
    ${next.length ? `<section class="sec"><div class="sh"><div><span class="mono mono--red">Siguiente etapa · ${String(ri + 2).padStart(2, '0')}</span><h2 class="cond">Después: ${esc(nextG.name)}</h2></div><a class="sh__link" href="#/tienda?g=${nextG.id}">Ver ${esc(nextG.name.toLowerCase())} ${arrow}</a></div><div class="grid grid--row">${next.map(card).join('')}</div></section>` : ''}
    ${same.length ? `<section class="sec"><div class="sh"><h2 class="cond">También en ${esc(g.name)}</h2><a class="sh__link" href="#/tienda?g=${g.id}">Ver todo ${arrow}</a></div><div class="grid grid--row">${same.map(card).join('')}</div></section>` : ''}
  </section>
  <div class="sticky-buy" id="stickyBuy" aria-hidden="true">
    ${p.img ? `<span class="sb__img"><img src="${thumb(p)}" alt=""></span>` : ''}
    <span class="sb__t"><small>${esc(p.b || g.name)}</small><b>${esc(p.t)}</b></span>
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
  if (navigator.share) navigator.share({ title: text, url: p.url }).catch(() => {});
  else window.open(`https://wa.me/?text=${encodeURIComponent(text + ': ' + p.url)}`, '_blank', 'noopener');
}

/* ───────── navegación ───────── */
function buildChrome() {
  $('#cats').innerHTML = G.filter((g) => g.id !== 'servicios' && g.id !== 'cursos').map((g) => `<a href="#/tienda?g=${g.id}" data-g="${g.id}">${esc(g.name)}</a>`).join('')
    + `<span class="cats__sp"></span><a href="#/marcas" data-r="marcas">Marcas</a><a class="cats__svc" href="#/asesoria" data-r="asesoria">Servicios de taller</a>`;
  $('#ftCats').insertAdjacentHTML('beforeend', G.filter((g) => ROUTE.includes(g.id)).map((g) => `<a href="#/tienda?g=${g.id}">${esc(g.name)}</a>`).join('') + '<a href="#/tienda">Todo el catálogo</a>');
  // menú del celular: lista de categorías y accesos
  $('#mobileMenuBody').innerHTML = `<div class="mm">
    <nav class="mm__list" aria-label="Categorías">${G.filter((g) => g.id !== 'servicios').map((g) => `<a href="#/tienda?g=${g.id}">${esc(g.name)}<small>${g.count}</small></a>`).join('')}</nav>
    <div class="mm__links">
      <a href="#/tienda">Todo el catálogo <small>${P.length}</small></a>
      <a href="#/marcas">Marcas <small>${BRANDS.length}</small></a>
      <a class="mm__svc" href="#/asesoria">Servicios de taller <small>Quinta Normal</small></a>
      <a href="${wa('Hola Reycar, necesito asesoría')}" target="_blank" rel="noopener">Asesoría por WhatsApp <small>+56 9 6355 5437</small></a>
    </div>
  </div>`;
}
function markNav() {
  const h = location.hash;
  const g = (h.match(/[?&]g=([^&]+)/) || [])[1];
  const r = (h.match(/^#\/([^/?]+)/) || [])[1];
  $$('#cats a').forEach((a) => a.classList.toggle('on', !!((a.dataset.g && a.dataset.g === g && r === 'tienda') || (a.dataset.r && a.dataset.r === r))));
  // la categoría activa visible en la barra de chips (móvil)
  const on = $('#cats a.on');
  if (on) { const c = $('#cats'); c.scrollTo({ left: on.offsetLeft - 16, behavior: 'smooth' }); }
}

const main = $('#main');
let lastRoute = '';
function route() {
  const h = location.hash || '#/';
  if (!h.startsWith('#/')) { const el = document.getElementById(h.slice(1)); if (el) el.scrollIntoView({ behavior: 'smooth' }); return; }
  const [path, qs = ''] = h.slice(1).split('?');
  const seg = path.split('/').filter(Boolean);
  const name = seg[0] || 'home';
  closeSearch(); closeOverlay('#mobileMenu', true); closeOverlay('#drawer', true);
  document.body.classList.remove('filters-open');
  document.body.classList.toggle('is-catalog', name === 'tienda');
  if (typeof showHeader === 'function') showHeader();

  if (name === 'tienda' && lastRoute === 'tienda' && $('#shopRoot')) {
    shop.params = parseQuery(qs); shop.shown = PAGE; drawShop(); window.scrollTo(0, 0); track('pageView'); return;
  }
  document.title = 'Reycar Store — Detailing automotriz profesional';
  let html;
  if (name === 'tienda') html = viewShop(parseQuery(qs));
  else if (name === 'producto') html = viewProduct(decodeURIComponent(seg[1] || ''));
  else if (name === 'marcas') html = viewBrands();
  else if (name === 'asesoria') html = viewServices();
  else html = viewHome();
  main.innerHTML = html;
  lastRoute = name;
  document.body.classList.toggle('has-sticky', name === 'producto');
  if (name === 'tienda') drawShop();
  markNav();
  window.scrollTo(0, 0);
  observeReveals();
  cfInit();
  crestInit();
  if (name === 'producto' && pdp.p) { calcInit(pdp.p); pdpInit(); }
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
    s.style.opacity = [1, 0.9, 0.55, 0.22, 0][ad];
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
      <div class="sugs">${['Shampoo', 'Cerámico', 'Microfibra', 'Pad', 'Compuesto', 'Aromatizante', 'Neumáticos', 'Meguiars', 'Koch'].map((s) => `<a href="#/tienda?q=${encodeURIComponent(s)}">${s}</a>`).join('')}</div>
      <div class="sh-l">Categorías</div>
      ${ROUTE.map((id) => { const g = gById.get(id); return `<a class="sr sr--text" href="#/tienda?g=${id}"><div class="sr__t">${esc(g.name)}</div><span class="sr__s">${g.count}</span></a>`; }).join('')}`;
    return;
  }
  const all = filterProducts({ q });
  const nq = norm(q);
  const gs = G.filter((g) => norm(g.name).includes(nq)).slice(0, 2);
  const bs = BRANDS.filter((b) => norm(b.name).includes(nq)).slice(0, 2);
  const top = all.slice(0, 6);
  if (!top.length && !gs.length && !bs.length) {
    sDrop.innerHTML = `<div class="sempty"><b>Sin resultados para «${esc(q)}»</b>Prueba con otra palabra o <a href="${wa('Hola Reycar, busco: ' + q)}" target="_blank" rel="noopener" style="text-decoration:underline">pregúntanos por WhatsApp</a>.</div>`;
    return;
  }
  sDrop.innerHTML =
    (gs.length || bs.length ? `<div class="sh-l">Ir a</div>${gs.map((g) => `<a class="sr sr--text" href="#/tienda?g=${g.id}"><div class="sr__t">${hi(g.name, q)}</div><span class="sr__s">Categoría · ${g.count}</span></a>`).join('')}${bs.map((b) => `<a class="sr sr--text" href="#/tienda?b=${encodeURIComponent(b.name)}"><div class="sr__t">${hi(b.name, q)}</div><span class="sr__s">Marca · ${b.n}</span></a>`).join('')}` : '') +
    (top.length ? `<div class="sh-l">Productos</div>${top.map((p) => `<a class="sr" href="#/producto/${p.s}"><span class="sr__img">${p.img ? `<img src="${thumb(p)}" alt="">` : ''}</span><div><div class="sr__t">${hi(p.t, q)}</div><div class="sr__s">${esc(p.b || gById.get(p.g).name)}${p.spec ? ' · ' + esc(p.spec) : ''}</div></div><span class="sr__p">${clp(web(p))}</span></a>`).join('')}` : '') +
    (all.length > top.length ? `<a class="sr sr--text" href="#/tienda?q=${encodeURIComponent(q)}"><div class="sr__t">Ver los ${all.length} resultados ${arrow}</div></a>` : '');
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
  location.hash = '#/tienda?q=' + encodeURIComponent(q);
  closeSearch(); sInput.blur();
});

/* ───────── eventos ───────── */
document.addEventListener('click', (e) => {
  if (e.target.closest('a[href^="https://wa.me"]')) track('contact', 'whatsapp');
  const t = e.target.closest('[data-action]'); if (!t) return;
  const a = t.dataset.action, id = +t.dataset.id;
  switch (a) {
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
      $('#galImg').innerHTML = `<img src="${U(pdp.p.im[i][1])}" alt="${esc(pdp.p.t)}">`;
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
    case 'calc-opt': if (calc) calcPick(+t.dataset.i); break;
    case 'lightbox': openLightbox(); break;
    case 'close-lightbox': closeLightbox(); break;
    case 'share': shareProduct(); break;
    case 'calc-mix': if (calc) { calc.mix = t.dataset.k; drawCalc(); } break;
    case 'open-cart': drawCart(); openOverlay('#drawer'); track('viewCart', cartItemsT()); break;
    case 'close-cart': closeOverlay('#drawer'); break;
    case 'qty': setQty(id, (cart[id] || 0) + +t.dataset.d); break;
    case 'rm': setQty(id, 0); break;
    case 'checkout': track('beginCheckout', cartItemsT()); toast('Prototipo: aquí se conecta al checkout'); break;
    case 'open-menu': openOverlay('#mobileMenu'); break;
    case 'close-menu': closeOverlay('#mobileMenu'); break;
    case 'set-group': setParams({ g: t.dataset.g }); break;
    case 'rm-tag': {
      const k = t.dataset.k;
      if (k === 'g') setParams({ g: '' });
      else if (k === 'q') setParams({ q: '' });
      else if (k === 'price') setParams({ min: '', max: '' });
      else { const b = k.slice(2); setParams({ b: (shop.params.b || '').split(',').filter((x) => x && x !== b).join(',') }); }
      break;
    }
    case 'clear-filters': setParams({ g: '', b: '', q: '', min: '', max: '' }); break;
    case 'more': shop.shown += PAGE; drawResults(); break;
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
  else if (e.key === 'Escape') { closeLightbox(); closeOverlay('#drawer'); closeOverlay('#mobileMenu'); const f = $('#filters'); if (f) f.classList.remove('open'); document.body.classList.remove('filters-open'); }
});
// fotos que no cargan -> placeholder
document.addEventListener('error', (e) => {
  const im = e.target;
  if (im.tagName === 'IMG' && !im.dataset.fb && im.closest('.pc__img,.gal__main')) {
    im.dataset.fb = 1;
    im.replaceWith(Object.assign(document.createElement('span'), { className: 'ph', textContent: 'Reycar' }));
  }
}, true);

document.addEventListener('input', (e) => {
  if (e.target.id === 'calcSlider' && calc) { calc.n = +e.target.value; drawCalc(); }
});
window.addEventListener('hashchange', route);
applyMode();
buildChrome();
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
