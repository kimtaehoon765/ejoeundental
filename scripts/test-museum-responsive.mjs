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


test('mobile quick navigation remains readable without removing booking or story actions',()=>{
 const atelier=read('assets/atelier-home-2026.css');
 const nav=home.match(/<div class="mobile-quick">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.equal((nav.match(/<a\b/g)||[]).length,5,
  'patient first-screen navigation keeps all five key destinations');
 for(const target of ['#symptom-navigator-title','#home-symptom-query',
  '/stories.html','#location','tel:0325132875']){
  assert.ok(nav.includes('href="'+target+'"'),'missing mobile quick link: '+target);
 }
 assert.match(atelier,/Atelier edition IX · Mobile wayfinding/);
 assert.match(atelier,/min-width:0;min-height:49px;/,
  'mobile links retain nearly 50px touch targets');
 assert.match(atelier,/font-size:clamp\(11px,2\.95vw,12\.5px\)/,
  'initial mobile labels must not shrink to the older 10px');
 assert.match(atelier,/html\.home-scrolled body\.home-page header \.nav \.mobile-quick a\.stories-mobile-link/,
  'readers can still find the journal from the compact scrolled header');
 assert.match(atelier,/a\.mobile-call\{/,
  'the phone shortcut keeps its stronger contrast');
 assert.ok(home.includes('class="btn hero-booking"'),
  'Naver booking is still visible in the hero');
});


test('final responsive layer places phone and Naver booking above secondary guides',()=>{
 const finalCss=read('assets/curatorial-home.css');
 const styles=[...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 const finalStyle=styles.find(s=>s.includes('/assets/curatorial-home.css?'));
 assert.ok(finalStyle,'the final responsive stylesheet must be linked');
 assert.ok(styles.indexOf(finalStyle)>styles.findIndex(s=>s.includes('/assets/museum-home-v2.css')),
  'final mobile layout must win over the original two-column layout');
 assert.ok(styles.indexOf(finalStyle)>styles.findIndex(s=>s.includes('/assets/atelier-home-2026.css')),
  'the last responsive layer must load after the editorial refinements');
 const hero=home.match(/<div class="hero-actions">([\s\S]*?)<\/div>/)?.[1]||'';
 const booking=hero.match(/<a\b[^>]*class="btn hero-booking"[^>]*>/)?.[0]||'';
 const phone=hero.match(/<a\b[^>]*class="btn hero-call"[^>]*>/)?.[0]||'';
 assert.ok(phone.includes('href="tel:0325132875"'));
 assert.ok(booking,'build must render the real booking anchor, not a placeholder');
 assert.match(booking,/href="https:\/\/booking\.naver\.com\/booking\/13\/bizes\/1162931"/);
 for(const cls of ['hero-hours','hero-symptoms','hero-map']){
  assert.ok(hero.includes('class="btn '+cls+'"'),'keep secondary patient link: '+cls);
 }
 const start=finalCss.lastIndexOf('Mobile arrival refinement');
 assert.ok(start>=0,'final responsive base is missing');
 const final=finalCss.slice(start);
 assert.match(final, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/,
  'mobile phone and booking row needs six grid tracks');
 assert.match(final,/\.hero-actions>\.hero-call\{\s*display:flex;grid-column:1 \/ span 3;grid-row:1;order:0;/);
 assert.match(final,/\.hero-actions>\.hero-booking\{\s*display:flex;grid-column:4 \/ span 3;grid-row:1;order:1;/);
 assert.match(final,/\.hero-actions>\.hero-hours\{\s*grid-column:1 \/ span 2;grid-row:2;order:2;/);
 assert.match(final,/\.hero-actions>\.hero-symptoms\{\s*grid-column:3 \/ span 2;grid-row:2;order:3;/);
 assert.match(final,/\.hero-actions>\.hero-map\{\s*grid-column:5 \/ span 2;grid-row:2;order:4;/);
 assert.match(final, /@media\(max-width:365px\)/);
 assert.match(final, /\.hero-actions>\.hero-map\{\s*grid-column:1 \/ -1;grid-row:3;min-height:44px;/,
  'the map guide must not be squeezed to one third of a tiny phone');
});

test('mobile art and medical SEO survive the curatorial mobile layer',()=>{
 const css=read('assets/curatorial-home.css');
 const mobile=css.slice(css.lastIndexOf('Mobile arrival refinement'));
 assert.match(mobile, /\.hero\.wrap>\.art\.hero-artwork\{[\s\S]*?grid-column:1 \/ -1;[\s\S]*?grid-row:2;/,
  'portrait must remain in the full-width second hero row');
 assert.match(mobile, /\.hero\.wrap>\.hero-editorial-detail\{[\s\S]*?grid-column:1 \/ -1;[\s\S]*?grid-row:3;/,
  'clinical SEO text must remain after the portrait');
 assert.ok(home.includes('name="google-site-verification"'));
 assert.ok(home.includes('name="naver-site-verification"'));
 assert.ok(home.includes('rel="canonical" href="https://ejoeundental.com/"'));
 assert.ok(home.includes('src="/assets/ejoeundental-hero-cat.webp"'));
 assert.ok(home.includes('class="mobile-booking-actions"'),
  'the independent mobile telephone/booking dock must survive the build');
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'/g,'');
 let depth=0;
 for(const ch of clean){
  if(ch==='{')depth++;
  if(ch==='}')depth--;
  assert.ok(depth>=0,'curatorial CSS has an unmatched closing brace');
 }
 assert.equal(depth,0,'curatorial CSS has an unclosed block');
});


test('release fingerprint matches the GitHub or Cloudflare build commit',()=>{
 const commit=home.match(/<meta name="ejoeundental-build-commit" content="([^"]+)">/)?.[1];
 const source=home.match(/<meta name="ejoeundental-build-source" content="([^"]+)">/)?.[1];
 assert.ok(commit,'build must expose a version identifier for deployment verification');
 assert.match(commit,/^(?:[0-9a-f]{40}|local)$/);
 assert.ok(['cloudflare-pages','github-actions','local'].includes(source));
 const expectedCloudflare=String(process.env.CF_PAGES_COMMIT_SHA||'').toLowerCase();
 const expectedGitHub=String(process.env.GITHUB_SHA||'').toLowerCase();
 const sha=/^[0-9a-f]{40}$/;
 if(sha.test(expectedCloudflare)){
  assert.equal(commit,expectedCloudflare);
  assert.equal(source,'cloudflare-pages');
 }else if(sha.test(expectedGitHub)){
  assert.equal(commit,expectedGitHub);
  assert.equal(source,'github-actions');
 }else{
  assert.equal(commit,'local');
  assert.equal(source,'local');
 }
});


test('museum wall has one lead painting and two companion originals without cropping',()=>{
 const html=home.match(/<section class="curated-threshold wrap"[\s\S]*?<\/section>/)?.[0]||'';
 const art=[...html.matchAll(/<a class="curated-threshold__piece" href="([^"]+)">[\s\S]*?<img src="([^"]+)"[^>]*alt="([^"]+)"/g)];
 assert.equal(art.length,3,'all three original paintings must remain visible and linked');
 for(const [,href,src,alt] of art){
  assert.ok(href.startsWith('/gallery.html#art-'),'art must open the real gallery item');
  assert.ok(src.startsWith('/assets/'),'art must be an existing local image');
  assert.ok(alt.length>15,'image alt should describe the artwork');
  assert.ok(existsSync('dist'+src),'painting must ship in production output: '+src);
 }
 const css=read('assets/curatorial-home.css');
 const final=css.slice(css.indexOf('Exhibition wall edition — 2026-10-29'));
 assert.ok(final.length>1000,'exhibition wall visual layout is missing');
 assert.match(final, /@media\(min-width:761px\)/);
 assert.match(final, /grid-template-columns:minmax\(0,1\.28fr\) minmax\(0,1fr\)/);
 assert.match(final, /\.curated-threshold__piece:nth-child\(1\)\{\s*grid-column:1;\s*grid-row:1 \/ span 2;/);
 assert.match(final, /\.curated-threshold__piece:nth-child\(2\)\{\s*grid-column:2;\s*grid-row:1;/);
 assert.match(final, /\.curated-threshold__piece:nth-child\(3\)\{\s*grid-column:2;\s*grid-row:2;/);
 assert.match(final, /object-fit:contain;/,'paintings must not be cropped');
 assert.match(final, /@media\(max-width:600px\)/);
 assert.match(final, /flex-basis:min\(79vw,285px\)/,
  'mobile preserves a prominent first image and swipeable companion artworks');
 assert.match(css,/scroll-snap-type:x mandatory;/,
  'mobile gallery still needs its existing swipe behavior');
 assert.ok(home.includes('curatorial-home.css?'),
  'the production homepage must load the final exhibition layer');
});


test('clinical exhibit cards keep all five genuine treatment links and illustrations',()=>{
 const section=home.match(/<section class="section light" id="focus-care">([\s\S]*?)<\/section>/)?.[1]||'';
 const nav=section.match(/<nav class="focus-care-shortcuts"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 const cards=[...nav.matchAll(/<a href="([^"]+)"><strong>([^<]+)<\/strong><span>([^<]+)<\/span><\/a>/g)];
 assert.equal(cards.length,5,'five original clinical services must remain crawlable');
 assert.deepEqual(cards.map(x=>x[1]),[
  '/gum-treatment.html',
  '/retreatment.html',
  '/cervical-abrasion.html',
  '/insured-care.html',
  '/scaling.html'
 ]);
 for(const [,href,title,desc] of cards){
  assert.ok(title.trim().length>=3&&desc.trim().length>=6,'cards retain readable clinical titles and descriptions');
  assert.ok(existsSync('dist'+href),'every clinical card must resolve to a real page');
 }
 const images=['care-illustration-abrasion.svg','care-illustration-insurance.svg','care-illustration-scaling.svg'];
 for(const image of images)assert.ok(existsSync('dist/assets/'+image),
  'original art must remain included: '+image);
 const css=read('assets/curatorial-home.css');
 const final=css.slice(css.indexOf('Clinical exhibition cards — 2026-10-29'));
 assert.ok(final.length>1500,'gallery-style care card design is missing');
 assert.match(final,/\.focus-care-shortcuts>a:nth-child\(-n\+2\)/,
  'the two featured care cards retain prominence');
 assert.match(final,/background-size:contain;/,
  'medical diagrams must not be cropped');
 assert.match(final,/@media\(max-width:700px\)/,
  'narrow-screen cards need smaller reading geometry');
 assert.match(final,/:focus-visible\{/,
  'keyboard patients need an obvious focus indicator');
 assert.match(final,/@media\(forced-colors:active\)/,
  'high-contrast accessibility must remain usable');
 assert.ok(home.includes('curatorial-home.css?'),
  'visual layer must load on homepage');
});


test('reading room keeps full patient clinical text and improves mobile links without hiding content',()=>{
 const symptom=home.match(/<section class="section" id="symptoms"[\s\S]*?<\/section>/)?.[0]||'';
 const care=home.match(/<section class="section" id="care"[\s\S]*?<\/section>/)?.[0]||'';
 const education=home.match(/<section class="section light" id="health-info"[\s\S]*?<\/section>/)?.[0]||'';
 assert.equal((symptom.match(/<div class="card">/g)||[]).length,7,
  'all seven patient symptom explanations must remain present');
 assert.equal((care.match(/<div class="card care-(?:preservation-feature|primary-card)">/g)||[]).length,5,
  'all five immediately visible care descriptions must remain present');
 for(const text of ['잇몸에서 피가 나요','신경치료한 치아가 다시 아파요',
   '치료비와 보험 적용이 궁금해요']){
  assert.ok(symptom.includes(text),'do not remove a symptom explanation: '+text);
 }
 for(const text of ['자연치아를 살리는 치료부터','재신경치료','치경부마모증']){
  assert.ok(care.includes(text),'do not remove a medical guide: '+text);
 }
 assert.ok(education.includes('health-topic-grid'),'health illustrations must remain');
 assert.ok(symptom.includes('href="/health/gum-bleeding.html"'));
 assert.ok(care.includes('href="/retreatment.html"'));
 assert.ok(home.includes('class="mobile-booking-actions"'));
 const css=read('assets/curatorial-home.css');
 const area=css.slice(css.indexOf('Reading room edition — 2026-10-29'));
 assert.ok(area.length>3000,'final readability layer missing');
 assert.match(area, /@media\(min-width:960px\)/,
  'desktop paragraphs need comfortable wider columns');
 assert.match(area, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(area, /@media\(max-width:959px\)/,
  'mobile and tablet should use full-width symptom explanations');
 assert.match(area, /min-height:48px;/,'phone links should be touch-friendly');
 assert.match(area, /background-size:contain;/,'clinic illustrations should not crop');
 assert.match(area, /:focus-visible/,'keyboard patients need visible focus');
 const hiddenSelectors=[...area.matchAll(/([^{}]+)\{[^{}]*display:\s*none;[^{}]*\}/g)]
  .map(m=>m[1].trim()).sort();
 assert.deepEqual(hiddenSelectors,[
  'body.home-page #main-content>#symptoms .symptom-grid>.card>br',
  'body.home-page #main-content>#care>.wrap>.grid>.card>p:last-child br'
 ].sort(),'only redundant visual line breaks, never medical text or links, may be hidden');
});
