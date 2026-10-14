/* Reycar — medición: Meta Pixel + Google Analytics 4
   ───────────────────────────────────────────────────
   Qué hace:
   - Dispara ViewContent, AddToCart, InitiateCheckout y Purchase en Meta, y sus
     equivalentes de ecommerce en GA4 (view_item, add_to_cart, begin_checkout, purchase).
   - Además: PageView en cada pantalla, Search, Contact (clic en WhatsApp) y view_cart.
   - Cada evento lleva un eventID único: es el mismo que hay que mandar desde el servidor
     con la API de Conversiones para que Meta lo cuente una sola vez.
   - No carga nada de Meta ni de Google hasta que haya IDs y la persona acepte las cookies.

   Cómo se conecta a las cuentas reales: completar los dos IDs de abajo (o definir
   window.REYCAR_TRACKING antes de este archivo). Mientras estén vacíos, no sale nada hacia afuera.

   Cómo verlo funcionando sin cuentas: abrir el sitio con ?track=debug (por ejemplo
   http://localhost:5173/?track=debug). Aparece un panel con cada evento y sus datos. */
(function () {
  'use strict';
  var CONFIG = Object.assign({
    metaPixelId: '',   // ID del Pixel de Meta (Administrador de eventos)
    ga4Id: '',         // ID de medición de GA4, formato G-XXXXXXXXXX
    currency: 'CLP'
  }, window.REYCAR_TRACKING || {});

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* modo privado */ } },
    sget: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* modo privado */ } }
  };

  /* ───────── modo de prueba ───────── */
  if (/[?&]track=debug\b/.test(location.search)) store.sset('reycar-track-debug', '1');
  if (/[?&]track=off\b/.test(location.search)) store.sset('reycar-track-debug', '');
  var debug = store.sget('reycar-track-debug') === '1';
  var log = [];

  /* ───────── carga de Meta y Google (solo con IDs y consentimiento) ───────── */
  var hasIds = !!(CONFIG.metaPixelId || CONFIG.ga4Id);
  var loaded = false;
  function loadVendors() {
    if (loaded) return; loaded = true;
    if (CONFIG.metaPixelId) {
      /* eslint-disable */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      window.fbq('init', CONFIG.metaPixelId);
    }
    if (CONFIG.ga4Id) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', CONFIG.ga4Id, { send_page_view: false });   // las páginas se informan a mano (el sitio no recarga)
      var s = document.createElement('script'); s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.ga4Id);
      document.head.appendChild(s);
    }
  }
  var consent = store.get('reycar-consent');        // 'granted' | 'denied' | null
  if (hasIds && consent === 'granted') loadVendors();

  /* ───────── envío ───────── */
  var uid = function (name) { return name + '.' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  function send(meta, ga) {
    // meta: [nombre, datos] · ga: [nombre, datos]
    var id = uid(meta ? meta[0] : ga[0]);
    if (meta && typeof window.fbq === 'function') window.fbq('track', meta[0], meta[1] || {}, { eventID: id });
    if (ga && typeof window.gtag === 'function') window.gtag('event', ga[0], ga[1] || {});
    record(id, meta, ga);
  }

  /* ───────── datos de cada evento ───────── */
  var sum = function (items) { return items.reduce(function (a, i) { return a + i.price * (i.qty || 1); }, 0); };
  var gaItems = function (items) {
    return items.map(function (i) {
      return { item_id: i.id, item_name: i.name, item_brand: i.brand || undefined, item_category: i.category || undefined, price: i.price, quantity: i.qty || 1 };
    });
  };
  var metaBag = function (items, extra) {
    var o = {
      content_type: 'product',
      content_ids: items.map(function (i) { return i.id; }),
      contents: items.map(function (i) { return { id: i.id, quantity: i.qty || 1 }; }),
      value: Math.round(sum(items)),
      currency: CONFIG.currency
    };
    return Object.assign(o, extra || {});
  };
  var gaBag = function (items, extra) {
    return Object.assign({ currency: CONFIG.currency, value: Math.round(sum(items)), items: gaItems(items) }, extra || {});
  };

  var Track = {
    config: CONFIG,
    pageView: function () {
      send(['PageView', {}], ['page_view', { page_location: location.href, page_path: location.hash || '/', page_title: document.title }]);
    },
    viewItem: function (item) {
      send(['ViewContent', metaBag([item], { content_name: item.name, content_category: item.category })], ['view_item', gaBag([item])]);
    },
    addToCart: function (item) {
      send(['AddToCart', metaBag([item], { content_name: item.name })], ['add_to_cart', gaBag([item])]);
    },
    viewCart: function (items) {
      if (!items.length) return;
      send(null, ['view_cart', gaBag(items)]);
    },
    beginCheckout: function (items) {
      if (!items.length) return;
      send(['InitiateCheckout', metaBag(items, { num_items: items.reduce(function (a, i) { return a + (i.qty || 1); }, 0) })], ['begin_checkout', gaBag(items)]);
    },
    // order: { id, items, shipping? }. Se llama cuando el pago ya está confirmado (no al cargar una página).
    purchase: function (order) {
      var items = order.items || [];
      send(['Purchase', metaBag(items, { num_items: items.reduce(function (a, i) { return a + (i.qty || 1); }, 0), order_id: order.id })],
        ['purchase', gaBag(items, { transaction_id: order.id, shipping: order.shipping || 0 })]);
    },
    search: function (q) {
      send(['Search', { search_string: q }], ['search', { search_term: q }]);
    },
    contact: function (source) {
      send(['Contact', { content_name: source }], ['generate_lead', { method: source }]);
    },
    // para pruebas: ¿hay algo cargado hacia afuera?
    status: function () { return { metaPixel: !!CONFIG.metaPixelId, ga4: !!CONFIG.ga4Id, consent: store.get('reycar-consent'), loaded: loaded, debug: debug }; },
    events: function () { return log.slice(); }
  };
  window.Track = Track;

  /* ───────── aviso de cookies (solo si hay IDs configurados) ───────── */
  function banner() {
    if (!hasIds || consent) return;
    var b = document.createElement('div');
    b.className = 'ck'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Cookies');
    b.innerHTML = '<p>Usamos cookies para medir las visitas y mejorar nuestra publicidad. Puedes aceptarlas o dejar solo las necesarias.</p>' +
      '<div><button type="button" data-ck="granted">Aceptar</button><button type="button" data-ck="denied">Solo necesarias</button></div>';
    var css = document.createElement('style');
    css.textContent = '.ck{position:fixed;left:16px;right:16px;bottom:16px;z-index:300;max-width:560px;display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:14px 16px;border-radius:8px;background:#151313;color:#f4f4f5;font:400 14px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)}' +
      '.ck p{margin:0;flex:1 1 240px}.ck div{display:flex;gap:8px}.ck button{font:600 13px system-ui,sans-serif;padding:9px 14px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:none;color:#fff;cursor:pointer}' +
      '.ck button[data-ck=granted]{background:#e4232f;border-color:#e4232f}@media(max-width:820px){.ck{bottom:96px}}';
    document.head.appendChild(css); document.body.appendChild(b);
    b.addEventListener('click', function (e) {
      var v = e.target && e.target.getAttribute && e.target.getAttribute('data-ck'); if (!v) return;
      store.set('reycar-consent', v); consent = v; b.remove();
      if (v === 'granted') { loadVendors(); Track.pageView(); }
    });
  }

  /* ───────── panel de pruebas (?track=debug) ───────── */
  var panel, list;
  function record(id, meta, ga) {
    var row = { id: id, time: new Date().toLocaleTimeString('es-CL'), meta: meta, ga: ga, sent: { meta: !!(meta && typeof window.fbq === 'function'), ga: !!(ga && typeof window.gtag === 'function') } };
    log.push(row); if (log.length > 200) log.shift();
    if (debug) draw(row);
  }
  function buildPanel() {
    if (panel || !document.body) return;
    var css = document.createElement('style');
    css.textContent = '.tk{position:fixed;left:12px;bottom:12px;z-index:400;width:min(380px,calc(100vw - 24px));max-height:46vh;display:flex;flex-direction:column;border-radius:8px;background:#0f0e0e;color:#e8e6e1;font:12px/1.35 ui-monospace,Menlo,monospace;box-shadow:0 10px 30px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.14)}' +
      '.tk__h{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.12);font-weight:700}.tk__h small{font-weight:400;color:#a8a39b}' +
      '.tk__h button{font:inherit;padding:3px 8px;border-radius:4px;border:1px solid rgba(255,255,255,.3);background:none;color:#fff;cursor:pointer}' +
      '.tk__l{overflow:auto;padding:4px 0}.tk__r{padding:5px 10px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer}.tk__r:hover{background:rgba(255,255,255,.05)}' +
      '.tk__n b{color:#e9b84a}.tk__n i{font-style:normal;color:#7fd38a}.tk__n u{text-decoration:none;color:#8db4ff}.tk__n span{color:#a8a39b}' +
      '.tk__d{display:none;margin:6px 0 2px;white-space:pre-wrap;word-break:break-word;color:#c9c5bd}.tk__r.on .tk__d{display:block}' +
      '@media(max-width:820px){.tk{bottom:96px}}';
    document.head.appendChild(css);
    panel = document.createElement('div'); panel.className = 'tk'; panel.setAttribute('role', 'log'); panel.setAttribute('aria-label', 'Eventos de medición (modo de prueba)');
    panel.innerHTML = '<div class="tk__h"><span>Eventos <small>modo de prueba</small></span><span><button type="button" data-tk="buy">Simular compra</button> <button type="button" data-tk="x">×</button></span></div><div class="tk__l"></div>';
    list = panel.querySelector('.tk__l'); document.body.appendChild(panel);
    panel.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tk]');
      if (t) { if (t.dataset.tk === 'x') { store.sset('reycar-track-debug', ''); panel.remove(); debug = false; } else if (typeof window.__reycarSimulatePurchase === 'function') window.__reycarSimulatePurchase(); return; }
      var r = e.target.closest('.tk__r'); if (r) r.classList.toggle('on');
    });
    log.forEach(draw);
  }
  function draw(row) {
    if (!panel) { buildPanel(); return; }   // al armarse, el panel ya dibuja todo lo registrado
    if (!list) return;
    var m = row.meta ? '<i>Meta ' + row.meta[0] + '</i>' : '', g = row.ga ? '<u>GA4 ' + row.ga[0] + '</u>' : '';
    var el = document.createElement('div'); el.className = 'tk__r';
    el.innerHTML = '<div class="tk__n"><span>' + row.time + '</span> ' + [m, g].filter(Boolean).join(' · ') + '</div><div class="tk__d"></div>';
    el.querySelector('.tk__d').textContent = 'eventID: ' + row.id + '\n' + JSON.stringify({ meta: row.meta, ga4: row.ga }, null, 1) +
      '\nenviado a Meta: ' + (row.sent.meta ? 'sí' : 'no (sin Pixel cargado)') + ' · a GA4: ' + (row.sent.ga ? 'sí' : 'no (sin GA4 cargado)');
    list.appendChild(el); list.scrollTop = list.scrollHeight;
  }
  function ready() { banner(); if (debug) buildPanel(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
