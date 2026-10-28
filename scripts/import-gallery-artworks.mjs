/* Import exactly five approved WebP artworks from the owner-provided ZIP.
 * Only allowlisted paths are read; no arbitrary files are extracted. */
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const zip=process.argv[2]||'gallery-artworks-import.zip';
if(!existsSync(zip)) throw Error('Gallery ZIP not present');
const extract=(name)=>execFileSync('unzip',['-p',zip,name],{encoding:'buffer',maxBuffer:6*1024*1024});
const names=['cubist-cat-clinic','lakeside-flower-clinic','starry-night-clinic','quiet-window-cat','street-art-tooth-heart'];
let gallery=readFileSync('gallery.html','utf8');
if(gallery.includes('id="art-cubist-cat-clinic"')){console.log('Nine paintings already added.');process.exit(0)}
assert.equal((gallery.match(/<figure class="gallery-piece/g)||[]).length,4);
const entries=extract('new-gallery-entries.html').toString();
const delim='<!-- 기존 gallery-art-grid 맨 아래에 추가 -->';
assert.equal(entries.split(delim).length,2);
const [linksSource,figuresSource]=entries.split(delim);
const links=linksSource.replace('<!-- 작품 색인 .gallery-exhibition-index에 추가 -->','').trim();
const figures=figuresSource.trim();
assert.equal((links.match(/<a href="#art-/g)||[]).length,5);
assert.equal((figures.match(/<figure class="gallery-piece"/g)||[]).length,5);
const images=[];
for(const name of names){
 assert.ok(links.includes('href="#art-'+name+'"'));
 assert.ok(figures.includes('id="art-'+name+'"'));
 for(const entry of ['assets/'+name+'.webp','assets/'+name+'-thumb.webp']){
  const bytes=extract(entry);
  assert.ok(bytes.length>=1500&&bytes.length<=1500000);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  images.push([entry,bytes]);
 }
}
const idx='</nav>\n<section class="gallery-section" id="paintings"';
const grid='</div></section>\n<section class="gallery-section gallery-education"';
assert.equal(gallery.split(idx).length,2);
assert.equal(gallery.split(grid).length,2);
assert.ok(gallery.includes('그림 네 점, 네 가지 이야기'));
gallery=gallery.replace(idx,links+'\n'+idx).replace(grid,figures+'\n'+grid)
 .replace('그림 네 점, 네 가지 이야기','그림 아홉 점, 아홉 가지 이야기')
 .replace('/assets/clinic-gallery.css?v=20261028-gallery-navigator2','/assets/clinic-gallery.css?v=20261028-gallery-nine-artworks');
assert.equal((gallery.match(/<figure class="gallery-piece/g)||[]).length,9);
let style=readFileSync('assets/clinic-gallery.css','utf8');
style=style.trimEnd()+'\n\n/* Nine original artworks · owner approved gallery expansion */\n'+extract('new-gallery-style.css').toString().trimEnd()+'\n';
let tests=readFileSync('scripts/test-clinic-gallery.mjs','utf8');
const originalCount='assert.equal((g.match(/<figure class="gallery-piece/g)||[]).length,4);';
assert.equal(tests.split(originalCount).length,2);
tests=tests.replace(originalCount,'assert.equal((g.match(/<figure class="gallery-piece/g)||[]).length,9);');
tests=tests.replace('gallery is published with four paintings','gallery is published with nine paintings');
const originalIds="for(const anchor of ['art-starry','art-pond','art-golden','art-cat'])";
assert.equal(tests.split(originalIds).length,2);
tests=tests.replace(originalIds,"for(const anchor of ['art-starry','art-pond','art-golden','art-cat',"+names.map(n=>"'art-"+n+"'").join(',')+"])");
// The four-piece lightbox regression now needs to test wrapping at work nine.
// Keep keyboard, close-focus and modified-shortcut checks intact.
const lightboxStart=tests.indexOf("test('lightbox moves between all four artworks");
assert.ok(lightboxStart>0,'Expected lightbox navigation coverage');
const beforeLightbox=tests.slice(0,lightboxStart);
let lightbox=tests.slice(lightboxStart);
const required=[
 ["lightbox moves between all four artworks","lightbox moves between all nine artworks"],
 ["assert.equal(markup.length,4,'all four original gallery zoom controls remain');",
  "assert.equal(markup.length,9,'all nine original gallery zoom controls remain');"],
 ["artworks[2]","artworks[7]"],
 ["artworks[3]","artworks[8]"],
 ["'03 / 04'","'08 / 09'"],
 ["'04 / 04'","'09 / 09'"],
 ["'01 / 04'","'01 / 09'"]
];
for(const [old,next] of required){
 assert.ok(lightbox.includes(old),'Missing original lightbox test expectation: '+old);
 lightbox=lightbox.replaceAll(old,next);
}
tests=beforeLightbox+lightbox;
tests+='\n\ntest(\'gallery publishes five optimized original image pairs\',()=>{\n const g=read(\'gallery.html\');\n for(const name of '+JSON.stringify(names)+'){\n assert.ok(g.includes(\'id="art-\'+name+\'"\'));\n for(const suffix of [\'.webp\',\'-thumb.webp\'])assert.ok(existsSync(\'dist/assets/\'+name+suffix));\n }\n assert.ok(g.includes(\'그림 아홉 점, 아홉 가지 이야기\'));\n});\n';
mkdirSync('assets',{recursive:true});
for(const [p,bytes] of images)writeFileSync(p,bytes);
writeFileSync('gallery.html',gallery);
writeFileSync('assets/clinic-gallery.css',style);
writeFileSync('scripts/test-clinic-gallery.mjs',tests);
console.log('Published nine gallery paintings; ten optimized WebP files added.');
