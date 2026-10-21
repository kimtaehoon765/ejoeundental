// Build a separate, NOT publicly deployable owner reference bundle.
// Protect the entire deployed site with server-side authentication (e.g. Cloudflare Access).
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const out=path.join(root,'.private-dist');
const pages=[
  "dental-equipment.html",
  "handpiece-maintenance.html",
  "suction-maintenance.html",
  "compressor-maintenance.html",
  "autoclave-maintenance.html",
  "curing-light-maintenance.html",
  "scaler-maintenance.html",
  "dental-chair-maintenance.html",
  "intraoral-camera-maintenance.html",
  "dental-xray-maintenance.html",
  "dental-materials.html",
  "glass-ionomer-guide.html",
  "root-canal-materials-guide.html",
  "composite-bonding-guide.html",
  "impression-materials-guide.html",
  "dental-cements-guide.html",
  "endodontic-instruments-guide.html",
  "periodontal-instruments-guide.html",
  "extraction-instruments-guide.html",
  "equipment-log.html"
];
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const name of pages){
 const source=path.join(root,name);
 if(!fs.existsSync(source))throw new Error('Missing owner document: '+name);
 let html=fs.readFileSync(source,'utf8');
 // Original links are absolute-root paths and remain valid at the private site root.
 if(!/<meta\s+name=["']robots["']/i.test(html))html=html.replace(/<head>/i,'<head><meta name="robots" content="noindex,nofollow,noarchive">');
 fs.writeFileSync(path.join(out,name),html);
}
const groups=[['장비·기구 관리',pages.slice(0,10)],['재료·술식 참고',pages.slice(10,19)],['기록',pages.slice(19)]];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const sections=groups.map(([title,list])=>'<section><h2>'+title+'</h2><ul>'+list.map(name=>'<li><a href="/'+encodeURIComponent(name)+'">'+esc(name.replace('.html','').replaceAll('-',' '))+'</a></li>').join('')+'</ul></section>').join('');
// Build a lightweight full-text index without external services or subscriptions.
const index=pages.map(name=>{
 const source=fs.readFileSync(path.join(root,name),'utf8');
 const title=source.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]||name;
 const body=source.replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi,' ').replace(/<style\\b[^>]*>[\\s\\S]*?<\\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\\s+/g,' ').trim();
 return {name,title,body:body.slice(0,60000)};
});
fs.writeFileSync(path.join(out,'search-index.json'),JSON.stringify(index));
const html='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>이조은치과 | 원장 전용 자료실</title><style>body{font:16px/1.7 system-ui,sans-serif;max-width:860px;margin:0 auto;padding:22px;background:#f5faf8;color:#183c33}input{font:inherit;width:100%;box-sizing:border-box;padding:13px;border:1px solid #a4bfb5;border-radius:8px}a{color:#08674f}li{margin:8px 0}section{background:white;padding:15px 22px;border-radius:12px;margin:20px 0}#none{display:none}</style></head><body><h1>원장 전용 자료실</h1><p>임상 참고·장비·재료·점검대장 본문 통합 검색</p><label for="q">자료 본문 검색</label><input id="q" type="search" placeholder="예: 근관, 큐렛, GI, 핸드피스" autocomplete="off"><p id="count" aria-live="polite"></p><main>'+sections+'</main><script>const q=document.getElementById("q"),count=document.getElementById("count");function filter(){let n=0;document.querySelectorAll("main li").forEach(li=>{const term=q.value.trim().toLocaleLowerCase();const name=decodeURIComponent(li.querySelector("a").getAttribute("href").slice(1));const item=window.ownerIndex?.find(x=>x.name===name);const show=!term||(item?(item.title+" "+item.body).toLocaleLowerCase().includes(term):li.textContent.toLocaleLowerCase().includes(term));li.hidden=!show;if(show)n++});document.querySelectorAll("main section").forEach(section=>{section.hidden=![...section.querySelectorAll("li")].some(li=>!li.hidden)});count.textContent=n+"개 자료"}q.addEventListener("input",filter);fetch("/search-index.json").then(r=>r.ok?r.json():[]).then(data=>{window.ownerIndex=data;filter()}).catch(()=>filter());filter();</script></body></html>';
fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'robots.txt'),'User-agent: *\nDisallow: /\n');
fs.writeFileSync(path.join(out,'_headers'),'/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  X-Content-Type-Options: nosniff\n');
console.log('Prepared '+pages.length+' owner-only pages in .private-dist. NOT authenticated: do not publish without server-side access control.');
