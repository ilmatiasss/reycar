/* Verifica la conexión con Bsale y cuántos productos de la tienda se pueden unir por SKU.
   Uso:  BSALE_TOKEN=xxxx node scripts/bsale-check.js            (opcional: BSALE_OFFICE_ID=2)
   No modifica nada en Bsale: solo lee. */
'use strict';
const path = require('path');
global.window = global; require(path.join(__dirname, '..', 'data', 'products.js'));
const { getStock } = require('../lib/bsale');

(async () => {
  if (!process.env.BSALE_TOKEN) { console.error('Falta BSALE_TOKEN'); process.exit(1); }
  const base = process.env.BSALE_API_BASE || 'https://api.bsale.io';
  const raw = await fetch(base + '/v1/stocks.json?limit=2&expand=%5Bvariant%5D', { headers: { access_token: process.env.BSALE_TOKEN } });
  console.log('Respuesta de ejemplo de Bsale (HTTP ' + raw.status + '):');
  console.log(JSON.stringify(await raw.json(), null, 1).slice(0, 1800));
  const { map } = await getStock();
  const skus = global.PRODUCTS.map((p) => String(p.sku));
  const hit = skus.filter((s) => s in map);
  console.log('\nVariantes con stock leídas de Bsale:', Object.keys(map).length);
  console.log('Productos de la tienda que coinciden por SKU:', hit.length, 'de', skus.length);
  console.log('Sin coincidencia (primeros 10):', skus.filter((s) => !(s in map)).slice(0, 10).join(', ') || '—');
  console.log('Agotados según Bsale:', hit.filter((s) => map[s] === 0).length);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
