import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../assets/search.js',import.meta.url),'utf8');

class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.handlers={};this.attrs={};}
  append(...children){for(const child of children){if(child&&typeof child==='object')child.parent=this;this.children.push(child);}}
  setAttribute(name,value){this.attrs[name]=String(value);}
  addEventListener(name,fn){this.handlers[name]=fn;}
  focus(){}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
}
function walk(node, predicate){
 const found=[];
 function scan(current){
  if(!current||typeof current!=='object')return;
  if(predicate(current))found.push(current);
  for(const child of current.children||[])scan(child);
 }
 scan(node);
 return found;
}
async function search(q,pages,{fail=false}={}){
 const input=new Element('input');
 const status=new Element('p');
 const results=new Element('section');
 const map={'#q':input,'#status':status,'#results':results};
 const document={
  querySelector:selector=>map[selector]||null,
  createElement:tag=>new Element(tag)
 };
 const fetch=async()=>fail?{ok:false}: {ok:true,json:async()=>pages};
 const sandbox={document,location:{search:'?q='+encodeURIComponent(q)},URLSearchParams,fetch,AbortController,setTimeout,clearTimeout,console};
 const execution=runInNewContext(script,sandbox,{timeout:5000});
 await execution;
 return {results,status,input};
}
const makeEntries=(n,word)=>Array.from({length:n},(_,i)=>({
 url:'/health/search-case-'+(i+1)+'.html',
 title:word+' 건강정보 '+(i+1),
 description:word+' 검사와 관리 안내',
 body:word+' 관련 설명'
}));

test('20 results render first; subsequent results are shown in batches',async()=>{
 const {results,status}=await search('잇몸',makeEntries(47,'잇몸'));
 assert.equal(walk(results,x=>x.className==='result').length,20);
 const extra=walk(results,x=>x.className==='search-additional-results')[0];
 const button=walk(results,x=>x.className==='search-show-more')[0];
 assert.ok(extra&&button);
 assert.match(button.textContent,/20개 더 보기/);
 assert.match(status.textContent,/47개/);
 button.handlers.click();
 assert.equal(walk(results,x=>x.className==='result').length,40);
 assert.match(button.textContent,/7개 더 보기/);
 button.handlers.click();
 assert.equal(walk(results,x=>x.className==='result').length,47);
 assert.equal(walk(results,x=>x.className==='search-show-more').length,0);
});

test('full-match and partial-match section headings are not duplicated across batches',async()=>{
 const exact=makeEntries(22,'잇몸 출혈');
 const partial=makeEntries(17,'잇몸');
 const {results}=await search('잇몸 출혈',[...exact,...partial]);
 assert.equal(walk(results,x=>x.className==='result').length,20);
 const button=walk(results,x=>x.className==='search-show-more')[0];
 assert.ok(button);
 button.handlers.click();
 const headings=walk(results,x=>x.className==='search-result-section');
 assert.equal(headings.filter(x=>x.textContent.includes('모든 검색어')).length,1);
 assert.equal(headings.filter(x=>x.textContent.includes('일부 검색어')).length,1);
 assert.equal(walk(results,x=>x.className==='result').length,39);
});

test('empty and no-match searches never display a misleading show-more button',async()=>{
 for(const q of ['','알수없는치료용어']){
  const {results}=await search(q,makeEntries(9,'잇몸'));
  assert.equal(walk(results,x=>x.className==='search-show-more').length,0);
 }
});

test('failed search index loads retain direct links to the primary care guides',async()=>{
 const {results,status}=await search('잇몸',[],{fail:true});
 assert.match(status.textContent,/불러오지 못했습니다/);
 assert.ok(walk(results,x=>x.href==='/gum-treatment.html').length);
});
