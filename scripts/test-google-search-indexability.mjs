// Google Search quality gate for the actual published production build.
// Ensures the sitemap advertises crawlable canonical URLs, rather than
// redirects, duplicate pages, previews, or private/internally searchable URLs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';

const origin='https://ejoeundental.com';
const output='dist';
const pageFor=route=>{
 if(route==='/')return path.join(output,'index.html');
 const rel=decodeURIComponent(route.slice(1));
 if(!rel||rel.split('/').includes('..')||rel.includes('\\'))
  throw new Error('Unsafe indexed path: '+route);
 return rel.endsWith('/')?path.join(output,rel,'index.html'):
  path.join(output,rel.endsWith('.html')?rel:rel+'.html');
};

test('Google sitemap uses only live, indexable, self-canonical clinic pages',()=>{
 const xml=readFileSync(path.join(output,'sitemap.xml'),'utf8');
 const locs=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 const weakDescriptions=[];
 assert.ok(locs.length>=150,'clinic sitemap must retain existing indexed health and original stories');
 assert.equal(locs.length,new Set(locs).size,'duplicate sitemap addresses dilute crawl signals');
 assert.ok(!xml.includes('pages.dev'),"temporary preview host must not be in Google sitemap");
 for(const loc of locs){
  const url=new URL(loc);
  assert.equal(url.origin,origin,'sitemap must only publish the HTTPS canonical domain');
  assert.equal(url.search+url.hash,'','sitemap entries cannot contain tracking queries or fragments');
  assert.ok(!/\/(?:search|admin)(?:\/|\.html|$)/.test(url.pathname),'internal search/admin must remain out of Google indexing');
  const file=pageFor(url.pathname);
  assert.ok(existsSync(file),'sitemap entry must resolve to an actual generated HTML page: '+loc);
  const html=readFileSync(file,'utf8');
  const canonicals=[...html.matchAll(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/gi)].map(m=>m[1]);
  assert.deepEqual(canonicals,[loc],file+' must declare exactly its final self-canonical (not a .html redirect)');
  assert.doesNotMatch(html,/<meta\b[^>]*\bname=["']robots["'][^>]*\bnoindex\b/i,
   file+' must not tell Google to exclude a URL that the sitemap offers');
  assert.ok(/<title>\s*[^<\s][^<]*<\/title>/i.test(html),file+' has no descriptive title');
  const description=html.match(/<meta name="description" content="([^"]*)"/i)?.[1]||'';
  if(description.length<40)weakDescriptions.push(file+' ('+description.length+'): '+description);
 }
 assert.deepEqual(weakDescriptions,[],
  'Google-facing page snippets need enough factual context to describe their unique topic');
});

test('Google crawl discovery, verification and article authorship remain consistent',()=>{
 const home=readFileSync(path.join(output,'index.html'),'utf8');
 const robots=readFileSync(path.join(output,'robots.txt'),'utf8');
 const headers=readFileSync(path.join(output,'_headers'),'utf8');
 assert.match(home,/<meta name="google-site-verification" content="[A-Za-z0-9_-]+">/);
 assert.match(home,/<meta name="robots" content="index,follow,max-image-preview:large">/);
 assert.match(robots,/^User-agent:\s*\*\s*$/m);
 assert.match(robots,/^Allow:\s*\/\s*$/m);
 assert.match(robots,/^Sitemap:\s*https:\/\/ejoeundental\.com\/sitemap\.xml\s*$/m);
 assert.ok(!/X-Robots-Tag:\s*noindex/i.test(headers.split(/# Prevent indexing/)[0]),
  'global production Cloudflare headers must not accidentally block indexing');
 const guides=['gum-bleeding','gum-pus','root-canal-after-pain','root-canal-retreatment','insurance-scaling'];
 for(const slug of guides){
  const html=readFileSync(path.join(output,'health',slug+'.html'),'utf8');
  const medical=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
   .map(match=>JSON.parse(match[1]))
   .find(entry=>entry['@type']==='MedicalWebPage'||entry['@type']==='WebPage');
  const canonical=origin+'/health/'+slug;
  assert.equal(medical.url,canonical);
  assert.equal(medical.author?.name,'이조은치과');
  assert.equal(medical.author?.url,origin+'/');
  assert.equal(medical.publisher?.['@id'],origin+'/#clinic');
  assert.match(html,/class="health-info-source"/);
  assert.match(html,/href="\/#doctor"/);
 }
});


test('Google search users can follow gum bumps and post-treatment infection to a helpful clinical answer',()=>{
 const sitemap=readFileSync(path.join(output,'sitemap.xml'),'utf8');
 for(const slug of ['gum-health','root-canal-health','health/gum-pus']){
  const entry=new RegExp('<loc>https://ejoeundental\\.com/'+slug+'<\\/loc><lastmod>2026-10-26<\\/lastmod>');
  assert.match(sitemap,entry,'Google sitemap should signal only these genuine medically edited pages: '+slug);
 }
 const gumHub=readFileSync(path.join(output,'gum-health.html'),'utf8');
 const rootHub=readFileSync(path.join(output,'root-canal-health.html'),'utf8');
 const gumPus=readFileSync(path.join(output,'health/gum-pus.html'),'utf8');
 assert.match(gumHub,/href="\/health\/gum-pus\.html">뾰루지·물집처럼 보이는 돌기가 생기거나 고름이 나오는 경우<\/a>/);
 assert.match(gumHub,/뾰루지가 모두 치주염은 아니며/);
 assert.match(rootHub,/신경치료한 치아 주변에 뾰루지나 물집 같은 돌기가 반복된다면/);
 assert.match(rootHub,/href="\/health\/gum-pus\.html">잇몸 뾰루지·고름의 원인과 검사 알아보기/);
 const meta=gumPus.match(/<meta name="description" content="([^"]+)"/)?.[1];
 assert.ok(meta?.includes('뾰루지·물집')&&meta.includes('부평구 청천동 이조은치과'),
  'Google gum-pus preview should cover patient language and the actual clinic');
 assert.ok(gumPus.includes('<meta property="og:description" content="'+meta+'">'),
  'shared previews should match the exact medical description');
 const schema=[...gumPus.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1])).find(data=>data['@type']==='MedicalWebPage');
 assert.ok(schema,'gum-pus health guide must have structured medical information');
 assert.equal(schema.description,meta,'Google medical description must equal human-readable snippet');
 assert.equal(schema.url,origin+'/health/gum-pus');
 assert.equal(schema.author?.name,'이조은치과');
 assert.match(gumPus,/삼키거나/);
 assert.match(gumPus,/응급 진료/);
});


test('real treating dentist has one consistent visible name and person identity across all published journal pages',()=>{
 const home=readFileSync(path.join(output,'index.html'),'utf8');
 const config=JSON.parse(readFileSync('content/site.json','utf8'));
 const realName=config.footer_representative;
 assert.equal(realName,'김태훈','the treating clinician name must come from verified site settings');
 const doctor=home.match(/<section class="section dark" id="doctor">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(doctor.includes('class="doctor-visible-name"'));
 assert.ok(doctor.includes('진료 담당 원장 '+realName));
 assert.ok(doctor.includes('고려대학교 의학박사(치과학 전공)'));
 assert.ok(doctor.includes('통합치의학과 전문의'));
 assert.ok(doctor.includes('원장이 직접 검진하고 진단합니다'));
 const clinic=[...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1])).find(data=>data['@type']==='Dentist');
 assert.ok(clinic);
 assert.equal(clinic['@id'],origin+'/#clinic');
 assert.equal(clinic.employee?.['@type'],'Person');
 assert.equal(clinic.employee?.['@id'],origin+'/#doctor-person');
 assert.equal(clinic.employee?.name,realName);
 assert.equal(clinic.employee?.url,origin+'/#doctor');
 assert.equal(clinic.employee?.worksFor?.['@id'],clinic['@id']);
 assert.match(clinic.employee.description,/치과학 전공/);

 const published=JSON.parse(readFileSync(path.join(output,'content/posts-index.json'),'utf8'));
 assert.ok(published.length>=80,'the whole published original-story archive must remain connected');
 for(const article of published){
  const html=readFileSync(path.join(output,'stories',article.slug,'index.html'),'utf8');
  const structured=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
   .map(m=>JSON.parse(m[1])).find(obj=>obj['@type']==='BlogPosting');
  assert.ok(structured,article.slug+' missing original story structured data');
  assert.equal(structured.author?.name,realName,article.slug+' byline must match the visible clinic name');
  assert.equal(structured.author?.['@id'],clinic.employee['@id'],article.slug+' person identity drift');
  assert.equal(structured.author?.url,origin+'/#doctor',article.slug+' author profile link');
  assert.equal(structured.author?.worksFor?.['@id'],clinic['@id'],article.slug+' clinic mismatch');
  assert.equal(structured.publisher?.['@id'],clinic['@id'],article.slug+' publisher mismatch');
  assert.equal(structured.mainEntityOfPage,origin+'/stories/'+article.slug+'/',article.slug+' canonical story URL');
 }
});


test('Google Image discovery lists real first-party illustrations only on their matching HTML pages',()=>{
 const siteMap=readFileSync(path.join(output,'sitemap.xml'),'utf8');
 assert.match(siteMap,/<urlset\b[^>]*xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/,
  'the official Google image sitemap namespace must be declared');
 const blocks=[...siteMap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m=>m[1]);
 const entries=blocks.map(block=>({
  page:block.match(/<loc>([^<]+)<\/loc>/)?.[1]||'',
  images:[...block.matchAll(/<image:image><image:loc>([^<]+)<\/image:loc><\/image:image>/g)].map(m=>m[1]),
  declared:(block.match(/<image:image>/g)||[]).length
 }));
 const imageEntries=entries.filter(entry=>entry.images.length);
 const home=origin+'/';
 const rootCanal=origin+'/retreatment';
 assert.deepEqual(imageEntries.map(x=>x.page).sort(),[home,rootCanal].sort(),
  'only pages with actual clinic-owned art should claim Google image results');
 for(const {page,images,declared} of imageEntries){
  assert.equal(images.length,declared,'all image sitemap entries must use the current supported image:loc tag');
  assert.equal(new Set(images).size,images.length,'do not repeat identical artwork');
  assert.ok(images.length<=1000,'Google limits 1000 images per page');
  const file=pageFor(new URL(page).pathname);
  const html=readFileSync(file,'utf8');
  for(const url of images){
   const u=new URL(url);
   assert.equal(u.origin,origin,'patient artwork must not depend on an unverifiable CDN');
   assert.equal(u.search+u.hash,'','do not list transient version hashes as new image files');
   assert.match(u.pathname,/^\/assets\/[a-zA-Z0-9./_-]+\.(?:webp|svg)$/);
   assert.ok(existsSync(path.join(output,u.pathname.slice(1))),'do not advertise missing images: '+url);
   const tag=[...html.matchAll(/<img\b[^>]*>/g)]
    .map(m=>m[0]).find(tag=>tag.includes('src="'+u.pathname));
   assert.ok(tag,'image must actually be displayed on its Google landing page: '+url);
   assert.match(tag,/alt="[^"]{15,}"/,'visible artwork needs genuinely descriptive text: '+url);
  }
 }
 assert.equal(imageEntries.find(x=>x.page===home).images.length,2);
 const rootEntry=imageEntries.find(x=>x.page===rootCanal);
 assert.equal(rootEntry.images.length,10);
 const clinicalSteps=[
  ['06','기존 충전재 제거','기존 근관 충전재를 제거하는 재신경치료 첫 번째 단계 설명 그림'],
  ['07','근관 세척·소독','치아 근관 내부를 다시 탐색하고 세척·소독하는 재신경치료 과정 그림'],
  ['08','근관 형태 정리','근관 상태를 확인하고 충전할 수 있도록 형태를 정리하는 재신경치료 그림'],
  ['09','새로운 근관 충전','근관을 새로 충전해 밀폐하고 최종 치아 수복을 계획하는 재신경치료 그림']
 ];
 const illustrationHtml=readFileSync(path.join(output,'retreatment.html'),'utf8');
 for(const [number,heading,alt] of clinicalSteps){
  const imagePath='/assets/retreatment/illustration-'+number+'.webp';
  const markup=illustrationHtml.match(
   new RegExp('<img\\b[^>]*src="'+imagePath.replace(/\//g,'\\/')+'"[^>]*>\\s*<h3>([^<]+)<\\/h3>'));
  assert.ok(markup,'process step image needs a truthful adjacent description: '+number);
  assert.equal(markup[1],heading,'clinical step heading should match educational illustration');
  assert.ok(markup[0].includes('alt="'+alt+'"'),
   'Google Image and screen readers should distinguish clinical steps, not generic numbers: '+number);
 }
 const processPage=readFileSync(path.join(output,'health/root-canal-retreatment-process.html'),'utf8');
 assert.match(processPage,/<a href="\/retreatment\.html#retreatment-procedure">그림으로 보는 재신경치료 4단계:/,
  'clinical explanation should link directly to the illustrated treatment steps');
 assert.match(processPage,/단계와 방문 횟수는 실제 치아 상태에 따라 달라집니다/,
  'educational diagram must not imply every patient undergoes the same exact procedure');
 assert.match(illustrationHtml,/<h2 id="retreatment-procedure">재신경치료는 어떻게 진행될까요\?<\/h2>/,
  'the illustration deep link must land on the actual patient-facing heading');
 assert.ok(siteMap.includes(
  '<loc>'+origin+'/health/root-canal-retreatment-process</loc><lastmod>2026-10-26</lastmod>'),
  'Google sitemap date must reflect the real education-page edit');
 const primary=origin+'/assets/retreatment/illustration-01.webp';
 assert.ok(rootEntry.images.includes(primary));
 const treatment=readFileSync(path.join(output,'retreatment.html'),'utf8');
 assert.ok(treatment.includes('<meta property="og:image" content="'+primary+'">'));
 assert.ok(treatment.includes('<meta property="og:image:alt" content="흰 고양이 치과의사와 치근단 염증을 설명하는 치아 단면 그림">'));
 const medical=[...treatment.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1])).find(data=>data['@type']==='MedicalWebPage');
 assert.equal(medical?.primaryImageOfPage?.url,primary);
 assert.equal(medical?.url,rootCanal);
 assert.equal(medical?.primaryImageOfPage?.width,519);
 assert.equal(medical?.primaryImageOfPage?.height,327);
 assert.ok(siteMap.includes('<loc>'+rootCanal+'</loc><lastmod>2026-10-26</lastmod>'),
  'Google must see the genuine treatment-page update date');
});
