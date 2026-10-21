// Static output quality checks. Run after npm run build: node scripts/site-audit.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

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
// CI must parse deployed JavaScript, not merely check that script files exist.
const javascriptFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
for (const file of javascriptFiles) {
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.error || check.status !== 0) errors.push('JavaScript 문법 오류: ' + file.slice(root.length + 1) + ' ' + (check.stderr || check.error?.message || '').trim().slice(0, 300));
}
console.log('JavaScript syntax checked:', javascriptFiles.length);

// Check local CSS and JavaScript references as build-breaking errors.
let checkedAssetReferences = 0;
for (const file of html) {
  const page = readFileSync(file, 'utf8');
  const relative = file.slice(root.length + 1);
  for (const tag of page.match(/<(?:script|link)\b[^>]*>/gi) || []) {
    const asset = tag.match(/\b(?:src|href)=["'](\/assets\/[^"'?#]+)/i)?.[1];
    if (!asset || !/\.(?:js|mjs|css)$/i.test(asset)) continue;
    checkedAssetReferences++;
    if (!paths.has(asset)) errors.push(relative + ': 필수 CSS/JS 파일 누락 ' + asset);
  }
}
console.log('Local CSS/JS references checked:', checkedAssetReferences);

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
  if (relative !== 'admin/index.html' && pageTitle && !pageTitle.includes('이조은치과')) {
    warnings.push(relative + ': 검색 제목에 치과 이름 누락');
  }
  if (description !== undefined && description.length > 190) {
    warnings.push(relative + ': 검색 설명이 190자를 초과함');
  }
  if (relative.startsWith('health/') && !body.includes('name="robots" content="noindex') && !body.includes('rel="canonical"')) {
    errors.push(relative + ': 건강정보 페이지 canonical 누락');
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
  for (const anchor of body.matchAll(/<a\\b[^>]*>/gi)) {
    const tag = anchor[0];
    if (!/\\btarget\\s*=\\s*["']_blank["']/i.test(tag)) continue;
    const rel = tag.match(/\\brel\\s*=\\s*["']([^"']*)["']/i)?.[1] || '';
    if (!/\\bnoopener\\b/i.test(rel)) warnings.push(relative + ': 새 창 링크에 noopener 누락');
  }
  for (const match of body.matchAll(/\b(?:href|src)=["'](\/[^"'?#]*)/gi)) {
    let target;
    try { target = decodeURIComponent(match[1]); }
    catch { errors.push(relative + ': 잘못된 URL 인코딩 ' + match[1]); continue; }
    if (target.startsWith('//') || target === '/') continue;
    if (!paths.has(target) && !paths.has(target + 'index.html') && !paths.has(target + '/index.html')) {
      const message = relative + ': 내부 경로 확인 ' + target;
      if (/\.(?:html|js|mjs|css)$/i.test(target)) errors.push(message);
      else warnings.push(message);
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
// Keep patient medication warnings and published guide routes intact on the homepage.
if (existsSync(homepageFile)) {
  const homepage = readFileSync(homepageFile, 'utf8');
  const section = homepage.match(/<aside class="symptom-previsit"[\s\S]*?<\/aside>/)?.[0];
  if (!section) errors.push('홈페이지 방문 전 복용약 안전 안내 누락');
  else {
    for (const link of ['/medical-history.html', '/blood-thinners-dental.html', '/osteoporosis-medication-dental.html', '/diabetes-dental-care.html', '/heart-disease-dental-care.html', '/pregnancy-dental-care.html']) {
      if (!section.includes('href="' + link + '"')) errors.push('복용약 안전 안내 링크 누락: ' + link);
      if (!existsSync(join(root, link.slice(1)))) errors.push('복용약 안전 안내 목적지 누락: ' + link);
    }
    if (!section.includes('임의로 중단하지')) errors.push('복용약 임의 중단 주의 문구 누락');
    for (const detail of ['symptom-previsit-checklist', '약의 이름', '약물 알레르기', '처방 의료진']) {
      if (!section.includes(detail)) errors.push('방문 전 준비 안내 누락: ' + detail);
    }
  }
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
// Catch duplicate IDs that make in-page navigation ambiguous.
for (const file of html) {
  const page = readFileSync(file, 'utf8');
  const ids = new Set();
  for (const match of page.matchAll(/\bid=["']([^"']+)["']/gi)) {
    const id = match[1];
    if (ids.has(id)) errors.push(file.slice(root.length + 1) + ': 중복 HTML id ' + id);
    ids.add(id);
  }
}
// Homepage in-page navigation must point to an existing section or landmark.
if (existsSync(homepageFile)) {
  const home = readFileSync(homepageFile, 'utf8');
  const ids = new Set([...home.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]));
  let checkedAnchors = 0;
  for (const match of home.matchAll(/\bhref=["']#([^"']+)["']/gi)) {
    let fragment;
    try { fragment = decodeURIComponent(match[1]); }
    catch { errors.push('홈페이지 잘못된 앵커 인코딩: ' + match[1]); continue; }
    if (!fragment || fragment === 'top') continue;
    checkedAnchors++;
    if (!ids.has(fragment)) errors.push('홈페이지 앵커 목적지 누락: #' + fragment);
  }
  console.log('Homepage fragment links checked:', checkedAnchors);
}
// Protect the patient symptom shortcuts and local search entry points against regressions.
if (existsSync(homepageFile)) {
  const home = readFileSync(homepageFile, 'utf8');
  const quickStart = home.indexOf('class="symptom-navigator wrap"');
  const heroStart = home.indexOf('class="hero wrap"');
  const localStart = home.indexOf('id="local-care"');
  if (quickStart < 0) errors.push('홈페이지 증상별 바로가기 누락');
  else {
    if (heroStart < 0 || quickStart < heroStart || (localStart >= 0 && quickStart > localStart)) errors.push('홈페이지 증상별 바로가기 배치 오류');
    const quickEnd = home.indexOf('</section>', quickStart);
    const quick = home.slice(quickStart, quickEnd < 0 ? undefined : quickEnd);
    for (const target of ['/health/gum-bleeding.html', '/health/swollen-gums.html', '/health/abrasion-sensitive.html', '/health/root-canal-after-pain.html', '/health/loose-tooth.html', '/health/denture-loose.html']) {
      if (!quick.includes('href="' + target + '"')) errors.push('증상별 바로가기 연결 누락: ' + target);
    }
  }
}
// Keep the prominent symptom buttons aligned with the symptom quick-navigation section.
if (existsSync(homepageFile)) {
  const home = readFileSync(homepageFile, 'utf8');
  if (!home.includes('class="btn hero-symptoms" href="#symptom-navigator-title"')) errors.push('첫 화면 증상 버튼 연결 오류');
  if (!home.includes('class="mobile-quick"') || !home.includes('href="#symptom-navigator-title" aria-label="증상별 건강정보 바로가기"')) errors.push('모바일 증상 바로가기 연결 오류');
  if (!home.includes('id="symptom-navigator-title"')) errors.push('증상별 바로가기 목적지 누락');
}
const searchPage = join(root, 'search.html');
const searchScript = join(root, 'assets/search.js');
if (!existsSync(searchPage) || !existsSync(searchScript)) errors.push('홈페이지 검색 화면 또는 스크립트 누락');
else {
  const page = readFileSync(searchPage, 'utf8');
  const script = readFileSync(searchScript, 'utf8');
  if (!page.includes('id="q"') || !page.includes('id="results"') || !page.includes('id="status"')) errors.push('검색 입력 또는 결과 표시 영역 누락');
  if (!page.includes('/assets/search.js')) errors.push('검색 스크립트 연결 누락');
  if (!page.includes('<meta name="robots" content="noindex,follow">')) errors.push('검색 결과 페이지 검색엔진 색인 제한 누락');
  if (!page.includes('<form class="search-form" role="search"') || !page.includes('action="/search.html" method="get"')) errors.push('검색 양식 기본 동작 누락');
  if (!page.includes('name="q" type="search"') || !page.includes('aria-describedby="search-help"')) errors.push('검색 입력 접근성 안내 누락');
  if (!page.includes('id="status" role="status" aria-live="polite"')) errors.push('검색 결과 상태 알림 접근성 누락');
  const searchIds = new Set([...page.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]));
  for (const match of page.matchAll(/\bhref=["']#([^"']+)["']/gi)) {
    const fragment = match[1];
    if (!searchIds.has(fragment)) errors.push('검색 화면 앵커 목적지 누락: #' + fragment);
  }
  if (!page.includes('href="#symptom-search"') || !searchIds.has('symptom-search')) errors.push('모바일 증상 검색 바로가기 누락');
  for (const term of ['혈액희석제', '골다공증 약', '핸드피스', '멸균기']) {
    if (!page.includes(term)) errors.push('검색 바로가기 누락: ' + term);
  }
  for (const route of ['/curing-light-maintenance.html', '/dental-chair-maintenance.html', '/dental-xray-maintenance.html', '/endodontic-instruments-guide.html', '/equipment-log.html', '/extraction-instruments-guide.html', '/intraoral-camera-maintenance.html', '/periodontal-instruments-guide.html', '/scaler-maintenance.html']) {
    if (!script.includes(route.slice(1, -5))) errors.push('검색 장비·기구 분류 누락: ' + route);
  }
  // Search labels must recognize specialist articles inside /health/ as well as at the root.
  for (const group of ['medicalGuide', 'equipmentGuide']) {
    const declaration = script.split('const ' + group + '=')[1]?.split(';')[0] || '';
    if (!declaration.includes('health\\/')) errors.push('검색 분류에서 /health/ 경로 지원 누락: ' + group);
  }
  if (!script.includes("medicalGuide?'medical':equipmentGuide?'equipment':p.url.startsWith('/health/')?'health'")) errors.push('검색 전문 안내 분류 우선순위 오류');
  // Topic boosts should never make a page appear without matching a search term.
  for (const intent of ['safetyIntent', 'equipmentIntent', 'giInsuranceIntent', 'gumIntent', 'retreatmentIntent']) {
    if (!script.includes('matched>0&&' + intent)) errors.push('검색어 불일치 결과 가산점 차단 누락: ' + intent);
  }
  // Whole-query bonuses must not admit pages with no actual matched search terms.
  if (!script.includes('if(matched>0&&normalizedQuery.length>=3)')) errors.push('검색 구문 가산점의 검색어 일치 검증 누락');
  // Partial results must disclose which actual search terms matched.
  for (const snippet of ['const matchedTerms=[]', 'matchedTerms.push(term)', 'matchedTerms.join(', 'partialSectionShown']) {
    if (!script.includes(snippet)) errors.push('검색 부분 일치 설명 누락: ' + snippet);
  }
  // Partial results must explain which terms actually matched.
  for (const required of ['const matchedTerms=[]', 'matchedTerms.push(term)', 'matchedTerms.join(', 'partialSectionShown', 'exactSectionShown']) {
    if (!script.includes(required)) errors.push('검색 부분 일치 결과 설명 누락: ' + required);
  }
  // Search relevance boosts must not masquerade as matches to every typed word.
  if (/matched\\s*=\\s*terms\\.length/.test(script)) errors.push('검색 결과 관련도 계산에서 검색어 일치 수를 강제로 변경함');
  for (const target of ['/medical-history.html', '/dental-equipment.html', '/content/search-index.json']) {
    if (!script.includes(target)) errors.push('검색 안전정보 연결 누락: ' + target);
  }
}
// Patient-facing pages should not lose the canonical clinic identity or mobile support.
const patientPages = ['index.html', 'gum-treatment.html', 'retreatment.html', 'cervical-abrasion.html', 'insured-care.html', 'medical-history.html', 'search.html'];
for (const name of patientPages) {
  const file = join(root, name);
  if (!existsSync(file)) { errors.push('핵심 환자 안내 페이지 누락: ' + name); continue; }
  const page = readFileSync(file, 'utf8');
  if (!/<html[^>]*lang=["']ko["']/i.test(page)) errors.push(name + ': 한국어 언어 표시 누락');
  if (!/<meta[^>]*name=["']viewport["']/i.test(page)) errors.push(name + ': 모바일 viewport 누락');
  if (!/<title>[^<]+<\/title>/i.test(page)) errors.push(name + ': 페이지 제목 누락');
  if (!page.includes('이조은치과')) errors.push(name + ': 치과 이름 누락');
  if (!page.includes('032-513-2875') && !page.includes('0325132875')) errors.push(name + ': 전화번호 누락');
}
// Verify practical visit details are kept together for patients on mobile.
if (existsSync(homepageFile)) {
  const home = readFileSync(homepageFile, 'utf8');
  const visit = home.indexOf('class="visit-quick-facts"');
  const parking = home.indexOf('class="parking-info"');
  if (visit < 0 || parking < 0 || visit > parking) errors.push('방문 핵심정보 카드 위치 또는 표시 누락');
  else {
    const summary = home.slice(visit, parking);
    for (const detail of ['세월천로 34', '대우프라자 305호', '3시간 무료', '격주 운영', 'href="#parking-details"', 'href="#weekly-hours"', 'href="tel:0325132875"']) {
      if (!summary.includes(detail)) errors.push('방문 핵심정보 누락: ' + detail);
    }
  }
  for (const anchor of ['parking-details', 'weekly-hours']) {
    if (!home.includes('id="' + anchor + '"')) errors.push('방문 정보 상세 이동 위치 누락: ' + anchor);
  }
  if (!home.includes('href="tel:0325132875"')) errors.push('전화 연결 누락');
}
const enhancements = join(root, 'assets/home-enhancements.css');
if (existsSync(enhancements)) {
  const css = readFileSync(enhancements, 'utf8');
  if (!css.includes('.visit-quick-facts')) errors.push('방문 핵심정보 스타일 누락');
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
