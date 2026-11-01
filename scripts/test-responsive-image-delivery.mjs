import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

const dist=file=>readFileSync('dist/'+file,'utf8');
const home=dist('index.html');
const gallery=dist('gallery.html');

test('small WebP copies of approved original paintings are real and smaller',()=>{
 const variants=[
  ['ejoeun-gallery-cat-dentist-20261029-640.webp','ejoeun-gallery-cat-dentist-20261029.webp'],
  ['ejoeun-original-wisdom-consult-20261029-720.webp','ejoeun-original-wisdom-consult-20261029.webp'],
  ['quiet-window-cat-thumb-320.webp','quiet-window-cat-thumb.webp'],
  ['cubist-cat-clinic-thumb-320.webp','cubist-cat-clinic-thumb.webp'],
  ['lakeside-flower-clinic-thumb-360.webp','lakeside-flower-clinic-thumb.webp'],
  ['starry-night-clinic-thumb-360.webp','starry-night-clinic-thumb.webp']
 ];
 for(const [smaller,original] of variants){
  const relative='dist/assets/';
  const resized=readFileSync(relative+smaller);
  const full=readFileSync(relative+original);
  assert.equal(resized.toString('ascii',0,4),'RIFF',smaller);
  assert.equal(resized.toString('ascii',8,12),'WEBP',smaller);
  assert.ok(statSync(relative+smaller).size < statSync(relative+original).size*.90,
   smaller+' must transfer less data than the approved full-size artwork');
  assert.ok(full.length>0,'the approved original remains available: '+original);
 }
});

test('homepage portrait preloads the same responsive image offered by its actual img tag',()=>{
 const preload=home.match(/<link rel="preload" as="image"[^>]*>/)?.[0]||'';
 const portrait=home.match(/<img\b[^>]*src="\/assets\/ejoeun-gallery-cat-dentist-20261029\.webp"[^>]*>/)?.[0]||'';
 const responsive='/assets/ejoeun-gallery-cat-dentist-20261029-640.webp 640w';
 assert.ok(preload.includes(responsive)&&portrait.includes(responsive));
 assert.ok(preload.includes('imagesizes=')&&portrait.includes('sizes='));
 assert.ok(portrait.includes('fetchpriority="high"')&&portrait.includes('loading="eager"'));
 assert.ok(home.includes('https://ejoeundental.com/assets/ejoeun-gallery-cat-dentist-20261029.webp'),
  'original patient-facing clinic artwork remains the social share image');
});

test('home gallery miniatures use 320w previews and still retain original fallback',()=>{
 for(const stem of ['quiet-window-cat','cubist-cat-clinic']){
  const original='/assets/'+stem+'-thumb.webp';
  const small='/assets/'+stem+'-thumb-320.webp';
  const img=[...home.matchAll(/<img\b[^>]*>/g)].map(m=>m[0])
   .find(tag=>tag.includes('src="'+original+'"'))||'';
  assert.ok(img.includes('srcset="')&&img.includes(small+' 320w')&&img.includes(original+' 680w'));
  assert.ok(img.includes('sizes=')&&img.includes('loading="lazy"'));
  assert.ok(img.includes('alt=')&&img.includes('width="680" height="420"'));
 }
});

test('gallery first painting preloads a smaller file without compromising desktop art',()=>{
 const preload=gallery.match(/<link rel="preload" as="image"[^>]*>/)?.[0]||'';
 const painting=[...gallery.matchAll(/<img\b[^>]*>/g)].map(m=>m[0])
  .find(tag=>tag.includes('src="/assets/ejoeun-original-wisdom-consult-20261029.webp"'))||'';
 const small='/assets/ejoeun-original-wisdom-consult-20261029-720.webp 720w';
 assert.ok(preload.includes(small)&&painting.includes(small));
 assert.ok(preload.includes('imagesizes=')&&painting.includes('sizes='));
 assert.ok(painting.includes('fetchpriority="high"'));
 assert.ok(gallery.includes('https://ejoeundental.com/assets/ejoeun-original-wisdom-consult-20261029.webp'),
  'gallery social preview remains original resolution');
});

test('gallery night and lakeside art use smaller 360w variants with approved originals',()=>{
 for(const stem of ['lakeside-flower-clinic','starry-night-clinic']){
  const original='/assets/'+stem+'-thumb.webp';
  const small='/assets/'+stem+'-thumb-360.webp';
  for(const [page,html] of [['home',home],['gallery',gallery]]){
   const picture=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0])
     .find(tag=>tag.includes('src="'+original+'"'))||'';
   assert.ok(picture.includes('srcset="')&&picture.includes(small+' 360w')&&
     picture.includes(original+' 680w'),
     page+' must offer a responsive original-art file for '+stem);
   assert.ok(picture.includes('sizes="')&&picture.includes('loading="lazy"'));
   assert.ok(picture.includes('width="680" height="420"')&&picture.includes('alt="'));
  }
  assert.ok(gallery.includes('https://ejoeundental.com/assets/'+stem+'-thumb.webp'),
   'gallery ImageObject structured data should keep original full-size artwork');
 }
});

test('homepage and gallery never fetch desktop-only Noto Serif CSS on phone viewport',()=>{
 for(const html of [home,gallery]){
  const head=html.split('</head>')[0];
  const active=head.replace(/<noscript>[\s\S]*?<\/noscript>/g,'');
  const links=[...active.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(m=>m[0]);
  assert.ok(!links.some(link=>link.includes('Noto+Serif+KR')),
   'do not statically enqueue large desktop Korean webfont on mobile');
  assert.ok(active.includes("window.matchMedia('(min-width: 801px)')"),
   'desktop size must be checked before injecting Korean serif CSS');
  assert.ok(active.includes("media='(min-width: 801px)'"),
   'desktop font link must remain desktop only');
  assert.ok(head.includes('<noscript>')&&head.includes('Noto+Serif+KR'),
   'desktop font still has a no-JavaScript fallback');
 }
});
