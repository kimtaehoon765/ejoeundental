import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

// The public story pages use original publication order. The Naver RSS instead
// includes most recently published OR substantively edited articles, without
// inventing new publication dates for revised clinical guidance.
const published=readdirSync(new URL('../content/posts/',import.meta.url))
 .filter(name=>name.endsWith('.json'))
 .map(name=>({slug:name.slice(0,-5),post:JSON.parse(
   readFileSync(new URL('../content/posts/'+name,import.meta.url),'utf8'))}))
 .filter(({post})=>post.published===true)
 .sort((a,b)=>String(b.post.date||'').localeCompare(String(a.post.date||''))||
   a.slug.localeCompare(b.slug));

const hrefSlug=href=>decodeURIComponent(href.match(/\/stories\/([^/]+)\//)?.[1]||'');
const links=html=>[...html.matchAll(/href="(\/stories\/[^"]+\/)"[^>]*>/g)]
 .map(m=>hrefSlug(m[1]));

test('homepage six featured patient stories are newest, not oldest',()=>{
 const html=readFileSync('dist/index.html','utf8');
 const section=html.match(/<div id="published-story-items" class="grid"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';
 const slugs=[...section.matchAll(/<a class="card post-card" href="(\/stories\/[^"]+\/)"[^>]*>/g)]
  .map(m=>hrefSlug(m[1]));
 assert.deepEqual(slugs,published.slice(0,6).map(x=>x.slug),
  'the featured homepage stories must be the six newest');
 const older=html.match(/<div class="journal-extra-list">([\s\S]*?)<\/div>/)?.[1]||'';
 const more=[...older.matchAll(/class="journal-extra-entry" href="(\/stories\/[^"]+\/)"[^>]*>/g)]
  .map(m=>hrefSlug(m[1]));
 assert.deepEqual(more,published.slice(6).map(x=>x.slug),
  'the earlier stories should follow newest-first, without missing stories');
});

test('every topic directory section keeps its patient articles newest-first',()=>{
 const html=readFileSync('dist/stories.html','utf8');
 for(const topic of ['gum','root','cavity','preserve','prosthetic','wisdom','choice']){
  const section=html.match(new RegExp('<section class="story-topic" id="topic-'+topic+'"[^>]*>([\\s\\S]*?)<\\/section>'))?.[1]||'';
  const articleSlugs=links(section);
  assert.ok(articleSlugs.length>0,topic+' has no published article links');
  const globalOrder=articleSlugs.map(slug=>published.findIndex(post=>post.slug===slug));
  assert.ok(globalOrder.every(index=>index>=0),topic+' has an unknown published article');
  assert.deepEqual(globalOrder,[...globalOrder].sort((a,b)=>a-b),
   topic+' should show articles in descending publication date, then slug');
 }
 const cavity=html.match(/<section class="story-topic" id="topic-cavity"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
 const wisdom=html.match(/<section class="story-topic" id="topic-wisdom"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
 const broken='2026-10-25-bupyeong-broken-tooth-extraction-vs-restoration';
 assert.ok(links(cavity).includes(broken),
  'a broken natural tooth article belongs with restorations, not wisdom tooth surgery');
 assert.ok(!links(wisdom).includes(broken),
  'generic extraction wording must not automatically mean wisdom teeth');
});

test('Naver RSS lists twenty most recently revised or published articles without falsifying publication dates',()=>{
 const feed=readFileSync('dist/rss.xml','utf8');
 const modified=x=>[x.post.updated,x.post.date].filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d||'')))
  .sort().at(-1)||'';
 const byRevision=[...published].sort((a,b)=>
  modified(b).localeCompare(modified(a))||
  String(b.post.date||'').localeCompare(String(a.post.date||''))||
  a.slug.localeCompare(b.slug));
 const actual=[...feed.matchAll(/<item><title>[\s\S]*?<link>([^<]+)<\/link>/g)]
  .map(m=>hrefSlug(m[1]));
 assert.deepEqual(actual,byRevision.slice(0,20).map(x=>x.slug),
  'RSS must surface real clinical revisions, not just newly created URLs');
 assert.equal(actual.length,20);
 const latestDate=modified(byRevision[0]);
 assert.ok(feed.includes('<lastBuildDate>'+new Date(latestDate+'T03:00:00Z').toUTCString()+'</lastBuildDate>'),
  'lastBuildDate must reflect real content modifications, not a build timestamp');
 for(const item of byRevision.slice(0,20)){
  const expectedDate=new Date(item.post.date+'T03:00:00Z').toUTCString();
  const block=feed.split('<link>https://ejoeundental.com/stories/'+item.slug+'/</link>')[1]
   ?.split('</item>')[0]||'';
  assert.ok(block.includes('<pubDate>'+expectedDate+'</pubDate>'),
   'published date must never be replaced by the updated date: '+item.slug);
  assert.ok(block.includes('<description>')&&block.includes('</description>'),
   'RSS must include the full patient education text: '+item.slug);
 }
});

test('treatment guide related-story links include recent relevant articles',()=>{
 for(const [filename,headline] of [
  ['gum-treatment.html',/잇몸|치주|스케일링|치석|치은|큐렛/],
  ['retreatment.html',/재신경치료|신경치료|근관치료|치근단/],
  ['cavity-treatment.html',/충치|레진|치아가 깨|치아파절/]
 ]){
  const html=readFileSync('dist/'+filename,'utf8');
  const section=html.match(/<section data-care-story-links="1"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
  assert.ok(section,filename+' should contain a crawlable related stories section');
  const inGuide=links(section);
  assert.ok(inGuide.length>0&&inGuide.length<=5,filename+' should have 1–5 real story links');
  const recent=published.filter(({post})=>headline.test(String(post.title||''))).slice(0,15).map(x=>x.slug);
  assert.ok(inGuide.some(slug=>recent.includes(slug)),
   filename+' must connect to recent relevant patient articles');
 }
});

test('homepage separately surfaces natural-tooth preservation beside three clinical topics',()=>{
 const home=readFileSync('dist/index.html','utf8');
 const archive=readFileSync('dist/stories.html','utf8');
 const nav=home.split('<nav class="journal-recent-topics"')[1]?.split('</nav>')[0]||'';
 const featured=[...nav.matchAll(/<a href="(\/stories\/[^"]+\/)"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/g)]
  .map(m=>({slug:hrefSlug(m[1]),category:m[2]}));
 assert.equal(featured.length,4,'four distinct clinical question cards must appear');
 assert.deepEqual(featured.map(x=>x.category),[
  '잇몸치료·스케일링','신경치료·재신경치료','충치·수복치료','자연치아 보존'
 ]);
 const preservationSection=archive.split('<section class="story-topic" id="topic-preserve"')[1]?.split('</section>')[0]||'';
 const firstPreserve=links(preservationSection)[0];
 assert.ok(firstPreserve,'natural tooth preservation section must contain a real article');
 assert.equal(featured[3].slug,firstPreserve,
  'homepage preservation card must lead to newest real preservation article');
});
