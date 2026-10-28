// Read-only live website visibility probe for ejoeundental.com.
// This intentionally never changes DNS, hosting, indexing settings, or website files.
// A missing live domain must NOT turn a passing source build into a failure.
import dns from 'node:dns/promises';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { bookingAction } from './naver-booking-link.mjs';

const verifiedClinic = JSON.parse(readFileSync(new URL('../content/site.json', import.meta.url), 'utf8'));
// Compare the actual public site with source-controlled content counts. These
// figures are derived at check time, so old 178-article checks cannot silently
// misreport a 333-article site as unfinished.
const homepageSource = readFileSync(new URL('../index.html',import.meta.url),'utf8');
// The archive JavaScript is copied unchanged by build.mjs. Compare it to
// the exact live asset bytes, not merely the presence of a script tag.
const expectedArchiveScriptHash=createHash('sha256')
 .update(readFileSync(new URL('../assets/archive-topics.js',import.meta.url)))
 .digest('hex').slice(0,12);
const expectedStoryDirectoryHash=createHash('sha256')
 .update(readFileSync(new URL('../assets/story-directory.js',import.meta.url)))
 .digest('hex').slice(0,12);
// The production build embeds the current search-index checksum in search.js.
// Its bytes therefore intentionally differ from the unbuilt source asset.
// Compare live Cloudflare search.js with the FINAL emitted build artifact.
const builtSearchAsset=new URL('../dist/assets/search.js',import.meta.url);
const expectedSearchScriptHash=existsSync(builtSearchAsset)
 ?createHash('sha256').update(readFileSync(builtSearchAsset)).digest('hex').slice(0,12)
 :'';
// The final visual layer should reach the public host before marking this
// design enhancement delivered; build success alone is not live deployment.
// The public gallery CSS now uses the same content-fingerprinted SVG URL as
// the mobile preload. Derive its deployed bytes without requiring dist locally.
const gardenImageHash=createHash('sha256')
 .update(readFileSync(new URL('../assets/impressionist-water-garden.svg',import.meta.url)))
 .digest('hex').slice(0,12);
const expectedGalleryCssHash=createHash('sha256')
 .update(readFileSync(new URL('../assets/gallery-upgrade.css',import.meta.url),'utf8')
  .replace(/\/assets\/impressionist-water-garden\.svg(?:\?v=[0-9a-f]{12})?/g,
   '/assets/impressionist-water-garden.svg?v='+gardenImageHash))
 .digest('hex').slice(0,12);
const expectedOriginalCount = (homepageSource.match(/class="card owner-story-card"/g)||[]).length;
// Validate full-page gallery delivery, not just a successful source build.
const expectedCareGalleryHash=createHash('sha256')
 .update(readFileSync(new URL('../assets/care-gallery.css',import.meta.url)))
 .digest('hex').slice(0,12);
const verifiedBookingUrl=bookingAction(verifiedClinic.naver_booking_url).url;
const expectedInfoActionsHash=createHash('sha256')
 .update(readFileSync(new URL('../assets/clinic-info-mobile-actions.css',import.meta.url)))
 .digest('hex').slice(0,12);
const expectedSecondaryGalleryHash=createHash('sha256')
 .update(readFileSync(new URL('../assets/care-gallery-secondary.css',import.meta.url)))
 .digest('hex').slice(0,12);
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
// Validate revised dental explanations as well as newly published posts.
// Revisions to older blog articles must not disappear from deployment checks.
const editorialRevisions=[
 '2026-10-24-sangok-scaling-gargle-anesthesia-pain-control',
 '2026-10-25-incheon-loose-tooth-suddenly-periodontal-exam',
 '2026-10-25-sangok-implant-bone-graft-always-necessary',
 '2026-10-25-bupyeong-wisdom-tooth-extraction-hemostatic-dressing',
 '2026-10-26-cheongcheon-child-dentist-or-general-dentist',
 '2026-10-25-bupyeong-natural-tooth-versus-implant-maintenance',
 '2026-10-25-incheon-choosing-periodontal-clinic-what-to-check',
 '2026-10-24-bupyeong-good-dentist-selection'
];
const revisionTextMarkers=new Map([
 ['2026-10-25-sangok-implant-bone-graft-always-necessary','발치 당일 뼈이식이 필요한가요?'],
 ['2026-10-25-bupyeong-wisdom-tooth-extraction-hemostatic-dressing','부평두산위브·산곡동 환자 질문'],
 ['2026-10-26-cheongcheon-child-dentist-or-general-dentist','산곡동·청천동 보호자 질문'],
 ['2026-10-25-bupyeong-natural-tooth-versus-implant-maintenance','산곡역 임플란트 상담'],
 ['2026-10-25-incheon-choosing-periodontal-clinic-what-to-check','청천푸르지오 주변에서 잇몸치료'],
 ['2026-10-24-bupyeong-good-dentist-selection','부평 그랑힐스 주변에서 치과를'],
 ['2026-10-25-incheon-loose-tooth-suddenly-periodontal-exam','산곡동 풍치']
]);
const expectedEditorialRevisions=new Map(editorialRevisions.map(slug=>{
 const entry=publishedArticles.find(item=>item.name===slug+'.json');
 if(!entry||!entry.post.updated||!entry.post.date)
  throw new Error('Missing source revision for live SEO check: '+slug);
 return [slug,entry.post];
}));
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
  { label: 'Google 서치콘솔 소유권 HTML 파일', url: origin + '/google4b5b71e2b560cac2.html' },
  { label: '모네풍 갤러리 SVG 공개 확인', url: origin + '/assets/impressionist-water-garden.svg' },
  { label: '모네풍 갤러리 CSS 공개 확인', url: origin + '/assets/home-enhancements.css' },
  { label: '미술관형 리디자인 CSS 실제 배포', url: origin + '/assets/gallery-upgrade.css?v=' + expectedGalleryCssHash },
  { label: '신규 창작 그림 전시 스타일', url: origin + '/assets/curatorial-home.css?v=20261029-gallery1' },
  { label: '진료 안내 미술관 통합 디자인 CSS', url: origin + '/assets/care-gallery.css' },
  { label: '추가 진료 8개 미술관 디자인 CSS', url: origin + '/assets/care-gallery-secondary.css?v=' + expectedSecondaryGalleryHash },
  { label: 'www HTTPS 연결', url: 'https://www.' + apex + '/' },
  { label: 'Cloudflare Pages 임시주소 색인 확인', url: 'https://ejoeundental.pages.dev/' },
  { label: 'www 하위 경로·쿼리 리디렉션', url: 'https://www.' + apex + '/gum-treatment?utm_source=redirect_check' },
  { label: '브랜드 파비콘 SVG', url: origin + '/favicon.svg' },
  { label: '네이버 소프트 404 파비콘 ICO 개선 확인', url: origin + '/favicon.ico' },
  { label: '연락처 저장 vCard 배포', url: origin + '/clinic-contact.vcf' },
  { label: '검색엔진 robots', url: origin + '/robots.txt' },
  { label: '검색엔진 sitemap', url: origin + '/sitemap.xml' },
  // Verify the real published reading order after the October 28 fixes,
  // independently of a successful source build.
  ...['loose-tooth','receding-gums','periodontal-pocket','root-canal-retreatment-process','gum-pus']
   .map(slug=>({label:'개정 건강정보 읽기 순서: '+slug,url:origin+'/health/'+slug+'.html'})),
  { label: '검증된 ADA 항응고제 환자 안전 출처', url: origin + '/blood-thinners-dental.html' },
  { label: '검증된 ADA 골다공증약 환자 안전 출처', url: origin + '/osteoporosis-medication-dental.html' },
  { label: '검증된 ADA 심장질환 환자 안전 출처', url: origin + '/heart-disease-dental-care.html' },
  ...['blood-thinners-dental','osteoporosis-medication-dental',
      'diabetes-dental-care','heart-disease-dental-care',
      'medical-history','medical-safety-guide']
    .map(slug=>({label:'환자 안전정보 본문 후속안내: '+slug,url:origin+'/'+slug+'.html'})),
  ...['blood-thinners-dental','osteoporosis-medication-dental','diabetes-dental-care',
       'heart-disease-dental-care','kidney-disease-dental-care','liver-disease-dental-care',
       'cancer-immunosuppression-dental-care','pregnancy-dental-care',
       'medical-history','medical-safety-guide','medication-dental-faq','systemic-disease-dental-faq']
    .map(slug=>({label:'모바일 환자 안전정보 버튼: '+slug,url:origin+'/'+slug+'.html'})),
  { label: 'AI 의료진 출처 페이지', url: origin + '/doctor.html' },
  { label: 'AI 검색봇 접근 모의 검사', url: origin + '/gum-treatment.html', userAgent: 'OAI-SearchBot/1.0' },
  { label: '네이버 최신글 RSS', url: origin + '/rss.xml' },
  { label: '홈페이지 치과 이야기 전체 글', url: origin + '/stories.html' },
  { label: '자연치아 보존 진료 안내', url: origin + '/tooth-preservation.html' },
  { label: '홈페이지 글 본문검색 데이터', url: origin + '/content/story-search-text.json' },
  ...latestArticleSamples.map(({slug})=>({
    label: '최신 공개 글 원본 비교: '+slug,
    url: origin + '/stories/' + encodeURIComponent(slug) + '/'
  })),
  ...editorialRevisions.map(slug=>({
    label: '수정 글 SEO 메타정보: '+slug,
    url: origin + '/stories/' + encodeURIComponent(slug) + '/'
  })),
  { label: '최근 블로그 원고 대표 글 게시', url: origin + '/stories/2026-10-25-bupyeong-cavity-treatment-overtreatment-checklist/' },
  { label: '재신경치료 글 진료 연결 확인', url: origin + '/stories/2026-10-24-incheon-root-canal-tooth-gum-swelling-retreatment/' },
  { label: '재신경치료 치유 경과 관찰 글 수정 확인', url: origin + '/stories/2026-10-25-incheon-retreatment-root-tip-dark-spot-no-pain/' },
  { label: '잇몸치료 상세 페이지', url: origin + '/gum-treatment.html' },
  { label: '재신경치료 이미지 초기 표시', url: origin + '/retreatment.html' },
  { label: '재신경치료 과정 글·삽화 바로가기', url: origin + '/health/root-canal-retreatment-process.html' },
  { label: 'care route implant', url: origin + '/implant.html' },
  { label: 'care route tmj', url: origin + '/tmj-care.html' },
  { label: 'care route wisdom', url: origin + '/wisdom-tooth.html' },
  { label: 'care route pediatric', url: origin + '/pediatric-orthodontics.html' },
  { label: 'care route scaling', url: origin + '/scaling.html' },
  { label: 'Google 치경부마모증 GI 진료', url: origin + '/cervical-abrasion.html' },
  { label: '건강보험 진료 디자인 확인', url: origin + '/insured-care.html' },
  { label: 'Google GI 수복 보험·재수복 건강정보', url: origin + '/health/insurance-cervical.html' },
  { label: 'Google 스케일링 건강보험 재방문 안내', url: origin + '/health/insurance-scaling.html' },
  { label: 'Google 재신경치료 건강보험·크라운 비용 안내', url: origin + '/health/insurance-root-canal.html' },
  { label: 'care route cavity', url: origin + '/cavity-treatment.html' },
  { label: 'care route denture', url: origin + '/denture.html' },
  { label: 'Google 틀니 조정·개상·재제작 보험 건강정보', url: origin + '/health/insurance-denture.html' },
  { label: 'care route child', url: origin + '/pediatric-dentistry.html' },
  { label: '잇몸 건강정보 탐색 경로', url: origin + '/health/gum-bleeding.html' },
  { label: '신경치료 건강정보 탐색 경로', url: origin + '/health/root-canal-after-pain.html' },
  { label: '자연치아 건강정보 진료 연결', url: origin + '/health/tooth-crack.html' },
  { label: '보존 진료 연결 건강정보: 보존 원칙', url: origin + '/health/tooth-preservation.html' },
  { label: '보존 진료 연결 건강정보: 신경치료와 발치', url: origin + '/health/root-canal-or-extraction.html' },
  { label: '보존 진료 연결 건강정보: 흔들리는 치아', url: origin + '/health/loose-tooth.html' },
  { label: 'public route gum-health', url: origin + '/gum-health.html' },
  { label: 'Google 검색 잇몸 뾰루지·고름 건강정보', url: origin + '/health/gum-pus.html' },
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
  { label: '정보 안내 모바일 버튼 CSS 원본 검증',
    url: origin + '/assets/clinic-info-mobile-actions.css?v=' + expectedInfoActionsHash },
  { label: '원장 블로그 검색 자바스크립트 실제 배포 비교',
    url: origin + '/assets/archive-topics.js?v=' + expectedArchiveScriptHash },
  { label: '치과 이야기 검색 결과 이동 동작 코드', url: origin + '/assets/story-directory.js?v=' + expectedStoryDirectoryHash },
  { label: '검색 결과 더 보기 동작 코드', url: origin + '/assets/search.js' },
  { label: '통합 검색 실제 문서 색인', url: origin + '/content/search-index.json' },
  { label: '검색 결과 더 보기 버튼 스타일', url: origin + '/assets/search-page.css' },
  { label: '환자용 모바일 전화·이동 메뉴 CSS', url: origin + '/assets/style.css' },
  { label: '없는 페이지 404 상태', url: origin + '/__missing-page-check-20261023' }
];

// Compare the exact Naver topic totals shown on two care pages with the
// archive that was actually returned by the production domain.
const topicCountPages=new Map();
let deployedSearchScript='';
let deployedSearchCss='';
await Promise.all(urls.map(async ({label,url,userAgent}) => {
  try {
    const response = await fetch(url, {
      redirect: label.startsWith('www ') ? 'manual' : 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': userAgent || 'EjoeunDentalReadOnlyHealthCheck/1.0' }
    });
    const faviconIcoBytes=label==='네이버 소프트 404 파비콘 ICO 개선 확인'?
      new Uint8Array(await response.clone().arrayBuffer()):null;
    const body = await response.text();
    // Patient information hubs use one shared, source-hashed mobile action bar.
    // This reports real deployment separately from a passing GitHub source build.
    if(label==='정보 안내 모바일 버튼 CSS 원본 검증'){
      const ok=response.status===200&&createHash('sha256').update(body).digest('hex').slice(0,12)===expectedInfoActionsHash;
      add('모바일 안내페이지 버튼 CSS 공개 여부',ok?'실사이트 반영 확인':'배포·캐시 확인 필요',
       'HTTP '+response.status+' · 소스와 실사이트 CSS 내용 '+(ok?'일치':'불일치'));
    }
    const infoHubLabels=new Set([
     'AI 의료진 출처 페이지','홈페이지 치과 이야기 전체 글',
     'remaining route clinical-archive','public route gum-health',
     'public route root-canal-health','public route insurance-health',
     'public route additional-health'
    ]);
    if(infoHubLabels.has(label)){
      const nav=body.match(/<nav class="clinic-info-mobile-actions"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
      const hasLinks=nav.includes('href="tel:0325132875"')&&
       nav.includes('href="'+verifiedBookingUrl+'"')&&nav.includes('href="/visit-guide.html"');
      const styled=body.includes('clinic-info-mobile-actions.css?v='+expectedInfoActionsHash);
      const accessible=body.includes('본문 바로가기')||body.includes('건강정보 본문으로 바로가기');
      const ready=response.status===200&&hasLinks&&styled&&accessible;
      add('모바일 전화·예약·오시는 길 '+label,
       ready?'실사이트 반영 확인':'배포·캐시 확인 필요',
       'HTTP '+response.status+' · 3개 버튼 '+(hasLinks?'확인':'미확인')+
       ' · CSS '+(styled?'최신':'미확인')+' · 본문 바로가기 '+(accessible?'확인':'미확인'));
    }
    if(label==='치과 이야기 검색 결과 이동 동작 코드'){
      const match=response.status===200&&
        createHash('sha256').update(body).digest('hex').slice(0,12)===expectedStoryDirectoryHash&&
        body.includes("status.scrollIntoView?.({ block: 'start', behavior: 'auto' })")&&
        body.includes("field.setAttribute('aria-describedby', 'story-filter-status')");
      add('치과 이야기 검색 후 결과로 이동 기능',match?'실사이트 반영 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · 검색 프로그램 최신 내용 '+(match?'일치':'확인 필요'));
    }
    if(label.startsWith('개정 건강정보 읽기 순서: ')){
      const slug=label.slice('개정 건강정보 읽기 순서: '.length);
      const main=body.split('</main>')[0]||'';
      const footerAt=main.lastIndexOf('<div class="bottom">');
      const ordered=footerAt>=0&&!/<section\b/i.test(main.slice(footerAt));
      const medicalRef=slug==='loose-tooth'
       ?'https://www.mouthhealthy.org/all-topics-a-z/gum-disease/'
       :slug==='gum-pus'
        ?'https://www.aae.org/patients/dental-symptoms/abscessed-teeth/'
        :'';
      const refOk=!medicalRef||body.includes('href="'+medicalRef+'"');
      const ready=response.status===200&&ordered&&refOk;
      add('환자 건강정보 끝까지 읽기: '+slug,
       ready?'실사이트 반영 확인':'배포·캐시 확인 필요',
       'HTTP '+response.status+' · 글 끝 이동 링크 '+(ordered?'올바른 위치':'본문 위치 확인 필요')+
       (medicalRef?' · 공식 의학자료 '+(refOk?'연결 확인':'미확인'):''));
    }
    if(label.startsWith('검증된 ADA ')){
      const refs={
       '검증된 ADA 항응고제 환자 안전 출처':'https://www.ada.org/resources/ada-library/oral-health-topics/oral-anticoagulant-and-antiplatelet-medications-and-dental-procedures',
       '검증된 ADA 골다공증약 환자 안전 출처':'https://www.ada.org/resources/ada-library/oral-health-topics/osteoporosis-medications',
       '검증된 ADA 심장질환 환자 안전 출처':'https://www.ada.org/resources/ada-library/oral-health-topics/antibiotic-prophylaxis'
      };
      const a=refs[label];
      const found=response.status===200&&body.includes('href="'+a+'" target="_blank" rel="noopener noreferrer"')&&
       body.includes('aria-label="전문기관 참고자료"')&&body.includes('처방약은 담당 의료진과 상의 없이 변경하지 마세요.');
      add('의학 근거 출처 실제 게시: '+label,found?'실사이트 반영 확인':'배포·캐시 확인 필요',
       'HTTP '+response.status+' · ADA 공식 링크 '+(found?'안내 및 연결 확인':'미확인'));
    }
    if(label.startsWith('환자 안전정보 본문 후속안내: ')){
      const slug=label.slice('환자 안전정보 본문 후속안내: '.length);
      const target={
       'blood-thinners-dental':'<aside aria-label="자주 묻는 질문"',
       'osteoporosis-medication-dental':'<aside aria-label="자주 묻는 질문"',
       'diabetes-dental-care':'<aside aria-label="자주 묻는 질문"',
       'heart-disease-dental-care':'<aside aria-label="자주 묻는 질문"',
       'medical-history':'<nav aria-label="진료 전 건강정보 FAQ"',
       'medical-safety-guide':'<aside aria-label="원장의 임상 아카이브"'
      }[slug];
      const mainEnd=body.indexOf('</main>');
      const footerStart=body.indexOf('<footer');
      const targetAt=body.indexOf(target);
      const targetFaq={
       'blood-thinners-dental':'/medication-dental-faq.html#faq-question-2',
       'osteoporosis-medication-dental':'/medication-dental-faq.html#faq-question-3',
       'diabetes-dental-care':'/systemic-disease-dental-faq.html#faq-question-1',
       'heart-disease-dental-care':'/systemic-disease-dental-faq.html#faq-question-2'
      }[slug];
      const directlyLinked=!targetFaq||body.slice(0,mainEnd).includes('href="'+targetFaq+'"');
      const correct=response.status===200&&mainEnd>0&&footerStart>mainEnd&&
       targetAt>0&&targetAt<mainEnd&&directlyLinked;
      add('환자 안전정보 후속자료 올바른 위치: '+slug,
       correct?'실사이트 반영 확인':'배포·캐시 확인 필요',
       'HTTP '+response.status+' · 관련 FAQ·추가정보 '+(correct?'본문 안에서 확인':'배치 확인 필요'));
    }
    if(label.startsWith('모바일 환자 안전정보 버튼: ')){
      const slug=label.slice('모바일 환자 안전정보 버튼: '.length);
      const nav=body.match(/<nav class="clinic-info-mobile-actions"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
      const hasLinks=nav.includes('href="tel:0325132875"')&&
        nav.includes('href="'+verifiedBookingUrl+'"')&&nav.includes('href="/visit-guide.html"');
      const styled=body.includes('clinic-info-mobile-actions.css?v='+expectedInfoActionsHash);
      const main=body.match(/<main\b[^>]*id="([^"]+)"/)?.[1]||'';
      const skip=main && body.includes('href="#'+main+'">')&&
        (body.includes('class="patient-standalone-skip"')||body.includes('class="clinic-info-skip-link"'));
      const one=(body.match(/class="clinic-info-mobile-actions"/g)||[]).length===1;
      const ready=response.status===200&&hasLinks&&styled&&skip&&one;
      add('모바일 의료안내 전화·예약·오시는 길: '+slug,
        ready?'실사이트 반영 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · 3개 버튼 '+(hasLinks?'확인':'미확인')+
        ' · CSS '+(styled?'최신':'미확인')+' · 본문 바로가기 '+(skip?'확인':'미확인'));
    }
    if(label.startsWith('모바일 환자 안전정보 버튼: ')){
      const slug=label.slice('모바일 환자 안전정보 버튼: '.length);
      const checklistPages=new Set(['blood-thinners-dental','osteoporosis-medication-dental',
       'diabetes-dental-care','heart-disease-dental-care','kidney-disease-dental-care',
       'liver-disease-dental-care','cancer-immunosuppression-dental-care',
       'pregnancy-dental-care','medical-history']);
      if(checklistPages.has(slug)){
       const notice=body.indexOf('<p class="notice">');
       const shortcut=body.indexOf('<nav class="patient-checklist-jump"');
       const target=body.indexOf('id="visit-checklist"');
       const ordered=response.status===200&&notice>=0&&shortcut>notice&&target>shortcut&&
        body.includes('<a href="#visit-checklist">진료 전 확인 체크리스트 바로가기</a>')&&
        (body.match(/class="patient-checklist-jump"/g)||[]).length===1;
       add('복용약·질환 체크리스트 빠른 이동: '+slug,
        ordered?'실사이트 반영 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · 글 초반 링크 및 실제 준비 체크리스트 '+(ordered?'연결 확인':'미확인'));
      }
    }
    if(label==='미술관형 리디자인 CSS 실제 배포'){
      const delivered=response.status===200&&
        createHash('sha256').update(body).digest('hex').slice(0,12)===expectedGalleryCssHash&&
        body.includes('Gallery Edition / 2026-10-27');
      add('2026-10-27 고급 메인 디자인 CSS 실서버 일치',
        delivered?'실사이트 게시 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · CSS 내용 해시 '+(delivered?'GitHub 소스와 일치':'미확인/불일치'));
    }
    // Source-derived checksum confirms the CSS on the real custom domain.
    if(label==='진료 안내 미술관 통합 디자인 CSS'){
      const match=response.status===200&&
        createHash('sha256').update(body).digest('hex').slice(0,12)===expectedCareGalleryHash&&
        body.includes('Gallery Care Edition, 2026-10-27');
      add('진료 페이지 5종 통합 미술관 CSS 실제 공개',
        match?'실사이트 반영 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · 스타일시트 SHA-256 '+(match?'GitHub 원본과 일치':'불일치'));
    }
    if(label==='추가 진료 8개 미술관 디자인 CSS'){
      const valid=response.status===200&&
        createHash('sha256').update(body).digest('hex').slice(0,12)===expectedSecondaryGalleryHash&&
        body.includes('Clinical Gallery Edition');
      add('미술관형 추가 진료 CSS 실사이트 배포',valid?'실사이트 반영 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · CSS SHA-256 '+(valid?'GitHub 소스와 일치':'불일치/미확인'));
    }
    const secondaryGalleryPages={
      'care route cavity':'cavity-treatment',
      'care route scaling':'scaling',
      'care route denture':'denture',
      'care route implant':'implant',
      'care route child':'pediatric-dentistry',
      'care route pediatric':'pediatric-orthodontics',
      'care route wisdom':'wisdom-tooth',
      'care route tmj':'tmj-care'
    };
    if(secondaryGalleryPages[label]){
      const slug=secondaryGalleryPages[label];
      const ready=response.status===200&&
        body.includes('class="care-gallery care-gallery-secondary secondary-')&&
        body.includes('/assets/care-gallery-secondary.css?v='+expectedSecondaryGalleryHash)&&
        body.includes('class="treatment-hero-actions"')&&
        body.includes('class="care-gallery-booking"')&&
        body.includes('class="care-gallery-bottom-actions"')&&
        body.includes('href="'+verifiedBookingUrl+'"')&&
        body.includes('href="/visit-guide.html"');
      add('8종 진료 고급 디자인 및 예약 실배포 · '+slug+'.html',
        ready?'실사이트 반영 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · 신뢰성 설명·정식 네이버예약·모바일 버튼 '+(ready?'일치':'불일치/미확인'));
      const anchors={"cavity-treatment":["gallery-cavity-early","gallery-cavity-methods","gallery-cavity-faq"],"scaling":["gallery-scaling-timing","gallery-scaling-vs-gum","gallery-scaling-insurance"],"denture":["gallery-denture-types","gallery-denture-loose","gallery-denture-faq"],"implant":["implant-patient-decisions-heading","gallery-implant-exam","gallery-implant-preservation"],"wisdom-tooth":["gallery-wisdom-decision","gallery-wisdom-exam","gallery-wisdom-aftercare"],"tmj-care":["gallery-tmj-symptoms","gallery-tmj-care","gallery-tmj-aftercare"],"pediatric-dentistry":["gallery-child-babyteeth","gallery-child-prevention","pediatric-treatment-heading"],"pediatric-orthodontics":["gallery-ortho-exam","gallery-ortho-timing","child-removable-orthodontics-heading"]}[slug]||[];
      const sectionIndex=body.match(/<nav class="treatment-page-toc gallery-section-index"[\s\S]*?<\/nav>/)?.[0]||'';
      const navigationReady=response.status===200&&
        sectionIndex.includes('이 페이지에서 바로 찾기')&&
        sectionIndex.includes('href="/visit-guide.html"')&&
        anchors.length===3&&anchors.every(id=>
          sectionIndex.includes('href="#'+id+'"')&&body.includes('id="'+id+'"'));
      add('환자용 진료 목차 8종 실제 배포 · '+slug+'.html',
        navigationReady?'실사이트 목차 반영 확인':'배포·캐시 확인 필요',
        '섹션 바로가기 3곳과 방문 안내 링크 '+(navigationReady?'정상 공개':'미확인'));
    }
    // Verify that October 28 patient education links are discoverable from
    // their relevant public care guides, beyond simply checking story URLs.
    const clinicalStoryLinks=new Map([
      ['care route cavity', {
        href:'/stories/2026-10-28-sangok-front-tooth-resin-cavity-repair/',
        label:'충치치료 → 앞니 레진 환자교육 내부 링크'
      }],
      ['remaining route diabetes-dental-care', {
        href:'/stories/2026-10-28-cheongcheon-diabetes-implant-anesthesia-checklist/',
        label:'당뇨환자 안내 → 임플란트·마취 환자교육 내부 링크'
      }]
    ]);
    if(clinicalStoryLinks.has(label)){
      const {href,label:linkLabel}=clinicalStoryLinks.get(label);
      const found=response.status===200&&body.includes('href="'+href+'"');
      add(linkLabel,found?'실사이트 반영 확인':'배포·캐시 확인 필요',
       'HTTP '+response.status+' · 관련 진료 설명에서 정확한 공개 교육 글 주소 '+(found?'연결됨':'미확인'));
    }
    const careGalleryPages={
      '잇몸치료 상세 페이지':'gum-treatment',
      '재신경치료 이미지 초기 표시':'retreatment',
      '자연치아 보존 진료 안내':'tooth-preservation',
      'Google 치경부마모증 GI 진료':'cervical-abrasion',
      '건강보험 진료 디자인 확인':'insured-care'
    };
    if(careGalleryPages[label]){
      const slug=careGalleryPages[label];
      const expectedPath=slug+'.html';
      const published=response.status===200&&
        body.includes('class="care-gallery care-'+slug+'"')&&
        body.includes('/assets/care-gallery.css?v='+expectedCareGalleryHash)&&
        body.includes('class="care-gallery-bottom-actions"')&&
        body.includes('href="'+verifiedBookingUrl+'"')&&
        body.includes('href="tel:0325132875"')&&
        body.includes('href="/visit-guide.html"');
      add('갤러리 진료 디자인 5종 실배포 · '+expectedPath,
        published?'디자인·예약 경로 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · 환자 전화·정식 네이버예약·길찾기·최신 CSS 링크 '+
        (published?'원본과 일치':'미확인/불일치'));
    }
    if(label==='신규 창작 그림 전시 스타일'){
      const expectedCss=readFileSync(new URL('../assets/curatorial-home.css',import.meta.url),'utf8');
      const ready=response.status===200&&body===expectedCss&&
        body.includes('scroll-snap-type:x mandatory')&&
        body.includes('@media(max-width:600px)');
      add('미술관 창작 그림 전시 스타일 공개',ready?'실사이트 반영 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · 원본 CSS와 운영 홈페이지의 CSS '+(ready?'일치':'불일치 또는 미배포'));
    }
    if(label==='정식 도메인 첫 화면'){
      const linked=body.includes('/assets/gallery-upgrade.css?v='+expectedGalleryCssHash);
      add('2026-10-27 미술관형 첫 화면 CSS 링크 실제 배포',
        linked?'실사이트 반영 확인':'배포·캐시 확인 필요',
        '메인 HTML의 리디자인 CSS 해시 링크 '+(linked?'일치':'배포되지 않음/확인 필요'));
      const artTargets=[
        ['gallery-starry-clinic.svg','/gallery.html#art-starry'],
        ['quiet-window-cat-thumb.webp','/gallery.html#art-quiet-window-cat'],
        ['cubist-cat-clinic-thumb.webp','/gallery.html#art-cubist-cat-clinic']
      ];
      const firstSection=body.indexOf('class="hero wrap"');
      const paintingSection=body.indexOf('class="curated-threshold wrap"');
      const patientSearch=body.indexOf('class="symptom-navigator wrap"');
      const artReady=response.status===200&&firstSection>=0&&
        paintingSection>firstSection&&patientSearch>paintingSection&&
        body.includes('href="/assets/curatorial-home.css?v=20261029-gallery1"')&&
        (body.match(/class="curated-threshold__piece"/g)||[]).length===3&&
        artTargets.every(([img,href])=>body.includes(img)&&body.includes('href="'+href+'"'));
      add('홈페이지 창작 그림 세 점 첫 화면 아래 전시',artReady?'실사이트 반영 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · 원장 캐리커처 다음 그림 3점 · 모바일 가로 감상 · 갤러리 이동 '+
        (artReady?'공개 확인':'최신 배포 확인 필요'));
    }
    // Compare a few already-fetched public medical guides with genuinely
    // revised source content. This is read-only: a stale deployment is reported
    // explicitly, never confused with a Google indexing or ranking outcome.
    const latestMedicalCopy=new Map([
      ['잇몸 건강정보 탐색 경로',['같은 부위에서 계속 피가 나거나','치주낭 깊이']],
      ['신경치료 건강정보 탐색 경로',['통증이 시작된 시점','교합 조정']],
      ['보존 진료 연결 건강정보: 보존 원칙',['남아 있는 치질과 치근의 건전성','개별 검사 결과']]
    ]);
    if(latestMedicalCopy.has(label)){
      const needed=latestMedicalCopy.get(label);
      const current=response.ok&&needed.every(phrase=>body.includes(phrase))&&
        body.includes('class="health-clinician-signpost"');
      add('2026-10-26 핵심 환자교육 새 문단 · '+label,
        current?'실사이트 반영 확인':'추가 확인 필요',
        current?'원장 정보와 새 임상 설명을 공개 홈페이지 본문에서 확인':
          'GitHub 소스 수정과 운영 홈페이지 배포는 별개이므로 최신 본문·의료진 정보를 재확인');
    }

    if(response.ok&&[
      '잇몸치료 상세 페이지',
      '재신경치료 이미지 초기 표시',
      'remaining route clinical-archive'
    ].includes(label))topicCountPages.set(label,body);
    const info = ['HTTP ' + response.status, '최종 주소: ' + response.url];
    if(label==='care route implant'||label==='care route denture'){
      const id=label.endsWith('implant')?'implant':'denture';
      const pictureUrl=origin+'/assets/clinical-share/'+id+'.png';
      const alt=id==='implant'?
       '이조은치과 임플란트 상담 주제를 나타내는 도식형 삽화':
       '이조은치과 틀니 치료 주제를 나타내는 도식형 삽화';
      const fields=[
       ['property','og:image',pictureUrl],['property','og:image:type','image/png'],
       ['property','og:image:width','1200'],['property','og:image:height','630'],
       ['property','og:image:alt',alt],['name','twitter:image',pictureUrl]
      ];
      const tagsReady=response.status===200&&fields.every(([kind,key,value])=>
       body.includes('<meta '+kind+'="'+key+'" content="'+value+'">'));
      let actualPngReady=false,bytes=0;
      try{
       const img=await fetch(pictureUrl,{signal:AbortSignal.timeout(8000)});
       if(img.ok&&String(img.headers.get('content-type')||'').includes('image/png')){
        const buffer=Buffer.from(await img.arrayBuffer());
        bytes=buffer.length;
        actualPngReady=bytes>8000&&bytes<2000000&&
         buffer.subarray(0,8).toString('hex')==='89504e470d0a1a0a'&&
         buffer.readUInt32BE(16)===1200&&buffer.readUInt32BE(20)===630;
       }
      }catch{}
      info.push(tagsReady&&actualPngReady?
       '고유한 진료별 이미지 공유 태그 및 원본 PNG 실제 공개 확인 ('+bytes+'바이트)':
       '진료별 공유 이미지 태그 또는 PNG 실제 배포 확인 필요 (태그 '+tagsReady+', 이미지 '+actualPngReady+')');
    }
    // Inspect the actual publicly returned HTML for high-traffic sharing pages.
    // One existing branded first-party image is used as an honest, lightweight
    // fallback; no fabricated clinic photograph or new external dependency.
    if(['잇몸치료 상세 페이지','홈페이지 치과 이야기 전체 글','public route visit-guide'].includes(label)){
      const expectedImage=origin+'/assets/ejoeundental-hero-cat.webp';
      const imageFields=[
       ['property','og:image',expectedImage],
       ['property','og:image:type','image/webp'],
       ['property','og:image:width','650'],
       ['property','og:image:height','543'],
       ['property','og:image:alt','이조은치과의 하얀 고양이와 치과의사 일러스트'],
       ['name','twitter:image',expectedImage]
      ];
      const socialImageReady=response.status===200&&imageFields.every(([kind,key,value])=>
       body.includes('<meta '+kind+'="'+key+'" content="'+value+'">'));
      info.push(socialImageReady?
       '공식 그림 공유 미리보기 이미지·크기·대체설명 실사이트 반영':
       '공유 미리보기 이미지 메타정보 실사이트 최신 배포 확인 필요');
    }
    const server = response.headers.get('server');
    if (server) info.push('서버: ' + server);

    // Read-only AI citation readiness: verify the medically cautious answers
    // AND the treating dentist's linked credentials actually reached production.
    // A successful source build alone never proves a new public FAQ is deployed.
    const aiFaqCases={
      'remaining route gum-treatment-faq':{
        file:'gum-treatment-faq.html',
        question:'스케일링 후 치아 사이가 벌어진 것 같은데 치료가 잘못된 건가요?'
      },
      'remaining route root-canal-retreatment-faq':{
        file:'root-canal-retreatment-faq.html',
        question:'재신경치료 전에 치과 CT를 꼭 찍어야 하나요?'
      }
    };
    if(aiFaqCases[label]){
      const {file,question}=aiFaqCases[label];
      const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
      const fromMarkup=txt=>[...txt.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map(m=>{try{return JSON.parse(m[1])}catch{return null}})
        .find(obj=>obj?.['@type']==='FAQPage');
      const original=fromMarkup(source)?.mainEntity?.find(item=>item.name===question);
      const published=fromMarkup(body)?.mainEntity?.find(item=>item.name===question);
      const finalUrl=origin+'/'+file.replace(/\.html$/,'');
      const verified=response.status===200&&new URL(response.url).pathname===new URL(finalUrl).pathname&&
        body.includes('<link rel="canonical" href="'+finalUrl+'">')&&
        body.includes('<h2>'+question+'</h2>')&&
        Boolean(original?.acceptedAnswer?.text)&&
        published?.acceptedAnswer?.text===original.acceptedAnswer.text&&
        body.includes('<p>'+original.acceptedAnswer.text+'</p>')&&
        body.includes('class="faq-care-authority"')&&
        body.includes('고려대학교 의학박사(치과학 전공)')&&
        body.includes('href="/doctor.html"');
      add('AI 핵심 FAQ 실제 배포·의료진 출처 · '+file,
        verified?'최신 반영 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · 임상 답변·FAQ 구조화 데이터·원장 이력 링크 '+
        (verified?'서로 일치':'일부 불일치 또는 미배포'));
    }
    if(label==='remaining route root-canal-retreatment-faq'){
      const actualQuestionCount=(body.match(/<section class="card"><h2>/g)||[]).length;
      const answerCountReady=response.ok&&actualQuestionCount===10;
      info.push(answerCountReady?
       '재신경치료 FAQ 실제 질문 10개·내용 일치 확인':
       '재신경치료 FAQ 질문 수 또는 신규 배포 확인 필요 ('+actualQuestionCount+'개)');
      const rootTip='/stories/2026-10-25-incheon-retreatment-root-tip-dark-spot-no-pain/';
      const crown='/stories/2026-10-25-bupyeong-retreatment-crown-post-can-tooth-be-saved/';
      const linked=response.ok&&
       body.includes('href="'+rootTip+'"')&&
       body.includes('href="'+crown+'"')&&
       body.includes('뿌리 끝 검은 그림자의 변화와 재신경치료 후 추적검사')&&
       body.includes('크라운과 포스트가 있는 치아의 재신경치료 가능성');
      info.push(linked?
       '재신경치료 환자 FAQ에서 치근단 치유·크라운/포스트 관련 글로 직접 연결 실사이트 확인':
       '재신경치료 환자 FAQ의 자세한 원장 글 연결은 신규 배포 확인 필요');
    }
    // Newly added clinical bylines must reach the actual public host, not
    // merely pass source/build tests. Every expected page already has a normal
    // HTTP check above, so reuse the response and add no external requests.
    const doctorBylineRoutes=[
      '/implant.html','/denture.html','/cavity-treatment.html',
      '/scaling.html','/wisdom-tooth.html',
      '/pediatric-dentistry.html','/pediatric-orthodontics.html'
    ];
    if(doctorBylineRoutes.includes(new URL(url).pathname)){
      const expectedName=String(verifiedClinic.footer_representative||'').trim();
      const bylineCount=(body.match(/<aside class="clinician-byline" /g)||[]).length;
      const bylineReady=response.ok&&bylineCount===1&&
        body.includes('이조은치과 · '+expectedName+' 원장')&&
        body.includes('고려대학교 의학박사(치과학 전공) · 통합치의학과 전문의')&&
        body.includes('원장이 직접 검진·진단')&&
        body.includes('href="/#doctor"')&&
        /href="\/assets\/clinician-byline\.css(?:\?v=[a-f0-9]{12})?"/.test(body);
      info.push('의료진 실명·자격·원장 직접 진단 안내: '+
        (bylineReady?'정식 홈페이지 실제 반영 확인':'GitHub 최신 내용과 공개 홈페이지 배포 차이 확인 필요'));
      add('의료진 안내 실배포 · '+new URL(url).pathname,
        bylineReady?'최신 반영 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · 표시 '+bylineCount+'개 · '+expectedName+' 원장 / 치과학 전공 / 전문의 자격 / 진단 안내 비교');
    }

    if (label === 'Google 서치콘솔 소유권 HTML 파일') {
      const expected='google-site-verification: google4b5b71e2b560cac2.html';
      const textMatches=body.trim()===expected;
      const sameDomainPath=new URL(response.url).origin===origin;
      const published=response.status===200&&sameDomainPath&&textMatches;
      info.push(published?'Google 사용자별 소유권 확인 파일 본문 실배포 확인':
        'Google 소유권 파일 배포 확인 필요 — 제공된 확인 버튼을 누르기 전에 응답 본문 확인');
      add('Google 서치콘솔 소유권 파일 실배포',
        published?'최신 반영 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · 원본 요청과 동일 URL '+(response.url===url?'예':'아니요')+
        ' · 응답 본문 '+(textMatches?'Google 제공 값과 일치':'불일치'));
    }
    if (label === '연락처 저장 vCard 배포') {
      const valid=response.status===200&&body.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')&&
       body.includes('FN:이조은치과의원')&&
       body.includes('TEL;TYPE=WORK,VOICE:'+verifiedClinic.phone)&&
       body.includes('URL:'+origin+'/')&&body.includes('END:VCARD');
      info.push(valid?'환자용 연락처 저장 파일 배포 확인':'연락처 저장 파일 운영 사이트 배포 확인 필요');
    } else if (label === '자연치아 보존 진료 안내') {
      const hasCanonical=body.includes('<link rel="canonical" href="'+origin+'/tooth-preservation">')&&
        response.url===origin+'/tooth-preservation';
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
      // Compare the exact four owner-written patient-story links recently
      // featured on the actual home page. A successful GitHub build is NOT
      // evidence the custom domain was updated by its deployment provider.
      const featuredSlugs=[
        '2026-10-24-bupyeong-swollen-bleeding-gums-visit-dentist',
        '2026-10-26-cheongcheon-gum-color-change-red-gums-periodontal-care',
        '2026-10-24-bupyeong-severe-toothache-deep-caries-extraction-vs-root-canal',
        '2026-10-24-bupyeong-cavity-gi-insurance'
      ];
      const sourceHasFeatured=featuredSlugs.every(slug=>homepageSource.includes('href="/stories/'+slug+'/"'));
      const featureSection=body.match(/<section class="section light" id="home-representative-guides"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
      const liveFeatures=featuredSlugs.filter(slug=>featureSection.includes('href="/stories/'+slug+'/"'));
      const featureReady=response.ok&&sourceHasFeatured&&liveFeatures.length===featuredSlugs.length&&
        body.includes('id="home-representative-guides-title"')&&
        body.indexOf('id="home-representative-guides"')<body.indexOf('id="symptoms"');
      info.push('첫 화면 원장 환자 교육 글: '+(featureReady?'4편 신규 배치 실배포 확인':'실배포 대기/내용 불일치')+
        ' ('+liveFeatures.length+'/4)');
      add('홈 첫 화면 원장 글 4편 실제 배포',featureReady?'최신 반영 확인':'배포·캐시 확인 필요',
        '소스 4편 / 정식 도메인 '+liveFeatures.length+'편 · 잇몸 붓기·색깔 변화·발치 전 신경치료·GI 보험');

      // Identify HTTP/3 advertisement for real-device intermittent QUIC errors.
      // This request may use HTTP/1.1/2 and CANNOT validate QUIC itself.
      // Cloudflare zone HTTP/3 is changed only in the provider dashboard.
      const altSvc=String(response.headers.get('alt-svc')||'');
      const advertisesHttp3=/(?:^|[,\s])h3(?:-[0-9]+)?\s*=/.test(altSvc);
      info.push('HTTP/3(QUIC) 사용 안내 헤더: '+(advertisesHttp3
        ?'h3 광고 확인 — 모바일 ERR_QUIC_PROTOCOL_ERROR가 반복되면 Cloudflare Speed > Settings > Protocol Optimization에서 HTTP/3 임시 해제 후 비교'
        :altSvc?'현재 검사 연결의 Alt-Svc에 h3 미표기 (HTTP/3 활성화 여부 단정 불가)':
         '현재 검사 연결에 h3 안내 헤더 없음 (HTTP/3 사용 여부는 이 검사만으로 판단 불가)'));
      // Read the response already fetched, without extra network requests.
      // Missing headers are deployment signals, never claims of compromise.
      const securityKeys=['x-frame-options','x-content-type-options',
       'referrer-policy','permissions-policy'];
      // HTML permits both > and /> with or without whitespace. Compare the
      // verification token, not a particular formatting of the meta tag.
      const googleTag=/<meta\s+name="google-site-verification"\s+content="([^"]+)"\s*\/?>/i;
      const googleVerification=homepageSource.match(googleTag)?.[1]||'';
      const liveGoogleVerification=body.match(googleTag)?.[1]||'';
      const googleReady=Boolean(googleVerification)&&
       liveGoogleVerification===googleVerification;
      info.push(googleReady?'Google Search Console 소유권 확인용 메타 태그 실제 서버에 게시됨':
       'Google Search Console 소유권 확인 태그 배포 상태 점검 필요 (계정 인증 여부와 별개)');
      const clinicGraph=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
       .map(m=>{try{return JSON.parse(m[1])}catch{return null}})
       .find(d=>d?.['@type']==='Dentist');
      const treatingDoctor=clinicGraph?.employee;
      const doctorIdentityReady=Boolean(verifiedClinic.footer_representative)&&
       body.includes('class="doctor-visible-name"')&&
       body.includes('진료 담당 원장 '+verifiedClinic.footer_representative)&&
       treatingDoctor?.name===verifiedClinic.footer_representative&&
       treatingDoctor?.['@id']===origin+'/#doctor-person'&&
       treatingDoctor?.url===origin+'/doctor'&&
       treatingDoctor?.worksFor?.['@id']===origin+'/#clinic';
      info.push(doctorIdentityReady?
       'Google 의료진 실명·진료 담당 소개·의료기관 Person/Dentist 구조화 관계 최신 공개 확인':
       'Google 의료진 실명/진료기관 구조화 관계 최신 배포 확인 필요');
      const expectedHomeTitle=homepageSource.match(/<title>([^<]+)<\/title>/)?.[1]||'';
      const expectedHomeDescription=homepageSource.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      const clinicTitle=body.match(/<title>([^<]+)<\/title>/)?.[1]||'';
      const clinicDescription=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      const websiteGraph=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
       .map(m=>{try{return JSON.parse(m[1])}catch{return null}})
       .find(d=>d?.['@type']==='WebSite');
      const matchingNames=['이조은치과의원','이-조은치과의원'];
      const aliasesMatch=JSON.stringify(websiteGraph?.alternateName)===JSON.stringify(matchingNames)&&
       JSON.stringify(clinicGraph?.alternateName)===JSON.stringify(matchingNames)&&
       websiteGraph?.name==='이조은치과'&&clinicGraph?.name===websiteGraph.name&&
       websiteGraph?.publisher?.['@id']===clinicGraph?.['@id'];
      const naverDescriptionReady=clinicDescription===expectedHomeDescription&&
       clinicDescription.startsWith('인천 부평구 청천동 이조은치과.')&&
       clinicDescription.length>0&&clinicDescription.length<=80&&
       body.includes('<meta property="og:description" content="'+clinicDescription+'">')&&
       body.includes('<meta name="twitter:description" content="'+clinicDescription+'">');
      info.push(naverDescriptionReady?
       '네이버 홈페이지 80자 메타 설명·공유 설명 GitHub 수정본 실사이트 반영 확인':
       '네이버 홈페이지 메타 설명이 최신 GitHub 수정본과 다름 — 배포·캐시 재확인 필요');
      const brandedResultsReady=clinicTitle===expectedHomeTitle&&
       clinicTitle.startsWith('이조은치과 |')&&
       naverDescriptionReady&&
       body.includes('class="clinic-name-variant"')&&
       body.includes('병원정보 사이트 표기: <strong>이-조은치과의원</strong>')&&
       body.includes('<link rel="canonical" href="'+origin+'/">')&&
       clinicGraph?.legalName==='이-조은치과의원'&&aliasesMatch;
      info.push(brandedResultsReady?
       '공식 이조은치과 브랜드 우선 제목·외부 등록명 병기·주소·동일한 Google WebSite/Dentist 기관 정보 실제 공개 확인':
       '구글 이조은치과 공식 명칭·등록명 연결·검색 제목 최신 배포 확인 필요');
      const exactNaverPlace='https://map.naver.com/p/entry/place/13239400';
      const exactPlaceDeployed=clinicGraph?.hasMap===exactNaverPlace&&
       Array.isArray(clinicGraph?.sameAs)&&clinicGraph.sameAs.includes(exactNaverPlace)&&
       body.includes('href="'+exactNaverPlace+'"');
      info.push(exactPlaceDeployed?
       '네이버 플레이스 치과 상세주소·지도 버튼·의료기관 구조화 데이터 실제 배포 확인':
       '네이버 플레이스 상세주소 GitHub 수정본 실사이트 미반영 — 배포·캐시 점검 필요');
      const instagram='https://www.instagram.com/indifan2/';
      const instagramReady=Array.isArray(clinicGraph?.sameAs)&&
       clinicGraph.sameAs.includes(instagram)&&
       body.includes('href="'+instagram+'"')&&
       body.includes('이조은치과 인스타그램 보기');
      info.push(instagramReady?
       '스마트플레이스 등록 치과 인스타그램 링크·의료기관 관계 정보 실사이트 반영 확인':
       '이조은치과 인스타그램 관계 정보 실사이트 신규 배포 확인 필요');
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
      const doctorGallery=body.match(/<section class="section dark" id="doctor">([\s\S]*?)<\/section>/)?.[1]||'';
      const doctorCare=doctorGallery.match(/<nav class="doctor-care-trails"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
      const physicianGalleryLive=['gum-treatment','retreatment','tooth-preservation'].every(slug=>doctorCare.includes('href="/'+slug+'"')||doctorCare.includes('href="/'+slug+'.html"'))&&
        doctorGallery.includes('고려대학교 의학박사(치과학 전공)')&&
        doctorGallery.includes('통합치의학과 전문의');
      info.push('원장 소개 미술관 진료 3종 링크: '+(physicianGalleryLive?'실사이트 게시 확인':'신규 배포 확인 필요'));
      const galleryEditorialReady=heroMarkup.includes('class="hero-editorial-detail"')&&
        heroMarkup.includes('class="hero-editorial-choices"')&&
        heroMarkup.includes('class="hero-editorial-story"')&&
        heroMarkup.includes('class="hero-stories-shortcut"')&&
        heroMarkup.includes('class="hero-care-summary"')&&
        heroMarkup.includes('class="hero-actions"');
      info.push(galleryEditorialReady?
        '메인 편집형 미술관 레이아웃: 상단 원장·예약, 하단 진료·철학 두 칸 실배포 확인':
        '메인 편집형 미술관 레이아웃 신규 배포 확인 필요');

      const credentialAt=heroMarkup.indexOf('고려대학교 의학박사');
      const galleryAt=heroMarkup.indexOf('class="hero-gallery-window"');
      const previsit=body.match(/<aside class="symptom-previsit"[\s\S]*?<\/aside>/)?.[0]||'';
      const alert=previsit.slice(0,previsit.indexOf('<details'));
      const mobileEducationReady=alert.includes('약은 임의로 중단하지 말고')&&
        previsit.includes('<details class="symptom-previsit-checklist">')&&
        previsit.includes('<details class="symptom-previsit-more">');
      info.push('모바일 방문 준비 안내: '+
        (mobileEducationReady?'안전 문구는 보이고 두 안내 목록 접기·펼치기 실배포':
         '새 모바일 접이식 방문 안내 배포 확인 필요'));

      const introAt=heroMarkup.indexOf('id="intro"');
      const firstScreenGallery=credentialAt>=0&&galleryAt>credentialAt&&introAt>galleryAt;
      const ctaAt=heroMarkup.indexOf('class="hero-actions"');
      const localAt=heroMarkup.indexOf('class="hero-local-intro"');
      const patientFirst=credentialAt>=0&&ctaAt>credentialAt&&localAt>ctaAt&&
        galleryAt>localAt&&
        heroMarkup.indexOf('class="btn hero-call"')<
        heroMarkup.indexOf('class="btn hero-hours"');
      info.push('모바일 첫 화면 전화·진료시간 우선 배치: '+
        (patientFirst?'실사이트 HTML 반영 확인':'배포·캐시 확인 필요'));
      info.push('모바일 첫 화면 수련 그림: '+(firstScreenGallery?'자격 소개 다음·진료 설명 앞 배치 확인':'신규 모바일 수련 그림 미반영'));
      // The production build fingerprints the mobile SVG URL. Desktop WebP
      // preload uses fetchpriority=high; comparing a stale literal without
      // either property incorrectly reports healthy live deployment as stale.
      const mobileGardenPreload=/<link rel="preload" as="image" type="image\/svg\+xml" media="\(max-width: 600px\)" href="\/assets\/impressionist-water-garden\.svg\?v=[a-f0-9]{12}">/.test(body);
      const desktopHeroPreload=body.includes('<link rel="preload" as="image" type="image/webp" media="(min-width: 601px)" fetchpriority="high" href="/assets/ejoeundental-hero-cat.webp">');
      const phoneGardenFirst=heroMarkup.includes('loading="lazy" decoding="async"')&&
       !heroMarkup.includes('fetchpriority="high"')&&
       mobileGardenPreload&&desktopHeroPreload;
      info.push('모바일 수련 그림·데스크톱 이미지 로딩: '+(phoneGardenFirst?
       '모바일 SVG 프리로드와 데스크톱 WebP 우선 요청·그림 지연 로딩 HTML 확인':
       '모바일·데스크톱 그림 요청 설정 실제 배포 확인 필요'));
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
      const localSearchReady=localClinicTitle.startsWith('이조은치과 |')&&
        localClinicTitle.includes('부평치과')&&
        body.includes('id="intro">부평치과를 찾는 분께')&&
        pageDescription.includes('인천 부평구 청천동')&&
        body.includes('property="og:title" content="'+localClinicTitle+'"');
      info.push(localSearchReady?'부평치과 대표 검색 제목·원장 진료 소개 최신 반영':'부평치과 대표 검색어 홈페이지 신규 배포 확인 필요');
      const cheongcheonReady=localClinicTitle.includes('청천동치과')&&
       pageDescription.includes('청천동')&&
       heroMarkup.includes('class="hero-local-intro"')&&
       heroMarkup.includes('세월천로 34')&&
       heroMarkup.includes('href="/visit-guide.html"');
      info.push(cheongcheonReady?'청천동치과 검색 제목·실제 위치·방문 안내 최신 공개 확인':
       '청천동치과 첫 화면 지역 정보 실제 배포 확인 필요');
      const localFaq=body.match(/<section[^>]*id="faq"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
      const faqChoiceReady=localFaq.includes('부평치과를 알아볼 때 무엇부터 확인하면 좋을까요?')&&
        localFaq.includes('청천동 세월천로 34')&&
        localFaq.includes('href="/insured-care.html"')&&
        (localFaq.match(/<details(?: id="faq-[a-z-]+")?>/g)||[]).length===11;
      info.push(faqChoiceReady?'부평치과 선택 기준·원장 직접 진단 11문답 반영':'부평치과 선택 기준·FAQ 추가 배포 확인 필요');
      const visibleStories=body.match(/<section class="section light" id="stories">([\s\S]*?)<\/section>/)?.[1]||'';
      // Distinguish content committed to GitHub from content actually visible.
      const originalTopicJumps=body.match(/<nav class="owner-blog-topic-jumps"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
      const jumpTargets=['gum','root','ethics','other'];
      const topicJumpsReady=jumpTargets.every(topic=>
        originalTopicJumps.includes('href="/clinical-archive.html#archive-group-'+topic+'"'));
      info.push(topicJumpsReady?'원장 네이버 원문 주제별 4개 바로가기 실제 배포 확인':
        '원장 원문 주제별 바로가기 최신 배포 확인 필요');
      const gumPusShortcut=body.includes('class="symptom-navigator-more"')&&
        body.includes('href="/health/gum-pus.html"');
      info.push(gumPusShortcut?'첫 화면 잇몸 고름 증상 글 바로가기 실제 배포 확인':
        '잇몸 고름 증상 바로가기 최신 배포 확인 필요');
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
      const preservationIntro=body.split('<aside class="symptom-preservation-cta"')[1]?.split('</aside>')[0]||'';
      const homePreservationFound=preservationIntro.includes('치아를 뽑아야 한다는 말을 들으셨나요?')&&
       preservationIntro.includes('href="/tooth-preservation.html"');
      info.push(homePreservationFound
       ?'첫 화면 증상 찾기에서 발치 전 자연치아 보존 질문과 진료 링크 제공'
       :'발치 전 자연치아 안내 첫 화면 실제 배포 재확인 필요');
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
       bookingHtml.includes(ownerBooking.label)&&
       bookingHtml.includes('class="mobile-booking-visit"')&&
       bookingHtml.includes('href="/visit-guide.html"');
      info.push(bookingVisible
       ?(ownerBooking.direct?'모바일 하단 전화·네이버 예약·오시는 길 3개 버튼 반영':
          '모바일 하단 전화·네이버 예약 검색 안내 반영 (직접 예약 URL은 미등록)')
       :'모바일 하단 전화·예약·길찾기 3개 버튼 배포 확인 필요');
      const finish=body.match(/<nav class="home-finish-nav"[\s\S]*?<\/nav>/)?.[0]||'';
      const finishReady=finish.includes('href="'+publicBookingUrl+'"')&&
        finish.includes('href="/visit-guide.html"')&&
        finish.includes('href="#focus-care"')&&
        finish.includes('href="#main-content"')&&
        finish.includes('class="home-finish-booking"');
      info.push(finishReady?
        '홈페이지 마지막 환자 안내: 예약·오시는 길·중점 진료·처음으로 4개 링크 배포 확인':
        '홈페이지 하단 환자 안내 신규 디자인 배포·캐시 확인 필요');
      const heroBooking=body.match(/<div class="hero-actions"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';
      const heroBookingReady=ownerBooking.direct&&heroBooking.includes('class="btn hero-booking"')&&
        heroBooking.includes('href="'+publicBookingUrl+'"')&&heroBooking.includes(ownerBooking.label);
      info.push(heroBookingReady?'첫 화면 컴퓨터 네이버 예약 직접 연결 실배포 확인':
        '첫 화면 컴퓨터 예약 버튼 배포·링크 확인 필요');
      add('홈 데스크톱 네이버 예약 실제 배포',heroBookingReady?'최신 반영 확인':'배포·캐시 확인 필요',
        '홈페이지 진료 안내 예약 버튼 → '+ownerBooking.url);

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
      const searchbot = body.split(/^User-agent:\s*OAI-SearchBot\s*$/mi)[1]
        ?.split(/^User-agent:|^Sitemap:/mi)[0]||'';
      const publicAccess=response.status===200&&searchbot.includes('Allow: /')&&
        searchbot.includes('Disallow: /admin/')&&sitemapValue===origin+'/sitemap.xml';
      add('ChatGPT 검색봇 robots 실제 배포',
        publicAccess?'설정 확인':'배포·설정 확인 필요',
        '공개 페이지 허용, /admin/ 제외, 사이트맵 '+(publicAccess?'일치':'미확인'));
    } else if (label === 'AI 의료진 출처 페이지') {
      const livePath=new URL(response.url).pathname;
      const schemas=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map(m=>{try{return JSON.parse(m[1])}catch{return null}});
      const profile=schemas.find(j=>j?.['@type']==='ProfilePage');
      const published=response.status===200&&livePath==='/doctor'&&
        body.includes('<link rel="canonical" href="'+origin+'/doctor">')&&
        profile?.url===origin+'/doctor'&&
        profile?.mainEntity?.name===verifiedClinic.footer_representative&&
        profile?.mainEntity?.['@id']===origin+'/#doctor-person'&&
        profile?.publisher?.['@id']===origin+'/#clinic'&&
        body.includes('고려대학교 의학박사(치과학 전공)')&&
        body.includes('통합치의학과 전문의');
      add('AI 의료진 실명·자격·출처 실사이트 확인',
        published?'실사이트 반영 확인':'배포·캐시 확인 필요',
        'HTTP '+response.status+' · 공개 경로 '+livePath+' · ProfilePage 연결 '+(published?'일치':'미확인'));
    } else if (label === 'AI 검색봇 접근 모의 검사') {
      // User-Agent simulation does not verify OpenAI IP access, AI indexing
      // or whether an AI engine will cite/recommend this site.
      const simulated=response.status===200&&new URL(response.url).pathname==='/gum-treatment'&&
        !/noindex/i.test(String(response.headers.get('x-robots-tag')||''))&&
        body.includes('스케일링만으로 잇몸질환을 치료할 수 있을까요?')&&
        body.includes('href="/doctor.html"');
      add('AI 검색봇 User-Agent 모의 응답·환자 정보 확인',
        simulated?'본문·접속 확인':'접근·배포 확인 필요',
        'HTTP '+response.status+' · 치료 질문·의료진 링크 '+(simulated?'게시됨':'미확인')+
        ' · 모의 검사로 실제 AI 색인·인용 여부는 확인할 수 없음');
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
      // Compare real hosting to the editorial dates in the *source* sitemap.
      // Links and medical content changes may warrant a new lastmod, while
      // unrelated build runs must not silently invent a newer date.
      const editorialSitemap=readFileSync(new URL('../sitemap.xml',import.meta.url),'utf8');
      const revisedDate=slug=>{
        const entry=editorialSitemap.split('<loc>'+origin+'/'+slug+'.html</loc>')[1]?.split('</url>')[0]||'';
        return entry.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)?.[1]||null;
      };
      const dateDeployed=slug=>{
        const expected=revisedDate(slug);
        return Boolean(expected)&&body.includes('<loc>'+origin+'/'+slug+'</loc><lastmod>'+expected+'</lastmod>');
      };
      const checkGroup=(labelOk,labelBad,slugs)=>{
        const present=slugs.filter(dateDeployed).length;
        info.push(present===slugs.length?labelOk:labelBad+' ('+present+'/'+slugs.length+')');
      };
      checkGroup('Google 틀니 진료·보험 설명 3개 페이지의 실제 개정일 게시 확인',
       'Google 틀니 진료·보험 설명 사이트맵 수정일 배포 확인 필요',
       ['denture','insurance-health','health/insurance-denture']);
      info.push(dateDeployed('health/insurance-root-canal')?
       'Google 재신경치료·크라운 보험비용 건강정보 실제 수정일 사이트맵 반영 확인':
       '재신경치료·크라운 보험 설명 사이트맵 최신 배포 확인 필요');
      checkGroup('Google 치경부 GI 진료·보험 건강정보 3개 페이지 실제 수정일 확인',
       'Google 치경부 GI 보험 페이지 사이트맵 수정일 배포 확인 필요',
       ['cervical-abrasion','insurance-health','health/insurance-cervical']);
      checkGroup('Google 스케일링·건강보험 2개 페이지 실제 수정일 확인',
       '스케일링·보험 건강정보 사이트맵 수정일 배포 확인 필요',
       ['scaling','health/insurance-scaling']);
      checkGroup('Google 입냄새·잇몸출혈 관련 건강정보 3개 페이지 실제 수정일 확인',
       'Google 입냄새·잇몸출혈 건강정보 사이트맵 수정일 배포 확인 필요',
       ['health/gum-bleeding','gum-health','gum-treatment']);
      checkGroup('실제 수정된 건강정보 모음 3개·보험 FAQ의 10월 27일 사이트맵 수정일 확인',
       '건강정보 모음·보험 FAQ 사이트맵의 실제 편집 날짜 확인 필요',
       ['gum-health','insurance-health','additional-health','dental-insurance-faq']);
      const googleImageNamespace=body.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
      const imageLocs=[...body.matchAll(/<image:image><image:loc>([^<]+)<\/image:loc><\/image:image>/g)]
       .map(m=>m[1]);
      const indexedHeroImages=[
       origin+'/assets/ejoeundental-hero-cat.webp',
       origin+'/assets/impressionist-water-garden.svg'
      ];
      const indexedRootImages=Array.from({length:10},(_,i)=>
       origin+'/assets/retreatment/illustration-'+String(i+1).padStart(2,'0')+'.webp');
      const indexedTopicImages=['implant','denture'].map(kind=>
       origin+'/assets/clinical-share/'+kind+'.png');
      const correctTopicImage=kind=>{
       const block=body.split('<loc>'+origin+'/'+kind+'</loc>')[1]?.split('</url>')[0]||'';
       return block.includes('<image:image><image:loc>'+origin+
        '/assets/clinical-share/'+kind+'.png</image:loc></image:image>');
      };
      // Google Image sitemap entries may repeat the same image on two
      // relevant pages, such as the homepage and nine-picture gallery.
      // Compare with the generated production sitemap rather than an old
      // magic number that incorrectly flags 16/14 after every art release.
      const publishedImageXml=readFileSync(new URL('../dist/sitemap.xml',import.meta.url),'utf8');
      const expectedImageLocs=[...publishedImageXml.matchAll(
       /<image:image><image:loc>([^<]+)<\/image:loc><\/image:image>/g
      )].map(m=>m[1]);
      const galleryImageLocs=xml=>{
       const block=xml.split('<loc>'+origin+'/gallery</loc>')[1]?.split('</url>')[0]||
        xml.split('<loc>'+origin+'/gallery.html</loc>')[1]?.split('</url>')[0]||'';
       return [...block.matchAll(/<image:image><image:loc>([^<]+)<\/image:loc><\/image:image>/g)]
        .map(m=>m[1]);
      };
      const galleryNine=[
       'gallery-starry-clinic.svg','impressionist-water-garden.svg',
       'gallery-golden-garden.svg','ejoeundental-hero-cat.webp',
       'cubist-cat-clinic-thumb.webp','lakeside-flower-clinic-thumb.webp',
       'starry-night-clinic-thumb.webp','quiet-window-cat-thumb.webp','street-art-tooth-heart-thumb.webp'
      ].map(name=>origin+'/assets/'+name);
      const expectedGallery=galleryImageLocs(publishedImageXml);
      const liveGallery=galleryImageLocs(body);
      const galleryImageMapReady=expectedGallery.length===9&&
       liveGallery.length===9&&
       galleryNine.every(url=>expectedGallery.includes(url)&&liveGallery.includes(url));
      const imageMapReady=googleImageNamespace&&
       imageLocs.length===expectedImageLocs.length&&
       expectedImageLocs.every((url,i)=>imageLocs[i]===url)&&
       galleryImageMapReady&&
       [...indexedHeroImages,...indexedRootImages,...indexedTopicImages].every(url=>imageLocs.includes(url))&&
       ['implant','denture'].every(kind=>dateDeployed(kind)&&correctTopicImage(kind))&&
       dateDeployed('retreatment');
      info.push(imageMapReady?
       'Google 이미지 사이트맵: 의료 설명 삽화·신경치료 10개·창작 갤러리 9점 실제 공개 확인 ('+imageLocs.length+'개 항목)':
       'Google 이미지 사이트맵 확인 필요 (실제 '+imageLocs.length+'/'+expectedImageLocs.length+'개 · 갤러리 '+liveGallery.length+'/9)');
      info.push(dateDeployed('health/root-canal-retreatment-process')?
       'Google 재신경치료 과정 건강정보의 실제 수정일 게시 확인':
       'Google 재신경치료 과정 건강정보 최근 수정일 최신 배포 확인 필요');
      checkGroup('Google 잇몸·신경치료 건강정보 3개 페이지 실제 개정일 게시 확인',
       'Google 사이트맵 건강정보 내용 수정일 배포 확인 필요',
       ['gum-health','root-canal-health','health/gum-pus']);
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
    } else if (label.startsWith('수정 글 SEO 메타정보: ')) {
      const slug=label.slice('수정 글 SEO 메타정보: '.length);
      const source=expectedEditorialRevisions.get(slug);
      const canonical=origin+'/stories/'+encodeURIComponent(slug)+'/';
      const schemas=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
       .map(m=>{try{return JSON.parse(m[1])}catch{return null}});
      const posting=schemas.find(data=>data?.['@type']==='BlogPosting');
      const correct=response.status===200&&source&&
       body.includes('<link rel="canonical" href="'+canonical+'">')&&
       body.includes('<meta property="og:url" content="'+canonical+'">')&&
       body.includes('<meta property="article:published_time" content="'+source.date+'">')&&
       body.includes('<meta property="article:modified_time" content="'+source.updated+'">')&&
       posting?.datePublished===source.date&&
       posting?.dateModified===source.updated&&
       posting?.headline===source.title&&
       (!revisionTextMarkers.has(slug)||body.includes(revisionTextMarkers.get(slug)));
      info.push(correct?'수정된 원장 글의 작성·수정 날짜, 핵심 본문, OG 및 구조화 데이터 실서버 일치':
       '수정 글의 본문 또는 SEO 메타정보가 최신 GitHub 원고와 일치하지 않음');
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
      const postSchema=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
       .map(m=>{try{return JSON.parse(m[1])}catch{return null}})
       .find(d=>d?.['@type']==='BlogPosting');
      const doctorConnected=postSchema?.author?.['@id']===origin+'/#doctor-person'&&
       postSchema?.author?.name===verifiedClinic.footer_representative&&
       postSchema?.author?.worksFor?.['@id']===origin+'/#clinic'&&
       postSchema?.publisher?.['@id']===origin+'/#clinic';
      info.push(doctorConnected?'Google 원장 치과 이야기 작성자·치과 기관 연결 최신 배포 확인':
       '치과 이야기 Google 작성자/기관 구조화 관계 최신 배포 확인 필요');
      if(expected)info.push('소스 원고: '+expected.title);
    } else if (label === '재신경치료 치유 경과 관찰 글 수정 확인') {
      // Updating a CMS article must reach real patients, not just the build output.
      // The article's medically accurate revision date is checked against its
      // actual live BlogPosting metadata as well as the new clinical explanation.
      const expectedDoc=JSON.parse(readFileSync(
       new URL('../content/posts/2026-10-25-incheon-retreatment-root-tip-dark-spot-no-pain.json',import.meta.url),
       'utf8'));
      const schema=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
       .map(m=>{try{return JSON.parse(m[1])}catch{return null}})
       .find(d=>d?.['@type']==='BlogPosting');
      const contentReady=response.status===200&&
       schema?.datePublished===expectedDoc.date&&
       schema?.dateModified===expectedDoc.updated&&
       body.includes('재신경치료 후 엑스레이의 검은 그림자는 언제 없어질까요?')&&
       body.includes('검은 부위가 점차 작아지고')&&
       body.includes('유럽근관치료학회');
      info.push(contentReady?
       '재신경치료 엑스레이 치유 경과 글·실제 수정일·의학 근거 최신 배포 확인':
       '재신경치료 경과 관찰 글의 최근 수정본 실사이트 게시 확인 필요');
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
       body.includes('자료 제공: 이조은치과 원장 <a href="/doctor.html"')&&
       body.includes(String(verifiedClinic.footer_representative)+' · 의료진 소개</a>');
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
      // Compare the current accessible three-action navigation, not the
      // retired two-button label. Otherwise a correctly deployed story is
      // reported as missing its patient contact strip.
      const mobileActions=body.match(/<nav class="story-mobile-actions" aria-label="전화 문의·네이버 예약·오시는 길">([\s\S]*?)<\/nav>/)?.[1]||'';
      const livePatientActions=response.status===200&&
        body.includes('<body class="owner-story-page">')&&
        mobileActions.includes('class="story-mobile-call" href="tel:0325132875"')&&
        mobileActions.includes('class="story-mobile-booking" href="'+verifiedBookingUrl.replace(/&/g,'&amp;')+'"')&&
        mobileActions.includes('class="story-mobile-location" href="/visit-guide.html"')&&
        mobileActions.includes('aria-label="이조은치과 진료시간·주소·주차 안내"')&&
        body.includes('/assets/story-article.css?v=');
      info.push(livePatientActions?'모바일 전화·네이버 예약·오시는 길 3개 버튼 실제 공개 확인':
       '모바일 전화·네이버 예약·오시는 길 3개 버튼 최신 배포 확인 필요');
    } else if (label === '잇몸 건강정보 탐색 경로' || label === '신경치료 건강정보 탐색 경로' || label === '자연치아 건강정보 진료 연결') {
      const correctHub = label.includes('잇몸') ? '/gum-health.html' : label.includes('신경치료') ? '/root-canal-health.html' : '/additional-health.html';
      // Cloudflare publishes /gum-health while source anchors can use /gum-health.html.
      const correctHubPublished=correctHub.slice(0,-5);
      const hasVisible=body.includes('<nav class="crumb health-breadcrumb" aria-label="현재 위치">') &&
        [correctHub,correctHubPublished].some(route=>body.includes('href="'+route+'"'));
      const hasBreadcrumbSchema=body.includes('"@type":"BreadcrumbList"') &&
        [correctHub,correctHubPublished].some(route=>body.includes('"'+origin+route+'"'));
      const hasCanonical = body.includes('<link rel="canonical" href="' + response.url + '">');
      // A provider credit is not a fabricated individual author or a claim of
      // successful Search Console verification. Match live copy to JSON-LD.
      const medicalPage=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
       .map(match=>{try{return JSON.parse(match[1])}catch{return null}})
       .find(entry=>entry?.['@type']==='MedicalWebPage'||entry?.['@type']==='WebPage');
      const clinicAttribution=body.includes('class="health-info-source"')&&
       body.includes('건강정보 제공: 이조은치과의원')&&
       body.includes('진료 담당: 김태훈 원장')&&
       body.includes('고려대학교 의학박사(치과학 전공)')&&
       body.includes('href="/doctor.html"')&&
       medicalPage?.author?.name==='이조은치과'&&
       medicalPage.author.url===origin+'/'&&
       medicalPage.url===response.url;
      if(label==='잇몸 건강정보 탐색 경로'){
       const meta=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
       const breathReady=meta.includes('입냄새도 걱정된다면')&&
        body.includes('id="section-8"')&&
        body.includes('입냄새만으로 치주염이라고 진단할 수는 없습니다')&&
        body.includes('href="#section-8"')&&
        medicalPage?.description===meta;
       info.push(breathReady?
        'Google 잇몸 출혈·구취 감별 진료정보와 정확한 의료기관 구조화 설명 실제 공개 확인':
        '구취·잇몸출혈 Google 건강정보 검색 설명 최신 배포 확인 필요');
      }
      info.push(clinicAttribution?
       'Google 건강정보 제공 주체·원장 자격 소개·구조화 작성기관 실제 배포 일치':
       'Google 건강정보 제공 기관과 의료진 소개 신규 배포 확인 필요');

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
      if(slug==='visit-guide'){
        const booking=bookingAction(verifiedClinic.naver_booking_url);
        const nav=body.match(/<nav class="visit-quick-actions"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
        const direct=booking.direct&&response.ok&&
          nav.includes('class="quick-route visit-booking"')&&
          nav.includes('href="'+booking.url.replaceAll('&','&amp;')+'"')&&
          nav.includes(booking.label);
        info.push(direct?'오시는 길 네이버 예약 버튼 정식 주소 실배포 확인':
          '오시는 길 예약 버튼 배포·링크 확인 필요');
        add('오시는 길 네이버 예약 실제 배포',direct?'최신 반영 확인':'배포·캐시 확인 필요',
          '방문 안내 내 버튼 → '+booking.url);
      }

      const canonical=body.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]||'';
      const finalUrl=origin+'/'+slug;
      const resultSuffix=response.url===finalUrl?'확장자 없는 최종 주소':'최종 주소 확인 필요';
      info.push(resultSuffix);
      info.push(canonical===response.url?'canonical 이미 일치':'canonical 수정 필요 ('+canonical+')');
      if(slug==='root-canal-health'){
        const pageTitle=body.match(/<title>([^<]+)<\/title>/)?.[1]||'';
        const pageDescription=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
        // Grouped '인천·부평 신경치료' is natural Korean. Avoid
        // demanding duplicated exact keywords in an accurate description.
        const regionsInTitle=['인천 신경치료','부평 신경치료']
         .every(term=>pageTitle.includes(term));
        const regionsInDescription=pageDescription.includes('인천·부평 신경치료')&&
         pageDescription.includes('청천동')&&pageDescription.includes('근관치료');
        const regionReady=regionsInTitle&&regionsInDescription&&
          body.includes('신경치료와 재신경치료는 어떻게 다를까요?');
        info.push(regionReady?'인천·부평 신경치료 검색 정보·일반/재치료 구분 반영':'신경치료 지역 검색 문구 배포 확인 필요');
        info.push(body.includes('재치료의 가능성·한계와 질문 10가지 →')?
         '재신경치료 FAQ 실제 10개 질문과 건강정보 안내 문구 일치':
         '재신경치료 FAQ 질문 안내 숫자 최신 배포 확인 필요');
        const coverageReady=body.includes('id="root-canal-insurance"')&&body.includes('href="/health/insurance-root-canal.html"');
        info.push(coverageReady?'신경치료 보험 안내·최종 수복 구분·연결 반영':'신경치료 보험 안내 신규 배포 확인 필요');
        const crossCare=body.includes('href="/gum-treatment.html#gum-or-root-symptoms"')&&
         body.includes('href="/health/gum-pus.html"');
        info.push(crossCare?'신경치료·잇몸치료 원인 감별 안내 교차 링크 실제 배포 확인':
          '신경치료에서 잇몸 고름 감별 안내 연결 최신 배포 확인 필요');
      }
      const hubs={'gum-health':'/gum-treatment.html','root-canal-health':'/retreatment.html',
        'insurance-health':'/insured-care.html','additional-health':'/cervical-abrasion.html'};
      if(hubs[slug]){
        const visible=body.includes('<nav class="hub-top-trail" aria-label="현재 건강정보와 관련 진료">') &&
          body.includes('href="'+hubs[slug]+'"') && body.includes('aria-current="page"');
        info.push(visible?'건강정보 위치·진료 바로가기 반영':'건강정보 이동 경로 확인 필요');
        const editorial = body.includes('class="hub-editorial-note"') && body.includes('href="/doctor.html"') && body.includes('이 페이지는 일반적인 건강정보');
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
      // Inspect the exact script URL from the live search page, not only the
      // unversioned /assets/search.js endpoint which CDNs may cache differently.
      const scriptRef=body.match(/<script defer src="(\/assets\/search\.js\?v=[a-f0-9]{12})"><\/script>/)?.[1]||'';
      if(response.ok&&scriptRef)deployedSearchScript=scriptRef;
      const stylesheetRef=body.match(/href="(\/assets\/search-page\.css\?v=[a-f0-9]{12})"/)?.[1]||'';
      if(response.ok&&stylesheetRef)deployedSearchCss=stylesheetRef;
      info.push(scriptRef?'검색 페이지가 내용 해시로 버전 지정한 검색 JS를 사용':'검색 JS 버전 지정 누락');
      const form = body.indexOf('<form class="search-form"');
      const results = body.indexOf('<section id="results"');
      const suggestions = body.indexOf('<p class="search-suggestions"');
      const good = form >= 0 && results > form && suggestions > results;
      info.push(good ? '입력·결과가 추천 검색어보다 먼저 표시됨' : '입력·결과 배치 확인 필요');
      info.push(body.includes('class="search-visit-examples"') ? '산곡역·진료시간·주차 빠른 검색 반영' : '방문 정보 검색 바로가기 반영 확인 필요');
      const naturalToothSearch=body.includes('aria-label="발치 전 자연치아 보존 질문"')&&
       body.includes('href="/tooth-preservation.html"');
      info.push(naturalToothSearch?'발치 전 치아 보존 환자말 검색 예시·진료 연결 반영':
       '발치 전 환자 질문 검색 예시 최신 공개 확인 필요');
      const countCurrent=body.includes('네이버 블로그 원문 '+expectedOriginalCount+'편은')&&
       !body.includes('BUILD_NAVER_BLOG_COUNT')&&
       !body.includes('네이버 블로그 원문 323편은');
      info.push(countCurrent?'검색 페이지 블로그 원문 실제 '+expectedOriginalCount+'편 안내 확인':
       '검색 페이지 네이버 원문 수가 최신 홈페이지 수량과 다름');
      const booking=bookingAction(verifiedClinic.naver_booking_url);
      const escapeAttribute=value=>String(value).replace(/[&<>"']/g,ch=>({
       '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
      }[ch]));
      const searchBookingReady=body.includes('data-booking-url="'+escapeAttribute(booking.url)+'"')&&
       body.includes('data-booking-label="'+escapeAttribute(booking.label)+'"');
      info.push(searchBookingReady?
       (booking.direct?'홈페이지 예약 검색의 공식 네이버 예약 주소·이름이 현재 설정과 일치':
       '홈페이지 예약 검색의 네이버 예약 찾기 주소·이름이 정직한 검색 안내와 일치'):
       '예약 검색 연결이 현재 홈페이지 설정과 일치하는지 확인 필요');
      const hoursShortcuts=['금요일 진료','토요일 진료','접수 마감'];
      const shortcutsReady=hoursShortcuts.every(query=>
       body.includes('href="/search.html?q='+encodeURIComponent(query)+'"'));
      info.push(shortcutsReady?
       '금·토요일 격주 진료와 접수 마감 3개 환자 검색 바로가기 실제 공개 확인':
       '금·토요일·접수 마감 검색 바로가기 최신 배포 확인 필요');
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
      const processAlts=[
       '기존 근관 충전재를 제거하는 재신경치료 첫 번째 단계 설명 그림',
       '치아 근관 내부를 다시 탐색하고 세척·소독하는 재신경치료 과정 그림',
       '근관 상태를 확인하고 충전할 수 있도록 형태를 정리하는 재신경치료 그림',
       '근관을 새로 충전해 밀폐하고 최종 치아 수복을 계획하는 재신경치료 그림'
      ];
      const informative=processAlts.every(alt=>body.includes('alt="'+alt+'"'))&&
       body.includes('<h2 id="retreatment-procedure">재신경치료는 어떻게 진행될까요?</h2>');
      info.push(informative?
       'Google 재신경치료 4단계 삽화 설명·시각자료 앵커 실제 공개 확인':
       '재신경치료 4단계 삽화의 상세 대체 텍스트 최신 배포 확인 필요');
      const diagram=origin+'/assets/retreatment/illustration-01.webp';
      const imageSchema=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
       .map(m=>{try{return JSON.parse(m[1])}catch{return null}})
       .find(item=>item?.['@type']==='MedicalWebPage');
      const diagramReady=body.includes('<meta property="og:image" content="'+diagram+'">')&&
       body.includes('<meta property="og:image:alt" content="흰 고양이 치과의사와 치근단 염증을 설명하는 치아 단면 그림">')&&
       imageSchema?.primaryImageOfPage?.url===diagram&&
       imageSchema?.url===response.url;
      info.push(diagramReady?
       'Google 재신경치료 대표 삽화와 의료 페이지 구조화 데이터 실제 공개 확인':
       'Google 재신경치료 대표 삽화 메타데이터 최신 배포 확인 필요');
      info.push(body.includes('<strong>고려대학교 의학박사(치과학 전공) · 통합치의학과 전문의</strong>')?
       '재신경치료 페이지 원장 자격·전공 정확히 표시':'재신경치료 페이지 원장 전공 표기 확인 필요');
    } else if (label === '재신경치료 과정 글·삽화 바로가기') {
      const linked=body.includes('href="/retreatment.html#retreatment-procedure"')&&
       body.includes('그림으로 보는 재신경치료 4단계')&&
       body.includes('단계와 방문 횟수는 실제 치아 상태에 따라 달라집니다');
      info.push(linked?'Google 환자 교육 글에서 정확한 재신경치료 4단계 그림으로 실제 이동 가능':
       '재신경치료 과정 교육 글의 시각자료 직접 연결 최신 배포 확인 필요');
    } else if (label === '잇몸치료 상세 페이지') {
      info.push('치료정보: ' + (body.includes('잇몸치료')?'있음':'미확인'));
      info.push(body.includes('<strong>고려대학교 의학박사(치과학 전공) · 통합치의학과 전문의</strong>')?
       '잇몸치료 페이지 원장 자격·전공 정확히 표시':'잇몸치료 페이지 원장 전공 표기 확인 필요');
      const canonicalValue = body.split('rel="canonical" href="')[1]?.split('"')[0] || '(없음)';
      info.push('실제 최종 주소와 canonical: ' + (canonicalValue === response.url ? '일치' : '불일치') + ' (' + canonicalValue + ')');
      const gumTitle=body.match(/<title>([^<]+)<\/title>/)?.[1]||'';
      const gumDescription=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      const bothAreas=['인천 잇몸치료','부평 잇몸치료'];
      // A concise, factual description need not repeat the exact title keywords:
      // verify regional intent, the actual Cheongcheon-dong address and direct care.
      const present=bothAreas.every(term=>gumTitle.includes(term))&&
        gumDescription.includes('인천 부평구 청천동')&&
        gumDescription.includes('원장이 직접')&&
        gumDescription.includes('잇몸치료')&&
        body.includes('인천·부평 잇몸치료,')&&body.includes('세월천로 34');
      info.push(present?'인천·부평 잇몸치료 검색 제목·실제 지역·진료 설명 반영':'잇몸치료 제목·지역·원장 직접진료 설명 실제 공개 재확인 필요');
      const differentialReady=body.includes('id="gum-or-root-symptoms"')&&
       body.includes('치주조직의 감염뿐 아니라 치아 안쪽 치수')&&
       body.includes('href="/health/gum-pus.html"')&&
       body.includes('href="/root-canal-health.html#root-canal-articles"');
      info.push(differentialReady?'잇몸 고름의 치주·근관 원인 구분과 건강정보 교차 링크 실제 배포 확인':
        '잇몸 고름 치주·근관 원인 구분 정보 최신 배포 확인 필요');
      info.push(body.includes('입냄새나 고름이 반복되면 구강·치주 상태를 검사해 원인을 구분합니다')?
       '치주치료 소개에 입냄새만으로 잇몸병을 단정하지 않는 환자 안내 최신 게시':
       '잇몸치료 증상 안내의 입냄새 감별 문장 최신 배포 확인 필요');
    }
    if(label === '자연치아 건강정보 진료 연결' ||
       label.startsWith('보존 진료 연결 건강정보: ')){
      const linked=body.includes('href="/tooth-preservation.html"');
      info.push(linked?'기존 환자 교육 글에서 발치 전 자연치아 보존 진료로 실제 연결':
       '기존 환자 교육 글의 자연치아 보존 연결 최신 배포 확인 필요');
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
      if(!gum){
       info.push(body.includes('신경치료한 치아 주변에 뾰루지나 물집 같은 돌기가 반복된다면')&&
        body.includes('href="/health/gum-pus.html"')?
        'Google 신경치료 후 잇몸뾰루지 원인 감별 글 실제 연결 확인':
        '신경치료 후 잇몸뾰루지 안내 신규 배포 확인 필요');
      }
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
        info.push(body.includes('양치해도 입냄새가 나고 잇몸에서 피도 나나요?')&&
         body.includes('href="/health/gum-bleeding.html#section-8"')?
         'Google 구취·잇몸출혈 증상 모음에서 실제 감별 설명으로 안내 최신 공개 확인':
         '구취·잇몸출혈 건강정보 바로가기 최신 배포 확인 필요');
        info.push(body.includes('뾰루지·물집처럼 보이는 돌기가 생기거나 고름이 나오는 경우')&&
          body.includes('뾰루지가 모두 치주염은 아니며')?
          'Google 환자말 잇몸 뾰루지·고름 증상 안내와 직접 건강정보 링크 실제 배포 확인':
          '잇몸뾰루지 환자 검색 연결 최신 배포 확인 필요');
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
    if(label==='public route insurance-health'){
      info.push(body.includes('href="/health/insurance-denture.html#section-7"')&&
       body.includes('href="/health/insurance-denture.html#section-8"')?
       '보험 정보 모음에서 틀니 조정·수리·재제작과 타 치과 틀니 상담 실제 연결':
       '보험 정보 모음의 틀니 조정·보험 안내 최신 배포 확인 필요');
      info.push(body.includes('href="/health/insurance-root-canal.html#section-7"')&&
       body.includes('href="/health/insurance-root-canal.html#section-8"')?
       '보험 건강정보에서 기존 크라운·재신경치료 비용 구분 안내 실제 연결':
       '기존 크라운 재치료 보험 모음 연결 최신 배포 확인 필요');
      info.push(body.includes('href="/health/insurance-cervical.html#section-7"')&&
       body.includes('href="/health/insurance-cervical.html#section-8"')?
       '보험 건강정보 모음에서 GI 재수복·레진 보험 질문으로 실제 이동 가능':
       'GI 재수복 보험 안내 허브 연결 최신 배포 확인 필요');
    }
    if(label==='Google 치경부마모증 GI 진료'){
      info.push(body.includes('href="/health/insurance-cervical.html#section-7"')&&
       body.includes('href="/health/insurance-cervical.html#section-8"')?
       'Google 치경부마모증 진료 페이지에서 GI 재수복·레진 보험 설명 실제 연결':
       '치경부마모증 진료 페이지의 GI 보험 안내 최신 배포 확인 필요');
    }
    if(label==='Google GI 수복 보험·재수복 건강정보'){
      const snippet=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      const schema=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
       .map(m=>{try{return JSON.parse(m[1])}catch{return null}})
       .find(d=>d?.['@type']==='MedicalWebPage');
      const consistent=snippet.includes('인천 부평구 청천동 이조은치과')&&
       snippet.includes('수복물이 떨어졌을 때')&&
       body.includes('id="section-7"')&&body.includes('id="section-8"')&&
       body.includes('무조건 무료 재치료나 보험 적용을 약속할 수는 없습니다')&&
       body.includes('재료 이름만으로 구분하는 것은 정확하지 않습니다')&&
       schema?.description===snippet&&schema?.url===response.url;
      info.push(consistent?
       'Google GI·레진 보험·수복물 탈락 건강정보와 일치하는 구조화 데이터 실제 공개 확인':
       'GI 수복물 탈락·재료별 보험 정보 최신 배포 확인 필요');
    }
    if(label==='care route scaling'){
      const direct=body.includes('href="/health/insurance-scaling.html#section-4"')&&
       body.includes('올해 스케일링을 이미 받은 경우의 보험 기준')&&
       body.includes('올해 다른 치과에서 스케일링을 받으셨나요?');
      info.push(direct?
       '스케일링 진료 페이지에서 기존 보험 이용 환자에게 필요한 설명 실제 연결':
       '스케일링 진료의 반복 보험 적용 도움말 신규 배포 확인 필요');
    }
    if(label==='care route denture'){
      info.push(body.includes('href="/health/insurance-denture.html#section-7"')&&
       body.includes('href="/health/insurance-denture.html#section-8"')?
       '틀니 진료 안내에서 실제 조정·재제작 보험과 타 치과 틀니 건강정보 직접 연결':
       '틀니 진료의 실질적인 보험 안내 링크 최신 배포 확인 필요');
    }
    if(label==='Google 틀니 조정·개상·재제작 보험 건강정보'){
      const snippet=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      const medical=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
       .map(m=>{try{return JSON.parse(m[1])}catch{return null}})
       .find(d=>d?.['@type']==='MedicalWebPage');
      const accurate=snippet.includes('인천 부평구 청천동 이조은치과')&&
       snippet.includes('조정·수리·개상')&&
       body.includes('id="section-7"')&&body.includes('id="section-8"')&&
       body.includes('모든 틀니를 반드시 수리할 수 있는 것은 아닙니다')&&
       body.includes('실제 급여 대상과 본인부담금은 진찰 후 안내합니다')&&
       medical?.description===snippet&&medical?.url===response.url;
      info.push(accurate?
       'Google 틀니 보험·조정·타 병원 제작 틀니 의료정보와 구조화 데이터 실제 공개 확인':
       'Google 틀니 조정·재제작 환자교육의 최신 공개 확인 필요');
    }
    if(label==='Google 재신경치료 건강보험·크라운 비용 안내'){
      const snippet=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      const medical=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
       .map(m=>{try{return JSON.parse(m[1])}catch{return null}})
       .find(d=>d?.['@type']==='MedicalWebPage');
      const sound=snippet.includes('인천 부평구 청천동 이조은치과')&&
       snippet.includes('기존 크라운')&&
       body.includes('id="section-7"')&&body.includes('id="section-8"')&&
       body.includes('모든 재신경치료에 크라운 교체가 필요한 것도 아니고')&&
       body.includes('전체 치료비가 자동으로 건강보험 적용되는 것도 아닙니다')&&
       medical?.description===snippet&&medical?.url===response.url;
      info.push(sound?
       'Google 재신경치료·기존 크라운·보철 비용 감별 설명과 의료정보 구조화 데이터 실제 공개 확인':
       '재신경치료·크라운 비용 건강정보 최신 배포 확인 필요');
    }
    if(label==='재신경치료 이미지 초기 표시'){
      info.push(body.includes('href="/health/insurance-root-canal.html#section-7"')&&
       body.includes('href="/health/insurance-root-canal.html#section-8"')?
       '재신경치료 질문에서 크라운·비용 건강정보로 이동하는 실제 FAQ 공개 확인':
       '재신경치료 크라운·보험 문의 FAQ 최신 배포 확인 필요');
    }
    if(label==='Google 스케일링 건강보험 재방문 안내'){
      const snippet=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      const schema=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
       .map(m=>{try{return JSON.parse(m[1])}catch{return null}})
       .find(x=>x?.['@type']==='MedicalWebPage');
      const good=snippet.includes('다른 치과')&&snippet.includes('인천 부평구 청천동')&&
       body.includes('이미 스케일링을 받았다고 해서 필요한 잇몸 검진이나 치주치료까지 모두 불가능한 것은 아닙니다')&&
       body.includes('스케일링을 반복한다고 항상 보험이 적용되는 것도 아닙니다')&&
       body.includes('href="/health/periodontal-insurance.html"')&&
       schema?.description===snippet&&schema?.url===response.url;
      info.push(good?
       'Google 스케일링 건강보험 검색설명·재시술 주의점·의료기관 구조화 내용 실제 공개 확인':
       'Google 스케일링 반복 보험 적용 건강정보 최신 배포 확인 필요');
    }
    if(label==='Google 검색 잇몸 뾰루지·고름 건강정보'){
      const meta=body.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
      const schema=[...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
       .map(m=>{try{return JSON.parse(m[1])}catch{return null}})
       .find(entry=>entry?.['@type']==='MedicalWebPage');
      const good=meta.includes('뾰루지·물집처럼 보이는 돌기')&&
       meta.includes('부평구 청천동 이조은치과')&&
       schema?.description===meta&&schema?.url===response.url;
      info.push(good?'Google 잇몸뾰루지 검색 설명·치과 위치·구조화 데이터 실제 게시 확인':
       'Google 잇몸뾰루지 의료정보 검색 설명 최신 배포 확인 필요');
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
      const archiveHash=body.match(/src="\/assets\/archive-topics\.js\?v=([a-f0-9]{12})"/)?.[1];
      info.push(archiveHash===expectedArchiveScriptHash
        ?'원장 글 검색 JS 주소가 현재 소스의 정확한 내용 해시와 일치'
        :archiveHash?'원장 글 검색 JS 버전 불일치 (실사이트 '+archiveHash+
           ' / 소스 '+expectedArchiveScriptHash+') — 새 배포 또는 캐시 확인 필요'
          :'원장 글 제목 검색·주제 자동 펼침 스크립트 연결 확인 필요');
      const dentistChoiceReady=body.includes('id="archive-choosing-dentist"')&&
        body.includes('부평치과를 선택할 때 확인하면 좋은 다섯 가지')&&
        body.includes('href="#archive-group-ethics"')&&
        body.includes('href="/insured-care.html"');
      info.push(dentistChoiceReady?'부평치과 선택 체크리스트 5가지·원장 글 연결 반영':'부평치과 선택 체크리스트 신규 배포 확인 필요');
    }
    if(label==='원장 블로그 검색 자바스크립트 실제 배포 비교'){
      const liveHash=createHash('sha256').update(body).digest('hex').slice(0,12);
      info.push(response.status===200 && liveHash===expectedArchiveScriptHash
       ?'원장 블로그 검색 프로그램 소스와 실제 운영 서버의 JS 내용 해시 일치: '+liveHash
       :'현재 소스와 운영 서버의 JS 내용 불일치 (서버 '+liveHash+
         ' / 소스 '+expectedArchiveScriptHash+') — 실제 최신 배포 확인 필요');
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
      info.push(desc.includes('청천동치과')&&body.includes('부평치과를 찾는 분께 실제 진료 위치를 안내합니다')
        ?'청천동치과 진료시간·방문정보 신규 검색 안내 반영'
        :'청천동치과 진료시간·방문정보 신규 배포 확인 필요');
      const visitTitle=body.match(/<title>([^<]+)<\/title>/)?.[1]||'';
      const visitQuickNav=body.match(/<nav class="visit-jump"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
      const visitLinks=['#visit-hours','#visit-parking','#transit-heading','#visit-checklist-title'];
      const visitSearchReady=visitTitle.startsWith('청천동치과 이조은치과 | 진료시간·오시는 길·주차')&&
         visitLinks.every(id=>visitQuickNav.includes('href="'+id+'"'))&&
         body.includes('치과의 실제 위치는 인천 부평구 청천동입니다.');
      info.push(visitSearchReady?'부평치과 방문 안내 제목·모바일 4개 바로가기 반영':'부평치과 방문 안내 제목·모바일 4개 바로가기 배포 확인 필요');
      info.push(visitSearchReady&&desc.includes('청천동치과')&&
       body.includes('청천동치과 이조은치과의 진료 장소')?
       '청천동치과 실제 위치·금토 격주 방문 설명 공개 확인':
       '청천동치과 방문 안내 신규 배포 확인 필요');
      const visitPlaceReady=body.includes('href="https://map.naver.com/p/entry/place/13239400"')&&
       body.includes('의료기관 등록명은 <strong>이-조은치과의원</strong>');
      info.push(visitPlaceReady?
       '청천동치과 오시는 길 네이버 플레이스 상세 연결·등록명 병기 실사이트 확인':
       '오시는 길 네이버 플레이스 상세 연결·등록명 병기 배포 확인 필요');
      // Verify the actual Cloudflare HTML, not just the GitHub build:
      // patients must always be able to call, book at the confirmed URL or
      // jump to a real directions anchor on small-screen devices.
      const visitMobilePanel=body.match(/<nav class="visit-mobile-actions" aria-label="휴대폰 전화·네이버 예약·길찾기 바로가기">([\s\S]*?)<\/nav>/)?.[1]||'';
      const visitMobileHrefs=[...visitMobilePanel.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)]
       .map(link=>link[1].replace(/&amp;/g,'&'));
      const visitMobileReady=response.status===200&&
       JSON.stringify(visitMobileHrefs)===JSON.stringify([
        'tel:0325132875',verifiedBookingUrl,'#transit-heading'
       ])&&
       visitMobilePanel.includes('aria-label="이조은치과 032-513-2875 전화 문의"')&&
       visitMobilePanel.includes('target="_blank" rel="noopener noreferrer"')&&
       body.includes('id="transit-heading"')&&
       body.includes('.visit-mobile-actions{display:none}')&&
       body.includes('position:fixed;z-index:45')&&
       body.includes('safe-area-inset-bottom')&&
       body.includes('@media print{.visit-mobile-actions{display:none!important}');
      info.push(visitMobileReady?
       '모바일 전화·공식 네이버 예약·길찾기 고정 버튼 3개 실서버 공개 확인':
       '모바일 고정 전화·네이버 예약·길찾기 버튼 실서버 배포 확인 필요');
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
    // Internal, contextual links to periodontal maintenance should appear on
    // both the treatment questions and the main gum-health education hub.
    // Check the already-fetched live HTML so this does not add network calls.
    if(label==='public route gum-health'||label==='remaining route gum-treatment-faq'){
      const target='/stories/2026-10-25-incheon-periodontal-maintenance-after-treatment/';
      const linked=response.ok&&body.includes('href="'+target+'"');
      const usefulContext=label==='public route gum-health'?
       body.includes('잇몸치료 후에도 재발하는 이유와 유지관리 간격'):
       body.includes('재진 간격은 모든 환자에게 동일하지 않으며');
      info.push(linked&&usefulContext?
       '잇몸치료 후 재발·유지관리 원장 글로 연결되는 실제 HTML 최신 배포 확인':
       '잇몸치료 후 재발·유지관리 글 내부 링크 최신 배포 확인 필요');
    }
    if(label==='public route insurance-health'||label==='remaining route dental-insurance-faq'){
      const stories=[
       '2026-10-24-bupyeong-cavity-gi-insurance',
       '2026-10-25-samsan-cervical-abrasion-gi-insurance-vs-resin',
       '2026-10-25-cheongcheon-affordable-dental-care-insurance-priorities',
       '2026-10-25-incheon-periodontal-maintenance-after-treatment'
      ];
      const current=label==='public route insurance-health'?
       response.ok&&body.includes('class="note insurance-story-bridge"')&&
       stories.every(slug=>body.includes('href="/stories/'+slug+'/"'))&&
       body.includes('href="/dental-insurance-faq.html"'):
       response.ok&&body.includes('href="/insurance-health.html"');
      info.push(current?
       '건강보험 진료 10편과 원장 교육 글 간 환자용 내부 연결 실제 배포 확인':
       '건강보험 진료정보와 원장 교육 글 연결 배포·캐시 점검 필요');
    }
    if(label==='public route additional-health'){
      const curated=[
       '2026-10-24-bupyeong-denture-adjustment-dentist-evaluation',
       '2026-10-25-samsan-cervical-abrasion-gi-insurance-vs-resin',
       '2026-10-25-bupyeong-black-line-cavity-overtreatment-decision',
       '2026-10-25-bupyeong-broken-tooth-extraction-vs-restoration'
      ];
      const hubReady=response.ok&&body.includes('class="note additional-story-bridge"')&&
       curated.every(slug=>body.includes('href="/stories/'+slug+'/"'))&&
       body.includes('원장이 정리한 실제 질문')&&body.includes('href="/doctor.html"');
      info.push(hubReady?
       '틀니·치경부·충치·자연치아 보존 원장 글 4편 연결 실제 홈페이지 게시 확인':
       '틀니·치경부·충치·자연치아 보존 원장 글 연결 신규 배포 확인 필요');
    }
    if([
      'public route gum-health','public route root-canal-health',
      'public route insurance-health','public route additional-health'
    ].includes(label)){
      const directCount=(body.match(/href="\/doctor\.html"/g)||[]).length;
      info.push(directCount>=2?
       '건강정보 책임 의료진·진료 원칙 독립 소개 페이지 2개 직접 연결 실사이트 확인':
       '건강정보 의료진 독립 소개 링크 최신 배포 확인 필요');
    }
    if([
      '잇몸 건강정보 탐색 경로','신경치료 건강정보 탐색 경로',
      '보존 진료 연결 건강정보: 보존 원칙'
    ].includes(label)){
      const direct=response.ok&&body.includes('class="health-clinician-signpost"')&&
       body.includes('href="/doctor.html"');
      info.push(direct?
       '핵심 환자교육 글의 담당 원장·전문의 자격 독립 소개 페이지 실제 연결 확인':
       '핵심 환자교육 글의 담당 원장 직접 링크 최신 배포 확인 필요');
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

// Query the precise versioned JS referenced by the LIVE search page. If a CDN
// serves an obsolete byte stream under its fingerprinted URL, report that
// separately from general HTTP 200 and legacy unversioned cache responses.
if(deployedSearchScript){
 try{
  const response=await fetch(origin+deployedSearchScript,{
   signal:AbortSignal.timeout(8000),
   headers:{'User-Agent':'EjoeunDentalReadOnlyHealthCheck/1.0'}
  });
  const client=await response.text();
  const declared=deployedSearchScript.match(/\?v=([a-f0-9]{12})$/)?.[1]||'';
  const delivered=createHash('sha256').update(client).digest('hex').slice(0,12);
  const hashOk=response.ok&&declared===delivered;
  const sourceMatches=Boolean(expectedSearchScriptHash)&&delivered===expectedSearchScriptHash;
  const newStationSearch=client.includes('부평구청역|부평역|부평구|부평')&&
   client.includes('산곡역|굴포천역|갈산동')&&
   client.includes("'부평역','굴포천역'");
  const bookingOk=client.includes('const reservationIntent=')&&
   client.includes('dataset.bookingUrl')&&
   client.includes('예약 확정을 의미하지 않습니다');
  const breathScriptReady=client.includes("'입냄새':['입냄새','구취'")&&
   client.includes("const spacedRegion=q.match(")&&
   client.includes("/(?:입냄새|입에서냄새|구취)/");
  const dentureInsuranceReady=client.includes("'틀니조정보험':")&&
   client.includes("'다른치과틀니수리':")&&
   client.includes("p.url==='/health/insurance-denture.html'");
  const retreatInsuranceReady=client.includes("'재신경치료보험':")&&
   client.includes("const rootCostIntent=")&&
   client.includes("p.url==='/health/insurance-root-canal.html'");
  const giSearchReady=client.includes("'gi수복물이떨어졌어요':")&&
   client.includes("'레진gi보험차이':")&&
   client.includes("p.url==='/health/insurance-cervical.html'");
  const hoursOk=client.includes('const hoursOnlyIntent=')&&
   client.includes('금요일 격주 오전 09:30~13:00')&&
   client.includes('접수 마감 오전 12:30 / 오후 18:00')&&
   client.includes('이번 주 확정 진료일은 표시되지 않습니다');
  add('환자가 실제 로딩하는 검색 프로그램',''+(hashOk&&sourceMatches&&newStationSearch&&bookingOk&&hoursOk?'최신 버전 확인':'배포·캐시 확인 필요'),
   'HTTP '+response.status+' · 검색 페이지 지정 버전 '+declared+' / 실제 JS '+delivered+' / GitHub 원본 '+expectedSearchScriptHash+
   (hashOk?' · 페이지 지정 해시 일치':' · 페이지 지정 해시 불일치')+
   (sourceMatches?' · GitHub 빌드 산출물과 동일':
    !expectedSearchScriptHash?' · 빌드 산출물이 없어 버전 비교 불가':
     ' · GitHub 빌드 산출물과 버전 불일치')+
   (newStationSearch?' · 부평역·굴포천역 진료 검색 반영':' · 신규 역세권 검색 보정 미반영')+
   (bookingOk?' · 네이버 예약 찾기 연결 반영':' · 예약 검색 코드 최신 반영 필요')+
   (hoursOk?' · 격주 금·토요일·접수 마감 안내 반영':' · 진료시간 검색 코드 최신 반영 필요')+
   (breathScriptReady?' · 구취·복수 지역명 검색 보정 반영':' · 구취·지역명 검색 개선 배포 확인 필요')+
   (giSearchReady?' · GI 재수복·보험 문의 검색 보정 반영':' · GI 재수복 검색 보정 최신 배포 확인 필요')+
   (retreatInsuranceReady?' · 재신경치료·크라운 보험 검색 보정 반영':' · 재신경치료 보험 검색 보정 최신 배포 확인 필요')+
   (dentureInsuranceReady?' · 틀니 보험·타 치과 수리 검색 보정 반영':' · 틀니 보험 검색 보정 최신 배포 확인 필요'));
 }catch(error){
  add('환자가 실제 로딩하는 검색 프로그램','접속 확인 불가',shortError(error));
 }
}else{
 add('환자가 실제 로딩하는 검색 프로그램','배포·캐시 확인 필요','검색 화면의 버전 지정 JS 주소를 찾지 못했습니다.');
}

// Inspect the exact versioned stylesheet used by the live search page.
// This checks touch-target improvements on public hosting rather than
// mistaking a locally passing CSS test for a completed deployment.
if(deployedSearchCss){
 try{
  const response=await fetch(origin+deployedSearchCss,{
   signal:AbortSignal.timeout(8000),
   headers:{'User-Agent':'EjoeunDentalReadOnlyHealthCheck/1.0'}
  });
  const css=await response.text();
  const declared=deployedSearchCss.match(/\?v=([a-f0-9]{12})$/)?.[1]||'';
  const delivered=createHash('sha256').update(css).digest('hex').slice(0,12);
  const sourceHash=createHash('sha256')
   .update(readFileSync(new URL('../assets/search-page.css',import.meta.url)))
   .digest('hex').slice(0,12);
  const targets44=/\.search-suggestions a\{[^}]*min-height:44px/.test(css);
  const targets48=/\.search-suggestions a\{min-height:48px/.test(css);
  const current=response.ok&&declared===delivered&&delivered===sourceHash&&targets44&&targets48;
  add('검색 추천 버튼 모바일 터치 영역',current?'최신 버전 확인':'배포·캐시 확인 필요',
   'HTTP '+response.status+' · 링크 '+declared+' / 실제 '+delivered+' / 소스 '+sourceHash+
   (targets44&&targets48?' · 44px 기본·48px 모바일 버튼 반영':' · 터치 영역 개선 반영 필요'));
 }catch(error){
  add('검색 추천 버튼 모바일 터치 영역','접속 확인 불가',shortError(error));
 }
}else{
 add('검색 추천 버튼 모바일 터치 영역','배포·캐시 확인 필요','검색 화면에서 CSS 내용 해시 URL을 찾지 못했습니다.');
}

// This assertion is informational: Cloudflare deploys may trail a new commit
// briefly. Never confuse an archive counting mismatch with a search ranking.
{
 const archived=topicCountPages.get('remaining route clinical-archive')||'';
 const groups=[
  ['gum','잇몸치료 상세 페이지','잇몸치료'],
  ['root','재신경치료 이미지 초기 표시','신경치료']
 ];
 for(const [topic,label,subject] of groups){
  const group=archived.split('<details class="archive-blog-group" id="archive-group-'+topic+'"')[1]
    ?.split('</details>')[0]||'';
  const count=Number(group.split('class="archive-blog-count">')[1]?.split('편')[0]);
  const care=topicCountPages.get(label)||'';
  const n=Number(care.split('href="/clinical-archive.html#archive-group-'+topic+'"')[1]
    ?.split('원장의 '+subject+' 글 ')[1]?.split('편 보기')[0]);
  const ok=Number.isInteger(count)&&count>0&&count===n;
  add('원문 분류 실제 글 수 · '+subject,
    ok?'일치':'추가 확인 필요',
    (Number.isFinite(n)?n:'없음')+'편 안내 / 원장 아카이브 '+
    (Number.isFinite(count)?count:'없음')+'편 · '+(ok?'원문 수 자동 동기화 확인':'실서버 배포 시차 또는 숫자 확인 필요'));
 }
}

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
