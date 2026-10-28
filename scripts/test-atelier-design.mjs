import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync('dist/'+p,'utf8');
const home=read('index.html');
const atelier=read('assets/atelier-home-2026.css');
const museum=read('assets/museum-home-v2.css');

test('Atelier premium stylesheet loaded AFTER the existing museum/mobile safety layer',()=>{
 const styles=[...home.matchAll(/<link[^>]+rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 const a=styles.findIndex(s=>s.includes('/assets/atelier-home-2026.css?v='));
 const m=styles.findIndex(s=>s.includes('museum-home-v2.css'));
 assert.ok(a>=0&&m>=0&&a>m,'new finishing stylesheet must be after museum css');
 assert.ok(!styles.slice(a+1).some(x=>/museum-home-v2|gallery-finish|gallery-upgrade/.test(x)),
  'an older museum layer must not override the Atelier finish');
});
test('gallery finish improves main patient information rooms without altering structural hero placement',()=>{
 for(const selector of [
  '#philosophy .grid>.card','#focus-care .focus-care-shortcuts>a',
  '#doctor .frame','#doctor #doctor_body','#faq .faq-list details',
  '#location .visit-quick-facts>div','#stories .journal-gallery-cover'
 ]){
  assert.ok(atelier.includes(selector),'missing premium refinement '+selector);
 }
 for(const phrase of ['--atelier-forest','#fffdf8','@media(max-width:600px)','@media(prefers-reduced-motion:reduce)','@media(forced-colors:active)']){
  assert.ok(atelier.includes(phrase));
 }
 const safelyRemoveComments=atelier.replace(/\/\*[\s\S]*?\*\//g,'');
 let depth=0;for(const ch of safelyRemoveComments){if(ch==='{')depth++;if(ch==='}')depth--;assert.ok(depth>=0,'extra CSS closing brace')}
 assert.equal(depth,0,'unclosed CSS bracket');
});
test('portrait must never create the formerly broken 2-column mobile grid',()=>{
 assert.match(museum,/#main-content>\.hero\.wrap\{\s*display:grid;\s*grid-template-columns:minmax\(0,1fr\);/);
 const critical=museum.slice(museum.indexOf('CRITICAL MOBILE FIRST-SCREEN FIX'));
 for(const selector of [
  '>.art.hero-artwork','>.hero-editorial-detail','>div:first-child']){
  const pos=critical.indexOf('body.home-page #main-content>.hero.wrap'+selector+'{');
  assert.ok(pos>0);
  const block=critical.slice(pos,critical.indexOf('}',pos));
  assert.ok(block.includes('grid-column:1 / -1;'),'mobile row must span sole column: '+selector);
 }
 const heroStyle=atelier.slice(atelier.indexOf('/* Opening room'),atelier.indexOf('/* Cohesive gallery labels'));
 for(const risky of ['grid-column:','grid-row:','grid-template-columns:','display:none','position:absolute','position:fixed']){
  assert.ok(!heroStyle.includes(risky),'do not reintroduce broken hero grid: '+risky);
 }
 assert.match(atelier,/@media\(max-width:600px\)\{\s*body\.home-page #main-content>\.hero\.wrap #headline\{\s*font-size:clamp\(28px,7\.4vw,37px\);\s*line-height:1\.42;/);
 assert.match(home,/class="hero-actions"/);
 assert.match(home,/id="headline"/);
 const call=home.includes('href="tel:0325132875"');
 const booking=home.includes('https://booking.naver.com/booking/13/bizes/1162931');
 assert.ok(call&&booking,'call or original Naver reservation gone');
});
test('core on-page content and indexing markers preserved after design update',()=>{
 for(const id of ['philosophy','focus-care','care','doctor','gallery','health-info','faq','location','stories'])assert.ok(home.includes('id="'+id+'"'));
 assert.ok(home.includes('name="naver-site-verification"'));
 assert.ok(home.includes('name="google-site-verification"'));
 assert.ok(home.includes('rel="canonical" href="https://ejoeundental.com/"'));
 assert.ok(home.includes('src="/assets/ejoeundental-hero-cat.webp"'));
 assert.ok(home.includes('href="/doctor.html"'));
});


test('treatment catalogue gives four equal headline topics with readable mobile links',()=>{
 const section=home.match(/<section class="section" id="care">([\s\S]*?)<details class="care-more-details">/)?.[1]||'';
 assert.ok(section.includes('class="card care-preservation-feature"'),
  'natural tooth preservation must remain first and fully visible');
 const cards=[...section.matchAll(/class="card care-primary-card"><div class="num" aria-hidden="true">(\d{2})<\/div><h3>([^<]+)<\/h3>/g)]
  .map(x=>({n:x[1],name:x[2]}));
 assert.deepEqual(cards,[
  {n:'01',name:'잇몸치료'},
  {n:'02',name:'재신경치료'},
  {n:'03',name:'치경부마모증 · GI'},
  {n:'04',name:'건강보험 진료'}
 ],'all four leading treatments remain in their clinical order');
 for(const key of ['/gum-treatment.html','/retreatment.html','/cervical-abrasion.html','/insured-care.html'])
  assert.ok(section.includes('href="'+key+'"'),'missing original treatment link '+key);
 assert.match(atelier,/Atelier edition XI · Patient treatment catalogue/);
 assert.match(atelier,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,
  'four topics should make a balanced 2x2 layout');
 assert.match(atelier,/max-width:440px/);
 assert.match(atelier,/min-height:44px/);
 assert.match(home,/name="naver-site-verification"/);
 assert.match(home,/name="google-site-verification"/);
});


test('six illustrated patient education cards retain all topics and links',()=>{
 const section=home.match(/<section class="section light" id="health-info">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(section.includes('class="grid health-topic-grid"'));
 assert.equal((section.match(/class="card health-topic-card"/g)||[]).length,6);
 assert.equal((section.match(/class="health-topic-actions"/g)||[]).length,6);
 const topics=['잇몸질환 · 스케일링','신경치료 · 재신경치료',
  '시린 이 · 치경부마모증','건강보험 치과진료',
  '사랑니 · 발치 후 관리','치과 의학상식 · 약물'];
 for(const t of topics)assert.ok(section.includes('<h3>'+t+'</h3>'),'health topic missing '+t);
 for(const link of ['/gum-health.html','/root-canal-health.html',
  '/additional-health.html#abrasion','/insurance-health.html',
  '/wisdom-tooth.html','https://m.blog.naver.com/radio654']){
  assert.ok(section.includes('href="'+link+'"'),'health link removed '+link);
 }
 assert.match(atelier,/Atelier edition XII · Patient education reading room/);
 assert.match(atelier,/\.health-topic-grid\{\s*display:grid;\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(atelier,/@media\(max-width:760px\)\{[\s\S]*?\.health-topic-grid\{\s*grid-template-columns:minmax\(0,1fr\)/);
 assert.match(atelier,/\.health-topic-actions>a\{[\s\S]*?min-height:44px/);
 assert.match(atelier,/\.health-topic-card:nth-child\(6\)::before\{\s*background-size:contain/);
 assert.ok(home.includes('https://booking.naver.com/booking/13/bizes/1162931'),
  'patient booking link missing');
});


test('illustrated original-blog topic shortcuts keep 509 indexed originals and mobile readability',()=>{
 const stories=home.match(/<section class="section light" id="stories">([\s\S]*?)<\/section>/)?.[1]||'';
 const nav=stories.match(/<nav class="owner-blog-topic-jumps" aria-label="[^"]+">([\s\S]*?)<\/nav>/)?.[1]||'';
 const links=[...nav.matchAll(/<a href="\/clinical-archive\.html#(archive-group-[a-z]+)">([\s\S]*?)<\/a>/g)];
 assert.deepEqual(links.map(m=>m[1]),[
  'archive-group-gum','archive-group-root','archive-group-ethics','archive-group-other'
 ]);
 assert.deepEqual(links.map(m=>m[2].match(/<span class="owner-blog-topic-label">([^<]+)<\/span>/)?.[1]),[
  '잇몸치료·스케일링 원문 →',
  '신경치료·재신경치료 원문 →',
  '치과 선택·진료 원칙 원문 →',
  '충치·시린 이 등 원문 →'
 ]);
 const expectedArt=[
  '/assets/care-illustration-scaling.svg',
  '/assets/retreatment/illustration-02.webp',
  '/assets/ejoeundental-hero-cat.webp',
  '/assets/care-illustration-abrasion.svg'
 ];
 links.forEach((m,i)=>{
  assert.ok(m[2].includes('src="'+expectedArt[i]+'"'));
  assert.match(m[2],/<img\b[^>]*loading="lazy" decoding="async" alt="">/);
 });
 assert.equal((stories.match(/<div class="card owner-story-card"><h3><a href="https:\/\/blog\.naver\.com\//g)||[]).length,509);
 assert.match(atelier,/Atelier edition XIII · Illustrated story navigation/);
 assert.match(atelier,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(atelier,/@media\(max-width:460px\)\{/);
 assert.match(atelier,/owner-blog-topic-label\{\s*min-width:0;/);
});
