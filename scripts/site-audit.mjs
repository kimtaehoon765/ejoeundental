// Static output quality checks. Run after npm run build: node scripts/site-audit.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve('dist');
const publicOrigin = process.env.SITE_PUBLIC_ORIGIN || 'https://ejoeundental.com';
if (!['https://ejoeundental.pages.dev', 'https://ejoeundental.com'].includes(publicOrigin)) {
  throw new Error('Unsupported SITE_PUBLIC_ORIGIN: ' + publicOrigin);
}
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
  // Flag insecure target=_blank links as build failures, not passive warnings.
  for (const anchor of body.matchAll(/<a\b[^>]*>/gi)) {
    const tag = anchor[0];
    if (!/\btarget\s*=\s*["']_blank["']/i.test(tag)) continue;
    const rel = tag.match(/\brel\s*=\s*["']([^"']*)["']/i)?.[1] || '';
    if (!/\b(?:noopener|noreferrer)\b/i.test(rel)) errors.push(relative + ': 새 창 링크에 noopener 또는 noreferrer 누락');
  }
  for (const match of body.matchAll(/\b(?:href|src)=["'](\/[^"'?#]*)/gi)) {
    let target;
    try { target = decodeURIComponent(match[1]); }
    catch { errors.push(relative + ': 잘못된 URL 인코딩 ' + match[1]); continue; }
    if (target.startsWith('//') || target === '/') continue;
    // The published Cloudflare site serves /care-guide for /care-guide.html.
    // Check the real local file rather than warning on a valid extensionless link.
    const finalHtmlTarget=/^\/[a-z0-9/_-]+\/?$/i.test(target)
      ?target.replace(/\/$/,'')+'.html':null;
    if (!paths.has(target) && !paths.has(target + 'index.html') && !paths.has(target + '/index.html') && (!finalHtmlTarget || !paths.has(finalHtmlTarget))) {
      const message = relative + ': 내부 경로 확인 ' + target;
      if (/\.(?:html|js|mjs|css)$/i.test(target)) errors.push(message);
      else warnings.push(message);
    }
  }
}
// Check local in-page navigation against actual element IDs.
let checkedPageAnchors = 0;
for (const file of html) {
  const page = readFileSync(file, 'utf8');
  const relative = file.slice(root.length + 1).replaceAll('\\', '/');
  const ids = new Set([...page.matchAll(/\bid=["']([^"']+)["']/gi)].map(m => m[1]));
  for (const match of page.matchAll(/<a\b[^>]*\bhref=["']#([^"']+)["'][^>]*>/gi)) {
    checkedPageAnchors++;
    let fragment;
    try { fragment = decodeURIComponent(match[1]); }
    catch { errors.push(relative + ': 잘못된 앵커 인코딩 ' + match[1]); continue; }
    if (fragment && !ids.has(fragment)) errors.push(relative + ': 연결 대상이 없는 페이지 내 앵커 #' + fragment);
  }
}
console.log('Same-page anchors checked:', checkedPageAnchors);

const sitemap = join(root, 'sitemap.xml');
if (!existsSync(sitemap)) errors.push('sitemap.xml 누락');
else {
  const xml = readFileSync(sitemap, 'utf8');
  const sitemapUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].trim());
  if (!sitemapUrls.length) errors.push('사이트맵 URL 목록이 비어 있음');
  if (new Set(sitemapUrls).size !== sitemapUrls.length) errors.push('사이트맵에 중복 URL 존재');
  for (const value of sitemapUrls) {
    let parsed;
    try { parsed = new URL(value); }
    catch { errors.push('사이트맵 URL 형식 오류: ' + value); continue; }
    if (parsed.origin !== publicOrigin || parsed.search || parsed.hash) {
      errors.push('사이트맵 도메인 또는 URL 형식 불일치: ' + value);
      continue;
    }
    let p;
    try { p = decodeURIComponent(parsed.pathname); }
    catch { errors.push('사이트맵 URL 인코딩 오류: ' + value); continue; }
    if (p.includes('\\\\') || p.split('/').some(segment => segment === '.' || segment === '..') || p.includes('?') || p.includes('#')) {
      errors.push('사이트맵에 안전하지 않은 경로 존재: ' + value);
      continue;
    }
    if (p === '/') {
      if (!paths.has('/index.html')) errors.push('사이트맵 홈페이지 파일 누락');
    } else if (!paths.has(p) && !paths.has(p + '.html') && !paths.has(p.replace(/\/$/, '') + '/index.html')) {
      errors.push('사이트맵 대상 파일 누락: ' + p);
    }
  }
  // A lastmod date is only useful when it reflects significant page changes.
  const entryRows=[...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?\s*<\/url>/g)];
  const futureLimit=new Date(Date.now()+24*60*60*1000).toISOString().slice(0,10);
  for(const row of entryRows){
    const lastmod=row[2];
    if(!lastmod)continue;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)||Number.isNaN(Date.parse(lastmod))||lastmod>futureLimit){
      errors.push('사이트맵 lastmod 날짜 유효성 오류: '+row[1]);
    }
  }
  console.log('Sitemap lastmod values checked:',entryRows.filter(row=>row[2]).length);
  console.log('Sitemap URLs checked:', sitemapUrls.length);
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
// Validate printable medical-history checklist and homepage deep link.
if (existsSync(homepageFile)) {
  const home = readFileSync(homepageFile, 'utf8');
  const historyFile = join(root, 'medical-history.html');
  if (!home.includes('href="/medical-history.html#visit-checklist"')) errors.push('홈페이지 인쇄 확인표 연결 누락');
  if (!existsSync(historyFile)) errors.push('진료 전 확인표 페이지 누락');
  else {
    const history = readFileSync(historyFile, 'utf8');
    for (const detail of ['id="visit-checklist"', 'class="checklist-writing"', 'window.print()', '복용 중인 약·주사 이름과 용량', '약물 알레르기·과거 이상반응', 'checklist-date', '마지막 투여일 확인', '임의로 중단하지 마세요', '마지막 투여일 (해당 시)', '담당 진료과 (해당 시)', '처방전이나 약 봉투']) {
      if (!history.includes(detail)) errors.push('진료 전 인쇄 확인표 누락: ' + detail);
    }
  }
}
// Homepage search must submit to the indexed health-information search without client-side scripts.
if (existsSync(homepageFile)) {
  const home = readFileSync(homepageFile, 'utf8');
  const form = home.match(/<form class="symptom-quick-search"[\s\S]*?<\/form>/)?.[0];
  if (!form) errors.push('홈페이지 증상 검색 폼 누락');
  else {
    for (const detail of ['action="/search.html"', 'method="get"', 'role="search"', 'name="q"', 'type="search"', 'type="submit"', 'for="home-symptom-query"', 'id="home-symptom-query"', 'class="symptom-quick-topics"', '/search.html?q=', '잇몸 출혈', '재신경치료', '혈액희석제']) {
      if (!form.includes(detail)) errors.push('홈페이지 증상 검색 폼 구성 누락: ' + detail);
    }
  }
}
if (existsSync(homepageFile)) {
  const home = readFileSync(homepageFile, 'utf8');
  if (!home.includes('href="#home-symptom-query"')) errors.push('모바일 검색 바로가기 연결 누락');
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
  const website = structured.find(data => data['@type'] === 'WebSite');
  const searchAction = website?.potentialAction;
  if (searchAction?.['@type'] !== 'SearchAction' || !new Set([publicOrigin, 'https://ejoeundental.com']).has(String(searchAction?.target?.urlTemplate || '').replace('/search.html?q={search_term_string}', '')) || !String(searchAction?.target?.urlTemplate || '').endsWith('/search.html?q={search_term_string}') || searchAction?.['query-input'] !== 'required name=search_term_string') errors.push('홈페이지 통합 검색 구조화 데이터 불일치');
  const clinic = structured.find(data => data['@type'] === 'Dentist');
  if (!clinic) errors.push('치과 구조화 데이터 누락');
  else {
    if (clinic.name !== '이조은치과' || clinic.telephone !== '+82-32-513-2875') errors.push('치과 이름 또는 전화번호 구조화 데이터 불일치');
    const areas = (clinic.areaServed || []).map(place => place.name || '');
    for (const area of ['청천동', '산곡동', '산곡역', '세월천사거리', '갈산역']) {
      if (!areas.some(name => name.includes(area))) errors.push('지역 구조화 데이터 누락: ' + area);
    }
  }
}
// Keep local landing information grounded in verified real geography rather than an artificial keyword list.
{
 const homePage=readFileSync(join(root,'index.html'),'utf8');
 for(const landmark of ['청천푸르지오','부평캐슬앤더샵퍼스트','e편한세상 부평그랑힐스','세월천사거리']){
  if(!homePage.includes(landmark))errors.push('실제 인근 생활권 안내 누락: '+landmark);
 }
}
// Public transit details should stay accurate, visible and mutually linked.
{
 const home=readFileSync(join(root,'index.html'),'utf8');
 const guideFile=join(root,'visit-guide.html');
 if(!existsSync(guideFile)) errors.push('방문 안내 페이지 누락');
 else {
  const guide=readFileSync(guideFile,'utf8');
  for(const detail of ['산곡역','도보 약 10분','세월천사거리','대우프라자 305호','/#location']){
   if(!guide.includes(detail))errors.push('방문 안내 길찾기 정보 누락: '+detail);
  }
  if(!guide.includes('https://map.naver.com/p/search/'))errors.push('방문 안내 네이버 지도 연결 누락');
 }
 for(const detail of ['class="local-transit-hint"','/visit-guide.html','산곡역에서 도보 약 10분']){
  if(!home.includes(detail))errors.push('홈페이지 산곡역 접근 안내 누락: '+detail);
 }
 const faqChunks=[...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 try{
  const data=faqChunks.map(m=>JSON.parse(m[1])).find(item=>item['@type']==='FAQPage');
  const stationFaq=data?.mainEntity?.find(item=>String(item.name||'').includes('산곡역에서 어떻게 찾아가나요?'));
  if(!stationFaq||!String(stationFaq.acceptedAnswer?.text||'').includes('산곡역에서 도보 약 10분'))errors.push('산곡역 FAQ 구조화 데이터 설명 불일치');
 }catch{errors.push('홈페이지 FAQ JSON-LD 문법 오류');}
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
  // Regional content should help patients reach the clinic, not just repeat nearby keywords.
  if (!page.includes('href="/visit-guide.html"')) errors.push(treatment + ': 산곡역 방면 상세 방문안내 연결 누락');
  if (!page.includes('class="treatment-area-note"')) errors.push(treatment + ': 주변 지역 진료·방문 안내 누락');
  if (!page.includes('청천동 세월천로 34')) errors.push(treatment + ': 실제 청천동 주소 안내 누락');
  if (!page.includes('href="/#doctor"')) errors.push(treatment + ': 의료진 소개 링크 누락');
}
// The insured care page is also one of the main entrances for regional searches.
{
 const insured=join(root,'insured-care.html');
 if(!existsSync(insured))errors.push('건강보험 진료 페이지 누락');
 else {
  const text=readFileSync(insured,'utf8');
  for(const expected of ['href="/visit-guide.html"','href="/#doctor"','건강보험 적용','청천동 세월천로 34']){
   if(!text.includes(expected))errors.push('건강보험 방문·지역 정보 누락: '+expected);
  }
 }
}
// Patients should be able to check the real clinic director behind major educational advice.
for(const pageName of ['health/gum-bleeding.html','health/root-canal-after-pain.html','health/tooth-preservation.html']){
 const pageFile=join(root,pageName);
 if(!existsSync(pageFile)){errors.push('임상 건강정보 페이지 누락: '+pageName);continue;}
 if(!readFileSync(pageFile,'utf8').includes('href="/#doctor"'))errors.push('건강정보 의료진 소개 링크 누락: '+pageName);
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
// 첫 화면 핵심 진료의 4+5개 링크와 연락처 우선 배치를 보호합니다.
{
 const homepage=readFileSync(join(root,'index.html'),'utf8');
 const hero=homepage.match(/<section class="hero wrap">([\s\S]*?)<\/section>/)?.[1]||'';
 const nav=hero.match(/<nav class="hero-care-summary"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 const details=nav.match(/<details class="hero-more-care">([\s\S]*?)<\/details>/)?.[0]||'';
 const primary=nav.replace(details,'');
 const mainHrefs=[...primary.matchAll(/<a\b[^>]*href="(\/[^"]+\.html)"/gi)].map(x=>x[1]);
 const extraHrefs=[...details.matchAll(/<a\b[^>]*href="(\/[^"]+\.html)"/gi)].map(x=>x[1]);
 const expectedPriority=['/gum-treatment.html','/retreatment.html','/cervical-abrasion.html','/insured-care.html'];
 const allHrefs=[...mainHrefs,...extraHrefs];
 if(mainHrefs.length!==4||extraHrefs.length!==5||expectedPriority.some(x=>!mainHrefs.includes(x))||new Set(allHrefs).size!==9)errors.push('첫 화면 진료 링크 4+5개 구성 오류');
 if(!details.includes('<summary>다른 진료·건강정보 5개 더 보기'))errors.push('첫 화면 진료 메뉴 펼치기 누락');
 if(hero.indexOf('class="hero-actions"')<0||hero.indexOf('class="hero-actions"')>hero.indexOf('class="hero-care-summary"'))errors.push('첫 화면 전화·진료시간 문의가 진료 메뉴보다 아래에 있음');
 if(!hero.includes('href="tel:0325132875"'))errors.push('첫 화면 전화 문의 연결 누락');
 if(!homepage.includes('href="/assets/home-enhancements.css'))errors.push('홈페이지 공통 개선 스타일 누락');
}

// 홈페이지 전체 진료 5+8: 환자 우선 4개 진료와 자연치아 보존 원칙은
// 바로 보이고, 나머지 8개는 자바스크립트 없이 펼쳐져야 합니다.
{
 const home=readFileSync(join(root,'index.html'),'utf8');
 const care=home.match(/<section class="section" id="care">([\s\S]*?)<\/section>/)?.[1]||'';
 const reveal=care.match(/<details class="care-more-details">([\s\S]*?)<\/details>/)?.[0]||'';
 const first=care.split('<details class="care-more-details">')[0];
 const baseCards=[...first.matchAll(/<div class="card(?: [^"]+)?">/g)].length;
 const extraCards=[...reveal.matchAll(/<div class="card(?: [^"]+)?">/g)].length;
 const expectedMain=['자연치아를 살리는 치료부터','잇몸치료','재신경치료','치경부마모증 · GI','건강보험 진료'];
 const expectedExtra=['임플란트','충치치료','사랑니 발치','턱관절 치료','스케일링','틀니치료','어린이 교정','어린이 치과진료'];
 if(baseCards!==5||extraCards!==8||expectedMain.some(x=>!first.includes('<h3>'+x+'</h3>'))||
   expectedExtra.some(x=>!reveal.includes('<h3>'+x+'</h3>'))){
  errors.push('홈페이지 전체 진료 5+8개 묶음/진료명 누락');
 }
 if(!reveal.includes('<summary>임플란트·충치·틀니 등 다른 진료 8가지 더 보기')||
   !reveal.includes('class="grid care-more-grid"')||reveal.includes('<details class="care-more-details" open')){
  errors.push('모바일 전체 진료 더 보기 단추·기본 닫힘 상태 누락');
 }
 if(!home.includes('/assets/home-enhancements.css?v=20261023-focus-nav-compact')){
  errors.push('홈페이지 진료목록 반응형 CSS 캐시 버전 누락');
 }
 for(const url of ['/implant.html','/cavity-treatment.html','/wisdom-tooth.html','/tmj-care.html','/denture.html','/pediatric-orthodontics.html','/pediatric-dentistry.html']){
  if(!reveal.includes('href="'+url+'"'))errors.push('추가 진료 바로가기 링크 누락: '+url);
 }
}

// 집중 진료 빠른 안내 섹션: 긴 반복 진료 설명을 제거하되,
// 환자가 찾는 다섯 핵심 진료와 기존 검색·FAQ·방문 연결은 유지합니다.
{
 const home=readFileSync(join(root,'index.html'),'utf8');
 const overview=home.match(/<section class="section light" id="focus-care">([\s\S]*?)<\/section>/)?.[1]||'';
 const nav=overview.match(/<nav class="focus-care-shortcuts" aria-label="원장이 중점적으로 안내하는 진료">([\s\S]*?)<\/nav>/)?.[1]||'';
 const primaryRoutes=['/gum-treatment.html','/retreatment.html','/cervical-abrasion.html','/insured-care.html','/scaling.html'];
 const links=[...nav.matchAll(/<a href="([^"]+)"><strong>([^<]+)<\/strong><span>([^<]+)<\/span><\/a>/g)];
 if(links.length!==5||links.some((m,i)=>m[1]!==primaryRoutes[i])||new Set(links.map(m=>m[1])).size!==5){
  errors.push('집중 진료 빠른 안내 5개 진료 링크가 올바르지 않음');
 }
 if(overview.includes('<div class="card"')||overview.length>1600){
  errors.push('집중 진료 안내에 반복적인 긴 설명 카드가 남아 있음');
 }
 for(const href of ['#symptoms','#care','/search.html','#faq','#visit-guide']){
  if(!overview.includes('href="'+href+'"'))errors.push('집중 진료 빠른 찾기 연결 누락: '+href);
 }
 const css=join(root,'assets/home-enhancements.css');
 if(!existsSync(css)||!readFileSync(css,'utf8').includes('#focus-care .focus-care-shortcuts{')){
  errors.push('집중 진료 컴팩트 바로가기 반응형 CSS 누락');
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
  // Search input and results must appear before the long topic lists on narrow screens.
  const searchStart=page.indexOf('<main id="main-content"');
  const searchFormPos=page.indexOf('<form class="search-form"',searchStart);
  const searchStatusPos=page.indexOf('<p id="status"',searchStart);
  const searchResultsPos=page.indexOf('<section id="results"',searchStart);
  const firstSuggestionsPos=page.indexOf('<p class="search-suggestions"',searchStart);
  const symptomExplorerPos=page.indexOf('id="symptom-search"',searchStart);
  if ([searchStart,searchFormPos,searchStatusPos,searchResultsPos,firstSuggestionsPos,symptomExplorerPos].some(pos=>pos<0)||
      !(searchStart<searchFormPos&&searchFormPos<searchStatusPos&&searchStatusPos<searchResultsPos&&searchResultsPos<firstSuggestionsPos&&firstSuggestionsPos<symptomExplorerPos)) errors.push('모바일 검색 입력·결과를 추천 검색어보다 먼저 표시해야 합니다');
  if (!page.includes('class="search-primary"')||!page.includes('/assets/search-page.css')) errors.push('검색 화면 우선 배치 스타일 누락');

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
  if (!script.includes('exactSectionShown')) errors.push('검색 완전 일치 결과 설명 누락: exactSectionShown');
  // Do not silently lose matches after the 20th result. Keep a keyboard-usable button.
  for (const snippet of ['const maxResults=20', "const renderMatches=(batch,container)=>", "const orderedResults=[...exactPool,...partialPool]", "showMore.addEventListener('click'", "status.textContent='검색 결과 '+orderedResults.length"]) {
    if(!script.includes(snippet))errors.push('검색 결과 20개씩 더 보기 기능 누락: '+snippet);
  }
  // The build fingerprints script query strings, so check function and asset presence instead of a source-only version string.
  const searchCss=join(root,'assets/search-page.css');
  if(!existsSync(searchCss)||!readFileSync(searchCss,'utf8').includes('.search-show-more{'))errors.push('검색 결과 더 보기 버튼 스타일 누락');
  // Mixed patient search results must remain accessible by type without hiding
  // lower-ranked documents or losing the 20-at-a-time pagination.
  for(const fragment of ['const searchCategory=p=>','const showResults=type=>','className=\'search-category-filters\'',
    'aria-pressed','results.append(filterBar)','listArea.replaceChildren()']){
   if(!script.includes(fragment))errors.push('검색 결과 유형별 필터 기능 누락: '+fragment);
  }
  if(!page.includes('/assets/search-page.css?v=20261023-visit-card1'))
   errors.push('검색 유형별 필터 CSS 새 버전 연결 누락');
  if(!existsSync(searchCss)||!readFileSync(searchCss,'utf8').includes('.search-category-filter[aria-pressed="true"]'))
   errors.push('검색 결과 선택된 유형 표시 스타일 누락');

  // 일반 검색과 전문가용 참고자료의 경계를 분명히 표시하고, 장비 문의에
  // 실패한 환자용 검색 목록 대신 관련 실무 가이드 바로가기를 제공한다.
  for(const term of ['search-expert-direct-links','search-expert-direct-actions',
    '/dental-equipment.html','/dental-materials.html','/handpiece-maintenance.html',
    '/autoclave-maintenance.html','/suction-maintenance.html','/compressor-maintenance.html',
    '/scaler-maintenance.html','/curing-light-maintenance.html','/dental-chair-maintenance.html',
    '/intraoral-camera-maintenance.html','/dental-xray-maintenance.html',
    '/dental-cements-guide.html','/equipment-log.html']){
   if(!script.includes(term))errors.push('치과 전문가용 장비 별도 안내 누락: '+term);
  }
  if(!page.includes('장비·재료 검색어는 별도 전문가용 참고자료')||
     !page.includes('핸드피스·멸균기 등 장비 검색어는 별도 전문가용 참고자료')){
   errors.push('환자 통합 검색과 전문가용 장비 자료 구분 설명 누락');
  }
  if(!existsSync(searchCss)||!readFileSync(searchCss,'utf8').includes('.search-expert-direct-links{')){
   errors.push('전문가용 장비 별도 안내 모바일 CSS 누락');
  }



  // Geographic search filters should retain the clinical subject (e.g. 갈산역 잇몸치료 -> 잇몸치료).
  for (const area of ['갈산역','부평구청역','세월천사거리','청천푸르지오','부평캐슬앤더샵퍼스트','e편한세상부평그랑힐스','효성동','작전동','계산동']){
   if(!script.includes(area))errors.push('주변 지역 검색어 인식 누락: '+area);
  }
  for (const area of ['청천동 잇몸치료','산곡역 재신경치료','갈산동 잇몸치료']){
   if(!page.includes(area))errors.push('주변 지역 진료 검색 예시 누락: '+area);
  }

  // Exercise the actual locality and filler regexps from the shipped search script.
  // A neighborhood + "근처 치과" should resolve to a clinical subject rather than zero results.
  const localityRaw=script.match(/const localityPattern=(\/[^;\n]+\/);const locationPrefix=/)?.[1];
  const fillerRaw=script.match(/const clinicalQuery=locationPrefix\.replace\((\/[^;\n]+\/), ''\)/)?.[1];
  const literalRegexp=raw=>{
    const parts=raw?.match(/^\/(.*)\/([gimsuy]*)$/);
    if(!parts)throw new Error('검색 필터 정규표현식 인식 실패');
    return new RegExp(parts[1],parts[2]);
  };
  try{
    const locality=literalRegexp(localityRaw),filler=literalRegexp(fillerRaw);
    for(const [query,expected] of [
      ['산곡역 근처 치과 잇몸치료','잇몸치료'],
      ['인천 부평구 치과 재신경치료','재신경치료'],
      ['갈산동 주변 GI 보험','gi보험'],
      ['청천동 잇몸에서 피가 나요','잇몸에서피가나요'],
      ['부평구청역 잘하는곳 치경부마모증','치경부마모증'],
      ['세월천사거리 근처 치과 스케일링','스케일링'],
      ['인천 부평구에서 잇몸치료','잇몸치료'],
      ['산곡역에서 가까운 치과 재신경치료','재신경치료'],
      ['청천동에있는 치과 시린 이','시린이']
    ]){
      const normalized=query.toLocaleLowerCase('ko').replace(/\s+/g,'');
      const clinical=normalized.replace(locality,'').replace(filler,'');
      if(clinical!==expected)errors.push('인근 지역 진료 검색에서 핵심 치료명이 사라짐: '+query+' => '+clinical);
    }
    if(!script.includes('pattern.test(clinicalQuery)'))errors.push('인근 지역 증상 검색의 관련 글 우선 표시 누락');
  }catch(e){errors.push('인근 지역 검색어 자동 테스트 오류: '+e.message);}

  // Run clinic/parking intent cases through the shipped search logic and real generated index.
  for(const snippet of ['const localityOnlyIntent=', 'const visitIntent=', 'if(visitIntent){',
    'className=\u0027search-visit-answer\u0027','href="/visit-guide.html"']){
   if(!script.includes(snippet) && !page.includes(snippet))errors.push('방문 정보 검색 기능 누락: '+snippet);
  }
  if(!page.includes('class="search-visit-examples"')||!page.includes('산곡역 치과'))errors.push('모바일 검색 방문 안내 예시 누락');
  if(!existsSync(searchCss)||!readFileSync(searchCss,'utf8').includes('.search-visit-answer{')||
     !readFileSync(searchCss,'utf8').includes('.search-visit-actions>a:focus-visible')){
    errors.push('검색 방문 안내 카드 접근성·모바일 디자인 누락');
  }
  try{
   const coreStart=script.indexOf('const aliases=');
   const coreEnd=script.indexOf('const resultSummary=',coreStart);
   if(coreStart<0||coreEnd<=coreStart)throw new Error('검색 관련도 코드 위치 인식 불가');
   const evaluate=new Function('q','pages',script.slice(coreStart,coreEnd)+
    'return {localityOnlyIntent,visitIntent,visitOnlyIntent,displayCount:visitOnlyIntent?0:scored.length,top:visitOnlyIntent?undefined:scored[0]?.url};');
   const indexFile=join(root,'content','search-index.json');
   const index=JSON.parse(readFileSync(indexFile,'utf8'));
   if(!Array.isArray(index)||!index.length)throw new Error('검색 색인 비어 있음');
   for(const [q,expectedLocalOnly,expectedVisit,top] of [
    ['산곡역 치과',true,true,null],
    ['청천동 치과',true,true,null],
    ['갈산동 치과 위치',true,true,null],
    ['이조은치과 진료시간',false,true,null],
    ['주차',false,true,null],
    ['이조은치과',false,true,null],
    ['산곡역 근처 치과 재신경치료',false,false,'/retreatment.html'],
    ['갈산동 잇몸치료',false,false,'/gum-treatment.html']
   ]){
    const found=evaluate(q,index);
    if(found.localityOnlyIntent!==expectedLocalOnly||found.visitIntent!==expectedVisit||
      ((expectedLocalOnly||/^(?:이조은치과|이조은치과 진료시간|주차)$/.test(q))&&(found.displayCount!==0||!found.visitOnlyIntent))||(top&&found.top!==top)){
     errors.push('주소·진료시간·주차 검색 결과 오류: '+q+' '+JSON.stringify(found));
    }
   }
  }catch(e){errors.push('방문 검색 통합 테스트 실행 오류: '+e.message);}

  // Search relevance boosts must not masquerade as matches to every typed word.
  if (/matched\s*=\s*terms\.length/.test(script)) errors.push('검색 결과 관련도 계산에서 검색어 일치 수를 강제로 변경함');
  for (const target of ['/medical-history.html', '/dental-equipment.html', '/content/search-index.json']) {
    if (!script.includes(target)) errors.push('검색 안전정보 연결 누락: ' + target);
  }
}
// Published internal search cards must describe the *current* primary care pages,
// rather than an older title/snippet that was renamed in a recent SEO release.
{
 const indexFile=join(root,'content/search-index.json');
 if(!existsSync(indexFile))errors.push('홈페이지 통합 검색 색인 누락');
 else{
  let rows;
  try{rows=JSON.parse(readFileSync(indexFile,'utf8'))}
  catch{errors.push('홈페이지 통합 검색 색인 JSON 오류');rows=[]}
  if(!Array.isArray(rows)){errors.push('홈페이지 통합 검색 색인 배열 형식 오류');rows=[]}
  for(const slug of ['gum-treatment','retreatment','cervical-abrasion','insured-care']){
   const matches=rows.filter(row=>row?.url==='/'+slug+'.html');
   if(matches.length!==1){errors.push('주요 진료 검색 카드 누락·중복: '+slug);continue}
   const pageFile=join(root,slug+'.html');
   if(!existsSync(pageFile)){errors.push('주요 진료 안내 파일 누락: '+slug);continue}
   const page=readFileSync(pageFile,'utf8');
   const visibleTitle=page.match(/<title>([^<]+)<\/title>/i)?.[1];
   const visibleDescription=page.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1];
   if(!visibleTitle||!visibleDescription||
      matches[0].title!==visibleTitle||matches[0].description!==visibleDescription){
    errors.push('주요 진료 검색 제목·설명과 실제 페이지 불일치: '+slug);
   }
  }
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
// Prevent publishing a navigation link to a page that the production build omitted.
const visitGuideFile = join(root, 'visit-guide.html');
if (!existsSync(visitGuideFile)) errors.push('방문 전 확인사항 페이지가 배포 폴더에 없습니다');
else {
  const guide = readFileSync(visitGuideFile, 'utf8');
  for (const detail of ['격주', '3시간 무료', '12:30', '18:00', '임의로 중단하지 마세요', 'href="tel:0325132875"']) {
    if (!guide.includes(detail)) errors.push('방문 안내 필수정보 누락: ' + detail);
  }
  if (!guide.includes(('rel="canonical" href="' + publicOrigin + '/visit-guide' + (publicOrigin.endsWith('.pages.dev')?'.html':'') + '"'))) errors.push('방문 안내 canonical 주소 누락');
}
if (existsSync(homepageFile)) {
  const home = readFileSync(homepageFile, 'utf8');
  if (!home.includes('href="/visit-guide.html"')) errors.push('홈페이지에서 방문 전 안내 연결 누락');
}
const sitemapFile = join(root, 'sitemap.xml');
if (!existsSync(sitemapFile) || !readFileSync(sitemapFile, 'utf8').includes((publicOrigin + '/visit-guide' + (publicOrigin.endsWith('.pages.dev')?'.html':'')))) errors.push('방문 안내 사이트맵 누락');
// Keep new patient FAQs published, discoverable, and consistent with on-page answers.
for (const slug of ['gum-treatment-faq','root-canal-retreatment-faq','dental-insurance-faq','medication-dental-faq','systemic-disease-dental-faq']) {
  const route = '/' + slug + '.html';
  const target = join(root, slug + '.html');
  if (!existsSync(target)) { errors.push('FAQ 배포 누락: ' + route); continue; }
  const page = readFileSync(target, 'utf8');
  if (!page.includes('https://schema.org') || !page.includes('FAQPage')) errors.push('FAQ 구조화 데이터 누락: ' + route);
  if ((page.match(/<section class="card">/g) || []).length < 6) errors.push('FAQ 질문 수 부족: ' + route);
  if (!page.includes('href="tel:0325132875"')) errors.push('FAQ 전화 연결 누락: ' + route);
  if (!page.includes('일반적인 건강정보')) errors.push('FAQ 건강정보 안내 누락: ' + route);
  if (!existsSync(sitemapFile) || !readFileSync(sitemapFile,'utf8').includes(publicOrigin + '/' + slug + (publicOrigin.endsWith('.com')?'':'.html'))) errors.push('FAQ 사이트맵 누락: ' + route);
  if (!existsSync(homepageFile) || !readFileSync(homepageFile,'utf8').includes('href="' + route + '"')) errors.push('FAQ 홈페이지 링크 누락: ' + route);
}
// Cross-link integrity and FAQ structured-data consistency for patients and search crawlers.
for (const [source, destination] of [
  ['gum-treatment.html', 'gum-treatment-faq.html'],
  ['retreatment.html', 'root-canal-retreatment-faq.html'],
  ['insured-care.html', 'dental-insurance-faq.html'],
]) {
  const file = join(root, source);
  if (!existsSync(file) || !readFileSync(file,'utf8').includes('href="/' + destination + '"')) errors.push('진료 안내와 FAQ 연결 누락: ' + source);
}
for (const slug of ['gum-treatment-faq', 'root-canal-retreatment-faq', 'dental-insurance-faq', 'medication-dental-faq', 'systemic-disease-dental-faq']) {
  const file = join(root, slug + '.html');
  if (!existsSync(file)) continue;
  const page = readFileSync(file, 'utf8');
  const jsonMatch = page.split('<script type="application/ld+json">')[1]?.split('</script>')[0];
  if (!jsonMatch) { errors.push('FAQ JSON-LD 없음: ' + slug); continue; }
  try {
    const structured = JSON.parse(jsonMatch);
    if (structured.isPartOf?.['@id'] !== (publicOrigin + '/#website')) errors.push('FAQ 미리보기 구조화 데이터 호스트 불일치: ' + slug);
    const questions = structured.mainEntity;
    if (structured['@type'] !== 'FAQPage' || !Array.isArray(questions) || questions.length !== 6) errors.push('FAQ 질문 구조 불일치: ' + slug);
    else for (const question of questions) {
      if (question['@type'] !== 'Question' || !question.name || !question.acceptedAnswer?.text || !page.includes(question.name) || !page.includes(question.acceptedAnswer.text)) errors.push('FAQ 화면과 구조화 데이터 불일치: ' + slug);
    }
  } catch { errors.push('FAQ JSON-LD 파싱 실패: ' + slug); }
}
// Verify patients see the same care breadcrumb names used in search metadata.
// This makes the location trail navigable instead of JSON-LD-only.
{
 const carePages=[
  ['gum-treatment.html','잇몸치료'],
  ['retreatment.html','재신경치료'],
  ['cervical-abrasion.html','치경부마모증·GI 수복'],
  ['insured-care.html','건강보험 진료'],
  ['tmj-care.html','턱관절 진료'],
  ['wisdom-tooth.html','사랑니 발치'],
  ['implant.html','임플란트 진료'],
  ['pediatric-orthodontics.html','어린이 교정·성장기 치열 상담'],
  ['scaling.html','스케일링'],
  ['cavity-treatment.html','충치치료'],
  ['denture.html','청천동 틀니 진료 안내'],
  ['pediatric-dentistry.html','어린이 치과진료']
 ];
 const trailStyles=join(root,'assets/treatment-breadcrumbs.css');
 if(!existsSync(trailStyles)||!readFileSync(trailStyles,'utf8').includes('.treatment-breadcrumb-inner')){
  errors.push('치료별 모바일 이동 경로 스타일 파일 누락');
 }
 for(const [file,label] of carePages){
  const filepath=join(root,file);
  if(!existsSync(filepath)){errors.push('진료 이동 경로 대상 페이지 누락: '+file);continue}
  const page=readFileSync(filepath,'utf8');
  const trail=page.match(/<nav class="treatment-breadcrumb" aria-label="현재 위치">([\s\S]*?)<\/nav>/g)||[];
  if(trail.length!==1){errors.push('진료 이동 경로가 누락되거나 중복됨: '+file);continue}
  const visible=trail[0];
  if(!visible.includes('href="/">이조은치과 홈</a>')||
     !visible.includes('aria-current="page">'+label+'</span>')||
     !visible.includes('href="/#care"')||
     !page.includes('/assets/treatment-breadcrumbs.css?v=20261023-care-trail1')){
   errors.push('진료 이동 경로의 홈·현재 진료·다른 진료 연결 오류: '+file);
  }
  const mainTags=[...page.matchAll(/<main\b[^>]*>/gi)].map(m=>m[0]);
  const keyboardLinks=[...page.matchAll(/<a\b[^>]*class="(?:page-skip-link|treatment-skip-link)"[^>]*>/gi)].map(m=>m[0]);
  const mainId=mainTags[0]?.match(/\bid="([^"]+)"/)?.[1];
  if(mainTags.length!==1||!mainId||
    keyboardLinks.length!==1||!keyboardLinks[0].includes('href="#'+mainId+'"')){
   errors.push('진료 페이지 키보드 본문 건너뛰기/이동 대상 누락 또는 중복: '+file);
  }
  const mainPos=page.search(/<main\b/i),trailPos=page.indexOf(trail[0]),headingPos=page.search(/<h1\b/i);
  if(mainPos<0||trailPos<mainPos||headingPos<trailPos){
   errors.push('진료 이동 경로가 제목보다 먼저 보이지 않음: '+file);
  }
  let breadcrumbs=[];
  for(const match of page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
   try{const data=JSON.parse(match[1]);if(data['@type']==='BreadcrumbList')breadcrumbs.push(data)}
   catch{errors.push('진료 구조화 데이터 파싱 오류: '+file)}
  }
  if(breadcrumbs.length!==1||breadcrumbs[0]?.itemListElement?.length!==2||
     breadcrumbs[0]?.itemListElement?.[1]?.name!==label){
   errors.push('진료 이동 경로와 검색 구조화 데이터 이름 불일치: '+file);
  }
 }
 console.log('Treatment visible breadcrumbs audited:',carePages.length,'patient care guides');
}

// Verify FAQ/visit-guide internal HTML links and canonical URL consistency.
for (const slug of ['visit-guide','previsit-checklist','medical-safety-guide','gum-treatment-faq','root-canal-retreatment-faq','dental-insurance-faq','medication-dental-faq','systemic-disease-dental-faq']) {
  const file = join(root, slug + '.html');
  if (!existsSync(file)) continue;
  const page = readFileSync(file, 'utf8');
  const cleanPatientResource = publicOrigin.endsWith('.com');
  const expectedCanonical = publicOrigin + '/' + slug + (cleanPatientResource?'':'.html');
  if (!page.includes('rel="canonical" href="' + expectedCanonical + '"')) errors.push('정규 URL 불일치: ' + slug);
  const links = [...page.matchAll(/href="(\/[^"#?]+[.]html)"/g)].map(match => match[1]);
  for (const link of links) if (!paths.has(link)) errors.push('방문 안내/FAQ 내부 링크 누락: ' + slug + ' -> ' + link);
}
// Safety content must be visible and linked from the pre-visit questionnaire.
for (const slug of ['medication-dental-faq','systemic-disease-dental-faq']) {
 const file=join(root,slug+'.html');
 if (!existsSync(file)) continue;
 const page=readFileSync(file,'utf8');
 if (!page.includes('임의로 중단하지 마세요')) errors.push('약물 중단 경고 누락: '+slug);
 if (!existsSync(join(root,'medical-history.html')) || !readFileSync(join(root,'medical-history.html'),'utf8').includes('href="/'+slug+'.html"')) errors.push('문진 안내 FAQ 링크 누락: '+slug);
 if (!existsSync(join(root,'visit-guide.html')) || !readFileSync(join(root,'visit-guide.html'),'utf8').includes('href="/'+slug+'.html"')) errors.push('방문 안내 FAQ 링크 누락: '+slug);
}
// Medical safety topic pages must lead to their patient-facing FAQ.
for (const [source,faq] of [
 ['blood-thinners-dental.html','medication-dental-faq.html'],
 ['osteoporosis-medication-dental.html','medication-dental-faq.html'],
 ['diabetes-dental-care.html','systemic-disease-dental-faq.html'],
 ['heart-disease-dental-care.html','systemic-disease-dental-faq.html']
]) {
 const file=join(root,source);
 if (!existsSync(file) || !readFileSync(file,'utf8').includes('href="/'+faq+'"')) errors.push('전신질환 상세 페이지 FAQ 링크 누락: '+source);
}
// Keep the patient safety hub discoverable and all critical resources connected.
const safetyHub = join(root,'medical-safety-guide.html');
if (!existsSync(safetyHub)) errors.push('환자 안전정보 모음 페이지 배포 누락');
else {
 const hub=readFileSync(safetyHub,'utf8');
 for (const target of ['medication-dental-faq.html','systemic-disease-dental-faq.html','medical-history.html','visit-guide.html']) {
  if (!hub.includes('href="/'+target+'"')) errors.push('환자 안전정보 모음 링크 누락: '+target);
 }
 if (!hub.includes('임의로 중단하지 마세요')) errors.push('환자 안전정보 모음 복용약 경고 누락');
 if (!hub.includes((publicOrigin + '/medical-safety-guide' + (publicOrigin.endsWith('.pages.dev')?'.html':'')))) errors.push('환자 안전정보 모음 canonical 불일치');
}
if (!existsSync(sitemapFile) || !readFileSync(sitemapFile,'utf8').includes((publicOrigin + '/medical-safety-guide' + (publicOrigin.endsWith('.pages.dev')?'.html':'')))) errors.push('환자 안전정보 모음 사이트맵 누락');
for (const source of ['index.html','visit-guide.html','medical-history.html']) {
 const file=join(root,source);
 if (!existsSync(file) || !readFileSync(file,'utf8').includes('href="/medical-safety-guide.html"')) errors.push('환자 안전정보 모음 진입 링크 누락: '+source);
}
// Patient checklist should be present, searchable and linked.
const checklist=join(root,'previsit-checklist.html');
if (!existsSync(checklist)) errors.push('방문 체크리스트 배포 누락');
else {
 const content=readFileSync(checklist,'utf8');
 if ((content.match(/type="checkbox"/g)||[]).length<8) errors.push('방문 체크리스트 항목 누락');
 if (!content.includes('임의로 중단하지 마세요')) errors.push('방문 체크리스트 약물 안전 경고 누락');
 if (!content.includes((publicOrigin + '/previsit-checklist' + (publicOrigin.endsWith('.pages.dev')?'.html':'')))) errors.push('방문 체크리스트 canonical 불일치');
}
if (!existsSync(sitemapFile)||!readFileSync(sitemapFile,'utf8').includes((publicOrigin + '/previsit-checklist' + (publicOrigin.endsWith('.pages.dev')?'.html':'')))) errors.push('방문 체크리스트 사이트맵 누락');
for (const source of ['index.html','medical-safety-guide.html','visit-guide.html']) {
 const file=join(root,source);
 if (!existsSync(file)||!readFileSync(file,'utf8').includes('href="/previsit-checklist.html"')) errors.push('방문 체크리스트 연결 누락: '+source);
}
// Validate WebPage JSON-LD for the safety hub and printable checklist.
for (const slug of ['medical-safety-guide','previsit-checklist']) {
 const file=join(root,slug+'.html');
 if (!existsSync(file)) continue;
 const html=readFileSync(file,'utf8');
 const raw=html.split('<script type="application/ld+json">')[1]?.split('</script>')[0];
 if (!raw) { errors.push('건강정보 구조화 데이터 누락: '+slug); continue; }
 try {
  const data=JSON.parse(raw);
  const expectedOrigin = publicOrigin;
  if (data['@type']!=='WebPage' || data.url!==expectedOrigin+'/'+slug+(expectedOrigin.endsWith('.com')?'':'.html') || data.isPartOf?.['@id']!==expectedOrigin+'/#website') errors.push('건강정보 구조화 데이터 주소 불일치: '+slug);
 } catch { errors.push('건강정보 구조화 데이터 JSON 오류: '+slug); }
}
// 정적 404 오류페이지는 Cloudflare Pages의 잘못된 주소 200 반환(SPA fallback)을 막습니다.
const notFoundFile=join(root,'404.html');
if(!existsSync(notFoundFile))errors.push('404.html 배포 누락: 없는 페이지에 홈페이지가 표시될 수 있음');
else{
 const notFound=readFileSync(notFoundFile,'utf8');
 if(!/<meta\s+name="robots"\s+content="noindex,follow"/i.test(notFound))errors.push('404.html 검색 제외(noindex) 누락');
 if(!notFound.includes('href="/search.html"')&& !notFound.includes('action="/search.html"'))errors.push('404.html 건강정보 검색 연결 누락');
 if(!notFound.includes('href="/gum-treatment.html"')||!notFound.includes('href="/retreatment.html"'))errors.push('404.html 핵심 진료 이동 링크 누락');
}

const adminFile = join(root, 'admin/index.html');
if (existsSync(adminFile)) {
  const admin = readFileSync(adminFile, 'utf8');
  if (!admin.includes('name="robots" content="noindex')) errors.push('관리자 페이지 noindex 누락');
}

// Topic collections must show the same actual clinic navigation to patients
// that search engines find through the four child article categories.
{
 const collections=[
  ['gum-health.html','잇몸 건강정보','/gum-treatment.html'],
  ['root-canal-health.html','신경치료·재신경치료 건강정보','/retreatment.html'],
  ['insurance-health.html','건강보험 치과진료 정보','/insured-care.html'],
  ['additional-health.html','치과 건강정보 더 보기','/cervical-abrasion.html']
 ];
 for(const [file,label,related] of collections){
  const page=readFileSync(join(root,file),'utf8');
  const nav=page.match(/<nav class="hub-top-trail" aria-label="현재 건강정보와 관련 진료">([\s\S]*?)<\/nav>/g)||[];
  if(nav.length!==1||!nav[0].includes('href="/">이조은치과 홈</a>')||
     !nav[0].includes('aria-current="page">'+label+'</span>')||
     !nav[0].includes('href="'+related+'"')||
     page.includes('<div class="crumb">PATIENT EDUCATION</div>')){
   errors.push('건강정보 모음 현재 위치·관련 진료 연결 누락: '+file);
  }
 }
 const css=readFileSync(join(root,'assets/style.css'),'utf8');
 if(!css.includes('.article .hub-top-trail{'))errors.push('건강정보 모음 모바일 이동 경로 스타일 누락');
 console.log('Visible collection navigation checked:',collections.length);
}

// Every standalone patient-facing FAQ, medicine guide, fee page and archive
// needs a visible parent route, one truthful breadcrumb schema and a working
// keyboard shortcut to the main content. Never alter the medical advice text.
{
 const routes=[
  ['gum-treatment-faq','gum-treatment'],
  ['root-canal-retreatment-faq','retreatment'],
  ['dental-insurance-faq','insured-care'],
  ['medical-history',null],
  ['osteoporosis-medication-dental','medical-history'],
  ['blood-thinners-dental','medical-history'],
  ['diabetes-dental-care','medical-history'],
  ['heart-disease-dental-care','medical-history'],
  ['kidney-disease-dental-care','medical-history'],
  ['liver-disease-dental-care','medical-history'],
  ['cancer-immunosuppression-dental-care','medical-history'],
  ['pregnancy-dental-care','medical-history'],
  ['noncovered-fees',null],
  ['medication-dental-faq','medical-history'],
  ['systemic-disease-dental-faq','medical-history'],
  ['clinical-archive',null]
 ];
 const stylePath=join(root,'assets/patient-page-navigation.css');
 if(!existsSync(stylePath)||!readFileSync(stylePath,'utf8').includes('.patient-standalone-trail')){
  errors.push('환자 안내 현재 위치 이동경로 스타일 누락');
 }
 const preview=publicOrigin.endsWith('.pages.dev');
 for(const [slug,parent] of routes){
  const html=readFileSync(join(root,slug+'.html'),'utf8');
  const current=publicOrigin+'/'+slug+(preview?'.html':'');
  const main=html.match(/<main\b[^>]*>/i)?.[0];
  const mainId=main?.match(/\bid="([^"]+)"/)?.[1];
  const trails=[...html.matchAll(/<nav class="patient-standalone-trail" aria-label="현재 위치">([\s\S]*?)<\/nav>/g)];
  if(!mainId||trails.length!==1||!html.includes('href="#'+mainId+'"')){
   errors.push('환자 안내 본문 바로가기 또는 이동경로 누락: '+slug);continue
  }
  const trail=trails[0][1];
  const canonical=html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
  if(canonical!==current||!trail.includes('href="/"')||!trail.includes('aria-current="page"')){
   errors.push('환자 안내 현재 위치 URL 또는 접근성 누락: '+slug);
  }
  const breadcrumbNodes=[];
  for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
   try{const data=JSON.parse(match[1]);if(data['@type']==='BreadcrumbList')breadcrumbNodes.push(data)}
   catch{errors.push('환자 안내 구조화 데이터 오류: '+slug)}
  }
  const items=breadcrumbNodes[0]?.itemListElement||[];
  if(breadcrumbNodes.length!==1||items.length!==(parent?3:2)||
     items[0]?.item!==publicOrigin+'/'||items[items.length-1]?.item!==canonical){
   errors.push('환자 안내 BreadcrumbList 구조화 데이터 경로 불일치: '+slug);
  }
  if(parent){
   const parentUrl=publicOrigin+'/'+parent+(preview?'.html':'');
   const parentHref='/'+parent+(preview?'.html':'');
   if(items[1]?.item!==parentUrl||!trail.includes('href="'+parentHref+'"')){
    errors.push('환자 안내 관련 진료/약물 정보 바로가기 누락: '+slug);
   }
  }
  if(!html.includes('/assets/patient-page-navigation.css?v=20261023-1')){
   errors.push('환자 안내 이동경로 반응형 스타일 로딩 누락: '+slug);
  }
 }
 console.log('Patient standalone visible breadcrumb audit:',routes.length,'public guides');
}

// Last 16 standalone care and safety page sitemap checks: no canonical,
// social URL or public WebPage schema should point to a redirect on production.
{
 const audited=["gum-treatment-faq","root-canal-retreatment-faq","dental-insurance-faq","medical-history","osteoporosis-medication-dental","blood-thinners-dental","diabetes-dental-care","heart-disease-dental-care","kidney-disease-dental-care","liver-disease-dental-care","cancer-immunosuppression-dental-care","pregnancy-dental-care","noncovered-fees","medication-dental-faq","systemic-disease-dental-faq","clinical-archive"];
 const xml=readFileSync(join(root,'sitemap.xml'),'utf8');
 for(const slug of audited){
  const url=publicOrigin+'/'+slug+(publicOrigin.endsWith('.com')?'':'.html');
  const file=readFileSync(join(root,slug+'.html'),'utf8');
  const canonical=file.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
  if(canonical!==url||!xml.includes('<loc>'+url+'</loc>'))
   errors.push('환자 진료·안전 안내 최종 URL 불일치: '+slug+' -> '+canonical);
  const share=file.match(/<meta\s+property="og:url"\s+content="([^"]+)"/)?.[1];
  if(share&&share!==url)errors.push('환자 진료·안전 안내 공유 URL 불일치: '+slug);
  for(const match of file.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
   let object;
   try{object=JSON.parse(match[1])}catch{errors.push('환자 안내 JSON-LD 파싱 실패: '+slug);continue}
   if(object.url?.startsWith(publicOrigin+'/')&&object.url!==url)
    errors.push('환자 안내 JSON-LD 문서 URL 불일치: '+slug);
  }
 }
 console.log('Last 16 standalone care and safety page sitemap checks passed:',audited.length);
}

// Seven health collection and patient-visit pages must publish their true final
// URLs on the production domain, while retaining .html in the preview build.
for(const slug of [
 'gum-health','root-canal-health','insurance-health','additional-health',
 'visit-guide','medical-safety-guide','previsit-checklist'
]){
 const expected=publicOrigin+'/'+slug+(publicOrigin.endsWith('.pages.dev')?'.html':'');
 const page=readFileSync(join(root,slug+'.html'),'utf8');
 const canonical=page.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
 const sitemapXml=existsSync(sitemap)?readFileSync(sitemap,'utf8'):'';
 if(canonical!==expected||!sitemapXml.includes('<loc>'+expected+'</loc>')){
  errors.push('건강정보·방문 준비 최종 URL/사이트맵 불일치: '+slug+' -> '+canonical);
 }
 const og=page.match(/<meta\s+property="og:url"\s+content="([^"]+)"/i)?.[1];
 if(og&&og!==expected)errors.push('건강정보·방문 준비 공유 URL 불일치: '+slug+' -> '+og);
}

// Published care canonical and sitemap URLs must resolve without an extra HTML redirect.
for (const slug of ['gum-treatment','retreatment','cervical-abrasion','insured-care','tmj-care','wisdom-tooth','implant','pediatric-orthodontics','scaling','cavity-treatment','denture','pediatric-dentistry']) {
 const expected=publicOrigin+'/'+slug+(publicOrigin.endsWith('.com')?'':'.html');
 const page=readFileSync(join(root,slug+'.html'),'utf8');
 const canonical=page.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
 if(canonical!==expected)errors.push('핵심 진료 최종 canonical 불일치: '+slug+' -> '+canonical);
 const xml=existsSync(sitemap)?readFileSync(sitemap,'utf8'):'';
 if(!xml.includes('<loc>'+expected+'</loc>'))errors.push('핵심 진료 최종 사이트맵 경로 누락: '+slug);
}

// Guard consistent patient-facing search titles and navigation on the four primary guides.
for (const name of ['gum-treatment.html','retreatment.html','cervical-abrasion.html','insured-care.html']) {
 const file=join(root,name);
 if (!existsSync(file)) { errors.push('주요 진료 페이지 누락: '+name); continue; }
 const page=readFileSync(file,'utf8');
 const title=page.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
 const ogTitle=page.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1]?.trim();
 const block=page.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1];
 let schemaTitle;
 try { schemaTitle=JSON.parse(block||'{}').name; } catch { errors.push('구조화 데이터 JSON 오류: '+name); }
 if (!title || title!==ogTitle || title!==schemaTitle) errors.push('검색 제목·공유 제목·구조화 데이터 불일치: '+name);
 const current=page.match(/<nav class="treatment-quick-links"[^>]*>([\s\S]*?)<\/nav>/i)?.[1];
 if (!current || !current.includes('href="/'+name+'" aria-current="page"') ||
     (current.match(/aria-current="page"/g)||[]).length!==1) errors.push('모바일 진료 메뉴 현재 위치 오류: '+name);
 if (!page.includes('class="treatment-scroll-hint"') ||
     !page.includes('/assets/care-design-system.css')) errors.push('모바일 진료 이동 안내 누락: '+name);
}


// The 10 CMS-editable retreatment illustrations should not require a per-visit
// JSON request, and a CMS replacement should be visible in the initial HTML.
{
 const html=readFileSync(join(root,'retreatment.html'),'utf8');
 const config=JSON.parse(readFileSync(resolve('assets','retreatment-images.json'),'utf8'));
 const keys=['hero','reason1','reason2','reason3','reason4','step1','step2','step3','step4','closing'];
 const images=[...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)];
 if(images.length!==keys.length)errors.push('재신경치료 일러스트 10개 구조 누락');
 if(html.includes('retreatment-image-manager.js')||html.includes('retreatment-images.json')){
  errors.push('재신경치료 이미지의 불필요한 방문 시점 요청이 재추가됨');
 }
 keys.forEach((key,i)=>{
  const override=config[key];
  const expected=override||('/assets/retreatment/illustration-'+String(i+1).padStart(2,'0')+'.webp');
  if(images[i]?.[1]!==expected)errors.push('재신경치료 이미지 빌드·CMS 설정 불일치: '+key);
 });
}
// Keep treatment FAQs concise and reachable by touch, keyboard and deep links.
for(const slug of ['gum-treatment','retreatment','cervical-abrasion','insured-care']){
 const htmlFile=join(root,slug+'.html'),cssFile=join(root,'assets',slug+'.css');
 if(!existsSync(htmlFile)||!existsSync(cssFile)){errors.push('진료 FAQ 파일 누락: '+slug);continue;}
 const page=readFileSync(htmlFile,'utf8');
 const css=readFileSync(cssFile,'utf8');
 const faq=page.match(/<section\b[^>]*\bid="patient-questions"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
 if((page.match(/\bid="patient-questions"/g)||[]).length!==1)errors.push('진료 FAQ 앵커 중복 또는 누락: '+slug);
 if((faq.match(/<details\b/g)||[]).length<4 || (faq.match(/<summary\b/g)||[]).length<4)errors.push('진료 FAQ 모바일 접이식 질문 부족: '+slug);
 if(!css.includes('#patient-questions summary:focus-visible')||!css.includes('min-height:52px'))errors.push('진료 FAQ 모바일 터치·키보드 스타일 누락: '+slug);
 if(!page.includes('/assets/'+slug+'.css?v=20261023-faq-mobile2'))errors.push('진료 FAQ 스타일 버전 갱신 누락: '+slug);
}
// Patient topic shortcuts must point to real content and remain usable without scripts.
{
 const tocTargets={
  'gum-treatment':['gum-scaling-difference','gum-aftercare','patient-questions'],
  'retreatment':['retreatment-procedure','retreatment-outcomes-heading','patient-questions'],
  'cervical-abrasion':['cervical-care-decisions','cervical-gi-restoration','patient-questions'],
  'insured-care':['insured-coverage-criteria','insurance-first-visit','patient-questions']
 };
 const sharedCssFile=join(root,'assets','care-design-system.css');
 if(!existsSync(sharedCssFile))errors.push('공통 모바일 진료 디자인 파일 누락');
 else{
  const css=readFileSync(sharedCssFile,'utf8');
  for(const term of ['.treatment-page-toc','.treatment-back-top','.treatment-page-toc a:focus-visible','@media(max-width:340px)']){
   if(!css.includes(term))errors.push('모바일 진료 목차 스타일 누락: '+term);
  }
 }
 for(const [slug,anchors] of Object.entries(tocTargets)){
  const page=readFileSync(join(root,slug+'.html'),'utf8');
  const toc=page.match(/<nav class="treatment-page-toc"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
  if(!toc.includes('이 페이지에서 바로 찾기'))errors.push('모바일 진료 목차 누락: '+slug);
  if((toc.match(/<a\b/g)||[]).length!==4)errors.push('모바일 진료 목차 링크 개수 오류: '+slug);
  if(!toc.includes('href="/visit-guide.html"'))errors.push('모바일 진료 목차 길찾기 누락: '+slug);
  for(const target of anchors){
   if(!toc.includes('href="#'+target+'"') || !page.includes('id="'+target+'"')){
    errors.push('모바일 진료 목차 연결 오류: '+slug+' #'+target);
   }
  }
  if(!page.includes('href="#main-content"')||!page.includes('class="treatment-back-top"'))errors.push('진료 페이지 맨 위 이동 링크 누락: '+slug);
  if(!page.includes('/assets/care-design-system.css?v=20261023-topic-nav1'))errors.push('모바일 진료 목차 디자인 캐시 갱신 누락: '+slug);
 }
}
// Photo-supplied certificate fees must be visible in initial HTML without JavaScript.
// Do not publish a non-standard confirmation letter at 20,000 won before confirming
// its legal distinction from the capped ordinary treatment confirmation form.
{
 const feeIndex=JSON.parse(readFileSync(join(root,'content','fees-index.json'),'utf8'));
 const feeHtml=readFileSync(join(root,'noncovered-fees.html'),'utf8');
 const expected=[
  ['보험사 양식 치료확인서','3,000원'],
  ['병원 발급 진단서','20,000원'],
  ['차트 복사(진료기록 사본 1~5매)','1,000원'],
  ['파노라마 인쇄본','1,000원']
 ];
 if(!Array.isArray(feeIndex.items))errors.push('비급여 수가표 데이터 형식 오류');
 else{
  for(const [name,price] of expected){
   const rows=feeIndex.items.filter(row=>row.category==='제증명수수료'&&row.item===name);
   if(rows.length!==1||rows[0]?.price!==price)errors.push('제증명수수료 금액·게시 누락: '+name);
   if(!feeHtml.includes(name)||!feeHtml.includes(price))errors.push('제증명수수료가 초기 HTML에 없음: '+name);
  }
  if(feeIndex.items.some(row=>row.item==='병원 발급 치료확인서')){
   errors.push('일반 진료확인서와 구별되지 않은 20,000원 서류가 공개됨');
  }
 }
 if(!feeHtml.includes('id="fees-certificates"')||
    !feeHtml.includes('id="fees-treatments"')||
    feeHtml.includes('class="fees-quick-nav"')||
    !feeHtml.includes('@media print{')||
    feeHtml.includes('BUILD_FEE_TABLES')||
    feeHtml.includes('src="/assets/fees.js"')||
    !feeHtml.includes('6매부터는')){
  errors.push('수가표에서 항목 누락, 눈에 띄는 단축 버튼, 인쇄 또는 초기 HTML 오류');
 }
 const firstGroup=feeHtml.indexOf('<section class="fees-category"');
 const lastGroup=feeHtml.lastIndexOf('<section class="fees-category"');
 const certificateGroup=feeHtml.indexOf('<section class="fees-category" aria-label="제증명수수료 비용 안내">');
 if(firstGroup<0||lastGroup<=firstGroup||certificateGroup!==lastGroup){
  errors.push('제증명 수수료는 비급여 진료비용 아래쪽에 안내해야 함');
 }
}
// Every public safety, visit, FAQ and fee page should state the same facts in
// the HTML snippet, link-share cards and medical WebPage structured data.
// SEO labels must not silently diverge from the medically reviewed page.
{
 const slugs=['visit-guide','clinical-archive','medical-history',
  'gum-treatment-faq','root-canal-retreatment-faq','dental-insurance-faq',
  'medication-dental-faq','systemic-disease-dental-faq','medical-safety-guide',
  'previsit-checklist','osteoporosis-medication-dental','blood-thinners-dental',
  'diabetes-dental-care','heart-disease-dental-care','kidney-disease-dental-care',
  'liver-disease-dental-care','cancer-immunosuppression-dental-care',
  'pregnancy-dental-care','noncovered-fees'];
 for(const slug of slugs){
  const page=readFileSync(join(root,slug+'.html'),'utf8');
  const attr=(name,property=false)=>{
   const key=property?'property':'name';
   return page.match(new RegExp('<meta '+key+'="'+name+'" content="([^"]+)"'))?.[1]||'';
  };
  const title=page.match(/<title>([^<]+)<\/title>/)?.[1]||'';
  const desc=attr('description');
  const social=attr('og:description',true);
  const twitter=attr('twitter:description');
  const ogTitle=attr('og:title',true);
  const twTitle=attr('twitter:title');
  const canonical=page.match(/<link rel="canonical" href="([^"]+)"/)?.[1]||'';
  const ogUrl=attr('og:url',true);
  if(!desc || desc!==social || desc!==twitter || title!==ogTitle ||
     title!==twTitle || canonical!==ogUrl || attr('twitter:card')!=='summary'){
   errors.push('의료정보 공유·검색 설명 불일치: '+slug);
  }
  const ld=[...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
   .map(m=>JSON.parse(m[1]));
  const webPage=ld.find(o=>['MedicalWebPage','WebPage','CollectionPage'].includes(o['@type']));
  if(webPage && webPage.description!==desc){
   errors.push('의료정보 구조화 데이터 설명 불일치: '+slug);
  }
  if(slug==='noncovered-fees' && (!desc.includes('수가표에 없는 비용') ||
      !desc.includes('032-513-2875'))){
   errors.push('비급여 미공개 수가 문의 안내 검색 정보 누락');
  }
 }
}
// Verify clinic publisher attribution without inventing a personal medical reviewer.
{
 const slugs=["clinical-archive","medical-history","gum-treatment-faq","root-canal-retreatment-faq","dental-insurance-faq","medication-dental-faq","systemic-disease-dental-faq","medical-safety-guide","previsit-checklist","osteoporosis-medication-dental","blood-thinners-dental","diabetes-dental-care","heart-disease-dental-care","kidney-disease-dental-care","liver-disease-dental-care","cancer-immunosuppression-dental-care","pregnancy-dental-care"];
 for(const slug of slugs){
  const html=readFileSync(join(root,slug+'.html'),'utf8');
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
   .map(m=>JSON.parse(m[1])).filter(o=>['MedicalWebPage','WebPage','FAQPage','CollectionPage'].includes(o['@type']));
  // Preview HTML correctly rewrites JSON-LD clinic IDs to pages.dev.
  const publisherId=schemas[0]?.publisher?.['@id'];
  const validPublisher=['https://ejoeundental.com/#clinic','https://ejoeundental.pages.dev/#clinic'].includes(publisherId);
  if(schemas.length!==1||!validPublisher||
     !schemas[0].isPartOf||schemas[0].inLanguage!=='ko-KR'){
   errors.push('치과 의료정보 게시기관·언어 연결 누락: '+slug);
  }
 }
 const notFound=readFileSync(join(root,'404.html'),'utf8');
 if(!notFound.includes('name="robots" content="noindex,follow"')||
    /rel="canonical"/.test(notFound)){
  errors.push('404페이지는 noindex로 유지하고 canonical을 지정하지 않아야 함');
 }
}
// Prioritize genuine Incheon and Bupyeong periodontal-care queries in a
// single treatment landing page, supported by the clinic's REAL Cheongcheon
// address and ten existing health articles (no duplicate keyword-only pages).
{
 const periodontal=readFileSync(join(root,'gum-treatment.html'),'utf8');
 const hub=readFileSync(join(root,'gum-health.html'),'utf8');
 const homepage=readFileSync(join(root,'index.html'),'utf8');
 const title=periodontal.match(/<title>([^<]+)<\/title>/)?.[1]||'';
 const desc=periodontal.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
 const pageSchemas=[...periodontal.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 const medical=pageSchemas.find(x=>x['@type']==='MedicalWebPage');
 for(const term of ['인천 잇몸치료','부평 잇몸치료']){
  if(!title.includes(term)||!desc.includes(term))errors.push('지역 잇몸치료 검색어 누락: '+term);
 }
 if(!periodontal.includes('id="gum-main-title">인천·부평 잇몸치료,')||
    !periodontal.includes('인천 잇몸치료·부평 잇몸치료 안내 — 청천동·산곡역 인근')||
    !periodontal.includes('세월천로 34')){
  errors.push('인천·부평 잇몸치료의 진료 내용·실제 청천동 주소 일치 실패');
 }
 if(!medical||medical.name!==title||medical.description!==desc||
    !periodontal.includes('property="og:title" content="'+title+'"')||
    !periodontal.includes('property="og:description" content="'+desc+'"')){
  errors.push('잇몸치료 검색 설명·공유 정보·의료구조화데이터 불일치');
 }
 const hubTitle=hub.match(/<title>([^<]+)<\/title>/)?.[1]||'';
 const hubDesc=hub.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
 const hubSchemas=[...hub.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 const collection=hubSchemas.find(x=>x['@type']==='CollectionPage');
 if(!collection||collection.name!==hubTitle||collection.description!==hubDesc||
    collection.mainEntity?.numberOfItems!==10||collection.mainEntity?.itemListElement?.length!==10||
    !hub.includes('href="/gum-treatment.html"')||
    !hubDesc.includes('인천 잇몸치료')||!hubDesc.includes('부평 잇몸치료')){
  errors.push('지역 잇몸 건강정보 10편·진료 연결·메타데이터 일치 실패');
 }
 const hero=homepage.match(/<nav class="hero-care-summary"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 const focus=homepage.match(/<section class="section light" id="focus-care">([\s\S]*?)<\/section>/)?.[1]||'';
 if(!hero.includes('href="/gum-treatment.html">인천·부평 잇몸치료')||
    !focus.includes('인천 잇몸치료·부평 잇몸치료')||
    !focus.includes('href="/gum-treatment.html"')){
  errors.push('홈페이지 핵심 잇몸치료 검색어 및 실제 진료 링크 누락');
 }
}
// Public health information should disclose general-information limits and link to the actual dentist.
{
 const hubs=['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'];
 const shared=readFileSync(join(root,'assets/style.css'),'utf8');
 if(!shared.includes('.article .hub-editorial-note')||!shared.includes('.hub-editorial-note a:focus-visible')){
  errors.push('건강정보 글모음 작성 책임·접근성 스타일 누락');
 }
 for(const name of hubs){
  const page=readFileSync(join(root,name),'utf8');
  if((page.match(/class="hub-editorial-note"/g)||[]).length!==1)errors.push(name+': 진료정보 이용 안내 개수 오류');
  if(!page.includes('이 페이지는 일반적인 건강정보')||!page.includes('href="/#doctor"'))errors.push(name+': 일반 건강정보 한계 또는 원장 소개 연결 누락');
  const schemas=[...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  const collection=schemas.find(schema=>schema['@type']==='CollectionPage');
  if(!collection || collection.mainEntity?.numberOfItems!==(name==='additional-health.html'?16:10))errors.push(name+': 건강정보 글모음 구조화 데이터 누락');
  const meta=page.match(/<meta name="description" content="([^"]+)"/)?.[1];
  const og=page.match(/<meta property="og:description" content="([^"]+)"/)?.[1];
  if(!meta||meta!==og||collection?.description!==meta)errors.push(name+': 건강정보 검색 설명·공유 미리보기·구조화 데이터 불일치');
 }
}
// The three evergreen symptom guides must remain visible without scripts;
// CMS journal cards are generated in HTML, never swapped in after paint.
{
 const homepage=readFileSync(join(root,'index.html'),'utf8');
 const guides=homepage.match(/<div class="grid" id="post-list"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';
 const guidePaths=['/health/gum-bleeding.html','/health/root-canal-after-pain.html','/health/abrasion-sensitive.html'];
 if((guides.match(/<article class="card"/g)||[]).length!==3||
    guidePaths.some(path=>!guides.includes('href="'+path+'"'))){
  errors.push('홈페이지 주요 증상 3편이 초기 HTML에서 누락됨');
 }
 const postList=JSON.parse(readFileSync(join(root,'content','posts-index.json'),'utf8'));
 const cardContent=homepage.match(/<div id="published-story-items" class="grid"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';
 const homeCards=[...cardContent.matchAll(/<a class="card post-card" href="([^"]+)"/g)].map(m=>m[1]);
 const expected=postList.slice(0,6).map(post=>'/stories/'+encodeURIComponent(post.slug)+'/');
 if(homeCards.length!==expected.length||expected.some((url,i)=>homeCards[i]!==url)){
  errors.push('원장의 홈페이지 글 서버 렌더링 개수·순서 불일치');
 }
 if(homepage.includes('BUILD_PUBLIC_STORIES')||
    !homepage.includes('class="clinic-native-stories"')){
  errors.push('원장의 홈페이지 글 접기/펼치기 영역 생성 실패');
 }
 const browserScript=readFileSync(join(root,'assets','site.js'),'utf8');
 if(browserScript.includes('posts-index.json')||browserScript.includes('post-list')||
    browserScript.includes('replaceChildren(fragment)')){
  errors.push('홈페이지 초기 건강정보 링크가 JavaScript로 교체됨');
 }
 const journalCss=readFileSync(join(root,'assets','home-enhancements.css'),'utf8');
 if(!journalCss.includes('#stories .clinic-native-stories>summary:focus-visible')||
    !journalCss.includes('.clinic-native-stories .post-card')){
  errors.push('홈페이지 치과 이야기 모바일·키보드 스타일 누락');
 }
}
// Keep legal fee prices findable via a single unobtrusive lower-footer link,
// without presenting certificates as a prominent clinic treatment option.
{
 const homepage=readFileSync(join(root,'index.html'),'utf8');
 const links=[...homepage.matchAll(/href="\/noncovered-fees\.html"/g)];
 const footer=homepage.match(/<section class="footer-business" aria-label="이조은치과 의료기관 정보">([\s\S]*?)<\/section>/)?.[1]||'';
 const footCss=readFileSync(join(root,'assets','home-enhancements.css'),'utf8');
 if(links.length!==1||
    !footer.includes('class="footer-fee-disclosure"')||
    !footer.includes('href="/noncovered-fees.html"')||
    !footer.includes('footer-copyright')){
  errors.push('수가 안내는 홈페이지 마지막 의료기관 정보의 작은 링크 한 곳에만 배치');
 }
 if(homepage.includes('비급여 진료비용 · 제증명수수료 안내 →')||
    !footCss.includes('.footer-fee-disclosure:focus-visible')){
  errors.push('비급여 안내가 강조되거나 작은 링크의 키보드 접근성이 손상됨');
 }
}
// Verified institution information belongs at the very end of the public homepage.
// Never accidentally copy another dental office's registration or publish placeholders.
{
 const homepage=readFileSync(join(root,'index.html'),'utf8');
 const config=JSON.parse(readFileSync(join(root,'content','site.json'),'utf8'));
 const box=homepage.match(/<section class="footer-business" aria-label="이조은치과 의료기관 정보">([\s\S]*?)<\/section>/)?.[1]||'';
 const expected=['이조은치과의원','대우프라자 305호','세월천로 34',
  'tel:0325132875','3시간 무료','격주 진료','footer-copyright'];
 if(!box||expected.some(k=>!box.includes(k)))errors.push('홈페이지 하단 의료기관 신원·주소·전화·주차 안내 누락');
 if(homepage.includes('VERIFIED_CLINIC_OPERATOR_DETAILS'))errors.push('치과 사업자 정보 미입력 표시가 공개됨');
 const representative=String(config.footer_representative||'').trim();
 const registration=String(config.footer_business_registration||'').trim();
 if(representative && !box.includes('<dt>대표자</dt>'))errors.push('확인된 치과 대표자명 표기 누락');
 if(!representative && box.includes('<dt>대표자</dt>'))errors.push('미확인 대표자명이 홈페이지에 노출됨');
 if(registration && (!box.includes('<dt>사업자등록번호</dt>')||
    !box.includes(registration)))errors.push('확인된 사업자등록번호 표기 누락');
 if(!registration && box.includes('<dt>사업자등록번호</dt>'))errors.push('미확인 사업자등록번호가 공개됨');
 const footerStyle=readFileSync(join(root,'assets','home-enhancements.css'),'utf8');
 if(!footerStyle.includes('.footer .footer-business{')||
    !footerStyle.includes('.footer .footer-business-facts a:focus-visible')||
    !footerStyle.includes('@media(max-width:640px)'))errors.push('의료기관 정보 하단 모바일·키보드 스타일 누락');
}
// Clinic landing snippets should agree across standard search and link-preview metadata.
{
 const homepage=readFileSync(join(root,'index.html'),'utf8');
 const standard=homepage.match(/<meta name="description" content="([^"]+)"/)?.[1];
 const social=homepage.match(/<meta property="og:description" content="([^"]+)"/)?.[1];
 const twitter=homepage.match(/<meta name="twitter:description" content="([^"]+)"/)?.[1];
 if(!standard||standard!==social||standard!==twitter)errors.push('홈페이지 메타·공유 미리보기 설명이 서로 다름');
 if(!standard?.includes('청천동 세월천로 34') || !standard?.includes('산곡역'))errors.push('홈페이지 지역·실제 주소 검색 설명 누락');
 if(homepage.includes('#stories .owner-story-card p{display:none}'))errors.push('원장 이야기 카드에 숨김 텍스트 스타일이 남아 있음');
 if(/원장이 작성한 네이버 블로그 글입니다/.test(homepage))errors.push('원장 이야기 카드의 반복 문구가 다시 추가됨');
}
// 홈페이지 원장 이야기 목록 보호: 모바일에서 8편만 보이고, 22편은 펼치면 읽을 수 있어야 합니다.
{
 const homepage=readFileSync(join(root,'index.html'),'utf8');
 const section=homepage.match(/<section\b[^>]*id="stories"[\s\S]*?<\/section>/i)?.[0]||'';
 const first=section.match(/<div class="owner-stories-grid" aria-label="원장의 치과 이야기 최신 8편">([\s\S]*?)<\/div>\s*<details class="owner-stories-more">/i)?.[1]||'';
 const extra=section.match(/<details class="owner-stories-more">([\s\S]*?)<\/details>/i)?.[1]||'';
 const firstLinks=[...first.matchAll(/<a\b[^>]*href="(https:\/\/blog\.naver\.com\/[^"]+)"[^>]*>/gi)].map(m=>m[1]);
 const extraLinks=[...extra.matchAll(/<a\b[^>]*href="(https:\/\/blog\.naver\.com\/[^"]+)"[^>]*>/gi)].map(m=>m[1]);
 if(firstLinks.length!==8||extraLinks.length!==22||new Set([...firstLinks,...extraLinks]).size!==30)errors.push('원장 이야기 8+22편 링크 또는 중복 오류');
 if(!extra.includes('<summary>치과 이야기 나머지 22편 보기')||!extra.includes('class="owner-stories-grid"'))errors.push('모바일 원장 이야기 펼치기 기능 누락');
 if(!homepage.includes('"numberOfItems": 30'))errors.push('원장 이야기 검색 구조화 데이터 30편 불일치');
}

if (!existsSync(join(root, 'robots.txt'))) warnings.push('robots.txt 누락');
console.log('HTML:', html.length, '| 오류:', errors.length, '| 경고:', warnings.length);
for (const e of errors) console.error('ERROR', e);
for (const w of [...new Set(warnings)].slice(0, 100)) console.warn('WARN', w);
if (warnings.length > 100) console.warn('추가 경고:', warnings.length - 100);
if (errors.length) process.exitCode = 1;

// Periodontal patient symptom guide: keep medically cautious content accessible,
// linkable from the treatment hero, and discoverable in static HTML without JS.
{
 const faq=readFileSync(join(root,'gum-treatment-faq.html'),'utf8');
 const treatment=readFileSync(join(root,'gum-treatment.html'),'utf8');
 const css=readFileSync(join(root,'assets/gum-treatment.css'),'utf8');
 const requiredPaths=['/health/gum-bleeding.html','/health/gum-pus.html','/health/loose-tooth.html','/medical-history.html','/visit-guide.html'];
 if(!faq.includes('id="gum-symptom-guide"') ||
    !faq.includes('aria-labelledby="gum-symptom-heading"') ||
    !requiredPaths.every(url=>faq.includes('href="'+url+'"')) ||
    !faq.includes('처방약은 임의로 중단하지 마세요') ||
    !faq.includes('즉시 119') ||
    !treatment.includes('href="/gum-treatment-faq.html#gum-symptom-guide"') ||
    !css.includes('.gum-hero-related a:focus-visible')){
   errors.push('잇몸치료 FAQ 증상별 안내·응급 경고·방문 전 확인·접근성 연결 누락');
 }
 const h1=faq.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1];
 const title=faq.match(/<title>([^<]+)<\/title>/)?.[1]||'';
 const description=faq.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
 if(!h1?.includes('잇몸치료') || !title.includes('부평 잇몸치료') ||
   !description.includes('인천 잇몸치료') || !description.includes('부평 잇몸치료')){
   errors.push('잇몸치료 FAQ 지역·치료 주제 정보 누락');
 }
}

// Ensure the periodontal topic cluster has meaningful two-way patient navigation.
// Keep symptom answers and treatments on separate pages; do not keyword-stuff or
// create misleading local business locations for neighboring districts.
{
 const home=readFileSync(join(root,'index.html'),'utf8');
 const hub=readFileSync(join(root,'gum-health.html'),'utf8');
 const faq=readFileSync(join(root,'gum-treatment-faq.html'),'utf8');
 const treatment=readFileSync(join(root,'gum-treatment.html'),'utf8');
 if(!home.includes('href="/gum-treatment-faq.html#gum-symptom-guide"') ||
    !hub.includes('class="gum-learning-nav"') ||
    !hub.includes('href="/gum-treatment-faq.html#gum-symptom-guide"') ||
    !hub.includes('href="/health/periodontal-insurance.html"') ||
    !hub.includes('href="/visit-guide.html"') ||
    !hub.includes('.gum-learning-nav a:focus-visible') ||
    !faq.includes('href="/gum-health.html"') ||
    !treatment.includes('href="/gum-treatment-faq.html#gum-symptom-guide"')){
   errors.push('잇몸치료 홈페이지→FAQ→건강정보 허브 양방향 이동 경로 누락');
 }
 if(!faq.includes('id="gum-symptom-guide"')){
   errors.push('연결 대상 잇몸 증상별 안내 앵커가 없음');
 }
 if(!hub.includes('이 페이지는 일반적인 건강정보')){
   errors.push('잇몸 건강정보 허브 진료정보 한계 안내 누락');
 }
}

// A consistent local SVG tab icon improves site recognizability on phones,
// bookmarks and desktop tabs without a third-party image request.
{
 const icon='/favicon.svg';
 const file=join(root,'favicon.svg');
 if(!paths.has(icon)||!existsSync(file)){
  errors.push('이조은치과 파비콘 파일 배포 누락');
 }else{
  const svg=readFileSync(file,'utf8');
  if(!svg.includes('viewBox="0 0 64 64"') ||
     !svg.includes('<title id="icon-title">이조은치과</title>') ||
     !svg.includes('#173e35')){
   errors.push('브랜드 파비콘 SVG 구조 및 의료기관명 확인 필요');
  }
 }
 const link='<link rel="icon" type="image/svg+xml" href="/favicon.svg">';
 for(const file of html){
  const text=readFileSync(file,'utf8');
  if(!text.includes(link)||(text.split(link).length-1)!==1){
   errors.push('환자 공개 HTML 파비콘 링크 누락 또는 중복: '+file.slice(root.length+1));
  }
 }
}

// 인천·부평 신경치료: use a genuinely useful 10-article information hub for
// first-time treatment queries and a separate page for repeat endodontic care.
{
 const home=readFileSync(join(root,'index.html'),'utf8');
 const hub=readFileSync(join(root,'root-canal-health.html'),'utf8');
 const retreat=readFileSync(join(root,'retreatment.html'),'utf8');
 const index=JSON.parse(readFileSync(join(root,'content/search-index.json'),'utf8'));
 const canonicalHost=publicOrigin;
 const meta=(s,attr)=>s.match(new RegExp('<meta name="'+attr+'" content="([^"]+)"'))?.[1]||'';
 const og=(s,attr)=>s.match(new RegExp('<meta property="'+attr+'" content="([^"]+)"'))?.[1]||'';
 const title=(s)=>s.match(/<title>([^<]+)<\/title>/)?.[1]||'';
 const schemas=(s)=>[...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 const keywords=['인천 신경치료','부평 신경치료'];
 if(keywords.some(word=>!meta(home,'description').includes(word) ||
   !home.includes('href="/root-canal-health.html"')) ||
   meta(home,'description')!==og(home,'og:description') ||
   meta(home,'description')!==meta(home,'twitter:description')){
   errors.push('홈페이지 인천·부평 신경치료 안내·공유 설명 불일치');
 }
 const hubSchema=schemas(hub).find(s=>s['@type']==='CollectionPage');
 if(keywords.some(word=>!title(hub).includes(word)||!meta(hub,'description').includes(word))||
   !hub.includes('<h1>인천·부평 신경치료·재신경치료 건강정보</h1>')||
   !hub.includes('세월천로 34, 대우프라자 305호')||
   !hub.includes('신경치료와 재신경치료는 어떻게 다를까요?')||
   !hub.includes('href="/retreatment.html"')||
   hubSchema?.name!==title(hub)||hubSchema?.description!==meta(hub,'description')||
   hubSchema?.mainEntity?.numberOfItems!==10||
   og(hub,'og:title')!==title(hub)||og(hub,'og:description')!==meta(hub,'description')){
   errors.push('인천·부평 신경치료 건강정보의 진료 안내·SEO·구조화 데이터 불일치');
 }
 const retreatSchema=schemas(retreat).find(s=>s['@type']==='MedicalWebPage');
 if(!title(retreat).includes('인천 재신경치료')||!title(retreat).includes('부평 재신경치료')||
   keywords.some(word=>!meta(retreat,'description').includes(word))||
   !retreat.includes('href="/root-canal-health.html"')||
   retreatSchema?.name!==title(retreat)||retreatSchema?.description!==meta(retreat,'description')||
   og(retreat,'og:title')!==title(retreat)||og(retreat,'og:description')!==meta(retreat,'description')){
   errors.push('지역 재신경치료 안내·신경치료 연결·검색 설명 불일치');
 }
 for(const [url,expectedTitle] of [['/root-canal-health.html',title(hub)],['/retreatment.html',title(retreat)]]){
   const hits=index.filter(item=>item.url===url);
   if(hits.length!==1||hits[0].title!==expectedTitle ||
     !keywords.every(word=>String(hits[0].body+' '+hits[0].description).includes(word))){
     errors.push('홈페이지 내부 검색 신경치료 색인 제목·지역어 불일치: '+url);
   }
 }
 const siteSchemas=schemas(home);
 const clinic=siteSchemas.find(s=>s['@type']==='Dentist');
 const site=siteSchemas.find(s=>s['@type']==='WebSite');
 if(!clinic?.availableService?.some(x=>x.name==='신경치료(근관치료)')||
    !site?.hasPart?.some(x=>x.url===canonicalHost+'/root-canal-health'+(canonicalHost.endsWith('.com')?'':'.html'))){
   errors.push('치과 신경치료 서비스 구조화 데이터 및 건강정보 연결 누락');
 }
}


// Separate primary endodontic guidance from repeat-treatment decisions in every
// patient journey. FAQs retain the six originally reviewed questions and JSON-LD.
{
 const hub=readFileSync(join(root,'root-canal-health.html'),'utf8');
 const faq=readFileSync(join(root,'root-canal-retreatment-faq.html'),'utf8');
 const searchPage=readFileSync(join(root,'search.html'),'utf8');
 const style=readFileSync(join(root,'assets/style.css'),'utf8');
 const topicNav=hub.match(/<nav class="root-topic-choices" aria-label="신경치료 상황별 안내">([\s\S]*?)<\/nav>/)?.[1]||'';
 for(const target of ['/health/root-canal-why.html','/health/root-canal-after-pain.html','/root-canal-retreatment-faq.html']){
  if(!topicNav.includes('href="'+target+'"')) errors.push('신경치료 증상별 바로가기 누락: '+target);
 }
 if(!hub.includes('href="/root-canal-retreatment-faq.html"')||
    !faq.includes('href="/root-canal-health.html"')||
    !searchPage.includes('href="/root-canal-health.html">신경치료(근관치료) →</a> · <a href="/retreatment.html"')||
    !style.includes('.article .root-topic-choices a:focus-visible')){
  errors.push('신경치료 초진·재치료 관련 안내 연결 및 모바일 접근성 누락');
 }
 const prep=faq.match(/<section class="retreatment-previsit"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
 for(const term of ['처방약은 의료진과 상의하지 않고 임의로 중단하지 마세요','즉시 119',
   '/medical-history.html','/previsit-checklist.html','/visit-guide.html']){
  if(!prep.includes(term))errors.push('재신경치료 진료 준비·응급 안내 누락: '+term);
 }
 const schemaText=faq.split('<script type="application/ld+json">')[1]?.split('</script>')[0]||'';
 let ld;try{ld=JSON.parse(schemaText);}catch{errors.push('재신경치료 FAQ 구조화 데이터 오류');}
 if(ld && (ld['@type']!=='FAQPage'||ld.mainEntity?.length!==6||
    !ld.mainEntity.every(q=>faq.includes('<h2>'+q.name+'</h2>')&&faq.includes('<p>'+q.acceptedAnswer.text+'</p>')))){
  errors.push('재신경치료 FAQ 여섯 가지 기존 답변·구조화 데이터 불일치');
 }
}

// Local endodontic search relevance: an unspecific request for 신경치료 should
// lead to the introductory 10-guide hub, not an arbitrary "after-care" chapter.
// Pain or repeat-treatment intent must still lead to its clinically relevant
// guide. These checks execute the actual shipping scorer against the built index.
{
 const script=readFileSync(join(root,'assets/search.js'),'utf8');
 const document=readFileSync(join(root,'search.html'),'utf8');
 const from=script.indexOf('const aliases=');
 const to=script.indexOf('const resultSummary=',from);
 if(from<0||to<=from){ errors.push('홈페이지 신경치료 통합 검색 테스트 실행 위치 누락'); }
 else {
  try{
   const run=new Function('q','pages',script.slice(from,to)+
      'return {top:scored[0]?.url,primaryRootCanalIntent,retreatmentIntent,clinicalQuery};');
   const index=JSON.parse(readFileSync(join(root,'content/search-index.json'),'utf8'));
   for(const [query,expectedTop] of [
     ['신경치료','/root-canal-health.html'],
     ['근관치료','/root-canal-health.html'],
     ['인천 신경치료','/root-canal-health.html'],
     ['부평 신경치료','/root-canal-health.html'],
     ['청천동 신경치료','/root-canal-health.html'],
     ['산곡역 근처 치과 신경치료','/root-canal-health.html'],
     ['인천 신경치료 잘하는 곳','/root-canal-health.html'],
     ['인천 근관치료','/root-canal-health.html'],
     ['부평 재신경치료','/retreatment.html'],
     ['인천 재신경치료 잘하는 곳','/retreatment.html'],
     ['부평 신경치료 후 통증','/health/root-canal-after-pain.html'],
     ['산곡역 근처 치과 재신경치료','/retreatment.html']
   ]){
    const actual=run(query,index);
    if(actual.top!==expectedTop){
      errors.push('신경치료 지역·증상 검색의 정확한 안내 페이지 선택 실패: '+query+' -> '+actual.top+' (expected '+expectedTop+')');
    }
   }
  }catch(error){ errors.push('신경치료 검색 관련도 실행 오류: '+error.message); }
 }
 if(!document.includes('인천 신경치료</a>') || !document.includes('부평 신경치료</a>')||
    !document.includes('href="/root-canal-health.html">신경치료')){
   errors.push('홈페이지 검색의 인천·부평 신경치료 및 무자바스크립트 이동 링크 누락');
 }
}
