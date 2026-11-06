// Read-only live content verification for the 2026-11-06 visit and clinician source recovery.
// Checks exact public main text against the GitHub-built pages, not just Cloudflare build status.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='https://ejoeundental.com';
const hash=txt=>createHash('sha256').update(txt).digest('hex').slice(0,12);
const pathFrom=path=>'../dist/'+path;
const main=html=>(String(html).match(/<main\b[^>]*>[\s\S]*?<\/main>/i)||[])[0]||'';
const cases=[
  {name:'진료 전 신분증 준비',url:'/visit-guide.html', file:'visit-guide.html',
   phrases:['id="visit-health-insurance-id"','단순히 찍어 둔 신분증 사진이나 캡처 화면','/stories/2026-11-01-original-20240603-hospital-id-verification/']},
  {name:'2026 신분증·건강보험증 상세 안내',url:'/stories/2026-11-01-original-20240603-hospital-id-verification/',file:'stories/2026-11-01-original-20240603-hospital-id-verification/index.html',
   phrases:['휴대전화로 찍어 둔 신분증 사진도 되나요?','어린이도 매번 신분증이 필요한가요?']},
  {name:'의료진 수료·학위 구분',url:'/doctor.html',file:'doctor.html',
   phrases:['id="doctor-credentials-meaning"','박사과정 수료','/stories/2026-11-01-original-20240604-credentials-degree-completion/']},
  {name:'원장 약력 환자 교육 상세 본문',url:'/stories/2026-11-01-original-20240604-credentials-degree-completion/',file:'stories/2026-11-01-original-20240604-credentials-degree-completion/index.html',
   phrases:['박사과정 수료','전문의 자격은 학위나 연수와 어떻게 다른가요?']}
];
async function fetchLive(url){
  const r=await fetch(root+url,{redirect:'follow',signal:AbortSignal.timeout(13000),
    headers:{'Cache-Control':'no-cache','User-Agent':'EjoeunDentalReadOnlyHealthCheck/2.2'}});
  return {status:r.status,html:await r.text()};
}
const results=[];
for(const item of cases){
  const built=readFileSync(new URL(pathFrom(item.file),import.meta.url),'utf8');
  const localMain=main(built);
  if(item.phrases.some(p=>!built.includes(p))||!localMain)
    throw Error('Missing expected text in built page '+item.file);
  let checked={name:item.name,ok:false,detail:''};
  try{
    const live=await fetchLive(item.url);
    const liveMain=main(live.html);
    const missing=item.phrases.filter(p=>!live.html.includes(p));
    const same=hash(liveMain)===hash(localMain)&&!!liveMain;
    checked.ok=live.status===200&&!missing.length&&same;
    checked.detail='HTTP '+live.status+' · public '+hash(liveMain)+' / built '+hash(localMain)+
      ' · missing '+(missing.join(', ')||'none');
  }catch(err){checked.detail='Request error '+String(err.cause?.code||err.message||err)}
  console.log('[CLINIC GUIDES LIVE] '+(checked.ok?'일치 ':'확인 필요 ')+checked.name+' · '+checked.detail);
  results.push(checked);
}
console.log('[CLINIC GUIDES LIVE] Result '+results.filter(x=>x.ok).length+'/'+results.length);
if(results.some(x=>!x.ok))process.exitCode=1;
