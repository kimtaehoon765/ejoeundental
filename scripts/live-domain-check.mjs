// Read-only live website visibility probe for ejoeundental.com.
// This intentionally never changes DNS, hosting, indexing settings, or website files.
// A missing live domain must NOT turn a passing source build into a failure.
import dns from 'node:dns/promises';
import { appendFileSync } from 'node:fs';

const apex = 'ejoeundental.com';
const origin = 'https://' + apex;
const rows = [];
const add = (item, status, detail) => {
  rows.push({ item, status, detail: String(detail || '').replace(/[\r\n|]/g, ' ').slice(0, 240) });
  console.log('[LIVE CHECK]', item + ':', status, detail || '');
};
const shortError = e => e?.code || e?.cause?.code || e?.name || String(e);

for (const [label, host, method] of [
  ['DNS nameservers', apex, 'resolveNs'],
  ['DNS apex IPv4', apex, 'resolve4'],
  ['DNS www IPv4', 'www.' + apex, 'resolve4']
]) {
  try {
    const records = await Promise.race([
      dns[method](host),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), 6000))
    ]);
    add(label, '확인', records.join(', '));
  } catch (e) {
    add(label, '확인 불가', shortError(e));
  }
}

const urls = [
  { label: '정식 도메인 첫 화면', url: origin + '/' },
  { label: 'www HTTPS 연결', url: 'https://www.' + apex + '/' },
  { label: '검색엔진 robots', url: origin + '/robots.txt' },
  { label: '검색엔진 sitemap', url: origin + '/sitemap.xml' },
  { label: '잇몸치료 상세 페이지', url: origin + '/gum-treatment.html' },
  { label: 'care route implant', url: origin + '/implant.html' },
  { label: 'care route tmj', url: origin + '/tmj-care.html' },
  { label: 'care route wisdom', url: origin + '/wisdom-tooth.html' },
  { label: 'care route pediatric', url: origin + '/pediatric-orthodontics.html' },
  { label: '잇몸 건강정보 탐색 경로', url: origin + '/health/gum-bleeding.html' },
  { label: '신경치료 건강정보 탐색 경로', url: origin + '/health/root-canal-after-pain.html' },
  { label: '자연치아 건강정보 진료 연결', url: origin + '/health/tooth-crack.html' },
  { label: '통합 검색 모바일 배치', url: origin + '/search.html' },
  { label: '검색 결과 더 보기 동작 코드', url: origin + '/assets/search.js' },
  { label: '통합 검색 실제 문서 색인', url: origin + '/content/search-index.json' },
  { label: '검색 결과 더 보기 버튼 스타일', url: origin + '/assets/search-page.css' },
  { label: '없는 페이지 404 상태', url: origin + '/__missing-page-check-20261023' }
];

await Promise.all(urls.map(async ({label,url}) => {
  try {
    const response = await fetch(url, {
      redirect: label === 'www HTTPS 연결' ? 'manual' : 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'EjoeunDentalReadOnlyHealthCheck/1.0' }
    });
    const body = await response.text();
    const info = ['HTTP ' + response.status, '최종 주소: ' + response.url];
    const server = response.headers.get('server');
    if (server) info.push('서버: ' + server);
    if (label === 'www HTTPS 연결') {
      const location = response.headers.get('location') || '';
      const destination = location ? new URL(location, url) : null;
      const is301 = response.status === 301;
      const correctHost = destination?.origin === origin;
      info.push(is301 && correctHost ? 'www → 대표 주소 301 이동 정상' : 'www 301 대표 주소 이동 미설정');
      if (location) info.push('이동 위치: ' + location);
    } else if (label === '정식 도메인 첫 화면') {
      const hasCanonical = body.includes('<link rel="canonical" href="' + origin + '/">');
      const hasClinic = body.includes('이조은치과');
      const hasCompactJournal = body.includes('owner-stories-more');
      info.push('치과명: ' + (hasClinic?'있음':'없음'));
      const canonicalValue = body.split('rel="canonical" href="')[1]?.split('"')[0] || '(없음)';
      info.push('대표주소: ' + (hasCanonical?'일치':'불일치') + ' (' + canonicalValue + ')');
      info.push('8+22 글목록: ' + (hasCompactJournal?'확인':'미확인'));
      const heroStart = body.indexOf('<section class="hero wrap">');
      const heroEnd = body.indexOf('</section>',heroStart);
      const hero = heroStart>=0&&heroEnd>heroStart ? body.slice(heroStart,heroEnd) : '';
      const callFirst = hero.indexOf('class="hero-actions"')>=0 && hero.indexOf('class="hero-actions"')<hero.indexOf('class="hero-care-summary"');
      const careFold = hero.includes('class="hero-more-care"') && hero.includes('다른 진료·건강정보 5개 더 보기');
      info.push('모바일 진료·전화 우선 배치: ' + (callFirst&&careFold?'반영':'반영 확인 필요'));
      const careStart=body.indexOf('<section class="section" id="care">');
      const careEnd=body.indexOf('</section>',careStart);
      const care=careStart>=0&&careEnd>careStart?body.slice(careStart,careEnd):'';
      const serviceFold=care.includes('<details class="care-more-details">') &&
        care.includes('다른 진료 8가지 더 보기') &&
        care.includes('class="grid care-more-grid"') && care.includes('href="/denture.html"');
      info.push('전체 진료 모바일 5+8 펼치기: '+(serviceFold?'반영':'확인 필요'));
      const focusStart=body.indexOf('<section class="section light" id="focus-care">');
      const focusEnd=body.indexOf('</section>',focusStart);
      const focus=focusStart>=0&&focusEnd>focusStart?body.slice(focusStart,focusEnd):'';
      const shortcuts=focus.match(/<nav class="focus-care-shortcuts"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
      const expected=['/gum-treatment.html','/retreatment.html','/cervical-abrasion.html','/insured-care.html','/scaling.html'];
      const focusReady=expected.every(url=>shortcuts.includes('href="'+url+'"')) &&
        (shortcuts.match(/<a href=/g)||[]).length===5 && !focus.includes('<div class="card"');
      info.push('집중 진료 중복 설명 축소·5개 바로가기: '+(focusReady?'반영':'확인 필요'));
      info.push('모바일 최적화 CSS: '+(body.includes('home-enhancements.css?v=20261023-focus-nav-compact')?'최신':'버전 확인 필요'));

    } else if (label === '검색엔진 robots') {
      const sitemapValue = body.split('Sitemap: ')[1]?.split('\n')[0]?.trim() || '(없음)';
      info.push('사이트맵: ' + sitemapValue);
    } else if (label === '검색엔진 sitemap') {
      const firstLoc = body.split('<loc>')[1]?.split('</loc>')[0] || '(없음)';
      info.push('정식 도메인 홈페이지: ' + (body.includes('<loc>' + origin + '/</loc>')?'포함':'확인 필요'));
      info.push('첫 URL: ' + firstLoc);
      const careSlugs = ['gum-treatment','retreatment','cervical-abrasion','insured-care','tmj-care','wisdom-tooth','implant','pediatric-orthodontics','scaling','cavity-treatment','denture','pediatric-dentistry'];
      const finalCount = careSlugs.filter(slug => body.includes('<loc>' + origin + '/' + slug + '</loc>')).length;
      info.push('주요 진료 최종 URL: ' + finalCount + '/12');
    } else if (label === '잇몸 건강정보 탐색 경로' || label === '신경치료 건강정보 탐색 경로' || label === '자연치아 건강정보 진료 연결') {
      const correctHub = label.includes('잇몸') ? '/gum-health.html' : label.includes('신경치료') ? '/root-canal-health.html' : '/additional-health.html';
      const hasVisible = body.includes('<nav class="crumb health-breadcrumb" aria-label="현재 위치">') && body.includes('href="'+correctHub+'"');
      const hasBreadcrumbSchema = body.includes('"@type":"BreadcrumbList"') && body.includes('"' + origin + correctHub + '"');
      const hasCanonical = body.includes('<link rel="canonical" href="' + response.url + '">');
      info.push(hasVisible&&hasBreadcrumbSchema&&hasCanonical ? '홈→건강정보→글 이동 및 구조화 데이터 일치' : '탐색 경로 반영 확인 필요');
      const carePanel = body.match(/<nav class="patient-care-journey"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || '';
      const expectedCare = label.includes('잇몸') ? '/gum-treatment.html' : '/retreatment.html';
      const usable = carePanel.includes('href="'+expectedCare+'"') && carePanel.includes('href="/#location"') && carePanel.includes('href="tel:0325132875"') && carePanel.includes('실제 치료 필요성은 진찰 결과에 따라 달라집니다');
      info.push(usable ? '진료 안내·위치·전화 연결 정상' : '진료 안내·전화 버튼 반영 확인 필요');
      const toc=body.match(/<nav class="article-toc"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
      const foldedToc=toc.includes('<details class="article-toc-details">')&&toc.includes('<summary>이 글의 목차 펼치기');
      info.push(foldedToc?'목차 접기/펼치기(자바스크립트 없이) 반영':'목차 접기/펼치기 확인 필요');
    } else if (label === '통합 검색 모바일 배치') {
      const form = body.indexOf('<form class="search-form"');
      const results = body.indexOf('<section id="results"');
      const suggestions = body.indexOf('<p class="search-suggestions"');
      const good = form >= 0 && results > form && suggestions > results;
      info.push(good ? '입력·결과가 추천 검색어보다 먼저 표시됨' : '입력·결과 배치 확인 필요');
    } else if (label === '통합 검색 실제 문서 색인') {
      let entries=[];
      try { entries=JSON.parse(body); } catch { info.push('검색 색인 JSON 확인 불가'); }
      if(Array.isArray(entries)&&entries.length){
        const gum=entries.find(x=>x.url==='/health/gum-bleeding.html');
        const noNavigation=Boolean(gum?.body&&!gum.body.includes('이 글의 목차')&&!gum.body.includes('이조은치과 홈'));
        const newest=entries.find(x=>x.url==='/gum-treatment.html');
        const correctCare=String(newest?.title||'').includes('인천 잇몸치료');
        info.push('문서 '+entries.length+'개');
        info.push(noNavigation?'공통 메뉴 제외된 임상 본문 확인':'공통 메뉴 제외 여부 확인 필요');
        info.push(correctCare?'주요 진료 검색 제목 최신':'주요 진료 검색 제목 확인 필요');
      }
    } else if (label === '검색 결과 더 보기 동작 코드') {
      info.push(body.includes("showMore.addEventListener('click'") && body.includes('renderMatches(batch,extraResults)') ? '20개씩 검색 결과 펼치기 코드 반영' : '더 보기 코드 반영 확인 필요');
      const improvedSymptoms = body.includes('const symptomBoosts=') && body.includes("'치은퇴축'") && body.includes("'잇몸출혈'");
      info.push(improvedSymptoms ? '환자 증상·동의어 검색 개선 반영' : '증상·동의어 검색 개선 확인 필요');
    } else if (label === '검색 결과 더 보기 버튼 스타일') {
      info.push(body.includes('.search-show-more{') ? '모바일 더 보기 버튼 스타일 반영' : '버튼 스타일 반영 확인 필요');
    } else if (label === '없는 페이지 404 상태') {
      info.push(response.status === 404 ? '404 정상 응답' : '주의: 404 대신 '+response.status);
      info.push(body.includes('요청하신 페이지를 찾을 수 없습니다') ? '오류 안내 화면 확인' : '오류 안내 화면 확인 필요');
    } else if (label.startsWith('care route ')) {
      const routes={implant:'implant',tmj:'tmj-care',wisdom:'wisdom-tooth',pediatric:'pediatric-orthodontics'};
      const slug=routes[label.slice('care route '.length)];
      const target=origin+'/'+slug;
      const finalRoute=response.url===target;
      const visible=body.includes('<nav class="treatment-breadcrumb" aria-label="현재 위치">')&&
        body.includes('class="treatment-breadcrumb-current" aria-current="page"')&&
        body.includes('href="/#care"');
      const keyboard=body.includes('class="treatment-skip-link" href="#main-content"')&&
        /<main\b[^>]*id="main-content"/.test(body);
      info.push(finalRoute?'최종경로 확장자 없음 확인':'최종경로 확인 필요: '+response.url);
      info.push(visible&&keyboard?'환자 위치 표시·키보드 바로가기 적용':'이동 경로·키보드 접근 확인 필요');
      const canonical=body.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]||'';
      const canonicalAligned=canonical===response.url;
      const schemaAligned=body.includes('"item":"'+response.url+'"');
      info.push(canonicalAligned&&schemaAligned?'진료 canonical·실제 최종주소·경로 구조화 데이터 일치':'진료 canonical·구조화 데이터 확인 필요 ('+canonical+')');
    } else if (label === '잇몸치료 상세 페이지') {
      info.push('치료정보: ' + (body.includes('잇몸치료')?'있음':'미확인'));
      const canonicalValue = body.split('rel="canonical" href="')[1]?.split('"')[0] || '(없음)';
      info.push('실제 최종 주소와 canonical: ' + (canonicalValue === response.url ? '일치' : '불일치') + ' (' + canonicalValue + ')');
    }
    const result = label === '없는 페이지 404 상태' ? (response.status === 404 ? '정상 404' : '주의: 잘못된 응답') : label === 'www HTTPS 연결' ? (response.status === 301 && (response.headers.get('location') || '').includes('ejoeundental.com') && !(response.headers.get('location') || '').includes('www.ejoeundental.com') ? '대표 주소 통일' : '추가 설정 필요') : response.ok?'접속':'응답 점검 필요';
    add(label, result, info.join(' · '));
  } catch (e) {
    add(label, '접속 확인 불가', shortError(e));
  }
}));

if (process.env.GITHUB_STEP_SUMMARY) {
  const escape = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const lines = [
    '## 이조은치과 정식 도메인 공개 상태 (읽기 전용)',
    '',
    '| 점검 대상 | 결과 | 세부 내용 |',
    '|---|---|---|',
    ...rows.map(r=>'| '+escape(r.item)+' | '+escape(r.status)+' | '+escape(r.detail)+' |'),
    '',
    '> 이번 점검은 도메인 DNS/HTTPS/페이지 응답만 확인합니다. 네이버·구글의 실제 색인 여부, Netlify/Cloudflare 계정 연결 여부를 보장하지 않습니다.',
    '> DNS/호스팅 설정을 변경하지 않았으며 이 점검이 실패해도 소스 빌드 검사는 계속됩니다.',
    ''
  ];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n')+'\n');
}
