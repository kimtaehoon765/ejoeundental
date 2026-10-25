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
   source:'https://blog.naver.com/kook765/224358099087',
   provenance:'screenshots_summary',
   terms:['혈병','지혈재','항응고제','비용'],
   group:'topic-wisdom'
  },
  {
   slug:'2026-10-25-sangok-implant-bone-graft-always-necessary',
   source:'https://blog.naver.com/tele654/223968185898',
   provenance:'topic_only',
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
  assert.equal(post.source_note,item.provenance,'source note should reflect the evidence actually supplied');
  assert.ok(post.published===true&&index.some(p=>p.slug===item.slug));
  assert.ok(post.body.length>=2000,'patient article should be substantive');
  for(const term of item.terms) assert.ok(post.body.includes(term),'missing clinical context: '+term);
  assert.ok(html.includes(item.provenance==='screenshots_summary'
    ?'원장이 제공한 네이버 블로그 본문 사진을 읽고 핵심 의견을 정리한 글입니다'
    :'원문을 직접 복제하거나 요약한 글은 아닙니다'),
   'attribution must disclose whether owner provided original screenshots');
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

test('owner-topic guides for insurance implant impressions and denture adjustment are substantive',()=>{
 const pairs=[
  {slug:'naver-223663623222-cheongcheon-insured-implant-impression',
   original:'https://blog.naver.com/tele654/223663623222',
   terms:['인상채득','교합','지르코니아','급여 기준','구강스캔']},
  {slug:'naver-223663299719-cheongcheon-denture-adjustment',
   original:'https://blog.naver.com/tele654/223663299719',
   terms:['내면보강','클라스프','교합','접착제','재제작']}
 ];
 const index=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 const directory=readFileSync('dist/stories.html','utf8');
 for(const pair of pairs){
  const post=JSON.parse(readFileSync('content/posts/'+pair.slug+'.json','utf8'));
  assert.ok(post.published===true);
  assert.equal(post.source_note,'topic_only',
   'education derived from a supplied blog title must not claim original text was read');
  assert.equal(post.source_url,pair.original,'original owner Naver URL must remain unchanged');
  assert.ok(post.body.length>2400,pair.slug+' must be a useful patient guide not a thin location page');
  for(const term of pair.terms) assert.ok(post.body.includes(term),
   pair.slug+' does not discuss '+term);
  assert.ok(post.body.includes('환자')&&post.body.includes('치과의사'),
   pair.slug+' must remain a balanced patient-facing clinical explanation');
  assert.ok(index.some(p=>p.slug===pair.slug));
  assert.ok(directory.includes('href="/stories/'+pair.slug+'/">'));
  const html=readFileSync('dist/stories/'+pair.slug+'/index.html','utf8');
  assert.ok((html.match(/<h2 id="story-section-\d+">/g)||[]).length>=6,
   'published guide must be comfortably scannable: '+pair.slug);
  assert.ok(html.includes('href="'+pair.original+'"'),
   'original Naver blog link should be visible in the patient guide');
  assert.ok(html.includes('원문을 직접 복제하거나 요약한 글은 아닙니다'),
   'clear source disclosure is required');
 }
});

test('three previously thin clinical stories now offer topic-specific patient education without duplication',()=>{
 const articles=[
  {slug:'naver-223650659775-cheongcheon-periodontal',
   source:'https://blog.naver.com/tele654/223650659775',
   terms:['치주낭','큐렛','탐침','유지관리','건강보험']},
  {slug:'naver-223654967684-cheongcheon-resin',
   source:'https://blog.naver.com/tele654/223654967684',
   terms:['복합레진','방습','글라스아이오노머','건강보험','시림']},
  {slug:'naver-223662017340-sangok-oral-exam',
   source:'https://blog.naver.com/tele654/223662017340',
   terms:['치주낭','방사선검사','치은염','치주염','산곡역']}
 ];
 const index=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 const search=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 const directory=readFileSync('dist/stories.html','utf8');
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 for(const article of articles){
  const post=JSON.parse(readFileSync('content/posts/'+article.slug+'.json','utf8'));
  assert.equal(post.published,true);
  assert.equal(post.source_url,article.source,'published original blog URL should stay unchanged');
  assert.equal(post.source_note,'topic_only','do not misrepresent separately written text as a scraped Naver blog');
  assert.ok(post.body.length>1900,'not enough context for patient question: '+article.slug);
  for(const term of article.terms)assert.ok(post.body.includes(term),
   article.slug+' lacks essential clinical topic: '+term);
  assert.ok(index.some(x=>x.slug===article.slug),
   article.slug+' should remain published as one article');
  assert.equal(index.filter(x=>x.slug===article.slug).length,1,
   'do not create competing nearly-identical stories');
  assert.ok(directory.includes('href="/stories/'+article.slug+'/">'));
  assert.ok(sitemap.includes('/stories/'+article.slug+'/</loc>'));
  assert.ok(search.some(x=>x.url==='/stories/'+article.slug+'/'&&x.body.includes(article.terms[0])),
   'on-site search should index the new explanation');
  const html=readFileSync('dist/stories/'+article.slug+'/index.html','utf8');
  assert.ok((html.match(/<h2 id="story-section-\d+">/g)||[]).length>=6,
   'patient should be able to navigate clinical subsections');
  assert.match(html,/<details class="story-toc">/);
  assert.ok(html.includes('href="'+article.source+'"'),'owner original must remain accessible');
  assert.ok(html.includes('원문을 직접 복제하거나 요약한 글은 아닙니다'));
 }
});

test('three localized periodontal guides provide distinct useful topics and truthful clinic location',()=>{
 const cases=[
  {
   slug:'naver-223597124826-sangok-scaling',
   source:'https://blog.naver.com/tele654/223597124826',
   terms:['치석','치주낭','큐렛','치근활택술','산곡역'],
   theme:'스케일링'
  },
  {
   slug:'naver-223605299741-bucheon-periodontal',
   source:'https://blog.naver.com/tele654/223605299741',
   terms:['동요도','교합','치근파절','치조골','부천'],
   theme:'흔들리는'
  },
  {
   slug:'naver-223610677224-jakjeon-periodontal',
   source:'https://blog.naver.com/tele654/223610677224',
   terms:['치주농양','치근단','고름','응급실','작전동'],
   theme:'붓고'
  }
 ];
 const published=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 const search=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 const index=readFileSync('dist/stories.html','utf8');
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 const bodies=[];
 for(const guide of cases){
  const post=JSON.parse(readFileSync('content/posts/'+guide.slug+'.json','utf8'));
  assert.equal(post.published,true);
  assert.equal(post.source_url,guide.source);
  assert.equal(post.source_note,'topic_only','original text was not read; be transparent');
  assert.ok(post.body.length>=2000,guide.slug+' must give more than superficial SEO copy');
  assert.ok(post.title.includes(guide.theme),guide.slug+' should have a differentiated user question');
  for(const term of guide.terms)assert.ok(post.body.includes(term),guide.slug+' misses '+term);
  assert.ok(post.body.includes('부평구 청천동'),guide.slug+' must give actual clinic neighborhood');
  if(guide.slug.includes('bucheon'))assert.ok(post.body.includes('부천에 있는 병원이 아닙니다'));
  if(guide.slug.includes('jakjeon'))assert.ok(post.body.includes('작전동이 아닌'));
  assert.ok(published.some(x=>x.slug===guide.slug),guide.slug+' missing from published index');
  assert.ok(search.some(x=>x.url==='/stories/'+guide.slug+'/'&&x.body.includes(guide.terms[0])),
    guide.slug+' body missing from actual site search');
  assert.ok(index.includes('href="/stories/'+guide.slug+'/">'));
  assert.ok(sitemap.includes('/stories/'+guide.slug+'/</loc>'));
  const article=readFileSync('dist/stories/'+guide.slug+'/index.html','utf8');
  assert.ok((article.match(/<h2 id="story-section-\d+">/g)||[]).length>=6,
    guide.slug+' medical subtopics must be individually navigable');
  assert.match(article,/<details class="story-toc">/);
  assert.ok(article.includes('href="'+guide.source+'"'));
  assert.ok(article.includes('원문을 직접 복제하거나 요약한 글은 아닙니다'));
  bodies.push(post.body);
 }
 assert.equal(new Set(bodies).size,cases.length,'regional guides must not contain identical text');
});

test('three former thin caries and oral exam guides now give distinct, referenced patient choices',()=>{
 const expected=[
  {slug:'naver-223662259955-cheongcheon-oral-exam',
   source:'https://blog.naver.com/tele654/223662259955',
   terms:['치주낭','엑스레이','치조골','치은염','우선순위'],
   heading:'청천동 구강검진'},
  {slug:'naver-223657999967-sangok-caries',
   source:'https://blog.naver.com/tele654/223657999967',
   terms:['자연치아','근관치료','복합레진','글라스아이오노머','산곡역'],
   heading:'산곡동 충치치료'},
  {slug:'naver-223658065860-cheongcheon-caries-treatment-stages',
   source:'https://blog.naver.com/tele654/223658065860',
   terms:['법랑질','상아질','치수','치근단','불소'],
   heading:'충치 진행 단계'}
 ];
 const published=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 const search=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 const directory=readFileSync('dist/stories.html','utf8');
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 const bodies=[];
 for(const guide of expected){
  const post=JSON.parse(readFileSync('content/posts/'+guide.slug+'.json','utf8'));
  assert.equal(post.published,true);
  assert.equal(post.source_note,'topic_only','do not imply full Naver source was consulted');
  assert.equal(post.source_url,guide.source);
  assert.ok(post.body.length>=2000,'not enough topic explanation for '+guide.slug);
  assert.ok(post.body.includes('참고:')||post.body.includes('참고 자료:'),
   guide.slug+' should name authoritative patient resources');
  for(const term of guide.terms)assert.ok(post.body.includes(term),guide.slug+' missing '+term);
  assert.ok(post.title.includes(guide.heading),'each guide must retain its differentiated topic');
  assert.equal(published.filter(x=>x.slug===guide.slug).length,1);
  assert.ok(directory.includes('href="/stories/'+guide.slug+'/">'));
  assert.ok(sitemap.includes('/stories/'+guide.slug+'/</loc>'));
  assert.ok(search.some(x=>x.url==='/stories/'+guide.slug+'/'&&
   x.body.includes(guide.terms[0])),guide.slug+' expanded content must be searchable');
  const article=readFileSync('dist/stories/'+guide.slug+'/index.html','utf8');
  assert.ok((article.match(/<h2 id="story-section-\d+">/g)||[]).length>=6,
   guide.slug+' needs useful subheadings');
  assert.match(article,/<details class="story-toc">/);
  assert.ok(article.includes('href="'+guide.source+'"'));
  assert.ok(article.includes('원문을 직접 복제하거나 요약한 글은 아닙니다'));
  bodies.push(post.body);
 }
 assert.equal(new Set(bodies).size,expected.length,'guides must not be near-copy regional SEO swaps');
});

test('specific cavity and checkup FAQ pages link to enhanced matching education stories',()=>{
 const plans={
  'health/cavity-depth.html':[
   'naver-223658065860-cheongcheon-caries-treatment-stages',
   'naver-223657999967-sangok-caries'],
  'health/cavity-early.html':['01','naver-223658065860-cheongcheon-caries-treatment-stages'],
  'health/cavity-materials.html':[
   'naver-223654967684-cheongcheon-resin',
   '2026-10-24-bupyeong-cavity-gi-insurance'],
  'health/cavity-recurrent.html':[
   'naver-223654967684-cheongcheon-resin',
   'naver-223657999967-sangok-caries'],
  'health/insurance-checkup.html':[
   'naver-223662259955-cheongcheon-oral-exam',
   'naver-224430998602-treatment-priority']
 };
 for(const [care,slugs] of Object.entries(plans)){
  const html=readFileSync('dist/'+care,'utf8');
  const block=html.match(/<ul class="patient-story-links-topical">([\s\S]*?)<\/ul>/)?.[1]||'';
  const links=[...block.matchAll(/href="\/stories\/([^"]+)\//g)].map(m=>decodeURIComponent(m[1]));
  assert.deepEqual(links,slugs,care+' should link to its exact two independently published patient answers');
  assert.equal(new Set(links).size,2,care+' must not repeat same article');
  for(const slug of slugs)assert.ok(readFileSync('dist/stories/'+slug+'/index.html','utf8')
    .includes('<section class="story-prose"'),care+' points to nonexistent patient guide '+slug);
 }
});

test('owner-provided July scaling screenshots publish once with accurate topical-anesthetic explanation',()=>{
 const slug='2026-10-24-sangok-scaling-gargle-anesthesia-pain-control';
 const original='https://blog.naver.com/kook765/224362153526';
 const source=JSON.parse(readFileSync('content/posts/'+slug+'.json','utf8'));
 assert.equal(source.published,true);
 assert.equal(source.source_note,'screenshots_summary',
  'a full article supplied as screenshots is not a title-only post');
 assert.equal(source.source_url,original);
 assert.equal(source.updated,'2026-10-25');
 assert.ok(source.body.length>3300,'the actual photographed blog text should become a substantial patient explainer');
 for(const term of ['가글마취','치아 시림','플라시보','치주낭','스케일링','임신','치과위생사','치과의사']){
  assert.ok(source.body.includes(term),'original patient question or safety point missing: '+term);
 }
 assert.ok(source.body.includes('가글마취를 했다는 이유만으로 치아 시림까지 완전히 사라진다고 볼 수 없습니다'),
  'do not promise pulp/dentin anesthesia from mouth-rinse anesthesia');
 assert.ok(source.body.includes('임신부라고 모든 국소마취제가 일률적으로 금기인 것은 아닙니다'),
  'do not repeat the original sweeping pregnancy contraindication');
 assert.ok(source.body.includes('직종만으로 통증이 더 적거나 치료 결과가 반드시 더 좋다고 일반화할 수는 없습니다'),
  'avoid disparaging licensed dental hygienists');
 const indexed=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 assert.equal(indexed.filter(x=>x.slug===slug).length,1,
  'avoid duplicating a story already published on the same topic');
 const all=readFileSync('dist/stories.html','utf8');
 assert.ok(all.includes('href="/stories/'+slug+'/">'));
 const search=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 assert.ok(search.some(x=>x.url==='/stories/'+slug+'/'&&x.body.includes('가글마취')));
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 assert.ok(sitemap.includes('/stories/'+slug+'/</loc><lastmod>2026-10-25</lastmod>'));
 const html=readFileSync('dist/stories/'+slug+'/index.html','utf8');
 assert.ok(html.includes('원장이 제공한 네이버 블로그 본문 사진을 읽고 핵심 의견을 정리한 글입니다'),
  'attribution should acknowledge the actual screenshots');
 assert.ok(html.includes('href="'+original+'"'),'preserve original link in blog archive');
 assert.ok(html.includes('내용 수정 <time datetime="2026-10-25">2026-10-25</time>'));
 assert.ok((html.match(/<h2 id="story-section-\d+">/g)||[]).length>=7);
 const scaling=readFileSync('dist/scaling.html','utf8');
 assert.ok(scaling.includes('href="/stories/'+slug+'/">'),
  'patient with scaling sensitivity must be able to find photographed blog advice from main scaling page');
});

test('owner screenshots on cheap cavity clinics responsibly update one existing guide with real source',()=>{
 const slug='2026-10-24-cheongcheon-dental-discount-ads-and-care-choice';
 const ownerSource='https://blog.naver.com/kook765/224360654061';
 const post=JSON.parse(readFileSync('content/posts/'+slug+'.json','utf8'));
 assert.equal(post.source_url,ownerSource,'keep exact owner blog original referenced in homepage');
 assert.equal(post.source_note,'screenshots_summary','full screenshots were supplied and read');
 assert.equal(post.updated,'2026-10-25');
 assert.equal(post.published,true);
 assert.ok(post.body.length>=3800,'screenshot source should be summarized substantially');
 for(const topic of ['건강보험','비급여','GI','치주치료','자연치아','우선순위','선결제']){
  assert.ok(post.body.includes(topic),'important concern omitted: '+topic);
 }
 assert.ok(post.body.includes('가격이 낮다는 사실만으로 진료의 질이 나쁘다고 판단할 수는 없습니다'),
  'price alone must not support disparaging other clinics');
 assert.ok(post.body.includes('치료 항목이 많다는 사실만으로 과잉진료라고 단정해서는 안 됩니다'),
  'avoid implying many treatments necessarily constitute overtreatment');
 const listed=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 assert.equal(listed.filter(x=>x.slug===slug).length,1,'update existing site article, not a competing thin page');
 const article=readFileSync('dist/stories/'+slug+'/index.html','utf8');
 assert.ok(article.includes('href="'+ownerSource+'"'),'patient can open source Naver blog post');
 assert.ok(article.includes('원장이 제공한 네이버 블로그 본문 사진을 읽고 핵심 의견을 정리한 글입니다'));
 assert.ok(article.includes('내용 수정 <time datetime="2026-10-25">2026-10-25</time>'));
 assert.ok((article.match(/<h2 id="story-section-\d+">/g)||[]).length>=8,
  'patients need to browse clear questions and choices');
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 assert.ok(sitemap.includes('/stories/'+slug+'/</loc><lastmod>2026-10-25</lastmod>'));
 const directory=readFileSync('dist/stories.html','utf8');
 assert.ok(directory.includes('href="/stories/'+slug+'/">'),'story directory still lists revised original');
 const index=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 assert.ok(index.some(p=>p.url==='/stories/'+slug+'/'&&p.body.includes('건강보험')),
  'on-site search should locate the screenshot-derived article text');
 const cavity=readFileSync('dist/cavity-treatment.html','utf8');
 assert.ok(cavity.includes('href="/stories/'+slug+'/">'),'cavity treatment patients should find relevant cost guidance');
});

test('owner July 27 root-canal-duration screenshots publish as one nuanced and linked patient guide',()=>{
 const slug='2026-10-25-bupyeong-root-canal-how-many-visits-and-why';
 const original='https://blog.naver.com/kook765/224359802215';
 const post=JSON.parse(readFileSync('content/posts/'+slug+'.json','utf8'));
 assert.equal(post.source_url,original,'use actual owner source linked from homepage');
 assert.equal(post.source_note,'screenshots_summary','five images provided actual article text');
 assert.equal(post.published,true);
 assert.ok(post.body.length>3600,'the article must cover the original details, not be a thin SEO copy');
 for(const term of ['신경치료','근관치료','휘어','석회화','파일(file)','차아염소산나트륨',
   '거타퍼차','실러','한 번 방문','건강보험','자연치아']){
  assert.ok(post.body.includes(term),'missing original topic or patient safety caveat: '+term);
 }
 assert.ok(post.body.includes('방문 횟수가 많다는 사실만으로 더 좋은 치료라고 단정할 수는 없습니다'),
  'do not suggest unnecessary appointments indicate more conscientious care');
 assert.ok(post.body.includes('한 번 방문으로 적절한 치료를 마칠 수도 있습니다'),
  'make room for guideline-supported safe single visit treatment');
 assert.ok(!post.body.includes('수익이 전혀 나지'),'avoid unverified claims about dentist finances');
 const index=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 assert.equal(index.filter(x=>x.slug===slug).length,1,'do not duplicate this topic with a second native post');
 const article=readFileSync('dist/stories/'+slug+'/index.html','utf8');
 assert.ok(article.includes('href="'+original+'"'),'patients can open original Naver blog');
 assert.ok(article.includes('원장이 제공한 네이버 블로그 본문 사진을 읽고 핵심 의견을 정리한 글입니다'),
  'screenshots based articles need accurate provenance');
 assert.ok((article.match(/<h2 id="story-section-\d+">/g)||[]).length>=8);
 assert.ok(article.includes('신경치료')&&article.includes('치아'));
 assert.match(article,/<details class="story-toc">/,'long explanation needs navigable outline');
 const directory=readFileSync('dist/stories.html','utf8');
 assert.ok(directory.includes('href="/stories/'+slug+'/">'),'patients should find article from clinic story index');
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 assert.ok(sitemap.includes('/stories/'+slug+'/</loc>'),'crawlers should discover article');
 const search=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 assert.ok(search.some(x=>x.url==='/stories/'+slug+'/'&&x.body.includes('석회화')),
  'site search should index the practical difficult-canal discussion');
 const rootHub=readFileSync('dist/root-canal-health.html','utf8');
 assert.ok(rootHub.includes('href="/stories/'+slug+'/">'),'root canal hub must link to blog summary');
 const process=readFileSync('dist/health/root-canal-process.html','utf8');
 const related=process.match(/<ul class="patient-story-links-topical">([\s\S]*?)<\/ul>/)?.[1]||'';
 assert.ok(related.includes('href="/stories/'+slug+'/">'),
  'root canal process article should offer the newly published source text');
});

test('five original Naver wisdom-tooth screenshots become a single balanced hemostasis guide',()=>{
 const slug='2026-10-25-bupyeong-wisdom-tooth-extraction-hemostatic-dressing';
 const original='https://blog.naver.com/kook765/224358099087';
 const post=JSON.parse(readFileSync('content/posts/'+slug+'.json','utf8'));
 assert.equal(post.source_url,original);
 assert.equal(post.source_note,'screenshots_summary');
 assert.equal(post.published,true);
 assert.equal(post.updated,'2026-10-25');
 assert.ok(post.title.includes('사랑니')&&post.title.includes('지혈제'));
 assert.ok(post.body.length>3800,'source-based patient guide must be medically substantial');
 for(const term of ['거즈','압박','혈병','지혈재','항응고제','하치조신경관','삼산동','드라이소켓','진료비']){
  assert.ok(post.body.includes(term),'important source detail missing: '+term);
 }
 assert.ok(post.body.includes('모든 환자에게 두 시간을 일률적으로 적용할 근거는 없습니다'),
  'do not repeat a fixed two-hour postoperative packing instruction');
 assert.ok(post.body.includes('국소 지혈재 사용 자체가 과잉진료의 증거는 아닙니다'),
  'patient must not be told hemostatic materials are universally unnecessary');
 assert.ok(post.body.includes('약을 임의로 끊으면 혈전이나 뇌졸중'),
  'patients must not stop prescribed anticoagulants to avoid local hemostatic measures');
 assert.ok(post.body.includes('실제 위치는 인천 부평구 청천동'),
  'Samsan-dong SEO language must not misstate clinic location');
 assert.ok(!post.body.includes('한 시간 이상 치료시간'),'do not infer other dentists margins');
 const all=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 assert.equal(all.filter(x=>x.slug===slug).length,1,
  'do not create a competing same-topic native article');
 const html=readFileSync('dist/stories/'+slug+'/index.html','utf8');
 assert.ok(html.includes('href="'+original+'"'),'blog URL must match user-provided screenshot topic');
 assert.ok(html.includes('원장이 제공한 네이버 블로그 본문 사진을 읽고 핵심 의견을 정리한 글입니다'));
 assert.ok((html.match(/<h2 id="story-section-\d+">/g)||[]).length>=8);
 assert.match(html,/<details class="story-toc">/);
 assert.ok(readFileSync('dist/stories.html','utf8').includes('href="/stories/'+slug+'/">'));
 assert.ok(readFileSync('dist/sitemap.xml','utf8').includes('/stories/'+slug+'/</loc><lastmod>2026-10-25</lastmod>'));
 assert.ok(JSON.parse(readFileSync('dist/content/search-index.json','utf8'))
  .some(item=>item.url==='/stories/'+slug+'/'&&item.body.includes('지혈재')));
 const info=readFileSync('dist/health/insurance-extraction.html','utf8');
 assert.ok(info.includes('href="/stories/'+slug+'/">'),
  'extraction guide must link to relevant wisdom-tooth hemostasis patient story');
});

test('July 25 owner photographs publish honest cervical GI-vs-resin options without duplicating broader tooth-wear story',()=>{
 const slug='2026-10-25-samsan-cervical-abrasion-gi-insurance-vs-resin';
 const original='https://blog.naver.com/kook765/224357473394';
 const post=JSON.parse(readFileSync('content/posts/'+slug+'.json','utf8'));
 assert.equal(post.source_url,original,'use actual original blog URL supplied in homepage archive');
 assert.equal(post.source_note,'screenshots_summary','the user provided the full five image blog text');
 assert.equal(post.published,true);
 assert.equal(post.date,'2026-10-25');
 assert.ok(post.title.includes('치경부마모증')&&post.title.includes('GI'));
 assert.ok(post.body.length>=3800,'full screenshot article should become a substantial explanation');
 for(const term of ['비우식성 치경부 병소','상아질','글라스아이오노머','복합레진',
   '불소','보험','삼산동','칫솔','이갈이','2025']){
  assert.ok(post.body.includes(term),'important topic absent: '+term);
 }
 assert.ok(post.body.includes('V자 패임을 보고 무조건 이를 꽉 물어서 생긴'),
  'do not treat abfraction hypothesis as a confirmed shape-based diagnosis');
 assert.ok(post.body.includes('GI 재료라면 모든 경우에 건강보험이 적용되는 것도 아닙니다'),
  'do not give a blanket reimbursement guarantee');
 assert.ok(post.body.includes('삼산동이 아닌 인천 부평구 청천동'),
  'regional search queries must not imply the clinic is in Samsan-dong');
 assert.ok(post.body.includes('GI와 복합레진 사이에 유의한 차이가 확인되지 않았습니다'),
  'do not claim expensive composite automatically gives better outcomes');
 const all=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 assert.equal(all.filter(x=>x.slug===slug).length,1,'this should be one dedicated original screenshot post');
 assert.ok(all.some(x=>x.slug==='2026-10-24-bupyeong-tooth-wear-sensitivity-treatment'),
  'keep older broad tooth-wear and sensitivity explainer');
 const html=readFileSync('dist/stories/'+slug+'/index.html','utf8');
 assert.ok(html.includes('href="'+original+'"'),'patients must be able to open the original');
 assert.ok(html.includes('원장이 제공한 네이버 블로그 본문 사진을 읽고 핵심 의견을 정리한 글입니다'),
  'clear photo-derived provenance note is required');
 assert.ok((html.match(/<h2 id="story-section-\d+">/g)||[]).length>=8);
 assert.match(html,/<details class="story-toc">/);
 assert.ok(readFileSync('dist/stories.html','utf8').includes('href="/stories/'+slug+'/">'));
 assert.ok(readFileSync('dist/sitemap.xml','utf8').includes('/stories/'+slug+'/</loc>'));
 const search=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 assert.ok(search.some(x=>x.url==='/stories/'+slug+'/'&&x.body.includes('레진')),
  'onsite search should index the full GI and resin comparison');
 const service=readFileSync('dist/cervical-abrasion.html','utf8');
 assert.ok(service.includes('href="/stories/'+slug+'/">'),
  'cervical abrasion main service page must link to new original summary');
 for(const care of ['cervical-abrasion.html','health/abrasion-gi.html','health/insurance-cervical.html']){
  const page=readFileSync('dist/'+care,'utf8');
  const nav=page.match(/<ul class="patient-story-links-topical">([\s\S]*?)<\/ul>/)?.[1]||'';
  assert.ok(nav.includes('href="/stories/'+slug+'/">'),care+' must recommend matching GI guidance');
 }
});

test('owner screenshot on choosing an ethical dentist explains ads and insured care without inventing outcomes',()=>{
 const slug='2026-10-25-cheongcheon-ethical-dentist-advertising-vs-treatment';
 const sourceUrl='https://blog.naver.com/kook765/224356743782';
 const post=JSON.parse(readFileSync('content/posts/'+slug+'.json','utf8'));
 assert.equal(post.published,true);
 assert.equal(post.source_note,'screenshots_summary','owner supplied actual blog body in five screenshots');
 assert.equal(post.source_url,sourceUrl);
 assert.ok(post.title.includes('청천동치과')&&post.title.includes('양심치과'));
 assert.ok(post.body.length>3800,'the sourced article must explain choices rather than repeat SEO phrases');
 for(const keyword of ['광고','보험','양심치과','임플란트','뼈이식',
   '잇몸치료','신경치료','재신경치료','자연치아','선결제','의학박사']){
  assert.ok(post.body.includes(keyword),'missing practical owner blog issue: '+keyword);
 }
 assert.ok(post.body.includes('광고를 한다는 이유만으로 해당 치과가 수익만을 추구하거나 진료가 부실하다고 단정하는 것도 적절하지 않습니다'),
  'avoid presenting the owners criticism as unverified facts about other dentists');
 assert.ok(post.body.includes('보험 진료가 저렴하다는 이유만으로 더 좋은 결과를 보장하지는 않습니다'),
  'do not equate insurance reimbursement with clinical ethics');
 assert.ok(post.body.includes('전체 치료 계획과 비용을 한꺼번에 설명하는 것이 도움이 될 수 있습니다'),
  'a broad treatment plan is not intrinsically overtreatment');
 assert.ok(post.body.includes('2003년부터 인천 부평구 청천동 한자리에서 진료'),
  'preserve actual clinic position');
 const index=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 assert.equal(index.filter(item=>item.slug===slug).length,1,'do not publish duplicate screenshot article');
 assert.ok(index.some(item=>item.slug==='naver-224423014376-ethical-dentist-definition'),
  'keep independently sourced ethical-care criteria article');
 const html=readFileSync('dist/stories/'+slug+'/index.html','utf8');
 assert.ok(html.includes('href="'+sourceUrl+'"'),'patient must be able to see original Naver blog');
 assert.ok(html.includes('원장이 제공한 네이버 블로그 본문 사진을 읽고 핵심 의견을 정리한 글입니다'),
  'the source note must accurately acknowledge original screenshots');
 assert.ok((html.match(/<h2 id="story-section-\d+">/g)||[]).length>=9,
  'long patient educational copy must have readable subsections');
 assert.match(html,/<details class="story-toc">/);
 assert.ok(readFileSync('dist/stories.html','utf8').includes('href="/stories/'+slug+'/">'));
 assert.ok(readFileSync('dist/sitemap.xml','utf8').includes('/stories/'+slug+'/</loc>'));
 const search=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 assert.ok(search.some(item=>item.url==='/stories/'+slug+'/'&&item.body.includes('광고')));
 const insurance=readFileSync('dist/insured-care.html','utf8');
 assert.ok(insurance.includes('href="/stories/'+slug+'/">'),
  'care guide should link to article explaining insured treatment decisions');
});

test('six original overtreatment screenshots improve existing insurance guide instead of adding a competing story',()=>{
 const slug='2026-10-24-bupyeong-overtreatment-insurance-care-guide';
 const original='https://blog.naver.com/kook765/224355961223';
 const post=JSON.parse(readFileSync('content/posts/'+slug+'.json','utf8'));
 assert.equal(post.published,true);
 assert.equal(post.source_note,'screenshots_summary','owner actually provided original article body screenshots');
 assert.equal(post.source_url,original);
 assert.equal(post.updated,'2026-10-25');
 assert.ok(post.title.includes('청천동치과')&&post.title.includes('과잉진료'));
 assert.ok(post.body.length>4200,'must give patient useful source-based explanations');
 for(const term of ['광고','건강보험','근관치료','임플란트','뼈이식',
   '라미네이트','선결제','자연치아','큐렛','치과위생사','재신경치료']){
  assert.ok(post.body.includes(term),'missing patient question from the photographed article: '+term);
 }
 assert.ok(post.body.includes('광고를 많이 한다고 그 치과가 불필요한 치료를 시행한다고 추정할 근거는 없습니다'),
  'do not accuse advertising dentists of overtreatment without evidence');
 assert.ok(post.body.includes('건강보험 진료를 많이 한다는 사실만으로 과잉진료를 하지 않는다는 것을 보장하지는 않습니다'),
  'insurance volume does not prove clinical ethics');
 assert.ok(post.body.includes('병원 규모가 크다거나 비급여 진료를 많이 한다는 이유만으로'),
  'do not turn broad criticism of private practices into established facts');
 assert.ok(post.body.includes('자연치아를 유지하는 방법이 될 수 있습니다'),
  'explain tooth preservation options prior to irreversible removal');
 assert.ok(post.body.includes('2003년부터 인천 부평구 청천동에서 한자리 진료'),
  'correct location and established clinic experience');
 const index=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 assert.equal(index.filter(item=>item.slug===slug).length,1,'update original local post rather than duplicating');
 assert.ok(index.some(item=>item.slug==='2026-10-25-cheongcheon-ethical-dentist-advertising-vs-treatment'),
  'retain distinct screenshot article about dental advertising');
 const article=readFileSync('dist/stories/'+slug+'/index.html','utf8');
 assert.ok(article.includes('href="'+original+'"'),'patients must find actual source blog');
 assert.ok(article.includes('원장이 제공한 네이버 블로그 본문 사진을 읽고 핵심 의견을 정리한 글입니다'),
  'accurately describe original screenshots, rather than claim title-only research');
 assert.ok((article.match(/<h2 id="story-section-\d+">/g)||[]).length>=10,
  'expanded content should be sectioned and discoverable');
 assert.match(article,/<details class="story-toc">/);
 assert.ok(readFileSync('dist/stories.html','utf8').includes('href="/stories/'+slug+'/">'));
 assert.ok(readFileSync('dist/sitemap.xml','utf8').includes('/stories/'+slug+'/</loc><lastmod>2026-10-25</lastmod>'));
 const search=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 assert.ok(search.some(item=>item.url==='/stories/'+slug+'/'&&item.body.includes('라미네이트')),
  'revised information must be in internal search index');
 const insurance=readFileSync('dist/insured-care.html','utf8');
 assert.ok(insurance.includes('href="/stories/'+slug+'/">'),
  'insured care page should link to patient checklist');
});
