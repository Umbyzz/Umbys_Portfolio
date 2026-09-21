const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {buildGallery} = require('./generate-gallery.cjs');
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname,'..');
const port = Number(process.env.PORT || 8767);
http.createServer((req,res) => {
    try {
        const requested = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
        if (requested === '/' || requested === '/index.html') {
            res.setHeader('Content-Type','text/html; charset=utf-8');
            res.setHeader('Cache-Control','no-store');
            return res.end(buildGallery(root).html);
        }
        const file = path.resolve(root,'.' + requested);
        if (!file.startsWith(root + path.sep) || requested.split('/').some(part => part.startsWith('.'))) {res.writeHead(403);return res.end();}
        const stat = fs.statSync(file);
        if (!stat.isFile()) {res.writeHead(404);return res.end();}
        res.setHeader('Content-Type',({'.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.gif':'image/gif','.webp':'image/webp','.avif':'image/avif','.mp4':'video/mp4','.webm':'video/webm'})[path.extname(file).toLowerCase()] || 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
    } catch (error) {res.writeHead(error.code === 'ENOENT' ? 404 : 500);res.end('Preview could not load this file.');}
}).listen(port,'127.0.0.1',() => console.log(`Preview: http://127.0.0.1:${port} — refresh after adding pictures.`));
