import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync('dist/'+p,'utf8');
test('gallery is published with four paintings and three clinical illustration links',()=>{
 const g=read('gallery.html');
 assert.match(g,/<title>치과 갤러리 /);
 assert.match(g,/rel="canonical" href="https:\/\/ejoeundental\.com\/gallery\.html"/);
 assert.equal((g.match(/<figure class="gallery-piece/g)||[]).length,4);
 assert.equal((g.match(/class="gallery-piece[^"]*gallery-piece-feature/g)||[]).length,2,
  'gallery must have two museum-sized feature artworks');
 assert.match(g,/class="gallery-exhibition-index" aria-label="갤러리 작품 찾아보기"/);
 for(const anchor of ['art-starry','art-pond','art-golden','art-cat']){
  assert.ok(g.includes('href="#'+anchor+'"'),'missing direct exhibition index link: '+anchor);
 }
 assert.equal((g.match(/class="gallery-note"/g)||[]).length,3);
 assert.match(g,/고흐풍에서 영감/);
 assert.match(g,/실제 작품을 전시하는 것이 아니라/);
 assert.match(g,/href="\/doctor\.html"/);
 assert.match(g,/href="\/stories\.html"/);
});
test('gallery artwork and style files are present in built Cloudflare output',()=>{
 const g=read('gallery.html');
 for(const src of new Set([...g.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m=>m[1].split('?')[0]))){
  assert.ok(existsSync('dist'+src),'gallery missing artifact: '+src);
 }
 for(const p of ['assets/gallery-starry-clinic.svg','assets/gallery-golden-garden.svg']){
  const svg=read(p);
  assert.match(svg,/^<svg\b/);
  assert.match(svg,/<\/svg>$/);
  assert.match(svg,/이조은치과/);
 }
 assert.match(read('assets/clinic-gallery.css'),/max-width:600px/);
 assert.match(read('assets/clinic-gallery.css'),/grid-column:1\/-1/);
 assert.match(read('assets/clinic-gallery.css'),/gallery-exhibition-index/);
 assert.match(read('assets/clinic-gallery.css'),/gallery-piece-feature/);
 assert.match(read('assets/clinic-gallery.js'),/showModal\(/);
});
test('gallery is discoverable from homepage and sitemap without losing search or booking',()=>{
 const h=read('index.html'),s=read('sitemap.xml');
 assert.match(h,/class="gallery-nav-link"/);
 assert.match(h,/id="gallery"/);
 assert.match(h,/gallery-home-artworks/);
 assert.match(h,/href="\/gallery\.html"/);
 assert.match(s,/<loc>https:\/\/ejoeundental\.com\/gallery\.html<\/loc>/);
 assert.match(h,/name="naver-site-verification"/);
 assert.match(h,/rel="canonical" href="https:\/\/ejoeundental\.com\/"/);
 assert.match(h,/class="btn hero-call"/);
 assert.match(h,/class="btn hero-booking"/);
 assert.match(h,/509편/);
});

test('four distinct original works appear across two complementary homepage exhibitions',()=>{
 const home=read('index.html'),atelier=read('assets/atelier-home-2026.css');
 const early=home.match(/<section class="atelier-collection-peek"[\s\S]*?<\/section>/)?.[0]||'';
 const later=home.match(/<section class="section light gallery-home-preview" id="gallery"[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(early&&later,'both linked art rooms remain available');
 const earlyIds=[...early.matchAll(/href="\/gallery\.html#(art-[a-z]+)"/g)].map(m=>m[1]);
 const laterIds=[...later.matchAll(/href="\/gallery\.html#(art-[a-z]+)"/g)].map(m=>m[1]);
 assert.deepEqual(earlyIds,['art-starry','art-golden']);
 assert.deepEqual(laterIds,['art-pond','art-cat']);
 assert.equal(new Set([...earlyIds,...laterIds]).size,4,
  'homepage should avoid duplicate painting previews');
 assert.match(later,/gallery-home-artworks--complementary/);
 assert.match(later,/impressionist-water-garden\.svg/);
 assert.match(later,/ejoeundental-hero-cat\.webp/);
 assert.match(atelier,/Atelier edition X · Four unique artworks/);
 assert.match(atelier,/gallery-home-artworks--complementary/);
 for(const id of [...earlyIds,...laterIds]) {
   assert.ok(read('gallery.html').includes('id="'+id+'"'),'missing complete exhibition anchor '+id);
 }
});
