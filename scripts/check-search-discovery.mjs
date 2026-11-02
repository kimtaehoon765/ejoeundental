// Audit crawlable internal hyperlinks to every published sitemap page.
// Google/Bing may discover pages from the sitemap, but a visible HTML link
// provides a real navigation path for patients and crawlers alike.
// Offline only: never calls search engines or changes the live website.
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,relative,join,sep} from 'node:path';

const dist=resolve('dist');
const origin='https://ejoeundental.com';
const sitemap=readFileSync(join(dist,'sitemap.xml'),'utf8');
const targets=[...sitemap.matchAll(/<url>\s*<loc>(https:\/\/ejoeundental\.com\/[^<]*)<\/loc>/g)]
 .map(m=>m[1]);
if(targets.length<80)throw Error('Unexpectedly small public sitemap: '+targets.length);
function route(url,base=origin+'/'){
 let u;try{u=new URL(url.replace(/&amp;/g,'&'),base)}catch{return null}
 if(u.origin!==origin)return null;
 let p;try{p=decodeURIComponent(u.pathname)}catch{return null}
 p=p.replace(/\/index\.html$/i,'/').replace(/\.html$/i,'');
 if(p.length>1)p=p.replace(/\/+$/,'');
 return p||'/';
}
const intended=new Map();
for(const url of targets){
 const r=route(url);
 if(!r||intended.has(r))throw Error('Duplicate/invalid canonical sitemap target: '+url);
 intended.set(r,url);
}
function pagesAt(dir,acc=[]){
 for(const entry of readdirSync(dir)){
  const p=join(dir,entry);
  if(statSync(p).isDirectory())pagesAt(p,acc);
  else if(p.endsWith('.html'))acc.push(p);
 }
 return acc;
}
const incoming=new Map([...intended.keys()].map(r=>[r,new Set()]));
// A URL only counts as discovered through an indexable, public sitemap page.
// An admin/noindex/search-result page must never provide the only incoming link.
const publicHtmlRoutes=new Set();
let checked=0,htmlCount=0;
for(const file of pagesAt(dist)){
 const html=readFileSync(file,'utf8');
 const rel=relative(dist,file).split(sep).join('/');
 const current=origin+'/'+rel;
 const canonical=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1]||current;
 const self=route(canonical);
 if(!self)continue;
 const head=html.split('</head>')[0];
 const noindex=[...head.matchAll(/<meta\b[^>]*>/gi)].some(match=>{
  const tag=match[0];
  return /\bname\s*=\s*["']robots["']/i.test(tag)&&
   /\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(tag);
 });
 if(!intended.has(self)||noindex)continue;
 publicHtmlRoutes.add(self);
 // Links rendered only through scripts cannot be relied upon for discovery.
 // Likewise, do not count anchors hidden inside HTML comments.
 const document=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
  .replace(/<!--[\s\S]*?-->/g,'');
 const links=[...document.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)];
 for(const m of links){
  const target=route(m[2],current);
  if(!target||target===self||!incoming.has(target))continue;
  incoming.get(target).add(self);
  checked++;
 }
 htmlCount++;
}
const missingPublicHtml=[...intended].filter(([r])=>!publicHtmlRoutes.has(r))
 .map(([,url])=>url);
if(missingPublicHtml.length){
 console.error('Sitemap entries lacking an indexable public HTML page:',
  missingPublicHtml.length);
 for(const url of missingPublicHtml.slice(0,35))console.error(' - '+url);
 process.exitCode=1;
}
const orphan=[...incoming].filter(([,sources])=>sources.size===0)
 .map(([r])=>intended.get(r)).sort();
if(orphan.length){
 console.error('Sitemap pages missing links from other HTML pages:',orphan.length);
 for(const url of orphan.slice(0,60))console.error(' - '+url);
 if(orphan.length>60)console.error(' ... plus '+(orphan.length-60)+' others');
 process.exitCode=1;
}else{
 console.log('Public discovery links verified:',incoming.size,
  'canonical sitemap pages with incoming HTML links;',checked,
  'cross-page link references across',htmlCount,'generated HTML pages.');
}
