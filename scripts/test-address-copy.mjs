import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../assets/address-copy.js',import.meta.url),'utf8');

function fixture({supported=true,writer=async()=>{}}={}){
 const source={textContent:'인천광역시 부평구 세월천로 34, 대우프라자 305호'};
 const notice={textContent:''};
 const row={hidden:true};
 const handlers={};
 const button={
  disabled:false,
  getAttribute:key=>({ 'data-copy-source':'address','aria-describedby':'copy-status' })[key]||null,
  closest:selector=>selector==='.clinic-copy-row'?row:null,
  addEventListener:(type,callback)=>{handlers[type]=callback;}
 };
 const document={
  querySelectorAll:selector=>selector==='button[data-copy-source]'?[button]:[],
  getElementById:id=>({address:source,'copy-status':notice})[id]||null
 };
 const clipboard=supported?{writeText:writer}:undefined;
 runInNewContext(script,{document,navigator:{clipboard}});
 return {source,notice,row,button,handlers};
}

test('address copy uses live visible page text and announces completion',async()=>{
 const writes=[];
 const view=fixture({writer:async value=>writes.push(value)});
 assert.equal(view.row.hidden,false);
 view.source.textContent='인천광역시 부평구  세월천로 34, 대우프라자 305호';
 await view.handlers.click();
 assert.deepEqual(writes,['인천광역시 부평구 세월천로 34, 대우프라자 305호']);
 assert.equal(view.notice.textContent,'치과 주소를 복사했습니다.');
 assert.equal(view.button.disabled,false);
});

test('clipboard denial keeps original address accessible and explains manual copy',async()=>{
 const view=fixture({writer:async()=>{throw Error('Permission denied')}});
 await view.handlers.click();
 assert.match(view.notice.textContent,/자동 복사가 차단되었습니다/);
 assert.equal(view.button.disabled,false);
 assert.match(view.source.textContent,/세월천로 34/);
});

test('when Clipboard API is unavailable the optional button remains hidden',()=>{
 const view=fixture({supported:false});
 assert.equal(view.row.hidden,true);
 assert.equal(view.handlers.click,undefined);
});

test('empty visible address never copies stale data',async()=>{
 let count=0;
 const view=fixture({writer:async()=>{count++;}});
 view.source.textContent='   ';
 await view.handlers.click();
 assert.equal(count,0);
 assert.match(view.notice.textContent,/주소를 불러오지 못했습니다/);
});
