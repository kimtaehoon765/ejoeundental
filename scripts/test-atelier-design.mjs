import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync('dist/'+p,'utf8');
const home=read('index.html');
const atelier=read('assets/atelier-home-2026.css');
const museum=read('assets/museum-home-v2.css');

test('Atelier premium stylesheet loaded AFTER the existing museum/mobile safety layer',()=>{
 const styles=[...home.matchAll(/<link[^>]+rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 const a=styles.findIndex(s=>s.includes('atelier-home-2026.css?v=20261028-atelier1'));
 const m=styles.findIndex(s=>s.includes('museum-home-v2.css'));
 assert.ok(a>=0&&m>=0&&a>m,'new finishing stylesheet must be after museum css');
 assert.equal(a,styles.length-1,'Atelier must be the last loaded CSS in the document');
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
