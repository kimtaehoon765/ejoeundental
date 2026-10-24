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
 assert.equal(itemList.numberOfItems,304,'overall article count must not be lost');
 assert.equal(itemList.itemListElement.length,8,'only latest 8 stories should load in the head');
 const storyBlock=html.match(/<section class="section light" id="stories">([\s\S]*?)<\/section>/)?.[1]||'';
 const urls=[...storyBlock.matchAll(/href="(https:\/\/blog\.naver\.com\/[a-zA-Z0-9_-]+\/[0-9]+)"/g)].map(m=>m[1]);
 assert.equal(urls.length,304,'all story links must remain in the visible page/archive section');
 assert.equal(new Set(urls).size,304,'story links should not be duplicated');
 assert.deepEqual(itemList.itemListElement.map(item=>item.url),urls.slice(0,8));
 assert.ok(head.length<22000,'mobile browser should not parse a 40KB+ homepage head');
});
