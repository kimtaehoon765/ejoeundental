import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bookingAction} from './naver-booking-link.mjs';

test('an unavailable real booking URL links to transparently labeled Naver search',()=>{
 const action=bookingAction('');
 assert.equal(action.direct,false);
 assert.equal(new URL(action.url).hostname,'search.naver.com');
 assert.match(new URL(action.url).searchParams.get('query'),/이조은치과의원/);
 assert.match(action.label,/찾기/);
 assert.doesNotMatch(action.label,/예약하기/);
});

test('only real-shaped official Naver booking URLs become direct booking buttons',()=>{
 const url='https://booking.naver.com/booking/13/bizes/12345?theme=place';
 const action=bookingAction(url);
 assert.equal(action.url,url);
 assert.equal(action.direct,true);
 assert.match(action.label,/예약하기/);
 for(const unsafe of [
  'http://booking.naver.com/booking/13/bizes/12345',
  'https://evil.example/booking/13/bizes/12345',
  'https://booking.naver.com.evil.example/booking/13/bizes/12345',
  'https://booking.naver.com/my',
  'https://booking.naver.com@evil.example/booking/13/bizes/12345',
  'javascript:alert(1)'
 ]){
  assert.throws(()=>bookingAction(unsafe),'unsafe URL must never become a CTA: '+unsafe);
 }
});

test('mobile homepage offers accessible phone and honest Naver booking fallback',()=>{
 const html=readFileSync('dist/index.html','utf8');
 const config=JSON.parse(readFileSync('content/site.json','utf8'));
 const action=bookingAction(config.naver_booking_url);
 const css=readFileSync('dist/assets/home-enhancements.css','utf8');
 assert.doesNotMatch(html,/BUILD_NAVER_BOOKING_MOBILE/);
 const widget=html.match(/<nav class="mobile-booking-actions"[^>]*>([\s\S]*?)<\/nav>/)?.[0]||'';
 assert.ok(widget,'mobile bottom booking action nav missing');
 assert.match(widget,/href="tel:0325132875"/);
 const safeHref=action.url.replace(/&/g,'&amp;');
 assert.ok(widget.includes('href="'+safeHref+'"'),'booking CTA destination must match validated config');
 assert.ok(widget.includes('aria-label="'+action.aria+'"'));
 assert.ok(widget.includes('rel="noopener noreferrer"'));
 assert.ok(widget.includes(action.label),'label must distinguish direct booking from search');
 assert.match(css,/body\.home-page \.mobile-booking-actions\s*\{[\s\S]*?position:fixed;/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/body\.home-page\.music-reopen|body\.home-page \.music-reopen/);
});

test('live Cloudflare verification checks the actual mobile visit CTA strip',()=>{
 const probe=readFileSync('scripts/live-domain-check.mjs','utf8');
 assert.ok(probe.includes('const visitMobilePanel=body.match('));
 assert.ok(probe.includes('const visitMobileHrefs='));
 assert.ok(probe.includes("'tel:0325132875',verifiedBookingUrl,'#transit-heading'"));
 assert.ok(probe.includes('visitMobilePanel.includes(\'target="_blank" rel="noopener noreferrer"\')'));
 assert.ok(probe.includes("body.includes('position:fixed;z-index:45')"));
 assert.ok(probe.includes('모바일 전화·공식 네이버 예약·길찾기 고정 버튼 3개 실서버 공개 확인'));
});

test('owner-confirmed clinic booking ID appears as an actual direct booking link throughout published site',()=>{
 const url='https://booking.naver.com/booking/13/bizes/1162931';
 const clinic=JSON.parse(readFileSync('content/site.json','utf8'));
 assert.equal(clinic.naver_booking_url,url,'owner-provided official booking URL must be retained exactly');
 const direct=bookingAction(clinic.naver_booking_url);
 assert.equal(direct.url,url);
 assert.equal(direct.direct,true,'booking button must not be a search fallback');
 assert.equal(direct.label,'네이버 예약하기 ↗');
 assert.equal(direct.aria,'이조은치과 공식 네이버 예약 페이지 새 창 열림');

 const homepage=readFileSync('dist/index.html','utf8');
 const actions=homepage.match(/<nav class="mobile-booking-actions"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 assert.ok(actions.includes('href="'+url+'"'));
 assert.ok(actions.includes(direct.label));
 assert.ok(actions.includes('target="_blank" rel="noopener noreferrer"'));
 assert.ok(!actions.includes('search.naver.com/search.naver'),'booking is now a direct link, not a search result');

 const hero=homepage.match(/<div class="hero-actions"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';
 assert.ok(hero.includes('class="btn hero-booking"'),'desktop homepage should offer direct booking');
 assert.ok(hero.includes('href="'+url+'"'));
 assert.ok(hero.includes('target="_blank" rel="noopener noreferrer"'));
 assert.ok(hero.includes(direct.label));
 const visit=readFileSync('dist/visit-guide.html','utf8');
 const quick=visit.match(/<nav class="visit-quick-actions"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 assert.ok(quick.includes('class="quick-route visit-booking"'));
 assert.ok(quick.includes('href="'+url+'"'));
 assert.ok(quick.includes(direct.label));
 assert.ok(quick.includes('target="_blank" rel="noopener noreferrer"'));
 assert.ok(!homepage.includes('BUILD_NAVER_BOOKING_HERO'));
 assert.ok(!visit.includes('BUILD_NAVER_BOOKING_VISIT'));
 const visitActions=[...visit.matchAll(/<nav class="visit-mobile-actions" aria-label="휴대폰 전화·네이버 예약·길찾기 바로가기">([\s\S]*?)<\/nav>/g)];
 assert.equal(visitActions.length,1,'visit-guide should have one fixed mobile patient action strip');
 const strip=visitActions[0][1];
 const hrefs=[...strip.matchAll(/<a [^>]*href="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(hrefs,['tel:0325132875',url,'#transit-heading'],
  'mobile call, verified booking and on-page directions should all work without JavaScript');
 assert.ok(strip.includes('aria-label="'+direct.aria+'"'),'visit booking must describe the official destination');
 assert.ok(strip.includes('target="_blank" rel="noopener noreferrer"'));
 assert.ok(visit.includes('id="transit-heading"'),'mobile directions need an actual scroll target');
 assert.match(visit,/\.visit-mobile-actions\{display:none\}/);
 assert.match(visit,/@media\(max-width:600px\)/);
 assert.match(visit,/safe-area-inset-bottom/);
 assert.match(visit,/@media print\{\.visit-mobile-actions\{display:none!important\}/);
 const search=readFileSync('dist/search.html','utf8');
 assert.ok(search.includes('data-booking-url="'+url+'"'));
 assert.ok(search.includes('data-booking-label="'+direct.label+'"'));
});


test('nineteen clinic information and patient safety guides have mobile contact actions and keyboard skip links',()=>{
 const clinic=JSON.parse(readFileSync('content/site.json','utf8'));
 const booking=bookingAction(clinic.naver_booking_url);
 const pages=[
  ['stories.html','main'],
  ['clinical-archive.html','main'],
  ['doctor.html','doctor-profile-main'],
  ['gum-health.html','health-hub-main'],
  ['root-canal-health.html','health-hub-main'],
  ['insurance-health.html','health-hub-main'],
  ['additional-health.html','health-hub-main'],
  ['blood-thinners-dental.html','patient-main'],
  ['osteoporosis-medication-dental.html','patient-main'],
  ['diabetes-dental-care.html','patient-main'],
  ['heart-disease-dental-care.html','patient-main'],
  ['kidney-disease-dental-care.html','patient-main'],
  ['liver-disease-dental-care.html','patient-main'],
  ['cancer-immunosuppression-dental-care.html','patient-main'],
  ['pregnancy-dental-care.html','patient-main'],
  ['medical-history.html','patient-main'],
  ['medical-safety-guide.html','main-content'],
  ['medication-dental-faq.html','patient-main'],
  ['systemic-disease-dental-faq.html','patient-main']
 ];
 const css=readFileSync('dist/assets/clinic-info-mobile-actions.css','utf8');
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/\.clinic-info-mobile-actions a:focus-visible/);
 assert.match(css,/\.clinic-info-skip-link:focus/);
 assert.match(css,/@media print/);
 // Narrow-screen reading improvements should persist after new deployments.
 for(const selector of [
  'body.stories-gallery header nav',
  'body.stories-gallery header nav a',
  'body.stories-gallery .story-card p',
  'body.doctor-gallery header nav',
  'body.doctor-gallery header nav a',
  'html.health-library body header .navlinks a',
  'html.health-library body main.article :is(p,li)'
 ])assert.ok(css.includes(selector),'patient mobile reading/nav style missing: '+selector);
 assert.ok(css.includes('overflow-x:auto'),'long mobile menus must scroll instead of overflowing');
 assert.ok(css.includes('min-height:48px'),'mobile menu choices must be comfortable to tap');
 assert.ok(css.includes('font-size:15px;line-height:1.8'),
  'story summaries must remain legible on small screens');
 for(const [page,id] of pages){
  const html=readFileSync('dist/'+page,'utf8');
  const strips=[...html.matchAll(/<nav class="clinic-info-mobile-actions"[^>]*>([\s\S]*?)<\/nav>/g)];
  assert.equal(strips.length,1,'exactly one phone/booking/directions bar: '+page);
  const links=[...strips[0][1].matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(links,['tel:0325132875',booking.url,'/visit-guide.html'],
   'mobile patient actions must link to the real telephone, official booking and clinic directions: '+page);
  assert.ok(strips[0][1].includes('aria-label="'+booking.aria+'"'),'honest booking action label: '+page);
  assert.ok(strips[0][1].includes('rel="noopener noreferrer"'),'safe booking link: '+page);
  assert.match(html,/<link rel="stylesheet" href="\/assets\/clinic-info-mobile-actions\.css\?v=[a-f0-9]{12}">/);
  assert.ok(html.includes('id="'+id+'"'),'skip-link target must exist: '+page+
   ' · actual main: '+(html.match(/<main\b[^>]*>/i)?.[0]||'(none)')+
   ' · actual skip: '+(html.match(/<a[^>]*>본문 바로가기<\/a>/i)?.[0]||'(none)'));
  const label=id==='health-hub-main'?'건강정보 본문으로 바로가기':
   id==='patient-main'?'본문으로 바로가기':'본문 바로가기';
  assert.ok(html.includes('href="#'+id+'">'+label+'</a>'),'keyboard skip link must point to page main: '+page);
  if(id==='main-content'){
   assert.match(html,/<main\b[^>]*id="main-content"/,'new safety main landmark should be the skip target: '+page);
   assert.equal((html.match(/href="#main-content">본문 바로가기<\/a>/g)||[]).length,1,
    'do not duplicate accessible safety shortcuts: '+page);
  }
  if(id==='patient-main'){
   assert.match(html,/<main\b[^>]*id="patient-main"/,'reuse existing patient main landmark: '+page);
   assert.equal((html.match(/class="patient-standalone-skip"/g)||[]).length,1,
    'retain one existing standalone skip link: '+page);
   assert.ok(!html.includes('class="clinic-info-skip-link"'),
    'do not add an unnecessary second keyboard skip link: '+page);
  }
 }
 const visit=readFileSync('dist/visit-guide.html','utf8');
 const home=readFileSync('dist/index.html','utf8');
 assert.ok(!visit.includes('class="clinic-info-mobile-actions"'),'preserve visit guide original mobile controls');
 assert.ok(!home.includes('class="clinic-info-mobile-actions"'),'preserve homepage original mobile controls');
});


test('nine patient medication and medical-history checklists have a direct, safe reading shortcut',()=>{
 const pages=[
  'blood-thinners-dental.html','osteoporosis-medication-dental.html',
  'diabetes-dental-care.html','heart-disease-dental-care.html',
  'kidney-disease-dental-care.html','liver-disease-dental-care.html',
  'cancer-immunosuppression-dental-care.html','pregnancy-dental-care.html',
  'medical-history.html'
 ];
 const css=readFileSync('dist/assets/clinic-info-mobile-actions.css','utf8');
 assert.match(css,/\.patient-checklist-jump a:focus-visible/);
 assert.match(css,/\.patient-checklist-jump a\{[\s\S]*?min-height:44px/);
 assert.match(css,/#visit-checklist\{scroll-margin-top:25px/);
 assert.match(css,/@media print\{\.patient-checklist-jump\{display:none!important\}\}/);
 for(const p of pages){
  const html=readFileSync('dist/'+p,'utf8');
  const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
  const notice=main.indexOf('<p class="notice">');
  const nav=main.indexOf('<nav class="patient-checklist-jump"');
  const checklist=main.indexOf('id="visit-checklist"');
  assert.ok(notice>=0&&nav>notice&&checklist>nav,'pre-visit shortcut must lead into an actual checklist: '+p);
  assert.equal((main.match(/class="patient-checklist-jump"/g)||[]).length,1,'one quick shortcut per page: '+p);
  assert.ok(main.includes('<a href="#visit-checklist">진료 전 확인 체크리스트 바로가기</a>'),
   'patients can reach checklist without scrolling through long medical advice: '+p);
  assert.ok(main.includes('안내 내용을 읽고 방문 전 준비할 사항을 확인하세요.'),
   'jump navigation should not encourage skipping medical precautions: '+p);
 }
});
