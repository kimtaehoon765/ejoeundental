// Read-only Cloudflare release audit: compare the actual public response
// with THIS workflow's built HTML and immutable static assets. A green
// source build does not prove that Cloudflare has served the same revision.
// No external mutation, indexing claim, fake crawler certification or deploy.
import {readFileSync,existsSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const origin='https://ejoeundental.com';
const assetRoot=new URL('../dist/',import.meta.url);
const local=path=>readFileSync(new URL(path,assetRoot));
const digest=buffer=>createHash('sha256').update(buffer).digest('hex').slice(0,12);
const log=[];
function verdict(label,ok,note=''){
  log.push({label,ok,note});
  console.log('[LIVE RELEASE]',ok?'일치':'미반영·확인 필요',label,note);
}
async function get(path){
  const response=await fetch(origin+path,{
    redirect:'follow',signal:AbortSignal.timeout(15000),
    headers:{'User-Agent':'EjoeunDentalReadOnlyHealthCheck/2.0',
     'Cache-Control':'no-cache','Accept':'text/html,*/*;q=0.8'}
  });
  return {status:response.status,url:response.url,
    bytes:Buffer.from(await response.arrayBuffer())};
}
const meta=(html,name)=>html.match(
 new RegExp('<meta name="'+name+'" content="([^"]+)"')
)?.[1]||'';
const og=(html,name)=>html.match(
 new RegExp('<meta property="'+name+'" content="([^"]+)"')
)?.[1]||'';
const sheet=(html,name)=>{
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return html.match(new RegExp('href="(\\/assets\\/'+escaped+'(?:\\?[^"]*)?)"'))?.[1]||'';
};
async function checkAsset(label,filename,livePath){
  if(!existsSync(new URL(filename,assetRoot))){
    verdict(label,false,'빌드 결과에 원본 없음: '+filename);return;
  }
  try{
    const expected=local(filename),actual=await get(livePath);
    const ok=actual.status===200&&digest(actual.bytes)===digest(expected);
    verdict(label,ok,'HTTP '+actual.status+
      ' · 공개 '+digest(actual.bytes)+' / 이번 빌드 '+digest(expected));
  }catch(e){verdict(label,false,'접속 실패: '+String(e.cause?.code||e.message||e))}
}
async function main(){
  const builtHome=local('index.html').toString('utf8');
  const builtStories=local('stories.html').toString('utf8');
  const builtGallery=local('gallery.html').toString('utf8');
  const builtDoctor=local('doctor.html').toString('utf8');
  const builtPreservation=local('tooth-preservation.html').toString('utf8');
  const builtSearch=local('search.html').toString('utf8');
  const commit=meta(builtHome,'ejoeundental-build-commit');
  verdict('검증에 사용한 빌드 커밋',/^[0-9a-f]{40}$/.test(commit),
    commit||'커밋 정보 없음');
  const routes=[['홈페이지','/',builtHome],['치과 이야기','/stories',builtStories],
    ['갤러리','/gallery',builtGallery],['통합 검색','/search',builtSearch],
    ['의료진 소개','/doctor',builtDoctor],
    ['자연치아 보존','/tooth-preservation',builtPreservation]];
  // Cloudflare Pages publishes after the GitHub push; a healthy build may
  // briefly serve the preceding commit. Retry only the deployment marker,
  // using no-cache read-only homepage requests, before auditing 46 assets.
  // Keep this bounded: it does not deploy, mutate DNS or mask a stale release.
  const maxReleaseProbes=7;
  const releaseProbeGapMs=8000;
  let releaseProbes=0,releaseSeen='없음',releaseStatus=0;
  if(/^[0-9a-f]{40}$/.test(commit)){
    for(let attempt=1;attempt<=maxReleaseProbes;attempt++){
      releaseProbes=attempt;
      try{
        const response=await get('/');
        releaseStatus=response.status;
        releaseSeen=meta(response.bytes.toString('utf8'),'ejoeundental-build-commit')||'없음';
        if(response.status===200&&releaseSeen===commit)break;
      }catch(error){
        releaseSeen='접속 실패: '+String(error.cause?.code||error.message||error);
      }
      if(attempt<maxReleaseProbes){
        await new Promise(resolve=>setTimeout(resolve,releaseProbeGapMs));
      }
    }
  }
  console.log('[LIVE RELEASE] Cloudflare 커밋 배포 대기 확인:',
    releaseProbes+'/'+maxReleaseProbes,'회 · HTTP',releaseStatus,
    '· 공개',releaseSeen,'· 빌드',commit);
  const pages={};
  await Promise.all(routes.map(async([label,path,expected])=>{
    try{
      const response=await get(path);
      pages[path]=response.bytes.toString('utf8');
      const canonical=expected.match(/<link rel="canonical" href="([^"]+)"/)?.[1]||'';
      const current=pages[path].match(/<link rel="canonical" href="([^"]+)"/)?.[1]||'';
      verdict(label+' 공개 페이지',response.status===200&&canonical===current,
        'HTTP '+response.status+' · 대표주소 '+(current||'없음'));
    }catch(e){
      pages[path]='';
      verdict(label+' 공개 페이지',false,'연결 실패: '+String(e.cause?.code||e.message||e));
    }
  }));
  // Patient-education reconstruction (November 2026): verify the actual
  // Cloudflare HTML, not just GitHub file presence or sitemap entries.
  const newMedicalRoutes=[
    ['고혈압','/hypertension-dental-care.html'],
    ['천식·알레르기','/asthma-allergy-dental-care.html'],
    ['류마티스·스테로이드','/steroid-rheumatic-dental-care.html'],
    ['뇌전증·실신','/epilepsy-syncope-dental-care.html']
  ];
  const safetyHubPath='/medical-safety-guide.html';
  let liveSafetyHub='';
  try{
    const expected=local(safetyHubPath.slice(1));
    const delivered=await get(safetyHubPath);
    liveSafetyHub=delivered.bytes.toString('utf8');
    verdict('전신질환 통합 환자안내 실사이트',
      delivered.status===200&&digest(delivered.bytes)===digest(expected),
      'HTTP '+delivered.status+' · 공개 '+digest(delivered.bytes)+
      ' / 이번 빌드 '+digest(expected));
  }catch(e){
    verdict('전신질환 통합 환자안내 실사이트',false,
      '연결 실패: '+String(e.cause?.code||e.message||e));
  }
  verdict('전신질환 안내 4개 새 주제 링크·표시',
    newMedicalRoutes.every(([,url])=>
      liveSafetyHub.includes('href="'+url+'"')&&
      local(safetyHubPath.slice(1)).toString('utf8').includes('href="'+url+'"')),
    '고혈압·천식/알레르기·스테로이드·뇌전증 안내');
  for(const [name,route] of newMedicalRoutes){
    try{
      const expected=local(route.slice(1));
      const actual=await get(route);
      const html=actual.bytes.toString('utf8');
      const canonical=origin+route;
      verdict('새 환자안내 공개: '+name,
        actual.status===200&&digest(actual.bytes)===digest(expected)&&
        html.includes('<link rel="canonical" href="'+canonical+'">')&&
        !/<meta name="robots" content="[^"]*noindex/i.test(html),
        'HTTP '+actual.status+' · 공개 '+digest(actual.bytes)+
        ' / 이번 빌드 '+digest(expected));
    }catch(e){
      verdict('새 환자안내 공개: '+name,false,
        '연결 실패: '+String(e.cause?.code||e.message||e));
    }
  }
  const threePatientPaintings=[
    ['혈액희석제 원본 그림','ejoeun-antithrombotic-balance-stilllife-20261029.svg'],
    ['골다공증약 원본 그림','ejoeun-osteoporosis-medication-clock-study-20261029.svg'],
    ['당뇨병 원본 그림','ejoeun-diabetes-oral-health-garden-20261029.svg']
  ];
  verdict('환자안내 그림 3점 페이지 연결',
    threePatientPaintings.every(([,file])=>
      liveSafetyHub.includes('src="/assets/'+file+'"')),
    '복제 사진 대신 치과 자체 원본 회화와 환자 안내 연결');
  for(const [name,file] of threePatientPaintings){
    await checkAsset(name,'assets/'+file,'/assets/'+file);
  }
  const liveHome=pages['/']||'';
  verdict('Cloudflare 실제 배포 커밋',
    /^[0-9a-f]{40}$/.test(commit)&&meta(liveHome,'ejoeundental-build-commit')===commit,
    '공개 '+(meta(liveHome,'ejoeundental-build-commit')||'없음')+
      ' / GitHub 빌드 '+(commit||'없음'));
  // A retired, public noindex draft must never leave patients reading stale
  // retreatment advice. Cloudflare Pages must redirect both historical routes,
  // while leaving the canonical clinical route itself untouched.
  const legacyDraftRoutes=['/retreatment_updated.html','/retreatment_updated'];
  const oldRouteStatuses=await Promise.all(legacyDraftRoutes.map(async oldPath=>{
    try{
      const response=await fetch(origin+oldPath,{
        redirect:'manual',signal:AbortSignal.timeout(15000),
        headers:{'User-Agent':'EjoeunDentalReadOnlyHealthCheck/2.0',
          'Cache-Control':'no-cache'}
      });
      const location=response.headers.get('location')||'';
      return {oldPath,status:response.status,
        destination:location?new URL(location,origin).href:''};
    }catch(error){return {oldPath,status:0,destination:'',
      error:String(error.cause?.code||error.message||error)};}
  }));
  verdict('기존 재신경치료 중복 주소 301 정식 페이지 이동',
    oldRouteStatuses.every(x=>x.status===301&&
      x.destination===origin+'/retreatment'),
    oldRouteStatuses.map(x=>x.oldPath+' HTTP '+x.status+
      ' → '+(x.destination||x.error||'Location 없음')).join(' · '));
  // Verify the real patient search page after Cloudflare finishes deploying.
  // The previous build checks ran before Cloudflare's deployment completion,
  // so source CI success was sometimes mistaken for live search availability.
  const liveSearch=pages['/search']||'';
  const searchHasPatientWorkflow=html=>{
    const form=html.match(/<form class="search-form"[\s\S]*?<\/form>/)?.[0]||'';
    return form.includes('action="/search.html" method="get"')&&
      form.includes('id="q" name="q" type="search"')&&
      html.includes('id="status" role="status"')&&
      html.includes('id="results" aria-label="홈페이지 검색 결과"')&&
      html.indexOf('class="search-primary"')<html.indexOf('class="search-reading-routes"')&&
      html.includes('<meta name="robots" content="noindex,follow">');
  };
  verdict('통합 검색 입력·결과와 안내 순서',
    searchHasPatientWorkflow(builtSearch)&&searchHasPatientWorkflow(liveSearch),
    'GET 검색 · 상태 메시지 · 결과 우선 표시 · 검색 결과 색인 제외');
  for(const [label,filename,attr] of [
    ['통합 검색 결과 CSS','search-page.css','href'],
    ['통합 검색 프로그램','search.js','src']
  ]){
    const quoted=filename.replace(/\./g,'\\.');
    const pattern=new RegExp(attr+'="(\\/assets\\/'+quoted+'\\?v=[0-9a-f]{12})"');
    const expected=builtSearch.match(pattern)?.[1]||'';
    const delivered=liveSearch.match(pattern)?.[1]||'';
    verdict(label+' HTML 버전 연결',Boolean(expected)&&expected===delivered,
      '이번 빌드 '+(expected||'없음')+' / 실사이트 '+(delivered||'없음'));
    if(expected){
      await checkAsset(label,'assets/'+filename,expected);
    }
  }
  const dock=html=>html.match(/<nav class="mobile-booking-actions"[^>]*>[\s\S]*?<\/nav>/)?.[0]||'';
  const liveDock=dock(liveHome),builtDock=dock(builtHome);
  verdict('모바일 전화·네이버 예약·오시는 길 버튼',
    Boolean(builtDock)&&builtDock===liveDock&&
    (liveDock.match(/<a\b/g)||[]).length===3&&
    liveDock.includes('class="mobile-booking-call"')&&
    liveDock.includes('class="mobile-booking-naver"')&&
    liveDock.includes('class="mobile-booking-visit"'),
    '빌드와 실제 응답의 3개 전화·예약·방문 버튼 완전 일치');
  const searchTap='searchShortcut.addEventListener(\'click\',function()';
  verdict('모바일 검색 바로가기 입력 포커스',
    builtHome.includes(searchTap)&&liveHome.includes(searchTap)&&
    builtHome.includes('href="#home-symptom-query"')&&
    liveHome.includes('href="#home-symptom-query"'),
    '검색을 눌렀을 때만 입력창 포커스 · 원래 링크 보존');
  verdict('대표 원장·하얀 고양이 그림 연결',
    liveHome.includes('src="/assets/ejoeun-gallery-cat-dentist-20261029.webp"')&&
    liveHome.includes('fetchpriority="high"')&&
    builtHome.includes('src="/assets/ejoeun-gallery-cat-dentist-20261029.webp"'),
    '승인된 첫 화면 그림·우선 로딩');
  // Match the current responsive hero image AND preload across source build
  // and live Cloudflare HTML. Keep checking all original byte-identical assets.
  // Do not hardcode the obsolete 480/720-only srcset: 640w was added later.
  const portraitBase='/assets/ejoeun-gallery-cat-dentist-20261029';
  const attr=(tag,key)=>tag.match(new RegExp('(?:^|\\s)'+key+'="([^"]+)"'))?.[1]||'';
  const tagFor=(html,element,matching)=>[...html.matchAll(
    new RegExp('<'+element+'\\b[^>]*>','g'))].map(m=>m[0]).find(matching)||'';
  const portraitImage=html=>tagFor(html,'img',tag=>attr(tag,'src')===portraitBase+'.webp');
  const portraitPreload=html=>tagFor(html,'link',tag=>
    attr(tag,'rel')==='preload'&&attr(tag,'as')==='image'&&
    attr(tag,'href')===portraitBase+'.webp');
  const builtPortrait=portraitImage(builtHome),livePortrait=portraitImage(liveHome);
  const builtPortraitPreload=portraitPreload(builtHome);
  const livePortraitPreload=portraitPreload(liveHome);
  const srcset=attr(builtPortrait,'srcset'),sizes=attr(builtPortrait,'sizes');
  const widths=[480,640,720,1200];
  const correctWidths=widths.every(width=>srcset.includes(
    (width===1200?portraitBase:portraitBase+'-'+width)+'.webp '+width+'w'));
  const preloadMatches=Boolean(srcset&&sizes)&&
    attr(builtPortraitPreload,'imagesrcset')===srcset&&
    attr(builtPortraitPreload,'imagesizes')===sizes&&
    attr(livePortraitPreload,'imagesrcset')===srcset&&
    attr(livePortraitPreload,'imagesizes')===sizes;
  verdict('모바일 원장·고양이 원본 축소본 선택·미리 불러오기',
    correctWidths&&preloadMatches&&builtPortrait===livePortrait&&
    builtPortraitPreload===livePortraitPreload&&
    attr(livePortrait,'loading')==='eager'&&attr(livePortrait,'fetchpriority')==='high'&&
    attr(livePortraitPreload,'fetchpriority')==='high',
    '480w·640w·720w·1200w 실제 srcset / preload 동일 / Cloudflare 원본 검증');
  for(const width of [480,640,720]){
    const relative='assets/ejoeun-gallery-cat-dentist-20261029-'+width+'.webp';
    await checkAsset('원본 작품 '+width+'px 모바일 축소본',relative,'/'+relative);
  }
  await checkAsset('승인된 원장·고양이 원본 그림',
    'assets/ejoeun-gallery-cat-dentist-20261029.webp',
    '/assets/ejoeun-gallery-cat-dentist-20261029.webp');
  const cssNames=[
    ['첫 화면 통합 CSS','home-critical-[0-9a-f]{12}\\.css'],
    ['갤러리 기본 통합 CSS','gallery-foundation-[0-9a-f]{12}\\.css'],
    ['전시관 3종 통합 CSS','exhibition-foundation-[0-9a-f]{12}\\.css'],
    ['최근 화면 개선 CSS','atelier-refinement-20261030\\.css'],
    ['미술관 마감 통합 CSS','home-finishing-[0-9a-f]{12}\\.css'],
    ['통일된 첫 화면 디자인 CSS','home-design-unification-20261103\\.css']
  ];
  for(const [label,pattern] of cssNames){
    const match=builtHome.match(new RegExp('href="(\\/assets\\/'+pattern+'(?:\\?[^"]*)?)"'));
    const expectedUrl=match?.[1]||'';
    const liveHref=expectedUrl&&liveHome.includes('href="'+expectedUrl+'"');
    verdict(label+' HTML 연결',!!liveHref,
      '이번 빌드 '+(expectedUrl||'없음')+' / 실사이트 '+(liveHref?'동일':'다름 또는 없음'));
    if(expectedUrl)await checkAsset(label,'assets/'+expectedUrl.split('/').pop().split('?')[0],expectedUrl);
  }
  // CSS bundling now keeps an additional deferred FAQ/visit stylesheet,
  // its noscript fallback and a separately cached FAQ link stylesheet.
  // Compare the exact ordered build links against the public Cloudflare HTML,
  // while retaining the expected bundle/fallback structure as a guard.
  const cssHrefs=html=>[...html.matchAll(/<link rel="stylesheet" href="(\/assets\/[^"]+)"/g)]
    .map(match=>match[1]);
  const builtCss=cssHrefs(builtHome),liveCss=cssHrefs(liveHome);
  const expectedOrder=['/assets/home-critical-','/assets/gallery-foundation-',
    '/assets/exhibition-foundation-','/assets/home-art-direction-20261030.css',
    '/assets/atelier-refinement-20261030.css','/assets/home-finishing-',
    '/assets/home-faq-visit-','/assets/home-faq-visit-',
    '/assets/home-design-unification-20261103.css',
    '/assets/faq-deep-links.css'];
  const orderOk=builtCss.length===expectedOrder.length&&
    expectedOrder.every((prefix,i)=>builtCss[i]?.startsWith(prefix));
  const fallbackOk=builtCss[6]===builtCss[7]&&
    builtHome.includes('<noscript><link rel="stylesheet" href="'+builtCss[7]+'"></noscript>')&&
    liveHome.includes('<noscript><link rel="stylesheet" href="'+liveCss[7]+'"></noscript>')&&
    builtHome.includes('href="'+builtCss[6]+'" media="print" onload=')&&
    liveHome.includes('href="'+liveCss[6]+'" media="print" onload=');
  verdict('메인 CSS 요청 절감·파일 순서 검증',
    orderOk&&fallbackOk&&builtCss.length===liveCss.length&&
    builtCss.every((href,i)=>href===liveCss[i]),
    '공개 '+liveCss.length+'개 / 이번 빌드 '+builtCss.length+
    '개 · 통합 CSS·지연 FAQ 스타일·noscript·원본 순서 확인');

  const storyImage=og(builtStories,'og:image');
  const liveStoryImage=og(pages['/stories']||'','og:image');
  verdict('치과 이야기 SNS 공유 이미지',
    storyImage===liveStoryImage&&
    storyImage.endsWith('/assets/ejoeun-gallery-cat-dentist-20261029.webp'),
    '공개 '+(liveStoryImage||'없음')+' / 이번 빌드 '+(storyImage||'없음'));
  // First-viewport artwork: compare the real picture and its complete preload
  // against the deployed release. Galleries can use responsive imagesrcset;
  // the clinician's SVG remains a single lightweight original.
  const firstArt=[
    ['의료진 소개','/doctor',builtDoctor,'ejoeun-doctor-since2003-garden-20261029.svg','image/svg+xml'],
    ['갤러리','/gallery',builtGallery,'ejoeun-original-wisdom-consult-20261029.webp','image/webp']
  ];
  for(const [label,route,expected,filename,type] of firstArt){
    const actual=pages[route]||'';
    const rel='/assets/'+filename;
    const figure=html=>tagFor(html,'img',tag=>attr(tag,'src')===rel);
    const preload=html=>tagFor(html,'link',tag=>
      attr(tag,'rel')==='preload'&&attr(tag,'href')===rel&&attr(tag,'as')==='image');
    const currentFigure=figure(actual),builtFigure=figure(expected);
    const currentPreload=preload(actual),builtPreload=preload(expected);
    const sourceSet=attr(builtFigure,'srcset'),sourceSizes=attr(builtFigure,'sizes');
    const responsiveAligned=sourceSet?Boolean(sourceSizes)&&
      attr(builtPreload,'imagesrcset')===sourceSet&&
      attr(builtPreload,'imagesizes')===sourceSizes&&
      attr(currentPreload,'imagesrcset')===sourceSet&&
      attr(currentPreload,'imagesizes')===sourceSizes:
      !attr(builtPreload,'imagesrcset')&&!attr(currentPreload,'imagesrcset');
    const imageOk=Boolean(currentFigure&&currentPreload)&&
      currentFigure===builtFigure&&currentPreload===builtPreload&&
      attr(currentFigure,'loading')==='eager'&&
      attr(currentFigure,'fetchpriority')==='high'&&
      attr(currentFigure,'decoding')==='async'&&
      /width="\d+" height="\d+"/.test(currentFigure)&&
      Boolean(attr(currentFigure,'alt'));
    const preloadOk=attr(currentPreload,'type')===type&&
      attr(currentPreload,'fetchpriority')==='high'&&responsiveAligned;
    verdict(label+' 첫 그림 우선 로딩·미리 불러오기',
      imageOk&&preloadOk,
      imageOk&&preloadOk?
        '고우선순위 원본·가로세로·preload·모바일 srcset 실제 배포 일치':
        '그림 원본·로딩 우선순위 또는 반응형 preload 불일치');
  }
  await checkAsset('의료진 소개 첫 그림 원본',
    'assets/ejoeun-doctor-since2003-garden-20261029.svg',
    '/assets/ejoeun-doctor-since2003-garden-20261029.svg');
  // Compare the page-specific social card each visitor and messenger sees
  // against the same built release. No duplicate artwork is added to the page.
  const socialCases=[
    ['홈페이지','/',builtHome,'ejoeun-gallery-cat-dentist-20261029.webp'],
    ['갤러리','/gallery',builtGallery,'ejoeun-original-wisdom-consult-20261029.webp'],
    ['의료진 소개','/doctor',builtDoctor,'ejoeun-gallery-cat-dentist-20261029.webp'],
    ['자연치아 보존','/tooth-preservation',builtPreservation,
      'ejoeun-tooth-preservation-garden-cat-20261029.webp']
  ];
  for(const [label,route,expected,image] of socialCases){
    const live=pages[route]||'';
    const props=[['property','og:image'],['property','og:image:type'],
      ['property','og:image:width'],['property','og:image:height'],
      ['property','og:image:alt'],['name','twitter:card'],
      ['name','twitter:image'],['name','twitter:image:alt']];
    const tag=(html,kind,key)=>html.match(new RegExp(
      '<meta '+kind+'="'+key+'" content="([^"]+)"'
    ))?.[1]||'';
    const complete=props.every(([kind,key])=>{
      const builtValue=tag(expected,kind,key);
      return Boolean(builtValue)&&builtValue===tag(live,kind,key);
    });
    const imageUrl=origin+'/assets/'+image;
    const right=complete&&tag(live,'property','og:image')===imageUrl&&
      tag(live,'name','twitter:image')===imageUrl;
    verdict(label+' SNS 미리보기 원본·설명',
      right,right?'OG·Twitter 그림 8개 필드 공개·빌드 일치':
      '대표 그림 '+(tag(live,'property','og:image')||'없음')+
      ' · 이 빌드 '+imageUrl);
  }
  await checkAsset('갤러리 공유 원본 그림',
    'assets/ejoeun-original-wisdom-consult-20261029.webp',
    '/assets/ejoeun-original-wisdom-consult-20261029.webp');
  await checkAsset('자연치아 보존 공유 원본 그림',
    'assets/ejoeun-tooth-preservation-garden-cat-20261029.webp',
    '/assets/ejoeun-tooth-preservation-garden-cat-20261029.webp');
  const count=html=>(html.match(/class="gallery-zoom"/g)||[]).length;
  const builtGalleryCount=count(builtGallery),publicGalleryCount=count(pages['/gallery']||'');
  verdict('갤러리 전시 23점·확대 버튼',
    builtGalleryCount===23&&publicGalleryCount===23,
    '공개 '+publicGalleryCount+'점 / 이번 빌드 '+builtGalleryCount+'점');
  for(const [label,filename] of [
    ['갤러리 첫 작품','assets/gallery-starry-clinic.svg'],
    ['갤러리 원본 치과 수채화','assets/watercolor-care-gum-20261029.webp']]){
    await checkAsset(label,filename,'/'+filename);
  }
  const passes=log.filter(item=>item.ok).length;
  console.log('[LIVE RELEASE] 검증 결과:',passes+'/'+log.length,
    '· 최신 배포가 아니면 Cloudflare Pages 배포 상태와 캐시 확인 필요');
  if(process.env.GITHUB_STEP_SUMMARY){
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      '\n### 정식 홈페이지 실제 배포 일치 검사\n'+
      '빌드 성공과 공개 배포 완료는 별개의 상태입니다.\n\n'+
      log.map(item=>(item.ok?'✅':'⚠️')+' '+item.label+' — '+item.note).join('\n\n')+'\n');
  }
  if(passes!==log.length)process.exitCode=1;
}
await main().catch(error=>{
  console.error('[LIVE RELEASE] 점검 자체가 실패했습니다:',error.stack||String(error));
  process.exitCode=1;
});
