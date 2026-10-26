import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {bookingAction} from './naver-booking-link.mjs';

const script=readFileSync(new URL('../assets/search.js',import.meta.url),'utf8');

class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.handlers={};this.attrs={};}
  append(...children){for(const child of children){if(child&&typeof child==='object')child.parent=this;this.children.push(child);}}
  replaceChildren(...children){for(const child of this.children)if(child&&typeof child==='object')child.parent=null;this.children=[];this.append(...children);}
  insertBefore(child,before){const i=this.children.indexOf(before);if(i<0)throw Error('Reference child not found');this.children.splice(i,0,child);child.parent=this;}
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
async function search(q,pages,{fail=false,hostname='ejoeundental.pages.dev',booking=bookingAction('')}={}){
 const input=new Element('input');
 const status=new Element('p');
 const results=new Element('section');
 results.dataset.bookingUrl=booking.url;
 results.dataset.bookingLabel=booking.label;
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


test('no-space regional searches find the actual clinic treatment pages',async()=>{
 const builtIndex=new URL('../dist/content/search-index.json',import.meta.url);
 const index=JSON.parse(readFileSync(existsSync(builtIndex)?builtIndex:new URL('../content/search-index-46.json',import.meta.url),'utf8'));
 const cases=[
  ['인천신경치료','/root-canal-health.html'],
  ['부평신경치료','/root-canal-health.html'],
  ['산곡역신경치료','/root-canal-health.html'],
  ['인천잇몸치료','/gum-treatment.html'],
  ['부평잇몸치료','/gum-treatment.html'],
  ['산곡동잇몸치료','/gum-treatment.html'],
  ['산곡역재신경치료','/retreatment.html'],
  ['부평구청역신경치료','/root-canal-health.html'],
  ['인천치경부마모증','/cervical-abrasion.html']
 ];
 for(const [query,expected] of cases){
  const {results,status}=await search(query,index);
  const ranked=walk(results,x=>x.className==='result').slice(0,5).map(x=>x.href);
  assert.ok(ranked.includes(expected),query+' must find the matching clinical guide; found '+JSON.stringify(ranked));
  assert.ok(!/불러오지 못했습니다/.test(status.textContent),query+' should not trigger a search error');
 }
});

test('local clinic discovery without a symptom shows verified visit details instead of unrelated treatments',async()=>{
 const builtIndex=new URL('../dist/content/search-index.json',import.meta.url);
 const index=JSON.parse(readFileSync(existsSync(builtIndex)?builtIndex:new URL('../content/search-index-46.json',import.meta.url),'utf8'));
 for(const query of ['부평치과','청천동치과','산곡역 치과']){
  const {results}=await search(query,index);
  const visits=walk(results,x=>x.className==='search-visit-answer');
  assert.equal(visits.length,1,query+' should show one useful clinic visit panel');
  assert.ok(walk(visits[0],x=>String(x.textContent||'').includes('세월천로 34')).length,query+' needs the real clinic address');
  assert.ok(walk(visits[0],x=>x.href==='tel:0325132875').length,query+' needs a one-tap phone link');
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


test('patients can filter mixed results by health, treatment and medication type',async()=>{
 const pages=[
  ...makeEntries(15,'잇몸'),
  {url:'/gum-treatment.html',title:'잇몸치료 안내',description:'잇몸치료 상담',body:'잇몸 상태 검사'},
  {url:'/retreatment.html',title:'잇몸 관련 진료 안내',description:'잇몸 정보',body:'잇몸 설명'},
  {url:'/medical-history.html',title:'잇몸치료 전 복용약 확인',description:'잇몸 진료시 복용약',body:'잇몸 상태'},
  {url:'/blood-thinners-dental.html',title:'잇몸 출혈 시 혈액희석제',description:'잇몸 출혈',body:'잇몸 상태'},
  {url:'/stories/gum-tips/',title:'잇몸 건강 이야기',description:'잇몸 관리',body:'잇몸 건강'}
 ];
 const {results,status}=await search('잇몸',pages);
 const buttons=walk(results,x=>x.className==='search-category-filter');
 assert.ok(buttons.length>=4,'mixed result types should offer category filters');
 const byText=snippet=>buttons.find(b=>b.textContent.includes(snippet));
 const health=byText('치과 건강정보');
 const medical=byText('복용약·전신질환');
 const all=byText('전체');
 assert.ok(health&&medical&&all);
 assert.equal(all.attrs['aria-pressed'],'true');
 health.handlers.click();
 assert.equal(health.attrs['aria-pressed'],'true');
 assert.equal(all.attrs['aria-pressed'],'false');
 const healthResults=walk(results,x=>x.className==='result');
 assert.equal(healthResults.length,15);
 assert.ok(healthResults.every(x=>x.href.startsWith('/health/')));
 assert.match(status.textContent,/치과 건강정보 15개/);
 medical.handlers.click();
 const medicalResults=walk(results,x=>x.className==='result');
 assert.equal(medicalResults.length,2);
 assert.ok(medicalResults.every(x=>x.href.includes('medical-history')||x.href.includes('blood-thinners')));
 assert.equal(walk(results,x=>x.className==='search-show-more').length,0);
 all.handlers.click();
 assert.equal(walk(results,x=>x.className==='result').length,20);
 assert.equal(walk(results,x=>x.className==='search-show-more').length,0);
});
test('filtered long search result lists still expand in batches, without duplicates',async()=>{
 const pages=[
  ...Array.from({length:44},(_,i)=>({url:'/health/periodontal-'+(i+1)+'.html',title:'잇몸 건강 '+(i+1),description:'잇몸 상태',body:'잇몸 진료'})),
  {url:'/gum-treatment.html',title:'잇몸 진료 안내',description:'잇몸치료',body:'잇몸'},
  {url:'/medical-history.html',title:'잇몸 진료 복용약 안내',description:'잇몸 약',body:'잇몸'}
 ];
 const {results}=await search('잇몸',pages);
 const buttons=walk(results,x=>x.className==='search-category-filter');
 const health=buttons.find(x=>x.textContent.includes('치과 건강정보'));
 assert.ok(health);
 health.handlers.click();
 let shown=walk(results,x=>x.className==='result');
 assert.equal(shown.length,20);
 let more=walk(results,x=>x.className==='search-show-more')[0];
 assert.ok(more);
 more.handlers.click();
 assert.equal(walk(results,x=>x.className==='result').length,40);
 more.handlers.click();
 shown=walk(results,x=>x.className==='result');
 assert.equal(shown.length,44);
 assert.equal(new Set(shown.map(x=>x.href)).size,44);
 assert.equal(walk(results,x=>x.className==='search-show-more').length,0);
 buttons.find(x=>x.textContent.includes('전체')).handlers.click();
 assert.equal(walk(results,x=>x.className==='result').length,20);
 assert.ok(walk(results,x=>x.className==='search-show-more')[0]);
});
test('small or single-category searches do not add unnecessary filter controls',async()=>{
 for(const pages of [
  makeEntries(3,'잇몸'),
  makeEntries(27,'잇몸')
 ]){
  const {results}=await search('잇몸',pages);
  assert.equal(walk(results,x=>x.className==='search-category-filter').length,0);
 }
});


test('professional equipment queries route to separate public reference guides without contaminating search matches',async()=>{
 const guideCases=[
  ['핸드피스','/handpiece-maintenance.html'],
  ['멸균기','/autoclave-maintenance.html'],
  ['석션','/suction-maintenance.html'],
  ['컴프레서','/compressor-maintenance.html'],
  ['인상재','/impression-materials-guide.html']
 ];
 for(const [query,wanted] of guideCases){
  const {results,status}=await search(query,[]);
  const panels=walk(results,x=>x.className==='search-expert-direct-links');
  assert.equal(panels.length,1,query+' needs a prominent expert-only route');
  const direct=walk(panels[0],x=>x.tagName==='a').map(x=>x.href);
  assert.deepEqual(direct,[wanted,'/dental-equipment.html','/dental-materials.html'],
    query+' should show the matching expert guide and both reference indexes');
  assert.ok(status.textContent.includes('별도 전문가 참고자료'),query+' must explain why the patient index is empty');
  assert.equal(walk(results,x=>x.className==='result').length,0,'professional pages must not be added to the public index');
  const allResourceLinks=walk(results,x=>x.tagName==='a'&&x.href).map(x=>x.href);
  assert.equal(allResourceLinks.length,3,query+' must not repeat the same reference links below the results');
  assert.equal(new Set(allResourceLinks).size,3,query+' must not create duplicate expert shortcuts');

 }
 const medical=await search('혈액희석제',[{url:'/blood-thinners-dental.html',title:'혈액희석제',description:'혈액희석제 복용 안내',body:'항응고제'}]);
 assert.equal(walk(medical.results,x=>x.className==='search-expert-direct-links').length,0,
  'medical searches must not be mistaken for equipment-reference searches');
});

test('the expert reference shortcut does not duplicate maintenance documents in the public search index',()=>{
 const publishedIndex=new URL('../dist/content/search-index.json',import.meta.url);
 const fallbackIndex=new URL('../content/search-index-46.json',import.meta.url);
 const entries=JSON.parse(readFileSync(existsSync(publishedIndex)?publishedIndex:fallbackIndex,'utf8'));
 for(const path of ['/handpiece-maintenance.html','/autoclave-maintenance.html','/suction-maintenance.html','/dental-equipment.html']){
  assert.ok(!entries.some(e=>e.url===path),path+' should remain excluded from patient search');
 }
});

test('real patient extraction questions find tooth-saving guidance without needing dental terminology',async()=>{
 const indexFile=new URL('../dist/content/search-index.json',import.meta.url);
 const fallback=new URL('../content/search-index-46.json',import.meta.url);
 const pages=JSON.parse(readFileSync(existsSync(indexFile)?indexFile:fallback,'utf8'));
 // The quality gate runs search tests before the build. In that stage index
 // the real authored page content as a fixture, not an invented keyword card.
 if(!pages.some(page=>page.url==='/tooth-preservation.html')){
  const {extractSearchText}=await import('./search-content-extractor.mjs');
  const page=readFileSync(new URL('../tooth-preservation.html',import.meta.url),'utf8');
  pages.push({
   url:'/tooth-preservation.html',
   title:page.match(/<title>([^<]+)<\/title>/)?.[1]||'',
   description:page.match(/<meta name="description" content="([^"]+)"/)?.[1]||'',
   body:extractSearchText(page)
  });
 }
 assert.ok(pages.some(page=>page.url==='/tooth-preservation.html'));
 for(const query of [
  '치아를 뽑으라고 하는데',
  '치아를 살릴 수 있나요',
  '이를 빼야 하나요',
  '신경치료한 치아를 뽑아야 하나요',
  '임플란트 하기 전에',
  '부평 치아를 뽑으라고 하는데'
 ]){
  const {results,status}=await search(query,pages);
  const ordered=walk(results,x=>x.className==='result').slice(0,5).map(x=>x.href);
  assert.equal(ordered[0],'/tooth-preservation.html',
   query+' should surface the verified main preservation care page first: '+ordered.join(', '));
  assert.ok(!/불러오지 못했습니다/.test(status.textContent));
 }
});

test('extraction aftercare and wisdom-tooth questions do not trigger tooth-saving replacement terms',async()=>{
 const pages=[
  {url:'/tooth-preservation.html',title:'자연치아 보존 발치 전',description:'치아 발치 전',body:'자연치아 보존'},
  {url:'/wisdom-tooth.html',title:'사랑니 발치',description:'사랑니를 뽑을 때 검사',body:'사랑니 빼야 하나요'},
  {url:'/health/insurance-extraction.html',title:'발치 후 주의사항',description:'발치 후 통증',body:'발치 후 관리'},
 ];
 const after=await search('발치 후 통증',pages);
 const afterLinks=walk(after.results,x=>x.className==='result').map(x=>x.href);
 assert.notEqual(afterLinks[0],'/tooth-preservation.html',
  'post-extraction care must rank ahead of the separate tooth-saving decision guide');
 const wisdom=await search('사랑니 빼야 하나요',pages);
 const wisdomLinks=walk(wisdom.results,x=>x.className==='result').map(x=>x.href);
 assert.notEqual(wisdomLinks[0],'/tooth-preservation.html',
  'wisdom-tooth surgery needs its own clinical guidance as the leading result');
});


test('regional gum-bump and blister descriptions reach careful examination guidance',async()=>{
 const indexFile=new URL('../dist/content/search-index.json',import.meta.url);
 const fallback=new URL('../content/search-index-46.json',import.meta.url);
 const pages=JSON.parse(readFileSync(existsSync(indexFile)?indexFile:fallback,'utf8'));
 const queries=[
  '잇몸에 뾰루지',
  '잇몸에 뾰루지가 났어요',
  '잇몸에 물집',
  '잇몸에 물집이 있어요',
  '인천 부평 잇몸 뾰루지',
  '청천동 잇몸에 물집',
  '잇몸에 고름주머니'
 ];
 for(const query of queries){
  const {results,status}=await search(query,pages);
  const top=walk(results,x=>x.className==='result').slice(0,5).map(x=>x.href);
  assert.equal(top[0],'/health/gum-pus.html',
   query+' should first show causes and a clinical examination, not one presumed treatment: '+top);
  assert.ok(!/불러오지 못했습니다/.test(status.textContent));
 }
 const dentalRoot=(await search('신경치료 후 잇몸 뾰루지',pages)).results;
 const related=walk(dentalRoot,x=>x.className==='result').slice(0,10).map(x=>x.href);
 assert.ok(related.includes('/health/gum-pus.html'),
  'a bump after root canal treatment should still offer periodontal versus root-tip evaluation');

 const guide=readFileSync(existsSync('dist/health/gum-pus.html')?'dist/health/gum-pus.html':new URL('../health/gum-pus.html',import.meta.url),'utf8');
 assert.ok(guide.includes('뾰루지나 물집처럼 보이는 돌기'));
 assert.ok(guide.includes('모두 치주염이나 고름이라고 단정할 수는 없습니다'));
 assert.ok(guide.includes('구강 점막 병변'));
 assert.ok(guide.includes('신경치료한 치아'));
 assert.ok(guide.includes('삼키기')&&guide.includes('호흡'));
 const searchHtml=readFileSync(existsSync('dist/search.html')?'dist/search.html':new URL('../search.html',import.meta.url),'utf8');
 const encoded=encodeURIComponent('잇몸에 뾰루지가 났어요');
 assert.ok(searchHtml.includes('href="/search.html?q='+encoded+'"'));
 assert.ok(searchHtml.includes('잇몸에 뾰루지가 생겼어요'));
});


test('booking requests show an honest verified Naver search option plus telephone without claiming a confirmed appointment',async()=>{
 const pages=[];
 const safeAction=bookingAction('');
 for(const query of ['예약','이조은치과 예약','이-조은치과의원 예약','부평치과 예약','청천동 치과 예약','네이버 예약']){
  const {results,status}=await search(query,pages);
  const cards=walk(results,x=>x.className==='search-visit-answer');
  assert.equal(cards.length,1,query+' should show the clinic visit and booking card');
  assert.equal(walk(results,x=>x.className==='result').length,0);
  const action=walk(cards[0],x=>x.href===safeAction.url);
  assert.equal(action.length,1,query+' must show the actual Naver search fallback exactly once');
  assert.equal(action[0].textContent,safeAction.label);
  assert.equal(action[0].target,'_blank');
  assert.equal(action[0].rel,'noopener noreferrer');
  assert.ok(walk(cards[0],x=>x.href==='tel:0325132875').length,
   'telephone booking fallback must always work');
  assert.match(status.textContent,/예약 문의 방법/);
  assert.ok(walk(results,x=>String(x.textContent||'').includes('예약 확정을 의미하지 않습니다')).length);
 }
});

test('verified official booking configuration becomes a direct booking link only when provided',async()=>{
 const direct=bookingAction('https://booking.naver.com/booking/13/bizes/12345?theme=place');
 const {results}=await search('청천동치과 예약',[],{booking:direct});
 const actions=walk(results,x=>x.href===direct.url);
 assert.equal(actions.length,1);
 assert.match(actions[0].textContent,/네이버 예약하기/);
 assert.match(actions[0].attrs['aria-label'],/네이버 새 창/);
 const withoutBooking=(await search('청천동치과 잇몸치료',[],{booking:direct})).results;
 assert.equal(walk(withoutBooking,x=>x.href===direct.url).length,0,
  'non-booking treatment searches should not get an extra reservation button');
});

test('built search page embeds the same vetted Naver destination and label as the mobile homepage',()=>{
 if(!existsSync('dist/search.html'))return;
 const html=readFileSync('dist/search.html','utf8');
 const config=JSON.parse(readFileSync('content/site.json','utf8'));
 const booking=bookingAction(config.naver_booking_url);
 const escaped=value=>value.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
 assert.ok(html.includes('data-booking-url="'+escaped(booking.url)+'"'));
 assert.ok(html.includes('data-booking-label="'+escaped(booking.label)+'"'));
 assert.match(readFileSync('dist/assets/search-page.css','utf8'),
  /\.search-visit-actions-with-booking\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/);
});


test('clinic schedule questions expose alternating Friday and Saturday hours, cutoffs and holiday closure',async()=>{
 for(const query of [
  '금요일 진료','토요일 진료','공휴일 진료시간','접수 마감','점심시간',
  '오늘 진료시간','이번 주 토요일 진료하나요','청천동치과 진료시간',
  '산곡역 치과 토요일'
 ]){
  const {results,status}=await search(query,[]);
  const visits=walk(results,x=>x.className==='search-visit-answer');
  assert.equal(visits.length,1,query+' must show one honest clinic schedule panel');
  const paragraphs=walk(visits[0],x=>x.tagName==='p').map(x=>x.textContent).join(' | ');
  for(const text of ['월~목 09:30~18:30','금요일 격주','토요일 격주',
   '09:30~13:00','13:00~14:00','오전 12:30','오후 18:00','공휴일 휴진',
   '3시간 무료','방문 전 전화로 확인']){
   assert.ok(paragraphs.includes(text),query+' missing verified schedule detail: '+text);
  }
  assert.ok(walk(visits[0],x=>x.href==='tel:0325132875').length,
   query+' should allow a one-tap hours confirmation');
  assert.equal(walk(results,x=>x.className==='result').length,0);
  assert.match(status.textContent,/진료시간과 접수 마감 안내/);
 }
 const html=readFileSync(existsSync('dist/search.html')?'dist/search.html':new URL('../search.html',import.meta.url),'utf8');
 for(const [query,label] of [
  ['금요일 진료','금요일 진료'],
  ['토요일 진료','토요일 진료'],
  ['접수 마감','접수 마감']
 ]){
  assert.ok(html.includes('href="/search.html?q='+encodeURIComponent(query)+'">'+label+'</a>'),
   'visit search must expose a one-tap shortcut for '+label);
 }
});

test('treatment questions mentioning opening days keep clinical results visible',async()=>{
 const pages=[
  {url:'/wisdom-tooth.html',title:'토요일 사랑니 발치 상담',description:'사랑니 발치 진료',body:'발치 전 검사'},
  {url:'/health/gum-bleeding.html',title:'잇몸에서 피가 나요',description:'치주질환 설명',body:'잇몸 출혈 검사'}
 ];
 const query='토요일 사랑니 발치';
 const {results}=await search(query,pages);
 const found=walk(results,x=>x.className==='result');
 assert.ok(found.some(x=>x.href==='/wisdom-tooth.html'),
  'opening-hour queries with specific treatment should not suppress relevant medical results');
});


test('every visible suggested patient search reaches a real article, visit answer or separate expert guide',async()=>{
 const indexPath='dist/content/search-index.json';
 if(!existsSync(indexPath))return; // Only the production build holds the complete public search collection.
 const pages=JSON.parse(readFileSync(indexPath,'utf8'));
 const html=readFileSync('dist/search.html','utf8');
 const all=[...html.matchAll(/href="\/search(?:\.html)?\?q=([^"]+)"/g)];
 assert.ok(all.length>=25,'search landing page should have a meaningful collection of suggested queries');
 const unique=[...new Set(all.map(match=>decodeURIComponent(match[1].replace(/&amp;/g,'&')).replace(/\+/g,' ')))];
 const failures=[];
 for(const query of unique){
  const {results,status}=await search(query,pages,{hostname:'ejoeundental.com'});
  const resultLinks=walk(results,node=>node.className==='result');
  const contact=walk(results,node=>node.className==='search-visit-answer');
  const expert=walk(results,node=>node.className==='search-expert-direct-links');
  if(resultLinks.length===0&&contact.length===0&&expert.length===0){
   failures.push(query+' => '+String(status.textContent));
  }
 }
 assert.deepEqual(failures,[],'every search-chip route must be useful, not an empty search page');
});


test('touch-screen query shortcuts have 44px+ target height and preserve keyboard focus',()=>{
 if(!existsSync('dist/assets/search-page.css'))return;
 const css=readFileSync('dist/assets/search-page.css','utf8');
 const suggest=css.match(/\.search-suggestions a\{([^}]+)\}/)?.[1]||'';
 assert.match(suggest,/display:inline-flex/);
 assert.match(suggest,/min-height:44px/);
 assert.match(suggest,/box-sizing:border-box/);
 assert.match(css,/\.search-suggestions a:focus-visible\{outline:3px/);
 assert.match(css,/@media\(max-width:600px\)\{[\s\S]*?\.search-suggestions a\{min-height:48px/);
 const html=readFileSync('dist/search.html','utf8');
 assert.match(html,/<link rel="stylesheet" href="\/assets\/search-page\.css\?v=[a-f0-9]{12}"/);
});


test('bad-breath symptom queries lead to measured oral and periodontal causes rather than a guaranteed gum diagnosis',async()=>{
 const page=readFileSync(new URL('../health/gum-bleeding.html',import.meta.url),'utf8');
 const title=page.match(/<title>([^<]+)<\/title>/)?.[1];
 const description=page.match(/<meta name="description" content="([^"]+)"/)?.[1];
 const medical=page.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
 const fixture=[
  {url:'/health/gum-bleeding.html',title,description,body:medical},
  {url:'/gum-treatment.html',title:'잇몸치료 진료 안내',description:'잇몸치료의 원리',body:'잇몸 출혈 치석 원인과 진단'},
  {url:'/health/swollen-gums.html',title:'잇몸이 붓고 아픈 이유',description:'잇몸 부기 진료',body:'구취 원인은 여러 가지입니다.'},
  {url:'/stories/halitosis-example/',title:'구취에 대한 일반적인 고민',description:'입냄새를 알아봅니다',body:'입냄새 설명'}
 ];
 for(const query of [
  '입냄새','입냄새가 나요','구취','입에서 냄새가 나요',
  '청천동 입냄새','부평 구취','산곡동 입냄새','잇몸 피 입냄새'
 ]){
  const {results}=await search(query,fixture);
  const first=walk(results,node=>node.className==='result')[0]?.href;
  assert.equal(first,'/health/gum-bleeding.html',query+' should lead to a guide explaining multiple causes');
 }
 assert.match(page,/입냄새만으로 치주염이라고 진단할 수는 없습니다/);
 assert.match(page,/혀의 설태/);
 assert.match(page,/구강건조/);
});

test('production search index includes original bad-breath education when built',async()=>{
 if(!existsSync('dist/content/search-index.json'))return;
 const pages=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 const guide=pages.find(p=>p.url==='/health/gum-bleeding.html');
 assert.ok(guide);
 assert.ok(guide.body.includes('입냄새만으로 치주염이라고 진단할 수는 없습니다'));
 const {results}=await search('청천동 입냄새',pages);
 const topFive=walk(results,node=>node.className==='result').slice(0,5).map(p=>p.href);
 assert.ok(topFive.includes('/health/gum-bleeding.html'));
});


test('patient queries about failed GI restoration and resin insurance link to cautious material guidance',async()=>{
 const html=readFileSync(new URL('../health/insurance-cervical.html',import.meta.url),'utf8');
 const guide={
  url:'/health/insurance-cervical.html',
  title:html.match(/<title>([^<]+)<\/title>/)?.[1],
  description:html.match(/<meta name="description" content="([^"]+)"/)?.[1],
  body:html.replace(/<[^>]+>/g,' ')
 };
 const pages=[
  {url:'/cervical-abrasion.html',title:'치경부마모증 GI 수복',description:'GI 재료와 치료 방법',body:'치아 결손을 검사합니다.'},
  {url:'/insured-care.html',title:'치과 건강보험 진료',description:'건강보험 급여 상담',body:'진단에 따른 보험 진료'},
  guide,
  {url:'/health/abrasion-sensitive.html',title:'찬물에 이가 시린 이유',description:'시린 이 치료',body:'치경부 결손'}
 ];
 for(const query of [
  'GI 수복물이 떨어졌어요','GI 떨어졌어요','지아이 떨어졌어요',
  '부평 GI 수복 떨어짐','레진 GI 보험 차이','인천 레진 GI 보험 차이','GI 레진 보험'
 ]){
  const {results}=await search(query,pages);
  const ranked=walk(results,node=>node.className==='result').slice(0,3).map(node=>node.href);
  assert.equal(ranked[0],guide.url,
   query+' should prioritize the factual GI restoration insurance guidance; got '+JSON.stringify(ranked));
 }
 assert.match(html,/무조건 무료 재치료나 보험 적용을 약속할 수는 없습니다/);
});


test('retreatment cost and existing crown insurance queries prioritize itemized dental coverage guidance',async()=>{
 const html=readFileSync(new URL('../health/insurance-root-canal.html',import.meta.url),'utf8');
 const guide={
  url:'/health/insurance-root-canal.html',
  title:html.match(/<title>([^<]+)<\/title>/)?.[1],
  description:html.match(/<meta name="description" content="([^"]+)"/)?.[1],
  body:html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')
 };
 const pages=[
  {url:'/retreatment.html',title:'인천·부평 재신경치료',description:'근관 치료 이후 통증과 치료 방법',body:'기존 크라운 보철물을 진찰합니다.'},
  {url:'/root-canal-health.html',title:'인천 신경치료 건강정보',description:'근관치료 안내',body:'재신경치료 보험과 크라운 진료 정보'},
  {url:'/health/root-canal-retreatment.html',title:'재신경치료 필요한 경우',description:'치아 보존 가능성',body:'크라운이 있는 경우'},
  guide,
  {url:'/insured-care.html',title:'건강보험 치과진료',description:'치과 급여 진료',body:'재신경치료 보험 가능성'}
 ];
 for(const query of [
  '재신경치료 보험','재신경치료 비용','재신경치료 크라운 비용',
  '인천 재신경치료 보험','부평 신경치료 크라운 교체 비용',
  '크라운 재신경치료 보험','기존 크라운 재사용',
  '크라운 씌운 이 재신경치료'
 ]){
  const {results}=await search(query,pages);
  const found=walk(results,node=>node.className==='result').slice(0,5).map(x=>x.href);
  assert.ok(found.includes(guide.url),
   query+' must find factual costs and coverage explanations: '+JSON.stringify(found));
 }
 const specific=await search('부평 재신경치료 보험',pages);
 assert.equal(walk(specific.results,node=>node.className==='result')[0]?.href,guide.url,
  'insurance-specific question should lead to the careful cost/benefits guide first');
 assert.match(html,/모든 재신경치료에 크라운 교체가 필요한 것도 아니고/);
});
