/* Genera una página por producto y por sección con su título, descripción, imagen y dirección canónica
   ya escritos en el HTML, más sitemap.xml y robots.txt.

   Por qué: WhatsApp, Facebook e Instagram no ejecutan JavaScript al mostrar la vista previa de un enlace;
   leen solo el HTML. Sin estas páginas, todo producto compartido se vería como la portada. Google sí ejecuta
   JavaScript, pero así recibe la información completa desde el primer momento.

   Uso:   SITE_URL=https://reycarstore.cl node scripts/prerender.js     (por defecto https://reycar.vercel.app)
   Volver a correrlo cuando cambie index.html o el catálogo (después de node build-data.js).
   La tienda (app.js) actualiza estos mismos datos al navegar sin recargar. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = (process.env.SITE_URL || 'https://reycar.vercel.app').replace(/\/+$/, '');
const IMG = '/assets/uploads/';

global.window = {};
require(path.join(ROOT, 'data', 'products.js'));
const ALL = window.PRODUCTS, G = window.GROUPS;
const byId = new Map(ALL.map((p) => [p.id, p]));

// mismos nombres limpios que muestra la tienda: se reutiliza el código de app.js en vez de duplicarlo
const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error(`No encontré "${a}" en app.js`); return src.slice(i, j); };
const lib = new Function('byId', cut('const NAME_KEEP', '/* ───────── datos derivados') + cut('function specOf', 'const pick = ') + ';return { niceName, stripSize, ttl, headOf, specOf };')(byId);
ALL.forEach((p) => { p.t = lib.niceName(p.n); p.spec = lib.specOf(p.n); });
ALL.forEach((p) => { if (p.fam && p.fam !== p.id) { const h = byId.get(p.fam); (h.vs = h.vs || [h]).push(p); } });
ALL.forEach((p) => { if (p.vs) { p.vs.sort((a, b) => a.p - b.p); p.ft = lib.stripSize(p.t); } });

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clip = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length <= n ? t : t.slice(0, n).replace(/\s\S*$/, '') + '…'; };
const DEFAULT_DESC = 'Productos originales de detailing automotriz: lavado, pulido, cerámicos, interior y más. Tienda y taller en Quinta Normal. Envíos a todo Chile.';
const CREST = '/assets/reycars-crest.webp';

const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const START = template.indexOf('<!-- meta:inicio'), END = template.indexOf('<!-- meta:fin -->');
if (START < 0 || END < 0) throw new Error('index.html no tiene el bloque <!-- meta:inicio --> … <!-- meta:fin -->');
const startTag = template.slice(START, template.indexOf('-->', START) + 3);

function page({ title, desc, url, image, type = 'website' }) {
  const block = `${startTag}
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(SITE + url)}">
<meta property="og:site_name" content="Reycar Store">
<meta property="og:locale" content="es_CL">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(SITE + url)}">
<meta property="og:image" content="${esc(SITE + image)}">
<meta name="twitter:card" content="summary_large_image">
`;
  return template.slice(0, START) + block + template.slice(END);
}
const write = (rel, html) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };

// secciones
const brandCount = new Set(ALL.map((p) => p.b).filter(Boolean)).size;
const mc = ALL.filter((p) => p.b === 'Motor Clean' && (!p.fam || p.fam === p.id)).length;
const sections = [
  ['index.html', { title: 'Reycar Store — Detailing automotriz profesional', desc: DEFAULT_DESC, url: '/', image: CREST }],
  ['tienda.html', { title: 'Tienda — Reycar Store', desc: DEFAULT_DESC, url: '/tienda', image: CREST }],
  ['marcas.html', { title: 'Marcas — Reycar Store', desc: `${brandCount} marcas de detailing automotriz, todas con productos originales.`, url: '/marcas', image: CREST }],
  ['asesoria.html', { title: 'Servicios de taller — Reycar Store', desc: 'Servicios de detailing en nuestro taller de Quinta Normal: lavado, pulido, cerámicos e interior. Agenda por WhatsApp.', url: '/asesoria', image: CREST }],
  ['motor-clean.html', { title: 'Motor Clean — Reycar Store', desc: `Toda la línea Motor Clean: ${mc} productos de lavado, interior, neumáticos y protección, en formatos de 1 L y 5 L.`, url: '/motor-clean', image: '/assets/brands/motor-clean.png' }],
];
sections.forEach(([file, meta]) => write(file, page(meta)));

// descripción corta (misma fórmula que setMeta en app.js): nombre, marca si no está en el nombre, formatos y el inicio del texto
function describe(p, h) {
  const name = lib.ttl(p);
  const brand = p.b && !name.toLowerCase().includes(p.b.toLowerCase()) ? ` de ${p.b}` : '';
  const specs = h.vs ? h.vs.map((v) => v.spec) : [];
  const fmt = specs.length ? ` en formatos ${specs.slice(0, -1).join(', ')} y ${specs[specs.length - 1]}` : p.spec ? `, ${p.spec}` : '';
  const text = String(p.d || h.d || '').replace(/^\s*descripci[oó]n\s*:?\s*/i, '');
  return `${name}${brand}${fmt}. ${clip(text, 110)}`.trim();
}
// una página por producto (cada formato tiene la suya; la canónica es la del producto principal)
let n = 0;
for (const p of ALL) {
  const h = lib.headOf(p);
  const desc = describe(p, h);
  const im = p.im && p.im[0] ? IMG + (p.im[0][1] || p.im[0][0]) : CREST;
  write(path.join('producto', `${p.s}.html`), page({ title: `${p.t} — Reycar Store`, desc, url: `/producto/${h.s}`, image: im, type: 'product' }));
  n++;
}

// sitemap: secciones, categorías, subcategorías y un producto por familia
const urls = ['/', '/tienda', '/marcas', '/asesoria', '/motor-clean', '/tienda?p=exterior'];
G.filter((g) => ALL.some((p) => p.g === g.id)).forEach((g) => {
  urls.push(`/tienda?g=${g.id}`);
  (g.subs || []).forEach((s) => urls.push(`/tienda?g=${g.id}&sc=${s.id}`));
});
ALL.filter((p) => !p.fam || p.fam === p.id).forEach((p) => urls.push(`/producto/${p.s}`));
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(SITE + u)}</loc></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE}/sitemap.xml
`);
console.log(`${sections.length} secciones · ${n} productos · sitemap con ${urls.length} direcciones · dominio ${SITE}`);
