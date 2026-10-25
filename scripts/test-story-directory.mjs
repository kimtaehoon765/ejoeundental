import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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

function setup() {
  const element=(textContent='')=>({
    textContent,hidden:false,handlers:{},attrs:{},
    addEventListener(event,listener){this.handlers[event]=listener;},
    insertAdjacentElement(_position,what){this.inserted=what;},
    getAttribute(key){return this.attrs[key];},
    focus(){this.focused=true;},
    setAttribute(key,value){this.attrs[key]=value;}
  });
  const gumCard=element('잇몸에서 피가 나요 반복되는 출혈');
  const rootCard=element('재신경치료 후 통증 안내');
  const rootCardTwo=element('인천 신경치료 원인');
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
  runInNewContext(script,{document,console});
  return {gumCard,rootCard,rootCardTwo,gum,root,gumJump,rootJump,field,submit,form,status:form.inserted,reset:submit.inserted,label};
}

test('story directory finds Korean words, hides unmatched groups, and restores every article',()=>{
  const ui=setup();
  assert.equal(ui.label.textContent,'홈페이지 글 3편에서 제목·내용 찾기');
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
