import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const home=readFileSync('dist/index.html','utf8');
const visit=readFileSync('dist/visit-guide.html','utf8');
const sitemap=readFileSync('dist/sitemap.xml','utf8');
const css=readFileSync('dist/assets/home-enhancements.css','utf8');
const head=s=>s.split('</head>')[0];
const extract=(s,pattern)=>s.match(pattern)?.[1]||'';
test('Cheongcheon-dong and Bupyeong clinic queries have one truthful branded homepage',()=>{
 const h=head(home);
 const title=extract(h,/<title>([^<]+)<\/title>/);
 const og=extract(h,/<meta property="og:title" content="([^"]+)"/);
 const twitter=extract(h,/<meta name="twitter:title" content="([^"]+)"/);
 const meta=extract(h,/<meta name="description" content="([^"]+)"/);
 assert.equal(title,'이조은치과 | 부평치과·청천동치과 | 잇몸치료·재신경치료');
 assert.equal(og,title);
 assert.equal(twitter,title);
 assert.ok(meta.includes('이조은치과')&&meta.includes('인천 부평구 청천동'));
 assert.ok(title.startsWith('이조은치과 |'),'exact brand must lead the Google homepage title');
 assert.ok(/^인천 부평구 청천동 이조은치과(?:\.|\()/.test(meta),'name and actual location should lead the summary');
 assert.ok(meta.includes('고려대학교 의학박사(치과학 전공)·통합치의학과 전문의'),'retain actual credentials in the short branded snippet');
 assert.ok(meta.length<=160,'natural and accurate treatment snippets may need more than 80 characters');
 assert.equal(extract(h,/<meta property="og:description" content="([^"]+)"/),meta);
 assert.equal(extract(h,/<meta name="twitter:description" content="([^"]+)"/),meta);
 assert.ok(h.includes('<link rel="canonical" href="https://ejoeundental.com/">'));
 assert.equal((home.match(/<h1\b/g)||[]).length,1,'do not stuff an extra H1 for local SEO');
 const hero=home.split('<section class="hero wrap">')[1]?.split('</section>')[0]||'';
 assert.ok(hero.includes('class="hero-local-intro"'));
 assert.ok(hero.includes('청천동치과 이조은치과'));
 assert.ok(hero.includes('세월천로 34'));
 assert.ok(hero.includes('href="/visit-guide.html"'));
 assert.ok(hero.includes('고려대학교 의학박사(치과학 전공)')&&
   hero.includes('통합치의학과 전문의'));
 assert.ok(!hero.includes('부천잇몸치료'),'secondary towns should not clutter clinic identity');
 assert.ok(css.includes('.hero .hero-local-intro')&&css.includes('@media(max-width:600px)'));
});
test('visit page is distinct, honest, share-ready and linked to primary local clinic',()=>{
 const h=head(visit);
 const title=extract(h,/<title>([^<]+)<\/title>/);
 const meta=extract(h,/<meta name="description" content="([^"]+)"/);
 assert.equal(title,'청천동치과 이조은치과 | 진료시간·오시는 길·주차');
 assert.equal(title,extract(h,/<meta property="og:title" content="([^"]+)"/));
 assert.equal(title,extract(h,/<meta name="twitter:title" content="([^"]+)"/));
 assert.equal(meta,extract(h,/<meta property="og:description" content="([^"]+)"/));
 assert.equal(meta,extract(h,/<meta name="twitter:description" content="([^"]+)"/));
 assert.ok(meta.includes('청천동치과')&&meta.includes('이조은치과')&&meta.includes('세월천로 34'));
 const data=[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
   .map(x=>JSON.parse(x[1])).find(x=>x['@type']==='MedicalWebPage');
 assert.ok(data,'medical visit page schema must stay valid');
 assert.equal(data.name,title);
 assert.equal(data.description,meta);
 assert.ok(visit.includes('부평치과를 찾는 분께 실제 진료 위치를 안내합니다'));
 assert.ok(visit.includes('청천동치과 이조은치과의 진료 장소'));
 assert.ok(visit.includes('0325132875')&&visit.includes('세월천로 34'));
 assert.ok(visit.includes('금·토요일은 격주 일정'));
 assert.ok(visit.includes('3시간 무료'));
 assert.ok(visit.includes('href="/"'));
 assert.ok(h.includes('canonical'));
});
test('onsite search index matches visible homepage title and summary',()=>{
 const rows=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 const homepage=rows.filter(item=>item.url==='/');
 assert.equal(homepage.length,1);
 assert.equal(homepage[0].title,extract(head(home),/<title>([^<]+)<\/title>/));
 assert.equal(homepage[0].description,
  extract(head(home),/<meta name="description" content="([^"]+)"/));
 assert.ok(homepage[0].body.includes('청천동치과 이조은치과'));
});
test('sitemap dates reflect genuine homepage and visit revisions, not invented daily changes',()=>{
 // Derive each expected date from the checked-in source instead of freezing
 // the former 2026-10-27 value after a genuine page revision. The build may
 // normalize the visit route to extensionless /visit-guide.
 const sourceSitemap=readFileSync('sitemap.xml','utf8');
 const minimumRealRevisions=new Map([['','2026-10-27'],['visit-guide.html','2026-10-28']]);
 const latestAllowed=new Date(Date.now()+86400000).toISOString().slice(0,10);
 for(const [route,earliestKnownRevision] of minimumRealRevisions){
  const sourcePrefix='<loc>https://ejoeundental.com/'+route+'</loc><lastmod>';
  const found=sourceSitemap.split(sourcePrefix);
  assert.equal(found.length,2,'source sitemap must contain one dated clinic URL: '+route);
  const date=found[1].split('</lastmod>')[0];
  assert.match(date,/^\\d{4}-\\d{2}-\\d{2}$/,'source modification date needs ISO format: '+route);
  assert.ok(date>=earliestKnownRevision&&date<=latestAllowed,
   'use a documented, non-future modification date for: '+route);
  const publishedRoutes=route==='visit-guide.html'?['visit-guide.html','visit-guide']:[route];
  assert.ok(publishedRoutes.some(path=>
    sitemap.includes('<loc>https://ejoeundental.com/'+path+'</loc><lastmod>'+date+'</lastmod>')),
   'published sitemap date must match the actual source revision: '+route);
 }
});


test('the same real clinic has consistent branded name variants, public address and telephone in markup',()=>{
 const h=head(home);
 const graphs=[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1]));
 const site=graphs.find(x=>x['@type']==='WebSite');
 const dentist=graphs.find(x=>x['@type']==='Dentist');
 assert.equal(site?.name,'이조은치과');
 assert.equal(dentist?.name,site.name);
 assert.deepEqual([...site.alternateName].sort(),['이조은치과의원','이-조은치과의원'].sort());
 assert.deepEqual(dentist.alternateName,site.alternateName);
 assert.equal(dentist.legalName,'이-조은치과의원','registered name should agree with public hospital directories');
 assert.equal(site.publisher['@id'],dentist['@id']);
 assert.equal(site.url,'https://ejoeundental.com/');
 assert.equal(dentist.url,site.url);
 assert.equal(dentist.telephone,'+82-32-513-2875');
 assert.equal(dentist.address?.streetAddress,'세월천로 34 대우프라자 305호');
 assert.equal(dentist.address?.addressLocality,'부평구');
 assert.ok(home.includes('<p id="address">인천광역시 부평구 세월천로 34, 대우프라자 305호</p>'));
 assert.match(home,/<p class="clinic-name-variant">병원정보 사이트 표기: <strong>이-조은치과의원<\/strong> \(이조은치과와 동일한 주소·전화번호\)<\/p>/);
 assert.match(css,/#location \.clinic-name-variant\{font-size:13px/);
 assert.ok(!home.includes('<meta name="keywords"'),'do not add obsolete keyword tags for search engines');
});

test('pediatric care pages give practical age-appropriate guidance, safe referral criteria and local navigation',()=>{
 const pediatric=readFileSync('dist/pediatric-dentistry.html','utf8');
 const orthodontics=readFileSync('dist/pediatric-orthodontics.html','utf8');
 const index=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 const story='/stories/2026-10-26-cheongcheon-child-dentist-or-general-dentist/';
 for(const [id,phrase] of [
  ['pediatric-treatment-options','아이 치과치료, 꼭 소아치과 전문 진료가 필요한가요?'],
  ['pediatric-restorative-options','어린이 충치치료, GI와 레진 중 무엇이 좋을까요?'],
  ['pediatric-pulp-treatment','유치가 많이 썩으면 신경치료나 기성금속관이 꼭 필요한가요?']
 ]){
  assert.ok(pediatric.includes('id="'+id+'"'),id+' should be a directly linkable pediatric topic');
  assert.ok(pediatric.includes(phrase),id+' question should be readable without JavaScript');
 }
 assert.ok(pediatric.includes('href="'+story+'"'),'pediatric guidance needs directly related owner article');
 assert.ok(pediatric.includes('href="/dental-insurance-faq.html"'),'pediatric treatment costs need real insurance FAQ');
 assert.ok(pediatric.includes('보험 적용 여부는 연령, 치아 종류, 진단·처치 및 당시 급여 기준에 따라 달라집니다'));
 assert.ok(pediatric.includes('소아치과 전문 평가나 협진'),'complex pediatric cases need an appropriate referral path');
 assert.ok(pediatric.includes('.pediatric-care-decisions a{display:inline-flex;align-items:center;min-height:44px'));
 assert.ok(pediatric.includes('.pediatric-care-decisions a,.article nav[aria-label="관련 진료와 건강정보"] a{min-height:48px'));
 assert.ok(orthodontics.includes('id="child-removable-orthodontics"'));
 assert.ok(orthodontics.includes('어린이 전치부 반대교합 등 제한적인 경우에 가철성 장치 치료를 검토'));
 assert.ok(orthodontics.includes('복잡한 부정교합이나 포괄적인 교정치료가 필요하면 교정 전문 진료를 안내'));
 assert.ok(orthodontics.includes('href="'+story+'"'));
 for(const slug of ['pediatric-dentistry','pediatric-orthodontics']){
  const route='/'+slug+'.html';
  const row=index.find(x=>x.url===route);
  assert.ok(row,'child dental care page must be searchable: '+route);
  assert.ok(row.body.includes(slug==='pediatric-dentistry'?'아이 치과치료, 꼭 소아치과 전문 진료가 필요한가요?':'어린이 앞니 반대교합, 가철성 장치로 치료할 수 있나요?'),
   'search engine must index real clinical content: '+route);
  assert.ok(sitemap.includes('<loc>https://ejoeundental.com/'+slug+'</loc>'),
   'pediatric care route must remain in the production sitemap');
 }
});

test('homepage links to four clinically distinct original patient education articles before the symptom directory',()=>{
 const feature=home.match(/<section class="section light" id="home-representative-guides"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(feature.includes('id="home-representative-guides-title"'));
 assert.ok(home.indexOf('id="home-representative-guides"')>home.indexOf('id="focus-care"'));
 assert.ok(home.indexOf('id="home-representative-guides"')<home.indexOf('id="symptoms"'),
  'questions should be visible immediately after the focused treatment shortcuts');
 const expected=[
  ['2026-10-24-bupyeong-swollen-bleeding-gums-visit-dentist','잇몸이 갑자기 부었어요'],
  ['2026-10-26-cheongcheon-gum-color-change-red-gums-periodontal-care','잇몸 색이 빨갛게 변했어요'],
  ['2026-10-24-bupyeong-severe-toothache-deep-caries-extraction-vs-root-canal','치아가 아픈데 꼭 뽑아야 하나요?'],
  ['2026-10-24-bupyeong-cavity-gi-insurance','충치치료에 건강보험을 적용할 수 있나요?']
 ];
 assert.equal((feature.match(/class="home-representative-guide-grid"/g)||[]).length,1);
 assert.equal((feature.match(/<a href="\/stories\//g)||[]).length,4,
  'homepage clinical features should stay compact rather than displaying the full archive');
 for(const [slug,title] of expected){
  assert.ok(feature.includes('href="/stories/'+slug+'/"'),slug+' must be linked directly from home');
  assert.ok(feature.includes(title),title+' must use patient question phrasing');
  const page=readFileSync('dist/stories/'+slug+'/index.html','utf8');
  assert.ok(page.includes('<link rel="canonical" href="https://ejoeundental.com/stories/'+slug+'/"'),
   'home featured story must have a real production self-canonical: '+slug);
  assert.ok(sitemap.includes('<loc>https://ejoeundental.com/stories/'+slug+'/</loc>'),
   'home featured story must be discoverable through production sitemap: '+slug);
 }
 assert.ok(!feature.includes('전혀 아프지 않')&&!feature.includes('완치'),
  'homepage cannot promise all patients will have the same clinical outcome');
 assert.match(home,/\/assets\/home-enhancements\.css\?v=[a-zA-Z0-9-]+/,
  'generated homepage must use a cache-versioned stylesheet for returning mobile users');
 assert.match(readFileSync('index.html','utf8'),
  /\/assets\/home-enhancements\.css\?v=[A-Za-z0-9-]+/,
  'source homepage must carry a cache-versioned featured patient stylesheet');
 const actualStyleHash=createHash('sha256').update(css).digest('hex').slice(0,12);
 assert.ok(home.includes('/assets/home-enhancements.css?v='+actualStyleHash),
  'published homepage must use the current stylesheet content hash, not an obsolete version');
 assert.ok(css.includes('.home-representative-guide-grid a:focus-visible'),
  'keyboard users must see a visible focus ring on original clinic stories');
 assert.ok(css.includes('grid-template-columns:1fr'),
  'clinical question cards should collapse to one column on narrow phones');
 assert.ok(css.includes('min-height:72px'),
  'mobile reading links need comfortable touch targets');
});

// The location is verified by clinic name, address and telephone against the
// publicly listed Naver Place entry. Keep a stable place ID, not search results.
test('patient map links and clinic identity point to the same Naver Place listing',()=>{
 const place='https://map.naver.com/p/entry/place/13239400';
 const headJson=[...head(home).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1]));
 const clinic=headJson.find(x=>x['@type']==='Dentist');
 assert.ok(clinic,'primary Dentist entity exists');
 assert.equal(clinic.hasMap,place);
 assert.ok(clinic.sameAs.includes(place),'Naver Place belongs to the same clinic entity');
 assert.ok(home.includes('href="'+place+'"'),'homepage offers a direct map destination');
 assert.ok(visit.includes('href="'+place+'"'),'visiting guide offers the same direct destination');
 assert.ok(!home.includes('https://map.naver.com/p/search/'),'homepage should not route patients through a search page');
 assert.ok(!visit.includes('https://map.naver.com/p/search/'),'visiting guide should not route patients through a search page');
});

test('clinic social links identify the same real Incheon dental practice',()=>{
 const instagram='https://www.instagram.com/indifan2/';
 const schemas=[...head(home).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1]));
 const clinic=schemas.find(x=>x['@type']==='Dentist');
 assert.ok(clinic?.sameAs?.includes(instagram),'existing clinic Instagram account belongs to clinic schema');
 assert.ok(home.includes('href="'+instagram+'"'),'patients can discover the public clinic Instagram profile');
 assert.ok(home.includes('aria-label="이조은치과 인스타그램, 새 창 열림"'));
 assert.equal(clinic?.legalName,'이-조은치과의원');
 assert.equal(clinic?.telephone,'+82-32-513-2875');
 assert.ok(clinic?.address?.streetAddress?.includes('세월천로 34'),'prevent confusion with similarly named clinics elsewhere');
});

test('periodontal hub and FAQ provide direct crawlable post-treatment care paths',()=>{
 const hub=readFileSync('dist/gum-health.html','utf8');
 const faq=readFileSync('dist/gum-treatment-faq.html','utf8');
 const href='/stories/2026-10-25-incheon-periodontal-maintenance-after-treatment/';
 assert.ok(hub.includes('href="'+href+'"'),'main gum-care hub should link to the established maintenance guide');
 assert.ok(faq.includes('href="'+href+'"'),'gum treatment FAQ should link to the same clinical follow-up');
 assert.ok(hub.includes('재발하는 이유와 유지관리 간격'),'link text must describe the patient question');
 assert.ok(faq.includes('재진 간격은 모든 환자에게 동일하지 않으며'),'avoid fixed, ungrounded follow-up schedules');
 const cards=(faq.match(/<section class="card">/g)||[]).length;
 const faqSchema=[...faq.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(x=>{try{return JSON.parse(x[1])}catch{return null}})
  .find(x=>x?.['@type']==='FAQPage');
 assert.equal(faqSchema?.mainEntity?.length,cards,'do not add an unmatched FAQ question to structured data');
});

test('retreatment FAQ links specific patient questions to existing clinician articles',()=>{
 const faq=readFileSync('dist/root-canal-retreatment-faq.html','utf8');
 const rootRadiolucency='/stories/2026-10-25-incheon-retreatment-root-tip-dark-spot-no-pain/';
 const crownPost='/stories/2026-10-25-bupyeong-retreatment-crown-post-can-tooth-be-saved/';
 assert.ok(faq.includes('href="'+rootRadiolucency+'"'),'root-tip follow-up guide must be crawlably linked');
 assert.ok(faq.includes('href="'+crownPost+'"'),'crown/post treatment guide must be crawlably linked');
 assert.ok(faq.includes('뿌리 끝 검은 그림자의 변화와 재신경치료 후 추적검사'));
 assert.ok(faq.includes('크라운과 포스트가 있는 치아의 재신경치료 가능성'));
 assert.equal((faq.match(/href="\/stories\/2026-10-25-incheon-retreatment-root-tip-dark-spot-no-pain\//g)||[]).length,1);
 assert.equal((faq.match(/href="\/stories\/2026-10-25-bupyeong-retreatment-crown-post-can-tooth-be-saved\//g)||[]).length,1);
 const questions=(faq.match(/<section class="card"><h2>/g)||[]).length;
 const structured=[...faq.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(x=>{try{return JSON.parse(x[1])}catch{return null}})
  .find(x=>x?.['@type']==='FAQPage');
 assert.equal(structured?.mainEntity?.length,questions,
  'contextual reading links must not introduce uncatalogued FAQ questions');
});

test('insurance guide links four distinctive published patient articles and back to insurance FAQ',()=>{
 const hub=readFileSync('dist/insurance-health.html','utf8');
 const faq=readFileSync('dist/dental-insurance-faq.html','utf8');
 const articleSlugs=[
  '2026-10-24-bupyeong-cavity-gi-insurance',
  '2026-10-25-samsan-cervical-abrasion-gi-insurance-vs-resin',
  '2026-10-25-cheongcheon-affordable-dental-care-insurance-priorities',
  '2026-10-25-incheon-periodontal-maintenance-after-treatment'
 ];
 const block=hub.match(/<section class="note insurance-story-bridge"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(block.includes('환자가 궁금해하는 선택 기준'));
 for(const slug of articleSlugs){
  const link='/stories/'+slug+'/';
  assert.ok(block.includes('href="'+link+'"'),'Missing meaningful article link: '+slug);
 }
 assert.equal((block.match(/<li><a href="\/stories\//g)||[]).length,4,'Only four vetted original stories, without extra clutter');
 assert.ok(block.includes('href="/dental-insurance-faq.html"'),'find FAQ from insurance hub');
 assert.ok(faq.includes('href="/insurance-health.html"'),'return to insurance hub from FAQ');
 assert.ok(hub.includes('grid-template-columns:1fr'),'mobile layout should remain readable');
 const schema=[...hub.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1])).find(x=>x['@type']==='CollectionPage');
 assert.equal(schema?.mainEntity?.numberOfItems,10,'ten health guides unchanged');
 assert.equal(schema?.mainEntity?.itemListElement?.length,10,'do not alter the medical guide count');
});

test('four-topic dental health hub links distinct original articles without changing its 16 guides',()=>{
 const html=readFileSync('dist/additional-health.html','utf8');
 const panel=html.match(/<section class="note additional-story-bridge"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(panel.includes('치료를 결정하기 전, 원장이 정리한 실제 질문'));
 const posts=[
  '2026-10-24-bupyeong-denture-adjustment-dentist-evaluation',
  '2026-10-25-samsan-cervical-abrasion-gi-insurance-vs-resin',
  '2026-10-25-bupyeong-black-line-cavity-overtreatment-decision',
  '2026-10-25-bupyeong-broken-tooth-extraction-vs-restoration'
 ];
 for(const slug of posts)assert.ok(panel.includes('href="/stories/'+slug+'/"'),slug+' article must be linked');
 assert.equal((panel.match(/href="\/stories\/2026-[^"]+"/g)||[]).length,4,'only four curated article links');
 assert.ok(panel.includes('href="/doctor.html"'),'medical author identity should be accessible');
 assert.ok(html.includes('grid-template-columns:1fr'),'mobile links stack on narrow screens');
 const meta=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(x=>JSON.parse(x[1])).find(x=>x['@type']==='CollectionPage');
 assert.equal(meta?.mainEntity?.numberOfItems,16);
 assert.equal(meta?.mainEntity?.itemListElement?.length,16);
});

test('root canal regional search descriptions stay natural and retreatment FAQ labels match real answers',()=>{
 const hub=readFileSync('dist/root-canal-health.html','utf8');
 const faq=readFileSync('dist/root-canal-retreatment-faq.html','utf8');
 const title=extract(head(hub),/<title>([^<]+)<\/title>/);
 const description=extract(head(hub),/<meta name="description" content="([^"]+)"/);
 assert.ok(title.includes('인천 신경치료')&&title.includes('부평 신경치료'));
 assert.ok(description.includes('인천·부평 신경치료')&&description.includes('청천동'));
 assert.ok(description.includes('근관치료'));
 assert.ok(!description.includes('인천 신경치료 부평 신경치료'),'avoid redundant keyword-list copy');
 const faqCards=(faq.match(/<section class="card"><h2>/g)||[]).length;
 const schemas=[...faq.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1]));
 const faqData=schemas.find(x=>x['@type']==='FAQPage');
 assert.equal(faqCards,10);
 assert.equal(faqData?.mainEntity?.length,faqCards,'FAQ structured answers must match visible questions');
 const label=hub.match(/<a href="\/root-canal-retreatment-faq\.html"><strong>재신경치료가 가능한지 궁금해요<\/strong><span>([^<]+)<\/span><\/a>/)?.[1]||'';
 assert.ok(label.includes('질문 '+faqCards+'가지'), 'visible link count should match the FAQ itself');
 assert.ok(!label.includes('질문 9가지'),'do not show stale counts');
});

test('sitemap uses real October 27 revisions of four materially edited care hubs, not a blanket timestamp',()=>{
 const edited=['gum-health','insurance-health','additional-health','dental-insurance-faq'];
 for(const slug of edited){
  const line='<loc>https://ejoeundental.com/'+slug+'</loc><lastmod>2026-10-27</lastmod>';
  assert.ok(sitemap.includes(line),slug+' requires an accurate source-backed editorial lastmod');
 }
 assert.equal((sitemap.match(/<loc>https:\/\/ejoeundental.com\/(?:gum-health|insurance-health|additional-health|dental-insurance-faq)<\/loc><lastmod>2026-10-27<\/lastmod>/g)||[]).length,4);
 assert.ok(sitemap.includes('<loc>https://ejoeundental.com/health/insurance-cavity</loc>')&&
  !sitemap.includes('<loc>https://ejoeundental.com/health/insurance-cavity</loc><lastmod>2026-10-27</lastmod>'),
  'do not pretend unrelated health guide content was revised today');
});
