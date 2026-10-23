import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../assets/archive-topics.js',import.meta.url),'utf8');

function setup({perGroup=15,hash=''}={}){
 const groupDefs=[
  ['gum','잇몸치료·스케일링','잇몸 출혈'],
  ['root','신경치료·재신경치료','신경치료 경과'],
  ['ethics','치과 선택과 진료 원칙','양심 진료'],
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
 assert.match(site.label.textContent,/60편/);
 assert.match(site.status.textContent,/전체 60편/);
 assert.match(site.section.search.attributes['aria-label'],/60편/);
 assert.equal(site.button.hidden,true);
 const grown=setup({perGroup:18});
 assert.match(grown.label.textContent,/72편/);
 assert.match(grown.status.textContent,/전체 72편/);
 assert.doesNotMatch(script,/30편/);
});

test('search reveals only matching entries and one-tap reset restores original open states',()=>{
 const site=setup();
 site.input.value='재신경치료';
 site.input.handlers.input();
 assert.equal(site.button.hidden,false);
 assert.match(site.status.textContent,/15편을 찾았습니다/);
 assert.equal(site.groups.filter(x=>x.hidden).length,3);
 assert.equal(site.groups.find(x=>x.id==='archive-group-root').open,true);
 site.button.handlers.click();
 assert.equal(site.input.value,'');
 assert.equal(site.button.hidden,true);
 assert.equal(site.input.focused,true);
 assert.match(site.status.textContent,/전체 60편/);
 assert.equal(site.groups.filter(x=>x.hidden).length,0);
 assert.equal(site.groups.find(x=>x.id==='archive-group-gum').open,true);
 assert.equal(site.groups.find(x=>x.id==='archive-group-root').open,false);
 assert.ok(site.groups.every(g=>g.items.every(li=>!li.hidden)));
});

test('nonmatching query is clearly announced and can be cleared',()=>{
 const site=setup();
 site.input.value='없는검색어';
 site.input.handlers.input();
 assert.match(site.status.textContent,/일치하는 원장 글이 없습니다/);
 assert.equal(site.groups.filter(x=>x.hidden).length,4);
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

test('production build keeps all 65 links, fresh script and mobile-friendly reset control',()=>{
 const html=readFileSync('dist/clinical-archive.html','utf8');
 const css=html;
 const matches=[...html.matchAll(/<li><a href="https:\/\/blog\.naver\.com\/kook765\/[0-9]+" target="_blank" rel="noopener noreferrer">/g)];
 assert.equal(matches.length,65);
 for(const id of ['224351181693','224350565399','224349488410','224348923668','224347627046']){
  assert.ok(html.includes('https://blog.naver.com/kook765/'+id), 'New owner Naver article not found: '+id);
 }
 assert.ok(html.includes('/assets/archive-topics.js?v=20261024-smartfind2'));
 assert.match(css,/\.archive-search \.archive-search-clear\[hidden\]\{display:none!important\}/);
 assert.match(css,/\.archive-search \.archive-search-clear\{[^}]*min-height:44px/);
});
