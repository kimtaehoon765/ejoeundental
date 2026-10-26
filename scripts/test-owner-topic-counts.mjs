import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Compare the real build output, not a manually maintained article total.
const archive=readFileSync('dist/clinical-archive.html','utf8');
const careRoutes={
 gum:{file:'gum-treatment.html',text:'잇몸치료',marker:'BUILD_OWNER_GUM_COUNT'},
 root:{file:'retreatment.html',text:'신경치료',marker:'BUILD_OWNER_ROOT_COUNT'}
};
for(const [topic,care] of Object.entries(careRoutes)){
 test(topic+' original Naver post count exactly matches the archive category',()=>{
  const section=archive.split('<details class="archive-blog-group" id="archive-group-'+topic+'"')[1]
   ?.split('</details>')[0]||'';
  assert.ok(section,'topic '+topic+' must be an actual categorized group');
  const grouped=Number(section.match(/class="archive-blog-count">(\\d+)편<\\/span>/)?.[1]);
  assert.ok(Number.isInteger(grouped)&&grouped>0,'archive group count missing');
  const actualLinks=(section.match(/<li><a href="https:\/\/blog\.naver\.com\//g)||[]).length;
  assert.equal(grouped,actualLinks,'the classified Naver originals count must match actual links');
  const html=readFileSync('dist/'+care.file,'utf8');
  const actual=html.split('href="/clinical-archive.html#archive-group-'+topic+'"')[1]?.match(
   new RegExp('원장의 '+care.text+' 글 (\\d+)편 보기')
  )?.[1];
  assert.equal(Number(actual),grouped,'published care guide should never show an outdated number');
  assert.ok(!html.includes(care.marker),'build placeholders should never be visible to patients');
  assert.ok(html.includes('부평구')&&html.includes('0325132875'));
 });
}
test('the modest Bucheon phrase remains in the gum page only, not site-wide SEO metadata',()=>{
 const gum=readFileSync('dist/gum-treatment.html','utf8');
 const home=readFileSync('dist/index.html','utf8');
 assert.equal((gum.match(/부천잇몸치료/g)||[]).length,1);
 assert.ok(gum.includes('실제 진료 장소는 인천 부평구 청천동'));
 assert.ok(!gum.slice(0,gum.indexOf('</head>')).includes('부천잇몸치료'));
 assert.ok(!home.slice(0,home.indexOf('</head>')).includes('부천잇몸치료'));
});
