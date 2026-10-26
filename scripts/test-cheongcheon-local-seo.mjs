import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const home=readFileSync('dist/index.html','utf8');
const visit=readFileSync('dist/visit-guide.html','utf8');
const sitemap=readFileSync('dist/sitemap.xml','utf8');
const css=readFileSync('dist/assets/home-enhancements.css','utf8');
const head=s=>s.split('</head>')[0];
const extract=(s,pattern)=>s.match(pattern)?.[1]||'';
test('Cheongcheon-dong and Bupyeong clinic queries have one truthful branded homepage',()=>{
 const h=head(home);
 const title=extract(h,/<title>([^<]+)<\/title>/);
 const og=extract(h,/<meta property="og:title" content="([^"]+)"/);
 const twitter=extract(h,/<meta name="twitter:title" content="([^"]+)"/);
 const meta=extract(h,/<meta name="description" content="([^"]+)"/);
 assert.equal(title,'부평치과 | 청천동치과 이조은치과 (인천 부평구)');
 assert.equal(og,title);
 assert.equal(twitter,title);
 assert.ok(meta.includes('청천동치과')&&meta.includes('부평치과'));
 assert.ok(meta.length<=80);
 assert.equal(extract(h,/<meta property="og:description" content="([^"]+)"/),meta);
 assert.equal(extract(h,/<meta name="twitter:description" content="([^"]+)"/),meta);
 assert.ok(h.includes('<link rel="canonical" href="https://ejoeundental.com/">'));
 assert.equal((home.match(/<h1\b/g)||[]).length,1,'do not stuff an extra H1 for local SEO');
 const hero=home.split('<section class="hero wrap">')[1]?.split('</section>')[0]||'';
 assert.ok(hero.includes('class="hero-local-intro"'));
 assert.ok(hero.includes('청천동치과 이조은치과'));
 assert.ok(hero.includes('세월천로 34'));
 assert.ok(hero.includes('href="/visit-guide.html"'));
 assert.ok(hero.includes('고려대학교 의학박사(치과학 전공)')&&
   hero.includes('통합치의학과 전문의'));
 assert.ok(!hero.includes('부천잇몸치료'),'secondary towns should not clutter clinic identity');
 assert.ok(css.includes('.hero .hero-local-intro')&&css.includes('@media(max-width:600px)'));
});
test('visit page is distinct, honest, share-ready and linked to primary local clinic',()=>{
 const h=head(visit);
 const title=extract(h,/<title>([^<]+)<\/title>/);
 const meta=extract(h,/<meta name="description" content="([^"]+)"/);
 assert.equal(title,'청천동치과 이조은치과 | 진료시간·오시는 길·주차');
 assert.equal(title,extract(h,/<meta property="og:title" content="([^"]+)"/));
 assert.equal(title,extract(h,/<meta name="twitter:title" content="([^"]+)"/));
 assert.equal(meta,extract(h,/<meta property="og:description" content="([^"]+)"/));
 assert.equal(meta,extract(h,/<meta name="twitter:description" content="([^"]+)"/));
 assert.ok(meta.includes('부평치과')&&meta.includes('청천동치과'));
 const data=[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
   .map(x=>JSON.parse(x[1])).find(x=>x['@type']==='MedicalWebPage');
 assert.ok(data,'medical visit page schema must stay valid');
 assert.equal(data.name,title);
 assert.equal(data.description,meta);
 assert.ok(visit.includes('부평치과를 찾는 분께 실제 진료 위치를 안내합니다'));
 assert.ok(visit.includes('청천동치과 이조은치과의 진료 장소'));
 assert.ok(visit.includes('0325132875')&&visit.includes('세월천로 34'));
 assert.ok(visit.includes('금·토요일은 격주 일정'));
 assert.ok(visit.includes('3시간 무료'));
 assert.ok(visit.includes('href="/"'));
 assert.ok(h.includes('canonical'));
});
test('onsite search index matches visible homepage title and summary',()=>{
 const rows=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 const homepage=rows.filter(item=>item.url==='/');
 assert.equal(homepage.length,1);
 assert.equal(homepage[0].title,extract(head(home),/<title>([^<]+)<\/title>/));
 assert.equal(homepage[0].description,
  extract(head(home),/<meta name="description" content="([^"]+)"/));
 assert.ok(homepage[0].body.includes('청천동치과 이조은치과'));
});
test('sitemap dates reflect genuine homepage and visit revisions, not invented daily changes',()=>{
 for(const route of ['', 'visit-guide.html']){
  const entry='<loc>https://ejoeundental.com/'+route+'</loc><lastmod>2026-10-26</lastmod>';
  assert.ok(sitemap.includes(entry),'changed page must have accurate modified date: '+route);
 }
});
