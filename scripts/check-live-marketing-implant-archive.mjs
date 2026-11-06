// Read-only: compare live dental education publication against this build.
// Intentionally no writes, DNS changes, or search indexing claims.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const origin='https://ejoeundental.com';
const local=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const hash=content=>createHash('sha256').update(content).digest('hex').slice(0,12);
const extractMain=html=>(html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)||[])[0]||'';
const targets=[
  {
    label:'치과 블로그 글 수와 진료정보 판단',
    path:'/stories/2026-11-01-original-20240603-blog-post-count-marketing/',
    file:'stories/2026-11-01-original-20240603-blog-post-count-marketing/index.html',
    phrases:['환자에게 유익한 치과 글에는 어떤 내용이 있나요?','초진 상담 때 글의 내용과 실제 진료를 어떻게 비교하나요?']
  },
  {
    label:'임플란트 광고와 발치 전 선택 기준',
    path:'/stories/2026-11-01-original-20240606-implant-advertising/',
    file:'stories/2026-11-01-original-20240606-implant-advertising/index.html',
    phrases:['뼈이식과 발치 당일 식립이 언제나 필요할까요?','광고보다 진찰실에서 확인할 다섯 가지 질문']
  },
  {
    label:'의료진 소개에서 블로그 내용 선택법',
    path:'/doctor.html',
    file:'doctor.html',
    phrases:['블로그 글을 읽을 때에도 같은 기준이 도움이 됩니다.','/stories/2026-11-01-original-20240603-blog-post-count-marketing/']
  },
  {
    label:'임플란트 진료에서 광고와 실제 계획 구분',
    path:'/implant.html',
    file:'implant.html',
    phrases:['광고의 수술 방식과 실제 진료 계획은 구분해서 살펴보세요.','/stories/2026-11-01-original-20240606-implant-advertising/']
  }
];
async function publicPage(path){
  const res=await fetch(origin+path,{
    redirect:'follow',signal:AbortSignal.timeout(15000),
    headers:{'Cache-Control':'no-cache','User-Agent':'EjoeunDentalReadOnlyHealthCheck/2.3'}
  });
  return {status:res.status,body:await res.text()};
}
async function check(target){
  const built=local(target.file);
  const missingBuilt=target.phrases.filter(s=>!built.includes(s));
  if(missingBuilt.length)throw Error('Source build missing expected text for '+target.label+': '+missingBuilt.join(', '));
  const live=await publicPage(target.path);
  const missingLive=target.phrases.filter(s=>!live.body.includes(s));
  const builtMain=extractMain(built);
  const liveMain=extractMain(live.body);
  return {
    label:target.label,
    match:live.status===200 && !missingLive.length && !!liveMain && hash(liveMain)===hash(builtMain),
    detail:'HTTP '+live.status+' · public '+hash(liveMain)+' / build '+hash(builtMain)+
      ' · missing '+(missingLive.join(', ')||'none')
  };
}
const results=[];
for(const target of targets){
  try{results.push(await check(target));}
  catch(error){
    results.push({label:target.label,match:false,detail:'검사 불가: '+String(error.cause?.code||error.message||error)});
  }
}
for(const r of results)console.log('[ARCHIVE CONTENT LIVE] '+(r.match?'일치':'확인 필요')+' · '+r.label+' · '+r.detail);
console.log('[ARCHIVE CONTENT LIVE] Result '+results.filter(r=>r.match).length+'/'+results.length);
if(results.some(r=>!r.match))process.exitCode=1;
