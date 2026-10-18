import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(),out=path.join(root,'dist');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});function cp(src,dst){fs.cpSync(path.join(root,src),path.join(out,dst),{recursive:true})}cp('index.html','index.html');cp('search.html','search.html');cp('gum-treatment.html','gum-treatment.html');cp('cervical-abrasion.html','cervical-abrasion.html');cp('insured-care.html','insured-care.html');cp('retreatment.html','retreatment.html');const retreatmentPath=path.join(out,'retreatment.html');fs.writeFileSync(retreatmentPath,fs.readFileSync(retreatmentPath,'utf8').replace('</body>','<script defer src="/assets/retreatment-image-manager.js"></script></body>'));cp('tmj-care.html','tmj-care.html');cp('wisdom-tooth.html','wisdom-tooth.html');for(const page of ['implant.html','pediatric-orthodontics.html','pediatric-dentistry.html'])cp(page,page);cp('assets','assets');for(const page of ['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'])cp(page,page);cp('health','health');fs.mkdirSync(path.join(out,'content'),{recursive:true});cp('content/site.json','content/site.json');cp('admin','admin');const dir=path.join(root,'content/posts'),posts=[];for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.json'))){const post=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));if(post.published!==true)continue;const slug=path.basename(name,'.json');posts.push({...post,slug});const escaped=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const safeImage=typeof post.image==="string"&&/^\/assets\/cms-images\/[\w./%-]+$/i.test(post.image)?post.image:"";const article=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaped(post.title)} | 이조은치과</title><meta name="description" content="${escaped(post.summary||post.body||post.title).slice(0,160)}"><meta property="og:type" content="article"><meta property="og:title" content="${escaped(post.title)} | 이조은치과"><meta property="og:description" content="${escaped(post.summary||post.body||post.title).slice(0,160)}">${safeImage?`<meta property="og:image" content="https://ejoeundental.pages.dev${escaped(safeImage)}">`:""}<link rel="canonical" href="https://ejoeundental.pages.dev/stories/${encodeURIComponent(slug)}/"><link rel="stylesheet" href="/assets/style.css"></head><body><header><nav class="nav"><a class="logo" href="/">이조은치과</a><div class="navlinks"><a href="/#stories">치과 이야기</a><a href="/#location">오시는 길</a></div></nav></header><article class="article"><a class="back" href="/#stories">← 치과 이야기로 돌아가기</a><p class="eyebrow">DENTAL JOURNAL · ${escaped(post.date)}</p><h1>${escaped(post.title)}</h1><p>${escaped(post.summary)}</p><hr style="border:0;border-top:1px solid #d7d9ca;margin:35px 0">${safeImage?`<img src="${escaped(safeImage)}" alt="${escaped(post.title)}" loading="lazy" style="display:block;max-width:100%;height:auto;margin:0 auto 28px;border-radius:14px">`:""}<div class="body" style="white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.85">${escaped(post.body)}</div><p class="notice">이 글은 일반적인 건강 정보이며 진단이나 치료는 개별 진찰 결과에 따라 달라질 수 있습니다.</p></article><footer class="footer"><div class="wrap">이조은치과 · 032-513-2875</div></footer></body></html>`;const dest=path.join(out,'stories',slug);fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,'index.html'),article)}// Publish all curated search entries instead of rebuilding the obsolete seven-page index.
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
const cssVersion='20261018-health-mobile-all';
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
  const updated=html.replace(/(<link\\s+rel=["']canonical["']\\s+href=["'])https:\/\/ejoeundental\\.com(\\/[^"']*["'])/gi,'$1https://ejoeundental.pages.dev$2');
  if(updated!==html)fs.writeFileSync(target,updated);
 }
}
alignCanonicalUrls(out);

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

console.log('Build complete:',posts.length,'articles');
