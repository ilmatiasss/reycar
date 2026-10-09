// Busca el logo en la cabecera del sitio oficial de cada marca (descubrimiento, no descarga).
const SITES = {
  'Meguiars': ['https://www.meguiars.com/'],
  'Motor Clean': ['https://www.motorclean.cl/', 'https://motorclean.cl/'],
  'Vonixx': ['https://vonixx.com.br/', 'https://www.vonixx.com.br/'],
  'Maxshine': ['https://www.maxshinedetailing.com/', 'https://maxshine.com/'],
  'KochChemie': ['https://www.koch-chemie.com/en/', 'https://www.koch-chemie.com/'],
  'Carpro': ['https://carpro-us.com/', 'https://www.carpro.global/'],
  'DIY': ['https://diydetail.com/'],
  'Menzerna': ['https://www.menzerna.com/'],
  'SPTA': ['https://www.sptatools.com/', 'https://spta.com/'],
  'Lake Country': ['https://www.lakecountrymfg.com/', 'https://lakecountrymfg.com/'],
  'Rupes': ['https://www.rupes.com/'],
  'VINTEX': ['https://vintex.com.br/', 'https://www.vintex.com.br/'],
  'Sonax': ['https://www.sonax.com/'],
  'Soft 99': ['https://www.soft99.co.jp/en/', 'https://www.soft99.co.jp/'],
  'gtechniq': ['https://gtechniq.com/'],
  'Dimension Car Care': ['https://dimensioncarcare.com/', 'https://www.dimensioncarcare.com/'],
  'Shine Mate': ['https://www.shinemate.com/', 'https://shinemate.com.tw/'],
  'LovCars': ['https://lovcars.cl/', 'https://www.lovcars.cl/'],
  'TRINIK': ['https://trinik.cl/', 'https://www.trinik.cl/'],
};
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

async function get(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es,en' }, redirect: 'follow', signal: ctl.signal });
    return { ok: r.ok, status: r.status, url: r.url, text: r.ok ? await r.text() : '' };
  } catch (e) { return { ok: false, status: String(e.cause?.code || e.name) }; } finally { clearTimeout(t); }
}

function candidates(html, base) {
  const out = [];
  const abs = (u) => { try { return new URL(u.replace(/&amp;/g, '&'), base).href; } catch { return null; } };
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/logo/i.test(tag)) continue;
    const src = (tag.match(/\s(?:data-src|src)=["']([^"']+)["']/i) || [])[1];
    const srcset = (tag.match(/\s(?:data-srcset|srcset)=["']([^"']+)["']/i) || [])[1];
    const u = src && !src.startsWith('data:') ? src : srcset ? srcset.split(',').pop().trim().split(' ')[0] : null;
    if (u) out.push(abs(u));
  }
  const og = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1];
  const svgInline = /<svg[^>]*class=["'][^"']*logo/i.test(html) || /<a[^>]*class=["'][^"']*logo[^>]*>\s*<svg/i.test(html);
  return { imgs: [...new Set(out.filter(Boolean))].slice(0, 4), og: og && abs(og), svgInline };
}

(async () => {
  const res = {};
  await Promise.all(Object.entries(SITES).map(async ([brand, urls]) => {
    for (const u of urls) {
      const r = await get(u);
      if (!r.ok) { res[brand] = (res[brand] || []).concat(`${u} -> ${r.status}`); continue; }
      res[brand] = { from: r.url, ...candidates(r.text, r.url) };
      break;
    }
  }));
  for (const [b, v] of Object.entries(res)) console.log(b, JSON.stringify(v, null, 0));
})();
