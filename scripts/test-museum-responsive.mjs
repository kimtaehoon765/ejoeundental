import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

const read=(path)=>readFileSync('dist/'+path,'utf8');
const home=read('index.html');
const museum=read('assets/museum-home-v2.css');

test('premium home stylesheet ships after earlier layers and keeps booking visible',()=>{
 const styles=[...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 const museumLink=styles.find(s=>s.includes('/assets/museum-home-v2.css?'));
 assert.ok(museumLink,'versioned museum CSS must be referenced');
 assert.ok(styles.indexOf(museumLink)>styles.findIndex(s=>s.includes('/assets/gallery-finish.css')),
  'museum refinements must win over earlier gallery layer');
 const hero=home.match(/<div class="hero-actions">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.ok(hero.includes('class="btn hero-call"'),'call must remain');
 assert.ok(hero.includes('class="btn hero-booking"'),'real Naver booking link must remain');
 assert.ok(hero.indexOf('hero-call')<hero.indexOf('hero-booking'));
 assert.ok(hero.indexOf('hero-booking')<hero.indexOf('hero-hours'));
 assert.match(museum, /\.hero-actions \.hero-booking\{\s*display:flex;order:1;grid-column:2;/,
  'mobile booking must override earlier display:none');
 assert.match(museum, /\.hero-actions \.hero-call\{\s*display:flex;order:0;grid-column:1;/);
});

test('phone-sized arrival facts are full-width with readable clinic information',()=>{
 const location=home.match(/<section class="section" id="location">([\s\S]*?)<\/section>/)?.[1]||'';
 const anchors=[
  'id="address"','class="visit-quick-facts"',
  'class="place-visit-actions"','class="nearby-location"',
  'class="parking-info"','id="weekly-hours"'
 ];
 const offsets=anchors.map(x=>location.indexOf(x));
 assert.ok(offsets.every((x,i)=>x>=0&&(i===0||x>offsets[i-1])),
  'practical visitor information must precede neighborhood details');
 for(const phrase of ['세월천로 34','대우프라자 305호','3시간 무료','격주 운영'])
  assert.ok(location.includes(phrase),'critical visit fact missing: '+phrase);
 assert.match(museum, /On phones, stacking practical visit facts avoids 11px two-column text/);
 assert.match(museum,/\.visit-quick-facts\{\s*grid-template-columns:minmax\(0,1fr\);gap:9px;/);
 assert.match(museum, /\.visit-quick-facts span,\s*body\.home-page #main-content>#location \.visit-quick-facts a\{\s*font-size:14px;/);
 assert.ok(location.includes('href="tel:0325132875"'));
});

test('medical text, all eleven accessible FAQs and original images survive visual pass',()=>{
 const faq=home.match(/<section class="section light" id="faq">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.equal((faq.match(/<details\b[^>]*>/g)||[]).length,11);
 assert.equal((faq.match(/<summary>/g)||[]).length,11);
 assert.equal((faq.match(/<details id="faq-[a-z-]+">/g)||[]).length,11,
  'the build must assign a stable linkable id to each question');
 assert.ok(home.includes('name="naver-site-verification"'));
 assert.ok(home.includes('rel="canonical" href="https://ejoeundental.com/"'));
 for(const id of ['doctor_title','doctor_body','focus-care','stories','location'])
  assert.ok(home.includes('id="'+id+'"'),'important content missing: '+id);
 for(const image of ['care-illustration-abrasion.svg','care-illustration-insurance.svg',
  'care-illustration-scaling.svg','impressionist-water-garden.svg','ejoeundental-hero-cat.webp']){
  assert.ok(existsSync('dist/assets/'+image),'missing design image: '+image);
 }
 for(const image of ['care-illustration-abrasion.svg','care-illustration-insurance.svg',
  'care-illustration-scaling.svg']){
  const art=read('assets/'+image);
  assert.ok(art.startsWith('<svg')&&art.includes('이조은치과'),
   'the own-brand illustration must retain its signature: '+image);
 }
});

test('mobile typography does not fall back to tiny size in the final museum layer',()=>{
 assert.match(museum, /#visit-guide \.grid>\.card p\{\s*margin:0 0 13px;font-size:15px;/);
 assert.match(museum, /#faq \.faq-list details>p\{[\s\S]*?font-size:15px;/);
 assert.match(museum, /@media\(max-width:600px\)\{[\s\S]*?#location \.visit-quick-facts\{\s*grid-template-columns:minmax\(0,1fr\)/);
 const css=museum.replace(/\/\*[\s\S]*?\*\//g,'').replace(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'/g,'');
 let depth=0;
 for(const ch of css){if(ch==='{')depth++;if(ch==='}')depth--;assert.ok(depth>=0,'unbalanced CSS block')}
 assert.equal(depth,0,'unclosed CSS block');
});
