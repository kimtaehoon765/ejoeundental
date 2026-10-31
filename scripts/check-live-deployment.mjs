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
  const commit=meta(builtHome,'ejoeundental-build-commit');
  verdict('검증에 사용한 빌드 커밋',/^[0-9a-f]{40}$/.test(commit),
    commit||'커밋 정보 없음');
  const routes=[['홈페이지','/',builtHome],['치과 이야기','/stories',builtStories],
    ['갤러리','/gallery',builtGallery]];
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
  const liveHome=pages['/']||'';
  verdict('Cloudflare 실제 배포 커밋',
    /^[0-9a-f]{40}$/.test(commit)&&meta(liveHome,'ejoeundental-build-commit')===commit,
    '공개 '+(meta(liveHome,'ejoeundental-build-commit')||'없음')+
      ' / GitHub 빌드 '+(commit||'없음'));
  verdict('대표 원장·하얀 고양이 그림 연결',
    liveHome.includes('src="/assets/ejoeun-gallery-cat-dentist-20261029.webp"')&&
    liveHome.includes('fetchpriority="high"')&&
    builtHome.includes('src="/assets/ejoeun-gallery-cat-dentist-20261029.webp"'),
    '승인된 첫 화면 그림·우선 로딩');
  await checkAsset('승인된 원장·고양이 원본 그림',
    'assets/ejoeun-gallery-cat-dentist-20261029.webp',
    '/assets/ejoeun-gallery-cat-dentist-20261029.webp');
  const cssNames=[
    ['첫 화면 통합 CSS','home-critical-[0-9a-f]{12}\\.css'],
    ['갤러리 기본 통합 CSS','gallery-foundation-[0-9a-f]{12}\\.css'],
    ['최근 화면 개선 CSS','atelier-refinement-20261030\\.css']
  ];
  for(const [label,pattern] of cssNames){
    const match=builtHome.match(new RegExp('href="(\\/assets\\/'+pattern+'(?:\\?[^"]*)?)"'));
    const expectedUrl=match?.[1]||'';
    const liveHref=expectedUrl&&liveHome.includes('href="'+expectedUrl+'"');
    verdict(label+' HTML 연결',!!liveHref,
      '이번 빌드 '+(expectedUrl||'없음')+' / 실사이트 '+(liveHref?'동일':'다름 또는 없음'));
    if(expectedUrl)await checkAsset(label,'assets/'+expectedUrl.split('/').pop().split('?')[0],expectedUrl);
  }
  const storyImage=og(builtStories,'og:image');
  const liveStoryImage=og(pages['/stories']||'','og:image');
  verdict('치과 이야기 SNS 공유 이미지',
    storyImage===liveStoryImage&&
    storyImage.endsWith('/assets/ejoeun-gallery-cat-dentist-20261029.webp'),
    '공개 '+(liveStoryImage||'없음')+' / 이번 빌드 '+(storyImage||'없음'));
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
