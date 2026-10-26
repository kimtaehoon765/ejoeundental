import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../assets/archive-topics.js',import.meta.url),'utf8');

function setup({perGroup=15,hash=''}={}){
 const groupDefs=[
  ['gum','잇몸치료·스케일링','잇몸 출혈'],
  ['root','신경치료·재신경치료','신경치료 경과'],
  ['ethics','치과 선택과 진료 원칙','양심 진료'],
  ['med','치과 약물·전신질환','항응고제 관리'],
  ['other','충치·시린 이·기타','충치 치료']
 ];
 const groups=groupDefs.map(([id,topic,base],i)=>{
  const summary={focused:false,focus(){this.focused=true;}};
  const items=Array.from({length:perGroup},(_,index)=>({
   hidden:false,querySelector:selector=>selector==='a'?{textContent:base+' '+(index+1)}:null
  }));
  return {
   id:'archive-group-'+id,hidden:false,open:i===0,items,summary,scrolled:false,
   querySelector:selector=>selector==='summary strong'?{textContent:topic}:selector==='summary'?summary:null,
   querySelectorAll:selector=>selector==='li'?items:[],
   scrollIntoView(){this.scrolled=true;}
  };
 });
 const handlers={};
 const elements=[];
 const section={search:null,insertBefore(element){this.search=element;}};
 const collection={querySelectorAll:selector=>selector==='details.archive-blog-group'?groups:[]};
 const document={
  getElementById:id=>id==='archive-blog-posts'?section:
   id==='archive-blog-collections'?collection:groups.find(g=>g.id===id)||null,
  createElement:tag=>{
   const element={
    tag,hidden:false,textContent:'',value:'',attributes:{},children:[],handlers:{},focused:false,
    setAttribute(name,value){this.attributes[name]=value;},
    append(...children){this.children.push(...children);},
    addEventListener(name,fn){this.handlers[name]=fn;},
    focus(){this.focused=true;}
   };
   elements.push(element);
   return element;
  }
 };
 const window={location:{hash},addEventListener(name,fn){handlers[name]=fn;}};
 runInNewContext(script,{document,window});
 const get=tag=>elements.find(x=>x.tag===tag);
 return {section,groups,handlers,label:get('label'),input:get('input'),button:get('button'),status:get('p')};
}

test('archive search shows the actual number of links, never an outdated 30-post total',()=>{
 const site=setup();
 assert.equal(site.section.search.className,'archive-search');
 assert.match(site.label.textContent,/75편/);
 assert.match(site.status.textContent,/전체 75편/);
 assert.match(site.section.search.attributes['aria-label'],/75편/);
 assert.equal(site.button.hidden,true);
 const grown=setup({perGroup:18});
 assert.match(grown.label.textContent,/90편/);
 assert.match(grown.status.textContent,/전체 90편/);
 assert.doesNotMatch(script,/30편/);
});

test('search reveals only matching entries and one-tap reset restores original open states',()=>{
 const site=setup();
 site.input.value='재신경치료';
 site.input.handlers.input();
 assert.equal(site.button.hidden,false);
 assert.match(site.status.textContent,/15편을 찾았습니다/);
 assert.equal(site.groups.filter(x=>x.hidden).length,4);
 assert.equal(site.groups.find(x=>x.id==='archive-group-root').open,true);
 site.button.handlers.click();
 assert.equal(site.input.value,'');
 assert.equal(site.button.hidden,true);
 assert.equal(site.input.focused,true);
 assert.match(site.status.textContent,/전체 75편/);
 assert.equal(site.groups.filter(x=>x.hidden).length,0);
 assert.equal(site.groups.find(x=>x.id==='archive-group-gum').open,true);
 assert.equal(site.groups.find(x=>x.id==='archive-group-root').open,false);
 assert.ok(site.groups.every(g=>g.items.every(li=>!li.hidden)));
});

test('multiword and reversed-order Korean queries find originals across the title and topic',()=>{
 const site=setup();
 site.input.value='출혈 잇몸';
 site.input.handlers.input();
 assert.match(site.status.textContent,/15편을 찾았습니다/);
 assert.equal(site.groups.filter(x=>!x.hidden).length,1);
 assert.equal(site.groups[0].items.filter(x=>!x.hidden).length,15);

 // A clinical topic can supply one word and an original post title the
 // other; unrelated terms must never cause arbitrary suggestions.
 site.input.value='출혈 신경치료';
 site.input.handlers.input();
 assert.match(site.status.textContent,/일치하는 원장 글이 없습니다/);
 assert.ok(site.groups.every(group=>group.hidden));

 site.input.value='치과 항응고제';
 site.input.handlers.input();
 assert.match(site.status.textContent,/15편을 찾았습니다/);
 assert.equal(site.groups.find(x=>x.id==='archive-group-med').hidden,false);
});

test('nonmatching query is clearly announced and can be cleared',()=>{
 const site=setup();
 site.input.value='없는검색어';
 site.input.handlers.input();
 assert.match(site.status.textContent,/일치하는 원장 글이 없습니다/);
 assert.equal(site.groups.filter(x=>x.hidden).length,5);
 site.button.handlers.click();
 assert.equal(site.groups.filter(x=>x.hidden).length,0);
});

test('deep linked category stays accessible, including after a search',()=>{
 const site=setup({hash:'#archive-group-root'});
 assert.equal(site.groups[1].open,true);
 site.input.value='잇몸';
 site.input.handlers.input();
 site.handlers.hashchange();
 assert.equal(site.input.value,'');
 assert.equal(site.groups[1].open,true);
 assert.equal(site.groups[1].hidden,false);
 assert.equal(site.groups[1].scrolled,true);
 assert.equal(site.groups[1].summary.focused,true);
});

test('production build keeps all 363 links, fresh script and mobile-friendly reset control',()=>{
 const html=readFileSync('dist/clinical-archive.html','utf8');
 const css=html;
 const matches=[...html.matchAll(/<li><a href="https:\/\/blog\.naver\.com\/[a-zA-Z0-9_-]+\/[0-9]+" target="_blank" rel="noopener noreferrer">/g)];
 assert.equal(matches.length,363);
 for(const id of ["224351181693","224350565399","224349488410","224348923668","224347627046","224346767351","224345605594","224344449540","224343576204","224342362813","224340539370","224339649746","224338216768","224336919095","224336313791","224335801481","224334694345","224333455599","224332017324","224331110284","224329576885","224329145895","224328506244","224327443401","224326276050","224325023545","224323897424","224322516968","224322081993","224320994972","224320266015","224317876370","224316966811","224315798257","224315011800","224314366210","224313019345","224311977947","224311067641","224309977228","224308488636","224307323645","224306244253","224305030119","224304247968","224303231242","224298846717","224297070925","224292617811","224291112270","224288489890","224287365726","224286252895","224284648154","224284054623","223517564607","223516136069","223515214832","223514920490","223514001922","223513923975","223511239719","223510937991","223510841022","223510589800","223509416446","223508191462","223507562346"]){
  assert.ok(html.includes('https://blog.naver.com/kook765/'+id), 'New owner Naver article not found: '+id);
 }
 for(const id of ["224438191053","224436292094","224431840628","224430228521","224426480752","224424538062","224423620402","224422902363","224422523730","224421662520","224420353241","224419245215","224416545698","224414213220","224411815020","224404164408","224399572736","224397177982","224395956942","224394811166","224394554711","224393446717","224392239926","224391063198","224389682507","224388398481","224387305172","224386992149","224385719265","224384443629","224383186706","224382302197","224380860291","224380098099","224379395734","224378925978","224377846965","224376196642","224375020122","224373987741","224372754775","224371990287","224371324262","224370117406","224368798227","224367681234","224366833419","224365506543","224364598669","224363741318"]){
  assert.ok(html.includes('https://blog.naver.com/radio654/'+id), 'New radio654 owner Naver article not found: '+id);
 }
 assert.ok(script.includes('if (groups.length === 0) return;'));
 assert.ok(html.includes('id="archive-group-med"'));
 assert.ok(html.includes('치과 약물·전신질환'));
 assert.ok(html.includes('인천잇몸치료 양치할 때 피가 나요'));
 const version=html.match(/<script defer src="\/assets\/archive-topics\.js\?v=([a-f0-9]{12})"><\/script>/)?.[1];
 assert.ok(version,'actual archive search script must have a 12-digit content hash');
 const builtJs=readFileSync('dist/assets/archive-topics.js');
 const expected=createHash('sha256').update(builtJs).digest('hex').slice(0,12);
 assert.equal(version,expected,'archive script version must change exactly when its content does');
 assert.match(css,/\.archive-search \.archive-search-clear\[hidden\]\{display:none!important\}/);
 assert.match(css,/\.archive-search \.archive-search-clear\{[^}]*min-height:44px/);
});

test('published review education post uses the owner screenshot summary with verified original blog credit',()=>{
 const slug='2026-10-24-dental-review-guide';
 const article=readFileSync('dist/stories/'+slug+'/index.html','utf8');
 const home=readFileSync('dist/index.html','utf8');
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 const entries=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 const search=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 const canonical='https://ejoeundental.com/stories/'+slug+'/';
 const source='https://blog.naver.com/kook765/224441916775';
 assert.ok(home.includes('href="/stories/'+slug+'/">'),'homepage must link to this native article');
 assert.match(article,/네이버 영수증 리뷰/);
 assert.match(article,/진단의 정확성/);
 assert.ok(article.includes('href="'+source+'" target="_blank" rel="noopener noreferrer"'),'link to genuine photographed source');
 assert.ok(article.includes('rel="canonical" href="'+canonical+'"'),'use public live-domain canonical');
 assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'),'publish to sitemap for indexing');
 assert.ok(entries.some(post=>post.slug===slug));
 assert.ok(search.some(post=>post.url==='/stories/'+slug+'/'));
 assert.equal([...home.matchAll(/<div class="card owner-story-card"><h3><a href="https:\/\/blog\.naver\.com\//g)].length,363,'all 363 blog posts must remain intact');
});

test('second owner-supplied review article covers clinical decision criteria without duplicating the prior post',()=>{
 const slug='2026-10-24-ethical-dental-choice';
 const article=readFileSync('dist/stories/'+slug+'/index.html','utf8');
 const homepage=readFileSync('dist/index.html','utf8');
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 const posts=JSON.parse(readFileSync('dist/content/posts-index.json','utf8'));
 const search=JSON.parse(readFileSync('dist/content/search-index.json','utf8'));
 const canonical='https://ejoeundental.com/stories/'+slug+'/';
 const source='https://blog.naver.com/kook765/224437413951';
 assert.ok(homepage.includes('href="/stories/'+slug+'/">'));
 assert.ok(homepage.includes('href="/stories/2026-10-24-dental-review-guide/">'));
 assert.ok(article.includes('rel="canonical" href="'+canonical+'"'));
 assert.ok(article.includes('href="'+source+'" target="_blank" rel="noopener noreferrer"'));
 assert.ok(article.includes('자연치아를 보존'));
 assert.ok(article.includes('건강보험'));
 assert.ok(article.includes('신경치료'));
 assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'));
 assert.ok(posts.some(p=>p.slug===slug));
 assert.ok(search.some(p=>p.url==='/stories/'+slug+'/'));
 assert.equal([...homepage.matchAll(/<div class="card owner-story-card"><h3><a href="https:\/\/blog\.naver\.com\//g)].length,363);
});


test('homepage topic shortcuts open real original-blog archive categories in one tap',()=>{
 const home=readFileSync('dist/index.html','utf8');
 const archive=readFileSync('dist/clinical-archive.html','utf8');
 const css=readFileSync('dist/assets/home-enhancements.css','utf8');
 const nav=home.match(/<nav class="owner-blog-topic-jumps" aria-label="[^"]+">([\s\S]*?)<\/nav>/)?.[1]||'';
 const matches=[...nav.matchAll(/<a href="\/clinical-archive\.html#(archive-group-[a-z]+)">([^<]+)<\/a>/g)];
 assert.deepEqual(matches.map(m=>m[1]),[
  'archive-group-gum','archive-group-root','archive-group-ethics','archive-group-other'
 ]);
 for(const [,id,label] of matches){
  assert.match(archive,new RegExp('<details[^>]*id="'+id+'"'),
   label+' must land on a real original-blog topic');
 }
 assert.match(css,/#stories \.owner-blog-topic-jumps a\{[^}]*min-height:44px/,
  'desktop links remain keyboard and touch accessible');
 assert.match(css,/@media\(max-width:600px\)\{#stories \.owner-blog-topic-jumps/,
  'mobile shortcuts have a compact two-column layout');
 assert.equal([...home.matchAll(/<div class="card owner-story-card"><h3><a href="https:\/\/blog\.naver\.com\//g)].length,363,
  'navigation improvement must not drop any of the original 363 Naver blog links');
});
