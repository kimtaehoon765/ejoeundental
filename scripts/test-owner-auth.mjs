import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './owner-library-worker.js';
const base='https://owner.example.test';
const password='a-very-long-unique-password';
let calls=0;
const assets={fetch:async()=>{calls++;return new Response('PRIVATE CONTENT',{status:200,headers:{'Content-Type':'text/plain'}})}};
const env={OWNER_PASSWORD:password,OWNER_USERNAME:'owner',ASSETS:assets};
const request=(path='/',credentials)=>new Request(base+path,{headers:credentials?{Authorization:'Basic '+btoa(credentials)}:{}});
const paths=['/','/search-index.json','/equipment-log.html','/dental-equipment.html','/missing.html'];
test('missing or weak secret fails closed for all paths',async()=>{
 for(const path of paths){for(const secret of [undefined,'short']){
  const res=await worker.fetch(request(path),{...env,OWNER_PASSWORD:secret});
  assert.equal(res.status,503);
 }}
 assert.equal(calls,0);
});
test('missing asset binding and HTTP transport fail closed',async()=>{
 assert.equal((await worker.fetch(request('/'),{OWNER_PASSWORD:password})).status,503);
 const httpRequest=new Request('http://owner.example.test/',{headers:{Authorization:'Basic '+btoa('owner:'+password)}});
 assert.equal((await worker.fetch(httpRequest,env)).status,403);
 assert.equal(calls,0);
});
test('no credentials cannot reach any asset',async()=>{
 for(const path of paths){const res=await worker.fetch(request(path),env);assert.equal(res.status,401);assert.match(res.headers.get('WWW-Authenticate'),/^Basic /)}
 assert.equal(calls,0);
});
test('bad credentials, invalid base64, and missing colon are denied',async()=>{
 for(const header of ['Basic !!!','Basic '+btoa('owner:wrong'),'Basic '+btoa('other:'+password),'Basic '+btoa('owner')]){
  const res=await worker.fetch(new Request(base+'/',{headers:{Authorization:header}}),env);
  assert.equal(res.status,401);
 }
 assert.equal(calls,0);
});
test('valid credentials allow asset requests with no-store headers',async()=>{
 for(const path of paths){const res=await worker.fetch(request(path,'owner:'+password),env);assert.equal(res.status,200);assert.equal(await res.text(),'PRIVATE CONTENT');assert.equal(res.headers.get('Cache-Control'),'private, no-store');assert.match(res.headers.get('X-Robots-Tag'),/noindex/)}
 assert.equal(calls,paths.length);
});
