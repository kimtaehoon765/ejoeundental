// Read-only preflight for the planned domain migration.
// Does not change DNS, hosting configuration, or any files.
import { readFileSync, existsSync } from 'node:fs';
const errors = [];
const notes = [];
const root = process.cwd();
const read = name => readFileSync(name,'utf8');
const source = read('sitemap.xml');
const robots = read('robots.txt');
const build = read('build.mjs');
const homepage = read('index.html');
const host = 'https://ejoeundental.com';
const preview = 'https://ejoeundental.pages.dev';
const urls = [...source.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
if (!urls.length) errors.push('Source sitemap is empty');
if (new Set(urls).size !== urls.length) errors.push('Source sitemap has duplicate URLs');
for (const url of urls) {
  if (!url.startsWith(host+'/')) errors.push('Non-target domain in source sitemap: '+url);
  const pathname = new URL(url).pathname;
  if (pathname.includes('..')) errors.push('Unsafe sitemap path: '+pathname);
  if (!existsSync('.'+pathname) && !pathname.startsWith('/stories/')) notes.push('Dynamic or generated page, verify in build: '+pathname);
}
if (!robots.includes('Sitemap: '+host+'/sitemap.xml')) errors.push('Source robots sitemap is not on target domain');
if (!homepage.includes('rel="canonical"')) errors.push('Homepage canonical missing');
if (!build.includes(preview)) errors.push('Preview build host configuration changed: inspect before migration');
if (!build.includes('normalizedSitemap')) errors.push('Preview sitemap normalization changed: inspect before migration');
for (const slug of ['visit-guide','gum-treatment-faq','root-canal-retreatment-faq','dental-insurance-faq']) {
  const filename = slug+'.html';
  if (!existsSync(filename)) errors.push('Missing source page: '+filename);
  else if (!read(filename).includes('rel="canonical" href="'+host+'/'+filename+'"')) errors.push('Unexpected source canonical: '+filename);
  if (!urls.includes(host+'/'+filename)) errors.push('Missing sitemap URL: '+filename);
}
console.log('DOMAIN PREFLIGHT (read only)');
console.log('Target domain:',host,'| Current preview build:',preview);
console.log('Source sitemap URLs:',urls.length);
for (const n of notes) console.log('NOTE:',n);
for (const e of errors) console.error('ERROR:',e);
console.log('No DNS or domain settings were changed.');
if (errors.length) process.exitCode=1;
