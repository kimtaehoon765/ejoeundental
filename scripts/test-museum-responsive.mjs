import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';

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
  'care-illustration-scaling.svg','impressionist-water-garden.svg','ejoeun-gallery-cat-dentist-20261029.webp']){
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
 assert.ok(hero.includes('class="art hero-artwork"') && hero.includes('src="/assets/ejoeun-gallery-cat-dentist-20261029.webp"'),
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
  ['art-lakeside-flower-clinic','06','LAKESIDE BLOOMS'],
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
 const portrait=hero.match(/<img\b[^>]*src="\/assets\/ejoeun-gallery-cat-dentist-20261029\.webp"[^>]*>/)?.[0]||'';
 assert.ok(portrait,'the original doctor and white cat hero portrait must stay');
 assert.match(portrait,/loading="eager"/,'above-the-fold mobile portrait must not lazy-load');
 assert.match(portrait,/fetchpriority="high"/,'load the visible portrait early');
 const imagePreloads=[...home.matchAll(/<link rel="preload" as="image"[^>]*>/g)].map(x=>x[0]);
 assert.equal(imagePreloads.length,1,'avoid preloading multiple competing hero images');
 assert.ok(imagePreloads[0].includes('href="/assets/ejoeun-gallery-cat-dentist-20261029.webp"'),
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
 assert.ok(home.includes('src="/assets/ejoeun-gallery-cat-dentist-20261029.webp"'));
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


test('museum journal and visit guide preserve original blogs, clinic hours, maps and booking',()=>{
 const journal=home.match(/<section class="section light" id="stories">[\s\S]*?<\/section>/)?.[0]||'';
 const visit=home.match(/<section class="section" id="location">[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(journal&&visit,'both journal and visiting sections must exist');
 for(const fact of ['네이버 블로그 글 509편','원장 블로그에서 다시 읽는 치과 이야기 7편',
   'BUILD_HOME_STORY_COUNT','BUILD_PUBLIC_STORIES','원장이 전하는 치과 이야기']){
  if(fact.startsWith('BUILD_'))continue;
  assert.ok(journal.includes(fact),'do not remove journal content: '+fact);
 }
 assert.ok(journal.includes('href="/stories.html"'));
 assert.ok(journal.includes('href="/clinical-archive.html#archive-blog-posts"'));
 assert.ok(journal.includes('https://blog.naver.com/kook765/'));
 assert.ok(journal.includes('id="home-owner-post-search"'),'journal source search must survive');
 assert.ok(journal.includes('class="owner-stories-more"'),'original blog archive remains accessible');
 assert.ok(journal.includes('class="journal-gallery-cover"'),'existing cat illustration stays in journal');
 for(const fact of ['세월천로 34','대우프라자 305호','3시간 무료','격주 운영',
   '09:30~13:00','09:30~18:30','tel:0325132875']){
  assert.ok(visit.includes(fact),'do not remove practical visit facts: '+fact);
 }
 assert.ok(visit.includes('href="https://map.naver.com/p/entry/place/13239400"'));
 assert.ok(visit.includes('href="/clinic-contact.vcf"'));
 assert.equal((visit.match(/class="alternating-hours-card"/g)||[]).length,2,
  'two distinct alternating Friday/Saturday schedules must remain');
 const css=read('assets/curatorial-home.css');
 const section=css.slice(css.indexOf('Journal and visitor gallery edition — 2026-10-29'));
 assert.ok(section.length>4500,'editorial visual styling must be included in final layer');
 assert.ok(section.includes('.visit-quick-facts')&&section.includes('.alternating-hours-grid'));
 assert.match(section, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(section, /@media\(max-width:1000px\)/);
 assert.match(section, /@media\(max-width:700px\)/);
 assert.match(section, /min-height:48px;/,'tap targets must stay usable on phones');
 assert.match(section, /:focus-visible/,'keyboard access to clinic links must remain');
 assert.ok(home.includes('class="mobile-booking-actions"'),'fixed booking dock must remain');
 assert.ok(home.includes('name="google-site-verification"'));
 assert.ok(home.includes('name="naver-site-verification"'));
 assert.ok(home.includes('rel="canonical" href="https://ejoeundental.com/"'));
});


test('fixed mobile dock keeps all three patient actions on one row',()=>{
 const styles=read('assets/home-enhancements.css');
 const start=styles.indexOf('Three verified mobile bottom actions');
 assert.ok(start>=0,'three-action mobile dock style must be present');
 const dockCss=styles.slice(start,styles.indexOf('/* Clinically balanced referral path',start));
 assert.match(dockCss,/grid-template-columns:minmax\(0,\.82fr\) minmax\(0,1\.32fr\) minmax\(0,1fr\)/,
  'three fixed actions need three flexible columns, not the old two-column grid');
 assert.match(dockCss,/padding-bottom:calc\(82px \+ env\(safe-area-inset-bottom,0px\)\)/,
  'reserve enough scroll space for the full bottom dock');
 assert.match(dockCss,/\.mobile-booking-visit\{/,
  'visit guide link must have visible keyboard/touch styling');
 assert.match(dockCss,/@media\(max-width:360px\)/,
  'dock needs compact padding on very narrow phone screens');
 const dock=home.match(/<nav class="mobile-booking-actions"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.equal((dock.match(/<a\b/g)||[]).length,3,'mobile dock needs exactly three existing actions');
 for(const cls of ['mobile-booking-call','mobile-booking-naver','mobile-booking-visit']){
  assert.ok(dock.includes('class="'+cls+'"'),'missing mobile action '+cls);
 }
 assert.ok(dock.includes('href="tel:0325132875"'),'phone action must dial clinic');
 assert.ok(dock.includes('href="https://booking.naver.com/booking/13/bizes/1162931"'),
  'booking action must retain verified Naver destination');
 assert.ok(dock.includes('href="/visit-guide.html"'),'visit action must retain guide');
});

test('museum identity unifies the first screen while retaining functional patient actions',()=>{
 const hero=home.match(/<section class="hero wrap">[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(hero.includes('id="headline"'),'original hero heading must remain');
 assert.ok(hero.includes('고려대학교 의학박사(치과학 전공)'));
 assert.ok(hero.includes('통합치의학과 전문의'));
 assert.ok(hero.includes('src="/assets/ejoeun-gallery-cat-dentist-20261029.webp"'),'white cat and doctor original remain');
 assert.ok(hero.includes('<!-- BUILD_NAVER_BOOKING_HERO -->')===false,
   'the booking placeholder should be replaced in the production build');
 const buttons=hero.match(/<div class="hero-actions">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.ok(buttons.includes('class="btn hero-call"'),'primary phone action must remain');
 assert.ok(buttons.includes('class="btn hero-booking"'),'primary booking link must remain');
 assert.ok(buttons.includes('class="btn hero-hours"'));
 assert.ok(buttons.includes('class="btn hero-symptoms"'));
 assert.ok(buttons.includes('class="btn hero-map"'));
 const mobile=home.match(/<div class="mobile-quick">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.equal((mobile.match(/<a\b/g)||[]).length,5,
  'all five initial navigation shortcuts stay accessible');
 assert.ok(home.includes('class="mobile-booking-actions"'),
  'sticky phone and booking controls must remain accessible');
 assert.ok(home.includes('rel="canonical" href="https://ejoeundental.com/"'));
 assert.ok(home.includes('name="naver-site-verification"'));
 assert.ok(home.includes('name="google-site-verification"'));
 const css=read('assets/curatorial-home.css');
 const area=css.slice(css.indexOf('Museum identity and mobile first impression — 2026-10-29'));
 assert.ok(area.length>3200,'unified typography and color styles must load');
 for(const token of ['--museum-pine:','--museum-gold:','--museum-border:']){
  assert.ok(area.includes(token),'common palette token missing: '+token);
 }
 assert.ok(area.includes('object-fit:contain;'),'original illustrated artwork must not crop');
 assert.match(area, /@media\(max-width:600px\)/);
 assert.match(area, /@media\(max-width:365px\)/);
 assert.match(area, /min-height:58px;/,'primary booking and phone need large mobile targets');
 assert.match(area, /:focus-visible/,'keyboard focus must be visible');
});


test('approved gutta-percha bacteria image replaces only the first retreatment cause',()=>{
 const page=read('retreatment.html');
 const section=page.match(/<h2>신경치료 후 다시 아픈 이유<\/h2>[\s\S]*?<div class="cards">([\s\S]*?)<\/div>/)?.[1]||'';
 const images=[...section.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g)].map(x=>x[1]);
 assert.deepEqual(images,[
  '/assets/retreatment/illustration-02-bacteria-gutta-percha-20261029.webp',
  '/assets/retreatment/illustration-03-crown-microleakage-20261029.webp',
  '/assets/retreatment/illustration-04.webp',
  '/assets/retreatment/illustration-05.webp'
 ],'only the retained-bacteria art may change');
 assert.ok(section.includes('거타퍼차 사이에 남아 있는 세균과 뿌리 끝 염증'));
 assert.ok(section.includes('<h3>남아 있는 세균</h3>'));
 const art=readFileSync('dist/assets/retreatment/illustration-02-bacteria-gutta-percha-20261029.webp');
 assert.ok(art.length>9000,'approved clinic art should be present as a real image');
 assert.equal(art.subarray(0,4).toString(),'RIFF');
 assert.equal(art.subarray(8,12).toString(),'WEBP');
 const css=read('assets/retreatment.css');
 assert.match(css,/\.cards \.card img\.bacteria-illustration\{/);
 assert.match(css,/object-fit:contain;/,'full illustration text must not be cropped');
 assert.match(page,/rel="canonical" href="https:\/\/ejoeundental\.com\/retreatment(?:\.html)?"/,
  'production canonical may use the extensionless route');
 assert.ok(page.includes('/assets/retreatment.css'),
  'production CSS may be fingerprinted but must be present');
});


test('owner-selected crown-margin microleakage painting replaces only the second retreatment cause',()=>{
 const page=read('retreatment.html');
 const causes=page.match(/<h2>신경치료 후 다시 아픈 이유<\/h2>[\s\S]*?<div class="cards">([\s\S]*?)<\/div>/)?.[1]||'';
 const cards=[...causes.matchAll(/<article class="card"><img[^>]*src="([^"]+)"[^>]*><h3>([^<]+)<\/h3>/g)];
 assert.equal(cards.length,4,'four cause cards must remain');
 assert.deepEqual(cards.map(x=>x[1]),[
  '/assets/retreatment/illustration-02-bacteria-gutta-percha-20261029.webp',
  '/assets/retreatment/illustration-03-crown-microleakage-20261029.webp',
  '/assets/retreatment/illustration-04.webp',
  '/assets/retreatment/illustration-05.webp'
 ]);
 assert.deepEqual(cards.map(x=>x[2]),[
  '남아 있는 세균','보철물 주변의 미세 누출','새로운 충치','뿌리 끝 염증의 지속'
 ]);
 assert.ok(causes.includes('크라운 경계의 틈으로 세균이 들어가고 치근단 염증'));
 const art=readFileSync('dist/assets/retreatment/illustration-03-crown-microleakage-20261029.webp');
 assert.ok(art.length>=4000,'actual new dental illustration must ship as WebP');
 assert.equal(art.subarray(0,4).toString(),'RIFF');
 assert.equal(art.subarray(8,12).toString(),'WEBP');
 const css=read('assets/retreatment.css');
 assert.ok(css.includes('.cards .card img.microleakage-illustration'));
 assert.ok(css.includes('object-fit:contain;'),'labels and apical lesion must not be cropped');
});


test('atelier entrance keeps the entire clinic journey visible and improves mobile art hierarchy',()=>{
 const hero=home.match(/<section class="hero wrap">[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(hero.includes('id="headline"'));
 assert.ok(hero.includes('src="/assets/ejoeun-gallery-cat-dentist-20261029.webp"'));
 assert.ok(hero.includes('고려대학교 의학박사(치과학 전공)'));
 assert.ok(hero.includes('통합치의학과 전문의'));
 const actions=hero.match(/<div class="hero-actions">([\s\S]*?)<\/div>/)?.[1]||'';
 for(const cls of ['hero-call','hero-booking','hero-hours','hero-symptoms','hero-map']){
  assert.ok(actions.includes('class="btn '+cls+'"'),cls+' patient action missing');
 }
 assert.ok(hero.includes('class="hero-editorial-detail"'),'original medical guidance remains visible');
 assert.ok(home.includes('class="mobile-booking-actions"'),'mobile fixed call and booking must remain');
 assert.ok(home.includes('name="google-site-verification"'));
 assert.ok(home.includes('name="naver-site-verification"'));
 assert.ok(home.includes('rel="canonical" href="https://ejoeundental.com/"'));
 const styles=read('assets/curatorial-home.css');
 const refined=styles.slice(styles.indexOf('Atelier entrance refinements — 2026-10-29'));
 assert.ok(refined.length>3000,'final gallery entrance styling must be shipped');
 assert.ok(refined.includes('이조은치과  ·  SINCE 2003'),'gallery plaque should identify the clinic');
 assert.match(refined,/object-fit:contain;/,'original doctor and white cat painting must not crop');
 assert.match(refined,/@media\(max-width:600px\)/);
 assert.match(refined,/@media\(max-width:365px\)/);
 assert.match(refined,/min-height:58px;/,'phone and Naver booking must have usable touch size');
 assert.match(refined,/:focus-visible/,'links should retain visible keyboard focus');
 assert.match(refined,/@media\(forced-colors:active\)/);
 assert.ok(home.includes('/assets/curatorial-home.css?'), 'versioned premium gallery stylesheet must load after the build');
});

test('patient-art gallery keeps 10 unique originals and graceful no-JS viewing',()=>{
 const gallery=read('gallery.html');
 const styles=read('assets/gallery-patient-studies.css');
 const script=read('assets/clinic-gallery.js');
 const block=gallery.match(/<section class="gallery-patient-studies"[\s\S]*?<\/section>/)?.[0]||'';
 const figures=[...block.matchAll(/<figure class="gallery-patient-studies__piece"[\s\S]*?<\/figure>/g)].map(m=>m[0]);
 assert.equal(figures.length,10,'exactly 10 original patient artworks must appear');
 const paths=new Set();
 for(const figure of figures){
  const image=figure.match(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/)?.[1];
  assert.ok(image?.startsWith('/assets/')&&image.endsWith('.svg'));
  assert.ok(!paths.has(image),'duplicate patient art: '+image);
  paths.add(image);
  assert.ok(existsSync('dist'+image),'gallery illustration must be in built assets: '+image);
  assert.ok(figure.includes('loading="lazy"'),'below-the-fold art should load lazily');
  assert.ok(figure.includes('class="gallery-patient-studies__original" href="'+image+'"'),
    'without JavaScript there must be a direct original-image link');
  assert.ok(figure.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(figure.includes('class="gallery-zoom"')&&figure.includes('data-image="'+image+'"'));
  assert.match(figure, /href="\/[a-z0-9-]+\.html">관련 건강정보 보기 →<\/a>/);
 }
 assert.match(styles,/\.gallery-patient-studies__actions \.gallery-zoom\{display:none\}/);
 assert.match(styles,/\.gallery-js \.gallery-patient-studies__actions \.gallery-zoom\{display:inline-flex\}/);
 assert.match(script,/artworks=\[\.\.\.document\.querySelectorAll\('\.gallery-zoom'\)\]/);
 assert.equal((gallery.match(/class="gallery-zoom"/g)||[]).length,23,
   '10 paintings, 3 watercolors and 10 patient studies must stay navigable');
 assert.ok(gallery.includes('id="patient-studies"'));
 for(const id of ['patient-art-safety','patient-art-medication','patient-art-child','patient-art-insurance']){
  assert.ok(block.includes('href="#'+id+'"')&&block.includes('id="'+id+'"'));
 }
 assert.ok(home.includes('href="/gallery.html#patient-studies"'),
  'home art section must expose the new patient gallery');
});

test('gallery SEO image collection agrees with the 23 real original artworks',()=>{
 const gallery=read('gallery.html');
 const collection=gallery.match(/<script type="application\/ld\+json">(\{[^\n]*"@type":"CollectionPage"[^\n]*\})<\/script>/)?.[1];
 assert.ok(collection,'gallery CollectionPage JSON-LD must be present');
 const data=JSON.parse(collection);
 assert.equal(data['@type'],'CollectionPage');
 assert.equal(data.mainEntity?.['@type'],'ImageGallery');
 const media=data.mainEntity.associatedMedia||[];
 assert.equal(media.length,23,'all 23 distinct original artworks must be indexed in ImageGallery metadata');
 const originals=[...gallery.matchAll(/<figure class="gallery-piece\b[^>]*>[\s\S]*?<\/figure>/g)].map(m=>m[0]);
 const clinical=[...gallery.matchAll(/<a class="gallery-note gallery-note--watercolor"[^>]*>[\s\S]*?<\/a>/g)].map(m=>m[0]);
 const studies=[...gallery.matchAll(/<figure class="gallery-patient-studies__piece"[^>]*>[\s\S]*?<\/figure>/g)].map(m=>m[0]);
 assert.deepEqual([originals.length,clinical.length,studies.length],[10,3,10]);
 const sources=[...originals,...clinical,...studies].map(markup=>
  markup.match(/<img\b[^>]*\bsrc="([^"]+)"/)?.[1]
 );
 assert.equal(new Set(sources).size,23,'gallery must not reuse the same image as a new artwork');
 for(let i=0;i<sources.length;i++){
  assert.equal(media[i]['@type'],'ImageObject');
  assert.equal(media[i].contentUrl,'https://ejoeundental.com'+sources[i],
   'structured image and actual artwork must be identical');
  assert.ok(existsSync('dist'+sources[i]),'referenced gallery image must ship in build: '+sources[i]);
 }
 assert.ok(gallery.includes('rel="canonical" href="https://ejoeundental.com/gallery.html"'));
 assert.ok(gallery.includes('<meta name="description" content="인천 부평구 청천동 이조은치과의 창작 갤러리 23점.'));
 assert.ok(gallery.includes('<meta property="og:title" content="치과 그림 갤러리 23점'));
 assert.ok(gallery.includes('<meta name="twitter:description" content="인천 부평구 청천동'));
});

test('first-screen clinical guide cards show readable care titles and supporting descriptions',()=>{
 const source=readFileSync('index.html','utf8');
 const hero=source.match(/<section class="hero wrap">([\s\S]*?)<\/section>/)?.[1]||'';
 const nav=hero.match(/<nav class="hero-care-summary"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 const primary=nav.slice(0,nav.indexOf('<details class="hero-more-care">'));
 const anchors=[...primary.matchAll(/<a href="([^"]+)">([\s\S]*?)<\/a>/g)];
 const expected=[
  ['/gum-treatment.html','인천·부평 잇몸치료'],
  ['/retreatment.html','인천 신경치료·부평 신경치료 후 통증'],
  ['/cervical-abrasion.html','찬물에 시린 이'],
  ['/insured-care.html','건강보험 적용 진료 알아보기']
 ];
 assert.deepEqual(anchors.map(x=>x[1]),expected.map(x=>x[0]));
 for(let i=0;i<anchors.length;i++){
  const content=anchors[i][2],title=expected[i][1];
  assert.ok(content.includes('<span class="hero-care-card__copy"><strong>'+title+'</strong>'),
    'gallery-like title must remain readable and search-visible for '+title);
  assert.match(content,/<\/strong><span>[^<]{5,}<\/span><\/span>/,
    'supporting patient information should have a distinct visual size');
  assert.ok(content.includes('class="hero-care-card__arrow" aria-hidden="true"'),
    'decorative arrow should not be announced by screen readers');
 }
 assert.equal((nav.match(/<details class="hero-more-care">/g)||[]).length,1,
   'the eight extra treatment links must remain expandable and crawlable');
 const css=read('assets/atelier-refinement-20261030.css');
 for(const token of [
  'First-screen care collection: readable catalogue labels',
  '.hero-care-card__copy > strong',
  '.hero-care-card__copy > span',
  '.hero-care-card__arrow',
  '@media (max-width:760px)'
 ]){
  assert.ok(css.includes(token),'missing accessible patient-first care card styling: '+token);
 }
 assert.ok(hero.includes('<!-- BUILD_NAVER_BOOKING_HERO -->'));
});
test('six symptom guides appear before search without hiding care or previsit safety',()=>{
 const html=read('index.html');
 const start=html.indexOf('<section class="symptom-navigator wrap"');
 const end=html.indexOf('</section>',start);
 assert.ok(start>=0&&end>start,'symptom section should exist');
 const section=html.slice(start,end);
 const gridIndex=section.indexOf('<div class="symptom-navigator-grid">');
 const formIndex=section.indexOf('<form class="symptom-quick-search"');
 assert.ok(gridIndex>0&&formIndex>gridIndex,'browseable symptom questions must precede the search form');
 const grid=section.slice(gridIndex,formIndex);
 const links=[...grid.matchAll(/<a href="(\/health\/[a-z0-9-]+\.html)"/g)].map(m=>m[1]);
 assert.deepEqual(links,[
  '/health/gum-bleeding.html','/health/swollen-gums.html',
  '/health/abrasion-sensitive.html','/health/root-canal-after-pain.html',
  '/health/loose-tooth.html','/health/denture-loose.html'
 ]);
 assert.ok(section.includes('class="symptom-catalog-eyebrow"'));
 assert.ok(section.includes('class="symptom-search-intro"'));
 assert.ok(section.includes('id="home-symptom-query" name="q" type="search"'));
 assert.ok(section.includes('action="/search.html" method="get" role="search"'));
 assert.ok(section.includes('복용 중인 약이나 전신질환'));
 assert.ok(section.includes('임의로 중단하지 말고'));
 const css=read('assets/atelier-refinement-20261030.css');
 for(const fragment of [
  'Symptom-first reading room',
  '.symptom-catalog-eyebrow',
  '.symptom-search-intro',
  '.symptom-quick-search-row input',
  '#home-symptom-query',
  'scroll-margin-top:clamp(80px,13vw,122px)'
 ]){
  assert.ok(css.includes(fragment),'patient reading-room layout missing '+fragment);
 }
});
test('homepage patient navigation links eight distinct existing care topics using meaningful labels',()=>{
 const hero=home.match(/<details class="hero-more-care">([\s\S]*?)<\/details>/)?.[1]||'';
 assert.ok(hero.includes('다른 진료·건강정보 8개 더 보기'));
 const links=[...hero.matchAll(/<a href="(\/[a-z-]+\.html)">([^<]+)<\/a>/g)];
 assert.deepEqual(links.map(m=>m[1]),[
  '/cavity-treatment.html','/scaling.html','/denture.html','/implant.html',
  '/pediatric-dentistry.html','/wisdom-tooth.html','/tmj-care.html',
  '/medical-safety-guide.html'
 ]);
 assert.equal(new Set(links.map(m=>m[1])).size,links.length,'no duplicate patient topic links');
 for(const [,url,label] of links){
  assert.ok(existsSync('dist'+url),'real linked care page missing: '+url);
  assert.ok(label.length>=10&&label.length<=65,'make clinic topic anchor concise, not generic');
 }
 assert.ok(links[4][2].includes('어린이'));
 assert.ok(links[5][2].includes('신경관'));
 assert.ok(links[6][2].includes('턱관절'));
 const nav=home.match(/<nav class="hero-care-summary"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 assert.ok(nav.includes('href="/gum-treatment.html"')&&
  nav.includes('href="/retreatment.html"')&&
  nav.includes('href="/insured-care.html"'),
  'high-priority periodontal, retreatment and insurance entry points remain prominent');
});


test('October 30 gallery room keeps original art, booking and small-screen navigation readable',()=>{
 const source=readFileSync('index.html','utf8');
 const polish=read('assets/gallery-edition-polish.css');
 assert.ok(source.includes('/assets/gallery-edition-polish.css?v=20261030-gallery-wall-16'),
  'homepage must invalidate prior CSS cache to reveal the October exhibition wall');
 const wall=home.match(/<section class="curated-threshold wrap"[\s\S]*?<\/section>/)?.[0]||'';
 const works=[...wall.matchAll(/<a class="curated-threshold__piece" href="(\/gallery\.html#[^"]+)"[\s\S]*?<img src="([^"]+)"[^>]*>/g)];
 assert.equal(works.length,3,'retain the three distinct existing first-gallery paintings');
 assert.equal(new Set(works.map(m=>m[2])).size,3,'never display an identical image twice in the exhibition');
 for(const [,href,src] of works){
  assert.ok(home.includes(href)&&existsSync('dist'+src),'gallery wall must open a real artwork '+href);
 }
 assert.ok(wall.includes('창작 그림 23점을 소개합니다.'));
 const care=home.match(/<nav class="hero-care-summary"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.equal((care.match(/<a href="\/(?:gum-treatment|retreatment|cervical-abrasion|insured-care)\.html"/g)||[]).length,4);
 assert.ok(care.includes('class="hero-more-care"'),'other eight treatment links must remain available');
 assert.match(polish,/Gallery rooms XVI \/ October 30, 2026/);
 assert.match(polish,/counter-reset:gallery-care/,'care menu uses editorial numbering');
 assert.match(polish,/counter-increment:gallery-care/);
 assert.match(polish,/body\.home-page #main-content>\.curated-threshold\{/);
 assert.ok(polish.includes('linear-gradient(128deg,#17362c 0%,#234737 54%,#153329 100%)'),
  'gallery room must remain deep green, contrasting with the warm paper hero');
 assert.match(polish,/@media\(max-width:760px\)\{/);
 assert.match(polish,/@media\(max-width:600px\)\{/);
 assert.match(polish,/@media\(prefers-reduced-motion:reduce\)\{/);
 assert.match(polish,/@media\(forced-colors:active\)\{/);
 assert.ok(home.includes('name="google-site-verification"')&&
  home.includes('name="naver-site-verification"'));
 assert.ok(home.includes('class="btn hero-call"')&&home.includes('class="btn hero-booking"'));
 assert.ok(home.includes('class="mobile-booking-actions"'));
 assert.ok(home.includes('href="/gallery.html"')&&home.includes('src="/assets/ejoeun-gallery-cat-dentist-20261029.webp"'));
});


test('searchable owner journal offers an accessible first-result jump',()=>{
 const archive=read('clinical-archive.html');
 const script=read('assets/archive-topics.js');
 assert.ok(home.includes('id="home-owner-post-search"'), 'homepage journal search remains available');
 assert.match(archive,/id="archive-blog-collections"/,'public archive keeps its server-rendered topics');
 assert.match(archive,/\.archive-search \.archive-search-jump\[hidden\]\{display:none!important\}/,
   'hidden first-result button must not occupy space');
 assert.match(script,/jumpButton\.hidden = !firstMatch;/,
   'jump control appears only when a matching article exists');
 assert.match(script,/input\.addEventListener\('keydown', event => \{/,
   'keyboard patients can use Enter from the search input');
 assert.match(script,/firstMatch\.focus\(\{ preventScroll: true \}\)/,
   'result destination receives focus without navigating to Naver');
 assert.match(script,/input\.maxLength = 100;/,
   'archive search respects the homepage query length limit');
 assert.ok(script.includes("countLabel.textContent = inGroup + '편'"),
   'archive group counts must show matching articles, not original group totals');
 assert.ok(script.includes("countLabel.textContent = items.length + '편'"),
   'clearing archive filters must restore the original topic totals');
 assert.ok(script.includes("if (!count) continue;"),
   'search shortcuts must appear only for topics present in the actual articles');
 assert.ok(script.includes("quickTopics.className = 'archive-search-topics'"),
   'search shortcuts must be progressively rendered without altering original links');
 assert.ok(archive.includes('.archive-search-topic[aria-pressed="true"]'),
   'selected search shortcuts must have a clear active state');
});


test('patient-study lightbox links directly to the existing health guide while landscapes do not',()=>{
 const gallery=read('gallery.html');
 const script=read('assets/clinic-gallery.js');
 const css=read('assets/clinic-gallery.css');
 const patientSection=gallery.slice(gallery.indexOf('id="patient-studies"'),
   gallery.indexOf('class="gallery-endnote"'));
 const patientPieces=[...patientSection.matchAll(/<figure class="gallery-patient-studies__piece"[\s\S]*?<\/figure>/g)]
   .map(match=>match[0]);
 assert.equal(patientPieces.length,10,'all 10 original patient-study paintings remain');
 for(const piece of patientPieces){
  const href=piece.match(/class="gallery-patient-studies__actions"><a href="(\/[a-z0-9-]+\.html)"/)?.[1];
  assert.ok(href,'patient-study art must have its own real patient-education link');
  assert.ok(existsSync('dist'+href),'real health guide must exist: '+href);
  assert.ok(piece.includes('class="gallery-zoom"'),
   'patient-study artwork must keep its zoom control');
 }
 assert.equal((gallery.match(/class="gallery-zoom"/g)||[]).length,23,
   'all 23 paintings, including three clinical watercolors, must remain zoomable');
 assert.ok(gallery.includes('class="gallery-dialog-care" id="gallery-dialog-care" hidden'),
   'a related-reading action exists but starts hidden');
 assert.ok(script.includes("button.closest('.gallery-patient-studies__piece')"),
   'related link must be derived from the current patient-study artwork');
 assert.ok(script.includes("related.hidden=!hasGuide;"),
   'fine-art paintings must not show the previous medical link');
 assert.ok(script.includes("related.removeAttribute('href');"),
   'switching back to a painting must clear the old destination');
 assert.ok(css.includes('.gallery-dialog .gallery-dialog-care[hidden]{display:none!important}'));
 assert.ok(css.includes('.gallery-dialog.gallery-dialog--care #gallery-dialog-image'),
   'visible patient-guide action leaves room beneath the painting on phones');
});


test('built gallery lightbox URL changes whenever its JavaScript changes',()=>{
 const html=read('gallery.html');
 const script=readFileSync('dist/assets/clinic-gallery.js');
 const expected=createHash('sha256').update(script).digest('hex').slice(0,12);
 const urls=[...html.matchAll(/<script src="\/assets\/clinic-gallery\.js\?v=([a-f0-9]{12})" defer><\/script>/g)];
 assert.equal(urls.length,1,'gallery must load one fingerprinted lightbox script');
 assert.equal(urls[0][1],expected,
   'gallery lightbox URL must refresh on the same deployment as its source');
 assert.ok(html.includes('id="gallery-dialog-care" hidden'),
   'the new related-patient-guide action must ship with this script');
});


test('all three original watercolor cards retain medical links and accessible zoom',()=>{
 const html=read('gallery.html');
 const js=read('assets/clinic-gallery.js');
 const watercolorCss=read('assets/gallery-clinical-watercolors.css');
 const pieces=[...html.matchAll(/<div class="gallery-watercolor-card">([\s\S]*?)<\/div>/g)]
   .map(match=>match[1]);
 assert.equal(pieces.length,3,'three existing clinical watercolor images must remain');
 const expected=[
  ['/gum-treatment.html','watercolor-care-gum-20261029.webp'],
  ['/cervical-abrasion.html','watercolor-care-abrasion-20261029.webp'],
  ['/insured-care.html','watercolor-care-insurance-20261029.webp']
 ];
 for(let i=0;i<expected.length;i++){
  const [href,image]=expected[i];
  const card=pieces[i];
  assert.ok(card.includes('class="gallery-note gallery-note--watercolor" href="'+href+'"'),
   'the original full-card clinical navigation must remain');
  assert.ok(card.includes('class="gallery-zoom" data-image="/assets/'+image+'"'),
   'watercolor zoom must open its own actual image');
  assert.ok(card.includes('class="gallery-watercolor-original" href="/assets/'+image+'"'),
   'a no-script original image link must remain available for every watercolor');
  assert.ok(card.includes('target="_blank" rel="noopener noreferrer"'),
   'original image links must open in a safe separate tab');
  assert.ok(existsSync('dist/assets/'+image),'every zoom source must be published');
 }
 assert.ok(js.includes("button.closest('.gallery-watercolor-card')"),
  'lightbox must resolve watercolor guide from current original card');
 assert.ok(watercolorCss.includes('#education .gallery-watercolor-actions>.gallery-zoom{\n  display:none'),
  'no broken zoom buttons without browser modal support');
 assert.ok(watercolorCss.includes('.gallery-js #education .gallery-watercolor-actions>.gallery-zoom'),
  'show zoom controls only when modal support is active');
 assert.ok(watercolorCss.includes('min-height:46px'),
  'both original and zoom controls keep a large touch target');
 const css=readFileSync('dist/assets/gallery-clinical-watercolors.css');
 const expectedHash=createHash('sha256').update(css).digest('hex').slice(0,12);
 assert.ok(html.includes('/assets/gallery-clinical-watercolors.css?v='+expectedHash),
  'published watercolor stylesheet URL must invalidate stale cached CSS');
});


test("visit-guide shows two clear Friday/Saturday patterns without claiming this week's hours",()=>{
 const visit=read('visit-guide.html');
 const main=visit.match(/<section class="card"><h2 id="visit-hours">[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(main,'standalone visit guide must retain its full opening-hours section');
 assert.ok(main.includes('월~목: 09:30~18:30'));
 assert.ok(main.includes('점심시간: 13:00~14:00'));
 assert.ok(main.includes('오전 접수 마감: 12:30 / 오후 접수 마감: 18:00'));
 const cards=[...main.matchAll(/<div class="visit-cycle__card[^"]*">([\s\S]*?)<\/div>/g)].map(m=>m[1]);
 assert.equal(cards.length,2,'two Friday/Saturday schedules must be independently readable');
 assert.ok(cards[0].includes('토요일 진료 주'));
 assert.ok(cards[0].includes('금요일 <b>09:30~13:00</b>'));
 assert.ok(cards[0].includes('토요일 <b>09:30~13:00</b>'));
 assert.ok(cards[1].includes('토요일 휴진 주'));
 assert.ok(cards[1].includes('금요일 <b>09:30~18:30</b>'));
 assert.ok(cards[1].includes('토요일 <b>휴진</b>'));
 assert.ok(main.includes('이 페이지에는 이번 주의 확정 일정이 표시되지 않습니다.'),
  'static alternating-week pattern must not be misrepresented as current availability');
 assert.ok(main.includes('class="visit-cycle__contact" href="tel:0325132875"'),
  'the clinic must offer phone confirmation from the paired schedule cards');
 assert.match(visit, /@media\(max-width:600px\)\{\.visit-cycle\{[^}]+\}\.visit-cycle__grid\{grid-template-columns:minmax\(0,1fr\)/);
 assert.ok(visit.includes('class="visit-mobile-actions"'),
  'existing mobile booking, call and directions should remain available');
 assert.ok(home.includes('id="weekly-hours"')&&home.includes('토요일 휴진 주'),
  'home schedule and standalone visit guide must agree on alternating operation');
});


test('visit-guide address parking atlas keeps map and transit actions usable',()=>{
 const visit=read('visit-guide.html');
 const parking=visit.match(/<section class="card"><h2 id="visit-parking">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(parking,'visit-page parking section must exist');
 const cards=parking.match(/class="visit-arrival-(?:place|parking)"/g)||[];
 assert.equal(cards.length,2,'actual address and parking should be distinct accessible panels');
 assert.equal((parking.match(/id="visit-clinic-address"/g)||[]).length,1,
  'address text must remain the only address-copy source');
 assert.ok(parking.includes('data-copy-source="visit-clinic-address"'),
  'existing user-operated copy control must stay linked to original address');
 assert.ok(parking.includes('인천광역시 부평구 세월천로 34, 대우프라자 305호'));
 assert.ok(parking.includes('치과 진료 시 3시간 무료 주차'));
 const actions=parking.match(/<nav class="visit-arrival-actions"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 assert.ok(actions.includes('href="https://map.naver.com/p/entry/place/13239400"'),
  'the immediate navigation button must link to the existing verified Naver map place');
 assert.ok(actions.includes('target="_blank" rel="noopener noreferrer"'));
 assert.ok(actions.includes('href="#transit-heading"'),
  'transit button must stay in the visit guide rather than unnecessarily returning home');
 assert.ok(visit.includes('id="transit-heading"'));
 assert.ok(visit.includes('.visit-arrival-actions a{'));
 assert.ok(visit.includes('min-height:50px'),'map actions must have adequate touch targets');
 assert.ok(visit.includes('@media(max-width:650px){.visit-arrival-panel{grid-template-columns:minmax(0,1fr)'),
  'arrival info should stack on narrow phones without sideways overflow');
});


test('last home stylesheet prevents implicit phone-grid columns under 480px',()=>{
 const page=read('index.html');
 const finalCss=read('assets/home-art-direction-20261030.css');
 const pos=finalCss.lastIndexOf('Mobile hero action-grid alignment');
 assert.ok(pos>0,'the final art-direction layer must normalize the mobile hero');
 const grid=finalCss.slice(pos);
 assert.match(grid, /@media\(max-width:600px\)\{/);
 assert.match(grid, /\.hero-actions\{\s*display:grid;\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\);/);
 const placements=[
  ['hero-call','grid-column:1;','grid-row:1;'],
  ['hero-booking','grid-column:2;','grid-row:1;'],
  ['hero-hours','grid-column:1;','grid-row:2;'],
  ['hero-symptoms','grid-column:2;','grid-row:2;'],
  ['hero-map','grid-column:1 / -1;','grid-row:3;']
 ];
 for(const [name,col,row] of placements){
  const css=grid.match(new RegExp('\\.hero-actions>\\.'+name+'\\{([^}]+)\\}'))?.[1]||'';
  assert.ok(css.includes(col)&&css.includes(row),
   name+' must fit the explicit two-track phone grid, not create implicit columns');
  assert.ok(page.includes('class="btn '+name+'"'),name+' must remain visible to patients');
 }
 assert.ok(grid.includes('min-height:58px;')&&grid.includes('min-height:48px;'));
 assert.ok(grid.includes('@media(max-width:360px)'),
  'very narrow phones need safe touch padding');
 assert.ok(page.includes('href="https://booking.naver.com/booking/13/bizes/1162931"'),
  'the build must preserve the real booking destination');
 assert.ok(page.includes('href="tel:0325132875"'),
  'the phone call action must remain available on the first screen');
 assert.ok(page.includes('href="https://map.naver.com/p/entry/place/13239400"'),
  'the Naver map action must remain available without hiding the clinic address');
});


test('mobile search keyboard can hide dock without removing call, booking or directions',()=>{
 const finalCss=read('assets/home-art-direction-20261030.css');
 const start=finalCss.lastIndexOf('Keep the actual page search fields unobstructed');
 assert.ok(start>0,'the latest art layer should reserve keyboard-friendly search behavior');
 const snippet=finalCss.slice(start);
 const inputs=['home-symptom-query','home-owner-post-search'];
 for(const id of inputs){
  assert.ok(home.includes('id="'+id+'" name="q" type="search"'),
    'the patient and blog search forms must remain fully usable: '+id);
  const selector='body.home-page:has(#'+id+':focus) .mobile-booking-actions';
  assert.ok(snippet.includes(selector),
    'only input focus should temporarily remove the fixed booking dock: '+id);
  assert.ok(snippet.includes('body.home-page:has(#'+id+':focus) .music-reopen'),
    'optional music control must not obscure mobile keyboard for '+id);
 }
 assert.ok(snippet.includes('scroll-padding-bottom:calc(90px + env(safe-area-inset-bottom,0px))'));
 assert.ok(snippet.includes('scroll-margin-bottom:calc(95px + env(safe-area-inset-bottom,0px))'));
 assert.ok(snippet.includes('display:none;'),
   'focused search fields must have room above the on-screen keyboard');
 const originalDock=home.match(/<nav class="mobile-booking-actions"[^>]*>[\s\S]*?<\/nav>/)?.[0]||'';
 assert.equal((originalDock.match(/<a\b/g)||[]).length,3);
 assert.ok(originalDock.includes('href="tel:0325132875"'));
 assert.ok(originalDock.includes('href="https://booking.naver.com/booking/13/bizes/1162931"'));
 assert.ok(originalDock.includes('href="/visit-guide.html"'));
 assert.ok(home.includes('role="search" aria-label="치과 증상과 진료정보 검색"'));
 assert.ok(home.includes('role="search" aria-label="원장 네이버 블로그 글 509편 원문 제목 검색"'));
});


test('clinic structured hours include reliable Friday mornings but never promise alternate sessions',()=>{
 const scripts=[...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 const clinic=scripts.map(m=>{try{return JSON.parse(m[1])}catch{return null}})
  .find(data=>data?.['@id']==='https://ejoeundental.com/#clinic');
 assert.ok(clinic,'the source clinic JSON-LD must remain parseable and identifiable');
 const hours=clinic.openingHoursSpecification;
 assert.equal(hours.length,2,'one morning range and one Mon-Thu afternoon range');
 const days=range=>range.dayOfWeek.map(day=>day.replace('https://schema.org/',''));
 assert.deepEqual(days(hours[0]),['Monday','Tuesday','Wednesday','Thursday','Friday']);
 assert.deepEqual([hours[0].opens,hours[0].closes],['09:30','13:00']);
 assert.deepEqual(days(hours[1]),['Monday','Tuesday','Wednesday','Thursday']);
 assert.deepEqual([hours[1].opens,hours[1].closes],['14:00','18:30']);
 assert.ok(hours.every(row=>!days(row).includes('Saturday')&&!days(row).includes('Sunday')),
  'alternating Saturdays must not be asserted as permanently open');
 assert.ok(clinic.additionalProperty.some(p=>p.name==='금·토요일 격주 진료'&&
  p.value.includes('해당 주 일정은 전화 확인')),
  'alternate Friday afternoon and Saturday rules must remain in the visible explanation');
 const visit=read('visit-guide.html');
 assert.ok(visit.includes('금요일: 격주 09:30~13:00 또는 09:30~18:30'));
 assert.ok(visit.includes('토요일: 격주 09:30~13:00 / 격주 휴진'));
 assert.ok(visit.includes('이 페이지에는 이번 주의 확정 일정이 표시되지 않습니다.'));
 assert.ok(home.includes('href="tel:0325132875"'));
});
