import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../assets/story-directory.js',import.meta.url),'utf8');

test('published story directory offers accessible instant filtering with non-JS fallback',()=>{
  const html=readFileSync('dist/stories.html','utf8');
  assert.match(html,/<form class="directory-search" action="\/search\.html" method="get"/);
  assert.match(html,/<script src="\/assets\/story-directory\.js\?v=[^"]+" defer><\/script>/);
  const stories=(html.match(/<a class="story-card" href="\/stories\//g)||[]).length;
  assert.ok(stories>6, 'the full story directory must contain more than featured cards');
});


test('headline intent keeps endodontic gum-pus stories with root canal topics',()=>{
 const html=readFileSync('dist/stories.html','utf8');
 const samples=[
  ['2026-10-24-incheon-root-canal-tooth-gum-swelling-retreatment','root'],
  ['2026-10-25-bupyeong-scaling-after-gum-swelling','gum'],
  ['2026-10-25-sangok-denture-partial-vs-complete-denture','prosthetic'],
  ['2026-10-25-bupyeong-cavity-treatment-overtreatment-checklist','cavity']
 ];
 for(const [slug,topic] of samples){
  const section=html.match(new RegExp('<section class="story-topic" id="topic-'+topic+'"[^>]*>[\\s\\S]*?<\\/section>'))?.[0]||'';
  assert.ok(section.includes('href="/stories/'+slug+'/"'),
   slug+' must appear under '+topic+' rather than its secondary symptom');
  const article=readFileSync('dist/stories/'+slug+'/index.html','utf8');
  assert.ok(article.includes('class="story-category"><a href="/stories.html#topic-'+topic+'"'),
   slug+' must link back to its actual topical archive');
 }
});

test('natural tooth preservation stories have their own navigable topic and article breadcrumbs',()=>{
 const directory=readFileSync('dist/stories.html','utf8');
 const archive=directory.split('<section class="story-topic" id="topic-preserve"')[1]?.split('</section>')[0]||'';
 assert.ok(archive.includes('자연치아 보존·발치 전 확인'),
  'natural tooth care needs a clear patient-friendly archive');
 const slug='2026-10-25-bupyeong-natural-tooth-versus-implant-maintenance';
 assert.ok(archive.includes('href="/stories/'+slug+'/"'),
  'the natural tooth vs implant article must not be buried in an unrelated group');
 const detail=readFileSync('dist/stories/'+slug+'/index.html','utf8');
 assert.ok(detail.includes('class="story-category"><a href="/stories.html#topic-preserve"'),
  'article breadcrumbs must navigate back to its topic');
 const groups=[...directory.matchAll(/<section class="story-topic" id="topic-[^"]+"/g)];
 assert.ok(groups.length>=7,'the archive must keep all major care topics');
});

function setup(fetchStub) {
  const element=(textContent='')=>({
    textContent,hidden:false,handlers:{},attrs:{},
    addEventListener(event,listener){this.handlers[event]=listener;},
    insertAdjacentElement(_position,what){this.inserted=what;},
    getAttribute(key){return this.attrs[key];},
    focus(){this.focused=true;},
    blur(){this.blurred=true;},
    scrollIntoView(options){this.scrolled=options;},
    setAttribute(key,value){this.attrs[key]=value;},
    append(...elements){this.children=(this.children||[]).concat(elements);}
  });
  const gumCard=element('잇몸에서 피가 나요 반복되는 출혈');
  gumCard.attrs.href='/stories/test-gum/';
  const rootCard=element('재신경치료 후 통증 안내');
  rootCard.attrs.href='/stories/test-root/';
  const rootCardTwo=element('인천 신경치료 원인');
  rootCardTwo.attrs.href='/stories/test-root-two/';
  const gum=element(),root=element();
  gum.querySelectorAll=()=>[gumCard];
  root.querySelectorAll=()=>[rootCard,rootCardTwo];
  const sections=[gum,root];
  const gumJump=element(),rootJump=element();
  gumJump.attrs.href='#topic-gum';
  rootJump.attrs.href='#topic-root';
  const jumps=[gumJump,rootJump];
  const directory={querySelectorAll(query){
    if(query==='.story-topic') return sections;
    if(query==='.topic-jump a[href^="#topic-"]') return jumps;
    throw Error('unexpected directory selector '+query);
  }};
  const field=element();
  field.value='';
  const label=element('특정 내용 찾기');
  const submit=element('건강정보 검색');
  const form=element();
  form.attrs['data-search-index']='/content/story-search-text.json?v=0123456789ab';
  form.querySelector=(query)=>{
    if(query==='label[for="stories-q"]')return label;
    if(query==='button[type="submit"]')return submit;
    throw Error('unexpected form selector '+query);
  };
  const document={
    getElementById(id){
      return {'story-directory':directory,'stories-q':field,
        'topic-gum':gum,'topic-root':root}[id]??null;
    },
    querySelector(selector){return selector==='form.directory-search'?form:null;},
    createElement(){return element();}
  };
  runInNewContext(script,{document,console, ...(fetchStub ? {fetch:fetchStub} : {})});
  return {gumCard,rootCard,rootCardTwo,gum,root,gumJump,rootJump,field,submit,form,status:form.inserted,reset:submit.inserted,label};
}

test('story directory finds Korean words, hides unmatched groups, and restores every article',()=>{
  const ui=setup();
  assert.equal(ui.label.textContent,'홈페이지 글 3편에서 제목·본문 찾기');
  assert.equal(ui.submit.textContent,'목록에서 찾기');
  ui.field.value='재 신경치료';
  ui.field.handlers.input();
  assert.equal(ui.gum.hidden,true);
  assert.equal(ui.root.hidden,false);
  assert.equal(ui.gumCard.hidden,true);
  assert.equal(ui.rootCard.hidden,false);
  assert.equal(ui.rootCardTwo.hidden,true);
  assert.equal(ui.gumJump.hidden,true);
  assert.equal(ui.rootJump.hidden,false);
  assert.match(ui.status.textContent,/검색 결과 1편/);
  assert.equal(ui.reset.hidden,false);
  ui.reset.handlers.click();
  assert.equal(ui.field.value,'');
  assert.equal(ui.gum.hidden,false);
  assert.equal(ui.root.hidden,false);
  assert.equal(ui.gumCard.hidden,false);
  assert.equal(ui.rootCardTwo.hidden,false);
  assert.equal(ui.gumJump.hidden,false);
  assert.equal(ui.reset.hidden,true);
  assert.equal(ui.field.focused,true);
});

test('submitting a real query jumps to results without jumping on every typed character',()=>{
 const ui=setup();
 assert.equal(ui.field.attrs['aria-controls'],'story-directory');
 assert.equal(ui.field.attrs['aria-describedby'],'story-filter-status');
 assert.equal(ui.status.id,'story-filter-status');
 ui.field.value='재신경치료';
 ui.field.handlers.input();
 assert.equal(ui.status.scrolled,undefined,'typing must not move the document');
 assert.equal(ui.field.blurred,undefined,'typing must keep the mobile keyboard available');
 let prevented=false;
 ui.form.handlers.submit({preventDefault(){prevented=true;}});
 assert.equal(prevented,true,'submitting should filter locally rather than navigate away');
 assert.equal(ui.field.blurred,true,'submitting should close the mobile keyboard');
 assert.equal(ui.status.scrolled?.block,'start','search result count should be scrolled into view');
 assert.match(ui.status.textContent,/검색 결과 1편/);
});

test('on-page story search never redirects on submit and handles empty results',()=>{
  const ui=setup();
  ui.field.value='없는 전문용어 12345';
  let prevented=false;
  ui.form.handlers.submit({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(ui.gum.hidden,true);
  assert.equal(ui.root.hidden,true);
  assert.match(ui.status.textContent,/일치하는 글이 없습니다/);
});


test('static published full-text corpus equals the real articles and excludes drafts',()=>{
 const raw=readFileSync('dist/content/story-search-text.json','utf8');
 const data=JSON.parse(raw);
 assert.equal(data.version,1);
 const originals=readdirSync('content/posts').filter(name=>name.endsWith('.json'))
  .map(name=>({slug:name.slice(0,-5),post:JSON.parse(readFileSync('content/posts/'+name,'utf8'))}))
  .filter(item=>item.post.published===true);
 assert.equal(data.entries.length,originals.length);
 assert.equal(new Set(data.entries.map(item=>item.slug)).size,originals.length);
 for(const item of originals){
  const entry=data.entries.find(row=>row.slug===item.slug);
  assert.ok(entry,'Missing body for '+item.slug);
  assert.equal(entry.body,item.post.body.trim(),'must index the real published article body');
 }
 const directory=readFileSync('dist/stories.html','utf8');
 assert.match(directory,/data-search-index="\/content\/story-search-text\.json\?v=[a-f0-9]{12}"/);
 assert.match(directory,/story-directory\.js\?v=[a-f0-9]{12}"/);
 assert.ok(Buffer.byteLength(raw,'utf8')<2*1024*1024,'keep mobile text index under 2MB');
});

test('body-only search results appear after lazy loading and terms may be separated',async()=>{
 let requests=0;
 const index={version:1,entries:[
  {slug:'test-gum',body:'치주낭이 깊으면 큐렛을 이용합니다.'},
  {slug:'test-root',body:'재신경치료 과정에는 거타퍼차 제거와 근관 확인이 필요합니다.'},
  {slug:'test-root-two',body:'염증이 있을 경우 영상으로 확인합니다.'}
 ]};
 const ui=setup(async(url,options)=>{
  requests++;
  assert.equal(url,'/content/story-search-text.json?v=0123456789ab');
  assert.equal(options.credentials,'same-origin');
  return {ok:true,json:async()=>index};
 });
 ui.field.value='거타퍼차';
 ui.field.handlers.input();
 assert.equal(ui.rootCard.hidden,true,'before full-text loaded, only title matches');
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.equal(ui.rootCard.hidden,false,'body-only word finds the article');
 const passage=ui.rootCard.children?.find(el=>el.className==='story-match-excerpt');
 assert.ok(passage,'body-only result must show a paragraph from the article');
 assert.match(passage.textContent,/본문 내용:.*거타퍼차/);
 assert.equal(passage.hidden,false);
 assert.equal(ui.gumCard.hidden,true);
 assert.match(ui.status.textContent,/검색 결과 1편/);
 ui.field.value='거타퍼차 근관';
 ui.field.handlers.input();
 assert.equal(ui.rootCard.hidden,false,'AND terms match separated sentences');
 assert.equal(requests,1,'one lazy fetch serves repeated searches');
 assert.equal(ui.rootCard.children.filter(el=>el.className==='story-match-excerpt').length,1,
  'subsequent searches do not duplicate the excerpt');
 ui.field.value='없는치료용어';
 ui.field.handlers.input();
 assert.equal(passage.hidden,true,'unmatched article snippet is hidden');
 ui.reset.handlers.click();
 assert.equal(passage.hidden,true,'reset hides search-only snippet');
});

test('failed or mismatched body download keeps instant titles searchable',async()=>{
 const ui=setup(async()=>({ok:true,json:async()=>({version:1,entries:[]})}));
 ui.field.value='재신경치료';
 ui.field.handlers.input();
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.equal(ui.rootCard.hidden,false);
 assert.equal(ui.rootCardTwo.hidden,true);
 assert.match(ui.status.textContent,/제목·요약만 검색/);
 ui.reset.handlers.click();
 assert.equal(ui.rootCardTwo.hidden,false,'reset still shows every published article');
});


test('the published directory gives a safe readable excerpt for full-text-only matches',()=>{
 const html=readFileSync('dist/stories.html','utf8');
 assert.match(html,/\.story-card \.story-match-excerpt\[hidden\]/,
  'the excerpt must be hidden when its associated full-text query clears');
 assert.ok(!/innerHTML\s*=/.test(script),'never inject the CMS article body as HTML');
});


test('full-text article lookup has a finite timeout and keeps the title-search fallback',()=>{
 assert.match(script,/setTimeout\(\(\) => controller\.abort\(\), 12000\)/,
  'patients on unreliable mobile connections should not see endless loading');
 assert.match(script,/clearTimeout\(timer\)/,
  'a completed download must clear its timer');
 assert.match(script,/corpusState = 'error';/,
  'when the request fails, the title and summary results must still work');
});
