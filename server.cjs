/* Local preview only. Cloudflare serves public/ without running this server. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, 'public');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
};

function createServer() {
  return http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end('Read-only preview');
      return;
    }
    let requested;
    try {
      requested = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    } catch {
      res.writeHead(400);
      res.end('Invalid URL');
      return;
    }
    const file = path.resolve(root, '.' + (requested === '/' ? '/index.html' : requested));
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !mime[path.extname(file)]) {
      res.writeHead(403);
      res.end('Not a public asset');
      return;
    }
    fs.readFile(file, (error, bytes) => {
      if (error) {
        res.writeHead(404);
        res.end('Asset not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': mime[path.extname(file)],
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, nofollow',
      });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.OPENESG_PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('OPENESG_PORT must be an integer from 1 to 65535');
  }
  const server = createServer();
  server.on('error', error => {
    console.error('Cannot start local preview:', error.message);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => console.log('OpenESG: http://127.0.0.1:' + port + '/'));
}

module.exports = { createServer };
