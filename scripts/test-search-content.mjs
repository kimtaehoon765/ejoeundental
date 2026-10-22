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
  // Additional build stages append patient guidance after indexing; the indexed opening clinical content must still agree.
  const pageText=extractSearchText(page);
  assert.ok(result.body.startsWith(pageText.slice(0,900)),url+' lost its original clinical text');
  assert.ok(result.body.length>=900,url+' is unexpectedly short');
 }
});


test('all public sitemap pages have one searchable entry, including patient safety and FAQs',()=>{
 const content=new URL('../dist/content/search-index.json',import.meta.url);
 const sitemapFile=new URL('../dist/sitemap.xml',import.meta.url);
 assert.ok(existsSync(content)&&existsSync(sitemapFile),'generated website must be built before this test');
 const entries=JSON.parse(readFileSync(content,'utf8'));
 const sitemap=readFileSync(sitemapFile,'utf8');
 const publishedPaths=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map(m=>new URL(m[1]).pathname.replace(/\.html$/,''));
 const indexedPaths=entries.map(x=>x.url.replace(/\.html$/,''));
 assert.equal(new Set(indexedPaths).size,indexedPaths.length,'search index must not duplicate pages');
 assert.deepEqual([...indexedPaths].sort(),[...publishedPaths].sort(),
  'every public sitemap page should be searchable, with no extra/private pages');
 assert.ok(!entries.some(x=>/\/(?:admin|dental-equipment|dental-materials|equipment-log)/.test(x.url)),
  'search should not expose the owner-only resources or admin');
});

test('all 19 previously omitted FAQ, safety and visit resources contain real searchable text',()=>{
 const entries=JSON.parse(readFileSync(new URL('../dist/content/search-index.json',import.meta.url),'utf8'));
 const slugs=[
  'visit-guide','medical-safety-guide','previsit-checklist',
  'gum-treatment-faq','root-canal-retreatment-faq','dental-insurance-faq',
  'medical-history','osteoporosis-medication-dental','blood-thinners-dental',
  'diabetes-dental-care','heart-disease-dental-care','kidney-disease-dental-care',
  'liver-disease-dental-care','cancer-immunosuppression-dental-care',
  'pregnancy-dental-care','noncovered-fees','medication-dental-faq',
  'systemic-disease-dental-faq','clinical-archive'
 ];
 for(const slug of slugs){
  const source=readFileSync(new URL('../'+slug+'.html',import.meta.url),'utf8');
  const row=entries.filter(p=>p.url==='/'+slug+'.html');
  assert.equal(row.length,1,slug+' should be indexed exactly once');
  const title=source.match(/<title>([^<]+)<\/title>/)?.[1];
  const description=source.match(/<meta\s+name="description"\s+content="([^"]+)"/)?.[1];
  assert.equal(row[0].title,title,slug+' should use its actual search title');
  assert.equal(row[0].description,description,slug+' should use its actual meta description');
  assert.ok(row[0].body.length>100,slug+' should include useful article text');
  assert.ok(row[0].body.startsWith(extractSearchText(source).slice(0,130)),
   slug+' search text should come from the real main content, not menus');
  assert.ok(row[0].body.length<=24000,slug+' should not inflate the index');
 }
});
