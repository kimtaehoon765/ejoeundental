// Read-only AI discovery probe. User-Agent simulation is NOT proof of
// verified crawler IP access or of inclusion in any AI-generated answer.
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
 if(label==='Naver public gum information')good=good&&item.content.includes('gum-clinical-decisions')&&item.content.includes('스케일링만으로 충분할까요?');
 if(label==='Google public retreatment information')good=good&&item.content.includes('retreatment-clinical-decisions')&&item.content.includes('발치가 필요한 경우는 언제인가요?');
 if(label==='Local clinic identity and directions')good=good&&item.content.includes('clinic-local-questions')&&item.content.includes('김태훈 원장')&&item.content.includes('대우프라자 305호')&&item.content.includes('격주 일정');
 if(label==='Home verified clinical service destinations'){
  try{
   const entities=[...item.content.matchAll(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/g)]
    .map(m=>JSON.parse(m[1]));
   const clinic=entities.find(x=>x['@type']==='Dentist');
   const expected=['gum-treatment','root-canal-health','retreatment','cervical-abrasion','insured-care'];
   const urls=(clinic?.availableService||[]).map(x=>x.url?.replace(/\\.html$/,''));
   good=good&&expected.every(slug=>urls.includes('https://ejoeundental.com/'+slug));
  }catch{good=false}
 }
 verified&&=good;
 console.log('[AI READINESS]',label,'HTTP',item.status,good?'공개 본문 점검 통과':'본문 미반영/접근 문제',item.url);
}
console.log('[AI READINESS]',verified?'공개 AI 검색 접근성 기초 점검 통과':'공개 AI 검색 접근성 점검 필요');
console.log('[AI READINESS] 이 검사는 실제 크롤러 IP, Cloudflare 봇 정책, AI 검색 인용·순위를 보증하지 않습니다.');
if(!verified)process.exitCode=1;