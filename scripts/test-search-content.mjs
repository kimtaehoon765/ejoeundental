import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {extractSearchText} from './search-content-extractor.mjs';

test('search text excludes global navigation, contact controls, scripts and footer',()=>{
 const html='<header>임플란트 무료 광고</header><main><nav>임플란트 스케일링 잇몸치료</nav><h1>재신경치료 원인</h1><p>근관치료 후 통증의 다양한 원인을 검사합니다.</p><form><button>임플란트</button></form><script>const keyword="가짜 검색어";</script></main><footer>잇몸치료 할인</footer>';
 const body=extractSearchText(html);
 assert.match(body,/재신경치료 원인/);
 assert.match(body,/근관치료 후 통증/);
 for(const unused of ['임플란트','스케일링','잇몸치료 할인','가짜 검색어']){
  assert.ok(!body.includes(unused),'shared UI should be excluded: '+unused);
 }
});

test('real health and treatment articles retain substantive clinical headings',()=>{
 for(const [file,expected] of [
  ['health/gum-bleeding.html','잇몸에서 피가 나요'],
  ['health/root-canal-after-pain.html','신경치료 후에도 아플 수 있나요'],
  ['gum-treatment.html','치주낭'],
  ['retreatment.html','재신경치료'],
  ['scaling.html','스케일링']
 ]){
  const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  const body=extractSearchText(html);
  assert.ok(body.length>100,file+' has unexpectedly short content');
  assert.ok(body.includes(expected),file+' lost important article text');
  assert.ok(body.length<=24000,file+' text exceeds index limit');
 }
});

test('generated search entries use extracted main text instead of shared header text',()=>{
 const indexFile=new URL('../dist/content/search-index.json',import.meta.url);
 if(!existsSync(indexFile))return;
 const data=JSON.parse(readFileSync(indexFile,'utf8'));
 for(const slug of ['gum-treatment','retreatment','cervical-abrasion','insured-care']){
  const url='/'+slug+'.html';
  const page=readFileSync(new URL('../dist/'+slug+'.html',import.meta.url),'utf8');
  const result=data.find(row=>row.url===url);
  assert.ok(result,'missing search entry '+url);
  assert.equal(result.body,extractSearchText(page),url+' has a stale index body');
 }
});
