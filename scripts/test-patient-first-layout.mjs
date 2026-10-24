import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

test('all 50 patient education pages show their topic before optional controls',()=>{
 const hubPages=['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'];
 const guides=readdirSync('dist/health').filter(name=>name.endsWith('.html'));
 assert.equal(guides.length,46);
 for(const name of [...hubPages,...guides.map(name=>'health/'+name)]){
  const html=readFileSync('dist/'+name,'utf8');
  const main=html.match(/<main\b[^>]*class=["']article["'][^>]*>/)?.[0];
  assert.ok(main,name+' must have an article main');
  const m=html.indexOf(main),h1=html.indexOf('<h1',m);
  const headingEnd=html.indexOf('</h1>',h1);
  const intro=html.slice(headingEnd+5).match(/^\s*<p(?:\s[^>]*)?>[\s\S]*?<\/p>/);
  const reading=html.indexOf('class="reading-controls"',m);
  const share=html.indexOf('class="article-share-actions"',m);
  assert.ok(h1>m&&headingEnd>h1,name+' must show the real H1');
  assert.ok(intro&&intro[0].length<1800,name+' must provide an immediate patient summary');
  const introEnd=headingEnd+5+intro[0].length;
  assert.ok(introEnd<reading,name+' reading controls must not hide the title or summary');
  assert.ok(reading<share,name+' text size precedes sharing controls');
  assert.ok(share<html.indexOf('</main>',m),name+' controls must stay within the article');
  assert.ok(share-introEnd<1000,name+' tools should follow soon after clinical introduction');
  assert.equal((html.match(/class="reading-controls"/g)||[]).length,1,name+' duplicate font control');
  assert.equal((html.match(/class="article-share-actions"/g)||[]).length,1,name+' duplicate share control');
  const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.ok(canonical?.startsWith('https://ejoeundental.com/'),name+' canonical must be preserved');
 }
});

test('default patient reading and sharing tools work only after JavaScript is available',()=>{
 const readCss=readFileSync('dist/assets/reading-controls.css','utf8');
 const shareCss=readFileSync('dist/assets/article-sharing.css','utf8');
 assert.match(readCss,/\.reading-controls\{display:none/);
 assert.match(shareCss,/\.article-share-actions\[hidden\],\.article-share-actions button\[hidden\]\{display:none!important\}/);
 assert.match(readCss,/@media print\{/);
 assert.match(shareCss,/@media print\{/);
});


test('mobile homepage has a lightweight schema head while keeping all original clinic stories discoverable',()=>{
 const html=readFileSync('dist/index.html','utf8');
 const head=html.slice(0,html.indexOf('</head>'));
 const itemList=[...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
   .map(m=>JSON.parse(m[1]))
   .find(data=>data['@id']==='https://ejoeundental.com/#owner-articles');
 assert.ok(itemList,'clinic stories JSON-LD must remain valid and discoverable');
 assert.equal(itemList.numberOfItems,333,'overall article count must not be lost');
 assert.equal(itemList.itemListElement.length,8,'only latest 8 stories should load in the head');
 const storyBlock=html.match(/<section class="section light" id="stories">([\s\S]*?)<\/section>/)?.[1]||'';
 const urls=[...storyBlock.matchAll(/href="(https:\/\/blog\.naver\.com\/[a-zA-Z0-9_-]+\/[0-9]+)"/g)].map(m=>m[1]);
 assert.equal(urls.length,333,'all story links must remain in the visible page/archive section');
 assert.equal(new Set(urls).size,333,'story links should not be duplicated');
 assert.deepEqual(itemList.itemListElement.map(item=>item.url),urls.slice(0,8));
 assert.ok(head.length<22000,'mobile browser should not parse a 40KB+ homepage head');
});

test('clinic stories have direct prominent desktop and mobile navigation',()=>{
 const html=readFileSync('dist/index.html','utf8');
 const header=html.match(/<header><nav class="nav"[^>]*>([\s\S]*?)<\/nav><\/header>/)?.[1]||'';
 assert.ok(header.includes('href="/stories.html" class="stories-mobile-link"'),'mobile shortcut must open stories directly');
 assert.ok(header.includes('href="/stories.html" class="stories-nav-link"'),'desktop primary navigation must open stories directly');
 assert.ok(header.includes('📖 치과<br>이야기'),'full mobile label must be legible on narrow screens');
 assert.match(html,/<p class="hero-stories-shortcut"><a href="\/stories.html"/,'hero provides another readily visible story entrance');
 assert.match(html,/<style id="stories-menu-visibility">/,'highlight must not depend on old cached CSS');
 assert.match(html,/<section class="section light" id="stories">/,'menu target must exist');
 assert.match(html,/<summary>치과 이야기 나머지 325편 보기/,'all other owner stories remain accessible');
});

test('every published original clinic homepage article is reachable after expanding its section',()=>{
 const html=readFileSync('dist/index.html','utf8');
 const posts=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 assert.ok(posts.length>6,'full published clinic article collection must include older posts');
 const details=html.match(/<details class="clinic-native-stories" id="home-published-stories"[\s\S]*?<\/details>/)?.[0]||'';
 assert.ok(details, 'a native collapsible full clinic-story list must exist');
 const actual=[...details.matchAll(/href="(\/stories\/[^"]+\/?)"/g)].map(m=>m[1]);
 const expected=posts.map(post=>'/stories/'+encodeURIComponent(post.slug)+'/');
 assert.deepEqual(actual,expected,'every published article is linked in reverse date order');
 assert.ok(details.includes('원장의 홈페이지 글 '+posts.length+'편 모두 보기'),'article total must be visible on the summary');
 assert.ok(html.indexOf('id="home-published-stories"')<html.indexOf('id="owner-blog-group"'),'full homepage articles must come before external Naver links');
 assert.ok(html.includes('📖 원장 네이버 블로그 원문 <strong>333편</strong>'),'original Naver collection must remain separately discoverable');
});

test('standalone clinic story directory shows every actual published post without requiring scripts',()=>{
 const html=readFileSync('dist/stories.html','utf8');
 const posts=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 const links=[...html.matchAll(/<a class="story-card" href="(\/stories\/[^"]+\/)"[>]/g)].map(m=>m[1]);
 const expected=posts.map(post=>'/stories/'+encodeURIComponent(post.slug)+'/');
 assert.equal(html.includes('BUILD_STORY_'),false,'directory placeholders must be filled during static build');
 assert.ok(html.includes('id="published-total">'+posts.length+'</span>'),'count must be derived from published posts');
 assert.deepEqual(new Set(links),new Set(expected),'every unique published story has a directory card');
 assert.equal(links.length,posts.length,'no duplicate or missing story cards');
 const schema=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1])).find(item=>item['@type']==='CollectionPage');
 assert.equal(schema?.mainEntity?.numberOfItems,posts.length);
 assert.equal(schema?.mainEntity?.itemListElement?.length,posts.length);
 assert.match(html,/<link rel="canonical" href="https:\/\/ejoeundental.com\/stories.html">/);
 assert.match(html,/href="\/clinical-archive.html#archive-blog-posts"/,'Naver originals stay separately accessible');
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 assert.ok(sitemap.includes('<loc>https://ejoeundental.com/stories.html</loc>'));
});

test('all 54 public patient information pages link to both distinct article collections',()=>{
 const hubs=['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'];
 const care=['gum-treatment.html','retreatment.html','cervical-abrasion.html','insured-care.html'];
 const health=readdirSync('dist/health').filter(name=>name.endsWith('.html')).map(name=>'health/'+name);
 const pages=[...hubs,...care,...health];
 assert.equal(pages.length,54);
 for(const file of pages){
  const html=readFileSync('dist/'+file,'utf8');
  const matches=[...html.matchAll(/<nav class="patient-story-links" aria-label="이조은치과 치과 이야기 더 읽기">([\s\S]*?)<\/nav>/g)];
  assert.equal(matches.length,1,file+' needs exactly one bottom patient story navigation');
  assert.match(matches[0][0],/href="\/stories.html"/);
  assert.match(matches[0][0],/href="\/clinical-archive.html#archive-blog-posts"/);
  assert.ok(html.indexOf(matches[0][0])<html.lastIndexOf('</main>'),file+' story links must be inside main');
  assert.match(html,/href="\/assets\/patient-story-links\.css\?v=[a-f0-9]{12}"/,
    file+' must load branded, fingerprinted patient story link styles');
 }
});

test('mobile sticky header keeps the entire story directory reachable after scrolling',()=>{
 const home=readFileSync('dist/index.html','utf8');
 const css=readFileSync('dist/assets/home-enhancements.css','utf8');
 assert.match(home,/<div class="mobile-quick">[\s\S]*?<a href="\/stories.html" class="stories-mobile-link"/);
 assert.match(css,/html\.home-scrolled body\.home-page header \.nav \.mobile-quick a\.stories-mobile-link\{/);
 assert.match(css,/html\.home-scrolled body\.home-page header \.nav \.mobile-quick\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/html\.home-scrolled body\.home-page header \.nav\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) minmax\(0,54%\)/);
});

test('every public clinic journal article offers only genuine, unique related article links',()=>{
 const posts=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 const known=new Set(posts.map(post=>post.slug));
 assert.equal(known.size,posts.length);
 assert.ok(posts.length>=30);
 for(const post of posts){
  const html=readFileSync('dist/stories/'+post.slug+'/index.html','utf8');
  const blocks=[...html.matchAll(/<aside class="story-related" aria-labelledby="related-story-title">([\s\S]*?)<\/aside>/g)];
  assert.equal(blocks.length,1,post.slug+' needs exactly one related article section');
  const hrefs=[...blocks[0][1].matchAll(/href="(\/stories\/([^"]+)\/)"/g)]
    .map(m=>({href:m[1],slug:decodeURIComponent(m[2])}));
  assert.ok(hrefs.length>=1&&hrefs.length<=3,post.slug+' should link to one to three articles');
  assert.equal(new Set(hrefs.map(item=>item.slug)).size,hrefs.length,post.slug+' has duplicate related posts');
  for(const item of hrefs){
   assert.ok(known.has(item.slug),post.slug+' links to unpublished '+item.href);
   assert.notEqual(item.slug,post.slug,post.slug+' links to itself');
  }
  assert.match(html,/href="\/assets\/story-related\.css\?v=[a-f0-9]{12}"/,
    post.slug+' should use fingerprinted, accessible related-story styling');
  assert.match(html,/href="\/stories.html"/,'all articles must retain the complete story directory link');
 }
});

test('three expanded patient guides publish distinct full explanations and accurate revision metadata',()=>{
 const guides=[
  {slug:'01',term:'비와동성 병소',secondary:'관찰'},
  {slug:'02',term:'치주낭',secondary:'큐렛'},
  {slug:'03',term:'치수조직',secondary:'재신경치료'}
 ];
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 const searchable=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 for(const guide of guides){
  const source=JSON.parse(readFileSync('content/posts/'+guide.slug+'.json','utf8'));
  const html=readFileSync('dist/stories/'+guide.slug+'/index.html','utf8');
  assert.ok(source.body.length>=1200,guide.slug+' original short stub must stay substantive');
  assert.ok(source.body.includes(guide.term),guide.slug+' missing topic explanation');
  assert.ok(source.body.includes(guide.secondary),guide.slug+' missing practical context');
  assert.equal(source.updated,'2026-10-25');
  assert.ok(html.includes('내용 수정 <time datetime="2026-10-25">2026-10-25</time>'),
    guide.slug+' update must be visible to patients');
  assert.ok(html.includes('datetime="'+source.date+'"'),guide.slug+' original date must remain visible');
  const schema=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
   .map(m=>JSON.parse(m[1])).find(o=>o['@type']==='BlogPosting');
  assert.equal(schema?.datePublished,source.date);
  assert.equal(schema?.dateModified,source.updated);
  assert.ok(html.includes(source.summary.slice(0,40)));
  assert.ok(sitemap.includes('/stories/'+guide.slug+'/</loc><lastmod>2026-10-25</lastmod>'),
    guide.slug+' updated date must appear on generated sitemap');
  assert.ok(searchable.some(row=>row.url==='/stories/'+guide.slug+'/'&&row.body.includes(guide.term)),
    guide.slug+' expanded patient content must be searchable');
 }
});

test('homepage links directly to three expanded patient education guides without duplicated bulk cards',()=>{
 const home=readFileSync('dist/index.html','utf8');
 const section=home.match(/<section class="section light" id="stories">([\s\S]*?)<\/section>/)?.[1]||'';
 const nav=section.match(/<nav class="story-featured-questions"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 assert.ok(nav,'homepage should surface a compact set of actual patient questions');
 for(const slug of ['01','02','03']){
  assert.equal((nav.match(new RegExp('href="/stories/'+slug+'/"','g'))||[]).length,1,
   'expanded patient explainer '+slug+' must appear exactly once');
 }
 assert.equal((nav.match(/<a /g)||[]).length,3,'patient question group should stay small');
 const css=readFileSync('dist/assets/home-enhancements.css','utf8');
 assert.match(css,/#stories \.story-featured-questions a:focus-visible/,
  'links must remain keyboard-visible');
 assert.match(css,/@media\(max-width:600px\)\{[\s\S]*?#stories \.story-featured-questions a/,
  'question links must fit mobile screens');
});

test('all clinic-owned patient stories render accessible headings and paragraphs without changing medical copy',()=>{
 const posts=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 assert.ok(posts.length>=39);
 let totalSubheadings=0;
 let cardsWithSubheadings=0;
 const decodeHtml=html=>html.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
  .replace(/&#39;/g,"'").replace(/&amp;/g,'&');
 const compact=text=>text.replace(/[\s■•●]/gu,'');
 for(const post of posts){
  const file='dist/stories/'+post.slug+'/index.html';
  const html=readFileSync(file,'utf8');
  const source=JSON.parse(readFileSync('content/posts/'+post.slug+'.json','utf8'));
  const match=html.match(/<section class="story-prose" aria-label="치과 이야기 본문">([\s\S]*?)<\/section>/);
  assert.ok(match,post.slug+' must show semantic story content');
  const fragment=match[1];
  assert.ok(fragment.includes('<p>')||fragment.includes('<h2>'),post.slug+' needs substantive readable text');
  assert.equal(fragment.includes('style="white-space:pre-wrap"'),false,'avoid a single unsplit text block');
  assert.match(html,/href="\/assets\/story-article\.css\?v=[a-f0-9]{12}"/);
  const plain=decodeHtml(fragment.replace(/<[^>]*>/g,' '));
  assert.equal(compact(plain),compact(source.body),post.slug+' lost or changed clinical content');
  assert.ok(!fragment.includes('<script'),post.slug+' must never interpret CMS body as HTML');
  const h2=(fragment.match(/<h2 id="story-section-\d+">/g)||[]).length;
  totalSubheadings+=h2;
  if(h2)cardsWithSubheadings++;
 }
 assert.ok(totalSubheadings>70,'long patient guidance should have meaningful section structure');
 assert.ok(cardsWithSubheadings>24,'most written articles should have visible subsections');
});

test('long dental stories expose a collapsible anchor-linked table of contents',()=>{
 const posts=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 let outlined=0;
 for(const post of posts){
  const html=readFileSync('dist/stories/'+post.slug+'/index.html','utf8');
  const sections=[...html.matchAll(/<h2 id="(story-section-\d+)">([\s\S]*?)<\/h2>/g)];
  assert.equal(new Set(sections.map(s=>s[1])).size,sections.length,
   post.slug+' heading targets must be unique');
  const outlines=[...html.matchAll(/<details class="story-toc">([\s\S]*?)<\/details>/g)];
  const shouldShow=sections.length>=3;
  assert.equal(outlines.length,shouldShow?1:0,post.slug+' needs appropriate outline');
  if(shouldShow){
   outlined++;
   const links=[...outlines[0][1].matchAll(/<a href="#(story-section-\d+)">([\s\S]*?)<\/a>/g)];
   assert.deepEqual(links.map(m=>[m[1],m[2]]),sections.map(m=>[m[1],m[2]]),
    post.slug+' outline must link to each actual heading in order');
   assert.ok(html.indexOf(outlines[0][0])<html.indexOf('<section class="story-prose"'),
    post.slug+' table of contents must appear before the article body');
  }
 }
 assert.ok(outlined>20,'most long-form dental stories should have a practical article outline');
});

test('three distinct owner-blog topics become full, independently written patient education articles',()=>{
 const targets=[
  ['2026-10-25-incheon-gum-treatment-after-scaling-sensitivity','https://blog.naver.com/kook765/224306244253','치근'],
  ['2026-10-25-incheon-loose-tooth-suddenly-periodontal-exam','https://blog.naver.com/kook765/224304247968','동요도'],
  ['2026-10-25-bupyeong-root-canal-after-treatment-pain','https://blog.naver.com/radio654/224311783903','임시충전']
 ];
 const posts=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 const storyDirectory=readFileSync('dist/stories.html','utf8');
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 for(const [slug,original,clinicalTerm] of targets){
  const item=posts.find(p=>p.slug===slug);
  assert.ok(item,slug+' must be publicly listed');
  const authorCopy=JSON.parse(readFileSync('content/posts/'+slug+'.json','utf8'));
  assert.equal(authorCopy.source_note,'topic_only',slug+' must not claim original text was scraped');
  assert.equal(authorCopy.source_url,original,slug+' original blog reference must not change');
  assert.ok(authorCopy.body.length>1800,'avoid a thin SEO-only page: '+slug);
  assert.ok(authorCopy.body.includes(clinicalTerm),'missing useful clinical detail: '+slug);
  assert.ok(storyDirectory.includes('href="/stories/'+slug+'/">'),slug+' must be linked from index');
  assert.ok(sitemap.includes('/stories/'+slug+'/</loc>'),slug+' must be crawlable');
  const html=readFileSync('dist/stories/'+slug+'/index.html','utf8');
  assert.ok(html.includes('원문의 문장을 복제')||html.includes('원문을 직접 복제하거나 요약한 글은 아닙니다'),
    slug+' blog source disclosure must not misrepresent independent writing');
  assert.ok(html.includes('href="'+original+'"'),slug+' must link to real owner original');
  assert.match(html,/<section class="story-prose" aria-label="치과 이야기 본문">/);
  assert.ok((html.match(/<h2 id="story-section-\d+">/g)||[]).length>=4,
    slug+' should contain readable medical subtopics');
 }
 assert.equal(new Set(targets.map(x=>x[0])).size,targets.length,'all three topics must be distinct');
});

test('wisdom extraction and implant bone-graft guides are searchable and accurately attributed',()=>{
 const cases=[
  {
   slug:'2026-10-25-bupyeong-wisdom-tooth-extraction-hemostatic-dressing',
   source:'https://blog.naver.com/kook765/224333455599',
   terms:['혈병','지혈재','항응고제','비용'],
   group:'topic-wisdom'
  },
  {
   slug:'2026-10-25-sangok-implant-bone-graft-always-necessary',
   source:'https://blog.naver.com/tele654/223968185898',
   terms:['잔존골','상악동','CBCT','발치'],
   group:'topic-prosthetic'
  }
 ];
 const index=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 const search=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 const directory=readFileSync('dist/stories.html','utf8');
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 for(const item of cases){
  const post=JSON.parse(readFileSync('content/posts/'+item.slug+'.json','utf8'));
  const html=readFileSync('dist/stories/'+item.slug+'/index.html','utf8');
  assert.equal(post.source_url,item.source,'owner original link must match supplied topic');
  assert.equal(post.source_note,'topic_only','must never claim the full Naver article was read');
  assert.ok(post.published===true&&index.some(p=>p.slug===item.slug));
  assert.ok(post.body.length>=2000,'patient article should be substantive');
  for(const term of item.terms) assert.ok(post.body.includes(term),'missing clinical context: '+term);
  assert.ok(html.includes('원문을 직접 복제하거나 요약한 글은 아닙니다'),
   'attribution must disclose independently authored text');
  assert.ok(html.includes('href="'+item.source+'"'),'published article must link to its owner original');
  assert.ok(html.includes('href="/stories.html"'),'return to all clinic articles');
  assert.ok(directory.includes('href="/stories/'+item.slug+'/">'),'article must be in topic index');
  const start=directory.indexOf('id="'+item.group+'"');
  assert.ok(start>=0,'expected topic section missing: '+item.group);
  const end=directory.indexOf('</section>',start);
  assert.ok(directory.slice(start,end).includes('href="/stories/'+item.slug+'/">'),
   'article belongs to a relevant topic not uncategorized items');
  assert.ok(sitemap.includes('/stories/'+item.slug+'/</loc>'),'search engines can discover article');
  assert.ok(search.some(x=>x.url==='/stories/'+item.slug+'/'&&x.body.includes(item.terms[0])),
   'site search must index the complete clinical article');
  assert.ok((html.match(/<h2 id="story-section-\d+">/g)||[]).length>=6,
   'substantive clinical article must have meaningful sections');
 }
});

test('two distinct clinical guides cover retreatment with posts and asymptomatic root-tip lesions',()=>{
 const cases=[
  {slug:'2026-10-25-bupyeong-retreatment-crown-post-can-tooth-be-saved',
   original:'https://blog.naver.com/kook765/224320994972',
   terms:['포스트','크라운','천공','치근단 수술','수복']},
  {slug:'2026-10-25-incheon-retreatment-root-tip-dark-spot-no-pain',
   original:'https://blog.naver.com/kook765/224322081993',
   terms:['방사선투과상','경과 관찰','이전 영상','치근단','재신경치료']}
 ];
 const directory=readFileSync('dist/stories.html','utf8');
 const listing=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 const search=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 for(const item of cases){
  const post=JSON.parse(readFileSync('content/posts/'+item.slug+'.json','utf8'));
  assert.equal(post.published,true);
  assert.equal(post.source_url,item.original);
  assert.equal(post.source_note,'topic_only','should never claim original Naver article was scraped');
  assert.equal(post.date,'2026-10-25');
  assert.ok(post.body.length>2400,'patient education must be substantive: '+item.slug);
  for(const term of item.terms){
   assert.ok(post.body.includes(term),item.slug+' missing clinical concept '+term);
  }
  assert.ok(listing.some(p=>p.slug===item.slug),'published story must appear in post index');
  const html=readFileSync('dist/stories/'+item.slug+'/index.html','utf8');
  assert.match(html,/<section class="story-prose" aria-label="치과 이야기 본문">/);
  assert.match(html,/<details class="story-toc">/);
  assert.ok((html.match(/<h2 id="story-section-\d+">/g)||[]).length>=6);
  assert.ok(html.includes('href="'+item.original+'"'),'verify source link');
  assert.ok(html.includes('원문을 직접 복제하거나 요약한 글은 아닙니다'),
   'must explain that the article was authored separately');
  assert.ok(directory.includes('href="/stories/'+item.slug+'/">'),
   'patients need to find the article in the complete topic directory');
  assert.ok(sitemap.includes('/stories/'+item.slug+'/</loc>'),
   'published journal article must be in sitemap');
  assert.ok(search.some(x=>x.url==='/stories/'+item.slug+'/'&&
     x.body.includes(item.terms[0])),'site search must index the clinical body');
 }
});

test('the retreatment service page links to detailed post and radiographic-lesion patient guides',()=>{
 const html=readFileSync('dist/retreatment.html','utf8');
 const start=html.indexOf('id="retreatment-detailed-questions"');
 assert.ok(start>0,'retreatment service page must surface its patient questions');
 const segment=html.slice(start,html.indexOf('</section>',start));
 const targets=[
  '/stories/2026-10-25-bupyeong-retreatment-crown-post-can-tooth-be-saved/',
  '/stories/2026-10-25-incheon-retreatment-root-tip-dark-spot-no-pain/'
 ];
 for(const target of targets){
  assert.ok(segment.includes('href="'+target+'"'),'missing relevant link '+target);
  assert.ok(readFileSync('dist'+target+'index.html','utf8').includes('원문 보기'),
   'related article must have a real patient-facing destination');
 }
 assert.ok(segment.includes('href="/stories.html"'),'complete story index remains available');
});

test('all published clinic stories link to their true previous and next chronological neighbors',()=>{
 const published=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 // The public index is newest-first; the article previous/next controls are
 // based on the original chronological build order (date then filename).
 const posts=[...published].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||
  a.slug.localeCompare(b.slug));
 assert.ok(posts.length>45,'this check must cover the complete public story collection');
 for(let i=0;i<posts.length;i++){
  const item=posts[i],before=posts[i-1],after=posts[i+1];
  const html=readFileSync('dist/stories/'+item.slug+'/index.html','utf8');
  const nav=html.match(/<nav class="notice" aria-label="치과 이야기 탐색">([\s\S]*?)<\/nav>/)?.[1]||'';
  assert.ok(nav, item.slug+' must have story navigation');
  const former=[...nav.matchAll(/이전 치과 이야기:[\s\S]*?<a href="(\/stories\/[^"]+\/)"[^>]*>/g)].map(x=>x[1]);
  const later=[...nav.matchAll(/다음 치과 이야기:[\s\S]*?<a href="(\/stories\/[^"]+\/)"[^>]*>/g)].map(x=>x[1]);
  assert.deepEqual(former,before?['/stories/'+encodeURIComponent(before.slug)+'/']:[],
   item.slug+' has the wrong previous story');
  assert.deepEqual(later,after?['/stories/'+encodeURIComponent(after.slug)+'/']:[],
   item.slug+' has the wrong next story');
  assert.ok(!former.includes('/stories/'+item.slug+'/')&&!later.includes('/stories/'+item.slug+'/'),
   item.slug+' must never link to itself as a neighbor');
  assert.ok(nav.includes('href="/stories.html"'),item.slug+' must still link to full archive');
 }
});

test('new treatment-maintenance and temporary-filling guides offer specific, safely linked patient advice',()=>{
 const expected=[
  {slug:'2026-10-25-incheon-periodontal-maintenance-after-treatment',
   source:'https://blog.naver.com/tele654/224067305630',
   terms:['치주낭','유지관리','치간칫솔','급여 기준'],
   service:'gum-treatment.html'},
  {slug:'2026-10-25-bupyeong-root-canal-temporary-filling-fell-out',
   source:'',
   terms:['임시충전','신경치료','침과 세균','최종 수복'],
   service:'retreatment.html'}
 ];
 const directory=readFileSync('dist/stories.html','utf8');
 const index=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 const search=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 for(const item of expected){
  const path='content/posts/'+item.slug+'.json';
  const post=JSON.parse(readFileSync(path,'utf8'));
  assert.equal(post.published,true);
  assert.equal(post.source_url,item.source);
  assert.ok(post.body.length>2200,'avoid a thin promotional article: '+item.slug);
  for(const term of item.terms)assert.ok(post.body.includes(term),item.slug+' misses '+term);
  assert.ok(index.some(p=>p.slug===item.slug),item.slug+' missing from public index');
  assert.ok(directory.includes('href="/stories/'+item.slug+'/">'),item.slug+' missing from entire story directory');
  assert.ok(sitemap.includes('/stories/'+item.slug+'/</loc>'),item.slug+' missing from sitemap');
  assert.ok(search.some(p=>p.url==='/stories/'+item.slug+'/'&&p.body.includes(item.terms[0])),
   item.slug+' should be found by genuine clinical terms');
  const html=readFileSync('dist/stories/'+item.slug+'/index.html','utf8');
  assert.match(html,/<section class="story-prose" aria-label="치과 이야기 본문">/);
  assert.match(html,/<details class="story-toc">/);
  assert.ok((html.match(/<h2 id="story-section-\d+">/g)||[]).length>=7,
   item.slug+' needs scannable patient explanations');
  const service=readFileSync('dist/'+item.service,'utf8');
  assert.ok(service.includes('href="/stories/'+item.slug+'/">'),item.service+' should link to '+item.slug);
  if(item.source){
   assert.equal(post.source_note,'topic_only');
   assert.ok(html.includes('href="'+item.source+'"'),item.slug+' should link to actual owner blog topic');
  }
 }
});

test('all 54 care guides link to two topic-matched published, nonduplicated patient stories',()=>{
 const hubs=['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'];
 const services=['gum-treatment.html','retreatment.html','cervical-abrasion.html','insured-care.html'];
 const health=readdirSync('dist/health').filter(x=>x.endsWith('.html')).map(x=>'health/'+x);
 const pages=[...hubs,...services,...health];
 const published=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 const valid=new Set(published.map(x=>x.slug));
 assert.equal(pages.length,54);
 const guideSpecific={
  'gum-treatment.html':'2026-10-25-incheon-periodontal-maintenance-after-treatment',
  'retreatment.html':'2026-10-25-incheon-retreatment-root-tip-dark-spot-no-pain',
  'health/gum-pus.html':'naver-224400753947-gum-pus-periodontal-abscess',
  'health/loose-tooth.html':'2026-10-25-incheon-loose-tooth-suddenly-periodontal-exam',
  'health/root-canal-after-pain.html':'2026-10-25-bupyeong-root-canal-after-treatment-pain',
  'health/root-canal-lesion.html':'2026-10-25-incheon-retreatment-root-tip-dark-spot-no-pain',
  'health/denture-loose.html':'2026-10-24-bupyeong-denture-adjustment-dentist-evaluation',
  'health/insurance-implant.html':'2026-10-25-sangok-implant-bone-graft-always-necessary',
  'health/insurance-extraction.html':'2026-10-25-bupyeong-wisdom-tooth-extraction-hemostatic-dressing',
  'health/abrasion-gi.html':'2026-10-24-bupyeong-cavity-gi-insurance',
  'health/cavity-early.html':'01',
  'health/insurance-priority.html':'naver-224430998602-treatment-priority'
 };
 for(const file of pages){
  const html=readFileSync('dist/'+file,'utf8');
  const blocks=[...html.matchAll(/<nav class="patient-story-links" aria-label="이조은치과 치과 이야기 더 읽기">([\s\S]*?)<\/nav>/g)];
  assert.equal(blocks.length,1,file+' needs exactly one patient story navigation');
  const nav=blocks[0][1];
  const topical=nav.match(/<ul class="patient-story-links-topical">([\s\S]*?)<\/ul>/)?.[1]||'';
  const refs=[...topical.matchAll(/<a href="\/stories\/([^"]+)\/"/g)].map(m=>decodeURIComponent(m[1]));
  assert.equal(refs.length,2,file+' must offer exactly two carefully selected stories');
  assert.equal(new Set(refs).size,2,file+' has duplicate story recommendations');
  for(const slug of refs){
   assert.ok(valid.has(slug),file+' links to unpublished story: '+slug);
   assert.ok(readFileSync('dist/stories/'+slug+'/index.html','utf8').includes('<h1>'),
    file+' destination does not contain an accessible article: '+slug);
  }
  if(guideSpecific[file])assert.ok(refs.includes(guideSpecific[file]),
   file+' is missing its topically relevant story');
  assert.ok(nav.includes('href="/stories.html"'),file+' must retain complete story collection');
  assert.ok(nav.includes('href="/clinical-archive.html#archive-blog-posts"'),
   file+' must retain original blog archive');
 }
 const css=readFileSync('dist/assets/patient-story-links.css','utf8');
 assert.match(css,/\.patient-story-links \.patient-story-links-topical\{/);
 assert.match(css,/@media\(max-width:600px\)\{[\s\S]*?\.patient-story-links \.patient-story-links-topical/);
});

test('full dental story directory derives its Naver original count from the verified homepage list',()=>{
 const home=readFileSync('dist/index.html','utf8');
 const directory=readFileSync('dist/stories.html','utf8');
 const section=home.match(/<section class="section light" id="stories">([\s\S]*?)<\/section>/)?.[1]||'';
 const originals=[...section.matchAll(/<div class="card owner-story-card"><h3><a href="https:\/\/blog\.naver\.com\/(kook765|tele654|radio654)\/(\d+)"/g)]
  .map(match=>match[1]+'/'+match[2]);
 assert.ok(originals.length>=300,'the full owner blog collection must remain available');
 assert.equal(new Set(originals).size,originals.length,'Naver original links should be unique');
 const count=originals.length;
 const references=[
  '<meta property="og:description" content="원장이 작성한 치과 건강정보를 홈페이지에서 주제별로 읽어보세요. 네이버 블로그 원문 '+count+'편도 별도로 찾아볼 수 있습니다.">',
  '네이버 원문 '+count+'편',
  '네이버 블로그 원문 '+count+'편 별도로 보기'
 ];
 for(const reference of references) assert.ok(directory.includes(reference),
  'full story directory incorrectly shows a stale blog count: '+reference);
 assert.ok(!directory.includes('BUILD_NAVER_BLOG_COUNT'),
  'original blog count placeholder should never leak to patients');
 assert.equal(directory.includes('네이버 블로그 원문 323편'),count===323,
  'full story directory must never retain an obsolete hardcoded count');
 const posts=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 assert.ok(directory.includes('id="published-total">'+posts.length+'</span>'),
  'the independently published clinic story total must not be mixed with Naver original count');
});
