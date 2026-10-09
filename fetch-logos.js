// Descarga los logos oficiales de cada marca a assets/brands/ (fuentes: sitio oficial de la marca o Wikimedia Commons).
// Motor Clean, SPTA, LovCars, TRINIK, Lincoln, Professional Shine, Shine y Gtechniq no tienen logo descargable: se muestran con tipografía.
const fs = require('fs');
const path = require('path');

const SOURCES = {
  'Meguiars':           'https://www.meguiars.com/themes/custom/mg_drupal_base_theme/images/logo.png',
  'Vonixx':             'https://vonixx.com.br/wp-content/uploads/2024/10/logo-vonixx-branco-.webp',
  'Maxshine':           'https://maxshineusa.com/cdn/shop/files/1Maxshine_Logo.png?v=1743024500&width=600',
  'KochChemie':         'https://www.koch-chemie.com/media/content/logos/logo_kochchemie-2025.svg',
  'Carpro':             'https://cdn7.bigcommerce.com/s-e27d9/product_images/uploaded_images/menu-logos-03-carpro2018.jpg',
  'DIY':                'https://diydetail.com/cdn/shop/files/DIY_Detail_Logo-removebg-preview.png?v=1672982287&width=600',
  'Menzerna':           'https://www.menzerna.com/fileadmin/ns_theme_menzerna/logo.svg',
  'Lake Country':       'https://lakecountrymfg.com/wp-content/uploads/Group-8522.svg',
  'Rupes':              'https://www.rupes.com/wp-content/themes/rupes_corporate/images/logo_150.png',
  'VINTEX':             'https://vintex.com.br/wp-content/themes/vintex/images/vintex.webp',
  'DIMENSION CAR CARE': 'https://dimensioncarcare.com/wp-content/uploads/2026/03/Logotipo-cruz-Dimension.png',
  'Shine Mate':         'https://www.shinemate.com/bocstatic/web/img/mlogo.svg?v=v1',
  '3M':                 'https://upload.wikimedia.org/wikipedia/commons/1/15/3M_wordmark.svg',
  'Sonax':              'https://upload.wikimedia.org/wikipedia/commons/0/04/Sonax_logo.svg',
};
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const EXT = { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg' };

(async () => {
  const dir = path.join(__dirname, 'assets', 'brands');
  fs.mkdirSync(dir, { recursive: true });
  const manifest = {};
  await Promise.all(Object.entries(SOURCES).map(async ([brand, url]) => {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
      const ct = (r.headers.get('content-type') || '').split(';')[0].trim();
      if (!r.ok || !EXT[ct]) { console.log('X', brand, r.status, ct); return; }
      const buf = Buffer.from(await r.arrayBuffer());
      const file = `${slug(brand)}.${EXT[ct]}`;
      fs.writeFileSync(path.join(dir, file), buf);
      manifest[brand] = `assets/brands/${file}`;
      console.log('ok', brand.padEnd(20), file.padEnd(28), (buf.length / 1024).toFixed(1) + ' KB');
    } catch (e) { console.log('X', brand, e.cause?.code || e.name); }
  }));
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
})();
