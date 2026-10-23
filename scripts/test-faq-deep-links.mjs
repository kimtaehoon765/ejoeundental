import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';

const js=readFileSync(new URL('../assets/faq-deep-links.js',import.meta.url),'utf8');

function setup(hash,options={}){
 const listeners={};
 let scrolls=0;
 const element={tagName:options.badTag?'SECTION':'DETAILS',open:false,
  scrollIntoView(){scrolls++;}};
 const list={contains:node=>options.outside?false:node===element};
 const window={
  location:{hash},addEventListener:(type,fn)=>{listeners[type]=fn;},
  requestAnimationFrame:fn=>fn()
 };
 const document={
  querySelector:selector=>selector==='#faq .faq-list'?list:null,
  getElementById:id=>id===options.id||(!options.id&&id==='faq-gum-bleeding')?element:null
 };
 runInNewContext(js,{window,document,decodeURIComponent,String});
 return {window,element,listeners,scrolls:()=>scrolls};
}

test('a direct FAQ link opens its matching native question and scrolls to the answer',()=>{
 const x=setup('#faq-gum-bleeding');
 assert.equal(x.element.open,true);
 assert.equal(x.scrolls(),1);
 assert.equal(typeof x.listeners.hashchange,'function');
});

test('normal page anchors and non-FAQ links do not open an unrelated question',()=>{
 for(const hash of ['#location','#faq','#faq-gum%ZZ','#unexpected-section']){
  const x=setup(hash);
  assert.equal(x.element.open,false,hash);
  assert.equal(x.scrolls(),0,hash);
 }
});

test('navigating to a different FAQ link on the same page opens that question',()=>{
 const x=setup('#location',{id:'faq-parking'});
 x.window.location.hash='#faq-parking';
 x.listeners.hashchange();
 assert.equal(x.element.open,true);
 assert.equal(x.scrolls(),1);
});

test('malformed or outside-FAQ elements must never be auto-opened',()=>{
 for(const opts of [{outside:true},{badTag:true}]){
  const x=setup('#faq-gum-bleeding',opts);
  assert.equal(x.element.open,false);
 }
});

test('homepage FAQs retain 11 distinct stable anchors, accessible links and matching JSON-LD',()=>{
 const page=readFileSync('dist/index.html','utf8');
 const block=page.match(/<section[^>]*id="faq"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
 const ids=[...block.matchAll(/<details id="(faq-[a-z-]+)">\s*<summary>/g)].map(x=>x[1]);
 assert.equal(ids.length,11);
 assert.equal(new Set(ids).size,11);
 for(const id of ['faq-choose-clinic','faq-gum-bleeding','faq-root-retreatment','faq-insured-care','faq-alternating-hours','faq-parking']){
  assert.ok(ids.includes(id),id+' missing');
  assert.ok(block.includes('href="#'+id+'"'),id+' cannot be reached from topic shortcuts');
 }
 const scripts=[...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(x=>JSON.parse(x[1])).filter(x=>x['@type']==='FAQPage');
 assert.equal(scripts.length,1);
 assert.equal(scripts[0].mainEntity.length,11);
 const headings=[...block.matchAll(/<details id="faq-[a-z-]+"><summary>([^<]+)<\/summary>/g)].map(x=>x[1]);
 assert.deepEqual(scripts[0].mainEntity.map(x=>x.name),headings);
 const jsHash=awaitableHash('dist/assets/faq-deep-links.js');
 const cssHash=awaitableHash('dist/assets/faq-deep-links.css');
 assert.ok(page.includes('/assets/faq-deep-links.js?v='+jsHash));
 assert.ok(page.includes('/assets/faq-deep-links.css?v='+cssHash));
});
function awaitableHash(filename){
 return createHash('sha256').update(readFileSync(filename)).digest('hex').slice(0,12);
}
