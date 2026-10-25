import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {analyzePublishedStories} from './audit-story-uniqueness.mjs';
const phrase='치근 상태와 잇몸조직의 건강을 함께 살펴본 뒤 치료 여부와 유지 관리를 결정합니다. ';
const record=(slug,body,source_url='')=>({slug,published:true,title:slug,body,source_url});

test('identical published medical prose is rejected even if punctuation and whitespace vary',()=>{
 const a=phrase.repeat(12);
 const b=a.replaceAll(' ', '\n  ').replaceAll('치근', '치근');
 const result=analyzePublishedStories([record('first',a),record('second',b)]);
 assert.ok(result.duplicates.some(x=>x.reason==='same article body'));
});
test('the same verified original blog link is not published twice',()=>{
 const result=analyzePublishedStories([
  record('a',phrase.repeat(6),'https://blog.naver.com/kook765/224111222333'),
  record('b','충치 진행 정도에 따라 치료를 판단합니다. '.repeat(15),'https://blog.naver.com/kook765/224111222333')
 ]);
 assert.ok(result.duplicates.some(x=>x.reason==='reused verified source URL'));
});
test('similar topic with substantially different patient education is not treated as a duplicate',()=>{
 const a='잇몸 출혈과 치주낭 깊이, 치조골 상태를 함께 확인하고 비수술적 치료를 고려합니다. '.repeat(13);
 const b='기존 근관충전재를 제거하고 근관을 다시 소독해 재신경치료가 가능한지 검사합니다. '.repeat(13);
 const result=analyzePublishedStories([record('periodontitis',a),record('root',b)]);
 assert.deepEqual(result.duplicates,[]);
 assert.deepEqual(result.nearMatches,[]);
});
test('unpublished drafts cannot block publication and real published corpus contains no exact duplicates',()=>{
 const folder=new URL('../content/posts/',import.meta.url);
 const published=readdirSync(folder).filter(name=>name.endsWith('.json'))
  .map(name=>({slug:name.slice(0,-5),...JSON.parse(readFileSync(new URL(name,folder),'utf8'))}));
 const result=analyzePublishedStories([...published,record('draft-copy',phrase.repeat(11))].map(x=>
  x.slug==='draft-copy'?{...x,published:false}:x));
 assert.equal(result.published,published.filter(x=>x.published===true).length);
 assert.deepEqual(result.duplicates,[]);
});
