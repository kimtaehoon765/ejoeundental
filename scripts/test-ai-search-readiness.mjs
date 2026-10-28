import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync('dist/'+p,'utf8');
test('AI search discovery remains open to public crawlers and closed to admin paths',()=>{
 const robots=read('robots.txt');
 assert.match(robots,/User-agent:\s*\*[\s\S]*?Allow:\s*\/\s*[\s\S]*?Disallow:\s*\/admin\//);
 assert.match(robots,/User-agent:\s*OAI-SearchBot[\s\S]*?Allow:\s*\/\s*[\s\S]*?Disallow:\s*\/admin\//);
 assert.match(robots,/Sitemap:\s*https:\/\/ejoeundental\.com\/sitemap\.xml/);
});
test('clinic identity data points to real public doctor, FAQ and directions pages',()=>{
 const home=read('index.html');
 const blocks=[...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1]));
 const site=blocks.find(b=>b['@type']==='WebSite');
 const clinic=blocks.find(b=>b['@type']==='Dentist');
 assert.ok(site&&clinic,'home must expose site and responsible medical practice');
 assert.equal(clinic['@id'],'https://ejoeundental.com/#clinic');
 assert.equal(clinic.employee?.['@id'],'https://ejoeundental.com/#doctor-person');
 assert.match(clinic.description,/원장이 직접 검진·진단/);
 for(const p of ['doctor.html','visit-guide.html','gum-treatment-faq.html','root-canal-retreatment-faq.html']){
  assert.ok(site.hasPart.some(x=>
   x.url==='https://ejoeundental.com/'+p||
   x.url==='https://ejoeundental.com/'+p.replace(/\.html$/,'')
  ),'missing grounded linked page '+p);
 }
 assert.ok(home.includes('name="naver-site-verification"'));
 assert.ok(home.includes('rel="canonical" href="https://ejoeundental.com/"'));
});
test('doctor-authored answers match visible clinical information and link to detailed sources',()=>{
 const doctor=read('doctor.html');
 const section=doctor.match(/<section class="card" aria-labelledby="doctor-common-questions">([\s\S]*?)<\/section>/)?.[1];
 assert.ok(section,'AI-discoverable doctor-led Q&A is absent');
 assert.equal((section.match(/<dt>/g)||[]).length,4);
 assert.equal((section.match(/<dd>/g)||[]).length,4);
 for(const phrase of ['김태훈 원장이 직접','치근 균열','급여 기준','금요일과 토요일은 격주']){
  assert.ok(section.includes(phrase),'missing accurately grounded patient answer: '+phrase);
 }
 for(const p of ['gum-treatment.html','retreatment.html','insured-care.html','visit-guide.html']){
  assert.ok(section.includes('href="/'+p+'"'),'patient cannot inspect factual source: '+p);
 }
 assert.ok(doctor.includes('name="description"'));
 assert.match(doctor,/rel="canonical" href="https:\/\/ejoeundental\.com\/doctor(?:\.html)?"/);
 assert.ok(section.includes('개별 치료 여부와 계획은 검진 결과에 따라 달라질 수 있습니다'));
});

test('Cheongcheon-dong local clinic identity answers remain visible and consistent',()=>{
 const local=read('visit-guide.html'),home=read('index.html'),doctor=read('doctor.html');
 const section=local.match(/<section class="card clinic-local-questions" aria-labelledby="clinic-local-questions-title">([\s\S]*?)<\/section>/)?.[1];
 assert.ok(section,'visible clinic identity answers missing');
 assert.equal((section.match(/<dt>/g)||[]).length,4);
 assert.equal((section.match(/<dd>/g)||[]).length,4);
 for(const fact of ['인천광역시 부평구','세월천로 34, 대우프라자 305호',
  '이-조은치과의원','032-513-2875','김태훈 원장','금요일과 토요일은 격주 일정']){
  assert.ok(local.includes(fact),'missing documented clinic fact: '+fact);
 }
 for(const p of ['doctor.html','gum-treatment.html','retreatment.html']){
  assert.ok(section.includes('href="/'+p+'"'),'missing physician/service source link '+p);
 }
 assert.ok(local.includes('href="tel:0325132875"'));
 assert.ok(home.includes('김태훈')&&doctor.includes('2003년부터'));
 const graphs=[...local.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1]));
 const visitSchema=graphs.find(x=>x['@type']==='MedicalWebPage');
 assert.equal(visitSchema?.mainEntity?.['@id'],'https://ejoeundental.com/#clinic');
 assert.ok(visitSchema.about?.some(x=>x['@id']==='https://ejoeundental.com/#clinic'));
 assert.ok(section.includes('이 페이지에 실시간 진료 여부를 표시하지는 않습니다'));
});


test('five real clinic services resolve to existing detailed medical explanations',()=>{
 const html=read('index.html');
 const blocks=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1]));
 const dentist=blocks.find(x=>x['@type']==='Dentist');
 const sitemap=read('sitemap.xml');
 const verified=new Map([
  ['잇몸치료','gum-treatment'],
  ['신경치료(근관치료)','root-canal-health'],
  ['재신경치료','retreatment'],
  ['치경부마모증 수복','cervical-abrasion'],
  ['건강보험 적용 치과진료','insured-care']
 ]);
 assert.equal(dentist?.availableService?.length,verified.size);
 const represented=new Set();
 for(const service of dentist.availableService){
  const slug=verified.get(service.name);
  assert.ok(slug,'unrecognized claimed clinical service');
  assert.equal(service['@type'],'MedicalProcedure');
  const normalized=service.url?.replace(/\.html$/,'');
  assert.equal(normalized,'https://ejoeundental.com/'+slug);
  assert.ok(sitemap.includes('<loc>https://ejoeundental.com/'+slug+'</loc>'),
   'service page must have a real crawlable canonical URL');
  const target=read(slug+'.html');
  assert.match(target,/<h1\b[^>]*>/,'service URL must display genuine patient content');
  assert.match(target,/<link rel="canonical" href="https:\/\/ejoeundental\.com\//);
  represented.add(slug);
 }
 assert.equal(represented.size,verified.size,'each service must have its own destination');
});


test('AI-readable, clinician-authored treatment decisions cite seven real patient guides',()=>{
 const doctor=read('doctor.html');
 const home=read('index.html');
 const source=read('sitemap.xml');
 const section=doctor.match(/<section class="card" id="clinical-decision-answers"[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(section,'doctor clinical decision guidance must be server-rendered');
 const questions=[...section.matchAll(/<dt>([^<]+)<\/dt>/g)].map(x=>x[1]);
 const answers=[...section.matchAll(/<dd>([\s\S]*?)<\/dd>/g)].map(x=>x[1]);
 assert.equal(questions.length,5,'five distinct real patient decisions should be explained');
 assert.equal(answers.length,5,'every question must have an evidence-linked answer');
 assert.ok(questions.every(x=>x.endsWith('?')),'patients should see concrete questions');
 assert.ok(answers.every(x=>x.length>100&&x.includes('href="/stories/')),
  'each answer must contain a substantial explanation and original clinical article');
 const links=[...section.matchAll(/href="(\/stories\/[^"]+\/)"/g)].map(m=>m[1]);
 assert.equal(links.length,7,'seven recently reviewed real stories need direct internal citations');
 assert.equal(new Set(links).size,7,'repeating the same story would not improve traceability');
 for(const uri of links){
  const slug=uri.match(/^\/stories\/([\w-]+)\/$/)?.[1];
  assert.ok(slug,'invalid local story link: '+uri);
  const page=read('stories/'+slug+'/index.html');
  assert.ok(page.includes('rel="canonical"'),'linked source needs an indexable canonical');
 }
 assert.ok(home.includes('href="/doctor.html#clinical-decision-answers"'),
  'homepage must expose the answer section as a crawlable HTML link');
 assert.ok(source.includes('<loc>https://ejoeundental.com/doctor.html</loc><lastmod>2026-10-29</lastmod>'),
  'the doctor answer page real modification date must be updated');
 assert.ok(section.includes('이조은치과에서 모든 진정치료를 제공한다는 뜻은 아닙니다'),
  'public content must not claim an unverified sedation service');
 assert.ok(doctor.includes('고려대학교 의학박사')&&doctor.includes('통합치의학과 전문의'),
  'responsible clinician credentials must remain');
});
