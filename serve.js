// Servidor local que imita a Vercel: /api/*, archivos tal cual, direcciones limpias (/tienda → tienda.html),
// sin barra final (/producto/x/ → /producto/x) y cualquier otra dirección → 404.html con estado 404 (la tienda dibuja su página).
const http = require('http'), fs = require('fs'), path = require('path');
const T = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.css': 'text/css;charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.xml': 'application/xml', '.txt': 'text/plain;charset=utf-8' };
const file = (p) => { const f = path.join(__dirname, p); return f.startsWith(__dirname) && fs.existsSync(f) && fs.statSync(f).isFile() ? f : null; };
http.createServer((q, r) => {
  const [rawPath, qs] = q.url.split('?');
  let p; try { p = decodeURIComponent(rawPath); } catch (e) { p = rawPath; }
  const api = p.match(/^\/api\/([a-z0-9-]+)$/);
  if (api && file('api/' + api[1] + '.js')) return Promise.resolve(require('./api/' + api[1] + '.js')(q, r)).catch(() => { r.statusCode = 500; r.end('error'); });
  if (p.length > 1 && p.endsWith('/')) { r.writeHead(308, { Location: p.replace(/\/+$/, '') + (qs ? '?' + qs : '') }); return r.end(); }
  const f = file(p === '/' ? '/index.html' : p) || file(p + '.html');
  if (!f) { r.writeHead(404, { 'Content-Type': T['.html'] }); return fs.createReadStream(path.join(__dirname, '404.html')).pipe(r); }
  r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(r);
}).listen(5173, () => console.log('http://localhost:5173'));
