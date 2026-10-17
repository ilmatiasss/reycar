// Convierte el catálogo WooCommerce (Store API) en data/products.js para el prototipo.
const fs = require('fs');

let raw = [];
for (let i = 1; i <= 5; i++) raw = raw.concat(JSON.parse(fs.readFileSync(`data/p${i}.json`, 'utf8')));

const decode = (s = '') => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const plain = (html = '') => decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div|h\d)>/gi, '\n').replace(/<[^>]+>/g, ''))
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

// Etapas del proceso de detailing -> reemplazan las categorías desordenadas del sitio actual.
const GROUPS = [
  { id: 'lavado',          name: 'Lavado',            blurb: 'Shampoo, espumas, desengrasantes y guantes.' },
  { id: 'secado',          name: 'Secado y microfibras', blurb: 'Toallas, paños y todo para secar sin rayar.' },
  { id: 'descontaminacion', name: 'Descontaminación', blurb: 'Clay, hierro y alquitrán fuera de la pintura.' },
  { id: 'pulido',          name: 'Pulido',            blurb: 'Compuestos, pads, pulidoras y abrillantadores.' },
  { id: 'proteccion',      name: 'Protección',        blurb: 'Ceras, cerámicos y renovadores de plásticos.' },
  { id: 'interior',        name: 'Interior',          blurb: 'Cuero, tableros, tapices y aromas.' },
  { id: 'ruedas',          name: 'Neumáticos y llantas', blurb: 'Limpia, renueva y protege.' },
  { id: 'vidrios',         name: 'Vidrios',           blurb: 'Limpiadores, repelentes y paños.' },
  { id: 'accesorios',      name: 'Accesorios',        blurb: 'Cepillos, aplicadores y herramientas.' },
  { id: 'cursos',          name: 'Cursos',            blurb: 'Aprende detailing y pulido.' },
  { id: 'servicios',       name: 'Servicios de taller', blurb: 'Cerámicos aplicados por nuestro equipo.' },
];

const SLUG_TO_GROUP = {
  'shampoo': 'lavado', 'lavado-en-seco': 'lavado', 'canon-de-espuma': 'lavado', 'guantes-de-lavado': 'lavado',
  'esponjas': 'lavado', 'desengrasantes': 'lavado', 'limpiador-exterior': 'lavado', 'limpiador-de-frenos': 'lavado',
  'preparador-de-superficies': 'lavado', 'apc': 'lavado', 'limpiador': 'lavado',
  'microfibra': 'secado', 'microfibras': 'secado', 'toalla-secado': 'secado', 'panos-de-secar': 'secado', 'sopladora': 'secado',
  'descontaminantes': 'descontaminacion', 'claybar': 'descontaminacion', 'removedor': 'descontaminacion',
  'pulidores': 'pulido', 'pulimentos': 'pulido', 'compuesto-de-pulir': 'pulido', 'pad-pulido': 'pulido',
  'pad-de-corte': 'pulido', 'optimizador-de-pulido': 'pulido', 'pulidoras': 'pulido', 'abrillantador': 'pulido',
  'maquinas': 'pulido', 'soportes': 'pulido',
  'ceras': 'proteccion', 'selladores-ceramicos': 'proteccion', 'quick-detail': 'proteccion',
  'cuidado-interior': 'interior', 'aromatizantes': 'interior', 'cueros': 'interior', 'tableros-y-plasticos': 'interior',
  'tapices-y-alfombras': 'interior', 'limpiador-interior': 'interior', 'aire-acondicionado': 'interior',
  'neumaticos': 'ruedas', 'renovador-de-neumaticos': 'ruedas', 'llantas': 'ruedas',
  'vidrios-y-parabrisas': 'vidrios',
  'cepillos': 'accesorios', 'aplicadores': 'accesorios', 'focos': 'accesorios', 'guardafangos': 'proteccion',
  'curso-detailing': 'cursos', 'curso-pulido': 'cursos',
  // categorías ambiguas: se resuelven por nombre
  'renovador': 'proteccion', 'plasticos-exteriores': 'proteccion', 'plasticos-y-micas': 'proteccion',
  'cuidado-exterior': null, 'accesorios': null, 'sin-categoria': null,
};

const KEYWORDS = [
  ['cursos', /curso|taller|capacitaci/i],
  ['secado', /toalla|pa[ñn]o|microfibra|secado|sopladora/i],
  ['pulido', /pul[ií]|pad |pad$|polish|compound|compuesto|abrillant|rupes|menzerna|lake country|backing|disco/i],
  ['proteccion', /cer[aá]mic|sellador|cera |cera$|wax|coating|sealant|protector|spray/i],
  ['descontamin', /clay|descontamin|iron|hierro|alquitr[aá]n|tar /i],
  ['ruedas', /neum[aá]tic|llanta|wheel|tire|tyre/i],
  ['vidrios', /vidri|parabrisas|glass|cristal/i],
  ['interior', /interior|cuero|tablero|tapiz|aroma|ambientador|alfombra/i],
  ['lavado', /shampoo|champ[uú]|espuma|foam|lavado|desengras|limpiador|apc|jab[oó]n/i],
  ['accesorios', /cepillo|brush|aplicador|guante|esponja|bolsa|balde|bucket|manguera|pistola/i],
];
const KW_MAP = { descontamin: 'descontaminacion' };

// nombres que perdieron la "/" o tildes en WooCommerce
const fixName = (n) => n
  .replace(/\s*Sedanhatchback/i, ' Sedán / Hatchback')
  .replace(/camioneta xlSuv Xl/i, 'camioneta XL / SUV XL')
  .replace(/^Ceramico exterior/i, 'Cerámico exterior')
  .replace(/curso de iniciacion de 6 dias/i, 'curso de iniciación de 6 días')
  .replace(/\bmotor ?clean(?![a-z])/gi, 'Motor Clean').replace(/Motor Clean(?=\d)/g, 'Motor Clean ');

// descripción completa (con tope) cortada en un final de frase, nunca a mitad de palabra
const fullText = (t, max = 3500) => {
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf('. '));
  return cut.slice(0, end > max * 0.6 ? end + 1 : max).trim();
};

const stripSuffix = (s) => s.replace(/-2$/, '');

function groupOf(p) {
  // servicios que el sitio vende como productos (hoy mezclados con pulidores y cursos)
  if (/^cer[aá]mico (exterior|pro) /i.test(decode(p.name).normalize('NFC'))) return 'servicios';
  const slugs = p.categories.map((c) => stripSuffix(c.slug));
  for (const s of slugs) if (SLUG_TO_GROUP[s]) return SLUG_TO_GROUP[s];
  const hay = decode(p.name) + ' ' + p.categories.map((c) => decode(c.name)).join(' ');
  for (const [g, re] of KEYWORDS) if (re.test(hay)) return KW_MAP[g] || g;
  if (slugs.includes('cuidado-interior')) return 'interior';
  return 'accesorios';
}


// ───────── Subcategorías por etapa ─────────
// WooCommerce deja muchos productos solo en "Cuidado Exterior" o "Pulidores", así que la subcategoría
// se decide por el nombre del producto. Las reglas se prueban en orden; la última de cada etapa es la que
// recibe lo que no calza en ninguna otra.
const plain_ = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// productos que WooCommerce dejó en la etapa equivocada
const REGROUP = [
  [/clay towel|lubricante clay|clay spray/, 'descontaminacion'],
  [/shampoo tapiz|aromatizante|antitabaco|bactericida para paneles|amonio cuaternario/, 'interior'],
  [/ferrico.*(llanta|wheel)|llantas.*ferrico/, 'ruedas'],
  [/lavado en seco|waterless|wash anywhere/, 'lavado'],
  [/glass prep/, 'vidrios'],
  [/panel prep/, 'lavado'],
  [/ferrico|iron remover|descontaminador ferrico|bug-out|spotless|eliminador de (oxido|adhesivo|manchas)|removedor de pintura/, 'descontaminacion'],
  [/quick detailer|quik detailer|mist & wipe/, 'proteccion'],
  [/cuidado de plasticos|acondicionador de plasticos|\bperl\b|elixir|brillo rapido|barniz de motor/, 'proteccion'],
  [/^intense |pad brush|plush wool pad|kneeling/, null],   // se resuelven abajo
  [/bi-?enzimatic|heavy duty multi purpose/, 'interior'],
  [/rain drop/, 'vidrios'],
];
const REGROUP_FIX = [[/^intense /, 'interior'], [/pad brush|plush wool pad/, 'pulido'], [/kneeling/, 'accesorios']];

const SUBCATS = {
  lavado: [
    ['sin-agua', 'Lavado sin agua', /rinseless|sin enjuague|waterless|lavado en seco|wash anywhere|esponja legacy/],
    ['shampoo', 'Shampoo', /shampoo|snow foam|car wash|wash & wax 1|ultimate wash|ceramic wash|foam ph|espuma de limpieza|descale|hydro2|citric foam/],
    ['guantes-y-accesorios', 'Guantes, rejillas y cañones', /guante|wash ?mitt|rejilla|grit guard|sand killer|canon|esponja/],
    ['desengrasantes', 'Desengrasantes y APC', /./],
  ],
  secado: [
    ['sopladoras', 'Sopladoras', /sopladora/],
    ['aplicadores', 'Aplicadores', /aplicador|guantes plush|aplicacion de ceramico/],
    ['toallas-secado', 'Toallas de secado', /secado|twist|1200|90 ?x ?60|60 ?x ?90|gruesa|morada/],
    ['panos', 'Paños de microfibra', /./],
  ],
  descontaminacion: [
    ['ferricos', 'Descontaminantes férricos', /ferric|iron|trix|izer/],
    ['clay', 'Clay bar y lubricantes', /clay|arcilla|lub|immolube/],
    ['alquitran', 'Alquitrán, insectos y adhesivos', /alquitran|\btar\b|tarx|bug|strike|adhesivo/],
    ['removedores', 'Removedores especiales', /./],
  ],
  pulido: [
    ['accesorios-pulido', 'Accesorios de pulido', /backing|backer|lija|sanding|limpiador de pad|pad brush|exhibidor|aplicadora|soporte|cepillo/],
    ['pads', 'Pads', /\bpads?\b|almohadilla|boina|wool/],
    ['pulidoras', 'Pulidoras', /pulidora|maquina|dual action|t-724|mpk/],
    ['metales', 'Pulido de metales', /metal/],
    ['compuestos', 'Compuestos y pulimentos', /./],
  ],
  proteccion: [
    ['plasticos', 'Plásticos y gomas', /plastic|plastico|plastitos|goma|neumatico|dressing|protectant|restaur|renova|verse|ecoblack|cajas de ruedas|dlux|\bperl\b|barniz/],
    ['ceramicos', 'Cerámicos y selladores', /ceramic|cerami|sellador|sellante|coating|grafeno|serum|cq\.?uk|gliss|halo|si-\d|hydrox|sinergy|9h|quartz|fabric|hybrid paint/],
    ['ceras', 'Ceras', /\bcera\b|wax|carnauba|rubbing/],
    ['quick-detailers', 'Quick detailers y abrillantadores', /./],
  ],
  interior: [
    ['olores', 'Aromatizantes y olores', /aromatizante|olor|refresher|amonio|antitabaco|\bfu kochchemie/],
    ['cuero', 'Cuero', /cuero|leather|hidracouro/],
    ['tapices', 'Tapices y alfombras', /tapic|tapiz|tapices|telas|carpet|upholstery|alfombra|desmanch|quita manchas|extractus|vertex|enzimatic/],
    ['plasticos-interior', 'Plásticos y tableros', /plastic|plastico|tablero|flexus|^intense|protectant|renova|restaurer|\bts kochchemie|interior detailer|inner qd|quickshine|allround|sinergy/],
    ['limpiadores-interior', 'Limpiadores de interior', /./],
  ],
  ruedas: [
    ['accesorios-ruedas', 'Cepillos y aplicadores', /brush|cepillo|esponja|aplicador|deslizador/],
    ['limpiadores-llantas', 'Limpiadores de llantas y neumáticos', /limpiador|wheel cleaner|ferrico|acid|wheel & tire|retyre|delet|cleaner/],
    ['selladores-ruedas', 'Selladores cerámicos', /ceramic|ceramico/],
    ['renovadores', 'Renovadores de neumáticos', /./],
  ],
  vidrios: [
    ['pulido-vidrios', 'Pulido de vidrios', /opty|compuesto|pulimento/],
    ['tratamientos-vidrios', 'Repelentes y antiempañantes', /sellador|antiempa|fogfight|rain|repel/],
    ['limpiavidrios', 'Limpiavidrios', /./],
  ],
  accesorios: [
    ['kits', 'Kits de reparación', /kit|borrador|scratch/],
    ['iluminacion', 'Iluminación', /luz|tripode|\bled\b/],
    ['repuestos-pulidora', 'Repuestos de pulidora', /escobillas? de carbono|backer/],
    ['cepillos', 'Cepillos', /cepillo|brush|escobilla/],
    ['aplicadores-accesorios', 'Aplicadores y pulverizadores', /aplicador|pulverizador|botella|cotonitos|swabs/],
    ['taller', 'Equipamiento de taller', /./],
  ],
};
function regroup(g, name) {
  if (g === 'servicios' || g === 'cursos') return g;
  const n = plain_(name);
  for (const [re, to] of REGROUP) if (re.test(n) && to) return to;
  for (const [re, to] of REGROUP_FIX) if (re.test(n)) return to;
  return g;
}
function subOf(g, name) {
  const list = SUBCATS[g]; if (!list) return null;
  const n = plain_(name);
  for (const [id, , re] of list) if (re.test(n)) return id;
  return null;
}

const PRE = 'https://reycarstore.cl/wp-content/uploads/';
const short = (u) => (u && u.startsWith(PRE) ? u.slice(PRE.length) : u);
// Usa el srcset sin recorte (las miniaturas cuadradas del sitio actual cortan los productos)
const pick = (img, w) => {
  if (!img) return null;
  const set = (img.srcset || '').split(',').map((x) => x.trim().split(/\s+/))
    .filter((a) => a[1] && a[1].endsWith('w')).map(([u, x]) => [u, parseInt(x, 10)]).sort((a, b) => a[1] - b[1]);
  if (!set.length && w <= 600) {
    // sin versiones intermedias: usa la miniatura 600x600 en vez del original (a veces 2048px)
    const t = (img.thumbnail_srcset || '').split(',').map((x) => x.trim().split(/\s+/)[0]).find((u) => /-600x600./.test(u));
    if (t) return short(t);
  }
  const hit = set.find(([, x]) => x >= w);
  return short(hit ? hit[0] : set.length ? set[set.length - 1][0] : img.src);
};

const products = raw.map((p) => {
  const imgs = p.images.filter((i) => i && !/placeholder/.test(i.src));
  const list = +p.prices.regular_price || +p.prices.price || 0;
  const brand = (p.brands[0] && decode(p.brands[0].name)) || '';
  const maxQty = p.add_to_cart && +p.add_to_cart.maximum;
  return {
    id: p.id,
    n: fixName(decode(p.name).replace(/\s+/g, ' ').trim()),
    s: p.slug,
    p: list,
    b: ({ Masshine: 'Maxshine', gtechniq: 'Gtechniq' })[brand] || brand, // grafías distintas de la misma marca en el sitio
    g: regroup(groupOf(p), fixName(decode(p.name))),
    c: [...new Set(p.categories.map((c) => decode(c.name)).filter((n) => !/^(Cuidado Exterior|Sin categor)/i.test(n)))].slice(0, 2),
    // [600 px para tarjetas y carrusel, 1024 px para la ficha y el zoom, 300 px para pantallas chicas]
    im: imgs.slice(0, 4).map((i) => [pick(i, 600), pick(i, 1024), pick(i, 300)]),
    stk: maxQty && maxQty < 100 ? maxQty : null,
    d: fullText(plain(p.description)),
    sku: p.sku || '',
    url: p.permalink,
  };
}).filter((p) => p.p > 0);
products.forEach((p) => { const sc = subOf(p.g, p.n); if (sc) p.sc = sc; });

/* ── familias: el mismo producto en distintos formatos (1 L y 5 L, 3″ y 5″…) se muestra como uno solo ──
   En el sitio actual cada formato es un producto aparte. Se agrupan los que, sin el tamaño ni la marca,
   tienen las mismas palabras; FAM_EXTRA junta los que el sitio escribe distinto. Cada formato conserva
   su id, SKU, precio y stock; el primero (el más chico) queda como cabeza: p.fam = id de la cabeza. */
const SIZE_RX = [
  /\(?\b\d+(?:[.,]\d+)?\s*(ml|cc|lts?|litros?|l|kg|grs?|gr|g|oz)\b\.?\)?/g,
  /\b\d+(?:[.,]\d+)?\s*(″|"|“|”)(\s*x\s*\d+(?:[.,]\d+)?\s*(″|"|“|”)?)?/g,
];
const FAM_STOP = new Set(['de', 'del', 'la', 'el', 'y', 'para', 'con', 'x', 'en', 'formato']);
const famWords = (p) => {
  let s = plain_(p.n).replace(/[″"“”]/g, '"');
  SIZE_RX.forEach((r) => { s = s.replace(r, ' '); });
  const brandW = new Set(plain_(p.b || '').split(/\s+/));
  return [...new Set(s.replace(/[()\-–,.+&]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !FAM_STOP.has(w) && !brandW.has(w) && w !== 'motor' && w !== 'clean'))].sort().join(' ');
};
// mismos productos con nombres distintos según el formato (revisados a mano)
const FAM_EXTRA = [[2838, 2778], [2283, 874], [748, 746], [2790, 2763], [1137, 606]];
const sizeMl = (n) => { // para ordenar formatos de menor a mayor
  const s = plain_(n); let m;
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(ml|cc)\b/))) return +m[1].replace(',', '.');
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(litros?|lts?|l)\b/))) { const v = +m[1].replace(',', '.'); return v > 50 ? v : v * 1000; }
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*kg\b/))) return +m[1].replace(',', '.') * 1000;
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(grs?|gr|g)\b/))) return +m[1].replace(',', '.');
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*oz\b/))) return +m[1].replace(',', '.') * 29.57;
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(″|"|“|”)/))) return +m[1].replace(',', '.');
  return 0;
};
const fams = new Map();
products.forEach((p) => { const k = `${p.b}|${famWords(p)}`; if (!fams.has(k)) fams.set(k, []); fams.get(k).push(p); });
const famOf = new Map();
[...fams.values()].forEach((f) => f.forEach((p) => famOf.set(p.id, f)));
FAM_EXTRA.forEach(([a, b]) => {
  const fa = famOf.get(a), fb = famOf.get(b); if (!fa || !fb || fa === fb) return;
  fb.forEach((p) => { fa.push(p); famOf.set(p.id, fa); }); fb.length = 0;
});
// la categoría de la familia: si sus formatos quedaron en categorías distintas, manda el uso del producto
const famGroup = (f) => {
  const gs = [...new Set(f.map((p) => p.g))]; if (gs.length === 1) return gs[0];
  const n = plain_(f[0].n);
  if (/tapiz/.test(n)) return 'interior';
  if (/ferrico/.test(n)) return 'descontaminacion';
  if (/apc|multiproposito/.test(n)) return 'lavado';
  return f[0].g;
};
let famCount = 0;
new Set(famOf.values()).forEach((f) => {
  if (f.length < 2) return;
  const sizes = f.map((p) => sizeMl(p.n));
  if (new Set(sizes).size !== f.length || sizes.includes(0)) return; // mismo tamaño (p. ej. colores): no son formatos
  f.sort((a, b) => sizeMl(a.n) - sizeMl(b.n));
  const g = famGroup(f), brand = f.map((p) => p.b).find(Boolean) || '';
  f.forEach((p) => { p.fam = f[0].id; p.g = g; p.b = brand; const sc = subOf(g, f[0].n); if (sc) p.sc = sc; else delete p.sc; });
  famCount++;
});
// encuadre de cada foto (scripts/img-fit.py): [zoom, dx %, dy %] o 'cover'/'frame' para fotos con fondo de color
const FIT = fs.existsSync('data/imgfit.json') ? JSON.parse(fs.readFileSync('data/imgfit.json', 'utf8')) : {};
products.forEach((p) => { if (FIT[p.id] && p.im.length) p.fz = FIT[p.id]; });
console.log('Familias con varios formatos:', famCount, '·', products.filter((p) => p.fam).length, 'productos');
const heads = products.filter((p) => !p.fam || p.fam === p.id);

// subcategorías en orden de lista, solo las que tienen productos
GROUPS.forEach((g) => {
  const list = SUBCATS[g.id]; if (!list) return;
  const subs = list.map(([id, name]) => ({ id, name, n: heads.filter((p) => p.g === g.id && p.sc === id).length })).filter((s) => s.n > 0);
  if (subs.length > 1) g.subs = subs.sort((a, b) => b.n - a.n).map(({ id, name }) => ({ id, name }));
});

const counts = {};
products.forEach((p) => (counts[p.g] = (counts[p.g] || 0) + 1));
console.log('Total', products.length, counts, 'sin foto:', products.filter((p) => !p.im.length).length);

fs.writeFileSync('data/products.js',
  'window.GROUPS = ' + JSON.stringify(GROUPS) + ';\nwindow.PRODUCTS = ' + JSON.stringify(products) + ';\n');
console.log('products.js', (fs.statSync('data/products.js').size / 1024).toFixed(0) + ' KB');
