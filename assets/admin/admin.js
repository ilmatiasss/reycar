/* Panel de administración de Reycar Store — MAQUETA NAVEGABLE.
   Con la identidad de Reycar; la lógica (pedidos, estados, notas, atribución) es la que el equipo ya conoce de
   WooCommerce. Sirve para que Guillermo y su equipo la validen antes de construir la versión real.
   Los productos son los reales del catálogo (data/products.js); clientes y pedidos son de demostración,
   generados con una semilla fija (mismos datos en cada visita). Nada se guarda: los cambios viven en
   memoria hasta recargar. En la versión real: pedidos y clientes en base de datos, precio/stock/boletas
   desde Bsale, pagos desde Klap, envíos desde Sendu y analítica cruzada con GA4. */
(() => {
  'use strict';

  /* ───────── utilidades ───────── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const miles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const clp = (n) => (n < 0 ? '−$' : '$') + miles(Math.abs(n));
  const clpK = (n) => (n >= 1e6 ? '$' + (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' M' : n >= 1e3 ? '$' + Math.round(n / 1e3) + ' mil' : '$' + Math.round(n));
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
  const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const p2 = (n) => String(n).padStart(2, '0');
  const fDate = (t) => { const d = new Date(t); return `${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`; };
  const fDay = (t) => { const d = new Date(t); return `${d.getDate()} ${MES[d.getMonth()]}`; };
  const fTime = (t) => { const d = new Date(t); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const fFull = (t) => `${fDate(t)}, ${fTime(t)}`;
  const NOW = Date.now(), MIN = 6e4, HOUR = 36e5, DAY = 864e5;
  const ago = (t) => { const s = NOW - t; if (s < HOUR) return `hace ${Math.max(1, Math.round(s / MIN))} min`; if (s < DAY) { const h = Math.round(s / HOUR); return `hace ${h} hora${h > 1 ? 's' : ''}`; } return fDate(t); };
  const plural = (n, a, b) => `${miles(n)} ${n === 1 ? a : b}`;
  const deacc = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const toast = (msg) => { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 3200); };
  const NOSAVE = 'Es una maqueta: el cambio se ve, pero se pierde al recargar.';

  /* ───────── catálogo real ───────── */
  const ALL = window.PRODUCTS || [], GROUPS = window.GROUPS || [];
  const byId = new Map(ALL.map((p) => [p.id, p]));
  const HEADS = ALL.filter((p) => !p.fam || p.fam === p.id);
  ALL.forEach((p) => { if (p.fam && p.fam !== p.id) { const h = byId.get(p.fam); (h.vs = h.vs || [h]).push(p); } });
  HEADS.forEach((h) => h.vs && h.vs.sort((a, b) => a.p - b.p));
  const gById = new Map(GROUPS.map((g) => [g.id, g]));
  const IMG = '/assets/uploads/';
  const img = (p, i = 0, size = 2) => (p.im && p.im[i] ? IMG + (p.im[i][size] || p.im[i][0]) : '/assets/logo.png');
  const subName = (p) => { const g = gById.get(p.g); const s = g && (g.subs || []).find((x) => x.id === p.sc); return s ? s.name : ''; };
  const catLine = (p) => [gById.get(p.g)?.name, subName(p)].filter(Boolean).join(' › ');
  const featured = new Set(HEADS.filter((p) => p.b === 'Motor Clean').slice(0, 6).map((p) => p.id));
  const hidden = new Set();
  const seo = new Map();

  /* ───────── datos de demostración (semilla fija) ───────── */
  let seed = 21719;
  const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const wpick = (a) => { let r = rnd() * a.reduce((s, x) => s + x.w, 0); for (const x of a) if ((r -= x.w) < 0) return x; return a[a.length - 1]; };

  const FIRST = ['Camila', 'Felipe', 'Javiera', 'Matías', 'Valentina', 'Benjamín', 'Catalina', 'Sebastián', 'Francisca', 'Diego', 'Constanza', 'Nicolás', 'Fernanda', 'Tomás', 'Daniela', 'Joaquín', 'Antonia', 'Cristóbal', 'Ignacia', 'Vicente', 'Paula', 'Rodrigo', 'Carolina', 'Gonzalo', 'Macarena', 'Andrés', 'Bárbara', 'Ricardo', 'Josefa', 'Claudio', 'Martín', 'Isidora', 'Pablo', 'Florencia', 'Esteban', 'Trinidad'];
  const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araneda', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Sánchez', 'Fernández', 'Ramírez'];
  const RM = 'Región Metropolitana';
  const COMUNAS = [['Maipú', RM, 9], ['Puente Alto', RM, 8], ['Santiago', RM, 7], ['La Florida', RM, 7], ['Quinta Normal', RM, 5], ['Ñuñoa', RM, 5], ['Las Condes', RM, 5], ['Providencia', RM, 4], ['Pudahuel', RM, 4], ['San Bernardo', RM, 3], ['Peñalolén', RM, 3], ['Viña del Mar', 'Valparaíso', 4], ['Valparaíso', 'Valparaíso', 2], ['Concepción', 'Biobío', 4], ['Rancagua', "O'Higgins", 3], ['Talca', 'Maule', 2], ['Temuco', 'La Araucanía', 3], ['La Serena', 'Coquimbo', 3], ['Antofagasta', 'Antofagasta', 3], ['Puerto Montt', 'Los Lagos', 2], ['Iquique', 'Tarapacá', 1], ['Punta Arenas', 'Magallanes', 1]].map(([n, r, w]) => ({ n, r, w }));
  const CALLES = ['Av. Pajaritos', 'Los Aromos', 'San Pablo', 'Av. Matta', 'Pasaje Los Pinos', 'Av. Vicuña Mackenna', 'Las Camelias', 'Av. Grecia', 'Santa Rosa', 'Av. Los Leones', 'Los Carrera', 'Av. Libertad', 'O\'Higgins', 'Los Boldos', 'Av. Alemania'];
  const EMPRESAS = [['Detailing Pro SpA', 'Lavado y estética de vehículos'], ['Lavado Express Limitada', 'Lavado de vehículos'], ['Autoestética Sur SpA', 'Estética automotriz'], ['Taller Brillo Total SpA', 'Servicios automotrices'], ['Car Spa Oriente EIRL', 'Lavado de vehículos'], ['Transportes Andinos Ltda.', 'Transporte de carga']];
  const rut = () => { const n = 8e6 + Math.floor(rnd() * 17e6); let s = 0, m = 2; for (let x = n; x; x = Math.floor(x / 10)) { s += (x % 10) * m; m = m === 7 ? 2 : m + 1; } const dv = 11 - (s % 11); return `${miles(n)}-${dv === 11 ? 0 : dv === 10 ? 'K' : dv}`; };

  const CUST = [];
  for (let i = 0; i < 300; i++) {
    const first = pick(FIRST), last = pick(LAST), last2 = pick(LAST), com = wpick(COMUNAS);
    const emp = rnd() < 0.09 ? pick(EMPRESAS) : null;
    CUST.push({ id: 1000 + i, first, last: `${last} ${last2}`, email: `${deacc(first).toLowerCase()}.${deacc(last).toLowerCase().replace(/\s/g, '')}${i % 7 ? i : ''}@ejemplo.cl`, phone: `+56 9 ${Math.floor(1e3 + rnd() * 9e3)} ${Math.floor(1e3 + rnd() * 9e3)}`, rut: rut(), street: `${pick(CALLES)} ${Math.floor(100 + rnd() * 4900)}${rnd() < 0.3 ? ', depto. ' + Math.floor(11 + rnd() * 1800) : ''}`, comuna: com.n, region: com.r, emp: emp && { name: emp[0], giro: emp[1], rut: rut() }, since: 0 });
  }
  const custName = (c) => `${c.first} ${c.last}`;

  // orígenes: misma idea que la "atribución del pedido" de WooCommerce (fuente, tipo, campaña UTM, dispositivo)
  const ORIG = [
    { k: 'meta', lbl: 'Meta Ads', type: 'Anuncio', src: 'facebook / instagram', med: 'paid_social', camps: ['Motor Clean · Octubre', 'Catálogo dinámico (Advantage+)', 'Remarketing 30 días'], w: 30, cls: 'ads' },
    { k: 'gads', lbl: 'Google Ads', type: 'Anuncio', src: 'google', med: 'cpc', camps: ['Shopping · Todos los productos', 'Búsqueda · Marca Reycar', 'Performance Max · Detailing'], w: 19, cls: 'ads' },
    { k: 'org', lbl: 'Google orgánico', type: 'Orgánico', src: 'google', med: 'organic', w: 20, cls: 'org' },
    { k: 'dir', lbl: 'Directo', type: 'Directo', src: '(directo)', med: '(ninguno)', w: 14 },
    { k: 'ig', lbl: 'Instagram', type: 'Referido', src: 'instagram.com', med: 'referral', w: 8, cls: 'ref' },
    { k: 'wa', lbl: 'WhatsApp', type: 'Referido', src: 'wa.me', med: 'referral', w: 4, cls: 'ref' },
    { k: 'yt', lbl: 'YouTube', type: 'Referido', src: 'youtube.com', med: 'referral', w: 2, cls: 'ref' },
    { k: 'mail', lbl: 'Newsletter', type: 'Correo', src: 'newsletter', med: 'email', camps: ['Newsletter · Novedades del mes'], w: 3 },
  ];
  const oById = new Map(ORIG.map((o) => [o.k, o]));
  const SHIP = [{ m: 'Retiro en tienda — Quinta Normal', w: 18, pick: true }, { m: 'Starken a domicilio', w: 38, c: 'Starken' }, { m: 'Chilexpress a domicilio', w: 24, c: 'Chilexpress' }, { m: 'Blue Express a domicilio', w: 20, c: 'Blue Express' }];
  const PAY = [{ m: 'Tarjeta de débito', w: 34 }, { m: 'Tarjeta de crédito', w: 30 }, { m: 'Google Pay', w: 20 }, { m: 'Apple Pay', w: 16 }];
  const DEV = [{ m: 'Móvil', w: 72 }, { m: 'Escritorio', w: 24 }, { m: 'Tablet', w: 4 }];
  const CNOTES = ['¿Pueden enviarlo antes del viernes?', 'Dejar en conserjería, por favor.', 'Es para regalo, sin boleta dentro de la caja.', 'Llamar antes de llegar.', 'Retiro el sábado en la mañana.'];
  const SELL = HEADS.filter((p) => p.p > 0 && p.im && p.im.length && !['cursos', 'servicios'].includes(p.g))
    .map((p) => ({ p, w: (p.b === 'Motor Clean' ? 4 : 1) * (['lavado', 'proteccion', 'pulido', 'interior'].includes(p.g) ? 1.6 : 1) * (p.p < 30000 ? 1.4 : 1) }));

  const ORDERS = [];
  (() => {
    const times = [];
    for (let d = 179; d >= 0; d--) {
      const dow = new Date(NOW - d * DAY).getDay();
      const rate = (1.3 + 1.7 * (1 - d / 179)) * (dow === 0 || dow === 6 ? 1.25 : 1) * (d >= 15 && d <= 17 ? 2.4 : 1);
      const n = Math.round(rate * (0.3 + 1.4 * rnd()));
      for (let k = 0; k < n; k++) times.push(NOW - d * DAY - rnd() * DAY * (d === 0 ? 0.6 : 1));
      if (d <= 1) times.push(NOW - d * DAY - rnd() * DAY * 0.6);
    }
    times.sort((a, b) => a - b);
    let fb = 48211, ff = 3120, fnc = 412, auth = 731200, used = 0;
    times.forEach((t, i) => {
      let c;
      if (used > 20 && rnd() < 0.3) c = CUST[Math.floor(Math.min(used, CUST.length) * rnd() ** 1.7)];
      else { c = CUST[used % CUST.length]; used++; }
      const src = wpick(ORIG), dev = wpick(DEV), ship = wpick(SHIP), pay = wpick(PAY);
      const nl = pick([1, 1, 1, 1, 2, 2, 2, 3, 4]);
      const lines = [];
      for (let k = 0; k < nl; k++) {
        let p = wpick(SELL).p;
        if (p.vs) p = pick(p.vs);
        if (lines.some((l) => l.p === p)) continue;
        lines.push({ p, q: rnd() < 0.78 ? 1 : rnd() < 0.8 ? 2 : 3, price: p.p });
      }
      const sub = lines.reduce((s, l) => s + l.q * l.price, 0);
      const rm = c.region === RM;
      const cost = ship.pick ? 0 : rm ? pick([3990, 4490]) : pick([5990, 6990, 7990, 8990]);
      const age = NOW - t;
      const r = rnd();
      let st;
      if (age < 2 * HOUR) st = r < 0.18 ? 'pending' : 'processing';
      else if (age < 2 * DAY) st = r < 0.8 ? 'processing' : r < 0.92 ? 'completed' : r < 0.95 ? 'pending' : 'cancelled';
      else st = r < 0.88 ? 'completed' : r < 0.94 ? 'cancelled' : r < 0.97 ? 'refunded' : 'failed';
      if (st === 'pending' && age > 3 * HOUR) st = 'cancelled';
      const paid = ['processing', 'completed', 'refunded'].includes(st);
      const fac = c.emp && rnd() < 0.8;
      const camp = src.camps ? (src.k === 'meta' && NOW - t < 25 * DAY && NOW - t > 14 * DAY && rnd() < 0.6 ? 'CyberMonday · Hasta 30 %' : pick(src.camps)) : '';
      const o = {
        id: 21480 + i, t, st, c, lines, sub, ship: { m: ship.m, carrier: ship.c, cost, track: st === 'completed' && !ship.pick ? String(Math.floor(1e9 + rnd() * 8.9e9)) : '' },
        total: sub + cost, pay: pay.m, auth: paid ? String(auth += 1 + Math.floor(rnd() * 40)) : '', src, camp, dev: dev.m,
        pages: 1 + Math.floor(rnd() * rnd() * 16), landing: src.k === 'org' || src.k === 'gads' || src.k === 'meta' ? `/producto/${lines[0].p.s}` : pick(['/', '/tienda', '/motor-clean']),
        doc: paid ? { type: fac ? 'Factura electrónica' : 'Boleta electrónica', folio: fac ? ff++ : fb++ } : null, fac, nc: st === 'refunded' ? fnc++ : null,
        cnote: rnd() < 0.08 ? pick(CNOTES) : '', notes: [],
      };
      if (!c.since) c.since = t;
      buildNotes(o);
      ORDERS.push(o);
    });
    ORDERS.reverse();
  })();
  const oId = new Map(ORDERS.map((o) => [o.id, o]));

  function buildNotes(o) {
    const n = (dt, txt, kind = 'system', by = 'Reycar Store') => o.notes.push({ t: o.t + dt, txt, kind, by });
    n(0, 'Pedido creado. Esperando el pago en Klap.');
    if (o.st === 'failed') return n(2 * MIN, 'Klap rechazó el pago (tarjeta sin fondos). El stock no se descontó.');
    if (o.st === 'pending') return;
    if (o.st === 'cancelled') return n(60 * MIN, 'Pedido cancelado: el pago no se completó en 60 minutos. El stock no se descontó.');
    n(1.5 * MIN, `Klap aprobó el pago con ${o.pay}. Código de autorización ${o.auth}.`);
    n(1.6 * MIN, 'El estado del pedido cambió de Pendiente de pago a Procesando.');
    n(1.8 * MIN, `${o.doc.type} N° ${o.doc.folio} emitida en Bsale y enviada a ${o.c.email}. Stock descontado en la sucursal Casa Matriz.`);
    if (o.cnote) n(2 * MIN, o.cnote, 'customer', custName(o.c));
    if (o.st === 'processing') return;
    if (o.ship.track) n(20 * HOUR, `Envío creado en Sendu con ${o.ship.carrier}. N° de seguimiento ${o.ship.track}.`, 'customer');
    else n(20 * HOUR, 'El cliente retiró el pedido en la tienda.', 'private', 'Guillermo');
    n(20.1 * HOUR, 'El estado del pedido cambió de Procesando a Completado.', 'system', 'Guillermo');
    if (o.st === 'refunded') {
      n(3 * DAY, `Reembolso de ${clp(o.total)} realizado en Klap. Motivo: producto no correspondía al vehículo.`, 'private', 'Guillermo');
      n(3 * DAY + MIN, `Nota de crédito electrónica N° ${o.nc} emitida en Bsale. Stock repuesto.`);
      n(3 * DAY + 2 * MIN, 'El estado del pedido cambió de Completado a Reembolsado.');
    }
  }

  const ST = { pending: 'Pendiente de pago', processing: 'Procesando', 'on-hold': 'En espera', completed: 'Completado', cancelled: 'Cancelado', refunded: 'Reembolsado', failed: 'Fallido' };
  const PAID = new Set(['processing', 'completed']);
  const pill = (st) => `<mark class="order-status status-${st}"><span>${ST[st]}</span></mark>`;
  const otag = (o) => `<span class="tag${o.src.cls ? ' tag--' + o.src.cls : ''}">${esc(o.src.lbl)}</span>`;
  const qty = (o) => o.lines.reduce((s, l) => s + l.q, 0);

  /* ───────── menú ───────── */
  const IC = {
    dash: 'M10 3a8 8 0 0 0-7 12h14a8 8 0 0 0-7-12zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM5 9a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm10 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-1.6-3.2 1 .8-3.6 4.6a1.5 1.5 0 1 1-1-.8z',
    orders: 'M4 2h12v16l-2-1.5-2 1.5-2-1.5L8 18l-2-1.5L4 18zm3 4v1.5h6V6zm0 3.5V11h6V9.5zm0 3.5v1.5h4V13z',
    prod: 'M10 1 2 5v10l8 4 8-4V5zm0 2.2L15.6 6 10 8.8 4.4 6zM4 7.6l5 2.5v6.6l-5-2.5zm12 0v6.6l-5 2.5v-6.6z',
    cust: 'M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1 17c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5zm13.5 0c0-1.9-.7-3.6-1.9-4.9.5-.2 1-.3 1.4-.3 2.8 0 5 2.3 5 5.2z',
    stats: 'M2 17h16v1.5H2zM3 10h3v6H3zm5-5h3v11H8zm5 3h3v8h-3z',
    seo: 'M8.5 2a6.5 6.5 0 0 1 5.2 10.4l4.4 4.4-1.3 1.3-4.4-4.4A6.5 6.5 0 1 1 8.5 2zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z',
    users: 'M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5z',
    set: 'M3 5h8.2a2.5 2.5 0 0 1 4.6 0H17v1.5h-1.2a2.5 2.5 0 0 1-4.6 0H3zm0 8.5h1.2a2.5 2.5 0 0 1 4.6 0H17V15H8.8a2.5 2.5 0 0 1-4.6 0H3z',
  };
  const ico = (k) => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${IC[k]}" fill="currentColor"/></svg>`;
  const MENU = [
    { k: 'dash', href: '#/', t: 'Escritorio', match: ['', 'escritorio'] },
    { k: 'orders', href: '#/pedidos', t: 'Pedidos', match: ['pedidos', 'pedido'], badge: () => ORDERS.filter((o) => o.st === 'processing').length },
    { k: 'prod', href: '#/productos', t: 'Productos', match: ['productos', 'producto'] },
    { k: 'cust', href: '#/clientes', t: 'Clientes', match: ['clientes'] },
    { k: 'stats', href: '#/analitica', t: 'Analítica', match: ['analitica'] },
    { k: 'seo', href: '#/seo', t: 'SEO', match: ['seo'] },
    { k: 'users', href: '#/usuarios', t: 'Usuarios', match: ['usuarios'] },
    { k: 'set', href: '#/ajustes', t: 'Ajustes', match: ['ajustes'], subs: [['general', 'General'], ['pagos', 'Pagos (Klap)'], ['envios', 'Envíos (Sendu)'], ['bsale', 'Bsale'], ['seguimiento', 'Seguimiento y anuncios']] },
  ];
  function drawMenu(sec, q) {
    $('#adminmenu').innerHTML = MENU.map((m) => {
      const on = m.match.includes(sec), b = m.badge && m.badge();
      let h = `<a href="${m.href}" class="${on ? 'current' : ''}"${on ? ' aria-current="page"' : ''}>${ico(m.k)}<span>${m.t}</span>${b ? `<span class="count" aria-label="${b} por procesar">${b}</span>` : ''}</a>`;
      if (on && m.subs) h += `<div class="sub">${m.subs.map(([id, t]) => `<a href="${m.href}?tab=${id}" class="${(q.get('tab') || 'general') === id ? 'on' : ''}">${t}</a>`).join('')}</div>`;
      return h;
    }).join('');
  }

  /* ───────── piezas comunes ───────── */
  const href = (base, q, set) => { const u = new URLSearchParams(q); Object.entries(set).forEach(([k, v]) => (v === '' || v == null ? u.delete(k) : u.set(k, v))); const s = u.toString(); return base + (s ? '?' + s : ''); };
  function pager(total, page, per, mk) {
    const pages = Math.max(1, Math.ceil(total / per));
    const b = (p, l, lbl, off) => `<a class="button" href="${off ? '#' : mk(p)}" aria-label="${lbl}"${off ? ' aria-disabled="true" tabindex="-1"' : ''}>${l}</a>`;
    return `<div class="tablenav-pages"><span>${plural(total, 'elemento', 'elementos')}</span>${pages > 1 ? `${b(1, '«', 'Primera página', page <= 1)}${b(page - 1, '‹', 'Página anterior', page <= 1)}<span>${page} de ${pages}</span>${b(page + 1, '›', 'Página siguiente', page >= pages)}${b(pages, '»', 'Última página', page >= pages)}` : ''}</div>`;
  }
  const box = (title, body, act = '', flush = false) => `<div class="postbox"><h2 class="hndle"><span>${title}</span>${act ? `<span class="act">${act}</span>` : ''}</h2><div class="inside${flush ? ' flush' : ''}">${body}</div></div>`;
  const stockCell = (p) => (p.stk === 0 ? '<span class="stock-out">Agotado</span>' : p.stk == null ? '<span class="stock-in">Hay existencias</span>' : p.stk <= 2 ? `<span class="stock-low">Pocas unidades</span> (${p.stk})` : `<span class="stock-in">Hay existencias</span> (${p.stk})`);

  /* ───────── gráficos (SVG propio: una sola escala, líneas de 2 px, guía al pasar el mouse) ───────── */
  const tip = $('#tip');
  const showTip = (html, x, y) => { tip.innerHTML = html; tip.classList.add('on'); const r = tip.getBoundingClientRect(); tip.style.left = Math.min(innerWidth - r.width - 8, Math.max(8, x + 14)) + 'px'; tip.style.top = Math.max(8, y - r.height - 12) + 'px'; };
  const hideTip = () => tip.classList.remove('on');
  const niceMax = (v) => { if (v <= 0) return 1; const e = 10 ** Math.floor(Math.log10(v)); for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * e >= v) return m * e; return 10 * e; };
  const charts = [];
  function lineChart(host, s) {
    const draw = () => {
      const W = Math.max(280, host.clientWidth - 24), H = s.h || 240, L = 56, R = 10, T = 10, B = 24, n = s.cur.length;
      const max = niceMax(Math.max(...s.cur, ...(s.prev || [0])) * 1.05);
      const X = (i) => L + (n === 1 ? 0 : (i * (W - L - R)) / (n - 1)), Y = (v) => T + (H - T - B) * (1 - v / max);
      const path = (a) => a.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
      const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
      const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - L) / 70))));
      let svg = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(s.label)}">`;
      svg += ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--grid)" stroke-width="1"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${clpK(v)}</text>`).join('');
      svg += s.days.map((d, i) => ((n - 1 - i) % every === 0 ? `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${fDay(d)}</text>` : '')).join('');
      if (s.prev) svg += `<path d="${path(s.prev)}" fill="none" stroke="var(--cmp)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      svg += `<path d="${path(s.cur)}" fill="none" stroke="var(--data)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      svg += `<g class="hover" style="display:none"><line y1="${T}" y2="${H - B}" stroke="var(--line2)" stroke-width="1"/>${s.prev ? '<circle r="4" fill="var(--cmp)" stroke="var(--surface)" stroke-width="2" class="hp"/>' : ''}<circle r="4" fill="var(--data)" stroke="var(--surface)" stroke-width="2" class="hc"/></g>`;
      svg += `<rect x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent" class="hit"/></svg>`;
      host.innerHTML = svg;
      const g = $('.hover', host), hit = $('.hit', host), sv = $('svg', host);
      const move = (ev) => {
        const r = sv.getBoundingClientRect(), x = ((ev.clientX - r.left) / r.width) * W;
        const i = Math.max(0, Math.min(n - 1, Math.round(((x - L) / (W - L - R)) * (n - 1))));
        g.style.display = ''; $('line', g).setAttribute('x1', X(i)); $('line', g).setAttribute('x2', X(i));
        const hc = $('.hc', g); hc.setAttribute('cx', X(i)); hc.setAttribute('cy', Y(s.cur[i]));
        const hp = $('.hp', g); if (hp) { hp.setAttribute('cx', X(i)); hp.setAttribute('cy', Y(s.prev[i])); }
        showTip(`<b>${fDate(s.days[i])}</b><br><span class="sw" style="background:var(--data)"></span>${clp(s.cur[i])} · ${plural(s.cnt[i], 'pedido', 'pedidos')}${s.prev ? `<br><span class="sw" style="background:var(--cmp)"></span>${fDay(s.pdays[i])}: ${clp(s.prev[i])}` : ''}`, ev.clientX, r.top + Y(s.cur[i]) * (r.height / H));
      };
      hit.addEventListener('pointermove', move);
      hit.addEventListener('pointerdown', move);
      hit.addEventListener('pointerleave', () => { g.style.display = 'none'; hideTip(); });
    };
    draw();
    charts.push({ host, draw });
  }
  function bars(rows, total) {
    const max = Math.max(1, ...rows.map((r) => r.v));
    return `<ul class="bars">${rows.map((r) => `<li data-tip="${esc(`<b>${esc(r.l)}</b><br>${clp(r.v)} · ${plural(r.n, 'pedido', 'pedidos')}<br>Ticket promedio ${clp(r.n ? r.v / r.n : 0)}`)}"><span class="bl" title="${esc(r.l)}">${esc(r.l)}</span><span class="bt"><span class="bf" style="display:block;width:${((r.v / max) * 100).toFixed(1)}%"></span></span><span class="bv">${clpK(r.v)}<small>${total ? Math.round((r.v / total) * 100) : 0} %</small></span></li>`).join('')}</ul>`;
  }
  document.addEventListener('pointerover', (e) => { const li = e.target.closest('[data-tip]'); if (li) { const r = li.getBoundingClientRect(); showTip(li.dataset.tip, r.left + r.width * 0.45, r.top); } });
  document.addEventListener('pointerout', (e) => { if (e.target.closest('[data-tip]') && !e.relatedTarget?.closest?.('[data-tip]')) hideTip(); });
  let rw = innerWidth;
  addEventListener('resize', () => { if (Math.abs(innerWidth - rw) < 20) return; rw = innerWidth; clearTimeout(lineChart.t); lineChart.t = setTimeout(() => charts.forEach((c) => document.body.contains(c.host) && c.draw()), 120); });

  /* ───────── agregados para analítica ───────── */
  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  function agg(days, offset = 0) {
    const end = startOfDay(NOW) + DAY - offset * DAY, start = end - days * DAY;
    const list = ORDERS.filter((o) => PAID.has(o.st) && o.t >= start && o.t < end);
    const daily = Array.from({ length: days }, (_, i) => ({ d: start + i * DAY, v: 0, n: 0 }));
    list.forEach((o) => { const x = daily[Math.floor((o.t - start) / DAY)]; if (x) { x.v += o.total; x.n++; } });
    const sales = list.reduce((s, o) => s + o.total, 0);
    return { list, daily, sales, n: list.length, avg: list.length ? sales / list.length : 0, units: list.reduce((s, o) => s + qty(o), 0) };
  }
  const groupBy = (list, key) => { const m = new Map(); list.forEach((o) => { const k = key(o); const x = m.get(k) || { l: k, v: 0, n: 0 }; x.v += o.total; x.n++; m.set(k, x); }); return [...m.values()].sort((a, b) => b.v - a.v); };
  const delta = (a, b) => { if (!b) return '<span class="muted">sin datos del período anterior</span>'; const p = ((a - b) / b) * 100; const r = Math.round(p); return `<span class="${r >= 0 ? 'up' : 'down'}">${r >= 0 ? '▲' : '▼'} ${Math.abs(r)} %</span><span class="vs"> vs. período anterior</span>`; };
  const tile = (lbl, val, d) => `<div class="tile"><div class="lbl">${lbl}</div><div class="val">${val}</div><div class="delta">${d}</div></div>`;

  /* ───────── vistas ───────── */
  const V = {};

  V.dash = () => {
    const m = new Date(NOW); const mStart = new Date(m.getFullYear(), m.getMonth(), 1).getTime();
    const pm = new Date(m.getFullYear(), m.getMonth() - 1, 1).getTime(), pmEnd = pm + (NOW - mStart);
    const inM = ORDERS.filter((o) => PAID.has(o.st) && o.t >= mStart), inP = ORDERS.filter((o) => PAID.has(o.st) && o.t >= pm && o.t < pmEnd);
    const sum = (l) => l.reduce((s, o) => s + o.total, 0);
    const a30 = agg(30), proc = ORDERS.filter((o) => o.st === 'processing'), pend = ORDERS.filter((o) => o.st === 'pending');
    const low = HEADS.filter((p) => p.stk != null && p.stk > 0 && p.stk <= 2), out = HEADS.filter((p) => p.stk === 0);
    const top = groupBy(a30.list, (o) => o.src.lbl);
    return `
      <div class="wrap-h"><h1>Escritorio</h1></div>
      <div class="notice"><p><b>Maqueta para validar.</b> Los productos son los reales de la tienda; los pedidos, clientes y cifras son <b>de demostración</b>. Puedes recorrer todo y probar los botones: nada se guarda ni se envía a nadie.</p></div>
      <div class="tiles">
        ${tile(`Ventas de ${MESL[m.getMonth()]}`, clp(sum(inM)), delta(sum(inM), sum(inP)))}
        ${tile('Pedidos pagados del mes', miles(inM.length), delta(inM.length, inP.length))}
        ${tile('Ticket promedio del mes', clp(inM.length ? sum(inM) / inM.length : 0), delta(inM.length ? sum(inM) / inM.length : 0, inP.length ? sum(inP) / inP.length : 0))}
        ${tile('Por preparar y despachar', miles(proc.length), `<a href="#/pedidos?estado=processing">Ver pedidos en Procesando</a>`)}
      </div>
      <div class="dash">
        <div>
          <div class="postbox"><h2 class="hndle"><span>Ventas de los últimos 30 días</span><span class="act"><a href="#/analitica">Ver analítica</a></span></h2><div class="chart" id="c30"></div></div>
          ${box('Últimos pedidos', `<table class="mini"><tbody>${ORDERS.slice(0, 7).map((o) => `<tr><td><a href="#/pedido/${o.id}"><b>#${o.id}</b> ${esc(custName(o.c))}</a><div class="muted small">${ago(o.t)} · ${otag(o)}</div></td><td>${pill(o.st)}</td><td class="num">${clp(o.total)}</td></tr>`).join('')}</tbody></table>`, '<a href="#/pedidos">Ver todos</a>', true)}
        </div>
        <div>
          ${box('Estado de la tienda', `<ul class="glance">
            <li><a href="#/pedidos?estado=processing"><strong>${plural(proc.length, 'pedido', 'pedidos')}</strong>en Procesando</a></li>
            <li><a href="#/pedidos?estado=pending"><strong>${plural(pend.length, 'pedido', 'pedidos')}</strong>esperando pago</a></li>
            <li><a href="#/productos?stock=bajo"><strong>${plural(low.length, 'producto', 'productos')}</strong>con pocas unidades</a></li>
            <li><a href="#/productos?stock=agotado"><strong>${plural(out.length, 'producto', 'productos')}</strong>agotados</a></li></ul>`, '', true)}
          ${box('Origen de las ventas · 30 días', bars(top.slice(0, 6), a30.sales), '<a href="#/analitica">Detalle</a>', true)}
          ${box('Conexiones', `<ul class="integ">${INTEG.map(([n, d, st, cls]) => `<li><div><b>${n}</b><div class="muted small">${d}</div></div><span class="st ${cls}">${st}</span></li>`).join('')}</ul>`, '<a href="#/ajustes">Ajustes</a>', true)}
        </div>
      </div>`;
  };
  V.dash.after = () => { const a = agg(30); lineChart($('#c30'), { label: 'Ventas diarias de los últimos 30 días', days: a.daily.map((d) => d.d), cur: a.daily.map((d) => d.v), cnt: a.daily.map((d) => d.n), h: 220 }); };
  const INTEG = [
    ['Bsale', 'Productos, precios, stock y boletas', 'Falta token', 'st-wait'],
    ['Klap', 'Pago con tarjetas, Google Pay y Apple Pay', 'Faltan credenciales', 'st-wait'],
    ['Sendu', 'Cotización y despacho', 'Por configurar', 'st-wait'],
    ['Google Analytics 4', 'Visitas, conversión y origen', 'Por conectar', 'st-off'],
    ['Meta (píxel y API de conversiones)', 'Eventos para anuncios', 'Por conectar', 'st-off'],
    ['Google Tag Manager', 'Contenedor actual de la tienda', 'Por conectar', 'st-off'],
    ['Catálogos Meta y Google Merchant', 'Productos para anuncios de catálogo', 'Listo para activar', 'st-ok'],
  ];

  V.pedidos = (q) => {
    const st = q.get('estado') || '', s = (q.get('q') || '').trim(), src = q.get('origen') || '', mon = q.get('mes') || '', cid = +q.get('cliente') || 0;
    const page = Math.max(1, +q.get('pag') || 1), per = 20;
    const ns = deacc(s.toLowerCase());
    let list = ORDERS.filter((o) => (!src || o.src.k === src) && (!cid || o.c.id === cid) && (!mon || `${new Date(o.t).getFullYear()}-${p2(new Date(o.t).getMonth() + 1)}` === mon)
      && (!ns || String(o.id).includes(ns) || deacc(`${custName(o.c)} ${o.c.email} ${o.c.comuna} ${o.doc ? o.doc.folio : ''}`.toLowerCase()).includes(ns)));
    const counts = {}; list.forEach((o) => (counts[o.st] = (counts[o.st] || 0) + 1));
    if (st) list = list.filter((o) => o.st === st);
    const months = [...new Set(ORDERS.map((o) => { const d = new Date(o.t); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`; }))];
    const rows = list.slice((page - 1) * per, page * per);
    const base = '#/pedidos';
    const tabs = [['', 'Todos', Object.values(counts).reduce((a, b) => a + b, 0)], ...['pending', 'processing', 'completed', 'cancelled', 'refunded', 'failed'].map((k) => [k, ST[k], counts[k] || 0])].filter(([k, , n]) => !k || n);
    const c = cid && CUST.find((x) => x.id === cid);
    return `
      <div class="wrap-h"><h1>Pedidos</h1><button class="page-title-action" data-act="nuevo-pedido">Añadir pedido</button></div>
      ${c ? `<div class="notice"><p>Mostrando solo los pedidos de <b>${esc(custName(c))}</b>. <a href="${href(base, q, { cliente: '', pag: '' })}">Ver todos</a></p></div>` : ''}
      <ul class="subsubsub">${tabs.map(([k, l, n]) => `<li><a href="${href(base, q, { estado: k, pag: '' })}" class="${st === k ? 'current' : ''}">${l} <span class="n">(${miles(n)})</span></a></li>`).join('')}</ul>
      <form class="tablenav" data-form="pedidos">
        <select name="bulk" aria-label="Acciones en lote" class="hide-m"><option value="">Acciones en lote</option><option value="processing">Cambiar estado a Procesando</option><option value="completed">Cambiar estado a Completado</option><option value="cancelled">Cambiar estado a Cancelado</option></select>
        <button class="button hide-m" type="button" data-act="bulk">Aplicar</button>
        <select name="mes" aria-label="Filtrar por fecha"><option value="">Todas las fechas</option>${months.map((m) => { const [y, mm] = m.split('-'); return `<option value="${m}"${m === mon ? ' selected' : ''}>${MESL[+mm - 1]} ${y}</option>`; }).join('')}</select>
        <select name="origen" aria-label="Filtrar por origen"><option value="">Todos los orígenes</option>${ORIG.map((o) => `<option value="${o.k}"${o.k === src ? ' selected' : ''}>${o.lbl}</option>`).join('')}</select>
        <button class="button" type="submit">Filtrar</button>
        <span class="search-box"><label class="screen-reader-text" for="sq">Buscar pedidos</label><input type="search" id="sq" name="q" value="${esc(s)}" placeholder="N°, cliente, correo, comuna o folio"><button class="button" type="submit">Buscar pedidos</button></span>
      </form>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>
      <table class="wp-list-table">
        <thead><tr><td class="check hide-m"><input type="checkbox" aria-label="Seleccionar todos" data-all></td><th>Pedido</th><th class="hide-m">Fecha</th><th>Estado</th><th class="hide-m">Documento</th><th class="hide-m">Envío</th><th class="hide-m">Origen</th><th class="num">Total</th></tr></thead>
        <tbody>${rows.length ? rows.map((o) => `<tr class="clickable" data-go="#/pedido/${o.id}">
          <th class="check hide-m" scope="row"><input type="checkbox" value="${o.id}" aria-label="Seleccionar pedido ${o.id}"></th>
          <td><a class="row-title" href="#/pedido/${o.id}">#${o.id} ${esc(custName(o.c))}</a>${o.cnote ? ' <span title="Tiene nota del cliente" aria-label="Tiene nota del cliente">💬</span>' : ''}<div class="muted small">${esc(o.c.comuna)}<span class="show-m"> · ${ago(o.t)}</span></div></td>
          <td class="hide-m nw"><time datetime="${new Date(o.t).toISOString()}" title="${fFull(o.t)}">${ago(o.t)}</time></td>
          <td>${pill(o.st)}</td>
          <td class="hide-m nw">${o.doc ? `${o.doc.type.split(' ')[0]} N° ${o.doc.folio}` : '<span class="muted">—</span>'}</td>
          <td class="hide-m">${esc(o.ship.m.replace(' a domicilio', '').replace(' — Quinta Normal', ''))}<div class="muted small">${o.ship.cost ? clp(o.ship.cost) : 'Gratis'}</div></td>
          <td class="hide-m">${otag(o)}</td>
          <td class="num nw">${clp(o.total)}<div class="muted small">${esc(o.pay)}</div></td></tr>`).join('') : '<tr class="no-items"><td colspan="8">No se encontraron pedidos.</td></tr>'}</tbody>
        <tfoot><tr><td class="check"></td><th>Pedido</th><th class="hide-m">Fecha</th><th>Estado</th><th class="hide-m">Documento</th><th class="hide-m">Envío</th><th class="hide-m">Origen</th><th class="num">Total</th></tr></tfoot>
      </table>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>`;
  };

  V.pedido = (q, id) => {
    const o = oId.get(+id);
    if (!o) return `<div class="wrap-h"><h1>Pedido no encontrado</h1></div><p><a href="#/pedidos">Volver a pedidos</a></p>`;
    const c = o.c, paidNote = o.notes.find((n) => n.txt.startsWith('Klap aprobó'));
    const notes = [...o.notes].reverse();
    return `
      <div class="wrap-h"><h1>Editar pedido</h1><button class="page-title-action" data-act="nuevo-pedido">Añadir pedido</button></div>
      <div class="cols">
        <div>
          <div class="postbox"><div class="inside">
            <h2 style="font-size:24px;font-weight:800;font-stretch:88%;letter-spacing:-.01em;margin:0 0 4px">Detalles del pedido #${o.id}</h2>
            <p class="muted" style="margin:0 0 16px">${o.auth ? `Pago con Klap (${esc(o.pay)}). Pagado el ${fFull(paidNote ? paidNote.t : o.t)}.` : o.st === 'failed' ? 'Pago rechazado por Klap.' : 'Aún sin pago.'} ${o.doc ? `${o.doc.type} N° ${o.doc.folio}.` : ''}</p>
            <div class="grid3">
              <div>
                <h3 style="font-size:14px;margin:0 0 10px">General</h3>
                <div class="field"><label for="fc">Fecha de creación</label><input type="text" id="fc" value="${fFull(o.t)}" disabled></div>
                <div class="field"><label for="ost">Estado</label><select id="ost">${Object.entries(ST).map(([k, l]) => `<option value="${k}"${k === o.st ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
                <div class="field"><span class="lbl">Cliente</span><a href="#/clientes?q=${encodeURIComponent(c.email)}">${esc(custName(c))}</a> · <a href="#/pedidos?cliente=${c.id}">Ver otros pedidos →</a></div>
              </div>
              <div class="addr">
                <h3 style="font-size:14px;margin:0 0 10px">Facturación</h3>
                ${o.fac ? `<p><b>${esc(c.emp.name)}</b></p><p>RUT ${c.emp.rut}</p><p>Giro: ${esc(c.emp.giro)}</p>` : `<p>${esc(custName(c))}</p><p>RUT ${c.rut}</p>`}
                <p>${esc(c.street)}</p><p>${esc(c.comuna)}, ${esc(c.region)}</p>
                <p style="margin-top:10px"><b>Correo:</b> <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>
                <p><b>Teléfono:</b> <a href="https://wa.me/${c.phone.replace(/\D/g, '')}" target="_blank" rel="noopener">${esc(c.phone)}</a></p>
                <p style="margin-top:10px"><b>Documento:</b> ${o.fac ? 'Factura' : 'Boleta'}</p>
              </div>
              <div class="addr">
                <h3 style="font-size:14px;margin:0 0 10px">Envío</h3>
                ${o.ship.cost || !/Retiro/.test(o.ship.m) ? `<p>${esc(custName(c))}</p><p>${esc(c.street)}</p><p>${esc(c.comuna)}, ${esc(c.region)}</p>` : '<p>Retira en la tienda de Quinta Normal.</p>'}
                <p style="margin-top:10px"><b>Método:</b> ${esc(o.ship.m)}</p>
                ${o.ship.track ? `<p><b>Seguimiento:</b> ${esc(o.ship.carrier)} ${o.ship.track}</p>` : ''}
                ${o.cnote ? `<p style="margin-top:10px"><b>Nota del cliente:</b> ${esc(o.cnote)}</p>` : ''}
              </div>
            </div>
          </div></div>
          <div class="postbox"><div class="inside flush">
            <table class="items"><thead><tr><th colspan="2">Artículo</th><th class="num hide-m">Costo</th><th class="num">Cant.</th><th class="num">Total</th></tr></thead>
            <tbody>${o.lines.map((l) => `<tr><td style="width:56px"><img class="thumb" src="${img(l.p)}" alt="" loading="lazy"></td><td><a href="#/producto/${l.p.fam || l.p.id}">${esc(l.p.n)}</a><div class="sku">SKU: ${esc(l.p.sku || '—')}</div></td><td class="num hide-m">${clp(l.price)}</td><td class="num">× ${l.q}</td><td class="num">${clp(l.price * l.q)}</td></tr>`).join('')}
            <tr><td></td><td>Envío: ${esc(o.ship.m)}</td><td class="hide-m"></td><td></td><td class="num">${o.ship.cost ? clp(o.ship.cost) : 'Gratis'}</td></tr></tbody></table>
            <table class="totals"><tbody>
              <tr><td>Subtotal de artículos:</td><td>${clp(o.sub)}</td></tr>
              <tr><td>Envío:</td><td>${clp(o.ship.cost)}</td></tr>
              <tr class="grand"><td>Total del pedido:</td><td>${clp(o.total)}</td></tr>
              <tr><td class="muted">IVA incluido:</td><td class="muted">${clp(o.total - o.total / 1.19)}</td></tr>
              ${o.st === 'refunded' ? `<tr><td style="color:#b32d2e">Reembolsado:</td><td style="color:#b32d2e">−${clp(o.total)}</td></tr>` : ''}
            </tbody></table>
            <div class="major-publishing-actions"><span class="muted small">Precios con IVA, tal como se cobraron.</span>${['processing', 'completed'].includes(o.st) ? '<button class="button" data-act="reembolso">Reembolso</button>' : ''}</div>
          </div></div>
        </div>
        <div>
          <div class="postbox"><h2 class="hndle">Acciones del pedido</h2><div class="inside">
            <select id="oact" style="width:100%"><option value="">Elige una acción…</option><option>Enviar detalles del pedido al cliente</option><option>Reenviar ${o.fac ? 'factura' : 'boleta'} al cliente</option><option>Generar envío en Sendu</option><option>Emitir documento en Bsale de nuevo</option></select>
          </div><div class="major-publishing-actions"><button class="button-link-delete" data-act="papelera">Mover a la papelera</button><button class="button button-primary" data-act="guardar-pedido" data-id="${o.id}">Actualizar</button></div></div>
          ${box('Documento tributario', o.doc ? `<dl class="kv"><dt>Tipo</dt><dd>${o.doc.type}</dd><dt>Folio</dt><dd>N° ${o.doc.folio}</dd>${o.nc ? `<dt>Nota de crédito</dt><dd>N° ${o.nc}</dd>` : ''}<dt>Emitido</dt><dd>Automático, al aprobarse el pago</dd><dt>Stock</dt><dd>Descontado en Bsale</dd></dl><p style="margin:12px 0 0"><button class="button" data-act="pdf">Ver PDF en Bsale</button></p>` : '<p class="muted" style="margin:0">Se emite automáticamente en Bsale cuando Klap aprueba el pago.</p>')}
          ${box('De dónde vino', `<dl class="kv"><dt>Origen</dt><dd>${otag(o)}</dd><dt>Tipo de origen</dt><dd>${o.src.type}</dd><dt>Fuente / medio</dt><dd>${esc(o.src.src)} / ${esc(o.src.med)}</dd>${o.camp ? `<dt>Campaña</dt><dd>${esc(o.camp)}</dd>` : ''}<dt>Página de entrada</dt><dd>${esc(o.landing)}</dd><dt>Dispositivo</dt><dd>${o.dev}</dd><dt>Páginas vistas</dt><dd>${o.pages}</dd></dl>`)}
          ${box('Historial del cliente', (() => { const all = ORDERS.filter((x) => x.c === c && PAID.has(x.st)); return `<dl class="kv"><dt>Pedidos pagados</dt><dd>${all.length}</dd><dt>Total gastado</dt><dd>${clp(all.reduce((s, x) => s + x.total, 0))}</dd><dt>Ticket promedio</dt><dd>${clp(all.length ? all.reduce((s, x) => s + x.total, 0) / all.length : 0)}</dd></dl>`; })())}
          ${box('Notas del pedido', `<ul class="notes" id="notes">${notes.map(noteHtml).join('')}</ul>
            <div class="field" style="margin-top:12px"><label for="nn">Añadir nota</label><textarea id="nn" rows="3"></textarea></div>
            <div style="display:flex;gap:6px"><select id="nk" aria-label="Tipo de nota" style="flex:1"><option value="private">Nota privada</option><option value="customer">Nota para el cliente</option></select><button class="button" data-act="nota" data-id="${o.id}">Añadir</button></div>`)}
        </div>
      </div>`;
  };
  const noteHtml = (n) => `<li class="${n.kind}"><div class="note-content">${esc(n.txt)}</div><p class="meta">${fFull(n.t)} · por ${esc(n.by)}${n.kind === 'customer' ? ' · visible para el cliente' : ''}</p></li>`;

  V.productos = (q) => {
    const s = deacc((q.get('q') || '').trim().toLowerCase()), g = q.get('cat') || '', b = q.get('marca') || '', stk = q.get('stock') || '', vis = q.get('ver') || '';
    const page = Math.max(1, +q.get('pag') || 1), per = 20, base = '#/productos';
    let list = HEADS.filter((p) => (!g || p.g === g) && (!b || p.b === b) && (!s || deacc(`${p.n} ${p.sku} ${p.b}`.toLowerCase()).includes(s) || (p.vs || []).some((v) => String(v.sku).includes(s)))
      && (!stk || (stk === 'agotado' ? p.stk === 0 : stk === 'bajo' ? p.stk != null && p.stk > 0 && p.stk <= 2 : p.stk !== 0)));
    const cnt = { '': list.length, dest: list.filter((p) => featured.has(p.id)).length, ocultos: list.filter((p) => hidden.has(p.id)).length };
    if (vis === 'dest') list = list.filter((p) => featured.has(p.id));
    if (vis === 'ocultos') list = list.filter((p) => hidden.has(p.id));
    const brands = [...new Set(HEADS.map((p) => p.b).filter(Boolean))].sort((a, z) => a.localeCompare(z, 'es'));
    const rows = list.slice((page - 1) * per, page * per);
    return `
      <div class="wrap-h"><h1>Productos</h1><a class="page-title-action" href="#/producto/nuevo">Añadir nuevo</a></div>
      <div class="notice"><p><span class="lock">Bsale</span> El <b>nombre, SKU, precio y stock</b> vienen de Bsale y se actualizan solos (se editan allá). Aquí se edita lo que se ve en la web: fotos, descripción, categoría, formatos, destacado y SEO.</p></div>
      <ul class="subsubsub">${[['', 'Todos'], ['dest', 'Destacados'], ['ocultos', 'Ocultos']].map(([k, l]) => `<li><a href="${href(base, q, { ver: k, pag: '' })}" class="${vis === k ? 'current' : ''}">${l} <span class="n">(${miles(cnt[k])})</span></a></li>`).join('')}</ul>
      <form class="tablenav" data-form="productos">
        <select name="cat" aria-label="Filtrar por categoría"><option value="">Todas las categorías</option>${GROUPS.map((x) => `<option value="${x.id}"${x.id === g ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <select name="marca" aria-label="Filtrar por marca"><option value="">Todas las marcas</option>${brands.map((x) => `<option${x === b ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>
        <select name="stock" aria-label="Filtrar por stock"><option value="">Cualquier stock</option><option value="hay"${stk === 'hay' ? ' selected' : ''}>Hay existencias</option><option value="bajo"${stk === 'bajo' ? ' selected' : ''}>Pocas unidades</option><option value="agotado"${stk === 'agotado' ? ' selected' : ''}>Agotado</option></select>
        <button class="button" type="submit">Filtrar</button>
        <span class="search-box"><label class="screen-reader-text" for="ps">Buscar productos</label><input type="search" id="ps" name="q" value="${esc(q.get('q') || '')}" placeholder="Nombre, marca o SKU"><button class="button" type="submit">Buscar productos</button></span>
      </form>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>
      <table class="wp-list-table">
        <thead><tr><td class="check hide-m"><input type="checkbox" aria-label="Seleccionar todos" data-all></td><th style="width:60px"><span class="screen-reader-text">Foto</span></th><th>Nombre</th><th class="hide-m">SKU</th><th>Stock</th><th class="num">Precio</th><th class="hide-m">Categorías</th><th class="hide-m">Marca</th><th class="hide-m" title="Destacado">★</th></tr></thead>
        <tbody>${rows.length ? rows.map((p) => `<tr>
          <th class="check hide-m" scope="row"><input type="checkbox" aria-label="Seleccionar ${esc(p.n)}"></th>
          <td><img class="thumb" src="${img(p)}" alt="" loading="lazy"></td>
          <td><a class="row-title" href="#/producto/${p.id}">${esc(p.n)}</a>${hidden.has(p.id) ? ' — <span class="muted">Oculto</span>' : ''}${p.vs ? `<div class="muted small">${p.vs.length} formatos</div>` : ''}
            <div class="row-actions">ID: ${p.id} | <a href="#/producto/${p.id}">Editar</a> | <a href="/producto/${p.s}" target="_blank" rel="noopener">Ver en la tienda</a></div></td>
          <td class="hide-m">${esc(p.sku || '—')}</td>
          <td>${stockCell(p)}</td>
          <td class="num">${p.vs ? `${clp(p.vs[0].p)} – ${clp(p.vs[p.vs.length - 1].p)}` : clp(p.p)}</td>
          <td class="hide-m">${esc(catLine(p))}</td>
          <td class="hide-m">${esc(p.b || '—')}</td>
          <td class="hide-m"><button class="star${featured.has(p.id) ? ' on' : ''}" data-act="star" data-id="${p.id}" aria-pressed="${featured.has(p.id)}" aria-label="Destacado">★</button></td></tr>`).join('') : '<tr class="no-items"><td colspan="9">No se encontraron productos.</td></tr>'}</tbody>
      </table>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>`;
  };

  V.producto = (q, id) => {
    if (id === 'nuevo') return `
      <div class="wrap-h"><h1>Añadir nuevo producto</h1></div>
      <div class="notice notice--warn"><p><b>Los productos nuevos se crean en Bsale</b>, con su SKU, precio y stock. En menos de un minuto aparecen solos en esta lista, como borrador oculto.</p><p>Aquí solo completas lo que la web necesita: fotos, descripción, categoría y SEO. Después lo publicas.</p></div>
      <p><a class="button" href="#/productos">Volver a productos</a></p>`;
    let p = byId.get(+id);
    if (!p) return `<div class="wrap-h"><h1>Producto no encontrado</h1></div><p><a href="#/productos">Volver a productos</a></p>`;
    if (p.fam && p.fam !== p.id) p = byId.get(p.fam);
    const vs = p.vs || [p], sm = seo.get(p.id) || { t: `${p.n} - Reycars Store`, d: String(p.d || '').replace(/\s+/g, ' ').replace(/^.{0,60}?descripci[oó]n\s*:?\s*/i, '').slice(0, 155) };
    const sold = ORDERS.filter((o) => PAID.has(o.st) && o.lines.some((l) => vs.includes(l.p)));
    return `
      <div class="wrap-h"><h1>Editar producto</h1><a class="page-title-action" href="#/producto/nuevo">Añadir nuevo</a></div>
      <div class="cols">
        <div>
          <label class="screen-reader-text" for="pt">Nombre</label><input type="text" id="pt" class="title-input" value="${esc(p.n)}" disabled>
          <p class="muted small" style="margin:-10px 0 14px"><span class="lock">Nombre desde Bsale</span> · Enlace permanente: <a href="/producto/${p.s}" target="_blank" rel="noopener">reycarstore.cl/producto/${esc(p.s)}</a></p>
          ${box('Descripción', `<textarea rows="9" aria-label="Descripción">${esc(p.d || '')}</textarea>`)}
          <div class="postbox"><h2 class="hndle">Datos del producto <span class="act muted">${plural(sold.length, 'venta', 'ventas')} en 180 días</span></h2><div class="inside flush"><div class="pdata">
            <div class="tabs" role="tablist">${['General', 'Inventario', 'Formatos', 'Envío'].map((t, i) => `<button role="tab" aria-selected="${!i}" data-tab="${i}">${t}</button>`).join('')}</div>
            <div class="panel" data-panel="0"><div class="field"><label>Precio normal ($)</label><input type="text" value="${miles(p.p)}" disabled> <span class="lock">Se cambia en la lista de precios de Bsale</span></div><div class="field"><label>Precio de oferta ($)</label><input type="text" value="" placeholder="Sin oferta" disabled> <span class="lock">Por lista de precios o promoción en Bsale</span></div></div>
            <div class="panel" data-panel="1" hidden><dl class="kv"><dt>SKU</dt><dd>${esc(p.sku || '—')}</dd><dt>Stock</dt><dd>${stockCell(p)}</dd><dt>Sucursal</dt><dd>Casa Matriz (Quinta Normal)</dd><dt>Sincronizado</dt><dd>Hace menos de 1 minuto</dd></dl><p class="muted small">El stock se descuenta en Bsale al pagarse cada pedido; las ventas del local también se reflejan aquí.</p></div>
            <div class="panel" data-panel="2" hidden><p class="muted small" style="margin-top:0">Los formatos se muestran como un solo producto en la tienda, con selector (1 L, 5 L…).</p><table class="items"><thead><tr><th>Formato</th><th>SKU</th><th class="num">Precio</th><th>Stock</th></tr></thead><tbody>${vs.map((v) => `<tr><td>${esc((v.n.match(/\d+(?:[.,]\d+)?\s?(?:ml|cc|l|lt|lts|litros?|gr?|kg|galón|gal)\b/i) || [v === p ? 'Principal' : 'Formato'])[0])}</td><td>${esc(v.sku || '—')}</td><td class="num">${clp(v.p)}</td><td>${stockCell(v)}</td></tr>`).join('')}</tbody></table><p><button class="button" data-act="unir">Unir otro formato…</button></p></div>
            <div class="panel" data-panel="3" hidden><div class="grid2"><div class="field"><label for="pw">Peso (kg)</label><input type="number" id="pw" step="0.1" value="${(/5\s?l/i.test(p.n) ? 5.4 : 1.1)}"></div><div class="field"><label>Dimensiones (cm)</label><span style="display:flex;gap:4px"><input type="number" aria-label="Largo" value="12" style="width:33%"><input type="number" aria-label="Ancho" value="8" style="width:33%"><input type="number" aria-label="Alto" value="${/5\s?l/i.test(p.n) ? 32 : 26}" style="width:33%"></span></div></div><p class="muted small">Sendu usa el peso y las medidas para cotizar el despacho en el checkout.</p></div>
          </div></div></div>
          <div class="postbox"><h2 class="hndle">SEO <span class="act">cómo aparece en Google</span></h2><div class="inside">
            <div class="serp" aria-label="Vista previa en Google"><div class="u">reycarstore.cl › producto › ${esc(p.s.slice(0, 40))}</div><div class="t" id="serpT"></div><div class="d" id="serpD"></div></div>
            <div class="field" style="margin-top:14px"><label for="seoT">Título SEO <span class="muted small" id="seoTc"></span></label><input type="text" id="seoT" value="${esc(sm.t)}" style="width:100%"><div class="meter"><i id="seoTm"></i></div></div>
            <div class="field"><label for="seoD">Meta descripción <span class="muted small" id="seoDc"></span></label><textarea id="seoD" rows="3">${esc(sm.d)}</textarea><div class="meter"><i id="seoDm"></i></div></div>
            <div class="field"><label for="seoK">Palabra clave principal</label><input type="text" id="seoK" value="${esc((p.n.split(' ').slice(0, 3)).join(' ').toLowerCase())}" style="width:100%"></div>
          </div></div>
        </div>
        <div>
          <div class="postbox"><h2 class="hndle">Publicar</h2><div class="inside"><dl class="kv">
            <dt>Estado</dt><dd><b>${hidden.has(p.id) ? 'Oculto' : 'Publicado'}</b></dd>
            <dt><label for="pv">Visibilidad</label></dt><dd><select id="pv"><option value="1">Visible en la tienda</option><option value="0"${hidden.has(p.id) ? ' selected' : ''}>Oculto</option></select></dd>
            <dt>Destacado</dt><dd><label><input type="checkbox" id="pf"${featured.has(p.id) ? ' checked' : ''}> En la portada</label></dd></dl></div>
            <div class="major-publishing-actions"><a href="/producto/${p.s}" target="_blank" rel="noopener">Vista previa</a><button class="button button-primary" data-act="guardar-producto" data-id="${p.id}">Actualizar</button></div></div>
          ${box('Categorías del producto', `<div class="cats">${GROUPS.map((x) => `<label><input type="checkbox"${x.id === p.g ? ' checked' : ''}> ${esc(x.name)}</label>${(x.subs || []).map((s) => `<label class="ch"><input type="checkbox"${x.id === p.g && s.id === p.sc ? ' checked' : ''}> ${esc(s.name)}</label>`).join('')}`).join('')}</div>`)}
          ${box('Marca', `<select style="width:100%" aria-label="Marca">${[...new Set(HEADS.map((x) => x.b).filter(Boolean))].sort((a, z) => a.localeCompare(z, 'es')).map((x) => `<option${x === p.b ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`)}
          ${box('Imagen del producto', `<img class="featured-img" src="${img(p, 0, 0)}" alt="${esc(p.n)}"><p style="margin:8px 0 0"><button class="button" data-act="foto">Cambiar imagen</button></p>`)}
          ${box('Galería del producto', `${p.im && p.im.length > 1 ? `<div class="gal">${p.im.slice(1, 9).map((_, i) => `<img src="${img(p, i + 1)}" alt="" loading="lazy">`).join('')}</div>` : '<p class="muted" style="margin:0">Sin fotos adicionales.</p>'}<p style="margin:8px 0 0"><button class="button" data-act="foto">Añadir imágenes</button></p>`)}
        </div>
      </div>`;
  };
  V.producto.after = () => {
    const t = $('#seoT'), d = $('#seoD');
    if (!t) return;
    const m = (el, bar, cnt, lo, hi) => { const n = el.value.length; $(cnt).textContent = `(${n} de ${hi} caracteres)`; const b = $(bar); b.style.width = Math.min(100, (n / hi) * 100) + '%'; b.style.background = n > hi ? '#d63638' : n >= lo ? '#00a32a' : '#dba617'; };
    const up = () => { $('#serpT').textContent = t.value.length > 60 ? t.value.slice(0, 58) + '…' : t.value; $('#serpD').textContent = d.value.length > 160 ? d.value.slice(0, 157) + '…' : d.value || 'Google mostrará un fragmento de la descripción.'; m(t, '#seoTm', '#seoTc', 40, 60); m(d, '#seoDm', '#seoDc', 120, 160); };
    t.addEventListener('input', up); d.addEventListener('input', up); up();
  };

  V.clientes = (q) => {
    const s = deacc((q.get('q') || '').trim().toLowerCase()), sort = q.get('orden') || 'gasto';
    const page = Math.max(1, +q.get('pag') || 1), per = 20, base = '#/clientes';
    const m = new Map();
    ORDERS.forEach((o) => { const x = m.get(o.c) || { c: o.c, n: 0, v: 0, last: 0 }; if (PAID.has(o.st)) { x.n++; x.v += o.total; } x.last = Math.max(x.last, o.t); m.set(o.c, x); });
    let list = [...m.values()].filter((x) => !s || deacc(`${custName(x.c)} ${x.c.email} ${x.c.comuna} ${x.c.emp ? x.c.emp.name : ''}`.toLowerCase()).includes(s));
    list.sort((a, b) => (sort === 'reciente' ? b.last - a.last : sort === 'pedidos' ? b.n - a.n || b.v - a.v : b.v - a.v));
    const rows = list.slice((page - 1) * per, page * per);
    const rep = [...m.values()].filter((x) => x.n > 1).length;
    return `
      <div class="wrap-h"><h1>Clientes</h1></div>
      <div class="tiles">${tile('Clientes con pedidos', miles(m.size), 'últimos 180 días')}${tile('Compraron más de una vez', miles(rep), `${Math.round((rep / m.size) * 100)} % del total`)}${tile('Gasto promedio por cliente', clp([...m.values()].reduce((a, x) => a + x.v, 0) / m.size), 'pedidos pagados')}${tile('Con factura', miles([...m.values()].filter((x) => x.c.emp).length), 'empresas con RUT y giro')}</div>
      <form class="tablenav" data-form="clientes">
        <select name="orden" aria-label="Ordenar"><option value="gasto">Mayor gasto</option><option value="pedidos"${sort === 'pedidos' ? ' selected' : ''}>Más pedidos</option><option value="reciente"${sort === 'reciente' ? ' selected' : ''}>Compra más reciente</option></select><button class="button" type="submit">Ordenar</button>
        <span class="search-box"><label class="screen-reader-text" for="cs">Buscar clientes</label><input type="search" id="cs" name="q" value="${esc(q.get('q') || '')}" placeholder="Nombre, correo, comuna o empresa"><button class="button" type="submit">Buscar</button></span>
      </form>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>
      <table class="wp-list-table"><thead><tr><th>Nombre</th><th class="hide-m">Correo</th><th class="hide-m">Comuna</th><th class="num">Pedidos</th><th class="num">Gasto total</th><th class="hide-m">Último pedido</th></tr></thead>
      <tbody>${rows.length ? rows.map((x) => `<tr class="clickable" data-go="#/pedidos?cliente=${x.c.id}"><td><a class="row-title" href="#/pedidos?cliente=${x.c.id}">${esc(custName(x.c))}</a>${x.c.emp ? `<div class="muted small">${esc(x.c.emp.name)}</div>` : ''}</td><td class="hide-m">${esc(x.c.email)}</td><td class="hide-m">${esc(x.c.comuna)}</td><td class="num">${x.n}</td><td class="num">${clp(x.v)}</td><td class="hide-m">${ago(x.last)}</td></tr>`).join('') : '<tr class="no-items"><td colspan="6">No se encontraron clientes.</td></tr>'}</tbody></table>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>`;
  };

  V.analitica = (q) => {
    const r = [7, 30, 90].includes(+q.get('r')) ? +q.get('r') : 30, view = q.get('ver') === 'tabla' ? 'tabla' : 'grafico';
    const a = agg(r), b = agg(r, r);
    const bySrc = groupBy(a.list, (o) => o.src.lbl), byType = groupBy(a.list, (o) => o.src.type);
    const byCat = (() => { const m = new Map(); a.list.forEach((o) => o.lines.forEach((l) => { const k = gById.get(l.p.g)?.name || 'Otros'; const x = m.get(k) || { l: k, v: 0, n: 0 }; x.v += l.q * l.price; x.n++; m.set(k, x); })); return [...m.values()].sort((x, y) => y.v - x.v); })();
    const prods = (() => { const m = new Map(); a.list.forEach((o) => o.lines.forEach((l) => { const h = l.p.fam ? byId.get(l.p.fam) : l.p; const x = m.get(h) || { p: h, u: 0, v: 0 }; x.u += l.q; x.v += l.q * l.price; m.set(h, x); })); return [...m.values()].sort((x, y) => y.v - x.v).slice(0, 10); })();
    const camps = groupBy(a.list.filter((o) => o.camp), (o) => `${o.src.lbl}|${o.camp}`);
    const prevBySrc = new Map(groupBy(b.list, (o) => o.src.lbl).map((x) => [x.l, x]));
    const dev = groupBy(a.list, (o) => o.dev);
    const seg = (k, opts, cur) => `<span class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-q="${k}=${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join('')}</span>`;
    return `
      <div class="wrap-h"><h1>Analítica</h1>${seg('r', [[7, '7 días'], [30, '30 días'], [90, '90 días']], r)}</div>
      <p class="muted" style="margin:-6px 0 14px">${fDate(a.daily[0].d)} – ${fDate(a.daily[a.daily.length - 1].d)}, comparado con ${fDate(b.daily[0].d)} – ${fDate(b.daily[b.daily.length - 1].d)}. Solo pedidos pagados (Procesando y Completado).</p>
      <div class="tiles">${tile('Ventas', clp(a.sales), delta(a.sales, b.sales))}${tile('Pedidos', miles(a.n), delta(a.n, b.n))}${tile('Ticket promedio', clp(a.avg), delta(a.avg, b.avg))}${tile('Productos vendidos', miles(a.units), delta(a.units, b.units))}</div>
      <div class="postbox"><div class="chart-head"><h2>Ventas por día</h2><span class="legend"><span><i style="background:var(--data)"></i>Período seleccionado</span><span><i style="background:var(--cmp)"></i>Período anterior</span></span>${seg('ver', [['grafico', 'Gráfico'], ['tabla', 'Tabla']], view)}</div>
        ${view === 'tabla' ? `<div style="max-height:360px;overflow:auto"><table class="mini"><thead><tr><td><b>Día</b></td><td class="num"><b>Pedidos</b></td><td class="num"><b>Ventas</b></td><td class="num"><b>Período anterior</b></td></tr></thead><tbody>${a.daily.map((d, i) => `<tr><td>${fDate(d.d)}</td><td class="num">${d.n}</td><td class="num">${clp(d.v)}</td><td class="num muted">${clp(b.daily[i].v)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="chart" id="cday"></div>'}</div>
      <div class="dash">
        ${box('Ventas por origen', bars(bySrc, a.sales), 'qué trajo cada compra', true)}
        ${box('Ventas por categoría', bars(byCat.slice(0, 8), byCat.reduce((s, x) => s + x.v, 0)), 'artículos, sin envío', true)}
      </div>
      ${box('Detalle por origen', `<div style="overflow-x:auto"><table class="mini"><thead><tr><td><b>Origen</b></td><td class="hide-m"><b>Tipo</b></td><td class="num"><b>Pedidos</b></td><td class="num"><b>Ventas</b></td><td class="num hide-m"><b>Ticket promedio</b></td><td class="num"><b>% de ventas</b></td><td class="num hide-m"><b>vs. anterior</b></td></tr></thead><tbody>${bySrc.map((x) => { const o = ORIG.find((y) => y.lbl === x.l); const pv = prevBySrc.get(x.l); return `<tr><td><a href="#/pedidos?origen=${o.k}">${esc(x.l)}</a></td><td class="hide-m">${o.type}</td><td class="num">${x.n}</td><td class="num">${clp(x.v)}</td><td class="num hide-m">${clp(x.v / x.n)}</td><td class="num">${Math.round((x.v / a.sales) * 100)} %</td><td class="num hide-m delta">${pv ? delta(x.v, pv.v).replace('<span class="vs"> vs. período anterior</span>', '') : '—'}</td></tr>`; }).join('')}</tbody></table></div>
        <p class="muted small" style="padding:0 12px">Por tipo: ${byType.map((x) => `${x.l} ${Math.round((x.v / a.sales) * 100)} %`).join(' · ')}. Por dispositivo: ${dev.map((x) => `${x.l} ${Math.round((x.n / a.n) * 100)} %`).join(' · ')}.</p>`, '', true)}
      <div class="dash">
        ${box('Campañas con ventas', `<table class="mini"><tbody>${camps.slice(0, 8).map((x) => { const [s, c] = x.l.split('|'); return `<tr><td>${esc(c)}<div class="muted small">${esc(s)}</div></td><td class="num">${plural(x.n, 'pedido', 'pedidos')}</td><td class="num">${clp(x.v)}</td></tr>`; }).join('') || '<tr><td class="muted">Sin campañas en el período.</td></tr>'}</tbody></table>`, 'según UTM', true)}
        ${box('Productos más vendidos', `<table class="mini"><tbody>${prods.map((x) => `<tr><td style="width:44px"><img class="thumb" src="${img(x.p)}" alt="" loading="lazy"></td><td><a href="#/producto/${x.p.id}">${esc(x.p.n)}</a></td><td class="num">${x.u} u.</td><td class="num">${clp(x.v)}</td></tr>`).join('')}</tbody></table>`, '', true)}
      </div>
      <div class="notice"><p><b>En la versión real</b> este informe se cruza con Google Analytics 4 (visitas, tasa de conversión, embudo de compra) y con el gasto de Meta Ads y Google Ads, para ver el retorno de cada campaña (ROAS) sin salir del panel.</p></div>`;
  };
  V.analitica.after = (q) => {
    const el = $('#cday'); if (!el) return;
    const r = [7, 30, 90].includes(+q.get('r')) ? +q.get('r') : 30, a = agg(r), b = agg(r, r);
    lineChart(el, { label: `Ventas diarias, últimos ${r} días, comparado con el período anterior`, days: a.daily.map((d) => d.d), pdays: b.daily.map((d) => d.d), cur: a.daily.map((d) => d.v), prev: b.daily.map((d) => d.v), cnt: a.daily.map((d) => d.n), h: 260 });
  };

  const REDIR = [['/shop', '/tienda', 301], ['/tienda-online', '/tienda', 301], ['/categoria-producto/…', '/tienda', 301], ['/marca/motor-clean', '/motor-clean', 301], ['/marca/…', '/marcas', 301], ['/servicios/…', '/asesoria', 301], ['/nuestra-historia', '/', 301], ['/contacto', '/#contacto', 301], ['/my-account/…', '/', 302], ['/cart', '/', 302], ['/checkout', '/', 302]];
  V.seo = (q) => {
    const tab = q.get('tab') || 'redir';
    const tabs = [['redir', 'Redirecciones'], ['sitemap', 'Mapa del sitio'], ['titulos', 'Títulos y metas']];
    let body = '';
    if (tab === 'redir') body = `<p><button class="button" data-act="nueva-redir">Añadir nueva</button></p><table class="wp-list-table"><thead><tr><th>Dirección antigua</th><th>Lleva a</th><th>Tipo</th><th class="hide-m">Visitas (30 días)</th></tr></thead><tbody>${REDIR.map(([a, b, t], i) => `<tr><td><code>${esc(a)}</code></td><td><code>${esc(b)}</code></td><td>${t === 301 ? '301 permanente' : '302 temporal'}</td><td class="hide-m">${[412, 37, 655, 128, 240, 96, 21, 64, 88, 31, 19][i]}</td></tr>`).join('')}</tbody></table><p class="muted small">Las direcciones de productos se mantienen iguales que en el sitio actual (/producto/nombre), así no se pierde el posicionamiento ni se rompen los anuncios.</p>`;
    if (tab === 'sitemap') body = `<table class="form-table"><tbody><tr><th>Mapa del sitio</th><td><a href="/sitemap.xml" target="_blank" rel="noopener">/sitemap.xml</a><p class="description">Se genera solo con cada cambio de catálogo: secciones, categorías, subcategorías y un enlace por producto.</p></td></tr><tr><th>Google Search Console</th><td><span class="st-wait">Por conectar</span><p class="description">Se envía el mapa del sitio y se ven aquí las búsquedas que traen visitas.</p></td></tr><tr><th>Productos agotados</th><td><label class="switch"><input type="checkbox" checked> Mantener su página visible con "Agotado"</label><p class="description">Recomendado: conserva el posicionamiento y los anuncios mientras vuelve el stock.</p></td></tr></tbody></table>`;
    if (tab === 'titulos') body = `<table class="form-table"><tbody><tr><th><label for="t1">Título de productos</label></th><td><input type="text" id="t1" value="%nombre% - Reycars Store"><p class="description">Igual que hoy en Rank Math. Cada producto puede tener el suyo.</p></td></tr><tr><th><label for="t2">Título de categorías</label></th><td><input type="text" id="t2" value="%categoria% - Reycars Store"></td></tr><tr><th><label for="t3">Imagen al compartir</label></th><td>Foto principal del producto<p class="description">Es la que muestran WhatsApp, Facebook e Instagram al compartir un enlace.</p></td></tr></tbody></table><p><button class="button button-primary" data-act="guardar">Guardar cambios</button></p>`;
    return `<div class="wrap-h"><h1>SEO</h1></div><nav class="nav-tab-wrapper">${tabs.map(([k, l]) => `<a class="nav-tab${k === tab ? ' nav-tab-active' : ''}" href="#/seo?tab=${k}">${l}</a>`).join('')}</nav>${body}`;
  };

  V.usuarios = () => `
    <div class="wrap-h"><h1>Usuarios</h1><button class="page-title-action" data-act="nuevo-usuario">Añadir nuevo</button></div>
    <table class="wp-list-table"><thead><tr><th>Nombre de usuario</th><th>Nombre</th><th class="hide-m">Correo</th><th>Perfil</th><th class="hide-m">Último acceso</th></tr></thead><tbody>
      ${[['guillermo', 'Guillermo Araya', 'Administrador', 2 * HOUR], ['desarrollo', 'Equipo de desarrollo', 'Administrador', 26 * HOUR], ['ventas', 'Ventas y despacho', 'Gestor de la tienda', 40 * MIN]].map(([u, n, r, t]) => `<tr><td><span class="av" style="margin-right:10px;width:30px;height:30px;font-size:13px">${u[0].toUpperCase()}</span><a class="row-title" href="#/usuarios">${u}</a></td><td>${n}</td><td class="hide-m">${u}@ejemplo.cl</td><td>${r}</td><td class="hide-m">${ago(NOW - t)}</td></tr>`).join('')}
    </tbody></table>
    <div class="dash" style="margin-top:20px">
      ${box('Perfiles', '<dl class="kv"><dt>Administrador</dt><dd>Todo, incluidos los ajustes, conexiones y usuarios.</dd><dt>Gestor de la tienda</dt><dd>Pedidos, productos, clientes y analítica. No ve ajustes ni claves.</dd></dl>')}
      ${box('Seguridad', '<dl class="kv"><dt>Inicio de sesión</dt><dd>Correo y contraseña, con código de verificación en dos pasos.</dd><dt>Intentos fallidos</dt><dd>Bloqueo temporal tras 5 intentos (como Loginizer hoy).</dd><dt>Registro</dt><dd>Queda anotado quién cambió cada pedido.</dd></dl>')}
    </div>`;

  V.ajustes = (q) => {
    const tab = q.get('tab') || 'general';
    const tabs = [['general', 'General'], ['pagos', 'Pagos (Klap)'], ['envios', 'Envíos (Sendu)'], ['bsale', 'Bsale'], ['seguimiento', 'Seguimiento y anuncios']];
    const row = (l, inner, d = '') => `<tr><th>${l}</th><td>${inner}${d ? `<p class="description">${d}</p>` : ''}</td></tr>`;
    const secret = (id, ph) => `<input type="password" id="${id}" placeholder="${ph}" autocomplete="off">`;
    const B = {
      general: row('Nombre de la tienda', '<input type="text" value="Reycar Store">') + row('Dirección', '<input type="text" value="Quinta Normal, Región Metropolitana">', 'Aparece en el pie de página y en la opción de retiro en tienda.') + row('WhatsApp de atención', '<input type="text" value="+56 9 6355 5437">') + row('Correo de avisos de pedidos', '<input type="text" placeholder="ventas@…">', 'Recibe un aviso por cada pedido pagado.'),
      pagos: row('Estado', '<span class="st-wait">Faltan credenciales de Klap</span>', 'Klap entrega primero las credenciales de prueba; con ellas se prueba el pago completo antes de cobrar de verdad.') + row('Modo', '<select><option>Pruebas (sandbox)</option><option>Producción</option></select>') + row('<label for="kk">Clave de la API (apikey)</label>', secret('kk', 'Se guarda cifrada en el servidor'), 'Nunca se muestra después de guardarla ni se envía al navegador.') + row('Medios de pago', '<label class="switch"><input type="checkbox" checked> Tarjetas de crédito y débito</label><br><label class="switch"><input type="checkbox" checked> Google Pay</label><br><label class="switch"><input type="checkbox" checked> Apple Pay</label>') + row('Pedido sin pagar', '<select><option>Cancelar a los 60 minutos</option><option>Cancelar a las 24 horas</option></select>', 'Mientras tanto el producto no se descuenta del stock.'),
      envios: row('Estado', '<span class="st-wait">Por configurar</span>') + row('<label for="sk">Token de Sendu</label>', secret('sk', 'Se guarda cifrado en el servidor')) + row('Couriers', '<label class="switch"><input type="checkbox" checked> Starken</label><br><label class="switch"><input type="checkbox" checked> Chilexpress</label><br><label class="switch"><input type="checkbox" checked> Blue Express</label>') + row('Retiro en tienda', '<label class="switch"><input type="checkbox" checked> Ofrecer retiro gratis en Quinta Normal</label>') + row('Envío gratis', '<input type="text" placeholder="Monto mínimo, ej. 60.000">', 'Vacío = sin envío gratis.'),
      bsale: row('Estado', '<span class="st-wait">Falta el token de acceso</span>', 'Lo solicita el administrador de la cuenta de Bsale. Es un token nuevo, distinto del que usa hoy WordPress.') + row('<label for="bk">Token de acceso</label>', secret('bk', 'Se guarda cifrado en el servidor')) + row('Sucursal', '<select disabled><option>Casa Matriz (se carga al conectar)</option></select>', 'El stock web sale de esta sucursal.') + row('Lista de precios', '<select disabled><option>Lista web (se carga al conectar)</option></select>') + row('Documento al pagar', '<label class="switch"><input type="checkbox" checked> Emitir boleta o factura automáticamente cuando Klap aprueba el pago</label>', 'También descuenta el stock y envía el PDF al cliente.') + row('Avisos de Bsale', '<label class="switch"><input type="checkbox" checked> Actualizar precio y stock al instante cuando cambian en Bsale</label>'),
      seguimiento: row('<label for="ga">Google Analytics 4</label>', '<input type="text" id="ga" placeholder="G-XXXXXXXXXX">') + row('<label for="gtm">Google Tag Manager</label>', '<input type="text" id="gtm" placeholder="GTM-XXXXXXX">', 'El contenedor actual sigue funcionando: la tienda envía los mismos eventos que hoy (vista de producto, agregar al carro, compra).') + row('<label for="px">Píxel de Meta</label>', '<input type="text" id="px" placeholder="ID del píxel">') + row('<label for="capi">API de conversiones de Meta</label>', secret('capi', 'Token de acceso'), 'Envía las compras también desde el servidor, para que Meta no pierda ventas por bloqueadores o iPhone.') + row('Catálogos de productos', '<a href="#/seo">Meta: /feeds/meta.xml</a><br><a href="#/seo">Google Merchant: /feeds/google.xml</a>', 'Con los mismos ID de producto que hoy, para no reiniciar campañas ni públicos.') + row('Aviso de cookies', '<select><option>Pedir consentimiento (Consent Mode v2)</option><option>Solo informar</option></select>'),
    };
    return `<div class="wrap-h"><h1>Ajustes</h1></div><nav class="nav-tab-wrapper">${tabs.map(([k, l]) => `<a class="nav-tab${k === tab ? ' nav-tab-active' : ''}" href="#/ajustes?tab=${k}">${l}</a>`).join('')}</nav><table class="form-table"><tbody>${B[tab] || B.general}</tbody></table><p><button class="button button-primary" data-act="guardar">Guardar cambios</button></p>`;
  };

  /* ───────── enrutador (#/seccion/id?filtros) ───────── */
  const TITLES = { dash: 'Escritorio', pedidos: 'Pedidos', pedido: 'Editar pedido', productos: 'Productos', producto: 'Editar producto', clientes: 'Clientes', analitica: 'Analítica', seo: 'SEO', usuarios: 'Usuarios', ajustes: 'Ajustes' };
  function route() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = h.split('?'), q = new URLSearchParams(qs || ''), parts = path.split('/').filter(Boolean);
    const sec = parts[0] || '', key = sec === '' || sec === 'escritorio' ? 'dash' : sec, view = V[key];
    hideTip();
    drawMenu(sec, q);
    setMenu(false);
    charts.length = 0;
    const main = $('#wpbody');
    main.innerHTML = view ? view(q, parts[1]) : `<div class="wrap-h"><h1>No encontrado</h1></div><p><a href="#/">Volver al escritorio</a></p>`;
    if (view && view.after) view.after(q, parts[1]);
    document.title = `${TITLES[key] || 'No encontrado'} · Panel Reycar`;
    if (route.last !== path) { scrollTo(0, 0); main.focus({ preventScroll: true }); }
    route.last = path;
  }
  addEventListener('hashchange', route);

  /* ───────── interacción ───────── */
  function setMenu(on) { $('#side').classList.toggle('open', on); $('#scrim').hidden = !on; $('#menuToggle').setAttribute('aria-expanded', String(on)); }
  $('#menuToggle').addEventListener('click', () => setMenu(!$('#side').classList.contains('open')));
  $('#scrim').addEventListener('click', () => setMenu(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  // modo claro / oscuro: misma preferencia que la tienda (reycars-theme)
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  const mode = () => document.documentElement.dataset.theme || (darkMQ.matches ? 'dark' : 'light');
  const syncTheme = () => { $('#themeBtn').setAttribute('aria-label', mode() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'); };
  $('#themeBtn').addEventListener('click', () => { const next = mode() === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; try { localStorage.setItem('reycars-theme', next); } catch (e) { /* modo privado */ } syncTheme(); });
  if (darkMQ.addEventListener) darkMQ.addEventListener('change', syncTheme);
  syncTheme();
  const dn = new Date(NOW), hr = dn.getHours();
  $('#hello').textContent = `${hr < 12 ? 'Buenos días' : hr < 20 ? 'Buenas tardes' : 'Buenas noches'}, Guillermo`;
  $('#today').textContent = `${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dn.getDay()]} ${dn.getDate()} de ${MESL[dn.getMonth()]}`;
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form]'); if (!f) return;
    e.preventDefault();
    const cur = new URLSearchParams((location.hash.split('?')[1]) || '');
    const fd = new FormData(f); const set = { pag: '' };
    for (const [k, v] of fd) if (k !== 'bulk') set[k] = String(v).trim();
    location.hash = href(`#/${f.dataset.form}`, cur, set).slice(1);
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-all]')) $$('tbody input[type=checkbox]', e.target.closest('table')).forEach((c) => (c.checked = e.target.checked));
  });
  document.addEventListener('click', (e) => {
    const qb = e.target.closest('[data-q]');
    if (qb) { const [k, v] = qb.dataset.q.split('='); const cur = new URLSearchParams((location.hash.split('?')[1]) || ''); location.hash = href(location.hash.split('?')[0] || '#/', cur, { [k]: v }).slice(1); return; }
    const tab = e.target.closest('.pdata [data-tab]');
    if (tab) { const w = tab.closest('.pdata'); $$('[data-tab]', w).forEach((b) => b.setAttribute('aria-selected', String(b === tab))); $$('[data-panel]', w).forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab)); return; }
    const a = e.target.closest('[data-act]');
    if (a) {
      e.preventDefault();
      const act = a.dataset.act, id = +a.dataset.id;
      if (act === 'star') { featured.has(id) ? featured.delete(id) : featured.add(id); a.classList.toggle('on'); a.setAttribute('aria-pressed', String(featured.has(id))); return toast(featured.has(id) ? 'Producto destacado en la portada.' : 'Ya no está destacado.'); }
      if (act === 'bulk') {
        const to = $('[name=bulk]').value, ids = $$('tbody input[type=checkbox]:checked').map((c) => +c.value);
        if (!to || !ids.length) return toast('Elige una acción y marca al menos un pedido.');
        ids.forEach((i) => setStatus(oId.get(i), to)); route(); return toast(`${plural(ids.length, 'pedido actualizado', 'pedidos actualizados')}. ${NOSAVE}`);
      }
      if (act === 'guardar-pedido') { const o = oId.get(id), to = $('#ost').value, ac = $('#oact').value; const ch = to !== o.st; if (ch) setStatus(o, to); if (ac) o.notes.push({ t: Date.now(), txt: `Acción realizada: ${ac}.`, kind: 'system', by: 'Guillermo' }); route(); return toast(ch || ac ? `Pedido actualizado. ${NOSAVE}` : 'No hay cambios que guardar.'); }
      if (act === 'nota') { const o = oId.get(id), txt = $('#nn').value.trim(); if (!txt) return toast('Escribe la nota primero.'); const n = { t: Date.now(), txt, kind: $('#nk').value, by: 'Guillermo' }; o.notes.push(n); $('#notes').insertAdjacentHTML('afterbegin', noteHtml(n)); $('#nn').value = ''; return toast(n.kind === 'customer' ? 'Nota añadida. En la versión real le llega al cliente por correo.' : 'Nota privada añadida.'); }
      if (act === 'guardar-producto') { const v = $('#pv').value === '1'; v ? hidden.delete(id) : hidden.add(id); $('#pf').checked ? featured.add(id) : featured.delete(id); seo.set(id, { t: $('#seoT').value, d: $('#seoD').value }); route(); return toast(`Producto actualizado. ${NOSAVE}`); }
      const MSG = { 'nuevo-pedido': 'Los pedidos llegan solos desde la tienda. En la versión real también se podrán crear a mano (ventas por WhatsApp).', reembolso: 'En la versión real: devuelve el dinero en Klap y emite la nota de crédito en Bsale.', pdf: 'Al conectar Bsale, abre el PDF del documento.', papelera: 'En la maqueta no se borra nada.', unir: 'Elegirás otro producto de Bsale para mostrarlo como formato de este.', foto: 'Aquí se suben fotos (se optimizan solas para la web).', 'nueva-redir': 'Aquí se agrega una redirección: dirección antigua → nueva.', 'nuevo-usuario': 'Aquí se invita a una persona por correo, con su perfil.', guardar: `Guardado. ${NOSAVE}` };
      return toast(MSG[act] || NOSAVE);
    }
    const row = e.target.closest('tr[data-go]');
    if (row && !e.target.closest('a, input, button, label, select')) location.hash = row.dataset.go.slice(1);
  });
  function setStatus(o, to) {
    if (!o || o.st === to) return;
    o.notes.push({ t: Date.now(), txt: `El estado del pedido cambió de ${ST[o.st]} a ${ST[to]}.`, kind: 'system', by: 'Guillermo' });
    o.st = to;
  }

  route();
})();
