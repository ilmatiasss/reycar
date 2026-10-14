const http=require('http'),fs=require('fs'),path=require('path');
const T={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';
const api=p.match(/^\/api\/([a-z0-9-]+)$/);if(api&&fs.existsSync(path.join(__dirname,'api',api[1]+'.js'))){return Promise.resolve(require('./api/'+api[1]+'.js')(q,r)).catch(()=>{r.statusCode=500;r.end('error')})}
const f=path.join(__dirname,p);
if(!f.startsWith(__dirname)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('404')}
r.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(r)}).listen(5173,()=>console.log('http://localhost:5173'));
