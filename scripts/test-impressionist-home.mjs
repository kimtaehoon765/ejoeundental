import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const home=readFileSync('dist/index.html','utf8');
const css=readFileSync('dist/assets/home-enhancements.css','utf8');
const artwork=readFileSync('dist/assets/impressionist-water-garden.svg','utf8');

test('the mobile homepage shows original painterly artwork after credentials and before the long clinical description',()=>{
 const hero=home.match(/<section class="hero wrap">([\s\S]*?)<\/section>/)?.[1]||'';
 const h1=hero.indexOf('id="headline"');
 const degree=hero.indexOf('고려대학교 의학박사');
 const specialist=hero.indexOf('통합치의학과 전문의');
 const preview=hero.indexOf('class="hero-gallery-window"');
 const intro=hero.indexOf('id="intro"');
 assert.ok(h1>=0&&degree>h1&&specialist>degree&&preview>specialist&&intro>preview);
 assert.match(hero,/href="tel:0325132875"/);
 assert.match(hero,/class="art hero-artwork"/);
 assert.match(home,/class="monet-interlude"/);
 assert.match(home,/aria-labelledby="monet-interlude-title"/);
 assert.equal((hero.match(/class="hero-gallery-window"/g)||[]).length,1);
});

test('original gallery and responsive accent are local, cached, and accessible',()=>{
 assert.match(home,/home-enhancements\.css\?v=[0-9a-f]{12}/,'Build should fingerprint CSS without stale cache keys');
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/\.hero-gallery-window\{[\s\S]*?display:block/);
 assert.match(css,/background-image:url\("\/assets\/impressionist-water-garden\.svg"\)/);
 assert.match(artwork,/<title id="t">이조은치과 인상주의 수련 연못 정원<\/title>/);
 assert.match(artwork,/id="impressionist-pigment"/);
 assert.match(artwork,/이조은치과<\/text>/);
 assert.match(artwork,/Original white, fluffy clinic cat/);
 const pigmentGroup=artwork.split('id="impressionist-pigment"')[1]?.split('</g>')[0]||'';
 const pigmentCount=(pigmentGroup.match(/<path /g)||[]).length;
 assert.ok(pigmentCount>=1200,'Should retain layered artistically varied brushwork');
 assert.match(artwork,/id="impressionist-pigment"[^>]+fill="none" stroke-linecap="round"/);
 assert.ok(artwork.length<190000,'Keep original SVG painterly artwork optimized for mobile delivery');
 assert.ok(!/<image[^>]+(?:https?:|data:)/.test(artwork),'Avoid external and embedded raster image requests');
 assert.match(home,/loading="lazy" decoding="async" alt="부드러운 햇빛 아래 수련/);
});

test('patients retain key phone, navigation, SEO and degree information',()=>{
 const originalKeys=['<link rel="canonical" href="https://ejoeundental.com/">','고려대학교 의학박사','통합치의학과 전문의','인천·부평 잇몸치료','재신경치료','건강보험 적용 진료'];
 for(const item of originalKeys)assert.ok(home.includes(item),'Homepage missing '+item);
 const headlineCount=(home.match(/<h1 id="headline">/g)||[]).length;
 assert.equal(headlineCount,1);
});
