// Static output quality checks. Run after npm run build: node scripts/site-audit.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('dist');
if (!existsSync(root)) {
  console.error('dist 폴더가 없습니다. 먼저 npm run build를 실행하세요.');
  process.exit(1);
}
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(root);
const html = files.filter(f => f.endsWith('.html'));
const errors = [];
const warnings = [];
const paths = new Set(files.map(f => '/' + f.slice(root.length + 1).replaceAll('\\', '/')));
for (const f of html) {
  const body = readFileSync(f, 'utf8');
  const relative = f.slice(root.length + 1);
  if (!/<html\b[^>]*lang=["']ko["']/i.test(body)) warnings.push(relative + ': 한국어 lang 확인');
  if (!/<title>[^<]+<\/title>/i.test(body)) errors.push(relative + ': title 누락');
  if (!/<meta\s+name=["']description["']/i.test(body)) warnings.push(relative + ': description 누락');
  for (const match of body.matchAll(/\b(?:href|src)=["'](\/[^"'?#]*)/gi)) {
    const target = decodeURIComponent(match[1]);
    if (target.startsWith('//') || target === '/') continue;
    if (!paths.has(target) && !paths.has(target + 'index.html') && !paths.has(target + '/index.html')) {
      warnings.push(relative + ': 내부 경로 확인 ' + target);
    }
  }
}
const sitemap = join(root, 'sitemap.xml');
if (!existsSync(sitemap)) errors.push('sitemap.xml 누락');
else {
  const xml = readFileSync(sitemap, 'utf8');
  for (const m of xml.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)) {
    const p = decodeURIComponent(m[1]);
    if (p !== '/' && !paths.has(p.slice(0, 1) === '/' ? p : '/' + p) && !paths.has(p + 'index.html')) {
      errors.push('사이트맵 대상 파일 누락: ' + p);
    }
  }
}
// Guard mobile rendering and private admin indexability on every deployment.
const homepageFile = join(root, 'index.html');
if (existsSync(homepageFile)) {
  const homepage = readFileSync(homepageFile, 'utf8');
  if (!/<meta\\s+name=["']viewport["'][^>]*width=device-width/i.test(homepage)) errors.push('홈페이지 모바일 viewport 누락');
  if (!/<a\\b[^>]*class=["'][^"']*skip-link[^"']*["'][^>]*href=["']#main-content["']/i.test(homepage)) errors.push('홈페이지 본문 건너뛰기 링크 누락');
  if (!/<main\\b[^>]*id=["']main-content["']/i.test(homepage)) errors.push('홈페이지 main-content 누락');
  if (!/src=["']\\/assets\\/site\\.js[^"']*["'][^>]*\\bdefer\\b/i.test(homepage)) errors.push('홈페이지 스크립트 defer 누락');
}
const adminFile = join(root, 'admin/index.html');
if (existsSync(adminFile)) {
  const admin = readFileSync(adminFile, 'utf8');
  if (!/<meta\\s+name=["']robots["']\\s+content=["'][^"']*noindex/i.test(admin)) errors.push('관리자 페이지 noindex 누락');
}
if (!existsSync(join(root, 'robots.txt'))) warnings.push('robots.txt 누락');
console.log('HTML:', html.length, '| 오류:', errors.length, '| 경고:', warnings.length);
for (const e of errors) console.error('ERROR', e);
for (const w of [...new Set(warnings)].slice(0, 100)) console.warn('WARN', w);
if (warnings.length > 100) console.warn('추가 경고:', warnings.length - 100);
if (errors.length) process.exitCode = 1;
