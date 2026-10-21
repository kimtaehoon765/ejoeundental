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
for (const slug of ['previsit-checklist','medical-safety-guide','visit-guide','gum-treatment-faq','root-canal-retreatment-faq','dental-insurance-faq','medication-dental-faq','systemic-disease-dental-faq']) {
  const filename = slug+'.html';
  if (!existsSync(filename)) errors.push('Missing source page: '+filename);
  else if (!read(filename).includes('rel="canonical" href="'+host+'/'+filename+'"')) errors.push('Unexpected source canonical: '+filename);
  if (!urls.includes(host+'/'+filename)) errors.push('Missing sitemap URL: '+filename);
}
// Do not mistake a passing preflight for completed migration.
// These preview-host dependencies must be reviewed together on cutover day.
const previewReferences = build.split(preview).length - 1;
if (previewReferences > 0) notes.push('Production build still contains ' + previewReferences + ' preview-host references; review canonical, sitemap, robots, and schema during cutover.');
for (const slug of ['gum-treatment-faq','root-canal-retreatment-faq','dental-insurance-faq','medication-dental-faq','systemic-disease-dental-faq']) {
  const page = read(slug+'.html');
  const json = page.split('<script type="application/ld+json">')[1]?.split('</script>')[0];
  if (!json) { errors.push('FAQ structured data missing: '+slug); continue; }
  try {
    const data = JSON.parse(json);
    if (data['@type'] !== 'FAQPage' || !Array.isArray(data.mainEntity) || data.mainEntity.length !== 6) errors.push('FAQ structured data incomplete: '+slug);
    if (data.isPartOf?.['@id'] !== host+'/#website') errors.push('FAQ source domain mismatch: '+slug);
  } catch { errors.push('FAQ JSON parse failed: '+slug); }
}
// Confirm all patient safety entry points are connected before migration.
for (const source of ['index.html','visit-guide.html','medical-safety-guide.html']) {
 const page=read(source);
 if (!page.includes('href="/previsit-checklist.html"')) errors.push('Checklist navigation missing: '+source);
}
for (const source of ['index.html','visit-guide.html','medical-history.html']) {
 if (!read(source).includes('href="/medical-safety-guide.html"')) errors.push('Safety guide navigation missing: '+source);
}
console.log('DOMAIN PREFLIGHT (read only)');
console.log('Target domain:',host,'| Current preview build:',preview);
console.log('Source sitemap URLs:',urls.length);
for (const n of notes) console.log('NOTE:',n);
for (const e of errors) console.error('ERROR:',e);
console.log('No DNS or domain settings were changed.');
if (errors.length) process.exitCode=1;
