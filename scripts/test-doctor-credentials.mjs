import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync('dist/'+path,'utf8');
const degree='고려대학교 의학박사(치과학 전공)';
const specialty='통합치의학과 전문의';

test('homepage introduces doctor credentials prominently and preserves direct diagnosis message',()=>{
 const html=read('index.html');
 const hero=html.match(/<section class="hero wrap">([\s\S]*?)<\/section>/)?.[1]||'';
 const bio=html.match(/<section class="section dark" id="doctor">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(hero.includes('class="hero-doctor-credentials"'));
 assert.ok(hero.includes(degree)&&hero.includes(specialty));
 assert.ok(hero.includes('href="#doctor"'));
 assert.ok(bio.includes('<h2 id="doctor_title">'+degree+' · '+specialty+'</h2>'));
 assert.ok(bio.includes('원장이 직접 검진하고 진단합니다'));
 assert.ok(bio.includes('id="doctor_degree"'));
 assert.ok(bio.includes('doctor-specialist-pill'));
 const intro=html.match(/<p id="intro">([\s\S]*?)<\/p>/)?.[1]||'';
 assert.match(intro,/원장이 직접 검진·진단/);
 const description=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
 const og=html.match(/<meta property="og:description" content="([^"]+)"/)?.[1];
 const twitter=html.match(/<meta name="twitter:description" content="([^"]+)"/)?.[1];
 assert.equal(description,og);
 assert.equal(description,twitter);
 assert.ok(description.length>=55&&description.length<=80,
  'Naver homepage snippet should meet the 80-character URL Inspection recommendation');
 for(const term of ['부평치과','인천 부평구 청천동','잇몸치료','신경치료','재신경치료'])
  assert.ok(description.includes(term),'homepage snippet missing essential user-facing detail '+term);
 assert.match(description,/고려대학교 의학박사\(치과학 전공\)·통합치의학과 전문의/);
 assert.match(description,/통합치의학과 전문의/);
 assert.match(html,/\/assets\/home-enhancements\.css\?v=[^"']+/);
});

test('machine-readable credentials reflect exactly the patient-facing qualifications',()=>{
 const html=read('index.html');
 const ld=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1])).find(item=>item['@type']==='Dentist');
 assert.ok(ld);
 assert.ok(ld.additionalProperty.some(x=>x.name==='원장 학위'&&x.value===degree));
 assert.ok(ld.additionalProperty.some(x=>x.name==='원장 전문의 자격'&&x.value===specialty));
 assert.match(ld.description,/의학박사/);
});

test('both periodontal and retreatment pages link to actual staff section without duplicate claims',()=>{
 for(const page of ['gum-treatment.html','retreatment.html']){
  const html=read(page);
  const matches=[...html.matchAll(/<p class="treatment-doctor-credentials">([^<]*<strong>[^<]+<\/strong>[^<]*<a[^>]+>[^<]+<\/a>)<\/p>/g)];
  assert.equal(matches.length,1,page);
  assert.ok(matches[0][1].includes(degree+' · '+specialty),page);
  assert.ok(matches[0][1].includes('href="/#doctor"'),page);
  assert.match(html,/\/assets\/care-design-system\.css\?v=[^"']+/);
 }
});

test('shared presentation has accessible links and mobile layout',()=>{
 const home=read('assets/home-enhancements.css');
 const treatment=read('assets/care-design-system.css');
 assert.match(home,/\.hero-doctor-credentials a:focus-visible/);
 assert.match(home,/@media\(max-width:600px\)\{\.hero \.hero-doctor-credentials/);
 assert.match(treatment,/\.treatment-doctor-credentials a:focus-visible/);
 assert.match(treatment,/@media\(max-width:600px\)\{\.treatment-doctor-credentials/);
});


test('medical field of doctorate is consistent with source clinic data and all primary treatment pages',()=>{
 const source=JSON.parse(readFileSync('content/site.json','utf8'));
 assert.equal(source.doctor_degree,degree);
 assert.ok(source.intro.includes(degree));
 assert.ok(source.doctor_title.includes(degree));
 assert.ok(source.doctor_body.includes('의학박사(치과학 전공)'));
 for(const name of ['index.html','gum-treatment.html','retreatment.html']){
  const html=read(name);
  assert.ok(html.includes(degree),name+' must not omit the specific field of study');
  assert.ok(!html.includes('고려대학교 의학박사 · 통합치의학과 전문의'),
   name+' old ambiguous qualification statement remains');
 }
});

test('standalone clinic care pages show one verified clinician byline near the first clinical explanation',()=>{
 const source=JSON.parse(readFileSync('content/site.json','utf8'));
 const clinician=String(source.footer_representative||'').trim();
 assert.equal(clinician,'김태훈','visible clinic doctor identity must match verified source');
 const carePages=[
  'implant.html','denture.html','cavity-treatment.html','scaling.html',
  'wisdom-tooth.html','pediatric-dentistry.html','pediatric-orthodontics.html'
 ];
 for(const page of carePages){
  const html=read(page);
  const badges=[...html.matchAll(/<aside class="clinician-byline" aria-label="진료 안내 담당 의료진">([\s\S]*?)<\/aside>/g)];
  assert.equal(badges.length,1,page+' must show exactly one verified clinician');
  const visible=badges[0][1];
  assert.ok(visible.includes('이조은치과 · '+clinician+' 원장'),page+' has wrong responsible clinician');
  assert.ok(visible.includes(degree+' · '+specialty),page+' has incorrect academic credentials');
  assert.ok(visible.includes('2003년부터 청천동 진료'),page+' missing clinic continuity');
  assert.ok(visible.includes('원장이 직접 검진·진단'),page+' missing direct diagnostic principle');
  assert.ok(visible.includes('href="/#doctor"'),page+' must link to the real medical staff biography');
  assert.ok(/<link rel="stylesheet" href="\/assets\/clinician-byline\.css(?:\?v=[^"]+)?"/.test(html),
   page+' must actually load the accessible responsive component');
  assert.ok(html.indexOf('class="clinician-byline"')>html.indexOf('<main'),
   page+' clinician identity must be visible rather than search-only metadata');
  assert.ok(html.indexOf('class="clinician-byline"')<html.indexOf('<h2'),
   page+' clinician byline should appear before detailed clinical paragraphs');
  assert.equal((html.match(/<h1\b/g)||[]).length,1,page+' must retain a single clear H1 heading');
 }
 const style=read('assets/clinician-byline.css');
 assert.match(style,/\.clinician-byline a:focus-visible/);
 assert.match(style,/min-height:44px/);
 assert.match(style,/@media\(max-width:600px\)/);
 assert.match(style,/min-height:48px/);
});
