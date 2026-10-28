// Read-only live Cloudflare gallery verification; source and DNS are never mutated.
import {readFileSync,existsSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const origin='https://ejoeundental.com';
const hash=data=>createHash('sha256').update(data).digest('hex').slice(0,12);
const originals=[
 'assets/gallery-starry-clinic.svg',
 'assets/gallery-golden-garden.svg',
 'assets/clinic-gallery.css',
 'assets/clinic-gallery.js',
 'assets/museum-home-v2.css',
 'assets/atelier-home-2026.css',
 'assets/cubist-cat-clinic-thumb.webp',
 'assets/cubist-cat-clinic.webp',
 'assets/lakeside-flower-clinic-thumb.webp',
 'assets/lakeside-flower-clinic.webp',
 'assets/starry-night-clinic-thumb.webp',
 'assets/starry-night-clinic.webp',
 'assets/quiet-window-cat-thumb.webp',
 'assets/quiet-window-cat.webp',
 'assets/street-art-tooth-heart-thumb.webp',
 'assets/street-art-tooth-heart.webp'
];
async function get(path){
 const response=await fetch(origin+path,{
  signal:AbortSignal.timeout(14000),
  headers:{'User-Agent':'EjoeunDentalReadOnlyHealthCheck/1.0','Cache-Control':'no-cache'}
 });
 return {status:response.status,url:response.url,bytes:Buffer.from(await response.arrayBuffer())};
}
// PUBLIC DESIGN RELEASE EVIDENCE: deployed files, not just a passing source build.
// GitHub workflow may continue after a stale deployment, so show an explicit
// separate summary stating whether the latest public content was verified.
const checks=[];
const record=(label,ok,detail)=>checks.push({label,status:ok?'일치':'불일치·확인 필요',detail});
const buildHomeUrl=new URL('../dist/index.html',import.meta.url);
const expectedBuiltHome=existsSync(buildHomeUrl)?readFileSync(buildHomeUrl,'utf8'):'';
const cssLink=html=>html.match(/<link rel="stylesheet" href="(\/assets\/atelier-home-2026\.css\?v=[^"]+)"/)?.[1]||'';
let good=true;
try{
 const [home,page]=await Promise.all([get('/'),get('/gallery.html')]);
 const html=home.bytes.toString('utf8'),gallery=page.bytes.toString('utf8');
 const homepageReady=home.status===200&&/href="\/gallery(?:\.html)?"/.test(html)&&
  html.includes('id="gallery"')&&html.includes('gallery-home-artworks');
 const pageReady=page.status===200&&gallery.includes('치과 안의')&&
  gallery.includes('gallery-starry-clinic.svg')&&gallery.includes('gallery-golden-garden.svg')&&
  gallery.includes('impressionist-water-garden.svg')&&gallery.includes('ejoeundental-hero-cat.webp')&&
  gallery.includes('class="gallery-exhibition-index"')&&gallery.includes('gallery-piece-feature');
 console.log('[LIVE GALLERY] 홈페이지 링크 및 미리보기:',homepageReady?'반영':'미반영','HTTP',home.status);
 console.log('[LIVE GALLERY] 갤러리 페이지:',pageReady?'반영':'미반영','HTTP',page.status,'최종',page.url);
 good&&=homepageReady&&pageReady;
 record('정식 홈페이지·갤러리 HTTP 응답',homepageReady&&pageReady,
   '메인 '+home.status+' · 갤러리 '+page.status);
 const expectedCssLink=cssLink(expectedBuiltHome);
 const liveCssLink=cssLink(html);
 const htmlVersionOk=!!expectedCssLink&&liveCssLink===expectedCssLink;
 record('현재 CSS 버전을 가리키는 홈페이지',htmlVersionOk,
   '실사이트 '+(liveCssLink||'없음')+' / 빌드 '+(expectedCssLink||'없음'));
 good&&=htmlVersionOk;
 const heroImage=html.match(/<img\b[^>]+src="\/assets\/ejoeundental-hero-cat\.webp"[^>]*>/)?.[0]||'';
 const portraitOk=heroImage.includes('loading="eager"')&&
   heroImage.includes('fetchpriority="high"')&&
   html.includes('<link rel="preload" as="image" type="image/webp" fetchpriority="high" href="/assets/ejoeundental-hero-cat.webp">');
 record('모바일 원장·고양이 그림 우선 로딩',portraitOk,
   portraitOk?'실사이트 대표 그림 eager/high 및 preload 확인':'대표 그림 속성 또는 preload가 이전 버전');
 good&&=portraitOk;
 const mobileNavigation=html.match(/<div class="mobile-quick">([\s\S]*?)<\/div>/)?.[1]||'';
 const actualLinks=(mobileNavigation.match(/<a\b/g)||[]).length;
 const menuOk=actualLinks===5&&
  ['#symptom-navigator-title','#home-symptom-query','/stories.html','#location','tel:0325132875']
   .every(link=>mobileNavigation.includes('href="'+link+'"'));
 record('모바일 상단 환자 메뉴',menuOk,
   '실사이트 메뉴 '+actualLinks+'개 · 증상·검색·치과 이야기·오시는 길·전화 링크');
 good&&=menuOk;
 const nineIds=['art-starry','art-pond','art-golden','art-cat',
  'art-cubist-cat-clinic','art-lakeside-flower-clinic',
  'art-starry-night-clinic','art-quiet-window-cat','art-street-art-tooth-heart'];
 const idsOk=nineIds.every(id=>gallery.includes('id="'+id+'"'))&&
   nineIds.every(id=>gallery.includes('href="#'+id+'"'))&&
   (gallery.match(/<figure class="gallery-piece/g)||[]).length===9&&
   (gallery.match(/class="gallery-zoom"/g)||[]).length===9&&
   gallery.includes('id="gallery-dialog-position" aria-live="polite" aria-atomic="true">01 / 09</span>');
 record('9점 갤러리 작품·인덱스·확대창',idsOk,
   idsOk?'그림 9점·작품 이동 링크 9개·확대 버튼 9개·01/09 표시 확인':
    '실사이트 갤러리 일부가 4점 구성 또는 이전 디자인입니다.');
 good&&=idsOk;
 const thumbnailNames=['cubist-cat-clinic','lakeside-flower-clinic',
  'starry-night-clinic','quiet-window-cat','street-art-tooth-heart'];
 const linkedImagesOk=thumbnailNames.every(name=>
  gallery.includes('src="/assets/'+name+'-thumb.webp"')&&
  gallery.includes('data-image="/assets/'+name+'.webp"')&&
  gallery.includes('href="/assets/'+name+'.webp"'));
 record('신규 5점 미리보기·원본 링크',linkedImagesOk,
   linkedImagesOk?'5개 WebP 미리보기·고화질 원본 연결 확인':
    '일부 신규 그림의 미리보기·고화질 원본 링크가 없습니다.');
 good&&=linkedImagesOk;
 // Follow the exact CSS and JS query hashes written in the live document.
 // Bare unversioned URLs can be cached by Cloudflare long after a new release.
 const livePaths=originals.map(p=>{
  const name='/'+p;
  const document=(p.endsWith('museum-home-v2.css')||p.endsWith('atelier-home-2026.css'))?html:gallery;
  const attrs=[...document.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]);
  return attrs.find(a=>a.split('?')[0]===name)||name;
 });
 // All ten new WebP artwork files are byte-for-byte checked against
 // the GitHub build. A passing build alone is not evidence of Cloudflare
 // deployment, and the cards must never point to missing picture files.
 const files=await Promise.all(livePaths.map(get));
 for(let i=0;i<originals.length;i++){
  const path=originals[i];
  const expected=hash(readFileSync(new URL('../'+path,import.meta.url)));
  const actual=hash(files[i].bytes);
  const matches=files[i].status===200&&expected===actual;
  console.log('[LIVE GALLERY]',path,'browser URL',livePaths[i],'HTTP',files[i].status,
   matches?'원본 일치':'미반영 또는 내용 불일치','실제',actual,'원본',expected);
  good&&=matches;
  record('실제 내려받은 '+path,matches,
   'HTTP '+files[i].status+' · 실서버 SHA '+actual+' / GitHub SHA '+expected);
 }
 const atelierIndex=originals.indexOf('assets/atelier-home-2026.css');
 const mobileCssReady=atelierIndex>=0&&files[atelierIndex].status===200&&
  files[atelierIndex].bytes.toString('utf8').includes('Atelier edition IX · Mobile wayfinding');
 record('모바일 메뉴 고급 디자인 CSS',mobileCssReady,
   mobileCssReady?'상단 모바일 메뉴 IX 디자인 확인':'상단 모바일 메뉴 개선 버전 미확인');
 good&&=mobileCssReady;
 console.log('[LIVE GALLERY]',good?'그림 갤러리 공개 반영 확인':'갤러리의 일부가 아직 실사이트에 반영되지 않았습니다.');
 if(!good)process.exitCode=1;
}catch(error){
 const detail=error?.cause?.code||error?.message||String(error);
 console.error('[LIVE GALLERY] 실사이트 접속/배포 검증 불가:',detail);
 record('실사이트 HTTP 접근',false,detail);
 process.exitCode=1;
}
if(process.env.GITHUB_STEP_SUMMARY){
 const safe=value=>String(value).replaceAll('&','&amp;')
  .replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('|','/');
 const allCurrent=checks.length>=19&&checks.every(x=>x.status==='일치')&&good;
 const summary=[
  '## 정식 홈페이지 최신 디자인 공개 상태 (실서버 직접 비교)',
  '',
  allCurrent?'**확인됨: 실사이트에서 최신 그림·모바일 디자인을 받았습니다.**':
    '**미확인 또는 이전 버전: 소스 빌드 성공을 실제 배포 완료로 해석하지 마세요.**',
  '',
  '| 공개 검사 항목 | 결과 | 실측 정보 |',
  '|---|---|---|',
  ...checks.map(x=>'| '+safe(x.label)+' | '+safe(x.status)+' | '+safe(x.detail)+' |'),
  '',
  '> HTTP 응답과 SHA 해시를 GitHub 소스에 직접 비교합니다. 브라우저의 실제 화면 캡처, Cloudflare Pages 배포 성공 또는 네이버·구글 검색 순위까지 증명하지는 않습니다.',
  '> 이 점검은 읽기 전용이며 DNS/도메인 설정을 변경하지 않습니다.',
  ''
 ];
 appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary.join('\n')+'\n');
}
