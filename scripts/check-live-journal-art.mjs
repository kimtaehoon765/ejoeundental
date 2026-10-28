// Read-only comparison of the live homepage journal artwork and CSS.
// A successful source build does NOT imply that this version was deployed.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const origin='https://ejoeundental.com';
const currentHtml=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const currentCss=readFileSync(new URL('../assets/museum-home-v2.css',import.meta.url));
const currentImage=readFileSync(new URL('../assets/ejoeundental-hero-cat.webp',import.meta.url));
const hash=buffer=>createHash('sha256').update(buffer).digest('hex').slice(0,12);
const expectedImage='/assets/ejoeundental-hero-cat.webp';
const expectedCss=currentHtml.match(/href="(\/assets\/museum-home-v2\.css\?v=[^"]+)"/)?.[1];
const expectedFeature=currentHtml.match(/<a class="journal-gallery-cover"[\s\S]*?<\/a>/)?.[0]||'';
if(!expectedCss||!expectedFeature.includes('src="'+expectedImage+'"')) {
 console.error('[LIVE ART] The source does not yet use the required existing caricature.');
 process.exitCode=1;
}else{
 const get=async path=>{
  const response=await fetch(origin+path,{
   signal:AbortSignal.timeout(10000),
   headers:{'User-Agent':'EjoeunDentalReadOnlyHealthCheck/1.0','Cache-Control':'no-cache'}
  });
  return {status:response.status,bytes:Buffer.from(await response.arrayBuffer())};
 };
 try{
  const home=await get('/');
  const html=home.bytes.toString('utf8');
  const feature=html.match(/<a class="journal-gallery-cover"[\s\S]*?<\/a>/)?.[0]||'';
  const liveCss=html.match(/href="(\/assets\/museum-home-v2\.css\?v=[^"]+)"/)?.[1]||'';
  const imageOk=feature.includes('src="'+expectedImage+'"');
  // build.mjs fingerprints stylesheets with the emitted CSS content hash.
  // The source's date-based query string is not the deployed query string.
  const cssLinkOk=liveCss===expectedCss||
   liveCss==='/assets/museum-home-v2.css?v='+hash(currentCss);
  console.log('[LIVE ART] 정식 홈페이지 HTTP',home.status,
   '| 치과 이야기 기존 원장 캐리커처·고양이 사용:',imageOk?'확인':'미반영',
   '| 디자인 CSS 링크 최신:',cssLinkOk?'확인':'미반영',
   '| 실제 링크:',liveCss||'없음');
  const [css,image]=await Promise.all([get(expectedCss),get(expectedImage)]);
  const cssOk=css.status===200&&hash(css.bytes)===hash(currentCss);
  const imageHashOk=image.status===200&&hash(image.bytes)===hash(currentImage);
  console.log('[LIVE ART] 전용 CSS 공개:',css.status,
   '| GitHub 최신 내용 일치:',cssOk?'확인':'불일치',
   '| 실제:',hash(css.bytes),'기대:',hash(currentCss));
  console.log('[LIVE ART] 기존 원장·고양이 그림 공개:',image.status,
   '| 원본 바이트 일치:',imageHashOk?'확인':'불일치',
   '| 실제:',hash(image.bytes),'기대:',hash(currentImage));
  if(home.status!==200||!imageOk||!cssLinkOk||!cssOk||!imageHashOk){
   console.error('[LIVE ART] 아직 최신 배포를 확인할 수 없습니다. Cloudflare Pages 배포 기록을 확인하세요.');
   process.exitCode=1;
  }else{
   console.log('[LIVE ART] 치과 이야기 새 그림과 CSS, 원본 파일이 정식 도메인에 실제 반영되었습니다.');
  }
 }catch(error){
  console.error('[LIVE ART] 실사이트 접속 검증 불가:',error?.cause?.code||error?.message||String(error));
  process.exitCode=1;
 }
}