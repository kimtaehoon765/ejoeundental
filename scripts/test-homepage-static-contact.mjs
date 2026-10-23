import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const clinic=JSON.parse(readFileSync('content/site.json','utf8'));
const html=readFileSync('dist/index.html','utf8');

test('address and phone are correct before JavaScript loads',()=>{
 for(const id of ['address','footer_address']){
  const value=html.match(new RegExp('<p id="'+id+'">([^<]*)</p>'))?.[1];
  assert.equal(value,clinic.address,id+' should be statically correct');
 }
 const phone=html.match(/<a id="phone" href="tel:([^"]+)">([^<]+)<\/a>/);
 assert.deepEqual([phone?.[1],phone?.[2]],[clinic.phone.replace(/\D/g,''),clinic.phone]);
 assert.ok(!html.includes('src="/assets/site.js'),'homepage should not need a settings request');
});

test('three owner Naver blogs are available from HTML without network-dependent rewrites',()=>{
 for(let i=1;i<=3;i++){
  const href=html.match(new RegExp('<a id="blog'+i+'" href="([^"]+)"'))?.[1];
  assert.equal(href,clinic['blog'+i],'blog '+i+' must use verified original URL');
  const url=new URL(href);
  assert.equal(url.protocol,'https:');
  assert.ok(url.hostname==='naver.com'||url.hostname.endsWith('.naver.com'));
  assert.ok(!url.username&&!url.password);
 }
});
