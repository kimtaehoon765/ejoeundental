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


test('original director and cat portrait remains visible on mobile after the phone and booking actions',()=>{
 const hero=home.match(/<section class="hero wrap">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(hero.includes('class="art hero-artwork"') && hero.includes('src="/assets/ejoeundental-hero-cat.webp"'),
  'the original clinic painting must remain in the hero');
 const actions=hero.indexOf('class="hero-actions"');
 const artwork=hero.indexOf('class="art hero-artwork"');
 const editorial=hero.indexOf('class="hero-editorial-detail"');
 assert.ok(actions>=0 && artwork>actions && editorial>artwork,
  'the doctor painting must appear after phone/booking and before detailed prose');
 assert.match(museum,/Museum edition IX:/);
 assert.match(museum,/@media\(max-width:600px\)\{[\s\S]*?#main-content>\.hero>\.art\.hero-artwork\{[\s\S]*?display:block;/,
  'mobile portrait visibility must override earlier gallery display:none');
 assert.match(museum,/#main-content>#health-info \.grid>\.card:nth-child\(6\)::before\{[\s\S]*?background-size:contain;/,
  'the health information card should show the same original image without cropping');
 assert.match(museum,/#health-info \.grid>\.card::before\{\s*content:"";display:block;flex:0 0 auto;height:126px;/,
  'desktop thumbnails must not be narrow cropped slits');
 assert.match(museum,/#main-content>#health-info \.grid>\.card\{\s*display:flex;flex-direction:column;align-items:stretch;/,
  'health guides should retain vertical editorial structure');
 assert.match(museum,/#main-content>#health-info \.grid>\.card>p:last-child\{\s*margin-top:auto;/,
  'short health information cards should align the reading link to their foot');
 assert.match(museum,/#health-info \.grid>\.card::before\{\s*height:112px;/,
  'mobile health card thumbnails must remain legible');
});


test('regression: portrait cannot create a second grid column that squashes title on phones',()=>{
 const hero=home.match(/<section class="hero wrap">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(hero.includes('<h1 id="headline">')&&hero.includes('class="art hero-artwork"'));
 const fix=museum.slice(museum.lastIndexOf('CRITICAL MOBILE FIRST-SCREEN FIX'));
 assert.ok(fix.startsWith('CRITICAL MOBILE FIRST-SCREEN FIX'),'fix must be final CSS to win cascade');
 assert.match(fix,/@media \(max-width:600px\)\{/);
 assert.match(fix,/#main-content>\.hero\.wrap\{\s*display:grid;\s*grid-template-columns:minmax\(0,1fr\);/);
 for (const [selector,row] of [
  ['>div:first-child',1],
  ['>.art.hero-artwork',2],
  ['>.hero-editorial-detail',3]
 ]){
  const literal='body.home-page #main-content>.hero.wrap'+selector;
  const block=fix.slice(fix.indexOf(literal),fix.indexOf('}',fix.indexOf(literal))+1);
  assert.ok(block.startsWith(literal+'{'), 'missing mobile row: '+literal);
  assert.match(block,/grid-column:1\s*\/\s*-1;/,'must span the sole grid column: '+selector);
  assert.ok(block.includes('grid-row:'+row+';'),'wrong vertical order of '+selector);
 }
 const art=fix.slice(fix.indexOf('body.home-page #main-content>.hero.wrap>.art.hero-artwork{'));
 assert.match(art,/grid-row:2;[\s\S]*?display:block;/);
 const title=fix.slice(fix.indexOf('body.home-page #main-content>.hero.wrap #headline{'));
 assert.match(title,/width:100%;[\s\S]*?word-break:keep-all;/);
 const buttons=fix.slice(fix.indexOf('body.home-page #main-content>.hero.wrap .hero-actions{'));
 assert.match(buttons,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(fix,/#main-content>\.hero\.wrap \.hero-actions>\.hero-booking\{\s*grid-column:2;order:1;/);
});


test('featured exhibition thumbnails open the matching artwork with a visible target state',()=>{
 const gallery=read('gallery.html');
 const galleryCss=read('assets/clinic-gallery.css');
 const homeCss=read('assets/atelier-home-2026.css');
 const preview=home.match(/<section class="atelier-collection-peek"[\s\S]*?<\/section>/)?.[0] || '';
 assert.ok(preview,'the curated homepage exhibition remains present');
 for(const [id,number,label] of [
  ['art-starry','01','STARRY NIGHT'],
  ['art-golden','03','GOLDEN GARDEN']
 ]){
  assert.ok(preview.includes('href="/gallery.html#'+id+'"'),'missing homepage artwork '+id);
  assert.ok(preview.includes(number+' · '+label),'wrong gallery catalogue number for '+id);
  assert.ok(gallery.includes('id="'+id+'"'),'gallery target is missing: '+id);
 }
 assert.match(gallery, /href="\/assets\/clinic-gallery\.css\?v=/,
  'versioned stylesheet must ship the selected-artwork appearance');
 assert.match(galleryCss, /#paintings \.gallery-piece:target\{/,
  'direct artwork links should visually identify the selected painting');
 assert.match(galleryCss, /scroll-margin-top:105px/,
  'target paintings should not appear behind the sticky header');
 assert.match(homeCss, /Atelier edition VIII/,
  'homepage gallery numbering polish should ship');
});


test('mobile hero artwork preload prioritizes the visible doctor-cat portrait',()=>{
 const hero=home.match(/<section class="hero wrap">([\s\S]*?)<\/section>/)?.[1]||'';
 const portrait=hero.match(/<img\b[^>]*src="\/assets\/ejoeundental-hero-cat\.webp"[^>]*>/)?.[0]||'';
 assert.ok(portrait,'the original doctor and white cat hero portrait must stay');
 assert.match(portrait,/loading="eager"/,'above-the-fold mobile portrait must not lazy-load');
 assert.match(portrait,/fetchpriority="high"/,'load the visible portrait early');
 const imagePreloads=[...home.matchAll(/<link rel="preload" as="image"[^>]*>/g)].map(x=>x[0]);
 assert.equal(imagePreloads.length,1,'avoid preloading multiple competing hero images');
 assert.ok(imagePreloads[0].includes('href="/assets/ejoeundental-hero-cat.webp"'),
  'preload should match the portrait shown on phones and desktops');
 assert.ok(!imagePreloads[0].includes('media="(min-width: 601px)"'),
  'preload must also apply to the mobile layout');
 assert.ok(!home.includes('media="(max-width: 600px)" href="/assets/impressionist-water-garden.svg"'),
  'do not prioritize the redundant garden decorative strip that is hidden on phones');
 assert.ok(hero.indexOf('class="hero-actions"')<hero.indexOf('class="art hero-artwork"'),
  'telephone and booking calls to action remain before the portrait on phones');
});
