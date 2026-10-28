import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const home=readFileSync('dist/index.html','utf8');
const css=readFileSync('dist/assets/home-enhancements.css','utf8');
const galleryCss=readFileSync('dist/assets/gallery-upgrade.css','utf8');
const artwork=readFileSync('dist/assets/impressionist-water-garden.svg','utf8');

test('the mobile homepage presents the original portrait after key actions and keeps Monet artwork in the collection',()=>{
 const hero=home.match(/<section class="hero wrap">([\s\S]*?)<\/section>/)?.[1]||'';
 const h1=hero.indexOf('id="headline"');
 const degree=hero.indexOf('고려대학교 의학박사');
 const specialist=hero.indexOf('통합치의학과 전문의');
 const preview=hero.indexOf('class="hero-gallery-window"');
 const intro=hero.indexOf('id="intro"');
 assert.ok(h1>=0&&degree>h1&&specialist>degree&&preview>specialist&&intro>preview);
 assert.match(hero,/href="tel:0325132875"/);
 assert.match(hero,/class="art hero-artwork"/);
 assert.ok(hero.includes('loading="eager" fetchpriority="high" decoding="async"'),
  'The visible original doctor-cat portrait should load early on both phones and desktop');
 assert.match(home,/<link rel="preload" as="image" type="image\/webp" fetchpriority="high" href="\/assets\/ejoeundental-hero-cat\.webp">/,
  'Use one shared preload for the original portrait across screen sizes');

 assert.match(home,/class="monet-interlude"/);
 assert.match(home,/aria-labelledby="monet-interlude-title"/);
 assert.equal((hero.match(/class="hero-gallery-window"/g)||[]).length,1);
});

test('original gallery and responsive accent are local, cached, and accessible',()=>{
 assert.match(home,/home-enhancements\.css\?v=[0-9a-f]{12}/,'Build should fingerprint CSS without stale cache keys');
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/\.hero-gallery-window\{[\s\S]*?display:block/);
 const hash=createHash('sha256').update(artwork).digest('hex').slice(0,12);
 const artUrl='/assets/impressionist-water-garden.svg?v='+hash;
 assert.ok(css.includes('background-image:url("'+artUrl+'")'),'CSS must load the latest painting');
 const galleryReferences=[...galleryCss.matchAll(/\/assets\/impressionist-water-garden\.svg(?:\?v=[0-9a-f]{12})?/g)].map(m=>m[0]);
 assert.ok(galleryReferences.length>=3,'Gallery CSS must still show the original Monet-inspired background');
 assert.ok(galleryReferences.every(url=>url===artUrl),
  'Every gallery background must share the original artwork version to avoid stale images');
 assert.ok(!home.includes('<link rel="preload" as="image" type="image/svg+xml" media="(max-width: 600px)" href="'+artUrl+'">'),
   'Do not preload the decorative painting now hidden from the phone hero');
 assert.ok(home.includes('<img src="'+artUrl+'"'),'The displayed art should use the same versioned URL');
 assert.ok(!artwork.includes('<feTurbulence'),'Avoid the expensive full-image noise filter on phones');
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
 assert.match(home,/loading="lazy"(?: fetchpriority="low")? decoding="async" alt="부드러운 햇빛 아래 수련/);
});

test('patients retain key phone, navigation, SEO and degree information',()=>{
 const originalKeys=['<link rel="canonical" href="https://ejoeundental.com/">','고려대학교 의학박사','통합치의학과 전문의','인천·부평 잇몸치료','재신경치료','건강보험 적용 진료'];
 for(const item of originalKeys)assert.ok(home.includes(item),'Homepage missing '+item);
 const headlineCount=(home.match(/<h1 id="headline">/g)||[]).length;
 assert.equal(headlineCount,1);
});

test('mobile music remains opt-in without overlapping the Monet picture or care text',()=>{
 const nav=home.slice(home.indexOf('<header><nav'),home.indexOf('</nav></header>'));
 assert.ok(nav.includes('id="music-header-button"'), 'Music shortcut must be in the header');
 assert.equal((home.match(/id="music-header-button"/g)||[]).length,1);
 assert.ok(home.includes("headerMusic.addEventListener('click',function(){trigger.click()})"),
  'Header shortcut must use the same lazy-loaded music player');
 assert.match(css,/body\.home-page #music-reopen\{display:none!important\}/);
 const mobileHeaderFix=css.slice(css.indexOf('Visual QA, Galaxy mobile screenshot 2026-10-24 at 07:06'));
 assert.ok(mobileHeaderFix.includes('grid-template-columns:minmax(0,1fr) auto!important;'),
  'Header logo and music must have independent first-row columns');
 assert.ok(mobileHeaderFix.includes('position:static;top:auto;right:auto;'),
  'Music must no longer overlap the navigation via absolute positioning');
 assert.ok(mobileHeaderFix.includes('grid-column:1/-1;grid-row:2;'),
  'All five patient shortcuts must occupy their own dedicated second row');
 assert.match(css,/html\.home-scrolled body\.home-page header \.music-header-button\{display:none\}/);
 const player=readFileSync('dist/assets/music-controls.js','utf8');
 assert.ok(player.includes("getElementById('music-header-button')"));
 assert.ok(player.includes('trigger.hidden=isOpen'));
});

test('patients see actions and real treatment destinations before long homepage narrative',()=>{
 const hero=home.match(/<section class="hero wrap">([\s\S]*?)<\/section>/)?.[1]||'';
 // The opening call and clinic hours must now precede the decorative painting
 // in both DOM/focus order and the mobile reading layout.
 const sequence=['class="hero-doctor-credentials"','class="hero-actions"',
   'class="hero-local-intro"','class="hero-gallery-window"','class="hero-care-prompt"',
   'class="hero-care-summary"','id="intro"','class="hero-principles"','class="hero-visit-note"'];
 const positions=sequence.map(marker=>hero.indexOf(marker));
 assert.ok(positions.every(x=>x>=0),'Missing patient-first navigation block');
 assert.ok(positions.every((x,i)=>i===0||x>positions[i-1]),
   'Clinician credentials, phone/hours, gallery and treatment links must remain in patient-first order');
 const main=hero.slice(hero.indexOf('<nav class="hero-care-summary"'),hero.indexOf('</nav>',hero.indexOf('<nav class="hero-care-summary"')));
 for(const href of ['/gum-treatment.html','/retreatment.html','/cervical-abrasion.html','/insured-care.html'])
   assert.ok(main.includes('href="'+href+'"'),'Missing direct major care option '+href);
 assert.match(css,/body\.home-page #main-content>\.hero \.hero-actions \.hero-call,/);
 assert.match(css,/body\.home-page #main-content>\.hero \.hero-actions \.hero-symptoms\{grid-column:1\/-1\}/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.ok(galleryCss.includes('Mobile first-screen clinical action path |'),
  'The final responsive layer must carry the updated mobile patient action order');
 const finalMobileCss=galleryCss.slice(galleryCss.indexOf('Mobile first-screen clinical action path |'));
 for(const [className,order] of [['hero-call',0],['hero-hours',1],['hero-symptoms',2],['hero-map',3]]){
  const pattern=new RegExp('\\.hero-actions \\.'+className+'\\{\\s*order:'+order+';grid-column:');
  assert.match(finalMobileCss,pattern,
   'Final mobile visual order must match the semantic HTML for '+className);
 }
 const actionBlock=hero.slice(hero.indexOf('class="hero-actions"'),hero.indexOf('</div>',hero.indexOf('class="hero-actions"')));
 const expected=['hero-call','hero-hours','hero-symptoms','hero-map'].map(x=>actionBlock.indexOf(x));
 assert.ok(expected.every((x,i)=>x>=0&&(i===0||x>expected[i-1])),
   'Keyboard tab order should follow visible phone, hours, symptom, map actions');
 assert.match(finalMobileCss,/min-height:99px;max-height:125px/,
   'Mobile gallery must remain visible but avoid hiding the telephone actions');
 assert.ok(finalMobileCss.includes('@media(max-width:365px)'),
   'Narrow phones must receive their own single-column fallbacks');

});
