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
    const n = (dt, txt, kind = 'system', by = 'Reycar Store') => o.notes.push({ t: Math.min(o.t + dt, NOW - MIN), txt, kind, by });
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

  /* ───────── más datos de demostración: carritos, cupones, campañas, actividad, portada ───────── */
  ORDERS.forEach((o) => { if (o.st === 'processing') o.prep = NOW - o.t > 18 * HOUR; });
  const isPick = (o) => /Retiro/.test(o.ship.m);

  const CARTS = [];
  for (let i = 0; i < 46; i++) {
    const t = NOW - rnd() * 14 * DAY, known = rnd() < 0.62, c = known ? CUST[Math.floor(rnd() * CUST.length)] : null;
    const lines = [];
    for (let k = 0, nl = pick([1, 1, 2, 2, 3]); k < nl; k++) { let p = wpick(SELL).p; if (p.vs) p = pick(p.vs); if (!lines.some((l) => l.p === p)) lines.push({ p, q: rnd() < 0.85 ? 1 : 2 }); }
    const r = rnd();
    CARTS.push({ id: 900 + i, t, c, lines, total: lines.reduce((s, l) => s + l.q * l.p.p, 0), src: wpick(ORIG),
      stage: !known ? 'Agregó al carro' : rnd() < 0.55 ? 'Llegó al pago' : 'Ingresó sus datos',
      st: !known ? 'anon' : NOW - t > 2 * DAY ? (r < 0.27 ? 'rec' : r < 0.62 ? 'sent' : 'pend') : (r < 0.25 ? 'sent' : 'pend') });
  }
  CARTS.sort((a, b) => b.t - a.t);
  const CART_ST = { pend: ['Por recuperar', 'processing'], sent: ['Recordatorio enviado', 'pending'], rec: ['Recuperado', 'completed'], anon: ['Sin datos de contacto', 'cancelled'] };

  const yr = new Date(NOW).getFullYear();
  const COUPONS = [
    { code: 'CYBER30', type: 'pct', val: 30, min: 0, uses: 41, limit: 0, from: NOW - 18 * DAY, to: NOW - 14 * DAY, scope: 'Toda la tienda' },
    { code: 'MOTORCLEAN10', type: 'pct', val: 10, min: 0, uses: 23, limit: 200, from: NOW - 25 * DAY, to: NOW + 20 * DAY, scope: 'Solo productos Motor Clean' },
    { code: 'BIENVENIDA5', type: 'pct', val: 5, min: 0, uses: 58, limit: 0, from: NOW - 160 * DAY, to: 0, scope: 'Solo primera compra' },
    { code: 'ENVIOGRATIS', type: 'ship', val: 0, min: 50000, uses: 37, limit: 0, from: NOW - 60 * DAY, to: NOW + 40 * DAY, scope: 'Toda la tienda' },
    { code: 'TALLER5000', type: 'fix', val: 5000, min: 30000, uses: 12, limit: 100, from: NOW - 90 * DAY, to: 0, scope: 'Clientes del taller' },
    { code: 'NAVIDAD15', type: 'pct', val: 15, min: 0, uses: 0, limit: 300, from: new Date(yr, 11, 1).getTime(), to: new Date(yr, 11, 25, 23, 59).getTime(), scope: 'Toda la tienda' },
  ];
  const cpState = (c, now = Date.now()) => (c.to && c.to < now ? ['Vencido', 'cancelled'] : c.from > now ? ['Programado', 'pending'] : c.limit && c.uses >= c.limit ? ['Agotado', 'failed'] : ['Activo', 'completed']);
  const cpVal = (c) => (c.type === 'pct' ? `${c.val} %` : c.type === 'fix' ? clp(c.val) : 'Envío gratis');

  // retorno y costo por clic de cada campaña (de ejemplo; en la versión real vienen de Meta Ads y Google Ads)
  const CAMP = new Map();
  ORIG.filter((o) => o.cls === 'ads').forEach((o) => [...o.camps, ...(o.k === 'meta' ? ['CyberMonday · Hasta 30 %'] : [])].forEach((c) => CAMP.set(c, { roas: 2.1 + rnd() * 5.2, cpc: 140 + rnd() * 280 })));

  const LOG = [];
  const log = (what, detail, who = 'Guillermo') => LOG.unshift({ t: Date.now(), who, what, detail });
  ORDERS.filter((o) => NOW - o.t < 30 * DAY).forEach((o) => o.notes.filter((n) => n.by === 'Guillermo' && n.t <= NOW).forEach((n) => LOG.push({ t: n.t, who: 'Guillermo', what: `Pedido #${o.id}`, detail: n.txt })));
  for (let d = 0; d < 30; d++) {
    LOG.push({ t: NOW - d * DAY - (2 + rnd() * 6) * HOUR, who: 'Guillermo', what: 'Inicio de sesión', detail: 'Correo, contraseña y código de verificación' });
    if (d % 2 === 0) LOG.push({ t: NOW - d * DAY - rnd() * 8 * HOUR, who: 'Ventas y despacho', what: 'Inicio de sesión', detail: 'Correo, contraseña y código de verificación' });
  }
  LOG.push({ t: NOW - 3 * DAY, who: 'Guillermo', what: 'Portada', detail: 'Destacó 6 productos Motor Clean en la portada' },
    { t: NOW - 15 * DAY - 3 * HOUR, who: 'Guillermo', what: 'Cupón', detail: 'Creó el cupón CYBER30 (30 %)' },
    { t: NOW - 6 * DAY, who: 'Ventas y despacho', what: 'Despacho', detail: 'Generó 5 etiquetas en Sendu' },
    { t: NOW - 9 * DAY, who: 'Equipo de desarrollo', what: 'Ajustes', detail: 'Actualizó el ID de Google Analytics 4' });
  LOG.sort((a, b) => b.t - a.t);

  const firstPulido = HEADS.find((p) => p.g === 'pulido' && p.im && p.im.length);
  const HOME = {
    bar: { on: true, txt: 'Envíos a todo Chile · Retiro gratis en Quinta Normal' },
    banners: [
      { t: 'Línea completa Motor Clean', s: 'Formatos de 1 L y 5 L para tu lavado', link: '/motor-clean', img: '/assets/brands/motor-clean.png', on: true },
      { t: 'Pulido profesional', s: 'Máquinas, pads y compuestos', link: '/tienda?g=pulido', img: firstPulido ? img(firstPulido) : '/assets/reycars-crest.webp', on: true },
      { t: 'Servicios de taller', s: 'Agenda tu lavado o cerámico', link: '/asesoria', img: '/assets/reycars-crest.webp', on: false },
    ],
    secs: [['Banners principales', true], ['Categorías', true], ['Productos destacados', true], ['Espacio Motor Clean', true], ['Marcas', true], ['Servicios de taller', true], ['Contacto y ubicación', true]],
    mc: 'auto',
  };

  /* ───────── menú ───────── */
  const IC = {
    dash: 'M10 3a8 8 0 0 0-7 12h14a8 8 0 0 0-7-12zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM5 9a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm10 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-1.6-3.2 1 .8-3.6 4.6a1.5 1.5 0 1 1-1-.8z',
    orders: 'M4 2h12v16l-2-1.5-2 1.5-2-1.5L8 18l-2-1.5L4 18zm3 4v1.5h6V6zm0 3.5V11h6V9.5zm0 3.5v1.5h4V13z',
    prod: 'M10 1 2 5v10l8 4 8-4V5zm0 2.2L15.6 6 10 8.8 4.4 6zM4 7.6l5 2.5v6.6l-5-2.5zm12 0v6.6l-5 2.5v-6.6z',
    cust: 'M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1 17c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5zm13.5 0c0-1.9-.7-3.6-1.9-4.9.5-.2 1-.3 1.4-.3 2.8 0 5 2.3 5 5.2z',
    stats: 'M2 17h16v1.5H2zM3 10h3v6H3zm5-5h3v11H8zm5 3h3v8h-3z',
    seo: 'M8.5 2a6.5 6.5 0 0 1 5.2 10.4l4.4 4.4-1.3 1.3-4.4-4.4A6.5 6.5 0 1 1 8.5 2zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z',
    users: 'M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5z',
    mkt: 'M16 3v14l-5.5-3.2H7.2L6.4 18H4.2l.9-4.4A3.2 3.2 0 0 1 2 10.5v-1A3.5 3.5 0 0 1 5.5 6h5zm1.5 4a3 3 0 0 1 0 6z',
    home: 'M10 2 1.5 9.2H4V18h4.6v-5.2h2.8V18H16V9.2h2.5z',
    set: 'M3 5h8.2a2.5 2.5 0 0 1 4.6 0H17v1.5h-1.2a2.5 2.5 0 0 1-4.6 0H3zm0 8.5h1.2a2.5 2.5 0 0 1 4.6 0H17V15H8.8a2.5 2.5 0 0 1-4.6 0H3z',
  };
  const ico = (k) => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${IC[k]}" fill="currentColor"/></svg>`;
  const MENU = [
    { k: 'dash', href: '#/', t: 'Escritorio', match: ['', 'escritorio'] },
    { k: 'orders', href: '#/pedidos', t: 'Pedidos', match: ['pedidos', 'pedido', 'despachos'], badge: () => ORDERS.filter((o) => o.st === 'processing').length, subs: [['#/pedidos', 'Todos los pedidos'], ['#/despachos', 'Despachos']] },
    { k: 'prod', href: '#/productos', t: 'Productos', match: ['productos', 'producto', 'inventario'], subs: [['#/productos', 'Todos los productos'], ['#/inventario', 'Inventario y reposición']] },
    { k: 'cust', href: '#/clientes', t: 'Clientes', match: ['clientes'] },
    { k: 'mkt', href: '#/marketing', t: 'Marketing', match: ['marketing'], def: 'anuncios', subs: [['#/marketing?tab=anuncios', 'Anuncios'], ['#/marketing?tab=cupones', 'Cupones'], ['#/marketing?tab=carritos', 'Carritos abandonados'], ['#/marketing?tab=catalogos', 'Catálogos'], ['#/marketing?tab=pixel', 'Píxel y eventos']] },
    { k: 'home', href: '#/portada', t: 'Portada', match: ['portada'] },
    { k: 'stats', href: '#/analitica', t: 'Analítica', match: ['analitica'] },
    { k: 'seo', href: '#/seo', t: 'SEO', match: ['seo'] },
    { k: 'users', href: '#/usuarios', t: 'Usuarios', match: ['usuarios', 'actividad'], subs: [['#/usuarios', 'Usuarios'], ['#/actividad', 'Registro de actividad']] },
    { k: 'set', href: '#/ajustes', t: 'Ajustes', match: ['ajustes'], def: 'general', subs: [['#/ajustes?tab=general', 'General'], ['#/ajustes?tab=pagos', 'Pagos (Klap)'], ['#/ajustes?tab=envios', 'Envíos (Sendu)'], ['#/ajustes?tab=bsale', 'Bsale'], ['#/ajustes?tab=seguimiento', 'Seguimiento y anuncios'], ['#/ajustes?tab=correos', 'Correos al cliente'], ['#/ajustes?tab=privacidad', 'Privacidad y datos']] },
  ];
  const ALIAS = { pedido: 'pedidos', producto: 'productos' };
  const subKey = (h) => { const [path, qs] = h.replace(/^#\//, '').split('?'); return `${path.split('/')[0]}|${new URLSearchParams(qs || '').get('tab') || ''}`; };
  function drawMenu(sec, q) {
    $('#adminmenu').innerHTML = MENU.map((m) => {
      const on = m.match.includes(sec), b = m.badge && m.badge();
      let h = `<a href="${m.href}" class="${on ? 'current' : ''}"${on ? ' aria-current="page"' : ''}>${ico(m.k)}<span>${m.t}</span>${b ? `<span class="count" aria-label="${b} por procesar">${b}</span>` : ''}</a>`;
      const cur = `${ALIAS[sec] || sec}|${m.def ? q.get('tab') || m.def : ''}`;
      if (on && m.subs) h += `<div class="sub">${m.subs.map(([u, t]) => `<a href="${u}" class="${subKey(u) === cur ? 'on' : ''}">${t}</a>`).join('')}</div>`;
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
  function bars(rows, total, o = {}) {
    const max = Math.max(1e-9, ...rows.map((r) => r.v));
    const tipOf = o.tip || ((r) => `<b>${esc(r.l)}</b><br>${clp(r.v)} · ${plural(r.n, 'pedido', 'pedidos')}<br>Ticket promedio ${clp(r.n ? r.v / r.n : 0)}`);
    const valOf = o.fmt || ((r) => `${clpK(r.v)}<small>${total ? Math.round((r.v / total) * 100) : 0} %</small>`);
    return `<ul class="bars">${rows.map((r) => `<li data-tip="${esc(tipOf(r))}"><span class="bl" title="${esc(r.l)}">${esc(r.l)}</span><span class="bt"><span class="bf" style="display:block;width:${((r.v / max) * 100).toFixed(1)}%"></span></span><span class="bv">${valOf(r)}</span></li>`).join('')}</ul>`;
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
          ${box('Para hoy', `<ul class="tasks">${[
            [ORDERS.filter((o) => o.st === 'processing' && !o.prep).length, 'pedidos por preparar', '#/despachos'],
            [ORDERS.filter((o) => o.st === 'processing' && o.prep).length, 'listos para enviar o retirar', '#/despachos'],
            [CARTS.filter((c) => c.st === 'pend').length, 'carritos abandonados por recuperar', '#/marketing?tab=carritos'],
            [invRows().filter((x) => x.st === 'now').length, 'productos para reponer ya', '#/inventario'],
          ].map(([n, t, h]) => `<li><a href="${h}"><b>${n}</b><span>${t}</span><span aria-hidden="true" class="tasks__go">→</span></a></li>`).join('')}</ul>`, '', true)}
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
    V.pedidos.last = list;
    const rows = list.slice((page - 1) * per, page * per);
    const base = '#/pedidos';
    const tabs = [['', 'Todos', Object.values(counts).reduce((a, b) => a + b, 0)], ...['pending', 'processing', 'completed', 'cancelled', 'refunded', 'failed'].map((k) => [k, ST[k], counts[k] || 0])].filter(([k, , n]) => !k || n);
    const c = cid && CUST.find((x) => x.id === cid);
    return `
      <div class="wrap-h"><h1>Pedidos</h1><button class="page-title-action" data-act="nuevo-pedido">Añadir pedido</button><button class="button" data-act="csv-pedidos">Exportar a Excel (${miles(list.length)})</button></div>
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
      <div class="wrap-h no-print"><h1>Editar pedido</h1><button class="button" data-act="imprimir">Imprimir pedido</button><a class="button" href="https://wa.me/${c.phone.replace(/\D/g, '')}" target="_blank" rel="noopener" data-act="wa-cliente">WhatsApp al cliente</a></div>
      <div class="print-only print-head"><img src="/assets/logo.png" alt="" width="40" height="41"><div><b>Reycar Store · Pedido #${o.id}</b><br>${fFull(o.t)} · ${esc(o.ship.m)}</div></div>
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
    V.clientes.last = list;
    const rows = list.slice((page - 1) * per, page * per);
    const rep = [...m.values()].filter((x) => x.n > 1).length;
    return `
      <div class="wrap-h"><h1>Clientes</h1><button class="button" data-act="csv-clientes">Exportar a Excel</button></div>
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
    const tabs = [['general', 'General'], ['pagos', 'Pagos (Klap)'], ['envios', 'Envíos (Sendu)'], ['bsale', 'Bsale'], ['seguimiento', 'Seguimiento y anuncios'], ['correos', 'Correos al cliente'], ['privacidad', 'Privacidad y datos']];
    const row = (l, inner, d = '') => `<tr><th>${l}</th><td>${inner}${d ? `<p class="description">${d}</p>` : ''}</td></tr>`;
    const secret = (id, ph) => `<input type="password" id="${id}" placeholder="${ph}" autocomplete="off">`;
    const B = {
      general: row('Nombre de la tienda', '<input type="text" value="Reycar Store">') + row('Dirección', '<input type="text" value="Quinta Normal, Región Metropolitana">', 'Aparece en el pie de página y en la opción de retiro en tienda.') + row('WhatsApp de atención', '<input type="text" value="+56 9 6355 5437">') + row('Correo de avisos de pedidos', '<input type="text" placeholder="ventas@…">', 'Recibe un aviso por cada pedido pagado.'),
      pagos: row('Estado', '<span class="st-wait">Faltan credenciales de Klap</span>', 'Klap entrega primero las credenciales de prueba; con ellas se prueba el pago completo antes de cobrar de verdad.') + row('Modo', '<select><option>Pruebas (sandbox)</option><option>Producción</option></select>') + row('<label for="kk">Clave de la API (apikey)</label>', secret('kk', 'Se guarda cifrada en el servidor'), 'Nunca se muestra después de guardarla ni se envía al navegador.') + row('Medios de pago', '<label class="switch"><input type="checkbox" checked> Tarjetas de crédito y débito</label><br><label class="switch"><input type="checkbox" checked> Google Pay</label><br><label class="switch"><input type="checkbox" checked> Apple Pay</label>') + row('Pedido sin pagar', '<select><option>Cancelar a los 60 minutos</option><option>Cancelar a las 24 horas</option></select>', 'Mientras tanto el producto no se descuenta del stock.'),
      envios: row('Estado', '<span class="st-wait">Por configurar</span>') + row('<label for="sk">Token de Sendu</label>', secret('sk', 'Se guarda cifrado en el servidor')) + row('Couriers', '<label class="switch"><input type="checkbox" checked> Starken</label><br><label class="switch"><input type="checkbox" checked> Chilexpress</label><br><label class="switch"><input type="checkbox" checked> Blue Express</label>') + row('Retiro en tienda', '<label class="switch"><input type="checkbox" checked> Ofrecer retiro gratis en Quinta Normal</label>') + row('Envío gratis', '<input type="text" placeholder="Monto mínimo, ej. 60.000">', 'Vacío = sin envío gratis.'),
      bsale: row('Estado', '<span class="st-wait">Falta el token de acceso</span>', 'Lo solicita el administrador de la cuenta de Bsale. Es un token nuevo, distinto del que usa hoy WordPress.') + row('<label for="bk">Token de acceso</label>', secret('bk', 'Se guarda cifrado en el servidor')) + row('Sucursal', '<select disabled><option>Casa Matriz (se carga al conectar)</option></select>', 'El stock web sale de esta sucursal.') + row('Lista de precios', '<select disabled><option>Lista web (se carga al conectar)</option></select>') + row('Documento al pagar', '<label class="switch"><input type="checkbox" checked> Emitir boleta o factura automáticamente cuando Klap aprueba el pago</label>', 'También descuenta el stock y envía el PDF al cliente.') + row('Avisos de Bsale', '<label class="switch"><input type="checkbox" checked> Actualizar precio y stock al instante cuando cambian en Bsale</label>'),
      seguimiento: row('<label for="ga">Google Analytics 4</label>', '<input type="text" id="ga" placeholder="G-XXXXXXXXXX">') + row('<label for="gtm">Google Tag Manager</label>', '<input type="text" id="gtm" placeholder="GTM-XXXXXXX">', 'El contenedor actual sigue funcionando: la tienda envía los mismos eventos que hoy (vista de producto, agregar al carro, compra).') + row('<label for="px">Píxel de Meta</label>', '<input type="text" id="px" placeholder="ID del píxel">') + row('<label for="capi">API de conversiones de Meta</label>', secret('capi', 'Token de acceso'), 'Envía las compras también desde el servidor, para que Meta no pierda ventas por bloqueadores o iPhone.') + row('Catálogos de productos', '<a href="#/seo">Meta: /feeds/meta.xml</a><br><a href="#/seo">Google Merchant: /feeds/google.xml</a>', 'Con los mismos ID de producto que hoy, para no reiniciar campañas ni públicos.') + row('Aviso de cookies', '<select><option>Pedir consentimiento (Consent Mode v2)</option><option>Solo informar</option></select>'),
      correos: [['Pedido recibido', 'Apenas Klap aprueba el pago, con el detalle y la boleta adjunta.'], ['Listo para retiro', 'Cuando se marca "preparado" en Despachos y el cliente eligió retiro.'], ['Pedido enviado', 'Con el courier y el número de seguimiento de Sendu.'], ['Carrito abandonado', 'Una hora después, con el carro listo para pagar.'], ['Pedido cancelado o reembolsado', 'Con la nota de crédito si corresponde.']].map(([t, d]) => row(t, `<label class="switch"><input type="checkbox" checked> Enviar</label> <button class="button" data-act="ver-correo">Vista previa</button>`, d)).join('') + row('Remitente', '<input type="text" value="Reycar Store" aria-label="Nombre del remitente">', 'Los correos llevan el logo y los colores de la tienda.'),
      privacidad: row('Ley 21.719', '<span class="st st-wait">Vigente desde el 1 de diciembre de 2026</span>', 'Los clientes pueden pedir ver, corregir o borrar sus datos. Desde aquí se atiende cada solicitud y queda registrada.') + row('Solicitudes de clientes', '<button class="button" data-act="solicitud">Exportar los datos de un cliente</button> <button class="button" data-act="solicitud">Borrar los datos de un cliente</button>', 'Los pedidos y boletas se conservan por obligación tributaria; se borran los datos de contacto y marketing.') + row('Conservación', '<select><option>Borrar carritos abandonados a los 90 días</option><option>A los 30 días</option></select>') + row('Exportaciones', '<label class="switch"><input type="checkbox" checked> Solo administradores pueden exportar clientes y pedidos</label>', 'Cada exportación queda en el registro de actividad.') + row('Aviso de privacidad', '<a href="#/ajustes?tab=privacidad" data-act="guardar">Editar el texto de la política de privacidad</a>'),
    };
    return `<div class="wrap-h"><h1>Ajustes</h1></div><nav class="nav-tab-wrapper">${tabs.map(([k, l]) => `<a class="nav-tab${k === tab ? ' nav-tab-active' : ''}" href="#/ajustes?tab=${k}">${l}</a>`).join('')}</nav><table class="form-table"><tbody>${B[tab] || B.general}</tbody></table><p><button class="button button-primary" data-act="guardar">Guardar cambios</button></p>`;
  };

  /* ───────── despachos: del pago a la entrega ───────── */
  V.despachos = () => {
    const proc = ORDERS.filter((o) => o.st === 'processing');
    const lanes = [
      ['Por preparar', proc.filter((o) => !o.prep), 'Arma la caja y márcalo como preparado.'],
      ['Listos para retiro', proc.filter((o) => o.prep && isPick(o)), 'Avisa al cliente que puede pasar a buscarlo.'],
      ['Listos para enviar', proc.filter((o) => o.prep && !isPick(o)), 'Genera la etiqueta en Sendu y entrégalo al courier.'],
      ['En camino', ORDERS.filter((o) => o.st === 'completed' && o.ship.track && NOW - o.t < 5 * DAY), 'El cliente recibió el número de seguimiento.'],
    ];
    const pl = new Map();
    lanes[0][1].forEach((o) => o.lines.forEach((l) => { const x = pl.get(l.p) || { p: l.p, q: 0, o: [] }; x.q += l.q; x.o.push(o.id); pl.set(l.p, x); }));
    const pickList = [...pl.values()].sort((a, b) => b.q - a.q);
    const btn = (lane, o) => [
      `<button class="button button-primary" data-act="prep" data-id="${o.id}">Marcar preparado</button>`,
      `<button class="button" data-act="avisar" data-id="${o.id}">Avisar por WhatsApp</button><button class="button button-primary" data-act="retirado" data-id="${o.id}">Retirado</button>`,
      `<button class="button button-primary" data-act="etiqueta" data-id="${o.id}">Generar etiqueta</button>`,
      `<button class="button" data-act="seguimiento" data-id="${o.id}">Ver seguimiento</button>`][lane];
    const card = (o, lane) => `<article class="dcard">
        <div class="dcard__h"><a href="#/pedido/${o.id}"><b>#${o.id}</b> ${esc(custName(o.c))}</a><span class="muted small">${ago(o.t)}</span></div>
        <div class="muted small">${esc(o.c.comuna)} · ${plural(qty(o), 'producto', 'productos')} · ${clp(o.total)}</div>
        <div class="small dcard__ship">${esc(o.ship.m)}${o.ship.track ? ` · ${esc(o.ship.carrier)} ${o.ship.track}` : ''}</div>
        ${o.cnote ? `<div class="dcard__note"><b>Nota del cliente:</b> ${esc(o.cnote)}</div>` : ''}
        <div class="dcard__a">${btn(lane, o)}</div></article>`;
    return `
      <div class="wrap-h"><h1>Despachos</h1><button class="button no-print" data-act="imprimir">Imprimir lista de preparación</button></div>
      <p class="muted no-print" style="margin:-8px 0 18px">Solo pedidos pagados, desde que entran hasta que salen. Cada paso queda anotado en el pedido.</p>
      <div class="board no-print">${lanes.map(([t, l, d], i) => `<section class="lane" aria-label="${t}"><h2>${t} <span class="lane__n">${l.length}</span></h2><p class="muted small lane__d">${d}</p>${l.map((o) => card(o, i)).join('') || '<p class="lane__empty">Nada pendiente.</p>'}</section>`).join('')}</div>
      <div class="print-only print-head"><img src="/assets/logo.png" alt="" width="40" height="41"><div><b>Reycar Store · Lista de preparación</b><br>${fFull(Date.now())}</div></div>
      ${box(`Lista de preparación · ${plural(pickList.length, 'producto', 'productos')}`, pickList.length ? `<table class="mini"><thead><tr><td><b>Producto</b></td><td class="hide-m"><b>SKU</b></td><td class="num"><b>Cant.</b></td><td class="hide-m"><b>Pedidos</b></td><td class="num"><b>Listo</b></td></tr></thead><tbody>${pickList.map((x) => `<tr><td>${esc(x.p.n)}</td><td class="hide-m">${esc(x.p.sku || '—')}</td><td class="num"><b>${x.q}</b></td><td class="hide-m">${x.o.map((i) => '#' + i).join(', ')}</td><td class="num"><input type="checkbox" aria-label="Listo: ${esc(x.p.n)}"></td></tr>`).join('')}</tbody></table>` : '<p class="muted" style="padding:16px 18px;margin:0">No hay pedidos por preparar.</p>', 'lo que hay que sacar de bodega', true)}`;
  };

  /* ───────── inventario: cuánto alcanza el stock ───────── */
  function invRows() {
    const sold = new Map();
    agg(30).list.forEach((o) => o.lines.forEach((l) => sold.set(l.p, (sold.get(l.p) || 0) + l.q)));
    return ALL.filter((p) => p.p > 0 && !['cursos', 'servicios'].includes(p.g)).map((p) => {
      const u = sold.get(p) || 0, per = u / 30, days = p.stk == null || !per ? Infinity : p.stk / per;
      const st = p.stk === 0 ? 'out' : days <= 14 ? 'now' : days <= 30 ? 'soon' : !u && p.stk > 5 ? 'idle' : 'ok';
      return { p, u, days, st, sug: per ? Math.max(0, Math.ceil(per * 45 - (p.stk || 0))) : 0 };
    });
  }
  const INV_ST = { out: ['Agotado', 'failed'], now: ['Reponer ya', 'failed'], soon: ['Reponer pronto', 'processing'], ok: ['Con stock', 'completed'], idle: ['Sin ventas en 30 días', 'cancelled'] };
  V.inventario = (q) => {
    const f = q.get('f') || 'reponer', page = Math.max(1, +q.get('pag') || 1), per = 25, base = '#/inventario';
    const all = invRows(), cnt = (k) => all.filter((x) => x.st === k).length;
    let list = f === 'reponer' ? all.filter((x) => ['out', 'now', 'soon'].includes(x.st)) : f === 'idle' ? all.filter((x) => x.st === 'idle') : all;
    list.sort((a, b) => a.days - b.days || b.u - a.u || (a.p.stk ?? 99) - (b.p.stk ?? 99));
    V.inventario.last = list;
    const rows = list.slice((page - 1) * per, page * per);
    return `
      <div class="wrap-h"><h1>Inventario y reposición</h1><button class="button" data-act="csv-inventario">Exportar para el proveedor</button></div>
      <div class="notice"><p>El stock es el real de Bsale. Con las ventas de los últimos 30 días se calcula para cuántos días alcanza y cuánto pedir para cubrir 45 días. <span class="muted">(Las ventas de esta maqueta son de ejemplo.)</span></p></div>
      <div class="tiles">${tile('Reponer ya', miles(cnt('now')), 'alcanza para 14 días o menos')}${tile('Reponer pronto', miles(cnt('soon')), 'alcanza para 15 a 30 días')}${tile('Agotados', miles(cnt('out')), 'sin stock en Bsale')}${tile('Sin ventas en 30 días', miles(cnt('idle')), 'stock detenido')}</div>
      <ul class="subsubsub">${[['reponer', 'Por reponer', cnt('out') + cnt('now') + cnt('soon')], ['idle', 'Sin ventas', cnt('idle')], ['todos', 'Todos', all.length]].map(([k, l, n]) => `<li><a href="${href(base, q, { f: k, pag: '' })}" class="${f === k ? 'current' : ''}">${l} <span class="n">(${miles(n)})</span></a></li>`).join('')}</ul>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>
      <table class="wp-list-table"><thead><tr><th style="width:60px"><span class="screen-reader-text">Foto</span></th><th>Producto</th><th class="hide-m">SKU</th><th class="num">Stock</th><th class="num hide-m">Vendidos 30 días</th><th class="num">Alcanza para</th><th class="hide-m">Estado</th><th class="num hide-m">Sugerido pedir</th></tr></thead>
      <tbody>${rows.length ? rows.map((x) => `<tr><td><img class="thumb" src="${img(x.p)}" alt="" loading="lazy"></td><td><a class="row-title" href="#/producto/${x.p.fam || x.p.id}">${esc(x.p.n)}</a><div class="muted small">${esc(x.p.b || '')}</div></td><td class="hide-m">${esc(x.p.sku || '—')}</td><td class="num">${x.p.stk == null ? '—' : x.p.stk}</td><td class="num hide-m">${x.u}</td><td class="num nw">${x.days === Infinity ? '<span class="muted">—</span>' : plural(Math.max(0, Math.round(x.days)), 'día', 'días')}</td><td class="hide-m">${pillOf(INV_ST[x.st])}</td><td class="num hide-m">${x.sug ? `<b>${x.sug}</b>` : '—'}</td></tr>`).join('') : '<tr class="no-items"><td colspan="8">Nada por reponer.</td></tr>'}</tbody></table>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>`;
  };
  const pillOf = ([l, cls]) => `<mark class="order-status status-${cls}"><span>${l}</span></mark>`;

  /* ───────── marketing ───────── */
  const FEED_ERR = (p) => { const e = []; if (!p.im || !p.im.length) e.push('Sin foto'); if (!String(p.d || (p.fam && byId.get(p.fam).d) || '').trim()) e.push('Sin descripción'); return e; };
  const FEED_WARN = (p) => { const w = []; if (!p.b) w.push('Sin marca'); if (p.sku && !/^\d{8,14}$/.test(p.sku)) w.push('SKU no es código de barras'); return w; };
  V.marketing = (q) => {
    const tab = q.get('tab') || 'anuncios';
    const tabs = [['anuncios', 'Anuncios'], ['cupones', 'Cupones'], ['carritos', 'Carritos abandonados'], ['catalogos', 'Catálogos'], ['pixel', 'Píxel y eventos']];
    const head = `<div class="wrap-h"><h1>Marketing</h1>${tab === 'anuncios' ? segR(q) : ''}</div><nav class="nav-tab-wrapper">${tabs.map(([k, l]) => `<a class="nav-tab${k === tab ? ' nav-tab-active' : ''}" href="#/marketing?tab=${k}">${l}</a>`).join('')}</nav>`;
    return head + (MK[tab] || MK.anuncios)(q);
  };
  const rangeOf = (q) => ([7, 30, 90].includes(+q.get('r')) ? +q.get('r') : 30);
  const segR = (q) => `<span class="seg" role="group">${[[7, '7 días'], [30, '30 días'], [90, '90 días']].map(([v, l]) => `<button type="button" data-q="r=${v}" aria-pressed="${v === rangeOf(q)}">${l}</button>`).join('')}</span>`;
  const x1 = (n) => `${n.toFixed(1).replace('.', ',')}×`;
  const MK = {};
  MK.anuncios = (q) => {
    const r = rangeOf(q);
    const camps = (x) => groupBy(x.list.filter((o) => o.src.cls === 'ads' && o.camp), (o) => o.camp).map((g) => {
      const k = CAMP.get(g.l) || { roas: 3, cpc: 250 }, spend = g.v / k.roas;
      return { ...g, plat: x.list.find((o) => o.camp === g.l).src.lbl, spend, clicks: Math.round(spend / k.cpc), roas: k.roas };
    });
    const sum = (rs) => rs.reduce((s, x) => ({ spend: s.spend + x.spend, v: s.v + x.v, n: s.n + x.n, clicks: s.clicks + x.clicks }), { spend: 0, v: 0, n: 0, clicks: 0 });
    const a = agg(r), cur = camps(a), T = sum(cur), P = sum(camps(agg(r, r)));
    const plat = (name) => sum(cur.filter((x) => x.plat === name));
    const m = plat('Meta Ads'), g = plat('Google Ads');
    return `
      <div class="tiles">${tile('Inversión en anuncios', clp(T.spend), delta(T.spend, P.spend))}${tile('Ventas desde anuncios', clp(T.v), delta(T.v, P.v))}${tile('Retorno (ROAS)', T.spend ? x1(T.v / T.spend) : '—', T.spend && P.spend ? delta(T.v / T.spend, P.v / P.spend) : '')}${tile('Costo por pedido', clp(T.n ? T.spend / T.n : 0), delta(T.n ? T.spend / T.n : 0, P.n ? P.spend / P.n : 0))}</div>
      <div class="dash">
        ${box('Retorno por campaña', bars(cur.map((x) => ({ ...x, v: x.roas })).sort((a, b) => b.v - a.v), 0, { fmt: (x) => `${x1(x.v)}<small>${esc(x.plat.replace(' Ads', ''))}</small>`, tip: (x) => `<b>${esc(x.l)}</b><br>Inversión ${clp(x.spend)} · Ventas ${clp(x.spend * x.v)}<br>Por cada $1 invertido vuelven ${clp(x.v)}` }), 'ventas ÷ inversión', true)}
        ${box('Por plataforma', `<table class="mini"><thead><tr><td><b>Plataforma</b></td><td class="num"><b>Inversión</b></td><td class="num"><b>Ventas</b></td><td class="num"><b>ROAS</b></td></tr></thead><tbody>${[['Meta Ads', m], ['Google Ads', g]].map(([n, x]) => `<tr><td>${n}</td><td class="num">${clp(x.spend)}</td><td class="num">${clp(x.v)}</td><td class="num"><b>${x.spend ? x1(x.v / x.spend) : '—'}</b></td></tr>`).join('')}</tbody></table><p class="muted small" style="padding:0 18px 4px">Un ROAS de 4× significa que cada $1.000 en anuncios trajo $4.000 en ventas. Se cuentan solo pedidos pagados.</p>`, '', true)}
      </div>
      ${box('Campañas', `<div style="overflow-x:auto"><table class="mini"><thead><tr><td><b>Campaña</b></td><td class="num"><b>Inversión</b></td><td class="num hide-m"><b>Clics</b></td><td class="num"><b>Pedidos</b></td><td class="num"><b>Ventas</b></td><td class="num"><b>ROAS</b></td><td class="num hide-m"><b>Costo por pedido</b></td></tr></thead><tbody>${cur.sort((a, b) => b.v - a.v).map((x) => `<tr><td>${esc(x.l)}<div class="muted small">${x.plat}</div></td><td class="num">${clp(x.spend)}</td><td class="num hide-m">${miles(x.clicks)}</td><td class="num">${x.n}</td><td class="num">${clp(x.v)}</td><td class="num"><b>${x1(x.roas)}</b></td><td class="num hide-m">${clp(x.spend / x.n)}</td></tr>`).join('') || '<tr><td class="muted">Sin ventas desde anuncios en el período.</td></tr>'}</tbody></table></div>`, `${fDate(a.daily[0].d)} – ${fDate(a.daily[a.daily.length - 1].d)}`, true)}
      <div class="notice"><p><b>En la versión real</b> la inversión y los clics llegan solos desde Meta Ads y Google Ads, y las ventas son los pedidos pagados con su campaña (UTM). Así el retorno se ve con las ventas reales, no con las que estima cada plataforma.</p></div>`;
  };
  MK.cupones = () => {
    const act = COUPONS.filter((c) => cpState(c)[0] === 'Activo');
    return `
      <div class="tiles">${tile('Cupones activos', miles(act.length), `de ${COUPONS.length} creados`)}${tile('Usos totales', miles(COUPONS.reduce((s, c) => s + c.uses, 0)), 'pedidos pagados con cupón')}${tile('Ventas con cupón', clp(COUPONS.reduce((s, c) => s + c.uses * 52000, 0)), 'aproximado')}${tile('Más usado', esc(COUPONS.slice().sort((a, b) => b.uses - a.uses)[0].code), 'desde que se creó')}</div>
      <table class="wp-list-table"><thead><tr><th>Código</th><th>Descuento</th><th class="hide-m">Aplica a</th><th class="hide-m">Compra mínima</th><th class="num">Usos</th><th class="hide-m">Vigencia</th><th>Estado</th></tr></thead><tbody>
      ${COUPONS.map((c) => `<tr><td><code>${esc(c.code)}</code></td><td>${cpVal(c)}</td><td class="hide-m">${esc(c.scope)}</td><td class="hide-m">${c.min ? clp(c.min) : '—'}</td><td class="num">${c.uses}${c.limit ? ` / ${c.limit}` : ''}</td><td class="hide-m">${c.to ? `${fDay(c.from)} – ${fDate(c.to)}` : `Desde ${fDate(c.from)}`}</td><td>${pillOf(cpState(c))}</td></tr>`).join('')}
      </tbody></table>
      <div class="postbox" style="margin-top:20px"><h2 class="hndle">Crear cupón</h2><div class="inside"><div class="fgrid">
        <div class="field"><label for="cc">Código</label><input type="text" id="cc" placeholder="EJ: VERANO20" style="text-transform:uppercase" maxlength="20"></div>
        <div class="field"><label for="ct">Tipo de descuento</label><select id="ct"><option value="pct">Porcentaje</option><option value="fix">Monto fijo</option><option value="ship">Envío gratis</option></select></div>
        <div class="field"><label for="cv">Valor</label><input type="number" id="cv" min="0" placeholder="10"></div>
        <div class="field"><label for="cm">Compra mínima ($)</label><input type="number" id="cm" min="0" placeholder="Sin mínimo"></div>
        <div class="field"><label for="cl">Límite de usos</label><input type="number" id="cl" min="0" placeholder="Sin límite"></div>
        <div class="field"><label for="cs2">Aplica a</label><select id="cs2"><option>Toda la tienda</option><option>Solo primera compra</option><option>Solo productos Motor Clean</option><option>Una categoría…</option><option>Clientes del taller</option></select></div>
        <div class="field"><label for="cf">Desde</label><input type="date" id="cf"></div>
        <div class="field"><label for="cto">Hasta</label><input type="date" id="cto"></div>
      </div><p class="muted small" style="margin:0 0 12px">El descuento aparece como línea aparte en la boleta o factura de Bsale.</p><button class="button button-primary" data-act="crear-cupon">Crear cupón</button></div></div>`;
  };
  MK.carritos = (q) => {
    const f = q.get('f') || '', base = '#/marketing';
    const list = CARTS.filter((c) => !f || c.st === f);
    const known = CARTS.filter((c) => c.st !== 'anon'), rec = CARTS.filter((c) => c.st === 'rec');
    return `
      <div class="tiles">${tile('Carritos abandonados', miles(CARTS.length), 'últimos 14 días')}${tile('Valor en carritos', clp(CARTS.reduce((s, c) => s + c.total, 0)), 'lo que quedó sin pagar')}${tile('Se pueden recuperar', miles(known.length), 'dejaron correo o teléfono')}${tile('Recuperados', miles(rec.length), `${known.length ? Math.round((rec.length / known.length) * 100) : 0} % · ${clp(rec.reduce((s, c) => s + c.total, 0))}`)}</div>
      <ul class="subsubsub">${[['', 'Todos', CARTS.length], ...Object.entries(CART_ST).map(([k, [l]]) => [k, l, CARTS.filter((c) => c.st === k).length])].map(([k, l, n]) => `<li><a href="${href(base, q, { f: k })}" class="${f === k ? 'current' : ''}">${l} <span class="n">(${n})</span></a></li>`).join('')}</ul>
      <div class="tablenav"><button class="button" data-act="recordar-todos">Enviar recordatorio a todos los pendientes</button></div>
      <table class="wp-list-table"><thead><tr><th>Cliente</th><th class="hide-m">Productos</th><th class="num">Total</th><th class="hide-m">Etapa</th><th class="hide-m">Origen</th><th>Estado</th></tr></thead><tbody>
      ${list.map((c) => `<tr><td>${c.c ? `<b>${esc(custName(c.c))}</b><div class="muted small">${esc(c.c.email)}</div>` : '<span class="muted">Visitante sin datos</span>'}<div class="muted small">${ago(c.t)}<span class="show-m"> · ${plural(c.lines.length, 'producto', 'productos')}</span></div></td>
        <td class="hide-m"><div class="cart-items">${c.lines.map((l) => `<img class="thumb" src="${img(l.p)}" alt="" loading="lazy" title="${esc(l.p.n)}">`).join('')}</div><div class="muted small">${esc(c.lines[0].p.n.slice(0, 48))}${c.lines.length > 1 ? ` y ${c.lines.length - 1} más` : ''}</div></td>
        <td class="num nw">${clp(c.total)}</td><td class="hide-m">${c.stage}</td><td class="hide-m">${otag(c)}</td><td>${pillOf(CART_ST[c.st])}${c.st === 'pend' ? `<div style="margin-top:6px"><button class="button" data-act="recordar" data-id="${c.id}">Enviar recordatorio</button></div>` : ''}</td></tr>`).join('') || '<tr class="no-items"><td colspan="6">No hay carritos en este estado.</td></tr>'}
      </tbody></table>
      <div class="notice" style="margin-top:20px"><p><b>En la versión real</b> se envía un correo automático 1 hora después, con el carro listo para pagar, y se puede mandar un WhatsApp con un clic. Solo a quienes dejaron sus datos y aceptaron recibir mensajes.</p></div>`;
  };
  MK.catalogos = (q) => {
    const f = q.get('f') || 'errores', page = Math.max(1, +q.get('pag') || 1), per = 20, base = '#/marketing';
    const items = ALL.filter((p) => p.p > 0 && !hidden.has(p.fam || p.id) && !['cursos', 'servicios'].includes(p.g)).map((p) => ({ p, e: FEED_ERR(p), w: FEED_WARN(p) }));
    const err = items.filter((x) => x.e.length), warn = items.filter((x) => !x.e.length && x.w.length), ok = items.length - err.length - warn.length;
    const list = f === 'errores' ? err : f === 'avisos' ? warn : items.filter((x) => x.e.length || x.w.length);
    const rows = list.slice((page - 1) * per, page * per);
    const feed = (n, url, d) => `<li><div><b>${n}</b><div class="muted small">${d} · <code>${url}</code></div></div><span class="st st-ok">Listo para activar</span></li>`;
    return `
      <div class="tiles">${tile('Productos en el catálogo', miles(items.length), 'cada formato cuenta como uno')}${tile('Aprobados', miles(ok), 'sin observaciones')}${tile('Con advertencias', miles(warn.length), 'se publican, pero rinden menos')}${tile('Con errores', miles(err.length), 'Meta y Google los rechazan')}</div>
      ${box('Catálogos para anuncios', `<ul class="integ">${feed('Meta (Facebook e Instagram)', '/feeds/meta.xml', 'Se actualiza cada hora')}${feed('Google Merchant Center', '/feeds/google.xml', 'Se actualiza cada hora')}</ul><p class="muted small" style="padding:0 18px 6px">Usan los mismos ID de producto que hoy, así no se reinician las campañas ni los públicos de remarketing.</p>`, '', true)}
      <ul class="subsubsub">${[['errores', 'Con errores', err.length], ['avisos', 'Con advertencias', warn.length], ['todo', 'Todo lo que revisar', err.length + warn.length]].map(([k, l, n]) => `<li><a href="${href(base, q, { f: k, pag: '' })}" class="${f === k ? 'current' : ''}">${l} <span class="n">(${n})</span></a></li>`).join('')}</ul>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>
      <table class="wp-list-table"><thead><tr><th style="width:60px"><span class="screen-reader-text">Foto</span></th><th>Producto</th><th>Observaciones</th><th class="num"><span class="screen-reader-text">Acción</span></th></tr></thead><tbody>
      ${rows.map((x) => `<tr><td><img class="thumb" src="${img(x.p)}" alt="" loading="lazy"></td><td><b>${esc(x.p.n)}</b><div class="muted small">${esc(x.p.b || 'Sin marca')} · SKU ${esc(x.p.sku || '—')}</div></td><td>${x.e.map((t) => `<span class="tag tag--bad">${t}</span>`).join(' ')} ${x.w.map((t) => `<span class="tag tag--ads">${t}</span>`).join(' ')}</td><td class="num"><a class="button" href="#/producto/${x.p.fam || x.p.id}">Corregir</a></td></tr>`).join('') || '<tr class="no-items"><td colspan="4">Todo en orden.</td></tr>'}
      </tbody></table>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>
      <p class="muted small">Revisión hecha con los productos reales de la tienda.</p>`;
  };
  MK.pixel = () => {
    const n7 = Math.max(1, agg(7).n), visits = Math.round(n7 / 0.013), vc = Math.round(visits * 0.47), atc = Math.round(vc * 0.11), ic = Math.round(atc * 0.5);
    const steps = [['Visitas', visits], ['Vieron un producto', vc], ['Agregaron al carro', atc], ['Iniciaron el pago', ic], ['Compraron', n7]];
    const ev = [['PageView', 'Visita a una página', visits * 2.6], ['ViewContent', 'Vio un producto', vc], ['AddToCart', 'Agregó al carro', atc], ['InitiateCheckout', 'Inició el pago', ic], ['Purchase', 'Compró', n7]];
    return `
      <div class="tiles">${tile('Compras registradas (7 días)', miles(n7), 'coinciden con los pedidos pagados')}${tile('Calidad de coincidencia (Meta)', '7,9 / 10', 'buena: se envía correo y teléfono cifrados')}${tile('Eventos sin duplicar', '97 %', 'píxel y servidor se reconocen')}${tile('Conversión', `${((n7 / visits) * 100).toFixed(1).replace('.', ',')} %`, 'de visitas a compras')}</div>
      <div class="dash">
        ${box('Embudo de compra · 7 días', bars(steps.map(([l, v], i) => ({ l, v, n: v, prev: i ? steps[i - 1][1] : 0 })), 0, { fmt: (x) => `${miles(x.v)}<small>${x.prev ? Math.round((x.v / x.prev) * 100) + ' %' : ''}</small>`, tip: (x) => `<b>${x.l}</b><br>${miles(x.v)} personas${x.prev ? `<br>${Math.round((x.v / x.prev) * 100)} % del paso anterior` : ''}` }), 'personas en cada paso', true)}
        ${box('Eventos recibidos · 7 días', `<table class="mini"><thead><tr><td><b>Evento</b></td><td class="num"><b>Navegador</b></td><td class="num"><b>Servidor</b></td></tr></thead><tbody>${ev.map(([k, d, v]) => `<tr><td><code>${k}</code><div class="muted small">${d}</div></td><td class="num">${miles(Math.round(v * 0.86))}</td><td class="num">${miles(Math.round(v))}</td></tr>`).join('')}</tbody></table><p class="muted small" style="padding:0 18px 6px">El servidor (API de conversiones) recupera las visitas que los bloqueadores y el iPhone le esconden al píxel.</p>`, '', true)}
      </div>
      <div class="notice"><p>Cifras de ejemplo. <b>En la versión real</b> salen del Administrador de eventos de Meta y de Google Analytics 4. Las compras se envían con el mismo ID que hoy (SKU_id) y con el valor real del pedido pagado.</p></div>`;
  };

  /* ───────── portada de la tienda (sin Elementor) ───────── */
  V.portada = () => {
    const feat = [...featured].map((i) => byId.get(i)).filter(Boolean);
    const mv = (k, i, n) => `<span class="mv"><button class="tb-btn" data-act="${k}-up" data-i="${i}" aria-label="Subir"${i === 0 ? ' disabled' : ''}>↑</button><button class="tb-btn" data-act="${k}-down" data-i="${i}" aria-label="Bajar"${i === n - 1 ? ' disabled' : ''}>↓</button></span>`;
    return `
      <div class="wrap-h"><h1>Portada</h1><a class="button" href="/" target="_blank" rel="noopener">Vista previa ↗</a><button class="button button-primary" data-act="publicar">Publicar cambios</button></div>
      <p class="muted" style="margin:-8px 0 18px">Lo que se ve al entrar a la tienda. Antes se editaba con Elementor; aquí se cambia sin tocar código.</p>
      <div class="cols"><div>
        ${box('Banners principales', `<ul class="rows">${HOME.banners.map((b, i) => `<li class="brow${b.on ? '' : ' off'}"><img src="${b.img}" alt="" class="brow__img"><div class="brow__f"><input type="text" value="${esc(b.t)}" aria-label="Título del banner ${i + 1}" data-ban="${i}" data-k="t"><input type="text" value="${esc(b.s)}" aria-label="Texto del banner ${i + 1}" data-ban="${i}" data-k="s"><input type="text" value="${esc(b.link)}" aria-label="Enlace del banner ${i + 1}" data-ban="${i}" data-k="link"></div><div class="brow__a"><label class="switch"><input type="checkbox" data-act="ban-tog" data-i="${i}"${b.on ? ' checked' : ''}> Visible</label>${mv('ban', i, HOME.banners.length)}<button class="button" data-act="foto">Cambiar imagen</button></div></li>`).join('')}</ul><p style="margin:12px 0 0"><button class="button" data-act="ban-add">Agregar banner</button></p>`, 'en celular se muestra el primero, sin carrusel')}
        ${box(`Productos destacados · ${feat.length}`, `<ul class="rows">${feat.map((p) => `<li class="frow"><img class="thumb" src="${img(p)}" alt=""><span>${esc(p.n)}<span class="muted small"> · ${clp(p.p)}</span></span><button class="button-link-delete" data-act="quitar-dest" data-id="${p.id}">Quitar</button></li>`).join('') || '<li class="muted">Sin destacados.</li>'}</ul>
          <div class="addrow"><select id="addDest" aria-label="Producto para destacar"><option value="">Elegir producto para destacar…</option>${HEADS.filter((p) => !featured.has(p.id) && p.p > 0).sort((a, b) => a.n.localeCompare(b.n, 'es')).map((p) => `<option value="${p.id}">${esc(p.n.slice(0, 70))}</option>`).join('')}</select><button class="button" data-act="agregar-dest">Destacar</button></div>`, '', false)}
      </div><div>
        ${box('Barra de aviso', `<label class="switch" style="margin-bottom:10px"><input type="checkbox" id="barOn"${HOME.bar.on ? ' checked' : ''}> Mostrar arriba de todo</label><input type="text" id="barTxt" value="${esc(HOME.bar.txt)}" style="width:100%" aria-label="Texto de la barra de aviso"><p class="muted small" style="margin:8px 0 0">Ideal para promociones: "CyberMonday: 30 % con CYBER30".</p>`)}
        ${box('Orden de las secciones', `<ul class="rows">${HOME.secs.map(([n, on], i) => `<li class="srow${on ? '' : ' off'}"><label class="switch"><input type="checkbox" data-act="sec-tog" data-i="${i}"${on ? ' checked' : ''}> ${n}</label>${mv('sec', i, HOME.secs.length)}</li>`).join('')}</ul>`)}
        ${box('Espacio Motor Clean', `<label class="switch"><input type="radio" name="mc" value="auto"${HOME.mc === 'auto' ? ' checked' : ''}> Mostrar los más vendidos (automático)</label><br><label class="switch"><input type="radio" name="mc" value="mano"${HOME.mc !== 'auto' ? ' checked' : ''}> Elegir los productos a mano</label>`)}
      </div></div>`;
  };

  /* ───────── registro de actividad ───────── */
  V.actividad = (q) => {
    const who = q.get('u') || '', page = Math.max(1, +q.get('pag') || 1), per = 30, base = '#/actividad';
    const users = [...new Set(LOG.map((x) => x.who))];
    const list = LOG.filter((x) => !who || x.who === who), rows = list.slice((page - 1) * per, page * per);
    return `
      <div class="wrap-h"><h1>Registro de actividad</h1></div>
      <p class="muted" style="margin:-8px 0 18px">Quién hizo qué y cuándo. No se puede borrar ni editar.</p>
      <ul class="subsubsub">${[['', 'Todos'], ...users.map((u) => [u, u])].map(([k, l]) => `<li><a href="${href(base, q, { u: k, pag: '' })}" class="${who === k ? 'current' : ''}">${esc(l)}</a></li>`).join('')}</ul>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>
      <table class="wp-list-table"><thead><tr><th>Fecha</th><th>Persona</th><th class="hide-m">Área</th><th>Detalle</th></tr></thead><tbody>
      ${rows.map((x) => `<tr><td class="nw">${fFull(x.t)}</td><td class="nw">${esc(x.who)}</td><td class="hide-m">${esc(x.what)}</td><td>${esc(x.detail)}</td></tr>`).join('')}
      </tbody></table>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>`;
  };

  /* ───────── buscador general y avisos ───────── */
  function gsearch(v) {
    const s = deacc(v.trim().toLowerCase()), res = $('#gres');
    if (s.length < 2) { res.hidden = true; return; }
    const os = ORDERS.filter((o) => String(o.id).includes(s) || deacc(`${custName(o.c)} ${o.c.email}`.toLowerCase()).includes(s)).slice(0, 4);
    const ps = HEADS.filter((p) => deacc(`${p.n} ${p.sku} ${p.b}`.toLowerCase()).includes(s)).slice(0, 5);
    const buyers = new Set(ORDERS.map((o) => o.c));
    const cs = CUST.filter((c) => buyers.has(c) && deacc(`${custName(c)} ${c.email} ${c.emp ? c.emp.name : ''}`.toLowerCase()).includes(s)).slice(0, 3);
    const sec = (t, items) => (items.length ? `<div class="gres__t">${t}</div>${items.join('')}` : '');
    res.innerHTML = sec('Pedidos', os.map((o) => `<a href="#/pedido/${o.id}"><b>#${o.id}</b><span class="gres__m">${esc(custName(o.c))}</span>${pill(o.st)}</a>`))
      + sec('Productos', ps.map((p) => `<a href="#/producto/${p.id}"><img src="${img(p)}" alt=""><span class="gres__m">${esc(p.n)}</span><span class="muted">${clp(p.p)}</span></a>`))
      + sec('Clientes', cs.map((c) => `<a href="#/pedidos?cliente=${c.id}"><span class="gres__m"><b>${esc(custName(c))}</b></span><span class="muted">${esc(c.comuna)}</span></a>`)) || '<p class="gres__none">Sin resultados para esa búsqueda.</p>';
    res.hidden = false;
  }
  function bellItems() {
    const inv = invRows();
    return [
      [ORDERS.filter((o) => NOW - o.t < DAY && PAID.has(o.st)).length, 'pedidos pagados en las últimas 24 horas', '#/pedidos', 'st-ok'],
      [ORDERS.filter((o) => o.st === 'processing' && !o.prep).length, 'pedidos esperando preparación', '#/despachos', 'st-wait'],
      [ORDERS.filter((o) => o.st === 'failed' && NOW - o.t < 7 * DAY).length, 'pagos rechazados esta semana', '#/pedidos?estado=failed', 'st-bad'],
      [inv.filter((x) => x.st === 'now').length, 'productos para reponer ya', '#/inventario', 'st-wait'],
      [CARTS.filter((c) => c.st === 'pend').length, 'carritos abandonados por recuperar', '#/marketing?tab=carritos', 'st-info'],
      [1, 'Bsale: falta el token para conectar precios y stock', '#/ajustes?tab=bsale', 'st-bad'],
    ].filter((x) => x[0]);
  }
  function drawBell() {
    const items = bellItems();
    $('#bellN').textContent = items.length; $('#bellN').hidden = !items.length;
    $('#bellPanel').innerHTML = `<div class="bell__h">Avisos</div>${items.map(([n, t, h, cls]) => `<a href="${h}" class="bell__i"><span class="st ${cls}"></span><span>${n > 1 || !/^Bsale/.test(t) ? `<b>${n}</b> ` : ''}${t}</span></a>`).join('')}`;
  }
  function csv(name, head, rows) {
    const cell = (v) => { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const txt = '﻿' + [head, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const stamp = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };

  /* ───────── enrutador (#/seccion/id?filtros) ───────── */
  const TITLES = { despachos: 'Despachos', inventario: 'Inventario y reposición', marketing: 'Marketing', portada: 'Portada', actividad: 'Registro de actividad', dash: 'Escritorio', pedidos: 'Pedidos', pedido: 'Editar pedido', productos: 'Productos', producto: 'Editar producto', clientes: 'Clientes', analitica: 'Analítica', seo: 'SEO', usuarios: 'Usuarios', ajustes: 'Ajustes' };
  function route() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = h.split('?'), q = new URLSearchParams(qs || ''), parts = path.split('/').filter(Boolean);
    const sec = parts[0] || '', key = sec === '' || sec === 'escritorio' ? 'dash' : sec, view = V[key];
    hideTip();
    drawMenu(sec, q);
    setMenu(false);
    closePops();
    charts.length = 0;
    const main = $('#wpbody');
    main.innerHTML = view ? view(q, parts[1]) : `<div class="wrap-h"><h1>No encontrado</h1></div><p><a href="#/">Volver al escritorio</a></p>`;
    if (view && view.after) view.after(q, parts[1]);
    document.title = `${TITLES[key] || 'No encontrado'} · Panel Reycar`;
    if (route.last !== path) { scrollTo(0, 0); main.focus({ preventScroll: true }); }
    route.last = path;
    drawBell();
  }
  addEventListener('hashchange', route);

  /* ───────── interacción ───────── */
  function setMenu(on) { $('#side').classList.toggle('open', on); $('#scrim').hidden = !on; $('#menuToggle').setAttribute('aria-expanded', String(on)); }
  $('#menuToggle').addEventListener('click', () => setMenu(!$('#side').classList.contains('open')));
  $('#scrim').addEventListener('click', () => setMenu(false));
  function closeBell() { $('#bellPanel').hidden = true; $('#bellBtn').setAttribute('aria-expanded', 'false'); }
  function closePops() { $('#gres').hidden = true; $('#gsearch').value = ''; closeBell(); }
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setMenu(false); closePops(); }
    if (e.key === '/' && !e.target.closest('input, textarea, select')) { e.preventDefault(); $('#gsearch').focus(); }
  });
  $('#gsearch').addEventListener('input', (e) => gsearch(e.target.value));
  $('#gsearch').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const f = $('#gres a'); if (f) location.hash = f.getAttribute('href').slice(1); } });
  $('#bellBtn').addEventListener('click', () => { const p = $('#bellPanel'), on = p.hidden; p.hidden = !on; $('#bellBtn').setAttribute('aria-expanded', String(on)); });
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
  document.addEventListener('input', (e) => { const b = e.target.dataset && e.target.dataset.ban; if (b != null) HOME.banners[+b][e.target.dataset.k] = e.target.value; });
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-all]')) $$('tbody input[type=checkbox]', e.target.closest('table')).forEach((c) => (c.checked = e.target.checked));
  });
  document.addEventListener('click', (e) => {
    const qb = e.target.closest('[data-q]');
    if (qb) { const [k, v] = qb.dataset.q.split('='); const cur = new URLSearchParams((location.hash.split('?')[1]) || ''); location.hash = href(location.hash.split('?')[0] || '#/', cur, { [k]: v }).slice(1); return; }
    const tab = e.target.closest('.pdata [data-tab]');
    if (tab) { const w = tab.closest('.pdata'); $$('[data-tab]', w).forEach((b) => b.setAttribute('aria-selected', String(b === tab))); $$('[data-panel]', w).forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab)); return; }
    if (!e.target.closest('.tb-search')) $('#gres').hidden = true;
    if (!e.target.closest('.tb-pop')) closeBell();
    const a = e.target.closest('[data-act]');
    if (a && a.matches('input')) {
      const i = +a.dataset.i;
      if (a.dataset.act === 'ban-tog') HOME.banners[i].on = a.checked;
      if (a.dataset.act === 'sec-tog') HOME.secs[i][1] = a.checked;
      a.closest('li').classList.toggle('off', !a.checked);
      return;
    }
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
      const o = oId.get(id), note = (txt, kind = 'private', by = 'Ventas y despacho') => o.notes.push({ t: Date.now(), txt, kind, by });
      if (act === 'prep') { o.prep = true; note('Pedido preparado y embalado.'); log(`Pedido #${o.id}`, 'Lo marcó como preparado', 'Ventas y despacho'); route(); return toast(`#${o.id} preparado. ${isPick(o) ? 'Ahora avisa al cliente que puede retirarlo.' : 'Ahora genera la etiqueta.'}`); }
      if (act === 'avisar') { note(`Se avisó por WhatsApp que el pedido está listo para retiro en Quinta Normal.`, 'customer'); return toast(`En la versión real abre WhatsApp con: "Hola ${o.c.first}, tu pedido #${o.id} ya está listo para retiro en Quinta Normal".`); }
      if (act === 'retirado') { note('El cliente retiró el pedido en la tienda.'); setStatus(o, 'completed'); route(); return toast(`#${o.id} entregado y completado.`); }
      if (act === 'etiqueta') { Object.assign(o.ship, { track: String(1e9 + Math.floor(Math.random() * 8.9e9)), carrier: o.ship.carrier || 'Starken' }); note(`Envío creado en Sendu con ${o.ship.carrier}. N° de seguimiento ${o.ship.track}.`, 'customer'); setStatus(o, 'completed'); route(); return toast(`Etiqueta de ${o.ship.carrier} lista (en la versión real se descarga el PDF para imprimir). El cliente recibe el seguimiento por correo.`); }
      if (act === 'seguimiento') return toast(`${o.ship.carrier} · N° ${o.ship.track}. En la versión real abre el seguimiento del courier.`);
      if (act === 'imprimir') return print();
      if (act === 'csv-pedidos') { const l = V.pedidos.last || []; csv(`pedidos-reycar-${stamp()}.csv`, ['Pedido', 'Fecha', 'Estado', 'Cliente', 'Correo', 'Teléfono', 'Comuna', 'Región', 'Documento', 'Folio', 'RUT', 'Envío', 'Costo envío', 'Medio de pago', 'Origen', 'Campaña', 'Productos', 'Total'], l.map((o) => [o.id, fFull(o.t), ST[o.st], custName(o.c), o.c.email, o.c.phone, o.c.comuna, o.c.region, o.doc ? o.doc.type : '', o.doc ? o.doc.folio : '', o.fac ? o.c.emp.rut : o.c.rut, o.ship.m, o.ship.cost, o.pay, o.src.lbl, o.camp, o.lines.map((x) => `${x.q} × ${x.p.n}`).join(' | '), o.total])); log('Exportación', `Exportó ${l.length} pedidos a Excel`); return toast(`Se descargó un archivo con ${plural(l.length, 'pedido', 'pedidos')}. Queda anotado en el registro de actividad.`); }
      if (act === 'csv-clientes') { const l = V.clientes.last || []; csv(`clientes-reycar-${stamp()}.csv`, ['Nombre', 'Correo', 'Teléfono', 'Comuna', 'Región', 'Empresa', 'Pedidos pagados', 'Gasto total', 'Último pedido'], l.map((x) => [custName(x.c), x.c.email, x.c.phone, x.c.comuna, x.c.region, x.c.emp ? x.c.emp.name : '', x.n, x.v, fDate(x.last)])); log('Exportación', `Exportó ${l.length} clientes a Excel`); return toast(`Se descargó un archivo con ${plural(l.length, 'cliente', 'clientes')}. Queda anotado en el registro de actividad.`); }
      if (act === 'csv-inventario') { const l = (V.inventario.last || []).filter((x) => x.sug || x.st === 'out'); csv(`reposicion-reycar-${stamp()}.csv`, ['Producto', 'Marca', 'SKU', 'Stock', 'Vendidos 30 días', 'Sugerido pedir'], l.map((x) => [x.p.n, x.p.b || '', x.p.sku, x.p.stk ?? '', x.u, x.sug])); return toast(`Se descargó la lista de reposición (${plural(l.length, 'producto', 'productos')}).`); }
      if (act === 'crear-cupon') {
        const code = $('#cc').value.trim().toUpperCase().replace(/\s+/g, ''), type = $('#ct').value, val = +$('#cv').value || 0;
        if (!/^[A-Z0-9-]{3,20}$/.test(code)) return toast('El código debe tener de 3 a 20 letras o números, sin espacios.');
        if (COUPONS.some((c) => c.code === code)) return toast('Ya existe un cupón con ese código.');
        if (type !== 'ship' && !val) return toast('Indica el valor del descuento.');
        if (type === 'pct' && val > 90) return toast('Un porcentaje mayor a 90 % parece un error.');
        const dt = (id) => { const v = $(id).value; return v ? new Date(v + 'T00:00').getTime() : 0; };
        COUPONS.unshift({ code, type, val, min: +$('#cm').value || 0, uses: 0, limit: +$('#cl').value || 0, from: dt('#cf') || Date.now(), to: dt('#cto') ? dt('#cto') + DAY - MIN : 0, scope: $('#cs2').value });
        log('Cupón', `Creó el cupón ${code} (${cpVal(COUPONS[0])})`); route(); return toast(`Cupón ${code} creado. ${NOSAVE}`);
      }
      if (act === 'recordar' || act === 'recordar-todos') { const l = act === 'recordar' ? CARTS.filter((c) => c.id === id) : CARTS.filter((c) => c.st === 'pend'); l.forEach((c) => (c.st = 'sent')); log('Marketing', `Envió recordatorio a ${plural(l.length, 'carrito abandonado', 'carritos abandonados')}`); route(); return toast(l.length ? `Recordatorio enviado a ${plural(l.length, 'cliente', 'clientes')} (en la maqueta no sale ningún mensaje).` : 'No hay carritos pendientes.'); }
      const mvArr = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; route(); };
      const ii = +a.dataset.i;
      if (act === 'ban-up' || act === 'ban-down') return mvArr(HOME.banners, ii, act.endsWith('up') ? -1 : 1);
      if (act === 'sec-up' || act === 'sec-down') return mvArr(HOME.secs, ii, act.endsWith('up') ? -1 : 1);
      if (act === 'ban-add') { HOME.banners.push({ t: 'Nuevo banner', s: 'Texto del banner', link: '/tienda', img: '/assets/reycars-crest.webp', on: false }); route(); return toast('Banner agregado (oculto hasta que lo actives).'); }
      if (act === 'quitar-dest') { featured.delete(id); route(); return toast('Quitado de destacados.'); }
      if (act === 'agregar-dest') { const v = +$('#addDest').value; if (!v) return toast('Elige un producto.'); featured.add(v); route(); return toast('Producto destacado.'); }
      if (act === 'publicar') { HOME.bar = { on: $('#barOn').checked, txt: $('#barTxt').value }; HOME.mc = ($('input[name=mc]:checked') || {}).value || 'auto'; log('Portada', 'Publicó cambios en la portada'); return toast(`Portada publicada. ${NOSAVE}`); }
      if (act === 'wa-cliente') return toast('En la versión real abre WhatsApp con el cliente. En la maqueta los teléfonos son inventados.');
      const MSG = { 'ver-correo': 'Aquí se ve el correo tal como le llega al cliente, con el logo de Reycar.', solicitud: 'Se busca al cliente por correo o RUT; la acción queda registrada con fecha y responsable.', 'nuevo-pedido': 'Los pedidos llegan solos desde la tienda. En la versión real también se podrán crear a mano (ventas por WhatsApp).', reembolso: 'En la versión real: devuelve el dinero en Klap y emite la nota de crédito en Bsale.', pdf: 'Al conectar Bsale, abre el PDF del documento.', papelera: 'En la maqueta no se borra nada.', unir: 'Elegirás otro producto de Bsale para mostrarlo como formato de este.', foto: 'Aquí se suben fotos (se optimizan solas para la web).', 'nueva-redir': 'Aquí se agrega una redirección: dirección antigua → nueva.', 'nuevo-usuario': 'Aquí se invita a una persona por correo, con su perfil.', guardar: `Guardado. ${NOSAVE}` };
      return toast(MSG[act] || NOSAVE);
    }
    const row = e.target.closest('tr[data-go]');
    if (row && !e.target.closest('a, input, button, label, select')) location.hash = row.dataset.go.slice(1);
  });
  function setStatus(o, to) {
    if (!o || o.st === to) return;
    o.notes.push({ t: Date.now(), txt: `El estado del pedido cambió de ${ST[o.st]} a ${ST[to]}.`, kind: 'system', by: 'Guillermo' });
    log(`Pedido #${o.id}`, `Cambió el estado de ${ST[o.st]} a ${ST[to]}`);
    o.st = to;
  }

  route();
})();
