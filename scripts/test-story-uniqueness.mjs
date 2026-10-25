import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {analyzePublishedStories,canonicalNaverSource} from './audit-story-uniqueness.mjs';
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

test('nearly copied prose with a small regional introduction is blocked by the publishing guard',()=>{
 const a=Array.from({length:120},(_,i)=>'확인항목 '+String(i+1)+'번: 남아 있는 치질과 치주낭 깊이, 치조골 상태를 평가하고 실제 환자의 검사 근거 '+String(i+1)+'를 설명합니다. ').join('');
 const b='인천 부평구 청천동에서 상담합니다. '+a;
 const result=analyzePublishedStories([record('original',a),record('copy-with-intro',b)]);
 assert.ok(result.duplicates.some(item=>item.reason.includes('near-identical article prose')),
  'adding one marketing sentence must not turn a near-copy into distinct patient education');
});

test('Naver original is identical through mobile, tracking query, slash and case variants',()=>{
 const identity='kook765/224111222333';
 for(const link of [
  'https://blog.naver.com/kook765/224111222333',
  'https://m.blog.naver.com/kook765/224111222333?utm_source=profile',
  'http://blog.naver.com/KOOK765/224111222333/',
  'https://blog.naver.com/kook765/224111222333?foo=bar#note'
 ]) assert.equal(canonicalNaverSource(link),identity,link);
 const d=analyzePublishedStories([
  record('desktop',phrase.repeat(8),'https://blog.naver.com/kook765/224111222333'),
  record('mobile','다른 의료 정보입니다. '.repeat(40),
   'https://m.blog.naver.com/kook765/224111222333?utm_source=share')
 ]);
 assert.ok(d.duplicates.some(x=>x.reason==='reused verified source URL'));
});
test('unverified and misleading links never become clinic Naver source identities',()=>{
 for(const link of [
  'https://blog.naver.com/another-clinic/224111222333',
  'https://blog.naver.com.evil.example/kook765/224111222333',
  'https://blog.naver.com/kook765/not-numeric',
  'https://blog.naver.com/kook765/224111222333/another',
  'https://evil.example/?next=https://blog.naver.com/kook765/224111222333',
  'javascript:alert(1)'
 ])assert.equal(canonicalNaverSource(link),'',link);
 assert.notEqual(canonicalNaverSource('https://blog.naver.com/kook765/224111222333'),
  canonicalNaverSource('https://blog.naver.com/tele654/224111222333'));
});
