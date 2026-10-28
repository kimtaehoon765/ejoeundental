// Read-only gallery deployment check. Never changes Cloudflare, DNS, or source.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const origin='https://ejoeundental.com';
const hash=data=>createHash('sha256').update(data).digest('hex').slice(0,12);
const originals=[
 'assets/gallery-starry-clinic.svg',
 'assets/gallery-golden-garden.svg',
 'assets/clinic-gallery.css',
 'assets/clinic-gallery.js'
];
async function get(path){
 const response=await fetch(origin+path,{signal:AbortSignal.timeout(10000),headers:{'User-Agent':'EjoeunDentalReadOnlyHealthCheck/1.0','Cache-Control':'no-cache'}});
 return {status:response.status,url:response.url,bytes:Buffer.from(await response.arrayBuffer())};
}
let good=true;
try{
 const [home,page,...files]=await Promise.all([get('/'),get('/gallery.html'),...originals.map(p=>get('/'+p))]);
 const html=home.bytes.toString('utf8'),gallery=page.bytes.toString('utf8');
 const homepageReady=home.status===200&&/href="\/gallery(?:\.html)?"/.test(html)&&html.includes('id="gallery"');
 const pageReady=page.status===200&&gallery.includes('치과 안의')&&
  gallery.includes('gallery-starry-clinic.svg')&&gallery.includes('gallery-golden-garden.svg')&&
  gallery.includes('impressionist-water-garden.svg')&&gallery.includes('ejoeundental-hero-cat.webp');
 console.log('[LIVE GALLERY] 홈페이지 링크 및 미리보기:',homepageReady?'반영':'미반영','HTTP',home.status);
 console.log('[LIVE GALLERY] 갤러리 페이지:',pageReady?'반영':'미반영','HTTP',page.status,'최종',page.url);
 good&&=homepageReady&&pageReady;
 for(let i=0;i<originals.length;i++){
  const path=originals[i],expected=hash(readFileSync(new URL('../'+path,import.meta.url))),actual=hash(files[i].bytes),matches=files[i].status===200&&expected===actual;
  console.log('[LIVE GALLERY]',path,'HTTP',files[i].status,matches?'원본 일치':'미반영 또는 내용 불일치','실제',actual,'원본',expected);
  good&&=matches;
 }
 console.log('[LIVE GALLERY]',good?'그림 갤러리 공개 반영 확인':'갤러리의 일부가 아직 실사이트에 반영되지 않았습니다.');
 if(!good)process.exitCode=1;
}catch(e){
 console.error('[LIVE GALLERY] 실사이트 접속/배포 검증 불가:',e?.cause?.code||e?.message||String(e));
 process.exitCode=1;
}