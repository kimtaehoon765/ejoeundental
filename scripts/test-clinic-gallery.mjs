import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync('dist/'+p,'utf8');
test('gallery is published with nine paintings and three clinical illustration links',()=>{
 const g=read('gallery.html');
 assert.match(g,/<title>치과 갤러리 /);
 assert.match(g,/rel="canonical" href="https:\/\/ejoeundental\.com\/gallery\.html"/);
 assert.equal((g.match(/<figure class="gallery-piece/g)||[]).length,9);
 assert.equal((g.match(/class="gallery-piece[^"]*gallery-piece-feature/g)||[]).length,2,
  'gallery must have two museum-sized feature artworks');
 assert.match(g,/class="gallery-exhibition-index" aria-label="갤러리 작품 찾아보기"/);
 for(const anchor of ['art-starry','art-pond','art-golden','art-cat','art-cubist-cat-clinic','art-lakeside-flower-clinic','art-starry-night-clinic','art-quiet-window-cat','art-street-art-tooth-heart']){
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


test('lightbox moves between all nine artworks with keyboard and restores focus',async()=>{
 const {runInNewContext}=await import('node:vm');
 const g=read('gallery.html');
 const script=read('assets/clinic-gallery.js');
 const css=read('assets/clinic-gallery.css');
 const markup=[...g.matchAll(/<button type="button" class="gallery-zoom" data-image="([^"]+)" data-alt="([^"]+)" data-title="([^"]+)"/g)];
 assert.equal(markup.length,9,'all nine original gallery zoom controls remain');
 const mock=(dataset={})=>{
  const handlers={};
  return {dataset,handlers,isConnected:true,focused:false,
   addEventListener(type,fn){handlers[type]=fn;},
   focus(){this.focused=true;},
   click(){handlers.click?.({target:this});}
  };
 };
 const artworks=markup.map(m=>mock({image:m[1],alt:m[2],title:m[3]}));
 const picture={src:'',alt:''},caption={textContent:''},counter={textContent:''};
 const close=mock(),previous=mock(),next=mock();
 const dialog=mock();
 dialog.open=false;
 dialog.showModal=()=>{dialog.open=true;};
 dialog.close=()=>{dialog.open=false;dialog.handlers.close?.();};
 const ids={'gallery-dialog':dialog,'gallery-dialog-image':picture,
  'gallery-dialog-title':caption,'gallery-dialog-position':counter,
  'gallery-close':close,'gallery-prev':previous,'gallery-next':next};
 const classes=[];
 const document={
  documentElement:{classList:{add(v){classes.push(v);}}},
  getElementById:id=>ids[id]||null,
  querySelectorAll:selector=>selector==='.gallery-zoom'?artworks:[]
 };
 runInNewContext(script,{document});
 assert.ok(classes.includes('gallery-js'));
 artworks[7].click();
 assert.equal(dialog.open,true);
 assert.equal(picture.src,artworks[7].dataset.image);
 assert.equal(caption.textContent,artworks[7].dataset.title);
 assert.equal(counter.textContent,'08 / 09');
 assert.equal(close.focused,true);
 next.click();
 assert.equal(picture.src,artworks[8].dataset.image);
 assert.equal(counter.textContent,'09 / 09');
 next.click();
 assert.equal(picture.src,artworks[0].dataset.image,'last wraps to first');
 assert.equal(counter.textContent,'01 / 09');
 previous.click();
 assert.equal(picture.src,artworks[8].dataset.image,'first wraps to last');
 let prevented=0;
 dialog.handlers.keydown({key:'ArrowLeft',preventDefault(){prevented++}});
 assert.equal(picture.src,artworks[7].dataset.image);
 dialog.handlers.keydown({key:'ArrowRight',preventDefault(){prevented++}});
 assert.equal(picture.src,artworks[8].dataset.image);
 assert.equal(prevented,2,'keyboard arrows must prevent page scroll');
 dialog.handlers.keydown({key:'ArrowLeft',altKey:true,preventDefault(){prevented++}});
 assert.equal(prevented,2,'modified shortcuts must not be intercepted');
 close.click();
 assert.equal(dialog.open,false);
 assert.equal(artworks[7].focused,true,'closing restores the original trigger');
 assert.ok(g.includes('id="gallery-prev" aria-label="이전 작품 보기"'));
 assert.ok(g.includes('id="gallery-next" aria-label="다음 작품 보기"'));
 assert.ok(g.includes('id="gallery-dialog-position" aria-live="polite"'));
 assert.ok(g.includes('src="/assets/clinic-gallery.js?v=20261028-gallery-navigator2"'));
 assert.match(css,/Museum edition XVIII · Navigate four paintings/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css,/\.gallery-dialog-controls button\{[\s\S]*?min-height:46px/);
});


test('gallery publishes five optimized original image pairs',()=>{
 const g=read('gallery.html');
 for(const name of ["cubist-cat-clinic","lakeside-flower-clinic","starry-night-clinic","quiet-window-cat","street-art-tooth-heart"]){
 assert.ok(g.includes('id="art-'+name+'"'));
 for(const suffix of ['.webp','-thumb.webp'])assert.ok(existsSync('dist/assets/'+name+suffix));
 }
 assert.ok(g.includes('그림 아홉 점, 아홉 가지 이야기'));
});


test('live read-only gallery probe checks all nine original artworks and 10 optimized images',()=>{
 const gallery=read('gallery.html');
 const script=readFileSync('scripts/check-live-gallery.mjs','utf8');
 const zoomButtons=[...gallery.matchAll(/class="gallery-zoom"/g)];
 const indices=[...gallery.matchAll(/href="#art-[a-z-]+"/g)];
 assert.equal((gallery.match(/<figure class="gallery-piece/g)||[]).length,9);
 assert.equal(zoomButtons.length,9);
 assert.equal(indices.length,9);
 assert.ok(gallery.includes('aria-atomic="true">01 / 09</span>'),
  'visible counter must not claim a four-piece exhibition before JS loads');
 const names=['cubist-cat-clinic','lakeside-flower-clinic',
  'starry-night-clinic','quiet-window-cat','street-art-tooth-heart'];
 for(const name of names){
  assert.ok(script.includes("'assets/"+name+"-thumb.webp'"));
  assert.ok(script.includes("'assets/"+name+".webp'"));
  for(const suffix of ['-thumb.webp','.webp']){
   const target='assets/'+name+suffix;
   assert.ok(existsSync('dist/'+target),'missing deployed source '+target);
  }
 }
 assert.ok(script.includes("gallery.includes('id=\"'+id+'\"')"),
  'public verification should check nine actual art anchors');
 assert.ok(script.includes('checks.length>=19'));
 assert.ok(script.includes('expected===actual'),
  'public verification must compare source and live SHA, not just HTTP status');
 assert.ok(script.includes('Cache-Control'));
});


test('home exhibits the new nine-piece collection without heavy images or lost links',()=>{
 const home=read('index.html');
 const gallery=read('gallery.html');
 const atelier=read('assets/atelier-home-2026.css');
 const area=home.match(/<section class="section light gallery-home-preview" id="gallery"[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(area,'home gallery remains an accessible section');
 assert.ok(area.includes('창작 그림 9점 모두 감상하기 →'));
 assert.ok(!area.includes('그림 네 점 모두 감상하기'));
 assert.ok(area.includes('aria-labelledby="gallery-new-arrivals-title"'));
 assert.ok(area.includes('id="gallery-new-arrivals-title"'));
 const legacy=area.match(/<div class="gallery-home-artworks gallery-home-artworks--complementary">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.equal((legacy.match(/<a href="\/gallery\.html#art-/g)||[]).length,2,
  'existing pond and director-cat previews must stay distinct');
 const arrivals=area.match(/<div class="gallery-new-arrivals"[\s\S]*?<\/section>/)?.[0]||'';
 const addedArt=['cubist-cat-clinic','street-art-tooth-heart'];
 for(const filename of addedArt){
  assert.ok(arrivals.includes('src="/assets/'+filename+'-thumb.webp"'));
  assert.ok(arrivals.includes('href="/gallery.html#art-'+filename+'"'));
  assert.ok(gallery.includes('id="art-'+filename+'"'));
  assert.ok(existsSync('dist/assets/'+filename+'-thumb.webp'));
 }
 assert.equal((arrivals.match(/<img\b/g)||[]).length,2,'only two light thumbnails on home');
 assert.equal((arrivals.match(/loading="lazy" decoding="async"/g)||[]).length,2);
 assert.ok(!arrivals.includes('src="/assets/cubist-cat-clinic.webp"'),
  'avoid loading full-size original on the homepage');
 assert.match(atelier,/Atelier edition XV · New works salon/);
 assert.match(atelier,/\.gallery-new-arrivals__previews\{\s*display:grid;\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(atelier,/@media\(max-width:760px\)/);
 assert.match(atelier,/\.gallery-new-arrivals__intro>a\{[\s\S]*?min-height:44px/);
 assert.ok(home.includes('name="naver-site-verification"'));
 assert.ok(home.includes('name="google-site-verification"'));
 assert.ok(home.includes('BUILD_NAVER_BOOKING_HERO') || home.includes('class="btn hero-booking"'));
 assert.equal((home.match(/<div class="card owner-story-card"><h3><a href="https:\/\/blog\.naver\.com\//g)||[]).length,509);
});


test('Google Image sitemap includes each of nine gallery originals without changing indexed page URLs',()=>{
 const source=readFileSync('sitemap.xml','utf8');
 const sitemap=read('sitemap.xml');
 const gallery=read('gallery.html');
 const names=[
  'gallery-starry-clinic.svg','impressionist-water-garden.svg',
  'gallery-golden-garden.svg','ejoeundental-hero-cat.webp',
  'cubist-cat-clinic.webp','lakeside-flower-clinic.webp',
  'starry-night-clinic.webp','quiet-window-cat.webp',
  'street-art-tooth-heart.webp'
 ];
 const galleryImages=xml=>{
  const block=xml.split('<loc>https://ejoeundental.com/gallery</loc>')[1]?.split('</url>')[0]||
   xml.split('<loc>https://ejoeundental.com/gallery.html</loc>')[1]?.split('</url>')[0]||'';
  return [...block.matchAll(/<image:image><image:loc>([^<]+)<\/image:loc><\/image:image>/g)]
   .map(match=>match[1]);
 };
 assert.deepEqual(galleryImages(source),names.map(name=>'https://ejoeundental.com/assets/'+name));
 assert.deepEqual(galleryImages(sitemap),galleryImages(source));
 assert.equal((sitemap.match(/<image:image>/g)||[]).length,23,
  '14 original medical picture references + 9 gallery references');
 for(const name of names){
  assert.ok(gallery.includes('/assets/'+name));
  assert.ok(existsSync('dist/assets/'+name));
 }
 const checker=readFileSync('scripts/live-domain-check.mjs','utf8');
 assert.match(checker,/const expectedImageLocs=/);
 assert.match(checker,/const galleryImageMapReady=/);
 assert.match(checker,/galleryNine\.every\(url=>expectedGallery\.includes/);
 assert.ok(!checker.includes('imageLocs.length===14'),
  'live release check must follow the generated sitemap, not old counts');
 assert.match(source,/xmlns:image="http:\/\/www.google.com\/schemas\/sitemap-image\/1.1"/);
});
