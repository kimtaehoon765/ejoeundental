// Read-only AI discovery probe. User-Agent simulation is NOT proof of
// verified crawler IP access or of inclusion in any AI-generated answer.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const origin='https://ejoeundental.com';
const routes=[
 ['robots.txt','/robots.txt','EjoeunDentalAudit/1.0'],
 ['OpenAI public doctor','/doctor','OAI-SearchBot'],
 ['Naver public gum information','/gum-treatment','Yeti'],
 ['Google public retreatment information','/retreatment','Googlebot'],
 ['Local clinic identity and directions','/visit-guide','OAI-SearchBot'],
 ['Home verified clinical service destinations','/','Googlebot']
];
async function probe([label,path,agent]){
 const response=await fetch(origin+path,{
  redirect:'follow',signal:AbortSignal.timeout(14000),
  headers:{'User-Agent':agent,'Accept':'text/html,text/plain;q=0.9,*/*;q=0.8'}
 });
 const content=await response.text();
 return {label,status:response.status,url:response.url,content};
}
const results=await Promise.allSettled(routes.map(probe));
let verified=true;
for(let i=0;i<routes.length;i++){
 const r=results[i],label=routes[i][0];
 if(r.status!=='fulfilled'){
  verified=false;
  console.log('[AI READINESS]',label,'연결 실패',String(r.reason?.cause?.code||r.reason?.message||r.reason));
  continue;
 }
 const item=r.value;
 let good=item.status===200;
 if(label==='robots.txt')good=good&&item.content.includes('User-agent: OAI-SearchBot')&&
  item.content.includes('Sitemap: https://ejoeundental.com/sitemap.xml')&&
  item.content.includes('Disallow: /admin/');
 if(label==='OpenAI public doctor')good=good&&item.content.includes('doctor-common-questions')&&
  item.content.includes('김태훈 원장이 직접');
 if(label==='Naver public gum information'){
  good=good&&item.content.includes('gum-clinical-decisions')&&item.content.includes('스케일링만으로 충분할까요?');
  // Read back the real Cloudflare response instead of assuming a GitHub
  // commit or a shared-image URL means a preview was deployed.
  const source=readFileSync(new URL('../gum-treatment.html',import.meta.url),'utf8');
  const srcImagePath='/assets/watercolor-care-gum-20261029.webp';
  const expectedImage=origin+srcImagePath;
  const imageTagFields=[
   ['property','og:image',expectedImage],
   ['property','og:image:type','image/webp'],
   ['property','og:image:width','960'],
   ['property','og:image:height','640'],
   ['property','og:image:alt','노란 손잡이 큐렛을 그린 이조은치과 잇몸치료 수채화'],
   ['name','twitter:image',expectedImage]
  ];
  const fieldsOk=imageTagFields.every(([attr,key,value])=>{
   const tag='<meta '+attr+'="'+key+'" content="'+value+'">';
   return source.includes(tag)&&item.content.includes(tag);
  });
  let imageStatus=0,imageHashOk=false,imageError='';
  const expectedImageBytes=readFileSync(new URL('..'+srcImagePath,import.meta.url));
  for(let attempt=0;attempt<2&&!imageHashOk;attempt++){
   try{
    const picture=await fetch(expectedImage,{
     signal:AbortSignal.timeout(13000),
     headers:{'User-Agent':'EjoeunDentalReadOnlyHealthCheck/1.0','Cache-Control':'no-cache'}
    });
    imageStatus=picture.status;
    const bytes=Buffer.from(await picture.arrayBuffer());
    imageHashOk=picture.status===200&&bytes.length>1000&&
     String(picture.headers.get('content-type')||'').includes('image/webp')&&
     bytes.subarray(0,4).toString('ascii')==='RIFF'&&
     bytes.subarray(8,12).toString('ascii')==='WEBP'&&
     hash(bytes)===hash(expectedImageBytes);
    if(!imageHashOk)imageError='HTTP '+imageStatus+' / source vs live WebP SHA-256 differed';
   }catch(error){imageError=error?.cause?.code||error?.message||String(error)}
  }
  good=good&&fieldsOk&&imageHashOk;
  console.log('[GUM SHARE] 원장 직접 잇몸치료 페이지의 수채화 공유 이미지',
   fieldsOk?'SEO 메타 6개 실사이트·GitHub 소스 일치':'메타 정보 불일치',
   '| PNG 대체 없음 · 원본 WebP HTTP '+imageStatus,
   '| 실제 그림 SHA-256',imageHashOk?'일치':'불일치·확인 필요',
   imageHashOk?'':imageError);
 }
 if(label==='Google public retreatment information')good=good&&item.content.includes('retreatment-clinical-decisions')&&item.content.includes('발치가 필요한 경우는 언제인가요?');
 if(label==='Local clinic identity and directions')good=good&&item.content.includes('clinic-local-questions')&&item.content.includes('김태훈 원장')&&item.content.includes('대우프라자 305호')&&item.content.includes('격주 일정');
 if(label==='Home verified clinical service destinations'){
  try{
   const entities=[...item.content.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(m=>JSON.parse(m[1]));
   const clinic=entities.find(x=>x['@type']==='Dentist');
   const expected=['gum-treatment','root-canal-health','retreatment','cervical-abrasion','insured-care'];
   const urls=(clinic?.availableService||[]).map(x=>x.url?.replace(/\.html$/,''));
   good=good&&expected.every(slug=>urls.includes('https://ejoeundental.com/'+slug));
  }catch{good=false}
 }
 verified&&=good;
 console.log('[AI READINESS]',label,'HTTP',item.status,good?'공개 본문 점검 통과':'본문 미반영/접근 문제',item.url);
}
console.log('[AI READINESS]',verified?'공개 AI 검색 접근성 기초 점검 통과':'공개 AI 검색 접근성 점검 필요');
console.log('[AI READINESS] 이 검사는 실제 크롤러 IP, Cloudflare 봇 정책, AI 검색 인용·순위를 보증하지 않습니다.');
if(!verified)process.exitCode=1;