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
async function search(q,pages,{fail=false,hostname='ejoeundental.pages.dev'}={}){
 const input=new Element('input');
 const status=new Element('p');
 const results=new Element('section');
 const map={'#q':input,'#status':status,'#results':results};
 const document={
  querySelector:selector=>map[selector]||null,
  createElement:tag=>new Element(tag)
 };
 const fetch=async()=>fail?{ok:false}: {ok:true,json:async()=>pages};
 const sandbox={document,location:{search:'?q='+encodeURIComponent(q),hostname},URLSearchParams,fetch,AbortController,setTimeout,clearTimeout,console};
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
 const exact=makeEntries(22,'잇몸 출혈 심화');
 const partial=makeEntries(17,'잇몸 출혈');
 const {results}=await search('잇몸 출혈 심화',[...exact,...partial]);
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


test('patient symptom queries rank the corresponding health guide before generic care pages',async()=>{
 const published=JSON.parse(readFileSync(new URL('../content/search-index-46.json',import.meta.url),'utf8'));
 const cases=[
  ['양치할 때 피가 나요','/health/gum-bleeding.html'],
  ['잇몸 출혈','/health/gum-bleeding.html'],
  ['잇몸이 부었어요','/health/swollen-gums.html'],
  ['잇몸에 고름','/health/gum-pus.html'],
  ['치은퇴축','/health/receding-gums.html'],
  ['치아가 길어졌어요','/health/receding-gums.html'],
  ['신경치료 후 통증','/health/root-canal-after-pain.html'],
  ['찬물에 이가 시려요','/health/abrasion-sensitive.html'],
  ['틀니가 헐거워요','/health/denture-loose.html']
 ];
 for(const [query,wanted] of cases){
  const {results}=await search(query,published);
  const first=walk(results,x=>x.className==='result')[0]?.href;
  assert.equal(first,wanted,query+' should prioritize the matching patient guide');
 }
});

test('searching for a local treatment still links to the primary care guide',async()=>{
 const published=JSON.parse(readFileSync(new URL('../content/search-index-46.json',import.meta.url),'utf8'));
 for(const [query,expected] of [
  ['인천 잇몸치료','/gum-treatment.html'],
  ['산곡역 재신경치료','/retreatment.html'],
  ['부평 치경부마모증','/cervical-abrasion.html'],
  ['인천 건강보험','/insured-care.html']
 ]){
  const {results}=await search(query,published);
  const topFive=walk(results,x=>x.className==='result').slice(0,5).map(x=>x.href);
  assert.ok(topFive.includes(expected),query+' must include its guide within the top five');
 }
});


test('real clinic safety and appointment searches retrieve standalone pages',async()=>{
 const {extractSearchText}=await import('./search-content-extractor.mjs');
 const curated=JSON.parse(readFileSync(new URL('../content/search-index-46.json',import.meta.url),'utf8'));
 const slugs=['medical-history','medical-safety-guide','previsit-checklist',
  'blood-thinners-dental','osteoporosis-medication-dental','diabetes-dental-care',
  'heart-disease-dental-care','pregnancy-dental-care','noncovered-fees',
  'medication-dental-faq','systemic-disease-dental-faq'];
 const additional=slugs.map(slug=>{
  const html=readFileSync(new URL('../'+slug+'.html',import.meta.url),'utf8');
  return {
   url:'/'+slug+'.html',
   title:html.match(/<title>([^<]+)<\/title>/i)?.[1]||'',
   description:html.match(/<meta name="description" content="([^"]+)"/i)?.[1]||'',
   body:extractSearchText(html)
  };
 });
 for(const [query,expected] of [
  ['혈액희석제','/blood-thinners-dental.html'],
  ['골다공증 약','/osteoporosis-medication-dental.html'],
  ['당뇨병','/diabetes-dental-care.html'],
  ['임신 중 치과치료','/pregnancy-dental-care.html'],
  ['비급여 진료비','/noncovered-fees.html'],
  ['치과 방문 전 체크리스트','/previsit-checklist.html'],
  ['복용약','/medical-history.html']
 ]){
  const {results}=await search(query,[...curated,...additional]);
  const topFive=walk(results,x=>x.className==='result').slice(0,5).map(x=>x.href);
  assert.ok(topFive.includes(expected),query+' should find its existing patient resource: '+JSON.stringify(topFive));
 }
 const {results}=await search('혈액희석제',[...curated,...additional]);
 const target=walk(results,x=>x.className==='result').find(x=>x.href==='/blood-thinners-dental.html');
 assert.equal(target?.children[0]?.dataset?.category,'medical','medication advice needs a medical information label');
});


test('rendered result paths match public canonical URLs, while previews retain HTML',async()=>{
 const page={url:'/health/gum-bleeding.html',title:'잇몸 출혈',description:'잇몸 출혈 환자 안내',body:'잇몸 출혈 검진 안내'};
 for(const [hostname,expected] of [
  ['ejoeundental.com','/health/gum-bleeding'],
  ['www.ejoeundental.com','https://ejoeundental.com/health/gum-bleeding'],
  ['ejoeundental.pages.dev','/health/gum-bleeding.html']
 ]){
  const {results}=await search('잇몸 출혈',[page],{hostname});
  const result=walk(results,node=>node.className==='result')[0];
  assert.equal(result.href,expected,hostname+' should avoid unwanted redirection');
  assert.equal(result.children.find(node=>node.tagName==='small')?.textContent,expected);
  const nextLinks=walk(results,node=>node.tagName==='a'&&node!==result&&node.href);
  assert.ok(nextLinks.some(node=>node.href===expected.replace(/health\/gum-bleeding(?:\.html)?$/,'gum-treatment'+(hostname.endsWith('.pages.dev')?'.html':''))),
   hostname+' health result should link to matching treatment under final URL');
 }
});

test('show the relevant article passage for body-only matches without HTML injection',async()=>{
 const entry={
  url:'/health/periodontal-pocket.html',
  title:'잇몸 건강검진 정보',
  description:'치과에서 확인하는 잇몸 상태에 관한 일반적인 안내.',
  body:'잇몸 건강은 상태에 따라 확인합니다. 치주낭이 깊으면 잇몸 아래 치석과 염증 상태를 확인할 수 있습니다. 치료 여부는 진찰 결과에 따라 결정됩니다.'
 };
 const {results}=await search('치주낭',[entry]);
 const result=walk(results,node=>node.className==='result')[0];
 const excerpt=result.children.find(x=>x.tagName==='p')?.textContent||'';
 assert.match(excerpt,/본문 관련 내용:.*치주낭/);
 assert.ok(excerpt.length<165,'matched passage should be concise');
 assert.ok(!excerpt.includes('<script>'),'excerpts must stay plain text');
 const withRelevantDescription={...entry,description:'치주낭의 의미와 확인 방법'};
 const second=(await search('치주낭',[withRelevantDescription])).results;
 const summary=walk(second,node=>node.className==='result')[0].children.find(x=>x.tagName==='p')?.textContent;
 assert.equal(summary,'치주낭의 의미와 확인 방법','retain relevant editor-authored descriptions');
});
