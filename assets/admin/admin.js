/* Panel de administración de Reycar Store, con la identidad de la tienda.
   La lógica (pedidos, estados, notas, atribución) es la que el equipo ya conoce de WooCommerce.
   Vista previa sin base de datos: los productos y el stock son los reales (data/products.js); pedidos, clientes,
   reservas y demás parten vacíos y lo que se cree vive en memoria hasta recargar. Al conectarlo: base de datos,
   precio/stock/boletas desde Bsale, pagos desde Klap, envíos desde Sendu y anuncios desde Meta y Google. */
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
  const ago = (t) => { const s = Math.max(0, Date.now() - t); if (s < HOUR) return `hace ${Math.max(1, Math.round(s / MIN))} min`; if (s < DAY) { const h = Math.round(s / HOUR); return `hace ${h} hora${h > 1 ? 's' : ''}`; } return fDate(t); };
  const plural = (n, a, b) => `${miles(n)} ${n === 1 ? a : b}`;
  const deacc = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const toast = (msg) => { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 3200); };
  const NOSAVE = '(Vista previa: se pierde al recargar.)';

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

  /* ───────── datos de la tienda ─────────
     Vista previa sin base de datos: pedidos, clientes, reservas, reseñas, cupones, campañas y registro parten vacíos;
     lo que se crea aquí funciona igual que en la versión conectada, pero se pierde al recargar. Los productos, el stock
     y la revisión de catálogos son los reales. En la versión real todo viene de la base de datos, Bsale, Klap y Sendu. */
  const CONNECTED = false;
  const ORDER_BASE = 1000; // al migrar se continúa desde el último número de pedido de WooCommerce
  const RM = 'Región Metropolitana';
  const COMUNAS = [['Santiago', RM], ['Cerrillos', RM], ['Cerro Navia', RM], ['Conchalí', RM], ['El Bosque', RM], ['Estación Central', RM], ['Huechuraba', RM], ['Independencia', RM], ['La Cisterna', RM], ['La Florida', RM], ['La Granja', RM], ['La Pintana', RM], ['La Reina', RM], ['Las Condes', RM], ['Lo Barnechea', RM], ['Lo Espejo', RM], ['Lo Prado', RM], ['Macul', RM], ['Maipú', RM], ['Ñuñoa', RM], ['Pedro Aguirre Cerda', RM], ['Peñalolén', RM], ['Providencia', RM], ['Pudahuel', RM], ['Quilicura', RM], ['Quinta Normal', RM], ['Recoleta', RM], ['Renca', RM], ['San Joaquín', RM], ['San Miguel', RM], ['San Ramón', RM], ['Vitacura', RM], ['Puente Alto', RM], ['San Bernardo', RM], ['Colina', RM], ['Lampa', RM], ['Buin', RM], ['Talagante', RM], ['Peñaflor', RM], ['Melipilla', RM], ['Valparaíso', 'Valparaíso'], ['Viña del Mar', 'Valparaíso'], ['Quilpué', 'Valparaíso'], ['Villa Alemana', 'Valparaíso'], ['San Antonio', 'Valparaíso'], ['Los Andes', 'Valparaíso'], ['Rancagua', "O'Higgins"], ['San Fernando', "O'Higgins"], ['Talca', 'Maule'], ['Curicó', 'Maule'], ['Linares', 'Maule'], ['Chillán', 'Ñuble'], ['Concepción', 'Biobío'], ['Talcahuano', 'Biobío'], ['Los Ángeles', 'Biobío'], ['Temuco', 'La Araucanía'], ['Valdivia', 'Los Ríos'], ['Osorno', 'Los Lagos'], ['Puerto Montt', 'Los Lagos'], ['Coyhaique', 'Aysén'], ['Punta Arenas', 'Magallanes'], ['La Serena', 'Coquimbo'], ['Coquimbo', 'Coquimbo'], ['Copiapó', 'Atacama'], ['Antofagasta', 'Antofagasta'], ['Calama', 'Antofagasta'], ['Iquique', 'Tarapacá'], ['Arica', 'Arica y Parinacota']].map(([n, r]) => ({ n, r }));
  const custName = (c) => `${c.first} ${c.last}`.trim();

  // de dónde vino cada pedido: misma idea que la "atribución del pedido" de WooCommerce (fuente, tipo, campaña UTM, dispositivo)
  const ORIG = [
    { k: 'meta', lbl: 'Meta Ads', type: 'Anuncio', src: 'facebook / instagram', med: 'paid_social', cls: 'ads' },
    { k: 'gads', lbl: 'Google Ads', type: 'Anuncio', src: 'google', med: 'cpc', cls: 'ads' },
    { k: 'org', lbl: 'Google orgánico', type: 'Orgánico', src: 'google', med: 'organic', cls: 'org' },
    { k: 'dir', lbl: 'Directo', type: 'Directo', src: '(directo)', med: '(ninguno)' },
    { k: 'ig', lbl: 'Instagram', type: 'Referido', src: 'instagram.com', med: 'referral', cls: 'ref' },
    { k: 'wa', lbl: 'WhatsApp', type: 'Referido', src: 'wa.me', med: 'referral', cls: 'ref' },
    { k: 'yt', lbl: 'YouTube', type: 'Referido', src: 'youtube.com', med: 'referral', cls: 'ref' },
    { k: 'mail', lbl: 'Correo', type: 'Correo', src: 'newsletter', med: 'email' },
  ];
  const MANUAL = { k: 'manual', lbl: 'Venta directa', type: 'Directo', src: 'panel', med: 'whatsapp / local' };
  ORIG.push(MANUAL);
  const oById = new Map(ORIG.map((o) => [o.k, o]));

  const CUST = [], ORDERS = [], CARTS = [], COUPONS = [], BOOK = [], REVIEWS = [], CAMPAIGNS = [], LOG = [], SEARCHES = [];
  const oId = new Map();

  const ST = { pending: 'Pendiente de pago', processing: 'Procesando', 'on-hold': 'En espera', completed: 'Completado', cancelled: 'Cancelado', refunded: 'Reembolsado', failed: 'Fallido' };
  const PAID = new Set(['processing', 'completed']);
  const pill = (st) => `<mark class="order-status status-${st}"><span>${ST[st]}</span></mark>`;
  const otag = (o) => `<span class="tag${o.src.cls ? ' tag--' + o.src.cls : ''}">${esc(o.src.lbl)}</span>`;
  const qty = (o) => o.lines.reduce((s, l) => s + l.q, 0);
  const isPick = (o) => /Retiro/.test(o.ship.m);
  const docTxt = (d) => `${d.type}${d.folio ? ` N° ${d.folio}` : ''}`;
  const CART_ST = { pend: ['Por recuperar', 'processing'], sent: ['Recordatorio enviado', 'pending'], rec: ['Recuperado', 'completed'], anon: ['Sin datos de contacto', 'cancelled'] };
  const cpState = (c, now = Date.now()) => (c.to && c.to < now ? ['Vencido', 'cancelled'] : c.from > now ? ['Programado', 'pending'] : c.limit && c.uses >= c.limit ? ['Agotado', 'failed'] : ['Activo', 'completed']);
  const cpVal = (c) => (c.type === 'pct' ? `${c.val} %` : c.type === 'fix' ? clp(c.val) : 'Envío gratis');
  const log = (what, detail, who = 'Guillermo Araya') => LOG.unshift({ t: Date.now(), who, what, detail });

  // WhatsApp sin integraciones: abre la conversación con el mensaje escrito (wa.me)
  function waOpen(phone, text) {
    let d = String(phone || '').replace(/\D/g, '');
    if (d.length === 9 && d[0] === '9') d = '56' + d;
    if (d.length < 11) return toast('Este cliente no tiene un teléfono válido para WhatsApp.'), false;
    open(`https://wa.me/${d}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    return true;
  }

  const firstPulido = HEADS.find((p) => p.g === 'pulido' && p.im && p.im.length);
  const HOME = {
    bar: { on: true, txt: 'Envíos a todo Chile · Retiro gratis en Quinta Normal' },
    banners: [
      { t: 'Línea completa Motor Clean', s: 'Formatos de 1 L y 5 L para tu lavado', link: '/motor-clean', img: '/assets/brands/motor-clean.png', on: true },
      { t: 'Pulido profesional', s: 'Máquinas, pads y compuestos', link: '/tienda?g=pulido', img: firstPulido ? img(firstPulido) : '/assets/reycars-crest.webp', on: true },
      { t: 'Servicios de taller', s: 'Cerámicos para sedán, hatchback y SUV', link: '/asesoria', img: '/assets/reycars-crest.webp', on: false },
    ],
    secs: [['Banners principales', true], ['Categorías', true], ['Productos destacados', true], ['Espacio Motor Clean', true], ['Marcas', true], ['Servicios de taller', true], ['Contacto y ubicación', true]],
    mc: 'auto',
  };

  // clientes: totales y segmento (se recalcula cuando cambian los pedidos)
  let CS = null;
  const cstats = () => {
    if (CS) return CS;
    CS = new Map(CUST.map((c) => [c, { n: 0, v: 0, last: 0, first: 0, orders: [], brands: new Set() }]));
    ORDERS.forEach((o) => {
      const x = CS.get(o.c); if (!x) return;
      x.orders.push(o);
      if (PAID.has(o.st)) { x.n++; x.v += o.total; x.last = Math.max(x.last, o.t); x.first = x.first ? Math.min(x.first, o.t) : o.t; o.lines.forEach((l) => l.p.b && x.brands.add(l.p.b)); }
    });
    return CS;
  };
  const SEGS = { vip: ['Gran comprador', 'processing'], freq: ['Frecuente', 'completed'], nuevo: ['Nuevo', 'pending'], ocas: ['Ocasional', 'on-hold'], riesgo: ['En riesgo', 'failed'], sin: ['Sin compras', 'cancelled'] };
  const segOf = (c) => {
    const x = cstats().get(c); if (!x || !x.n) return 'sin';
    const age = Date.now() - x.last;
    if (x.v >= 250000 && age < 120 * DAY) return 'vip';
    if (x.n >= 3 && age < 60 * DAY) return 'freq';
    if (age > 90 * DAY) return 'riesgo';
    if (x.n === 1 && age < 30 * DAY) return 'nuevo';
    return 'ocas';
  };

  // taller: 2 boxes, lunes a viernes 9:00–19:00 y sábado 9:00–14:00; los servicios son los del catálogo (con su precio)
  const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const addDays = (t, k) => { const d = new Date(t); d.setDate(d.getDate() + k); return d.getTime(); };
  const mondayOf = (t) => addDays(sod(t), -((new Date(t).getDay() + 6) % 7));
  const weekOf = (t) => Math.round((mondayOf(t) - mondayOf(NOW)) / (7 * DAY));
  const SERVICES = HEADS.filter((p) => p.g === 'servicios' && p.p > 0).sort((a, b) => a.p - b.p).map((p) => ({ n: p.n, min: 540, p: p.p, pid: p.id }));
  const BK_ST = { agendado: ['Agendado', 'pending'], confirmado: ['Confirmado', 'on-hold'], proceso: ['En proceso', 'processing'], listo: ['Listo para entregar', 'completed'], entregado: ['Entregado', 'completed'], noshow: ['No asistió', 'failed'] };
  const closeOf = (day) => (new Date(day).getDay() === 6 ? 840 : 1140);
  const RV_ST = { pend: ['Por aprobar', 'processing'], ok: ['Publicada', 'completed'], hid: ['Oculta', 'cancelled'] };

  // correos a clientes: solo a quienes dieron permiso
  const MAILSEG = [
    ['all', 'Todos los que aceptaron correos', (c) => c.consent.mail],
    ['freq', 'Compradores frecuentes', (c) => c.consent.mail && ['freq', 'vip'].includes(segOf(c))],
    ['riesgo', 'No compran hace más de 90 días', (c) => c.consent.mail && segOf(c) === 'riesgo'],
    ['mc', 'Compraron Motor Clean', (c, x) => c.consent.mail && x.brands.has('Motor Clean')],
    ['emp', 'Empresas y clientes del taller', (c) => c.consent.mail && (!!c.emp || c.tags.includes('Cliente del taller'))],
  ];
  const segCount = (k) => { const s = MAILSEG.find((x) => x[0] === k) || MAILSEG[0], st = cstats(); return CUST.filter((c) => st.get(c) && s[2](c, st.get(c))).length; };

  // búsquedas en la tienda: se registran desde que la tienda nueva está publicada; los resultados se calculan con el catálogo
  const SYN = new Map();
  const searchHits = (term) => { const ws = deacc(term.toLowerCase()).split(/\s+/); return HEADS.filter((p) => { const h = deacc(`${p.n} ${p.b || ''} ${(gById.get(p.g) || {}).name || ''} ${subName(p)}`.toLowerCase()); return ws.every((w) => h.includes(w)); }).length; };

  // tarifas propias por zona (se completan en Ajustes → Envíos)
  const ZONES = [['Región Metropolitana', 'Toda la región', '', '1 a 2 días hábiles'], ['Zona centro', "Valparaíso, O'Higgins y Maule", '', '2 a 3 días hábiles'], ['Zona sur', 'Ñuble a Los Lagos', '', '2 a 4 días hábiles'], ['Zona norte', 'Arica a Coquimbo', '', '3 a 5 días hábiles'], ['Zonas extremas', 'Aysén y Magallanes', '', '4 a 7 días hábiles']];

  // revisión de catálogos de anuncios con los productos reales (FEED_ERR y FEED_WARN están en Marketing)
  const feedItems = () => ALL.filter((p) => p.p > 0 && !hidden.has(p.fam || p.id) && !['cursos', 'servicios'].includes(p.g)).map((p) => ({ p, e: FEED_ERR(p), w: FEED_WARN(p) }));

  // bloque para pantallas sin datos todavía
  const emptyState = (title, text, actions = '', icon = 'box') => `<div class="empty"><div class="empty__i" aria-hidden="true">${{ box: '<svg viewBox="0 0 24 24"><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5 12 12l8.5-4.5M12 12v9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>', chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10m6 10V4m6 16v-7m4 7H3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>', user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>', star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>', link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>', mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m3.5 6.5 8.5 6 8.5-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>', list: '<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' }[icon]}</div><h2>${title}</h2><p>${text}</p>${actions ? `<div class="empty__a">${actions}</div>` : ''}</div>`;

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
    cal: 'M5 1.5h2v2h6v-2h2v2h2.5v15h-15v-15H5zm-1 6v9h12v-9zm2 2h3v3H6z',
    home: 'M10 2 1.5 9.2H4V18h4.6v-5.2h2.8V18H16V9.2h2.5z',
    set: 'M3 5h8.2a2.5 2.5 0 0 1 4.6 0H17v1.5h-1.2a2.5 2.5 0 0 1-4.6 0H3zm0 8.5h1.2a2.5 2.5 0 0 1 4.6 0H17V15H8.8a2.5 2.5 0 0 1-4.6 0H3z',
  };
  const ico = (k) => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${IC[k]}" fill="currentColor"/></svg>`;
  const MENU = [
    { k: 'dash', href: '#/', t: 'Escritorio', match: ['', 'escritorio'] },
    { k: 'orders', href: '#/pedidos', t: 'Pedidos', match: ['pedidos', 'pedido', 'despachos'], badge: () => ORDERS.filter((o) => o.st === 'processing').length, subs: [['#/pedidos', 'Todos los pedidos'], ['#/pedido/nuevo', 'Nuevo pedido'], ['#/despachos', 'Despachos']] },
    { k: 'prod', href: '#/productos', t: 'Productos', match: ['productos', 'producto', 'inventario', 'resenas'], subs: [['#/productos', 'Todos los productos'], ['#/producto/nuevo', 'Añadir producto'], ['#/inventario', 'Inventario y reposición'], ['#/resenas', 'Reseñas']] },
    { k: 'cust', href: '#/clientes', t: 'Clientes', match: ['clientes', 'cliente'] },
    { k: 'cal', href: '#/taller', t: 'Taller', match: ['taller'] },
    { k: 'mkt', href: '#/marketing', t: 'Marketing', match: ['marketing'], def: 'anuncios', subs: [['#/marketing?tab=anuncios', 'Anuncios'], ['#/marketing?tab=cupones', 'Cupones'], ['#/marketing?tab=correos', 'Correos'], ['#/marketing?tab=carritos', 'Carritos abandonados'], ['#/marketing?tab=catalogos', 'Catálogos'], ['#/marketing?tab=pixel', 'Píxel y eventos']] },
    { k: 'home', href: '#/portada', t: 'Portada', match: ['portada'] },
    { k: 'stats', href: '#/analitica', t: 'Analítica', match: ['analitica'], def: 'resumen', subs: [['#/analitica?tab=resumen', 'Resumen'], ['#/analitica?tab=trafico', 'Tráfico y búsquedas'], ['#/analitica?tab=informe', 'Informe de ventas']] },
    { k: 'seo', href: '#/seo', t: 'SEO', match: ['seo'] },
    { k: 'users', href: '#/usuarios', t: 'Usuarios', match: ['usuarios', 'actividad'], subs: [['#/usuarios', 'Usuarios y permisos'], ['#/actividad', 'Registro de actividad']] },
    { k: 'set', href: '#/ajustes', t: 'Ajustes', match: ['ajustes'], def: 'general', subs: [['#/ajustes?tab=general', 'General'], ['#/ajustes?tab=pagos', 'Pagos (Klap)'], ['#/ajustes?tab=envios', 'Envíos'], ['#/ajustes?tab=bsale', 'Bsale'], ['#/ajustes?tab=seguimiento', 'Seguimiento y anuncios'], ['#/ajustes?tab=correos', 'Correos al cliente'], ['#/ajustes?tab=privacidad', 'Privacidad y datos']] },
  ];
  const ALIAS = { pedido: 'pedidos', producto: 'productos', cliente: 'clientes' };
  const subKey = (h) => { const [path, qs] = h.replace(/^#\//, '').split('?'); return `${path}|${new URLSearchParams(qs || '').get('tab') || ''}`; };
  function drawMenu(sec, q, path = '') {
    $('#adminmenu').innerHTML = MENU.map((m) => {
      const on = m.match.includes(sec), b = m.badge && m.badge();
      let h = `<a href="${m.href}" class="${on ? 'current' : ''}"${on ? ' aria-current="page"' : ''}>${ico(m.k)}<span>${m.t}</span>${b ? `<span class="count" aria-label="${b} por procesar">${b}</span>` : ''}</a>`;
      const cur = `${/^\/(pedido|producto)\/nuevo$/.test(path) ? path.slice(1) : ALIAS[sec] || sec}|${m.def ? q.get('tab') || m.def : ''}`;
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
    const a30 = agg(30), proc = ORDERS.filter((o) => o.st === 'processing'), pend = ORDERS.filter((o) => o.st === 'pending' || o.st === 'on-hold');
    const low = HEADS.filter((p) => p.stk != null && p.stk > 0 && p.stk <= 2), out = HEADS.filter((p) => p.stk === 0);
    const top = groupBy(a30.list, (o) => o.src.lbl), feed = feedItems(), ferr = feed.filter((x) => x.e.length).length;
    const steps = [
      [true, `Catálogo cargado: ${plural(HEADS.length, 'producto', 'productos')} con fotos, categorías y formatos`, '#/productos'],
      [true, 'Direcciones antiguas redirigidas para no perder Google ni los anuncios', '#/seo'],
      [false, 'Conectar Bsale (precios, stock y boletas)', '#/ajustes?tab=bsale'],
      [false, 'Conectar Klap (pagos con tarjeta, Google Pay y Apple Pay)', '#/ajustes?tab=pagos'],
      [false, 'Configurar envíos (Sendu y tarifas por zona)', '#/ajustes?tab=envios'],
      [false, 'Conectar Google Analytics, Tag Manager y el píxel de Meta', '#/ajustes?tab=seguimiento'],
      [!ferr, ferr ? `Completar ${plural(ferr, 'producto', 'productos')} sin descripción o sin foto (los rechazan los catálogos de anuncios)` : 'Catálogo listo para los anuncios', '#/marketing?tab=catalogos'],
      [false, 'Invitar al equipo con su perfil', '#/usuarios'],
    ];
    const done = steps.filter((x) => x[0]).length;
    return `
      <div class="wrap-h"><h1>Escritorio</h1><a class="page-title-action" href="#/pedido/nuevo">Nuevo pedido</a></div>
      <div class="postbox setup"><h2 class="hndle"><span>Puesta en marcha</span><span class="act">${done} de ${steps.length} listos</span></h2><div class="inside">
        <div class="meter meter--setup"><i style="width:${Math.round((done / steps.length) * 100)}%"></i></div>
        <ol class="steps">${steps.map(([ok, t, h]) => `<li class="${ok ? 'is-done' : ''}"><a href="${h}"><span class="steps__c" aria-hidden="true">${ok ? '✓' : ''}</span><span>${t}</span><span class="screen-reader-text">${ok ? '(listo)' : '(pendiente)'}</span></a></li>`).join('')}</ol>
      </div></div>
      <div class="tiles">
        ${tile(`Ventas de ${MESL[m.getMonth()]}`, clp(sum(inM)), inP.length ? delta(sum(inM), sum(inP)) : 'pedidos pagados del mes')}
        ${tile('Pedidos pagados del mes', miles(inM.length), inP.length ? delta(inM.length, inP.length) : 'web, WhatsApp y local')}
        ${tile('Ticket promedio del mes', inM.length ? clp(sum(inM) / inM.length) : '—', 'con IVA')}
        ${tile('Por preparar y despachar', miles(proc.length), `<a href="#/despachos">Ir a despachos</a>`)}
      </div>
      <div class="dash">
        <div>
          ${a30.n ? '<div class="postbox"><h2 class="hndle"><span>Ventas de los últimos 30 días</span><span class="act"><a href="#/analitica">Ver analítica</a></span></h2><div class="chart" id="c30"></div></div>' : box('Ventas de los últimos 30 días', emptyState('Todavía no hay ventas', 'El gráfico se llena con el primer pedido pagado, venga de la tienda web, de WhatsApp o del local.', '<a class="button" href="#/pedido/nuevo">Registrar una venta</a>', 'chart'))}
          ${box('Últimos pedidos', ORDERS.length ? `<table class="mini"><tbody>${ORDERS.slice(0, 7).map((o) => `<tr><td><a href="#/pedido/${o.id}"><b>#${o.id}</b> ${esc(custName(o.c))}</a><div class="muted small">${ago(o.t)} · ${otag(o)}</div></td><td>${pill(o.st)}</td><td class="num">${clp(o.total)}</td></tr>`).join('')}</tbody></table>` : emptyState('Sin pedidos aún', 'Los pedidos de la tienda llegan solos al conectar Klap. Las ventas por WhatsApp o en el local se registran con "Nuevo pedido".', '', 'list'), ORDERS.length ? '<a href="#/pedidos">Ver todos</a>' : '', true)}
        </div>
        <div>
          ${box('Para hoy', `<ul class="tasks">${[
            [ORDERS.filter((o) => o.st === 'processing' && !o.prep).length, 'pedidos por preparar', '#/despachos'],
            [ORDERS.filter((o) => o.st === 'processing' && o.prep).length, 'listos para enviar o retirar', '#/despachos'],
            [pend.length, 'pedidos esperando pago', '#/pedidos?estado=pending'],
            [BOOK.filter((b) => b.day === sod(NOW) && b.st !== 'noshow').length, 'autos en el taller hoy', '#/taller'],
            [REVIEWS.filter((r) => r.st === 'pend').length, 'reseñas por aprobar', '#/resenas'],
            [CARTS.filter((c) => c.st === 'pend').length, 'carritos abandonados por recuperar', '#/marketing?tab=carritos'],
          ].map(([n, t, h]) => `<li><a href="${h}"><b>${n}</b><span>${t}</span><span aria-hidden="true" class="tasks__go">→</span></a></li>`).join('')}</ul>`, '', true)}
          ${box('Inventario', `<ul class="glance">
            <li><a href="#/inventario?f=reponer"><strong>${plural(out.length, 'producto', 'productos')}</strong>agotados</a></li>
            <li><a href="#/inventario?f=reponer"><strong>${plural(low.length, 'producto', 'productos')}</strong>con 1 o 2 unidades</a></li>
            <li><a href="#/marketing?tab=catalogos"><strong>${plural(ferr, 'producto', 'productos')}</strong>con errores para anuncios</a></li>
            <li><a href="#/productos"><strong>${plural(HEADS.length, 'producto', 'productos')}</strong>en el catálogo</a></li></ul>`, '<a href="#/inventario">Ver inventario</a>', true)}
          ${top.length ? box('Origen de las ventas · 30 días', bars(top.slice(0, 6), a30.sales), '<a href="#/analitica">Detalle</a>', true) : ''}
          ${box('Conexiones', `<ul class="integ">${INTEG.map(([n, d, st, cls]) => `<li><div><b>${n}</b><div class="muted small">${d}</div></div><span class="st ${cls}">${st}</span></li>`).join('')}</ul>`, '<a href="#/ajustes">Ajustes</a>', true)}
        </div>
      </div>`;
  };
  V.dash.after = () => { if (!$('#c30')) return; const a = agg(30); lineChart($('#c30'), { label: 'Ventas diarias de los últimos 30 días', days: a.daily.map((d) => d.d), cur: a.daily.map((d) => d.v), cnt: a.daily.map((d) => d.n), h: 220 }); };
  const INTEG = [
    ['Bsale', 'Productos, precios, stock y boletas', 'Falta token', 'st-wait'],
    ['Klap', 'Pago con tarjetas, Google Pay y Apple Pay', 'Faltan credenciales', 'st-wait'],
    ['Sendu', 'Cotización y despacho', 'Por configurar', 'st-wait'],
    ['Google Analytics 4', 'Visitas, conversión y origen', 'Por conectar', 'st-off'],
    ['Meta (píxel y API de conversiones)', 'Eventos para anuncios', 'Por conectar', 'st-off'],
    ['Google Tag Manager', 'Contenedor actual de la tienda', 'Por conectar', 'st-off'],
    ['Catálogos Meta y Google Merchant', 'Productos para anuncios de catálogo', 'Se activan al publicar', 'st-wait'],
  ];

  V.pedidos = (q) => {
    if (!ORDERS.length) return `<div class="wrap-h"><h1>Pedidos</h1><a class="page-title-action" href="#/pedido/nuevo">Nuevo pedido</a></div>${emptyState('Aún no hay pedidos', 'Cuando la tienda esté conectada a Klap, cada compra pagada aparece aquí sola, con su boleta de Bsale y de dónde vino el cliente. Las ventas por WhatsApp, teléfono o en el local se registran a mano.', '<a class="button button-primary" href="#/pedido/nuevo">Registrar una venta</a>', 'list')}`;
    const st = q.get('estado') || '', s = (q.get('q') || '').trim(), src = q.get('origen') || '', mon = q.get('mes') || '', cid = +q.get('cliente') || 0;
    const page = Math.max(1, +q.get('pag') || 1), per = 20;
    const ns = deacc(s.toLowerCase());
    let list = ORDERS.filter((o) => (!src || o.src.k === src) && (!cid || o.c.id === cid) && (!mon || `${new Date(o.t).getFullYear()}-${p2(new Date(o.t).getMonth() + 1)}` === mon)
      && (!ns || String(o.id).includes(ns) || deacc(`${custName(o.c)} ${o.c.email} ${o.c.comuna} ${(o.doc && o.doc.folio) || ''}`.toLowerCase()).includes(ns)));
    const counts = {}; list.forEach((o) => (counts[o.st] = (counts[o.st] || 0) + 1));
    if (st) list = list.filter((o) => o.st === st);
    const months = [...new Set(ORDERS.map((o) => { const d = new Date(o.t); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`; }))];
    V.pedidos.last = list;
    const rows = list.slice((page - 1) * per, page * per);
    const base = '#/pedidos';
    const tabs = [['', 'Todos', Object.values(counts).reduce((a, b) => a + b, 0)], ...['pending', 'processing', 'completed', 'cancelled', 'refunded', 'failed'].map((k) => [k, ST[k], counts[k] || 0])].filter(([k, , n]) => !k || n);
    const c = cid && CUST.find((x) => x.id === cid);
    return `
      <div class="wrap-h"><h1>Pedidos</h1><a class="page-title-action" href="#/pedido/nuevo">Nuevo pedido</a><button class="button" data-act="csv-pedidos">Exportar a Excel (${miles(list.length)})</button></div>
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
          <td class="hide-m nw">${o.doc ? `${o.doc.type.split(' ')[0]}${o.doc.folio ? ` N° ${o.doc.folio}` : '<div class="muted small">folio de Bsale</div>'}` : '<span class="muted">—</span>'}</td>
          <td class="hide-m">${esc(o.ship.m.replace(' a domicilio', '').replace(' — Quinta Normal', ''))}<div class="muted small">${o.ship.cost ? clp(o.ship.cost) : 'Gratis'}</div></td>
          <td class="hide-m">${otag(o)}</td>
          <td class="num nw">${clp(o.total)}<div class="muted small">${esc(o.pay)}</div></td></tr>`).join('') : '<tr class="no-items"><td colspan="8">No se encontraron pedidos.</td></tr>'}</tbody>
        <tfoot><tr><td class="check"></td><th>Pedido</th><th class="hide-m">Fecha</th><th>Estado</th><th class="hide-m">Documento</th><th class="hide-m">Envío</th><th class="hide-m">Origen</th><th class="num">Total</th></tr></tfoot>
      </table>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>`;
  };

  V.pedido = (q, id) => {
    if (id === 'nuevo') return V.nuevoPedido();
    const o = oId.get(+id);
    if (!o) return `<div class="wrap-h"><h1>Pedido no encontrado</h1></div><p><a href="#/pedidos">Volver a pedidos</a></p>`;
    const c = o.c, paidNote = o.notes.find((n) => n.txt.startsWith('Klap aprobó'));
    const notes = [...o.notes].reverse();
    return `
      <div class="wrap-h no-print"><h1>Editar pedido</h1><button class="button" data-act="imprimir">Imprimir pedido</button><a class="button" href="https://wa.me/${c.phone.replace(/\D/g, '')}" target="_blank" rel="noopener" data-act="wa-cliente" data-id="${c.id}">WhatsApp al cliente</a></div>
      <div class="print-only print-head"><img src="/assets/logo.png" alt="" width="40" height="41"><div><b>Reycar Store · Pedido #${o.id}</b><br>${fFull(o.t)} · ${esc(o.ship.m)}</div></div>
      <div class="cols">
        <div>
          <div class="postbox"><div class="inside">
            <h2 style="font-size:24px;font-weight:800;font-stretch:88%;letter-spacing:-.01em;margin:0 0 4px">Detalles del pedido #${o.id}</h2>
            <p class="muted" style="margin:0 0 16px">${o.auth === 'LOCAL' ? 'Pagado en el local.' : o.auth ? `Pago con Klap (${esc(o.pay)}). Pagado el ${fFull(paidNote ? paidNote.t : o.t)}.` : o.doc ? `Pagado por ${esc(o.pay.toLowerCase())}.` : o.st === 'failed' ? 'Pago rechazado por Klap.' : o.st === 'on-hold' ? 'Esperando la transferencia.' : o.st === 'pending' && o.src === MANUAL ? 'Link de pago enviado; aún sin pagar.' : 'Aún sin pago.'} ${o.doc ? `${docTxt(o.doc)}.` : ''}${o.src === MANUAL ? ' Venta creada desde el panel.' : ''}</p>
            <div class="grid3">
              <div>
                <h3 style="font-size:14px;margin:0 0 10px">General</h3>
                <div class="field"><label for="fc">Fecha de creación</label><input type="text" id="fc" value="${fFull(o.t)}" disabled></div>
                <div class="field"><label for="ost">Estado</label><select id="ost">${Object.entries(ST).map(([k, l]) => `<option value="${k}"${k === o.st ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
                <div class="field"><span class="lbl">Cliente</span><a href="#/cliente/${c.id}">${esc(custName(c))}</a> · <a href="#/cliente/${c.id}">Ver ficha →</a></div>
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
              ${o.disc ? `<tr><td>Descuento${o.cpCode ? ` (${esc(o.cpCode)})` : ''}:</td><td>−${clp(o.disc)}</td></tr>` : ''}
              <tr><td>Envío:</td><td>${clp(o.ship.cost)}</td></tr>
              <tr class="grand"><td>Total del pedido:</td><td>${clp(o.total)}</td></tr>
              <tr><td class="muted">IVA incluido:</td><td class="muted">${clp(o.total - o.total / 1.19)}</td></tr>
              ${o.refunded ? `<tr><td style="color:var(--bad)">Reembolsado:</td><td style="color:var(--bad)">−${clp(o.refunded)}</td></tr>` : ''}
            </tbody></table>
            <div class="major-publishing-actions"><span class="muted small">Precios con IVA, tal como se cobraron.</span>${['processing', 'completed'].includes(o.st) && (o.refunded || 0) < o.total ? `<button class="button" data-act="reembolso" data-id="${o.id}">${o.refunded ? 'Otro reembolso' : 'Reembolso'}</button>` : ''}</div>
          </div></div>
        </div>
        <div>
          <div class="postbox"><h2 class="hndle">Acciones del pedido</h2><div class="inside">
            <select id="oact" style="width:100%" aria-label="Acción del pedido"><option value="">Elige una acción…</option><option>Enviar detalles del pedido al cliente</option><option>Reenviar ${o.fac ? 'factura' : 'boleta'} al cliente</option><option>Generar envío en Sendu</option><option>Emitir documento en Bsale de nuevo</option></select>
          </div><div class="major-publishing-actions"><button class="button-link-delete" data-act="papelera" data-id="${o.id}">Mover a la papelera</button><button class="button button-primary" data-act="guardar-pedido" data-id="${o.id}">Actualizar</button></div></div>
          ${box('Documento tributario', o.doc ? `<dl class="kv"><dt>Tipo</dt><dd>${o.doc.type}</dd><dt>Folio</dt><dd>${o.doc.folio ? `N° ${o.doc.folio}` : 'Lo asigna Bsale al emitir'}</dd>${(o.ncs || []).map((n) => `<dt>Nota de crédito</dt><dd>${n.f ? `N° ${n.f} · ` : ''}${clp(n.a)}</dd>`).join('')}<dt>Emitido</dt><dd>${o.src === MANUAL ? 'Desde el panel, al registrar el pago' : 'Automático, al aprobarse el pago'}</dd><dt>Stock</dt><dd>Descontado en Bsale</dd></dl><p style="margin:12px 0 0"><button class="button" data-act="pdf">Ver PDF en Bsale</button></p>` : `<p class="muted" style="margin:0">${o.st === 'on-hold' ? 'Se emite en Bsale cuando confirmes la transferencia (estado Procesando).' : 'Se emite automáticamente en Bsale cuando se paga.'}</p>`)}
          ${box('De dónde vino', `<dl class="kv"><dt>Origen</dt><dd>${otag(o)}</dd><dt>Tipo de origen</dt><dd>${o.src.type}</dd><dt>Fuente / medio</dt><dd>${esc(o.src.src)} / ${esc(o.src.med)}</dd>${o.camp ? `<dt>Campaña</dt><dd>${esc(o.camp)}</dd>` : ''}<dt>Página de entrada</dt><dd>${esc(o.landing)}</dd><dt>Dispositivo</dt><dd>${o.dev}</dd><dt>Páginas vistas</dt><dd>${o.pages}</dd></dl>`)}
          ${box('Historial del cliente', (() => { const all = ORDERS.filter((x) => x.c === c && PAID.has(x.st)); return `<dl class="kv"><dt>Pedidos pagados</dt><dd>${all.length}</dd><dt>Total gastado</dt><dd>${clp(all.reduce((s, x) => s + x.total, 0))}</dd><dt>Ticket promedio</dt><dd>${clp(all.length ? all.reduce((s, x) => s + x.total, 0) / all.length : 0)}</dd></dl>`; })())}
          ${box('Notas del pedido', `<ul class="notes" id="notes">${notes.map(noteHtml).join('')}</ul>
            <div class="field" style="margin-top:12px"><label for="nn">Añadir nota</label><textarea id="nn" rows="3"></textarea></div>
            <div style="display:flex;gap:6px"><select id="nk" aria-label="Tipo de nota" style="flex:1"><option value="private">Nota privada</option><option value="customer">Nota para el cliente</option></select><button class="button" data-act="nota" data-id="${o.id}">Añadir</button></div>`)}
        </div>
      </div>`;
  };
  V.pedido.after = (q, id) => { if (id === 'nuevo') V.nuevoPedido.after(); };
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
      <div class="notice"><p><b>Todo se edita aquí.</b> Nombre, precio y stock se sincronizan con Bsale en ambos sentidos: lo que cambies se actualiza en Bsale, y las ventas del local se reflejan aquí.</p></div>
      <ul class="subsubsub">${[['', 'Todos'], ['dest', 'Destacados'], ['ocultos', 'Ocultos']].map(([k, l]) => `<li><a href="${href(base, q, { ver: k, pag: '' })}" class="${vis === k ? 'current' : ''}">${l} <span class="n">(${miles(cnt[k])})</span></a></li>`).join('')}</ul>
      <form class="tablenav" data-form="productos">
        <select name="cat" aria-label="Filtrar por categoría"><option value="">Todas las categorías</option>${GROUPS.map((x) => `<option value="${x.id}"${x.id === g ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <select name="marca" aria-label="Filtrar por marca"><option value="">Todas las marcas</option>${brands.map((x) => `<option${x === b ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>
        <select name="stock" aria-label="Filtrar por stock"><option value="">Cualquier stock</option><option value="hay"${stk === 'hay' ? ' selected' : ''}>Hay existencias</option><option value="bajo"${stk === 'bajo' ? ' selected' : ''}>Pocas unidades</option><option value="agotado"${stk === 'agotado' ? ' selected' : ''}>Agotado</option></select>
        <button class="button" type="submit">Filtrar</button>
        <select name="pbulk" aria-label="Acciones en lote" class="hide-m"><option value="">Acciones en lote</option><option value="show">Mostrar en la tienda</option><option value="hide">Ocultar de la tienda</option><option value="feat">Destacar en la portada</option><option value="unfeat">Quitar de destacados</option><optgroup label="Mover a la categoría">${GROUPS.map((x) => `<option value="g:${x.id}">${esc(x.name)}</option>`).join('')}</optgroup></select><button class="button hide-m" type="button" data-act="pbulk">Aplicar</button>
        <span class="search-box"><label class="screen-reader-text" for="ps">Buscar productos</label><input type="search" id="ps" name="q" value="${esc(q.get('q') || '')}" placeholder="Nombre, marca o SKU"><button class="button" type="submit">Buscar productos</button></span>
      </form>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>
      <table class="wp-list-table">
        <thead><tr><td class="check hide-m"><input type="checkbox" aria-label="Seleccionar todos" data-all></td><th style="width:60px"><span class="screen-reader-text">Foto</span></th><th>Nombre</th><th class="hide-m">SKU</th><th>Stock</th><th class="num">Precio</th><th class="hide-m">Categorías</th><th class="hide-m">Marca</th><th class="hide-m" title="Destacado">★</th></tr></thead>
        <tbody>${rows.length ? rows.map((p) => `<tr>
          <th class="check hide-m" scope="row"><input type="checkbox" value="${p.id}" aria-label="Seleccionar ${esc(p.n)}"></th>
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
    if (id === 'nuevo') return V.nuevoProducto();
    let p = byId.get(+id);
    if (!p) return `<div class="wrap-h"><h1>Producto no encontrado</h1></div><p><a href="#/productos">Volver a productos</a></p>`;
    if (p.fam && p.fam !== p.id) p = byId.get(p.fam);
    const vs = p.vs || [p], sm = seo.get(p.id) || { t: `${p.n} - Reycars Store`, d: String(p.d || '').replace(/\s+/g, ' ').replace(/^.{0,60}?descripci[oó]n\s*:?\s*/i, '').slice(0, 155) };
    const sold = ORDERS.filter((o) => PAID.has(o.st) && o.lines.some((l) => vs.includes(l.p)));
    return `
      <div class="wrap-h"><h1>Editar producto</h1><a class="page-title-action" href="#/producto/nuevo">Añadir nuevo</a></div>
      <div class="cols">
        <div>
          <label class="screen-reader-text" for="pt">Nombre</label><input type="text" id="pt" class="title-input" value="${esc(p.n)}" maxlength="150">
          <p class="muted small" style="margin:-10px 0 14px">El nombre también se actualiza en Bsale · Enlace permanente: <a href="/producto/${p.s}" target="_blank" rel="noopener">reycarstore.cl/producto/${esc(p.s)}</a></p>
          ${box('Descripción', `<textarea rows="9" aria-label="Descripción">${esc(p.d || '')}</textarea>`)}
          <div class="postbox"><h2 class="hndle">Datos del producto <span class="act muted">${plural(sold.length, 'venta', 'ventas')} en 180 días</span></h2><div class="inside flush"><div class="pdata">
            <div class="tabs" role="tablist">${['General', 'Inventario', 'Formatos', 'Envío'].map((t, i) => `<button role="tab" aria-selected="${!i}" data-tab="${i}">${t}</button>`).join('')}</div>
            <div class="panel" data-panel="0"><div class="grid2"><div class="field"><label for="pp">Precio normal con IVA ($)</label><input type="number" id="pp" min="0" step="10" value="${p.p}"${vs.length > 1 ? ' disabled' : ''}></div><div class="field"><label for="po">Precio de oferta ($)</label><input type="number" id="po" min="0" step="10" placeholder="Sin oferta" value="${p.po || ''}"></div>
              <div class="field"><label for="pod">Oferta desde</label><input type="date" id="pod" value="${p.pod || ''}"></div><div class="field"><label for="poh">Oferta hasta</label><input type="date" id="poh" value="${p.poh || ''}"></div></div><p class="muted small" style="margin:0">Al guardar se actualiza la lista de precios web de Bsale y los catálogos de Meta y Google. ${vs.length > 1 ? 'Cada formato tiene su precio: se cambia en la pestaña Formatos.' : ''}</p></div>
            <div class="panel" data-panel="1" hidden><dl class="kv"><dt>SKU</dt><dd>${esc(p.sku || '—')}</dd><dt>Stock</dt><dd>${vs.length > 1 ? vs.map((v) => `${esc(fmtOf(v, p))}: ${v.stk ?? '—'}`).join(' · ') : stockCell(p)}</dd><dt>Sucursal</dt><dd>Casa Matriz (Quinta Normal)</dd><dt>Sincronizado</dt><dd>Hace menos de 1 minuto</dd></dl><p style="margin:12px 0"><button class="button" data-act="stock-adj" data-id="${p.id}">Ajustar stock</button></p>${(p.mov || []).length ? `<table class="mini"><thead><tr><td><b>Fecha</b></td><td><b>Movimiento</b></td><td class="num"><b>Stock</b></td></tr></thead><tbody>${p.mov.slice(0, 8).map((m) => `<tr><td class="nw">${fFull(m.t)}</td><td>${{ in: 'Ingreso', out: 'Salida', set: 'Corrección' }[m.type]} ${m.type === 'set' ? '' : m.n}${m.v ? ` · ${esc(m.v)}` : ''}${m.r ? `<div class="muted small">${esc(m.r)} · ${esc(m.by)}</div>` : ''}</td><td class="num nw">${m.before} → <b>${m.after}</b></td></tr>`).join('')}</tbody></table>` : '<p class="muted small" style="margin:0">El stock baja solo con cada venta (web o local). Los ingresos de mercadería y mermas se registran con "Ajustar stock".</p>'}</div>
            <div class="panel" data-panel="2" hidden><p class="muted small" style="margin-top:0">Los formatos se muestran como un solo producto en la tienda, con selector (1 L, 5 L…).</p><table class="items"><thead><tr><th>Formato</th><th>SKU</th><th class="num">Precio</th><th>Stock</th></tr></thead><tbody>${vs.map((v) => `<tr><td>${esc(fmtOf(v, p))}</td><td>${esc(v.sku || '—')}</td><td class="num"><input type="number" data-vp="${v.id}" value="${v.p}" min="0" step="10" style="width:110px;min-height:32px" aria-label="Precio de ${esc(v.n)}"></td><td>${stockCell(v)}</td></tr>`).join('')}</tbody></table><p><button class="button" data-act="unir">Unir otro formato…</button></p></div>
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
    if (!CUST.length) return `<div class="wrap-h"><h1>Clientes</h1></div>${emptyState('Aún no hay clientes', 'Cada persona que compra en la tienda, por WhatsApp o reserva en el taller queda aquí con su historial, sus permisos de contacto y su ficha.', '<a class="button" href="#/pedido/nuevo">Registrar una venta</a>', 'user')}`;
    const m = new Map(CUST.map((c) => [c, { c, n: 0, v: 0, last: c.since || 0 }]));
    ORDERS.forEach((o) => { const x = m.get(o.c) || { c: o.c, n: 0, v: 0, last: 0 }; if (PAID.has(o.st)) { x.n++; x.v += o.total; } x.last = Math.max(x.last, o.t); m.set(o.c, x); });
    const sg = q.get('seg') || '';
    let list = [...m.values()].filter((x) => !s || deacc(`${custName(x.c)} ${x.c.email} ${x.c.comuna} ${x.c.emp ? x.c.emp.name : ''} ${x.c.tags.join(' ')}`.toLowerCase()).includes(s));
    const segCnt = {}; list.forEach((x) => { const k = segOf(x.c); segCnt[k] = (segCnt[k] || 0) + 1; });
    if (sg) list = list.filter((x) => segOf(x.c) === sg);
    list.sort((a, b) => (sort === 'reciente' ? b.last - a.last : sort === 'pedidos' ? b.n - a.n || b.v - a.v : b.v - a.v));
    V.clientes.last = list;
    const rows = list.slice((page - 1) * per, page * per);
    const rep = [...m.values()].filter((x) => x.n > 1).length;
    return `
      <div class="wrap-h"><h1>Clientes</h1><button class="button" data-act="csv-clientes">Exportar a Excel</button></div>
      <div class="tiles">${tile('Clientes', miles(m.size), 'con pedidos o reservas')}${tile('Compraron más de una vez', miles(rep), `${Math.round((rep / m.size) * 100)} % del total`)}${tile('Gasto promedio por cliente', clp([...m.values()].reduce((a, x) => a + x.v, 0) / m.size), 'pedidos pagados, con IVA')}${tile('Con factura', miles([...m.values()].filter((x) => x.c.emp).length), 'empresas con RUT y giro')}</div>
      <ul class="subsubsub">${[['', 'Todos', Object.values(segCnt).reduce((a, b) => a + b, 0)], ...Object.entries(SEGS).filter(([k]) => segCnt[k]).map(([k, [l]]) => [k, l, segCnt[k]])].map(([k, l, n]) => `<li><a href="${href(base, q, { seg: k, pag: '' })}" class="${sg === k ? 'current' : ''}">${l} <span class="n">(${n})</span></a></li>`).join('')}</ul>
      <form class="tablenav" data-form="clientes">
        <select name="orden" aria-label="Ordenar"><option value="gasto">Mayor gasto</option><option value="pedidos"${sort === 'pedidos' ? ' selected' : ''}>Más pedidos</option><option value="reciente"${sort === 'reciente' ? ' selected' : ''}>Compra más reciente</option></select><button class="button" type="submit">Ordenar</button>
        <span class="search-box"><label class="screen-reader-text" for="cs">Buscar clientes</label><input type="search" id="cs" name="q" value="${esc(q.get('q') || '')}" placeholder="Nombre, correo, comuna o empresa"><button class="button" type="submit">Buscar</button></span>
      </form>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>
      <table class="wp-list-table"><thead><tr><th>Nombre</th><th class="hide-m">Segmento</th><th class="hide-m">Comuna</th><th class="num">Pedidos</th><th class="num">Gasto total</th><th class="hide-m">Último pedido</th></tr></thead>
      <tbody>${rows.length ? rows.map((x) => `<tr class="clickable" data-go="#/cliente/${x.c.id}"><td><a class="row-title" href="#/cliente/${x.c.id}">${esc(custName(x.c))}</a><div class="muted small">${esc(x.c.email)}${x.c.emp ? ` · ${esc(x.c.emp.name)}` : ''}</div></td><td class="hide-m">${pillOf(SEGS[segOf(x.c)])}</td><td class="hide-m">${esc(x.c.comuna)}</td><td class="num">${x.n}</td><td class="num">${clp(x.v)}</td><td class="hide-m">${ago(x.last)}</td></tr>`).join('') : '<tr class="no-items"><td colspan="6">No se encontraron clientes.</td></tr>'}</tbody></table>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>`;
  };

  V.analitica = (q) => {
    const tab = q.get('tab') || 'resumen';
    if (tab !== 'resumen' && AN[tab]) return AN[tab](q);
    if (!ORDERS.some((o) => PAID.has(o.st) || o.st === 'refunded')) return `<div class="wrap-h"><h1>Analítica</h1></div>${anNav('resumen')}${emptyState('Todavía no hay ventas para analizar', 'Aquí verás ventas por día, por origen (anuncios, Google, Instagram, WhatsApp…), por categoría y los productos más vendidos, comparados con el período anterior.', '<a class="button" href="#/pedido/nuevo">Registrar una venta</a>', 'chart')}`;
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
      <div class="wrap-h"><h1>Analítica</h1>${seg('r', [[7, '7 días'], [30, '30 días'], [90, '90 días']], r)}</div>${anNav('resumen')}
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
      <div class="notice"><p>Las visitas y búsquedas están en <a href="#/analitica?tab=trafico">Tráfico y búsquedas</a>; el retorno de cada campaña en <a href="#/marketing">Marketing</a>; y el resumen mensual para el contador en <a href="#/analitica?tab=informe">Informe de ventas</a>.</p></div>`;
  };
  V.analitica.after = (q) => {
    const el = $('#cday'); if (!el || (q.get('tab') && q.get('tab') !== 'resumen')) return;
    const r = [7, 30, 90].includes(+q.get('r')) ? +q.get('r') : 30, a = agg(r), b = agg(r, r);
    lineChart(el, { label: `Ventas diarias, últimos ${r} días, comparado con el período anterior`, days: a.daily.map((d) => d.d), pdays: b.daily.map((d) => d.d), cur: a.daily.map((d) => d.v), prev: b.daily.map((d) => d.v), cnt: a.daily.map((d) => d.n), h: 260 });
  };

  const REDIR = [['/shop', '/tienda', 301], ['/tienda-online', '/tienda', 301], ['/categoria-producto/…', '/tienda', 301], ['/marca/motor-clean', '/motor-clean', 301], ['/marca/…', '/marcas', 301], ['/servicios/…', '/asesoria', 301], ['/nuestra-historia', '/', 301], ['/contacto', '/#contacto', 301], ['/my-account/…', '/', 302], ['/cart', '/', 302], ['/checkout', '/', 302]];
  V.seo = (q) => {
    const tab = q.get('tab') || 'redir';
    const tabs = [['redir', 'Redirecciones'], ['sitemap', 'Mapa del sitio'], ['titulos', 'Títulos y metas']];
    let body = '';
    if (tab === 'redir') body = `<p><button class="button" data-act="nueva-redir">Añadir nueva</button></p><table class="wp-list-table"><thead><tr><th>Dirección antigua</th><th>Lleva a</th><th>Tipo</th></tr></thead><tbody>${REDIR.map(([a, b, t]) => `<tr><td><code>${esc(a)}</code></td><td><code>${esc(b)}</code></td><td>${t === 301 ? '301 permanente' : '302 temporal'}</td></tr>`).join('')}</tbody></table><p class="muted small">Las direcciones de productos se mantienen iguales que en el sitio actual (/producto/nombre), así no se pierde el posicionamiento ni se rompen los anuncios.</p>`;
    if (tab === 'sitemap') body = `<table class="form-table"><tbody><tr><th>Mapa del sitio</th><td><a href="/sitemap.xml" target="_blank" rel="noopener">/sitemap.xml</a><p class="description">Se genera solo con cada cambio de catálogo: secciones, categorías, subcategorías y un enlace por producto.</p></td></tr><tr><th>Google Search Console</th><td><span class="st-wait">Por conectar</span><p class="description">Se envía el mapa del sitio y se ven aquí las búsquedas que traen visitas.</p></td></tr><tr><th>Productos agotados</th><td><label class="switch"><input type="checkbox" checked> Mantener su página visible con "Agotado"</label><p class="description">Recomendado: conserva el posicionamiento y los anuncios mientras vuelve el stock.</p></td></tr></tbody></table>`;
    if (tab === 'titulos') body = `<table class="form-table"><tbody><tr><th><label for="t1">Título de productos</label></th><td><input type="text" id="t1" value="%nombre% - Reycars Store"><p class="description">Igual que hoy en Rank Math. Cada producto puede tener el suyo.</p></td></tr><tr><th><label for="t2">Título de categorías</label></th><td><input type="text" id="t2" value="%categoria% - Reycars Store"></td></tr><tr><th><label for="t3">Imagen al compartir</label></th><td>Foto principal del producto<p class="description">Es la que muestran WhatsApp, Facebook e Instagram al compartir un enlace.</p></td></tr></tbody></table><p><button class="button button-primary" data-act="guardar">Guardar cambios</button></p>`;
    return `<div class="wrap-h"><h1>SEO</h1></div><nav class="nav-tab-wrapper">${tabs.map(([k, l]) => `<a class="nav-tab${k === tab ? ' nav-tab-active' : ''}" href="#/seo?tab=${k}">${l}</a>`).join('')}</nav>${body}`;
  };

  V.usuarios = () => `
    <div class="wrap-h"><h1>Usuarios</h1><button class="page-title-action" data-act="nuevo-usuario">Añadir nuevo</button></div>
    <table class="wp-list-table"><thead><tr><th>Nombre de usuario</th><th>Nombre</th><th class="hide-m">Correo</th><th>Perfil</th><th class="hide-m">Último acceso</th></tr></thead><tbody>
      <tr><td><span class="av" style="margin-right:10px;width:30px;height:30px;font-size:13px">G</span><a class="row-title" href="#/usuarios">guillermo</a></td><td>Guillermo Araya</td><td class="hide-m"><span class="muted">Se define al activar el acceso</span></td><td>Administrador</td><td class="hide-m">Sesión actual</td></tr>
    </tbody></table>
    <div class="dash" style="margin-top:20px">
      ${box('Qué puede hacer cada perfil', `<div style="overflow-x:auto"><table class="mini perms"><thead><tr><td><b>Área</b></td><td class="num"><b>Administrador</b></td><td class="num"><b>Gestor de la tienda</b></td><td class="num"><b>Despacho y taller</b></td></tr></thead><tbody>${PERMS.map(([a, ...r], i) => `<tr><td>${a}</td>${r.map((v, j) => `<td class="num"><input type="checkbox"${v ? ' checked' : ''}${j === 0 ? ' disabled' : ''} aria-label="${a}: ${['Administrador', 'Gestor de la tienda', 'Despacho y taller'][j]}"></td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="major-publishing-actions"><span class="muted small">El administrador siempre tiene todo.</span><button class="button" data-act="guardar">Guardar permisos</button></div>`, '', true)}
      ${box('Seguridad', '<dl class="kv"><dt>Inicio de sesión</dt><dd>Correo y contraseña, con código de verificación en dos pasos.</dd><dt>Intentos fallidos</dt><dd>Bloqueo temporal tras 5 intentos (como Loginizer hoy).</dd><dt>Registro</dt><dd>Queda anotado quién hizo cada cambio: <a href="#/actividad">ver registro</a>.</dd><dt>Sesiones</dt><dd>Se cierran solas tras 12 horas sin uso.</dd></dl>')}
    </div>`;

  V.ajustes = (q) => {
    const tab = q.get('tab') || 'general';
    const tabs = [['general', 'General'], ['pagos', 'Pagos (Klap)'], ['envios', 'Envíos (Sendu)'], ['bsale', 'Bsale'], ['seguimiento', 'Seguimiento y anuncios'], ['correos', 'Correos al cliente'], ['privacidad', 'Privacidad y datos']];
    // los campos sin etiqueta propia toman el nombre de la fila (para lectores de pantalla)
    const row = (l, inner, d = '') => { const nm = esc(String(l).replace(/<[^>]+>/g, '')); return `<tr><th>${l}</th><td>${inner.replace(/<(select|input)(?![^>]*type="(?:checkbox|radio)")(?![^>]*\b(?:id|aria-label)=)/g, `<$1 aria-label="${nm}"`)}${d ? `<p class="description">${d}</p>` : ''}</td></tr>`; };
    const secret = (id, ph) => `<input type="password" id="${id}" placeholder="${ph}" autocomplete="off">`;
    const B = {
      general: row('Nombre de la tienda', '<input type="text" value="Reycar Store">') + row('Dirección', '<input type="text" value="Quinta Normal, Región Metropolitana">', 'Aparece en el pie de página y en la opción de retiro en tienda.') + row('WhatsApp de atención', '<input type="text" value="+56 9 6355 5437">') + row('Correo de avisos de pedidos', '<input type="text" placeholder="ventas@…">', 'Recibe un aviso por cada pedido pagado.'),
      pagos: row('Estado', '<span class="st-wait">Faltan credenciales de Klap</span>', 'Klap entrega primero las credenciales de prueba; con ellas se prueba el pago completo antes de cobrar de verdad.') + row('Modo', '<select><option>Pruebas (sandbox)</option><option>Producción</option></select>') + row('<label for="kk">Clave de la API (apikey)</label>', secret('kk', 'Se guarda cifrada en el servidor'), 'Nunca se muestra después de guardarla ni se envía al navegador.') + row('Medios de pago', '<label class="switch"><input type="checkbox" checked> Tarjetas de crédito y débito</label><br><label class="switch"><input type="checkbox" checked> Google Pay</label><br><label class="switch"><input type="checkbox" checked> Apple Pay</label>') + row('Pedido sin pagar', '<select><option>Cancelar a los 60 minutos</option><option>Cancelar a las 24 horas</option></select>', 'Mientras tanto el producto no se descuenta del stock.'),
      envios: row('Estado', '<span class="st-wait">Por configurar</span>') + row('<label for="sk">Token de Sendu</label>', secret('sk', 'Se guarda cifrado en el servidor')) + row('Couriers', '<label class="switch"><input type="checkbox" checked> Starken</label><br><label class="switch"><input type="checkbox" checked> Chilexpress</label><br><label class="switch"><input type="checkbox" checked> Blue Express</label>') + row('Retiro en tienda', '<label class="switch"><input type="checkbox" checked> Ofrecer retiro gratis en Quinta Normal</label>') + row('Envío gratis', '<input type="text" placeholder="Monto mínimo, ej. 60.000">', 'Vacío = sin envío gratis.') + row('Tarifas propias', `<div style="overflow-x:auto"><table class="mini zones"><thead><tr><td><b>Zona</b></td><td><b>Regiones</b></td><td class="num"><b>Tarifa ($)</b></td><td><b>Plazo</b></td></tr></thead><tbody>${ZONES.map(([z, r, t, d], i) => `<tr><td><b>${z}</b></td><td class="muted small">${r}</td><td class="num"><input type="number" value="${t}" step="10" min="0" style="width:96px;min-height:32px" aria-label="Tarifa ${z}"></td><td><input type="text" value="${d}" style="width:150px;min-height:32px" aria-label="Plazo ${z}"></td></tr>`).join('')}</tbody></table></div>`, 'Se usan si el cotizador de Sendu no responde, y para mostrar el plazo de entrega en la ficha del producto.'),
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
    const sold = new Map(), sales = agg(30).list;
    sales.forEach((o) => o.lines.forEach((l) => sold.set(l.p, (sold.get(l.p) || 0) + l.q)));
    return ALL.filter((p) => p.p > 0 && !['cursos', 'servicios'].includes(p.g)).map((p) => {
      const u = sold.get(p) || 0, per = u / 30, days = p.stk == null || !per ? Infinity : p.stk / per;
      const st = p.stk === 0 ? 'out' : p.stk == null ? 'free' : per && days <= 14 ? 'now' : per && days <= 30 ? 'soon' : p.stk <= 2 ? 'low' : 'ok';
      return { p, u, days, st, sug: per ? Math.max(0, Math.ceil(per * 45 - (p.stk || 0))) : 0 };
    });
  }
  const INV_ST = { out: ['Agotado', 'failed'], now: ['Reponer ya', 'failed'], soon: ['Reponer pronto', 'processing'], low: ['Stock bajo', 'processing'], ok: ['Con stock', 'completed'], free: ['Sin control de stock', 'cancelled'] };
  V.inventario = (q) => {
    const f = q.get('f') || 'reponer', page = Math.max(1, +q.get('pag') || 1), per = 25, base = '#/inventario';
    const all = invRows(), cnt = (...k) => all.filter((x) => k.includes(x.st)).length, hasSales = all.some((x) => x.u);
    let list = f === 'reponer' ? all.filter((x) => ['out', 'now', 'soon', 'low'].includes(x.st)) : all;
    list.sort((a, b) => a.days - b.days || (a.p.stk ?? 99) - (b.p.stk ?? 99) || b.u - a.u);
    V.inventario.last = list;
    const rows = list.slice((page - 1) * per, page * per);
    return `
      <div class="wrap-h"><h1>Inventario y reposición</h1><button class="button" data-act="csv-inventario">Exportar para el proveedor</button></div>
      <div class="notice"><p>Stock real de cada producto y formato. ${hasSales ? 'Con las ventas de los últimos 30 días se calcula para cuántos días alcanza y cuánto pedir para cubrir 45 días.' : 'Cuando haya ventas, aquí también se calcula para cuántos días alcanza el stock y cuánto conviene pedir.'}</p></div>
      <div class="tiles">${tile('Agotados', miles(cnt('out')), 'sin stock')}${tile('Stock bajo', miles(cnt('low', 'now', 'soon')), hasSales ? 'por ventas o con 1–2 unidades' : 'con 1 o 2 unidades')}${tile('Con stock', miles(cnt('ok')), 'sin problemas')}${tile('Sin control de stock', miles(cnt('free')), 'se venden sin límite')}</div>
      <ul class="subsubsub">${[['reponer', 'Por reponer', cnt('out', 'now', 'soon', 'low')], ['todos', 'Todos', all.length]].map(([k, l, n]) => `<li><a href="${href(base, q, { f: k, pag: '' })}" class="${f === k ? 'current' : ''}">${l} <span class="n">(${miles(n)})</span></a></li>`).join('')}</ul>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>
      <table class="wp-list-table"><thead><tr><th style="width:60px"><span class="screen-reader-text">Foto</span></th><th>Producto</th><th class="hide-m">SKU</th><th class="num">Stock</th>${hasSales ? '<th class="num hide-m">Vendidos 30 días</th><th class="num">Alcanza para</th>' : ''}<th class="hide-m">Estado</th>${hasSales ? '<th class="num hide-m">Sugerido pedir</th>' : ''}</tr></thead>
      <tbody>${rows.length ? rows.map((x) => `<tr><td><img class="thumb" src="${img(x.p)}" alt="" loading="lazy"></td><td><a class="row-title" href="#/producto/${x.p.fam || x.p.id}">${esc(x.p.n)}</a><div class="muted small">${esc(x.p.b || '')}<span class="show-m"> · ${INV_ST[x.st][0]}</span></div></td><td class="hide-m">${esc(x.p.sku || '—')}</td><td class="num">${x.p.stk == null ? '—' : x.p.stk}</td>${hasSales ? `<td class="num hide-m">${x.u}</td><td class="num nw">${x.days === Infinity ? '<span class="muted">—</span>' : plural(Math.max(0, Math.round(x.days)), 'día', 'días')}</td>` : ''}<td class="hide-m">${pillOf(INV_ST[x.st])}</td>${hasSales ? `<td class="num hide-m">${x.sug ? `<b>${x.sug}</b>` : '—'}</td>` : ''}</tr>`).join('') : '<tr class="no-items"><td colspan="8">Nada por reponer.</td></tr>'}</tbody></table>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>`;
  };
  const fmtOf = (v, p) => (v.n.match(/\d+(?:[.,]\d+)?\s?(?:ml|cc|l|lt|lts|litros?|gr?|kg|galón|gal)\b/i) || [v === p ? 'Principal' : 'Formato'])[0];
  const pillOf = ([l, cls]) => `<mark class="order-status status-${cls}"><span>${l}</span></mark>`;

  /* ───────── marketing ───────── */
  const FEED_ERR = (p) => { const e = []; if (!p.im || !p.im.length) e.push('Sin foto'); if (!String(p.d || (p.fam && byId.get(p.fam).d) || '').trim()) e.push('Sin descripción'); return e; };
  const FEED_WARN = (p) => { const w = []; if (!p.b) w.push('Sin marca'); if (p.sku && !/^\d{8,14}$/.test(p.sku)) w.push('SKU no es código de barras'); return w; };
  V.marketing = (q) => {
    const tab = q.get('tab') || 'anuncios';
    const tabs = [['anuncios', 'Anuncios'], ['cupones', 'Cupones'], ['correos', 'Correos'], ['carritos', 'Carritos abandonados'], ['catalogos', 'Catálogos'], ['pixel', 'Píxel y eventos']];
    const head = `<div class="wrap-h"><h1>Marketing</h1>${tab === 'anuncios' ? segR(q) : ''}</div><nav class="nav-tab-wrapper">${tabs.map(([k, l]) => `<a class="nav-tab${k === tab ? ' nav-tab-active' : ''}" href="#/marketing?tab=${k}">${l}</a>`).join('')}</nav>`;
    return head + (MK[tab] || MK.anuncios)(q);
  };
  V.marketing.after = (q) => { if (q.get('tab') === 'correos') drawMail(); };
  const rangeOf = (q) => ([7, 30, 90].includes(+q.get('r')) ? +q.get('r') : 30);
  const segR = (q) => `<span class="seg" role="group">${[[7, '7 días'], [30, '30 días'], [90, '90 días']].map(([v, l]) => `<button type="button" data-q="r=${v}" aria-pressed="${v === rangeOf(q)}">${l}</button>`).join('')}</span>`;
  const x1 = (n) => `${n.toFixed(1).replace('.', ',')}×`;
  const MK = {};
  MK.anuncios = (q) => {
    const r = rangeOf(q), a = agg(r), ads = a.list.filter((o) => o.src.cls === 'ads');
    const byCamp = groupBy(ads, (o) => `${o.src.lbl}|${o.camp || 'Sin campaña'}`);
    return `
      ${emptyState('Conecta Meta Ads y Google Ads', 'Con las cuentas conectadas, aquí ves cuánto se invirtió en cada campaña, cuántos pedidos pagados trajo y el retorno (ROAS) calculado con las ventas reales de la tienda, no con lo que estima cada plataforma.', '<a class="button button-primary" href="#/ajustes?tab=seguimiento">Ir a Seguimiento y anuncios</a>', 'link')}
      ${byCamp.length ? box('Pedidos que llegaron desde anuncios', `<table class="mini"><tbody>${byCamp.map((x) => { const [pl, c] = x.l.split('|'); return `<tr><td>${esc(c)}<div class="muted small">${esc(pl)}</div></td><td class="num">${plural(x.n, 'pedido', 'pedidos')}</td><td class="num">${clp(x.v)}</td></tr>`; }).join('')}</tbody></table>`, 'según UTM', true) : ''}`;
  };
  MK.cupones = () => {
    const act = COUPONS.filter((c) => cpState(c)[0] === 'Activo'), withCp = ORDERS.filter((o) => o.cpCode && PAID.has(o.st));
    const best = COUPONS.slice().sort((a, b) => b.uses - a.uses)[0];
    return `
      <div class="tiles">${tile('Cupones activos', miles(act.length), `de ${plural(COUPONS.length, 'creado', 'creados')}`)}${tile('Usos', miles(COUPONS.reduce((s, c) => s + c.uses, 0)), 'pedidos con cupón')}${tile('Ventas con cupón', clp(withCp.reduce((s, o) => s + o.total, 0)), 'pedidos pagados')}${tile('Más usado', best && best.uses ? esc(best.code) : '—', best && best.uses ? plural(best.uses, 'uso', 'usos') : 'aún sin usos')}</div>
      ${COUPONS.length ? `<table class="wp-list-table"><thead><tr><th>Código</th><th>Descuento</th><th class="hide-m">Aplica a</th><th class="hide-m">Compra mínima</th><th class="num">Usos</th><th class="hide-m">Vigencia</th><th>Estado</th></tr></thead><tbody>
      ${COUPONS.map((c) => `<tr><td><code>${esc(c.code)}</code></td><td>${cpVal(c)}</td><td class="hide-m">${esc(c.scope)}</td><td class="hide-m">${c.min ? clp(c.min) : '—'}</td><td class="num">${c.uses}${c.limit ? ` / ${c.limit}` : ''}</td><td class="hide-m">${c.to ? `${fDay(c.from)} – ${fDate(c.to)}` : `Desde ${fDate(c.from)}`}</td><td>${pillOf(cpState(c))}</td></tr>`).join('')}
      </tbody></table>` : box('Cupones', emptyState('Aún no hay cupones', 'Crea el primero aquí abajo. Sirve para campañas como CyberDay o para clientes del taller, y se puede limitar por monto mínimo, fechas y cantidad de usos.', '', 'list'), '', true)}
      <div class="postbox" style="margin-top:20px"><h2 class="hndle">Crear cupón</h2><div class="inside"><div class="fgrid">
        <div class="field"><label for="cc">Código</label><input type="text" id="cc" placeholder="EJ: VERANO20" style="text-transform:uppercase" maxlength="20"></div>
        <div class="field"><label for="ct">Tipo de descuento</label><select id="ct"><option value="pct">Porcentaje</option><option value="fix">Monto fijo</option><option value="ship">Envío gratis</option></select></div>
        <div class="field"><label for="cv">Valor</label><input type="number" id="cv" min="0" placeholder="10"></div>
        <div class="field"><label for="cm">Compra mínima ($)</label><input type="number" id="cm" min="0" placeholder="Sin mínimo"></div>
        <div class="field"><label for="cl">Límite de usos</label><input type="number" id="cl" min="0" placeholder="Sin límite"></div>
        <div class="field"><label for="cs2">Aplica a</label><select id="cs2"><option>Toda la tienda</option><option>Solo primera compra</option><option>Solo productos Motor Clean</option><option>Clientes del taller</option></select></div>
        <div class="field"><label for="cf">Desde</label><input type="date" id="cf"></div>
        <div class="field"><label for="cto">Hasta</label><input type="date" id="cto"></div>
      </div><p class="muted small" style="margin:0 0 12px">El descuento aparece como línea aparte en la boleta o factura de Bsale.</p><button class="button button-primary" data-act="crear-cupon">Crear cupón</button></div></div>`;
  };
  MK.carritos = (q) => {
    if (!CARTS.length) return emptyState('Sin carritos abandonados', 'Cuando alguien deja su correo o teléfono en el pago y no termina la compra, aparece aquí con lo que llevaba. Se le puede enviar un recordatorio con el carro listo para pagar, solo si aceptó recibir mensajes.', '', 'list');
    const f = q.get('f') || '', base = '#/marketing';
    const list = CARTS.filter((c) => !f || c.st === f);
    const known = CARTS.filter((c) => c.st !== 'anon'), rec = CARTS.filter((c) => c.st === 'rec');
    return `
      <div class="tiles">${tile('Carritos abandonados', miles(CARTS.length), 'últimos 14 días')}${tile('Valor en carritos', clp(CARTS.reduce((s, c) => s + c.total, 0)), 'lo que quedó sin pagar')}${tile('Se pueden recuperar', miles(known.length), 'dejaron correo o teléfono')}${tile('Recuperados', miles(rec.length), `${known.length ? Math.round((rec.length / known.length) * 100) : 0} % · ${clp(rec.reduce((s, c) => s + c.total, 0))}`)}</div>
      <ul class="subsubsub">${[['', 'Todos', CARTS.length], ...Object.entries(CART_ST).map(([k, [l]]) => [k, l, CARTS.filter((c) => c.st === k).length])].map(([k, l, n]) => `<li><a href="${href(base, q, { f: k })}" class="${f === k ? 'current' : ''}">${l} <span class="n">(${n})</span></a></li>`).join('')}</ul>
      <div class="tablenav"><button class="button" data-act="recordar-todos">Enviar recordatorio a todos los pendientes</button></div>
      <table class="wp-list-table"><thead><tr><th>Cliente</th><th class="hide-m">Productos</th><th class="num">Total</th><th class="hide-m">Etapa</th><th class="hide-m">Origen</th><th>Estado</th></tr></thead><tbody>
      ${list.map((c) => `<tr><td>${c.c ? `<b>${esc(custName(c.c))}</b><div class="muted small">${esc(c.c.email)}</div>` : '<span class="muted">Visitante sin datos</span>'}<div class="muted small">${ago(c.t)}</div></td><td class="hide-m">${esc(c.lines[0].p.n.slice(0, 48))}${c.lines.length > 1 ? ` y ${c.lines.length - 1} más` : ''}</td><td class="num nw">${clp(c.total)}</td><td class="hide-m">${c.stage}</td><td class="hide-m">${otag(c)}</td><td>${pillOf(CART_ST[c.st])}${c.st === 'pend' ? `<div style="margin-top:6px"><button class="button" data-act="recordar" data-id="${c.id}">Enviar recordatorio</button></div>` : ''}</td></tr>`).join('') || '<tr class="no-items"><td colspan="6">No hay carritos en este estado.</td></tr>'}
      </tbody></table>`;
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
  MK.pixel = () => emptyState('Conecta el píxel de Meta y Google Analytics', 'Con el píxel y la API de conversiones conectados, aquí ves el embudo de compra (visitas, productos vistos, agregados al carro, pagos iniciados y compras) y si los eventos llegan bien, desde el navegador y desde el servidor. Los eventos y los ID de producto son los mismos que usan hoy las campañas.', '<a class="button button-primary" href="#/ajustes?tab=seguimiento">Ir a Seguimiento y anuncios</a>', 'link');

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
    if (!LOG.length) return `<div class="wrap-h"><h1>Registro de actividad</h1></div>${emptyState('Sin actividad registrada', 'Cada cambio queda anotado aquí con fecha y persona: pedidos, precios, stock, cupones, exportaciones de datos y ajustes. El registro no se puede editar ni borrar.', '', 'list')}`;
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
    const pl = s.replace(/[^a-z0-9]/g, '').toUpperCase(), bs = pl.length >= 3 ? BOOK.filter((b) => b.plate.includes(pl)).slice(0, 3) : [];
    const cs = CUST.filter((c) => buyers.has(c) && deacc(`${custName(c)} ${c.email} ${c.emp ? c.emp.name : ''}`.toLowerCase()).includes(s)).slice(0, 3);
    const sec = (t, items) => (items.length ? `<div class="gres__t">${t}</div>${items.join('')}` : '');
    res.innerHTML = sec('Pedidos', os.map((o) => `<a href="#/pedido/${o.id}"><b>#${o.id}</b><span class="gres__m">${esc(custName(o.c))}</span>${pill(o.st)}</a>`))
      + sec('Productos', ps.map((p) => `<a href="#/producto/${p.id}"><img src="${img(p)}" alt=""><span class="gres__m">${esc(p.n)}</span><span class="muted">${clp(p.p)}</span></a>`))
      + sec('Taller', bs.map((b) => `<a href="#/taller?w=${weekOf(b.day)}"><b>${fmtPlate(b.plate)}</b><span class="gres__m">${esc(b.car)} · ${esc(b.sv.n)}</span><span class="muted">${fDay(b.day)}</span></a>`)) + sec('Clientes', cs.map((c) => `<a href="#/cliente/${c.id}"><span class="gres__m"><b>${esc(custName(c))}</b></span><span class="muted">${esc(c.comuna)}</span></a>`)) || '<p class="gres__none">Sin resultados para esa búsqueda.</p>';
    res.hidden = false;
  }
  function bellItems() {
    const inv = invRows();
    return [
      [ORDERS.filter((o) => NOW - o.t < DAY && PAID.has(o.st)).length, 'pedidos pagados en las últimas 24 horas', '#/pedidos', 'st-ok'],
      [ORDERS.filter((o) => o.st === 'processing' && !o.prep).length, 'pedidos esperando preparación', '#/despachos', 'st-wait'],
      [ORDERS.filter((o) => o.st === 'failed' && NOW - o.t < 7 * DAY).length, 'pagos rechazados esta semana', '#/pedidos?estado=failed', 'st-bad'],
      [inv.filter((x) => x.st === 'out').length, 'productos agotados', '#/inventario', 'st-wait'],
      [feedItems().filter((x) => x.e.length).length, 'productos con errores para los catálogos de anuncios', '#/marketing?tab=catalogos', 'st-wait'],
      [CARTS.filter((c) => c.st === 'pend').length, 'carritos abandonados por recuperar', '#/marketing?tab=carritos', 'st-info'],
      [REVIEWS.filter((r) => r.st === 'pend').length, 'reseñas nuevas por aprobar', '#/resenas', 'st-info'],
      [BOOK.filter((b) => b.st === 'agendado' && b.day - sod(NOW) <= DAY && b.day >= sod(NOW)).length, 'reservas del taller sin confirmar para hoy o mañana', '#/taller', 'st-wait'],
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

  /* ───────── ventana modal ───────── */
  function modal(title, body, foot) {
    $('#dlgT').textContent = title; $('#dlgB').innerHTML = body; $('#dlgF').innerHTML = foot;
    const d = $('#dlg'); if (!d.open) d.showModal();
    const f = $('#dlgB input:not([type=hidden]):not([disabled]), #dlgB select, #dlgB textarea'); if (f) f.focus();
  }
  const closeModal = () => { const d = $('#dlg'); if (d.open) d.close(); };
  const confirmBox = (title, txt, act, label, id = '') => modal(title, `<p style="margin:0">${txt}</p>`, `<button class="button" data-act="dlg-close">Cancelar</button><button class="button button-primary" data-act="${act}" data-id="${id}">${label}</button>`);

  /* ───────── utilidades de validación ───────── */
  const rutOk = (s) => {
    const m = String(s).replace(/[.\s]/g, '').toUpperCase().match(/^(\d{7,8})-?([\dK])$/); if (!m) return false;
    let sum = 0, mul = 2; for (let i = m[1].length - 1; i >= 0; i--) { sum += +m[1][i] * mul; mul = mul === 7 ? 2 : mul + 1; }
    const dv = 11 - (sum % 11); return m[2] === (dv === 11 ? '0' : dv === 10 ? 'K' : String(dv));
  };
  const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  const slugify = (s) => deacc(s.toLowerCase()).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  const ean13 = () => { const d = '20' + Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join(''); const s = [...d].reduce((a, x, i) => a + +x * (i % 2 ? 3 : 1), 0); return d + ((10 - (s % 10)) % 10); };
  const pctTxt = (x) => `${(x * 100).toFixed(1).replace('.', ',')} %`;
  const nextId = (arr) => 1 + Math.max(0, ...arr.map((x) => x.id));

  /* ───────── documento tributario al pagar ───────── */
  function emitDoc(o) {
    const type = o.fac ? 'Factura electrónica' : 'Boleta electrónica';
    o.doc = { type, folio: null };
    o.lines.forEach((l) => { if (l.p.stk != null) l.p.stk = Math.max(0, l.p.stk - l.q); });
    o.notes.push({ t: Date.now(), txt: CONNECTED ? `${type} emitida en Bsale${o.c.email !== '—' ? ` y enviada a ${o.c.email}` : ''}. Stock descontado en la sucursal Casa Matriz.` : `${type} lista para emitirse en Bsale al conectar la cuenta. Stock descontado.`, kind: 'system', by: 'Reycar Store' });
  }

  /* ───────── pedido manual: ventas por WhatsApp, teléfono o en el local ───────── */
  let DRAFT = null;
  const newDraft = (c = null) => ({ lines: [], c, fac: false, ship: 0, shipCost: 0, pay: 'link', cp: null });
  const SHIP_M = [['Retiro en tienda — Quinta Normal', 0], ['Starken a domicilio', 4490], ['Chilexpress a domicilio', 4490], ['Blue Express a domicilio', 3990], ['Envío por pagar (lo paga quien recibe)', 0]];
  const PAYS = [['link', 'Enviar link de pago (Klap)', 'Le llega por WhatsApp y correo. El pedido se confirma solo cuando paga.'], ['transfer', 'Transferencia bancaria', 'Queda "En espera" hasta que confirmes que llegó la transferencia.'], ['local', 'Pagado en el local', 'Efectivo o tarjeta en la máquina del local. La boleta se emite al tiro.']];
  const draftTot = (d) => {
    const sub = d.lines.reduce((s, l) => s + l.q * l.p.p, 0), cp = d.cp;
    const base = cp && /Motor Clean/.test(cp.scope) ? d.lines.filter((l) => l.p.b === 'Motor Clean').reduce((s, l) => s + l.q * l.p.p, 0) : sub;
    let disc = 0, ship = d.shipCost;
    if (cp) { if (cp.type === 'pct') disc = Math.round((base * cp.val) / 100); else if (cp.type === 'fix') disc = Math.min(base, cp.val); else ship = 0; }
    return { sub, disc, ship, total: Math.max(0, sub - disc) + ship };
  };
  V.nuevoPedido = () => {
    DRAFT = DRAFT || newDraft();
    return `
      <div class="wrap-h"><h1>Nuevo pedido</h1><button class="button" data-act="d-reset">Empezar de nuevo</button></div>
      <p class="muted" style="margin:-8px 0 18px">Para ventas por WhatsApp, teléfono o en el local. Descuenta stock, emite la boleta y aparece en Despachos igual que una compra web.</p>
      <div class="cols"><div>
        <div class="postbox"><h2 class="hndle">Productos</h2><div class="inside">
          <div class="picker"><input type="search" id="dps" placeholder="Buscar producto por nombre, marca o SKU" autocomplete="off" aria-label="Buscar producto para agregar"><div class="picker__r" id="dpr" hidden></div></div>
          <div id="dLines"></div>
        </div></div>
        <div class="postbox"><h2 class="hndle">Cliente</h2><div class="inside" id="dCust"></div></div>
      </div><div>
        <div class="postbox"><h2 class="hndle">Envío</h2><div class="inside">
          <div class="field"><label for="dship">Método</label><select id="dship" style="width:100%">${SHIP_M.map(([m, c], i) => `<option value="${i}">${esc(m)}${c ? ` · ${clp(c)}` : ''}</option>`).join('')}</select></div>
          <div class="field" style="margin:0"><label for="dshipc">Costo de envío cobrado ($)</label><input type="number" id="dshipc" min="0" step="10" style="width:100%"></div>
        </div></div>
        <div class="postbox"><h2 class="hndle">Pago</h2><div class="inside">
          ${PAYS.map(([v, l, d]) => `<label class="radio-card"><input type="radio" name="dpay" value="${v}"${DRAFT.pay === v ? ' checked' : ''}><span><b>${l}</b><small>${d}</small></span></label>`).join('')}
          <div class="field" style="margin:14px 0 0"><label for="dcp">Cupón</label><span style="display:flex;gap:6px"><input type="text" id="dcp" placeholder="Código" style="flex:1;text-transform:uppercase"><button class="button" data-act="d-cupon">Aplicar</button></span></div>
        </div></div>
        <div class="postbox"><h2 class="hndle">Resumen</h2><div class="inside" id="dTot"></div><div class="major-publishing-actions"><span class="muted small">Precios con IVA</span><button class="button button-primary" data-act="d-crear">Crear pedido</button></div></div>
      </div></div>`;
  };
  V.nuevoPedido.after = () => { $('#dship').value = String(DRAFT.ship); $('#dshipc').value = DRAFT.shipCost; drawDraft('lct'); };
  function drawDraft(parts) {
    if (!DRAFT || !$('#dLines')) return;
    const d = DRAFT, T = draftTot(d);
    if (parts.includes('l')) $('#dLines').innerHTML = d.lines.length ? `<table class="items" style="margin-top:12px"><tbody>${d.lines.map((l, i) => `<tr><td style="width:52px;padding-left:0"><img class="thumb" src="${img(l.p)}" alt=""></td><td>${esc(l.p.n)}<div class="sku">SKU ${esc(l.p.sku || '—')} · ${clp(l.p.p)} · ${l.p.stk == null ? 'stock sin control' : `${l.p.stk} en stock`}</div></td><td class="num" style="width:84px"><input type="number" class="dq" data-i="${i}" min="1" max="${l.p.stk || 999}" value="${l.q}" aria-label="Cantidad de ${esc(l.p.n)}" style="width:68px;min-height:34px"></td><td class="num nw" id="dlt${i}">${clp(l.q * l.p.p)}</td><td class="num" style="width:44px;padding-right:0"><button class="tb-btn" data-act="d-del" data-i="${i}" aria-label="Quitar ${esc(l.p.n)}" style="width:32px;height:32px">×</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted" style="margin:12px 0 0">Busca y agrega los productos del pedido.</p>';
    if (parts.includes('c')) {
      const c = d.c;
      $('#dCust').innerHTML = c ? `<div class="custcard"><span class="av">${esc(c.first[0] || '?')}</span><div><b>${esc(custName(c))}</b><div class="muted small">${esc(c.email)} · ${esc(c.phone)} · ${esc(c.comuna)}</div>${c.emp ? `<div class="small">${esc(c.emp.name)} · RUT ${c.emp.rut}</div>` : ''}</div><button class="button" data-act="d-cust-x">Cambiar</button></div>
        <label class="switch" style="margin-top:12px"><input type="checkbox" id="dfac"${d.fac ? ' checked' : ''}${c.emp ? '' : ' disabled'}> Emitir factura${c.emp ? '' : ' <span class="muted small">(el cliente no tiene datos de empresa)</span>'}</label>`
        : `<div class="picker"><input type="search" id="dcs" placeholder="Buscar cliente por nombre, correo o teléfono" autocomplete="off" aria-label="Buscar cliente"><div class="picker__r" id="dcr" hidden></div></div>
        <p class="muted small" style="margin:14px 0 8px">¿Cliente nuevo? Completa sus datos:</p>
        <div class="grid2"><div class="field"><label for="nf">Nombre</label><input type="text" id="nf" autocomplete="off"></div><div class="field"><label for="nl">Apellido</label><input type="text" id="nl" autocomplete="off"></div>
        <div class="field"><label for="ne">Correo</label><input type="email" id="ne" autocomplete="off"></div><div class="field"><label for="nph">Teléfono</label><input type="text" id="nph" placeholder="+56 9 …" autocomplete="off"></div>
        <div class="field"><label for="nco">Comuna</label><input type="text" id="nco" list="comunas" autocomplete="off"><datalist id="comunas">${COMUNAS.map((x) => `<option>${esc(x.n)}</option>`).join('')}</datalist></div><div class="field"><label for="nrut">RUT (opcional)</label><input type="text" id="nrut" placeholder="12.345.678-5" autocomplete="off"></div></div>`;
    }
    if (parts.includes('t')) $('#dTot').innerHTML = `<table class="totals sumtable"><tbody><tr><td>Subtotal</td><td>${clp(T.sub)}</td></tr>${d.cp ? `<tr><td>Cupón <code>${esc(d.cp.code)}</code> <button class="button-link-delete" data-act="d-cupon-x">quitar</button></td><td>${d.cp.type === 'ship' ? 'Envío gratis' : '−' + clp(T.disc)}</td></tr>` : ''}<tr><td>Envío</td><td>${T.ship ? clp(T.ship) : 'Gratis'}</td></tr><tr class="grand"><td>Total</td><td>${clp(T.total)}</td></tr><tr><td class="muted">IVA incluido</td><td class="muted">${clp(T.total - T.total / 1.19)}</td></tr></tbody></table>`;
  }
  const pickerOut = (id, items) => { const r = $(id); r.innerHTML = items.join('') || '<p class="muted small" style="margin:0;padding:10px 12px">Sin resultados.</p>'; r.hidden = false; };
  function draftSearch(el) {
    const s = deacc(el.value.trim().toLowerCase());
    if (el.id === 'dps') {
      if (s.length < 2) return ($('#dpr').hidden = true);
      pickerOut('#dpr', ALL.filter((p) => p.p > 0 && deacc(`${p.n} ${p.sku} ${p.b}`.toLowerCase()).includes(s)).slice(0, 8).map((p) => `<button type="button" data-act="d-add" data-id="${p.id}"><img src="${img(p)}" alt=""><span class="gres__m">${esc(p.n)}</span><span class="muted nw">${clp(p.p)} · ${p.stk == null ? '—' : p.stk + ' u.'}</span></button>`));
    }
    if (el.id === 'dcs') {
      if (s.length < 2) return ($('#dcr').hidden = true);
      const digits = s.replace(/\D/g, '');
      pickerOut('#dcr', CUST.filter((c) => deacc(`${custName(c)} ${c.email} ${c.emp ? c.emp.name : ''}`.toLowerCase()).includes(s) || (digits.length > 3 && c.phone.replace(/\D/g, '').includes(digits))).slice(0, 6).map((c) => `<button type="button" data-act="d-cust" data-id="${c.id}"><span class="av" style="width:28px;height:28px;font-size:12px">${esc(c.first[0] || '?')}</span><span class="gres__m"><b>${esc(custName(c))}</b> <span class="muted">${esc(c.email)}</span></span><span class="muted">${esc(c.comuna)}</span></button>`));
    }
  }
  function draftCreate() {
    const d = DRAFT;
    if (!d.lines.length) return toast('Agrega al menos un producto.');
    for (const l of d.lines) if (l.p.stk != null && l.q > l.p.stk) return toast(`No hay stock suficiente de "${l.p.n}" (quedan ${l.p.stk}).`);
    let c = d.c;
    if (!c) {
      const v = (id) => $(id).value.trim(), f = v('#nf'), la = v('#nl'), em = v('#ne'), ph = v('#nph'), co = v('#nco'), ru = v('#nrut');
      if (!f) return toast('Falta el nombre del cliente (o búscalo si ya compró antes).');
      if (!em && !ph) return toast('Indica correo o teléfono para enviarle la boleta.');
      if (em && !emailOk(em)) return toast('El correo no parece válido.');
      if (ru && !rutOk(ru)) return toast('El RUT no es válido: revisa el dígito verificador.');
      const com = COMUNAS.find((x) => deacc(x.n.toLowerCase()) === deacc(co.toLowerCase()));
      c = { id: nextId(CUST), first: f, last: la, email: em || '—', phone: ph || '—', rut: ru || '—', street: '—', comuna: com ? com.n : co || '—', region: com ? com.r : '—', emp: null, since: Date.now(), tags: [], consent: { mail: false, wa: false }, cnotes: [] };
      CUST.push(c);
    }
    const T = draftTot(d), now = Date.now(), m = SHIP_M[d.ship][0], paid = d.pay === 'local';
    const o = { id: 1 + Math.max(ORDER_BASE, ...ORDERS.map((x) => x.id)), t: now, st: paid ? 'processing' : d.pay === 'transfer' ? 'on-hold' : 'pending', c, lines: d.lines.map((l) => ({ p: l.p, q: l.q, price: l.p.p })), sub: T.sub, disc: T.disc, cpCode: d.cp ? d.cp.code : '',
      ship: { m, carrier: (m.match(/^(Starken|Chilexpress|Blue Express)/) || [])[1], cost: T.ship, track: '' }, total: T.total, pay: { link: 'Link de pago Klap', transfer: 'Transferencia bancaria', local: 'Pago en el local' }[d.pay],
      auth: paid ? 'LOCAL' : '', src: MANUAL, camp: '', dev: 'Panel', pages: 0, landing: '—', doc: null, fac: d.fac && !!c.emp, nc: null, cnote: '', notes: [] };
    o.notes.push({ t: now, txt: `Pedido creado a mano desde el panel (${o.pay}).`, kind: 'system', by: 'Guillermo' });
    if (d.pay === 'link') o.notes.push({ t: now, txt: `Link de pago por ${clp(o.total)} enviado por WhatsApp y correo. Vence en 24 horas.`, kind: 'customer', by: 'Reycar Store' });
    if (d.pay === 'transfer') o.notes.push({ t: now, txt: 'Datos de transferencia enviados al cliente. Cuando llegue, cambia el estado a Procesando: se emite la boleta y se descuenta el stock.', kind: 'customer', by: 'Reycar Store' });
    if (paid) emitDoc(o);
    if (d.cp) d.cp.uses++;
    ORDERS.unshift(o); oId.set(o.id, o); CS = null;
    log(`Pedido #${o.id}`, `Creó un pedido manual por ${clp(o.total)} (${o.pay})`);
    DRAFT = null;
    location.hash = `/pedido/${o.id}`;
    toast(paid ? `Pedido #${o.id} creado y pagado. Ya está en Despachos.` : `Pedido #${o.id} creado. ${d.pay === 'link' ? 'Al conectar Klap, el link de pago le llega al cliente por WhatsApp y correo.' : 'Queda en espera de la transferencia.'}`);
  }

  /* ───────── reembolso total o parcial ───────── */
  function refundModal(o) {
    const left = (l) => l.q - (l.rq || 0);
    modal(`Reembolso del pedido #${o.id}`, `
      <p class="muted" style="margin-top:0">Elige qué se devuelve. El dinero vuelve por Klap al mismo medio de pago y se emite la nota de crédito en Bsale.</p>
      <table class="items"><thead><tr><th style="padding-left:0">Artículo</th><th class="num">Precio</th><th class="num">Devolver</th></tr></thead><tbody>${o.lines.map((l, i) => `<tr><td style="padding-left:0">${esc(l.p.n)}</td><td class="num">${clp(l.price)}</td><td class="num nw"><input type="number" data-rq="${i}" min="0" max="${left(l)}" value="0" style="width:64px;min-height:34px" aria-label="Unidades a devolver de ${esc(l.p.n)}"${left(l) ? '' : ' disabled'}> <span class="muted small">de ${left(l)}</span></td></tr>`).join('')}</tbody></table>
      ${o.ship.cost && !o.shipRef ? `<label class="switch" style="margin-top:12px"><input type="checkbox" id="rfShip"> Devolver también el envío (${clp(o.ship.cost)})</label>` : ''}
      <div class="grid2" style="margin-top:12px"><div class="field"><label for="rfWhy">Motivo</label><select id="rfWhy" style="width:100%"><option>Producto dañado o con falla</option><option>Producto equivocado</option><option>El cliente se arrepintió</option><option>No había stock</option><option>Otro</option></select></div><div class="field" style="align-self:end"><label class="switch"><input type="checkbox" id="rfStock" checked> Reponer el stock en Bsale</label></div></div>`,
      `<button class="button" data-act="dlg-close">Cancelar</button><button class="button button-primary" data-act="rf-ok" data-id="${o.id}" id="rfBtn" disabled>Reembolsar $0</button>`);
  }
  const rfAmount = (o) => {
    const k = o.disc ? 1 - o.disc / o.sub : 1; let a = 0;
    $$('[data-rq]').forEach((el) => { const l = o.lines[+el.dataset.rq]; a += Math.max(0, Math.min(Math.floor(+el.value || 0), l.q - (l.rq || 0))) * l.price * k; });
    if ($('#rfShip') && $('#rfShip').checked) a += o.ship.cost;
    return Math.round(Math.min(a, o.total - (o.refunded || 0)));
  };
  function refundApply(o) {
    const a = rfAmount(o); if (!a) return toast('Indica qué se devuelve.');
    const now = Date.now(), restock = $('#rfStock').checked, why = $('#rfWhy').value, items = [];
    $$('[data-rq]').forEach((el) => { const l = o.lines[+el.dataset.rq], n = Math.max(0, Math.min(Math.floor(+el.value || 0), l.q - (l.rq || 0))); if (!n) return; l.rq = (l.rq || 0) + n; items.push(`${n} × ${l.p.n}`); if (restock && l.p.stk != null) l.p.stk += n; });
    if ($('#rfShip') && $('#rfShip').checked) { o.shipRef = true; items.push('envío'); }
    const f = null;
    o.ncs = [...(o.ncs || []), { f, a, t: now }]; o.refunded = (o.refunded || 0) + a;
    o.notes.push({ t: now, txt: `Reembolso de ${clp(a)} realizado en Klap (${items.join(', ')}). Motivo: ${why}.`, kind: 'private', by: 'Guillermo' });
    o.notes.push({ t: now, txt: `Nota de crédito por ${clp(a)}: ${CONNECTED ? 'emitida en Bsale' : 'lista para emitirse en Bsale al conectar la cuenta'}.${restock && items.some((x) => x !== 'envío') ? ' Stock repuesto.' : ''}`, kind: 'system', by: 'Reycar Store' });
    log(`Pedido #${o.id}`, `Reembolsó ${clp(a)}`);
    if (o.refunded >= o.total - 1) setStatus(o, 'refunded');
    closeModal(); route(); toast(`Reembolso de ${clp(a)} registrado, con su nota de crédito.`);
  }

  /* ───────── ficha de cliente ───────── */
  V.cliente = (q, id) => {
    const c = CUST.find((x) => x.id === +id);
    if (!c) return `<div class="wrap-h"><h1>Cliente no encontrado</h1></div><p><a href="#/clientes">Volver a clientes</a></p>`;
    const x = cstats().get(c), os = x.orders.slice().sort((a, b) => b.t - a.t), bk = BOOK.filter((b) => b.c === c).sort((a, b) => b.day - a.day || b.start - a.start), rv = REVIEWS.filter((r) => r.c === c);
    const wa = c.phone.replace(/\D/g, '');
    return `
      <div class="wrap-h"><h1 class="cust-h"><span class="av av--lg">${esc((c.first[0] || '?') + (c.last[0] || ''))}</span>${esc(custName(c))}</h1>${pillOf(SEGS[segOf(c)])}<button class="button" data-act="d-for" data-id="${c.id}">Nuevo pedido para este cliente</button></div>
      <p class="muted" style="margin:-8px 0 18px">Cliente desde ${fDate(x.first || c.since || NOW)}${c.emp ? ` · ${esc(c.emp.name)}` : ''}${x.brands.size ? ` · Compra ${[...x.brands].slice(0, 4).map(esc).join(', ')}` : ''}</p>
      <div class="tiles">${tile('Total gastado', clp(x.v), 'pedidos pagados, con IVA')}${tile('Pedidos pagados', miles(x.n), `${x.orders.length} en total`)}${tile('Ticket promedio', clp(x.n ? x.v / x.n : 0), '')}${tile('Última compra', x.last ? ago(x.last) : '—', x.last ? fDate(x.last) : 'sin compras pagadas')}</div>
      <div class="cols"><div>
        ${box('Pedidos', os.length ? `<table class="mini"><tbody>${os.map((o) => `<tr><td><a href="#/pedido/${o.id}"><b>#${o.id}</b></a><div class="muted small">${fDate(o.t)} · ${plural(qty(o), 'producto', 'productos')}</div></td><td>${pill(o.st)}</td><td class="num">${clp(o.total)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted" style="margin:0;padding:16px 18px">Sin pedidos.</p>', '', true)}
        ${bk.length ? box('Visitas al taller', `<table class="mini"><tbody>${bk.slice(0, 8).map((b) => `<tr><td><b>${esc(b.sv.n)}</b><div class="muted small">${fDate(b.day)} · ${hm(b.start)} · ${esc(b.car)} ${fmtPlate(b.plate)}</div></td><td>${pillOf(BK_ST[b.st])}</td><td class="num">${clp(b.price)}</td></tr>`).join('')}</tbody></table>`, '', true) : ''}
        ${rv.length ? box('Reseñas', `<ul class="rows">${rv.map((r) => `<li>${stars(r.r)} <span class="muted small">${fDate(r.t)} · ${esc(r.p.n)}</span><div>${esc(r.txt)}</div></li>`).join('')}</ul>`) : ''}
        ${box('Notas internas', `<ul class="notes" id="cnotes">${c.cnotes.map(noteHtml).join('') || '<li class="muted" style="padding:0">Sin notas. Solo las ve el equipo.</li>'}</ul><div class="field" style="margin-top:12px"><label for="cnn">Añadir nota</label><textarea id="cnn" rows="2" placeholder="Ej: prefiere que lo llamen después de las 18:00"></textarea></div><button class="button" data-act="c-nota" data-id="${c.id}">Guardar nota</button>`)}
      </div><div>
        ${box('Contacto', `<dl class="kv"><dt>Correo</dt><dd>${c.email !== '—' ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</dd><dt>Teléfono</dt><dd>${esc(c.phone)}${wa.length > 8 ? ` · <a href="#" data-act="wa-cliente" data-id="${c.id}">WhatsApp</a>` : ''}</dd><dt>RUT</dt><dd>${esc(c.rut)}</dd><dt>Dirección</dt><dd>${esc(c.street)}<br>${esc(c.comuna)}${c.region !== '—' ? `, ${esc(c.region)}` : ''}</dd></dl>`)}
        ${c.emp ? box('Facturación', `<dl class="kv"><dt>Razón social</dt><dd>${esc(c.emp.name)}</dd><dt>RUT</dt><dd>${c.emp.rut}</dd><dt>Giro</dt><dd>${esc(c.emp.giro)}</dd></dl>`) : ''}
        ${box('Etiquetas', `<div class="chips" id="ctags">${c.tags.map((t, i) => `<span class="chip">${esc(t)}<button data-act="c-untag" data-id="${c.id}" data-i="${i}" aria-label="Quitar etiqueta ${esc(t)}">×</button></span>`).join('') || '<span class="muted small">Sin etiquetas.</span>'}</div><div class="addrow"><input type="text" id="ctag" placeholder="Ej: Mayorista, Detailer" list="taglist" aria-label="Nueva etiqueta"><datalist id="taglist">${['Mayorista', 'Detailer profesional', 'Cliente del taller', 'Empresa', 'VIP'].map((t) => `<option>${t}</option>`).join('')}</datalist><button class="button" data-act="c-tag" data-id="${c.id}">Agregar</button></div>`)}
        ${box('Permisos de contacto', `<label class="switch"><input type="checkbox" data-consent="mail" data-id="${c.id}"${c.consent.mail ? ' checked' : ''}> Acepta correos con novedades y ofertas</label><br><label class="switch"><input type="checkbox" data-consent="wa" data-id="${c.id}"${c.consent.wa ? ' checked' : ''}> Acepta mensajes por WhatsApp</label><p class="muted small" style="margin:8px 0 0">Los correos del pedido (boleta, seguimiento) siempre llegan; esto es solo para promociones.</p>`)}
        ${box('Privacidad (Ley 21.719)', `<p class="muted small" style="margin-top:0">Si el cliente pide sus datos o que se borren, se atiende desde aquí y queda registrado.</p><div class="stack"><button class="button" data-act="c-export" data-id="${c.id}">Descargar sus datos</button><button class="button-link-delete" data-act="c-borrar" data-id="${c.id}">Borrar sus datos personales</button></div>`)}
      </div></div>`;
  };

  /* ───────── agenda del taller ───────── */
  const hm = (m) => `${Math.floor(m / 60)}:${p2(m % 60)}`;
  const fmtPlate = (p) => `${p.slice(0, 2)}·${p.slice(2, 4)}·${p.slice(4)}`;
  const WDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const H0 = 540, H1 = 1140, PXM = 0.95;
  V.taller = (q) => {
    const w = Math.max(-1, Math.min(6, +q.get('w') || 0)), m0 = addDays(mondayOf(NOW), w * 7), days = [0, 1, 2, 3, 4, 5].map((i) => addDays(m0, i)), today = sod(NOW), nowMin = (NOW - today) / MIN;
    const wk = BOOK.filter((b) => b.day >= m0 && b.day < addDays(m0, 7));
    const live = wk.filter((b) => b.st !== 'noshow'), mins = live.reduce((s, b) => s + b.sv.min, 0), cap = 2 * (5 * 600 + 300);
    const top = groupBy(live.map((b) => ({ total: b.price, b })), (x) => x.b.sv.n).sort((x, y) => y.n - x.n)[0];
    const rail = `<div class="cal__rail" aria-hidden="true"><div class="cal__dh">&nbsp;</div><div class="cal__body" style="height:${(H1 - H0) * PXM}px">${[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => `<span style="top:${(h * 60 - H0) * PXM}px">${h}:00</span>`).join('')}</div></div>`;
    const col = (day, i) => `<div class="cal__col${day === today ? ' is-today' : ''}"><div class="cal__dh"><b>${WDAYS[i]}</b> ${fDay(day)}</div><div class="cal__body" style="height:${(H1 - H0) * PXM}px">
        ${closeOf(day) < H1 ? `<div class="cal__closed" style="top:${(closeOf(day) - H0) * PXM}px">Cerrado</div>` : ''}
        ${day === today && nowMin > H0 && nowMin < H1 ? `<div class="cal__now" style="top:${(nowMin - H0) * PXM}px"></div>` : ''}
        ${BOOK.filter((b) => b.day === day).map((b) => `<button class="bk bk--${b.st} bk--b${b.box}" style="top:${(b.start - H0) * PXM}px;height:${b.sv.min * PXM - 3}px" data-act="bk-ver" data-id="${b.id}" title="${esc(`${hm(b.start)} · ${b.sv.n} · ${b.car} · ${custName(b.c)}`)}"><b>${hm(b.start)} ${esc(b.sv.n)}</b><span>${esc(b.car)} · ${fmtPlate(b.plate)}</span><span>${esc(custName(b.c))}</span></button>`).join('')}
      </div></div>`;
    const next = BOOK.filter((b) => b.day + b.start * MIN >= NOW && b.st !== 'noshow').sort((a, b) => a.day - b.day || a.start - b.start).slice(0, 8);
    return `
      <div class="wrap-h"><h1>Agenda del taller</h1><span class="weeknav"><a class="button" href="#/taller?w=${w - 1}" aria-label="Semana anterior"${w <= -1 ? ' aria-disabled="true" tabindex="-1"' : ''}>‹</a><a class="button" href="#/taller">Esta semana</a><a class="button" href="#/taller?w=${w + 1}" aria-label="Semana siguiente">›</a></span><button class="button button-primary" data-act="bk-nueva">Nueva reserva</button></div>
      <p class="muted" style="margin:-8px 0 18px">Semana del ${fDay(m0)} al ${fDate(addDays(m0, 5))} · 2 boxes · lunes a viernes de 9:00 a 19:00 y sábado de 9:00 a 14:00.</p>
      <div class="tiles">${tile('Reservas de la semana', miles(live.length), `${wk.filter((b) => b.st === 'agendado').length} por confirmar`)}${tile('Ingresos estimados', clp(live.reduce((s, b) => s + b.price, 0)), 'según el precio de cada servicio')}${tile('Ocupación', `${Math.round((mins / cap) * 100)} %`, 'de las horas de los 2 boxes')}${tile('Servicio más pedido', top ? `<span class="val-txt">${esc(top.l)}</span>` : '—', top ? plural(top.n, 'reserva', 'reservas') : 'aún sin reservas')}</div>
      <div class="cal-legend"><span><i class="lg lg--b1"></i>Box 1</span><span><i class="lg lg--b2"></i>Box 2</span>${Object.entries(BK_ST).filter(([k]) => k !== 'listo').map(([k, [l]]) => `<span><i class="lg lg--${k}"></i>${l}</span>`).join('')}</div>
      <div class="cal-wrap"><div class="cal">${rail}${days.map(col).join('')}</div></div>
      <div class="dash" style="margin-top:20px">
        ${box('Próximas reservas', next.length ? `<table class="mini"><tbody>${next.map((b) => `<tr class="clickable" data-act="bk-ver" data-id="${b.id}"><td><b>${WDAYS[(new Date(b.day).getDay() + 6) % 7]} ${fDay(b.day)} · ${hm(b.start)}</b><div class="muted small">${esc(b.sv.n)} · ${esc(b.car)} ${fmtPlate(b.plate)} · ${esc(custName(b.c))}</div></td><td>${pillOf(BK_ST[b.st])}</td></tr>`).join('')}</tbody></table>` : '<p class="muted" style="margin:0;padding:16px 18px">Sin reservas próximas.</p>', '', true)}
        ${box('Servicios y precios', `<table class="mini"><thead><tr><td><b>Servicio</b></td><td class="num"><b>Duración (min)</b></td><td class="num"><b>Precio ($)</b></td></tr></thead><tbody>${SERVICES.map((s, i) => `<tr><td>${esc(s.n)}</td><td class="num"><input type="number" data-svm="${i}" value="${s.min}" min="30" step="30" style="width:84px;min-height:32px" aria-label="Duración de ${esc(s.n)}"></td><td class="num"><input type="number" data-svp="${i}" value="${s.p}" min="0" step="1000" style="width:110px;min-height:32px" aria-label="Precio de ${esc(s.n)}"></td></tr>`).join('')}</tbody></table><div class="major-publishing-actions"><span class="muted small">Nombres y precios vienen de los servicios de la tienda; la duración se ajusta aquí.</span><button class="button" data-act="sv-save">Guardar</button></div>`, '', true)}
      </div>`;
  };
  function bookingModal(b) {
    modal(`${b.sv.n} · ${WDAYS[(new Date(b.day).getDay() + 6) % 7]} ${fDay(b.day)} ${hm(b.start)}`, `
      <dl class="kv"><dt>Cliente</dt><dd><a href="#/cliente/${b.c.id}">${esc(custName(b.c))}</a> · ${esc(b.c.phone)}</dd><dt>Vehículo</dt><dd>${esc(b.car)} · patente <b>${fmtPlate(b.plate)}</b></dd><dt>Horario</dt><dd>${hm(b.start)} a ${hm(b.start + b.sv.min)} · Box ${b.box}</dd><dt>Precio</dt><dd>${clp(b.price)}</dd>${b.note ? `<dt>Nota</dt><dd>${esc(b.note)}</dd>` : ''}</dl>
      <div class="field" style="margin-top:16px"><label for="bkst">Estado</label><select id="bkst" style="width:100%">${Object.entries(BK_ST).map(([k, [l]]) => `<option value="${k}"${k === b.st ? ' selected' : ''}>${l}</option>`).join('')}</select></div>`,
      `<button class="button-link-delete" data-act="bk-del" data-id="${b.id}">Cancelar reserva</button><span style="flex:1"></span><button class="button" data-act="bk-wa" data-id="${b.id}">Recordatorio por WhatsApp</button><button class="button button-primary" data-act="bk-save" data-id="${b.id}">Guardar</button>`);
  }
  function newBookingModal() {
    const t0 = addDays(sod(NOW), 1), iso = (t) => { const d = new Date(t); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
    modal('Nueva reserva', `
      <div class="grid2"><div class="field"><label for="bn">Nombre del cliente</label><input type="text" id="bn" autocomplete="off"></div><div class="field"><label for="bp">Teléfono</label><input type="text" id="bp" placeholder="+56 9 …" autocomplete="off"></div>
      <div class="field"><label for="bcar">Vehículo</label><input type="text" id="bcar" placeholder="Marca y modelo"></div><div class="field"><label for="bpl">Patente</label><input type="text" id="bpl" placeholder="BBCL12" maxlength="8" style="text-transform:uppercase"></div></div>
      <div class="field"><label for="bsv">Servicio</label><select id="bsv" style="width:100%">${SERVICES.map((s, i) => `<option value="${i}">${esc(s.n)} · ${hm(s.min).replace(':00', ' h').replace(':30', ' h 30')} · ${clp(s.p)}</option>`).join('')}</select></div>
      <div class="grid2"><div class="field"><label for="bd">Día</label><input type="date" id="bd" min="${iso(sod(NOW))}" value="${iso(t0)}"></div><div class="field"><label for="bh">Hora</label><select id="bh" style="width:100%">${Array.from({ length: 19 }, (_, i) => 540 + i * 30).map((m) => `<option value="${m}">${hm(m)}</option>`).join('')}</select></div></div>
      <div class="field"><label for="bnote">Nota (opcional)</label><input type="text" id="bnote" placeholder="Ej: tiene manchas de savia en el capó"></div>`,
      `<button class="button" data-act="dlg-close">Cancelar</button><button class="button button-primary" data-act="bk-ok">Reservar</button>`);
  }
  function bookingCreate() {
    const v = (id) => $(id).value.trim(), name = v('#bn'), ph = v('#bp'), car = v('#bcar') || 'Vehículo sin especificar', pl = v('#bpl').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const sv = SERVICES[+$('#bsv').value], start = +$('#bh').value, dv = v('#bd');
    if (!name) return toast('Falta el nombre del cliente.');
    if (ph.replace(/\D/g, '').length < 8) return toast('Indica un teléfono para confirmar la reserva.');
    if (!/^([A-Z]{2}\d{4}|[A-Z]{4}\d{2})$/.test(pl)) return toast('La patente debe tener el formato BBCL12 o AB1234.');
    if (!dv) return toast('Elige el día.');
    const [y, mo, d] = dv.split('-').map(Number), day = new Date(y, mo - 1, d).getTime();
    if (new Date(day).getDay() === 0) return toast('El taller no atiende los domingos.');
    if (day + start * MIN < Date.now()) return toast('Esa hora ya pasó.');
    if (start + sv.min > closeOf(day)) return toast(`"${sv.n}" dura ${sv.min / 60} h: no alcanza antes del cierre (${hm(closeOf(day))}). Elige una hora más temprana.`);
    const busy = (box, s, e) => BOOK.some((b) => b.day === day && b.box === box && b.st !== 'noshow' && s < b.start + b.sv.min && b.start < e);
    const box = [1, 2].find((bx) => !busy(bx, start, start + sv.min));
    if (!box) { let alt = null; for (let m = 540; m + sv.min <= closeOf(day) && !alt; m += 30) if ([1, 2].some((bx) => !busy(bx, m, m + sv.min)) && day + m * MIN > Date.now()) alt = m; return toast(`Los 2 boxes están ocupados a esa hora.${alt != null ? ` Primera hora libre ese día: ${hm(alt)}.` : ' Ese día no queda espacio.'}`); }
    const digits = ph.replace(/\D/g, '').slice(-8);
    let c = CUST.find((x) => x.phone.replace(/\D/g, '').endsWith(digits));
    if (!c) { const [first, ...rest] = name.split(/\s+/); c = { id: nextId(CUST), first, last: rest.join(' '), email: '—', phone: ph, rut: '—', street: '—', comuna: '—', region: '—', emp: null, since: Date.now(), tags: ['Cliente del taller'], consent: { mail: false, wa: true }, cnotes: [] }; CUST.push(c); CS = null; }
    const b = { id: nextId(BOOK), day, start, box, sv, c, car, plate: pl, st: 'confirmado', price: sv.p, note: v('#bnote') };
    BOOK.push(b); log('Taller', `Reservó ${sv.n} el ${fDay(day)} a las ${hm(start)} (Box ${box}) para ${custName(c)}`);
    closeModal(); location.hash = `/taller?w=${weekOf(day)}`; route();
    toast(`Reserva confirmada en el Box ${box}. Puedes enviarle la confirmación con "Recordatorio por WhatsApp".`);
  }

  /* ───────── reseñas ───────── */
  const stars = (r) => `<span class="stars" role="img" aria-label="${r} de 5 estrellas">${'★'.repeat(r)}<span>${'★'.repeat(5 - r)}</span></span>`;
  V.resenas = (q) => {
    if (!REVIEWS.length) return `<div class="wrap-h"><h1>Reseñas</h1></div>${emptyState('Aún no hay reseñas', 'Siete días después de cada entrega, el cliente recibe un correo para opinar. Solo opinan compras verificadas; aquí se aprueban, se responden y las estrellas se muestran en la tienda y en los anuncios de Google Shopping.', '', 'star')}`;
    const f = q.get('f') || 'pend', page = Math.max(1, +q.get('pag') || 1), per = 20, base = '#/resenas';
    const pub = REVIEWS.filter((r) => r.st === 'ok'), avg = pub.length ? pub.reduce((s, r) => s + r.r, 0) / pub.length : 0;
    const L = { pend: REVIEWS.filter((r) => r.st === 'pend'), bajas: REVIEWS.filter((r) => r.r <= 3 && !r.reply && r.st !== 'hid'), todas: REVIEWS };
    const list = L[f] || L.pend, rows = list.slice((page - 1) * per, page * per);
    const dist = [5, 4, 3, 2, 1].map((k) => { const n = pub.filter((r) => r.r === k).length; return { l: `${k} ${k === 1 ? 'estrella' : 'estrellas'}`, v: n, n }; });
    return `
      <div class="wrap-h"><h1>Reseñas</h1></div>
      <p class="muted" style="margin:-8px 0 18px">Solo opinan clientes con compra verificada: el correo para opinar llega 7 días después de la entrega.</p>
      <div class="tiles">${tile('Calificación promedio', `${avg.toFixed(1).replace('.', ',')} ★`, `${plural(pub.length, 'reseña publicada', 'reseñas publicadas')}`)}${tile('Por aprobar', miles(L.pend.length), 'llegaron esta semana')}${tile('Con 5 estrellas', pub.length ? `${Math.round((dist[0].n / pub.length) * 100)} %` : '—', 'de las publicadas')}${tile('Bajas sin responder', miles(L.bajas.length), 'responder genera confianza')}</div>
      <div class="dash">
        ${box('Distribución', bars(dist, 0, { fmt: (x) => `${x.v}<small>${pub.length ? Math.round((x.v / pub.length) * 100) : 0} %</small>`, tip: (x) => `<b>${x.l}</b><br>${plural(x.v, 'reseña', 'reseñas')}` }), 'reseñas publicadas', true)}
        ${box('Dónde se usan', '<ul class="checks"><li>En la ficha de cada producto, con estrellas y el nombre de pila del cliente.</li><li>En los catálogos de Google: las estrellas aparecen en los anuncios de Shopping.</li><li>Las reseñas negativas no se ocultan: se responden. Solo se oculta el spam o lo ofensivo.</li></ul>')}
      </div>
      <ul class="subsubsub">${[['pend', 'Por aprobar'], ['bajas', '1 a 3 estrellas sin respuesta'], ['todas', 'Todas']].map(([k, l]) => `<li><a href="${href(base, q, { f: k, pag: '' })}" class="${f === k ? 'current' : ''}">${l} <span class="n">(${L[k].length})</span></a></li>`).join('')}</ul>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>
      <table class="wp-list-table"><thead><tr><th style="width:60px"><span class="screen-reader-text">Foto</span></th><th>Reseña</th><th class="hide-m">Fecha</th><th>Estado</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td><img class="thumb" src="${img(r.p)}" alt="" loading="lazy"></td><td>${stars(r.r)} <span class="muted small">${esc(r.p.n.slice(0, 60))}</span><div style="margin:4px 0">${esc(r.txt)}</div><div class="muted small">${esc(r.c.first)} ${esc((r.c.last[0] || '') + '.')} · compra verificada · <a href="#/pedido/${r.o.id}">pedido #${r.o.id}</a></div>${r.reply ? `<div class="reply"><b>Respuesta de Reycar:</b> ${esc(r.reply)}</div>` : ''}
        <div class="rv-a">${r.st === 'pend' ? `<button class="button button-primary" data-act="rv-ok" data-id="${r.id}">Aprobar</button>` : ''}<button class="button" data-act="rv-reply" data-id="${r.id}">${r.reply ? 'Editar respuesta' : 'Responder'}</button>${r.st === 'hid' ? `<button class="button" data-act="rv-show" data-id="${r.id}">Volver a publicar</button>` : `<button class="button-link-delete" data-act="rv-hide" data-id="${r.id}">Ocultar (spam)</button>`}</div></td>
        <td class="hide-m nw">${fDate(r.t)}</td><td>${pillOf(RV_ST[r.st])}</td></tr>`).join('') || '<tr class="no-items"><td colspan="4">No hay reseñas en esta lista.</td></tr>'}
      </tbody></table>
      <div class="tablenav">${pager(list.length, page, per, (p) => href(base, q, { pag: p }))}</div>`;
  };

  /* ───────── correos a clientes ───────── */
  const TPL = {
    novedades: ['Novedades en Reycar Store', 'Hola {nombre}:\n\nLlegaron productos nuevos para el cuidado de tu auto. Te dejamos los destacados de la semana.'],
    promo: ['Solo esta semana: descuento en toda la tienda', 'Hola {nombre}:\n\nPor ser cliente de Reycar, tienes un descuento especial esta semana. Úsalo en cualquier producto.'],
    volver: ['Te extrañamos: un regalo para volver', 'Hola {nombre}:\n\nHace tiempo que no te vemos. Te dejamos un descuento para tu próxima compra.'],
  };
  MK.correos = () => {
    const sent = CAMPAIGNS.filter((c) => c.st === 'sent' && c.open != null), avgO = sent.reduce((s, c) => s + c.open, 0) / (sent.length || 1), avgC = sent.reduce((s, c) => s + c.click, 0) / (sent.length || 1);
    const segName = (k) => (MAILSEG.find((x) => x[0] === k) || MAILSEG[0])[1];
    return `
      <div class="tiles">${tile('Clientes que aceptan correos', miles(segCount('all')), 'solo a ellos se les escribe')}${tile('Apertura promedio', sent.length ? pctTxt(avgO) : '—', sent.length ? `últimas ${sent.length} campañas` : 'sin campañas medidas')}${tile('Clics promedio', sent.length ? pctTxt(avgC) : '—', 'abrieron un enlace')}${tile('Ventas por correo', clp(ORDERS.filter((o) => o.src.k === 'mail' && PAID.has(o.st)).reduce((s, o) => s + o.total, 0)), 'pedidos que llegaron desde un correo')}</div>
      ${CAMPAIGNS.length ? box('Campañas', `<div style="overflow-x:auto"><table class="mini"><thead><tr><td><b>Asunto</b></td><td class="hide-m"><b>Para</b></td><td class="num"><b>Enviados</b></td><td class="num"><b>Abiertos</b></td><td class="num hide-m"><b>Clics</b></td><td class="num hide-m"><b>Pedidos</b></td><td><b>Estado</b></td></tr></thead><tbody>${CAMPAIGNS.map((c) => `<tr><td><b>${esc(c.subj)}</b><div class="muted small">${c.st === 'prog' ? 'Programada para el ' : ''}${fFull(c.t)}</div></td><td class="hide-m">${esc(segName(c.seg))}</td><td class="num">${miles(c.n)}</td><td class="num">${c.open != null ? pctTxt(c.open) : '—'}</td><td class="num hide-m">${c.click != null ? pctTxt(c.click) : '—'}</td><td class="num hide-m">${c.orders != null ? c.orders : '—'}</td><td>${pillOf(c.st === 'prog' ? ['Programada', 'pending'] : c.open == null ? ['Lista para enviar', 'processing'] : ['Enviada', 'completed'])}</td></tr>`).join('')}</tbody></table></div>`, '', true) : ''}
      <div class="cols composer"><div>
        ${box('Nueva campaña', `
          <div class="field"><label for="mtpl">Plantilla</label><select id="mtpl" style="width:100%"><option value="novedades">Novedades y destacados</option><option value="promo">Promoción con cupón</option><option value="volver">Recuperar clientes</option></select></div>
          <div class="field"><label for="mseg">Para</label><select id="mseg" style="width:100%">${MAILSEG.map(([k, l]) => `<option value="${k}">${l} (${segCount(k)})</option>`).join('')}</select></div>
          <div class="field"><label for="ms">Asunto</label><input type="text" id="ms" maxlength="90" value="${esc(TPL.novedades[0])}" style="width:100%"></div>
          <div class="field"><label for="mtxt">Mensaje</label><textarea id="mtxt" rows="6">${esc(TPL.novedades[1])}</textarea><p class="muted small" style="margin:4px 0 0">{nombre} se reemplaza por el nombre de cada cliente. Se muestran los productos destacados de la portada.</p></div>
          <div class="field"><label for="mcp">Cupón (opcional)</label><select id="mcp" style="width:100%"><option value="">Sin cupón</option>${COUPONS.filter((c) => cpState(c)[0] === 'Activo').map((c) => `<option>${esc(c.code)}</option>`).join('')}</select></div>
          <div class="field"><label for="mwhen">Programar (opcional)</label><input type="datetime-local" id="mwhen"></div>
          <p class="muted small" id="mcount" style="margin:0"></p>`)}
      </div><div>
        <div class="postbox"><h2 class="hndle">Vista previa <span class="act">así le llega</span></h2><div class="inside" id="mprev"></div><div class="major-publishing-actions"><button class="button" data-act="mail-test">Enviarme una prueba</button><button class="button button-primary" data-act="mail-send">Enviar</button></div></div>
      </div></div>
      <p class="muted small">Todos los correos incluyen el enlace para darse de baja, como exige la ley. Los envía el servidor de la tienda: no hace falta Mailchimp ni otra plataforma. La vista previa usa tu nombre en lugar de {nombre}.</p>`;
  };
  function drawMail() {
    const el = $('#mprev'); if (!el) return;
    const subj = $('#ms').value.trim() || 'Asunto del correo', txt = $('#mtxt').value.replace(/\{nombre\}/g, 'Guillermo'), cp = COUPONS.find((c) => c.code === $('#mcp').value);
    const prods = [...featured].slice(0, 4).map((i) => byId.get(i)).filter(Boolean), n = segCount($('#mseg').value);
    $('#mcount').textContent = `Se enviará a ${plural(n, 'cliente', 'clientes')}.`;
    el.innerHTML = `<div class="mail"><div class="mail__h"><img src="/assets/logo.png" alt="" width="30" height="31"><svg class="brand__wm" viewBox="0 0 627 91" aria-hidden="true"><use href="#rc-wm"/></svg></div><div class="mail__b"><div class="mail__s">${esc(subj)}</div><p>${esc(txt).replace(/\n/g, '<br>')}</p>${cp ? `<div class="mail__cp">Usa el código <b>${esc(cp.code)}</b> · ${cpVal(cp)}${cp.to ? ` hasta el ${fDate(cp.to)}` : ''}</div>` : ''}<div class="mail__g">${prods.map((p) => `<div><img src="${img(p)}" alt=""><span>${esc(p.n.slice(0, 44))}</span><b>${clp(p.p)}</b></div>`).join('')}</div><span class="mail__btn">Ver en la tienda</span></div><div class="mail__f">Recibes este correo porque aceptaste novedades de Reycar Store. <u>Darte de baja</u> · Quinta Normal, Santiago</div></div>`;
  }

  /* ───────── analítica: tráfico propio e informe de ventas ───────── */
  const AN = {};
  const anNav = (tab) => `<nav class="nav-tab-wrapper">${[['resumen', 'Resumen'], ['trafico', 'Tráfico y búsquedas'], ['informe', 'Informe de ventas']].map(([k, l]) => `<a class="nav-tab${k === tab ? ' nav-tab-active' : ''}" href="#/analitica${k === 'resumen' ? '' : '?tab=' + k}">${l}</a>`).join('')}</nav>`;
  AN.trafico = (q) => {
    const terms = [...SEARCHES].sort((a, b) => b.n - a.n).map((x) => ({ ...x, hits: searchHits(x.t) }));
    return `
      <div class="wrap-h"><h1>Analítica</h1></div>${anNav('trafico')}
      ${emptyState('La medición empieza al publicar la tienda nueva', 'Desde que reycarstore.cl apunte a esta tienda, aquí se ven las visitas por fuente y su conversión, las páginas más vistas y lo que la gente escribe en el buscador, sin depender de Google Analytics ni de cookies de terceros.', '', 'chart')}
      ${terms.length ? box('Lo que buscan en la tienda', `<table class="mini"><thead><tr><td><b>Búsqueda</b></td><td class="num"><b>Veces</b></td><td class="num"><b>Resultados</b></td><td><b>Qué hacer</b></td></tr></thead><tbody>${terms.map((x) => `<tr><td><b>${esc(x.t)}</b></td><td class="num">${miles(x.n)}</td><td class="num">${x.hits}</td><td>${SYN.has(x.t) ? `<span class="tag tag--org">Lleva a: ${esc(gById.get(SYN.get(x.t)).name)}</span>` : x.hits === 0 ? `<span class="tag tag--bad">Sin resultados</span> <button class="button" data-act="syn" data-term="${esc(x.t)}">Redirigir búsqueda</button>` : '<span class="muted small">Bien cubierta</span>'}</td></tr>`).join('')}</tbody></table>`, '', true) : ''}`;
  };
  const monthKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`; };
  function salesReport(mk) {
    const [y, m] = mk.split('-').map(Number), start = new Date(y, m - 1, 1).getTime(), end = new Date(y, m, 1).getTime(), nd = new Date(y, m, 0).getDate();
    const docs = ORDERS.filter((o) => o.doc && o.t >= start && o.t < end), ncs = ORDERS.flatMap((o) => (o.ncs || []).map((n) => ({ ...n, o }))).filter((n) => n.t >= start && n.t < end);
    const days = Array.from({ length: nd }, (_, i) => { const d0 = new Date(y, m - 1, i + 1).getTime(), d1 = new Date(y, m - 1, i + 2).getTime(); const ds = docs.filter((o) => o.t >= d0 && o.t < d1), ns = ncs.filter((n) => n.t >= d0 && n.t < d1); const total = ds.reduce((s, o) => s + o.total, 0) - ns.reduce((s, n) => s + n.a, 0); return { d: d0, bol: ds.filter((o) => !o.fac).length, fac: ds.filter((o) => o.fac).length, nc: ns.length, total, neto: Math.round(total / 1.19) }; }).filter((x) => x.d <= Date.now());
    const T = days.reduce((s, x) => ({ bol: s.bol + x.bol, fac: s.fac + x.fac, nc: s.nc + x.nc, total: s.total + x.total, neto: s.neto + x.neto }), { bol: 0, fac: 0, nc: 0, total: 0, neto: 0 });
    return { y, m, days, T, docs, ncs, pay: groupBy(docs, (o) => o.pay), ship: docs.reduce((s, o) => s + o.ship.cost, 0), disc: docs.reduce((s, o) => s + (o.disc || 0), 0) };
  }
  AN.informe = (q) => {
    const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(NOW); d.setDate(1); d.setMonth(d.getMonth() - i); return monthKey(d.getTime()); });
    const mk = months.includes(q.get('m')) ? q.get('m') : months[0], R = salesReport(mk);
    return `
      <div class="wrap-h no-print"><h1>Analítica</h1><select aria-label="Mes" data-qsel="m">${months.map((k) => { const [y, m] = k.split('-'); return `<option value="${k}"${k === mk ? ' selected' : ''}>${MESL[+m - 1]} ${y}</option>`; }).join('')}</select><button class="button" data-act="csv-informe" data-m="${mk}">Exportar a Excel</button><button class="button" data-act="imprimir">Imprimir</button></div>
      <div class="no-print">${anNav('informe')}</div>
      <div class="print-only print-head"><img src="/assets/logo.png" alt="" width="40" height="41"><div><b>Reycar Store · Informe de ventas de ${MESL[R.m - 1]} ${R.y}</b><br>Generado el ${fFull(Date.now())}</div></div>
      ${!(R.docs.length || R.ncs.length) ? emptyState(`Sin documentos en ${MESL[R.m - 1]} ${R.y}`, 'El informe muestra día por día las boletas, facturas y notas de crédito emitidas en Bsale, con neto, IVA y total, más los totales por medio de pago. Se exporta a Excel para el contador.', '', 'chart') : `<div class="tiles">${tile('Ventas del mes (con IVA)', clp(R.T.total), 'boletas + facturas − notas de crédito')}${tile('Neto', clp(R.T.neto), 'sin IVA')}${tile('IVA débito', clp(R.T.total - R.T.neto), '19 %')}${tile('Documentos emitidos', miles(R.T.bol + R.T.fac + R.T.nc), `${plural(R.T.bol, 'boleta', 'boletas')} · ${plural(R.T.fac, 'factura', 'facturas')} · ${plural(R.T.nc, 'nota de crédito', 'notas de crédito')}`)}</div>
      <div class="dash">
        ${box('Por medio de pago', `<table class="mini"><tbody>${R.pay.map((x) => `<tr><td>${esc(x.l)}</td><td class="num">${plural(x.n, 'venta', 'ventas')}</td><td class="num">${clp(x.v)}</td></tr>`).join('') || '<tr><td class="muted">Sin ventas.</td></tr>'}</tbody></table>`, '', true)}
        ${box('Otros totales', `<dl class="kv"><dt>Envíos cobrados</dt><dd>${clp(R.ship)}</dd><dt>Descuentos con cupón</dt><dd>${clp(R.disc)}</dd><dt>Devoluciones</dt><dd>${clp(R.ncs.reduce((s, n) => s + n.a, 0))}</dd><dt>Ticket promedio</dt><dd>${clp(R.docs.length ? R.docs.reduce((s, o) => s + o.total, 0) / R.docs.length : 0)}</dd></dl>`)}
      </div>
      ${box('Detalle por día', `<div style="overflow-x:auto"><table class="mini"><thead><tr><td><b>Día</b></td><td class="num"><b>Boletas</b></td><td class="num"><b>Facturas</b></td><td class="num"><b>N. crédito</b></td><td class="num"><b>Neto</b></td><td class="num"><b>IVA</b></td><td class="num"><b>Total</b></td></tr></thead><tbody>${R.days.map((x) => `<tr><td class="nw">${fDate(x.d)}</td><td class="num">${x.bol}</td><td class="num">${x.fac}</td><td class="num">${x.nc}</td><td class="num">${clp(x.neto)}</td><td class="num">${clp(x.total - x.neto)}</td><td class="num"><b>${clp(x.total)}</b></td></tr>`).join('')}<tr class="sumrow"><td><b>Total</b></td><td class="num"><b>${R.T.bol}</b></td><td class="num"><b>${R.T.fac}</b></td><td class="num"><b>${R.T.nc}</b></td><td class="num"><b>${clp(R.T.neto)}</b></td><td class="num"><b>${clp(R.T.total - R.T.neto)}</b></td><td class="num"><b>${clp(R.T.total)}</b></td></tr></tbody></table></div>`, `${MESL[R.m - 1]} ${R.y}`, true)}
      <div class="notice"><p>Para revisar con el contador. Los documentos son los emitidos en Bsale; el registro oficial de ventas es el del SII.</p></div>`}`;
  };

  /* ───────── productos: crear, stock y edición en lote ───────── */
  V.nuevoProducto = () => {
    const brands = [...new Set(HEADS.map((x) => x.b).filter(Boolean))].sort((a, z) => a.localeCompare(z, 'es'));
    return `
      <div class="wrap-h"><h1>Nuevo producto</h1><a class="button" href="#/productos">Cancelar</a></div>
      <p class="muted" style="margin:-8px 0 18px">Se crea a la vez en Bsale (con su SKU, precio y stock) y en la tienda. No hace falta entrar a Bsale.</p>
      <div class="cols"><div>
        ${box('Datos principales', `<div class="field"><label for="npN">Nombre</label><input type="text" id="npN" maxlength="150" placeholder="Ej: Shampoo pH neutro Motor Clean 1 L" style="width:100%"></div>
          <div class="grid2"><div class="field"><label for="npP">Precio con IVA ($)</label><input type="number" id="npP" min="0" step="10" style="width:100%"></div><div class="field"><label for="npS">Stock inicial</label><input type="number" id="npS" min="0" step="1" value="0" style="width:100%"></div></div>
          <div class="field"><label for="npK">Código de barras o SKU</label><span style="display:flex;gap:6px"><input type="text" id="npK" placeholder="Escanéalo con la pistola o genera uno" style="flex:1"><button class="button" data-act="np-ean">Generar</button></span><p class="muted small" style="margin:4px 0 0">Mejor el código de barras del fabricante: Google lo usa para mostrar el producto en Shopping.</p></div>
          <div class="field" style="margin:0"><label for="npD">Descripción</label><textarea id="npD" rows="6" placeholder="Para qué sirve, cómo se usa, rendimiento y formato."></textarea><p class="muted small" style="margin:4px 0 0">Sin descripción, Meta y Google rechazan el producto en los catálogos de anuncios.</p></div>`)}
      </div><div>
        ${box('Organización', `<div class="field"><label for="npB">Marca</label><input type="text" id="npB" list="npBl" style="width:100%"><datalist id="npBl">${brands.map((x) => `<option>${esc(x)}</option>`).join('')}</datalist></div>
          <div class="field"><label for="npG">Categoría</label><select id="npG" style="width:100%"><option value="">Elegir…</option>${GROUPS.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="npSC">Subcategoría</label><select id="npSC" style="width:100%" disabled><option value="">Primero elige la categoría</option></select></div>
          <label class="switch"><input type="checkbox" id="npV"> Publicar en la tienda al crearlo</label>`)}
        ${box('Foto', '<div class="dropzone"><b>Arrastra la foto aquí</b><span>o</span><button class="button" data-act="foto">Elegir archivo</button><small>Se recorta, centra y optimiza sola. Ideal fondo blanco.</small></div>')}
        <div class="postbox"><div class="major-publishing-actions" style="border-top:0"><span class="muted small">Se crea en Bsale y en la tienda</span><button class="button button-primary" data-act="np-crear">Crear producto</button></div></div>
      </div></div>`;
  };
  function productCreate() {
    const v = (id) => $(id).value.trim(), n = v('#npN'), price = Math.round(+v('#npP')), stk = +v('#npS'), sku = v('#npK') || ean13(), g = v('#npG');
    if (n.length < 5) return toast('Escribe el nombre completo del producto.');
    if (!(price > 0)) return toast('Indica el precio con IVA.');
    if (!Number.isInteger(stk) || stk < 0) return toast('El stock debe ser un número entero, 0 o más.');
    if (!g) return toast('Elige la categoría.');
    if (ALL.some((p) => p.sku === sku)) return toast('Ya existe un producto con ese código.');
    let s = slugify(n), k = 2; while (ALL.some((p) => p.s === s)) s = `${slugify(n)}-${k++}`;
    const p = { id: nextId(ALL), n, s, p: price, b: v('#npB'), g, sc: v('#npSC'), c: [], im: [], stk, d: v('#npD'), sku, mov: [{ t: Date.now(), type: 'in', n: stk, before: 0, after: stk, r: 'Stock inicial', by: 'Guillermo' }] };
    ALL.push(p); HEADS.push(p); byId.set(p.id, p);
    if (!$('#npV').checked) hidden.add(p.id);
    log('Productos', `Creó "${n}" (SKU ${sku}, ${clp(price)}, ${stk} u.)`);
    location.hash = `/producto/${p.id}`;
    toast(`Producto creado${CONNECTED ? ' en Bsale y en la tienda' : ''}${hidden.has(p.id) ? ', oculto hasta que lo publiques' : ''}. Falta subir la foto. ${CONNECTED ? '' : NOSAVE}`);
  }
  function stockModal(p) {
    const vs = p.vs || [p];
    modal('Ajustar stock', `
      ${vs.length > 1 ? `<div class="field"><label for="saV">Formato</label><select id="saV" style="width:100%">${vs.map((x) => `<option value="${x.id}">${esc(x.n)} · ${x.stk ?? '—'} en stock</option>`).join('')}</select></div>` : `<input type="hidden" id="saV" value="${p.id}"><p style="margin-top:0"><b>${esc(p.n)}</b> · ${p.stk ?? '—'} en stock</p>`}
      <div class="field"><label for="saT">Movimiento</label><select id="saT" style="width:100%"><option value="in">Llegó mercadería (suma)</option><option value="out">Merma, daño o uso en el taller (resta)</option><option value="set">Corrección por conteo (deja el total)</option></select></div>
      <div class="grid2"><div class="field"><label for="saN">Cantidad</label><input type="number" id="saN" min="0" step="1"></div><div class="field"><label for="saR">Detalle</label><input type="text" id="saR" placeholder="Ej: factura N° 1234"></div></div>
      <p class="muted small" style="margin:0">Se registra en Bsale como recepción o consumo de stock en Casa Matriz, y queda en el historial.</p>`,
      `<button class="button" data-act="dlg-close">Cancelar</button><button class="button button-primary" data-act="stock-ok" data-id="${p.id}">Guardar movimiento</button>`);
  }
  function stockApply(head) {
    const p = byId.get(+$('#saV').value), type = $('#saT').value, n = +$('#saN').value, r = $('#saR').value.trim();
    if (!Number.isInteger(n) || n < 0 || $('#saN').value === '') return toast('La cantidad debe ser un número entero.');
    const before = p.stk || 0;
    if (type === 'out' && n > before) return toast(`No puedes restar ${n}: hay ${before} en stock.`);
    if (type !== 'set' && !n) return toast('La cantidad debe ser mayor que 0.');
    const after = type === 'in' ? before + n : type === 'out' ? before - n : n;
    p.stk = after;
    (head.mov = head.mov || []).unshift({ t: Date.now(), type, n, before, after, r, by: 'Guillermo', v: p !== head ? p.n : '' });
    log('Stock', `${{ in: 'Ingreso', out: 'Salida', set: 'Corrección' }[type]} de "${p.n}": ${before} → ${after}${r ? ` (${r})` : ''}`);
    closeModal(); route(); toast(`Stock actualizado: ${before} → ${after}.${CONNECTED ? ' Registrado en Bsale.' : ' ' + NOSAVE}`);
  }
  const PERMS = [['Pedidos y despachos', 1, 1, 1], ['Ventas manuales', 1, 1, 0], ['Productos y stock', 1, 1, 1], ['Cambiar precios', 1, 0, 0], ['Clientes', 1, 1, 0], ['Exportar datos de clientes', 1, 0, 0], ['Marketing, cupones y correos', 1, 1, 0], ['Portada', 1, 1, 0], ['Agenda del taller', 1, 1, 1], ['Analítica e informe de ventas', 1, 1, 0], ['Ajustes, claves y usuarios', 1, 0, 0]];
  function shortcutsModal() {
    modal('Atajos de teclado', `<table class="mini keys"><tbody>${[['/', 'Buscar pedidos, productos o clientes'], ['n', 'Nuevo pedido'], ['g  e', 'Ir al escritorio'], ['g  p', 'Ir a pedidos'], ['g  d', 'Ir a despachos'], ['g  r', 'Ir a productos'], ['g  c', 'Ir a clientes'], ['g  t', 'Ir a la agenda del taller'], ['g  m', 'Ir a marketing'], ['g  a', 'Ir a analítica'], ['?', 'Ver esta ayuda'], ['Esc', 'Cerrar ventanas y menús']].map(([k, d]) => `<tr><td class="nw">${k.split('  ').map((x) => `<kbd>${x}</kbd>`).join(' luego ')}</td><td>${d}</td></tr>`).join('')}</tbody></table>`, '<button class="button button-primary" data-act="dlg-close">Entendido</button>');
  }

  /* ───────── enrutador (#/seccion/id?filtros) ───────── */
  const TITLES = { taller: 'Agenda del taller', resenas: 'Reseñas', cliente: 'Cliente', despachos: 'Despachos', inventario: 'Inventario y reposición', marketing: 'Marketing', portada: 'Portada', actividad: 'Registro de actividad', dash: 'Escritorio', pedidos: 'Pedidos', pedido: 'Editar pedido', productos: 'Productos', producto: 'Editar producto', clientes: 'Clientes', analitica: 'Analítica', seo: 'SEO', usuarios: 'Usuarios', ajustes: 'Ajustes' };
  function route() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = h.split('?'), q = new URLSearchParams(qs || ''), parts = path.split('/').filter(Boolean);
    const sec = parts[0] || '', key = sec === '' || sec === 'escritorio' ? 'dash' : sec, view = V[key];
    hideTip();
    drawMenu(sec, q, path);
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
  let gKey = 0, DRAFT_MAIL = null;
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setMenu(false); closePops(); return; }
    if ($('#dlg').open || e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); $('#gsearch').focus(); return; }
    if (e.key === '?') { e.preventDefault(); shortcutsModal(); return; }
    if (e.key === 'g') { gKey = Date.now(); return; }
    if (Date.now() - gKey < 1500) { gKey = 0; const to = { e: '/', p: '/pedidos', d: '/despachos', r: '/productos', c: '/clientes', t: '/taller', m: '/marketing', a: '/analitica' }[e.key]; if (to) { e.preventDefault(); location.hash = to; } return; }
    if (e.key === 'n') { e.preventDefault(); location.hash = '/pedido/nuevo'; }
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
    for (const [k, v] of fd) if (k !== 'bulk' && k !== 'pbulk') set[k] = String(v).trim();
    location.hash = href(`#/${f.dataset.form}`, cur, set).slice(1);
  });
  document.addEventListener('input', (e) => {
    const t = e.target, b = t.dataset && t.dataset.ban;
    if (b != null) HOME.banners[+b][t.dataset.k] = t.value;
    if (t.id === 'dps' || t.id === 'dcs') draftSearch(t);
    if (t.matches('.dq') && DRAFT) { const l = DRAFT.lines[+t.dataset.i]; if (!l) return; const n = Math.max(1, Math.min(Math.floor(+t.value || 1), l.p.stk || 999)); l.q = n; $('#dlt' + t.dataset.i).textContent = clp(n * l.p.p); drawDraft('t'); }
    if (t.id === 'dshipc') { DRAFT.shipCost = Math.max(0, Math.round(+t.value || 0)); drawDraft('t'); }
    if (t.matches('[data-rq], #rfShip')) { const o = oId.get(+$('#rfBtn').dataset.id), a = rfAmount(o); $('#rfBtn').textContent = `Reembolsar ${clp(a)}`; $('#rfBtn').disabled = !a; }
    if (t.closest('.composer')) drawMail();
    if (t.matches('[data-svp]')) SERVICES[+t.dataset.svp].p = Math.max(0, +t.value || 0);
    if (t.matches('[data-svm]')) SERVICES[+t.dataset.svm].min = Math.max(30, +t.value || 30);
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'dship') { DRAFT.ship = +t.value; DRAFT.shipCost = SHIP_M[DRAFT.ship][1]; $('#dshipc').value = DRAFT.shipCost; drawDraft('t'); }
    if (t.name === 'dpay') DRAFT.pay = t.value;
    if (t.id === 'dfac') DRAFT.fac = t.checked;
    if (t.matches('.dq')) setTimeout(() => { if (DRAFT && $('#dLines')) drawDraft('l'); });
    if (t.id === 'npG') { const g = gById.get(t.value), sc = $('#npSC'); sc.innerHTML = g && (g.subs || []).length ? '<option value="">Sin subcategoría</option>' + g.subs.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('') : '<option value="">No tiene subcategorías</option>'; sc.disabled = !(g && (g.subs || []).length); }
    if (t.id === 'mtpl') { const [sj, tx] = TPL[t.value]; $('#ms').value = sj; $('#mtxt').value = tx; if (t.value !== 'novedades' && !$('#mcp').value && $('#mcp').options.length > 1) $('#mcp').selectedIndex = 1; drawMail(); }
    if (t.matches('[data-consent]')) { const c = CUST.find((x) => x.id === +t.dataset.id); c.consent[t.dataset.consent] = t.checked; log('Cliente', `${t.checked ? 'Activó' : 'Quitó'} el permiso de ${t.dataset.consent === 'mail' ? 'correos' : 'WhatsApp'} de ${custName(c)}`); toast('Permiso actualizado. Queda registrado con fecha y responsable.'); }
    if (t.matches('[data-qsel]')) { const cur = new URLSearchParams((location.hash.split('?')[1]) || ''); location.hash = href(location.hash.split('?')[0], cur, { [t.dataset.qsel]: t.value }).slice(1); }
    if (e.target.matches('[data-all]')) $$('tbody input[type=checkbox]', e.target.closest('table')).forEach((c) => (c.checked = e.target.checked));
  });
  document.addEventListener('click', (e) => {
    const qb = e.target.closest('[data-q]');
    if (qb) { const [k, v] = qb.dataset.q.split('='); const cur = new URLSearchParams((location.hash.split('?')[1]) || ''); location.hash = href(location.hash.split('?')[0] || '#/', cur, { [k]: v }).slice(1); return; }
    const tab = e.target.closest('.pdata [data-tab]');
    if (tab) { const w = tab.closest('.pdata'); $$('[data-tab]', w).forEach((b) => b.setAttribute('aria-selected', String(b === tab))); $$('[data-panel]', w).forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab)); return; }
    if (!e.target.closest('.tb-search')) $('#gres').hidden = true;
    if (!e.target.closest('.picker')) $$('.picker__r').forEach((r) => (r.hidden = true));
    if (e.target === $('#dlg')) closeModal();
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
      if (act === 'nota') { const o = oId.get(id), txt = $('#nn').value.trim(); if (!txt) return toast('Escribe la nota primero.'); const n = { t: Date.now(), txt, kind: $('#nk').value, by: 'Guillermo' }; o.notes.push(n); $('#notes').insertAdjacentHTML('afterbegin', noteHtml(n)); $('#nn').value = ''; return toast(n.kind === 'customer' ? 'Nota para el cliente guardada; le llega por correo.' : 'Nota privada guardada.'); }
      if (act === 'guardar-producto') {
        const p = byId.get(id), multi = $$('[data-vp]').length > 1, name = $('#pt').value.trim(), price = multi ? p.p : Math.round(+$('#pp').value), offer = $('#po').value ? Math.round(+$('#po').value) : 0;
        if (name.length < 5) return toast('El nombre es muy corto.');
        if (!(price > 0)) return toast('El precio debe ser mayor que 0.');
        if (offer && offer >= price) return toast('El precio de oferta debe ser menor que el precio normal.');
        if ($('#pod').value && $('#poh').value && $('#poh').value < $('#pod').value) return toast('La oferta termina antes de empezar: revisa las fechas.');
        const vps = multi ? $$('[data-vp]') : []; for (const el of vps) if (!(+el.value > 0)) return toast('Cada formato necesita un precio mayor que 0.');
        const ch = []; if (name !== p.n) ch.push('nombre'); if (price !== p.p) ch.push(`precio ${clp(p.p)} → ${clp(price)}`);
        p.n = name; p.p = price; p.po = offer || ''; p.pod = $('#pod').value; p.poh = $('#poh').value;
        vps.forEach((el) => { const v = byId.get(+el.dataset.vp), np = Math.round(+el.value); if (v.p !== np) { ch.push(`${v.n.slice(0, 30)}: ${clp(v.p)} → ${clp(np)}`); v.p = np; } });
        if (multi) { p.vs.sort((x, y) => x.p - y.p); }
        const v = $('#pv').value === '1'; v ? hidden.delete(id) : hidden.add(id); $('#pf').checked ? featured.add(id) : featured.delete(id); seo.set(id, { t: $('#seoT').value, d: $('#seoD').value });
        log('Productos', `Actualizó "${name}"${ch.length ? ': ' + ch.join(', ') : ''}`); route();
        return toast(ch.length ? `Guardado${CONNECTED ? ' y sincronizado con Bsale' : ''}: ${ch.join(', ')}. ${CONNECTED ? '' : NOSAVE}` : `Producto actualizado. ${CONNECTED ? '' : NOSAVE}`);
      }
      if (act === 'dlg-close') return closeModal();
      if (act === 'reembolso') return refundModal(oId.get(id));
      if (act === 'rf-ok') return refundApply(oId.get(id));
      if (act === 'd-add') { const p = byId.get(id), l = DRAFT.lines.find((x) => x.p === p); if (p.stk === 0) return toast('Ese producto está agotado.'); if (l) l.q = Math.min(l.q + 1, p.stk || 999); else DRAFT.lines.push({ p, q: 1 }); $('#dps').value = ''; $('#dpr').hidden = true; drawDraft('lt'); return $('#dps').focus(); }
      if (act === 'd-del') { DRAFT.lines.splice(+a.dataset.i, 1); return drawDraft('lt'); }
      if (act === 'd-cust') { DRAFT.c = CUST.find((x) => x.id === id); DRAFT.fac = !!DRAFT.c.emp && false; return drawDraft('ct'); }
      if (act === 'd-cust-x') { DRAFT.c = null; DRAFT.fac = false; return drawDraft('c'); }
      if (act === 'd-reset') { DRAFT = null; return route(); }
      if (act === 'd-for') { DRAFT = newDraft(CUST.find((x) => x.id === id)); location.hash = '/pedido/nuevo'; return; }
      if (act === 'd-cupon') {
        const code = $('#dcp').value.trim().toUpperCase(), c = COUPONS.find((x) => x.code === code), T = draftTot(DRAFT);
        if (!code) return toast('Escribe el código del cupón.');
        if (!c) return toast('Ese cupón no existe.');
        const st = cpState(c)[0]; if (st !== 'Activo') return toast(`El cupón ${code} está ${st.toLowerCase()}.`);
        if (c.min && T.sub < c.min) return toast(`${code} requiere una compra mínima de ${clp(c.min)}.`);
        if (/primera/.test(c.scope) && DRAFT.c && cstats().get(DRAFT.c) && cstats().get(DRAFT.c).n) return toast(`${code} es solo para la primera compra, y este cliente ya compró.`);
        if (/Motor Clean/.test(c.scope) && !DRAFT.lines.some((l) => l.p.b === 'Motor Clean')) return toast(`${code} es solo para productos Motor Clean.`);
        DRAFT.cp = c; $('#dcp').value = ''; drawDraft('t'); return toast(`Cupón ${code} aplicado.`);
      }
      if (act === 'd-cupon-x') { DRAFT.cp = null; return drawDraft('t'); }
      if (act === 'd-crear') return draftCreate();
      if (act === 'c-nota') { const c = CUST.find((x) => x.id === id), txt = $('#cnn').value.trim(); if (!txt) return toast('Escribe la nota primero.'); c.cnotes.unshift({ t: Date.now(), txt, kind: 'private', by: 'Guillermo' }); log('Cliente', `Agregó una nota a ${custName(c)}`); route(); return toast('Nota guardada. Solo la ve el equipo.'); }
      if (act === 'c-tag') { const c = CUST.find((x) => x.id === id), t = $('#ctag').value.trim(); if (!t) return toast('Escribe la etiqueta.'); if (!c.tags.includes(t)) c.tags.push(t); return route(); }
      if (act === 'c-untag') { const c = CUST.find((x) => x.id === id); c.tags.splice(+a.dataset.i, 1); return route(); }
      if (act === 'c-export') {
        const c = CUST.find((x) => x.id === id), st = cstats().get(c);
        const data = { exportado: new Date().toISOString(), cliente: { nombre: custName(c), correo: c.email, telefono: c.phone, rut: c.rut, direccion: c.street, comuna: c.comuna, region: c.region, empresa: c.emp, etiquetas: c.tags, permisos: c.consent }, pedidos: st.orders.map((o) => ({ numero: o.id, fecha: new Date(o.t).toISOString(), estado: ST[o.st], total: o.total, productos: o.lines.map((l) => `${l.q} × ${l.p.n}`) })), taller: BOOK.filter((b) => b.c === c).map((b) => ({ fecha: new Date(b.day + b.start * MIN).toISOString(), servicio: b.sv.n, vehiculo: b.car, patente: b.plate })), resenas: REVIEWS.filter((r) => r.c === c).map((r) => ({ fecha: new Date(r.t).toISOString(), estrellas: r.r, texto: r.txt })) };
        const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); el.download = `datos-cliente-${c.id}.json`; document.body.appendChild(el); el.click(); setTimeout(() => { URL.revokeObjectURL(el.href); el.remove(); }, 500);
        log('Privacidad', `Exportó los datos personales de ${custName(c)} a pedido del cliente`); return toast('Se descargó el archivo con todos sus datos. Queda en el registro de actividad.');
      }
      if (act === 'c-borrar') return confirmBox('Borrar datos personales', 'Se borran nombre, correo, teléfono, RUT y dirección, y se quitan los permisos de contacto. Los pedidos y boletas se conservan sin datos personales, por obligación tributaria. No se puede deshacer.', 'c-borrar-ok', 'Borrar datos', id);
      if (act === 'c-borrar-ok') { const c = CUST.find((x) => x.id === id); const was = custName(c); Object.assign(c, { first: 'Cliente', last: `eliminado #${c.id}`, email: '—', phone: '—', rut: '—', street: '—', tags: [], cnotes: [], consent: { mail: false, wa: false } }); if (c.emp) c.emp = { ...c.emp, name: 'Empresa eliminada' }; log('Privacidad', `Borró los datos personales de ${was} a pedido del cliente`); closeModal(); route(); return toast('Datos personales borrados. Queda registrado.'); }
      if (act === 'bk-ver') return bookingModal(BOOK.find((b) => b.id === id));
      if (act === 'bk-save') { const b = BOOK.find((x) => x.id === id), st = $('#bkst').value; if (st !== b.st) { log('Taller', `${fmtPlate(b.plate)}: ${BK_ST[b.st][0]} → ${BK_ST[st][0]}`); b.st = st; } closeModal(); route(); return toast(st === 'listo' ? 'Marcado como listo para entregar. Usa "Recordatorio por WhatsApp" para avisarle.' : 'Reserva actualizada.'); }
      if (act === 'bk-wa') { const b = BOOK.find((x) => x.id === id); return void waOpen(b.c.phone, b.st === 'listo' ? `Hola ${b.c.first}, tu ${b.car} ya está listo para retirar en Reycar, Quinta Normal.` : `Hola ${b.c.first}, te recordamos tu hora en Reycar: ${WDAYS[(new Date(b.day).getDay() + 6) % 7].toLowerCase()} ${fDay(b.day)} a las ${hm(b.start)} (${b.sv.n}).`); }
      if (act === 'bk-del') return confirmBox('Cancelar reserva', 'La hora queda libre para otro cliente.', 'bk-del-ok', 'Cancelar reserva', id);
      if (act === 'bk-del-ok') { const i = BOOK.findIndex((x) => x.id === id), b = BOOK[i]; BOOK.splice(i, 1); log('Taller', `Canceló la reserva de ${fmtPlate(b.plate)} del ${fDay(b.day)}`); closeModal(); route(); return toast('Reserva cancelada.'); }
      if (act === 'bk-nueva') return SERVICES.length ? newBookingModal() : toast('Primero agrega un servicio de taller en Productos (categoría "Servicios de taller").');
      if (act === 'bk-ok') return bookingCreate();
      if (act === 'sv-save') { log('Taller', 'Actualizó servicios y precios'); return toast(`Servicios guardados. ${NOSAVE}`); }
      if (act === 'rv-ok' || act === 'rv-show') { const r = REVIEWS.find((x) => x.id === id); r.st = 'ok'; log('Reseñas', `Publicó una reseña de ${r.r} estrellas`); route(); return toast('Reseña publicada en la tienda.'); }
      if (act === 'rv-hide') return confirmBox('Ocultar reseña', 'Úsalo solo para spam u ofensas. Ocultar opiniones negativas genuinas afecta la confianza y puede infringir la ley del consumidor.', 'rv-hide-ok', 'Ocultar', id);
      if (act === 'rv-hide-ok') { const r = REVIEWS.find((x) => x.id === id); r.st = 'hid'; log('Reseñas', 'Ocultó una reseña como spam'); closeModal(); route(); return toast('Reseña oculta.'); }
      if (act === 'rv-reply') { const r = REVIEWS.find((x) => x.id === id); return modal('Responder reseña', `<p style="margin-top:0">${stars(r.r)} ${esc(r.txt)}</p><div class="field"><label for="rvt">Respuesta pública</label><textarea id="rvt" rows="4" maxlength="600">${esc(r.reply || `Hola ${r.c.first}, gracias por tu opinión. `)}</textarea></div><p class="muted small" style="margin:0">Se muestra debajo de la reseña, firmada por Reycar Store.</p>`, `<button class="button" data-act="dlg-close">Cancelar</button><button class="button button-primary" data-act="rv-reply-ok" data-id="${r.id}">Publicar respuesta</button>`); }
      if (act === 'rv-reply-ok') { const r = REVIEWS.find((x) => x.id === id), t = $('#rvt').value.trim(); if (t.length < 5) return toast('Escribe la respuesta.'); r.reply = t; if (r.st === 'pend') r.st = 'ok'; log('Reseñas', 'Respondió una reseña'); closeModal(); route(); return toast('Respuesta publicada.'); }
      if (act === 'mail-test') return toast('La prueba se envía a tu correo cuando el envío de correos esté conectado.');
      if (act === 'mail-send') {
        const subj = $('#ms').value.trim(), txt = $('#mtxt').value.trim(), seg = $('#mseg').value, n = segCount(seg), when = $('#mwhen').value;
        if (subj.length < 5) return toast('Escribe el asunto.'); if (txt.length < 10) return toast('Escribe el mensaje.'); if (!n) return toast('Ese grupo no tiene clientes con permiso para recibir correos.');
        if (when && new Date(when).getTime() < Date.now()) return toast('La fecha programada ya pasó.');
        DRAFT_MAIL = { subj, seg, n, when };
        return confirmBox(when ? 'Programar campaña' : 'Enviar campaña', `"${esc(subj)}" ${when ? `se enviará el ${fFull(new Date(when).getTime())}` : 'se enviará ahora'} a <b>${plural(n, 'cliente', 'clientes')}</b>.`, 'mail-ok', when ? 'Programar' : 'Enviar ahora');
      }
      if (act === 'mail-ok') { const m = DRAFT_MAIL; CAMPAIGNS.unshift({ subj: m.subj, seg: m.seg, n: m.n, t: m.when ? new Date(m.when).getTime() : Date.now(), st: m.when ? 'prog' : 'sent', open: null, click: null, orders: null }); log('Marketing', `${m.when ? 'Programó' : 'Envió'} la campaña "${m.subj}" a ${m.n} clientes`); closeModal(); route(); return toast(m.when ? 'Campaña programada.' : `Campaña lista para ${plural(m.n, 'cliente', 'clientes')}. Sale cuando el envío de correos esté conectado.`); }
      if (act === 'syn') { const term = a.dataset.term; return modal(`Redirigir "${term}"`, `<p style="margin-top:0">Nadie encuentra nada al buscar <b>${esc(term)}</b>. Elige a dónde llevarlo:</p><div class="field"><label for="synG">Mostrar la categoría</label><select id="synG" style="width:100%">${GROUPS.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div>`, `<button class="button" data-act="dlg-close">Cancelar</button><button class="button button-primary" data-act="syn-ok" data-term="${esc(term)}">Guardar</button>`); }
      if (act === 'syn-ok') { SYN.set(a.dataset.term, $('#synG').value); log('Tienda', `La búsqueda "${a.dataset.term}" ahora lleva a ${gById.get($('#synG').value).name}`); closeModal(); route(); return toast('Listo: esa búsqueda ya no queda vacía.'); }
      if (act === 'csv-informe') { const R2 = salesReport(a.dataset.m); csv(`informe-ventas-${a.dataset.m}.csv`, ['Día', 'Boletas', 'Facturas', 'Notas de crédito', 'Neto', 'IVA', 'Total'], R2.days.map((x) => [fDate(x.d), x.bol, x.fac, x.nc, x.neto, x.total - x.neto, x.total])); log('Exportación', `Exportó el informe de ventas de ${a.dataset.m}`); return toast('Se descargó el informe del mes.'); }
      if (act === 'stock-adj') return stockModal(byId.get(id));
      if (act === 'stock-ok') return stockApply(byId.get(id));
      if (act === 'np-ean') { $('#npK').value = ean13(); return toast('Código interno generado (empieza con 2: solo para uso en la tienda).'); }
      if (act === 'np-crear') return productCreate();
      if (act === 'atajos') return shortcutsModal();
      if (act === 'pbulk') {
        const v = $('[name=pbulk]').value, ids = $$('tbody input[type=checkbox]:checked').map((c) => +c.value).filter(Boolean);
        if (!v || !ids.length) return toast('Elige una acción y marca al menos un producto.');
        ids.forEach((i) => { const p = byId.get(i); if (v === 'show') hidden.delete(i); if (v === 'hide') hidden.add(i); if (v === 'feat') featured.add(i); if (v === 'unfeat') featured.delete(i); if (v.startsWith('g:')) [p, ...(p.vs || [])].forEach((x) => { x.g = v.slice(2); x.sc = ''; }); });
        log('Productos', `Acción en lote sobre ${ids.length} productos`); route(); return toast(`${plural(ids.length, 'producto actualizado', 'productos actualizados')}. ${NOSAVE}`);
      }
      const o = oId.get(id), note = (txt, kind = 'private', by = 'Guillermo') => o.notes.push({ t: Date.now(), txt, kind, by });
      if (act === 'prep') { o.prep = true; note('Pedido preparado y embalado.'); log(`Pedido #${o.id}`, 'Lo marcó como preparado'); route(); return toast(`#${o.id} preparado. ${isPick(o) ? 'Ahora avisa al cliente que puede retirarlo.' : 'Ahora genera la etiqueta.'}`); }
      if (act === 'avisar') { if (waOpen(o.c.phone, `Hola ${o.c.first}, tu pedido #${o.id} de Reycar Store ya está listo para retiro en Quinta Normal.`)) { note('Se avisó por WhatsApp que el pedido está listo para retiro.', 'customer'); route(); } return; }
      if (act === 'retirado') { note('El cliente retiró el pedido en la tienda.'); setStatus(o, 'completed'); route(); return toast(`#${o.id} entregado y completado.`); }
      if (act === 'etiqueta') { Object.assign(o.ship, { track: String(1e9 + Math.floor(Math.random() * 8.9e9)), carrier: o.ship.carrier || 'Starken' }); note(`Envío creado en Sendu con ${o.ship.carrier}. N° de seguimiento ${o.ship.track}.`, 'customer'); setStatus(o, 'completed'); route(); return toast(`Etiqueta de ${o.ship.carrier} generada con el N° ${o.ship.track}. Al conectar Sendu se descarga el PDF para imprimir.`); }
      if (act === 'seguimiento') return toast(`${o.ship.carrier} · N° de seguimiento ${o.ship.track}.`);
      if (act === 'imprimir') return print();
      if (act === 'csv-pedidos') { const l = V.pedidos.last || []; csv(`pedidos-reycar-${stamp()}.csv`, ['Pedido', 'Fecha', 'Estado', 'Cliente', 'Correo', 'Teléfono', 'Comuna', 'Región', 'Documento', 'Folio', 'RUT', 'Envío', 'Costo envío', 'Medio de pago', 'Origen', 'Campaña', 'Productos', 'Total'], l.map((o) => [o.id, fFull(o.t), ST[o.st], custName(o.c), o.c.email, o.c.phone, o.c.comuna, o.c.region, o.doc ? o.doc.type : '', (o.doc && o.doc.folio) || '', o.fac ? o.c.emp.rut : o.c.rut, o.ship.m, o.ship.cost, o.pay, o.src.lbl, o.camp, o.lines.map((x) => `${x.q} × ${x.p.n}`).join(' | '), o.total])); log('Exportación', `Exportó ${l.length} pedidos a Excel`); return toast(`Se descargó un archivo con ${plural(l.length, 'pedido', 'pedidos')}. Queda anotado en el registro de actividad.`); }
      if (act === 'csv-clientes') { const l = V.clientes.last || []; csv(`clientes-reycar-${stamp()}.csv`, ['Nombre', 'Correo', 'Teléfono', 'Comuna', 'Región', 'Empresa', 'Pedidos pagados', 'Gasto total', 'Último pedido'], l.map((x) => [custName(x.c), x.c.email, x.c.phone, x.c.comuna, x.c.region, x.c.emp ? x.c.emp.name : '', x.n, x.v, fDate(x.last)])); log('Exportación', `Exportó ${l.length} clientes a Excel`); return toast(`Se descargó un archivo con ${plural(l.length, 'cliente', 'clientes')}. Queda anotado en el registro de actividad.`); }
      if (act === 'csv-inventario') { const l = (V.inventario.last || []).filter((x) => x.sug || ['out', 'low', 'now', 'soon'].includes(x.st)); csv(`reposicion-reycar-${stamp()}.csv`, ['Producto', 'Marca', 'SKU', 'Stock', 'Vendidos 30 días', 'Sugerido pedir'], l.map((x) => [x.p.n, x.p.b || '', x.p.sku, x.p.stk ?? '', x.u, x.sug])); return toast(`Se descargó la lista de reposición (${plural(l.length, 'producto', 'productos')}).`); }
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
      if (act === 'recordar' || act === 'recordar-todos') { const l = act === 'recordar' ? CARTS.filter((c) => c.id === id) : CARTS.filter((c) => c.st === 'pend'); l.forEach((c) => (c.st = 'sent')); log('Marketing', `Envió recordatorio a ${plural(l.length, 'carrito abandonado', 'carritos abandonados')}`); route(); return toast(l.length ? `Recordatorio enviado a ${plural(l.length, 'cliente', 'clientes')}.` : 'No hay carritos pendientes.'); }
      const mvArr = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; route(); };
      const ii = +a.dataset.i;
      if (act === 'ban-up' || act === 'ban-down') return mvArr(HOME.banners, ii, act.endsWith('up') ? -1 : 1);
      if (act === 'sec-up' || act === 'sec-down') return mvArr(HOME.secs, ii, act.endsWith('up') ? -1 : 1);
      if (act === 'ban-add') { HOME.banners.push({ t: 'Nuevo banner', s: 'Texto del banner', link: '/tienda', img: '/assets/reycars-crest.webp', on: false }); route(); return toast('Banner agregado (oculto hasta que lo actives).'); }
      if (act === 'quitar-dest') { featured.delete(id); route(); return toast('Quitado de destacados.'); }
      if (act === 'agregar-dest') { const v = +$('#addDest').value; if (!v) return toast('Elige un producto.'); featured.add(v); route(); return toast('Producto destacado.'); }
      if (act === 'publicar') { HOME.bar = { on: $('#barOn').checked, txt: $('#barTxt').value }; HOME.mc = ($('input[name=mc]:checked') || {}).value || 'auto'; log('Portada', 'Publicó cambios en la portada'); return toast(`Portada publicada. ${NOSAVE}`); }
      if (act === 'wa-cliente') { const c = CUST.find((x) => x.id === id); return void (c && waOpen(c.phone, `Hola ${c.first}, te escribimos de Reycar Store.`)); }
      if (act === 'papelera') return confirmBox('Mover a la papelera', `El pedido #${id} deja de aparecer en las listas e informes. Si ya tiene boleta, primero haz el reembolso para emitir la nota de crédito.`, 'papelera-ok', 'Mover a la papelera', id);
      if (act === 'papelera-ok') { const i = ORDERS.findIndex((x) => x.id === id); if (i >= 0) { ORDERS.splice(i, 1); oId.delete(id); CS = null; log(`Pedido #${id}`, 'Lo movió a la papelera'); } closeModal(); location.hash = '/pedidos'; return toast(`Pedido #${id} movido a la papelera.`); }
      const MSG = { 'ver-correo': 'Aquí se ve el correo tal como le llega al cliente, con el logo de Reycar.', solicitud: 'Se busca al cliente por correo o RUT; la acción queda registrada con fecha y responsable.', pdf: 'El PDF del documento se abre desde Bsale al conectar la cuenta.', unir: 'Elegirás otro producto de Bsale para mostrarlo como formato de este.', foto: 'La carga de fotos se activa al conectar el almacenamiento de la tienda; se optimizan solas para la web.', 'nueva-redir': 'Aquí se agrega una redirección: dirección antigua → nueva.', 'nuevo-usuario': 'Aquí se invita a una persona por correo, con su perfil.', guardar: `Cambios aplicados. ${NOSAVE}` };
      return toast(MSG[act] || NOSAVE);
    }
    const row = e.target.closest('tr[data-go]');
    if (row && !e.target.closest('a, input, button, label, select')) location.hash = row.dataset.go.slice(1);
  });
  function setStatus(o, to) {
    if (!o || o.st === to) return;
    o.notes.push({ t: Date.now(), txt: `El estado del pedido cambió de ${ST[o.st]} a ${ST[to]}.`, kind: 'system', by: 'Guillermo' });
    log(`Pedido #${o.id}`, `Cambió el estado de ${ST[o.st]} a ${ST[to]}`);
    if (to === 'processing' && !o.doc && ['pending', 'on-hold'].includes(o.st)) emitDoc(o);
    o.st = to; CS = null;
  }

  route();
})();
