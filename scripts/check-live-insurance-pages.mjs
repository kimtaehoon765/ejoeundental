// Read-only verification for the 2026-11-06 insurance and health library update.
// Separately verifies the published Cloudflare HTML and CSS; no DNS/deployment mutations.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const origin='https://ejoeundental.com';
const local=path=>readFileSync(new URL('../dist/'+path,import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex').slice(0,12);
const mainContent=html=>(String(html).match(/<main\b[^>]*>[\s\S]*?<\/main>/i)||[])[0]||'';
const targets=[
  {
    label:'보험 건강정보 10개 항목의 확장 설명',
    path:'/insurance-health.html',
    markers:['치석 제거는 진단 목적과 급여 기준에 따라','재신경치료가 필요한 경우에도 원인과 남은 치아 구조를 먼저 평가합니다.','원장이 직접 시행하는 잇몸치료 안내','/assets/health-hub-artwork-layout-20261106.css']
  },
  {
    label:'추가 건강정보 4개 진료 선택 흐름',
    path:'/additional-health.html',
    markers:['헐겁거나 아픈 틀니를 무조건 새로 만들 필요는 없습니다.','치아에 검은색이 보인다고 모두 즉시 깎아야 하는 것은 아닙니다.','자연치아 보존 원칙','/assets/health-hub-artwork-layout-20261106.css']
  },
  {
    label:'보험틀니 세부 글의 환자교육 연결',
    path:'/health/insurance-denture.html',
    markers:['65세 이상 보험틀니: 준비·조정·관리 순서','/stories/2026-11-01-sangok-insured-denture-eligibility-aftercare/']
  },
  {
    label:'보험틀니 원장 교육 글 확장 본문',
    path:'/stories/2026-11-01-sangok-insured-denture-eligibility-aftercare/',
    localPath:'stories/2026-11-01-sangok-insured-denture-eligibility-aftercare/index.html',
    markers:['헐거운 틀니를 계속 접착제로 버텨도 될까요?','보험 적용과 실제 치료 순서는 다릅니다']
  },
  {
    label:'스케일링 할인행사 원장 글의 직접 진료 안내',
    path:'/scaling.html',
    markers:['id="scaling-event-checklist"','스케일링 할인 이벤트를 봤다면, 가격보다 먼저 확인할 점','/stories/2026-11-01-original-20240603-scaling-discount-event/','/stories/2026-11-01-original-20240603-periodontal-follow-up/']
  },
  {
    label:'건강보험 진료에서 연 1회 치석제거와 치주치료 구분',
    path:'/insured-care.html',
    markers:['id="insured-scaling-event-guidance"','올해 스케일링을 한 번 받았다','/stories/2026-11-01-original-20240603-scaling-discount-event/','/stories/2026-11-01-original-20240603-periodontal-follow-up/']
  }
];
const extraAsset={label:'건강정보 삽화 반응형 스타일 원본 일치',path:'/assets/health-hub-artwork-layout-20261106.css'};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function get(path){
  const response=await fetch(origin+path,{
    redirect:'follow',
    signal:AbortSignal.timeout(14000),
    headers:{'Cache-Control':'no-cache','User-Agent':'EjoeunDentalReadOnlyHealthCheck/2.1'}
  });
  return {status:response.status,bytes:Buffer.from(await response.arrayBuffer()),url:response.url};
}
async function checkOne(item){
  const file=item.localPath||item.path.slice(1);
  const built=local(file);
  const builtHtml=built.toString('utf8');
  const missing=(item.markers||[]).filter(s=>!builtHtml.includes(s));
  if(missing.length)throw new Error('빌드 산출물에 검사 문구가 없습니다: '+item.label+' / '+missing.join(','));
  const live=await get(item.path);
  const liveHtml=live.bytes.toString('utf8');
  const missingLive=(item.markers||[]).filter(s=>!liveHtml.includes(s));
  const builtMain=mainContent(builtHtml),liveMain=mainContent(liveHtml);
  const match=live.status===200&&
    missingLive.length===0&&
    builtMain.length>0&&liveMain.length>0&&
    hash(Buffer.from(builtMain))===hash(Buffer.from(liveMain));
  return {label:item.label,match,detail:'HTTP '+live.status+' · 본문 공개 '+hash(Buffer.from(liveMain))+
      ' / 빌드 '+hash(Buffer.from(builtMain))+' · 문구 누락 '+(missingLive.join(', ')||'없음')};
}
async function checkAsset(item){
  const expected=local(item.path.slice(1));
  const actual=await get(item.path);
  return {label:item.label,match:actual.status===200&&hash(expected)===hash(actual.bytes),
    detail:'HTTP '+actual.status+' · 공개 '+hash(actual.bytes)+' / 빌드 '+hash(expected)};
}
async function main(){
  const checks=[];
  for(let i=1;i<=7;i++){
    checks.length=0;
    const results=await Promise.allSettled([...targets.map(checkOne),checkAsset(extraAsset)]);
    for(let index=0;index<results.length;index++){
      const r=results[index];
      checks.push(r.status==='fulfilled'?r.value:{
        label:index<targets.length?targets[index].label:extraAsset.label,
        match:false,
        detail:'검사 불가: '+String(r.reason?.cause?.code||r.reason?.message||r.reason)
      });
    }
    console.log('[INSURANCE LIVE] '+i+'/7회 검사 · '+checks.filter(x=>x.match).length+'/'+checks.length+' 항목 일치');
    if(checks.every(x=>x.match))break;
    if(i<7)await sleep(8000);
  }
  for(const item of checks)console.log('[INSURANCE LIVE] '+(item.match?'일치 ':'미확인 ')+item.label+' · '+item.detail);
  if(!checks.every(x=>x.match)){
    console.error('[INSURANCE LIVE] 일부 새 내용이 정식 도메인에서 확인되지 않았습니다. 위 상세 기록과 Cloudflare 캐시·배포 상태를 구분해 확인하세요.');
    process.exitCode=1;
  }else{
    console.log('[INSURANCE LIVE] 새 보험 건강정보 10개 항목·추가 건강정보 4개 주제·보험틀니 글·창작 그림 CSS의 공개 내용이 빌드와 일치합니다.');
  }
}
await main();
