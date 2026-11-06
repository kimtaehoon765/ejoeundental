// Read-only exact public HTML audit for oral dryness and burning-mouth education.
// Report public deployment separately from source commit and build success.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const root='https://ejoeundental.com';
const main=html=>(String(html).match(/<main\b[^>]*>[\s\S]*?<\/main>/i)||[])[0]||'';
const digest=text=>createHash('sha256').update(text).digest('hex').slice(0,12);
const targets=[
  {
    name:'입마름과 타액분비저하 원장 상세 글',
    url:'/stories/2026-11-01-sangok-dry-mouth-xerostomia-care/',
    local:'stories/2026-11-01-sangok-dry-mouth-xerostomia-care/index.html',
    phrases:['입마름은 나이가 들면 모두 생기는 걸까요?','치과에서는 무엇을 확인하나요?','충치 예방은 어떻게 달라지나요?']
  },
  {
    name:'혀 화끈거림과 구강작열감 감별 상세 글',
    url:'/stories/2026-11-01-cheongcheon-burning-mouth-syndrome/',
    local:'stories/2026-11-01-cheongcheon-burning-mouth-syndrome/index.html',
    phrases:['입안이 정상처럼 보이면 검사가 필요 없나요?','입마름과 구강작열감은 같은 병인가요?','약이나 가글로 치료할 수 있나요?']
  },
  {
    name:'건강정보의 입마름·작열감 본문 연결',
    url:'/additional-health.html',
    local:'additional-health.html',
    phrases:['id="oral-dryness-burning-guidance"','/stories/2026-11-01-sangok-dry-mouth-xerostomia-care/','/stories/2026-11-01-cheongcheon-burning-mouth-syndrome/']
  },
  {
    name:'진료 전 복용약 확인의 구강건조 내용',
    url:'/medical-history.html',
    local:'medical-history.html',
    phrases:['id="history-dry-mouth-medications"','입이 마른다고 처방약을 임의로 끊거나','/stories/2026-11-01-sangok-dry-mouth-xerostomia-care/','/stories/2026-11-01-cheongcheon-burning-mouth-syndrome/']
  }
];
let ok=0;
for(const t of targets){
  const build=readFileSync(new URL('../dist/'+t.local,import.meta.url),'utf8');
  const expected=main(build);
  if(!expected || t.phrases.some(x=>!build.includes(x)))
    throw Error('Built page missing expected patient content: '+t.local);
  try{
    const res=await fetch(root+t.url,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{
      'User-Agent':'EjoeunDentalReadOnlyHealthCheck/2.4','Cache-Control':'no-cache'
    }});
    const html=await res.text();
    const observed=main(html);
    const missing=t.phrases.filter(x=>!html.includes(x));
    const matches=res.status===200 && !!observed && digest(observed)===digest(expected) && missing.length===0;
    if(matches)ok++;
    console.log('[ORAL SYMPTOMS LIVE] '+(matches?'일치':'확인 필요')+' · '+t.name+
      ' · HTTP '+res.status+' · public '+digest(observed)+' / build '+digest(expected)+
      ' · missing '+(missing.join(', ')||'none'));
  }catch(e){
    console.log('[ORAL SYMPTOMS LIVE] 확인 필요 · '+t.name+' · '+String(e.cause?.code||e.message||e));
  }
}
console.log('[ORAL SYMPTOMS LIVE] Result '+ok+'/'+targets.length);
if(ok!==targets.length)process.exitCode=1;
