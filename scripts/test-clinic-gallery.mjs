import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync('dist/'+p,'utf8');
const artworkGroups=html=>({
 originals:[...html.matchAll(/<figure class="gallery-piece\b[^>]*>[\s\S]*?<\/figure>/g)].map(m=>m[0]),
 watercolor:[...html.matchAll(/<a class="gallery-note gallery-note--watercolor"[^>]*>[\s\S]*?<\/a>/g)].map(m=>m[0]),
 studies:[...html.matchAll(/<figure class="gallery-patient-studies__piece"[^>]*>[\s\S]*?<\/figure>/g)].map(m=>m[0])
});
test('the gallery entrance painting is distinct from all 23 numbered works and social preview matches',()=>{
 const html=read('gallery.html');
 const hero=html.match(/<div class="gallery-hero-image"><img src="([^"]+)"/)?.[1]||'';
 const works=artworkGroups(html);
 const srcs=[...works.originals,...works.watercolor,...works.studies]
  .map(card=>card.match(/<img\b[^>]*src="([^"]+)"/)?.[1]);
 assert.equal(hero,'/assets/ejoeun-original-wisdom-consult-20261029.webp');
 assert.ok(!srcs.includes(hero),'gallery entrance must not repeat a numbered painting');
 assert.equal(srcs.length,23,'the numbered collection retains its 23 artworks');
 assert.ok(html.includes('content="https://ejoeundental.com'+hero+'"'),
  'share preview must match the gallery entrance painting');
 assert.ok(!html.includes('이미 홈페이지에서 사용 중인'),'old portrait description should be updated');
 assert.ok(html.includes('id="art-starry"')&&html.includes('src="/assets/gallery-starry-clinic.svg"'),
  'the first numbered original must remain available in the exhibition');
 const css=read('assets/clinic-gallery.css');
 assert.ok(css.includes('A distinct entrance painting')&&css.includes('aspect-ratio:3 / 2'),
  'mobile art must remain uncropped with a proper gallery frame');
});
test('mobile gallery catalogue preserves ten native artwork anchors in a swipeable rail',()=>{
 const html=read('gallery.html');
 const start=html.indexOf('<nav class="gallery-exhibition-index"');
 const end=html.indexOf('</nav>',start);
 const nav=start>=0&&end>start?html.slice(start,end+6):'';
 const targetIds=[...nav.matchAll(/href="#(art-[^"]+)"/g)].map(m=>m[1]);
 assert.equal(targetIds.length,10,'all ten painting navigation links must remain');
 assert.equal(new Set(targetIds).size,10,'no repeated target');
 for(const id of targetIds)assert.ok(html.includes('id="'+id+'"'),'missing linked painting '+id);
 assert.ok(html.includes('class="gallery-exhibition-swipe-hint"')&&html.includes('옆으로 밀어서'),
  'a visible swipe instruction must help phone visitors');
 assert.ok(nav.includes('aria-describedby="gallery-exhibition-swipe-hint"'));
 const styles=read('assets/clinic-gallery.css');
 const mobile=styles.slice(styles.indexOf('/* Mobile exhibition catalogue'));
 assert.ok(mobile.includes('@media (max-width:650px)'),'phone-only catalogue styles missing');
 for(const token of ['.gallery-exhibition-index {','display:flex;','overflow-x:auto;',
    'scroll-snap-type:x mandatory;','.gallery-exhibition-index > a {',
    'scroll-snap-align:start;','.gallery-exhibition-index > a:focus-visible']){
  assert.ok(mobile.includes(token),'missing mobile gallery interaction: '+token);
 }
});
test('gallery links to the owner-configured Naver booking page and exposes phone actions on mobile',()=>{
 const html=read('gallery.html');
 const clinic=JSON.parse(readFileSync('content/site.json','utf8'));
 const booking=clinic.naver_booking_url;
 const open=html.indexOf('<nav class="gallery-mobile-dock"');
 const close=html.indexOf('</nav>',open);
 const dock=open>=0&&close>open?html.slice(open,close+6):'';
 assert.ok(booking&&booking.startsWith('https://booking.naver.com/'));
 assert.ok(dock.includes('aria-label="이조은치과 모바일 예약 및 전화"'));
 assert.ok(dock.includes('href="'+booking+'"'),'mobile booking must match the verified clinic settings');
 assert.ok(dock.includes('target="_blank" rel="noopener noreferrer"'));
 assert.ok(dock.includes('href="tel:0325132875"'));
 assert.ok(html.includes('class="gallery-endnote-booking" href="'+booking+'"'),
  'desktop readers should also be able to book from the end of the exhibit');
 const css=read('assets/clinic-gallery.css');
 for(const token of ['.gallery-mobile-dock {','position:fixed;','env(safe-area-inset-bottom',
   'body:has(#gallery-dialog[open]) .gallery-mobile-dock',
   '.gallery-mobile-dock > a:focus-visible']) {
  assert.ok(css.includes(token),'missing gallery mobile booking dock styling: '+token);
 }
});
test('ten mobile patient-art cards prioritize each linked clinical guide',()=>{
 const html=read('gallery.html');
 const pieces=artworkGroups(html).studies;
 assert.equal(pieces.length,10);
 for(const piece of pieces){
  const actions=piece.slice(piece.indexOf('class="gallery-patient-studies__actions"'));
  assert.ok(actions.includes('href="/'),'patient art must link to medical information');
  assert.ok(actions.includes('gallery-patient-studies__original'),'full original should remain accessible');
  assert.ok(actions.includes('gallery-zoom'),'optional zoom must remain usable');
 }
 const css=read('assets/gallery-patient-studies.css');
 for(const token of ['Mobile patient gallery: clinical reading',
   'grid-template-columns:repeat(2,minmax(0,1fr))',
   '.gallery-patient-studies__actions > a:first-child',
   'grid-column:1 / -1',
   '.gallery-js .gallery-patient-studies__actions > .gallery-zoom']) {
  assert.ok(css.includes(token),'missing responsive patient gallery behavior: '+token);
 }
});
test('gallery connects its painting exhibition to four existing patient guides',()=>{
 const html=read('gallery.html');
 const start=html.indexOf('<nav class="gallery-care-bridge"');
 const end=html.indexOf('</nav>',start);
 const bridge=start>=0&&end>start?html.slice(start,end+6):'';
 const required=['/gum-treatment.html','/retreatment.html','/insured-care.html','/visit-guide.html'];
 const destinations=[...bridge.matchAll(/href="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(destinations.slice(0,4),required,'clinical destinations must retain intended reading order');
 assert.equal(new Set(destinations).size,destinations.length,'all destinations should be unique');
 assert.ok(destinations.includes('/#focus-care'),'gallery should reconnect to the home clinical index');
 assert.ok(bridge.includes('aria-labelledby="gallery-care-bridge-title"'));
 for(const link of required)assert.ok(existsSync('dist'+link),'clinical link not built: '+link);
 const css=read('assets/clinic-gallery.css');
 assert.ok(css.includes('Exhibition exit · artwork leads'));
 assert.ok(css.includes('.gallery-care-bridge__links > a:focus-visible'));
 assert.ok(css.includes('grid-template-columns:minmax(0,1fr)'),'mobile care index must be single-column');
 assert.ok(html.includes('/assets/clinic-gallery.css?v=20261030-clinical-bridge01'),
  'latest gallery design must be cache-busted');
 assert.ok(html.includes('/assets/gallery-patient-studies.css?v=20261030-patient-actions01'),
  'patient action refinements must refresh on visitors browsers');
});
test('homepage watercolor shelf swipe instruction is accurate and cache-busted',()=>{
 const home=read('index.html');
 assert.ok(home.includes('id="care-picture-swipe-hint"'));
 assert.ok(home.includes('aria-describedby="care-picture-swipe-hint"'));
 assert.ok(home.includes('그림을 옆으로 밀어 세 가지 진료 안내를 차례로 확인하세요.'));
 assert.ok(home.includes('/assets/atelier-refinement-20261030.css?v=20261030-visual-care02'));
});
test('gallery retains 10 paintings, 3 patient watercolors, and 10 distinct consultation artworks',()=>{
 const html=read('gallery.html'),g=artworkGroups(html);
 assert.deepEqual([g.originals.length,g.watercolor.length,g.studies.length],[10,3,10]);
 assert.ok(html.includes('rel="canonical" href="https://ejoeundental.com/gallery.html"'));
 assert.ok(html.includes('class="gallery-exhibition-index" aria-label="갤러리 작품 찾아보기"'));
 assert.ok(html.includes('id="patient-studies"'));
 assert.ok(html.includes('고흐풍에서 영감')&&html.includes('실제 작품을 전시하는 것이 아니라'));
 const group=[...g.originals,...g.watercolor,...g.studies];
 const paths=group.map(card=>card.match(/<img\b[^>]*src="([^"]+)"/)?.[1]);
 assert.equal(new Set(paths).size,23,'only unique artwork should be counted');
 for(const src of paths)assert.ok(src&&existsSync('dist'+src),'published artwork missing: '+src);
 for(const id of ['art-starry','art-pond','art-golden','art-cat','art-cubist-cat-clinic',
  'art-lakeside-flower-clinic','art-starry-night-clinic','art-quiet-window-cat',
  'art-street-art-tooth-heart','art-portrait-cat-watercolor']){
  assert.ok(html.includes('id="'+id+'"')&&html.includes('href="#'+id+'"'),'missing exhibition link: '+id);
 }
});
test('built art assets retain responsive gallery layout and original-image fallbacks',()=>{
 const html=read('gallery.html'),css=read('assets/gallery-patient-studies.css');
 for(const src of new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m=>m[1].split('?')[0]))){
  assert.ok(existsSync('dist'+src),'missing local gallery artifact: '+src);
 }
 const studies=artworkGroups(html).studies;
 assert.equal(studies.length,10);
 for(const piece of studies){
  const path=piece.match(/<img\b[^>]*src="([^"]+)"/)?.[1];
  assert.ok(piece.includes('loading="lazy"'));
  assert.ok(piece.includes('class="gallery-patient-studies__original" href="'+path+'"'));
  assert.ok(piece.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(piece.includes('data-image="'+path+'"'));
  assert.match(piece,/href="\/[a-z0-9-]+\.html">관련 건강정보 보기 →<\/a>/);
 }
 assert.match(css,/\.gallery-patient-studies__actions \.gallery-zoom\{display:none\}/);
 assert.match(css,/\.gallery-js \.gallery-patient-studies__actions \.gallery-zoom\{display:inline-flex\}/);
 assert.match(css,/@media\(max-width:630px\)/);
 assert.match(read('assets/clinic-gallery.js'),/showModal\(/);
});
test('homepage and sitemap make real artwork and clinical guides discoverable',()=>{
 const home=read('index.html'),html=read('gallery.html'),xml=read('sitemap.xml');
 assert.ok(home.includes('class="gallery-nav-link"'));
 assert.ok(home.includes('href="/gallery.html#patient-studies"'));
 assert.ok(home.includes('id="gallery"')&&home.includes('class="btn hero-booking"'));
 assert.ok(home.includes('name="naver-site-verification"')&&home.includes('name="google-site-verification"'));
 assert.ok(xml.includes('<loc>https://ejoeundental.com/gallery.html</loc>'));
 assert.ok(html.includes('href="/doctor.html"')&&html.includes('href="/stories.html"'));
 assert.equal((html.match(/class="gallery-zoom"/g)||[]).length,23);
 assert.equal((html.match(/class="gallery-patient-studies__original"/g)||[]).length,10);
});
test('gallery lightbox navigates all 23 paintings and returns keyboard focus',async()=>{
 const {runInNewContext}=await import('node:vm');
 const html=read('gallery.html'),script=read('assets/clinic-gallery.js');
 const markup=[...html.matchAll(/<button\b[^>]*class="gallery-zoom"[^>]*>/g)].map(m=>m[0]);
 assert.equal(markup.length,23);
 const attr=(tag,key)=>tag.match(new RegExp('\\b'+key+'="([^"]+)"'))?.[1]||'';
 const mock=(dataset={},room='paintings')=>{const handlers={};return{dataset,room,handlers,isConnected:true,focused:false,
  addEventListener(type,fn){handlers[type]=fn;},
  closest(selector){return selector==='section[id]'?{id:this.room}:null;},
  focus(){this.focused=true;},
  click(){handlers.click?.({target:this})}
 }};
 const buttons=markup.map((tag,index)=>mock({
  image:attr(tag,'data-image'),alt:attr(tag,'data-alt'),title:attr(tag,'data-title')
 },index<10?'paintings':index<13?'education':'patient-studies'));
 assert.ok(buttons.every(b=>b.dataset.image&&b.dataset.title));
 const img=mock(),heading={textContent:''},roomTitle={textContent:''},pos={textContent:''},
  close=mock(),prev=mock(),next=mock(),dialog=mock();
 dialog.open=false;dialog.showModal=()=>{dialog.open=true};dialog.close=()=>{dialog.open=false;dialog.handlers.close?.()};
 const ids={'gallery-dialog':dialog,'gallery-dialog-image':img,'gallery-dialog-title':heading,
  'gallery-dialog-section':roomTitle,'gallery-dialog-position':pos,
  'gallery-close':close,'gallery-prev':prev,'gallery-next':next};
 const classes=[];
 const document={documentElement:{classList:{add(name){classes.push(name)}}},
  getElementById:id=>ids[id]||null,querySelectorAll:selector=>selector==='.gallery-zoom'?buttons:[]};
 runInNewContext(script,{document});
 assert.ok(classes.includes('gallery-js'));
 buttons[22].click();
 assert.equal(img.src,buttons[22].dataset.image);
 assert.equal(pos.textContent,'23 / 23');
 assert.match(roomTitle.textContent,/제3전시실.*10 \/ 10/);
 assert.equal(dialog.open,true);
 next.click();
 assert.equal(img.src,buttons[0].dataset.image);
 assert.equal(pos.textContent,'01 / 23');
 assert.match(roomTitle.textContent,/제1전시실.*1 \/ 10/);
 prev.click();
 assert.equal(img.src,buttons[22].dataset.image);
 // A gentle horizontal one-finger swipe moves images; vertical movement
 // must remain untouched so natural scrolling keeps working on phones.
 img.handlers.touchstart({touches:[{clientX:210,clientY:50}]});
 img.handlers.touchend({changedTouches:[{clientX:110,clientY:56}]});
 assert.equal(img.src,buttons[0].dataset.image,'left swipe should show next painting');
 img.handlers.touchstart({touches:[{clientX:110,clientY:50}]});
 img.handlers.touchend({changedTouches:[{clientX:208,clientY:55}]});
 assert.equal(img.src,buttons[22].dataset.image,'right swipe should show prior painting');
 img.handlers.touchstart({touches:[{clientX:150,clientY:20}]});
 img.handlers.touchend({changedTouches:[{clientX:153,clientY:130}]});
 assert.equal(img.src,buttons[22].dataset.image,'vertical scroll must not navigate paintings');
 img.handlers.touchstart({touches:[{clientX:180,clientY:30},{clientX:200,clientY:40}]});
 img.handlers.touchend({changedTouches:[{clientX:70,clientY:30}]});
 assert.equal(img.src,buttons[22].dataset.image,'multitouch should not trigger artwork navigation');
 img.handlers.touchstart({touches:[{clientX:180,clientY:30}]});
 img.handlers.touchmove({touches:[{clientX:140,clientY:30},{clientX:190,clientY:50}]});
 img.handlers.touchend({changedTouches:[{clientX:70,clientY:30}]});
 assert.equal(img.src,buttons[22].dataset.image,'a second finger joining must cancel swipe navigation');
 // The clinical watercolor is a distinct second exhibit with its own count.
 close.click();
 buttons[11].click();
 assert.match(roomTitle.textContent,/제2전시실.*2 \/ 3/);
 close.click();
 buttons[22].click();
 let prevented=0;
 dialog.handlers.keydown({key:'ArrowLeft',preventDefault(){prevented++}});
 assert.equal(img.src,buttons[21].dataset.image);
 assert.equal(prevented,1);
 close.click();
 assert.equal(dialog.open,false);
 assert.equal(buttons[22].focused,true);
});
test('Google image sitemap lists exactly the 23 images actually exhibited in the gallery',()=>{
 const html=read('gallery.html'),xml=read('sitemap.xml');
 const source=readFileSync('sitemap.xml','utf8');
 const groups=artworkGroups(html);
 const images=[...groups.originals,...groups.watercolor,...groups.studies]
  .map(piece=>piece.match(/<img\b[^>]*src="([^"]+)"/)?.[1]);
 const links=x=>{
  const b=x.match(/<url><loc>https:\/\/ejoeundental\.com\/gallery\.html<\/loc>[\s\S]*?<\/url>/)?.[0]||'';
  return [...b.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(m=>m[1]);
 };
 const expected=images.map(s=>'https://ejoeundental.com'+s);
 assert.deepEqual(links(source),expected);
 assert.deepEqual(links(xml),expected);
 assert.equal((xml.match(/<image:image>/g)||[]).length,37,'14 clinic medical images + 23 gallery works');
 const objects=[...html.matchAll(/<script type="application\/ld\+json">(\{[^\n]*"@type":"CollectionPage"[^\n]*\})<\/script>/g)];
 assert.equal(objects.length,1);
 const schema=JSON.parse(objects[0][1]);
 assert.deepEqual(schema.mainEntity.associatedMedia.map(x=>x.contentUrl),expected);
});
