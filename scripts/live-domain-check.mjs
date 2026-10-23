// Read-only live website visibility probe for ejoeundental.com.
// This intentionally never changes DNS, hosting, indexing settings, or website files.
// A missing live domain must NOT turn a passing source build into a failure.
import dns from 'node:dns/promises';
import { appendFileSync, readFileSync } from 'node:fs';

const verifiedClinic = JSON.parse(readFileSync(new URL('../content/site.json', import.meta.url), 'utf8'));
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
  { label: 'www 하위 경로·쿼리 리디렉션', url: 'https://www.' + apex + '/gum-treatment?utm_source=redirect_check' },
  { label: '브랜드 파비콘 SVG', url: origin + '/favicon.svg' },
  { label: '검색엔진 robots', url: origin + '/robots.txt' },
  { label: '검색엔진 sitemap', url: origin + '/sitemap.xml' },
  { label: '잇몸치료 상세 페이지', url: origin + '/gum-treatment.html' },
  { label: '재신경치료 이미지 초기 표시', url: origin + '/retreatment.html' },
  { label: 'care route implant', url: origin + '/implant.html' },
  { label: 'care route tmj', url: origin + '/tmj-care.html' },
  { label: 'care route wisdom', url: origin + '/wisdom-tooth.html' },
  { label: 'care route pediatric', url: origin + '/pediatric-orthodontics.html' },
  { label: 'care route scaling', url: origin + '/scaling.html' },
  { label: 'care route cavity', url: origin + '/cavity-treatment.html' },
  { label: 'care route denture', url: origin + '/denture.html' },
  { label: 'care route child', url: origin + '/pediatric-dentistry.html' },
  { label: '잇몸 건강정보 탐색 경로', url: origin + '/health/gum-bleeding.html' },
  { label: '신경치료 건강정보 탐색 경로', url: origin + '/health/root-canal-after-pain.html' },
  { label: '자연치아 건강정보 진료 연결', url: origin + '/health/tooth-crack.html' },
  { label: 'public route gum-health', url: origin + '/gum-health.html' },
  { label: 'public route root-canal-health', url: origin + '/root-canal-health.html' },
  { label: 'public route insurance-health', url: origin + '/insurance-health.html' },
  { label: 'public route additional-health', url: origin + '/additional-health.html' },
  { label: 'public route visit-guide', url: origin + '/visit-guide.html' },
  { label: 'public route medical-safety-guide', url: origin + '/medical-safety-guide.html' },
  { label: 'public route previsit-checklist', url: origin + '/previsit-checklist.html' },
  { label: 'remaining route gum-treatment-faq', url: origin + '/gum-treatment-faq.html' },
  { label: 'remaining route root-canal-retreatment-faq', url: origin + '/root-canal-retreatment-faq.html' },
  { label: 'remaining route dental-insurance-faq', url: origin + '/dental-insurance-faq.html' },
  { label: 'remaining route medical-history', url: origin + '/medical-history.html' },
  { label: 'remaining route osteoporosis-medication-dental', url: origin + '/osteoporosis-medication-dental.html' },
  { label: 'remaining route blood-thinners-dental', url: origin + '/blood-thinners-dental.html' },
  { label: 'remaining route diabetes-dental-care', url: origin + '/diabetes-dental-care.html' },
  { label: 'remaining route heart-disease-dental-care', url: origin + '/heart-disease-dental-care.html' },
  { label: 'remaining route kidney-disease-dental-care', url: origin + '/kidney-disease-dental-care.html' },
  { label: 'remaining route liver-disease-dental-care', url: origin + '/liver-disease-dental-care.html' },
  { label: 'remaining route cancer-immunosuppression-dental-care', url: origin + '/cancer-immunosuppression-dental-care.html' },
  { label: 'remaining route pregnancy-dental-care', url: origin + '/pregnancy-dental-care.html' },
  { label: 'remaining route noncovered-fees', url: origin + '/noncovered-fees.html' },
  { label: 'remaining route medication-dental-faq', url: origin + '/medication-dental-faq.html' },
  { label: 'remaining route systemic-disease-dental-faq', url: origin + '/systemic-disease-dental-faq.html' },
  { label: 'remaining route clinical-archive', url: origin + '/clinical-archive.html' },
  { label: '통합 검색 모바일 배치', url: origin + '/search.html' },
  { label: '검색 결과 더 보기 동작 코드', url: origin + '/assets/search.js' },
  { label: '통합 검색 실제 문서 색인', url: origin + '/content/search-index.json' },
  { label: '검색 결과 더 보기 버튼 스타일', url: origin + '/assets/search-page.css' },
  { label: '없는 페이지 404 상태', url: origin + '/__missing-page-check-20261023' }
];

await Promise.all(urls.map(async ({label,url}) => {
  try {
    const response = await fetch(url, {
      redirect: label.startsWith('www ') ? 'manual' : 'follow',
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
    } else if (label === 'www 하위 경로·쿼리 리디렉션') {
      const location = response.headers.get('location') || '';
      let destination;
      try { destination = location ? new URL(location, url) : null; } catch { destination = null; }
      const ok = response.status === 301 &&
        destination?.origin === origin &&
        destination.pathname === '/gum-treatment' &&
        destination.search === '?utm_source=redirect_check';
      info.push(ok ? 'www 경로·쿼리 유지 301 정상' : 'www 하위 페이지 301 또는 쿼리 유지 미설정 (Cloudflare 규칙 필요)');
      if (location) info.push('이동 위치: ' + location);
    } else if (label === '정식 도메인 첫 화면') {
      const hasCanonical = body.includes('<link rel="canonical" href="' + origin + '/">');
      const hasClinic = body.includes('이조은치과');
      const hasCompactJournal = body.includes('owner-stories-more');
      info.push('치과명: ' + (hasClinic?'있음':'없음'));
      const canonicalValue = body.split('rel="canonical" href="')[1]?.split('"')[0] || '(없음)';
      info.push('대표주소: ' + (hasCanonical?'일치':'불일치') + ' (' + canonicalValue + ')');
      info.push('8+22 글목록: ' + (hasCompactJournal?'확인':'미확인'));
      info.push(body.includes('<link rel="icon" type="image/svg+xml" href="/favicon.svg">')?
        '브랜드 파비콘 연결 확인':'브랜드 파비콘 연결 미반영 (배포 상태 확인 필요)');
      const pageDescription=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      const ogDescription=body.match(/<meta property="og:description" content="([^"]+)"/)?.[1]||'';
      const twitterDescription=body.match(/<meta name="twitter:description" content="([^"]+)"/)?.[1]||'';
      info.push('검색·공유 소개 문구: '+(pageDescription&&pageDescription===ogDescription&&pageDescription===twitterDescription?'일치':'불일치 또는 누락'));
      const visibleStories=body.match(/<section class="section light" id="stories">([\s\S]*?)<\/section>/)?.[1]||'';
      const storyCards=(visibleStories.match(/class="card owner-story-card"/g)||[]).length;
      const hiddenCopies=/(?:원장이 작성한 네이버 블로그 글입니다|#stories .owner-story-card p\{display:none\})/.test(body);
      info.push('원장 글 30편 제목 링크·중복 문구 정리: '+(storyCards===30&&!hiddenCopies?'확인':'재점검 필요'));
      const clinicFooter=body.match(/<section class="footer-business" aria-label="이조은치과 의료기관 정보">([\s\S]*?)<\/section>/)?.[1]||'';
      const footerOk=['이조은치과의원','세월천로 34','대우프라자 305호',
        'tel:0325132875','3시간 무료','격주 진료','Copyright'].every(term=>clinicFooter.includes(term));
      info.push(footerOk?'하단 의료기관 정보·주소·전화·진료시간·주차 반영':'하단 의료기관 정보 배포 확인 필요');
      const repName=String(verifiedClinic.footer_representative||'').trim();
      const businessNumber=String(verifiedClinic.footer_business_registration||'').trim();
      const verifiedLegal=Boolean(repName&&businessNumber) &&
        clinicFooter.includes('<dt>대표자</dt><dd>'+repName+'</dd>') &&
        clinicFooter.includes('<dt>사업자등록번호</dt><dd>'+businessNumber+'</dd>');
      info.push(verifiedLegal?'검증된 대표자·사업자등록번호 하단 표시 확인':'하단 대표자·사업자등록번호 공개 상태 점검 필요');
      const feeFooterLinks=(body.match(/href="\/noncovered-fees\.html"/g)||[]).length;
      const discreetFeeLink=clinicFooter.includes('class="footer-fee-disclosure"')&&
        clinicFooter.includes('href="/noncovered-fees.html"')&&feeFooterLinks===1;
      info.push(discreetFeeLink?'수가 안내를 홈페이지 맨 아래 작은 링크 한 곳에 표시':'수가 안내 링크 위치 점검 필요');

      const symptomSection=visibleStories.match(/<div class="grid" id="post-list"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';
      const symptomCount=(symptomSection.match(/<article class="card"/g)||[]).length;
      const publishedSection=visibleStories.match(/<div id="published-story-items" class="grid"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';
      const publishedCards=(publishedSection.match(/<a class="card post-card" href="\/stories\//g)||[]).length;
      info.push('진료 증상 글 3편 첫 HTML 유지: '+(symptomCount===3?'확인':'확인 필요'));
      info.push('홈페이지 공개 글 서버 출력: '+(publishedCards>0&&body.includes('class="clinic-native-stories"')?publishedCards+'편 반영':'확인 필요'));

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

    } else if (label === '브랜드 파비콘 SVG') {
      const branded=response.status===200 && body.includes('<svg') &&
        body.includes('이조은치과') && body.includes('#173e35');
      info.push(branded?'이조은치과 SVG 아이콘 공개 확인':'브랜드 SVG 아이콘 최신 배포 확인 필요');
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
      const remainingSlugs=["gum-treatment-faq","root-canal-retreatment-faq","dental-insurance-faq","medical-history","osteoporosis-medication-dental","blood-thinners-dental","diabetes-dental-care","heart-disease-dental-care","kidney-disease-dental-care","liver-disease-dental-care","cancer-immunosuppression-dental-care","pregnancy-dental-care","noncovered-fees","medication-dental-faq","systemic-disease-dental-faq","clinical-archive"];
      const remainingFinalCount=remainingSlugs.filter(slug=>body.includes('<loc>'+origin+'/'+slug+'</loc>')).length;
      info.push('나머지 FAQ·의료안전·정보 페이지 최종 URL: '+remainingFinalCount+'/16');
    } else if (label === '잇몸 건강정보 탐색 경로' || label === '신경치료 건강정보 탐색 경로' || label === '자연치아 건강정보 진료 연결') {
      const correctHub = label.includes('잇몸') ? '/gum-health.html' : label.includes('신경치료') ? '/root-canal-health.html' : '/additional-health.html';
      // Cloudflare publishes /gum-health while source anchors can use /gum-health.html.
      const correctHubPublished=correctHub.slice(0,-5);
      const hasVisible=body.includes('<nav class="crumb health-breadcrumb" aria-label="현재 위치">') &&
        [correctHub,correctHubPublished].some(route=>body.includes('href="'+route+'"'));
      const hasBreadcrumbSchema=body.includes('"@type":"BreadcrumbList"') &&
        [correctHub,correctHubPublished].some(route=>body.includes('"'+origin+route+'"'));
      const hasCanonical = body.includes('<link rel="canonical" href="' + response.url + '">');
      info.push(hasVisible&&hasBreadcrumbSchema&&hasCanonical ? '홈→건강정보→글 이동 및 구조화 데이터 일치' : '탐색 경로 반영 확인 필요');
      const carePanel = body.match(/<nav class="patient-care-journey"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || '';
      const expectedCare = label.includes('잇몸') ? '/gum-treatment.html' : '/retreatment.html';
      const usable = carePanel.includes('href="'+expectedCare+'"') && carePanel.includes('href="/#location"') && carePanel.includes('href="tel:0325132875"') && carePanel.includes('실제 치료 필요성은 진찰 결과에 따라 달라집니다');
      info.push(usable ? '진료 안내·위치·전화 연결 정상' : '진료 안내·전화 버튼 반영 확인 필요');
      const toc=body.match(/<nav class="article-toc"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
      const foldedToc=toc.includes('<details class="article-toc-details">')&&toc.includes('<summary>이 글의 목차 펼치기');
      info.push(foldedToc?'목차 접기/펼치기(자바스크립트 없이) 반영':'목차 접기/펼치기 확인 필요');
    } else if (label.startsWith('public route ')) {
      const slug=label.slice('public route '.length);
      const canonical=body.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]||'';
      const finalUrl=origin+'/'+slug;
      const resultSuffix=response.url===finalUrl?'확장자 없는 최종 주소':'최종 주소 확인 필요';
      info.push(resultSuffix);
      info.push(canonical===response.url?'canonical 이미 일치':'canonical 수정 필요 ('+canonical+')');
      if(slug==='root-canal-health'){
        const pageTitle=body.match(/<title>([^<]+)<\/title>/)?.[1]||'';
        const pageDescription=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
        const phrases=['인천 신경치료','부평 신경치료'];
        const regionReady=phrases.every(term=>pageTitle.includes(term)&&pageDescription.includes(term))&&
          body.includes('신경치료와 재신경치료는 어떻게 다를까요?');
        info.push(regionReady?'인천·부평 신경치료 검색 정보·일반/재치료 구분 반영':'신경치료 지역 검색 문구 배포 확인 필요');
        const coverageReady=body.includes('id="root-canal-insurance"')&&body.includes('href="/health/insurance-root-canal.html"');
        info.push(coverageReady?'신경치료 보험 안내·최종 수복 구분·연결 반영':'신경치료 보험 안내 신규 배포 확인 필요');
      }
      const hubs={'gum-health':'/gum-treatment.html','root-canal-health':'/retreatment.html',
        'insurance-health':'/insured-care.html','additional-health':'/cervical-abrasion.html'};
      if(hubs[slug]){
        const visible=body.includes('<nav class="hub-top-trail" aria-label="현재 건강정보와 관련 진료">') &&
          body.includes('href="'+hubs[slug]+'"') && body.includes('aria-current="page"');
        info.push(visible?'건강정보 위치·진료 바로가기 반영':'건강정보 이동 경로 확인 필요');
        const editorial = body.includes('class="hub-editorial-note"') && body.includes('href="/#doctor"') && body.includes('이 페이지는 일반적인 건강정보');
        info.push(editorial?'건강정보 이용 한계·원장 소개 연결 반영':'건강정보 의료진 소개·이용 한계 반영 확인 필요');
        if(slug==='gum-health'){
          const hubDescription=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
          const updated=['인천 잇몸치료','부평 잇몸치료'].every(term=>hubDescription.includes(term));
          info.push(updated?'인천·부평 잇몸 건강정보 검색 설명 반영':'지역 잇몸 건강정보 미리보기 확인 필요');
        }
      }

    } else if (label.startsWith('remaining route ')) {
      const slug=label.slice('remaining route '.length);
      const desired=origin+'/'+slug;
      const canonical=body.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1]||'';
      info.push(response.url===desired?'최종 접속 경로 확인':'최종 경로 재점검 필요');
      info.push(canonical===desired?'대표주소 이미 일치':'대표주소가 최종 URL과 다름: '+canonical);
      const breadcrumb=body.includes('<nav class="patient-standalone-trail" aria-label="현재 위치">') &&
        body.includes('aria-current="page"');
      const pageMain=body.match(/<main\b[^>]*id="([^"]+)"/)?.[1]||'';
      const keyboard=Boolean(pageMain&&body.includes('href="#'+pageMain+'"'));
      const seoTrail=body.includes('"@type":"BreadcrumbList"')&&body.includes('"item":"'+desired+'"');
      info.push(breadcrumb&&keyboard&&seoTrail?
        '환자 안내 이동경로·본문 바로가기·구조화 데이터 정상':'환자 안내 이동경로 적용 여부 확인 필요');
    } else if (label === '통합 검색 모바일 배치') {
      const form = body.indexOf('<form class="search-form"');
      const results = body.indexOf('<section id="results"');
      const suggestions = body.indexOf('<p class="search-suggestions"');
      const good = form >= 0 && results > form && suggestions > results;
      info.push(good ? '입력·결과가 추천 검색어보다 먼저 표시됨' : '입력·결과 배치 확인 필요');
      info.push(body.includes('class="search-visit-examples"') ? '산곡역·진료시간·주차 빠른 검색 반영' : '방문 정보 검색 바로가기 반영 확인 필요');
    } else if (label === '통합 검색 실제 문서 색인') {
      let entries=[];
      try { entries=JSON.parse(body); } catch { info.push('검색 색인 JSON 확인 불가'); }
      if(Array.isArray(entries)&&entries.length){
        const gum=entries.find(x=>x.url==='/health/gum-bleeding.html');
        const noNavigation=Boolean(gum?.body&&!gum.body.includes('이 글의 목차')&&!gum.body.includes('이조은치과 홈'));
        const newest=entries.find(x=>x.url==='/gum-treatment.html');
        const correctCare=String(newest?.title||'').includes('인천 잇몸치료');
        info.push('문서 '+entries.length+'개');
        const newlyFindable=['/visit-guide.html','/medical-safety-guide.html','/previsit-checklist.html',
          '/gum-treatment-faq.html','/root-canal-retreatment-faq.html','/dental-insurance-faq.html',
          '/medical-history.html','/osteoporosis-medication-dental.html','/blood-thinners-dental.html',
          '/diabetes-dental-care.html','/heart-disease-dental-care.html','/kidney-disease-dental-care.html',
          '/liver-disease-dental-care.html','/cancer-immunosuppression-dental-care.html',
          '/pregnancy-dental-care.html','/noncovered-fees.html','/medication-dental-faq.html',
          '/systemic-disease-dental-faq.html','/clinical-archive.html'];
        const added=entries.filter(row=>newlyFindable.includes(row.url)&&String(row.body||'').length>=100);
        info.push('신규 환자 FAQ·안전자료 검색: '+added.length+'/'+newlyFindable.length+'개');
        info.push('공개 검색 문서 수: '+entries.length+'개 (게시글 공개 여부에 따라 변동)');
        info.push(noNavigation?'공통 메뉴 제외된 임상 본문 확인':'공통 메뉴 제외 여부 확인 필요');
        info.push(correctCare?'주요 진료 검색 제목 최신':'주요 진료 검색 제목 확인 필요');
      }
    } else if (label === '검색 결과 더 보기 동작 코드') {
      info.push(body.includes("showMore.addEventListener('click'") && body.includes('renderMatches(batch,extraResults)') ? '20개씩 검색 결과 펼치기 코드 반영' : '더 보기 코드 반영 확인 필요');
      const improvedSymptoms = body.includes('const symptomBoosts=') && body.includes("'치은퇴축'") && body.includes("'잇몸출혈'");
      info.push(improvedSymptoms ? '환자 증상·동의어 검색 개선 반영' : '증상·동의어 검색 개선 확인 필요');
      const visitPanel=body.includes('const localityOnlyIntent=') && body.includes('const visitIntent=') && body.includes('className=\'search-visit-answer\'');
      info.push(visitPanel ? '치과 주소·진료시간·주차 검색 바로 표시 기능 반영' : '방문 검색 기능 반영 확인 필요');
      const canonicalSearchLinks = body.includes('const publishedHref=') &&
        body.includes("host==='ejoeundental.com'") &&
        body.includes('a.href=publishedHref(p.url)');
      const relevantExcerpt = body.includes('const resultSummary=') &&
        body.includes('본문 관련 내용: ');
      info.push(canonicalSearchLinks&&relevantExcerpt ?
        '검색 결과 최종주소 링크·본문 관련 내용 미리보기 반영' :
        '검색 결과 링크·본문 발췌 기능 확인 필요');
      const categoriesApplied=body.includes('const searchCategory=p=>') &&
        body.includes("filterBar.setAttribute('role','group')") &&
        body.includes("button.setAttribute('aria-pressed'") &&
        body.includes('const showResults=type=>') &&
        body.includes('listArea.replaceChildren()');
      info.push(categoriesApplied?'유형별 검색 결과 필터·키보드 전환 반영':'유형별 검색 필터 확인 필요');
      const equipmentRoutes=body.includes('className=\'search-expert-direct-links\'') &&
        body.includes('className=\'search-expert-direct-actions\'') &&
        body.includes('/dental-equipment.html') &&
        body.includes('/dental-materials.html') &&
        body.includes("equipmentIntent?[]");
      info.push(equipmentRoutes?'장비 자료 바로가기·일반 환자 검색 분리 반영':'전문가 참고자료 분리 확인 필요');
    } else if (label === '검색 결과 더 보기 버튼 스타일') {
      info.push(body.includes('.search-show-more{') ? '모바일 더 보기 버튼 스타일 반영' : '버튼 스타일 반영 확인 필요');
      info.push(body.includes('.search-expert-direct-links{')&&body.includes('.search-expert-direct-actions{')?
        '장비 참고자료 모바일 바로가기 스타일 반영':'장비 참고자료 모바일 스타일 확인 필요');
    } else if (label === '없는 페이지 404 상태') {
      info.push(response.status === 404 ? '404 정상 응답' : '주의: 404 대신 '+response.status);
      info.push(body.includes('요청하신 페이지를 찾을 수 없습니다') ? '오류 안내 화면 확인' : '오류 안내 화면 확인 필요');
    } else if (label.startsWith('care route ')) {
      const routes={implant:'implant',tmj:'tmj-care',wisdom:'wisdom-tooth',pediatric:'pediatric-orthodontics',scaling:'scaling',cavity:'cavity-treatment',denture:'denture',child:'pediatric-dentistry'};
      const slug=routes[label.slice('care route '.length)];
      const target=origin+'/'+slug;
      const finalRoute=response.url===target;
      const visible=body.includes('<nav class="treatment-breadcrumb" aria-label="현재 위치">')&&
        body.includes('class="treatment-breadcrumb-current" aria-current="page"')&&
        body.includes('href="/#care"');
      const mainId=body.match(/<main\b[^>]*id="([^"]+)"/)?.[1]||'';
      const skip=body.match(/<a\b[^>]*class="(?:page-skip-link|treatment-skip-link)"[^>]*>/)?.[0]||'';
      const keyboard=Boolean(mainId&&skip.includes('href="#'+mainId+'"'));
      info.push(finalRoute?'최종경로 확장자 없음 확인':'최종경로 확인 필요: '+response.url);
      info.push(visible&&keyboard?'환자 위치 표시·키보드 바로가기 적용':'이동 경로·키보드 접근 확인 필요');
      const canonical=body.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]||'';
      const canonicalAligned=canonical===response.url;
      const schemaAligned=body.includes('"item":"'+response.url+'"');
      info.push(canonicalAligned&&schemaAligned?'진료 canonical·실제 최종주소·경로 구조화 데이터 일치':'진료 canonical·구조화 데이터 확인 필요 ('+canonical+')');
    } else if (label === '재신경치료 이미지 초기 표시') {
      const allImages=[...body.matchAll(/<img\b[^>]*\bsrc="(\/assets\/(?:retreatment|cms-images)\/[^"]+)"[^>]*>/g)];
      const direct=allImages.length===10 && !body.includes('src="/assets/retreatment-image-manager.js"');
      const hasDimensions=allImages.length===10 && allImages.every(x=>/\bwidth="\d+"/.test(x[0])&&/\bheight="\d+"/.test(x[0]));
      info.push(direct?'이미지 10개 첫 HTML 반영·추가 JSON 요청 제거':'실시간 그림 교체 스크립트 또는 개수 확인 필요');
      info.push(hasDimensions?'이미지 원본 크기 지정 확인':'이미지 크기 정보 확인 필요');
    } else if (label === '잇몸치료 상세 페이지') {
      info.push('치료정보: ' + (body.includes('잇몸치료')?'있음':'미확인'));
      const canonicalValue = body.split('rel="canonical" href="')[1]?.split('"')[0] || '(없음)';
      info.push('실제 최종 주소와 canonical: ' + (canonicalValue === response.url ? '일치' : '불일치') + ' (' + canonicalValue + ')');
      const gumTitle=body.match(/<title>([^<]+)<\/title>/)?.[1]||'';
      const gumDescription=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      const bothAreas=['인천 잇몸치료','부평 잇몸치료'];
      const present=bothAreas.every(term=>gumTitle.includes(term)&&gumDescription.includes(term)) &&
        body.includes('인천·부평 잇몸치료,') && body.includes('세월천로 34');
      info.push(present?'인천·부평 잇몸치료 검색 제목·설명·실제 주소 반영':'지역 잇몸치료 검색 문구 최신 배포 확인 필요');
    }
    // Show deployment status for the verified original-author links.
    if(['public route gum-health','public route root-canal-health'].includes(label)){
      const gum=label==='public route gum-health';
      const slug=gum?'gum':'root';
      const region=body.match(new RegExp('<section class="owner-originals" id="owner-originals-'+slug+'"[^>]*>([\\s\\S]*?)<\\/section>'))?.[1]||'';
      const posts=[...region.matchAll(/<li><a href="https:\/\/blog\.naver\.com\/[^"]+" target="_blank" rel="noopener noreferrer">/g)];
      const good=posts.length===3&&region.includes('href="/clinical-archive.html#archive-group-'+slug+'"');
      info.push(good?'원장이 쓴 네이버 원문 3편·주제별 자료 연결 반영':'원장 원문 3편 안내 신규 배포 확인 필요');
    }
    // Reuse fetched pages: check actual public metadata without another request.
    if(['public route gum-health','public route root-canal-health',
        'public route insurance-health','public route additional-health',
        '재신경치료 이미지 초기 표시','잇몸치료 상세 페이지',
        '잇몸 건강정보 탐색 경로','신경치료 건강정보 탐색 경로'].includes(label)){
      const title=body.match(/<title>([^<]+)<\/title>/)?.[1]||'';
      const summary=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      const canonical=body.match(/<link rel="canonical" href="([^"]+)"/)?.[1]||'';
      const checks=[
        ['property','og:title',title],['property','og:description',summary],
        ['property','og:url',canonical],['name','twitter:card','summary'],
        ['name','twitter:title',title],['name','twitter:description',summary]
      ];
      const verified=Boolean(title&&summary&&canonical&&canonical===response.url)&&
        checks.every(([kind,key,value])=>{
          const tag='<meta '+kind+'="'+key+'" content="'+value+'">';
          return body.split(tag).length===2;
        });
      info.push(verified?'의학정보 제목·소개·대표주소·공유 미리보기 일치':'의학정보 공유 카드 최신 반영 확인 필요');
    }
    if(label==='remaining route clinical-archive'){
      const groups=(body.match(/class="archive-blog-group"/g)||[]).length;
      const links=[...body.matchAll(/<li><a href="(https:\/\/blog\.naver\.com\/[^"]+)" target="_blank" rel="noopener noreferrer">/g)].map(m=>m[1]);
      const collection=body.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
      let items=0;
      try{items=JSON.parse(collection)?.mainEntity?.numberOfItems||0}catch{}
      const ready=groups===4&&links.length===30&&new Set(links).size===30&&items===30&&body.includes('id="archive-blog-posts"');
      info.push(ready?'원장 네이버 원문 30편·주제별 4묶음·검색 구조화 데이터 반영':'원장 글 30편 주제별 아카이브 신규 배포 확인 필요');
      info.push(body.includes('src="/assets/archive-topics.js?v=20261023-smartfind1"')
        ?'원장 글 제목 검색·주제 자동 펼침 스크립트 연결 반영'
        :'원장 글 제목 검색·주제 자동 펼침 신규 배포 확인 필요');
    }
    if(label==='검색 결과 더 보기 동작 코드'){
      const newSearchReady=body.includes('scalingComparisonIntent')&&body.includes('scalingOnlyIntent')&&
        body.includes('치주낭치료')&&body.includes('신경치료비용');
      info.push(newSearchReady?'치주치료·스케일링·잇몸 증상 검색 관련도 개선 반영':'치주·스케일링 자연어 검색 개선 신규 배포 확인 필요');
    }
    // Reuse already-fetched 19 public patient resources: no additional requests.
    // Keep social previews, medical schema and search snippets consistent in production.
    if(label.startsWith('remaining route ')||
       ['public route visit-guide','public route medical-safety-guide','public route previsit-checklist'].includes(label)){
      const read=(key,type='name')=>body.match(new RegExp('<meta '+type+'="'+key+'" content="([^"]+)"'))?.[1]||'';
      const desc=read('description'),ogDesc=read('og:description','property');
      const twDesc=read('twitter:description'),title=body.match(/<title>([^<]+)<\/title>/)?.[1]||'';
      const ogTitle=read('og:title','property'),twTitle=read('twitter:title');
      const canonical=body.match(/<link rel="canonical" href="([^"]+)"/)?.[1]||'';
      const socialUrl=read('og:url','property');
      const same=Boolean(desc&&title&&canonical&&desc===ogDesc&&desc===twDesc&&
        title===ogTitle&&title===twTitle&&canonical===socialUrl);
      info.push(same?'의료정보 검색·공유 문구 일치':'의료정보 SEO 설명·공유 카드 확인 필요');
      const webSchema=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
       .map(m=>{try{return JSON.parse(m[1])}catch{return null}})
       .find(d=>['MedicalWebPage','WebPage','CollectionPage'].includes(d?.['@type']));
      if(webSchema)info.push(webSchema.description===desc?'의료정보 구조화 설명 일치':'구조화 설명 불일치');
    }
    if(label==='remaining route noncovered-fees'){
      const expected=['보험사 양식 치료확인서','병원 발급 진단서',
        '차트 복사(진료기록 사본 1~5매)','파노라마 인쇄본'];
      const certificatesLast=body.lastIndexOf('<section class="fees-category"')===
        body.indexOf('<section class="fees-category" aria-label="제증명수수료 비용 안내">');
      const ready=certificatesLast && body.includes('id="fees-certificates"') &&
        body.includes('id="fees-treatments"') && !body.includes('class="fees-quick-nav"') &&
        expected.every(t=>body.includes(t)) &&
        !body.includes('<!-- BUILD_FEE_TABLES -->') &&
        !body.includes('src="/assets/fees.js"') &&
        !body.includes('<th scope="row">병원 발급 치료확인서</th>');
      info.push(ready?'제증명 수수료 4종 초기 HTML 반영':'제증명 수수료 최신 표시 확인 필요');
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
