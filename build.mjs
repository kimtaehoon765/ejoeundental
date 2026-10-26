import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {extractSearchText} from './scripts/search-content-extractor.mjs';
import {bookingAction} from './scripts/naver-booking-link.mjs';
import {analyzePublishedStories,canonicalNaverSource} from './scripts/audit-story-uniqueness.mjs';
// Owner-only documents may be omitted ONLY after the authenticated replacement is live.
// A single environment flag is not proof that migration and backups succeeded.
const ownerPrivateReady=process.env.OWNER_LIBRARY_PRIVATE_READY==='1';
const ownerOnlyFiles=["dental-equipment.html","handpiece-maintenance.html","suction-maintenance.html","compressor-maintenance.html","autoclave-maintenance.html","curing-light-maintenance.html","scaler-maintenance.html","dental-chair-maintenance.html","intraoral-camera-maintenance.html","dental-xray-maintenance.html","dental-materials.html","glass-ionomer-guide.html","root-canal-materials-guide.html","composite-bonding-guide.html","impression-materials-guide.html","dental-cements-guide.html","endodontic-instruments-guide.html","periodontal-instruments-guide.html","extraction-instruments-guide.html","equipment-log.html"];

if(ownerPrivateReady && process.env.OWNER_LIBRARY_MIGRATION_VERIFIED!=='YES_PRIVATE_COPY_AND_LOGIN_TESTED'){
 throw new Error('Owner library migration is not verified. Keep the public copy until private files, login, links and CSV backup are confirmed.');
}
const root=process.cwd(),out=path.join(root,'dist');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});function cp(src,dst){fs.cpSync(path.join(root,src),path.join(out,dst),{recursive:true})}cp('_headers','_headers');cp('index.html','index.html');cp('404.html','404.html');cp('favicon.svg','favicon.svg');cp('favicon.ico','favicon.ico');cp('google4b5b71e2b560cac2.html','google4b5b71e2b560cac2.html');cp('clinical-archive.html','clinical-archive.html');cp('stories.html','stories.html');cp('search.html','search.html');cp('medical-history.html','medical-history.html')
cp('visit-guide.html','visit-guide.html');cp('medical-safety-guide.html','medical-safety-guide.html');cp('previsit-checklist.html','previsit-checklist.html');cp('medication-dental-faq.html','medication-dental-faq.html');cp('systemic-disease-dental-faq.html','systemic-disease-dental-faq.html');cp('gum-treatment-faq.html','gum-treatment-faq.html');cp('root-canal-retreatment-faq.html','root-canal-retreatment-faq.html');cp('dental-insurance-faq.html','dental-insurance-faq.html');cp('osteoporosis-medication-dental.html','osteoporosis-medication-dental.html');cp('blood-thinners-dental.html','blood-thinners-dental.html');cp('diabetes-dental-care.html','diabetes-dental-care.html');cp('heart-disease-dental-care.html','heart-disease-dental-care.html');cp('kidney-disease-dental-care.html','kidney-disease-dental-care.html');cp('liver-disease-dental-care.html','liver-disease-dental-care.html');cp('cancer-immunosuppression-dental-care.html','cancer-immunosuppression-dental-care.html');cp('pregnancy-dental-care.html','pregnancy-dental-care.html');if(!ownerPrivateReady)cp('dental-equipment.html','dental-equipment.html');if(!ownerPrivateReady)cp('handpiece-maintenance.html','handpiece-maintenance.html');if(!ownerPrivateReady)cp('suction-maintenance.html','suction-maintenance.html');if(!ownerPrivateReady)cp('compressor-maintenance.html','compressor-maintenance.html');if(!ownerPrivateReady)cp('autoclave-maintenance.html','autoclave-maintenance.html');if(!ownerPrivateReady)cp('curing-light-maintenance.html','curing-light-maintenance.html');if(!ownerPrivateReady)cp('scaler-maintenance.html','scaler-maintenance.html');if(!ownerPrivateReady)cp('dental-chair-maintenance.html','dental-chair-maintenance.html');if(!ownerPrivateReady)cp('intraoral-camera-maintenance.html','intraoral-camera-maintenance.html');if(!ownerPrivateReady)cp('dental-xray-maintenance.html','dental-xray-maintenance.html');if(!ownerPrivateReady)cp('dental-materials.html','dental-materials.html');if(!ownerPrivateReady)cp('glass-ionomer-guide.html','glass-ionomer-guide.html');if(!ownerPrivateReady)cp('root-canal-materials-guide.html','root-canal-materials-guide.html');if(!ownerPrivateReady)cp('composite-bonding-guide.html','composite-bonding-guide.html');if(!ownerPrivateReady)cp('impression-materials-guide.html','impression-materials-guide.html');if(!ownerPrivateReady)cp('dental-cements-guide.html','dental-cements-guide.html');if(!ownerPrivateReady)cp('endodontic-instruments-guide.html','endodontic-instruments-guide.html');if(!ownerPrivateReady)cp('periodontal-instruments-guide.html','periodontal-instruments-guide.html');if(!ownerPrivateReady)cp('extraction-instruments-guide.html','extraction-instruments-guide.html');if(!ownerPrivateReady)cp('equipment-log.html','equipment-log.html');cp('gum-treatment.html','gum-treatment.html');cp('scaling.html','scaling.html');cp('cavity-treatment.html','cavity-treatment.html');cp('tooth-preservation.html','tooth-preservation.html');cp('cervical-abrasion.html','cervical-abrasion.html');cp('insured-care.html','insured-care.html');cp('retreatment.html','retreatment.html');// Resolve optional Pages CMS illustrations during build time instead of fetching
// retreatment-images.json on each patient visit and swapping images after load.
const retreatmentPath=path.join(out,'retreatment.html');
const retreatmentImageConfig=JSON.parse(fs.readFileSync(path.join(root,'assets/retreatment-images.json'),'utf8'));
if(!retreatmentImageConfig||typeof retreatmentImageConfig!=='object'||Array.isArray(retreatmentImageConfig))throw new Error('Invalid CMS retreatment image mapping');
const retreatmentImageKeys=['hero','reason1','reason2','reason3','reason4','step1','step2','step3','step4','closing'];
let retreatmentMarkup=fs.readFileSync(retreatmentPath,'utf8');
const existingIllustrations=[...retreatmentMarkup.matchAll(/<img\b[^>]*\bsrc="(\/assets\/retreatment\/illustration-\d{2}\.webp)"[^>]*>/g)];
if(existingIllustrations.length!==retreatmentImageKeys.length)throw new Error('Retreatment illustration count changed: '+existingIllustrations.length);
let appliedIllustrations=0;
for(let i=0;i<retreatmentImageKeys.length;i++){
 const key=retreatmentImageKeys[i],original=existingIllustrations[i][1];
 const replacement=retreatmentImageConfig[key];
 if(!replacement)continue;
 if(typeof replacement!=='string'||!/^\/assets\/cms-images\/[a-z0-9][a-z0-9._/-]*\.(?:png|jpe?g|webp)$/i.test(replacement)||
   replacement.includes('..')||!fs.existsSync(path.join(root,replacement.slice(1)))) {
  throw new Error('Invalid or missing CMS retreatment image: '+key);
 }
 if(retreatmentMarkup.split('src="'+original+'"').length!==2)throw new Error('Duplicated retreatment image reference: '+original);
 retreatmentMarkup=retreatmentMarkup.replace('src="'+original+'"','src="'+replacement+'"');
 appliedIllustrations++;
}
if(appliedIllustrations)fs.writeFileSync(retreatmentPath,retreatmentMarkup);
console.log('Retreatment illustrations resolved at build time:',appliedIllustrations,'CMS overrides; no runtime swap request');
cp('tmj-care.html','tmj-care.html');cp('wisdom-tooth.html','wisdom-tooth.html');for(const page of ['implant.html','denture.html','pediatric-orthodontics.html','pediatric-dentistry.html'])cp(page,page);cp('assets','assets');for(const page of ['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'])cp(page,page);cp('health','health');cp('noncovered-fees.html','noncovered-fees.html');

// Provide text-only link previews derived from each real medical article.
// Never invent article images, author reviews or treatment outcomes.
{
 const hubs=['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'];
 const articles=fs.readdirSync(path.join(out,'health')).filter(name=>name.endsWith('.html')).map(name=>'health/'+name);
 if(articles.length!==46)throw new Error('Unexpected health article count for social previews: '+articles.length);
 const safeValue=value=>value.replace(/"/g,'&quot;');
 for(const page of [...hubs,...articles]){
  const file=path.join(out,page);
  let html=fs.readFileSync(file,'utf8');
  const title=html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const description=html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1];
  const canonical=html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  if(!title||!description||!/^https:\/\/ejoeundental\.com\/[a-z0-9/_-]+\.html$/i.test(canonical)){
   throw new Error('Missing authentic page info for social preview: '+page);
  }
  const fields=[
   ['property','og:type','article'],
   ['property','og:locale','ko_KR'],
   ['property','og:site_name','이조은치과'],
   ['property','og:title',title],
   ['property','og:description',description],
   ['property','og:url',canonical],
   ['name','twitter:card','summary'],
   ['name','twitter:title',title],
   ['name','twitter:description',description]
  ];
  let additions='';
  for(const [attr,name,value] of fields){
   const matches=[...html.matchAll(new RegExp('<meta\\s+'+attr+'="'+name+'"\\s+content="[^"]*"\\s*\\/?>','gi'))];
   if(matches.length>1)throw new Error('Duplicate social meta: '+page+' '+name);
   if(matches.length===0)additions+='<meta '+attr+'="'+name+'" content="'+safeValue(value)+'">';
  }
  if(additions){
   if(!html.includes('</head>'))throw new Error('Missing head in '+page);
   html=html.replace('</head>',additions+'</head>');
   fs.writeFileSync(file,html);
  }
 }
 console.log('Social link previews checked for',articles.length,'patient articles and',hubs.length,'topic hubs');
}

// Patient-first reading accessibility: progressive enhancement for all 46
// health articles and four topic indexes. No server calls or visitor tracking.
// Keep ordinary browser zoom intact and leave every article readable without JS.
{
 const readingPanel='<div class="reading-controls" role="group" aria-label="본문 글자 크기 조절">'+
  '<span class="reading-label" aria-hidden="true">글자 크기</span>'+
  '<button type="button" data-reading-size="normal" aria-pressed="true">기본</button>'+
  '<button type="button" data-reading-size="large" aria-pressed="false">크게</button>'+
  '<button type="button" data-reading-size="extra" aria-pressed="false">아주 크게</button></div>';
 const readingScriptFile=path.join(out,'assets/reading-controls.js');
 const scriptHash=createHash('sha256').update(fs.readFileSync(readingScriptFile)).digest('hex').slice(0,12);
 const hubs=['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'];
 const healthArticles=fs.readdirSync(path.join(out,'health')).filter(name=>name.endsWith('.html')).map(name=>'health/'+name);
 if(healthArticles.length!==46)throw new Error('Unexpected count of patient health articles for reading accessibility: '+healthArticles.length);
 for(const relative of [...hubs,...healthArticles]){
  const filename=path.join(out,relative);
  let html=fs.readFileSync(filename,'utf8');
  const main=html.match(/<main\b[^>]*class=["']article["'][^>]*>/i)?.[0];
  if(!main || html.includes('class="reading-controls"'))throw new Error('Patient reading control target is missing or duplicated: '+relative);
  html=html.replace(main,main+readingPanel);
  html=html.replace('</head>','<link rel="stylesheet" href="/assets/reading-controls.css"></head>');
  html=html.replace('</body>','<script defer src="/assets/reading-controls.js?v='+scriptHash+'"></script></body>');
  fs.writeFileSync(filename,html);
 }
 console.log('Accessible optional reading-size controls added:',hubs.length,'topic hubs and',healthArticles.length,'health guides');
}

// Optional native sharing and article link copy for every patient guide.
// Never require a login, open a third-party tracker, or auto-copy any data.
{
 const markup='<div class="article-share-actions" role="group" aria-label="이 건강정보 공유하기" hidden>'+
  '<button type="button" data-article-action="share" hidden>📤 글 공유하기</button>'+
  '<button type="button" data-article-action="copy" hidden>🔗 글 링크 복사</button>'+
  '<button type="button" data-article-action="print" hidden>🖨 건강정보 인쇄</button>'+
  '<span class="article-share-status" role="status" aria-live="polite"></span></div>';
 const script=path.join(out,'assets/article-sharing.js');
 const fingerprint=createHash('sha256').update(fs.readFileSync(script)).digest('hex').slice(0,12);
 const topics=['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'];
 const articles=fs.readdirSync(path.join(out,'health')).filter(x=>x.endsWith('.html')).map(x=>'health/'+x);
 if(articles.length!==46)throw new Error('Unexpected patient share page count: '+articles.length);
 for(const relative of [...topics,...articles]){
  const filename=path.join(out,relative);
  let html=fs.readFileSync(filename,'utf8');
  const main=html.match(/<main\b[^>]*class=["']article["'][^>]*>/i)?.[0];
  const canonical=html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  if(!main||!canonical?.startsWith('https://ejoeundental.com/')||
     html.includes('class="article-share-actions"')){
   throw new Error('Missing or duplicate canonical sharing target: '+relative);
  }
  html=html.replace(main,main+markup);
  html=html.replace('</head>','<link rel="stylesheet" href="/assets/article-sharing.css"></head>');
  const isArticle=relative.startsWith('health/');
  const returnTarget=isArticle?'article-main':'health-hub-main';
  const backLabel=isArticle?'글 처음으로 돌아가기':'건강정보 목록 처음으로 돌아가기';
  if(html.includes('class="article-return-nav"')||
     html.split('</main>').length!==2){
   throw new Error('Patient article return navigation is missing or duplicated: '+relative);
  }
  html=html.replace('</main>',
   '<nav class="article-return-nav" aria-label="건강정보 탐색">'+
   '<a href="#'+returnTarget+'">↑ '+backLabel+'</a></nav></main>');
  html=html.replace('</body>','<script defer src="/assets/article-sharing.js?v='+fingerprint+'"></script></body>');
  fs.writeFileSync(filename,html);
 }
 console.log('Optional link sharing enabled for',articles.length,'health guides and',topics.length,'patient hubs');
}

// The first viewport on mobile should show the article title and clinical
// summary, not a stack of utility controls before the title. Keep both optional
// toolbars available directly after the introductory paragraph instead.
{
 const hubs=['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'];
 const articles=fs.readdirSync(path.join(out,'health')).filter(x=>x.endsWith('.html')).map(x=>'health/'+x);
 if(articles.length!==46)throw new Error('Unexpected patient first-screen layout article count: '+articles.length);
 let moved=0;
 for(const relative of [...hubs,...articles]){
  const target=path.join(out,relative);
  let html=fs.readFileSync(target,'utf8');
  const panelPattern=/(<main\b[^>]*class=["']article["'][^>]*>)(<div class="article-share-actions"[\s\S]*?<\/div>)(<div class="reading-controls"[\s\S]*?<\/div>)/;
  const panels=html.match(panelPattern);
  if(!panels)throw new Error('Expected stacked controls directly after article main: '+relative);
  html=html.replace(panelPattern,panels[1]);
  const mainStart=html.indexOf(panels[1]);
  const headingClose=html.indexOf('</h1>',mainStart);
  if(headingClose<mainStart||headingClose-mainStart>2400)throw new Error('Patient article heading missing: '+relative);
  const intro=html.slice(headingClose+5).match(/^\s*<p(?:\s[^>]*)?>[\s\S]*?<\/p>/i);
  if(!intro || intro[0].length>1800)throw new Error('Patient article opening summary missing: '+relative);
  const at=headingClose+5+intro[0].length;
  const controls=panels[3]+panels[2]; // Reading size, then article sharing.
  html=html.slice(0,at)+controls+html.slice(at);
  fs.writeFileSync(target,html);
  moved++;
 }
 console.log('Patient-first mobile reading layout: opening summary precedes tools on',moved,'pages');
}

// Generate a public fee list only from explicitly published, complete entries.
const feeFolder=path.join(root,'content/fees');
const feeSources=fs.existsSync(feeFolder)?fs.readdirSync(feeFolder).filter(n=>n.endsWith('.json')).map(name=>({name,row:JSON.parse(fs.readFileSync(path.join(feeFolder,name),'utf8'))})):[];
const feeEntries=[];
const feeKeys=new Set();
for(const {name,row} of feeSources){
 if(row.published!==true)continue;
 const category=String(row.category||'기타').trim()||'기타';
 const item=String(row.item||'').trim();
 const price=String(row.price||'').trim();
 if(!item||!price)throw new Error('Published fee missing treatment name or price: '+name);
 const key=category+'\\u0000'+item;
 if(feeKeys.has(key))throw new Error('Duplicate published fee category and item: '+category+' / '+item);
 feeKeys.add(key);
 feeEntries.push({category,item,detail:String(row.detail||'').trim(),price,note:String(row.note||'').trim()});
}
fs.mkdirSync(path.join(out,'content'),{recursive:true});
feeEntries.sort((a,b)=>a.category.localeCompare(b.category,'ko')||a.item.localeCompare(b.item,'ko'));fs.writeFileSync(path.join(out,'content/fees-index.json'),JSON.stringify({items:feeEntries,updated:''},null,2));
// Publish clinic-confirmed fees in the initial HTML so visitors, screen readers,
// and search engines do not depend on a late JavaScript fetch to see prices.
{
 const feePage=path.join(out,'noncovered-fees.html');
 let feeHtml=fs.readFileSync(feePage,'utf8');
 const feeMarker='<!-- BUILD_FEE_TABLES -->';
 if(feeHtml.split(feeMarker).length!==2)throw new Error('Fee page HTML placeholder missing');
 if(feeHtml.includes('src="/assets/fees.js"'))throw new Error('Runtime fee fetch must not overwrite static disclosure');
 const escapeFee=str=>String(str??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 }[char]));
 const groups=new Map();
 for(const row of feeEntries){
  if(!groups.has(row.category))groups.set(row.category,[]);
  groups.get(row.category).push(row);
 }
 // Keep the standard treatment prices first and the less-used certificates
 // at the end. Both categories remain published in the same accessible HTML.
 const orderedFeeGroups=[...groups.entries()].sort(([a],[b])=>
  Number(a==='제증명수수료')-Number(b==='제증명수수료'));
 const feeTables=orderedFeeGroups.map(([category,rows],index)=>{
  const id=category==='제증명수수료'?' id="fees-certificates"':
   index===0?' id="fees-treatments"':'';
  const cells=rows.map(row=>'<tr><th scope="row">'+escapeFee(row.item)+'</th><td>'+
    escapeFee(row.detail||'—')+'</td><td class="price">'+escapeFee(row.price)+'</td></tr>'+
    (row.note?'<tr><td colspan="3" class="fees-row-note">※ '+escapeFee(row.note)+'</td></tr>':'')).join('');
  return '<section class="fees-category" aria-label="'+escapeFee(category)+' 비용 안내">'+
   '<h2'+id+'>'+escapeFee(category)+'</h2>'+
   '<table class="fees-table"><caption class="sr-only">'+escapeFee(category)+' 비용 안내</caption>'+
   '<thead><tr><th scope="col">항목</th><th scope="col">내용</th><th scope="col">비용</th></tr></thead>'+
   '<tbody>'+cells+'</tbody></table></section>';
 }).join('');
 if(!feeTables.includes('id="fees-certificates"')||!feeTables.includes('id="fees-treatments"'))throw new Error('Treatment or certificate fee section not rendered');
 if(orderedFeeGroups.at(-1)?.[0]!=='제증명수수료'||orderedFeeGroups[0]?.[0]==='제증명수수료')throw new Error('Certificate fees must appear after treatment fees');
 feeHtml=feeHtml.replace(feeMarker,feeTables);
 feeHtml=feeHtml.replace('공개된 비급여 비용을 안내합니다.','공개된 비급여 비용 및 제증명수수료 '+feeEntries.length+'개 항목을 안내합니다.');
 if(feeHtml.includes(feeMarker))throw new Error('Unrendered fee table placeholder');
 fs.writeFileSync(feePage,feeHtml);
 console.log('Static price disclosure rendered:',feeEntries.length,'fee items in',groups.size,'categories');
}

// Link to the public fee disclosure from the homepage without disturbing the design.
const feesHomePath=path.join(out,'index.html');
let feesHome=fs.readFileSync(feesHomePath,'utf8');
if(!feesHome.includes('href="/noncovered-fees.html"')){
 feesHome=feesHome.replace(/<\/footer>/i,'<p style="text-align:center;padding:12px"><a href="/noncovered-fees.html">비급여 진료비용 및 제증명수수료 안내</a></p></footer>');
 fs.writeFileSync(feesHomePath,feesHome);
}
fs.mkdirSync(path.join(out,'content'),{recursive:true});cp('content/site.json','content/site.json');

// Contact and Naver blog destinations are published directly in HTML so
// visitors have correct information even with JavaScript disabled. Reject any
// profile drift at build time instead of fetching site.json on every page view.
{
 const config=JSON.parse(fs.readFileSync(path.join(out,'content/site.json'),'utf8'));
 const page=fs.readFileSync(path.join(out,'index.html'),'utf8');
 const check=(valid,detail)=>{if(!valid)throw new Error('Homepage static contact mismatch: '+detail);};
 const address=String(config.address||'').trim();
 const phone=String(config.phone||'').trim();
 const telDigits=phone.replace(/\D/g,'');
 check(address.length>10&&phone.length>8,'verified clinic fields missing');
 for(const id of ['address','footer_address']){
  check(page.includes('<p id="'+id+'">'+address+'</p>'),id+' differs from content/site.json');
 }
 check(page.includes('<a id="phone" href="tel:'+telDigits+'">'+phone+'</a>'),'main telephone text or link differs');
 for(let i=1;i<=3;i++){
  const blog=String(config['blog'+i]||'');
  let url;
  try{url=new URL(blog);}catch{throw new Error('Invalid clinic blog URL: blog'+i);}
  check(url.protocol==='https:'&&!url.username&&!url.password&&
   (url.hostname==='naver.com'||url.hostname.endsWith('.naver.com')),
   'blog'+i+' is not a safe Naver URL');
  check(page.includes('<a id="blog'+i+'" href="'+blog+'"'),
   'blog'+i+' HTML destination differs from verified clinic profile');
 }
 check(!page.includes('src="/assets/site.js'), 'unnecessary runtime settings fetch still loaded');
 console.log('Verified first-paint clinic contact and three Naver blogs without runtime fetch');
}

// Downloadable clinic contact card: always derive phone and physical address
// from the checked-in verified clinic profile, never duplicate stale details.
// VCF is static, needs no cookies, scripts, external apps or paid services.
{
 const profile=JSON.parse(fs.readFileSync(path.join(root,'content/site.json'),'utf8'));
 const name='이조은치과의원';
 const phone=String(profile.phone||'').trim();
 const address=String(profile.address||'').trim();
 if(!/^0[0-9-]{7,15}$/.test(phone)||
    !address.includes('세월천로 34')||!address.includes('대우프라자 305호')){
  throw new Error('Verified clinic contact details required for downloadable contact card');
 }
 const escapeField=value=>String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 const fields=[
  'BEGIN:VCARD','VERSION:3.0','FN:'+escapeField(name),
  'N:'+escapeField(name)+';;;;','ORG:'+escapeField(name),
  'TEL;TYPE=WORK,VOICE:'+phone,
  'ADR;TYPE=WORK:;;'+escapeField(address)+';;;;대한민국',
  'URL:https://ejoeundental.com/','END:VCARD'
 ];
 // Fold at UTF-8 character boundaries to meet the vCard 75-octet line limit.
 function foldVcard(line){
  let segments=[''];
  for(const character of line){
   const current=segments.length-1;
   if(Buffer.byteLength(segments[current]+character,'utf8')>73){
    segments.push(' '+character);
   }else segments[current]+=character;
  }
  return segments.join('\r\n');
 }
 fs.writeFileSync(path.join(out,'clinic-contact.vcf'),fields.map(foldVcard).join('\r\n')+'\r\n','utf8');
 console.log('Clinic vCard generated from verified name, address and phone');
}
cp('admin','admin');const dir=path.join(root,'content/posts'),posts=[];
const loadedPostSources=fs.readdirSync(dir).filter(x=>x.endsWith('.json'))
 .map(name=>({name,post:JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'))}));
const storyUniqueness=analyzePublishedStories(loadedPostSources.map(({name,post})=>({
 ...post,slug:path.basename(name,'.json')
})));
if(storyUniqueness.duplicates.length){
 const details=storyUniqueness.duplicates.map(item=>
  item.first+' vs '+item.second+' ('+item.reason+')').join('; ');
 throw new Error('Refusing to publish duplicated dental articles: '+details);
}
if(storyUniqueness.nearMatches.length)
 console.warn('Potentially overlapping patient stories to review:',
  storyUniqueness.nearMatches.slice(0,4));
console.log('Unique published patient story sources:',storyUniqueness.published);
// Duplicated original sources are rejected earlier; never silently omit a post.
const publishedSources=loadedPostSources.filter(({post})=>post.published===true)
 .sort((a,b)=>String(a.post.date||'').localeCompare(String(b.post.date||''))||a.name.localeCompare(b.name));// Related stories are selected from verified, published local articles only.
// Matching the headline keeps the suggestions topic-specific without claiming
// medical equivalence or copying claims from the source Naver articles.
// Render authored plain-text patient education as real HTML paragraphs and
// subsection headings. Avoid treating body text as HTML, and preserve all words.
// Only clearly marked/question headings become H2; every other block stays a P.
function renderPatientStoryBody(value,escapeText){
 const blocks=String(value||'').replace(/\r\n?/g,'\n').trim().split(/\n[ \t]*\n+/).filter(Boolean);
 let headingIndex=0;
 const headingMarkup=label=>'<h2 id="story-section-'+(++headingIndex)+'">'+escapeText(label)+'</h2>';
 return blocks.map(block=>{
  const text=block.trim();
  const heading=text.match(/^■\s*(.+)$/u);
  if(heading&&!text.includes('\n')&&heading[1].trim().length<=150){
   return headingMarkup(heading[1].trim());
  }
  const question=/^[^\n]{5,95}[?？]$/.test(text);
  const ordinal=/^(?:첫째|둘째|셋째|넷째|다섯째),\s*[^\n]{4,115}$/.test(text);
  if(question||ordinal)return headingMarkup(text);
  const rows=text.split('\n').map(x=>x.trim()).filter(Boolean);
  if(rows.length>=2&&rows.every(x=>/^[•●]\s*/u.test(x))){
   return '<ul>'+rows.map(row=>'<li>'+escapeText(row.replace(/^[•●]\s*/u,''))+'</li>').join('')+'</ul>';
  }
  return '<p>'+escapeText(text)+'</p>';
 }).join('\n');
}
const relatedStoryCategories=[
  ['gum',/잇몸|치주|스케일링|치석|치은|큐렛/],
  ['root',/재신경치료|신경치료|근관치료|치수/],
  ['implant',/임플란트|뼈이식|상악동/],
  ['denture',/틀니|의치/],
  ['wisdom',/사랑니|지혈제|드라이소켓/],
  ['cavity',/충치|치경부|마모증|수복|레진|글라스아이오노머|지르코니아|크라운|시린|치아파절|치아가 부러|부러진|깨진/],
  ['safety',/수면치료|진정치료|마취|위험|환자 안전/],
  ['choice',/리뷰|과잉진료|진료비|가격|비용|광고|할인|양심|보험|선결제|치과 선택|치과 찾|저렴/]
];
// The treatment that leads a Korean headline is the reader's search intent.
 // "인천신경치료｜잇몸에 고름..." belongs with root-canal treatment even though
 // the symptom description contains "잇몸". Use this only when the title gives
 // a clear lead topic; all other titles retain the original category matching.
const storyTitleIntent=title=>{
 const first=String(title||'').split(/[｜|:：]/u)[0];
 const intents=[
  ['root',/재신경치료|신경치료|근관치료/],
  ['gum',/잇몸치료|치주치료|스케일링|치주염/],
  ['implant',/임플란트/],
  ['denture',/틀니|의치/],
  ['wisdom',/사랑니/],
  ['cavity',/충치치료|치경부마모증|치아패임|치아파절|시린이/],
 ];
 return intents.find(([,pattern])=>pattern.test(first))?.[0]||'';
};
// Preserve a tooth-first headline as its own patient question rather than
// filing it under 'choosing a dentist' or 'implant' merely for mentioning them.
// A specific lead treatment (gum, root canal, cavity, etc.) takes priority.
const storyPreservationIntent=title=>!storyTitleIntent(title)&&
 /자연치아|치아[ 를]*살리|치아[의 ]*보존|발치[ 하기]*전|발치와 임플란트/.test(String(title||''));
const relatedStoryTopic=title=>storyTitleIntent(title)||
 (storyPreservationIntent(title)?'preserve':'')||
 relatedStoryCategories.find(([,pattern])=>pattern.test(String(title||'')))?.[0]||'other';
const storyDirectoryTopic=title=>{
 const intent=storyTitleIntent(title);
 return (storyPreservationIntent(title)?'preserve':'')||
  ({implant:'prosthetic',denture:'prosthetic',root:'root',gum:'gum',
   wisdom:'wisdom',cavity:'cavity'})[intent]||'';
};
const storyDirectoryLabels={
 gum:'잇몸치료·스케일링',root:'신경치료·재신경치료',
 cavity:'충치·시린 이·수복치료',preserve:'자연치아 보존·발치 전 확인',prosthetic:'틀니·임플란트',
 wisdom:'사랑니 발치·지혈',choice:'치과 선택·건강보험·진료 원칙',
 other:'그 밖의 진료 이야기'
};
// A few distinctive clinical concepts are better similarity cues than repeating
// locality words like "부평치과". Titles are weighted higher than summaries;
// the algorithm never creates new content or crosses a medical topic just for SEO.
const storyClinicalConcepts=[
 ['bleeding',/출혈|피가\s*나|피나요|피가\s*나요/],
 ['swelling',/잇몸\s*붓|잇몸\s*부|붓기|부종|부어/],
 ['pus',/고름|누공|농양/],
 ['pocket',/치주낭/],
 ['mobility',/흔들리는|흔들려|흔들림|동요도/],
 ['scaling',/스케일링|치석제거/],
 ['curette',/큐렛|치근활택/],
 ['sensitivity',/시린|시림|시려/],
 ['abrasion',/치경부|마모증|패인\s*치아|패였/],
 ['gi',/글라스아이오노머|\bGI\b|지아이/],
 ['resin',/레진/],
 ['crack',/금\s*간\s*치아|균열|파절|부러진|깨졌/],
 ['extraction',/발치|이를\s*빼|뽑아/],
 ['retreatment',/재신경치료|재근관치료/],
 ['rootcanal',/신경치료|근관치료/],
 ['post',/포스트/],
 ['crown',/크라운|보철물/],
 ['rootlesion',/치근단|뿌리\s*끝|검은\s*그림자/],
 ['denturefit',/헐거운|헐거워|틀니\s*통증|틀니\s*조정/],
 ['partialdenture',/부분틀니/],
 ['implant',/임플란트/],
 ['bonegraft',/뼈이식|상악동/],
 ['wisdom',/사랑니/],
 ['hemostatic',/지혈제|지혈/],
 ['insurance',/보험|급여/],
 ['overtreatment',/과잉진료|선결제|할인/],
 ['reviews',/리뷰|후기|광고/],
];
const relatedStoryCatalog=publishedSources.map(({name,post},index)=>({
 slug:path.basename(name,'.json'),title:String(post.title||''),
 summary:String(post.summary||''),topic:relatedStoryTopic(post.title),index,
 titleSignals:new Set(storyClinicalConcepts.filter(([,re])=>re.test(String(post.title||''))).map(([k])=>k)),
 summarySignals:new Set(storyClinicalConcepts.filter(([,re])=>re.test(String(post.summary||''))).map(([k])=>k))
}));
const storyRelatedCssVersion=createHash('sha256')
 .update(fs.readFileSync(path.join(root,'assets','story-related.css')))
 .digest('hex').slice(0,12);
const storyArticleCssVersion=createHash('sha256')
 .update(fs.readFileSync(path.join(root,'assets','story-article.css')))
 .digest('hex').slice(0,12);
// Optional, privacy-preserving font-size and share/copy/print for clinic patient stories.
const storyAssetHashes={};
for(const file of ['reading-controls.css','reading-controls.js','article-sharing.css','article-sharing.js']){
 storyAssetHashes[file]=createHash('sha256')
  .update(fs.readFileSync(path.join(root,'assets',file))).digest('hex').slice(0,12);
}
const ownerStoryReadingPanel='<div class="reading-controls" role="group" aria-label="본문 글자 크기 조절">'+
 '<span class="reading-label" aria-hidden="true">글자 크기</span>'+
 '<button type="button" data-reading-size="normal" aria-pressed="true">기본</button>'+
 '<button type="button" data-reading-size="large" aria-pressed="false">크게</button>'+
 '<button type="button" data-reading-size="extra" aria-pressed="false">아주 크게</button></div>';
const ownerStorySharingPanel='<div class="article-share-actions" role="group" aria-label="이 치과 이야기 공유하기" hidden>'+
 '<button type="button" data-article-action="share" hidden>📤 글 공유하기</button>'+
 '<button type="button" data-article-action="copy" hidden>🔗 글 링크 복사</button>'+
 '<button type="button" data-article-action="print" hidden>🖨 글 인쇄</button>'+
 '<span class="article-share-status" role="status" aria-live="polite"></span></div>';
for(const {name,post} of publishedSources){const slug=path.basename(name,'.json');
if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(slug))throw new Error('Invalid published journal filename: '+name);
if(typeof post.title!=='string'||!post.title.trim()||typeof post.body!=='string'||!post.body.trim())throw new Error('Published journal article requires title and body: '+name);
if(post.date){
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(post.date));
 if(!match)throw new Error('Invalid published journal date: '+name);
 const [year,month,day]=match.slice(1).map(Number);
 const actual=new Date(Date.UTC(year,month-1,day));
 if(year<100||actual.getUTCFullYear()!==year||actual.getUTCMonth()!==month-1||actual.getUTCDate()!==day)throw new Error('Nonexistent published journal date: '+name);
}
if(post.updated){
 const changed=String(post.updated);
 const parsed=/^(\d{4})-(\d{2})-(\d{2})$/.exec(changed);
 if(!parsed)throw new Error('Invalid journal updated date: '+name);
 const [y,m,d]=parsed.slice(1).map(Number);
 const dt=new Date(Date.UTC(y,m-1,d));
 if(y<100||dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)
  throw new Error('Nonexistent journal updated date: '+name);
 if(post.date&&changed<post.date)throw new Error('Journal updated date precedes original publication: '+name);
}
posts.push({...post,slug});const escaped=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const safeImage=typeof post.image==="string"&&/^\/assets\/cms-images\/[\w./%-]+$/i.test(post.image)&&!post.image.includes('..')&&!/%2f|%5c|%2e/i.test(post.image)&&fs.existsSync(path.join(root,post.image.slice(1)))?post.image:"";const articleDescription=escaped(String(post.summary||post.body||post.title||'').replace(/\s+/g,' ').trim().slice(0,155));
const articleUrl='https://ejoeundental.pages.dev/stories/'+encodeURIComponent(slug)+'/';
const articleSchema={'@context':'https://schema.org','@type':'BlogPosting',headline:String(post.title||''),description:String(post.summary||post.body||post.title||'').replace(/\s+/g,' ').trim().slice(0,155),mainEntityOfPage:articleUrl,inLanguage:'ko-KR',isPartOf:{'@type':'WebSite',name:'이조은치과',url:'https://ejoeundental.pages.dev/'},publisher:{'@type':'Dentist','@id':'https://ejoeundental.pages.dev/#clinic',name:'이조은치과',url:'https://ejoeundental.pages.dev/',telephone:'+82-32-513-2875'}};
const verifiedStoryAuthor=String(JSON.parse(fs.readFileSync(path.join(root,'content/site.json'),'utf8')).footer_representative||'').trim();
if(verifiedStoryAuthor){
 // All published original clinic stories consistently identify the same real
 // clinician shown on the homepage. This is an identity link, not a claim
 // of a newly reviewed or individually authored generic health guide.
 articleSchema.author={'@type':'Person','@id':'https://ejoeundental.pages.dev/#doctor-person',
  name:verifiedStoryAuthor,jobTitle:'치과의사·통합치의학과 전문의',
  url:'https://ejoeundental.pages.dev/#doctor',
  worksFor:{'@id':'https://ejoeundental.pages.dev/#clinic'}};
}
if(post.date)articleSchema.datePublished=post.date;
if(post.updated||post.date)articleSchema.dateModified=post.updated||post.date;
if(safeImage)articleSchema.image='https://ejoeundental.pages.dev'+safeImage;
const originalBlogKey=canonicalNaverSource(post.source_url);
const safeSourceBlog=originalBlogKey?'https://blog.naver.com/'+originalBlogKey:'';
if(safeSourceBlog)articleSchema.isBasedOn=safeSourceBlog;
const articleJson=JSON.stringify(articleSchema).replace(/</g,'\\u003c');
const breadcrumbSchema={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'홈',item:'https://ejoeundental.pages.dev/'},{'@type':'ListItem',position:2,name:'치과 이야기',item:'https://ejoeundental.pages.dev/stories.html'},{'@type':'ListItem',position:3,name:String(post.title),item:articleUrl}]};
const breadcrumbJson=JSON.stringify(breadcrumbSchema).replace(/</g,'\\u003c');
const articleSourceNote=safeSourceBlog?
 '<aside class="notice" aria-label="원문 출처"><strong>원장 블로그 원문</strong><p>'+
 (post.source_note==='topic_only'
  ?'원장이 작성한 네이버 블로그 글의 제목과 주제를 참고해 새로 작성한 환자 교육 글입니다. 원문을 직접 복제하거나 요약한 글은 아닙니다. '
  :post.source_note==='screenshots_summary'
   ?'원장이 제공한 네이버 블로그 본문 사진을 읽고 핵심 의견을 정리한 글입니다. 일부 의학적 설명은 근거 자료를 참고하여 보완했습니다. '
   :'이 글은 원장이 작성한 네이버 블로그 글을 환자 교육용으로 요약·재구성했습니다. ')+
 '<a href="'+escaped(safeSourceBlog)+'" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a></p></aside>':'';
// This post was already appended to the chronological published posts array.
const currentArticleIndex=posts.length-1;
const articlePrev=currentArticleIndex>0?posts[currentArticleIndex-1]:null;
const laterPublishedSource=publishedSources[currentArticleIndex+1]||null;
const articleNext=laterPublishedSource?
 {slug:path.basename(laterPublishedSource.name,'.json'),title:laterPublishedSource.post.title}:null;
const articleTopic=[post.title,post.summary,String(post.body||'').slice(0,800)].filter(Boolean).join(' ');
const currentStoryTopic=relatedStoryTopic(post.title);
const headlineGroup=storyDirectoryTopic(post.title)||
 (['gum','root','cavity','preserve','wisdom','choice'].includes(currentStoryTopic)?
 currentStoryTopic:['implant','denture'].includes(currentStoryTopic)?'prosthetic':'other');
const articleCategoryLink='<p class="story-category"><a href="/stories.html#topic-'+
 headlineGroup+'" style="color:#245a44;font-weight:700">치과 이야기 · '+
 escaped(storyDirectoryLabels[headlineGroup]||storyDirectoryLabels.other)+' →</a></p>';
const primaryCareByTopic={
 gum:['잇몸치료 안내','/gum-treatment.html'],
 root:['신경치료·재신경치료 안내','/retreatment.html'],
 cavity:['충치치료 안내','/cavity-treatment.html'],
 preserve:['자연치아 보존·발치 전 확인','/tooth-preservation.html'],
 implant:['임플란트 안내','/implant.html'],
 denture:['틀니 안내','/denture.html'],
 wisdom:['사랑니 발치 안내','/wisdom-tooth.html'],
 safety:['진료 전 안전 안내','/medical-safety-guide.html'],
 choice:['건강보험·치료 선택 안내','/insured-care.html']
};
const primaryCare=(/치경부|마모증|시린/.test(String(post.title||''))&&currentStoryTopic==='cavity')?
 ['시린 이·치경부마모증 안내','/cervical-abrasion.html']:
 primaryCareByTopic[currentStoryTopic]||null;
const additionalCare=[
 // Keep tooth-saving guidance visible beside the main treatment, even when
 // the summary also mentions root canals. The sidebar shows at most two links.
 [/자연치아|치아.{0,20}살릴|치아.{0,20}살리|발치\s*전|치아를 보존|치아가 조금 남아도/,['자연치아 보존·발치 전 확인','/tooth-preservation.html']],
 [/잇몸|치주|스케일링/,['잇몸치료 안내','/gum-treatment.html']],
 [/신경치료|재신경|근관/,['신경치료·재신경치료 안내','/retreatment.html']],
 [/충치/,['충치치료 안내','/cavity-treatment.html']],
 [/치경부|시린|마모증/,['시린 이·치경부마모증 안내','/cervical-abrasion.html']],
 [/보험|급여/,['건강보험 적용 안내','/insured-care.html']],
 [/틀니/,['틀니 안내','/denture.html']],
 [/임플란트/,['임플란트 안내','/implant.html']],
 [/사랑니/,['사랑니 안내','/wisdom-tooth.html']]
].filter(([pattern,link])=>pattern.test([post.title,post.summary||''].join(' '))&&link[1]!==primaryCare?.[1])
 .map(([,link])=>link);
const careLinks=[primaryCare,...additionalCare].filter(Boolean)
 .filter((link,index,list)=>list.findIndex(x=>x[1]===link[1])===index).slice(0,2);
const articleTopicNavigation=careLinks.length?'<aside class="notice" aria-label="관련 진료 안내"><strong>관련 진료 안내</strong><p>'+
 careLinks.map(([label,url])=>'<a href="'+url+'">'+label+' →</a>').join(' · ')+'</p></aside>':'';
// Recommendations prioritize a distinctive shared clinical question within
// the same treatment area. Never suggest a draft, the same article, or make
// the same three most-recent links appear on every distinct patient question.
const ownConcepts=new Set(storyClinicalConcepts.filter(([,re])=>
 re.test(String(post.title||'')+' '+String(post.summary||''))).map(([key])=>key));
const sameTopicStories=relatedStoryCatalog.filter(item=>
 item.slug!==slug&&item.topic===currentStoryTopic);
const relatedPool=sameTopicStories.length?sameTopicStories:
 relatedStoryCatalog.filter(item=>item.slug!==slug);
const scoreRelatedStory=item=>{
 let score=0;
 for(const key of ownConcepts){
  if(item.titleSignals.has(key))score+=4;
  else if(item.summarySignals.has(key))score+=1;
 }
 return score;
};
const suggestedStories=relatedPool.slice().sort((a,b)=>
 scoreRelatedStory(b)-scoreRelatedStory(a)||b.index-a.index).slice(0,3);
const storyRelated=suggestedStories.length?
 '<aside class="story-related" aria-labelledby="related-story-title">'+
 '<h2 id="related-story-title">'+
 (sameTopicStories.length?'같은 주제의 치과 이야기':'다른 치과 이야기')+'</h2>'+
 '<ul>'+suggestedStories.map(item=>
  '<li><a href="/stories/'+encodeURIComponent(item.slug)+'/">'+escaped(item.title)+'</a></li>'
 ).join('')+'</ul></aside>':'';
const journalNavigation='<nav class="notice" aria-label="치과 이야기 탐색">'+
 (articlePrev?'<p>← 이전 치과 이야기: <a href="/stories/'+encodeURIComponent(articlePrev.slug)+'/">'+escaped(articlePrev.title)+'</a></p>':'')+
 (articleNext?'<p>다음 치과 이야기: <a href="/stories/'+encodeURIComponent(articleNext.slug)+'/">'+escaped(articleNext.title)+'</a> →</p>':'')+
 '<p><a href="/stories.html">치과 이야기 전체 글 목록 →</a> · <a href="/search.html">건강정보 검색 →</a></p></nav>';
const renderedStoryBody=renderPatientStoryBody(post.body,escaped);
const articleHeadings=[...renderedStoryBody.matchAll(/<h2 id="(story-section-\d+)">([\s\S]*?)<\/h2>/g)]
 .map(match=>({id:match[1],label:match[2]}));
const storyToc=articleHeadings.length>=3?
 '<details class="story-toc"><summary>이 글의 내용 바로가기 ('+articleHeadings.length+'개 항목)</summary>'+
 '<nav aria-label="글 목차">'+articleHeadings.map(section=>
  '<a href="#'+section.id+'">'+section.label+'</a>').join('')+'</nav></details>':'';
const article=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaped(post.title)} | 이조은치과</title><meta name="description" content="${articleDescription}"><meta property="og:type" content="article">${post.date?`<meta property="article:published_time" content="${escaped(post.date)}">`:""}<meta property="og:title" content="${escaped(post.title)} | 이조은치과"><meta property="og:description" content="${articleDescription}">${safeImage?`<meta property="og:image" content="https://ejoeundental.pages.dev${escaped(safeImage)}">`:""}<meta property="og:url" content="${articleUrl}"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="이조은치과"><meta name="twitter:card" content="${safeImage?'summary_large_image':'summary'}"><meta name="twitter:title" content="${escaped(post.title)} | 이조은치과"><meta name="twitter:description" content="${articleDescription}"><script type="application/ld+json">${articleJson}</script><script type="application/ld+json">${breadcrumbJson}</script><link rel="canonical" href="https://ejoeundental.pages.dev/stories/${encodeURIComponent(slug)}/"><link rel="stylesheet" href="/assets/style.css"><link rel="stylesheet" href="/assets/story-related.css?v=${storyRelatedCssVersion}"><link rel="stylesheet" href="/assets/story-article.css?v=${storyArticleCssVersion}"><link rel="stylesheet" href="/assets/reading-controls.css?v=${storyAssetHashes['reading-controls.css']}"><link rel="stylesheet" href="/assets/article-sharing.css?v=${storyAssetHashes['article-sharing.css']}"><meta name="referrer" content="strict-origin-when-cross-origin"></head><body class="owner-story-page"><a class="skip-link" href="#main-content">본문 바로가기</a><header><nav class="nav" aria-label="주요 메뉴"><a class="logo" href="/">이조은치과</a><div class="navlinks"><a href="/stories.html">치과 이야기</a><a href="/search.html">건강정보 검색</a><a href="/#location">오시는 길</a></div></nav></header><main id="main-content"><article class="article"><nav aria-label="현재 위치" class="back"><a href="/">홈</a> › <a href="/stories.html">치과 이야기</a> › <span aria-current="page">${escaped(post.title)}</span></nav><p class="eyebrow">DENTAL JOURNAL${post.date?` · <time datetime="${escaped(post.date)}">${escaped(post.date)}</time>`:""}${post.updated&&post.updated!==post.date?` · 내용 수정 <time datetime="${escaped(post.updated)}">${escaped(post.updated)}</time>`:""}</p><h1>${escaped(post.title)}</h1>${articleCategoryLink}${verifiedStoryAuthor?`<p style="font-size:14px;line-height:1.7;color:#4e6658">자료 제공: 이조은치과 원장 ${escaped(verifiedStoryAuthor)}</p>`:""}${typeof post.summary==="string"&&post.summary.trim()?`<p>${escaped(post.summary.trim())}</p>`:""}${ownerStoryReadingPanel}${ownerStorySharingPanel}<hr style="border:0;border-top:1px solid #d7d9ca;margin:35px 0">${safeImage?`<img src="${escaped(safeImage)}" alt="${escaped(post.title)}" loading="lazy" decoding="async" style="display:block;max-width:100%;height:auto;margin:0 auto 28px;border-radius:14px">`:""}${storyToc}<section class="story-prose" aria-label="치과 이야기 본문">${renderedStoryBody}</section><p class="notice">이 글은 일반적인 건강 정보이며 진단이나 치료는 개별 진찰 결과에 따라 달라질 수 있습니다.</p><aside class="notice" aria-label="진료 문의"><strong>진료가 필요하신가요?</strong><br>원장이 직접 검진하고 필요한 치료부터 안내합니다.<br><a href="tel:0325132875">전화 문의 032-513-2875</a> · <a href="/#location">진료시간·오시는 길</a><br><small>격주 금요일·토요일 진료 일정은 방문 전 전화로 확인해 주세요.</small></aside>${articleSourceNote}${articleTopicNavigation}${storyRelated}${journalNavigation}<nav class="article-return-nav" aria-label="치과 이야기 탐색"><a href="#main-content">↑ 글 처음으로 돌아가기</a></nav></article></main><nav class="story-mobile-actions" aria-label="전화 문의와 진료 위치 안내"><a class="story-mobile-call" href="tel:0325132875">☎ 전화 문의</a><a class="story-mobile-location" href="/#location">진료시간·오시는 길 →</a></nav><footer class="footer"><div class="wrap">이조은치과 · <a href="tel:0325132875">032-513-2875</a> · <a href="/#location">진료시간·오시는 길</a></div></footer><script defer src="/assets/reading-controls.js?v=${storyAssetHashes['reading-controls.js']}"></script><script defer src="/assets/article-sharing.js?v=${storyAssetHashes['article-sharing.js']}"></script></body></html>`;const dest=path.join(out,'stories',slug);fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,'index.html'),article)}// Publish all curated search entries instead of rebuilding the obsolete seven-page index.
// Search only substantive main-content text: shared navigation and footers must not create false matches.
const entries=JSON.parse(fs.readFileSync(path.join(root,'content/search-index-46.json'),'utf8'));
for(const entry of entries){
 if(!entry||typeof entry.url!=='string'||typeof entry.title!=='string')throw new Error('Invalid search index entry');
 const local=entry.url==='/'?'index.html':entry.url.replace(/^\/+/, '');
 if(!local||local.includes('..'))continue;
 const htmlFile=path.join(out,local);
 if(fs.existsSync(htmlFile)&&htmlFile.endsWith('.html')){
  const rendered=fs.readFileSync(htmlFile,'utf8');
  entry.body=extractSearchText(rendered);
  if(entry.url==='/'){
    // Home is a curated clinic-search entry. Its title and description must
    // never lag behind the actual HTML shown to Google and Naver.
    const title=rendered.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    const description=rendered.match(/<meta name="description" content="([^"]+)"/i)?.[1]?.trim();
    if(!title||!description)throw new Error('Missing canonical clinic metadata for search index');
    entry.title=title;entry.description=description;
  }
}
}
// The public sitemap includes standalone FAQ, safety, visit and story-index pages that
// were missing from the website's own search. Add only this explicit allowlist:
// never sweep admin, owner-only maintenance files, or unpublished documents into
// the public index. Article text comes from <main>, not global navigation.
const publicStandaloneSearchSlugs=["visit-guide","medical-safety-guide","previsit-checklist","gum-treatment-faq","root-canal-retreatment-faq","dental-insurance-faq","medical-history","osteoporosis-medication-dental","blood-thinners-dental","diabetes-dental-care","heart-disease-dental-care","kidney-disease-dental-care","liver-disease-dental-care","cancer-immunosuppression-dental-care","pregnancy-dental-care","noncovered-fees","medication-dental-faq","systemic-disease-dental-faq","clinical-archive","stories","tooth-preservation"];
const sourceSitemapForSearch=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
for(const slug of publicStandaloneSearchSlugs){
 const sourceUrl='https://ejoeundental.com/'+slug+'.html';
 if(!sourceSitemapForSearch.includes('<loc>'+sourceUrl+'</loc>')){
  throw new Error('Cannot index standalone content absent from the public sitemap: '+slug);
 }
 const indexUrl='/'+slug+'.html';
 if(entries.some(item=>item.url===indexUrl)){
  throw new Error('Duplicate curated and standalone public search URL: '+indexUrl);
 }
 const file=path.join(out,slug+'.html');
 if(!fs.existsSync(file))throw new Error('Missing public standalone search page: '+slug);
 const page=fs.readFileSync(file,'utf8');
 if(/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(page)){
  throw new Error('Refusing to index noindex standalone page: '+slug);
 }
 const title=page.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
 const description=page.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();
 const body=extractSearchText(page);
 if(!title||!description||body.length<100){
  throw new Error('Missing real public patient search content: '+slug);
 }
 entries.push({url:indexUrl,title,description,body});
}
console.log('Public patient FAQ and safety pages indexed:',publicStandaloneSearchSlugs.length,'pages');

// Include every published journal article in on-site search, not just the curated static pages.
const searchUrls=new Set(entries.map(entry=>entry.url));
if(searchUrls.size!==entries.length)throw new Error('Duplicate URL in curated search index');
for(const entry of entries){
 if(!entry.url.startsWith('/')||entry.url.includes('..')||entry.url.includes('?')||entry.url.includes('#'))throw new Error('Unsafe search URL: '+entry.url);
 const relative=entry.url==='/'?'index.html':entry.url.slice(1);
 const candidate=path.join(out,relative);
 const target=fs.existsSync(candidate)&&fs.statSync(candidate).isFile()?candidate:path.join(candidate,'index.html');
 if(!fs.existsSync(target)||!target.endsWith('.html'))throw new Error('Search result points to missing published page: '+entry.url);
}
for(const post of posts){
 const url='/stories/'+encodeURIComponent(post.slug)+'/';
 if(searchUrls.has(url))continue;
 entries.push({url,title:String(post.title||''),description:String(post.summary||''),body:String(post.body||'').slice(0,12000)});
 searchUrls.add(url);
}
fs.writeFileSync(path.join(out,'content/search-index.json'),JSON.stringify(entries,null,2));
fs.writeFileSync(path.join(out,'content/search-index-46.json'),JSON.stringify(entries,null,2));
// Every downstream consumer (home featured stories, topic directory, care links,
// RSS) must respect newest-first ordering. Regression tests assert this invariant.
posts.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||a.slug.localeCompare(b.slug));
// A compact, public, cache-versioned full-text corpus exclusively for the
// published clinic stories directory. Only download when a visitor starts
// searching; initial page reading does not need to transfer entire articles.
// The source is the same CMS posts that generated the real article pages.
const storySearchData=JSON.stringify({
 version:1,
 entries:posts.map(post=>({slug:post.slug,body:String(post.body||'').trim()}))
});
const storySearchHash=createHash('sha256').update(storySearchData).digest('hex').slice(0,12);
fs.writeFileSync(path.join(out,'content/story-search-text.json'),storySearchData,'utf8');
console.log('Published-story full-text search index:',posts.length,'articles');

// Render the CMS journal cards at build time. The three evergreen patient-education
// tiles remain visible and are never replaced after the page loads.
const journalHomePath=path.join(out,'index.html');
let journalHomeHtml=fs.readFileSync(journalHomePath,'utf8');
const journalMarker='<!-- BUILD_PUBLIC_STORIES -->';
if(journalHomeHtml.split(journalMarker).length!==2)throw new Error('Missing unique homepage CMS journal marker');
const escapeJournal=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const latestJournal=posts.slice(0,6);
const journalCards=latestJournal.map(post=>{
 const title=escapeJournal(post.title);
 const when=post.date?'<time class="date" datetime="'+escapeJournal(post.date)+'">'+escapeJournal(post.date)+'</time>':'';
 const summary=String(post.summary||post.body||'').replace(/\s+/g,' ').trim().slice(0,175);
 return '<a class="card post-card" href="/stories/'+encodeURIComponent(post.slug)+'/">'+when+
  '<h3>'+title+'</h3>'+(summary?'<p>'+escapeJournal(summary)+'</p>':'')+'</a>';
}).join('');
// The homepage previously displayed only six published articles. All remaining
// published owner stories now appear as smaller, accessible title links after
// the first six cards. There is no fetch, pagination, or hidden extra page.
const extraJournal=posts.slice(latestJournal.length).map(post=>
 '<a class="journal-extra-entry" href="/stories/'+encodeURIComponent(post.slug)+'/">'+
 '<span>'+escapeJournal(post.title)+'</span><span aria-hidden="true">→</span></a>'
).join('');
const olderJournal=extraJournal?
 '<details class="journal-extra-details" aria-label="홈페이지 이전 게시글 전체">'+
 '<summary>지난 홈페이지 글 '+(posts.length-latestJournal.length)+'편 펼쳐보기 <span aria-hidden="true">⌄</span></summary>'+
 '<div class="journal-extra-list"><h4>이전 홈페이지 글 '+(posts.length-latestJournal.length)+'편</h4>'+
 extraJournal+'</div></details>'+
 '<p class="journal-more-link"><a href="/stories.html">치과 이야기 전체 목록에서 주제별로 찾기 →</a></p>':'';
const countMarkers=(journalHomeHtml.match(/<!-- BUILD_HOME_STORY_COUNT -->/g)||[]).length;
if(countMarkers!==3)throw new Error('Homepage journal total labels are missing or duplicated');
const storyLinkMarkers=(journalHomeHtml.match(/<!-- BUILD_STORY_LINK_COUNT -->/g)||[]).length;
if(storyLinkMarkers!==3)throw new Error('Homepage link accessible labels must use verified published story counts');
journalHomeHtml=journalHomeHtml.replaceAll('<!-- BUILD_STORY_LINK_COUNT -->',String(posts.length));

// New patient education should be discoverable from the homepage immediately,
// even while the complete archive remains behind the compact details control.
// Each link is a real crawlable HTML anchor to a published post, not a keyword
// list or a JavaScript-generated card.
// Four distinct patient questions on the homepage. Natural-tooth preservation
// must lead to an actual article in that topic rather than a generic cavity post.
const recentTopicDefinitions=[
 {name:'잇몸치료·스케일링',match:/잇몸|치주|스케일링|치석|치은|큐렛/},
 {name:'신경치료·재신경치료',match:/신경치료|재신경|근관|치수/},
 {name:'충치·수복치료',match:/충치|치경부|마모증|시린|레진|치아 균열/},
 {name:'자연치아 보존',topic:'preserve'}
];
const recentTopicStories=[];
for(const group of recentTopicDefinitions){
 const found=posts.find(post=>
  (group.topic?storyDirectoryTopic(post.title)===group.topic:
    group.match.test(String(post.title||'')))&&
  !recentTopicStories.some(other=>other.slug===post.slug));
 if(found)recentTopicStories.push({...found,topicLabel:group.name});
}
const visibleRecentNav=recentTopicStories.length?
 '<nav class="journal-recent-topics" aria-label="최근 게시글 중 주요 진료 주제별 안내">'+
 '<strong>최근 정리한 환자 질문</strong>'+
 recentTopicStories.map(post=>
  '<a href="/stories/'+encodeURIComponent(post.slug)+'/">'+
  '<span>'+escapeJournal(post.topicLabel)+'</span>'+
  '<span>'+escapeJournal(post.title)+'</span></a>').join('')+
 '</nav>':'';
const homeStoryHeading='<h3 class="home-story-group-heading">홈페이지에서 직접 읽는 글</h3>';
if(journalHomeHtml.split(homeStoryHeading).length!==2)throw new Error('Missing unique home journal heading');
journalHomeHtml=journalHomeHtml.replace(homeStoryHeading,homeStoryHeading+visibleRecentNav);

journalHomeHtml=journalHomeHtml.replaceAll('<!-- BUILD_HOME_STORY_COUNT -->',String(posts.length));
journalHomeHtml=journalHomeHtml.replace(journalMarker,journalCards+olderJournal||
 '<p class="clinic-native-empty">아직 공개된 홈페이지 치과 이야기 글이 없습니다. 진료 건강정보는 위에서 확인할 수 있습니다.</p>');
fs.writeFileSync(journalHomePath,journalHomeHtml);
console.log('Homepage journal entries rendered without browser fetch:',posts.length,'including',latestJournal.length,'featured cards');

// Build a separate clinic-story directory from the same verified published CMS
// posts used by /stories/{slug}/. All titles are visible in static HTML without JS.
// This intentionally keeps 333 external original Naver blog links as a separate
// archive, so the count of homepage articles is not confused with those links.
{
 const groups=[
  {id:'gum',name:'잇몸치료·스케일링',match:/잇몸|치주|스케일링|치석|치은|큐렛/},
  {id:'root',name:'신경치료·재신경치료',match:/신경치료|근관|치수|재신경/},
  {id:'cavity',name:'충치·시린 이·수복치료',match:/충치|시린|마모증|레진|GI|글라스아이오노머|크라운|지르코니아|치아파절|치아가 부러|부러진|깨진/i},
  {id:'preserve',name:'자연치아 보존·발치 전 확인',match:/자연치아|치아를 살리|치아 보존|발치 전/},
  {id:'prosthetic',name:'틀니·임플란트',match:/틀니|임플란트|뼈이식|인공치아/},
  {id:'wisdom',name:'사랑니 발치·지혈',match:/사랑니|지혈제|드라이소켓/},
  {id:'choice',name:'치과 선택·건강보험·진료 원칙',match:/치과 선택|잘하는 치과|치과를|진료비|비용|광고|리뷰|과잉진료|양심|보험|진료 원칙|치과 찾|치과 고르|할인/},
  {id:'other',name:'그 밖의 진료 이야기',match:null}
 ];
 const grouped=new Map(groups.map(group=>[group.id,[]]));
 for(const post of posts){
  const title=String(post.title||'');
  const lead=storyDirectoryTopic(title);
  const match=lead?groups.find(group=>group.id===lead):
   groups.find(group=>group.match&&group.match.test(title));
  grouped.get(match?.id||'other').push(post);
 }
 const active=groups.filter(group=>grouped.get(group.id).length);
 const nav='<nav class="topic-jump" aria-label="글 주제 바로가기">'+
  active.map(group=>'<a href="#topic-'+group.id+'">'+group.name+' ('+grouped.get(group.id).length+')</a>').join('')+
  '</nav>';
 const sections=active.map(group=>{
  const collection=[...grouped.get(group.id)];
  const cards=collection.map(post=>{
   const title=escapeJournal(post.title);
   const summary=escapeJournal(String(post.summary||post.body||'').replace(/\s+/g,' ').trim().slice(0,190));
   const date=post.date?'<time datetime="'+escapeJournal(post.date)+'">'+escapeJournal(post.date)+'</time>':'';
   return '<a class="story-card" href="/stories/'+encodeURIComponent(post.slug)+'/">'+date+
    '<h3>'+title+'</h3>'+(summary?'<p>'+summary+'</p>':'')+'<span class="read">홈페이지 글 읽기 →</span></a>';
  }).join('');
  return '<section class="story-topic" id="topic-'+group.id+'" aria-labelledby="topic-heading-'+group.id+'">'+
   '<div class="story-topic-heading"><h2 id="topic-heading-'+group.id+'">'+group.name+'</h2>'+
   '<span>'+collection.length+'편</span></div><div class="story-grid">'+cards+'</div></section>';
 }).join('');
 // Derive the original Naver count from the homepage's actual blog cards,
 // not from a manually maintained integer that can go stale as links are added.
 const homepageStoryHtml=fs.readFileSync(path.join(out,'index.html'),'utf8');
 const originalBlogSection=homepageStoryHtml.match(/<section class="section light" id="stories">([\s\S]*?)<\/section>/)?.[1]||'';
 const blogEntries=[...originalBlogSection.matchAll(
  /<div class="card owner-story-card"><h3><a href="https:\/\/blog\.naver\.com\/(kook765|tele654|radio654)\/(\d+)"/g
 )].map(match=>match[1]+'/'+match[2]);
 const ownerBlogCount=blogEntries.length;
 if(!ownerBlogCount||ownerBlogCount!==new Set(blogEntries).size){
  throw new Error('Original Naver blog collection is missing or contains duplicates');
 }
 const directoryFile=path.join(out,'stories.html');
 let directory=fs.readFileSync(directoryFile,'utf8');
 if(directory.split('<!-- BUILD_NAVER_BLOG_COUNT -->').length!==3)throw new Error('Dental story directory needs two visible original blog count labels');
 for(const marker of ['<!-- BUILD_STORY_COUNT -->','<!-- BUILD_STORY_DIRECTORY -->','<!-- BUILD_STORY_DIRECTORY_SCHEMA -->']){
  if(directory.split(marker).length!==2)throw new Error('Dental story directory marker missing or duplicated: '+marker);
 }
 const itemList={'@type':'ItemList',name:'이조은치과 홈페이지 치과 이야기 전체 글',
  numberOfItems:posts.length,
  itemListElement:posts.map((post,index)=>({
   '@type':'ListItem',position:index+1,name:String(post.title),
   url:'https://ejoeundental.pages.dev/stories/'+encodeURIComponent(post.slug)+'/'
  }))};
 const schema={'@context':'https://schema.org','@type':'CollectionPage',
  name:'치과 이야기 전체 글 | 이조은치과',
  description:'원장이 직접 작성한 치과 진료 이야기와 환자용 건강정보를 주제별로 살펴보는 목록',
  url:'https://ejoeundental.pages.dev/stories.html',
  isPartOf:{'@type':'WebSite',name:'이조은치과',url:'https://ejoeundental.pages.dev/'},
  mainEntity:itemList};
 const escapeJsonScript=value=>JSON.stringify(value).replace(/</g,'\\u003c');
 directory=directory
  .replace('<!-- BUILD_STORY_COUNT -->',String(posts.length))
  .replace('<!-- BUILD_STORY_SEARCH_INDEX_URL -->',
    '/content/story-search-text.json?v='+storySearchHash)
  .replace('story-directory.js?v=20261025-filter1',
    'story-directory.js?v='+createHash('sha256')
     .update(fs.readFileSync(path.join(root,'assets/story-directory.js'))).digest('hex').slice(0,12))
  .replaceAll('<!-- BUILD_NAVER_BLOG_COUNT -->',String(ownerBlogCount))
  .replace('<!-- BUILD_STORY_DIRECTORY -->',nav+sections)
  .replace('<!-- BUILD_STORY_DIRECTORY_SCHEMA -->','<script type="application/ld+json">'+escapeJsonScript(schema)+'</script>');
 fs.writeFileSync(directoryFile,directory);
 // The public search page should report the same verified original Naver count
 // as the story directory. Never leave a stale handwritten count in search help.
 const searchPage=path.join(out,'search.html');
 const searchHtml=fs.readFileSync(searchPage,'utf8');
 const blogCountMarker='<!-- BUILD_NAVER_BLOG_COUNT -->';
 if(searchHtml.split(blogCountMarker).length!==2)
  throw new Error('Search page should contain one original-blog count placeholder');
 fs.writeFileSync(searchPage,searchHtml.replace(blogCountMarker,String(ownerBlogCount)));
 console.log('Search help original blog count synchronized:',ownerBlogCount);
 console.log('Clinic story directory grouped:',posts.length,'published posts across',active.length,'topics;',ownerBlogCount,'linked Naver originals');
}


// Render only clinic-verified legal identifiers in the footer.
// Missing values are intentionally omitted rather than invented or published as placeholders.
{
 const siteIdentity=JSON.parse(fs.readFileSync(path.join(root,'content/site.json'),'utf8'));
 const representative=String(siteIdentity.footer_representative||'').trim();
 const registration=String(siteIdentity.footer_business_registration||'').trim();
 if(representative.length>80 || /[<>]/.test(representative))throw new Error('Invalid verified clinic representative');
 if(registration && !/^\d{3}-\d{2}-\d{5}$/.test(registration))throw new Error('Use verified business registration format 000-00-00000');
 const safe=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const identityRows=[
  representative?'<div><dt>대표자</dt><dd>'+safe(representative)+'</dd></div>':'',
  registration?'<div><dt>사업자등록번호</dt><dd>'+safe(registration)+'</dd></div>':''
 ].join('');
 const footerFile=path.join(out,'index.html');
 const footerHtml=fs.readFileSync(footerFile,'utf8');
 const marker='<!-- VERIFIED_CLINIC_OPERATOR_DETAILS -->';
 if(footerHtml.split(marker).length!==2)throw new Error('Missing verified clinic footer identifier slot');
 fs.writeFileSync(footerFile,footerHtml.replace(marker,identityRows));
 console.log('Homepage verified clinic footer data:',[representative&&'representative',registration&&'registration'].filter(Boolean).join(', ')||'basic confirmed details only');
}


fs.writeFileSync(path.join(out,'content/posts-index.json'),JSON.stringify(posts.map(({slug,title,date,summary,image})=>({slug,title,date,summary,image:typeof image==='string'&&/^\/assets\/cms-images\/[\w./%-]+$/i.test(image)&&!image.includes('..')&&!/%2f|%5c|%2e/i.test(image)&&fs.existsSync(path.join(root,image.slice(1)))?image:''})),null,2));
for(const file of ['sitemap.xml','robots.txt']){const source=path.join(root,file);if(fs.existsSync(source))fs.copyFileSync(source,path.join(out,file))}
// Once the authenticated owner library has been verified, prevent stale public
// sitemap/search listings from advertising removed owner-only documents.
if(ownerPrivateReady){
 const blocked=new Set(ownerOnlyFiles.map(name=>'/'+name));
 for(const name of ['search-index.json','search-index-46.json']){
  const file=path.join(out,'content',name);
  if(!fs.existsSync(file))continue;
  const entries=JSON.parse(fs.readFileSync(file,'utf8'));
  if(Array.isArray(entries))fs.writeFileSync(file,JSON.stringify(entries.filter(item=>!blocked.has(item.url)),null,2));
 }
 const mapPath=path.join(out,'sitemap.xml');
 if(fs.existsSync(mapPath)){
  let xml=fs.readFileSync(mapPath,'utf8');
  for(const name of ownerOnlyFiles){
   const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   xml=xml.replace(new RegExp('\\s*<url>\\s*<loc>https:\\/\\/[^<]+\\/'+escaped+'<\\/loc>\\s*<\\/url>','g'),'');
  }
  fs.writeFileSync(mapPath,xml);
 }
}
// Match the generated robots sitemap pointer to the current Pages preview output.
// Keep the source robots.txt and the future custom-domain configuration unchanged.
const previewRobotsPath=path.join(out,'robots.txt');
if(fs.existsSync(previewRobotsPath)){
 const robots=fs.readFileSync(previewRobotsPath,'utf8');
 fs.writeFileSync(previewRobotsPath,robots.replace(/^Sitemap:[^\r\n]*$/gmi,'Sitemap: https://ejoeundental.pages.dev/sitemap.xml'));
}

// Search is intentionally noindex: exclude it from the sitemap.
const searchSitemapPath=path.join(out,'sitemap.xml');
if(fs.existsSync(searchSitemapPath)){
 let xml=fs.readFileSync(searchSitemapPath,'utf8');
 xml=xml.replace(/\s*<url>\s*<loc>https:\/\/ejoeundental(?:\.pages\.dev|\.com)\/search\.html<\/loc>\s*<\/url>/g,'');
 fs.writeFileSync(searchSitemapPath,xml);
}
// Add only published journal entries to the generated sitemap.
const sitemapPath=path.join(out,'sitemap.xml');
if(fs.existsSync(sitemapPath)){
 const base='https://ejoeundental.pages.dev';
 let sitemap=fs.readFileSync(sitemapPath,'utf8');
 const journalUrls=posts.map(post=>'<url><loc>'+base+'/stories/'+encodeURIComponent(post.slug)+'/</loc>'+
  (post.updated||post.date?'<lastmod>'+(post.updated||post.date)+'</lastmod>':'')+'</url>').join('\n  ');
 sitemap=sitemap.replace('</urlset>',(journalUrls?'  '+journalUrls+'\n':'')+'</urlset>');
 fs.writeFileSync(sitemapPath,sitemap);
}

// Keep the main Monet painting fresh on patient phones after every artwork update.
// The original is shared by the mobile-first preload, framed gallery and CSS
// backgrounds, so all links must use one content-derived version. This prevents
// stale CDN/browser imagery even when the stylesheet itself has not changed.
const impressionistSvgPath=path.join(out,'assets/impressionist-water-garden.svg');
if(!fs.existsSync(impressionistSvgPath))throw new Error('Missing original clinic garden illustration');
const impressionistSvgVersion=createHash('sha256').update(fs.readFileSync(impressionistSvgPath)).digest('hex').slice(0,12);
const impressionistReference='/assets/impressionist-water-garden.svg';
for(const rel of ['index.html','assets/home-enhancements.css']){
 const target=path.join(out,rel);
 const contents=fs.readFileSync(target,'utf8');
 if(!contents.includes(impressionistReference))throw new Error('Missing image reference in '+rel);
 const revised=contents.replace(/\/assets\/impressionist-water-garden\.svg(?:\?v=[0-9a-f]{12})?/g,
  impressionistReference+'?v='+impressionistSvgVersion);
 fs.writeFileSync(target,revised);
}
console.log('Original Monet garden asset fingerprinted in HTML and CSS:',impressionistSvgVersion);

// Fingerprint every first-party stylesheet in built HTML, including the homepage,
// health hubs, mobile navigation, search and clinical topic CSS. A CSS update should
// not require a hand-edited ?v= string or leave phones using an old cached style.
const stylesheetHashCache=new Map();
function versionStylesheets(folder){
 for(const item of fs.readdirSync(folder,{withFileTypes:true})){
  const target=path.join(folder,item.name);
  if(item.isDirectory()){versionStylesheets(target);continue}
  if(!item.isFile()||!item.name.endsWith('.html'))continue;
  const original=fs.readFileSync(target,'utf8');
  const updated=original.replace(/(href=["'])(\/assets\/[\w/-]+\.css)(?:\?[^"']*)?(["'])/g,(tag,start,asset,end)=>{
   const assetFile=path.join(out,asset.slice(1));
   if(!fs.existsSync(assetFile))return tag;
   if(!stylesheetHashCache.has(asset)){
    const hash=createHash('sha256').update(fs.readFileSync(assetFile)).digest('hex').slice(0,12);
    stylesheetHashCache.set(asset,hash);
   }
   return start+asset+'?v='+stylesheetHashCache.get(asset)+end;
  });
  if(updated!==original)fs.writeFileSync(target,updated);
 }
}
versionStylesheets(out);

// Fingerprint search assets so repeat visits can cache them without showing stale new articles.
const searchIndexHash=createHash('sha256').update(fs.readFileSync(path.join(out,'content/search-index.json'))).digest('hex').slice(0,12);
const searchJsPath=path.join(out,'assets/search.js');
const searchJs=fs.readFileSync(searchJsPath,'utf8').replace(/\/content\/search-index\.json(?=['"])/g,'/content/search-index.json?v='+searchIndexHash);
fs.writeFileSync(searchJsPath,searchJs);
const searchScriptHash=createHash('sha256').update(searchJs).digest('hex').slice(0,12);
const searchHtmlPath=path.join(out,'search.html');
let searchHtml=fs.readFileSync(searchHtmlPath,'utf8');
searchHtml=searchHtml.replace(/(src=["']\/assets\/search\.js)(?:\?[^"']*)?(["'])/g,(_,start,end)=>start+'?v='+searchScriptHash+end);
// The patient-site booking search card must use the same vetted Naver
// destination and honest direct-vs-search label as the mobile home CTA.
// This is build-time data only: no client API request or invented booking ID.
const searchBookingConfig=JSON.parse(fs.readFileSync(path.join(root,'content/site.json'),'utf8'));
const searchBookingAction=bookingAction(searchBookingConfig.naver_booking_url);
const bookingAttribute=s=>String(s).replace(/[&<>"']/g,char=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));
const searchResultsMarker='<section id="results" aria-label="홈페이지 검색 결과"></section>';
if(searchHtml.split(searchResultsMarker).length!==2)throw new Error('Search results landmark missing or duplicated');
searchHtml=searchHtml.replace(searchResultsMarker,
 '<section id="results" aria-label="홈페이지 검색 결과"'+
 ' data-booking-url="'+bookingAttribute(searchBookingAction.url)+'"'+
 ' data-booking-label="'+bookingAttribute(searchBookingAction.label)+'"></section>');
fs.writeFileSync(searchHtmlPath,searchHtml);

// Until the custom domain is connected, keep canonical links aligned with the Pages preview site.
// Apply only to generated HTML; the original source pages remain unchanged.
function alignCanonicalUrls(folder){
 for(const item of fs.readdirSync(folder,{withFileTypes:true})){
  const target=path.join(folder,item.name);
  if(item.isDirectory()){alignCanonicalUrls(target);continue}
  if(!item.isFile()||!item.name.endsWith('.html'))continue;
  const html=fs.readFileSync(target,'utf8');
  const updated=html.replace(/(<link\s+rel=["']canonical["']\s+href=["'])https:\/\/ejoeundental\.com(\/[^"']*["'])/gi,'$1https://ejoeundental.pages.dev$2').replace(/(<meta\s+property=["']og:url["']\s+content=["'])https:\/\/ejoeundental\.com(\/[^"']*["'])/gi,'$1https://ejoeundental.pages.dev$2');
  if(updated!==html)fs.writeFileSync(target,updated);
 }
}
alignCanonicalUrls(out);
// The copied homepage contains schema.org URLs written for the public domain.
// During a preview build, align all homepage JSON-LD references with the
// preview canonical as well; production later restores the public domain.
{
 const file=path.join(out,'index.html');
 const before=fs.readFileSync(file,'utf8');
 let count=0;
 const after=before.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(tag,json)=>{
  const schema=JSON.parse(json);
  // Preserve the original formatting and author-article catalog of other blocks.
  if(!['WebSite','Dentist'].includes(schema['@type']))return tag;
  count++;
  return '<script type="application/ld+json">'+
   JSON.stringify(schema).replaceAll('https://ejoeundental.com/','https://ejoeundental.pages.dev/')+
   '</script>';
 });
 if(count!==2)throw new Error('Homepage WebSite and Dentist identity blocks missing: '+count);
 fs.writeFileSync(file,after);
}
// Keep structured FAQ URLs on the same host as the preview canonical and sitemap.
// This only transforms generated output; source pages retain the future custom domain.
for (const slug of ['gum-treatment-faq','root-canal-retreatment-faq','dental-insurance-faq','medication-dental-faq','systemic-disease-dental-faq']) {
 const target=path.join(out,slug+'.html');
 const html=fs.readFileSync(target,'utf8');
 const transformed=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(tag,json)=>{
  const data=JSON.parse(json);
  if(data['@type']!=='FAQPage')throw new Error('Expected FAQPage JSON-LD: '+slug);
  const updated=JSON.stringify(data).replace(/https:\/\/ejoeundental\.com\//g,'https://ejoeundental.pages.dev/');
  return '<script type="application/ld+json">'+updated+'</script>';
 });
 fs.writeFileSync(target,transformed);
}


// Normalize the safety hub's WebPage schema on the preview deployment too.
{
 for (const slug of ['medical-safety-guide','previsit-checklist']) {
 const file=path.join(out,slug+'.html');
 const html=fs.readFileSync(file,'utf8');
 const updated=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(tag,json)=>{
  const data=JSON.parse(json);
  if(data['@type']!=='WebPage')throw new Error('Expected WebPage JSON-LD: '+slug);
  return '<script type="application/ld+json">'+JSON.stringify(data).replace(/https:\/\/ejoeundental\.com\//g,'https://ejoeundental.pages.dev/')+'</script>';
 });
 fs.writeFileSync(file,updated);
 }
}
// Mirror only visible homepage FAQs in machine-readable form for answer engines.
// No extra answers are invented; the source of truth remains the visible FAQ.
const homeFaqPath=path.join(out,'index.html');
let homeFaqHtml=fs.readFileSync(homeFaqPath,'utf8');
const faqSection=homeFaqHtml.match(/<section[^>]*id=["']faq["'][^>]*>([\s\S]*?)<\/section>/i)?.[1];
if(!faqSection)throw new Error('Homepage FAQ section missing');
const stripFaqHtml=value=>value.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const faqPairs=[...faqSection.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/gi)];
if(faqPairs.length===0)throw new Error('No visible FAQ entries found');
const faqSchema={
 '@context':'https://schema.org',
 '@type':'FAQPage',
 '@id':'https://ejoeundental.pages.dev/#faq',
 mainEntity:faqPairs.map(([,question,answer])=>({
  '@type':'Question',
  name:stripFaqHtml(question),
  acceptedAnswer:{'@type':'Answer',text:stripFaqHtml(answer)}
 }))
};
// Refresh an existing FAQPage as well as new FAQs on every build.
// Otherwise a homepage copy edit could silently leave obsolete FAQ answers in JSON-LD.
let updatedHomepageFaqBlocks=0;
homeFaqHtml=homeFaqHtml.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(tag,json)=>{
 const data=JSON.parse(json);
 if(data['@type']!=='FAQPage')return tag;
 updatedHomepageFaqBlocks++;
 return '<script type="application/ld+json">'+JSON.stringify(faqSchema).replace(/</g,'\\u003c')+'</script>';
});
if(updatedHomepageFaqBlocks!==1)throw new Error('Expected exactly one homepage FAQPage JSON-LD block, found '+updatedHomepageFaqBlocks);
fs.writeFileSync(homeFaqPath,homeFaqHtml);
// Stable, patient-shareable FAQ anchors. The questions and answers are
// untouched, preserving the exact visible FAQPage schema synchronization.
{
 const markers=[
  ['부평치과를 알아볼 때','faq-choose-clinic'],
  ['원장님이 직접','faq-direct-diagnosis'],
  ['잇몸에서 피가 나면','faq-gum-bleeding'],
  ['신경치료 후 다시 아픈','faq-root-retreatment'],
  ['치경부마모증은 GI','faq-cervical-gi'],
  ['스케일링이나 잇몸치료도','faq-insured-care'],
  ['치아를 뽑기 전에','faq-save-teeth'],
  ['금요일과 토요일은','faq-alternating-hours'],
  ['산곡역에서 어떻게','faq-sangok-station'],
  ['주차는 가능한가요','faq-parking'],
  ['접수는 진료 종료시간까지','faq-reception-cutoff']
 ];
 if(markers.length!==faqPairs.length)throw new Error('Homepage FAQ anchor map must match real question count');
 for(let index=0;index<markers.length;index++){
  if(!stripFaqHtml(faqPairs[index][1]).startsWith(markers[index][0])){
   throw new Error('Homepage FAQ question changed: verify stable anchor '+markers[index][1]);
  }
 }
 const list=homeFaqHtml.match(/<div class="faq-list">([\s\S]*?)<\/div>/);
 if(!list)throw new Error('FAQ list missing when adding deep links');
 let next=0;
 const updated=list[1].replace(/<details><summary>/g,()=>{
  const marker=markers[next++];
  if(!marker)throw new Error('FAQ count exceeds anchor map');
  return '<details id="'+marker[1]+'"><summary>';
 });
 if(next!==markers.length)throw new Error('Homepage FAQ anchor count differs: '+next);
 homeFaqHtml=homeFaqHtml.replace(list[0],'<div class="faq-list">'+updated+'</div>');
 const shortcuts=[
  ['faq-choose-clinic','치과 선택'],
  ['faq-direct-diagnosis','원장 직접 진단'],
  ['faq-gum-bleeding','잇몸치료'],
  ['faq-root-retreatment','재신경치료'],
  ['faq-insured-care','건강보험'],
  ['faq-alternating-hours','진료시간'],
  ['faq-parking','주차']
 ];
 const nav='<nav class="faq-quick-links" aria-label="자주 묻는 질문 주제 바로가기">'+
  shortcuts.map(([id,label])=>'<a href="#'+id+'">'+label+'</a>').join('')+'</nav>';
 homeFaqHtml=homeFaqHtml.replace('<div class="faq-list">',nav+'<div class="faq-list">');
 const scriptPath=path.join(out,'assets/faq-deep-links.js');
 const hash=createHash('sha256').update(fs.readFileSync(scriptPath)).digest('hex').slice(0,12);
 const cssPath=path.join(out,'assets/faq-deep-links.css');
 const cssHash=createHash('sha256').update(fs.readFileSync(cssPath)).digest('hex').slice(0,12);
 homeFaqHtml=homeFaqHtml.replace('</head>','<link rel="stylesheet" href="/assets/faq-deep-links.css?v='+cssHash+'"></head>');
 homeFaqHtml=homeFaqHtml.replace('</body>','<script defer src="/assets/faq-deep-links.js?v='+hash+'"></script></body>');
}
fs.writeFileSync(homeFaqPath,homeFaqHtml);
console.log('Visible homepage FAQ structured data synchronized:',faqPairs.length,'questions');


// Single-source catalog: mirror the exact 30 published Naver titles and links
// from the homepage into a compact, searchable, topic-based clinical archive.
// Never guess blog post URLs, reviews, dates, diagnoses or patient identities.
const archiveCatalogFile=path.join(out,'clinical-archive.html');
let archiveCatalogHtml=fs.readFileSync(archiveCatalogFile,'utf8');
const archivePostMarker='<!-- BUILD_OWNER_ARCHIVE_GROUPS -->';
if(archiveCatalogHtml.split(archivePostMarker).length!==2){
 throw new Error('Expected one owner-blog archive placeholder');
}
const ownerStoriesHtml=fs.readFileSync(path.join(out,'index.html'),'utf8');
const ownerStoriesSection=ownerStoriesHtml.match(/<section class="section light" id="stories">([\s\S]*?)<\/section>/)?.[1]||'';
const ownerBlogItems=[...ownerStoriesSection.matchAll(/<div class="card owner-story-card"><h3><a href="(https:\/\/blog\.naver\.com\/[a-zA-Z0-9_-]+\/[0-9]+)" target="_blank" rel="noopener noreferrer">([^<]+?) ↗<\/a><\/h3><\/div>/g)]
 .map(([,url,label])=>({
  url,
  title:label.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim()
 }));
if(ownerBlogItems.length!==333||new Set(ownerBlogItems.map(item=>item.url)).size!==333){
 throw new Error('The clinical archive must mirror exactly 333 original owner blog links');
}
const clinicalArchiveGroups=[
 {id:'gum',name:'잇몸치료·스케일링',url:'/gum-health.html',label:'잇몸 건강정보 10편 더 읽기',
  test:title=>/잇몸|스케일링|치주|풍치/.test(title)},
 {id:'root',name:'신경치료·재신경치료',url:'/root-canal-health.html',label:'신경치료 건강정보 10편 더 읽기',
  test:title=>/신경치료|재신경치료|근관치료/.test(title)},
 {id:'ethics',name:'치과 선택과 진료 원칙',url:'/#philosophy',label:'이조은치과 진료 원칙 보기',
  test:title=>/리뷰|양심|과잉진료|많은 치료|비보험|좋은치과|좋은 치과|가격이 싼|치과를 선택|치과마다 치료비|자연치아를 살리는 치과|물티슈/.test(title)},
 {id:'med',name:'치과 약물·전신질환',url:'/medical-history.html',label:'치과치료 전 복용약·전신질환 안내 읽기',
  test:title=>/항히스타민|스테로이드|cox-|프로스타글란딘|NSAID|항혈소판|헤파린|와파린|INR|항응고|DOAC|NOAC|심내막염|당뇨|당화혈색소/i.test(title)},
 {id:'other',name:'충치·시린 이·기타',url:'/additional-health.html',label:'충치·자연치아 건강정보 더 읽기',
  test:()=>true}
];
for(const group of clinicalArchiveGroups)group.items=[];
for(const item of ownerBlogItems){
 const category=clinicalArchiveGroups.find(group=>group.id==='root'&&group.test(item.title))||
  clinicalArchiveGroups.find(group=>group.test(item.title));
 category.items.push(item);
}
if(clinicalArchiveGroups.some(group=>!group.items.length))throw new Error('An original owner-blog topic became empty');
const escArchive=value=>String(value).replace(/[&<>"']/g,char=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const archiveGroupsMarkup=clinicalArchiveGroups.map(group=>
 '<details class="archive-blog-group" id="archive-group-'+group.id+'">'+
 '<summary><strong>'+escArchive(group.name)+'</strong><span class="archive-blog-count">'+group.items.length+'편</span><span class="archive-blog-plus" aria-hidden="true">＋</span></summary>'+
 '<ol>'+group.items.map(item=>
  '<li><a href="'+item.url+'" target="_blank" rel="noopener noreferrer">'+escArchive(item.title)+' ↗</a></li>').join('')+'</ol>'+
 '<p class="archive-blog-related"><a href="'+group.url+'">'+group.label+' →</a></p>'+
 '</details>'
).join('');
archiveCatalogHtml=archiveCatalogHtml.replace(archivePostMarker,archiveGroupsMarkup);
const originalArchiveSchema=archiveCatalogHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if(!originalArchiveSchema)throw new Error('Archive CollectionPage schema missing');
const parsedArchiveSchema=JSON.parse(originalArchiveSchema[1]);
if(parsedArchiveSchema['@type']!=='CollectionPage')throw new Error('Archive schema type mismatch');
parsedArchiveSchema.mainEntity={
 '@type':'ItemList',numberOfItems:ownerBlogItems.length,
 itemListElement:ownerBlogItems.map((item,index)=>({
  '@type':'ListItem',position:index+1,name:item.title,url:item.url
 }))
};
archiveCatalogHtml=archiveCatalogHtml.replace(originalArchiveSchema[0],
 '<script type="application/ld+json">'+JSON.stringify(parsedArchiveSchema).replace(/</g,'\\u003c')+'</script>');
// Fingerprint the progressive-enhancement script after its final archive HTML
// is generated. Patients should not be served an outdated title/topic search
// after a new version is published; the static <details> links still work.
const archiveSearchClient=path.join(out,'assets/archive-topics.js');
if(!fs.existsSync(archiveSearchClient))throw new Error('Original article archive search script missing');
const archiveSearchHash=createHash('sha256')
 .update(fs.readFileSync(archiveSearchClient)).digest('hex').slice(0,12);
const archiveSearchScript=/<script defer src="\/assets\/archive-topics\.js(?:\?[^"]*)?"><\/script>/g;
const archiveSearchScriptMatches=[...archiveCatalogHtml.matchAll(archiveSearchScript)];
if(archiveSearchScriptMatches.length!==1)throw new Error('Missing or duplicated owner archive search loader');
archiveCatalogHtml=archiveCatalogHtml.replace(archiveSearchScript,
 '<script defer src="/assets/archive-topics.js?v='+archiveSearchHash+'"></script>');
fs.writeFileSync(archiveCatalogFile,archiveCatalogHtml);
console.log('Owner blog archive search asset fingerprinted:',archiveSearchHash);
// Use the SAME classified owner blog articles as the archive summary. Both
// treatment-page counts previously lagged far behind the actual archive
// (62/33 in the buttons versus 131/46 in the 333-link collection).
// Render from this single source rather than making the clinician edit counts.
for(const [id,filename,marker] of [
 ['gum','gum-treatment.html','<!-- BUILD_OWNER_GUM_COUNT -->'],
 ['root','retreatment.html','<!-- BUILD_OWNER_ROOT_COUNT -->']
]){
 const section=clinicalArchiveGroups.find(group=>group.id===id);
 if(!section?.items.length)throw new Error('Empty owner source topic: '+id);
 const target=path.join(out,filename);
 const original=fs.readFileSync(target,'utf8');
 if(original.split(marker).length!==2)
  throw new Error('Missing or repeated owner archive count placeholder in '+filename);
 fs.writeFileSync(target,original.replace(marker,String(section.items.length)));
}
console.log('Treatment links reflect current Naver categories:',
 clinicalArchiveGroups.filter(group=>['gum','root'].includes(group.id))
  .map(group=>group.id+':'+group.items.length).join(' '));
console.log('Original owner Naver articles grouped without duplication:',
 ownerBlogItems.length,'posts across',clinicalArchiveGroups.length,'mobile disclosure sections:',
 clinicalArchiveGroups.map(group=>group.name+' '+group.items.length+'편').join(' · '));

// Supply canonical URLs for legacy pages that do not declare one in their source HTML.
for(const page of ['implant.html','pediatric-dentistry.html','pediatric-orthodontics.html','search.html']){
 const target=path.join(out,page);
 let html=fs.readFileSync(target,'utf8');
 if(/<link\s+rel=["']canonical["']/i.test(html))continue;
 const canonical='<link rel="canonical" href="https://ejoeundental.pages.dev/'+page+'">';
 html=html.replace(/<\/head>/i,canonical+'\n</head>');
 fs.writeFileSync(target,html);
}


// Publish accurate, machine-readable metadata for every health-information page.
// Avoid inventing individual authors, review dates or medical credentials.
const healthSchemaDir=path.join(out,'health');
let healthSchemaCount=0;
for(const filename of fs.readdirSync(healthSchemaDir).filter(name=>name.endsWith('.html'))){
 const target=path.join(healthSchemaDir,filename);
 let html=fs.readFileSync(target,'utf8');
 const title=html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
 const description=html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim();
 const canonical=html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
 if(!title||!canonical||!canonical.startsWith('https://ejoeundental.pages.dev/health/'))throw new Error('Health metadata incomplete: '+filename);
 if(html.includes('application/ld+json')){
  html=html.replace(/(<script\s+type=["']application\/ld\+json["']>)([\s\S]*?)(<\/script>)/i,(whole,open,json,close)=>{
   let existing;try{existing=JSON.parse(json)}catch{return whole}
   if(!['WebPage','MedicalWebPage'].includes(existing['@type']))return whole;
   existing.url=canonical;
   existing.name=title;
   if(description)existing.description=description;
   if(existing['@id'])existing['@id']=canonical+'#webpage';
   if(existing.publisher?.['@id'])existing.publisher['@id']=new URL(canonical).origin+'/#clinic';
   return open+JSON.stringify(existing).replace(/</g,'\\\\u003c')+close;
  });
  fs.writeFileSync(target,html);
  continue;
 }
 const schema={
  '@context':'https://schema.org',
  '@type':'WebPage',
  '@id':canonical+'#webpage',
  url:canonical,
  name:title,
  inLanguage:'ko-KR',
  isPartOf:{'@type':'WebSite',name:'이조은치과',url:'https://ejoeundental.pages.dev/'},
  publisher:{'@type':'Dentist','@id':'https://ejoeundental.pages.dev/#clinic',name:'이조은치과'}
 };
 if(description)schema.description=description;
 html=html.replace(/<\/head>/i,'<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>\n</head>');
 fs.writeFileSync(target,html);
 healthSchemaCount++;
}
console.log('Health structured data generated:',healthSchemaCount,'pages');

const totalHealthPages=fs.readdirSync(healthSchemaDir).filter(name=>name.endsWith('.html')).length;
if(totalHealthPages!==46)throw new Error('Expected 46 health pages, found '+totalHealthPages);
const healthMetadataIssues=[];
const seenHealthTitles=new Map();
const seenHealthDescriptions=new Map();
for(const filename of fs.readdirSync(healthSchemaDir).filter(name=>name.endsWith('.html'))){
 const html=fs.readFileSync(path.join(healthSchemaDir,filename),'utf8');
 const title=html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()||'';
 const desc=html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim()||'';
 const heading=html.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g,'').trim()||'';
 if(!heading)healthMetadataIssues.push(filename+': missing H1');
 if(!desc)healthMetadataIssues.push(filename+': missing meta description');
 if(desc.length>170)healthMetadataIssues.push(filename+': long meta description ('+desc.length+')');
 if(title.length>75)healthMetadataIssues.push(filename+': long title ('+title.length+')');
 if(seenHealthTitles.has(title))healthMetadataIssues.push(filename+': duplicate title with '+seenHealthTitles.get(title));
 else seenHealthTitles.set(title,filename);
 if(desc&&seenHealthDescriptions.has(desc))healthMetadataIssues.push(filename+': duplicate description with '+seenHealthDescriptions.get(desc));
 else if(desc)seenHealthDescriptions.set(desc,filename);
 const schemaBlocks=[...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
 if(schemaBlocks.length!==1)throw new Error('Expected one health JSON-LD block: '+filename);
 let schema;
 try{schema=JSON.parse(schemaBlocks[0][1]);}catch{throw new Error('Invalid health JSON-LD: '+filename);}
 const canonical=html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
 if(!['WebPage','MedicalWebPage'].includes(schema['@type'])||schema.url!==canonical||schema.name!==title||schema.inLanguage!=='ko-KR')throw new Error('Health structured data does not match page metadata: '+filename);
 if(!['https://ejoeundental.pages.dev/#clinic','https://ejoeundental.com/#clinic'].includes(schema.publisher?.['@id']))throw new Error('Health publisher does not match clinic identity: '+filename);
 if(desc&&schema.description!==desc)throw new Error('Health structured description mismatch: '+filename);
}
console.log('Health SEO metadata audit:',46,'pages,',healthMetadataIssues.length,'improvement candidates');
for(const issue of healthMetadataIssues.slice(0,30))console.warn('Health SEO:',issue);


// Google health-content trust signals: name the ACTUAL information provider
// visibly and use the same organization as the page author in JSON-LD.
// The clinical dentist is linked as a treating clinician, not falsely
// attributed as the individual writer or a newly certified reviewer.
// No invented publish/review dates or external trust badges.
{
 let count=0;
 for(const name of fs.readdirSync(healthSchemaDir).filter(n=>n.endsWith('.html'))){
  const filename=path.join(healthSchemaDir,name);
  let html=fs.readFileSync(filename,'utf8');
  if(html.includes('class="health-info-source"'))
   throw new Error('Repeated health guide provenance panel: '+name);
  const toc='<nav class="article-toc"';
  if(html.split(toc).length!==2)throw new Error('Missing health guide contents: '+name);
  const provider='<aside class="health-info-source" aria-label="건강정보 제공 기관과 진료 담당 의료진">'+
   '<strong>건강정보 제공: 이조은치과의원</strong>'+
   '<span>진료 담당: 김태훈 원장 · 고려대학교 의학박사(치과학 전공) · 통합치의학과 전문의</span>'+
   '<a href="/#doctor">의료진 소개와 진료 원칙 확인 →</a></aside>';
  html=html.replace(toc,provider+toc);
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if(schemas.length!==1)throw new Error('Health schema absent or repeated: '+name);
  let schema;
  try{schema=JSON.parse(schemas[0][1]);}catch{throw new Error('Invalid health schema: '+name)}
  const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if(!canonical||schema.url!==canonical||!schema.publisher)
   throw new Error('Health author must match existing canonical and publisher: '+name);
  const origin=new URL(canonical).origin;
  schema.author={'@type':'Organization','name':'이조은치과','url':origin+'/'};
  html=html.replace(schemas[0][0],
   '<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>');
  fs.writeFileSync(filename,html);
  count++;
 }
 if(count!==46)throw new Error('Missing provider credit on health articles: '+count);
 console.log('Google medical information provenance:',count,'patient guides with visible clinic attribution and schema author');
}

// Patient-readable breadcrumbs and matching BreadcrumbList JSON-LD on all 46
// clinical guides. Derive the category from the page's *existing* header links.
// This avoids inventing affiliations, bylines or review dates.
const healthHubNames=new Map([
 ['/gum-health.html','잇몸 건강정보'],
 ['/root-canal-health.html','신경치료·재신경치료 건강정보'],
 ['/insurance-health.html','건강보험 치과진료 정보'],
 ['/additional-health.html','치과 건강정보 더 보기']
]);
const escapeBreadcrumbText=s=>String(s).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let healthBreadcrumbCount=0;
for(const filename of fs.readdirSync(healthSchemaDir).filter(name=>name.endsWith('.html'))){
 const target=path.join(healthSchemaDir,filename);
 let html=fs.readFileSync(target,'utf8');
 const header=html.match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0]||'';
 const hubRoutes=[...healthHubNames.keys()].filter(url=>header.includes('href="'+url+'"'));
 if(hubRoutes.length!==1)throw new Error('Unable to determine unique health hub: '+filename+' ('+hubRoutes.length+')');
 const hubRoute=hubRoutes[0],hubName=healthHubNames.get(hubRoute);
 const canonical=html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
 const pageTitle=html.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g,'').trim();
 if(!canonical||!pageTitle||!canonical.endsWith('/health/'+filename))throw new Error('Health breadcrumb title/URL missing: '+filename);
 const origin=new URL(canonical).origin;
 const oldCrumb=/<div class="crumb">[^<]*<\/div>/;
 if(!oldCrumb.test(html))throw new Error('Missing original health breadcrumb: '+filename);
 const visibleCrumb='<nav class="crumb health-breadcrumb" aria-label="현재 위치">'+
  '<a href="/">이조은치과 홈</a><span aria-hidden="true">›</span>'+
  '<a href="'+hubRoute+'">'+escapeBreadcrumbText(hubName)+'</a><span aria-hidden="true">›</span>'+
  '<span aria-current="page">'+escapeBreadcrumbText(pageTitle)+'</span></nav>';
 html=html.replace(oldCrumb,visibleCrumb);
 const breadcrumb={
  '@context':'https://schema.org',
  '@type':'BreadcrumbList',
  itemListElement:[
   {'@type':'ListItem',position:1,name:'이조은치과 홈',item:origin+'/'},
   {'@type':'ListItem',position:2,name:hubName,item:origin+hubRoute},
   {'@type':'ListItem',position:3,name:pageTitle,item:canonical}
  ]
 };
 html=html.replace(/<\/head>/i,'<script type="application/ld+json">'+JSON.stringify(breadcrumb).replace(/</g,'\\u003c')+'</script>\n</head>');
 fs.writeFileSync(target,html);
 healthBreadcrumbCount++;
}
if(healthBreadcrumbCount!==46)throw new Error('Incomplete health breadcrumbs: '+healthBreadcrumbCount);
console.log('Health breadcrumb navigation and schema generated:',healthBreadcrumbCount,'articles');

// The four 10/16-article collections used a decorative "PATIENT EDUCATION"
// label instead of navigation. Replace it with one concise keyboard-accessible
// clinic breadcrumb and a route to the matching care page, for easier visits
// from search engines and patient articles on mobile.
const collectionNavigation=new Map([
 ['gum-health.html',['잇몸 건강정보','/gum-treatment.html','잇몸치료 안내']],
 ['root-canal-health.html',['신경치료·재신경치료 건강정보','/retreatment.html','재신경치료 안내']],
 ['insurance-health.html',['건강보험 치과진료 정보','/insured-care.html','건강보험 진료 안내']],
 ['additional-health.html',['치과 건강정보 더 보기','/cervical-abrasion.html','치경부마모증·GI 안내']]
]);
for(const [filename,[label,careHref,careLabel]] of collectionNavigation){
 const target=path.join(out,filename);
 let page=fs.readFileSync(target,'utf8');
 const old='<div class="crumb">PATIENT EDUCATION</div>';
 if(page.split(old).length!==2)throw new Error('Missing unique health collection heading: '+filename);
 if(!fs.existsSync(path.join(out,careHref.slice(1))))throw new Error('Missing linked clinic care guide: '+careHref);
 const nav='<nav class="hub-top-trail" aria-label="현재 건강정보와 관련 진료">'+
  '<a class="hub-top-home" href="/">이조은치과 홈</a>'+
  '<span aria-hidden="true">›</span>'+
  '<span class="hub-top-current" aria-current="page">'+escapeBreadcrumbText(label)+'</span>'+
  '<a class="hub-top-treatment" href="'+careHref+'">'+escapeBreadcrumbText(careLabel)+' →</a>'+
  '</nav>';
 page=page.replace(old,nav);
 // Match schema breadcrumbs to the actual page canonical and visible trail.
 // Do not publish a second, redirecting URL or invent review dates.
 const canonical=page.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
 const title=page.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g,'').trim();
 if(!canonical||!title||new URL(canonical).pathname!=='/'+filename){
  throw new Error('Health hub breadcrumb canonical/title mismatch: '+filename);
 }
 const origin=new URL(canonical).origin;
 const schemas=[...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(match=>JSON.parse(match[1]));
 if(schemas.some(data=>data['@type']==='BreadcrumbList')){
  throw new Error('Duplicate health hub breadcrumb schema: '+filename);
 }
 const breadcrumb={
  '@context':'https://schema.org','@type':'BreadcrumbList',
  itemListElement:[
   {'@type':'ListItem',position:1,name:'이조은치과 홈',item:origin+'/'},
   {'@type':'ListItem',position:2,name:label,item:canonical}
  ]
 };
 page=page.replace(/<\/head>/i,'<script type="application/ld+json">'+
  JSON.stringify(breadcrumb).replace(/</g,'\\u003c')+'</script>\n</head>');
 fs.writeFileSync(target,page);
}
console.log('Health topic hubs now have clickable clinic breadcrumbs and matching schema:',collectionNavigation.size);


// All four health education hubs have a long navigation and a list of ten
// guides. Offer keyboard/screen-reader visitors a direct link to the article
// heading without hiding the static, SEO-accessible medical information.
const healthHubSkipFiles=['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'];
for(const filename of healthHubSkipFiles){
 const file=path.join(out,filename);
 let page=fs.readFileSync(file,'utf8');
 if(page.includes('class="health-hub-skip"'))throw new Error('Duplicate health hub skip navigation: '+filename);
 const main='<main class="article">';
 if(page.split(main).length!==2)throw new Error('Health hub main landmark ambiguous: '+filename);
 if(page.split('<body>').length!==2)throw new Error('Health hub body ambiguous: '+filename);
 page=page.replace(main,'<main class="article" id="health-hub-main">');
 page=page.replace('<body>','<body><a class="health-hub-skip" href="#health-hub-main">건강정보 본문으로 바로가기</a>');
 fs.writeFileSync(file,page);
}
console.log('Health collection keyboard skip navigation generated:',healthHubSkipFiles.length,'hubs');




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


// Give local patients an accurate location path from each core treatment guide.
// The clinic is in Cheongcheon-dong; Sangok-dong and Sangok Station are nearby areas, not branches.
const localCarePages=['gum-treatment.html','retreatment.html','cervical-abrasion.html','insured-care.html'];
for(const filename of localCarePages){
 const target=path.join(out,filename);
 let html=fs.readFileSync(target,'utf8');
 if(html.includes('data-local-care-location="true"'))continue;
 const block='<section data-local-care-location="true" aria-label="치과 위치 안내" style="padding:36px 20px;background:#f2f6f1"><div style="max-width:1000px;margin:auto;line-height:1.85"><h2 style="margin:0 0 12px;font-size:clamp(22px,3vw,28px)">청천동 이조은치과 위치 안내</h2><p>이조은치과는 <strong>인천 부평구 청천동, 세월천로 34 대우프라자 305호</strong>에 있습니다. 산곡동·산곡역 주변에서 방문을 고려하신다면 실제 위치와 이동 경로를 먼저 확인해 주세요.</p><p><a href="/#location">진료시간·위치·주차 안내 →</a> · <a href="tel:0325132875">전화 문의 032-513-2875 →</a></p><p style="font-size:14px">금요일과 토요일은 격주로 진료 일정이 달라 방문 전 전화 확인을 권합니다.</p></div></section>';
 if(!html.includes('</main>'))throw new Error('Missing main section in care page: '+filename);
 html=html.replace('</main>',block+'</main>');
 fs.writeFileSync(target,html);
}
console.log('Local care navigation generated:',localCarePages.length,'treatment pages');

// Make local treatment-page search snippets specific without misrepresenting the clinic location.
const localCareMeta={
 'gum-treatment.html':{
  title:'인천 잇몸치료·부평 잇몸치료 | 청천동 이조은치과',
  description:'인천 잇몸치료·부평 잇몸치료. 청천동·산곡동·산곡역 인근 이조은치과에서 원장이 직접 치주낭·출혈을 검사하고 치석·큐렛치료를 안내합니다.'
 },
 'retreatment.html':{
  title:'인천 재신경치료·부평 재신경치료 | 신경치료 후 통증 | 이조은치과',
  description:'인천 신경치료·부평 신경치료 후 통증? 청천동·산곡동·산곡역 인근 이조은치과에서 근관 재치료와 재신경치료 가능성을 살핍니다.'
 },
 'cervical-abrasion.html':{
  title:'인천 치경부마모증·시린 이·GI 수복 | 부평구 이조은치과',
  description:'인천 부평구 청천동·산곡동·산곡역 인근 치경부마모증·시린 이 안내. GI 수복과 건강보험 적용 여부는 진단·급여 기준에 따라 확인합니다.'
 },
 'insured-care.html':{
  title:'인천 치과 건강보험 진료·스케일링 | 부평구 이조은치과',
  description:'인천 부평구 청천동·산곡동·산곡역 인근 이조은치과. 건강보험 잇몸치료·스케일링·GI 수복 등 급여 적용 여부는 진단 후 안내합니다.'
 }
};
for(const [filename,meta] of Object.entries(localCareMeta)){
 const target=path.join(out,filename);
 let html=fs.readFileSync(target,'utf8');
 if(!/<title>[^<]*<\/title>/i.test(html)||!/<meta\s+name=["']description["']\s+content=["'][^"']*["']/i.test(html))throw new Error('Care SEO metadata missing: '+filename);
 html=html.replace(/<title>[^<]*<\/title>/i,'<title>'+meta.title+'</title>');
 html=html.replace(/(<meta\s+name=["']description["']\s+content=["'])[^"']*(["'])/i,(_,start,end)=>start+meta.description+end);
 fs.writeFileSync(target,html);
}
console.log('Local care SEO snippets refreshed:',Object.keys(localCareMeta).length,'pages');

// Check that localized snippets describe information actually visible on care pages.
const careTopicWords={
 'gum-treatment.html':['잇몸','치주'],
 'retreatment.html':['재신경치료','근관'],
 'cervical-abrasion.html':['치경부마모증','GI'],
 'insured-care.html':['건강보험','보험']
};
for(const [filename,meta] of Object.entries(localCareMeta)){
 const html=fs.readFileSync(path.join(out,filename),'utf8');
 const title=html.match(/<title>([^<]*)<\/title>/i)?.[1]||'';
 const description=html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]||'';
 const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
 if(title!==meta.title||description!==meta.description)throw new Error('Localized SEO snippet mismatch: '+filename);
 for(const keyword of careTopicWords[filename]){
  if(!title.includes(keyword)&&!description.includes(keyword))throw new Error('Care snippet missing treatment topic '+keyword+': '+filename);
  if(!visible.includes(keyword))throw new Error('Care snippet mentions topic absent from visible page '+keyword+': '+filename);
 }
 for(const locality of ['청천동','산곡동','산곡역']){
  if(!description.includes(locality)||!visible.includes(locality))throw new Error('Care local snippet not supported by visible page: '+filename+' / '+locality);
 }
 if(!visible.includes('세월천로 34'))throw new Error('Care location missing from visible page: '+filename);
}
console.log('Care SEO content consistency passed:',Object.keys(localCareMeta).length,'pages');

// Describe the four core treatment guides as clinic-authored web pages.
// Connect each page to the same verified clinic identity; do not imply a medical review date.
for(const filename of Object.keys(localCareMeta)){
 const target=path.join(out,filename);
 let html=fs.readFileSync(target,'utf8');
 const title=html.match(/<title>([^<]*)<\/title>/i)?.[1];
 const description=html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1];
 if(!title||!description)throw new Error('Missing care page metadata for structured data: '+filename);
 const pageUrl='https://ejoeundental.pages.dev/'+filename;
 const schema={
  '@context':'https://schema.org',
  '@type':'WebPage',
  '@id':pageUrl+'#webpage',
  url:pageUrl,
  name:title,
  description,
  inLanguage:'ko-KR',
  isPartOf:{'@id':'https://ejoeundental.pages.dev/#website'},
  publisher:{'@id':'https://ejoeundental.pages.dev/#clinic'},
  about:{'@id':'https://ejoeundental.pages.dev/#clinic'}
 };
 if(html.includes('"@id":"'+pageUrl+'#webpage"'))continue;
 html=html.replace(/<\/head>/i,'<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>\n</head>');
 fs.writeFileSync(target,html);
}
console.log('Care WebPage structured data generated:',Object.keys(localCareMeta).length,'pages');

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

// Give every health article a short, condition-specific route to a relevant care
// page and clear clinic contact. These are navigation links, not diagnoses or
// recommendations to undergo a specific treatment.
const healthCareDestinations = {
  'insurance-scaling.html': ['/insured-care.html','건강보험 진료 기준','/scaling.html','스케일링 진료 안내'],
  'insurance-periodontal.html': ['/insured-care.html','건강보험 진료 기준','/gum-treatment.html','잇몸치료 진료 안내'],
  'insurance-cervical.html': ['/insured-care.html','건강보험 진료 기준','/cervical-abrasion.html','치경부마모증 진료 안내'],
  'insurance-cavity.html': ['/insured-care.html','건강보험 진료 기준','/cavity-treatment.html','충치치료 진료 안내'],
  'insurance-root-canal.html': ['/insured-care.html','건강보험 진료 기준','/root-canal-health.html','신경치료 건강정보'],
  'insurance-extraction.html': ['/insured-care.html','건강보험 진료 기준','/health/tooth-preservation.html','발치 전 자연치아 보존 안내'],
  'insurance-denture.html': ['/insured-care.html','건강보험 진료 기준','/denture.html','틀니 진료 안내'],
  'insurance-implant.html': ['/insured-care.html','건강보험 진료 기준','/implant.html','임플란트 진료 안내'],
  'insurance-checkup.html': ['/insured-care.html','건강보험 진료 기준','/visit-guide.html','처음 방문 안내'],
  'insurance-priority.html': ['/insured-care.html','건강보험 진료 기준','/#philosophy','필요한 진료부터 설명하는 원칙']
};
let careJourneyCount=0;
for(const filename of fs.readdirSync(healthDir).filter(x=>x.endsWith('.html'))){
  const specific=healthCareDestinations[filename];
  const isGum=/^(gum-|swollen-gums|periodontal-|scaling-|root-planing|curette-|receding-gums|loose-tooth)/.test(filename);
  const isRoot=filename.startsWith('root-canal-');
  const isRootRevisit=isRoot&&/(?:retreatment|after-pain|or-extraction|lesion)/.test(filename);
  const isDenture=filename.startsWith('denture-');
  const isAbrasion=filename.startsWith('abrasion-');
  const isCavity=filename.startsWith('cavity-');
  const isTooth=filename.startsWith('tooth-');
  const targetRoutes=specific||
    (isGum?['/gum-treatment.html','잇몸치료 진료 안내','/scaling.html','스케일링 진료 안내']:
    isRootRevisit?['/retreatment.html','재신경치료 가능성·한계 안내','/root-canal-health.html','신경치료 건강정보']:
    isRoot?['/root-canal-health.html','신경치료 건강정보','/retreatment.html','재신경치료 안내(재치료가 필요한 경우)']:
    isDenture?['/denture.html','틀니 진료 안내','/health/insurance-denture.html','틀니 건강보험 안내']:
    isAbrasion?['/cervical-abrasion.html','치경부마모증·GI 진료 안내','/health/insurance-cervical.html','GI 수복 건강보험 안내']:
    isCavity?['/cavity-treatment.html','충치치료 진료 안내','/health/tooth-preservation.html','자연치아 보존 건강정보']:
    isTooth?['/retreatment.html','자연치아 보존·재신경치료 안내','/cavity-treatment.html','충치치료 진료 안내']:
    null);
  if(!targetRoutes)throw new Error('No context-specific care navigation available for '+filename);
  const [primary,primaryLabel,secondary,secondaryLabel]=targetRoutes;
  if(primary===secondary)throw new Error('Duplicate care journey destination for '+filename);
  for(const href of [primary,secondary]){
    const relative=href.split('#')[0];
    if(relative==='/'||!relative)continue;
    if(!relative.startsWith('/')||!fs.existsSync(path.join(out,relative.slice(1)))){
      throw new Error('Related care page missing: '+filename+' -> '+href);
    }
  }
  const filepath=path.join(healthDir,filename);
  let html=fs.readFileSync(filepath,'utf8');
  if(html.includes('data-patient-care-journey='))throw new Error('Repeated patient care navigation: '+filename);
  const section='<nav class="patient-care-journey" data-patient-care-journey="true" aria-label="이 건강정보와 관련된 진료 및 방문 안내">'+
    '<h2>관련 진료와 다음 단계</h2>'+
    '<p>이 글을 읽고 궁금한 점이 있다면 관련 안내를 살펴보세요. 실제 치료 필요성은 진찰 결과에 따라 달라집니다.</p>'+
    '<div class="patient-care-journey-links">'+
    '<a class="patient-care-journey-primary" href="'+primary+'">'+escapeBreadcrumbText(primaryLabel)+' →</a>'+
    '<a href="'+secondary+'">'+escapeBreadcrumbText(secondaryLabel)+' →</a>'+
    '<a href="/#location">진료시간·오시는 길 →</a>'+
    '<a href="tel:0325132875">☎ 032-513-2875 전화 문의</a>'+
    '</div></nav>';
  const insertionPoint=html.includes('<div class="bottom">')?'<div class="bottom">':
    html.includes('<footer class="bottom"')?'<footer class="bottom"':
    html.includes('</main>')?'</main>':null;
  if(!insertionPoint)throw new Error('Health page missing navigation insertion point: '+filename);
  html=html.replace(insertionPoint,section+insertionPoint);
  fs.writeFileSync(filepath,html);
  careJourneyCount++;
}
if(careJourneyCount!==46)throw new Error('Incomplete health care navigation: '+careJourneyCount);
console.log('Condition-specific care journeys added:',careJourneyCount,'health guides');

// Give every health article a consistent route to its parent topic hub.
// This helps visitors and crawlers traverse the 46-page information library.
const healthHubByPrefix=[
 ['root-canal-','/root-canal-health.html','신경치료·재신경치료 건강정보'],
 ['insurance-','/insurance-health.html','건강보험 치과진료 건강정보'],
 ['abrasion-','/additional-health.html','치경부마모증 등 건강정보']
];
const gumTopicPrefixes=['gum-','swollen-gums','periodontal-','scaling-','root-planing','curette-','receding-gums','loose-tooth'];
let addedHealthHubLinks=0;
for(const filename of fs.readdirSync(healthDir).filter(name=>name.endsWith('.html'))){
 const target=path.join(healthDir,filename);
 let html=fs.readFileSync(target,'utf8');
 const hub=healthHubByPrefix.find(([prefix])=>filename.startsWith(prefix));
 const [href,label]=hub?[hub[1],hub[2]]:gumTopicPrefixes.some(prefix=>filename.startsWith(prefix))?['/gum-health.html','잇몸 건강정보']:['/additional-health.html','다른 치과 건강정보'];
 if(html.includes('data-health-hub-link="true"')||html.includes('href="'+href+'"'))continue;
 const block='<nav data-health-hub-link="true" aria-label="관련 건강정보 모음" style="margin:20px 0;padding:12px 18px;background:#f4f7f3;border-radius:10px"><a href="'+href+'">← '+label+' 모아보기</a></nav>';
 if(html.includes('<div class="bottom">'))html=html.replace('<div class="bottom">',block+'<div class="bottom">');
 else if(html.includes('</main>'))html=html.replace('</main>',block+'</main>');
 else continue;
 fs.writeFileSync(target,html);
 addedHealthHubLinks++;
}
console.log('Health topic-hub navigation added:',addedHealthHubLinks,'articles');

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
  // A genuine HTTP 404 is intentionally noindex and must not have a canonical URL.
  if(relative==='404.html'){
   if(!html.includes('name="robots" content="noindex,follow"'))seoWarnings.push('404.html: missing noindex');
   if(/<link\s+rel="canonical"/i.test(html))seoWarnings.push('404.html: unexpected canonical');
   continue;
  }
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
// Audit the unified navigation on all 46 articles, preserving treatment-topic
// relevance, mobile call access, and the reminder that an exam guides care.
const topicGuideRules=[
 {pattern:/^(?:gum-|swollen-gums|periodontal-|scaling-|root-planing|curette-|receding-gums|loose-tooth)/,guide:'/gum-treatment.html'},
 {pattern:/^root-canal-(?:retreatment|after-pain|or-extraction|reinfection|lesion)/,guide:'/retreatment.html'},
 {pattern:/^(?:abrasion-|cervical-)/,guide:'/cervical-abrasion.html'},
 {pattern:/^insurance-/,guide:'/insured-care.html'}
];
let checkedPatientJourneys=0;
for(const filename of fs.readdirSync(healthDir).filter(x=>x.endsWith('.html'))){
 const html=fs.readFileSync(path.join(healthDir,filename),'utf8');
 const blocks=[...html.matchAll(/<nav class="patient-care-journey"[^>]*>([\s\S]*?)<\/nav>/g)];
 if(blocks.length!==1)throw new Error('Missing or duplicate patient care navigation: '+filename);
 const panel=blocks[0][1];
 const rule=topicGuideRules.find(x=>x.pattern.test(filename));
 if(rule&&!panel.includes('href="'+rule.guide+'"'))throw new Error('Health article missing matching care guide: '+filename+' -> '+rule.guide);
 if(!panel.includes('class="patient-care-journey-links"')||
    !panel.includes('href="tel:0325132875"')||
    !panel.includes('href="/#location"')||
    !panel.includes('실제 치료 필요성은 진찰 결과에 따라 달라집니다')){
  throw new Error('Health article missing patient-safe contact navigation: '+filename);
 }
 if(!html.includes('name="viewport"')||!html.includes('/assets/style.css?v=')){
  throw new Error('Health article missing mobile viewport or versioned CSS: '+filename);
 }
 checkedPatientJourneys++;
}
if(checkedPatientJourneys!==46)throw new Error('Missing patient health care journeys: '+checkedPatientJourneys);
console.log('Clinical-topic care navigation, mobile links and exam qualification checked:',checkedPatientJourneys,'health guides');

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
// Keep homepage GEO identity consistent with the real clinic and active canonical host.
const homepageSchemas=[...homepageHtml.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)].map(match=>{
 try{return JSON.parse(match[1]);}catch{throw new Error('Invalid homepage JSON-LD');}
});
const clinicSchema=homepageSchemas.find(schema=>schema['@type']==='Dentist');
const websiteSchema=homepageSchemas.find(schema=>schema['@type']==='WebSite');
if(!clinicSchema||!websiteSchema)throw new Error('Homepage missing Dentist or WebSite schema');
if(!['https://ejoeundental.pages.dev/#clinic','https://ejoeundental.com/#clinic'].includes(clinicSchema['@id'])||clinicSchema.name!=='이조은치과'||clinicSchema.telephone!=='+82-32-513-2875')throw new Error('Homepage clinic identity mismatch');
if(!['세월천로 34, 대우프라자 305호','세월천로 34 대우프라자 305호'].includes(clinicSchema.address?.streetAddress))throw new Error('Homepage clinic address mismatch');
if(websiteSchema.publisher?.['@id']!==clinicSchema['@id']||!['https://ejoeundental.pages.dev/','https://ejoeundental.com/'].includes(websiteSchema.url))throw new Error('Homepage website publisher mismatch');
if(!['청천동','산곡동','산곡역'].every(place=>clinicSchema.areaServed?.some(area=>area.name.includes(place))))throw new Error('Homepage local search coverage incomplete');
console.log('Homepage SEO/GEO identity audit passed: clinic, website, service areas');

// Keep public structured clinic details aligned with patient-facing visit guidance.
const clinicProperties=Array.isArray(clinicSchema.additionalProperty)?clinicSchema.additionalProperty:[];
const clinicPropertyText=clinicProperties.map(item=>String(item.name||'')+' '+String(item.value||'')).join(' ');
if(!clinicPropertyText.includes('격주')||!clinicPropertyText.includes('금요일')||!clinicPropertyText.includes('토요일'))throw new Error('Clinic structured data missing alternating hours');
if(!clinicPropertyText.includes('3시간')||!clinicPropertyText.includes('주차'))throw new Error('Clinic structured data missing parking terms');
const visitSection=homepageHtml.match(/<section[^>]*id=["']location["'][^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
if(!visitSection.includes('격주')||!visitSection.includes('3시간 무료 주차'))throw new Error('Visitor-facing hours or parking information missing');
console.log('Clinic visit facts GEO consistency audit passed');

const coreCareBreadcrumbs=[
  ['gum-treatment.html','잇몸치료'],
  ['retreatment.html','재신경치료'],
  ['cervical-abrasion.html','치경부마모증·GI 수복'],
  ['insured-care.html','건강보험 진료'],
  ['tmj-care.html','턱관절 진료'],
  ['wisdom-tooth.html','사랑니 발치'],
  ['implant.html','임플란트 진료'],
  ['pediatric-orthodontics.html','어린이 교정·성장기 치열 상담'],
  ['scaling.html','스케일링'],
  ['cavity-treatment.html','충치치료'],
  ['denture.html','청천동 틀니 진료 안내'],
  ['pediatric-dentistry.html','어린이 치과진료']
];
for(const [page,label] of coreCareBreadcrumbs){
 const careHtml=fs.readFileSync(path.join(out,page),'utf8');
 const scripts=[...careHtml.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)].map(match=>{
  try{return JSON.parse(match[1]);}catch{throw new Error('Invalid treatment JSON-LD: '+page);}
 });
 const breadcrumbs=scripts.filter(data=>data['@type']==='BreadcrumbList');
 if(breadcrumbs.length!==1)throw new Error('Expected one treatment breadcrumb schema: '+page);
 const entries=breadcrumbs[0].itemListElement;
 if(!Array.isArray(entries)||entries.length!==2||entries[0].position!==1||entries[1].position!==2||entries[0].name!=='이조은치과 홈'||entries[1].name!==label||entries.some(e=>e['@type']!=='ListItem'))throw new Error('Invalid treatment breadcrumb hierarchy: '+page);
 for(const [index,expectedPath] of ['/', '/'+page].entries()){
  const item=entries[index].item;
  if(!['https://ejoeundental.com'+expectedPath,'https://ejoeundental.pages.dev'+expectedPath].includes(item))throw new Error('Treatment breadcrumb URL mismatch: '+page);
 }
}
console.log('Treatment breadcrumb GEO audits passed:',coreCareBreadcrumbs.length,'pages');

// Keep the patient-visible location trail in sync with existing two-level
// BreadcrumbList data. Every route stays reachable, including on small phones.
let visibleCareBreadcrumbCount=0;
for(const [filename,careLabel] of coreCareBreadcrumbs){
 const target=path.join(out,filename);
 let html=fs.readFileSync(target,'utf8');
 if(html.includes('class="treatment-breadcrumb"'))throw new Error('Duplicate visible treatment breadcrumb: '+filename);
 if(!/<main\b[^>]*>/i.test(html)||!/<\/head>/i.test(html))throw new Error('Missing main or head on treatment page: '+filename);
 const breadcrumb='<nav class="treatment-breadcrumb" aria-label="현재 위치">'+
   '<div class="treatment-breadcrumb-inner">'+
   '<a href="/">이조은치과 홈</a>'+
   '<span class="treatment-breadcrumb-separator" aria-hidden="true">›</span>'+
   '<span class="treatment-breadcrumb-current" aria-current="page">'+escapeBreadcrumbText(careLabel)+'</span>'+
   '<a class="treatment-breadcrumb-directory" href="/#care">다른 진료 보기 →</a>'+
   '</div></nav>';
 html=html.replace(/<main\b[^>]*>/i,match=>match+breadcrumb);
 html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/treatment-breadcrumbs.css?v=20261023-care-trail1">\n</head>');
 if(!html.includes('aria-current="page">'+escapeBreadcrumbText(careLabel)+'</span>')){
  throw new Error('Patient breadcrumb label differs from structured data: '+filename);
 }
 fs.writeFileSync(target,html);
 visibleCareBreadcrumbCount++;
}
if(visibleCareBreadcrumbCount!==coreCareBreadcrumbs.length)throw new Error('Treatment page visible breadcrumbs incomplete');
console.log('Visible care breadcrumbs generated:',visibleCareBreadcrumbCount,'treatment guides');

// On smaller treatment pages, keyboard users otherwise tab through the full header
// before reaching the clinical explanation. Preserve existing skip links and only
// add one when needed. Every skip destination has a single valid main landmark.
let skipLinkCount=0;
for(const [filename] of coreCareBreadcrumbs){
 const file=path.join(out,filename);
 let html=fs.readFileSync(file,'utf8');
 const opening=html.match(/<main\b[^>]*>/i)?.[0];
 if(!opening)throw new Error('Missing main on treatment guide: '+filename);
 let mainId=opening.match(/\bid="([^"]+)"/)?.[1];
 if(!mainId){
  mainId='main-content';
  html=html.replace(opening,opening.replace(/<main/i,'<main id="main-content"'));
 }
 const existingSkip=html.match(/<a\b[^>]*class="(?:page-skip-link|treatment-skip-link)"[^>]*>/i)?.[0];
 if(!existingSkip){
  html=html.replace(/<body\b[^>]*>/i,match=>match+
   '<a class="treatment-skip-link" href="#'+mainId+'">진료 안내 본문으로 건너뛰기</a>');
 }else if(!existingSkip.includes('href="#'+mainId+'"')){
  throw new Error('Treatment existing keyboard skip link does not target its main: '+filename);
 }
 if((html.match(new RegExp('<main\\b[^>]*id="'+mainId+'"','g'))||[]).length!==1||
    !html.includes('href="#'+mainId+'"')){
  throw new Error('Treatment keyboard skip link or destination invalid: '+filename);
 }
 fs.writeFileSync(file,html);
 skipLinkCount++;
}
if(skipLinkCount!==coreCareBreadcrumbs.length)throw new Error('Incomplete treatment keyboard navigation');
console.log('Treatment keyboard skip navigation checked:',skipLinkCount,'guides');



const searchPageHtml=fs.readFileSync(path.join(out,'search.html'),'utf8');
if(!/<form\b[^>]*role=["']search["'][^>]*>/.test(searchPageHtml))throw new Error('Search page missing search landmark');
if(!/<input\b[^>]*id=["']q["'][^>]*aria-describedby=["']search-help["']/.test(searchPageHtml))throw new Error('Search field missing accessible help reference');
if(!/<p\b[^>]*id=["']search-help["'][^>]*>/.test(searchPageHtml))throw new Error('Search help description missing');
for(const destination of ['/#focus-care','/#location','tel:0325132875']){
 if(!searchPageHtml.includes('href="'+destination+'"'))throw new Error('Search page missing patient quick action: '+destination);
}
if(!/<a\b[^>]*href=["']\/search\.html["'][^>]*aria-current=["']page["']/.test(searchPageHtml))throw new Error('Search page current navigation marker missing');
console.log('Search page mobile navigation and accessibility audit passed');

const searchScript=fs.readFileSync(path.join(out,'assets/search.js'),'utf8');
if(!searchScript.includes("fetch('/content/search-index.json?v="))throw new Error('Search script must fetch versioned generated runtime index');
if(searchScript.includes("fetch('/content/search-index-46.json'"))throw new Error('Search script still references legacy curated-only index');
const auditedSearchIndex=JSON.parse(fs.readFileSync(path.join(out,'content/search-index.json'),'utf8'));
const legacySearch=JSON.parse(fs.readFileSync(path.join(out,'content/search-index-46.json'),'utf8'));
if(JSON.stringify(auditedSearchIndex)!==JSON.stringify(legacySearch))throw new Error('Runtime search index aliases differ');
if(!Array.isArray(auditedSearchIndex)||auditedSearchIndex.length<60)throw new Error('Generated search index is unexpectedly small');
for(const coreUrl of ['/gum-treatment.html','/retreatment.html','/cervical-abrasion.html','/insured-care.html']){
 if(!auditedSearchIndex.some(entry=>entry.url===coreUrl))throw new Error('Core treatment missing from search: '+coreUrl);
}
if(!/src=["']\/assets\/search\.js\?v=[a-f0-9]{12}["']/.test(searchPageHtml))throw new Error('Search page script fingerprint missing');
console.log('Search runtime index and core-treatment coverage audit passed');




const symptomSection=homepageHtml.match(/<section[^>]*id=["']symptoms["'][^>]*>([\s\S]*?)<\/section>/)?.[1];
if(!symptomSection)throw new Error('Homepage symptom guide section is missing');
const symptomCards=[...symptomSection.matchAll(/<div class="card">([\s\S]*?)<\/div>/g)].map(m=>m[1]);
if(symptomCards.length<6)throw new Error('Expected at least six homepage symptom cards; found '+symptomCards.length);
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
const sitemapFile=path.join(out,'sitemap.xml');
let normalizedSitemap=fs.readFileSync(sitemapFile,'utf8').replace(/https:\/\/ejoeundental\.com\//g,'https://ejoeundental.pages.dev/');
fs.writeFileSync(sitemapFile,normalizedSitemap);
// Make the public fee disclosure discoverable in the published sitemap.
const feeSitemapPath=path.join(out,'sitemap.xml');
let feeSitemapXml=fs.readFileSync(feeSitemapPath,'utf8');
const feePageUrl='https://ejoeundental.pages.dev/noncovered-fees.html';
if(!feeSitemapXml.includes('<loc>'+feePageUrl+'</loc>')){
 feeSitemapXml=feeSitemapXml.replace('</urlset>','  <url><loc>'+feePageUrl+'</loc></url>\n</urlset>');
 fs.writeFileSync(feeSitemapPath,feeSitemapXml);
}
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
// Detect indexing directives that accidentally hide published sitemap pages.
for(const url of sitemapUrls){
 const relative=decodeURIComponent(url.slice('https://ejoeundental.pages.dev/'.length));
 const candidate=path.join(out,relative||'index.html');
 const htmlFile=fs.existsSync(candidate)&&fs.statSync(candidate).isFile()?candidate:path.join(candidate,'index.html');
 const html=fs.readFileSync(htmlFile,'utf8');
 const robotsMeta=[...html.matchAll(/<meta\s+[^>]*name=["'](?:robots|googlebot|naverbot|yeti)["'][^>]*>/gi)].map(m=>m[0]);
 for(const tag of robotsMeta){
  const content=tag.match(/content=["']([^"']*)["']/i)?.[1]||'';
  if(/(?:^|[,\s])(?:noindex|none)(?:$|[,\s])/i.test(content))throw new Error('Sitemap page blocks indexing: '+url);
 }
 if(/<meta\s+[^>]*http-equiv=["']refresh["']/i.test(html))throw new Error('Sitemap page uses meta refresh: '+url);
}
console.log('Indexability audit passed:',sitemapUrls.length,'sitemap pages without noindex or meta refresh');
// Every published health article must be discoverable through the sitemap.
const healthSitemapUrls=new Set(sitemapUrls.filter(url=>url.startsWith('https://ejoeundental.pages.dev/health/')));
const healthHtmlFiles=fs.readdirSync(path.join(out,'health')).filter(name=>name.endsWith('.html'));
const missingHealthSitemap=healthHtmlFiles.filter(name=>!healthSitemapUrls.has('https://ejoeundental.pages.dev/health/'+name));
if(missingHealthSitemap.length)throw new Error('Health pages missing from sitemap: '+missingHealthSitemap.join(', '));
const unexpectedHealthSitemap=[...healthSitemapUrls].filter(url=>!healthHtmlFiles.includes(url.split('/').pop()));
if(unexpectedHealthSitemap.length)throw new Error('Unexpected health sitemap URLs: '+unexpectedHealthSitemap.join(', '));
console.log('Health sitemap coverage passed:',healthHtmlFiles.length,'published health pages');
const publishedRobots=fs.readFileSync(path.join(out,'robots.txt'),'utf8').replace('Sitemap: https://ejoeundental.com/sitemap.xml','Sitemap: https://ejoeundental.pages.dev/sitemap.xml');
fs.writeFileSync(path.join(out,'robots.txt'),publishedRobots);
if(!publishedRobots.includes('Sitemap: https://ejoeundental.pages.dev/sitemap.xml'))throw new Error('Robots sitemap location mismatch');
// Ensure the crawler rules permit published pages and keep private editing routes out.
const robotsLines=publishedRobots.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#'));
if(!robotsLines.some(line=>/^User-agent:\s*\*$/i.test(line)))throw new Error('Robots.txt missing default crawler group');
if(!robotsLines.some(line=>/^Allow:\s*\/$/i.test(line)))throw new Error('Robots.txt missing public crawl allowance');
if(!robotsLines.some(line=>/^Disallow:\s*\/admin\/$/i.test(line)))throw new Error('Robots.txt does not protect editing route');
const disallowedPaths=robotsLines.filter(line=>/^Disallow:/i.test(line)).map(line=>line.replace(/^Disallow:\s*/i,'').trim());
for(const url of sitemapUrls){
 const pathname=new URL(url).pathname;
 if(disallowedPaths.some(rule=>rule==='/'||(rule&&pathname.startsWith(rule))))throw new Error('Sitemap URL blocked by robots.txt: '+url);
}
console.log('Robots crawl audit passed:',sitemapUrls.length,'sitemap pages allowed, /admin/ excluded');

// Guard the patient-facing fee disclosure against accidental removal or missing data.
const publishedFeePage=fs.readFileSync(path.join(out,'noncovered-fees.html'),'utf8');
const publishedHome=fs.readFileSync(path.join(out,'index.html'),'utf8');
if(!publishedHome.includes('href="/noncovered-fees.html"'))throw new Error('Homepage missing noncovered fee disclosure link');

if(!publishedFeePage.includes('href="#main-content"')||!publishedFeePage.includes('id="main-content"'))throw new Error('Fee disclosure keyboard skip link is missing');

if(!publishedFeePage.includes('id="fees-status"'))throw new Error('Fee disclosure page lacks loading status announcement');
if(!publishedFeePage.includes('id="fees-certificates"') || publishedFeePage.includes('BUILD_FEE_TABLES'))throw new Error('Static certificate fee table not generated');
if(publishedFeePage.includes('src="/assets/fees.js"'))throw new Error('Fee HTML unnecessarily fetches browser renderer');
const initialFeeRows=(publishedFeePage.match(/<th scope="row">/g)||[]).length;
if(initialFeeRows!==feeEntries.length)throw new Error('Static fee disclosure row mismatch: '+initialFeeRows+' vs '+feeEntries.length);

const publishedFeeData=JSON.parse(fs.readFileSync(path.join(out,'content/fees-index.json'),'utf8'));
if(!Array.isArray(publishedFeeData.items)||publishedFeeData.items.length!==feeEntries.length)throw new Error('Published fee data does not match approved entries');
for(const row of publishedFeeData.items){if(!row.item.trim()||!row.price.trim())throw new Error('Published fee item is incomplete');}
for(let i=1;i<publishedFeeData.items.length;i++){const a=publishedFeeData.items[i-1],b=publishedFeeData.items[i];if(a.category.localeCompare(b.category,'ko')>0)throw new Error('Fee categories are not sorted');}
if(!sitemapUrls.includes(feePageUrl))throw new Error('Fee disclosure page missing from sitemap');
console.log('Fee disclosure audit passed:',publishedFeeData.items.length,'explicitly published items, homepage link and sitemap verified');
// Check patient-facing navigation and local search signals in the built homepage.
const homeAuditHtml=fs.readFileSync(path.join(out,'index.html'),'utf8');
for(const [label,pattern] of [
 ['clinic telephone',/href=["']tel:0325132875["']/i],
 ['clinic address',/세월천로\s*34/],
 ['Cheongcheon local area',/청천동/],
 ['Sangok local area',/산곡동/],
 ['Sangok station',/산곡역/],
 ['fee disclosure',/href=["']\/noncovered-fees\.html["']/],
 ['search entry',/href=["']\/search\.html/],
 ['symptom guide',/id=["']symptoms["']/],
 ['first visit guide',/id=["']visit-guide["']/],
 ['symptom guide navigation',/href=["']#symptoms["']/],
 ['mobile symptom guide shortcut',/<div class=["']mobile-quick["'][^>]*>[\s\S]*?<a\s+href=["']#symptom-navigator-title["'][^>]*aria-label=["']증상별 건강정보 바로가기["']/],
 ['first visit navigation',/href=["']#visit-guide["']/],
 ['care principles link',/href=["']#philosophy["']/],
 ['location guide link',/href=["']#location["']/],
 ['gum health navigation',/href=["']\/gum-health\.html["']/],
 ['root canal health navigation',/href=["']\/root-canal-health\.html["']/],
 ['cervical abrasion navigation',/href=["']\/cervical-abrasion\.html["']/]
]){if(!pattern.test(homeAuditHtml))throw new Error('Homepage missing essential patient navigation or local signal: '+label);}
const homeSchemaBlocks=[...homeAuditHtml.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
const homeSchemas=homeSchemaBlocks.map((match,index)=>{try{return JSON.parse(match[1]);}catch{throw new Error('Invalid homepage JSON-LD block '+(index+1));}});
const auditedClinicSchema=homeSchemas.find(schema=>schema['@type']==='Dentist');
if(!auditedClinicSchema||auditedClinicSchema.name!=='이조은치과'||auditedClinicSchema.telephone!=='+82-32-513-2875')throw new Error('Homepage clinic structured data missing or incorrect');
if(!auditedClinicSchema.address?.streetAddress?.includes('세월천로 34'))throw new Error('Homepage clinic address missing from structured data');
const localServiceNames=new Set((auditedClinicSchema.availableService||[]).map(service=>service.name));
for(const service of ['잇몸치료','재신경치료','치경부마모증 수복']){if(!localServiceNames.has(service))throw new Error('Clinic structured data missing primary care: '+service);}
const servedAreas=new Set((auditedClinicSchema.areaServed||[]).map(area=>area.name));
for(const area of ['인천광역시 부평구 청천동','인천광역시 부평구 산곡동','산곡역 인근']){if(!servedAreas.has(area))throw new Error('Clinic structured data missing nearby area: '+area);}
if(!auditedClinicSchema.hasMap||!/^https:\/\//.test(auditedClinicSchema.hasMap))throw new Error('Clinic structured data missing map destination');
// Prevent dead in-page anchors and accidental duplicate section IDs.
const auditedHomepageIds=[...homeAuditHtml.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
const auditedHomepageIdSet=new Set(auditedHomepageIds);
if(auditedHomepageIds.length!==auditedHomepageIdSet.size)throw new Error('Duplicate homepage HTML id attribute detected');
const auditedHomepageHashLinks=[...homeAuditHtml.matchAll(/\bhref=["']#([^"']+)["']/g)].map(m=>m[1]);
for(const target of auditedHomepageHashLinks){if(!auditedHomepageIdSet.has(target))throw new Error('Homepage navigation links to missing section: #'+target);}
// Check local patient navigation targets exist in the generated site, not just in source files.
const auditedHomepageLocalPages=[...homeAuditHtml.matchAll(/\bhref=["'](\/[^"'?#]+\.html)(?:[?#][^"']*)?["']/g)].map(match=>match[1]);
for(const localPage of new Set(auditedHomepageLocalPages)){
 const localFile=path.join(out,localPage.slice(1));
 if(!fs.existsSync(localFile)||!fs.statSync(localFile).isFile())throw new Error('Homepage link points to missing published page: '+localPage);
}
// Validate fragment destinations in linked, published patient-information pages.
const auditedFragmentLinks=[...homeAuditHtml.matchAll(/\bhref=["'](\/[^"'?#]+\.html)#([^"']+)["']/g)];
for(const match of auditedFragmentLinks){
 const targetPath=path.join(out,match[1].slice(1));
 if(!fs.existsSync(targetPath))throw new Error('Fragment link points to missing page: '+match[1]);
 const targetHtml=fs.readFileSync(targetPath,'utf8');
 const escapedFragment=match[2].replace(/[.*+?^\x24{}()|[\]\\]/g,'\\\x24&');
 if(!new RegExp('\\bid=["\\\']'+escapedFragment+'["\\\']').test(targetHtml))throw new Error('Homepage fragment link points to missing section: '+match[1]+'#'+match[2]);
}
// Keep key local-search and patient-care pages reachable through the homepage.
const auditedRequiredPages=['/gum-treatment.html','/retreatment.html','/cervical-abrasion.html','/insured-care.html','/noncovered-fees.html','/search.html'];
const auditedLinkedPages=new Set(auditedHomepageLocalPages);
for(const requiredPage of auditedRequiredPages){if(!auditedLinkedPages.has(requiredPage))throw new Error('Homepage lost key patient information link: '+requiredPage);}
const auditedVisitAnchors=['location','symptoms','visit-guide','faq'];
for(const sectionId of auditedVisitAnchors){if(!auditedHomepageIdSet.has(sectionId))throw new Error('Homepage lost essential patient section: '+sectionId);}
// Social share previews must point at the same published homepage as canonical.
const auditedHomepageCanonical=homeAuditHtml.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
const auditedHomepageOgUrl=homeAuditHtml.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i)?.[1];
if(!auditedHomepageCanonical||auditedHomepageOgUrl!==auditedHomepageCanonical)throw new Error('Homepage Open Graph URL and canonical disagree');
for(const property of ['og:title','og:description','og:type','og:locale','og:site_name']){
 if(!homeAuditHtml.includes('property="'+property+'"'))throw new Error('Homepage social preview metadata missing: '+property);
}
if(!homeAuditHtml.includes('name="twitter:card"'))throw new Error('Homepage Twitter card metadata missing');
if(!/<meta\s+name=["']robots["']\s+content=["']index,follow,max-image-preview:large["']/.test(homeAuditHtml))throw new Error('Homepage indexing directive missing');
if(!homeAuditHtml.includes('name="format-detection" content="telephone=no"'))throw new Error('Homepage telephone detection preference missing');
// Every published journal article must keep its consultation and navigation details.
for(const post of posts){
 const html=fs.readFileSync(path.join(out,'stories',post.slug,'index.html'),'utf8');
 for(const required of ['id="main-content"','href="tel:0325132875"','href="/#location"','격주 금요일·토요일 진료 일정','application/ld+json']){
  if(!html.includes(required))throw new Error('Journal article missing essential patient information ('+required+'): '+post.slug);
 }
 const canonical='https://ejoeundental.pages.dev/stories/'+encodeURIComponent(post.slug)+'/';
 if(!html.includes('rel="canonical" href="'+canonical+'"'))throw new Error('Journal article canonical mismatch: '+post.slug);
 const structured=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 if(!structured)throw new Error('Journal structured data missing: '+post.slug);
 let data;
 try{data=JSON.parse(structured[1]);}catch{throw new Error('Journal structured data is invalid JSON: '+post.slug);}
 if(data['@type']!=='BlogPosting'||data.headline!==post.title||data.mainEntityOfPage!==canonical||data.publisher?.name!=='이조은치과')throw new Error('Journal structured data does not match published article: '+post.slug);
}
console.log('Journal patient-navigation audit passed:',posts.length,'published articles');
console.log('Homepage social preview audit passed:',auditedHomepageCanonical);
console.log('Homepage published-page links audit passed:',new Set(auditedHomepageLocalPages).size,'local pages');
console.log('Homepage anchor navigation audit passed:',auditedHomepageHashLinks.length,'links');
console.log('Homepage local SEO audit passed:',homeSchemas.length,'valid structured data blocks, phone, address and key links');
console.log('Sitemap audit passed:',sitemapUrls.length,'canonical-aligned published pages');
console.log('Build complete:',posts.length,'articles');

// Verify that published journal pages have a single consistent canonical and social URL.
// Keep the current pages.dev host until the separately scheduled domain migration.
for(const post of posts){
 const html=fs.readFileSync(path.join(out,'stories',post.slug,'index.html'),'utf8');
 const canonicalMatches=[...html.matchAll(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/gi)];
 const ogMatches=[...html.matchAll(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/gi)];
 if(canonicalMatches.length!==1||ogMatches.length!==1)throw new Error('Journal must have exactly one canonical and og:url: '+post.slug);
 if(canonicalMatches[0][1]!==ogMatches[0][1])throw new Error('Journal canonical and og:url mismatch: '+post.slug);
}
console.log('Journal canonical/social URL consistency audit passed:',posts.length,'published articles');

// Audit on-page descriptions for published journal articles without changing the active domain.
const journalTitles=new Set();
for(const post of posts){
 const html=fs.readFileSync(path.join(out,'stories',post.slug,'index.html'),'utf8');
 const titleMatches=[...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)];
 const descMatches=[...html.matchAll(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/gi)];
 if(titleMatches.length!==1||!titleMatches[0][1].trim())throw new Error('Journal missing unique page title: '+post.slug);
 if(descMatches.length!==1||!descMatches[0][1].trim())throw new Error('Journal missing meta description: '+post.slug);
 if(journalTitles.has(titleMatches[0][1]))throw new Error('Duplicate published journal title: '+post.slug);
 journalTitles.add(titleMatches[0][1]);
 if(!html.includes('<html lang="ko">'))throw new Error('Journal missing Korean language declaration: '+post.slug);
}
console.log('Journal title, description and language audit passed:',posts.length,'published articles');

// Ensure published journal pages keep working links to primary treatment guides.
for(const post of posts){
 const html=fs.readFileSync(path.join(out,'stories',post.slug,'index.html'),'utf8');
 const links=[...html.matchAll(/<a\s+[^>]*href=["'](\/[^"'?#]+\.html)(?:[?#][^"']*)?["']/gi)].map(m=>m[1]);
 for(const url of new Set(links)){
  const destination=path.join(out,url.slice(1));
  if(!fs.existsSync(destination)||!fs.statSync(destination).isFile())throw new Error('Broken journal internal link '+url+' in '+post.slug);
 }
 if(!html.includes('href="/search.html"')||!html.includes('href="/stories.html"'))throw new Error('Journal missing discovery navigation: '+post.slug);
}
console.log('Journal internal link audit passed:',posts.length,'published articles');

// Audit published static and journal pages for mobile viewport and accessible document landmarks.
// Do not alter canonical hosts while the domain transfer is pending.
const auditPages=['index.html','gum-treatment.html','retreatment.html','cervical-abrasion.html','insured-care.html',...posts.map(post=>path.join('stories',post.slug,'index.html'))];
for(const relative of auditPages){
 const html=fs.readFileSync(path.join(out,relative),'utf8');
 if(!/<meta\s+name=["']viewport["']\s+content=["'][^"']*width=device-width/i.test(html))throw new Error('Mobile viewport missing: '+relative);
 if(!/<html\s+lang=["']ko["']/i.test(html))throw new Error('Korean document language missing: '+relative);
 if(!/<main\b/i.test(html)||!/<h1\b/i.test(html))throw new Error('Main landmark or H1 missing: '+relative);
 const h1Count=[...html.matchAll(/<h1\b/gi)].length;
 if(h1Count!==1)throw new Error('Expected exactly one H1: '+relative+' ('+h1Count+')');
}
console.log('Mobile and document landmark audit passed:',auditPages.length,'pages');

// Verify homepage in-page navigation targets and locally linked HTML documents.
const navigationHomepageHtml=fs.readFileSync(path.join(out,'index.html'),'utf8');
const homepageIdList=[...navigationHomepageHtml.matchAll(/\bid=["']([^"']+)["']/gi)].map(match=>match[1]);
const homepageIds=new Set(homepageIdList);
if(homepageIds.size!==homepageIdList.length)throw new Error('Duplicate HTML id on homepage');
for(const match of navigationHomepageHtml.matchAll(/\bhref=["']([^"']+)["']/gi)){
 const href=match[1];
 if((href.startsWith('#')||href.startsWith('/#'))&&href.includes('#')){
  const anchor=href.slice(href.indexOf('#')+1);
  if(anchor&&!homepageIds.has(decodeURIComponent(anchor)))throw new Error('Broken homepage section link: '+href);
 }
 if(/^\/[a-z0-9_/-]+\.html(?:[?#].*)?$/i.test(href)){
  const file=path.join(out,href.split(/[?#]/)[0].slice(1));
  if(!fs.existsSync(file))throw new Error('Broken homepage HTML link: '+href);
 }
}
console.log('Homepage navigation and HTML link audit passed');

// Ensure runtime configuration and generated search data stay usable by visitors.
const runtimeSite=JSON.parse(fs.readFileSync(path.join(out,'content/site.json'),'utf8'));
for(const field of ['clinic','address','phone','intro','philosophy']){
 if(typeof runtimeSite[field]!=='string'||!runtimeSite[field].trim())throw new Error('Missing runtime clinic field: '+field);
}
const runtimePosts=JSON.parse(fs.readFileSync(path.join(out,'content/posts-index.json'),'utf8'));
const runtimeSearch=JSON.parse(fs.readFileSync(path.join(out,'content/search-index.json'),'utf8'));
const runtimeFees=JSON.parse(fs.readFileSync(path.join(out,'content/fees-index.json'),'utf8'));
if(!Array.isArray(runtimePosts))throw new Error('Invalid runtime post index');
if(!Array.isArray(runtimeSearch))throw new Error('Invalid runtime search index');
const searchIndexUrls=new Set();
if(runtimeSearch.length===0)throw new Error('Empty runtime search index');
for(const entry of runtimeSearch){
 if(entry&&typeof entry.url==='string'){if(searchIndexUrls.has(entry.url))throw new Error('Duplicate runtime search URL: '+entry.url);searchIndexUrls.add(entry.url)}
 if(!entry||typeof entry.title!=='string'||!entry.title.trim()||typeof entry.url!=='string'||!entry.url.startsWith('/')||entry.url.startsWith('//')||entry.url.includes('?')||entry.url.includes('#'))throw new Error('Invalid runtime search entry');
 const route=entry.url.split(/[?#]/)[0];
 if(route!=='/'&&(!/^\/[a-z0-9_/%.-]+\/?$/i.test(route)||route.includes('..')))throw new Error('Unsafe runtime search URL: '+entry.url);
 const relative=decodeURIComponent(route.slice(1));
 if(relative.split('/').includes('..')||relative.includes('\\')||relative.includes('\0'))throw new Error('Unsafe decoded search path: '+entry.url);
 const destination=path.join(out,relative);
 const html=route==='/'||route.endsWith('/')?path.join(destination,'index.html'):destination;
 if(!fs.existsSync(html)||!fs.statSync(html).isFile()||!html.endsWith('.html'))throw new Error('Search result points to missing HTML page: '+entry.url);
}

if(!runtimeFees||!Array.isArray(runtimeFees.items))throw new Error('Invalid runtime fee index');
for(const post of runtimePosts){
 if(!post||typeof post.slug!=='string'||typeof post.title!=='string')throw new Error('Invalid published post index item');
 const target=path.join(out,'stories',post.slug,'index.html');
 if(!fs.existsSync(target))throw new Error('Published post missing generated page: '+post.slug);
}
console.log('Runtime clinic settings and content index audit passed');

// Keep the crawler entry point in sync with the generated sitemap host.
const builtRobots=fs.readFileSync(path.join(out,'robots.txt'),'utf8');
const sitemapPointers=[...builtRobots.matchAll(/^Sitemap:\s*(\S+)\s*$/gmi)].map(match=>match[1]);
if(sitemapPointers.length!==1||sitemapPointers[0]!=='https://ejoeundental.pages.dev/sitemap.xml')throw new Error('Preview robots.txt sitemap pointer mismatch');
if(!/^Disallow:\s*\/admin\/\s*$/mi.test(builtRobots))throw new Error('Admin exclusion missing from robots.txt');
console.log('Preview crawler configuration audit passed');


// Quality gate: sitemap entries and search recommendation destinations must exist in the build.
const sitemapXmlAudit=fs.readFileSync(path.join(out,'sitemap.xml'),'utf8');
const sitemapLocations=[...sitemapXmlAudit.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m=>m[1].trim());
if(!sitemapLocations.length)throw new Error('Sitemap has no URLs');
const seenSitemap=new Set();
for(const location of sitemapLocations){
 const url=new URL(location);
 if(!['https://ejoeundental.com','https://ejoeundental.pages.dev'].includes(url.origin))throw new Error('Unexpected sitemap origin: '+location);
 if(seenSitemap.has(url.pathname))throw new Error('Duplicate sitemap path: '+url.pathname);
 seenSitemap.add(url.pathname);
 const routePath=decodeURIComponent(url.pathname.slice(1));
 const destination=url.pathname==='/'?path.join(out,'index.html'):path.join(out,routePath.endsWith('/')?routePath+'index.html':routePath);
 if(!fs.existsSync(destination)||!fs.statSync(destination).isFile())throw new Error('Sitemap target missing: '+location);
}
for(const [route,fragment] of [
 ['/additional-health.html','dentures'],
 ['/additional-health.html','cavities'],
 ['/health/tooth-preservation.html',null],
 ['/health/insurance-denture.html',null],
 ['/health/insurance-cavity.html',null],
 ['/gum-treatment.html',null],
 ['/retreatment.html',null],
 ['/cervical-abrasion.html',null],
 ['/insured-care.html',null],
 ['/root-canal-health.html',null]
]){
 const destination=path.join(out,route.slice(1));
 if(!fs.existsSync(destination))throw new Error('Search recommendation missing: '+route);
 if(fragment){
  const markup=fs.readFileSync(destination,'utf8');
  if(!markup.includes('id="'+fragment+'"')&&!markup.includes("id='"+fragment+"'"))throw new Error('Search recommendation anchor missing: '+route+'#'+fragment);
 }
}
console.log('Sitemap ('+sitemapLocations.length+' URLs) and search recommendation audit passed');


// Audit local stylesheet and script references in public HTML pages.
const publicHtmlFiles=[];
function collectHtml(directory){
 for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
  if(entry.name==='admin')continue;
  const absolute=path.join(directory,entry.name);
  if(entry.isDirectory())collectHtml(absolute);
  else if(entry.name.endsWith('.html'))publicHtmlFiles.push(absolute);
 }
}
collectHtml(out);
let checkedAssets=0;
for(const htmlFile of publicHtmlFiles){
 const markup=fs.readFileSync(htmlFile,'utf8');
 for(const match of markup.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["'](\/assets\/[^"'?#]+)(?:[?#][^"']*)?["'][^>]*>/gi)){
  const asset=path.join(out,match[1].slice(1));
  if(!fs.existsSync(asset)||!fs.statSync(asset).isFile())throw new Error('Missing linked asset in '+path.relative(out,htmlFile)+': '+match[1]);
  checkedAssets++;
 }
}
console.log('Public HTML asset references checked: '+checkedAssets+' across '+publicHtmlFiles.length+' pages');

// Long multi-section patient articles should not start with a screenful of navigation.
// A native, closed-by-default <details> lets readers expand the section links without
// JavaScript. The original anchors and headings stay present in the HTML for everyone.
let compactedHealthTocs=0;
for(const filename of fs.readdirSync(healthDir).filter(name=>name.endsWith('.html'))){
 const target=path.join(healthDir,filename);
 const original=fs.readFileSync(target,'utf8');
 const toc=original.match(/<nav class="article-toc" aria-label="이 글의 목차"><strong>이 글의 목차<\/strong>(<ul>[\s\S]*?<\/ul>)<\/nav>/);
 if(!toc)throw new Error('Expected standard patient article table of contents: '+filename);
 if(original.includes('article-toc-details'))throw new Error('Repeated patient table-of-contents disclosure: '+filename);
 const compact='<nav class="article-toc" aria-label="이 글의 목차">'+
  '<details class="article-toc-details">'+
  '<summary>이 글의 목차 펼치기 <span aria-hidden="true">▾</span></summary>'+
  toc[1]+'</details></nav>';
 const changed=original.replace(toc[0],compact);
 if(changed===original)throw new Error('Unable to compact patient article TOC: '+filename);
 fs.writeFileSync(target,changed);
 compactedHealthTocs++;
}
if(compactedHealthTocs!==46)throw new Error('Patient TOCs not compacted on all 46 guides');
console.log('Mobile article contents compacted:',compactedHealthTocs,'patient guides (no JavaScript required)');

// Validate article table-of-contents links against actual heading IDs.
let checkedArticleToc=0;
for(const htmlFile of publicHtmlFiles){
 const markup=fs.readFileSync(htmlFile,'utf8');
 if(!markup.includes('class="article-toc"'))continue;
 const toc=markup.match(/<nav\b[^>]*class="article-toc"[^>]*>([\s\S]*?)<\/nav>/i);
 if(!toc)throw new Error('Invalid article table of contents: '+path.relative(out,htmlFile));
 const links=[...toc[1].matchAll(/<a\b[^>]*href="#([^"]+)"[^>]*>/gi)].map(m=>m[1]);
 if(!links.length)throw new Error('Empty article table of contents: '+path.relative(out,htmlFile));
 if(!/<nav\b[^>]*class=["'][^"']*\barticle-toc\b[^"']*["'][^>]*\baria-label=["'][^"']+["']/i.test(markup))throw new Error('Article table of contents needs an accessible label: '+path.relative(out,htmlFile));
 if(new Set(links).size!==links.length)throw new Error('Duplicate article contents links: '+path.relative(out,htmlFile));
 const articleOpening=/<main\b[^>]*\bclass=["'][^"']*\barticle\b[^"']*["'][^>]*>/i.exec(markup);
 const articleStart=articleOpening?articleOpening.index:-1;
 const articleEnd=articleStart<0?-1:markup.indexOf('</main>',articleStart);
 if(articleStart<0||articleEnd<0)throw new Error('Article contents outside patient article: '+path.relative(out,htmlFile));
 const article=markup.slice(articleStart,articleEnd);
 const sectionIds=[...article.matchAll(/<h2\b[^>]*\bid="([^"]+)"[^>]*>/gi)].map(m=>m[1]);
 if(sectionIds.length!==links.length||sectionIds.some((id,index)=>id!==links[index]))throw new Error('Article contents and section headings differ: '+path.relative(out,htmlFile));
 if(!/<a\b[^>]*class=["'][^"']*\barticle-skip-link\b[^"']*["'][^>]*>/i.test(markup))throw new Error('Article with contents is missing keyboard skip link: '+path.relative(out,htmlFile));
 if(!/<main\b[^>]*\bid=["']article-main["'][^>]*>/i.test(markup))throw new Error('Article contents page has no accessible main target: '+path.relative(out,htmlFile));
 const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 if(new Set(ids).size!==ids.length)throw new Error('Duplicate HTML ID in '+path.relative(out,htmlFile));
 for(const id of links){
  if(!ids.includes(id))throw new Error('Article contents link has no target: '+path.relative(out,htmlFile)+'#'+id);
  if(!new RegExp('<h[2-6]\\b[^>]*\\bid="'+id+'"').test(markup))throw new Error('Article contents link does not point to a heading: '+path.relative(out,htmlFile)+'#'+id);
 }
 checkedArticleToc++;
}
console.log('Article table-of-contents anchors checked across '+checkedArticleToc+' pages');

// Check that keyboard skip links resolve to an actual element on the same page.
let checkedSkipLinks=0;
for(const htmlFile of publicHtmlFiles){
 const markup=fs.readFileSync(htmlFile,'utf8');
 const skipLinks=[...markup.matchAll(/<a\b[^>]*class=["'][^"']*\b(?:article-skip-link|page-skip-link)\b[^"']*["'][^>]*>/gi)];
 for(const match of skipLinks){
  const href=match[0].match(/\bhref=["']#([^"']+)["']/i);
  if(!href)throw new Error('Skip link must target a page fragment: '+path.relative(out,htmlFile));
  const target=href[1];
  const targetIds=[...markup.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
  if(!targetIds.includes(target))throw new Error('Missing skip-link target in '+path.relative(out,htmlFile)+': #'+target);
  const mainTargets=[...markup.matchAll(/<main\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);
  if(!mainTargets.includes(target))throw new Error('Skip link must point to main content in '+path.relative(out,htmlFile)+': #'+target);
  checkedSkipLinks++;
 }
}
console.log('Keyboard skip links checked: '+checkedSkipLinks);


// Every public health guide in the sitemap must retain its accessible contents navigation.
const healthSitemapRoutes=sitemapLocations.map(location=>new URL(location).pathname).filter(route=>/^\/health\/[^/]+\.html$/.test(route));
if(!healthSitemapRoutes.length)throw new Error('No patient health articles found in sitemap');
for(const route of healthSitemapRoutes){
 const html=fs.readFileSync(path.join(out,route.slice(1)),'utf8');
 if(!/<nav\b[^>]*class=["'][^"']*\barticle-toc\b[^"']*["']/i.test(html))throw new Error('Sitemap health article is missing contents navigation: '+route);
 if(!/<a\b[^>]*class=["'][^"']*\barticle-skip-link\b[^"']*["']/i.test(html))throw new Error('Sitemap health article is missing skip navigation: '+route);
}
if(checkedArticleToc<healthSitemapRoutes.length)throw new Error('Fewer validated article contents than sitemap health articles');
for(const route of healthSitemapRoutes){
 const html=fs.readFileSync(path.join(out,route.slice(1)),'utf8');
 const tocStart=html.search(/<nav\b[^>]*class=["'][^"']*\barticle-toc\b/i);
 const mainStart=html.search(/<main\b[^>]*class=["'][^"']*\barticle\b/i);
 const firstHeading=html.search(/<h2\b/i);
 if(mainStart<0||tocStart<mainStart||firstHeading<tocStart)throw new Error('Health guide contents navigation must precede the first section: '+route);
 const skip=html.match(/<a\b[^>]*class=["'][^"']*\barticle-skip-link\b[^"']*["'][^>]*>/i)?.[0];
 if(!skip||!/\bhref=["']#article-main["']/.test(skip))throw new Error('Health guide skip link must target #article-main: '+route);
}

console.log('Sitemap health guides with contents and skip navigation checked: '+healthSitemapRoutes.length);


// Search-engine metadata and document outline checks for sitemap patient guides.
let checkedHealthMetadata=0;
const seenHealthTitlesAudit=new Map();
const seenHealthDescriptionsAudit=new Map();
for(const route of healthSitemapRoutes){
 const html=fs.readFileSync(path.join(out,route.slice(1)),'utf8');
 const title=html.match(/<title>\s*([^<]+?)\s*<\/title>/i)?.[1];
 const description=html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1];
 const canonical=html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
 const headings=[...html.matchAll(/<h1\b[^>]*>/gi)];
 if(!title||!title.trim())throw new Error('Health guide missing page title: '+route);
 if(!description||!description.trim())throw new Error('Health guide missing meta description: '+route);
 if(!['https://ejoeundental.com'+route,'https://ejoeundental.pages.dev'+route].includes(canonical))throw new Error('Health guide canonical URL mismatch: '+route);
 if(headings.length!==1)throw new Error('Health guide must have exactly one H1: '+route);
 const normalizedTitle=title.trim().replace(/\s+/g,' ');
 const normalizedDescription=description.trim().replace(/\s+/g,' ');
 if(seenHealthTitlesAudit.has(normalizedTitle))throw new Error('Duplicate health guide title: '+seenHealthTitlesAudit.get(normalizedTitle)+' and '+route);
 if(seenHealthDescriptionsAudit.has(normalizedDescription))throw new Error('Duplicate health guide description: '+seenHealthDescriptionsAudit.get(normalizedDescription)+' and '+route);
 seenHealthTitlesAudit.set(normalizedTitle,route);
 seenHealthDescriptionsAudit.set(normalizedDescription,route);
 checkedHealthMetadata++;
}
console.log('Health guide titles, descriptions, canonical URLs and H1 checked: '+checkedHealthMetadata);


// Validate local links inside health guides without following external sites or phone links.
let checkedHealthPageLinks=0;
for(const route of healthSitemapRoutes){
 const html=fs.readFileSync(path.join(out,route.slice(1)),'utf8');
 for(const match of html.matchAll(/<a\b[^>]*\bhref=["'](\/(?!\/)[^"'#?]*)(?:\?[^"'#]*)?(?:#([^"']*))?["']/gi)){
  const rawPath=match[1];
  let decoded;
  try{decoded=decodeURIComponent(rawPath)}catch{throw new Error('Malformed health guide link: '+route+' -> '+rawPath)}
  if(decoded.includes('\\')||decoded.split('/').includes('..'))throw new Error('Unsafe health guide link: '+route+' -> '+rawPath);
  const resolved=decoded.endsWith('/')?decoded+'index.html':decoded;
  if(!resolved.endsWith('.html'))continue;
  const destination=path.join(out,resolved.slice(1));
  if(!fs.existsSync(destination)||!fs.statSync(destination).isFile())throw new Error('Broken health guide link: '+route+' -> '+rawPath);
  checkedHealthPageLinks++;
 }
}
console.log('Local health guide page links checked: '+checkedHealthPageLinks);


// Patient safety and practical access: every published health article needs a disclaimer and contact route.
let checkedHealthPatientInfo=0;
for(const route of healthSitemapRoutes){
 const html=fs.readFileSync(path.join(out,route.slice(1)),'utf8');
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
 if(!main)throw new Error('Health article missing main content: '+route);
 const notices=[...main.matchAll(/<small\b[^>]*>([\s\S]*?)<\/small>/gi)].map(m=>m[1].replace(/<[^>]+>/g,'').trim());
 if(!notices.some(note=>note.includes('건강정보')||note.includes('일반적인 정보')))throw new Error('Health article missing general-information disclaimer: '+route);
 if(!/<a\b[^>]*href=["']tel:0325132875["']/i.test(main))throw new Error('Health article missing clinic phone link: '+route);
 if(!/<a\b[^>]*href=["']\/#location["']/i.test(main))throw new Error('Health article missing location and hours link: '+route);
 checkedHealthPatientInfo++;
}
console.log('Health article safety notices and contact links checked: '+checkedHealthPatientInfo);


// Give the existing care guides direct, crawlable links to relevant published
// patient articles. Keep links in generated HTML (not an async client fetch)
// and exclude posts already cited elsewhere on the same guide.
{
 const careStoryGuides=[
  {file:'gum-treatment.html', topic:'gum', title:'잇몸치료와 관련된 환자 교육 글', match:/잇몸|치주|치은|치석|스케일링|큐렛/},
  {file:'scaling.html', topic:'gum', title:'스케일링을 받은 뒤 궁금한 점', match:/스케일링|치석/},
  {file:'retreatment.html', topic:'root', title:'신경치료·재신경치료 관련 글', match:/재신경치료|신경치료|근관치료|치근단/},
  {file:'root-canal-health.html', topic:'root', title:'신경치료를 이해하는 데 도움이 되는 글', match:/신경치료|근관치료|재신경치료/},
  {file:'cavity-treatment.html', topic:'cavity', title:'충치치료 전 읽어볼 글', match:/충치|레진|치아가 깨|치아파절/},
  {file:'cervical-abrasion.html', topic:'cavity', title:'시린 이와 치경부마모증에 관한 글', match:/치경부|시린|마모증/},
  {file:'denture.html', topic:'prosthetic', title:'틀니를 오래 편안하게 쓰기 위한 글', match:/틀니/},
  {file:'implant.html', topic:'prosthetic', title:'임플란트 전에 알아둘 글', match:/임플란트|뼈이식/},
  {file:'wisdom-tooth.html', topic:'wisdom', title:'사랑니 발치 전후 궁금한 점', match:/사랑니|발치.*지혈/},
  {file:'insured-care.html', topic:'choice', title:'보험 진료와 치료 선택을 돕는 글', match:/건강보험|보험진료|보험 진료|과잉진료|치료비|진료비|저렴하게/}
 ];
 const storyText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let careStoryLinks=0;
 for(const guide of careStoryGuides){
  const filename=path.join(out,guide.file);
  if(!fs.existsSync(filename))throw new Error('Missing public care guide for story links: '+guide.file);
  let html=fs.readFileSync(filename,'utf8');
  if(html.includes('data-care-story-links="1"'))throw new Error('Care story links already inserted: '+guide.file);
  const eligible=posts.filter(post=>guide.match.test(String(post.title||'')) &&
   !html.includes('/stories/'+encodeURIComponent(post.slug)+'/'))
   .slice(0,5);
  if(!eligible.length){console.log('Care guide already links to available related stories:',guide.file);continue;}
  for(const post of eligible){
   const actual=path.join(out,'stories',post.slug,'index.html');
   if(!fs.existsSync(actual))throw new Error('Missing story linked from '+guide.file+': '+post.slug);
  }
  const links=eligible.map(post=>
   '<li style="margin:11px 0"><a href="/stories/'+encodeURIComponent(post.slug)+
   '/" style="font-weight:750;color:#20533f">'+storyText(post.title)+'</a></li>'
  ).join('');
  const section='<section data-care-story-links="1" aria-label="관련 환자 교육 글" '+
   'style="max-width:960px;margin:32px auto;padding:20px 22px;background:#f5f8f2;'+
   'border:1px solid #d4e2d3;border-radius:14px;color:#244737">'+
   '<h2 style="margin:0 0 10px;font-size:clamp(20px,3vw,26px)">'+storyText(guide.title)+'</h2>'+
   '<p style="margin:0">원장이 작성한 블로그 자료를 환자분들이 이해하기 쉽게 정리했습니다. 궁금한 내용을 골라 읽어보세요.</p>'+
   '<ul style="padding-left:21px;margin:10px 0 15px">'+links+'</ul>'+
   '<p style="margin:0"><a href="/stories.html#topic-'+guide.topic+
   '" style="font-weight:750;color:#20533f">같은 주제의 치과 이야기 더 보기 →</a></p></section>';
  if(!html.includes('</main>'))throw new Error('Care guide missing closing main: '+guide.file);
  html=html.replace(/<\/main>/i,section+'</main>');
  fs.writeFileSync(filename,html,'utf8');
  careStoryLinks+=eligible.length;
 }
 console.log('Care guides linked to published patient articles:',
  careStoryGuides.length,'guides;',careStoryLinks,'article links');
}

// Always serve canonical URLs for the live custom domain unless a preview origin is explicitly selected.
// The preview transform happens during initial generation; production URLs are normalized below.
const selectedPublicOrigin = process.env.SITE_PUBLIC_ORIGIN || 'https://ejoeundental.com';
// Production is the default now that the public custom domain is serving the website.
// Set SITE_PUBLIC_ORIGIN explicitly to build for the pages.dev preview when needed.
if (!['https://ejoeundental.pages.dev', 'https://ejoeundental.com'].includes(selectedPublicOrigin)) {
  throw new Error('Unsupported SITE_PUBLIC_ORIGIN: ' + selectedPublicOrigin);
}
// Naver Search Advisor accepts a recent full-text RSS 2.0 feed alongside the
// existing comprehensive sitemap. Generate it only from published articles.
{
 const limit=20;
 const feedPosts=posts.slice(0,limit);
 if(!feedPosts.length)throw new Error('RSS needs at least one published story');
 const xmlEscape=value=>String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')
  .replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const pubDate=value=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return '';
  // CMS has date, not time. Noon KST is a deterministic date-only conversion.
  const date=new Date(value+'T03:00:00Z');
  return Number.isFinite(date.valueOf())?'<pubDate>'+date.toUTCString()+'</pubDate>':'';
 };
 const xml=['<?xml version="1.0" encoding="UTF-8"?>','<rss version="2.0"><channel>',
  '<title>이조은치과 원장이 전하는 치과 이야기</title>',
  '<link>'+xmlEscape(selectedPublicOrigin+'/')+'</link>',
  '<description>인천 부평구 청천동 이조은치과의 잇몸치료·신경치료·충치치료 등 환자 교육 글</description>',
  '<language>ko-KR</language>',
  ...feedPosts.map(post=>{
   const url=selectedPublicOrigin+'/stories/'+encodeURIComponent(post.slug)+'/';
   const fullText=String(post.body||'').trim();
   if(fullText.length<90)throw new Error('RSS body unexpectedly short: '+post.slug);
   return '<item><title>'+xmlEscape(post.title)+'</title>'+
    '<link>'+xmlEscape(url)+'</link>'+
    '<guid isPermaLink="true">'+xmlEscape(url)+'</guid>'+
    pubDate(post.date)+'<description>'+xmlEscape(fullText)+'</description></item>';
  }),'</channel></rss>'];
 const data=xml.join('\n')+'\n';
 if(Buffer.byteLength(data,'utf8')>=10*1024*1024)throw Error('RSS exceeds Naver feed limit');
 fs.writeFileSync(path.join(out,'rss.xml'),data,'utf8');
 for(const file of ['index.html','stories.html']){
  const dest=path.join(out,file),html=fs.readFileSync(dest,'utf8');
  if(!html.includes('</head>')||html.includes('type="application/rss+xml"'))
   throw new Error('RSS discovery head missing or duplicated: '+file);
  const tag='<link rel="alternate" type="application/rss+xml" title="이조은치과 치과 이야기 RSS" href="'+
   xmlEscape(selectedPublicOrigin+'/rss.xml')+'">';
  fs.writeFileSync(dest,html.replace('</head>',tag+'</head>'),'utf8');
 }
 console.log('Clinic patient RSS:',feedPosts.length,'complete articles;',
  Buffer.byteLength(data,'utf8'),'bytes;',selectedPublicOrigin);
}

if (selectedPublicOrigin === 'https://ejoeundental.com') {
  let updatedFiles = 0;
  function normalizePublishedOrigin(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filename = path.join(dir, entry.name);
      if (entry.isDirectory()) { normalizePublishedOrigin(filename); continue; }
      if (!/\.(?:html|xml|txt|json|js|mjs|css|webmanifest)$/i.test(entry.name)) continue;
      const before = fs.readFileSync(filename, 'utf8');
      const after = before.replaceAll('https://ejoeundental.pages.dev', selectedPublicOrigin);
      if (after !== before) { fs.writeFileSync(filename, after); updatedFiles++; }
    }
  }
  normalizePublishedOrigin(out);
  const productionSitemap = fs.readFileSync(path.join(out, 'sitemap.xml'), 'utf8');
  if (productionSitemap.includes('ejoeundental.pages.dev') ||
      !productionSitemap.includes('<loc>https://ejoeundental.com/</loc>')) {
    throw new Error('Production sitemap host verification failed');
  }
  const productionHome = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  if (!productionHome.includes('<link rel="canonical" href="https://ejoeundental.com/">') ||
      !productionHome.includes('<meta property="og:url" content="https://ejoeundental.com/">')) {
    throw new Error('Production homepage canonical and social URL verification failed');
  }
  const productionRobots = fs.readFileSync(path.join(out, 'robots.txt'), 'utf8');
  if (!/^Sitemap:\s*https:\/\/ejoeundental\.com\/sitemap\.xml\s*$/mi.test(productionRobots)) {
    throw new Error('Production robots.txt sitemap host verification failed');
  }
  console.log('Production public origin normalized in', updatedFiles, 'generated files');
}

// Live hosts serve /treatment.html as /treatment (HTTP redirect).
// Publish redirect-free canonical URLs for eight verified live treatment guides.
// Keep source HTML filenames and relative links unchanged for compatibility.
if (selectedPublicOrigin === 'https://ejoeundental.com') {
 const cleanCareSlugs=['gum-treatment','retreatment','cervical-abrasion','insured-care','tmj-care','wisdom-tooth','implant','pediatric-orthodontics','scaling','cavity-treatment','denture','pediatric-dentistry'];
 let changed=0;
 function normalizeCareUrls(dir) {
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
   const filename=path.join(dir,entry.name);
   if(entry.isDirectory()){normalizeCareUrls(filename);continue;}
   if(!/\.(?:html|xml|txt|json|js|mjs|css|webmanifest)$/i.test(entry.name))continue;
   const before=fs.readFileSync(filename,'utf8');
   let after=before;
   for(const slug of cleanCareSlugs){
    after=after.replaceAll('https://ejoeundental.com/'+slug+'.html','https://ejoeundental.com/'+slug);
   }
   if(after!==before){fs.writeFileSync(filename,after);changed++;}
  }
 }
 normalizeCareUrls(out);
 const xml=fs.readFileSync(path.join(out,'sitemap.xml'),'utf8');
 for(const slug of cleanCareSlugs){
  const finalUrl='https://ejoeundental.com/'+slug;
  if(!xml.includes('<loc>'+finalUrl+'</loc>'))throw new Error('Final care URL absent from sitemap: '+slug);
  const html=fs.readFileSync(path.join(out,slug+'.html'),'utf8');
  if(!html.includes('<link rel="canonical" href="'+finalUrl+'">'))throw new Error('Final care canonical mismatch: '+slug);
 }
 console.log('Core care SEO URLs aligned to final published routes:',cleanCareSlugs.length,'pages;',changed,'updated output files');
}

// The live Cloudflare domain redirects /health/article.html to /health/article.
// Every published article must declare its actual final URL in canonical,
// social metadata, BreadcrumbList schema, and the sitemap (not a redirect URL).
// Keep source filenames and relative internal links unchanged for compatibility.
if(selectedPublicOrigin==='https://ejoeundental.com'){
 const healthFilenames=fs.readdirSync(path.join(out,'health')).filter(filename=>filename.endsWith('.html'));
 if(healthFilenames.length!==46)throw new Error('Expected 46 patient health guides for final URL normalization');
 const healthPairs=healthFilenames.map(filename=>[
  'https://ejoeundental.com/health/'+filename,
  'https://ejoeundental.com/health/'+filename.slice(0,-5)
 ]);
 let changed=0;
 function normalizeHealthCanonicalUrls(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const filename=path.join(dir,entry.name);
   if(entry.isDirectory()){normalizeHealthCanonicalUrls(filename);continue}
   if(!/\.(?:html|xml|txt|json|js|mjs|css|webmanifest)$/i.test(entry.name))continue;
   const before=fs.readFileSync(filename,'utf8');
   let after=before;
   for(const [oldUrl,finalUrl] of healthPairs){after=after.replaceAll(oldUrl,finalUrl)}
   if(after!==before){fs.writeFileSync(filename,after);changed++}
  }
 }
 normalizeHealthCanonicalUrls(out);
 const sitemap=fs.readFileSync(path.join(out,'sitemap.xml'),'utf8');
 for(const filename of healthFilenames){
  const finalUrl='https://ejoeundental.com/health/'+filename.slice(0,-5);
  if(!sitemap.includes('<loc>'+finalUrl+'</loc>'))throw new Error('Final health sitemap URL missing: '+filename);
  const html=fs.readFileSync(path.join(out,'health',filename),'utf8');
  if(!html.includes('<link rel="canonical" href="'+finalUrl+'">'))throw new Error('Final health canonical missing: '+filename);
  if(!html.includes('"item":"'+finalUrl+'"'))throw new Error('Final health breadcrumb schema URL missing: '+filename);
  if(html.includes('https://ejoeundental.com/health/'+filename))throw new Error('Legacy health HTML URL remains: '+filename);
 }
 console.log('Final health canonical URLs aligned:',healthFilenames.length,'articles and',changed,'updated public files');
}

// Live HTTP checks confirm that these seven public patient resources (not only
// treatment pages) redirect /file.html to /file. Publish their *final* URL in
// canonical, Open Graph, structured data and sitemap; keep relative navigation
// and the source .html filenames intact for compatibility and preview builds.
if(selectedPublicOrigin==='https://ejoeundental.com'){
 const patientInfoSlugs=[
  'gum-health','root-canal-health','insurance-health','additional-health',
  'visit-guide','medical-safety-guide','previsit-checklist'
 ];
 let affectedFiles=0;
 function normalizePatientInformationUrls(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const filename=path.join(dir,entry.name);
   if(entry.isDirectory()){normalizePatientInformationUrls(filename);continue}
   if(!/\.(?:html|xml|txt|json|js|mjs|css|webmanifest)$/i.test(entry.name))continue;
   let output=fs.readFileSync(filename,'utf8');
   const prior=output;
   for(const slug of patientInfoSlugs){
    output=output.replaceAll('https://ejoeundental.com/'+slug+'.html',
                             'https://ejoeundental.com/'+slug);
   }
   if(output!==prior){fs.writeFileSync(filename,output);affectedFiles++}
  }
 }
 normalizePatientInformationUrls(out);
 const sitemap=fs.readFileSync(path.join(out,'sitemap.xml'),'utf8');
 for(const slug of patientInfoSlugs){
  const canonicalUrl='https://ejoeundental.com/'+slug;
  const page=fs.readFileSync(path.join(out,slug+'.html'),'utf8');
  if(!sitemap.includes('<loc>'+canonicalUrl+'</loc>')||
     !page.includes('<link rel="canonical" href="'+canonicalUrl+'">')||
     sitemap.includes('<loc>'+canonicalUrl+'.html</loc>')){
   throw new Error('Patient information canonical or sitemap still points through a redirect: '+slug);
  }
  const oldOrigin='https://ejoeundental.com/'+slug+'.html';
  if(page.includes(oldOrigin)){
   throw new Error('Patient information metadata still references .html: '+slug);
  }
 }
 console.log('Remaining seven verified patient-information URLs aligned:',patientInfoSlugs.length,'pages;',affectedFiles,'output text files refreshed');
}

// All 16 remaining standalone pages in the sitemap were verified over HTTPS:
// Cloudflare serves each under the extensionless URL after .html redirection.
// Align *absolute* canonical, Open Graph and structured-data references while
// retaining existing .html files and internal links for backward compatibility.
if(selectedPublicOrigin==='https://ejoeundental.com'){
 const remainingPublishedSlugs=["gum-treatment-faq","root-canal-retreatment-faq","dental-insurance-faq","medical-history","osteoporosis-medication-dental","blood-thinners-dental","diabetes-dental-care","heart-disease-dental-care","kidney-disease-dental-care","liver-disease-dental-care","cancer-immunosuppression-dental-care","pregnancy-dental-care","noncovered-fees","medication-dental-faq","systemic-disease-dental-faq","clinical-archive"];
 let updated=0;
 function normalizeRemainingPublishedUrls(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const file=path.join(dir,entry.name);
   if(entry.isDirectory()){normalizeRemainingPublishedUrls(file);continue}
   if(!/\.(?:html|xml|txt|json|js|mjs|css|webmanifest)$/i.test(entry.name))continue;
   let html=fs.readFileSync(file,'utf8');
   const before=html;
   for(const slug of remainingPublishedSlugs){
    html=html.replaceAll('https://ejoeundental.com/'+slug+'.html',
                         'https://ejoeundental.com/'+slug);
   }
   if(html!==before){fs.writeFileSync(file,html);updated++}
  }
 }
 normalizeRemainingPublishedUrls(out);
 const sitemap=fs.readFileSync(path.join(out,'sitemap.xml'),'utf8');
 for(const slug of remainingPublishedSlugs){
  const finalUrl='https://ejoeundental.com/'+slug;
  const page=fs.readFileSync(path.join(out,slug+'.html'),'utf8');
  if(!sitemap.includes('<loc>'+finalUrl+'</loc>')||
     sitemap.includes('<loc>'+finalUrl+'.html</loc>')||
     !page.includes('<link rel="canonical" href="'+finalUrl+'">')||
     page.includes('https://ejoeundental.com/'+slug+'.html')){
   throw new Error('Unaligned final URL for remaining patient resource: '+slug);
  }
 }
 console.log('Last 16 clinic and patient-safety page URLs aligned:',remainingPublishedSlugs.length,'pages;',updated,'public text assets');
}

// 16 standalone public pages were missing consistent navigation between FAQs,
// medical safety, pricing and the underlying clinic information. Give each an
// accessible location trail, keyboard skip link and matching BreadcrumbList
// (unless the page already publishes one). Medical advice itself stays unchanged.
const standalonePatientPages=[
 ['gum-treatment-faq','gum-treatment','잇몸치료'],
 ['root-canal-retreatment-faq','retreatment','재신경치료'],
 ['dental-insurance-faq','insured-care','건강보험 진료'],
 ['medical-history',null,null],
 ['osteoporosis-medication-dental','medical-history','복용약·전신질환 안내'],
 ['blood-thinners-dental','medical-history','복용약·전신질환 안내'],
 ['diabetes-dental-care','medical-history','복용약·전신질환 안내'],
 ['heart-disease-dental-care','medical-history','복용약·전신질환 안내'],
 ['kidney-disease-dental-care','medical-history','복용약·전신질환 안내'],
 ['liver-disease-dental-care','medical-history','복용약·전신질환 안내'],
 ['cancer-immunosuppression-dental-care','medical-history','복용약·전신질환 안내'],
 ['pregnancy-dental-care','medical-history','복용약·전신질환 안내'],
 ['noncovered-fees',null,null],
 ['medication-dental-faq','medical-history','복용약·전신질환 안내'],
 ['systemic-disease-dental-faq','medical-history','복용약·전신질환 안내'],
 ['clinical-archive',null,null]
];
let standalonePatientNavCount=0;
for(const [slug,parentSlug,parentLabel] of standalonePatientPages){
 const filename=slug+'.html';
 const target=path.join(out,filename);
 let html=fs.readFileSync(target,'utf8');
 if(html.includes('class="patient-standalone-trail"'))throw new Error('Duplicate standalone patient navigation: '+slug);
 const mainTag=html.match(/<main\b[^>]*>/i)?.[0];
 const h1=html.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g,'').trim();
 const canonical=html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
 if(!mainTag||!h1||!canonical)throw new Error('Missing standalone main, title or canonical: '+slug);
 const expectedUrl=selectedPublicOrigin+'/'+slug+(selectedPublicOrigin.endsWith('.com')?'':'.html');
 if(canonical!==expectedUrl)throw new Error('Standalone breadcrumb URL does not match canonical: '+slug);
 const existingTrails=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(match=>JSON.parse(match[1])).filter(item=>item['@type']==='BreadcrumbList');
 if(existingTrails.length>1)throw new Error('Duplicate pre-existing breadcrumb schemas: '+slug);
 const existing=existingTrails[0]?.itemListElement;
 const homeLabel=existing?.[0]?.name||'이조은치과 홈';
 const currentLabel=existing?.[existing.length-1]?.name||h1;
 if(existingTrails.length===1&&parentSlug)throw new Error('Unexpected parent route on pre-existing breadcrumb: '+slug);
 const crumbItems=[{'@type':'ListItem',position:1,name:homeLabel,item:selectedPublicOrigin+'/'}];
 let parentLink='';
 if(parentSlug){
  const parentFile=fs.readFileSync(path.join(out,parentSlug+'.html'),'utf8');
  const parentUrl=parentFile.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  if(!parentUrl||!parentUrl.startsWith(selectedPublicOrigin+'/')){
   throw new Error('Related standalone page has no valid parent canonical: '+slug);
  }
  crumbItems.push({'@type':'ListItem',position:2,name:parentLabel,item:parentUrl});
  parentLink='<span class="separator" aria-hidden="true">›</span><a href="/'+parentSlug+(selectedPublicOrigin.endsWith('.com')?'':'.html')+'">'+escapeBreadcrumbText(parentLabel)+'</a>';
 }
 crumbItems.push({'@type':'ListItem',position:crumbItems.length+1,name:currentLabel,item:canonical});
 const schema={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:crumbItems};
 const schemaTag='<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>';
 if(existingTrails.length===1){
  // Legacy metadata may use the production host even in preview builds.
  // Rebuild just its BreadcrumbList while leaving MedicalWebPage data intact.
  const priorTag=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
   .find(match=>JSON.parse(match[1])['@type']==='BreadcrumbList')?.[0];
  if(!priorTag)throw new Error('Standalone prior breadcrumb tag missing: '+slug);
  html=html.replace(priorTag,schemaTag);
 }else{
  html=html.replace(/<\/head>/i,schemaTag+'</head>');
 }
 const trail='<nav class="patient-standalone-trail" aria-label="현재 위치">'+
   '<a href="/">'+escapeBreadcrumbText(homeLabel)+'</a>'+parentLink+
   '<span class="separator" aria-hidden="true">›</span>'+
   '<span aria-current="page">'+escapeBreadcrumbText(currentLabel)+'</span></nav>';
 const id=mainTag.match(/\bid="([^"]+)"/)?.[1]||'patient-main';
 if(!mainTag.includes('id="')){
  html=html.replace(mainTag,mainTag.replace(/<main/i,'<main id="patient-main"'));
 }
 const finalOpening=html.match(/<main\b[^>]*>/i)?.[0];
 html=html.replace(finalOpening,finalOpening+trail);
 const existingSkip=[...html.matchAll(/<a\b[^>]*href="#([^"]+)"[^>]*>[^<]*본문[^<]*<\/a>/gi)]
   .find(x=>x[1]===id);
 if(!existingSkip){
  if(html.includes('class="patient-standalone-skip"'))throw new Error('Duplicate standalone skip: '+slug);
  html=html.replace(/<body\b[^>]*>/i,match=>match+
   '<a class="patient-standalone-skip" href="#'+id+'">본문으로 바로가기</a>');
 }
 html=html.replace(/<\/head>/i,
  '<link rel="stylesheet" href="/assets/patient-page-navigation.css?v=20261023-1"></head>');
 if(!html.includes('href="#'+id+'"')||
    (html.match(/class="patient-standalone-trail"/g)||[]).length!==1){
  throw new Error('Standalone breadcrumb or keyboard skip invalid: '+slug);
 }
 fs.writeFileSync(target,html);
 standalonePatientNavCount++;
}
if(standalonePatientNavCount!==16)throw new Error('Incomplete standalone patient navigation');
console.log('Standalone patient-page visible navigation checked:',standalonePatientNavCount,'pages');



// Keep each patient article's search snippet, Open Graph and messaging-card
// metadata in sync with its real, redirect-free, published canonical URL.
// This applies only to public clinical education and four main care guides,
// never private clinic-reference pages, admin, search results or fee listings.
const clinicalSharingFiles=[
 ...fs.readdirSync(path.join(out,'health')).filter(f=>f.endsWith('.html')).map(f=>'health/'+f),
 'gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html',
 'gum-treatment.html','retreatment.html','cervical-abrasion.html','insured-care.html'
];
if(clinicalSharingFiles.length!==54||new Set(clinicalSharingFiles).size!==54){
 throw new Error('Expected 54 unique public clinical pages for social preview metadata');
}
const escapeSharingValue=value=>String(value)
 .replace(/&(?!#\d+;|#x[\da-f]+;|[a-z][a-z\d]+;)/gi,'&amp;')
 .replace(/"/g,'&quot;').replace(/</g,'&lt;');
let clinicalSharingCount=0;
for(const relative of clinicalSharingFiles){
 const target=path.join(out,relative);
 let html=fs.readFileSync(target,'utf8');
 const title=html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
 const description=html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1]?.trim();
 const canonical=html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
 if(!title||!description||!canonical||!canonical.startsWith(selectedPublicOrigin+'/')){
  throw new Error('Clinical preview missing trustworthy title, description or canonical: '+relative);
 }
 const isHub=['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'].includes(relative);
 const expected=[
  ['property','og:type',isHub?'website':'article'],
  ['property','og:title',title],['property','og:description',description],
  ['property','og:url',canonical],['property','og:site_name','이조은치과'],
  ['property','og:locale','ko_KR'],['name','twitter:card','summary'],
  ['name','twitter:title',title],['name','twitter:description',description]
 ];
 for(const [kind,key,value] of expected){
  const matching=[...html.matchAll(/<meta\b[^>]*>/gi)]
    .filter(m=>m[0].includes(kind+'="'+key+'"')||m[0].includes(kind+"='"+key+"'"));
  if(matching.length>1)throw new Error('Duplicate share-card field '+key+': '+relative);
  const correct='<meta '+kind+'="'+key+'" content="'+escapeSharingValue(value)+'">';
  if(matching.length===1)html=html.replace(matching[0][0],correct);
  else html=html.replace(/<\/head>/i,correct+'</head>');
 }
 for(const [kind,key,value] of expected){
  const expectedMarkup='<meta '+kind+'="'+key+'" content="'+escapeSharingValue(value)+'">';
  if(html.split(expectedMarkup).length!==2)throw new Error('Incorrect clinical sharing field '+key+': '+relative);
 }
 fs.writeFileSync(target,html);
 clinicalSharingCount++;
}
console.log('Clinical education sharing metadata aligned:',clinicalSharingCount,'public pages.');

// Give patients a consistent way back to the full homepage dental story archive
// from any public clinical guide. Keep both collections clearly separated.
// Render links during the build, not through a client-side dependency.
{
 const storyStyleVersion=createHash('sha256').update(fs.readFileSync(path.join(out,'assets/patient-story-links.css'))).digest('hex').slice(0,12);
 const cssRef='<link rel="stylesheet" href="/assets/patient-story-links.css?v='+storyStyleVersion+'">';
 // Link each patient guide to two actual, published stories relevant to its
 // diagnosis or treatment. These are curated rules, not similarity guesses.
 // All destinations must exist in the published CMS collection.
 const publishedClinicStories=new Map(publishedSources.map(({name,post})=>[
  path.basename(name,'.json'),String(post.title||'')
 ]));
 const storyCareRules=[
  {test:/^(?:gum-treatment|gum-health)\.html$/,slugs:[
   '2026-10-25-incheon-periodontal-maintenance-after-treatment',
   '2026-10-25-incheon-loose-tooth-suddenly-periodontal-exam']},
  {test:/^(?:retreatment|root-canal-health)\.html$/,slugs:[
   '2026-10-25-bupyeong-retreatment-crown-post-can-tooth-be-saved',
   '2026-10-25-incheon-retreatment-root-tip-dark-spot-no-pain']},
  {test:/^cervical-abrasion\.html$/,slugs:[
   '2026-10-25-samsan-cervical-abrasion-gi-insurance-vs-resin',
   '2026-10-24-bupyeong-tooth-wear-sensitivity-treatment']},
  {test:/^health\/(?:abrasion-gi|insurance-cervical)\.html$/,slugs:[
   '2026-10-25-samsan-cervical-abrasion-gi-insurance-vs-resin',
   '2026-10-24-bupyeong-cavity-gi-insurance']},
  {test:/^cervical-abrasion\.html$|^health\/(?:abrasion-|insurance-cervical)/,slugs:[
   '2026-10-24-bupyeong-tooth-wear-sensitivity-treatment',
   '2026-10-24-bupyeong-cavity-gi-insurance']},
  {test:/^(?:insured-care|insurance-health)\.html$/,slugs:[
   'naver-224430998602-treatment-priority',
   '2026-10-24-bupyeong-cavity-gi-insurance']},
  {test:/^additional-health\.html$/,slugs:[
   'naver-224425324653-root-canal-or-extraction',
   '2026-10-24-bupyeong-tooth-wear-sensitivity-treatment']},
  {test:/^health\/(?:gum-pus|swollen-gums)\.html$/,slugs:[
   'naver-224400753947-gum-pus-periodontal-abscess',
   '2026-10-25-incheon-loose-tooth-suddenly-periodontal-exam']},
  {test:/^health\/(?:loose-tooth|receding-gums)\.html$/,slugs:[
   '2026-10-25-incheon-loose-tooth-suddenly-periodontal-exam',
   'naver-224405321060-gingival-recession-teeth-look-longer']},
  {test:/^health\/root-canal-process\.html$/,slugs:[
   '2026-10-25-bupyeong-root-canal-how-many-visits-and-why',
   '2026-10-25-bupyeong-root-canal-temporary-filling-fell-out']},
  {test:/^health\/(?:root-canal-after-pain|root-canal-pain|root-canal-process)\.html$/,slugs:[
   '2026-10-25-bupyeong-root-canal-after-treatment-pain',
   '2026-10-25-bupyeong-root-canal-temporary-filling-fell-out']},
  {test:/^health\/(?:root-canal-lesion|root-canal-retreatment|root-canal-retreatment-process)\.html$/,slugs:[
   '2026-10-25-incheon-retreatment-root-tip-dark-spot-no-pain',
   'naver-224421350291-retreatment-after-root-canal-pain']},
  {test:/^health\/(?:root-canal-crown|tooth-crack)\.html$/,slugs:[
   '2026-10-25-bupyeong-retreatment-crown-post-can-tooth-be-saved',
   'naver-224425324653-root-canal-or-extraction']},
  {test:/^health\/(?:tooth-preservation|tooth-second-opinion|root-canal-or-extraction|tooth-stepwise)\.html$/,slugs:[
   'naver-224425324653-root-canal-or-extraction',
   'naver-224430998602-treatment-priority']},
  {test:/^health\/(?:denture-|insurance-denture)/,slugs:[
   '2026-10-24-bupyeong-denture-adjustment-dentist-evaluation',
   '2026-10-24-bupyeong-good-dentist-selection']},
  {test:/^health\/(?:insurance-implant)\.html$/,slugs:[
   '2026-10-25-sangok-implant-bone-graft-always-necessary',
   '2026-10-24-bupyeong-affordable-dental-implants-total-cost-checklist']},
  {test:/^health\/insurance-extraction\.html$/,slugs:[
   '2026-10-25-bupyeong-wisdom-tooth-extraction-hemostatic-dressing',
   'naver-224430998602-treatment-priority']},
  {test:/^health\/cavity-depth\.html$/,slugs:[
   'naver-223658065860-cheongcheon-caries-treatment-stages',
   'naver-223657999967-sangok-caries']},
  {test:/^health\/cavity-early\.html$/,slugs:[
   '01','naver-223658065860-cheongcheon-caries-treatment-stages']},
  {test:/^health\/cavity-materials\.html$/,slugs:[
   'naver-223654967684-cheongcheon-resin',
   '2026-10-24-bupyeong-cavity-gi-insurance']},
  {test:/^health\/cavity-recurrent\.html$/,slugs:[
   'naver-223654967684-cheongcheon-resin',
   'naver-223657999967-sangok-caries']},
  {test:/^health\/insurance-checkup\.html$/,slugs:[
   'naver-223662259955-cheongcheon-oral-exam',
   'naver-224430998602-treatment-priority']},
  {test:/^health\/(?:cavity-|insurance-cavity)/,slugs:[
   '01','2026-10-24-bupyeong-cavity-gi-insurance']},
  {test:/^health\/(?:gum-|periodontal-|curette-|root-planing|scaling-vs-|insurance-periodontal|insurance-scaling)/,slugs:[
   '02','2026-10-25-incheon-periodontal-maintenance-after-treatment']},
  {test:/^health\/(?:root-canal-|insurance-root-canal)/,slugs:[
   '03','naver-224421350291-retreatment-after-root-canal-pain']},
  {test:/^health\/insurance-/,slugs:[
   'naver-224430998602-treatment-priority',
   '2026-10-24-bupyeong-cavity-gi-insurance']}
 ];
 const fallbackCareStories=['naver-224425324653-root-canal-or-extraction',
  '2026-10-25-incheon-periodontal-maintenance-after-treatment'];
 function patientStoryNavigation(relative){
  const choice=storyCareRules.find(rule=>rule.test.test(relative));
  const slugs=choice?choice.slugs:fallbackCareStories;
  if(slugs.length!==2||new Set(slugs).size!==2)throw new Error('Bad clinical story suggestions: '+relative);
  const suggestions=slugs.map(slug=>{
   const title=publishedClinicStories.get(slug);
   if(!title)throw new Error('Patient education links to unpublished story '+slug+' in '+relative);
   return '<li><a href="/stories/'+encodeURIComponent(slug)+'/">'+escapeSharingValue(title)+'</a></li>';
  });
  return '<nav class="patient-story-links" aria-label="이조은치과 치과 이야기 더 읽기">'+
   '<strong>이 증상과 관련된 원장의 치과 이야기</strong>'+
   '<ul class="patient-story-links-topical">'+suggestions.join('')+'</ul>'+
   '<div class="patient-story-links-row">'+
   '<a href="/stories.html">📖 홈페이지 치과 이야기 전체 보기</a>'+
   '<a href="/clinical-archive.html#archive-blog-posts">네이버 블로그 원문 333편 보기 →</a>'+
   '</div></nav>';
 }
 let linked=0;
 for(const relative of clinicalSharingFiles){
  const target=path.join(out,relative);
  let html=fs.readFileSync(target,'utf8');
  if(!html.includes('</main>'))throw new Error('Cannot add story discovery before main closes: '+relative);
  if(html.includes('class="patient-story-links"'))throw new Error('Duplicate clinic story discovery links: '+relative);
  if(!html.includes('</head>'))throw new Error('Clinical page is missing head: '+relative);
  html=html.replace('</head>',cssRef+'</head>');
  html=html.replace('</main>',patientStoryNavigation(relative)+'</main>');
  fs.writeFileSync(target,html);
  linked++;
 }
 if(linked!==54)throw new Error('Incomplete public clinical story cross-links: '+linked);
 console.log('Patient care guides linked to complete dental story archive:',linked,'pages');
}


// The primary SVG is paired with a real 32px ICO fallback at /favicon.ico.
// Naver specifically requests the default favicon URL; an HTML fallback at
// that address is a soft 404, not an icon. Keep the existing branded SVG intact.
const faviconRef='<link rel="icon" type="image/svg+xml" href="/favicon.svg">';
const faviconIcoRef='<link rel="shortcut icon" type="image/x-icon" href="'+
 selectedPublicOrigin+'/favicon.ico">';
let brandedDocumentCount=0;
function brandPublicPages(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const filename=path.join(dir,entry.name);
  if(entry.isDirectory()){brandPublicPages(filename);continue;}
  if(!entry.isFile()||!entry.name.endsWith('.html'))continue;
  // Search Console's exact one-line challenge is not an HTML page. Google
  // requires its bytes to remain unchanged, so don't inject favicons or tags.
  if(entry.name==='google4b5b71e2b560cac2.html'){
   const expected='google-site-verification: google4b5b71e2b560cac2.html\n';
   if(fs.readFileSync(filename,'utf8')!==expected)
    throw new Error('Google verification challenge was modified during build');
   continue;
  }
  let document=fs.readFileSync(filename,'utf8');
  if(!/<head(?:\s[^>]*)?>/i.test(document)||!/<\/head>/i.test(document)){
   throw new Error('Cannot add accessible favicon to malformed HTML: '+filename);
  }
  if(!document.includes(faviconRef))document=document.replace(/<\/head>/i,faviconRef+'</head>');
  if(!document.includes(faviconIcoRef))document=document.replace(/<\/head>/i,faviconIcoRef+'</head>');
  fs.writeFileSync(filename,document);
  brandedDocumentCount++;
 }
}
// Build server-rendered mobile, desktop and visit-guide booking links from the
// same owner-confirmed URL, with a labeled search fallback only when unset.
{
 const homepageFile=path.join(out,'index.html');
 const page=fs.readFileSync(homepageFile,'utf8');
 const marker='<!-- BUILD_NAVER_BOOKING_MOBILE -->';
 if(page.split(marker).length!==2)throw new Error('Expected one homepage booking action marker');
 const bookingData=JSON.parse(fs.readFileSync(path.join(root,'content/site.json'),'utf8'));
 const action=bookingAction(bookingData.naver_booking_url);
 const safe=val=>String(val).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const buttons='<nav class="mobile-booking-actions" aria-label="휴대폰 진료 문의와 네이버 예약 안내">'+
  '<a class="mobile-booking-call" href="tel:0325132875" aria-label="이조은치과 032-513-2875로 전화">☎ 전화 문의</a>'+
  '<a class="mobile-booking-naver" href="'+safe(action.url)+'" target="_blank" rel="noopener noreferrer"'+
  ' aria-label="'+safe(action.aria)+'">'+safe(action.label)+'</a>'+
  '</nav>';
 const heroMarker='<!-- BUILD_NAVER_BOOKING_HERO -->';
 if(page.split(heroMarker).length!==2)throw new Error('Expected exactly one desktop hero booking placeholder');
 const visitMarker='<!-- BUILD_NAVER_BOOKING_VISIT -->';
 const safeUrl=safe(action.url);
 const heroButton='<a class="btn hero-booking" href="'+safeUrl+'" target="_blank" rel="noopener noreferrer" aria-label="'+safe(action.aria)+'">'+safe(action.label)+'</a>';
 const homepage=page.replace(marker,buttons).replace(heroMarker,heroButton);
 fs.writeFileSync(homepageFile,homepage);
 const visitFile=path.join(out,'visit-guide.html');
 const visitHtml=fs.readFileSync(visitFile,'utf8');
 if(visitHtml.split(visitMarker).length!==2)throw new Error('Expected exactly one visit-guide booking placeholder');
 const visitButton='<a class="quick-route visit-booking" href="'+safeUrl+'" target="_blank" rel="noopener noreferrer" aria-label="'+safe(action.aria)+'">'+safe(action.label)+'</a>';
 fs.writeFileSync(visitFile,visitHtml.replace(visitMarker,visitButton));
 console.log('Naver booking actions:',action.direct?'owner-confirmed direct booking URL':'honest Naver search fallback',
  '(mobile, desktop hero and visit guide)');
}
brandPublicPages(out);
const icoBytes=fs.readFileSync(path.join(out,'favicon.ico'));
if(!fs.existsSync(path.join(out,'favicon.svg')) || brandedDocumentCount < 70 ||
   icoBytes.length<256 || icoBytes.readUInt16LE(0)!==0 ||
   icoBytes.readUInt16LE(2)!==1 || icoBytes.readUInt16LE(4)!==1 ||
   icoBytes[6]!==32 || icoBytes[7]!==32){
 throw new Error('The clinic must publish a genuine 32px image/x-icon, not a soft 404 HTML page');
}
console.log('Real 32px brand ICO and SVG shared across',brandedDocumentCount,'HTML documents.');

// Keep the checked-in _headers rules unchanged in dist.
// In particular do not overwrite security headers or pages.dev noindex rules.
// All HTML cache rules live in the same source _headers document.
