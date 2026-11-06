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
  ,{name:'치과의사 교육 경로·학위·전문의 상세 안내',
    url:'/stories/2026-11-01-original-20240604-credentials-dental-school/',
    file:'stories/2026-11-01-original-20240604-credentials-dental-school/index.html',
    phrases:['치과대학 졸업’과 ‘치의학전문대학원 졸업','환자 입장에서 약력을 확인하는 다섯 가지 질문']
  },
  {name:'대학 부설 연수과정과 학위의 구분',
    url:'/stories/2026-11-01-original-20240604-credentials-training-course/',
    file:'stories/2026-11-01-original-20240604-credentials-training-course/index.html',
    phrases:['연수를 받은 사실 자체는 의미가 없나요?','치과 소개의 교육 이력을 볼 때 확인할 네 가지']
  },
  {name:'재신경치료 페이지 내 한 치아 변색 감별 안내',
    url:'/retreatment.html',file:'retreatment.html',
    phrases:['id="retreatment-discoloration-guide"','색의 변화만으로 근관이 다시 감염됐거나 재신경치료가 필요하다고 단정할 수는 없습니다.','/stories/2026-11-01-original-20240608-tooth-discoloration/']
  },
  {name:'신경치료 건강정보에서 어두운 치아 검사 안내',
    url:'/root-canal-health.html',file:'root-canal-health.html',
    phrases:['id="root-one-dark-tooth"','앞니 한 개만 어둡게 변했다면 신경치료가 필요한가요?','/stories/2026-11-01-original-20240608-tooth-discoloration/']
  },
  {name:'충치치료 페이지에서 레진 원장 글 연결',
    url:'/cavity-treatment.html',file:'cavity-treatment.html',
    phrases:['id="cavity-resin-original-guide"','레진을 선택하기 전에는 치아 상태를 먼저 구분합니다.','/stories/2026-11-01-cheongcheon-resin-filling-treatment/']
  },
  {name:'원장 치아 변색 상세 글',
    url:'/stories/2026-11-01-original-20240608-tooth-discoloration/',
    file:'stories/2026-11-01-original-20240608-tooth-discoloration/index.html',
    phrases:['치아 한 개만 회색이나 갈색으로 변했다면 무엇을 검사하나요?','누런 부분이 충치인지 단순 착색인지 어떻게 구별하나요?']
  },
  {name:'원장 레진 수복 상세 글',
    url:'/stories/2026-11-01-cheongcheon-resin-filling-treatment/',
    file:'stories/2026-11-01-cheongcheon-resin-filling-treatment/index.html',
    phrases:['접착과 수분 관리가 중요합니다','작은 충치라고 무조건 바로 치료해야 하나요?']
  }
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
