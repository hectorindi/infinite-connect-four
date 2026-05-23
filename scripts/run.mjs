import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const binDir = path.join(root, 'bin');
const port = process.env.PORT || 4173;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer(async (req, res) => {
  const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.join(binDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!filePath.startsWith(binDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`Serving bin at http://localhost:${port}`);
});
