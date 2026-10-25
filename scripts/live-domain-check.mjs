// Read-only live website visibility probe for ejoeundental.com.
// This intentionally never changes DNS, hosting, indexing settings, or website files.
// A missing live domain must NOT turn a passing source build into a failure.
import dns from 'node:dns/promises';
import { appendFileSync, readFileSync, readdirSync } from 'node:fs';
import { bookingAction } from './naver-booking-link.mjs';

const verifiedClinic = JSON.parse(readFileSync(new URL('../content/site.json', import.meta.url), 'utf8'));
// Compare the actual public site with source-controlled content counts. These
// figures are derived at check time, so old 178-article checks cannot silently
// misreport a 333-article site as unfinished.
const homepageSource = readFileSync(new URL('../index.html',import.meta.url),'utf8');
const expectedOriginalCount = (homepageSource.match(/class="card owner-story-card"/g)||[]).length;
const postDirectory = new URL('../content/posts/',import.meta.url);
const publishedArticles = readdirSync(postDirectory).filter(name=>name.endsWith('.json'))
 .map(name=>({name,post:JSON.parse(readFileSync(new URL(name,postDirectory),'utf8'))}))
 .filter(({post})=>post.published===true)
 .sort((a,b)=>String(a.post.date||'').localeCompare(String(b.post.date||''))||
   a.name.localeCompare(b.name));
// A sample of the newest real source files is checked on the live domain.
// This catches new posts that build successfully but never reach public hosting.
const latestArticleSamples=publishedArticles.slice(-3).reverse()
 .map(({name,post})=>({slug:name.slice(0,-5),title:String(post.title||'')}));
const expectedPublishedCount=publishedArticles.length;
const newestPublishedArticles=[...publishedArticles].sort((a,b)=>
 String(b.post.date||'').localeCompare(String(a.post.date||''))||
 a.name.localeCompare(b.name));
const publishedUrl=entry=>'/stories/'+encodeURIComponent(entry.name.slice(0,-5))+'/';
const expectedNewestHomeUrls=newestPublishedArticles.slice(0,6).map(publishedUrl);
const expectedNewestRssUrls=newestPublishedArticles.slice(0,20).map(
 entry=>'https://ejoeundental.com/stories/'+encodeURIComponent(entry.name.slice(0,-5))+'/');
if(expectedOriginalCount<1||expectedPublishedCount<1)
  throw new Error('Source control has no verified original links or published stories');
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
  { label: '모네풍 갤러리 SVG 공개 확인', url: origin + '/assets/impressionist-water-garden.svg' },
  { label: '모네풍 갤러리 CSS 공개 확인', url: origin + '/assets/home-enhancements.css' },
  { label: 'www HTTPS 연결', url: 'https://www.' + apex + '/' },
  { label: 'Cloudflare Pages 임시주소 색인 확인', url: 'https://ejoeundental.pages.dev/' },
  { label: 'www 하위 경로·쿼리 리디렉션', url: 'https://www.' + apex + '/gum-treatment?utm_source=redirect_check' },
  { label: '브랜드 파비콘 SVG', url: origin + '/favicon.svg' },
  { label: '네이버 소프트 404 파비콘 ICO 개선 확인', url: origin + '/favicon.ico' },
  { label: '연락처 저장 vCard 배포', url: origin + '/clinic-contact.vcf' },
  { label: '검색엔진 robots', url: origin + '/robots.txt' },
  { label: '검색엔진 sitemap', url: origin + '/sitemap.xml' },
  { label: '네이버 최신글 RSS', url: origin + '/rss.xml' },
  { label: '홈페이지 치과 이야기 전체 글', url: origin + '/stories.html' },
  { label: '자연치아 보존 진료 안내', url: origin + '/tooth-preservation.html' },
  { label: '홈페이지 글 본문검색 데이터', url: origin + '/content/story-search-text.json' },
  ...latestArticleSamples.map(({slug})=>({
    label: '최신 공개 글 원본 비교: '+slug,
    url: origin + '/stories/' + encodeURIComponent(slug) + '/'
  })),
  { label: '최근 블로그 원고 대표 글 게시', url: origin + '/stories/2026-10-25-bupyeong-cavity-treatment-overtreatment-checklist/' },
  { label: '재신경치료 글 진료 연결 확인', url: origin + '/stories/2026-10-24-incheon-root-canal-tooth-gum-swelling-retreatment/' },
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
  { label: '환자용 모바일 전화·이동 메뉴 CSS', url: origin + '/assets/style.css' },
  { label: '없는 페이지 404 상태', url: origin + '/__missing-page-check-20261023' }
];

await Promise.all(urls.map(async ({label,url}) => {
  try {
    const response = await fetch(url, {
      redirect: label.startsWith('www ') ? 'manual' : 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'EjoeunDentalReadOnlyHealthCheck/1.0' }
    });
    const faviconIcoBytes=label==='네이버 소프트 404 파비콘 ICO 개선 확인'?
      new Uint8Array(await response.clone().arrayBuffer()):null;
    const body = await response.text();
    const info = ['HTTP ' + response.status, '최종 주소: ' + response.url];
    const server = response.headers.get('server');
    if (server) info.push('서버: ' + server);
    if (label === '연락처 저장 vCard 배포') {
      const valid=response.status===200&&body.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')&&
       body.includes('FN:이조은치과의원')&&
       body.includes('TEL;TYPE=WORK,VOICE:'+verifiedClinic.phone)&&
       body.includes('URL:'+origin+'/')&&body.includes('END:VCARD');
      info.push(valid?'환자용 연락처 저장 파일 배포 확인':'연락처 저장 파일 운영 사이트 배포 확인 필요');
    } else if (label === '자연치아 보존 진료 안내') {
      const hasCanonical=body.includes('<link rel="canonical" href="'+origin+'/tooth-preservation.html">');
      const linkedFromSite=body.includes('href="/stories.html#topic-preserve"')&&
        body.includes('href="/retreatment.html"')&&body.includes('href="/gum-treatment.html"')&&
        body.includes('href="/stories/2026-10-25-bupyeong-natural-tooth-versus-implant-maintenance/"');
      info.push(response.status===200&&hasCanonical&&linkedFromSite?
        '자연치아 보존 단독 환자 안내·진료·원장 글 실제 공개 확인':
        '자연치아 보존 단독 안내 또는 진료 연결 최신 배포 확인 필요');
    } else if (label === '홈페이지 글 본문검색 데이터') {
      let valid = false;
      let count = 0;
      try {
        const data = JSON.parse(body);
        const published = new Map(publishedArticles.map(entry=>
          [entry.name.slice(0,-5),String(entry.post.body||'').trim()]));
        count=Array.isArray(data.entries)?data.entries.length:0;
        valid=response.status===200&&data.version===1&&
          count===published.size&&
          data.entries.every(entry=>typeof entry.body==='string'&&
            published.has(entry.slug)&&published.get(entry.slug)===entry.body)&&
          new Set(data.entries.map(entry=>entry.slug)).size===count;
      } catch {}
      info.push(valid?'공개 글 '+count+'편 전체 본문 검색 자료가 실제 서버에서 제공됨':
       '공개 글 본문 검색 자료 미배포 또는 최신 원고 불일치');
    } else if (label === 'Cloudflare Pages 임시주소 색인 확인') {
      const robotsTag=String(response.headers.get('x-robots-tag')||'').toLowerCase();
      info.push(robotsTag.split(',').some(x=>x.trim().startsWith('noindex'))
        ?'Pages 임시 주소 검색 제외(noindex) 응답 확인'
        :'Pages 임시 주소 noindex 응답 확인 필요');
      const previewCanonical=body.match(/<link rel="canonical" href="([^"]+)"/)?.[1]||'';
      if(previewCanonical)info.push('임시 주소 대표문서: '+previewCanonical);
    } else if (label === 'www HTTPS 연결') {
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
      // Identify HTTP/3 advertisement for real-device intermittent QUIC errors.
      // This request may use HTTP/1.1/2 and CANNOT validate QUIC itself.
      // Cloudflare zone HTTP/3 is changed only in the provider dashboard.
      const altSvc=String(response.headers.get('alt-svc')||'');
      const advertisesHttp3=/(?:^|[,\s])h3(?:-[0-9]+)?\s*=/.test(altSvc);
      info.push('HTTP/3(QUIC) 사용 안내 헤더: '+(advertisesHttp3
        ?'h3 광고 확인 — 모바일 ERR_QUIC_PROTOCOL_ERROR가 반복되면 Cloudflare Speed > Settings > Protocol Optimization에서 HTTP/3 임시 해제 후 비교'
        :altSvc?'Alt-Svc 다른 프로토콜 광고 / HTTP/3 헤더 미검출':'h3 광고 헤더 미검출 — 다른 연결·DNS 레코드 또는 브라우저 캐시 확인 필요'));
      // Read the response already fetched, without extra network requests.
      // Missing headers are deployment signals, never claims of compromise.
      const securityKeys=['x-frame-options','x-content-type-options',
       'referrer-policy','permissions-policy'];
      const missingHeaders=securityKeys.filter(name=>!response.headers.get(name));
      info.push(missingHeaders.length===0
       ? 'Cloudflare Pages 응답 보안 헤더 4종 반영'
       : '응답 보안 헤더 누락·신규 배포 확인 필요: '+missingHeaders.join(', '));
      const publicNoindex=String(response.headers.get('x-robots-tag')||'').toLowerCase().includes('noindex');
      info.push(publicNoindex?'주의: 정식 도메인 응답에 noindex 헤더 확인됨':'정식 도메인 noindex 응답 없음');
      // Compare the deployed first-screen content with the latest committed design.
      const monetOnPage=body.includes('class="monet-interlude"') &&
        body.includes('/assets/impressionist-water-garden.svg');
      const currentFirstScreen=body.includes('id="headline">원장이 직접 진단하고,') &&
        body.includes('고려대학교 의학박사') &&
        body.includes('통합치의학과 전문의');
      info.push('모네풍 디자인 HTML 배포: '+(monetOnPage?'확인':'미반영 — GitHub 최신 코드와 실제 홈페이지 다름'));
      info.push('최신 원장 소개·의료진 자격 메인 반영: '+(currentFirstScreen?'확인':'미반영 — 배포 연결/캐시 확인 필요'));
      const exactDoctorDegree='고려대학교 의학박사(치과학 전공)';
      const exactDoctorHero=body.includes('<strong>'+exactDoctorDegree+'</strong>');
      const exactDoctorBio=body.includes('id="doctor_degree">'+exactDoctorDegree+'</span>');
      const degreeSchemaReady=/"name"\s*:\s*"원장 학위"\s*,\s*"value"\s*:\s*"고려대학교 의학박사\(치과학 전공\)"/.test(body);
      const exactDoctorReady=exactDoctorHero&&exactDoctorBio&&degreeSchemaReady;
      info.push(exactDoctorReady?'원장 학위 치과학 전공 표기·의료진·구조화 데이터 일치':
       '원장 학위 치과학 전공의 실서버 반영 확인 필요 (첫 화면 '+
       (exactDoctorHero?'확인':'미반영')+', 소개 '+(exactDoctorBio?'확인':'미반영')+
       ', 구조화 데이터 '+(degreeSchemaReady?'확인':'미반영')+')');
      const heroMarkup=body.match(/<section class="hero wrap">([\s\S]*?)<\/section>/)?.[1]||'';
      const credentialAt=heroMarkup.indexOf('고려대학교 의학박사');
      const galleryAt=heroMarkup.indexOf('class="hero-gallery-window"');
      const introAt=heroMarkup.indexOf('id="intro"');
      const firstScreenGallery=credentialAt>=0&&galleryAt>credentialAt&&introAt>galleryAt;
      info.push('모바일 첫 화면 수련 그림: '+(firstScreenGallery?'자격 소개 다음·진료 설명 앞 배치 확인':'신규 모바일 수련 그림 미반영'));
      const phoneGardenFirst=heroMarkup.includes('loading="lazy" decoding="async"') &&
        !heroMarkup.includes('fetchpriority="high"') &&
        body.includes('<link rel="preload" as="image" type="image/webp" media="(min-width: 601px)" href="/assets/ejoeundental-hero-cat.webp">');
      info.push('모네 그림 모바일 우선 로딩: '+(phoneGardenFirst?'모바일 후순위 의사 그림·데스크톱 사진 프리로드 확인':'새로운 우선 로딩 설정의 실서버 적용 확인 필요'));
      const fingerprint=body.match(/href="\/assets\/home-enhancements\.css\?v=([a-f0-9]{12})"/)?.[1]||'';
      info.push('모바일 디자인 CSS 버전: '+(fingerprint?'자동 버전('+fingerprint+') 적용':'버전 자동갱신 미확인'));
      const hasCanonical = body.includes('<link rel="canonical" href="' + origin + '/">');
      const hasClinic = body.includes('이조은치과');
      const hasCompactJournal = body.includes('owner-stories-more');
      info.push('치과명: ' + (hasClinic?'있음':'없음'));
      const canonicalValue = body.split('rel="canonical" href="')[1]?.split('"')[0] || '(없음)';
      info.push('대표주소: ' + (hasCanonical?'일치':'불일치') + ' (' + canonicalValue + ')');
      info.push('원장 원문 목록 접기·펼치기: ' + (hasCompactJournal?'확인':'확인 필요'));
      info.push(body.includes('<link rel="icon" type="image/svg+xml" href="/favicon.svg">')?
        '브랜드 파비콘 연결 확인':'브랜드 파비콘 연결 미반영 (배포 상태 확인 필요)');
      const pageDescription=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      const ogDescription=body.match(/<meta property="og:description" content="([^"]+)"/)?.[1]||'';
      const twitterDescription=body.match(/<meta name="twitter:description" content="([^"]+)"/)?.[1]||'';
      info.push('검색·공유 소개 문구: '+(pageDescription&&pageDescription===ogDescription&&pageDescription===twitterDescription?'일치':'불일치 또는 누락'));
      const localClinicTitle=body.match(/<title>([^<]+)<\/title>/)?.[1]||'';
      const localSearchReady=localClinicTitle.startsWith('부평치과 |')&&
        body.includes('id="intro">부평치과를 찾는 분께')&&
        pageDescription.includes('부평치과')&&
        body.includes('property="og:title" content="'+localClinicTitle+'"');
      info.push(localSearchReady?'부평치과 대표 검색 제목·원장 진료 소개 최신 반영':'부평치과 대표 검색어 홈페이지 신규 배포 확인 필요');
      const localFaq=body.match(/<section[^>]*id="faq"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
      const faqChoiceReady=localFaq.includes('부평치과를 알아볼 때 무엇부터 확인하면 좋을까요?')&&
        localFaq.includes('청천동 세월천로 34')&&
        localFaq.includes('href="/insured-care.html"')&&
        (localFaq.match(/<details(?: id="faq-[a-z-]+")?>/g)||[]).length===11;
      info.push(faqChoiceReady?'부평치과 선택 기준·원장 직접 진단 11문답 반영':'부평치과 선택 기준·FAQ 추가 배포 확인 필요');
      const visibleStories=body.match(/<section class="section light" id="stories">([\s\S]*?)<\/section>/)?.[1]||'';
      const storyCards=(visibleStories.match(/class="card owner-story-card"/g)||[]).length;
      const hiddenCopies=/(?:원장이 작성한 네이버 블로그 글입니다|#stories .owner-story-card p\{display:none\})/.test(body);
      info.push('원장 블로그 제목 링크: '+storyCards+'/'+expectedOriginalCount+(storyCards===expectedOriginalCount&&!hiddenCopies?'편 최신 반영':'편 — 실서버 배포 비교 필요'));
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
      const liveHomeCardUrls=[...publishedSection.matchAll(/<a class="card post-card" href="(\/stories\/[^"]+\/)"[^>]*>/g)]
       .map(match=>match[1]);
      const newestHomeReady=liveHomeCardUrls.length===expectedNewestHomeUrls.length&&
       liveHomeCardUrls.every((url,index)=>url===expectedNewestHomeUrls[index]);
      info.push(newestHomeReady?'홈페이지 최근 원고 6편 날짜·정렬 최신순 실제 게시':
       '홈페이지 6편이 최신 발행순으로 노출되는지 재검증 필요');
      const homeOlderLinks=(visibleStories.match(/class="journal-extra-entry" href="\/stories\//g)||[]).length;
      const homeTotalStories=publishedCards+homeOlderLinks;
      info.push('홈페이지 내부 게시글 전체 링크: '+homeTotalStories+'/'+expectedPublishedCount+
       (homeTotalStories===expectedPublishedCount?'편 확인':'편 — 최신 게시글 배포 확인 필요'));
      const accessibleCounts=body.includes('aria-label="홈페이지에서 읽는 치과 이야기 '+
       expectedPublishedCount+'편으로 이동"')&&
       body.includes('aria-label="홈페이지 치과 이야기 '+expectedPublishedCount+'편 목록으로 이동"')&&
       body.includes('· 홈페이지 글 '+expectedPublishedCount+'편 읽기 →');
      info.push(accessibleCounts?'치과 이야기 메뉴·첫 화면 글 수가 공개 '+expectedPublishedCount+'편으로 일치':
       '치과 이야기 첫 화면 안내 수와 실제 홈페이지 글 수 불일치');
      const ownerBooking=bookingAction(verifiedClinic.naver_booking_url);
      const bookingHtml=body.split('<nav class="mobile-booking-actions"')[1]?.split('</nav>')[0]||'';
      const publicBookingUrl=ownerBooking.url.replaceAll('&','&amp;');
      const bookingVisible=bookingHtml.includes('href="tel:0325132875"')&&
       bookingHtml.includes('href="'+publicBookingUrl+'"')&&
       bookingHtml.includes(ownerBooking.label);
      info.push(bookingVisible
       ?(ownerBooking.direct?'모바일 하단 전화·검증된 네이버 예약 바로가기 반영':
          '모바일 하단 전화·네이버 예약 검색 안내 반영 (직접 예약 URL은 미등록)')
       :'모바일 하단 전화·네이버 예약 안내 최신 배포 여부 확인 필요');
      const recentNav=body.split('<nav class="journal-recent-topics"')[1]?.split('</nav>')[0]||'';
      const recentNavLabels=[...recentNav.matchAll(/<span>([^<]+)<\/span>/g)]
       .map(match=>match[1]);
      const expectedRecent=['잇몸치료·스케일링','신경치료·재신경치료','충치·수복치료','자연치아 보존'];
      info.push(expectedRecent.every((label,index)=>recentNavLabels[index*2]===label)?
       '잇몸·신경·충치·자연치아 보존 핵심 4개 글 바로가기 실제 게시':
       '홈페이지 핵심 4개 글 바로가기 구성 확인 필요');

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
      // CSS is content-hashed during production build. Avoid comparing against
      // obsolete fixed version strings, which falsely report deployment errors.
      info.push('모바일 최적화 CSS: '+(/home-enhancements\.css\?v=[a-f0-9]{12}/.test(body)?'자동 갱신 버전 확인':'갱신 버전 확인 필요'));
      const localCare=body.match(/<section[^>]*id="local-care"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
      const localPanel=localCare.match(/<nav class="bupyeong-choice-links"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
      const goodLocalLinks=['#doctor','/gum-treatment.html','/retreatment.html','/visit-guide.html'].every(ref=>localPanel.includes('href="'+ref+'"'));
      info.push(goodLocalLinks&&localCare.includes('href="/clinical-archive.html#archive-choosing-dentist"')
        ?'부평치과 환자용 의료진·진료·길찾기 4개 연결 배포 반영':'부평치과 환자용 진료·위치 안내 신규 배포 확인 필요');

    } else if (label === '모네풍 갤러리 SVG 공개 확인') {
      const valid=response.status===200 && body.includes('이조은치과 인상주의 수련 연못 정원') &&
        body.includes('하얀 복슬복슬한 고양이');
      info.push(valid?'창작 수련 연못 그림 실서버 게시됨':'최신 그림 실서버 미게시 (배포 상태 확인 필요)');
      const optimized=valid&&body.includes('id="impressionist-pigment" aria-hidden="true" fill="none" stroke-linecap="round"') &&
        body.length<190000;
      info.push('모네풍 그림 경량화: '+(optimized?'붓질 유지·전송 텍스트 190KB 미만':'이미지 크기 최적화 배포 확인 필요'));
    } else if (label === '모네풍 갤러리 CSS 공개 확인') {
      const valid=response.status===200 && body.includes('Monet-inspired homepage gallery') &&
        body.includes('.monet-interlude__inner');
      info.push(valid?'모네풍 미술관 CSS 실서버 게시됨':'최신 미술관 CSS 실서버 미게시 (배포 상태 확인 필요)');
      const mobileGallery=valid&&body.includes('Homepage first-glance painting') &&
        body.includes('Screenshot follow-up')&&body.includes('body.home-page .hero-gallery-window');
      info.push('휴대전화 액자·상단 메뉴 스타일: '+(mobileGallery?'최신 디자인 CSS 확인':'신규 모바일 디자인 CSS 배포 확인 필요'));
    } else if (label === '네이버 소프트 404 파비콘 ICO 개선 확인') {
      // Check actual bytes, not merely HTTP 200: a soft 404 often returns HTML.
      const bytes=faviconIcoBytes;
      const size=bytes.length;
      const isIco=size>=256&&bytes[0]===0&&bytes[1]===0&&bytes[2]===1&&
        bytes[3]===0&&bytes[4]>=1&&bytes[6]===32&&bytes[7]===32;
      const mime=(response.headers.get('content-type')||'').toLowerCase();
      const iconMime=mime.startsWith('image/')||mime.includes('octet-stream');
      const valid=response.status===200&&isIco&&iconMime;
      info.push(valid?'32×32 실제 바이너리 ICO 공개 확인 — 이전 /favicon.ico 소프트 404 원인 수정':
       '기본 파비콘 경로가 HTML로 응답하거나 ICO 배포가 아직 반영되지 않음');
      info.push('파비콘 파일 '+size+'B, 응답 형식 '+(mime||'없음'));
    } else if (label === '브랜드 파비콘 SVG') {
      const branded=response.status===200 && body.includes('<svg') &&
        body.includes('이조은치과') && body.includes('#173e35');
      info.push(branded?'이조은치과 SVG 아이콘 공개 확인':'브랜드 SVG 아이콘 최신 배포 확인 필요');
    } else if (label === '검색엔진 robots') {
      const sitemapValue = body.split('Sitemap: ')[1]?.split('\n')[0]?.trim() || '(없음)';
      info.push('사이트맵: ' + sitemapValue);
    } else if (label === '네이버 최신글 RSS') {
      const itemLinks=[...body.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<\/item>/g)]
       .map(m=>m[1]);
      const bodyCounts=(body.match(/<item>/g)||[]).length;
      const completeBodies=(body.match(/<description>[\s\S]*?<\/description>/g)||[]).length-1;
      const onOwnDomain=itemLinks.every(url=>url.startsWith(origin+'/stories/'));
      const xmlReady=response.status===200&&body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')&&
       body.includes('<rss version="2.0"><channel>')&&bodyCounts===20&&
       itemLinks.length===bodyCounts&&new Set(itemLinks).size===bodyCounts&&
       completeBodies===bodyCounts&&onOwnDomain;
      info.push(xmlReady?'네이버용 게시글 20편 전체 본문·정식 주소 RSS 실제 배포 확인':
       '네이버 RSS 실제 배포 또는 본문·링크 재검증 필요');
      const feedOrderCurrent=itemLinks.length===expectedNewestRssUrls.length&&
        itemLinks.every((url,index)=>url===expectedNewestRssUrls[index]);
      info.push(feedOrderCurrent?'최신 발행 글 20편이 실제 RSS 맨 앞부터 최신순':
        '실제 RSS가 최신 20편을 표시하지 않음 — 게시 코드/배포 업데이트 확인 필요');
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
    } else if (label === '홈페이지 치과 이야기 전체 글') {
      const cardUrls=[...body.matchAll(/<a class="story-card" href="(\/stories\/[^"]+\/)"[^>]*>/g)].map(m=>m[1]);
      const uniqueCount=new Set(cardUrls).size;
      info.push('주제별 내부 글 '+cardUrls.length+'/'+expectedPublishedCount+'편 · 중복 없이 '+uniqueCount+'개');
      info.push(cardUrls.length===expectedPublishedCount&&uniqueCount===cardUrls.length
       ?'GitHub 공개 원고 전체가 정식 도메인에 게시됨'
       :'원고 수 또는 중복 확인 필요 — 실서버가 최신 배포가 아닐 수 있음');
      const canonical=body.match(/<link rel="canonical" href="([^"]+)"/)?.[1]||'';
      info.push(canonical===origin+'/stories.html'?'대표 주소 일치':'대표 주소 확인 필요 ('+canonical+')');
      const preservationSection=body.split('<section class="story-topic" id="topic-preserve"')[1]?.split('</section>')[0]||'';
      const preservationLink='/stories/2026-10-25-bupyeong-natural-tooth-versus-implant-maintenance/';
      const preservationReady=preservationSection.includes('자연치아 보존·발치 전 확인')&&
       preservationSection.includes('href="'+preservationLink+'"');
      info.push(preservationReady?'자연치아 보존 전용 글 분류·관련 글 실제 공개 확인':
       '자연치아 보존 주제별 안내가 실제 공개되었는지 확인 필요');

      const indexed=body.match(/data-search-index="(\/content\/story-search-text\.json\?v=[a-f0-9]{12})"/)?.[1];
      const script=body.match(/src="(\/assets\/story-directory\.js\?v=[a-f0-9]{12})"/)?.[1];
      info.push(indexed&&script?'모바일 글 검색에 최신 버전 본문 색인과 검색 프로그램 연결됨':
       '치과 이야기 본문 검색 프로그램 연결 또는 캐시 버전 확인 필요');
    } else if (label.startsWith('최신 공개 글 원본 비교: ')) {
      const slug=label.slice('최신 공개 글 원본 비교: '.length);
      const expected=latestArticleSamples.find(entry=>entry.slug===slug);
      const articleCanonical=body.match(/<link rel="canonical" href="([^"]+)"/)?.[1]||'';
      const expectedCanonical=origin+'/stories/'+encodeURIComponent(slug)+'/';
      const headingOk=Boolean(expected?.title)&&
        body.includes('<h1>'+expected.title+'</h1>');
      const isPublished=response.status===200&&
        articleCanonical===expectedCanonical&&headingOk;
      info.push(isPublished?'최신 원고 제목·대표주소·본문 페이지 공개 확인':
        '최신 소스 글의 실서버 게시 확인 필요 (배포 지연/HTML 내용 비교)');
      if(expected)info.push('소스 원고: '+expected.title);
    } else if (label === '재신경치료 글 진료 연결 확인') {
      const relatedGuide=body.match(/<aside class="notice" aria-label="관련 진료 안내">([\s\S]*?)<\/aside>/)?.[1]||'';
      const firstGuide=relatedGuide.match(/<a href="([^"]+)"/)?.[1]||'';
      const clinicalLinks=body.match(/<aside class="story-related" aria-labelledby="related-story-title">([\s\S]*?)<\/aside>/)?.[1]||'';
      const links=[...clinicalLinks.matchAll(/href="(\/stories\/[^"]+\/)"/g)].map(m=>m[1]);
      const correct=response.status===200&&
       body.includes('href="/stories.html#topic-root"')&&
       firstGuide==='/retreatment.html'&&links.length>=1&&links.length<=3&&
       new Set(links).size===links.length&&
       !links.includes('/stories/2026-10-24-incheon-root-canal-tooth-gum-swelling-retreatment/');
      info.push(correct?'신경치료 후 잇몸 고름 환자 글: 재신경치료 우선 연결·연관 글 정상 공개':
       '관련 진료 안내 또는 연관 글 최신 배포 확인 필요');
    } else if (label === '최근 블로그 원고 대표 글 게시') {
      const slug='2026-10-25-bupyeong-cavity-treatment-overtreatment-checklist';
      const url=origin+'/stories/'+slug+'/';
      const title='부평충치치료｜과잉진료를 피하려면 어떤 설명을 들어야 할까요?';
      const canonical=body.match(/<link rel="canonical" href="([^"]+)"/)?.[1]||'';
      const articleReady=response.status===200&&canonical===url&&body.includes('<h1>'+title+'</h1>')&&
       body.includes('href="/stories.html#topic-cavity"')&&
       body.includes('자료 제공: 이조은치과 원장');
      info.push(articleReady?'2026-10-25 작성 원고·진료 주제 연결·원장 표시 실제 공개 확인':
       '2026-10-25 원고가 최신 버전으로 게시되었는지 확인 필요');
      const mobileReader=body.includes('class="reading-controls" role="group"')&&
       body.includes('data-reading-size="extra"')&&
       body.includes('class="article-share-actions" role="group"')&&
       body.includes('data-article-action="copy"')&&
       body.includes('class="article-return-nav"')&&
       /\/assets\/reading-controls\.js\?v=[a-f0-9]{12}/.test(body)&&
       /\/assets\/article-sharing\.js\?v=[a-f0-9]{12}/.test(body);
      info.push(mobileReader?'모바일 글자 크기·공유·링크복사·인쇄·맨 위로 기능 실제 공개 확인':
       '모바일 글 읽기·공유 기능이 최신 공개 사이트에 있는지 확인 필요');
      const mobileActions=body.match(/<nav class="story-mobile-actions" aria-label="전화 문의와 진료 위치 안내">([\s\S]*?)<\/nav>/)?.[1]||'';
      const livePatientActions=response.status===200&&
        body.includes('<body class="owner-story-page">')&&
        mobileActions.includes('href="tel:0325132875"')&&
        mobileActions.includes('href="/#location"')&&
        body.includes('/assets/story-article.css?v=');
      info.push(livePatientActions?'모바일 고정 전화·오시는 길 2개 버튼 실제 공개 확인':
       '모바일 전화·오시는 길 버튼의 실서버 배포 확인 필요');
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
      const countCurrent=body.includes('네이버 블로그 원문 '+expectedOriginalCount+'편은')&&
       !body.includes('BUILD_NAVER_BLOG_COUNT')&&
       !body.includes('네이버 블로그 원문 323편은');
      info.push(countCurrent?'검색 페이지 블로그 원문 실제 '+expectedOriginalCount+'편 안내 확인':
       '검색 페이지 네이버 원문 수가 최신 홈페이지 수량과 다름');
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
      const localClinicDiscovery=body.includes('const clinicDiscoveryIntent=')&&
        body.includes('search-clinic-introduction')&&
        body.includes('부평구 청천동 이조은치과 안내')&&
        body.includes("['잇몸치료 안내',publishedHref('/gum-treatment.html')]");
      info.push(localClinicDiscovery?'부평치과·청천동치과 소개와 주요 진료 링크 최신 반영':'부평치과 지역 치과 안내 신규 배포 확인 필요');
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
      info.push(body.includes('<strong>고려대학교 의학박사(치과학 전공) · 통합치의학과 전문의</strong>')?
       '재신경치료 페이지 원장 자격·전공 정확히 표시':'재신경치료 페이지 원장 전공 표기 확인 필요');
    } else if (label === '잇몸치료 상세 페이지') {
      info.push('치료정보: ' + (body.includes('잇몸치료')?'있음':'미확인'));
      info.push(body.includes('<strong>고려대학교 의학박사(치과학 전공) · 통합치의학과 전문의</strong>')?
       '잇몸치료 페이지 원장 자격·전공 정확히 표시':'잇몸치료 페이지 원장 전공 표기 확인 필요');
      const canonicalValue = body.split('rel="canonical" href="')[1]?.split('"')[0] || '(없음)';
      info.push('실제 최종 주소와 canonical: ' + (canonicalValue === response.url ? '일치' : '불일치') + ' (' + canonicalValue + ')');
      const gumTitle=body.match(/<title>([^<]+)<\/title>/)?.[1]||'';
      const gumDescription=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      const bothAreas=['인천 잇몸치료','부평 잇몸치료'];
      const present=bothAreas.every(term=>gumTitle.includes(term)&&gumDescription.includes(term)) &&
        body.includes('인천·부평 잇몸치료,') && body.includes('세월천로 34');
      info.push(present?'인천·부평 잇몸치료 검색 제목·설명·실제 주소 반영':'지역 잇몸치료 검색 문구 최신 배포 확인 필요');
    }
    // Four separate treatment pages should link to the preservation hub.
    // This is a read-only real-domain check, distinct from the build tests.
    if(['잇몸치료 상세 페이지','재신경치료 이미지 초기 표시',
        'care route implant','care route cavity'].includes(label)){
      const hasLink=body.includes('href="/tooth-preservation.html"');
      info.push(hasLink?'발치 전 자연치아 보존 진료 안내로 실제 내부 링크 연결':
        '자연치아 보존 진료 안내 내부 링크 최신 배포 확인 필요');
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
    if(['public route gum-health','public route root-canal-health',
        'public route insurance-health','public route additional-health'].includes(label)){
      const skip=body.includes('class="health-hub-skip" href="#health-hub-main"')&&
        body.includes('<main class="article" id="health-hub-main">');
      info.push(skip?'건강정보 모음 키보드 본문 바로가기 반영':'건강정보 본문 바로가기 배포 확인 필요');
      if(label==='public route gum-health'){
        const four=body.match(/<nav class="gum-symptom-choices"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
        const matched=(four.match(/<a href="\/health\//g)||[]).length===4;
        info.push(matched?'잇몸 출혈·붓기·흔들림·스케일링 환자 안내 반영':'잇몸 증상별 환자 안내 신규 배포 확인 필요');
      }
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
      const ready=groups===5&&links.length===expectedOriginalCount&&
        new Set(links).size===expectedOriginalCount&&items===expectedOriginalCount&&
        body.includes('id="archive-blog-posts"');
      info.push('원장 아카이브 원문 링크 '+links.length+'/'+expectedOriginalCount+'편 · '+groups+'개 주제'+
        (ready?' · 검색 구조화 데이터 최신 반영':' · 배포 내용 및 구조화 데이터 재점검 필요'));
      info.push(body.includes('src="/assets/archive-topics.js?v=20261024-smartfind3"')
        ?'원장 글 제목 검색·주제 자동 펼침 스크립트 연결 반영'
        :'원장 글 제목 검색·주제 자동 펼침 신규 배포 확인 필요');
      const dentistChoiceReady=body.includes('id="archive-choosing-dentist"')&&
        body.includes('부평치과를 선택할 때 확인하면 좋은 다섯 가지')&&
        body.includes('href="#archive-group-ethics"')&&
        body.includes('href="/insured-care.html"');
      info.push(dentistChoiceReady?'부평치과 선택 체크리스트 5가지·원장 글 연결 반영':'부평치과 선택 체크리스트 신규 배포 확인 필요');
    }
    if(label==='검색 결과 더 보기 동작 코드'){
      const newSearchReady=body.includes('scalingComparisonIntent')&&body.includes('scalingOnlyIntent')&&
        body.includes('치주낭치료')&&body.includes('신경치료비용');
      info.push(newSearchReady?'치주치료·스케일링·잇몸 증상 검색 관련도 개선 반영':'치주·스케일링 자연어 검색 개선 신규 배포 확인 필요');
    }
    if(label==='환자용 모바일 전화·이동 메뉴 CSS'){
      const homepageOnly=body.includes('.mobile-quick + .navlinks{display:none}');
      const allGuidesCall=body.includes('.navlinks a.call{display:inline-flex;order:-1');
      const globalHide=/^\s*\.navlinks\{display:none\}/m.test(body);
      info.push(homepageOnly&&allGuidesCall&&!globalHide
        ?'모바일 건강정보 메뉴·전화 버튼 표시 CSS 최신 배포 확인'
        :'모바일 건강정보 메뉴 CSS 신규 배포 반영 확인 필요');
    }
    if(label==='public route visit-guide'){
      const desc=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      info.push(desc.includes('부평치과')&&body.includes('부평치과를 찾는 분께 실제 진료 위치를 안내합니다')
        ?'부평치과 진료시간·방문정보 신규 검색 안내 반영'
        :'부평치과 진료시간·방문정보 신규 배포 확인 필요');
      const visitTitle=body.match(/<title>([^<]+)<\/title>/)?.[1]||'';
      const visitQuickNav=body.match(/<nav class="visit-jump"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
      const visitLinks=['#visit-hours','#visit-parking','#transit-heading','#visit-checklist-title'];
      const visitSearchReady=visitTitle.startsWith('부평치과 진료시간·오시는 길·주차')&&
         visitLinks.every(id=>visitQuickNav.includes('href="'+id+'"'))&&
         body.includes('치과의 실제 위치는 인천 부평구 청천동입니다.');
      info.push(visitSearchReady?'부평치과 방문 안내 제목·모바일 4개 바로가기 반영':'부평치과 방문 안내 제목·모바일 4개 바로가기 배포 확인 필요');
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
    const redirectLocation=response.headers.get('location')||'';
    let redirectUrl=null;
    try { redirectUrl=redirectLocation?new URL(redirectLocation,url):null; }catch{}
    const wwwApexOk=response.status===301&&redirectUrl?.origin===origin;
    const wwwDeepOk=wwwApexOk&&redirectUrl.pathname==='/gum-treatment'&&
      redirectUrl.search==='?utm_source=redirect_check';
    const result = label==='없는 페이지 404 상태'
      ? (response.status===404?'정상 404':'주의: 잘못된 응답')
      : label==='www HTTPS 연결'
        ? (wwwApexOk?'대표 주소 통일':'추가 설정 필요')
        : label==='www 하위 경로·쿼리 리디렉션'
          ? (wwwDeepOk?'대표 주소 통일':'추가 설정 필요')
          : response.ok?'접속':'응답 점검 필요';
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
