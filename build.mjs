import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(),out=path.join(root,'dist');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});function cp(src,dst){fs.cpSync(path.join(root,src),path.join(out,dst),{recursive:true})}cp('index.html','index.html');cp('search.html','search.html');cp('gum-treatment.html','gum-treatment.html');cp('cervical-abrasion.html','cervical-abrasion.html');cp('insured-care.html','insured-care.html');cp('retreatment.html','retreatment.html');const retreatmentPath=path.join(out,'retreatment.html');fs.writeFileSync(retreatmentPath,fs.readFileSync(retreatmentPath,'utf8').replace('</body>','<script defer src="/assets/retreatment-image-manager.js"></script></body>'));cp('tmj-care.html','tmj-care.html');cp('wisdom-tooth.html','wisdom-tooth.html');for(const page of ['implant.html','pediatric-orthodontics.html','pediatric-dentistry.html'])cp(page,page);cp('assets','assets');for(const page of ['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'])cp(page,page);cp('health','health');
fs.mkdirSync(path.join(out,'content'),{recursive:true});cp('content/site.json','content/site.json');cp('admin','admin');const dir=path.join(root,'content/posts'),posts=[];for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.json'))){const post=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));if(post.published!==true)continue;const slug=path.basename(name,'.json');posts.push({...post,slug});const escaped=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const safeImage=typeof post.image==="string"&&/^\/assets\/cms-images\/[\w./%-]+$/i.test(post.image)?post.image:"";const article=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaped(post.title)} | 이조은치과</title><meta name="description" content="${escaped(post.summary||post.body||post.title).slice(0,160)}"><meta property="og:type" content="article"><meta property="og:title" content="${escaped(post.title)} | 이조은치과"><meta property="og:description" content="${escaped(post.summary||post.body||post.title).slice(0,160)}">${safeImage?`<meta property="og:image" content="https://ejoeundental.pages.dev${escaped(safeImage)}">`:""}<link rel="canonical" href="https://ejoeundental.pages.dev/stories/${encodeURIComponent(slug)}/"><link rel="stylesheet" href="/assets/style.css"></head><body><header><nav class="nav"><a class="logo" href="/">이조은치과</a><div class="navlinks"><a href="/#stories">치과 이야기</a><a href="/#location">오시는 길</a></div></nav></header><article class="article"><a class="back" href="/#stories">← 치과 이야기로 돌아가기</a><p class="eyebrow">DENTAL JOURNAL · ${escaped(post.date)}</p><h1>${escaped(post.title)}</h1><p>${escaped(post.summary)}</p><hr style="border:0;border-top:1px solid #d7d9ca;margin:35px 0">${safeImage?`<img src="${escaped(safeImage)}" alt="${escaped(post.title)}" loading="lazy" style="display:block;max-width:100%;height:auto;margin:0 auto 28px;border-radius:14px">`:""}<div class="body" style="white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.85">${escaped(post.body)}</div><p class="notice">이 글은 일반적인 건강 정보이며 진단이나 치료는 개별 진찰 결과에 따라 달라질 수 있습니다.</p></article><footer class="footer"><div class="wrap">이조은치과 · 032-513-2875</div></footer></body></html>`;const dest=path.join(out,'stories',slug);fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,'index.html'),article)}// Publish all curated search entries instead of rebuilding the obsolete seven-page index.
const plainHtml=html=>html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const entries=JSON.parse(fs.readFileSync(path.join(root,'content/search-index-46.json'),'utf8'));
for(const entry of entries){
 const local=entry.url==='/'?'index.html':entry.url.replace(/^\/+/, '');
 if(!local||local.includes('..'))continue;
 const htmlFile=path.join(out,local);
 if(fs.existsSync(htmlFile)&&htmlFile.endsWith('.html'))entry.body=plainHtml(fs.readFileSync(htmlFile,'utf8')).slice(0,24000);
}
fs.writeFileSync(path.join(out,'content/search-index.json'),JSON.stringify(entries,null,2));
fs.writeFileSync(path.join(out,'content/search-index-46.json'),JSON.stringify(entries,null,2));
posts.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
fs.writeFileSync(path.join(out,'content/posts-index.json'),JSON.stringify(posts.map(({slug,title,date,summary,image})=>({slug,title,date,summary,image})),null,2));
for(const file of ['sitemap.xml','robots.txt']){const source=path.join(root,file);if(fs.existsSync(source))fs.copyFileSync(source,path.join(out,file))}
// Include the searchable clinic information page in the sitemap.
const searchSitemapPath=path.join(out,'sitemap.xml');
if(fs.existsSync(searchSitemapPath)){
 let xml=fs.readFileSync(searchSitemapPath,'utf8');
 const searchUrl='https://ejoeundental.pages.dev/search.html';
 if(!xml.includes('<loc>'+searchUrl+'</loc>')){
  xml=xml.replace('</urlset>','  <url><loc>'+searchUrl+'</loc></url>\n</urlset>');
  fs.writeFileSync(searchSitemapPath,xml);
 }
}
// Add only published journal entries to the generated sitemap.
const sitemapPath=path.join(out,'sitemap.xml');
if(fs.existsSync(sitemapPath)){
 const base='https://ejoeundental.pages.dev';
 let sitemap=fs.readFileSync(sitemapPath,'utf8');
 const journalUrls=posts.map(post=>'<url><loc>'+base+'/stories/'+encodeURIComponent(post.slug)+'/</loc></url>').join('\n  ');
 sitemap=sitemap.replace('</urlset>',(journalUrls?'  '+journalUrls+'\n':'')+'</urlset>');
 fs.writeFileSync(sitemapPath,sitemap);
}

// Ensure every published page (including all 46 health articles) loads the latest shared mobile CSS.
// Versioning is done at build time, so older cached stylesheets cannot override new typography.
const cssVersion='20261018-visit-mobile-v16';
function versionStylesheets(folder){
 for(const item of fs.readdirSync(folder,{withFileTypes:true})){
  const target=path.join(folder,item.name);
  if(item.isDirectory()){versionStylesheets(target);continue}
  if(!item.isFile()||!item.name.endsWith('.html'))continue;
  const original=fs.readFileSync(target,'utf8');
  const updated=original.replace(/(href=["']\/assets\/style\.css)(?:\?[^"']*)?(["'])/g,(_,start,end)=>start+'?v='+cssVersion+end);
  if(updated!==original)fs.writeFileSync(target,updated);
 }
}
versionStylesheets(out);

// Until the custom domain is connected, keep canonical links aligned with the Pages preview site.
// Apply only to generated HTML; the original source pages remain unchanged.
function alignCanonicalUrls(folder){
 for(const item of fs.readdirSync(folder,{withFileTypes:true})){
  const target=path.join(folder,item.name);
  if(item.isDirectory()){alignCanonicalUrls(target);continue}
  if(!item.isFile()||!item.name.endsWith('.html'))continue;
  const html=fs.readFileSync(target,'utf8');
  const updated=html.replace(/(<link\s+rel=["']canonical["']\s+href=["'])https:\/\/ejoeundental\.com(\/[^"']*["'])/gi,'$1https://ejoeundental.pages.dev$2');
  if(updated!==html)fs.writeFileSync(target,updated);
 }
}
alignCanonicalUrls(out);

// Supply canonical URLs for legacy pages that do not declare one in their source HTML.
for(const page of ['implant.html','pediatric-dentistry.html','pediatric-orthodontics.html','search.html']){
 const target=path.join(out,page);
 let html=fs.readFileSync(target,'utf8');
 if(/<link\s+rel=["']canonical["']/i.test(html))continue;
 const canonical='<link rel="canonical" href="https://ejoeundental.pages.dev/'+page+'">';
 html=html.replace(/<\/head>/i,canonical+'\n</head>');
 fs.writeFileSync(target,html);
}


// Replace internal article-link slug labels with readable Korean titles across all health pages.
const healthTitles=new Map(entries.filter(e=>e.url&&e.title).map(e=>[e.url,e.title]));
const healthDir=path.join(out,'health');
for(const filename of fs.readdirSync(healthDir).filter(x=>x.endsWith('.html'))){
 const target=path.join(healthDir,filename);
 const original=fs.readFileSync(target,'utf8');
 const updated=original.replace(/<a(\s+[^>]*href=["'](\/health\/[^"']+\.html)["'][^>]*)>([^<]*)<\/a>/g,(whole,attrs,href,label)=>{
  const title=healthTitles.get(href);
  if(!title)return whole;
  const clean=label.replace(/\s*[→←]\s*/g,'').trim().toLowerCase();
  const slug=path.basename(href,'.html').replace(/-/g,' ');
  if(clean!==slug&&clean!==path.basename(href,'.html'))return whole;
  return '<a'+attrs+'>'+title+' →</a>';
 });
 if(updated!==original)fs.writeFileSync(target,updated);
}


// Give visitors a route back from treatment pages to the corresponding health guides.
const treatmentGuides=[
 ['gum-treatment.html','/gum-health.html','잇몸 건강정보 10편'],
 ['retreatment.html','/root-canal-health.html','신경치료·재신경치료 건강정보 10편'],
 ['cervical-abrasion.html','/additional-health.html','치경부마모증 등 건강정보'],
 ['insured-care.html','/insurance-health.html','건강보험 치과진료 정보 10편']
];
for(const [filename,href,label] of treatmentGuides){
 const target=path.join(out,filename);
 let html=fs.readFileSync(target,'utf8');
 if(html.includes('data-health-guide-link="true"'))continue;
 const link='<section data-health-guide-link="true" class="section light"><div class="wrap"><h2>관련 치과 건강정보</h2><p>진료 내용을 더 자세히 알아보세요.</p><p><a href="'+href+'" style="display:inline-block;padding:12px 18px;background:#173e35;color:white;border-radius:8px;text-decoration:none">'+label+' →</a></p></div></section>';
 if(html.includes('</main>'))html=html.replace('</main>',link+'</main>');
 else continue;
 fs.writeFileSync(target,html);
}

// Add contextual navigation between detailed health articles and the main care pages.
const careLinks=[
 {prefix:'root-canal-retreatment',href:'/retreatment.html',label:'재신경치료 진료 안내'},
 {prefix:'root-canal-after-pain',href:'/retreatment.html',label:'신경치료 후 통증·재신경치료 안내'},
 {prefix:'root-canal-or-extraction',href:'/retreatment.html',label:'자연치아 보존과 재신경치료 안내'},
 {prefix:'root-canal-reinfection',href:'/retreatment.html',label:'재신경치료 진료 안내'},
 {prefix:'root-canal-',href:'/root-canal-health.html',label:'신경치료 건강정보 더 보기'},
 {prefix:'insurance-',href:'/insured-care.html',label:'건강보험 진료 안내'},
 {prefix:'abrasion-',href:'/cervical-abrasion.html',label:'치경부마모증 진료 안내'},
 {prefix:'gum-',href:'/gum-treatment.html',label:'잇몸치료 진료 안내'},
 {prefix:'swollen-gums',href:'/gum-treatment.html',label:'잇몸치료 진료 안내'},
 {prefix:'periodontal-',href:'/gum-treatment.html',label:'잇몸치료 진료 안내'},
 {prefix:'scaling-',href:'/gum-treatment.html',label:'잇몸치료 진료 안내'},
 {prefix:'root-planing',href:'/gum-treatment.html',label:'잇몸치료 진료 안내'},
 {prefix:'curette-',href:'/gum-treatment.html',label:'잇몸치료 진료 안내'},
 {prefix:'receding-gums',href:'/gum-treatment.html',label:'잇몸치료 진료 안내'},
 {prefix:'loose-tooth',href:'/gum-treatment.html',label:'잇몸치료 진료 안내'}
];
for(const filename of fs.readdirSync(healthDir).filter(x=>x.endsWith('.html'))){
 const match=careLinks.find(x=>filename.startsWith(x.prefix));
 if(!match)continue;
 const target=path.join(healthDir,filename);
 let html=fs.readFileSync(target,'utf8');
 if(html.includes('data-care-link="true"'))continue;
 const link='<div data-care-link="true" style="margin:26px 0;padding:16px 20px;background:#f0f5ef;border-radius:12px;line-height:1.8"><strong style="display:block;margin-bottom:6px">증상에 맞는 진료를 알아보세요</strong><a href="'+match.href+'" style="font-weight:700;color:#173e35">관련 진료 안내: '+match.label+' →</a><br><a href="/#philosophy" style="color:#285447">원장이 직접 진단하고 필요한 치료부터 안내하는 진료 원칙 →</a><br><span class="health-care-actions"><a href="tel:0325132875">전화 문의 032-513-2875 →</a><a href="/#location">진료시간·오시는 길 →</a></span><p style="font-size:13px;margin:8px 0 0">치료 여부는 검사와 진찰 결과에 따라 달라집니다. 방문 전 진료시간을 전화로 확인해 주세요.</p></div>';
 if(html.includes('<div class="bottom">'))html=html.replace('<div class="bottom">',link+'<div class="bottom">');
 else if(html.includes('</article>'))html=html.replace('</article>',link+'</article>');
 else if(html.includes('</main>'))html=html.replace('</main>',link+'</main>');
 else continue;
 fs.writeFileSync(target,html);
}

// Offer next-step reading for core patient questions, without duplicating existing links.
const relatedReading={
 'gum-bleeding.html':[['/health/scaling-vs-periodontal.html','스케일링과 잇몸치료의 차이'],['/health/periodontal-pocket.html','치주낭이 깊다는 것은?']],
 'gum-pus.html':[['/health/swollen-gums.html','잇몸이 붓고 아픈 이유'],['/health/periodontal-pocket.html','치주낭이 깊다는 것은?']],
 'scaling-vs-periodontal.html':[['/health/root-planing.html','치근활택술이란?'],['/health/curette-treatment.html','큐렛을 이용한 잇몸치료']],
 'periodontal-pocket.html':[['/health/gum-bleeding.html','잇몸 출혈 원인'],['/health/root-planing.html','치근활택술이 필요한 경우']],
 'swollen-gums.html':[['/health/gum-pus.html','잇몸에서 고름이 나오는 이유'],['/health/periodontal-pocket.html','치주낭과 잇몸 염증']],
 'root-planing.html':[['/health/scaling-vs-periodontal.html','스케일링과 잇몸치료의 차이'],['/health/curette-treatment.html','큐렛을 이용한 잇몸치료']],
 'curette-treatment.html':[['/health/root-planing.html','치근활택술 알아보기'],['/health/periodontal-pocket.html','치주낭이 깊다는 의미']],
 'root-canal-after-pain.html':[['/health/root-canal-retreatment.html','재신경치료가 필요한 경우'],['/health/root-canal-retreatment-process.html','재신경치료 과정']],
 'root-canal-retreatment.html':[['/health/root-canal-retreatment-process.html','재신경치료 과정'],['/health/root-canal-or-extraction.html','발치와 신경치료 판단']],
 'abrasion-sensitive.html':[['/health/abrasion-gi.html','치경부마모증과 GI 수복'],['/health/insurance-cervical.html','GI 치료와 건강보험']],
 'abrasion-gi.html':[['/health/abrasion-sensitive.html','찬물에 이가 시린 이유'],['/health/insurance-cervical.html','GI 치료와 건강보험']]
};
for(const [filename,related] of Object.entries(relatedReading)){
 const file=path.join(healthDir,filename);
 if(!fs.existsSync(file))continue;
 let html=fs.readFileSync(file,'utf8');
 const missing=related.filter(([url])=>!html.includes('href="'+url+'"')&&fs.existsSync(path.join(out,url.slice(1))));
 if(!missing.length)continue;
 const links=missing.map(([url,title])=>'<li><a href="'+url+'">'+title+' →</a></li>').join('');
 const section='<section class="note" aria-label="이어 읽을 건강정보"><strong>이어 읽으면 좋은 건강정보</strong><ul>'+links+'</ul></section>';
 if(html.includes('<div class="bottom">'))html=html.replace('<div class="bottom">',section+'<div class="bottom">');
 else html=html.replace('</main>',section+'</main>');
 fs.writeFileSync(file,html);
}

// Place supplemental clinical explanations and related reading before the article footer.
for(const filename of fs.readdirSync(healthDir).filter(x=>x.endsWith('.html'))){
 const target=path.join(healthDir,filename);
 let html=fs.readFileSync(target,'utf8');
 const footerStart=html.indexOf('<div class="bottom">');
 if(footerStart<0)continue;
 const footerEnd=html.indexOf('</div>',footerStart);
 if(footerEnd<0)continue;
 const tail=html.slice(footerEnd+6);
 const sections=[...tail.matchAll(/<section class="note"[^>]*>[\s\S]*?<\/section>/g)].map(m=>m[0]);
 if(!sections.length)continue;
 const cleaned=tail.replace(/<section class="note"[^>]*>[\s\S]*?<\/section>/g,'');
 html=html.slice(0,footerStart)+sections.join('')+html.slice(footerStart,footerEnd+6)+cleaned;
 fs.writeFileSync(target,html);
}

// Audit SEO metadata in generated public pages. Report problems in the build log.
const seoWarnings=[];
function auditSeo(folder){
 for(const item of fs.readdirSync(folder,{withFileTypes:true})){
  const file=path.join(folder,item.name);
  if(item.isDirectory()){auditSeo(file);continue}
  if(!item.isFile()||!item.name.endsWith('.html'))continue;
  const relative=path.relative(out,file);
  if(relative.startsWith('admin'+path.sep))continue;
  const html=fs.readFileSync(file,'utf8');
  const title=html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  const description=html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim();
  const canonical=html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)?.[1];
  if(!title)seoWarnings.push(relative+': missing title');
  if(!description)seoWarnings.push(relative+': missing meta description');
  if(!canonical)seoWarnings.push(relative+': missing canonical URL');
  else if(!canonical.startsWith('https://ejoeundental.pages.dev/'))seoWarnings.push(relative+': unexpected canonical '+canonical);
 }
}
auditSeo(out);
if(seoWarnings.length){
 console.warn('SEO metadata warnings ('+seoWarnings.length+'):');
 for(const warning of seoWarnings.slice(0,100))console.warn(' - '+warning);
}else console.log('SEO metadata audit: no missing title, description or canonical URL');

// Fail the build instead of silently deploying a site with missing journal images or pages.
for(const post of posts){
 const page=path.join(out,'stories',post.slug,'index.html');
 if(!fs.existsSync(page))throw new Error('Missing published article: '+post.slug);
 if(typeof post.image==='string'&&post.image.startsWith('/assets/cms-images/')){
  const imagePath=path.join(out,post.image.slice(1));
  if(!fs.existsSync(imagePath))throw new Error('Missing article image: '+post.image);
 }
}
for(const filename of ['index.html','content/posts-index.json','sitemap.xml']){
 if(!fs.existsSync(path.join(out,filename)))throw new Error('Missing required output: '+filename);
}
// Check local navigation targets in generated HTML without blocking deployment for old optional links.
const brokenLinks=new Set();
function checkLocalLinks(folder){
 for(const item of fs.readdirSync(folder,{withFileTypes:true})){
  const file=path.join(folder,item.name);
  if(item.isDirectory()){checkLocalLinks(file);continue}
  if(!item.isFile()||!item.name.endsWith('.html'))continue;
  const html=fs.readFileSync(file,'utf8');
  for(const match of html.matchAll(/(?:href|src)=["'](\/[^"'#?]*)(?:[?#][^"']*)?["']/g)){
   const url=match[1];
   if(url==='/'||url.startsWith('//'))continue;
   let decoded;
   try{decoded=decodeURIComponent(url)}catch{continue}
   if(decoded.includes('..'))continue;
   const local=path.join(out,decoded.slice(1));
   if(!fs.existsSync(local)&&!fs.existsSync(path.join(local,'index.html'))){
    brokenLinks.add(path.relative(out,file)+': '+url);
   }
  }
 }
}
checkLocalLinks(out);
if(brokenLinks.size){
 console.warn('Missing local link targets ('+brokenLinks.size+'):');
 for(const link of [...brokenLinks].slice(0,80))console.warn(' - '+link);
}
// Verify that every health search result with a clear topic has its care guide link.
const topicGuideRules=[
 {pattern:/^(?:gum-|swollen-gums|periodontal-|scaling-|root-planing|curette-|receding-gums|loose-tooth)/,guide:'/gum-treatment.html'},
 {pattern:/^root-canal-(?:retreatment|after-pain|or-extraction|reinfection)/,guide:'/retreatment.html'},
 {pattern:/^(?:abrasion-|cervical-)/,guide:'/cervical-abrasion.html'},
 {pattern:/^insurance-/,guide:'/insured-care.html'}
];
let verifiedTopicGuides=0;
for(const filename of fs.readdirSync(healthDir).filter(x=>x.endsWith('.html'))){
 const rule=topicGuideRules.find(x=>x.pattern.test(filename));
 if(!rule)continue;
 const html=fs.readFileSync(path.join(healthDir,filename),'utf8');
 const careStart=html.indexOf('<div data-care-link="true"');
 const careEnd=careStart<0?-1:html.indexOf('</div>',careStart);
 const careBlock=careEnd<0?'':html.slice(careStart,careEnd+6);
 if(!careBlock||!careBlock.includes('href="'+rule.guide+'"')){
  throw new Error('Health article missing matching care guide: '+filename+' -> '+rule.guide);
 }
 if(!careBlock.includes('href="/#philosophy"')||!careBlock.includes('href="tel:0325132875"')||!careBlock.includes('href="/#location"')||!careBlock.includes('검사와 진찰 결과')){
  throw new Error('Health article missing philosophy or examination notice: '+filename);
 }
 if(html.indexOf('data-care-link="true"')!==html.lastIndexOf('data-care-link="true"')){
  throw new Error('Duplicate health article care guide: '+filename);
 }
 verifiedTopicGuides++;
}
console.log('Health-to-care navigation audit passed:',verifiedTopicGuides,'topic-matched articles');
// Keep mobile contact buttons functional on all topic-matched health pages.
for(const filename of fs.readdirSync(healthDir).filter(x=>x.endsWith('.html'))){
 const html=fs.readFileSync(path.join(healthDir,filename),'utf8');
 if(!html.includes('data-care-link="true"'))continue;
 if(!html.includes('name="viewport"')||!html.includes('/assets/style.css?v=')){
  throw new Error('Health article missing mobile viewport or versioned CSS: '+filename);
 }
 const careStart=html.indexOf('<div data-care-link="true"');
 const careEnd=html.indexOf('</div>',careStart);
 const panel=careEnd<0?'':html.slice(careStart,careEnd+6);
 if(!panel.includes('class="health-care-actions"')||!panel.includes('href="tel:0325132875"')||!panel.includes('href="/#location"')){
  throw new Error('Health article missing mobile contact actions: '+filename);
 }
}

// Verify every searchable destination exists and the main care journeys remain connected.
const searchDestinations=JSON.parse(fs.readFileSync(path.join(out,'content/search-index-46.json'),'utf8'));
for(const entry of searchDestinations){
 if(typeof entry.url!=='string'||!entry.url.startsWith('/'))throw new Error('Invalid search destination: '+JSON.stringify(entry.url));
 const target=path.join(out,entry.url.slice(1)||'index.html');
 if(!fs.existsSync(target)&&!fs.existsSync(path.join(target,'index.html')))throw new Error('Missing searchable page: '+entry.url);
}
const careJourneys={
 'gum-treatment.html':['/health/gum-bleeding.html','/health/scaling-vs-periodontal.html','/#location','tel:0325132875'],
 'retreatment.html':['/health/root-canal-after-pain.html','/health/root-canal-retreatment.html','/#location','tel:0325132875'],
 'cervical-abrasion.html':['/health/abrasion-sensitive.html','/health/abrasion-gi.html','/#location','tel:0325132875']
};
for(const [page,links] of Object.entries(careJourneys)){
 const html=fs.readFileSync(path.join(out,page),'utf8');
 for(const link of links)if(!html.includes('href="'+link+'"'))throw new Error('Missing care navigation: '+page+' -> '+link);
}
// Keep the homepage symptom-to-information-to-care-to-contact pathway intact.
const homepageHtml=fs.readFileSync(path.join(out,'index.html'),'utf8');
const symptomSection=homepageHtml.match(/<section[^>]*id=["']symptoms["'][^>]*>([\s\S]*?)<\/section>/)?.[1];
if(!symptomSection)throw new Error('Homepage symptom guide section is missing');
const symptomCards=[...symptomSection.matchAll(/<div class="card">([\s\S]*?)<\/div>/g)].map(m=>m[1]);
if(symptomCards.length!==6)throw new Error('Expected six homepage symptom cards; found '+symptomCards.length);
for(const [index,card] of symptomCards.entries()){
 if(!/href=["']\/health\/[^"']+\.html["']/.test(card))throw new Error('Symptom card '+(index+1)+' lacks a health article');
 if(!/href=["']\/(?:gum-treatment|retreatment|cervical-abrasion|insured-care)\.html["']/.test(card))throw new Error('Symptom card '+(index+1)+' lacks a treatment guide');
}
for(const link of ['href="tel:0325132875"','href="#location"']){
 if(!symptomSection.includes(link))throw new Error('Symptom guide missing contact link '+link);
}
if(!homepageHtml.includes('id="location"'))throw new Error('Homepage location anchor is missing');
console.log('Homepage symptom journey audit passed:',symptomCards.length,'cards and contact links');
// Validate in-page menu and hero shortcuts, which otherwise look clickable but may scroll nowhere.
const homepageAnchors=new Set([...homepageHtml.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]));
for(const sectionName of ['navlinks','hero-actions','mobile-quick']){
 const section=homepageHtml.match(new RegExp('<div class="'+sectionName+'"[^>]*>([\\s\\S]*?)<\\/div>'))?.[1];
 if(!section)throw new Error('Homepage navigation group missing: '+sectionName);
 for(const match of section.matchAll(/href=["']#([^"']+)["']/g)){
  if(!homepageAnchors.has(match[1]))throw new Error('Broken homepage '+sectionName+' anchor: #'+match[1]);
 }
}
console.log('Homepage menu and hero anchor audit passed');

// Check that all telephone links use the clinic's published number and homepage anchors exist.
const contactIssues=new Set();
const homeIds=new Set([...homepageHtml.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]));
function auditContactLinks(folder){
 for(const item of fs.readdirSync(folder,{withFileTypes:true})){
  const file=path.join(folder,item.name);
  if(item.isDirectory()){auditContactLinks(file);continue}
  if(!item.isFile()||!item.name.endsWith('.html'))continue;
  const html=fs.readFileSync(file,'utf8');
  const relative=path.relative(out,file);
  for(const match of html.matchAll(/href=["']tel:([^"']+)["']/gi)){
   if(match[1].replace(/[^\d]/g,'')!=='0325132875')contactIssues.add(relative+': unexpected phone '+match[1]);
  }
  for(const match of html.matchAll(/href=["']\/#([^"']+)["']/g)){
   if(!homeIds.has(match[1]))contactIssues.add(relative+': missing homepage anchor #'+match[1]);
  }
 }
}
auditContactLinks(out);
if(contactIssues.size)throw new Error('Contact navigation audit failed:\n'+[...contactIssues].slice(0,30).join('\n'));
console.log('Contact navigation audit passed: clinic phone and homepage anchors');
if(brokenLinks.size)throw new Error('Build contains '+brokenLinks.size+' broken local links');
console.log('Navigation audit passed:',searchDestinations.length,'search destinations and 3 care journeys');
// Validate sitemap URLs against generated pages and their canonical addresses.
const sitemapXml=fs.readFileSync(path.join(out,'sitemap.xml'),'utf8');
const sitemapUrls=[...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
if(!sitemapUrls.length)throw new Error('Sitemap contains no URLs');
const uniqueSitemapUrls=new Set();
for(const url of sitemapUrls){
 if(uniqueSitemapUrls.has(url))throw new Error('Duplicate sitemap URL: '+url);
 uniqueSitemapUrls.add(url);
 const prefix='https://ejoeundental.pages.dev/';
 if(!url.startsWith(prefix))throw new Error('Sitemap URL outside current Pages host: '+url);
 const relative=decodeURIComponent(url.slice(prefix.length));
 if(relative.includes('..')||relative.includes('?')||relative.includes('#'))throw new Error('Unexpected sitemap path: '+url);
 const page=path.join(out,relative||'index.html');
 const htmlFile=fs.existsSync(page)&&fs.statSync(page).isFile()?page:path.join(page,'index.html');
 if(!fs.existsSync(htmlFile))throw new Error('Sitemap page missing: '+url);
 const html=fs.readFileSync(htmlFile,'utf8');
 const canonical=html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
 if(canonical!==url)throw new Error('Sitemap and canonical mismatch: '+url+' vs '+canonical);
}
const publishedRobots=fs.readFileSync(path.join(out,'robots.txt'),'utf8');
if(!publishedRobots.includes('Sitemap: https://ejoeundental.pages.dev/sitemap.xml'))throw new Error('Robots sitemap location mismatch');
console.log('Sitemap audit passed:',sitemapUrls.length,'canonical-aligned published pages');
console.log('Build complete:',posts.length,'articles');
