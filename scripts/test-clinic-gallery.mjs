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
 const nav=html.match(/<nav class="gallery-exhibition-index"[^>]*>[\\s\\S]*?<\\/nav>/)?.[0]||'';
 const hint=html.match(/<p class="gallery-exhibition-swipe-hint"[^>]*>[^<]*/)?.[0]||'';
 const targetIds=[...nav.matchAll(/href="#(art-[^"]+)"/g)].map(m=>m[1]);
 assert.equal(targetIds.length,10,'all ten painting navigation links must remain');
 assert.equal(new Set(targetIds).size,10,'no repeated target');
 for(const id of targetIds)assert.ok(html.includes('id="'+id+'"'),'missing linked painting '+id);
 assert.ok(hint.includes('옆으로 밀어서'),'a visible swipe instruction must help phone visitors');
 assert.ok(nav.includes('aria-describedby="gallery-exhibition-swipe-hint"'));
 const styles=read('assets/clinic-gallery.css');
 const mobile=styles.slice(styles.indexOf('/* Mobile exhibition catalogue'));
 assert.ok(mobile.includes('@media (max-width:650px)'),'phone-only catalogue styles missing');
 assert.match(mobile,/\\.gallery-exhibition-index \\{[\\s\\S]*?display:flex;[\\s\\S]*?overflow-x:auto;[\\s\\S]*?scroll-snap-type:x mandatory;/);
 assert.match(mobile,/\\.gallery-exhibition-index > a \\{[\\s\\S]*?scroll-snap-align:start;/);
 assert.match(mobile,/\\.gallery-exhibition-index > a:focus-visible/);
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
