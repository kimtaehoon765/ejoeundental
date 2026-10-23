import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../assets/article-sharing.js',import.meta.url),'utf8');

function setup({share,writeText,print,href='https://ejoeundental.com/health/gum-bleeding'}={}){
 const notice={textContent:''};
 const buttons=new Map();
 for(const type of ['share','copy','print']){
  const handlers={};
  buttons.set(type,{hidden:true,disabled:false,handlers,
   addEventListener:(event,callback)=>{handlers[event]=callback;}});
 }
 const panel={hidden:true,querySelector:selector=>
  selector==='.article-share-status'?notice:
  selector==='[data-article-action="share"]'?buttons.get('share'):
  selector==='[data-article-action="copy"]'?buttons.get('copy'):
  selector==='[data-article-action="print"]'?buttons.get('print'):null};
 const document={title:'양치할 때 잇몸에서 피가 나요 | 이조은치과',
  baseURI:'https://ejoeundental.com/',
  querySelector:selector=>selector==='link[rel="canonical"]'?{href}:null,
  querySelectorAll:selector=>selector==='.article-share-actions'?[panel]:[]};
 const navigator={};
 if(share)navigator.share=share;
 if(writeText)navigator.clipboard={writeText};
 const window={};
 if(print)window.print=print;
 runInNewContext(script,{document,navigator,window,URL});
 return {panel,notice,buttons};
}

test('native share uses the canonical article, and copy reuses the same URL',async()=>{
 const calls=[],copies=[];
 const widget=setup({share:async data=>calls.push(data),
  writeText:async url=>copies.push(url)});
 assert.equal(widget.panel.hidden,false);
 assert.equal(widget.buttons.get('share').hidden,false);
 assert.equal(widget.buttons.get('copy').hidden,false);
 await widget.buttons.get('share').handlers.click();
 assert.equal(calls[0].url,'https://ejoeundental.com/health/gum-bleeding');
 assert.match(calls[0].title,/이조은치과/);
 await widget.buttons.get('copy').handlers.click();
 assert.deepEqual(copies,['https://ejoeundental.com/health/gum-bleeding']);
 assert.match(widget.notice.textContent,/복사했습니다/);
 assert.equal(widget.buttons.get('copy').disabled,false);
});

test('printing is opt-in, requires no clipboard or share API and never sends patient data',()=>{
 let printed=0;
 const widget=setup({print:()=>{printed++;}});
 assert.equal(widget.panel.hidden,false);
 assert.equal(widget.buttons.get('share').hidden,true);
 assert.equal(widget.buttons.get('copy').hidden,true);
 assert.equal(widget.buttons.get('print').hidden,false);
 widget.notice.textContent='과거 공유 결과';
 widget.buttons.get('print').handlers.click();
 assert.equal(printed,1);
 assert.equal(widget.notice.textContent,'');
 const unsupported=setup();
 assert.equal(unsupported.panel.hidden,true);
 assert.equal(unsupported.buttons.get('print').hidden,true);
});

test('copy-only browsers still show useful action and recover from permission errors',async()=>{
 const widget=setup({writeText:async()=>{throw Error('Permission denied');}});
 assert.equal(widget.buttons.get('share').hidden,true);
 assert.equal(widget.buttons.get('copy').hidden,false);
 await widget.buttons.get('copy').handlers.click();
 assert.match(widget.notice.textContent,/주소창의 링크/);
 assert.equal(widget.buttons.get('copy').disabled,false);
});

test('unsupported browsers, unverified sites and unsafe URLs never show share actions',()=>{
 for(const params of [{},{share:async()=>{},href:'http://example.com/bad'},
  {writeText:async()=>{},href:'https://evil.example.org/health/foo'}]){
  const widget=setup(params);
  assert.equal(widget.panel.hidden,true);
 }
});

test('user-cancelled system share is not reported as a clinical or site error',async()=>{
 const widget=setup({share:async()=>{throw {name:'AbortError'};}});
 await widget.buttons.get('share').handlers.click();
 assert.match(widget.notice.textContent,/공유를 취소했습니다/);
 assert.equal(widget.buttons.get('share').disabled,false);
});

test('all 50 published patient pages receive share controls and fresh hashed assets',()=>{
 const hubs=['gum-health.html','root-canal-health.html','insurance-health.html','additional-health.html'];
 const files=readdirSync('dist/health').filter(x=>x.endsWith('.html'));
 assert.equal(files.length,46);
 const jsHash=createHash('sha256').update(readFileSync('dist/assets/article-sharing.js')).digest('hex').slice(0,12);
 const cssHash=createHash('sha256').update(readFileSync('dist/assets/article-sharing.css')).digest('hex').slice(0,12);
 for(const file of [...hubs,...files.map(x=>'health/'+x)]){
  const markup=readFileSync('dist/'+file,'utf8');
  assert.equal((markup.match(/class="article-share-actions"/g)||[]).length,1,file);
  assert.match(markup,/class="article-share-actions"[^>]* hidden>/,file);
  assert.match(markup,/data-article-action="share" hidden>/,file);
  assert.match(markup,/data-article-action="copy" hidden>/,file);
  assert.match(markup,/data-article-action="print" hidden>/,file);
  const expectedReturn=file.startsWith('health/')?'#article-main':'#health-hub-main';
  assert.ok(markup.includes('class="article-return-nav"'),file+' return link missing');
  assert.ok(markup.includes('href="'+expectedReturn+'"'),file+' return target missing');
  assert.equal((markup.match(/class="article-return-nav"/g)||[]).length,1,file+' repeated return controls');
  assert.ok(markup.includes('id="'+expectedReturn.slice(1)+'"'),file+' return target does not exist');
  assert.match(markup,/class="article-share-status" role="status" aria-live="polite"/,file);
  assert.ok(markup.includes('/assets/article-sharing.js?v='+jsHash+'"'),file+' JS cache');
  assert.ok(markup.includes('/assets/article-sharing.css?v='+cssHash+'"'),file+' CSS cache');
  assert.match(markup,/<link rel="canonical" href="https:\/\/ejoeundental\.com\//,file);
 }
});

test('patient health page print layout hides utility buttons and navigation',()=>{
 const css=readFileSync('dist/assets/article-sharing.css','utf8');
 const pageCss=readFileSync('dist/assets/style.css','utf8');
 assert.match(css,/@media print\{\.article-share-actions\{display:none!important\}\}/);
 assert.match(css,/@media print\{\.article-return-nav\{display:none!important\}\}/);
 assert.match(pageCss,/@media print\{/);
});
