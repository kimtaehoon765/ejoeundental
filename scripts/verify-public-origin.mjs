import fs from 'node:fs';
import path from 'node:path';

const origin = process.env.SITE_PUBLIC_ORIGIN || 'https://ejoeundental.pages.dev';
const allowed = new Set(['https://ejoeundental.pages.dev', 'https://ejoeundental.com']);
if (!allowed.has(origin)) throw new Error('Invalid SITE_PUBLIC_ORIGIN: ' + origin);
const dist = path.resolve('dist');
if (!fs.existsSync(dist)) throw new Error('Missing dist directory: run npm run build first');
const required = ['index.html', 'sitemap.xml', 'robots.txt'];
for (const name of required) if (!fs.existsSync(path.join(dist, name))) throw new Error('Missing output: ' + name);
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
if (!urls.length || !urls.includes(origin + '/')) throw new Error('Missing homepage in sitemap');
if (urls.length !== new Set(urls).size) throw new Error('Duplicate sitemap URLs');
const wrongOrigin = origin === 'https://ejoeundental.com' ? 'https://ejoeundental.pages.dev' : 'https://ejoeundental.com';
for (const url of urls) {
  if (!url.startsWith(origin + '/')) throw new Error('Sitemap URL uses wrong origin: ' + url);
  const relative = decodeURIComponent(url.slice(origin.length + 1));
  if (relative.includes('..') || relative.includes('?') || relative.includes('#')) throw new Error('Invalid sitemap path: ' + url);
  const filename = path.join(dist, relative || 'index.html');
  const page = fs.existsSync(filename) && fs.statSync(filename).isFile() ? filename : path.join(filename, 'index.html');
  if (!fs.existsSync(page)) throw new Error('Missing sitemap page: ' + url);
  const html = fs.readFileSync(page, 'utf8');
  const canonical = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["']/i)?.[1]
    || html.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["']/i)?.[1];
  if (canonical !== url) throw new Error('Canonical mismatch: ' + url + ' -> ' + canonical);
  if (origin.endsWith('.com') && html.includes(wrongOrigin)) throw new Error('Preview origin remains in published page: ' + url);
}
// Check every generated HTML page, not just URLs listed in the sitemap.
let checkedHtml = 0;
function checkGeneratedHtml(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) { checkGeneratedHtml(filename); continue; }
    if (!entry.name.endsWith('.html')) continue;
    checkedHtml++;
    const html = fs.readFileSync(filename, 'utf8');
    if (origin === 'https://ejoeundental.com' && html.includes('https://ejoeundental.pages.dev')) {
      throw new Error('Preview URL remains in generated HTML: ' + path.relative(dist, filename));
    }
  }
}
checkGeneratedHtml(dist);
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
if (!robots.includes('Sitemap: ' + origin + '/sitemap.xml')) throw new Error('Robots sitemap origin mismatch');
console.log('Public origin verified:', origin, '| sitemap pages:', urls.length, '| HTML pages:', checkedHtml);
