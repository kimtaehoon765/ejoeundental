import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';

const dist=new URL('../dist/health/',import.meta.url);
const hubs=new Map([
 ['/gum-health.html','잇몸 건강정보'],
 ['/root-canal-health.html','신경치료·재신경치료 건강정보'],
 ['/insurance-health.html','건강보험 치과진료 정보'],
 ['/additional-health.html','치과 건강정보 더 보기']
]);

test('all 46 health pages have truthful, visible three-level breadcrumbs',()=>{
 assert.ok(existsSync(dist),'website must be built first');
 const pages=readdirSync(dist).filter(name=>name.endsWith('.html'));
 assert.equal(pages.length,46);
 const counts=new Map([...hubs.keys()].map(k=>[k,0]));
 for(const filename of pages){
  const html=readFileSync(new URL(filename,dist),'utf8');
  const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const expectedPath=process.env.SITE_PUBLIC_ORIGIN==='https://ejoeundental.pages.dev' ? '/health/'+filename : '/health/'+filename.slice(0,-5);
  assert.ok(canonical?.endsWith(expectedPath),filename+' canonical points through a redirect');
  const origin=new URL(canonical).origin;
  const heading=html.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g,'').trim();
  assert.ok(heading,filename+' H1 missing');
  const header=html.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0]||'';
  const hubRoutes=[...hubs.keys()].filter(url=>header.includes('href="'+url+'"'));
  assert.equal(hubRoutes.length,1,filename+' hub classification incorrect');
  const hub=hubRoutes[0],hubLabel=hubs.get(hub);
  counts.set(hub,counts.get(hub)+1);
  const crumb=html.match(/<nav class="crumb health-breadcrumb" aria-label="현재 위치">([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(crumb,filename+' breadcrumb missing from visible page');
  assert.ok(crumb.includes('<a href="/">이조은치과 홈</a>'),filename+' home link missing');
  assert.ok(crumb.includes('<a href="'+hub+'">'+hubLabel+'</a>'),filename+' article hub missing');
  assert.ok(crumb.includes('aria-current="page"'),filename+' current page not marked');
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]));
  const trail=schemas.filter(schema=>schema['@type']==='BreadcrumbList');
  assert.equal(trail.length,1,filename+' should have exactly one breadcrumb schema');
  const steps=trail[0].itemListElement;
  assert.deepEqual(steps.map(x=>x.position),[1,2,3],filename+' positions wrong');
  assert.deepEqual(steps.map(x=>x.name),['이조은치과 홈',hubLabel,heading],filename+' labels differ from visible page');
  assert.deepEqual(steps.map(x=>x.item),[origin+'/',origin+hub,canonical],filename+' URL or canonical mismatch');
  const clinical=schemas.filter(s=>['WebPage','MedicalWebPage'].includes(s['@type']));
  assert.equal(clinical.length,1,filename+' lost clinical page structured data');
 }
 assert.deepEqual([...counts.values()],[10,10,10,16],'article categories should remain consistent');
});
