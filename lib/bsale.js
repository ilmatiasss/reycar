/* Lectura de stock desde la API oficial de Bsale (https://docs.bsale.dev/stocks).
   El token vive solo aquí, en el servidor (variable de entorno BSALE_TOKEN); nunca llega al navegador.

   Variables de entorno:
     BSALE_TOKEN       token de acceso de Bsale (obligatorio; sin él la tienda usa el stock del catálogo)
     BSALE_OFFICE_ID   sucursal que abastece las ventas web (opcional; sin ella suma todas)
     BSALE_API_BASE    por defecto https://api.bsale.io

   Cómo se une cada producto: el SKU de la tienda debe ser el mismo `code` (o código de barras)
   de la variante en Bsale. Si no coincide, ese producto simplemente conserva el stock del catálogo.

   IMPORTANTE: la forma exacta de la respuesta de Bsale (items[].variant.code y quantityAvailable)
   se armó según la documentación pública; hay que confirmarla con el token real corriendo
   `node scripts/bsale-check.js`. */
'use strict';

const PAGE = 50;            // máximo por página que indica la documentación de stocks
const MAX_PAGES = 60;       // tope de seguridad (3.000 variantes)
const FRESH_MS = 60 * 1000; // el stock se considera fresco por 1 minuto
const STALE_MS = 10 * 60 * 1000; // si Bsale falla, se sirve lo último bueno hasta por 10 minutos
const PUBLIC_CAP = 50;      // la web nunca muestra más de 50 unidades: no se publica el inventario exacto

let cache = null;           // { map, at }
let inflight = null;

async function bsaleGet(pathAndQuery) {
  const base = process.env.BSALE_API_BASE || 'https://api.bsale.io';
  const res = await fetch(base + pathAndQuery, {
    headers: { access_token: process.env.BSALE_TOKEN, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error('Bsale respondió ' + res.status);
  return res.json();
}

// Convierte la respuesta de Bsale en { sku: unidades disponibles }
function toMap(items, map) {
  for (const it of items || []) {
    const v = it.variant || {};
    const code = String(v.code || v.barCode || '').trim();
    if (!code) continue;
    const avail = it.quantityAvailable != null ? it.quantityAvailable : (it.quantity || 0) - (it.quantityReserved || 0);
    map[code] = (map[code] || 0) + Math.max(0, Math.floor(Number(avail) || 0));
  }
  return map;
}

async function fetchAll() {
  const office = process.env.BSALE_OFFICE_ID;
  const map = {};
  for (let page = 0; page < MAX_PAGES; page++) {
    const q = `/v1/stocks.json?limit=${PAGE}&offset=${page * PAGE}&expand=%5Bvariant%5D` + (office ? `&officeid=${encodeURIComponent(office)}` : '');
    const json = await bsaleGet(q);
    const items = json.items || [];
    toMap(items, map);
    if (items.length < PAGE) break;
  }
  for (const k of Object.keys(map)) map[k] = Math.min(map[k], PUBLIC_CAP);
  return map;
}

async function getStock() {
  const now = Date.now();
  if (cache && now - cache.at < FRESH_MS) return { map: cache.map, at: cache.at, stale: false };
  if (!inflight) {
    inflight = fetchAll().then((map) => { cache = { map, at: Date.now() }; return cache; }).finally(() => { inflight = null; });
  }
  try {
    const c = await inflight;
    return { map: c.map, at: c.at, stale: false };
  } catch (e) {
    if (cache && now - cache.at < STALE_MS) return { map: cache.map, at: cache.at, stale: true };
    throw e;
  }
}

module.exports = { getStock, toMap };
