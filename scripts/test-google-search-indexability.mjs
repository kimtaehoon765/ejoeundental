// Google Search quality gate for the actual published production build.
// Ensures the sitemap advertises crawlable canonical URLs, rather than
// redirects, duplicate pages, previews, or private/internally searchable URLs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';

const origin='https://ejoeundental.com';
const output='dist';
const editorialSitemap=readFileSync(new URL('../sitemap.xml',import.meta.url),'utf8');
const actualEditorialDate=slug=>{
 const entry=editorialSitemap.split('<loc>'+origin+'/'+slug+'.html</loc>')[1]?.split('</url>')[0]||'';
 const date=entry.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)?.[1]||'';
 assert.ok(date,'Source sitemap should declare a meaningful reviewed lastmod: '+slug);
 return date;
};
const pageFor=route=>{
 if(route==='/')return path.join(output,'index.html');
 const rel=decodeURIComponent(route.slice(1));
 if(!rel||rel.split('/').includes('..')||rel.includes('\\'))
  throw new Error('Unsafe indexed path: '+route);
 return rel.endsWith('/')?path.join(output,rel,'index.html'):
  path.join(output,rel.endsWith('.html')?rel:rel+'.html');
};

test('live Cloudflare audit checks exact OG preview and real 1200x630 PNG response',()=>{
 const probe=readFileSync('scripts/live-domain-check.mjs','utf8');
 assert.ok(probe.includes("if(label==='care route implant'||label==='care route denture')"));
 assert.ok(probe.includes("buffer.readUInt32BE(16)===1200&&buffer.readUInt32BE(20)===630"));
 assert.ok(probe.includes('tagsReady&&actualPngReady'));
});

test('implant and denture have separate genuine PNG sharing images with Korean wordmarks',()=>{
 const metas=[
  ['implant.html','implant','이조은치과 임플란트 상담 주제를 나타내는 도식형 삽화'],
  ['denture.html','denture','이조은치과 틀니 치료 주제를 나타내는 도식형 삽화']
 ];
 const bytes=[];
 for(const [page,id,alt] of metas){
  const data=readFileSync('dist/assets/clinical-share/'+id+'.png');
  assert.ok(data.length>8000&&data.length<2000000,id+' original banner must be a reasonable size');
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(data.readUInt32BE(16),1200);
  assert.equal(data.readUInt32BE(20),630);
  const html=readFileSync('dist/'+page,'utf8');
  const canonical=html.match(/<link rel="canonical" href="(https:\/\/[^/]+)\//)?.[1];
  assert.ok(['https://ejoeundental.com','https://ejoeundental.pages.dev'].includes(canonical),
   page+' must use the actual production or preview canonical domain');
  const root=canonical;
  const expected=[
   ['property','og:image',root+'/assets/clinical-share/'+id+'.png'],
   ['property','og:image:type','image/png'],
   ['property','og:image:width','1200'],['property','og:image:height','630'],
   ['property','og:image:alt',alt],
   ['name','twitter:image',root+'/assets/clinical-share/'+id+'.png']
  ];
  for(const [kind,key,value] of expected){
   const tag='<meta '+kind+'="'+key+'" content="'+value+'">';
   assert.equal(html.split(tag).length-1,1,page+' lacks one '+key);
  }
  bytes.push(data.toString('base64'));
 }
 assert.notEqual(bytes[0],bytes[1],'different treatments need different real artwork');
});

test('three priority public clinic pages publish authentic share-preview images',()=>{
 const image='https://ejoeundental.com/assets/ejoeundental-hero-cat.webp';
 const imagePath='dist/assets/ejoeundental-hero-cat.webp';
 assert.ok(existsSync(imagePath),'branded photo must be in production build');
 for(const file of ['gum-treatment.html','stories.html','visit-guide.html']){
  const html=readFileSync('dist/'+file,'utf8');
  const fields=[
   ['property','og:image',image],['property','og:image:type','image/webp'],
   ['property','og:image:width','650'],['property','og:image:height','543'],
   ['property','og:image:alt','이조은치과의 하얀 고양이와 치과의사 일러스트'],
   ['name','twitter:image',image]
  ];
  for(const [kind,key,value] of fields){
   const markup='<meta '+kind+'="'+key+'" content="'+value+'">';
   assert.equal(html.split(markup).length-1,1,file+' needs exactly one '+key);
  }
 }
 const probe=readFileSync('scripts/live-domain-check.mjs','utf8');
 assert.ok(probe.includes('const socialImageReady='));
 assert.ok(probe.includes('const mobileGardenPreload='));
 assert.ok(probe.includes('const desktopHeroPreload='));
 assert.ok(!probe.includes('h3 광고 헤더 미검출 — 다른 연결'));
});

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
 assert.match(home,/<meta name="google-site-verification" content="[A-Za-z0-9_-]+"\s*\/?>/);
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
  assert.match(html,/href="\/doctor\.html"/);
 }
});


test('Google search users can follow gum bumps and post-treatment infection to a helpful clinical answer',()=>{
 const sitemap=readFileSync(path.join(output,'sitemap.xml'),'utf8');
 for(const slug of ['gum-health','root-canal-health','health/gum-pus']){
  const date=actualEditorialDate(slug);
  const entry=new RegExp('<loc>https://ejoeundental\\.com/'+slug+'<\\/loc><lastmod>'+date+'<\\/lastmod>');
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
 assert.equal(clinic.employee?.url,origin+'/doctor');
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
  assert.equal(structured.author?.url,origin+'/doctor',article.slug+' author profile link');
  assert.ok(html.includes('자료 제공: 이조은치과 원장 <a href="/doctor.html"'),
    article.slug+' visible treating-clinician provenance must link to same verified profile');
  assert.ok(html.includes(realName+' · 의료진 소개</a>'),
    article.slug+' clinician identity must be readable and clickable');
  assert.equal(structured.author?.worksFor?.['@id'],clinic['@id'],article.slug+' clinic mismatch');
  assert.equal(structured.publisher?.['@id'],clinic['@id'],article.slug+' publisher mismatch');
  assert.equal(structured.mainEntityOfPage,origin+'/stories/'+article.slug+'/',article.slug+' canonical story URL');
  // Match the published and modified dates across visible content, JSON-LD,
  // and the Open Graph article fields used by crawlers and sharing previews.
  const source=JSON.parse(readFileSync('content/posts/'+article.slug+'.json','utf8'));
  assert.equal(structured.datePublished,source.date,
   article.slug+' must preserve the original publication date');
  assert.equal(structured.dateModified,source.updated||source.date,
   article.slug+' JSON-LD should use the actual latest content update');
  if(source.date)assert.ok(html.includes('<meta property="article:published_time" content="'+source.date+'">'),
   article.slug+' social publication date differs from article metadata');
  if(source.updated||source.date)assert.ok(html.includes('<meta property="article:modified_time" content="'+(source.updated||source.date)+'">'),
   article.slug+' social modified date must reflect the real page');
  if(source.updated&&source.updated!==source.date)
   assert.ok(html.includes('내용 수정 <time datetime="'+source.updated+'">'+source.updated+'</time>'),
    article.slug+' visible corrected date does not match JSON-LD');
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
 assert.ok(siteMap.includes('<loc>'+rootCanal+'</loc><lastmod>2026-10-27</lastmod>'),
  'Google must see the genuine treatment-page update date');
});


test('patient bad breath and gingival bleeding search have a complete accurate indexed answer',()=>{
 const target='health/gum-bleeding';
 const html=readFileSync(path.join(output,target+'.html'),'utf8');
 const hub=readFileSync(path.join(output,'gum-health.html'),'utf8');
 const treatment=readFileSync(path.join(output,'gum-treatment.html'),'utf8');
 const sitemap=readFileSync(path.join(output,'sitemap.xml'),'utf8');
 const description=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
 assert.ok(description?.includes('입냄새도 걱정된다면'),'patient symptom snippet must not be restricted to textbook terms');
 assert.ok(description.includes('치주낭 검사')&&description.includes('혀 설태·구강건조'));
 assert.ok(html.includes('<meta property="og:description" content="'+description+'">'));
 const sections=[...html.matchAll(/<h2\b[^>]*id="section-(\d+)"[^>]*>/g)].map(m=>Number(m[1]));
 assert.ok(sections.includes(8),'halitosis and gum bleeding should be a clearly accessible article section');
 assert.match(html,/<a href="#section-8">입냄새가 함께 난다면 잇몸 때문일까요\?<\/a>/);
 assert.match(html,/입냄새만으로 치주염이라고 진단할 수는 없습니다/);
 assert.match(html,/구강 밖의 원인이 관여할 수도 있습니다/);
 assert.match(html,/가글로 잠시 냄새를 가리는 것만으로 출혈 원인이나 치주낭 문제가 해결되는 것은 아닙니다/);
 assert.match(hub,/href="\/health\/gum-bleeding(?:\.html)?#section-8">입냄새와 잇몸 출혈 건강정보<\/a>/);
 assert.match(treatment,/입냄새나 고름이 반복되면 구강·치주 상태를 검사해 원인을 구분합니다/);
 for(const slug of ['health/gum-bleeding','gum-health','gum-treatment']){
  const date=actualEditorialDate(slug);
  assert.ok(sitemap.includes('<loc>'+origin+'/'+slug+'</loc><lastmod>'+date+'</lastmod>'),
    slug+' Google update date must reflect the actual edited patient content');
 }
 const medical=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1])).find(obj=>obj['@type']==='MedicalWebPage');
 assert.equal(medical?.description,description,'medical structured data must agree with the real search snippet');
 assert.equal(medical?.author?.name,'이조은치과');
 assert.equal(medical?.url,origin+'/'+target);
});


test('Google scaling insurance page answers repeat-treatment questions without promising coverage',()=>{
 const html=readFileSync(path.join(output,'health/insurance-scaling.html'),'utf8');
 const care=readFileSync(path.join(output,'scaling.html'),'utf8');
 const sitemap=readFileSync(path.join(output,'sitemap.xml'),'utf8');
 const snippet=html.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
 assert.ok(snippet.includes('다른 치과')&&snippet.includes('치주질환 치료 목적'));
 assert.ok(snippet.includes('인천 부평구 청천동'),'snippet should retain real local clinic context');
 assert.ok(html.includes('<meta property="og:description" content="'+snippet+'">'));
 assert.match(html,/<h2 id="section-4">올해 이미 스케일링을 받았다면\?<\/h2>/);
 assert.match(html,/이미 스케일링을 받았다고 해서 필요한 잇몸 검진이나 치주치료까지 모두 불가능한 것은 아닙니다/);
 assert.match(html,/스케일링을 반복한다고 항상 보험이 적용되는 것도 아닙니다/);
 assert.match(html,/실제 적용은 진료일의 급여 기준에 따릅니다/);
 assert.match(html,/href="\/health\/periodontal-insurance(?:\.html)?">치주치료 건강보험 기준 알아보기/);
 assert.match(care,/href="\/health\/insurance-scaling(?:\.html)?#section-4">올해 스케일링을 이미 받은 경우의 보험 기준/);
 const medical=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1])).find(obj=>obj['@type']==='MedicalWebPage');
 assert.equal(medical?.description,snippet,'Google medical page must describe the same insurance guidance as the visible metadata');
 assert.equal(medical?.url,origin+'/health/insurance-scaling');
 assert.equal(medical?.author?.name,'이조은치과');
 for(const slug of ['scaling','health/insurance-scaling']){
  assert.ok(sitemap.includes('<loc>'+origin+'/'+slug+'</loc><lastmod>2026-10-26</lastmod>'),
   'only genuinely updated care/insurance pages should receive the current sitemap date: '+slug);
 }
});


test('Google GI and resin insurance answers remain medically cautious and reachable from care hubs',()=>{
 const html=readFileSync(path.join(output,'health/insurance-cervical.html'),'utf8');
 const care=readFileSync(path.join(output,'cervical-abrasion.html'),'utf8');
 const hub=readFileSync(path.join(output,'insurance-health.html'),'utf8');
 const sitemap=readFileSync(path.join(output,'sitemap.xml'),'utf8');
 const description=html.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
 assert.match(description,/인천 부평구 청천동 이조은치과/);
 assert.match(description,/GI·레진 수복 선택/);
 assert.match(description,/수복물이 떨어졌을 때/);
 assert.ok(html.includes('<meta property="og:description" content="'+description+'">'));
 const schema=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1])).find(x=>x['@type']==='MedicalWebPage');
 assert.equal(schema?.description,description,'Google medical markup should match original page description');
 assert.equal(schema?.url,origin+'/health/insurance-cervical');
 assert.equal(schema?.author?.name,'이조은치과');
 for(const [id,title] of [['7','이미 GI 수복을 했는데 떨어졌다면?'],['8','레진과 GI 중 어느 재료가 보험이 되나요?']]){
  assert.ok(html.includes('<h2 id="section-'+id+'">'+title+'</h2>'),
   'Patient questions must have real deep-link headings');
  assert.ok(html.includes('href="#section-'+id+'">'+title+'</a>'),
   "The patient’s table of contents should let mobile readers skip straight to their question");
 }
 assert.match(html,/GI는 무조건 보험, 레진은 무조건 비보험/);
 assert.match(html,/재료 이름만으로 구분하는 것은 정확하지 않습니다/);
 assert.match(html,/무조건 무료 재치료나 보험 적용을 약속할 수는 없습니다/);
 assert.match(html,/충치·균열·치수 상태를 함께 살펴야 합니다/);
 assert.ok(care.includes('href="/health/insurance-cervical.html#section-7"'));
 assert.ok(care.includes('href="/health/insurance-cervical.html#section-8"'));
 assert.ok(hub.includes('href="/health/insurance-cervical.html#section-7"'));
 assert.ok(hub.includes('href="/health/insurance-cervical.html#section-8"'));
 for(const slug of ['cervical-abrasion','insurance-health','health/insurance-cervical']){
  const date=actualEditorialDate(slug);
  assert.ok(sitemap.includes('<loc>'+origin+'/'+slug+'</loc><lastmod>'+date+'</lastmod>'),
   'Only genuinely revised Google indexed pages should get a new modification date: '+slug);
 }
});


test('Google root canal insurance guide separates repeat treatment, existing crown and prosthetic cost',()=>{
 const guide=readFileSync(path.join(output,'health/insurance-root-canal.html'),'utf8');
 const treatment=readFileSync(path.join(output,'retreatment.html'),'utf8');
 const hub=readFileSync(path.join(output,'root-canal-health.html'),'utf8');
 const insuranceHub=readFileSync(path.join(output,'insurance-health.html'),'utf8');
 const sitemap=readFileSync(path.join(output,'sitemap.xml'),'utf8');
 const snippet=guide.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
 assert.ok(snippet.includes('인천 부평구 청천동 이조은치과'));
 assert.ok(snippet.includes('기존 크라운')&&snippet.includes('근관치료·보철 비용'));
 assert.ok(snippet.includes('적용 여부는 진단과 급여 기준에 따릅니다'));
 assert.ok(guide.includes('<meta property="og:description" content="'+snippet+'">'));
 const medical=[...guide.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1])).find(d=>d['@type']==='MedicalWebPage');
 assert.equal(medical?.url,origin+'/health/insurance-root-canal');
 assert.equal(medical?.description,snippet);
 assert.equal(medical?.author?.name,'이조은치과');
 for(const [id,title] of [
  ['7','크라운을 씌운 치아도 재신경치료가 가능한가요?'],
  ['8','재신경치료 상담 전 어떤 비용을 확인해야 하나요?']
 ]){
  assert.ok(guide.includes('<h2 id="section-'+id+'">'+title+'</h2>'),
   'the patient question must have a named anchor for direct navigation');
  assert.ok(guide.includes('href="#section-'+id+'">'+title+'</a>'),
   'its table of contents should expose the exact question');
  assert.ok(treatment.includes('href="/health/insurance-root-canal.html#section-'+id+'"'),
   'the original treatment page should link to the relevant detailed answer');
  assert.ok(insuranceHub.includes('href="/health/insurance-root-canal.html#section-'+id+'"'),
   'the insurance overview should offer direct access to these answers');
 }
 assert.match(guide,/기존 크라운을 유지한 채 접근할 수 있는지, 제거·교체가 필요한지는 개별 상태에 따라 다릅니다/);
 assert.match(guide,/모든 재신경치료에 크라운 교체가 필요한 것도 아니고/);
 assert.match(guide,/전체 치료비가 자동으로 건강보험 적용되는 것도 아닙니다/);
 assert.match(hub,/기존 크라운 재사용 가능성과 근관 재치료·보철 비용 구분/);
 assert.ok(sitemap.includes('<loc>'+origin+'/health/insurance-root-canal</loc><lastmod>2026-10-26</lastmod>'));
});


test('Google denture insurance guide distinguishes adjustment, relining and replacement without claiming automatic coverage',()=>{
 const article=readFileSync(path.join(output,'health/insurance-denture.html'),'utf8');
 const care=readFileSync(path.join(output,'denture.html'),'utf8');
 const insurance=readFileSync(path.join(output,'insurance-health.html'),'utf8');
 const sitemap=readFileSync(path.join(output,'sitemap.xml'),'utf8');
 const description=article.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
 assert.match(description,/인천 부평구 청천동 이조은치과/);
 assert.match(description,/부분틀니·완전틀니/);
 assert.match(description,/조정·수리·개상/);
 assert.match(description,/다른 치과에서 만든 틀니/);
 const schema=[...article.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m=>JSON.parse(m[1])).find(x=>x['@type']==='MedicalWebPage');
 assert.equal(schema?.description,description,'Google medical markup must agree with patient-facing summary');
 assert.equal(schema?.url,origin+'/health/insurance-denture');
 assert.equal(schema?.author?.name,'이조은치과');
 for(const [id,title] of [
  ['7','틀니가 헐거워졌다면 새로 만들어야 하나요?'],
  ['8','다른 치과에서 만든 틀니도 조정·수리할 수 있나요?']
 ]){
  assert.ok(article.includes('<h2 id="section-'+id+'">'+title+'</h2>'),
   'patients need their real symptom question in a direct-link heading');
  assert.ok(article.includes('href="#section-'+id+'">'+title+'</a>'),
   'the guide contents should point to the exact answer');
  assert.ok(care.includes('href="/health/insurance-denture.html#section-'+id+'"'),
   'denture care page must link patients to this answer');
  assert.ok(insurance.includes('href="/health/insurance-denture.html#section-'+id+'"'),
   'the insurance topic hub should crosslink patients to this answer');
 }
 assert.match(article,/새 틀니 제작.*틀니 조정·수리·개상/);
 assert.match(article,/접착제로 계속 버티거나 틀니를 직접 갈아내지 마세요/);
 assert.match(article,/다른 치과에서 제작한 틀니라도 현재 구강과 틀니의 상태를 검사/);
 assert.match(article,/모든 틀니를 반드시 수리할 수 있는 것은 아닙니다/);
 assert.match(article,/실제 급여 대상과 본인부담금은 진찰 후 안내합니다/);
 for(const slug of ['denture','insurance-health','health/insurance-denture']){
  assert.ok(sitemap.includes('<loc>'+origin+'/'+slug+'</loc><lastmod>'+actualEditorialDate(slug)+'</lastmod>'),
   'Google must receive the actual last-modified date for edited denture content: '+slug);
 }
});

test('owner-supplied October 2026 GSC URL-prefix file remains byte-for-byte published at root',()=>{
 const name='google4b5b71e2b560cac2.html';
 const expected='google-site-verification: '+name+'\n';
 const fromSource=readFileSync(name,'utf8');
 const published=readFileSync(path.join(output,name),'utf8');
 assert.equal(fromSource,expected,'verification-file content must match the owner-provided GSC file name');
 assert.equal(published,expected,'build must publish the same exact content in public root');
 const sitemap=readFileSync(path.join(output,'sitemap.xml'),'utf8');
 assert.ok(!sitemap.includes(name),'Google verification file must not be advertised as patient content');
});
