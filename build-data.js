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
  .replace(/curso de iniciacion de 6 dias/i, 'curso de iniciación de 6 días');

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

const PRE = 'https://reycarstore.cl/wp-content/uploads/';
const short = (u) => (u && u.startsWith(PRE) ? u.slice(PRE.length) : u);
// Usa el srcset sin recorte (las miniaturas cuadradas del sitio actual cortan los productos)
const pick = (img, w) => {
  if (!img) return null;
  const set = (img.srcset || '').split(',').map((x) => x.trim().split(/s+/))
    .filter((a) => a[1] && a[1].endsWith('w')).map(([u, x]) => [u, parseInt(x, 10)]).sort((a, b) => a[1] - b[1]);
  if (!set.length && w <= 600) {
    // sin versiones intermedias: usa la miniatura 600x600 en vez del original (a veces 2048px)
    const t = (img.thumbnail_srcset || '').split(',').map((x) => x.trim().split(/s+/)[0]).find((u) => /-600x600./.test(u));
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
    b: brand === 'Masshine' ? 'Maxshine' : brand, // el sitio tiene ambas grafías de la misma marca
    g: groupOf(p),
    c: [...new Set(p.categories.map((c) => decode(c.name)).filter((n) => !/^(Cuidado Exterior|Sin categor)/i.test(n)))].slice(0, 2),
    im: imgs.slice(0, 4).map((i) => [pick(i, 600), pick(i, 1024)]),
    stk: maxQty && maxQty < 100 ? maxQty : null,
    d: fullText(plain(p.description)),
    sku: p.sku || '',
    url: p.permalink,
  };
}).filter((p) => p.p > 0);

const counts = {};
products.forEach((p) => (counts[p.g] = (counts[p.g] || 0) + 1));
console.log('Total', products.length, counts, 'sin foto:', products.filter((p) => !p.im.length).length);

fs.writeFileSync('data/products.js',
  'window.GROUPS = ' + JSON.stringify(GROUPS) + ';\nwindow.PRODUCTS = ' + JSON.stringify(products) + ';\n');
console.log('products.js', (fs.statSync('data/products.js').size / 1024).toFixed(0) + ' KB');
