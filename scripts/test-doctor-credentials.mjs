import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync('dist/'+path,'utf8');
const degree='고려대학교 의학박사';
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
 assert.ok(description.includes(degree.replace(' ', ' '))===false || description.includes('의학박사'));
 assert.match(description,/통합치의학과 전문의/);
 assert.match(html,/\/assets\/home-enhancements\.css\?v=20261024-credentials/);
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
  assert.match(html,/\/assets\/care-design-system\.css\?v=20261024-credentials/);
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
