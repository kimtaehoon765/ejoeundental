import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(),out=path.join(root,'dist');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});function cp(src,dst){fs.cpSync(path.join(root,src),path.join(out,dst),{recursive:true})}cp('index.html','index.html');cp('search.html','search.html');cp('gum-treatment.html','gum-treatment.html');cp('cervical-abrasion.html','cervical-abrasion.html');cp('insured-care.html','insured-care.html');cp('retreatment.html','retreatment.html');const retreatmentPath=path.join(out,'retreatment.html');fs.writeFileSync(retreatmentPath,fs.readFileSync(retreatmentPath,'utf8').replace('</body>','<script defer src="/assets/retreatment-image-manager.js"></script></body>'));cp('tmj-care.html','tmj-care.html');cp('wisdom-tooth.html','wisdom-tooth.html');for(const page of ['implant.html','pediatric-orthodontics.html','pediatric-dentistry.html'])cp(page,page);cp('assets','assets');for(const page of ['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'])cp(page,page);cp('health','health');
/* Add a consistent route from relevant health articles to the matching clinical guide.
   This modifies only built pages; the source articles remain editorially intact. */
const careLinks=[
 {test:/^(gum-|swollen-gums|scaling-|periodontal-|root-planing|curette-|receding-gums)/,href:'/gum-treatment.html',label:'잇몸치료 진료 안내'},
 {test:/^(root-canal-|tooth-root-|periapical-)/,href:'/retreatment.html',label:'재신경치료 진료 안내'},
 {test:/^(abrasion-|insurance-cervical)/,href:'/cervical-abrasion.html',label:'치경부마모증·GI 진료 안내'},
 {test:/^insurance-/,href:'/insured-care.html',label:'건강보험 진료 안내'}
];
for(const name of fs.readdirSync(path.join(out,'health')).filter(n=>n.endsWith('.html'))){
 const match=careLinks.find(link=>link.test.test(name));
 if(!match)continue;
 const file=path.join(out,'health',name);
 let html=fs.readFileSync(file,'utf8');
 if(html.includes('href="'+match.href+'"'))continue;
 const callout='<aside class="health-care-link" aria-label="관련 진료 안내" style="border:1px solid #cbdccf;border-radius:12px;padding:18px 22px;margin:28px 0;background:#f0f5ef"><strong>관련 진료 안내</strong><p style="margin:8px 0 0"><a href="'+match.href+'">'+match.label+' →</a></p><small>진료 방법과 필요 여부는 검진 결과에 따라 달라질 수 있습니다.</small></aside>';
 if(html.includes('</main>'))html=html.replace('</main>',callout+'</main>');
 fs.writeFileSync(file,html);
}
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
const cssVersion='20261018-faq-symptom-nav-v2';
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
 const link='<p data-care-link="true" style="margin:26px 0;padding:16px 20px;background:#f0f5ef;border-radius:12px"><a href="'+match.href+'" style="font-weight:700;color:#173e35">관련 진료 안내: '+match.label+' →</a></p>';
 if(html.includes('<div class="bottom">'))html=html.replace('<div class="bottom">',link+'<div class="bottom">');
 else if(html.includes('</article>'))html=html.replace('</article>',link+'</article>');
 else continue;
 fs.writeFileSync(target,html);
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
console.log('Build complete:',posts.length,'articles');
