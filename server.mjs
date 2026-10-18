import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname, sep } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    // Serve only the prototype assets, never .git, notes, or project documents.
    const allowed = pathname === '/' || pathname === '/index.html' || pathname === '/favicon.svg' || /^\/src\/[a-zA-Z0-9/_-]+\.(js|css|woff2)$/.test(pathname);
    if (!allowed) { res.writeHead(404); res.end('Not found'); return; }
    const path = resolve(root, pathname === '/' ? 'index.html' : pathname.slice(1));
    if (!path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const content = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 400);
    res.end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Course Pathways ready at http://127.0.0.1:${port}`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
