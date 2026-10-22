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
  const journeyNodes=[...html.matchAll(/<nav class="patient-care-journey" data-patient-care-journey="true" aria-label="이 건강정보와 관련된 진료 및 방문 안내">([\s\S]*?)<\/nav>/g)];
  assert.equal(journeyNodes.length,1,filename+' must have exactly one next-step care navigation');
  const journey=journeyNodes[0][1];
  assert.ok(journey.includes('<h2>관련 진료와 다음 단계</h2>'),filename+' missing next-step heading');
  assert.ok(journey.includes('실제 치료 필요성은 진찰 결과에 따라 달라집니다'),filename+' missing diagnostic qualification');
  const links=[...journey.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(links.length,4,filename+' should have two topic links plus location and telephone');
  assert.equal(new Set(links).size,4,filename+' should not duplicate any links');
  assert.equal(links[2],'/'+'#location',filename+' needs a directions and opening-hours link');
  assert.equal(links[3],'tel:0325132875',filename+' needs a mobile-friendly call link');
  const isGum=/^(gum-|swollen-gums|periodontal-|scaling-|root-planing|curette-|receding-gums|loose-tooth)/.test(filename);
  const isRoot=filename.startsWith('root-canal-');
  const isRetreatment=isRoot&&/(?:retreatment|after-pain|or-extraction|lesion)/.test(filename);
  const expectedFirst=filename.startsWith('insurance-')?'/insured-care.html':
    isGum?'/gum-treatment.html':
    isRetreatment?'/retreatment.html':
    isRoot?'/root-canal-health.html':
    filename.startsWith('denture-')?'/denture.html':
    filename.startsWith('abrasion-')?'/cervical-abrasion.html':
    filename.startsWith('cavity-')?'/cavity-treatment.html':
    filename.startsWith('tooth-')?'/retreatment.html':null;
  assert.equal(links[0],expectedFirst,filename+' links patients to an unrelated clinical page');
  for(const link of links.slice(0,2)){
   assert.match(link,/^\/(?!\/)[a-z0-9/_-]+(?:\.html)?(?:#[a-z0-9_-]+)?$/i,filename+' points to a malformed related page');
   const route=link.split('#')[0];
   if(route!=='/'){
    const target=new URL('../dist'+route,import.meta.url);
    assert.ok(existsSync(target),filename+' related navigation target is absent: '+link);
   }
  }
  assert.ok(html.indexOf('class="patient-care-journey"')<html.indexOf('<div class="bottom">'),filename+' next-step navigation is below the footer');

 }
 assert.deepEqual([...counts.values()],[10,10,10,16],'article categories should remain consistent');
});
