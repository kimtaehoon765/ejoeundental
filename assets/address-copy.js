/* Copy the address currently displayed on the page, never a hard-coded duplicate.
 * No network requests, cookies, analytics, or clipboard reads are involved.
 * If Clipboard API is unavailable, the original address remains selectable.
 */
(function(){
 'use strict';
 if(typeof navigator==='undefined'||!navigator.clipboard||
    typeof navigator.clipboard.writeText!=='function')return;
 for(const button of document.querySelectorAll('button[data-copy-source]')){
  const source=document.getElementById(button.getAttribute('data-copy-source'));
  const notice=document.getElementById(button.getAttribute('aria-describedby'));
  const row=button.closest('.clinic-copy-row');
  if(!source||!notice||!row)continue;
  row.hidden=false;
  button.addEventListener('click',async function(){
   const address=String(source.textContent||'').replace(/\s+/g,' ').trim();
   if(!address){notice.textContent='주소를 불러오지 못했습니다. 전화로 확인해 주세요.';return;}
   button.disabled=true;
   try{
    await navigator.clipboard.writeText(address);
    notice.textContent='치과 주소를 복사했습니다.';
   }catch(_){
    notice.textContent='자동 복사가 차단되었습니다. 위 주소를 길게 눌러 복사해 주세요.';
   }finally{button.disabled=false;}
  });
 }
})();
