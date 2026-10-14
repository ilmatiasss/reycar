/* GET /api/stock → { source, updatedAt, stale, stock: { "<sku>": unidades } }
   Se apoya en lib/bsale.js. Sin BSALE_TOKEN responde source:"none" y la tienda usa el stock del catálogo.
   Compatible con Vercel y con el servidor local (serve.js): usa solo la API básica de Node. */
'use strict';
const { getStock } = require('../lib/bsale');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!process.env.BSALE_TOKEN) {
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ source: 'none' }));
  }
  try {
    const { map, at, stale } = await getStock();
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.end(JSON.stringify({ source: 'bsale', updatedAt: new Date(at).toISOString(), stale, stock: map }));
  } catch (e) {
    console.error('[stock] Bsale no respondió:', e && e.message);   // el detalle queda en el registro del servidor, no en la respuesta
    res.statusCode = 502;
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ source: 'error' }));
  }
};
