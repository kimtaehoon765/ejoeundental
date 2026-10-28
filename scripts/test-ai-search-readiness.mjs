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
