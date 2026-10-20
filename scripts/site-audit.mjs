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
  const pageTitle = body.split('<title>')[1]?.split('</title>')[0]?.trim();
  if (pageTitle && pageTitle.length > 75) warnings.push(relative + ': 검색 제목이 75자를 초과함');
  const descriptionTag = body.split('<meta name="description" content="')[1];
  const description = descriptionTag?.split('"')[0];
  if (description !== undefined && description.trim().length < 30 && !relative.startsWith('admin/')) {
    warnings.push(relative + ': 검색 설명이 너무 짧음');
  }
  if (!body.includes('name="viewport"')) warnings.push(relative + ': 모바일 viewport 누락');
  if (relative !== 'admin/index.html' && !body.includes('rel="canonical"') && !body.includes('name="robots" content="noindex')) {
    warnings.push(relative + ': canonical 또는 noindex 설정 확인');
  }
  // Prevent accidental indexing of private administration pages.
  if (relative.startsWith('admin/') && !body.includes('name="robots" content="noindex')) {
    errors.push(relative + ': 관리자 페이지 검색 제외(noindex) 누락');
  }
  // External tabs should not retain access to the originating window.
  for (const anchor of body.matchAll(new RegExp('<a[^>]*target="_blank"[^>]*>', 'gi'))) {
    if (!anchor[0].includes('noopener')) warnings.push(relative + ': 외부 새 창 링크에 noopener 누락');
  }
  for (const match of body.matchAll(/\b(?:href|src)=["'](\/[^"'?#]*)/gi)) {
    let target;
    try { target = decodeURIComponent(match[1]); }
    catch { errors.push(relative + ': 잘못된 URL 인코딩 ' + match[1]); continue; }
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
    let p;
    try { p = decodeURIComponent(m[1]); }
    catch { errors.push('사이트맵 URL 인코딩 오류: ' + m[1]); continue; }
    if (p !== '/' && !paths.has(p.slice(0, 1) === '/' ? p : '/' + p) && !paths.has(p + 'index.html')) {
      errors.push('사이트맵 대상 파일 누락: ' + p);
    }
  }
}
// Guard mobile rendering and private admin indexability on every deployment.
const homepageFile = join(root, 'index.html');
if (existsSync(homepageFile)) {
  const homepage = readFileSync(homepageFile, 'utf8');
  if (!homepage.includes('name="viewport"') || !homepage.includes('width=device-width')) errors.push('홈페이지 모바일 viewport 누락');
  if (!homepage.includes('class="skip-link" href="#main-content"')) errors.push('홈페이지 본문 건너뛰기 링크 누락');
  if (!homepage.includes('<main id="main-content">')) errors.push('홈페이지 main-content 누락');
  if (!homepage.includes('src="/assets/site.js') || !homepage.includes('defer></script>')) errors.push('홈페이지 스크립트 defer 누락');
}
// Ensure local SEO data is machine-readable and matches the visible clinic identity.
if (existsSync(homepageFile)) {
  const homepage = readFileSync(homepageFile, 'utf8');
  const blocks = homepage.split('<script type="application/ld+json">').slice(1).map(part => [null, part.split('</script>')[0]]);
  const structured = [];
  for (const [index, block] of blocks.entries()) {
    try { structured.push(JSON.parse(block[1])); }
    catch { errors.push('홈페이지 구조화 데이터 JSON 오류: ' + (index + 1)); }
  }
  const clinic = structured.find(data => data['@type'] === 'Dentist');
  if (!clinic) errors.push('치과 구조화 데이터 누락');
  else {
    if (clinic.name !== '이조은치과' || clinic.telephone !== '+82-32-513-2875') errors.push('치과 이름 또는 전화번호 구조화 데이터 불일치');
    const areas = (clinic.areaServed || []).map(place => place.name || '');
    for (const area of ['청천동', '산곡동', '산곡역']) {
      if (!areas.some(name => name.includes(area))) errors.push('지역 구조화 데이터 누락: ' + area);
    }
  }
}
// Core treatment pages must provide useful routes to related care and clinic access.
for (const treatment of ['gum-treatment.html', 'retreatment.html', 'cervical-abrasion.html']) {
  const file = join(root, treatment);
  if (!existsSync(file)) { errors.push('핵심 진료 페이지 누락: ' + treatment); continue; }
  const page = readFileSync(file, 'utf8');
  for (const related of ['gum-treatment.html', 'retreatment.html', 'cervical-abrasion.html', 'insured-care.html']) {
    if (related !== treatment && !page.includes('/' + related)) errors.push(treatment + ': 관련 진료 연결 누락 ' + related);
  }
  if (!page.includes('032-513-2875') || !page.includes('세월천로 34')) errors.push(treatment + ': 방문 안내 정보 누락');
  if (!page.includes('/#location')) errors.push(treatment + ': 진료시간 안내 링크 누락');
}
const adminFile = join(root, 'admin/index.html');
if (existsSync(adminFile)) {
  const admin = readFileSync(adminFile, 'utf8');
  if (!admin.includes('name="robots" content="noindex')) errors.push('관리자 페이지 noindex 누락');
}
if (!existsSync(join(root, 'robots.txt'))) warnings.push('robots.txt 누락');
console.log('HTML:', html.length, '| 오류:', errors.length, '| 경고:', warnings.length);
for (const e of errors) console.error('ERROR', e);
for (const w of [...new Set(warnings)].slice(0, 100)) console.warn('WARN', w);
if (warnings.length > 100) console.warn('추가 경고:', warnings.length - 100);
if (errors.length) process.exitCode = 1;
