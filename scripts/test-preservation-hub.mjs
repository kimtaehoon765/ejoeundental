import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const origin='https://ejoeundental.com';
const page=readFileSync('dist/tooth-preservation.html','utf8');
const sitemap=readFileSync('dist/sitemap.xml','utf8');
const index=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
const homepage=readFileSync('dist/index.html','utf8');
const directory=readFileSync('dist/stories.html','utf8');
const posts=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));

test('preservation hub has one authoritative canonical and is discoverable by real links',()=>{
 assert.match(page,/<html lang="ko">/);
 assert.equal((page.match(/<h1\b/g)||[]).length,1);
 assert.match(page,/<title>부평 자연치아 보존/);
 assert.ok(page.includes('href="'+origin+'/tooth-preservation.html"'));
 assert.ok(sitemap.includes('<loc>'+origin+'/tooth-preservation'));
 assert.ok(homepage.includes('href="/tooth-preservation.html"'));
 assert.ok(directory.includes('href="/tooth-preservation.html"'));
 assert.ok(page.includes('href="tel:0325132875"'));
 assert.ok(page.includes('고려대학교 의학박사(치과학 전공)'));
 assert.ok(page.includes('통합치의학과 전문의'));
});

test('preservation page is substantive and links to existing, verifiable patient education',()=>{
 for(const phrase of ['남아 있는 치질','치근의 균열','치주','재신경치료','임플란트','건강보험','발치가 필요한','개별 검사 결과'])
  assert.ok(page.includes(phrase),'important balanced clinical guidance absent: '+phrase);
 for(const dest of ['/gum-treatment.html','/retreatment.html','/cavity-treatment.html','/implant.html','/health/tooth-crack.html','/stories.html#topic-preserve']){
  assert.ok(page.includes('href="'+dest+'"'),'missing relevant real care path: '+dest);
 }
 const expected=['2026-10-25-bupyeong-natural-tooth-versus-implant-maintenance',
 '2026-10-25-cheongcheon-severe-caries-can-tooth-be-saved',
 '2026-10-25-bupyeong-retreatment-vs-extraction-tooth-prognosis'];
 for(const slug of expected){
  assert.ok(posts.some(item=>item.slug===slug),'referenced story must be publicly published: '+slug);
  assert.ok(page.includes('href="/stories/'+slug+'/"'));
 }
 assert.doesNotMatch(page,/무조건 살릴 수|100% 성공|절대 아프지 않|완치 보장/);
});

test('search and preservation articles guide users back to the main care explanation',()=>{
 const found=index.filter(x=>x.url==='/tooth-preservation.html');
 assert.equal(found.length,1,'index the new authoritative preservation hub once');
 assert.ok(found[0].body.length>600,'preservation hub body cannot be a short SEO placeholder');
 for(const phrase of ['발치','근관','잇몸','치아']) assert.ok(found[0].body.includes(phrase));
 for(const slug of ['2026-10-25-bupyeong-natural-tooth-versus-implant-maintenance',
    '2026-10-25-cheongcheon-severe-caries-can-tooth-be-saved']){
  const story=readFileSync('dist/stories/'+slug+'/index.html','utf8');
  assert.ok(story.includes('href="/tooth-preservation.html"'),
   'published preservation stories must link to clinical preservation guidance');
 }
});
