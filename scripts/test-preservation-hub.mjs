import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const origin='https://ejoeundental.com';
const page=readFileSync('dist/tooth-preservation.html','utf8');
const sitemap=readFileSync('dist/sitemap.xml','utf8');
const index=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
const homepage=readFileSync('dist/index.html','utf8');
const directory=readFileSync('dist/stories.html','utf8');
const posts=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));

test('preservation hub has one authoritative canonical and is discoverable by real links',()=>{
 assert.match(page,/<html lang="ko">/);
 assert.equal((page.match(/<h1\b/g)||[]).length,1);
 assert.match(page,/<title>부평 자연치아 보존/);
 assert.ok(page.includes('href="'+origin+'/tooth-preservation.html"'));
 assert.ok(sitemap.includes('<loc>'+origin+'/tooth-preservation'));
 assert.ok(homepage.includes('href="/tooth-preservation.html"'));
 assert.ok(directory.includes('href="/tooth-preservation.html"'));
 assert.ok(page.includes('href="tel:0325132875"'));
 assert.ok(page.includes('고려대학교 의학박사(치과학 전공)'));
 assert.ok(page.includes('통합치의학과 전문의'));
});

test('preservation page is substantive and links to existing, verifiable patient education',()=>{
 for(const phrase of ['남아 있는 치질','치근의 균열','치주','재신경치료','임플란트','건강보험','발치가 필요한','개별 검사 결과'])
  assert.ok(page.includes(phrase),'important balanced clinical guidance absent: '+phrase);
 for(const dest of ['/gum-treatment.html','/retreatment.html','/cavity-treatment.html','/implant.html','/health/tooth-crack.html','/stories.html#topic-preserve']){
  assert.ok(page.includes('href="'+dest+'"'),'missing relevant real care path: '+dest);
 }
 const expected=['2026-10-25-bupyeong-natural-tooth-versus-implant-maintenance',
 '2026-10-25-cheongcheon-severe-caries-can-tooth-be-saved',
 '2026-10-25-bupyeong-retreatment-vs-extraction-tooth-prognosis'];
 for(const slug of expected){
  assert.ok(posts.some(item=>item.slug===slug),'referenced story must be publicly published: '+slug);
  assert.ok(page.includes('href="/stories/'+slug+'/"'));
 }
 assert.doesNotMatch(page,/무조건 살릴 수|100% 성공|절대 아프지 않|완치 보장/);
});

test('search and preservation articles guide users back to the main care explanation',()=>{
 const found=index.filter(x=>x.url==='/tooth-preservation.html');
 assert.equal(found.length,1,'index the new authoritative preservation hub once');
 assert.ok(found[0].body.length>600,'preservation hub body cannot be a short SEO placeholder');
 for(const phrase of ['발치','근관','잇몸','치아']) assert.ok(found[0].body.includes(phrase));
 for(const slug of ['2026-10-25-bupyeong-natural-tooth-versus-implant-maintenance',
    '2026-10-25-cheongcheon-severe-caries-can-tooth-be-saved']){
  const story=readFileSync('dist/stories/'+slug+'/index.html','utf8');
  assert.ok(story.includes('href="/tooth-preservation.html"'),
   'published preservation stories must link to clinical preservation guidance');
 }
});

test('all four clinical decision pages connect readers to the preservation hub without removing older health guides',()=>{
 for(const file of ['gum-treatment.html','retreatment.html','cavity-treatment.html','implant.html']){
  const html=readFileSync('dist/'+file,'utf8');
  assert.ok(html.includes('href="/tooth-preservation.html"'),
   file+' should point to the treatment-oriented preservation guide');
  assert.ok(html.indexOf('href="/tooth-preservation.html"')>html.indexOf('<main'),
   file+' needs the link within patient-readable primary content');
 }
 for(const file of ['gum-treatment.html','retreatment.html','implant.html']){
  assert.ok(readFileSync('dist/'+file,'utf8').includes('href="/health/tooth-preservation.html"'),
   'preserve earlier patient education rather than replacing its original link');
 }
});

test('symptom-first browsing offers a preservation decision path before lower priority site sections',()=>{
 const symptom=homepage.split('<section class="symptom-navigator wrap"')[1]?.split('</section>')[0]||'';
 assert.ok(symptom.includes('치아를 뽑아야 한다는 말을 들으셨나요?'));
 assert.ok(symptom.includes('href="/tooth-preservation.html"'));
 assert.ok(homepage.indexOf('symptom-preservation-cta')<homepage.indexOf('id="focus-care"'),
  'the extraction question must not be buried below the clinical journals');
});

test('clinically relevant health questions link to the preservation decision guide and back',()=>{
 const guides=[
  'tooth-preservation.html','root-canal-or-extraction.html',
  'tooth-crack.html','loose-tooth.html'
 ];
 for(const name of guides){
  const path='dist/health/'+name;
  const html=readFileSync(path,'utf8');
  const content=html.split('<main')[1]?.split('</main>')[0]||'';
  assert.ok(content.includes('href="/tooth-preservation.html"'),
   path+' needs the patient-visible preservation care link');
  assert.equal((content.match(/href="\/tooth-preservation\.html"/g)||[]).length,1,
   path+' should have only one dedicated decision guide link');
  assert.ok(page.includes('href="/health/'+name+'"'),
   'the preservation guide should link back to the relevant focused health article: '+name);
 }
});


test('gum discharge is explained through both periodontal and root-canal pathways',()=>{
 const gum=readFileSync('dist/gum-treatment.html','utf8');
 const root=readFileSync('dist/root-canal-health.html','utf8');
 const home=readFileSync('dist/index.html','utf8');
 const clinicalLinks=[
  '/health/gum-pus.html','/health/root-canal-lesion.html',
  '/root-canal-health.html#root-canal-articles'
 ];
 const differentialStart=gum.indexOf('id="gum-or-root-symptoms"');
 assert.ok(differentialStart>gum.indexOf('<main'), 'the explanation must be patient-visible');
 assert.ok(differentialStart<gum.indexOf('id="gum-scaling-difference"'),
  'symptom differentiation should be read before treatment selection');
 for(const link of clinicalLinks)assert.ok(gum.includes('href="'+link+'"'),
  'gum diagnosis article must link to the existing supporting guide: '+link);
 for(const word of ['치주낭','치수','근관','방사선 검사','치아 균열','119'])
  assert.ok(gum.slice(differentialStart,differentialStart+2000).includes(word),
   'balanced patient guidance missing: '+word);
 assert.ok(root.includes('href="/gum-treatment.html#gum-or-root-symptoms"'),
  'root-canal hub should link back to the gum-versus-root diagnosis');
 assert.ok(root.includes('href="/health/gum-pus.html"'),
  'root-canal lesion information should link to gum-pus symptoms');
 assert.ok(home.includes('href="/health/gum-pus.html"'),
  'homepage should expose the important gum-pus symptom without another duplicate page');
 for(const path of ['/gum-treatment.html','/root-canal-health.html']){
  const matched=index.filter(entry=>entry.url===path);
  assert.equal(matched.length,1,path+' must remain one substantive search entry');
  assert.ok(matched[0].body.includes('고름'),
   path+' updated patient-facing explanation must be searchable');
 }
 assert.ok(sitemap.includes('<loc>'+origin+'/gum-treatment</loc>'));
 assert.ok(sitemap.includes('<loc>'+origin+'/root-canal-health</loc>'));
});

test('the preservation decision guide gives patients four clinically distinct symptom-first links',()=>{
 const section=page.match(/<section id="preserve-symptom-choices"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(section.includes('id="preserve-symptom-title"'));
 assert.ok(page.includes('href="#preserve-symptom-choices"'),'new patient choices need a top-of-page jump link');
 const expected=[
  ['밤에도 아프고 찬물에 심하게 시려요','2026-10-24-bupyeong-severe-toothache-deep-caries-extraction-vs-root-canal'],
  ['신경치료한 치아가 다시 아파요','2026-10-25-bupyeong-retreatment-vs-extraction-tooth-prognosis'],
  ['치아가 갑자기 흔들려요','2026-10-25-incheon-loose-tooth-suddenly-periodontal-exam'],
  ['치아가 깨지거나 금이 갔어요','2026-10-25-bupyeong-broken-tooth-extraction-vs-restoration']
 ];
 assert.equal((section.match(/class="preserve-symptom-item"/g)||[]).length,4,
  'show four distinct medical situations rather than duplicate keyword pages');
 for(const [question,slug] of expected){
  assert.ok(section.includes(question),'missing symptom question: '+question);
  assert.ok(posts.some(item=>item.slug===slug),'link must point to a published story: '+slug);
  assert.ok(section.includes('href="/stories/'+slug+'/"'),
   'visible symptom card must link directly to its corresponding story: '+slug);
 }
 for(const phrase of ['무조건 발치','치근파절','치주조직','응급의료기관']){
  assert.ok(section.includes(phrase),'avoid overgeneralizing extraction and emergency decisions: '+phrase);
 }
 const entry=index.find(x=>x.url==='/tooth-preservation.html');
 assert.ok(entry?.body.includes('치아가 아프거나 흔들린다면, 증상별로 먼저 확인하세요'),
  'symptom-first clinical guidance must appear in the public site search index');
 assert.ok(page.includes('.preserve-symptom-item a{display:inline-flex;align-items:center;min-height:48px'),
  'linked patient paths need comfortable touch targets on phones');
});

test('gum symptoms point to distinct published gingival education instead of generic duplicate landing pages',()=>{
 const gum=readFileSync('dist/gum-treatment.html','utf8');
 const menu=gum.match(/<nav class="gum-symptom-stories"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 const references=[
  '2026-10-26-cheongcheon-gum-color-change-red-gums-periodontal-care',
  '2026-10-24-bupyeong-swollen-bleeding-gums-visit-dentist',
  '2026-10-25-incheon-loose-tooth-suddenly-periodontal-exam'
 ];
 assert.ok(menu.includes('잇몸 색이 갑자기 빨개졌어요'));
 assert.ok(menu.includes('잇몸이 갑자기 부었어요'));
 assert.ok(menu.includes('치아가 갑자기 흔들려요'));
 for(const slug of references){
  assert.ok(posts.some(x=>x.slug===slug),'symptom link must be real published content: '+slug);
  assert.ok(menu.includes('href="/stories/'+slug+'/"'),'gum symptoms must point to specific article: '+slug);
 }
 assert.ok(gum.includes('.gum-symptom-stories a{display:inline-flex;align-items:center;box-sizing:border-box;min-height:48px'),
  'mobile gum symptom links should meet comfortable touch targets');
 assert.ok(index.some(x=>x.url==='/gum-treatment.html'&&x.body.includes('잇몸 검사를 받아보세요')),
  'the public clinical introduction must remain searchable independent of navigation links');
});

test('root-canal patient hub offers verified symptom-specific owner articles and current FAQ size',()=>{
 const hub=readFileSync('dist/root-canal-health.html','utf8');
 const section=hub.match(/<section class="root-real-questions" id="root-canal-real-questions"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(section.includes('id="root-real-questions-heading"'),'endodontic symptom guide must have a visible heading');
 assert.equal((section.match(/class="root-real-question-grid"/g)||[]).length,1);
 assert.equal((section.match(/<article>/g)||[]).length,4,'four different clinical issues need direct guidance');
 const slugs=[
  '2026-10-25-bupyeong-root-canal-temporary-filling-fell-out',
  '2026-10-25-incheon-retreatment-root-tip-dark-spot-no-pain',
  '2026-10-25-bupyeong-retreatment-crown-post-can-tooth-be-saved',
  '2026-10-24-bupyeong-severe-toothache-deep-caries-extraction-vs-root-canal'
 ];
 for(const slug of slugs){
  assert.ok(posts.some(item=>item.slug===slug),'root-canal hub must reference actually published owner education: '+slug);
  assert.ok(section.includes('href="/stories/'+slug+'/"'),'patient must be able to open an exact explanation: '+slug);
 }
 for(const phrase of ['치근파절','재신경치료','발치 전 신경치료 가능성','숨쉬기 어렵다면'])
  assert.ok(section.includes(phrase),'root canal symptom guidance needs cautious advice: '+phrase);
 assert.ok(hub.includes('재치료의 가능성·한계와 질문 9가지 →'),
  'hub should not advertise an outdated count when FAQ content expands');
 const indexed=index.find(item=>item.url==='/root-canal-health.html');
 assert.ok(indexed?.body.includes('신경치료 중 이런 일이 생겼다면?'),
  'the public clinical topic hub should expose actual searchable patient questions');
});

test('denture and cavity clinical guides link to verified patient stories and avoid one-size-fits-all treatment',()=>{
 const denture=readFileSync('dist/denture.html','utf8');
 const cavity=readFileSync('dist/cavity-treatment.html','utf8');
 const dentureSection=denture.match(/<section class="denture-patient-questions" id="denture-patient-questions"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
 const cavityNav=cavity.match(/<nav class="cavity-patient-links"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 assert.ok(dentureSection.includes('id="denture-patient-title"'));
 assert.equal((dentureSection.match(/<article>/g)||[]).length,4,'denture care should present four distinct patient questions');
 for(const slug of [
  '2026-10-24-bupyeong-denture-adjustment-dentist-evaluation',
  '2026-10-25-sangok-denture-partial-vs-complete-denture',
  '2026-10-26-cheongcheon-how-to-choose-denture-dentist'
 ]){
  assert.ok(posts.some(p=>p.slug===slug),'denture link must have a real story: '+slug);
  assert.ok(dentureSection.includes('href="/stories/'+slug+'/"'),
   'denture care guide missing relevant original article: '+slug);
 }
 assert.ok(dentureSection.includes('href="/health/insurance-denture.html"'),
  'patients need the current insurance-specific denture coverage guide');
 assert.ok(denture.includes('id="denture-implant-supported"'),
  'explain optional implant-assisted partial denture after individual examination');
 assert.ok(denture.includes('모든 임플란트나 크라운을 부분틀니의 지대치로 사용할 수 있는 것은 아닙니다'),
  'implant-assisted design must never be offered as guaranteed for all patients');
 assert.ok(denture.includes('임플란트의 위치와 수')&&denture.includes('주변 뼈와 보철물의 상태'));
 assert.ok(denture.includes('.denture-question-grid a{display:inline-flex;align-items:center;min-height:48px'));
 const dentureIndex=index.find(p=>p.url==='/denture.html');
 assert.ok(dentureIndex?.body.includes('부분틀니에 임플란트 보철물을 활용할 수도 있나요?'),
  'substantive implant-assisted denture education should be searchable');

 for(const slug of [
  '2026-10-25-bupyeong-black-line-cavity-overtreatment-decision',
  '2026-10-24-bupyeong-cavity-gi-insurance',
  '2026-10-25-incheon-affordable-cavity-resin-gi-inlay-cost',
  '2026-10-25-cheongcheon-severe-caries-can-tooth-be-saved'
 ]){
  assert.ok(posts.some(p=>p.slug===slug),'cavity question link must point to published article: '+slug);
  assert.ok(cavityNav.includes('href="/stories/'+slug+'/"'),
   'cavity topic hub should link to real existing patient guidance: '+slug);
 }
 assert.equal((cavityNav.match(/class="cavity-patient-grid"/g)||[]).length,1);
 assert.ok(cavityNav.includes('건강보험 적용 여부도 실제 진단·재료·진료 당시 급여 기준에 따라 달라집니다'),
  'avoid universal insurance guarantees');
 assert.ok(cavity.includes('@media(max-width:650px){.cavity-patient-grid{grid-template-columns:1fr}'),
  'small screens should show accessible one-column cards');
 const cavityIndex=index.find(p=>p.url==='/cavity-treatment.html');
 assert.ok(cavityIndex?.body.includes('건강보험')&&cavityIndex.body.includes('치아'),
  'clinical cavity introduction remains indexed by search engines');
});
