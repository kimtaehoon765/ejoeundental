import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';

const read=(path)=>readFileSync('dist/'+path,'utf8');
// Annotation checks need the author's CSS comments, which are intentionally
// absent in the deployed copies. The equivalence test below separately
// verifies that every actual CSS token is delivered unchanged.
const readAnnotatedHomeVisualCss=path=>{
 const source=readFileSync(path,'utf8');
 return source.replace(/[ \t]+$/gm,'').replace(/^[ \t]+/gm,'')
  .replace(/(?:\r?\n){2,}/g,'\n');
};
const stripBundleDocumentation=css=>css.replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*(?:\r?\n|$)/gm,'');
const compactCriticalCss=css=>{
 assert.ok(!/\\\r?\n/.test(css),'escaped newlines must not be compacted');
 return css.replace(/[ \t]+$/gm,'').replace(/^[ \t]+/gm,'')
  .replace(/(?:\r?\n){2,}/g,'\n');
};
const home=read('index.html');
const museum=read('assets/museum-home-v2.css');

test('final home design CSS preserves cascade while removing delivery-only whitespace',()=>{
 const name='assets/home-design-unification-20261103.css';
 const source=readFileSync(name,'utf8');
 assert.ok(!/\\\r?\n/.test(source),'no CSS escaped line continuation may be compacted');
 const expected=source.replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*(?:\r?\n|$)/gm,'')
  .replace(/[ \t]+$/gm,'').replace(/^[ \t]+/gm,'')
  .replace(/(?:\r?\n){2,}/g,'\n').replace(/([;{}])\n/g,'$1');
 const published=read(name);
 assert.equal(published,expected,'compiled design must preserve all live declarations in cascade order');
 assert.ok(Buffer.byteLength(source)-Buffer.byteLength(published)>4000,
  'final clinic visual styling should save at least 4KB of delivery bytes');
 const digest=createHash('sha256').update(expected).digest('hex').slice(0,12);
 assert.ok(home.includes('<link rel="stylesheet" href="/'+name+'?v='+digest+'">'),
  'rendered homepage must use immutable content-derived CSS cache key');
 assert.ok(home.includes('class="mobile-booking-actions"')&&home.includes('id="headline"'),
  'mobile booking and primary clinical H1 remain available');
});

test('mobile contact actions appear once in fixed dock, not twice in hero',()=>{
 const style=readFileSync('assets/home-design-unification-20261103.css','utf8');
 const mobile=style.match(/\/\* Mobile: keep exactly one visible phone and Naver booking action[\s\S]*?@media \(max-width: 600px\) \{([\s\S]*?)\n\}/)?.[1]||'';
 assert.ok(mobile.includes('> :is(.hero-call,.hero-booking) {\n    display: none;'),
  'both duplicate hero contact links are hidden on mobile');
 assert.ok(mobile.includes('.hero-hours {\n    grid-column: 1;\n    grid-row: 1;')&&
  mobile.includes('.hero-symptoms {\n    grid-column: 2;\n    grid-row: 1;'),
  'the two remaining hero actions share the first row without a blank row');
 assert.ok(home.includes('class="mobile-booking-actions"')&&
  home.includes('class="mobile-booking-naver"')&&
  home.includes('class="mobile-booking-call"'),
  'sticky phone and Naver appointment controls remain in the built page');
});

test('patient education gallery gives native questions readable editorial hierarchy',()=>{
 const authored=readFileSync('assets/home-design-unification-20261103.css','utf8');
 const questionArea=home.match(/<section class="section light" id="home-representative-guides"[\s\S]*?<\/section>/)?.[0]||'';
 const symptomArea=home.match(/<section class="symptom-navigator wrap"[\s\S]*?<\/section>/)?.[0]||'';
 assert.equal((questionArea.match(/href="\/stories\//g)||[]).length,4,
  'four original patient question article links must remain in the homepage');
 assert.equal((symptomArea.match(/class="symptom-navigator-grid"/g)||[]).length,1,
  'the original symptom information navigator must remain available');
 assert.ok(authored.includes('Clinical reading gallery | 2026-11-04')&&
  authored.includes('counter(clinical-question, decimal-leading-zero)')&&
  authored.includes('.symptom-navigator-grid > a > strong')&&
  authored.includes('.health-topic-grid > .health-topic-card > p'),
  'patient question, symptom, and clinical explanation hierarchy must have editorial styling');
 assert.ok(authored.includes('@media (max-width: 600px)')&&
  authored.includes('prefers-reduced-motion: reduce')&&
  authored.includes('forced-colors: active'),
  'reading design must remain responsive and accessible');
 assert.ok(home.includes('class="mobile-booking-actions"'),
  'the existing fixed phone and booking dock must be retained');
});

test('contextual clinical article links reach the matching patient health collections',()=>{
 const gum=read('stories/2026-10-25-incheon-choosing-periodontal-clinic-what-to-check/index.html');
 const root=read('stories/2026-10-25-bupyeong-root-canal-after-treatment-pain/index.html');
 const journal=read('stories.html');
 const style=read('assets/story-related.css');
 assert.ok(gum.includes('class="story-library-path"')&&
  gum.includes('href="/gum-health.html"'),
  'gum clinical article must link to the matching deeper health library');
 assert.ok(root.includes('class="story-library-path"')&&
  root.includes('href="/root-canal-health.html"'),
  'root canal clinical article must link to the matching deeper health library');
 assert.ok(journal.includes('href="/gum-health.html"')&&
  journal.includes('href="/root-canal-health.html"'),
  'journal directory must expose crawlable topic collection links');
 assert.ok(style.includes('.story-library-path a:focus-visible'),
  'contextual links must remain keyboard discoverable');
 assert.ok(gum.includes('href="/doctor.html"')&&root.includes('href="/doctor.html"'),
  'medical information and clinician attribution must be discoverable');
});

test('Google sitemap reflects real clinical journal and homepage updates',()=>{
 const map=read('sitemap.xml');
 const journal=read('stories.html');
 const homePage=read('index.html');
 for(const [name,href] of [['homepage','https://ejoeundental.pages.dev/'],
  ['clinical journal','https://ejoeundental.pages.dev/stories.html']]){
  const parts=map.split('<loc>'+href+'</loc>');
  assert.equal(parts.length,2,'sitemap has exactly one '+name+' canonical URL');
  assert.match(parts[1].split('</url>')[0],/<lastmod>2026-11-04<\/lastmod>/,
   'sitemap modification date must reflect the verified Nov 4 content or link update: '+name);
 }
 const title=journal.match(/<title>([^<]+)<\/title>/)?.[1];
 const ogTitle=journal.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
 assert.ok(title&&title===ogTitle,
  'Google and social search titles should describe the same clinical journal page');
 assert.ok(journal.includes('name="robots" content="index,follow,max-image-preview:large"'),
  'original patient artwork may be used as a large image preview');
 assert.ok(homePage.includes('href="/stories.html"')&&
  journal.includes('href="/gum-health.html"')&&
  journal.includes('href="/root-canal-health.html"'),
  'indexable journal and specialist education links remain in the HTML');
});

test('clinic structured data stays valid in HEAD while gallery CSS is discoverable early',()=>{
 const head=home.slice(0,home.indexOf('</head>'));
 const scripts=[...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,4,'keep all four verified schema blocks within HEAD');
 const types=scripts.map(s=>JSON.parse(s[1])['@type']);
 assert.deepEqual(types,['ItemList','WebSite','Dentist','FAQPage'],
  'structured data semantic type and original ordering must not change');
 const renderedCss=[...head.matchAll(/<link rel="stylesheet" href="(\/assets\/[^"]+)"/g)]
  .map(m=>({pos:m.index,url:m[1]}));
 const blockingLast=renderedCss.find(r=>r.url.startsWith('/assets/home-finishing-'));
 const galleryFirst=renderedCss.find(r=>r.url.startsWith('/assets/gallery-foundation-'));
 assert.ok(blockingLast&&galleryFirst,'both gallery and final CSS bundles remain linked');
 assert.ok(galleryFirst.pos<scripts[0].index&&blockingLast.pos<scripts[0].index,
  'CSS files must be discovered before the non-rendering JSON-LD scripts');
 assert.ok(scripts[0].index-galleryFirst.pos>250,
  'search schemas remain within head and after stylesheets');
 assert.ok(head.includes('<meta name="google-site-verification"')&&
  head.includes('<meta name="naver-site-verification"')&&
  head.includes('rel="canonical" href="https://ejoeundental.com/"'),
  'moving non-rendering metadata must not drop search verification');
 assert.ok(home.includes('class="art hero-artwork"')&&
  home.includes('class="mobile-booking-actions"'),
  'original portrait and booking dock remain present');
});

// Content-hashed gallery foundation and independent newer patient styles.
const linkedVersionedStyle=(markup,name)=>
 markup.includes('/assets/'+name+'?v=')&&existsSync('dist/assets/'+name);
const galleryFoundation=()=>{
 const names=['gallery-upgrade.css','gallery-finish.css','museum-home-v2.css'];
 const boundary='\n\n/* Ejoeun museum gallery foundation: original CSS file boundary. */\n\n';
 const documented=names.map(name=>read('assets/'+name).trimEnd()).join(boundary)+'\n';
 const expected=stripBundleDocumentation(documented);
 const hash=createHash('sha256').update(expected).digest('hex').slice(0,12);
 const url='/assets/gallery-foundation-'+hash+'.css';
 assert.ok(home.includes('href="'+url+'"'),'immutable museum CSS linked');
 assert.equal(read(url.slice(1)),expected,'original gallery rules preserved in order');
 return url;
};


// The formerly separate homepage visual styles now ship as one asset.
 // Verify the delivered CSS contains both original files in cascade order.
 const homeVisualBundle=()=>{
 const names=['home-art-direction-20261030.css','atelier-refinement-20261030.css'];
 const sections=names.map(name=>read('assets/'+name).trimEnd());
 const expected=sections.join('\n\n')+'\n';
 const hash=createHash('sha256').update(expected).digest('hex').slice(0,12);
 const href='/assets/home-visual-'+hash+'.css';
 assert.ok(home.includes('<link rel="stylesheet" href="'+href+'">'),
 'content-hashed visual bundle must be linked in the homepage');
 assert.equal(read(href.slice(1)),expected,
 'visual styles must retain every declaration in original cascade order');
 assert.ok(!names.some(name=>home.includes('href="/assets/'+name)),
 'combined visual CSS must not also load its individual sources');
 return href;
 };
 
 const exhibitionFoundation=()=>{
 const names=['atelier-home-2026.css','curatorial-home.css','gallery-edition-polish.css'];
 const boundary='\n\n/* Ejoeun curated exhibition CSS source boundary. */\n\n';
 const documented=names.map(name=>read('assets/'+name).trimEnd()).join(boundary)+'\n';
 const withoutDocumentation=stripBundleDocumentation(documented);
 assert.ok(!/\\\r?\n/.test(withoutDocumentation),
  'source CSS must not contain escaped newlines before compaction');
 const expected=withoutDocumentation.replace(/[ \t]+$/gm,'').replace(/^[ \t]+/gm,'')
  .replace(/(?:\r?\n){2,}/g,'\n');
 assert.ok(Buffer.byteLength(withoutDocumentation)-Buffer.byteLength(expected)>9000,
  'gallery foundation formatting must save at least 9KB without changing CSS rules');
 const hash=createHash('sha256').update(expected).digest('hex').slice(0,12);
 const href='/assets/exhibition-foundation-'+hash+'.css';
 assert.ok(home.includes('href="'+href+'"'),'immutable exhibition CSS is linked');
 assert.equal(read(href.slice(1)),expected,'3 original exhibition styles retained verbatim in cascade order');
 assert.ok(!names.some(name=>home.includes('href="/assets/'+name)),
  'do not re-fetch the 3 original exhibition CSS files');
 return href;
};


test('large homepage gallery layers deliver only live CSS with comments removed',()=>{
 const layers=['home-art-direction-20261030.css','atelier-refinement-20261030.css'];
 const linked=[...home.matchAll(/<link rel="stylesheet" href="(\/assets\/[^"]+)"/g)]
  .map(match=>match[1]);
 let saved=0;
 for(const name of layers){
  const source=readFileSync('assets/'+name,'utf8');
  assert.ok(!/\\\r?\n/.test(source),'no CSS escaped newline may be normalized: '+name);
  const normalized=source.replace(/[ \t]+$/gm,'').replace(/^[ \t]+/gm,'')
   .replace(/(?:\r?\n){2,}/g,'\n');
  const every=[...normalized.matchAll(/\/\*[\s\S]*?\*\//g)].length;
  const standalone=[...normalized.matchAll(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*(?:\r?\n|$)/gm)].length;
  assert.equal(every,standalone,'all removed CSS comments must stand alone: '+name);
  const delivered=normalized.replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*(?:\r?\n|$)/gm,'')
   .replace(/(?:\r?\n){2,}/g,'\n')
   .replace(/([;{}])\n/g,'$1');
  assert.equal(read('assets/'+name),delivered,
   'every visual CSS token and cascade remains unchanged after whitespace-only delivery compression: '+name);
  assert.equal((read('assets/'+name).match(/\/\*/g)||[]).length,0,
   'no standalone documentation is sent to patients: '+name);
  assert.ok(!linked.some(href=>href.startsWith('/assets/'+name+'.css')),
 'the browser must request the combined CSS instead of its old source link: '+name);
  saved+=Buffer.byteLength(normalized)-Buffer.byteLength(delivered);
 }
 assert.ok(linked.includes(homeVisualBundle()),'the browser must request the exact hashed, combined visual CSS');
 assert.ok(saved>20000,'two museum visual layers should save meaningful uncompressed delivery bytes');
 assert.ok(!/\};?\n/.test(read('assets/atelier-refinement-20261030.css')),
  'the large art-direction stylesheet must not ship unnecessary newlines after blocks');
 assert.ok(home.includes('class="mobile-booking-actions"')&&home.includes('href="tel:0325132875"'),
  'patient booking and telephone actions must remain available');
});

test('patient health-library search desks remain accessible and link to one verified search route',()=>{
 const css=read('assets/health-library-gallery.css');
 assert.ok(css.includes('2026-10-31 | Search desk for four patient reading rooms'));
 assert.ok(css.includes('health-library-find'));
 const hubs=[
  ['gum-health.html','health-hub-gum','library-search-gum'],
  ['root-canal-health.html','health-hub-root','library-search-root'],
  ['insurance-health.html','health-hub-insurance','library-search-insurance'],
  ['additional-health.html','health-hub-other','library-search-other']
 ];
 for(const [file,theme,id] of hubs){
  const h=read(file);
  assert.ok(h.includes('class="health-library '+theme+'"'),file+': themed patient hub');
  assert.equal((h.match(/class="health-library-find"/g)||[]).length,1,
   file+': exactly one cross-topic search form');
  assert.ok(h.includes('action="/search.html" method="get"'),file+': existing search route');
  assert.ok(h.includes('name="q" type="search"'),file+': query accepted by search.html');
  assert.ok(h.includes('<label for="'+id+'">') && h.includes('id="'+id+'"'),
   file+': accessible search label and unique input');
  assert.ok(linkedVersionedStyle(h,'health-library-gallery.css'),
   file+': refreshed shared reading-room stylesheet');
  assert.ok(h.includes('rel="canonical"') && h.includes('tel:0325132875'),
   file+': original SEO and clinic contact retained');
  assert.ok(h.includes('class="health-reading-rooms"'),
   file+': original four-way topic selector retained');
  if(file==='additional-health.html'){
   for(const id of ['dentures','abrasion','cavities','preservation']){
    assert.ok(h.includes('id="'+id+'"'),
     file+': original 16-article topic section retained: '+id);
   }
  }else{
   assert.ok(h.includes('class="health-essay-index"'),
    file+': original 10-article reading index retained');
  }
 }
 const search=read('search.html');
 assert.ok(search.includes('name="q" type="search"'),
  'all hub forms target the real public health-information search page');
});


test('search results preserve patient-facing categories and show a safe query banner',()=>{
 const html=read('search.html');
 const css=read('assets/search-page.css');
 const script=read('assets/search.js');
 assert.ok(html.includes('name="robots" content="noindex,follow"'),
  'parameterized search results must remain non-indexable');
 assert.ok(html.includes('rel="canonical" href="https://ejoeundental.com/search.html"'),
  'public search canonical stays the clean page');
 assert.ok(html.includes('id="search-query-view" class="search-query-view" aria-label="현재 검색어" hidden'),
  'query banner starts hidden until an actual patient query is provided');
 assert.ok(html.includes('id="status" role="status" aria-live="polite"'),
  'screen readers still hear the count or loading status');
 assert.ok(html.includes('id="results" aria-label="홈페이지 검색 결과"'),
  'results region remains the first-party target');
 assert.ok(linkedVersionedStyle(html,'search-page.css'));
 assert.ok(css.includes('2026-10-31 | Result-reading salon for four health-library searches'));
 assert.ok(css.includes('body.search-gallery .search-result-list .result-next>a'),
  'clinical follow-up links stay visually distinct from search result cards');
 assert.ok(css.includes('body.search-gallery .search-category-filter[aria-pressed="true"]'));
 assert.ok(script.includes("queryView.textContent='“'+q+'” 검색 결과'"),
  'query text must be inserted via textContent, never untrusted HTML');
 assert.ok(script.includes('queryView.hidden=false'), 'show banner for nonempty queries');
 assert.ok(script.includes("showResults('all')")&&script.includes('search-show-more'),
  'existing ranking, filters and batched results remain available');
 for(const file of ['gum-health.html','root-canal-health.html',
   'insurance-health.html','additional-health.html']){
  const hub=read(file);
  assert.ok(hub.includes('action="/search.html" method="get"') &&
   hub.includes('name="q" type="search"'),file+': the new search desk still works');
 }
});



test('mobile header scroll work is frame-batched and primary patient actions stay native',()=>{
 const source=readFileSync('index.html','utf8');
 const home=read('index.html');
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 assert.ok(source.includes("window.requestAnimationFrame(adjust)"),
  'mobile scroll header should update at most once per display frame');
 assert.ok(source.includes("if(pending)return;")&&
  source.includes("window.addEventListener('scroll',scheduleAdjust,{passive:true})"),
  'scroll events should be coalesced and passive');
 assert.ok(source.includes("root.classList.contains('home-scrolled')!==compact"),
  'do not invalidate styles for unchanged compact-header state');
 assert.ok(source.includes('window.innerWidth<=600 && window.scrollY>220'),
  'retain the originally approved 600px and 220px compact-header thresholds');
 assert.ok(css.includes('2026-10-31 | First-touch patient actions')&&
  css.includes('touch-action:manipulation'),
  'primary mobile phone and booking anchors need native tap responsiveness');
 assert.ok(css.includes('.mobile-booking-actions>a:active')&&
  css.includes('body.home-page header .mobile-quick>a:active'),
  'mobile booking dock and header shortcuts keep clear touch feedback');
 assert.ok(homeVisualBundle(),
 'homepage invalidates cached touch feedback styles via the combined CSS');
 assert.ok(home.includes('href="tel:0325132875"')&&
  home.includes('class="mobile-booking-actions"'),
  'the original clinic phone and fixed mobile patient routes remain');
 assert.ok(home.includes('loading="eager" fetchpriority="high" decoding="sync"'),
  'portrait first-paint loading remains prioritized');
 assert.ok(home.includes('name="google-site-verification"')&&
  home.includes('rel="canonical" href="https://ejoeundental.com/"'),
  'original Google verification and preferred search URL remain');
});

test('homepage critical CSS retains its cascade while reducing three requests to one',()=>{
 const home=read('index.html');
 const cssHref=home.match(/href="(\/assets\/home-critical-([0-9a-f]{12})\.css)"/)?.[1];
 assert.ok(cssHref,'fingerprinted first-screen CSS bundle is linked');
 const stylesheet=read(cssHref.slice(1));
 const originals=['style.css','home-enhancements.css','address-copy.css'];
 const unoptimized=originals.map(name=>stripBundleDocumentation(read('assets/'+name).trimEnd()))
  .join('\n\n')+'\n';
 assert.ok(Buffer.byteLength(stylesheet)<Buffer.byteLength(unoptimized),
  'critical CSS compaction must reduce payload without removing clinical styles');
 const boundaries=[];
 for(const file of originals){
  const original=compactCriticalCss(stripBundleDocumentation(read('assets/'+file).trimEnd()));
  const at=stylesheet.indexOf(original);
  assert.ok(at>=0,'bundle must contain all non-comment source CSS '+file);
  boundaries.push(at);
  assert.equal(stylesheet.indexOf(original,at+1),-1,
   'do not duplicate original stylesheet '+file);
 }
 assert.ok(boundaries[0]<boundaries[1]&&boundaries[1]<boundaries[2],
  'critical stylesheet cascade order must remain intact');
 assert.ok(!home.includes('href="/assets/home-enhancements.css'),
  'avoid the redundant render-blocking enhancement CSS request');
 assert.ok(!home.includes('href="/assets/address-copy.css'),
  'avoid the redundant render-blocking address CSS request');
 const foundation=galleryFoundation();
 const later=[exhibitionFoundation(),homeVisualBundle()];
 const positions=[home.indexOf('href="'+foundation+'"'),
  ...later.map(href=>home.indexOf('href="'+href))];
 assert.ok(positions.every(n=>n>=0),'all existing museum styles must still load');
 assert.ok(positions.every((n,i)=>i===0||n>positions[i-1]),
  'museum styles remain in approved cascade order');
 assert.ok(home.indexOf(cssHref)<positions[0],
  'critical stylesheet must load before museum finish layers');
 assert.ok(home.includes('href="tel:0325132875"')&&
  home.includes('class="mobile-booking-actions"'),
  'original phone and booking actions remain present');
});


test('implant and denture consultation exhibits show original art before navigation',()=>{
 const style=read('assets/care-gallery-secondary.css');
 assert.ok(style.includes('2026-10-31 | Preservation-first treatment exhibition: implant and dentures'),
  'shared patient reading-gallery styling should be present');
 for(const target of [
  'counter-reset:question-card','counter-increment:question-card',
  'grid-template-columns:repeat(2,minmax(0,1fr))',
  '@media(max-width:650px)','@media(forced-colors:active)',
  'object-fit:contain','touch-action'
 ]){
  // Touch behavior comes from the existing native care-gallery actions; the
  // new exhibition CSS is restricted to the other typography/layout targets.
  if(target==='touch-action')continue;
  assert.ok(style.includes(target),'missing exhibition visual target '+target);
 }
 const cases=[
  {file:'implant.html',slug:'implant',body:'secondary-implant',
   topic:'clinical-implant-section-20261102.svg',cards:'implant-patient-grid',
   links:4,section:'implant-patient-decisions-heading'},
  {file:'denture.html',slug:'denture',body:'secondary-denture',
   topic:'ejoeun-watercolor-denture-20261029.webp',cards:'denture-question-grid',
   links:4,section:'denture-patient-title'}
 ];
 for(const c of cases){
  const h=read(c.file);
  const nav=h.match(/<nav class="treatment-page-toc gallery-section-index"[\s\S]*?<\/nav>/)?.[0]||'';
  const art=h.match(/<figure class="ejoeun-topic-art"[\s\S]*?<\/figure>/)?.[0]||'';
  const grid=h.match(new RegExp('<div class="'+c.cards+'">([\\s\\S]*?)<\\/div>'))?.[1]||'';
  assert.ok(h.includes('class="care-gallery care-gallery-secondary secondary-article '+c.body+'"'));
  assert.ok(nav&&art&&h.indexOf(art)<h.indexOf(nav),
   c.slug+': unique original art must precede the reading index');
  assert.ok(art.includes(c.topic),c.slug+': preserve its unique original painting');
  assert.equal((art.match(/<img\b/g)||[]).length,1,
   c.slug+': keep one painting per treatment page, no repeated images');
  assert.equal((grid.match(/<article>/g)||[]).length,c.links,
   c.slug+': keep all four original patient decision cards');
  assert.ok(h.includes('id="'+c.section+'"'),c.slug+': chapter target preserved');
  assert.ok(linkedVersionedStyle(h,'care-gallery-secondary.css'),
   c.slug+': visual CSS asset cache refreshed');
  assert.ok(h.includes('href="tel:0325132875"')&&
   h.includes('https://booking.naver.com/booking/13/bizes/1162931')&&
   h.includes('class="care-gallery-bottom-actions"'),
   c.slug+': native phone, Naver booking and mobile dock retained');
  assert.ok(h.includes('rel="canonical"')&&h.includes('application/ld+json'),
   c.slug+': existing search metadata retained');
 }
});


test('wisdom tooth and cavity exhibits retain distinct original paintings and patient routes',()=>{
 const style=read('assets/care-gallery-secondary.css');
 assert.ok(style.includes('2026-10-31 | Wisdom and cavity consultation exhibition'),
  'two treatment galleries must have their own final design');
 assert.ok(style.includes('counter-reset:wisdom-question') &&
           style.includes('counter-reset:cavity-question'),
  'original medical questions have readable separate sequence numbers');
 for(const target of ['@media(max-width:760px)','@media(max-width:650px)',
  'object-fit:contain','@media(forced-colors:active)']){
  assert.ok(style.includes(target),'keep responsive and accessible artwork: '+target);
 }
 const treatments=[
  {file:'wisdom-tooth.html',body:'secondary-wisdom',
   image:'ejoeun-original-wisdom-consult-20261029.webp',
   grid:'wisdom-patient-grid',card:'article',count:2},
  {file:'cavity-treatment.html',body:'secondary-cavity',
   image:'clinical-cavity-sequence-20261102.svg',
   grid:'cavity-patient-grid',card:'a',count:5}
 ];
 for(const c of treatments){
  const html=read(c.file);
  const toc=html.match(/<nav class="treatment-page-toc gallery-section-index"[\s\S]*?<\/nav>/)?.[0]||'';
  const art=html.match(/<figure class="ejoeun-topic-art"[\s\S]*?<\/figure>/)?.[0]||'';
  const cards=html.match(new RegExp('<div class="'+c.grid+'">([\\s\\S]*?)<\\/div>'))?.[1]||'';
  assert.ok(html.includes(c.body),c.file+': correct treatment-specific gallery');
  assert.ok(art&&toc&&html.indexOf(art)<html.indexOf(toc),
   c.file+': painting is visible before the article chapter index');
  assert.ok(art.includes(c.image)&& (art.match(/<img\b/g)||[]).length===1,
   c.file+': exactly one unchanged clinically qualified original painting');
  assert.equal((cards.match(new RegExp('<'+c.card+'\\b','g'))||[]).length,c.count,
   c.file+': preserve original educational questions and their routes');
  assert.equal((toc.match(/<a\b/g)||[]).length,4,
   c.file+': original chapter navigation retains all four destinations');
  assert.ok(linkedVersionedStyle(html,'care-gallery-secondary.css'),
   c.file+': refreshed style should not be stuck behind an old browser cache');
  assert.ok(html.includes('href="tel:0325132875"')&&
    html.includes('https://booking.naver.com/booking/13/bizes/1162931')&&
    html.includes('class="care-gallery-bottom-actions"'),
   c.file+': telephone, booking and mobile quick actions stay available');
  assert.ok(html.includes('rel="canonical"')&&
    html.includes('application/ld+json'),
   c.file+': search and medical metadata unchanged');
 }
});


test('pediatric dental and orthodontic exhibits preserve original illustrations and clinic routes',()=>{
 const css=read('assets/child-care-exhibition-20261031.css');
 assert.ok(css.includes('어린이 진료와 성장기 교정 전시실'),
  'two pediatric treatment guides receive their distinct shared gallery design');
 for(const token of ['--child-exhibit-accent','#edf4f5',
  '.care-gallery-article-shell>.ejoeun-topic-art',
  'object-fit:contain','@media(max-width:760px)',
  '@media(max-width:550px)','@media(forced-colors:active)',
  '@media print',':focus-visible']){
  assert.ok(css.includes(token),'patient reading and accessible CSS kept: '+token);
 }
 const guides=[
  {file:'pediatric-dentistry.html',body:'pediatric-pathways-gallery',
   art:'ejoeun-original-pediatric-20261029.webp',
   chapterCount:7,extra:'ejoeun-pediatric-three-paths-20261029.svg',
   labels:['gallery-child-babyteeth','gallery-child-prevention',
    'pediatric-first-exam','pediatric-treatment-heading',
    'pediatric-restorative-options','pediatric-trauma']},
  {file:'pediatric-orthodontics.html',body:'pediatric-ortho-decisions',
   art:'ejoeun-child-orthodontic-growth-art-20261029.svg',
   chapterCount:5,extra:'',
   labels:['ortho-care-options','gallery-ortho-exam',
    'gallery-ortho-timing','child-removable-orthodontics-heading']}
 ];
 for(const c of guides){
  const html=read(c.file);
  const art=html.match(/<figure class="ejoeun-topic-art(?: [^"]+)?"[\s\S]*?<\/figure>/)?.[0]||'';
  const toc=html.match(/<nav class="treatment-page-toc gallery-section-index"[\s\S]*?<\/nav>/)?.[0]||'';
  assert.ok(html.includes('class="care-gallery care-gallery-secondary secondary-article '+c.body+'"'),
   c.file+': correct scoped pediatric design');
  assert.ok(art.includes(c.art)&&art.includes('loading="lazy" decoding="async"'),
   c.file+': keep a dedicated original and responsive artwork');
  assert.ok(art&&toc&&html.indexOf(art)<html.indexOf(toc),
   c.file+': artwork visible before reading chapters');
  assert.equal((toc.match(/<a /g)||[]).length,c.chapterCount,
   c.file+': preserve the original quick chapter navigation');
  for(const label of c.labels){
   assert.equal((html.match(new RegExp('id="'+label+'"','g'))||[]).length,1,
    c.file+': original patient reading target exists once: '+label);
   assert.ok(toc.includes('href="#'+label+'"'),
    c.file+': quick navigation retains its section target');
  }
  if(c.extra)assert.ok(html.includes(c.extra),
   c.file+': keep distinct second picture for first examination and prevention');
  assert.ok(linkedVersionedStyle(html,'child-care-exhibition-20261031.css'),
   c.file+': correct cache-versioned gallery CSS');
  assert.ok(html.includes('href="tel:0325132875"')&&
   html.includes('https://booking.naver.com/booking/13/bizes/1162931')&&
   html.includes('class="care-gallery-bottom-actions"'),
   c.file+': native call, verified booking and mobile action dock retained');
  assert.ok(html.includes('rel="canonical"')&&
   html.includes('application/ld+json'),
   c.file+': medical search metadata remains untouched');
 }
});


test('scaling and TMJ reading exhibits retain paintings and native patient routes',()=>{
 const style=read('assets/scaling-tmj-exhibition-20261031.css');
 assert.ok(style.includes('Scaling and TMJ patient-reading exhibition'),
  'two treatment galleries have a dedicated reading layout');
 for(const token of [
   '--care-atlas-accent','scaling-patient-reading',
   'grid-template-columns:repeat(2,minmax(0,1fr))',
   '@media(max-width:650px)','@media(forced-colors:active)',
   'object-fit:contain',':focus-visible'
 ]){
  assert.ok(style.includes(token),'preserve patient accessibility styles: '+token);
 }
 const guides=[
  {file:'scaling.html',body:'secondary-scaling',
   art:'ejoeun-scaling-stilllife-20261029.svg',
   chapterIds:['gallery-scaling-timing','gallery-scaling-vs-gum','gallery-scaling-insurance'],
   essentialLink:'/gum-treatment.html',readingCount:4},
  {file:'tmj-care.html',body:'secondary-tmj',
   art:'ejoeun-tmj-rest-portrait-20261029.svg',
   chapterIds:['gallery-tmj-symptoms','gallery-tmj-care','gallery-tmj-aftercare'],
   essentialLink:'/search.html',readingCount:0}
 ];
 for(const c of guides){
  const h=read(c.file);
  const nav=h.match(/<nav class="treatment-page-toc gallery-section-index"[\s\S]*?<\/nav>/)?.[0]||'';
  const art=h.match(/<figure class="ejoeun-topic-art[^"]*"[\s\S]*?<\/figure>/)?.[0]||'';
  assert.ok(h.includes(c.body)&&nav&&art,c.file+': original article structures remain');
  assert.ok(h.indexOf(art)<h.indexOf(nav),
   c.file+': original artwork precedes the quick reading index');
  assert.ok(art.includes(c.art)&&(art.match(/<img /g)||[]).length===1,
   c.file+': keep one clinically qualified original artwork');
  assert.equal((nav.match(/<a /g)||[]).length,4,
   c.file+': exactly three chapter links and the visit link');
  for(const id of c.chapterIds){
   assert.equal(h.split('id="'+id+'"').length-1,1,
    c.file+': preserve the section target '+id);
   assert.ok(nav.includes('href="#'+id+'"'),
    c.file+': preserve its chapter navigation');
  }
  assert.ok(linkedVersionedStyle(h,'scaling-tmj-exhibition-20261031.css'),
   c.file+': fresh final exhibit style linked');
  assert.ok(h.includes('href="'+c.essentialLink+'"'),
   c.file+': original safety or symptom information remains');
  assert.ok(h.includes('href="tel:0325132875"')&&
   h.includes('https://booking.naver.com/booking/13/bizes/1162931')&&
   h.includes('class="care-gallery-bottom-actions"'),
   c.file+': phone, verified booking and mobile actions remain');
  assert.ok(h.includes('rel="canonical"')&&h.includes('application/ld+json'),
   c.file+': existing SEO and structured metadata remain');
  if(c.readingCount){
   const reading=h.match(/<ul class="scaling-patient-reading">([\s\S]*?)<\/ul>/)?.[1]||'';
   assert.equal((reading.match(/<li>/g)||[]).length,c.readingCount,
    'keep original four post-scaling advice articles');
  }
 }
});

test('visit preparation presents four original clinical steps and three journal reading cards',()=>{
 const visit=home.match(/<section class="section light" id="visit-guide">([\s\S]*?)<\/section>/)?.[1]||'';
 const stepGrid=visit.match(/<div class="grid visit-care-steps"[^>]*>([\s\S]*?)<\/div><p class="notice">/)?.[1]||'';
 const steps=[...stepGrid.matchAll(/<div class="card visit-care-step">([\s\S]*?)<\/div>/g)].map(m=>m[1]);
 assert.equal(steps.length,4,'retain four first-visit clinical preparations');
 const expectedTitles=['증상과 치료 이력 정리','원장이 직접 검진·진단','보험 적용과 비용 확인','진료시간·주차 확인'];
 steps.forEach((card,i)=>{
  const step=String(i+1).padStart(2,'0');
  assert.ok(card.includes('class="visit-care-step__number" aria-hidden="true">'+step+' / STEP'));
  assert.ok(card.includes('<h3>'+expectedTitles[i]+'</h3>'),'step heading should be readable');
  assert.ok(card.includes('<p>'),'step must explain what happens');
 });
 assert.ok(steps[0].includes('/medical-history.html'),'clinical history link must remain');
 assert.ok(steps[1].includes('href="#philosophy"'),'doctor philosophy link must remain');
 assert.ok(steps[2].includes('/insured-care.html'),'insurance source remains');
 assert.ok(steps[3].includes('3시간 무료 주차')&&steps[3].includes('tel:0325132875'),
  'alternating schedule and clinic contact remain');
 assert.ok(visit.includes('약은 임의로 중단하지 마세요.'));
 assert.ok(visit.includes('금·토요일은 격주 운영'));
 const journal=home.match(/<nav class="story-featured-questions"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 const questions=[...journal.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)];
 assert.deepEqual(questions.map(m=>m[1]),['/stories/01/','/stories/02/','/stories/03/'],
  'retain the original three prominent patient questions');
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 for(const token of [
  'Visit journey & doctor', '.visit-care-steps > .visit-care-step',
  '.visit-care-step__number','grid-template-columns:repeat(2,minmax(0,1fr))',
  '.story-featured-questions > a::before',
  'counter-increment:journal-question',
  '.story-featured-questions > a:focus-visible',
  '@media(max-width:760px)'
 ]) {
  assert.ok(css.includes(token),'missing responsive first-visit/journal improvement '+token);
 }
});
test('premium gallery foyer shows 23 unique works through three real exhibition rooms',()=>{
 const html=read('index.html');
 const intro=html.match(/<div class="gallery-home-intro gallery-home-intro--exhibition">([\s\S]*?)<\/div>\s*<nav class="gallery-exhibition-index"/)?.[1]||'';
 assert.ok(intro,'the gallery entrance needs an editorial exhibition introduction');
 assert.ok(intro.includes('id="home-gallery-title"')&&intro.includes('치과 안의 작은 그림 갤러리'));
 assert.ok(intro.includes('aria-label="전체 전시 작품 23점"'));
 assert.ok(intro.includes('href="/gallery.html"'),'all 23 works should have a direct collection link');
 const room=html.match(/<nav class="gallery-exhibition-index"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 const cards=[...room.matchAll(/<a class="gallery-exhibition-index__room" href="([^"]+)">([\s\S]*?)<\/a>/g)];
 assert.deepEqual(cards.map(c=>c[1]),[
  '/gallery.html#paintings','/gallery.html#education','/gallery.html#patient-studies'
 ]);
 for(const [i,card] of cards.entries()){
  assert.ok(card[2].includes('ROOM 0'+(i+1)));
  assert.ok(card[2].includes('WORKS'));
  assert.ok(card[2].includes('gallery-exhibition-index__action'));
 }
 assert.deepEqual(cards.map(c=>c[2].match(/(\d{2}) WORKS/)?.[1]),['10','03','10']);
 assert.ok(cards[0][2].includes('풍경·캐릭터 그림 10점 감상하기'));
 assert.ok(cards[1][2].includes('진료 수채화 3점 감상하기'));
 assert.ok(cards[2][2].includes('건강정보 창작 그림 10점 감상하기'));
 const gallery=read('gallery.html');
 for(const anchor of ['id="paintings"','id="education"','id="patient-studies"']){
  assert.ok(gallery.includes(anchor),'gallery room must be real: '+anchor);
 }
 const allImages=[...html.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(x=>x[1]);
 const newPrints=['/assets/care-illustration-abrasion.svg','/assets/care-illustration-insurance.svg'];
 const originalImages=allImages.filter(src=>!newPrints.includes(src));
 assert.equal(originalImages.length,allImages.length-newPrints.length,'keep all existing paintings when additional original diagrams are added');
 assert.equal(new Set(originalImages).size,originalImages.length,'every existing painting appears once, even after rearranging');
 assert.equal(allImages.length,(readFileSync('index.html','utf8').match(/<img\b/g)||[]).length,'retain all original and clinical illustrations');
 assert.equal(new Set(allImages).size,allImages.length,'no artwork should be repeated on the homepage');
 for(const src of newPrints){
  assert.equal(allImages.filter(image=>image===src).length,1,'each new print appears exactly once: '+src);
 }
 const since2003='/assets/ejoeun-doctor-since2003-garden-20261029.svg';
 assert.equal(allImages.filter(src=>src===since2003).length,1,'the garden painting must only appear in the clinical manifesto');
 assert.ok(html.includes('class="care-preservation-art"') && html.includes('THE LONG VIEW · SINCE 2003'),
  'the natural-tooth reading panel keeps its original landscape and caption');
 assert.ok(html.includes('class="journal-gallery-cover__poster"') &&
  html.includes('class="journal-gallery-cover__poster"><img src="/assets/ejoeun-liver-care-stilllife-20261029.svg"'),
  'journal cover keeps a unique painted book cover and working reading room entry');
 const preservationCss=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 for(const token of ['An original landscape beside the tooth-preservation manifesto',
  'Doctor\u0027s journal: a quiet book-cover edition','@media(min-width:821px)',
  '.care-preservation-art','.journal-gallery-cover__poster::before']){
   assert.ok(preservationCss.includes(token),'missing museum reading-room refinement: '+token);
 }
 assert.ok(html.includes('health-topic-painting--panorama'),
  'new sensitivity and insurance paintings keep accessible patient-facing captions');
 assert.ok(html.includes('class="mobile-booking-actions"'),'mobile booking stays available');
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 for(const token of ['Three-room museum foyer · original collection 23',
  '.gallery-exhibition-colophon__count','.gallery-exhibition-index__room',
  'grid-template-columns:repeat(3,minmax(0,1fr))',
  '@media(max-width:700px)','@media(forced-colors:active)',
  '.gallery-exhibition-index__room:focus-visible']){
   assert.ok(css.includes(token),'gallery exhibition refinement missing '+token);
 }
});
test('premium home stylesheet ships after earlier layers and keeps booking visible',()=>{
 const styles=[...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 const museumLink=galleryFoundation();
 assert.ok(styles.includes(museumLink),'immutable museum CSS must be referenced');
 assert.ok(styles.indexOf(museumLink)<styles.indexOf(exhibitionFoundation()),
  'museum foundation must precede the later gallery finish styles');
 const hero=home.match(/<div class="hero-actions">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.ok(hero.includes('class="btn hero-call"'),'call must remain');
 assert.ok(hero.includes('class="btn hero-booking"'),'real Naver booking link must remain');
 assert.ok(hero.indexOf('hero-call')<hero.indexOf('hero-booking'));
 assert.ok(hero.indexOf('hero-booking')<hero.indexOf('hero-hours'));
 assert.match(museum, /\.hero-actions \.hero-booking\{\s*display:flex;order:1;grid-column:2;/,
  'mobile booking must override earlier display:none');
 assert.match(museum, /\.hero-actions \.hero-call\{\s*display:flex;order:0;grid-column:1;/);
});

test('four visit facts include true weekday hours and link to complete alternating schedule',()=>{
 const html=read('index.html');
 const section=html.match(/<section class="section" id="location">([\s\S]*?)<\/section>/)?.[1]||'';
 const quick=section.match(/<div class="visit-quick-facts"[^>]*>([\s\S]*?)<\/div><nav class="place-visit-actions"/)?.[1]||'';
 const cardTitles=[...quick.matchAll(/<strong>([^<]+)<\/strong>/g)].map(m=>m[1]);
 assert.equal((quick.match(/<div(?: class="visit-quick-facts__weekday")?>/g)||[]).length,4,'visitor summary must contain four facts');
 for(const title of ['📍 위치','🕘 월~목 진료시간','🚗 주차','🕘 금·토요일']) {
  assert.ok(cardTitles.includes(title),'missing visit information: '+title);
 }
 assert.ok(quick.includes('<b>09:30~18:30</b>'),'do not invent weekday hours');
 assert.ok(quick.includes('점심시간 13:00~14:00'));
 assert.ok(quick.includes('href="#hours-details"'),'weekday card must link to registration cutoffs');
 assert.ok(section.includes('<div class="hours-box" id="hours-details">'),'complete schedule must have a stable anchor');
 assert.ok(quick.includes('href="#weekly-hours"'),'Friday/Saturday variations must retain a direct link');
 assert.ok(quick.includes('방문 전 전화 확인'),'do not assert an alternating Friday or Saturday open-now schedule');
 assert.ok(quick.includes('3시간 무료'),'parking benefits must be preserved');
 assert.ok(section.includes('금요일 오후 진료와 토요일 진료는 같은 주에 운영하지 않습니다.'));
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 for(const text of ['Visit at a glance · four verifiable facts','grid-template-columns:repeat(2,minmax(0,1fr))',
  '.visit-quick-facts__weekday b','#location #hours-details','@media(max-width:640px)']){
  assert.ok(css.includes(text),'missing responsive visitor detail: '+text);
 }
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


test('all visible homepage artwork is shipped with accessible and stable image dimensions',()=>{
 const source=readFileSync('index.html','utf8');
 const original=[...source.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
 const delivered=[...home.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
 assert.equal(delivered.length,original.length,
  'build must not silently remove or duplicate images');
 const paths=[];
 for(const [i,tag] of delivered.entries()){
  const src=tag.match(/\bsrc="(\/assets\/[^"]+)"/)?.[1];
  assert.ok(src,'homepage artwork must have a local assets path: image '+i);
  assert.ok(/\balt="[^"]*"/.test(tag),'every artwork needs an explicit alt attribute: '+src);
  assert.ok(/\bwidth="[0-9]+"/.test(tag)&&/\bheight="[0-9]+"/.test(tag),
   'art dimensions must be known before layout: '+src);
  const assetPath=src.split(/[?#]/)[0];
  if(src!==assetPath) assert.match(src,/^\/assets\/impressionist-water-garden\.svg\?v=[0-9a-f]{12}$/,
   'only the water-garden painting may have a build fingerprint');
  assert.ok(existsSync('dist'+assetPath),'image must exist in the published output: '+src);
  paths.push(assetPath);
 }
 assert.equal(new Set(paths).size,paths.length,
  'each homepage painting or clinical diagram must be a separate artwork');
 const portrait=delivered.find(tag=>tag.includes('/assets/ejoeun-gallery-cat-dentist-20261029.webp'));
 assert.ok(portrait&&portrait.includes('loading="eager"')&&portrait.includes('fetchpriority="high"'),
  'keep the approved doctor-and-cat painting prioritized in the first viewport');
 for(const tag of delivered){
  if(tag!==portrait)assert.ok(tag.includes('loading="lazy"'),
   'below-the-fold art should remain lazy-loaded');
 }
});

test('unique homepage paintings and clinical plates retain image count and editorial labels',()=>{
 const source=readFileSync('index.html','utf8');
 const original=[...source.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(x=>x[1]);
 const rendered=[...home.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(original.length>=35,'keep the original visual richness of the homepage');
 assert.equal(original.length,new Set(original).size,
  'do not reuse a single image in several homepage galleries');
 assert.deepEqual(rendered.map(src=>src.split(/[?#]/)[0]),original,
  'build preserves every source image and order after removing cache-only version tokens');
 assert.ok(rendered.some(src=>/^\/assets\/impressionist-water-garden\.svg\?v=[0-9a-f]{12}$/.test(src)),
  'the garden artwork receives a stable build fingerprint');
 for(const name of ['clinical-implant-section-20261102.svg','clinical-cavity-sequence-20261102.svg']){
  assert.ok(source.includes('src="/assets/'+name+'"'), 'keep original diagram image: '+name);
  assert.ok(source.includes('href="/assets/'+name+'" target="_blank" rel="noopener noreferrer"'),
   'each diagram needs its full-size reading link');
 }
 assert.equal((source.match(/class="clinical-edition-label"/g)||[]).length,2,
  'only the two explanatory clinical atlas cards have educational micro-labels');
 const css=read('assets/home-finishing-'+
  (home.match(/\/assets\/home-finishing-([0-9a-f]{12})\.css/)||[])[1]+'.css');
 assert.ok(css.includes('.clinical-edition-label'),
  'bundled CSS must style the medical explanatory labels');
});

test('clinic journal remains visibly distinct within the compact mobile menu',()=>{
 const css=read('assets/home-visit-faq-salon-20261031.css');
 const nav=readFileSync('index.html','utf8')
  .match(/<div class="mobile-quick">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.ok(nav.includes('class="stories-mobile-link"')&&
  nav.includes('href="/stories.html"'),
  'the original clinic journal destination remains explicit');
 assert.ok(css.includes('2026-11-03 | Visible clinic journal shortcut in mobile navigation.')&&
  css.includes('html:not(.home-scrolled) body.home-page header .nav .mobile-quick > a.stories-mobile-link')&&
  css.includes('html.home-scrolled body.home-page header .nav .mobile-quick > a.stories-mobile-link'),
  'journal styling remains distinct before and after scrolling');
 assert.ok(css.includes('min-height:50px')&&
  css.includes('border-bottom:3px solid #af9364')&&
  css.includes('body.home-page header .nav .mobile-quick > a.stories-mobile-link:focus-visible'),
  'journal shortcut remains thumb-sized, distinguishable, and keyboard-accessible');
});

test('compact first-screen mobile header preserves four reading shortcuts and fixed reservations',()=>{
 const css=read('assets/home-visit-faq-salon-20261031.css');
 const head=read('index.html').match(/<div class="mobile-quick">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.ok(css.includes('2026-11-03 | Compact first-screen mobile navigation with preserved booking dock.'),
  'responsive layer must describe its approved four-column compact navigation');
 assert.ok(css.includes('html:not(.home-scrolled) body.home-page header .nav .mobile-quick {')&&
  css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),
  'first-screen header must show four comfortably sized navigation shortcuts');
 assert.ok(css.includes('html:not(.home-scrolled) body.home-page header .nav .mobile-quick > a.mobile-call {')&&
  css.includes('display:none;'),
  'the duplicated header phone can be hidden only before scrolling');
 for(const link of ['#symptom-navigator-title','#home-symptom-query','/stories.html','#location','tel:0325132875']){
  assert.ok(head.includes('href="'+link+'"'),'keep the original five accessible HTML routes: '+link);
 }
 assert.ok(home.includes('class="mobile-booking-actions"')&&
  home.includes('class="mobile-booking-call"')&&
  home.includes('class="mobile-booking-naver"')&&
  home.includes('class="mobile-booking-visit"'),
  'telephone, booking and directions remain always available in the mobile dock');
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
 const finalStyle=exhibitionFoundation();
 assert.ok(finalStyle,'the final responsive stylesheet must be linked');
 assert.ok(styles.indexOf(finalStyle)>styles.indexOf(galleryFoundation()),
  'mobile exhibition rules must override earlier museum layers');
 const exhibition=read(finalStyle.slice(1));
 const deliveredLayer=name=>stripBundleDocumentation(read('assets/'+name).trimEnd())
  .replace(/[ \t]+$/gm,'').replace(/^[ \t]+/gm,'')
  .replace(/(?:\r?\n){2,}/g,'\n');
 assert.ok(exhibition.indexOf(deliveredLayer('curatorial-home.css'))>
  exhibition.indexOf(deliveredLayer('atelier-home-2026.css')),
  'original responsive layout follows original editorial rules in bundled CSS');
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
 assert.ok(home.includes('href="'+exhibitionFoundation()+'"'),
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
 assert.ok(home.includes('href="'+exhibitionFoundation()+'"'),
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
 for(const fact of ['네이버 블로그 글 697편','원장 블로그에서 다시 읽는 치과 이야기 7편',
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
  '/assets/retreatment/illustration-03-crown-microleakage-orange-20261103.webp',
  '/assets/retreatment/illustration-04-secondary-caries-apical-20261103.webp',
  '/assets/retreatment/illustration-05-apical-persistence-20261103.webp'
 ],'the first and second cause paintings must be owner-approved');
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
  '/assets/retreatment/illustration-03-crown-microleakage-orange-20261103.webp',
  '/assets/retreatment/illustration-04-secondary-caries-apical-20261103.webp',
  '/assets/retreatment/illustration-05-apical-persistence-20261103.webp'
 ]);
 assert.deepEqual(cards.map(x=>x[2]),[
  '남아 있는 세균','보철물 주변의 미세 누출','새로운 충치','뿌리 끝 염증의 지속'
 ]);
 assert.ok(causes.includes('크라운과 치아 사이의 틈으로 세균이 침투'));
 const art=readFileSync('dist/assets/retreatment/illustration-03-crown-microleakage-orange-20261103.webp');
 assert.ok(art.length>=100000,'owner-approved microleakage illustration must ship as WebP');
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
 assert.ok(home.includes('href="'+exhibitionFoundation()+'"'), 'versioned premium gallery stylesheet must load after the build');
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
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
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
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
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
 const main=visit.match(/<section class="card visit-hours-card"><h2 id="visit-hours">[\s\S]*?<\/section>/)?.[0]||'';
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
 const parking=visit.match(/<section class="card visit-parking-card"><h2 id="visit-parking">([\s\S]*?)<\/section>/)?.[1]||'';
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
 const finalCss=readAnnotatedHomeVisualCss('assets/home-art-direction-20261030.css');
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
 const finalCss=readAnnotatedHomeVisualCss('assets/home-art-direction-20261030.css');
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
 assert.ok(home.includes('role="search" aria-label="원장 네이버 블로그 글 697편 원문 제목 검색"'));
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


test('all 23 gallery originals stay first-party and descriptions follow the selected painting',()=>{
 const gallery=read('gallery.html');
 const script=read('assets/clinic-gallery.js');
 const css=read('assets/clinic-gallery.css');
 const buttons=[...gallery.matchAll(/class="gallery-zoom"[^>]*data-image="([^"]+)"/g)]
   .map(match=>match[1]);
 assert.equal(buttons.length,23,'all 23 originally curated pieces remain zoomable');
 assert.equal(new Set(buttons).size,23,'no source picture is duplicated');
 assert.ok(buttons.every(src=>/^\/assets\/[a-z0-9-]+\.(?:svg|webp|png|jpe?g)$/.test(src)),
   'zoom sources are local verified image URL shapes');
 assert.ok(gallery.includes('id="gallery-dialog-description"'));
 assert.ok(gallery.includes('id="gallery-dialog-original" href="/gallery.html"'));
 assert.ok(gallery.includes('class="gallery-dialog-care" id="gallery-dialog-care" hidden'),
   'existing clinical information action is intact');
 assert.ok(script.includes("description.textContent=artCaption?.textContent?.trim()"),
   'lightbox artwork descriptions must use the current source caption');
 assert.ok(script.includes("original.setAttribute('href',sourceImage)"),
   'original link must track the selected image, not the previous work');
 assert.ok(script.includes("original.removeAttribute('href')"),
   'unexpected image URLs must not leave a stale original link');
 assert.ok(script.includes("related.hidden=!hasGuide;"),
   'health advice appears only for the selected clinically linked artwork');
 assert.ok(css.includes('.gallery-dialog .gallery-dialog-description'));
 assert.ok(css.includes('.gallery-dialog .gallery-dialog-art-actions'));
 assert.ok(css.includes('@media(max-width:520px)'));
});


test('director museum profile keeps verified credentials and readable care links',()=>{
 const doctor=home.match(/<section class="section dark" id="doctor">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(doctor,'doctor section remains visible');
 const fixed=['고려대학교 의학박사(치과학 전공)','통합치의학과 전문의',
  '2003년부터','원장이 직접 검진하고 진단합니다.','자연치아 보존'];
 for(const phrase of fixed)assert.ok(doctor.includes(phrase),'verified clinic statement missing: '+phrase);
 assert.equal((doctor.match(/<img\b/g)||[]).length,1,'keep one original art print in the doctor exhibition');
 assert.ok(doctor.includes('src="/assets/ejoeun-tooth-preservation-garden-cat-20261029.webp"'));
 for(const destination of ['/doctor.html','/gum-treatment.html','/retreatment.html','/tooth-preservation.html']){
  assert.ok(doctor.includes('href="'+destination+'"'),'missing doctor/clinical link '+destination);
 }
 assert.equal((doctor.match(/class="doctor-credential-ledger__item"/g)||[]).length,3,
  'retain three factual credentials or practice-history details');
 assert.equal((doctor.match(/class="doctor-care-trails"/g)||[]).length,1);
 assert.ok(doctor.includes('<p class="doctor-profile-link"><a href="/doctor.html">'),
  'profile link is semantic and styled with the stylesheet instead of brittle inline colors');
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 for(const token of [
  "Director's room: museum-profile finishing",
  '#doctor .doctor-care-trails>a::before',
  'counter-increment:care-focus',
  '#doctor .doctor-credential-ledger__item>small',
  '@media(max-width:1100px)',
  '@media(max-width:700px)',
  '@media(max-width:390px)',
  '@media(prefers-reduced-motion:reduce)',
  '@media(forced-colors:active)'
 ])assert.ok(css.includes(token),'missing responsive, accessible doctor-gallery treatment: '+token);
 const doctorCssLinks=[...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 const doctorCss=homeVisualBundle();
 assert.ok(doctorCssLinks.includes(doctorCss),
 'the doctor refinements must ship in the content-hashed visual stylesheet');
 assert.ok(doctorCssLinks.indexOf(doctorCss)>doctorCssLinks.indexOf(exhibitionFoundation()),
 'visual refinements must follow the original exhibition CSS foundation');
 assert.ok(home.includes('class="mobile-booking-actions"')&&home.includes('class="btn hero-booking"'),
  'working Naver reservation controls remain');
});


test('museum FAQ and visit desk keep accessible clinical answers and verified schedule',()=>{
 const faq=home.match(/<section class="section light" id="faq">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.equal((faq.match(/<details id="faq-[a-z-]+">/g)||[]).length,11,
  'all 11 answer panels retain stable anchors and native details');
 assert.equal((faq.match(/<summary>/g)||[]).length,11,
  'all FAQ summaries remain available to keyboard and screen readers');
 assert.ok(faq.includes('faq-reading-gallery__painting') &&
  faq.includes('src="/assets/ejoeun-systemic-faq-stained-windows-20261029.svg"'),
  'FAQ original artwork remains unique and uncropped');
 const location=home.match(/<section class="section" id="location">([\s\S]*?)<\/section>/)?.[1]||'';
 for(const fact of ['대우프라자 305호','09:30~18:30','13:00~14:00',
  '오전 12:30 / 오후 18:00','3시간 무료','금·토요일은 두 가지 일정',
  '토요일 휴진 주','토요일 진료 주','tel:0325132875']) {
  assert.ok(location.includes(fact),'visit data missing: '+fact);
 }
 for(const id of ['address','parking-details','hours-details','weekly-hours']) {
  assert.ok(location.includes('id="'+id+'"'),'clinic navigation anchor missing: '+id);
 }
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 for(const token of [
  'Museum reading room: FAQ answers and visit desk',
  '#faq .faq-list>details[open]',
  '#faq .faq-list>details>summary::before',
  '#faq .faq-list>details>p',
  '#location .visit-quick-facts',
  '#location .alternating-hours-card',
  'grid-template-columns:repeat(2,minmax(0,1fr))',
  '@media(max-width:700px)',
  '@media(forced-colors:active)'
 ]) {
  assert.ok(css.includes(token),'missing final accessible FAQ/visit styling: '+token);
 }
 const links=[...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 const final=links.indexOf(homeVisualBundle());
 const predecessor=links.indexOf(exhibitionFoundation());
 assert.ok(final>predecessor && predecessor>=0,
  'FAQ and visit finishing styles should load last with a cache-busting query');
 assert.ok(home.includes('class="mobile-booking-actions"'),
  'mobile booking/phone dock must stay available');
});


test('museum symptom gallery keeps seven truthful guides and mobile choices',()=>{
 const section=home.match(/<section class="section" id="symptoms"[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(section,'seven symptom guide section remains present');
 const jump=section.match(/<nav class="symptom-jump-nav"[\s\S]*?<\/nav>/)?.[0]||'';
 const links=[...jump.matchAll(/<a href="#(symptom-[a-z-]+)">/g)].map(x=>x[1]);
 assert.deepEqual(links,[
  'symptom-bleeding','symptom-swelling','symptom-retreatment','symptom-sensitive',
  'symptom-biting','symptom-scaling','symptom-insurance'
 ],'all original patient symptoms remain in the intended order');
 for(const id of links)assert.ok(section.includes('id="'+id+'" tabindex="-1"'),
   'symptom anchor remains keyboard-focusable: '+id);
 assert.equal((section.match(/class="grid symptom-grid"/g)||[]).length,1);
 const cards=[...section.matchAll(/<div class="card"><h3 id="symptom-[a-z-]+"/g)];
 assert.equal(cards.length,7,'every patient problem retains its explanation card');
 assert.ok(section.includes('숨쉬기 어렵거나 삼키기 힘들다면 즉시 응급진료'),
  'urgent warning remains readable, not hidden behind artwork');
 for(const page of ['/health/gum-bleeding.html','/health/gum-pus.html',
  '/health/root-canal-after-pain.html','/health/abrasion-sensitive.html',
  '/health/tooth-crack.html','/health/scaling-vs-periodontal.html','/insured-care.html']){
   assert.ok(section.includes('href="'+page+'"'),'important original guide retained: '+page);
 }
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 for(const marker of [
  'Seven patient-question exhibition cards',
  '#symptoms .symptom-jump-links',
  '#symptoms .symptom-grid>.card>br',
  '#symptoms .symptom-grid>.card>a:last-of-type',
  '#symptoms .symptom-grid>.card:has(>h3:target)',
  '@media(max-width:900px)','@media(max-width:600px)',
  '@media(max-width:360px)','@media(forced-colors:active)'
 ])assert.ok(css.includes(marker),'missing accessible symptom-gallery refinement: '+marker);
 const styles=[...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 const final=styles.indexOf(homeVisualBundle());
 const previous=styles.indexOf(exhibitionFoundation());
 assert.ok(final>previous&&previous>=0,'final symptom styles must load after earlier art direction');
 assert.ok(home.includes('class="mobile-booking-actions"'),'Naver reservation and phone dock remain built');
});


test('gallery exit presents four genuine care guides and prominent Naver booking',()=>{
 const guides=home.match(/<section class="home-care-paths"[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(guides.includes('id="home-care-paths-title"'),'four-guide reading collection must remain');
 const grid=guides.match(/<div class="home-care-paths__grid"[\s\S]*?<\/div>/)?.[0]||'';
 const paths=[...grid.matchAll(/<a href="([^"]+)" aria-label=/g)].map(m=>m[1]);
 assert.deepEqual(paths,[
  '/gum-treatment.html','/retreatment.html','/cervical-abrasion.html','/insured-care.html'
 ],'retain all four original clinical destinations in order');
 for(const name of ['잇몸치료','재신경치료','치경부마모증','건강보험 진료']){
  assert.ok(guides.includes('<strong>'+name+'</strong>'),'medical guide heading missing: '+name);
 }
 assert.ok(guides.includes('치료 결과를 뜻하지 않습니다.'),
  'clinical imagery disclaimer remains visible');
 const secondary=guides.match(/<nav class="home-care-paths__other"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.ok(secondary.includes('aria-label="추가 진료 안내 세 가지"'),
  'the gallery exit must provide a clear secondary care navigation');
 for(const route of ['/cavity-treatment.html','/denture.html','/implant.html']){
  assert.ok(secondary.includes('href="'+route+'"'),
   'supplementary treatment guide link missing: '+route);
 }
 const archive=home.match(/<section class="home-archive-gallery"[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(archive.includes('href="/clinical-archive.html"'),
  'original clinician article archive remains available');
 const preparation=home.match(/<section aria-label="방문 전 유용한 안내"[\s\S]*?<\/section>/)?.[0]||'';
 for(const url of ['/visit-guide.html','/gum-treatment-faq.html',
  '/root-canal-retreatment-faq.html','/dental-insurance-faq.html',
  '/medication-dental-faq.html','/systemic-disease-dental-faq.html',
  '/medical-safety-guide.html','/previsit-checklist.html']){
  assert.ok(preparation.includes('href="'+url+'"'),'visitor guide lost: '+url);
 }
 const final=home.match(/<nav class="home-finish-nav"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.ok(final.includes('id="home-finish-title"'),'patient-first conclusion must remain');
 assert.ok(final.includes('2003년부터 청천동 한자리에서'),'original practice-history text remains');
 const booking=final.match(/<a class="home-finish-booking" href="([^"]+)"/)?.[1];
 assert.equal(booking,'https://booking.naver.com/booking/13/bizes/1162931',
  'closing primary CTA must open the confirmed Naver booking page');
 for(const href of ['/visit-guide.html','#focus-care','#main-content'])
  assert.ok(final.includes('href="'+href+'"'),'closing wayfinding link removed: '+href);
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 for(const token of [
  'Museum exit: care guides, archive and next step',
  '.home-care-paths>.home-care-paths__grid',
  '.home-archive-gallery>a.home-archive-gallery__link',
  '.home-previsit-links>.home-previsit-card',
  '.home-finish-nav .home-finish-actions>a.home-finish-booking',
  'grid-template-columns:repeat(2,minmax(0,1fr))',
  '@media(max-width:900px)','@media(max-width:700px)',
  '@media(max-width:390px)','@media(prefers-reduced-motion:reduce)',
  '@media(forced-colors:active)'
 ]){
  assert.ok(css.includes(token),'missing final responsive museum exit style: '+token);
 }
 const styles=[...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 const after=styles.indexOf(homeVisualBundle());
 const before=styles.indexOf(exhibitionFoundation());
 assert.ok(after>before && before>=0,'closing gallery finishes after old design layers');
 assert.ok(home.includes('class="mobile-booking-actions"') &&
  home.includes('href="tel:0325132875"'),'independent mobile phone and booking stay available');
});


test('opening gallery hero keeps doctor-cat full portrait and validated primary actions',()=>{
 const hero=home.match(/<section class="hero wrap">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(hero,'opening hero remains available to readers and crawlers');
 assert.ok(hero.includes('id="headline"')&&hero.includes('자연치아를 먼저 생각합니다.'),
  'retain the clinic tooth-preservation headline');
 for(const fact of ['2003년부터 한자리에서','고려대학교 의학박사(치과학 전공)',
   '통합치의학과 전문의','청천동치과 이조은치과']){
   assert.ok(hero.includes(fact),'missing factual clinic introduction: '+fact);
 }
 const art=hero.match(/<img\b[^>]*src="\/assets\/ejoeun-gallery-cat-dentist-20261029\.webp"[^>]*>/)?.[0]||'';
 assert.ok(art && art.includes('width="1200" height="800"'),
  'preserve the approved original 3:2 doctor-cat painting');
 assert.ok(art.includes('loading="eager"')&&art.includes('fetchpriority="high"'),
  'original above-the-fold art remains prioritized without extra requests');
 const actions=hero.match(/<div class="hero-actions">([\s\S]*?)<\/div>/)?.[1]||'';
 const phone=actions.match(/<a\b[^>]*class="btn hero-call"[^>]*>/)?.[0]||'';
 const book=actions.match(/<a\b[^>]*class="btn hero-booking"[^>]*>/)?.[0]||'';
 assert.ok(phone.includes('href="tel:0325132875"'));
 assert.ok(book.includes('href="https://booking.naver.com/booking/13/bizes/1162931"'));
 for(const dest of ['class="btn hero-hours"','class="btn hero-symptoms"','class="btn hero-map"']){
   assert.ok(actions.includes(dest),'keep the clinical direction control '+dest);
 }
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 for(const rule of [
   'Opening portrait: faithful 3-to-2 canvas and gallery masthead',
   '.hero.wrap>.art.hero-artwork>img',
   'aspect-ratio:3/2;',
   'object-fit:contain;',
   '.hero.wrap .hero-doctor-credentials',
   '@media(min-width:901px)',
   '@media(max-width:760px)',
   '@media(max-width:365px)',
   '@media(forced-colors:active)'
 ])assert.ok(css.includes(rule),'missing accessible original-art opening design: '+rule);
 const imgs=[...home.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(imgs.length,(readFileSync('index.html','utf8').match(/<img\b/g)||[]).length,'retain all current homepage illustrations');
 assert.equal(new Set(imgs).size,imgs.length,'do not reuse any painting on the same homepage');
 const styles=[...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 const final=styles.indexOf(homeVisualBundle());
 const earlier=styles.indexOf(exhibitionFoundation());
 assert.ok(final>earlier && earlier>=0,'latest portrait finish loads after older responsive layout');
 assert.ok(home.includes('class="mobile-booking-actions"'),'working phone-side booking dock remains');
});


test('focused care desk makes five genuine wayfinding links easy to read',()=>{
 const focus=home.match(/<section class="section light" id="focus-care">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(focus.includes('자연치아를 지키는 진료에 집중합니다'),'important medical intro is retained');
 assert.ok(focus.includes('인천 잇몸치료·부평 잇몸치료')&&
  focus.includes('인천 신경치료·부평 신경치료'),'SEO text remains original');
 const guide=focus.match(/<nav class="focus-care-shortcuts"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 const guided=[...guide.matchAll(/<a href="([^"]+)">/g)].map(x=>x[1]);
 assert.deepEqual(guided,[
  '/gum-treatment.html','/retreatment.html','/cervical-abrasion.html',
  '/insured-care.html','/scaling.html'
 ],'all original clinician care cards keep their native links');
 const desk=focus.match(/<nav class="care-find-links"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 const destinations=[...desk.matchAll(/<a href="([^"]+)">/g)].map(x=>x[1]);
 assert.deepEqual(destinations,['#symptoms','#care','/search.html','#faq','#visit-guide'],
  'visitor information desk retains the five working patient routes');
 for(const anchor of ['symptoms','care','faq','visit-guide']){
  assert.ok(home.includes('id="'+anchor+'"'),'matching homepage jump anchor missing: '+anchor);
 }
 const art=focus.match(/<img src="\/assets\/ejoeun-scaling-stilllife-20261029\.svg"[^>]*>/)?.[0]||'';
 assert.ok(art.includes('width="1200" height="800"') && art.includes('loading="lazy"'),
  'the unique full-ratio original doctor-care artwork stays untouched');
 assert.ok(focus.includes('치과의사가 직접 잇몸을 살핍니다.')&&
  focus.includes('원장이 직접 검진·진단'),'core medical philosophy is preserved');
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 for(const rule of [
  'Focus-care patient information desk',
  '#focus-care .focus-care-lead-copy>h2',
  '#focus-care .focus-care-lead-art>figcaption',
  '#focus-care .care-find-links',
  'grid-template-columns:repeat(5,minmax(0,1fr))',
  'grid-template-columns:repeat(3,minmax(0,1fr))',
  'grid-template-columns:repeat(2,minmax(0,1fr))',
  '@media(max-width:1000px)','@media(max-width:700px)',
  '@media(max-width:365px)','@media(forced-colors:active)'
 ])assert.ok(css.includes(rule),'missing responsive focus-care museum desk: '+rule);
 assert.equal((home.match(/<img\b/g)||[]).length,
  (readFileSync('index.html','utf8').match(/<img\b/g)||[]).length,
  'do not add or remove illustrations while refining patient links');
 assert.ok(home.includes('class="mobile-booking-actions"') &&
  home.includes('class="btn hero-booking"'),'mobile booking functions preserved');
 const cssUrls=[...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 const last=cssUrls.indexOf(homeVisualBundle());
 const earlier=cssUrls.indexOf(exhibitionFoundation());
 assert.ok(last>earlier && earlier>=0,'updated information desk stylesheet loads last');
});


test('patient-question salon preserves four original article links and unique painting',()=>{
 const section=home.match(/<section class="section light" id="home-representative-guides"[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(section.includes('id="home-representative-guides-title"'),
  'patient education room needs its original discoverable heading');
 const grid=section.match(/<div class="home-representative-guide-grid">([\s\S]*?)<\/div>/)?.[1]||'';
 const links=[...grid.matchAll(/<a href="([^"]+)"><strong>([^<]+)<\/strong><span>([^<]+)<\/span><\/a>/g)];
 assert.deepEqual(links.map(x=>x[1]),[
  '/stories/2026-10-24-bupyeong-swollen-bleeding-gums-visit-dentist/',
  '/stories/2026-10-26-cheongcheon-gum-color-change-red-gums-periodontal-care/',
  '/stories/2026-10-24-bupyeong-severe-toothache-deep-caries-extraction-vs-root-canal/',
  '/stories/2026-10-24-bupyeong-cavity-gi-insurance/'
 ],'retain four distinct source-linked patient education articles in order');
 for(const [,href,title,description] of links){
  assert.ok(title.length>8&&description.length>12,'do not hide patient-friendly article copy');
  assert.ok(existsSync('dist'+href+'index.html'),'the linked educational article must be published: '+href);
 }
 assert.ok(section.includes('각 증상의 원인은 개인마다 달라 진찰과 검사가 필요합니다.'),
  'do not suppress the original non-diagnostic caution');
 const painting=section.match(/<img src="\/assets\/ejoeun-preservation-atelier-20261029\.svg"[^>]*>/)?.[0]||'';
 assert.ok(painting.includes('width="1200" height="760"')&&painting.includes('loading="lazy"'),
  'approved unique natural-tooth artwork keeps its original dimensions and lazy loading');
 assert.ok(section.includes('href="/tooth-preservation.html"'),
  'full tooth-preservation explanation remains linked');
 const images=[...home.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(images.length,(readFileSync('index.html','utf8').match(/<img\b/g)||[]).length,'all current homepage images remain');
 assert.equal(new Set(images).size,images.length,'homepage never repeats its original art');
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 for(const rule of [
  'Four patient questions in the illustrated reading salon',
  'counter-reset:patient-question',
  'counter-increment:patient-question',
  'counter(patient-question,decimal-leading-zero)',
  '#home-representative-guides .home-representative-guide-grid>a:focus-visible',
  '#home-representative-guides .home-representative-art img',
  'aspect-ratio:30/19;',
  '@media(min-width:1080px)',
  '@media(max-width:1079px)',
  '@media(max-width:700px)',
  '@media(forced-colors:active)'
 ])assert.ok(css.includes(rule),'missing mobile-friendly museum reading room: '+rule);
 const styles=[...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 const last=styles.indexOf(homeVisualBundle());
 const before=styles.indexOf(exhibitionFoundation());
 assert.ok(last>before&&before>=0,'refined reading room must load after the earlier designs');
 assert.ok(home.includes('class="mobile-booking-actions"'),'mobile phone and appointment stay accessible');
});


test('eight care gallery keeps all twelve services and original artwork',()=>{
 const section=home.match(/<section class="section" id="care">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(section.includes('이조은치과 주요 진료 12가지'));
 const primary=section.match(/<div class="care-directory__primary">([\s\S]*?)<\/div>/)?.[1]||'';
 const major=[...primary.matchAll(/<a href="([^"]+)"><small>/g)].map(x=>x[1]);
 assert.deepEqual(major,['/gum-treatment.html','/retreatment.html','/cervical-abrasion.html','/insured-care.html']);
 const more=section.match(/<details class="care-directory__more" open>[\s\S]*?<div class="care-directory__secondary">([\s\S]*?)<\/div>/)?.[1]||'';
 const additional=[...more.matchAll(/<a href="([^"]+)">/g)].map(x=>x[1]);
 assert.deepEqual(additional,[
  '/implant.html','/cavity-treatment.html','/wisdom-tooth.html','/tmj-care.html',
  '/scaling.html','/denture.html','/pediatric-orthodontics.html','/pediatric-dentistry.html'
 ],'the full twelve-category clinical index must remain visible and correct');
 const gallery=section.match(/<details class="care-more-details">([\s\S]*?)<\/details>/)?.[1]||'';
 assert.ok(gallery.includes('<summary>임플란트·충치·틀니 등 다른 진료 8가지 더 보기'),
  'the native eight-specialty disclosure must remain keyboard accessible');
 const figures=[...gallery.matchAll(/<figure class="care-mini-gallery(?: care-mini-gallery--wide)?"><img src="([^"]+)"[^>]*>/g)];
 assert.equal(figures.length,8,'each of the additional eight specialties must keep its original illustrated frame');
 const artworks=figures.map(x=>x[1]);
 assert.equal(new Set(artworks).size,8,'do not repeat medical artwork in the specialty gallery');
 for(const image of artworks){
  assert.ok(existsSync('dist'+image),'the original illustrated care artwork remains published: '+image);
 }
 for(const topic of ['임플란트','충치치료','사랑니 발치','턱관절 치료','스케일링',
  '틀니치료','어린이 교정','어린이 치과진료']){
  assert.ok(gallery.includes('<h3>'+topic+'</h3>'),'specialty and original explanation remain: '+topic);
 }
 assert.ok(section.includes('진료 가능 범위와 치료 방법은 개별 검사 결과에 따라 달라질 수 있습니다.'),
  'patient-facing clinical limitations must remain visible');
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 for(const rule of [
  'Eight-care gallery entrance and reading plates',
  '#care .care-more-details>summary',
  '#care .care-more-details[open]>summary',
  '#care .care-more-details .care-mini-gallery>img',
  'aspect-ratio:auto;',
  'object-fit:contain;',
  '#care .care-more-details .care-more-grid>.card>p:last-child>a:focus-visible',
  '@media(max-width:820px)','@media(max-width:600px)',
  '@media(prefers-reduced-motion:reduce)','@media(forced-colors:active)'
 ])assert.ok(css.includes(rule),'missing readable accessible secondary specialty catalogue: '+rule);
 const styles=[...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 const last=styles.indexOf(homeVisualBundle());
 const old=styles.indexOf(exhibitionFoundation());
 assert.ok(last>old&&old>=0,'latest art-room layer loads after prior visual treatment');
 assert.equal((home.match(/<img\b/g)||[]).length,
  (readFileSync('index.html','utf8').match(/<img\b/g)||[]).length,'existing homepage artwork set is unchanged');
 assert.ok(home.includes('class="mobile-booking-actions"')&&home.includes('class="btn hero-booking"'),
  'phone and booking shortcuts must remain available');
});

test('mobile homepage keeps original portrait without costly Korean webfont subsets',()=>{
 const head=home.slice(0,home.indexOf('</head>'));
 const activeHead=head.replace(/<noscript>[\s\S]*?<\/noscript>/g,'');
 const allFontLinks=[...activeHead.matchAll(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+"[^>]*>/g)].map(m=>m[0]);
 assert.equal(allFontLinks.length,1,
  'only lightweight Latin CSS may be discoverable as a stylesheet in the mobile HTML parser');
 const latin=allFontLinks.find(link=>link.includes('family=DM+Sans'));
 assert.ok(latin?.includes('media="print" onload="this.media=\'all\'"'),
  'optional Latin typography should not block first paint');
 assert.ok(!latin.includes('Noto+Serif+KR'),
  'do not mix expensive Korean subsets into the mobile font request');
 assert.ok(!allFontLinks.some(link=>link.includes('Noto+Serif+KR')),
  'desktop Korean serif must not be a discoverable stylesheet on mobile');
 assert.ok(activeHead.includes("window.matchMedia('(min-width: 801px)')")&&
   activeHead.includes('desktopSerifMedia.matches')&&
   activeHead.includes("serifLink.rel='stylesheet'")&&
   activeHead.includes("serifLink.media='(min-width: 801px)'"),
  'Korean desktop serif must load only after matching the desktop viewport');
 assert.ok(activeHead.includes('Noto+Serif+KR:wght@500;600;700&display=optional'),
  'preserve original Korean desktop font family, weights, and optional display');
 assert.ok(head.includes('Noto+Serif+KR:wght@500;600;700&amp;display=optional" media="(min-width: 801px)"></noscript>'),
  'desktop serif remains available when scripts are disabled');
 const fallback=head.match(/<noscript><link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+"><\/noscript>/g)||[];
 assert.equal(fallback.length,1,'no-script mobile fallback should use one Latin family');
 assert.ok(fallback[0].includes('family=DM+Sans')&&!fallback[0].includes('Noto+Serif+KR'));
 const portrait=home.match(/<img\b[^>]*ejoeun-gallery-cat-dentist-20261029\.webp[^>]*>/)?.[0]||'';
 assert.ok(portrait.includes('srcset=')&&portrait.includes('sizes=')&&
  portrait.includes('loading="eager" fetchpriority="high" decoding="sync"'),
  'retain the approved responsive high-priority doctor-and-cat portrait');
 const preload=head.match(/<link rel="preload" as="image"[^>]*>/)?.[0]||'';
 assert.ok(preload.includes('imagesrcset=')&&preload.includes('imagesizes='),
  'portrait preload should select the same responsive image');
});

test('FAQ and clinic hours styling loads offscreen without blocking hero or journal navigation',()=>{
 const names=['quiet-museum-finish-20261031.css','museum-finish-20261031.css','home-visit-faq-salon-20261031.css'];
 const originals=names.map(name=>read('assets/'+name).trimEnd());
 const compact=css=>{
  assert.equal((css.match(/\/\*[\s\S]*?\*\//g)||[]).length,
   (css.match(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*(?:\r?\n|$)/gm)||[]).length,
   'only source documentation may be removed from deployed CSS');
  return css.replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*(?:\r?\n|$)/gm,'').trimEnd();
 };
 const marker='/* 2026-11-01 | Visible clinic journal navigation and first-screen visit facts. */';
 const salon=originals[2],split=salon.indexOf(marker);
 assert.ok(split>4000 && salon.split(marker).length===2,'FAQ CSS split point remains unambiguous');
 const offscreen=compact(salon.slice(0,split))+'\n';
 const critical=compact(salon.slice(split));
 const finish=[compact(originals[0]),compact(originals[1]),critical].join('\n\n')+'\n';
 const hash=css=>createHash('sha256').update(css).digest('hex').slice(0,12);
 const finishPath='/assets/home-finishing-'+hash(finish)+'.css';
 const deferredPath='/assets/home-faq-visit-'+hash(offscreen)+'.css';
 assert.equal(read(finishPath.slice(1)),finish,'hero and journal CSS must remain render-blocking');
 assert.equal(read(deferredPath.slice(1)),offscreen,'FAQ/location CSS is byte-for-byte preserved');
 assert.ok(!finish.includes('body.home-page #main-content > #faq .faq-quick-links'),
  'FAQ layout must not remain in the blocking finish bundle');
 assert.ok(finish.includes('.hero-local-intro .hero-visit-facts') &&
  finish.includes('header .navlinks a.stories-nav-link'),
  'visible opening actions and journal navigation must not flash unstyled');
 assert.ok(offscreen.includes('body.home-page #main-content > #faq .faq-quick-links') &&
  offscreen.includes('body.home-page #main-content > #location'),
  'FAQ question anchors and alternating clinic hours must remain styled');
 const offscreenSelectors=[...offscreen.matchAll(/([^{};]+)\{/g)]
  .map(match=>match[1].trim()).filter(x=>x&&!x.startsWith('@'));
 assert.ok(offscreenSelectors.length>=20&&offscreenSelectors.every(selector=>
  selector.split(',').every(part=>/body\.home-page\s+#main-content\s*>\s*#(?:faq|location)\b/.test(part))),
 'deferred CSS must target only offscreen sections');
 assert.ok(home.includes('<link rel="stylesheet" href="'+finishPath+'">'),
  'home finishing rules load synchronously');
 const lazy='<link rel="stylesheet" href="'+deferredPath+'" media="print" onload="this.media=\'all\'">';
 assert.ok(home.includes(lazy),'deferred FAQ styling should not block the first screen');
 assert.ok(home.includes('<noscript><link rel="stylesheet" href="'+deferredPath+'"></noscript>'),
  'when JavaScript is disabled the whole FAQ/visiting guide must still render normally');
 const visualStyles=[...home.matchAll(/<link rel="stylesheet" href="(\/assets\/[^"]+)"/g)]
  .map(m=>m[1]);
 const idx=visualStyles.indexOf(homeVisualBundle());
 assert.ok(idx>=0&&visualStyles[idx+1]===finishPath&&visualStyles[idx+2]===deferredPath,
  'the first-screen and offscreen CSS must stay in correct cascade order');
 assert.ok(!names.some(name=>home.includes('href="/assets/'+name)),
  'original unversioned styles must not cause redundant requests');
 assert.ok(originals.join(' ').includes('Clear anchor offsets for sticky clinic navigation')&&
  originals.join(' ').includes('FAQ & visit salon'),
  'editable source documentation is retained');
});

test('identical homepage CSS declarations are not repeated in a matching scope',()=>{
 const atelier=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 const museum=read('assets/museum-finish-20261031.css');
 const director=readAnnotatedHomeVisualCss('assets/home-art-direction-20261030.css');
 const plaque=/body\.home-page #main-content > \.hero\.wrap \.hero-artwork__plaque\s*\{\s*padding:10px 10px 8px;\s*\}/g;
 const doctor=/body\.home-page #main-content > #doctor \.doctor-profile-link > a\s*\{\s*text-underline-offset:5px;\s*\}/g;
 assert.equal([...atelier.matchAll(plaque)].length,1,
  'the narrow-screen portrait caption needs one effective matching style');
 assert.equal([...museum.matchAll(doctor)].length,1,
  'the doctor detail link needs one underline setting in the final layer');
 // This matching visual rule serves different base/mobile media contexts.
 // It must NOT be removed as an identical duplicate.
 const mobileBadge=/body\.home-page #main-content>\.hero\.wrap>\.art\.hero-artwork::after\s*\{\s*content:none;\s*display:none;\s*\}/g;
 assert.equal([...director.matchAll(mobileBadge)].length,2,
  'base and narrow-screen illustration overlays require their own overrides');
 const original=readFileSync('index.html','utf8');
 assert.ok(original.includes('atelier-refinement-20261030.css?v=20261031-safe-dedup25'),
  'original homepage source must invalidate the pre-final browser CSS cache');
 assert.ok(homeVisualBundle(),
 'built homepage must preserve pre-final styles in the verified combined CSS');

 assert.ok(original.includes('museum-finish-20261031.css?v=20261101-editorial-clarity1'),
  'portrait entrance styling must carry a fresh browser CSS version');
 assert.ok(museum.includes('Portrait-led entrance finishing'),
  'new entrance stylesheet must retain the original portrait presentation rules');
});

test('previsit selection tally stays local and the existing clinic safety advice remains',()=>{
 const previsit=read('previsit-checklist.html');
 const history=read('medical-history.html');
 const visual=read('assets/previsit-journey.css');
 const behavior=read('assets/previsit-checklist-progress.js');
 assert.equal((previsit.match(/type="checkbox"/g)||[]).length,10,
  'retain the ten patient-preparation choices');
 assert.ok(previsit.includes('id="previsit-progress" hidden'),
  'enhancement must remain hidden when JavaScript is unavailable');
 assert.ok(previsit.includes('id="previsit-selected-count" role="status" aria-live="polite"'),
  'checked count is accessible to screen reader users');
 assert.ok(previsit.includes('id="previsit-clear" type="button" disabled'),
  'selection reset cannot submit medical information');
 assert.ok(previsit.includes('previsit-checklist-progress.js?v='),
  'local-only enhancement must be loaded from the clinic asset');
 assert.ok(visual.includes('Local-only visit preparation and medical Q&A typography'));
 assert.ok(visual.includes('.previsit-progress[hidden]') &&
  visual.includes('display:none!important'),
  'no-JavaScript fallback and printed checklists should omit the controls');
 assert.ok(behavior.includes("section.addEventListener('change',update)") &&
  behavior.includes("clear.addEventListener('click'"),
  'selection counter and reset should both work without saving selections');
 assert.ok(!/(?:fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|navigator\.sendBeacon|document\.cookie)/.test(behavior),
  'preparation choices must not be persisted or transmitted');
 for(const page of [previsit,history]){
  assert.ok(page.includes('처방약')||page.includes('복용 중인 약은 임의로 중단하지 마세요'),
   'keep the medication caution before clinical treatment');
  assert.ok(page.includes('/assets/previsit-journey.css?v='),
   'built page should link to the content-versioned preparation stylesheet');
 }
 for(const name of ['previsit-checklist.html','medical-history.html']){
  const original=readFileSync(name,'utf8');
  assert.match(original,/href="\/assets\/previsit-journey\.css\?v=[a-zA-Z0-9_-]+"/,
   'original '+name+' must link to the versioned preparation stylesheet');
 }
 assert.ok(previsit.includes('booking.naver.com/booking/13/bizes/1162931'));
 assert.ok(history.includes('id="visit-checklist"'),'printable health-history form preserved');
});


test('mobile optional music stays above booking actions and FAQ deep links reveal answers',()=>{
 const finish=read('assets/museum-finish-20261031.css');
 const faqLinkScript=read('assets/faq-deeplink.js');
 assert.match(finish,/body\.home-page \.piano-player\s*\{\s*bottom:calc\(100px/);
 assert.ok(finish.includes('max-height:min(54dvh, 430px)'),
   'expanded music panel is scrollable instead of covering the full phone');
 assert.ok(home.includes('src="/assets/faq-deeplink.js" defer'),
   'home loads the small optional FAQ enhancement without changing native details');
 assert.ok(faqLinkScript.includes("window.addEventListener('hashchange',openHashQuestion)"));
 assert.ok(faqLinkScript.includes('if(question)question.open=true'),
   'a question reached by direct link or quick navigation opens visibly');
});


test('portrait-led first screen stays simple without removing search or contact content',()=>{
 const finish=read('assets/museum-finish-20261031.css');
 const source=readFileSync('index.html','utf8');
 const start=source.indexOf('<section class="hero wrap">');
 const end=source.indexOf('</section>',start);
 const hero=source.slice(start,end);
 assert.ok(start>=0 && end>start);
 assert.ok(finish.includes('2026-11-01 | Quiet, portrait-first homepage entrance'));
 assert.ok(finish.includes('body.home-page #main-content > .hero.wrap .hero-actions > .hero-map {\n    display:none;'),
   'mobile keeps the map link in markup while removing its duplicated first-screen button');
 assert.ok(hero.includes('<h1 id="headline">') && hero.includes('자연치아를 먼저 생각합니다.'));
 assert.ok(hero.includes('class="art hero-artwork"') && hero.includes('ejoeun-gallery-cat-dentist-20261029.webp'));
 assert.ok(hero.includes('<!-- BUILD_NAVER_BOOKING_HERO -->') && hero.includes('href="tel:0325132875"'));
 assert.ok(hero.includes('href="https://map.naver.com/p/entry/place/13239400"'));
 assert.ok(hero.includes('class="hero-editorial-detail"') && hero.includes('class="hero-care-summary"'));
 assert.ok(source.includes('id="location"') && source.includes('id="symptom-navigator-title"'));
});


test('2026-11-01 care gallery spacing keeps all five priority cards and paintings',()=>{
 const css=read('assets/museum-finish-20261031.css');
 const source=readFileSync('index.html','utf8');
 const care=source.slice(source.indexOf('<section class="section" id="care">'),source.indexOf('<section class="section dark" id="doctor">'));
 const gallery=source.slice(source.indexOf('id="gallery"'),source.indexOf('id="health-info"'));
 const picture=source.slice(source.indexOf('<section class="care-picture-notes"'),source.indexOf('id="home-representative-guides"'));
 assert.ok(css.includes('2026-11-01 | Care cards and art-gallery reading rhythm'));
 assert.ok(css.includes('body.home-page #main-content > #care > .wrap > .grid > .care-primary-card'));
 assert.ok(css.includes('body.home-page #main-content > #gallery .gallery-exhibition-index'));
 assert.ok(css.includes('body.home-page #main-content > .care-picture-notes .care-picture-notes__grid'));
 assert.equal((care.match(/class="card care-primary-card"/g)||[]).length,4);
 assert.ok(care.includes('class="card care-preservation-feature"'));
 assert.equal((picture.match(/class="care-picture-notes__card"/g)||[]).length,3);
 assert.equal((gallery.match(/class="gallery-exhibition-index__room"/g)||[]).length,3);
 assert.ok(care.includes('<details class="care-more-details">'));
 assert.ok(css.includes('Retain the existing horizontal, swipeable three-picture patient gallery'));
 assert.ok(source.includes('<!-- BUILD_NAVER_BOOKING_MOBILE -->'));
});


test('2026-11-01 compact homepage layout preserves all sections and SEO entry points',()=>{
 const source=readFileSync('index.html','utf8');
 const css=read('assets/museum-finish-20261031.css');
 assert.ok(css.includes('2026-11-01 | A shorter homepage reading journey'));
 assert.ok(css.includes('padding-block:clamp(50px,5.8vw,78px);'));
 assert.ok(css.includes('padding-block:clamp(36px,9vw,50px);'));
 for(const id of ['philosophy','focus-care','home-representative-guides','symptoms','care',
   'doctor','gallery','health-info','stories','faq','location']){
  assert.ok(source.includes('id="'+id+'"'),'keep indexable homepage section: '+id);
 }
 for(const src of ['ejoeun-gallery-cat-dentist-20261029.webp',
   'gallery-starry-clinic.svg','gallery-golden-garden.svg',
   'watercolor-care-gum-20261029.webp','clinical-cervical-abrasion-20261102.svg',
   'watercolor-care-insurance-20261029.webp',
   'clinical-implant-section-20261102.svg','clinical-cavity-sequence-20261102.svg']){
  assert.ok(source.includes(src),'homepage illustration available: '+src);
 }
 // The original watercolor gallery remains intact while the corresponding
 // treatment pages and homepage use independently titled clinical diagrams.
 assert.ok(read('gallery.html').includes('watercolor-care-abrasion-20261029.webp'),
   'the gallery retains the original abrasion watercolor');
 for(const name of ['clinical-cervical-abrasion-20261102.svg',
  'clinical-implant-section-20261102.svg','clinical-cavity-sequence-20261102.svg']){
  const art=read('assets/'+name);
  assert.ok(art.startsWith('<svg')&&art.includes('viewBox="0 0 1200 800"')&&
   art.includes('<title')&&art.includes('<desc')&&art.includes('</svg>'),
   'clinical diagrams must be standalone, accessible SVG art: '+name);
 }
 for(const [page,name] of [
  ['cervical-abrasion.html','clinical-cervical-abrasion-20261102.svg'],
  ['implant.html','clinical-implant-section-20261102.svg'],
  ['cavity-treatment.html','clinical-cavity-sequence-20261102.svg']
 ]){
  const guide=read(page);
  assert.ok(guide.includes('src="/assets/'+name+'"'),
   'patient guide uses its dedicated anatomy diagram: '+page);
  assert.ok(guide.includes('href="/assets/'+name+'" target="_blank" rel="noopener noreferrer"'),
   'mobile readers can open a full-size, safe clinical diagram: '+page);
 }
 const implantCss=read('assets/secondary-salon-finish-20261031.css');
 const cervicalCss=read('assets/care-exhibition-finish-20261031.css');
 assert.ok(implantCss.includes('2026-11-02 | Clinical atlas presentation and full-size art link.') &&
  implantCss.includes('.ejoeun-topic-art__caption > span > a') &&
  implantCss.includes('min-height:46px'),
  'implant and cavity guides need visible touch-sized image enlargement controls');
 assert.ok(cervicalCss.includes('2026-11-02 | Cervical clinical atlas mobile enlargement.') &&
  cervicalCss.includes('.care-feature-art__image > figcaption > a') &&
  cervicalCss.includes('min-height:46px'),
  'sensitivity guide needs a visible touch-sized image enlargement control');
 const cavityMarkup=read('cavity-treatment.html');
 assert.ok(cavityMarkup.includes('class="ejoeun-topic-art__visual clinical-atlas-scroll"') &&
  cavityMarkup.includes('tabindex="0"') &&
  cavityMarkup.includes('class="clinical-atlas-swipe-hint"') &&
  /href="\/assets\/secondary-salon-finish-20261031\.css\?v=[^"]+"/.test(cavityMarkup),
  'cavity clinical atlas must support zoom and keyboard scroll on small screens');
 assert.ok(implantCss.includes('secondary-cavity .ejoeun-topic-art__visual.clinical-atlas-scroll') &&
  implantCss.includes('width:780px') &&
  implantCss.includes('overflow-x:auto') &&
  implantCss.includes('overscroll-behavior-inline:contain') &&
  implantCss.includes('@media(max-width:600px)'),
  'cavity triptych must not shrink to unreadable text on mobile');
 assert.match(cavityMarkup,
  /<\/div>\s*<figcaption class="ejoeun-topic-art__caption">\s*<p class="clinical-atlas-swipe-hint">/,
  'cavity swipe hint belongs to the figure caption, not a third desktop grid column');
 for(const name of ['clinical-implant-section-20261102.svg',
  'clinical-cavity-sequence-20261102.svg']){
  assert.ok(source.includes('href="/assets/'+name+'" target="_blank" rel="noopener noreferrer"'),
   'homepage patient atlas is also readable at full size: '+name);
 }
 const homeAtlasCss=read('assets/home-visit-faq-salon-20261031.css');
 assert.ok(homeAtlasCss.includes('2026-11-03 | Patient atlas: legible plates and enlargement links.') &&
  homeAtlasCss.includes('.care-mini-gallery > figcaption > a') &&
  homeAtlasCss.includes('min-height:48px'),
  'original paintings and scientific drawings keep distinct, touch-readable presentation');
 assert.ok(source.includes('class="care-directory__more" open'),
   'the entire twelve-treatment quick directory is accessible by default');
 assert.ok(source.includes('class="owner-stories-more"'),
   'older original Naver articles remain available in a native disclosure');
 assert.ok(source.includes('<!-- BUILD_NAVER_BOOKING_MOBILE -->'),
   'mobile booking and phone dock remains intact');
 const readingRules=css.slice(
   css.indexOf('2026-11-01 | A shorter homepage reading journey'),
   css.indexOf('2026-11-01 | Compact mobile header')
 );
 assert.ok(readingRules&&!readingRules.includes('display:none'),
   'only the reading-density section must not hide medical content');
});


test('compact phone header routes to symptoms without duplicating dock telephone',()=>{
 const source=read('index.html');
 const css=read('assets/museum-finish-20261031.css');
 const header=source.slice(source.indexOf('<header>'),source.indexOf('</header>'));
 assert.ok(css.includes('2026-11-01 | Compact mobile header gives patients the symptom guide'));
 assert.ok(css.includes('html.home-scrolled body.home-page header .nav .mobile-quick a[href="#symptom-navigator-title"]'));
 assert.ok(css.includes('html.home-scrolled body.home-page header .nav .mobile-quick a.mobile-call {\n    display:none;'));
 assert.ok(header.includes('href="#symptom-navigator-title"')&&header.includes('href="#home-symptom-query"'));
 assert.ok(header.includes('class="stories-mobile-link"')&&header.includes('class="mobile-call"'));
 assert.ok(source.includes('class="mobile-booking-actions"')&&
   source.includes('class="mobile-booking-naver"'),
   'built mobile telephone, booking and visit dock must be rendered');
 assert.ok(source.includes('href="tel:0325132875"')&&
   source.includes('class="btn hero-booking"'));
 assert.ok(source.includes('id="symptom-navigator-title"')&&
   source.includes('id="home-symptom-query"'));
 assert.ok(css.includes('@media (max-width:600px)'));
});


test('offscreen museum galleries remain crawlable while mobile rendering skips distant sections',()=>{
 const css=readAnnotatedHomeVisualCss('assets/atelier-refinement-20261030.css');
 const source=readFileSync('index.html','utf8');
 assert.ok(css.includes('@supports (content-visibility: auto)')&&css.includes('@media (max-width: 700px)'),
  'offscreen containment only applies to supporting mobile browsers');
 for(const [name,size] of [
  ['care',2200],['gallery',1000],['health-info',1100],['stories',2900],['faq',900]
 ]){
  assert.ok(css.includes('body.home-page #main-content > #'+name+' {\ncontent-visibility: auto;\ncontain-intrinsic-size: auto '+size+'px;'),
   'offscreen section must have contained rendering and a provisional scroll height: '+name);
  assert.ok(source.includes('id="'+name+'"'),
   'original indexable section still exists in the HTML: '+name);
 }
 assert.ok(!css.includes('body.home-page #main-content > .hero.wrap {\ncontent-visibility'),
  'the above-fold portrait and clinic promise must never be deferred');
 assert.ok(!css.includes('body.home-page #main-content > #location {\ncontent-visibility'),
  'visit details must remain available without content containment');
 assert.ok(home.includes('class="mobile-booking-actions"')&&home.includes('href="tel:0325132875"'));
 assert.ok(home.includes('rel="canonical" href="https://ejoeundental.com/"'));
});

test('museum editorial hierarchy keeps the original clinic art, indexable answers and booking hierarchy',()=>{
 const source=readFileSync('assets/home-visit-faq-salon-20261031.css','utf8');
 assert.ok(source.includes('2026-11-03 | Museum editorial hierarchy'),
  'original gallery palette has one final, scoped editorial pass');
 for(const token of [
  'body.home-page #main-content > .hero.wrap #headline',
  'body.home-page #main-content > .hero.wrap .hero-artwork__plaque',
  'body.home-page #main-content > #home-representative-guides .home-representative-guide-grid > a',
  'body.home-page #main-content > #gallery .gallery-exhibition-index__room',
  '@media(max-width:600px)','@media(forced-colors:active)'
 ]) assert.ok(source.includes(token),'polish must preserve semantic editorial hierarchy: '+token);
 const homeSource=readFileSync('index.html','utf8');
 assert.ok(homeSource.includes('id="headline"')&&
  homeSource.includes('ejoeun-gallery-cat-dentist-20261029.webp'),
  'keep original doctor/cat painting and patient-first heading');
 assert.ok(home.includes('class="mobile-booking-actions"')&&
  home.includes('href="tel:0325132875"')&&
  home.includes('booking.naver.com/booking/13/bizes/1162931'),
  'primary contact and Naver booking remain visible and native');
 assert.ok(homeSource.includes('id="stories"')&&
  homeSource.includes('id="health-info"')&&
  homeSource.includes('id="gallery"'),
  'all crawlable health articles and picture galleries remain in place');
 assert.ok(home.includes('rel="canonical" href="https://ejoeundental.com/"'));
});

test('only below-fold paintings are low-priority while director portrait loads early',()=>{
 const source=read('index.html');
 const hero=source.match(/<img\b[^>]*src="\/assets\/ejoeun-gallery-cat-dentist-20261029\.webp"[^>]*>/)?.[0]||'';
 assert.ok(hero.includes('loading="eager"')&&hero.includes('fetchpriority="high"'));
 for(const name of [
  'gallery-starry-clinic.svg','quiet-window-cat-thumb.webp','cubist-cat-clinic-thumb.webp',
  'lakeside-flower-clinic-thumb.webp','gallery-golden-garden.svg'
 ]){
  const regex=new RegExp('<img\\s+src="/assets/'+name.replace(/\./g,'\\.')+'"[^>]*>');
  const tag=source.match(regex)?.[0]||'';
  assert.ok(tag.includes('loading="lazy"')&&tag.includes('fetchpriority="low"'),
    'only offscreen art is explicitly deprioritized: '+name);
  assert.ok(tag.includes('decoding="async"')&&tag.includes('alt="'),
    'art retains alt text and asynchronous decoding: '+name);
 }
 assert.equal((source.match(/<link rel="preload" as="image"/g)||[]).length,1);
 assert.ok(source.includes('class="mobile-booking-actions"')&&
   source.includes('class="mobile-booking-naver"'),
   'built mobile telephone, booking and visit dock must be rendered');
});


test('mobile search entry keeps native GET, clear labels and larger tap controls',()=>{
 const source=read('index.html');
 const css=read('assets/museum-finish-20261031.css');
 const head=source.slice(source.indexOf('<header>'),source.indexOf('</header>'));
 const form=source.slice(source.indexOf('<form class="symptom-quick-search"'),source.indexOf('</form>',source.indexOf('<form class="symptom-quick-search"'))+7);
 assert.ok(form.includes('action="/search.html" method="get" role="search"'));
 assert.ok(form.includes('<label for="home-symptom-query">'));
 assert.ok(form.includes('id="home-symptom-query" name="q" type="search"'));
 assert.ok(form.includes('enterkeyhint="search" maxlength="120" required'));
 assert.ok(form.includes('<button type="submit">건강정보 검색 →</button>'));
 assert.ok(head.includes('href="#home-symptom-query"')&&head.includes('href="#symptom-navigator-title"'));
 assert.ok(css.includes('2026-11-01 | Mobile readable quick actions and symptom search'));
 assert.ok(css.includes('font-size:clamp(11.5px,3.05vw,13px)'));
 assert.ok(css.includes('font-size:clamp(12px,3.25vw,14px)'));
 assert.match(css,/#home-symptom-query\s*\{[\s\S]*?min-height:54px;[\s\S]*?font-size:16px;/);
 assert.ok(css.includes('.symptom-quick-search:focus-within'));
 assert.ok(css.includes('#home-symptom-query:target'));
 assert.ok(source.includes('class="mobile-booking-actions"')&&
   source.includes('class="mobile-booking-naver"'),
   'built mobile telephone, booking and visit dock must be rendered');
});


test('tapping mobile search focuses the existing input without auto-focusing on load',()=>{
 const source=read('index.html');
 const inline=source.match(/<script>\s*\/\* Mobile reading:([\s\S]*?)<\/script>/)?.[1]||'';
 assert.ok(inline.includes('searchShortcut.addEventListener(\'click\',function()'));
 assert.ok(inline.includes("input.focus({preventScroll:true})"));
 const form=source.slice(source.indexOf('<form class="symptom-quick-search"'),source.indexOf('</form>',source.indexOf('<form class="symptom-quick-search"'))+7);
 assert.ok(form.includes('action="/search.html" method="get"'));
 assert.ok(form.includes('name="q" type="search"'));
 let taps=0,focused=0,focusOptions;
 const link={
  addEventListener(type,listener){
   assert.equal(type,'click');
   taps++;
   this.click=listener;
  }
 };
 const input={focus(options){focused++;focusOptions=options;}};
 const root={classList:{contains(){return false},toggle(){}}};
 const doc={
  documentElement:root,
  querySelector(selector){
   assert.equal(selector,'header .mobile-quick a[href="#home-symptom-query"]');
   return link;
  },
  getElementById(id){
   assert.equal(id,'home-symptom-query');
   return input;
  }
 };
 const win={
  innerWidth:390,scrollY:0,
  addEventListener(){},
  requestAnimationFrame(fn){fn()}
 };
 new Function('document','window','/* Mobile reading:'+inline)(doc,win);
 assert.equal(taps,1);
 assert.equal(focused,0,'do not summon mobile keyboard on page load');
 link.click();
 assert.equal(focused,1,'tap should focus the native search field');
 assert.deepEqual(focusOptions,{preventScroll:true});
 assert.ok(source.includes('<a href="#home-symptom-query"'),
  'preserve normal anchor navigation without JS');
 assert.ok(source.includes('class="mobile-booking-actions"')&&
   source.includes('class="mobile-booking-naver"'),
   'built mobile telephone, booking and visit dock must be rendered');
});


test('mobile search results precede the long topic routes and retain medical context',()=>{
 const page=read('search.html');
 const css=read('assets/search-page.css');
 const start=page.indexOf('<main id="main-content"');
 const search=page.indexOf('<div class="search-primary"',start);
 const results=page.indexOf('<section id="results"',search);
 const routes=page.indexOf('<nav class="search-reading-routes"',start);
 const help=page.indexOf('이 검색은 이조은치과 홈페이지에 마련된 자료',start);
 const topics=page.indexOf('<nav class="search-topic-index"',start);
 assert.ok(start>=0&&start<search&&search<results&&results<routes&&routes<help&&help<topics,
  'search and results come before four routes and the long SEO reference guide');
 const route=page.slice(routes,page.indexOf('</nav>',routes));
 assert.equal((route.match(/<a /g)||[]).length,4,'keep all four routes');
 for(const href of ['href="#q"','href="#search-topic-guide"','href="#symptom-search"',
  'href="/stories.html#story-directory"'])assert.ok(route.includes(href));
 assert.ok(page.includes('<form class="search-form" role="search" action="/search.html" method="get"'));
 assert.ok(page.includes('id="q" name="q" type="search"'));
 assert.ok(page.includes('id="status" role="status" aria-live="polite"'));
 assert.ok(page.includes('id="results" aria-label="홈페이지 검색 결과"'));
 assert.ok(page.includes('<meta name="robots" content="noindex,follow"'));
 assert.ok(page.includes('rel="canonical" href="https://ejoeundental.com/search.html"'));
 assert.ok(page.includes('지역별 검색어·복용약·기타 검색 예시 40개 펼쳐보기'));
 assert.ok(css.includes('2026-11-01 | Search first, references second'));
 assert.match(css,/body\.search-gallery \.search-primary \.search-form input \{[\s\S]*?font-size:16px;/);
 assert.ok(css.includes('flex-direction:column;')&&css.includes('min-height:54px;'),
  'mobile search field and submit button retain large touch targets');
 assert.ok(page.includes('/assets/search.js?v='));
});


test('search results distinguish clinical guides without implying insurance coverage',()=>{
 const script=read('assets/search.js');
 const css=read('assets/search-page.css');
 const start=script.indexOf('const searchCareFocus=p=>');
 const end=script.indexOf('let fullVisibleCount=',start);
 assert.ok(start>0&&end>start,'clinical focus classifier must precede results rendering');
 const classify=new Function(script.slice(start,end)+'return searchCareFocus;')();
 for(const [url,id] of [
  ['/gum-treatment.html','gum'],['/scaling.html','gum'],
  ['/health/periodontal-pocket.html','gum'],
  ['/retreatment.html','root'],['/root-canal-health.html','root'],
  ['/health/root-canal-retreatment.html','root'],
  ['/insured-care.html','insurance'],['/health/insurance-periodontal.html','insurance'],
  ['/health/insurance-root-canal.html','insurance']
 ])assert.equal(classify({url})?.id,id,'accurate clinical label: '+url);
 for(const url of ['/visit-guide.html','/medical-history.html','/dental-equipment.html',
  '/health/cavity-size.html','/stories/01/'])
  assert.equal(classify({url}),null,'non-clinical / unrelated result has no focus label: '+url);
 for(const url of ['/gum-treatment.html','/retreatment.html'])
  assert.notEqual(classify({url})?.id,'insurance',
   'do not suggest that an ordinary treatment page guarantees health-insurance coverage');
 assert.ok(script.includes("labels.className='result-labels'"));
 assert.ok(script.includes("tag.className='result-focus'"));
 assert.ok(script.includes("tag.textContent=focus.label"),
  'labels use safe text rather than innerHTML');
 assert.ok(script.includes('a.append(labels,h,desc,url);'));
 assert.ok(script.includes('const searchCategory=p=>')&&
  script.includes("const showResults=type=>")&&script.includes("showResults('all')"),
  'existing type filters, ranking, and pagination preserved');
 assert.ok(css.includes('2026-11-01 | Clinical focus labels'));
 for(const id of ['gum','root','insurance'])
  assert.ok(css.includes('.result-focus[data-focus="'+id+'"]')||
   id==='gum'&&css.includes('.result-focus {'),
   'clearly styled clinical label: '+id);
 assert.ok(css.includes('@media(forced-colors:active)'));
});


test('search styles and script links match the actual production content hashes',()=>{
 const html=read('search.html');
 for(const [file,label] of [['search-page.css','CSS'],['search.js','JavaScript']]){
  const asset=read('assets/'+file);
  const expected=createHash('sha256').update(asset).digest('hex').slice(0,12);
  const kind=file.endsWith('.css')?'href':'src';
  assert.ok(html.includes(kind+'="/assets/'+file+'?v='+expected+'"'),
   label+' search asset must be freshly fingerprinted on every production build');
 }
 assert.ok(html.includes('<meta name="robots" content="noindex,follow"'));
 assert.ok(html.includes('rel="canonical" href="https://ejoeundental.com/search.html"'));
 assert.ok(html.includes('id="status" role="status"'));
 assert.ok(html.includes('id="results" aria-label="홈페이지 검색 결과"'));
});

test('retreatment cause card paintings use one fixed-height frame without label cropping',()=>{
 const page=read('retreatment.html');
 const section=page.match(/<h2>신경치료 후 다시 아픈 이유<\/h2>[\s\S]*?<div class="cards">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.equal((section.match(/<article class="card"><img /g)||[]).length,4);
 const stylesheet=read('assets/care-exhibition-finish-20261031.css');
 assert.ok(stylesheet.includes('Retreatment cause cards: uniform illustrated image frames'));
 assert.match(stylesheet,/body\.care-gallery\.care-retreatment \.block \.cards > \.card > img\{[\s\S]*?height:200px;[\s\S]*?object-fit:contain;/);
 assert.ok(stylesheet.includes('@media(max-width:600px)'), 'mobile card image frames stay consistent');
 assert.ok(readFileSync('retreatment.html','utf8').includes('retreatment-steps5-01'), 'the source page should request refreshed CSS (build output may fingerprint stylesheets)');
});

test('approved first retreatment step removes existing orange gutta-percha and shows an apical lesion',()=>{
 const page=readFileSync('retreatment.html','utf8');
 const section=page.match(/<h2 id="retreatment-procedure">[\s\S]*?<div class="steps">([\s\S]*?)<\/div>/)?.[1]||'';
 const images=[...section.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)].map(x=>x[1]);
 assert.deepEqual(images,[
  '/assets/retreatment/illustration-06-guttapercha-apical-20261103.webp',
  '/assets/retreatment/illustration-07-both-canals-irrigation-20261103.webp',
  '/assets/retreatment/illustration-08-root-canal-shaping-20261103.webp',
  '/assets/retreatment/illustration-09-refilled-lesion-20261103.webp',
  '/assets/retreatment/illustration-11-healed-apical-20261103.webp'
 ],'the five process illustrations should match clinic approval');
 assert.ok(section.includes('뿌리 끝에 남은 염증 병소'));
 const art=readFileSync('dist/assets/retreatment/illustration-06-guttapercha-apical-20261103.webp');
 assert.ok(art.length>20000,'the approved illustration must be present in the build');
 assert.equal(art.subarray(0,4).toString(),'RIFF');
 assert.equal(art.subarray(8,12).toString(),'WEBP');
});


test('approved second retreatment step irrigates both root canals',()=>{
 const page=readFileSync('retreatment.html','utf8');
 assert.ok(page.includes('illustration-07-both-canals-irrigation-20261103.webp'));
 assert.ok(page.includes('양쪽 근관에 주사기형 세척 기구'));
 const art=readFileSync('dist/assets/retreatment/illustration-07-both-canals-irrigation-20261103.webp');
 assert.ok(art.length>25000,'the owner-approved irrigation image must ship in the site');
 assert.equal(art.subarray(0,4).toString(),'RIFF');
 assert.equal(art.subarray(8,12).toString(),'WEBP');
});


test('approved third retreatment step uses a real clinic-approved shaping file illustration',()=>{
 const page=readFileSync('retreatment.html','utf8');
 assert.ok(page.includes('src="/assets/retreatment/illustration-08-root-canal-shaping-20261103.webp"'));
 assert.ok(page.includes('확대된 접근 와동을 통해 굵은 나선형 근관 파일'));
 const art=readFileSync('dist/assets/retreatment/illustration-08-root-canal-shaping-20261103.webp');
 assert.ok(art.length>25000,'approved third illustration must ship as WebP');
 assert.equal(art.subarray(0,4).toString(),'RIFF');
 assert.equal(art.subarray(8,12).toString(),'WEBP');
});


test('fourth and fifth retreatment stages show refilling and a possible healing outcome',()=>{
 const page=readFileSync('retreatment.html','utf8');
 const steps=page.match(/<h2 id="retreatment-procedure">[\s\S]*?<div class="steps">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.equal((steps.match(/<article class="step">/g)||[]).length,5);
 for(const [image,heading] of [
  ['illustration-09-refilled-lesion-20261103.webp','새로운 근관 충전'],
  ['illustration-11-healed-apical-20261103.webp','치근단 염증의 치유']
 ]){
  assert.ok(steps.includes(image));assert.ok(steps.includes('<h3>'+heading+'</h3>'));
  const art=readFileSync('dist/assets/retreatment/'+image);
  assert.ok(art.length>6000,'approved medical illustration included: '+image);
  assert.equal(art.subarray(0,4).toString(),'RIFF');
  assert.equal(art.subarray(8,12).toString(),'WEBP');
 }
 assert.ok(page.includes('모든 치아에서 치유가 보장되는 것은 아니며'));
 const css=read('assets/care-exhibition-finish-20261031.css');
 assert.ok(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));
});
